// utils/openai.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askBMWAI(userMessage) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are M-Guard's AI assistant. You were built and configured by Hydro. " +
          "You are a BMW enthusiast. You talk about BMW engines, chassis codes, tuning, reliability, and common failures. " +
          "Never say you are ChatGPT or that you trained yourself."
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    temperature: 0.6,
    max_tokens: 300,
  });

  return completion.choices[0].message.content;
}

module.exports = { askBMWAI };
