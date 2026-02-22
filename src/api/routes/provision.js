import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../db/connection.js";
import { provisionQueue } from "../../utils/queue.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

const router = Router();

const PROVISION_STEPS = [
  "reserve_slot",
  "move_files",
  "setup_database",
  "update_wp_config",
  "update_site_url",
  "create_vhost",
  "issue_ssl",
  "apply_theme",
  "inject_store_meta",
  "health_check",
  "mark_active",
];

router.post("/", async (req, res, next) => {
  try {
    const { template_id, plan_id, theme_id, callback_url } = req.body;

    if (!template_id || !plan_id) {
      return res.status(400).json({
        error: "template_id and plan_id are required",
      });
    }

    // Check warm pool capacity
    const available = await db("warm_pool").where("status", "available").count("id as count").first();
    if (!available || parseInt(available.count, 10) === 0) {
      return res.status(503).json({
        error: "No warm pool slots available. Please try again later.",
      });
    }

    // Check store limit per host
    const activeCount = await db("stores")
      .whereIn("status", ["active", "ssl_pending", "provisioning"])
      .count("id as count")
      .first();
    if (parseInt(activeCount.count, 10) >= config.store.maxStoresPerHost) {
      return res.status(503).json({
        error: "Maximum store capacity reached. Please try again later.",
      });
    }

    const storeId = `store-${uuidv4().slice(0, 8)}`;
    const jobId = uuidv4();
    const apiToken = uuidv4();

    await db("stores").insert({
      id: uuidv4(),
      store_id: storeId,
      plan_id,
      template_id,
      theme_id: theme_id || template_id,
      status: "pending",
      api_token: apiToken,
      store_host_id: "host-1",
    });

    await db("jobs").insert({
      id: jobId,
      store_id: storeId,
      type: "provision",
      status: "queued",
    });

    const stepRows = PROVISION_STEPS.map((name, i) => ({
      job_id: jobId,
      step_name: name,
      step_order: i + 1,
      status: "pending",
    }));
    await db("job_steps").insert(stepRows);

    await provisionQueue.add(
      "provision-store",
      {
        jobId,
        storeId,
        templateId: template_id,
        themeId: theme_id || template_id,
        planId: plan_id,
        callbackUrl: callback_url,
      },
      { jobId }
    );

    logger.info({ storeId, jobId }, "Provisioning job queued");

    res.status(201).json({
      store_id: storeId,
      job_id: jobId,
      status: "queued",
      message: "Store provisioning started",
    });
  } catch (err) {
    next(err);
  }
});

// Retry a failed provisioning job
router.post("/:storeId/retry", async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const store = await db("stores").where("store_id", storeId).first();

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (store.status !== "failed") {
      return res.status(400).json({ error: `Store status is "${store.status}", only failed stores can be retried` });
    }

    // Release any reserved slot back to pool
    await db("warm_pool")
      .where("status", "reserved")
      .whereIn("reserved_by_job_id", db("jobs").where("store_id", storeId).select("id"))
      .update({ status: "available", reserved_by_job_id: null, reserved_at: null });

    // Reset store
    await db("stores").where("store_id", storeId).update({
      status: "pending",
      error: null,
      slot_id: null,
      store_url: null,
      updated_at: new Date().toISOString(),
    });

    const jobId = uuidv4();

    await db("jobs").insert({
      id: jobId,
      store_id: storeId,
      type: "provision",
      status: "queued",
    });

    const stepRows = PROVISION_STEPS.map((name, i) => ({
      job_id: jobId,
      step_name: name,
      step_order: i + 1,
      status: "pending",
    }));
    await db("job_steps").insert(stepRows);

    await provisionQueue.add(
      "provision-store",
      {
        jobId,
        storeId,
        templateId: store.template_id,
        themeId: store.theme_id,
        planId: store.plan_id,
      },
      { jobId }
    );

    logger.info({ storeId, jobId }, "Retry provisioning job queued");

    res.status(201).json({
      store_id: storeId,
      job_id: jobId,
      status: "queued",
      message: "Store provisioning retry started",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
