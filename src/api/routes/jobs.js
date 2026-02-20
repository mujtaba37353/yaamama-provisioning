import { Router } from "express";
import db from "../../db/connection.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { status, type, limit = 20, offset = 0 } = req.query;

    let query = db("jobs").orderBy("created_at", "desc").limit(limit).offset(offset);

    if (status) query = query.where("status", status);
    if (type) query = query.where("type", type);

    const jobs = await query;
    const [{ count }] = await db("jobs").count("id as count");

    res.json({ jobs, total: parseInt(count, 10) });
  } catch (err) {
    next(err);
  }
});

router.get("/:jobId", async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await db("jobs").where("id", jobId).first();
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const steps = await db("job_steps")
      .where("job_id", jobId)
      .orderBy("step_order", "asc");

    res.json({ ...job, steps });
  } catch (err) {
    next(err);
  }
});

export default router;
