//Emigrants

// ✅ workingcsv (updated fully with Add/Edit/Delete working)

import React, { useState, useEffect } from "react";
import "../../styles-admin/monitor-admin.css";
import SideBar from "./components/SideBar";
import AdminNavbar from "./components/NavBar";
import { db } from "../../firebase/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import Papa from "papaparse"; // for CSV parsing
import regionsData from "../../data/regions.json";
import provincesData from "../../data/provinces.json";
import municipalitiesData from "../../data/municipalities.json";

//main
import AddRecord from "./crud/AddRecord";
import EditRecord from "./crud/EditRecord";
import DeleteRecord from "./crud/DeleteRecord";

//services
import { fetchCivilStatusRecords } from "../../services/civilstatusService";
import { fetchAgeRecords } from "../../services/ageService";
import { processCSVUpload } from "../../services/csvUploadService";

import "./table.css";

const normalizeLabel = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const provinceByCode = new Map(
  provincesData.map((province) => [province.province_code.padStart(4, "0"), province])
);

const regionNameByCode = new Map(
  regionsData.map((region) => [region.region_code.padStart(2, "0"), region.region_name])
);

const municipalitiesByName = new Map(
  municipalitiesData.map((municipality) => {
    const province = provinceByCode.get(municipality.province_code);
    const provinceName = province?.province_name || "Unknown Province";
    const regionCode =
      province?.region_code || municipality.region_desc || "";
    const regionName =
      regionNameByCode.get(regionCode.toString().padStart(2, "0")) || "Unknown Region";

    return [
      normalizeLabel(municipality.municipality_name),
      {
        municipalityName: municipality.municipality_name,
        provinceName,
        regionName,
      },
    ];
  })
);

const parseCount = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = value.toString().replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizePlaceOfOriginRow = (csvRecord = {}) => {
  const municipalityRaw =
    csvRecord["CITY / MUNICIPALITY"] ||
    csvRecord["City / Municipality"] ||
    csvRecord["Municipality"] ||
    "";
  const municipalityName = municipalityRaw.split(",")[0].trim();
  const normalizedName = normalizeLabel(municipalityName);
  if (!normalizedName) {
    return [];
  }

  const municipalityMeta = municipalitiesByName.get(normalizedName);
  if (!municipalityMeta) {
    console.warn(
      `[PlaceOfOrigin CSV] Municipality "${municipalityName}" not found in reference data.`,
      csvRecord
    );
    return [];
  }

  const yearKeys = Object.keys(csvRecord).filter((key) => /^\d{4}$/.test(key.trim()));
  if (!yearKeys.length) {
    return [];
  }

  return yearKeys
    .map((yearKey) => {
      const count = parseCount(csvRecord[yearKey]);
      if (count === null) return null;

      return {
        region: municipalityMeta.regionName,
        province: municipalityMeta.provinceName,
        municipality: municipalityMeta.municipalityName,
        year: Number.parseInt(yearKey.trim(), 10),
        count,
      };
    })
    .filter(Boolean);
};


const AdminEmigrants = () => {
  const [emigrants, setEmigrants] = useState([]);
  const [filteredEmigrants, setFilteredEmigrants] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showModal, setShowModal] = useState(false);
  const [showActions, setShowActions] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
const recordsPerPage = 10;

  // add
  const [showAddRecord, setShowAddRecord] = useState(false);

  // main data
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // edit & delete
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [showDeleteRecord, setShowDeleteRecord] = useState(false);

  // CSV
  const [csvData, setCsvData] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [isCSVPreview, setIsCSVPreview] = useState(false);

const [selectedIds, setSelectedIds] = useState([]);
const [selectAll, setSelectAll] = useState(false);

  const handleShowAddRecord = () => setShowAddRecord(true);
