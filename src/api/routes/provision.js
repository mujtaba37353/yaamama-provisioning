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
  "inject_store_meta",
  "health_check",
  "mark_active",
];

router.post("/", async (req, res, next) => {
  try {
    const { template_id, plan_id, theme_id } = req.body;

    if (!template_id || !plan_id) {
      return res.status(400).json({
        error: "template_id and plan_id are required",
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

export default router;
