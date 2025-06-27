import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  getDoc,
  DocumentData,
  DocumentReference,
  deleteField,
} from "firebase/firestore";
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  AuthCredential,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInAnonymously,
} from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { UserData } from "./src/features/user";
import { RoleData, ServerData } from "./src/features/servers";

// import { getAnalytics } from "firebase/analytics";

// Make sure these environment variables are set in your .env file or deployment platform
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_hz1uDLweZyF2vdH5_XIjH5AE3MheO80",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hhhmhvn.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hhhmhvn",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hhhmhvn.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "699200122926",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "699200122926:web:920be98a6cd547999f6fbf",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XBWRH9KKG7",
};

// ...rest of your code below is unchanged...

export async function createAccount(
  email: string,
  password: string,
  username: string
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Signed in

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: username,
      photoURL:
        "https://firebasestorage.googleapis.com/v0/b/banter-69832.appspot.com/o/assets%2FdefaultAvatar.svg?alt=media&token=2cd07b3e-6ee1-4682-8246-57bb20bc0d1f",
    });
    // Profile updated

    await setDoc(doc(db, "users", user.uid), {
      username: user.displayName,
      avatar: user.photoURL,
      tag: "0000", // Create function to generate unique tag for each username
      about: "",
      banner: "#7CC6FE",
      email: user.email,
      theme: "dark",
    });
    // Database updated

    await joinServer("ke6NqegIvJEOa9cLzUEp");
    // User joins global chat
  } catch (error) {
    console.error(error);
  }
}

// ...rest of your functions...

export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
const auth = getAuth();
const user = auth.currentUser;
export type User = typeof user;
// export const analytics = getAnalytics(app);
