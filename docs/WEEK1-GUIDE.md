# WEEK 1 GUIDE — Environment Setup & Authentication
**Course:** SEN4121 Large System Environment · **Project:** School ERP System

Open this folder in VS Code (`File → Open Folder → erp-system`) and follow this document top to bottom.

---

## 1. What Week 1 must deliver

| # | Assignment requirement | Where it is done |
|---|---|---|
| 1 | One shared Git repository for 4 members | Section 3 |
| 2 | Simple branch naming convention | Section 3 |
| 3 | Dockerfile for the authentication service | `auth-service/Dockerfile` |
| 4 | Registration with name, email, password | `POST /auth/register` |
| 5 | Passwords NOT stored as plain text | bcrypt hashing in `routes/auth.js` |
| 6 | At least two roles (Admin, Student) | `auth.roles` + `auth.user_roles` tables |
| 7 | Login returns a JWT | `POST /auth/login` |
| 8 | Runnable from a clean Docker container | `docker compose up --build` |
| 9 | Demonstrate both roles | `GET /auth/admin/users` → 200 vs 403 |
| 10 | Explain password protection & JWT | Section 9 |
| 11 | Make a small authorization rule change live | Section 10 |

---

## 2. Technology stack

Node.js 20 · Express · PostgreSQL 16 · bcryptjs · jsonwebtoken · Docker Compose

Chosen because it is the smallest set of tools that satisfies every requirement, is easy to
Dockerize, and every line of it can be read aloud and explained by a student.

### Architecture (Week 1 slice of the full system)

```text
        Client (curl / Postman)
                 |
                 |  HTTP :4000
                 v
        +---------------------+
        |    AUTH SERVICE     |   Node.js + Express
        |  /auth/register     |
        |  /auth/login        |
        |  /auth/me           |
        |  /auth/admin/users  |
        +----------+----------+
                   |  SQL (pg driver)
                   v
        +---------------------+
        |   PostgreSQL :5432  |   schema: auth
        |  users / roles /    |
        |  user_roles         |
        +---------------------+

Both boxes are Docker containers on one private network (erp-net).
In WEEK 3 an API Gateway is placed in front of the Auth Service.
```

---

## 3. Git setup (do this first, together as a group)

One member creates the repository, the rest clone it.

```bash
# --- The repo owner ---
mkdir erp-system && cd erp-system
git init
git branch -M main
# ...add the project files...
git add .
git commit -m "chore: week 1 project setup"
git remote add origin https://github.com/<your-group>/school-erp.git
git push -u origin main

# create the integration branch
git checkout -b develop
git push -u origin develop

# --- Every other member ---
git clone https://github.com/<your-group>/school-erp.git
cd school-erp
git checkout develop
```

### Branch naming convention

| Branch | Purpose |
|---|---|
| `main` | Always working. This is what you demo. Protected — no direct pushes. |
| `develop` | Integration branch. Features merge here first. |
| `feature/w1-auth-service` | New work. Pattern: `feature/<week>-<topic>` |
| `fix/login-500-error` | Bug fixes. Pattern: `fix/<topic>` |

Daily workflow for each member:
```bash
git checkout develop && git pull
git checkout -b feature/w1-jwt-middleware
# ...work...
git add . && git commit -m "feat(auth): add JWT verification middleware"
git push -u origin feature/w1-jwt-middleware
# open a Pull Request into develop, another member reviews and merges
```
When `develop` is stable, merge `develop → main`.
**Each member should have at least one commit and one merged PR** — the examiner can check this.

---

## 4. Folder structure

```text
erp-system/
├── docker-compose.yml          # starts postgres + auth-service together
├── .env.example                # template of required variables (COMMITTED)
├── .env                        # your real secrets (GIT-IGNORED — you create it)
├── .gitignore
├── README.md
│
├── database/
│   └── 01_schema_auth.sql      # creates auth.users, auth.roles, auth.user_roles
│                               # runs AUTOMATICALLY the first time postgres starts
│
├── auth-service/
│   ├── Dockerfile              # ★ Week 1 required deliverable
│   ├── .dockerignore
│   ├── package.json            # dependencies
│   └── src/
│       ├── index.js            # starts express, /health, error handling
│       ├── db.js               # PostgreSQL connection pool
│       ├── routes/auth.js      # register / login / me / admin-only
│       └── middleware/
│           ├── verifyJwt.js    # checks the Bearer token
│           └── requireRole.js  # ★ role-based authorization (edit this live)
│
└── docs/
    ├── WEEK1-GUIDE.md          # this file
    └── week1-checklist.md      # examiner Q&A and demo script
```

---

## 5. Install the tools

