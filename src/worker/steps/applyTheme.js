import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { execRemote } from "../../utils/ssh.js";

const THEMES_BASE = "/var/www/templates/yaamama-themes/themes";
const PLUGINS_BASE = "/var/www/templates/yaamama-themes/plugins";
const MU_PLUGINS_BASE = "/var/www/templates/yaamama-themes/mu-plugins";

const SHARED_PLUGINS = [
  "yamama-shipping",
  "moyasar",
  "paymob-for-woocommerce",
];

export async function execute({ storeId, themeId }) {
  const storePath = `/var/www/stores/${storeId}`;
  const themeSrc = `${THEMES_BASE}/${themeId}`;

  if (config.simulation.enabled) {
    await sleep(config.simulation.stepDelayMs);
    logger.info({ storeId, themeId }, `[SIM] Applied theme ${themeId}`);
    return { theme_applied: true, theme_id: themeId };
  }

  const themeExists = await execRemote(`test -d '${themeSrc}' && echo yes || echo no`);
  if (themeExists.stdout.trim() !== "yes") {
    throw new Error(`Theme "${themeId}" not found at ${themeSrc}`);
  }

  await execRemote(`cp -r '${themeSrc}' '${storePath}/wp-content/themes/${themeId}'`);

  for (const plugin of SHARED_PLUGINS) {
    const pluginSrc = `${PLUGINS_BASE}/${plugin}`;
    const pluginExists = await execRemote(`test -d '${pluginSrc}' && echo yes || echo no`);
    if (pluginExists.stdout.trim() === "yes") {
      await execRemote(`cp -r '${pluginSrc}' '${storePath}/wp-content/plugins/${plugin}'`);
    }
  }

  await execRemote(`cp ${MU_PLUGINS_BASE}/*.php '${storePath}/wp-content/mu-plugins/' 2>/dev/null || true`);

  await execRemote(`chown -R www-data:www-data '${storePath}/wp-content'`);

  await execRemote(`wp theme activate '${themeId}' --allow-root --path='${storePath}'`);

  const activateList = SHARED_PLUGINS.join(" ");
  await execRemote(
    `wp plugin activate ${activateList} --allow-root --path='${storePath}' 2>/dev/null || true`
  );

  logger.info({ storeId, themeId }, "Theme and plugins applied");
  return { theme_applied: true, theme_id: themeId, plugins: SHARED_PLUGINS };
}

export async function rollback({ storeId, themeId }) {
  if (config.simulation.enabled) {
    logger.info({ storeId }, `[SIM] rollback: theme removed`);
    return;
  }

  const storePath = `/var/www/stores/${storeId}`;
  try {
    if (themeId) {
      await execRemote(`rm -rf '${storePath}/wp-content/themes/${themeId}'`, { ignoreError: true });
    }
  } catch (e) {
    logger.warn({ storeId }, "Theme rollback failed, non-critical");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
