import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { FaTimes } from "react-icons/fa";
import { addNotification } from "../helpers/addNotification";

export default function InviteParModal({ onClose, programId, requestorId }) {
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [requestorName, setRequestorName] = useState("");
  const [programTitle, setProgramTitle] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "Users"));
        const userList = usersSnapshot.docs.map((doc) => doc.data().email);
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchRequestorName = async () => {
      try {
        const userRef = collection(db, "User Informations");
        const userSnapshot = await getDocs(userRef);
        const user = userSnapshot.docs.find((doc) => doc.data().user_ID === requestorId);

        if (user) {
          setRequestorName(user.data().full_name);
        }
      } catch (error) {
        console.error("Error fetching requestor name:", error);
      }
    };

    const fetchProgramTitle = async () => {
      try {
        const programRef = doc(db, "Training Programs", programId);
        const programSnapshot = await getDoc(programRef);

        if (programSnapshot.exists()) {
          setProgramTitle(programSnapshot.data().program_title);
        }
      } catch (error) {
        console.error("Error fetching program title:", error);
      }
    };

    fetchUsers();
    fetchRequestorName();
    fetchProgramTitle();
  }, [requestorId, programId]);

  // ✅ Auto-suggest based on input (limit to 3 results)
  useEffect(() => {
    if (email.trim() === "") {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      users
        .filter((userEmail) =>
          userEmail.toLowerCase().includes(email.toLowerCase())
        )
        .slice(0, 3) // Show only the first 3 matches
    );
  }, [email, users]);

  // ✅ Add email to selected list only if it exists in suggestions
  const handleAddEmail = (selectedEmail) => {
    if (selectedEmail && !selectedEmails.includes(selectedEmail)) {
      setSelectedEmails([...selectedEmails, selectedEmail]);
    }
    setEmail("");
    setSuggestions([]);
  };

  // ✅ Remove email from selected list
  const handleRemoveEmail = (emailToRemove) => {
    setSelectedEmails(selectedEmails.filter((e) => e !== emailToRemove));
  };

  // ✅ Handle form submission (send all invites)
  const handleInviteSubmit = async () => {
    if (selectedEmails.length === 0) {
      alert("Please enter at least one email to invite.");
      return;
    }
  
    try {
      const invitesCollection = collection(db, "Training Invites");
      const usersCollection = collection(db, "Users");
  
      // Fetch user IDs for selected emails
      const usersSnapshot = await getDocs(usersCollection);
      const userMap = new Map();
  
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (selectedEmails.includes(userData.email)) {
          userMap.set(userData.email, doc.id); // Map email -> user ID
        }
      });
  
      // Send all invites in one go
      await Promise.all(
        selectedEmails.map(async (email) => {
          const userId = userMap.get(email);
  
          if (!userId) {
            console.warn(`User ID not found for email: ${email}`);
            return;
          }
  
          await addDoc(invitesCollection, {
            programId,
            userId, // Store user ID instead of email
            email,
            status: "pending",
            requestorId,
          });
  
          // Send notification to the invited user
          await addNotification(
            "Training Invitation",
            `${requestorName} has invited you to join "${programTitle}".`,
            userId, // Send notification to user ID
            {
              type: "invite",
              actions: ["Accept", "Reject"],
              programId
            }
          );
        })
      );
  
      alert("Invitations sent successfully!");
      setSelectedEmails([]); // Clear after sending
      onClose(); // Close modal after inviting
    } catch (error) {
      console.error("Error sending invites:", error);
      alert("Failed to send invitations.");
    }
  };
  
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Invite Participants</h2>
          <FaTimes
            className="text-gray-600 cursor-pointer hover:text-red-600"
            onClick={onClose}
          />
        </div>

        {/* Email Input */}
        <div className="relative">
          <input
            type="email"
            placeholder="Type to search..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          {/* Auto-suggestions */}
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 mt-2 bg-gray-100 border border-gray-300 rounded-md z-10">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-blue-100 cursor-pointer"
                  onClick={() => handleAddEmail(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected Emails List with Scrollable Overflow */}
        {selectedEmails.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            {selectedEmails.map((email, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-200 px-3 py-1 rounded-md text-sm mb-2"
              >
                {email}
                <FaTimes
                  className="ml-2 cursor-pointer text-red-600"
                  onClick={() => handleRemoveEmail(email)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Invite Button */}
        <button
          onClick={handleInviteSubmit}
          className="mt-4 w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
        >
          Send Invites
        </button>
      </div>
    </div>
  );
}
