/**
 * Database Seeding Script for Automation Hub
 * 
 * Usage:
 * 1. Configure DATABASE_URL in .env.local
 * 2. Run: npx ts-node --project tsconfig.node.json prisma/seed.ts
 * 
 * This will populate the database with sample data for testing.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.priceMatrix.deleteMany();
    await prisma.euroRetail.deleteMany();

    // Seed EuroRetail table with sample data
    console.log('📦 Seeding Euro Retail table...');
    const euroRetailData = [
      {
        batchNumber: 'BATCH001',
        lineNumber: '001',
        brandCode: 'BR001',
        brandDescription: 'Premium Brand A',
        mancode: 'MC001',
        colorSize: 'Black/M',
        effectiveDate: new Date('2026-01-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 25.50,
      },
      {
        batchNumber: 'BATCH001',
        lineNumber: '002',
        brandCode: 'BR001',
        brandDescription: 'Premium Brand A',
        mancode: 'MC002',
        colorSize: 'White/L',
        effectiveDate: new Date('2026-01-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 28.75,
      },
      {
        batchNumber: 'BATCH001',
        lineNumber: '003',
        brandCode: 'BR002',
        brandDescription: 'Classic Brand B',
        mancode: 'MC003',
        colorSize: 'Navy/S',
        effectiveDate: new Date('2026-01-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 32.00,
      },
      {
        batchNumber: 'BATCH002',
        lineNumber: '001',
        brandCode: 'BR002',
        brandDescription: 'Classic Brand B',
        mancode: 'MC004',
        colorSize: 'Red/M',
        effectiveDate: new Date('2026-02-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 29.95,
      },
      {
        batchNumber: 'BATCH002',
        lineNumber: '002',
        brandCode: 'BR003',
        brandDescription: 'Modern Brand C',
        mancode: 'MC005',
        colorSize: 'Gray/XL',
        effectiveDate: new Date('2026-02-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 35.50,
      },
      {
        batchNumber: 'BATCH002',
        lineNumber: '003',
        brandCode: 'BR003',
        brandDescription: 'Modern Brand C',
        mancode: 'MC006',
        colorSize: 'Blue/L',
        effectiveDate: new Date('2026-02-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 27.99,
      },
      {
        batchNumber: 'BATCH003',
        lineNumber: '001',
        brandCode: 'BR001',
        brandDescription: 'Premium Brand A',
        mancode: 'MC007',
        colorSize: 'Beige/M',
        effectiveDate: new Date('2026-03-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 31.25,
      },
      {
        batchNumber: 'BATCH003',
        lineNumber: '002',
        brandCode: 'BR004',
        brandDescription: 'Sport Brand D',
        mancode: 'MC008',
        colorSize: 'Black/S',
        effectiveDate: new Date('2026-03-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 22.50,
      },
      {
        batchNumber: 'BATCH003',
        lineNumber: '003',
        brandCode: 'BR004',
        brandDescription: 'Sport Brand D',
        mancode: 'MC009',
        colorSize: 'White/M',
        effectiveDate: new Date('2026-03-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 23.75,
      },
      {
        batchNumber: 'BATCH003',
        lineNumber: '004',
        brandCode: 'BR002',
        brandDescription: 'Classic Brand B',
        mancode: 'MC010',
        colorSize: 'Green/L',
        effectiveDate: new Date('2026-03-01'),
        importFileColor: null,
        importFileSizeList: null,
        euroRetail: 26.00,
      },
    ];

    for (const item of euroRetailData) {
      await prisma.euroRetail.create({
        data: item,
      });
    }
    console.log(`✓ Created ${euroRetailData.length} Euro Retail entries`);

    // Seed PriceMatrix table with sample data
    console.log('📊 Seeding Price Matrix table...');
    const priceMatrixData = [
      {
        country: 'UAE',
        brandCode: 'BR001',
        season: 'SS26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 25.50,
        unitRetail: 89.99,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-06-30'),
      },
      {
        country: 'UAE',
        brandCode: 'BR002',
        season: 'SS26',
        supplier: 'SUP002',
        section: null,
        foreignRetailFOB: 32.00,
        unitRetail: 109.99,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-06-30'),
      },
      {
        country: 'UAE',
        brandCode: 'BR003',
        season: 'SS26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 35.50,
        unitRetail: 119.99,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-06-30'),
      },
      {
        country: 'KSA',
        brandCode: 'BR001',
        season: 'SS26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 25.50,
        unitRetail: 94.99,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-06-30'),
      },
      {
        country: 'KSA',
        brandCode: 'BR002',
        season: 'SS26',
        supplier: 'SUP002',
        section: null,
        foreignRetailFOB: 32.00,
        unitRetail: 119.99,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-06-30'),
      },
      {
        country: 'UAE',
        brandCode: 'BR004',
        season: 'SS26',
        supplier: 'SUP003',
        section: null,
        foreignRetailFOB: 22.50,
        unitRetail: 79.99,
        effectiveDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-07-31'),
      },
      {
        country: 'KSA',
        brandCode: 'BR003',
        season: 'SS26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 35.50,
        unitRetail: 129.99,
        effectiveDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-07-31'),
      },
      {
        country: 'QAT',
        brandCode: 'BR001',
        season: 'SS26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 25.50,
        unitRetail: 99.99,
        effectiveDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-07-31'),
      },
      {
        country: 'AE',
        brandCode: 'BR001',
        season: 'FW26',
        supplier: 'SUP001',
        section: null,
        foreignRetailFOB: 28.00,
        unitRetail: 99.99,
        effectiveDate: new Date('2026-07-01'),
        expiryDate: new Date('2026-12-31'),
      },
      {
        country: 'KSA',
        brandCode: 'BR004',
        season: 'SS26',
        supplier: 'SUP003',
        section: null,
        foreignRetailFOB: 22.50,
        unitRetail: 84.99,
        effectiveDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-07-31'),
      },
    ];

    for (const item of priceMatrixData) {
      await prisma.priceMatrix.create({
        data: item,
      });
    }
    console.log(`✓ Created ${priceMatrixData.length} Price Matrix entries`);

    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📋 Sample Data Inserted:');
    console.log('   - Euro Retail: 10 entries');
    console.log('   - Price Matrix: 10 entries');
  } catch (error) {
    console.error('🚨 Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
