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

        // get today's date
        const today = new Date();

        // array to hold all 7 days
        const registrantsCount = Array(7).fill(0);
        const labels = [];

        // populate label for all 7 days with appropriate format
        for (let i = 0; i < 7; i++) {
          const date = subDays(today, i);
          labels.push(format(date, "yyyy-MM-dd"));
        }

        // count registrants for each day
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.submittedAt && data.submittedAt.toDate) {
            const regDate = data.submittedAt.toDate();
            const regDateString = format(regDate, "yyyy-MM-dd");
            const dayIndex = labels.indexOf(regDateString);

            if (dayIndex !== -1) {
              registrantsCount[dayIndex]++;
            }
          }
        });

        // check if there is a registrant per day and if not, put 0
        const totalRegistrants = registrantsCount.reduce((a, b) => a + b, 0);
        if (totalRegistrants === 0) {
          setChartData({
            labels: labels.reverse(),
            datasets: [
              {
                label: "Number of Registrants",
                data: Array(7).fill(0),
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          });
        } else {
          setChartData({
            labels: labels.reverse(),
            datasets: [
              {
                label: "Number of Registrants",
                data: registrantsCount.reverse(),
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          });
        }
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
    <div style={{ overflowX: "auto" }}>
      <h3>Volume of Registrants Over the Last 7 Days</h3>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: "Date",
              },
            },
            y: {
              title: {
                display: true,
                text: "Number of Registrants",
              },
              beginAtZero: true,
            },
          },
        }}
      />
    </div>
  );
};

export default RegistrantsBarChart;
