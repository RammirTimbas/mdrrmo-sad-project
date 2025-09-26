import React, { useEffect, useState, useRef } from "react";
import "./ProgramDetails.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  getDocs,
  query,
  collection,
  where,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import { db, storage } from "./firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { QRCodeCanvas } from "qrcode.react";
import { BrowserQRCodeReader } from "@zxing/library"; //

import * as XLSX from "xlsx";
import { FaClipboard } from "react-icons/fa";
import InviteParModal from "./User Folder/InviteParModal";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import Swal from "sweetalert2";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaListUl,
  FaRegClock,
  FaClipboardList,
} from "react-icons/fa";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const ProgramDetails = ({ userId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { program } = location.state || {}; // get program from state
  const [programDetails, setProgramDetails] = useState(program);
  const [approvedApplicants, setApprovedApplicants] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProgramCompleted, setIsProgramCompleted] = useState(null);

  const [isApplyDisabled, setIsApplyDisabled] = useState(true);
  const [uploadedRequirements, setUploadedRequirements] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false); // For the modal visibility
  const [initialProgramDetails, setInitialProgramDetails] =
    useState(programDetails);
  const [showMore, setShowMore] = useState(false);

  const [activeTab, setActiveTab] = useState("approved"); // default tab

  const [attendanceData, setAttendanceData] = useState([]);
  const [allUsersAttendance, setAllUsersAttendance] = useState([]);

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const [userRole, setUserRole] = useState(null);

  const [requestorId, setRequestorId] = useState(null);
  const [requestorType, setRequestorType] = useState(null);
  const [shareCode, setShareCode] = useState(null);
  const [batchCode, setBatchCode] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [types, setTypes] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const videoRef = useRef(null);
  const [showQRCodeOptions, setShowQRCodeOptions] = useState(false);
  const codeReader = new BrowserQRCodeReader();

  // get date timestamp
  const programStartDate = new Date(program.start_date * 1000);
  const programEndDate = new Date(program.end_date * 1000);

  const [verifyPassword, setVerifyPassword] = useState(""); // state for password input
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [IsDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const requirements = Array.isArray(programDetails?.requirements)
    ? programDetails.requirements
    : [];

  const [materials, setMaterials] = useState({ videoUrls: [], imageUrls: [] });
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const allMaterials = [
    ...(materials.videoUrls || []),
    ...(materials.imageUrls || []),
  ];

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollX = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const index = Math.round(scrollX / width);
    setActivePanel(index);
  };


  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const index = Math.round(scrollLeft / clientWidth);
      setCurrentIndex(index);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll(); // Initialize correct dot on load
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [materials]);

  const scrollToIndex = (index) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (!programDetails?.type) return;

    const fetchMaterials = async () => {
      setLoading(true);
      try {
        // 🔍 Query Firestore for materials matching the program type
        const typeQuery = query(
          collection(db, "Training Type"),
          where("training_type_name", "==", programDetails.type)
        );
        const typeSnapshot = await getDocs(typeQuery);

        if (!typeSnapshot.empty) {
          const typeDoc = typeSnapshot.docs[0]; // Get the first matching document
          setMaterials({
            videoUrls: typeDoc.data().videoUrls || [],
            imageUrls: typeDoc.data().imageUrls || [],
          });
        } else {
          setMaterials({ videoUrls: [], imageUrls: [] }); // No materials found
        }
      } catch (error) {
        console.error("Error fetching materials:", error);
      }
      setLoading(false);
    };

    fetchMaterials();
  }, [programDetails?.type]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // check the role of the current user
        const userRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userProfile = userSnap.data().profile;

          if (userProfile === "admin") {
            setUserRole("admin");
          } else if (userProfile === "user") {
            setUserRole("user");
          }
        }
        const trainerRef = doc(db, "Trainer Name", userId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists() && trainerSnap.data().profile === "trainer") {
          setUserRole("trainer");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      }
    };

    if (userId) {
      fetchUserRole();
    }
  }, [userId]);

  useEffect(() => {
    const fetchTypesAndTrainers = async () => {
      const typesQuerySnapshot = await getDocs(collection(db, "Training Type"));
      const typesList = typesQuerySnapshot.docs.map(
        (doc) => doc.data().training_type_name
      );
      setTypes(typesList);

      const trainersQuerySnapshot = await getDocs(
        collection(db, "Trainer Name")
      );
      const trainersList = trainersQuerySnapshot.docs.map(
        (doc) => doc.data().trainer_name
      );
      setTrainers(trainersList);
    };

    fetchTypesAndTrainers();
  }, []);

  useEffect(() => {
    // starts tye camera if the state is true
    if (showQRScanner) {
      startQRScanner();
    }

    return () => {
      codeReader.reset();
    };
  }, [showQRScanner]);

  useEffect(() => {
    const currentTime = new Date().getTime(); // Current timestamp in milliseconds

    if (program.selected_dates?.length > 0) {
      // ✅ Find the latest date from selected_dates
      const latestDate = Math.max(
        ...program.selected_dates.map((date) => date.seconds * 1000)
      );

      // ✅ Set the program as completed if the latest date has fully passed (end of that day)
      setIsProgramCompleted(currentTime > latestDate + 86399000); // Adding 23h 59m 59s
    } else {
      // ✅ Fallback to checking start_date and end_date
      const programStartDate = program.start_date * 1000;
      const programEndDate = program.end_date * 1000;

      if (programStartDate === programEndDate) {
        // ✅ One-day program: Mark as completed only after the day ends (23:59:59)
        setIsProgramCompleted(currentTime > programEndDate + 86399000);
      } else {
        // ✅ Multi-day program: Mark as completed if end_date has passed
        setIsProgramCompleted(currentTime > programEndDate);
      }
    }
  }, [program.selected_dates, program.start_date, program.end_date]);

  const handleShowQR = () => {
    setShowQRModal(true);
  };

  const verifyAdminPassword = async () => {
    try {
      // get the admins stored hashed password from Firestor
      const userDoc = await getDoc(doc(db, "Users", userId));
      if (!userDoc.exists()) {
        Swal.fire("Error", "Admin not found in the database.", "error");
        return;
      }

      const storedHashedPassword = userDoc.data().password;

      // compare the entered password with the hashed password using bcrypt
      const isPasswordCorrect = await bcrypt.compare(
        verifyPassword,
        storedHashedPassword
      );

      if (isPasswordCorrect) {
        setIsPasswordVerified(true);
        Swal.fire(
          "Password Verified",
          "You may proceed with the deletion.",
          "success"
        );
        setIsDeleteModalOpen(false); // Close modal after successful verification
      } else {
        Swal.fire(
          "Incorrect Password",
          "Please enter the correct password to proceed.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      Swal.fire(
        "Error",
        "Something went wrong while verifying the password.",
        "error"
      );
    }
  };

  const handleDeleteProgram = async () => {
    if (!isPasswordVerified) {
      // if password is not verified, ask to verify password first
      Swal.fire(
        "Password Required",
        "Please verify your password before proceeding.",
        "warning"
      );
      setIsPasswordVerified(false);
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        // proceed to delete the program from the "Training Programs" collection
        await deleteDoc(doc(db, "Training Programs", program.id));
        Swal.fire(
          "Deleted",
          "The program has been deleted successfully.",
          "success"
        );
        navigate(-1);
      } catch (error) {
        console.error("Error deleting program:", error);
        Swal.fire("Error", "There was an issue deleting the program.", "error");
      }
    }
  };

  const handleMarkAttendance = () => {
    setShowQRCodeOptions(true); // show the options modal
  };

  const handleCameraOption = () => {
    setShowQRCodeOptions(false); // close options modal
    setShowQRScanner(true); // open camera scanner
  };

  const handleFilePickerOption = () => {
    setShowQRCodeOptions(false); // Close options modal
    // opens the file input
    document.getElementById("fileInput").click(); //automatically do the click
  };

  useEffect(() => {
    if (!program) return;

    const programRef = doc(db, "Training Programs", program.id);

    const unsubscribe = onSnapshot(programRef, (snapshot) => {
      if (snapshot.exists()) {
        setProgramDetails(snapshot.data());
        setInitialProgramDetails(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [program]);

  useEffect(() => {
    // check if there are requirements and enable/disable
    setIsApplyDisabled(requirements.length > 0);
  }, [requirements]);

  const handleFileUpload = async (event, requirement) => {
    const file = event.target.files[0];
    if (file) {
      const storageRef = ref(
        storage,
        `requirements/${userId}/${program.id}/${requirement}`
      );
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      setUploadedRequirements((prev) => {
        const updatedRequirements = { ...prev, [requirement]: fileUrl };

        // checks if all requirements are filled
        const allRequirementsUploaded = program.requirements.every(
          (req) => updatedRequirements[req]
        );

        // enable apply button if fulfilled
        setIsApplyDisabled(!allRequirementsUploaded);

        return updatedRequirements;
      });
    }
  };

  const startQRScanner = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire(
        "Error",
        "Camera access is not supported on this device or browser.",
        "error"
      );
      return;
    }

    try {
      // stop the previous camera if there is
      if (videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      // get new
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;

      videoRef.current.setAttribute("playsinline", true);
      await videoRef.current.play();

      codeReader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err) => {
          if (result) {
            handleQRScanResult(result, program.id, userId);
            stopCamera(stream);
          }
        }
      );
    } catch (error) {
      Swal.fire("Error", "Failed to access camera. Please try again.", "error");
      console.error("Camera access error:", error);
    }
  };

  // stop the camera function
  const stopCamera = (stream) => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const checkDelete = () => {
    if (!isPasswordVerified) {
      setIsDeleteModalOpen(true);
    } else if (isPasswordVerified) {
      handleDeleteProgram();
    }
  };

  const handleQRUpload = async (event) => {
    setShowQRCodeOptions(false);

    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;

        // image variable for image url
        const img = new Image();
        img.src = imageData;

        img.onload = async () => {
          const codeReader = new BrowserQRCodeReader();

          try {
            const result = await codeReader.decodeFromImage(img);

            handleQRScanResult(result, program.id, userId);
          } catch (err) {
            Swal.fire(
              "Error",
              "No QR code found in the selected image.",
              "error"
            );
          }
        };

        img.onerror = () => {
          Swal.fire(
            "Error",
            "Failed to load image for QR code scanning.",
            "error"
          );
        };
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error decoding QR code from file:", error);
      Swal.fire(
        "Error",
        "Failed to decode QR code from the selected image. Please try again.",
        "error"
      );
    }
  };

  const handleEditFormSubmit = async (event) => {
    event.preventDefault();

    const startDate = new Date(programDetails.start_date * 1000);
    const endDate = new Date(programDetails.end_date * 1000);
    const slotNo = programDetails.slots;
    const now = Date.now();
    const age = programDetails.restriction;

    if (endDate <= startDate) {
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
        text: "Age restriction cannot be less than 1.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    // Extract only the changed fields
    const updatedFields = {};

    if (programDetails.program_title !== initialProgramDetails.program_title) {
      updatedFields.program_title = programDetails.program_title;
    }
    if (programDetails.description !== initialProgramDetails.description) {
      updatedFields.description = programDetails.description;
    }
    if (programDetails.program_venue !== initialProgramDetails.program_venue) {
      updatedFields.program_venue = programDetails.program_venue;
    }
    if (programDetails.type !== initialProgramDetails.type) {
      updatedFields.type = programDetails.type;
    }
    if (
      programDetails.trainer_assigned !== initialProgramDetails.trainer_assigned
    ) {
      updatedFields.trainer_assigned = programDetails.trainer_assigned;
    }
    if (programDetails.slots !== initialProgramDetails.slots) {
      updatedFields.slots = programDetails.slots;
    }
    if (programDetails.start_date !== initialProgramDetails.start_date) {
      updatedFields.start_date = programDetails.start_date;
    }
    if (programDetails.end_date !== initialProgramDetails.end_date) {
      updatedFields.end_date = programDetails.end_date;
    }
    if (
      programDetails.materials_needed !== initialProgramDetails.materials_needed
    ) {
      updatedFields.materials_needed = programDetails.materials_needed;
    }
    if (programDetails.restriction !== initialProgramDetails.restriction) {
      updatedFields.restriction = programDetails.restriction;
    }

    // Ensure you have a valid document reference
    const programRef = doc(db, "Training Programs", program.id);

    try {
      // Update only the fields that have changed
      await updateDoc(programRef, updatedFields);
      Swal.fire(
        "Update Successful",
        "Program details updated succesfully",
        "success"
      );
      setIsModalOpen(false); // Close modal after success
    } catch (error) {
      Swal.fire("Update failed", "Failed to update program details", "error");
    }
  };

  const handleQRScanResult = async (result, expectedProgramId, userId) => {
    setShowQRCodeOptions(false);

    if (!result) return; // Do nothing if no scanned data
    setShowQRScanner(false); // Close scanner modal

    // Get the text from QR
    const qrText = result.text.trim();

    if (typeof qrText !== "string") {
      Swal.fire("Error", "QR scan result is not a valid string.", "error");
      return;
    }

    try {
      // Get today's relevant date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Fix splitting to correctly extract program ID and date
      const lastDashIndex = qrText.lastIndexOf("-");
      if (lastDashIndex === -1) {
        Swal.fire("Error", "Invalid QR code format.", "error");
        return;
      }

      const splitQR = qrText.split("-");

      const scannedProgramId = splitQR.slice(0, splitQR.length - 3).join("-");

      // Extract scanned date (last 3 parts joined as YYYY-MM-DD)
      const scannedDate = splitQR.slice(-3).join("-");

      console.log("Scanned Program ID:", scannedProgramId);
      console.log("Expected Program ID:", expectedProgramId);
      console.log("Scanned Date:", scannedDate);
      console.log("Today's Date:", today);

      // Compare scannedProgramId with expectedProgramId
      if (scannedProgramId !== expectedProgramId) {
        Swal.fire(
          "Error",
          `Wrong QR code for this program.` + scannedProgramId,
          "error"
        );
        return;
      }

      // Compare scannedDate with today's date
      if (scannedDate !== today) {
        Swal.fire("Error", `Invalid QR Code for Today.`, "error");
        return;
      }

      const programRef = doc(db, "Training Programs", scannedProgramId);
      const programDoc = await getDoc(programRef);

      if (!programDoc.exists()) {
        Swal.fire("Error", "Program not found.", "error");
        return;
      }

      // Check if the user is an approved applicant
      const approvedApplicants = programDoc.data().approved_applicants;
      let applicationId = null;

      for (const [appId, applicantData] of Object.entries(approvedApplicants)) {
        if (applicantData.user_id === userId) {
          applicationId = appId;
          break;
        }
      }

      if (!applicationId) {
        Swal.fire(
          "Error",
          "No application found for this user in the program.",
          "error"
        );
        return;
      }

      // Check if the user has already checked in for today
      const attendanceRecords =
        approvedApplicants[applicationId].attendance || [];
      const alreadyCheckedIn = attendanceRecords.some(
        (entry) => entry.date === today
      );

      if (alreadyCheckedIn) {
        Swal.fire("Error", "You have already checked in for today.", "info");
        return;
      }

      // Create a new attendance entry
      const newAttendanceEntry = { date: today, remark: "present" };

      await updateDoc(programRef, {
        [`approved_applicants.${applicationId}.attendance`]:
          arrayUnion(newAttendanceEntry),
      });

      Swal.fire(
        "Success!",
        "Attendance marked as present for today.",
        "success"
      );
    } catch (error) {
      console.error("Error marking attendance:", error);
      Swal.fire(
        "Error",
        "Could not mark attendance. Please try again.",
        "error"
      );
    }
  };

  const generateDateRange = (start, end) => {
    const dates = [];
    let currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0); // Ensure start date is normalized

    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0); // Ensure end date is normalized

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate)); // Push a fresh Date instance

      // Move to the next day safely without modifying the original object
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // 🔹 Normalize Firestore/epoch dates into JS Date
  const normalizeDates = (program) => {
    if (program.dateMode === "range") {
      if (program.start_date && program.end_date) {
        // Generate all dates between start and end (inclusive)
        const start = new Date(program.start_date * 1000);
        const end = new Date(program.end_date * 1000);
        const dates = [];
        let current = new Date(start);
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        return dates;
      }
    } else if (
      program.dateMode === "specific" &&
      Array.isArray(program.selected_dates)
    ) {
      return program.selected_dates
        .map((d) => {
          if (d?.seconds) return new Date(d.seconds * 1000);
          if (d?._seconds) return new Date(d._seconds * 1000);
          if (typeof d === "number") return new Date(d * 1000);
          return new Date(d);
        })
        .filter((d) => !isNaN(d)) // remove invalid
        .sort((a, b) => a - b); // keep in order
    }
    return [];
  };

  // 🔹 Build dateRange properly
  const dateRange = normalizeDates(program);

  const getRelevantDate = (dateRange) => {
    if (!dateRange.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const date of dateRange) {
      if (today <= date) return date;
    }
    return dateRange[dateRange.length - 1];
  };

  const relevantDate = getRelevantDate(dateRange);

  const formatDateToLocal = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  };

  const formattedRelevantDate = formatDateToLocal(relevantDate);

  //get attendace data
  useEffect(() => {
    const programRef = doc(db, "Training Programs", program.id);

    const unsubscribe = onSnapshot(programRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const applicants = data.approved_applicants || {};

        const attendanceList = Object.keys(applicants).map((applicantId) => {
          const applicant = applicants[applicantId];

          console.log("name: " + applicant.full_name);

          return {
            user_id: applicant.user_id,
            full_name: applicant.full_name,
            attendance: applicant.attendance || {},
          };
        });
        console.log("Attendance List:", attendanceList);

        setAllUsersAttendance(attendanceList);

        setAttendanceData(attendanceList);
      }
    });

    return () => unsubscribe();
  }, [program.id]);

  const handleDownloadAttendance = async (dateRange, program) => {
    try {
      if (
        !program?.approved_applicants ||
        Object.keys(program.approved_applicants).length === 0
      ) {
        console.error("No approved applicants available.");
        return;
      }

      // 🔹 Compute valid date range
      let startDate = null;
      let endDate = null;

      if (
        program.dateMode === "range" &&
        program.start_date &&
        program.end_date
      ) {
        startDate = new Date(program.start_date * 1000);
        endDate = new Date(program.end_date * 1000);
      } else if (
        program.dateMode === "specific" &&
        Array.isArray(program.selected_dates) &&
        program.selected_dates.length > 0
      ) {
        const dates = program.selected_dates
          .map((d) => {
            if (d?._seconds) return new Date(d._seconds * 1000);
            if (d?.seconds) return new Date(d.seconds * 1000);
            if (typeof d === "number") return new Date(d * 1000);
            return new Date(d);
          })
          .filter((d) => !isNaN(d));

        if (dates.length > 0) {
          dates.sort((a, b) => a - b);
          startDate = dates[0];
          endDate = dates[dates.length - 1];
        }
      }

      // 🚨 Fallback if still missing
      if (!startDate || !endDate) {
        console.warn("⚠️ No valid program dates, using today instead.");
        startDate = new Date();
        endDate = new Date();
      }

      // 🔹 Normalize date range in Manila timezone
      const dateRange = [startDate, endDate].map((d) =>
        d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
      );

      // 🔹 Convert applicants map to array
      const allUsersAttendance = Object.values(program.approved_applicants).map(
        (applicant) => {
          const attendanceRecords = applicant.attendance ?? [];
          const attendance = dateRange.map((date) => {
            const record = attendanceRecords.find((r) => r.date === date);
            return {
              date,
              remark: record?.remark ?? "absent",
            };
          });

          return {
            user_id: applicant.user_id,
            full_name: applicant.full_name,
            gender: applicant.gender || "N/A",
            school_agency: applicant.school_agency || "N/A",
            agency_office: applicant.office_agency || "N/A",
            cellphone_no: applicant.cellNo || "N/A",
            attendance,
          };
        }
      );

      console.log("📤 Sending to backend:", {
        dateRange,
        program,
        allUsersAttendance,
      });

      // 🔹 Send to backend
      const response = await fetch(`${API_BASE_URL}/download-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allUsersAttendance,
          dateRange,
          program,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate attendance report");

      // 🔹 Download file
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Attendance_Report_${program.program_title}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("❌ Error downloading attendance report:", error);
    }
  };

  const uploadDocumentsToFirebase = async () => {
    try {
      for (const requirement in uploadedFiles) {
        const file = uploadedFiles[requirement];
        const storageRef = ref(
          storage,
          `requirements/${userId}_${program.id}/${requirement}`
        );
        await uploadBytes(storageRef, file);
      }
      Swal.fire("Success!", "Documents uploaded successfully!", "success");
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      Swal.fire("Error", "Error uploading files. Please try again.", "error");
    }
  };

  useEffect(() => {
    if (!program) return;

    // get approved applicants
    const fetchApprovedApplicants = async () => {
      try {
        const programRef = doc(db, "Training Programs", program.id);

        // onsnapshot to listen for realtime updates
        onSnapshot(programRef, async (programDoc) => {
          try {
            const programData = programDoc.data();
            const approved = programData.approved_applicants || {};

            setRequestorId(programData.requestor_id || null);
            setRequestorType(programData.requestor_type ? programData.requestor_type.toLowerCase() : null);
            setShareCode(programData.share_code || null);
            setBatchCode(programData.batchCode || null);

            // handle fetching user info for each applicant
            const applicantsList = await Promise.all(
              Object.entries(approved).map(
                async ([applicationId, applicant]) => {
                  console.log("Applicant:", applicant);

                  if (!applicant.user_id) {
                    return null;
                  }

                  try {
                    // fetch user information
                    const userInfoSnapshot = await getDocs(
                      query(
                        collection(db, "User Informations"),
                        where("user_ID", "==", applicant.user_id)
                      )
                    );

                    if (!userInfoSnapshot.empty) {
                      const userInfo = userInfoSnapshot.docs[0].data();
                      return {
                        user_id: applicant.user_id,
                        application_id: applicationId,
                        status: applicant.status,
                        full_name: userInfo.full_name,
                        gender: userInfo.gender,
                        school_agency: userInfo.school_agency,
                        crf: userInfo.crf,
                        office_agency: userInfo.school_agency,
                        cellNo: userInfo.mobile_number,
                      };
                    }
                    return null;
                  } catch (error) {
                    console.error(
                      "Error fetching user information for user ID:",
                      applicant.user_id,
                      error
                    );
                    return null;
                  }
                }
              )
            );

            setApprovedApplicants(
              applicantsList.filter((applicant) => applicant !== null)
            );
          } catch (error) {
            console.error(
              "Error processing program data or approved applicants:",
              error
            );
          }
        });
      } catch (error) {
        console.error(
          "Error fetching approved applicants or setting up snapshot listener:",
          error
        );
      }
    };

    fetchApprovedApplicants();
  }, [program]);

  const handleApply = async () => {
    if (isApplyDisabled) {
      Swal.fire(
        "Requirements Missing",
        "Please upload all necessary requirements.",
        "warning"
      );
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Application",
      text: "Do you really want to apply for this program?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, apply!",
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);

      // Fetch latest program snapshot
      const programRef = doc(db, "Training Programs", program.id);
      const programSnapshot = await getDoc(programRef);
      if (!programSnapshot.exists()) {
        Swal.fire("Error", "Program not found.", "error");
        return;
      }
      const programData = programSnapshot.data();

      // ✅ SLOT CHECK
      if (programData.slots <= 0) {
        Swal.fire(
          "No Slots Available",
          "Sorry, no more slots available.",
          "info"
        );
        return;
      }

      // ✅ DUPLICATE CHECK
      const existingApplication = await getDocs(
        query(
          collection(db, "User History"),
          where("user_id", "==", userId),
          where("program_id", "==", program.id)
        )
      );
      if (!existingApplication.empty) {
        Swal.fire(
          "Already Applied",
          "You already applied for this program.",
          "info"
        );
        return;
      }

      // ✅ CONFLICT CHECK
      let startDate = null;
      let endDate = null;
      let selectedDates = [];

      if (programData.dateMode === "range") {
        // Range mode
        if (programData.start_date && programData.end_date) {
          startDate = new Date(programData.start_date * 1000);
          endDate = new Date(programData.end_date * 1000);
        }
      } else if (programData.dateMode === "specific") {
        // Specific dates mode
        if (
          Array.isArray(programData.selected_dates) &&
          programData.selected_dates.length > 0
        ) {
          selectedDates = programData.selected_dates
            .map((d) => {
              if (d?.seconds) return new Date(d.seconds * 1000); // Firestore Timestamp
              if (typeof d === "number") return new Date(d * 1000); // numeric seconds
              return new Date(d); // JS Date string or object
            })
            .filter((d) => !isNaN(d));

          // Sort and pick earliest & latest
          selectedDates.sort((a, b) => a - b);
          startDate = selectedDates[0];
          endDate = selectedDates[selectedDates.length - 1];
        }
      }

      if (!startDate || !endDate) {
        Swal.fire(
          "Error",
          "Program has no valid dates (range or selected).",
          "error"
        );
        return;
      }

      // ✅ Conflict with other programs
      const conflictingPrograms = await getDocs(
        query(
          collection(db, "User History"),
          where("user_id", "==", userId),
          where("start_date", "<=", endDate),
          where("end_date", ">=", startDate)
        )
      );
      if (!conflictingPrograms.empty) {
        Swal.fire(
          "Conflict Detected",
          "You already have a program scheduled during these dates.",
          "warning"
        );
        return;
      }

      // ✅ AGE CHECK
      const userInfoSnapshot = await getDocs(
        query(
          collection(db, "User Informations"),
          where("user_ID", "==", userId)
        )
      );
      if (userInfoSnapshot.empty) {
        Swal.fire("Error", "User information not found.", "error");
        return;
      }
      const userInfo = userInfoSnapshot.docs[0].data();
      if (programData.restriction && userInfo.age < programData.restriction) {
        Swal.fire(
          "Age Restriction",
          `You must be at least ${programData.restriction} years old to apply.`,
          "warning"
        );
        return;
      }

      // ✅ SAVE APPLICATION
      const applicantData = {
        user_id: userId,
        program_id: program.id,
        full_name: userInfo.full_name,
        email: userInfo.email,
        age: userInfo.age,
        barangay: userInfo.barangay,
        municipality: userInfo.municipality,
        province: userInfo.province,
        program_title: programData.program_title,
        dateMode: programData.dateMode,
        start_date: startDate,
        end_date: endDate,
        selected_dates: selectedDates,
        trainer_assigned: programData.trainer_assigned,
        materials_needed: programData.materials_needed,
        status: "pending",
        application_date: new Date(),
        uploadedRequirements,
      };

      await setDoc(
        doc(db, "Applicants", `${userId}_${program.id}`),
        applicantData
      );

      const historyData = {
        user_id: userId,
        program_id: program.id,
        program_title: programData.program_title,
        application_date: new Date(),
        dateMode: programData.dateMode,
        start_date: startDate,
        end_date: endDate,
        selected_dates: selectedDates,
        status: "pending",
      };

      await setDoc(
        doc(db, "User History", `${userId}_${program.id}`),
        historyData
      );

      Swal.fire(
        "Application Successful",
        "Your application has been submitted!",
        "success"
      );
    } catch (error) {
      console.error("Error applying for the program:", error);
      Swal.fire(
        "Error",
        "Error applying for the program: " + error.message,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (applicant) => {
    navigate(`/admin/training-programs/user-history/${applicant.user_id}`, {
      state: {
        viewId: applicant.user_id,
        role: "admin",
        name: applicant.full_name,
      },
    });
  };

  if (!programDetails) {
    return <div>Loading program details...</div>;
  }

  const isUserApproved = approvedApplicants.some(
    (applicant) =>
      applicant.user_id === userId && applicant.status === "approved"
  );

  const isUserRequestor = userId === requestorId;

  const copyShareCodeToClipboard = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      Swal.fire({
        title: "Copied to clipboard!",
        icon: "success",
        timer: 1000, // Auto close after 1 second
        showConfirmButton: false,
      });
    }
  };

  const handleDownloadCRF = (applicant) => {
    if (!applicant.crf) {
      console.error("❌ No CRF link found for this applicant.");
      return;
    }

    // Open the CRF link in a new tab
    window.open(applicant.crf, "_blank");
  };

  const handleBatchCRFDownload = async () => {
    if (!approvedApplicants || approvedApplicants.length === 0) {
      Swal.fire({
        title: "No Data",
        text: "No approved applicants to work on",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    setIsDownloading(true); // Show modal
    setDownloadProgress(0);

    const zip = new JSZip();
    let completed = 0;

    const downloadFile = async (url, fileName) => {
      try {
        console.log(`📥 Downloading: ${fileName} from ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch");

        const blob = await response.blob();
        zip.file(fileName, blob);
        completed++;
        setDownloadProgress(
          Math.round((completed / approvedApplicants.length) * 100)
        );
      } catch (error) {
        console.error(`❌ Failed to download ${fileName}:`, error);
      }
    };

    // ✅ Ensure the CRF URLs are correct
    const validApplicants = approvedApplicants.filter(
      (applicant) => applicant.crf
    );

    if (validApplicants.length === 0) {
      console.warn("⚠️ No valid CRFs to download.");
      setIsDownloading(false);
      return;
    }

    const downloadPromises = validApplicants.map((applicant) => {
      const fileName = `${applicant.full_name.replace(/\s+/g, "_")}_CRF.docx`;
      return downloadFile(applicant.crf, fileName);
    });

    await Promise.all(downloadPromises); // Wait for all downloads to complete

    let nameToUse = "";
    if (!batchCode) {
      nameToUse = "Approved_Applicants_CRFs.zip";
    } else {
      nameToUse = `${batchCode}.zip`;
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${nameToUse}`);
      setIsDownloading(false); // Hide modal
      setDownloadProgress(0);
    });
  };

  // Assuming start_time is in 24-hour format (e.g., "08:00")
  const formatTime = (time) => {
    if (!time) {
      return;
    }
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(hours, minutes);

      // Convert time to 12-hour format with AM/PM
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="program-details-fullscreen">
      <div className="program-details-content">
        <div className="program-header">
          <div className="back-button-container">
            <button
              className="back-button bg-transparent text-red-500 text-sm sm:text-base"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>

          <h1 className="details-title text-xl sm:text-2xl font-semibold text-gray-800 mt-3 sm:mt-4">
            {programDetails.program_title}
          </h1>

          {/* Desktop Layout */}
          <div className="hidden lg:flex flex-row gap-6 p-6 bg-white shadow-lg rounded-xl">
            {/* Thumbnail Section */}
            <div className="w-1/3 h-80">
              <img
                src={programDetails.thumbnail}
                alt={programDetails.program_title}
                className="w-full h-full object-cover rounded-lg border"
              />
            </div>

            {/* Details Section */}
            <div className="w-2/3 space-y-4 text-base text-gray-700">

              {/* Program Description */}
              <div className="text-gray-600">
                <strong>Description:</strong> {programDetails.description}
              </div>

              {/* Always show the details (no See More) */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-500" />
                  <strong>Venue:</strong> {programDetails.program_venue || "TBA"}
                </div>

                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher className="text-gray-500" />
                  <strong>Trainer:</strong> {programDetails.trainer_assigned}
                </div>

                <div className="flex items-center gap-2">
                  <FaClipboardList className="text-gray-500" />
                  <strong>Slots Left:</strong> {programDetails.slots}
                </div>

                {/* Dates */}
                {programDetails.selected_dates?.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-500" />
                    <strong>Dates:</strong>{" "}
                    {programDetails.selected_dates
                      .map((date) =>
                        new Date(date.seconds * 1000).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      )
                      .join(", ")}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      <strong>Start:</strong>{" "}
                      {programDetails.start_date
                        ? new Date(programDetails.start_date * 1000).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                        : "N/A"}
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      <strong>End:</strong>{" "}
                      {programDetails.end_date
                        ? new Date(programDetails.end_date * 1000).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                        : "N/A"}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <FaRegClock className="text-gray-500" />
                  <strong>Time:</strong>{" "}
                  {formatTime(programDetails.start_time) || "Not specified"}
                </div>

                <div className="flex items-start gap-2">
                  <strong>Requirements:</strong>
                  <ul className="list-disc list-inside pl-6">
                    {requirements.length > 0 ? (
                      requirements.map((req, i) => <li key={i}>{req.trim()}</li>)
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>

                <div className="flex items-center gap-2">
                  <strong>Materials Needed:</strong> {programDetails.materials_needed}
                </div>

                <div className="flex items-center gap-2">
                  <strong>Minimum Age:</strong>{" "}
                  {programDetails.restriction || "None"}
                </div>
              </div>
            </div>
          </div>


          {/* Mobile Layout */}
          <div className="lg:hidden relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="overflow-x-auto flex snap-x snap-mandatory gap-4 pb-6 scrollbar-hide"
            >
              {/* Panel 1 */}
              <div className="min-w-full snap-start bg-white rounded-xl shadow-md p-4 flex flex-col">
                <img
                  src={programDetails.thumbnail}
                  alt={programDetails.program_title}
                  className="w-full h-56 object-cover rounded-lg mb-4"
                />
                <h2 className="text-lg font-bold text-gray-800">
                  {programDetails.program_title}
                </h2>
                <p className="text-gray-600 mt-2 text-sm">{programDetails.description}</p>
              </div>

              <div className="min-w-full snap-start bg-white rounded-xl shadow-md p-4 flex flex-col space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-500" />
                  <span><strong>Venue:</strong> {programDetails.program_venue || "TBA"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher className="text-gray-500" />
                  <span><strong>Trainer:</strong> {programDetails.trainer_assigned}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FaClipboardList className="text-gray-500" />
                  <span><strong>Slots Left:</strong> {programDetails.slots}</span>
                </div>

                {/* Dates */}
                {programDetails.selected_dates?.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-500" />
                    <span>
                      <strong>Dates:</strong>{" "}
                      {programDetails.selected_dates
                        .map((date) =>
                          new Date(date.seconds * 1000).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        )
                        .join(", ")}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      <span>
                        <strong>Start:</strong>{" "}
                        {programDetails.start_date
                          ? new Date(programDetails.start_date * 1000).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      <span>
                        <strong>End:</strong>{" "}
                        {programDetails.end_date
                          ? new Date(programDetails.end_date * 1000).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                          : "N/A"}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <FaRegClock className="text-gray-500" />
                  <span>
                    <strong>Time:</strong> {formatTime(programDetails.start_time) || "Not specified"}
                  </span>
                </div>

                <div>
                  <strong>Requirements:</strong>
                  <ul className="list-disc list-inside pl-4 mt-1">
                    {requirements.length > 0 ? (
                      requirements.map((req, i) => <li key={i}>{req.trim()}</li>)
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>

                <div>
                  <strong>Materials:</strong> {programDetails.materials_needed}
                </div>

                <div>
                  <strong>Minimum Age:</strong> {programDetails.restriction || "None"}
                </div>
              </div>
            </div>

            {/* Custom Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full transition ${activePanel === i ? "bg-blue-600" : "bg-blue-300"
                    }`}
                ></span>
              ))}
            </div>
          </div>

        </div>


        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          {userRole === "user" && (
            <>
              {!isProgramCompleted && isUserApproved && (
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
                  onClick={handleMarkAttendance}
                >
                  Mark Attendance
                </button>
              )}
              {!isProgramCompleted &&
                !isUserApproved &&
                requestorType !== "facilitator" && (
                  <>
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
                      onClick={handleApply}
                    >
                      Apply Now
                    </button>
                    <button
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg shadow disabled:opacity-50"
                      onClick={() => setShowUploadModal(true)}
                      disabled={requirements.length === 0}
                    >
                      Upload Requirements
                    </button>
                  </>
                )}
              {isUserRequestor && (
                <>
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    Invite Participants
                  </button>
                  <button
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow flex items-center"
                    onClick={copyShareCodeToClipboard}
                  >
                    <FaClipboard className="mr-2" />
                    Copy Share Code
                  </button>
                </>
              )}
            </>
          )}

          {userRole === "trainer" && (
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow"
              onClick={handleShowQR}
            >
              Show QR Code
            </button>
          )}

          {userRole === "admin" && (
            <>
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow"
                onClick={() => {
                  if (
                    programDetails.start_date <= Date.now() / 1000 ||
                    programDetails.end_date <= Date.now() / 1000
                  ) {
                    Swal.fire({
                      title: "Cannot Edit Program",
                      text: "This program has already started or ended.",
                      icon: "warning",
                      confirmButtonText: "OK",
                    });
                  } else {
                    setIsModalOpen(true);
                  }
                }}
              >
                Edit Details
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
                onClick={checkDelete}
              >
                Delete
              </button>
            </>
          )}
        </div>

        <div className="program-details-container">
          {/* Tab Navigation */}
          <div className="tab-container">
            <div
              className={`tab ${activeTab === "approved" ? "active" : ""}`}
              onClick={() => setActiveTab("approved")}
            >
              Applicants
            </div>

            <div
              className={`tab ${activeTab === "attendance" ? "active" : ""} ${!(
                isUserApproved ||
                userRole === "admin" ||
                userRole === "trainer" ||
                requestorType === "facilitator"
              )
                ? "disabled"
                : ""
                }`}
              onClick={() =>
                (isUserApproved ||
                  userRole === "admin" ||
                  userRole === "trainer" ||
                  requestorType === "facilitator") &&
                setActiveTab("attendance")
              }
            >
              {userRole === "user" &&
                requestorType !== "facilitator"
                ? "Your Attendance"
                : "Attendance"}
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {(userRole === "user" || userRole === "trainer" || requestorType === "facilitator") && (
              <>
                {activeTab === "approved" && (
                  <div className="bg-gray-50">
                    <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6">
                      {approvedApplicants.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-xs sm:text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-600">Full Name</th>
                                <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-600">Gender</th>
                                <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-600">School Agency</th>
                                <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvedApplicants
                                .slice()
                                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                                .map((applicant) => (
                                  <tr key={`${applicant.user_id}_${applicant.program_id}`} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-2 sm:px-4 py-2 text-gray-800">{applicant.full_name}</td>
                                    <td className="px-2 sm:px-4 py-2 text-gray-800">{applicant.gender}</td>
                                    <td className="px-2 sm:px-4 py-2 text-gray-800">{applicant.school_agency}</td>
                                    <td className="px-2 sm:px-4 py-2 text-gray-800">{applicant.status}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm sm:text-base">No approved applicants found for this program.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {(userRole === "admin" || requestorType === "facilitator") && (
              <>
                {activeTab === "approved" && (
                  <div className="table-container bg-white shadow-lg rounded-lg p-4 sm:p-6">
                    <div className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-semibold">Approved Applicants</h2>
                      <button
                        onClick={handleBatchCRFDownload}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm hover:bg-blue-700 transition"
                      >
                        Batch Download CRF
                      </button>
                    </div>
                    {approvedApplicants.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs sm:text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 text-left">Full Name</th>
                              <th className="px-2 sm:px-4 py-2 text-left">Gender</th>
                              <th className="px-2 sm:px-4 py-2 text-left">School</th>
                              <th className="px-2 sm:px-4 py-2 text-left">Status</th>
                              <th className="px-2 sm:px-4 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {approvedApplicants
                              .slice()
                              .sort((a, b) => a.full_name.localeCompare(b.full_name))
                              .map((applicant) => (
                                <tr key={`${applicant.user_id}_${applicant.program_id}`} className="border-b">
                                  <td className="px-2 sm:px-4 py-2">{applicant.full_name}</td>
                                  <td className="px-2 sm:px-4 py-2">{applicant.gender}</td>
                                  <td className="px-2 sm:px-4 py-2">{applicant.school_agency}</td>
                                  <td className="px-2 sm:px-4 py-2">{applicant.status}</td>
                                  <td className="px-2 sm:px-4 py-2 flex flex-col sm:flex-row gap-2">
                                    <button
                                      onClick={() => handleView(applicant)}
                                      className="bg-gray-200 px-2 py-1 rounded-md text-xs sm:text-sm hover:bg-gray-300"
                                    >
                                      View History
                                    </button>
                                    <button
                                      onClick={() => handleDownloadCRF(applicant)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs sm:text-sm hover:bg-blue-700"
                                    >
                                      Download CRF
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No approved applicants found.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "attendance" && (
              <div className="table-container bg-white shadow-lg rounded-lg p-4 sm:p-6">
                <div className="attendance-tab">
                  {(userRole === "admin" || userRole === "trainer" || requestorType === "facilitator") ? (
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold mb-2">Attendance Overview</h2>
                      <p className="text-gray-500 text-sm sm:text-base mb-4">Manage attendance for all users.</p>
                      <button
                        onClick={() =>
                          handleDownloadAttendance(
                            programDetails.selected_dates?.length > 0 ? programDetails.selected_dates : dateRange,
                            program
                          )
                        }
                        className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm hover:bg-blue-700 transition mb-4"
                      >
                        Export to Excel
                      </button>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs sm:text-sm text-center">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 sm:px-4 py-2">Full Name</th>
                              {(programDetails.selected_dates?.length > 0 ? programDetails.selected_dates : dateRange).map(
                                (date) => {
                                  const formattedDate = new Date(
                                    date.seconds ? date.seconds * 1000 : date
                                  ).toLocaleDateString("en-CA");
                                  return (
                                    <th key={formattedDate} className="px-2 sm:px-4 py-2">{formattedDate}</th>
                                  );
                                }
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {allUsersAttendance.map(({ user_id, attendance, full_name }) => (
                              <tr key={user_id} className="border-b">
                                <td className="px-2 sm:px-4 py-2">{full_name}</td>
                                {(programDetails.selected_dates?.length > 0 ? programDetails.selected_dates : dateRange).map(
                                  (date) => {
                                    const formattedDate = new Date(
                                      date.seconds ? date.seconds * 1000 : date
                                    ).toLocaleDateString("en-CA");
                                    let status = "No Data";
                                    const today = new Date().toLocaleDateString("en-CA");
                                    if (attendance) {
                                      Object.values(attendance).forEach((record) => {
                                        if (record.date === formattedDate) status = record.remark;
                                      });
                                    }
                                    if (status === "No Data" && formattedDate < today) {
                                      status = "absent";
                                    }
                                    return (
                                      <td
                                        key={`${user_id}_${formattedDate}`}
                                        className={`px-2 sm:px-4 py-2 capitalize text-center ${status === "present"
                                          ? "text-green-600"
                                          : status === "absent"
                                            ? "text-red-600"
                                            : "text-gray-400"
                                          }`}
                                      >
                                        {status}
                                      </td>
                                    );
                                  }
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-xs sm:text-sm text-center">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 sm:px-4 py-2">Date</th>
                            <th className="px-2 sm:px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(programDetails.selected_dates?.length > 0 ? programDetails.selected_dates : dateRange).map(
                            (date) => {
                              const formattedDate = new Date(
                                date.seconds ? date.seconds * 1000 : date
                              ).toLocaleDateString("en-CA");
                              let status = "No Data";
                              const today = new Date().toLocaleDateString("en-CA");
                              if (attendanceData.length > 0) {
                                attendanceData.forEach((applicant) => {
                                  if (applicant.attendance && Array.isArray(applicant.attendance)) {
                                    applicant.attendance.forEach((record) => {
                                      if (record.date === formattedDate) status = record.remark;
                                    });
                                  }
                                });
                              }
                              if (status === "No Data" && formattedDate < today) {
                                status = "absent";
                              }
                              return (
                                <tr key={formattedDate}>
                                  <td className="px-2 sm:px-4 py-2">{formattedDate}</td>
                                  <td
                                    className={`px-2 sm:px-4 py-2 capitalize text-center ${status === "present"
                                      ? "text-green-600"
                                      : status === "absent"
                                        ? "text-red-600"
                                        : "text-gray-400"
                                      }`}
                                  >
                                    {status}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 text-center sm:text-left">
            {programDetails.type} - Training Materials
          </h3>

          {allMaterials.length > 0 ? (
            <>
              {/* Scrollable Container */}
              <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto space-x-4 snap-x snap-mandatory scroll-smooth scrollbar-hide px-1"
                style={{ scrollBehavior: "smooth" }}
              >
                {/* Videos */}
                {materials.videoUrls?.map((vidUrl, index) => (
                  <div
                    key={`video-${index}`}
                    className="relative group snap-center flex-shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[40%] xl:w-[30%]"
                  >
                    <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-[315px]">
                      <video
                        controls
                        className="w-full h-full object-cover rounded-md shadow-md"
                      >
                        <source src={vidUrl} type="video/mp4" />
                      </video>
                    </div>
                  </div>
                ))}

                {/* Images */}
                {materials.imageUrls?.map((imgUrl, index) => (
                  <div
                    key={`image-${index}`}
                    className="relative group snap-center flex-shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[40%] xl:w-[30%]"
                  >
                    <img
                      src={imgUrl}
                      alt="Training Material"
                      className="w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-[315px] object-cover rounded-md shadow-md"
                    />
                  </div>
                ))}
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center mt-4 space-x-2">
                {allMaterials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToIndex(index)}
                    className={`h-2 w-2 rounded-full transition-all duration-300 focus:outline-none ${currentIndex === index ? "bg-blue-600 scale-125" : "bg-gray-400"
                      }`}
                  ></button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center sm:text-left">
              No training materials available.
            </p>
          )}
        </div>


        {showQRCodeOptions && (
          <div className="overlay-qr-options">
            <div className="qr-code-options-modal">
              <h3>Select QR Code Scanning Method</h3>
              <button onClick={handleCameraOption}>Open Camera</button>
              <button onClick={handleFilePickerOption}>Upload QR Code</button>
              <button onClick={() => setShowQRCodeOptions(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showQRModal && (
          <div className="qr-modal">
            <div className="qr-code-container">
              <h3>Scan QR Code for Attendance Code: </h3>
              <p>
                {relevantDate ? relevantDate.toDateString() : "No valid date"}
              </p>
              <QRCodeCanvas
                value={`${program.id}-${formattedRelevantDate}`}
                size={256}
              />
              <button onClick={() => setShowQRModal(false)}>Close</button>
            </div>
          </div>
        )}

        {showQRScanner && (
          <div className="qr-scanner-modal">
            <video ref={videoRef} style={{ width: "100%" }} />
            <button
              onClick={() => {
                // stop the camera stream
                if (videoRef.current && videoRef.current.srcObject) {
                  const stream = videoRef.current.srcObject;
                  const tracks = stream.getTracks();

                  tracks.forEach((track) => {
                    track.stop();
                  });
                  videoRef.current.srcObject = null;
                }
                setShowQRScanner(false);
              }}
              style={{ position: "absolute", top: "20px", right: "20px" }}
            >
              Close Camera
            </button>
          </div>
        )}

        {isInviteModalOpen && (
          <InviteParModal
            onClose={() => setIsInviteModalOpen(false)}
            programId={program.id}
            requestorId={requestorId}
          />
        )}

        <input
          type="file"
          accept="image/*"
          id="fileInput"
          onChange={handleQRUpload}
          style={{ display: "none" }}
        />

        {showUploadModal && (
          <div className="upload-modal-overlay">
            <div className="upload-modal-content">
              <button
                className="close-modal-button"
                onClick={() => setShowUploadModal(false)}
              >
                &times;
              </button>
              <h2>Upload Requirements</h2>
              {requirements.length > 0 ? (
                requirements.map((requirement, index) => (
                  <div key={index}>
                    <label>{requirement}</label>
                    <input
                      type="file"
                      onChange={(event) => handleFileUpload(event, requirement)}
                    />
                  </div>
                ))
              ) : (
                <p>No requirements to upload</p>
              )}
              <button
                onClick={uploadDocumentsToFirebase}
                disabled={requirements.length === 0}
                className={`upload-button ${requirements.length === 0 ? "disabled" : ""
                  }`}
              >
                Upload
              </button>
              <button onClick={() => setShowUploadModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Program Details</h2>
              <form onSubmit={handleEditFormSubmit} className="modal-form">
                <div className="form-group-1" id="program-title-group">
                  <label htmlFor="program-title">Program Title:</label>
                  <input
                    type="text"
                    id="program-title"
                    value={programDetails.program_title}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        program_title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="description-group">
                  <label htmlFor="description">Description:</label>
                  <textarea
                    id="description"
                    value={programDetails.description}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="venue-group">
                  <label htmlFor="program-venue">Venue:</label>
                  <input
                    type="text"
                    id="program-venue"
                    value={programDetails.program_venue}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        program_venue: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="type-group">
                  <label htmlFor="program-type">Type:</label>
                  <select
                    id="program-type"
                    value={programDetails.type}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        type: e.target.value,
                      })
                    }
                  >
                    {types.map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group-1" id="trainer-group">
                  <label htmlFor="trainer-assigned">Trainer:</label>
                  <select
                    id="trainer-assigned"
                    value={programDetails.trainer_assigned}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        trainer_assigned: e.target.value,
                      })
                    }
                  >
                    {trainers.map((trainer, index) => (
                      <option key={index} value={trainer}>
                        {trainer}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group-1" id="slots-group">
                  <label htmlFor="slots-left">Slots Left:</label>
                  <input
                    type="number"
                    id="slots-left"
                    value={programDetails.slots}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        slots: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="start-date-group">
                  <label htmlFor="start-date">Start Date:</label>
                  <input
                    type="date"
                    id="start-date"
                    value={
                      new Date(programDetails.start_date * 1000)
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        start_date: new Date(e.target.value).getTime() / 1000,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="end-date-group">
                  <label htmlFor="end-date">End Date:</label>
                  <input
                    type="date"
                    id="end-date"
                    value={
                      new Date(programDetails.end_date * 1000)
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        end_date: new Date(e.target.value).getTime() / 1000,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="materials-needed-group">
                  <label htmlFor="materials-needed">Materials Needed:</label>
                  <input
                    type="text"
                    id="materials-needed"
                    value={programDetails.materials_needed}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        materials_needed: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group-1" id="restriction-group">
                  <label htmlFor="restriction">Restriction:</label>
                  <input
                    type="number"
                    id="restriction"
                    value={programDetails.restriction}
                    onChange={(e) =>
                      setProgramDetails({
                        ...programDetails,
                        restriction: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="modal-actions" id="modal-actions">
                  <button type="submit" id="save-button">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    id="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {IsDeleteModalOpen && (
          <div className="delete-modal-overlay">
            <div className="delete-modal-content">
              <h2>Verify Your Password</h2>
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
              />
              <button onClick={verifyAdminPassword}>Verify</button>
              <button onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {isDownloading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center w-80">
              <h2 className="text-lg font-semibold mb-4">
                Downloading CRFs...
              </h2>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm mt-2">{downloadProgress}% completed</p>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-999">
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

export default ProgramDetails;
