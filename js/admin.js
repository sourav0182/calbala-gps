import {
  auth,
  db,
  storage,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from "./firebase.js";
let currentUser = null;
let editingId = null;

/* =========================
   ELEMENTS
========================= */

const form = document.getElementById("noticeForm");
const statusBox = document.getElementById("status");

const studentForm = document.getElementById("studentForm");
const studentStatus = document.getElementById("studentStatus");


/* =========================
   ADMIN AUTHENTICATION
========================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  document.getElementById("adminEmail").textContent =
    user.email || "";

  try {

    const adminDoc = await getDoc(
      doc(db, "admins", user.uid)
    );

    if (
      !adminDoc.exists() ||
      adminDoc.data().active !== true
    ) {

      await signOut(auth);

      alert("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");

      location.href = "login.html";

      return;
    }

    /* Load all data */

    loadAdminNotices();
    loadStudents();
    loadDashboardCounts();

  } catch (error) {

    console.error(error);

    alert(
      "Admin যাচাই করা যাচ্ছে না: " +
      error.message
    );

    await signOut(auth);

    location.href = "login.html";
  }

});


/* =========================
   LOGOUT
========================= */

document.getElementById("logout").onclick = () => {

  signOut(auth);

};


/* =========================
   SIDEBAR NAVIGATION
========================= */

document
  .querySelectorAll("[data-module]")
  .forEach(button => {

    button.onclick = () => {

      const moduleId =
        button.dataset.module;

      /* Hide all modules */

      document
        .querySelectorAll(".module")
        .forEach(module => {

          module.classList.remove("active");

        });


      /* Show selected module */

      const selected =
        document.getElementById(moduleId);

      if (selected) {
        selected.classList.add("active");
      }


      /* Active button */

      document
        .querySelectorAll("[data-module]")
        .forEach(btn => {

          btn.classList.remove("active");

          btn.classList.remove("btn");

          btn.classList.add("outline");

        });


      button.classList.remove("outline");
      button.classList.add("btn");
      button.classList.add("active");

    };

  });



/* =========================
   NOTICE SYSTEM
========================= */

document.getElementById("cancelEdit").onclick =
  resetForm;


form.addEventListener("submit", async e => {

  e.preventDefault();

  statusBox.textContent = "";

  const title =
    document.getElementById("title").value.trim();

  const noticeDate =
    document.getElementById("noticeDate").value;

  const category =
    document.getElementById("category").value;

  const body =
    document.getElementById("body").value.trim();

  const pinned =
    document.getElementById("pinned").checked;


  if (!title || !noticeDate || !body) {

    statusBox.textContent =
      "শিরোনাম, তারিখ ও নোটিশের বিবরণ পূরণ করুন।";

    return;
  }


  if (!currentUser) {

    statusBox.textContent =
      "Admin লগইন পাওয়া যাচ্ছে না।";

    return;
  }


  try {

    document.getElementById("saveBtn").disabled =
      true;

    statusBox.textContent =
      "সংরক্ষণ হচ্ছে...";


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

      statusBox.textContent =
        "নোটিশ সফলভাবে আপডেট হয়েছে.";

    } else {

      await addDoc(
        collection(db, "notices"),
        {
          ...data,

          createdAt:
            serverTimestamp(),

          authorUid:
            currentUser.uid
        }
      );

      statusBox.textContent =
        "নোটিশ সফলভাবে প্রকাশ হয়েছে.";

    }


    resetForm();

  } catch (error) {

    console.error(error);

    statusBox.textContent =
      "সমস্যা: " +
      (error.message ||
        "নোটিশ সংরক্ষণ করা যায়নি");

  } finally {

    document.getElementById("saveBtn").disabled =
      false;

  }

});


/* =========================
   LOAD NOTICES
========================= */

