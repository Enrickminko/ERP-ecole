-- ============================================================
--  WEEK 1  |  AUTH SCHEMA
--  Used by: auth-service
--  Runs automatically on first `docker compose up` (initdb).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- ------------------------------------------------------------
-- roles: the list of roles the system knows about.
-- Kept in its OWN table (not a text column on users) so the design
-- is in 3rd Normal Form and so a user can hold more than one role.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.roles (
    role_id   SERIAL PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE   -- 'admin', 'student'
);

-- ------------------------------------------------------------
-- users: one row per person who can log in.
-- NOTE: we store password_hash, never the plain password.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.users (
    user_id       SERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,      -- bcrypt output ($2b$10$....)
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- user_roles: many-to-many join table between users and roles.
-- Composite primary key prevents assigning the same role twice.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id INTEGER NOT NULL REFERENCES auth.users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES auth.roles(role_id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, role_id)
);

-- The two roles required by the assignment.
INSERT INTO auth.roles (role_name) VALUES ('admin'), ('student')
ON CONFLICT (role_name) DO NOTHING;

-- Index used at every single login (WEEK 2 will add more).
-- UNIQUE on email already creates one, this documents the intent.
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
