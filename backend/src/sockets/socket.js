const { Server } = require("socket.io");
const config = require("../config/env");
const logger = require("../config/logger");
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
    pingInterval: 25000, pingTimeout: 20000
  });
  io.on("connection", socket => {
    logger.info("socket_connected", { socketId: socket.id });
    socket.on("disconnect", reason => logger.info("socket_disconnected", { socketId: socket.id, reason }));
  });
  return io;
}
module.exports = { initializeSocket };
