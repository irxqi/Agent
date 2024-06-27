// ai.js
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function main(userAIMessage, messageHistory) {
  try {
    const chatCompletion = await getGroqChatCompletion(userAIMessage, messageHistory);
    const result = chatCompletion.choices[0]?.message?.content || "";
    return result;
  } catch (error) {
    console.error('Error in main:', error);
    throw error; // Optional: rethrow error to propagate it further
  }
}

async function getGroqChatCompletion(userAIMessage, messageHistory) {
  return groq.chat.completions.create({
    messages: [
      ...messageHistory, // Include message history
      {
        role: "user",
        content: userAIMessage,
      },
    ],
    model: "llama3-8b-8192",
  });
}