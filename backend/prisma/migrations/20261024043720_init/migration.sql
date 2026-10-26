-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'UNIT');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegisterState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('WAITER', 'CASHIER', 'KITCHEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL_PARTS', 'BY_ITEM', 'CUSTOM_AMOUNT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WAITER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID,
    "price" DECIMAL(12,2) NOT NULL,
    "piecesPerPortion" INTEGER NOT NULL DEFAULT 0,
    "allowsFlavors" BOOLEAN NOT NULL DEFAULT true,
    "maxFlavors" INTEGER NOT NULL DEFAULT 1,
    "isDip" BOOLEAN NOT NULL DEFAULT false,
    "requiresDip" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flavor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "spiceLevel" SMALLINT NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flavor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantityPerPortion" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlavorRecipe" (
    "id" UUID NOT NULL,
    "flavorId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantityPerPiece" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "FlavorRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "tableNumber" INTEGER,
    "tableName" TEXT,
    "waiterId" UUID,
    "customerName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemPortion" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "OrderItemPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemPortionFlavor" (
    "portionId" UUID NOT NULL,
    "flavorId" UUID NOT NULL,
    "flavorName" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,

    CONSTRAINT "OrderItemPortionFlavor_pkey" PRIMARY KEY ("portionId","flavorId")
);

-- CreateTable
CREATE TABLE "OrderItemPortionDip" (
    "portionId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderItemPortionDip_pkey" PRIMARY KEY ("portionId","productId")
);

-- CreateTable
CREATE TABLE "OrderSplit" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "splitNumber" INTEGER NOT NULL,
    "splitType" "SplitType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitItem" (
    "id" UUID NOT NULL,
    "orderSplitId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "SplitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" UUID NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "closingAmount" DECIMAL(12,2),
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RegisterState" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "registerId" UUID NOT NULL,
    "orderSplitId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Flavor_name_key" ON "Flavor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Ingredient_active_name_idx" ON "Ingredient"("active", "name");

-- CreateIndex
CREATE INDEX "Recipe_ingredientId_idx" ON "Recipe"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_ingredientId_key" ON "Recipe"("productId", "ingredientId");

-- CreateIndex
CREATE INDEX "FlavorRecipe_ingredientId_idx" ON "FlavorRecipe"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "FlavorRecipe_flavorId_ingredientId_key" ON "FlavorRecipe"("flavorId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_type_createdAt_idx" ON "Order"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Order_waiterId_createdAt_idx" ON "Order"("waiterId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemPortion_orderItemId_number_key" ON "OrderItemPortion"("orderItemId", "number");

-- CreateIndex
CREATE INDEX "OrderItemPortionFlavor_flavorId_idx" ON "OrderItemPortionFlavor"("flavorId");

-- CreateIndex
CREATE INDEX "OrderItemPortionDip_productId_idx" ON "OrderItemPortionDip"("productId");

-- CreateIndex
CREATE INDEX "OrderSplit_orderId_isPaid_idx" ON "OrderSplit"("orderId", "isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSplit_orderId_splitNumber_key" ON "OrderSplit"("orderId", "splitNumber");

-- CreateIndex
CREATE INDEX "SplitItem_orderItemId_idx" ON "SplitItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitItem_orderSplitId_orderItemId_key" ON "SplitItem"("orderSplitId", "orderItemId");

-- CreateIndex
CREATE INDEX "CashRegister_status_openedAt_idx" ON "CashRegister"("status", "openedAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderSplitId_idx" ON "Payment"("orderSplitId");

-- CreateIndex
CREATE INDEX "Payment_registerId_receivedAt_idx" ON "Payment"("registerId", "receivedAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlavorRecipe" ADD CONSTRAINT "FlavorRecipe_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlavorRecipe" ADD CONSTRAINT "FlavorRecipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPortion" ADD CONSTRAINT "OrderItemPortion_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPortionFlavor" ADD CONSTRAINT "OrderItemPortionFlavor_portionId_fkey" FOREIGN KEY ("portionId") REFERENCES "OrderItemPortion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPortionFlavor" ADD CONSTRAINT "OrderItemPortionFlavor_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPortionDip" ADD CONSTRAINT "OrderItemPortionDip_portionId_fkey" FOREIGN KEY ("portionId") REFERENCES "OrderItemPortion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPortionDip" ADD CONSTRAINT "OrderItemPortionDip_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSplit" ADD CONSTRAINT "OrderSplit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitItem" ADD CONSTRAINT "SplitItem_orderSplitId_fkey" FOREIGN KEY ("orderSplitId") REFERENCES "OrderSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitItem" ADD CONSTRAINT "SplitItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderSplitId_fkey" FOREIGN KEY ("orderSplitId") REFERENCES "OrderSplit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
