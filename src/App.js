import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import LoginForm from "./LoginForm";
import UserPanel from "./User Folder/UserPanel";
import AdminPanel from "./Admin Folder/AdminPanel";
import VisitorPanel from "./VisitiorPanel";
import RegistrationForm from "./RegistrationForm";
import Dashboard from "./Admin Folder/components/Dashboard";
import TrainingPrograms from "./Admin Folder/components/TrainingPrograms";
import Engagements from "./Admin Folder/components/Engagements";
import Applicants from "./Admin Folder/components/Applicants";
import Users from "./Admin Folder/components/Users";
import { showSweetAlert } from "./helpers/showSweetAlert";
import Registrants from "./Admin Folder/components/Registrants";
import ProgramDetails from "./ProgramDetails";
import TrainingProgramView from "./User Folder/TrainingProgramView";
import History from "./User Folder/History";
import Profile from "./User Folder/Profile";
import Settings from "./Admin Folder/components/Settings";
import TrainerDashboard from "./TrainerDashboard";
import TrainerPanel from "./TrainerPanel";
import ProgramRatings from "./Admin Folder/components/ProgramRatings";
import ResetPasswordRequest from "./ResetPasswordRequest";
import RequestProgram from "./User Folder/RequestProgram";
import ProgramRequests from "./Admin Folder/components/ProgramRequests";
import CertificateRequests from "./Admin Folder/components/CertificateRequests";

import mdrrmo_logo from "./logos/mdrrmo_logo.png";
import Notifications from "./Notifications";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

  // 🔹 Check Session API on App Load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/check-session`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          console.warn("🔴 Session expired or not authenticated.");
          setLoggedIn(false);
          setUserProfile(null);

          navigate("/");
          setLoadingAuthState(false);
          return;
        }

        const data = await response.json();
        console.log("✅ Restoring session:", data);

        setUserId(data.userId);
        setUserProfile(data.profile);
        setLoggedIn(true);
        navigate(`/${data.profile}/`); // ✅ Auto-redirect to correct panel
      } catch (error) {
        console.error("⚠️ Error checking session:", error);
      }
      setLoadingAuthState(false);
    };

    checkSession();

    const interval = setInterval(checkSession, 300000); //5 mins

    return () => clearInterval(interval);
  }, []);

  // 🔹 Login Function (Calls API Instead of Direct Firestore)
  const handleLogin = (userId, userProfile) => {
    setUserId(userId);
    setUserProfile(userProfile);
    setLoggedIn(true);
    toggleLoginForm();
  };

  // 🔹 Logout Function (Calls `/logout` API)
  const handleSignOut = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      setLoggedIn(false);
      setUserProfile(null);
      showSweetAlert({
        title: "Logout Successful",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      navigate("/");
    } catch (error) {
      console.error("⚠️ Error logging out:", error);
    }
  };

  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
    setShowRegistrationForm(false);
  };

  const toggleRegistrationForm = () => {
    setShowLoginForm(false);
    setShowRegistrationForm(true);
  };

  if (loadingAuthState) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <img
          src={mdrrmo_logo}
          alt="Loading..."
          className="w-32 h-32 animate-pulse" // 🔹 Adjust size & animation
        />
      </div>
    );
  }

  return (
    <div className="App">
      {showLoginForm && (
        <LoginForm
          onClose={toggleLoginForm}
          onNoAccount={toggleRegistrationForm}
          onLogin={handleLogin}
        />
      )}

      {showRegistrationForm && (
        <RegistrationForm onClose={() => setShowRegistrationForm(false)} />
      )}

      <Routes>
        {loggedIn && userProfile ? (
          userProfile === "admin" ? (
            <Route
              path="/admin"
              element={
                <AdminPanel userId={userId} handleSignOut={handleSignOut} />
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="training-programs"
                element={<TrainingPrograms userId={userId} />}
              />
              <Route
                path="/admin/training-programs/user-history/:userId"
                element={<History />}
              />
              <Route
                path="/admin/training-programs/:programId"
                element={<ProgramDetails userId={userId}/>}
              />
              <Route
                path="applicants"
                element={<Applicants userId={userId} />}
              />
              <Route
                path="registrants"
                element={<Registrants userId={userId} />}
              />
              <Route path="users" element={<Users userId={userId} />} />
              <Route path="settings" element={<Settings userId={userId} />} />
              <Route path="engagements" element={<Engagements />} />
              <Route path="program-requests" element={<ProgramRequests />} />
              <Route path="certificate" element={<CertificateRequests />} />
              <Route
                path="/admin/engagements/program-ratings/:programId"
                element={<ProgramRatings />}
              />
            </Route>
          ) : userProfile === "trainer" ? (
            <Route
              path="/trainer/"
              element={
                <TrainerPanel userId={userId} handleSignOut={handleSignOut} />
              }
            >
              <Route
                index
                element={
                  <TrainerDashboard
                    userId={userId}
                    handleSignOut={handleSignOut}
                  />
                }
              />
              <Route
                path="trainer-dashboard"
                index
                element={
                  <TrainerDashboard
                    userId={userId}
                    handleSignOut={handleSignOut}
                  />
                }
              />
              <Route
                path="/trainer/training-program-view/:programId"
                element={
                  <ProgramDetails
                    userId={userId}
                    handleSignOut={handleSignOut}
                  />
                }
              />
            </Route>
          ) : (
            <Route
              path="/user"
              element={
                <UserPanel userId={userId} handleSignOut={handleSignOut} />
              }
            >
              <Route index element={<TrainingProgramView />} />
              <Route path="home" element={<TrainingProgramView />} />
              <Route
                path="/user/home/:programId"
                element={<ProgramDetails userId={userId}/>}
              />
              <Route
                path="training-programs"
                element={<History userId={userId} />}
              />
              <Route
                path="/user/training-programs/:programId"
                element={<ProgramDetails userId={userId}/>}
              />
              <Route path="profile" element={<Profile userId={userId} />} />
              <Route
                path="request-program"
                element={<RequestProgram userId={userId} />}
              />
              <Route
                path="notifications"
                element={<Notifications userId={userId} />}
              />
            </Route>
          )
        ) : (
          <Route
            path="/"
            element={<VisitorPanel onLoginClick={toggleLoginForm} />}
          />
        )}

        <Route path="/reset-password" element={<ResetPasswordRequest />} />

        <Route
          path="*"
          element={<VisitorPanel onLoginClick={toggleLoginForm} />}
        />
      </Routes>
    </div>
  );
};

export default App;
