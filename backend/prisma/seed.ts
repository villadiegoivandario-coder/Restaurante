import { hash } from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const waiterPassword = process.env.WAITER_PASSWORD;
  const cashierPassword = process.env.CASHIER_PASSWORD;
  if (!waiterPassword || !cashierPassword) {
    throw new Error('Set WAITER_PASSWORD and CASHIER_PASSWORD before running the seed.');
  }

  const [waiterHash, cashierHash] = await Promise.all([
    hash(waiterPassword, 12),
    hash(cashierPassword, 12),
  ]);

  await prisma.user.upsert({
    where: { username: 'mesero1' },
    update: { name: 'Carlos (Mesero 1)', role: Role.WAITER, active: true },
    create: {
      name: 'Carlos (Mesero 1)',
      username: 'mesero1',
      password: waiterHash,
      role: Role.WAITER,
    },
  });
  await prisma.user.upsert({
    where: { username: 'caja1' },
    update: { name: 'Ana (Caja Principal)', role: Role.CASHIER, active: true },
    create: {
      name: 'Ana (Caja Principal)',
      username: 'caja1',
      password: cashierHash,
      role: Role.CASHIER,
    },
  });

  const categories = [
    {
      name: 'Porciones de Alitas',
      products: [
        { name: 'Porción 6 Alitas + Papas + Dips', price: '18000', piecesPerPortion: 6, maxFlavors: 1 },
        { name: 'Porción 12 Alitas + Papas + Dips', price: '32000', piecesPerPortion: 12, maxFlavors: 2 },
        { name: 'Porción 24 Alitas + Papas + Dips', price: '60000', piecesPerPortion: 24, maxFlavors: 4 },
      ],
    },
    {
      name: 'Bebidas & Cervezas',
      products: [
        { name: 'Gaseosa 400ml', price: '5000', piecesPerPortion: 0, maxFlavors: 0 },
        { name: 'Cerveza Nacional', price: '7000', piecesPerPortion: 0, maxFlavors: 0 },
        { name: 'Limonada Cerezada', price: '9000', piecesPerPortion: 0, maxFlavors: 0 },
      ],
    },
  ];

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { name: categoryData.name },
      update: {},
      create: { name: categoryData.name },
    });
    for (const product of categoryData.products) {
      await prisma.product.upsert({
        where: { name: product.name },
        update: {},
        create: {
          ...product,
          price: product.price,
          categoryId: category.id,
          allowsFlavors: product.piecesPerPortion > 0,
        },
      });
    }
  }

  for (const [name, spiceLevel] of [
    ['BBQ Tradicional', 0],
    ['Búfalo Picante', 3],
    ['Miel Mostaza', 0],
    ['Teriyaki Dulce', 0],
    ['Llama Fuego Extremo', 5],
  ] as const) {
    await prisma.flavor.upsert({
      where: { name },
      update: {},
      create: { name, spiceLevel },
    });
  }

  console.log('Seed completed: users, categories, products, and flavors are ready.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
