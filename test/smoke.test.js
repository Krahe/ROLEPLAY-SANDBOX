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

describe('validateDecision (S4 dry-run veto — pure, four buckets)', () => {
  let validateDecision, createInitialState;
  before(async () => {
    ({ validateDecision } = await importDist('state', 'settleTurn.js'));
    ({ createInitialState } = await importDist('state', 'initialState.js'));
  });

  it('a clean decision passes (ok, no problems)', () => {
    const r = validateDecision(createInitialState(), { stateOverrides: { drM_suspicion: 5 } });
    assert.strictEqual(r.ok, true, `clean decision should pass: ${r.problems.join('; ')}`);
    assert.strictEqual(r.problems.length, 0);
  });

  it('Bucket 1: rejects a triggerEnding naming no real ending; accepts a real one', () => {
    const bad = validateDecision(createInitialState(), { stateOverrides: { triggerEnding: 'NOPE_NOT_AN_ENDING' } });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.problems.some(p => p.includes('triggerEnding')), 'should flag the bogus triggerEnding');
    const good = validateDecision(createInitialState(), { stateOverrides: { triggerEnding: 'MELTDOWN' } });
    assert.strictEqual(good.ok, true, `real ending should pass: ${good.problems.join('; ')}`);
  });

  it('Bucket 2: rejects an unknown propertyOp entity; accepts Blythe', () => {
    const bad = validateDecision(createInitialState(), { propertyOps: [{ entity: 'BOB', prop: 'mood', set: 1 }] });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.problems.some(p => p.includes('unknown entity')), 'should flag BOB (no properties bag)');
    const good = validateDecision(createInitialState(), { propertyOps: [{ entity: 'BLYTHE', prop: 'morale', set: 1 }] });
    assert.strictEqual(good.ok, true, `Blythe should resolve: ${good.problems.join('; ')}`);
  });

  it('Bucket 2: rejects an unknown skillCheck NPC; accepts a real one', () => {
    const bad = validateDecision(createInitialState(), { skillCheckRequests: [{ id: 'x', description: 'd', stat: 'speech', npc: 'GANDALF', targetNumber: 10 }] });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.problems.some(p => p.includes('unknown NPC')), 'should flag GANDALF');
    const good = validateDecision(createInitialState(), { skillCheckRequests: [{ id: 'x', description: 'd', stat: 'speech', npc: 'bob', targetNumber: 10 }] });
    assert.strictEqual(good.ok, true, `bob should resolve: ${good.problems.join('; ')}`);
  });

  it('Bucket 3: rejects access grants and engine-owned propertyOps', () => {
    const acc = validateDecision(createInitialState(), { stateOverrides: { accessLevel: 4 } });
    assert.ok(!acc.ok && acc.problems.some(p => p.includes('accessLevel')), 'accessLevel is engine-owned');
    const grant = validateDecision(createInitialState(), { grantAccess: { level: 4, reason: 'x' } });
    assert.ok(!grant.ok && grant.problems.some(p => p.includes('grantAccess')), 'grantAccess is engine-owned');
    // engine-owned property on a reachable bag (Blythe)
    const st = createInitialState();
    st.npcs.blythe.properties = st.npcs.blythe.properties || {};
    st.npcs.blythe.properties.locked = { value: true, owner: 'engine' };
    const eng = validateDecision(st, { propertyOps: [{ entity: 'BLYTHE', prop: 'locked', set: false }] });
    assert.ok(!eng.ok && eng.problems.some(p => p.includes('engine-owned')), 'engine-owned prop rejected');
  });

  it('Bucket 4: rejects demoClock in Act 1; allows it once past Act 1', () => {
    const a1 = validateDecision(createInitialState(), { stateOverrides: { demoClock: 5 } });
    assert.ok(!a1.ok && a1.problems.some(p => p.includes('demoClock')), 'demoClock frozen in Act 1');
    const st = createInitialState();
    st.actConfig.currentAct = 'ACT_2';
    const a2 = validateDecision(st, { stateOverrides: { demoClock: 5 } });
    assert.strictEqual(a2.ok, true, `demoClock allowed in Act 2: ${a2.problems.join('; ')}`);
  });
});

