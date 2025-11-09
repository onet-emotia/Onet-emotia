// ============================
// dashboard.js — Integrated final
// ============================

// ---------- Imports (uses your existing ../firebase-config.js) ----------
import { auth, db, storage } from "../firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  limit
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

// ---------- Basic state ----------

// --- Inject minimal runtime styles for smooth UI polish ---
(function injectRuntimeStyles(){
  try{
    const s = document.createElement('style');
    s.id = 'dashboard-runtime-styles';
    s.textContent = `
      .temp-alert { transition: transform .38s ease, opacity .38s ease; transform: translateY(-6px); }
      .temp-alert.show { transform: translateY(0); opacity: 1; }
      .animated-alert { position: fixed; right:18px; top:18px; z-index:1200; padding:10px 14px; border-radius:10px; color:#fff; font-weight:700; opacity:0; transform: translateY(-12px); }
      .animated-alert.success { background: linear-gradient(90deg,#2ecc71,#27b86a); }
      .animated-alert.error { background: linear-gradient(90deg,#ff6b6b,#ff4b4b); }
      .animated-alert.show { opacity:1; transform: translateY(0); }
      .post { transition: opacity .45s ease, transform .45s ease; opacity:0; transform: translateY(8px); margin-bottom:12px; padding:12px; border-radius:12px; background: #fff; box-shadow: 0 6px 20px rgba(12,12,12,0.04); }
      .post.visible { opacity:1; transform: translateY(0); }
      .follow-btn { transition: background .28s ease, transform .18s ease; }
      .follow-btn.pulse { transform: scale(1.03); }
      .mobile-view .post { padding:10px; border-radius:8px; }
      body.dark { background:#0b1020; color:#e6eef8; }
      body.dark .post { background:#0f1724; box-shadow: 0 6px 20px rgba(0,0,0,0.6); }
    `;
    document.head.appendChild(s);
  }catch(e){ console.warn('style inject failed', e); }
})();

let currentUser = null;
let usersUnsub = null;
let postsUnsub = null;
let messagesUnsub = null;
let usersCache = [];
let postsCache = [];

