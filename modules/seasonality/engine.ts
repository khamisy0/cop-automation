import { prisma } from "@/lib/prisma";
import { ValidationInputItem, ValidationResultItem, ValidationEngineResponse } from "./types";

export async function validateSeasonality(
  items: ValidationInputItem[]
): Promise<ValidationEngineResponse> {
  const uniqueMancodes = Array.from(new Set(items.map((i) => i.mancode)));

  const referenceData = await prisma.seasonalityReference.findMany({
    where: { mancode: { in: uniqueMancodes } },
    orderBy: { priority: "asc" },
  });

  const results: ValidationResultItem[] = [];
  const summary = { total: items.length, found: 0, notFound: 0 };

  for (const item of items) {
    let match = referenceData.find(
      (ref) =>
        ref.mancode === item.mancode &&
        ref.colorCode === item.colorCode &&
        ref.country && item.country &&
        ref.country.toLowerCase() === item.country.toLowerCase()
    );

    if (!match) {
      match = referenceData.find(
        (ref) =>
          ref.mancode === item.mancode &&
          ref.colorCode === item.colorCode &&
          (!ref.country || ref.country.trim() === "")
      );
    }

    let status: ValidationResultItem["status"] = "Not Found";
    let correctSeason = null;
    let priorityUsed = null;

    if (match) {
      correctSeason = match.season;
      priorityUsed = match.priority;
      status = "Found";
      summary.found++;
    } else {
      summary.notFound++;
    }

    results.push({
      mancode: item.mancode,
      colorCode: item.colorCode,
      country: item.country || "GLOBAL Dropdown",
      correctSeason,
      priorityUsed,
      status,
    });
  }

  return { results, summary };
}
