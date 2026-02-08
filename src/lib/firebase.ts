import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from your original code
const firebaseConfig = {
  apiKey: "AIzaSyCxJsjO39UnnEBzJ_OrUb_kH2InwNRDTdU",
  authDomain: "ecomercee-28797.firebaseapp.com",
  projectId: "ecomercee-28797",
  storageBucket: "ecomercee-28797.appspot.com",
  messagingSenderId: "53572493438",
  appId: "1:53572493438:web:23608b2d75f81f7e70b82f",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
