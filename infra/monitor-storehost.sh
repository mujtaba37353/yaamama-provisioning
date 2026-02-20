#!/bin/bash
# =============================================================================
# Store Host Monitoring Script
# Run via cron every 5 min: */5 * * * * /opt/scripts/monitor-storehost.sh
# Checks disk, RAM, MySQL, PHP workers and alerts via webhook
# =============================================================================

ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
DISK_THRESHOLD=85
RAM_THRESHOLD=85
MYSQL_CONN_THRESHOLD=100

ALERTS=""

# --- Disk usage ---
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
  ALERTS="${ALERTS}DISK: ${DISK_USAGE}% used (threshold: ${DISK_THRESHOLD}%)\n"
fi

# --- RAM usage ---
RAM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$RAM_USAGE" -gt "$RAM_THRESHOLD" ]; then
  ALERTS="${ALERTS}RAM: ${RAM_USAGE}% used (threshold: ${RAM_THRESHOLD}%)\n"
fi

# --- MySQL connections ---
MYSQL_CONNS=$(mysqladmin status 2>/dev/null | awk '{print $4}' || echo "0")
if [ "$MYSQL_CONNS" -gt "$MYSQL_CONN_THRESHOLD" ]; then
  ALERTS="${ALERTS}MySQL: ${MYSQL_CONNS} connections (threshold: ${MYSQL_CONN_THRESHOLD})\n"
fi

# --- PHP-FPM check ---
if ! systemctl is-active --quiet php8.1-fpm; then
  ALERTS="${ALERTS}PHP-FPM: service not running!\n"
fi

# --- Nginx check ---
if ! systemctl is-active --quiet nginx; then
  ALERTS="${ALERTS}Nginx: service not running!\n"
fi

# --- Send alert if needed ---
if [ -n "$ALERTS" ]; then
  echo -e "[ALERT] Store Host Issues:\n$ALERTS"

  if [ -n "$ALERT_WEBHOOK_URL" ]; then
    PAYLOAD=$(cat <<EOF
{
  "text": "Store Host Alert",
  "alerts": "$(echo -e "$ALERTS")"
}
EOF
)
    curl -s -X POST "$ALERT_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" > /dev/null 2>&1
  fi
fi
