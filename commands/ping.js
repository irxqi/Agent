// ping.js

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check the bot\'s latency.');

export async function execute(interaction) {
  const client = interaction.client;
  const msg = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const serverLatency = msg.createdTimestamp - interaction.createdTimestamp;
  const discordLatency = Math.round(client.ws.ping);

  interaction.editReply(`Server Latency: ${serverLatency}ms\nDiscord Latency: ${discordLatency}ms`);
}
