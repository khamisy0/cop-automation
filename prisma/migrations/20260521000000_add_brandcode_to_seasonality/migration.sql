-- Add brandCode column to seasonality_reference
ALTER TABLE "seasonality_reference" ADD COLUMN "brandCode" TEXT NOT NULL DEFAULT '';

-- Drop old indexes
DROP INDEX IF EXISTS "seasonality_reference_country_mancode_colorCode_idx";
DROP INDEX IF EXISTS "seasonality_reference_mancode_colorCode_idx";

-- Create new indexes optimised for brand-scoped lookups
CREATE INDEX "seasonality_reference_brandCode_mancode_colorCode_idx" ON "seasonality_reference"("brandCode", "mancode", "colorCode");
CREATE INDEX "seasonality_reference_brandCode_country_mancode_colorCode_idx" ON "seasonality_reference"("brandCode", "country", "mancode", "colorCode");
