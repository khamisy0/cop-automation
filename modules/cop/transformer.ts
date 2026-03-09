import { BrandManagerRow, RHMRow, MergedRow, ProcessingError } from './types';

/**
 * Merge RHM data with Brand Manager data and perform calculations
 * Uses LEFT JOIN on Mancode + Color
 */
export function mergeAndCalculate(
  brandManagerData: BrandManagerRow[],
  rhmData: RHMRow[]
): {
  mergedData: MergedRow[];
  errors: ProcessingError[];
} {
  const errors: ProcessingError[] = [];
  const mergedData: MergedRow[] = [];

  // Create lookup map for Brand Manager data
  const brandManagerMap = new Map<string, BrandManagerRow>();
  brandManagerData.forEach((row) => {
    const key = `${row.mancode}|${row.color}`;
    brandManagerMap.set(key, row);
  });

  // Process RHM data
  rhmData.forEach((rhmRow, index) => {
    if (!rhmRow.color || !rhmRow.size) {
      errors.push({
        type: 'merge',
        message: `Row ${index + 1}: ColorSize not properly split (missing Color or Size)`,
        rowIndex: index,
      });
      return;
    }

    const key = `${rhmRow.mancode}|${rhmRow.color}`;
    const brandManagerRow = brandManagerMap.get(key);

    if (!brandManagerRow) {
      errors.push({
        type: 'merge',
        message: `Row ${index + 1}: No matching Brand Manager record for Mancode "${rhmRow.mancode}" + Color "${rhmRow.color}"`,
        rowIndex: index,
      });
      return;
    }

    // Calculate discount percentage
    const discountPercent = parseFloat(
      (1 - brandManagerRow.salePrice / rhmRow.unitRetail).toFixed(4)
    );

    // New Effective Retail should be the Sale Price (from Brand Manager)
    const newEffectiveRetail = brandManagerRow.salePrice;

    mergedData.push({
      mancode: rhmRow.mancode,
      color: rhmRow.color,
      size: rhmRow.size,
      season: brandManagerRow.season,
      salePrice: brandManagerRow.salePrice,
      unitRetail: rhmRow.unitRetail,
      discountPercent,
      newEffectiveRetail,
    });
  });

  return {
    mergedData,
    errors,
  };
}

/**
 * Calculate summary statistics
 */
export function calculateSummary(mergedData: MergedRow[]): {
  totalSKUs: number;
  averageDiscount: number;
  missingItemsCount: number;
} {
  const totalSKUs = mergedData.length;
  const averageDiscount =
    totalSKUs > 0
      ? parseFloat(
          (mergedData.reduce((sum, row) => sum + row.discountPercent, 0) / totalSKUs).toFixed(4)
        )
      : 0;

  return {
    totalSKUs,
    averageDiscount,
    missingItemsCount: 0, // This will be populated from validation errors
  };
}
