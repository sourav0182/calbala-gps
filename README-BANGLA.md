# 🏫 বাস্তব স্কুল ওয়েবসাইট — Firebase Admin Notice System

এই version-এ প্রধান শিক্ষক/অ্যাডমিন login করে যেকোনো সময়:
- নতুন নোটিশ প্রকাশ করতে পারবেন
- নোটিশ edit করতে পারবেন
- নোটিশ hide/show করতে পারবেন
- নোটিশ delete করতে পারবেন
- গুরুত্বপূর্ণ নোটিশ pin করতে পারবেন
- PDF/JPG/PNG/WEBP ফাইল সংযুক্ত করতে পারবেন
- প্রকাশিত নোটিশ public website-এ সঙ্গে সঙ্গে দেখা যাবে

## 1) Firebase project
Firebase Console-এ নতুন project তৈরি করুন এবং একটি Web App register করুন।

## 2) Authentication
Authentication → Sign-in method → Email/Password → Enable করুন।

## 3) Admin account
Authentication → Users → Add user দিয়ে প্রধান শিক্ষকের email/password account তৈরি করুন।
তারপর ওই user-এর UID কপি করুন।

## 4) Firestore
Firestore Database তৈরি করুন।
`admins` collection তৈরি করে document ID হিসেবে প্রধান শিক্ষকের UID দিন।
Fields:
active = true (Boolean)

তারপর `notices` collection প্রথম নোটিশ দেওয়ার সময় নিজে তৈরি হবে।

## 5) Storage
Storage চালু করুন। তারপর `storage.rules`-এর নিয়ম publish করুন।

## 6) Security Rules
Firestore Rules-এ `firestore.rules`-এর সম্পূর্ণ code বসিয়ে Publish করুন।
Storage Rules-এ `storage.rules`-এর সম্পূর্ণ code বসিয়ে Publish করুন।

## 7) Firebase config
Firebase Console → Project settings → Your apps → Web app থেকে config কপি করুন।
`js/firebase-config.js`-এর placeholder-গুলোর জায়গায় নিজের config বসান।

## 8) Website publish
GitHub-এ repository তৈরি করে পুরো project upload করুন।
Settings → Pages → Deploy from a branch → main → /root → Save।

## 9) ব্যবহার
Public website:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/

Admin:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/login.html

প্রধান শিক্ষক email/password দিয়ে login করবেন।

## নিরাপত্তা
Firebase config browser-এ থাকা স্বাভাবিক; প্রকৃত নিরাপত্তা Authentication ও Firestore/Storage Security Rules দিয়ে করা হয়।
`admins/{UID}` document-এ active=true না থাকলে admin panel কাজ করবে না।
