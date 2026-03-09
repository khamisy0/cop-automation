-- CreateTable
CREATE TABLE "euro_retail" (
    "id" SERIAL NOT NULL,
    "mancode" TEXT NOT NULL,
    "euroRetail" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "euro_retail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_matrix" (
    "id" SERIAL NOT NULL,
    "euroRetail" DOUBLE PRECISION NOT NULL,
    "localRetail" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "euro_retail_mancode_key" ON "euro_retail"("mancode");
