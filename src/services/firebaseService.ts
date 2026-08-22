import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only if API key is provided
let db: any = null;

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export const saveFeedbackToFirestore = async (feedbackText: string) => {
  if (!db) {
    console.warn("Firebase is not configured. Feedback will not be saved. Please update firebaseConfig.");
    return false; // Simulate success for UI if not configured, or return false to show warning
  }

  try {
    await addDoc(collection(db, "feedback"), {
      message: feedbackText,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};
