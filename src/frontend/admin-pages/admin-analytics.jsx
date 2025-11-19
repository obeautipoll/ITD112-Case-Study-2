//reports working 

//reports working before major 

//reports

// In AdminReports.js
import React, { useState, useEffect } from "react";
import "../../styles-admin/monitor-admin.css";
import SideBar from "./components/SideBar";
import AdminNavbar from "./components/NavBar";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";


//services
import { subscribeToAggregatedData } from "../../services/realtimeDataService";

import ChoroplethMap from "../../components/ChoroplethMap";

import * as d3 from "d3-scale-chromatic";

const getColor = (index) => d3.schemeSet3[index % d3.schemeSet3.length];

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const AdminReports = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filters, setFilters] = useState({
    category: "age",
    search: "",
    chartType: "bar",
    mapLevel: "region", // default map level to match available GeoJSON
    year: "all",
  });

const [topN, setTopN] = useState(5);

  // ✅ Standardized age groups
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

  // 🔥 Real-time fetch + auto aggregate if category === "age"
useEffect(() => {
  const unsubscribe = subscribeToAggregatedData(filters.category, (data) => {
    setRecords(data);
    // apply year filter if applicable
    if (filters.category === "placeoforigin" && filters.year !== "all") {
      setFilteredRecords(data.filter((r) => String(r.year) === String(filters.year)));
    } else {
      setFilteredRecords(data);
    }
  }, topN);

  return () => unsubscribe();
}, [filters.category, topN]);

