import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import TrainingProgramsPieChart from "./charts/TrainingProgramsPieChart";
import ApplicantsBarChart from "./charts/ApplicantsBarChart";
import RegistrantsBarChart from "./charts/RegistrantsBarChart";
import MostRatedChart from "./charts/MostRatedChart";
import FeedbackWordCloud from "./charts/FeedbackWordcloud";
import {
  FaUser,
  FaCheck,
  FaChartLine,
  FaCalendarAlt,
  FaDownload,
} from "react-icons/fa";
import Modal from "react-modal";
import { Tooltip } from "react-tooltip";
import dashboardLogo from "./logo/dashboard_logo.png";
import Swal from "sweetalert2";
import CompletedApplicantsMap from "./CompletedApplicantsMap";
import Lottie from "lottie-react";
import MainLoading from "../../lottie-files-anim/loading-main.json";
import SubLoading from "../../lottie-files-anim/sub-loading.json";
import EventOverview from "./EventOverview";
import { HiChartBar, HiDocumentReport, HiLightBulb, HiCalendar } from 'react-icons/hi';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = ({ userId }) => {
  const [date, setDate] = useState(new Date());
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [completedPrograms, setCompletedPrograms] = useState(0);
  const [ongoingPrograms, setOngoingPrograms] = useState(0);
  const [notStartedPrograms, setNotStartedPrograms] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [overallAvgRating, setOverallAvgRating] = useState(0);

  const [activeTab, setActiveTab] = useState("analytics");

  const [monthlyQuota, setMonthlyQuota] = useState(0);
  const [annualQuota, setAnnualQuota] = useState(0);
  const [monthlyCompleted, setMonthlyCompleted] = useState(0);
  const [annualCompleted, setAnnualCompleted] = useState(0);

  const [programData, setProgramData] = useState([]);
  const [programDataLoading, setProgramDataLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState("monthly");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [adminName, setAdminName] = useState("Admin User");
  const canvasRef = useRef(null);

  // Filters state
  const [filters, setFilters] = useState({
    location: "",
    training: "",
    type: "",
    date: "",
    gender: "",
  });

  const [activeReportTab, setActiveReportTab] = useState("programs"); // default = Programs

  // Derived filtered data (reactive table update)
  const filteredPrograms = programData.filter((program) => {
    return (
      (filters.location ? program.LOCATION === filters.location : true) &&
      (filters.training ? program.TRAINING === filters.training : true) &&
      (filters.type ? program["TYPE OF TRAINING"] === filters.type : true) &&
      (filters.date ? program.DATE?.includes(filters.date) : true) &&
      (filters.gender
        ? filters.gender === "Male"
          ? program.MALE > 0
          : program.FEMALE > 0
        : true)
    );
  });

  // Unique dropdown options from data
  const locations = [...new Set(programData.map((p) => p.LOCATION))];
  const trainings = [...new Set(programData.map((p) => p.TRAINING))];
  const types = [...new Set(programData.map((p) => p["TYPE OF TRAINING"]))];
  const dates = [...new Set(programData.map((p) => p.DATE))];



  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(
    `${today.toLocaleString("default", {
      month: "long",
    })} ${today.getFullYear()}`
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 10 }, // Past 5 years + Future 5 years
    (_, i) => today.getFullYear() - 5 + i
  );

  const [stopWords, setStopWords] = useState(new Set());

  useEffect(() => {
    const initializeProgramData = async () => {
      setProgramDataLoading(true);
      const data = await fetchTrainingReportData(timeFilter);
      setProgramData(data);
      setProgramDataLoading(false);
    };
    initializeProgramData();
  }, [selectedDate]);

  // Fetch admin name
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

  const handleTimeFilterChange = async (filter) => {
    setTimeFilter(filter);
    setProgramDataLoading(true);
    const data = await fetchTrainingReportData(filter);
    setProgramData(data);
    setProgramDataLoading(false);
  };

  const getFormattedDate = (monthIndex, year) =>
    `${months[monthIndex]} ${year}`;

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  useEffect(() => {
    const [month, year] = selectedDate.split(" ");
    const monthIndex = months.indexOf(month);
    const selectedYear = parseInt(year);

    fetchTrainingReportData(monthIndex, selectedYear);
  }, [selectedDate]);

  const [words, setWords] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/feedback-wordcloud`);
        const data = await response.json();

        console.log("Fetched Feedbacks:", data); // 🔍 Debugging step

        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.error("Invalid API response format:", data);
          setAllFeedbacks([]);
          return;
        }

        const feedbacks = data.flatMap((program) =>
          Array.isArray(program.feedbacks) // Ensure feedbacks exist
            ? program.feedbacks.map((feedback) => ({
              text: feedback,
              timestamp: program.timestamp || Date.now(),
            }))
            : []
        );

        setAllFeedbacks(feedbacks);
        updateWordCloud(feedbacks, selectedMonth, selectedYear);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  const updateWordCloud = (feedbacks, month, year) => {
    const filteredFeedbacks = feedbacks.filter(({ timestamp }) => {
      const date = new Date(timestamp);
      const feedbackMonth = date.getMonth() + 1;
      const feedbackYear = date.getFullYear();

      const matchMonth = month === "All" || feedbackMonth === parseInt(month);
      const matchYear = year === "All" || feedbackYear === parseInt(year);

      return matchMonth && matchYear;
    });

    // Count word occurrences
    const wordCount = {};
    filteredFeedbacks.forEach(({ text }) => {
      text.split(" ").forEach((word) => {
        const cleanedWord = word.toLowerCase().replace(/[^a-zA-Z]/g, "");
        if (cleanedWord && !stopWords.has(cleanedWord)) {
          wordCount[cleanedWord] = (wordCount[cleanedWord] || 0) + 1;
        }
      });
    });

    const wordArray = Object.entries(wordCount).map(([text, value]) => ({
      text,
      value,
    }));

    setWords(wordArray);
  };

  useEffect(() => {
    updateWordCloud(allFeedbacks, selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchTrainingPrograms = async () => {
      try {
        const programsCollection = collection(db, "Training Programs");
        const snapshot = await getDocs(programsCollection);

        const programs = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const ratingsCollection = collection(doc.ref, "ratings");
            const ratingsSnapshot = await getDocs(ratingsCollection);

            // calculate the individual rating average (programRating + trainerRating) / 2 for each rating
            const individualRatings = ratingsSnapshot.docs.map((ratingDoc) => {
              const data = ratingDoc.data();
              const programRating = data.programRating || 0;
              const trainerRating = data.trainerRating || 0;
              // calculate the individual rating average
              return (programRating + trainerRating) / 2;
            });

            // calculate the programs average rating (average of individual ratings)
            const avgRating =
              individualRatings.length > 0
                ? individualRatings.reduce((sum, rating) => sum + rating, 0) /
                individualRatings.length
                : 0;

            // store the count of ratings for display
            const ratingsCount = ratingsSnapshot.size;

            return {
              id: doc.id,
              ...doc.data(),
              avgRating,
              ratingsCount,
              individualRatings,
            };
          })
        );

        // sort programs by the highest average rating
        programs.sort((a, b) => b.avgRating - a.avgRating);

        // calculate the overall average rating from all programs
        const totalRatings = programs.reduce((sum, program) => {
          return (
            sum +
            program.individualRatings.reduce((sum, rating) => sum + rating, 0)
          );
        }, 0);

        const totalRatingsCount = programs.reduce(
          (sum, program) => sum + program.individualRatings.length,
          0
        );
        const overallAvgRating =
          totalRatingsCount > 0 ? totalRatings / totalRatingsCount : 0;

        setTrainingPrograms(programs);
        setOverallAvgRating(overallAvgRating);
      } catch (error) {
        console.error("Error fetching training programs:", error);
      }
    };

    fetchTrainingPrograms();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const usersCollection = collection(db, "Users");
        const usersSnapshot = await getDocs(usersCollection);
        setTotalUsers(usersSnapshot.docs.length);

        const programsCollection = collection(db, "Training Programs");
        const programsSnapshot = await getDocs(programsCollection);
        const programs = programsSnapshot.docs.map((doc) => doc.data());

        // Extract selected month & year from dropdown
        const [selectedMonthName, selectedYearString] = selectedDate.split(" ");
        const selectedMonth = months.indexOf(selectedMonthName);
        const selectedYear = parseInt(selectedYearString);

        let completedCount = 0;
        let ongoingCount = 0;
        let notStartedCount = 0;
        let monthlyCompletedCount = 0;
        let annualCompletedCount = 0;

        const today = new Date(); // now
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        for (const program of programs) {
          let programDates = [];
          let latestDate = null;

          // 🟢 Case 1: Programs with specific selected_dates
          if (!program.start_date && !program.end_date && program.selected_dates) {
            programDates = program.selected_dates.map(
              (date) => new Date(date.seconds * 1000)
            );

            latestDate = new Date(Math.max(...programDates.map((d) => d.getTime())));
            latestDate.setHours(23, 59, 59, 999); // end of that day

            if (latestDate < today) {
              completedCount++;
            } else if (
              programDates.some(
                (d) => d.toDateString() === todayMidnight.toDateString()
              )
            ) {
              ongoingCount++;
            } else if (programDates.some((d) => d > todayMidnight)) {
              notStartedCount++;
            }
          }

          // 🟢 Case 2: Programs with a date range
          else if (program.start_date && program.end_date) {
            const start = new Date(program.start_date * 1000);
            const end = new Date(program.end_date * 1000);
            start.setHours(0, 0, 0, 0);

            // mark the true completion cutoff (end of end_date day)
            const endOfEndDate = new Date(end);
            endOfEndDate.setHours(23, 59, 59, 999);
            latestDate = endOfEndDate;

            // generate all days inside the range (for month/year checks)
            let current = new Date(start);
            while (current <= end) {
              programDates.push(new Date(current));
              current.setDate(current.getDate() + 1);
            }

            if (endOfEndDate < today) {
              completedCount++;
            } else if (start <= today && endOfEndDate >= today) {
              ongoingCount++;
            } else if (start > today) {
              notStartedCount++;
            }
          }

          // ✅ Skip ongoing/future for monthly/yearly completed
          if (latestDate && latestDate >= today) continue;

          // ✅ Monthly match (completed only)
          if (
            programDates.some(
              (date) =>
                date.getMonth() === selectedMonth &&
                date.getFullYear() === selectedYear
            )
          ) {
            monthlyCompletedCount++;
          }

          // ✅ Annual match (completed only)
          if (programDates.some((date) => date.getFullYear() === selectedYear)) {
            annualCompletedCount++;
          }
        }

        // Update state with fetched data
        setCompletedPrograms(completedCount);
        setOngoingPrograms(ongoingCount);
        setNotStartedPrograms(notStartedCount);
        setMonthlyCompleted(monthlyCompletedCount);
        setAnnualCompleted(annualCompletedCount);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchQuotas = async () => {
      try {
        const quotasDocRef = doc(db, "Settings", "Quotas");
        const quotasSnapshot = await getDoc(quotasDocRef);

        if (quotasSnapshot.exists()) {
          const quotasData = quotasSnapshot.data();
          setMonthlyQuota(quotasData.monthlyQuota || "0");
          setAnnualQuota(quotasData.annualQuota || "0");
        } else {
          console.warn("No quota data found in Firestore.");
        }
      } catch (error) {
        console.error("Error fetching quota data:", error);
      }
    };

    fetchData();
    fetchQuotas();
  }, [selectedDate]);


  // -------------------- PARTICIPANTS STATE --------------------
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [participantFilters, setParticipantFilters] = useState({
    municipality: "",
    barangay: "",
    gender: "",
    ageGroup: "",
    civilStatus: "",
  });

  const [currentParticipantPage, setCurrentParticipantPage] = useState(1);

  // Dropdown options
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [civilStatuses, setCivilStatuses] = useState([]);

  // -------------------- FETCH PARTICIPANTS --------------------
  const fetchParticipants = async () => {
    try {
      setParticipantsLoading(true);
      const now = Math.floor(Date.now() / 1000);

      // Step 1: Get programs that have ended
      const programsQuery = query(
        collection(db, "Training Programs"),
        where("end_date", "<", now)
      );
      const programsSnapshot = await getDocs(programsQuery);
      const programs = programsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Step 2: Collect unique approved applicants
      const applicantMap = {};
      programs.forEach((program) => {
        if (program.approved_applicants) {
          Object.values(program.approved_applicants).forEach((a) => {
            if (a.status === "approved") {
              if (!applicantMap[a.user_id]) {
                applicantMap[a.user_id] = {
                  id: a.user_id,
                  name: a.full_name,
                  programs: [program.program_title],
                };
              } else {
                applicantMap[a.user_id].programs.push(program.program_title);
              }
            }
          });
        }
      });

      const applicants = Object.values(applicantMap);
      if (applicants.length === 0) {
        setParticipants([]);
        setFilteredParticipants([]);
        return;
      }

      // Step 3: Fetch user info
      const userInfoQuery = query(
        collection(db, "User Informations"),
        where("user_ID", "in", applicants.map((a) => a.id))
      );
      const userInfoSnapshot = await getDocs(userInfoQuery);

      const userInfoMap = {};
      userInfoSnapshot.docs.forEach((doc) => {
        userInfoMap[doc.data().user_ID] = doc.data();
      });

      const enrichedParticipants = applicants.map((a) => {
        const u = userInfoMap[a.id] || {};
        const age =
          u.date_of_birth
            ? new Date().getFullYear() - new Date(u.date_of_birth).getFullYear()
            : null;

        return {
          ...a,
          age,
          gender: u.gender || "N/A",
          civil_status: u.civil_status || "N/A",
          municipality: u.municipality || "N/A",
          barangay: u.barangay || "N/A",
        };
      });

      // Populate filters
      setMunicipalities([
        ...new Set(enrichedParticipants.map((p) => p.municipality)),
      ]);
      setBarangays([...new Set(enrichedParticipants.map((p) => p.barangay))]);
      setCivilStatuses([
        ...new Set(enrichedParticipants.map((p) => p.civil_status)),
      ]);

      setParticipants(enrichedParticipants);
      setFilteredParticipants(enrichedParticipants);
    } catch (err) {
      console.error("Error fetching participants:", err);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // -------------------- FILTER PARTICIPANTS --------------------
  useEffect(() => {
    let data = [...participants];
    if (participantFilters.municipality)
      data = data.filter((p) => p.municipality === participantFilters.municipality);
    if (participantFilters.barangay)
      data = data.filter((p) => p.barangay === participantFilters.barangay);
    if (participantFilters.gender)
      data = data.filter(
        (p) => p.gender.toLowerCase() === participantFilters.gender.toLowerCase()
      );
    if (participantFilters.ageGroup) {
      const [min, max] =
        participantFilters.ageGroup === "56+"
          ? [56, Infinity]
          : participantFilters.ageGroup.split("-").map(Number);
      data = data.filter((p) => p.age >= min && p.age <= max);
    }
    if (participantFilters.civilStatus)
      data = data.filter((p) => p.civil_status === participantFilters.civilStatus);

    setFilteredParticipants(data);
    setCurrentParticipantPage(1);
  }, [participantFilters, participants]);

  // -------------------- INIT FETCH --------------------
  useEffect(() => {
    if (activeReportTab === "participants") {
      fetchParticipants();
    }
  }, [activeReportTab]);

  // -------------------- GENERATE REPORT --------------------
  const handleGenerateParticipantReport = async () => {
    const { value: fileName } = await Swal.fire({
      title: "Generate Participant Report",
      input: "text",
      inputPlaceholder: "Enter file name",
      showCancelButton: true,
    });

    if (!fileName) return;

    try {
      const response = await fetch(`${API_BASE_URL}/export-participant-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          title: fileName,
          adminName: adminName, 
          todayDate: new Date().toLocaleDateString(),
          participants: filteredParticipants,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.docx`;
      link.click();
    } catch (error) {
      console.error("Error exporting participant report:", error);
      Swal.fire("Error", "Failed to generate participant report.", "error");
    }
  };



  const fetchTrainingReportData = async (timeFilter) => {
    try {
      const programsCollection = collection(db, "Training Programs");
      const snapshot = await getDocs(programsCollection);
      const programs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date

      const [selectedMonthName, selectedYearString] = selectedDate.split(" ");
      const selectedMonth = months.indexOf(selectedMonthName); // Convert month name to index (0-11)
      const selectedYear = parseInt(selectedYearString);

      let trainingData = [];

      for (const program of programs) {
        let programDates = [];
        let latestDate = null; // Track the latest date to check if concluded

        // ✅ Use selected_dates if start_date and end_date are null
        if (
          !program.start_date &&
          !program.end_date &&
          program.selected_dates
        ) {
          programDates = program.selected_dates.map(
            (date) => new Date(date.seconds * 1000)
          );
          latestDate = new Date(
            Math.max(...programDates.map((date) => date.getTime()))
          );
        } else if (program.start_date && program.end_date) {
          // ✅ Use start_date and end_date if available
          let currentDate = new Date(program.start_date * 1000);
          let endDate = new Date(program.end_date * 1000);
          latestDate = endDate;

          while (currentDate <= endDate) {
            programDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // ✅ Exclude programs that are still ongoing
        if (latestDate && latestDate >= today) {
          continue; // Skip this program
        }

        // ✅ Filter based on selected time range
        if (
          programDates.length === 0 ||
          (timeFilter === "monthly" &&
            !programDates.some((date) => date.getMonth() === selectedMonth && date.getFullYear() === selectedYear)) ||
          (timeFilter === "annual" &&
            !programDates.some((date) => date.getFullYear() === selectedYear))
          // ✅ For "all", we skip filtering (include everything)
        ) {
          if (timeFilter !== "all") {
            continue;
          }
        }


        let maleCount = 0;
        let femaleCount = 0;
        let participantsList = [];

        if (program.approved_applicants) {
          for (const key in program.approved_applicants) {
            const applicant = program.approved_applicants[key];
            const user_id = applicant.user_id;

            if (!user_id) continue; // Skip if user_id is missing

            try {
              const userInfoResponse = await fetch(
                `${API_BASE_URL}/api/user-info-gender/${user_id}`
              );

              if (!userInfoResponse.ok) {
                console.warn(`User ID ${user_id} not found, skipping...`);
                continue;
              }

              const userInfo = await userInfoResponse.json();
              if (userInfo.gender.toLowerCase() === "male") maleCount++;
              else if (userInfo.gender.toLowerCase() === "female")
                femaleCount++;
              participantsList.push(applicant.full_name);
            } catch (fetchError) {
              console.error(
                `Error fetching user info for ${user_id}:`,
                fetchError
              );
              continue;
            }
          }
        }

        trainingData.push({
          "#": trainingData.length + 1,
          TRAINING: program.program_title,
          LOCATION: program.program_venue,
          PARTICIPANTS: participantsList.join(", "),
          "TYPE OF TRAINING": program.type,
          "SPECIFIC TRAINING": program.type,
          DATE: programDates
            .map((date) => date.toLocaleDateString())
            .join(", "),
          MONTH:
            programDates.length > 0
              ? programDates[0].toLocaleString("en-US", { month: "long" })
              : "N/A",
          MALE: maleCount,
          FEMALE: femaleCount,
          TOTAL: maleCount + femaleCount,
          REMARKS:
            maleCount + femaleCount >= program.slots
              ? "All slots filled"
              : "More Participants Needed",
        });
      }

      return trainingData;
    } catch (error) {
      console.error("Error fetching training data:", error);
      return [];
    }
  };

  const handleGenerateReport = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Generate Report",
      html: `
      <input id="swal-filename" class="swal2-input" placeholder="Enter file name">
      <select id="swal-format" class="swal2-input">
        <option value="docx">DOCX</option>
        <option value="pdf">PDF</option>
      </select>
    `,
      focusConfirm: false,
      preConfirm: () => {
        const fileName = document.getElementById("swal-filename").value || "Report";
        const format = document.getElementById("swal-format").value;
        return { fileName, format };
      },
      showCancelButton: true,
    });

    if (!formValues) return;

    const { fileName, format } = formValues;

    // 🔹 Apply filters
    const filteredData = programData.filter((program) => {
      return (
        (filters.location ? program.LOCATION?.includes(filters.location) : true) &&
        (filters.training ? program.TRAINING?.includes(filters.training) : true) &&
        (filters.type ? program["TYPE OF TRAINING"]?.includes(filters.type) : true) &&
        (filters.date ? program.DATE?.includes(filters.date) : true) &&
        (filters.gender
          ? (filters.gender === "Male" ? program.MALE > 0 : program.FEMALE > 0)
          : true)
      );
    });

    if (filteredData.length === 0) {
      Swal.fire("Notice", "No data matches the selected filters.", "info");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/export-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          format,
          title: fileName,
          adminName: adminName, // you can replace with actual logged-in admin
          todayDate: new Date().toLocaleDateString("en-CA"),
          rows: filteredData.map((program, idx) => ({
            NUMBER: idx + 1,
            TRAINING: program.TRAINING || "N/A",
            LOCATION: program.LOCATION || "N/A",
            TYPE: program["TYPE OF TRAINING"] || "N/A",
            DATE: program.DATE || "N/A",
            MALE: program.MALE || 0,
            FEMALE: program.FEMALE || 0,
            TOTAL: program.TOTAL || 0,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report.");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire("Success", "Report generated successfully!", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to generate report.", "error");
    }
  };



  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedPrograms = programData.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(programData.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900">
      {/* Dashboard Header */}
      <div className="dashboard-title-bar">
        <img
          src={dashboardLogo}
          alt="Dashboard Logo"
          className="dashboard-logo"
        />
        <h1 className="dashboard-title">Dashboard</h1>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          icon={<FaUser />}
          title="Total Users"
          count={totalUsers}
          color="bg-blue-500"
        />
        <Card
          icon={<FaCheck />}
          title="Completed Programs"
          count={completedPrograms}
          color="bg-green-500"
        />
        <Card
          icon={<FaChartLine />}
          title="Ongoing Programs"
          count={ongoingPrograms}
          color="bg-yellow-500"
        ></Card>
        <Card
          icon={<FaCalendarAlt />}
          title="Upcoming Events"
          count={notStartedPrograms}
          color="bg-red-500"
        ></Card>
      </div>

      <div className="mt-8">
        <div className="flex border-b">
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${activeTab === "analytics"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-gray-300 text-gray-600 bg-white"
              }`}
            onClick={() => setActiveTab("analytics")}
          >
            <HiChartBar />
            Analytics
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${activeTab === "reports"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-gray-300 text-gray-600 bg-white"
              }`}
            onClick={() => setActiveTab("reports")}
          >
            <HiDocumentReport />
            Reports/Quota
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${activeTab === "decision-support"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-gray-300 text-gray-600 bg-white"
              }`}
            onClick={() => setActiveTab("decision-support")}
          >
            <HiLightBulb />
            Decision Support
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${activeTab === "events-overview"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-gray-300 text-gray-600 bg-white"
              }`}
            onClick={() => setActiveTab("events-overview")}
          >
            <HiCalendar />
            Events Overview
          </button>
        </div>

        {activeTab === "analytics" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <ApplicantsBarChart />
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md">
                <TrainingProgramsPieChart />
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md">
                <RegistrantsBarChart />
              </div>
            </div>
            <div className="mt-8 p-6 bg-white rounded-lg shadow-lg backdrop-blur-md relative">
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-700 text-center mb-4 drop-shadow-md">
                Feedback Word Cloud
              </h3>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <label className="text-gray-600 font-medium">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300 focus:outline-none"
                  >
                    <option value="All">All</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-gray-600 font-medium">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300 focus:outline-none"
                  >
                    <option value="All">All</option>
                    {Array.from(
                      new Set(
                        allFeedbacks.map(({ timestamp }) =>
                          new Date(timestamp).getFullYear()
                        )
                      )
                    )
                      .sort()
                      .map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Word Cloud or Message */}
              <div className="bg-gray-100 p-6 rounded-lg shadow-md border border-gray-200">
                {isLoading ? (
                  <p className="text-gray-500 text-center">
                    Loading feedback data...
                  </p>
                ) : words.length < 1 ? (
                  <p className="text-gray-500 text-center">
                    Not enough data to generate a word cloud.
                  </p>
                ) : (
                  <div className="flex justify-center items-center w-full h-[250px]">
                    <FeedbackWordCloud words={words} />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
              <MostRatedChart trainingPrograms={trainingPrograms} />
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-lg font-semibold">Reports/Quota Section</h2>
            <label className="mr-3 text-gray-700 font-medium">
              Select Date:
            </label>

            {/* Month-Year Dropdown */}
            <div className="relative mt-4 w-64">
              <FaCalendarAlt className="absolute left-3 top-3 text-gray-500" />
              <select
                className="w-full px-10 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200 focus:outline-none"
                value={selectedDate}
                onChange={handleDateChange}
              >
                {years.map((year) =>
                  months.map((month, index) => (
                    <option
                      key={`${month}-${year}`}
                      value={getFormattedDate(index, year)}
                    >
                      {getFormattedDate(index, year)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quota Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuotaCard
                title="Monthly Quota"
                progress={monthlyCompleted / monthlyQuota}
                current={monthlyCompleted}
                total={monthlyQuota}
                fetchData={() => fetchTrainingReportData("monthly")}
                selectedDate={selectedDate}
              />
              <QuotaCard
                title="Annual Quota"
                progress={annualCompleted / annualQuota}
                current={annualCompleted}
                total={annualQuota}
                fetchData={() => fetchTrainingReportData("annual")}
                selectedDate={"Year " + selectedDate.split(" ")[1]}
              />
            </div>

            <div className="mt-10 mb-2 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                Custom Report Generation
              </h3>
            </div>

            {/* Report Tabs */}
            <div className="flex w-full border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveReportTab("programs")}
                className={`flex-1 bg-transparent border-none outline-none px-6 py-3 font-semibold text-sm md:text-base transition relative text-center
                ${activeReportTab === "programs"
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-blue-500"}`}
              >
                Programs
                {activeReportTab === "programs" && (
                  <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
                )}
              </button>

              <button
                onClick={() => setActiveReportTab("participants")}
                className={`flex-1 bg-transparent border-none outline-none px-6 py-3 font-semibold text-sm md:text-base transition relative text-center
                ${activeReportTab === "participants"
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-blue-500"}`}
              >
                Participants
                {activeReportTab === "participants" && (
                  <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
                )}
              </button>
            </div>


            {activeReportTab === "programs" && (
              <>
                <div className="flex justify-end items-center mb-4 space-x-2">
                  <button
                    className={`px-4 py-2 rounded ${timeFilter === "monthly"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                      }`}
                    onClick={() => handleTimeFilterChange("monthly")}
                  >
                    This Month
                  </button>

                  <button
                    className={`px-4 py-2 rounded ${timeFilter === "annual"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                      }`}
                    onClick={() => handleTimeFilterChange("annual")}
                  >
                    This Year
                  </button>

                  <button
                    className={`px-4 py-2 rounded ${timeFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                      }`}
                    onClick={() => handleTimeFilterChange("all")}
                  >
                    All Time
                  </button>
                </div>


                {/* Filters Section */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-md">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">Filter Programs</h3>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Location */}
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Locations</option>
                      {locations.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>

                    {/* Training */}
                    <select
                      value={filters.training}
                      onChange={(e) => setFilters({ ...filters, training: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Trainings</option>
                      {trainings.map((train, i) => (
                        <option key={i} value={train}>{train}</option>
                      ))}
                    </select>

                    {/* Type of Training */}
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Types</option>
                      {types.map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>

                    {/* Date */}
                    <select
                      value={filters.date}
                      onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Dates</option>
                      {dates.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Gender */}
                    <select
                      value={filters.gender}
                      onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Generate Report Button */}
                  <div className="mt-4 text-right">
                    <button
                      onClick={handleGenerateReport}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* Pagination Setup */}
                {(() => {
                  const itemsPerPage = 10;
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const paginatedPrograms = filteredPrograms.slice(indexOfFirstItem, indexOfLastItem)

                  const totalPages = Math.ceil(programData.length / itemsPerPage);

                  return (
                    <div className="mt-4">
                      {programDataLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <div className="w-48 h-48">
                            <Lottie animationData={SubLoading} loop={true} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                              <thead className="bg-blue-100 text-gray-700">
                                <tr>
                                  {[
                                    "#",
                                    "TRAINING",
                                    "LOCATION",
                                    "PARTICIPANTS",
                                    "TYPE OF TRAINING",
                                    "DATE",
                                    "MALE",
                                    "FEMALE",
                                    "TOTAL",
                                    "REMARKS",
                                  ].map((col) => (
                                    <th
                                      key={col}
                                      className="px-4 py-2 text-sm font-semibold text-left border-b"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedPrograms.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={10}
                                      className="text-center text-gray-500 py-6"
                                    >
                                      No data available.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedPrograms.map((program, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      {[
                                        (currentPage - 1) * itemsPerPage +
                                        index +
                                        1,
                                        "TRAINING",
                                        "LOCATION",
                                        "PARTICIPANTS",
                                        "TYPE OF TRAINING",
                                        "DATE",
                                        "MALE",
                                        "FEMALE",
                                        "TOTAL",
                                        "REMARKS",
                                      ].map((key, i) => (
                                        <td
                                          key={i}
                                          className="px-4 py-2 border-b text-sm"
                                        >
                                          {i === 0 ? key : program[key]}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-center mt-4 space-x-2">
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                                }
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded ${currentPage === 1
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                              >
                                Prev
                              </button>

                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentPage(i + 1)}
                                  className={`px-3 py-1 rounded ${currentPage === i + 1
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                >
                                  {i + 1}
                                </button>
                              ))}

                              <button
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages)
                                  )
                                }
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded ${currentPage === totalPages
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {activeReportTab === "participants" && (
              <>
                {/* Participants Filters */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-md">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">Filter Participants</h3>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Municipality */}
                    <select
                      value={participantFilters.municipality}
                      onChange={(e) =>
                        setParticipantFilters({ ...participantFilters, municipality: e.target.value })
                      }
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Municipalities</option>
                      {municipalities.map((m, i) => (
                        <option key={i} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* Barangay */}
                    <select
                      value={participantFilters.barangay}
                      onChange={(e) =>
                        setParticipantFilters({ ...participantFilters, barangay: e.target.value })
                      }
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Barangays</option>
                      {barangays.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                    </select>

                    {/* Gender */}
                    <select
                      value={participantFilters.gender}
                      onChange={(e) =>
                        setParticipantFilters({ ...participantFilters, gender: e.target.value })
                      }
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Genders</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>

                    {/* Age Group */}
                    <select
                      value={participantFilters.ageGroup}
                      onChange={(e) =>
                        setParticipantFilters({ ...participantFilters, ageGroup: e.target.value })
                      }
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Age Groups</option>
                      <option value="18-25">18–25</option>
                      <option value="26-35">26–35</option>
                      <option value="36-45">36–45</option>
                      <option value="46-55">46–55</option>
                      <option value="56+">56+</option>
                    </select>

                    {/* Civil Status */}
                    <select
                      value={participantFilters.civilStatus}
                      onChange={(e) =>
                        setParticipantFilters({ ...participantFilters, civilStatus: e.target.value })
                      }
                      className="border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
                    >
                      <option value="">All Civil Status</option>
                      {civilStatuses.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Generate Report Button */}
                  <div className="mt-4 text-right">
                    <button
                      onClick={handleGenerateParticipantReport}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* Pagination + Table */}
                {(() => {
                  const itemsPerPage = 10;
                  const indexOfLastItem = currentParticipantPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const paginatedParticipants = filteredParticipants.slice(indexOfFirstItem, indexOfLastItem);

                  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);

                  return (
                    <div className="mt-4">
                      {participantsLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <div className="w-48 h-48">
                            <Lottie animationData={SubLoading} loop={true} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                              <thead className="bg-blue-100 text-gray-700">
                                <tr>
                                  {[
                                    "#",
                                    "NAME",
                                    "AGE",
                                    "GENDER",
                                    "CIVIL STATUS",
                                    "MUNICIPALITY",
                                    "BARANGAY",
                                    "COMPLETED PROGRAMS",
                                  ].map((col) => (
                                    <th
                                      key={col}
                                      className="px-4 py-2 text-sm font-semibold text-left border-b"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedParticipants.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-6">
                                      No participants found.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedParticipants.map((p, index) => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 border-b text-sm">
                                        {(currentParticipantPage - 1) * itemsPerPage + index + 1}
                                      </td>
                                      <td className="px-4 py-2 border-b text-sm">{p.name}</td>
                                      <td className="px-4 py-2 border-b text-sm">{p.age || "N/A"}</td>
                                      <td className="px-4 py-2 border-b text-sm">{p.gender}</td>
                                      <td className="px-4 py-2 border-b text-sm">{p.civil_status}</td>
                                      <td className="px-4 py-2 border-b text-sm">{p.municipality}</td>
                                      <td className="px-4 py-2 border-b text-sm">{p.barangay}</td>
                                      <td className="px-4 py-2 border-b text-sm">
                                        {p.programs && p.programs.length > 0
                                          ? p.programs.join(", ")
                                          : "None"}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-center mt-4 space-x-2">
                              <button
                                onClick={() =>
                                  setCurrentParticipantPage((prev) => Math.max(prev - 1, 1))
                                }
                                disabled={currentParticipantPage === 1}
                                className={`px-3 py-1 rounded ${currentParticipantPage === 1
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                              >
                                Prev
                              </button>

                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentParticipantPage(i + 1)}
                                  className={`px-3 py-1 rounded ${currentParticipantPage === i + 1
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                >
                                  {i + 1}
                                </button>
                              ))}

                              <button
                                onClick={() =>
                                  setCurrentParticipantPage((prev) =>
                                    Math.min(prev + 1, totalPages)
                                  )
                                }
                                disabled={currentParticipantPage === totalPages}
                                className={`px-3 py-1 rounded ${currentParticipantPage === totalPages
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

          </div>
        )}

        {activeTab === "decision-support" && <CompletedApplicantsMap />}

        {activeTab === "events-overview" && <EventOverview />}
      </div>

      {/* Calendar Modal */}
      <Modal
        isOpen={showCalendar}
        onRequestClose={() => setShowCalendar(false)}
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-lg font-semibold mb-4">
            Training Program Calendar
          </h2>
          <Calendar
            onChange={setDate}
            value={date}
            tileClassName={({ date, view }) => {
              if (view === "month") {
                let className = "";
                const colors = [
                  "program-color-0", // Coral
                  "program-color-1", // Gold
                  "program-color-2", // Lime Green
                  "program-color-3", // Deep Sky Blue
                  "program-color-4", // Olive Green
                  "program-color-5", // Red
                ];

                trainingPrograms.forEach((program, index) => {
                  const startDate = new Date(program.start_date * 1000);
                  const endDate = new Date(program.end_date * 1000);
                  const colorClass = colors[index % colors.length];

                  const calendarDateStr = date.toDateString();
                  const startDateStr = startDate.toDateString();
                  const endDateStr = endDate.toDateString();

                  if (calendarDateStr === startDateStr) {
                    className = `${colorClass}-start`;
                  } else if (calendarDateStr === endDateStr) {
                    className = `${colorClass}-end`;
                  } else if (date > startDate && date < endDate) {
                    className = `${colorClass}-in-between`;
                  }
                });

                return className;
              }
              return null;
            }}
            tileContent={({ date, view }) => {
              if (view === "month") {
                let title = "";
                const todayStr = new Date().toDateString();

                trainingPrograms.forEach((program) => {
                  const startDate = new Date(program.start_date * 1000);
                  const endDate = new Date(program.end_date * 1000);

                  const calendarDateStr = date.toDateString();
                  const startDateStr = startDate.toDateString();
                  const endDateStr = endDate.toDateString();

                  if (
                    calendarDateStr === startDateStr ||
                    calendarDateStr === endDateStr ||
                    (date > startDate && date < endDate)
                  ) {
                    title = program.program_title;
                  } else if (calendarDateStr === todayStr) {
                    title = "Today";
                  }
                });

                return title ? (
                  <>
                    <div
                      data-tooltip-id={`tooltip-${date.toISOString()}`}
                      data-tooltip-content={title}
                      style={{
                        width: "100%",
                        height: "100%", // Make the hover area larger
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          width: "100%", // Span fills the parent container
                          height: "100%", // Same as width to maintain square aspect ratio
                          backgroundColor: "transparent",
                          borderRadius: "50%", // Keeps the circle shape
                          display: "inline-block", // Prevents span from changing layout
                          position: "relative", // Needed for pseudo-element positioning
                        }}
                      >
                        <i
                          style={{
                            fontSize: "10px", // Adjust icon size
                            color: "#000", // Icon color
                            position: "absolute", // Position it inside the span without affecting layout
                          }}
                          className="fa fa-info-circle" // Example using Font Awesome's info icon
                        ></i>
                      </span>
                    </div>
                    <Tooltip id={`tooltip-${date.toISOString()}`} />
                  </>
                ) : null;
              }

              return null;
            }}
          />
          <button
            onClick={() => setShowCalendar(false)}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition w-full"
          >
            Close
          </button>
        </div>
      </Modal>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 mb-6">
              <Lottie animationData={MainLoading} loop={true} />
            </div>
            <p className="text-gray-600">
              The developers are smashing the keyboard very fast!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Card = ({ icon, title, count, color, children }) => {
  return (
    <div
      className={`p-6 ${color} text-white rounded-lg shadow-lg relative flex flex-col items-center justify-center`}
    >
      {/* Icon on the upper left corner */}
      <div className="absolute top-4 left-4 text-3xl">{icon}</div>

      {/* Centered content */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{count}</h2>
        <p className="text-md font-medium">{title}</p>
      </div>

      {/* Additional content (e.g., buttons) */}
      <div className="mt-4">{children}</div>
    </div>
  );
};

const QuotaCard = ({
  title,
  progress,
  current,
  total,
  fetchData,
  selectedDate,
}) => {
  const percentage = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
  const remaining = total - current;
  const [isLoading, setIsLoading] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState("");
  const [isFutureDate, setIsFutureDate] = useState(false);

  const today = new Date();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 10 }, // Past 5 years + Future 5 years
    (_, i) => today.getFullYear() - 5 + i
  );

  useEffect(() => {
    const fetchQuotaData = async () => {
      // Parse selected date
      const [selectedMonthName, selectedYearString] = selectedDate.split(" ");
      const selectedMonth = months.indexOf(selectedMonthName);
      const selectedYear = parseInt(selectedYearString);

      const now = new Date();
      const selectedDateObj = new Date(selectedYear, selectedMonth);

      // Check if selected date is in the future
      setIsFutureDate(selectedDateObj > now);

      // Fetch data if not in the future
      if (!isFutureDate) {
        const data = await fetchData();

        if (data.length === 0) {
          setQuotaMessage("No data available for this period.");
        } else {
          setQuotaMessage(
            current >= total
              ? "Quota met ✅"
              : `${remaining} more programs needed to meet the quota.`
          );
        }
      } else {
        setQuotaMessage("No data yet for this period.");
      }
    };

    fetchQuotaData();
  }, [selectedDate, current, total]);

  const handleExport = async () => {
    if (isFutureDate) return; // Disable export for future dates
    try {
      setIsLoading(true);
      const trainingData = await fetchData();
      if (trainingData.length === 0) {
        Swal.fire("Notice", "No data available for export.", "info");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/export-quota-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingData }),
      });

      if (!response.ok) throw new Error("Failed to generate report.");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Quota_Report.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-gray-600">{selectedDate}</p>

      {/* Progress Bar */}
      <div className="w-full bg-gray-300 rounded-full h-4 mt-2">
        <div
          className={`h-4 rounded-full ${isFutureDate ? "bg-gray-400" : "bg-blue-600"
            }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Quota Info */}
      <p className="text-sm text-gray-600 mt-2">
        {current}/{total} trainings completed
      </p>
      <p className="text-sm text-gray-600">{quotaMessage}</p>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isFutureDate}
        className={`mt-3 px-4 py-2 rounded-md ${isFutureDate
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
      >
        <FaDownload className="inline-block mr-2" /> Generate Quota Report
      </button>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold mb-2">Exporting...</h2>
            <p className="text-gray-600">
              This could take a while, sip a coffee first ☕
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
