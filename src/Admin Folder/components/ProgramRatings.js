import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import ReactStars from "react-rating-stars-component";
import loader from "./logo/blue-loader.svg";
import noItem from "./logo/no_items.png";
import FeedbackWordCloud from "./charts/FeedbackWordcloud";

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

  const [stopWords, setStopWords] = useState(new Set());

  useEffect(() => {
    const fetchStopWords = async () => {
      const [en, tl] = await Promise.all([
        fetch(
          "https://raw.githubusercontent.com/stopwords-iso/stopwords-en/master/stopwords-en.json"
        ).then((res) => res.json()),
        fetch(
          "https://raw.githubusercontent.com/stopwords-iso/stopwords-tl/master/stopwords-tl.json"
        ).then((res) => res.json()),
      ]);
      setStopWords(new Set([...en, ...tl]));
    };

    fetchStopWords();
  }, []);

  const filteredRatings = ratings.filter(
    (rating) => rating.feedback?.trim() !== ""
  );

  const feedbackWords = {};
  filteredRatings.forEach((rating) => {
    const words = rating.feedback
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word && !stopWords.has(word));

    words.forEach((word) => {
      feedbackWords[word] = (feedbackWords[word] || 0) + 1;
    });
  });

  const wordCloudData = Object.entries(feedbackWords).map(([text, value]) => ({
    text,
    value,
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-black">
        <img src={loader} alt="Loading..." className="w-16 mb-4" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!programDetails) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-red-500 font-semibold">Program not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Program Header */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden md:flex">
        <img
          src={programDetails.thumbnail}
          alt={programDetails.program_title}
          className="w-full md:w-1/3 h-64 object-cover"
        />
        <div className="p-6 flex-1">
          <h1 className="text-2xl font-bold mb-2">
            {programDetails.program_title}
          </h1>
          <p className="text-gray-700 mb-1">
            <strong>Trainer:</strong> {programDetails.trainer_assigned}
          </p>
          <p className="text-gray-700 mb-1">
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
          <p className="text-gray-700">
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

      {/* Rating Summary */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ratings Summary</h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Trainer Rating</p>
            <ReactStars
              count={5}
              value={averageRatings.trainerAverage}
              size={28}
              edit={false}
              activeColor="#facc15"
            />
          </div>
          <div>
            <p className="font-medium">Program Rating</p>
            <ReactStars
              count={5}
              value={averageRatings.programAverage}
              size={28}
              edit={false}
              activeColor="#facc15"
            />
          </div>
          <div>
            <p className="font-medium">Overall Rating</p>
            <ReactStars
              count={5}
              value={averageRatings.overallAverage}
              size={28}
              edit={false}
              activeColor="#facc15"
            />
          </div>
        </div>
      </div>
      {/* Feedback Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Feedback</h2>

        {wordCloudData.length > 0 ? (
          <div style={{ width: "100%", height: "400px" }}>
            <FeedbackWordCloud words={wordCloudData} />
          </div>
        ) : (
          <p className="text-gray-500">
            Not enough data to generate a word cloud.
          </p>
        )}
        {filteredRatings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-gray-100 p-4 rounded-lg shadow-sm"
              >
                <p className="text-gray-800">
                  <span className="font-semibold">{rating.username}:</span>{" "}
                  {rating.feedback}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center mt-6">
            <img src={noItem} alt="No entries" className="w-40 mx-auto mb-2" />
            <p className="text-gray-500">No feedbacks found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramRatings;
