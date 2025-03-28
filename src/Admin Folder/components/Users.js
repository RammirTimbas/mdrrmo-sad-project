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
  const [showFilter, setShowFilter] = useState(false);
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
      )}

      {activeTab === "users" && (
        <>
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
        </>
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
          <div className="scrollable-table">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Age</th>
                  <th>Birthplace</th>
                  <th>Gender</th>
                  <th>Civil Status</th>
                  <th>Religion</th>
                  <th>Barangay</th>
                  <th>Municipality</th>
                  <th>Province</th>
                  <th>Mobile No</th>
                  <th>Email</th>
                  <th>School/Agency</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.age}</td>
                    <td>{user.place_of_birth}</td>
                    <td>{user.gender}</td>
                    <td>{user.civil_status}</td>
                    <td>{user.religion}</td>
                    <td>{user.barangay}</td>
                    <td>{user.municipality}</td>
                    <td>{user.province}</td>
                    <td>{user.mobile_number}</td>
                    <td>{user.email}</td>
                    <td>{user.school_agency}</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleApprove(user)}
                        className="approve-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleReject(user)}
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
