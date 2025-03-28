import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaArrowLeft, FaArrowRight } from "react-icons/fa";

const CertificateDetailsModal = ({
  isOpen,
  onClose,
  certificateDetails,
  userDetails,
}) => {
  const [activeTab, setActiveTab] = useState("certificate");

  if (!isOpen || !certificateDetails || !userDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 12 }}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl min-h-[500px] h-auto relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-20 h-20 bg-white flex items-center justify-center rounded-full hover:bg-red-100 transition focus:outline-none"
          style={{ zIndex: 50 }}
        >
          <FaTimes size={28} className="text-gray-500 hover:text-red-800" />
        </button>

        {/* Sliding Container */}
        <div className="relative w-full overflow-hidden">
          <motion.div
            className="flex w-[200%] min-h-[450px]" // Match min height
            animate={{ x: activeTab === "certificate" ? "0%" : "-50%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {/* Certificate Details */}
            <div className="w-1/2 p-6 flex flex-col text-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Certificate Details
              </h3>
              <div className="w-full bg-gray-100 rounded-lg p-6 text-gray-700 text-left max-h-[350px] overflow-y-auto">
                <p className="mb-2">
                  <strong>Program:</strong> {certificateDetails.programName}
                </p>
                <p className="mb-2">
                  <strong>Location:</strong> {certificateDetails.location}
                </p>
                <p className="mb-2">
                  <strong>Date:</strong> {certificateDetails.programDate}
                </p>
                <p className="mb-2">
                  <strong>Serial Number:</strong>{" "}
                  {certificateDetails.serialNumber}
                </p>
                <p className="mb-2">
                  <strong>Status:</strong> {certificateDetails.status}
                </p>
                <a
                  href={certificateDetails.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium block mt-4"
                >
                  📜 View Certificate
                </a>
              </div>

              {/* Navigation */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setActiveTab("user")}
                  className="text-white-600 hover:underline flex items-center text-lg transition transform hover:scale-105"
                >
                  View User Details <FaArrowRight className="ml-2" />
                </button>
              </div>
            </div>

            {/* User Details */}
            <div className="w-1/2 p-6 flex flex-col text-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                User Details
              </h3>

              {/* Profile Picture */}
              <img
                src={
                  userDetails.profile_picture ||
                  "https://via.placeholder.com/100"
                }
                alt="Profile"
                className="w-28 h-28 rounded-full shadow-md border mb-4 object-cover mx-auto"
              />

              <div className="w-full bg-gray-100 rounded-lg p-6 text-gray-700 text-left max-h-[350px] overflow-y-auto">
                <p className="mb-2">
                  <strong>Name:</strong> {userDetails.full_name}
                </p>
                <p className="mb-2">
                  <strong>Age:</strong> {userDetails.age}
                </p>
                <p className="mb-2">
                  <strong>Gender:</strong> {userDetails.gender}
                </p>
                <p className="mb-2">
                  <strong>Email:</strong> {userDetails.email}
                </p>
                <p className="mb-2">
                  <strong>Mobile:</strong> {userDetails.mobile_number}
                </p>
                <p className="mb-2">
                  <strong>Municipality:</strong> {userDetails.municipality}
                </p>
                <p className="mb-2">
                  <strong>Barangay:</strong> {userDetails.barangay}
                </p>
                <p className="mb-2">
                  <strong>School/Agency:</strong> {userDetails.school_agency}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-start mt-4">
                <button
                  onClick={() => setActiveTab("certificate")}
                  className="text-white-600 hover:underline flex items-center text-lg transition transform hover:scale-105"
                >
                  <FaArrowLeft className="mr-2" /> View Certificate Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default CertificateDetailsModal;
