import { Server } from 'socket.io';

let io;

export const initSocket = (server, frontendOrigin) => {
  io = new Server(server, {
    cors: {
      origin: frontendOrigin,
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
