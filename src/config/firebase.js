// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
    apiKey: "AIzaSyCD-mvqF5tLbSSuXTds0rCekyDe4os4OOY",
    authDomain: "karatas-bora.firebaseapp.com",
    projectId: "karatas-bora",
    storageBucket: "karatas-bora.firebasestorage.app",
    messagingSenderId: "159808672944",
    appId: "1:159808672944:web:19abeee8bfbc92a8ca9775",
    measurementId: "G-678JXR6S0T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
