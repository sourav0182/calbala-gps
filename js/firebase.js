import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, addDoc,setDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, limit, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { onAuthStateChanged, signInWithEmailAndPassword, signOut, collection, addDoc,setDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, limit, serverTimestamp, where, ref, uploadBytes, getDownloadURL, deleteObject };
