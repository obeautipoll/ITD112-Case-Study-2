import React from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you are using react-router-dom v6+
import "../../../styles/sidebar.css"; // Optional: for component-specific styling
import { doSignOut } from "../../../firebase/auth"; // Firebase Sign-Out function

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

  // Function to handle navigation
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
        navigate("/dashboard");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "history":
        navigate("/history");
        break;
      case "notifications":
        navigate("/notifications");
        break;
      default:
        console.error("Unknown navigation page:", page);
    }
  };

  // Helper function to check if the current path matches
  const isActive = (path) => window.location.pathname === path ? "active" : "";

  return (
    <nav className="sidebar-container">
      <div className="sidebar-content-wrapper">
        <div className="logo">
          <h1>Emigration</h1>
          <p>Data Management System</p>
        </div>
        
        <ul className="sidebar-links">
          <li 
            className={isActive("/dashboard")}
            onClick={() => handleNavigation("dashboard")}
          >
            <i className="fas fa-home"></i> Dashboard
          </li>
          <li 
            className={isActive("/settings")}
            onClick={() => handleNavigation("settings")}
          >
            <i className="fa-solid fa-gear"></i> Settings
          </li>

         

          <li
            onClick={() => handleNavigation("logout")}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default SideBar;
