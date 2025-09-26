import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import zipcodes from "../../zipcodes.json";

const PopulationConfig = () => {
  const [populationData, setPopulationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [expandedMunicipality, setExpandedMunicipality] = useState(null);
  const [municipalityOptions, setMunicipalityOptions] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  // 🔹 Load Municipality Options from zipcodes.json
  useEffect(() => {
    if (zipcodes && Array.isArray(zipcodes)) {
      const uniqueMunicipalities = [
        ...new Set(zipcodes.map((z) => z.municipality).filter(Boolean)),
      ];
      setMunicipalityOptions(uniqueMunicipalities.sort());
    }
  }, []);

  // 🔹 Update Barangay Options when Municipality changes
  useEffect(() => {
    if (selectedMunicipality) {
      const brgys = zipcodes
        .filter((z) => z.municipality === selectedMunicipality)
        .map((z) => z.barangay)
        .filter(Boolean);
      setBarangayOptions([...new Set(brgys)].sort());
    } else {
      setBarangayOptions([]);
    }
    setSelectedBarangay("");
  }, [selectedMunicipality]);

  // 🔹 Fetch Population Data from Firestore
  useEffect(() => {
    const fetchPopulationData = async () => {
      try {
        const docRef = doc(db, "Settings", "Populations");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPopulationData(docSnap.data().municipalities || {});
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
    if (!selectedMunicipality) {
      Swal.fire("Error", "Select a municipality!", "error");
      return;
    }
    if (populationData[selectedMunicipality]) {
      Swal.fire("Error", "Municipality already exists!", "error");
      return;
    }
    setPopulationData((prevData) => ({
      ...prevData,
      [selectedMunicipality]: {
        total_population: 0,
        barangays: {},
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 🔹 Add Municipality */}
          <div className="p-4 border border-gray-300 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Add Municipality</h3>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
            >
              <option value="">Select Municipality</option>
              {municipalityOptions.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
            <button
              onClick={addMunicipality}
              className="mt-3 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
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
              className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
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
            >
              <option value="">Select Barangay</option>
              {barangayOptions.map((barangay) => (
                <option key={barangay} value={barangay}>
                  {barangay}
                </option>
              ))}
            </select>
            <button
              onClick={addBarangay}
              className="mt-3 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
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
