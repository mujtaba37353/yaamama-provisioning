import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import provisionRouter from "./routes/provision.js";
import jobsRouter from "./routes/jobs.js";
import storesRouter from "./routes/stores.js";
import warmPoolRouter from "./routes/warmPool.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "yamama-factory", timestamp: new Date().toISOString() });
});

app.use("/provision", authMiddleware, provisionRouter);
app.use("/jobs", authMiddleware, jobsRouter);
app.use("/stores", authMiddleware, storesRouter);
app.use("/warm-pool", authMiddleware, warmPoolRouter);

app.use(errorHandler);

export default app;
