const winston = require("winston");
const config = require("./env");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (config.nodeEnv === "production" ? "info" : "debug"),
  defaultMeta: { application: "pulseops-log-monitor", environment: config.nodeEnv },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = logger;
