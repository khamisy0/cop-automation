/**
 * COP Module Data Models and Interfaces
 */

export interface BrandManagerRow {
  mancode: string;
  color: string;
  season: string;
  salePrice: number;
}

export interface RHMRow {
  mancode: string;
  colorSize: string;
  unitRetail: number;
  color?: string;
  size?: string;
}

export interface MergedRow {
  mancode: string;
  color: string;
  size: string;
  season: string;
  salePrice: number;
  unitRetail: number;
  discountPercent: number;
  newEffectiveRetail: number;
}

export interface ProcessingError {
  type: 'validation' | 'parsing' | 'calculation' | 'merge';
  message: string;
  missingKeys?: string[];
  rowIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ProcessingError[];
}

export interface ProcessingResult {
  success: boolean;
  data?: MergedRow[];
  erpLines?: string[];
  validation: ValidationResult;
  summary?: {
    totalSKUs: number;
    averageDiscount: number;
    missingItemsCount: number;
  };
  error?: string;
}

export interface FormInputs {
  countryCode: string;
  brand: string;
  supplier: string;
  reason: string;
  newEffectiveDate: string;
  compensated: 'Yes' | 'No';
  transactionDescription: string;
}

export interface UploadedFiles {
  brandManagerFile: File | null;
  rhmFile: File | null;
}
