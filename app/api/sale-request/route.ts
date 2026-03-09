import { NextRequest, NextResponse } from 'next/server';
import { parseItemListFile, parsePriceListFile } from '@/modules/sale-request/parser';
import { processPricingForItems, buildEuroRetailMap, buildPriceMatrixMap } from '@/modules/sale-request/pricingEngine';
import { exportToExcel, generateOutputFilename } from '@/modules/sale-request/exporter';
import {
  validateItemList,
  validatePriceList,
  validateFormInputs,
} from '@/modules/sale-request/validator';
import { ProcessingResult, ProcessingError } from '@/modules/sale-request/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/sale-request
 * Handles file upload and processing for Sale Request pricing
 *
 * Expects FormData with:
 * - itemListFile: File (Excel with mancode, color, season, discount)
 * - priceListFile: File (Excel with multiple tabs of price matrices)
 * - brand: string (e.g., "INT", "CAL")
 * - country: string (e.g., "UAE", "QA")
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessingResult>> {
  const startTime = Date.now();
  const errors: ProcessingError[] = [];

  try {
    // Parse FormData
    const formData = await request.formData();

    const itemListFile = formData.get('itemListFile') as File | null;
    const priceListFile = formData.get('priceListFile') as File | null;
    const brand = (formData.get('brand') as string) || '';
    const country = (formData.get('country') as string) || '';

    // Validate form inputs
    const formErrors = validateFormInputs(brand, country);
    if (formErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Form validation failed',
          errors: formErrors,
        },
        { status: 400 }
      );
    }

    // Validate files
    if (!itemListFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Item list file is required',
          errors: [{ message: 'Item list file is required' }],
        },
        { status: 400 }
      );
    }

    if (!priceListFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price list file is required',
          errors: [{ message: 'Price list file is required' }],
        },
        { status: 400 }
      );
    }

    // Parse files
    const itemList = await parseItemListFile(itemListFile);
    const priceListData = await parsePriceListFile(priceListFile);

    // Validate item list
    const itemListErrors = validateItemList(itemList);
    if (itemListErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Item list validation failed',
          errors: itemListErrors,
        },
        { status: 400 }
      );
    }

    // Validate price list
    const priceListErrors = validatePriceList(priceListData, brand, country);
    if (priceListErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price list validation failed',
          errors: priceListErrors,
        },
        { status: 400 }
      );
    }

    // Fetch database records
    const euroRetailRecords = await prisma.euroRetail.findMany();
    const priceMatrixRecords = await prisma.priceMatrix.findMany();

    // Build maps for O(1) lookups
    const euroRetailMap = buildEuroRetailMap(euroRetailRecords);
    const priceMatrixMap = buildPriceMatrixMap(priceMatrixRecords);

    // Process pricing
    const { processedItems, errors: processingErrors } = await processPricingForItems(
      itemList,
      priceListData,
      euroRetailMap,
      priceMatrixMap,
      brand,
      country
    );

    // Check if there were processing errors
    if (processingErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Error processing items',
          errors: processingErrors,
          data: processedItems,
        },
        { status: 400 }
      );
    }

    // If no items were processed successfully, return error
    if (processedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No items were processed successfully',
          errors: processingErrors,
        },
        { status: 400 }
      );
    }

    // Export to Excel
    const excelBuffer = exportToExcel(processedItems);
    const filename = generateOutputFilename();

    const duration = Date.now() - startTime;

    // Return file as response
    return new NextResponse(Buffer.isBuffer(excelBuffer) ? excelBuffer : new Uint8Array(excelBuffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Processing-Time': `${duration}ms`,
        'X-Processed-Items': String(processedItems.length),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error processing sale request:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        errors: [{ message: errorMessage }],
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
