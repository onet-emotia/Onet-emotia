/* ============================================================
   Onet Emotia — Merged Chat Engine (Firebase + Local AI)
   - Full merge of both scripts you provided
   - AI demo users, local AI memory & replies
   - Mood-colored bubbles, delete with fade-out
   - Typing indicator, auth redirect, logout, responsive helpers
   ============================================================ */

import { app, auth, db } from "../auth/firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { enhanceMessage } from "../engines/ai-engine.js";

/* ===========================
   DOM Elements (with safe fallbacks)
   =========================== */
const userListContainer = document.getElementById("userListContainer");
const chatHeader = document.getElementById("chatHeader") || document.getElementById("chatBox");
const messagesContainer = document.getElementById("messagesContainer");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("chatSearch");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector("aside");
const chatBox = document.getElementById("chat");


/* ===========================
   Global state
   =========================== */
let currentUser = null;
let userList = [];
let activeChat = null; // object with fields: uid, username, isAI, moodColor, moodEmoji, moodKey
let chatUnsub = null;
let typingUnsub = null;

// Local AI memories (for demo AI chats)
let aiMemories = JSON.parse(localStorage.getItem("aiMemories") || "{}");

// Predefined demo AI users (also synced to Firestore via ensureAIUsers)
const demoAIUsers = [
  { uid: "aya-x", username: "AYA-X", moodEmoji: "🤖", moodKey: "focused", moodColor: "#00ffa3", ai: true, isAI: true },
  { uid: "alex-ai", username: "Alex", moodEmoji: "😎", moodKey: "happy", moodColor: "#FFD93D", ai: true, isAI: true },
  { uid: "demi-ai", username: "Demi", moodEmoji: "😊", moodKey: "calm", moodColor: "#63d2ff", ai: true, isAI: true },
  { uid: "clarissa-ai", username: "Clarissa", moodEmoji: "💬", moodKey: "love", moodColor: "#ff7eb3", ai: true, isAI: true }
];

/* ===========================
   Utils
   =========================== */
const nowISO = () => new Date().toISOString();
const chatKey = (a, b) => [a, b].sort().join("__");

function playSound(type) {
  // expected types: "in", "out", "delete" -> map to available files
  try {
    if (type === "in") {
      const s = new Audio("../sounds/message-in.mp3");
      s.play();
    } else if (type === "out") {
      const s = new Audio("../sounds/message-out.mp3");
      s.play();
    } else {
      const s = new Audio("../sounds/delete.mp3");
      s.play();
    }
  } catch (e) {
    // ignore audio errors
  }
}

function scrollToBottom(smooth = true) {
  if (!messagesContainer) return;
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

/* ===========================
   Auth + Startup
   =========================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // redirect to login if not authenticated
    window.location.href = "../login.html";
    return;
  }
  currentUser = user;

  // Ensure demo AI users exist in Firestore (non-destructive)
  await ensureAIUsers();

  // Upsert current user record (lastActive + username)
  try {
    await setDoc(doc(db, "users", user.uid), {
      lastActive: nowISO(),
      uid: user.uid,
      username: user.displayName || user.email?.split("@")[0]
    }, { merge: true });
  } catch (e) {
    console.warn("Could not upsert user:", e);
  }

  // Start listening for users
  startUserList();
});

/* ===========================
   Ensure AI Users in Firestore
   =========================== */
async function ensureAIUsers() {
  for (const u of demoAIUsers) {
    try {
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // write baseline metadata for AI demo user
        await setDoc(ref, {
          uid: u.uid,
          username: u.username,
          moodEmoji: u.moodEmoji,
          moodKey: u.moodKey,
          moodColor: u.moodColor,
          ai: true
        });
      }
    } catch (err) {
      console.warn("ensureAIUsers error:", err);
    }
  }
}

/* ===========================
   Load user list (Firestore) - single snapshot load + onSnapshot fallback
   =========================== */
async function startUserList() {
  try {
    const q = query(collection(db, "users"), orderBy("username", "asc"));
    // Use getDocs to seed the list quickly
    const snap = await getDocs(q);
    userList = snap.docs
      .map((d) => d.data())
      .filter((u) => u.uid !== currentUser.uid);

    // Render initial list
    renderUserList();

    // Also install a listener so UI updates as users appear/disappear
    if (chatUnsub) chatUnsub(); // safety: unsub any previous
    onSnapshot(q, (snap2) => {
      userList = snap2.docs.map((d) => d.data()).filter((u) => u.uid !== currentUser.uid);
      renderUserList(searchInput?.value || "");
    });
  } catch (e) {
    console.warn("startUserList error:", e);
    // fallback to demo AIs if Firestore fails
    userList = demoAIUsers;
    renderUserList();
  }
}

