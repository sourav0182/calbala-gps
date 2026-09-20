import { db, collection, query, where, orderBy, onSnapshot } from "./firebase.js";

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("menu").onclick = () => document.getElementById("nav").classList.toggle("show");

const q = query(collection(db,"notices"), where("published","==",true), orderBy("pinned","desc"), orderBy("noticeDate","desc"));
onSnapshot(q, snap => {
  const list = document.getElementById("noticeList");
  const data = snap.docs.map(x=>({id:x.id,...x.data()}));
  list.innerHTML = data.length ? data.map(notice => `
    <article class="full-notice" id="${notice.id}">
      <div class="full-head"><div><span class="tag">${escapeHtml(notice.category || "সাধারণ")}</span><h2>${escapeHtml(notice.title)}</h2><small>প্রকাশের তারিখ: ${formatDate(notice.noticeDate)} ${notice.pinned ? " • 📌 গুরুত্বপূর্ণ" : ""}</small></div></div>
      <p>${escapeHtml(notice.body).replace(/\n/g,"<br>")}</p>
      ${notice.fileUrl ? `<a class="btn small" target="_blank" rel="noopener" href="${notice.fileUrl}">📎 সংযুক্ত ফাইল দেখুন</a>` : ""}
    </article>`).join("") : "<div class='card'>এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</div>";
}, err => {
  console.error(err);
  document.getElementById("noticeList").innerHTML = "<div class='card'>নোটিশ লোড করা যাচ্ছে না। Firebase সেটআপ পরীক্ষা করুন।</div>";
});
function formatDate(v){ if(!v)return"--"; const [y,m,d]=v.split("-"); return `${d}/${m}/${y}`; }
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
