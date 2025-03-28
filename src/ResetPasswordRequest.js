import React, { useState } from "react";
import emailjs from "emailjs-com";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import bg from "./reset_bg.jpg";
import Lottie from "lottie-react";
import forgotgif from "./lottie-files-anim/forgot-pass-gif.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const ResetPasswordRequest = () => {
  const [email, setEmail] = useState("");
  const [showCodeField, setShowCodeField] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRequestReset = async () => {
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        const templateParams = {
          user_email: email,
          reset_code: data.recoveryCode,
        };
        emailjs
          .send(
            "service_ehz8f0q",
            "template_odqq44o",
            templateParams,
            "FRhU8JFrBpNQA695D"
          )
          .then(() => {
            setShowCodeField(true);
            Swal.fire(
              "Recovery email sent!",
              "Check your email for the recovery code.",
              "success"
            );
            setError("");
          })
          .catch(() => setError("Failed to send recovery email."));
      } else {
        setError(data.message);
      }
    } catch {
      setError("Something went wrong.");
    }
  };

  const handleVerifyCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-recovery-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (response.ok) {
        Swal.fire(
          "Code Verified!",
          "You can now reset your password.",
          "success"
        );
        setIsVerified(true);
        setError("");
      } else {
        setError(data.message);
      }
    } catch {
      setError("Something went wrong.");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError("Please enter your new password.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        Swal.fire(
          "Password Reset Successful!",
          "You can now log in with your new password.",
          "success"
        );
        navigate("/");
      } else {
        setError(data.message);
      }
    } catch {
      setError("Something went wrong.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gray-100 p-6"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Reset Your Password
        </h2>

        <div className="flex justify-center my-4">
          <Lottie
            animationData={forgotgif}
            loop={true}
            className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56"
            rendererSettings={{
              preserveAspectRatio: "xMidYMid slice", // Crops extra space
            }}
          />
        </div>

        {/* Email Input */}
        {!showCodeField && !isVerified && (
          <>
            <input
              type="email"
              className="mt-4 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition duration-300"
              onClick={handleRequestReset}
            >
              Recover Password
            </button>
          </>
        )}

        {/* Code Verification */}
        {showCodeField && !isVerified && (
          <>
            <input
              type="text"
              className="mt-4 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter the recovery code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold p-3 rounded-lg transition duration-300"
              onClick={handleVerifyCode}
            >
              Verify Code
            </button>
          </>
        )}

        {/* Reset Password */}
        {isVerified && (
          <>
            <input
              type="password"
              className="mt-4 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-semibold p-3 rounded-lg transition duration-300"
              onClick={handleResetPassword}
            >
              Reset Password
            </button>
          </>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordRequest;
