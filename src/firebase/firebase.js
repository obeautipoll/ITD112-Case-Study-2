import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 



const firebaseConfig = {
  apiKey: "AIzaSyAVG8DP88dPPkSyJ_p4cN9iLuZoO_JF6MU",
  authDomain: "itd112emigrants.firebaseapp.com",
  projectId: "itd112emigrants",
  storageBucket: "itd112emigrants.firebasestorage.app",
  messagingSenderId: "765210496811",
  appId: "1:765210496811:web:473accd94b43b2fa2e7f6e"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db , storage};

