import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = db("stores").orderBy("created_at", "desc").limit(limit).offset(offset);
    if (status) query = query.where("status", status);

    const stores = await query;
    const [{ count }] = await db("stores").count("id as count");

    res.json({ stores, total: parseInt(count, 10) });
  } catch (err) {
    next(err);
  }
});

router.get("/:storeId", async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const jobs = await db("jobs")
      .where("store_id", storeId)
      .orderBy("created_at", "desc");

    res.json({ ...store, jobs });
  } catch (err) {
    next(err);
  }
});

// Suspend a store (disable nginx, show suspended page)
router.post("/:storeId/suspend", async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (store.status === "suspended") {
      return res.json({ message: "Already suspended", store_id: storeId });
    }

    const serverName = store.store_url
      ? new URL(store.store_url).hostname
      : `${storeId}.${config.store.stagingDomain}`;

    if (config.simulation.enabled) {
      logger.info({ storeId }, `[SIM] Store suspended`);
    } else {
      const suspendedConf = `
server {
    listen 80;
    server_name ${serverName};
    root /var/www/suspended;
    index index.html;
    location / {
        try_files \\$uri /index.html =404;
    }
}`;
      await execRemote(
        `echo '${suspendedConf.replace(/'/g, "'\\''")}' > /etc/nginx/sites-available/${storeId}.conf`
      );
      await execRemote("nginx -t && systemctl reload nginx");
    }

    await db("stores").where("store_id", storeId).update({
      status: "suspended",
      suspended_at: new Date(),
      updated_at: new Date(),
    });

    logger.info({ storeId }, "Store suspended");
    res.json({ message: "Store suspended", store_id: storeId });
  } catch (err) {
    next(err);
  }
});

// Reactivate a suspended store
router.post("/:storeId/reactivate", async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (store.status !== "suspended") {
      return res.json({ message: "Store is not suspended", store_id: storeId });
    }

    const serverName = store.store_url
      ? new URL(store.store_url).hostname
      : `${storeId}.${config.store.stagingDomain}`;

    if (config.simulation.enabled) {
      logger.info({ storeId }, `[SIM] Store reactivated`);
    } else {
      const templatePath = "/etc/nginx/templates/store.conf.template";
      const sitePath = `/etc/nginx/sites-available/${storeId}.conf`;
      await execRemote(
        `sed -e 's/{{SERVER_NAME}}/${serverName}/g' -e 's/{{STORE_ID}}/${storeId}/g' ${templatePath} > ${sitePath}`
      );
      await execRemote("nginx -t && systemctl reload nginx");
    }

    await db("stores").where("store_id", storeId).update({
      status: "active",
      suspended_at: null,
      updated_at: new Date(),
    });

    logger.info({ storeId }, "Store reactivated");
    res.json({ message: "Store reactivated", store_id: storeId });
  } catch (err) {
    next(err);
  }
});

// Generate a one-time auto-login token for the store admin
router.post("/:storeId/auto-login-token", async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (!store.store_url) {
      return res.status(400).json({ error: "Store URL not set yet" });
    }

    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    const tokenJson = JSON.stringify({ token, expires: expiresAt });

    if (config.simulation.enabled) {
      logger.info({ storeId }, `[SIM] Auto-login token generated`);
    } else {
      const storePath = `/var/www/stores/${storeId}`;
      await execRemote(
        `wp option update yamama_autologin_token '${tokenJson}' --allow-root --path='${storePath}'`
      );
    }

    const loginUrl = `${store.store_url}/?yamama_autologin=${token}`;

    logger.info({ storeId }, "Auto-login token generated");

    res.json({ login_url: loginUrl, expires_in: 300 });
  } catch (err) {
    next(err);
  }
});

export default router;
