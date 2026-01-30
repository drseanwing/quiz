#!/bin/bash
###############################################################################
# Database Backup Script
# Description: Creates a compressed backup of the PostgreSQL database
# Usage: ./scripts/backup.sh
###############################################################################

set -e

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/redi-quiz-backup-${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== REdI Quiz Platform - Database Backup ===${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  exit 1
fi

# Check if database container is running
if ! docker-compose ps db | grep -q "Up"; then
  echo -e "${RED}Error: Database container is not running${NC}"
  echo "Start the application with: docker-compose up -d"
  exit 1
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
docker-compose exec -T db pg_dump -U "${POSTGRES_USER:-redi_user}" "${POSTGRES_DB:-redi_quiz}" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup created successfully${NC}"
  echo "  File: $BACKUP_FILE"
  echo "  Size: $BACKUP_SIZE"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi

# Cleanup old backups (keep last 30 days)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last ${RETENTION_DAYS} days)...${NC}"
find "$BACKUP_DIR" -name "redi-quiz-backup-*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo ""
echo -e "${GREEN}Recent backups:${NC}"
ls -lh "$BACKUP_DIR"/redi-quiz-backup-*.sql.gz 2>/dev/null | tail -5 || echo "  No backups found"

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
