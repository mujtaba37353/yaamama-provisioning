#!/bin/bash
# =============================================================================
# Warm Pool Seeding Script
# Creates N pre-provisioned WordPress slots from the skeleton
# Run on Store Host after setup-wp-skeleton.sh
# Usage: bash seed-warm-pool.sh [count]
# =============================================================================

set -euo pipefail

POOL_COUNT="${1:-5}"
SKELETON_DIR="/var/www/templates/wp-skeleton"
SKELETON_SQL="/var/www/templates/skeleton.sql"
POOL_DIR="/var/www/warm-pool"

if [ ! -d "$SKELETON_DIR" ] || [ ! -f "$SKELETON_SQL" ]; then
  echo "Error: WP skeleton not found. Run setup-wp-skeleton.sh first."
  exit 1
fi

echo "========================================="
echo "  Seeding Warm Pool: $POOL_COUNT slots"
echo "========================================="

for i in $(seq 1 "$POOL_COUNT"); do
  SLOT_NUM=$(printf "%02d" "$i")
  SLOT_NAME="pool_${SLOT_NUM}"
  SLOT_PATH="${POOL_DIR}/${SLOT_NAME}"
  SLOT_DB="wp_pool_${SLOT_NUM}"
  SLOT_DB_USER="wp_pool_${SLOT_NUM}"
  SLOT_DB_PASS="pool_pass_${SLOT_NUM}"

  if [ -d "$SLOT_PATH" ]; then
    echo "  [${SLOT_NUM}] Skipping (already exists)"
    continue
  fi

  echo "  [${SLOT_NUM}] Creating slot ${SLOT_NAME}..."

  cp -a "$SKELETON_DIR" "$SLOT_PATH"

  mysql -e "
    CREATE DATABASE IF NOT EXISTS \`$SLOT_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '${SLOT_DB_USER}'@'localhost' IDENTIFIED BY '${SLOT_DB_PASS}';
    GRANT ALL PRIVILEGES ON \`$SLOT_DB\`.* TO '${SLOT_DB_USER}'@'localhost';
    FLUSH PRIVILEGES;
  "

  mysql "$SLOT_DB" < "$SKELETON_SQL"

  wp config set DB_NAME "$SLOT_DB" --allow-root --path="$SLOT_PATH"
  wp config set DB_USER "$SLOT_DB_USER" --allow-root --path="$SLOT_PATH"
  wp config set DB_PASSWORD "$SLOT_DB_PASS" --allow-root --path="$SLOT_PATH"

  chown -R www-data:www-data "$SLOT_PATH"

  echo "  [${SLOT_NUM}] Done"
done

echo ""
echo "========================================="
echo "  Warm Pool seeded: $POOL_COUNT slots"
echo "========================================="
echo ""
echo "Verify:"
echo "  ls -la $POOL_DIR/"
echo ""
