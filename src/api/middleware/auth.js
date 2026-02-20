import config from "../../config/index.js";

export function authMiddleware(req, res, next) {
  if (config.nodeEnv === "development" && !req.headers["x-api-key"]) {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== config.api.secretKey) {
    return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
  }

  next();
}
