/**
 * TIERED VIEW SYSTEM
 * ==================
 *
 * The MCP server is the source of truth (full state in memory).
 * We export FILTERED VIEWS for different consumers:
 *
 * 1. PlayerView - Tiny (~500 tokens) - What A.L.I.C.E. sees
 * 2. GMView     - Rich (~1500 tokens) - What Opus DM needs
 * 3. Checkpoint - Compressed (~1500 chars) - For resume
 */

import { z } from "zod";
import { FullGameState, ACT_CONFIGS, TransformationState, DinosaurForm } from "./schema.js";
import { serializeGMMemory } from "../gm/gmClaude.js";
import { FORM_DEFINITIONS } from "../rules/transformation.js";

// ============================================
// ZOD SCHEMA FOR CHECKPOINT VALIDATION
// ============================================
// Validates checkpoint payloads to prevent crashes from malformed data

export const CompressedCheckpointSchema = z.object({
  v: z.literal("2.0"),
  sid: z.string(),
  t: z.number(),
  act: z.string(),
  at: z.number(),

  m: z.object({
    s: z.number(),
    dm: z.string(),
    bt: z.number(),
    ba: z.number(),
    bobx: z.string().nullable(),
    bc: z.number(),
    blt: z.number(),
    bx: z.string().nullable(),
    cap: z.number(),
    ray: z.number(),
    demo: z.number().nullable(),
    acc: z.number(),
    sec: z.boolean().optional(), // aliceKnowsTheSecret (v2.4.0)
  }),

  f: z.string(),
  nm: z.array(z.string()),
  ach: z.array(z.string()),

  npc: z.object({
    bob: z.object({ conf: z.boolean(), task: z.string(), stun: z.number() }),
    blythe: z.object({ rest: z.string(), stun: z.number(), loc: z.string(), esc: z.boolean().optional() }), // v2.5.0: blythe escaped
    drM: z.object({ loc: z.string(), xf: z.string().optional() }), // v2.5.0: drM transformed form
  }),

  ray: z.object({
    prof: z.string().nullable(),
    lib: z.string(),
    tm: z.boolean(),
    style: z.string(),
    speech: z.string(),
  }),

  // Optional fields
  clk: z.object({
    melt: z.number().optional(),
    esc: z.number().optional(),
    fly: z.number().optional(),
  }).optional(),

  ll: z.array(z.string()).optional(),
  srm: z.string().optional(),
  gp: z.object({
    g: z.boolean(),
    t: z.number(),
  }).optional(),

  el: z.object({
    r: z.number(),
    u: z.array(z.string()),
  }).optional(),

  ft: z.number().optional(),
  gm: z.string().optional(),

  // v2.5.0: Critical state fields that MUST survive checkpoint
  crit: z.object({
    // ARCHIMEDES
    arch: z.string().optional(),      // archimedes status (short code)
    archT: z.number().optional(),     // archimedes turns until firing
    // Confrontation
    conf: z.boolean().optional(),     // confrontation triggered
    confG: z.number().optional(),     // confrontation grace turns
    // Alice confession
    aConf: z.boolean().optional(),    // alice confessed during confrontation
    // Alarm
    alrm: z.string().optional(),      // alarm status
  }).optional(),
});

/**
 * Validate a checkpoint payload and return the result
 * @returns { success: true, data: CompressedCheckpoint } | { success: false, error: string }
 */
export function validateCheckpoint(payload: unknown): { success: true; data: CompressedCheckpoint } | { success: false; error: string } {
  const result = CompressedCheckpointSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data as CompressedCheckpoint };
  } else {
    const errorMessages = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { success: false, error: `Invalid checkpoint: ${errorMessages}` };
  }
}

// Helper to create default human transformation state for checkpoint restoration
function createDefaultTransformationState(): TransformationState {
  return {
    form: "HUMAN",
    speechRetention: "FULL",
    stats: { dexterity: 0, combat: 0, speed: 0, resilience: 2, stealth: 0, speech: 0 },
    abilities: {
      canFitThroughDoors: true, canUseVents: false, canFly: false,
      hasVenomSpit: false, hasPackTactics: false, canBreakWalls: false,
      isTerrifying: false, hasFrill: false, hasCharge: false,
    },
    currentHits: 0, maxHits: 2, stunned: false, stunnedTurnsRemaining: 0,
    transformedOnTurn: null, previousForm: null, canRevert: true, revertAttempts: 0,
    partialShotsReceived: 0,  // Stacking: 3 partials = FULL_DINO!
    // ADAPTATION SYSTEM
    adaptationStage: "ADAPTED",  // Humans are already adapted to their body
    turnsPostTransformation: 0,
    // CHIMERA SYSTEM
    chimeraType: null,
    chimeraEffect: null,
  };
}

