import { auth, db, storage, onAuthStateChanged, signOut, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp, ref, uploadBytes, getDownloadURL, deleteObject } from "./firebase.js";

let currentUser = null;
let editingId = null;
let oldFilePath = null;

const form = document.getElementById("noticeForm");
const statusBox = document.getElementById("status");

onAuthStateChanged(auth, async user => {
  if (!user) { location.href="login.html"; return; }
  currentUser = user;
  document.getElementById("adminEmail").textContent = user.email;
  const adminDoc = await getDoc(doc(db,"admins",user.uid));
  if (!adminDoc.exists() || adminDoc.data().active !== true) {
    await signOut(auth);
    alert("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");
    location.href="login.html";
    return;
  }
  loadAdminNotices();
});

document.getElementById("logout").onclick = () => signOut(auth);
document.getElementById("cancelEdit").onclick = resetForm;

form.addEventListener("submit", async e => {
  e.preventDefault();
  statusBox.textContent = "";
  const title = document.getElementById("title").value.trim();
  const noticeDate = document.getElementById("noticeDate").value;
  const category = document.getElementById("category").value;
  const body = document.getElementById("body").value.trim();
  const pinned = document.getElementById("pinned").checked;
  const file = document.getElementById("attachment").files[0];
  if(!currentUser) return;

  try {
    document.getElementById("saveBtn").disabled = true;
    statusBox.textContent = "সংরক্ষণ হচ্ছে...";

    let fileUrl = "";
    let filePath = oldFilePath || "";
    if (file) {
      if(file.size > 10 * 1024 * 1024) throw new Error("ফাইল ১০ MB-এর বেশি হতে পারবে না।");
      if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type))
        throw new Error("শুধু PDF/JPG/PNG/WEBP ফাইল দেওয়া যাবে।");
      filePath = `notice-files/${currentUser.uid}/${Date.now()}-${safeName(file.name)}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file, {contentType:file.type});
      fileUrl = await getDownloadURL(storageRef);
      if(oldFilePath && oldFilePath !== filePath) {
        try { await deleteObject(ref(storage, oldFilePath)); } catch(e) {}
      }
    } else if (editingId) {
      const old = await getDoc(doc(db,"notices",editingId));
      fileUrl = old.exists() ? (old.data().fileUrl || "") : "";
    }

    const data = {title, noticeDate, category, body, pinned, published:true, fileUrl, filePath, updatedAt:serverTimestamp()};
    if(editingId) {
      await updateDoc(doc(db,"notices",editingId), data);
      statusBox.textContent = "নোটিশ সফলভাবে আপডেট হয়েছে।";
    } else {
      await addDoc(collection(db,"notices"), {...data, createdAt:serverTimestamp(), authorUid:currentUser.uid});
      statusBox.textContent = "নোটিশ সফলভাবে প্রকাশ হয়েছে।";
    }
    resetForm();
  } catch(err) {
    console.error(err);
    statusBox.textContent = "সমস্যা: " + (err.message || "নোটিশ সংরক্ষণ করা যায়নি");
  } finally {
    document.getElementById("saveBtn").disabled = false;
  }
});

function loadAdminNotices(){
  const q = query(collection(db,"notices"), orderBy("noticeDate","desc"));
  onSnapshot(q, snap => {
    const data = snap.docs.map(x=>({id:x.id,...x.data()}));
    document.getElementById("count").textContent = `${data.length}টি`;
    document.getElementById("adminList").innerHTML = data.length ? data.map(n => `
      <div class="admin-notice">
        <div><span class="tag ${n.published ? "" : "off"}">${n.published ? "প্রকাশিত" : "বন্ধ"}</span>
        ${n.pinned ? " 📌" : ""}<h3>${escapeHtml(n.title)}</h3><small>${formatDate(n.noticeDate)} • ${escapeHtml(n.category||"সাধারণ")}</small></div>
        <div class="actions">
          <button class="outline" data-edit="${n.id}">এডিট</button>
          <button class="outline" data-toggle="${n.id}">${n.published ? "লুকান" : "প্রকাশ করুন"}</button>
          <button class="outline danger-text" data-delete="${n.id}">মুছুন</button>
        </div>
      </div>`).join("") : "<p>কোনো নোটিশ নেই।</p>";
    document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editNotice(b.dataset.edit));
    document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggleNotice(b.dataset.toggle));
    document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeNotice(b.dataset.delete));
  });
}

async function editNotice(id){
  const snap = await getDoc(doc(db,"notices",id));
  if(!snap.exists()) return;
  const n = snap.data();
  editingId=id; oldFilePath=n.filePath||"";
  document.getElementById("title").value = n.title || "";
document.getElementById("noticeDate").value = n.noticeDate || "";
document.getElementById("category").value = n.category || "সাধারণ";
document.getElementById("body").value = n.body || "";
document.getElementById("pinned").checked = !!n.pinned;
  document.getElementById("formTitle").textContent="নোটিশ সম্পাদনা";
  document.getElementById("saveBtn").textContent="পরিবর্তন সংরক্ষণ";
  document.getElementById("cancelEdit").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
async function toggleNotice(id){
  const snap=await getDoc(doc(db,"notices",id)); if(!snap.exists())return;
  await updateDoc(doc(db,"notices",id),{published:!snap.data().published,updatedAt:serverTimestamp()});
}
async function removeNotice(id){
  if(!confirm("এই নোটিশটি স্থায়ীভাবে মুছে ফেলবেন?")) return;
  const snap=await getDoc(doc(db,"notices",id)); if(!snap.exists())return;
  const n=snap.data();
  await deleteDoc(doc(db,"notices",id));
  if(n.filePath) try{await deleteObject(ref(storage,n.filePath));}catch(e){}
}
function resetForm(){
  editingId=null; oldFilePath=null; form.reset();
  document.getElementById("formTitle").textContent="নতুন নোটিশ প্রকাশ";
  document.getElementById("saveBtn").textContent="নোটিশ প্রকাশ করুন";
  document.getElementById("cancelEdit").classList.add("hidden");
}
function safeName(s){return s.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-80);}
function formatDate(v){if(!v)return"--";const [y,m,d]=v.split("-");return `${d}/${m}/${y}`;}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
