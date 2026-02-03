# =============================================================================
# REdI Quiz Platform - Backend Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Base Stage - Common for all stages
# -----------------------------------------------------------------------------
FROM node:25-alpine AS base

WORKDIR /app

# Install system dependencies including OpenSSL for Prisma
RUN apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    openssl-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# -----------------------------------------------------------------------------
# Development Stage
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port and debug port
EXPOSE 3000 9229

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start development server with hot-reload
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Build Stage
# -----------------------------------------------------------------------------
FROM base AS build

# Install all dependencies
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:25-alpine AS production

WORKDIR /app

# Install dumb-init and OpenSSL (required by Prisma)
RUN apk add --no-cache dumb-init curl openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
