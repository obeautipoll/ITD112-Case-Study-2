import {
  prepareCategoryDataset,
  denormalizeValue,
} from "../utils/dataPreparation";
import { FORECAST_CATEGORIES } from "../utils/categoryConfig";
import { db } from "../../../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

export const LSTM_MODEL_STORAGE_KEY = "emigrant-lstm-model";
export const LSTM_METADATA_KEY = "emigrant-lstm-metadata";
export const LSTM_LOADED_FLAG = "emigrant-lstm-loaded";
const DEFAULT_CATEGORY = "sex";
const CATEGORY_COLLECTIONS = {
  sex: "sex",
  civilStatus: "civilStatus",
};
const CIVIL_STATUS_FIELDS =
  FORECAST_CATEGORIES.civilStatus.fields.map((field) => field.key);

const ensureTensorflow = () => {
  if (typeof window === "undefined" || !window.tf) {
    throw new Error(
      "TensorFlow.js is not available. Please ensure the CDN script is loaded."
    );
  }
  return window.tf;
};

const getModelKey = (category = DEFAULT_CATEGORY) =>
  `${LSTM_MODEL_STORAGE_KEY}-${category}`;
const getMetadataKey = (category = DEFAULT_CATEGORY) =>
  `${LSTM_METADATA_KEY}-${category}`;
const getLoadedFlagKey = (category = DEFAULT_CATEGORY) =>
  `${LSTM_LOADED_FLAG}-${category}`;

const coerceYear = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const aggregateSexRecords = (records = []) => {
  const grouped = {};
  records.forEach((record) => {
    const year = coerceYear(record.year);
    if (year === null) return;
    if (!grouped[year]) {
      grouped[year] = { year, male: 0, female: 0 };
    }
    if (typeof record.male === "number" || typeof record.female === "number") {
      grouped[year].male += Number(record.male) || 0;
      grouped[year].female += Number(record.female) || 0;
      return;
    }
    if (!record.sex) return;
    const normalizedSex = String(record.sex).toLowerCase();
    if (normalizedSex === "male") {
      grouped[year].male += Number(record.count) || 0;
    } else if (normalizedSex === "female") {
      grouped[year].female += Number(record.count) || 0;
    }
  });
  return Object.values(grouped).sort((a, b) => a.year - b.year);
};

const aggregateCivilStatusRecords = (records = []) => {
  const grouped = {};
  records.forEach((record) => {
    const year = coerceYear(record.year);
    if (year === null) return;
    if (!grouped[year]) {
      grouped[year] = { year };
      CIVIL_STATUS_FIELDS.forEach((field) => {
        grouped[year][field] = 0;
      });
    }
    CIVIL_STATUS_FIELDS.forEach((field) => {
      grouped[year][field] += Number(record[field]) || 0;
    });
  });
  return Object.values(grouped).sort((a, b) => a.year - b.year);
};

const fetchCategorySeriesFromFirestore = async (
  category = DEFAULT_CATEGORY
) => {
  try {
    const collectionName =
      CATEGORY_COLLECTIONS[category] || CATEGORY_COLLECTIONS[DEFAULT_CATEGORY];
    const snapshot = await getDocs(collection(db, collectionName));
    const rawRecords = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (category === "civilStatus") {
      return aggregateCivilStatusRecords(rawRecords);
    }
    return aggregateSexRecords(rawRecords);
  } catch (error) {
    console.error(
      `Failed to fetch ${category} time-series from Firestore:`,
      error
    );
    return [];
  }
};

const forecastFuturePeriods = async ({
  model,
  normalizedRecords,
  lookback,
  stats,
  startYear,
  periods,
  fields,
}) => {
  const tf = ensureTensorflow();
  const forecast = [];
  const fieldCount = fields.length;
  let rollingWindow = normalizedRecords
    .slice(-lookback)
    .map((entry) => fields.map((field) => entry[field]));
  let currentYear = startYear;

  for (let index = 0; index < periods; index += 1) {
    const inputTensor = tf.tensor3d([rollingWindow]);
    const nextValueTensor = model.predict(inputTensor);
    const [nextValues] = await nextValueTensor.array();

    const predictedValues = {};
    const normalizedNext = {};
    fields.forEach((field, fieldIndex) => {
      const denormalized = denormalizeValue(nextValues[fieldIndex], stats[field]);
      predictedValues[field] = denormalized;
      normalizedNext[field] =
        (denormalized - stats[field].min) / stats[field].range;
    });

    currentYear += 1;
    forecast.push({
      year: currentYear,
      values: predictedValues,
    });

    rollingWindow = [
      ...rollingWindow.slice(1),
      fields.map((field) => normalizedNext[field]),
    ];

    tf.dispose([inputTensor, nextValueTensor]);
  }

  return forecast;
};

