import { db } from "../firebase/firebase"; 
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";

// ✅ Function to fetch civil status records (ordered newest first)
export const fetchCivilStatusRecords = async () => {
  try {
    const q = query(collection(db, "civilStatus"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    return records;
  } catch (e) {
    console.error("Error fetching records:", e);
    throw new Error("Error fetching records");
  }
};

// ✅ Function to add a new record for civil status (with createdAt timestamp)
export const addCivilStatusRecord = async (formData) => {
  try {
    // Add createdAt timestamp for proper sorting
    const newRecord = { ...formData, createdAt: new Date() };
    const docRef = await addDoc(collection(db, "civilStatus"), newRecord);
    console.log("Document written with ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document:", e);
    throw new Error("Error adding record");
  }
};

// ✅ Function to update a record for civil status
export const updateCivilStatusRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, "civilStatus", id);
    await updateDoc(docRef, updatedData);
    console.log("Document successfully updated!");
  } catch (e) {
    console.error("Error updating document:", e);
    throw new Error("Error updating record");
  }
};

// ✅ Function to delete a record for civil status
export const deleteCivilStatusRecord = async (id) => {
  try {
    const docRef = doc(db, "civilStatus", id);
    await deleteDoc(docRef);
    console.log("Document successfully deleted!");
  } catch (e) {
    console.error("Error deleting document:", e);
    throw new Error("Error deleting record");
  }
};
