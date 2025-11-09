import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const themeToggle = document.getElementById("theme-toggle");
const logoutBtn = document.getElementById("logoutBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

// Privacy inputs
const messagePrivacy = document.getElementById("message-privacy");
const followPrivacy = document.getElementById("follow-privacy");
const profileVisibility = document.getElementById("profile-visibility");

// Notification inputs
const notifEmail = document.getElementById("notif-email");
const notifInApp = document.getElementById("notif-inapp");

// Security tab
const loginHistory = document.getElementById("login-history");
const securityEvents = document.getElementById("security-events");

// Tabs
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../auth/login.html";
  } else {
    currentUser = user;
    userName.textContent = user.displayName || "User";
    userEmail.textContent = user.email;
    if (user.photoURL) userAvatar.src = user.photoURL;

    await loadUserSettings();
    await loadSecurityEvents();
  }
});

// ---------- LOAD USER SETTINGS ----------
async function loadUserSettings() {
  const settingsRef = doc(db, "userSettings", currentUser.uid);
  const snap = await getDoc(settingsRef);

  if (snap.exists()) {
    const data = snap.data();

    messagePrivacy.value = data.messagePrivacy || "everyone";
    followPrivacy.value = data.followPrivacy || "everyone";
    profileVisibility.value = data.profileVisibility || "public";

    notifEmail.checked = data.notifEmail ?? true;
    notifInApp.checked = data.notifInApp ?? true;

    if (data.theme === "dark") {
      document.body.classList.add("dark");
      themeToggle.checked = true;
    }
  } else {
    await setDoc(settingsRef, {
      messagePrivacy: "everyone",
      followPrivacy: "everyone",
      profileVisibility: "public",
      theme: "light",
      notifEmail: true,
      notifInApp: true,
      updatedAt: new Date(),
    });
  }
}

// ---------- SAVE SETTINGS ----------
async function saveSetting(field, value) {
  if (!currentUser) return;
  const settingsRef = doc(db, "userSettings", currentUser.uid);
  await updateDoc(settingsRef, { [field]: value, updatedAt: new Date() });
}

// ---------- THEME ----------
themeToggle.addEventListener("change", async (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
  await saveSetting("theme", theme);
});

// ---------- PRIVACY ----------
[messagePrivacy, followPrivacy, profileVisibility].forEach((select) => {
  select.addEventListener("change", async () => {
    await saveSetting(select.id, select.value);
  });
});

// ---------- NOTIFICATION ----------
[notifEmail, notifInApp].forEach((box) => {
  box.addEventListener("change", async () => {
    await saveSetting(box.id, box.checked);
  });
});

// ---------- PASSWORD RESET ----------
changePasswordBtn.onclick = async () => {
  await sendPasswordResetEmail(auth, currentUser.email);
  await logSecurityEvent("Password reset requested");
  alert("Password reset email sent!");
};

// ---------- LOGOUT ----------
logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "../auth/login.html";
};

// ---------- SECURITY LOGGING ----------
async function logSecurityEvent(action) {
  const secRef = collection(db, "securityLogs");
  await addDoc(secRef, {
    userId: currentUser.uid,
    action,
    timestamp: serverTimestamp(),
    device: navigator.userAgent,
  });
}

// ---------- LOAD SECURITY EVENTS ----------
async function loadSecurityEvents() {
  const q = query(
    collection(db, "securityLogs"),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  let html = "";

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.userId === currentUser.uid) {
      const time = data.timestamp?.toDate().toLocaleString() || "Unknown";
      html += `<li>${data.action} — ${time} (${data.device})</li>`;
    }
  });

  securityEvents.innerHTML = html || "<li>No recent security activity</li>";
}

// ---------- TAB SWITCH ----------
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach((b) => b.classList.remove("active"));
    contents.forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});