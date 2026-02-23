import { Router } from "express";
import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

const router = Router();

export async function refillPool(requestedCount) {
  const available = await db("warm_pool")
    .where("status", "available")
    .count("id as count")
    .first();
  const availableCount = parseInt(available.count, 10);

  const targetCount =
    requestedCount || Math.max(0, config.store.minPoolSize - availableCount);

  if (targetCount === 0) {
    return { added: 0, available: availableCount };
  }

  const lastSlot = await db("warm_pool").orderBy("id", "desc").first();
  const lastNum = lastSlot
    ? parseInt(lastSlot.slot_name.replace("pool_", ""), 10)
    : 0;

  const newSlots = [];
  for (let i = 1; i <= targetCount; i++) {
    const num = String(lastNum + i).padStart(2, "0");
    newSlots.push({
      slot_name: `pool_${num}`,
      status: "available",
      store_host_id: "host-1",
      db_name: `wp_pool_${num}`,
    });
  }

  await db("warm_pool").insert(newSlots);

  if (config.simulation.enabled) {
    logger.info({ count: targetCount }, "[SIM] Warm pool refilled (simulated)");
  } else {
    for (const slot of newSlots) {
      try {
        const num = slot.slot_name.replace("pool_", "");
        await execRemote(
          `bash /opt/yamama-scripts/infra/seed-single-slot.sh ${num}`
        );
        logger.info({ slot: slot.slot_name }, "Slot provisioned on Store Host");
      } catch (err) {
        logger.error(
          { slot: slot.slot_name, err: err.message },
          "Failed to provision slot"
        );
        await db("warm_pool")
          .where("slot_name", slot.slot_name)
          .update({ status: "broken" });
      }
    }
  }

  return {
    added: targetCount,
    available: availableCount + targetCount,
    slots: newSlots.map((s) => s.slot_name),
  };
}

// GET /warm-pool - pool status overview
router.get("/", async (req, res, next) => {
  try {
    const slots = await db("warm_pool").orderBy("id", "asc");

    const summary = {
      total: slots.length,
      available: slots.filter((s) => s.status === "available").length,
      reserved: slots.filter((s) => s.status === "reserved").length,
      used: slots.filter((s) => s.status === "used").length,
      broken: slots.filter((s) => s.status === "broken").length,
      min_pool_size: config.store.minPoolSize,
      needs_refill:
        slots.filter((s) => s.status === "available").length <
        config.store.minPoolSize,
    };

    res.json({ summary, slots });
  } catch (err) {
    next(err);
  }
});

// POST /warm-pool/refill - trigger warm pool refill
router.post("/refill", async (req, res, next) => {
  try {
    const result = await refillPool(req.body.count || 0);

    if (result.added === 0) {
      return res.json({
        message: "Pool is already at or above minimum capacity",
        available: result.available,
        min_pool_size: config.store.minPoolSize,
      });
    }

    res.status(201).json({
      message: `${result.added} slot(s) added to warm pool`,
      new_slots: result.slots,
      total_available: result.available,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
