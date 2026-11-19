const logService = require("../services/logService");
const logger = require("../config/logger");

async function ingestLog(req, res) {
  const log = await logService.createLog(req.validatedLog);
  req.app.get("io").emit("new_log", log);
  logger.info("log_ingested", { requestId: req.requestId, logId: String(log._id), service: log.service, level: log.level });
  return res.status(201).json({ success: true, message: "Log ingested successfully", data: log });
}
async function listLogs(req, res) {
  return res.status(200).json({ success: true, ...await logService.getLogs(req.query) });
}
async function metrics(req, res) {
  return res.status(200).json({ success: true, data: await logService.getMetrics(req.query.windowMinutes) });
}
async function alerts(req, res) {
  return res.status(200).json({ success: true, data: await logService.getAlerts(req.query.limit) });
}
async function services(req, res) {
  return res.status(200).json({ success: true, data: await logService.getServices(req.query.windowMinutes) });
}
module.exports = { ingestLog, listLogs, metrics, alerts, services };
