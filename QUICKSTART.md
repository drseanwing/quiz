# Quick Start Guide

Get the REdI Quiz Platform up and running in minutes.

## Prerequisites

- Docker Desktop or Docker Engine (v24+)
- Docker Compose (v2+)
- Git

## Steps

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd quiz

# Copy and configure environment
cp .env.example .env

# Edit .env - at minimum, set these:
# - POSTGRES_PASSWORD (use: openssl rand -base64 32)
# - JWT_SECRET (use: openssl rand -base64 64)
# - JWT_REFRESH_SECRET (use: openssl rand -base64 64)
```

### 2. Start the Application

```bash
# Development mode (with hot-reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# OR Production mode
docker-compose up -d
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data (creates admin user)
./scripts/seed.sh
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **API Health**: http://localhost/api/health

### 5. Login

Use the default admin account:
- **Email**: admin@health.qld.gov.au
- **Password**: Admin123!

⚠️ **Change this password immediately!**

## Development Tools

### Prisma Studio (Database GUI)

```bash
# Start with tools profile
docker-compose --profile tools up -d prisma-studio

# Access at http://localhost:5555
```

### Adminer (Database Admin)

```bash
# Start with tools profile
docker-compose --profile tools up -d adminer

# Access at http://localhost:8081
```

## Common Commands

```bash
# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Run backend shell
docker-compose exec backend sh

# Run database backup
./scripts/backup.sh

# Run tests
docker-compose exec backend npm test
docker-compose exec frontend npm test
```

## Troubleshooting

### Port Already in Use

Edit `.env` or `docker-compose.yml` to change ports:
- 80 (nginx) → Change in docker-compose.yml
- 3000 (backend) → Change PORT in .env
- 5432 (postgres) → Change POSTGRES_PORT in .env

### Database Connection Error

```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Permission Errors

```bash
# Fix upload directory permissions
docker-compose exec backend chmod -R 755 /app/uploads

# Fix log directory permissions
docker-compose exec backend chmod -R 755 /app/logs
```

## Next Steps

1. **Change admin password** in the UI
2. **Review security settings** in `.env`
3. **Configure email notifications** (POWER_AUTOMATE_EMAIL_URL)
4. **Set up SSL certificates** for production (see docs/DEPLOYMENT.md)
5. **Read the documentation** in the `docs/` directory
6. **Review Claude instructions** in CLAUDE_INSTRUCTIONS.md

## Getting Help

- 📖 Full documentation in `docs/`
- 🔧 Deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- 🤝 Contributing: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- 📧 Support: redi@health.qld.gov.au

## Project Structure

```
quiz/
├── backend/          # Node.js API
├── frontend/         # React app
├── nginx/           # Reverse proxy
├── scripts/         # Utility scripts
├── docs/            # Documentation
└── .github/         # CI/CD workflows
```

For detailed architecture and specifications, see the main [README.md](README.md).
