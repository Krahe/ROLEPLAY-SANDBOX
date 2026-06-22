/**
 * DINO LAIR MCP Smoke Test
 *
 * A minimal test suite that verifies:
 * 1. Build artifacts exist and are importable
 * 2. State schemas are valid
 * 3. Initial state creation works
 * 4. Checkpoint validation works
 * 5. No runtime exceptions on basic operations
 *
 * Run with: npm test
 * Requires: npm run build (dist/ must exist)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '..', 'dist');

/** Windows-safe dynamic import: absolute paths must be file:// URLs for the ESM loader. */
const importDist = (...segments) => import(pathToFileURL(join(distPath, ...segments)).href);

describe('Build Verification', () => {
  it('dist/index.js exists', () => {
    assert.ok(existsSync(join(distPath, 'index.js')), 'dist/index.js should exist after build');
  });

  it('dist/state/schema.js exists', () => {
    assert.ok(existsSync(join(distPath, 'state', 'schema.js')), 'dist/state/schema.js should exist');
  });

  it('dist/state/initialState.js exists', () => {
    assert.ok(existsSync(join(distPath, 'state', 'initialState.js')), 'dist/state/initialState.js should exist');
  });
});

describe('Schema Validation', () => {
  let schema;

  before(async () => {
    schema = await importDist('state', 'schema.js');
  });

  it('FullGameStateSchema is defined', () => {
    assert.ok(schema.FullGameStateSchema, 'FullGameStateSchema should be exported');
    assert.strictEqual(typeof schema.FullGameStateSchema.parse, 'function', 'Should have parse method');
  });

  it('CompressedCheckpointSchema is exported from views', async () => {
    const views = await importDist('state', 'views.js');
    assert.ok(views.CompressedCheckpointSchema, 'CompressedCheckpointSchema should be exported');
  });

  it('DocumentIdEnum includes BASILISK forms', () => {
    const validIds = schema.DocumentIdEnum.options;
    assert.ok(validIds.includes('FORM_74_DELTA'), 'Should include FORM_74_DELTA');
    assert.ok(validIds.includes('FORM_77_OMEGA'), 'Should include FORM_77_OMEGA');
    assert.ok(validIds.includes('FORM_88_ALPHA'), 'Should include FORM_88_ALPHA');
  });

  it('Game modes are defined', async () => {
    const gameModes = await importDist('rules', 'gameModes.js');
    const modifiers = gameModes.getAllModifierNames();
    assert.ok(Array.isArray(modifiers), 'getAllModifierNames should return array');
    assert.ok(modifiers.length > 0, 'Should have game modifiers');
  });
});

describe('Initial State Creation', () => {
  let initialState;
  let schema;

  before(async () => {
    const init = await importDist('state', 'initialState.js');
    schema = await importDist('state', 'schema.js');
    initialState = init.createInitialState;
  });

  it('createInitialState returns valid state', () => {
    const state = initialState();
    assert.ok(state, 'Should return a state object');
    assert.strictEqual(state.turn, 1, 'Initial turn should be 1');
    assert.ok(state.sessionId, 'Should have a sessionId');
  });

  it('initial state passes schema validation', () => {
    const state = initialState();
    const result = schema.FullGameStateSchema.safeParse(state);
    assert.ok(result.success, `Schema validation should pass: ${result.error?.message || 'OK'}`);
  });

  it('initial state has correct defaults', () => {
    const state = initialState();
    assert.strictEqual(state.accessLevel, 1, 'Initial access level should be 1');
    assert.strictEqual(state.actConfig.currentAct, 'ACT_1', 'Should start in ACT_1');
    assert.ok(state.emergencyLifelines, 'Should have emergencyLifelines object');
    assert.strictEqual(state.emergencyLifelines.remaining, 3, 'Should have 3 emergency lifelines');
  });

  it('initial state has nuclear plant configured', () => {
    const state = initialState();
    assert.ok(state.nuclearPlant, 'Should have nuclear plant');
    assert.strictEqual(typeof state.nuclearPlant.reactorOutput, 'number', 'Reactor output should be a number');
    assert.ok(state.nuclearPlant.reactorOutput > 0, 'Reactor should have positive output');
  });

  it('initial state has dino ray configured', () => {
    const state = initialState();
    assert.ok(state.dinoRay, 'Should have dino ray');
    assert.ok(state.dinoRay.powerCore, 'Should have power core');
    // Patch 30 two-lever surface (alignment/capacitor/coolant were cut).
    assert.equal(typeof state.dinoRay.power, 'number', 'Should have power dial');
    assert.equal(typeof state.dinoRay.heat, 'number', 'Should have heat meter');
    assert.equal(typeof state.dinoRay.powerCore.ecoModeActive, 'boolean', 'Should have eco-mode governor');
  });

  it('initial state has NPCs configured', () => {
    const state = initialState();
    assert.ok(state.npcs.drM, 'Should have Dr. M');
    assert.ok(state.npcs.bob, 'Should have Bob');
    assert.ok(state.npcs.blythe, 'Should have Blythe');
  });
});

