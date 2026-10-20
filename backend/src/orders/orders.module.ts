import { Module } from '@nestjs/common';
import { KitchenGateway } from './kitchen.gateway';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SplitOrderController } from './split-order.controller';
import { SplitOrderService } from './split-order.service';

@Module({
  controllers: [OrdersController, SplitOrderController],
  providers: [OrdersService, SplitOrderService, KitchenGateway],
})
export class OrdersModule {}
