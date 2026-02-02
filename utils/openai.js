// utils/openai.js
const OpenAI = require("openai");

// ❌ NOT RECOMMENDED, but per your request
const openai = new OpenAI({
  apiKey: "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"
});

// BMW keyword gate (hard filter)
const BMW_KEYWORDS = [
  "bmw", "e30", "e36", "e46", "e90", "e92", "e60", "e39", "e82", "e87",
  "f10", "f20", "f30", "f80", "f82", "g20", "g80", "g82",
  "n47", "n54", "n55", "b48", "b58", "s55", "s58", "s65", "s85",
  "zf", "zf8", "dct", "xdrive", "m3", "m4", "m5", "m2",
  "turbo", "timing chain", "injector", "vanos", "valvetronic"
];

function isBMWRelated(text) {
  const lower = text.toLowerCase();
  return BMW_KEYWORDS.some(k => lower.includes(k));
}

async function askBMWAI(userMessage) {
  // 🚫 HARD BMW-ONLY BLOCK
  if (!isBMWRelated(userMessage)) {
    return (
      "I’m BMW-only. Ask me about BMW engines, chassis codes, tuning, reliability, or common problems."
    );
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 350,
    messages: [
      {
        role: "system",
        content:
          "You are M-Guard’s AI assistant, built and maintained by Hydro. " +
          "You are a BMW specialist. You ONLY answer BMW-related questions. " +
          "You must NEVER say you are ChatGPT or mention OpenAI. " +
          "If a question is not BMW-related, refuse briefly."
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  });

  return completion.choices[0].message.content;
}

module.exports = { askBMWAI };
