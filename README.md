# COP Automation System

A production-ready Next.js web application that automates the retail Change of Price (COP) process by transforming Excel files into ERP-ready TXT format.

## 📋 Overview

This system streamlines the manual retail COP process by:
- Parsing and validating Excel files (Brand Manager and RHM Report)
- Merging datasets using intelligent key matching
- Performing automatic discount calculations
- Generating ERP-compliant TXT output
- Providing comprehensive data preview and validation reporting

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **File Processing**: xlsx
- **Validation**: Zod
- **UI Components**: lucide-react (icons)

## 🚀 Getting Started

### Installation

```bash
cd cop-automation
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
cop-automation/
├── app/
│   ├── api/
│   │   └── process/
│   │       └── route.ts           # Main processing API endpoint
│   ├── layout.tsx
│   ├── page.tsx                    # Main upload page
│   └── globals.css
├── components/
│   ├── FileUploader.tsx            # Drag-and-drop file upload
│   ├── ErrorAlert.tsx              # Error/warning display
│   ├── PreviewTable.tsx            # Data preview table
│   └── SummaryCard.tsx             # Processing summary
├── lib/
│   ├── types.ts                    # TypeScript interfaces
│   ├── validation.ts               # Zod schemas & validators
│   ├── parseBrandManager.ts        # Brand Manager Excel parser
│   ├── parseRHM.ts                 # RHM Excel parser
│   ├── mergeLogic.ts               # Data merge & calculations
│   └── formatERP.ts                # ERP format generation
├── public/
├── package.json
└── tsconfig.json
```

## 📝 File Specifications

### Brand Manager Excel Format

**Required Columns:**
- Mancode (text)
- Color (text)
- Season (text)
- Sale Price (number)

### RHM Report Excel Format

**Required Columns:**
- Mancode (text)
- ColorSize (text, format: `Color|Size`, e.g., `123|000`)
- Unit Retail (number, must be > 0)

### Output ERP TXT Format

Each line contains pipe-delimited fields with a header row:
```
CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription
```

**Format Details:**
- First line: Column header
- Data lines: One per SKU
- Date format: YYYYMMDD (no dashes, e.g., 20260301)
- ToDate field: Always empty
- Compensated: YES or NO (uppercase)
- No additional headers
- UTF-8 encoding
- Windows line breaks (CRLF)

## 🔄 Processing Flow

### Step 1: Upload
- Upload Brand Manager Excel file
- Upload RHM Report Excel file

### Step 2: Enter Metadata
- Country Code
- Brand
- Supplier
- Reason (PROMOTIONAL, CLEARANCE, SEASONAL, etc.)
- New Effective Date
- To Date
- Compensated (Yes/No)
- Transaction Description

### Step 3: Process
- Parse and validate both Excel files
- Merge datasets on Mancode + Color
- Calculate discount percentages
- Generate ERP-formatted lines
- Display preview (first 20 rows)
- Show processing summary

### Step 4: Download
- Download COP.txt file
- File ready for ERP system import

## 🔍 Data Processing Details

### Parsing
- Columns detected case-insensitively
- Supports multiple naming variations (e.g., "Mancode", "Man Code", "Man-code")
- Leading zeros preserved in all fields
- Hidden characters removed

### Validation
- All required columns present
- No missing mandatory fields
- Sale Price is non-negative number
- Unit Retail > 0
- ColorSize properly formatted (contains pipe separator)

### Merging
- LEFT JOIN: RHM joined with Brand Manager
- Join Key: Mancode + Color combination
- Missing Brand Manager records flagged as warnings
- Successfully matched records processed

### Calculations
```
Discount % = 1 - (Sale Price / Unit Retail)
New Effective Retail = Sale Price
```

## ✅ Validation Rules

1. **File Upload**
   - Both files required
   - Must be .xlsx or .xls format
   - Maximum typical size: 50,000 rows

2. **Form Fields**
   - Country Code: required, text
   - Brand: required, text
   - Supplier: required, text
   - Reason: required, dropdown
   - New Effective Date: required, valid date
   - To Date: required, valid date
   - Compensated: required, Yes/No
   - Transaction Description: required, text

3. **Data Quality**
   - No duplicate Mancode+Color combinations
   - All sale prices non-negative
   - All unit retail values positive
   - No special characters in keys

## 📊 Processing Results

### Summary Display
- **Total SKUs Processed**: Count of successfully processed items
- **Average Discount**: Mean discount percentage across all items
- **Missing/Skipped Items**: Count of unmatched RHM records

### Data Preview
- First 20 rows displayed in formatted table
- Shows: Mancode, Color, Size, Season, Sale Price, Unit Retail, Discount %, New Retail

### Error/Warning Report
- All errors and warnings displayed with context
- Row numbers provided for failed validations
- Clear indication of issue type (parsing, validation, merge)

## 🔒 Security & Performance

- **Server-Side Processing**: All file parsing and processing on server
- **No Persistence**: Files processed in-memory, not stored
- **Stateless**: Each request independent
- **Performance**: Handles up to 50,000 rows efficiently
- **UTF-8 Compliant**: International character support

## 🐛 Error Handling

All errors are categorized:
- **parsing**: File read or format errors
- **validation**: Data quality issues
- **merge**: Key matching problems

Each error includes:
- Error type
- Descriptive message
- Row number (when applicable)
- Actionable guidance

## 📱 User Interface

- **Responsive Design**: Works on desktop and tablet
- **Professional Layout**: Clean, organized interface
- **Drag & Drop**: File upload with drag-and-drop support
- **Visual Feedback**: Upload status, processing progress, success/error states
- **Accessibility**: Semantic HTML, keyboard navigation

## 🧪 Testing

### Manual Testing Checklist
- [ ] Upload valid files and verify processing
- [ ] Test with missing columns in Excel
- [ ] Test with special characters in data
- [ ] Test with leading zeros
- [ ] Verify discount calculations
- [ ] Verify text encoding in output file
- [ ] Test with empty files
- [ ] Test with very large files (10k+ rows)

## 🚨 Known Limitations

1. Browser file upload limited to available memory
2. No batch processing across multiple file sets
3. No FTP auto-upload (can be added via configuration)
4. Column order detection relies on header names

## 📈 Future Enhancements

- Batch file upload and processing
- FTP/SFTP integration for direct ERP upload
- CSV export option for validation report
- Dark mode support
- Processing history and audit log
- Undo/retry functionality
- Custom column mapping interface
- Email notifications on completion

## 🔧 Configuration

Environment variables (optional):
```
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB
NEXT_PUBLIC_MAX_ROWS=50000
NEXT_PUBLIC_UPLOAD_TIMEOUT=300000   # 5 minutes
```

## 📄 License

Internal use only. All rights reserved.

## 📞 Support

For issues, questions, or feature requests, contact the development team.
