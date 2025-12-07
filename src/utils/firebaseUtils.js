// firebaseUtils.js

import { writeBatch, collection, getDocs, doc } from 'firebase/firestore';
import { db } from "../firebase/firebase"; // Ensure that you have initialized Firebase correctly in your firebase.js

const REGION_METADATA = [
  { code: "Region I", name: "Ilocos Region" },
  { code: "Region II", name: "Cagayan Valley" },
  { code: "Region III", name: "Central Luzon" },
  { code: "Region IV-A", name: "CALABARZON" },
  { code: "Region IV-B", name: "MIMAROPA" },
  { code: "Region V", name: "Bicol Region" },
  { code: "Region VI", name: "Western Visayas" },
  { code: "Region VII", name: "Central Visayas" },
  { code: "Region VIII", name: "Eastern Visayas" },
  { code: "Region IX", name: "Zamboanga Peninsula" },
  { code: "Region X", name: "Northern Mindanao" },
  { code: "Region XI", name: "Davao Region" },
  { code: "Region XII", name: "SOCCSKSARGEN" },
  { code: "Region XIII", name: "Caraga" },
  { code: "NCR", name: "National Capital Region" },
  { code: "CAR", name: "Cordillera Administrative Region" },
  { code: "BARMM", name: "Bangsamoro Autonomous Region in Muslim Mindanao" },
  { code: "ARMM", name: "Autonomous Region in Muslim Mindanao" },
];

const canonicalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const REGION_BY_CODE = REGION_METADATA.reduce((acc, region) => {
  acc[canonicalize(region.code)] = region;
  return acc;
}, {});

const REGION_BY_NAME = REGION_METADATA.reduce((acc, region) => {
  acc[canonicalize(region.name)] = region;
  return acc;
}, {});

const cleanPart = (value = "") => value.replace(/\s+/g, " ").trim();

const formatMapping = (region) => `${region.name} (${region.code})`;

const findRegionMetadata = (namePart = "", codePart = "") => {
  const codeMatch = REGION_BY_CODE[canonicalize(codePart)];
  if (codeMatch) return codeMatch;
  const nameMatch = REGION_BY_NAME[canonicalize(namePart)];
  return nameMatch || null;
};

const forceRegionNameFirstFormat = (regionName = "") => {
  const trimmed = cleanPart(regionName);
  if (!trimmed) return trimmed;

  const ensureMappingFormat = (namePart, codePart) => {
    const metadata = findRegionMetadata(namePart, codePart);
    if (metadata) return formatMapping(metadata);
    return `${cleanPart(namePart)} (${cleanPart(codePart)})`;
  };

  const desiredRegex = /^(.+)\s*\((Region\s[\w\s-]+|NCR|CAR|BARMM|ARMM)\)$/i;
  const desiredMatch = trimmed.match(desiredRegex);
  if (desiredMatch) {
    const [, namePart, codePart] = desiredMatch;
    return ensureMappingFormat(namePart, codePart);
  }

  const flippedRegex = /^(Region\s[\w\s-]+|NCR|CAR|BARMM|ARMM)\s*\((.+)\)$/i;
  const flippedMatch = trimmed.match(flippedRegex);
  if (flippedMatch) {
    const [, codePart, namePart] = flippedMatch;
    return ensureMappingFormat(namePart, codePart);
  }

  const hyphenRegex = /^(Region\s[\w\s-]+|NCR|CAR|BARMM|ARMM)\s*[-:–]\s*(.+)$/i;
  const hyphenMatch = trimmed.match(hyphenRegex);
  if (hyphenMatch) {
    const [, codePart, namePart] = hyphenMatch;
    return ensureMappingFormat(namePart, codePart);
  }

  const codeOnly = REGION_BY_CODE[canonicalize(trimmed)];
  if (codeOnly) return formatMapping(codeOnly);

  const nameOnly = REGION_BY_NAME[canonicalize(trimmed)];
  if (nameOnly) return formatMapping(nameOnly);

  return trimmed;
};

// Normalize and format region names so that the readable name comes first
const normalizeRegionName = (regionName) => forceRegionNameFirstFormat(regionName);

// Function to update the region field in Firestore using batch update
export const updateFirestoreRegionFieldBatch = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "placeOfOrigin"));
    const batch = writeBatch(db);
    let updatedCount = 0;

    querySnapshot.forEach((document) => {
      const data = document.data() || {};
      const region = data.region;

      if (region) {
        const formattedRegion = normalizeRegionName(region);

        if (formattedRegion && formattedRegion !== region) {
          const docRef = doc(db, "placeOfOrigin", document.id);
          batch.update(docRef, { region: formattedRegion });
          updatedCount += 1;
        }
      }
    });

    if (updatedCount === 0) {
      console.log("No region fields required updates.");
      return { updated: 0, scanned: querySnapshot.size };
    }

    await batch.commit();
    console.log(`Batch update complete. Updated ${updatedCount} documents.`);
    return { updated: updatedCount, scanned: querySnapshot.size };
  } catch (error) {
    console.error("Error updating Firestore documents:", error);
    throw error;
  }
};

// You can trigger this function in your React components or anywhere where necessary
