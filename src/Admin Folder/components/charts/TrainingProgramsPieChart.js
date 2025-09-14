import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns"; // ✅ for formatting if types have dates
import "./pie_chart.css";
import SubLoading from "./../../../lottie-files-anim/sub-loading.json";
import Lottie from "lottie-react";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const TrainingProgramsPieChart = () => {
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    const fetchProgramTypes = async () => {
      try {
        const programsCollection = collection(db, "Training Programs");
        const snapshot = await getDocs(programsCollection);
        const programs = snapshot.docs.map((doc) => doc.data());

        const programTypesCount = {};

        programs.forEach((program) => {
          let type = program.type || "Unknown";

          // ✅ If type looks like a date, format it nicely
          if (!isNaN(Date.parse(type))) {
            type = format(new Date(type), "MMM. dd, yyyy");
          }

          if (!programTypesCount[type]) {
            programTypesCount[type] = 0;
          }
          programTypesCount[type]++;
        });

        const types = Object.keys(programTypesCount);
        const counts = Object.values(programTypesCount);

        setChartData({
          labels: types,
          datasets: [
            {
              label: "Training Programs by Type",
              data: counts,
              backgroundColor: [
                "#3B82F6", // Tailwind blue
                "#10B981", // Tailwind green
                "#F59E0B", // Tailwind amber
                "#EF4444", // Tailwind red
                "#8B5CF6", // Tailwind violet
                "#14B8A6", // Tailwind teal
              ],
              borderWidth: 2,
              hoverOffset: 12, // ✅ add hover animation
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching program types:", error);
      }
    };

    fetchProgramTypes();
  }, []);

  if (!chartData.labels || !chartData.datasets) {
    return (
      <div className="loading-screen1">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 mb-6">
            <Lottie animationData={SubLoading} loop={true} />
          </div>
        </div>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right",
        labels: {
          boxWidth: 20,
          padding: 10,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const { label, raw } = tooltipItem;
            return `${label}: ${raw} programs`;
          },
        },
      },
      datalabels: {
        anchor: "center",
        align: "center",
        color: "#fff",
        font: { weight: "bold" },
        formatter: (value, context) => {
          const dataset = context.chart.data.datasets[context.datasetIndex];
          const total = dataset.data.reduce((sum, current) => sum + current, 0);
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return percentage;
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  return (
    <div className="pie-chart-container">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Training Programs by Type
      </h3>
      <div className="chart-legend-wrapper">
        <div className="chart-wrapper">
          <Pie data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default TrainingProgramsPieChart;
