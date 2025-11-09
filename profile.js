import { auth, db, storage } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

const profilePic = document.getElementById("profile-pic");
const coverPhoto = document.getElementById("cover-photo");
const profileInput = document.getElementById("profile-input");
const coverInput = document.getElementById("cover-input");
const changeProfileBtn = document.getElementById("change-profile-btn");
const changeCoverBtn = document.getElementById("change-cover-btn");
const editProfileBtn = document.getElementById("edit-profile-btn");
const modal = document.getElementById("edit-modal");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveProfileBtn = document.getElementById("save-profile-btn");
const bioInput = document.getElementById("bio-input");
const locationInput = document.getElementById("location-input");
const followersCount = document.getElementById("followers-count");
const followingCount = document.getElementById("following-count");
const followBtn = document.getElementById("follow-btn");

let currentUser = null;
let viewedUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "../auth/login.html");
  currentUser = user;

  // Example: get ?uid= parameter to view another user's profile
  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || currentUser.uid;

  await loadUserProfile();

  // Hide edit buttons if viewing someone else's profile
  if (viewedUserId !== currentUser.uid) {
    changeProfileBtn.style.display = "none";
    changeCoverBtn.style.display = "none";
    editProfileBtn.style.display = "none";
    followBtn.style.display = "inline-block";
  }
});

async function loadUserProfile() {
  const userRef = doc(db, "users", viewedUserId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    profilePic.src = data.photoURL || "../assets/default-avatar.png";
    coverPhoto.src = data.coverURL || "../assets/default-cover.jpg";
    document.getElementById("display-name").textContent = data.name || "User";
    document.getElementById("user-bio").textContent = data.bio || "Hey there! I’m using Onet Emotia 💬";
    followersCount.textContent = data.followers?.length || 0;
    followingCount.textContent = data.following?.length || 0;
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    if (viewedUserId !== currentUser.uid) {
      checkIfFollowing(data.followers || []);
    }
  }
}

/* ===== FOLLOW SYSTEM ===== */
async function checkIfFollowing(followers) {
  if (followers.includes(currentUser.uid)) {
    followBtn.textContent = "Following";
    followBtn.classList.add("following");
  } else {
    followBtn.textContent = "Follow";
    followBtn.classList.remove("following");
  }
}

followBtn.onclick = async () => {
  if (!currentUser || !viewedUserId) return;

  const currentUserRef = doc(db, "users", currentUser.uid);
  const viewedUserRef = doc(db, "users", viewedUserId);

  const viewedSnap = await getDoc(viewedUserRef);
  const viewedData = viewedSnap.data() || { followers: [] };

  const isFollowing = viewedData.followers?.includes(currentUser.uid);

  if (isFollowing) {
    // Unfollow
    await updateDoc(currentUserRef, { following: arrayRemove(viewedUserId) });
    await updateDoc(viewedUserRef, { followers: arrayRemove(currentUser.uid) });
    followBtn.textContent = "Follow";
    followBtn.classList.remove("following");
  } else {
    // Follow
    await updateDoc(currentUserRef, { following: arrayUnion(viewedUserId) });
    await updateDoc(viewedUserRef, { followers: arrayUnion(currentUser.uid) });
    followBtn.textContent = "Following";
    followBtn.classList.add("following");
  }

  // Update counts visually
  await loadUserProfile();
};

/* ====== IMAGE UPLOAD ====== */
changeProfileBtn.onclick = () => profileInput.click();
changeCoverBtn.onclick = () => coverInput.click();

profileInput.onchange = () => previewImage(profileInput.files[0], profilePic, "photoURL");
coverInput.onchange = () => previewImage(coverInput.files[0], coverPhoto, "coverURL");

async function previewImage(file, imgElement, field) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => (imgElement.src = e.target.result);
  reader.readAsDataURL(file);

  const storageRef = ref(storage, `users/${currentUser.uid}/${field}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { [field]: url });
}

/* ====== EDIT MODAL ====== */
editProfileBtn.onclick = () => modal.classList.add("active");
cancelEditBtn.onclick = () => modal.classList.remove("active");

saveProfileBtn.onclick = async () => {
  /* ====== VIEW FOLLOWERS / FOLLOWING ====== */
const connectionsModal = document.getElementById("connections-modal");
const connectionsTitle = document.getElementById("connections-title");
const connectionsList = document.getElementById("connections-list");
const closeConnectionsBtn = document.getElementById("close-connections-btn");

// Open modal for followers
followersCount.parentElement.onclick = () =>
  openConnections("followers");

// Open modal for following
followingCount.parentElement.onclick = () =>
  openConnections("following");

closeConnectionsBtn.onclick = () =>
  connectionsModal.classList.remove("active");

async function openConnections(type) {
  connectionsList.innerHTML = "<p>Loading...</p>";
  connectionsModal.classList.add("active");
  connectionsTitle.textContent = type === "followers" ? "Followers" : "Following";

  const userRef = doc(db, "users", viewedUserId);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data();

  const list = data?.[type] || [];

  if (!list.length) {
    connectionsList.innerHTML = "<p style='text-align:center;'>No users found.</p>";
    return;
  }

  // Load user info for each connection
  const users = [];
  for (const uid of list) {
    const uRef = doc(db, "users", uid);
    const uSnap = await getDoc(uRef);
    if (uSnap.exists()) {
      const uData = uSnap.data();
      users.push({ uid, ...uData });
    }
  }

  // Display list
  connectionsList.innerHTML = users
    .map(
      (u) => `
      <div class="connection-item" data-uid="${u.uid}">
        <img src="${u.photoURL || '../assets/default-avatar.png'}" />
        <span>${u.name || 'Unnamed User'}</span>
      </div>
    `
    )
    .join("");

  // Click to visit profile
  document.querySelectorAll(".connection-item").forEach((item) =>
    item.addEventListener("click", (e) => {
      const uid = e.currentTarget.getAttribute("data-uid");
      window.location.href = `profile.html?uid=${uid}`;
    })
  );
}
  const bio = bioInput.value.trim();
  const location = locationInput.value.trim();

  await setDoc(doc(db, "users", currentUser.uid), {
    bio,
    location,
    updatedAt: new Date(),
  }, { merge: true });

  document.getElementById("user-bio").textContent = bio;
  modal.classList.remove("active");
  alert("Profile updated successfully ✅");
};