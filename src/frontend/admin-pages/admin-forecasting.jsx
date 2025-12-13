import React, { useState } from "react";
import SideBar from "./components/SideBar";
import AdminNavbar from "./components/NavBar";
import LSTMTrainer from "./forecasting/components/LSTMTrainer";
import LSTMForecast from "./forecasting/components/LSTMForecast";
import {
  DEFAULT_CATEGORY,
  FORECAST_CATEGORIES,
} from "./forecasting/utils/categoryConfig";
import "../../styles-admin/forecast.css";

const AdminForecasting = () => {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);

  const handleCategoryChange = (event) => {
    const nextCategory =
      typeof event === "string" ? event : event?.target?.value || DEFAULT_CATEGORY;
    setCategory(nextCategory);
  };

  return (
    <div className="forecasting-container">
      <SideBar />
      <div style={{ flex: 1 }}>
        <AdminNavbar />
        <div className="forecast-page">
          <div className="forecast-intro">
            <h2 className="forecast-heading">Machine Learning Emigrant Forecasting</h2>
            <div className="forecast-toolbar forecast-toolbar--page">
              <div className="forecast-toolbar__title">
                <h4>Forecast Category</h4>
                <p className="forecast-description">Select one dataset to train and forecast.</p>
              </div>
              <label className="forecast-select forecast-select--inline">
                <span>Select Category</span>
                <select value={category} onChange={handleCategoryChange}>
                  {Object.entries(FORECAST_CATEGORIES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
 
          <section className="forecast-section">
            <h3 className="forecast-section-title">1. Training &amp; Data Validation</h3>
            <div className="forecast-section-content">
              <LSTMTrainer category={category} onCategoryChange={handleCategoryChange} />
            </div>
          </section>

          <section className="forecast-section">
            <h3 className="forecast-section-title">2. Forecast Dashboard</h3>
            <div className="forecast-section-content">
              <LSTMForecast category={category} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminForecasting;
