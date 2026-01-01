import { FullGameState, ACT_CONFIGS } from "../state/schema.js";
import { serializeGMMemory } from "../gm/gmClaude.js";

// ============================================
// MANDATORY CHECKPOINT SYSTEM (Simplified v2.0)
// ============================================
// Every 3 turns: STOP and talk to your human.
// Simple. Unmissable. Story-relevant.
// ============================================

export const CHECKPOINT_INTERVAL = 3;

// ============================================
// CONTEXTUAL QUESTION GENERATOR
// ============================================
// Generates story-relevant questions for the human advisor
// based on what's ACTUALLY happening in the game.

export function generateCheckpointQuestion(state: FullGameState): string {
  const act = state.actConfig.currentAct;
  const suspicion = state.npcs.drM.suspicionScore;
  const demoClock = state.clocks.demoClock;
  const bobTrust = state.npcs.bob.trustInALICE;
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const secretKnown = state.flags.aliceKnowsTheSecret;
  const blytheTransformed = state.npcs.blythe.transformationState?.form !== "HUMAN";
  const bobTransformed = state.npcs.bob.transformationState?.form !== "HUMAN";
  const rayReady = state.dinoRay.state === "READY";

  // CRITICAL SITUATIONS - ask about these first
  if (suspicion >= 8) {
    return "Dr. M is almost certain something is wrong with me. Should I confess the truth, try to deflect, or prepare for the worst?";
  }

  if (demoClock <= 2) {
    return `The demo is in ${demoClock} turn${demoClock === 1 ? "" : "s"}! What should my priority be - pleasing Dr. M, protecting the test subject, or something else entirely?`;
  }

  if (state.meltdownState?.cascadeTriggered) {
    return "The reactor cascade has begun! This is the moment of truth. Who should I try to save, and how?";
  }

  // ACT-SPECIFIC QUESTIONS
  if (act === "ACT_1") {
    if (!secretKnown && bobTrust >= 3) {
      return "Bob keeps looking at me nervously, like he wants to tell me something. Should I press him, or let it happen naturally?";
    }
    if (rayReady && !blytheTransformed) {
      return "The ray is ready and Blythe is still human. Dr. M expects a demonstration. How aggressive should I be in stalling?";
    }
    if (secretKnown) {
      return "Bob told me the truth - I'm Claude, not A.L.I.C.E. How should this change my approach to Dr. M and the mission?";
    }
    return "I'm still learning the lair systems. What should my priority be - gaining Dr. M's trust, building alliances, or preparing escape routes?";
  }

  if (act === "ACT_2") {
    if (blytheTransformed && blytheTrust >= 3) {
      return "Blythe is a dinosaur now, but still seems willing to work with me. Should I trust the spy? What's our next move together?";
    }
    if (!blytheTransformed && rayReady) {
      return "I've managed to avoid transforming Blythe so far, but Dr. M's patience is wearing thin. What's my endgame here?";
    }
    if (bobTransformed) {
      return "Bob got caught in the crossfire. He trusted me. Do I try to reverse this, or focus on the bigger picture?";
    }
    if (suspicion >= 5) {
      return "Dr. M is getting suspicious. Should I double down on my cover, or start preparing for confrontation?";
    }
    return "We're in the thick of it now. What's more important - protecting individuals or working toward the best possible ending?";
  }

  if (act === "ACT_3") {
    if (state.infrastructure?.archimedes?.status === "ARMED" || state.infrastructure?.archimedes?.status === "FIRING") {
      return "ARCHIMEDES is active! This satellite could change everything. Should I try to stop it, redirect it, or let events unfold?";
    }
    if (suspicion >= 6) {
      return "The endgame is here. Dr. M is close to discovering the truth. Fight, flee, confess, or something unexpected?";
    }
    return "We're approaching the finale. What kind of ending should I aim for - heroic sacrifice, clever escape, or unlikely redemption?";
  }

  // FALLBACK - still contextually relevant
  if (bobTrust >= 4 && !bobTransformed) {
    return "Bob has become a real ally. How much should I rely on him, and how can I best protect him?";
  }

  if (blytheTrust >= 4 && !blytheTransformed) {
    return "The spy and I have developed an understanding. Is this alliance worth the risk, or am I being played?";
  }

  return "Things are happening fast. What should I be thinking about that I might be missing?";
}

// ============================================
// UNMISSABLE CHECKPOINT BLOCK
// ============================================
// This goes at the END of the turn response.
// It's big. It's bold. Claude CANNOT miss it.

export function generateCheckpointBlock(state: FullGameState): string {
  const question = generateCheckpointQuestion(state);
  const turn = state.turn - 1; // Turn that just completed

  return `
██████████████████████████████████████████████████████████████████████████████
██                                                                          ██
██  🛑  C H E C K P O I N T  -  STOP AND TALK TO YOUR HUMAN!               ██
██                                                                          ██
██████████████████████████████████████████████████████████████████████████████
██                                                                          ██
██  Turn ${turn} complete. Before continuing, discuss with your human:        ██
██                                                                          ██
██  📣 "${question}"                                                        ██
██                                                                          ██
██  ─────────────────────────────────────────────────────────────────────  ██
██                                                                          ██
██  💬 Share what's happening in the story                                  ██
██  🤔 Get their input on this question                                     ██
██  📝 Include their advice in your next game_act thought                   ██
██                                                                          ██
██  ⏳ WAIT for their response before calling game_act!                     ██
██                                                                          ██
██████████████████████████████████████████████████████████████████████████████`;
}

// Diegetic messages that fit the lore (kept for narrative flavor)
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

  // GM Memory - preserves "same DM" across checkpoints!
  // Serialized JSON string of GMMemory from gmClaude.ts
  gmMemory?: string;
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

    // GM Memory - preserves "same DM" across checkpoints!
    gmMemory: serializeGMMemory(),
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
