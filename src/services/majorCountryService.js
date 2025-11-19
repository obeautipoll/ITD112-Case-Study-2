export const getMajorCountryData = (records, topN = 5) => {
  if (!records || !records.length) return { labels: [], datasets: [] };

  const years = Array.from(new Set(records.map(r => r.year))).sort();
  const datasetsMap = {}; // keyed by country

  years.forEach(year => {
    // Get all records for this year
    const yearRecords = records.filter(r => r.year === year);

    // Map countries and counts
    const countryCounts = yearRecords.map(r => ({
      country: r.country,
      count: Number(r.count) || 0
    }));

    // Sort descending
    countryCounts.sort((a, b) => b.count - a.count);

    // Top N countries + Others
    const topCountries = countryCounts.slice(0, topN);
    const othersCount = countryCounts.slice(topN).reduce((sum, c) => sum + c.count, 0);
    if (othersCount > 0) topCountries.push({ country: "Others", count: othersCount });

    // Add counts to datasets
    topCountries.forEach(c => {
      if (!datasetsMap[c.country]) {
        datasetsMap[c.country] = {
          label: c.country,
          data: [],
          backgroundColor: `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 0.5)`
        };
      }
      datasetsMap[c.country].data.push(c.count);
    });
  });

  return {
    labels: years,
    datasets: Object.values(datasetsMap),
  };
};