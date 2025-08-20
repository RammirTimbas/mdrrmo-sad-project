importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDvAJKaGgiBChkxJoTsLU4hQMY8KTK5EYw",
  authDomain: "mdrrmo---tpms.firebaseapp.com",
  projectId: "mdrrmo---tpms",
  storageBucket: "mdrrmo---tpms.appspot.com",
  messagingSenderId: "229066431258",
  appId: "1:229066431258:web:862e16632a3d2999d6eaa3",
  measurementId: "G-E9653FHLLB",
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches, if necessary
  event.waitUntil(clients.claim());
});


const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] 📦 Background notification:', payload);

  const { title, body } = payload.notification || payload.data || {};
  const notificationTitle = title || "New Notification";
  const notificationOptions = {
    body: body || "You have a new message.",
    icon: '/logo192.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 
