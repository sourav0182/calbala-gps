import { auth, signInWithEmailAndPassword, onAuthStateChanged } from "./firebase.js";

onAuthStateChanged(auth, user => { if(user) location.href="admin.html"; });

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const error = document.getElementById("error");
  error.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    location.href = "admin.html";
  } catch (e) {
    console.error(e);
    error.textContent = "ই-মেইল বা পাসওয়ার্ড সঠিক নয়, অথবা Firebase Authentication চালু করা হয়নি।";
  }
});
