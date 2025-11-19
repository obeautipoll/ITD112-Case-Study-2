//admin dashboard 

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { Users, BarChart3, CheckCircle, FileText, Mars, Venus } from 'lucide-react';
import '../../styles-admin/admin.css';
import SideBar from './components/SideBar';
import AdminNavbar from './components/NavBar';
import { subscribeToAggregatedData } from '../../services/realtimeDataService';
import { collection, getDocs , onSnapshot} from "firebase/firestore";
import { db } from "../../firebase/firebase";

//total
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const AdminDashboard = () => {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // Real-time data states
  const [emigrantData, setEmigrantData] = useState([]);
  const [sexData, setSexData] = useState([]);
  const [totalEmigrants, setTotalEmigrants] = useState(0);
const [totalUsers, setTotalUsers] = useState(0);
const [emigrantsPerYear, setEmigrantsPerYear] = useState({});
const [emigrantsByYearTemp, setEmigrantsByYearTemp] = useState({});

//chart
const [selectedYear, setSelectedYear] = useState(null);
const [chartType, setChartType] = useState("bar");
const [availableYears, setAvailableYears] = useState([]); 


useEffect(() => {
  // Process the emigrants per year and extract available years
  if (Object.keys(emigrantsPerYear).length > 0) {
    const years = Object.keys(emigrantsPerYear);
    setAvailableYears(years);  // Populate the year dropdown
  }
}, [emigrantsPerYear]); 

  // Subscribe to Firestore real-time updates
 useEffect(() => {
  const collections = [
    "allCountries",
    "age",
    "sex",
    "occupation",
    "education",
    "civilStatus",
    "placeOfOrigin",
  ];

  const unsubscribers = [];

  const calculateTotals = (snapshots) => {
    let total = 0;
    snapshots.forEach((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        for (const key in data) {
          const value = data[key];
          if (typeof value === "number") total += value;
        }
      });
    });
    setTotalEmigrants(total);
  };

  const snapshots = [];
  collections.forEach((colName) => {
    const unsubscribe = onSnapshot(collection(db, colName), (snapshot) => {
      snapshots.push(snapshot);
      calculateTotals(snapshots);
    });
    unsubscribers.push(unsubscribe);
  });

  return () => unsubscribers.forEach((unsub) => unsub());
}, []);


useEffect(() => {
  const collections = [
    "allCountries",
    "age",
    "sex",
    "occupation",
    "education",
    "civilStatus",
    "placeOfOrigin",
  ];

  const unsubscribers = [];
  const emigrantsByYear = {};  // Object to store emigrants per year

  const calculateEmigrantsPerYear = (snapshots) => {
    snapshots.forEach((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        const year = data.year;  // Get the year from each document
        const emigrants = data.count || 0;  // Get the count of emigrants (which is a number)

        console.log("Processing Document:", doc.id);  // Log the document ID for debugging
        console.log("Year:", year);  // Log the year
        console.log("Emigrants Count:", emigrants);  // Log the emigrants count

        if (year) {
          // Add emigrants to the corresponding year
          if (!emigrantsByYearTemp[year]) {
            emigrantsByYearTemp[year] = 0;  // Initialize if year doesn't exist
          }
          emigrantsByYearTemp[year] += emigrants;  // Add emigrants to the sum for that year
        }
      });
    });

    console.log("Aggregated Emigrants by Year:", emigrantsByYearTemp);  // Log the aggregation

    // After processing all snapshots, set the state
    setEmigrantsPerYear(emigrantsByYearTemp);  // Set the final aggregated data
  };

  collections.forEach((colName) => {
    const unsubscribe = onSnapshot(collection(db, colName), (snapshot) => {
      calculateEmigrantsPerYear([snapshot]);  // Pass the current snapshot directly to the function
    });
    unsubscribers.push(unsubscribe);
  });

  return () => unsubscribers.forEach((unsub) => unsub());  // Clean up on unmount
}, []);

//maleand female

// Fetch real-time male and female data
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "sex"), (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setSexData(data);
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  const fetchUsersCount = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const publicUsers = snapshot.docs.filter(doc => doc.data().role === "public");
      setTotalUsers(publicUsers.length);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };
  fetchUsersCount();
}, []);
  // Compute stats dynamically from Firestore data
  const totalMale = sexData
    .filter((r) => r.sex === "Male")
    .reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const totalFemale = sexData
    .filter((r) => r.sex === "Female")
    .reduce((sum, r) => sum + (Number(r.count) || 0), 0);

  const stats = {
    // Total emigrants equals male + female
    totalEmigrants: totalMale + totalFemale,
    totalMale,
    totalFemale,
    totalUsers,
  };

  // Greeting message
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

// Bar Chart to display Emigrants Per Year
const renderChart = () => {
  // Filter data if a year is selected
  const filteredData = selectedYear
    ? { [selectedYear]: emigrantsPerYear[selectedYear] }
    : emigrantsPerYear;

  const chartData = {
    labels: Object.keys(filteredData), // The years (only selected year if filtered)
    datasets: [
      {
        label: 'Total Emigrants per Year',
        data: Object.values(filteredData), // The emigrant counts
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();  // Format as thousands, e.g., "1,000"
          },
        },
      },
    },
  };

  // Return either Line or Bar chart depending on the selected chart type
  return chartType === "line" ? (
    <Line data={chartData} options={chartOptions} />
  ) : (
    <Bar data={chartData} options={chartOptions} />
  );
};

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <SideBar />

      {/* Main Content */}
      <main className="main-content" style={{ paddingTop: "100px" }}>
        <AdminNavbar />

        {/* Admin Greeting and Role */}
        <div className="admin-greeting" style={{ marginBottom: "30px" }}>
          <p className="text-2xl font-bold pt-14">
            {getGreeting()}, {currentUser?.displayName || currentUser?.email || 'Admin'}!
          </p>
          <p className="text-lg">{userRole || 'Welcome to Admin Dashboard!'}</p>
        </div>

        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.totalEmigrants.toLocaleString()}</h3>
              <p className="stat-label">Total Emigrants</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.totalUsers.toLocaleString()}</h3>
              <p className="stat-label">Total Users</p>
            </div>
          </div>

          {/* Total Male */}
            <div className="stat-card">
              <div className="stat-icon male">
                <Mars size={24} /> {/* ♂ Male Icon */}
              </div>
              <div className="stat-content">
                <h3 className="stat-value">{stats.totalMale.toLocaleString()}</h3>
                <p className="stat-label">Total Male</p>
              </div>
            </div>

            {/* Total Female */}
            <div className="stat-card">
              <div className="stat-icon female">
                <Venus size={24} /> {/* ♀ Female Icon */}
              </div>
              <div className="stat-content">
                <h3 className="stat-value">{stats.totalFemale.toLocaleString()}</h3>
                <p className="stat-label">Total Female</p>
              </div>
          </div>
        </div>
          <div className="filters-section">
            {/* Year Dropdown */}
           

            {/* Chart Type Dropdown */}
            <div className="filter-group">
              <label>Chart Type:</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>

          {/* Visualization Section */}
          <div className="visualization-container" style={{ marginTop: "50px" }}>
            {renderChart()}  {/* Call the chart rendering function */}
          </div>
                    
</main>
    </div>
  );
};

export default AdminDashboard;
