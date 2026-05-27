import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Allow long-running deletes on large datasets (Vercel Pro caps at 60s).
export const maxDuration = 60;

// GET all seasonality reference records
export async function GET() {
  try {
    const records = await prisma.seasonalityReference.findMany({
      orderBy: { priority: "asc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching seasonality references:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference dataset" },
      { status: 500 }
    );
  }
}

// DELETE to clear records.
// ?legacy=true  → delete only records where brandCode is empty (pre-migration orphans)
// (no param)    → delete all records
// Deletes are batched to avoid serverless function timeouts on large tables.
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const legacyOnly = url.searchParams.get("legacy") === "true";
    const where = legacyOnly ? { brandCode: "" } : {};

    let totalDeleted = 0;
    const BATCH_SIZE = 10000;
    // Loop until no rows match — each deleteMany call frees a batch's worth of locks.
    for (;;) {
      const batch = await prisma.seasonalityReference.findMany({
        where,
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      const { count } = await prisma.seasonalityReference.deleteMany({
        where: { id: { in: batch.map((r) => r.id) } },
      });
      totalDeleted += count;
      if (batch.length < BATCH_SIZE) break;
    }

    return NextResponse.json({ success: true, count: totalDeleted });
  } catch (error) {
    console.error("Error deleting seasonality references:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to clear reference dataset: ${msg}` },
      { status: 500 }
    );
  }
}
