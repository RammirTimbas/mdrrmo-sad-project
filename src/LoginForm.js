import React, { useState } from "react";
import "./CSS Folder/login_form.css";
import { useNavigate } from "react-router-dom";
import { showSweetAlert } from "./helpers/showSweetAlert";
import Lottie from "lottie-react";
import SubLoading from "./lottie-files-anim/sub-loading.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL; // Set backend URL in .env file

const LoginForm = ({ onClose, onNoAccount, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTrainerLogin, setIsTrainerLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isTrainerLogin }), // ✅ Send isTrainerLogin
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      console.log("🔹 Login Response Data:", data); // Debugging log

      // ✅ Set user profile & trainer name if applicable
      if (typeof onLogin === "function") {
        onLogin(data.userId, data.profile, data.trainerName);
      }

      showSweetAlert({
        title: `Login Successful`,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });

      // 🔀 Redirect based on user profile
      if (data.profile === "admin") {
        navigate("/admin/");
      } else if (isTrainerLogin) {
        navigate("/trainer/");
      } else {
        navigate("/user/");
      }

      onClose(); // Close login modal
    } catch (err) {
      console.error("Login Error:", err);
      setError("Something went wrong. Please try again.");
      showSweetAlert({
        title: "An error occurred",
        text: "Please try again.",
        icon: "warning",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    navigate("/reset-password");
  };

  const handleForgotPassword = () => {
    onClose();
    handleReset();
  };

  return (
    <div className="login-form-container">
      <div className="login-form">
        <span className="close-icon" onClick={onClose}>
          ✖
        </span>
        <h2>Login</h2>
        <p className="txt-1">Login to access all features!</p>

        <div className="tab-container">
          <button
            onClick={() => setIsTrainerLogin(false)}
            className={!isTrainerLogin ? "active-tab" : ""}
          >
            User
          </button>
          <button
            onClick={() => setIsTrainerLogin(true)}
            className={isTrainerLogin ? "active-tab" : ""}
          >
            Trainer
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isTrainerLogin ? "Enter trainer email" : "Email"}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isTrainerLogin ? "Enter trainer password" : "Password"}
            required
          />
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? (
              "Logging in..."
            ) : (
              "Log In"
            )}
          </button>
          <button className="no-account" onClick={onNoAccount}>
            Sign Up
          </button>
        </form>

        <p className="forgot-password" onClick={handleForgotPassword}>
          Forgot Password
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
