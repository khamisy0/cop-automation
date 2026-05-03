import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Log first entry to debug column names
    if (entries.length > 0) {
      console.log("First entry columns:", Object.keys(entries[0]));
      console.log("First entry data:", JSON.stringify(entries[0], null, 2));
    }

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

    const validEntries = [];

    for (let rowIndex = 0; rowIndex < entries.length; rowIndex++) {
      const entry = entries[rowIndex];
      
      const batchNumber = extractField(entry, ["Batch Number", "batchNumber", "Batch number"]);
      const lineNumber = extractField(entry, ["Line Number", "lineNumber", "Line number"]);
      const brandCode = extractField(entry, ["Brand Code", "brandCode", "Brand code"]);
      const brandDescription = extractField(entry, ["Brand Description", "brandDescription", "Brand description"]);
      const mancode = extractField(entry, ["Mancode", "mancode"]);
      const colorSize = extractField(entry, ["Color Size", "colorSize", "Color size"]);
      const importFileColor = extractField(entry, ["Import File Color", "importFileColor", "Import file color"]) || null;
      const importFileSizeList = extractField(entry, ["Import File Size List", "importFileSizeList", "Import file size list"]) || null;
      const euroRetailStr = extractField(entry, ["Euro Retail", "euroRetail", "Euro retail"]);
      const effectiveDateInput = getExactField(entry, ["Effective Date", "effectiveDate"]);

      if (!batchNumber || !lineNumber || !brandCode || !mancode) {
        results.errors.push(`Row ${rowIndex + 1}: Missing required fields (Batch: "${batchNumber}", Line: "${lineNumber}")`);
        results.skipped++;
        continue;
      }

      const euroRetailNum = parseFloat(euroRetailStr);
      if (isNaN(euroRetailNum)) {
        results.skipped++;
        continue;
      }

      const effectiveDate = parseDate(effectiveDateInput);
      if (!effectiveDate) {
        results.errors.push(`Row with ${batchNumber}/${lineNumber}: Invalid effective date format`);
        results.skipped++;
        continue;
      }

      validEntries.push({
        batchNumber, lineNumber, brandCode, brandDescription: brandDescription || "", mancode, colorSize: colorSize || "",
        effectiveDate, importFileColor, importFileSizeList, euroRetail: euroRetailNum,
      });
    }

    if (validEntries.length > 0) {
      try {
        const batchNumbers = validEntries.map(e => e.batchNumber);
        const lineNumbers = validEntries.map(e => e.lineNumber);
        
        const existingRecords = await prisma.euroRetail.findMany({
          where: {
            batchNumber: { in: batchNumbers },
            lineNumber: { in: lineNumbers }
          },
          select: { id: true, batchNumber: true, lineNumber: true }
        });

        const existingMap = new Map(existingRecords.map(r => [`${r.batchNumber}-${r.lineNumber}`, r.id]));

        const toCreate = [];
        const toUpdate: {id: number, data: any}[] = [];

        for (const entry of validEntries) {
          const key = `${entry.batchNumber}-${entry.lineNumber}`;
          if (existingMap.has(key)) {
            toUpdate.push({ id: existingMap.get(key)!, data: entry });
          } else {
            toCreate.push(entry);
          }
        }

        if (toCreate.length > 0) {
          await prisma.euroRetail.createMany({ data: toCreate, skipDuplicates: true });
          results.created += toCreate.length;
        }

        if (toUpdate.length > 0) {
          const updateOps = toUpdate.map(u => prisma.euroRetail.update({ where: { id: u.id }, data: u.data }));
          await prisma.$transaction(updateOps);
          results.updated += toUpdate.length;
        }
      } catch (err) {
        console.error("Bulk DB Error:", err);
        results.errors.push(`Database error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // If nothing was created or updated, return error status with details
    if (results.created === 0 && results.updated === 0) {
      const firstRowColumns = entries.length > 0 ? Object.keys(entries[0]) : [];
      return NextResponse.json(
        {
          success: false,
          message: "No entries were imported. Please check file format and data.",
          details: {
            totalRows: entries.length,
            columnsFound: firstRowColumns.join(", "),
            expectedColumns: "Batch Number, Line Number, Brand Code, Brand Description, Mancode, Color Size, Effective Date, Import File Color, Import File Size List, Euro Retail"
          },
          ...results,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Import completed successfully",
        ...results,
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
