/**
 * Sale Request Module Exporter
 * Generates Excel output file with processed results
 */

import * as XLSX from 'xlsx';
import { ProcessedItem } from './types';

/**
 * Export processed items to Excel file buffer
 * Columns: mancode, color, season, euroRetail, originalRetail, discount, salePrice
 */
export function exportToExcel(items: ProcessedItem[]): Buffer {
  // Prepare data for Excel
  const worksheetData = items.map((item) => ({
    mancode: item.mancode,
    color: item.color,
    season: item.season,
    euroRetail: item.euroRetail,
    originalRetail: item.originalRetail,
    discount: item.discount,
    salePrice: item.salePrice,
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // mancode
    { wch: 15 }, // color
    { wch: 12 }, // season
    { wch: 12 }, // euroRetail
    { wch: 15 }, // originalRetail
    { wch: 10 }, // discount
    { wch: 12 }, // salePrice
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Sale Prices'
  );

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}

/**
 * Generate filename for output
 */
export function generateOutputFilename(): string {
  return 'SalePriceRequest_Output.xlsx';
}
