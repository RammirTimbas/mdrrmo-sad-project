import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
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

const Dashboard = () => {
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

  const canvasRef = useRef(null);

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
        const selectedMonth = months.indexOf(selectedMonthName); // Convert month name to index
        const selectedYear = parseInt(selectedYearString);

        let completedCount = 0;
        let ongoingCount = 0;
        let notStartedCount = 0;
        let monthlyCompletedCount = 0;
        let annualCompletedCount = 0;

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        for (const program of programs) {
          let programDates = [];
          let latestDate = null;

          if (
            !program.start_date &&
            !program.end_date &&
            program.selected_dates
          ) {
            programDates = program.selected_dates.map(
              (date) => new Date(date.seconds * 1000)
            );
            latestDate = new Date(
              Math.max(...programDates.map((d) => d.getTime()))
            );
          } else if (program.start_date && program.end_date) {
            const start = new Date(program.start_date * 1000);
            const end = new Date(program.end_date * 1000);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            latestDate = end;

            let current = new Date(start);
            while (current <= end) {
              programDates.push(new Date(current));
              current.setDate(current.getDate() + 1);
            }

            if (end < todayMidnight) {
              completedCount++;
            } else if (start <= todayMidnight && end >= todayMidnight) {
              ongoingCount++;
            } else if (start > todayMidnight) {
              notStartedCount++;
            }
          }

          // ✅ Skip if ongoing or future
          if (latestDate && latestDate >= todayMidnight) continue;

          // ✅ Monthly match
          if (
            programDates.some(
              (date) =>
                date.getMonth() === selectedMonth &&
                date.getFullYear() === selectedYear
            )
          ) {
            monthlyCompletedCount++;
          }

          // ✅ Annual match
          if (
            programDates.some((date) => date.getFullYear() === selectedYear)
          ) {
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
        const quotasDocRef = doc(db, "Settings", "Quotas"); // Reference the "Quotas" document inside "Settings"
        const quotasSnapshot = await getDoc(quotasDocRef);

        if (quotasSnapshot.exists()) {
          const quotasData = quotasSnapshot.data();
          setMonthlyQuota(quotasData.monthlyQuota || "0"); // Default to "0" if missing
          setAnnualQuota(quotasData.annualQuota || "0"); // Default to "0" if missing
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
            !programDates.some((date) => date.getMonth() === selectedMonth)) ||
          (timeFilter === "annual" &&
            !programDates.some((date) => date.getFullYear() === selectedYear))
        ) {
          continue;
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
            className={`flex items-center gap-2 p-3 border-b-2 ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-gray-300 text-gray-600 bg-white"
            }`}
            onClick={() => setActiveTab("analytics")}
          >
            <HiChartBar />
            Analytics
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-gray-300 text-gray-600 bg-white"
            }`}
            onClick={() => setActiveTab("reports")}
          >
            <HiDocumentReport />
            Reports/Quota
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${
              activeTab === "decision-support"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-gray-300 text-gray-600 bg-white"
            }`}
            onClick={() => setActiveTab("decision-support")}
          >
            <HiLightBulb />
            Decision Support
          </button>
          <button
            className={`flex items-center gap-2 p-3 border-b-2 ${
              activeTab === "events-overview"
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

            {/* Time Range Toggle for Table */}
            <div className="mt-8 flex justify-between items-center">
              <h3 className="text-md font-semibold text-gray-700">
                Program List
              </h3>
              <div className="space-x-2">
                <button
                  className={`px-4 py-2 rounded ${
                    timeFilter === "monthly"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => handleTimeFilterChange("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-2 rounded ${
                    timeFilter === "annual"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => handleTimeFilterChange("annual")}
                >
                  Annual
                </button>
              </div>
            </div>

            {/* Pagination Setup */}
            {(() => {
              const itemsPerPage = 10;
              const indexOfLastItem = currentPage * itemsPerPage;
              const indexOfFirstItem = indexOfLastItem - itemsPerPage;
              const paginatedPrograms = programData.slice(
                indexOfFirstItem,
                indexOfLastItem
              );
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
                            className={`px-3 py-1 rounded ${
                              currentPage === 1
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
                              className={`px-3 py-1 rounded ${
                                currentPage === i + 1
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
                            className={`px-3 py-1 rounded ${
                              currentPage === totalPages
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
          className={`h-4 rounded-full ${
            isFutureDate ? "bg-gray-400" : "bg-blue-600"
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
        className={`mt-3 px-4 py-2 rounded-md ${
          isFutureDate
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white`}
      >
        <FaDownload className="inline-block mr-2" /> Export
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
