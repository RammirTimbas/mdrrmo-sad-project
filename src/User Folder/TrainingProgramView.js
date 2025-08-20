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

  const [showAccordion, setShowAccordion] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

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

  const getProgramDate = (program) => {
    if (
      Array.isArray(program.selected_dates) &&
      program.selected_dates.length > 0
    ) {
      const sortedDates = [...program.selected_dates].sort(
        (a, b) => a.seconds - b.seconds
      );
      const firstDate = sortedDates[0];
      if (firstDate?.seconds) {
        return new Date(firstDate.seconds * 1000).toLocaleDateString();
      } else if (firstDate?.toDate) {
        // fallback for Firestore Timestamp object
        return firstDate.toDate().toLocaleDateString();
      }
    }

    if (program.start_date) {
      return new Date(program.start_date * 1000).toLocaleDateString(); // FIXED HERE
    }

    return "No Date";
  };

  const getDaysUntilStart = (program) => {
    let startTimestamp = program.start_date * 1000;

    if (
      Array.isArray(program.selected_dates) &&
      program.selected_dates.length > 0
    ) {
      const sortedDates = [...program.selected_dates].sort(
        (a, b) => a.seconds - b.seconds
      );
      startTimestamp = sortedDates[0].seconds * 1000;
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const startDate = new Date(startTimestamp).setHours(0, 0, 0, 0);

    const diffInMs = startDate - today;
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return null; // already started
    if (diffInDays === 0) return "Starts today";
    if (diffInDays === 1) return "Starts tomorrow";
    return `Starts in ${diffInDays} days`;
  };

  const [activeFilterModal, setActiveFilterModal] = useState(null);

  const openFilterModal = (filterName) => {
    setActiveFilterModal(filterName);
  };

  const closeModal = () => {
    setActiveFilterModal(null);
  };
  return (
    <div className="w-full">
      {/* 🚀 Carousel Section */}
      <section
        id="carousel"
        className="relative w-full h-[35vh] md:h-screen overflow-hidden"
      >
        {/* Left Arrow */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl z-10 bg-transparent p-2"
        >
          ❮
        </button>

        {/* Image Wrapper */}
        <div className="relative w-full h-full overflow-hidden flex items-center">
          <AnimatePresence custom={currentImageIndex}>
            <motion.div
              key={currentImageIndex}
              className="absolute inset-0 w-full h-full flex"
              initial={{ x: "100%" }} // Start off-screen to the right
              animate={{ x: "0%" }} // Move to the center
              exit={{ x: "-100%" }} // Slide out to the left
              transition={{ duration: 0.8, ease: "easeInOut" }}
              onAnimationComplete={() => setIsAnimating(false)}
            >
              <img
                src={images[currentImageIndex]?.url}
                alt="carousel"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl z-10 bg-transparent p-2"
        >
          ❯
        </button>
      </section>

      <section
        id="training-programs"
        className="px-4 py-8 md:px-16 md:py-12 lg:py-20 bg-white"
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-black mb-10">
          Offered Training Programs
        </h2>

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
          </div>

          {/* Mobile Modal for Filters */}
          {activeFilterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-lg w-[90%] max-w-sm space-y-4">
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
                  className="block w-full mt-2 text-center bg-gray-200 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center">
          {filteredPrograms.length > 0 ? (
            filteredPrograms.map((program) => (
              <div
                key={program.id}
                onClick={() => handleCardClick(program)}
                className="bg-white w-full max-w-xs rounded-2xl border border-gray-200 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transform transition duration-300 flex flex-col h-[500px]" // ensure equal height
              >
                {/* Badge Row */}
                <div className="flex items-center justify-between px-4 pt-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 uppercase truncate max-w-[48%]">
                    {program.type || "Not Specified"}
                  </span>
                  <span className="flex items-center justify-end gap-1 text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 capitalize truncate max-w-[48%] text-right">
                    <FaUser className="h-3 w-3 flex-shrink-0" />
                    {program.trainer_assigned || "Not Specified"}
                  </span>
                </div>

                {/* Thumbnail with start badge */}
                <div className="mt-3 relative">
                  <img
                    src={program.thumbnail}
                    alt={program.program_title || "Not Specified"}
                    className="w-full h-40 object-cover object-center transition group-hover:scale-105 rounded-t-2xl"
                  />

                  {/* Start Countdown Pill - styled like the reference image */}
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

                {/* Bottom Section: Pills + CTA */}
                <div className="mt-auto px-4 pb-4">
                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full truncate max-w-full flex items-center gap-1">
                      <FaBullseye className="h-3 w-3 flex-shrink-0 text-green-600" />
                      {program.slots} slots
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full truncate max-w-full flex items-center gap-1">
                      <FaCalendarAlt className="h-3 w-3 flex-shrink-0 text-yellow-600" />
                      {getProgramDate(program)}
                    </span>
                    <span
                      className={`bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full truncate max-w-full flex items-center gap-1 ${
                        program.program_venue ? "" : "invisible"
                      }`}
                    >
                      <FaMapMarkerAlt className="h-3 w-3 flex-shrink-0 text-gray-600" />
                      {program.program_venue || "Hidden"}
                    </span>
                  </div>

                  {/* CTA Button */}
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
    </div>
  );
};

export default TrainingProgramView;
