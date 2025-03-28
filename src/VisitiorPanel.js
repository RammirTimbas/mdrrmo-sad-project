import React, { useEffect, useState } from "react";
import mdrrmo_logo from "./logos/mdrrmo_logo.png";
import LoginForm from "./LoginForm";
import RegistrationForm from "./RegistrationForm";
import loader from "./blue-loader.svg";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
  FaBullseye,
  FaEye,
} from "react-icons/fa";
import nothing_found_gif from "./lottie-files-anim/no_result.json";
import Lottie from "lottie-react";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const VisitorPanel = ({ onLoginClick }) => {
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [loading, setLoading] = useState(true); // loading state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // store the user profile ('admin' or 'user')
  const [loggedIn, setLoggedIn] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMission, setShowMission] = useState(false);
  const [headerBackground, setHeaderBackground] = useState("#FFFFFF");

  const [images, setCarouselImages] = useState([]);

  const [upcomingPrograms, setUpcomingPrograms] = useState([]);

  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    date: "",
    venue: "",
    category: "all",
  });

  const [showAccordion, setShowAccordion] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change every 5s

    return () => clearInterval(interval);
  }, [images]);

  const applyFilters = (search, filterOptions) => {
    let filtered = trainingPrograms;

    // 🔍 Search by Program Title
    if (search) {
      filtered = filtered.filter((program) =>
        program.program_title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🎯 Filter by Type
    if (filterOptions.type) {
      filtered = filtered.filter(
        (program) => program.type === filterOptions.type
      );
    }

    // 📅 Filter by Date (Check `selected_dates` first, then `start_date` and `end_date`)
    if (filterOptions.date) {
      const filterDate = new Date(filterOptions.date).setHours(0, 0, 0, 0); // Normalize selected date

      filtered = filtered.filter((program) => {
        // ✅ 1. Check `selected_dates` first
        if (program.selected_dates && program.selected_dates.length > 0) {
          return program.selected_dates.some(
            (date) =>
              new Date(date.seconds * 1000).setHours(0, 0, 0, 0) === filterDate
          );
        }

        // ✅ 2. If `selected_dates` is empty, check `start_date` and `end_date`
        if (program.start_date) {
          const startDate = new Date(program.start_date * 1000).setHours(
            0,
            0,
            0,
            0
          );
          const endDate = program.end_date
            ? new Date(program.end_date * 1000).setHours(0, 0, 0, 0)
            : startDate; // Assume it's a single-day event if `end_date` is missing

          return filterDate >= startDate && filterDate <= endDate;
        }

        return false; // If no valid dates are found, exclude the program
      });
    }

    // 📍 Filter by Venue
    if (filterOptions.venue) {
      filtered = filtered.filter((program) =>
        program.program_venue.includes(filterOptions.venue)
      );
    }

    // 🔥 Filter by Category (All, Popular, Upcoming)
    if (filterOptions.category === "popular") {
      filtered = [...filtered].sort(
        (a, b) =>
          Object.keys(b.approved_applicants || {}).length -
          Object.keys(a.approved_applicants || {}).length
      );
    } else if (filterOptions.category === "upcoming") {
      const now = Math.floor(Date.now() / 1000);
      filtered = filtered.filter((program) => program.start_date > now);
    }

    setFilteredPrograms(filtered);
  };

  useEffect(() => {
    applyFilters(searchQuery, filters);
  }, [searchQuery, filters, trainingPrograms]);

  const getUniqueValues = (field) => {
    return [...new Set(trainingPrograms.map((program) => program[field]))];
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    applyFilters(e.target.value, filters);
  };

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    applyFilters(searchQuery, newFilters);
  };

  useEffect(() => {
    const fetchImages = async () => {
      console.log("This: " + API_BASE_URL);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/get-carousel-images`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        ); //bakend url
        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setCarouselImages(data);
        } else {
          console.error("Failed to fetch images");
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    const fetchTrainingPrograms = async () => {
      setLoading(true);

      try {
        const cachedData = localStorage.getItem("trainingPrograms");
        const cacheTimestamp = localStorage.getItem(
          "trainingProgramsTimestamp"
        );
        const CACHE_DURATION = 5 * 60 * 1000; // cache every 5 mins
        const now = Date.now();

        if (
          cachedData &&
          cacheTimestamp &&
          now - cacheTimestamp < CACHE_DURATION
        ) {
          setTrainingPrograms(JSON.parse(cachedData));
          filterUpcomingPrograms(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/training-programs`);
        if (!response.ok) {
          throw new Error("Failed to fetch training programs");
        }
        const data = await response.json();
        setTrainingPrograms(data);
        filterUpcomingPrograms(data);

        localStorage.setItem("trainingPrograms", JSON.stringify(data));
        localStorage.setItem("trainingProgramsTimestamp", now.toString());
      } catch (error) {
        console.error("Error fetching training programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainingPrograms();
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScroll = () => {
    const carouselSection = document.getElementById("carousel");

    if (carouselSection) {
      const carouselPosition = carouselSection.getBoundingClientRect();

      if (
        carouselPosition.top <= window.innerHeight &&
        carouselPosition.bottom >= 0
      ) {
        setHeaderBackground("transparent");
      } else {
        setHeaderBackground("#FFFFFF");
      }
    } else {
      setHeaderBackground("#FFFFFF");
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleLoginForm = () => {
    setShowLoginForm((prev) => !prev);
    setShowRegistrationForm(false);
  };

  const toggleRegistrationForm = () => {
    setShowLoginForm(false);
    setShowRegistrationForm(true);
  };

  const handleLogin = (profile) => {
    setUserProfile(profile); // set the user's profile ('admin' or 'user')
    setLoggedIn(true);
  };

  // open login form when anything is clicked
  const handleInteraction = () => {
    onLoginClick(toggleLoginForm);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      goToNextImage();
    }, 3000); //chnage image every 3 secs

    return () => clearInterval(interval);
  }, [images]);

  const toggleMissionVision = () => {
    setShowMission(!showMission);
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const sectionOffsetTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      const scrollPosition = sectionOffsetTop + sectionHeight * 0.1;

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const getPopularPrograms = (programs) => {
    return programs
      .filter((program) => program.approved_applicants != null) // filter out programs without approved applicants
      .sort((a, b) => b.approved_applicants - a.approved_applicants); // sort by approved applicants in descending order
  };

  const filterUpcomingPrograms = (programs) => {
    const now = Math.floor(Date.now() / 1000);
    const upcoming = programs.filter(
      (program) =>
        program.start_date &&
        program.start_date > now &&
        program.start_date <= now + 7 * 24 * 60 * 60
    );
    setUpcomingPrograms(upcoming);
  };

  return (
    <div className="VisitorPanel">
      <header className="header" style={{ backgroundColor: headerBackground }}>
        <button className="hamburger" onClick={handleInteraction}>
          ☰
        </button>
        <img src={mdrrmo_logo} alt="Logo" className="logo" />
        <h1 className="title">MDRRMO Training Program Management System</h1>
        <h1 className="title-mobile">MDRRMO - TPMS</h1>

        <nav className="header-nav">
          <ul>
            <li onClick={() => scrollToSection("carousel")} className="home">
              <span className="desktop-text">Home</span>
              <i className="fas fa-home mobile-icon"></i>
            </li>
            <li
              onClick={() => scrollToSection("training-programs")}
              className="training"
            >
              <span className="desktop-text">Training Programs</span>
              <i className="fas fa-chalkboard-teacher mobile-icon"></i>
            </li>
            <li
              onClick={() => scrollToSection("mission-vision")}
              className="mission-vision"
            >
              <span className="desktop-text">Mission/Vision</span>
              <i className="fas fa-bullseye mobile-icon"></i>
            </li>
            <li
              onClick={onLoginClick}
              className="login"
              style={{ backgroundColor: "#007BFF", borderRadius: "10px" }}
            >
              <span className="desktop-text" style={{ color: "white" }}>
                Login
              </span>
              <i className="fas fa-sign-in-alt mobile-icon"></i>
            </li>
          </ul>
        </nav>
      </header>

      {showLoginForm && (
        <LoginForm
          onClose={onLoginClick}
          onNoAccount={toggleRegistrationForm}
          onLogin={handleLogin}
        />
      )}

      {showRegistrationForm && (
        <RegistrationForm onClose={() => setShowRegistrationForm(false)} />
      )}

      {/* 🚀 Carousel Section */}
      <section
        id="carousel"
        className="relative w-full h-[35vh] md:h-screen overflow-hidden"
      >
        {/* Left Arrow */}
        <button
          onClick={() =>
            setCurrentImageIndex((prev) =>
              prev === 0 ? images.length - 1 : prev - 1
            )
          }
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl z-10 bg-transparent p-2"
        >
          ❮
        </button>

        {/* Image Container */}
        <div className="absolute inset-0 w-full h-full">
          <AnimatePresence>
            {images.length > 0 && (
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]?.url}
                alt="carousel"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }} // Smooth fade-in effect
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.8 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button
          onClick={() =>
            setCurrentImageIndex((prev) =>
              prev === images.length - 1 ? 0 : prev + 1
            )
          }
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl z-10 bg-transparent p-2"
        >
          ❯
        </button>
      </section>

      <section
        id="training-programs"
        className="bg-blue-600 py-6 px-4 md:px-12"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white text-2xl font-bold mb-4">
            Search & Filter Programs
          </h2>

          {/* ✅ DESKTOP LAYOUT UNCHANGED */}
          <div className="hidden md:grid grid-cols-4 gap-4">
            {/* 🔍 Search Input */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-3 text-white text-lg" />
              <input
                type="text"
                placeholder="Search by title..."
                className="p-3 pr-14 pl-4 rounded-lg w-full bg-transparent text-white border border-white text-right focus:outline-none focus:ring-2 focus:ring-white placeholder-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 🔽 Program Type Dropdown */}
            <div className="relative">
              <FaFilter className="absolute left-4 top-3 text-white text-lg" />
              <select
                className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white appearance-none"
                value={filters.type}
                name="type"
                onChange={handleFilterChange}
              >
                <option className="text-black" value="">
                  All Types
                </option>
                {getUniqueValues("type").map((type) => (
                  <option key={type} className="text-black" value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 📅 Date Picker */}
            <div className="relative">
              <FaCalendarAlt className="absolute left-4 top-3 text-white text-lg" />
              <input
                type="date"
                className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>

            {/* 📍 Venue Dropdown */}
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-4 top-3 text-white text-lg" />
              <select
                className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white appearance-none"
                value={filters.venue}
                name="venue"
                onChange={handleFilterChange}
              >
                <option className="text-black" value="">
                  All Venues
                </option>
                {getUniqueValues("program_venue").map((venue) => (
                  <option key={venue} className="text-black" value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ MOBILE VIEW - ONLY SEARCH FIELD VISIBLE INITIALLY */}
          <div className="md:hidden">
            {/* 🔍 Search Input (Full Width in Mobile) */}
            <div className="relative mb-3">
              <FaSearch className="absolute left-4 top-3 text-white text-lg" />
              <input
                type="text"
                placeholder="Search by title..."
                className="p-3 pr-14 pl-4 rounded-lg w-full bg-transparent text-white border border-white text-right focus:outline-none focus:ring-2 focus:ring-white placeholder-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 🔽 More Filters Toggle Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center bg-white text-blue-600 px-4 py-2 rounded-lg shadow-md text-sm font-semibold"
              >
                {showFilters ? (
                  <FaChevronUp className="mr-2" />
                ) : (
                  <FaChevronDown className="mr-2" />
                )}
                {showFilters ? "Hide Filters" : "More Filters"}
              </button>
            </div>

            {/* 🔹 Mobile Filters (With Animation) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="grid grid-cols-1 gap-4 mt-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* 🔽 Program Type Dropdown */}
                  <div className="relative">
                    <FaFilter className="absolute left-4 top-3 text-white text-lg" />
                    <select
                      className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white appearance-none"
                      value={filters.type}
                      name="type"
                      onChange={handleFilterChange}
                    >
                      <option className="text-black" value="">
                        All Types
                      </option>
                      {getUniqueValues("type").map((type) => (
                        <option key={type} className="text-black" value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 📅 Date Picker */}
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-4 top-3 text-white text-lg" />
                    <input
                      type="date"
                      className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white"
                      value={filters.date}
                      name="date"
                      onChange={handleFilterChange}
                    />
                  </div>

                  {/* 📍 Venue Dropdown */}
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-3 text-white text-lg" />
                    <select
                      className="p-3 pl-14 pr-4 rounded-lg w-full bg-transparent text-white border border-white focus:outline-none focus:ring-2 focus:ring-white appearance-none"
                      value={filters.venue}
                      name="venue"
                      onChange={handleFilterChange}
                    >
                      <option className="text-black" value="">
                        All Venues
                      </option>
                      {getUniqueValues("program_venue").map((venue) => (
                        <option
                          key={venue}
                          className="text-black"
                          value={venue}
                        >
                          {venue}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 🏆 Training Programs Section */}
      <section className="p-4 md:p-16">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-center text-black mb-8">
          Offered Training Programs
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
          {filteredPrograms.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-fit col-span-full">
              <div className="w-48 h-48 flex justify-center items-center">
                <Lottie animationData={nothing_found_gif} loop={false} />
              </div>
              <p className="text-center text-gray-300 text-lg font-medium mt-2">
                No programs found.
              </p>
            </div>
          ) : (
            filteredPrograms.map((program) => (
              <div
                key={program.id}
                className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:scale-105 cursor-pointer"
                onClick={() => onLoginClick()}
              >
                {/* Thumbnail */}
                <img
                  src={program.thumbnail}
                  alt={program.program_title}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />

                {/* Darkened Glassmorphism Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-6 text-white">
                  <h2 className="text-xl font-bold truncate text-white">
                    {program.program_title}
                  </h2>
                  <p className="text-sm text-gray-200 truncate">
                    {program.description}
                  </p>
                  <p className="text-xs mt-2 font-semibold text-gray-300">
                    Slots: {program.slots}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="mission-vision" className="max-w-4xl mx-auto my-10 px-6">
        {/* Main Button to Show Accordion */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-blue-600 text-white font-semibold text-lg py-3 rounded-lg shadow-md flex items-center justify-center space-x-3 hover:bg-blue-700 transition"
          onClick={() => setShowAccordion(!showAccordion)}
        >
          <span>📜 MDRRMO - DAET MISSION/VISION</span>
        </motion.button>

        {/* Mission & Vision Buttons */}
        <AnimatePresence>
          {showAccordion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex flex-col space-y-2"
            >
              {/* Mission Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-2 text-lg font-semibold border border-gray-300 rounded-lg flex items-center justify-center space-x-2 transition ${
                  activeTab === "mission"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800"
                }`}
                onClick={() =>
                  setActiveTab(activeTab === "mission" ? null : "mission")
                }
              >
                <FaBullseye className="text-xl" />
                <span>Mission</span>
              </motion.button>

              {/* Mission Content */}
              <AnimatePresence>
                {activeTab === "mission" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-gray-200 p-4 rounded-lg shadow-md overflow-hidden"
                  >
                    <p className="text-gray-700 text-sm leading-relaxed">
                      ✅ Provide an efficient early warning system for
                      calamities & disasters.
                      <br />
                      ✅ Ensure an effective and immediate response mechanism.
                      <br />
                      ✅ Deliver valuable guidance in crisis situations.
                      <br />
                      ✅ Maintain disaster awareness & preparedness.
                      <br />✅ Establish a comprehensive data hub for
                      disaster-related information.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vision Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-2 text-lg font-semibold border border-gray-300 rounded-lg flex items-center justify-center space-x-2 transition ${
                  activeTab === "vision"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800"
                }`}
                onClick={() =>
                  setActiveTab(activeTab === "vision" ? null : "vision")
                }
              >
                <FaEye className="text-xl" />
                <span>Vision</span>
              </motion.button>

              {/* Vision Content */}
              <AnimatePresence>
                {activeTab === "vision" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-gray-200 p-4 rounded-lg shadow-md overflow-hidden"
                  >
                    <p className="text-gray-700 text-sm leading-relaxed">
                      🎯 Build a resilient community with a culture of
                      preparedness.
                      <br />
                      🎯 Lead in disaster risk reduction & emergency response.
                      <br />
                      🎯 Foster collaboration through education & awareness.
                      <br />
                      🎯 Provide top-tier emergency management services.
                      <br />
                      🎯 Serve as a global model for disaster resilience &
                      safety.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section id="footer" className="bg-blue-900 text-white py-8">
        <footer className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          {/* Left Section - Info */}
          <div className="text-center md:text-left space-y-2">
            <p className="text-lg font-semibold">
              &copy; {new Date().getFullYear()} MDRRMO - DAET
            </p>
            <p className="text-sm opacity-80">Address: Daet, Camarines Norte</p>
            <p className="text-sm opacity-80">
              Contact: mdrrmo.tpms.srvc@gmail.com
            </p>
          </div>

          {/* Right Section - Social Media */}
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="https://www.facebook.com/MDRRMODaetCN"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-2xl hover:text-blue-400 transition"
            >
              <i className="fab fa-facebook"></i>
            </a>
            <a
              href="https://www.youtube.com/channel/UCKY978BrAw0fJFIDIiSou9A"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-2xl hover:text-red-500 transition"
            >
              <i className="fab fa-youtube"></i>
            </a>
            <a
              href="https://www.mdrrmo-daet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-2xl hover:text-gray-400 transition"
            >
              <i className="fas fa-globe"></i>
            </a>
          </div>
        </footer>
      </section>

      {sidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}
    </div>
  );
};

export default VisitorPanel;
