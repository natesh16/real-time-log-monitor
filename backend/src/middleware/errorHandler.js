const logger = require("../config/logger");
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, requestId: req.requestId });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || (err.type === "entity.too.large" ? 413 : 500);
  logger.error("http_request_failed", { requestId: req.requestId, method: req.method, path: req.originalUrl, status, error: err.message, stack: err.stack });
  res.status(status).json({
    success: false, message: status === 500 ? "Internal server error" : err.message,
    requestId: req.requestId, ...(err.details ? { details: err.details } : {})
  });
}
module.exports = { notFound, errorHandler };
