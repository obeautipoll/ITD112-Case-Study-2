// locationServices.js
import regionsData from "../data/regions.json";  // { region_name, region_code }
import provincesData from "../data/provinces.json";  // { province_name, province_code, region_code }
import municipalitiesData from "../data/municipalities.json"; // { municipality_name, municipality_code, province_code }

export const getRegionByCode = (regionCode) => {
  const region = regionsData.find(r => r.region_code === regionCode);
  return region ? region.region_name : "Unknown";
};

export const getProvinceByCode = (provinceCode) => {
  const province = provincesData.find(p => p.province_code === provinceCode);
  return province ? province.province_name : "Unknown";
};

export const getMunicipalityByName = (municipalityName) => {
  const municipality = municipalitiesData.find(m => m.municipality_name === municipalityName);
  return municipality ? municipality.municipality_name : "Unknown";
};
