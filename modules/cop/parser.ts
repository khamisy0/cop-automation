import { read, utils } from 'xlsx';
import { BrandManagerRow, RHMRow, ProcessingError } from './types';

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
 * Parse RHM Excel file
 * Expected columns: Mancode, ColorSize, Unit Retail
 * ColorSize format: 123|000 (Color|Size)
 */
export async function parseRHM(file: File): Promise<{
  data: RHMRow[];
  errors: ProcessingError[];
}> {
  const errors: ProcessingError[] = [];
  const data: RHMRow[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { cellText: true, cellDates: false });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push({
        type: 'parsing',
        message: 'No sheets found in RHM file',
      });
      return { data, errors };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
      blankrows: false,
      defval: '',
    });

    if (rows.length === 0) {
      errors.push({
        type: 'parsing',
        message: 'No data found in RHM file',
      });
      return { data, errors };
    }

    const firstRow = rows[0];
    const headers = Object.keys(firstRow);

    // Find column indices (case-insensitive)
    const mancodeCol = findColumn(headers, ['mancode', 'man code', 'man-code', 'code', 'codicearticolo']);
    const colorSizeCol = findColumn(headers, ['colorsize', 'color size', 'color-size', 'sku', 'lot']);
    const unitRetailCol = findColumn(headers, [
      'unitretail',
      'unit retail',
      'retail',
      'unit price',
    ]);

    if (!mancodeCol || !colorSizeCol || !unitRetailCol) {
      const missing = [];
      if (!mancodeCol) missing.push('Mancode');
      if (!colorSizeCol) missing.push('ColorSize');
      if (!unitRetailCol) missing.push('Unit Retail');

      errors.push({
        type: 'parsing',
        message: `Missing required columns in RHM file: ${missing.join(', ')}`,
      });
      return { data, errors };
    }

    // Parse rows
    rows.forEach((row, index) => {
      try {
        const mancode = String(row[mancodeCol] || '').trim();
        const colorSizeRaw = String(row[colorSizeCol] || '').trim();
        const unitRetail = parseFloat(String(row[unitRetailCol] || ''));

        // Validate required fields
        if (!mancode || !colorSizeRaw) {
          errors.push({
            type: 'validation',
            message: `Row ${index + 1}: Missing required field (Mancode or ColorSize)`,
            rowIndex: index,
          });
          return;
        }

        if (isNaN(unitRetail) || unitRetail <= 0) {
          errors.push({
            type: 'validation',
            message: `Row ${index + 1}: Invalid Unit Retail value (must be > 0)`,
            rowIndex: index,
          });
          return;
        }

        // Split ColorSize by pipe (|)
        const [colorPart, sizePart] = colorSizeRaw.split('|');

        if (!colorPart || !sizePart) {
          errors.push({
            type: 'validation',
            message: `Row ${index + 1}: ColorSize must be in format "Color|Size" (e.g., "123|000")`,
            rowIndex: index,
          });
          return;
        }

        const color = colorPart.trim();
        const size = sizePart.trim();

        // Preserve leading zeros by keeping as string
        data.push({
          mancode,
          colorSize: colorSizeRaw,
          unitRetail,
          color,
          size,
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
      message: `Failed to parse RHM file: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
