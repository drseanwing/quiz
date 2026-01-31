# REdI Quiz Platform - Deployment Guide

## Architecture Overview

```
Internet
    |
  [Nginx]  :80 / :443
    |
    ├── /api/*  → [Backend API]  :3000  (Node.js 20 + Express)
    ├── /uploads/* → static files
    └── /*      → [Static Files]        (Vite-built React SPA)
                        |
                  [PostgreSQL 16]  :5432
```

All services run as Docker containers orchestrated by docker-compose.
The backend runs as a non-root user (`nodejs:1001`) with dumb-init for proper signal handling.

---

## Prerequisites

- Docker 24+ and Docker Compose v2
- Git
- Domain name with DNS configured (for production)
- SSL certificate (Let's Encrypt recommended)

---

## Quick Start (Development)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd quiz

# 2. Copy environment file
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD

# 3. Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# 4. Run database migrations
docker compose exec backend npx prisma migrate deploy

# 5. Seed initial admin user (optional)
docker compose exec backend npx ts-node prisma/seed.ts
```

### Development Ports

| Service        | Port  | URL                           |
| -------------- | ----- | ----------------------------- |
| PostgreSQL     | 9470  | `postgresql://localhost:9470` |
| Backend API    | 9471  | `http://localhost:9471/api`   |
| Node Debugger  | 9472  | `--inspect=0.0.0.0:9472`     |
| Frontend (Vite)| 9473  | `http://localhost:9473`       |
| Prisma Studio  | 9474  | `http://localhost:9474`       |
| Adminer        | 9475  | `http://localhost:9475`       |
| Nginx          | 9476  | `http://localhost:9476`       |

Prisma Studio and Adminer require the `tools` profile:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up
```

---

## Production Deployment

### 1. Prepare Environment

```bash
cp .env.example .env
```

Edit `.env` with production values. Generate secrets:

```bash
# Generate JWT secrets (run twice — one for each)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate a strong database password
openssl rand -base64 32
```

### 2. Required Environment Variables

| Variable              | Required | Description                        |
| --------------------- | -------- | ---------------------------------- |
| `POSTGRES_PASSWORD`   | yes      | Database password                  |
| `JWT_SECRET`          | yes      | JWT signing secret (64+ hex chars) |
| `JWT_REFRESH_SECRET`  | yes      | Refresh token secret (64+ hex chars) |
| `DATABASE_URL`        | yes      | Full PostgreSQL connection string  |
| `CORS_ORIGIN`         | yes      | Frontend URL (e.g. `https://quiz.example.com`) |
| `APP_URL`             | yes      | Public URL for email links         |
| `ALLOWED_EMAIL_DOMAIN`| yes      | Restrict registration to this domain |

### 3. SSL Certificates

Place SSL certificates in `nginx/ssl/`:

```bash
mkdir -p nginx/ssl

# Option A: Let's Encrypt (recommended)
certbot certonly --standalone -d quiz.example.com
cp /etc/letsencrypt/live/quiz.example.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/quiz.example.com/privkey.pem nginx/ssl/key.pem
chmod 600 nginx/ssl/*.pem

# Option B: Self-signed (testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem
```

Then edit `nginx/nginx.conf`:
1. Uncomment the HTTPS server block
2. Replace `your-domain.com` with your actual domain
3. Uncomment the HTTP-to-HTTPS redirect in the port 80 block
4. Comment out the development `location /` block in the port 80 server

### 4. Build and Start

```bash
# Build all images
docker compose build

# Start services (detached)
docker compose up -d

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Seed initial admin (first deployment only)
docker compose exec backend node dist/prisma/seed.js

# Verify health
curl https://quiz.example.com/api/health
```

### 5. Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Check backend health
docker compose logs backend --tail 50

# Check nginx
docker compose logs nginx --tail 50

# Test endpoints
curl -s https://quiz.example.com/api/health | jq .
curl -s https://quiz.example.com/api/ | jq .
```

---

## Environment Variables Reference

### Application

| Variable     | Default      | Description          |
| ------------ | ------------ | -------------------- |
| `NODE_ENV`   | `production` | Environment mode     |
| `PORT`       | `3000`       | Backend listen port  |
| `APP_URL`    | —            | Public URL for emails |

### Database

| Variable            | Default     | Description              |
| ------------------- | ----------- | ------------------------ |
| `DATABASE_URL`      | —           | PostgreSQL connection URI |
| `POSTGRES_USER`     | `redi_user` | DB username              |
| `POSTGRES_PASSWORD` | —           | DB password (required)   |
| `POSTGRES_DB`       | `redi_quiz` | Database name            |

### Authentication

| Variable                    | Default | Description                    |
| --------------------------- | ------- | ------------------------------ |
| `JWT_SECRET`                | —       | Access token signing key       |
| `JWT_REFRESH_SECRET`        | —       | Refresh token signing key      |
| `JWT_EXPIRES_IN`            | `1h`    | Access token TTL               |
| `JWT_REFRESH_EXPIRES_IN`    | `7d`    | Refresh token TTL              |
| `PASSWORD_MIN_LENGTH`       | `8`     | Minimum password length        |
| `PASSWORD_REQUIRE_UPPERCASE`| `true`  | Require uppercase letter       |
| `PASSWORD_REQUIRE_LOWERCASE`| `true`  | Require lowercase letter       |
| `PASSWORD_REQUIRE_NUMBER`   | `true`  | Require digit                  |
| `MAX_LOGIN_ATTEMPTS`        | `5`     | Failed attempts before lockout |
| `LOCKOUT_DURATION_MINUTES`  | `15`    | Lockout duration               |

### Email

| Variable                  | Default                 | Description              |
| ------------------------- | ----------------------- | ------------------------ |
| `ALLOWED_EMAIL_DOMAIN`    | `health.qld.gov.au`    | Restrict registration    |
| `POWER_AUTOMATE_EMAIL_URL`| —                       | Power Automate webhook   |
| `EMAIL_REPLY_TO`          | `redi@health.qld.gov.au`| Reply-to address        |
| `EMAIL_FROM_NAME`         | `REdI Quiz Platform`    | Display name in emails   |
| `MOCK_EMAIL`              | `false`                 | Log emails instead of sending |

### File Uploads

| Variable             | Default                                    | Description          |
| -------------------- | ------------------------------------------ | -------------------- |
| `UPLOAD_DIR`         | `/app/uploads`                             | Upload storage path  |
| `MAX_FILE_SIZE`      | `5242880` (5MB)                            | Max file size bytes  |
| `ALLOWED_FILE_TYPES` | `image/jpeg,image/png,image/gif,image/webp`| Accepted MIME types  |

### Logging

| Variable     | Default      | Description                        |
| ------------ | ------------ | ---------------------------------- |
| `LOG_DIR`    | `/app/logs`  | Log file directory                 |
| `LOG_LEVEL`  | `info`       | Log level (debug/info/warn/error)  |

### Rate Limiting

| Variable                   | Default  | Description                      |
| -------------------------- | -------- | -------------------------------- |
| `RATE_LIMIT_WINDOW_MS`     | `60000`  | Rate limit window (ms)           |
| `RATE_LIMIT_MAX_REQUESTS`  | `100`    | Max requests per window          |
| `RATE_LIMIT_AUTH_MAX`      | `5`      | Max auth requests per window     |

### CORS

| Variable           | Default           | Description              |
| ------------------ | ----------------- | ------------------------ |
| `CORS_ORIGIN`      | `http://localhost` | Allowed origin(s)       |
| `CORS_CREDENTIALS` | `true`            | Allow credentials        |

### Frontend Build

| Variable         | Default              | Description        |
| ---------------- | -------------------- | ------------------ |
| `VITE_API_URL`   | `/api`               | API base URL       |
| `VITE_APP_NAME`  | `REdI Quiz Platform` | App display name   |

---

## Database Management

### Migrations

```bash
# Apply pending migrations
docker compose exec backend npx prisma migrate deploy

# Check migration status
docker compose exec backend npx prisma migrate status

# Reset database (WARNING: destroys all data)
docker compose exec backend npx prisma migrate reset
```

### Backups

```bash
# Create a backup
docker compose exec db pg_dump -U redi_user redi_quiz > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose exec db pg_dump -U redi_user redi_quiz | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup via cron (2 AM)
# crontab -e
# 0 2 * * * cd /path/to/quiz && docker compose exec -T db pg_dump -U redi_user redi_quiz | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

### Restore from Backup

```bash
# Plain SQL
docker compose exec -T db psql -U redi_user redi_quiz < backup_20260130_120000.sql

# Compressed
gunzip -c backup_20260130.sql.gz | docker compose exec -T db psql -U redi_user redi_quiz
```

### Seed Data

The seed script creates an initial admin user:

```bash
# Development
docker compose exec backend npx ts-node prisma/seed.ts

# Production (compiled)
docker compose exec backend node dist/prisma/seed.js
```

Default seed credentials (**change immediately** after first login):
- Email: `admin@health.qld.gov.au`
- Password: `Admin123!`
- Role: `ADMIN`

---

## Monitoring

### Health Check

```bash
curl -s https://quiz.example.com/api/health
# { "success": true, "data": { "status": "healthy", ... } }
```

Docker health checks are built into all containers and can be monitored with:

```bash
docker compose ps   # Shows health status for each container
docker inspect --format='{{.State.Health.Status}}' redi-quiz-backend
```

### Container Status & Resources

```bash
docker compose ps
docker stats --no-stream
```

### Log Files

```bash
# Follow all service logs
docker compose logs -f --tail 50

# Backend only
docker compose logs backend --tail 100

# Application log files (inside container volume)
docker compose exec backend ls -la /app/logs/
```

---

## Updating

```bash
# 1. Create a backup before updating
docker compose exec db pg_dump -U redi_user redi_quiz > backup_pre_update.sql

# 2. Pull latest code
git pull origin master

# 3. Rebuild and restart (zero-downtime isn't supported yet)
docker compose build
docker compose up -d

# 4. Apply any new migrations
docker compose exec backend npx prisma migrate deploy

# 5. Verify
curl -s https://quiz.example.com/api/health
```

---

## Rollback Procedure

```bash
# 1. Stop services
docker compose down

# 2. Restore previous version
git checkout <previous-commit-or-tag>

# 3. Restore database if needed
docker compose up -d db
docker compose exec -T db psql -U redi_user redi_quiz < backup_pre_update.sql

# 4. Rebuild and start
docker compose build
docker compose up -d

# 5. Verify
curl -s https://quiz.example.com/api/health
```

---

## Troubleshooting

### Backend won't start

```bash
docker compose logs backend --tail 50

# Common causes:
# - DATABASE_URL incorrect → check .env and db container
# - Missing migrations → run prisma migrate deploy
# - Port conflict → check PORT isn't already in use
```

### Database connection refused

```bash
docker compose ps db
docker compose exec db pg_isready -U redi_user
# DATABASE_URL format: postgresql://user:pass@db:5432/redi_quiz?schema=public
```

### Frontend shows blank page

```bash
# Check nginx is serving files
docker compose exec nginx ls /usr/share/nginx/html/

# VITE_API_URL is baked in at build time — must rebuild:
docker compose build frontend
docker compose up -d frontend nginx
```

### Email not sending

```bash
# Verify config
docker compose exec backend printenv | grep -i email
docker compose exec backend printenv | grep POWER_AUTOMATE

# Check logs
docker compose logs backend | grep -i email
```

### Rate limiting issues

If users are being rate-limited unexpectedly behind a reverse proxy, ensure `trust proxy` is configured. The backend enables this automatically when `NODE_ENV=production`.

---

## Security Checklist

Before going live:

- [ ] All `CHANGE_ME` values replaced in `.env`
- [ ] JWT secrets are unique, random 64+ byte hex strings
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are different from each other
- [ ] Database password is strong (32+ random characters)
- [ ] `NODE_ENV` is set to `production`
- [ ] `CORS_ORIGIN` is set to the exact production domain (no wildcards)
- [ ] SSL certificates are installed and HTTPS is enabled
- [ ] HTTP-to-HTTPS redirect is enabled in nginx.conf
- [ ] `MOCK_EMAIL` is `false`
- [ ] `LOG_LEVEL` is `info` (not `debug`)
- [ ] Default seed user password has been changed
- [ ] Firewall allows only ports 80 and 443
- [ ] Docker volumes are on persistent storage
- [ ] Automated database backups are configured
- [ ] `.env` file is not committed to version control
- [ ] `ALLOWED_EMAIL_DOMAIN` is set correctly

---

## Secret Rotation

### Rotating JWT Secrets

JWT secrets should be rotated periodically (e.g., quarterly) or immediately if a compromise is suspected.

```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
NEW_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# 2. Update .env with new values
# JWT_SECRET=<new value>
# JWT_REFRESH_SECRET=<new value>

# 3. Restart the backend
docker compose restart backend
```

**Impact**: All existing access and refresh tokens become invalid. All users will need to re-authenticate. Plan rotation during low-usage periods.

### Rotating Database Password

```bash
# 1. Generate new password
NEW_DB_PASS=$(openssl rand -base64 32)

# 2. Update password in PostgreSQL
docker compose exec db psql -U redi_user -d redi_quiz \
  -c "ALTER USER redi_user WITH PASSWORD '$NEW_DB_PASS';"

# 3. Update .env
# POSTGRES_PASSWORD=<new value>
# DATABASE_URL=postgresql://redi_user:<new value>@db:5432/redi_quiz?schema=public

# 4. Restart backend to pick up new connection string
docker compose restart backend

# 5. Verify
curl -s https://quiz.example.com/api/health
```

### Rotating SSL Certificates

```bash
# Renew Let's Encrypt certificate
certbot renew

# Copy to nginx ssl directory
cp /etc/letsencrypt/live/quiz.example.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/quiz.example.com/privkey.pem nginx/ssl/key.pem
chmod 600 nginx/ssl/*.pem

# Reload nginx (no downtime)
docker compose exec nginx nginx -s reload
```

Set up auto-renewal in crontab:
```bash
# crontab -e
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/quiz.example.com/fullchain.pem /path/to/quiz/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/quiz.example.com/privkey.pem /path/to/quiz/nginx/ssl/key.pem && docker compose -f /path/to/quiz/docker-compose.yml exec -T nginx nginx -s reload
```
