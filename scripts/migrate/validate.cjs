const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || '.');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORE = new Set(['node_modules', 'dist', 'coverage', '.git']);

const patterns = [
  { name: 'createLead', regex: /\bcreateLead\b/g },
  { name: 'getLead', regex: /\bgetLead\b/g },
  { name: 'listLeads', regex: /\blistLeads\b/g },
  { name: 'updateLead', regex: /\bupdateLead\b/g },
  { name: 'deleteLead', regex: /\bdeleteLead\b/g },
  { name: 'snake_case payloads', regex: /\b[first|last]_name\b|\blead_status\b/g }
];

const results = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(full, 'utf8');
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        results.push({ file: full, pattern: pattern.name });
      }
      pattern.regex.lastIndex = 0;
    }
  }
}

walk(root);

const total = results.length;
const score = Math.max(0, 100 - total * 5);

console.log('Migration validation results');
console.log('Path:', root);
console.log('Findings:', total);
console.log('Compatibility score:', `${score}%`);

const grouped = results.reduce((acc, item) => {
  acc[item.pattern] = acc[item.pattern] || 0;
  acc[item.pattern] += 1;
  return acc;
}, {});

for (const [pattern, count] of Object.entries(grouped)) {
  console.log(`- ${pattern}: ${count}`);
}

if (total > 0) {
  console.log('\nFiles:');
  for (const entry of results) {
    console.log(`- ${entry.file} (${entry.pattern})`);
  }
}
