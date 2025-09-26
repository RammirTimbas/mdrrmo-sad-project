import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import axios from "axios";

const PopulationConfig = () => {
  const [populationData, setPopulationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [expandedMunicipality, setExpandedMunicipality] = useState(null);
  // Coverage thresholds and messages
  const [coverageConfig, setCoverageConfig] = useState({
    municipality: [
      { threshold: 10, message: "🟢 Good Coverage - Well-represented in training." },
      { threshold: 5, message: "🟡 Moderate Coverage - Somewhat represented." },
      { threshold: 0, message: "🔴 Low Coverage - Needs improvement." },
    ],
    barangay: [
      { threshold: 10, message: "🟢 Good Coverage - Well-represented in training." },
      { threshold: 5, message: "🟡 Moderate Coverage - Somewhat represented." },
      { threshold: 0, message: "🔴 Low Coverage - Needs improvement." },
    ],
  });

  // Load provinces
  useEffect(() => {
    axios
      .get("https://psgc.gitlab.io/api/provinces/")
      .then((response) => setProvinces(response.data))
      .catch((error) => console.error("Error fetching provinces:", error));
  }, []);

  // Load municipalities when a province is selected
  useEffect(() => {
    if (selectedProvince) {
      axios
        .get(
          `https://psgc.gitlab.io/api/provinces/${selectedProvince}/cities-municipalities/`
        )
        .then((response) => setMunicipalities(response.data))
        .catch((error) =>
          console.error("Error fetching municipalities:", error)
        );
    } else {
      setMunicipalities([]);
    }
    setSelectedMunicipality("");
    setBarangays([]);
    setSelectedBarangay("");
  }, [selectedProvince]);

  // Load barangays for Add Barangay section based on selected municipality in populationData
  useEffect(() => {
    if (selectedMunicipality && populationData[selectedMunicipality]?.psgcCode) {
      axios
        .get(
          `https://psgc.gitlab.io/api/cities-municipalities/${populationData[selectedMunicipality].psgcCode}/barangays/`
        )
        .then((response) => setBarangays(response.data))
        .catch((error) => console.error("Error fetching barangays:", error));
    } else {
      setBarangays([]);
    }
    setSelectedBarangay("");
  }, [selectedMunicipality, populationData]);

  // 🔹 Fetch Population Data and Coverage Config from Firestore
  useEffect(() => {
    const fetchPopulationData = async () => {
      try {
        const docRef = doc(db, "Settings", "Populations");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPopulationData(data.municipalities || {});
          if (data.coverageConfig) setCoverageConfig(data.coverageConfig);
        } else {
          console.log("No population data found.");
        }
      } catch (error) {
        console.error("Error fetching population data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPopulationData();
  }, []);

  // 🔹 Update Municipality Population
  const handleMunicipalityChange = (municipality, value) => {
    const totalPop = parseInt(value) || 0;
    const barangayTotal = Object.values(
      populationData[municipality]?.barangays || {}
    ).reduce((sum, pop) => sum + pop, 0);

    if (totalPop < barangayTotal) {
      Swal.fire(
        "Error",
        "Total population must be ≥ sum of barangays!",
        "error"
      );
      return;
    }

    setPopulationData((prevData) => ({
      ...prevData,
      [municipality]: {
        ...prevData[municipality],
        total_population: totalPop,
      },
    }));
  };

  // 🔹 Update Barangay Population
  const handleBarangayChange = (municipality, barangay, value) => {
    const barangayPop = parseInt(value) || 0;
    const totalPop = populationData[municipality]?.total_population || 0;
    const otherBarangaysTotal = Object.entries(
      populationData[municipality]?.barangays || {}
    )
      .filter(([key]) => key !== barangay)
      .reduce((sum, [, pop]) => sum + pop, 0);

    if (barangayPop + otherBarangaysTotal > totalPop) {
      Swal.fire(
        "Error",
        "Barangay populations cannot exceed total municipality population!",
        "error"
      );
      return;
    }

    setPopulationData((prevData) => ({
      ...prevData,
      [municipality]: {
        ...prevData[municipality],
        barangays: {
          ...prevData[municipality].barangays,
          [barangay]: barangayPop,
        },
      },
    }));
  };

  const addBarangay = () => {
    if (!selectedMunicipality || !selectedBarangay) {
      Swal.fire(
        "Error",
        "Select a municipality and barangay!",
        "error"
      );
      return;
    }
    // Prevent duplicate barangay
    if (
      populationData[selectedMunicipality]?.barangays &&
      Object.keys(populationData[selectedMunicipality].barangays).includes(selectedBarangay)
    ) {
      Swal.fire("Error", "Barangay already exists!", "error");
      return;
    }
    setPopulationData((prevData) => ({
      ...prevData,
      [selectedMunicipality]: {
        ...prevData[selectedMunicipality],
        barangays: {
          ...prevData[selectedMunicipality]?.barangays,
          [selectedBarangay]: 0,
        },
      },
    }));
    setSelectedBarangay("");
  };

  

  // 🔹 Add a New Municipality
  const addMunicipality = () => {
    // Find selected municipality object from municipalities array
    const muniObj = municipalities.find((m) => m.code === selectedMunicipality);
    if (!selectedMunicipality || !muniObj) {
      Swal.fire("Error", "Select a municipality!", "error");
      return;
    }
    if (populationData[muniObj.name]) {
      Swal.fire("Error", "Municipality already exists!", "error");
      return;
    }
    setPopulationData((prevData) => ({
      ...prevData,
      [muniObj.name]: {
        total_population: 0,
        barangays: {},
        psgcCode: muniObj.code,
      },
    }));
  };

  // 🔹 Add a New Barangay

  // 🔹 Toggle Municipality Expansion
  const toggleExpand = (municipality) => {
    setExpandedMunicipality((prev) =>
      prev === municipality ? null : municipality
    );
  };

  // 🔹 Delete Municipality

  // 🔹 Delete Barangay
  const deleteBarangay = (municipality, barangay) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete ${barangay}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setPopulationData((prevData) => {
          const updatedData = { ...prevData };
          delete updatedData[municipality].barangays[barangay];
          return updatedData;
        });
      }
    });
  };

  // 🔹 Save Data to Firestore
  const savePopulationData = async () => {
    try {
      await setDoc(doc(db, "Settings", "Populations"), {
        municipalities: populationData,
        coverageConfig,
      });
      Swal.fire("Success", "Population data saved successfully!", "success");
    } catch (error) {
      console.error("Error saving population data:", error);
      Swal.fire("Error", "Failed to save population data.", "error");
    }
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Population Configuration
      </h2>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <React.Fragment>
          {/* Coverage Thresholds & Messages Config */}
          <div className="mb-8 p-4 border border-blue-300 rounded-lg bg-blue-50">
            <h3 className="text-lg font-bold text-blue-700 mb-2">Coverage Thresholds & Messages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Municipality thresholds */}
              <div>
                <h4 className="font-semibold mb-2">Municipality Coverage</h4>
                {coverageConfig.municipality.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-sm">≥</span>
                    <input
                      type="number"
                      min="0"
                      value={item.threshold}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setCoverageConfig(cfg => {
                          const arr = [...cfg.municipality];
                          arr[idx] = { ...arr[idx], threshold: val };
                          return { ...cfg, municipality: arr };
                        });
                      }}
                      className="w-16 p-1 border rounded"
                    />
                    <input
                      type="text"
                      value={item.message}
                      onChange={e => {
                        const val = e.target.value;
                        setCoverageConfig(cfg => {
                          const arr = [...cfg.municipality];
                          arr[idx] = { ...arr[idx], message: val };
                          return { ...cfg, municipality: arr };
                        });
                      }}
                      className="flex-1 p-1 border rounded"
                    />
                  </div>
                ))}
              </div>
              {/* Barangay thresholds */}
              <div>
                <h4 className="font-semibold mb-2">Barangay Coverage</h4>
                {coverageConfig.barangay.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-sm">≥</span>
                    <input
                      type="number"
                      min="0"
                      value={item.threshold}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setCoverageConfig(cfg => {
                          const arr = [...cfg.barangay];
                          arr[idx] = { ...arr[idx], threshold: val };
                          return { ...cfg, barangay: arr };
                        });
                      }}
                      className="w-16 p-1 border rounded"
                    />
                    <input
                      type="text"
                      value={item.message}
                      onChange={e => {
                        const val = e.target.value;
                        setCoverageConfig(cfg => {
                          const arr = [...cfg.barangay];
                          arr[idx] = { ...arr[idx], message: val };
                          return { ...cfg, barangay: arr };
                        });
                      }}
                      className="flex-1 p-1 border rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ...existing code... */}
          </div>
        </React.Fragment>

          {/* 🔹 Add Municipality */}
          <div className="p-4 border border-gray-300 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Add Municipality</h3>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400 mb-2"
            >
              <option value="">Select Province</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
              disabled={!selectedProvince}
            >
              <option value="">Select Municipality</option>
              {municipalities.map((municipality) => (
                <option key={municipality.code} value={municipality.code}>
                  {municipality.name}
                </option>
              ))}
            </select>
            <button
              onClick={addMunicipality}
              className="mt-3 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
              disabled={!selectedMunicipality}
            >
              Add Municipality
            </button>
          </div>

          {/* 🔹 Add Barangay */}
          <div className="p-4 border border-gray-300 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Add Barangay</h3>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400 mb-2"
            >
              <option value="">Select Municipality</option>
              {Object.keys(populationData).map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="w-full p-3 mt-2 border rounded-lg focus:ring focus:ring-blue-400"
              disabled={!selectedMunicipality}
            >
              <option value="">Select Barangay</option>
              {barangays.map((barangay) => (
                <option key={barangay.code} value={barangay.name}>
                  {barangay.name}
                </option>
              ))}
            </select>
            <button
              onClick={addBarangay}
              className="mt-3 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
              disabled={!selectedBarangay || !selectedMunicipality}
            >
              Add Barangay
            </button>
          </div>

          {/* 🔹 Display Existing Municipalities & Barangays */}
          {Object.keys(populationData).map((municipality) => (
            <div
              key={municipality}
              className="p-4 border border-gray-300 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-semibold mb-2">
                {municipality} - Total Population
              </h3>
              <input
                type="number"
                min="1"
                value={populationData[municipality]?.total_population || ""}
                onChange={(e) =>
                  handleMunicipalityChange(municipality, e.target.value)
                }
                className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
              />

              <h4
                className="text-md font-semibold mt-4 cursor-pointer flex justify-between items-center"
                onClick={() =>
                  setExpandedMunicipality((prev) =>
                    prev === municipality ? null : municipality
                  )
                }
              >
                Barangays
                <span>{expandedMunicipality === municipality ? "▼" : "▶"}</span>
              </h4>

              {expandedMunicipality === municipality &&
                Object.keys(populationData[municipality]?.barangays || {}).map(
                  (barangay) => (
                    <div key={barangay} className="mt-2">
                      <label className="text-sm font-medium">{barangay}</label>
                      <input
                        type="number"
                        min="1"
                        value={
                          populationData[municipality]?.barangays?.[barangay] ||
                          ""
                        }
                        onChange={(e) =>
                          handleBarangayChange(
                            municipality,
                            barangay,
                            e.target.value
                          )
                        }
                        className="w-full p-2 border rounded-lg focus:ring focus:ring-blue-400"
                      />
                    </div>
                  )
                )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={savePopulationData}
        className="mt-6 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
      >
        Save Population Data
      </button>
    </div>
  );
};

export default PopulationConfig;
