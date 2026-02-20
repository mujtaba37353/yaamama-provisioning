#!/bin/bash
# =============================================================================
# Daily Store Backup Script
# Run via cron on Store Host: 0 2 * * * /opt/scripts/backup-stores.sh
# Backs up all active store databases and wp-content directories
# =============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/yamama"
DATE=$(date +%Y-%m-%d)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR/$DATE/databases"
mkdir -p "$BACKUP_DIR/$DATE/files"

echo "[$(date)] Starting daily backup..."

# Backup all store databases
for DB_DIR in /var/www/stores/store-*/; do
  if [ ! -d "$DB_DIR" ]; then continue; fi

  STORE_ID=$(basename "$DB_DIR")
  DB_NAME="wp_${STORE_ID//-/_}"

  echo "  Backing up database: $DB_NAME"
  mysqldump --single-transaction "$DB_NAME" | gzip > "$BACKUP_DIR/$DATE/databases/${DB_NAME}.sql.gz" 2>/dev/null || \
    echo "  WARNING: Failed to backup $DB_NAME"
done

# Backup all store wp-content directories
for STORE_DIR in /var/www/stores/store-*/; do
  if [ ! -d "$STORE_DIR" ]; then continue; fi

  STORE_ID=$(basename "$STORE_DIR")
  WP_CONTENT="$STORE_DIR/wp-content"

  if [ -d "$WP_CONTENT" ]; then
    echo "  Backing up wp-content: $STORE_ID"
    tar czf "$BACKUP_DIR/$DATE/files/${STORE_ID}-wp-content.tar.gz" -C "$STORE_DIR" wp-content 2>/dev/null || \
      echo "  WARNING: Failed to backup $STORE_ID wp-content"
  fi
done

# Remove old backups
echo "  Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;

echo "[$(date)] Backup complete: $BACKUP_DIR/$DATE"
