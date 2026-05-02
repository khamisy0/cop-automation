/**
 * Pricing Engine for Sale Request Module
 * Core logic for calculating sale prices
 */

import { ItemListRow, ProcessedItem, PriceListData, ProcessingError } from './types';

interface EuroRetailMap {
  [compositeKey: string]: number; // brand-mancode -> euroRetail
}

interface PriceMatrixMap {
  [compositeKey: string]: number; // country-brand-euroRetail -> unitRetail
}

/**
 * Find tab name case-insensitively
 * The brand parameter from the DB/dropdown is a code (e.g. B6, 56)
 * But the Excel tabs use the human readable prefix (e.g. UOMO, INT)
 */
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
  
  const brandLabel = brandMap[brandCode] || brandCode;
  
  // Note: country from UI is currently the short code e.g. 'UAE'
  const searchTerm = `${brandLabel} ${countryCode}`.toLowerCase().trim();
  
  const tabs = Object.keys(priceData);
  const foundTab = tabs.find((tab) => tab.trim().toLowerCase() === searchTerm);
  
  return foundTab || null;
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
      const localRetailKey = `${country}-${brand}-${euroRetail}`;
      const originalRetail = priceMatrixMap[localRetailKey];

      if (originalRetail === undefined) {
        errors.push({
          row: rowNum,
          message: `Local retail price not found in Price Matrix for Country: "${country}", Brand: "${brand}", Euro Retail: "${euroRetail}"`,
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
  const map: PriceMatrixMap = {};

  for (const record of priceMatrixRecords) {
    const key = `${record.country}-${record.brandCode}-${record.foreignRetailFOB}`;
    map[key] = record.unitRetail;
  }

  return map;
}
