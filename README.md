# School ERP System — SEN4121 Practical Examination

Microservices-based School ERP with **Academic**, **Finance** and **HR** modules.

| Week | Deliverable | Status |
|------|-------------|--------|
| 1 | Git setup, Dockerfile, Auth service (bcrypt + JWT + roles) | ✅ done |
| 2 | ERDs, 3NF schema, indexes, backup & restore | ⏳ next |
| 3 | Swagger docs, API Gateway, rate limiting | ⏳ pending |

## Stack
Node.js 20 · Express · PostgreSQL 16 · bcryptjs · jsonwebtoken · Docker Compose

## Architecture (target, Weeks 1–3)

```text
Client → API Gateway (:8080) → [Auth :4000 | Academic :4001 | Finance :4002 | HR :4003] → PostgreSQL (:5432)
```
The gateway is the only publicly exposed port. It rate-limits, verifies the JWT,
then proxies to the correct service. Each service owns its own database schema.

## Prerequisites
- Docker Desktop (includes Docker Compose)
- curl (or Postman)

## Run it

```bash
cd erp-system
cp .env.example .env          # create your local secrets file
docker compose up --build     # build images and start everything
```

Confirm it is alive:
```bash
curl http://localhost:4000/health
# {"service":"auth-service","status":"ok","database":"connected"}
```

Stop: `docker compose down`
Stop **and wipe the database** (re-runs the SQL scripts on next start): `docker compose down -v`

## Week 1 API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/health`            | none    | service + DB health |
| POST | `/auth/register`     | none    | create account, hashes password |
| POST | `/auth/login`        | none    | returns JWT |
| GET  | `/auth/me`           | JWT     | current user profile |
| GET  | `/auth/admin/users`  | JWT + **admin** | list all users |

### Test it
```bash
# 1. Register a student
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Student","email":"jane@school.edu","password":"secret123","role":"student"}'

# 2. Register an admin
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Admin","email":"ada@school.edu","password":"secret123","role":"admin"}'

# 3. Login (copy the "token" value from the response)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@school.edu","password":"secret123"}'

# 4. Use the token
curl http://localhost:4000/auth/me -H "Authorization: Bearer <PASTE_TOKEN>"

# 5. Admin-only endpoint (admin token = 200, student token = 403)
curl -i http://localhost:4000/auth/admin/users -H "Authorization: Bearer <PASTE_TOKEN>"
```

Prove passwords are not stored in plain text:
```bash
docker exec -it erp-postgres psql -U erp_admin -d erp_db \
  -c "SELECT email, password_hash FROM auth.users;"
```

## Git workflow
- `main` — always working, demo branch. Protected.
- `develop` — integration branch.
- `feature/<week>-<topic>` — e.g. `feature/w1-auth-service`, `feature/w3-gateway`
- `fix/<topic>` — bug fixes.
- Merge into `develop` via Pull Request, reviewed by one other member.
