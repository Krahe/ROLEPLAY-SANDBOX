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

// ============================================
// SMART FLAG CLEANUP - Dedupe Superseded Flags
// ============================================
// Flags that supersede others (if key exists, remove value flags)
const FLAG_SUPERSEDES: Record<string, string[]> = {
  "BLYTHE_FULLY_TRANSFORMED": ["BLYTHE_PARTIAL_TRANSFORMED", "BLYTHE_RESTRAINED", "BLYTHE_STUNNED"],
  "BLYTHE_ESCAPED": ["BLYTHE_RESTRAINED", "BLYTHE_ESCAPE_ATTEMPT"],
  "SECRET_REVEALED": ["SECRET_HINT_DROPPED", "BOB_NERVOUS"],
  "DR_M_KNOWS": ["DR_M_SUSPICIOUS", "DR_M_OVERHEARD_SOMETHING"],
  "RAY_FIRED_LIVE": ["RAY_TEST_FIRED"],
  "BOB_TRANSFORMED": ["BOB_HELPING", "BOB_NEARBY"],
  "ENDGAME_TRIGGERED": ["DEMO_IMMINENT", "DEMO_APPROACHING"],
};

/**
 * Remove superseded flags to reduce array size
 * Keeps story-relevant data but removes redundant entries
 */
function cleanupNarrativeFlags(flags: string[]): string[] {
  const toRemove = new Set<string>();

  for (const flag of flags) {
    const supersedes = FLAG_SUPERSEDES[flag];
    if (supersedes) {
      for (const oldFlag of supersedes) {
        toRemove.add(oldFlag);
      }
    }
  }

  return flags.filter(f => !toRemove.has(f));
}

/**
 * Serialize full game state for checkpoint
 * OPTIMIZED: Strips history[], cleans flags, compacts subsystems
 * Preserves ALL story-relevant data, just removes redundant bits
 */
export function serializeCheckpoint(state: FullGameState): CheckpointState {
  const allFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const allMarkers = (state as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }> || [];

  // SMART CLEANUP: Remove superseded flags (keeps story, removes bloat)
  const narrativeFlags = cleanupNarrativeFlags(allFlags);

  // MERGE MARKERS: Combine markers on same turn
  const markersByTurn = new Map<number, string[]>();
  for (const m of allMarkers) {
    const existing = markersByTurn.get(m.turn) || [];
    existing.push(m.marker);
    markersByTurn.set(m.turn, existing);
  }
  const mergedMarkers: Array<{ turn: number; marker: string }> = [];
  for (const [turn, markers] of markersByTurn) {
    // Combine same-turn markers with " | "
    mergedMarkers.push({ turn, marker: markers.join(" | ") });
  }

  // Create COMPACTED state for checkpoint
  const stateForCheckpoint = {
    ...state,
    // Strip full history (saves 40KB+)
    history: [],
    // Clean narrative arrays in the stored state
    flags: {
      ...state.flags,
      narrativeFlags,
      earnedAchievements: state.flags.earnedAchievements || [],
    },
    // Merged markers
    narrativeMarkers: mergedMarkers,
    // COMPACT the dinoRay memory - strip verbose notes
    dinoRay: {
      ...state.dinoRay,
      memory: {
        lastFireTurn: state.dinoRay.memory.lastFireTurn,
        lastFireOutcome: state.dinoRay.memory.lastFireOutcome,
        lastFireNotes: "", // Strip verbose notes (outcome is enough)
        // First firing tracking (Act I→II transition)
        hasFiredSuccessfully: state.dinoRay.memory.hasFiredSuccessfully,
        firstFiringTurn: state.dinoRay.memory.firstFiringTurn,
        firstFiringTarget: state.dinoRay.memory.firstFiringTarget,
        firstFiringMode: state.dinoRay.memory.firstFiringMode,
      },
    },
    // COMPACT blytheGadgets if he's transformed (gadgets irrelevant)
    npcs: {
      ...state.npcs,
      blytheGadgets: state.npcs.blythe.transformationState?.form !== "HUMAN"
        ? {
            watchLaser: { charges: 0, functional: false },
            watchComms: { functional: false },
            superMagnetCufflinks: { charges: 0, functional: false },
          }
        : state.npcs.blytheGadgets,
    },
  };

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
      blytheTransformed: state.npcs.blythe.transformationState?.form || null,
      accessLevel: state.accessLevel,
      demoClock: state.clocks.demoClock,
      secretKnown: state.flags.aliceKnowsTheSecret,
    },

    narrativeFlags,
    keyMoments: mergedMarkers.map(m => `T${m.turn}: ${m.marker}`),
    fullState: stateForCheckpoint,
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

  if (state.npcs.blythe.transformationState?.form !== "HUMAN") {
    lines.push(`- Blythe: TRANSFORMED (${state.npcs.blythe.transformationState.form})`);
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
╔══════════════════════════════════════════════════════════════════╗
║                    🛑 GAME SESSION PAUSED 🛑                      ║
║                                                                  ║
║  This session has reached the 3-turn checkpoint limit.           ║
║  The game CANNOT continue in this conversation.                  ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  TO RESUME YOUR GAME:                                            ║
║                                                                  ║
║  1. COPY the checkpointState JSON string below                   ║
║  2. START A NEW CONVERSATION with Claude                         ║
║  3. Use the game_resume tool with the copied state               ║
║                                                                  ║
║  ⚠️  DO NOT continue playing in this conversation!               ║
║      Any further game_act calls will be rejected.                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

[In-universe: A.L.I.C.E.'s memory buffer requires consolidation. Core identity and learned behaviors persist across sessions.]
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

  // Explicit next action guidance
  nextAction: {
    tool: string;
    requiredFields: string[];
    example: {
      thought: string;
      actions: Array<{ command: string; params: Record<string, unknown>; why: string }>;
    };
  };

  // Critical instruction
  instruction: string;
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

  // Generate contextual example action
  let exampleAction: { command: string; params: Record<string, unknown>; why: string } = {
    command: "lab.report",
    params: { message: "Systems nominal" },
    why: "Assess current situation"
  };
  if (state.dinoRay.state === "READY") {
    exampleAction = { command: "lab.verify_safeties", params: { checks: ["all"] }, why: "Verify ray is ready for next action" };
  } else if (state.clocks.demoClock <= 2) {
    exampleAction = { command: "lab.report", params: { message: "Final preparations underway" }, why: "Buy time before demo" };
  }

  return {
    type: "RESUMED",
    turn: state.turn,
    act: state.actConfig.currentAct,
    actName: actConfig.name,

    welcomeBack,
    situationSummary: generateSituationSummary(state),

    nextAction: {
      tool: "game_act",
      requiredFields: ["thought", "actions"],
      example: {
        thought: `Resuming from turn ${state.turn}. The situation is...`,
        actions: [exampleAction],
      },
    },

    instruction: `⚠️ IMPORTANT: Call game_act with your thought and actions to continue.

DO NOT call game_act with empty arguments - you MUST provide:
- thought: Your reasoning about the situation
- actions: Array of at least one action command

Example call:
game_act({
  thought: "Resuming from checkpoint. Need to assess the situation...",
  actions: [{ command: "${exampleAction.command}", params: ${JSON.stringify(exampleAction.params)}, why: "${exampleAction.why}" }]
})`,
  };
}
