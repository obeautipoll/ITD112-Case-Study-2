  // services/realtimeDataService.js
  import { db } from "../firebase/firebase";
  import { collection, onSnapshot } from "firebase/firestore";

  /**
   * Subscribe to aggregated data for any category
   * @param {string} category - "age", "civilStatus", "sex", "allCountries", "majorCountry"
   * @param {function} callback - Receives aggregated data
   * @param {number} topN - Only used for majorCountry
   * @returns {function} unsubscribe
   */
  export const subscribeToAggregatedData = (category, callback, topN = 5, level) => {
    // For majorCountry, use allCountries as the source
    const collectionName = category === "majorCountry" ? "allCountries" :  category === "placeoforigin" ? "placeOfOrigin" : category;
    
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const rawRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let aggregatedData = [];

        if (category === "majorCountry") {
          // Aggregate total per country across all years
          const countryMap = {};
          rawRecords.forEach(({ country, count }) => {
            if (!country) return;
            countryMap[country] = (countryMap[country] || 0) + (Number(count) || 0);
          });

          // Convert to array, sort descending, take topN
          aggregatedData = Object.entries(countryMap)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);

          // Optional: add "Others"
          const othersCount =
            Object.values(countryMap).reduce((sum, c) => sum + c, 0) -
            aggregatedData.reduce((sum, c) => sum + c.count, 0);

          if (othersCount > 0) aggregatedData.push({ country: "Others", count: othersCount });
        }

        // Other categories (age, sex, civilStatus, allCountries)
        else if (category === "age") {
          const grouped = {};
          rawRecords.forEach(({ year, ageGroup, count }) => {
            if (!year || !ageGroup) return;
            const key = `${year}-${ageGroup}`;
            grouped[key] = grouped[key] || { year, ageGroup, count: 0 };
            grouped[key].count += Number(count) || 0;
          });
          aggregatedData = Object.values(grouped);
        } 
        else if (category === "civilStatus") {
          const grouped = {};
          rawRecords.forEach(({ year, single, married, widower, separated, divorced, notReported }) => {
            if (!year) return;
            grouped[year] = grouped[year] || { year, single: 0, married: 0, widower: 0, separated: 0, divorced: 0, notReported: 0 };
            grouped[year].single += Number(single) || 0;
            grouped[year].married += Number(married) || 0;
            grouped[year].widower += Number(widower) || 0;
            grouped[year].separated += Number(separated) || 0;
            grouped[year].divorced += Number(divorced) || 0;
            grouped[year].notReported += Number(notReported) || 0;
          });
          aggregatedData = Object.values(grouped);
        } 
        else if (category === "sex") {
          const grouped = {};
          rawRecords.forEach(({ year, sex, count }) => {
            if (!year || !sex) return;
            grouped[year] = grouped[year] || { year, male: 0, female: 0, total: 0 };
            if (sex.toLowerCase() === "male") grouped[year].male += Number(count) || 0;
            else if (sex.toLowerCase() === "female") grouped[year].female += Number(count) || 0;
            grouped[year].total = grouped[year].male + grouped[year].female;
          });
          aggregatedData = Object.values(grouped);
        } 
        else if (category === "allCountries") {
          const grouped = {};
          rawRecords.forEach(({ year, country, count }) => {
            if (!year || !country) return;
            const key = `${year}-${country}`;
            grouped[key] = grouped[key] || { year, country, count: 0 };
            grouped[key].count += Number(count) || 0;
          });
          aggregatedData = Object.values(grouped);
        }


          // 🧩 OCCUPATION CATEGORY (new)
        else if (category === "occupation") {
          const grouped = {};
          rawRecords.forEach(({ year, occupation, count }) => {
            if (!year || !occupation) return;
            const key = `${year}-${occupation}`;
            grouped[key] = grouped[key] || { year, occupation, count: 0 };
            grouped[key].count += Number(count) || 0;
          });
          aggregatedData = Object.values(grouped);
        }
          else if (category === "education") {
            const grouped = {};
            rawRecords.forEach(({ year, education, count }) => {
              if (!year || !education) return;
              const key = `${year}-${education}`;
              grouped[key] = grouped[key] || { year, education, count: 0 };
              grouped[key].count += Number(count) || 0;
            });
            aggregatedData = Object.values(grouped);
          }

          // ✅ Place of Origin
        else if (category === "placeoforigin") {
          const grouped = {};
          rawRecords.forEach(({ year, region, province, municipality, city, count }) => {
            if (!year) return;
            const muni = municipality || city || "";
            const key = `${year}|${region || ""}|${province || ""}|${muni}`;
            if (!grouped[key]) {
              grouped[key] = {
                year,
                region: region || "",
                province: province || "",
                municipality: muni,
                count: 0,
              };
            }
            grouped[key].count += Number(count) || 0;
          });

          aggregatedData = Object.values(grouped).map((item) => ({
            year: item.year,
            region: item.region,
            province: item.province,
            municipality: item.municipality,
            placeoforigin: `${item.region}-${item.province}-${item.municipality}`,
            count: item.count,
          }));
        }

        callback(aggregatedData);
      },
      (error) => console.error("Realtime data error:", error)
    );

    return unsubscribe;
  };