function loadAdminNotices() {

  const q = query(
    collection(db, "notices"),
    orderBy("noticeDate", "desc")
  );


  onSnapshot(
    q,

    snap => {

      const data =
        snap.docs.map(x => ({

          id: x.id,

          ...x.data()

        }));


      document.getElementById("count").textContent =
        `${data.length}টি`;


      /* Dashboard notice count */

      const noticeCount =
        document.getElementById("noticeCount");

      if (noticeCount) {

        noticeCount.textContent =
          data.length;

      }


      document.getElementById("adminList").innerHTML =

        data.length

          ? data.map(n => `

            <div class="admin-notice">

              <div>

                <span class="tag ${n.published ? "" : "off"}">

                  ${n.published
                    ? "প্রকাশিত"
                    : "বন্ধ"}

                </span>

                ${n.pinned ? " 📌" : ""}

                <h3>
                  ${escapeHtml(n.title)}
                </h3>

                <small>

                  ${formatDate(n.noticeDate)}

                  •

                  ${escapeHtml(
                    n.category || "সাধারণ"
                  )}

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

                  ${n.published
                    ? "লুকান"
                    : "প্রকাশ করুন"}

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
            editNotice(
              button.dataset.edit
            );

        });


      document
        .querySelectorAll("[data-toggle]")
        .forEach(button => {

          button.onclick = () =>
            toggleNotice(
              button.dataset.toggle
            );

        });


      document
        .querySelectorAll("[data-delete]")
        .forEach(button => {

          button.onclick = () =>
            removeNotice(
              button.dataset.delete
            );

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


/* =========================
   EDIT NOTICE
========================= */

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


  /* Open notice module */

  showModule("notices");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   TOGGLE NOTICE
========================= */

async function toggleNotice(id) {

  const snap = await getDoc(
    doc(db, "notices", id)
  );


  if (!snap.exists()) return;


  await updateDoc(
    doc(db, "notices", id),
    {

      published:
        !snap.data().published,

      updatedAt:
        serverTimestamp()

    }
  );

}


/* =========================
   DELETE NOTICE
========================= */

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


/* =========================
   RESET NOTICE FORM
========================= */

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


/* =========================
   STUDENT SYSTEM
========================= */

studentForm.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    studentStatus.textContent = "";


    const name =
      document
        .getElementById("studentName")
        .value
        .trim();


    const roll =
      document
        .getElementById("studentRoll")
        .value
        .trim();


    const className =
      document
        .getElementById("studentClass")
        .value;


    const section =
      document
        .getElementById("studentSection")
        .value
        .trim();


    const fatherName =
      document
        .getElementById("fatherName")
        .value
        .trim();


    const motherName =
      document
        .getElementById("motherName")
        .value
        .trim();


    const dateOfBirth =
      document
        .getElementById("dateOfBirth")
        .value;


    const mobile =
      document
        .getElementById("studentMobile")
        .value
        .trim();


    const address =
      document
        .getElementById("studentAddress")
        .value
        .trim();


    if (!name || !roll) {

      studentStatus.textContent =
        "শিক্ষার্থীর নাম ও রোল অবশ্যই দিতে হবে।";

      return;

    }


    try {

      document.getElementById(
        "studentSaveBtn"
      ).disabled = true;


      studentStatus.textContent =
        "শিক্ষার্থীর তথ্য সংরক্ষণ হচ্ছে...";


      await addDoc(
        collection(db, "students"),
        {

          name,

          roll,

          className,

          section,

          fatherName,

          motherName,

          dateOfBirth,

          mobile,

          address,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          createdBy:
            currentUser.uid

        }
      );


      studentStatus.textContent =
        "✅ শিক্ষার্থীর তথ্য সফলভাবে সংরক্ষণ হয়েছে।";


      studentForm.reset();


    } catch (error) {

      console.error(error);

      studentStatus.textContent =
        "❌ সমস্যা: " +
        error.message;

    } finally {

      document.getElementById(
        "studentSaveBtn"
      ).disabled = false;

    }

  }
);


/* =========================
   LOAD STUDENTS
========================= */

function loadStudents() {

  const q = query(
    collection(db, "students"),
    orderBy("createdAt", "desc")
  );


  onSnapshot(
    q,

    snap => {

      const students =
        snap.docs.map(x => ({

          id: x.id,

          ...x.data()

        }));


      document.getElementById(
        "studentListCount"
      ).textContent =
        `${students.length}টি`;


      document.getElementById(
        "studentCount"
      ).textContent =
        students.length;


      const list =
        document.getElementById(
          "studentList"
        );


      if (!students.length) {

        list.innerHTML =
          "<p>এখনো কোনো শিক্ষার্থী যোগ করা হয়নি।</p>";

        return;

      }


      list.innerHTML = `

        <div style="overflow-x:auto">

          <table class="student-table">

            <thead>

              <tr>

                <th>রোল</th>

                <th>নাম</th>

                <th>শ্রেণি</th>

                <th>শাখা</th>

                <th>পিতা</th>

                <th>মোবাইল</th>

                <th>অ্যাকশন</th>

              </tr>

            </thead>


            <tbody>

              ${students.map(student => `

                <tr>

                  <td>
                    ${escapeHtml(
                      String(
                        student.roll || ""
                      )
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      student.name || ""
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      student.className || ""
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      student.section || "-"
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      student.fatherName || "-"
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      student.mobile || "-"
                    )}
                  </td>


                  <td>

                    <button
                      class="outline danger-text"
                      data-student-delete="${student.id}">

                      মুছুন

                    </button>

                  </td>

                </tr>

              `).join("")}

            </tbody>

          </table>

        </div>

      `;


      document
        .querySelectorAll(
          "[data-student-delete]"
        )
        .forEach(button => {

          button.onclick = () =>
            deleteStudent(
              button.dataset.studentDelete
            );

        });

    },


    error => {

      console.error(error);

      document.getElementById(
        "studentList"
      ).innerHTML =

        `<p>
          শিক্ষার্থীর তথ্য লোড করা যাচ্ছে না।
          ${escapeHtml(error.message)}
        </p>`;

    }

  );

}


/* =========================
   DELETE STUDENT
========================= */

async function deleteStudent(id) {

  if (
    !confirm(
      "এই শিক্ষার্থীর তথ্য স্থায়ীভাবে মুছে ফেলবেন?"
    )
  ) {

    return;

  }


  try {

    await deleteDoc(
      doc(db, "students", id)
    );

  } catch (error) {

    console.error(error);

    alert(
      "শিক্ষার্থী মুছে ফেলা যায়নি: " +
      error.message
    );

  }

}


/* =========================
   DASHBOARD COUNTS
========================= */

function loadDashboardCounts() {

  /* Student count */

  onSnapshot(
    collection(db, "students"),

    snap => {

      const element =
        document.getElementById(
          "studentCount"
        );

      if (element) {

        element.textContent =
          snap.size;

      }

    }
  );


  /* Result count */

  onSnapshot(
    collection(db, "results"),

    snap => {

      const element =
        document.getElementById(
          "resultCount"
        );

      if (element) {

        element.textContent =
          snap.size;

      }

    }
  );


  /* Salary count */

  onSnapshot(
    collection(db, "salaryPayments"),

    snap => {

      const element =
        document.getElementById(
          "salaryCount"
        );

      if (element) {

        element.textContent =
          snap.size;

      }

    }
  );

}


/* =========================
   SHOW MODULE
========================= */

function showModule(moduleId) {

  document
    .querySelectorAll(".module")
    .forEach(module => {

      module.classList.remove(
        "active"
      );

    });


  const selected =
    document.getElementById(
      moduleId
    );


  if (selected) {

    selected.classList.add(
      "active"
    );

  }


  document
    .querySelectorAll(
      "[data-module]"
    )
    .forEach(btn => {

      btn.classList.remove(
        "active"
      );

      btn.classList.remove(
        "btn"
      );

      btn.classList.add(
        "outline"
      );

    });


  const button =
    document.querySelector(
      `[data-module="${moduleId}"]`
    );


  if (button) {

    button.classList.remove(
      "outline"
    );

    button.classList.add(
      "btn"
    );

    button.classList.add(
      "active"
    );

  }

}


/* =========================
   DATE FORMAT
========================= */

function formatDate(value) {

  if (!value) return "--";

  const [
    year,
    month,
    day
  ] = value.split("-");

  return `${day}/${month}/${year}`;

}


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(value = "") {

  return String(value).replace(
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
// ==========================================
// SCHOOL SETTINGS
// ==========================================

const settingsForm = document.getElementById("settingsForm");
const settingsStatus = document.getElementById("settingsStatus");
const settingsSaveBtn = document.getElementById("settingsSaveBtn");

const schoolNameInput = document.getElementById("schoolName");
const schoolAddressInput = document.getElementById("schoolAddress");
const headteacherNameInput = document.getElementById("headteacherName");
const schoolPhoneInput = document.getElementById("schoolPhone");

const schoolLogoInput = document.getElementById("schoolLogo");
const headteacherSignatureInput = document.getElementById("headteacherSignature");

const logoPreview = document.getElementById("logoPreview");
const signaturePreview = document.getElementById("signaturePreview");

let existingSchoolLogo = "";
let existingHeadteacherSignature = "";


// Load School Settings
async function loadSchoolSettings() {
  try {
    const settingsRef = doc(db, "settings", "school");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      return;
    }

    const data = settingsSnap.data();

    schoolNameInput.value = data.schoolName || "";
    schoolAddressInput.value = data.schoolAddress || "";
    headteacherNameInput.value = data.headteacherName || "";
    schoolPhoneInput.value = data.schoolPhone || "";

    existingSchoolLogo = data.schoolLogo || "";
    existingHeadteacherSignature = data.headteacherSignature || "";

    if (existingSchoolLogo) {
      logoPreview.innerHTML = `
        <img
          src="${escapeHtml(existingSchoolLogo)}"
          alt="School Logo"
        >
      `;
    }

    if (existingHeadteacherSignature) {
      signaturePreview.innerHTML = `
        <img
          src="${escapeHtml(existingHeadteacherSignature)}"
          alt="Headteacher Signature"
        >
      `;
    }

  } catch (error) {
    console.error("Settings load error:", error);

    if (settingsStatus) {
      settingsStatus.textContent =
        "❌ Settings লোড করতে সমস্যা হয়েছে।";
    }
  }
}


// Logo Preview
if (schoolLogoInput) {
  schoolLogoInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      settingsStatus.textContent =
        "❌ শুধুমাত্র Image file নির্বাচন করুন।";
      this.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      settingsStatus.textContent =
        "❌ Logo-এর সাইজ 5MB-এর বেশি হতে পারবে না।";
      this.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      logoPreview.innerHTML = `
        <img
          src="${e.target.result}"
          alt="Logo Preview"
        >
      `;
    };

    reader.readAsDataURL(file);
  });
}


// Signature Preview
if (headteacherSignatureInput) {
  headteacherSignatureInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      settingsStatus.textContent =
        "❌ শুধুমাত্র Image file নির্বাচন করুন।";
      this.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      settingsStatus.textContent =
        "❌ Signature-এর সাইজ 5MB-এর বেশি হতে পারবে না।";
      this.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      signaturePreview.innerHTML = `
        <img
          src="${e.target.result}"
          alt="Signature Preview"
        >
      `;
    };

    reader.readAsDataURL(file);
  });
}


// Upload Image
async function uploadSchoolImage(file) {

  if (!file) {
    return null;
  }

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = function (event) {

      const img = new Image();

      img.onload = function () {

        const maxSize = 600;

        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {

          if (width > height) {
            height = height * (maxSize / width);
            width = maxSize;
          } else {
            width = width * (maxSize / height);
            height = maxSize;
          }

        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        const dataURL = canvas.toDataURL(
          "image/webp",
          0.7
        );

        resolve(dataURL);
      };

      img.onerror = function () {
        reject(
          new Error("Image load করা যায়নি।")
        );
      };

      img.src = event.target.result;
    };

    reader.onerror = function () {
      reject(
        new Error("Image পড়তে সমস্যা হয়েছে।")
      );
    };

    reader.readAsDataURL(file);
  });
}

// Save Settings
if (settingsForm) {

  settingsForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    if (!auth.currentUser) {
      settingsStatus.textContent =
        "❌ Admin login পাওয়া যায়নি।";
      return;
    }

    const schoolName = schoolNameInput.value.trim();
    const schoolAddress = schoolAddressInput.value.trim();
    const headteacherName = headteacherNameInput.value.trim();
    const schoolPhone = schoolPhoneInput.value.trim();

    if (!schoolName || !schoolAddress || !headteacherName) {
      settingsStatus.textContent =
        "❌ প্রয়োজনীয় তথ্য পূরণ করুন।";
      return;
    }

    try {

      settingsSaveBtn.disabled = true;
      settingsSaveBtn.textContent = "⏳ সংরক্ষণ হচ্ছে...";

      let schoolLogo = existingSchoolLogo;
      let headteacherSignature = existingHeadteacherSignature;

      // Upload Logo
      if (schoolLogoInput.files.length > 0) {

        const logoFile = schoolLogoInput.files[0];

        schoolLogo = await uploadSchoolImage(logoFile);
      }

      // Upload Signature
      if (headteacherSignatureInput.files.length > 0) {

        const signatureFile =
          headteacherSignatureInput.files[0];

        headteacherSignature =
  await uploadSchoolImage(signatureFile);
      }

      // Save Firestore
      await setDoc(
  doc(db, "settings", "school"),
  {
    schoolName,
    schoolAddress,
    headteacherName,
    schoolPhone,
    schoolLogo,
    headteacherSignature,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.uid
  },
  { merge: true }
);

      existingSchoolLogo = schoolLogo || "";
      existingHeadteacherSignature =
        headteacherSignature || "";

      settingsStatus.textContent =
        "✅ School Settings সফলভাবে সংরক্ষণ হয়েছে!";

      settingsSaveBtn.textContent =
        "✅ সংরক্ষণ হয়েছে";

      schoolLogoInput.value = "";
      headteacherSignatureInput.value = "";

    } catch (error) {

      console.error("Settings save error:", error);

      settingsStatus.textContent =
        "❌ Settings সংরক্ষণ করতে সমস্যা হয়েছে: " +
        error.message;

      settingsSaveBtn.textContent =
        "💾 আবার সংরক্ষণ করুন";

    } finally {

      settingsSaveBtn.disabled = false;

    }

  });
}
// ===============================
// RESULTS SYSTEM
// ===============================

const resultStudentSelect =
  document.getElementById("resultStudent");

const resultClassInput =
  document.getElementById("resultClass");

const resultSectionInput =
  document.getElementById("resultSection");

let resultStudents = [];


// শিক্ষার্থীদের Result dropdown-এ লোড
function loadResultStudents() {

  if (!resultStudentSelect) return;

  const studentsQuery = query(
    collection(db, "students"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    studentsQuery,
    (snapshot) => {

      resultStudents = [];

      resultStudentSelect.innerHTML = `
        <option value="">
          -- শিক্ষার্থী নির্বাচন করুন --
        </option>
      `;

      snapshot.forEach((docSnap) => {

        const student = {
          id: docSnap.id,
          ...docSnap.data()
        };

        resultStudents.push(student);

        const option = document.createElement("option");

        option.value = student.id;

        option.textContent =
          `${student.name || "নাম নেই"} — রোল: ${student.roll || "-"}`;

        resultStudentSelect.appendChild(option);

      });

    },
    (error) => {

      console.error(
        "Result students load error:",
        error
      );

    }
  );
}


// শিক্ষার্থী নির্বাচন করলে
// তার শ্রেণি ও শাখা দেখাবে
if (resultStudentSelect) {

  resultStudentSelect.addEventListener(
    "change",
    function () {

      const selectedId = this.value;

      const student = resultStudents.find(
        (item) => item.id === selectedId
      );

      if (!student) {

        resultClassInput.value = "";
        resultSectionInput.value = "";

        return;
      }

      resultClassInput.value =
        student.class || "";

      resultSectionInput.value =
        student.section || "";

    }
  );

}