// Re-apply year filter when year changes for place of origin
useEffect(() => {
  if (filters.category === "placeoforigin") {
    if (filters.year === "all") setFilteredRecords(records);
    else setFilteredRecords(records.filter((r) => String(r.year) === String(filters.year)));
  }
}, [filters.year, filters.category, records]);

  // 📊 Age Distribution Chart (stacked bar or line)
  const getAgeDistributionData = () => {
    const yearAgeGroupMap = {};

    filteredRecords.forEach((record) => {
      const key = `${record.year}-${record.ageGroup}`;
      yearAgeGroupMap[key] = (yearAgeGroupMap[key] || 0) + (record.count || 0);
    });

    const years = Array.from(
      new Set(filteredRecords.map((r) => r.year))
    ).sort(); // Sorted years
    const ageGroupCounts = ageGroups.map(() => years.map(() => 0));

    years.forEach((year, yearIndex) => {
      ageGroups.forEach((ageGroup, ageGroupIndex) => {
        const key = `${year}-${ageGroup}`;
        ageGroupCounts[ageGroupIndex][yearIndex] = yearAgeGroupMap[key] || 0;
      });
    });

    return {
      labels: years,
      datasets: ageGroupCounts.map((data, index) => ({
        label: ageGroups[index],
        data: data,
        backgroundColor: `rgba(${(index * 50) % 255}, ${
          (index * 30) % 255
        }, ${(index * 100) % 255}, 0.5)`,
      })),
    };
  };

  const getCountryData = () => {
  const years = Array.from(new Set(filteredRecords.map(r => r.year))).sort();
  const countries = Array.from(new Set(filteredRecords.map(r => r.country))).sort();

  const datasets = countries.map((country, index) => {
    const data = years.map(year => {
      const rec = filteredRecords.find(r => r.year === year && r.country === country);
      return rec?.count || 0;
    });

    return {
      label: country,
      data,
      backgroundColor: `rgba(${(index*50)%255}, ${(index*30)%255}, ${(index*100)%255}, 0.5)`,
    };
  });

  return {
    labels: years,
    datasets,
  };
};

  const getSexData = () => {
  const years = Array.from(new Set(filteredRecords.map(r => r.year))).sort();

  const maleData = years.map(year => {
    const rec = filteredRecords.find(r => r.year === year);
    return rec?.male || 0;
  });

  const femaleData = years.map(year => {
    const rec = filteredRecords.find(r => r.year === year);
    return rec?.female || 0;
  });

  return {
    labels: years,
    datasets: [
      {
        label: "Male",
        data: maleData,
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Female",
        data: femaleData,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };
};
const getMajorCountryChartData = () => {
  const countries = filteredRecords.map(r => r.country);
  const counts = filteredRecords.map(r => r.count);

  return {
    labels: countries,
    datasets: [
      {
        label: "Top 1",
        data: counts,
        backgroundColor: countries.map(
          (_, index) =>
            `rgba(${(index * 50) % 255}, ${(index * 30) % 255}, ${
              (index * 100) % 255
            }, 0.5)`
        ),
      },
    ],
  };
};

const getOccupationData = () => {
  const years = Array.from(new Set(filteredRecords.map(r => r.year))).sort();
  const occupations = Array.from(new Set(filteredRecords.map(r => r.occupation))).sort();

  const datasets = occupations.map((occupation, index) => {
    const data = years.map(year => {
      const rec = filteredRecords.find(r => r.year === year && r.occupation === occupation);
      return rec?.count || 0;
    });
    return {
      label: occupation,
      data,
      backgroundColor: `rgba(${(index * 40) % 255}, ${(index * 80) % 255}, ${(index * 120) % 255}, 0.5)`,
    };
  });

  return {
    labels: years,
    datasets,
  };
};
const getEducationData = () => {
  const years = Array.from(new Set(filteredRecords.map(r => r.year))).sort();
  const educationLevels = Array.from(new Set(filteredRecords.map(r => r.education))).sort();

  const datasets = educationLevels.map((education, index) => {
    const data = years.map(year => {
      const rec = filteredRecords.find(r => r.year === year && r.education === education);
      return rec?.count || 0;
    });
    return {
      label: education,
      data,
      backgroundColor: `rgba(${(index * 45) % 255}, ${(index * 70) % 255}, ${(index * 100) % 255}, 0.6)`,
    };
  });

  return {
    labels: years,
    datasets,
  };
};


  // 📊 Civil Status Distribution (Bar)
  const getCivilStatusData = () => {
  // Extract years and define the civil status categories manually
  const years = Array.from(new Set(filteredRecords.map((r) => r.year))).sort();
  
  // Define all possible civil status categories (adjust based on your data)
  const statuses = ["single", "married", "widower", "divorced", "separated", "notReported"];

  // Build datasets for each status
  const datasets = statuses.map((status, index) => {
    const data = years.map((year) => {
      const rec = filteredRecords.find((r) => r.year === year);
      return rec?.[status] || 0; // Default to 0 if status is not found
    });

    return {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      data: data,
      backgroundColor: `rgba(${(index * 70) % 255}, ${(index * 40) % 255}, ${(index * 90) % 255}, 0.5)`,
    };
  });

  // Calculate the highest value across all statuses
  const allValues = datasets.flatMap(dataset => dataset.data);
  const highestValue = Math.max(...allValues);

  // Calculate the step size dynamically based on the highest value
  const stepSize = Math.ceil(highestValue / 5000) * 2000; // Increase step size for larger values

  // Set max value for the Y-axis (rounded up to the nearest 2000)
  const maxYValue = Math.ceil(highestValue / 2000) * 2000;

  return {
    labels: years,
    datasets: datasets,
    options: {
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: stepSize,  // Dynamically set stepSize
            max: maxYValue,  // Ensure max is rounded up to the nearest 2000
            min: 0,  // Ensure the minimum value starts at 0
          },
        },
      },
    },
  };
};
const detectedLevel = filteredRecords.some(r => r.municipality)
  ? "municipality"
  : filteredRecords.some(r => r.province)
  ? "province"
  : "region";

