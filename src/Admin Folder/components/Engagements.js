import React, { useEffect, useState } from "react";
import ReactStars from "react-rating-stars-component";
import cardIcon from "./card_icon.png";
import listIcon from "./list_icon.png";

import loader from "./logo/blue-loader.svg";
import { useNavigate } from "react-router-dom";
import mainlogo from "./logo/public-relation.png";
import Lottie from "lottie-react";
import MainLoading from "../../lottie-files-anim/loading-main.json";

const Engagements = () => {
  const [ratedPrograms, setRatedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards");
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchRatedPrograms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/engagements`);
        const data = await response.json();
        setRatedPrograms(data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchRatedPrograms();
  }, []);

  const handleCardClick = (programId) => {
    navigate(`/admin/engagements/program-ratings/${programId}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 mb-6">
            <Lottie animationData={MainLoading} loop={true} />
          </div>
          <p className="text-gray-600">
            The developers are smashing the keyboard very fast!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="engagements-container">
      <div className="engagements-header">
        <div className="title-bar">
          <img
            src={mainlogo}
            alt="Registrants Logo"
            className="title-bar-logo"
          />
          <h2>Feedback & Ratings</h2>
        </div>
        <div className="view-toggle">
          <button onClick={() => setViewMode("cards")}>
            <img src={cardIcon} alt="Cards View" /> Cards
          </button>
          <button onClick={() => setViewMode("list")}>
            <img src={listIcon} alt="List View" /> List
          </button>
        </div>
      </div>

      <div className={`programs-content ${viewMode}`}>
        {viewMode === "cards" ? (
          <div className="cards-view">
            {ratedPrograms.map((program) => (
              <div
                className="program-card"
                key={program.id}
                onClick={() => handleCardClick(program.id)}
              >
                <img
                  src={program.thumbnail}
                  alt={program.program_title}
                  className="program-thumbnail"
                />
                <div className="program-info">
                  <h4>{program.program_title}</h4>
                  <p>
                    <b>Type:</b> {program.type}
                  </p>
                  <p>
                    <b>Trainer:</b> {program.trainer_assigned}
                  </p>

                  <div className="rating-with-count">
                    <ReactStars
                      count={5}
                      value={program.averageRating}
                      size={24}
                      edit={false}
                      activeColor="#ffd700"
                      isHalf={true}
                    />
                    <span>({program.ratingCount})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="list-view">
            {ratedPrograms.map((program) => (
              <li
                className="program-list-item"
                key={program.id}
                onClick={() => handleCardClick(program.id)}
              >
                <h4>{program.program_title}</h4>
                <p>
                  <b>Type:</b> {program.type}
                </p>
                <p>
                  <b>Trainer:</b> {program.trainer_assigned}
                </p>

                <div className="rating-with-count">
                  <ReactStars
                    count={5}
                    value={program.averageRating}
                    size={20}
                    edit={false}
                    activeColor="#ffd700"
                    isHalf={true}
                  />
                  <span>({program.ratingCount})</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Engagements;
