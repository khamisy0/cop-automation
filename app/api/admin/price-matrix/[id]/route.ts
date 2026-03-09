import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    const entry = await prisma.priceMatrix.update({
      where: { id: parseInt(id) },
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

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.priceMatrix.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
