import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import ForecastPanel from "./ForecastPanel";
import {
  loadSavedMetadata,
  saveBestModelArtifacts,
  trainLSTMModel,
  importModelArtifacts,
  exportModelArtifacts,
  deleteSavedModel,
  markModelLoaded,
  clearModelLoadedFlag,
  isModelLoaded,
} from "../models/lstmModel";
import {
  defaultSexSeries,
  defaultCivilStatusSeries,
} from "../utils/fallbackData";
import { prepareCategoryDataset } from "../utils/dataPreparation";
import {
  FORECAST_CATEGORIES,
  DEFAULT_CATEGORY,
  getCategoryFields,
} from "../utils/categoryConfig";
import { subscribeToAggregatedData } from "../../../../services/realtimeDataService";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const defaultConfigs = [
  { id: 1, lookback: 3, units: "50,50", dropout: "0.2,0.2" },
  { id: 2, lookback: 4, units: "64,32", dropout: "0.3,0.2" },
  { id: 3, lookback: 5, units: "80,40", dropout: "0.2,0.15" },
  { id: 4, lookback: 3, units: "96,48", dropout: "0.25,0.2" },
  { id: 5, lookback: 6, units: "64,64", dropout: "0.2,0.2" },
];

const CATEGORY_FALLBACKS = {
  sex: defaultSexSeries,
  civilStatus: defaultCivilStatusSeries,
};

const parseNumberList = (raw = "", allowZero = false) => {
  const cleaned = raw
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((value) => !Number.isNaN(value));
  return cleaned.filter((value) => (allowZero ? value >= 0 : value > 0));
};

const formatNumber = (value) =>
  typeof value === "number"
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : value;

const formatBestConfig = (config) => {
  if (!config) return "--";
  const units = config.units?.map((value) => value).join("-");
  const dropout = config.dropout
    ?.map((value) => Number(value).toFixed(2))
    .join("-");
  return `L${config.lookback} | Units ${units} | Dropout ${dropout}`;
};

const getDefaultSeries = (category) =>
  CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.sex;

const averageMetric = (metrics = {}, key) => {
  const values = Object.values(metrics);
  if (!values.length) return 0;
  const total = values.reduce((sum, metric) => sum + (metric?.[key] || 0), 0);
  return total / values.length;
};

