const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const DEFAULT_IGNORE = new Set(['node_modules', 'dist', 'coverage', '.git']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const args = { path: process.cwd(), out: undefined, format: 'text' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      args.path = argv[i + 1];
      i += 1;
    } else if (arg === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--format') {
      args.format = argv[i + 1] || 'text';
      i += 1;
    }
  }
  return args;
}

function listFiles(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (DEFAULT_IGNORE.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (DEFAULT_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function findLineInfo(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEnd = text.indexOf('\n', index);
  const lineText = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
  return { line, lineText };
}

function scanFile(filePath, deprecations) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hits = [];

  for (const dep of deprecations) {
    if (!content.includes(dep.symbol)) {
      continue;
    }
    if (dep.package && !content.includes(dep.package)) {
      continue;
    }
    const regex = new RegExp(`\\b${dep.symbol}\\b`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const { line, lineText } = findLineInfo(content, match.index);
      hits.push({
        symbol: dep.symbol,
        file: filePath,
        line,
        lineText,
        message: dep.message,
        alternative: dep.alternative,
        removalVersion: dep.removalVersion,
        docs: dep.docs
      });
    }
  }

  return hits;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(__dirname, 'deprecations.json');
  const config = readJson(configPath);
  const deprecations = config.deprecations || [];

  const files = listFiles(path.resolve(args.path));
  const results = [];

  for (const file of files) {
    results.push(...scanFile(file, deprecations));
  }

  const summary = {
    scannedFiles: files.length,
    totalFindings: results.length,
    findingsBySymbol: results.reduce((acc, item) => {
      acc[item.symbol] = (acc[item.symbol] || 0) + 1;
      return acc;
    }, {})
  };

  if (args.format === 'json') {
    const output = { summary, findings: results };
    const serialized = JSON.stringify(output, null, 2);
    if (args.out) {
      fs.writeFileSync(path.resolve(args.out), `${serialized}\n`);
    } else {
      console.log(serialized);
    }
    return;
  }

  console.log('[deprecations] scanned files:', summary.scannedFiles);
  console.log('[deprecations] total findings:', summary.totalFindings);

  for (const [symbol, count] of Object.entries(summary.findingsBySymbol)) {
    console.log(`[deprecations] ${symbol}: ${count} occurrence(s)`);
  }

  for (const finding of results) {
    console.log(`- ${finding.symbol} at ${finding.file}:${finding.line}`);
    console.log(`  ${finding.lineText}`);
    if (finding.alternative) {
      console.log(`  Use: ${finding.alternative}`);
    }
    if (finding.removalVersion) {
      console.log(`  Removal target: ${finding.removalVersion}`);
    }
    if (finding.docs) {
      console.log(`  Docs: ${finding.docs}`);
    }
  }

  if (args.out) {
    const output = { summary, findings: results };
    fs.writeFileSync(path.resolve(args.out), `${JSON.stringify(output, null, 2)}\n`);
  }
}

main();
