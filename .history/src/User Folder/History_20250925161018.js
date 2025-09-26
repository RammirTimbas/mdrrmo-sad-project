import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  deleteDoc,
  where,
  getDocs,
  updateDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import cardIcon from "./card_icon.png";
import listIcon from "./list_icon.png";
import { useNavigate, useLocation } from "react-router-dom";
import RatingForm from "./RatingForm";
import loader from "./blue-loader.svg";
import noItem from "./no_items.png";
import Swal from "sweetalert2";
import { FaPlus, FaTimes } from "react-icons/fa";
import { addNotification } from ".././helpers/addNotification";
import Calendar from "react-calendar";
import { Tooltip } from "react-tooltip";
import FollowUsModal from "./FollowUs";
import Lottie from "lottie-react";
import MainLoading from ".././lottie-files-anim/loading-main.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const History = ({ userId }) => {
  const [appliedPrograms, setAppliedPrograms] = useState([]);
  const [completedPrograms, setCompletedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards");
  const navigate = useNavigate();

  const [showOverlay, setShowOverlay] = useState(false);
  const [currentProgramId, setCurrentProgramId] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [managedPrograms, setManagedPrograms] = useState([]);

  const { state } = useLocation();
  const viewId = state?.viewId;
  const role = state?.role;
  const name = state?.name;

  const effectiveUserId = viewId || userId;

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [userEmail, setUserEmail] = useState(null);

  const [isFollowUsOpen, setIsFollowUsOpen] = useState(false);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        if (!effectiveUserId) return;

        console.log("🔍 Fetching user email for:", effectiveUserId);

        const userQuery = query(
          collection(db, "User Informations"),
          where("user_ID", "==", effectiveUserId)
        );
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserEmail(userData.email);
          console.log(`✅ User Email Found: ${userData.email}`);
        } else {
          console.warn("⚠️ No user found with this user_ID.");
        }
      } catch (error) {
        console.error("❌ Error fetching user email:", error);
      }
    };

    fetchUserEmail();
  }, [effectiveUserId]);

  // fetch applied programs on User History collection
  useEffect(() => {
    if (!effectiveUserId) {
      console.error("No user ID or view ID provided.");
      setLoading(false);
      return;
    }

    const historyQuery = query(
      collection(db, "User History"),
      where("user_id", "==", effectiveUserId)
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      async (historySnapshot) => {
        try {
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

          const now = new Date();
          const nowTimestamp = Math.floor(now.getTime() / 1000);

          const applied = [];
          const completed = [];

          programsData.forEach((program) => {
            console.log(`\n🔍 Processing Program: ${program.program_title}`);

            const selectedDates = program.selected_dates || [];
            const hasCustomDates = selectedDates.length > 0;
            let isCompleted = false;

            const startTimestamp = program.start_date;
            const endTimestamp = program.end_date;

            console.log(`  - selected_dates: ${JSON.stringify(selectedDates)}`);
            console.log(
              `  - start_date: ${startTimestamp} (Unix) -> ${new Date(
                startTimestamp * 1000
              )}`
            );
            console.log(
              `  - end_date: ${endTimestamp} (Unix) -> ${new Date(
                endTimestamp * 1000
              )}`
            );

            if (hasCustomDates) {
              // completed if all custom dates are in the past (strictly before today)
              const hasFutureDates = selectedDates.some(
                (date) => date.seconds * 1000 >= now.setHours(0, 0, 0, 0)
              );
              isCompleted = !hasFutureDates;
            } else if (endTimestamp) {
              // adjust so completion is only the next day after end_date
              const endDate = new Date(endTimestamp * 1000);
              endDate.setHours(23, 59, 59, 999);

              const nextDay = new Date(endDate);
              nextDay.setDate(nextDay.getDate() + 1);
              nextDay.setHours(0, 0, 0, 0);

              const completionTime = Math.floor(nextDay.getTime() / 1000);
              isCompleted = nowTimestamp >= completionTime;

              console.log(
                `  - Completion Check: now(${nowTimestamp}) >= nextDay(${completionTime}) -> ${isCompleted}`
              );
            }

            // Exclude managed programs from applied/completed
            if (program.requestor_id === effectiveUserId) {
              // Managed programs are handled separately
              return;
            }
            if (isCompleted) {
              completed.push(program);
              console.log(`✅ Program Completed: ${program.program_title}`);
            } else {
              applied.push(program);
              console.log(`⏳ Program Still Applied: ${program.program_title}`);
            }
          });

          setAppliedPrograms(applied);

          // fetch certificate status for completed programs
          const completedWithCerts = await Promise.all(
            completed.map(async (program) => {
              const cert = await getCertificateStatus(
                effectiveUserId,
                program.id
              );
              return {
                ...program,
                certificateStatus: cert.status,
                certificateUrl: cert.url || null,
              };
            })
          );

          setCompletedPrograms(completedWithCerts);

          // managed programs
          const trainingProgramsQuery = query(
            collection(db, "Training Programs"),
            where("requestor_id", "==", effectiveUserId)
          );

          const trainingProgramsSnapshot = await getDocs(trainingProgramsQuery);

          const managedPrograms = trainingProgramsSnapshot.docs
            .filter((docSnapshot) => {
              const data = docSnapshot.data();
              const type = (data.requestor_type || "").toLowerCase();
              return type === "facilitator";
            })
            .map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }));

          setManagedPrograms(managedPrograms);
        } catch (error) {
          console.error("❌ Error processing real-time user programs:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("❌ Error setting up real-time listener:", error);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, [effectiveUserId]);


  const handleCardClick = (program) => {
    if (role !== "admin") {
      navigate(`/user/training-programs/${program.id}`, { state: { program } });
    } else {
      navigate(`/admin/training-programs/${program.id}`, {
        state: { program },
      });
    }
  };

  const handleRateClick = async (event, programId) => {
    event.stopPropagation();
    
    try {
      // Get program data
      const programRef = doc(db, "Training Programs", programId.id);
      const programDoc = await getDoc(programRef);
      const programData = programDoc.data();
      
      let totalDates = 0;
      let attendedDates = 0;

      // Calculate total dates based on program type
      if (programData.selected_dates && programData.selected_dates.length > 0) {
        // For selected dates, count the number of dates
        totalDates = programData.selected_dates.length;
      } else if (programData.start_date && programData.end_date) {
        // For ranged dates, calculate the number of days between start and end
        const startDate = new Date(programData.start_date * 1000);
        const endDate = new Date(programData.end_date * 1000);
        const diffTime = Math.abs(endDate - startDate);
        totalDates = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      }

      // Find the user's approved applicant record
      const approvedApplicants = programData.approved_applicants || {};
      const userApplicant = Object.values(approvedApplicants).find(
        applicant => applicant.user_id === userId
      );

      if (!userApplicant) {
        Swal.fire({
          title: "Not Found",
          text: "You are not registered for this program.",
          icon: "error",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Count present attendance from user's attendance array
      const userAttendance = userApplicant.attendance || [];
      attendedDates = userAttendance.filter(record => record.remark === "present").length;

      // Validate attendance
      if (totalDates === 0) {
        Swal.fire({
          title: "Error",
          text: "Unable to determine program dates. Please contact support.",
          icon: "error",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      if (attendedDates < totalDates) {
        Swal.fire({
          title: "Incomplete Attendance",
          text: `Your attendance record shows ${attendedDates}/${totalDates} days present. Full attendance is required to request a certificate.`,
          icon: "warning",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Format dates for certificate
      const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      };

      // Get current date for batch code
      const now = new Date();
      const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Generate random string for batch code
      const randomString = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      // Create batch code
      const batchCode = `SDS-${dateString}-${programData.program_title.split(' ').map(word => word[0]).join('')}-${randomString}`;

      // Format program date for certificate:
      // - selected_dates: Firestore Timestamp (date.seconds)
      // - start_date/end_date: Unix timestamp
      let programDate = '';
      console.log('Certificate Date Debug:');
      console.log('selected_dates:', programData.selected_dates);
      console.log('start_date:', programData.start_date);
      console.log('end_date:', programData.end_date);
      if (programData.selected_dates && programData.selected_dates.length > 0) {
        // Firestore Timestamp array
        programDate = programData.selected_dates
          .map(date => {
            console.log('Selected date object:', date);
            if (date && typeof date.seconds === 'number' && !isNaN(date.seconds)) {
              console.log('Formatting selected date:', date.seconds);
              const d = new Date(date.seconds * 1000);
              const str = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              console.log('Formatted selected date:', str);
              return str === 'Invalid Date' ? 'Unknown Date' : str;
            }
            return 'Unknown Date';
          })
          .join(', ');
      } else if (
        typeof programData.start_date === 'number' &&
        typeof programData.end_date === 'number' &&
        !isNaN(programData.start_date) &&
        !isNaN(programData.end_date)
      ) {
        // Unix timestamp range
        console.log('Formatting start_date:', programData.start_date);
        console.log('Formatting end_date:', programData.end_date);
        const startDateObj = new Date(programData.start_date * 1000);
        const endDateObj = new Date(programData.end_date * 1000);
        const startStr = startDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const endStr = endDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        console.log('Formatted start_date:', startStr);
        console.log('Formatted end_date:', endStr);
        programDate = `${startStr === 'Invalid Date' ? 'Unknown Date' : startStr} to ${endStr === 'Invalid Date' ? 'Unknown Date' : endStr}`;
      } else {
        programDate = 'Unknown Date';
      }

      // Create certificate data object
      const certificateData = {
        programId: programId.id,
        userId: userId,
        programName: programData.program_title,
        userName: userApplicant.full_name,
        trainerName: programData.trainer_assigned,
        programDate: programDate,
        location: programData.program_venue || "Soon",
        batchCode: batchCode,
        status: "pending",
        serialNumber: `${userApplicant.full_name.split(' ').map(n => n[0]).join('')}-${programData.program_title.split(' ').map(word => word[0]).join('')}-N/A-${Math.floor(Math.random() * 100)}`,
        requestDate: serverTimestamp()
      };

      // Set current program with certificate data
      setCurrentProgramId({ ...programId, certificateData });
      setShowOverlay(true);
      
    } catch (error) {
      console.error("Error checking attendance:", error);
      Swal.fire({
        title: "Error",
        text: "Unable to verify attendance. Please try again later.",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setCurrentProgramId(null);
  };

  const handleRatingSubmit = () => {
    setShowOverlay(false);
    setTimeout(() => setIsFollowUsOpen(true), 500);
  };

  const handleCancelApplication = async (programId) => {
    const applicationId = userId + "_" + programId;

    // show confirmation prompt
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to cancel your application? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, cancel it!",
      cancelButtonText: "No, keep it",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // delete from User History collection
          await deleteDoc(doc(db, "User History", applicationId));

          // delete from Applicants collection
          await deleteDoc(doc(db, "Applicants", applicationId));

          Swal.fire(
            "Canceled!",
            "Your application has been successfully canceled.",
            "success"
          );

          setAppliedPrograms((prev) =>
            prev.filter((program) => program.id !== programId)
          );
        } catch (error) {
          console.error("Error canceling application:", error);
          Swal.fire(
            "Error!",
            "There was an issue canceling your application. Please try again later.",
            "error"
          );
        }
      }
    });
  };

  const getCertificateStatus = async (userId, programId) => {
    const certQuery = query(
      collection(db, "Certificates"),
      where("userId", "==", userId),
      where("programId", "==", programId)
    );
    const certSnapshot = await getDocs(certQuery);

    if (!certSnapshot.empty) {
      const certData = certSnapshot.docs[0].data();
      if (certData.status === "approved" && certData.certificateUrl) {
        return { status: "approved", url: certData.certificateUrl };
      } else if (certData.status === "pending") {
        return { status: "pending" };
      } else if (certData.status === "rejected") {
        return { status: "rejected" };
      }
    }
    return { status: "not_requested" };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 mb-6">
            <Lottie animationData={MainLoading} loop={true} />
          </div>
          <p className="text-gray-600">
            Great things takes time. Please be patient.
          </p>
        </div>
      </div>
    );
  }

  const handleJoinProgram = async () => {
    if (!shareCode.trim()) {
      Swal.fire("Error", "Please enter a valid share code.", "error");
      return;
    }

    try {
      const programQuery = query(
        collection(db, "Training Programs"),
        where("share_code", "==", shareCode)
      );
      const programSnapshot = await getDocs(programQuery);

      if (programSnapshot.empty) {
        Swal.fire("Error", "Invalid share code. Program not found.", "error");
        return;
      }

      const programDoc = programSnapshot.docs[0];
      const programData = programDoc.data();
      const programId = programDoc.id;

      // Check if user is already in approved applicants
      if (programData.approved_applicants?.[`${userId}_${programId}`]) {
        Swal.fire(
          "Error",
          "You are already enrolled in this program.",
          "error"
        );
        return;
      }

      // Fetch logged-in user's details
      const userQuery = query(
        collection(db, "User Informations"),
        where("user_ID", "==", userId)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        Swal.fire("Error", "User details not found.", "error");
        return;
      }

      const userData = userSnapshot.docs[0].data();

          // Check if slots are available
          if (typeof programData.slots === "number" && programData.slots <= 0) {
            Swal.fire("Error", "No slots available for this program.", "error");
            return;
          }
      // Generate unique application ID
      const applicationId = `${userId}_${programId}`;

      // Construct approved applicant data
      const applicantData = {
        [applicationId]: {
          application_id: applicationId,
          full_name: userData.full_name,
          status: "approved",
          user_id: userId,
        },
      };

      // Update Training Programs collection (add approved applicant)
      await updateDoc(doc(db, "Training Programs", programId), {
  [`approved_applicants.${applicationId}`]: applicantData[applicationId],
  slots: programData.slots - 1
      });

      // Create a new entry in User History collection using setDoc
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

      Swal.fire(
        "Success",
        "You have successfully joined the training!",
        "success"
      );
      setShowJoinModal(false);
      setShareCode("");
    } catch (error) {
      console.error("Error joining program:", error);
      Swal.fire(
        "Error",
        "Failed to join the program. Please try again.",
        "error"
      );
    }
  };

  // 🔁 Function to handle the full sync flow
  const syncAllToGoogleCalendar = async () => {
    const confirmSync = await Swal.fire({
      title: "Sync with Google Calendar?",
      text: "You will be redirected to Google for authentication. Do you want to continue?",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Proceed",
      cancelButtonText: "Cancel",
    });

    if (!confirmSync.isConfirmed) {
      console.log("❌ User canceled sync.");
      return;
    }

    console.log("🔍 Checking authentication status...");
    const authCheck = await fetch(`${API_BASE_URL}/check-auth`, {
      credentials: "include",
    });

    const authResponse = await authCheck.json();
    console.log("Auth Check Response:", authResponse);

    // --- Refined logic for future programs ---
    // Gather all applied and completed programs, filter for future sessions
    const now = new Date();
    const futurePrograms = [];

    // Helper to check if any selected_dates are in the future
    function hasFutureSelectedDate(program) {
      if (!program.selected_dates || program.selected_dates.length === 0) return false;
      return program.selected_dates.some(dateObj => {
        const date = new Date(dateObj.seconds * 1000);
        return date > now;
      });
    }

    // Helper to check if ranged program is in the future
    function isFutureRangedProgram(program) {
      if (program.start_date && program.end_date) {
        const endDate = new Date(program.end_date * 1000);
        return endDate > now;
      }
      return false;
    }

    // Combine all programs
    const allPrograms = [...appliedPrograms, ...completedPrograms];
    allPrograms.forEach(program => {
      if (hasFutureSelectedDate(program) || isFutureRangedProgram(program)) {
        futurePrograms.push(program);
      }
    });

    // If no future programs, show info and return
    if (futurePrograms.length === 0) {
      Swal.fire({
        title: "No Upcoming Programs",
        text: "🎉 All your training programs are already finished!",
        icon: "info",
      });
      return;
    }

    // --- End refined logic ---

    if (!authResponse.authenticated) {
      console.log("🔄 Opening Google Authentication in a new tab...");

      const authWindow = window.open(
        `${API_BASE_URL}/auth/google`,
        "_blank",
        "width=500,height=600"
      );

      // Poll until authenticated
      const checkAuthInterval = setInterval(async () => {
        const authCheck = await fetch(`${API_BASE_URL}/check-auth`, {
          credentials: "include",
        });
        const authStatus = await authCheck.json();

        console.log("🔄 Checking auth status:", authStatus);
        if (authStatus.authenticated) {
          clearInterval(checkAuthInterval);
          authWindow.close();
          await syncEventsToGoogleCalendar(futurePrograms);
        }
      }, 2000);

      return;
    }

    await syncEventsToGoogleCalendar(futurePrograms);
  };

  // 🔄 Function to sync events after authentication
  const syncEventsToGoogleCalendar = async (futurePrograms) => {
    // Accepts futurePrograms array
    const events = futurePrograms.map((program) => {
      // For selected_dates, create an event for each future date
      if (program.selected_dates && program.selected_dates.length > 0) {
        return program.selected_dates
          .filter((dateObj) => {
            const date = new Date(dateObj.seconds * 1000);
            return date > new Date();
          })
          .map((dateObj) => {
            const startTime = new Date(dateObj.seconds * 1000).toISOString();
            // Default to 3 hours duration
            const endTime = new Date(dateObj.seconds * 1000 + 3 * 60 * 60 * 1000).toISOString();
            return {
              title: program.program_title,
              location: program.program_venue || "N/A",
              description: `Training Program: ${program.program_title}`,
              startTime,
              endTime,
            };
          });
      } else if (program.start_date && program.end_date) {
        // Ranged program: create a single event for the range if end_date is in the future
        const startTime = new Date(program.start_date * 1000).toISOString();
        const endTime = new Date(program.end_date * 1000).toISOString();
        return [{
          title: program.program_title,
          location: program.program_venue || "N/A",
          description: `Training Program: ${program.program_title}`,
          startTime,
          endTime,
        }];
      }
      return [];
    }).flat();

    if (events.length === 0) {
      return Swal.fire({
        title: "No Upcoming Programs",
        text: "🎉 All your training programs are already finished!",
        icon: "info",
      });
    }

    // Show a progress modal
    Swal.fire({
      title: "Syncing...",
      html: `Syncing <b>0</b> of ${events.length} events to Google Calendar.`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      let syncedCount = 0;

      for (const event of events) {
        const response = await fetch(`${API_BASE_URL}/sync-google-calendar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ events: [event] }),
        });

        syncedCount++;
        const b = Swal.getHtmlContainer().querySelector("b");
        if (b) b.textContent = `${syncedCount}`;

        await new Promise((resolve) => setTimeout(resolve, 250)); // match server delay
      }

      Swal.fire({
        title: "Success!",
        text: "✅ Successfully synced all upcoming/ongoing programs to your Google Calendar!",
        icon: "success",
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      console.error("❌ Error syncing calendar:", error);
      Swal.fire({
        title: "Error!",
        text: "❌ Error syncing calendar. Please check console logs.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <div className="history-container">
      <div className="history-header">
        {!name ? <h2>Training Programs</h2> : <h2>{name}'s Program History</h2>}
      </div>

      {/* Calendar Section */}
      <div className="flex justify-center">
        <div className="w-full md:w-[60%] bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            {!name ? (
              <h2 className="text-xl font-semibold">My Training Schedule</h2>
            ) : (
              <h2 className="text-xl font-semibold">
                {name}'s Training Schedule
              </h2>
            )}

            {role !== "admin" && (
              <button
                onClick={syncAllToGoogleCalendar}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                Sync All to Google Calendar
              </button>
            )}
          </div>

          <div className="w-full max-h-[450px] overflow-hidden">
            <Calendar
              onChange={setCalendarDate}
              value={calendarDate}
              className="w-full h-auto max-h-[400px] sm:max-h-[350px] md:max-h-[500px]"
              tileContent={({ date, view }) => {
                if (view === "month") {
                  // 🟢 Find all programs for this date
                  const matchingPrograms = [
                    ...appliedPrograms,
                    ...completedPrograms,
                  ].filter((program) => {
                    const startDate = program.start_date
                      ? new Date(program.start_date * 1000)
                      : null;
                    const endDate = program.end_date
                      ? new Date(program.end_date * 1000)
                      : null;

                    // ✅ Check if the date is in selected_dates
                    const isSelectedDate =
                      program.selected_dates &&
                      program.selected_dates.some((dateObj) => {
                        const selectedDate = new Date(dateObj.seconds * 1000);
                        return (
                          date.toDateString() === selectedDate.toDateString()
                        );
                      });

                    return (
                      isSelectedDate ||
                      (startDate &&
                        date.toDateString() === startDate.toDateString()) ||
                      (endDate &&
                        date.toDateString() === endDate.toDateString()) ||
                      (startDate &&
                        endDate &&
                        date > startDate &&
                        date < endDate)
                    );
                  });

                  if (matchingPrograms.length > 0) {
                    return (
                      <div className="flex flex-col items-center justify-center px-1 w-full">
                        {matchingPrograms.slice(0, 2).map((program, index) => {
                          const isCompleted = completedPrograms.some(
                            (completed) => completed.id === program.id
                          );
                          const tooltipId = `tooltip-${date.toISOString()}-${index}`;

                          return (
                            <div key={index} className="w-full text-center">
                              <div
                                data-tooltip-id={tooltipId}
                                data-tooltip-content={program.program_title}
                                className={`text-[9px] font-medium truncate w-full px-1 py-[2px] rounded cursor-pointer ${isCompleted
                                    ? "bg-green-100 text-gray-800"
                                    : "bg-yellow-100 text-gray-800"
                                  }`}
                              >
                                {program.program_title}
                              </div>

                              {/* Tooltip for each program */}
                              <Tooltip id={tooltipId} />
                            </div>
                          );
                        })}

                        {matchingPrograms.length > 2 && (
                          <div className="w-full text-center">
                            <div
                              data-tooltip-id={`tooltip-more-${date.toISOString()}`}
                              data-tooltip-content={matchingPrograms
                                .slice(2)
                                .map((p) => p.program_title)
                                .join(", ")}
                              className="text-[8px] text-gray-500 font-medium cursor-pointer"
                            >
                              + {matchingPrograms.length - 2} more
                            </div>

                            {/* Tooltip for "+ more" */}
                            <Tooltip
                              id={`tooltip-more-${date.toISOString()}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                }
                return null;
              }}
            />
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold flex items-center">
        Applied Programs
        <span className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {appliedPrograms.length}
        </span>
      </h3>
      {appliedPrograms.length ? (
        <div className={`programs-content ${viewMode}-history`}>
          {
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
                      <b>Date(s):</b>{" "}
                      {program.selected_dates?.length > 0 ? (
                        program.selected_dates
                          .map((date) =>
                            new Date(date.seconds * 1000).toLocaleDateString()
                          )
                          .join(", ")
                      ) : (
                        <>
                          <b>Start:</b>{" "}
                          {new Date(
                            program.start_date * 1000
                          ).toLocaleDateString()}{" "}
                          <br />
                          <b>End:</b>{" "}
                          {new Date(
                            program.end_date * 1000
                          ).toLocaleDateString()}
                        </>
                      )}
                    </p>
                    <p>
                      <b>Trainer:</b> {program.trainer_assigned}
                    </p>
                    <div>
                      {program.status !== "approved" && role !== "admin" && (
                        <button
                          className="cancel-button-history"
                          onClick={(event) => {
                            event.stopPropagation(); // Prevent card click action
                            handleCancelApplication(program.id);
                          }}
                        >
                          Cancel Application
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      ) : (
        <div className="no-entries">
          <img src={noItem} alt="No entries" className="no-entries-image" />
          <p>No active applications yet.</p>
        </div>
      )}

      <h3 className="text-lg font-semibold flex items-center mt-4">
        Completed Programs
        <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {completedPrograms.length}
        </span>
      </h3>
      {completedPrograms.length ? (
        <div className={`programs-content ${viewMode}-history`}>
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
                    <b>Status:</b> Completed
                  </p>
                  <p>
                    <b>Date(s):</b>{" "}
                    {program.selected_dates?.length > 0 ? (
                      program.selected_dates
                        .map((date) =>
                          new Date(date.seconds * 1000).toLocaleDateString()
                        )
                        .join(", ")
                    ) : (
                      <>
                        <b>Start:</b>{" "}
                        {new Date(
                          program.start_date * 1000
                        ).toLocaleDateString()}{" "}
                        <br />
                        <b>End:</b>{" "}
                        {new Date(program.end_date * 1000).toLocaleDateString()}
                      </>
                    )}
                  </p>

                  {/* 🔹 Always show Certificate Status */}
                  {role !== "admin" && (
                    <>
                      <p>
                        <b>Certificate Status:</b>{" "}
                        {program.certificateStatus === "not_requested" &&
                          "Not Requested"}
                        {program.certificateStatus === "pending" &&
                          "Pending Approval"}
                        {program.certificateStatus === "rejected" && "Rejected"}
                        {program.certificateStatus === "approved" && "Approved"}
                      </p>

                      {/* 🔹 Action Buttons */}
                      {program.certificateStatus === "not_requested" && (
                        <button
                          className="rate-button-history"
                          onClick={(event) => handleRateClick(event, program)}
                        >
                          Request Certificate
                        </button>
                      )}

                      {program.certificateStatus === "pending" && (
                        <p className="text-yellow-600 font-semibold">
                          Certificate Pending Approval
                        </p>
                      )}

                      {program.certificateStatus === "rejected" && (
                        <p className="text-red-600 font-semibold">
                          Request Rejected – Visit Office
                        </p>
                      )}

                      {program.certificateStatus === "approved" && (
                        <button
                          className="rate-button-history bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(program.certificateUrl, "_blank");
                          }}
                        >
                          Download Certificate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-entries">
          <img src={noItem} alt="No entries" className="no-entries-image" />
          <p>No completed applications found.</p>
        </div>
      )}

      {managedPrograms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold flex items-center mt-8">
            Managed Programs
            <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {managedPrograms.length}
            </span>
          </h3>

          <div className={`programs-content ${viewMode}-history`}>
            <div className="cards-view-history">
              {managedPrograms.map((program) => (
                <div
                  className="program-card-history"
                  key={program.id}
                  onClick={() => handleCardClick(program)} // Optional: you can use another click if you want for managed programs
                >
                  <img
                    src={program.thumbnail || "https://via.placeholder.com/100"}
                    alt={program.program_title}
                    className="program-thumbnail-history"
                  />
                  <div className="program-info-history-completed">
                    <h4>{program.program_title}</h4>
                    <p>
                      <b>Status:</b> Managed
                    </p>
                    <p>
                      <b>Date(s):</b>{" "}
                      {program.selected_dates?.length > 0 ? (
                        program.selected_dates
                          .map((date) =>
                            new Date(date.seconds * 1000).toLocaleDateString()
                          )
                          .join(", ")
                      ) : (
                        <>
                          <b>Start:</b>{" "}
                          {program.start_date
                            ? new Date(
                              program.start_date * 1000
                            ).toLocaleDateString()
                            : "N/A"}{" "}
                          <br />
                          <b>End:</b>{" "}
                          {program.end_date
                            ? new Date(
                              program.end_date * 1000
                            ).toLocaleDateString()
                            : "N/A"}
                        </>
                      )}
                    </p>
                    {/* You could add extra buttons here if needed */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overlay for Rating Form */}
      {showOverlay && (
        <div className="overlay-rating-form">
          <div className="overlay-content">
            <button className="close-button" onClick={handleCloseOverlay}>
              X
            </button>
            <RatingForm
              programId={currentProgramId}
              userId={userId}
              onClose={handleCloseOverlay}
              onSubmit={handleRatingSubmit}
            />
          </div>
        </div>
      )}

      {/* Join Program Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Join Program</h2>
              <FaTimes
                className="text-gray-600 cursor-pointer hover:text-red-600"
                onClick={() => setShowJoinModal(false)}
              />
            </div>
            <input
              type="text"
              placeholder="Enter share code..."
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleJoinProgram}
              className="mt-4 w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
            >
              Join Program
            </button>
          </div>
        </div>
      )}

      {/* ✅ Move FollowUsModal Here to Keep it Persistent */}
      {isFollowUsOpen && (
        <FollowUsModal
          isOpen={isFollowUsOpen}
          onClose={() => setIsFollowUsOpen(false)}
        />
      )}
      {role !== "admin" && (
        <button
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          onClick={() => setShowJoinModal(true)}
        >
          <FaPlus size={24} />
        </button>
      )}
    </div>
  );
};

export default History;
