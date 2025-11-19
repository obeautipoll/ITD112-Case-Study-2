import React, { useState, useEffect } from "react";
import "./EditRecord.css";
import { countriesByContinent } from "../../../data/countriesData";
import LocationDropdown from "../../../components/LocationDropdown";

const EditRecord = ({ category, record, onClose, onEditRecord }) => {
  const [formData, setFormData] = useState({
    year: "",
    single: 0,
    married: 0,
    widower: 0,
    separated: 0,
    divorced: 0,
    notReported: 0,
    ageGroup: "", // For age category
    count: 0,
    sex: "", 
    country: "",
    occupation:"",
    education:"",
    region: "",
    province: "",
    municipality: "",
  });

   const [searchQuery, setSearchQuery] = useState("");
    const [filteredCountries, setFilteredCountries] = useState([]);
    const [error, setError] = useState("");
    const allCountries = Object.values(countriesByContinent).flat();


  const ageGroups = ["14 - Below",
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
    "Not Reported / No Response"
  ]; // Example age groups

  useEffect(() => {
  if (record) {
    const normalizedRecord = {
      year: record.year,
      single: parseInt(record.single) || 0,
      married: parseInt(record.married) || 0,
      widower: parseInt(record.widower) || 0,
      separated: parseInt(record.separated) || 0,
      divorced: parseInt(record.divorced) || 0,
      notReported: parseInt(record.notReported) || 0,
      ageGroup: record.ageGroup || "", 
      count: record.count || 0, 
      sex: record.sex || "", 
      country: record.country || "",
       education: record.education || "",
       region: record.region || "",
       province: record.province || "",
       municipality: record.municipality || "",
      
    };
    setFormData(normalizedRecord);
    setSearchQuery(record.country || "");
     // <-- important! show initial country in input
  }
}, [record]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLocationChange = ({ region, province, municipality }) => {
  setFormData((prev) => ({ ...prev, region, province, municipality }));
};
  const handleEditRecord = () => {
    const {region, province, municipality,education,occupation, year, single, married, widower, separated, divorced, notReported, ageGroup, count, sex,country,} = formData;

    const allCountries = Object.values(countriesByContinent).flat();
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

    if (category === "civilStatus" && (isNaN(single) || isNaN(married))) {
      alert("Please enter valid civil status numbers.");
      return;
    }

    if (category === "sex" && (!sex || count < 0)) {
      alert("Please select a valid sex and count.");
      return;
    }
    if (category === "allCountries" && (!country || count < 0)) {
      alert("Please enter a valid country and count.");
      return;
    }

   
    // 🧱 Build data payload
    let data;
    if (category === "age") {
      data = { year, ageGroup, count: parseInt(count) };
    } else if (category === "civilStatus") {
      data = {
        year,
        single: parseInt(single),
        married: parseInt(married),
        widower: parseInt(widower),
        separated: parseInt(separated),
        divorced: parseInt(divorced),
        notReported: parseInt(notReported),
      };
    } else if (category === "sex") {
      data = {
        sex,
        year,
        count: parseInt(count),
      };
    } 
    else if (category === "allCountries") {
  data = {
    year,
    country,
    count: parseInt(count),
  };}
  else if (category === "occupation") {
      data = {
        occupation,
        year,
        count: parseInt(count),
      };
    }
    else if (category === "education") {
  data = {
    education,
    year,
    count:  parseInt(count),
  };
}
else if (category === "placeOfOrigin") {
  // Instead of manually inputting count, we just store 1 per submission
  data = {
    year,
    region,
    province,
    municipality,
    count:parseInt(count), 
  };
}
    else {
      alert("Unsupported category type.");
      return;
    }

    onEditRecord(data);
    onClose();
  };
const isFormValid =
    formData.country && allCountries.includes(formData.country) && formData.count;

  return (
    <div className="edit-record-popup">
      <div className="popup-content">
        <h3>Edit Record</h3>

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

        {/* Category-specific fields */}
        {category === "civilStatus" && (
          <>
            <div className="popup-field">
              <label>Single:</label>
              <input
                type="number"
                name="single"
                value={formData.single}
                onChange={handleChange}
                placeholder="Single"
              />
            </div>
            <div className="popup-field">
              <label>Married:</label>
              <input
                type="number"
                name="married"
                value={formData.married}
                onChange={handleChange}
                placeholder="Married"
              />
            </div>
            <div className="popup-field">
              <label>Widower:</label>
              <input
                type="number"
                name="widower"
                value={formData.widower}
                onChange={handleChange}
                placeholder="Widower"
              />
            </div>
            <div className="popup-field">
              <label>Separated:</label>
              <input
                type="number"
                name="separated"
                value={formData.separated}
                onChange={handleChange}
                placeholder="Separated"
              />
            </div>
            <div className="popup-field">
              <label>Divorced:</label>
              <input
                type="number"
                name="divorced"
                value={formData.divorced}
                onChange={handleChange}
                placeholder="Divorced"
              />
            </div>
            <div className="popup-field">
              <label>Not Reported:</label>
              <input
                type="number"
                name="notReported"
                value={formData.notReported}
                onChange={handleChange}
                placeholder="Not Reported"
              />
            </div>
          </>
        )}

        {category === "age" && (
          <>
            {/* Age Group dropdown */}
            <div className="popup-field">
              <label>Age Group:</label>
              <select name="ageGroup" value={formData.ageGroup} onChange={handleChange}>
                <option value="">Select Age Group</option>
                {ageGroups.map((group, index) => (
                  <option key={index} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Count input for Age Group */}
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

        {category === "sex" && (
          <>
            {/* Age Group dropdown */}
             <div className="popup-field">
              <label>Sex:</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
              >
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
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
                      const value = e.target.value;
                      setSearchQuery(value);

                      // Only clear formData.country if the typed value is different from the currently selected country
                      if (value !== formData.country) {
                        setFormData({ ...formData, country: "" });
                      }

                      setFilteredCountries(
                        Object.values(countriesByContinent)
                          .flat()
                          .filter((c) => c.toLowerCase().includes(value.toLowerCase()))
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
    <LocationDropdown
      defaultRegion={formData.region}
      defaultProvince={formData.province}
      defaultMunicipality={formData.municipality}
      onChange={({ region, province, municipality }) =>
        setFormData(prev => ({ ...prev, region, province, municipality }))
      }
    />
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
        <option value="">Select Education</option>
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
            onClick={handleEditRecord}
            disabled={category === "allCountries" && !isFormValid}
          >
            Confirm Edit
          </button>
          <button className="btn-close" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRecord;
