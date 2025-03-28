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

    // Query unread notifications for the user
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("is_read", "==", false)
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty); // If snapshot is not empty, there are unread notifications
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [userId]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-info/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user information");
        }

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebarOnNavLink = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

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

  const isIndexActive =
    location.pathname === "/user/" ||
    location.pathname === "/user/training-program-view";

  const isProgramDetailsRoute =
    location.pathname.includes("/user/home/") ||
    location.pathname.includes("/user/training-programs/");

  return (
    <div>
      <div className="UserPanel">
        <header
          className="header"
          style={{ backgroundColor: headerBackground }}
        >
          {isProgramDetailsRoute ? (
            <button className="hamburger" onClick={() => navigate(-1)}>
              ←
            </button>
          ) : (
            <button className="hamburger" onClick={toggleSidebar}>
              ☰
            </button>
          )}
          <img src={mdrrmo_logo} alt="Logo" className="logo" />
          <h1 className="title">MDRRMO Training Program Management System</h1>
          <h1 className="title-mobile">MDRRMO - TPMS</h1>

          <nav
            className={`header-nav ${
              isProgramDetailsRoute ? "hidden-nav" : ""
            }`}
          >
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
            </ul>
          </nav>
        </header>

        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <img
              src={userInfo?.profile_picture || defaultLogo}
              alt="User Profile"
              className="profile-picture"
            />
            <h2 className="greeting">
              Welcome, {userInfo?.full_name || "User"}!
            </h2>
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
              <li>Home</li>
            </NavLink>
            <NavLink
              to="training-programs"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeSidebarOnNavLink}
            >
              <li>My Applications</li>
            </NavLink>
            <NavLink
              to="request-program"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeSidebarOnNavLink}
            >
              <li>Request Program</li>
            </NavLink>
            <NavLink
              to="notifications"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeSidebarOnNavLink}
            >
              <li className="relative flex items-center">
                <span>Notifications</span>
                {hasUnread && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-blink"></span>
                )}
              </li>
            </NavLink>
            <NavLink
              to="profile"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeSidebarOnNavLink}
            >
              <li>Profile</li>
            </NavLink>
          </ul>
          <div className="sidebar-footer">
            <button onClick={handleSignOut}>Sign Out</button>
            <p>&copy; {new Date().getFullYear()}</p>
          </div>
        </div>

        {sidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}

        <main className="admin-content">
          <Outlet />
          {location.pathname === "/user" && (
            <Navigate to="training-program-view" />
          )}
        </main>
      </div>
    </div>
  );
};

export default UserPanel;
