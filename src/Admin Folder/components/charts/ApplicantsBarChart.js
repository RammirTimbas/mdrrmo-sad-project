import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { format, subDays } from "date-fns";
import Lottie from "lottie-react";
import SubLoading from "./../../../lottie-files-anim/sub-loading.json";
import { motion } from "framer-motion";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ApplicantsBarChart = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchApplicantData = async () => {
      try {
        const applicantsCollection = collection(db, "Applicants");
        const snapshot = await getDocs(applicantsCollection);

        const today = new Date();
        const applicantsCount = Array(7).fill(0);
        const labels = [];

        // ✅ Use readable date format for labels
        for (let i = 0; i < 7; i++) {
          const date = subDays(today, i);
          labels.push(format(date, "MMM. dd, yyyy")); // e.g. Sep. 13, 2025
        }

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.application_date && data.application_date.toDate) {
            const appDate = data.application_date.toDate();
            const appDateString = format(appDate, "MMM. dd, yyyy"); // match labels format
            const dayIndex = labels.indexOf(appDateString);

            if (dayIndex !== -1) {
              applicantsCount[dayIndex]++;
            }
          }
        });

        setChartData({
          labels: labels.reverse(),
          datasets: [
            {
              label: "Number of Applicants",
              data: applicantsCount.reverse(),
              backgroundColor: applicantsCount.map(
                () => "rgba(59, 130, 246, 0.7)" // Tailwind blue
              ),
              borderRadius: 6,
              hoverBackgroundColor: "rgba(37, 99, 235, 0.9)",
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching applicant data:", error);
      }
    };

    fetchApplicantData();
  }, []);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 mb-6">
            <Lottie animationData={SubLoading} loop />
          </div>
          <p className="text-gray-600 font-medium">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-2xl shadow-lg w-full"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        📊 Volume of Applicants (Last 7 Days)
      </h3>

      <div className="overflow-x-auto">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#1E3A8A",
                titleColor: "#fff",
                bodyColor: "#f0f0f0",
              },
            },
            scales: {
              x: {
                title: { display: true, text: "Date" },
                ticks: { color: "#374151" },
              },
              y: {
                title: { display: true, text: "Number of Applicants" },
                beginAtZero: true,
                ticks: { stepSize: 1, color: "#374151" },
              },
            },
          }}
        />
      </div>
    </motion.div>
  );
};

export default ApplicantsBarChart;
