#!/bin/bash
# =============================================================================
# Seed a single warm pool slot
# Called by the Factory's refill mechanism via SSH
# Usage: bash seed-single-slot.sh <slot_number>
# Example: bash seed-single-slot.sh 15
# =============================================================================

set -euo pipefail

SLOT_NUM="${1:-}"
if [ -z "$SLOT_NUM" ]; then
  echo "Usage: bash seed-single-slot.sh <slot_number>"
  exit 1
fi

SLOT_NUM=$(printf "%02d" "$SLOT_NUM")
SLOT_NAME="pool_${SLOT_NUM}"
SLOT_PATH="/var/www/warm-pool/${SLOT_NAME}"
SLOT_DB="wp_pool_${SLOT_NUM}"
SLOT_DB_USER="wp_pool_${SLOT_NUM}"
SLOT_DB_PASS="pool_pass_${SLOT_NUM}"
SKELETON_DIR="/var/www/templates/wp-skeleton"
SKELETON_SQL="/var/www/templates/skeleton.sql"

if [ -d "$SLOT_PATH" ]; then
  echo "Slot $SLOT_NAME already exists at $SLOT_PATH"
  exit 0
fi

echo "Creating slot $SLOT_NAME..."

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

echo "Slot $SLOT_NAME created successfully"
