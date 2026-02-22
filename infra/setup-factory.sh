#!/bin/bash
# =============================================================================
# Factory Droplet Setup Script
# Installs Docker, clones repo, configures and starts the Factory service
# Run on the Factory droplet (Ubuntu 24.04)
# Usage: bash setup-factory.sh
# =============================================================================

set -euo pipefail

REPO_URL="https://github.com/mujtaba37353/yaamama-provisioning.git"
INSTALL_DIR="/opt/yamama-factory"

echo "========================================="
echo "  Yamama Factory Setup"
echo "========================================="

# --- System update ---
echo "[1/6] Updating system packages..."
apt-get update && apt-get upgrade -y

# --- Docker ---
echo "[2/6] Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker

# --- Clone repo ---
echo "[3/6] Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
  echo "  Directory exists, pulling latest..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# --- Create .env ---
echo "[4/6] Creating .env file..."
if [ ! -f "$INSTALL_DIR/.env" ]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  echo ""
  echo "!! IMPORTANT: Edit $INSTALL_DIR/.env with your real values !!"
  echo "   Required:"
  echo "   - DATABASE_URL (postgres connection)"
  echo "   - REDIS_HOST/REDIS_PORT"
  echo "   - API_SECRET_KEY (generate a strong key)"
  echo "   - STORE_HOST_IP"
  echo "   - STORE_HOST_SSH_KEY_PATH (/root/.ssh/storehost_key)"
  echo "   - STAGING_DOMAIN"
  echo "   - NODE_ENV=production"
  echo "   - SIMULATE_STEPS=false"
  echo ""
fi

# --- Start services ---
echo "[5/6] Starting Docker services (Redis + PostgreSQL + Factory)..."
cd "$INSTALL_DIR"
docker compose up -d

echo "[6/6] Waiting for services to start..."
sleep 10

# --- Run migrations ---
echo "Running database migrations..."
docker compose exec factory node node_modules/.bin/knex --knexfile src/db/knexfile.js migrate:latest
docker compose exec factory node node_modules/.bin/knex --knexfile src/db/knexfile.js seed:run

echo ""
echo "========================================="
echo "  Factory setup complete!"
echo "========================================="
echo ""
echo "Test with:"
echo "  curl http://localhost:3000/health"
echo "  curl -X POST http://localhost:3000/provision \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'X-API-Key: <your-api-key>' \\"
echo "    -d '{\"template_id\":\"theme-starter\",\"plan_id\":\"basic\"}'"
echo ""
