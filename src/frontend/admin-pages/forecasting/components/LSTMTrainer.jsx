import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import ForecastPanel from "./ForecastPanel";
import {
  loadSavedMetadata,
  loadTrainingHistory,
  persistTrainingHistory,
  saveBestModelArtifacts,
  trainLSTMModel,
} from "../models/lstmModel";
import { defaultSexSeries } from "../utils/fallbackData";
import { subscribeToAggregatedData } from "../../../../services/realtimeDataService";
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

const defaultConfigs = [
  { id: 1, lookback: 3, units: "64,32", dropout: "0.2,0.2" },
  { id: 2, lookback: 4, units: "80,40", dropout: "0.3,0.2" },
  { id: 3, lookback: 5, units: "96,48", dropout: "0.25,0.15" },
  { id: 4, lookback: 3, units: "128,64", dropout: "0.2,0.2" },
  { id: 5, lookback: 6, units: "64,32", dropout: "0.15,0.15" },
];

const createEmptyHistory = () =>
  Array.from({ length: 5 }).map((_, index) => ({
    model: `#${index + 1}`,
    lookback: "--",
    units: "--",
    dropout: "--",
    mae: "--",
    accuracy: "--",
  }));

const parseNumberList = (raw = "", allowZero = false) => {
  const cleaned = raw
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((value) => !Number.isNaN(value));
  if (!cleaned.length) return [];
  return cleaned.map((value) => {
    if (allowZero) return value;
    return value <= 0 ? 1 : value;
  });
};

const formatNumber = (value) =>
  typeof value === "number"
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : value;

