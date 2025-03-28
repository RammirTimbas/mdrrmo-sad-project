import React, { useState, useEffect, useRef } from "react";
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
  const [activeTab, setActiveTab] = useState("addAdmin");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);

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

  const filteredLogs = logs
    .filter((log) => {
      return (
        log.name.toLowerCase().includes(filter.toLowerCase()) ||
        log.type.toLowerCase().includes(filter.toLowerCase()) ||
        log.action.toLowerCase().includes(filter.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

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
        <div className="view-logs">
          <h2>Logs</h2>
          <div className="filter-section">
            <label htmlFor="logFilter">Filter Logs:</label>
            <input
              type="text"
              id="logFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by admin name, type, or action"
            />
          </div>
          <div className="logs-list">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <div key={index} className="log-item">
                  <p>
                    <strong>Admin Name:</strong> {log.name}
                  </p>
                  <p>
                    <strong>Type:</strong> {log.type}
                  </p>
                  <p>
                    <strong>Action:</strong> {log.action}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(log.date).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p>No logs available or failed to fetch logs.</p>
            )}
          </div>
        </div>
      )}

      {/* View Config Tab */}
      {activeTab === "viewConfig" && (
        <div className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-3xl font-bold text-blue-600 mb-4">
            Configuration
          </h2>

          {/* Quota Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Quota */}
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

            {/* Annual Quota */}
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

          <PopulationConfig/>

          {/* Training Materials Upload */}
          <div className="p-6 bg-white shadow-md rounded-lg">
            <h3 className="text-xl font-semibold mb-4">
              Training Materials Management
            </h3>

            {/* Training Type Selection */}
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

            {/* Upload & View Section */}
            {selectedType && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">
                  {selectedType} Materials
                </h3>

                {/* Image Upload & Preview */}
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

                  {/* Image Gallery */}
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

                {/* Video Upload & Preview */}
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

                  {/* Video Gallery */}
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
                className={`px-6 py-2 font-semibold text-white rounded-md transition ${
                  loading
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
