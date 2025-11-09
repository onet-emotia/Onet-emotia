// ===== Emotia Utils =====
// Helper functions for mood detection and sentiment hints

export function detectMood(text) {
  if (!text || !text.trim()) return 'neutral';

  const lower = text.toLowerCase();
  const moodWords = {
    happy: ["happy", "joy", "excited", "love", "awesome", "great"],
    sad: ["sad", "cry", "unhappy", "depressed", "lonely"],
    angry: ["angry", "mad", "furious", "hate"],
    tired: ["tired", "sleepy", "exhausted"],
    anxious: ["nervous", "worried", "scared", "afraid", "anxious"],
    confident: ["confident", "strong", "proud", "ready"],
    bored: ["bored", "meh", "dull"],
    relaxed: ["relaxed", "calm", "peaceful"],
  };

  for (const mood in moodWords) {
    for (const w of moodWords[mood]) {
      if (lower.includes(w)) return mood;
    }
  }

  return 'neutral';
}

export default { detectMood };