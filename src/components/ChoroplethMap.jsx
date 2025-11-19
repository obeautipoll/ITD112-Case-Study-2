import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import separate GeoJSON files
// Prefer a unified GeoJSON for regions
import regionGeo from "../data/region.geojson";
import provincesGeo from "../data/provinces.geojson";
import citiesGeo from "../data/cities.geojson";

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
    { min: 201, max: 500, color: "#E31A1C", label: "201–500" },
    { min: 501, max: 1000, color: "#BD0026", label: "501–1000" },
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

  // Normalize and canonicalize names to improve matching between data and GeoJSON
  const normalize = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, "") // remove parentheticals
      .replace(/\b(city of|province of)\b/g, "")
      .replace(/\bcity\b/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, " ")
      .replace(/^-+|-+$/g, "")
      .trim();

  const canonicalize = (str) => {
    const n = normalize(str);
    if (!n) return n;
    // Common Philippine region aliases
    if (n === "ncr" || n === "metro manila") return "national capital region";
    if (n === "car") return "cordillera administrative region";
    if (n.includes("bangsamoro autonomous region") || n === "barmm")
      return "autonomous region of muslim mindanao"; // matches older ARMM polygons
    if (n === "iv a" || n === "region iv a" || n.includes("calabarzon")) return "region iv a";
    if (n === "iv b" || n === "region iv b" || n.includes("mimaropa")) return "region iv b";
    return n;
  };

  // Extract the appropriate location name from a data item based on the current level
  const extractLocationName = (item) => {
    // Prefer explicit fields if present
    if (level === "region" && item.region) return item.region;
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
      return canonicalize(itemName) === canonicalize(featureName)
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
