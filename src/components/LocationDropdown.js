// LocationDropdown.jsx
import React, { useState, useEffect } from "react";
import regionsData from "../data/regions.json";      // { region_name, region_code }
import provincesData from "../data/provinces.json";  // { province_name, province_code, region_code }
import municipalitiesData from "../data/municipalities.json"; // { municipality_name, municipality_code, province_code }

const LocationDropdown = ({
  onChange,
  defaultRegion = "",
  defaultProvince = "",
  defaultMunicipality = "",
}) => {
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");

  const [filteredProvinces, setFilteredProvinces] = useState([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState([]);

  // 🔹 Initialize dropdowns from default names (edit mode)
  useEffect(() => {
    const regionObj = regionsData.find(r => r.region_name === defaultRegion);
    const provinceObj = provincesData.find(p => p.province_name === defaultProvince);
    const municipalityObj = municipalitiesData.find(m => m.municipality_name === defaultMunicipality);

    if (regionObj) setRegion(regionObj.region_code);
    if (provinceObj) setProvince(provinceObj.province_code);
    if (municipalityObj) setMunicipality(municipalityObj.municipality_code || "");
  }, [defaultRegion, defaultProvince, defaultMunicipality]);

  // 🔹 Update filtered provinces when region changes
  useEffect(() => {
    if (region) {
      const provinces = provincesData.filter(p => p.region_code === region);
      setFilteredProvinces(provinces);

      // Reset province if invalid
      if (!provinces.some(p => p.province_code === province)) {
        setProvince("");
        setFilteredMunicipalities([]);
        setMunicipality("");
      }
    } else {
      setFilteredProvinces([]);
      setProvince("");
      setFilteredMunicipalities([]);
      setMunicipality("");
    }
  }, [region]);

  // 🔹 Update filtered municipalities when province changes
  useEffect(() => {
    if (province) {
      const municipalities = municipalitiesData.filter(m => m.province_code === province);
      setFilteredMunicipalities(municipalities);

      // Reset municipality if invalid
      if (!municipalities.some(m => m.municipality_code === municipality)) {
        setMunicipality("");
      }
    } else {
      setFilteredMunicipalities([]);
      setMunicipality("");
    }
  }, [province]);

  // 🔹 Call parent onChange with names, not codes
  useEffect(() => {
    const regionName = regionsData.find(r => r.region_code === region)?.region_name || "";
    const provinceName = provincesData.find(p => p.province_code === province)?.province_name || "";
    const municipalityName = municipalitiesData.find(m => m.municipality_code === municipality)?.municipality_name || "";

    onChange({ region: regionName, province: provinceName, municipality: municipalityName });
  }, [region, province, municipality, onChange]);

  return (
    <div>
      {/* Region Dropdown */}
      <div>
        <label>Region:</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Select Region</option>
          {regionsData.map(r => (
            <option key={r.region_code} value={r.region_code}>
              {r.region_name}
            </option>
          ))}
        </select>
      </div>

      {/* Province Dropdown */}
      <div>
        <label>Province:</label>
        <select value={province} onChange={(e) => setProvince(e.target.value)} disabled={!region}>
          <option value="">Select Province</option>
          {filteredProvinces.map(p => (
            <option key={p.province_code} value={p.province_code}>
              {p.province_name}
            </option>
          ))}
        </select>
      </div>

      {/* Municipality Dropdown */}
      <div>
        <label>Municipality:</label>
        <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={!province}>
          <option value="">Select Municipality</option>
          {filteredMunicipalities.map(m => (
            <option key={m.municipality_code} value={m.municipality_code}>
              {m.municipality_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationDropdown;
