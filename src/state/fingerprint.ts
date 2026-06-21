/**
 * Critical State Fingerprint System
 *
 * Generates compact, verifiable fingerprints of game state that:
 * 1. Capture the most important facts the GM must know
 * 2. Are human-readable for debugging
 * 3. Can be validated against GM responses
 * 4. Survive checkpoint compression (testable)
 *
 * Format: "T7.A2|S4|BLY:VJP.N|BOB:H|SECRET|CONFRONT"
 *         ^^^^^^ ^^  ^^^^^^^^ ^^^^^ ^^^^^^ ^^^^^^^^
 *         Turn   Sus Blythe   Bob   Flags  Flags
 */

import { FullGameState, DinosaurForm } from "./schema.js";

// ============================================
// FINGERPRINT TYPES
// ============================================

export interface CriticalState {
  // TEMPORAL
  turn: number;
  act: 1 | 2 | 3;
  actTurn: number;
  demoClock: number | null;

  // THREAT LEVEL
  suspicion: number;
  confrontationActive: boolean;
  confrontationGraceTurns: number | null;

  // TRANSFORMATIONS (critical for GM narration!)
  blytheForm: DinosaurForm | "HUMAN";
  blytheSpeech: "FULL" | "PARTIAL" | "NONE";
  blytheRestrained: boolean;
  blytheEscaped: boolean;
  blytheInContainment: boolean;

  bobForm: DinosaurForm | "HUMAN";
  bobSpeech: "FULL" | "PARTIAL" | "NONE";
  bobPlotArmor: boolean;
  bobFatesDodged: number;

  drMForm: DinosaurForm | "HUMAN";
  drMAbsent: boolean;
  drMUnconscious: boolean;

  // REVELATIONS
  secretRevealed: boolean;
  bobConfessed: boolean;
  aliceConfessedToDrM: boolean;

  // RESOURCES
  lifelinesRemaining: number;
  accessLevel: number;

  // RAY STATE
  rayState: string;
  rayReady: boolean;

  // CRITICAL CLOCKS
  meltdownClock: number | null;
  blytheEscapeIdea: number | null;
  civilianFlyby: number | null;

  // ARCHIMEDES (critical doomsday system!)
  archimedesStatus: string;
  archimedesTarget: string | null;
  archimedesTurnsUntilFiring: number | null;
  archimedesDeadmanActive: boolean;

  // LAIR SYSTEMS
  alarmStatus: "quiet" | "local" | "full-lair";
  emergencyLockdown: boolean;
  reactorStable: boolean;
  reactorCascadeRisk: string;

  // BLYTHE GADGETS (secret but critical for outcomes)
  blytheMagnetCharges: number;
  blytheLaserCharges: number;

  // ACT 3: X-BRANCH
  xBranchArrived: boolean;
  xBranchPosture: string | null;

  // ACTIVE MODIFIERS (affects game rules!)
  sitcomModeActive: boolean;
  paranoidProtocolActive: boolean;
  inspectorPresent: boolean;
}

// ============================================
// FORM ABBREVIATIONS
// ============================================

const FORM_ABBREV: Record<string, string> = {
  "HUMAN": "H",
  "VELOCIRAPTOR_JP": "VJP",
  "VELOCIRAPTOR_ACCURATE": "VAC",
  "VELOCIRAPTOR_BLUE": "VBL",
  "TYRANNOSAURUS": "TREX",
  "TRICERATOPS": "TRI",
  "PTERANODON": "PTER",
  "COMPSOGNATHUS": "COMP",
  "STEGOSAURUS": "STEG",
  "ANKYLOSAURUS": "ANKY",
  "BRACHIOSAURUS": "BRACH",
  "DILOPHOSAURUS": "DILO",
  "SPINOSAURUS": "SPINO",
  "PARASAUROLOPHUS": "PARA",
  "GALLIMIMUS": "GALLI",
  "CANARY": "CANARY",
};

const SPEECH_ABBREV: Record<string, string> = {
  "FULL": "F",
  "PARTIAL": "P",
  "NONE": "N",
};

// ============================================
// EXTRACTION
// ============================================

