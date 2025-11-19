// TutorialMap.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Example dummy GeoJSON (replace with your ph_regions.geojson)
import phRegions from "../public/data/ph_regions.geojson";

const TutorialMap = () => {
  const [geoData, setGeoData] = useState(phRegions);

  // Dummy counts for each province (replace with your Firestore data later)
  const counts = {
    "Lanao Del Norte": 123,
    "Iligan City": 45,
    "Cebu": 300,
    "Davao": 200,
  };

  // Color scale based on count
  const getColor = (count) => {
    return count > 200
      ? "#800026"
      : count > 100
      ? "#BD0026"
      : count > 50
      ? "#E31A1C"
      : count > 20
      ? "#FC4E2A"
      : "#FFEDA0";
  };

  // Style each feature
  const style = (feature) => {
    const name = feature.properties.NAME_1 || feature.properties.name;
    return {
      fillColor: getColor(counts[name] || 0),
      weight: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  // Add hover popup
  const onEachFeature = (feature, layer) => {
    const name = feature.properties.NAME_1 || feature.properties.name;
    const value = counts[name] || 0;
    layer.bindPopup(`<b>${name}</b><br/>Count: ${value}`);
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, color: "#666", fillOpacity: 0.9 });
      },
      mouseout: (e) => e.target.setStyle(style(e.target.feature)),
    });
  };

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer center={[12.8797, 121.774]} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {geoData && <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />}
      </MapContainer>
    </div>
  );
};

export default TutorialMap;
