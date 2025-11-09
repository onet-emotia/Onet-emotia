// ===== Import Firebase SDKs =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { 
  getStorage 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

// ===== Your Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyAhB9pqVXV4L59T1OggGMz75ExohoU255g",
  authDomain: "onet-emotia.firebaseapp.com",
  projectId: "onet-emotia",
  storageBucket: "onet-emotia.firebasestorage.app",
  messagingSenderId: "887367384521",
  appId: "1:887367384521:web:6312bb8d0d51f0da8e7c18",
  measurementId: "G-VX4KB7LCTR"
};

// ===== Initialize Firebase =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ===== Auth Providers =====
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// ===== Export All =====
export { app, auth, db, storage, googleProvider, facebookProvider };