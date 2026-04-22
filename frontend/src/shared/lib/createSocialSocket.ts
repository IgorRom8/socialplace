import { io, type Socket } from 'socket.io-client';
import { getApiBase } from '@/shared/config/api';

/** Клиент Socket.IO к тому же хосту, что и REST. */
export function createSocialSocket(): Socket {
  return io(getApiBase(), {
    autoConnect: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 20000,
    timeout: 20000,
    transports: ['polling', 'websocket'],
  });
}
