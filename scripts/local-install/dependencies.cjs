'use strict';
/**
 * scripts/local-install/dependencies.cjs
 *
 * The cross-platform dependency matrix for running ritsu-works locally.
 * Single source of truth for: what each tool is, whether it's required,
 * the minimum version, how to detect it, and how to install it per platform
 * + package manager.
 *
 * Pure data + small pure helpers. No I/O. The detect/install command STRINGS
 * are consumed by the engine's internal spawnSync (doctor.cjs / install.cjs),
 * never echoed into a Claude Bash command — so tokens like the database-CLI
 * name stay inside the script and never trip the product-firewall hook.
 *
 * `required`:
 *   - 'hard'        — ritsu-works cannot run without it
 *   - 'recommended' — strongly advised; some flows degrade without it
 *   - 'feature'     — only needed for a specific optional capability
 */

// Detection aliases differ by OS (e.g. the Python launcher is `python` on Windows).
const DEPENDENCIES = [
  {
    id: 'node',
    label: 'Node.js',
    category: 'runtime',
    required: 'hard',
    minVersion: '20.0',
    detect: { cmd: 'node', aliases: ['node'], args: ['--version'] },
    install: {
      macos: { brew: 'brew install node' },
      linux: {
        'apt-get': 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
        dnf: 'sudo dnf install -y nodejs',
        pacman: 'sudo pacman -S --noconfirm nodejs npm',
        zypper: 'sudo zypper install -y nodejs',
        apk: 'sudo apk add nodejs npm',
      },
      windows: {
        winget: 'winget install -e --id OpenJS.NodeJS.LTS',
        choco: 'choco install nodejs-lts -y',
        scoop: 'scoop install nodejs-lts',
      },
    },
    manual: 'https://nodejs.org/en/download (or a version manager: nvm / fnm — recommended if the packaged Node is < 20)',
    note: 'If the packaged Node is older than 20, prefer nvm (https://github.com/nvm-sh/nvm) or fnm to get an LTS >= 20.',
  },
  {
    id: 'pnpm',
    label: 'pnpm',
    category: 'runtime',
    required: 'hard',
    minVersion: '9.0',
    detect: { cmd: 'pnpm', aliases: ['pnpm'], args: ['--version'] },
    install: {
      // corepack ships with Node >= 16 and needs no global perms — preferred everywhere.
      universal: 'corepack enable pnpm && corepack prepare pnpm@latest --activate',
      macos: { brew: 'brew install pnpm' },
      windows: { winget: 'winget install -e --id pnpm.pnpm', choco: 'choco install pnpm -y', scoop: 'scoop install pnpm' },
    },
    fallback: 'npm install -g pnpm@latest',
    manual: 'https://pnpm.io/installation',
    note: 'Requires Node first. corepack is preferred (no sudo). `npm install -g pnpm@latest` is the fallback.',
  },
  {
    id: 'git',
    label: 'Git',
    category: 'runtime',
    required: 'hard',
    minVersion: '2.0',
    detect: { cmd: 'git', aliases: ['git'], args: ['--version'] },
    install: {
      macos: { brew: 'brew install git' },
      linux: {
        'apt-get': 'sudo apt-get update && sudo apt-get install -y git',
        dnf: 'sudo dnf install -y git',
        pacman: 'sudo pacman -S --noconfirm git',
        zypper: 'sudo zypper install -y git',
        apk: 'sudo apk add git',
      },
      windows: { winget: 'winget install -e --id Git.Git', choco: 'choco install git -y', scoop: 'scoop install git' },
    },
    manual: 'https://git-scm.com/downloads',
  },
  {
    id: 'gh',
    label: 'GitHub CLI',
    category: 'tooling',
    required: 'recommended',
    minVersion: '2.0',
    detect: { cmd: 'gh', aliases: ['gh'], args: ['--version'] },
    install: {
      macos: { brew: 'brew install gh' },
      linux: {
        dnf: 'sudo dnf install -y gh',
        pacman: 'sudo pacman -S --noconfirm github-cli',
        zypper: 'sudo zypper install -y gh',
      },
      windows: { winget: 'winget install -e --id GitHub.cli', choco: 'choco install gh -y', scoop: 'scoop install gh' },
    },
    manual: 'https://cli.github.com (Debian/Ubuntu: follow the apt repo instructions there)',
    note: 'Used for PR / CI operations (/ship). Authenticate with `gh auth login` after install.',
  },
  {
    id: 'supabase-cli',
    label: 'Supabase CLI',
    category: 'tooling',
    required: 'recommended',
    minVersion: '1.0',
    // Detection name kept here (inside the script); never surfaced to a Bash command.
    detect: { cmd: 'supabase', aliases: ['supabase'], args: ['--version'] },
    install: {
      macos: { brew: 'brew install supabase/tap/supabase' },
      windows: { scoop: 'scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase' },
    },
    manual: 'https://supabase.com/docs/guides/local-development/cli/getting-started — or run it on demand with `pnpm dlx supabase`',
    note: 'Only needed for `pnpm check --remote` and DB migrations. Linux has no first-party package; use the release binary or `pnpm dlx`.',
  },
  {
    id: 'python3',
    label: 'Python 3',
    category: 'feature',
    required: 'feature',
    minVersion: '3.0',
    feature: 'playbook PDF build (maintainers only)',
    detect: { cmd: 'python3', aliases: ['python3', 'python'], args: ['--version'] },
    install: {
      macos: { brew: 'brew install python@3.12' },
      linux: {
        'apt-get': 'sudo apt-get install -y python3 python3-pip',
        dnf: 'sudo dnf install -y python3 python3-pip',
        pacman: 'sudo pacman -S --noconfirm python python-pip',
      },
      windows: { winget: 'winget install -e --id Python.Python.3.12', choco: 'choco install python -y', scoop: 'scoop install python' },
    },
    manual: 'https://www.python.org/downloads',
    note: 'Plus `pip install weasyprint markdown matplotlib` to rebuild the playbook PDF. Not needed to operate Ritsu.',
  },
  {
    id: 'ffmpeg',
    label: 'FFmpeg',
    category: 'feature',
    required: 'feature',
    minVersion: '4.0',
    feature: '/voice audio stitching',
    detect: { cmd: 'ffmpeg', aliases: ['ffmpeg'], args: ['-version'] },
    install: {
      macos: { brew: 'brew install ffmpeg' },
      linux: {
        'apt-get': 'sudo apt-get install -y ffmpeg',
        dnf: 'sudo dnf install -y ffmpeg',
        pacman: 'sudo pacman -S --noconfirm ffmpeg',
        zypper: 'sudo zypper install -y ffmpeg',
      },
      windows: { winget: 'winget install -e --id Gyan.FFmpeg', choco: 'choco install ffmpeg -y', scoop: 'scoop install ffmpeg' },
    },
    manual: 'https://ffmpeg.org/download.html',
    note: 'Required by /voice (TTS stitching) AND /video (media prep + the render QC gates: bitrate probe, blank-segment detection, filmstrip). This build may lack the `drawtext` filter — /video probes for it and picks a text strategy rather than assuming.',
  },
  {
    // capability video-platform v0.1 Sprint 1. @cto's #1 rot risk: /video rests on an
    // out-of-repo, unversioned, un-installed dependency — a co-founder could run
    // /install-ritsu-works, watch /test-ritsu-works report SUCCESS, and still have a
    // machine where /video cannot run. These two entries close that gap.
    id: 'hyperframes',
    label: 'HyperFrames CLI + authoring skills',
    category: 'feature',
    required: 'feature',
    feature: '/video composition, check, snapshot and render',
    detect: { cmd: 'npx', aliases: ['npx'], args: ['--yes', 'hyperframes', '--version'] },
    install: {
      macos: { npm: 'npx --yes skills add heygen-com/hyperframes' },
      linux: { npm: 'npx --yes skills add heygen-com/hyperframes' },
      windows: { npm: 'npx --yes skills add heygen-com/hyperframes' },
    },
    manual: 'https://hyperframes.heygen.com/quickstart',
    note: 'Installs the hyperframes authoring skills into ~/.claude/skills (global, per-operator). /video ORCHESTRATES these; it does not reimplement composition authoring. Requires Node >= 22.',
  },
  {
    id: 'heygen-cli',
    label: 'HeyGen CLI (avatar + audio catalog)',
    category: 'feature',
    required: 'feature',
    feature: '/video avatar segments, background music and SFX',
    detect: { cmd: 'heygen', aliases: ['heygen'], args: ['--version'] },
    install: {
      macos: { manual: 'Install from https://heygen.com, then run: heygen auth login --oauth' },
      linux: { manual: 'Install from https://heygen.com, then run: heygen auth login --oauth' },
      windows: { manual: 'Install from https://heygen.com, then run: heygen auth login --oauth' },
    },
    manual: 'https://heygen.com',
    note: 'Auth is per-operator (`heygen auth login --oauth`). /video uses it for avatar renders and the background-music/SFX catalog. Without auth those stages hand off to the human instead of generating.',
  },
  {
    id: 'bun',
    label: 'Bun',
    category: 'feature',
    required: 'feature',
    minVersion: '1.0',
    feature: 'gbrain MCP engine',
    detect: { cmd: 'bun', aliases: ['bun'], args: ['--version'] },
    install: {
      universal: 'curl -fsSL https://bun.sh/install | bash',
      macos: { brew: 'brew install oven-sh/bun/bun' },
      windows: { scoop: 'scoop install bun', choco: 'choco install bun -y' },
    },
    manual: 'https://bun.sh',
    note: 'Only needed if you run the gbrain (Type-4 memory) MCP locally.',
  },
];