const handleCloseAddRecord = () => setShowAddRecord(false);
  // Filters
  const [filters, setFilters] = useState({
    category: "age",
    status: [],
    search: "",
  });

  // 🔥 Fetch from Firestore
 useEffect(() => {
  const collectionName = getCollectionName(filters.category);
  let q;

  try {
    q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
  } catch (error) {
    console.warn("⚠️ Missing createdAt field — using unsorted query");
    q = collection(db, collectionName);
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const updatedRecords = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecords(updatedRecords);
      setFilteredRecords(updatedRecords);
    },
    (error) => console.error("Error fetching records:", error)
  );

  return () => unsubscribe();
}, [filters.category]); // Listen for changes based on selected category

  // 🔎 Filter logic
  useEffect(() => {
    let filtered = records;
    if (filters.search) {
      filtered = filtered.filter((record) =>
        Object.values(record).some((value) =>
          value.toString().toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    }
    setFilteredRecords(filtered);  // Update filtered records when search changes
  }, [filters.search, records]);


const getCollectionName = (category) => {
  const mapping = {
    age: "age",
    civilStatus: "civilStatus",
    sex: "sex",
    allCountries: "allCountries",
    occupation: "occupation",
    education: "education",
    placeOfOrigin: "placeOfOrigin",
  };
  return mapping[category] || category;
};
const normalizeCSVData = (csvRecord, category) => {
  console.log("normalizeCSVData category:", category); // Log the category to ensure it's correct

  if (category === "placeOfOrigin") {
    return normalizePlaceOfOriginRow(csvRecord);
  }

  // If the category is 'age', handle the age group and year count data
   if (category === "age") {
    const ageGroup = csvRecord["AGE_GROUP"]; // Extract Age Group (e.g., "14 - Below")
    
    // For the age category, every column after the first one is a year
    const years = Object.keys(csvRecord).filter(key => key !== "AGE_GROUP"); // Get all columns except the 'AGE_GROUP' column
    
    // Normalize the CSV data for each year
    return years.map((year) => ({
      ageGroup: ageGroup, // Age group (e.g., "14 - Below")
      year: parseInt(year), // Year (e.g., 1981, 1982, etc.)
      count: parseInt(csvRecord[year]) || 0, // Count of people in that age group for the given year
    }));
  } 
  // If the category is 'civilStatus', normalize the civil status data
  else if (category === "civilStatus") {
    return {
      year: parseInt(csvRecord["Year"]), // Year (e.g., 1981)
      single: parseInt(csvRecord["Single"]) || 0,
      married: parseInt(csvRecord["Married"]) || 0,
      widower: parseInt(csvRecord["Widower"]) || 0,
      separated: parseInt(csvRecord["Separated"]) || 0,
      divorced: parseInt(csvRecord["Divorced"]) || 0,
      notReported: parseInt(csvRecord["Not Reported"]) || 0, // Handle "Not Reported" properly
    };
  }
     else if (category === "sex") {
    const year = parseInt(csvRecord["YEAR"]);
    const maleCount = parseInt(csvRecord["MALE"]) || 0;
    const femaleCount = parseInt(csvRecord["FEMALE"]) || 0;

    // Return both as separate documents
    return [
      { year, sex: "Male", count: maleCount },
      { year, sex: "Female", count: femaleCount },
    ];
  } 
    else if (category === "allCountries") {
    const country = csvRecord["COUNTRY"]; // first column name
    const years = Object.keys(csvRecord).filter((key) => key !== "COUNTRY");

    // Create an array of {country, year, count}
    return years.map((year) => ({
      country: country,
      year: parseInt(year),
      count: parseInt(csvRecord[year]) || 0,
    }));
  }

  // 🧩 OCCUPATION CATEGORY
  else if (category === "occupation") {
    const occupationKey = Object.keys(csvRecord).find(
      (k) => k.toLowerCase() === "occupation"
    );
    const occupation = csvRecord[occupationKey];
    const years = Object.keys(csvRecord).filter(
      (key) => key.toLowerCase() !== "occupation"
    );

    return years.map((year) => ({
      occupation,
      year: parseInt(year),
      count: parseInt(csvRecord[year]) || 0,
    }));
  }

   else if (category === "education") {
  // Find the correct education key (handles variations like "Education" or "EDUCATIONAL ATTAINMENT")
  const educationKey = Object.keys(csvRecord).find(
    (key) => key.toLowerCase().includes("educational")
  );

  const education = csvRecord[educationKey]; // e.g., "Not of Schooling Age"

  // Get all year columns (everything except the education column)
  const years = Object.keys(csvRecord).filter(
    (key) => key.toLowerCase() !== educationKey.toLowerCase()
  );

  // Normalize each year into a separate Firestore document
  return years.map((year) => ({
    education: education,              // e.g., "Not of Schooling Age"
    year: parseInt(year),              // e.g., 1988
    count: parseInt(csvRecord[year]) || 0,  // e.g., 5514
  }));
}

  else {
    console.warn("Unknown category:", category, csvRecord);
    return [];
  }
};

  // ✅ CSV Upload logic
const cleanCSVData = (data) =>
  data.filter((row) =>
    row && Object.values(row).some((value) => value !== "" && value !== null)
  );

const handleCSVUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    complete: (result) => {
      console.log("Parsed CSV result:", result);
      if (!result.data || result.data.length === 0) {
        alert("Empty CSV file");
        return;
      }

      const cleanedData = cleanCSVData(result.data);
      if (!Array.isArray(cleanedData)) {
        console.error("CSV data is not in expected array format.");
        return;
      }

      const normalizedData = cleanedData.flatMap((record) =>
        normalizeCSVData(record, filters.category)
      );

      if (!normalizedData.length) {
        alert("No valid rows found in CSV.");
        return;
      }

      setCsvData(normalizedData);
      setFilteredRecords(normalizedData);
      setIsCSVPreview(true);
      setPopupMessage("?o. CSV loaded successfully!");
      setTimeout(() => setPopupMessage(""), 2000);
    },
    header: true,
    skipEmptyLines: true,
  });
};

  const handleSaveToDatabase = async () => {
  try {
    const collectionName = getCollectionName(filters.category);

    // ✅ Add timestamp to each row
    for (const row of csvData) {
      const newRow = { ...row, createdAt: new Date() };
      await addDoc(collection(db, collectionName), newRow);
    }

    // ✅ Success message
    setPopupMessage("✅ Records saved successfully!");

    // ✅ Reset preview and CSV data
    setIsCSVPreview(false);
    setCsvData([]);
    setShowSaveModal(false);

    // ✅ Clear file input field
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";

    // ✅ Hide popup after a short delay
    setTimeout(() => setPopupMessage(""), 2000);
  } catch (error) {
    console.error("Error saving to database: ", error);
    setPopupMessage("❌ Error saving to database!");
    setTimeout(() => setPopupMessage(""), 2000);
  }
};

  const handleDone = () => {
    setIsCSVPreview(false);
    setCsvData([]);
    setFilteredRecords(records);
    setShowSaveModal(false);
    setPopupMessage("✅ Done viewing!");
    setTimeout(() => setPopupMessage(""), 1500);
    setShowActions(true);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  // ✅ CRUD handlers
 const handleAddRecord = async (formData) => {
  try {
    const collectionName = getCollectionName(filters.category);
    const docRef = await addDoc(collection(db, collectionName), formData);
    const newRecord = { ...formData, createdAt: new Date() }; 
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    setFilteredRecords(updatedRecords);

    setShowAddRecord(false);
    setPopupMessage("✅ Record added successfully!");
    setTimeout(() => setPopupMessage(""), 2000);
  } catch (error) {
    console.error("Error adding record: ", error);
  }
};

  const handleEditRecord = async (updatedData) => {
  if (!selectedRecord?.id) return;
  try {
    const collectionName = getCollectionName(filters.category);
    const docRef = doc(db, collectionName, selectedRecord.id);
    await updateDoc(docRef, updatedData);

    const updatedList = records.map((r) =>
      r.id === selectedRecord.id ? { ...r, ...updatedData } : r
    );

    // Move the updated record to the top
    const updatedListWithFirstRow = updatedList.filter((r) => r.id !== selectedRecord.id);
    const updatedRecord = { ...selectedRecord, ...updatedData };
    setRecords([updatedRecord, ...updatedListWithFirstRow]);
    setFilteredRecords([updatedRecord, ...updatedListWithFirstRow]);

    setShowEditRecord(false);
    setSelectedRecord(null);
    setPopupMessage("✅ Record updated successfully!");
    setTimeout(() => setPopupMessage(""), 2000);
  } catch (error) {
    console.error("Error updating record: ", error);
  }
};

  const handleDeleteRecord = async () => {
  if (!selectedRecord?.id) return;
  try {
    const collectionName = getCollectionName(filters.category);
    const docRef = doc(db, collectionName, selectedRecord.id);
    await deleteDoc(docRef);

    const updatedList = records.filter((r) => r.id !== selectedRecord.id);
    setRecords(updatedList);
    setFilteredRecords(updatedList);
    setShowDeleteRecord(false);
    setSelectedRecord(null);
    setPopupMessage("🗑️ Record deleted successfully!");
    setTimeout(() => setPopupMessage(""), 2000);
  } catch (error) {
    console.error("Error deleting record: ", error);
  }
};

  // 🧩 Column and label mapping
  const getCategoryColumns = () => {
    const category = filters.category;
    const columns = {
      age: ["Age Group", "Year", "Count"],
      sex: ["Sex", "Year" , "Count"],
      allCountries:["Country", "Year", "Count"],
      occupation: ["Occupation","Year", "Count"],
      civilStatus: [
        "Year",
        "Single",
        "Married",
        "Widower",
        "Separated",
        "Divorced",
        "Not Reported",
      ],
      education: ["Education", "Year" , "Count"],
      placeOfOrigin: ["Region", "Province", "Municipality", "Year", "Count"],
    };
    return columns[category] || ["Unknown"];
  };

  // 🧩 Render table
 const renderTable = () => {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };



  
  return (
    <div>
      <table className="emigrants-table">
        <thead>
          <tr>
            {filters.category === "age" ? (
              <>
                <th>Age Group</th>
                <th>Year</th>
                <th>Count</th>
              </>
            ) : (
              getCategoryColumns().map((col, index) => <th key={index}>{col}</th>)
            )}
            {showActions && !isCSVPreview && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {currentRecords.length === 0 ? (
            <tr>
              <td colSpan="8" className="no-data">
                No records found
              </td>
            </tr>
          ) : (
            currentRecords.map((c, index) => (
              <tr key={index}>
               {filters.category === "age" ? (
              <>
                <td>{c.ageGroup || "—"}</td>
                <td>{c.year || "—"}</td>
                <td>{c.count || "—"}</td>
              </>
            ) : filters.category === "sex" ? (
              <>
                <td>{c.sex || "—"}</td>
                <td>{c.year || "—"}</td>
                <td>{c.count || "—"}</td>
              </>
              ) : filters.category === "allCountries" ? ( 
              <>
                <td>{c.country || "—"}</td> 
                <td>{c.year || "—"}</td>
                <td>{c.count || "—"}</td>
              </>
            ) : filters.category === "civilStatus" ? (
              <>
                <td>{c.year || "—"}</td>
                <td>{c.single || "—"}</td>
                <td>{c.married || "—"}</td>
                <td>{c.widower || "—"}</td>
                <td>{c.separated || "—"}</td>
                <td>{c.divorced || "—"}</td>
                <td>{c.notReported || "—"}</td>
              </>

              ) : filters.category === "occupation" ? (
              <>
                <td>{c.occupation || "—"}</td>
                <td>{c.year || "—"}</td>
                <td>{c.count || "—"}</td>
              </>
               ) : filters.category === "education" ? (
                <>
                 <td>{c.education || "—"}</td>
                      <td>{c.year || "—"}</td>
                      <td>{c.count || "—"}</td>
                
                </>
                ) : filters.category === "placeOfOrigin" ? (
              <>
                <td>{c.region || "—"}</td>
                <td>{c.province || "—"}</td>
                <td>{c.municipality || "—"}</td>
                <td>{c.year || "—"}</td>
                <td>{c.count || "—"}</td>
              </>
            ) : (
              
              <td colSpan="3">Unsupported Category</td>
            )}
                {showActions && !isCSVPreview && (
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setSelectedRecord(c);
                        setShowEditRecord(true);
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => {
                        setSelectedRecord(c);
                        setShowDeleteRecord(true);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 🔹 Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ⬅️ Prev
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              className={`pagination-btn ${currentPage === index + 1 ? "active" : ""}`}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}

          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next ➡️
          </button>
          <span className="total-pages"> Page {currentPage} of {totalPages} 📄 </span>
        </div>
      )}
    </div>
  );
};

  // 🧩 JSX UI
  return (
    <div className="monitor-emigrants-page">
      <SideBar />
      <AdminNavbar />
      <div className="main-content" style={{ paddingTop: "100px" }}>
        <div className="page-header">
          <div>
            <h2>Raw Emigrants Records</h2>
            <p>View and manage Filipino emigrants</p>
          </div>
        </div>

        {isCSVPreview && (
          <div className="csv-preview-buttons">
            <button className="btn-done" onClick={handleDone}>
              ✅ Done
            </button>
            <button className="btn-save" onClick={handleSaveToDatabase}>
              💾 Save to Database
            </button>
          </div>
        )}

        {!isCSVPreview && (
          <div className="add-record-button-container">
            <button
              className="btn-add-record"
                onClick={() => {
        console.log("Add Record Button Clicked"); // Log to ensure button is clicked
        setShowAddRecord(true); // Set showAddRecord to true to show the popup
      }}
    >
              Add Record
            </button>
          </div>
        )}

        {/* Conditional rendering of AddRecord popup */}
{showAddRecord && (
  <div className="add-record-popup">
    <h3>Add Record Popup</h3>
    
    {/* Custom Popup Content */}
    <AddRecord
      category={filters.category}
      onClose={() => setShowAddRecord(false)} // Close the popup
      onAddRecord={handleAddRecord} // Handler to add the record
    />
    
    {/* Close Button for Popup */}
    <button onClick={() => setShowAddRecord(false)}>Close</button>
  </div>
)}

        {showEditRecord && (
          <EditRecord
            category={filters.category}
            record={selectedRecord}
            onClose={() => setShowEditRecord(false)}
            onEditRecord={handleEditRecord}
          />
        )}

        {showDeleteRecord && (
          <DeleteRecord
            category={filters.category}
            record={selectedRecord}
            onClose={() => setShowDeleteRecord(false)}
            onDeleteRecord={handleDeleteRecord}
          />
        )}

        <div className="filters-section">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
            >
              <option value="age">AGE</option>
              <option value="sex">SEX</option>
              <option value="allCountries">ALL COUNTRIES</option>
              <option value="occupation">OCCUPATION</option>
              <option value="civilStatus">CIVIL STATUS</option>
              <option value="education">EDUCATION</option>
              <option value="placeOfOrigin">PLACE OF ORIGIN</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Upload CSV here: </label>
            <input type="file" accept=".csv" onChange={handleCSVUpload} />
          </div>
        </div>

        <div className="table-container">{renderTable()}</div>

        {showSaveModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <h3>Confirm Upload</h3>
              <p>Do you want to save the records to the database?</p>
              <div className="modal-actions">
                <button className="btn-save" onClick={handleSaveToDatabase}>
                  Save to Database
                </button>
                <button className="btn-done" onClick={handleDone}>
                  Done (View Only)
                </button>
              </div>
            </div>
          </div>
        )}

        {popupMessage && <div className="popup-message">{popupMessage}</div>}
      </div>
    </div>
  );
};

export default AdminEmigrants;
