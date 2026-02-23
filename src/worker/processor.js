import db from "../db/connection.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { notifyControlPlane } from "../utils/webhook.js";
import { STEP_REGISTRY, STEP_ORDER } from "./steps/index.js";

export async function processProvisionJob(bullJob) {
  const { jobId, storeId, templateId, themeId, planId } = bullJob.data;

  logger.info({ jobId, storeId }, "Starting provisioning job");

  await db("jobs").where("id", jobId).update({
    status: "running",
    updated_at: new Date().toISOString(),
  });

  await db("stores").where("store_id", storeId).update({
    status: "provisioning",
    updated_at: new Date().toISOString(),
  });

  const stepContext = {};
  const completedSteps = [];

  for (const stepName of STEP_ORDER) {
    const stepModule = STEP_REGISTRY[stepName];
    if (!stepModule) {
      logger.warn({ stepName }, "Step module not found, skipping");
      continue;
    }

    await db("jobs").where("id", jobId).update({
      current_step: stepName,
      updated_at: new Date().toISOString(),
    });

    await db("job_steps")
      .where("job_id", jobId)
      .where("step_name", stepName)
      .update({ status: "running", started_at: new Date().toISOString() });

    try {
      const result = await stepModule.execute({
        jobId,
        storeId,
        templateId,
        themeId,
        planId,
        stepContext,
      });

      stepContext[stepName] = result || {};
      completedSteps.push(stepName);

      await db("job_steps")
        .where("job_id", jobId)
        .where("step_name", stepName)
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: JSON.stringify(result || {}),
        });

      logger.info({ jobId, stepName }, "Step completed");
    } catch (err) {
      logger.error({ jobId, stepName, err: err.message }, "Step failed");

      await db("job_steps")
        .where("job_id", jobId)
        .where("step_name", stepName)
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error: err.message,
        });

      if (stepModule.nonFatal) {
        logger.warn({ stepName }, "Non-fatal step failed, continuing pipeline");
        stepContext[stepName] = { failed: true, error: err.message };
        completedSteps.push(stepName);
        continue;
      }

      await rollbackSteps(completedSteps, { jobId, storeId, stepContext });

      await db("jobs").where("id", jobId).update({
        status: "failed",
        error: `Step "${stepName}" failed: ${err.message}`,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await db("stores").where("store_id", storeId).update({
        status: "failed",
        error: `Provisioning failed at step "${stepName}"`,
        updated_at: new Date().toISOString(),
      });

      // Notify Control Plane of failure
      await notifyControlPlane({
        event: "provision.failed",
        store_id: storeId,
        job_id: jobId,
        error: err.message,
        failed_step: stepName,
      });

      throw err;
    }
  }

  // All steps completed successfully
  await db("jobs").where("id", jobId).update({
    status: "completed",
    current_step: null,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const store = await db("stores").where("store_id", storeId).first();

  // Notify Control Plane of success
  await notifyControlPlane({
    event: "provision.completed",
    store_id: storeId,
    job_id: jobId,
    store_url: store?.store_url,
    status: store?.status,
    admin_email: store?.customer_email,
  });

  logger.info({ jobId, storeId }, "Provisioning job completed successfully");
}

async function rollbackSteps(completedSteps, context) {
  const reversed = [...completedSteps].reverse();

  for (const stepName of reversed) {
    const stepModule = STEP_REGISTRY[stepName];
    if (!stepModule?.rollback) continue;

    try {
      logger.info({ stepName }, "Rolling back step");
      await stepModule.rollback(context);
    } catch (rollbackErr) {
      logger.error({ stepName, err: rollbackErr.message }, "Rollback failed for step");
    }
  }
}
