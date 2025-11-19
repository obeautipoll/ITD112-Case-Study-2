import { db } from "../firebase/firebase"; 
import { collection, onSnapshot } from "firebase/firestore"; 

/**
 * Subscribe to place of origin data for a specific level.
 * @param {string} level - One of "region", "province", or "municipality".
 * @param {function} callback - Callback to receive the aggregated data.
 * @param {number} topN - Optional, to limit the number of records, default to 5.
 * @returns {function} unsubscribe - Function to unsubscribe from real-time updates.
 */
export const subscribeToPlaceOfOriginData = (level, callback, topN = 5) => {
  const collectionName = "placeOfOrigin";  // Fixed collection for placeOfOrigin

  const unsubscribe = onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const rawRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const grouped = {};

      // Aggregate data based on the provided level (region, province, municipality)
      rawRecords.forEach((rec) => {
        let key = null;

        if (level === "region" && rec.region) key = rec.region;
        else if (level === "province" && rec.province) key = rec.province;
        else if (level === "municipality" && rec.municipality) key = rec.municipality;

        if (!key) return;

        grouped[key] = (grouped[key] || 0) + (rec.count || 1);
      });

      // Convert the grouped data into an array of objects
      const aggregatedData = Object.entries(grouped).map(([place, count]) => ({ place, count }));

      // Sort and limit the number of results to topN if necessary
      if (topN > 0) {
        aggregatedData.sort((a, b) => b.count - a.count);
        aggregatedData.splice(topN);
      }

      callback(aggregatedData);  // Pass the aggregated data to the callback
    },
    (error) => console.error("Realtime data error:", error)
  );

  return unsubscribe;
};
