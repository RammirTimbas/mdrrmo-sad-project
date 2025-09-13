import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  NavLink,
  useLocation,
  Outlet,
  Navigate,
  useNavigate,
} from "react-router-dom";
import mdrrmo_logo from "./mdrrmo_logo.png";
import defaultLogo from "./placeholder_image.png";
import {
  FaSignOutAlt,
  FaHome,
  FaClipboardList,
  FaPlusCircle,
  FaBell,
  FaUserCircle,
  FaTools,
  FaFacebookMessenger,
} from "react-icons/fa";
import Header from "../Header";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const UserPanel = ({ userId, handleSignOut }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerBackground, setHeaderBackground] = useState("#FFFFFF");
  const location = useLocation();
  const navigate = useNavigate();

  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("is_read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-info/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch user information");

        const userInfo = await response.json();
        setUserInfo(userInfo);
      } catch (error) {
        console.error("Error fetching user information:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userId]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const closeSidebarOnNavLink = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const sectionOffsetTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      const scrollPosition = sectionOffsetTop + sectionHeight * 0.1;

      window.scrollTo({ top: scrollPosition, behavior: "smooth" });
    }
  };

  const isIndexActive =
    location.pathname === "/user/" ||
    location.pathname === "/user/training-program-view";

  const handleLogout = () => {
    closeSidebarOnNavLink();
    handleSignOut();
  };

  return (
    <div className="UserPanel">
      {/* ✅ Header always at the top */}
      <Header
        headerBackground={headerBackground}
        handleInteraction={toggleSidebar}
        scrollToSection={scrollToSection}
        showLogin={false}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo flex flex-col items-center py-4">
          <img
            src={userInfo?.profile_picture || defaultLogo}
            alt="User Profile"
            className="profile-picture"
          />
          <h2 className="greeting">Welcome, {userInfo?.full_name}!</h2>
          <p className="text-xs text-gray-500 text-center mt-1">
            {userInfo?.email || "email@example.com"}
          </p>
        </div>

        <hr />
        <ul className="sidebar-nav">
          <NavLink
            to="home"
            className={({ isActive }) =>
              isActive || isIndexActive ? "active" : ""
            }
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item">
              <FaHome className="nav-icon" />
              <span className="nav-label">Home</span>
            </li>
          </NavLink>
          <NavLink
            to="training-programs"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item">
              <FaClipboardList className="nav-icon" />
              <span className="nav-label">My Applications</span>
            </li>
          </NavLink>
          <NavLink
            to="request-program"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item">
              <FaPlusCircle className="nav-icon" />
              <span className="nav-label">Request Program</span>
            </li>
          </NavLink>
          <NavLink
            to="notifications"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item relative">
              <FaBell className="nav-icon" />
              <span className="nav-label">Notifications</span>
              {hasUnread && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-blink"></span>
              )}
            </li>
          </NavLink>
          <NavLink
            to="chat"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item relative">
              <FaFacebookMessenger className="nav-icon" />
              <span className="nav-label">Support</span>
            </li>
          </NavLink>
          <NavLink
            to="profile"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={closeSidebarOnNavLink}
          >
            <li className="nav-item">
              <FaTools className="nav-icon" />
              <span className="nav-label">Settings</span>
            </li>
          </NavLink>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={handleLogout}
          >
            <li className="nav-item text-red-500">
              <FaSignOutAlt className="nav-icon text-red-500" />
              <span className="nav-label text-red-500">Logout</span>
            </li>
          </NavLink>
        </ul>

        <div className="sidebar-footer">
          <p>&copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      {sidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}

      {/* ✅ Add padding to avoid overlap */}
      <main className="admin-content pt-[70px]">
        <Outlet />
        {location.pathname === "/user" && <Navigate to="training-program-view" />}
      </main>
    </div>
  );
};

export default UserPanel;