import React, { useState, useEffect } from "react";
import {
  NavLink,
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
  matchPath,
} from "react-router-dom";
import mdrrmo_logo from "./admin_img/mdrrmo_logo.png";
import dead from "./admin_img/dead.png";
import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const AdminPanel = ({ handleSignOut }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const location = useLocation(); // get the current location
  const [isMobile, setIsMobile] = useState(false);
  const [hasPendingApplicants, setHasPendingApplicants] = useState(false);
  const [hasPendingRegistrants, setHasPendingRegistrants] = useState(false);
  const navigate = useNavigate();

  const isProgramDetailsRoute = matchPath(
    "/admin/training-programs/:programId",
    location.pathname
  );
  const isProgramRatingsRoute = matchPath(
    "/admin/engagements/program-ratings/:programId",
    location.pathname
  );

  const isHistoryRoute = matchPath(
    "/admin/training-programs/user-history/:userId",
    location.pathname
  );

  const MobileWarning = () => {
    return (
      <div className="mobile-warning">
        <img src={dead} alt="Warning" className="warning-image" />
        <h3>
          For a better experience, this is not accessible on mobile devices.
        </h3>
      </div>
    );
  };

  useEffect(() => {
    const now = new Date(); // Get current timestamp object

    const q = query(
      collection(db, "Applicants"),
      where("status", "==", "pending"),
      where("start_date", ">", now) // Fetch only applicants for future programs
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const hasApplicants = !querySnapshot.empty; // Check if there are any applicants
      setHasPendingApplicants(hasApplicants); // Set state accordingly
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Registrants"),
      (querySnapshot) => {
        const hasPending = querySnapshot.docs.some(
          (doc) => doc.data().status === "pending"
        );
        setHasPendingRegistrants(hasPending);
      },
      (error) => {
        console.error("Error fetching registrants:", error);
      }
    );

    return () => unsubscribe(); // Cleanup function to prevent memory leaks
  }, []);

  // format the date
  useEffect(() => {
    const formatDate = () => {
      const date = new Date();
      const options = {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      };
      const formattedDate = date
        .toLocaleDateString("en-GB", options)
        .replace(/ /g, "/");
      setCurrentDate(formattedDate);
    };

    formatDate();
  }, []);

  //check if the user is on mobile
  useEffect(() => {
    const isMobileDevice = () => {
      return /Mobi|Android/i.test(navigator.userAgent);
    };

    if (isMobileDevice()) {
      setIsMobile(true);
    }
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebarOnNavLink = () => {
    if (sidebarOpen) {
      setSidebarOpen(false); // close the sidebar when an option is selected
    }
  };

  // check if the current route is either '/admin' or '/admin/dashboard'
  const isDashboardActive =
    location.pathname === "/admin/" || location.pathname === "/admin/dashboard";

  const isProgramDetailsOrRatings =
    isProgramDetailsRoute || isProgramRatingsRoute || isHistoryRoute;

  return (
    <div>
      {/*conditionally render the layout based on the device the user is using*/}
      {isMobile ? (
        <MobileWarning />
      ) : (
        <div>
          <div className="admin-panel">
            <header className="header">
              {isProgramDetailsOrRatings ? (
                <button className="hamburger" onClick={() => navigate(-1)}>
                  ←
                </button>
              ) : (
                <button className="hamburger" onClick={toggleSidebar}>
                  ☰
                </button>
              )}
              <img src={mdrrmo_logo} alt="Logo" className="logo" />
              <h1 className="title">
                MDRRMO Training Program Management System
              </h1>
              <div className="header-date">{currentDate}</div>
            </header>

            <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="sidebar-logo">
                <img src={mdrrmo_logo} alt="MDRRMO Logo" />
              </div>
              <hr />
              <ul className="sidebar-nav">
                <NavLink
                  to="dashboard"
                  className={({ isActive }) =>
                    isActive || isDashboardActive ? "active" : ""
                  }
                  onClick={closeSidebarOnNavLink} // close sidebar on click
                >
                  <li>Dashboard</li>
                </NavLink>
                <NavLink
                  to="training-programs"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Training Programs</li>
                </NavLink>
                <NavLink
                  to="applicants"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li className="relative flex items-center">
                    <span>Applicants</span>
                    {hasPendingApplicants && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-blink"></span>
                    )}
                  </li>
                </NavLink>

                <NavLink
                  to="registrants"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li className="relative flex items-center">
                    <span>Registrants</span>
                    {hasPendingRegistrants && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-blink"></span>
                    )}
                  </li>
                </NavLink>
                <NavLink
                  to="users"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Access Control</li>
                </NavLink>
                <NavLink
                  to="certificate"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Certificate Requests</li>
                </NavLink>
                <NavLink
                  to="program-requests"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Program Requests</li>
                </NavLink>
                <NavLink
                  to="settings"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Settings</li>
                </NavLink>
                <NavLink
                  to="engagements"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={closeSidebarOnNavLink}
                >
                  <li>Engagements</li>
                </NavLink>
              </ul>
              <div className="sidebar-footer">
                <ul>
                  <button className="sign-out" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </ul>
                <p>&copy; {new Date().getFullYear()}</p>
              </div>
            </div>

            <main className="admin-content">
              <Outlet />
              {location.pathname === "/admin" && <Navigate to="dashboard" />}
            </main>

            {sidebarOpen && (
              <div className="overlay" onClick={toggleSidebar}></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
