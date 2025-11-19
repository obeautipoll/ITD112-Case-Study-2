import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc , query, orderBy} from "firebase/firestore";

// Function to fetch age records
export const fetchAgeRecords = async () => {
  try {
    // Order by createdAt descending (newest first)
    const q = query(collection(db, "age"), orderBy("createdAt", "desc"));
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

// Function to add a new record for age
export const addAgeRecord = async (formData) => {
  try {
    // Add a timestamp so records can be ordered properly
    const newRecord = { ...formData, createdAt: new Date() };

    const docRef = await addDoc(collection(db, "age"), newRecord);
    console.log("Document written with ID: ", docRef.id);

    return docRef.id; // Return the document ID if needed
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error("Error adding record");
  }
};

// Function to update a record for age
export const updateAgeRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, "age", id);
    await updateDoc(docRef, updatedData);
    console.log("Document successfully updated!");
  } catch (e) {
    console.error("Error updating document: ", e);
    throw new Error("Error updating record");
  }
};

// Function to delete a record for age
export const deleteAgeRecord = async (id) => {
  try {
    const docRef = doc(db, "age", id);
    await deleteDoc(docRef);
    console.log("Document successfully deleted!");
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw new Error("Error deleting record");
  }
};
