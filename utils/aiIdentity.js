// utils/aiIdentity.js

const IDENTITY_RESPONSES = [
  {
    match: ["who made you", "who created you"],
    response: "I’m part of the M-Guard bot, created and maintained by Hydro."
  },
  {
    match: ["are you chatgpt", "are you gpt"],
    response: "No. I’m a custom bot developed by Hydro that uses AI technology."
  },
  {
    match: ["who owns you", "who is your owner"],
    response: "M-Guard is owned and operated by Hydro."
  },
  {
    match: ["what ai are you", "what are you"],
    response: "I’m an AI-powered assistant integrated into M-Guard."
  }
];

function getIdentityResponse(content) {
  const text = content.toLowerCase();
  for (const item of IDENTITY_RESPONSES) {
    if (item.match.some(m => text.includes(m))) {
      return item.response;
    }
  }
  return null;
}

module.exports = { getIdentityResponse };