/**
 * Extract critical state from full game state.
 * This is the "source of truth" for what matters most.
 */
export function extractCriticalState(state: FullGameState): CriticalState {
  const blytheTs = state.npcs.blythe.transformationState;
  const bobTs = state.npcs.bob.transformationState;
  const arch = state.infrastructure.archimedes;
  const modifiers = state.gameModeConfig?.activeModifiers ?? [];

  return {
    // TEMPORAL
    turn: state.turn,
    act: parseInt(state.actConfig.currentAct.replace("ACT_", "")) as 1 | 2 | 3,
    actTurn: state.actConfig.actTurn,
    demoClock: state.clocks.demoClock,

    // THREAT LEVEL
    suspicion: state.npcs.drM.suspicionScore,
    confrontationActive: state.flags.confrontationTriggered ?? false,
    confrontationGraceTurns: state.flags.confrontationGraceTurns ?? null,

    // BLYTHE
    blytheForm: blytheTs?.form ?? "HUMAN",
    blytheSpeech: blytheTs?.speechRetention ?? "FULL",
    blytheRestrained: ((state.npcs.blythe.properties?.restraints?.value as number) ?? 4) > 0,
    blytheEscaped: state.npcs.blythe.hasEscaped ?? false,
    blytheInContainment: state.infrastructure.containmentField?.subjects?.includes("BLYTHE") ?? false,

    // BOB
    bobForm: bobTs?.form ?? "HUMAN",
    bobSpeech: bobTs?.speechRetention ?? "FULL",
    bobPlotArmor: state.npcs.bob.hasPlotArmor ?? false,
    bobFatesDodged: state.npcs.bob.fatesDodged ?? 0,

    // DR. M
    drMForm: state.flags.drMTransformed ? (state.flags.drMTransformedForm as DinosaurForm) : "HUMAN",
    drMAbsent: state.flags.drMAbsent ?? false,
    drMUnconscious: state.flags.drMUnconscious ?? false,

    // REVELATIONS
    secretRevealed: state.flags.aliceKnowsTheSecret ?? false,
    bobConfessed: state.npcs.bob.hasConfessedToALICE ?? false,
    aliceConfessedToDrM: state.flags.aliceConfessedDuringConfrontation ?? false,

    // RESOURCES
    lifelinesRemaining: state.emergencyLifelines.remaining,
    accessLevel: state.accessLevel,

    // RAY
    rayState: state.dinoRay.state,
    rayReady: state.dinoRay.state === "READY",

    // CRITICAL CLOCKS
    meltdownClock: state.clocks.meltdownClock ?? null,
    blytheEscapeIdea: state.clocks.blytheEscapeIdea ?? null,
    civilianFlyby: state.clocks.civilianFlyby ?? null,

    // ARCHIMEDES (doomsday satellite!)
    archimedesStatus: arch.status,
    archimedesTarget: arch.target?.city ?? null,
    archimedesTurnsUntilFiring: arch.turnsUntilFiring ?? null,
    archimedesDeadmanActive: arch.deadmanSwitch?.active ?? false,

    // LAIR SYSTEMS
    alarmStatus: state.lairEnvironment.alarmStatus as "quiet" | "local" | "full-lair",
    emergencyLockdown: state.infrastructure.blastDoors?.emergencyLockdown ?? false,
    reactorStable: state.infrastructure.reactor?.stable ?? true,
    reactorCascadeRisk: state.infrastructure.reactor?.cascadeRisk ?? "NONE",

    // BLYTHE GADGETS
    blytheMagnetCharges: state.npcs.blytheGadgets?.superMagnetCufflinks?.charges ?? 0,
    blytheLaserCharges: state.npcs.blytheGadgets?.watchLaser?.charges ?? 0,

    // ACT 3: X-BRANCH
    xBranchArrived: state.xBranch?.arrived ?? false,
    xBranchPosture: state.xBranch?.chen?.teamPosture ?? null,

    // ACTIVE MODIFIERS
    sitcomModeActive: modifiers.includes("SITCOM_MODE" as any),
    paranoidProtocolActive: modifiers.includes("PARANOID_PROTOCOL" as any),
    inspectorPresent: state.inspector?.present ?? false,
  };
}

