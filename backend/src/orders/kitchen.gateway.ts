import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export const KITCHEN_ROOM = 'kitchen';

@WebSocketGateway({
  namespace: '/kitchen',
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? true },
})
export class KitchenGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  handleConnection(client: Socket): void {
    void client.join(KITCHEN_ROOM);
    client.emit('kitchen-connected', { namespace: '/kitchen' });
  }

  @SubscribeMessage('join-kitchen')
  joinKitchen(@ConnectedSocket() client: Socket): { joined: boolean } {
    void client.join(KITCHEN_ROOM);
    return { joined: true };
  }

  emitNewOrder(order: Record<string, unknown>): void {
    this.server.to(KITCHEN_ROOM).emit('new-kitchen-order', order);
  }

  emitOrderStatusUpdated(order: Record<string, unknown>): void {
    this.server.emit('order-status-updated', order);
  }
}