1. **Docker Desktop** — https://www.docker.com/products/docker-desktop (includes Docker Compose). Start it and leave it running.
2. **VS Code** — recommended extensions: *Docker*, *REST Client* (or use Postman).
3. **Git**.

Check:
```bash
docker --version
docker compose version
git --version
```

---

## 6. Run the project

```bash
cd erp-system

# 1. Create your local secrets file from the template
cp .env.example .env          # Windows PowerShell: copy .env.example .env

# 2. Build the images and start both containers
docker compose up --build
```

You should see:
```text
erp-postgres      | database system is ready to accept connections
erp-auth-service  | [auth-service] listening on port 4000
```

Leave that terminal running. Open a **second** terminal for the tests.

Useful commands:
```bash
docker compose ps                  # what is running
docker compose logs -f auth-service  # follow the service logs
docker compose down                # stop (keeps the data)
docker compose down -v             # stop AND delete the database volume
                                   # → the SQL script re-runs on next start
```

---

## 7. Test it (curl)

### 7.1 Health check
```bash
curl http://localhost:4000/health
```
```json
{"service":"auth-service","status":"ok","database":"connected"}
```

### 7.2 Register a STUDENT
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Student","email":"jane@school.edu","password":"secret123","role":"student"}'
```
```json
{"message":"User registered successfully","user":{"id":1,"name":"Jane Student","email":"jane@school.edu","role":"student"}}
```

### 7.3 Register an ADMIN
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Admin","email":"ada@school.edu","password":"secret123","role":"admin"}'
```

### 7.4 Prove the password is NOT plain text
```bash
docker exec -it erp-postgres psql -U erp_admin -d erp_db \
  -c "SELECT email, password_hash FROM auth.users;"
```
```text
      email      |                        password_hash
-----------------+--------------------------------------------------------------
 jane@school.edu | $2a$10$kaTXfQmh1/jY0...
 ada@school.edu  | $2a$10$Bn.eseX8.z3Jr...
```
`$2a$` = bcrypt, `10` = cost factor, then the salt and the hash.

### 7.5 Login → get the JWT
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@school.edu","password":"secret123"}'
```
```json
{"message":"Login successful","token":"eyJhbGciOiJIUzI1NiIs...","user":{"id":2,"name":"Ada Admin","email":"ada@school.edu","role":"admin"}}
```
Copy the token. Paste it into https://jwt.io to show the examiner the payload
(`sub`, `email`, `role`, `iat`, `exp`).

### 7.6 Use the token
```bash
curl http://localhost:4000/auth/me -H "Authorization: Bearer <PASTE_ADMIN_TOKEN>"
```

### 7.7 THE ROLE DEMONSTRATION
```bash
# admin token  → 200 with the user list
curl -i http://localhost:4000/auth/admin/users -H "Authorization: Bearer <ADMIN_TOKEN>"

# student token → 403 Forbidden
curl -i http://localhost:4000/auth/admin/users -H "Authorization: Bearer <STUDENT_TOKEN>"
```
```json
{"error":"Forbidden","message":"This endpoint requires role: admin. You are: student."}
```

### 7.8 Negative tests
```bash
curl -i http://localhost:4000/auth/me                                  # 401 missing header
curl -i http://localhost:4000/auth/me -H "Authorization: Bearer abc"   # 401 invalid token
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ada@school.edu","password":"wrong"}'                   # 401 invalid credentials
```

### 7.9 Postman
Create a collection **ERP – Week 1** with the 5 requests above.
On the login request add this to the **Tests** tab so the token is saved automatically:
```javascript
pm.environment.set("token", pm.response.json().token);
```
Then in protected requests set Authorization → Bearer Token → `{{token}}`.

---

## 8. API reference (Week 1)

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/health` | – | – | 200 |
| POST | `/auth/register` | – | `name, email, password, role` | 201 |
| POST | `/auth/login` | – | `email, password` | 200 + token |
| GET | `/auth/me` | Bearer | – | 200 |
| GET | `/auth/admin/users` | Bearer + **admin** | – | 200 / 403 |

Error codes: `400` bad input · `401` not authenticated · `403` wrong role · `409` duplicate email · `500` server error.

### Environment variables

| Variable | Example | Used for |
|---|---|---|
| `POSTGRES_USER` | `erp_admin` | database user |
| `POSTGRES_PASSWORD` | `erp_password` | database password |
| `POSTGRES_DB` | `erp_db` | database name |
| `DATABASE_URL` | `postgres://erp_admin:erp_password@postgres:5432/erp_db` | how the service connects (built by Compose) |
| `JWT_SECRET` | long random string | signs and verifies tokens |
| `JWT_EXPIRES_IN` | `1h` | token lifetime |
| `BCRYPT_ROUNDS` | `10` | bcrypt cost factor |

