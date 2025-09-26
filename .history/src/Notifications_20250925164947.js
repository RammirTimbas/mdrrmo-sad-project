import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { FaTrash } from "react-icons/fa";
import { addNotification } from "./helpers/addNotification";
import { runTransaction } from "firebase/firestore";


const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      const q = query(
        collection(db, "notifications"),
        where("user_id", "==", userId),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const notificationData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(notificationData);
    };

    fetchNotifications();
  }, [userId]);

  // Mark a single notification as read
  const markAsRead = async (id) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { is_read: true });
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    for (const notification of unreadNotifications) {
      const notifRef = doc(db, "notifications", notification.id);
      await updateDoc(notifRef, { is_read: true });
    }
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true }))
    );
  };

  // Toggle selection for deletion
  const toggleSelect = (id) => {
    setSelectedNotifications((prev) =>
      prev.includes(id)
        ? prev.filter((notifId) => notifId !== id)
        : [...prev, id]
    );
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    for (const id of selectedNotifications) {
      const notifRef = doc(db, "notifications", id);
      await deleteDoc(notifRef);
    }
    setNotifications((prev) =>
      prev.filter((notif) => !selectedNotifications.includes(notif.id))
    );
    setSelectedNotifications([]);
  };

  const handleInviteResponse = async (notificationId, programId, response) => {
    try {
      const confirmResult = await Swal.fire({
        title: `Are you sure you want to ${
          response === "Accept" ? "accept" : "reject"
        } this invitation?`,
        icon: response === "Accept" ? "success" : "warning",
        showCancelButton: true,
        confirmButtonText: `Yes, ${response}`,
        cancelButtonText: "Cancel",
      });

      if (!confirmResult.isConfirmed) {
        return; // If user cancels, stop the function here
      }

      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, { status: response, is_read: true });

      // Fetch logged-in user details
      const userQuery = query(
        collection(db, "User Informations"),
        where("user_ID", "==", userId)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        console.error("User not found in User Informations collection.");
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Fetch the invite to get requestorId
      const inviteQuery = query(
        collection(db, "Training Invites"),
        where("programId", "==", programId),
        where("userId", "==", userId)
      );
      const inviteSnapshot = await getDocs(inviteQuery);

      if (inviteSnapshot.empty) {
        console.error("Invite not found for this user and program.");
        return;
      }

      const inviteData = inviteSnapshot.docs[0].data();
      const requestorId = inviteData.requestorId;

      // Fetch program details
      const programRef = doc(db, "Training Programs", programId);
      const programSnapshot = await getDoc(programRef);

      if (!programSnapshot.exists()) {
        console.error("Program not found.");
        return;
      }

      const programData = programSnapshot.data();
      const availableSlots = programData.slots || 0;

      // No slots available
      if (availableSlots <= 0) {
        Swal.fire(
          "No Slots Available",
          "Sorry, there are no slots left for this program.",
          "error"
        );
        await deleteDoc(notifRef);
        return;
      }

      // If accepted
      if (response === "Accept") {
        const applicantData = {
          [`${userId}_${programId}`]: {
            application_id: `${userId}_${programId}`,
            full_name: userData.full_name,
            status: "approved",
            user_id: userId,
          },
        };

        await updateDoc(programRef, {
          [`approved_applicants.${userId}_${programId}`]:
            applicantData[`${userId}_${programId}`],
          slots: availableSlots - 1,
        });

        Swal.fire(
          "Success!",
          "You have successfully joined the program.",
          "success"
        );

        await addNotification(
          "Invitation Response",
          `${userData.full_name} has accepted your training invitation for program ID: ${programId}.`,
          requestorId
        );
      } else {
        Swal.fire("Notice", "You have declined the invitation.", "info");
      }

      // Refresh notifications
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, status: response, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error("Error updating invitation response:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    console.log("Notification clicked:", notification);
    if (notification.action_link) {
      navigate(notification.action_link, {
        state: {
          program: notification.program_data || null,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-md flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <div className="flex space-x-4">
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
            >
              Mark All as Read
            </button>
          )}
          {selectedNotifications.length > 0 && (
            <button
              onClick={deleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
            >
              <FaTrash className="mr-2" /> Delete Selected
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 mb-2 bg-white shadow rounded-lg flex justify-between items-center border-l-4 ${
                notification.is_read ? "border-gray-300" : "border-blue-500"
              }`}
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  handleNotificationClick(notification);
                  markAsRead(notification.id);
                }}
              >
                <h3 className="text-md font-semibold">{notification.title}</h3>
                <p className="text-sm">{notification.message}</p>
                <span className="text-xs text-gray-500">
                  {notification.timestamp?.seconds
                    ? new Date(
                        notification.timestamp.seconds * 1000
                      ).toLocaleString()
                    : "Invalid Date"}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {notification.type === "invite" && !notification.is_read && (
                  <>
                    <button
                      onClick={() =>
                        handleInviteResponse(
                          notification.id,
                          notification.programId,
                          "Accept"
                        )
                      }
                      className="bg-green-100 text-green-600 hover:bg-green-50 border border-green-600 px-4 py-2 rounded transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleInviteResponse(
                          notification.id,
                          notification.programId,
                          "Reject"
                        )
                      }
                      className="bg-red-100 text-red-600 hover:bg-red-50 border border-red-600 px-4 py-2 rounded transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => toggleSelect(notification.id)}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No notifications</p>
        )}
      </div>
    </div>
  );
};

export default Notifications;
