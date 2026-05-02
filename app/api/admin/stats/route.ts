import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get Euro Retail count and last updated
    const euroRetailCount = await prisma.euroRetail.count();
    const latestEuroRetail = await prisma.euroRetail.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const priceMatrixCount = await prisma.priceMatrix.count();
    const latestPriceMatrix = await prisma.priceMatrix.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    // Get Seasonality Reference count and last updated
    const seasonalityCount = await prisma.seasonalityReference.count();
    const latestSeasonality = await prisma.seasonalityReference.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const formatDate = (date: Date | undefined | null) =>
      date
        ? new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Never";

    const euroRetailLastUpdated = formatDate(latestEuroRetail?.updatedAt);
    const priceMatrixLastUpdated = formatDate(latestPriceMatrix?.updatedAt);
    const seasonalityLastUpdated = formatDate(latestSeasonality?.updatedAt);

    return NextResponse.json({
      euroRetailCount,
      euroRetailLastUpdated,
      priceMatrixCount,
      priceMatrixLastUpdated,
      seasonalityCount,
      seasonalityLastUpdated,
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
