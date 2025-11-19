import { db } from "../firebase/firebase"; 
import { collection, addDoc } from "firebase/firestore";
import Papa from "papaparse";

// Function to process CSV upload based on category
export const processCSVUpload = async (file, category) => {
  try {
    // Parse the CSV file
    const result = await parseCSV(file);
    
    // Check which category the CSV data belongs to and add to the correct collection
    switch (category) {
      case "civilStatus":
        await uploadCivilStatusData(result);
        break;
      case "age":
        await uploadAgeData(result);
        break;
      // Add more cases for other categories like sex, occupation, etc.
      default:
        throw new Error("Category not supported");
    }

  } catch (error) {
    console.error("Error processing CSV: ", error);
    throw new Error("Error processing CSV file");
  }
};

// Helper function to parse CSV
const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        resolve(result.data);
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        reject(error);
      }
    });
  });
};

// Function to upload civil status data to Firestore
const uploadCivilStatusData = async (data) => {
  try {
    const civilStatusColumns = ["Year", "Single", "Married", "Widower", "Separated", "Divorced", "Not Reported"];
    
    // Loop through the parsed CSV rows and format them for civil status
    for (let row of data) {
      const formattedData = {
        year: row[civilStatusColumns[0]],
        single: row[civilStatusColumns[1]],
        married: row[civilStatusColumns[2]],
        widower: row[civilStatusColumns[3]],
        separated: row[civilStatusColumns[4]],
        divorced: row[civilStatusColumns[5]],
        notReported: row[civilStatusColumns[6]]
      };
      
      // Add the formatted data to the "civilStatus" collection
      await addDoc(collection(db, "civilStatus"), formattedData);
    }
    
    console.log("Civil status data uploaded successfully!");
  } catch (error) {
    console.error("Error uploading civil status data: ", error);
    throw new Error("Error uploading civil status data");
  }
};

// Function to upload age data to Firestore (example)
const uploadAgeData = async (data) => {
  try {
    for (let row of data) {
      const formattedData = {
        age: row["Age"] // Assuming the CSV has a column named "Age"
      };
      
      // Add the formatted data to the "age" collection
      await addDoc(collection(db, "age"), formattedData);
    }
    
    console.log("Age data uploaded successfully!");
  } catch (error) {
    console.error("Error uploading age data: ", error);
    throw new Error("Error uploading age data");
  }
};

// Add more functions for other categories (e.g., sex, occupation, etc.)
