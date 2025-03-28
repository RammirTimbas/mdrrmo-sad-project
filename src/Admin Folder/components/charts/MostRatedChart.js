import React, { useState } from "react";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import "./pie_chart.css";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

const MostRatedChart = ({ trainingPrograms }) => {
  const [showAll, setShowAll] = useState(false);
  const topPrograms = trainingPrograms.slice(0, 3);
  const rankedPrograms = showAll ? trainingPrograms : topPrograms;

  const data = {
    datasets: [
      {
        label: "Programs",
        data: trainingPrograms.slice(0, 5).map((program) => ({
          x: program.avgRating,
          y: program.ratingsCount,
          label: program.program_title,
        })),
        backgroundColor: "#007bff",
        pointBorderColor: "rgba(0, 0, 0, 0.7)",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const { x, y } = context.raw;
            const label = context.raw.label || "Program";
            return `${label}: Avg Rating = ${x.toFixed(1)}, Ratings Count = ${y}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Average Rating",
        },
        beginAtZero: true,
        min: 0,
        max: 5,
      },
      y: {
        title: {
          display: true,
          text: "Number of Ratings",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="most-rated-scatter">
      <h3 className="text-lg font-semibold mb-3">Most Rated Programs</h3>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-12 font-semibold border-b pb-2 text-center">
          <span className="col-span-2">Rank</span>
          <span className="col-span-5">Program Title</span>
          <span className="col-span-3">Number of Ratings</span>
          <span className="col-span-2 text-right">Rating</span>
        </div>
        {rankedPrograms.map((program, index) => (
          <div key={program.id} className="grid grid-cols-12 border-b py-2 text-center">
            <span className="col-span-2 font-semibold">#{index + 1}</span>
            <span className="col-span-5">{program.program_title}</span>
            <span className="col-span-3">{program.ratingsCount}</span>
            <span className="col-span-2 text-right text-blue-600">⭐ {program.avgRating.toFixed(1)}</span>
          </div>
        ))}
      </div>
      {trainingPrograms.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showAll ? "See Less" : "See More"}
        </button>
      )}
    </div>
  );
};

export default MostRatedChart;
