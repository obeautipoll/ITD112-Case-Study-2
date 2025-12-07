import React, { useState , useEffect} from "react";
import "./AddRecord.css";
import Select from "react-select";

import {addPlaceOfOriginRecord  } from "../../../services/placeoforiginService";
import { addEducationRecord } from "../../../services/educationService";
import {addOccupationRecord  } from "../../../services/occupationService";
import { addAgeRecord } from "../../../services/ageService";
import { addSexRecord } from "../../../services/sexService";
import { addCivilStatusRecord } from "../../../services/civilstatusService";
import { addAllcountryRecord } from "../../../services/allcountriesService";
import { countriesByContinent } from "../../../data/countriesData";
import { db } from "../../../firebase/firebase";
import { addDoc, collection } from "firebase/firestore";
import LocationDropdown from "../../../components/LocationDropdown";
const AddRecord = ({ category, onClose }) => {
  const [formData, setFormData] = useState({
    year: "",
    ageGroup: "",
    count: 0,
    sex: "",
    single: 0,
    married: 0,
    widower: 0,
    separated: 0,
    divorced: 0,
    notReported: 0,
    country: "",
    occupation:"",
    education: "",
    region: "",
    province: "",
    municipality: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [error, setError] = useState("");


   const allCountries = Object.values(countriesByContinent).flat();
  useEffect(() => {
    if (searchQuery) {
      const results = allCountries.filter((country) =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(results);
    } else {
      setFilteredCountries([]);
    }
  }, [searchQuery]);

  const ageGroups = [
    "14 - Below",
    "15 - 19",
    "20 - 24",
    "25 - 29",
    "30 - 34",
    "35 - 39",
    "40 - 44",
    "45 - 49",
    "50 - 54",
    "55 - 59",
    "60 - 64",
    "65 - 69",
    "70 - Above",
    "Not Reported / No Response",
  ];

  const sexCategories = ["Male", "Female"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = ({ region, province, municipality }) => {
  setFormData((prev) => ({ ...prev, region, province, municipality }));
};
  

   const handleConfirm = () => {
    setError("");

    // Validate only for allCountries category
    if (category === "allCountries") {
      if (!formData.country) {
        setError("Please select a country.");
        return;
      }
      if (category === "placeOfOrigin" && (!formData.region || formData.count < 0)) {
  alert("Please enter a valid region and count.");
  return;
}

      const isValidCountry = allCountries.includes(formData.country);
      if (!isValidCountry) {
        setError("Invalid country. Please select a valid one from the list.");
        return;
      }
    }

  };

  const handleAddRecord = async () => {
    const {
      year,
      ageGroup,
      sex,
      count,
      single,
      married,
      widower,
      separated,
      divorced,
      notReported,
    } = formData;

     const allCountries = Object.values(countriesByContinent).flat();
      
    // 🧠 Validation

     if (!year && category !== "allCountries") {
    alert("Please enter a valid year.");
    return;
  }
    if (!year) {
      alert("Please enter a valid year.");
      return;
    }

    if (category === "age" && (!ageGroup || count < 0)) {
      alert("Please fill in a valid age group and count.");
      return;
    }

    if (category === "sex" && (!sex || count < 0)) {
      alert("Please select a valid sex and enter count.");
      return;
    }

    if (category === "civilStatus" && single < 0) {
      alert("Please enter valid civil status numbers.");
      return;
    }

    if (category === "placeOfOrigin") {
      if (!formData.region || !formData.province || !formData.municipality) {
        alert("Please select a region, province, and municipality.");
        return;
      }
      const parsedCount = Number(formData.count);
      if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
        alert("Count must be greater than zero.");
        return;
      }
    }

    // 🧩 Build record object depending on category
    let recordToAdd;
    if (category === "age") {
      recordToAdd = { year, ageGroup, count: Number(count) };
    } else if (category === "sex") {
      recordToAdd = { year, sex, count: Number(count) };
    } else if (category === "civilStatus") {
      recordToAdd = {
        year,
        single: Number(single),
        married: Number(married),
        widower: Number(widower),
        separated: Number(separated),
        divorced: Number(divorced),
        notReported: Number(notReported),
      };
    }
    else if (category === "allCountries") {
      recordToAdd = {
        country: formData.country,
        year: Number(formData.year),
        count: Number(formData.count),
      };
    }
    else if (category === "occupation") {
      recordToAdd = {
        occupation: formData.occupation,
        year: Number(formData.year),
        count: Number(formData.count),
      };
    }
    else if (category === "education") {
  recordToAdd = {
    education: formData.education,
    year: Number(formData.year),
    count: Number(formData.count),
  };
}
else if (category === "placeOfOrigin") {
  const parsedCount = Number(formData.count);
  recordToAdd = {
    year: Number(formData.year),
    region: formData.region || "Unknown",
    province: formData.province || "Unknown",
    municipality: formData.municipality || "Unknown",
    count: Math.max(1, Number.isFinite(parsedCount) ? parsedCount : 1),
  };
}
      else {
      alert("Unsupported category type.");
      return;
    }

    // 🧾 Add to Firebase or service
    try {
      if (category === "age") {
        await addAgeRecord(recordToAdd);
      } else if (category === "sex") {
        await addSexRecord(recordToAdd);
      }
       else if (category === "civilStatus") {
    await addCivilStatusRecord(recordToAdd);
        
      } 
      
      else if (category === "allCountries") {
  await addAllcountryRecord(recordToAdd);
}

 else if (category === "occupation") {
        await addOccupationRecord(recordToAdd);
      }
      else if (category === "education") {
  await addEducationRecord(recordToAdd);
}
else if (category === "placeOfOrigin") {
  await addPlaceOfOriginRecord(recordToAdd);
}
else {
        await addDoc(collection(db, category), recordToAdd);
      }

      

      onClose(); // Close modal after adding
    } catch (error) {
      console.error("Error adding record:", error);
      alert("❌ Failed to add record. Check console for details.");
    }
  };
  const isFormValid =
    formData.country && allCountries.includes(formData.country) && formData.count;


  return (
    <div className="add-record-popup">
      <div className="popup-content">
        <h3>Add New Record</h3>

        {/* Year field */}
        <div className="popup-field">
          <label>Year:</label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            placeholder="Enter year"
          />
        </div>

        {/* Fields for AGE category */}
        {category === "age" && (
          <>
            <div className="popup-field">
              <label>Age Group:</label>
              <select
                name="ageGroup"
                value={formData.ageGroup}
                onChange={handleChange}
              >
                <option value="">Select Age Group</option>
                {ageGroups.map((group, i) => (
                  <option key={i} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div className="popup-field">
              <label>Count:</label>
              <input
                type="number"
                name="count"
                value={formData.count}
                onChange={handleChange}
                placeholder="Enter count"
              />
            </div>
          </>
        )}

        {/* 🧍 Fields for SEX category */}
        {category === "sex" && (
          <>
            <div className="popup-field">
              <label>Sex:</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
              >
                <option value="">Select Sex</option>
                {sexCategories.map((s, i) => (
                  <option key={i} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="popup-field">
              <label>Count:</label>
              <input
                type="number"
                name="count"
                value={formData.count}
                onChange={handleChange}
                placeholder="Enter count"
              />
            </div>
          </>
        )}

          {/* ✅ ALL COUNTRIES Category */}
        {category === "allCountries" && (
          <>
            <div className="popup-field" style={{ position: "relative" }}>
              <label>Country:</label>
              <input
                type="text"
                name="country"
                value={searchQuery}
                onChange={(e) => {
                   setSearchQuery(e.target.value);
                setFormData({ ...formData, country: "" }); // reset country selection while typing
                setFilteredCountries(
                  Object.values(countriesByContinent).flat().filter(c =>
                    c.toLowerCase().includes(e.target.value.toLowerCase())
                  )
                );
              }}
              placeholder="Enter country"
            />

            {/* Dropdown */}
            {searchQuery && filteredCountries.length > 0 && (
              <ul className="country-dropdown">
                {filteredCountries.slice(0, 10).map((country, index) => (
                  <li
                    key={index}
                    className="country-option"
                    onClick={() => {
                      setSearchQuery(country);        // display selected country immediately
                      setFormData({ ...formData, country }); // set actual value in formData
                      setFilteredCountries([]);       // hide dropdown
                      setError("");                   // clear error
                    }}
                  >
                    {country}
                  </li>
                ))}
              </ul>
            )}

              {error && <p className="error-text">{error}</p>}
            </div>

            <div className="popup-field">
              <label>Count:</label>
              <input
                type="number"
                name="count"
                value={formData.count}
                onChange={handleChange}
                placeholder="Enter count"
              />
            </div>

            {/* ✅ Show chosen country (visual feedback) */}
            {formData.country && (
              <p className="selected-country-text">
                Selected Country: <strong>{formData.country}</strong>
              </p>
            )}
          </>
        )}
              {/* Fields for CIVIL STATUS category */}
        {category === "civilStatus" && (
          <>
            {[
              "single",
              "married",
              "widower",
              "separated",
              "divorced",
              "notReported",
            ].map((status) => (
              <div className="popup-field" key={status}>
                <label>
                  {status.charAt(0).toUpperCase() + status.slice(1)}:
                </label>
                <input
                  type="number"
                  name={status}
                  value={formData[status]}
                  onChange={handleChange}
                  placeholder={status}
                />
              </div>
            ))}
          </>
        )}
{category === "occupation" && (
  <>
    <div className="popup-field">
      <label>Occupation:</label>
      <select
        name="occupation"
        value={formData.occupation}
        onChange={handleChange}
      >
        <option value="">Select Occupation</option>
        <option value="Professional">Professional</option>
        <option value="Managerial">Managerial</option>
        <option value="Clerical">Clerical</option>
        <option value="Sales">Sales</option>
        <option value="Service">Service</option>
        <option value="Agriculture">Agriculture</option>
        <option value="Production">Production</option>
        <option value="Armed Forces">Armed Forces</option>
        <option value="Housewives">Housewives</option>
        <option value="Retirees">Retirees</option>
        <option value="Students">Students</option>
        <option value="Minors">Minors</option>
        <option value="Out of School Youth">Out of School Youth</option>
        <option value="No Occupation Reported">No Occupation Reported</option>
      </select>
    </div>
    <div className="popup-field">
      <label>Count:</label>
      <input
        type="number"
        name="count"
        value={formData.count}
        onChange={handleChange}
        placeholder="Enter count"
      />
    </div>
  </>
)}

{category === "placeOfOrigin" && (
  <div>
    <h3>Select Place of Origin</h3>
    <LocationDropdown onChange={handleLocationChange} />
    <div className="popup-field">
      <label>Count:</label>
      <input
        type="number"
        name="count"
        value={formData.count}
        onChange={handleChange}
        placeholder="Enter count"
      />
    </div>
  </div>
)}
{category === "education" && (
  <>
    <div className="popup-field">
      <label>Education:</label>
      <select
        name="education"
        value={formData.education}
        onChange={handleChange}
      >
        <option value="">Select Education Level</option>
        <option value="Not of Schooling Age">Not of Schooling Age</option>
        <option value="No Formal Education">No Formal Education</option>
        <option value="Elementary Level">Elementary Level</option>
        <option value="Elementary Graduate">Elementary Graduate</option>
        <option value="High School Level">High School Level</option>
        <option value="High School Graduate">High School Graduate</option>
        <option value="Vocational Level">Vocational Level</option>
        <option value="Vocational Graduate">Vocational Graduate</option>
        <option value="College Level">College Level</option>
        <option value="College Graduate">College Graduate</option>
        <option value="Post Graduate Level">Post Graduate Level</option>
        <option value="Post Graduate">Post Graduate</option>
        <option value="Non-Formal Education">Non-Formal Education</option>
        <option value="Not Reported / No Response">Not Reported / No Response</option>
      </select>
    </div>

    <div className="popup-field">
      <label>Count:</label>
      <input
        type="number"
        name="count"
        value={formData.count}
        onChange={handleChange}
        placeholder="Enter count"
      />
    </div>
  </>
)}


      
<div className="popup-actions">
  <button
    className={`btn-confirm ${
      category === "allCountries" && !isFormValid ? "disabled" : ""
    }`}
    onClick={handleAddRecord}
    disabled={category === "allCountries" && !isFormValid}
  >
    Confirm Add
  </button>
  <button className="btn-close" onClick={onClose}>
    Cancel
  </button>
</div>
      </div>
    </div>
  );
};

export default AddRecord;
