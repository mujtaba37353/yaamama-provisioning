import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { refillPool } from "../../api/routes/warmPool.js";

export async function execute({ storeId, jobId, stepContext }) {
  const storeUrl = stepContext.update_site_url?.store_url ||
    `https://${storeId}.${config.store.stagingDomain}`;

  const sslOk = stepContext.issue_ssl?.ssl_issued === true;

  await db("stores").where("store_id", storeId).update({
    status: sslOk ? "active" : "ssl_pending",
    store_url: storeUrl,
    updated_at: new Date().toISOString(),
  });

  await db("warm_pool")
    .where("reserved_by_job_id", jobId)
    .update({ status: "used" });

  logger.info({ storeId, storeUrl, sslOk }, "Store marked active");

  // Auto-refill: run in background so provisioning response isn't delayed
  refillPool(0).then((result) => {
    if (result.added > 0) {
      logger.info(
        { added: result.added, available: result.available },
        "Warm pool auto-refilled after provisioning"
      );
    }
  }).catch((err) => {
    logger.error({ err: err.message }, "Warm pool auto-refill failed");
  });

  return { store_url: storeUrl, status: sslOk ? "active" : "ssl_pending" };
}

export async function rollback({ storeId }) {
  await db("stores").where("store_id", storeId).update({
    status: "failed",
    updated_at: new Date().toISOString(),
  });
}
