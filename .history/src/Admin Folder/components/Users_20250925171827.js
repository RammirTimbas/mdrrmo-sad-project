import React, { useState, useEffect } from "react";
import registrantLogo from "./logo/registrant_icon.png";
import { db } from "./firebase";
import {
  collection,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import noItem from "./logo/no_items.png";
import mainlogo from "./logo/secure-access.png";
import emailjs from "emailjs-com";
import Swal from "sweetalert2";
import loader from "./charts/blue-loader.svg";
import bcrypt from "bcryptjs";
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const Users = ({ userId }) => {
  const [showNotice, setShowNotice] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [uniqueBarangays, setUniqueBarangays] = useState([]);
  const [uniqueReligions, setUniqueReligions] = useState([]);
  const [uniqueSchools, setUniqueSchools] = useState([]);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("users");
  const [adminsData, setAdminsData] = useState([]);
  const [trainersData, setTrainersData] = useState([]);

  const [filters, setFilters] = useState({
    civil_status: "",
    religion: "",
    school_agency: "",
    age: "",
    barangay: "",
    gender: "",
  });

  const [selectedUser, setSelectedUser] = useState(null); // for the registrant's details to show in the confirmation
  const [isEditing, setIsEditing] = useState(false); // to track if we're editing

  //get the admin name for logging purposes
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
    const fetchTrainers = async () => {
      const querySnapshot = await getDocs(collection(db, "Trainer Name"));
      setTrainersData(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };

    fetchTrainers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "Users"));
        const fetchedData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // filter out the superuser and only include admins
        setAdminsData(
          fetchedData.filter(
            (item) =>
              item.profile === "admin" && item.id !== "DVOAYL7n8eZ3EKkgXQ3f"
          )
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // get users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
        setLoading(false);

        // extract values for dropdown filters
        const barangays = [...new Set(data.map((user) => user.barangay))];
        const religions = [...new Set(data.map((user) => user.religion))];
        const schools = [...new Set(data.map((user) => user.school_agency))];

        // set the unique values in the state for the dropdowns
        setUniqueBarangays(barangays);
        setUniqueReligions(religions);
        setUniqueSchools(schools);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const handleApprove = (users) => {
    setSelectedUser(users);
    setIsEditing(true); // set editing mode
    console.log("clicked");
  };

  const handleRevokeTrainer = async (trainer) => {
    const superuserId = "DVOAYL7n8eZ3EKkgXQ3f";

    try {
      const { isConfirmed } = await Swal.fire({
        title: "Are you sure?",
        text: `Do you want to revoke access for ${trainer.trainer_name}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, revoke!",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) {
        Swal.fire("Action Cancelled", "No changes were made.", "info");
        return;
      }

      const { value: password } = await Swal.fire({
        title: "Enter Admin Password",
        input: "password",
        inputPlaceholder: "Enter your password",
        inputAttributes: {
          autocapitalize: "off",
          autocorrect: "off",
        },
        showCancelButton: true,
        confirmButtonText: "Submit",
        cancelButtonText: "Cancel",
      });

      if (!password) {
        Swal.fire("Action Cancelled", "No password entered.", "info");
        return;
      }

      const superuserDoc = await getDoc(doc(db, "Users", superuserId));
      if (!superuserDoc.exists()) {
        Swal.fire("Error", "Superuser not found.", "error");
        return;
      }

      const hashedPassword = superuserDoc.data().password;

      const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);
      if (!isPasswordCorrect) {
        Swal.fire("Access Denied", "Incorrect password.", "error");
        return;
      }

      await deleteDoc(doc(db, "Trainer Name", trainer.id));
      Swal.fire({
        icon: "success",
        title: "Revoked!",
        text: `${trainer.trainer_name} has been revoked.`,
      });

      setTrainersData((prev) => prev.filter((t) => t.id !== trainer.id));
    } catch (error) {
      console.error("Error revoking trainer:", error);
      Swal.fire("Error", "An error occurred. Please try again.", "error");
    }
  };

  const handleReject = (user) => {
    setSelectedUser(user); // reference to the selected user to revoke
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete the user ${user.full_name}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // delete the user from User Informations
          await deleteDoc(doc(db, "User Informations", user.id));

          const userDocRef = doc(db, "Users", user.user_ID);
          await deleteDoc(userDocRef);

          // update local state to remove the deleted user
          setUsers(users.filter((u) => u.id !== user.id));
          setFilteredUsers(filteredUsers.filter((u) => u.id !== user.id));

          // logg the deletion
          await addDoc(collection(db, "Logs"), {
            name: adminName,
            type: "User Deletion",
            action: `Revoked access for user: ${user.full_name}`,
            date: new Date(),
          });

          Swal.fire(
            "Deleted!",
            `${user.full_name} has been deleted.`,
            "success"
          );
        } catch (error) {
          console.error("Error deleting user:", error);
          Swal.fire("Error", "There was an issue deleting the user.", "error");
        }
      }
    });
  };

  const handleRevoke = async (user) => {
    const superuserId = "DVOAYL7n8eZ3EKkgXQ3f"; 

    try {
      const { isConfirmed } = await Swal.fire({
        title: "Are you sure?",
        text: `Do you want to revoke access for ${user.name}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, revoke!",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) {
        Swal.fire("Action Cancelled", "No changes were made.", "info");
        return;
      }

      const { value: password } = await Swal.fire({
        title: "Enter Superuser Password",
        input: "password",
        inputPlaceholder: "Enter your password",
        inputAttributes: {
          autocapitalize: "off",
          autocorrect: "off",
        },
        showCancelButton: true,
        confirmButtonText: "Submit",
        cancelButtonText: "Cancel",
      });

      if (!password) {
        Swal.fire("Action Cancelled", "No password entered.", "info");
        return;
      }

      const superuserDoc = await getDoc(doc(db, "Users", superuserId));
      if (!superuserDoc.exists()) {
        Swal.fire("Error", "Superuser not found.", "error");
        return;
      }

      const hashedPassword = superuserDoc.data().password;

      // verify the entered password
      const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);
      if (!isPasswordCorrect) {
        Swal.fire("Access Denied", "Incorrect password.", "error");
        return;
      }

      // delete the admin from the Users collection
      await deleteDoc(doc(db, "Users", user.id));
      Swal.fire(
        "Success",
        `Admin ${user.name} has been successfully revoked.`,
        "success"
      );

      // refresh data
      setAdminsData((prev) => prev.filter((admin) => admin.id !== user.id));
    } catch (error) {
      console.error("Error revoking admin:", error);
      Swal.fire("Error", "An error occurred. Please try again.", "error");
    }
  };

  const handleInputChange = (e) => {
    setSelectedUser({ ...selectedUser, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    let filtered = users.filter((users) => {
      return (
        (filters.civil_status
          ? users.civil_status === filters.civil_status
          : true) &&
        (filters.religion ? users.religion === filters.religion : true) &&
        (filters.school_agency
          ? users.school_agency === filters.school_agency
          : true) &&
        (filters.age ? users.age === parseInt(filters.age) : true) &&
        (filters.barangay ? users.barangay === filters.barangay : true) &&
        (filters.gender ? users.gender === filters.gender : true)
      );
    });

    if (searchTerm) {
      filtered = filtered.filter((users) =>
        users.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSave = async () => {
    if (selectedUser) {
      try {
        const userDoc = doc(db, "User Informations", selectedUser.id);
        await updateDoc(userDoc, selectedUser); // update Firestore with the edited user details
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id ? selectedUser : user
          )
        );
        setFilteredUsers(
          filteredUsers.map((user) =>
            user.id === selectedUser.id ? selectedUser : user
          )
        );

        await addDoc(collection(db, "Logs"), {
          name: adminName,
          type: "Information Update",
          action: "Edited information of: " + selectedUser.full_name,
          date: new Date(),
        });

        Swal.fire({
          title: "Information Updated!",
          text: "Information Updated successfully!",
          icon: "success",
          confirmButtonText: "OK",
        });

        setIsEditing(false); // exit editing mode
        setSelectedUser(null);
      } catch (error) {
        console.error("Error updating user:", error);
      }
    }
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
    setFilteredUsers(users);
  };

  const sendNoticeEmail = (recipientEmail, newPassword) => {
    const templateParams = {
      name: selectedUser.full_name,
      email: recipientEmail,
      password: newPassword,
    };

    emailjs
      .send(
        "service_ehz8f0q",
        "template_hdxoslc",
        templateParams,
        "FRhU8JFrBpNQA695D"
      )
      .then((response) => {
        alert("Sending email succesful: " + response.status + response.text);
      })
      .catch((error) => {
        alert("Error sending email: " + error);
      });
  };

  return (
    <div className="registrants-page">
      <div className="title-bar">
        <img src={mainlogo} alt="Registrants Logo" className="title-bar-logo" />
        <h2>Access Control</h2>
      </div>

      {showNotice && (
        <div className="notice">
          <p>
            The table below shows the people who has access to the website. This
            panel is where the admin can edit or revoke access to a specific
            user.
          </p>
          <button
            className="close-notice-button"
            onClick={() => setShowNotice(false)}
          >
            ✖
          </button>
        </div>
      )}
      {activeTab === "users" && (
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
              Filter Users
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{filteredUsers.length} results</span>
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
                    setFilteredUsers(users);
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
      )}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={`tab-button ${activeTab === "admins" ? "active" : ""}`}
          onClick={() => setActiveTab("admins")}
        >
          Admins
        </button>
        <button
          className={`tab-button ${activeTab === "trainers" ? "active" : ""}`}
          onClick={() => setActiveTab("trainers")}
        >
          Trainers
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <img src={loader} alt="Loading..." className="svg-loader" />
          <p className="loading-text" style={{ color: "black" }}>
            Loading...
          </p>
        </div>
      ) : activeTab === "users" ? (
        filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-blue-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Full Name</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Age</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Birthplace</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Gender</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Civil Status</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Religion</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Barangay</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Municipality</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Province</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Mobile No</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Email</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">School/Agency</th>
                  <th className="px-4 py-2 text-sm font-semibold text-left border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b text-sm">{user.full_name}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.age}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.place_of_birth}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.gender}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.civil_status}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.religion}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.barangay}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.municipality}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.province}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.mobile_number}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.email}</td>
                    <td className="px-4 py-2 border-b text-sm">{user.school_agency}</td>
                    <td className="px-4 py-2 border-b text-sm flex space-x-2">
                      <button
                        onClick={() => handleApprove(user)}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg shadow-md transition duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow-md transition duration-200"
                      >
                        Revoke
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
            <p>No users found.</p>
          </div>
        )
      ) : activeTab === "admins" ? (
        adminsData.length > 0 ? (
          <div className="scrollable-table-1">
            <table className="users-table-1">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Profile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminsData.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.profile}</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleRevoke(user)}
                        className="reject-button"
                      >
                        Revoke
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
            <p>No admins found.</p>
          </div>
        )
      ) : activeTab === "trainers" ? (
        trainersData.length > 0 ? (
          <div className="scrollable-table-1">
            <table className="users-table-1">
              <thead>
                <tr>
                  <th>Trainer Name</th>
                  <th>Profile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainersData.map((trainer) => (
                  <tr key={trainer.id}>
                    <td>{trainer.trainer_name}</td>
                    <td>trainer</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleRevokeTrainer(trainer)}
                        className="reject-button"
                      >
                        Revoke
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
            <p>No trainers found.</p>
          </div>
        )
      ) : null}

      {isEditing && (
        <div className="overlay">
          <div className="modal">
            <h3>Edit User Information</h3>
            <input
              type="text"
              name="full_name"
              value={selectedUser.full_name}
              onChange={handleInputChange}
              placeholder="Full Name"
            />
            <input
              type="text"
              name="nickname"
              value={selectedUser.nickname}
              onChange={handleInputChange}
              placeholder="Nickname"
            />
            <input
              type="text"
              name="bloodtype"
              value={selectedUser.blood_type}
              onChange={handleInputChange}
              placeholder="Blood Type"
            />
            <input
              type="date"
              name="birthdate"
              value={selectedUser.date_of_birth}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="age"
              value={selectedUser.age}
              onChange={handleInputChange}
              placeholder="Age"
            />

            <input
              type="text"
              name="place_of_birth"
              value={selectedUser.place_of_birth}
              onChange={handleInputChange}
              placeholder="Place of Birth"
            />

            <input
              type="text"
              name="religion"
              value={selectedUser.religion}
              onChange={handleInputChange}
              placeholder="Religion"
            />
            <select
              name="gender"
              value={selectedUser.gender || ""}
              onChange={handleInputChange}
            >
              <option value="" disabled selected>
                Select Gender
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              name="civil_status"
              value={selectedUser.civil_status || ""}
              onChange={handleInputChange}
            >
              <option value="" disabled selected>
                Select Civil Status
              </option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Divorced">Divorced</option>
            </select>

            <input
              type="text"
              name="house_number"
              value={selectedUser.house_number}
              onChange={handleInputChange}
              placeholder="House No."
            />
            <input
              type="text"
              name="purok"
              value={selectedUser.purok}
              onChange={handleInputChange}
              placeholder="Purok"
            />
            <input
              type="text"
              name="street"
              value={selectedUser.street}
              onChange={handleInputChange}
              placeholder="Street/Subdivision"
            />
            <input
              type="text"
              name="barangay"
              value={selectedUser.barangay}
              onChange={handleInputChange}
              placeholder="Barangay"
            />
            <input
              type="text"
              name="municipality"
              value={selectedUser.municipality}
              onChange={handleInputChange}
              placeholder="Minicipality"
            />
            <input
              type="text"
              name="province"
              value={selectedUser.province}
              onChange={handleInputChange}
              placeholder="Province"
            />
            <input
              type="number"
              name="zip_code"
              value={selectedUser.zip}
              onChange={handleInputChange}
              placeholder="ZIP Code"
            />
            <input
              type="text"
              name="depen_lrn"
              value={selectedUser.deped_lrn}
              onChange={handleInputChange}
              placeholder="DepEd LRN"
            />
            <input
              type="text"
              name="philsys_no"
              value={selectedUser.philsys_number}
              onChange={handleInputChange}
              placeholder="PhilSys No."
            />
            <input
              type="text"
              name="household_head"
              value={selectedUser.household_head}
              onChange={handleInputChange}
              placeholder="Household Head Name"
            />
            <input
              type="text"
              name="telephone_number"
              value={selectedUser.telephone_number}
              onChange={handleInputChange}
              placeholder="Telephone Number"
            />
            <input
              type="tel"
              id="phone"
              pattern="[+]{1}[0-9]{11,14}"
              name="mobile_number"
              value={selectedUser.mobile_number}
              onChange={handleInputChange}
              placeholder="Mobile Number"
            />
            <input
              type="email"
              name="email"
              value={selectedUser.email}
              onChange={handleInputChange}
              placeholder="Email address"
            />
            <input
              type="text"
              name="school_agency"
              value={selectedUser.school_agency}
              onChange={handleInputChange}
              placeholder="School/Agency"
            />
            <input
              type="text"
              name="profession_occupation"
              value={selectedUser.profession_occupation}
              onChange={handleInputChange}
              placeholder="Profession"
            />
            <input
              type="text"
              name="position"
              value={selectedUser.position}
              onChange={handleInputChange}
              placeholder="Position"
            />

            <div className="modal-buttons">
              <button className="save-button" onClick={handleSave}>
                Save
              </button>
              <button
                className="cancel-button"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
