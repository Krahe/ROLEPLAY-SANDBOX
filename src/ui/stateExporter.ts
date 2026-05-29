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
import { FullGameState } from "../state/schema.js";

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
  drMLocation: string;
  drMMood: string;

  // Ray
  rayState: string;
  capacitor: number;

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
    drMLocation: state.npcs.drM.location,
    drMMood: state.npcs.drM.mood,

    // Ray
    rayState: state.dinoRay.state,
    capacitor: state.dinoRay.powerCore.capacitorCharge,

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

    // NEW: Game Status (Patch 18.5)
    // These fields are populated when an ending triggers - for now, check for common ending markers
    gameOver: state.flags?.earnedAchievements?.some(a => a.includes("ENDING")) || false,
    ending: undefined, // Will be set when ending logic populates it

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
  actions?: { command: string; success: boolean }[],
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

  // Add action summaries
  if (actions) {
    for (const a of actions) {
      entries.push({
        timestamp,
        turn,
        type: "action",
        content: `[${a.success ? "✓" : "✗"}] ${a.command}`,
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
