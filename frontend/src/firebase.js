import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSy...", // Placeholder, user needs to fill this
    authDomain: "gift-phase-5c187.firebaseapp.com",
    projectId: "gift-phase-5c187",
    storageBucket: "gift-phase-5c187.firebasestorage.app",
    messagingSenderId: "111879008973",
    appId: "1:111879008973:web:..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