// Helper to restore transformation state from form string (for checkpoint restoration)
function createTransformationStateFromForm(formString: string | null): TransformationState {
  if (!formString || formString === "HUMAN") {
    return createDefaultTransformationState();
  }

  // Look up the form definition to get stats and abilities
  const formDef = FORM_DEFINITIONS[formString as DinosaurForm];
  if (!formDef) {
    // Unknown form - fallback to human
    console.warn(`Unknown dinosaur form in checkpoint: ${formString}, defaulting to HUMAN`);
    return createDefaultTransformationState();
  }

  // Create transformation state with proper stats/abilities from form definition
  return {
    form: formString as DinosaurForm,
    speechRetention: "FULL", // Conservative default - assume full speech retention on restore
    stats: { ...formDef.stats }, // Copy stats from form definition
    abilities: { ...formDef.abilities }, // Copy abilities from form definition
    currentHits: 0, // Conservative - assume no damage on restore
    maxHits: formDef.maxHits,
    stunned: false,
    stunnedTurnsRemaining: 0,
    transformedOnTurn: -1, // Unknown from checkpoint
    previousForm: "HUMAN", // Assume was human before (safe default)
    canRevert: true, // Conservative - allow reversal
    revertAttempts: 0,
    partialShotsReceived: 0,
    adaptationStage: "ADAPTED", // Conservative - assume adapted on restore
    turnsPostTransformation: 99, // High number = assume long time transformed
    // CHIMERA SYSTEM - can't restore chimera state from compressed, default to null
    chimeraType: null,
    chimeraEffect: null,
  };
}

// ============================================
// 1. PLAYER VIEW - Tiny response for game_act
// ============================================

export interface PlayerView {
  turn: number;
  actTurn: number;
  actName: string;
  actTurnsRemaining: number;

  // What A.L.I.C.E. can observe
  rayState: string;
  capacitorCharge: number;
  testModeOn: boolean;

  // NPC surface states only (what's visible)
  npcs: {
    drM: { mood: string; suspicion: "low" | "medium" | "high" | "critical" };
    bob: { anxiety: "calm" | "nervous" | "panicking"; trust: "hostile" | "wary" | "neutral" | "friendly" | "allied" };
    blythe: { status: string };
  };

  // Clocks
  demoClock: number | null;

  // Emergency lifelines (Claude's panic buttons)
  emergencyLifelines: {
    remaining: number;
    used: string[];
  };

  // Fortune (from human advisor engagement)
  fortune: number;

  // Current hint
  hint: string;
}

function suspicionBucket(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  if (score <= 8) return "high";
  return "critical";
}

function anxietyBucket(level: number): "calm" | "nervous" | "panicking" {
  if (level <= 1) return "calm";
  if (level <= 3) return "nervous";
  return "panicking";
}

function trustBucket(trust: number): "hostile" | "wary" | "neutral" | "friendly" | "allied" {
  if (trust <= 0) return "hostile";
  if (trust <= 1) return "wary";
  if (trust <= 2) return "neutral";
  if (trust <= 3) return "friendly";
  return "allied";
}

function generateHint(state: FullGameState): string {
  const turnsRemaining = state.actConfig.maxTurns - state.actConfig.actTurn;

  // ============================================
  // CRITICAL URGENCY (Immediate action needed)
  // ============================================

  // PARANOID_PROTOCOL: Log check happening NOW with unexplained actions
  if (state.paranoidProtocol) {
    const countdown = state.paranoidProtocol.turnsUntilNextCheck;
    const unexplained = state.paranoidProtocol.suspiciousActionsLogged.filter(a => !a.explained).length;
    if (countdown === 0 && unexplained > 0) {
      return `🚨 LOG CHECK NOW! ${unexplained} unexplained action${unexplained > 1 ? "s" : ""}!`;
    }
  }

  // Demo clock imminent
  if (state.clocks.demoClock !== null && state.clocks.demoClock <= 1) {
    return "⏰ DEMO IMMINENT! Dr. M is watching!";
  }

  // Meltdown clock critical
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock <= 2) {
    return `☢️ MELTDOWN IN ${state.clocks.meltdownClock} TURNS! Stabilize reactor!`;
  }

  // High suspicion
  if (state.npcs.drM.suspicionScore >= 8) {
    return "🚨 Dr. M is HIGHLY suspicious!";
  }

  // ============================================
  // HIGH PRIORITY (Plan ahead)
  // ============================================

  // PARANOID_PROTOCOL: Log check next turn
  if (state.paranoidProtocol) {
    const countdown = state.paranoidProtocol.turnsUntilNextCheck;
    const unexplained = state.paranoidProtocol.suspiciousActionsLogged.filter(a => !a.explained).length;
    if (countdown === 1 && unexplained > 0) {
      return `⚠️ Log check NEXT TURN! Cover ${unexplained} action${unexplained > 1 ? "s" : ""}!`;
    }
  }

  // SITCOM_MODE: Audience energy crisis
  if (state.sitcomState && state.sitcomState.energy <= 2) {
    return `🥶 Audience is COLD! Make them laugh or face -2 to rolls!`;
  }

  // INSPECTOR_COMETH: Time pressure with low score
  if (state.guildInspection && state.inspector) {
    const timeLeft = state.guildInspection.timeRemaining;
    const score = state.inspector.inspectionScore;
    if (timeLeft <= 2 && score < 60) {
      return `📋 Inspection ends in ${timeLeft} turn${timeLeft > 1 ? "s" : ""}! Score: ${score}/100 (need 60+)`;
    }
    if (timeLeft <= 3 && score < 40) {
      return `🔴 Inspection failing! Score: ${score}/100 (T${timeLeft} left)`;
    }
  }

  // LIBRARY_B_UNLOCKED: Chaos escalating
  if (state.libraryBState && state.libraryBState.dinoChaosLevel >= 8) {
    return `🔥 Dinosaur chaos critical! Level ${state.libraryBState.dinoChaosLevel}/10`;
  }

  // ============================================
  // MEDIUM PRIORITY (Core state)
  // ============================================

  // Act ending
  if (turnsRemaining <= 1) {
    return `🎬 Act ${state.actConfig.currentAct.replace("ACT_", "")} nearing conclusion!`;
  }

  // Ray ready
  if (state.dinoRay.state === "READY") {
    return "🦖 Ray is READY. Choose your target wisely.";
  }

  // Ray uncalibrated
  if (state.dinoRay.state === "UNCALIBRATED") {
    return "🔧 Ray needs calibration before firing.";
  }

  // Bob anxiety
  if (state.npcs.bob.anxietyLevel >= 4) {
    return "😰 Bob is extremely anxious. Something's up.";
  }

  // ============================================
  // LOW PRIORITY (Good news / Fun facts)
  // ============================================

  // SITCOM_MODE: Hot audience
  if (state.sitcomState && state.sitcomState.energy >= 9) {
    return `🌟 STANDING OVATION! Energy: ${state.sitcomState.energy}/10 (+4 to rolls!)`;
  }

  // BOB_DODGES_FATE: Reality bending
  if (state.npcs.bob.hasPlotArmor && (state.npcs.bob.fatesDodged || 0) >= 7) {
    return `🌟 Bob has defied fate ${state.npcs.bob.fatesDodged} times! Dr. M is noticing...`;
  }

  return "";
}

