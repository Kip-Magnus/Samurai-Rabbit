#!/usr/bin/env node
'use strict';

/**
 * SAMURAI USAGI — Validate All Books
 * Discovers every book-XX directory in data/books/ and runs the validator on each.
 *
 * Usage: node tools/validate-all.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOOKS_DIR = path.resolve(__dirname, '..', 'data', 'books');
const VALIDATOR = path.resolve(__dirname, 'validate.js');

function main() {
  console.log('\n\x1b[1m═══ SAMURAI USAGI — VALIDATE ALL BOOKS ═══\x1b[0m\n');

  if (!fs.existsSync(BOOKS_DIR)) {
    console.log('\x1b[31m❌ data/books/ directory not found\x1b[0m\n');
    process.exit(1);
  }

  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
  const bookDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('book-'))
    .map((e) => e.name)
    .sort();

  if (bookDirs.length === 0) {
    console.log('\x1b[33m⚠️  No book directories found in data/books/\x1b[0m\n');
    process.exit(1);
  }

  console.log(`Found ${bookDirs.length} book(s): ${bookDirs.join(', ')}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const dir of bookDirs) {
    const bookPath = path.join(BOOKS_DIR, dir);
    const divider = '\u2500'.repeat(50);

    console.log(`\x1b[1m\x1b[36m${divider}\x1b[0m`);
    console.log(`\x1b[1m  Validating: ${dir}\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m${divider}\x1b[0m`);

    try {
      const output = execSync(
        `node "${VALIDATOR}" "${bookPath}"`,
        { encoding: 'utf8', stdio: 'pipe' },
      );
      console.log(output);
      totalPassed++;
      results.push({ book: dir, status: 'PASS' });
    } catch (e) {
      if (e.stdout) {
        console.log(e.stdout);
      }
      if (e.stderr) {
        console.error(e.stderr);
      }
      totalFailed++;
      results.push({ book: dir, status: 'FAIL' });
    }
  }

  // Final summary
  console.log('\n\x1b[1m═══ ALL BOOKS SUMMARY ═══\x1b[0m\n');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '\x1b[32m\u2705\x1b[0m' : '\x1b[31m\u274c\x1b[0m';
    console.log(`  ${icon} ${r.book} \u2014 ${r.status}`);
  }

  console.log('');

  if (totalFailed === 0) {
    console.log(
      `  \x1b[32m\x1b[1mALL ${totalPassed} BOOK(S) PASSED \u271d\x1b[0m\n`,
    );
    process.exit(0);
  } else {
    console.log(
      `  \x1b[31m\x1b[1m${totalFailed} FAILED\x1b[0m, ` +
      `\x1b[32m${totalPassed} passed\x1b[0m\n`,
    );
    process.exit(1);
  }
}

main();