const getPlaceOfOriginData = () => {
  const years = Array.from(new Set(filteredRecords.map(r => r.year))).sort();
  const level = filters.mapLevel || detectedLevel;
  const origins = Array.from(
    new Set(filteredRecords.map(r => r[level] || r.placeoforigin))
  ).sort();

  const datasets = origins.map((origin, index) => {
    const data = years.map(year => {
      const rec = filteredRecords.find(r => (r[level] || r.placeoforigin) === origin && r.year === year);
      return rec?.count || 0;
    });
    return {
      label: origin,
      data,
      backgroundColor: `rgba(${(index * 50) % 255}, ${(index * 80) % 255}, ${(index * 120) % 255}, 0.5)`,
    };
  });

  return { labels: years, datasets };
};

  // 🧩 UI
  return (
    <div className="monitor-emigrants-page">
      <SideBar />
      <AdminNavbar />
      <div className="main-content" style={{ paddingTop: "100px" }}>
        <div className="page-header">
          <h2>Emigrant Data Visualization</h2>
          <p>View and analyze Filipino Emigrants Data</p>
        </div>

        {/* Filters */}
        <div className="filters-section">
         

{filters.category === "majorCountry" && (
          <div className="filter-group">
            <label>Top N Countries:</label>
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>
        )}
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
            >
              <option value="age">Age</option>
              <option value="sex">Sex</option>
               <option value="allCountries">All Countries</option>
               <option value="majorCountry">Major Countries</option>
               <option value="occupation">Occupation</option>
              <option value="civilStatus">Civil Status</option>
              <option value="education">Education</option>
               <option value="placeoforigin">Place of Origin</option>


             
            </select>
          </div>

         <div className="filter-group">
        <label>Chart Type:</label>
        <select
          value={filters.chartType}
          onChange={(e) =>
            setFilters({ ...filters, chartType: e.target.value })
          }
        >
          <option value="line">Line</option>
          <option value="bar">Stacked Bar</option>
          {filters.category === "placeoforigin" && <option value="map">Map</option>}
        </select>
      </div>

      {filters.category === "placeoforigin" && (
        <div className="filter-group">
          <label>Year:</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          >
            <option value="all">All</option>
            {Array.from(new Set(records.map((r) => r.year)))
              .sort()
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      )}
        </div>

        {/* Visualization */}
<div className="visualization-container">
 {filters.category === "age" && (
  <>
    <h3>Age Distribution of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getAgeDistributionData()}
        options={{
          responsive: true,
          interaction: {
            mode: "index",
            intersect: false,
          },
          stacked: true, // Enable stacking for all datasets
          plugins: {
            legend: { position: "top" },
            title: { display: false },
          },
          scales: {
            x: {
              stacked: true, // stack X axis
            },
            y: {
              stacked: true, // stack Y axis
              beginAtZero: true,
            },
          },
          elements: {
            line: {
              borderWidth: 3, // Increased line width for better visibility
              borderColor: "#1abc9c", // Change line color to make it stand out
            },
            point: {
              radius: 5, // Increase point size for better visibility
              backgroundColor: "#1abc9c", // Same color as the line
            },
          },
        }}
      />
    ) : (
      <Bar
        data={getAgeDistributionData()}
        options={{
          responsive: true,
          scales: { y: { stacked: true, beginAtZero: true } },
        }}
      />
    )}
  </>
)}

{filters.category === "sex" && (
  <>
    <h3>Sex Distribution of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line data={getSexData()} options={{ responsive: true, plugins: { legend: { position: "top" } } }} />
    ) : (
      <Bar data={getSexData()} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
    )}
  </>
)}
{filters.category === "allCountries" && (
  <>
    <h3>Emigrants by Country</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getCountryData()}
        options={{
          responsive: true,
          interaction: { mode: "index", intersect: false },
          stacked: true,
          plugins: { legend: { position: "top" }, title: { display: false } },
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        }}
      />
    ) : (
      <Bar
        data={getCountryData()}
        options={{ responsive: true, scales: { y: { stacked: true, beginAtZero: true } } }}
      />
    )}
  </>
)}

  {filters.category === "majorCountry" && (
  <>
    <h3>Major Countries of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getMajorCountryChartData()}
        options={{ responsive: true, plugins: { legend: { position: "top" } } }}
      />
    ) : (
      <Bar
        data={getMajorCountryChartData()}
        options={{ responsive: true, scales: { y: { beginAtZero: true } } }}
      />
    )}
  </>
)}

