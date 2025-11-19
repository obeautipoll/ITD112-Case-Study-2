import { db } from "../firebase/firebase"; 
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query } from "firebase/firestore"; // Corrected import


// Function to fetch records dynamically based on category
export const fetchCategoryRecords = async (category) => {
  try {
    const q = query(collection(db, category)); // Use category to get the collection dynamically
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (e) {
    console.error("Error fetching records: ", e);
    throw new Error("Error fetching records");
  }
};

// Function to add a new record dynamically based on category
export const addCategoryRecord = async (category, formData) => {
  try {
    const docRef = await addDoc(collection(db, category), formData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id; // Return the document ID if needed
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error("Error adding record");
  }
};

// Function to update a record dynamically based on category
export const updateCategoryRecord = async (category, id, updatedData) => {
  try {
    const docRef = doc(db, category, id);
    await updateDoc(docRef, updatedData);
    console.log("Document successfully updated!");
  } catch (e) {
    console.error("Error updating document: ", e);
    throw new Error("Error updating record");
  }
};

// Function to delete a record dynamically based on category
export const deleteCategoryRecord = async (category, id) => {
  try {
    const docRef = doc(db, category, id);
    await deleteDoc(docRef);
    console.log("Document successfully deleted!");
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw new Error("Error deleting record");
  }
};
