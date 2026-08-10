/**
 * WEEK 1 | auth-service/src/db.js
 * ---------------------------------------------------------------
 * One shared PostgreSQL connection pool for the whole service.
 * A "pool" keeps a few connections open and reuses them, instead of
 * opening a new TCP connection for every request.
 *
 * DATABASE_URL comes from docker-compose.yml and looks like:
 *   postgres://erp_admin:erp_password@postgres:5432/erp_db
 * Note the host is `postgres` (the container name), NOT localhost.
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Every query in this service goes through this helper.
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
