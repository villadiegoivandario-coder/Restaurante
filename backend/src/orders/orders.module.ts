import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SplitOrderController } from './split-order.controller';
import { SplitOrderService } from './split-order.service';

@Module({
  controllers: [OrdersController, SplitOrderController],
  providers: [OrdersService, SplitOrderService],
})
export class OrdersModule {}
