# =============================================================================
# REdI Quiz Platform - Backend Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Base Stage - Common for all stages
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install system dependencies including OpenSSL for Prisma
RUN apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    openssl-dev

# Copy backend package files
COPY ./backend/package*.json ./
COPY ./backend/prisma ./prisma/

# -----------------------------------------------------------------------------
# Development Stage
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy backend application code
COPY ./backend .

# Generate Prisma Client
RUN npx prisma generate

# Expose port and debug port
EXPOSE 3000 9229

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start development server with hot-reload
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Frontend Build Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

# Accept build arguments for frontend environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Copy frontend package files
COPY ./frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY ./frontend ./

# Build frontend
RUN npm run build

# -----------------------------------------------------------------------------
# Build Stage
# -----------------------------------------------------------------------------
FROM base AS build

# Install all dependencies
RUN npm ci

# Copy backend application code
COPY ./backend .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

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

# Copy built frontend
COPY --from=frontend-build --chown=nodejs:nodejs /frontend/dist ./frontend/dist

# Copy entrypoint and diagnostic scripts
COPY --chown=nodejs:nodejs ./backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --chown=nodejs:nodejs ./backend/scripts/diagnose.js ./scripts/diagnose.js
RUN chmod +x ./docker-entrypoint.sh

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check (increased start_period to allow for migrations)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application via entrypoint (runs migrations, then starts node)
CMD ["./docker-entrypoint.sh"]