// ---------- DOM refs (match your dashboard.html) ----------
const refs = {
  // header
  topUsername: document.getElementById('topUsername'),
  topUserSub: document.getElementById('topUserSub'),
  topAvatar: document.getElementById('topAvatar'),

  // nav actions
  openFollowPanelBtn: document.getElementById('openFollowPanelBtn'),
  openFeelingBtn: document.getElementById('openFeelingBtn'),
  messengerBtn: document.getElementById('messengerBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  logoutBtn: document.getElementById('logoutBtn'),

  // settings (we'll use modal popup)
  settingsDrawer: document.getElementById('settingsDrawer'),
  settingsModal: document.getElementById('settingsModal'),
  settingsModalContent: document.getElementById('settingsModalContent'),
  closeSettingsModal: document.getElementById('closeSettingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  settingsAsModal: document.getElementById('settingsAsModal'),

  // feeling (emoji grid)
  feelingBox: document.getElementById('feelingBox'),
  emojiGrid: document.getElementById('emojiGrid'),
  closeFeeling: document.getElementById('closeFeeling'),

  // left follow panel
  leftPanel: document.getElementById('leftPanel'),
  openFollowPanel: document.getElementById('openFollowPanel'),
  closeLeft: document.getElementById('closeLeft'),
  followList: document.getElementById('followList'),
  followSearch: document.getElementById('followSearch'),
  miniFollowing: document.getElementById('miniFollowing'),

  // composer / posts
  openPostButton: document.getElementById('openPostButton'),
  postModal: document.getElementById('postModal'),
  closePostModal: document.getElementById('closePostModal'),
  postText: document.getElementById('postText'),
  postImage: document.getElementById('postImage'),
  postBtn: document.getElementById('postBtn'),

  // feed
  feed: document.getElementById('feed'),
  globalSearch: document.getElementById('globalSearch'),

  // mood / active lists
  activeList: document.getElementById('activeList'),
  moodSummary: document.getElementById('moodSummary'),

  // chat modal
  chatModal: document.getElementById('chatModal'),
  chatUserList: document.getElementById('chatUserList'),
  messages: document.getElementById('messages'),
  chatInput: document.getElementById('chatInput'),
  sendMsg: document.getElementById('sendMsg'),
  closeChat: document.getElementById('closeChat'),

  // the one-on-one direct message button (flexible — adjust id if needed)
  messageOneOnOneBtn: document.getElementById('messageOneOnOneBtn') || document.querySelector('.one-on-one-btn'),

  // small usable refs
  settingsAvatarPreview: document.getElementById('settingsAvatarPreview'),
  avatarUpload: document.getElementById('avatarUpload'),
  composerAvatar: document.getElementById('composerAvatar'),
  composerName: document.getElementById('composerName'),
  composerMood: document.getElementById('composerMood'),
};

// ---------- MOODS (you asked to create emoji moods) ----------
const MOODS = [
  { key:'happy', emoji:'😄', label:'Happy', color:'#FFD93D' },
  { key:'sad', emoji:'😔', label:'Sad', color:'#6C63FF' },
  { key:'chill', emoji:'😎', label:'Chill', color:'#4ECDC4' },
  { key:'inspired', emoji:'💡', label:'Inspired', color:'#FF9A8B' },
  { key:'angry', emoji:'😡', label:'Angry', color:'#FF6B6B' },
  { key:'love', emoji:'😍', label:'Love', color:'#FF75A0' },
  { key:'neutral', emoji:'😐', label:'Neutral', color:'#BDBDBD' },
  { key:'excited', emoji:'🤩', label:'Excited', color:'#FFD2A6' }
];

// ---------- helper UI functions ----------
function show(el){ el?.classList?.add('open'); }
function hide(el){ el?.classList?.remove('open'); }
function toggle(el){ el?.classList?.toggle('open'); }
function showAlert(type='success', text=''){ 
  const a = document.createElement('div');
  a.classList.add('animated-alert');
  a.className = `temp-alert ${type}`;
  a.textContent = text;
  Object.assign(a.style, { position:'fixed', right:'18px', top:'18px', zIndex:1200, padding:'10px 14px', borderRadius:'10px', color:'#fff', fontWeight:700 });
  a.style.background = type==='error' ? 'linear-gradient(90deg,#ff6b6b,#ff4b4b)' : 'linear-gradient(90deg,#2ecc71,#27b86a)';
  document.body.appendChild(a);
  setTimeout(()=> a.style.opacity='0',3000);
  setTimeout(()=> a.remove(),3600);
}

// ---------- build emoji grid ----------
function buildEmojiGrid(){
  if(!refs.emojiGrid) return;
  refs.emojiGrid.innerHTML = '';
  MOODS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.title = m.label;
    btn.textContent = m.emoji;
    btn.style.fontSize = '20px';
    btn.style.padding = '8px';
    btn.style.borderRadius = '8px';
    btn.addEventListener('click', ()=> selectMood(m));
    refs.emojiGrid.appendChild(btn);
  });
}
buildEmojiGrid();
// ========== Settings Popup Animation ==========
const directions = ["slideFromTop", "slideFromBottom", "slideFromLeft", "slideFromRight"];
const settingsPopup = document.createElement("div");
settingsPopup.className = "settings-popup";
document.body.appendChild(settingsPopup);

function openSettingsPopup() {
  const card = document.createElement("div");
  card.className = "settings-card";
  card.innerHTML = `
    <h2>Settings</h2>
    <p>Theme, preferences, and account tools go here.</p>
    <button class="btn" id="closePopupBtn">Close</button>
  `;
  const randomAnim = directions[Math.floor(Math.random() * directions.length)];
  card.style.animationName = randomAnim;
  settingsPopup.innerHTML = "";
  settingsPopup.appendChild(card);
  settingsPopup.classList.add("open");

  document.getElementById("closePopupBtn").addEventListener("click", () => {
    settingsPopup.classList.remove("open");
  });
}

