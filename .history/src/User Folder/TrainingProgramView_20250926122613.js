import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  FaUser,
} from "react-icons/fa";
import nothing_found_gif from "../lottie-files-anim/no_result.json";
import Lottie from "lottie-react";
import "../App.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const TrainingProgramView = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [images, setCarouselImages] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSearchFilterSection, setShowSearchFilterSection] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    date: "",
    venue: "",
    category: "all",
  });

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [statusFilters, setStatusFilters] = useState({
    new: true,
    upcoming: true,
    slots_full: true,
    ended: false, // default hidden
  });

  const [showAccordion, setShowAccordion] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  const [hideEnded, setHideEnded] = useState(false);

  const sortPrograms = (programs) => {
    const order = { new: 1, upcoming: 2, ended: 3 };
    return [...programs].sort((a, b) => {
      const aOrder = order[a.status] || 999;
      const bOrder = order[b.status] || 999;
      return aOrder - bOrder;
    });
  };

  const getDisplayedPrograms = () => {
    let list = [...filteredPrograms];

    // 🔹 Apply "Hide Ended" toggle
    if (hideEnded) {
      list = list.filter((p) => p.status !== "ended");
    }

    // 🔹 Apply statusFilters checkboxes
    list = list.filter((p) => statusFilters[p.status] ?? true);

    // 🔹 Keep the sorting logic (new → upcoming → slots_full → ended)
    return sortPrograms(list);
  };

  // Fetch carousel images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/get-carousel-images`);
        if (response.ok) {
          const data = await response.json();
          setCarouselImages(data);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    fetchImages();
  }, []);

  // Fetch training programs
  useEffect(() => {
    const fetchTrainingPrograms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/training-programs`);
        if (response.ok) {
          const data = await response.json();
          setTrainingPrograms(data);
          setFilteredPrograms(data);
        }
      } catch (error) {
        console.error("Error fetching training programs:", error);
      }
    };

    fetchTrainingPrograms();
  }, []);

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

  const handleCardClick = (program) => {
    navigate(`/user/home/${program.id}`, { state: { program } });
  };

  const nextImage = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (!images.length) return; // Prevent running if no images

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Fixed at 5 seconds

    return () => clearInterval(interval);
  }, [images.length]); // Only re-run if number of images changes

  const toMillis = (val) => {
    if (!val) return null;

    // Firestore Timestamp (client SDK or REST)
    if (typeof val === "object") {
      if (typeof val.seconds === "number") return val.seconds * 1000;
      if (typeof val._seconds === "number") return val._seconds * 1000;
      if (typeof val.toDate === "function") {
        try {
          return val.toDate().getTime();
        } catch {
          /* ignore */
        }
      }
    }

    // Numbers (seconds or ms)
    if (typeof val === "number") {
      return val > 1e12 ? val : val * 1000; // if seconds, convert to ms
    }

    // Strings (e.g., "August 21, 2025 at 8:00:00 AM UTC+8")
    if (typeof val === "string") {
      let s = val.trim();
      // normalize weird thin/narrow spaces and "at" word, convert timezone to +08:00
      s = s.replace(/\u202F|\u00A0/g, " "); // non-breaking/thin spaces → normal space
      s = s.replace(/\s+at\s+/i, " "); // " at " → " "
      s = s.replace(/UTC\+?8\b/i, "+08:00"); // UTC+8 → +08:00
      const t = Date.parse(s);
      if (!Number.isNaN(t)) return t;
    }

    return null;
  };

  // Get the earliest start time (ms) considering both selected_dates and start_date
  const getEarliestStartMs = (program) => {
    let candidates = [];

    // Specific mode: selected_dates array (of Timestamps / numbers / strings)
    if (
      Array.isArray(program.selected_dates) &&
      program.selected_dates.length > 0
    ) {
      const sel = program.selected_dates
        .map(toMillis)
        .filter((m) => typeof m === "number" && !Number.isNaN(m));
      candidates = candidates.concat(sel);
    }

    // Range mode: start_date (seconds)
    if (program.start_date) {
      const rangeStart = toMillis(program.start_date);
      if (rangeStart) candidates.push(rangeStart);
    }

    if (candidates.length === 0) return null;
    return Math.min(...candidates);
  };

  // Format a date nicely (PH locale short form: e.g., Aug 21, 2025)
  const formatShortDate = (ms) => {
    if (!ms) return "No Date";
    return new Date(ms).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show the next upcoming date from either selected_dates or range
  const getProgramDateEarliest = (program) => {
    const now = new Date().getTime();
    
    if (program.selected_dates?.length > 0) {
      // For selected dates, find the next upcoming date
      const futureDates = program.selected_dates
        .map(date => toMillis(date))
        .filter(ms => ms >= now);
      
      if (futureDates.length > 0) {
        return formatShortDate(Math.min(...futureDates)); // Next upcoming date
      }
      // If no future dates, show the last date
      const dates = program.selected_dates.map(date => toMillis(date));
      return formatShortDate(Math.max(...dates)) + " (Last)";
    }
    
    // For date range
    if (program.start_date && program.end_date) {
      const startMs = toMillis(program.start_date);
      const endMs = toMillis(program.end_date);
      
      if (now <= endMs) {
        if (now < startMs) {
          return formatShortDate(startMs); // Show start date if not started
        }
        return formatShortDate(now); // Show current date if in progress
      }
      return formatShortDate(endMs) + " (Ended)"; // Show end date if ended
    }
    
    return "No Date";
  };

  // Countdown to next date or show status
  const getDaysUntilStart = (program) => {
    const now = new Date().getTime();
    
    if (program.selected_dates?.length > 0) {
      const futureDates = program.selected_dates
        .map(date => toMillis(date))
        .filter(ms => ms >= now);
      
      if (futureDates.length > 0) {
        const nextDate = Math.min(...futureDates);
        const days = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
        if (days === 0) return "Today";
        if (days === 1) return "Tomorrow";
        return `In ${days} days`;
      }
      return "Completed";
    }
    
    if (program.start_date && program.end_date) {
      const startMs = toMillis(program.start_date);
      const endMs = toMillis(program.end_date);
      
      if (now < startMs) {
        const days = Math.ceil((startMs - now) / (1000 * 60 * 60 * 24));
        if (days === 0) return "Today";
        if (days === 1) return "Tomorrow";
        return `Starts in ${days} days`;
      } else if (now <= endMs) {
        return "In Progress";
      }
      return "Ended";
    }
    
    return null;
  };

  const [activeFilterModal, setActiveFilterModal] = useState(null);

  const openFilterModal = (filterName) => {
    setActiveFilterModal(filterName);
  };

  const closeModal = () => {
    setActiveFilterModal(null);
  };
  return (
    <div className="w-full bg-white">

      <section
        id="carousel"
        className="relative w-full h-screen snap-start flex flex-col md:flex-row bg-neutral-900"
      >
        {/* Right Panel (carousel image) - goes on top in mobile */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center overflow-hidden order-1 md:order-2">
          <AnimatePresence custom={currentImageIndex}>
            <motion.div
              key={currentImageIndex}
              className="absolute inset-0 w-full h-full flex"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <img
                src={images[currentImageIndex]?.url}
                alt="carousel"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 
             text-white text-3xl z-10 bg-black/40 hover:bg-black/60 p-2 rounded-full"
          >
            ❮
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 
             text-white text-3xl z-10 bg-black/40 hover:bg-black/60 p-2 rounded-full"
          >
            ❯
          </button>
        </div>

        {/* Left Panel (text) - goes below on mobile */}
        <div className="flex flex-col justify-center items-start p-8 md:p-16 w-full md:w-1/2 h-1/2 md:h-full order-2 md:order-1">
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight 
    bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-500 
    bg-clip-text text-transparent 
    bg-[length:200%_200%] animate-gradient"
          >
            Unleashing the Power of the Future
          </h1>



          <p className="text-gray-400 mt-6 max-w-md text-base md:text-lg">
            Apply to MDRRMO training programs anytime, anywhere.
            Our online platform makes the process faster, simpler,
            and more convenient than ever.
          </p>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => {
                const section = document.getElementById("training-programs");
                if (section) {
                  section.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              Apply Now!
            </button>
          </div>
        </div>

      </section>

      <section
        id="training-programs"
        className="px-4 py-8 md:px-16 md:py-12 lg:py-20 bg-white"
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-black mb-10">
          Offered Training Programs
        </h2>

        {/*Search & Filters */}
        <div className="max-w-6xl mx-auto px-4 h-32">
          <div className="flex flex-wrap gap-2 sm:gap-3 pb-2 justify-between">
            {/* Search Input - Always visible */}
            <div className="relative flex-1 min-w-[220px] flex items-center">
              <input
                type="text"
                placeholder="Search title..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <button
                className="block sm:hidden w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg"
                onClick={() => openFilterModal("type")}
              >
                <span>
                  <FaFilter />
                </span>
              </button>
              <div className="hidden sm:block relative">
                <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                  value={filters.type}
                  name="type"
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  {getUniqueValues("type").map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Venue Filter */}
            <div className="relative">
              <button
                className="block sm:hidden w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg"
                onClick={() => openFilterModal("venue")}
              >
                <span>
                  <FaMapMarkerAlt className="text-black-500" />
                </span>
              </button>
              <div className="hidden sm:block relative">
                <FaMapMarkerAlt className="text-black-500 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-full text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                  value={filters.venue}
                  name="venue"
                  onChange={handleFilterChange}
                >
                  <option value="">All Venues</option>
                  {getUniqueValues("program_venue").map((venue) => (
                    <option key={venue} value={venue}>
                      {venue}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Status Filter (Dropdown with checkboxes) */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="pl-4 pr-4 py-2 rounded-full text-sm bg-blue-600 text-white hover:bg-blue-700 
                       focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-auto transition"
              >
                Status Filter
              </button>

              <AnimatePresence>
                {showStatusDropdown && (
                  <>
                    {/* Mobile: Backdrop */}
                    <motion.div
                      className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowStatusDropdown(false)} // 👈 tap outside to close
                    />

                    {/* Mobile: Bottom Sheet */}
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="fixed bottom-0 left-0 right-0 w-full max-h-[60%] overflow-y-auto rounded-t-2xl
                             bg-white border-t border-gray-200 shadow-lg p-4 z-50 sm:hidden"
                    >
                      <h3 className="text-lg font-semibold mb-3">
                        Status Filter
                      </h3>
                      <div className="space-y-2">
                        {["new", "upcoming", "slots_full", "ended"].map(
                          (status) => (
                            <label
                              key={status}
                              className="flex items-center gap-2 text-sm capitalize py-1 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={statusFilters[status]}
                                onChange={() =>
                                  setStatusFilters((prev) => ({
                                    ...prev,
                                    [status]: !prev[status],
                                  }))
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              {status.replace("_", " ")}
                            </label>
                          )
                        )}
                      </div>
                      <button
                        onClick={() => setShowStatusDropdown(false)}
                        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        Done
                      </button>
                    </motion.div>

                    {/* Desktop: Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 hidden sm:block">
                      {["new", "upcoming", "slots_full", "ended"].map(
                        (status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 text-sm capitalize py-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={statusFilters[status]}
                              onChange={() =>
                                setStatusFilters((prev) => ({
                                  ...prev,
                                  [status]: !prev[status],
                                }))
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            {status.replace("_", " ")}
                          </label>
                        )
                      )}
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Modal for Filters */}
          <AnimatePresence>
            {activeFilterModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeModal} // 👈 close on outside tap
                />

                {/* Modal Content */}
                <motion.div
                  className="fixed inset-0 flex items-center justify-center z-50"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <div className="bg-white p-4 rounded-lg w-[90%] max-w-sm space-y-4 shadow-lg">
                    <h3 className="text-lg font-semibold capitalize">
                      Select {activeFilterModal}
                    </h3>

                    {activeFilterModal === "type" && (
                      <select
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                        name="type"
                        value={filters.type}
                        onChange={(e) => {
                          handleFilterChange(e);
                          closeModal();
                        }}
                      >
                        <option value="">All Types</option>
                        {getUniqueValues("type").map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    )}

                    {activeFilterModal === "date" && (
                      <input
                        type="date"
                        name="date"
                        value={filters.date}
                        onChange={(e) => {
                          handleFilterChange(e);
                          closeModal();
                        }}
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                      />
                    )}

                    {activeFilterModal === "venue" && (
                      <select
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                        name="venue"
                        value={filters.venue}
                        onChange={(e) => {
                          handleFilterChange(e);
                          closeModal();
                        }}
                      >
                        <option value="">All Venues</option>
                        {getUniqueValues("program_venue").map((venue) => (
                          <option key={venue} value={venue}>
                            {venue}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={closeModal}
                      className="block w-full mt-2 text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center">
          {getDisplayedPrograms().length > 0 ? (
            getDisplayedPrograms().map((program) => (
              <div
                key={program.id}
                onClick={() => handleCardClick(program)}
                className="bg-white w-full max-w-xs rounded-2xl border border-gray-200 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transform transition duration-300 flex flex-col h-[500px]"
              >
                {/* Thumbnail with Status Banner ABOVE the image */}
                <div className="relative mt-3">
                  <img
                    src={program.thumbnail}
                    alt={program.program_title || "Not Specified"}
                    className="w-full h-40 object-cover object-center transition group-hover:scale-105 rounded-t-2xl"
                  />

                  {/* 🔖 Status Banner */}
                  {program.status === "new" && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      New
                    </span>
                  )}
                  {program.status === "upcoming" && (
                    <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      Upcoming
                    </span>
                  )}
                  {program.status === "ended" && (
                    <span className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      Ended
                    </span>
                  )}
                  {program.status === "slots_full" && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      Slots Full
                    </span>
                  )}

                  {/* Countdown Pill */}
                  {getDaysUntilStart(program) && (
                    <span className="absolute bottom-2 right-2 bg-white text-blue-700 text-[11px] font-semibold px-3 py-1 rounded-full shadow-md border border-blue-100 tracking-tight">
                      {getDaysUntilStart(program)}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                    {program.program_title || "Not Specified"}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {program.description ||
                      "Click to learn more about this program."}
                  </p>
                </div>

                {/* Bottom Pills */}
                <div className="mt-auto px-4 pb-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Slots */}
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <FaBullseye className="h-3 w-3 text-green-600" />
                      {program.slots} slots
                    </span>
                    {/* Date (earliest only) */}
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <FaCalendarAlt className="h-3 w-3 text-yellow-600" />
                      {getProgramDateEarliest(program)}
                    </span>
                    {/* Venue */}
                    {program.program_venue && (
                      <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <FaMapMarkerAlt className="h-3 w-3 text-gray-600" />
                        {program.program_venue}
                      </span>
                    )}
                    {/* Trainer */}
                    {program.trainer_assigned && (
                      <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <FaUser className="h-3 w-3 text-purple-600" />
                        {program.trainer_assigned}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
                    Learn More
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center w-full py-12">
              <Lottie
                animationData={nothing_found_gif}
                className="w-72 h-72"
                loop={false}
                autoplay
              />
              <p className="text-gray-500 mt-4 text-center text-sm">
                No training programs found.
              </p>
            </div>
          )}
        </div>
      </section>

      <section id="mission-vision" className="max-w-4xl mx-auto my-10 px-6">
        {/* Card Wrapper */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Main Button to Show Accordion */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-blue-600 text-white font-semibold text-lg py-3 rounded-t-xl flex items-center justify-center space-x-3 hover:bg-blue-700 transition"
            onClick={() => setShowAccordion(!showAccordion)}
          >
            <span>MDRRMO - DAET MISSION/VISION</span>
          </motion.button>

          {/* Accordion Content */}
          <AnimatePresence>
            {showAccordion && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="p-4 flex flex-col space-y-2"
              >
                {/* Mission Button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full py-2 text-lg font-semibold border border-gray-300 rounded-lg flex items-center justify-center space-x-2 transition ${activeTab === "mission"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 text-gray-800"
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
                      className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm"
                    >
                      <p className="text-gray-700 text-sm leading-relaxed">
                        1. Provide an efficient early warning system for
                        calamities & disasters.
                        <br />
                        2. Ensure an effective and immediate response mechanism.
                        <br />
                        3. Deliver valuable guidance in crisis situations.
                        <br />
                        4. Maintain disaster awareness & preparedness.
                        <br />5. Establish a comprehensive data hub for
                        disaster-related information.
                      </p>

                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vision Button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full py-2 text-lg font-semibold border border-gray-300 rounded-lg flex items-center justify-center space-x-2 transition ${activeTab === "vision"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 text-gray-800"
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
                      className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm"
                    >
                      <p className="text-gray-700 text-sm leading-relaxed">
                        1. Build a resilient community with a culture of
                        preparedness.
                        <br />
                        2. Lead in disaster risk reduction & emergency response.
                        <br />
                        3. Foster collaboration through education & awareness.
                        <br />
                        4. Provide top-tier emergency management services.
                        <br />
                        5. Serve as a global model for disaster resilience &
                        safety.
                      </p>

                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
    </div>
  );
};

export default TrainingProgramView;
