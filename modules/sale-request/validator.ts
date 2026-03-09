/**
 * Sale Request Module Validator
 * Validates input data against requirements
 */

import { ItemListRow, ProcessingError, PriceListData } from './types';

const VALID_DISCOUNTS = [0.25, 0.35, 0.5, 0.7, 0.8];
const DISCOUNT_COLUMNS = ['25', '35', '50', '70', '80'];

/**
 * Find tab name case-insensitively
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
 * Validate item list file
 */
export function validateItemList(items: ItemListRow[]): ProcessingError[] {
  const errors: ProcessingError[] = [];

  if (!items || items.length === 0) {
    return [{ message: 'Item list is empty' }];
  }

  items.forEach((item, index) => {
    const rowNum = index + 2; // +2 for header and 1-based indexing

    // Check required fields
    if (!item.mancode || item.mancode.trim() === '') {
      errors.push({
        row: rowNum,
        column: 'mancode',
        message: 'Mancode is required',
      });
    }

    if (!item.color || item.color.trim() === '') {
      errors.push({
        row: rowNum,
        column: 'color',
        message: 'Color is required',
      });
    }

    if (!item.season || item.season.trim() === '') {
      errors.push({
        row: rowNum,
        column: 'season',
        message: 'Season is required',
      });
    }

    // Validate discount
    if (item.discount === undefined || item.discount === null) {
      errors.push({
        row: rowNum,
        column: 'discount',
        message: 'Discount is required',
        value: item.discount,
      });
    } else if (!VALID_DISCOUNTS.includes(item.discount)) {
      errors.push({
        row: rowNum,
        column: 'discount',
        message: `Discount must be one of: ${VALID_DISCOUNTS.join(', ')}`,
        value: item.discount,
      });
    }
  });

  return errors;
}

/**
 * Validate price list file
 */
export function validatePriceList(
  priceData: PriceListData,
  brand: string,
  country: string
): ProcessingError[] {
  const errors: ProcessingError[] = [];

  if (!priceData || Object.keys(priceData).length === 0) {
    errors.push({ message: 'Price list is empty' });
    return errors;
  }

  // Check if the expected tab exists (case-insensitive)
  const tabName = findTabNameCaseInsensitive(priceData, brand, country);
  if (!tabName) {
    const brandMap: Record<string, string> = { '56': 'INT', 'B6': 'UOMO', '55': 'CAL', '57': 'TEZ' };
    const brandLabel = brandMap[brand] || brand;
    const availableTabs = Object.keys(priceData).join(', ');
    errors.push({
      message: `Price list tab "${brandLabel} ${country}" not found. Available tabs: ${availableTabs}`,
    });
    return errors;
  }

  // Validate the tab structure
  const tabData = priceData[tabName];
  if (!tabData || Object.keys(tabData).length === 0) {
    errors.push({
      message: `Price list tab "${tabName}" is empty`,
    });
    return errors;
  }

  // Validate that each row has the required discount columns
  for (const [localRetail, discounts] of Object.entries(tabData)) {
    const missingColumns = DISCOUNT_COLUMNS.filter(
      (col) => !(col in discounts)
    );
    if (missingColumns.length > 0) {
      errors.push({
        message: `Local Retail price ${localRetail} missing discount columns: ${missingColumns.join(', ')}`,
      });
    }
  }

  return errors;
}

/**
 * Validate form inputs
 */
export function validateFormInputs(
  brand: string,
  country: string
): ProcessingError[] {
  const errors: ProcessingError[] = [];

  if (!brand || brand.trim() === '') {
    errors.push({ message: 'Brand is required' });
  }

  if (!country || country.trim() === '') {
    errors.push({ message: 'Country is required' });
  }

  return errors;
}
