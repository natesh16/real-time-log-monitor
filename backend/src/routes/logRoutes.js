const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validateLog = require("../middleware/validateLog");
const controller = require("../controllers/logController");
const router = express.Router();

router.post("/", validateLog, asyncHandler(controller.ingestLog));
router.get("/", asyncHandler(controller.listLogs));
router.get("/metrics", asyncHandler(controller.metrics));
router.get("/services", asyncHandler(controller.services));
router.get("/alerts", asyncHandler(controller.alerts));
module.exports = router;
