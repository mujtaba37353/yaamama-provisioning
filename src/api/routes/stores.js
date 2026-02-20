import { Router } from "express";
import db from "../../db/connection.js";

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

export default router;
