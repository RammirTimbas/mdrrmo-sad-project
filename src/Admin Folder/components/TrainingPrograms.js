import React, { useState, useEffect } from "react";
import trainingLogo from "./logo/training_logo.png";
import createLogo from "./logo/post_icon.png";
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
import SubLoading from "../../lottie-files-anim/sub-loading.json";

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
  });

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
    const fetchTrainingTypesAndTrainers = async () => {
      try {
        const trainingTypeSnapshot = await getDocs(
          collection(db, "Training Type")
        );
        const trainingTypeData = trainingTypeSnapshot.docs.map(
          (doc) => doc.data().training_type_name
        );
        setTrainingTypes(trainingTypeData);

        const trainerNameSnapshot = await getDocs(
          collection(db, "Trainer Name")
        );
        const trainerNameData = trainerNameSnapshot.docs.map(
          (doc) => doc.data().trainer_name
        );
        setTrainerNames(trainerNameData);
      } catch (error) {
        console.error("Error fetching training types or trainers:", error);
      }
    };

    fetchTrainingTypesAndTrainers();
  }, []);

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
    const startDate = new Date(newProgram.start_date);
    const endDate = new Date(newProgram.end_date);
    const slotNo = newProgram.slots;
    const now = Date.now();
    const age = newProgram.restriction;

    if (endDate < startDate) {
      Swal.fire({
        title: "Invalid Date",
        text: "End date must be later than the start date.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    } else if (slotNo < 1) {
      Swal.fire({
        title: "Invalid Slot Number",
        text: "Slot number should be not lower than 1",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    } else if (startDate < now) {
      Swal.fire({
        title: "Invalid Date",
        text: "Start date must not be later than today",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    } else if (age && age <= 0) {
      Swal.fire({
        title: "Invalid Input",
        text: "Age restriction could not be lower than 1",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const batchDateCode = startDate.getTime() / 1000;
      // 🔹 Extract initials from program title
      const programInitials = newProgram.program_title
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      // ✅ Extract initials from program type
      const typeInitials = newProgram.type
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      // ✅ Determine batch date (earliest from selected_dates or start_date)
      let batchDate = new Date(batchDateCode * 1000)
        .toLocaleDateString("en-GB")
        .split("/")
        .reverse()
        .join("");

      if (newProgram.selected_dates && newProgram.selected_dates.length > 0) {
        // ✅ Convert Firestore timestamps to JavaScript Dates and find the earliest date
        const earliestDate = Math.min(
          ...newProgram.selected_dates.map((date) => date.toDate().getTime())
        );
        batchDate = new Date(earliestDate)
          .toLocaleDateString("en-GB")
          .split("/")
          .reverse()
          .join("");
      }

      // ✅ Generate random 5-character alphanumeric string
      const randomCode = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

      // ✅ Generate batchCode in correct format
      const batchCode = `${programInitials}-${batchDate}-${typeInitials}-${randomCode}`;

      console.log(`📌 Generated Batch Code: ${batchCode}`);

      await addDoc(collection(db, "Training Programs"), {
        ...newProgram,
        start_date: Math.floor(startDate.getTime() / 1000),
        end_date: Math.floor(endDate.getTime() / 1000),
        slots: Number(newProgram.slots),
        requirements: requirementsList,
        restriction: Number(newProgram.restriction),
        batchCode: batchCode,
      });

      setShowForm(false);
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
      });

      // get updated list of programs
      const querySnapshot = await getDocs(collection(db, "Training Programs"));
      const programsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrograms(programsData);
      setFilteredPrograms(programsData);

      await addDoc(collection(db, "Logs"), {
        name: adminName,
        type: "Program Creation",
        action: "Added Program: " + newProgram.program_title,
        date: new Date(),
      });

      // display success message
      Swal.fire({
        title: "Program Added!",
        text: "The training program has been successfully added.",
        icon: "success",
        confirmButtonText: "OK",
      });

      addNotification(
        "New Programs Available!",
        `Greetings! The MDRRMO - DAET just posted a new training program titled '${newProgram.program_title}'. Check it out!`,
        null
      );
    } catch (error) {
      console.error("Error adding program:", error);
      Swal.fire({
        title: "Error",
        text: "There was an error adding the program. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  Add New Training Program
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-red-600 hover:text-red-800 text-lg red-bg"
                >
                  X
                </button>
              </div>
              <hr></hr>
              <form onSubmit={handleSubmit} className="two-column-form">
                <div className="form-group">
                  <label htmlFor="program_title">Program Title:</label>
                  <input
                    type="text"
                    id="program_title"
                    name="program_title"
                    value={newProgram.program_title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea
                    id="description"
                    name="description"
                    value={newProgram.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="program_venue">Venue:</label>
                  <input
                    type="text"
                    id="program_venue"
                    name="program_venue"
                    value={newProgram.program_venue}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="start_date">Start Date:</label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={newProgram.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">End Date:</label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={newProgram.end_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="materials_needed">Materials Needed:</label>
                  <textarea
                    id="materials_needed"
                    name="materials_needed"
                    value={newProgram.materials_needed}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="requirements">Additional Requirements:</label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    value={newProgram.requirements}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a requirement and press Enter"
                  />
                  <div className="requirements-list">
                    {requirementsList.map((requirement, index) => (
                      <div key={index} className="requirement-tag">
                        <span>{requirement}</span>
                        <button
                          onClick={() => removeRequirement(index)}
                          className="remove-btn10"
                          aria-label="Remove requirement"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="slots">Slots:</label>
                  <input
                    type="number"
                    id="slots"
                    name="slots"
                    value={newProgram.slots}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="trainer_assigned">Trainer Assigned:</label>
                  <select
                    id="trainer_assigned"
                    name="trainer_assigned"
                    className="dropdown"
                    value={newProgram.trainer_assigned}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Trainer</option>
                    {trainerNames.map((trainer, index) => (
                      <option key={index} value={trainer}>
                        {trainer}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="type">Training Type:</label>
                  <select
                    id="type"
                    name="type"
                    className="dropdown"
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
                  <label htmlFor="restriction">Minimum Age:</label>
                  <input
                    type="number"
                    id="restriction"
                    name="restriction"
                    value={newProgram.restriction}
                    onChange={handleInputChange}
                    placeholder="(Leave blank if there's no age restriction)"
                  />
                </div>
                <button type="submit">Post Program</button>
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
            <div className="loading-screen">
              <div className="bg-white p-8 rounded-2xl">
                <div className="w-24 h-24 mb-6">
                  <Lottie animationData={SubLoading} loop={true} />
                </div>
              </div>
            </div>
          ) : filteredPrograms.length > 0 ? (
            viewMode === "cards" ? (
              <div className="cards-view">
                {filteredPrograms.map((program) => (
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
                {filteredPrograms.map((program) => (
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
        </div>
      </div>
    </div>
  );
};

export default TrainingPrograms;