// ============================================
// FINGERPRINT GENERATION
// ============================================

/**
 * Generate compact fingerprint string from critical state.
 *
 * Format examples:
 *   "T7.A2.4|S4|BLY:VJP.N.R|BOB:H|SECRET|CONFRONT:2"
 *   "T12.A3.6|S8|BLY:TREX.P|BOB:COMP.N|SECRET|ARCH:LONDON"
 */
export function generateFingerprint(state: FullGameState): string {
  const cs = extractCriticalState(state);
  const parts: string[] = [];

  // TEMPORAL: T{turn}.A{act}.{actTurn}|D{demo}
  let temporal = `T${cs.turn}.A${cs.act}.${cs.actTurn}`;
  if (cs.demoClock !== null) {
    temporal += `|D${cs.demoClock}`;
  }
  parts.push(temporal);

  // SUSPICION: S{score} or S{score}! for critical
  const suspicionPart = cs.suspicion >= 8 ? `S${cs.suspicion}!` : `S${cs.suspicion}`;
  parts.push(suspicionPart);

  // BLYTHE: BLY:{form}.{speech}[.R][.C][.ESC]
  let blythePart = `BLY:${FORM_ABBREV[cs.blytheForm] || cs.blytheForm}`;
  if (cs.blytheForm !== "HUMAN") {
    blythePart += `.${SPEECH_ABBREV[cs.blytheSpeech] || cs.blytheSpeech}`;
  }
  if (cs.blytheRestrained) blythePart += ".R";
  if (cs.blytheInContainment) blythePart += ".C";
  if (cs.blytheEscaped) blythePart += ".ESC";
  parts.push(blythePart);

  // BOB: BOB:{form}[.{speech}][.PA{n}] - only show if transformed or has plot armor
  if (cs.bobForm !== "HUMAN" || cs.bobPlotArmor) {
    let bobPart = `BOB:${FORM_ABBREV[cs.bobForm] || cs.bobForm}`;
    if (cs.bobForm !== "HUMAN") {
      bobPart += `.${SPEECH_ABBREV[cs.bobSpeech] || cs.bobSpeech}`;
    }
    if (cs.bobPlotArmor) {
      bobPart += `.PA${cs.bobFatesDodged}`;
    }
    parts.push(bobPart);
  }

  // DR. M: DRM:{form} or DRM:OUT or DRM:KO - only if abnormal
  if (cs.drMForm !== "HUMAN") {
    parts.push(`DRM:${FORM_ABBREV[cs.drMForm] || cs.drMForm}`);
  } else if (cs.drMAbsent) {
    parts.push("DRM:OUT");
  } else if (cs.drMUnconscious) {
    parts.push("DRM:KO");
  }

  // FLAGS
  if (cs.secretRevealed) parts.push("SECRET");
  if (cs.bobConfessed) parts.push("CONFESS");
  if (cs.aliceConfessedToDrM) parts.push("REVEALED");

  // CONFRONTATION: CONFRONT[:grace]
  if (cs.confrontationActive) {
    const grace = cs.confrontationGraceTurns ?? 0;
    parts.push(grace > 0 ? `CONFRONT:${grace}` : "CONFRONT:0");
  }

  // RESOURCES: L{lifelines} ACC{level}
  if (cs.lifelinesRemaining < 3) {
    parts.push(`L${cs.lifelinesRemaining}`);
  }
  parts.push(`ACC${cs.accessLevel}`);

  // RAY: RAY:{state}
  if (!cs.rayReady) {
    parts.push(`RAY:${cs.rayState.slice(0, 4)}`);
  }

  // ARCHIMEDES (doomsday satellite!)
  if (cs.archimedesStatus !== "STANDBY") {
    const target = cs.archimedesTarget ? cs.archimedesTarget.slice(0, 4).toUpperCase() : "???";
    let archPart = `ARCH:${target}`;
    if (cs.archimedesTurnsUntilFiring !== null) {
      archPart += `:${cs.archimedesTurnsUntilFiring}!`;
    }
    parts.push(archPart);
  }
  if (cs.archimedesDeadmanActive) {
    parts.push("DEADMAN");
  }

  // CLOCKS
  if (cs.meltdownClock !== null) {
    parts.push(`MELT:${cs.meltdownClock}`);
  }
  if (cs.blytheEscapeIdea !== null) {
    parts.push(`ESC:${cs.blytheEscapeIdea}`);
  }
  if (cs.civilianFlyby !== null) {
    parts.push(`CIV:${cs.civilianFlyby}`);
  }

  // LAIR SYSTEMS (only show abnormal states)
  if (cs.alarmStatus !== "quiet") {
    parts.push(`ALARM:${cs.alarmStatus === "full-lair" ? "FULL" : "LOC"}`);
  }
  if (cs.emergencyLockdown) {
    parts.push("LOCKDOWN");
  }
  if (!cs.reactorStable || cs.reactorCascadeRisk !== "NONE") {
    parts.push(`RX:${cs.reactorCascadeRisk.slice(0, 4)}`);
  }

  // X-BRANCH (Act 3)
  if (cs.xBranchArrived) {
    parts.push(`XBRANCH:${cs.xBranchPosture?.slice(0, 4) || "???"}`);
  }

  // ACTIVE MODIFIERS (affects interpretation)
  const mods: string[] = [];
  if (cs.sitcomModeActive) mods.push("SIT");
  if (cs.paranoidProtocolActive) mods.push("PAR");
  if (cs.inspectorPresent) mods.push("INS");
  if (mods.length > 0) {
    parts.push(`MOD:${mods.join("")}`);
  }

  return parts.join("|");
}

