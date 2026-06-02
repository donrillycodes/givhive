import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

// Firebase client-side configuration
// These are PUBLIC keys — safe to expose in the browser
// They identify your Firebase project but do not grant any access
// Access is controlled by Firebase Security Rules
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate app initialization in Next.js
// Next.js hot reloads can cause multiple initializations without this check
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string,
): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Create a new Firebase account. Used by the invitation accept flow when
// the invitee doesn't already have a GivHive account — the backend invitation
// accept endpoint provisions the matching User row server-side.
export const createAccount = async (
  email: string,
  password: string,
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Sign out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Get current user's JWT token
// This is what we send to our backend API as the Bearer token
export const getToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

// Subscribe to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
