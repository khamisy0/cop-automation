# User Guide

## Quick Start

### Step 1: Access the System
Open your web browser and navigate to:
- **Local development:** http://localhost:3010
- **Production URL:** Provided by your administrator

### Step 2: Prepare Your Files

You'll need two Excel files in the exact format specified:

**Brand Manager File:**
- Column: Mancode (product code)
- Column: Color (color variant)
- Column: Season (product season)
- Column: Sale Price (new selling price)

**RHM Report File:**
- Column: Mancode (product code)
- Column: ColorSize (format: Color|Size, e.g., "RED|M")
- Column: Unit Retail (current retail price)

### Step 3: Upload Files

1. Click on the "Brand Manager File" upload box
2. Select your Brand Manager Excel file (drag & drop or click to browse)
3. Click on the "RHM Report File" upload box
4. Select your RHM Report Excel file

You'll see a confirmation with the filename and file size.

### Step 4: Fill in Details

Complete all required fields:

| Field | Description | Options/Format |
|-------|-------------|-----------------|
| Country Code | Two-letter country code | e.g., US, IT, FR |
| Brand | Select the brand | Intimissimi-56 or IUMAN UOMO-B6 |
| Supplier | Auto-populated based on brand | 5601 (for 56) or B601 (for B6) |
| Reason | Why prices are changing | Free text, e.g., SAL4, PROMO, CLEAR |
| New Effective Date | When new prices start | Date picker (YYYY-MM-DD) |
| Compensated | Was the merchant compensated? | Yes or No |
| Transaction Description | Description of the change | Free text, e.g., sale_phase_4 |

### Step 5: Process

Click the "Generate COP File" button. The system will:
- Validate your files
- Match products between files
- Calculate discounts
- Generate ERP-ready output

### Step 6: Review Results

After processing, you'll see:
- **Processing Summary:** Total SKUs processed, average discount, missing items
- **Data Preview:** First 20 rows showing all calculated values
- **Messages:** Any warnings or errors discovered

### Step 7: Download

Click "Download COP.txt" to download the ERP file ready for upload to your system.

---

## File Format Details

### Excel Column Names

The system recognizes columns by multiple naming conventions (case-insensitive):

**Brand Manager - Mancode:**
- English: "Mancode", "Man Code", "Man-code", "Code"
- Italian: "CodiceArticolo"

**Brand Manager - Color:**
- English: "Color"
- Italian: "Colore", "CodiceColore"

**Brand Manager - Season:**
- "Season"

**Brand Manager - Sale Price:**
- "Sale Price", "SalePrice", "Price"

**RHM - Mancode:**
- English: "Mancode", "Man Code", "Man-code", "Code"
- Italian: "CodiceArticolo"

**RHM - ColorSize:**
- English: "ColorSize", "Color Size", "Color-Size", "SKU"
- Italian: "LOT"

**RHM - Unit Retail:**
- "Unit Retail", "UnitRetail", "Retail", "Unit Price"

### ColorSize Format

The ColorSize column in RHM must be formatted as: **Color|Size**

Examples:
- "RED|M"
- "123|000"
- "BLU|XL"

Leading zeros are preserved in all fields.

---

## Output Format

The downloaded COP.txt file contains a header row followed by data lines:

```
CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription
```

**Example line:**
```
02|56|000|5601|SAL4|20260301||NO|100085133|0010|07402|849|SALE_PHASE_4
```

**Format Notes:**
- First line is the header (column names)
- Dates are in YYYYMMDD format (no dashes)
- ToDate field is included but always empty
- Compensated values: YES or NO (uppercase)

---

## Business Rules

### Season-Based Processing

**Automatic Reason & Description Modification (Season 000 Special Handling)**

When processing data, the system applies the following rule:

**Condition:** If Season = "000" AND Reason contains "SAL"
- **Modify Reason:** Changed from the original to "MKD"
- **Modify Description:** Append "_000" to the Transaction Description

**Example:**

Input batch with mixed seasons:
| Mancode | Color | Season | Reason | Transaction Description |
|---------|-------|--------|--------|--------------------------|
| 100085133 | 0010 | 252 | SAL4 | sale_phase_4 |
| 100085134 | 0010 | 261 | SAL4 | sale_phase_4 |
| 100085135 | 0010 | 000 | SAL4 | sale_phase_4 |

Output in COP.txt:
```
02|56|252|5601|SAL4|20260301||NO|100085133|0010|07402|849|sale_phase_4
02|56|261|5601|SAL4|20260301||NO|100085134|0010|07402|899|sale_phase_4
02|56|000|5601|MKD|20260301||NO|100085135|0010|07402|949|sale_phase_4_000
```

Notice:
- Seasons 252 and 261: Reason stays "SAL4", Description unchanged
- Season 000: Reason changes to "MKD", Description becomes "sale_phase_4_000"

---

## Understanding the Results

### Processing Summary

**Total SKUs Processed**
- Number of products successfully matched and processed
- Each unique Mancode + Color + Size combination = 1 SKU

**Average Discount**
- Mean discount percentage across all processed SKUs
- Formula: Average(1 - Sale Price / Unit Retail)
- Displayed as percentage (e.g., 15.23%)

**Missing/Skipped Items**
- Products in RHM file without matching Brand Manager record
- These items were not included in the output
- Check your source files to correct formatting

### Data Preview Table

Shows:
- **Mancode:** Product code
- **Color:** Color variant
- **Size:** Size variant (from ColorSize split)
- **Season:** Product season
- **Sale Price:** New selling price
- **Unit Retail:** Current retail price (from RHM)
- **Discount %:** Calculated discount percentage
- **New Retail:** New effective retail price

---

## Common Issues & Solutions

