#!/usr/bin/env node
'use strict';

/**
 * SAMURAI USAGI — Validate All Books
 * Discovers every book-XX directory under data/books/ and runs
 * the main validator against each one in sequence.
 *
 * Usage: node tools/validate-all.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOOKS_DIR = path.resolve(__dirname, '..', 'data', 'books');
const VALIDATOR = path.resolve(__dirname, 'validate.js');

function main() {
  console.log('\n\x1b[1m═══ SAMURAI USAGI — VALIDATE ALL BOOKS ═══\x1b[0m\n');

  if (!fs.existsSync(BOOKS_DIR)) {
    console.log(`\x1b[31m❌ Books directory not found: ${BOOKS_DIR}\x1b[0m`);
    process.exit(1);
  }

  if (!fs.existsSync(VALIDATOR)) {
    console.log(`\x1b[31m❌ Validator not found: ${VALIDATOR}\x1b[0m`);
    process.exit(1);
  }

  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
  const bookDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('book-'))
    .map((e) => e.name)
    .sort();

  if (bookDirs.length === 0) {
    console.log('\x1b[33m⚠️  No book directories found under data/books/\x1b[0m\n');
    process.exit(0);
  }

  console.log(`Found ${bookDirs.length} book(s): ${bookDirs.join(', ')}\n`);

  let totalPass = 0;
  let totalFail = 0;
  const results = [];

  for (const dir of bookDirs) {
    const fullPath = path.join(BOOKS_DIR, dir);
    const separator = '─'.repeat(50);

    console.log(`\x1b[2m${separator}\x1b[0m`);

    try {
      const output = execSync(
        `node "${VALIDATOR}" "${fullPath}"`,
        { encoding: 'utf8', stdio: 'pipe' },
      );
      console.log(output);
      totalPass++;
      results.push({ book: dir, status: 'PASS' });
    } catch (e) {
      // Validator exits 1 on errors — still print output
      if (e.stdout) {
        console.log(e.stdout);
      }
      if (e.stderr) {
        console.error(e.stderr);
      }
      totalFail++;
      results.push({ book: dir, status: 'FAIL' });
    }
  }

  // Final summary
  console.log('\x1b[1m═══ ALL BOOKS SUMMARY ═══\x1b[0m\n');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
    console.log(`  ${icon} ${r.book} — ${r.status}`);
  }

  console.log('');

  if (totalFail === 0) {
    console.log(`  \x1b[32m\x1b[1mALL ${totalPass} BOOK(S) PASSED ✝\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(
      `  \x1b[31m\x1b[1m${totalFail} FAILED\x1b[0m, ` +
      `\x1b[32m${totalPass} passed\x1b[0m\n`,
    );
    process.exit(1);
  }
}

main();
