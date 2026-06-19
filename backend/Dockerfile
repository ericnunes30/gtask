# ---- Build stage ----
FROM node:22-slim AS builder
WORKDIR /app

# Install OS build deps for native modules (e.g., bcrypt)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./tsconfig.json
COPY nest-cli.json ./nest-cli.json
COPY src ./src

# Build NestJS
RUN npm run build

# ---- Production stage ----
FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
# Install only prod deps
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy any runtime assets if necessary (migrations, etc.)
COPY src/migrations ./dist/migrations

# App env
ENV PORT=3334
EXPOSE 3334

# Healthcheck (simple TCP)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3334,path:'/'},r=>process.exit(0)).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "dist/main.js"]
