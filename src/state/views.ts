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

import { FullGameState, ACT_CONFIGS } from "./schema.js";

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

  // Priority order
  if (state.clocks.demoClock !== null && state.clocks.demoClock <= 1) {
    return "⏰ DEMO IMMINENT! Dr. M is watching!";
  }
  if (state.npcs.drM.suspicionScore >= 8) {
    return "🚨 Dr. M is HIGHLY suspicious!";
  }
  if (turnsRemaining <= 1) {
    return `🎬 Act ${state.actConfig.currentAct.replace("ACT_", "")} nearing conclusion!`;
  }
  if (state.dinoRay.state === "READY") {
    return "🦖 Ray is READY. Choose your target wisely.";
  }
  if (state.dinoRay.state === "UNCALIBRATED") {
    return "🔧 Ray needs calibration before firing.";
  }
  if (state.npcs.bob.anxietyLevel >= 4) {
    return "😰 Bob is extremely anxious. Something's up.";
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
        status: full.npcs.blythe.transformationState || "human",
      },
    },

    demoClock: full.clocks.demoClock,
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
  if (gadgets.watchEMP.functional && gadgets.watchEMP.charges > 0) {
    remaining.push(`watchEMP(${gadgets.watchEMP.charges})`);
  }
  if (gadgets.watchLaser.functional && gadgets.watchLaser.charges > 0) {
    remaining.push(`watchLaser(${gadgets.watchLaser.charges})`);
  }
  if (gadgets.watchComms.functional) {
    remaining.push("watchComms");
  }
  if (!gadgets.leftCufflink.spent && gadgets.leftCufflink.charges > 0) {
    remaining.push("leftCufflink");
  }
  if (!gadgets.rightCufflink.spent && gadgets.rightCufflink.charges > 0) {
    remaining.push("rightCufflink");
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
        transformationState: full.npcs.blythe.transformationState || null,
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
    bc: number; // blythe composure
    bx: string | null; // blythe transform
    cap: number; // capacitor (0-100)
    ray: number; // ray state enum
    demo: number | null; // demo clock
    acc: number; // access level
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
    blythe: { rest: string; stun: number; loc: string };
    drM: { loc: string };
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
      bc: full.npcs.blythe.composure,
      bx: full.npcs.blythe.transformationState || null,
      cap: Math.round(full.dinoRay.powerCore.capacitorCharge * 100),
      ray: RAY_STATE_ENUM[full.dinoRay.state] ?? 0,
      demo: full.clocks.demoClock,
      acc: full.accessLevel,
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
      },
      drM: {
        loc: full.npcs.drM.location,
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
      },
      blythe: {
        composure: compressed.m.bc,
        trustInALICE: 2,
        physicalCondition: 4,
        restraintsStatus: compressed.npc.blythe.rest,
        location: compressed.npc.blythe.loc,
        transformationState: compressed.m.bx || undefined,
        stunLevel: compressed.npc.blythe.stun,
        stunResistanceUsed: false,
        autoInjectorUsed: false,
      },
      // Gadgets reset to minimal state on decompression
      blytheGadgets: {
        watchEMP: { charges: 1, functional: !compressed.m.bx },
        watchLaser: { charges: 2, functional: !compressed.m.bx },
        watchComms: { functional: !compressed.m.bx },
        leftCufflink: { charges: 1, spent: !!compressed.m.bx },
        rightCufflink: { charges: 1, spent: !!compressed.m.bx },
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
        fallbackProfile: "RAPTOR_STANDARD",
        activeLibrary: compressed.ray.lib as "A" | "B",
        libraryAUnlocked: true,
        libraryBUnlocked: compressed.m.acc >= 3,
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
      },
    },

    clocks: {
      demoClock: compressed.m.demo ?? 0,
      meltdownClock: compressed.clk?.melt,
      blytheEscapeIdea: compressed.clk?.esc,
      civilianFlyby: compressed.clk?.fly,
    },

    flags: {
      lifelinesUsed: [],
      testModeCanaryTriggered: false,
      predatorProfileSeenOnDummy: {},
      predatorProfileClearedForLive: {},
      exoticFieldEventOccurred: false,
      lastHighEnergyTurn: null,
      aliceKnowsTheSecret: decompressFlags(compressed.f).includes("SECRET_REVEALED"),
      exposureTriggered: decompressFlags(compressed.f).includes("EXPOSURE_TRIGGERED"),
      narrativeFlags: decompressFlags(compressed.f),
      earnedAchievements: compressed.ach,
    },

    history: [],

    narrativeMarkers: compressed.nm.map(s => {
      const match = s.match(/^T(\d+):(.+)$/);
      return {
        turn: match ? parseInt(match[1]) : compressed.t,
        marker: match ? match[2] : s,
      };
    }),
  };
}

// Export helpers for checkpoint system
export { decompressFlags, compressFlags };
