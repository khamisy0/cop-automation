import { NextRequest, NextResponse } from 'next/server';
import { parseBrandManager } from '@/lib/parseBrandManager';
import { parseRHM } from '@/lib/parseRHM';
import { mergeAndCalculate, calculateSummary } from '@/lib/mergeLogic';
import { formatERPLines, generateTXTContent } from '@/lib/formatERP';
import {
  validateBrandManagerData,
  validateRHMData,
  validateFormInputs,
  validateMissingKeys,
} from '@/lib/validation';
import { ProcessingResult, ProcessingError } from '@/lib/types';

/**
 * POST /api/process
 * Handles file upload and processing
 *
 * Expects FormData with:
 * - brandManagerFile: File
 * - rhmFile: File
 * - countryCode: string
 * - brand: string
 * - supplier: string
 * - reason: string
 * - newEffectiveDate: string
 * - compensated: 'Yes' | 'No'
 * - transactionDescription: string
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessingResult>> {
  const startTime = Date.now();
  const errors: ProcessingError[] = [];

  try {
    // Parse FormData
    const formData = await request.formData();

    const brandManagerFile = formData.get('brandManagerFile') as File | null;
    const rhmFile = formData.get('rhmFile') as File | null;

    // Parse form inputs
    const formInputs = {
      countryCode: (formData.get('countryCode') as string) || '',
      brand: (formData.get('brand') as string) || '',
      supplier: (formData.get('supplier') as string) || '',
      reason: (formData.get('reason') as string) || '',
      newEffectiveDate: (formData.get('newEffectiveDate') as string) || '',
      compensated: (formData.get('compensated') as 'Yes' | 'No') || 'No',
      transactionDescription: (formData.get('transactionDescription') as string) || '',
    };

    // Validate files
    if (!brandManagerFile) {
      errors.push({
        type: 'validation',
        message: 'Brand Manager file is required',
      });
    }

    if (!rhmFile) {
      errors.push({
        type: 'validation',
        message: 'RHM file is required',
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          validation: { isValid: false, errors },
          error: 'Missing required files',
        },
        { status: 400 }
      );
    }

    // Validate form inputs
    const formValidation = validateFormInputs(formInputs);
    if (!formValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          validation: formValidation,
          error: 'Invalid form inputs',
        },
        { status: 400 }
      );
    }

    // Parse files
    console.log('Parsing Brand Manager file...');
    const { data: brandManagerData, errors: bmErrors } =
      await parseBrandManager(brandManagerFile!);
    if (bmErrors.length > 0) {
      errors.push(...bmErrors);
    }

    console.log('Parsing RHM file...');
    const { data: rhmData, errors: rhmErrors } = await parseRHM(rhmFile!);
    if (rhmErrors.length > 0) {
      errors.push(...rhmErrors);
    }

    // Return early if parsing failed
    if (errors.some((e) => e.type === 'parsing')) {
      return NextResponse.json(
        {
          success: false,
          validation: { isValid: false, errors },
          error: 'Failed to parse files',
        },
        { status: 400 }
      );
    }

    // Validate parsed data
    console.log('Validating Brand Manager data...');
    const bmValidation = validateBrandManagerData(brandManagerData);
    if (!bmValidation.isValid && bmValidation.errors.length > 0) {
      // Don't fail on validation errors - just warn but continue
      console.warn('Brand Manager validation warnings:', bmValidation.errors);
      errors.push(...bmValidation.errors.slice(0, 5)); // Limit errors shown
    }

    console.log('Validating RHM data...');
    const rhmValidation = validateRHMData(rhmData);
    if (!rhmValidation.isValid && rhmValidation.errors.length > 0) {
      console.warn('RHM validation warnings:', rhmValidation.errors);
      errors.push(...rhmValidation.errors.slice(0, 5)); // Limit errors shown
    }

    // Check for missing keys
    console.log('Checking for missing keys...');
    const brandManagerKeys = new Set(
      brandManagerData.map((row) => `${row.mancode}|${row.color}`)
    );
    const rhmKeys = new Set(rhmData.map((row) => `${row.mancode}|${row.color}`));

    const mergeValidation = validateMissingKeys(brandManagerKeys, rhmKeys);
    if (!mergeValidation.isValid) {
      const missingCount = mergeValidation.errors[0]?.missingKeys?.length || 0;
      errors.push({
        type: 'merge',
        message: `${missingCount} SKU combinations are missing from Brand Manager file. Processing will skip these items.`,
      });
    }

    // Merge data
    console.log('Merging data...');
    const { mergedData, errors: mergeErrors } = mergeAndCalculate(brandManagerData, rhmData);

    if (mergeErrors.length > 0) {
      errors.push(...mergeErrors.slice(0, 10)); // Limit errors shown to user
    }

    if (mergedData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          validation: { isValid: false, errors },
          error: 'No valid records to process after merge',
        },
        { status: 400 }
      );
    }

    // Format ERP lines
    console.log('Formatting ERP lines...');
    const erpLines = formatERPLines(mergedData, formInputs);

    // Generate TXT content
    const txtContent = generateTXTContent(erpLines);

    // Calculate summary
    const summary = calculateSummary(mergedData);
    summary.missingItemsCount = mergeErrors.length;

    console.log(`Processing completed in ${Date.now() - startTime}ms`);

    return NextResponse.json(
      {
        success: true,
        data: mergedData,
        erpLines,
        validation: { isValid: errors.length === 0, errors },
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error during processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        validation: {
          isValid: false,
          errors: [
            {
              type: 'parsing',
              message: errorMessage,
            },
          ],
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