// Hook into the existing settings button
refs.settingsBtn?.addEventListener("click", openSettingsPopup);


// ---------- Settings persistence (localStorage) ----------
const SETTINGS_KEY = 'onet_dashboard_settings_v1';
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(!raw) return { theme: 'light', settingsAsModal: true };
    return JSON.parse(raw);
  }catch(e){ return { theme: 'light', settingsAsModal: true }; }
}
function saveSettings(s){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }catch(e){}
}
function applySettings(s){
  // theme
  if(s.theme === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark');
  // settings mode checkbox if present
  if(refs.settingsAsModal) refs.settingsAsModal.checked = !!s.settingsAsModal;
}
let SETTINGS = loadSettings();
applySettings(SETTINGS);

// wire settings changes
if(refs.settingsAsModal){
  refs.settingsAsModal.addEventListener('change', (e)=>{
    SETTINGS.settingsAsModal = e.target.checked;
    saveSettings(SETTINGS);
  });
}
// Example theme toggle API (you can wire this to a button in settings UI)
function toggleTheme(){
  SETTINGS.theme = (SETTINGS.theme === 'dark') ? 'light' : 'dark';
  applySettings(SETTINGS);
  saveSettings(SETTINGS);
}
// expose toggleTheme for quick console usage
window._onet_toggleTheme = toggleTheme;
// ------------------------------------------------------------------


// ---------- mood selection (save to Firestore + create a post) ----------
async function selectMood(mood){
  if(!currentUser) return showAlert('error','Sign in first.');
  try{
    const uref = doc(db,'users', currentUser.uid);
    await updateDoc(uref, {
      moodKey: mood.key,
      moodEmoji: mood.emoji,
      moodColor: mood.color,
      moodAt: new Date().toISOString()
    });
    // optional: create a mood post
    await addDoc(collection(db,'posts'), {
      uid: currentUser.uid,
      username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
      text: `${mood.label}`,
      mood: mood.emoji,
      moodKey: mood.key,
      moodColor: mood.color,
      imageURL: null,
      time: new Date().toISOString(),
      autoMood: true
    });
    hide(refs.feelingBox);
    refs.feelingBox?.setAttribute('aria-hidden','true');
    showAlert('success', `Saved mood ${mood.emoji}`);
    // AYA-X log
    try{ await logAyaEvent('mood', { moodKey: mood.key, moodLabel: mood.label, moodColor: mood.color }); }catch(e){console.warn('aya mood log',e);}
  }catch(err){
    console.error('selectMood failed', err);
    showAlert('error','Could not save mood');
  }
}

// ---------- follow / unfollow logic (update both user docs) ----------
async function toggleFollow(targetUid, targetName){
  if(!currentUser) return showAlert('error','Sign in first.');
  try{
    const myRef = doc(db,'users', currentUser.uid);
    const targetRef = doc(db,'users', targetUid);
    const meSnap = await getDoc(myRef);
    const me = meSnap.exists() ? meSnap.data() : { following: [] };
    const following = me.following || [];

    if(following.includes(targetUid)){
      // unfollow: remove from my following and remove me from target's followers
      await updateDoc(myRef, { following: arrayRemove(targetUid) });
      await updateDoc(targetRef, { followers: arrayRemove(currentUser.uid) });
      showAlert('success', `Unfollowed ${targetName||targetUid}`);
      try{ await logAyaEvent('unfollow', { targetUid, targetName, action: 'unfollow' }); }catch(e){console.warn('aya unfollow log',e); }
    } else {
      // follow: add to both lists
      await updateDoc(myRef, { following: arrayUnion(targetUid) });
      await updateDoc(targetRef, { followers: arrayUnion(currentUser.uid) });
      showAlert('success', `Following ${targetName||targetUid}`);
      try{ await logAyaEvent('follow', { targetUid, targetName, action: 'follow' }); }catch(e){console.warn('aya follow log',e); }
    }
  }catch(err){
    console.error('toggleFollow', err);
    showAlert('error', 'Follow action failed');
  }
}

// ---------- render presence / follow lists from usersCache ----------
function renderPresence(){
  if(!refs.activeList) return;
  refs.activeList.innerHTML = '';
  const now = Date.now();
  usersCache.forEach(u=>{
    const last = u.lastActive ? new Date(u.lastActive).getTime() : 0;
    const active = (now - last) < (1000*60*5);
    const el = document.createElement('div');
    el.className = 'presence-row';
    el.style.display = 'flex'; el.style.alignItems='center'; el.style.justifyContent='space-between'; el.style.marginBottom='8px';

    el.innerHTML = `<div style="display:flex;gap:8px;align-items:center">
      <div style="font-size:20px">${u.moodEmoji||'🙂'}</div>
      <div>
        <div style="font-weight:700">${u.username || u.uid}</div>
        <div class="muted">${active ? 'Online' : 'Away'}</div>
      </div>
    </div>`;

    if(currentUser && u.uid !== currentUser.uid){
      const btn = document.createElement('button'); btn.className='follow-btn btn small';
      // find if I am following them
      const me = usersCache.find(x => x.uid === currentUser.uid) || {};
      const isFollowing = (me.following || []).includes(u.uid);
      btn.textContent = isFollowing ? 'Following' : 'Follow';
      btn.style.marginLeft = '8px';
      if(isFollowing){
        btn.classList.add('following-btn');
        btn.style.background = 'linear-gradient(90deg,#2ecc71,#27b86a)';
      }
      btn.addEventListener('click', ()=> toggleFollow(u.uid, u.username));
      btn.addEventListener('auxclick', (ev)=>{ if(ev.button===1) openOneOnOneChat(u.uid, u.username); });
      el.appendChild(btn);
    }

    refs.activeList.appendChild(el);
  });
}

function renderFollowList(){
  if(!refs.followList) return;
  const curUid = currentUser?.uid;
  if(!curUid){ refs.followList.innerHTML = '<div class="muted">Sign in to view following</div>'; return; }
  refs.followList.innerHTML = '';
  const me = usersCache.find(x=>x.uid===curUid) || {};
  const following = me.following || [];
  following.forEach(uid=>{
    const u = usersCache.find(x=>x.uid===uid);
    if(!u) return;
    const div = document.createElement('div');
    div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center'; div.style.marginBottom='10px';
    div.innerHTML = `<div style="display:flex;gap:8px;align-items:center">
      <div style="width:40px;height:40px;border-radius:8px;background:${u.avatarURL?`url(${u.avatarURL}) center/cover`:'#eee'}"></div>
      <div>
        <div style="font-weight:700">${u.username||u.uid}</div>
        <div class="muted">${u.lastActive? ( (Date.now() - new Date(u.lastActive).getTime()) < (1000*60*5) ? 'Online' : 'Away') : 'Away'}</div>
      </div>
    </div>`;
    const btn = document.createElement('button'); btn.className='btn ghost small';
    btn.textContent = 'Remove';
    btn.addEventListener('click', ()=> toggleFollow(u.uid, u.username));
    div.appendChild(btn);
    refs.followList.appendChild(div);
  });
}

function renderFollowingMini(){
  if(!refs.miniFollowing) return;
  refs.miniFollowing.innerHTML = '';
  const curUid = currentUser?.uid;
  if(!curUid) return;
  const me = usersCache.find(x=>x.uid===curUid) || {};
  const following = me.following || [];
  following.slice(0,6).forEach(uid=>{
    const u = usersCache.find(x=>x.uid===uid); if(!u) return;
    const el = document.createElement('div'); el.style.display='flex'; el.style.alignItems='center'; el.style.gap='8px'; el.style.marginBottom='8px';
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:${u.avatarURL?`url(${u.avatarURL}) center/cover`:'#ddd'}"></div><div style="font-weight:700">${u.username||u.uid}</div>`;
    refs.miniFollowing.appendChild(el);
  });
}

// ---------- start users listener (real-time) ----------
function startUsersListener(){
  const q = collection(db,'users');
  if(usersUnsub) usersUnsub();
  usersUnsub = onSnapshot(q, snap => {
    usersCache = [];
    snap.forEach(s => {
      const d = s.data(); d.uid = s.id; usersCache.push(d);
    });
    renderPresence();
    renderFollowingMini();
    renderFollowList();
    renderMoodSummary();
  }, err => console.error('users listen', err));
}

// ---------- render mood summary ----------
function renderMoodSummary(){
  if(!refs.moodSummary) return;
  refs.moodSummary.innerHTML = '';
  const summary = {};
  usersCache.forEach(u=>{
    const key = u.moodKey || 'none';
    summary[key] = (summary[key]||0) + 1;
  });
  Object.keys(summary).forEach(k=>{
    const row = document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.marginBottom='6px';
    row.innerHTML = `<div>${k==='none' ? 'No mood' : k}</div><div>${summary[k]}</div>`;
    refs.moodSummary.appendChild(row);
  });
}

// ---------- posts feed (simple render) ----------
function startPostsListener(){
  const q = query(collection(db,'posts'), orderBy('time','desc'), limit(200));
  if(postsUnsub) postsUnsub();
  postsUnsub = onSnapshot(q, snap => {
    postsCache = [];
    snap.forEach(s => postsCache.push({ id: s.id, ...s.data() }));
    renderFeedFromCache();
  }, err => console.error('posts listen', err));
}
function renderFeedFromCache(){
  if(!refs.feed) return;
  refs.feed.innerHTML = '';
  const qstr = refs.globalSearch?.value.trim().toLowerCase();
  let posts = postsCache.slice();
  if(qstr) posts = posts.filter(p => (p.text||'').toLowerCase().includes(qstr) || (p.username||'').toLowerCase().includes(qstr));
  posts.forEach(p=>{
    const card = document.createElement('div'); card.className='post';
    card.style.borderLeft = `6px solid ${p.moodColor || '#ffd93d'}`;
    const meta = document.createElement('div'); meta.className='muted'; meta.textContent = `${p.username || 'Unknown'} • ${p.time ? new Date(p.time).toLocaleString() : ''}`;
    const content = document.createElement('div'); content.style.marginTop='8px';
    content.innerHTML = `<div>${p.mood || ''} ${escapeHtml(p.text||'')}</div>`;
    if(p.imageURL){ const img = document.createElement('img'); img.src = p.imageURL; content.appendChild(img); }
    card.appendChild(meta); card.appendChild(content);
    refs.feed.appendChild(card);
    // small staggered reveal
    setTimeout(()=> card.classList.add('visible'), 50 + (Math.random()*250));
  });
}

// ---------- utility ----------
function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ---------- post creation ----------
refs.postBtn?.addEventListener('click', async ()=>{
  if(!currentUser) return showAlert('error','Sign in first.');
  const text = refs.postText?.value?.trim() || '';
  const f = refs.postImage?.files?.[0];
  if(!text && !f) return showAlert('error','Write something or add an image.');
  try{
    let url = null;
    if(f){
      const path = `posts/${currentUser.uid}/${Date.now()}_${f.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, f);
      url = await getDownloadURL(r);
    }
    await addDoc(collection(db,'posts'), {
      uid: currentUser.uid,
      username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
      text,
      mood: null,
      moodColor: null,
      imageURL: url || null,
      time: new Date().toISOString()
    });
    refs.postText.value = ''; if(refs.postImage) refs.postImage.value = '';
    hide(refs.postModal);
    showAlert('success','Posted.');
    // AYA-X log
    try{ await logAyaEvent('post', { text: text, hasImage: !!url }); }catch(e){console.warn('aya post log',e);}
  }catch(err){ console.error('post failed', err); showAlert('error','Post failed'); }
});

// ---------- avatar upload (settings) ----------
refs.avatarUpload?.addEventListener('change', async (e)=>{
  if(!currentUser) return showAlert('error','Sign in first.');
  const f = e.target.files[0]; if(!f) return;
  try{
    const path = `avatars/${currentUser.uid}/${Date.now()}_${f.name}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, f);
    const url = await getDownloadURL(r);
    await updateDoc(doc(db,'users',currentUser.uid), { avatarURL: url });
    if(refs.topAvatar) refs.topAvatar.style.backgroundImage = `url(${url})`;
    if(refs.settingsAvatarPreview) refs.settingsAvatarPreview.style.backgroundImage = `url(${url})`;
    if(refs.composerAvatar) refs.composerAvatar.style.backgroundImage = `url(${url})`;
    showAlert('success','Avatar uploaded');
  }catch(err){ console.error('avatar upload', err); showAlert('error','Avatar upload failed'); }
});

// ---------- chat redirect & remove chat container ----------
refs.messageOneOnOneBtn?.addEventListener('click', (e) => {
  // close/remove chat modal container if visible
  if(refs.chatModal) hide(refs.chatModal);
  // redirect to chat engine with optional context (open main chats)
  const url = new URL(window.location.href);
  // preserve referrer / quick hint
  window.location.href = "../chat-engine.html";
});

// Quick function to open a one-on-one chat (used by follow list and presence rows)
function openOneOnOneChat(targetUid, targetName){
  // store a quick seed in sessionStorage so chat-engine can open directly to the user
  try{ sessionStorage.setItem('onet_open_chat', JSON.stringify({ uid: targetUid, name: targetName })); }catch(e){}
  window.location.href = "../chat-engine.html";
}


// ---------- click outside to close any open modals/panels ----------
document.addEventListener('click', (e) => {
  // settings modal (we prefer to show settings in modal center)
  if(refs.settingsModal?.classList.contains('open')){
    if(!refs.settingsModal.contains(e.target) && !refs.settingsBtn.contains(e.target)){
      hide(refs.settingsModal);
      refs.settingsModal.setAttribute('aria-hidden','true');
    }
  }

  // feeling box
  if(refs.feelingBox?.classList.contains('open')){
    if(!refs.feelingBox.contains(e.target) && !refs.openFeelingBtn.contains(e.target)){
      hide(refs.feelingBox);
      refs.feelingBox.setAttribute('aria-hidden','true');
    }
  }

  // post modal
  if(refs.postModal?.classList.contains('open')){
    if(!refs.postModal.contains(e.target) && !refs.openPostButton.contains(e.target)){
      hide(refs.postModal);
    }
  }

  // chat modal
  if(refs.chatModal?.classList.contains('open')){
    if(!refs.chatModal.contains(e.target) && !refs.messengerBtn.contains(e.target)){
      hide(refs.chatModal);
    }
  }
});

// ---------- settings button: show as centered modal popup (instead of slide drawer) ----------
refs.settingsBtn?.addEventListener('click', () => {
  const asModal = refs.settingsAsModal?.checked;
  if(asModal){
    // copy drawer content into modal and show
    refs.settingsModalContent.innerHTML = refs.settingsDrawer.innerHTML;
    show(refs.settingsModal);
    refs.settingsModal.setAttribute('aria-hidden','false');
    // wire close button inside modal copy
    setTimeout(()=> {
      document.getElementById('closeSettingsModal')?.addEventListener('click', ()=> {
        hide(refs.settingsModal);
        refs.settingsModal.setAttribute('aria-hidden','true');
      });
    }, 50);
  } else {
    // fallback to sliding drawer (if user didn't choose modal)
    toggle(refs.settingsDrawer);
  }
});
refs.closeSettingsBtn?.addEventListener('click', ()=> hide(refs.settingsDrawer));

// also allow closing modal tile
refs.closeSettingsModal?.addEventListener('click', ()=> { hide(refs.settingsModal); refs.settingsModal.setAttribute('aria-hidden','true'); });


// ===================== AYA-X Learning System =====================
async function logAyaEvent(type, data = {}) {
  if (!currentUser) return;
  try {
    const payload = {
      uid: currentUser.uid,
      type,
      data,
      createdAt: new Date().toISOString(),
      processed: false
    };
    await addDoc(collection(db, "aya_learn"), payload);
    // also send to external AYA-X API (placeholder)
    sendToAyaXAPI(payload);
  } catch (err) {
    console.error("AYA-X log failed:", err);
  }
}

async function sendToAyaXAPI(payload) {
  // placeholder for future AI training pipeline
  try {
    // best-effort: don't block UI
    fetch("https://aya-x.orel/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(e => console.warn("AYA-X API offline or stubbed:", e.message));
  } catch (err) {
    console.warn("AYA-X API error:", err.message);
  }
}
// =================================================================

// ---------- auth state listener (main) ----------
onAuthStateChanged(auth, async (user) => {
  if(!user){
    // not signed in -> redirect to login
    window.location.href = '../login.html';
    return;
  }
  currentUser = user;
  // set header names
  if(refs.topUsername) refs.topUsername.textContent = user.displayName || user.email?.split('@')[0] || 'You';
  if(refs.composerName) refs.composerName.textContent = refs.topUsername.textContent;

  // ensure user doc exists
  const uref = doc(db,'users', user.uid);
  const snap = await getDoc(uref);
  if(!snap.exists()){
    await setDoc(uref, {
      uid: user.uid,
      username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      email: user.email || null,
      lastActive: new Date().toISOString(),
      following: [],
      followers: []
    }, { merge:true });
  } else {
    const data = snap.data();
    if(data.avatarURL && refs.topAvatar) refs.topAvatar.style.backgroundImage = `url(${data.avatarURL})`;
    if(data.moodEmoji && refs.composerMood) refs.composerMood.textContent = data.moodEmoji;
  }

  // presence update
  await updatePresence();
  setInterval(()=> updatePresence(), 30_000);

  // start listeners
  startUsersListener();
  startPostsListener();
});

// ---------- update presence ----------
async function updatePresence(){ 
  if(!currentUser) return;
  try{
    const uref = doc(db,'users', currentUser.uid);
    await updateDoc(uref, { lastActive: new Date().toISOString() });
  }catch(e){ console.error('presence update failed', e); }
}

// ---------- logout handler ----------
refs.logoutBtn?.addEventListener('click', async ()=>{
  try{
    await signOut(auth);
    window.location.href = '../login.html';
  }catch(e){ console.error('logout failed', e); showAlert('error','Logout failed'); }
});

// ---------- search filter for followList ----------
refs.followSearch?.addEventListener('input', () => {
  const q = refs.followSearch.value.trim().toLowerCase();
  Array.from(refs.followList.children).forEach(div=>{
    const t = div.textContent.toLowerCase();
    div.style.display = t.includes(q) ? '' : 'none';
  });
});

// ---------- small keyboard convenience for composer (Ctrl/Cmd+P) ----------
document.addEventListener('keydown', (e)=> {
  if(e.key === 'p' && (e.ctrlKey || e.metaKey)){
    e.preventDefault();
    show(refs.postModal);
  }
});

// ---------- responsive tweak ----------
function adjustLayout(){
  if(window.innerWidth <= 768) document.body.classList.add('mobile-view');
  else document.body.classList.remove('mobile-view');
}
window.addEventListener('resize', adjustLayout);
window.addEventListener('load', adjustLayout);


// ---------- done ----------
console.log('dashboard.js loaded — features: settings modal, emoji moods, follow/unfollow, redirects.');
