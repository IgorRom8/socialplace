import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocialService } from './social.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly socialService: SocialService) {}

  emitFriendRequest(
    receiverId: string,
    payload: { requestId: string; sender: { id: string; fullName: string; email: string } },
  ) {
    this.server.to(String(receiverId).trim()).emit('friend_request', payload);
  }

  emitFriendRequestCancelled(receiverId: string, payload: { requestId: string }) {
    this.server.to(String(receiverId).trim()).emit('friend_request_cancelled', payload);
  }

  emitFriendRequestResolved(
    senderId: string,
    payload: {
      accepted: boolean;
      requestId: string;
      friend?: { id: string; fullName: string; email: string };
    },
  ) {
    this.server.to(String(senderId).trim()).emit('friend_request_resolved', payload);
  }

  emitDirectMessage(message: {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: Date;
    attachmentUrl: string | null;
    attachmentType: string | null;
  }) {
    this.server.to(message.senderId).emit('new_message', message);
    this.server.to(message.receiverId).emit('new_message', message);
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() payload: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(payload.userId);
    this.logger.log(`User ${payload.userId} joined personal room`);
    return { ok: true };
  }

  @SubscribeMessage('private_message')
  async handlePrivateMessage(
    @MessageBody()
    payload: { senderId: string; receiverId: string; content: string },
  ) {
    const message = await this.socialService.sendDirectMessage(
      payload.senderId,
      payload.receiverId,
      payload.content,
    );
    this.server.to(payload.receiverId).emit('new_message', message);
    this.server.to(payload.senderId).emit('new_message', message);
    return message;
  }
}
