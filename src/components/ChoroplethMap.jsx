import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import separate GeoJSON files
// Prefer a unified GeoJSON for regions
import regionGeo from "../data/region.geojson";
import provincesGeo from "../data/provinces.geojson";
import citiesGeo from "../data/cities.geojson";
import regionsList from "../data/regions.json";

const normalizeName = (str = "") =>
  String(str || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(city of|province of)\b/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "")
    .trim();

const regionAliasRules = [
    { canonical: "Central Luzon", keywords: ["Region III", "Central Luzon"] },
    { canonical: "Ilocos Region", keywords: ["Region I", "Ilocos Region"] },
    { canonical: "CALABARZON", keywords: ["Region IV-A", "CALABARZON"] },
    { canonical: "Cagayan Valley", keywords: ["Region II", "Cagayan Valley"] },
    { canonical: "MIMAROPA", keywords: ["Region IV-B", "MIMAROPA"] },
    { canonical: "Bicol Region", keywords: ["Region V", "Bicol Region"] },
    { canonical: "Western Visayas", keywords: ["Region VI", "Western Visayas"] },
    { canonical: "Central Visayas", keywords: ["Region VII", "Central Visayas"] },
    { canonical: "Eastern Visayas", keywords: ["Region VIII", "Eastern Visayas"] },
    { canonical: "Zamboanga Peninsula", keywords: ["Region IX", "Zamboanga Peninsula"] },
    { canonical: "Northern Mindanao", keywords: ["Region X", "Northern Mindanao"] },
    { canonical: "Davao Region", keywords: ["Region XI", "Davao Region"] },
    { canonical: "SOCCSKSARGEN", keywords: ["Region XII", "SOCCSKSARGEN"] },
    { canonical: "Caraga", keywords: ["Region XIII", "Caraga"] },
    { canonical: "National Capital Region", keywords: ["NCR", "Metro Manila", "National Capital Region"] },
    { canonical: "Cordillera Administrative Region", keywords: ["CAR", "Cordillera Administrative Region"] },
    { canonical: "Autonomous Region in Muslim Mindanao", keywords: ["ARMM", "Bangsamoro", "BARMM", "Autonomous Region of Muslim Mindanao"] },
  
  {
    canonical: "national capital region",
    keywords: ["ncr", "metro manila", "metropolitan manila", "national capital region"],
  },
  {
    canonical: "cordillera administrative region",
    keywords: ["car", "cordillera administrative region"],
  },
  {
    canonical: "autonomous region in muslim mindanao",
    keywords: [
      "autonomous region in muslim mindanao",
      "autonomous region of muslim mindanao",
      "bangsamoro",
      "barmm",
    ],
  },
];

const canonicalizeRegionName = (str = "") => {
  const normalized = normalizeName(str);
  if (!normalized) return normalized;

  const aliasMatch = regionAliasRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );
  if (aliasMatch) return aliasMatch.canonical;

  const match = normalized.match(/region\s+([ivxlcdm]+|\d+)/);
  if (match) return `region ${match[1]}`.trim();

  return normalized;
};

// One-time sanity check: ensure region.geojson and regions.json align
(() => {
  const geoNames = new Set(
    (regionGeo.features || []).map((feature) =>
      canonicalizeRegionName(
        feature.properties?.REGION ||
          feature.properties?.NAME_1 ||
          feature.properties?.region_name ||
          ""
      )
    )
  );
  const jsonNames = new Set(
    regionsList.map((region) => canonicalizeRegionName(region.region_name))
  );

  const missingInJson = Array.from(geoNames).filter((name) => !jsonNames.has(name));
  const missingInGeo = Array.from(jsonNames).filter((name) => !geoNames.has(name));

  if (missingInJson.length || missingInGeo.length) {
    console.warn(
      "[ChoroplethMap] Region data mismatch between region.geojson and regions.json",
      { missingInJson, missingInGeo }
    );
  }
})();

