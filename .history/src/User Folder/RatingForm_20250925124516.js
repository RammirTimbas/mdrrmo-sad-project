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

  // Custom rating messages with emojis
  const getTrainerRatingMessage = (rating) => {
    switch(rating) {
      case 1: return "Needs improvement 😕";
      case 2: return "Fair effort 🤔";
      case 3: return "Good trainer 👍";
      case 4: return "Great trainer 🌟";
      case 5: return "Outstanding trainer! 🏆";
      default: return "";
    }
  };

  const getProgramRatingMessage = (rating) => {
    switch(rating) {
      case 1: return "Could be better 😕";
      case 2: return "Has potential 🤔";
      case 3: return "Good program 👍";
      case 4: return "Very enjoyable 🌟";
      case 5: return "Excellent program! 🎉";
      default: return "";
    }
  };

  const formStyles = {
    container: {
      maxWidth: "500px",
      margin: "0 auto",
      padding: "2rem",
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      overflow: "hidden",
    },
    header: {
      textAlign: "center",
      marginBottom: "2rem",
      color: "#1a365d",
      fontWeight: "bold",
      fontSize: "1.5rem",
    },
    step: {
      ...fadeIn,
      padding: "1.5rem",
      textAlign: "center",
    },
    ratingMessage: {
      marginTop: "1rem",
      fontSize: "1.1rem",
      color: "#4a5568",
      fontWeight: "500",
      ...slideIn,
    },
    navigation: {
      display: "flex",
      justifyContent: "center",
      gap: "1rem",
      marginTop: "2rem",
      alignItems: "center",
    },
    button: {
      padding: "0.75rem 1.5rem",
      borderRadius: "8px",
      fontWeight: "600",
      transition: "all 0.3s ease",
      cursor: "pointer",
      minWidth: "120px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.95rem",
      letterSpacing: "0.5px",
    },
    nextButton: {
      backgroundColor: "#3182ce",
      color: "white",
      border: "none",
      "&:hover": {
        backgroundColor: "#2c5282",
      }
    },
    backButton: {
      backgroundColor: "#f7fafc",
      color: "#4a5568",
      border: "1px solid #e2e8f0",
      "&:hover": {
        backgroundColor: "#edf2f7",
      }
    },
    starsContainer: {
      display: "flex",
      justifyContent: "center",
      marginTop: "1rem",
    },
    progress: {
      height: "4px",
      backgroundColor: "#e2e8f0",
      borderRadius: "2px",
      marginBottom: "2rem",
    },
    progressBar: {
      height: "100%",
      backgroundColor: "#3182ce",
      borderRadius: "2px",
      transition: "width 0.3s ease",
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyles.container}>
      <style>{keyframes}</style>
      
      <div style={formStyles.progress}>
        <div style={{ ...formStyles.progressBar, width: `${(currentStep / 3) * 100}%` }} />
      </div>

      {currentStep === 1 && (
        <div style={formStyles.step}>
          <h2 style={formStyles.header}>Rate the Trainer</h2>
          <p style={{ color: "#718096", marginBottom: "1rem" }}>
            How effective and knowledgeable was <b>{programId.trainer_assigned}</b>?
          </p>
          <div style={formStyles.starsContainer}>
            <ReactStars
              count={5}
              value={trainerRating}
              onChange={(rating) => {
                setTrainerRating(rating);
                setRatingMessage(getTrainerRatingMessage(rating));
              }}
              size={40}
              activeColor="#facc15"
            />
          </div>
          {trainerRating > 0 && (
            <div style={formStyles.ratingMessage}>
              {getTrainerRatingMessage(trainerRating)}
            </div>
          )}
        </div>
      )}

      {currentStep === 2 && (
        <div style={formStyles.step}>
          <h2 style={formStyles.header}>Rate the Program</h2>
          <p style={{ color: "#718096", marginBottom: "1rem" }}>
            How would you rate <b>{programId.program_title}</b>?
          </p>
          <div style={formStyles.starsContainer}>
            <ReactStars
              count={5}
              value={programRating}
              onChange={(rating) => {
                setProgramRating(rating);
                setRatingMessage(getProgramRatingMessage(rating));
              }}
              size={40}
              activeColor="#facc15"
            />
          </div>
          {programRating > 0 && (
            <div style={formStyles.ratingMessage}>
              {getProgramRatingMessage(programRating)}
            </div>
          )}
        </div>
      )}

      {currentStep === 3 && (
        <div style={formStyles.step}>
          <h2 style={formStyles.header}>Additional Feedback</h2>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginTop: "1rem",
              minHeight: "150px",
              resize: "vertical",
            }}
            placeholder="Share your thoughts about the training program (optional)"
          />
        </div>
      )}

      <div className="relative mb-6">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div
            style={{
              color: "#4a5568",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            Anonymous Feedback
            <span style={{ marginLeft: "4px", color: "#a0aec0", cursor: "help" }}>
              (?)
            </span>
          </div>

          <div style={{ flexShrink: 0 }}>
            <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                style={{ position: "absolute", width: "1px", height: "1px", padding: "0", margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: "0" }}
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
              />
              <div
                style={{
                  width: "44px",
                  height: "24px",
                  backgroundColor: isAnonymous ? "#3182ce" : "#cbd5e0",
                  borderRadius: "9999px",
                  transition: "background-color 0.3s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "4px",
                  top: "4px",
                  width: "16px",
                  height: "16px",
                  backgroundColor: "white",
                  borderRadius: "9999px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transform: isAnonymous ? "translateX(20px)" : "translateX(0)",
                  transition: "transform 0.3s",
                }}
              />
            </label>
          </div>
        </div>

        {showTooltip && (
          <div
            style={{
              position: "absolute",
              left: 0,
              marginTop: "8px",
              backgroundColor: "#2d3748",
              color: "white",
              fontSize: "0.875rem",
              padding: "8px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              zIndex: 10,
              width: "256px",
            }}
          >
            Turn ON to hide your name in the feedback. Turn OFF to show your name.
          </div>
        )}
      </div>

      <div style={formStyles.navigation}>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            style={{ ...formStyles.button, ...formStyles.backButton }}
          >
            Back
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Prevent any form submission
              setCurrentStep(currentStep + 1);
            }}
            style={{
              ...formStyles.button,
              ...formStyles.nextButton,
              marginLeft: "auto",
            }}
            disabled={
              (currentStep === 1 && trainerRating === 0) ||
              (currentStep === 2 && programRating === 0)
            }
          >
            Next
          </button>
        ) : (
          <button
            type="button" // Changed from submit to button
            onClick={handleSubmit} // Handle submission explicitly
            style={{
              maxWidth: "280px",
              width: "100%",
              margin: "0 auto",
              padding: "0.85rem",
              borderRadius: "10px",
              fontWeight: "600",
              color: "white",
              backgroundColor:
                trainerRating === 0 || programRating === 0 || isSubmitting
                  ? "#a0aec0"
                  : "#3182ce",
              cursor:
                trainerRating === 0 || programRating === 0 || isSubmitting
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: "0.95rem",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(0)",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                backgroundColor: "#2c5282",
              }
            }}
            disabled={trainerRating === 0 || programRating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Finish"}
          </button>
        )}
      </div>
    </form>
  );
};

export default RatingForm;
