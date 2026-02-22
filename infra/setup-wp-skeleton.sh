#!/bin/bash
# =============================================================================
# WP Skeleton Setup Script
# Creates the base WordPress + WooCommerce installation used as template
# Run on Store Host after setup-storehost.sh
# Usage: bash setup-wp-skeleton.sh
# =============================================================================

set -euo pipefail

SKELETON_DIR="/var/www/templates/wp-skeleton"
SKELETON_DB="wp_skeleton"

echo "========================================="
echo "  Setting up WP Skeleton"
echo "========================================="

# --- Create skeleton database ---
echo "[1/6] Creating skeleton database..."
mysql -e "
  CREATE DATABASE IF NOT EXISTS $SKELETON_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'wp_skeleton'@'localhost' IDENTIFIED BY 'skeleton_pass_changeme';
  GRANT ALL PRIVILEGES ON $SKELETON_DB.* TO 'wp_skeleton'@'localhost';
  FLUSH PRIVILEGES;
"

# --- Download WordPress ---
echo "[2/6] Downloading WordPress..."
cd "$SKELETON_DIR"
wp core download --allow-root

# --- Configure wp-config.php ---
echo "[3/6] Creating wp-config.php..."
wp config create \
  --dbname="$SKELETON_DB" \
  --dbuser="wp_skeleton" \
  --dbpass="skeleton_pass_changeme" \
  --dbhost="localhost" \
  --dbprefix="wp_" \
  --allow-root

# --- Install WordPress ---
echo "[4/6] Installing WordPress..."
wp core install \
  --url="http://skeleton.local" \
  --title="Yamama Store" \
  --admin_user="yamama_admin" \
  --admin_password="$(openssl rand -base64 16)" \
  --admin_email="admin@yamama.local" \
  --skip-email \
  --allow-root

# --- Install WooCommerce + essential plugins ---
echo "[5/6] Installing WooCommerce and essential plugins..."
wp plugin install woocommerce --activate --allow-root

# --- Base WordPress settings ---
echo "[6/6] Configuring base settings..."
wp option update blogdescription "Powered by Yamama" --allow-root
wp option update permalink_structure "/%postname%/" --allow-root
wp option update timezone_string "Asia/Riyadh" --allow-root
wp option update WPLANG "ar" --allow-root
wp rewrite flush --allow-root

# Set ownership
chown -R www-data:www-data "$SKELETON_DIR"

# --- Export skeleton DB dump ---
echo "Exporting skeleton database dump..."
mysqldump "$SKELETON_DB" > /var/www/templates/skeleton.sql

echo ""
echo "========================================="
echo "  WP Skeleton ready!"
echo "========================================="
echo "  Files: $SKELETON_DIR"
echo "  DB dump: /var/www/templates/skeleton.sql"
echo ""
