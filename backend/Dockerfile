# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install openssl required by Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Generate Prisma client (uses the schema already present in ./prisma)
RUN npx prisma generate

EXPOSE 8080

# Run migrations (non-fatal) then start the server
CMD ["sh", "-c", "npx prisma migrate deploy; node index.js"]