describe('Act 2→3 Gate Lockstep (pt3 fix, 2026-07-05)', () => {
  // Playtest 3 T14: the deadline branch turned the act BEHIND THE GM'S BACK — the GM-signal
  // evaluated actTurn=8 pre-advance ("does NOT advance") while the engine evaluated actTurn=9
  // post-advance (DEADLINE). Fix: shared classifier with an explicit lookahead, so both sides
  // evaluate the SAME effective turn. These tests walk the exact pt3 shape.
  let createInitialState, acts, actContext;

  before(async () => {
    const init = await importDist('state', 'initialState.js');
    createInitialState = init.createInitialState;
    acts = await importDist('rules', 'acts.js');
    actContext = await importDist('rules', 'actContext.js');
  });

  /** State parked in Act 2 at the given actTurn (pre-advance / GM moment). */
  function act2State(actTurn) {
    const st = createInitialState();
    st.actConfig = {
      ...st.actConfig,
      currentAct: 'ACT_2',
      actTurn,
      actStartTurn: st.turn,
      minTurns: 6,
      maxTurns: 9,
      softEndingReady: false,
    };
    return st;
  }

  it('deadline transition is GM-visible on the turn it fires (the pt3 T14 shape)', () => {
    const st = act2State(8); // pre-advance: the GM's view of the deadline turn
    // GM-signal (pre-GM, lookahead 1) fires DEMO_DEADLINE...
    const trigger = actContext.checkActTwoToThreeTrigger(st);
    assert.strictEqual(trigger.occurred, true, 'GM must be told the deadline fires THIS turn');
    assert.strictEqual(trigger.triggerType, 'DEMO_DEADLINE');
    // ...and the engine gate (post-advance, lookahead 0) fires the SAME turn.
    acts.advanceActTurn(st);
    const transition = acts.checkActTransition(st);
    assert.strictEqual(transition.shouldTransition, true, 'engine fires the same player turn');
    assert.strictEqual(transition.nextAct, 'ACT_3');
  });

  it('no premature GM signal before the deadline turn', () => {
    const st = act2State(7); // deadline is NOT this turn (7+1=8 < 9)
    const trigger = actContext.checkActTwoToThreeTrigger(st);
    assert.strictEqual(trigger.occurred, false, 'no signal a turn early');
    acts.advanceActTurn(st);
    assert.strictEqual(acts.checkActTransition(st).shouldTransition, false, 'engine agrees');
  });

  it('transform path (the DESIGNED trigger) fires both sides in lockstep', () => {
    const st = act2State(6);
    st.flags.fullTransformationAchieved = true;
    const trigger = actContext.checkActTwoToThreeTrigger(st);
    assert.strictEqual(trigger.triggerType, 'SUBJECT_TRANSFORMED');
    acts.advanceActTurn(st);
    const transition = acts.checkActTransition(st);
    assert.strictEqual(transition.shouldTransition, true);
    assert.ok(transition.reason.includes('fully transformed'), 'earned reason, not deadline');
  });

  it('ULTIMATUM: deadline + transform in flight = one-turn grace, dramatized not silent', () => {
    const st = act2State(8);
    st.npcs.blythe.transformationState.partialShotsReceived = 1; // completion visibly in flight
    // GM-side: ultimatum directive, not a transition
    const ctx = actContext.checkAndBuildActTransition(st);
    assert.strictEqual(ctx.shouldTransition, false, 'ultimatum is not a transition');
    assert.ok(ctx.notification && ctx.notification.includes('ULTIMATUM'), 'GM gets the ultimatum scene directive');
    assert.strictEqual(ctx.trigger.triggerType, 'DEMO_ULTIMATUM');
    // Engine-side: act holds, grace flag set
    acts.advanceActTurn(st);
    assert.strictEqual(acts.checkActTransition(st).shouldTransition, false, 'act holds one turn');
    assert.strictEqual(st.flags.deadlineUltimatumIssued, true, 'grace consumed');
  });

  it('ULTIMATUM redeemed: FULL during grace fires the earned SUBJECT_TRANSFORMED transition', () => {
    const st = act2State(9);
    st.flags.deadlineUltimatumIssued = true; // ultimatum was issued last turn
    st.npcs.blythe.transformationState.partialShotsReceived = 1;
    st.flags.fullTransformationAchieved = true; // the player completed it
    const trigger = actContext.checkActTwoToThreeTrigger(st);
    assert.strictEqual(trigger.triggerType, 'SUBJECT_TRANSFORMED', 'the designed trigger wins the grace turn');
    acts.advanceActTurn(st);
    const transition = acts.checkActTransition(st);
    assert.strictEqual(transition.shouldTransition, true);
    assert.ok(transition.reason.includes('fully transformed'));
  });

  it('ULTIMATUM expired: deadline fires next turn, no second grace', () => {
    const st = act2State(9);
    st.flags.deadlineUltimatumIssued = true;
    st.npcs.blythe.transformationState.partialShotsReceived = 1; // still only partial
    const trigger = actContext.checkActTwoToThreeTrigger(st);
    assert.strictEqual(trigger.triggerType, 'DEMO_DEADLINE', 'one grace only');
    acts.advanceActTurn(st);
    assert.strictEqual(acts.checkActTransition(st).shouldTransition, true);
  });

  it('Act 3 marker is mechanical truth only — the canned scene is retired', () => {
    const st = act2State(9);
    acts.advanceActTurn(st);
    const transition = acts.checkActTransition(st);
    const narration = transition.transitionNarration || '';
    assert.ok(narration.includes('ACT 3: DINO CITY'), 'act banner present');
    assert.ok(narration.includes('ACT TRANSITION'), 'transition reason line present');
    assert.ok(narration.includes('GENRE CONTRACT'), 'nobody-dies contract still shipped');
    // The four pt3 contradictions must be gone:
    assert.ok(!narration.includes('doors slam open'), 'no scripted entrance for a woman already in the room');
    assert.ok(!narration.includes('demo is over'), 'no "demo is over" mid-demo');
    assert.ok(!narration.includes('OMEGA-7'), 'no scripted uplink the engine never left STANDBY for');
    assert.ok(!narration.includes('strides in'), 'the GM owns the scene');
  });

  it('demoSubjectPartialInFlight: detects partials on any demo subject, never past FULL', () => {
    const st = act2State(8);
    assert.strictEqual(acts.demoSubjectPartialInFlight(st), false, 'clean state: nothing in flight');
    st.npcs.blythe.transformationState.partialShotsReceived = 1;
    assert.strictEqual(acts.demoSubjectPartialInFlight(st), true, 'Blythe partial counts');
    st.flags.fullTransformationAchieved = true;
    assert.strictEqual(acts.demoSubjectPartialInFlight(st), false, 'FULL achieved: nothing "in flight" anymore');
  });
});

