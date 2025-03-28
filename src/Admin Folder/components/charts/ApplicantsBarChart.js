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
import Lottie from "lottie-react";
import SubLoading from "./../../../lottie-files-anim/sub-loading.json";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ApplicantsBarChart = () => {
  const [chartData, setChartData] = useState(null); // start as null

  useEffect(() => {
    const fetchApplicantData = async () => {
      try {
        const applicantsCollection = collection(db, "Applicants");
        const snapshot = await getDocs(applicantsCollection);

        // today's date
        const today = new Date();

        // array to hold all 7 days and the labels
        const applicantsCount = Array(7).fill(0);
        const labels = [];

        // populate days with proper format
        for (let i = 0; i < 7; i++) {
          const date = subDays(today, i);
          labels.push(format(date, "yyyy-MM-dd"));
        }

        // get the count of applicants per each day
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.application_date && data.application_date.toDate) {
            const appDate = data.application_date.toDate();
            const appDateString = format(appDate, "yyyy-MM-dd");
            const dayIndex = labels.indexOf(appDateString);

            if (dayIndex !== -1) {
              applicantsCount[dayIndex]++;
            }
          }
        });

        // if there no applicant in a day, put 0
        const totalApplicants = applicantsCount.reduce((a, b) => a + b, 0);
        if (totalApplicants === 0) {
          setChartData({
            labels: labels.reverse(),
            datasets: [
              {
                label: "Number of Applicants",
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
                label: "Number of Applicants",
                data: applicantsCount.reverse(),
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          });
        }
      } catch (error) {
        console.error("Error fetching applicant data:", error);
      }
    };

    fetchApplicantData();
  }, []);

  // add a loading screen when the chart is not yet ready
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
      <h3>Volume of Applicants Over the Last 7 Days</h3>
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
                text: "Number of Applicants",
              },
              beginAtZero: true,
            },
          },
        }}
      />
    </div>
  );
};

export default ApplicantsBarChart;
