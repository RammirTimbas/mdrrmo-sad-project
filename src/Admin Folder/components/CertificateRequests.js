import React, { useEffect, useState } from "react";
import { db, storage } from "./firebase"; // Ensure Firestore and Storage are imported
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDoc,
  where,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Swal from "sweetalert2";
import { FaAward, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CertificateDetailsModal from "./CertificateDetailsModal";

const CertificateRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrainingType, setSelectedTrainingType] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const [activeTab, setActiveTab] = useState("pending"); // 🔹 Tabs: pending | approved | rejected
  const [batchCodes, setBatchCodes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchSerialNumber, setSearchSerialNumber] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certificateDetails, setCertificateDetails] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  const entriesPerPage = 10;

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "Certificates"), orderBy("requestDate", "desc")),
      (querySnapshot) => {
        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(requestList);
        setFilteredRequests(requestList);

        const uniqueBatchCodes = [
          ...new Set(requestList.map((req) => req.batchCode).filter(Boolean)),
        ];

        setBatchCodes(uniqueBatchCodes.length > 0 ? uniqueBatchCodes : []);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching certificate requests:", error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // 🔹 Handle Approval (Generate & Upload Certificate)
  const handleApprove = async (request) => {
    try {
      Swal.fire({
        title: "Approve Certificate?",
        text: `Generate and approve the certificate for ${request.userName}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Approve",
      }).then(async (result) => {
        if (result.isConfirmed) {
          // 🔹 Call Backend to Generate Certificate
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/generate-certificate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: request.userName,
                training: request.programName,
                date: request.programDate,
                serialNumber: request.serialNumber,
                location: request.location,
              }),
            }
          );

          if (!response.ok) throw new Error("Certificate generation failed");

          const blob = await response.blob();
          const storageRef = ref(
            storage,
            `certificates-mdrrmo-tpms/${request.serialNumber}.docx`
          );

          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          // 🔹 Update Firestore with Download URL
          const requestRef = doc(db, "Certificates", request.id);
          await updateDoc(requestRef, {
            status: "approved",
            certificateUrl: downloadURL,
            approvedDate: new Date(),
          });

          // 🔹 Update UI
          setRequests((prevRequests) =>
            prevRequests.map((r) =>
              r.id === request.id
                ? { ...r, status: "approved", certificateUrl: downloadURL }
                : r
            )
          );

          Swal.fire("Approved!", "Certificate has been generated.", "success");
        }
      });
    } catch (error) {
      console.error("Error approving request:", error);
      Swal.fire("Error", "Failed to approve certificate request.", "error");
    }
  };

  // 🔹 Handle Rejection
  const handleReject = async (request) => {
    Swal.fire({
      title: "Reject Certificate?",
      text: `Are you sure you want to reject ${request.userName}'s request?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const requestRef = doc(db, "Certificates", request.id);
          await updateDoc(requestRef, { status: "rejected" });

          setRequests((prevRequests) =>
            prevRequests.map((r) =>
              r.id === request.id ? { ...r, status: "rejected" } : r
            )
          );

          Swal.fire(
            "Rejected",
            "Certificate request has been rejected.",
            "info"
          );
        } catch (error) {
          console.error("Error rejecting request:", error);
          Swal.fire("Error", "Failed to reject certificate request.", "error");
        }
      }
    });
  };

  // 🔹 Filter & Search Logic
  useEffect(() => {
    let filtered = requests.filter((req) => req.status === activeTab);

    if (searchTerm) {
      filtered = filtered.filter((req) =>
        req.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTrainingType) {
      filtered = filtered.filter(
        (req) => req.programName === selectedTrainingType
      );
    }

    if (selectedBatchCode) {
      filtered = filtered.filter((req) =>
        req.serialNumber.includes(selectedBatchCode)
      );
    }

    if (sortOrder === "asc") {
      filtered.sort(
        (a, b) => a.requestDate.toMillis() - b.requestDate.toMillis()
      );
    } else {
      filtered.sort(
        (a, b) => b.requestDate.toMillis() - a.requestDate.toMillis()
      );
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedTrainingType,
    sortOrder,
    selectedBatchCode,
    activeTab,
    requests,
  ]);

  const handleViewProgram = async (programId) => {
    try {
      const programRef = doc(db, "Training Programs", programId);
      const programSnap = await getDoc(programRef);

      if (!programSnap.exists()) {
        console.error("Program not found!");
        Swal.fire("Error", "Program details not found.", "error");
        return;
      }

      const programData = { id: programSnap.id, ...programSnap.data() };

      // Navigate with full program details in state
      navigate(`/admin/training-programs/${programId}`, {
        state: { program: programData },
      });
    } catch (error) {
      console.error("Error fetching program details:", error);
      Swal.fire("Error", "Failed to fetch program details.", "error");
    }
  };

  const handleSearchCertificate = async (serialNumber) => {
    try {
      // 🔹 Search for the certificate in Firestore
      const certQuery = query(
        collection(db, "Certificates"),
        where("serialNumber", "==", serialNumber)
      );
      const certSnapshot = await getDocs(certQuery);

      if (certSnapshot.empty) {
        Swal.fire(
          "Not Found",
          "No certificate matches this serial number.",
          "warning"
        );
        return;
      }

      const certData = certSnapshot.docs[0].data();

      // 🔹 Search for user details in Firestore
      const userQuery = query(
        collection(db, "User Informations"),
        where("user_ID", "==", certData.userId)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        Swal.fire(
          "User Not Found",
          "User details could not be retrieved.",
          "warning"
        );
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // 🔹 Set the data and open modal
      setCertificateDetails(certData);
      setUserDetails(userData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error searching for certificate:", error);
      Swal.fire(
        "Error",
        "An error occurred while searching for the certificate.",
        "error"
      );
    }
  };

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredRequests.slice(
    indexOfFirstEntry,
    indexOfLastEntry
  );

  const totalPages = Math.ceil(filteredRequests.length / entriesPerPage);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center space-x-4 mb-6">
        <FaAward className="h-10 w-10 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-700">
          Certificate Requests
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 border border-gray-300 shadow-sm rounded-full p-3 mb-6 w-full bg-white">
        <input
          type="text"
          placeholder="Enter Serial Number..."
          className="w-full outline-none px-4 py-2 text-gray-700 bg-transparent placeholder-gray-500"
          onChange={(e) => setSearchSerialNumber(e.target.value)}
        />
        <button
          onClick={() => handleSearchCertificate(searchSerialNumber)}
          className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg w-full sm:w-auto"
        >
          Search
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2 mb-4">
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center border rounded-lg p-2">
          <FaSearch className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search by Name"
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="border p-2 rounded-lg"
          value={selectedTrainingType}
          onChange={(e) => setSelectedTrainingType(e.target.value)}
        >
          <option value="">Filter by Training Type</option>
          {[...new Set(requests.map((req) => req.programName))].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded-lg"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>

        <select
          className="border p-2 rounded-lg"
          value={selectedBatchCode}
          onChange={(e) => setSelectedBatchCode(e.target.value)}
        >
          <option value="">Filter by Batch Code</option>
          {batchCodes.map((batch) => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-gray-200 text-left">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border">Applicant</th>
            <th className="p-3 border">Program</th>
            <th className="p-3 border">Request Date</th>
            <th className="p-3 border">Status</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>

        <tbody>
          {currentEntries.length > 0 ? (
            currentEntries.map((req) => (
              <tr key={req.id} className="border-b hover:bg-gray-50">
                <td className="p-3 border">{req.userName}</td>
                <td className="p-3 border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {req.programName}
                    </span>
                    <button
                      onClick={() => handleViewProgram(req.programId)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </td>

                <td className="p-3 border">
                  {req.requestDate.toDate().toLocaleDateString()}
                </td>
                <td className="p-3 border">{req.status}</td>
                <td className="p-3 border text-center">
                  {req.status === "approved" ? (
                    <a
                      href={req.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                    >
                      Download
                    </a>
                  ) : req.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 mr-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500">No actions available</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="p-3 text-center text-gray-500">
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-between mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-4 py-2 bg-blue-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-4 py-2 bg-blue-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <CertificateDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        certificateDetails={certificateDetails}
        userDetails={userDetails}
      />
    </div>
  );
};

export default CertificateRequests;
