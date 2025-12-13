import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import "../../../../styles-admin/forecast.css";

import {
  generateForecastFromModel,
  loadSavedMetadata,
  loadSavedModel,
  isModelLoaded,
} from "../models/lstmModel";
import {
  FORECAST_CATEGORIES,
  DEFAULT_CATEGORY,
  getCategoryFields,
} from "../utils/categoryConfig";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LSTMForecast = ({ category: categoryProp, onCategoryChange }) => {
  const initialCategory = categoryProp || DEFAULT_CATEGORY;
  const [localCategory, setLocalCategory] = useState(initialCategory);
  const category = categoryProp ?? localCategory;
  const [metadata, setMetadata] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [tableField, setTableField] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const modelRef = useRef(null);
  const cancelForecastRef = useRef(false);

  const activeFields = metadata?.fields || getCategoryFields(category).map((field) => field.key);
  const fieldLabels = metadata?.fieldLabels || activeFields.reduce((acc, key) => {
    const configField = getCategoryFields(category).find((field) => field.key === key);
    acc[key] = configField ? configField.label : key;
    return acc;
  }, {});

  useEffect(() => {
    if (categoryProp && categoryProp !== localCategory) {
      setLocalCategory(categoryProp);
    }
  }, [categoryProp, localCategory]);

  const propagateCategoryChange = (nextCategory) => {
    if (onCategoryChange) {
      onCategoryChange(nextCategory);
    } else {
      setLocalCategory(nextCategory);
    }
  };

  useEffect(() => {
    setTableField("all");
  }, [category, metadata]);

  useEffect(() => {
    const loadArtifacts = async () => {
      const hasLoadedFlag = isModelLoaded(category);
      if (!hasLoadedFlag) {
        setMetadata(null);
        setForecastResult(null);
        setLoading(false);
        setError(
          `No ${FORECAST_CATEGORIES[category].label} model is loaded. Train or load a model in the training lab, then click "Load Model".`
        );
        if (modelRef.current) {
          modelRef.current.dispose();
          modelRef.current = null;
        }
        return;
      }

      const meta = loadSavedMetadata(category);
      setMetadata(meta);
      if (!meta) {
        setForecastResult(null);
        setLoading(false);
        setError(
          `Saved ${FORECAST_CATEGORIES[category].label} model metadata is missing. Please retrain and load the model.`
        );
        if (modelRef.current) {
          modelRef.current.dispose();
          modelRef.current = null;
        }
        return;
      }

      setLoading(true);
      setProcessingMessage("Loading saved model...");
      try {
        const newModel = await loadSavedModel(category);
        if (modelRef.current) {
          modelRef.current.dispose();
        }
        modelRef.current = newModel;
        setError("");
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load the pre-trained LSTM model. Please retrain in the training lab."
        );
        setForecastResult(null);
      } finally {
        setLoading(false);
        setProcessingMessage("");
      }
    };

    loadArtifacts();
    const handler = () => loadArtifacts();
    window.addEventListener("lstmModelUpdated", handler);

    return () => {
      window.removeEventListener("lstmModelUpdated", handler);
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, [category]);

  useEffect(() => {
    if (!metadata || !modelRef.current) {
      setForecastResult(null);
      setProcessing(false);
      setProcessingMessage("");
      if (!metadata) {
        setError(
          `No ${FORECAST_CATEGORIES[category].label} model found. Train and load a model first.`
        );
      }
      return;
    }

    if (
      !Array.isArray(metadata.rawRecords) ||
      metadata.rawRecords.length <= (metadata.lookback || 0)
    ) {
      setForecastResult(null);
      setProcessing(false);
      setProcessingMessage("");
      setError(
        "Saved LSTM model metadata is incomplete. Please retrain to refresh the stored artifacts."
      );
      return;
    }

    cancelForecastRef.current = false;
    setProcessing(true);
    setProcessingMessage("Generating forecast...");
    const runForecast = async () => {
      try {
        const result = await generateForecastFromModel({
          category,
          metadata,
          futurePeriods: 10,
          model: modelRef.current,
        });
        if (!cancelForecastRef.current) {
          setForecastResult(result);
          setError("");
        }
      } catch (forecastError) {
        console.error(forecastError);
        if (!cancelForecastRef.current) {
          setForecastResult(null);
          setError(
            "Unable to generate forecast from the saved model. Please retrain."
          );
          setProcessingMessage("Forecast failed.");
        }
      } finally {
        if (!cancelForecastRef.current) {
          setProcessing(false);
          setProcessingMessage("");
        }
      }
    };

    runForecast();
    return () => {
      cancelForecastRef.current = true;
    };
  }, [metadata, category]);

  const chartData = useMemo(() => {
    if (!forecastResult) return null;

    const fields = forecastResult.fields || [];
    if (!fields.length) return null;

    const actualMap = new Map(
      forecastResult.chartSeries.map((entry) => [entry.year, entry.actual])
    );
    const predictedMap = new Map(
      forecastResult.chartSeries.map((entry) => [entry.year, entry.predicted])
    );
    const futureMap = new Map(
      forecastResult.futureForecast.map((entry) => [entry.year, entry.values])
    );

    const historicalYears = forecastResult.chartSeries.map((entry) => entry.year);
    const futureYearsList = forecastResult.futureForecast.map((entry) => entry.year);
    const labels = [...historicalYears, ...futureYearsList];
    const lastHistoricalYear = historicalYears[historicalYears.length - 1];

    const datasets = [];
    fields.forEach((field, index) => {
      const fieldConfig = getCategoryFields(category).find(
        (item) => item.key === field
      );
      const color = fieldConfig?.color || `hsl(${(index * 90) % 360} 70% 50%)`;
      const predictedColor =
        fieldConfig?.predictedColor || `hsl(${(index * 90) % 360} 70% 70%)`;

      datasets.push({
        label: `${fieldLabels[field] || field} Actual`,
        data: labels.map((year) => actualMap.get(year)?.[field] ?? null),
        borderColor: color,
        backgroundColor: `${color}33`,
        tension: 0.25,
        pointRadius: 3,
      });

      datasets.push({
        label: `${fieldLabels[field] || field} Predicted`,
        data: labels.map((year) =>
          year > lastHistoricalYear
            ? futureMap.get(year)?.[field] ?? null
            : null
        ),
        borderColor: predictedColor,
        backgroundColor: `${predictedColor}40`,
        borderDash: [5, 5],
        tension: 0.25,
        pointRadius: labels.map((year) =>
          year > lastHistoricalYear ? 3 : 0
        ),
        pointHoverRadius: labels.map((year) =>
          year > lastHistoricalYear ? 4 : 0
        ),
      });
    });

    return {
      labels,
      datasets,
    };
  }, [forecastResult, category, fieldLabels]);

  const handleCancelForecast = () => {
    if (!processing) return;
    cancelForecastRef.current = true;
    setProcessing(false);
    setProcessingMessage("Forecast cancelled.");
  };

  const tableFieldOptions = [
    { value: "all", label: "All Fields" },
    ...activeFields.map((key) => ({
      value: key,
      label: fieldLabels[key] || key,
    })),
  ];

  const filteredFields =
    tableField === "all" ? activeFields : [tableField].filter((key) => activeFields.includes(key));

  const nextForecast =
    forecastResult && forecastResult.futureForecast.length
      ? forecastResult.futureForecast[0]
      : null;

  const showCategorySelector = !categoryProp;

  return (
    <div className="forecast-stack">
      {showCategorySelector && (
        <div className="forecast-panel forecast-panel--column">
          <h4>Forecast Category</h4>
          <label className="forecast-select">
            <span>Select Category</span>
            <select
              value={category}
              onChange={(event) => propagateCategoryChange(event.target.value)}
            >
              {Object.entries(FORECAST_CATEGORIES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="forecast-panel">
        <h4>{FORECAST_CATEGORIES[category].label} Forecast</h4>
        {metadata?.trainedAt && (
          <p className="forecast-description">
            Model trained on: {new Date(metadata.trainedAt).toLocaleString()}
          </p>
        )}
        {processing && (
          <button
            className="forecast-button forecast-button--secondary"
            onClick={handleCancelForecast}
          >
            Cancel Forecast
          </button>
        )}
        {processingMessage && (
          <p className="forecast-status">{processingMessage}</p>
        )}
        {loading && <p>Loading saved model...</p>}
        {!loading && !metadata && (
          <p>
            No saved model found for {FORECAST_CATEGORIES[category].label}. Please train
            and load a model in the Hyperparameter Training Lab.
          </p>
        )}
        {!loading && metadata && chartData && (
          <Line
            data={chartData}
            options={{
              responsive: true,
              interaction: { mode: "nearest", intersect: false },
              plugins: {
                legend: { position: "top" },
                title: { display: false },
              },
              scales: {
                x: {
                  ticks: {
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 45,
                  },
                },
                y: { beginAtZero: true },
              },
            }}
          />
        )}
        {error && <p className="forecast-error">{error}</p>}
      </div>

      {forecastResult && (
        <>
          <div className="forecast-panel">
            <h4>Future Forecast (10 year(s))</h4>
            <div className="forecast-table-wrapper">
              <table className="forecast-table forecast-table--wide">
                <thead>
                  <tr>
                    <th>Year</th>
                    {activeFields.map((field) => (
                      <th key={`future-header-${field}`}>
                        {fieldLabels[field]} (Predicted)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecastResult.futureForecast.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      {activeFields.map((field) => (
                        <td key={`${row.year}-${field}`}>
                          {Math.round(row.values[field]).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextForecast && (
              <p className="forecast-status">
                Next year projection ({nextForecast.year}):{" "}
                {activeFields
                  .map(
                    (field) =>
                      `${fieldLabels[field]} ≈ ${Math.round(
                        nextForecast.values[field]
                      ).toLocaleString()}`
                  )
                  .join(", ")}
                .
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LSTMForecast;
