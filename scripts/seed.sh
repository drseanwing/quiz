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
  # Running in Docker — use the plain JS seed script (tsx not available in prod)
  echo -e "${YELLOW}Running seed in Docker container...${NC}"
  docker-compose exec backend node prisma/seed.js
else
  # Running locally — tsx is available
  echo -e "${YELLOW}Running seed locally...${NC}"
  cd backend && npm run db:seed
fi

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Database seeded successfully${NC}"
  echo ""
  echo "Default admin account:"
  echo "  Email: admin@health.qld.gov.au"
  echo "  Password: Password1!"
  echo ""
  echo -e "${YELLOW}⚠ IMPORTANT: Change the admin password immediately in production!${NC}"
else
  echo ""
  echo -e "\033[0;31m✗ Seed failed\033[0m"
  exit 1
fi