const toIndices = (count, offset = 0) =>
  Array.from({ length: count }, (_, index) => index + offset);

const computeMetricsFromSeries = (chartSeries, fields, indices = []) => {
  if (!indices || !indices.length) return null;
  const subset = indices
    .map((idx) => chartSeries[idx])
    .filter((entry) => entry);
  if (!subset.length) return null;

  const perField = {};
  fields.forEach((field) => {
    const mae =
      subset.reduce(
        (sum, entry) =>
          sum + Math.abs(entry.actual[field] - entry.predicted[field]),
        0
      ) / subset.length;

    const rmse = Math.sqrt(
      subset.reduce((sum, entry) => {
        const diff = entry.actual[field] - entry.predicted[field];
        return sum + diff * diff;
      }, 0) / subset.length
    );

    const avgActual =
      subset.reduce((sum, entry) => sum + entry.actual[field], 0) /
        subset.length || 1;
    const accuracy = Math.max(0, (1 - mae / avgActual) * 100);

    perField[field] = {
      mae: Number(mae.toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
      accuracy: Number(accuracy.toFixed(2)),
    };
  });

  const avgAccuracy =
    fields.reduce(
      (sum, field) => sum + (perField[field]?.accuracy || 0),
      0
    ) / fields.length;

  return {
    perField,
    avgAccuracy: Number(avgAccuracy.toFixed(2)),
  };
};

const tensorFromIndices3d = (tf, dataset, indices) =>
  indices && indices.length
    ? tf.tensor3d(indices.map((idx) => dataset.xs[idx]))
    : null;

const tensorFromIndices2d = (tf, dataset, indices) =>
  indices && indices.length
    ? tf.tensor2d(indices.map((idx) => dataset.ys[idx]))
    : null;

export const trainLSTMModel = async ({
  dataset,
  splitConfig = {},
  epochs = 50,
  futurePeriods = 10,
  learningRate = 0.001,
  units = [50, 50],
  dropout = [0.2, 0.2],
}) => {
  const tf = ensureTensorflow();
  const prepared =
    dataset ||
    prepareCategoryDataset(
      (splitConfig && splitConfig.records) || [],
      ["male", "female"],
      splitConfig?.lookback || 3
    );
  const fields = prepared.fields || ["male", "female"];
  const fieldCount = fields.length;
  const totalSamples = prepared.xs.length;

  if (totalSamples < 2) {
    throw new Error("Not enough historical data to train the model.");
  }

  const fallbackIndices = toIndices(totalSamples);
  const trainIndices =
    splitConfig.trainIndices?.length > 0
      ? splitConfig.trainIndices
      : fallbackIndices.slice(0, Math.floor(totalSamples * 0.7));
  const valIndices =
    splitConfig.valIndices?.length > 0
      ? splitConfig.valIndices
      : fallbackIndices.slice(
          trainIndices.length,
          trainIndices.length + Math.max(1, Math.floor(totalSamples * 0.15))
        );
  const used = new Set([...trainIndices, ...valIndices]);
  const testIndices =
    splitConfig.testIndices?.length > 0
      ? splitConfig.testIndices
      : fallbackIndices.filter((idx) => !used.has(idx));

  if (!trainIndices.length) {
    throw new Error("Training split is empty. Adjust your dataset configuration.");
  }

  const trainXs = tensorFromIndices3d(tf, prepared, trainIndices);
  const trainYs = tensorFromIndices2d(tf, prepared, trainIndices);
  const valXs = tensorFromIndices3d(tf, prepared, valIndices);
  const valYs = tensorFromIndices2d(tf, prepared, valIndices);
  const testXs = tensorFromIndices3d(tf, prepared, testIndices);
  const testYs = tensorFromIndices2d(tf, prepared, testIndices);
  const fullXsTensor = tf.tensor3d(prepared.xs);

  const layerUnits =
    Array.isArray(units) && units.length
      ? units.map((value) => Math.max(1, Math.round(Number(value) || 50)))
      : [50, 50];

  const dropoutRates = layerUnits.map((_, index) => {
    if (!Array.isArray(dropout)) return 0;
    const rate = Number(dropout[index]);
    if (Number.isNaN(rate) || rate <= 0) return 0;
    return Math.max(0, Math.min(rate, 0.8));
  });

  const model = tf.sequential();
  layerUnits.forEach((unitCount, index) => {
    const isFirst = index === 0;
    const isLast = index === layerUnits.length - 1;
    model.add(
      tf.layers.lstm({
        units: unitCount,
        inputShape: isFirst ? [prepared.lookback, fieldCount] : undefined,
        returnSequences: !isLast,
      })
    );

    const dropRate = dropoutRates[index] || 0;
    if (dropRate > 0) {
      model.add(tf.layers.dropout({ rate: dropRate }));
    }
  });
  model.add(tf.layers.dense({ units: fieldCount }));

  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: "meanSquaredError",
    metrics: ["mae"],
  });

  await model.fit(trainXs, trainYs, {
    epochs,
    batchSize: 4,
    verbose: 0,
    validationData: valXs ? [valXs, valYs] : undefined,
  });

  const predictionTensor = model.predict(fullXsTensor);
  const predictions = await predictionTensor.array();

  const chartSeries = prepared.years.slice(prepared.lookback).map((year, index) => {
    const actual = prepared.rawRecords[index + prepared.lookback];
    const predictionRow = predictions[index];
    const actualValues = {};
    const predictedValues = {};
    fields.forEach((field, fieldIndex) => {
      actualValues[field] = actual[field];
      predictedValues[field] = denormalizeValue(
        predictionRow[fieldIndex],
        prepared.stats[field]
      );
    });
    return {
      year,
      actual: actualValues,
      predicted: predictedValues,
    };
  });

  const validationMetrics = computeMetricsFromSeries(
    chartSeries,
    fields,
    valIndices
  );
  const testMetrics = computeMetricsFromSeries(chartSeries, fields, testIndices);
  const trainingMetrics = computeMetricsFromSeries(
    chartSeries,
    fields,
    trainIndices
  );
  const primaryMetrics = validationMetrics || testMetrics || trainingMetrics;

  const futureForecast = await forecastFuturePeriods({
    model,
    normalizedRecords: prepared.normalizedRecords,
    lookback: prepared.lookback,
    stats: prepared.stats,
    startYear: prepared.years[prepared.years.length - 1],
    periods: futurePeriods,
    fields,
  });

  tf.dispose([
    trainXs,
    trainYs,
    ...(valXs ? [valXs, valYs] : []),
    ...(testXs ? [testXs, testYs] : []),
    fullXsTensor,
    predictionTensor,
  ]);

  return {
    model,
    metrics: primaryMetrics?.perField ?? {},
    avgAccuracy: primaryMetrics?.avgAccuracy ?? 0,
    validation: validationMetrics,
    test: testMetrics,
    chartSeries,
    futureForecast,
    dataset: prepared,
    configUsed: {
      lookback: prepared.lookback,
      units: layerUnits,
      dropout: dropoutRates,
      epochs,
      fields,
    },
  };
};

