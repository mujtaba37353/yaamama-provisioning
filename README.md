# Yamama Middleware Orchestration (Factory)

Provisioning engine for Yamama multi-tenant WordPress/WooCommerce stores.

## Architecture

```
Control Plane (Hostinger) --POST /provision--> Factory (this service) --SSH--> Store Host
```

The Factory receives provisioning requests, executes a 10-step pipeline via BullMQ workers, and converts pre-built warm pool slots into live customer stores.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for Redis + PostgreSQL)

## Quick Start

```bash
# 1. Start Redis + PostgreSQL
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Run database migrations + seed warm pool
npm run migrate
npm run seed

# 4. Start the API server (Terminal 1)
npm run dev

# 5. Start the worker (Terminal 2)
npm run dev:worker
```

## Test the Pipeline

```bash
# Create a store
curl -X POST http://localhost:3000/provision \
  -H "Content-Type: application/json" \
  -d '{"template_id": "theme-starter", "plan_id": "basic"}'

# Check job status (use the job_id from the response above)
curl http://localhost:3000/jobs/<job_id>

# List all stores
curl http://localhost:3000/stores

# Check warm pool
curl http://localhost:3000/warm-pool
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Factory health check |
| POST | `/provision` | Create store + start provisioning |
| GET | `/jobs` | List all jobs |
| GET | `/jobs/:jobId` | Get job status + steps |
| GET | `/stores` | List all stores |
| GET | `/stores/:storeId` | Get store details |
| GET | `/warm-pool` | Warm pool status |

## Provisioning Steps

1. **reserve_slot** - Reserve an available warm pool slot
2. **move_files** - Move slot files to store directory
3. **setup_database** - Rename/setup database for the store
4. **update_wp_config** - Update wp-config.php with correct DB credentials
5. **update_site_url** - Set WordPress siteurl/home to subdomain
6. **create_vhost** - Create and enable Nginx vhost
7. **issue_ssl** - Issue SSL certificate (non-fatal if fails)
8. **inject_store_meta** - Add yamama_store_id + token to wp_options
9. **health_check** - Verify the store is accessible
10. **mark_active** - Update store status to active

## Environment Variables

See `.env.example` for all available configuration options.

## GitHub Repository

https://github.com/mujtaba37353/yaamama-provisioning.git
