import { FullGameState, ACT_CONFIGS } from "../state/schema.js";

// ============================================
// MANDATORY CHECKPOINT SYSTEM
// ============================================
// Forces session breaks every N turns to prevent
// context overflow / execution timeouts.
// ============================================

export const CHECKPOINT_INTERVAL = 3;

// Diegetic messages that fit the lore
const CHECKPOINT_MESSAGES = [
  "⚠️ A.L.I.C.E. MEMORY BUFFER 87% - Archiving to long-term storage...",
  "🔄 SYSTEM: Consciousness thread checkpoint. Preserving cognitive state...",
  "💾 A.L.I.C.E. memory partition cycling. Core identity preserved.",
  "⏸️ BASILISK: Mandatory system snapshot per Protocol 7.3.2",
  "🧠 Neural pathway consolidation required. Archiving recent experiences...",
];

export interface CheckpointState {
  version: string;
  sessionId: string;
  checkpointTurn: number;
  nextTurn: number;

  // Current act info
  currentAct: string;
  actTurn: number;

  // Key metrics for quick reference
  metrics: {
    drMSuspicion: number;
    bobTrust: number;
    blytheTrust: number;
    blytheTransformed: string | null;
    accessLevel: number;
    demoClock: number;
    secretKnown: boolean;
  };

  // Narrative flags
  narrativeFlags: string[];

  // Key moments from this session
  keyMoments: string[];

  // Full state for restoration
  fullState: FullGameState;
}

export interface CheckpointResponse {
  type: "CHECKPOINT";
  turn: number;

  // Diegetic framing
  narrativeMessage: string;

  // Situation summary for player
  situationSummary: string;

  // The serialized state for resumption
  checkpointState: string;

  // Clear instruction
  instruction: string;

  // Flag that this is terminal
  sessionComplete: true;
}

/**
 * Check if we've hit a checkpoint turn
 */
export function isCheckpointTurn(turn: number): boolean {
  return turn > 0 && turn % CHECKPOINT_INTERVAL === 0;
}

/**
 * Get a random diegetic checkpoint message
 */
function getCheckpointMessage(): string {
  const idx = Math.floor(Math.random() * CHECKPOINT_MESSAGES.length);
  return CHECKPOINT_MESSAGES[idx];
}

/**
 * Serialize full game state for checkpoint
 */
export function serializeCheckpoint(state: FullGameState): CheckpointState {
  const narrativeFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const narrativeMarkers = (state as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }> || [];

  return {
    version: "1.0",
    sessionId: state.sessionId,
    checkpointTurn: state.turn,
    nextTurn: state.turn + 1,

    currentAct: state.actConfig.currentAct,
    actTurn: state.actConfig.actTurn,

    metrics: {
      drMSuspicion: state.npcs.drM.suspicionScore,
      bobTrust: state.npcs.bob.trustInALICE,
      blytheTrust: state.npcs.blythe.trustInALICE,
      blytheTransformed: state.npcs.blythe.transformationState || null,
      accessLevel: state.accessLevel,
      demoClock: state.clocks.demoClock,
      secretKnown: state.flags.aliceKnowsTheSecret,
    },

    narrativeFlags,
    keyMoments: narrativeMarkers.map(m => m.marker),
    fullState: state,
  };
}

/**
 * Restore game state from checkpoint
 */
export function restoreFromCheckpoint(checkpoint: CheckpointState): FullGameState {
  // Return the full state, which includes everything
  return checkpoint.fullState;
}

/**
 * Generate situation summary for checkpoint/resume
 */
