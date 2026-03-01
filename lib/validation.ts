import { z } from 'zod';
import { BrandManagerRow, RHMRow, ProcessingError, ValidationResult } from './types';

/**
 * Validation schemas for form inputs and data
 */

export const FormInputSchema = z.object({
  countryCode: z.string().min(1, 'Country Code is required'),
  brand: z.string().min(1, 'Brand is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  reason: z.string().min(1, 'Reason is required'),
  newEffectiveDate: z.string().min(1, 'New Effective Date is required').refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    'Invalid date format'
  ),
  compensated: z.enum(['Yes', 'No']),
  transactionDescription: z.string().min(1, 'Transaction Description is required'),
});

/**
 * Validate Brand Manager rows
 */
export function validateBrandManagerData(rows: BrandManagerRow[]): ValidationResult {
  const errors: ProcessingError[] = [];

  rows.forEach((row, index) => {
    if (!row.mancode || !row.mancode.trim()) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Mancode is required`,
        rowIndex: index,
      });
    }

    if (!row.color || !row.color.trim()) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Color is required`,
        rowIndex: index,
      });
    }

    if (!row.season || !row.season.trim()) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Season is required`,
        rowIndex: index,
      });
    }

    if (typeof row.salePrice !== 'number' || isNaN(row.salePrice)) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Sale Price must be a valid number`,
        rowIndex: index,
      });
    } else if (row.salePrice < 0) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Sale Price cannot be negative`,
        rowIndex: index,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate RHM rows
 */
export function validateRHMData(rows: RHMRow[]): ValidationResult {
  const errors: ProcessingError[] = [];

  rows.forEach((row, index) => {
    if (!row.mancode || !row.mancode.trim()) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Mancode is required`,
        rowIndex: index,
      });
    }

    if (!row.colorSize || !row.colorSize.trim()) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: ColorSize is required`,
        rowIndex: index,
      });
    }

    if (typeof row.unitRetail !== 'number' || isNaN(row.unitRetail)) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Unit Retail must be a valid number`,
        rowIndex: index,
      });
    } else if (row.unitRetail <= 0) {
      errors.push({
        type: 'validation',
        message: `Row ${index + 1}: Unit Retail cannot be zero or negative`,
        rowIndex: index,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate form inputs
 */
export function validateFormInputs(inputs: unknown): ValidationResult {
  try {
    FormInputSchema.parse(inputs);
    return {
      isValid: true,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ProcessingError[] = error.issues.map((e) => ({
        type: 'validation',
        message: `${e.path.join('.')}: ${e.message}`,
      }));
      return {
        isValid: false,
        errors,
      };
    }
    return {
      isValid: false,
      errors: [
        {
          type: 'validation',
          message: 'Unknown validation error occurred',
        },
      ],
    };
  }
}

/**
 * Validate merge - check for missing keys
 */
export function validateMissingKeys(
  brandManagerKeys: Set<string>,
  rhmKeys: Set<string>
): ValidationResult {
  const missingKeys: string[] = [];

  rhmKeys.forEach((key) => {
    if (!brandManagerKeys.has(key)) {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    return {
      isValid: false,
      errors: [
        {
          type: 'merge',
          message: `${missingKeys.length} mancode+color combinations are missing from Brand Manager file`,
          missingKeys,
        },
      ],
    };
  }

  return {
    isValid: true,
    errors: [],
  };
}
