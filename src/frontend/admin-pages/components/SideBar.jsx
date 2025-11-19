import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../../../styles-admin/sidebar-admin.css";
import { doSignOut } from "../../../firebase/auth";
const SideBar = () => {
  const navigate = useNavigate();
 // Function to handle logout
  const handleLogout = () => {
    // Perform sign out
    doSignOut()
      .then(() => {
        // Clear session data (like tokens)
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Navigate to the login page
        navigate("/login");
      })
      .catch((err) => {
        console.error("Logout failed", err);
      });
  };
  const handleNavigation = (page) => {
    switch (page) {
      case "logout":
        // Confirm before logging out
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) {
          handleLogout(); // Call the logout function
          alert("You have been logged out successfully!");
        }
        break;
      case "dashboard":
        navigate("/adashboard");
        break;
      case "monitor":
        navigate("/aemigrants");
        break;
      case "users":
        navigate("/amanageusers");
        break;
      case "analytics":
        navigate("/aanalytics");
        break;
      
      case "settings":
        navigate("/asettings");
        break;
      default:
        console.error("Unknown navigation page:", page);
    }
  };

  return (
    <nav className="sidebar-container">
      <div className="sidebar-content-wrapper">
        <div className="logo">
          <h1>Emigration </h1>
          <p>Data Management System</p>
        </div>
        
        <ul className="sidebar-links">
          <li 
            className={window.location.pathname === "/adashboard" ? "active" : ""}
            onClick={() => handleNavigation("dashboard")}
          >
            <i className="fa-solid fa-gauge"></i> Dashboard
          </li>

          <li 
            className={window.location.pathname === "/aemigrants" ? "active" : ""}
            onClick={() => handleNavigation("monitor")}
          >
            <i className="fa-solid fa-file-lines"></i> Emigrants List
          </li>

          <li 
            className={window.location.pathname === "/amanageusers" ? "active" : ""}
            onClick={() => handleNavigation("users")}
          >
            <i className="fa-solid fa-users"></i> User Management
          </li>

          <li 
            className={window.location.pathname === "/aanalytics" ? "active" : ""}
            onClick={() => handleNavigation("analytics")}
          >
            <i className="fa-solid fa-chart-bar"></i> Reports & Analytics
          </li>

          

          <li 
            className={window.location.pathname === "/asettings" ? "active" : ""}
            onClick={() => handleNavigation("settings")}
          >
            <i className="fa-solid fa-gear"></i> Settings
          </li>

         <li onClick={() => handleNavigation("logout")}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </li>
        </ul>
      </div>
    </nav>
  );
};

export default SideBar;
