const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const config = require("./config/env");
const logger = require("./config/logger");
const requestContext = require("./middleware/requestContext");
const logRoutes = require("./routes/logRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    if (!origin || config.clientOrigin.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  }, exposedHeaders: ["x-request-id"] }));
  app.use(compression());
  app.use(requestContext);
  app.use(express.json({ limit: "256kb" }));
  morgan.token("request-id", req => req.requestId);
  app.use(morgan(':method :url :status :response-time ms requestId=:request-id', {
    stream: { write: message => logger.info("http_access", { message: message.trim() }) }
  }));
  app.use("/api", rateLimit({
    windowMs: config.rateLimitWindowMs, limit: config.rateLimitMax,
    standardHeaders: "draft-7", legacyHeaders: false
  }));
  app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      success: connected, service: "pulseops-api", status: connected ? "healthy" : "degraded",
      database: connected ? "connected" : "disconnected", databaseState: mongoose.connection.readyState,
      uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString(), requestId: req.requestId
    });
  });
  app.use("/api/logs", logRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
