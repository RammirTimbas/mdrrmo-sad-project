import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import L from "leaflet";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import Lottie from "lottie-react";
import MainLoading from "../.././lottie-files-anim/loading-main.json";
import Swal from "sweetalert2";

// Register Chart.js components
Chart.register(...registerables);

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Map focus component
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const CompletedApplicantsMap = () => {
  const [applicants, setApplicants] = useState([]);
  const [municipalityStats, setMunicipalityStats] = useState({});
  const [expandedMunicipality, setExpandedMunicipality] = useState(null);
  const [loading, setLoading] = useState(true);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const [demographics, setDemographics] = useState(null);
  const [selectedMunicipalityCoords, setSelectedMunicipalityCoords] =
    useState(null);
  // Add state for coverageConfig
  const [coverageConfig, setCoverageConfig] = useState({
    barangay: [
      { threshold: 10, message: "🟢 Sufficient Participation - Well-engaged." },
      { threshold: 5, message: "🟡 Needs Improvement - More training recommended." },
      { threshold: 0, message: "🔴 Low Participation - Needs intervention." },
    ],
    municipality: [
      { threshold: 10, message: "🟢 Good Coverage - Well-represented in training." },
      { threshold: 5, message: "🟡 Moderate Coverage - Somewhat represented." },
      { threshold: 0, message: "🔴 Low Coverage - Needs improvement." },
    ],
  });

  // Listen for live changes to coverageConfig and population data in Firestore
  useEffect(() => {
    const populationRef = doc(db, "Settings", "Populations");
    const unsub = onSnapshot(populationRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.coverageConfig) setCoverageConfig(data.coverageConfig);
        // Live update for municipalityStats
        // Recalculate stats using latest applicants and population data
        // Use cached applicants if available, else fetch
        let applicantsList = [];
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
          const parsedData = JSON.parse(cachedData);
          applicantsList = parsedData.applicants || [];
        } else {
          // Fallback: fetch applicants from Firestore (same as fetchCompletedApplicants)
          try {
            const now = Math.floor(Date.now() / 1000);
            const programsQuery = query(
              collection(db, "Training Programs"),
              where("end_date", "<", now)
            );
            const programsSnapshot = await getDocs(programsQuery);
            const programs = programsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            let allApplicants = [];
            const applicantMap = {};
            programs.forEach((program) => {
              if (program.approved_applicants) {
                Object.values(program.approved_applicants).forEach((applicant) => {
                  if (applicant.status === "approved") {
                    if (!applicantMap[applicant.user_id]) {
                      applicantMap[applicant.user_id] = {
                        user_id: applicant.user_id,
                        name: applicant.full_name,
                        programs: [program.program_title],
                      };
                    } else {
                      applicantMap[applicant.user_id].programs.push(
                        program.program_title
                      );
                    }
                  }
                });
              }
            });
            allApplicants = Object.values(applicantMap);
            // Fetch user info
            const userIds = allApplicants.map((a) => a.user_id);
            if (userIds.length > 0) {
              const userInfoQuery = query(
                collection(db, "User Informations"),
                where("user_ID", "in", userIds)
              );
              const userInfoSnapshot = await getDocs(userInfoQuery);
              const userInfoMap = {};
              userInfoSnapshot.docs.forEach((doc) => {
                userInfoMap[doc.data().user_ID] = doc.data();
              });
              applicantsList = allApplicants.map((applicant) => {
                const userInfo = userInfoMap[applicant.user_id] || {};
                return {
                  id: applicant.user_id,
                  name: applicant.name,
                  programs: applicant.programs || [],
                  barangay: userInfo.barangay || "",
                  municipality: userInfo.municipality || "",
                  province: userInfo.province || "Camarines Norte",
                  street: userInfo.street || "",
                  purok: userInfo.purok || "",
                  zip: userInfo.zip || "",
                  age: userInfo.age || null,
                  gender: userInfo.gender || null,
                  civil_status: userInfo.civil_status || null,
                };
              });
            }
          } catch (e) {
            // If error, leave applicantsList empty
          }
        }
        // Compute Municipality & Barangay Statistics
        const populationData = data.municipalities || {};
        const stats = {};
        applicantsList.forEach((applicant) => {
          const municipality = applicant.municipality || "Unknown Municipality";
          const barangay = applicant.barangay || "Unknown Barangay";
          // Get total population for the municipality (support both camelCase and snake_case, and treat 0 as valid)
          let totalPopulation = undefined;
          if (populationData[municipality]) {
            if (
              populationData[municipality].totalPopulation !== undefined &&
              populationData[municipality].totalPopulation !== null
            ) {
              totalPopulation = populationData[municipality].totalPopulation;
            } else if (
              populationData[municipality].total_population !== undefined &&
              populationData[municipality].total_population !== null
            ) {
              totalPopulation = populationData[municipality].total_population;
            }
          }
          if (totalPopulation === undefined) totalPopulation = "N/A";

          // Get total population for the barangay
          const totalBarangayPopulation =
            populationData[municipality]?.barangays?.[barangay] ?? "N/A";
          // Initialize municipality stats if not exists
          if (!stats[municipality]) {
            stats[municipality] = {
              totalApplicants: 0,
              totalPopulation: totalPopulation,
              barangays: {},
            };
          }
          stats[municipality].totalApplicants++;
          // Initialize barangay stats if not exists
          if (!stats[municipality].barangays[barangay]) {
            stats[municipality].barangays[barangay] = {
              applicants: 0,
              totalPopulation: totalBarangayPopulation,
            };
          }
          stats[municipality].barangays[barangay].applicants++;
        });
        setMunicipalityStats(stats);
      }
    });
    return () => unsub();
  }, []);
  const defaultDemographics = {
    ageGroups: {
      "18-25": 0,
      "26-35": 0,
      "36-45": 0,
      "46-55": 0,
      "56+": 0,
    },
    gender: { male: 0, female: 0, other: 0 }, // Standardized gender keys
    civilStatus: {},
  };

  const [filteredDemographics, setFilteredDemographics] =
    useState(defaultDemographics);

  const CACHE_KEY = "applicantsCache";
  const CACHE_EXPIRY_KEY = "applicantsCacheExpiry";
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes


  useEffect(() => {
    if (demographics) {
      setFilteredDemographics(demographics); // Set initial demographics to all data
    }
  }, [demographics]);

  useEffect(() => {
    const fetchCompletedApplicants = async () => {
      setLoading(true);

      // Check cache in localStorage
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

      if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        console.log("✅ Using cached applicant data");
        const parsedData = JSON.parse(cachedData);
        setApplicants(parsedData.applicants);
        setDemographics(parsedData.demographics);
        setLoading(false);
        return;
      }

      try {
        const now = Math.floor(Date.now() / 1000);

        // Step 1: Fetch programs that have ended
        const programsQuery = query(
          collection(db, "Training Programs"),
          where("end_date", "<", now)
        );
        const programsSnapshot = await getDocs(programsQuery);
        const programs = programsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let allApplicants = [];
        const applicantMap = {}; // Object to track applicants and their programs

        // Step 2: Extract approved applicants (Avoid duplicates)
        programs.forEach((program) => {
          if (program.approved_applicants) {
            Object.values(program.approved_applicants).forEach((applicant) => {
              if (applicant.status === "approved") {
                if (!applicantMap[applicant.user_id]) {
                  applicantMap[applicant.user_id] = {
                    user_id: applicant.user_id,
                    name: applicant.full_name,
                    programs: [program.program_title],
                  };
                } else {
                  applicantMap[applicant.user_id].programs.push(
                    program.program_title
                  );
                }
              }
            });
          }
        });

        allApplicants = Object.values(applicantMap);

        // Step 3: Fetch user locations from "User Informations"
        const userIds = allApplicants.map((a) => a.user_id);
        if (userIds.length === 0) {
          setMunicipalityStats({});
          setLoading(false);
          return;
        }

        const userInfoQuery = query(
          collection(db, "User Informations"),
          where("user_ID", "in", userIds)
        );
        const userInfoSnapshot = await getDocs(userInfoQuery);
        const userData = userInfoSnapshot.docs.map((doc) => doc.data());
        const userInfoMap = {};

        // Demographics
        const demographicsData = {
          ageGroups: {
            "18-25": 0,
            "26-35": 0,
            "36-45": 0,
            "46-55": 0,
            "56+": 0,
          },
          gender: { male: 0, female: 0, other: 0 }, // Standardized gender keys
          civilStatus: {},
        };

        userData.forEach((user) => {
          const age =
            new Date().getFullYear() -
            new Date(user.date_of_birth).getFullYear();
          if (age <= 25) demographicsData.ageGroups["18-25"]++;
          else if (age <= 35) demographicsData.ageGroups["26-35"]++;
          else if (age <= 45) demographicsData.ageGroups["36-45"]++;
          else if (age <= 55) demographicsData.ageGroups["46-55"]++;
          else demographicsData.ageGroups["56+"]++;

          // Normalize gender values
          const normalizedGender = user.gender
            ? user.gender.trim().toLowerCase()
            : "other"; // Default to "other" if undefined

          if (["male", "female"].includes(normalizedGender)) {
            demographicsData.gender[normalizedGender]++;
          } else {
            demographicsData.gender.other++; // Catch unexpected values
          }

          // Process civil status
          const normalizedCivilStatus = user.civil_status
            ? user.civil_status.trim().toLowerCase()
            : "unknown"; // Default if missing

          demographicsData.civilStatus[normalizedCivilStatus] =
            (demographicsData.civilStatus[normalizedCivilStatus] || 0) + 1;
        });

        setDemographics(demographicsData);

        //population stats
        userInfoSnapshot.docs.forEach((doc) => {
          userInfoMap[doc.data().user_ID] = doc.data();
        });

        // Step 4: Fetch Population Data from Firestore (directly fetch the Populations doc)
        const populationRef = doc(db, "Settings", "Populations");
        const populationSnap = await getDoc(populationRef);

        const populationData = populationSnap.exists()
          ? populationSnap.data().municipalities || {}
          : {};

        // Step 5: Compute Municipality & Barangay Statistics
        const stats = {};

        allApplicants.forEach((applicant) => {
          const userInfo = userInfoMap[applicant.user_id] || {};
          const municipality = userInfo.municipality || "Unknown Municipality";
          const barangay = userInfo.barangay || "Unknown Barangay";

          // Get total population for the municipality
          const totalPopulation =
            populationData[municipality]?.total_population ?? "N/A";

          // Get total population for the barangay
          const totalBarangayPopulation =
            populationData[municipality]?.barangays?.[barangay] ?? "N/A";

          // Initialize municipality stats if not exists
          if (!stats[municipality]) {
            stats[municipality] = {
              totalApplicants: 0,
              totalPopulation: totalPopulation,
              barangays: {},
            };
          }
          stats[municipality].totalApplicants++;

          // Initialize barangay stats if not exists
          if (!stats[municipality].barangays[barangay]) {
            stats[municipality].barangays[barangay] = {
              applicants: 0,
              totalPopulation: totalBarangayPopulation,
            };
          }
          stats[municipality].barangays[barangay].applicants++;
        });

        // Set state
        setMunicipalityStats(stats);

        // Step 6: Process map locations
        const applicantsWithLocation = allApplicants.map((applicant) => {
          const userInfo = userInfoMap[applicant.user_id] || {};
          return {
            id: applicant.user_id,
            name: applicant.name,
            programs: applicant.programs || [],
            barangay: userInfo.barangay || "",
            municipality: userInfo.municipality || "",
            province: userInfo.province || "Camarines Norte",
            street: userInfo.street || "",
            purok: userInfo.purok || "",
            zip: userInfo.zip || "",
            age: userInfo.age || null, // 🟢 Add Age
            gender: userInfo.gender || null, // 🟢 Add Gender
            civil_status: userInfo.civil_status || null, // 🟢 Add Civil Status
          };
        });

        // Geocode with caching
        const geocodedApplicants = await Promise.all(
          applicantsWithLocation.map(async (applicant) => {
            const cacheKey = `geo_${applicant.barangay}_${applicant.municipality}`;
            const cachedCoords = localStorage.getItem(cacheKey);

            if (cachedCoords) {
              console.log(
                `✅ Using cached geocode for ${applicant.barangay}, ${applicant.municipality}`
              );
              return { ...applicant, ...JSON.parse(cachedCoords) };
            }

            const coords = await geocodeAddress(
              applicant.barangay,
              applicant.municipality,
              applicant.province,
              applicant.street,
              applicant.purok,
              applicant.zip
            );

            if (coords) {
              localStorage.setItem(cacheKey, JSON.stringify(coords));
            }

            return { ...applicant, lat: coords?.lat, lng: coords?.lng };
          })
        );

        // Step 8: Filter out invalid geocodes
        const validApplicants = geocodedApplicants.filter(
          (applicant) => applicant.lat && applicant.lng
        );

        // Save cache for 30 minutes (only applicants and demographics, not stats)
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            applicants: validApplicants,
            demographics: demographicsData,
          })
        );
        localStorage.setItem(CACHE_EXPIRY_KEY, Date.now() + CACHE_DURATION);

        setApplicants(validApplicants);
      } catch (error) {
        console.error("Error fetching applicants:", error);
      }

      setLoading(false);
    };

    fetchCompletedApplicants();
  }, []);

  const calculateDemographics = (applicantsList) => {
    const newDemographics = {
      ageGroups: {
        "18-25": 0,
        "26-35": 0,
        "36-45": 0,
        "46-55": 0,
        "56+": 0,
      },
      gender: { male: 0, female: 0, other: 0 }, // Standardized gender keys
      civilStatus: {},
    };

    applicantsList.forEach((user) => {
      if (!user.age || !user.gender || !user.civil_status) return; // Ensure valid data

      const age = user.age; // 🟢 Use `age` directly

      // Assign age group
      if (age <= 25) newDemographics.ageGroups["18-25"]++;
      else if (age <= 35) newDemographics.ageGroups["26-35"]++;
      else if (age <= 45) newDemographics.ageGroups["36-45"]++;
      else if (age <= 55) newDemographics.ageGroups["46-55"]++;
      else newDemographics.ageGroups["56+"]++;

      // ✅ Normalize gender values
      const normalizedGender = user.gender?.trim().toLowerCase() || "other"; // Defaults to "other" if undefined

      if (["male", "female"].includes(normalizedGender)) {
        newDemographics.gender[normalizedGender]++;
      } else {
        newDemographics.gender.other++;
      }

      // ✅ Normalize civil status
      const normalizedCivilStatus = user.civil_status
        ? user.civil_status.trim().toLowerCase()
        : "unknown"; // Defaults to "unknown" if missing

      newDemographics.civilStatus[normalizedCivilStatus] =
        (newDemographics.civilStatus[normalizedCivilStatus] || 0) + 1;
    });

    return newDemographics;
  };

  // Geocode address using OpenStreetMap API
  const geocodeAddress = async (
    barangay,
    municipality,
    province,
    street,
    purok,
    zip
  ) => {
    if (!municipality || !province) return null; // Ensure required fields exist

    // List of fallback address formats
    const addressVariants = [
      `${purok ? `Purok ${purok}, ` : ""}${street ? street + ", " : ""}${barangay ? barangay + ", " : ""
      }${municipality}, ${province}, Philippines${zip ? " " + zip : ""}`, // Full Address
      `${barangay ? barangay + ", " : ""
      }${municipality}, ${province}, Philippines${zip ? " " + zip : ""}`, // Without Purok & Street
      `${municipality}, ${province}, Philippines${zip ? " " + zip : ""}`, // Without Barangay
      `${municipality}, ${province}, Philippines`, // Only Municipality & Province
    ];

    for (const address of addressVariants) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address
          )}`
        );
        const data = await response.json();

        if (data.length > 0) {
          console.log(`Geocoded successfully for: ${address}`);
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
          console.warn(`Geocoding failed for: ${address}`);
        }
      } catch (error) {
        console.error(`Geocoding error for: ${address}`, error);
      }
    }

    return null; // Return null if all attempts fail
  };

  const MapZoomController = ({ selectedCoords }) => {
    const map = useMap();

    useEffect(() => {
      if (selectedCoords) {
        map.flyTo(selectedCoords, 14, { animate: true, duration: 1.5 });
      }
    }, [selectedCoords, map]);

    return null;
  };

  return (
    <div>
      {/* Removed Reload Settings button for live updates */}
      {loading ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 mb-6">
              <Lottie animationData={MainLoading} loop={true} />
            </div>
            <p className="text-gray-600">
              Great things takes time. Please be patient.
            </p>
          </div>
        </div>
      ) : (
        <div>
          {/* Municipality Statistics */}
          <div className="p-6 bg-white shadow-lg rounded-lg mb-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">
              Municipality Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(municipalityStats).map((municipality) => {
                const municipalityData = municipalityStats[municipality];
                // Accept both camelCase and snake_case, and treat 0 as valid
                const municipalityTotalPop =
                  municipalityData.totalPopulation !== undefined
                    ? municipalityData.totalPopulation
                    : municipalityData.total_population;
                const hasMunicipalityPopulation =
                  municipalityTotalPop !== null &&
                  municipalityTotalPop !== undefined &&
                  municipalityTotalPop !== "N/A" &&
                  municipalityTotalPop !== "";

                const municipalityCoverage = hasMunicipalityPopulation && Number(municipalityTotalPop) > 0
                  ? (municipalityData.totalApplicants / Number(municipalityTotalPop)) * 100
                  : 0;

                // Use dynamic coverageConfig for municipality
                let municipalityInsight = "⚠ Population Data Not Set";
                if (hasMunicipalityPopulation && Number(municipalityTotalPop) > 0) {
                  const sortedThresholds = (coverageConfig.municipality || [])
                    .slice()
                    .sort((a, b) => b.threshold - a.threshold);
                  for (const t of sortedThresholds) {
                    if (municipalityCoverage >= t.threshold) {
                      municipalityInsight = t.message;
                      break;
                    }
                  }
                }

                return (
                  <div
                    key={municipality}
                    className="p-4 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer bg-gray-100"
                    onClick={() => {
                      setExpandedMunicipality((prev) => {
                        const isSameMunicipality = prev === municipality;
                        const newExpandedMunicipality = isSameMunicipality
                          ? null
                          : municipality;

                        if (isSameMunicipality) {
                          setFilteredDemographics(demographics);
                          setSelectedMunicipalityCoords(null);
                        } else {
                          // Filter applicants from the selected municipality
                          const municipalityApplicants = applicants.filter(
                            (a) => a.municipality === municipality
                          );

                          if (municipalityApplicants.length > 0) {
                            // Calculate average latitude & longitude
                            const avgLat =
                              municipalityApplicants.reduce(
                                (sum, a) => sum + a.lat,
                                0
                              ) / municipalityApplicants.length;
                            const avgLng =
                              municipalityApplicants.reduce(
                                (sum, a) => sum + a.lng,
                                0
                              ) / municipalityApplicants.length;

                            setSelectedMunicipalityCoords([avgLat, avgLng]);

                            // Set new filtered demographics
                            setFilteredDemographics(
                              calculateDemographics(municipalityApplicants)
                            );
                          }
                        }

                        return newExpandedMunicipality;
                      });
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {municipality}
                      </h3>
                      <span className="text-blue-600 font-bold">
                        {municipalityData.totalApplicants} /{" "}
                        {municipalityData.totalPopulation !== undefined
                          ? municipalityData.totalPopulation
                          : municipalityData.total_population}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {municipalityInsight}
                    </p>

                    {/* Expand to show Barangay Breakdown */}
                    {expandedMunicipality === municipality && (
                      <div className="mt-3 bg-white rounded-md p-3">
                        <h4 className="text-md font-semibold text-gray-700">
                          Barangay Breakdown:
                        </h4>
                        {Object.keys(municipalityData.barangays).map(
                          (barangay) => {
                            const barangayData =
                              municipalityData.barangays[barangay];
                            // Support both camelCase and snake_case for population
                            const hasBarangayPopulation =
                              (barangayData.totalPopulation !== null &&
                                barangayData.totalPopulation !== undefined &&
                                barangayData.totalPopulation !== "N/A") ||
                              (barangayData.total_population !== null &&
                                barangayData.total_population !== undefined &&
                                barangayData.total_population !== "N/A");

                            const barangayTotalPop =
                              barangayData.totalPopulation !== undefined
                                ? barangayData.totalPopulation
                                : barangayData.total_population;
                            const barangayCoverage = hasBarangayPopulation
                              ? (barangayData.applicants /
                                  barangayTotalPop) *
                                100
                              : 0;

                            let barangayInsight = "⚠ Population Data Not Set";
                            if (hasBarangayPopulation) {
                              const sortedThresholds = (coverageConfig.barangay || [])
                                .slice()
                                .sort((a, b) => b.threshold - a.threshold);
                              for (const t of sortedThresholds) {
                                if (barangayCoverage >= t.threshold) {
                                  barangayInsight = t.message;
                                  break;
                                }
                              }
                            }

                            return (
                              <div
                                key={barangay}
                                className="mt-2 p-2 border border-gray-300 rounded-lg"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    {barangay}
                                  </span>
                                  <span className="text-blue-600 font-bold">
                                    {barangayData.applicants} /{" "}
                                    {barangayData.totalPopulation !== undefined
                                      ? barangayData.totalPopulation
                                      : barangayData.total_population || "N/A"}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {barangayInsight}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            {/* 📍 Map Section */}
            <div className="bg-white shadow-lg rounded-lg p-4 min-h-[500px] flex flex-col overflow-hidden">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Applicant Locations
              </h2>

              <div className="flex-grow overflow-hidden rounded-lg">
                <MapContainer
                  center={
                    applicants.length > 0
                      ? [applicants[0].lat, applicants[0].lng]
                      : [14.5995, 120.9842]
                  }
                  zoom={10}
                  className="h-full w-full"
                  style={{
                    borderRadius: "10px",
                    position: "relative",
                    zIndex: 0,
                  }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <FitBounds
                    positions={applicants.map((a) => [a.lat, a.lng])}
                  />
                  <MapZoomController
                    selectedCoords={selectedMunicipalityCoords}
                  />

                  <MarkerClusterGroup chunkedLoading>
                    {applicants.map((a) => (
                      <Marker
                        key={a.id}
                        position={[a.lat, a.lng]}
                        icon={customIcon}
                      >
                        <Popup>
                          <strong className="text-blue-600">{a.name}</strong>
                          <br />
                          <strong>Address:</strong> <br />
                          {a.purok && <>{`Purok ${a.purok}, `}</>}
                          {a.street && <>{`${a.street}, `}</>}
                          {a.barangay && <>{`${a.barangay}, `}</>}
                          {a.municipality && <>{`${a.municipality}, `}</>}
                          {a.province && <>{`${a.province}`}</>}
                          {a.zip && <>{`, ${a.zip}`}</>}
                          <br />
                          <strong>Completed Programs:</strong>
                          <ul className="list-disc ml-4">
                            {(a.programs || []).map((program, index) => (
                              <li key={index}>{program}</li>
                            ))}
                          </ul>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                </MapContainer>
              </div>
            </div>

            {/* 📊 Demographics Section */}
            {/* 📊 Demographics Section */}
            <div className="bg-white shadow-lg rounded-lg p-6 min-h-[500px] flex flex-col">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Applicant Demographics{" "}
                {expandedMunicipality && `(${expandedMunicipality})`}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
                {/* 📊 Age Distribution */}
                <div className="bg-gray-50 p-5 rounded-lg shadow-md flex flex-col h-full">
                  <h3 className="text-md font-semibold mb-2 text-gray-700">
                    Age Distribution
                  </h3>
                  <div className="flex-grow">
                    <Bar
                      data={{
                        labels: Object.keys(filteredDemographics.ageGroups),
                        datasets: [
                          {
                            label: "Applicants",
                            data: Object.values(filteredDemographics.ageGroups),
                            backgroundColor: "rgba(54, 162, 235, 0.7)",
                            borderRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* 🟠 Gender Distribution */}
                <div className="bg-gray-50 p-5 rounded-lg shadow-md flex flex-col h-full">
                  <h3 className="text-md font-semibold mb-2 text-gray-700">
                    Gender Breakdown
                  </h3>
                  <div className="flex-grow">
                    <Pie
                      data={{
                        labels: Object.keys(filteredDemographics.gender),
                        datasets: [
                          {
                            data: Object.values(filteredDemographics.gender),
                            backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
                            hoverOffset: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </div>

                {/* 🍩 Civil Status */}
                <div className="bg-gray-50 p-5 rounded-lg shadow-md flex flex-col h-full">
                  <h3 className="text-md font-semibold mb-2 text-gray-700">
                    Civil Status
                  </h3>
                  <div className="flex-grow">
                    <Doughnut
                      data={{
                        labels: Object.keys(filteredDemographics.civilStatus),
                        datasets: [
                          {
                            data: Object.values(
                              filteredDemographics.civilStatus
                            ),
                            backgroundColor: [
                              "#FF6384",
                              "#36A2EB",
                              "#FFCE56",
                              "#4BC0C0",
                            ],
                            hoverOffset: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedApplicantsMap;