`.env` is git-ignored. `.env.example` is committed so teammates know what to create.

---

## 9. How it works — the explanations you must be able to give

### Registration
1. Validate `name`, `email`, `password` (min 6 chars) and `role`.
2. Reject a duplicate email with `409`.
3. `bcrypt.genSalt(10)` → random salt. `bcrypt.hash(password, salt)` → one-way hash.
4. `INSERT` into `auth.users` storing **only** `password_hash`.
5. `INSERT` into `auth.user_roles` linking the user to `admin` or `student`.

### Login
1. Find the user by email, joining `user_roles` and `roles` to get the role name.
2. `bcrypt.compare(typedPassword, storedHash)` — re-hashes the typed password with the stored salt and compares. There is no way to reverse the hash.
3. If it matches, `jwt.sign({sub, email, role}, JWT_SECRET, {expiresIn:'1h'})`.
4. Return the token. The client sends it as `Authorization: Bearer <token>` afterwards.

### JWT structure
`header.payload.signature` — three base64url parts.
- **header** `{"alg":"HS256","typ":"JWT"}`
- **payload** `{"sub":2,"email":"ada@school.edu","role":"admin","iat":...,"exp":...}`
- **signature** `HMACSHA256(header + "." + payload, JWT_SECRET)`

A JWT is **signed, not encrypted** — anyone can read the payload, nobody can change it
without the secret. That is why no password ever goes inside it.

### Authorization chain
```text
request → verifyJwt (401 if bad) → requireRole('admin') (403 if wrong role) → route handler
```

### Database connection
`src/db.js` creates one `pg` **Pool** using `DATABASE_URL`. A pool keeps a few connections
open and reuses them instead of reconnecting per request. Inside Docker the host is
`postgres` — the Compose service name — not `localhost`, because each container has its own
`localhost`. Queries use parameters (`$1`, `$2`) rather than string concatenation, which
prevents SQL injection.

---

## 10. Live change the examiner may ask for

**"Allow students to access `/auth/admin/users`."**
`auth-service/src/routes/auth.js`:
```javascript
router.get("/admin/users", verifyJwt, requireRole("admin", "student"), ...
```
```bash
docker compose up -d --build auth-service
```
Re-run the student request → now `200`.

**"Make the token expire in 1 minute."**
`.env` → `JWT_EXPIRES_IN=1m`, then `docker compose up -d auth-service`.
Log in, wait 60 s, call `/auth/me` → `401 Token expired`.

**"Add a lecturer role."**
Add `'lecturer'` to the INSERT in `database/01_schema_auth.sql` and to `ALLOWED_ROLES` in
`routes/auth.js`, then `docker compose down -v && docker compose up --build`.

---

## 11. Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `port is already allocated` (5432) | Local PostgreSQL running | Stop it, or change the host port to `5433:5432` in `docker-compose.yml` |
| `port is already allocated` (4000) | Something else on 4000 | Change to `4001:4000` |
| `ECONNREFUSED postgres:5432` | DB not ready yet | The healthcheck handles this; if it persists run `docker compose down && docker compose up` |
| `relation "auth.users" does not exist` | SQL only runs on a **fresh** volume | `docker compose down -v && docker compose up --build` |
| `Cannot find module 'express'` | Dependencies not installed in the image | `docker compose build --no-cache auth-service` |
| `.env` values ignored | File named `.env.txt` by Windows | Rename to exactly `.env` |
| `invalid signature` on every request | `JWT_SECRET` changed after the token was issued | Log in again |
| Docker daemon not running | Docker Desktop closed | Start Docker Desktop |

Run without Docker (fallback if Docker fails on exam day — you still need PostgreSQL locally):
```bash
cd auth-service
npm install
# create a .env here with DATABASE_URL pointing at localhost:5432
npm start
```

---

## 12. Week 1 completion checklist

- [ ] Shared GitHub repo, all 4 members have push access
- [ ] `main` and `develop` branches exist; feature branches follow `feature/<week>-<topic>`
- [ ] At least one merged Pull Request per member
- [ ] `docker compose down -v && docker compose up --build` works from scratch
- [ ] `POST /auth/register` creates a user
- [ ] `SELECT password_hash` shows a `$2a$10$...` bcrypt hash, never a plain password
- [ ] `admin` and `student` roles both exist and both work
- [ ] `POST /auth/login` returns a JWT that decodes on jwt.io
- [ ] `GET /auth/admin/users` returns 200 for admin, 403 for student
- [ ] Every group member can explain bcrypt, salting, and JWT signing
- [ ] Every group member can perform the live `requireRole` change
- [ ] Postman collection saved and shared

See `docs/week1-checklist.md` for the full list of examiner questions and answers.
