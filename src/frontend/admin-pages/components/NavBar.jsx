import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import "../../../styles/navbar.css"

// Assuming the necessary styles (including the fixed positioning logic) 
// are correctly loaded from main-styles.css or a similar file in the parent component.

const AdminNavbar = () => {
    // Hooks for navigation and location tracking
    const location = useLocation();
    const navigate = useNavigate();

    // Mock user data (Replace with actual props or context data)
    const userName = "ThisIsNotYou";
    const userRole = "Administrator";
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
    const unreadNotifications = 11; // Mock count
    
    // --- Helper Functions ---

    // Determine the greeting based on time of day (Mock for display)
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // Determine the page title based on the current URL path
    const getPageTitle = (path) => {
        // Strip leading/trailing slashes and normalize the path
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "admin/dashboard":
                return "Dashboard";
            case "admin/monitor-complaints":
                return "Monitor Complaints";
            case "admin/usermanage":
                return "User Management";
            case "admin/analytics":
                return "Reports & Analytics";
            case "admin/notifications":
                return "Notifications";
            case "admin/settings":
                return "Settings";
            case "admin/login":
            case "login":
                return "Login"; // Should typically not see the navbar here, but included for completeness
            default:
                // Handle cases like nested routes (e.g., /history/123)
                if (normalizedPath.startsWith('dashboard/')) {
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    // Handler for the primary button click
    const handleFileComplaint = () => {
        navigate("/admin/monitoring"); 
    };

    // Handler for the notification bell
    const handleNotifications = () => {
        navigate("/admin-notifications"); 
    };

    // --- Render ---

    return (
        // The 'main-navbar' class implements the fixed/sticky position and clean styling
        <div className="main-navbar">
            
            {/* 1. PAGE TITLE GROUP (Greeting and Dynamic Title) */}
            <div className="page-title-group">
                <p className="welcome-greeting">{getGreeting()}, {userName}!</p> 
                {/* Dynamically set the page title */}
                <h1 className="page-title">{getPageTitle(location.pathname)}</h1>
            </div>

            {/* 2. HEADER ACTIONS (Button, Bell, User Info) */}
            <div className="header-actions">

                {/* Notification Bell/Indicator */}
               <button
  className="icon-button settings-icon"
  onClick={() => navigate("/asettings")}
  aria-label="Go to Settings"
>
  <i className="fas fa-cog"></i>
</button>

               
                
                {/* User Info (Profile Pill) */}
                <div className="user-info">
                    <div className="user-details">
                        <span className="name">{userName}</span>
                        <span className="role">{userRole}</span>
                    </div>
                    {/* CSS-styled initials badge */}
                    <div className="user-avatar-badge">
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
export default AdminNavbar;