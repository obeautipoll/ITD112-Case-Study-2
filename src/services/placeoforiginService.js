import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";

// Function to fetch placeOfOrigin records
export const fetchPlaceOfOriginRecords = async () => {
  try {
    // Order by createdAt descending (newest first)
    const q = query(collection(db, "placeOfOrigin"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    return records;
  } catch (e) {
    console.error("Error fetching Place of Origin records: ", e);
    throw new Error("Error fetching records");
  }
};

// Function to add a new record for placeOfOrigin
export const addPlaceOfOriginRecord = async (formData) => {
  try {
    const newRecord = {
      region: formData.region || "",
      province: formData.province || "",
      municipality: formData.municipality || "",
      year: Number(formData.year),
      count: Number(formData.count),
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, "placeOfOrigin"), newRecord);
    console.log("Document written with ID: ", docRef.id);

    return docRef.id;
  } catch (e) {
    console.error("Error adding Place of Origin record: ", e);
    throw new Error("Error adding record");
  }
};

// Function to update a record for placeOfOrigin
export const updatePlaceOfOriginRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, "placeOfOrigin", id);
    await updateDoc(docRef, updatedData);
    console.log("Document successfully updated!");
  } catch (e) {
    console.error("Error updating document: ", e);
    throw new Error("Error updating record");
  }
};

// Function to delete a record for placeOfOrigin
export const deletePlaceOfOriginRecord = async (id) => {
  try {
    const docRef = doc(db, "placeOfOrigin", id);
    await deleteDoc(docRef);
    console.log("Document successfully deleted!");
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw new Error("Error deleting record");
  }
};
