import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase/firebase";
import Swal from "sweetalert2";

const TrainerDashboard = ({ userId }) => {
  const [trainerName, setTrainerName] = useState("");
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredPrograms, setFilteredPrograms] = useState({
    today: [],
    week: [],
    month: [],
    all: [],
    past: [],
  });

  const formatDate = (timestamp) =>
    new Date(timestamp * 1000).toLocaleDateString();

  const categorizePrograms = () => {
    const now = Math.floor(Date.now() / 1000);
    const today = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const startOfWeek = Math.floor(
      new Date(
        new Date().setDate(new Date().getDate() - new Date().getDay())
      ).setHours(0, 0, 0, 0) / 1000
    );
    const endOfWeek = startOfWeek + 6 * 86400;
    const startOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).setHours(
        0,
        0,
        0,
        0
      ) / 1000
    );
    const endOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).setHours(
        23,
        59,
        59,
        999
      ) / 1000
    );

    const todayPrograms = [];
    const weekPrograms = [];
    const monthPrograms = [];
    const allPrograms = [];
    const pastPrograms = [];

    trainingPrograms.forEach((program) => {
      const startDate = program.start_date;
      const endDate = program.end_date;

      if (startDate <= now && endDate >= today) {
        todayPrograms.push(program);
      } else if (startDate >= startOfWeek && startDate <= endOfWeek) {
        weekPrograms.push(program);
      } else if (startDate >= startOfMonth && startDate <= endOfMonth) {
        monthPrograms.push(program);
      } else if (endDate < today) {
        pastPrograms.push(program);
      } else {
        allPrograms.push(program);
      }
    });

    setFilteredPrograms({
      today: todayPrograms,
      week: weekPrograms,
      month: monthPrograms,
      all: allPrograms,
      past: pastPrograms,
    });
  };

  useEffect(() => {
    const fetchTrainerName = async () => {
      try {
        const trainerDocRef = doc(db, "Trainer Name", userId);
        const trainerDoc = await getDoc(trainerDocRef);
        if (trainerDoc.exists()) {
          setTrainerName(trainerDoc.data().trainer_name);
        }
      } catch (error) {
        console.error("Error fetching trainer name:", error);
      }
    };
    fetchTrainerName();
  }, [userId]);

  useEffect(() => {
    const fetchTrainingPrograms = async () => {
      if (!trainerName) return;
      setLoading(true);
      try {
        const programsRef = collection(db, "Training Programs");
        const q = query(programsRef);
        const querySnapshot = await getDocs(q);

        const programsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filteredPrograms = programsData.filter((program) => {
          const trainers = program.trainer_assigned;
          const isTrainerAssigned = Array.isArray(trainers)
            ? trainers.includes(trainerName)
            : trainers === trainerName;

          const now = Math.floor(Date.now() / 1000);
          const isOngoing =
            program.start_date <= now && now <= program.end_date + 86399;

          const isUpcoming = program.end_date >= now;

          return isTrainerAssigned && (isOngoing || isUpcoming);
        });

        setTrainingPrograms(filteredPrograms);
      } catch (error) {
        console.error("Error fetching training programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainingPrograms();
  }, [trainerName]);

  useEffect(() => {
    if (trainingPrograms.length > 0) {
      categorizePrograms();
    }
  }, [trainingPrograms]);

  return (
    <div className="TrainerDashboard">
      <div className="content">
        <h2 className="section-title">Welcome, {trainerName}!</h2>
        {Object.keys(filteredPrograms).map((category) => (
          <div key={category}>
            <h3 className="category-title">
              {category.toUpperCase()} Programs
            </h3>
            <div className="card-container-trainer">
              {filteredPrograms[category].length > 0 ? (
                filteredPrograms[category].map((program) => (
                  <div key={program.id} className="training-card">
                    <NavLink
                      to={`/trainer/training-program-view/${program.id}`}
                      state={{ program }}
                      className="card-link"
                    >
                      <img
                        src={program.thumbnail}
                        alt={program.program_title}
                        className="thumbnail"
                      />
                      <div className="card-content">
                        <h3>{program.program_title}</h3>
                        <p>{program.description}</p>
                        <p>
                          <strong>Start:</strong>{" "}
                          {formatDate(program.start_date)} |
                          <strong> End:</strong> {formatDate(program.end_date)}
                        </p>
                      </div>
                    </NavLink>
                  </div>
                ))
              ) : (
                <p>No programs found in this category.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainerDashboard;
