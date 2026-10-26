import { IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class SplitPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
