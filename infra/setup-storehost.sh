#!/bin/bash
# =============================================================================
# Store Host Setup Script
# Run this on the Store Host droplet (Ubuntu 22.04)
# Usage: bash setup-storehost.sh
# =============================================================================

set -euo pipefail

echo "========================================="
echo "  Yamama Store Host Setup"
echo "========================================="

# --- System update ---
echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y

# --- Nginx ---
echo "[2/8] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# Create templates directory for store vhosts
mkdir -p /etc/nginx/templates
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# --- PHP-FPM ---
echo "[3/8] Installing PHP 8.1 + extensions..."
apt-get install -y software-properties-common
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y \
  php8.1-fpm php8.1-mysql php8.1-curl php8.1-gd php8.1-intl \
  php8.1-mbstring php8.1-xml php8.1-zip php8.1-soap php8.1-bcmath \
  php8.1-imagick php8.1-redis
systemctl enable php8.1-fpm
systemctl start php8.1-fpm

# --- MariaDB ---
echo "[4/8] Installing MariaDB..."
apt-get install -y mariadb-server mariadb-client
systemctl enable mariadb
systemctl start mariadb

echo "[4/8] Securing MariaDB..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$(openssl rand -base64 24)';"
echo "!! SAVE the MariaDB root password from the line above !!"

# --- WP-CLI ---
echo "[5/8] Installing WP-CLI..."
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
mv wp-cli.phar /usr/local/bin/wp
wp --info

# --- Certbot ---
echo "[6/8] Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# --- Directory structure ---
echo "[7/8] Creating directory structure..."
mkdir -p /var/www/templates/wp-skeleton
mkdir -p /var/www/warm-pool
mkdir -p /var/www/stores

chown -R www-data:www-data /var/www/templates
chown -R www-data:www-data /var/www/warm-pool
chown -R www-data:www-data /var/www/stores

# --- Nginx store template ---
echo "[8/8] Creating Nginx store template..."
cat > /etc/nginx/templates/store.conf.template << 'NGINX_TPL'
server {
    listen 80;
    server_name {{SERVER_NAME}};

    root /var/www/stores/{{STORE_ID}};
    index index.php index.html;

    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }

    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires max;
        log_not_found off;
    }
}
NGINX_TPL

echo ""
echo "========================================="
echo "  Store Host setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Run: bash setup-wp-skeleton.sh"
echo "  2. Run: bash seed-warm-pool.sh <count>"
echo ""
