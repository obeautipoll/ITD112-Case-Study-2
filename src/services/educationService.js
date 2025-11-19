// services/educationService.js
import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";

// Function to fetch education records
export const fetchEducationRecords = async () => {
  try {
    // Order by createdAt descending (newest first)
    const q = query(collection(db, "education"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((docSnap) => {
      records.push({ id: docSnap.id, ...docSnap.data() });
    });

    return records;
  } catch (e) {
    console.error("Error fetching education records: ", e);
    throw new Error("Error fetching records");
  }
};

// Function to add a new education record
export const addEducationRecord = async (formData) => {
  try {
    const newRecord = { ...formData, createdAt: new Date() };

    const docRef = await addDoc(collection(db, "education"), newRecord);
    console.log("Education record added with ID: ", docRef.id);

    return docRef.id;
  } catch (e) {
    console.error("Error adding education record: ", e);
    throw new Error("Error adding record");
  }
};

// Function to update a record for education
export const updateEducationRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, "education", id);
    await updateDoc(docRef, updatedData);
    console.log("Education record successfully updated!");
  } catch (e) {
    console.error("Error updating education record: ", e);
    throw new Error("Error updating record");
  }
};

// Function to delete a record for education
export const deleteEducationRecord = async (id) => {
  try {
    const docRef = doc(db, "education", id);
    await deleteDoc(docRef);
    console.log("Education record successfully deleted!");
  } catch (e) {
    console.error("Error deleting education record: ", e);
    throw new Error("Error deleting record");
  }
};
