import React from "react";
import SideBar from "../public-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { db } from "../../firebase/firebase";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { collection, getDocs } from "firebase/firestore";

const PublicSettings = () => {
  const handleExportAllCSV = async () => {
    try {
      const categories = [
        "age",
        "sex",
        "allCountries",
        "occupation",
        "civilStatus",
        "education",
        "placeOfOrigin",
      ];

      const zip = new JSZip();

      for (const category of categories) {
        const colRef = collection(db, category);
        const snapshot = await getDocs(colRef);
        const records = snapshot.docs.map((doc) => doc.data());

        if (records.length > 0) {
          const csv = Papa.unparse(records);
          zip.file(`${category}.csv`, csv);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "emigrants_data.zip");
      alert("All CSVs exported and zipped successfully!");
    } catch (error) {
      console.error("Error exporting CSVs:", error);
      alert("Failed to export CSVs. Check console for details.");
    }
  };

  return (
    <div className="container" style={{ minHeight: "100vh", display: "flex" }}>
      <SideBar />
      <div className="main-content" style={{ flex: 1 }}>
        <MainNavbar />

        <div
          className="settings-content"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 70px)",
            textAlign: "center",
            padding: "0 20px",
          }}
        >
          <h2 style={{ marginBottom: "20px" }}>DOWNLOAD ALL DATA</h2>
          <p style={{ marginBottom: "30px" }}>
            Click the button below to download all categories as CSV files in a ZIP.
          </p>
          <button
            onClick={handleExportAllCSV}
            style={{
              padding: "15px 40px",
              fontSize: "16px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicSettings;

