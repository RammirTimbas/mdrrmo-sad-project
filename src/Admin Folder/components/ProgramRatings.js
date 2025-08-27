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
        const programDoc = await getDoc(doc(db, "Training Programs", programId));
        if (programDoc.exists()) {
          const programData = programDoc.data();
          setProgramDetails(programData);

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
    <div className="max-w-7xl mx-auto p-8 space-y-10">
      {/* Top Section: Details & Ratings side by side */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Program Details */}
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <img
            src={programDetails.thumbnail}
            alt={programDetails.program_title}
            className="w-full h-60 object-cover"
          />
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              {programDetails.program_title}
            </h1>
            <p className="text-gray-700 mb-2">
              <strong className="text-gray-900">Trainer:</strong>{" "}
              {Array.isArray(programDetails.trainer_assigned)
                ? programDetails.trainer_assigned.join(", ")
                : programDetails.trainer_assigned}
            </p>

            {/* ✅ Handle specific dates or range */}
            {programDetails.dateMode === "specific" &&
              Array.isArray(programDetails.selected_dates) ? (
              <p className="text-gray-700 mb-2">
                <strong className="text-gray-900">Dates:</strong>{" "}
                {programDetails.selected_dates
                  .map((d) => {
                    const ts =
                      d?._seconds ??
                      d?.seconds ??
                      (typeof d === "number" ? d : null);
                    return ts
                      ? new Date(ts * 1000).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                      : "Invalid date";
                  })
                  .join(", ")}
              </p>
            ) : (
              <>
                <p className="text-gray-700 mb-2">
                  <strong className="text-gray-900">Start Date:</strong>{" "}
                  {new Date(
                    programDetails.start_date * 1000
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">End Date:</strong>{" "}
                  {new Date(
                    programDetails.end_date * 1000
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Ratings Summary */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">
            ⭐ Ratings Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="font-medium text-gray-600 mb-2">Trainer</p>
              <ReactStars
                count={5}
                value={averageRatings.trainerAverage}
                size={34}
                edit={false}
                activeColor="#facc15" // yellow-400
              />
              <p className="text-sm mt-2 text-gray-500">
                {averageRatings.trainerAverage.toFixed(1)} / 5
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-2">Program</p>
              <ReactStars
                count={5}
                value={averageRatings.programAverage}
                size={34}
                edit={false}
                activeColor="#facc15"
              />
              <p className="text-sm mt-2 text-gray-500">
                {averageRatings.programAverage.toFixed(1)} / 5
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-2">Overall</p>
              <ReactStars
                count={5}
                value={averageRatings.overallAverage}
                size={34}
                edit={false}
                activeColor="#facc15"
              />
              <p className="text-sm mt-2 text-gray-500">
                {averageRatings.overallAverage.toFixed(1)} / 5
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Feedback Section */}
      <div className="bg-white p-8 rounded-2xl shadow-md">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">💬 Feedback</h2>

        {wordCloudData.length > 0 ? (
          <div className="w-full h-72 mb-8">
            <FeedbackWordCloud words={wordCloudData} />
          </div>
        ) : (
          <p className="text-gray-500 mb-8">
            Not enough data to generate a word cloud.
          </p>
        )}

        {filteredRatings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <p className="text-gray-800 leading-relaxed">
                  <span className="font-semibold text-indigo-600">
                    {rating.username}:
                  </span>{" "}
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
