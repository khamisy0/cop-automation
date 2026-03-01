# 📋 Quick Reference Card

## System URLs

| Environment | URL |
|-------------|-----|
| Development | http://localhost:3000 |
| API Endpoint | POST http://localhost:3000/api/process |

## Required Excel Columns

### Brand Manager File
```
Mancode | Color | Season | Sale Price
```

### RHM Report File
```
Mancode | ColorSize (Color|Size) | Unit Retail
```

## API Request

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

## Output Format

```
CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription
```

**Example lines:**
```
02|56|000|5601|SAL4|20260301||NO|100085133|0010|07402|849|SALE_PHASE_4
02|56|000|5601|SAL4|20260301||NO|100085134|0010|07402|899|SALE_PHASE_4
```

## Error Types Reference

| Type | Meaning | Example |
|------|---------|---------|
| parsing | File format error | Missing required columns |
| validation | Data quality issue | Unit Retail is zero |
| merge | Key matching problem | Mancode not found |
| calculation | Math error | Discount calculation failed |

## Calculation Formula

```
Discount % = 1 - (Sale Price / Unit Retail)
New Effective Retail = Sale Price
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for errors
npm run lint

# Install dependencies
npm install

# Update packages
npm update
```

## File Formats Supported

- ✅ .xlsx (Excel 2007+)
- ✅ .xls (Excel 97-2003)
- ❌ .csv (NOT supported)
- ❌ .json (NOT supported)

## Important Constraints

| Constraint | Limit |
|------------|-------|
| Max file size | 50 MB |
| Max rows per file | 50,000 |
| Upload timeout | 5 minutes |
| Processing timeout | 2 minutes per 10k rows |
| Request timeout | 30 seconds |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between form fields |
| `Enter` | Submit form |
| `Space` | Toggle dropdown |
| `Escape` | Close dialogs |

## Project Structure

```
cop-automation/
├── app/                    # Next.js app directory
│   ├── api/process/        # API endpoint
│   ├── page.tsx            # Main page
│   └── layout.tsx          # Layout
├── components/             # React components
├── lib/                    # Utilities
├── public/                 # Static files
├── package.json            # Dependencies
└── README.md               # Documentation
```

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Troubleshooting Quick Guide

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `kill -9 $(lsof -t -i:3000)` |
| Build fails | Delete `.next` folder, rebuild |
| Files won't upload | Check file format (.xlsx/.xls) |
| Slow processing | Try smaller file, check RAM |
| "Column not found" | Check header names, try renaming |

## Documentation Files

| File | Purpose |
|------|---------|
| README.md | Project overview |
| USER_GUIDE.md | User instructions |
| API_DOCUMENTATION.md | API reference |
| DEPLOYMENT.md | Deployment guide |
| BUILD_SUMMARY.md | Build summary |

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 3s |
| File parse (1k rows) | < 1s |
| Total process (10k rows) | < 10s |
| Memory usage | < 500MB |
| Uptime | 99.9% |

## Common Form Reasons

```
PROMOTIONAL     - Sale promotion
CLEARANCE       - Inventory clearance
SEASONAL        - Seasonal adjustment
COMPETITOR      - Competitor match
OTHER           - Other reason
```

## Success Response Example

```json
{
  "success": true,
  "summary": {
    "totalSKUs": 1250,
    "averageDiscount": 0.1523,
    "missingItemsCount": 15
  },
  "data": [...],
  "erpLines": [...]
}
```

## Error Response Example

```json
{
  "success": false,
  "error": "Failed to parse files",
  "validation": {
    "isValid": false,
    "errors": [
      {
        "type": "parsing",
        "message": "Missing required columns"
      }
    ]
  }
}
```

## Installation

```bash
# Clone or navigate to project
cd cop-automation

# Install dependencies
npm install

# Start development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

```env
NEXT_PUBLIC_MAX_FILE_SIZE=52428800
NEXT_PUBLIC_MAX_ROWS=50000
NEXT_PUBLIC_UPLOAD_TIMEOUT=300000
```

## Contact & Support

- **Documentation**: See included .md files
- **Code Issues**: Check browser console and server logs
- **User Support**: Refer to USER_GUIDE.md

---

**Last Updated:** February 2026  
**Version:** 1.0
