import React, { useState, useEffect } from "react";
import "./CSS Folder/registration_form.css";
import { db, storage } from "./firebase/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";

import Swal from "sweetalert2";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import Lottie from "lottie-react";
import MainLoading from "./lottie-files-anim/loading-main.json";
import ThumbsUp from "./lottie-files-anim/thumbsUP.json";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const RegistrationForm = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [isCertified, setIsCertified] = useState(false); //state for checkbox
  const [formSubmitted, setFormSubmitted] = useState(false); // state for form submission
  const [profilePicture, setProfilePicture] = useState(null); // state for profile picture
  const [uploadProgress, setUploadProgress] = useState(0);

  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, []);

  // load provinces
  useEffect(() => {
    axios
      .get("https://psgc.gitlab.io/api/provinces/")
      .then((response) => setProvinces(response.data))
      .catch((error) => console.error("Error fetching provinces:", error));
  }, []);

  // load municipalities when a province is selected
  useEffect(() => {
    if (selectedProvince) {
      axios
        .get(
          `https://psgc.gitlab.io/api/provinces/${selectedProvince}/cities-municipalities/`
        )
        .then((response) => setMunicipalities(response.data))
        .catch((error) =>
          console.error("Error fetching municipalities:", error)
        );
    }
  }, [selectedProvince]);

  // load barangays when a municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      axios
        .get(
          `https://psgc.gitlab.io/api/cities-municipalities/${selectedMunicipality}/barangays/`
        )
        .then((response) => setBarangays(response.data))
        .catch((error) => console.error("Error fetching barangays:", error));
    }
  }, [selectedMunicipality]);

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // adjust age if the birthday hasn't occurred yet this year
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  /*
  const populateTemplate = async () => {
    const response = await fetch("/CRF_TEMP.docx");
    const blob = await response.blob();

    const zip = await JSZip.loadAsync(blob);
    const docXml = await zip.file("word/document.xml").async("string");

    const populatedXml = docXml
      .replace(/\[\[FULL_NAME\]\]/g, `${personalInfo.full_name || "No value"}`)
      .replace(/\[\[NICK_NAME\]\]/g, `${personalInfo.nickname || "No value"}`)
      .replace(
        /\[\[BLOOD_TYPE\]\]/g,
        `${personalInfo.blood_type || "No value"}`
      )
      .replace(
        /\[\[DATE_OF_BIRTH\]\]/g,
        `${personalInfo.date_of_birth || "No value"}`
      )
      .replace(/\[\[AGE\]\]/g, `${personalInfo.age || "No value"}`)
      .replace(
        /\[\[PLACE_OF_BIRTH\]\]/g,
        `${personalInfo.place_of_birth || "No value"}`
      )
      .replace(/\[\[GENDER\]\]/g, `${personalInfo.gender || "No value"}`)
      .replace(
        /\[\[CIVIL_STATUS\]\]/g,
        `${personalInfo.civil_status || "No value"}`
      )
      .replace(/\[\[RELIGION\]\]/g, `${personalInfo.religion || "No value"}`)
      .replace(/\[\[HN\]\]/g, `${homeAddress.house_number || "No value"}`)
      .replace(/\[\[PK\]\]/g, `${homeAddress.purok || "No value"}`)
      .replace(/\[\[ST\]\]/g, `${homeAddress.street || "No value"}`)
      .replace(/\[\[BRGY\]\]/g, `${homeAddress.barangay || "No value"}`)
      .replace(
        /\[\[MUNICIPALITY\]\]/g,
        `${homeAddress.municipality || "No value"}`
      )
      .replace(/\[\[PROVINCE\]\]/g, `${homeAddress.province || "No value"}`)
      .replace(/\[\[ZIP\]\]/g, `${homeAddress.zip || "No value"}`)
      .replace(/\[\[LRN\]\]/g, `${additionalInfo.deped_lrn || "No value"}`)
      .replace(
        /\[\[PHILSYS_NUMBER\]\]/g,
        `${additionalInfo.philsys_number || "No value"}`
      )
      .replace(
        /\[\[HOUSEHOLD_HEAD\]\]/g,
        `${additionalInfo.household_head || "No value"}`
      )
      .replace(
        /\[\[TELEPHONE_NUMBER\]\]/g,
        `${additionalInfo.telephone_number || "No value"}`
      )
      .replace(
        /\[\[TELFAX\]\]/g,
        `${additionalInfo.telfax_number || "No value"}`
      )
      .replace(
        /\[\[MOBILE_NUMBER\]\]/g,
        `${additionalInfo.mobile_number || "No value"}`
      )
      .replace(/\[\[EMAIL\]\]/g, `${additionalInfo.email || "No value"}`)
      .replace(
        /\[\[SCHOOL_AGENCY\]\]/g,
        `${additionalInfo.school_agency || "No value"}`
      )
      .replace(
        /\[\[PROFESSION\]\]/g,
        `${additionalInfo.profession_occupation || "No value"}`
      )
      .replace(/\[\[POSITION\]\]/g, `${additionalInfo.position || "No value"}`);

    zip.file("word/document.xml", populatedXml);

    const newDocxBlob = await zip.generateAsync({ type: "blob" });
    saveAs(newDocxBlob, "CRF-Copy (Print this).docx");
  }; */

  const populateTemplate = async () => {
    try {
      setIsLoading(true);
      console.log("Downloading CRF...");

      // Fetch the CRF download URL from Firestore
      const registrantQuery = query(
        collection(db, "Registrants"),
        where("email", "==", additionalInfo.email)
      );
      const querySnapshot = await getDocs(registrantQuery);

      if (querySnapshot.empty) {
        throw new Error("No CRF found for this email.");
      }

      const registrantData = querySnapshot.docs[0].data();
      const crfUrl = registrantData.crf;

      if (!crfUrl) {
        throw new Error("CRF file not available.");
      }

      console.log("Downloading CRF from:", crfUrl);
      const response = await fetch(crfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Capability_Registration_Form.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      console.log("File downloaded successfully!");
    } catch (error) {
      console.error("Error downloading CRF", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "There was an error downloading the CRF. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const populateTemplate2 = async () => {
    try {
      console.log("Generating CRF...");

      const formData = new FormData();
      console.log("Appending Form Data...");

      if (profilePicture) {
        formData.append("file", profilePicture);
      }
      formData.append("full_name", personalInfo.full_name || "N/A");
      formData.append("nickname", personalInfo.nickname || "N/A");
      formData.append("blood_type", personalInfo.blood_type || "N/A");
      formData.append("date_of_birth", personalInfo.date_of_birth || "N/A");
      formData.append("age", personalInfo.age || "N/A");
      formData.append("place_of_birth", personalInfo.place_of_birth || "N/A");
      formData.append("gender", personalInfo.gender || "N/A");
      formData.append("civil_status", personalInfo.civil_status || "N/A");
      formData.append("religion", personalInfo.religion || "N/A");
      formData.append("house_number", homeAddress.house_number || "N/A");
      formData.append("purok", homeAddress.purok || "N/A");
      formData.append("street", homeAddress.street || "N/A");
      formData.append("barangay", homeAddress.barangay || "N/A");
      formData.append("municipality", homeAddress.municipality || "N/A");
      formData.append("province", homeAddress.province || "N/A");
      formData.append("zip", homeAddress.zip || "N/A");
      formData.append("deped_lrn", additionalInfo.deped_lrn || "N/A");
      formData.append("philsys_number", additionalInfo.philsys_number || "N/A");
      formData.append("household_head", additionalInfo.household_head || "N/A");
      formData.append(
        "telephone_number",
        additionalInfo.telephone_number || "N/A"
      );
      formData.append("telfax_number", additionalInfo.telfax_number || "N/A");
      formData.append("mobile_number", additionalInfo.mobile_number || "N/A");
      formData.append("email", additionalInfo.email || "N/A");
      formData.append("school_agency", additionalInfo.school_agency || "N/A");
      formData.append(
        "profession_occupation",
        additionalInfo.profession_occupation || "N/A"
      );
      formData.append("position", additionalInfo.position || "N/A");

      console.log("Sending request to server...");
      const response = await fetch(`${API_BASE_URL}/populate-crf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate the CRF.");
      }

      console.log("Received populated CRF...");
      return await response.blob(); // Return Blob instead of downloading
    } catch (error) {
      console.error("Error populating CRF", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "There was an error processing the CRF. Please try again.",
      });
      throw error;
    }
  };

  const [personalInfo, setPersonalInfo] = useState({
    full_name: "",
    nickname: "",
    blood_type: "",
    date_of_birth: "",
    age: "",
    place_of_birth: "",
    religion: "",
    gender: "",
    civil_status: "",
  });

  const [homeAddress, setHomeAddress] = useState({
    house_number: "",
    purok: "",
    street: "",
    barangay: "",
    municipality: "",
    province: "",
    zip: "",
  });

  const [additionalInfo, setAdditionalInfo] = useState({
    deped_lrn: "",
    philsys_number: "",
    household_head: "",
    telephone_number: "",
    telfax_number: "",
    mobile_number: "",
    email: "",
    school_agency: "",
    profession_occupation: "",
    position: "",
  });

  //hide overlay and close registration form
  const handleCloseOverlay = () => {
    setFormSubmitted(false);
    onClose();
  };

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]); // store the selected file
  };

  const handleInputChange = (e, section) => {
    const { name, value } = e.target;
    if (section === "personalInfo") {
      setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    } else if (section === "homeAddress") {
      setHomeAddress((prev) => ({ ...prev, [name]: value }));
    } else if (section === "additionalInfo") {
      setAdditionalInfo((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateBirthChange = (e, section) => {
    const { name, value } = e.target;

    if (name === "date_of_birth") {
      setPersonalInfo((prev) => ({
        ...prev,
        date_of_birth: value,
        age: calculateAge(value),
      }));
    } else {
      setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      // check required fields for Personal Information
      const {
        full_name,
        age,
        nickname,
        bloodtype,
        date_of_birth,
        religion,
        gender,
        civil_status,
        place_of_birth,
      } = personalInfo;
      if (
        !full_name ||
        !age ||
        !religion ||
        !gender ||
        !civil_status ||
        !date_of_birth ||
        !place_of_birth
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Please fill in all required fields in Personal Information.",
        });
        return;
      }
    } else if (step === 2) {
      // check required fields for Home Address
      const {
        house_number,
        barangay,
        municipality,
        province,
        zip,
        street,
        purok,
      } = homeAddress;
      if (
        !house_number ||
        !barangay ||
        !municipality ||
        !province ||
        !zip ||
        !purok ||
        !street
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Please fill in all required fields in Home Address.",
        });
        return;
      }
    } else if (step === 3) {
      // check required fields for Additional Info
      const {
        deped_lrn,
        philsys_number,
        household_head,
        mobile_number,
        email,
        school_agency,
        profession_occupation,
        position,
      } = additionalInfo;
      if (
        !deped_lrn ||
        !philsys_number ||
        !household_head ||
        !mobile_number ||
        !email ||
        !school_agency ||
        !profession_occupation ||
        !position
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Please fill in all required fields in Additional Info.",
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      if (isSubmitting) return;

      if (profilePicture) {
        try {
          // Check if email already exists
          const emailExistsQuery = query(
            collection(db, "Users"),
            where("email", "==", additionalInfo.email)
          );
          const emailSnapshot = await getDocs(emailExistsQuery);

          if (!emailSnapshot.empty) {
            Swal.fire({
              icon: "error",
              title: "Email Already Exists",
              text: "The email you entered is already registered. Please use a different email.",
            });
            return;
          }

          const normalizeText = (text) =>
            text.toLowerCase().replace(/\s+/g, ""); // Convert to lowercase & remove spaces

          const nameExistsQuery = query(
            collection(db, "User Informations"),
            where("full_name", "==", personalInfo.full_name) // Query still needs exact match
          );
          const nameSnapshot = await getDocs(nameExistsQuery);

          let nameExists = false;

          // Manually check each document and normalize before comparing
          nameSnapshot.forEach((doc) => {
            const storedName = normalizeText(doc.data().full_name);
            const inputName = normalizeText(personalInfo.full_name);

            if (storedName === inputName) {
              nameExists = true;
            }
          });

          if (nameExists) {
            Swal.fire({
              icon: "error",
              title: "Name Already Exists",
              text: "The full name you entered is already registered.",
            });
            return;
          }

          // Proceed with registration logic if both checks pass

          // Show confirmation prompt
          const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to submit the registration?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, submit it!",
            cancelButtonText: "No, cancel!",
          });

          if (result.isConfirmed) {
            setIsSubmitting(true);

            // Upload profile picture
            const profilePicRef = ref(
              storage,
              `profile_pictures/${profilePicture.name}`
            );
            const uploadTask = uploadBytesResumable(
              profilePicRef,
              profilePicture
            );

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress =
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
              },
              (error) => {
                console.error("Error uploading profile picture:", error);
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "Error uploading profile picture.",
                });
                setIsSubmitting(false);
              },
              async () => {
                const profilePicUrl = await getDownloadURL(
                  uploadTask.snapshot.ref
                );

                try {
                  // Populate and upload the CRF document
                  const populatedTemplateBlob = await populateTemplate2();
                  const crfRef = ref(
                    storage,
                    `crf/${personalInfo.full_name}_CRF.docx`
                  );
                  const crfUploadTask = await uploadBytes(
                    crfRef,
                    populatedTemplateBlob
                  );
                  const crfUrl = await getDownloadURL(crfUploadTask.ref);

                  const registrantData = {
                    ...personalInfo,
                    age: parseInt(personalInfo.age, 10),
                    ...homeAddress,
                    ...additionalInfo,
                    profile_picture: profilePicUrl,
                    crf: crfUrl,
                    status: "pending",
                    submittedAt: new Date(),
                  };

                  await addDoc(collection(db, "Registrants"), registrantData);
                  setFormSubmitted(true);

                  Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: "Registration submitted successfully!",
                  });
                } catch (error) {
                  console.error("Error saving registration:", error);
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "There was an error submitting your registration.",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }
            );
          }
        } catch (error) {
          console.error("Error checking email:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "There was an error validating your email. Please try again.",
          });
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Please upload a profile picture.",
        });
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-form-container">
      {!formSubmitted ? (
        <AnimatePresence>
          <motion.div
            className="registration-form"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            <button onClick={onClose} className="close-button">
              ✖
            </button>
            <h2>Capability Registration Form</h2>

            <div className="notice">
              Before filling up this registration form, please ensure that you
              have an Intent Letter signed by the Municipal Mayor.
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <fieldset>
                  <legend>Personal Information</legend>
                  <div className="form-field">
                    <label>Full Name:</label>
                    <input
                      type="text"
                      name="full_name"
                      value={personalInfo.full_name}
                      placeholder="Enter full name"
                      onChange={(e) => handleInputChange(e, "personalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Nickname:</label>
                    <input
                      type="text"
                      name="nickname"
                      value={personalInfo.nickname}
                      placeholder="Enter nickname"
                      onChange={(e) => handleInputChange(e, "personalInfo")}
                    />
                  </div>
                  <div className="form-field">
                    <label>1x1 Picture:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Blood Type:</label>
                    <input
                      type="text"
                      name="blood_type"
                      value={personalInfo.blood_type}
                      placeholder="Enter blood type"
                      onChange={(e) => handleInputChange(e, "personalInfo")}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="date_of_birth">Date of Birth:</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={personalInfo.date_of_birth}
                      onChange={(e) => handleDateBirthChange(e, "personalInfo")}
                      style={{ marginLeft: "160px" }}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Age:</label>
                    <input
                      type="number"
                      name="age"
                      value={personalInfo.age}
                      onChange={(e) => {
                        handleInputChange(e, "personalInfo");
                      }}
                      required
                      readOnly // set the age input as read-only to prevent user modification
                    />
                  </div>

                  <div className="form-field">
                    <label>Place of Birth:</label>
                    <input
                      type="text"
                      name="place_of_birth"
                      value={personalInfo.place_of_birth}
                      placeholder="Enter birthplace"
                      onChange={(e) => handleInputChange(e, "personalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Religion:</label>
                    <input
                      type="text"
                      name="religion"
                      value={personalInfo.religion}
                      placeholder="Enter religion"
                      onChange={(e) => handleInputChange(e, "personalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="gender">Gender:</label>
                    <div className="form-group">
                      <select
                        id="gender"
                        name="gender"
                        required
                        value={personalInfo.gender}
                        onChange={(e) => handleInputChange(e, "personalInfo")}
                      >
                        <option value="" disabled selected>
                          Choose gender
                        </option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Others</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-field">
                    <label htmlFor="civilStatus">Civil Status:</label>
                    <div className="form-group">
                      <select
                        id="civilStatus"
                        name="civil_status"
                        required
                        value={personalInfo.civil_status}
                        onChange={(e) => handleInputChange(e, "personalInfo")}
                      >
                        <option value="" disabled selected>
                          Choose civil status
                        </option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </fieldset>
              )}

              {step === 2 && (
                <fieldset>
                  <legend>Home Address</legend>
                  <div className="form-field">
                    <label>Province:</label>
                    <select
                      value={homeAddress.province || ""}
                      required
                      onChange={(e) => {
                        const selectedProvince = provinces.find(
                          (p) => p.name === e.target.value
                        );
                        if (selectedProvince) {
                          setHomeAddress((prev) => ({
                            ...prev,
                            province: selectedProvince.name,
                          }));
                          setSelectedProvince(selectedProvince.code);
                          setMunicipalities([]); // reset municipalities when province changes
                          setBarangays([]); // reset barangays when province changes
                        }
                      }}
                      style={{ marginLeft: "130px" }}
                    >
                      <option value="">Select Province</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Municipality:</label>
                    <select
                      required
                      value={homeAddress.municipality || ""}
                      onChange={(e) => {
                        const selectedMunicipality = municipalities.find(
                          (m) => m.name === e.target.value
                        );
                        if (selectedMunicipality) {
                          setHomeAddress((prev) => ({
                            ...prev,
                            municipality: selectedMunicipality.name,
                          }));
                          setSelectedMunicipality(selectedMunicipality.code);
                          setBarangays([]); // reset barangays when municipality changes
                        }
                      }}
                      style={{ marginLeft: "110px" }}
                      disabled={!selectedProvince}
                    >
                      <option value="">Select Municipality</option>
                      {municipalities.map((municipality) => (
                        <option
                          key={municipality.code}
                          value={municipality.name}
                        >
                          {municipality.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Barangay:</label>
                    <select
                      required
                      value={homeAddress.barangay || ""}
                      onChange={(e) => {
                        setHomeAddress((prev) => ({
                          ...prev,
                          barangay: e.target.value,
                        }));
                      }}
                      style={{ marginLeft: "125px" }}
                      disabled={!selectedMunicipality}
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map((barangay) => (
                        <option key={barangay.code} value={barangay.name}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Purok:</label>
                    <input
                      type="text"
                      name="purok"
                      value={homeAddress.purok}
                      placeholder="Enter home address"
                      onChange={(e) => handleInputChange(e, "homeAddress")}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Street/Subdivision:</label>
                    <input
                      type="text"
                      name="street"
                      value={homeAddress.street}
                      placeholder="Enter street"
                      onChange={(e) => handleInputChange(e, "homeAddress")}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>House No:</label>
                    <input
                      type="text"
                      name="house_number"
                      value={homeAddress.house_number}
                      placeholder="Enter house number"
                      onChange={(e) => handleInputChange(e, "homeAddress")}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Zip:</label>
                    <input
                      type="number"
                      name="zip"
                      value={homeAddress.zip}
                      placeholder="Enter ZIP code"
                      onChange={(e) => handleInputChange(e, "homeAddress")}
                      required
                    />
                  </div>
                </fieldset>
              )}

              {step === 3 && (
                <fieldset>
                  <legend>Additional Info</legend>
                  <div className="form-field">
                    <label>DepEd LRN:</label>
                    <input
                      type="text"
                      name="deped_lrn"
                      value={additionalInfo.deped_lrn}
                      placeholder="XXXX-XXXX-XXXX"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>PhilSys No:</label>
                    <input
                      type="text"
                      name="philsys_number"
                      value={additionalInfo.philsys_number}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Household Head Name:</label>
                    <input
                      type="text"
                      name="household_head"
                      value={additionalInfo.household_head}
                      placeholder="Enter Household Head name"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Telephone No:</label>
                    <input
                      type="text"
                      name="telephone_number"
                      value={additionalInfo.telephone_number}
                      placeholder="XXXX-XXXX-XXXX"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                    />
                  </div>
                  <div className="form-field">
                    <label>Tel/Fax No:</label>
                    <input
                      type="text"
                      name="telfax_number"
                      value={additionalInfo.telfax_number}
                      placeholder="XXXX-XXXX-XXXX"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                    />
                  </div>
                  <div className="form-field">
                    <label>Mobile No:</label>
                    <input
                      type="tel"
                      name="mobile_number"
                      value={additionalInfo.mobile_number}
                      placeholder="+639-XXX-XXXX-XX"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={additionalInfo.email}
                      placeholder="example@email.com"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>School/Agency:</label>
                    <input
                      type="text"
                      name="school_agency"
                      value={additionalInfo.school_agency}
                      placeholder="Enter School/Agency name"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Profession:</label>
                    <input
                      type="text"
                      name="profession_occupation"
                      value={additionalInfo.profession_occupation}
                      placeholder="Enter profession"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Position:</label>
                    <input
                      type="text"
                      name="position"
                      value={additionalInfo.position}
                      placeholder="Enter position"
                      onChange={(e) => handleInputChange(e, "additionalInfo")}
                      required
                    />
                  </div>
                  <div className="cb-holder">
                    <input
                      type="checkbox"
                      id="certification"
                      checked={isCertified}
                      onChange={() => setIsCertified(!isCertified)}
                    />
                    <label htmlFor="certification">
                      I certify that the above information is correct.
                    </label>
                  </div>
                </fieldset>
              )}
              <div className="form-navigation">
                {step > 1 && (
                  <button
                    type="button"
                    className="registration-button"
                    onClick={() => setStep(step - 1)}
                  >
                    Back
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    className="registration-button"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="registration-button"
                    disabled={!isCertified} // disable submit if not certified
                  >
                    Submit
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="overlay">
          <div className="overlay-content">
            {/* Animated Thumbs Up */}
            <Lottie
              animationData={ThumbsUp}
              loop={true}
              className="thumbs-up-animation"
            />

            <h2>Registration Submitted Successfully!</h2>
            <p>
              Please download the copy of your Capability Registration Form
              below:
            </p>
            <button className="download-button" onClick={populateTemplate}>
              Download Capability Registration Form
            </button>
            <button className="done-button" onClick={handleCloseOverlay}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 mb-6">
              <Lottie animationData={MainLoading} loop={true} />
            </div>
            <p className="text-gray-600">
              The developers are smashing the keyboard very fast!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;
