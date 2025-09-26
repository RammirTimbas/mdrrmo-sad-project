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
import MobileWarning from "./Admin Folder/MobileWarning";
import Users from "./Admin Folder/components/Users";
import { showSweetAlert } from "./helpers/showSweetAlert";
import Registrants from "./Admin Folder/components/Registrants";
import ProgramDetails from "./ProgramDetails";
import TrainingProgramView from "./User Folder/TrainingProgramView";
import History from "./User Folder/History";
import Profile from "./User Folder/Profile";
import ChatUI from "./ChatUI";
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
import PWAInstallPrompt from "./PWAInstallPrompt";
import { requestPermission } from "./messaging";
import NotFound from "./NotFound";
import EnterPin from "./EnterPin";
import Schedule from "./Schedule";

import { v4 as uuidv4 } from "uuid";
import { UAParser } from "ua-parser-js";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [userId, setUserId] = useState(null);

  const [notification, setNotification] = useState(null);

  const [hasPin, setHasPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [storedPin, setStoredPin] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      requestPermission(userId);
    }
  }, [userId]);

  /*
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
        navigate(`/${data.profile}/`);
      } catch (error) {
        console.error("⚠️ Error checking session:", error);
      }
      setLoadingAuthState(false);
    };

    checkSession();

    const interval = setInterval(checkSession, 300000); //5 mins

    return () => clearInterval(interval);
  }, []);
  */

  useEffect(() => {
    const checkSession = async () => {
      try {
        // unique session
        const sessionId = uuidv4();

        const parser = new UAParser();
        const result = parser.getResult();
        const deviceName = result.device.model || "Unknown Device";

        const response = await fetch(`${API_BASE_URL}/check-session`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Session-ID": sessionId,
            "Device-Name": deviceName,
          },
        });

        if (!response.ok) {
          console.warn("🔴 Session expired or not authenticated.");
          setLoggedIn(false);
          setUserProfile(null);
          setLoadingAuthState(false);
          return;
        }

        const data = await response.json();
        console.log("✅ Restoring session:", data);

        setUserId(data.userId);
        setUserProfile(data.profile);
        setLoggedIn(true);

        // fetch user data if pin exists
        try {
          const res = await fetch(`${API_BASE_URL}/get-user/${data.userId}`);
          const userData = await res.json();

          if (userData.pin) {
            setHasPin(true);
            setStoredPin(userData.pin);
            setPinVerified(false); //re-enter pin on refresh
          } else {
            setHasPin(false);
            setPinVerified(true);
          }
        } catch (error) {
          console.error(
            "Error fetching user data after session restore:",
            error
          );
        }

        navigate(`/${data.profile}/`);
      } catch (error) {
        console.error("⚠️ Error checking session:", error);
        setLoggedIn(false);
      }

      setLoadingAuthState(false);
    };

    checkSession();
  }, []);

  const handleLogin = async (userId, userProfile) => {
    try {
      // check for pin
      const res = await fetch(`${API_BASE_URL}/get-user/${userId}`);
      const data = await res.json();

      if (data.pin) {
        setHasPin(true);
        setStoredPin(data.pin);
      } else {
        setHasPin(false);
        setPinVerified(true); // if no pin, proceed
      }

      requestPermission(userId);
      setUserId(userId);
      setUserProfile(userProfile);
      setLoggedIn(true);
      toggleLoginForm();
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handlePinSubmit = (enteredPin) => {
    if (enteredPin === storedPin) {
      setPinVerified(true);
      showSweetAlert({
        title: "PIN Verified!",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    } else {
      showSweetAlert({
        title: "Incorrect PIN",
        text: "Please try again.",
        icon: "error",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      // reset all state
      setLoggedIn(false);
      setUserProfile(null);
      setUserId(null);
      setHasPin(false);
      setStoredPin(null);
      setPinVerified(false);
      setShowLoginForm(false);
      setShowRegistrationForm(false);

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
          className="w-32 h-32 animate-pulse"
        />
      </div>
    );
  }

  return (
    <div className="App">
      <PWAInstallPrompt />
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

      {loggedIn && hasPin && !pinVerified ? (
        <EnterPin onSubmit={handlePinSubmit} onReturn={handleSignOut} />
      ) : (
        <Routes>
          {loggedIn && userProfile ? (
            userProfile === "admin" ? (
              <Route
                path="/admin"
                element={
                  <AdminPanel userId={userId} handleSignOut={handleSignOut} />
                }
              >
                <Route index element={<Dashboard userId={userId} />} />
                <Route path="dashboard" element={<Dashboard userId={userId} />} />
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
                  element={<ProgramDetails userId={userId} />}
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
                <Route path="*" element={<NotFound />} />
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
                <Route path="*" element={<NotFound />} />
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
                  element={<ProgramDetails userId={userId} hasPin={hasPin} />}
                />
                <Route
                  path="training-programs"
                  element={<History userId={userId} />}
                />
                <Route
                  path="/user/training-programs/:programId"
                  element={<ProgramDetails userId={userId} />}
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
                <Route path="chat" element={<ChatUI userId={userId} />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            )
          ) : (
            <>
              <Route
                path="/"
                element={<VisitorPanel onLoginClick={toggleLoginForm} />}
              />
              <Route path="/schedule" element={<Schedule />} />
            </>
          )}

          <Route path="/reset-password" element={<ResetPasswordRequest />} />

          <Route
            path="/noaccess"
            element={<MobileWarning handleSignOut={handleSignOut} />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </div>
  );
};

export default App;