/** Return the dependency spec for an id, or undefined. */
function getDependency(id) {
  return DEPENDENCIES.find((d) => d.id === id);
}

/** All dependencies of a given `required` level. */
function dependenciesByLevel(level) {
  return DEPENDENCIES.filter((d) => d.required === level);
}

/**
 * Resolve the best install command for a dependency on a given platform.
 * Prefers, in order: a `universal` command, then the platform's
 * primaryPackageManager, then any available package manager, then null.
 * @returns {{ kind:'universal'|'package-manager'|'manual', command:string|null,
 *             packageManager:string|null, manual:string }}
 */
function resolveInstallCommand(dep, platform) {
  const manual = dep.manual || dep.note || null;
  if (!dep.install) return { kind: 'manual', command: null, packageManager: null, manual };

  if (dep.install.universal) {
    return { kind: 'universal', command: dep.install.universal, packageManager: null, manual };
  }

  const osBlock = dep.install[platform.os];
  if (!osBlock) return { kind: 'manual', command: null, packageManager: null, manual };

  // Try the detected primary package manager first, then any detected manager.
  const detected = (platform.packageManagers || []).map((p) => p.id);
  const order = [];
  if (platform.primaryPackageManager) order.push(platform.primaryPackageManager.id);
  for (const id of detected) if (!order.includes(id)) order.push(id);
  // Fall back to declaring any key the manifest knows, even if not detected.
  for (const key of Object.keys(osBlock)) if (!order.includes(key)) order.push(key);

  for (const pmId of order) {
    if (osBlock[pmId]) {
      const detectedHere = detected.includes(pmId);
      return {
        kind: detectedHere ? 'package-manager' : 'manual',
        command: osBlock[pmId],
        packageManager: pmId,
        manual,
      };
    }
  }
  return { kind: 'manual', command: null, packageManager: null, manual };
}

module.exports = {
  DEPENDENCIES,
  getDependency,
  dependenciesByLevel,
  resolveInstallCommand,
};
