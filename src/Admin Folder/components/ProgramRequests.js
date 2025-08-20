import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  addDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import Swal from "sweetalert2";

import { addNotification } from "../../helpers/addNotification";
import requested_img from "../../images/requested.jpg";
import { FaUserCircle } from "react-icons/fa";
import { createRoot } from "react-dom/client";

export default function ProgramRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch program requests from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Training Requests"),
      (snapshot) => {
        const requestData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(requestData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        Swal.fire("Error", "Failed to load program requests.", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Function to update request status
  const updateRequestStatus = async (
    id,
    newStatus,
    reason = "",
    trainerAssigned = ""
  ) => {
    try {
      setIsLoading(true);

      const requestRef = doc(db, "Training Requests", id);
      await updateDoc(requestRef, {
        status: newStatus,
        rejection_reason: reason,
        trainer_assigned: trainerAssigned,
      });

      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === id
            ? {
                ...request,
                status: newStatus,
                rejection_reason: reason,
                trainer_assigned: trainerAssigned,
              }
            : request
        )
      );

      Swal.fire("Success", `Request ${newStatus.toLowerCase()}!`, "success");
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire("Error", "Failed to update status.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTrainers = async (startDate, endDate) => {
    try {
      console.log(
        "Fetching trainers for:",
        new Date(startDate),
        "to",
        new Date(endDate)
      );

      // Get all trainers
      const trainersCollection = collection(db, "Trainer Name");
      const trainerSnapshot = await getDocs(trainersCollection);
      let allTrainers = trainerSnapshot.docs.map(
        (doc) => doc.data().trainer_name
      );

      console.log("All Trainers:", allTrainers);

      // Get occupied trainers
      const programsCollection = collection(db, "Training Programs");
      const programQuery = query(
        programsCollection,
        where("start_date", "<=", endDate / 1000), // Convert to seconds for Firestore
        where("end_date", ">=", startDate / 1000)
      );
      const occupiedSnapshot = await getDocs(programQuery);
      const occupiedTrainers = occupiedSnapshot.docs.map(
        (doc) => doc.data().trainer_assigned
      );

      console.log("Occupied Trainers:", occupiedTrainers);

      // Filter available trainers
      const availableTrainers = allTrainers.filter(
        (trainer) => !occupiedTrainers.includes(trainer)
      );

      console.log("Available Trainers:", availableTrainers);
      return availableTrainers;
    } catch (error) {
      console.error("Error fetching trainers:", error);
      return [];
    }
  };

  const handleApproveClick = async (request) => {
    const {
      id,
      start_date,
      end_date,
      selected_dates,
      user_ID,
      requestor,
      requestor_type,
      training_type,
      venue,
      num_participants,
      visibility,
      program_title,
      thumbnail,
    } = request;

    let dateRanges = [];


    if (selected_dates && selected_dates.length > 0) {
      dateRanges = selected_dates.map((date) => new Date(date.seconds * 1000));
    } else if (start_date && end_date) {
      let currentDate = new Date(start_date.seconds * 1000);
      let end = new Date(end_date.seconds * 1000);
      while (currentDate <= end) {
        dateRanges.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      Swal.fire("Error", "No valid dates found for this request.", "error");
      return;
    }

    const availableTrainers = await fetchAvailableTrainers(
      dateRanges[0].getTime(),
      dateRanges[dateRanges.length - 1].getTime()
    );

    if (availableTrainers.length === 0) {
      Swal.fire(
        "No Trainers Available",
        "No available trainers for the selected date(s).",
        "error"
      );
      return;
    }

    // 🔹 Generate Batch Code
    const programInitials = program_title
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    const typeInitials = training_type
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    // 🔹 Determine batch date
    let batchDate = start_date
      ? new Date(start_date.seconds * 1000)
          .toLocaleDateString("en-GB")
          .split("/")
          .reverse()
          .join("")
      : null;

    if (selected_dates && selected_dates.length > 0) {
      const earliestDate = Math.min(
        ...selected_dates.map((date) => date.toDate().getTime())
      );
      batchDate = new Date(earliestDate)
        .toLocaleDateString("en-GB")
        .split("/")
        .reverse()
        .join("");
    }

    // 🔹 Generate random 5-character alphanumeric string
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    // 🔹 Final Batch Code
    const batchCode = `${programInitials}-${batchDate}-${typeInitials}-${randomCode}`;
    console.log(`📌 Generated Batch Code: ${batchCode}`);

    // 🔹 Create container for React inside SweetAlert2
    const swalContainer = document.createElement("div");
    swalContainer.style.maxHeight = "300px";
    swalContainer.style.overflowY = "auto";
    swalContainer.style.textAlign = "left";

    // 🔹 Render trainers inside SweetAlert2 using React
    createRoot(swalContainer).render(
      <>
        {availableTrainers.map((trainer) => (
          <label
            key={trainer}
            className="trainer-card flex items-center justify-between p-2 border rounded-lg cursor-pointer transition hover:bg-gray-100"
          >
            {/* Left Side: Icon + Name */}
            <div className="flex items-center gap-3">
              <FaUserCircle className="text-blue-600 text-2xl" />{" "}
              {/* 🔹 React Icon */}
              <span className="font-medium text-gray-700">{trainer}</span>
            </div>

            {/* Right Side: Checkbox */}
            <input
              type="checkbox"
              value={trainer}
              className="trainer-checkbox w-5 h-5 accent-blue-600"
            />
          </label>
        ))}
      </>
    );

    // 🔹 Show SweetAlert2 modal
    Swal.fire({
      title: "Assign Trainers",
      html: swalContainer,
      showCancelButton: true,
      confirmButtonText: "Approve & Assign",
      preConfirm: () => {
        const selectedTrainers = Array.from(
          document.querySelectorAll(".trainer-checkbox:checked")
        ).map((checkbox) => checkbox.value);

        if (selectedTrainers.length === 0) {
          Swal.showValidationMessage("You must select at least one trainer!");
          return false;
        }

        return selectedTrainers;
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        const trainersAssigned = result.value;

        try {
          const generateShareCode = () => {
            const chars =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `${code}-${Date.now()}`;
          };

          const shareCode = generateShareCode();

          const programsCollection = collection(db, "Training Programs");
          const newProgramRef = await addDoc(programsCollection, {
            program_title: program_title,
            program_venue: venue,
            description: `${training_type} requested by ${requestor}`,
            start_date: start_date ? start_date.seconds : null,
            end_date: end_date ? end_date.seconds : null,
            selected_dates: selected_dates || [],
            materials_needed: "N/A",
            requirements: "N/A",
            thumbnail: thumbnail || requested_img,
            slots: num_participants,
            visibility: visibility,
            requestor_id: user_ID,
            requestor_type: requestor_type,
            share_code: shareCode,
            type: training_type,
            trainer_assigned: trainersAssigned,
            approved_applicants: {},
            batchCode: batchCode,
          });

          const newProgramId = newProgramRef.id;
          const approvedApplicantId = `${user_ID}_${newProgramId}`;

          if (
            requestor_type !== "Facilitator" &&
            requestor_type !== "facilitator"
          ) {
            const trainingProgramRef = doc(
              db,
              "Training Programs",
              newProgramId
            );
            await updateDoc(trainingProgramRef, {
              [`approved_applicants.${approvedApplicantId}`]: {
                application_id: approvedApplicantId,
                full_name: requestor,
                status: "approved",
                user_id: user_ID,
              },
            });
          }

          const userHistoryRef = doc(db, "User History", approvedApplicantId);
          await setDoc(
            userHistoryRef,
            {
              program_title: training_type,
              application_date: Date.now(),
              application_id: approvedApplicantId,
              program_id: newProgramId,
              user_id: user_ID,
              status: "approved",
              start_date: start_date ? start_date.seconds : null,
              end_date: end_date ? end_date.seconds : null,
              selected_dates: selected_dates || [],
            },
            { merge: true }
          );

          updateRequestStatus(id, "Approved", "", trainersAssigned);

          addNotification(
            "Your Training Request has been Approved!",
            `Good news, ${requestor}! Your requested training program "${program_title}" has been approved and is now available. Click here to check it out.`,
            user_ID,
            {
              action_link: `/user/home/${newProgramId}`,
              program_data: {
                id: newProgramId,
                program_title: program_title,
                program_venue: venue,
                description: `${training_type} requested by ${requestor}`,
                start_date: start_date ? start_date.seconds : null,
                end_date: end_date ? end_date.seconds : null,
                selected_dates: selected_dates || [],
                materials_needed: "N/A",
                requirements: "N/A",
                thumbnail: thumbnail || requested_img,
                slots: num_participants,
                visibility: visibility,
                requestor_id: user_ID,
                requestor_type: requestor_type || "Not Specified",
                share_code: shareCode,
                type: training_type,
                trainer_assigned: trainersAssigned,
                approved_applicants: {},
                batchCode: batchCode,
              },
            }
          );

          Swal.fire(
            "Success",
            "Training request approved and assigned!",
            "success"
          );
        } catch (error) {
          console.error("Error updating Firestore:", error);
          Swal.fire("Error", "Failed to approve and assign trainers.", "error");
        }
      }
    });

    setIsLoading(false);
  };

  // Open rejection modal with predefined reasons
  const handleRejectClick = (id) => {
    setSelectedRequestId(id);

    Swal.fire({
      title: "Reject Request",
      input: "select",
      inputOptions: {
        "Schedule Conflict": "Schedule Conflict",
        "Insufficient Resources": "Insufficient Resources",
        "Not Meeting Criteria": "Not Meeting Criteria",
        Other: "Other (Specify Below)",
      },
      inputPlaceholder: "Select a reason",
      showCancelButton: true,
      confirmButtonText: "Next",
    }).then((result) => {
      if (result.isConfirmed) {
        if (result.value === "Other") {
          // Show text input for custom reason
          Swal.fire({
            title: "Specify Reason",
            input: "text",
            inputPlaceholder: "Enter reason...",
            showCancelButton: true,
            confirmButtonText: "Submit",
            preConfirm: (reason) => {
              if (!reason) {
                Swal.showValidationMessage("You must provide a reason!");
                return false;
              }
              return reason;
            },
          }).then((customResult) => {
            if (customResult.isConfirmed) {
              updateRequestStatus(id, "Rejected", customResult.value);
            }
          });
        } else {
          // Save selected predefined reason
          updateRequestStatus(id, "Rejected", result.value, "");
        }
      }
    });

    setIsLoading(false);
  };

  const filteredRequests = requests.filter((request) => {
    if (activeTab === "Pending") return request.status === "Pending";
    return request.status === activeTab;
  });

  return (
    <div className="w-full min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">
        Program Requests
      </h1>

      <div className="flex w-full border-b border-gray-300 bg-white">
        <button
          onClick={() => setActiveTab("Pending")}
          className={`w-1/3 py-4 text-lg font-semibold focus:outline-none relative bg-white ${
            activeTab === "Pending"
              ? "text-blue-600 font-bold"
              : "text-gray-600"
          }`}
        >
          Pending
          {activeTab === "Pending" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab("Approved")}
          className={`w-1/3 py-4 text-lg font-semibold focus:outline-none relative bg-white ${
            activeTab === "Approved"
              ? "text-blue-600 font-bold"
              : "text-gray-600"
          }`}
        >
          Approved
          {activeTab === "Approved" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab("Rejected")}
          className={`w-1/3 py-4 text-lg font-semibold focus:outline-none relative bg-white ${
            activeTab === "Rejected"
              ? "text-blue-600 font-bold"
              : "text-gray-600"
          }`}
        >
          Rejected
          {activeTab === "Rejected" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
          )}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading requests...</p>
      ) : filteredRequests.length === 0 ? (
        <p className="text-center text-gray-600">No program requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow-lg rounded-lg">
            <thead>
              <tr className="bg-blue-600 text-white text-left">
                <th className="p-4">Requestor Name</th>
                <th className="p-4">Requestor Type</th>
                <th className="p-4">Training Type</th>
                <th className="p-4">Date(s)</th>
                <th className="p-4">Venue</th>
                <th className="p-4">Visibility</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b hover:bg-gray-100 transition-all"
                >
                  <td className="p-4 font-medium">
                    {request.requestor || "N/A"}
                  </td>
                  <td className="p-4 font-medium">
                    {request.requestor_type || "Not Specified"}
                  </td>
                  <td className="p-4">{request.training_type}</td>

                  {/* 🔹 Date Handling */}
                  <td className="p-4">
                    {request.start_date && request.end_date ? (
                      <>
                        <p>
                          <strong>Start:</strong>{" "}
                          {new Date(
                            request.start_date.seconds * 1000
                          ).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>End:</strong>{" "}
                          {new Date(
                            request.end_date.seconds * 1000
                          ).toLocaleDateString()}
                        </p>
                      </>
                    ) : request.selected_dates &&
                      request.selected_dates.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {request.selected_dates.map((date, index) => (
                          <li key={index}>
                            {new Date(date.seconds * 1000).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "N/A"
                    )}
                  </td>

                  <td className="p-4">{request.venue}</td>
                  <td className="p-4">{request.visibility}</td>

                  <td
                    className={`p-4 font-semibold ${
                      request.status === "Approved"
                        ? "text-green-600"
                        : request.status === "Rejected"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {request.status}
                    {request.status === "Rejected" &&
                      request.rejection_reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reason: {request.rejection_reason}
                        </p>
                      )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 flex space-x-2">
                    {request.status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleApproveClick(request)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(request.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
}
