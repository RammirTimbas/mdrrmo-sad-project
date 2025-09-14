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
import loader from "./blue-loader.svg";
import SubLoading from "./../../../lottie-files-anim/sub-loading.json";
import Lottie from "lottie-react";
import { motion } from "framer-motion";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const RegistrantsBarChart = () => {
  const [chartData, setChartData] = useState(null);

  //fetch the data to be inserted to the chart
  useEffect(() => {
    const fetchRegistrantData = async () => {
      try {
        const registrantsCollection = collection(db, "Registrants");
        const snapshot = await getDocs(registrantsCollection);

        const today = new Date();
        const registrantsCount = Array(7).fill(0);
        const labels = [];

        // ✅ Use readable format (Sep. 13, 2025)
        for (let i = 0; i < 7; i++) {
          const date = subDays(today, i);
          labels.push(format(date, "MMM. dd, yyyy"));
        }

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.submittedAt && data.submittedAt.toDate) {
            const regDate = data.submittedAt.toDate();
            // ✅ Match format with labels
            const regDateString = format(regDate, "MMM. dd, yyyy");
            const dayIndex = labels.indexOf(regDateString);

            if (dayIndex !== -1) {
              registrantsCount[dayIndex]++;
            }
          }
        });

        const totalRegistrants = registrantsCount.reduce((a, b) => a + b, 0);
        setChartData({
          labels: labels.reverse(),
          datasets: [
            {
              label: "Number of Registrants",
              data: totalRegistrants === 0 ? Array(7).fill(0) : registrantsCount.reverse(),
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching registrant data:", error);
      }
    };

    fetchRegistrantData();
  }, []);


  // put a loading screen when the chart is not yet ready
  if (!chartData) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-2xl shadow-lg w-full"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        📊 Volume of Registrants (Last 7 Days)
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
                title: { display: true, text: "Number of Registrants" },
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

export default RegistrantsBarChart;
