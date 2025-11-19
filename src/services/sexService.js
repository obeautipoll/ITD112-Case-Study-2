// sexService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy } from "firebase/firestore";

// 🔹 Add new record to 'sex' collection
export const addSexRecord = async (record) => {
  try {
    const newRecord = { ...record, createdAt: new Date() }; // add timestamp
    const docRef = await addDoc(collection(db, "sex"), newRecord);
    console.log("✅ New sex record added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error adding sex record:", error);
    throw error;
  }
};
export const fetchSexRecords = async () => {
  try {
    const q = query(collection(db, "sex"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const records = [];
    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    return records;
  } catch (error) {
    console.error("❌ Error fetching sex records:", error);
    throw error;
  }
};

// 🔹 Aggregate counts for same sex and year (update if exists, else add new)
export const aggregateSexGroupData = async (sex, year, count) => {
  try {
    const q = query(
      collection(db, "sex"),
      where("sex", "==", sex),
      where("year", "==", year)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // ✅ Update existing record
      const docRef = doc(db, "sex", snapshot.docs[0].id);
      const existingCount = snapshot.docs[0].data().count || 0;
      await updateDoc(docRef, { count: existingCount + count });
      console.log("🔁 Updated existing sex record");
    } else {
      // ✅ Add new record (with createdAt)
      await addDoc(collection(db, "sex"), { sex, year, count, createdAt: new Date() });
      console.log("🆕 Added new sex record");
    }
  } catch (error) {
    console.error("❌ Error aggregating sex data:", error);
    throw error;
  }
};