const LSTMTrainer = () => {
  const [sexSeries, setSexSeries] = useState(defaultSexSeries);
  const [overallSeries, setOverallSeries] = useState([]);
  const [configs, setConfigs] = useState(defaultConfigs);
  const [epochs, setEpochs] = useState(200);
  const [status, setStatus] = useState("");
  const [training, setTraining] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => {
    const stored = loadTrainingHistory();
    return stored.length ? stored : createEmptyHistory();
  });
  const [bestMetadata, setBestMetadata] = useState(() => loadSavedMetadata());

  useEffect(() => {
    const unsubscribe = subscribeToAggregatedData("sex", (data) => {
      const sorted =
        data && data.length
          ? [...data].sort((a, b) => Number(a.year) - Number(b.year))
          : defaultSexSeries;
      setSexSeries(sorted);
      setOverallSeries(
        sorted.map((entry) => ({
          year: entry.year,
          total: (entry.male || 0) + (entry.female || 0),
        }))
      );
    });
    return unsubscribe;
  }, []);

  const sexChartData = useMemo(() => {
    if (!sexSeries.length) return null;
    return {
      labels: sexSeries.map((entry) => entry.year),
      datasets: [
        {
          label: "Male",
          data: sexSeries.map((entry) => entry.male || 0),
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.15)",
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: "Female",
          data: sexSeries.map((entry) => entry.female || 0),
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.15)",
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    };
  }, [sexSeries]);

  const handleConfigChange = (id, field, value) => {
    setConfigs((prev) =>
      prev.map((config) =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  const runHyperparameterSearch = async () => {
    if (!overallSeries.length) {
      setError("No emigrant data available for training.");
      return;
    }

    const validConfigs = configs.filter(
      (config) =>
        Number(config.lookback) >= 2 && (config.units || "").trim().length
    );

    if (!validConfigs.length) {
      setError("Provide at least one valid model configuration.");
      return;
    }

    setTraining(true);
    setStatus("Training models...");
    setError("");

    const values = overallSeries.map((entry) => entry.total);
    const years = overallSeries.map((entry) => entry.year);
    const results = [];
    let bestResult = null;

    try {
      for (let index = 0; index < validConfigs.length; index += 1) {
        const config = validConfigs[index];
        setStatus(`Training model #${index + 1} of ${validConfigs.length}...`);

        const lookback = Number(config.lookback);
        const units = parseNumberList(config.units);
        const dropout = parseNumberList(config.dropout || "0", true);
        try {
          const run = await trainLSTMModel({
            values,
            years,
            lookback,
            units: units.length ? units : [64, 32],
            dropout: dropout.length ? dropout : [0.2, 0.2],
            epochs: Number(epochs) || 200,
            futurePeriods: 5,
          });

          results.push({
            model: `#${index + 1}`,
            lookback,
            units: (units.length ? units : [64, 32]).join(", "),
            dropout: (dropout.length ? dropout : [0.2, 0.2]).join(", "),
            mae: run.mae,
            accuracy: run.accuracy,
          });

          if (!bestResult || run.accuracy > bestResult.accuracy) {
            if (bestResult?.model) {
              bestResult.model.dispose();
            }
            bestResult = {
              ...run,
              config: {
                lookback,
                units: units.length ? units : [64, 32],
                dropout: dropout.length ? dropout : [0.2, 0.2],
              },
            };
          } else {
            run.model.dispose();
          }
        } catch (innerError) {
          console.error(innerError);
          results.push({
            model: `#${index + 1}`,
            lookback,
            units: config.units,
            dropout: config.dropout,
            mae: "Error",
            accuracy: "--",
          });
        }
      }
    } finally {
      setTraining(false);
    }

    while (results.length < 5) {
      results.push({
        model: `#${results.length + 1}`,
        lookback: "--",
        units: "--",
        dropout: "--",
        mae: "--",
        accuracy: "--",
      });
    }

    setHistory(results);
    persistTrainingHistory(results);

    if (bestResult) {
      setStatus("Best model saved. Forecast panel now uses it.");
      const metadata = {
        lookback: bestResult.dataset.lookback,
        min: bestResult.dataset.min,
        max: bestResult.dataset.max,
        values: bestResult.dataset.values,
        years: bestResult.dataset.years,
        mae: bestResult.mae,
        accuracy: bestResult.accuracy,
        bestConfig: bestResult.config,
        trainedAt: new Date().toISOString(),
      };
      await saveBestModelArtifacts({
        model: bestResult.model,
        metadata,
      });
      bestResult.model.dispose();
      setBestMetadata(metadata);
      window.dispatchEvent(new Event("lstmModelUpdated"));
    } else {
      setStatus("Unable to train a valid model. Please adjust the configs.");
    }
  };

  const trainingMetrics = [
    {
      label: "Best Accuracy",
      value: bestMetadata ? `${bestMetadata.accuracy.toFixed(2)}%` : "--",
    },
    {
      label: "Best MAE",
      value: bestMetadata ? formatNumber(bestMetadata.mae) : "--",
    },
    {
      label: "Best Lookback",
      value: bestMetadata?.bestConfig?.lookback || "--",
    },
    {
      label: "Last Training",
      value: bestMetadata
        ? new Date(bestMetadata.trainedAt).toLocaleString()
        : "--",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <ForecastPanel title="Training Snapshot" metrics={trainingMetrics} />

      <div className="forecast-panel">
        <h4>Hyperparameter Configurations</h4>
        <p style={{ marginBottom: "16px", color: "#4b5563" }}>
          Update the lookback window and neuron layout for up to five candidate
          LSTM models. The trainer will evaluate each configuration, compare MAE
          and accuracy, and persist the highest-performing model for
          forecasting.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "600px",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px" }}>Model</th>
                <th style={{ padding: "10px" }}>Lookback</th>
                <th style={{ padding: "10px" }}>LSTM Units</th>
                <th style={{ padding: "10px" }}>Dropout</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>#{config.id}</td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="number"
                      min="2"
                      value={config.lookback}
                      onChange={(event) =>
                        handleConfigChange(
                          config.id,
                          "lookback",
                          event.target.value
                        )
                      }
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="text"
                      value={config.units}
                      onChange={(event) =>
                        handleConfigChange(
                          config.id,
                          "units",
                          event.target.value
                        )
                      }
                      placeholder="64,32"
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="text"
                      value={config.dropout}
                      onChange={(event) =>
                        handleConfigChange(
                          config.id,
                          "dropout",
                          event.target.value
                        )
                      }
                      placeholder="0.2,0.2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <label
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span>Epochs</span>
            <input
              type="number"
              min="50"
              value={epochs}
              onChange={(event) => setEpochs(event.target.value)}
            />
          </label>
        </div>
        <button
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={runHyperparameterSearch}
          disabled={training}
        >
          {training ? "Training Models..." : "Train & Save Best Model"}
        </button>
        {status && (
          <p style={{ marginTop: "12px", color: "#2563eb" }}>{status}</p>
        )}
        {error && (
          <p style={{ marginTop: "12px", color: "#ef4444" }}>{error}</p>
        )}
      </div>

  <div className="forecast-panel">
        <h4>Sex Distribution (Dataset Preview)</h4>
        {sexChartData ? (
          <Line
            data={sexChartData}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "top" } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        ) : (
          <p>Loading dataset preview...</p>
        )}
      </div>

      <div className="forecast-panel">
        <h4>Latest Hyperparameter Run</h4>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "640px",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px" }}>Model</th>
                <th style={{ padding: "10px" }}>Lookback</th>
                <th style={{ padding: "10px" }}>LSTM Neurons</th>
                <th style={{ padding: "10px" }}>Dropout</th>
                <th style={{ padding: "10px" }}>MAE</th>
                <th style={{ padding: "10px" }}>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {history.length
                ? history.map((row) => (
                    <tr key={row.model} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px" }}>{row.model}</td>
                      <td style={{ padding: "10px" }}>{row.lookback}</td>
                      <td style={{ padding: "10px" }}>{row.units}</td>
                      <td style={{ padding: "10px" }}>{row.dropout}</td>
                      <td style={{ padding: "10px" }}>
                        {typeof row.mae === "number"
                          ? formatNumber(row.mae)
                          : row.mae}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {typeof row.accuracy === "number"
                          ? `${row.accuracy.toFixed(2)}%`
                          : row.accuracy}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LSTMTrainer;
