import React from "react";
import { motion } from "framer-motion";
import { FaFacebook, FaYoutube, FaTimes } from "react-icons/fa";
import Gif from "./Gif.gif";

const FollowUsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 z-modal">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-white text-gray-500 hover:text-gray-800"
        >
          <FaTimes size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center">
          {/* ✅ Add the GIF Here */}
          <img
            src={Gif}
            alt="Thumbs Up"
            className="w-25 h-25"
          />

          <h2 className="text-xl font-semibold text-gray-700">
            A successful download!
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Stay updated with the latest training programs and announcements.
          </p>
        </div>

        {/* Social Media Buttons */}
        <div className="flex flex-col space-y-3 mt-4">
          <motion.a
            href="https://www.facebook.com/MDRRMODaetCN"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white flex items-center justify-center space-x-2 px-4 py-3 rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
            whileHover={{ scale: 1.1 }}
          >
            <FaFacebook size={24} />
            <span className="font-medium">Follow on Facebook</span>
          </motion.a>

          <motion.a
            href="https://www.youtube.com/channel/UCKY978BrAw0fJFIDIiSou9A"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white flex items-center justify-center space-x-2 px-4 py-3 rounded-lg hover:bg-red-700 transition transform hover:scale-105"
            whileHover={{ scale: 1.1 }}
          >
            <FaYoutube size={24} />
            <span className="font-medium">Subscribe on YouTube</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
};

export default FollowUsModal;