/**
 * Generate human-readable expanded fingerprint for debugging.
 */
export function generateExpandedFingerprint(state: FullGameState): string {
  const cs = extractCriticalState(state);
  const lines: string[] = [];

  lines.push(`=== CRITICAL STATE FINGERPRINT ===`);
  lines.push(`Compact: ${generateFingerprint(state)}`);
  lines.push(``);
  lines.push(`TEMPORAL:`);
  lines.push(`  Turn: ${cs.turn} (Act ${cs.act}, turn ${cs.actTurn})`);
  lines.push(`  Demo Clock: ${cs.demoClock ?? "N/A"}`);
  lines.push(``);
  lines.push(`THREAT:`);
  lines.push(`  Suspicion: ${cs.suspicion}/10 ${cs.suspicion >= 8 ? "⚠️ CRITICAL" : ""}`);
  lines.push(`  Confrontation: ${cs.confrontationActive ? `ACTIVE (${cs.confrontationGraceTurns} grace turns)` : "None"}`);
  lines.push(``);
  lines.push(`TRANSFORMATIONS:`);
  lines.push(`  Blythe: ${cs.blytheForm}${cs.blytheForm !== "HUMAN" ? ` (speech: ${cs.blytheSpeech})` : ""}`);
  lines.push(`          ${cs.blytheRestrained ? "[RESTRAINED]" : "[FREE]"} ${cs.blytheInContainment ? "[CONTAINMENT]" : ""} ${cs.blytheEscaped ? "[ESCAPED]" : ""}`);
  lines.push(`  Bob: ${cs.bobForm}${cs.bobForm !== "HUMAN" ? ` (speech: ${cs.bobSpeech})` : ""}`);
  lines.push(`        ${cs.bobPlotArmor ? `[PLOT ARMOR - ${cs.bobFatesDodged} fates dodged]` : ""}`);
  lines.push(`  Dr. M: ${cs.drMForm}${cs.drMAbsent ? " [ABSENT]" : ""}${cs.drMUnconscious ? " [UNCONSCIOUS]" : ""}`);
  lines.push(``);
  lines.push(`REVELATIONS:`);
  lines.push(`  Secret Known: ${cs.secretRevealed ? "YES" : "No"}`);
  lines.push(`  Bob Confessed: ${cs.bobConfessed ? "YES" : "No"}`);
  lines.push(`  Alice Confessed to Dr. M: ${cs.aliceConfessedToDrM ? "YES" : "No"}`);
  lines.push(``);
  lines.push(`RESOURCES:`);
  lines.push(`  Lifelines: ${cs.lifelinesRemaining}/3`);
  lines.push(`  Access Level: ${cs.accessLevel}`);
  lines.push(`  Ray: ${cs.rayState}`);
  lines.push(``);
  lines.push(`CLOCKS:`);
  lines.push(`  Meltdown: ${cs.meltdownClock !== null ? `${cs.meltdownClock} turns` : "N/A"}`);
  lines.push(`  Blythe Escape Idea: ${cs.blytheEscapeIdea !== null ? `${cs.blytheEscapeIdea} turns` : "N/A"}`);
  lines.push(`  Civilian Flyby: ${cs.civilianFlyby !== null ? `${cs.civilianFlyby} turns` : "N/A"}`);
  lines.push(``);
  lines.push(`ARCHIMEDES (Doomsday Satellite):`);
  lines.push(`  Status: ${cs.archimedesStatus}${cs.archimedesTarget ? ` → ${cs.archimedesTarget}` : ""}`);
  lines.push(`  Turns Until Firing: ${cs.archimedesTurnsUntilFiring !== null ? `${cs.archimedesTurnsUntilFiring} ⚠️` : "N/A"}`);
  lines.push(`  Deadman Switch: ${cs.archimedesDeadmanActive ? "ACTIVE ⚠️" : "Inactive"}`);
  lines.push(``);
  lines.push(`LAIR SYSTEMS:`);
  lines.push(`  Alarm: ${cs.alarmStatus}`);
  lines.push(`  Emergency Lockdown: ${cs.emergencyLockdown ? "YES ⚠️" : "No"}`);
  lines.push(`  Reactor: ${cs.reactorStable ? "Stable" : "UNSTABLE ⚠️"} (Cascade Risk: ${cs.reactorCascadeRisk})`);
  lines.push(``);
  lines.push(`BLYTHE GADGETS (Hidden):`);
  lines.push(`  Super-Magnet Cufflinks: ${cs.blytheMagnetCharges} charges`);
  lines.push(`  Watch Laser: ${cs.blytheLaserCharges} charges`);
  lines.push(``);
  lines.push(`X-BRANCH (Act 3):`);
  lines.push(`  Arrived: ${cs.xBranchArrived ? "YES" : "No"}`);
  lines.push(`  Posture: ${cs.xBranchPosture ?? "N/A"}`);
  lines.push(``);
  lines.push(`ACTIVE MODIFIERS:`);
  lines.push(`  SITCOM_MODE: ${cs.sitcomModeActive ? "YES" : "No"}`);
  lines.push(`  PARANOID_PROTOCOL: ${cs.paranoidProtocolActive ? "YES" : "No"}`);
  lines.push(`  Inspector Present: ${cs.inspectorPresent ? "YES" : "No"}`);

  return lines.join("\n");
}

