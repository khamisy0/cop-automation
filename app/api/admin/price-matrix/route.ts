import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.priceMatrix.findMany({
      orderBy: { country: "asc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      country,
      brandCode,
      season,
      supplier,
      section,
      foreignRetailFOB,
      unitRetail,
      effectiveDate,
      expiryDate,
    } = body;

    // Validate required fields
    if (
      !country ||
      !brandCode ||
      !season ||
      !supplier ||
      foreignRetailFOB === undefined ||
      unitRetail === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if combination already exists
    const existing = await prisma.priceMatrix.findFirst({
      where: {
        country,
        brandCode,
        season,
        supplier,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Entry with this country, brand, season, and supplier already exists",
        },
        { status: 400 }
      );
    }

    const entry = await prisma.priceMatrix.create({
      data: {
        country,
        brandCode,
        season,
        supplier,
        section: section || null,
        foreignRetailFOB: parseFloat(foreignRetailFOB),
        unitRetail: parseFloat(unitRetail),
        effectiveDate: new Date(effectiveDate),
        expiryDate: new Date(expiryDate),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.priceMatrix.deleteMany({});
    return NextResponse.json({ message: "All entries deleted successfully" });
  } catch (error) {
    console.error("Error deleting all entries:", error);
    return NextResponse.json(
      { error: "Failed to delete all entries" },
      { status: 500 }
    );
  }
}
