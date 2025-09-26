import React, { useState, useEffect, useRef } from "react";

// Accordion animation base and AccordionItem component
const animBase = "transition-all duration-500 ease-in-out";
const AccordionItem = ({ id, title, children, icon, openSection, setOpenSection }) => (
  <div className="border border-gray-300 rounded-lg shadow-md bg-white overflow-hidden">
    <button
      className={`w-full flex items-center justify-between px-5 py-4 focus:outline-none ${openSection === id ? "bg-blue-50" : "bg-white"}`}
      onClick={() => setOpenSection(openSection === id ? null : id)}
    >
      <div className="flex items-center gap-2 text-lg font-semibold text-blue-700">
        {icon}
        {title}
      </div>
      <svg
        className={`w-5 h-5 text-blue-600 transform ${openSection === id ? "rotate-180" : "rotate-0"} ${animBase}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div
      className={`overflow-hidden ${animBase}`}
      style={{
        maxHeight: openSection === id ? 1000 : 0,
        opacity: openSection === id ? 1 : 0,
        pointerEvents: openSection === id ? "auto" : "none",
      }}
    >
      <div className="p-6">{children}</div>
    </div>
  </div>
);
import { storage } from "./firebase";
import { db } from "./firebase";
import {
  collection,
  getDocs,
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
  deleteField,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  uploadBytesResumable,
} from "firebase/storage";
import Swal from "sweetalert2";
import mainlogo from "./logo/settings.png";
import { addNotification } from "../../helpers/addNotification";
import PopulationConfig from "./PopulationConfig";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = ({ userId }) => {
  // Accordion open section state (for config tab)
  const [openSection, setOpenSection] = useState("quota");
  const [activeTab, setActiveTab] = useState("addAdmin");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [carouselImages, setCarouselImages] = useState([]);

  const [verifyPassword, setVerifyPassword] = useState("");
  const [logs, setLogs] = useState([]);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [initialVerifiedPassword, setInitialVerifiedPassword] = useState(""); // store verified password
  const [filter, setFilter] = useState("");
  const fileInputRef = useRef(null);

  const [monthlyQuota, setMonthlyQuota] = useState(0);
  const [annualQuota, setAnnualQuota] = useState(0);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [files, setFiles] = useState({});

  const [selectedType, setSelectedType] = useState("");
  const [materials, setMaterials] = useState({ imageUrl: "", videoUrl: "" });

  const [uploadProgress, setUploadProgress] = useState({
    image: null,
    video: null,
  });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [adminName, setAdminName] = useState("Admin User");

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


  // --- generate option lists (compute after logs state is filled) ---
  const adminNames = Array.from(
    new Set(logs.map((l) => l.name).filter(Boolean))
  ).sort();

  const typesOpt = Array.from(
    new Set(logs.map((l) => l.type).filter(Boolean))
  ).sort();

  const actionsOpt = Array.from(
    new Set(logs.map((l) => l.action).filter(Boolean))
  ).sort();

  // dates in yyyy-mm-dd for date input options (unique)
  const datesOpt = Array.from(
    new Set(
      logs
        .map((l) => {
          try {
            return new Date(l.date).toISOString().slice(0, 10);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    )
  ).sort().reverse();


  // --- filteredLogs using individual filters (replaces previous filter logic) ---
  const filteredLogs = logs
    .filter((log) => {
      // Admin name filter (exact match)
      if (filterName && log.name !== filterName) return false;

      // Type filter (exact match)
      if (filterType && log.type !== filterType) return false;

      // Action filter (exact match)
      if (filterAction && log.action !== filterAction) return false;

      // Date filter (compare yyyy-mm-dd safely)
      if (filterDate) {
        try {
          const logDate = new Date(log.date);
          if (isNaN(logDate)) return false; // skip invalid
          const logDateYMD = logDate.toISOString().slice(0, 10);
          if (logDateYMD !== filterDate) return false;
        } catch {
          return false;
        }
      }


      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addNotification(title, message, null); // Sends to all users
      setSuccess(true);
      setTitle("");
      setMessage("");

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error sending announcement:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Fetch existing quotas & training types from Firestore
    const fetchConfig = async () => {
      const configRef = doc(db, "Settings", "Quotas");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setMonthlyQuota(configSnap.data().monthlyQuota || 0);
        setAnnualQuota(configSnap.data().annualQuota || 0);
      }

      const typesSnap = await getDocs(collection(db, "Training Type"));
      setTrainingTypes(
        typesSnap.docs.map((doc) => doc.data().training_type_name)
      );
    };

    fetchConfig();
  }, []);

  const updateMonthlyQuota = async () => {
    await setDoc(
      doc(db, "Settings", "Quotas"),
      { monthlyQuota },
      { merge: true }
    );
    Swal.fire("Success", "Monthly Quota Updated!", "success");
  };

  const updateAnnualQuota = async () => {
    await setDoc(
      doc(db, "Settings", "Quotas"),
      { annualQuota },
      { merge: true }
    );
    Swal.fire("Success", "Annual Quota Updated!", "success");
  };

  const handleExportLogs = async () => {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" }); // e.g. "Sep"
    const year = now.getFullYear();
    const defaultFileName = `Logs_Report_${month}_${year}`;

    const { value: formValues } = await Swal.fire({
      title: "Export Logs",
      html: `
      <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left; width: 100%; max-width: 400px; margin: auto;">
        
        <div style="width: 100%;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">File Name</label>
          <input id="swal-filename" 
            type="text"
            value="${defaultFileName}"
            placeholder="Enter file name"
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; outline: none; box-sizing: border-box;" />
        </div>

        <div style="width: 100%;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Remarks</label>
          <textarea id="swal-remarks" 
            placeholder="Enter remarks for all logs"
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; resize: none; outline: none; box-sizing: border-box;"></textarea>
        </div>

        <div style="width: 100%;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Format</label>
          <select id="swal-format"
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; outline: none; box-sizing: border-box;">
            <option value="docx">DOCX</option>
          </select>
        </div>
      </div>
    `,
      focusConfirm: false,
      confirmButtonText: "Generate",
      showCancelButton: true,
      customClass: {
        popup: "no-scroll-popup",
      },
      preConfirm: () => {
        const fileName = (document.getElementById("swal-filename").value || "Logs_Report").trim();
        const remarks = (document.getElementById("swal-remarks").value || "").trim();
        const format = document.getElementById("swal-format").value;
        return { fileName, remarks, format };
      },
    });

    if (!formValues) return;

    const { fileName, remarks, format } = formValues;
    const dataToExport = filteredLogs.length > 0 ? filteredLogs : logs;

    if (!Array.isArray(dataToExport) || dataToExport.length === 0) {
      Swal.fire("Notice", "No logs to export.", "info");
      return;
    }

    try {
      Swal.fire({
        title: "Generating...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await fetch(`${API_BASE_URL}/export-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          format,
          title: fileName,
          adminName,
          todayDate: new Date().toLocaleDateString(),
          logs: dataToExport,
          remarks,
        }),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => null);
        throw new Error(txt || "Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      Swal.fire("Success", "Export ready — download started.", "success");
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("Error", "Failed to export logs. Check console.", "error");
    }
  };






  const handleFileUpload = async (e, type, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadProgress((prev) => ({ ...prev, [fileType]: 0 }));

      const storageRef = ref(
        storage,
        `training-materials/${type}/${fileType}s/${file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress((prev) => ({
            ...prev,
            [fileType]: progress.toFixed(0),
          }));
        },
        (error) => {
          console.error("Upload Error:", error);
          Swal.fire("Error", "Failed to upload file!", "error");
          setUploadProgress((prev) => ({ ...prev, [fileType]: null }));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 🔍 Find the correct document ID in Firestore
          const typeQuery = query(
            collection(db, "Training Type"),
            where("training_type_name", "==", type)
          );
          const typeSnapshot = await getDocs(typeQuery);

          if (!typeSnapshot.empty) {
            const typeDocRef = doc(
              db,
              "Training Type",
              typeSnapshot.docs[0].id
            );
            const updateField =
              fileType === "image" ? "imageUrls" : "videoUrls";

            await updateDoc(typeDocRef, {
              [updateField]: arrayUnion(downloadURL), // Append new URL to array
            });
          } else {
            await addDoc(collection(db, "Training Type"), {
              training_type_name: type,
              [fileType === "image" ? "imageUrls" : "videoUrls"]: [downloadURL],
            });
          }

          setUploadProgress((prev) => ({ ...prev, [fileType]: null }));
          Swal.fire("Success", `${fileType} uploaded successfully!`, "success");
          fetchMaterials(); // Refresh materials after upload
        }
      );
    } catch (error) {
      console.error("Error:", error);
      Swal.fire("Error", "Something went wrong!", "error");
      setUploadProgress((prev) => ({ ...prev, [fileType]: null }));
    }
  };

  // Fetch materials for the selected type
  const fetchMaterials = async () => {
    try {
      if (!selectedType) return;

      const typeQuery = query(
        collection(db, "Training Type"),
        where("training_type_name", "==", selectedType)
      );
      const typeSnapshot = await getDocs(typeQuery);

      if (!typeSnapshot.empty) {
        const typeDoc = typeSnapshot.docs[0];
        setMaterials({
          imageUrls: typeDoc.data().imageUrls || [],
          videoUrls: typeDoc.data().videoUrls || [],
        });
      } else {
        setMaterials({ imageUrls: [], videoUrls: [] });
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    }
  };

  // Fetch materials when selectedType changes
  useEffect(() => {
    fetchMaterials();
  }, [selectedType]);

  // Handle file deletion
  const handleDeleteFile = async (fileType, fileUrl) => {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);

      // 🔍 Find the correct Firestore document
      const typeQuery = query(
        collection(db, "Training Type"),
        where("training_type_name", "==", selectedType)
      );
      const typeSnapshot = await getDocs(typeQuery);

      if (!typeSnapshot.empty) {
        const typeDocRef = doc(db, "Training Type", typeSnapshot.docs[0].id);
        const updateField = fileType === "image" ? "imageUrls" : "videoUrls";

        await updateDoc(typeDocRef, {
          [updateField]: arrayRemove(fileUrl), // Remove the specific file URL
        });

        Swal.fire("Deleted!", `${fileType} deleted successfully.`, "success");
        fetchMaterials(); // Refresh materials after deletion
      }
    } catch (error) {
      console.error("Delete Error:", error);
      Swal.fire("Error", "Failed to delete file!", "error");
    }
  };

  useEffect(() => {
    // Fetch logs from the backend
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (!response.ok) throw new Error("Failed to fetch logs");
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };
    fetchLogs();

    // Fetch carousel images from Firebase Storage
    const fetchCarouselImages = async () => {
      const imagesRef = ref(storage, "carousel-images/");
      try {
        const imageList = await listAll(imagesRef);
        const urls = await Promise.all(
          imageList.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url };
          })
        );
        setCarouselImages(urls);
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };
    fetchCarouselImages();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);


  //verify admin password before adding a new admin
  const verifyAdminPassword = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-admin-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: verifyPassword,
        }),
      });

      const data = await response.json();
      if (data.verified) {
        setPasswordVerified(true);
        setInitialVerifiedPassword(verifyPassword);
        Swal.fire(
          "Password Verified!",
          "You can now add a new administrator.",
          "success"
        );
      } else {
        Swal.fire(
          "Incorrect Password",
          "Please enter the correct password to proceed.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error verifying password:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  //add a new admin through backend
  const addNewAdmin = async () => {
    if (!passwordVerified) {
      alert("Please verify your password first.");
      return;
    }

    if (isProcessing2) return;
    setIsProcessing2(true);

    try {
      const response = await fetch(`${API_BASE_URL}/add-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAdmin,
          password: newAdmin.password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Swal.fire(
          "Success",
          "New administrator added successfully.",
          "success"
        );
        setNewAdmin({ name: "", email: "", password: "" });
        setVerifyPassword("");
        setPasswordVerified(false);
      } else {
        Swal.fire(
          "Failed",
          data.message || "Failed to add new administrator.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding new administrator:", error);
      Swal.fire("Failed", "Failed to add new administrator.", "error");
    } finally {
      setIsProcessing2(false);
    }
  };

  // check if the field is changed
  useEffect(() => {
    if (passwordVerified && verifyPassword !== initialVerifiedPassword) {
      setPasswordVerified(false);
    }
  }, [verifyPassword, passwordVerified, initialVerifiedPassword]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, `carousel-images/${file.name}`);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCarouselImages((prevImages) => [
        ...prevImages,
        { name: file.name, url },
      ]);
      Swal.fire(
        "Image Uploaded!",
        "The image has been uploaded successfully.",
        "success"
      );
    } catch (error) {
      console.error("Error uploading image:", error);
      Swal.fire("Error", "Failed to upload image.", "error");
    }
  };

  // Handle image delete
  const handleImageDelete = async (imageName) => {
    const imageRef = ref(storage, `carousel-images/${imageName}`);
    try {
      await deleteObject(imageRef);
      setCarouselImages((prevImages) =>
        prevImages.filter((image) => image.name !== imageName)
      );
      Swal.fire(
        "Image Deleted!",
        "The image has been deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error("Error deleting image:", error);
      Swal.fire("Error", "Failed to delete image.", "error");
    }
  };

  const handleFilePickerClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };




  return (
    <div className="settings-container">
      <div className="title-bar">
        <img src={mainlogo} alt="Registrants Logo" className="title-bar-logo" />
        <h2>Settings</h2>
      </div>
      <div className="tabs">
        <button
          onClick={() => setActiveTab("addAdmin")}
          className={activeTab === "addAdmin" ? "active" : ""}
        >
          Add New Administrator
        </button>
        <button
          onClick={() => setActiveTab("carouselImages")}
          className={activeTab === "carouselImages" ? "active" : ""}
        >
          Carousel Images
        </button>
        <button
          onClick={() => setActiveTab("viewLogs")}
          className={activeTab === "viewLogs" ? "active" : ""}
        >
          View Logs
        </button>
        <button
          onClick={() => setActiveTab("viewConfig")}
          className={activeTab === "viewConfig" ? "active" : ""}
        >
          Configurations
        </button>
        <button
          onClick={() => setActiveTab("announce")}
          className={activeTab === "announce" ? "active" : ""}
        >
          Announce
        </button>
      </div>

      {/* Add New Admin Tab */}
      {activeTab === "addAdmin" && (
        <div className="add-admin">
          <h2>Add New Administrator</h2>
          <div className="form-group-settings">
            <label>Name</label>
            <input
              type="text"
              value={newAdmin.name}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, name: e.target.value })
              }
              placeholder="Enter admin name"
              required
            />
          </div>
          <div className="form-group-settings">
            <label>Email</label>
            <input
              type="email"
              value={newAdmin.email}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, email: e.target.value })
              }
              placeholder="Enter admin email"
              required
            />
          </div>
          <div className="form-group-settings">
            <label>Password</label>
            <input
              type="password"
              value={newAdmin.password}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, password: e.target.value })
              }
              placeholder="Enter admin password"
              required
            />
          </div>
          <div className="form-group-settings">
            <label>Enter Superuser Password</label>
            <input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Enter superuser password"
              required
            />
            <button
              onClick={verifyAdminPassword}
              className="verify-btn"
              disabled={isProcessing}
            >
              {isProcessing ? "Verifying..." : "Verify Password"}
            </button>
            <button
              onClick={addNewAdmin}
              className="add-btn"
              disabled={
                isProcessing2 ||
                !passwordVerified ||
                !newAdmin.name ||
                !newAdmin.email ||
                !newAdmin.password
              }
            >
              {isProcessing2 ? "Processing..." : "Add Administrator"}
            </button>
          </div>
        </div>
      )}

      {/* Carousel Images Tab */}
      {activeTab === "carouselImages" && (
        <div>
          <div className="carousel-images">
            <div className="header-container">
              <h2>Manage Carousel Images</h2>
              <button onClick={handleFilePickerClick} className="add-image-btn">
                +
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
          <div className="carousel-content">
            <div className="current-images-section">
              <div className="carousel-images-list">
                {carouselImages.length > 0 ? (
                  carouselImages.map((image) => (
                    <div key={image.name} className="carousel-image-item">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="carousel-image"
                      />
                      <div className="image-filename">{image.name}</div>
                      <button
                        onClick={() => handleImageDelete(image.name)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No images available in the carousel.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Logs Tab */}
      {activeTab === "viewLogs" && (
        <div className="view-logs mt-4">

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
                Filter Logs
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{filteredLogs.length} results</span>
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
                  {/* Admin Name */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">Admin Name</label>
                    <select
                      value={filterName}
                      onChange={(e) => {
                        setFilterName(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${filterName ? "border-blue-500 ring-blue-200" : "border-gray-300 focus:ring-blue-500"
                        }`}
                    >
                      <option value="">All Admins</option>
                      {adminNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${filterType ? "border-blue-500 ring-blue-200" : "border-gray-300 focus:ring-blue-500"
                        }`}
                    >
                      <option value="">All Types</option>
                      {typesOpt.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                          setFilterDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${filterDate ? "border-blue-500 ring-blue-200" : "border-gray-300 focus:ring-blue-500"
                          }`}
                        style={{
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          appearance: "none",
                          paddingRight: "2.5rem", // leave space for calendar icon
                          lineHeight: "1.5rem",   // match selects
                          height: "2.5rem"        // force same height as selects
                        }}
                      />
                    </div>
                  </div>



                </div>

                {/* Controls */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setFilterName("");
                      setFilterType("");
                      setFilterDate("");
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
                    onClick={handleExportLogs}
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Export Logs
                  </button>
                </div>
              </div>
            )}
          </div>





          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-blue-100 text-gray-700">
                <tr>
                  {["#", "Admin Name", "Type", "Action", "Date"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-sm font-semibold text-left border-b"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-6">
                      No logs available or failed to fetch logs.
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b text-sm">
                        {(currentPage - 1) * logsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-2 border-b text-sm">{log.name}</td>
                      <td className="px-4 py-2 border-b text-sm">{log.type}</td>
                      <td className="px-4 py-2 border-b text-sm">
                        {log.action}
                      </td>
                      <td className="px-4 py-2 border-b text-sm">
                        {log.date && !isNaN(new Date(log.date))
                          ? new Date(log.date).toLocaleString()
                          : "-"}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
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
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
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
        </div>
      )}

      {/* View Config Tab */}
      {activeTab === "viewConfig" && (
        <div className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-3xl font-bold text-blue-600 mb-4">
            Configuration
          </h2>
          <div className="space-y-4">
            <AccordionItem
              id="quota"
              title="Quota Settings"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
              openSection={openSection}
              setOpenSection={setOpenSection}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-gray-300 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-2">Monthly Quota</h3>
                  <input
                    type="number"
                    min="1"
                    value={monthlyQuota}
                    onChange={(e) => setMonthlyQuota(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
                  />
                  <button
                    onClick={updateMonthlyQuota}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Save
                  </button>
                </div>
                <div className="p-4 border border-gray-300 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-2">Annual Quota</h3>
                  <input
                    type="number"
                    min="1"
                    value={annualQuota}
                    onChange={(e) => setAnnualQuota(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
                  />
                  <button
                    onClick={updateAnnualQuota}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </AccordionItem>
            <AccordionItem
              id="population"
              title="Population Configuration"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v4m-1 4v2a1 1 0 01-1 1h-3m-10 0H4a1 1 0 01-1-1v-2" /></svg>
              }
              openSection={openSection}
              setOpenSection={setOpenSection}
            >
              <PopulationConfig />
            </AccordionItem>
            <AccordionItem
              id="training"
              title="Training Materials Management"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6m0 0l-9-5m9 5l9-5" /></svg>
              }
              openSection={openSection}
              setOpenSection={setOpenSection}
            >
              <div className="p-6 bg-white shadow-md rounded-lg">
                <h3 className="text-xl font-semibold mb-4">
                  Training Materials Management
                </h3>
                <label className="block text-lg font-medium mb-2">
                  Select Training Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring focus:ring-blue-400"
                >
                  <option value="">-- Select a Training Type --</option>
                  {trainingTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {selectedType && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      {selectedType} Materials
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600">
                        Upload Images
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, selectedType, "image")}
                        className="w-full p-2 border rounded-lg focus:ring focus:ring-blue-400"
                      />
                      {uploadProgress.image !== null && (
                        <div className="mt-2 w-full bg-gray-300 rounded-full h-4">
                          <div
                            className="h-4 bg-blue-600 rounded-full text-center text-white text-xs font-bold leading-4"
                            style={{ width: `${uploadProgress.image}%` }}
                          >
                            {uploadProgress.image}%
                          </div>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {materials.imageUrls?.map((imgUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imgUrl}
                              className="w-40 h-40 object-cover rounded-md shadow"
                            />
                            <button
                              onClick={() => handleDeleteFile("image", imgUrl)}
                              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600">
                        Upload Videos
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e, selectedType, "video")}
                        className="w-full p-2 border rounded-lg focus:ring focus:ring-blue-400"
                      />
                      {uploadProgress.video !== null && (
                        <div className="mt-2 w-full bg-gray-300 rounded-full h-4">
                          <div
                            className="h-4 bg-green-600 rounded-full text-center text-white text-xs font-bold leading-4"
                            style={{ width: `${uploadProgress.video}%` }}
                          >
                            {uploadProgress.video}%
                          </div>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {materials.videoUrls?.map((vidUrl, index) => (
                          <div key={index} className="relative group">
                            <video controls className="w-60 h-40 rounded-md shadow">
                              <source src={vidUrl} type="video/mp4" />
                            </video>
                            <button
                              onClick={() => handleDeleteFile("video", vidUrl)}
                              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AccordionItem>
          </div>
        </div>
      )}

      {activeTab === "announce" && (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Send Announcement
          </h2>
          <p className="text-gray-600 mb-6">
            Use this form to send a notification to all users.
          </p>

          <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-gray-700 font-medium">Title</label>
              <input
                type="text"
                className="w-full px-4 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-gray-700 font-medium">Message</label>
              <textarea
                className="w-full px-4 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Write your announcement message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 font-semibold text-white rounded-md transition ${loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                  }`}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Announcement"}
              </button>
            </div>
          </form>

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-3 text-green-700 bg-green-100 border border-green-400 rounded-md">
              Announcement sent successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
