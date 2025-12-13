const clampNumber = (value) => {
  if (Number.isNaN(value) || value === undefined || value === null) return 0;
  return Number(value);
};

const createStats = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min, max, range };
};

const createEmptyStats = (fields) => {
  return fields.reduce((acc, field) => {
    acc[field] = { min: 0, max: 1, range: 1 };
    return acc;
  }, {});
};

export const denormalizeValue = (value, stats) => value * stats.range + stats.min;

const normalizeSeries = (series, fields, statsOverride) => {
  const stats = {};
  fields.forEach((field) => {
    if (statsOverride?.[field]) {
      stats[field] = statsOverride[field];
      return;
    }
    const values = series.map((item) => clampNumber(item[field]));
    stats[field] = createStats(values);
  });

  const normalized = series.map((item) => {
    const normalizedEntry = { year: item.year };
    fields.forEach((field) => {
      normalizedEntry[field] =
        (clampNumber(item[field]) - stats[field].min) / stats[field].range;
    });
    return normalizedEntry;
  });

  return { normalized, stats };
};

const createSequences = (normalizedRecords, fields, lookback) => {
  const xs = [];
  const ys = [];

  for (let index = lookback; index < normalizedRecords.length; index += 1) {
    const window = normalizedRecords
      .slice(index - lookback, index)
      .map((entry) => fields.map((field) => entry[field]));
    xs.push(window);
    ys.push(fields.map((field) => normalizedRecords[index][field]));
  }

  return { xs, ys };
};

export const prepareCategoryDataset = (
  series,
  fields,
  lookback,
  statsOverride
) => {
  const sorted = [...series]
    .filter((item) => item.year !== undefined)
    .sort((a, b) => Number(a.year) - Number(b.year));

  if (!sorted.length) {
    return {
      xs: [],
      ys: [],
      normalizedRecords: [],
      stats: createEmptyStats(fields),
      years: [],
      rawRecords: [],
      lookback,
      fields,
    };
  }

  const { normalized, stats } = normalizeSeries(sorted, fields, statsOverride);
  const { xs, ys } = createSequences(normalized, fields, lookback);

  return {
    xs,
    ys,
    normalizedRecords: normalized,
    stats,
    years: sorted.map((item) => item.year),
    rawRecords: sorted.map((item) => {
      const record = { year: item.year };
      fields.forEach((field) => {
        record[field] = clampNumber(item[field]);
      });
      return record;
    }),
    lookback,
    fields,
  };
};

export const prepareSexDataset = (series, lookback, statsOverride) =>
  prepareCategoryDataset(series, ["male", "female"], lookback, statsOverride);
