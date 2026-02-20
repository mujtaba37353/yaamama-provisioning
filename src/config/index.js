import "dotenv/config";

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL || "postgres://yamama:yamama_pass@localhost:5432/yamama_factory",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },

  api: {
    secretKey: process.env.API_SECRET_KEY || "dev-secret-key",
  },

  controlPlane: {
    url: process.env.CONTROL_PLANE_URL || "http://yamama-platform.local",
    webhookPath: process.env.CONTROL_PLANE_WEBHOOK_PATH || "/wp-json/yamama/v1/store-callback",
    webhookSecret: process.env.CONTROL_PLANE_WEBHOOK_SECRET || "",
  },

  storeHost: {
    ip: process.env.STORE_HOST_IP || "",
    sshUser: process.env.STORE_HOST_SSH_USER || "root",
    sshKeyPath: process.env.STORE_HOST_SSH_KEY_PATH || "",
  },

  store: {
    stagingDomain: process.env.STAGING_DOMAIN || "staging.yourdomain.com",
    maxStoresPerHost: parseInt(process.env.MAX_STORES_PER_HOST || "50", 10),
    minPoolSize: parseInt(process.env.MIN_POOL_SIZE || "5", 10),
  },

  simulation: {
    enabled: process.env.SIMULATE_STEPS === "true",
    stepDelayMs: parseInt(process.env.SIMULATE_STEP_DELAY_MS || "1000", 10),
  },
};

export default config;
