/**
 * WEEK 1 | auth-service/src/index.js
 * ---------------------------------------------------------------
 * Entry point of the authentication service.
 * Started by the Dockerfile:  CMD ["node", "src/index.js"]
 */
require("dotenv").config(); // only used when running outside Docker
const express = require("express");

const authRoutes = require("./routes/auth");
const { pool } = require("./db");

const app = express();

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// Tiny request logger - handy during the examiner demo,
// it proves WHICH service handled the request.
app.use((req, _res, next) => {
  console.log(`[auth-service] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Health check. Docker / the gateway / the examiner can call this
 * to confirm the service and its database are alive.
 */
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ service: "auth-service", status: "ok", database: "connected" });
  } catch (err) {
    return res.status(503).json({ service: "auth-service", status: "degraded", database: "down" });
  }
});

// All auth endpoints live under /auth
// Full path example: POST http://localhost:4000/auth/login
app.use("/auth", authRoutes);

// 404 for anything else
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Central error handler - keeps stack traces out of API responses.
app.use((err, _req, res, _next) => {
  console.error("[auth-service] ERROR:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[auth-service] listening on port ${PORT}`);
});
