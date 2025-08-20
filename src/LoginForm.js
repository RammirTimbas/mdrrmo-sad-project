import React, { useState, useEffect, useRef } from "react";
import "./CSS Folder/login_form.css";
import { useNavigate } from "react-router-dom";
import { showSweetAlert } from "./helpers/showSweetAlert";
import Lottie from "lottie-react";
import SubLoading from "./lottie-files-anim/sub-loading.json";
import { motion, AnimatePresence } from "framer-motion";
import mdrrmo_logo from "./User Folder/mdrrmo_logo.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from "sweetalert2";

import { v4 as uuidv4 } from "uuid";
import { UAParser } from "ua-parser-js";

import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const LoginForm = ({ onClose, onNoAccount, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTrainerLogin, setIsTrainerLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const navigate = useNavigate();
  const modalRef = useRef(null);

  useEffect(() => {
    // Lock scroll when modal is open
    document.body.classList.add("no-scroll");

    // Close modal when clicking outside
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);
  const showConfirmDialog = (title, text, confirmButtonText) => {
    return new Promise((resolve) => {
      Swal.fire({
        title,
        text,
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        resolve(true);
      });
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!recaptchaToken) {
      setError("Captcha not solved. Please Try again.");
      return;
    }

    attemptLogin();
  };

  const attemptLogin = async (forceLogin = false) => {
    setError("");
    setIsLoading(true);
    let errorMsg = "Login failed. Please check your credentials.";

    const sessionId = uuidv4();
    const parser = new UAParser();
    const deviceInfo = parser.getResult();
    const deviceName = deviceInfo.device.model
      ? `${deviceInfo.device.vendor || ""} ${deviceInfo.device.model}`.trim()
      : "Unknown Device";

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          isTrainerLogin,
          rememberMe,
          forceLogin,
          sessionId,
          deviceName,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (
        response.status === 403 &&
        data.error === "Failed reCAPTCHA validation"
      ) {
        setError("Captcha not verified. Please try again.");
        return;
      }

      if (!response.ok) {
        errorMsg =
          data.error === "Invalid credentials"
            ? "Invalid email or password. Please try again."
            : data.error === "Account not found"
            ? "No account found with this email."
            : data.error || errorMsg;

        setError(errorMsg);
        showSweetAlert({
          title: "Login Failed",
          text: errorMsg,
          icon: "warning",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        return;
      }

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

      if (data.profile === "admin") {
        navigate("/admin/");
      } else if (isTrainerLogin) {
        navigate("/trainer/");
      } else {
        navigate("/user/");
      }

      onClose();
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
    <AnimatePresence>
      {/* Backdrop without bouncing */}
      <motion.div
        className="overlay-login-form fixed inset-0 bg-white flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        {/* Login Form with Bounce Effect */}
        <motion.div
          ref={modalRef}
          className="login-form-container bg-white rounded-2xl shadow-lg p-8 w-full max-w-[90%] sm:max-w-[400px] relative overflow-y-auto max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute bg-transparent top-4 right-4 text-gray-500 hover:text-red-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img src={mdrrmo_logo} alt="Logo" className="w-20 h-20" />
            </div>

            {/* Tabs */}
            <div className="relative w-full max-w-[300px] mx-auto mb-6">
              {/* Sliding background indicator */}
              <motion.div
                className="absolute top-0 bottom-0 left-0 w-1/2 bg-blue-100 rounded-md z-0"
                initial={false}
                animate={{ x: isTrainerLogin ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              {/* Tab Buttons */}
              <div className="relative z-10 flex border-b-2 border-blue-600 overflow-hidden rounded-md">
                <button
                  className={`flex-1 py-2 text-sm font-medium focus:outline-none transition-colors duration-300 ${
                    !isTrainerLogin
                      ? "text-blue-600 border-b-2 border-blue-600 bg-transparent"
                      : "text-gray-600 border-b-2 border-transparent bg-transparent"
                  }`}
                  onClick={() => setIsTrainerLogin(false)}
                >
                  User Login
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium focus:outline-none transition-colors duration-300 ${
                    isTrainerLogin
                      ? "text-blue-600 border-b-2 border-blue-600 bg-transparent"
                      : "text-gray-600 border-b-2 border-transparent bg-transparent"
                  }`}
                  onClick={() => setIsTrainerLogin(true)}
                >
                  Trainer Login
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">
              {isTrainerLogin ? "Trainer Login" : "Welcome back"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {isTrainerLogin
                ? "Please enter your trainer credentials."
                : "Please enter your details to login."}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isTrainerLogin ? "Enter trainer email" : "Email"}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isTrainerLogin ? "Enter trainer password" : "Password"
                }
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black pr-12" // Add padding-right for the icon space
              />
              <div
                className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <FaEyeSlash className="text-gray-500" />
                ) : (
                  <FaEye className="text-gray-500" />
                )}
              </div>
            </div>

            {/* Remember Me & Forgot Password (Compact Row) */}
            <div className="flex items-center justify-between text-sm mb-2">
              <label
                htmlFor="rememberMe"
                className="flex items-center gap-2 text-gray-600"
              >
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                Remember me
              </label>

              <span
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm text-center font-semibold bg-red-100 p-2 rounded-md shadow-sm mb-2">
                {error}
              </p>
            )}

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setRecaptchaToken(token)} // ✅ triggers when user solves the captcha
                onErrored={() => setRecaptchaToken(null)}
                onExpired={() => setRecaptchaToken(null)}
                className="my-2"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-900 transition"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Separator */}
          <div className="my-4 flex items-center">
            <div className="flex-grow h-px bg-gray-300"></div>
            <span className="mx-2 text-sm text-gray-500">or</span>
            <div className="flex-grow h-px bg-gray-300"></div>
          </div>

          {/* Register Option */}
          <p className="text-sm text-center mt-6">
            Don’t have an account?{" "}
            <span
              className="text-blue-600 hover:underline cursor-pointer"
              onClick={onNoAccount}
            >
              Register
            </span>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginForm;
