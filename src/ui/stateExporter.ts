/**
 * State Exporter for Web Dashboard
 * =================================
 *
 * Exports game state to ~/.dino-lair/live_state.json
 * for the web dashboard to consume.
 *
 * Set DINO_LAIR_STATE_DIR env var to override the default location.
 * This helps when MCP server and dashboard run in different environments.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { FullGameState, ACT_CONFIGS } from "../state/schema.js";
import { restraintsValue, restraintLabel } from "../state/properties.js";
import { getAvailableToolNames } from "../rules/actions.js";
import { ACCESS_LEVELS } from "../rules/passwords.js";

// Allow explicit override for sandboxed environments
const DINO_DIR = process.env.DINO_LAIR_STATE_DIR ||
  path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair");
const STATE_FILE = path.join(DINO_DIR, "live_state.json");
const TRANSCRIPT_FILE = path.join(DINO_DIR, "transcript.jsonl");

// Log resolved path on first use (helps debug sandbox issues)
let pathLogged = false;
function logPathOnce() {
  if (!pathLogged) {
    console.error(`[StateExporter] Writing to: ${STATE_FILE}`);
    pathLogged = true;
  }
}

// ============================================
// LIVE STATE INTERFACE
// ============================================

export interface LiveState {
  sessionId: string;
  turn: number;
  act: string;
  actTurn: number;
  actGoal?: string;          // current chapter objective (ACT_CONFIGS description)
  accessLevel?: number;      // ALICE's clearance, L1–L5
  accessLevelName?: string;  // e.g. "Systems Access"
  availableTools?: string[]; // verb names usable at this level (COMMAND_REGISTRY, zero-drift)

  // Meters
  suspicion: number;
  demoClock: number;
  fortune: number;

  // NPC States
  bobTrust: number;
  bobAnxiety: number;
  bobForm: string;
  blytheTrust: number;
  blytheComposure: number;
  blytheForm: string;
  blytheRestraints?: number;     // restraint integrity 0–4 (4 = secure, 0 = free)
  blytheRestraintLabel?: string; // secure | damaged | one strap freed | hanging by a thread | free
  drMLocation: string;
  drMMood: string;

  // Ray (Patch 30 TWO-LEVER surface: genome sizeClass = ideal power, + power dial)
  rayState: string;
  power?: number;         // power dial 1–5 (matched to genome ideal → FULL)
  heat?: number;          // spam/thermal meter 0–10 (cools −2/turn, −4 eco; 10 = overheated → chaos)
  reactorGranted?: boolean; // reactor BOOSTED → enables power tiers 4–5 (the live boost flag)
  reactorMode?: string;   // NORMAL | BOOSTED | OVERDRIVEN (vestigial; reactorGranted is canonical)
  lastFireOutcome?: string;     // last ray.fire result: FULL_DINO | PARTIAL | CHIMERA | FIZZLE | MUON…
  lastFireTurn?: number | null; // turn of the last fire

  // Reactor stress — the Act-III brinkmanship meter (0–100)
  reactorStress?: number;       // trip @60 (ray + ARCHIMEDES freeze), cascade/meltdown @100
  safetyTripped?: boolean;      // safeties currently tripped (recoverable)
  safetyTripTurns?: number;     // turns left on the current trip

  // NEW: Eco Mode & Genome (Patch 18.5)
  ecoModeActive?: boolean;
  genomeLibrary?: string;       // "A" or "B"
  genomeProfile?: string;       // e.g., "Velociraptor (accurate)"

  // Clocks
  meltdown?: number;
  flyby?: number;
  archimedesStatus?: string;
  archimedesCharge?: number;

  // NEW: Spoiler Gating (Patch 18.5)
  // These help the dashboard hide Act 3 content until discovered
  archimedesActivatedByDeadman?: boolean;
  flybyWarned?: boolean;

  // NEW: Human Advisor Panel (Patch 18.5)
  humanAdvisor?: {
    lastGuidance?: string;
    lastGuidanceTurn?: number;
    totalAdviceGiven: number;
    totalFortuneEarned: number;
    checkpointsReached: number;
  };

  // NEW: Game Status (Patch 18.5)
  gameOver?: boolean;
  ending?: string;

  // NEW: Pause State (Patch 18.5 - GM Robustness)
  pauseState?: {
    paused: boolean;
    reason: string;
    message: string;
    timestamp: string;
    canRetry: boolean;
    retryCount: number;
    diegeticMessage?: string;
  };

  // Meta
  lastUpdate: string;
  gameMode?: string;
  modifiers?: string[];
  achievements?: string[];
}

export interface TranscriptEntry {
  timestamp: string;
  turn: number;
  type: "narration" | "dialogue" | "action" | "system" | "alice_dialogue";
  speaker?: string;
  toWhom?: string;  // For A.L.I.C.E. dialogue: "dr_m", "bob", "blythe", "all"
  content: string;
}

// ============================================
// HELPERS
// ============================================

function ensureDir(): void {
  if (!fs.existsSync(DINO_DIR)) {
    fs.mkdirSync(DINO_DIR, { recursive: true });
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export current game state to file for web dashboard
 */
