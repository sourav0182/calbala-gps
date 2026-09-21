import {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  getDoc,
  signOut
} from "./firebase.js";

onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists() && adminSnap.data().active === true) {
      location.href = "admin.html";
    } else {
      await signOut(auth);
      document.getElementById("error").textContent =
        "এই অ্যাকাউন্টের Admin অনুমতি নেই।";
    }
  } catch (error) {
    console.error(error);
    await signOut(auth);
    document.getElementById("error").textContent =
      "Admin যাচাই করা যাচ্ছে না।";
  }
});

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const error = document.getElementById("error");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  error.textContent = "";

  try {
    await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value
    );
  } catch (e) {
  console.error(e);
  error.textContent = "Firebase Error: " + e.code + " — " + e.message;
}
});