const ChoroplethMap = ({
  data,
  valueKey,
  labelKey,
  level = "province", // "region" | "province" | "municipality"
  center = [12.8797, 121.774],
  zoom,
}) => {
  const [geoData, setGeoData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  const defaultZoom = zoom || (level === "municipality" ? 7 : level === "province" ? 6 : 5);

  // Philippines geographic bounds (approx)
  const PH_BOUNDS = [
    [4.2, 116.0], // Southwest
    [21.5, 127.5], // Northeast
  ];
  
  // Force GeoJSON layer re-render when data or level changes so styles update
  const layerKey = `${level}-${data?.length || 0}-${(data || []).reduce((s, it) => s + (Number(it[valueKey]) || 0), 0)}`;

  // Load the correct GeoJSON based on selected level
  useEffect(() => {
    let selectedData = null;
    if (level === "region") selectedData = regionGeo;
    if (level === "province") selectedData = provincesGeo;
    if (level === "municipality") selectedData = citiesGeo;

    // Reset while loading
    setGeoData(null);

    // If imported asset is a URL string (common for .geojson), fetch it
    if (typeof selectedData === "string") {
      fetch(selectedData)
        .then((res) => res.json())
        .then((json) => setGeoData(json))
        .catch((err) => {
          console.error("Failed to load GeoJSON:", err);
          setGeoData(undefined);
        });
    } else if (selectedData && selectedData.type === "FeatureCollection") {
      // Already a parsed GeoJSON object
      setGeoData(selectedData);
    } else if (selectedData && selectedData.default && selectedData.default.type === "FeatureCollection") {
      // Some bundlers wrap JSON under .default
      setGeoData(selectedData.default);
    } else {
      setGeoData(undefined);
    }
  }, [level]);

  // Helper to fit map view to current GeoJSON
  const FitToGeoJSON = ({ data }) => {
    const map = useMap();
    useEffect(() => {
      if (!data) return;
      try {
        const bounds = L.geoJSON(data).getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Could not compute bounds for GeoJSON", e);
      }
    }, [data, map]);
    return null;
  };

  // Color scale
  const getColor = (count) => {
    return count > 1000
      ? "#800026"
      : count > 500
      ? "#BD0026"
      : count > 200
      ? "#E31A1C"
      : count > 100
      ? "#FC4E2A"
      : count > 50
      ? "#FD8D3C"
      : count > 10
      ? "#FEB24C"
      : count > 0
      ? "#FED976"
      : "#FFEDA0";
  };

  const colorBreaks = [
  { max: 0, color: "#FFEDA0", label: "0" },
  { min: 1, max: 10, color: "#FED976", label: "1–10" },
  { min: 11, max: 50, color: "#FEB24C", label: "11–50" },
  { min: 51, max: 100, color: "#FD8D3C", label: "51–100" },
  { min: 101, max: 200, color: "#FC4E2A", label: "101–200" },
  { min: 201, max: 300, color: "#E31A1C", label: "201–300" },
  { min: 301, max: 400, color: "#BD0026", label: "301–400" },
  { min: 401, max: 500, color: "#800026", label: "401–500" },
  { min: 501, max: 600, color: "#7A0000", label: "501–600" },
  { min: 601, max: 700, color: "#8B0000", label: "601–700" },
  { min: 701, max: 800, color: "#9A0000", label: "701–800" },
  { min: 801, max: 900, color: "#A80000", label: "801–900" },
  { min: 901, max: 1000, color: "#B80000", label: "901–1000" },
  { min: 1001, color: "#800026", label: "1000+" },
];

  // Feature name based on level
  const getFeatureName = (feature) => {
    const p = feature.properties || {};
    if (level === "region") return p.REGION || p.NAME_1 || p.adm1_en || p.region_name || p.name;
    if (level === "province") return p.PROVINCE || p.NAME_1 || p.NAME_2 || p.adm2_en || p.province_name || p.name;
    if (level === "municipality") return p.NAME_2 || p.MUNICIPALITY || p.CITY || p.NAME_3 || p.adm3_en || p.municipality_name || p.city_name || p.name;
    return p.name || p.adm1_en || p.region_name;
  };

  // Extract the appropriate location name from a data item based on the current level
  const extractLocationName = (item) => {
    // Prefer explicit fields if present
    if (level === "region" && (item.region || item.regionName)) return item.region || item.regionName;
    if (level === "province" && item.province) return item.province;
    if (level === "municipality" && (item.municipality || item.city)) return item.municipality || item.city;

    // Fallback: parse from a composite label (e.g., placeoforigin: "Region-Province-Municipality")
    const composite = labelKey ? item[labelKey] : undefined;
    if (composite) {
      const str = String(composite);
      const last = str.lastIndexOf("-");
      const secondLast = last > -1 ? str.lastIndexOf("-", last - 1) : -1;
      if (last === -1) {
        return str; // no delimiter found
      }
      if (level === "municipality") {
        return str.substring(last + 1);
      }
      if (level === "province") {
        if (secondLast === -1) return str.substring(0, last);
        return str.substring(secondLast + 1, last);
      }
      // region: everything before the second last hyphen if present, else before last
      if (secondLast === -1) return str.substring(0, last);
      return str.substring(0, secondLast);
    }
    return "";
  };

  // Compute cumulative value for a given feature name by summing all matching records
  const valueForFeature = (featureName) =>
    data.reduce((sum, item) => {
      const itemName = extractLocationName(item);
      return (
        canonicalizeRegionName(itemName) === canonicalizeRegionName(featureName)
      )
        ? sum + (Number(item[valueKey]) || 0)
        : sum;
    }, 0);

  // Style each feature based on aggregated value
  const style = (feature) => {
    const featureName = getFeatureName(feature);
    const value = valueForFeature(featureName);

    return {
      fillColor: getColor(value),
      weight: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  // Interaction
  const onEachFeature = (feature, layer) => {
    const featureName = getFeatureName(feature);
    const value = valueForFeature(featureName);

    layer.bindPopup(`<b>${featureName}</b><br/>Count: ${value}`);
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 3, color: "#666", fillOpacity: 0.9 }),
      mouseout: (e) => e.target.setStyle(style(e.target.feature)),
      click: (e) => e.target.openPopup(),
    });
  };

  return (
    <div style={{ height: "720px", width: "100%", borderRadius: "10px", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        maxBounds={PH_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        preferCanvas
        worldCopyJump={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
          noWrap
        />
        {geoData && geoData.type === "FeatureCollection" && Array.isArray(geoData.features) && (
          <>
            <FitToGeoJSON data={geoData} />
            <GeoJSON key={layerKey} data={geoData} style={style} onEachFeature={onEachFeature} />
          </>
        )}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          background: "white",
          padding: "8px 10px",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Emigrants</div>
        {colorBreaks.map((b, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", margin: "2px 0" }}>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                background: b.color,
                border: "1px solid #999",
                marginRight: 6,
              }}
            />
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      {hoverInfo && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "white",
            padding: "8px",
            borderRadius: "5px",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            zIndex: 1000,
          }}
        >
          {hoverInfo}
        </div>
      )}
    </div>
  );
};

export default ChoroplethMap;
