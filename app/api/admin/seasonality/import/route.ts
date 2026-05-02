import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This parser accommodates multiple naming conventions from user's Excel files
// Priority determines which record is the "source of truth", lower = more important
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries, replaceAll } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "No entries to import" },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // If indicated, wipe the table first to set new source of truth
    if (replaceAll) {
      await prisma.seasonalityReference.deleteMany();
    }

    const extractField = (entry: any, possibleKeywords: string[], excludeKeywords: string[] = []): string => {
      for (const [key, value] of Object.entries(entry)) {
        if (value !== undefined && value !== null) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, ""); // strip all punctuation, spaces, weird chars
          
          for (const keyword of possibleKeywords) {
            const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
            
            if (cleanKey.includes(cleanKeyword)) {
              // Ensure it doesn't match an excluded keyword (useful for "From" vs "From 2")
              let isExcluded = false;
              for (const ex of excludeKeywords) {
                const cleanEx = ex.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (cleanKey.includes(cleanEx)) isExcluded = true;
              }
              
              if (!isExcluded) return String(value).trim();
            }
          }
        }
      }
      return "";
    };

    // Prepare batch creation payload
    const dataToInsert = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      const countryRaw = extractField(entry, ["country"]);
      // Standardize country: "All", "ALL", "GLOBAL" typically represents generic
      const country = ["all", "global"].includes(countryRaw.toLowerCase()) ? "" : countryRaw;
      
      const priorityStr = extractField(entry, ["priority"]);
      let priority = parseInt(priorityStr, 10);
      if (isNaN(priority)) priority = 999; // Default low priority if empty/invalid

      const fromDate1 = extractField(entry, ["fromdate", "from"], ["from2", "fromsecond", "1"]); 
      const fromDate2 = extractField(entry, ["from2", "fromsecond", "from1"]); // xlsx renames duplicate 'from' to 'from_1'
      
      const mancode = extractField(entry, ["articlecode", "mancode"]);
      const colorCode = extractField(entry, ["colorcode", "color"]);
      const season = extractField(entry, ["season"]);

      if (!mancode || !colorCode || !season) {
        results.errors.push(`Row ${i + 1}: Missing mandatory fields (Mancode, Color Code, or Season)`);
        results.skipped++;
        continue;
      }

      dataToInsert.push({
        country,
        priority,
        fromDate1,
        mancode,
        colorCode,
        season,
        fromDate2,
      });
    }

    if (dataToInsert.length > 0) {
      // Create many to be fast
      const insertResult = await prisma.seasonalityReference.createMany({
        data: dataToInsert,
        skipDuplicates: true, // Gracefully handle duplicate composite keys if added later
      });
      results.created = insertResult.count;
    }

    if (results.created === 0 && !replaceAll) {
      return NextResponse.json(
        {
          success: false,
          message: "No entries were imported. Check Excel headers.",
          details: { firstRowKeys: Object.keys(entries[0] || {}).join(", ") },
          ...results
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Import completed",
      ...results
    });
    
  } catch (error) {
    console.error("Error importing seasonality data:", error);
    return NextResponse.json(
      { error: "Internal server error during import" },
      { status: 500 }
    );
  }
}
