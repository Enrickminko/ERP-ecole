/**
 * WEEK 1 | auth-service/src/routes/auth.js
 * ---------------------------------------------------------------
 * All authentication endpoints:
 *   POST /register     create an account (password is hashed)
 *   POST /login        check password, return a JWT
 *   GET  /me           who am I?            (any logged-in user)
 *   GET  /admin/users  list all users       (ADMIN ONLY - role demo)
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { query } = require("../db");
const verifyJwt = require("../middleware/verifyJwt");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

const ALLOWED_ROLES = ["admin", "student"];

/* ============================================================
 * POST /register
 * Body: { "name": "...", "email": "...", "password": "...", "role": "student" }
 * ============================================================ */
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    // ---- 1. Validate input ----
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }
    const chosenRole = (role || "student").toLowerCase();
    if (!ALLOWED_ROLES.includes(chosenRole)) {
      return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
    }

    // ---- 2. Reject duplicate email ----
    const existing = await query("SELECT user_id FROM auth.users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // ---- 3. HASH THE PASSWORD (never store plain text) ----
    // genSalt creates a random salt, so two users with the same password
    // still get two completely different hashes.
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
    const salt = await bcrypt.genSalt(rounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // ---- 4. Insert the user ----
    const inserted = await query(
      `INSERT INTO auth.users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, full_name, email, created_at`,
      [name, email.toLowerCase(), passwordHash],
    );
    const user = inserted.rows[0];

    // ---- 5. Attach the role (join table) ----
    await query(
      `INSERT INTO auth.user_roles (user_id, role_id)
       SELECT $1, role_id FROM auth.roles WHERE role_name = $2`,
      [user.user_id, chosenRole],
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: chosenRole,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/* ============================================================
 * POST /login
 * Body: { "email": "...", "password": "..." }
 * Returns: { token, user }
 * ============================================================ */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Fetch the user together with their role (JOIN across 3 tables).
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.is_active,
              COALESCE(r.role_name, 'student') AS role_name
         FROM auth.users u
         LEFT JOIN auth.user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN auth.roles r       ON r.role_id  = ur.role_id
        WHERE u.email = $1
        LIMIT 1`,
      [email.toLowerCase()],
    );

    // Same generic message for "no such user" and "wrong password"
    // so an attacker cannot discover which emails are registered.
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    // bcrypt.compare re-hashes the supplied password with the stored salt
    // and compares. The stored hash can never be turned back into a password.
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ---- Create the JWT ----
    const payload = {
      sub: user.user_id,      // subject = who the token is about
      email: user.email,
      role: user.role_name,   // used for role-based authorization
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.user_id, name: user.full_name, email: user.email, role: user.role_name },
    });
  } catch (err) {
    return next(err);
  }
});

/* ============================================================
 * GET /me  - protected, any authenticated user
 * ============================================================ */
router.get("/me", verifyJwt, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, full_name, email, created_at FROM auth.users WHERE user_id = $1`,
      [req.user.sub],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    return res.json({ ...result.rows[0], role: req.user.role });
  } catch (err) {
    return next(err);
  }
});

/* ============================================================
 * GET /admin/users - ADMIN ONLY
 * This is the endpoint to use for the "two roles" demonstration:
 * a student token gets 403, an admin token gets 200.
 * ============================================================ */
router.get("/admin/users", verifyJwt, requireRole("admin"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.created_at,
              COALESCE(r.role_name,'student') AS role
         FROM auth.users u
         LEFT JOIN auth.user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN auth.roles r       ON r.role_id  = ur.role_id
        ORDER BY u.user_id`,
    );
    return res.json({ count: result.rowCount, users: result.rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
