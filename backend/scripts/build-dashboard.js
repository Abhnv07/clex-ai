const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const dashboardDir = path.join(repoRoot, 'dashboard');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync(path.join(dashboardDir, 'package.json'))) {
  console.log('[build-dashboard] dashboard/ not found, skipping dashboard build.');
  process.exit(0);
}

if (!fs.existsSync(path.join(dashboardDir, 'node_modules'))) {
  console.log('[build-dashboard] Installing dashboard dependencies...');
  run('npm', ['install', '--legacy-peer-deps'], dashboardDir);
}

console.log('[build-dashboard] Building dashboard into backend/public/dashboard...');
run('npm', ['run', 'build'], dashboardDir);
