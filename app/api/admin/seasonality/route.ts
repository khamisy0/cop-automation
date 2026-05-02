import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// DELETE to clear all records (e.g., when uploading a fresh master dataset)
export async function DELETE(request: Request) {
  try {
    const { count } = await prisma.seasonalityReference.deleteMany();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error deleting seasonality references:", error);
    return NextResponse.json(
      { error: "Failed to clear reference dataset" },
      { status: 500 }
    );
  }
}
