import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
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
    "religion",
    "blood_type",
    "civil_status",
    "place_of_birth",
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
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center items-center gap-6 mb-6">
            <img
              src={userInfo.profile_picture}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow"
            />
            <div className="flex-1 text-center md:text-left md:ml-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {userInfo.full_name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {userInfo.position} at {userInfo.school_agency}
              </p>
              <div className="mt-4">
                <a
                  href={userInfo.crf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-5 py-2 bg-blue-600 text-white text-sm rounded-full shadow hover:bg-blue-700 transition"
                >
                  Download CRF
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={handleEditToggle}
              className="px-4 py-2 text-sm bg-blue-500 rounded-md mr-2"
            >
              {editMode ? "Cancel" : "Edit Info"}
            </button>
            {editMode && (
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md"
              >
                Save Changes
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {orderedFields.map((field) => (
              <div key={field}>
                <label className="block font-medium text-gray-700 capitalize">
                  {field.replace(/_/g, " ")}
                </label>
                {editableFields.includes(field) && editMode ? (
                  <input
                    type={
                      field.includes("date")
                        ? "date"
                        : field.includes("email")
                        ? "email"
                        : field.includes("number") ||
                          field === "age" ||
                          field.includes("zip")
                        ? "number"
                        : "text"
                    }
                    name={field}
                    value={updatedInfo[field] || ""}
                    onChange={handleInputChange}
                    className="mt-1 w-full border rounded-md p-2 text-sm"
                  />
                ) : (
                  <p className="text-gray-800 mt-1">{userInfo[field] || "—"}</p>
                )}
              </div>
            ))}
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
