#!/bin/bash

# RAPT Deployment Script
# This script handles local deployment tasks: database migrations, builds, and testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
  log_error ".env file not found"
  log_info "Please copy .env.example to .env and fill in your values"
  exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "STRIPE_SECRET_KEY"
  "VITE_APP_ID"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    log_error "Missing required environment variable: $var"
    exit 1
  fi
done

log_info "Environment variables loaded"

# Parse command line arguments
COMMAND=${1:-help}

case $COMMAND in
  migrate)
    log_info "Running database migrations..."
    pnpm drizzle-kit generate
    pnpm drizzle-kit migrate
    log_info "Migrations completed"
    ;;
  
  test)
    log_info "Running tests..."
    pnpm test
    log_info "Tests passed"
    ;;
  
  build)
    log_info "Building application..."
    pnpm build
    log_info "Build completed"
    ;;
  
  dev)
    log_info "Starting development server..."
    pnpm dev
    ;;
  
  prod)
    log_info "Building for production..."
    pnpm build
    log_info "Starting production server..."
    pnpm start
    ;;
  
  full-deploy)
    log_info "Running full deployment pipeline..."
    
    log_info "Step 1: Running database migrations..."
    pnpm drizzle-kit generate
    pnpm drizzle-kit migrate
    
    log_info "Step 2: Running tests..."
    pnpm test
    
    log_info "Step 3: Building application..."
    pnpm build
    
    log_info "Step 4: Verifying build..."
    if [ ! -d "dist" ]; then
      log_error "Build failed - dist directory not found"
      exit 1
    fi
    
    log_info "Full deployment pipeline completed successfully!"
    log_info "Ready to deploy to Vercel"
    ;;
  
  verify)
    log_info "Verifying deployment prerequisites..."
    
    # Check Node.js version
    node_version=$(node -v)
    log_info "Node.js version: $node_version"
    
    # Check pnpm
    pnpm_version=$(pnpm -v)
    log_info "pnpm version: $pnpm_version"
    
    # Check database connection
    log_info "Checking database connection..."
    if pnpm drizzle-kit introspect > /dev/null 2>&1; then
      log_info "Database connection successful"
    else
      log_error "Failed to connect to database"
      exit 1
    fi
    
    # Check environment variables
    log_info "Checking environment variables..."
    for var in "${required_vars[@]}"; do
      if [ -z "${!var}" ]; then
        log_error "Missing: $var"
      else
        log_info "✓ $var configured"
      fi
    done
    
    log_info "Verification completed"
    ;;
  
  help)
    echo "RAPT Deployment Script"
    echo ""
    echo "Usage: ./scripts/deploy.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  migrate      - Run database migrations"
    echo "  test         - Run test suite"
    echo "  build        - Build for production"
    echo "  dev          - Start development server"
    echo "  prod         - Build and start production server"
    echo "  full-deploy  - Run complete deployment pipeline"
    echo "  verify       - Verify deployment prerequisites"
    echo "  help         - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/deploy.sh migrate"
    echo "  ./scripts/deploy.sh full-deploy"
    echo "  ./scripts/deploy.sh verify"
    ;;
  
  *)
    log_error "Unknown command: $COMMAND"
    echo "Run './scripts/deploy.sh help' for usage information"
    exit 1
    ;;
esac
