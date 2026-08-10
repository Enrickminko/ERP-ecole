# ============================================================
#  WEEK 1 DELIVERABLE: Dockerfile for the authentication service
#  Build:  docker build -t auth-service ./auth-service
#  Run:    handled by docker-compose.yml
# ============================================================

# 1. Start from a small official Node.js image.
FROM node:20-alpine

# 2. All following commands run inside /app in the container.
WORKDIR /app

# 3. Copy ONLY the dependency files first.
#    Docker caches this layer, so `npm install` is skipped on rebuilds
#    when only source code changed. This makes rebuilds much faster.
COPY package*.json ./

# 4. Install production dependencies.
RUN npm install --omit=dev

# 5. Now copy the application source code.
COPY . .

# 6. Document the port the service listens on.
EXPOSE 4000

# 7. The command that starts the service when the container runs.
CMD ["node", "src/index.js"]
