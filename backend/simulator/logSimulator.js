const config = require("../src/config/env");

const services = ["auth-service", "payment-service", "user-service"];
const levels = ["DEBUG", "INFO", "INFO", "INFO", "WARN", "ERROR"];

const messages = {
  DEBUG: ["Cache lookup completed", "Request payload parsed"],
  INFO: ["Request processed successfully", "User session created", "Health check passed"],
  WARN: ["Retrying downstream request", "Response time above threshold"],
  ERROR: ["Database query failed", "Payment provider returned an error", "Unexpected service exception"]
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function sendLog() {
  const level = randomItem(levels);
  const payload = {
    service: randomItem(services),
    level,
    requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
    environment: "development",
    host: "local-simulator",
    source: "simulator",
    message: randomItem(messages[level]),
    latencyMs: Math.floor(Math.random() * 1200),
    metadata: {
      environment: "development",
      requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
      simulator: true
    },
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch(`http://localhost:${config.port}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    console.log(response.status, result.message || result);
  } catch (error) {
    console.error("Could not send simulated log:", error.message);
  }
}

console.log("Log simulator started. Sending one event every 1.5 seconds.");
sendLog();
setInterval(sendLog, 1500);