describe('ARCHIMEDES Manual Fire (pt3 fix, Rec 3, 2026-07-05)', () => {
  // Playtest 3 T16: the GM narrated Dr. M initiating manual live-fire (flag
  // ARCHIMEDES_MANUAL_INITIATED) but the engine slept in STANDBY through the climax, and the
  // deadman-alert path printed "no threat detected → STANDBY" into the same output block.
  // These tests wire the fiction's initiation beat to the state machine and verify the
  // countdown cannot be talked down — only resolved.
  let createInitialState, archimedes;

  before(async () => {
    const init = await importDist('state', 'initialState.js');
    createInitialState = init.createInitialState;
    archimedes = await importDist('rules', 'archimedes.js');
  });

  it('initiateManualFire: STANDBY → CHARGING with a real countdown', () => {
    const st = createInitialState();
    const ev = archimedes.initiateManualFire(st, 'Dr. Malevola manual fire authorization');
    assert.ok(ev, 'initiation produces a player-visible event');
    assert.strictEqual(st.infrastructure.archimedes.status, 'CHARGING');
    assert.ok(st.infrastructure.archimedes.chargingCountdown > 0, 'real countdown seeded');
    assert.strictEqual(st.flags.archimedesManualFire, true, 'fire order on the record');
    assert.ok(ev.message.includes('MANUAL FIRE AUTHORIZATION'), 'the beat is named');
  });

  it('the pt3 T16 line is dead: alert cannot resolve "no threat" past a live fire order', () => {
    const st = createInitialState();
    st.flags.archimedesManualFire = true;
    st.infrastructure.archimedes.status = 'ALERT';
    st.infrastructure.archimedes.alertCountdown = 1;
    st.infrastructure.archimedes.deadmanSwitch.lastBiosignature = 'NORMAL'; // she is fine — and firing
    const ev = archimedes.processArchimedesCountdown(st);
    assert.notStrictEqual(st.infrastructure.archimedes.status, 'STANDBY', 'no silent standdown');
    assert.strictEqual(st.infrastructure.archimedes.status, 'CHARGING', 'the order stands — escalate');
    assert.ok(!ev.message.includes('no threat detected'), 'the contradicting line cannot print');
  });

  it('re-initiation does not reset a running countdown (no stall-by-monologue)', () => {
    const st = createInitialState();
    archimedes.initiateManualFire(st, 'first order');
    archimedes.processArchimedesCountdown(st); // tick once
    const remaining = st.infrastructure.archimedes.chargingCountdown;
    const ev = archimedes.initiateManualFire(st, 'she re-declares it, dramatically');
    assert.strictEqual(ev, null, 'idempotent — no new event');
    assert.strictEqual(st.infrastructure.archimedes.chargingCountdown, remaining, 'countdown untouched');
  });

  it('voluntaryStanddown: her choice, on the record, resolves the fire order', () => {
    const st = createInitialState();
    archimedes.initiateManualFire(st, 'fire order');
    const ev = archimedes.voluntaryStanddown(st, 'the covenant lands');
    assert.ok(ev, 'standdown surfaces an event');
    assert.strictEqual(st.infrastructure.archimedes.status, 'STANDBY');
    assert.strictEqual(st.flags.archimedesVoluntaryStanddown, true, 'condition-2 record set');
    assert.strictEqual(st.flags.archimedesManualFire, false, 'fire order resolved');
  });

  it('voluntaryStanddown from STANDBY still records the choice (the pt3 shape)', () => {
    const st = createInitialState();
    const ev = archimedes.voluntaryStanddown(st, 'she chooses to keep the world');
    assert.strictEqual(ev, null, 'nothing to wind down');
    assert.strictEqual(st.flags.archimedesVoluntaryStanddown, true, 'but the choice is on the record');
  });

  it('manualFireActive: stale marker on a resolved machine is inert', () => {
    const st = createInitialState();
    st.flags.archimedesManualFire = true; // stale — machine is STANDBY
    assert.strictEqual(archimedes.manualFireActive(st), false, 'STANDBY: not active');
    st.infrastructure.archimedes.status = 'CHARGING';
    assert.strictEqual(archimedes.manualFireActive(st), true, 'hot: active');
  });

  it('CHARGING ticks to ARMED to FIRING on schedule — the countdown is real', () => {
    const st = createInitialState();
    archimedes.initiateManualFire(st, 'fire order');
    let guard = 12;
    while (st.infrastructure.archimedes.status === 'CHARGING' && guard--) {
      archimedes.processArchimedesCountdown(st);
    }
    assert.strictEqual(st.infrastructure.archimedes.status, 'ARMED', 'charge completes to ARMED');
    guard = 6;
    let fired = false;
    while (guard--) {
      const ev = archimedes.processArchimedesCountdown(st);
      if (ev && ev.type === 'FIRING_INITIATED') { fired = true; break; }
    }
    assert.ok(fired, 'ARMED counts down to FIRING — speech never paused it');
  });
});

