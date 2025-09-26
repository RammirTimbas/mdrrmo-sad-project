// Utility: Add a program to User History for a user (for join/invite flows)
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

export async function addProgramToUserHistory({ userId, programId, programData }) {
  // Fetch user details
  const userQuery = query(
    collection(db, "User Informations"),
    where("user_ID", "==", userId)
  );
  const userSnapshot = await getDocs(userQuery);
  if (userSnapshot.empty) throw new Error("User details not found.");
  const userData = userSnapshot.docs[0].data();

  // Generate unique application ID
  const applicationId = `${userId}_${programId}`;

  // Add to approved_applicants (if not already present)
  await updateDoc(doc(db, "Training Programs", programId), {
    [`approved_applicants.${applicationId}`]: {
      application_id: applicationId,
      full_name: userData.full_name,
      status: "approved",
      user_id: userId,
    },
  });

  // Add to User History
  await setDoc(doc(db, "User History", applicationId), {
    application_date: serverTimestamp(),
    application_id: applicationId,
    end_date: programData.end_date,
    program_id: programId,
    program_title: programData.program_title,
    start_date: programData.start_date,
    status: "approved",
    user_id: userId,
  });
}