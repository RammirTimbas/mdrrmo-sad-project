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
  const [showFilter, setShowFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [uniqueBarangays, setUniqueBarangays] = useState([]);
  const [uniqueReligions, setUniqueReligions] = useState([]);
  const [uniqueSchools, setUniqueSchools] = useState([]);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);

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
    const fetchRegistrants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Registrants"));
        const registrantsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // filter out only those registrants whose status is 'pending'
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
      } catch (error) {
        Swal.fire(
          "Error",
          "Error fetching registrants: " + error.message,
          "error"
        );
      }
    };
    fetchRegistrants();
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

      <div className="search-filter-container">
        <div className="search-bar-wrapper">
          <input
            type="text"
            placeholder="Search by Full Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <button className="search-button" onClick={applyFilters}>
            Search
          </button>
          <button
            className="toggle-filter-button"
            onClick={() => setShowFilter(!showFilter)}
          >
            {showFilter ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="barangay">Barangay</label>
            <select
              name="barangay"
              value={filters.barangay}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Any</option>
              {uniqueBarangays.map((barangay, index) => (
                <option key={index} value={barangay}>
                  {barangay}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="gender">Gender</label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="civil_status">Civil Status</label>
            <select
              name="civil_status"
              value={filters.civil_status}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Any</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="religion">Religion</label>
            <select
              name="religion"
              value={filters.religion}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Any</option>
              {uniqueReligions.map((religion, index) => (
                <option key={index} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="school_agency">School/Agency</label>
            <select
              name="school_agency"
              value={filters.school_agency}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Any</option>
              {uniqueSchools.map((school, index) => (
                <option key={index} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="age">Age</label>
            <input
              type="number"
              name="age"
              value={filters.age}
              onChange={handleFilterChange}
              placeholder="Enter Age"
              className="filter-input"
            />
          </div>

          <div className="filter-buttons">
            <button className="apply-filter-button" onClick={applyFilters}>
              Apply Filters
            </button>
            <button className="reset-filter-button" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-screen">
          <img src={loader} alt="Loading..." className="svg-loader" />
          <p className="loading-text" style={{ color: "black" }}>
            Loading...
          </p>
        </div>
      ) : filteredRegistrants.length > 0 ? (
        <div className="scrollable-table">
          <table className="registrants-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Civil Status</th>
                <th>Religion</th>
                <th>Barangay</th>
                <th>Municipality</th>
                <th>Province</th>
                <th>Mobile No</th>
                <th>Email</th>
                <th>School/Agency</th>
                <th>CRF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRegistrants.map((registrant, index) => (
                <tr
                  key={registrant.id}
                  className={`border-b ${
                    index % 2 === 0 ? "bg-gray-50" : ""
                  } hover:bg-gray-100`}
                >
                  <td>{registrant.full_name}</td>
                  <td>{registrant.age}</td>
                  <td>{registrant.gender}</td>
                  <td>{registrant.civil_status}</td>
                  <td>{registrant.religion}</td>
                  <td>{registrant.barangay}</td>
                  <td>{registrant.municipality}</td>
                  <td>{registrant.province}</td>
                  <td>{registrant.mobile_number}</td>
                  <td>{registrant.email}</td>
                  <td>{registrant.school_agency}</td>
                  <td>
                    {registrant.crf ? (
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {/* Extract and display the filename */}
                        <span style={{ marginRight: "8px" }}>
                          {registrant.crf.split("/").pop().split("?")[0]}
                        </span>
                        <button
                          onClick={() => window.open(registrant.crf, "_blank")}
                          className="view-button"
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                      </span>
                    ) : (
                      <span>No CRF</span>
                    )}
                  </td>
                  <td className="action-buttons">
                    <button
                      onClick={() => handleApprove(registrant)}
                      className="approve-button"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(registrant)}
                      className="reject-button"
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

      {filteredRegistrants.length > itemsPerPage && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            className={`px-4 py-2 border rounded-lg ${
              currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span className="text-gray-700">
            {currentPage} of {totalPages}
          </span>

          <button
            className={`px-4 py-2 border rounded-lg ${
              currentPage === totalPages
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Registrants;
