import React, { useState, useEffect } from "react";
import applicantsLogo from "./logo/applicants_icon.png";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import Swal from "sweetalert2";
import loader from "./charts/blue-loader.svg";
import noItem from "./logo/no_items.png";
import { addNotification } from "../../helpers/addNotification";
import Lottie from "lottie-react";
import MainLoading from "../../lottie-files-anim/loading-main.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const Applicants = ({ userId }) => {
  const [applicantsData, setApplicantsData] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState({});
  const [requirementIndices, setRequirementIndices] = useState({});
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [uniquePrograms, setUniquePrograms] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch admin name
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

  // Fetch applicants
  useEffect(() => {
    const fetchApplicants = () => {
      const now = Math.floor(Date.now() / 1000); // Get current Unix timestamp

      const q = query(
        collection(db, "Applicants"),
        where("status", "==", "pending"),
        where("start_date", "<", new Date()), // Firestore can directly compare Timestamp fields
        orderBy("application_date", sortOrder === "latest" ? "desc" : "asc")
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const applicantsList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            userId: doc.id,
            ...data,
            start_date: data.start_date ? data.start_date.seconds : null,
            end_date: data.end_date ? data.end_date.seconds : null,
          };
        });

        setApplicantsData(applicantsList);
        setFilteredApplicants(applicantsList);
        setLoading(false);

        setUniquePrograms([
          ...new Set(applicantsList.map((app) => app.program_title)),
        ]);

        const initialIndices = {};
        applicantsList.forEach((applicant) => {
          initialIndices[applicant.userId] = 0;
        });
        setRequirementIndices(initialIndices);
      });

      return () => unsubscribe();
    };

    fetchApplicants();
  }, [sortOrder]);

  // Filter applicants based on search and program selection
  useEffect(() => {
    let filtered = applicantsData;

    if (selectedProgram) {
      filtered = filtered.filter(
        (applicant) => applicant.program_title === selectedProgram
      );
    }

    if (searchTerm) {
      filtered = filtered.filter((applicant) =>
        applicant.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplicants(filtered);
  }, [searchTerm, selectedProgram, applicantsData]);

  const handleApprove = async (applicant) => {
    const { user_id, program_id } = applicant;
    const applicationId = `${user_id}_${program_id}`;

    if (isProcessing[applicationId]) return;

    Swal.fire({
      title: "Approve Applicant?",
      text: `Are you sure you want to approve ${applicant.full_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true);
        setIsProcessing((prev) => ({ ...prev, [applicationId]: true }));

        try {
          const programRef = doc(db, "Training Programs", program_id);
          const programSnapshot = await getDoc(programRef);

          if (!programSnapshot.exists()) {
            Swal.fire("Error", "Training Program does not exist", "error");
            return;
          }

          const programData = programSnapshot.data();
          const currentSlots = programData.slots || 0;

          if (currentSlots <= 0) {
            Swal.fire("Error", "No slots available for this program", "error");
            return;
          }

          const userHistoryRef = doc(db, "User History", applicationId);
          const approvedApplicantData = {
            [`${applicant.user_id}_${applicant.program_id}`]: {
              user_id: applicant.user_id,
              full_name: applicant.full_name,
              status: "approved",
              application_id: applicationId,
            },
          };

          await setDoc(
            programRef,
            {
              approved_applicants: approvedApplicantData,
              slots: currentSlots - 1,
            },
            { merge: true }
          );

          const applicantRef = doc(db, "Applicants", applicationId);
          await updateDoc(applicantRef, { status: "approved" });

          const userHistoryUpdate = {
            program_id: applicant.program_id,
            program_title: applicant.program_title,
            status: "approved",
            start_date: applicant.start_date,
            end_date: applicant.end_date,
            application_id: applicationId,
          };

          await setDoc(userHistoryRef, userHistoryUpdate, { merge: true });

          await addDoc(collection(db, "Logs"), {
            name: adminName,
            type: "Application",
            action:
              "Approved Applicant: " +
              applicant.full_name +
              " to " +
              applicant.program_title,
            date: new Date(),
          });

          addNotification(
            "Application Approved!",
            `Greetings ${applicant.full_name}! Your application for ${applicant.program_title} has been approved! Check further details in the 'My Applications' tab.`,
            applicant.user_id
          );

          Swal.fire(
            "Approved!",
            "Applicant has been approved successfully.",
            "success"
          );
          setFilteredApplicants((prev) =>
            prev.filter((app) => app.userId !== user_id)
          );
        } catch (error) {
          console.error("Error approving applicant:", error);
          Swal.fire(
            "Error",
            `Error approving applicant: ${error.message}`,
            "error"
          );
        } finally {
          setIsLoading(false);
          setIsProcessing((prev) => ({ ...prev, [applicationId]: false }));
        }
      }
    });
  };

  const handleReject = (applicant) => {
    Swal.fire({
      title: "Reject Applicant?",
      text: `Are you sure you want to reject ${applicant.full_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setIsLoading(true);
          // Delete the applicant from the "Applicants" collection
          const applicantRef = doc(
            db,
            "Applicants",
            `${applicant.user_id}_${applicant.program_id}`
          );
          await deleteDoc(applicantRef);

          const userHistoryRef = doc(
            db,
            "User History",
            `${applicant.user_id}_${applicant.program_id}`
          );
          await deleteDoc(userHistoryRef);

          // Log the rejection
          await addDoc(collection(db, "Logs"), {
            name: adminName,
            type: "Application",
            action:
              "Rejected Applicant: " +
              applicant.full_name +
              " to " +
              applicant.program_title,
            date: new Date(),
          });

          // Display success message
          Swal.fire(
            "Rejected!",
            "Applicant has been rejected successfully.",
            "success"
          );

          addNotification(
            "Application Rejected!",
            `Greetings ${applicant.full_name}! Your application for ${applicant.program_title} has unfortunately been rejected! Check further details in the 'My Applications' tab.`,
            applicant.user_id
          );
        } catch (error) {
          console.error("Error rejecting applicant:", error);
          Swal.fire(
            "Error",
            `Error rejecting applicant: ${error.message}`,
            "error"
          );
        }

        setIsLoading(false);
      }
    });
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentApplicants = filteredApplicants.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <img src={applicantsLogo} alt="Applicants" className="h-12" />
        <h2 className="text-2xl font-bold text-gray-700">
          Applicants Management
        </h2>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <input
          type="text"
          className="w-full md:w-1/3 p-3 border border-gray-300 rounded-lg shadow-sm"
          placeholder="Search by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm"
        >
          <option value="">All Programs</option>
          {uniquePrograms.map((program, index) => (
            <option key={index} value={program}>
              {program}
            </option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm"
        >
          <option value="latest">Latest Applications</option>
          <option value="oldest">Oldest Applications</option>
        </select>
      </div>

      {/* Applicants Table */}
      {loading ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 mb-6">
              <Lottie animationData={MainLoading} loop={true} />
            </div>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      ) : filteredApplicants.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200">
              <tr className="text-left text-gray-600">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Program</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Uploaded Files</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentApplicants.map((applicant) => (
                <tr
                  key={applicant.userId}
                  className="border-t hover:bg-gray-100"
                >
                  <td className="p-4">{applicant.full_name}</td>
                  <td className="p-4">{applicant.email}</td>
                  <td className="p-4">{applicant.program_title}</td>
                  <td className="p-4">
                    {applicant.selected_dates?.length > 0 ? (
                      applicant.selected_dates
                        .map((date) =>
                          date?.seconds
                            ? new Date(date.seconds * 1000).toLocaleDateString()
                            : new Date(date).toLocaleDateString()
                        )
                        .join(", ")
                    ) : (
                      <>
                        <b>Start:</b>{" "}
                        {applicant.start_date
                          ? new Date(
                              applicant.start_date * 1000
                            ).toLocaleDateString()
                          : "No Date"}{" "}
                        | <b>End:</b>{" "}
                        {applicant.end_date
                          ? new Date(
                              applicant.end_date * 1000
                            ).toLocaleDateString()
                          : "No Date"}
                      </>
                    )}
                  </td>

                  {/* Uploaded Files Column */}
                  <td className="p-4">
                    {applicant.uploadedRequirements ? (
                      <button
                        onClick={() => setSelectedApplicant(applicant)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg shadow-md"
                      >
                        View Files
                      </button>
                    ) : (
                      <span className="text-gray-400">No Files</span>
                    )}
                  </td>

                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => handleApprove(applicant)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg shadow-md"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(applicant)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg shadow-md"
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
        <div className="text-center mt-8">
          <img
            src={noItem}
            alt="No applicants found"
            className="mx-auto w-32"
          />
          <p className="text-gray-500 mt-2">No applicants found.</p>
        </div>
      )}

      {/* View Files Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Uploaded Files</h3>

            {/* Check if there are uploaded files */}
            {selectedApplicant.uploadedRequirements &&
            Object.keys(selectedApplicant.uploadedRequirements).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(selectedApplicant.uploadedRequirements).map(
                  ([key, url]) => (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {key}
                      </a>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="text-gray-500 text-center">No files uploaded.</p>
            )}

            <button
              onClick={() => setSelectedApplicant(null)}
              className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            Next
          </button>
        </div>
      )}

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

export default Applicants;