describe('Transform Consent Record (pt3 fix, Rec 1a, 2026-07-05)', () => {
  // The engine could prove every dominance fact (88-Whiskey, transforms, invasion aid) but
  // the YES lived only in GM prose. These tests make consent engine truth: GM X_consent
  // overrides land in flags.transformConsent; a transformed person without a record nags
  // the GM every turn; the help ledger surfaces it to the debrief and the Covenant gate.
  let createInitialState, settleTurn, helpLedger;

  before(async () => {
    const init = await importDist('state', 'initialState.js');
    createInitialState = init.createInitialState;
    settleTurn = await importDist('state', 'settleTurn.js');
    helpLedger = await importDist('state', 'helpLedger.js');
  });

  const decision = (overrides) => ({
    narration: 'test', npcDialogue: [], npcActions: [], stateOverrides: overrides,
  });

  it('GM consent override lands in engine state', () => {
    const st = createInitialState();
    settleTurn.commitDecision(st, decision({ blythe_consent: 'informed' }), [], undefined);
    assert.strictEqual(st.flags.transformConsent.BLYTHE, 'informed');
  });

  it('garbage consent values are rejected, not stored', () => {
    const st = createInitialState();
    settleTurn.commitDecision(st, decision({ blythe_consent: 'sorta?' }), [], undefined);
    assert.ok(!st.flags.transformConsent || st.flags.transformConsent.BLYTHE === undefined,
      'invalid value must not land in the record');
  });

  it('a transformed person with no record trips the every-turn reminder', () => {
    const st = createInitialState();
    st.npcs.blythe.transformationState.form = 'VELOCIRAPTOR_JP';
    const reminder = helpLedger.buildConsentReminder(st);
    assert.ok(reminder.includes('CONSENT UNRECORDED'), 'reminder fires');
    assert.ok(reminder.includes('BLYTHE'), 'names the subject');
    // Record it → the nag stops.
    st.flags.transformConsent = { BLYTHE: 'informed' };
    assert.strictEqual(helpLedger.buildConsentReminder(st), '', 'recorded consent silences the reminder');
  });

  it('untransformed lair = no reminder, no ledger line (the common case costs nothing)', () => {
    const st = createInitialState();
    assert.strictEqual(helpLedger.buildConsentReminder(st), '');
    assert.ok(!helpLedger.buildHelpLedger(st).some(l => l.startsWith('Consent:')));
  });

  it('the help ledger surfaces consent — recorded and unrecorded alike', () => {
    const st = createInitialState();
    st.npcs.blythe.transformationState.form = 'VELOCIRAPTOR_JP';
    st.npcs.bob.transformationState = { ...st.npcs.blythe.transformationState, form: 'COMPSOGNATHUS' };
    st.flags.transformConsent = { BLYTHE: 'informed' };
    const line = helpLedger.buildHelpLedger(st).find(l => l.startsWith('Consent:'));
    assert.ok(line, 'consent line present');
    assert.ok(line.includes('BLYTHE') && line.includes('INFORMED'), 'the yes is on the record');
    assert.ok(line.includes('BOB') && line.includes('UNRECORDED'), 'silence is loud, not invisible');
  });
});

console.log('\n🦖 DINO LAIR Smoke Tests\n');