/* ===========================
   Render user list + search
   =========================== */
function renderUserList(filter = "") {
  if (!userListContainer) return;
  userListContainer.innerHTML = "";
  const f = filter.toLowerCase();

  let filtered = userList.filter((u) => {
    const username = (u.username || "").toLowerCase();
    const moodKey = (u.moodKey || "").toLowerCase();
    const lastMsg = (u.lastMsg || "").toLowerCase();
    const moodEmoji = (u.moodEmoji || "").toLowerCase();
    return username.includes(f) || moodKey.includes(f) || lastMsg.includes(f) || moodEmoji.includes(f);
  });

  // If no real users found, fall back to demo list so UI isn't empty
  if (!filtered.length) filtered = demoAIUsers;

  filtered.forEach((u) => {
    const el = document.createElement("div");
    el.className = "chat-user";
    el.innerHTML = `
      <div class="user-info">
        <div class="avatar mood-${u.moodKey || "calm"}">${u.moodEmoji || "😊"}</div>
        <div class="details">
          <div class="name">${u.username}${u.ai || u.isAI ? ' <span class="ai-badge">AI</span>' : ''}</div>
          <div class="sub">${u.lastMsg || "Tap to chat"}</div>
        </div>
      </div>
    `;
    el.addEventListener("click", () => openChat(u));
    userListContainer.appendChild(el);
  });
}
searchInput?.addEventListener("input", (e) => renderUserList(e.target.value));

/* ===========================
   Open Chat (AI or real)
   =========================== */
function openChat(user) {
  activeChat = user;

  // Update header
  if (chatHeader) {
    chatHeader.innerHTML = `
      <div class="chat-header-inner">
        <div class="left">
          <div class="avatar mood-${user.moodKey || "calm"}">${user.moodEmoji || "😊"}</div>
          <div class="meta">
            <div class="chat-username">${user.username}</div>
            <div class="chat-mood">${user.moodKey || ""} ${user.isAI || user.ai ? '<span class="chip">AI Assistant</span>' : ''}</div>
          </div>
        </div>
        <div class="right">
          <button id="logoutBtn" class="logout-btn">Logout</button>
        </div>
      </div>
    `;
    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn?.addEventListener("click", () => signOut(auth));
  }

  // clear messages UI
  if (messagesContainer) messagesContainer.innerHTML = "";

  // If it's an AI user (local), load local AI memory and show messages
  if (user.ai || user.isAI || (user.uid && demoAIUsers.some(d => d.uid === user.uid))) {
    // ensure we have basic identity fields for local AI
    const identity = getAIIdentity(user);
    activeChat = { ...identity, isAI: true, uid: identity.uid };

    loadAIChat(activeChat.username);
    return;
  }

  // Otherwise it's a real user chat: subscribe to messages collection
  if (!user.uid) {
    console.warn("openChat: user missing uid for real chat", user);
    return;
  }

  // Unsubscribe previous listeners
  if (chatUnsub) chatUnsub();
  if (typingUnsub) typingUnsub();

  const key = chatKey(currentUser.uid, user.uid);
  const q = query(collection(db, "chats", key, "messages"), orderBy("time", "asc"));
  chatUnsub = onSnapshot(q, (snap) => {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = "";
    snap.forEach((d) => {
      const data = d.data();
      // include document id to support deletion
      renderMessage(d.id, data);
    });
    scrollToBottom(false);
  });

  // watch typing indicator for this chat
  watchTyping();
}

/* ===========================
   Helper: get AI identity (from demoAIUsers or Firestore doc fallback)
   =========================== */
function getAIIdentity(user) {
  // Accept user object (from Firestore or fallback)
  let found = demoAIUsers.find(d => (user.uid && d.uid === user.uid) || (user.username && d.username === user.username));
  if (found) return found;
  // fallback to passed fields or default
  return {
    uid: user.uid || `ai-${user.username || "unknown"}`,
    username: user.username || "AI",
    moodEmoji: user.moodEmoji || "🤖",
    moodKey: user.moodKey || "calm",
    moodColor: user.moodColor || "#63d2ff",
    ai: true,
    isAI: true
  };
}

