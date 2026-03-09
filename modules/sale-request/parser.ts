/**
 * Sale Request Module Parser
 * Parses Excel files for item list and price list
 */

import * as XLSX from 'xlsx';
import { ItemListRow, PriceListData, PriceTable } from './types';

/**
 * Parse Item List Excel file
 * Supports multiple column header formats (English and Italian)
 * English: mancode, color, season, discount
 * Italian: CodiceArticolo, CodiceColore, season, Fattore
 */
export async function parseItemListFile(file: File): Promise<ItemListRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;

  return rawData.map((row) => {
    // Handle both English and Italian column headers
    const mancode =
      String(row['mancode'] || row['CodiceArticolo'] || '').trim();
    const color =
      String(row['color'] || row['CodiceColore'] || '').trim();
    const season =
      String(row['season'] || row['Season'] || '').trim();
    const discount = parseFloat(
      String(row['discount'] || row['Fattore'] || '0')
    );

    return {
      mancode,
      color,
      season,
      discount,
    };
  });
}

/**
 * Parse Price List Excel file
 * Contains multiple tabs with pricing matrices
 * Each tab: tabName (e.g., "INT UAE", "INT QA", "CAL UAE")
 * Tab structure: Rows with "Euro Retail" and "Local Retail" columns
 *                followed by discount percentage columns (25, 35, 50, 70, 80)
 */
export async function parsePriceListFile(file: File): Promise<PriceListData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const priceData: PriceListData = {};

  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Array<
      Record<string, unknown>
    >;

    priceData[sheetName] = parsePriceSheet(data);
  }

  return priceData;
}

/**
 * Parse a single price sheet
 * Flexible column matching:
 * - Local Retail: "Local Retail", "New Price", or any column containing "price"
 * - Discount columns: "25", "35", "50", "70", "80" (with or without %)
 */
function parsePriceSheet(
  data: Array<Record<string, unknown>>
): PriceTable {
  const priceTable: PriceTable = {};

  // Find the local retail column key dynamically
  const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
  const localRetailKey = allKeys.find(
    (key) =>
      key.toLowerCase().includes('new price') ||
      key.toLowerCase().includes('local') ||
      key.toLowerCase().includes('price')
  );

  if (!localRetailKey) {
    console.warn('Warning: Could not find local retail column in price sheet');
    return priceTable;
  }

  for (const row of data) {
    const localRetailValue = String(row[localRetailKey] || '').trim();

    // Skip empty rows or header rows
    if (!localRetailValue || localRetailValue === '') {
      continue;
    }

    // Skip non-numeric values
    if (isNaN(parseFloat(localRetailValue))) {
      continue;
    }

    // Create entry for this local retail price
    priceTable[localRetailValue] = {};

    // Find and extract discount percentage columns (25, 35, 50, 70, 80)
    const discountColumns = ['25', '35', '50', '70', '80'];

    for (const discountCol of discountColumns) {
      // Try to find column with or without % symbol
      const columnKey = allKeys.find(
        (key) =>
          key.trim() === discountCol ||
          key.trim() === `${discountCol}%` ||
          key.toLowerCase().includes(discountCol)
      );

      if (columnKey) {
        const value = row[columnKey];
        if (value !== undefined && value !== null && value !== '') {
          priceTable[localRetailValue][discountCol] = parseFloat(
            String(value)
          );
        }
      }
    }
  }

  return priceTable;
}
