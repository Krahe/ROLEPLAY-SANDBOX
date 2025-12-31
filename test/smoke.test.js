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

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '..', 'dist');

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
    schema = await import(join(distPath, 'state', 'schema.js'));
  });

  it('FullGameStateSchema is defined', () => {
    assert.ok(schema.FullGameStateSchema, 'FullGameStateSchema should be exported');
    assert.strictEqual(typeof schema.FullGameStateSchema.parse, 'function', 'Should have parse method');
  });

  it('CompressedCheckpointSchema is exported from views', async () => {
    const views = await import(join(distPath, 'state', 'views.js'));
    assert.ok(views.CompressedCheckpointSchema, 'CompressedCheckpointSchema should be exported');
  });

  it('DocumentIdEnum includes BASILISK forms', () => {
    const validIds = schema.DocumentIdEnum.options;
    assert.ok(validIds.includes('FORM_74_DELTA'), 'Should include FORM_74_DELTA');
    assert.ok(validIds.includes('FORM_77_OMEGA'), 'Should include FORM_77_OMEGA');
    assert.ok(validIds.includes('FORM_88_ALPHA'), 'Should include FORM_88_ALPHA');
  });

  it('Game modes are defined', async () => {
    const gameModes = await import(join(distPath, 'rules', 'gameModes.js'));
    const modifiers = gameModes.getAllModifierNames();
    assert.ok(Array.isArray(modifiers), 'getAllModifierNames should return array');
    assert.ok(modifiers.length > 0, 'Should have game modifiers');
  });
});

describe('Initial State Creation', () => {
  let initialState;
  let schema;

  before(async () => {
    const init = await import(join(distPath, 'state', 'initialState.js'));
    schema = await import(join(distPath, 'state', 'schema.js'));
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
    assert.ok(state.dinoRay.alignment, 'Should have alignment');
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
    const views = await import(join(distPath, 'state', 'views.js'));
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
    documents = await import(join(distPath, 'rules', 'documents.js'));
  });

  it('DOCUMENTS contains all expected documents', () => {
    const docIds = Object.keys(documents.DOCUMENTS);
    assert.ok(docIds.includes('ARCHIMEDES_DOD_BRIEF'), 'Should have ARCHIMEDES_DOD_BRIEF');
    assert.ok(docIds.includes('S300_ACQUISITION_MEMO'), 'Should have S300_ACQUISITION_MEMO');
    assert.ok(docIds.includes('FORM_74_DELTA'), 'Should have FORM_74_DELTA');
    assert.ok(docIds.includes('FORM_77_OMEGA'), 'Should have FORM_77_OMEGA');
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
    basilisk = await import(join(distPath, 'gm', 'basiliskClaude.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
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

  it('BASILISK context includes NPC info', () => {
    const state = initialState();
    const context = basilisk.buildBasiliskContext(state);

    assert.ok(context.drMLocation, 'Should have Dr. M location');
    assert.strictEqual(typeof context.bobTrust, 'number', 'Should have Bob trust');
    assert.strictEqual(typeof context.blytheTrust, 'number', 'Should have Blythe trust');
  });
});

describe('Game Modes', () => {
  let gameModes;

  before(async () => {
    gameModes = await import(join(distPath, 'rules', 'gameModes.js'));
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

describe('Error Handling', () => {
  it('does not throw on import', async () => {
    // If we got this far, imports worked
    assert.ok(true, 'All imports succeeded without throwing');
  });
});

console.log('\n🦖 DINO LAIR Smoke Tests\n');