{filters.category === "occupation" && (
  <>
    <h3>Occupation of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getOccupationData()}
        options={{
          responsive: true,
          interaction: { mode: "index", intersect: false },
          stacked: true,
          plugins: {
            legend: { position: "top" },
            title: { display: false },
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true },
          },
        }}
      />
    ) : (
      <Bar
        data={getOccupationData()}
        options={{
          responsive: true,
          scales: { y: { stacked: true, beginAtZero: true } },
        }}
      />
    )}
  </>
)}

{filters.category === "civilStatus" && (
  <>
    <h3>Civil Status of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getCivilStatusData()}
        options={{
          responsive: true,
          interaction: {
            mode: "index",
            intersect: false,
          },
          stacked: true, // Enable stacking for all datasets
          plugins: {
            legend: { position: "top" },
            title: { display: false },
          },
          scales: {
            x: {
              stacked: true, // stack X axis
            },
            y: {
              stacked: true, // stack Y axis
              beginAtZero: true,
            },
          },
          elements: {
            line: {
              borderWidth: 3, // Increased line width
              borderColor: "#e74c3c", // Line color for civil status
            },
            point: {
              radius: 5, // Larger points for visibility
              backgroundColor: "#e74c3c", // Point color matches the line
            },
          },
        }}
      />
    ) : (
      <Bar data={getCivilStatusData()} />
    )}
        </>
      )}



      {filters.category === "education" && (
  <>
    <h3>Educational Attainment of Emigrants</h3>
    {filters.chartType === "line" ? (
      <Line
        data={getEducationData()}
        options={{
          responsive: true,
          interaction: { mode: "index", intersect: false },
          stacked: true,
          plugins: {
            legend: { position: "top" },
            title: { display: false },
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true },
          },
        }}
      />
    ) : (
      <Bar
        data={getEducationData()}
        options={{
          responsive: true,
          scales: { y: { stacked: true, beginAtZero: true } },
        }}
      />
    )}
  </>
)}

{filters.category === "placeoforigin" && (
  <>
    <h3>Place of Origin of Emigrants</h3>

    {/* Map Level Selector for choropleth */}
    {filters.chartType === "map" && (
      <div className="filter-group">
        <label>Map Level:</label>
        <select
          value={filters.mapLevel || "province"}
          onChange={(e) =>
            setFilters({ ...filters, mapLevel: e.target.value })
          }
        >
          <option value="region">Region</option>
          <option value="province">Province</option>
          <option value="municipality">Municipality</option>
        </select>
      </div>
    )}

    {filters.chartType === "line" && (
      <Line
        data={getPlaceOfOriginData()}
        options={{
          responsive: true,
          interaction: { mode: "index", intersect: false },
          stacked: true,
          plugins: { legend: { position: "top" }, title: { display: false } },
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        }}
      />
    )}

    {filters.chartType === "bar" && (
      <Bar
        data={getPlaceOfOriginData()}
        options={{
          responsive: true,
          scales: { y: { stacked: true, beginAtZero: true } },
        }}
      />
    )}

    {filters.chartType === "map" && (
      <ChoroplethMap
        data={filteredRecords}           // your placeoforigin data
        valueKey="count"                 // field used for coloring
        labelKey="placeoforigin"         // field used for tooltip
        level={filters.mapLevel || "province"} // pass selected map level
      />
    )}
  </>
)}



    </div>
      </div>
    </div>
  );
};

export default AdminReports;
