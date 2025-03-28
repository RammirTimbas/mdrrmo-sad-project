import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

/**
 * Add a notification to Firestore.
 *
 * @param {string} title - The notification title.
 * @param {string} message - The notification message.
 * @param {string | string[] | null} userIds - The user ID(s) to notify. Pass `null` to notify all users.
 * @param {object} [extraData={}] - Optional extra data like actions.
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
          ...extraData, // Add any extra data like actions
        })
      );
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
    }

    await Promise.all(notificationPromises);
    console.log("Notification(s) added successfully!");
  } catch (error) {
    console.error("Error adding notification:", error);
  }
};
