import React, { useState, useEffect, useRef } from "react";
import { FaCamera } from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, storage } from "../firebase/firebase";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Lottie from "lottie-react";
import MainLoading from "../lottie-files-anim/loading-main.json";
import zxcvbn from "zxcvbn";

const Profile = ({ userId }) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [userInfo, setUserInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedInfo, setUpdatedInfo] = useState({});
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordRules, setPasswordRules] = useState({
    minLength: false,
    hasNumber: false,
    hasUpperCase: false,
    hasSpecialChar: false,
  });
  const [verifyPassword, setVerifyPassword] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  // Change photo feature
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  // Change profile photo logic
  // Instantly open file picker for change photo
  const handleChangePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Only accept JPG and max 5MB
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      Swal.fire({ icon: "error", title: "Invalid File", text: "Only JPG images are allowed." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File Too Large", text: "Maximum file size is 5MB." });
      return;
    }
    setChangingPhoto(true);
    try {
      const profilePicRef = ref(
        storage,
        `profile_pictures/${userInfo.full_name}_${Date.now()}`
      );
      const uploadTask = uploadBytesResumable(profilePicRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          Swal.fire({ icon: "error", title: "Error", text: "Error uploading photo." });
          setChangingPhoto(false);
        },
        async () => {
          const profilePicUrl = await getDownloadURL(uploadTask.snapshot.ref);
          // Update Firestore
          const userInfoRef = collection(db, "User Informations");
          const q = query(userInfoRef, where("user_ID", "==", userId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            const docRef = doc(db, "User Informations", docId);
            await updateDoc(docRef, { profile_picture: profilePicUrl });
            setUserInfo((prev) => ({ ...prev, profile_picture: profilePicUrl }));
            setChangingPhoto(false);
            setUploadProgress(0);
            Swal.fire({ icon: "success", title: "Success", text: "Profile photo updated!" });
          }
        }
      );
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Error updating photo." });
      setChangingPhoto(false);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const userDocRef = doc(db, "Users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const docData = userDocSnap.data();
        const storedHashedPassword = docData.password;

        const isMatch = bcrypt.compareSync(
          verifyPassword,
          storedHashedPassword
        );

        if (!isMatch) {
          Swal.fire("Invalid Password", "Password is incorrect", "error");
          return;
        }

        setIsPasswordVerified(true); // ✅ Allow setting PIN now
        Swal.fire("Verified!", "Password verified successfully.", "success");
      } else {
        Swal.fire("Not found", "User not found", "info");
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      Swal.fire("An error occurred", "Unable to verify password", "error");
    }
  };

  const handleSetPin = async () => {
    try {
      if (newPin !== confirmNewPin) {
        Swal.fire("PIN mismatch", "PIN entries do not match", "error");
        return;
      }

      const userDocRef = doc(db, "Users", userId);
      await updateDoc(userDocRef, { pin: newPin });

      setVerifyPassword("");
      setIsPasswordVerified(false);
      setNewPin("");
      setConfirmNewPin("");

      Swal.fire("Success!", "PIN set successfully.", "success");
    } catch (error) {
      console.error("Error setting PIN:", error);
      Swal.fire("An error occurred", "Unable to set PIN", "error");
    }
  };

  const orderedFields = [
    "full_name",
    "nickname",
    "age",
    "gender",
    "position",
    "profession_occupation",
    "barangay",
    "purok",
    "street",
    "house_number",
    "municipality",
    "province",
    "zip",
    "mobile_number",
    "telephone_number",
    "email",
    "religion",
    "blood_type",
    "civil_status",
    "place_of_birth",
    "date_of_birth",
    "school_agency",
  ];

  const editableFields = [
    "nickname",
    "age",
    "position",
    "profession_occupation",
    "barangay",
    "purok",
    "street",
    "house_number",
    "municipality",
    "province",
    "zip",
    "mobile_number",
    "telephone_number",
    "religion",
    "blood_type",
    "civil_status",
    "date_of_birth",
    "school_agency",
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userInfoRef = collection(db, "User Informations");
        const q = query(userInfoRef, where("user_ID", "==", userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setUserInfo(docData);
          setUpdatedInfo(docData);
        }
      } catch (error) {
        console.error("Error fetching user information: ", error);
      }
    };

    fetchUserInfo();
  }, [userId]);

  const handleEditToggle = () => setEditMode(!editMode);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUpdatedInfo((prevInfo) => ({ ...prevInfo, [name]: value }));
  };

  const handlePasswordChange = async () => {
    try {
      const userDocRef = doc(db, "Users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const docData = userDocSnap.data();
        const storedHashedPassword = docData.password;

        const isMatch = bcrypt.compareSync(oldPassword, storedHashedPassword);
        if (!isMatch) {
          Swal.fire("Invalid Password", "Old password is incorrect", "error");
          return;
        }

        if (newPassword !== confirmNewPassword) {
          Swal.fire(
            "New password mismatch",
            "New passwords do not match",
            "error"
          );
          return;
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        await updateDoc(userDocRef, { password: hashedNewPassword });

        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        Swal.fire("Success!", "Password changed successfully", "success");
      } else {
        Swal.fire("Not found", "User not found", "info");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      Swal.fire("An error occurred", "Unable to change password", "error");
    }
  };

  const handleSaveChanges = async () => {
    try {
      const userInfoRef = collection(db, "User Informations");
      const q = query(userInfoRef, where("user_ID", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, "User Informations", docId);
        await updateDoc(docRef, updatedInfo);
        setEditMode(false);
        Swal.fire("Success!", "Information updated successfully", "success");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      Swal.fire("Failed", "Unable to save changes", "info");
    }
  };

  const validatePassword = (password) => {
    setPasswordRules({
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });

    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasNumber && hasUpperCase && hasSpecialChar;
  };

  const handlePasswordStrength = (password) => {
    const result = zxcvbn(password);
    setPasswordStrength(result.score);

    const isValid = validatePassword(password);
    setPasswordValid(isValid && result.score >= 3);
  };

  if (!userInfo)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-24 h-24 mb-6">
            <Lottie animationData={MainLoading} loop={true} />
          </div>
          <p className="text-gray-600">
            The developers are smashing the keyboard very fast!
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-4 md:p-10 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your information, security and credentials.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            activeTab === "personal"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab("credentials")}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            activeTab === "credentials"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Login Credentials
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            activeTab === "security"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Security
        </button>
      </div>

      {activeTab === "personal" && (
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-100 rounded-3xl shadow-2xl p-0 sm:p-0 w-full max-w-full mx-auto animate-fadein" style={{ minHeight: "60vh", boxShadow: "0 8px 40px rgba(80,80,180,0.10)" }}>
          {/* ID Card Layout */}
          <div className="flex flex-col sm:flex-row items-stretch w-full h-full animate-fadein" style={{ minHeight: "60vh" }}>
            {/* Left: Photo, Name, Position, CRF */}
            <div className="flex flex-col items-center justify-center sm:justify-start bg-gradient-to-br from-blue-200 via-blue-100 to-purple-100 rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none py-6 sm:py-12 px-4 sm:px-8 w-full sm:w-1/3 sm:min-w-[260px] sm:max-w-[340px]">
              <div className="relative">
                <img
                  src={userInfo.profile_picture}
                  alt="Profile"
                  className="w-24 h-24 sm:w-36 sm:h-36 rounded-lg object-cover border-4 border-white shadow-xl transition-transform duration-300 hover:scale-105"
                  style={{ minWidth: "96px", minHeight: "96px" }}
                />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  ref={fileInputRef}
                  onChange={handlePhotoFileChange}
                  style={{ display: "none" }}
                />
                <button
                  className="absolute bottom-2 right-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full p-2 shadow-lg hover:scale-110 transition font-semibold border border-white flex items-center justify-center"
                  onClick={handleChangePhotoClick}
                  style={{ fontSize: "1.2rem", zIndex: 2 }}
                  aria-label="Change Photo"
                >
                  <FaCamera />
                </button>
                {changingPhoto && (
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-white bg-opacity-80 rounded-lg z-10 animate-fadein">
                    <div className="text-xs text-gray-700 mb-2">Uploading...</div>
                    {uploadProgress > 0 && (
                      <div className="w-3/4 bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mt-4 mb-1 animate-fadein text-center" style={{ fontSize: "1.3rem" }}>
                {userInfo.full_name}
              </h2>
              <p className="text-base sm:text-lg text-blue-500 mb-2 animate-fadein text-center" style={{ fontSize: "1rem" }}>
                Student at {userInfo.school_agency}
              </p>
              <div className="mt-2 sm:mt-4 animate-fadein">
                <a
                  href={userInfo.crf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-1 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white text-base sm:text-lg rounded-full shadow hover:scale-105 transition font-semibold"
                  style={{ fontSize: "1rem" }}
                >
                  Download CRF
                </a>
              </div>
              {/* Edit buttons for mobile */}
              <div className="flex justify-center mt-4 gap-2 w-full sm:hidden">
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 text-base bg-gradient-to-r from-blue-500 to-purple-500 rounded-md font-semibold shadow hover:scale-105 text-white transition"
                  style={{ fontSize: "1rem" }}
                >
                  {editMode ? "Cancel" : "Edit Info"}
                </button>
                {editMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 text-base bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-md font-semibold shadow hover:scale-105 transition"
                    style={{ fontSize: "1rem" }}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            {/* Right: Details, not scrollable, fit content, mobile stacks, desktop grid */}
            <div className="flex-1 w-full px-2 sm:px-10 py-4 sm:py-12 animate-fadein flex flex-col justify-center" style={{ overflow: "visible" }}>
              {/* Edit buttons for desktop */}
              <div className="flex justify-end mb-4 gap-2 w-full hidden sm:flex">
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 text-base bg-gradient-to-r from-blue-500 to-purple-500 rounded-md font-semibold shadow hover:scale-105 text-white transition"
                  style={{ fontSize: "1rem" }}
                >
                  {editMode ? "Cancel" : "Edit Info"}
                </button>
                {editMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 text-base bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-md font-semibold shadow hover:scale-105 transition"
                    style={{ fontSize: "1rem" }}
                  >
                    Save
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4 w-full animate-fadein" style={{ maxHeight: "none" }}>
                {orderedFields.map((field) => (
                  <div key={field} className="flex flex-col mb-2 bg-white bg-opacity-80 rounded-lg shadow-sm p-2 border border-blue-100">
                    <label className="block font-semibold text-blue-700 capitalize text-base sm:text-lg mb-1" style={{ fontSize: "0.95rem" }}>
                      {field.replace(/_/g, " ")}
                    </label>
                    {editableFields.includes(field) && editMode ? (
                      field === "gender" ? (
                        <select
                          name="gender"
                          value={updatedInfo.gender || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : field === "civil_status" ? (
                        <select
                          name="civil_status"
                          value={updatedInfo.civil_status || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        >
                          <option value="">Select Status</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                        </select>
                      ) : field === "date_of_birth" ? (
                        <input
                          type="date"
                          name="date_of_birth"
                          value={updatedInfo.date_of_birth || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        />
                      ) : field === "email" ? (
                        <input
                          type="email"
                          name="email"
                          value={updatedInfo.email || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        />
                      ) : field === "mobile_number" ? (
                        <input
                          type="tel"
                          name="mobile_number"
                          value={updatedInfo.mobile_number || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        />
                      ) : field === "zip" || field === "age" ? (
                        <input
                          type="number"
                          name={field}
                          value={updatedInfo[field] || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-300 bg-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        />
                      ) : (
                        <input
                          type="text"
                          name={field}
                          value={updatedInfo[field] || ""}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded-md p-2 text-base sm:text-lg focus:ring-2 focus:ring-blue-50"
                          style={{ fontSize: "0.95rem" }}
                        />
                      )
                    ) : (
                      <p className="text-gray-800 mt-1 break-words text-base sm:text-lg" style={{ fontSize: "0.95rem" }}>{userInfo[field] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "credentials" && (
        <div className="bg-white rounded-xl shadow-md p-6 flex justify-center">
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Change Password
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border p-2 rounded-md text-sm mt-1"
                />
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      handlePasswordStrength(e.target.value); // Check password strength on input change
                    }}
                    className="w-full border p-2 rounded-md text-sm mt-1"
                  />

                  {/* Display secured message if all rules are met */}
                  {passwordRules.minLength &&
                    passwordRules.hasNumber &&
                    passwordRules.hasUpperCase &&
                    passwordRules.hasSpecialChar && (
                      <p className="text-xs text-green-500 mt-2">
                        Secured password
                      </p>
                    )}

                  {/* Password Rules */}
                  {!(
                    passwordRules.minLength &&
                    passwordRules.hasNumber &&
                    passwordRules.hasUpperCase &&
                    passwordRules.hasSpecialChar
                  ) && (
                    <p className="text-xs text-red-500 mt-2">
                      <b>Password must:</b>
                      <ul className="list-disc list-inside">
                        {!passwordRules.minLength && (
                          <li>Be at least 8 characters long</li>
                        )}
                        {!passwordRules.hasNumber && (
                          <li>Contain at least one number</li>
                        )}
                        {!passwordRules.hasUpperCase && (
                          <li>Contain at least one uppercase letter</li>
                        )}
                        {!passwordRules.hasSpecialChar && (
                          <li>Contain at least one special character</li>
                        )}
                      </ul>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border p-2 rounded-md text-sm mt-1"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm w-full"
                disabled={!passwordValid} // Disable if password is not valid
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="bg-white rounded-xl shadow-md p-6 flex justify-center">
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Set Security PIN
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="w-full border p-2 rounded-md text-sm mt-1"
                  placeholder="Enter your password to continue"
                />
              </div>

              {isPasswordVerified && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="w-full border p-2 rounded-md text-sm mt-1 tracking-widest text-center text-lg"
                      placeholder="••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) =>
                        setConfirmNewPin(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      className="w-full border p-2 rounded-md text-sm mt-1 tracking-widest text-center text-lg"
                      placeholder="••••"
                    />
                  </div>
                </>
              )}

              {!isPasswordVerified ? (
                <button
                  onClick={handleVerifyPassword}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm w-full"
                  disabled={!verifyPassword}
                >
                  Verify Password
                </button>
              ) : (
                <button
                  onClick={handleSetPin}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition text-sm w-full"
                  disabled={newPin.length !== 4 || newPin !== confirmNewPin}
                >
                  Set PIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