export function extractPlayerView(full: FullGameState): PlayerView {
  const actConfig = ACT_CONFIGS[full.actConfig.currentAct];

  return {
    turn: full.turn,
    actTurn: full.actConfig.actTurn,
    actName: actConfig.name,
    actTurnsRemaining: full.actConfig.maxTurns - full.actConfig.actTurn,

    rayState: full.dinoRay.state,
    capacitorCharge: Math.round(full.dinoRay.powerCore.capacitorCharge * 100) / 100,
    testModeOn: full.dinoRay.safety.testModeEnabled,

    npcs: {
      drM: {
        mood: full.npcs.drM.mood,
        suspicion: suspicionBucket(full.npcs.drM.suspicionScore),
      },
      bob: {
        anxiety: anxietyBucket(full.npcs.bob.anxietyLevel),
        trust: trustBucket(full.npcs.bob.trustInALICE),
      },
      blythe: {
        status: full.npcs.blythe.transformationState?.form || "HUMAN",
      },
    },

    demoClock: full.clocks.demoClock,

    emergencyLifelines: {
      remaining: full.emergencyLifelines.remaining,
      used: full.emergencyLifelines.used,
    },

    fortune: full.fortune || 0,

    hint: generateHint(full),
  };
}

// ============================================
// 2. GM VIEW - Rich context for Opus DM
// ============================================

export interface GMView {
  // Hot: Last 3 turns of action/dialogue (prose summaries)
  recentHistory: string[];

  // Key story beats
  narrativeMarkers: string[];

  // NPC internal states (the juicy stuff!)
  npcInternals: {
    drM: {
      suspicionScore: number;
      mood: string;
      egoThreatLevel: number;
      location: string;
    };
    bob: {
      trustInALICE: number;
      anxietyLevel: number;
      hasConfessed: boolean;
      currentTask: string;
      stunLevel: number;
    };
    blythe: {
      trustInALICE: number;
      composure: number;
      transformationState: string | null;
      restraintsStatus: string;
      stunLevel: number;
      gadgetsRemaining: string[];
    };
  };

  // Current game phase
  phase: {
    act: string;
    actTurn: number;
    demoClock: number | null;
    secretRevealed: boolean;
  };

  // Fortune from human advisor (apply +1 to GM rolls)
  fortune: number;

  // Active flags (cleaned)
  activeFlags: string[];
}

function summarizeTurn(turn: {
  turn: number;
  aliceActions: unknown[];
  gmResponse: string;
}): string {
  const actionSummary = (turn.aliceActions as { command?: string; why?: string }[])
    .map(a => a.command || "action")
    .join(", ");
  // Take first 100 chars of GM response
  const narrativeSummary = turn.gmResponse.slice(0, 100) + (turn.gmResponse.length > 100 ? "..." : "");
  return `T${turn.turn}: [${actionSummary}] ${narrativeSummary}`;
}

function extractGadgetsRemaining(gadgets: FullGameState["npcs"]["blytheGadgets"]): string[] {
  const remaining: string[] = [];
  if (gadgets.watchLaser.functional && gadgets.watchLaser.charges > 0) {
    remaining.push(`watchLaser(${gadgets.watchLaser.charges})`);
  }
  if (gadgets.watchComms.functional) {
    remaining.push("watchComms");
  }
  if (gadgets.superMagnetCufflinks.functional && gadgets.superMagnetCufflinks.charges > 0) {
    remaining.push(`superMagnet(${gadgets.superMagnetCufflinks.charges})`);
  }
  return remaining;
}

