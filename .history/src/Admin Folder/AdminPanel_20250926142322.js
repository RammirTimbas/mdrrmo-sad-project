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
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUsers,
  FaUserCheck,
  FaUserShield,
  FaCertificate,
  FaEnvelopeOpenText,
  FaCog,
  FaHandshake,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";

const AdminPanel = ({ handleSignOut, userId }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const location = useLocation(); // get the current location
  const [hasPendingApplicants, setHasPendingApplicants] = useState(false);
  const [hasPendingRegistrants, setHasPendingRegistrants] = useState(false);
  const navigate = useNavigate();

  const isMobile = window.innerWidth <= 768;

  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        const userDoc = snapshot.docs.find((doc) => doc.id === userId);
        if (userDoc) {
          setUserInfo(userDoc.data());
        }
      },
      (error) => console.error("Failed to fetch user info:", error)
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (isMobile) {
      navigate("/noaccess", { replace: true });
    }
  }, [isMobile, navigate]);

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

  const handleLogout = () => {
    closeSidebarOnNavLink();

    handleSignOut();
  };

  return (
    <div>
      <div>
        <div className="admin-panel">
          <header className="fixed top-0 left-0 w-full z-50 bg-[#0f172a] text-white shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-[70px]">
              {/* Left: Hamburger + Logo */}
              <div className="flex items-center gap-3">
                {isProgramDetailsOrRatings ? (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-0 m-0 bg-transparent border-0 shadow-none outline-none 
                    text-2xl text-gray-300 hover:text-white transition"
                    style={{ background: 'none' }}
                  >
                    ←
                  </button>
                ) : (
                  <button
                    onClick={toggleSidebar}
                    className="p-0 m-0 bg-transparent border-0 shadow-none outline-none 
                    text-2xl text-gray-300 hover:text-white transition"
                    style={{ background: 'none' }}
                  >
                    ☰
                  </button>
                )}
                <img src={mdrrmo_logo} alt="Logo" className="h-10 w-auto" />
                <span className="font-bold text-lg md:text-xl hidden md:block">
                  MDRRMO Training Program Management System
                </span>
                <span className="font-bold text-lg md:hidden">MDRRMO TPMS</span>
              </div>

              {/* Right: User Profile */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {userInfo?.profile_picture ? (
                    <img
                      src={userInfo.profile_picture}
                      alt="Admin"
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shadow-lg"
                    />
                  ) : (
                    <FaUserCircle className="w-10 h-10 text-blue-400" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {userInfo?.name || "Administrator"}
                    </span>
                    <span className="text-xs text-gray-300">
                      {userInfo?.email || "admin@example.com"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="sidebar-logo">
              <img src={mdrrmo_logo} alt="MDRRMO Logo" />
            </div>
            <hr />
            <ul className="sidebar-nav space-y-1 text-sm">
              {[
                {
                  label: "Dashboard",
                  to: "dashboard",
                  icon: <FaTachometerAlt />,
                  extraActive: isDashboardActive,
                },
                {
                  label: "Training Programs",
                  to: "training-programs",
                  icon: <FaChalkboardTeacher />,
                },
                {
                  label: "Applicants",
                  to: "applicants",
                  icon: <FaUsers />,
                  badge: hasPendingApplicants,
                },
                {
                  label: "Registrants",
                  to: "registrants",
                  icon: <FaUserCheck />,
                  badge: hasPendingRegistrants,
                },
                {
                  label: "Access Control",
                  to: "users",
                  icon: <FaUserShield />,
                },
                {
                  label: "Certificate Requests",
                  to: "certificate",
                  icon: <FaCertificate />,
                },
                {
                  label: "Program Requests",
                  to: "program-requests",
                  icon: <FaEnvelopeOpenText />,
                },
                {
                  label: "Settings",
                  to: "settings",
                  icon: <FaCog />,
                },
                {
                  label: "Engagements",
                  to: "engagements",
                  icon: <FaHandshake />,
                },
              ].map(({ to, icon, label, extraActive, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    isActive || extraActive
                      ? "active"
                      : "text-gray-700 hover:text-green-600"
                  }
                  onClick={closeSidebarOnNavLink}
                >
                  <li className="relative flex items-center gap-3 py-2 pl-2 pr-3 rounded hover:bg-gray-100 transition-colors">
                    {icon}
                    <span>{label}</span>
                    {badge && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    )}
                  </li>
                </NavLink>
              ))}

              <NavLink
                to="/"
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <li className="text-red-500 flex items-center gap-3 py-2 pl-2 pr-3 rounded">
                  <FaSignOutAlt text-red-500 />
                  <span className="text-red-500">Logout</span>
                </li>
              </NavLink>
            </ul>

            <div className="sidebar-footer">
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
    </div>
  );
};

export default AdminPanel;
