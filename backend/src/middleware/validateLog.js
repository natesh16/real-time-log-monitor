const { LOG_LEVELS } = require("../constants/logLevels");

const allowedKeys = new Set([
  "service", "level", "message", "latencyMs", "metadata", "createdAt",
  "requestId", "traceId", "environment", "host", "source", "error"
]);

function validOptionalString(value, max, field, errors) {
  if (value !== undefined && value !== null &&
      (typeof value !== "string" || value.length > max)) {
    errors.push(`${field} must be a string of at most ${max} characters`);
  }
}

function validateLog(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
  }

  const unknownKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length) {
    return res.status(400).json({ success: false, message: "Unknown fields in log payload", errors: unknownKeys });
  }

  const errors = [];
  if (typeof body.service !== "string" || !body.service.trim() || body.service.trim().length > 100)
    errors.push("service must be a non-empty string of at most 100 characters");
  if (typeof body.level !== "string" || !LOG_LEVELS.includes(body.level.toUpperCase()))
    errors.push(`level must be one of: ${LOG_LEVELS.join(", ")}`);
  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 5000)
    errors.push("message must be a non-empty string of at most 5000 characters");
  if (body.latencyMs !== undefined && body.latencyMs !== null &&
      (typeof body.latencyMs !== "number" || !Number.isFinite(body.latencyMs) || body.latencyMs < 0))
    errors.push("latencyMs must be a non-negative number");
  if (body.metadata !== undefined &&
      (body.metadata === null || typeof body.metadata !== "object" || Array.isArray(body.metadata)))
    errors.push("metadata must be a JSON object");
  if (body.error !== undefined &&
      (body.error === null || typeof body.error !== "object" || Array.isArray(body.error)))
    errors.push("error must be a JSON object");
  if (body.createdAt !== undefined && Number.isNaN(Date.parse(body.createdAt)))
    errors.push("createdAt must be a valid date");

  validOptionalString(body.requestId, 128, "requestId", errors);
  validOptionalString(body.traceId, 128, "traceId", errors);
  validOptionalString(body.environment, 80, "environment", errors);
  validOptionalString(body.host, 160, "host", errors);
  validOptionalString(body.source, 80, "source", errors);

  if (errors.length) return res.status(400).json({ success: false, message: "Log validation failed", errors });

  const error = body.error || {};
  req.validatedLog = {
    service: body.service.trim(),
    level: body.level.toUpperCase(),
    message: body.message.trim(),
    requestId: body.requestId || req.requestId,
    traceId: body.traceId || null,
    environment: body.environment || process.env.NODE_ENV || "development",
    host: body.host || null,
    source: body.source || "api",
    latencyMs: body.latencyMs ?? null,
    metadata: body.metadata ?? {},
    error: {
      name: error.name || null,
      message: error.message || null,
      stack: error.stack || null,
      code: error.code || null
    },
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date()
  };
  next();
}

module.exports = validateLog;
