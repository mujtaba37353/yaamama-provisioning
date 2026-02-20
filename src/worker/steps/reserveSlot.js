import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

export async function execute({ jobId, storeId }) {
  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
  }

  const slot = await db("warm_pool")
    .where("status", "available")
    .where("store_host_id", "host-1")
    .orderBy("id", "asc")
    .first();

  if (!slot) {
    throw new Error("No available warm pool slots");
  }

  await db("warm_pool").where("id", slot.id).update({
    status: "reserved",
    reserved_by_job_id: jobId,
    reserved_at: new Date().toISOString(),
  });

  await db("stores").where("store_id", storeId).update({
    slot_id: slot.slot_name,
  });

  logger.info({ storeId, slot: slot.slot_name }, "Slot reserved");
  return { slot_name: slot.slot_name, db_name: slot.db_name };
}

export async function rollback({ jobId, storeId }) {
  const slot = await db("warm_pool").where("reserved_by_job_id", jobId).first();
  if (slot) {
    await db("warm_pool").where("id", slot.id).update({
      status: "available",
      reserved_by_job_id: null,
      reserved_at: null,
    });
    logger.info({ storeId, slot: slot.slot_name }, "Slot released (rollback)");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