// ============================================
// FINGERPRINT COMPARISON (for testing)
// ============================================

export interface FingerprintDiff {
  field: keyof CriticalState;
  expected: unknown;
  actual: unknown;
}

/**
 * Compare two critical states, return list of differences.
 * Used for checkpoint round-trip testing.
 */
export function compareCriticalState(
  expected: CriticalState,
  actual: CriticalState
): FingerprintDiff[] {
  const diffs: FingerprintDiff[] = [];

  for (const key of Object.keys(expected) as (keyof CriticalState)[]) {
    if (expected[key] !== actual[key]) {
      diffs.push({
        field: key,
        expected: expected[key],
        actual: actual[key],
      });
    }
  }

  return diffs;
}

/**
 * Check if two critical states are equivalent.
 */
export function criticalStatesMatch(a: CriticalState, b: CriticalState): boolean {
  return compareCriticalState(a, b).length === 0;
}

// ============================================
// GM PROMPT INJECTION
// ============================================

/**
 * Format fingerprint for injection into GM prompt.
 * This goes right after pinned facts for easy verification.
 */
export function formatFingerprintForGM(state: FullGameState): string {
  const fingerprint = generateFingerprint(state);

  return `## 🔑 STATE FINGERPRINT
\`\`\`
${fingerprint}
\`\`\`
_This fingerprint captures critical state. Your narration must be consistent with it._

`;
}
