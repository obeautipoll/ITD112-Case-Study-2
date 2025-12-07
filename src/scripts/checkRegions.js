// scripts/checkRegions.js
const fs = require("fs");
const geo = JSON.parse(fs.readFileSync("src/data/region.geojson"));
const regions = JSON.parse(fs.readFileSync("src/data/regions.json"));
const normalize = (s = "") =>
  s
    .toString()
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const regionAliasRules = [
  { canonical: "region i", keywords: ["region i", "ilocos region"] },
  { canonical: "region ii", keywords: ["region ii", "cagayan valley"] },
  { canonical: "region iii", keywords: ["region iii", "central luzon"] },
  { canonical: "region iv a", keywords: ["region iv a", "calabarzon"] },
  { canonical: "region iv b", keywords: ["region iv b", "mimaropa"] },
  { canonical: "region v", keywords: ["region v", "bicol region"] },
  { canonical: "region vi", keywords: ["region vi", "western visayas"] },
  { canonical: "region vii", keywords: ["region vii", "central visayas"] },
  { canonical: "region viii", keywords: ["region viii", "eastern visayas"] },
  { canonical: "region ix", keywords: ["region ix", "zamboanga peninsula"] },
  { canonical: "region x", keywords: ["region x", "northern mindanao"] },
  { canonical: "region xi", keywords: ["region xi", "davao region"] },
  { canonical: "region xii", keywords: ["region xii", "soccsksargen"] },
  { canonical: "region xiii", keywords: ["region xiii", "caraga"] },
  {
    canonical: "national capital region",
    keywords: ["ncr", "metro manila", "metropolitan manila", "national capital region"],
  },
  {
    canonical: "cordillera administrative region",
    keywords: ["car", "cordillera administrative region"],
  },
  {
    canonical: "autonomous region in muslim mindanao",
    keywords: [
      "autonomous region in muslim mindanao",
      "autonomous region of muslim mindanao",
      "bangsamoro",
      "barmm",
    ],
  },
];

const canonicalize = (str = "") => {
  const normalized = normalize(str);
  if (!normalized) return normalized;

  const alias = regionAliasRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );
  if (alias) return alias.canonical;

  const match = normalized.match(/region\s+([ivxlcdm]+|\d+)/);
  if (match) return `region ${match[1]}`.trim();

  return normalized;
};

const regionsByName = new Map(regions.map((r) => [canonicalize(r.region_name), r]));
const missing = geo.features
  .map((f) => f.properties?.REGION || f.properties?.NAME_1 || "")
  .filter((name) => !regionsByName.has(canonicalize(name)));

const extras = regions
  .map((r) => r.region_name)
  .filter(
    (name) =>
      !geo.features.some(
        (f) =>
          canonicalize(f.properties?.REGION || f.properties?.NAME_1 || "") === canonicalize(name)
      )
  );

console.log("GeoJSON missing in regions.json:", missing);
console.log("regions.json missing in GeoJSON:", extras);