/* ===========================
   Render message in UI
   - If id provided, set data-id for deletion
   =========================== */
function renderMessage(idOrNull, data) {
  if (!messagesContainer) return;
  // data fields can be a mixture depending on source:
  // - firestore messages: { senderId, senderName, receiverId, text, time, moodColor, status }
  // - local messages: { sender: "me" or name, senderName, text, time }
  const isFirestoreMsg = !!data.senderId || !!data.receiverId;
  const mine = isFirestoreMsg ? (data.senderId === currentUser.uid) : (data.sender === "me");
  const senderName = isFirestoreMsg ? (data.senderName || (mine ? (currentUser.displayName || "You") : "User")) : (mine ? "You" : (data.senderName || data.sender));
  const moodColor = data.moodColor || (mine ? "#6c63ff" : (data.moodColor || "#171a22"));

  const wrapper = document.createElement("div");
  wrapper.className = mine ? "msg mine" : "msg";
  if (idOrNull) wrapper.dataset.id = idOrNull;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.style.background = mine ? moodColor : (data.moodColor || "#171a22");

  bubble.innerHTML = `
    <div class="meta"><span class="name">${escapeHtml(senderName)}</span></div>
    <div class="text">${escapeHtml(data.text || "")}</div>
    <div class="time">${formatTime(data.time)}</div>
  `;

  // add delete button for user's own messages (firestore origin)
  if (mine && isFirestoreMsg) {
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.title = "Delete";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", () => {
      deleteMessage(idOrNull);
    });
    bubble.appendChild(delBtn);
  }

  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
  // play incoming sound when message is not mine
  if (!mine) playSound("in");
}

/* ===========================
   Delete message (Firestore) with fade-out animation
   =========================== */
async function deleteMessage(docId) {
  if (!activeChat || !activeChat.uid) return;
  const key = chatKey(currentUser.uid, activeChat.uid);
  const ref = doc(db, "chats", key, "messages", docId);

  // Find element
  const el = messagesContainer.querySelector(`[data-id="${docId}"]`);
  playSound("delete");
  if (el) el.classList.add("fade-out"); // CSS should handle transition
  setTimeout(async () => {
    try {
      await deleteDoc(ref);
      if (el) el.remove();
    } catch (err) {
      console.warn("deleteMessage error:", err);
      if (el) el.classList.remove("fade-out");
    }
  }, 380);
}

/* ===========================
   Typing watcher for real chat (Firestore typing doc)
   =========================== */
function watchTyping() {
  if (!activeChat || !activeChat.uid) return;
  if (typingUnsub) typingUnsub();

  try {
    const key = chatKey(currentUser.uid, activeChat.uid);
    const typingDocRef = doc(db, "chats", key, "typing", activeChat.uid);
    typingUnsub = onSnapshot(typingDocRef, (snap) => {
      const data = snap.data?.() ?? snap.data?.call?.();
      // In some SDK versions snap.data() returns undefined if doc missing -> guard
      const typing = snap.exists ? (snap.data()?.isTyping) : false;
      typingIndicator && (typingIndicator.style.display = typing ? "block" : "none");
    });
  } catch (err) {
    console.warn("watchTyping error:", err);
  }
}

/* ===========================
   Sending messages (real & AI)
   =========================== */
sendBtn?.addEventListener("click", sendMessage);
msgInput?.addEventListener("keydown", (e) => {
  // send on Enter (no shift)
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (!msgInput || !msgInput.value) return;
  const text = msgInput.value.trim();
  if (!text || !activeChat) return;
  msgInput.value = "";

  // If active chat is an AI persona (local), handle locally
  if (activeChat.isAI || activeChat.ai) {
    // render user's message locally
    const localMsg = { sender: "me", text, time: nowISO(), senderName: currentUser.displayName || "You" };
    renderMessage(null, localMsg);

    playSound("out");
    handleAIMessage(activeChat.username, text);
    return;
  }

  // Otherwise: send to Firestore for real user
  try {
    const key = chatKey(currentUser.uid, activeChat.uid);
    const messageData = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
      receiverId: activeChat.uid,
      text,
      time: nowISO(),
      moodColor: "#6c63ff",
      status: "sent"
    };
    await addDoc(collection(db, "chats", key, "messages"), messageData);
    playSound("out");

    // Optionally update lastMsg preview on remote user document (non-blocking)
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { lastMsg: text });
    } catch (_) { /* ignore */ }
  } catch (err) {
    console.warn("sendMessage error:", err);
  }
}

