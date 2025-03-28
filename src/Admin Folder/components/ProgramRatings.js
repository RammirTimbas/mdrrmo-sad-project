import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import ReactStars from "react-rating-stars-component";
import loader from "./logo/blue-loader.svg";

import noItem from "./logo/no_items.png";

const ProgramRatings = () => {
  const { programId } = useParams();
  const [programDetails, setProgramDetails] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRatings, setAverageRatings] = useState({
    trainerAverage: 0,
    programAverage: 0,
    overallAverage: 0,
  });

  useEffect(() => {
    const fetchProgramDetails = async () => {
      try {
        const programDoc = await getDoc(
          doc(db, "Training Programs", programId)
        );
        if (programDoc.exists()) {
          setProgramDetails(programDoc.data());

          const ratingsCollection = collection(
            db,
            `Training Programs/${programId}/ratings`
          );
          const ratingsSnapshot = await getDocs(ratingsCollection);

          const ratingsData = ratingsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setRatings(ratingsData);

          // Calculate average ratings
          if (ratingsData.length > 0) {
            const totalTrainerRating = ratingsData.reduce(
              (sum, r) => sum + r.trainerRating,
              0
            );
            const totalProgramRating = ratingsData.reduce(
              (sum, r) => sum + r.programRating,
              0
            );
            const totalOverallRating = totalTrainerRating + totalProgramRating;

            setAverageRatings({
              trainerAverage: totalTrainerRating / ratingsData.length,
              programAverage: totalProgramRating / ratingsData.length,
              overallAverage: totalOverallRating / (2 * ratingsData.length),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching program details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgramDetails();
  }, [programId]);

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

  if (!programDetails) {
    return (
      <div className="error-container-ratings-program">
        <p>Program not found.</p>
      </div>
    );
  }

  // Filter out feedbacks that are empty or blank
  const filteredRatings = ratings.filter(
    (rating) => rating.feedback.trim() !== ""
  );

  return (
    <div className="program-ratings-container-ratings-program">
      {/* Program Details Section */}
      <div className="program-details-ratings-program card-ratings-program">
        <div className="program-header-ratings-program">
          <img
            src={programDetails.thumbnail}
            alt={programDetails.program_title}
            className="program-thumbnail-ratings-program"
          />
          <div className="program-info-ratings-program">
            <h1 className="program-title-ratings-program">
              {programDetails.program_title}
            </h1>
            <p className="program-trainer-ratings-program">
              <strong>Trainer:</strong> {programDetails.trainer_assigned}
            </p>
            <p className="program-dates-ratings-program">
              <strong>Start Date:</strong>{" "}
              {new Date(programDetails.start_date * 1000).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </p>
            <p className="program-dates-ratings-program">
              <strong>End Date:</strong>{" "}
              {new Date(programDetails.end_date * 1000).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </p>
          </div>
        </div>

        <div className="rating-section-ratings-program">
          <div className="rating-item-ratings-program">
            <p className="rating-label-ratings-program">
              <strong>Trainer Average Rating:</strong>
            </p>
            <ReactStars
              count={5}
              value={averageRatings.trainerAverage}
              size={24}
              edit={false}
              activeColor="#ffd700"
            />
          </div>

          <div className="rating-item-ratings-program">
            <p className="rating-label-ratings-program">
              <strong>Program Average Rating:</strong>
            </p>
            <ReactStars
              count={5}
              value={averageRatings.programAverage}
              size={24}
              edit={false}
              activeColor="#ffd700"
            />
          </div>

          <div className="rating-item-ratings-program">
            <p className="rating-label-ratings-program">
              <strong>Overall Average Rating:</strong>
            </p>
            <ReactStars
              count={5}
              value={averageRatings.overallAverage}
              size={24}
              edit={false}
              activeColor="#ffd700"
            />
          </div>
        </div>
      </div>

      {/* Feedbacks Section */}
      <div className="feedbacks-container-ratings-program">
        <h2 className="feedbacks-title-ratings-program">Feedbacks</h2>
        <div className="feedback-cards-ratings-program">
          {filteredRatings.length > 0 ? (
            filteredRatings.map((rating) => (
              <div key={rating.id} className="feedback-card-ratings-program">
                <p className="feedback-text-ratings-program">
                  {rating.username}: {rating.feedback}
                </p>
              </div>
            ))
          ) : (
            <div className="no-entries">
              <img src={noItem} alt="No entries" className="no-entries-image" />
              <p>No feedbacks found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramRatings;
