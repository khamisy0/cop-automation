/**
 * Pricing Engine for Sale Request Module
 * Core logic for calculating sale prices
 */

import { ItemListRow, ProcessedItem, PriceListData, ProcessingError } from './types';

interface EuroRetailMap {
  [compositeKey: string]: number; // brand-mancode -> euroRetail
}

export interface PriceMatrixMap {
  lookup: { [compositeKey: string]: number }; // country-brand-euroRetail2dp -> unitRetail
  pricesByCountryBrand: { [countryBrand: string]: number[] }; // country-brand -> sorted available foreignRetailFOB values
}

// Convert a price number to a stable 2-decimal string for use in lookup keys.
// Handles floating-point quirks where 59.9 might be stored as 59.90000000001.
function priceKey(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

// Maps full country names to all abbreviations that may appear in Excel tab names
const COUNTRY_TAB_ALIASES: Record<string, string[]> = {
  qatar:   ['qat', 'qatar'],
  bahrain: ['bah', 'bahrain'],
  kuwait:  ['kwt', 'kuwait', 'kuw'],
  lebanon: ['leb', 'lebanon'],
  jordan:  ['jordan'],
  uae:     ['uae'],
  ksa:     ['ksa'],
  egypt:   ['egy', 'egypt'],
};

// Normalises any country representation (full name, abbreviation, numeric code)
// to the canonical full name that COUNTRY_CODES uses in the UI.
const COUNTRY_NORMALIZE: Record<string, string> = {
  // Full names (pass through, case-insensitive)
  qatar: 'Qatar', bahrain: 'Bahrain', kuwait: 'Kuwait',
  lebanon: 'Lebanon', jordan: 'Jordan', uae: 'UAE',
  ksa: 'KSA', egypt: 'Egypt',
  // 2-letter ISO codes (used in Price Matrix)
  qa: 'Qatar', bh: 'Bahrain', kw: 'Kuwait',
  lb: 'Lebanon', jo: 'Jordan', ae: 'UAE',
  sa: 'KSA', eg: 'Egypt',
  // 3-letter abbreviations (used in Price List tabs)
  qat: 'Qatar', bah: 'Bahrain', kwt: 'Kuwait',
  leb: 'Lebanon', egy: 'Egypt', jor: 'Jordan',
  // Numeric codes from COUNTRY_CODES (UI/ERP)
  '01': 'Lebanon', '02': 'UAE', '03': 'Kuwait',
  '04': 'Bahrain', '05': 'Jordan', '06': 'Qatar',
  '08': 'Egypt',   '10': 'KSA',
};

function normalizeCountry(raw: string): string {
  return COUNTRY_NORMALIZE[raw.trim().toLowerCase()] ?? raw.trim();
}

function findTabNameCaseInsensitive(
  priceData: PriceListData,
  brandCode: string,
  countryCode: string
): string | null {
  const brandMap: Record<string, string> = {
    '56': 'INT',
    'B6': 'UOMO',
    '55': 'CAL',
    '57': 'TEZ',
  };

  const brandLabel = (brandMap[brandCode] || brandCode).toLowerCase();
  const countryLower = countryCode.toLowerCase();
  const aliases = COUNTRY_TAB_ALIASES[countryLower] ?? [countryLower];

  for (const tab of Object.keys(priceData)) {
    const tabNorm = tab.trim().toLowerCase();
    if (!tabNorm.startsWith(brandLabel)) continue;
    const countryPart = tabNorm.slice(brandLabel.length).trim();
    if (aliases.includes(countryPart)) return tab;
  }

  return null;
}

/**
 * Process all items through pricing engine
 * Step 1: Get Euro Retail from database
 * Step 2: Get Local Retail from price matrix
 * Step 3: Convert discount decimal to column name
 * Step 4: Load correct price list tab
 * Step 5: Find sale price in discount column
 */
export async function processPricingForItems(
  items: ItemListRow[],
  priceListData: PriceListData,
  euroRetailMap: EuroRetailMap,
  priceMatrixMap: PriceMatrixMap,
  brand: string,
  country: string
): Promise<{ processedItems: ProcessedItem[]; errors: ProcessingError[] }> {
  const processedItems: ProcessedItem[] = [];
  const errors: ProcessingError[] = [];

  // Find tab case-insensitively
  const tabName = findTabNameCaseInsensitive(priceListData, brand, country);
  if (!tabName) {
    const availableTabs = Object.keys(priceListData).join(', ');
    errors.push({
      message: `Price list tab "${brand} ${country}" not found. Available tabs: ${availableTabs}`,
    });
    return { processedItems: [], errors };
  }

  const priceTab = priceListData[tabName];

  // Pre-flight: does the Price Matrix contain ANY rows for the requested country+brand?
  // If not, return one comprehensive diagnostic instead of the same error per item.
  const preflightCountry = normalizeCountry(country);
  const preflightCbKey = `${preflightCountry}-${brand}`;
  if (!priceMatrixMap.pricesByCountryBrand[preflightCbKey] || priceMatrixMap.pricesByCountryBrand[preflightCbKey].length === 0) {
    const allKeys = Object.keys(priceMatrixMap.pricesByCountryBrand);
    const allCountries = Array.from(new Set(allKeys.map((k) => k.split('-')[0]))).sort();
    const allBrands = Array.from(new Set(allKeys.map((k) => k.split('-').slice(1).join('-')))).sort();
    const brandsForCountry = allKeys.filter((k) => k.startsWith(`${preflightCountry}-`)).map((k) => k.slice(preflightCountry.length + 1));
    const countriesForBrand = allKeys.filter((k) => k.endsWith(`-${brand}`)).map((k) => k.slice(0, k.length - brand.length - 1));

    errors.push({
      message:
        `Price Matrix has no rows for Country="${preflightCountry}", Brand="${brand}". ` +
        `Brand codes that exist for ${preflightCountry}: [${brandsForCountry.join(', ') || 'none'}]. ` +
        `Countries that exist for Brand ${brand}: [${countriesForBrand.join(', ') || 'none'}]. ` +
        `All countries in DB: [${allCountries.join(', ')}]. ` +
        `All brand codes in DB: [${allBrands.join(', ')}]. ` +
        `Total Price Matrix rows: ${allKeys.length === 0 ? 0 : Object.values(priceMatrixMap.lookup).length}.`,
    });
    return { processedItems: [], errors };
  }

  items.forEach((item, index) => {
    const rowNum = index + 2; // +2 for header and 1-based indexing

    try {
      // Step 1: Get Euro Retail from database map (global: brand + mancode only)
      const euroRetailKey = `${brand}-${item.mancode}`;
      const euroRetail = euroRetailMap[euroRetailKey];
      if (euroRetail === undefined) {
        errors.push({
          row: rowNum,
          message: `Price not found in Euro Retail database for Brand: "${brand}", Mancode: "${item.mancode}"`,
        });
        return;
      }

      // Step 2: Get Local Retail from price matrix map
      const normCountry = normalizeCountry(country);
      const localRetailKey = `${normCountry}-${brand}-${priceKey(euroRetail)}`;
      const originalRetail = priceMatrixMap.lookup[localRetailKey];

      if (originalRetail === undefined) {
        const cbKey = `${normCountry}-${brand}`;
        const available = priceMatrixMap.pricesByCountryBrand[cbKey] ?? [];
        const availableMsg = available.length === 0
          ? `No Price Matrix rows exist for ${normCountry}/${brand}. Upload the Price Matrix for this country/brand first.`
          : `Available Foreign Retail/FOB values in Price Matrix for ${normCountry}/${brand}: ${available.join(", ")}`;
        errors.push({
          row: rowNum,
          message: `Local retail price not found in Price Matrix — Mancode: "${item.mancode}", Country: "${normCountry}", Brand: "${brand}", Euro Retail needed: ${euroRetail}. ${availableMsg}`,
        });
        return;
      }

      // Step 3: Convert discount decimal to discount column
      const discountPercent = Math.round(item.discount * 100);
      const discountColumn = String(discountPercent);

      // Step 4: Load correct price list tab (already done above)

      // Step 5: Find sale price in the discount column
      const originalRetailKey = String(originalRetail);
      if (!priceTab[originalRetailKey]) {
        errors.push({
          row: rowNum,
          message: `Local Retail price "${originalRetail}" not found in price list tab "${tabName}"`,
        });
        return;
      }

      const discountRow = priceTab[originalRetailKey];
      const salePrice = discountRow[discountColumn];

      if (salePrice === undefined) {
        errors.push({
          row: rowNum,
          message: `Discount column "${discountPercent}%" not found for Local Retail "${originalRetail}"`,
        });
        return;
      }

      // Build processed item
      const processedItem: ProcessedItem = {
        mancode: item.mancode,
        color: item.color,
        season: item.season,
        euroRetail,
        originalRetail,
        discount: item.discount,
        salePrice,
      };

      processedItems.push(processedItem);
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Error processing item: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  return { processedItems, errors };
}

/**
 * Build Euro Retail map from database
 * Maps brand-mancode -> euroRetail for fast O(1) lookup
 * Euro Retail is a global value — it does not vary by country.
 */
export function buildEuroRetailMap(
  euroRetailRecords: Array<{ brandCode: string; mancode: string; euroRetail: number }>
): EuroRetailMap {
  const map: EuroRetailMap = {};

  for (const record of euroRetailRecords) {
    const key = `${record.brandCode}-${record.mancode}`;
    map[key] = record.euroRetail;
  }

  return map;
}

export function buildPriceMatrixMap(
  priceMatrixRecords: Array<{
    country: string;
    brandCode: string;
    foreignRetailFOB: number;
    unitRetail: number;
  }>
): PriceMatrixMap {
  const lookup: { [k: string]: number } = {};
  const pricesByCountryBrand: { [k: string]: number[] } = {};

  for (const record of priceMatrixRecords) {
    const normCountry = normalizeCountry(record.country);
    const fobKey = priceKey(record.foreignRetailFOB);
    const key = `${normCountry}-${record.brandCode}-${fobKey}`;
    lookup[key] = record.unitRetail;

    const cbKey = `${normCountry}-${record.brandCode}`;
    if (!pricesByCountryBrand[cbKey]) pricesByCountryBrand[cbKey] = [];
    const existing = pricesByCountryBrand[cbKey];
    const rounded = Math.round(record.foreignRetailFOB * 100) / 100;
    if (!existing.includes(rounded)) existing.push(rounded);
  }

  // Sort each list for clearer error messages
  for (const k of Object.keys(pricesByCountryBrand)) {
    pricesByCountryBrand[k].sort((a, b) => a - b);
  }

  return { lookup, pricesByCountryBrand };
}
