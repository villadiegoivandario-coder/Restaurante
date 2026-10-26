import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma, SplitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SplitOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async splitByEqualParts(orderId: string, partsCount: number) {
    if (!Number.isInteger(partsCount) || partsCount < 2 || partsCount > 30) {
      throw new BadRequestException('La división debe tener entre 2 y 30 partes.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, total: true, status: true },
        });
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (order.status !== OrderStatus.DELIVERED) {
          throw new BadRequestException('Solo se pueden dividir pedidos entregados.');
        }

        const previousSplits = await tx.orderSplit.findMany({
          where: { orderId },
          select: { isPaid: true },
        });
        if (previousSplits.some((split) => split.isPaid)) {
          throw new ConflictException(
            'No se puede volver a dividir una cuenta que ya tiene pagos registrados.',
          );
        }

        const cents = order.total.mul(100).toDecimalPlaces(0).toNumber();
        const baseCents = Math.floor(cents / partsCount);
        const extraCents = cents % partsCount;
        await tx.orderSplit.deleteMany({ where: { orderId, isPaid: false } });

        await tx.orderSplit.createMany({
          data: Array.from({ length: partsCount }, (_, index) => ({
            orderId,
            splitNumber: index + 1,
            splitType: SplitType.EQUAL_PARTS,
            amount: new Prisma.Decimal(baseCents + (index < extraCents ? 1 : 0)).div(100),
          })),
        });
        return tx.orderSplit.findMany({
          where: { orderId },
          orderBy: { splitNumber: 'asc' },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async processSplitPayment(splitId: string, method: PaymentMethod) {
    return this.prisma.$transaction(
      async (tx) => {
        const split = await tx.orderSplit.findUnique({
          where: { id: splitId },
          include: { order: { select: { status: true } } },
        });
        if (!split) throw new NotFoundException('Subcuenta no encontrada.');
        if (split.isPaid) throw new ConflictException('Esta parte de la cuenta ya fue pagada.');
        if (split.order.status !== OrderStatus.DELIVERED) {
          throw new BadRequestException('Solo se pueden cobrar pedidos entregados.');
        }

        const register = await tx.cashRegister.findFirst({
          where: { status: 'OPEN' },
          orderBy: { openedAt: 'desc' },
          select: { id: true },
        });
        if (!register) throw new BadRequestException('No hay una caja abierta para registrar el pago.');

        const markedPaid = await tx.orderSplit.updateMany({
          where: { id: splitId, isPaid: false },
          data: { isPaid: true },
        });
        if (markedPaid.count !== 1) {
          throw new ConflictException('La subcuenta cambió mientras se procesaba el pago.');
        }

        const payment = await tx.payment.create({
          data: {
            orderId: split.orderId,
            orderSplitId: split.id,
            registerId: register.id,
            amount: split.amount,
            method,
          },
        });

        const remainingUnpaidSplits = await tx.orderSplit.count({
          where: { orderId: split.orderId, isPaid: false },
        });
        if (remainingUnpaidSplits === 0) {
          await tx.order.updateMany({
            where: { id: split.orderId, status: OrderStatus.DELIVERED },
            data: { status: OrderStatus.PAID },
          });
        }

        return {
          payment,
          orderStatus: remainingUnpaidSplits === 0 ? OrderStatus.PAID : 'PARTIALLY_PAID',
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
