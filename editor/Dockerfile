# ═══════════════════════════════════════════════════
# Living Document Editor — Docker Build
# ═══════════════════════════════════════════════════

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY editor/package.json editor/package-lock.json* ./
RUN npm install --production

# Stage 2: Production image
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy backend server
COPY editor/server ./server
COPY editor/package.json ./

# Copy frontend
COPY editor/public ./public

# Copy docs content
COPY docs ./docs

# Copy and run manifest generation
COPY editor/scripts ./scripts
RUN node scripts/generate-manifest.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