const LSTMTrainer = ({ category: categoryProp, onCategoryChange }) => {
  const initialCategory = categoryProp || DEFAULT_CATEGORY;
  const [localCategory, setLocalCategory] = useState(initialCategory);
  const category = categoryProp ?? localCategory;
  const [series, setSeries] = useState(getDefaultSeries(category));
  const [configs, setConfigs] = useState(defaultConfigs);
  const [epochs, setEpochs] = useState(50);
  const [status, setStatus] = useState("");
  const [training, setTraining] = useState(false);
  const [error, setError] = useState("");
  const [cancelRequested, setCancelRequested] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [bestModelSummary, setBestModelSummary] = useState(null);
  const [bestModelConfirmed, setBestModelConfirmed] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(isModelLoaded(category));
  const [latestMetadata, setLatestMetadata] = useState(() =>
    loadSavedMetadata(category)
  );
  const uploadInputRef = useRef(null);

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

  const activeFields = getCategoryFields(category);
  const fieldKeys = activeFields.map((field) => field.key);
  const fieldLabelsMap = activeFields.reduce((acc, field) => {
    acc[field.key] = field.label;
    return acc;
  }, {});

  useEffect(() => {
    setStatus("");
    setError("");
    setProcessingMessage("");
    setHistory([]);
    setBestModelSummary(null);
    setBestModelConfirmed(false);
    setLatestMetadata(loadSavedMetadata(category));
    setModelLoaded(isModelLoaded(category));
    setSeries(getDefaultSeries(category));

    const unsubscribe = subscribeToAggregatedData(category, (data) => {
      if (data && data.length) {
        const sorted = [...data].sort((a, b) => Number(a.year) - Number(b.year));
        setSeries(
          sorted.map((entry) => {
            const normalized = { year: entry.year };
            activeFields.forEach(({ key }) => {
              normalized[key] = entry[key] || 0;
            });
            return normalized;
          })
        );
      } else {
        setSeries(getDefaultSeries(category));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [category]);

  const seriesChartData = useMemo(
    () => ({
      labels: series.map((entry) => entry.year),
      datasets: activeFields.map((field, index) => ({
        label: field.label,
        data: series.map((entry) => entry[field.key] || 0),
        borderColor: field.color || `hsl(${(index * 90) % 360} 70% 50%)`,
        backgroundColor: field.color
          ? `${field.color}33`
          : `hsl(${(index * 90) % 360} 70% 80%)`,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 3,
      })),
    }),
    [series, activeFields]
  );

  const modelComparisonData = useMemo(() => {
    const validRows = history.filter(
      (row) => typeof row.avgAccuracy === "number" && row.metrics
    );
    if (!validRows.length) return null;
    return {
      labels: validRows.map((row) => row.model),
      datasets: [
        {
          label: "Accuracy (%)",
          data: validRows.map((row) => row.avgAccuracy),
          backgroundColor: "rgba(37, 99, 235, 0.75)",
        },
        {
          label: "MAE (Avg)",
          data: validRows.map((row) => averageMetric(row.metrics, "mae")),
          backgroundColor: "rgba(249, 115, 22, 0.75)",
        },
        {
          label: "RMSE (Avg)",
          data: validRows.map((row) => averageMetric(row.metrics, "rmse")),
          backgroundColor: "rgba(16, 185, 129, 0.75)",
        },
      ],
    };
  }, [history]);

  const modelComparisonOptions = {
    responsive: true,
    interaction: { intersect: false },
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const handleCategoryChange = (event) => {
    const nextCategory = event.target.value;
    propagateCategoryChange(nextCategory);
  };

  const handleConfigChange = (id, field, value) => {
    setConfigs((prev) =>
      prev.map((config) =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  const sanitizeUnits = (rawUnits) => {
    const parsed = parseNumberList(rawUnits).map((value) =>
      Math.max(1, Math.round(value))
    );
    return parsed.length ? parsed : [50, 50];
  };

  const sanitizeDropouts = (rawDropouts, targetLength) => {
    const parsed = parseNumberList(rawDropouts, true).map((value) =>
      Math.max(0, Math.min(Number(value.toFixed ? value : value), 0.8))
    );
    if (parsed.length >= targetLength) {
      return parsed.slice(0, targetLength);
    }
    return [
      ...parsed,
      ...Array(targetLength - parsed.length).fill(0.2),
    ];
  };

  const runHyperparameterTraining = async () => {
    if (series.length < 5) {
      setError("Need at least 5 years of data to train the LSTM.");
      return;
    }

    const validConfigs = configs.filter(
      (config) =>
        Number(config.lookback) >= 2 && (config.units || "").trim().length > 0
    );

    if (!validConfigs.length) {
      setError("Provide at least one valid model configuration.");
      return;
    }

    setTraining(true);
    setStatus("Training model candidates...");
    setError("");
    setCancelRequested(false);
    setProcessingMessage("Processing configurations...");
    setHistory([]);
    setBestModelSummary(null);
    setBestModelConfirmed(false);

    const results = [];
    let bestResult = null;

    try {
      for (let index = 0; index < validConfigs.length; index += 1) {
        const config = validConfigs[index];
        const parsedLookback = Number(config.lookback);
        const lookback = Number.isNaN(parsedLookback)
          ? 3
          : Math.max(2, parsedLookback);
        const units = sanitizeUnits(config.units);
        const dropout = sanitizeDropouts(config.dropout || "", units.length);

        if (cancelRequested) break;

        try {
          setStatus(
            `Training model #${index + 1} of ${validConfigs.length} (lookback ${lookback})...`
          );

          const dataset = prepareCategoryDataset(series, fieldKeys, lookback);
          const totalSamples = dataset.xs.length;
          if (totalSamples < 6) {
            throw new Error("Dataset split requires at least 6 sequences.");
          }

          const testCount = Math.max(1, Math.floor(totalSamples * 0.15));
          const trainValCount = totalSamples - testCount;
          if (trainValCount < 2) {
            throw new Error("Not enough samples for training/validation split.");
          }

          const trainValIndices = Array.from(
            { length: trainValCount },
            (_, idx) => idx
          );
          const testIndices = Array.from(
            { length: testCount },
            (_, idx) => trainValCount + idx
          );

          const foldCount = Math.min(3, trainValCount);
          const foldSize = Math.max(1, Math.floor(trainValCount / foldCount));

          const foldRuns = [];
          for (let fold = 0; fold < foldCount; fold += 1) {
            const foldStart = fold * foldSize;
            const foldEnd =
              fold === foldCount - 1
                ? trainValIndices.length
                : Math.min(trainValIndices.length, foldStart + foldSize);
            const valIndices = trainValIndices.slice(foldStart, foldEnd);
            const trainIndices = trainValIndices.filter(
              (idx) => idx < foldStart || idx >= foldEnd
            );

            if (cancelRequested) break;

            const run = await trainLSTMModel({
              dataset,
              splitConfig: { trainIndices, valIndices, testIndices },
              epochs: Number(epochs) || 50,
              futurePeriods: 10,
              units,
              dropout,
            });
            foldRuns.push(run);
            run.model.dispose();

            if (cancelRequested) break;
          }

          if (cancelRequested) break;

          if (!foldRuns.length) {
            throw new Error("No successful fold runs for this configuration.");
          }

          const averagedMetrics = {};
          fieldKeys.forEach((field) => {
            const metricEntries = foldRuns.map(
              (run) => run.metrics[field] || {}
            );
            const fieldCount = metricEntries.length;
            const mae =
              metricEntries.reduce((sum, metric) => sum + (metric.mae || 0), 0) /
              fieldCount;
            const rmse =
              metricEntries.reduce((sum, metric) => sum + (metric.rmse || 0), 0) /
              fieldCount;
            const accuracy =
              metricEntries.reduce(
                (sum, metric) => sum + (metric.accuracy || 0),
                0
              ) / fieldCount;
            averagedMetrics[field] = {
              mae: Number(mae.toFixed(2)),
              rmse: Number(rmse.toFixed(2)),
              accuracy: Number(accuracy.toFixed(2)),
            };
          });

          const avgAccuracy =
            foldRuns.reduce((sum, run) => sum + (run.avgAccuracy || 0), 0) /
            foldRuns.length;

          results.push({
            model: `#${config.id}`,
            lookback,
            units: units.join(", "),
            dropout: dropout.map((value) => value.toFixed(2)).join(", "),
            metrics: averagedMetrics,
            avgAccuracy: Number(avgAccuracy.toFixed(2)),
          });

          if (config.id !== 1) {
            if (!bestResult || avgAccuracy > bestResult.score) {
              bestResult = {
                score: avgAccuracy,
                dataset,
                trainValIndices,
                testIndices,
                config: {
                  id: config.id,
                  lookback,
                  units,
                  dropout,
                },
              };
            }
          }
        } catch (innerError) {
          console.error(innerError);
          const emptyMetrics = fieldKeys.reduce((acc, field) => {
            acc[field] = { mae: Number.NaN, rmse: Number.NaN, accuracy: Number.NaN };
            return acc;
          }, {});
          results.push({
            model: `#${config.id}`,
            lookback,
            units: units.join(", "),
            dropout: dropout.map((value) => value.toFixed(2)).join(", "),
            metrics: emptyMetrics,
            avgAccuracy: Number.NaN,
          });
        }
      }
    } finally {
      setTraining(false);
    }

    setHistory(results);

    if (cancelRequested) {
      setStatus("Training cancelled.");
      setProcessingMessage("");
      setTraining(false);
      setCancelRequested(false);
      return;
    }

    if (bestResult) {
      const finalRun = await trainLSTMModel({
        dataset: bestResult.dataset,
        splitConfig: {
          trainIndices: bestResult.trainValIndices,
          valIndices: [],
          testIndices: bestResult.testIndices,
        },
        epochs: Number(epochs) || 50,
        futurePeriods: 10,
        units: bestResult.config.units,
        dropout: bestResult.config.dropout,
      });

      const metadata = {
        category,
        fields: fieldKeys,
        fieldLabels: fieldLabelsMap,
        lookback: finalRun.dataset.lookback,
        stats: finalRun.dataset.stats,
        rawRecords: finalRun.dataset.rawRecords,
        metrics: finalRun.metrics,
        avgAccuracy: finalRun.avgAccuracy,
        bestConfig: bestResult.config,
        trainedAt: new Date().toISOString(),
      };

      await saveBestModelArtifacts({
        model: finalRun.model,
        metadata,
        category,
      });
      finalRun.model.dispose();

      setLatestMetadata(metadata);
      clearModelLoadedFlag(category);
      setModelLoaded(false);
      setBestModelSummary({
        modelLabel: `#${bestResult.config.id}`,
        config: bestResult.config,
        metrics: finalRun.metrics,
        avgAccuracy: bestResult.score,
        fieldLabels: fieldLabelsMap,
      });
      setStatus(
        `Saved best model (lookback ${bestResult.config.lookback}, avg validation accuracy ${bestResult.score.toFixed(
          2
        )}%). Confirm the best model below, then click "Load Model" to push it to the forecasting dashboard.`
      );
      window.dispatchEvent(new Event("lstmModelUpdated"));
    } else {
      setStatus(
        "No eligible model (excluding configuration #1) achieved a valid score."
      );
    }

    setProcessingMessage("");
  };

  const handleLoadModel = () => {
    if (!latestMetadata) {
      setError("No saved model available to load.");
      return;
    }
    if (bestModelSummary && !bestModelConfirmed) {
      setError("Confirm the highlighted best model before loading.");
      return;
    }
    markModelLoaded(category);
    setModelLoaded(true);
    setStatus(
      `Loaded the saved ${FORECAST_CATEGORIES[category].label} model. Forecasting dashboards now reflect these weights.`
    );
    window.dispatchEvent(new Event("lstmModelUpdated"));
  };

  const triggerUploadDialog = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  const handleUploadModel = async (event) => {
    const { files } = event.target;
    if (!files || !files.length) return;
    setProcessingMessage("");
    setStatus("Uploading model artifacts...");
    setError("");
    try {
      const { category: uploadedCategory, metadata } =
        await importModelArtifacts(files);
      propagateCategoryChange(uploadedCategory);
      setLatestMetadata(metadata);
      markModelLoaded(uploadedCategory);
      setModelLoaded(true);
      setBestModelSummary(null);
      setBestModelConfirmed(true);
      setStatus(
        `Model uploaded and activated for ${FORECAST_CATEGORIES[uploadedCategory].label}.`
      );
      window.dispatchEvent(new Event("lstmModelUpdated"));
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError?.message || "Failed to upload the model package.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadModel = async () => {
    setError("");
    try {
      await exportModelArtifacts(category);
      setStatus("Model download started.");
    } catch (downloadError) {
      console.error(downloadError);
      setError(downloadError?.message || "Unable to download the model.");
    }
  };

  const handleDeleteModel = async () => {
    setError("");
    await deleteSavedModel(category);
    clearModelLoadedFlag(category);
    setLatestMetadata(null);
    setModelLoaded(false);
    setStatus("Model deleted");
    window.dispatchEvent(new Event("lstmModelUpdated"));
  };

  const handleCancelTraining = () => {
    if (!training) return;
    setCancelRequested(true);
    setProcessingMessage("Cancelling...");
  };

  const loadedMetrics =
    modelLoaded && latestMetadata?.metrics
      ? [
          ...activeFields.flatMap(({ key, label }) => [
            {
              label: `${label} MAE`,
              value: formatNumber(latestMetadata.metrics[key]?.mae),
            },
            {
              label: `${label} Accuracy`,
              value: latestMetadata.metrics[key]
                ? `${formatNumber(latestMetadata.metrics[key].accuracy)}%`
                : "--",
            },
          ]),
          {
            label: "Avg Accuracy",
            value: latestMetadata.avgAccuracy
              ? `${formatNumber(latestMetadata.avgAccuracy)}%`
              : "--",
          },
        ]
      : null;

  const showCategorySelector = !onCategoryChange;

  return (
    <div className="forecast-stack">
      {showCategorySelector && (
        <div className="forecast-toolbar">
          <div className="forecast-toolbar__title">
            <h4>Forecast Category</h4>
            <p className="forecast-description">
              Choose one category to analyze. Switching immediately reloads the historical
              view and any saved models.
            </p>
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
      )}

      <div className="forecast-panel">
        <h4>Historical Distribution</h4>
        <Line
          data={seriesChartData}
          options={{
            responsive: true,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "top" } },
            scales: { y: { beginAtZero: true } },
          }}
        />
      </div>

      <div className="forecast-panel forecast-panel--column">
        <h4>Hyperparameter Candidates</h4>
        <div className="forecast-table-wrapper">
          <table className="forecast-table forecast-table--medium">
            <thead>
              <tr>
                <th>Model</th>
                <th>Lookback</th>
                <th>LSTM Units</th>
                <th>Dropout</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id}>
                  <td>#{config.id}</td>
                  <td>
                    <input
                      className="forecast-input"
                      type="number"
                      min="2"
                      value={config.lookback}
                      onChange={(event) =>
                        handleConfigChange(config.id, "lookback", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="forecast-input"
                      type="text"
                      value={config.units}
                      onChange={(event) =>
                        handleConfigChange(config.id, "units", event.target.value)
                      }
                      placeholder="50,50"
                    />
                  </td>
                  <td>
                    <input
                      className="forecast-input"
                      type="text"
                      value={config.dropout}
                      onChange={(event) =>
                        handleConfigChange(config.id, "dropout", event.target.value)
                      }
                      placeholder="0.2,0.2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="forecast-grid">
          <label className="forecast-field">
            <span>Epochs</span>
            <input
              className="forecast-input"
              type="number"
              min="10"
              value={epochs}
              onChange={(event) => setEpochs(event.target.value)}
            />
          </label>
        </div>

        <div className="forecast-controls">
          <button
            className="forecast-button forecast-button--primary"
            onClick={runHyperparameterTraining}
            disabled={training}
          >
            {training ? "Training Models..." : "Train"}
          </button>
          <button
            className="forecast-button forecast-button--secondary"
            onClick={handleLoadModel}
            disabled={training}
          >
            Load Model
          </button>
          <button
            className="forecast-button forecast-button--secondary"
            onClick={triggerUploadDialog}
            disabled={training}
          >
            Upload Model
          </button>
          <button
            className="forecast-button forecast-button--secondary"
            onClick={handleDownloadModel}
            disabled={training}
          >
            Download Model
          </button>
          <button
            className="forecast-button forecast-button--secondary"
            onClick={handleDeleteModel}
            disabled={training}
          >
            Delete Model
          </button>
          {training && (
            <button
              className="forecast-button forecast-button--secondary"
              onClick={handleCancelTraining}
            >
              Cancel Training
            </button>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleUploadModel}
          />
        </div>

        {status && <p className="forecast-status">{status}</p>}
        {error && <p className="forecast-error">{error}</p>}
        {processingMessage && (
          <p className="forecast-status">{processingMessage}</p>
        )}
      </div>

      {loadedMetrics && (
        <ForecastPanel title="Loaded Model Snapshot" metrics={loadedMetrics} />
      )}

      <div className="forecast-panel">
        <h4>Model Selection Results</h4>
        <div className="forecast-table-wrapper">
          <table className="forecast-table forecast-table--wide">
            <thead>
              <tr>
                <th>Model</th>
                <th>Lookback</th>
                <th>Units</th>
                <th>Dropout</th>
                {activeFields.map((field) => (
                  <React.Fragment key={field.key}>
                    <th>{field.label} MAE</th>
                    <th>{field.label} RMSE</th>
                    <th>{field.label} Acc</th>
                  </React.Fragment>
                ))}
                <th>Avg Acc</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={4 + activeFields.length * 3 + 1}>
                    Train at least one model to populate this table.
                  </td>
                </tr>
              )}
              {history.map((row) => (
                <tr key={row.model}>
                  <td>{row.model}</td>
                  <td>{row.lookback}</td>
                  <td>{row.units}</td>
                  <td>{row.dropout}</td>
                  {activeFields.map((field) => (
                    <React.Fragment key={`${row.model}-${field.key}`}>
                      <td>
                        {typeof row.metrics?.[field.key]?.mae === "number"
                          ? formatNumber(row.metrics[field.key].mae)
                          : "--"}
                      </td>
                      <td>
                        {typeof row.metrics?.[field.key]?.rmse === "number"
                          ? formatNumber(row.metrics[field.key].rmse)
                          : "--"}
                      </td>
                      <td>
                        {typeof row.metrics?.[field.key]?.accuracy === "number"
                          ? `${row.metrics[field.key].accuracy.toFixed(2)}%`
                          : "--"}
                      </td>
                    </React.Fragment>
                  ))}
                  <td>
                    {typeof row.avgAccuracy === "number"
                      ? `${row.avgAccuracy.toFixed(2)}%`
                      : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="forecast-panel">
        <h4>Model Comparison (Accuracy, MAE, RMSE)</h4>
        {modelComparisonData ? (
          <Bar data={modelComparisonData} options={modelComparisonOptions} />
        ) : (
          <p className="forecast-description">
            Train at least one model to populate the comparison chart.
          </p>
        )}
      </div>

      {bestModelSummary && (
        <div className="forecast-panel">
          <h4>Best Model Candidate</h4>
          <p className="forecast-description">
            Model {bestModelSummary.modelLabel} achieved the best validation accuracy (
            {formatNumber(bestModelSummary.avgAccuracy)}%). Review its
            configuration below, confirm it, then click <strong>Load Model</strong> to
            push the weights to the forecasting dashboard.
          </p>
          <div className="forecast-grid">
            <div className="forecast-field">
              <span>Lookback</span>
              <strong>{bestModelSummary.config.lookback}</strong>
            </div>
            <div className="forecast-field">
              <span>LSTM Units</span>
              <strong>{bestModelSummary.config.units.join(", ")}</strong>
            </div>
            <div className="forecast-field">
              <span>Dropout</span>
              <strong>
                {bestModelSummary.config.dropout
                  .map((value) => Number(value).toFixed(2))
                  .join(", ")}
              </strong>
            </div>
            {activeFields.map((field) => (
              <div className="forecast-field" key={field.key}>
                <span>
                  {field.label} (MAE / RMSE / Accuracy)
                </span>
                <strong>
                  {formatNumber(bestModelSummary.metrics[field.key]?.mae)} /{" "}
                  {formatNumber(bestModelSummary.metrics[field.key]?.rmse)} /{" "}
                  {bestModelSummary.metrics[field.key]
                    ? `${formatNumber(
                        bestModelSummary.metrics[field.key].accuracy
                      )}%`
                    : "--"}
                </strong>
              </div>
            ))}
          </div>
          {!bestModelConfirmed ? (
            <button
              className="forecast-button forecast-button--primary"
              onClick={() => {
                setBestModelConfirmed(true);
                setModelLoaded(false);
                setStatus(
                  "Best model confirmed. Click \"Load Model\" to activate it."
                );
              }}
            >
              Confirm Best Model
            </button>
          ) : (
            <p className="forecast-status">
              Best model confirmed. Click <strong>Load Model</strong> to apply it to the
              dashboard.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LSTMTrainer;
