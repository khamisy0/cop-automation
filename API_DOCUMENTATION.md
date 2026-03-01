/**
 * API DOCUMENTATION
 * COP Automation System
 */

# API Documentation

## Overview

The COP Automation System provides a single REST API endpoint for processing retail price change files.

**Base URL:** `http://localhost:3000` (development) or your deployment URL

## Authentication

Currently, no authentication is required. For production, consider implementing:
- API key authentication
- OAuth 2.0
- JWT tokens

## Endpoints

### POST /api/process

Process Brand Manager and RHM files to generate ERP-ready output.

#### Request

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandManagerFile | File | Yes | Brand Manager Excel file (.xlsx or .xls) |
| rhmFile | File | Yes | RHM Report Excel file (.xlsx or .xls) |
| countryCode | String | Yes | Two-letter country code (e.g., "US") |
| brand | String | Yes | Brand (Intimissimi - 56 or IUMAN UOMO - B6) |
| supplier | String | Yes | Supplier (auto-populated: 5601 or B601) |
| reason | String | Yes | Price change reason |
| newEffectiveDate | String | Yes | Effective date (YYYY-MM-DD format) |
| compensated | String | Yes | "Yes" or "No" |
| transactionDescription | String | Yes | Description of the transaction |

#### Request Example

```bash
curl -X POST http://localhost:3000/api/process \
  -F "brandManagerFile=@brand_manager.xlsx" \
  -F "rhmFile=@rhm_report.xlsx" \
  -F "countryCode=US" \
  -F "brand=56" \
  -F "supplier=5601" \
  -F "reason=Seasonal promotion" \
  -F "newEffectiveDate=2024-03-01" \
  -F "compensated=No" \
  -F "transactionDescription=Q1 Spring Promotion"
```

#### Request in JavaScript

```typescript
const formData = new FormData();
formData.append('brandManagerFile', brandManagerFile);
formData.append('rhmFile', rhmFile);
formData.append('countryCode', 'US');
formData.append('brand', '56');
formData.append('supplier', '5601');
formData.append('reason', 'Seasonal promotion');
formData.append('newEffectiveDate', '2024-03-01');
formData.append('compensated', 'No');
formData.append('transactionDescription', 'Q1 Spring Promotion');

const response = await fetch('/api/process', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
```

#### Response

**HTTP Status Codes:**
- `200 OK` - Processing successful (may contain warnings)
- `400 Bad Request` - Invalid input or missing files
- `500 Internal Server Error` - Server processing error

**Response Body (JSON):**

```typescript
{
  success: boolean;
  data?: MergedRow[];
  erpLines?: string[];
  validation: {
    isValid: boolean;
    errors: ProcessingError[];
  };
  summary?: {
    totalSKUs: number;
    averageDiscount: number;
    missingItemsCount: number;
  };
  error?: string;
}
```

#### Response Example (Success)

```json
{
  "success": true,
  "summary": {
    "totalSKUs": 1250,
    "averageDiscount": 0.1523,
    "missingItemsCount": 15
  },
  "validation": {
    "isValid": true,
    "errors": [
      {
        "type": "merge",
        "message": "15 SKU combinations are missing from Brand Manager file. Processing will skip these items."
      }
    ]
  },
  "data": [
    {
      "mancode": "SKU001",
      "color": "RED",
      "size": "M",
      "season": "SPRING",
      "salePrice": 79.99,
      "unitRetail": 99.99,
      "discountPercent": 0.2,
      "newEffectiveRetail": 79.99
    }
  ],
  "erpLines": [
    "US|Nike|SPRING|Supplier XYZ|PROMOTIONAL|2024-03-01|2024-03-31|No|SKU001|RED|M|79.99|Q1 Spring Promotion"
  ]
}
```

#### Response Example (Error)

```json
{
  "success": false,
  "error": "Failed to parse Brand Manager file",
  "validation": {
    "isValid": false,
    "errors": [
      {
        "type": "parsing",
        "message": "Missing required columns in Brand Manager: Sale Price"
      }
    ]
  }
}
```

#### Response Data Types

**MergedRow:**
```typescript
{
  mancode: string;
  color: string;
  size: string;
  season: string;
  salePrice: number;
  unitRetail: number;
  discountPercent: number;
  newEffectiveRetail: number;
}
```

**ProcessingError:**
```typescript
{
  type: 'validation' | 'parsing' | 'calculation' | 'merge';
  message: string;
  missingKeys?: string[];
  rowIndex?: number;
}
```

## Validation Rules

### File Validation
- Both files required
- Format: .xlsx or .xls only
- Maximum size: 50 MB (configurable)
- Rows processed: Up to 50,000

### Column Names (Case-Insensitive)

**Brand Manager File:**
- Mancode: "mancode", "man code", "man-code", "code"
- Color: "color"
- Season: "season"
- Sale Price: "sale price", "saleprice", "price"

**RHM File:**
- Mancode: "mancode", "man code", "man-code", "code"
- ColorSize: "colorsize", "color size", "color-size", "sku"
- Unit Retail: "unitretail", "unit retail", "retail", "unit price"

