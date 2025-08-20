import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import axios from "axios";

/**
 * Send a push notification to a single user.
 *
 * @param {string} title - notification title.
 * @param {string} body - notification body.
 * @param {string} userId - user id to send the notification to.
 */
const sendPushNotificationToUser = async (title, body, userId) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;  
  try {
    const response = await axios.post(`${backendUrl}/send-notification`, {
      userId,
      title,
      body,
    });
    console.log('Push notification sent to user successfully:', response.data);
  } catch (error) {
    console.error('Error sending push notification to user:', error);
  }
};

/**
 * Send a push notification to all users.
 *
 * @param {string} title - notification title.
 * @param {string} body - notification body.
 */
const sendPushNotificationToAll = async (title, body) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;  
  try {
    const response = await axios.post(`${backendUrl}/send-notification-to-all`, {
      title,
      body,
    });
    console.log('Push notification sent to all users successfully:', response.data);
  } catch (error) {
    console.error('Error sending push notification to all users:', error);
  }
};

/**
 * Add a notification to Firestore.
 *
 * @param {string} title - notification title.
 * @param {string} message - notification message.
 * @param {string | string[] | null} userIds - user id(s) to notify. Specify a specific user, an array of users, or null to notify all.
 * @param {object} [extraData={}] - further actions.
 */
export const addNotification = async (title, message, userIds = null, extraData = {}) => {
  try {
    const notificationsCollection = collection(db, "notifications");
    
    let notificationPromises = [];

    if (!userIds) {
      // Notify all users
      const usersCollection = collection(db, "Users");
      const usersSnapshot = await getDocs(usersCollection);
      const allUserIds = usersSnapshot.docs.map((doc) => doc.id);

      notificationPromises = allUserIds.map((uid) =>
        addDoc(notificationsCollection, {
          user_id: uid,
          title,
          message,
          timestamp: serverTimestamp(),
          is_read: false,
          ...extraData,
        })
      );

      // Send push notification to all users
      sendPushNotificationToAll(title, message);
    } else if (Array.isArray(userIds)) {
      // Notify multiple users
      notificationPromises = userIds.map((uid) =>
        addDoc(notificationsCollection, {
          user_id: uid,
          title,
          message,
          timestamp: serverTimestamp(),
          is_read: false,
          ...extraData,
        })
      );

      // Send push notifications to each specified user
      userIds.forEach(userId => {
        sendPushNotificationToUser(title, message, userId);
      });
    } else {
      // Notify a single user
      notificationPromises.push(
        addDoc(notificationsCollection, {
          user_id: userIds,
          title,
          message,
          timestamp: serverTimestamp(),
          is_read: false,
          ...extraData,
        })
      );

      // Send push notification to the single user
      sendPushNotificationToUser(title, message, userIds);
    }

    await Promise.all(notificationPromises);
    console.log("Notification(s) added successfully!");
  } catch (error) {
    console.error("Error adding notification:", error);
  }
};
