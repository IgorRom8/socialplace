import { io, type Socket } from 'socket.io-client';
import { getApiBase } from '@/shared/config/api';

function socketTransports(): ('polling' | 'websocket')[] {
  const base = getApiBase();
  // На Render апгрейд до WebSocket часто обрывается; long-polling стабильнее.
  if (base.includes('.onrender.com')) {
    return ['polling'];
  }
  return ['polling', 'websocket'];
}

/** Клиент Socket.IO к тому же хосту, что и REST. */
export function createSocialSocket(): Socket {
  return io(getApiBase(), {
    autoConnect: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 20000,
    timeout: 30000,
    transports: socketTransports(),
  });
}

/** Подписка на личную комнату userId — только после connect, иначе join теряется. */
export function joinSocialUserRoom(socket: Socket, userId: string): void {
  const id = userId.trim();
  if (!id) return;
  const join = () => {
    socket.emit('join', { userId: id });
  };
  if (socket.connected) {
    join();
    return;
  }
  socket.on('connect', join);
}
