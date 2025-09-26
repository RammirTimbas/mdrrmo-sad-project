import React, { useState, useEffect } from "react";
import trainingLogo from "./logo/training_logo.png";
import createLogo from "./logo/post_icon.png";
import { Timestamp } from "firebase/firestore";

import plusIcon from "./logo/plus_icon.png";
import cardIcon from "./logo/card_icon.png";
import listIcon from "./logo/list_icon.png";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  doc,
  where,
  query,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import Swal from "sweetalert2";
import noItem from "./logo/no_items.png";
import thumbnail1 from "./default_thumbnail_1.jpg";
import thumbnail2 from "./default_thumbnail_2.jpg";
import thumbnail3 from "./default_thumbnail_3.jpg";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase"; // import your Firebase storage
import loader from "./charts/blue-loader.svg";
import bcrypt from "bcryptjs";

import { motion } from "framer-motion";
import { FaTimes, FaCloudUploadAlt } from "react-icons/fa";

import { addNotification } from "../../helpers/addNotification";
import Lottie from "lottie-react";
import MainLoading from "../../lottie-files-anim/loading-main.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const TrainingPrograms = ({ userId }) => {
  const [viewMode, setViewMode] = useState("cards");
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [adminName, setAdminName] = useState("Admin");
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAddingType, setIsAddingType] = useState(true); // true if adding type, false if adding trainer
  const navigate = useNavigate();

  const [requirementsList, setRequirementsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTypeOrTrainer, setNewTypeOrTrainer] = useState(
    isAddingType ? "" : { name: "", email: "", password: "" }
  );

  const [trainerNames, setTrainerNames] = useState([]);
  const [filters, setFilters] = useState({
    type: "",
    trainer_assigned: "",
    status: "",
    date: "",
  });
  const [newProgram, setNewProgram] = useState({
    program_title: "",
    description: "",
    start_date: "",
    end_date: "",
    materials_needed: "",
    requirements: "",
    slots: "",
    thumbnail: "",
    trainer_assigned: "",
    type: "",
    restriction: "",
    restriction: "",
    dateMode: "",
    selected_dates: [],
    start_time: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const [availableTrainers, setAvailableTrainers] = useState([]);



  // Reset trainer selection if date fields change
  if (["start_date", "end_date", "selected_dates", "dateMode"].includes(name)) {
    setNewProgram((prev) => ({ ...prev, trainer_assigned: "" }));
  }

  // Update available trainers when date(s) change
  useEffect(() => {
    const fetchAvailableTrainers = async () => {
      try {
        const programsSnapshot = await getDocs(collection(db, "Training Programs"));
        const allPrograms = programsSnapshot.docs.map((doc) => doc.data());
        const isTrainerOccupied = (trainer, selectedDates, startDate, endDate, dateMode) => {
          for (const program of allPrograms) {
            const assigned = Array.isArray(program.trainer_assigned) ? program.trainer_assigned : [program.trainer_assigned];
            if (!assigned.includes(trainer)) continue;
            if (dateMode === "specific" && Array.isArray(selectedDates) && selectedDates.length > 0) {
              for (const selDate of selectedDates) {
                const selMillis = selDate.seconds ? selDate.seconds * 1000 : new Date(selDate).getTime();
                if (program.selected_dates && program.selected_dates.length > 0) {
                  for (const progDate of program.selected_dates) {
                    const progMillis = progDate._seconds ? progDate._seconds * 1000 : (progDate.seconds ? progDate.seconds * 1000 : new Date(progDate).getTime());
                    if (selMillis === progMillis) return true;
                  }
                } else if (program.start_date && program.end_date) {
                  const progStart = program.start_date * 1000;
                  const progEnd = program.end_date * 1000;
                  if (selMillis >= progStart && selMillis <= progEnd) return true;
                }
              }
            } else if (dateMode === "range" && startDate && endDate) {
              const selStart = new Date(startDate).getTime();
              const selEnd = new Date(endDate).getTime();
              if (program.selected_dates && program.selected_dates.length > 0) {
                for (const progDate of program.selected_dates) {
                  const progMillis = progDate._seconds ? progDate._seconds * 1000 : (progDate.seconds ? progDate.seconds * 1000 : new Date(progDate).getTime());
                  if (progMillis >= selStart && progMillis <= selEnd) return true;
                }
              } else if (program.start_date && program.end_date) {
                const progStart = program.start_date * 1000;
                const progEnd = program.end_date * 1000;
                if (selStart <= progEnd && selEnd >= progStart) return true;
              }
            }
          }
          return false;
        };
        let filtered = trainerNames;
        if (newProgram.dateMode === "specific" && newProgram.selected_dates && newProgram.selected_dates.length > 0) {
          filtered = trainerNames.filter(trainer => !isTrainerOccupied(trainer, newProgram.selected_dates, null, null, "specific"));
        } else if (newProgram.dateMode === "range" && newProgram.start_date && newProgram.end_date) {
          filtered = trainerNames.filter(trainer => !isTrainerOccupied(trainer, null, newProgram.start_date, newProgram.end_date, "range"));
        }
        setAvailableTrainers(filtered);
      } catch (error) {
        setAvailableTrainers([]);
      }
    };
    fetchAvailableTrainers();
  }, [trainerNames, newProgram.dateMode, newProgram.selected_dates, newProgram.start_date, newProgram.end_date]);

  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const adminDoc = await getDoc(doc(db, "Users", userId));
        if (adminDoc.exists()) {
          setAdminName(adminDoc.data().name || "Admin");
        }
      } catch (error) {
        console.error("Error fetching admin name:", error);
      }
    };
    fetchAdminName();
  }, [userId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && newProgram.requirements.trim() !== "") {
      e.preventDefault();
      setRequirementsList((prevList) => [
        ...prevList,
        newProgram.requirements.trim(),
      ]);
      setNewProgram((prev) => ({ ...prev, requirements: "" })); // Clear input
    }
  };

  const removeRequirement = (index) => {
    setRequirementsList((prevList) => prevList.filter((_, i) => i !== index));
  };

  // fetch training programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/programs`);
        if (!response.ok) {
          throw new Error("Failed to fetch programs");
        }
        const programsData = await response.json(); // Get the data from the response
        setPrograms(programsData); // Set the programs data to the state
        setFilteredPrograms(programsData); // Optionally filter programs
        setLoading(false);
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, []);

  // Fetch training types and trainer names
  useEffect(() => {
    const unsubscribeTrainingTypes = onSnapshot(
      collection(db, "Training Type"),
      (trainingTypeSnapshot) => {
        const trainingTypeData = trainingTypeSnapshot.docs.map(
          (doc) => doc.data().training_type_name
        );
        setTrainingTypes(trainingTypeData);
      },
      (error) => {
        console.error("Error fetching training types:", error);
      }
    );

    // Fetch all trainers
    const fetchAvailableTrainers = async () => {
      try {
        // Get all trainers
        const trainerSnapshot = await getDocs(collection(db, "Trainer Name"));
        const allTrainers = trainerSnapshot.docs.map((doc) => doc.data().trainer_name);

        // Get all programs
        const programsSnapshot = await getDocs(collection(db, "Training Programs"));
        const allPrograms = programsSnapshot.docs.map((doc) => doc.data());

        // Helper to check overlap
        const isTrainerOccupied = (trainer, selectedDates, startDate, endDate, dateMode) => {
          for (const program of allPrograms) {
            if (program.trainer_assigned !== trainer) continue;

            // Check for overlap
            if (dateMode === "specific" && Array.isArray(selectedDates)) {
              // For each selected date, check if trainer is occupied
              for (const selDate of selectedDates) {
                const selMillis = selDate.seconds ? selDate.seconds * 1000 : new Date(selDate).getTime();
                if (program.selected_dates && program.selected_dates.length > 0) {
                  for (const progDate of program.selected_dates) {
                    const progMillis = progDate._seconds ? progDate._seconds * 1000 : (progDate.seconds ? progDate.seconds * 1000 : new Date(progDate).getTime());
                    if (selMillis === progMillis) return true;
                  }
                } else if (program.start_date && program.end_date) {
                  // If program is ranged, check if selDate falls within range
                  const progStart = program.start_date * 1000;
                  const progEnd = program.end_date * 1000;
                  if (selMillis >= progStart && selMillis <= progEnd) return true;
                }
              }
            } else if (dateMode === "range" && startDate && endDate) {
              // Check for range overlap
              const selStart = new Date(startDate).getTime();
              const selEnd = new Date(endDate).getTime();
              if (program.selected_dates && program.selected_dates.length > 0) {
                for (const progDate of program.selected_dates) {
                  const progMillis = progDate._seconds ? progDate._seconds * 1000 : (progDate.seconds ? progDate.seconds * 1000 : new Date(progDate).getTime());
                  if (progMillis >= selStart && progMillis <= selEnd) return true;
                }
              } else if (program.start_date && program.end_date) {
                const progStart = program.start_date * 1000;
                const progEnd = program.end_date * 1000;
                // Overlap if ranges intersect
                if (selStart <= progEnd && selEnd >= progStart) return true;
              }
            }
          }
          return false;
        };

        // Get selected dates from newProgram
        const dateMode = newProgram.dateMode;
        const selectedDates = newProgram.selected_dates;
        const startDate = newProgram.start_date;
        const endDate = newProgram.end_date;

        // Filter trainers
        const availableTrainers = allTrainers.filter((trainer) =>
          !isTrainerOccupied(trainer, selectedDates, startDate, endDate, dateMode)
        );
        setTrainerNames(availableTrainers);
      } catch (error) {
        console.error("Error fetching available trainers:", error);
      }
    };

    fetchAvailableTrainers();

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeTrainingTypes();
    };
  }, [newProgram.dateMode, newProgram.selected_dates, newProgram.start_date, newProgram.end_date]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a storage reference
    const storageRef = ref(storage, `thumbnails/${file.name}`);

    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Monitor the upload progress
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress); // Update the upload progress
      },
      (error) => {
        console.error("Upload failed:", error);
      },
      () => {
        // Get the download URL and set it as the thumbnail
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setNewProgram((prevProgram) => ({
            ...prevProgram,
            thumbnail: downloadURL, // Use the Firebase URL for the thumbnail
          }));
          setUploadProgress(0); // Reset the progress bar once upload is complete
        });
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProgram((prevProgram) => ({
      ...prevProgram,
      [name]: value,
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    setLoading(true);
    let filtered = programs;

    if (filters.type) {
      filtered = filtered.filter((program) => program.type === filters.type);
    }

    if (filters.trainer_assigned) {
      filtered = filtered.filter(
        (program) => program.trainer_assigned === filters.trainer_assigned
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (program) =>
          determineStatus(
            program.start_date,
            program.end_date,
            program.selected_dates
          ) === filters.status
      );
    }

    if (filters.date) {
      const selectedDate = new Date(filters.date);
      selectedDate.setHours(0, 0, 0, 0); // ✅ Normalize to midnight
      const selectedTimestamp = selectedDate.getTime();
      filtered = filtered.filter((program) => {
        if (program.selected_dates?.length > 0) {
          return program.selected_dates.some((date, index) => {
            const programDate = new Date(date._seconds * 1000);
            programDate.setHours(0, 0, 0, 0); // ✅ Normalize program date to midnight
            const programTimestamp = programDate.getTime();

            return programTimestamp === selectedTimestamp;
          });
        } else {
          const startTimestamp = new Date(program.start_date * 1000).getTime();
          const endTimestamp = new Date(program.end_date * 1000).getTime();
          return (
            startTimestamp <= selectedTimestamp &&
            endTimestamp >= selectedTimestamp
          );
        }
      });
    }

    setFilteredPrograms(filtered);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    const startDate = new Date(newProgram.start_date);
    const endDate = new Date(newProgram.end_date);
    const slotNo = newProgram.slots;
    const age = newProgram.restriction;

    // 🔹 Date validations
    if (newProgram.dateMode === "range") {
      if (endDate < startDate) {
        return Swal.fire(
          "Invalid Date",
          "End date must be after start date.",
          "warning"
        );
      }
      if (startDate < now) {
        return Swal.fire(
          "Invalid Date",
          "Start date must not be in the past.",
          "warning"
        );
      }
    } else if (newProgram.dateMode === "specific") {
      if (
        !newProgram.selected_dates ||
        newProgram.selected_dates.length === 0
      ) {
        return Swal.fire(
          "Missing Dates",
          "Please select at least one date.",
          "warning"
        );
      }
    }

    // 🔹 Slot and Age validations
    if (slotNo < 1) {
      return Swal.fire(
        "Invalid Slot Number",
        "Slot number should not be lower than 1",
        "warning"
      );
    }
    if (age && age <= 0) {
      return Swal.fire(
        "Invalid Input",
        "Age restriction could not be lower than 1",
        "warning"
      );
    }

    try {
      setShowForm(false);
      setIsLoading(true);
      // 🔹 Generate batch code
      const batchDateCode = startDate.getTime() / 1000;

      const programInitials = newProgram.program_title
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      const typeInitials = newProgram.type
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      let batchDate = new Date(batchDateCode * 1000)
        .toLocaleDateString("en-GB")
        .split("/")
        .reverse()
        .join("");

      if (
        newProgram.dateMode === "specific" &&
        newProgram.selected_dates.length > 0
      ) {
        const earliestDate = Math.min(
          ...newProgram.selected_dates.map((date) => {
            if (date.seconds) {
              // Already Firestore Timestamp
              return date.toDate().getTime();
            } else {
              // Local JS Date
              return new Date(date).getTime();
            }
          })
        );
        batchDate = new Date(earliestDate)
          .toLocaleDateString("en-GB")
          .split("/")
          .reverse()
          .join("");
      }

      const randomCode = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();
      const batchCode = `${programInitials}-${batchDate}-${typeInitials}-${randomCode}`;

      console.log(`📌 Generated Batch Code: ${batchCode}`);

      // 🔹 Prepare data for Firestore
      let programData = {
        ...newProgram,
        slots: Number(newProgram.slots),
        requirements: requirementsList,
        restriction: Number(newProgram.restriction),
        batchCode: batchCode,
        createdAt: Timestamp.now(),
      };

      if (newProgram.start_time) {
        const [hours, minutes] = newProgram.start_time.split(":").map(Number);
        startDate.setHours(hours, minutes);
        endDate.setHours(hours, minutes);
      }

      if (newProgram.dateMode === "range") {
        programData.start_date = Math.floor(startDate.getTime() / 1000);
        programData.end_date = Math.floor(endDate.getTime() / 1000);
        programData.selected_dates = [];
      } else if (newProgram.dateMode === "specific") {
        programData.start_date = null;
        programData.end_date = null;
        programData.selected_dates = newProgram.selected_dates.map((date) => {
          let dateObj = date.seconds ? date.toDate() : new Date(date);
          // ⏰ Apply start_time to each selected date
          if (newProgram.start_time) {
            const [hours, minutes] = newProgram.start_time
              .split(":")
              .map(Number);
            dateObj.setHours(hours, minutes);
          }
          return Timestamp.fromDate(dateObj);
        });
      }

      // 🔹 Add to Firestore
      const docRef = await addDoc(
        collection(db, "Training Programs"),
        programData
      );
      const updatedProgram = { ...programData, id: docRef.id };

      setNewProgram({
        program_title: "",
        description: "",
        program_venue: "",
        start_date: "",
        end_date: "",
        materials_needed: "",
        requirements: "",
        slots: "",
        thumbnail: "",
        trainer_assigned: "",
        type: "",
        restriction: "",
        dateMode: "",
        selected_dates: [],
        start_time: "",
      });

      // 🔹 Refresh programs
      const querySnapshot = await getDocs(collection(db, "Training Programs"));
      const programsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrograms(programsData);
      setFilteredPrograms(programsData);

      // 🔹 Log creation
      await addDoc(collection(db, "Logs"), {
        name: adminName,
        type: "Program Creation",
        action: "Added Program: " + newProgram.program_title,
        date: new Date(),
      });

      // 🔹 Success popup
      Swal.fire({
        title: "Program Added!",
        text: "The training program has been successfully added.",
        icon: "success",
        confirmButtonText: "OK",
      });

      // 🔹 Send notification
      addNotification(
        "New Programs Available!",
        `Greetings! The MDRRMO - DAET just posted a new training program titled '${newProgram.program_title}'. Click here to check it out.`,
        null,
        {
          action_link: `/user/home/${updatedProgram.id}`,
          program_data: {
            ...updatedProgram,
            start_date: programData.start_date,
            end_date: programData.end_date,
          },
        }
      );
    } catch (error) {
      console.error("Error adding program:", error);
      Swal.fire({
        title: "Error",
        text: "There was an error adding the program. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const determineStatus = (startDate, endDate, selectedDates) => {
    const now = new Date().getTime(); // Current time in milliseconds

    let earliestDate = null;
    let latestDate = null;

    if (selectedDates?.length > 0) {
      // ✅ Find the earliest (most past) date
      earliestDate = selectedDates.reduce((earliest, date) => {
        const dateMillis = date._seconds * 1000;
        return !earliest || dateMillis < earliest ? dateMillis : earliest;
      }, null);

      // ✅ Find the latest (most recent) date
      latestDate = selectedDates.reduce((latest, date) => {
        const dateMillis = date._seconds * 1000;
        return dateMillis > latest ? dateMillis : latest;
      }, 0);
    }

    // ✅ If selected_dates exist, use them, otherwise fall back to startDate and endDate
    const start = earliestDate || (startDate ? startDate * 1000 : null);
    const end = latestDate || (endDate ? endDate * 1000 : null);

    if (start && now < start) {
      return "not-started"; // The program has not yet started
    } else if (start && end && now >= start && now <= end) {
      return "ongoing"; // The program is currently running
    } else if (end && now > end) {
      return "completed"; // The program has finished
    } else {
      return "unknown"; // Fallback for missing data
    }
  };

  const handleOverlayInputChange = (e, field) => {
    if (isAddingType) {
      setNewTypeOrTrainer(e.target.value);
    } else {
      setNewTypeOrTrainer((prevState) => ({
        ...prevState,
        [field]: e.target.value,
      }));
    }
  };

  const handleOverlaySubmit = async (e) => {
    e.preventDefault();

    if (isAddingType && !newTypeOrTrainer) {
      alert("Please enter a training type.");
      return;
    } else if (
      !isAddingType &&
      (!newTypeOrTrainer.name ||
        !newTypeOrTrainer.email ||
        !newTypeOrTrainer.password)
    ) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      if (isAddingType) {
        // add a new training type
        await addDoc(collection(db, "Training Type"), {
          training_type_name: newTypeOrTrainer,
        });
        setTrainingTypes([...trainingTypes, newTypeOrTrainer]);
      } else {
        // check if the email already exists in the Trainer Name collection
        const trainerQuery = query(
          collection(db, "Trainer Name"),
          where("email", "==", newTypeOrTrainer.email)
        );
        const querySnapshot = await getDocs(trainerQuery);

        if (!querySnapshot.empty) {
          // email already exists
          Swal.fire({
            title: "Invalid Email",
            text: "This email is already registered as a trainer.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        // hash the password
        const hashedPassword = await bcrypt.hash(newTypeOrTrainer.password, 10);

        // add the new trainer
        await addDoc(collection(db, "Trainer Name"), {
          trainer_name: newTypeOrTrainer.name,
          email: newTypeOrTrainer.email,
          password: hashedPassword,
          profile: "trainer",
        });
        setTrainerNames([...trainerNames, newTypeOrTrainer.name]);
      }

      setNewTypeOrTrainer(
        isAddingType ? "" : { name: "", email: "", password: "" }
      );

      Swal.fire({
        title: "Added",
        text: "Added successfully",
        icon: "success",
        confirmButtonText: "OK",
      });

      setShowOverlay(false);
    } catch (error) {
      console.error("Error adding type or trainer:", error);
    }
  };

  const handleCardClick = (program) => {
    navigate(`/admin/training-programs/${program.id}`, { state: { program } });
  };

  const itemsPerPage = 10; // Set how many items you want to display per page
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate the total number of pages
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);

  // Slice the programs array for the current page
  const currentPrograms = filteredPrograms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle pagination change
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="training-programs-page">
      {/* Title Bar */}
      <div className="training-programs-title-bar">
        <div className="title-bar-left">
          <img
            src={trainingLogo}
            alt="Training Programs Logo"
            className="title-bar-logo"
          />
          <h2 className="title-bar-text">Training Programs</h2>
        </div>
        <div className="title-bar-right">
          <button
            className="create-training-program-button"
            onClick={() => setShowForm(true)}
          >
            Create Program
            <img
              src={createLogo}
              alt="Create Program Logo"
              className="button-logo"
            />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="overlay">
          <div className="create-program-form">
            <div className="form-left">
              <div className="form-header">
                <h3 className="form-title">Add New Training Program</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="form-close-btn"
                >
                  X
                </button>
              </div>
              <hr className="form-divider" />
              <form onSubmit={handleSubmit} className="custom-form">
                <div className="form-group">
                  <label htmlFor="program_title" className="form-label">
                    Program Title:
                  </label>
                  <input
                    type="text"
                    id="program_title"
                    name="program_title"
                    value={newProgram.program_title}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description:
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newProgram.description}
                    onChange={handleInputChange}
                    className="form-textarea"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program_venue" className="form-label">
                    Venue:
                  </label>
                  <input
                    type="text"
                    id="program_venue"
                    name="program_venue"
                    value={newProgram.program_venue}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateMode" className="form-label">
                    Date Selection Mode:
                  </label>
                  <select
                    value={newProgram.dateMode}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        dateMode: e.target.value,
                        selected_dates: [],
                      })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Select Mode</option>
                    <option value="range">Date Range</option>
                    <option value="specific">Selected Dates</option>
                  </select>
                </div>

                {newProgram.dateMode === "range" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="start_date" className="form-label">
                        Start Date:
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={newProgram.start_date}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="end_date" className="form-label">
                        End Date:
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={newProgram.end_date}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>
                  </>
                )}

                {newProgram.dateMode === "specific" && (
                  <div className="form-group">
                    <label className="form-label">Select Specific Dates:</label>
                    <input
                      type="date"
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (
                          !newProgram.selected_dates.some(
                            (d) =>
                              new Date(d).toDateString() === date.toDateString()
                          )
                        ) {
                          setNewProgram((prev) => ({
                            ...prev,
                            selected_dates: [
                              ...(prev.selected_dates || []),
                              date,
                            ],
                          }));
                        }
                      }}
                      className="form-input"
                    />
                    <div
                      className="requirements-list"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginTop: "8px",
                        maxHeight: "80px",
                        overflowY: "auto",
                        background: "#f7f7fa",
                        borderRadius: "8px",
                        padding: "8px 4px"
                      }}
                    >
                      {(newProgram.selected_dates || []).map((date, index) => (
                        <div
                          key={index}
                          className="requirement-tag"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            background: "#e3f2fd",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "0.95rem",
                            color: "#1565c0",
                            boxShadow: "0 1px 4px rgba(21,101,192,0.08)",
                            margin: "2px 0"
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{new Date(date).toLocaleDateString()}</span>
                          <button
                            className="remove-btn"
                            style={{
                              marginLeft: "8px",
                              background: "#fff",
                              border: "none",
                              color: "#d32f2f",
                              fontWeight: "bold",
                              borderRadius: "50%",
                              width: "22px",
                              height: "22px",
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.08)"
                            }}
                            title="Remove date"
                            onClick={() => {
                              const updatedDates =
                                newProgram.selected_dates.filter((_, i) => i !== index);
                              setNewProgram({
                                ...newProgram,
                                selected_dates: updatedDates,
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="start_time" className="form-label">
                    Time:
                  </label>
                  <input
                    type="time"
                    value={newProgram.start_time || ""}
                    onChange={(e) =>
                      setNewProgram({
                        ...newProgram,
                        start_time: e.target.value,
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="slots" className="form-label">
                    Slots:
                  </label>
                  <input
                    type="number"
                    id="slots"
                    name="slots"
                    value={newProgram.slots}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="requirements" className="form-label">
                    Additional Requirements:
                  </label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    value={newProgram.requirements}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a requirement and press Enter"
                    className="form-textarea"
                  />
                  <div className="requirements-list">
                    {requirementsList.map((requirement, index) => (
                      <div key={index} className="requirement-tag">
                        <span>{requirement}</span>
                        <button
                          onClick={() => removeRequirement(index)}
                          className="remove-btn"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="materials_needed" className="form-label">
                    Materials Needed:
                  </label>
                  <textarea
                    id="materials_needed"
                    name="materials_needed"
                    value={newProgram.materials_needed}
                    onChange={handleInputChange}
                    className="form-textarea"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="trainer_assigned" className="form-label">
                    Trainer Assigned:
                  </label>
                  <select
                    id="trainer_assigned"
                    name="trainer_assigned"
                    className="form-select"
                    value={newProgram.trainer_assigned}
                    onChange={handleInputChange}
                    required
                    disabled={
                      (newProgram.dateMode === "range" && (!newProgram.start_date || !newProgram.end_date)) ||
                      (newProgram.dateMode === "specific" && (!newProgram.selected_dates || newProgram.selected_dates.length === 0))
                    }
                    style={{
                      backgroundColor:
                        (newProgram.dateMode === "range" && (!newProgram.start_date || !newProgram.end_date)) ||
                          (newProgram.dateMode === "specific" && (!newProgram.selected_dates || newProgram.selected_dates.length === 0))
                          ? "#f3f3f3"
                          : "#fff",
                      border: "2px solid #4a90e2",
                      borderRadius: "8px",
                      padding: "8px",
                      fontSize: "1rem",
                      color: "#333",
                      marginTop: "4px"
                    }}
                  >
                    <option value="">{(newProgram.dateMode === "range" && (!newProgram.start_date || !newProgram.end_date)) ||
                      (newProgram.dateMode === "specific" && (!newProgram.selected_dates || newProgram.selected_dates.length === 0))
                      ? "Select date(s) first" : "Select Trainer"}</option>
                    {trainerNames.map((trainer, index) => (
                      <option key={index} value={trainer}>
                        {trainer}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: "0.9rem", color: "#888", marginTop: "2px" }}>
                    {((newProgram.dateMode === "range" && (!newProgram.start_date || !newProgram.end_date)) ||
                      (newProgram.dateMode === "specific" && (!newProgram.selected_dates || newProgram.selected_dates.length === 0))) && (
                        <span>Please select date(s) before assigning a trainer.</span>
                      )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="type" className="form-label">
                    Training Type:
                  </label>
                  <select
                    id="type"
                    name="type"
                    className="form-select"
                    value={newProgram.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Type</option>
                    {trainingTypes.map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="restriction" className="form-label">
                    Minimum Age:
                  </label>
                  <input
                    type="number"
                    id="restriction"
                    name="restriction"
                    value={newProgram.restriction}
                    onChange={handleInputChange}
                    placeholder="(Leave blank if there's no age restriction)"
                    className="form-input"
                  />
                </div>

                <button type="submit" className="submit-btn">
                  Post Program
                </button>
              </form>
            </div>

            {/* Thumbnail Upload Section */}
            <div className="form-right">
              <label htmlFor="thumbnail" className="thumbnail-upload">
                {newProgram.thumbnail ? (
                  <img
                    src={newProgram.thumbnail}
                    alt="Thumbnail Preview"
                    className="thumbnail-preview"
                  />
                ) : (
                  <span>Click to upload thumbnail</span>
                )}
                <input
                  type="file"
                  id="thumbnail"
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleThumbnailChange} // Use the updated handler
                />
              </label>

              {/* Show progress bar or percentage if the file is uploading */}
              {uploadProgress > 0 && (
                <div className="upload-progress">
                  <p>Upload Progress: {Math.round(uploadProgress)}%</p>
                  <progress value={uploadProgress} max="100"></progress>
                </div>
              )}

              {/* Default Thumbnails Section */}
              <div className="default-thumbnails">
                <h4>Select a Default Thumbnail</h4>
                <div className="thumbnail-options">
                  <img
                    src={thumbnail1}
                    alt="Default Thumbnail 1"
                    className="thumbnail-option"
                    onClick={() =>
                      setNewProgram((prevProgram) => ({
                        ...prevProgram,
                        thumbnail: thumbnail1,
                      }))
                    }
                  />
                  <img
                    src={thumbnail2}
                    alt="Default Thumbnail 2"
                    className="thumbnail-option"
                    onClick={() =>
                      setNewProgram((prevProgram) => ({
                        ...prevProgram,
                        thumbnail: thumbnail2,
                      }))
                    }
                  />
                  <img
                    src={thumbnail3}
                    alt="Default Thumbnail 3"
                    className="thumbnail-option"
                    onClick={() =>
                      setNewProgram((prevProgram) => ({
                        ...prevProgram,
                        thumbnail: thumbnail3,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOverlay && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>
              {isAddingType ? "Add New Training Type" : "Add New Trainer"}
            </h3>
            <form onSubmit={handleOverlaySubmit}>
              {isAddingType ? (
                <input
                  type="text"
                  value={newTypeOrTrainer}
                  onChange={handleOverlayInputChange}
                  placeholder="Enter training type"
                  required
                  className="form-input"
                />
              ) : (
                <>
                  <input
                    type="text"
                    value={newTypeOrTrainer.name}
                    onChange={(e) => handleOverlayInputChange(e, "name")}
                    placeholder="Enter trainer name"
                    required
                    className="form-input"
                  />
                  <input
                    type="email"
                    value={newTypeOrTrainer.email}
                    onChange={(e) => handleOverlayInputChange(e, "email")}
                    placeholder="Enter trainer email"
                    required
                    className="form-input"
                  />
                  <input
                    type="password"
                    value={newTypeOrTrainer.password}
                    onChange={(e) => handleOverlayInputChange(e, "password")}
                    placeholder="Enter trainer password"
                    required
                    className="form-input"
                  />
                </>
              )}
              <div className="button-group-this">
                <button type="submit" className="submit-button-this">
                  Add
                </button>
                <button
                  type="button"
                  className="cancel-button-this"
                  onClick={() => setShowOverlay(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Container */}
      <div className="filter-container">
        <div className="filter-item">
          <label htmlFor="type">Training Type:</label>
          <select
            id="type"
            name="type"
            className="dropdown"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="">Select Type</option>
            {trainingTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            id="training-type-add"
            className="add-button"
            onClick={() => {
              setIsAddingType(true);
              setShowOverlay(true);
            }}
          >
            <img src={plusIcon} alt="Add" />
          </button>
        </div>

        <div className="filter-item">
          <label htmlFor="trainerName">Trainer Name:</label>
          <select
            id="trainer_assigned"
            name="trainer_assigned"
            className="dropdown"
            value={filters.trainer_assigned}
            onChange={handleFilterChange}
          >
            <option value="">Select Trainer</option>
            {trainerNames.map((trainer, index) => (
              <option key={index} value={trainer}>
                {trainer}
              </option>
            ))}
          </select>
          <button
            id="trainer-add"
            className="add-button"
            onClick={() => {
              setIsAddingType(false);
              setShowOverlay(true);
            }}
          >
            <img src={plusIcon} alt="Add" />
          </button>
        </div>

        <div className="filter-item">
          <label htmlFor="status">Status:</label>
          <select
            id="status"
            name="status"
            className="dropdown"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Select Status</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="not-started">Not Started</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            name="date"
            className="date-input"
            value={filters.date}
            onChange={handleFilterChange}
          />
        </div>

        <button className="search-button" onClick={applyFilters}>
          Search
        </button>
      </div>

      <div className="results-container">
        <div className="results-header">
          <h3>Results</h3>
          <div className="view-toggle">
            <button onClick={() => setViewMode("cards")}>
              <img src={cardIcon} alt="Cards View" />
              Cards
            </button>
            <button onClick={() => setViewMode("list")}>
              <img src={listIcon} alt="List View" />
              List
            </button>
          </div>
        </div>

        <div className={`results-content ${viewMode}`}>
          {loading ? (
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
          ) : currentPrograms.length > 0 ? (
            viewMode === "cards" ? (
              <div className="cards-view">
                {currentPrograms.map((program) => (
                  <div
                    className="program-card"
                    key={program.id}
                    onClick={() => handleCardClick(program)}
                  >
                    <img
                      src={
                        program.thumbnail || "https://via.placeholder.com/150"
                      }
                      alt={program.title}
                      className="program-thumbnail"
                    />
                    <div className="program-info">
                      <h4>{program.program_title}</h4>
                      <p>
                        <b>Description: </b>
                        {program.description}
                      </p>
                      <p>
                        <b>Trainer Assigned: </b>
                        {program.trainer_assigned}
                      </p>
                      <p>
                        <b>Status: </b>
                        {determineStatus(
                          program.start_date,
                          program.end_date,
                          program.selected_dates
                        )}
                      </p>
                      <p>
                        {program.selected_dates?.length > 0 ? (
                          <>
                            <b>Dates: </b>
                            {program.selected_dates
                              .map((date, index) => {
                                console.log(`Date ${index + 1}:`, date); // ✅ Logs each date object

                                return date?._seconds // 🔥 Corrected: Use `_seconds` instead of `.seconds`
                                  ? new Date(
                                    date._seconds * 1000
                                  ).toLocaleDateString()
                                  : "Invalid Date";
                              })
                              .join(", ")}
                          </>
                        ) : (
                          <>
                            <b>Start: </b>
                            {program.start_date
                              ? new Date(
                                program.start_date * 1000
                              ).toLocaleDateString()
                              : "N/A"}{" "}
                            | <b>End: </b>
                            {program.end_date
                              ? new Date(
                                program.end_date * 1000
                              ).toLocaleDateString()
                              : "N/A"}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="list-view">
                {currentPrograms.map((program) => (
                  <li className="program-list-item" key={program.id}>
                    <h4>{program.program_title}</h4>
                    <p>{program.description}</p>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="no-entries">
              <img src={noItem} alt="No entries" className="no-entries-image" />
              <p>No result found.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredPrograms.length > itemsPerPage && (
            <div className="flex justify-center items-center w-full mt-6 gap-4">
              <button
                className="prev-page px-6 py-2 text-sm font-semibold text-white bg-green-500 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    className={`page-number px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md border border-gray-300 transition duration-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${currentPage === index + 1
                      ? "bg-green-500 text-white border-green-500"
                      : ""
                      }`}
                    onClick={() => handlePageClick(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <button
                className="next-page px-6 py-2 text-sm font-semibold text-white bg-green-500 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-gray-600">
              This could take a while, sip a coffee first ☕
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPrograms;
