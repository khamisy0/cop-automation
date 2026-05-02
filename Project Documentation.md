# COP Automation & Sale Request Hub - Project Documentation

This document serves as the single source of truth for the entire **COP Automation System** and **Sale Request** application. It is specifically designed to give AI agents and new developers a complete, immediate understanding of the project's technical architecture, business logic, and historical context.

---

## 1. Project Overview

The application is a Next.js (App Router) web app designed to automate retail pricing flows. It completely replaces manual Excel manipulation for regional brand managers by providing two primary workflows:
1. **Change of Price (COP) Automation:** Transforming raw Excel requests into ERP-compatible TXT files for system imports.
2. **Request for Sale Prices:** Looking up precise localized sale prices for specific items based on a global Euro price, country matrices, and percentage discounts.

---

## 2. Technical Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL accessed via **Prisma ORM**
- **File Processing:** `xlsx` (for Excel parsing and generation), `papaparse` (for CSV/TXT)
- **Validation:** `zod` and custom TypeScript validators
- **Components:** `lucide-react` for icons
- **Architecture:** Client-heavy UI (`"use client"`) interacting with serverless API Routes (`app/api/...`). No persistent sessions/auth currently configured.

---

## 3. Core Modules & Business Logic

### Module A: Change of Price (COP)
**Location:** `/api/process`, `app/page.tsx`, `lib/`

**Business Logic:**
1. **Inputs:** User uploads two Excel files:
   - *Brand Manager Excel*: Contains Mancode, Color, Season, Sale Price.
   - *RHM Report Excel*: Contains Mancode, ColorSize (e.g., `Color|Size`), Unit Retail.
2. **Merging & Calculation:**
   - The app performs a LEFT JOIN matching `Mancode + Color`.
   - Discount is calculated as: `1 - (Sale Price / Unit Retail)`.
   - **Season Rule:** If `Season == "000"` and `Reason` contains `"SAL"`, the Reason is rewritten to `"MKD"` and `"_000"` is appended to the Transaction Description.
3. **Output:** Generates a strict, pipe-delimited (`|`) TXT file required by the ERP system with headers like `CountryCode|Brand|Season|Supplier|...`.

### Module B: Request for Sale Prices
**Location:** `/app/sale-request/`, `/app/api/sale-request/`, `modules/sale-request/`

**Business Logic:**
Generates a complete localized pricing sheet for items.
1. **Inputs:** 
   - *Item List*: Mancode, Color, Season, Discount (0.25, 0.35, 0.50, 0.70, 0.80).
   - *Price List (Excel)*: Contains tabs named `{BRAND} {COUNTRY}` mapping Local Retail prices to specific discount percentages.
2. **Lookup Flow (CRITICAL):**
   - **Step 1:** Lookup **Euro Retail** price in the Database (`EuroRetail` table) using `BRAND + MANCODE`. *(Note: Euro Retail is a global, country-agnostic value).*
   - **Step 2:** Lookup **Local Original Retail** in the Database (`PriceMatrix` table) using `COUNTRY + BRAND + EURO RETAIL`.
   - **Step 3:** Use the *Item List Discount* and the *File-Uploaded Price Matrix Tab* to find the exact final **Sale Price** for that specific Local Retail value.
3. **Output:** A formatted Excel file (`SalePriceRequest_Output.xlsx`) containing all SKUs and their localized calculated prices.

### Module C: Seasonality Reference
**Location:** `/app/admin/seasonality`, `/app/seasonality-validation`, `modules/seasonality/`

**Business Logic:**
Acts as a centralized validation engine to ensure items have the correct season assigned relative to a priority-based source of truth.
1. **Inputs:** Excel file or pasted text (Mancode, Color, optionally Country and Input Season).
2. **Lookup Flow:**
   - **Attempt 1:** Exact match on `Country + Mancode + Color`.
   - **Attempt 2:** Fallback to `Mancode + Color` where Country is generic/empty in the DB.
   - If multiple candidates exist, sort ascending by `priority` (lowest number = highest importance).
