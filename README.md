# PulseOps – Real-Time Centralized Log Monitoring

MVP MERN application with structured log ingestion, MongoDB persistence and TTL retention, Socket.IO streaming, a data-driven React dashboard, service metrics, and real database-backed log search.

## Project layout
- `backend/` Express + Mongoose + Socket.IO API
- `frontend/` React + Vite dashboard

## Requirements
- Node.js 20+
- MongoDB 7/8 running locally or a MongoDB connection string

## Backend
```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```
Default API: `http://localhost:3000`

## Frontend
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Dashboard: `http://localhost:5173`

Vite proxies `/api` and `/socket.io` to `http://localhost:3000`. Set `VITE_API_BASE_URL` only when the API is hosted elsewhere.

## API
- `GET /api/health`
- `POST /api/logs`
- `GET /api/logs?page=1&limit=50&level=ERROR&service=api&search=timeout&requestId=...`
- `GET /api/logs/metrics?windowMinutes=60`
- `GET /api/logs/services?windowMinutes=1440`
- `GET /api/logs/alerts?limit=50`

Socket.IO event: `new_log`, emitted only after MongoDB insert succeeds.

## Example ingestion
```json
{
  "service": "checkout-api",
  "level": "ERROR",
  "message": "Payment provider timed out",
  "requestId": "req-7c91",
  "traceId": "trace-24ac",
  "environment": "development",
  "host": "checkout-node-01",
  "latencyMs": 420,
  "metadata": { "method": "POST", "path": "/api/checkout" },
  "error": { "name": "ProviderTimeout", "message": "Upstream timeout", "code": "ETIMEDOUT" }
}
```

Retention is based on trusted server-side `receivedAt`, not producer timestamps. Configure with `LOG_RETENTION_SECONDS` (default 604800 seconds / 7 days).

## Notes
This is an MVP. For internet-facing production deployment, add authenticated producer credentials, tenant isolation, durable queueing, alert delivery integrations, and rate limits tuned to expected ingestion volume. Do not expose the ingestion endpoint publicly without authentication.
