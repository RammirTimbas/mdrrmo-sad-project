import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "./firebase/firebase";

// Use the already initialized messaging
const messaging = getMessaging(app);

export const requestPermission = async (userId) => {
  try {
    // Get the FCM token
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FCM_VAPID_KEY, // Make sure VAPID key is correct
    });

    if (currentToken) {
      console.log("🚀 Generated FCM token:", currentToken);

      // Save the token in Firestore under the user's document
      const userRef = doc(db, "Users", userId); // Reference the specific user document
      await updateDoc(userRef, {
        fcmToken: currentToken,
      });

      console.log("✅ FCM token saved successfully");
    } else {
      console.log("❌ No token available. Request permission again.");
    }
  } catch (error) {
    console.error("⚠️ Error requesting permission:", error);
  }
};

// Foreground notification handler
onMessage(messaging, (payload) => {
  console.log("📬 Foreground notification received:", payload);

  const { title, body } = payload.notification || payload.data;

  // Show a custom notification (native browser notification)
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: '/logo192.png',
    });
  } else {
    console.log("Notification permission not granted.");
  }
});

// Optionally, set up a listener that can be unsubscribed
export const onMessageListener = (callback) => {
  // Set up the foreground message listener
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log("📥 Foreground message received: ", payload);

    // Display the notification if needed (optional)
    if (Notification.permission === "granted") {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/logo192.png',
      });
    }

    // Call the callback with the payload (to handle the notification in the app)
    callback(payload);
  });

  // Return the unsubscribe function to clean up the listener when needed
  return unsubscribe;
};

export default messaging;
