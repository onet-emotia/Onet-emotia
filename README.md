# 🧠 Emotia — Powered by Onet (OREL)

**Emotia** is the next-generation social and emotional communication platform developed under the **Onet** branch of **OREL (Origin of Real Evolution Labs)**.  
It redefines digital connection by allowing users to **express emotions through AI-driven analysis, voice, video, and avatar-based interaction.**

---

## 🌍 Vision
To create a world where communication feels *human* again — where every message carries real emotion, empathy, and presence.  
Emotia blends AI understanding with authentic expression, making conversations richer and more alive.

---

## ⚙️ Key Features
- 💬 **Emotion-Aware Messaging** — Texts are analyzed and visually express emotions.
- 🎭 **AI Avatars** — Avatars react and adapt to tone and sentiment.
- 🔊 **Voice & Video Messaging** — Integrated emotion transcription in real-time.
- 🧩 **AYA-X Learning API** — Connects with OREL’s AYA-X core for adaptive AI responses.
- 🔐 **Onet Cloud Support** — Powered by Firebase for real-time storage and sync.
- 🌈 **Dynamic UI** — Smooth transitions, mood-based color system, and modern gradient themes.

---

## 🏗️ Project Structure

/emotia │ 
├── index.html                     # Landing / Home page │
├── /auth 
│  ├── login.html                 # Login page
│  ├── sign-up.html               # Signup/registration page 
│   
Firebase auth │ 
├── /dashboard 
│   ├── dashboard.html             # Main dashboard view
│   ├── dashboard.css              # Dashboard styling 
│   └── dashboard.js               # Dashboard interactions 
├── /profile 
│   ├── profile.html               # User profile page 
│   ├── profile.css                # Profile styling 
│   └── profile.js                 # Edit profile, data updates
│ ├── /settings 
│   ├── settings.html              # Settings page (preferences, privacy, etc.) 
│   ├── settings.css               # Settings UI 
│   └── settings.js                # Toggle options, theme, account controls 
│ ├── /chat 
│   ├── chats.html                 # Chat interface
│   ├── chats.css                  # Chat styling 
│   └── chats.js                   # Chat engine, message sending, AYA-X integration 
│ ├── /firebase 
│   └── firebase-config.js         # Firebase initialization & config 
│ ├── /engine 
│   ├── ai-engine.js               # Core AI logic (AYA-X link) │   ├── emoji-engine.js            # Emotion and emoji recognition │   ├── utils.js                   # Shared utility functions │   └── aya-x-api.js               # AYA-X API connection layer │ ├── /assets                        # Logos, icons, media, etc. │ ├── README.md                      # Project documentation └── LICENSE                        # Project license (optional)

---

### 🧭 Notes
- Every section (auth, chat, dashboard, etc.) is self-contained, following modular architecture.  
- Use **relative paths** in all HTML imports, like:  
  ```html
  <link rel="stylesheet" href="../profile/profile.css">
  <script src="../engine/ai-engine.js" defer></script>
  