3. **Output:** A classified validation table (Correct ✅, Incorrect ❌, Not Found ⚠️) showing the actual season from the reference dataset.

---

## 4. Database Schema & Architecture

The database exclusively serves **Module B** (Sale Requests). 

```prisma
// 1. Euro Retail (Global Baseline Prices)
model EuroRetail {
  id                 Int      @id @default(autoincrement())
  batchNumber        String
  lineNumber         String
  brandCode          String
  brandDescription   String
  mancode            String   // Product Code
  colorSize          String
  effectiveDate      DateTime
  euroRetail         Float    // THE GLOBAL BASE PRICE
  // ... timestamps
}

// 2. Price Matrix (Country Localization)
model PriceMatrix {
  id               Int      @id @default(autoincrement())
  country          String   // e.g., "UAE", "QA"
  brandCode        String
  season           String
  supplier         String
  foreignRetailFOB Float    // Maps to euroRetail
  unitRetail       Float    // Localized price
  // ... dates and timestamps
}
```

### 🚨 Crucial Architectural Context (March 2026 Update)
Previously, the system incorrectly assumed the "Euro Retail" price varied by country, maintaining a `country` column in the `EuroRetail` table. 
**This was fixed.** 
- The `country` column was completely dropped from the DB, UI, and API. 
- **Rule of Thumb:** `EuroRetail` is entirely driven by `Brand` and `Mancode`. Only the `PriceMatrix` cares about the `Country` to map the Euro price to the local currency. 
- *If an agent attempts to add `country` back to EuroRetail operations, it will break the business logic.*

---

## 5. File Structure Navigation

- `app/` - Next.js App Router root.
  - `app/api/...` - All backend HTTP handlers.
  - `app/page.tsx` - Main COP Module UI.
  - `app/sale-request/page.tsx` - Sale Request Module UI.
  - `app/admin/...` - UI for managing the `EuroRetail` and `PriceMatrix` databases (CRUD operations + Excel mass-imports).
- `components/` - Shared UI logic (File Uploaders, Status Cards, Tables).
- `lib/` - Shared utilities, Zod validation schemas, and COP legacy parsing logic.
- `modules/sale-request/` - Isolated domain logic for the Sale Request feature.
  - `pricingEngine.ts` - The core O(1) matching algorithm for sale prices.
  - `parser.ts` & `exporter.ts` - Excel I/O.
- `prisma/` - Database schema and seed scripts.

---

## 6. How to Run, Test, and Deploy

**Development:**
```bash
npm install
npm run dev
```

**Database Management:**
```bash
npx prisma studio          # View database GUI
npx prisma generate        # Regenerate client after schema changes
npx prisma db push         # Sync schema to DB (used over migrations for rapid prototyping)
npm run db:seed            # Add test data
```

**Production Build:**
```bash
npm run build
npm run start
```

---

## 7. Future AI Developer Guidelines

If you are an AI agent analyzing this file to continue development:
1. **Strict TypeScript:** Do not use `any`. Define interfaces in `types.ts` or near the component.
2. **Server/Client Boundaries:** UI standard is `"use client"` at the top of files in `app/` except for the `app/api/` routes which are purely server-side Node environments.
3. **Database Rules:** Use `prisma` from `@/lib/prisma`. Do not instantiate multiple Prisma clients.
4. **Excel Processing:** When modifying Excel logic, rely on the `xlsx` library and always handle edge cases where columns are named defensively (e.g., `Mancode`, `man code`, `CodiceArticolo`) to support multi-language/typo variations from end-users.
5. **Errors:** Never fail silently. The system specifically uses a `ProcessingError[]` interface to return row-by-row debugging info to the frontend UI so business users know exactly which line in their 50,000-row Excel sheet failed.

**To begin work:** Ask the user what feature they want to build, review the Zod schemas in `lib/validation.ts` or `modules/` for validation targets, and follow the existing patterns.
