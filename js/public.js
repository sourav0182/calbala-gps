import { db, collection, query, where, orderBy, limit, onSnapshot } from "./firebase.js";

document.getElementById("year").textContent = new Date().getFullYear();
const d = new Date();
document.getElementById("today").textContent = d.getDate() + "/" + (d.getMonth()+1);

const nav = document.getElementById("nav");
document.getElementById("menu").onclick = () => nav.classList.toggle("show");

const q = query(collection(db, "notices"), where("published", "==", true), orderBy("pinned","desc"), orderBy("noticeDate","desc"), limit(6));
onSnapshot(q, snap => {
  const data = snap.docs.map(x => ({id:x.id,...x.data()}));
  renderTicker(data);
  const box = document.getElementById("latestNotices");
  box.innerHTML = data.length ? data.slice(0,5).map(n => noticeCard(n)).join("") : "<p>এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</p>";
}, err => {
  console.error(err);
  document.getElementById("latestNotices").innerHTML = "<p>নোটিশ লোড করা যাচ্ছে না। Firebase সেটআপ পরীক্ষা করুন।</p>";
});

function noticeCard(n){
  return `<a class="notice-row" href="notices.html#${n.id}"><span class="date">${formatDate(n.noticeDate)}</span><span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.category || "সাধারণ")}${n.pinned ? " • গুরুত্বপূর্ণ" : ""}</small></span><span>→</span></a>`;
}
function renderTicker(data){
  document.getElementById("tickerText").textContent = data[0] ? data[0].title : "কোনো নতুন নোটিশ নেই";
}
function formatDate(v){
  if(!v) return "--";
  const [y,m,d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
