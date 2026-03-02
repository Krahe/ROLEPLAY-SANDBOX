/**
 * Critical State Fingerprint Tests
 *
 * Tests the fingerprint system that captures critical game state
 * for GM verification and checkpoint validation.
 *
 * Run with: node --test test/fingerprint.test.js
 * Requires: npm run build (dist/ must exist)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '..', 'dist');

describe('Fingerprint Module Exports', () => {
  let fingerprint;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
  });

  it('exports extractCriticalState', () => {
    assert.ok(fingerprint.extractCriticalState, 'extractCriticalState should be exported');
    assert.strictEqual(typeof fingerprint.extractCriticalState, 'function');
  });

  it('exports generateFingerprint', () => {
    assert.ok(fingerprint.generateFingerprint, 'generateFingerprint should be exported');
    assert.strictEqual(typeof fingerprint.generateFingerprint, 'function');
  });

  it('exports formatFingerprintForGM', () => {
    assert.ok(fingerprint.formatFingerprintForGM, 'formatFingerprintForGM should be exported');
    assert.strictEqual(typeof fingerprint.formatFingerprintForGM, 'function');
  });

  it('exports compareCriticalState', () => {
    assert.ok(fingerprint.compareCriticalState, 'compareCriticalState should be exported');
    assert.strictEqual(typeof fingerprint.compareCriticalState, 'function');
  });
});

describe('Critical State Extraction', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('extracts critical state from initial state', () => {
    const state = createInitialState();
    const critical = fingerprint.extractCriticalState(state);

    assert.strictEqual(critical.turn, 1, 'Turn should be 1');
    assert.strictEqual(critical.act, 1, 'Act should be 1');
    assert.strictEqual(critical.blytheForm, 'HUMAN', 'Blythe should be HUMAN initially');
    assert.strictEqual(critical.bobForm, 'HUMAN', 'Bob should be HUMAN initially');
    assert.strictEqual(critical.secretRevealed, false, 'Secret should not be revealed initially');
    assert.strictEqual(critical.lifelinesRemaining, 3, 'Should have 3 lifelines');
  });

  it('captures transformation state correctly', () => {
    const state = createInitialState();

    // Simulate Blythe transformation
    state.npcs.blythe.transformationState = {
      form: 'VELOCIRAPTOR_JP',
      speechRetention: 'NONE',
      stats: {},
      abilities: {},
    };

    const critical = fingerprint.extractCriticalState(state);

    assert.strictEqual(critical.blytheForm, 'VELOCIRAPTOR_JP', 'Should capture Blythe form');
    assert.strictEqual(critical.blytheSpeech, 'NONE', 'Should capture Blythe speech retention');
  });

  it('captures revelation state correctly', () => {
    const state = createInitialState();
    state.flags.aliceKnowsTheSecret = true;
    state.npcs.bob.hasConfessedToALICE = true;

    const critical = fingerprint.extractCriticalState(state);

    assert.strictEqual(critical.secretRevealed, true, 'Secret should be revealed');
    assert.strictEqual(critical.bobConfessed, true, 'Bob should have confessed');
  });

  it('captures confrontation state correctly', () => {
    const state = createInitialState();
    state.flags.confrontationTriggered = true;
    state.flags.confrontationGraceTurns = 2;

    const critical = fingerprint.extractCriticalState(state);

    assert.strictEqual(critical.confrontationActive, true, 'Confrontation should be active');
    assert.strictEqual(critical.confrontationGraceTurns, 2, 'Grace turns should be 2');
  });
});

describe('Fingerprint Generation', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('generates fingerprint for initial state', () => {
    const state = createInitialState();
    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp, 'Fingerprint should be generated');
    assert.ok(typeof fp === 'string', 'Fingerprint should be a string');
    assert.ok(fp.includes('T1'), 'Fingerprint should include turn');
    assert.ok(fp.includes('A1'), 'Fingerprint should include act');
    assert.ok(fp.includes('BLY:H'), 'Fingerprint should show Blythe as HUMAN');
  });

  it('includes transformation abbreviations', () => {
    const state = createInitialState();
    state.npcs.blythe.transformationState = {
      form: 'VELOCIRAPTOR_JP',
      speechRetention: 'NONE',
    };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('BLY:VJP.N'), 'Should abbreviate VELOCIRAPTOR_JP as VJP and NONE as N');
  });

  it('includes Bob transformation when transformed', () => {
    const state = createInitialState();
    state.npcs.bob.transformationState = {
      form: 'COMPSOGNATHUS',
      speechRetention: 'PARTIAL',
    };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('BOB:COMP.P'), 'Should include Bob transformation');
  });

  it('marks critical suspicion', () => {
    const state = createInitialState();
    state.npcs.drM.suspicionScore = 9;

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('S9!'), 'Should mark critical suspicion with !');
  });

  it('includes SECRET flag when revealed', () => {
    const state = createInitialState();
    state.flags.aliceKnowsTheSecret = true;

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('SECRET'), 'Should include SECRET flag');
  });

  it('includes CONFRONT with grace turns', () => {
    const state = createInitialState();
    state.flags.confrontationTriggered = true;
    state.flags.confrontationGraceTurns = 2;

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('CONFRONT:2'), 'Should include CONFRONT with grace turns');
  });
});

describe('Critical State Comparison', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('identical states have no differences', () => {
    const state = createInitialState();
    const cs1 = fingerprint.extractCriticalState(state);
    const cs2 = fingerprint.extractCriticalState(state);

    const diffs = fingerprint.compareCriticalState(cs1, cs2);
    assert.strictEqual(diffs.length, 0, 'Identical states should have no differences');
  });

  it('detects transformation differences', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();
    state2.npcs.blythe.transformationState = { form: 'TYRANNOSAURUS' };

    const cs1 = fingerprint.extractCriticalState(state1);
    const cs2 = fingerprint.extractCriticalState(state2);

    const diffs = fingerprint.compareCriticalState(cs1, cs2);

    assert.ok(diffs.length > 0, 'Should detect differences');
    const formDiff = diffs.find(d => d.field === 'blytheForm');
    assert.ok(formDiff, 'Should detect blytheForm difference');
    assert.strictEqual(formDiff.expected, 'HUMAN');
    assert.strictEqual(formDiff.actual, 'TYRANNOSAURUS');
  });

  it('detects suspicion differences', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();
    state2.npcs.drM.suspicionScore = 7;

    const cs1 = fingerprint.extractCriticalState(state1);
    const cs2 = fingerprint.extractCriticalState(state2);

    const diffs = fingerprint.compareCriticalState(cs1, cs2);

    const suspicionDiff = diffs.find(d => d.field === 'suspicion');
    assert.ok(suspicionDiff, 'Should detect suspicion difference');
  });

  it('criticalStatesMatch returns correct boolean', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();

    const cs1 = fingerprint.extractCriticalState(state1);
    const cs2 = fingerprint.extractCriticalState(state2);

    assert.strictEqual(fingerprint.criticalStatesMatch(cs1, cs2), true, 'Same states should match');

    state2.npcs.drM.suspicionScore = 7;
    const cs3 = fingerprint.extractCriticalState(state2);

    assert.strictEqual(fingerprint.criticalStatesMatch(cs1, cs3), false, 'Different states should not match');
  });
});

describe('GM Prompt Formatting', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('formats fingerprint for GM prompt', () => {
    const state = createInitialState();
    const formatted = fingerprint.formatFingerprintForGM(state);

    assert.ok(formatted.includes('STATE FINGERPRINT'), 'Should include header');
    assert.ok(formatted.includes('```'), 'Should include code block');
    assert.ok(formatted.includes('T1'), 'Should include fingerprint');
  });

  it('generates expanded fingerprint for debugging', () => {
    const state = createInitialState();
    state.npcs.blythe.transformationState = {
      form: 'VELOCIRAPTOR_JP',
      speechRetention: 'PARTIAL',
    };
    state.flags.aliceKnowsTheSecret = true;

    const expanded = fingerprint.generateExpandedFingerprint(state);

    assert.ok(expanded.includes('CRITICAL STATE FINGERPRINT'), 'Should have header');
    assert.ok(expanded.includes('VELOCIRAPTOR_JP'), 'Should show full form name');
    assert.ok(expanded.includes('Secret Known: YES'), 'Should show revelation state');
  });
});

describe('Checkpoint Round-Trip (Fingerprint Preservation)', () => {
  let fingerprint;
  let views;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    views = await import(join(distPath, 'state', 'views.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('critical state survives checkpoint round-trip (basic)', () => {
    const state = createInitialState();
    const originalCritical = fingerprint.extractCriticalState(state);

    // Compress and decompress
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);

    // Extract critical state from restored
    // Note: decompressCheckpoint returns Partial<FullGameState>, so some fields may be undefined
    // We need to handle this gracefully
    const restoredCritical = fingerprint.extractCriticalState(restored);

    // Compare key fields that MUST survive
    assert.strictEqual(restoredCritical.turn, originalCritical.turn, 'Turn should survive');
    assert.strictEqual(restoredCritical.act, originalCritical.act, 'Act should survive');
    assert.strictEqual(restoredCritical.suspicion, originalCritical.suspicion, 'Suspicion should survive');
    assert.strictEqual(restoredCritical.accessLevel, originalCritical.accessLevel, 'Access level should survive');
  });

  it('transformation state survives checkpoint round-trip', () => {
    const state = createInitialState();

    // Set up a transformation
    state.npcs.blythe.transformationState = {
      form: 'VELOCIRAPTOR_JP',
      speechRetention: 'NONE',
      stats: { dexterity: 2, combat: 3 },
      abilities: { canFitThroughDoors: false },
    };

    const originalCritical = fingerprint.extractCriticalState(state);

    // Compress and decompress
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCritical = fingerprint.extractCriticalState(restored);

    // Blythe form should survive
    assert.strictEqual(restoredCritical.blytheForm, originalCritical.blytheForm,
      'Blythe form should survive checkpoint');
  });

  it('revelation flags survive checkpoint round-trip', () => {
    const state = createInitialState();
    state.flags.aliceKnowsTheSecret = true;
    state.npcs.bob.hasConfessedToALICE = true;

    const originalCritical = fingerprint.extractCriticalState(state);

    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCritical = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCritical.secretRevealed, originalCritical.secretRevealed,
      'Secret revealed should survive');
    assert.strictEqual(restoredCritical.bobConfessed, originalCritical.bobConfessed,
      'Bob confessed should survive');
  });
});

describe('Extended Critical State Fields', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('captures ARCHIMEDES countdown state', () => {
    const state = createInitialState();
    state.infrastructure.archimedes.status = 'CHARGING';
    state.infrastructure.archimedes.turnsUntilFiring = 5;
    state.infrastructure.archimedes.target = { city: 'LONDON' };

    const cs = fingerprint.extractCriticalState(state);

    assert.strictEqual(cs.archimedesStatus, 'CHARGING');
    assert.strictEqual(cs.archimedesTurnsUntilFiring, 5);
    assert.strictEqual(cs.archimedesTarget, 'LONDON');
  });

  it('captures ARCHIMEDES deadman switch state', () => {
    const state = createInitialState();
    state.infrastructure.archimedes.deadmanSwitch = { active: true };

    const cs = fingerprint.extractCriticalState(state);
    assert.strictEqual(cs.archimedesDeadmanActive, true);
  });

  it('captures Bob plot armor state', () => {
    const state = createInitialState();
    state.npcs.bob.hasPlotArmor = true;
    state.npcs.bob.fatesDodged = 3;

    const cs = fingerprint.extractCriticalState(state);

    assert.strictEqual(cs.bobPlotArmor, true);
    assert.strictEqual(cs.bobFatesDodged, 3);
  });

  it('captures Blythe containment state', () => {
    const state = createInitialState();
    state.infrastructure.containmentField = {
      active: true,
      subjects: ['BLYTHE'],
      integrityPercent: 100,
    };

    const cs = fingerprint.extractCriticalState(state);
    assert.strictEqual(cs.blytheInContainment, true);
  });

  it('captures alarm and lockdown state', () => {
    const state = createInitialState();
    state.lairEnvironment.alarmStatus = 'full-lair';
    state.infrastructure.blastDoors = {
      doors: {},
      emergencyLockdown: true,
    };

    const cs = fingerprint.extractCriticalState(state);

    assert.strictEqual(cs.alarmStatus, 'full-lair');
    assert.strictEqual(cs.emergencyLockdown, true);
  });

  it('captures reactor instability state', () => {
    const state = createInitialState();
    state.infrastructure.reactor = {
      outputPercent: 80,
      stable: false,
      cascadeRisk: 'CRITICAL',
      cascadeFactors: ['overload'],
      scramAvailable: true,
    };

    const cs = fingerprint.extractCriticalState(state);

    assert.strictEqual(cs.reactorStable, false);
    assert.strictEqual(cs.reactorCascadeRisk, 'CRITICAL');
  });

  it('captures additional clocks', () => {
    const state = createInitialState();
    state.clocks.blytheEscapeIdea = 3;
    state.clocks.civilianFlyby = 2;

    const cs = fingerprint.extractCriticalState(state);

    assert.strictEqual(cs.blytheEscapeIdea, 3);
    assert.strictEqual(cs.civilianFlyby, 2);
  });

  it('captures Blythe gadget charges', () => {
    const state = createInitialState();
    // blytheGadgets should already be initialized

    const cs = fingerprint.extractCriticalState(state);

    assert.ok(typeof cs.blytheMagnetCharges === 'number', 'Should have magnet charges');
    assert.ok(typeof cs.blytheLaserCharges === 'number', 'Should have laser charges');
  });
});

describe('Fingerprint Generation - Extended', () => {
  let fingerprint;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('includes ARCHIMEDES countdown in fingerprint', () => {
    const state = createInitialState();
    state.infrastructure.archimedes.status = 'CHARGING';
    state.infrastructure.archimedes.turnsUntilFiring = 3;
    state.infrastructure.archimedes.target = { city: 'TOKYO' };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('ARCH:TOKY:3!'), 'Should include ARCHIMEDES with countdown');
  });

  it('includes DEADMAN flag when active', () => {
    const state = createInitialState();
    state.infrastructure.archimedes.deadmanSwitch = { active: true };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('DEADMAN'), 'Should include DEADMAN flag');
  });

  it('includes Bob plot armor in fingerprint', () => {
    const state = createInitialState();
    state.npcs.bob.hasPlotArmor = true;
    state.npcs.bob.fatesDodged = 2;

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('BOB:H.PA2'), 'Should include Bob plot armor with fates dodged');
  });

  it('includes alarm status when not quiet', () => {
    const state = createInitialState();
    state.lairEnvironment.alarmStatus = 'full-lair';

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('ALARM:FULL'), 'Should include full alarm');
  });

  it('includes LOCKDOWN flag when active', () => {
    const state = createInitialState();
    state.infrastructure.blastDoors = {
      doors: {},
      emergencyLockdown: true,
    };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('LOCKDOWN'), 'Should include lockdown flag');
  });

  it('includes reactor cascade risk', () => {
    const state = createInitialState();
    state.infrastructure.reactor = {
      outputPercent: 80,
      stable: false,
      cascadeRisk: 'HIGH',
      cascadeFactors: [],
      scramAvailable: true,
    };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('RX:HIGH'), 'Should include reactor cascade risk');
  });

  it('includes additional clocks when set', () => {
    const state = createInitialState();
    state.clocks.blytheEscapeIdea = 4;
    state.clocks.civilianFlyby = 2;

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('ESC:4'), 'Should include escape idea clock');
    assert.ok(fp.includes('CIV:2'), 'Should include civilian flyby clock');
  });

  it('includes Blythe containment marker', () => {
    const state = createInitialState();
    state.infrastructure.containmentField = {
      active: true,
      subjects: ['BLYTHE'],
      integrityPercent: 100,
    };

    const fp = fingerprint.generateFingerprint(state);

    assert.ok(fp.includes('BLY:H.C'), 'Should include containment marker');
  });
});

describe('Checkpoint Round-Trip - Extended Fields', () => {
  let fingerprint;
  let views;
  let createInitialState;

  before(async () => {
    fingerprint = await import(join(distPath, 'state', 'fingerprint.js'));
    views = await import(join(distPath, 'state', 'views.js'));
    const init = await import(join(distPath, 'state', 'initialState.js'));
    createInitialState = init.createInitialState;
  });

  it('ARCHIMEDES status survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.infrastructure.archimedes.status = 'CHARGING';
    state.infrastructure.archimedes.turnsUntilFiring = 5;
    state.infrastructure.archimedes.target = { city: 'LONDON' };

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.archimedesStatus, original.archimedesStatus,
      'ARCHIMEDES status should survive');
    assert.strictEqual(restoredCs.archimedesTurnsUntilFiring, original.archimedesTurnsUntilFiring,
      'ARCHIMEDES countdown should survive');
  });

  it('alarm status survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.lairEnvironment.alarmStatus = 'full-lair';

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.alarmStatus, original.alarmStatus,
      'Alarm status should survive');
  });

  it('confrontation state survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.flags.confrontationTriggered = true;
    state.flags.confrontationGraceTurns = 2;

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.confrontationActive, original.confrontationActive,
      'Confrontation active should survive');
    assert.strictEqual(restoredCs.confrontationGraceTurns, original.confrontationGraceTurns,
      'Confrontation grace turns should survive');
  });

  it('Blythe escape state survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.npcs.blythe.hasEscaped = true;

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.blytheEscaped, original.blytheEscaped,
      'Blythe escaped should survive');
  });

  it('Dr. M state flags survive checkpoint round-trip', () => {
    const state = createInitialState();
    state.flags.drMTransformed = true;
    state.flags.drMTransformedForm = 'TYRANNOSAURUS';

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.drMForm, original.drMForm,
      'Dr. M form should survive');
  });

  it('meltdown clock survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.clocks.meltdownClock = 5;

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.meltdownClock, original.meltdownClock,
      'Meltdown clock should survive');
  });

  it('lifelines remaining survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.emergencyLifelines.remaining = 1;
    state.emergencyLifelines.used = ['BASILISK_INTERVENTION', 'LUCKY_LADY'];

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.lifelinesRemaining, original.lifelinesRemaining,
      'Lifelines remaining should survive');
  });

  it('ray state survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.dinoRay.state = 'COOLDOWN';

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.rayState, original.rayState,
      'Ray state should survive');
  });

  it('Bob confession survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.npcs.bob.hasConfessedToALICE = true;

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.bobConfessed, original.bobConfessed,
      'Bob confessed should survive');
  });

  it('Alice confession to Dr. M survives checkpoint round-trip', () => {
    const state = createInitialState();
    state.flags.aliceConfessedDuringConfrontation = true;

    const original = fingerprint.extractCriticalState(state);
    const compressed = views.compressCheckpoint(state);
    const restored = views.decompressCheckpoint(compressed);
    const restoredCs = fingerprint.extractCriticalState(restored);

    assert.strictEqual(restoredCs.aliceConfessedToDrM, original.aliceConfessedToDrM,
      'Alice confessed to Dr. M should survive');
  });
});
