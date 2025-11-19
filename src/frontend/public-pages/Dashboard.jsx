import React from "react";
import "../../styles/students.css";
import SideBar from "../public-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";

// Import the admin Analytics component (just the JSX for charts)
import AnalyticsContent from "../public-pages/AnalyticsContent";

const Dashboard = () => {
  return (
    <div className="container dashboard-page">
      <SideBar />

      <div className="main-content" style={{ paddingTop: "100px" }}>
        <MainNavbar />

        {/* Analytics Section */}
        <div id="analytics-content">
          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
