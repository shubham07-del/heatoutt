import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client requests to join a device room
    socket.on('subscribe', (deviceId) => {
      socket.join(deviceId);
      console.log(`Socket ${socket.id} joined room: ${deviceId}`);
    });

    // Client requests to leave a device room
    socket.on('unsubscribe', (deviceId) => {
      socket.leave(deviceId);
      console.log(`Socket ${socket.id} left room: ${deviceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};
