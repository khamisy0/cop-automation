import { MergedRow, FormInputs } from './types';

/**
 * Generate header line for ERP TXT file
 */
export function generateHeader(): string {
  return 'CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription';
}

/**
 * Format merged data into ERP TXT format
 * Format: CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription
 * 
 * Business Rule:
 * If Season = "000" and Reason contains "SAL":
 *   - Change Reason to "MKD"
 *   - Append "_000" to Transaction Description
 */
export function formatERPLines(
  mergedData: MergedRow[],
  formInputs: FormInputs
): string[] {
  const erpLines: string[] = [];

  mergedData.forEach((row) => {
    // Format new effective retail with proper decimal places
    const newEffectiveRetail = row.newEffectiveRetail.toFixed(2);
    
    // Format date as YYYYMMDD (remove dashes)
    const formattedDate = formInputs.newEffectiveDate.replace(/-/g, '');
    
    // Convert Compensated to uppercase YES/NO
    const compensated = formInputs.compensated === 'Yes' ? 'YES' : 'NO';
    
    // Apply business rule: If Season = "000" and Reason contains "SAL"
    let reason = formInputs.reason.trim();
    let transactionDescription = formInputs.transactionDescription.trim();
    
    if (row.season.trim() === '000' && reason.includes('SAL')) {
      reason = 'MKD';
      transactionDescription = transactionDescription + '_000';
    }

    const erpLine = [
      formInputs.countryCode.trim(),
      formInputs.brand.trim(),
      row.season.trim(),
      formInputs.supplier.trim(),
      reason,
      formattedDate,
      '', // ToDate - left empty
      compensated,
      row.mancode.trim(),
      row.color.trim(),
      row.size.trim(),
      newEffectiveRetail,
      transactionDescription,
    ].join('|');

    erpLines.push(erpLine);
  });

  return erpLines;
}

/**
 * Generate TXT file content with header and Windows line breaks (CRLF)
 */
export function generateTXTContent(erpLines: string[]): string {
  // Add header as first line
  const header = generateHeader();
  const allLines = [header, ...erpLines];
  
  // Join lines with Windows line breaks (\r\n)
  return allLines.join('\r\n') + '\r\n';
}

/**
 * Generate preview table data (first N rows)
 */
export function generatePreviewData(mergedData: MergedRow[], limit: number = 20) {
  return mergedData.slice(0, limit).map((row) => ({
    mancode: row.mancode,
    color: row.color,
    size: row.size,
    season: row.season,
    salePrice: row.salePrice.toFixed(2),
    unitRetail: row.unitRetail.toFixed(2),
    discount: `${(row.discountPercent * 100).toFixed(2)}%`,
    newEffectiveRetail: row.newEffectiveRetail.toFixed(2),
  }));
}
