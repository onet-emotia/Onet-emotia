// ===============================================
//  Onet Emotia — Emoji Engine
//  Intelligent emoji mapping + suggestion system
// ===============================================

// 🔹 Basic emoji dataset
export const emojiDictionary = {
  happy: "😊",
  joy: "😁",
  laugh: "😂",
  love: "❤️",
  like: "👍",
  fire: "🔥",
  sad: "😢",
  cry: "😭",
  angry: "😡",
  wow: "😮",
  shocked: "😲",
  tired: "😴",
  sleep: "😪",
  food: "🍔",
  drink: "🥤",
  coffee: "☕",
  sun: "☀️",
  moon: "🌙",
  star: "⭐",
  cool: "😎",
  sick: "🤒",
  thank: "🙏",
  please: "🫶",
  hug: "🤗",
  ok: "👌",
  party: "🎉",
  gift: "🎁",
  goodnight: "🌙😴",
  congratulations: "🎊",
  birthday: "🎂",
  heartbroken: "💔",
  kiss: "😘",
  rain: "🌧️",
  money: "💰",
  idea: "💡",
  win: "🏆",
  music: "🎵",
  dance: "💃",
  game: "🎮",
  school: "🏫",
  work: "💼",
  pray: "🙏",
  success: "🚀"
};

// 🔹 Generate emoji suggestion for a message
export function suggestEmojis(message) {
  const words = message.toLowerCase().split(/\s+/);
  const suggestions = new Set();

  for (const word of words) {
    for (const [key, emoji] of Object.entries(emojiDictionary)) {
      if (word.includes(key)) suggestions.add(emoji);
    }
  }

  // Handle multi-word detection (e.g., "thank you")
  if (message.toLowerCase().includes("thank you")) suggestions.add("🙏");
  if (message.toLowerCase().includes("good night")) suggestions.add("🌙😴");
  if (message.toLowerCase().includes("good morning")) suggestions.add("🌞☕");

  return [...suggestions];
}

// 🔹 Auto-replace detected words with emojis
export function replaceWithEmojis(message) {
  let updated = message;
  for (const [word, emoji] of Object.entries(emojiDictionary)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    updated = updated.replace(regex, `${word} ${emoji}`);
  }

  // Handle common phrases
  updated = updated
    .replace(/thank you/gi, "thank you 🙏")
    .replace(/good night/gi, "good night 🌙😴")
    .replace(/good morning/gi, "good morning 🌞☕");

  return updated;
}

// 🔹 Example: Real-time preview helper
export function emojiPreview(inputElement, previewElement) {
  inputElement.addEventListener("input", () => {
    const text = inputElement.value;
    const withEmojis = replaceWithEmojis(text);
    previewElement.textContent = withEmojis;
  });
}