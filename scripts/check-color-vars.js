#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

const hexRegex = /#[0-9a-fA-F]{3,6}/g;
const disallowedTailwindRegex = /text-[a-z]+-(?:50|100|200|300|400|500|600|700|800|900)|bg-[a-z]+-(?:50|100|200|300|400|500|600|700|800|900)|border-[a-z]+-(?:50|100|200|300|400|500|600|700|800|900)/g;

const ignoredFiles = new Set([
  path.join(srcDir, 'app', 'globals.css'),
  path.join(srcDir, 'lib', 'theme.ts'),
]);

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      if (/\.(js|jsx|ts|tsx|css|scss|less|json)$/.test(entry.name)) {
        files.push(full);
      }
    }
  }
}

walk(srcDir);

let found = false;
for (const f of files) {
  if (ignoredFiles.has(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const hexMatches = content.match(hexRegex);
  const twMatches = content.match(disallowedTailwindRegex);
  if (hexMatches || twMatches) {
    console.log(`File: ${path.relative(root, f)}`);
    if (hexMatches) console.log(`  Hex colors: ${[...new Set(hexMatches)].join(', ')}`);
    if (twMatches) console.log(`  Tailwind classes: ${[...new Set(twMatches)].join(', ')}`);
    found = true;
  }
}

if (found) {
  console.error('\nAborting: found hard-coded color values or Tailwind color utilities. Convert to CSS variables or the semantic Tailwind tokens.');
  process.exit(1);
} else {
  console.log('No raw hex or disallowed tailwind color classes found in src/');
  process.exit(0);
}
