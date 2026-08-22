import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, Firestore } from "firebase/firestore";

// Read Firebase configuration from environment variables with safe fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

let db: Firestore | null = null;

// Initialize Firebase only when a real non-placeholder API key is configured
const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  !firebaseConfig.apiKey.includes("YOUR_");

if (isConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (err) {
    console.warn("Firebase initialization skipped:", err);
  }
}

export const saveFeedbackToFirestore = async (feedbackText: string): Promise<boolean> => {
  if (!db) {
    // Offline / Local cache fallback for unconfigured instances
    try {
      const localFeedback = JSON.parse(localStorage.getItem('pocketcode_offline_feedback') || '[]');
      localFeedback.push({ message: feedbackText, timestamp: Date.now() });
      localStorage.setItem('pocketcode_offline_feedback', JSON.stringify(localFeedback.slice(-50)));
    } catch (e) {}
    return true;
  }

  try {
    await addDoc(collection(db, "feedback"), {
      message: feedbackText,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.warn("Error saving feedback to Firestore:", error);
    return false;
  }
};
