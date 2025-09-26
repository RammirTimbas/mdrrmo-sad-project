import React, { useState, useEffect } from "react";
import { db } from "./firebase"; // Import Firestore
import { collection, getDocs } from "firebase/firestore";
import { formatProgramDates } from "../utils/formatDates.js";
import Calendar from "../utils/Calendar.js";

const EventOverview = () => {
  const [programs, setPrograms] = useState([]);

  // Fetching programs from Firestore
  useEffect(() => {
    const fetchPrograms = async () => {
      const programsSnapshot = await getDocs(
        collection(db, "Training Programs")
      );
      const programsList = programsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPrograms(programsList);
    };
    fetchPrograms();
  }, []);

  return (
    <div className="overflow-x-auto">
      <Calendar programs={programs} />
    </div>
  );
};

export default EventOverview;
