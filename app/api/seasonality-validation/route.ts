import { NextResponse } from "next/server";
import { validateSeasonality } from "@/modules/seasonality/engine";
import { ValidationInputItem } from "@/modules/seasonality/types";

export async function POST(request: Request) {
  try {
    const { items, targetCountry, targetBrand } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided for validation" },
        { status: 400 }
      );
    }

    const extractField = (entry: any, possibleKeywords: string[]): string => {
      for (const [key, value] of Object.entries(entry)) {
        if (value !== undefined && value !== null) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, ""); 
          for (const keyword of possibleKeywords) {
            const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanKey.includes(cleanKeyword)) {
              return String(value).trim();
            }
          }
        }
      }
      return "";
    };

    const processedItems: ValidationInputItem[] = items.map((item, index) => {
      const mancode = extractField(item, ["articlecode", "mancode"]);
      const colorCode = extractField(item, ["colorcode", "color"]);
      const country = targetCountry ? String(targetCountry).trim() : undefined;
      const brandCode = targetBrand ? String(targetBrand).trim() : "";

      return {
        id: `row-${index}`,
        mancode,
        colorCode,
        brandCode,
        country,
      };
    }).filter(i => i.mancode && i.colorCode); 

    if (processedItems.length === 0) {
      return NextResponse.json(
        { error: "No valid items found. Ensure 'Mancode' and 'Color' columns exist." },
        { status: 400 }
      );
    }

    const engineResponse = await validateSeasonality(processedItems);

    return NextResponse.json({
      success: true,
      ...engineResponse
    });

  } catch (error) {
    console.error("Error in seasonality validation API:", error);
    return NextResponse.json(
      { error: "Internal server error during validation" },
      { status: 500 }
    );
  }
}