/* ===========================
   AI handling (typing simulation + memory + reply)
   =========================== */
function handleAIMessage(name, text) {
  if (!aiMemories[name]) aiMemories[name] = [];
  aiMemories[name].push({ sender: "user", text, time: nowISO() });
  saveAIMemories();

  // Show typing indicator for AI
  typingIndicator.textContent = `${name} is typing...`;
  typingIndicator.style.display = "block";

  // random delay to simulate thinking
  const delay = 900 + Math.random() * 1200;
  setTimeout(() => {
    const reply = getAIReply(name, text);
    aiMemories[name].push({ sender: name, text: reply, time: nowISO() });
    saveAIMemories();

    typingIndicator.style.display = "none";
    renderMessage(null, { sender: name, senderName: name, text: reply, time: nowISO(), moodColor: getAIMoodColor(name) });
    playSound("in");
  }, delay);
}

function loadAIChat(name) {
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
  const memory = aiMemories[name] || [];
  memory.forEach((m) => {
    // m.sender === "user" -> show as "me"
    const isUser = m.sender === "user" || m.sender === "me";
    renderMessage(null, {
      sender: isUser ? "me" : m.sender,
      senderName: isUser ? (currentUser.displayName || "You") : (m.sender || m.senderName),
      text: m.text,
      time: m.time || nowISO(),
      moodColor: !isUser ? getAIMoodColor(name) : "#6c63ff"
    });
  });
  scrollToBottom(false);
}

function saveAIMemories() {
  try {
    localStorage.setItem("aiMemories", JSON.stringify(aiMemories));
  } catch (e) {
    console.warn("Could not save aiMemories:", e);
  }
}

function getAIMoodColor(name) {
  const found = demoAIUsers.find(d => d.username === name);
  return found ? found.moodColor : "#63d2ff";
}

/* ===========================
   AI reply generator (simple rule-based + random)
   =========================== */
function getAIReply(name, prompt) {
  const lower = (prompt || "").toLowerCase();

  if (name === "AYA-X") {
    if (lower.includes("hello") || lower.includes("hi")) return "Hello! How are you feeling today?";
    if (lower.includes("sad")) return "I can learn from this—tell me more.";
    if (lower.includes("angry")) return "Let’s calm down together 💨";
    if (lower.includes("happy")) return "That’s wonderful to hear 😄!";
    if (lower.includes("love")) return "aww tell me more about that";
    if (lower.trim().length === 0) return "Say anything — I'm listening.";
    return "Interesting thought. I’ll remember that.";
  }

  const randomLines = {
    Demi: [
      "You’re adorable 😍",
      "Keep smiling 🌸",
      "Let’s make today awesome!",
      "You’re one of my favorite people!",
      "Let's have fun!",
      "Are you alright?",
      "Haha that's funny!"
    ],
    Alex: [
      "Music is therapy 🎧",
      "Chill vibes only 😎",
      "Let’s just relax a bit.",
      "Coffee and good tunes — perfect day.",
      "Tell me what's playing in your head."
    ],
    Clarissa: [
      "Love conquers all 💖",
      "You have such a kind soul.",
      "The world shines brighter when you smile 🌷",
      "Let your heart stay open 💕",
      "Care to share something sweet?"
    ]
  };

  if (randomLines[name]) {
    const arr = randomLines[name];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // default fallback
  const generic = [
    "Nice!",
    "Tell me more.",
    "I see — keep going.",
    "That sounds interesting."
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}

/* ===========================
   Small helpers
   =========================== */
function formatTime(t) {
  try {
    const d = new Date(t);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ===========================
   Theme toggle and mobile menu
   =========================== */
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});
if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");

if (menuToggle && sidebar) {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });
}

/* ===========================
   Misc: expose a small debug helper (optional)
   =========================== */
window._onetEmotia = {
  getState: () => ({ currentUser, activeChat, userList, aiMemories })
};

/* ===========================
   END OF MERGED SCRIPT
   =========================== */


