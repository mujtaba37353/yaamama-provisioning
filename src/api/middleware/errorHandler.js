import logger from "../../utils/logger.js";

export function errorHandler(err, req, res, _next) {
  logger.error({ err, path: req.path }, "Unhandled error");

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