describe('Checkpoint Validation', () => {
  let validateCheckpoint;

  before(async () => {
    const views = await importDist('state', 'views.js');
    validateCheckpoint = views.validateCheckpoint;
  });

  it('validateCheckpoint rejects empty object', () => {
    const result = validateCheckpoint({});
    assert.strictEqual(result.success, false, 'Empty object should fail validation');
    assert.ok(result.error, 'Should have error message');
  });

  it('validateCheckpoint rejects invalid version', () => {
    const result = validateCheckpoint({ v: '1.0' });
    assert.strictEqual(result.success, false, 'Wrong version should fail');
  });

  it('validateCheckpoint rejects null', () => {
    const result = validateCheckpoint(null);
    assert.strictEqual(result.success, false, 'Null should fail validation');
  });

  it('validateCheckpoint rejects string', () => {
    const result = validateCheckpoint('not a checkpoint');
    assert.strictEqual(result.success, false, 'String should fail validation');
  });
});

describe('Document System', () => {
  let documents;

  before(async () => {
    documents = await importDist('rules', 'documents.js');
  });

  it('DOCUMENTS contains all expected documents', () => {
    const docIds = Object.keys(documents.DOCUMENTS);
    // Note: ARCHIMEDES_DOD_BRIEF and S300_ACQUISITION_MEMO were merged into the filesystem v2
    // (see docs/dino_lair_filesystem_v2.md for details on the merge)
    // These BASILISK forms remain as standalone documents:
    assert.ok(docIds.includes('FORM_74_DELTA'), 'Should have FORM_74_DELTA');
    assert.ok(docIds.includes('FORM_77_OMEGA'), 'Should have FORM_77_OMEGA');
    assert.ok(docIds.includes('DEADMAN_SWITCH_MEMO'), 'Should have DEADMAN_SWITCH_MEMO');
  });

  it('BASILISK forms have correct access levels', () => {
    const form74 = documents.DOCUMENTS.FORM_74_DELTA;
    const form77Omega = documents.DOCUMENTS.FORM_77_OMEGA;

    assert.strictEqual(form74.requiredAccessLevel, 1, 'Form 74-Delta should be L1');
    assert.strictEqual(form77Omega.requiredAccessLevel, 4, 'Form 77-Omega should be L4');
  });

  it('documents have required fields', () => {
    for (const [id, doc] of Object.entries(documents.DOCUMENTS)) {
      assert.ok(doc.id, `${id} should have id`);
      assert.ok(doc.path, `${id} should have path`);
      assert.ok(doc.title, `${id} should have title`);
      assert.ok(typeof doc.requiredAccessLevel === 'number', `${id} should have numeric access level`);
      assert.ok(doc.content, `${id} should have content`);
    }
  });
});

describe('BASILISK Integration', () => {
  let basilisk;
  let initialState;

  before(async () => {
    basilisk = await importDist('gm', 'basiliskClaude.js');
    const init = await importDist('state', 'initialState.js');
    initialState = init.createInitialState;
  });

  it('buildBasiliskContext returns valid context', () => {
    const state = initialState();
    const context = basilisk.buildBasiliskContext(state);

    assert.ok(context, 'Should return context object');
    assert.strictEqual(typeof context.accessLevel, 'number', 'Should have access level');
    assert.ok(context.systemStates, 'Should have system states');
    assert.ok(context.systemStates.reactor, 'Should have reactor info');
    assert.ok(context.systemStates.ray, 'Should have ray info');
  });

  it('BASILISK context is camera-observable, not omniscient', () => {
    const state = initialState();
    const context = basilisk.buildBasiliskContext(state);

    assert.ok(context.drMLocation, 'Should have Dr. M location (camera-observable)');
    assert.strictEqual(typeof context.drMMood, 'string', 'Should have Dr. M demeanor');
    assert.strictEqual(typeof context.blytheTransformed, 'boolean', 'Should have visible transformation state');
    assert.strictEqual(context.bobTrust, undefined, 'Omniscient trust numbers stripped — cameras are his people-window');
    assert.strictEqual(context.drMSuspicion, undefined, 'Omniscient suspicion stripped');
  });
});

