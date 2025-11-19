import { auth } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  updatePassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; // Firestore imports
import { deleteUser } from "firebase/auth";


// Function to create a new user with email/password
export const doCreateUserWithEmailAndPassword = async (email, password, firstName, lastName, role = "public") => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document with firstName and lastName
      await setDoc(userDocRef, {
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: role,
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Function to sign in a user with email/password
export const doSignInWithEmailAndPassword = async (email, password) => {
  try {
    // Sign in the user with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user; // Get the user object from the credential

    // Firestore instance
    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);  // Get the user document reference
    const userDoc = await getDoc(userDocRef);  // Check if user exists in Firestore

    if (userDoc.exists()) {
      // If user exists, return the user data along with their role
      const userData = userDoc.data();
      return { ...user, role: userData.role }; // Add the role to the user object
    } else {
      throw new Error('User not found in the database');
    }
  } catch (error) {
    console.error("Error signing in:", error);
    throw error; // Propagate the error to be handled by the caller
  }
};

// Function to sign in a user using Google Authentication
export const doSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Firestore instance
  const db = getFirestore();

  try {
    // Check if the user is already in the 'users' collection
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // If the user doesn't already exist, create a new user document with the default role 'student'
      await setDoc(userDocRef, {
        email: user.email,
        role: "public",  // Default role
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error) {
    console.error("Error adding user to Firestore:", error);
    throw error;  // Propagate the error to be handled by the caller
  }
};

// Function to sign out the current user
export const doSignOut = () => {
  return auth.signOut();
};

// Function to send password reset email
export const doPasswordReset = (email) => {
  return sendPasswordResetEmail(auth, email);
};

// Function to change the password of the current user
export const doPasswordChange = (password) => {
  return updatePassword(auth.currentUser, password);
};

// Function to send email verification to the current user
export const doSendEmailVerification = () => {
  return sendEmailVerification(auth.currentUser, {
    url: `${window.location.origin}/dashboard`,
  });
};

// Delete a user completely (Firestore + Auth)
export const deleteUserAccount = async (uid) => {
  try {
    const db = getFirestore();

    // 1️⃣ Delete user document in Firestore
    await deleteDoc(doc(db, "users", uid));
    console.log(`Deleted Firestore user doc: ${uid}`);

    // 2️⃣ Delete user from Firebase Auth
    // Note: Firebase Auth deleteUser requires the current signed-in user
    // If you want admins to delete other users, you need Firebase Admin SDK (server-side)
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await deleteUser(currentUser);
      console.log(`Deleted Auth user: ${uid}`);
    } else {
      console.warn(
        "Cannot delete Auth user from client side unless it's the currently signed-in user. Use Firebase Admin SDK for other users."
      );
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};