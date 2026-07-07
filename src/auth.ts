/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';

// Default Firebase Configuration (Embedded to allow Vercel build without JSON file)
const defaultFirebaseConfig = {
  projectId: "copper-yeti-d40ks",
  appId: "1:666417637093:web:8841ea96ba2d9a9da4d60c",
  apiKey: "AIzaSyBBsSXc9iGdFMC5sd3afRZIvr3UND8QjDE",
  authDomain: "copper-yeti-d40ks.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-f0f38be7-180f-4374-8e39-4d9a2f3cd749",
  storageBucket: "copper-yeti-d40ks.firebasestorage.app",
  messagingSenderId: "666417637093",
  measurementId: ""
};

// Check for overriding environment variables or single VITE_FIREBASE_CONFIG JSON string
let firebaseConfig: any = defaultFirebaseConfig;

try {
  const metaEnv = (import.meta as any).env || {};
  const envConfig = metaEnv.VITE_FIREBASE_CONFIG;
  if (envConfig) {
    firebaseConfig = JSON.parse(envConfig);
  } else {
    const envApiKey = metaEnv.VITE_FIREBASE_API_KEY;
    if (envApiKey) {
      firebaseConfig = {
        apiKey: envApiKey,
        authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
        projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
        storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
        messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
        appId: metaEnv.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
        measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
      };
    }
  }
} catch (e) {
  console.error('Failed to parse custom firebase config from environment:', e);
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// State flags and variables
let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('ds_steel_google_access_token') : null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Restore access token from localStorage if cached
      const token = cachedAccessToken || localStorage.getItem('ds_steel_google_access_token');
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        // Since Firebase token is cached in memory, if page reloaded,
        // we might have a user but no access token.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('ds_steel_google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('ds_steel_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('ds_steel_google_access_token');
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('ds_steel_google_access_token');
};