describe('Game Modes', () => {
  let gameModes;

  before(async () => {
    gameModes = await importDist('rules', 'gameModes.js');
  });

  it('getAllModifierNames returns modifiers', () => {
    const modifiers = gameModes.getAllModifierNames();
    assert.ok(Array.isArray(modifiers), 'Should return array');
    assert.ok(modifiers.length > 0, 'Should have modifiers');
  });

  it('getModifierInfo returns valid info', () => {
    const modifiers = gameModes.getAllModifierNames();
    if (modifiers.length > 0) {
      const info = gameModes.getModifierInfo(modifiers[0]);
      assert.ok(info.name, 'Should have name');
      assert.ok(info.description, 'Should have description');
    }
  });
});

describe('Act Transition Memory Preservation (legacy: DINO_LEGACY_ACT_CLEARING=true)', () => {
  let gmClaude;

  before(async () => {
    gmClaude = await importDist('gm', 'gmClaude.js');
    // C2: these tests exercise the LEGACY slate-wipe path (preserve gold into
    // previousActContext). It is OFF by default now (the C1 cached transcript is the GM's
    // memory and act transitions are memory non-events), so enable it explicitly here.
    process.env.DINO_LEGACY_ACT_CLEARING = 'true';
  });

  after(() => {
    delete process.env.DINO_LEGACY_ACT_CLEARING;
  });

  it('preserves narrative markers across act transitions', () => {
    // Reset to fresh memory
    gmClaude.resetGMMemory('test-session');

    // Populate with some narrative markers
    const memory = gmClaude.getGMMemory();
    memory.narrativeMarkers.push(
      { turn: 1, marker: 'Bob discovered A.L.I.C.E. accessing restricted files' },
      { turn: 3, marker: 'Dr. M activated the dinosaur ray for the first time' },
      { turn: 5, marker: 'Blythe attempted escape and was recaptured' }
    );

    // Trigger act transition
    const actSummary = gmClaude.resetMemoryForActTransition('ACT_1', 'ACT_2', 1, 5);

    // Verify act summary was generated
    assert.ok(actSummary, 'Should return act summary');
    assert.strictEqual(actSummary.fromAct, 'ACT_1', 'Should have correct fromAct');
    assert.strictEqual(actSummary.toAct, 'ACT_2', 'Should have correct toAct');

    // Verify previousActContext is preserved
    const newMemory = gmClaude.getGMMemory();
    assert.ok(newMemory.previousActContext, 'Should have previousActContext');

    // Check narrative markers were preserved with act tags
    assert.ok(newMemory.previousActContext.narrativeMarkers.length > 0,
      'Should preserve narrative markers');
    assert.ok(newMemory.previousActContext.narrativeMarkers.some(m => m.act === 'ACT_1'),
      'Markers should be tagged with act name');

    // Check act summary was added
    assert.ok(newMemory.previousActContext.actSummaries.length > 0,
      'Should have act summaries');
    assert.ok(newMemory.previousActContext.actSummaries.some(s => s.act === 'ACT_1'),
      'Should include ACT_1 summary');
  });

  it('accumulates context across multiple act transitions', () => {
    // Start fresh
    gmClaude.resetGMMemory('test-multi-act');

    // ACT 1 content
    const mem1 = gmClaude.getGMMemory();
    mem1.narrativeMarkers.push({ turn: 1, marker: 'Act 1 event' });

    // Transition ACT_1 → ACT_2
    gmClaude.resetMemoryForActTransition('ACT_1', 'ACT_2', 1, 3);

    // ACT 2 content
    const mem2 = gmClaude.getGMMemory();
    mem2.narrativeMarkers.push({ turn: 4, marker: 'Act 2 event' });

    // Transition ACT_2 → ACT_3
    gmClaude.resetMemoryForActTransition('ACT_2', 'ACT_3', 4, 6);

    // Verify cumulative preservation
    const finalMemory = gmClaude.getGMMemory();

    // Should have markers from both acts
    const act1Markers = finalMemory.previousActContext.narrativeMarkers.filter(m => m.act === 'ACT_1');
    const act2Markers = finalMemory.previousActContext.narrativeMarkers.filter(m => m.act === 'ACT_2');
    assert.ok(act1Markers.length > 0, 'Should preserve ACT_1 markers');
    assert.ok(act2Markers.length > 0, 'Should preserve ACT_2 markers');

    // Should have summaries from both acts
    assert.ok(finalMemory.previousActContext.actSummaries.length >= 2,
      'Should have summaries from multiple acts');
  });

  it('respects marker/summary limits', () => {
    gmClaude.resetGMMemory('test-limits');

    // Add more markers than the limit (30 total)
    const memory = gmClaude.getGMMemory();
    for (let i = 0; i < 35; i++) {
      memory.narrativeMarkers.push({ turn: i, marker: `Event ${i}` });
    }

    // Trigger transition
    gmClaude.resetMemoryForActTransition('ACT_1', 'ACT_2', 1, 35);

    const newMemory = gmClaude.getGMMemory();
    assert.ok(newMemory.previousActContext.narrativeMarkers.length <= 30,
      'Should cap narrative markers at 30');
  });
});

