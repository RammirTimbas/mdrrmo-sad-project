import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase/firebase";

const TrainerDashboard = ({ userId }) => {
  const [trainerName, setTrainerName] = useState("");
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredPrograms, setFilteredPrograms] = useState({
    today: [],
    week: [],
    month: [],
    all: [],
    past: [],
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  };

  const categorizePrograms = () => {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayEnd = todayStart + 86399;

    const startOfWeek = Math.floor(
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay()))
        .setHours(0, 0, 0, 0) / 1000
    );
    const endOfWeek = startOfWeek + 6 * 86400;

    const startOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).setHours(0, 0, 0, 0) / 1000
    );
    const endOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).setHours(23, 59, 59, 999) / 1000
    );

    const todayPrograms = [];
    const weekPrograms = [];
    const monthPrograms = [];
    const pastPrograms = [];
    const allPrograms = [];

    trainingPrograms.forEach((program) => {
      if (program.dateMode === "range") {
        const startDate = program._normStart;
        const endDate = program._normEnd;

        if (!startDate || !endDate) return;

        if (endDate < todayStart) {
          pastPrograms.push(program);
        } else if (startDate <= now && endDate >= now) {
          todayPrograms.push(program);
        } else if (startDate >= startOfWeek && startDate <= endOfWeek) {
          weekPrograms.push(program);
        } else if (startDate >= startOfMonth && startDate <= endOfMonth) {
          monthPrograms.push(program);
        } else {
          allPrograms.push(program);
        }
      } else if (program.dateMode === "specific" && Array.isArray(program.selected_dates)) {
        const dateSecs = program.selected_dates
          .map((d) => d?._seconds ?? d?.seconds ?? (typeof d === "number" ? d : null))
          .filter((s) => typeof s === "number");

        if (dateSecs.length === 0) return;

        const hasToday = dateSecs.some((d) => d >= todayStart && d <= todayEnd);
        const hasThisWeek = dateSecs.some((d) => d >= startOfWeek && d <= endOfWeek);
        const hasThisMonth = dateSecs.some((d) => d >= startOfMonth && d <= endOfMonth);
        const allPast = dateSecs.every((d) => d < todayStart);

        if (hasToday) {
          todayPrograms.push(program);
        } else if (hasThisWeek) {
          weekPrograms.push(program);
        } else if (hasThisMonth) {
          monthPrograms.push(program);
        } else if (allPast) {
          pastPrograms.push(program);
        } else {
          allPrograms.push(program);
        }
      }
    });

    setFilteredPrograms({
      today: todayPrograms,
      week: weekPrograms,
      month: monthPrograms,
      past: pastPrograms,
      all: allPrograms,
    });
  };




  useEffect(() => {
    const fetchTrainerName = async () => {
      try {
        const trainerDocRef = doc(db, "Trainer Name", userId);
        const trainerDoc = await getDoc(trainerDocRef);
        if (trainerDoc.exists()) {
          setTrainerName(trainerDoc.data().trainer_name);
        }
      } catch (error) {
        console.error("Error fetching trainer name:", error);
      }
    };
    fetchTrainerName();
  }, [userId]);

  useEffect(() => {
    const fetchTrainingPrograms = async () => {
      if (!trainerName) return;
      setLoading(true);
      try {
        const programsRef = collection(db, "Training Programs");
        const q = query(programsRef);
        const querySnapshot = await getDocs(q);

        const programsData = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          let startTs = null;
          let endTs = null;

          if (data.dateMode === "range") {
            startTs = data.start_date ?? null;
            endTs = data.end_date ?? null;
          } else if (
            data.dateMode === "specific" &&
            Array.isArray(data.selected_dates) &&
            data.selected_dates.length > 0
          ) {
            const dateSecs = data.selected_dates
              .map((d) =>
                d?._seconds
                  ? d._seconds
                  : d?.seconds
                    ? d.seconds
                    : typeof d === "number"
                      ? d
                      : null
              )
              .filter((s) => typeof s === "number")
              .sort((a, b) => a - b);
            if (dateSecs.length) {
              startTs = dateSecs[0];
              endTs = dateSecs[dateSecs.length - 1];
            }
          }

          return {
            id: docSnap.id,
            ...data,
            _normStart: startTs,
            _normEnd: endTs,
          };
        });

        const filteredPrograms = programsData.filter((program) => {
          const trainers = program.trainer_assigned;
          const isTrainerAssigned = Array.isArray(trainers)
            ? trainers.includes(trainerName)
            : trainers === trainerName;

          const now = Math.floor(Date.now() / 1000);
          const isOngoing =
            program._normStart &&
            program._normEnd &&
            program._normStart <= now &&
            now <= program._normEnd + 86399;

          const isUpcoming = program._normEnd && program._normEnd >= now;

          return isTrainerAssigned && (isOngoing || isUpcoming);
        });

        setTrainingPrograms(filteredPrograms);
      } catch (error) {
        console.error("Error fetching training programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainingPrograms();
  }, [trainerName]);

  useEffect(() => {
    if (trainingPrograms.length > 0) {
      categorizePrograms();
    }
  }, [trainingPrograms]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-10 text-gray-800">
        👋 Welcome,{" "}
        <span className="text-blue-600">{trainerName || "Trainer"}</span>!
      </h2>

      {Object.keys(filteredPrograms).map((category) => (
        <div key={category} className="mb-12">
          <h3 className="text-xl font-semibold mb-5 text-white px-4 py-2 rounded-lg inline-block bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md">
            {category.toUpperCase()} Programs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
            {filteredPrograms[category].length > 0 ? (
              filteredPrograms[category].map((program) => (
                <NavLink
                  key={program.id}
                  to={`/trainer/training-program-view/${program.id}`}
                  state={{ program }}
                  className="block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative">
                    <img
                      src={program.thumbnail}
                      alt={program.program_title}
                      className="w-full h-44 object-cover"
                    />
                    <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">
                      {program.type || "Training"}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {program.program_title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                      {program.description}
                    </p>

                    {/* ✅ Show either range or individual dates */}
                    {program.dateMode === "range" ? (
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          <strong>Start:</strong>{" "}
                          {program._normStart
                            ? formatDate(program._normStart)
                            : "N/A"}
                        </p>
                        <p>
                          <strong>End:</strong>{" "}
                          {program._normEnd
                            ? formatDate(program._normEnd)
                            : "N/A"}
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 space-y-1">
                        <p className="font-semibold">Dates:</p>
                        <ul className="list-disc list-inside">
                          {Array.isArray(program.selected_dates) &&
                            program.selected_dates.map((d, idx) => {
                              const ts =
                                d?._seconds ??
                                d?.seconds ??
                                (typeof d === "number" ? d : null);
                              return (
                                <li key={idx}>
                                  {ts
                                    ? new Date(ts * 1000).toLocaleDateString(
                                      "en-CA",
                                      {
                                        timeZone: "Asia/Manila",
                                      }
                                    )
                                    : "Invalid Date"}
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
                  </div>
                </NavLink>
              ))
            ) : (
              <p className="text-gray-400 italic text-sm">
                No programs found in this category.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrainerDashboard;
