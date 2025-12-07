// scripts/normalizeEmigrants.js
import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const CSV_PATH = path.resolve(process.cwd(), 'data', 'emigrants.csv'); // adjust as needed

const normalizeName = (value = '') =>
  value.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '').trim();

const loadJson = async (file) =>
  JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8'));

const warn = (msg, row) => console.warn(`[WARN] ${msg} | row: ${JSON.stringify(row)}`);

(async () => {
  const [municipalities, provinces, regions] = await Promise.all([
    loadJson('municipalities.json'),
    loadJson('provinces.json'),
    loadJson('regions.json'),
  ]);

  const municipalityByCode = new Map(
    municipalities.map((m) => [m.municipality_code.padStart(6, '0'), m]),
  );
  const municipalityByName = new Map(
    municipalities.map((m) => [normalizeName(m.municipality_name), m]),
  );
  const provinceByCode = new Map(
    provinces.map((p) => [p.province_code.padStart(4, '0'), p]),
  );
  const regionNameByCode = new Map(
    regions.map((r) => [r.region_code.padStart(2, '0'), r.region_name]),
  );

  const csvRaw = await fs.readFile(CSV_PATH, 'utf8');
  const { data } = Papa.parse(csvRaw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const cleaned = [];

  for (const row of data) {
    const codeRaw = row['Municipality Code']?.trim();
    const nameRaw = row['Municipality Name']?.trim();
    const year = Number.parseInt(row['Year'], 10);
    const count = Number(row['Count']);

    if (!codeRaw && !nameRaw) {
      warn('Missing municipality code and name', row);
      continue;
    }
    if (Number.isNaN(year) || Number.isNaN(count)) {
      warn('Invalid numeric value', row);
      continue;
    }

    const munCode = (codeRaw || '').padStart(6, '0');
    const munFromCode = municipalityByCode.get(munCode);
    const munFromName = municipalityByName.get(normalizeName(nameRaw));
    const municipality = munFromCode ?? munFromName;

    if (!municipality) {
      warn('Municipality not found in reference data', row);
      continue;
    }

    const provinceCode = (municipality.province_code ?? munCode.slice(0, 4)).padStart(4, '0');
    const province = provinceByCode.get(provinceCode);
    if (!province) {
      warn('Province not found in reference data', row);
      continue;
    }

    const regionName =
      regionNameByCode.get(province.region_code?.padStart(2, '0') || '') ??
      `Unknown region (${province.region_code || 'n/a'})`;

    cleaned.push({
      region: regionName,
      province: province.province_name ?? 'Unknown province',
      municipality: municipality.municipality_name ?? nameRaw ?? 'Unknown municipality',
      year,
      count,
    });
  }

  console.log(JSON.stringify(cleaned, null, 2));
  console.log(`\nRecords ready for persistence: ${cleaned.length}`);
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
