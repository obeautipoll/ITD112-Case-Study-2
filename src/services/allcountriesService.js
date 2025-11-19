// services/allCountriesService.js
import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";

// ✅ Fetch all country records
export const fetchAllCountriesRecords = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "allCountries"));
    const records = [];
    querySnapshot.forEach((docSnap) => {
      records.push({ id: docSnap.id, ...docSnap.data() });
    });
    return records;
  } catch (e) {
    console.error("Error fetching all countries records:", e);
    throw new Error("Error fetching records");
  }
};

// ✅ Add a new country record
export const addAllcountryRecord = async (formData) => {
  try {
    const docRef = await addDoc(collection(db, "allCountries"), {
      ...formData,
      createdAt: new Date(),
    });
    console.log("AllCountries record added successfully!");
    return docRef.id;
  } catch (e) {
    console.error("Error adding AllCountries record:", e);
    throw new Error("Error adding record");
  }
};

// ✅ Update an existing country record
export const updateAllCountryRecord = async (id, updatedData) => {
  try {
    const docRef = doc(db, "allCountries", id);
    await updateDoc(docRef, updatedData);
    console.log("AllCountries record successfully updated!");
  } catch (e) {
    console.error("Error updating AllCountries record:", e);
    throw new Error("Error updating record");
  }
};

// ✅ Delete a country record
export const deleteAllCountryRecord = async (id) => {
  try {
    const docRef = doc(db, "allCountries", id);
    await deleteDoc(docRef);
    console.log("AllCountries record successfully deleted!");
  } catch (e) {
    console.error("Error deleting AllCountries record:", e);
    throw new Error("Error deleting record");
  }
};


export const getMajorCountryData = async (topN = 5) => {
  try {
    const records = await fetchAllCountriesRecords();

    if (!records.length) return [];

    // Aggregate counts per country
    const countryMap = {};
    records.forEach(r => {
      const country = r.country;
      const count = Number(r.count) || 0;
      if (!country) return;
      if (!countryMap[country]) countryMap[country] = 0;
      countryMap[country] += count;
    });

    // Convert to array, sort, take Top N
    const topCountries = Object.entries(countryMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    // Optional: compute Others
    const othersCount = Object.values(countryMap).reduce((sum, c) => sum + c, 0)
      - topCountries.reduce((sum, c) => sum + c.count, 0);

    if (othersCount > 0) topCountries.push({ country: "Others", count: othersCount });

    return topCountries;

  } catch (e) {
    console.error("Error computing major countries:", e);
    return [];
  }
};