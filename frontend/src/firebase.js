import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAEL55dVmEA9Z8kMAbDNzzVglLgYLAXhUc",
    authDomain: "gift-phase-5c187.firebaseapp.com",
    projectId: "gift-phase-5c187",
    storageBucket: "gift-phase-5c187.firebasestorage.app",
    messagingSenderId: "698212982048",
    appId: "1:698212982048:web:f875252014bbe1b207cb45",
    measurementId: "G-FG015D220J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
