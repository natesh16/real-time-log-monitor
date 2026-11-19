const mongoose = require("mongoose");
const { LOG_LEVELS } = require("../constants/logLevels");
const config = require("../config/env");

const logSchema = new mongoose.Schema({
  service: { type: String, required: true, trim: true, maxlength: 100 },
  level: { type: String, required: true, uppercase: true, enum: LOG_LEVELS },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  requestId: { type: String, trim: true, maxlength: 128, default: null },
  traceId: { type: String, trim: true, maxlength: 128, default: null },
  environment: { type: String, trim: true, maxlength: 80, default: "development" },
  host: { type: String, trim: true, maxlength: 160, default: null },
  source: { type: String, trim: true, maxlength: 80, default: "api" },
  latencyMs: { type: Number, min: 0, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: {
    name: { type: String, maxlength: 200, default: null },
    message: { type: String, maxlength: 2000, default: null },
    stack: { type: String, maxlength: 12000, default: null },
    code: { type: String, maxlength: 100, default: null }
  },
  createdAt: { type: Date, default: Date.now },
  receivedAt: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false, minimize: false });

logSchema.index({ receivedAt: 1 }, { expireAfterSeconds: config.retentionSeconds });
logSchema.index({ receivedAt: -1, level: 1 });
logSchema.index({ service: 1, receivedAt: -1 });
logSchema.index({ requestId: 1 });
logSchema.index({ traceId: 1 });
logSchema.index({ service: 1, level: 1, receivedAt: -1 });

module.exports = mongoose.model("Log", logSchema);
