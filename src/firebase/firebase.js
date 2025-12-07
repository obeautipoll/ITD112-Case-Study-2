import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 



const firebaseConfig = {
  apiKey: "AIzaSyDj66dumvj4ydMHz5FFYhBj53EEMMCdXtY",
  authDomain: "nisnisanfilipinoemigrantsdb.firebaseapp.com",
  projectId: "nisnisanfilipinoemigrantsdb",
  storageBucket: "nisnisanfilipinoemigrantsdb.firebasestorage.app",
  messagingSenderId: "678501248354",
  appId: "1:678501248354:web:817ebcab138b6ef502d03b"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db , storage};

