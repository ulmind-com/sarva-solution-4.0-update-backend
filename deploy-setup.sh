#!/usr/bin/env bash

# ==============================================================================
# Sarva Solutions MLM System - AWS Deployment & Env Setup Helper
# ==============================================================================
# Run this script on your AWS instance to easily configure, run, and monitor
# the Docker container without facing any env or manual setup issues.
# ==============================================================================

set -euo pipefail

# ANSI color codes for premium terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}🚀 SARVA SOLUTION MLM - AWS DEPLOYMENT & ENVIRONMENT SETUP ENGINE${NC}"
echo -e "${CYAN}======================================================================${NC}"

# Helper to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Dependency Check
echo -e "\n${BLUE}[Step 1/5] Checking Docker & Docker Compose installation...${NC}"
DOCKER_COMPOSE_CMD=""

if command_exists docker; then
    echo -e "  - Docker: ${GREEN}Installed (${NC}$(docker --version)${GREEN})${NC}"
else
    echo -e "  - ${RED}Error: Docker is not installed.${NC} Please install Docker first."
    echo -e "    Run: ${YELLOW}curl -fsSL https://get.docker.com | sh${NC}"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    echo -e "  - Docker Compose: ${GREEN}Installed (plugin)${NC}"
    DOCKER_COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
    echo -e "  - Docker Compose: ${GREEN}Installed (standalone)${NC}"
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "  - ${RED}Error: Docker Compose is not installed.${NC}"
    echo -e "    Run: ${YELLOW}sudo apt-get install docker-compose-plugin${NC} (Ubuntu/Debian)"
    exit 1
fi

# 2. Environment file setup
echo -e "\n${BLUE}[Step 2/5] Checking Environment File (.env)...${NC}"
if [ ! -f .env ]; then
    echo -e "  - ${YELLOW}.env file not found.${NC} Creating one from .env.example..."
    cp .env.example .env
    echo -e "  - ${GREEN}.env template created successfully.${NC}"
else
    echo -e "  - ${GREEN}.env file already exists.${NC}"
fi

# 3. Interactive environment configuration
read_env_val() {
    local key="$1"
    grep -E "^${key}=" .env | cut -d'=' -f2- || echo ""
}

update_env_val() {
    local key="$1"
    local val="$2"
    # Escaping value for sed
    local escaped_val=$(printf '%s\n' "$val" | sed -e 's/[\/&]/\\&/g')
    if grep -q "^${key}=" .env; then
        sed -i "s/^${key}=.*/${key}=${escaped_val}/" .env
    else
        echo "${key}=${val}" >> .env
    fi
}

MONGO_URI=$(read_env_val "MONGO_URI")
JWT_SECRET=$(read_env_val "JWT_SECRET")

# Check if keys need updating
if [[ "$MONGO_URI" == "mongodb://localhost:27017/sarvasolution" || -z "$MONGO_URI" || "$JWT_SECRET" == "your_super_secret_jwt_key_here" || -z "$JWT_SECRET" ]]; then
    echo -e "\n${YELLOW}🔔 Critical configuration values are missing or default.${NC}"
    echo -e "Please provide your database connection and security secret:"
    
    # Mongo URI input
    read -p "🔑 Enter MONGO_URI (e.g. mongodb+srv://...): " user_mongo
    if [ -n "$user_mongo" ]; then
        update_env_val "MONGO_URI" "$user_mongo"
    fi

    # JWT Secret input
    read -p "🔑 Enter JWT_SECRET (press Enter to auto-generate a secure random key): " user_jwt
    if [ -z "$user_jwt" ]; then
        user_jwt=$(openssl rand -hex 24 2>/dev/null || echo "svs_mlm_secret_$(date +%s)_$(random_str 8 2>/dev/null || echo 'default')")
        echo -e "  - Generated random key: ${GREEN}$user_jwt${NC}"
    fi
    update_env_val "JWT_SECRET" "$user_jwt"
    
    # Reload variables
    MONGO_URI=$(read_env_val "MONGO_URI")
    JWT_SECRET=$(read_env_val "JWT_SECRET")
