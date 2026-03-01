import { read, utils } from 'xlsx';
import { BrandManagerRow, ProcessingError } from './types';

/**
 * Parse Brand Manager Excel file
 * Expected columns: Mancode, Color, Season, Sale Price
 */
export async function parseBrandManager(file: File): Promise<{
  data: BrandManagerRow[];
  errors: ProcessingError[];
}> {
  const errors: ProcessingError[] = [];
  const data: BrandManagerRow[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { cellText: true, cellDates: false });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push({
        type: 'parsing',
        message: 'No sheets found in Brand Manager file',
      });
      return { data, errors };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
      blankrows: false,
      defval: '',
    });

    // Find column headers (case-insensitive)
    if (rows.length === 0) {
      errors.push({
        type: 'parsing',
        message: 'No data found in Brand Manager file',
      });
      return { data, errors };
    }

    const firstRow = rows[0];
    const headers = Object.keys(firstRow);

    // Find column indices (case-insensitive)
    const mancodeCol = findColumn(headers, ['mancode', 'man code', 'man-code', 'code', 'codicearticolo']);
    const colorCol = findColumn(headers, ['color', 'colore', 'codicecolore']);
    const seasonCol = findColumn(headers, ['season']);
    const salePriceCol = findColumn(headers, ['sale price', 'saleprice', 'price']);

    if (!mancodeCol || !colorCol || !seasonCol || !salePriceCol) {
      const missing = [];
      if (!mancodeCol) missing.push('Mancode');
      if (!colorCol) missing.push('Color');
      if (!seasonCol) missing.push('Season');
      if (!salePriceCol) missing.push('Sale Price');

      errors.push({
        type: 'parsing',
        message: `Missing required columns in Brand Manager: ${missing.join(', ')}`,
      });
      return { data, errors };
    }

    // Parse rows
    rows.forEach((row, index) => {
      try {
        const mancode = String(row[mancodeCol] || '').trim();
        const color = String(row[colorCol] || '').trim();
        const season = String(row[seasonCol] || '').trim();
        const salePrice = parseFloat(String(row[salePriceCol] || ''));

        // Validate required fields
        if (!mancode || !color || !season) {
          errors.push({
            type: 'validation',
            message: `Row ${index + 1}: Missing required field (Mancode, Color, or Season)`,
            rowIndex: index,
          });
          return;
        }

        if (isNaN(salePrice) || salePrice < 0) {
          errors.push({
            type: 'validation',
            message: `Row ${index + 1}: Invalid Sale Price value`,
            rowIndex: index,
          });
          return;
        }

        data.push({
          mancode,
          color,
          season,
          salePrice,
        });
      } catch (error) {
        errors.push({
          type: 'parsing',
          message: `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
          rowIndex: index,
        });
      }
    });
  } catch (error) {
    errors.push({
      type: 'parsing',
      message: `Failed to parse Brand Manager file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return { data, errors };
}

/**
 * Helper function to find column by multiple possible names (case-insensitive)
 */
function findColumn(headers: string[], possibleNames: string[]): string | null {
  const headerMap = new Map(headers.map((h) => [h.toLowerCase().replace(/\s+/g, ''), h]));

  for (const name of possibleNames) {
    const normalized = name.toLowerCase().replace(/\s+/g, '');
    if (headerMap.has(normalized)) {
      return headerMap.get(normalized) || null;
    }
  }

  return null;
}
