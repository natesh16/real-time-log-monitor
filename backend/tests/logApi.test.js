const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");
const { Server } = require("socket.io");
const http = require("http");

let mongo;
let app;
let server;
let io;
let baseUrl;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  server = http.createServer(app);
  io = new Server(server);
  app.set("io", io);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => io.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe("Log API", () => {
  test("POST /api/logs validates and persists a log", async () => {
    const response = await request(baseUrl)
      .post("/api/logs")
      .send({ service: "auth-service", level: "error", message: "Token validation failed" });

    expect(response.status).toBe(201);
    expect(response.body.data.level).toBe("ERROR");
    expect(response.body.data.service).toBe("auth-service");
  });

  test("rejects invalid severity", async () => {
    const response = await request(baseUrl)
      .post("/api/logs")
      .send({ service: "auth-service", level: "TRACE", message: "test" });

    expect(response.status).toBe(400);
  });

  test("GET /api/logs supports filtering and pagination", async () => {
    await request(baseUrl).post("/api/logs")
      .send({ service: "auth-service", level: "ERROR", message: "login failed" });
    await request(baseUrl).post("/api/logs")
      .send({ service: "payment-service", level: "INFO", message: "payment completed" });

    const response = await request(baseUrl).get("/api/logs?level=ERROR&page=1&limit=10");
    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.items[0].message).toBe("login failed");
  });

  test("GET /api/metrics returns summary metrics", async () => {
    await request(baseUrl).post("/api/logs")
      .send({ service: "auth-service", level: "ERROR", message: "failure", latencyMs: 200 });

    const response = await request(baseUrl).get("/api/logs/metrics?windowMinutes=60");
    expect(response.status).toBe(200);
    expect(response.body.data.totalLogs).toBe(1);
    expect(response.body.data.errorRate).toBe(100);
  });

  test("GET /api/health reports database state", async () => {
    const response = await request(baseUrl).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.database).toBe("connected");
  });
});
