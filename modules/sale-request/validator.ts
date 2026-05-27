/**
 * Sale Request Module Validator
 * Validates input data against requirements
 */

import { ItemListRow, ProcessingError, PriceListData } from './types';


// Maps full country names to all abbreviations that may appear in Excel tab names
const COUNTRY_TAB_ALIASES: Record<string, string[]> = {
  qatar:   ['qat', 'qatar'],
  bahrain: ['bah', 'bahrain'],
  kuwait:  ['kwt', 'kuwait', 'kuw'],
  lebanon: ['leb', 'lebanon'],
  jordan:  ['jordan'],
  uae:     ['uae'],
  ksa:     ['ksa'],
  egypt:   ['egy', 'egypt'],
};

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

  const brandLabel = (brandMap[brandCode] || brandCode).toLowerCase();
  const countryLower = countryCode.toLowerCase();
  const aliases = COUNTRY_TAB_ALIASES[countryLower] ?? [countryLower];

  for (const tab of Object.keys(priceData)) {
    const tabNorm = tab.trim().toLowerCase();
    if (!tabNorm.startsWith(brandLabel)) continue;
    const countryPart = tabNorm.slice(brandLabel.length).trim();
    if (aliases.includes(countryPart)) return tab;
  }

  return null;
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
    if (item.discount === undefined || item.discount === null || isNaN(item.discount)) {
      errors.push({
        row: rowNum,
        column: 'discount',
        message: 'Discount is required and must be a number (e.g. 0.25 for 25%)',
        value: item.discount,
      });
    } else if (item.discount <= 0 || item.discount >= 1) {
      errors.push({
        row: rowNum,
        column: 'discount',
        message: `Discount must be between 0 and 1 exclusive (e.g. 0.2 for 20%)`,
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
