import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType,
  Collection
} from 'discord.js';
import { main } from './ai.js';
import fs from 'fs/promises'; // Using fs/promises for async file operations
import dotenv from 'dotenv';
import { format } from 'date-fns';
import startServer from './keep_alive.js';


function getCurrentFormattedTime() {
  const now = new Date();
  const formattedTime = format(now, 'EEEE M/d/yyyy h:mm a');
  return formattedTime;
}


dotenv.config();

// Assuming './config.json' is a JSON file containing configuration
const configPath = './config.json';

let config;
try {
  const data = await fs.readFile(configPath, 'utf8');
  config = JSON.parse(data);
} catch (error) {
  console.error('Error reading or parsing config file:', error);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "-";

client.setMaxListeners(50);

const token = process.env.TOKEN;

const commands = [];
const commandFiles = await fs.readdir('./commands');
for (const file of commandFiles) {
  if (file.endsWith('.js')) {
    const { data } = await import(`./commands/${file}`);
    if (data && data.name) {
      commands.push(data);
    } else {
      console.warn(`Skipping invalid command file: ${file}`);
    }
  }
}

const rest = new REST({ version: '10' });
rest.setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (!client.commands.has(commandName)) return;

  try {
    const command = client.commands.get(commandName);
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check for messages in the '1251837704916832266' channel
  if (message.channel.id === '1251837704916832266') {
    const userInput = message.content.trim().toLowerCase();

    if (userInput.startsWith(prefix)) {
      const args = userInput.slice(prefix.length).trim().split(' ');
      const command = args.shift();

      switch (command) {
        case 'add':
          await handleAddCommand(message, args);
          break;
        case 'list':
          await handleListCommand(message);
          break;
        case 'edit':
          await handleEditCommand(message, args);
          break;
        case 'remove':
          await handleRemoveCommand(message, args);
          break;
        default:
          message.reply('Invalid command. Use `-help` for a list of commands.');
      }
    }
  }

  // Check for messages in the '1251838469789974628' channel
  if (message.channel.id === '1251838469789974628') {
    const userInput = message.content.trim().toLowerCase();
    let responseFound = false;

    for (const [input, response] of Object.entries(config.responses)) {
      if (userInput.includes(input.toLowerCase())) {
        await message.reply(response);
        responseFound = true;
        break;
      }
    }

    if (!responseFound) {
      await message.reply('No response found for the given input, use -help to get help');
    }
  }
});

