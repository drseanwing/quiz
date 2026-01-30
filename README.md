# REdI Quiz Platform

A comprehensive web-based assessment system for the Resuscitation EDucation Initiative (REdI) at Metro North Health.

## Overview

The REdI Quiz Platform enables healthcare staff to complete knowledge assessments for resuscitation training programs, with full administrative capabilities for content management, user management, and completion tracking.

## Key Features

- 🔐 **Secure Authentication** - JWT-based auth with email domain restriction
- 📝 **Rich Question Types** - Multiple choice, true/false, drag-drop, image maps, sliders
- ⏱️ **Timed Assessments** - Configurable time limits with auto-save
- 📊 **Advanced Scoring** - Fractional scoring with immediate or delayed feedback
- 📧 **Email Notifications** - Automated completion notifications via Power Automate
- 👥 **User Management** - Role-based access control (User, Editor, Admin)
- 📦 **Import/Export** - JSON-based question bank portability
- 📈 **Analytics Dashboard** - Completion tracking and reporting

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine (v24+)
- Docker Compose (v2+)
- Node.js 20+ (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quiz
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the application**
   ```bash
   # Development mode with hot-reload
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

   # Production mode
   docker-compose up -d
   ```

4. **Initialize the database**
   ```bash
   # Run migrations
   docker-compose exec backend npx prisma migrate deploy

   # Seed initial data (optional)
   docker-compose exec backend npm run seed
   ```

5. **Access the application**
   - Frontend: http://localhost:9473
   - Backend API: http://localhost:9471/api
   - API Health: http://localhost:9471/api/health
   - Database: localhost:9470

### Default Admin Account

After seeding, login with:
- **Email:** admin@health.qld.gov.au
- **Password:** Admin123!

⚠️ **Change this password immediately in production**

## Development

### Local Development Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run backend (with hot-reload)
cd backend
npm run dev

# Run frontend (with hot-reload)
cd frontend
npm run dev
```

### Database Management

```bash
# Create a new migration
docker-compose exec backend npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
docker-compose exec backend npx prisma migrate reset

# Open Prisma Studio
docker-compose exec backend npx prisma studio
```

### Running Tests

```bash
# Backend tests
docker-compose exec backend npm test
docker-compose exec backend npm run test:coverage

# Frontend tests
docker-compose exec frontend npm test
```

## Project Structure

```
quiz/
├── backend/              # Node.js/Express API
│   ├── prisma/          # Database schema & migrations
│   ├── src/
│   │   ├── config/      # Configuration modules
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── validators/  # Input validation
│   │   └── types/       # TypeScript types
│   └── logs/            # Application logs
├── frontend/            # React SPA
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── hooks/       # Custom hooks
│       ├── context/     # React context
│       ├── services/    # API services
│       └── styles/      # CSS/design tokens
├── nginx/               # Nginx configuration
├── scripts/             # Utility scripts
└── .github/             # GitHub Actions workflows

```

## Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Admin User Guide](./docs/ADMIN_GUIDE.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)

## Question Bank Format

Question banks can be imported/exported as JSON. See the [Question Bank Schema](./docs/QUESTION_BANK_SCHEMA.md) for format details.

Example import:
```bash
curl -X POST http://localhost/api/question-banks/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @question-bank.json
```

## Security

### Important Security Notes

- All passwords are hashed with bcrypt (cost factor 12)
- JWT tokens expire after 1 hour (configurable)
- Rate limiting on all authentication endpoints
- Email domain restriction for non-admin users
- CSRF protection on all forms
- Input sanitization for rich text content

### Reporting Security Issues

Please report security vulnerabilities to: redi@health.qld.gov.au

## Backup & Restore

### Automated Backups

Daily backups are configured via cron (see [scripts/backup.sh](./scripts/backup.sh)):

```bash
# Backup now
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup-2026-01-30.sql.gz
```

### Manual Database Backup

```bash
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

## Monitoring

### Health Check

```bash
curl http://localhost/api/health
```

### Logs

```bash
# View backend logs
docker-compose logs -f backend

# View Nginx logs
docker-compose logs -f nginx

# View all logs
docker-compose logs -f
```

## Troubleshooting

### Common Issues

**Database connection errors**
```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db
```

**Permission errors on uploads**
```bash
# Fix upload directory permissions
docker-compose exec backend chmod -R 755 /app/uploads
```

**Port already in use**
```bash
# Change ports in docker-compose.yml or .env
# Default ports: 80 (nginx), 3000 (backend), 5432 (postgres)
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## License

Copyright © 2026 Metro North Health. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For technical support or questions:
- **Email:** redi@health.qld.gov.au
- **Documentation:** [docs/](./docs/)

## Acknowledgments

Developed for the Resuscitation EDucation Initiative (REdI)
Metro North Health, Queensland Health

---

**Version:** 1.0
**Last Updated:** January 2026
