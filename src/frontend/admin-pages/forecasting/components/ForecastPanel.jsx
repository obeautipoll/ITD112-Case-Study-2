import React from "react";
import "./ForecastPanel.css";
import "../../../../styles-admin/forecast.css";

const ForecastPanel = ({ title, metrics = [] }) => {
  return (
    <div className="forecast-panel">
      <h4>{title}</h4>
      <div className="forecast-metrics-grid">
        {metrics.map((metric) => (
          <div key={metric.label} className="forecast-metric-card">
            <div className="forecast-metric-label">{metric.label}</div>
            <div className="forecast-metric-value">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForecastPanel;
