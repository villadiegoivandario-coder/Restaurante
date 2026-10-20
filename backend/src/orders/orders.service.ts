import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Flavor,
  OrderStatus,
  Prisma,
  Product,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';

const orderDetails = {
  items: {
    include: {
      portions: {
        include: {
          flavors: true,
          dips: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type ProductWithRecipe = Prisma.ProductGetPayload<{
  include: { recipe: { include: { ingredient: true } } };
}>;
type FlavorWithRecipe = Prisma.FlavorGetPayload<{
  include: { recipe: { include: { ingredient: true } } };
}>;
type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderDetails }>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderWithDetails> {
    const order = await this.prisma.$transaction(
      async (tx) => {
        const productIds = [...new Set(dto.items.map((item) => item.productId))];
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, active: true },
          include: { recipe: { include: { ingredient: true } } },
        });
        const productsById = new Map(products.map((product) => [product.id, product]));
        const missingProduct = productIds.find((id) => !productsById.has(id));
        if (missingProduct) {
          throw new NotFoundException(
            `Producto no encontrado o inactivo: ${missingProduct}`,
          );
        }

        if (dto.waiterId) {
          const waiter = await tx.user.findFirst({
            where: {
              id: dto.waiterId,
              active: true,
              role: { in: [Role.WAITER, Role.ADMIN] },
            },
            select: { id: true },
          });
          if (!waiter) {
            throw new BadRequestException('El mesero no existe, está inactivo o no tiene permiso para crear pedidos.');
          }
        }

        const dipIds = [
          ...new Set(
            dto.items.flatMap((item) =>
              (item.portions ?? []).flatMap((portion) =>
                (portion.dips ?? []).map((dip) => dip.productId),
              ),
            ),
          ),
        ];
        const dips = dipIds.length
          ? await tx.product.findMany({
              where: { id: { in: dipIds }, active: true, isDip: true },
              include: { recipe: { include: { ingredient: true } } },
            })
          : [];
        const dipsById = new Map(dips.map((dip) => [dip.id, dip]));
        const invalidDip = dipIds.find((id) => !dipsById.has(id));
        if (invalidDip) {
          throw new BadRequestException(`Dip no encontrado o inactivo: ${invalidDip}`);
        }

        const flavorIds = [
          ...new Set(
            dto.items.flatMap((item) =>
              (item.portions ?? []).flatMap((portion) =>
                portion.flavors.map((flavor) => flavor.flavorId),
              ),
            ),
          ),
        ];
        const flavors = flavorIds.length
          ? await tx.flavor.findMany({
              where: { id: { in: flavorIds }, active: true },
              include: { recipe: { include: { ingredient: true } } },
            })
          : [];
        const flavorsById = new Map(flavors.map((flavor) => [flavor.id, flavor]));
        const missingFlavor = flavorIds.find((id) => !flavorsById.has(id));
        if (missingFlavor) {
          throw new BadRequestException(`Sabor no encontrado o inactivo: ${missingFlavor}`);
        }

        this.validateSelections(dto.items, productsById, dipsById, flavorsById);
        const consumption = this.calculateConsumption(
          dto.items,
          productsById,
          dipsById,
          flavorsById,
        );

        for (const [ingredientId, amount] of consumption) {
          const updated = await tx.ingredient.updateMany({
            where: {
              id: ingredientId,
              active: true,
              stock: { gte: amount },
            },
            data: { stock: { decrement: amount } },
          });
          if (updated.count !== 1) {
            const ingredient = await tx.ingredient.findUnique({
              where: { id: ingredientId },
              select: { name: true, stock: true },
            });
            if (!ingredient) {
              throw new NotFoundException(`Ingrediente no encontrado: ${ingredientId}`);
            }
            throw new ConflictException(
              `Inventario insuficiente para ${ingredient.name}: disponible ${ingredient.stock}, requerido ${amount}.`,
            );
          }
        }

        let total = new Prisma.Decimal(0);
        const itemCreates: Prisma.OrderItemCreateWithoutOrderInput[] =
          dto.items.map((item) => {
            const product = productsById.get(item.productId)!;
            total = total.plus(product.price.mul(item.quantity));

            const portions: Prisma.OrderItemPortionCreateWithoutOrderItemInput[] =
              (item.portions ?? []).map((portion, index) => ({
                number: index + 1,
                flavors: {
                  create: portion.flavors.map((selection) => ({
                    flavorId: selection.flavorId,
                    flavorName: flavorsById.get(selection.flavorId)!.name,
                    pieces: selection.pieces,
                  })),
                },
                dips: {
                  create: (portion.dips ?? []).map((selection) => ({
                    productId: selection.productId,
                    productName: dipsById.get(selection.productId)!.name,
                    quantity: selection.quantity,
                  })),
                },
              }));

            return {
              product: { connect: { id: product.id } },
              productName: product.name,
              quantity: item.quantity,
              unitPrice: product.price,
              note: item.note,
              ...(portions.length > 0 ? { portions: { create: portions } } : {}),
            };
          });

        return tx.order.create({
          data: {
            type: dto.type,
            tableNumber: dto.tableNumber,
            tableName: dto.tableName,
            ...(dto.waiterId ? { waiter: { connect: { id: dto.waiterId } } } : {}),
            customerName: dto.customerName,
            phone: dto.phone,
            address: dto.address,
            note: dto.note,
            total,
            items: { create: itemCreates },
          },
          include: orderDetails,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderWithDetails> {
    const current = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new NotFoundException(`Pedido no encontrado: ${id}`);

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.IN_PREPARATION],
      [OrderStatus.IN_PREPARATION]: [OrderStatus.READY],
      [OrderStatus.READY]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.PAID],
    };
    if (!allowedTransitions[current.status]?.includes(status)) {
      throw new BadRequestException(
        `Transición de estado no permitida: ${current.status} -> ${status}.`,
      );
    }

    const updated = await this.prisma.order.updateMany({
      where: { id, status: current.status },
      data: { status },
    });
    if (updated.count !== 1) {
      throw new ConflictException('El pedido cambió mientras se actualizaba.');
    }

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderDetails,
    });
    return order;
  }

  private validateSelections(
    items: CreateOrderItemDto[],
    products: Map<string, ProductWithRecipe>,
    dips: Map<string, Product>,
    flavors: Map<string, FlavorWithRecipe>,
  ): void {
    for (const item of items) {
      const product = products.get(item.productId)!;
      if (product.piecesPerPortion === 0) {
        if (item.portions?.length) {
          throw new BadRequestException(
            `${product.name} no admite configuración de sabores por porción.`,
          );
        }
        continue;
      }

      if (item.portions?.length !== item.quantity) {
        throw new BadRequestException(
          `${product.name}: se requieren exactamente ${item.quantity} configuraciones de porción.`,
        );
      }

      for (const [index, portion] of item.portions.entries()) {
        const selectedFlavorIds = new Set(
          portion.flavors.map((selection) => selection.flavorId),
        );
        if (selectedFlavorIds.size !== portion.flavors.length) {
          throw new BadRequestException(
            `${product.name}, porción ${index + 1}: no repitas sabores; combina las piezas en una sola selección.`,
          );
        }

        const maxFlavors = product.allowsFlavors
          ? product.maxFlavors
          : 1;
        if (selectedFlavorIds.size > maxFlavors) {
          throw new BadRequestException(
            `${product.name}, porción ${index + 1}: máximo ${maxFlavors} sabor(es).`,
          );
        }

        const selectedPieces = portion.flavors.reduce(
          (sum, selection) => sum + selection.pieces,
          0,
        );
        if (selectedPieces !== product.piecesPerPortion) {
          throw new BadRequestException(
            `${product.name}, porción ${index + 1}: los sabores suman ${selectedPieces} piezas; deben sumar ${product.piecesPerPortion}.`,
          );
        }

        if (product.requiresDip && !portion.dips?.length) {
          throw new BadRequestException(
            `${product.name}, porción ${index + 1}: selecciona al menos un dip.`,
          );
        }
        for (const selectedDip of portion.dips ?? []) {
          if (!dips.has(selectedDip.productId)) {
            throw new BadRequestException(
              `El producto ${selectedDip.productId} no es un dip válido.`,
            );
          }
        }
        for (const selection of portion.flavors) {
          if (!flavors.has(selection.flavorId)) {
            throw new BadRequestException(`Sabor no válido: ${selection.flavorId}`);
          }
        }
      }
    }
  }

  private calculateConsumption(
    items: CreateOrderItemDto[],
    products: Map<string, ProductWithRecipe>,
    dips: Map<string, ProductWithRecipe>,
    flavors: Map<string, FlavorWithRecipe>,
  ): Map<string, Prisma.Decimal> {
    const consumption = new Map<string, Prisma.Decimal>();
    const add = (ingredientId: string, amount: Prisma.Decimal) => {
      consumption.set(
        ingredientId,
        (consumption.get(ingredientId) ?? new Prisma.Decimal(0)).plus(amount),
      );
    };
    const addRecipe = (
      product: ProductWithRecipe,
      multiplier: number,
    ): void => {
      for (const recipe of product.recipe) {
        add(recipe.ingredientId, recipe.quantityPerPortion.mul(multiplier));
      }
    };

    for (const item of items) {
      addRecipe(products.get(item.productId)!, item.quantity);
      for (const portion of item.portions ?? []) {
        for (const selection of portion.flavors) {
          const flavor = flavors.get(selection.flavorId)!;
          for (const recipe of flavor.recipe) {
            add(
              recipe.ingredientId,
              recipe.quantityPerPiece.mul(selection.pieces),
            );
          }
        }
        for (const selection of portion.dips ?? []) {
          addRecipe(dips.get(selection.productId)!, selection.quantity);
        }
      }
    }
    return consumption;
  }

}
