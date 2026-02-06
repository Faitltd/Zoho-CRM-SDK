const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const currentPath = path.join(projectRoot, 'temp', 'api', 'zoho-crm.api.json');
const baselinePath = path.join(projectRoot, 'api', 'zoho-crm.api.json');
const baselineVersionPath = path.join(projectRoot, 'api', 'baseline-version.json');
const packageJsonPath = path.join(projectRoot, 'package.json');

if (!fs.existsSync(currentPath)) {
  console.error('[semver] Missing temp/api/zoho-crm.api.json. Run: npm run api:extract');
  process.exit(1);
}

fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
fs.copyFileSync(currentPath, baselinePath);

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const baseline = { version: pkg.version };
fs.writeFileSync(baselineVersionPath, `${JSON.stringify(baseline, null, 2)}\n`);

console.log('[semver] Updated API baseline for version', pkg.version);
