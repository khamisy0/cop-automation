import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Increase body size limit for this route to handle large imports
export const maxDuration = 60; // seconds

// Parse dates flexibly - handle multiple formats
function parseDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    // Validate the date is reasonable
    const year = dateInput.getFullYear();
    if (year < 1900 || year > 2100) return null;
    return dateInput;
  }
  
  const dateNum = Number(dateInput);
  
  // Handle Excel serial dates (numbers between 0 and 100000)
  if (!isNaN(dateNum) && dateNum > 0 && dateNum < 100000) {
    // Excel serial date: days since 1900-01-01 (with 1900 being a leap year incorrectly)
    const excelDate = new Date(1900, 0, dateNum);
    const year = excelDate.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return excelDate;
    }
  }
  
  const dateStr = String(dateInput).trim();
  if (!dateStr) return null;
  
  // Try parsing as is (ISO format, etc.)
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year >= 1900 && year <= 2100) return d;
  }
  
  // Try parsing locale string (e.g., "3/7/2026" or "7/3/2026")
  const parts = dateStr.split('/').map((p: string) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((p: number) => !isNaN(p))) {
    // Ensure year is reasonable and in position 2
    if (parts[2] >= 1900 && parts[2] <= 2100) {
      // Try M/D/YYYY format
      const d1 = new Date(parts[2], parts[0] - 1, parts[1]);
      if (!isNaN(d1.getTime())) return d1;
      
      // Try D/M/YYYY format as fallback
      const d2 = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  
  return null;
}

// Process a batch of entries and return results
async function processBatch(
  entries: any[],
  startIndex: number
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // Prepare all valid entries first
  const validEntries: Array<{
    rowIndex: number;
    country: string;
    brandCode: string;
    season: string;
    supplier: string;
    section: string | null;
    foreignRetailFOB: number;
    unitRetail: number;
    effectiveDate: Date;
    expiryDate: Date;
  }> = [];

  // Helper to safely extract values from different possible column names (handles 0)
  const extractField = (entry: any, keys: string[]): string => {
    for (const key of keys) {
      if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
        return String(entry[key]).trim();
      }
    }
    return "";
  };

  const getExactField = (entry: any, keys: string[]): any => {
    for (const key of keys) {
      if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
        return entry[key];
      }
    }
    return null;
  };

  for (let i = 0; i < entries.length; i++) {
    const rowIndex = startIndex + i;
    const entry = entries[i];

    // Extract with multiple possible column name variations safely
    const country = extractField(entry, ["Country", "country"]);
    const brandCode = extractField(entry, ["Brand Code", "brandCode", "BrandCode"]);
    const season = extractField(entry, ["Season Code", "Season", "season", "SeasonCode", "Season code"]);
    const supplier = extractField(entry, ["Supplier Code", "Supplier", "supplier", "SupplierCode", "Supplier code"]);
    const section = extractField(entry, ["Section Code", "Section", "section", "SectionCode"]) || null;
    const foreignRetailStr = extractField(entry, ["Foreign Retail/FOB", "Foreign Retail", "FOB", "foreignRetailFOB", "ForeignRetailFOB", "Foreign Retail / FOB"]);
    const unitRetailStr = extractField(entry, ["Unit Retail", "unitRetail", "UnitRetail"]);
    const effectiveDateInput = getExactField(entry, ["Effective Date", "effectiveDate", "EffectiveDate"]);
    const expiryDateInput = getExactField(entry, ["Expiry Date", "expiryDate", "ExpiryDate"]);

    // Validate required fields
    if (!country || !brandCode || !season || !supplier) {
      results.errors.push(
        `Row ${rowIndex + 1}: Missing required fields (Country: "${country}", Brand: "${brandCode}", Season: "${season}", Supplier: "${supplier}")`
      );
      results.skipped++;
      continue;
    }

    const foreignRetailNum = parseFloat(foreignRetailStr);
    const unitRetailNum = parseFloat(unitRetailStr);

    if (isNaN(foreignRetailNum) || isNaN(unitRetailNum)) {
      results.errors.push(
        `Row ${rowIndex + 1} (${country}/${brandCode}): Invalid price values (Foreign Retail/FOB: "${foreignRetailStr}", Unit Retail: "${unitRetailStr}")`
      );
      results.skipped++;
      continue;
    }

    // Parse dates
    const effectiveDate = parseDate(effectiveDateInput);
    const expiryDate = parseDate(expiryDateInput);

    if (!effectiveDate || !expiryDate) {
      results.errors.push(
        `Row ${rowIndex + 1} (${country}/${brandCode}): Invalid date format (Effective: "${effectiveDateInput}", Expiry: "${expiryDateInput}")`
      );
      results.skipped++;
      continue;
    }

    validEntries.push({
      rowIndex,
      country,
      brandCode,
      season,
      supplier,
      section,
      foreignRetailFOB: foreignRetailNum,
      unitRetail: unitRetailNum,
      effectiveDate,
      expiryDate,
    });
  }

  // Process valid entries efficiently
  if (validEntries.length > 0) {
    try {
      const orConditions = validEntries.map(e => ({
        country: e.country,
        brandCode: e.brandCode,
        season: e.season,
        supplier: e.supplier,
        foreignRetailFOB: e.foreignRetailFOB
      }));

      const existingRecords = await prisma.priceMatrix.findMany({
        where: { OR: orConditions },
        select: { id: true, country: true, brandCode: true, season: true, supplier: true, foreignRetailFOB: true }
      });

      const existingMap = new Map(
        existingRecords.map(r => [`${r.country}-${r.brandCode}-${r.season}-${r.supplier}-${r.foreignRetailFOB}`, r.id])
      );

      const toCreate = [];
      const toUpdate: {id: number, data: any}[] = [];

      for (const entry of validEntries) {
        const key = `${entry.country}-${entry.brandCode}-${entry.season}-${entry.supplier}-${entry.foreignRetailFOB}`;
        if (existingMap.has(key)) {
          toUpdate.push({ id: existingMap.get(key)!, data: entry });
        } else {
          toCreate.push(entry);
        }
      }

      if (toCreate.length > 0) {
        // Exclude rowIndex before insertion
        const createData = toCreate.map(({ rowIndex, ...data }) => data);
        await prisma.priceMatrix.createMany({ data: createData, skipDuplicates: true });
        results.created += toCreate.length;
      }

      if (toUpdate.length > 0) {
        const updateOps = toUpdate.map(u => {
          const { rowIndex, ...dataToUpdate } = u.data;
          return prisma.priceMatrix.update({ where: { id: u.id }, data: dataToUpdate });
        });
        await prisma.$transaction(updateOps);
        results.updated += toUpdate.length;
      }
    } catch (err) {
      console.error("Bulk DB Error:", err);
      results.errors.push(`Database error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return results;
}

const BATCH_SIZE = 100;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "No entries to import" },
        { status: 400 }
      );
    }

    console.log(`Starting import of ${entries.length} entries`);

    // Log first entry to debug column names
    if (entries.length > 0) {
      console.log("First entry columns:", Object.keys(entries[0]));
      console.log("First entry data:", JSON.stringify(entries[0], null, 2));
    }

    const totalResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process in batches to avoid transaction timeouts and memory issues
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch, i);

      totalResults.created += batchResults.created;
      totalResults.updated += batchResults.updated;
      totalResults.skipped += batchResults.skipped;
      totalResults.errors.push(...batchResults.errors);

      console.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: created=${batchResults.created}, updated=${batchResults.updated}, skipped=${batchResults.skipped}`
      );
    }

    console.log(
      `Import complete: created=${totalResults.created}, updated=${totalResults.updated}, skipped=${totalResults.skipped}, errors=${totalResults.errors.length}`
    );

    // If nothing was created or updated, return error status with details
    if (totalResults.created === 0 && totalResults.updated === 0) {
      const firstRowColumns = entries.length > 0 ? Object.keys(entries[0]) : [];
      return NextResponse.json(
        {
          success: false,
          message: "No entries were imported. Please check file format and data.",
          details: {
            totalRows: entries.length,
            columnsFound: firstRowColumns.join(", "),
            expectedColumns:
              "Country, Brand Code, Season Code, Supplier Code, Section Code, Foreign Retail/FOB, Unit Retail, Effective Date, Expiry Date",
          },
          ...totalResults,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Import completed: ${totalResults.created} created, ${totalResults.updated} updated${totalResults.skipped > 0 ? `, ${totalResults.skipped} skipped` : ""}`,
        ...totalResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing entries:", error);
    return NextResponse.json(
      { error: "Failed to import entries" },
      { status: 500 }
    );
  }
}