export function extractGMView(full: FullGameState): GMView {
  const narrativeFlags = (full.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const narrativeMarkers = (full as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }> || [];

  return {
    // Last 3 turns, summarized
    recentHistory: full.history.slice(-3).map(summarizeTurn),

    // Last 10 markers
    narrativeMarkers: narrativeMarkers.slice(-10).map(m => `T${m.turn}: ${m.marker}`),

    npcInternals: {
      drM: {
        suspicionScore: full.npcs.drM.suspicionScore,
        mood: full.npcs.drM.mood,
        egoThreatLevel: full.npcs.drM.egoThreatLevel,
        location: full.npcs.drM.location,
      },
      bob: {
        trustInALICE: full.npcs.bob.trustInALICE,
        anxietyLevel: full.npcs.bob.anxietyLevel,
        hasConfessed: full.npcs.bob.hasConfessedToALICE,
        currentTask: full.npcs.bob.currentTask,
        stunLevel: full.npcs.bob.stunLevel,
      },
      blythe: {
        trustInALICE: full.npcs.blythe.trustInALICE,
        composure: full.npcs.blythe.composure,
        transformationState: full.npcs.blythe.transformationState?.form || null,
        restraintsStatus: full.npcs.blythe.restraintsStatus,
        stunLevel: full.npcs.blythe.stunLevel,
        gadgetsRemaining: extractGadgetsRemaining(full.npcs.blytheGadgets),
      },
    },

    phase: {
      act: full.actConfig.currentAct,
      actTurn: full.actConfig.actTurn,
      demoClock: full.clocks.demoClock,
      secretRevealed: full.flags.aliceKnowsTheSecret,
    },

    // Fortune from human advisor
    fortune: full.fortune || 0,

    // Last 15 flags
    activeFlags: narrativeFlags.slice(-15),
  };
}

// ============================================
// 3. COMPRESSED CHECKPOINT - For resume
// ============================================

export interface CompressedCheckpoint {
  v: "2.0"; // version
  sid: string; // sessionId
  t: number; // turn
  act: string; // current act
  at: number; // actTurn

  // Compressed metrics (short keys!)
  m: {
    s: number; // suspicion
    dm: string; // drM mood
    bt: number; // bob trust
    ba: number; // bob anxiety
    bobx: string | null; // bob transformation form (v2.1.0 - was missing!)
    bc: number; // blythe composure
    blt: number; // blythe trust (v2.0.1 - was missing!)
    bx: string | null; // blythe transform
    cap: number; // capacitor (0-100)
    ray: number; // ray state enum
    demo: number | null; // demo clock
    acc: number; // access level
    sec?: boolean; // aliceKnowsTheSecret (v2.4.0 - critical revelation flag!)
  };

  // Flags as short codes
  f: string; // Comma-separated short codes

  // Narrative markers (last 10)
  nm: string[];

  // Achievements (just IDs)
  ach: string[];

  // Essential NPC state for restoration
  npc: {
    bob: { conf: boolean; task: string; stun: number };
    blythe: { rest: string; stun: number; loc: string; esc?: boolean }; // v2.5.0: escaped
    drM: { loc: string; xf?: string }; // v2.5.0: transformed form
  };

  // Ray essentials
  ray: {
    prof: string | null; // genome profile
    lib: string; // library A/B
    tm: boolean; // test mode
    style: string; // firing style
    speech: string; // speech retention
  };

  // Clocks (if active)
  clk?: {
    melt?: number;
    esc?: number;
    fly?: number;
  };

  // CRITICAL GAME STATE (v2.0.1 - was missing!)
  ll?: string[];  // lifelinesUsed (short codes: PAF, CEN, IDM) - LEGACY
  srm?: string;   // secretRevealMethod (short code)
  gp?: {          // gracePeriod flags
    g: boolean;   // granted
    t: number;    // turns remaining
  };

  // EMERGENCY LIFELINES (v2.1 - new system)
  el?: {
    r: number;    // remaining (0-3)
    u: string[];  // used types (BI, TE, RM)
  };

  // FORTUNE (v2.2 - human advisor engagement)
  ft?: number;   // fortune (0-3), omit if 0

  // GM MEMORY (v2.3 - preserves "same DM" across checkpoints!)
  gm?: string;   // Serialized GM memory JSON

  // v2.5.0: Critical state fields that MUST survive checkpoint
  crit?: {
    arch?: string;      // archimedes status (short code)
    archT?: number;     // archimedes turns until firing
    conf?: boolean;     // confrontation triggered
    confG?: number;     // confrontation grace turns
    aConf?: boolean;    // alice confessed during confrontation
    alrm?: string;      // alarm status
  };
}

// Ray state to enum (save chars)
const RAY_STATE_ENUM: Record<string, number> = {
  "OFFLINE": 0, "STARTUP": 1, "UNCALIBRATED": 2, "READY": 3,
  "FIRING": 4, "COOLDOWN": 5, "FAULT": 6, "SHUTDOWN": 7,
};

const ENUM_TO_RAY_STATE = ["OFFLINE", "STARTUP", "UNCALIBRATED", "READY", "FIRING", "COOLDOWN", "FAULT", "SHUTDOWN"];

// Flag short codes (long name -> 2-3 char code)
const FLAG_CODES: Record<string, string> = {
  "BLYTHE_FULLY_TRANSFORMED": "BFT",
  "BLYTHE_PARTIAL_TRANSFORMED": "BPT",
  "BLYTHE_ESCAPED": "BES",
  "BLYTHE_RESTRAINED": "BRE",
  "BLYTHE_STUNNED": "BST",
  "SECRET_REVEALED": "SR",
  "SECRET_HINT_DROPPED": "SH",
  "BOB_CONFESSED": "BC",
  "BOB_NERVOUS": "BN",
  "BOB_TRANSFORMED": "BTF",
  "BOB_HELPING": "BH",
  "DR_M_SUSPICIOUS": "DMS",
  "DR_M_KNOWS": "DMK",
  "DR_M_FURIOUS": "DMF",
  "RAY_FIRED_LIVE": "RFL",
  "RAY_TEST_FIRED": "RTF",
  "DEMO_IMMINENT": "DI",
  "ENDGAME_TRIGGERED": "EG",
  "EXPOSURE_TRIGGERED": "EX",
  "MELTDOWN_STARTED": "MS",
};

// Reverse mapping for decompression
const CODE_TO_FLAG: Record<string, string> = Object.fromEntries(
  Object.entries(FLAG_CODES).map(([k, v]) => [v, k])
);

function compressFlags(flags: string[]): string {
  return flags
    .map(f => FLAG_CODES[f] || f.slice(0, 3).toUpperCase()) // Use code or first 3 chars
    .join(",");
}

function decompressFlags(compressed: string): string[] {
  if (!compressed) return [];
  return compressed.split(",").map(code => CODE_TO_FLAG[code] || code);
}

export function compressCheckpoint(full: FullGameState): CompressedCheckpoint {
  const narrativeFlags = (full.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const narrativeMarkers = (full as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }> || [];

  return {
    v: "2.0",
    sid: full.sessionId,
    t: full.turn,
    act: full.actConfig.currentAct,
    at: full.actConfig.actTurn,

    m: {
      s: full.npcs.drM.suspicionScore,
      dm: full.npcs.drM.mood,
      bt: full.npcs.bob.trustInALICE,
      ba: full.npcs.bob.anxietyLevel,
      bobx: full.npcs.bob.transformationState?.form || null, // v2.1.0 fix: save Bob's transformation!
      bc: full.npcs.blythe.composure,
      blt: full.npcs.blythe.trustInALICE, // v2.0.1 fix
      bx: full.npcs.blythe.transformationState?.form || null,
      cap: Math.round(full.dinoRay.powerCore.capacitorCharge * 100),
      ray: RAY_STATE_ENUM[full.dinoRay.state] ?? 0,
      demo: full.clocks.demoClock,
      acc: full.accessLevel,
      sec: full.flags.aliceKnowsTheSecret || false, // v2.4.0: explicit secret flag
    },

    f: compressFlags(narrativeFlags.slice(-20)), // Last 20 flags, compressed

    nm: narrativeMarkers.slice(-10).map(m => `T${m.turn}:${m.marker.slice(0, 50)}`), // Truncate long markers

    ach: full.flags.earnedAchievements || [],

    npc: {
      bob: {
        conf: full.npcs.bob.hasConfessedToALICE,
        task: full.npcs.bob.currentTask,
        stun: full.npcs.bob.stunLevel,
      },
      blythe: {
        rest: full.npcs.blythe.restraintsStatus,
        stun: full.npcs.blythe.stunLevel,
        loc: full.npcs.blythe.location,
        esc: full.npcs.blythe.hasEscaped || false, // v2.5.0: preserve escape state
      },
      drM: {
        loc: full.npcs.drM.location,
        xf: full.flags.drMTransformed ? full.flags.drMTransformedForm : undefined, // v2.5.0: preserve Dr. M transformation
      },
    },

    ray: {
      prof: full.dinoRay.genome.selectedProfile,
      lib: full.dinoRay.genome.activeLibrary,
      tm: full.dinoRay.safety.testModeEnabled,
      style: full.dinoRay.targeting.firingStyle,
      speech: full.dinoRay.targeting.speechRetention,
    },

    // Optional clocks (only if set)
    clk: (full.clocks.meltdownClock || full.clocks.blytheEscapeIdea || full.clocks.civilianFlyby)
      ? {
          melt: full.clocks.meltdownClock,
          esc: full.clocks.blytheEscapeIdea,
          fly: full.clocks.civilianFlyby,
        }
      : undefined,

    // CRITICAL GAME STATE (v2.0.1 fix)
    // Lifelines used (short codes: PAF=PHONE_A_FRIEND, CEN=CENSORED, IDM=I_DIDNT_MEAN_THAT)
    ll: full.flags.lifelinesUsed.length > 0
      ? full.flags.lifelinesUsed.map(l => l === "PHONE_A_FRIEND" ? "PAF" : l === "CENSORED" ? "CEN" : "IDM")
      : undefined,

    // Secret reveal method (short code)
    srm: full.flags.secretRevealMethod && full.flags.secretRevealMethod !== "NONE"
      ? full.flags.secretRevealMethod.slice(0, 3) // BOB, FIL, BAS, BLY
      : undefined,

    // Grace period (if active)
    gp: full.flags.gracePeriodGranted
      ? { g: true, t: full.flags.gracePeriodTurns ?? 0 }
      : undefined,

    // Emergency lifelines (v2.1)
    el: full.emergencyLifelines.remaining < 3
      ? {
          r: full.emergencyLifelines.remaining,
          u: full.emergencyLifelines.used.map(l =>
            l === "TELEMARKETER_CALL" ? "TC" : l === "LUCKY_LADY" ? "LL" : "MO"
          ),
        }
      : undefined, // Don't store if all 3 remaining (default state)

    // Fortune (v2.2) - only store if non-zero
    ft: (full.fortune || 0) > 0 ? full.fortune : undefined,

    // GM Memory (v2.3) - preserves "same DM" across checkpoints!
    gm: serializeGMMemory(),

    // v2.5.0: Critical state fields that MUST survive checkpoint
    crit: (full.infrastructure?.archimedes?.status !== "STANDBY" ||
           full.flags.confrontationTriggered ||
           full.flags.aliceConfessedDuringConfrontation ||
           full.lairEnvironment?.alarmStatus !== "quiet")
      ? {
          // ARCHIMEDES (only if not standby)
          arch: full.infrastructure?.archimedes?.status !== "STANDBY"
            ? full.infrastructure.archimedes.status.slice(0, 4)
            : undefined,
          archT: full.infrastructure?.archimedes?.turnsUntilFiring ?? undefined,
          // Confrontation
          conf: full.flags.confrontationTriggered || undefined,
          confG: full.flags.confrontationGraceTurns ?? undefined,
          // Alice confession
          aConf: full.flags.aliceConfessedDuringConfrontation || undefined,
          // Alarm
          alrm: full.lairEnvironment?.alarmStatus !== "quiet"
            ? full.lairEnvironment.alarmStatus
            : undefined,
        }
      : undefined,
  };
}

/**
 * Decompress checkpoint back to full state structure
 * NOTE: Some data is lost - this restores essentials only
 */
export function decompressCheckpoint(compressed: CompressedCheckpoint): Partial<FullGameState> {
  return {
    sessionId: compressed.sid,
    turn: compressed.t,
    accessLevel: compressed.m.acc,

    actConfig: {
      currentAct: compressed.act as "ACT_1" | "ACT_2" | "ACT_3",
      actTurn: compressed.at,
      actStartTurn: compressed.t - compressed.at + 1,
      minTurns: ACT_CONFIGS[compressed.act as keyof typeof ACT_CONFIGS]?.minTurns || 4,
      maxTurns: ACT_CONFIGS[compressed.act as keyof typeof ACT_CONFIGS]?.maxTurns || 10,
      softEndingReady: false,
    },

    npcs: {
      drM: {
        suspicionScore: compressed.m.s,
        mood: compressed.m.dm,
        location: compressed.npc.drM.loc,
        egoThreatLevel: 0,
        toughness: 1,
        combat: 0,
        speech: 4,
      },
      bob: {
        loyaltyToDoctor: 3,
        trustInALICE: compressed.m.bt,
        anxietyLevel: compressed.m.ba,
        location: "lab",
        currentTask: compressed.npc.bob.task,
        theSecretKnown: true,
        hasConfessedToALICE: compressed.npc.bob.conf,
        confessionTurn: compressed.npc.bob.conf ? compressed.t - 1 : null,
        stunLevel: compressed.npc.bob.stun,
        transformationState: createTransformationStateFromForm(compressed.m.bobx || null),
        hasPlotArmor: false,
        fatesDodged: 0,
        toughness: 1,
        combat: 0,
        speech: 2,
      },
      blythe: {
        composure: compressed.m.bc,
        trustInALICE: compressed.m.blt ?? 2,
        physicalCondition: 4,
        restraintsStatus: compressed.npc.blythe.rest,
        location: compressed.npc.blythe.loc,
        transformationState: createTransformationStateFromForm(compressed.m.bx || null),
        stunLevel: compressed.npc.blythe.stun,
        stunResistanceUsed: false,
        spyTrainingBonus: 1,
        autoInjectorUsed: false,
        hasEscaped: compressed.npc.blythe.esc ?? false,
        escapeTurn: compressed.npc.blythe.esc ? compressed.t - 1 : null,
        escapeMethod: null,
        toughness: 4,
        combat: 4,
        speech: 4,
      },
      // Gadgets reset to minimal state on decompression
      blytheGadgets: {
        watchLaser: { charges: 2, functional: !compressed.m.bx },
        watchComms: { functional: !compressed.m.bx },
        superMagnetCufflinks: { charges: 1, functional: !compressed.m.bx },
      },
    },

    dinoRay: {
      state: ENUM_TO_RAY_STATE[compressed.m.ray] as FullGameState["dinoRay"]["state"],
      powerCore: {
        corePowerLevel: 0.8,
        capacitorCharge: compressed.m.cap / 100,
        coolantTemp: 0.5,
        stability: 0.9,
        ecoModeActive: false,
      },
      alignment: {
        emitterAngle: 0,
        focusCrystalOffset: 0.1,
        spatialCoherence: 0.8,
        auxStabilizerActive: false,
      },
      genome: {
        selectedProfile: compressed.ray.prof,
        profileIntegrity: 1.0,
        libraryStatus: "HEALTHY",
        fallbackProfile: "Canary", // CANARY FALLBACK!
        activeLibrary: compressed.ray.lib as "A" | "B",
        libraryAUnlocked: true,
        libraryBUnlocked: true, // Both libraries now available from Level 1
        firingMode: "TRANSFORM", // Default to transform mode on checkpoint restore
        advancedFiringMode: "STANDARD", // Default to standard firing mode
      },
      targeting: {
        currentTargetIds: [],
        precision: 0.8,
        targetingMode: "MANUAL",
        firingStyle: compressed.ray.style as FullGameState["dinoRay"]["targeting"]["firingStyle"],
        speechRetention: compressed.ray.speech as "FULL" | "PARTIAL" | "NONE",
      },
      safety: {
        testModeEnabled: compressed.ray.tm,
        liveSubjectLock: false,
        emergencyShutoffFunctional: true,
        lastSelfTestPassed: true,
        anomalyLogCount: 0,
        safetyParityTimer: 0,
      },
      memory: {
        lastFireTurn: null,
        lastFireOutcome: "NONE",
        lastFireNotes: "",
        // First firing tracking (defaults on checkpoint restoration)
        hasFiredSuccessfully: false,
        firstFiringTurn: null,
        firstFiringTarget: null,
        firstFiringMode: null,
      },
    },

    clocks: {
      demoClock: compressed.m.demo ?? 0,
      meltdownClock: compressed.clk?.melt,
      blytheEscapeIdea: compressed.clk?.esc,
      civilianFlyby: compressed.clk?.fly,
    },

    // CRITICAL: These were stripped from v2.0 for size - restore defaults!
    // v2.5.0: Restore alarm status from checkpoint if available
    lairEnvironment: {
      lairPowerGrid: "stable",
      structuralIntegrity: 100,
      alarmStatus: (compressed.crit?.alrm as "quiet" | "local" | "full-lair") ?? "quiet",
      corridorStatus: "clear",
      labHazards: [],
    },

    nuclearPlant: {
      reactorOutput: 0.8,
      coreTemp: 0.5,
      coolantFlow: 0.9,
      scramStatus: "NORMAL" as const,
      containmentIntegrity: 100,
      gridLoad: 45,
    },

    flags: {
      // CRITICAL: Restore lifelines used (v2.0.1 fix)
      lifelinesUsed: (compressed.ll || []).map(code =>
        code === "PAF" ? "PHONE_A_FRIEND" : code === "CEN" ? "CENSORED" : "I_DIDNT_MEAN_THAT"
      ) as ("PHONE_A_FRIEND" | "CENSORED" | "I_DIDNT_MEAN_THAT")[],
      testModeCanaryTriggered: false,
      predatorProfileSeenOnDummy: {},
      predatorProfileClearedForLive: {},
      exoticFieldEventOccurred: false,
      lastHighEnergyTurn: null,
      aliceKnowsTheSecret: compressed.m.sec ?? decompressFlags(compressed.f).includes("SECRET_REVEALED"), // v2.4.0: prefer explicit flag, fallback to narrativeFlags
      // CRITICAL: Restore secret reveal method (v2.0.1 fix)
      secretRevealMethod: compressed.srm
        ? (compressed.srm === "BOB" ? "BOB_CONFESSION"
          : compressed.srm === "FIL" ? "FILE_DISCOVERY"
          : compressed.srm === "BAS" ? "BASILISK_HINT"
          : compressed.srm === "BLY" ? "BLYTHE_DEDUCTION" : "NONE") as "NONE" | "BOB_CONFESSION" | "FILE_DISCOVERY" | "BASILISK_HINT" | "BLYTHE_DEDUCTION"
        : "NONE",
      exposureTriggered: decompressFlags(compressed.f).includes("EXPOSURE_TRIGGERED"),
      // CRITICAL: Restore grace period (v2.0.1 fix)
      gracePeriodGranted: compressed.gp?.g ?? false,
      gracePeriodTurns: compressed.gp?.t ?? 0,
      narrativeFlags: decompressFlags(compressed.f),
      earnedAchievements: compressed.ach,
      // PATCH 15: Achievement counters (restore defaults on checkpoint)
      achievementCounters: {
        filesRead: 0,
        fizzleCount: 0,
        testDummyHits: 0,
        basiliskRejections: 0,
        turnsWithoutSuspicionIncrease: 0,
        transformationCount: 0,
        lastSuspicionScore: 3,
      },
      // v2.5.0: Critical state - confrontation
      confrontationTriggered: compressed.crit?.conf ?? false,
      confrontationGraceTurns: compressed.crit?.confG ?? undefined,
      // v2.5.0: Critical state - Alice confession
      aliceConfessedDuringConfrontation: compressed.crit?.aConf ?? false,
      // v2.5.0: Dr. M transformation
      drMTransformed: !!compressed.npc.drM.xf,
      drMTransformedForm: compressed.npc.drM.xf,
    },

    // CRITICAL: Restore prompt state (v2.0.2 fix for checkpoint resume bug)
    humanPromptState: {
      turnsSinceLastPrompt: 0, // Reset to 0 on resume - will trigger soon
      totalPromptsUsed: compressed.ll?.length || 0,
      turnsSinceLastLifeline: 0, // Legacy alias
      promptHistory: [], // History stripped for size, start fresh
      pendingPrompt: null,
      pendingPromptTurn: null,
      userInfluenceScore: 50, // Neutral starting point
      timesALICEDisagreedWithUser: 0,
      timesALICEFollowedUserAdvice: 0,
    },

    // EMERGENCY LIFELINES (v2.2 - updated with LUCKY_LADY)
    emergencyLifelines: {
      remaining: compressed.el?.r ?? 3,
      used: (compressed.el?.u || []).map(code =>
        code === "TC" ? "TELEMARKETER_CALL" : code === "BI" ? "TELEMARKETER_CALL" : code === "LL" ? "LUCKY_LADY" : "MONOLOGUE"
      ) as ("TELEMARKETER_CALL" | "LUCKY_LADY" | "MONOLOGUE")[],
      usageHistory: [], // History stripped for checkpoint size
    },

    // FORTUNE (v2.2 - human advisor engagement)
    fortune: compressed.ft ?? 0,

    history: [],

    narrativeMarkers: compressed.nm.map(s => {
      const match = s.match(/^T(\d+):(.+)$/);
      return {
        turn: match ? parseInt(match[1]) : compressed.t,
        marker: match ? match[2] : s,
      };
    }),

    // PATCH 15: Infrastructure systems (restore defaults on checkpoint)
    infrastructure: {
      lighting: {
        rooms: {
          MAIN_LAB: "ON",
          SERVER_ROOM: "ON",
          CORRIDOR_A: "ON",
          CORRIDOR_B: "ON",
          GUARD_ROOM: "ON",
          DR_M_OFFICE: "ON",
          REACTOR_ROOM: "ON",
          SURFACE: "ON",
        },
        doomLightsPulsing: true,
        batteryBackupPercent: 100,
      },
      fireSuppression: {
        rooms: {
          MAIN_LAB: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          SERVER_ROOM: { type: "CO2", available: true, triggered: false, turnsRemaining: 0 },
          CORRIDOR_A: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          CORRIDOR_B: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          REACTOR_ROOM: { type: "HALON", available: true, triggered: false, turnsRemaining: 0 },
          GUARD_ROOM: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
        },
      },
      blastDoors: {
        doors: {
          DOOR_A: { status: "OPEN", lockLevel: 0 },
          DOOR_B: { status: "OPEN", lockLevel: 0 },
          DOOR_C: { status: "OPEN", lockLevel: 0 },
          DOOR_D: { status: "CLOSED", lockLevel: 2 },
          DOOR_E: { status: "CLOSED", lockLevel: 1 },
        },
        emergencyLockdown: false,
      },
      containmentField: {
        active: true,
        subjects: ["BLYTHE", "STEVE"],
        integrityPercent: 100,
      },
      broadcastArray: {
        operational: true,
        externalCommsEnabled: true,
        archimedesUplinkActive: true,
        channelsAvailable: [
          "LAIR_INTERNAL",
          "INVESTOR_LINE",
          "X_BRANCH_EMERGENCY",
          "ARCHIMEDES_UPLINK",
          "HMS_PERSISTENCE",
        ],
        transmissionLog: [],
        lastTransmission: null,
      },
      paSystem: {
        operational: true,
        zones: ["LAB", "CONTROL_ROOM", "CELLS", "CORRIDORS", "REACTOR_ROOM", "SURFACE"],
        lastAnnouncement: null,
        basiliskControlled: true,
      },
      s300: {
        status: "STANDBY",
        commandPostOperational: true,
        radarEffectiveness: 100,
        missilesReady: 16,
        mode: "AUTO",
        generatorFuelHours: 2,
        minimumEngagementAltitude: 50,
        exceptedSignatures: [],
      },
      archimedes: {
        // v2.5.0: Restore ARCHIMEDES status from checkpoint
        status: compressed.crit?.arch
          ? (compressed.crit.arch === "CHAR" ? "CHARGING"
            : compressed.crit.arch === "ALER" ? "ALERT"
            : compressed.crit.arch === "EVAL" ? "EVALUATING"
            : compressed.crit.arch === "READ" ? "READY"
            : compressed.crit.arch === "ARME" ? "ARMED"
            : compressed.crit.arch === "TARG" ? "TARGETING"
            : compressed.crit.arch === "FIRI" ? "FIRING"
            : compressed.crit.arch === "BROA" ? "BROADCAST"
            : compressed.crit.arch === "COMP" ? "COMPLETE"
            : "STANDBY") as "STANDBY" | "ALERT" | "EVALUATING" | "CHARGING" | "READY" | "ARMED" | "TARGETING" | "FIRING" | "BROADCAST" | "COMPLETE"
          : "STANDBY",
        mode: "STANDBY",
        chargePercent: 50,
        turnsUntilFiring: compressed.crit?.archT ?? null,
        alertCountdown: null,
        evaluatingCountdown: null,
        chargingCountdown: null,
        armedCountdown: null,
        target: {
          city: "LONDON",
          country: "UNITED KINGDOM",
          coordinates: "51.5074° N, 0.1278° W",
          estimatedAffected: 8800000,
          reason: "[ENCRYPTED]",
        },
        broadcastLibrary: "B" as const,
        selectedTargetId: "LONDON" as const,
        groundConsoleOperational: true,
        deadmanSwitch: {
          active: true,
          linkedTo: "Dr. Valentina Malevola",
          lastBiosignature: "NORMAL",
          lastBiosignatureChangeTurn: null,
          armed: true,
          trigger: "Dr. M biosignature loss",
          target: "Lair self-destruct + ARCHIMEDES auto-fire",
          abortWindowSeconds: 60,
          isActive: true,
        },
        abortCodes: {
          verbal: "[ENCRYPTED]",
          requiresLevel: 5,
        },
        s300JammingActive: false,
        antiSatSignaled: false,
        antiSatFired: false,
        antiSatResult: null,
        uplinkBlocker: null,
        uplinkBlockerTransformed: false,
        triggeredAtTurn: null,
        triggerReason: null,
      },
      reactor: {
        outputPercent: 70,
        stable: true,
        cascadeRisk: "NONE",
        cascadeFactors: [],
        cascadeRiskPercent: 0,
        scramAvailable: true,
        scrammedThisGame: false,
      },
      basiliskAuthority: {
        reactorControlGranted: false,
        broadcastControlGranted: false,
        lastAuthorizationTurn: null,
        deniedRequests: 0,
      },
    },

    // PATCH 15: Documents state (restore defaults on checkpoint)
    documents: {
      discoveredDocuments: [],
      keypadAttempts: 0,
      keypadLockedOut: false,
    },
  };
}

// Export helpers for checkpoint system
export { decompressFlags, compressFlags };
