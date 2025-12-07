import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import ForecastPanel from "./ForecastPanel";
import {
  generateForecastFromModel,
  loadSavedMetadata,
  loadSavedModel,
} from "../models/lstmModel";
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

const formatNumber = (value) =>
  typeof value === "number"
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : value;

const LSTMForecast = () => {
  const [metadata, setMetadata] = useState(null);
  const [modelToken, setModelToken] = useState(0);
  const [forecastResult, setForecastResult] = useState(null);
  const [futureYears, setFutureYears] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const modelRef = useRef(null);

  useEffect(() => {
    const loadArtifacts = async () => {
      const meta = loadSavedMetadata();
      setMetadata(meta);
      if (!meta) {
        setForecastResult(null);
        setLoading(false);
        if (modelRef.current) {
          modelRef.current.dispose();
          modelRef.current = null;
        }
        return;
      }

      setLoading(true);
      try {
        const newModel = await loadSavedModel();
        if (modelRef.current) {
          modelRef.current.dispose();
        }
        modelRef.current = newModel;
        setModelToken(Date.now());
        setError("");
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load the pre-trained LSTM model. Please retrain in the trainer section."
        );
      } finally {
        setLoading(false);
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
  }, []);

  useEffect(() => {
    if (!metadata || !modelRef.current) {
      setForecastResult(null);
      return;
    }

    let cancelled = false;
    const runForecast = async () => {
      try {
        const result = await generateForecastFromModel({
          model: modelRef.current,
          metadata,
          futurePeriods: futureYears,
        });
        if (!cancelled) {
          setForecastResult(result);
          setError("");
        }
      } catch (forecastError) {
        console.error(forecastError);
        if (!cancelled) {
          setError(
            "Unable to generate forecast from the saved model. Please retrain."
          );
        }
      }
    };

    runForecast();
    return () => {
      cancelled = true;
    };
  }, [metadata, futureYears, modelToken]);

  const chartData = useMemo(() => {
    if (!forecastResult) return null;
    const historicalYears = forecastResult.chartSeries.map(
      (entry) => entry.year
    );
    const futureYearsList = forecastResult.futureForecast.map(
      (entry) => entry.year
    );
    const labels = [...historicalYears, ...futureYearsList];
    const actualMap = new Map(
      forecastResult.chartSeries.map((entry) => [entry.year, entry.actual])
    );
    const predictedMap = new Map(
      forecastResult.chartSeries.map((entry) => [entry.year, entry.predicted])
    );
    const futureMap = new Map(
      forecastResult.futureForecast.map((entry) => [entry.year, entry.predicted])
    );
    const lastHistoricalYear =
      forecastResult.chartSeries[forecastResult.chartSeries.length - 1]?.year;

    return {
      labels,
      datasets: [
        {
          label: "Actual Emigrants",
          data: labels.map((year) => actualMap.get(year) ?? null),
          borderColor: "#111827",
          backgroundColor: "rgba(17, 24, 39, 0.15)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Model Fit",
          data: labels.map((year) => predictedMap.get(year) ?? null),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          tension: 0.3,
          pointRadius: 3,
          borderDash: [5, 5],
        },
        {
          label: "Forecast",
          data: labels.map((year) =>
            year > lastHistoricalYear ? futureMap.get(year) ?? null : null
          ),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          tension: 0.3,
          pointRadius: 4,
          borderDash: [2, 2],
        },
      ],
    };
  }, [forecastResult]);

  const forecastMetrics = [
    { label: "MAE", value: metadata ? formatNumber(metadata.mae) : "--" },
    {
      label: "Accuracy",
      value: metadata ? `${metadata.accuracy.toFixed(2)}%` : "--",
    },
    {
      label: "Best Config",
      value: metadata?.bestConfig
        ? `L${metadata.bestConfig.lookback} | ${metadata.bestConfig.units.join(
            "-"
          )}`
        : "--",
    },
    {
      label: "Forecast Horizon",
      value: `${futureYears} year(s)`,
    },
  ];

  const handleFutureYearsChange = (event) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) return;
    const constrained = Math.max(1, Math.min(10, parsed));
    setFutureYears(constrained);
  };

  const nextForecast =
    forecastResult && forecastResult.futureForecast.length
      ? forecastResult.futureForecast[0]
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <ForecastPanel title="Forecast Snapshot" metrics={forecastMetrics} />

      <div className="forecast-panel">
        <h4>Forecast Controls</h4>
        <p style={{ marginBottom: "12px", color: "#4b5563" }}>
          Forecasting runs exclusively on the latest pre-trained LSTM model.
          Adjust the projection horizon (up to 10 years) and the system will
          reuse the stored weights—no retraining required.
        </p>
        <label
          style={{
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            maxWidth: "220px",
          }}
        >
          <span>Forecast Years</span>
          <input
            type="number"
            min="1"
            max="10"
            value={futureYears}
            onChange={handleFutureYearsChange}
          />
        </label>
        {metadata?.trainedAt && (
          <p style={{ marginTop: "12px", color: "#6b7280" }}>
            Model trained on: {new Date(metadata.trainedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="forecast-panel">
        <h4>LSTM Fit vs Forecast</h4>
        {loading && <p>Loading saved model...</p>}
        {!loading && !metadata && (
          <p>
            No saved model found. Please train a model in the Hyperparameter
            Training section before forecasting.
          </p>
        )}
        {!loading && metadata && chartData && (
          <Line
            data={chartData}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { position: "top" },
                title: { display: false },
              },
              scales: { y: { beginAtZero: true } },
            }}
          />
        )}
        {error && (
          <p style={{ marginTop: "12px", color: "#ef4444" }}>{error}</p>
        )}
      </div>

      {forecastResult && (
        <div className="forecast-panel">
          <h4>Forecast Projection ({futureYears} Year(s))</h4>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "420px",
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}
                >
                  <th style={{ padding: "10px" }}>Year</th>
                  <th style={{ padding: "10px" }}>Predicted Emigrants</th>
                </tr>
              </thead>
              <tbody>
                {forecastResult.futureForecast.map((entry) => (
                  <tr key={entry.year} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px" }}>{entry.year}</td>
                    <td style={{ padding: "10px" }}>
                      {formatNumber(Math.round(entry.predicted))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextForecast && (
            <p style={{ marginTop: "12px", color: "#2563eb" }}>
              Next year projection: {nextForecast.year} ≈{" "}
              {formatNumber(Math.round(nextForecast.predicted))} emigrants
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LSTMForecast;
