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

export const normalizeSexSeries = (series, statsOverride) => {
  const maleValues = series.map((item) => clampNumber(item.male));
  const femaleValues = series.map((item) => clampNumber(item.female));

  const maleStats = statsOverride?.male || createStats(maleValues);
  const femaleStats = statsOverride?.female || createStats(femaleValues);

  const normalized = series.map((item) => ({
    year: item.year,
    male: (clampNumber(item.male) - maleStats.min) / maleStats.range,
    female: (clampNumber(item.female) - femaleStats.min) / femaleStats.range,
  }));

  return {
    normalized,
    stats: {
      male: maleStats,
      female: femaleStats,
    },
  };
};

export const denormalizeSexValue = (value, stats) => {
  return value * stats.range + stats.min;
};

export const createSexSequences = (normalizedRecords, lookback) => {
  const xs = [];
  const ys = [];

  for (let index = lookback; index < normalizedRecords.length; index += 1) {
    const window = normalizedRecords
      .slice(index - lookback, index)
      .map((entry) => [entry.male, entry.female]);
    xs.push(window);
    ys.push([normalizedRecords[index].male, normalizedRecords[index].female]);
  }

  return { xs, ys };
};

export const prepareSexDataset = (series, lookback, statsOverride) => {
  const sorted = [...series]
    .filter((item) => item.year !== undefined)
    .sort((a, b) => Number(a.year) - Number(b.year));

  if (!sorted.length) {
    return {
      xs: [],
      ys: [],
      normalizedRecords: [],
      stats: {
        male: { min: 0, max: 1, range: 1 },
        female: { min: 0, max: 1, range: 1 },
      },
      years: [],
      rawRecords: [],
      lookback,
    };
  }

  const { normalized, stats } = normalizeSexSeries(sorted, statsOverride);
  const { xs, ys } = createSexSequences(normalized, lookback);

  return {
    xs,
    ys,
    normalizedRecords: normalized,
    stats,
    years: sorted.map((item) => item.year),
    rawRecords: sorted.map((item) => ({
      year: item.year,
      male: clampNumber(item.male),
      female: clampNumber(item.female),
    })),
    lookback,
  };
};
