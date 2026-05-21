import { prisma } from "@/lib/prisma";
import { ValidationInputItem, ValidationResultItem, ValidationEngineResponse } from "./types";

export async function validateSeasonality(
  items: ValidationInputItem[]
): Promise<ValidationEngineResponse> {
  const uniqueMancodes = Array.from(new Set(items.map((i) => i.mancode)));
  // All items in a batch share the same brand — set at the UI level
  const brandCode = items[0]?.brandCode ?? "";

  const referenceData = await prisma.seasonalityReference.findMany({
    where: {
      brandCode,
      mancode: { in: uniqueMancodes },
    },
    orderBy: { priority: "asc" },
  });

  const results: ValidationResultItem[] = [];
  const summary = { total: items.length, found: 0, notFound: 0 };

  for (const item of items) {
    // Pass 1: brand + country + mancode + color
    let match = referenceData.find(
      (ref) =>
        ref.mancode === item.mancode &&
        ref.colorCode === item.colorCode &&
        ref.country &&
        item.country &&
        ref.country.toLowerCase() === item.country.toLowerCase()
    );

    // Pass 2: brand + mancode + color, no country (global fallback)
    if (!match) {
      match = referenceData.find(
        (ref) =>
          ref.mancode === item.mancode &&
          ref.colorCode === item.colorCode &&
          (!ref.country || ref.country.trim() === "")
      );
    }

    if (match) {
      summary.found++;
      results.push({
        mancode: item.mancode,
        colorCode: item.colorCode,
        country: item.country || "GLOBAL",
        correctSeason: match.season,
        priorityUsed: match.priority,
        status: "Found",
      });
    } else {
      summary.notFound++;
      results.push({
        mancode: item.mancode,
        colorCode: item.colorCode,
        country: item.country || "GLOBAL",
        correctSeason: null,
        priorityUsed: null,
        status: "Not Found",
      });
    }
  }

  return { results, summary };
}
