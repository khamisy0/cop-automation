import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.euroRetail.findMany({
      orderBy: { batchNumber: "asc" },
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
      batchNumber,
      lineNumber,
      brandCode,
      brandDescription,
      mancode,
      colorSize,
      effectiveDate,
      importFileColor,
      importFileSizeList,
      euroRetail,
    } = body;

    // Validate required fields
    if (
      !batchNumber ||
      !lineNumber ||
      !brandCode ||
      !mancode ||
      euroRetail === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if batch+line combination already exists
    const existing = await prisma.euroRetail.findFirst({
      where: {
        batchNumber,
        lineNumber,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Entry with this batch and line number already exists" },
        { status: 400 }
      );
    }

    const entry = await prisma.euroRetail.create({
      data: {
        batchNumber,
        lineNumber,
        brandCode,
        brandDescription: brandDescription || "",
        mancode,
        colorSize: colorSize || "",
        effectiveDate: new Date(effectiveDate),
        importFileColor: importFileColor || null,
        importFileSizeList: importFileSizeList || null,
        euroRetail: parseFloat(euroRetail),
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
