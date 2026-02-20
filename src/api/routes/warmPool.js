import { Router } from "express";
import db from "../../db/connection.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const slots = await db("warm_pool").orderBy("id", "asc");

    const summary = {
      total: slots.length,
      available: slots.filter((s) => s.status === "available").length,
      reserved: slots.filter((s) => s.status === "reserved").length,
      used: slots.filter((s) => s.status === "used").length,
      broken: slots.filter((s) => s.status === "broken").length,
    };

    res.json({ summary, slots });
  } catch (err) {
    next(err);
  }
});

export default router;
