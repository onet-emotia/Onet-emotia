// =========================================================
// AYA-X Learning System v1.0 (Modular)
// =========================================================

// Import Firestore functions (expects Firebase initialized globally)
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Main AYA-X logger
export async function logAyaEvent(db, currentUser, type, data = {}) {
  if (!currentUser || !db) return;
  try {
    const payload = {
      uid: currentUser.uid,
      type,
      data,
      createdAt: new Date().toISOString(),
      processed: false
    };

    // Store in Firestore learning collection
    await addDoc(collection(db, "aya_learn"), payload);

    // Forward to external AYA-X API (optional, async fire-and-forget)
    sendToAyaXAPI(payload);
  } catch (err) {
    console.error("AYA-X log failed:", err);
  }
}

// External AYA-X endpoint (future integration)
export async function sendToAyaXAPI(payload) {
  try {
    fetch("https://aya-x.orel/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(e => console.warn("AYA-X API stub:", e.message));
  } catch (err) {
    console.warn("AYA-X API error:", err.message);
  }
}

// Optional utility to monitor learning feed in real time
export function watchAyaLearning(db, callback) {
  import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js")
    .then(({ collection, onSnapshot }) => {
      const q = collection(db, "aya_learn");
      onSnapshot(q, snap => {
        const data = snap.docs.map(d => d.data());
        callback(data);
      });
    })
    .catch(err => console.error("AYA-X watch failed:", err));
}

// =========================================================
// Usage in dashboard.js or chat-engine.js:
//
// import { logAyaEvent } from './aya-x-learning.js';
//
// await logAyaEvent(db, currentUser, "post", { text, hasImage: true });
// =========================================================