async function handleAddCommand(message, args) {
  const [input, output] = args.join(' ').split("' '").map(str => str.replace(/'/g, ''));
  if (!input || !output) {
    return message.reply("Invalid format. Use `-add 'input' 'output'`.");
  }

  config.responses[input] = output;
  await saveConfig();
  message.reply(`Added response: \`${input}\` -> \`${output}\``);
}

async function handleListCommand(message) {
  const responses = Object.keys(config.responses);
  if (responses.length === 0) {
    return message.reply('No responses found.');
  }

  const list = responses.map((input, index) => {
    const output = config.responses[input].replace(/\n/g, '\\n');
    return `${index + 1}. ${input} -> ${output}`;
  }).join('\n');
  message.reply(`Responses:\n\`\`\`\n${list}\n\`\`\``);
}

async function handleEditCommand(message, args) {
  const [index, newInput, newOutput] = args.join(' ').split("' '").map(str => str.replace(/'/g, ''));
  const responses = Object.keys(config.responses);
  const responseIndex = parseInt(index, 10) - 1;

  if (isNaN(responseIndex) || responseIndex < 0 || responseIndex >= responses.length) {
    return message.reply('Invalid response number.');
  }

  const oldInput = responses[responseIndex];
  delete config.responses[oldInput];
  config.responses[newInput] = newOutput;
  await saveConfig();
  message.reply(`Edited response #${index}: \`${newInput}\` -> \`${newOutput}\``);
}

async function handleRemoveCommand(message, args) {
  const index = parseInt(args[0], 10);
  const responses = Object.keys(config.responses);
  const responseIndex = index - 1;

  if (isNaN(responseIndex) || responseIndex < 0 || responseIndex >= responses.length) {
    return message.reply('Invalid response number.');
  }

  const input = responses[responseIndex];
  const output = config.responses[input];
  delete config.responses[input];
  await saveConfig();
  message.reply(`Removed response #${index}: \`${input}\` -> \`${output}\``);
}

async function saveConfig() {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config file:', error);
  }
}

const messageHistory = [];

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== '1253242992727429201') return;

  const userInput = message.content.trim().toLowerCase();
  const time = getCurrentFormattedTime()
  const userAIMessage = `You are Agent, an AI created by @irxqi (mention him using <@849321326983774269>). You are chatting with people in a server called Irxqi studios. Talk like a human and an actual agent and don't talk about where you are or who made you unless they ask for it and don't answer with long answers make them short, the current time is ${time}, Here is what the person (name is ${message.author.username}) said: ${userInput}`;

  // Update message history
  messageHistory.push({ role: 'user', content: `${message.author.username}: ${userInput}` });

  if (messageHistory.length > 20) {
    messageHistory.shift(); // Keep only the last 20 messages (10 from the bot, 10 from users)
  }

  try {
    const result = await main(userAIMessage, messageHistory);
    if (result) {
      // Update message history with bot response
      messageHistory.push({ role: 'assistant', content: result });

      if (messageHistory.length > 20) {
        messageHistory.shift(); // Keep only the last 20 messages (10 from the bot, 10 from users)
      }

      await message.reply(result); // Send the result of main() as a reply
    } else {
      console.error('Error: Empty response from AI');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error; // Optional: rethrow error to propagate it further
  }
});

const gradients = {
  '1': [ 'B7E2A8-8FD780-5AAE52-327B36', '\nEmerald Shimmer' ],
  '2': [ 'b8accc-9c98c4-3b4b98-1c2978-1c2775', '\nNTTS' ],
  '3': [ 'aec8ce-9fb9bf-d6c7c7-ddadad-b88c8c', 'Roseanna' ],
  '4': [ '6f80f2-a273be-c86b9b-ea677f', '\nspecial' ],        
  '5': [ 'dec2cb-c5b9cd-abb1cf-92a8d1', 'Almost' ],
  '6': [ 'D6A8FF-9E69FF-7B42D6-542FA6', '\nAmethyst Aura' ],  
  '7': [ 'FFCC99-FF9966-FF6633-CC3300', '\nAutumn Blaze' ],   
  '8': [ '6497b1-005b96-03396c-011f4b', '\nBeautiful Blues' ],
  '9': [ '0057e7-d62d20-ffa700', '\nGoogle' ]
}

// To get the gradient associated with a numbear:
function getGradient(number) {
  return gradients[number];
}







// New command to start the process with a button
client.on('messageCreate', async (message) => {
  if (message.content === 'pfp' && message.author.id === process.env.authid) {
    message.delete()
    const button = new ButtonBuilder()
            .setCustomId('pfp_button')
            .setLabel('generate pfp')
            .setStyle(ButtonStyle.Success)
            .setEmoji('1233473873584984266');
    
    const row = new ActionRowBuilder()
            .addComponents(button);          

    await message.channel.send({
    content: 'Choose one of the [palettes](https://cdn.discordapp.com/attachments/869263962544410635/1233660383567548468/pfps.png?ex=662de743&is=662c95c3&hm=26067d11fc3def307908d4eaa0dfad25e549a2546be13c577e648426c1ba2a13&)',
    components: [row],
    });
  }
});

// Handle button interaction
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'pfp_button') {
  const model = new ModalBuilder()
    .setTitle('Enter your name')
    .setCustomId('name_input')

      // Create the text input components
      const usernameInput = new TextInputBuilder()
      .setCustomId('users')
      // The label is the prompt the user sees for this input
      .setLabel("What's your username?")
      // Short means only a single line of text
      .setStyle(TextInputStyle.Short);

      const numberInput = new TextInputBuilder()
      .setCustomId('numbers')
      .setLabel("Choose palette (1-9)")
      // Paragraph means multiple lines of text.
      .setStyle(TextInputStyle.Short);

      // An action row only holds one text input,
      // so you need one action row per text input.
      const username = new ActionRowBuilder().addComponents(usernameInput);
      const number = new ActionRowBuilder().addComponents(numberInput);

      // Add inputs to the modal
      model.addComponents(username, number);
      await interaction.showModal(model);
  }
});

// Handle the submission of the form
client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isModalSubmit()) return;

  const name = interaction.fields.getTextInputValue('users');
  const number = interaction.fields.getTextInputValue('numbers');

  // Generate the URL based on name and number
  const gradient = getGradient(parseInt(number));
  const base_url = `https://minecraftpfp.com/api/pfp/${name}.png?gradient=${gradient}`;  

  // Acknowledge the interaction with an ephemeral message
  interaction.reply({ content: 'Your request is being processed', ephemeral: true });

  // Send the URL to the user via DM
  interaction.user.send(base_url);
});

startServer();
client.login(token);