### Data Validation
- **Mancode:** Non-empty text
- **Color:** Non-empty text, must match between files
- **Season:** Non-empty text
- **Size:** Non-empty text (from ColorSize split)
- **Sale Price:** Non-negative number
- **Unit Retail:** Positive number (> 0)
- **ColorSize Format:** "Color|Size" (pipe-delimited, e.g., "123|000")

### Form Field Validation
- **Country Code:** Required, text
- **Brand:** Required, text
- **Supplier:** Required, text
- **Reason:** Required, dropdown value
- **Dates:** Required, valid YYYY-MM-DD format
- **Compensated:** Required, "Yes" or "No"
- **Transaction Description:** Required, text

## Error Handling

### Error Types

**Parsing Errors** (type: 'parsing')
- File format invalid
- Missing required columns
- Column naming ambiguous
- Excel read failure

Example: "Missing required columns in RHM file: Unit Retail"

**Validation Errors** (type: 'validation')
- Required field missing
- Invalid data type
- Out of range value
- Format mismatch

Example: "Row 5: Unit Retail cannot be zero or negative"

**Merge Errors** (type: 'merge')
- Key not found in matching dataset
- Multiple matches found
- Data integrity issue

Example: "Row 12: No matching Brand Manager record for Mancode 'SKU999' + Color 'BLUE'"

**Calculation Errors** (type: 'calculation')
- Mathematical error
- Division by zero
- Invalid formula

Example: "Row 8: Invalid discount calculation result"

### Error Response Structure

All errors include:
- **type:** Category of error
- **message:** Human-readable description
- **rowIndex:** (Optional) Row number where error occurred
- **missingKeys:** (Optional) Array of unmatched keys

## Processing Flow

1. **File Upload Validation**
   - Both files present
   - File format correct
   - File size acceptable

2. **Column Detection**
   - Headers found and mapped
   - Required columns identified
   - Naming variations handled

3. **Data Parsing**
   - Excel rows converted to objects
   - Data types validated
   - Special characters handled

4. **Data merging**
   - RHM LEFT JOIN Brand Manager
   - Join key: Mancode + Color
   - Unmatched records flagged

5. **Calculations**
   - Discount % = 1 - (Sale Price / Unit Retail)
   - Rounded to 4 decimals
   - New Effective Retail = Sale Price

6. **ERP Formatting**
   - Pipe-delimited lines created
   - Form fields included
   - UTF-8 encoding ensured

7. **Response Generation**
   - Summary statistics calculated
   - Preview data included
   - Errors/warnings compiled

## Rate Limiting

Currently not implemented. For production, consider:

```typescript
// Suggested rate limiting
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many processing requests',
});
```

## Timeout

- File upload timeout: 5 minutes (configurable)
- Processing timeout: 2 minutes per 10,000 rows
- Connection timeout: 30 seconds

## Performance

### Typical Response Times
- Small file (< 500 rows): < 1 second
- Medium file (500-5,000 rows): 1-5 seconds
- Large file (5,000-50,000 rows): 5-45 seconds

### Payload Sizes
- Request: 10-50 MB (file dependent)
- Response: 5-500 KB (content dependent)

## Best Practices

### Calling the API

1. **Validate files locally before upload**
   ```typescript
   if (!brandManagerFile.name.endsWith('.xlsx')) {
     throw new Error('Invalid file format');
   }
   ```

2. **Show loading state**
   ```typescript
   setIsProcessing(true);
   try {
     const result = await fetch('/api/process', { body: formData });
   } finally {
     setIsProcessing(false);
   }
   ```

3. **Handle errors gracefully**
   ```typescript
   if (!result.success) {
     result.validation.errors.forEach(error => {
       console.error(`[${error.type}] ${error.message}`);
     });
   }
   ```

4. **Use the response data**
   ```typescript
   // Get ERP lines for download
   const erpContent = result.erpLines?.join('\r\n') + '\r\n';
   
   // Display summary
   console.log(`Processed: ${result.summary.totalSKUs} SKUs`);
   console.log(`Avg Discount: ${result.summary.averageDiscount * 100}%`);
   ```

5. **Validate before download**
   ```typescript
   if (result.success && result.erpLines?.length > 0) {
     // Safe to download
   }
   ```

## Examples

### Complete JavaScript Integration

```typescript
async function processCOPFiles(
  brandManagerFile: File,
  rhmFile: File,
  formData: FormInputs
) {
  const data = new FormData();
  data.append('brandManagerFile', brandManagerFile);
  data.append('rhmFile', rhmFile);
  data.append('countryCode', formData.countryCode);
  data.append('brand', formData.brand);
  data.append('supplier', formData.supplier);
  data.append('reason', formData.reason);
  data.append('newEffectiveDate', formData.newEffectiveDate);
  data.append('compensated', formData.compensated);
  data.append('transactionDescription', formData.transactionDescription);

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.error('Processing failed:', result.validation.errors);
      return null;
    }

    console.log('Processing successful!');
    console.log(`Processed ${result.summary.totalSKUs} SKUs`);
    return result;
  } catch (error) {
    console.error('Request failed:', error);
    return null;
  }
}
```

## Changelog

### Version 1.0.0
- Initial release
- POST /api/process endpoint
- Full data validation
- ERP format output

---

For additional support, see README.md or DEPLOYMENT.md
