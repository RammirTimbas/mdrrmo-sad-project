import React from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import notFoundAnimation from "./lottie-files-anim/404NotFound.json";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 text-center">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        <Lottie animationData={notFoundAnimation} loop={true} />
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mt-4">Page Not Found</h1>
      <p className="text-gray-500 text-sm sm:text-base mt-2">
        Oops! The page you’re looking for doesn’t exist or has been moved.
      </p>

      <button
        onClick={() => navigate("/")}
        className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition duration-200 text-sm sm:text-base"
      >
        Go Home
      </button>
    </div>
  );
};

export default NotFound;
