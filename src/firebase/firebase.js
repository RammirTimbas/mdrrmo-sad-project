// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvAJKaGgiBChkxJoTsLU4hQMY8KTK5EYw",
  authDomain: "mdrrmo---tpms.firebaseapp.com",
  projectId: "mdrrmo---tpms",
  storageBucket: "mdrrmo---tpms.appspot.com",
  messagingSenderId: "229066431258",
  appId: "1:229066431258:web:862e16632a3d2999d6eaa3",
  measurementId: "G-E9653FHLLB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

export { auth, db, storage, app, messaging }; // Export the storage so you can use it elsewhere
