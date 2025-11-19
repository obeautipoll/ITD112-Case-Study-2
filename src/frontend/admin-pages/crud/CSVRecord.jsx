import React, { useState } from "react";
import Papa from "papaparse"; // For CSV parsing
import { db } from "../../../firebase/firebase"; // Your Firestore setup
import { collection, addDoc } from "firebase/firestore"; // For adding documents to Firestore

const CSVRecord = ({ category, onClose }) => {
  const [csvFile, setCsvFile] = useState(null);  // To store uploaded CSV file
  const [csvData, setCsvData] = useState([]);    // To store parsed CSV data
  const [error, setError] = useState("");        // To store error messages

  const expectedColumns = {
    age: ["Age"],
    civilStatus: ["Year", "Single", "Married", "Widower", "Separated", "Divorced", "Not Reported"],
    // Add other categories and their expected columns here...
  };

  // Handle CSV file upload
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);  // Store the uploaded file

    Papa.parse(file, {
      complete: (result) => {
        setCsvData(result.data);  // Store parsed CSV data
        validateCSV(result.data); // Validate the CSV data
      },
      header: true,  // Assuming the CSV has headers
      skipEmptyLines: true,
    });
  };

  // Validate CSV columns against the expected columns for the selected category
  const validateCSV = (data) => {
    const columns = Object.keys(data[0]);
    const requiredColumns = expectedColumns[category];

    // Check if columns match the expected ones
    if (!requiredColumns.every((col) => columns.includes(col))) {
      setError(`CSV columns do not match the expected columns for ${category}.`);
      return false;
    }

    setError(""); // Clear error if columns match
    saveCSVDataToFirestore(data); // Save data to Firestore if valid
    return true;
  };

  // Save the CSV data to Firestore
  const saveCSVDataToFirestore = async (data) => {
    try {
      const collectionRef = collection(db, category); // Use the selected category's collection
      for (const row of data) {
        await addDoc(collectionRef, row);  // Add each row of data to Firestore
      }
      alert("CSV data saved successfully!");
      setCsvFile(null);  // Reset the file input after successful save
      setCsvData([]);    // Clear the CSV data
      onClose();         // Close the modal or form
    } catch (error) {
      console.error("Error saving CSV data:", error);
      alert("Error saving data to the database.");
    }
  };

  // Handle file cancellation
  const handleCancelFile = () => {
    setCsvFile(null);
    setCsvData([]);
    setError("");  // Reset error message
  };

  return (
    <div className="csv-record-popup">
      <div className="popup-content">
        <h3>Upload CSV for {category}</h3>

        <div className="filter-group">
          <label>Upload CSV here: </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
          />
          {csvFile && (
            <button onClick={handleCancelFile} className="btn-cancel-file">
              X Cancel
            </button>
          )}
        </div>

        {/* Error message if CSV validation fails */}
        {error && <p className="error-message">{error}</p>}

        {/* View CSV Data Button */}
        {csvData.length > 0 && (
          <div>
            <button onClick={() => console.log(csvData)} className="btn-view-csv">
              View CSV Data
            </button>
          </div>
        )}

        {/* Save CSV Data to Firestore */}
        {csvData.length > 0 && (
          <div>
            <button onClick={() => saveCSVDataToFirestore(csvData)} className="btn-save-csv">
              Save to Database
            </button>
          </div>
        )}

        {/* Close Button */}
        <button onClick={onClose} className="btn-close">
          Close
        </button>
      </div>
    </div>
  );
};

export default CSVRecord;