export const saveBestModelArtifacts = async ({
  model,
  metadata,
  category = DEFAULT_CATEGORY,
}) => {
  const tf = ensureTensorflow();
  await model.save(`localstorage://${getModelKey(category)}`);
  localStorage.setItem(getMetadataKey(category), JSON.stringify(metadata));
};

export const loadSavedMetadata = (category = DEFAULT_CATEGORY) => {
  const raw = localStorage.getItem(getMetadataKey(category));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse LSTM metadata:", error);
    return null;
  }
};

export const loadSavedModel = async (category = DEFAULT_CATEGORY) => {
  const tf = ensureTensorflow();
  return tf.loadLayersModel(`localstorage://${getModelKey(category)}`);
};

export const generateForecastFromModel = async ({
  category = DEFAULT_CATEGORY,
  model,
  metadata,
  futurePeriods = 10,
}) => {
  const tf = ensureTensorflow();
  const fields = metadata.fields || Object.keys(metadata.stats || {});

  let sourceRecords =
    Array.isArray(metadata?.rawRecords) && metadata.rawRecords.length
      ? metadata.rawRecords
      : null;

  if (!sourceRecords) {
    sourceRecords = await fetchCategorySeriesFromFirestore(
      metadata?.category || category
    );
  }

  if (!sourceRecords || !sourceRecords.length) {
    throw new Error(
      `No historical records available for ${
        FORECAST_CATEGORIES[metadata?.category || category]?.label || category
      }.`
    );
  }

  const dataset = prepareCategoryDataset(
    sourceRecords,
    fields,
    metadata.lookback,
    metadata.stats
  );

  const xsTensor = tf.tensor3d(dataset.xs);
  const predictionTensor = model.predict(xsTensor);
  const predictions = await predictionTensor.array();

  const chartSeries = dataset.years.slice(dataset.lookback).map((year, index) => {
    const actualRecord = dataset.rawRecords[index + dataset.lookback];
    const predictedValues = {};
    const predictionRow = predictions[index];
    fields.forEach((field, fieldIndex) => {
      predictedValues[field] = denormalizeValue(
        predictionRow[fieldIndex],
        dataset.stats[field]
      );
    });
    const actualValues = {};
    fields.forEach((field) => {
      actualValues[field] = actualRecord[field];
    });
    return {
      year,
      actual: actualValues,
      predicted: predictedValues,
    };
  });

  const futureForecast = await forecastFuturePeriods({
    model,
    normalizedRecords: dataset.normalizedRecords,
    lookback: dataset.lookback,
    stats: dataset.stats,
    startYear: dataset.years[dataset.years.length - 1],
    periods: futurePeriods,
    fields,
  });

  tf.dispose([xsTensor, predictionTensor]);
  return {
    chartSeries,
    futureForecast,
    fields,
    fieldLabels: metadata.fieldLabels,
    category: metadata.category || category,
  };
};

