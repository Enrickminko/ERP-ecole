# WEEK 1 — Examiner Preparation (Environment Setup & Authentication)

## A. What you must DEMONSTRATE

| # | Requirement | How you show it |
|---|---|---|
| 1 | Shared Git repo + branch convention | Show GitHub repo, `git branch -a`, a merged Pull Request |
| 2 | Dockerfile for the auth service | Open `auth-service/Dockerfile`, explain each line |
| 3 | Runs from a clean container | `docker compose down -v && docker compose up --build` |
| 4 | Registration (name, email, password) | `POST /auth/register` in Postman |
| 5 | Passwords not plain text | `SELECT email, password_hash FROM auth.users;` → `$2a$10$...` |
| 6 | Two roles (admin, student) | Register one of each; `SELECT * FROM auth.user_roles;` |
| 7 | Login returns a JWT | `POST /auth/login` → paste token into jwt.io |
| 8 | Both roles behave differently | `GET /auth/admin/users`: admin → 200, student → 403 |
| 9 | Live authorization change | Edit `requireRole('admin')` → `requireRole('admin','student')`, rebuild, re-test |

## B. Exact demo script (5 minutes)

```bash
cd erp-system
docker compose down -v            # prove nothing is cached
docker compose up --build -d
curl http://localhost:4000/health

# register both roles
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Jane Student","email":"jane@school.edu","password":"secret123","role":"student"}'
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ada Admin","email":"ada@school.edu","password":"secret123","role":"admin"}'

# prove the hash
docker exec -it erp-postgres psql -U erp_admin -d erp_db \
  -c "SELECT email, password_hash FROM auth.users;"

# login as each and hit the admin endpoint
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ada@school.edu","password":"secret123"}'
curl -i http://localhost:4000/auth/admin/users -H "Authorization: Bearer <ADMIN_TOKEN>"   # 200
curl -i http://localhost:4000/auth/admin/users -H "Authorization: Bearer <STUDENT_TOKEN>" # 403
```

## C. Likely questions and simple answers

**Q: How are passwords protected?**
We never store the password. On registration bcrypt generates a random *salt*, combines it with the password and hashes it 2^10 times. Only that hash goes in the `password_hash` column. Bcrypt is a one-way function — you cannot reverse the hash. At login we run `bcrypt.compare(typedPassword, storedHash)`, which re-hashes with the same salt and compares.

**Q: Why a salt?**
Two users with the same password get two different hashes, so an attacker cannot spot repeated passwords, and precomputed "rainbow tables" are useless.

**Q: What is bcrypt's cost factor?**
`BCRYPT_ROUNDS=10` means 2^10 = 1024 iterations. Higher = slower for us *and* for an attacker. 10–12 is the normal range.

**Q: What is a JWT?**
A JSON Web Token: three base64 parts separated by dots — **header** (algorithm), **payload** (our data: `sub`, `email`, `role`, `exp`), **signature**. The signature is HMAC-SHA256 over header+payload using our secret `JWT_SECRET`.

**Q: Is a JWT encrypted?**
No — it is *signed*, not encrypted. Anyone can read the payload (show them jwt.io). That is why we never put a password in it. The signature guarantees nobody has *changed* it.

**Q: What stops a student editing the token to say `"role":"admin"`?**
Changing one character breaks the signature. `jwt.verify()` recomputes the signature with the secret; it will not match, so we return 401. The attacker cannot forge a valid signature without `JWT_SECRET`.

**Q: What happens if the token expires?**
`expiresIn: 1h` puts an `exp` claim in the payload. `jwt.verify` throws `TokenExpiredError` and we return 401 "Token expired". The user logs in again.

**Q: Why are roles in a separate table?**
Third Normal Form — the role name is stored once in `auth.roles` and referenced by id. If we stored the text `'admin'` on every user row and later renamed the role, we would have to update every row. It also lets a user hold multiple roles.

**Q: Why Docker?**
It packages Node, our code and its dependencies into one image, so it runs identically on every group member's laptop and on the examiner's machine. `docker compose up` starts the database and the service together on a private network.

**Q: Explain the Dockerfile.**
`FROM node:20-alpine` (small base image) → `WORKDIR /app` → copy `package*.json` and `npm install` first so Docker caches dependencies → copy source → `EXPOSE 4000` → `CMD node src/index.js`.

**Q: Why is `DATABASE_URL` host `postgres` and not `localhost`?**
Inside Docker each container has its own `localhost`. Compose gives every service a DNS name equal to its service name, so the auth container reaches the database at `postgres:5432`.

**Q: Where is the secret stored?**
In `.env`, which is git-ignored, and injected as an environment variable by Compose. `.env.example` is committed so teammates know which variables exist. Secrets never go into the source code or the repo.

## D. Live change the examiner may request

**"Let students also access `/auth/admin/users`."**
`auth-service/src/routes/auth.js` line with `requireRole("admin")` → `requireRole("admin", "student")`, then:
```bash
docker compose up -d --build auth-service
```
Re-run the student curl → now 200.

**"Make the token expire in 1 minute."**
`.env` → `JWT_EXPIRES_IN=1m`, then `docker compose up -d auth-service`. Log in, wait, call `/auth/me` → 401 "Token expired".

**"Add a `lecturer` role."**
`database/01_schema_auth.sql` insert list + `ALLOWED_ROLES` array in `routes/auth.js`.

## E. Common mistakes that cost marks
- Returning the `password_hash` in an API response — check every `SELECT`.
- Committing `.env` with the JWT secret.
- Using `localhost` instead of the container name inside Docker.
- Telling the examiner a JWT is "encrypted" — it is **signed**.
- Only one group member understanding the code. Any of you can be picked.
- Forgetting `docker compose down -v` before the demo, so it looks like it only works on old data.
- Same generic error for wrong email and wrong password — keep it; it is a security feature you can explain.

## F. Final checklist before the session
- [ ] `docker compose down -v && docker compose up --build` works on a clean machine
- [ ] Postman collection saved with all 5 requests
- [ ] Both an admin and a student account can be created in under a minute
- [ ] Everyone can point to the bcrypt line and the `jwt.sign` line
- [ ] Everyone can do the live `requireRole` change
- [ ] Repo pushed, branches visible, at least one merged PR per member