fi

# 4. Final Verification
echo -e "\n${BLUE}[Step 3/5] Validating environment configurations...${NC}"
VALID=true

if [[ -z "$MONGO_URI" || "$MONGO_URI" == "mongodb://localhost:27017/sarvasolution" ]]; then
    echo -e "  - MONGO_URI: ${RED}Invalid or missing!${NC}"
    VALID=false
else
    echo -e "  - MONGO_URI: ${GREEN}Configured${NC}"
fi

if [[ -z "$JWT_SECRET" || "$JWT_SECRET" == "your_super_secret_jwt_key_here" ]]; then
    echo -e "  - JWT_SECRET: ${RED}Invalid or missing!${NC}"
    VALID=false
else
    echo -e "  - JWT_SECRET: ${GREEN}Configured${NC}"
fi

# Warnings for optional integrations
OPT_WARN=()
if [ -z "$(read_env_val "RESEND_API_KEY")" ] || [[ "$(read_env_val "RESEND_API_KEY")" == "re_your_resend_api_key" ]]; then
    OPT_WARN+=("RESEND_API_KEY (Emails will not send)")
fi
if [ -z "$(read_env_val "CLOUDINARY_CLOUD_NAME")" ] || [[ "$(read_env_val "CLOUDINARY_CLOUD_NAME")" == "your_cloudinary_cloud_name" ]]; then
    OPT_WARN+=("CLOUDINARY keys (Image/KYC uploads will not work)")
fi
if [ -z "$(read_env_val "APITXT_AUTHKEY")" ] || [[ "$(read_env_val "APITXT_AUTHKEY")" == "your_apitxt_auth_key" ]]; then
    OPT_WARN+=("APITXT_AUTHKEY (OTP verification during registration will fail)")
fi

if [ "$VALID" = false ]; then
    echo -e "\n${RED}❌ Error: Critical environment variables are not configured in your .env file.${NC}"
    echo -e "Please edit the ${YELLOW}.env${NC} file directly and resolve these issues before running again."
    exit 1
fi

if [ ${#OPT_WARN[@]} -ne 0 ]; then
    echo -e "\n${YELLOW}⚠️  Note: Some optional integrations are not fully set up:${NC}"
    for warn in "${OPT_WARN[@]}"; do
        echo -e "  - ${YELLOW}$warn${NC}"
    done
    echo -e "You can configure them later in your ${CYAN}.env${NC} file and restart."
fi

# 5. Pull & Deployment execution
echo -e "\n${BLUE}[Step 4/5] Pulling latest image from Docker Hub...${NC}"
$DOCKER_COMPOSE_CMD pull ssvpl-mlm-api

echo -e "\n${BLUE}[Step 5/5] Launching containerized backend...${NC}"
$DOCKER_COMPOSE_CMD up -d ssvpl-mlm-api

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "🎉 ${GREEN}SARVA SOLUTION MLM BACKEND IS NOW DEPLOYED & RUNNING ON AWS!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "📍 Port: ${CYAN}$(read_env_val "PORT" || echo "8000")${NC}"
echo -e "📍 Mode: ${CYAN}$(read_env_val "NODE_ENV" || echo "production")${NC}"
echo -e "📍 Healthcheck status: ${CYAN}http://localhost:$(read_env_val "PORT" || echo "8000")/health${NC}"
echo -e "----------------------------------------------------------------------"
echo -e "To view running container logs, execute:"
echo -e "  ${YELLOW}$DOCKER_COMPOSE_CMD logs -f ssvpl-mlm-api${NC}"
echo -e "To stop the backend, execute:"
echo -e "  ${YELLOW}$DOCKER_COMPOSE_CMD down${NC}"
echo -e "${CYAN}======================================================================${NC}"
