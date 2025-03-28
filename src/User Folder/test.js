import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import cardIcon from "./card_icon.png";
import listIcon from "./list_icon.png";
import { useNavigate } from "react-router-dom";
import RatingForm from "./RatingForm";
import loader from "./blue-loader.svg";
import noItem from "./no_items.png";

const History = ({ userId }) => {
  const [appliedPrograms, setAppliedPrograms] = useState([]);
  const [completedPrograms, setCompletedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards");
  const navigate = useNavigate();

  const [showOverlay, setShowOverlay] = useState(false);
  const [currentProgramId, setCurrentProgramId] = useState(null);

  useEffect(() => {
    const fetchUserPrograms = async () => {
      try {
        const historyQuery = query(
          collection(db, "User History"),
          where("user_id", "==", userId)
        );
        const historySnapshot = await getDocs(historyQuery);

        const programsData = await Promise.all(
          historySnapshot.docs.map(async (docSnapshot) => {
            const programData = docSnapshot.data();
            const programRef = doc(
              db,
              "Training Programs",
              programData.program_id
            );
            const programSnapshot = await getDoc(programRef);

            if (programSnapshot.exists()) {
              return {
                id: programData.program_id,
                ...programData,
                ...programSnapshot.data(),
              };
            }
            return { id: programData.program_id, ...programData };
          })
        );

        const currentDate = new Date();
        const applied = [];
        const completed = [];

        programsData.forEach((program) => {
          const startDate = new Date(program.start_date * 1000);
          const endDate = new Date(program.end_date * 1000);

          if (endDate < currentDate) {
            completed.push(program);
          } else {
            applied.push(program);
          }
        });

        setAppliedPrograms(applied);
        setCompletedPrograms(completed);
      } catch (error) {
        console.error("Error fetching user programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPrograms();
  }, [userId]);

  const handleCardClick = (program) => {
    navigate(`/user/training-programs/${program.id}`, { state: { program } });
  };

  const handleRateClick = (event, programId) => {
    event.stopPropagation();
    setCurrentProgramId(programId);
    setShowOverlay(true);
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setCurrentProgramId(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <img src={loader} alt="Loading..." className="svg-loader" />
        <p className="loading-text" style={{ color: "black" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Training Programs</h2>
      </div>

      <h3>Applied Programs</h3>
      {appliedPrograms.length ? (
        <div className={`programs-content ${viewMode}-history`}>
          {viewMode === "cards" ? (
            <div className="cards-view-history">
              {appliedPrograms.map((program) => (
                <div
                  className="program-card-history"
                  key={program.id}
                  onClick={() => handleCardClick(program)}
                >
                  <img
                    src={program.thumbnail || "https://via.placeholder.com/100"}
                    alt={program.program_title}
                    className="program-thumbnail-history"
                  />
                  <div className="program-info-history">
                    <h4>{program.program_title}</h4>
                    <p>
                      <b>Application Status:</b> {program.status}
                    </p>
                    <p>
                      <b>Start:</b>{" "}
                      {new Date(program.start_date * 1000).toLocaleDateString()}
                    </p>
                    <p>
                      <b>Trainer:</b> {program.trainer_assigned}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-view-history">
              {appliedPrograms.map((program) => (
                <li
                  className="program-list-item-history"
                  key={program.id}
                  onClick={() => handleCardClick(program)}
                >
                  <h4>{program.program_title}</h4>
                  <p>
                    <b>Application Status:</b> {program.status}
                  </p>
                  <p>
                    <b>Start:</b>{" "}
                    {new Date(program.start_date * 1000).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="no-entries-history">
          <img
            src={noItem}
            alt="No entries"
            className="no-entries-image-history"
          />
          <p>No active applications yet.</p>
        </div>
      )}

      <h3>Completed Programs</h3>
      {completedPrograms.length ? (
        <div className={`programs-content ${viewMode}-history`}>
          {viewMode === "cards" ? (
            <div className="cards-view-history">
              {completedPrograms.map((program) => (
                <div
                  className="program-card-history"
                  key={program.id}
                  onClick={() => handleCardClick(program)}
                >
                  <img
                    src={program.thumbnail || "https://via.placeholder.com/100"}
                    alt={program.program_title}
                    className="program-thumbnail-history"
                  />
                  <div className="program-info-history-completed">
                    <h4>{program.program_title}</h4>
                    <p>
                      <b>Application Status:</b> Completed
                    </p>
                    <p>
                      <b>Start:</b>{" "}
                      {new Date(program.start_date * 1000).toLocaleDateString()}
                    </p>
                    <p>
                      <b>End:</b>{" "}
                      {new Date(program.end_date * 1000).toLocaleDateString()}
                    </p>
                  <button className="rate-button-history"
                    onClick={(event) => handleRateClick(event, program.id)}
                  >
                    Rate
                  </button>
                  
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-view-history">
              {completedPrograms.map((program) => (
                <li
                  className="program-list-item-history"
                  key={program.id}
                  onClick={() => handleCardClick(program)}
                >
                  <h4>{program.program_title}</h4>
                  <p>
                    <b>Application Status:</b> Completed
                  </p>
                  <p>
                    <b>Start:</b>{" "}
                    {new Date(program.start_date * 1000).toLocaleDateString()}
                  </p>
                  <p>
                    <b>End:</b>{" "}
                    {new Date(program.end_date * 1000).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(event) => handleRateClick(event, program.id)}
                  >
                    Rate This Program
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="no-entries-history">
          <img
            src={noItem}
            alt="No entries"
            className="no-entries-image-history"
          />
          <p>No completed applications found.</p>
        </div>
      )}

      {showOverlay && (
        <div className="overlay-rating-form-history">
          <div className="overlay-content-history">
            <button
              className="close-button-history"
              onClick={handleCloseOverlay}
            >
              X
            </button>
            <RatingForm
              programId={currentProgramId}
              userId={userId}
              onClose={handleCloseOverlay}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
