import React, { useState, useEffect } from "react";
import ReactStars from "react-rating-stars-component";
import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import "./ratingForm.css";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const RatingForm = ({ programId, userId, onClose, onSubmit }) => {
  const [trainerRating, setTrainerRating] = useState(0);
  const [programRating, setProgramRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [existingRatingId, setExistingRatingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [ratingMessage, setRatingMessage] = useState("");

  // Animation styles
  const fadeIn = {
    animation: "fadeIn 0.5s ease-in-out",
  };

  const slideIn = {
    animation: "slideIn 0.5s ease-in-out",
  };

  // Define the keyframes in a style tag
  const keyframes = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  const [userName, setUserName] = useState("");
  const [hasFullAttendance, setHasFullAttendance] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState("");

  const [certificateStatus, setCertificateStatus] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState(null);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  useEffect(() => {
    const checkCertificateRequest = async () => {
      try {
        const certQuery = query(
          collection(db, "Certificates"),
          where("userId", "==", userId),
          where("programId", "==", programId.id)
        );

        const certSnapshot = await getDocs(certQuery);

        if (!certSnapshot.empty) {
          const certData = certSnapshot.docs[0].data();
          console.log("🔍 Fetched certificate request:", certData);

          if (certData.certificateUrl) {
            setCertificateStatus("approved");
            setCertificateUrl(certData.certificateUrl);
          } else {
            setCertificateStatus("pending");
          }
        } else {
          setCertificateStatus("not_requested");
        }
      } catch (error) {
        console.error("❌ Error fetching certificate request:", error);
      }
    };

    checkCertificateRequest();
  }, [userId, programId.id]);

  useEffect(() => {
    const fetchUserName = async () => {
      const raterRef = collection(db, "User Informations");
      const raterQuery = query(raterRef, where("user_ID", "==", userId));
      const queryraterSnapshot = await getDocs(raterQuery);
      try {
        if (!queryraterSnapshot.empty) {
          const raterName = queryraterSnapshot.docs[0].data();
          setUserName(raterName.full_name);
          console.log(raterName.full_name);
        } else {
          console.error("Error fetching username:");
        }
      } catch (error) {
        console.error("Error fetching username:");
      }
    };
    fetchUserName();
  }, userId);

  useEffect(() => {
    const fetchExistingRating = async () => {
      try {
        const ratingsRef = collection(
          db,
          "Training Programs",
          programId.id,
          "ratings"
        );
        const ratingsQuery = query(ratingsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(ratingsQuery);

        if (!querySnapshot.empty) {
          const ratingData = querySnapshot.docs[0].data();
          setTrainerRating(ratingData.trainerRating);
          setProgramRating(ratingData.programRating);
          setFeedback(ratingData.feedback);
          setExistingRatingId(querySnapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Error fetching existing rating:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRating();
  }, [programId.id, userId]);

  useEffect(() => {
    const checkAttendance = async () => {
      try {
        const programRef = doc(db, "Training Programs", programId.id);
        const programSnap = await getDoc(programRef);

        if (!programSnap.exists()) {
          console.error("❌ Program data not found");
          setHasFullAttendance(false);
          setAttendanceSummary("0/1");
          return;
        }

        const programData = programSnap.data();
        const applicants = programData.approved_applicants || {};

        let userAttendance = [];
        let totalSessions = 0;
        let attendedSessions = 0;

        // 🔹 Find User's Attendance Record
        Object.keys(applicants).forEach((applicantId) => {
          const applicant = applicants[applicantId];
          if (applicant.user_id === userId) {
            userAttendance = applicant.attendance || [];
          }
        });

        console.log(`🔍 Checking Attendance for: ${userId}`);
        console.log("📌 User Attendance Data:", userAttendance);

        // 🔹 Determine Total Training Sessions
        if (
          programData.selected_dates &&
          programData.selected_dates.length > 0
        ) {
          totalSessions = programData.selected_dates.length;
          console.log(`📅 Total Sessions (Selected Dates): ${totalSessions}`);
        } else if (programData.start_date && programData.end_date) {
          // Convert Unix timestamps to days
          const startDate = new Date(programData.start_date * 1000);
          const endDate = new Date(programData.end_date * 1000);

          // Calculate total number of days in the range
          totalSessions =
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include start_date

          console.log(`📅 Total Sessions (Date Range): ${totalSessions}`);
        } else {
          totalSessions = 1; // Default to 1 day if no other info exists
          console.log("⚠ No date range or selected dates, assuming 1 session.");
        }

        // 🔹 Count the Attended Sessions
        attendedSessions = userAttendance.filter(
          (entry) => entry.remark && entry.remark.toLowerCase() === "present"
        ).length;

        // If no attendance records, show 0/totalSessions (not 0/0)
        if (!userAttendance || userAttendance.length === 0) {
          console.warn("⚠ No attendance records found for user.");
          setHasFullAttendance(false);
          setAttendanceSummary(`0/${totalSessions}`);
          return;
        }

        console.log(
          `✅ Attended Sessions: ${attendedSessions}/${totalSessions}`
        );

        setHasFullAttendance(attendedSessions === totalSessions);
        setAttendanceSummary(`${attendedSessions}/${totalSessions}`);
      } catch (error) {
        console.error("❌ Error checking attendance:", error);
        setHasFullAttendance(false);
        setAttendanceSummary("0/0");
      }
    };

    checkAttendance();
  }, [programId.id, userId]);

  const requestCertificate = async () => {
    try {
      // Check attendance before proceeding
      if (!hasFullAttendance) {
        Swal.fire(
          "Attendance Required",
          `You must have 100% attendance to request a certificate.\nYou attended ${attendanceSummary.split("/")[0]} out of ${attendanceSummary.split("/")[1]} days.`,
          "error"
        );
        return;
      }

      // 🔹 Check Firestore for existing certificate request
      const certQuery = query(
        collection(db, "Certificates"),
        where("userId", "==", userId),
        where("programId", "==", programId.id)
      );
      const certSnapshot = await getDocs(certQuery);

      if (!certSnapshot.empty) {
        const certData = certSnapshot.docs[0].data();
        console.log("🔍 Certificate Request Found:", certData);

        if (certData.status === "approved" && certData.certificateUrl) {
          onSubmit();
          // ✅ If already approved, download immediately
          window.open(certData.certificateUrl, "_blank");

          return;
        } else if (certData.status === "rejected") {
          Swal.fire(
            "Notice",
            "Your request have been rejected.  Please visit the office for more details",
            "info"
          );
          return;
        } else {
          // 🔸 If still pending, show info message
          Swal.fire(
            "Already Requested",
            "Your request is being processed.",
            "info"
          );
          return;
        }
      }

      // 🔹 Fetch Approved Applicants
      const programRef = doc(db, "Training Programs", programId.id);
      const programSnap = await getDoc(programRef);

      if (!programSnap.exists()) {
        console.error("❌ Program data not found");
        return;
      }

      const programData = programSnap.data();
      const applicants = programData.approved_applicants || {};

      // 🔹 Sort applicants alphabetically
      const sortedApplicants = Object.values(applicants)
        .filter((applicant) => applicant.status === "approved")
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      // 🔹 Find User's Index (1-based)
      const userIndex =
        sortedApplicants.findIndex(
          (applicant) => applicant.user_id === userId
        ) + 1;

      if (userIndex === 0) {
        console.error("❌ User not found in approved applicants");
        return;
      }

      // 🔹 Ensure userName and program type are valid
      const safeUserName = userName ? userName.trim() : "Unknown User";
      const safeProgramType = programId.type
        ? programId.type.trim()
        : "Unknown Program";

      // 🔹 Generate Serial Number
      const nameInitials = safeUserName
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() : ""))
        .join("");

      const typeInitials = safeProgramType
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() : ""))
        .join("");

      const formattedDate = programId.start_date
        ? new Date(programId.start_date * 1000)
            .toLocaleDateString("en-GB")
            .split("/")
            .reverse()
            .join("")
        : "N/A";

      let dateHumanReadable = "N/A";

      if (programId.selected_dates && programId.selected_dates.length > 0) {
        // Convert all selected_dates to timestamps, find the earliest, and format it
        const earliestDate = Math.min(
          ...programId.selected_dates.map((date) => new Date(date).getTime())
        );
        dateHumanReadable = new Date(earliestDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long", // Full month name (e.g., January)
          day: "numeric",
        });
      } else if (programId.start_date) {
        // Convert Unix timestamp to "January DD, YYYY" format
        dateHumanReadable = new Date(
          programId.start_date * 1000
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      const serialNumber = `${nameInitials}-${typeInitials}-${formattedDate}-${userIndex}`;

      console.log(`📜 Serial Number: ${serialNumber}`);

      // 🔹 Store request in Firestore
      await addDoc(collection(db, "Certificates"), {
        userId: userId,
        userName: safeUserName,
        programId: programId.id,
        programName: programId.type || "N/A",
        serialNumber: serialNumber,
        programDate: dateHumanReadable,
        batchCode: programId.batchCode || "N/A",
        location: programId.program_venue,
        status: "pending",
        requestDate: new Date(),
      });

      Swal.fire(
        "Request Sent",
        "Your certificate request has been submitted for approval.",
        "success"
      );
    } catch (error) {
      console.error("Error requesting certificate:", error);
      Swal.fire("Error", "Failed to request certificate.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Set submitting state\

    const submittedUsername = isAnonymous ? "Anonymous" : userName;

    try {
      if (existingRatingId) {
        const ratingRef = doc(
          db,
          "Training Programs",
          programId.id,
          "ratings",
          existingRatingId
        );
        await updateDoc(ratingRef, {
          username: submittedUsername,
          trainerRating,
          programRating,
          feedback,
        });
      } else {
        const ratingsRef = collection(
          db,
          "Training Programs",
          programId.id,
          "ratings"
        );
        await addDoc(ratingsRef, {
          username: userName,
          userId,
          trainerRating,
          programRating,
          feedback,
        });
      }

      // Reset the form
      setTrainerRating(0);
      setProgramRating(0);
      setFeedback("");
      setExistingRatingId(null);
      setIsAnonymous(false);

      await requestCertificate();
      onClose(); // Close the form
    } catch (error) {
      console.error("Error submitting rating:", error);
      Swal.fire("Error", "Failed to submit rating, please try again.", "error");
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto"
    >
      <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
        Rate Before Downloading Certificate
      </h2>

      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-700">
          Rate the Trainer
        </h4>
        <p className="text-sm text-gray-500">
          How effective and knowledgeable was{" "}
          <b>{programId.trainer_assigned}</b>?
        </p>
        <ReactStars
          count={5}
          value={trainerRating}
          onChange={setTrainerRating}
          size={30}
          activeColor={isSubmitting ? "#ccc" : "#facc15"}
        />
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-700">
          Rate the Program
        </h4>
        <p className="text-sm text-gray-500">
          How would you rate the quality of <b>{programId.program_title}</b>?
        </p>
        <ReactStars
          count={5}
          value={programRating}
          onChange={setProgramRating}
          size={30}
          activeColor={isSubmitting ? "#ccc" : "#facc15"}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="feedback" className="block text-gray-600 font-medium">
          Feedback (Optional)
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows="4"
          className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="How can we improve?"
        />
      </div>

      {trainerRating === 0 || programRating === 0 ? (
        <p className="text-red-500 text-sm text-center mb-3">
          Please rate both trainer and program to proceed.
        </p>
      ) : null}

      <div className="relative mb-6">
        <div className="flex items-center justify-between gap-2">
          <div
            className="text-gray-600 font-medium flex items-center"
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            Anonymous Feedback
            <span className="ml-1 text-sm text-gray-400 cursor-help">(?)</span>
          </div>

          <div className="flex-shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition-all duration-300"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform"></div>
            </label>
          </div>
        </div>

        {showTooltip && (
          <div className="absolute left-0 mt-2 bg-gray-800 text-white text-sm p-2 rounded-lg shadow-md z-10 w-64">
            Turn ON to hide your name in the feedback. Turn OFF to show your
            name.
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`w-full text-white font-semibold py-3 rounded-lg transition duration-300 ${
          trainerRating === 0 || programRating === 0 || isSubmitting
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={trainerRating === 0 || programRating === 0 || isSubmitting}
      >
        {isSubmitting
          ? "Submitting..."
          : "Submit Rating & Download Certificate"}
      </button>
    </form>
  );
};

export default RatingForm;
