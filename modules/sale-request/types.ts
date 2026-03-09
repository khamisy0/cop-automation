/**
 * Sale Request Module Data Models and Interfaces
 */

export interface ItemListRow {
  mancode: string;
  color: string;
  season: string;
  discount: number; // decimal: 0.25, 0.35, 0.50, 0.70, 0.80
}

export interface ProcessedItem {
  mancode: string;
  color: string;
  season: string;
  euroRetail: number;
  originalRetail: number;
  discount: number;
  salePrice: number;
}

export interface PriceListData {
  [tabName: string]: PriceTable;
}

export interface PriceTable {
  [localRetail: string]: {
    [discountPercent: string]: number;
  };
}

export interface ProcessingResult {
  success: boolean;
  data?: ProcessedItem[];
  filePath?: string;
  error?: string;
  errors?: ProcessingError[];
  message?: string;
}

export interface ProcessingError {
  row?: number;
  column?: string;
  message: string;
  value?: unknown;
}

export interface SaleRequestInput {
  itemListFile: File;
  priceListFile: File;
  brand: string;
  country: string;
}
