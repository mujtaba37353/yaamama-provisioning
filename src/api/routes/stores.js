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