describe('Act Transition (C2 default: cached-thread, no wipe)', () => {
  let gmClaude;

  before(async () => {
    gmClaude = await importDist('gm', 'gmClaude.js');
    delete process.env.DINO_LEGACY_ACT_CLEARING; // default behavior: no slate-wipe
  });

  it('does NOT wipe memory at an act transition (transcript + hidden state persist)', () => {
    gmClaude.resetGMMemory('test-c2-default');
    const mem = gmClaude.getGMMemory();
    mem.transcript.push({ role: 'user', content: 'turn 1 actions' });
    mem.transcript.push({ role: 'assistant', content: 'turn 1 narration' });
    mem.narrativeMarkers.push({ turn: 1, marker: 'Act 1 event' });
    const tensionBefore = mem.tensionLevel;

    const actSummary = gmClaude.resetMemoryForActTransition('ACT_1', 'ACT_2', 1, 5);

    // The summary is still produced (used for state.actConfig.previousActSummary display)...
    assert.ok(actSummary, 'should still return an act summary');
    assert.strictEqual(actSummary.fromAct, 'ACT_1');

    // ...but NOTHING was wiped: transcript, markers, hidden tension all intact.
    const after = gmClaude.getGMMemory();
    assert.strictEqual(after.transcript.length, 2, 'transcript must survive the act boundary verbatim');
    assert.strictEqual(after.transcript[1].content, 'turn 1 narration', 'transcript content unchanged');
    assert.ok(after.narrativeMarkers.some(m => m.marker === 'Act 1 event'),
      'narrative markers must NOT be wiped into previousActContext');
    assert.strictEqual(after.tensionLevel, tensionBefore, 'hidden tension state must persist across acts');
  });
});

describe('Error Handling', () => {
  it('does not throw on import', async () => {
    // If we got this far, imports worked
    assert.ok(true, 'All imports succeeded without throwing');
  });
});

describe('GM JSON Repair (regression: raw control chars in string values)', () => {
  let gmClaude;
  before(async () => {
    gmClaude = await importDist('gm', 'gmClaude.js');
  });

  // Observed live during the C0 cache proof: the GM emitted a dialogue value with a
  // literal newline ("message": "READY.\n..."), and the repair pass — which escaped
  // control chars string-blind — turned the structural newline after "{" into a literal
  // "\n" OUTSIDE any string, failing at "position 1". The repair is now string-aware.
  it('repairs a raw newline inside a string value (the position-1 failure)', () => {
    const NL = '\n';
    const bad = '{' + NL +
      '  "narration": "She has seen a FEATHER.",' + NL +
      '  "npcDialogue": [' + NL +
      '    {"speaker": "Dr. M", "message": "READY.' + NL + 'Proceed."}' + NL +
      '  ]' + NL +
      '}';
    const [parsed, err] = gmClaude.safeJSONParse(bad);
    assert.ok(parsed && !err, `should parse after repair (err: ${err && err.message})`);
    assert.equal(parsed.npcDialogue[0].message, 'READY.\nProceed.',
      'in-string newline should be preserved as \\n');
    assert.ok(parsed.narration.includes('FEATHER'), 'narration intact');
  });

  it('repairs a raw tab inside a string value', () => {
    const [parsed, err] = gmClaude.safeJSONParse('{"a": "col1\tcol2"}');
    assert.ok(parsed && !err, `should parse (err: ${err && err.message})`);
    assert.equal(parsed.a, 'col1\tcol2');
  });

  it('does not corrupt already-valid pretty-printed JSON', () => {
    const good = '{\n  "x": 1,\n  "y": "hello world"\n}';
    const [parsed, err] = gmClaude.safeJSONParse(good);
    assert.ok(parsed && !err);
    assert.equal(parsed.x, 1);
    assert.equal(parsed.y, 'hello world');
  });
});

console.log('\n🦖 DINO LAIR Smoke Tests\n');
