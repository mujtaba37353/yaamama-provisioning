import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import dns from "dns/promises";
import db from "../../db/connection.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

const router = Router();

// POST /stores/:storeId/domain - attach a custom domain
router.post("/:storeId/domain", async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "domain is required" });
    }

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (!["active", "ssl_pending"].includes(store.status)) {
      return res.status(400).json({ error: `Store must be active before adding domain (current: ${store.status})` });
    }

    // Return DNS instructions to the customer
    const storeHostIp = config.storeHost.ip || "YOUR_STORE_HOST_IP";

    res.json({
      store_id: storeId,
      domain,
      dns_instructions: {
        type: "A",
        name: "@",
        value: storeHostIp,
        ttl: 3600,
        note: `Add this A record in your domain's DNS settings, then call POST /stores/${storeId}/domain/verify`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /stores/:storeId/domain/verify - verify DNS and activate domain
router.post("/:storeId/domain/verify", async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "domain is required" });
    }

    const store = await db("stores").where("store_id", storeId).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Verify DNS points to our Store Host
    const storeHostIp = config.storeHost.ip;
    let dnsVerified = false;

    if (config.simulation.enabled) {
      logger.info({ storeId, domain }, "[SIM] DNS verification simulated as successful");
      dnsVerified = true;
    } else {
      if (!storeHostIp) {
        return res.status(500).json({ error: "STORE_HOST_IP not configured" });
      }

      try {
        const addresses = await dns.resolve4(domain);
        dnsVerified = addresses.includes(storeHostIp);
      } catch (dnsErr) {
        return res.status(400).json({
          error: `DNS lookup failed for ${domain}: ${dnsErr.message}`,
          hint: `Make sure you added an A record pointing to ${storeHostIp}`,
        });
      }

      if (!dnsVerified) {
        return res.status(400).json({
          error: `DNS for ${domain} does not point to ${storeHostIp}`,
          hint: "DNS changes can take up to 48 hours to propagate",
        });
      }
    }

    // Create domain mapping job
    const jobId = uuidv4();

    await db("jobs").insert({
      id: jobId,
      store_id: storeId,
      type: "domain_map",
      status: "queued",
    });

    const steps = ["update_vhost_domain", "issue_ssl_domain", "update_site_url_domain", "mark_domain_active"];
    const stepRows = steps.map((name, i) => ({
      job_id: jobId,
      step_name: name,
      step_order: i + 1,
      status: "pending",
    }));
    await db("job_steps").insert(stepRows);

    await db("stores").where("store_id", storeId).update({
      custom_domain: domain,
      updated_at: new Date().toISOString(),
    });

    if (config.simulation.enabled) {
      // Simulate domain mapping steps
      simulateDomainMapping(jobId, storeId, domain, store);
    } else {
      executeDomainMapping(jobId, storeId, domain, store);
    }

    res.status(201).json({
      store_id: storeId,
      job_id: jobId,
      domain,
      status: "queued",
      message: "Domain mapping started",
    });
  } catch (err) {
    next(err);
  }
});

async function executeDomainMapping(jobId, storeId, domain, store) {
  try {
    const storePath = `/var/www/stores/${storeId}`;
    const stagingName = `${storeId}.${config.store.stagingDomain}`;

    await updateStepStatus(jobId, "update_vhost_domain", "running");

    // Update nginx vhost to accept the new domain
    const sitePath = `/etc/nginx/sites-available/${storeId}.conf`;
    await execRemote(`sed -i 's/server_name ${stagingName};/server_name ${stagingName} ${domain};/' ${sitePath}`);
    await execRemote("nginx -t");
    await execRemote("systemctl reload nginx");
    await updateStepStatus(jobId, "update_vhost_domain", "completed");

    await updateStepStatus(jobId, "issue_ssl_domain", "running");

    // Issue SSL for custom domain
    try {
      await execRemote(
        `certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@${config.store.stagingDomain} --redirect`
      );
      await updateStepStatus(jobId, "issue_ssl_domain", "completed");
    } catch (sslErr) {
      await updateStepStatus(jobId, "issue_ssl_domain", "failed", sslErr.message);
      logger.warn({ domain, err: sslErr.message }, "SSL for custom domain failed (non-fatal)");
    }

    await updateStepStatus(jobId, "update_site_url_domain", "running");

    // Update WordPress URLs
    const newUrl = `https://${domain}`;
    await execRemote(`wp option update siteurl '${newUrl}' --allow-root --path='${storePath}'`);
    await execRemote(`wp option update home '${newUrl}' --allow-root --path='${storePath}'`);
    await updateStepStatus(jobId, "update_site_url_domain", "completed");

    await updateStepStatus(jobId, "mark_domain_active", "running");

    await db("stores").where("store_id", storeId).update({
      store_url: newUrl,
      status: "active",
      updated_at: new Date().toISOString(),
    });
    await db("jobs").where("id", jobId).update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await updateStepStatus(jobId, "mark_domain_active", "completed");

    logger.info({ storeId, domain }, "Domain mapping completed");
  } catch (err) {
    logger.error({ storeId, domain, err: err.message }, "Domain mapping failed");
    await db("jobs").where("id", jobId).update({
      status: "failed",
      error: err.message,
      updated_at: new Date().toISOString(),
    });
  }
}

async function simulateDomainMapping(jobId, storeId, domain, store) {
  const delay = config.simulation.stepDelayMs;
  const steps = ["update_vhost_domain", "issue_ssl_domain", "update_site_url_domain", "mark_domain_active"];

  setImmediate(async () => {
    try {
      await db("jobs").where("id", jobId).update({ status: "running", updated_at: new Date().toISOString() });

      for (const step of steps) {
        await updateStepStatus(jobId, step, "running");
        await sleep(delay);
        logger.info({ storeId, step }, `[SIM] Domain mapping step completed`);
        await updateStepStatus(jobId, step, "completed");
      }

      const newUrl = `https://${domain}`;
      await db("stores").where("store_id", storeId).update({
        store_url: newUrl,
        status: "active",
        updated_at: new Date().toISOString(),
      });
      await db("jobs").where("id", jobId).update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info({ storeId, domain }, "[SIM] Domain mapping completed");
    } catch (err) {
      logger.error({ storeId, err: err.message }, "[SIM] Domain mapping failed");
      await db("jobs").where("id", jobId).update({ status: "failed", error: err.message });
    }
  });
}

async function updateStepStatus(jobId, stepName, status, error = null) {
  const update = {
    status,
    ...(status === "running" && { started_at: new Date().toISOString() }),
    ...(["completed", "failed"].includes(status) && { completed_at: new Date().toISOString() }),
    ...(error && { error }),
  };
  await db("job_steps").where("job_id", jobId).where("step_name", stepName).update(update);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
