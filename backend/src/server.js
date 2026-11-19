const http = require("http");
const mongoose = require("mongoose");
const config = require("./config/env");
const logger = require("./config/logger");
const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { initializeSocket } = require("./sockets/socket");

async function startServer() {
  await connectDatabase();
  const app = createApp();
  const httpServer = http.createServer(app);
  const io = initializeSocket(httpServer);
  app.set("io", io);

  httpServer.listen(config.port, () => logger.info("server_started", { port: config.port, environment: config.nodeEnv }));
  let shuttingDown = false;
  const shutdown = signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("server_shutdown", { signal });
    httpServer.close(async () => {
      await io.close();
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
if (require.main === module) startServer().catch(error => {
  logger.error("server_start_failed", { error: error.message, stack: error.stack });
  process.exit(1);
});
module.exports = { startServer };
