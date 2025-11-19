// occupationService.js
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";

const OCCUPATION_COLLECTION = "occupation"; // 👈 must match your Firestore collection name

// 📦 Fetch all occupation records
export const fetchOccupationRecords = async () => {
  try {
    const q = query(collection(db, OCCUPATION_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((docSnap) => {
      records.push({ id: docSnap.id, ...docSnap.data() });
    });

    return records;
  } catch (e) {
    console.error("❌ Error fetching occupation records: ", e);
    throw new Error("Error fetching occupation records");
  }
};

// ➕ Add new occupation record
export const addOccupationRecord = async (formData) => {
  try {
    // Add timestamp for proper sorting
    const newRecord = { ...formData, createdAt: new Date() };

    const docRef = await addDoc(collection(db, OCCUPATION_COLLECTION), newRecord);
    console.log("✅ Occupation record added with ID:", docRef.id);

    return docRef.id;
  } catch (e) {
    console.error("❌ Error adding occupation record: ", e);
    throw new Error("Error adding occupation record");
  }
};

// ✏️ Update existing occupation record
export const updateOccupationRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, OCCUPATION_COLLECTION, id);
    await updateDoc(docRef, updatedData);
    console.log("✅ Occupation record successfully updated!");
  } catch (e) {
    console.error("❌ Error updating occupation record: ", e);
    throw new Error("Error updating occupation record");
  }
};

// 🗑️ Delete occupation record
export const deleteOccupationRecord = async (id) => {
  try {
    const docRef = doc(db, OCCUPATION_COLLECTION, id);
    await deleteDoc(docRef);
    console.log("✅ Occupation record successfully deleted!");
  } catch (e) {
    console.error("❌ Error deleting occupation record: ", e);
    throw new Error("Error deleting occupation record");
  }
};
