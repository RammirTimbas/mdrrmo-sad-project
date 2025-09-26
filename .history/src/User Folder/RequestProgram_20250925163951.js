import { useState, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import { Tooltip } from "react-tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

export default function RequestProgram({ userId }) {
  const [numParticipants, setNumParticipants] = useState(1);
  const [emails, setEmails] = useState([""]);
  const [trainingType, setTrainingType] = useState("");
  const [requestDate, setRequestDate] = useState(new Date());
  const [venue, setVenue] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("request");
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [submittedRequests, setSubmittedRequests] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [visibility, setVisibility] = useState("Private");
  const [requestorType, setRequestorType] = useState("");
  const [thumbnail, setThumbnail] = useState(null);

  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [occupiedDates, setOccupiedDates] = useState(new Set());

  const [dateSelectionMode, setDateSelectionMode] = useState(""); // "range" | "weekly" | "custom"
  const [customDates, setCustomDates] = useState([]); // Array of selected dates
  const [errors, setErrors] = useState({});
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Approved");

  const validateForm = () => {
    let newErrors = {};

    if (!programTitle) newErrors.programTitle = "Program Title is required.";
    if (!trainingType) newErrors.trainingType = "Training Type is required.";
    if (!dateSelectionMode) newErrors.dateSelectionMode = "Date is required.";
    if (dateSelectionMode === "range") {
      if (!startDate) newErrors.startDate = "Start date is required.";
      if (!endDate) newErrors.endDate = "End date is required.";
    }
    if (dateSelectionMode === "custom" && customDates.length === 0) {
      newErrors.customDates = "At least one custom date is required.";
    }
    if (!venue) newErrors.venue = "Venue is required.";
    if (!visibility) newErrors.visibility = "Visibility is required.";
    if (!numParticipants)
      newErrors.numParticipants = "Number of participants is required.";
    if (!requestorType)
      newErrors.requestorType = "Requestor Type is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    // Filter by status and sort by timestamp (recent to oldest)
    const filtered = submittedRequests
      .filter((request) => request.status === statusFilter)
      .sort((a, b) => b.timestamp - a.timestamp);

    setFilteredRequests(filtered);
  }, [submittedRequests, statusFilter]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "Training Requests"),
      where("user_ID", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubmittedRequests(requests);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Fetch training programs from Firestore
  useEffect(() => {
    const programsCollection = collection(db, "Training Programs");

    const unsubscribe = onSnapshot(
      programsCollection,
      (snapshot) => {
        try {
          const programs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setTrainingPrograms(programs);

          const occupied = new Set();

          programs.forEach((program) => {
            if (program.selected_dates && program.selected_dates.length > 0) {
              // 🟢 Convert Firebase timestamps in selected_dates to JS Date objects
              program.selected_dates.forEach((dateObj) => {
                let date;
                if (dateObj.seconds) {
                  date = new Date(dateObj.seconds * 1000);
                } else if (dateObj.toDate) {
                  date = dateObj.toDate();
                } else {
                  date = new Date(dateObj);
                }

                occupied.add(date.toDateString());
              });
            } else if (program.start_date && program.end_date) {
              // 🔵 Handle date range if no selected_dates exist
              const start = new Date(program.start_date * 1000);
              const end = new Date(program.end_date * 1000);

              let currentDate = new Date(start);
              while (currentDate <= end) {
                occupied.add(currentDate.toDateString());
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
          });

          setOccupiedDates(occupied);
        } catch (error) {
          console.error("Error processing training programs snapshot:", error);
        }
      },
      (error) => {
        console.error("Error fetching training programs in real-time:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTrainingTypes = async () => {
      try {
        const trainingTypeCollection = collection(db, "Training Type");
        const snapshot = await getDocs(trainingTypeCollection);
        const types = snapshot.docs.map((doc) => doc.data().training_type_name); // Assuming "name" field holds the training type
        setTrainingTypes(types);
      } catch (error) {
        console.error("Error fetching training types:", error);
      }
    };

    fetchTrainingTypes();
  }, []);

  const colors = [
    "program-color-0",
    "program-color-1",
    "program-color-2",
    "program-color-3",
    "program-color-4",
    "program-color-5",
  ];

  // Handle number of participants
  const handleNumParticipantsChange = (e) => {
    const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
    if (value === "" || (value >= 1 && value <= 50)) {
      setNumParticipants(value);
      setEmails(new Array(value || 1).fill(""));
    } else {
      Swal.fire(
        "Invalid Input",
        "Participants must be between 1 and 50.",
        "error"
      );
    }
  };

  // Handle email change
  const handleEmailChange = (index, value) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      console.log("Form submitted successfully!");
    }

    // Validate inputs based on selection mode
    if (
      programTitle.trim() === "" ||
      trainingType.trim() === "" ||
      venue.trim() === "" ||
      (dateSelectionMode === "range" && (!startDate || !endDate)) ||
      (dateSelectionMode === "custom" && customDates.length === 0)
    ) {
      Swal.fire(
        "Missing Fields",
        "Please fill in all required fields.",
        "warning"
      );
      return;
    }

    let swalLoading;
    try {
      swalLoading = Swal.fire({
        title: 'Submitting Request...',
        html: '<div style="font-size:1.2rem;">Please wait while we process your request.</div>',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      if (!userId) {
        Swal.close();
        Swal.fire("Error", "User not logged in!", "error");
        return;
      }
      const storage = getStorage();

      let thumbnailUrl = "";

      // Upload thumbnail if exists
      if (thumbnail) {
        const thumbnailRef = ref(
          storage,
          `thumbnails/${Date.now()}_${thumbnail.name}`
        );
        await uploadBytes(thumbnailRef, thumbnail);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
      }

      // Get full name from "User Informations" collection
      const userQuery = query(
        collection(db, "User Informations"),
        where("user_ID", "==", userId)
      );
      const userSnapshot = await getDocs(userQuery);
      let fullName = "Unknown User";

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        fullName = userData.full_name;
      }

      // Prepare Firestore data based on mode
      let requestData = {
        training_type: trainingType,
        venue: venue,
        program_title: programTitle,
        num_participants: numParticipants,
        emails: emails,
        requestor: fullName,
        requestor_type: requestorType,
        user_ID: userId,
        status: "Pending",
        visibility: visibility,
        thumbnail: thumbnailUrl,
        timestamp: serverTimestamp(),
      };

      if (dateSelectionMode === "range") {
        requestData.start_date = startDate;
        requestData.end_date = endDate;
      } else if (dateSelectionMode === "custom") {
        requestData.selected_dates = customDates; // Array of manually chosen dates
      }

      await addDoc(collection(db, "Training Requests"), requestData);

      Swal.close();
      Swal.fire(
        "Success",
        "Training request submitted successfully!",
        "success"
      );

      // ✅ Reset all fields
      setDateSelectionMode("range");
      setStartDate(new Date());
      setEndDate(new Date());
      setTrainingType("");
      setVenue("");
      setProgramTitle("");
      setNumParticipants(1);
      setEmails([""]);
      setCustomDates([]);
    } catch (error) {
      console.error("Error submitting request:", error);
      Swal.close();
      Swal.fire("Error", "Failed to submit request. Try again.", "error");
    }
  };

  // Helper function to find the next available date
  const getNextAvailableDate = () => {
    let today = new Date();
    while (occupiedDates.has(today.toDateString())) {
      today.setDate(today.getDate() + 1); // Move to the next day
    }
    return today;
  };

  // 🔥 Run when trainingPrograms change or on first render
  useEffect(() => {
    if (trainingPrograms.length > 0) {
      const nextAvailable = getNextAvailableDate();
      setStartDate(nextAvailable); // ✅ Set to the first available date
      setEndDate(nextAvailable); // ✅ Ensure end date is valid
    }
  }, [trainingPrograms]);

  const handleStartDateChange = (date) => {
    if (occupiedDates.has(date.toDateString())) {
      Swal.fire("Day already occupied!", "Pick another!", "warning");
      return;
    }

    setStartDate(date);

    // Ensure end date is not before start date
    if (endDate < date) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date) => {
    if (date < startDate) {
      Swal.fire(
        "Invalid End Date!",
        "End date cannot be before start date.",
        "warning"
      );
      return;
    }

    if (occupiedDates.has(date.toDateString())) {
      Swal.fire("Day already occupied!", "Pick another!", "warning");
      return;
    }

    setEndDate(date);
  };

  const handleCustomDateChange = (date) => {
    if (occupiedDates.has(date.toDateString())) {
      Swal.fire("Day already occupied!", "Pick another!", "warning");
      return;
    }

    setCustomDates((prev) => [...prev, date]);
  };

  const removeCustomDate = (dateToRemove) => {
    setCustomDates((prev) => prev.filter((date) => date !== dateToRemove));
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white text-black rounded-lg shadow-lg">
        {/* Full-Width Tabs */}
        <div className="flex w-full border-b border-gray-300 bg-white">
          <button
            onClick={() => setActiveTab("request")}
            className={`w-1/2 py-4 text-lg font-semibold focus:outline-none relative bg-white ${activeTab === "request"
                ? "text-blue-600 font-bold"
                : "text-gray-600"
              }`}
          >
            Request Program
            {activeTab === "request" && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`w-1/2 py-4 text-lg font-semibold focus:outline-none relative bg-white ${activeTab === "view" ? "text-blue-600 font-bold" : "text-gray-600"
              }`}
          >
            View Requests
            {activeTab === "view" && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Tab Content with Sliding Effect */}
        <div className="p-8 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "request" ? (
              <motion.div
                key="request"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "0%", opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-blue-600 mb-6">
                  Request a Training Program
                </h1>
                {/* Calendar Section */}
                <div className="flex justify-center">
                  <div className="w-full md:w-[60%] bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">
                      MDRRMO Training Schedule
                    </h2>

                    <div className="w-full max-h-[450px] overflow-hidden">
                      <Calendar
                        onChange={setCalendarDate}
                        value={calendarDate}
                        className="w-full h-auto max-h-[400px] sm:max-h-[350px] md:max-h-[500px]"
                        tileContent={({ date, view }) => {
                          if (view === "month") {
                            // Find training programs scheduled on this date
                            const matchingPrograms = trainingPrograms.filter(
                              (program) => {
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
                                    const selectedDate = new Date(
                                      dateObj.seconds * 1000
                                    );
                                    return (
                                      date.toDateString() ===
                                      selectedDate.toDateString()
                                    );
                                  });

                                return (
                                  isSelectedDate || // 🟢 Check selected_dates
                                  (startDate &&
                                    date.toDateString() ===
                                    startDate.toDateString()) ||
                                  (endDate &&
                                    date.toDateString() ===
                                    endDate.toDateString()) ||
                                  (startDate &&
                                    endDate &&
                                    date > startDate &&
                                    date < endDate)
                                );
                              }
                            );

                            if (matchingPrograms.length > 0) {
                              return (
                                <div className="flex flex-col items-center justify-center px-1 w-full">
                                  {matchingPrograms
                                    .slice(0, 2)
                                    .map((program, index) => {
                                      const tooltipId = `tooltip-${date.toISOString()}-${index}`;

                                      return (
                                        <div
                                          key={index}
                                          className="w-full text-center"
                                        >
                                          <div
                                            data-tooltip-id={tooltipId}
                                            data-tooltip-content={
                                              program.program_title
                                            }
                                            className="text-[9px] text-gray-800 font-medium truncate w-full bg-blue-100 px-1 py-[2px] rounded cursor-pointer"
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

                {/* Training Request Form */}
                <form className="space-y-6 w-full" onSubmit={handleSubmit}>
                  {/* Training Type */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Program Title
                    </label>
                    <input
                      type="text"
                      value={programTitle}
                      onChange={(e) => {
                        setProgramTitle(e.target.value);
                        setErrors({ ...errors, programTitle: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500 focus:ring focus:ring-blue-400"
                    />
                    {errors.programTitle && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.programTitle}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Training Type
                    </label>
                    <select
                      value={trainingType}
                      onChange={(e) => {
                        setTrainingType(e.target.value);
                        setErrors({ ...errors, trainingType: "" }); // Clear error when selected
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500"
                    >
                      <option value="">Select a Training Type</option>
                      {trainingTypes.map((type, index) => (
                        <option key={index} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.trainingType && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.trainingType}
                      </p>
                    )}
                  </div>

                  {/* Date Selection Mode */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Date Selection Mode
                    </label>
                    <select
                      value={dateSelectionMode}
                      onChange={(e) => {
                        setDateSelectionMode(e.target.value);
                        setErrors({ ...errors, dateSelectionMode: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500"
                    >
                      <option value="">Select Date Mode</option>
                      <option value="range">Date Range</option>
                      <option value="custom">Custom Dates</option>
                    </select>
                    {errors.dateSelectionMode && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.dateSelectionMode}
                      </p>
                    )}
                  </div>

                  {/* Start & End Date (For Range Mode) */}
                  {dateSelectionMode === "range" && (
                    <>
                      <div>
                        <label className="block text-lg font-medium mb-2">
                          Start Date
                        </label>
                        <DatePicker
                          selected={startDate}
                          onChange={(date) => {
                            handleStartDateChange(date);
                            setErrors({ ...errors, startDate: "" });
                          }}
                          className="w-full p-3 rounded bg-white text-black border border-blue-500"
                        />
                        {errors.startDate && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.startDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-lg font-medium mb-2">
                          End Date
                        </label>
                        <DatePicker
                          selected={endDate}
                          onChange={(date) => {
                            handleEndDateChange(date);
                            setErrors({ ...errors, endDate: "" });
                          }}
                          className="w-full p-3 rounded bg-white text-black border border-blue-500"
                        />
                        {errors.endDate && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.endDate}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Custom Dates Selection */}
                  {dateSelectionMode === "custom" && (
                    <div>
                      <label className="block text-lg font-medium mb-2">
                        Select Custom Dates
                      </label>
                      <DatePicker
                        selected={null}
                        onChange={(date) => {
                          handleCustomDateChange(date);
                          setErrors({ ...errors, customDates: "" });
                        }}
                        className="w-full p-3 rounded bg-white text-black border border-blue-500"
                      />
                      <div className="mt-2">
                        {customDates.length > 0 ? (
                          <ul>
                            {customDates.map((date, index) => (
                              <li key={index} className="text-sm">
                                {date.toDateString()}{" "}
                                <button
                                  type="button"
                                  onClick={() => removeCustomDate(date)}
                                  className="text-red-500 text-xs ml-2"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.customDates}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Venue */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => {
                        setVenue(e.target.value);
                        setErrors({ ...errors, venue: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500 focus:ring focus:ring-blue-400"
                    />
                    {errors.venue && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.venue}
                      </p>
                    )}
                  </div>

                  {/* Thumbnail Upload */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Upload Thumbnail Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setThumbnail(e.target.files[0]);
                        setErrors({ ...errors, thumbnail: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500"
                    />
                    {errors.thumbnail && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.thumbnail}
                      </p>
                    )}
                  </div>

                  {/* Requestor Type */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Requestor Type
                    </label>
                    <div className="flex justify-center items-center space-x-8">
                      <label className="flex items-center space-x-2">
                        {" "}
                        {/* slightly bigger gap */}
                        <input
                          type="radio"
                          name="requestorType"
                          value="Facilitator"
                          checked={requestorType === "Facilitator"}
                          onChange={(e) => {
                            setRequestorType(e.target.value);
                            setErrors({ ...errors, requestorType: "" });
                          }}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-base">Facilitator</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        {" "}
                        {/* slightly bigger gap */}
                        <input
                          type="radio"
                          name="requestorType"
                          value="Applicant"
                          checked={requestorType === "Applicant"}
                          onChange={(e) => {
                            setRequestorType(e.target.value);
                            setErrors({ ...errors, requestorType: "" });
                          }}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-base">Applicant</span>
                      </label>
                    </div>

                    {errors.requestorType && (
                      <p className="text-red-500 text-sm mt-1 text-center">
                        {errors.requestorType}
                      </p>
                    )}

                    {requestorType === "Facilitator" && (
                      <p className="text-blue-600 text-sm mt-2 text-center">
                        You won't be included in the Applicant List once
                        approved but you can manage it.
                      </p>
                    )}

                    {requestorType === "Applicant" && (
                      <p className="text-green-600 text-sm mt-2 text-center">
                        You will be included in the Applicant List once approved
                        and can participate in the program.
                      </p>
                    )}
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Visibility
                    </label>
                    <select
                      value={visibility}
                      onChange={(e) => {
                        setVisibility(e.target.value);
                        setErrors({ ...errors, visibility: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500"
                    >
                      <option value="">Select Visibility</option>
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                    </select>
                    {errors.visibility && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.visibility}
                      </p>
                    )}
                  </div>

                  {/* Number of Participants */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Number of Participants
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={numParticipants}
                      onChange={(e) => {
                        handleNumParticipantsChange(e);
                        setErrors({ ...errors, numParticipants: "" });
                      }}
                      className="w-full p-3 rounded bg-white text-black border border-blue-500 focus:ring focus:ring-blue-400"
                    />
                    {errors.numParticipants && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.numParticipants}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all">
                    Submit Request
                  </button>
                </form>
              </motion.div>
            ) : (
              {/* View Requests */ }
              < motion.div
  key="view"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: "0%", opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3 }}
>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-600 mb-6 text-center">
              Submitted Training Requests
            </h1>

            {/* Filter Dropdown */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Filter by Status:</label>
              <select
                className="p-2 border rounded-md text-sm sm:text-base"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Loading and Empty State */}
            {loading ? (
              <p className="text-gray-600 text-center">Loading requests...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-600 text-center">No requests available.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Thumbnail */}
                    {request.thumbnail && (
                      <img
                        src={request.thumbnail}
                        alt="Thumbnail"
                        className="w-full h-32 object-cover"
                      />
                    )}

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Header */}
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                          {request.program_title || request.training_type}
                        </h2>
                        <span
                          className={`px-2 py-1 rounded-full text-xs md:text-sm font-semibold ${request.status === "Approved"
                              ? "bg-green-200 text-green-700"
                              : request.status === "Pending"
                                ? "bg-yellow-200 text-yellow-700"
                                : "bg-red-200 text-red-700"
                            }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="text-gray-700 text-sm md:text-base space-y-1">
                        {request.selected_dates?.length > 0 ? (
                          <div>
                            <strong>Custom Dates:</strong>
                            <ul className="list-disc list-inside ml-2">
                              {request.selected_dates.map((d, idx) => {
                                const date =
                                  d.seconds || d.nanoseconds
                                    ? new Date(d.seconds * 1000)
                                    : new Date(d);
                                return (
                                  <li key={idx}>{date.toLocaleDateString()}</li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <>
                            <p>
                              <strong>Start Date:</strong>{" "}
                              {request.start_date?.seconds
                                ? new Date(
                                  request.start_date.seconds * 1000
                                ).toLocaleDateString()
                                : "N/A"}
                            </p>
                            <p>
                              <strong>End Date:</strong>{" "}
                              {request.end_date?.seconds
                                ? new Date(
                                  request.end_date.seconds * 1000
                                ).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Venue and Participants */}
                      <p className="text-gray-700 text-sm md:text-base mt-2">
                        <strong>Venue:</strong> {request.venue}
                      </p>
                      <p className="text-gray-700 text-sm md:text-base">
                        <strong>Participants:</strong> {request.num_participants}
                      </p>

                      {/* Extra Info */}
                      <p className="text-gray-700 text-xs md:text-sm mt-1">
                        <strong>Requestor:</strong> {request.requestor} (
                        {request.requestor_type})
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm">
                        <strong>Visibility:</strong> {request.visibility}
                      </p>

                      {/* Rejection Reason */}
                      {request.status === "Rejected" &&
                        request.rejection_reason && (
                          <div className="mt-3 p-2 bg-red-100 border-l-4 border-red-500 rounded text-sm">
                            <h3 className="font-semibold text-red-600">
                              Rejection Reason:
                            </h3>
                            <p className="text-gray-700">{request.rejection_reason}</p>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

            )}
        </AnimatePresence>
      </div>
    </div>
    </div >
  );
}
