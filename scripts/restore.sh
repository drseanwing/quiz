#!/bin/bash
###############################################################################
# Database Restore Script
# Description: Restores a PostgreSQL database from backup
# Usage: ./scripts/restore.sh [backup-file]
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== REdI Quiz Platform - Database Restore ===${NC}"
echo ""

# Check for backup file argument
if [ -z "$1" ]; then
  echo -e "${RED}Error: No backup file specified${NC}"
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/redi-quiz-backup-*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

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

# Warning
echo -e "${RED}WARNING: This will delete all existing data!${NC}"
echo -e "Backup file: ${YELLOW}$BACKUP_FILE${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Create a backup of current database before restore
echo ""
echo -e "${YELLOW}Creating safety backup of current database...${NC}"
SAFETY_BACKUP="./backups/pre-restore-backup-$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
docker-compose exec -T db pg_dump -U "${POSTGRES_USER:-redi_user}" "${POSTGRES_DB:-redi_quiz}" | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✓ Safety backup created: $SAFETY_BACKUP${NC}"

# Restore database
echo ""
echo -e "${YELLOW}Restoring database...${NC}"
gunzip < "$BACKUP_FILE" | docker-compose exec -T db psql -U "${POSTGRES_USER:-redi_user}" "${POSTGRES_DB:-redi_quiz}"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Database restored successfully${NC}"
else
  echo -e "${RED}✗ Restore failed${NC}"
  echo -e "${YELLOW}You can restore from the safety backup if needed:${NC}"
  echo "  $0 $SAFETY_BACKUP"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Restore Complete ===${NC}"
