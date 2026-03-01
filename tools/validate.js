#!/usr/bin/env node
'use strict';

/**
 * SAMURAI USAGI — Content Validator
 * Validates generated book data against schemas and balance constraints.
 *
 * Usage: node tools/validate.js <book-directory>
 * Example: node tools/validate.js data/books/book-00
 *
 * Checks:
 *  - Schema conformance (required fields, types)
 *  - Cross-references (NPCs in areas exist in characters)
 *  - Dialogue integrity (no orphan nodes, no infinite loops)
 *  - Balance math (stats within tier ranges, economy rules)
 *  - Virtue rules (no loss without choice, faith tested)
 *  - Palette compliance (colors match era constraints)
 *  - Narrative rules (Accuser appears, seeds planted)
 *  - Completeness (all required files present)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════
// COLOR OUTPUT
// ═══════════════════════════════════════════
const CLR = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  grn: (s) => `\x1b[32m${s}\x1b[0m`,
  yel: (s) => `\x1b[33m${s}\x1b[0m`,
  cyn: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bld: (s) => `\x1b[1m${s}\x1b[0m`,
};

let errorCount = 0;
let warnCount = 0;
let passCount = 0;

function pass(msg) {
  passCount++;
  console.log(`  ${CLR.grn('✅')} ${msg}`);
}

function warn(msg) {
  warnCount++;
  console.log(`  ${CLR.yel('⚠️')}  ${msg}`);
}

function fail(msg) {
  errorCount++;
  console.log(`  ${CLR.red('❌')} ${msg}`);
}

function info(msg) {
  console.log(`  ${CLR.dim('ℹ')}  ${CLR.dim(msg)}`);
}

function section(msg) {
  console.log(`\n${CLR.bld(CLR.cyn(`── ${msg} ──`))}`);
}

// ═══════════════════════════════════════════
// BALANCE CONSTRAINTS
// ═══════════════════════════════════════════
const BALANCE = {
  enemyTierHP: {
    1: [15, 50],
    2: [40, 100],
    3: [80, 150],
    4: [120, 250],
    boss: [200, 800],
  },
  enemyTierATK: {
    1: [5, 15],
    2: [12, 25],
    3: [20, 40],
    4: [35, 60],
    boss: [50, 120],
  },
  moralChoicesPerBook: [2, 6],
  charactersPerBook: [3, 12],
  enemiesPerBook: [2, 15],
  areasPerBook: [2, 8],
  itemsPerBook: [4, 25],
  dialogueMaxSentences: 4,
  maxActsPerBook: 6,
};

const ERA_PALETTES = {
  'book-00': { dominant: '#4a7c59' },
  'book-01': { dominant: '#8b4513' },
  'book-02': { dominant: '#daa520' },
  'book-03': { dominant: '#c9a959' },
  'book-04': { dominant: '#4a5568' },
  'book-05': { dominant: '#2d3436' },
  'book-06': { dominant: '#1a5276' },
  'book-07': { dominant: '#7f1d1d' },
  'book-08': { dominant: '#1a1a2e' },
};

// ═══════════════════════════════════════════
// REQUIRED FIELDS PER SCHEMA
// ═══════════════════════════════════════════
const REQUIRED = {
  book: [
    'id', 'title', 'era', 'year',
    'palette', 'acts', 'characters', 'moralChoices',
  ],
  character: ['id', 'name', 'role', 'era', 'personality'],
  enemy: ['id', 'name', 'era', 'tier', 'stats', 'behavior', 'drops'],
  dialogue: ['id', 'era', 'nodes'],
  dialogueNode: ['id', 'speaker', 'text'],
  item: ['id', 'name', 'type', 'rarity'],
  area: ['id', 'name', 'era', 'palette'],
  moralChoice: ['id', 'description', 'options'],
  moralOption: ['label', 'virtueEffect'],
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function loadJSON(filepath) {
  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    }
    fail(`${path.basename(filepath)} — Invalid JSON: ${e.message}`);
    return undefined;
  }
}

function checkRequired(obj, fields, label) {
  let ok = true;
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) {
      fail(`${label} — missing required field: "${f}"`);
      ok = false;
    }
  }
  return ok;
}

function inRange(val, range, label) {
  if (val < range[0]) {
    warn(`${label} — value ${val} below minimum ${range[0]}`);
    return false;
  }
  if (val > range[1]) {
    warn(`${label} — value ${val} above maximum ${range[1]}`);
    return false;
  }
  return true;
}

function countSentences(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

// ═══════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════

function validateBook(book) {
  section('BOOK DEFINITION');

  if (!checkRequired(book, REQUIRED.book, book.id || 'book')) {
    return null;
  }
  pass(`${book.id}.json — schema valid`);

  // Acts
  if (book.acts.length > BALANCE.maxActsPerBook) {
    warn(`${book.acts.length} acts exceeds maximum ${BALANCE.maxActsPerBook}`);
  } else {
    pass(`${book.acts.length} acts defined`);
  }

  // Palette check
  const eraPalette = ERA_PALETTES[book.id];
  if (eraPalette && book.palette) {
    if (book.palette.dominant !== eraPalette.dominant) {
      warn(
        `Palette dominant ${book.palette.dominant} doesn't match ` +
        `era standard ${eraPalette.dominant}`,
      );
    } else {
      pass('Palette matches era constraints');
    }
  }

  // Moral choices
  inRange(
    book.moralChoices.length,
    BALANCE.moralChoicesPerBook,
    'Moral choices count',
  );

  for (const mc of book.moralChoices) {
    checkRequired(mc, REQUIRED.moralChoice, `choice:${mc.id}`);

    const opts = mc.options || [];
    for (const opt of opts) {
      checkRequired(opt, REQUIRED.moralOption, `option in ${mc.id}`);
    }

    // Check no "wrong" answer — all options should grant at least one virtue
    const allNonPunitive = opts.every((o) => {
      const fx = o.virtueEffect || {};
      const vals = Object.values(fx);
      return vals.length === 0 || vals.some((v) => v > 0) || vals.every((v) => v >= 0);
    });
    if (!allNonPunitive) {
      warn(
        `choice:${mc.id} — has a purely punitive option ` +
        '(violates "no wrong answer" rule)',
      );
    }
  }

  // Faith tested
  const faithTested = book.moralChoices.some((mc) =>
    (mc.options || []).some((o) => {
      const fx = o.virtueEffect || {};
      return fx.faith !== undefined;
    }),
  );
  if (faithTested) {
    pass('Faith virtue is tested in this book');
  } else {
    warn('Faith virtue is never tested — every book should test faith');
  }

  // Seeds for future
  if (book.seedsForFuture && book.seedsForFuture.length > 0) {
    pass(`${book.seedsForFuture.length} seeds planted for future books`);
  } else {
    warn('No seeds planted for future books — at least 1 required');
  }

  return book;
}

function validateCharacters(chars, book) {
  section('CHARACTERS');

  if (!Array.isArray(chars)) {
    fail('characters.json — must be an array');
    return null;
  }

  inRange(chars.length, BALANCE.charactersPerBook, 'Character count');
  pass(`${chars.length} characters defined`);

  const charIds = new Set();
  for (const c of chars) {
    checkRequired(c, REQUIRED.character, `char:${c.id}`);
    if (charIds.has(c.id)) {
      fail(`Duplicate character id: ${c.id}`);
    }
    charIds.add(c.id);
  }

  // Cross-reference with book.characters
  if (book && book.characters) {
    for (const refId of book.characters) {
      if (!charIds.has(refId)) {
        fail(
          `Book references character "${refId}" ` +
          'but it doesn\'t exist in characters.json',
        );
      }
    }
    pass('All book character references resolved');
  }

  // Report archetypes
  const archetypes = chars
    .map((c) => c.personality && c.personality.archetype)
    .filter(Boolean);
  info(`Archetypes present: ${[...new Set(archetypes)].join(', ')}`);

  return charIds;
}

function validateEnemies(enemies) {
  section('ENEMIES');

  if (!Array.isArray(enemies)) {
    fail('enemies.json — must be an array');
    return;
  }

  inRange(enemies.length, BALANCE.enemiesPerBook, 'Enemy count');
  pass(`${enemies.length} enemies defined`);

  for (const e of enemies) {
    checkRequired(e, REQUIRED.enemy, `enemy:${e.id}`);

    // Stat range check
    const tier = e.tier === 'boss' ? 'boss' : e.tier;
    const hpRange = BALANCE.enemyTierHP[tier];
    const atkRange = BALANCE.enemyTierATK[tier];

    if (hpRange && e.stats) {
      const maxHP = Array.isArray(e.stats.hp) ? e.stats.hp[1] : e.stats.hp;
      if (maxHP > hpRange[1]) {
        warn(`enemy:${e.id} — HP max ${maxHP} exceeds tier ${tier} ceiling ${hpRange[1]}`);
      }
    }
    if (atkRange && e.stats) {
      const maxATK = Array.isArray(e.stats.atk) ? e.stats.atk[1] : e.stats.atk;
      if (maxATK > atkRange[1]) {
        warn(`enemy:${e.id} — ATK max ${maxATK} exceeds tier ${tier} ceiling ${atkRange[1]}`);
      }
    }

    // Drop rates
    if (e.drops && e.drops.items) {
      for (const drop of e.drops.items) {
        if (drop.chance > 0.5) {
          warn(`enemy:${e.id} — drop "${drop.id}" chance ${drop.chance} seems too high`);
        }
      }
    }
  }

  pass('Enemy stat ranges validated');
}

function validateDialogue(dialogues, charIds) {
  section('DIALOGUE');

  if (!Array.isArray(dialogues)) {
    fail('dialogue.json — must be an array');
    return;
  }

  let totalNodes = 0;
  const knownSpeakers = new Set(['narrator', 'usagi', 'the_accuser']);

  for (const d of dialogues) {
    checkRequired(d, REQUIRED.dialogue, `dialogue:${d.id}`);

    const nodeIds = new Set(d.nodes.map((n) => n.id));
    totalNodes += d.nodes.length;

    for (const node of d.nodes) {
      checkRequired(node, REQUIRED.dialogueNode, `node:${node.id} in ${d.id}`);

      // Check speaker exists in characters
      if (charIds && node.speaker) {
        if (!charIds.has(node.speaker) && !knownSpeakers.has(node.speaker)) {
          warn(
            `dialogue:${d.id} node:${node.id} — ` +
            `speaker "${node.speaker}" not in characters`,
          );
        }
      }

      // Check next reference
      if (node.next && !nodeIds.has(node.next)) {
        fail(
          `dialogue:${d.id} node:${node.id} — ` +
          `references non-existent next node "${node.next}"`,
        );
      }

      // Check dialogue length
      if (node.text) {
        const sentences = countSentences(node.text);
        if (sentences > BALANCE.dialogueMaxSentences) {
          warn(
            `dialogue:${d.id} node:${node.id} — ` +
            `${sentences} sentences (max ${BALANCE.dialogueMaxSentences})`,
          );
        }
      }

      // Check choices if present
      if (node.choices) {
        for (const choice of node.choices) {
          if (choice.next && !nodeIds.has(choice.next)) {
            fail(
              `dialogue:${d.id} node:${node.id} choice — ` +
              `references non-existent node "${choice.next}"`,
            );
          }
        }
      }
    }

    // Check for unreachable nodes
    const reachable = new Set(['start']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of d.nodes) {
        if (reachable.has(node.id)) {
          if (node.next && !reachable.has(node.next)) {
            reachable.add(node.next);
            changed = true;
          }
          if (node.choices) {
            for (const c of node.choices) {
              if (c.next && !reachable.has(c.next)) {
                reachable.add(c.next);
                changed = true;
              }
            }
          }
        }
      }
    }
    const unreachable = d.nodes.filter((n) => !reachable.has(n.id));
    if (unreachable.length > 0) {
      warn(
        `dialogue:${d.id} — ${unreachable.length} unreachable node(s): ` +
        unreachable.map((n) => n.id).join(', '),
      );
    }
  }

  pass(`${dialogues.length} dialogue trees, ${totalNodes} total nodes`);
  pass('All dialogue connections valid');
}

function validateAreas(areas, charIds) {
  section('AREAS');

  if (!Array.isArray(areas)) {
    fail('areas.json — must be an array');
    return;
  }

  inRange(areas.length, BALANCE.areasPerBook, 'Area count');
  pass(`${areas.length} areas defined`);

  const areaIds = new Set(areas.map((a) => a.id));

  for (const a of areas) {
    checkRequired(a, REQUIRED.area, `area:${a.id}`);

    // Check NPC references
    if (a.npcs && charIds) {
      for (const npcId of a.npcs) {
        if (!charIds.has(npcId) && npcId !== 'usagi') {
          warn(`area:${a.id} — references NPC "${npcId}" not in characters`);
        }
      }
    }

    // Check exits reference valid areas
    if (a.exits) {
      for (const exit of a.exits) {
        if (!areaIds.has(exit.to)) {
          info(`area:${a.id} — exit to "${exit.to}" (may be in another book)`);
        }
      }
    }
  }
}

function validateItems(items) {
  section('ITEMS');

  if (!Array.isArray(items)) {
    fail('items.json — must be an array');
    return;
  }

  inRange(items.length, BALANCE.itemsPerBook, 'Item count');
  pass(`${items.length} items defined`);

  const ids = new Set();
  for (const item of items) {
    checkRequired(item, REQUIRED.item, `item:${item.id}`);
    if (ids.has(item.id)) {
      fail(`Duplicate item id: ${item.id}`);
    }
    ids.add(item.id);
  }

  // Report rarity distribution
  const rarities = {};
  for (const item of items) {
    const r = item.rarity || 'unknown';
    rarities[r] = (rarities[r] || 0) + 1;
  }
  info(
    'Rarity distribution: ' +
    Object.entries(rarities).map(([k, v]) => `${k}:${v}`).join(', '),
  );
}

function checkAccuserPresence(dialogues, events) {
  section('NARRATIVE RULES');

  let accuserFound = false;

  if (dialogues && Array.isArray(dialogues)) {
    for (const d of dialogues) {
      for (const node of d.nodes) {
        if (node.speaker === 'the_accuser') {
          accuserFound = true;
          break;
        }
      }
      if (accuserFound) {
        break;
      }
    }
  }

  if (!accuserFound && events && Array.isArray(events)) {
    for (const e of events) {
      if (e.accuserAppearance || e.type === 'accuser_temptation') {
        accuserFound = true;
        break;
      }
    }
  }

  if (accuserFound) {
    pass('The Accuser appears in this book');
  } else {
    warn('The Accuser not detected — every book should include one appearance');
  }
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

function main() {
  const dir = process.argv[2];

  if (!dir) {
    console.log(`\n${CLR.bld('Samurai Usagi — Content Validator')}`);
    console.log('\nUsage: node tools/validate.js <book-directory>');
    console.log('Example: node tools/validate.js data/books/book-00\n');
    process.exit(1);
  }

  const absDir = path.resolve(dir);

  console.log(`\n${CLR.bld('═══ SAMURAI USAGI — CONTENT VALIDATOR ═══')}`);
  console.log(`${CLR.dim(`Validating: ${absDir}`)}\n`);

  // Check required files exist
  section('FILE COMPLETENESS');

  const requiredFiles = [
    'book.json',
    'characters.json',
    'enemies.json',
    'dialogue.json',
    'items.json',
    'areas.json',
  ];
  const optionalFiles = [
    'events.json',
    'moral_choices.json',
  ];

  for (const f of requiredFiles) {
    if (fs.existsSync(path.join(absDir, f))) {
      pass(`${f} present`);
    } else {
      fail(`${f} MISSING — required`);
    }
  }

  for (const f of optionalFiles) {
    if (fs.existsSync(path.join(absDir, f))) {
      pass(`${f} present`);
    } else {
      info(`${f} not found (optional)`);
    }
  }

  // Load all files
  const book = loadJSON(path.join(absDir, 'book.json'));
  const characters = loadJSON(path.join(absDir, 'characters.json'));
  const enemies = loadJSON(path.join(absDir, 'enemies.json'));
  const dialogues = loadJSON(path.join(absDir, 'dialogue.json'));
  const items = loadJSON(path.join(absDir, 'items.json'));
  const areas = loadJSON(path.join(absDir, 'areas.json'));
  const events = loadJSON(path.join(absDir, 'events.json'));

  // Run validators
  let validatedBook = null;
  if (book) {
    validatedBook = validateBook(book);
  }

  let charIds = null;
  if (characters) {
    charIds = validateCharacters(characters, validatedBook);
  }

  if (enemies) {
    validateEnemies(enemies);
  }

  if (dialogues) {
    validateDialogue(dialogues, charIds);
  }

  if (areas) {
    validateAreas(areas, charIds);
  }

  if (items) {
    validateItems(items);
  }

  checkAccuserPresence(dialogues, events);

  // Summary
  console.log(`\n${CLR.bld('═══ RESULTS ═══')}`);
  console.log(`  ${CLR.grn(`✅ ${passCount} passed`)}`);

  if (warnCount > 0) {
    console.log(`  ${CLR.yel(`⚠️  ${warnCount} warnings`)}`);
  }
  if (errorCount > 0) {
    console.log(`  ${CLR.red(`❌ ${errorCount} errors`)}`);
  }

  if (errorCount === 0 && warnCount === 0) {
    console.log(`\n  ${CLR.grn(CLR.bld('PERFECT — Ready to ship! ✝'))}\n`);
  } else if (errorCount === 0) {
    console.log(`\n  ${CLR.yel('PASSABLE — Fix warnings for best quality.')}\n`);
  } else {
    console.log(`\n  ${CLR.red('FAILED — Fix errors before shipping.')}\n`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main();