### ❌ "Missing required columns"
**Solution:** Check your Excel file has all required columns with correct names.
- Verify column headers match expected names
- Column order doesn't matter, but names must match
- Check for typos in column headers

### ❌ "Both files are required"
**Solution:** Make sure you've uploaded both files.
- Brand Manager file required
- RHM Report file required
- Files can be in any order

### ❌ "Unit Retail cannot be zero or negative"
**Solution:** Your RHM file has invalid pricing.
- Check all Unit Retail values are positive numbers
- Remove or correct rows with zero or negative prices
- Don't include header row in data

### ❌ "ColorSize must be in format 'Color|Size'"
**Solution:** Fix formatting in RHM ColorSize column.
- Format must be: `Color|Size`
- Use pipe (|) to separate color and size
- Examples: "RED|M", "123|000"
- Don't include spaces around the pipe

### ❌ "No matching Brand Manager record"
**Solution:** Product exists in RHM but not in Brand Manager.
- Verify Mancode spelling matches exactly between files
- Verify Color spelling matches exactly between files
- Check for leading/trailing spaces in data
- Ensure both files use same product coding system

### ❌ "Invalid date format"
**Solution:** Dates must be formatted correctly.
- Use YYYY-MM-DD format (e.g., 2024-03-01)
- Don't use other formats like 03/01/2024
- Select dates using the date picker to ensure correct format

### ❌ Processing takes a very long time
**Solution:** File might be too large or system busy.
- Try with a smaller sample file first
- Maximum supported: 50,000 rows per file
- Split large files into multiple batches
- Try again at off-peak times

### ⚠️ High number of missing items
**Solution:** Data might not match between files.
- Verify product codes match exactly between files
- Check for spelling differences
- Ensure color names are consistent
- Review a few mismatched records manually

---

## Tips & Best Practices

### ✓ Data Preparation
1. **Clean your data first**
   - Remove leading/trailing spaces
   - Fix spelling inconsistencies
   - Verify all required fields have values

2. **Use consistent codes**
   - Same Mancode format in both files
   - Same color naming convention
   - Same capitalization

3. **Validate before upload**
   - Open files in Excel and scan for errors
   - Verify row counts make sense
   - Check a few calculations manually

### ✓ Processing
1. **Review the preview carefully**
   - Check calculations look correct
   - Verify a few random rows
   - Look for unexpected discount values

2. **Examine the warnings**
   - Missing items might indicate data issues
   - Investigate unexpected mismatches
   - Correct source files if needed to reprocess

3. **Save for audit trail**
   - Keep copies of input files
   - Save generated TXT file
   - Document any manual corrections

### ✓ Download
1. **Verify the file**
   - Open COP.txt in a text editor
   - Check row count matches expected
   - Verify format looks correct

2. **Before uploading to ERP**
   - Manual spot-check several rows
   - Verify calculations one more time
   - Confirm all required fields present

3. **Keep records**
   - Archive input files
   - Keep generated COP.txt file
   - Document processing date/time

---

## Calculations

### Discount Percentage
```
Discount % = 1 - (Sale Price / Unit Retail)
```

**Example:**
- Sale Price: $79.99
- Unit Retail: $99.99
- Discount = 1 - (79.99 / 99.99) = 0.2 = 20%

### New Effective Retail
```
New Effective Retail = Sale Price
```

The new retail price is simply the Sale Price from the Brand Manager file.

---

## Sample Data

### Sample Brand Manager Format

| Mancode | Color | Season | Sale Price |
|---------|-------|--------|------------|
| SKU001 | RED | SPRING | 79.99 |
| SKU002 | BLUE | SUMMER | 49.99 |
| SKU003 | GREE | FALL | 89.99 |

### Sample RHM Format

| Mancode | ColorSize | Unit Retail |
|---------|-----------|-------------|
| SKU001 | RED\|M | 99.99 |
| SKU002 | BLUE\|L | 59.99 |
| SKU003 | GREE\|S | 99.99 |

### Sample Output (COP.txt)

```
US|Nike|SPRING|Supplier XYZ|PROMOTIONAL|2024-03-01|2024-03-31|No|SKU001|RED|M|79.99|Q1 Spring Promotion
US|Nike|SUMMER|Supplier XYZ|PROMOTIONAL|2024-03-01|2024-03-31|No|SKU002|BLUE|L|49.99|Q1 Spring Promotion
US|Nike|FALL|Supplier XYZ|PROMOTIONAL|2024-03-01|2024-03-31|No|SKU003|GREE|S|89.99|Q1 Spring Promotion
```

---

## FAQ

**Q: Can I process multiple files at once?**
A: Currently, you must process one pair of files at a time. Repeat for multiple batches.

**Q: What if my Excel columns have different names?**
A: The system recognizes common naming variations. If it still doesn't find your columns, rename them to match the standard names in the documentation.

**Q: Is my data secure?**
A: Yes. Files are processed in-memory and never stored to disk. No personal data is collected.

**Q: How large can my files be?**
A: Up to 50 MB file size, up to 50,000 rows per file is recommended.

**Q: Can I edit the output before downloading?**
A: The output cannot be edited in the system, but you can download and edit the TXT file before uploading to ERP.

**Q: What if processing fails?**
A: The system will display specific error messages. Review the errors, correct your source files, and try again.

**Q: How long does processing take?**
A: Typically 1-5 seconds for small files, 5-45 seconds for large files (up to 50k rows).

**Q: Can I process the same files twice?**
A: Yes, you can re-upload and reprocess. Each request is independent.

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the error message** - It usually indicates the specific problem
2. **Review sample files** - Compare your files to the samples provided
3. **Contact IT support** - Reference the error message and provide sample rows
4. **Check system status** - The system might be temporarily unavailable

---

**Version:** 1.0  
**Last Updated:** February 2026
