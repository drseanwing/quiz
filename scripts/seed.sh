#!/bin/bash
###############################################################################
# Database Seed Script
# Description: Seeds the database with initial data
# Usage: ./scripts/seed.sh
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== REdI Quiz Platform - Database Seed ===${NC}"
echo ""

# Check if Docker is running
if docker info > /dev/null 2>&1; then
  # Running in Docker
  echo -e "${YELLOW}Running seed in Docker container...${NC}"
  docker-compose exec backend npm run db:seed
else
  # Running locally
  echo -e "${YELLOW}Running seed locally...${NC}"
  cd backend && npm run db:seed
fi

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Database seeded successfully${NC}"
  echo ""
  echo "Default admin account:"
  echo "  Email: admin@health.qld.gov.au"
  echo "  Password: Admin123!"
  echo ""
  echo -e "${YELLOW}⚠ IMPORTANT: Change the admin password immediately in production!${NC}"
else
  echo ""
  echo -e "${RED}✗ Seed failed${NC}"
  exit 1
fi
