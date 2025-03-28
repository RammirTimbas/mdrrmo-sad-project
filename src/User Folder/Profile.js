import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import bcrypt from 'bcryptjs';
import Swal from 'sweetalert2';
import loader from './blue-loader.svg'; 

const Profile = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [userInfo, setUserInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedInfo, setUpdatedInfo] = useState({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const orderedFields = [
    'full_name', 'nickname', 'age', 'position', 'profession_occupation', 'barangay', 
    'purok', 'house_number', 'mobile_number', 'telephone_number', 'email', 'religion', 
    'zip', 'blood_type', 'civil_status', 'place_of_birth', 'school_agency'
  ];

  const editableFields = [
    'age', 'barangay', 'blood_type', 'civil_status', 'deped_lrn', 'house_number',
    'household_head', 'mobile_number', 'nickname', 'philsys_number', 'place_of_birth',
    'position', 'profession_occupation', 'purok', 'religion', 'school_agency',
    'telephone_number', 'telfax_number', 'zip'
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userInfoRef = collection(db, 'User Informations');
        const q = query(userInfoRef, where('user_ID', '==', userId));
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
      const userDocRef = doc(db, 'Users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const docData = userDocSnap.data();
        const storedHashedPassword = docData.password;

        const isMatch = bcrypt.compareSync(oldPassword, storedHashedPassword);
        if (!isMatch) {
          Swal.fire('Invalid Password', 'Old password is incorrect', 'error');
          return;
        }

        if (newPassword !== confirmNewPassword) {
          Swal.fire('New password mismatch', 'New passwords do not match', 'error');
          return;
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        await updateDoc(userDocRef, { password: hashedNewPassword });

        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        Swal.fire('Success!', 'Password changed successfully', 'success');
      } else {
        Swal.fire('Not found', 'User not found', 'info');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Swal.fire('An error occurred', 'Unable to change password', 'error');
    }
  };

  const handleSaveChanges = async () => {
    try {
      const userInfoRef = collection(db, 'User Informations');
      const q = query(userInfoRef, where('user_ID', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, 'User Informations', docId);
        await updateDoc(docRef, updatedInfo);
        setEditMode(false);
        Swal.fire('Success!', 'Information updated successfully', 'success');
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      Swal.fire('Failed', 'Unable to save changes', 'info');
    }
  };

  if (!userInfo) return (
    <div className="loading-screen">
      <img src={loader} alt="Loading..." className="svg-loader" />
      <p className="loading-text" style={{ color: 'black' }}>Loading...</p>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>User Profile</h1>
        <p>Manage your information and credentials</p>
      </div>

      <div className="tabs-profile">
        <button onClick={() => setActiveTab('personal')} className={activeTab === 'personal' ? 'active' : ''}>
          Personal Information
        </button>
        <button onClick={() => setActiveTab('credentials')} className={activeTab === 'credentials' ? 'active' : ''}>
          Login Credentials
        </button>
      </div>

      {activeTab === 'personal' && (
        <div className="personal-info">
          <h2>Personal Information</h2>
          <button onClick={handleEditToggle} className="edit-btn">
            {editMode ? 'Cancel' : 'Edit'}
          </button>
          {editMode && <button onClick={handleSaveChanges} className="save-btn">Save Changes</button>}
          
          <div className="info-fields">
            {orderedFields.map((field) => (
              <div key={field} className="info-field">
                <label>{field.replace(/_/g, ' ')}:</label>
                {editableFields.includes(field) && editMode ? (
                  <input
                    type="text"
                    name={field}
                    value={updatedInfo[field]}
                    onChange={handleInputChange}
                  />
                ) : (
                  <span>{userInfo[field]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="login-credentials">
          <h2>Login Credentials</h2>
          <div className="password-fields">
            <div className="password-field">
              <label>Old Password:</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="password-field">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="password-field">
              <label>Confirm New Password:</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <button onClick={handlePasswordChange} className="update-btn">Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
