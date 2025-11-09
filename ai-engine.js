// ===============================================
//  Onet Emotia — AI Engine
//  Handles auto-correction, emoji enrichment,
//  and tone/emotion detection
// ===============================================

import { replaceWithEmojis, suggestEmojis } from "./emoji-engine.js";
import { capitalizeFirstLetter, levenshteinDistance } from "./utils.js";

// 🔹 Common dictionary for correction
const correctionDictionary = {
  hapy: "happy",
  luv: "love",
  gud: "good",
  thanx: "thanks",
  tnx: "thanks",
  thx: "thanks",
  plz: "please",
  oky: "okay",
  gnite: "goodnight",
  nite: "night",
  mornin: "morning",
  frnd: "friend",
  tmrw: "tomorrow",
  sry: "sorry",
  u: "you",
  ur: "your",
  r: "are",
  wht: "what",
  wats: "what's",
  becos: "because"
};

// 🔹 Emotion tone keywords
const toneWords = {
  happy: ["happy", "joy", "excited", "great", "fun", "awesome", "good"],
  sad: ["sad", "tired", "depressed", "unhappy", "down"],
  angry: ["angry", "mad", "furious", "hate", "annoyed"],
  love: ["love", "heart", "dear", "sweet", "cute", "romantic"],
  surprise: ["wow", "amazing", "unbelievable", "omg", "shocked"]
};

// 🔹 Auto-correct text
export function autoCorrectText(message) {
  const words = message.split(/\s+/);
  const corrected = words.map((word) => {
    const lower = word.toLowerCase();
    if (correctionDictionary[lower]) return correctionDictionary[lower];

    // Fuzzy matching using Levenshtein distance
    let bestMatch = lower;
    let minDistance = 2; // tolerance
    for (const [wrong, correct] of Object.entries(correctionDictionary)) {
      const dist = levenshteinDistance(lower, wrong);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = correct;
      }
    }
    return bestMatch;
  });

  return corrected.join(" ");
}

// 🔹 Detect tone (emotion category)
export function detectTone(message) {
  const lowerMsg = message.toLowerCase();
  for (const [tone, keywords] of Object.entries(toneWords)) {
    if (keywords.some((word) => lowerMsg.includes(word))) return tone;
  }
  return "neutral";
}

// 🔹 Enhance message (auto-correct + emoji injection)
export function enhanceMessage(message) {
  let corrected = autoCorrectText(message);
  let withEmojis = replaceWithEmojis(corrected);
  const tone = detectTone(corrected);

  return {
    original: message,
    corrected,
    enhanced: withEmojis,
    tone,
    suggestions: suggestEmojis(corrected)
  };
}

// 🔹 Example: Attach to input field for real-time typing assist
export function attachSmartInput(inputEl, previewEl) {
  inputEl.addEventListener("input", () => {
    const msg = inputEl.value;
    const enhanced = enhanceMessage(msg);
    previewEl.textContent = enhanced.enhanced;
  });
}