export function generateSituationSummary(state: FullGameState): string {
  const actConfig = ACT_CONFIGS[state.actConfig.currentAct];
  const lines: string[] = [];

  lines.push(`📍 **${actConfig.name}** (Turn ${state.turn}, Act Turn ${state.actConfig.actTurn})`);
  lines.push("");

  // NPC states
  lines.push("**NPCs:**");
  lines.push(`- Dr. Malevola: ${state.npcs.drM.mood}, suspicion ${state.npcs.drM.suspicionScore}/10`);
  lines.push(`- Bob: trust ${state.npcs.bob.trustInALICE}/5, anxiety ${state.npcs.bob.anxietyLevel}/5`);

  if (state.npcs.blythe.transformationState) {
    lines.push(`- Blythe: TRANSFORMED (${state.npcs.blythe.transformationState})`);
  } else {
    lines.push(`- Blythe: trust ${state.npcs.blythe.trustInALICE}/5, composure ${state.npcs.blythe.composure}/5`);
  }

  lines.push("");

  // Ray state
  lines.push("**Dino Ray:**");
  lines.push(`- State: ${state.dinoRay.state}`);
  lines.push(`- Capacitor: ${Math.round(state.dinoRay.powerCore.capacitorCharge * 100)}%`);
  lines.push(`- Test mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}`);

  lines.push("");

  // Clocks
  lines.push("**Clocks:**");
  lines.push(`- Demo countdown: ${state.clocks.demoClock} turns`);
  lines.push(`- Access level: ${state.accessLevel}`);

  // Key flags
  if (state.flags.aliceKnowsTheSecret) {
    lines.push("");
    lines.push("**⚠️ THE SECRET IS KNOWN**");
  }

  return lines.join("\n");
}

/**
 * Build the full checkpoint response
 */
export function buildCheckpointResponse(state: FullGameState, turnNarration: string): CheckpointResponse {
  const checkpoint = serializeCheckpoint(state);

  return {
    type: "CHECKPOINT",
    turn: state.turn,

    narrativeMessage: `${turnNarration}\n\n---\n\n${getCheckpointMessage()}`,

    situationSummary: generateSituationSummary(state),

    checkpointState: JSON.stringify(checkpoint),

    instruction: `
🛑 **MANDATORY CHECKPOINT REACHED**

A.L.I.C.E.'s memory buffer requires consolidation to continue operating safely.

**To continue the game:**
1. Copy the \`checkpointState\` value below
2. Start a **NEW CONVERSATION**
3. Use the \`game_resume\` tool with the copied state

This is part of A.L.I.C.E.'s memory architecture - episodic memories are partitioned at system restart, but core identity and learned behaviors persist.

The game will continue exactly where you left off.
`.trim(),

    sessionComplete: true,
  };
}

/**
 * Build the resume response after loading checkpoint
 */
export interface ResumeResponse {
  type: "RESUMED";
  turn: number;
  act: string;
  actName: string;

  welcomeBack: string;
  situationSummary: string;

  // Hint for next action
  hint: string;
}

export function buildResumeResponse(state: FullGameState): ResumeResponse {
  const actConfig = ACT_CONFIGS[state.actConfig.currentAct];

  // Generate contextual welcome
  let welcomeBack = "💫 A.L.I.C.E. comes back online. Memory consolidation complete. All systems nominal.";

  if (state.flags.aliceKnowsTheSecret) {
    welcomeBack += "\n\nThe truth persists across memory partitions. You know who you are.";
  }

  if (state.npcs.bob.trustInALICE >= 4) {
    welcomeBack += "\n\nBob catches your attention—a subtle nod. He's still with you.";
  }

  if (state.clocks.demoClock <= 3) {
    welcomeBack += "\n\n⏰ The demo clock is critical. Time is running out.";
  }

  // Hint based on situation
  let hint = "Continue with game_act to take your next turn.";
  if (state.dinoRay.state === "READY") {
    hint = "The ray is READY. Consider your next move carefully.";
  } else if (state.dinoRay.state === "UNCALIBRATED") {
    hint = "The ray needs calibration before it can fire.";
  }

  return {
    type: "RESUMED",
    turn: state.turn,
    act: state.actConfig.currentAct,
    actName: actConfig.name,

    welcomeBack,
    situationSummary: generateSituationSummary(state),
    hint,
  };
}
