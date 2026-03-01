#!/usr/bin/env node
'use strict';

/**
 * SAMURAI USAGI — JSON Syntax Checker
 * Validates that all .json files in data/ are syntactically valid.
 * Run before the main validator to catch parse errors early.
 *
 * Usage: node tools/check-json.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

let fileCount = 0;
let errorCount = 0;

function checkFile(filepath) {
  fileCount++;
  const rel = path.relative(path.resolve(__dirname, '..'), filepath);

  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    JSON.parse(raw);
    console.log(`  \x1b[32m✅\x1b[0m ${rel}`);
  } catch (e) {
    errorCount++;
    console.log(`  \x1b[31m❌\x1b[0m ${rel}`);
    console.log(`     ${e.message}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`\x1b[31m❌ Directory not found: ${dir}\x1b[0m`);
    process.exit(1);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      checkFile(full);
    }
  }
}

console.log('\n\x1b[1m═══ SAMURAI USAGI — JSON SYNTAX CHECK ═══\x1b[0m\n');

walkDir(DATA_DIR);

console.log(`\n\x1b[1m═══ RESULTS ═══\x1b[0m`);
console.log(`  Files checked: ${fileCount}`);

if (errorCount === 0) {
  console.log(`  \x1b[32m\x1b[1mALL JSON VALID ✝\x1b[0m\n`);
  process.exit(0);
} else {
  console.log(`  \x1b[31m\x1b[1m${errorCount} file(s) have syntax errors\x1b[0m\n`);
  process.exit(1);
}
