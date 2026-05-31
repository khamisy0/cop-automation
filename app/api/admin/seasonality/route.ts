import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Allow long-running deletes on large datasets (Vercel Pro caps at 60s).
export const maxDuration = 60;

// GET seasonality reference records.
//
// IMPORTANT: never return the whole table. With the INT/UOMO sheet the table
// holds 340K+ rows (one record per brand per Excel row); dumping all of it in a
// single JSON response exceeds the serverless body/time limits and the browser
// reports "Failed to fetch". So the client asks for exactly what it renders:
//
//   ?mode=stats                              → per-brand count + last-updated (no rows)
//   ?brands=56,B6&page=1&pageSize=20&...     → one filtered, paginated page of rows
//
// Supported filters (table mode): country, mancode, colorCode, season (substring,
// case-insensitive) and priority (exact integer match).
const MAX_PAGE_SIZE = 5000; // big enough for the "download all" loop, small enough to stay well under the response cap

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // --- Stats mode: aggregate counts in the DB, return no row payload ---
    if (url.searchParams.get("mode") === "stats") {
      const grouped = await prisma.seasonalityReference.groupBy({
        by: ["brandCode"],
        _count: { _all: true },
        _max: { updatedAt: true },
      });
      return NextResponse.json(
        grouped.map((g) => ({
          brandCode: g.brandCode,
          count: g._count._all,
          lastUpdated: g._max.updatedAt,
        }))
      );
    }

    // --- Table mode: one filtered, paginated page ---
    const brands = (url.searchParams.get("brands") ?? "")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
    );

    const country = (url.searchParams.get("country") ?? "").trim();
    const mancode = (url.searchParams.get("mancode") ?? "").trim();
    const colorCode = (url.searchParams.get("colorCode") ?? "").trim();
    const season = (url.searchParams.get("season") ?? "").trim();
    const priorityRaw = (url.searchParams.get("priority") ?? "").trim();
    const priority = priorityRaw !== "" ? parseInt(priorityRaw, 10) : NaN;

    const where: Record<string, unknown> = {};
    if (brands.length) where.brandCode = { in: brands };
    if (country) where.country = { contains: country, mode: "insensitive" };
    if (mancode) where.mancode = { contains: mancode, mode: "insensitive" };
    if (colorCode) where.colorCode = { contains: colorCode, mode: "insensitive" };
    if (season) where.season = { contains: season, mode: "insensitive" };
    if (!Number.isNaN(priority)) where.priority = priority;

    const [rows, total] = await Promise.all([
      prisma.seasonalityReference.findMany({
        where,
        orderBy: [{ priority: "asc" }, { id: "asc" }], // stable order across pages
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.seasonalityReference.count({ where }),
    ]);

    return NextResponse.json({ rows, total, page, pageSize });
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
