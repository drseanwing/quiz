# Port Mapping Configuration

## Overview

All external ports for the REdI Quiz Platform are mapped to the range **9470-9490** to avoid conflicts with other services running on the host, particularly the host NGINX instance.

## Port Assignments

| Service | Internal Port | External Port | URL | Description |
|---------|---------------|---------------|-----|-------------|
| **PostgreSQL** | 5432 | **9470** | `localhost:9470` | Database access for external tools |
| **Backend API** | 3000 | **9471** | `http://localhost:9471` | Main API endpoint |
| **Backend Debugger** | 9229 | **9472** | `localhost:9472` | Node.js debugging port |
| **Frontend Dev Server** | 5173 | **9473** | `http://localhost:9473` | Vite development server |
| **Prisma Studio** | 5555 | **9474** | `http://localhost:9474` | Database GUI (tools profile) |
| **Adminer** | 8080 | **9475** | `http://localhost:9475` | Database admin (tools profile) |
| **Nginx (optional)** | 80 | **9476** | `http://localhost:9476` | Reverse proxy (optional in dev) |

## Reserved Range

**Ports 9470-9490** are reserved for this project.

- Currently used: 9470-9476 (7 ports)
- Available for expansion: 9477-9490 (14 ports)

## Configuration Files

### Docker Compose

Port mappings are defined in:
- `docker-compose.dev.yml` - Development environment overrides

### Environment Variables

The following environment variables reference external ports:
```bash
# Frontend API URL
VITE_API_URL=http://localhost:9471/api

# CORS Origins
CORS_ORIGIN=http://localhost:9473,http://localhost:9471
```

## Database Connection

### From Host

```bash
# Using psql
psql postgresql://redi_user:redi_dev_password_2026@localhost:9470/redi_quiz

# Using connection string
postgresql://redi_user:redi_dev_password_2026@localhost:9470/redi_quiz
```

### From Container

Containers communicate internally using the container network:
```bash
# Database URL (used within containers)
DATABASE_URL=postgresql://redi_user:redi_dev_password_2026@db:5432/redi_quiz
```

## Quick Access URLs

### Development

```bash
# Frontend Application
http://localhost:9473

# Backend API Health Check
curl http://localhost:9471/api/health

# Prisma Studio (with --profile tools)
http://localhost:9474

# Adminer (with --profile tools)
http://localhost:9475
```

## Starting Services

```bash
# Start main services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Start with development tools
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up -d
```

## Conflict Resolution

If you encounter port conflicts:

1. **Check what's using a port:**
   ```bash
   lsof -i :9471
   # or
   netstat -tulpn | grep 9471
   ```

2. **Update port mapping:**
   - Edit `docker-compose.dev.yml`
   - Change external port (left side of mapping)
   - Update `.env` file if needed
   - Restart services

## Notes

- **Host NGINX**: Runs on standard ports (80, 443) on the host machine
- **Container NGINX**: Optional in development, mapped to 9476 if needed
- **Internal Communication**: Containers use internal ports (right side of mapping)
- **External Access**: Host uses external ports (left side of mapping)

## Production Considerations

In production deployment, port mappings should be reviewed:
- Database port should NOT be exposed externally
- Only reverse proxy (port 80/443) should be publicly accessible
- Internal services communicate via Docker network

---

**Last Updated:** January 30, 2026
**Port Range:** 9470-9490
**Project:** REdI Quiz Platform
