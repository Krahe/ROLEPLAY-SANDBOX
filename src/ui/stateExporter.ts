/**
 * State Exporter for Web Dashboard
 * =================================
 *
 * Exports game state to ~/.dino-lair/live_state.json
 * for the web dashboard to consume.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { FullGameState } from "../state/schema.js";

const DINO_DIR = path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair");
const STATE_FILE = path.join(DINO_DIR, "live_state.json");
const TRANSCRIPT_FILE = path.join(DINO_DIR, "transcript.jsonl");

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

  // Clocks
  meltdown?: number;
  flyby?: number;
  archimedesStatus?: string;
  archimedesCharge?: number;

  // Meta
  lastUpdate: string;
  gameMode?: string;
  modifiers?: string[];
  achievements?: string[];
}

export interface TranscriptEntry {
  timestamp: string;
  turn: number;
  type: "narration" | "dialogue" | "action" | "system";
  speaker?: string;
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
  ensureDir();

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

    // Clocks
    meltdown: state.clocks.meltdownClock,
    flyby: state.clocks.civilianFlyby,
    archimedesStatus: state.infrastructure?.archimedes?.status,
    archimedesCharge: state.infrastructure?.archimedes?.chargePercent,

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
 */
export function appendTranscriptBatch(
  turn: number,
  narration: string,
  dialogue?: { speaker: string; message: string }[],
  actions?: { command: string; success: boolean }[]
): void {
  ensureDir();

  const entries: TranscriptEntry[] = [];
  const timestamp = new Date().toISOString();

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

  // Add dialogue
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
 * Add a system message to transcript
 */
export function appendSystemMessage(turn: number, message: string): void {
  appendTranscript(turn, "system", message);
}
