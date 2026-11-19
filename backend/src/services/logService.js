const Log = require("../models/Log");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilter(query) {
  const filter = {};
  if (query.level && query.level !== "ALL") filter.level = query.level.toUpperCase();
  if (query.service && query.service !== "ALL") filter.service = query.service;
  if (query.requestId) filter.requestId = { $regex: escapeRegex(String(query.requestId).slice(0, 128)), $options: "i" };
  if (query.environment) filter.environment = query.environment;
  if (query.search) {
    const safe = escapeRegex(String(query.search).slice(0, 120));
    filter.$or = [
      { message: { $regex: safe, $options: "i" } },
      { service: { $regex: safe, $options: "i" } },
      { requestId: { $regex: safe, $options: "i" } },
      { traceId: { $regex: safe, $options: "i" } }
    ];
  }
  if (query.from || query.to) {
    filter.receivedAt = {};
    if (query.from && !Number.isNaN(Date.parse(query.from))) filter.receivedAt.$gte = new Date(query.from);
    if (query.to && !Number.isNaN(Date.parse(query.to))) filter.receivedAt.$lte = new Date(query.to);
    if (!Object.keys(filter.receivedAt).length) delete filter.receivedAt;
  }
  return filter;
}

async function createLog(payload) {
  const log = await Log.create(payload);
  return log.toObject();
}

async function getLogs(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit, 10) || 50));
  const filter = buildFilter(query);
  const [items, total] = await Promise.all([
    Log.find(filter).sort({ receivedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Log.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getMetrics(windowMinutes = 60) {
  const minutes = Math.min(1440, Math.max(1, Number(windowMinutes) || 60));
  const since = new Date(Date.now() - minutes * 60000);
  const [summaryRows, levelRows, serviceRows, timelineRows] = await Promise.all([
    Log.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: { _id: null, totalLogs: { $sum: 1 },
        errorLogs: { $sum: { $cond: [{ $eq: ["$level", "ERROR"] }, 1, 0] } },
        warnLogs: { $sum: { $cond: [{ $eq: ["$level", "WARN"] }, 1, 0] } },
        averageLatencyMs: { $avg: "$latencyMs" } } }
    ]),
    Log.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: { _id: "$level", count: { $sum: 1 } } }, { $sort: { _id: 1 } }
    ]),
    Log.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: { _id: "$service", count: { $sum: 1 }, lastSeen: { $max: "$receivedAt" },
        errors: { $sum: { $cond: [{ $eq: ["$level", "ERROR"] }, 1, 0] } } } },
      { $sort: { lastSeen: -1 } }
    ]),
    Log.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$receivedAt" }, month: { $month: "$receivedAt" },
        day: { $dayOfMonth: "$receivedAt" }, hour: { $hour: "$receivedAt" },
        minute: { $subtract: [{ $minute: "$receivedAt" }, { $mod: [{ $minute: "$receivedAt" }, 5] }] } },
        count: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ["$level", "ERROR"] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  const s = summaryRows[0] || { totalLogs: 0, errorLogs: 0, warnLogs: 0, averageLatencyMs: null };
  return {
    windowMinutes: minutes, totalLogs: s.totalLogs, errorLogs: s.errorLogs, warnLogs: s.warnLogs,
    errorRate: s.totalLogs ? Number((s.errorLogs / s.totalLogs * 100).toFixed(2)) : 0,
    averageLatencyMs: s.averageLatencyMs == null ? null : Number(s.averageLatencyMs.toFixed(2)),
    activeServices: serviceRows.length,
    services: serviceRows.map(x => ({ service: x._id, count: x.count, errors: x.errors, lastSeen: x.lastSeen })),
    levels: levelRows.map(x => ({ level: x._id, count: x.count })),
    timeline: timelineRows.map(x => ({ bucket: x._id, count: x.count, errors: x.errors }))
  };
}

async function getAlerts(limit = 50) {
  return Log.find({ level: { $in: ["ERROR", "WARN"] } })
    .sort({ receivedAt: -1 }).limit(Math.min(100, Math.max(1, Number(limit) || 50))).lean();
}

async function getServices(windowMinutes = 1440) {
  const since = new Date(Date.now() - Math.min(10080, Math.max(1, Number(windowMinutes) || 1440)) * 60000);
  return Log.aggregate([
    { $match: { receivedAt: { $gte: since } } },
    { $group: { _id: "$service", totalLogs: { $sum: 1 },
      errors: { $sum: { $cond: [{ $eq: ["$level", "ERROR"] }, 1, 0] } },
      lastSeen: { $max: "$receivedAt" } } },
    { $sort: { lastSeen: -1 } }
  ]);
}

module.exports = { createLog, getLogs, getMetrics, getAlerts, getServices };
