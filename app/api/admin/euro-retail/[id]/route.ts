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

    const entry = await prisma.euroRetail.update({
      where: { id: parseInt(id) },
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

    await prisma.euroRetail.delete({
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
