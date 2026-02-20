import { NodeSSH } from "node-ssh";
import config from "../config/index.js";
import logger from "./logger.js";

let sshInstance = null;

export async function getSSH() {
  if (config.simulation.enabled) {
    return null;
  }

  if (sshInstance && sshInstance.isConnected()) {
    return sshInstance;
  }

  sshInstance = new NodeSSH();
  await sshInstance.connect({
    host: config.storeHost.ip,
    username: config.storeHost.sshUser,
    privateKeyPath: config.storeHost.sshKeyPath,
  });

  logger.info({ host: config.storeHost.ip }, "SSH connected to Store Host");
  return sshInstance;
}

export async function execRemote(command, options = {}) {
  const ssh = await getSSH();
  if (!ssh) {
    throw new Error("SSH not available (simulation mode?)");
  }

  const result = await ssh.execCommand(command, {
    cwd: options.cwd || "/",
    ...options,
  });

  if (result.code !== 0 && !options.ignoreError) {
    const errMsg = result.stderr || `Command exited with code ${result.code}`;
    logger.error({ command, stderr: result.stderr, code: result.code }, "SSH command failed");
    throw new Error(errMsg);
  }

  return result;
}

export async function closeSSH() {
  if (sshInstance && sshInstance.isConnected()) {
    sshInstance.dispose();
    sshInstance = null;
  }
}
