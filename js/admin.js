import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";

let currentUser = null;
let editingId = null;

const form = document.getElementById("noticeForm");
const statusBox = document.getElementById("status");

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  document.getElementById("adminEmail").textContent = user.email;

  try {
    const adminDoc = await getDoc(doc(db, "admins", user.uid));

    if (!adminDoc.exists() || adminDoc.data().active !== true) {
      await signOut(auth);
      alert("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");
      location.href = "login.html";
      return;
    }

    loadAdminNotices();

  } catch (error) {
    console.error(error);
    alert("Admin যাচাই করা যাচ্ছে না: " + error.message);
    await signOut(auth);
    location.href = "login.html";
  }
});


document.getElementById("logout").onclick = () => {
  signOut(auth);
};


document.getElementById("cancelEdit").onclick = resetForm;


form.addEventListener("submit", async e => {
  e.preventDefault();

  statusBox.textContent = "";

  const title = document.getElementById("title").value.trim();
  const noticeDate = document.getElementById("noticeDate").value;
  const category = document.getElementById("category").value;
  const body = document.getElementById("body").value.trim();
  const pinned = document.getElementById("pinned").checked;

  if (!title || !noticeDate || !body) {
    statusBox.textContent = "শিরোনাম, তারিখ ও নোটিশের বিবরণ পূরণ করুন।";
    return;
  }

  if (!currentUser) {
    statusBox.textContent = "Admin লগইন পাওয়া যাচ্ছে না।";
    return;
  }

  try {

    document.getElementById("saveBtn").disabled = true;
    statusBox.textContent = "সংরক্ষণ হচ্ছে...";

    const data = {
      title: title,
      noticeDate: noticeDate,
      category: category,
      body: body,
      pinned: pinned,
      published: true,
      updatedAt: serverTimestamp()
    };

    if (editingId) {

      await updateDoc(
        doc(db, "notices", editingId),
        data
      );

      statusBox.textContent = "নোটিশ সফলভাবে আপডেট হয়েছে।";

    } else {

      await addDoc(
        collection(db, "notices"),
        {
          ...data,
          createdAt: serverTimestamp(),
          authorUid: currentUser.uid
        }
      );

      statusBox.textContent = "নোটিশ সফলভাবে প্রকাশ হয়েছে।";
    }

    resetForm();

  } catch (error) {

    console.error(error);

    statusBox.textContent =
      "সমস্যা: " + (error.message || "নোটিশ সংরক্ষণ করা যায়নি");

  } finally {

    document.getElementById("saveBtn").disabled = false;

  }
});


function loadAdminNotices() {

  const q = query(
    collection(db, "notices"),
    orderBy("noticeDate", "desc")
  );

  onSnapshot(
    q,
    snap => {

      const data = snap.docs.map(x => ({
        id: x.id,
        ...x.data()
      }));

      document.getElementById("count").textContent =
        `${data.length}টি`;

      document.getElementById("adminList").innerHTML =
        data.length

          ? data.map(n => `

            <div class="admin-notice">

              <div>

                <span class="tag ${n.published ? "" : "off"}">
                  ${n.published ? "প্রকাশিত" : "বন্ধ"}
                </span>

                ${n.pinned ? " 📌" : ""}

                <h3>${escapeHtml(n.title)}</h3>

                <small>
                  ${formatDate(n.noticeDate)}
                  •
                  ${escapeHtml(n.category || "সাধারণ")}
                </small>

              </div>

              <div class="actions">

                <button
                  class="outline"
                  data-edit="${n.id}">
                  এডিট
                </button>

                <button
                  class="outline"
                  data-toggle="${n.id}">
                  ${n.published ? "লুকান" : "প্রকাশ করুন"}
                </button>

                <button
                  class="outline danger-text"
                  data-delete="${n.id}">
                  মুছুন
                </button>

              </div>

            </div>

          `).join("")

          : "<p>কোনো নোটিশ নেই।</p>";


      document
        .querySelectorAll("[data-edit]")
        .forEach(button => {
          button.onclick = () =>
            editNotice(button.dataset.edit);
        });


      document
        .querySelectorAll("[data-toggle]")
        .forEach(button => {
          button.onclick = () =>
            toggleNotice(button.dataset.toggle);
        });


      document
        .querySelectorAll("[data-delete]")
        .forEach(button => {
          button.onclick = () =>
            removeNotice(button.dataset.delete);
        });

    },

    error => {

      console.error(error);

      document.getElementById("adminList").innerHTML =
        `<p>
          নোটিশ লোড করা যাচ্ছে না।
          ${escapeHtml(error.message)}
        </p>`;

    }
  );
}


async function editNotice(id) {

  const snap = await getDoc(
    doc(db, "notices", id)
  );

  if (!snap.exists()) return;

  const n = snap.data();

  editingId = id;

  document.getElementById("title").value =
    n.title || "";

  document.getElementById("noticeDate").value =
    n.noticeDate || "";

  document.getElementById("category").value =
    n.category || "সাধারণ";

  document.getElementById("body").value =
    n.body || "";

  document.getElementById("pinned").checked =
    !!n.pinned;

  document.getElementById("formTitle").textContent =
    "নোটিশ সম্পাদনা";

  document.getElementById("saveBtn").textContent =
    "পরিবর্তন সংরক্ষণ";

  document
    .getElementById("cancelEdit")
    .classList
    .remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function toggleNotice(id) {

  const snap = await getDoc(
    doc(db, "notices", id)
  );

  if (!snap.exists()) return;

  await updateDoc(
    doc(db, "notices", id),
    {
      published: !snap.data().published,
      updatedAt: serverTimestamp()
    }
  );
}


async function removeNotice(id) {

  if (
    !confirm(
      "এই নোটিশটি স্থায়ীভাবে মুছে ফেলবেন?"
    )
  ) {
    return;
  }

  await deleteDoc(
    doc(db, "notices", id)
  );
}


function resetForm() {

  editingId = null;

  form.reset();

  document.getElementById("formTitle").textContent =
    "নতুন নোটিশ প্রকাশ";

  document.getElementById("saveBtn").textContent =
    "নোটিশ প্রকাশ করুন";

  document
    .getElementById("cancelEdit")
    .classList
    .add("hidden");
}


function formatDate(value) {

  if (!value) return "--";

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}


function escapeHtml(value = "") {

  return value.replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );

}
