'use strict';
/**
 * scripts/local-install/lib/platform.cjs
 *
 * Cross-platform detection for the local-install platform: OS family, arch,
 * shell, and which package managers are available. Everything is injectable
 * (platformId, archId, env, which) so it unit-tests deterministically across
 * macOS / Windows / Linux without running on those machines.
 */

const { which: defaultWhich } = require('./exec.cjs');

/** Map `process.platform` to a friendly OS family. */
function osFamilyFromId(platformId) {
  switch (platformId) {
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

/**
 * Candidate package managers per OS family, in preference order.
 * Each: { id, detect (binary to probe), label }.
 */
const PACKAGE_MANAGERS = {
  macos: [{ id: 'brew', label: 'Homebrew' }],
  linux: [
    { id: 'apt-get', label: 'APT (Debian/Ubuntu)' },
    { id: 'dnf', label: 'DNF (Fedora/RHEL)' },
    { id: 'yum', label: 'YUM (RHEL/CentOS)' },
    { id: 'pacman', label: 'pacman (Arch)' },
    { id: 'zypper', label: 'zypper (openSUSE)' },
    { id: 'apk', label: 'apk (Alpine)' },
  ],
  windows: [
    { id: 'winget', label: 'winget' },
    { id: 'choco', label: 'Chocolatey' },
    { id: 'scoop', label: 'Scoop' },
  ],
  unknown: [],
};

/**
 * Detect the local platform.
 * @returns {{
 *   os: string, arch: string, shell: string, isWindows: boolean,
 *   packageManagers: Array<{id:string,label:string,path:string}>,
 *   primaryPackageManager: {id:string,label:string,path:string}|null
 * }}
 */
function detectPlatform(opts = {}) {
  const platformId = opts.platformId || process.platform;
  const archId = opts.archId || (opts.os && require('node:os').arch()) || require('node:os').arch();
  const env = opts.env || process.env;
  const which = opts.which || defaultWhich;

  const os = osFamilyFromId(platformId);
  const isWindows = os === 'windows';
  const whichOpts = { env, osFamily: isWindows ? 'windows' : 'posix' };

  const candidates = PACKAGE_MANAGERS[os] || [];
  const packageManagers = [];
  for (const candidate of candidates) {
    const found = which(candidate.id, whichOpts);
    if (found) packageManagers.push({ ...candidate, path: found });
  }

  let shell;
  if (isWindows) {
    shell = which('pwsh', whichOpts) ? 'pwsh' : 'powershell';
  } else {
    const shellEnv = env.SHELL || '/bin/sh';
    shell = require('node:path').basename(shellEnv);
  }

  return {
    os,
    arch: archId,
    shell,
    isWindows,
    packageManagers,
    primaryPackageManager: packageManagers[0] || null,
  };
}

module.exports = { detectPlatform, osFamilyFromId, PACKAGE_MANAGERS };
