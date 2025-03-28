import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./pie_chart.css";
import loader from "./blue-loader.svg";
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

        // count the number of type
        programs.forEach((program) => {
          const type = program.type || "Unknown";
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
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
              ],
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
            return `${label}: ${raw}`;
          },
        },
      },
      datalabels: {
        anchor: "center",
        align: "center",
        color: "#fff",
        formatter: (value, context) => {
          const dataset = context.chart.data.datasets[context.datasetIndex];
          const total = dataset.data.reduce((sum, current) => sum + current, 0);
          const percentage = ((value / total) * 100).toFixed(2) + "%";
          return percentage;
        },
      },
    },
  };

  return (
    <div className="pie-chart-container">
      <h3>Training Programs by Type</h3>
      <div className="chart-legend-wrapper">
        <div className="chart-wrapper">
          <Pie data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default TrainingProgramsPieChart;
