import React, { useState, useEffect } from "react";
import registrantLogo from "./logo/registrant_icon.png";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

import noItem from "./logo/no_items.png";

import bcrypt from "bcryptjs";
import Swal from "sweetalert2";

import emailjs from "emailjs-com";
import loader from "./charts/blue-loader.svg";
import { addNotification } from "../../helpers/addNotification";

const Registrants = ({ userId }) => {
  const [showNotice, setShowNotice] = useState(true);
  const [registrants, setRegistrants] = useState([]);
  const [filteredRegistrants, setFilteredRegistrants] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [uniqueBarangays, setUniqueBarangays] = useState([]);
  const [uniqueReligions, setUniqueReligions] = useState([]);
  const [uniqueSchools, setUniqueSchools] = useState([]);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState({
    civil_status: "",
    religion: "",
    school_agency: "",
    age: "",
    barangay: "",
    gender: "",
  });

  const [selectedRegistrant, setSelectedRegistrant] = useState(null); // sto show the selected registrant's details upon confirmation

  //set admin name for logging purposes
  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const adminDoc = await getDoc(doc(db, "Users", userId));
        if (adminDoc.exists()) {
          setAdminName(adminDoc.data().name || "Admin");
        }
      } catch (error) {
        console.error("Error fetching admin name:", error);
      }
    };
    fetchAdminName();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Registrants"),
      (querySnapshot) => {
        const registrantsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter out only those registrants whose status is 'pending'
        const pendingRegistrants = registrantsData.filter(
          (registrant) => registrant.status === "pending"
        );

        setRegistrants(pendingRegistrants);
        setFilteredRegistrants(pendingRegistrants);
        setLoading(false);

        const barangays = [
          ...new Set(pendingRegistrants.map((r) => r.barangay)),
        ];
        const religions = [
          ...new Set(pendingRegistrants.map((r) => r.religion)),
        ];
        const schools = [
          ...new Set(pendingRegistrants.map((r) => r.school_agency)),
        ];

        setUniqueBarangays(barangays);
        setUniqueReligions(religions);
        setUniqueSchools(schools);
      },
      (error) => {
        Swal.fire(
          "Error",
          "Error fetching registrants: " + error.message,
          "error"
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  //generate 8 character password
  const generateRandomPassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleApprove = (registrant) => {
    Swal.fire({
      title: "Approve Registrant?",
      text: `Are you sure you want to approve ${registrant.full_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, approve",
    }).then((result) => {
      if (result.isConfirmed) {
        confirmActionHandler("approve", registrant);
      }
    });
  };

  const handleReject = (registrant) => {
    Swal.fire({
      title: "Reject Registrant?",
      text: `Are you sure you want to reject ${registrant.full_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, reject",
    }).then((result) => {
      if (result.isConfirmed) {
        confirmActionHandler("reject", registrant);
      }
    });
  };

  const confirmActionHandler = async (action, registrant) => {
    setIsLoading(true);
    if (action === "approve") {
      const newPassword = generateRandomPassword();

      try {
        // hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 rounds of hashing for security

        // store the user credentials in Firestore with the hashed password
        const userDocRef = await addDoc(collection(db, "Users"), {
          email: registrant.email,
          password: hashedPassword, // Save hashed password
          profile: "user",
        });

        // add the data to the User Informations collection
        const { id, ...registrantData } = registrant;
        await addDoc(collection(db, "User Informations"), {
          user_ID: userDocRef.id,
          ...registrantData,
        });

        // update the status to 'approved' in order to hide it
        const registrantRef = doc(db, "Registrants", registrant.id);
        await updateDoc(registrantRef, { status: "approved" });

        // send the plaintext password in an email
        sendApprovalEmail(newPassword, registrant);
        Swal.fire("Success", "Registrant approved and email sent.", "success");
        console.log("PASSWORD: " + newPassword);

        await addDoc(collection(db, "Logs"), {
          name: adminName,
          type: "Registration",
          action: "Approved Registrant: " + registrant.full_name,
          date: new Date(),
        });

        addNotification(
          "Welcome to MDRRMO - DAET TPMS",
          `Greetings ${registrant.full_name}! You can now apply and manage your applied programs here in MDRRMO - DAET! If you have and questions and concerns simply contact us through our email 'mdrrmo.tpms.srvc@gmail.com'.`,
          registrant.user_id
        );

        setSelectedRegistrant(null);
      } catch (error) {
        Swal.fire(
          "Error",
          "Error approving registrant: " + error.message,
          "error"
        );
      }
    } else if (action === "reject") {
      setSelectedRegistrant(null);
      try {
        const registrantDocRef = doc(db, "Registrants", registrant.id);
        await deleteDoc(registrantDocRef);
        Swal.fire(
          "Rejected Succesfully",
          registrant.full_name + " was rejected successfully!",
          "success"
        );
      } catch (error) {
        console.error("Error rejecting registrant:", error);
        Swal.fire("Error", "Failed to reject the registrant.", "error");
      }

      await addDoc(collection(db, "Logs"), {
        name: adminName,
        type: "Registration",
        action: "Rejected Registrant: " + registrant.full_name,
        date: new Date(),
      });
    }
    setIsLoading(false);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    let filtered = registrants.filter((registrant) => {
      return (
        (filters.civil_status
          ? registrant.civil_status === filters.civil_status
          : true) &&
        (filters.religion ? registrant.religion === filters.religion : true) &&
        (filters.school_agency
          ? registrant.school_agency === filters.school_agency
          : true) &&
        (filters.age ? registrant.age === parseInt(filters.age) : true) &&
        (filters.barangay ? registrant.barangay === filters.barangay : true) &&
        (filters.gender ? registrant.gender === filters.gender : true)
      );
    });

    if (searchTerm) {
      filtered = filtered.filter((registrant) =>
        registrant.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRegistrants(filtered);
  };

  const resetFilters = () => {
    setFilters({
      civil_status: "",
      religion: "",
      school_agency: "",
      age: "",
      barangay: "",
      gender: "",
    });
    setSearchTerm("");
    setFilteredRegistrants(registrants);
  };

  const sendApprovalEmail = (newPassword, registrant) => {
    const templateParams = {
      name: registrant.full_name,
      email: registrant.email,
      password: newPassword,
    };

    console.log(templateParams);

    emailjs
      .send(
        "service_ehz8f0q",
        "template_hdxoslc",
        templateParams,
        "FRhU8JFrBpNQA695D"
      )
      .then((response) => {})
      .catch((error) => {});
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of items per page

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRegistrants.length / itemsPerPage)
  );

  // Calculate current registrants for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRegistrants = filteredRegistrants.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  return (
    <div className="registrants-page">
      <div className="title-bar">
        <img
          src={registrantLogo}
          alt="Registrants Logo"
          className="title-bar-logo"
        />
        <h2>Registrants</h2>
      </div>

      {showNotice && (
        <div className="notice">
          <p>
            The table below shows the people who are requesting access to the
            website. Please approve only those that already submitted their CRF
            (hardcopy) and Intent Letter approved by the Municipal Mayor.
          </p>
          <button
            className="close-notice-button"
            onClick={() => setShowNotice(false)}
          >
            ✖
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {/* Header (clickable for collapse) */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-blue-600"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Filter Registrants
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filteredRegistrants.length} results</span>
            {filtersOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </button>

        {/* Filters Content (collapsible) */}
        {filtersOpen && (
          <div className="p-5 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search by Full Name */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Search by Full Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                />
              </div>

              {/* Barangay */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Barangay</label>
                <select
                  name="barangay"
                  value={filters.barangay}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  {uniqueBarangays.map((barangay, index) => (
                    <option key={index} value={barangay}>
                      {barangay}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Gender</label>
                <select
                  name="gender"
                  value={filters.gender}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Civil Status */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Civil Status</label>
                <select
                  name="civil_status"
                  value={filters.civil_status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>

              {/* Religion */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Religion</label>
                <select
                  name="religion"
                  value={filters.religion}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  {uniqueReligions.map((religion, index) => (
                    <option key={index} value={religion}>
                      {religion}
                    </option>
                  ))}
                </select>
              </div>

              {/* School/Agency */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">School/Agency</label>
                <select
                  name="school_agency"
                  value={filters.school_agency}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  {uniqueSchools.map((school, index) => (
                    <option key={index} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Age</label>
                <input
                  type="number"
                  name="age"
                  value={filters.age}
                  onChange={handleFilterChange}
                  placeholder="Enter Age"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setFilters({
                    civil_status: "",
                    religion: "",
                    school_agency: "",
                    age: "",
                    barangay: "",
                    gender: "",
                  });
                  setSearchTerm("");
                  setFilteredRegistrants(registrants);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="loading-screen">
          <img src={loader} alt="Loading..." className="svg-loader" />
          <p className="loading-text" style={{ color: "black" }}>
            Loading...
          </p>
        </div>
      ) : filteredRegistrants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
            <thead className="bg-blue-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">#</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Full Name</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Age</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Gender</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Civil Status</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Religion</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Barangay</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Municipality</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Province</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">School/Agency</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">CRF</th>
                <th className="px-4 py-2 text-sm font-semibold text-left border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRegistrants.map((registrant, index) => (
                <tr
                  key={registrant.id}
                  className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  <td className="px-4 py-2 border-b text-sm">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.full_name}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.age}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.gender}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.civil_status}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.religion}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.barangay}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.municipality}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.province}</td>
                  <td className="px-4 py-2 border-b text-sm">{registrant.school_agency}</td>
                  <td className="px-4 py-2 border-b text-sm">
                    {registrant.crf ? (
                      <span className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">
                          {registrant.crf.split("/").pop().split("?")[0]}
                        </span>
                        <button
                          onClick={() => window.open(registrant.crf, "_blank")}
                          className="text-xs text-white bg-blue-600 hover:bg-blue-700 py-1 px-2 rounded-lg"
                        >
                          View
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">No CRF</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border-b text-sm flex space-x-2">
                    <button
                      onClick={() => handleApprove(registrant)}
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg shadow-md transition duration-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(registrant)}
                      className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow-md transition duration-200"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-entries">
          <img src={noItem} alt="No entries" className="no-entries-image" />
          <p>No registrants found.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredRegistrants.length > itemsPerPage && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${currentPage === 1
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${currentPage === totalPages
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-gray-600">
              This could take a while, sip a coffee first ☕
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrants;
