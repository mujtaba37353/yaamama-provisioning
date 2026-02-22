import * as reserveSlot from "./reserveSlot.js";
import * as moveFiles from "./moveFiles.js";
import * as setupDatabase from "./setupDatabase.js";
import * as updateWpConfig from "./updateWpConfig.js";
import * as updateSiteUrl from "./updateSiteUrl.js";
import * as createVhost from "./createVhost.js";
import * as issueSsl from "./issueSsl.js";
import * as applyTheme from "./applyTheme.js";
import * as injectStoreMeta from "./injectStoreMeta.js";
import * as healthCheck from "./healthCheck.js";
import * as markActive from "./markActive.js";

export const STEP_REGISTRY = {
  reserve_slot: reserveSlot,
  move_files: moveFiles,
  setup_database: setupDatabase,
  update_wp_config: updateWpConfig,
  update_site_url: updateSiteUrl,
  create_vhost: createVhost,
  issue_ssl: issueSsl,
  apply_theme: applyTheme,
  inject_store_meta: injectStoreMeta,
  health_check: healthCheck,
  mark_active: markActive,
};

export const STEP_ORDER = [
  "reserve_slot",
  "move_files",
  "setup_database",
  "update_wp_config",
  "update_site_url",
  "create_vhost",
  "issue_ssl",
  "apply_theme",
  "inject_store_meta",
  "health_check",
  "mark_active",
];
