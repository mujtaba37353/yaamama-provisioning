import config from "../config/index.js";
import logger from "./logger.js";
import crypto from "crypto";

export async function notifyControlPlane(payload) {
  const baseUrl = config.controlPlane.url;
  const webhookPath = config.controlPlane.webhookPath;

  if (!baseUrl) {
    logger.warn("No CONTROL_PLANE_URL configured, skipping webhook");
    return;
  }

  const url = `${baseUrl}${webhookPath}`;
  const body = JSON.stringify(payload);

  const headers = {
    "Content-Type": "application/json",
  };

  if (config.controlPlane.webhookSecret) {
    const signature = crypto
      .createHmac("sha256", config.controlPlane.webhookSecret)
      .update(body)
      .digest("hex");
    headers["X-Yamama-Signature"] = signature;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.warn({ url, status: res.status }, "Control Plane webhook returned non-OK");
    } else {
      logger.info({ url, storeId: payload.store_id }, "Control Plane notified");
    }
  } catch (err) {
    logger.error({ url, err: err.message }, "Failed to notify Control Plane (non-fatal)");
  }
}
