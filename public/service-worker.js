self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open("app-cache").then((cache) => {
      return cache.addAll([
        "/", // Cache the root path
        "/index.html",
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png",
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated!");
});

// public/service-worker.js

self.addEventListener("push", function (event) {
  const payload = event.data.json();
  const title = payload.notification.title;
  const body = payload.notification.body;

  const options = {
    body: body,
    icon: "images/notification-icon.png", 
    badge: "images/notification-badge.png", 
  };

  // Show the notification
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  // Optional: Open a URL when the notification is clicked
  event.waitUntil(clients.openWindow(process.env.REACT_APP_BACKEND_URL));
});
