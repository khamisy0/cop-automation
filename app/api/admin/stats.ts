import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get Euro Retail count and last updated
    const euroRetailCount = await prisma.euroRetail.count();
    const latestEuroRetail = await prisma.euroRetail.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    // Get Price Matrix count and last updated
    const priceMatrixCount = await prisma.priceMatrix.count();
    const latestPriceMatrix = await prisma.priceMatrix.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const euroRetailLastUpdated = latestEuroRetail
      ? new Date(latestEuroRetail.updatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Never";

    const priceMatrixLastUpdated = latestPriceMatrix
      ? new Date(latestPriceMatrix.updatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Never";

    return NextResponse.json({
      euroRetailCount,
      euroRetailLastUpdated,
      priceMatrixCount,
      priceMatrixLastUpdated,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
