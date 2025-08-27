import React, { useState } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import "./pie_chart.css";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

const MostRatedChart = ({ trainingPrograms }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(trainingPrograms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPrograms = trainingPrograms.slice(
    startIndex,
    startIndex + itemsPerPage
  );


  return (
    <div className="most-rated-scatter space-y-6">
      <h3 className="text-xl font-bold text-gray-700 mb-3">
        ⭐ Most Rated Programs
      </h3>


      {/* Ranking Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="grid grid-cols-12 font-semibold bg-gray-100 py-3 px-4 text-gray-700 text-center">
          <span className="col-span-2">Rank</span>
          <span className="col-span-5">Program Title</span>
          <span className="col-span-3">Ratings Count</span>
          <span className="col-span-2">Avg Rating</span>
        </div>

        {currentPrograms.map((program, index) => (
          <div
            key={program.id}
            className="grid grid-cols-12 py-3 px-4 border-b text-center items-center hover:bg-gray-50 transition"
          >
            <span className="col-span-2 font-bold text-gray-600">
              #{startIndex + index + 1}
            </span>
            <span className="col-span-5 text-gray-800 truncate">
              {program.program_title}
            </span>
            <span className="col-span-3 text-gray-600">
              {program.ratingsCount}
            </span>
            <span className="col-span-2 text-blue-600 font-semibold">
              ⭐ {program.avgRating.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-lg shadow ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 transition"
            }`}
          >
            Prev
          </button>

          <span className="text-gray-600 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-lg shadow ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 transition"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MostRatedChart;