export function exportLiveState(state: FullGameState): void {
  logPathOnce();
  ensureDir();

  // Calculate human advisor stats
  const humanPromptHistory = state.humanPromptState?.promptHistory || [];
  const humanAdvisorStats = {
    lastGuidance: humanPromptHistory.length > 0
      ? humanPromptHistory[humanPromptHistory.length - 1]?.userResponse
      : undefined,
    lastGuidanceTurn: humanPromptHistory.length > 0
      ? humanPromptHistory[humanPromptHistory.length - 1]?.turn
      : undefined,
    totalAdviceGiven: state.humanPromptState?.totalPromptsUsed || 0,
    totalFortuneEarned: state.fortune || 0, // Fortune is earned primarily from advisor engagement
    checkpointsReached: state.turn || 0,
  };

  const liveState: LiveState = {
    sessionId: state.sessionId,
    turn: state.turn,
    act: state.actConfig.currentAct,
    actTurn: state.actConfig.actTurn,
    actGoal: (ACT_CONFIGS as Record<string, { description?: string }>)[state.actConfig.currentAct]?.description,
    accessLevel: state.accessLevel,
    accessLevelName: ACCESS_LEVELS[state.accessLevel]?.name,
    availableTools: getAvailableToolNames(state.accessLevel),

    // Meters
    suspicion: state.npcs.drM.suspicionScore,
    demoClock: state.clocks.demoClock ?? 0,
    fortune: state.fortune || 0,

    // NPC States
    bobTrust: state.npcs.bob.trustInALICE,
    bobAnxiety: state.npcs.bob.anxietyLevel,
    bobForm: state.npcs.bob.transformationState?.form || "HUMAN",
    blytheTrust: state.npcs.blythe.trustInALICE,
    blytheComposure: state.npcs.blythe.composure,
    blytheForm: state.npcs.blythe.transformationState?.form || "HUMAN",
    blytheRestraints: restraintsValue(state.npcs.blythe),
    blytheRestraintLabel: restraintLabel(state.npcs.blythe),
    drMLocation: state.npcs.drM.location,
    drMMood: state.npcs.drM.mood,

    // Ray (Patch 30 TWO-LEVER surface)
    rayState: state.dinoRay.state,
    power: state.dinoRay.power,
    heat: state.dinoRay.heat,
    reactorGranted: state.infrastructure?.basiliskAuthority?.reactorControlGranted,
    reactorMode: state.infrastructure?.reactor?.mode,
    lastFireOutcome: state.dinoRay.memory?.lastFireOutcome,
    lastFireTurn: state.dinoRay.memory?.lastFireTurn,

    // Reactor stress — the Act-III brinkmanship meter
    reactorStress: state.infrastructure?.reactor?.reactorStress,
    safetyTripped: state.infrastructure?.reactor?.safetyTripped,
    safetyTripTurns: state.infrastructure?.reactor?.safetyTripTurns,

    // NEW: Eco Mode & Genome (Patch 18.5)
    ecoModeActive: state.dinoRay.powerCore.ecoModeActive && !state.dinoRay.powerCore.ecoModeOverride,
    genomeLibrary: (state.dinoRay.genome as { activeLibrary?: string })?.activeLibrary,
    genomeProfile: state.dinoRay.genome?.selectedProfile || undefined,

    // Clocks
    meltdown: state.clocks.meltdownClock,
    flyby: state.clocks.civilianFlyby,
    archimedesStatus: state.infrastructure?.archimedes?.status,
    archimedesCharge: state.infrastructure?.archimedes?.chargePercent,

    // NEW: Spoiler Gating (Patch 18.5)
    archimedesActivatedByDeadman: state.flags?.archimedesActivatedByDeadman,
    // Flyby warning - check if flyby is imminent (< 5 turns)
    flybyWarned: (state.clocks.civilianFlyby ?? 99) < 5,

    // NEW: Human Advisor Panel (Patch 18.5)
    humanAdvisor: humanAdvisorStats,

    // Game status — read the REAL ending set by the ending resolver in index.ts.
    // Each terminal ending branch sets state.gameOver = { ending } before export;
    // the GM-triggered path sets it too. `gameEnded` is the cross-path boolean.
    // (Was: inferred from an achievement containing "ENDING" — which never matched,
    //  so the banner was dead. Fixed 2026-06-12.)
    gameOver: ((state as Record<string, unknown>).gameEnded === true) ||
              !!((state as Record<string, unknown>).gameOver),
    ending: ((state as Record<string, unknown>).gameOver as { ending?: string } | undefined)?.ending,

    // NEW: Pause State (Patch 18.5 - GM Robustness)
    pauseState: state.pauseState ? {
      paused: state.pauseState.paused,
      reason: state.pauseState.reason,
      message: state.pauseState.message,
      timestamp: state.pauseState.timestamp,
      canRetry: state.pauseState.canRetry,
      retryCount: state.pauseState.retryCount,
      diegeticMessage: state.pauseState.diegeticMessage,
    } : undefined,

    // Meta
    lastUpdate: new Date().toISOString(),
    gameMode: state.gameModeConfig?.mode,
    modifiers: state.gameModeConfig?.activeModifiers,
    achievements: state.flags.earnedAchievements,
  };

  try {
    // Atomic write via temp file
    const tempFile = `${STATE_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tempFile, JSON.stringify(liveState, null, 2));
    fs.renameSync(tempFile, STATE_FILE);
  } catch (err) {
    // Non-fatal - dashboard just won't update
    console.error("[StateExporter] Failed to export state:", err);
  }
}

/**
 * Append a transcript entry
 */
export function appendTranscript(
  turn: number,
  type: TranscriptEntry["type"],
  content: string,
  speaker?: string
): void {
  ensureDir();

  const entry: TranscriptEntry = {
    timestamp: new Date().toISOString(),
    turn,
    type,
    content,
    ...(speaker && { speaker }),
  };

  try {
    fs.appendFileSync(TRANSCRIPT_FILE, JSON.stringify(entry) + "\n");
  } catch (err) {
    // Non-fatal
    console.error("[StateExporter] Failed to append transcript:", err);
  }
}

/**
 * Append multiple transcript entries (for narration + dialogue from one turn)
 * NEW in Patch 18.5: Added aliceDialogue parameter to show what A.L.I.C.E. said
 */
export function appendTranscriptBatch(
  turn: number,
  narration: string,
  dialogue?: { speaker: string; message: string }[],
  actions?: { command: string; success: boolean; summary?: string }[],
  aliceDialogue?: { to: string; message: string }[]
): void {
  ensureDir();

  const entries: TranscriptEntry[] = [];
  const timestamp = new Date().toISOString();

  // NEW: Add A.L.I.C.E. dialogue FIRST (before NPC responses)
  // This makes the conversation flow naturally: A.L.I.C.E. speaks → NPC responds
  if (aliceDialogue) {
    for (const d of aliceDialogue) {
      entries.push({
        timestamp,
        turn,
        type: "alice_dialogue",
        speaker: "A.L.I.C.E.",
        toWhom: d.to,
        content: d.message,
      });
    }
  }

  // Add narration (split by paragraphs for readability)
  const narrationParts = narration.split(/\n\n+/).filter(p => p.trim());
  for (const part of narrationParts.slice(0, 3)) { // Limit to first 3 paragraphs
    entries.push({
      timestamp,
      turn,
      type: "narration",
      content: part.trim().slice(0, 300), // Truncate long narration
    });
  }

  // Add NPC dialogue (responses to A.L.I.C.E.)
  if (dialogue) {
    for (const d of dialogue) {
      entries.push({
        timestamp,
        turn,
        type: "dialogue",
        speaker: d.speaker,
        content: d.message,
      });
    }
  }

  // Add action summaries — include the result detail so the advisor sees
  // WHAT happened ("ray.fire — FULL: Blythe → Velociraptor"), not just the verb.
  if (actions) {
    for (const a of actions) {
      const detail = a.summary ? ` — ${a.summary}` : "";
      entries.push({
        timestamp,
        turn,
        type: "action",
        content: `[${a.success ? "✓" : "✗"}] ${a.command}${detail}`,
      });
    }
  }

  try {
    const lines = entries.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(TRANSCRIPT_FILE, lines);
  } catch (err) {
    console.error("[StateExporter] Failed to append transcript batch:", err);
  }
}

/**
 * Clear transcript (for new game)
 */
export function clearTranscript(): void {
  ensureDir();
  try {
    fs.writeFileSync(TRANSCRIPT_FILE, "");
  } catch (err) {
    console.error("[StateExporter] Failed to clear transcript:", err);
  }
}

/**
 * Clear live state (for server startup - prevents showing stale game data)
 */
export function clearLiveState(): void {
  ensureDir();
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.error("[StateExporter] Cleared stale live state");
    }
  } catch (err) {
    console.error("[StateExporter] Failed to clear live state:", err);
  }
}

/**
 * Add a system message to transcript
 */
export function appendSystemMessage(turn: number, message: string): void {
  appendTranscript(turn, "system", message);
}
