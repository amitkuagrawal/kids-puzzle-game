import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
// Get these from Firebase Console: Project Settings > General > Your apps > Firebase SDK snippet
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
let app;
let db;
let auth;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  // Analytics is optional and may not work on all platforms
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.log('Analytics not available:', e);
    }
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { app, db, auth, analytics };