export const exportModelArtifacts = async (category = DEFAULT_CATEGORY) => {
  const metadata = loadSavedMetadata(category);
  if (!metadata) {
    throw new Error("No saved model available to download.");
  }

  const tf = ensureTensorflow();
  let savedArtifacts = null;
  const model = await tf.loadLayersModel(
    `localstorage://${getModelKey(category)}`
  );
  await model.save({
    async save(artifacts) {
      savedArtifacts = artifacts;
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: artifacts.modelTopology ? "JSON" : "UNKNOWN",
          weightDataBytes: artifacts.weightData
            ? artifacts.weightData.byteLength
            : 0,
        },
      };
    },
  });
  model.dispose();

  if (!savedArtifacts) {
    throw new Error("Unable to serialize the LSTM model.");
  }

  const payload = {
    category,
    metadata,
    model: {
      topology: savedArtifacts.modelTopology,
      weightSpecs: savedArtifacts.weightSpecs,
      weightData: savedArtifacts.weightData
        ? Array.from(new Uint8Array(savedArtifacts.weightData))
        : [],
    },
  };

  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  const filename = `emigrant-lstm-model-${category}.json`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const importModelArtifacts = async (fileList) => {
  const tf = ensureTensorflow();
  if (!fileList || !fileList.length) {
    throw new Error("Select the exported model package (.json).");
  }

  const file = fileList[0];
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Uploaded model package is not valid JSON.");
  }

  if (!parsed?.model || !parsed?.metadata) {
    throw new Error("Model package is missing required fields.");
  }

  const category = parsed.category || parsed.metadata.category || DEFAULT_CATEGORY;

  const handler = {
    async load() {
      return {
        modelTopology: parsed.model.topology,
        weightSpecs: parsed.model.weightSpecs,
        weightData: parsed.model.weightData
          ? new Uint8Array(parsed.model.weightData).buffer
          : new ArrayBuffer(0),
      };
    },
  };

  const model = await tf.loadLayersModel(handler);
  await model.save(`localstorage://${getModelKey(category)}`);
  model.dispose();

  localStorage.setItem(
    getMetadataKey(category),
    JSON.stringify(parsed.metadata)
  );
  return { category, metadata: parsed.metadata };
};

export const deleteSavedModel = async (category = DEFAULT_CATEGORY) => {
  const tf = ensureTensorflow();
  try {
    await tf.io.removeModel(`localstorage://${getModelKey(category)}`);
  } catch (error) {
    console.warn("No stored LSTM model to delete or removal failed.", error);
  }
  localStorage.removeItem(getMetadataKey(category));
  clearModelLoadedFlag(category);
};

export const markModelLoaded = (category = DEFAULT_CATEGORY) => {
  localStorage.setItem(getLoadedFlagKey(category), Date.now().toString());
};

export const clearModelLoadedFlag = (category = DEFAULT_CATEGORY) => {
  localStorage.removeItem(getLoadedFlagKey(category));
};

export const isModelLoaded = (category = DEFAULT_CATEGORY) =>
  Boolean(localStorage.getItem(getLoadedFlagKey(category)));
