# Deployment Guide

This guide covers deploying the REdI Quiz Platform to production.

## Prerequisites

- Docker and Docker Compose installed on the server
- SSL certificates for HTTPS
- Domain name configured
- PostgreSQL 16 (or use Docker)
- Nginx (or use Docker)

## Environment Configuration

1. **Create Production Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Configure Environment Variables**
   ```bash
   # Critical: Change all secrets!
   JWT_SECRET=$(openssl rand -base64 64)
   JWT_REFRESH_SECRET=$(openssl rand -base64 64)
   POSTGRES_PASSWORD=$(openssl rand -base64 32)

   # Set production values
   NODE_ENV=production
   APP_URL=https://your-domain.com
   CORS_ORIGIN=https://your-domain.com
   ```

3. **Required Variables**
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - JWT signing secret
   - `JWT_REFRESH_SECRET` - Refresh token secret
   - `POSTGRES_PASSWORD` - Database password
   - `POWER_AUTOMATE_EMAIL_URL` - Email endpoint
   - `ALLOWED_EMAIL_DOMAIN` - Email domain restriction

## SSL Configuration

1. **Place SSL Certificates**
   ```bash
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   chmod 600 nginx/ssl/*.pem
   ```

2. **Update Nginx Configuration**
   Edit `nginx/nginx.conf` and uncomment the HTTPS server block.

## Deployment Steps

### 1. Initial Deployment

```bash
# Clone repository
git clone <repository-url>
cd quiz

# Configure environment
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data
./scripts/seed.sh
```

### 2. Verify Deployment

```bash
# Check service health
curl https://your-domain.com/api/health

# View logs
docker-compose logs -f

# Check database
docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### 3. Create Admin Account

```bash
# If not using seed data, create admin manually
docker-compose exec backend npm run create-admin
```

## Database Management

### Backups

Set up automated backups with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/quiz/scripts/backup.sh >> /var/log/redi-quiz-backup.log 2>&1
```

### Restore from Backup

```bash
./scripts/restore.sh backups/redi-quiz-backup-2026-01-30.sql.gz
```

### Migrations

```bash
# Apply pending migrations
docker-compose exec backend npx prisma migrate deploy

# View migration status
docker-compose exec backend npx prisma migrate status
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Stop services
docker-compose down

# Start with new images
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Verify health
curl https://your-domain.com/api/health
```

## Monitoring

### Health Checks

```bash
# API health
curl https://your-domain.com/api/health

# Database connection
docker-compose exec backend node -e "require('./dist/config/database').connectDatabase()"
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f nginx

# Application logs (inside container)
docker-compose exec backend tail -f /app/logs/combined.log
docker-compose exec backend tail -f /app/logs/error.log
```

### Disk Usage

```bash
# Check Docker volumes
docker system df

# Check backup size
du -sh ./backups

# Clean old Docker images
docker image prune -a
```

## Security Checklist

- [ ] All secrets changed from defaults
- [ ] SSL/TLS enabled and enforced
- [ ] Database password is strong
- [ ] Firewall configured (only 80, 443 open)
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] Admin password changed from default
- [ ] Rate limiting tested
- [ ] CORS origins restricted
- [ ] Security headers configured

## Troubleshooting

### Application Won't Start

```bash
# Check container status
docker-compose ps

# View error logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend printenv
```

### Database Connection Errors

```bash
# Check database status
docker-compose ps db

# Test connection
docker-compose exec backend npx prisma db push --skip-generate

# View database logs
docker-compose logs db
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check database queries
docker-compose exec backend npx prisma studio
# Enable query logging in .env: LOG_LEVEL=debug
```

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore previous version
git checkout <previous-tag>

# Restore database if needed
./scripts/restore.sh backups/pre-deployment-backup.sql.gz

# Start services
docker-compose up -d
```

## Production Best Practices

1. **Never** run as root
2. Use Docker secrets for sensitive data
3. Enable log rotation
4. Monitor disk space
5. Set up automated backups
6. Test restore procedure regularly
7. Keep Docker images updated
8. Monitor application logs
9. Set up alerts for errors
10. Document all custom configurations

## Support

For deployment issues:
- Email: redi@health.qld.gov.au
- Check logs: `docker-compose logs -f`
- Review documentation in `/docs`
