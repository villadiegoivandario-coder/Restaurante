import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SplitOrderDto } from './dto/split-order.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import { SplitOrderService } from './split-order.service';

@Controller('orders/:orderId/splits')
export class SplitOrderController {
  constructor(private readonly splitOrderService: SplitOrderService) {}

  @Post()
  splitByEqualParts(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() dto: SplitOrderDto,
  ) {
    return this.splitOrderService.splitByEqualParts(orderId, dto.partsCount);
  }

  @Post(':splitId/payment')
  processSplitPayment(
    @Param('splitId', new ParseUUIDPipe()) splitId: string,
    @Body() dto: SplitPaymentDto,
  ) {
    return this.splitOrderService.processSplitPayment(splitId, dto.method);
  }
}
