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
import EventOverview from "../Admin Folder/components/EventOverview";

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

  // Show only the earliest date (from selected_dates OR range)
  const getProgramDateEarliest = (program) => {
    const earliest = getEarliestStartMs(program);
    return earliest ? formatShortDate(earliest) : "No Date";
  };

  // Countdown to earliest start (days)
  const getDaysUntilStart = (program) => {
    const startMs = getEarliestStartMs(program);
    if (!startMs) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(startMs);
    startDate.setHours(0, 0, 0, 0);

    const diffInMs = startDate.getTime() - today.getTime();
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

  // Detect mobile (simple window width check)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="w-full bg-white">
      {/* ...existing header, carousel, etc... */}

      {/* EventOverview (calendar) section above mission/vision, responsive for mobile */}
      <section className="my-8">
        <EventOverview mobile={isMobile} />
      </section>

      {/* ...existing mission/vision, program list, etc... */}
    </div>
  );
};

export default TrainingProgramView;
