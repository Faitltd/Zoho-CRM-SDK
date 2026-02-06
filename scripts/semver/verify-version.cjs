const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const baselinePath = path.join(projectRoot, 'api', 'zoho-crm.api.json');
const currentPath = path.join(projectRoot, 'temp', 'api', 'zoho-crm.api.json');
const baselineVersionPath = path.join(projectRoot, 'api', 'baseline-version.json');
const packageJsonPath = path.join(projectRoot, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseSemver(version) {
  const base = version.split('-')[0];
  const [major, minor, patch] = base.split('.').map((part) => Number(part));
  return { major, minor, patch };
}

function bumpType(oldVersion, newVersion) {
  if (!oldVersion || !newVersion) return 'unknown';
  if (newVersion.major !== oldVersion.major) return 'major';
  if (newVersion.minor !== oldVersion.minor) return 'minor';
  if (newVersion.patch !== oldVersion.patch) return 'patch';
  return 'none';
}

function fingerprint(item) {
  const excerpt = Array.isArray(item.excerptTokens)
    ? item.excerptTokens.map((token) => token.text).join('')
    : '';
  const normalized = excerpt.replace(/\s+/g, ' ').trim();
  const releaseTag = item.releaseTag ?? '';
  return `${item.kind}|${releaseTag}|${normalized}`;
}

function collectItems(node, map, seen = new Set()) {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);

  if (node.canonicalReference && node.kind) {
    map.set(node.canonicalReference, fingerprint(node));
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) collectItems(item, map, seen);
    } else if (value && typeof value === 'object') {
      collectItems(value, map, seen);
    }
  }
}

function diffApi(baseline, current) {
  const baselineMap = new Map();
  const currentMap = new Map();

  collectItems(baseline, baselineMap);
  collectItems(current, currentMap);

  const removed = [];
  const added = [];
  const changed = [];

  for (const [key, value] of baselineMap.entries()) {
    const next = currentMap.get(key);
    if (!next) {
      removed.push(key);
    } else if (next !== value) {
      changed.push(key);
    }
  }

  for (const key of currentMap.keys()) {
    if (!baselineMap.has(key)) added.push(key);
  }

  let required = 'none';
  if (removed.length || changed.length) {
    required = 'major';
  } else if (added.length) {
    required = 'minor';
  }

  return { removed, added, changed, required };
}

function assertFilesExist() {
  if (!fs.existsSync(baselinePath)) {
    console.error('[semver] Missing api/zoho-crm.api.json baseline. Run: npm run api:baseline');
    process.exit(1);
  }
  if (!fs.existsSync(currentPath)) {
    console.error('[semver] Missing temp/api/zoho-crm.api.json. Run: npm run api:extract');
    process.exit(1);
  }
  if (!fs.existsSync(baselineVersionPath)) {
    console.error('[semver] Missing api/baseline-version.json. Run: npm run api:baseline');
    process.exit(1);
  }
}

function main() {
  assertFilesExist();

  const baseline = readJson(baselinePath);
  const current = readJson(currentPath);
  const baselineVersion = readJson(baselineVersionPath).version;
  const currentVersion = readJson(packageJsonPath).version;

  const diff = diffApi(baseline, current);
  const required = diff.required;
  const currentBump = bumpType(parseSemver(baselineVersion), parseSemver(currentVersion));

  console.log('[semver] Baseline version:', baselineVersion);
  console.log('[semver] Current version:', currentVersion);
  console.log('[semver] Required bump:', required);
  console.log('[semver] Detected bump:', currentBump);

  if (diff.removed.length || diff.changed.length || diff.added.length) {
    console.log('[semver] API changes summary:', {
      removed: diff.removed.length,
      changed: diff.changed.length,
      added: diff.added.length
    });
  }

  if (required === 'major' && currentBump !== 'major') {
    console.error('[semver] Breaking changes detected. Please bump MAJOR version.');
    process.exit(1);
  }

  if (required === 'minor' && !['minor', 'major'].includes(currentBump)) {
    console.error('[semver] New API additions detected. Please bump MINOR (or MAJOR) version.');
    process.exit(1);
  }

  if (currentBump === 'none' && required !== 'none') {
    console.error('[semver] API changed but package.json version did not change.');
    process.exit(1);
  }

  console.log('[semver] Version check passed.');
}

main();
