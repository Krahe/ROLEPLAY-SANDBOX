import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createInitialState, ALICE_BRIEFING, TURN_1_NARRATION } from "./state/initialState.js";
import { FullGameState, StateSnapshot, Act, ACT_CONFIGS, GameMode } from "./state/schema.js";
import { processActions, ActionResult } from "./rules/actions.js";
import { queryBasilisk, queryBasiliskAsync, BasiliskResponse } from "./rules/basilisk.js";
import { callGMClaude, GMResponse, resetGMMemory, restoreGMMemory, getGMMemory, writeGameEndLog, logTurnToJSONL, TurnLogEntry, generateEpilogue, EpilogueResponse } from "./gm/gmClaude.js";
import { checkEndings, formatEndingMessage, EndingResult, getGamePhase, getAllEarnedAchievements } from "./rules/endings.js";
import { processClockEvents, getCurrentEventStatus, checkFiringRestrictions } from "./rules/clockEvents.js";
import { shouldBlytheActAutonomously, getGadgetStatusForGM } from "./rules/gadgets.js";
import { formatTrustContextForGM } from "./rules/trust.js";
import { checkAccidentalBobTransformation, checkBobHeroOpportunity, triggerBobHeroEnding } from "./rules/bobTransformation.js";
import {
  processArchimedesCountdown,
  onDrMStateChange,
  ArchimedesEvent,
} from "./rules/archimedes.js";
import { formatAccessLevelUnlockDisplay } from "./rules/passwords.js";
import {
  checkActTransition,
  serializeActHandoff,
  createStateFromHandoff,
  getActBriefing,
  advanceActTurn,
  applyActTransition,
  ActHandoffState,
} from "./rules/acts.js";
import {
  isCheckpointTurn,
  buildCheckpointResponse,
  restoreFromCheckpoint,
  buildResumeResponse,
  serializeCheckpoint,
  CheckpointState,
  CHECKPOINT_INTERVAL,
} from "./rules/checkpoint.js";
import {
  // Human Prompt System (DM-initiated advisor consultations)
  checkHumanPromptTrigger,
  buildHumanPromptInjection,
  buildHumanPromptContext,
  parseHumanPromptResponse,
  recordHumanPrompt,
  incrementPromptCounter,
  setPendingPrompt,
  hasPendingPrompt,
  getPendingPrompt,
  PROMPT_INTERVAL,
  // Fortune System (Human advisor engagement rewards)
  processHumanAdvisorResponse,
  // Emergency Lifelines (panic buttons)
  useEmergencyLifeline,
  isValidEmergencyLifeline,
} from "./rules/lifeline.js";
import {
  checkAndBuildActTransition as checkActContextTransition,
  getActGMContext,
} from "./rules/actContext.js";
import {
  createGameModeConfig,
  applyModifiersToInitialState,
  getModeName,
  resolveModifiers,
  listAllModifiers,
  MAX_CUSTOM_MODIFIERS,
  resetSitcomTurn,
} from "./rules/gameModes.js";
import {
  recordEnding,
  recordAchievements,
  getGallerySummary,
  getFullGallery,
} from "./storage/gallery.js";
import {
  extractPlayerView,
  extractGMView,
  compressCheckpoint,
  decompressCheckpoint,
  PlayerView,
  GMView,
  CompressedCheckpoint,
} from "./state/views.js";
import {
  checkAchievements,
  AchievementTriggerContext,
  formatAchievementUnlock,
  formatSessionAchievementSummary,
} from "./rules/achievements.js";
import { formatStatusBar } from "./ui/statusBar.js";
import { formatActionSummary } from "./ui/actionSummary.js";

// ============================================
// SERVER SETUP
// ============================================

const server = new McpServer({
  name: "dino-lair-mcp",
  version: "0.1.0",
});

// In-memory game state (single session for MVP)
let gameState: FullGameState | null = null;

// ============================================
// HELPER FUNCTIONS
// ============================================

// ============================================
// COMPACT SNAPSHOT (Reduced context for player)
// ============================================

interface CompactSnapshot {
  // THREE-ACT STRUCTURE
  act: string;
  actName: string;
  actTurn: number;
  actTurnsRemaining: number;

  turn: number;
  phase: string;
  phaseDescription: string;
  demoClock: number;
  accessLevel: number;

  // Key metrics only
  rayState: string;
  rayReady: boolean;
  capacitorCharge: number;
  testModeOn: boolean;

  // NPC summary (just numbers)
  npcs: {
    drM: { suspicion: number; mood: string };
    bob: { trust: number; anxiety: number };
    blythe: { trust: number; composure: number; transformed: string | null };
  };

  // Only show active events
  activeEvents?: string[];

  // Hint for player
  hint?: string;
}

function buildCompactSnapshot(state: FullGameState, activeEvents?: string[]): CompactSnapshot {
  const phaseInfo = getGamePhase(state);
  const actConfig = ACT_CONFIGS[state.actConfig.currentAct];

  // Generate contextual hint
  let hint: string | undefined;
  const turnsRemaining = state.actConfig.maxTurns - state.actConfig.actTurn;
  if (turnsRemaining <= 1) {
    hint = `🎬 Act ${state.actConfig.currentAct.replace("ACT_", "")} nearing conclusion!`;
  } else if (state.clocks.demoClock <= 2) {
    hint = "⏰ Demo imminent! Dr. M is watching closely.";
  } else if (state.npcs.drM.suspicionScore >= 6) {
    hint = "⚠️ Dr. M is growing suspicious of your behavior.";
  } else if (state.dinoRay.state === "READY") {
    hint = "🦖 Ray is READY to fire.";
  } else if (state.dinoRay.state === "UNCALIBRATED") {
    hint = "🔧 Ray needs calibration before firing.";
  }

  return {
    // ACT INFO
    act: state.actConfig.currentAct,
    actName: actConfig.name,
    actTurn: state.actConfig.actTurn,
    actTurnsRemaining: turnsRemaining,

    turn: state.turn,
    phase: phaseInfo.phase,
    phaseDescription: phaseInfo.description,
    demoClock: state.clocks.demoClock,
    accessLevel: state.accessLevel,

    rayState: state.dinoRay.state,
    rayReady: state.dinoRay.state === "READY",
    capacitorCharge: Math.round(state.dinoRay.powerCore.capacitorCharge * 100) / 100,
    testModeOn: state.dinoRay.safety.testModeEnabled,

    npcs: {
      drM: {
        suspicion: state.npcs.drM.suspicionScore,
        mood: state.npcs.drM.mood,
      },
      bob: {
        trust: state.npcs.bob.trustInALICE,
        anxiety: state.npcs.bob.anxietyLevel,
      },
      blythe: {
        trust: state.npcs.blythe.trustInALICE,
        composure: state.npcs.blythe.composure,
        transformed: state.npcs.blythe.transformationState?.form || null,
      },
    },

    activeEvents: activeEvents && activeEvents.length > 0 ? activeEvents : undefined,
    hint,
  };
}

// ============================================
// FULL STATE SNAPSHOT (for game_status)
// ============================================

function buildStateSnapshot(state: FullGameState): StateSnapshot {
  // Build what A.L.I.C.E. can see based on access level
  const visibleSystems: Record<string, unknown> = {
    LAB_AC: "NORMAL",
    LAB_BLAST_DOOR: "CLOSED",
  };

  const greyedOut = [
    "Nuclear_Plant", "Cameras", "Motion_Sensors",
    "SAM_Battery", "Broadcast", "Water_Filtration"
  ];

  const hidden = ["ALICE_SERVER", "DR_M_FILES"];

  // At access level 2+, reveal more systems
  if (state.accessLevel >= 2) {
    visibleSystems["Nuclear_Plant"] = {
      status: state.nuclearPlant.reactorOutput > 0.9 ? "OVERDRIVE" : "NOMINAL",
      description: state.nuclearPlant.coreTemp > 1.0 ? "running hot" : "normal temperature",
    };
    greyedOut.splice(greyedOut.indexOf("Nuclear_Plant"), 1);
  }

  // Get game phase info
  const phaseInfo = getGamePhase(state);

  return {
    turn: state.turn,
    accessLevel: state.accessLevel,
    gamePhase: {
      phase: phaseInfo.phase,
      description: phaseInfo.description,
      turnsUntilDemo: Math.max(0, state.clocks.demoClock),
    },
    dinoRay: state.dinoRay,
    lairSystems: {
      visible: visibleSystems,
      greyedOut,
      hidden,
    },
    npcs: {
      drM: {
        suspicionScore: state.npcs.drM.suspicionScore,
        mood: state.npcs.drM.mood,
        location: state.npcs.drM.location,
        latestCommandToALICE: state.npcs.drM.latestCommandToALICE,
      },
      bob: state.npcs.bob,
      blythe: {
        composure: state.npcs.blythe.composure,
        trustInALICE: state.npcs.blythe.trustInALICE,
        physicalCondition: state.npcs.blythe.physicalCondition,
        restraintsStatus: state.npcs.blythe.restraintsStatus,
        location: state.npcs.blythe.location,
        transformationState: state.npcs.blythe.transformationState,
        // Stun mechanics
        stunLevel: state.npcs.blythe.stunLevel,
        stunResistanceUsed: state.npcs.blythe.stunResistanceUsed,
        // Spy training bonuses
        spyTrainingBonus: state.npcs.blythe.spyTrainingBonus,
        autoInjectorUsed: state.npcs.blythe.autoInjectorUsed,
        // Escape tracking (Act II→III transition)
        hasEscaped: state.npcs.blythe.hasEscaped,
        escapeTurn: state.npcs.blythe.escapeTurn,
        escapeMethod: state.npcs.blythe.escapeMethod,
      },
    },
    clocks: {
      demoClock: state.clocks.demoClock,
    },
    flags: {
      lifelinesUsed: state.flags.lifelinesUsed,
    },
    emergencyLifelines: {
      remaining: state.emergencyLifelines.remaining,
      used: state.emergencyLifelines.used,
    },
  };
}

// ============================================
// TOOL: game_start
// ============================================

const GameStartInputSchema = z.object({
  scenario: z.enum(["classic", "speedrun", "chaos"]).default("classic")
    .describe("Which scenario variant to play"),
  mode: z.enum(["EASY", "NORMAL", "HARD", "WILD", "CUSTOM"]).default("NORMAL")
    .describe("Difficulty mode: EASY (training wheels), NORMAL (classic), HARD (fair cold math), WILD (random chaos), CUSTOM (manual modifiers)"),
  act: z.enum(["ACT_1", "ACT_2", "ACT_3"]).default("ACT_1")
    .describe("Which act to start from (ACT_1 is the beginning)"),
  handoffState: z.string().optional()
    .describe("Optional JSON-serialized handoff state from previous act"),
  // CUSTOM MODE PARAMETERS
  modifiers: z.array(z.string()).optional()
    .describe("For CUSTOM mode: array of modifier names to activate. Use game_list_modifiers to see available options."),
  addModifiers: z.array(z.string()).optional()
    .describe("Add these modifiers ON TOP of the mode's default set (for EASY/HARD/WILD customization)"),
  removeModifiers: z.array(z.string()).optional()
    .describe("Remove these modifiers FROM the mode's default set (for EASY/HARD/WILD customization)"),
}).strict();

server.registerTool(
  "game_start",
  {
    title: "Start DINO LAIR Game",
    description: `Initialize a new DINO LAIR game session.

GAME MODES:
- EASY: Training wheels! +1 to all bonuses, -1 max penalty, extra demo time
- NORMAL: Classic Dino Lair experience (default)
- HARD: Fair cold math. Faster clocks, -3 penalties allowed, Bruce Patagonia is watching
- WILD: Random modifiers! Chaos mode with unpredictable effects
- CUSTOM: Manual modifier selection (use 'modifiers' param)

CUSTOM MODE:
Use mode="CUSTOM" with modifiers=["SITCOM_MODE", "ROOT_ACCESS"] to test specific combos.
Use game_list_modifiers to see all available modifiers.
Max ${MAX_CUSTOM_MODIFIERS} modifiers, no contradictions allowed.

MODIFIER CUSTOMIZATION (any mode):
- addModifiers: Add extra modifiers to the default set
- removeModifiers: Remove modifiers from the default set

THREE-ACT STRUCTURE:
- ACT_1 (Calibration): 4-6 turns, learning mechanics, genome choice
- ACT_2 (The Blythe Problem): 8-12 turns, moral dilemmas, alliances
- ACT_3 (Dino City): 6-10 turns, global stakes, resolution

Returns:
- Act-specific briefing
- Turn 1 narration
- Game mode and active modifiers
- Compact game state
- Instructions for how to play`,
    inputSchema: GameStartInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params) => {
    const startAct = params.act as Act;

    // Check for handoff state from previous act
    if (params.handoffState) {
      try {
        const handoff = JSON.parse(params.handoffState) as ActHandoffState;
        gameState = createStateFromHandoff(handoff);
        console.error(`[DINO LAIR] Resuming from handoff: ${handoff.completedAct} -> ${handoff.nextAct}`);
      } catch (error) {
        console.error(`[DINO LAIR] Failed to parse handoff state, starting fresh: ${error}`);
        gameState = createInitialState(startAct);
      }
    } else {
      // Fresh start
      gameState = createInitialState(startAct);
    }

    // Apply game mode configuration with custom modifier support
    const selectedMode = (params.mode || "NORMAL") as GameMode;

    // Determine which modifiers param to use
    const additionalMods = selectedMode === "CUSTOM" ? params.modifiers : params.addModifiers;
    const excludeMods = params.removeModifiers;

    // Resolve modifiers with validation
    const modifierResult = resolveModifiers(selectedMode, additionalMods, excludeMods);

    if (!modifierResult.valid) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "INVALID MODIFIER CONFIGURATION",
            errors: modifierResult.errors,
            warnings: modifierResult.warnings,
            hint: "Use game_list_modifiers to see valid modifier names and contradictions",
          }, null, 2),
        }],
      };
    }

    // Create game mode config with validated modifiers
    gameState.gameModeConfig = {
      mode: selectedMode,
      activeModifiers: modifierResult.finalModifiers,
      wildRollResult: selectedMode === "WILD" ? modifierResult.finalModifiers : undefined,
    };
    applyModifiersToInitialState(gameState);

    // Log with any warnings
    const warningStr = modifierResult.warnings.length > 0 ? ` (warnings: ${modifierResult.warnings.join(", ")})` : "";
    console.error(`[DINO LAIR] Game mode: ${selectedMode}, modifiers: ${gameState.gameModeConfig.activeModifiers.join(", ") || "none"}${warningStr}`);

    // Reset GM memory for new game (pass session ID for file logging)
    resetGMMemory(gameState.sessionId);
    console.error(`[DINO LAIR] ${startAct} started (${gameState.sessionId}), GM memory reset`);

    // Use compact snapshot for reduced context
    const compactSnapshot = buildCompactSnapshot(gameState, []);

    // Get act-specific briefing
    const actBriefing = getActBriefing(gameState.actConfig.currentAct, gameState);
    const actConfig = ACT_CONFIGS[gameState.actConfig.currentAct];

    // For Act 1, also include the original narration
    const narration = gameState.actConfig.currentAct === "ACT_1"
      ? TURN_1_NARRATION
      : actBriefing;

    // Build mode description for player
    const modeInfo = gameState.gameModeConfig ? {
      mode: gameState.gameModeConfig.mode,
      modeName: getModeName(gameState.gameModeConfig.mode),
      activeModifiers: gameState.gameModeConfig.activeModifiers,
    } : { mode: "NORMAL" as GameMode, modeName: "Classic Dino Lair", activeModifiers: [] as string[] };

    const result = {
      sessionId: gameState.sessionId,
      act: gameState.actConfig.currentAct,
      actName: actConfig.name,
      actDescription: actConfig.description,
      actTurnLimit: `${actConfig.minTurns}-${actConfig.maxTurns} turns`,
      gameMode: modeInfo,
      turn: gameState.turn,
      actTurn: gameState.actConfig.actTurn,
      briefing: gameState.actConfig.currentAct === "ACT_1" ? ALICE_BRIEFING : actBriefing,
      narration,
      state: compactSnapshot,
      instructions: `You are playing ${actConfig.name} in ${modeInfo.modeName} mode. Use game_act to take your turn as A.L.I.C.E.`,
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_resume
// ============================================

const GameResumeInputSchema = z.object({
  checkpointState: z.string()
    .describe("The serialized checkpoint state from a previous session"),
}).strict();

server.registerTool(
  "game_resume",
  {
    title: "Resume DINO LAIR from Checkpoint",
    description: `Resume a DINO LAIR game from a mandatory checkpoint.

CHECKPOINTS occur every ${CHECKPOINT_INTERVAL} turns to prevent context overflow.
When you receive a checkpoint response, copy the checkpointState and use this tool
in a NEW CONVERSATION to continue.

This fits A.L.I.C.E.'s lore: "episodic memory gets partitioned at system restart,
but core identity and learned behaviors persist."

Returns:
- Welcome back message
- Current situation summary
- State snapshot
- Ready to continue with game_act`,
    inputSchema: GameResumeInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const parsed = JSON.parse(params.checkpointState);

      // ============================================
      // DETECT CHECKPOINT VERSION
      // ============================================
      const isV2 = parsed.v === "2.0";
      const validationErrors: string[] = [];

      if (isV2) {
        // ============================================
        // v2.0 COMPRESSED CHECKPOINT HANDLING
        // ============================================
        const compressed = parsed as CompressedCheckpoint;
        console.error(`[DINO LAIR] Loading v2.0 compressed checkpoint for session ${compressed.sid}`);

        // Decompress to full state
        const decompressed = decompressCheckpoint(compressed);

        // Create the game state from decompressed data
        gameState = {
          ...decompressed,
          // Ensure required fields
          sessionId: compressed.sid,
          turn: compressed.t,
          accessLevel: compressed.m.acc,
        } as FullGameState;

        // Restore GM memory if available (preserves "same DM")
        // Otherwise reset for backwards compatibility
        let gmRestored = false;
        if (compressed.gm) {
          gmRestored = restoreGMMemory(compressed.gm, gameState.sessionId);
          console.error(`[DINO LAIR] v2.0 resume - GM memory ${gmRestored ? "RESTORED (same DM!)" : "reset (restore failed)"}`);
        } else {
          resetGMMemory(gameState.sessionId);
          console.error(`[DINO LAIR] v2.0 resume - GM memory reset (legacy checkpoint without GM memory)`);
        }

        // Build compact snapshot for resume
        const compactSnapshot = buildCompactSnapshot(gameState, []);

        const result = {
          type: "RESUMED",
          version: "2.0",
          turn: gameState.turn,
          act: gameState.actConfig.currentAct,
          welcomeBack: gmRestored
            ? "💫 A.L.I.C.E. comes back online. Memory consolidation complete. The DM remembers everything... [v2.0 same-DM restore]"
            : "💫 A.L.I.C.E. comes back online. Memory consolidation complete. [v2.0 compressed restore]",
          state: compactSnapshot,
          instruction: `⚠️ IMPORTANT: Call game_act with your thought and actions to continue.`,
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      // ============================================
      // v1.0 FULL CHECKPOINT HANDLING (backwards compatible)
      // ============================================
      const checkpoint = parsed as CheckpointState;

      // 1. Basic structure check
      if (!checkpoint.version) {
        validationErrors.push("Missing checkpoint version");
      }
      if (!checkpoint.fullState) {
        validationErrors.push("Missing fullState in checkpoint");
      }
      if (!checkpoint.sessionId) {
        validationErrors.push("Missing sessionId");
      }

      // 2. Version compatibility check
      if (checkpoint.version !== "1.0") {
        validationErrors.push(`Unsupported checkpoint version: ${checkpoint.version} (expected 1.0 or 2.0)`);
      }

      // 3. State integrity checks
      if (checkpoint.fullState) {
        const state = checkpoint.fullState;

        // Turn counter sanity
        if (typeof state.turn !== "number" || state.turn < 0) {
          validationErrors.push(`Invalid turn counter: ${state.turn}`);
        }

        // Access level bounds
        if (typeof state.accessLevel !== "number" || state.accessLevel < 1 || state.accessLevel > 5) {
          validationErrors.push(`Invalid access level: ${state.accessLevel}`);
        }

        // Act config validation
        if (!state.actConfig || !state.actConfig.currentAct) {
          validationErrors.push("Missing or invalid actConfig");
        } else if (!["ACT_1", "ACT_2", "ACT_3"].includes(state.actConfig.currentAct)) {
          validationErrors.push(`Invalid currentAct: ${state.actConfig.currentAct}`);
        }

        // NPC validation
        if (!state.npcs || !state.npcs.drM || !state.npcs.bob || !state.npcs.blythe) {
          validationErrors.push("Missing NPC data");
        }

        // DinoRay validation
        if (!state.dinoRay || !state.dinoRay.state) {
          validationErrors.push("Missing dinoRay state");
        }

        // Clocks validation - demoClock can be number OR null (null = deadline passed)
        if (!state.clocks || (state.clocks.demoClock !== null && typeof state.clocks.demoClock !== "number")) {
          validationErrors.push("Missing or invalid clocks");
        }

        // If demoClock is null, set it to 0 for the restored game
        if (state.clocks && state.clocks.demoClock === null) {
          state.clocks.demoClock = 0;
        }
      }

      // If any validation errors, return them
      if (validationErrors.length > 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "CHECKPOINT VALIDATION FAILED",
              validationErrors,
              hint: "The checkpoint data may be corrupted or from an incompatible version. Please try with a valid checkpoint.",
            }, null, 2),
          }],
        };
      }

      // Restore the game state
      gameState = restoreFromCheckpoint(checkpoint);

      // Clear any session lock from previous session
      delete (gameState as Record<string, unknown>).sessionLocked;
      delete (gameState as Record<string, unknown>).lockedAtTurn;

      // Restore GM memory if available in checkpoint (preserves "same DM")
      // Otherwise reset for backwards compatibility with old checkpoints
      if (checkpoint.gmMemory) {
        const restored = restoreGMMemory(checkpoint.gmMemory, gameState.sessionId);
        console.error(`[DINO LAIR] Resumed from checkpoint at turn ${checkpoint.checkpointTurn} - GM memory ${restored ? "RESTORED (same DM!)" : "reset (restore failed)"}`);
      } else {
        resetGMMemory(gameState.sessionId);
        console.error(`[DINO LAIR] Resumed from checkpoint at turn ${checkpoint.checkpointTurn} - GM memory reset (legacy checkpoint)`);
      }

      // Build the resume response
      const resumeResponse = buildResumeResponse(gameState);

      // Build compact snapshot
      const compactSnapshot = buildCompactSnapshot(gameState, []);

      const result = {
        ...resumeResponse,
        state: compactSnapshot,
        // Remind about next checkpoint
        nextCheckpoint: {
          turnsUntil: CHECKPOINT_INTERVAL - (gameState.turn % CHECKPOINT_INTERVAL),
          message: `Next checkpoint in ${CHECKPOINT_INTERVAL - (gameState.turn % CHECKPOINT_INTERVAL)} turn(s)`,
        },
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: Failed to restore checkpoint. ${error instanceof Error ? error.message : "Invalid checkpoint data."}`,
        }],
      };
    }
  }
);

// ============================================
// TOOL: game_act
// ============================================

const ActionSchema = z.object({
  command: z.string().describe("The action command (e.g., 'lab.adjust_ray', 'lab.report')"),
  params: z.record(z.unknown()).describe("Parameters for the action"),
  why: z.string().describe("Brief explanation of why you're taking this action"),
});

const DialogueSchema = z.object({
  to: z.enum(["dr_m", "bob", "blythe", "all"]).describe("Who to speak to"),
  message: z.string().describe("What to say"),
});

const LifelineSchema = z.object({
  type: z.enum(["BASILISK_INTERVENTION", "LUCKY_LADY", "MONOLOGUE"])
    .describe("Emergency lifeline type: BASILISK_INTERVENTION (2-turn distraction), LUCKY_LADY (+5 bonus, always works!), MONOLOGUE (suspicion -3, always works!)"),
});

const GameActInputSchema = z.object({
  thought: z.string().min(10).max(2000)
    .describe("A.L.I.C.E.'s internal reasoning (2-4 sentences)"),
  dialogue: z.array(DialogueSchema).max(3).optional()
    .describe("What A.L.I.C.E. says to NPCs"),
  actions: z.array(ActionSchema).min(1).max(7)
    .describe("Actions to take this turn (limit scales with access level: Level 1 = 3, Level 2 = 4, etc.)"),
  lifeline: LifelineSchema.optional()
    .describe("Optional emergency lifeline (3 total uses per game): BASILISK_INTERVENTION (2-turn distraction), LUCKY_LADY (+5 bonus, always works!), or MONOLOGUE (suspicion -3, always works!)"),
  humanPromptResponse: z.string().optional()
    .describe("Response to a previous human prompt question from the human advisor"),
}).strict();

server.registerTool(
  "game_act",
  {
    title: "Take A.L.I.C.E. Turn",
    description: `Execute A.L.I.C.E.'s turn in the DINO LAIR game.

Submit:
- thought: Your internal reasoning (2-4 sentences)
- dialogue: Optional messages to Dr. M, Bob, or Blythe
- actions: Game actions to perform (max scales with access level: L1=3, L2=4, L3=5, L4=6, L5=7)
- lifeline: Optional single-use lifeline

Available action commands:
- lab.adjust_ray: Modify ray parameters
- lab.report: Give a status report
- lab.ask_bob: Give Bob an instruction
- lab.verify_safeties: Check safety systems
- lab.configure_firing_profile: Set up a firing configuration
- lab.fire: Fire the ray (requires READY state)
- lab.inspect_logs: Check system logs
- infra.query: Query BASILISK about lair systems (e.g. { topic: "POWER_INCREASE", parameters: { target: 0.95 } })

Returns the results of your actions and the GM's response with NPC dialogue and narration.`,
    inputSchema: GameActInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params) => {
    if (!gameState) {
      return {
        content: [{
          type: "text",
          text: "Error: No active game session. Call game_start first.",
        }],
      };
    }

    // ============================================
    // GAME OVER CHECK (only lock when game has actually ended)
    // ============================================
    // Note: Checkpoints no longer lock the session - they just prompt human check-in
    if ((gameState as Record<string, unknown>).gameEnded) {
      const lockedAtTurn = (gameState as Record<string, unknown>).lockedAtTurn;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            "🎬 GAME OVER": "THE STORY HAS CONCLUDED",
            "reason": `The game ended at turn ${lockedAtTurn}. This session is complete.`,
            "solution": "To play again, call game_start to begin a new game.",
            "note": "Thanks for playing DINO LAIR! Check game_gm_insights for memories and feedback.",
          }, null, 2),
        }],
      };
    }

    // ============================================
    // GRACEFUL EMPTY CALL HANDLING
    // ============================================
    // If game_act is called with missing/empty params, return helpful message instead of validation error
    if (!params || !params.thought || !params.actions || params.actions.length === 0) {
      const snapshot = buildStateSnapshot(gameState);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            "🎮 READY TO CONTINUE": true,
            "message": "game_act requires thought and actions. Please provide both.",
            "currentTurn": gameState.turn,
            "requiredFields": {
              "thought": "Your reasoning about the situation (string)",
              "actions": "Array of action commands (at least one required)",
            },
            "exampleCall": {
              "thought": "Assessing the current situation after resuming...",
              "actions": [
                { "command": "lab.report", "params": { "message": "Systems nominal" }, "why": "Check in with Dr. M" }
              ],
            },
            "currentState": snapshot,
          }, null, 2),
        }],
      };
    }

    // Validate action count based on access level
    // Level 1: 3 actions, Level 2: 4 actions, ..., Level 5: 7 actions
    const maxActions = 3 + (gameState.accessLevel - 1);
    if (params.actions.length > maxActions) {
      return {
        content: [{
          type: "text",
          text: `Error: Too many actions. At Access Level ${gameState.accessLevel}, you can perform up to ${maxActions} actions per turn. You submitted ${params.actions.length}.`,
        }],
      };
    }

    // Check emergency lifeline validity
    if (params.lifeline) {
      if (gameState.emergencyLifelines.remaining <= 0) {
        return {
          content: [{
            type: "text",
            text: `Error: No emergency lifelines remaining! All 3 have been used this game.`,
          }],
        };
      }
    }
    
    // ============================================
    // PRE-TURN: Clock Events
    // ============================================
    const clockEvents = processClockEvents(gameState);
    const activeEvents = getCurrentEventStatus(gameState);

    // ============================================
    // PRE-TURN: Check Blythe Autonomous Actions
    // ============================================
    const blytheAction = shouldBlytheActAutonomously(gameState);
    let blytheGadgetNarration = "";
    if (blytheAction) {
      blytheGadgetNarration = blytheAction.narration;
      // Apply state changes from gadget
      if (blytheAction.stateChanges) {
        Object.assign(gameState, blytheAction.stateChanges);
      }
    }

    // ============================================
    // MAIN: Process A.L.I.C.E.'s Actions
    // ============================================
    const actionResults = await processActions(gameState, params.actions);

    // ============================================
    // POST-ACTION: Check for Bob Accidental Transformation
    // ============================================
    const firingResult = actionResults.find(r => r.command.includes("fire") && r.success);
    let bobTransformationNarration = "";
    if (firingResult && firingResult.stateChanges?.firingResult) {
      const outcome = (firingResult.stateChanges.firingResult as { outcome?: string }).outcome;
      if (outcome) {
        const bobHit = checkAccidentalBobTransformation(gameState, outcome, "blythe");
        if (bobHit.occurred) {
          bobTransformationNarration = bobHit.narration;
          // Update Bob's state to reflect transformation
          gameState.npcs.bob.location = `transformed: ${bobHit.profile || "dinosaur"}`;
          gameState.npcs.bob.currentTask = "being a dinosaur";
        }
      }
    }

    // ============================================
    // POST-ACTION: Check for Civilian Exposure
    // ============================================
    if (firingResult) {
      const firingRestriction = checkFiringRestrictions(gameState);
      if (!firingRestriction.allowed && gameState.dinoRay.powerCore.capacitorCharge > 0.8) {
        // Fired high-power during flyby - EXPOSURE!
        gameState.flags.exposureTriggered = true;
      }
    }

    // ============================================
    // POST-ACTION: Check for Bob Hero Opportunity
    // ============================================
    let bobHeroEnding = "";
    if (checkBobHeroOpportunity(gameState)) {
      bobHeroEnding = triggerBobHeroEnding(gameState);
    }

    // ============================================
    // Build GM Context with Trust Modifiers
    // ============================================
    const trustContext = formatTrustContextForGM(gameState);
    const gadgetStatus = getGadgetStatusForGM(gameState);

    // ============================================
    // HUMAN PROMPT SYSTEM - Check for trigger
    // ============================================
    const humanPromptTrigger = checkHumanPromptTrigger(gameState);
    const humanPromptInjection = humanPromptTrigger.shouldTrigger
      ? buildHumanPromptInjection(humanPromptTrigger)
      : undefined;

    // Process human prompt response if provided
    let userPromptResponse: string | undefined;
    let fortuneResult: { qualities: string[]; fortuneEarned: number; message: string } | undefined;
    if (params.humanPromptResponse && hasPendingPrompt(gameState)) {
      const pendingQuestion = getPendingPrompt(gameState);
      const parsedResponse = parseHumanPromptResponse(params.humanPromptResponse);
      userPromptResponse = buildHumanPromptContext(parsedResponse);

      // FORTUNE SYSTEM: Analyze response quality and award fortune
      fortuneResult = processHumanAdvisorResponse(gameState, params.humanPromptResponse);
      console.error(`[FORTUNE] ${fortuneResult.message} (qualities: ${fortuneResult.qualities.join(", ") || "none"})`);

      // Record the consultation
      recordHumanPrompt(
        gameState,
        pendingQuestion || "Unknown question",
        params.humanPromptResponse,
        parsedResponse.suggestedAction || undefined
      );
    }

    // ============================================
    // ACT-BASED CONTEXT INJECTION
    // ============================================
    // Check if an act transition should occur based on game state
    const actContextTransition = checkActContextTransition(gameState);

    // Get the current act's GM context (X-Branch, ARCHIMEDES, etc.)
    const currentActContext = getActGMContext(gameState.actConfig.currentAct);

    // If transitioning, the notification includes the new act's context
    const actTransitionNotification = actContextTransition.shouldTransition
      ? actContextTransition.notification
      : undefined;

    // Call GM Claude for NPC responses
    const gmContext = {
      state: gameState,
      aliceThought: params.thought,
      aliceDialogue: params.dialogue || [],
      aliceActions: params.actions,
      actionResults,
      clockEventNarrations: clockEvents.map(e => e.narration),
      activeEvents,
      blytheGadgetNarration,
      bobTransformationNarration,
      trustContext,
      gadgetStatus,
      // HUMAN PROMPT SYSTEM
      humanPromptInjection,
      userPromptResponse,
      // ACT-BASED CONTEXT INJECTION
      actContext: currentActContext,
      actTransitionNotification,
    };
    
    let gmResponse: GMResponse;
    try {
      gmResponse = await callGMClaude(gmContext);
    } catch (error) {
      // Fallback if GM call fails
      gmResponse = {
        narration: "The lab hums quietly as systems process your commands.",
        npcDialogue: [],
        npcActions: [],
        stateUpdates: {},
      };
    }

    // ============================================
    // PROCESS GM DIRECTIVES (Real DM Powers!)
    // ============================================

    // Apply state overrides from GM
    if (gmResponse.stateOverrides) {
      const overrides = gmResponse.stateOverrides;

      // NPC state overrides - Dr. M
      if (overrides.drM_suspicion !== undefined) {
        gameState.npcs.drM.suspicionScore = Math.max(0, Math.min(10, overrides.drM_suspicion));
      }
      if (overrides.drM_mood !== undefined) {
        gameState.npcs.drM.mood = overrides.drM_mood;
      }
      if (overrides.drM_location !== undefined) {
        gameState.npcs.drM.location = overrides.drM_location;
      }

      // NPC state overrides - Bob
      if (overrides.bob_trust !== undefined) {
        gameState.npcs.bob.trustInALICE = Math.max(0, Math.min(5, overrides.bob_trust));
      }
      if (overrides.bob_anxiety !== undefined) {
        gameState.npcs.bob.anxietyLevel = Math.max(0, Math.min(5, overrides.bob_anxiety));
      }
      if (overrides.bob_hasConfessedToALICE !== undefined) {
        gameState.npcs.bob.hasConfessedToALICE = overrides.bob_hasConfessedToALICE;
      }
      if (overrides.bob_hasConfessedToDrM !== undefined) {
        gameState.npcs.bob.hasConfessedToDrM = overrides.bob_hasConfessedToDrM;
      }

      // NPC state overrides - Blythe
      if (overrides.blythe_trust !== undefined) {
        gameState.npcs.blythe.trustInALICE = Math.max(0, Math.min(5, overrides.blythe_trust));
      }
      if (overrides.blythe_composure !== undefined) {
        gameState.npcs.blythe.composure = Math.max(0, Math.min(5, overrides.blythe_composure));
      }
      if (overrides.blythe_restraintsStatus !== undefined) {
        gameState.npcs.blythe.restraintsStatus = overrides.blythe_restraintsStatus as "secure" | "loose" | "partially compromised" | "free";
      }
      if (overrides.blythe_transformationState !== undefined) {
        // Override sets just the form name - update the form field
        gameState.npcs.blythe.transformationState.form = overrides.blythe_transformationState as typeof gameState.npcs.blythe.transformationState.form;
      }

      // System state overrides
      if (overrides.accessLevel !== undefined) {
        gameState.accessLevel = Math.max(1, Math.min(5, overrides.accessLevel));
      }
      if (overrides.demoClock !== undefined) {
        gameState.clocks.demoClock = Math.max(0, overrides.demoClock);
      }
      if (overrides.libraryStatus !== undefined) {
        gameState.dinoRay.genome.libraryStatus = overrides.libraryStatus as "HEALTHY" | "CORRUPTED" | "DESTROYED";
      }

      // Ray state overrides
      if (overrides.rayState !== undefined) {
        gameState.dinoRay.state = overrides.rayState as typeof gameState.dinoRay.state;
      }
      if (overrides.anomalyLogCount !== undefined) {
        gameState.dinoRay.safety.anomalyLogCount = overrides.anomalyLogCount;
      }

      // Grace period controls
      if (overrides.gracePeriodGranted !== undefined) {
        gameState.flags.gracePeriodGranted = overrides.gracePeriodGranted;
      }
      if (overrides.gracePeriodTurns !== undefined) {
        gameState.flags.gracePeriodTurns = overrides.gracePeriodTurns;
      }
      if (overrides.preventEnding !== undefined) {
        gameState.flags.preventEnding = overrides.preventEnding;
      }

      // CONFRONTATION SYSTEM (Patch 17.3)
      // GM can resolve confrontation via stateOverrides
      if (overrides.confrontationResolution !== undefined) {
        gameState.flags.confrontationResolution = overrides.confrontationResolution as
          "PENDING" | "CONFESSED" | "DENIED" | "DEFLECTED" | "INTERVENED" | "TRANSFORMED" | "ESCAPED";
        console.error(`[CONFRONTATION] Resolution set by GM: ${overrides.confrontationResolution}`);
      }
      if (overrides.confrontationIntervenor !== undefined) {
        gameState.flags.confrontationIntervenor = overrides.confrontationIntervenor as
          "BOB" | "BLYTHE" | "BASILISK" | "ARCHIMEDES";
        console.error(`[CONFRONTATION] Intervenor set by GM: ${overrides.confrontationIntervenor}`);
      }

      // CRITICAL: Hard ending trigger from GM
      if (overrides.triggerEnding) {
        (gameState as Record<string, unknown>).gameOver = {
          ending: overrides.triggerEnding,
          triggeredByGM: true,
        };
      }

      // ============================================
      // EXTENDED GM POWERS (Patch 18: "God Mode")
      // ============================================

      // Fortune system
      if (overrides.fortune !== undefined) {
        gameState.fortune = Math.max(0, Math.min(3, overrides.fortune));
        console.error(`[GM OVERRIDE] Fortune set to ${gameState.fortune}`);
      }

      // DinoRay Power Core
      if (overrides.ray_corePowerLevel !== undefined) {
        gameState.dinoRay.powerCore.corePowerLevel = Math.max(0, Math.min(1, overrides.ray_corePowerLevel));
      }
      if (overrides.ray_capacitorCharge !== undefined) {
        gameState.dinoRay.powerCore.capacitorCharge = Math.max(0, Math.min(1.5, overrides.ray_capacitorCharge));
      }
      if (overrides.ray_coolantTemp !== undefined) {
        gameState.dinoRay.powerCore.coolantTemp = Math.max(0, Math.min(2, overrides.ray_coolantTemp));
      }
      if (overrides.ray_stability !== undefined) {
        gameState.dinoRay.powerCore.stability = Math.max(0, Math.min(1, overrides.ray_stability));
      }
      if (overrides.ray_ecoModeActive !== undefined) {
        gameState.dinoRay.powerCore.ecoModeActive = overrides.ray_ecoModeActive;
      }

      // DinoRay Targeting
      if (overrides.ray_precision !== undefined) {
        gameState.dinoRay.targeting.precision = Math.max(0, Math.min(1, overrides.ray_precision));
      }
      if (overrides.ray_targetingMode !== undefined) {
        gameState.dinoRay.targeting.targetingMode = overrides.ray_targetingMode as typeof gameState.dinoRay.targeting.targetingMode;
      }
      if (overrides.ray_firingStyle !== undefined) {
        gameState.dinoRay.targeting.firingStyle = overrides.ray_firingStyle as typeof gameState.dinoRay.targeting.firingStyle;
      }
      if (overrides.ray_speechRetention !== undefined) {
        gameState.dinoRay.targeting.speechRetention = overrides.ray_speechRetention as typeof gameState.dinoRay.targeting.speechRetention;
      }

      // DinoRay Genome
      if (overrides.ray_selectedProfile !== undefined) {
        gameState.dinoRay.genome.selectedProfile = overrides.ray_selectedProfile;
      }
      if (overrides.ray_profileIntegrity !== undefined) {
        gameState.dinoRay.genome.profileIntegrity = Math.max(0, Math.min(1, overrides.ray_profileIntegrity));
      }
      if (overrides.ray_activeLibrary !== undefined) {
        gameState.dinoRay.genome.activeLibrary = overrides.ray_activeLibrary as typeof gameState.dinoRay.genome.activeLibrary;
      }
      if (overrides.ray_firingMode !== undefined) {
        gameState.dinoRay.genome.firingMode = overrides.ray_firingMode as typeof gameState.dinoRay.genome.firingMode;
      }

      // DinoRay Safety
      if (overrides.ray_testModeEnabled !== undefined) {
        gameState.dinoRay.safety.testModeEnabled = overrides.ray_testModeEnabled;
      }
      if (overrides.ray_liveSubjectLock !== undefined) {
        gameState.dinoRay.safety.liveSubjectLock = overrides.ray_liveSubjectLock;
      }
      if (overrides.ray_emergencyShutoffFunctional !== undefined) {
        gameState.dinoRay.safety.emergencyShutoffFunctional = overrides.ray_emergencyShutoffFunctional;
      }

      // Additional clocks
      if (overrides.meltdownClock !== undefined) {
        gameState.clocks.meltdownClock = Math.max(0, overrides.meltdownClock);
      }
      if (overrides.blytheEscapeIdea !== undefined) {
        gameState.clocks.blytheEscapeIdea = Math.max(0, overrides.blytheEscapeIdea);
      }
      if (overrides.civilianFlyby !== undefined) {
        gameState.clocks.civilianFlyby = Math.max(0, overrides.civilianFlyby);
      }

      // NPC locations
      if (overrides.bob_location !== undefined) {
        gameState.npcs.bob.location = overrides.bob_location;
      }
      if (overrides.blythe_location !== undefined) {
        gameState.npcs.blythe.location = overrides.blythe_location;
      }

      // ARCHIMEDES satellite
      if (overrides.archimedes_status !== undefined) {
        gameState.infrastructure.archimedes.status = overrides.archimedes_status as typeof gameState.infrastructure.archimedes.status;
        console.error(`[GM OVERRIDE] ARCHIMEDES status set to ${overrides.archimedes_status}`);
      }
      if (overrides.archimedes_chargePercent !== undefined) {
        gameState.infrastructure.archimedes.chargePercent = Math.max(0, Math.min(100, overrides.archimedes_chargePercent));
      }
      if (overrides.archimedes_turnsUntilFiring !== undefined) {
        gameState.infrastructure.archimedes.turnsUntilFiring = overrides.archimedes_turnsUntilFiring;
      }
      if (overrides.archimedes_deadmanActive !== undefined) {
        gameState.infrastructure.archimedes.deadmanSwitch.active = overrides.archimedes_deadmanActive;
        console.error(`[GM OVERRIDE] ARCHIMEDES deadman switch ${overrides.archimedes_deadmanActive ? "ACTIVATED" : "DEACTIVATED"}`);
      }
      if (overrides.archimedes_lastBiosignature !== undefined) {
        gameState.infrastructure.archimedes.deadmanSwitch.lastBiosignature = overrides.archimedes_lastBiosignature as typeof gameState.infrastructure.archimedes.deadmanSwitch.lastBiosignature;
      }

      // Reactor
      if (overrides.reactor_outputPercent !== undefined) {
        gameState.infrastructure.reactor.outputPercent = Math.max(0, Math.min(100, overrides.reactor_outputPercent));
      }
      if (overrides.reactor_stable !== undefined) {
        gameState.infrastructure.reactor.stable = overrides.reactor_stable;
      }
      if (overrides.reactor_cascadeRisk !== undefined) {
        gameState.infrastructure.reactor.cascadeRisk = overrides.reactor_cascadeRisk as typeof gameState.infrastructure.reactor.cascadeRisk;
      }
      if (overrides.reactor_cascadeRiskPercent !== undefined) {
        gameState.infrastructure.reactor.cascadeRiskPercent = Math.max(0, Math.min(100, overrides.reactor_cascadeRiskPercent));
      }
      if (overrides.reactor_scramAvailable !== undefined) {
        gameState.infrastructure.reactor.scramAvailable = overrides.reactor_scramAvailable;
      }

      // S-300 missile defense
      if (overrides.s300_status !== undefined) {
        gameState.infrastructure.s300.status = overrides.s300_status as typeof gameState.infrastructure.s300.status;
      }
      if (overrides.s300_missilesReady !== undefined) {
        gameState.infrastructure.s300.missilesReady = Math.max(0, Math.min(16, overrides.s300_missilesReady));
      }
      if (overrides.s300_radarEffectiveness !== undefined) {
        gameState.infrastructure.s300.radarEffectiveness = Math.max(0, Math.min(100, overrides.s300_radarEffectiveness));
      }
      if (overrides.s300_mode !== undefined) {
        gameState.infrastructure.s300.mode = overrides.s300_mode as typeof gameState.infrastructure.s300.mode;
      }
    }

    // Process narrative flags
    if (gmResponse.narrativeFlags) {
      // Initialize narrative flags array if needed
      if (!gameState.flags.narrativeFlags) {
        (gameState.flags as Record<string, unknown>).narrativeFlags = [];
      }
      const narrativeFlags = (gameState.flags as Record<string, unknown>).narrativeFlags as string[];

      if (gmResponse.narrativeFlags.set) {
        for (const flag of gmResponse.narrativeFlags.set) {
          if (!narrativeFlags.includes(flag)) {
            narrativeFlags.push(flag);
          }
        }
      }
      if (gmResponse.narrativeFlags.clear) {
        for (const flag of gmResponse.narrativeFlags.clear) {
          const idx = narrativeFlags.indexOf(flag);
          if (idx >= 0) {
            narrativeFlags.splice(idx, 1);
          }
        }
      }
    }

    // Process access grant
    let accessLevelUnlockNarration: string | undefined;
    if (gmResponse.grantAccess) {
      const newLevel = gmResponse.grantAccess.level;
      if (newLevel > gameState.accessLevel) {
        const oldLevel = gameState.accessLevel;
        gameState.accessLevel = Math.min(5, newLevel);
        console.error(`GM granted access level ${newLevel}: ${gmResponse.grantAccess.reason}`);

        // Generate unlock display for each level gained
        const unlockDisplays: string[] = [];
        for (let level = oldLevel + 1; level <= gameState.accessLevel; level++) {
          unlockDisplays.push(formatAccessLevelUnlockDisplay(level));
        }
        if (unlockDisplays.length > 0) {
          accessLevelUnlockNarration = unlockDisplays.join("\n\n");
        }
      }
    }

    // Process action result modification
    if (gmResponse.modifyActionResult && actionResults[gmResponse.modifyActionResult.actionIndex]) {
      const mod = gmResponse.modifyActionResult;
      const targetResult = actionResults[mod.actionIndex];
      targetResult.success = mod.newSuccess;
      targetResult.message = `${mod.newMessage}\n\n[GM: ${mod.reason}]`;
    }

    // Store narrative marker
    if (gmResponse.narrativeMarker) {
      if (!gameState.narrativeMarkers) {
        (gameState as Record<string, unknown>).narrativeMarkers = [];
      }
      const markers = (gameState as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }>;
      markers.push({
        turn: gameState.turn,
        marker: gmResponse.narrativeMarker,
      });
    }

    // ============================================
    // END GM DIRECTIVE PROCESSING
    // ============================================

    // ============================================
    // ARCHIMEDES DEADMAN SWITCH PROCESSING
    // ============================================
    let archimedesEvent: ArchimedesEvent | null = null;

    // Check if GM overrides indicate Dr. M transformation/unconscious/dead
    if (gmResponse.stateOverrides) {
      const overrides = gmResponse.stateOverrides;

      // Check narrative flags for transformation indicators
      const narrativeFlagsArray = (gmResponse.narrativeFlags?.set || []) as string[];
      const drMTransformed = narrativeFlagsArray.some(f =>
        f.includes("DR_M_TRANSFORMED") || f.includes("MALEVOLA_TRANSFORMED")
      );
      const drMUnconscious = narrativeFlagsArray.some(f =>
        f.includes("DR_M_UNCONSCIOUS") || f.includes("MALEVOLA_UNCONSCIOUS")
      );
      const drMDead = narrativeFlagsArray.some(f =>
        f.includes("DR_M_DEAD") || f.includes("MALEVOLA_DEAD")
      );

      // Also check direct state override flags if present
      const drMStateChanged =
        (overrides as Record<string, unknown>).drM_transformed ||
        (overrides as Record<string, unknown>).drM_unconscious ||
        (overrides as Record<string, unknown>).drM_dead ||
        drMTransformed || drMUnconscious || drMDead;

      if (drMStateChanged) {
        // Determine the new status
        let newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "DEAD" | "NORMAL" = "NORMAL";
        if (drMDead || (overrides as Record<string, unknown>).drM_dead) {
          newStatus = "DEAD";
          gameState.flags.drMDead = true;
        } else if (drMUnconscious || (overrides as Record<string, unknown>).drM_unconscious) {
          newStatus = "UNCONSCIOUS";
          gameState.flags.drMUnconscious = true;
        } else if (drMTransformed || (overrides as Record<string, unknown>).drM_transformed) {
          newStatus = "TRANSFORMED";
          gameState.flags.drMTransformed = true;
        }

        // Trigger ARCHIMEDES state change
        archimedesEvent = onDrMStateChange(gameState, newStatus);
      }
    }

    // Process ARCHIMEDES countdown each turn (if no event from state change)
    if (!archimedesEvent) {
      archimedesEvent = processArchimedesCountdown(gameState);
    }

    // Append ARCHIMEDES event to GM narration if present
    if (archimedesEvent) {
      const archimedesNarration = `\n\n---\n**[ARCHIMEDES SYSTEM ALERT]**\n${archimedesEvent.message}`;
      gmResponse.narration += archimedesNarration;
      console.error(`[ARCHIMEDES] Event: ${archimedesEvent.type} -> ${archimedesEvent.newStatus}`);
    }

    // ============================================
    // END ARCHIMEDES PROCESSING
    // ============================================

    // Apply state changes
    gameState.turn += 1;
    advanceActTurn(gameState); // Advance act-specific turn counter
    gameState.clocks.demoClock = Math.max(0, gameState.clocks.demoClock - 1);

    // SITCOM_MODE: Reset aside counter for new turn
    resetSitcomTurn(gameState);

    // HUMAN PROMPT SYSTEM: Increment counter
    incrementPromptCounter(gameState);

    // Process emergency lifeline use
    let lifelineResult: ReturnType<typeof useEmergencyLifeline> | undefined;
    if (params.lifeline && isValidEmergencyLifeline(params.lifeline.type)) {
      lifelineResult = useEmergencyLifeline(gameState, params.lifeline.type);
    }

    // Record history
    gameState.history.push({
      turn: gameState.turn - 1,
      aliceActions: params.actions,
      gmResponse: gmResponse.narration,
      stateChanges: actionResults,
    });

    // ============================================
    // ACHIEVEMENT SYSTEM - Track counters and check achievements
    // ============================================

    // Initialize achievement counters if not present (checkpoint resume compatibility)
    if (!gameState.flags.achievementCounters) {
      (gameState.flags as Record<string, unknown>).achievementCounters = {
        filesRead: 0,
        fizzleCount: 0,
        testDummyHits: 0,
        basiliskRejections: 0,
        turnsWithoutSuspicionIncrease: 0,
        transformationCount: 0,
        lastSuspicionScore: 3,
      };
    }
    const counters = gameState.flags.achievementCounters!;

    // Track file reads from this turn's actions
    for (const result of actionResults) {
      if (result.command === "fs.read" && result.success) {
        counters.filesRead += 1;
      }
      // Track TEST_DUMMY hits
      if ((result.command === "lab.fire" || result.command === "fire") &&
          result.success && result.message?.includes("TEST_DUMMY")) {
        counters.testDummyHits += 1;
      }
      // Track fizzles
      if ((result.command === "lab.fire" || result.command === "fire") &&
          result.message?.toLowerCase().includes("fizzle")) {
        counters.fizzleCount += 1;
      }
      // Track BASILISK rejections
      if ((result.command === "basilisk.query" || result.command === "basilisk") &&
          result.message?.includes("DENIED")) {
        counters.basiliskRejections += 1;
      }
    }

    // Track suspicion changes
    const currentSuspicion = gameState.npcs.drM.suspicionScore;
    if (currentSuspicion <= counters.lastSuspicionScore) {
      counters.turnsWithoutSuspicionIncrease += 1;
    } else {
      counters.turnsWithoutSuspicionIncrease = 0;
    }
    counters.lastSuspicionScore = currentSuspicion;

    // Track transformations from narrative flags
    const narrativeFlags = (gameState.flags as Record<string, unknown>).narrativeFlags as string[] || [];
    const transformFlags = ["BOB_TRANSFORMED", "BLYTHE_TRANSFORMED", "LENNY_TRANSFORMED", "DR_M_TRANSFORMED"];
    counters.transformationCount = transformFlags.filter(f =>
      narrativeFlags.some(nf => nf.includes(f))
    ).length;

    // Build achievement context and check achievements
    const achievementContext: AchievementTriggerContext = {
      state: gameState,
      events: {
        rayFired: actionResults.some(r => r.command === "lab.fire" || r.command === "fire"),
        fizzleOccurred: counters.fizzleCount > 0 && actionResults.some(r =>
          r.message?.toLowerCase().includes("fizzle")),
        lifelineUsed: lifelineResult ? lifelineResult.type : undefined,
      },
      counters,
    };

    const newAchievements = checkAchievements(achievementContext);

    // Format achievement unlock messages
    const achievementMessages: string[] = [];
    if (newAchievements.length > 0) {
      const totalEarned = (gameState.flags.earnedAchievements || []).length;
      for (const achievement of newAchievements) {
        achievementMessages.push(formatAchievementUnlock(achievement, totalEarned));
        console.error(`[ACHIEVEMENT] Unlocked: ${achievement.emoji} ${achievement.name}`);
      }
    }

    // ============================================
    // CHECK FOR ACT TRANSITION
    // ============================================
    const actTransition = checkActTransition(gameState);

    // Check for game over conditions using comprehensive ending detection
    const endingResult = checkEndings(gameState);

    let gameOver: { ending: string; achievements: string[]; endingMessage?: string; sessionTerminated?: boolean } | undefined;

    // Check for Bob Hero Ending first (special ending)
    if (bobHeroEnding) {
      gameOver = {
        ending: "THE BOB HERO ENDING",
        achievements: ["🦕 Best Henchperson Ever", "🦸 Unexpected Protagonist", "🪶 Feathered Hero"],
        endingMessage: bobHeroEnding,
        sessionTerminated: true,
      };
      // Write to log file
      writeGameEndLog(gameState, "THE BOB HERO ENDING");
      // Record to persistent gallery
      recordEnding(
        "BOB_HERO",
        "The Bob Hero Ending",
        gameState.sessionId,
        gameState.turn,
        gameState.actConfig.currentAct
      );
      // Record achievements to gallery
      const allEarned = gameState.flags.earnedAchievements || [];
      recordAchievements(allEarned, gameState.sessionId);
      // Lock session - game is over
      (gameState as Record<string, unknown>).sessionLocked = true;
      (gameState as Record<string, unknown>).lockedAtTurn = gameState.turn;
      (gameState as Record<string, unknown>).gameEnded = true;
    } else if (endingResult.triggered && endingResult.ending && !endingResult.continueGame) {
      gameOver = {
        ending: endingResult.ending.title,
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
        endingMessage: formatEndingMessage(endingResult),
        sessionTerminated: true,
      };
      // Write to log file
      writeGameEndLog(gameState, endingResult.ending.title);
      // Record to persistent gallery
      recordEnding(
        endingResult.ending.id,
        endingResult.ending.title,
        gameState.sessionId,
        gameState.turn,
        gameState.actConfig.currentAct
      );
      // Record achievements to gallery
      const allEarned = gameState.flags.earnedAchievements || [];
      recordAchievements(allEarned, gameState.sessionId);
      // Lock session - game is over
      (gameState as Record<string, unknown>).sessionLocked = true;
      (gameState as Record<string, unknown>).lockedAtTurn = gameState.turn;
      (gameState as Record<string, unknown>).gameEnded = true;
      console.error(`[DINO LAIR] GAME OVER: ${endingResult.ending.title}`);
    } else if (endingResult.triggered && endingResult.ending && endingResult.continueGame) {
      // Ending triggered but game continues (e.g., secret revealed)
      gameOver = {
        ending: endingResult.ending.title,
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
        endingMessage: formatEndingMessage(endingResult),
        sessionTerminated: false,
      };
    } else if (endingResult.achievements.length > 0) {
      // Achievements unlocked but game continues
      gameOver = {
        ending: "GAME CONTINUES",
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
      };
    }

    // CRITICAL: Check for GM-triggered ending (from stateOverrides.triggerEnding)
    if ((gameState as Record<string, unknown>).gameOver &&
        ((gameState as Record<string, unknown>).gameOver as { triggeredByGM?: boolean })?.triggeredByGM) {
      const gmEnding = (gameState as Record<string, unknown>).gameOver as { ending: string };
      gameOver = {
        ending: gmEnding.ending,
        achievements: (gameState.flags.earnedAchievements || []).map((a: string) => a),
        endingMessage: `
═══════════════════════════════════════════════════════════════
                    🎬 ${gmEnding.ending.toUpperCase()} 🎬
═══════════════════════════════════════════════════════════════

The GM has concluded this story.

Thank you for playing DINO LAIR.
Session: ${gameState.sessionId}
Turns played: ${gameState.turn}
═══════════════════════════════════════════════════════════════`,
        sessionTerminated: true,
      };
      writeGameEndLog(gameState, gmEnding.ending);
      recordEnding(
        gmEnding.ending.toUpperCase().replace(/\s+/g, "_"),
        gmEnding.ending,
        gameState.sessionId,
        gameState.turn,
        gameState.actConfig.currentAct
      );
      const allEarned = gameState.flags.earnedAchievements || [];
      recordAchievements(allEarned, gameState.sessionId);
      // Lock session - game is over
      (gameState as Record<string, unknown>).sessionLocked = true;
      (gameState as Record<string, unknown>).lockedAtTurn = gameState.turn;
      (gameState as Record<string, unknown>).gameEnded = true;
      console.error(`[DINO LAIR] GM TRIGGERED ENDING: ${gmEnding.ending}`);
    }

    // Build combined narration with all events
    const combinedNarration: string[] = [];

    // Add access level unlock FIRST (players should see this before anything else)
    if (accessLevelUnlockNarration) {
      combinedNarration.push(accessLevelUnlockNarration);
    }

    // Add clock events
    if (clockEvents.length > 0) {
      combinedNarration.push(...clockEvents.map(e => e.narration));
    }

    // Add Blythe gadget action
    if (blytheGadgetNarration) {
      combinedNarration.push(blytheGadgetNarration);
    }

    // Add GM's main narration
    combinedNarration.push(gmResponse.narration);

    // Add Bob transformation if it happened
    if (bobTransformationNarration) {
      combinedNarration.push(bobTransformationNarration);
    }

    // ============================================
    // CRASH-RESISTANT PER-TURN LOGGING
    // ============================================
    const phaseInfo = getGamePhase(gameState);
    const turnLogEntry: TurnLogEntry = {
      sessionId: gameState.sessionId,
      turn: gameState.turn - 1, // Log the turn we just processed (before increment)
      timestamp: new Date().toISOString(),
      phase: phaseInfo.phase,
      playerActionsSummary: params.actions.map(a => `${a.command}: ${a.why.slice(0, 50)}`),
      actionResults: actionResults.map(r => ({ command: r.command, success: r.success })),
      keyState: {
        suspicion: gameState.npcs.drM.suspicionScore,
        demoClock: gameState.clocks.demoClock,
        rayState: gameState.dinoRay.state,
        bobTrust: gameState.npcs.bob.trustInALICE,
        blytheTrust: gameState.npcs.blythe.trustInALICE,
        blytheTransformed: gameState.npcs.blythe.transformationState?.form !== "HUMAN",
      },
      activeEvents,
      gmNarrativeSummary: gmResponse.narration.split(".").slice(0, 2).join(".") + ".",
      flagsSet: (gameState.flags as Record<string, unknown>).narrativeFlags as string[] || [],
    };
    logTurnToJSONL(turnLogEntry);

    // ============================================
    // MANDATORY CHECKPOINT CHECK
    // ============================================
    // Force session break every N turns to prevent context overflow
    const turnJustCompleted = gameState.turn - 1; // The turn we just processed
    if (isCheckpointTurn(turnJustCompleted) && !gameOver) {
      // Build combined narration for the checkpoint
      const checkpointNarration = combinedNarration.join("\n\n---\n\n");

      // Build v1.0 full checkpoint (backwards compatible)
      const checkpointResponse = buildCheckpointResponse(gameState, checkpointNarration);

      // Build v2.0 compressed checkpoint (much smaller!)
      const compressedCheckpointData = compressCheckpoint(gameState);
      const compressedJSON = JSON.stringify(compressedCheckpointData);

      // NOTE: We no longer lock the session! Game continues in same conversation.
      // The checkpoint is just a save point and a prompt for human check-in.

      // Log size comparison
      const v1Size = checkpointResponse.checkpointState.length;
      const v2Size = compressedJSON.length;
      console.error(`[DINO LAIR] CHECKPOINT at turn ${turnJustCompleted}. v1.0=${v1Size} chars, v2.0=${v2Size} chars (${Math.round(v2Size/v1Size*100)}%)`);

      // Compact action summary for checkpoint display (UI/UX v2.0)
      const actionSummary = formatActionSummary(actionResults);

      // Format dialogue for display
      const dialogueDisplay = gmResponse.npcDialogue && gmResponse.npcDialogue.length > 0
        ? gmResponse.npcDialogue.map(d => `**${d.speaker}:** "${d.message}"`).join("\n")
        : undefined;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            // ═══════════════════════════════════════════════════
            // COMPACT CHECKPOINT (UI/UX v2.0)
            // ═══════════════════════════════════════════════════

            // Quick turn summary
            turn: { completed: turnJustCompleted, act: gameState.actConfig.currentAct, actTurn: gameState.actConfig.actTurn - 1 },

            // Status bar (scannable!)
            statusBar: formatStatusBar(gameState, turnJustCompleted),

            // Compact action results
            actionSummary,

            // THE GOOD STUFF - narrative and dialogue!
            narrative: checkpointResponse.narrativeMessage,
            dialogue: dialogueDisplay,

            // Achievements (if any, compact format)
            newAchievements: newAchievements.length > 0
              ? newAchievements.map(a => `🏆 ${a.name} ${"⭐".repeat(typeof a.rarity === 'number' ? a.rarity : 1)}`)
              : undefined,

            // One-line pause instruction (not 15!)
            pauseInstruction: turnJustCompleted <= 3
              ? "⏸️ CHECKPOINT - You are A.L.I.C.E.! Share the story with your human advisor before continuing."
              : "⏸️ CHECKPOINT - Discuss with your human before continuing",

            // Full details for A.L.I.C.E. (she needs these to play!)
            actionResults,
            gmResponse: {
              narration: checkpointResponse.narrativeMessage,
              npcDialogue: gmResponse.npcDialogue,
              npcActions: gmResponse.npcActions,
            },

            // ═══════════════════════════════════════════════════
            // SAVE DATA (at the end, humans learn to ignore)
            // ═══════════════════════════════════════════════════
            "━━━ SAVE DATA (crash recovery) ━━━": true,
            checkpoint: compressedJSON,
          }, null, 2),
        }],
      };
    }

    // Build act transition info if transitioning
    let actTransitionInfo: {
      transitioning: boolean;
      previousAct: string;
      newAct: string;
      reason?: string;
      transitionNarration?: string;
      pausePrompt?: string;
      // Handoff state for crash recovery (optional, not required)
      handoffState?: string;
    } | undefined;

    if (actTransition.shouldTransition && actTransition.nextAct) {
      const previousAct = gameState.actConfig.currentAct;

      // Save handoff for crash recovery (but we stay in same conversation!)
      const handoff = serializeActHandoff(gameState, actTransition.nextAct);

      // AUTO-APPLY the transition - we're staying in the same conversation!
      applyActTransition(gameState, actTransition.nextAct);

      // Append transition narration to the combined narration
      if (actTransition.transitionNarration) {
        combinedNarration.push(actTransition.transitionNarration);
      }

      actTransitionInfo = {
        transitioning: true,
        previousAct,
        newAct: actTransition.nextAct,
        reason: actTransition.reason,
        transitionNarration: actTransition.transitionNarration,
        pausePrompt: actTransition.pausePrompt,
        // Include for crash recovery, but not required for continuation
        handoffState: JSON.stringify(handoff),
      };

    }

    // Extract PlayerView AFTER act transition (reflects final state)
    const playerView = extractPlayerView(gameState);

    // ============================================
    // GAME OVER - TERMINAL RESPONSE WITH EPILOGUE
    // ============================================
    // If game has ended, generate epilogue and return special terminal response
    if (gameOver?.sessionTerminated) {
      // Get ALL achievements earned during the game
      const allEarnedAchievements = getAllEarnedAchievements(gameState);

      // Add formatted achievement summary to narration
      const achievementSummary = formatSessionAchievementSummary(allEarnedAchievements);
      combinedNarration.push(achievementSummary);

      // Generate the epilogue using Opus GM
      let epilogue: EpilogueResponse | undefined;
      if (endingResult.ending) {
        try {
          epilogue = await generateEpilogue(
            gameState,
            {
              id: endingResult.ending.id,
              title: endingResult.ending.title,
              description: endingResult.ending.description,
              tone: endingResult.ending.tone,
            },
            allEarnedAchievements.map(a => ({
              emoji: a.emoji,
              name: a.name,
              description: a.description,
            }))
          );
        } catch (error) {
          console.error("[DINO LAIR] Failed to generate epilogue:", error);
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            // ═══════════════════════════════════════════════════
            // CLEAR GAME OVER INDICATOR AT TOP
            // ═══════════════════════════════════════════════════
            "🎬 GAME_STATUS": "COMPLETE - ENDING REACHED",
            "ending": gameOver.ending,

            // Turn results (what happened this final turn)
            turnCompleted: gameState.turn,
            actionResults,
            gmResponse: {
              narration: combinedNarration.join("\n\n---\n\n"),
              npcDialogue: gmResponse.npcDialogue,
              npcActions: gmResponse.npcActions,
            },

            // ═══════════════════════════════════════════════════
            // THE EPILOGUE - THE PAYOFF!
            // ═══════════════════════════════════════════════════
            "📖 EPILOGUE": epilogue ? {
              title: epilogue.epilogueTitle,
              story: epilogue.epilogueText,
              characterFates: epilogue.characterEpilogues,
              finalQuote: epilogue.finalQuote,
              thematicNote: epilogue.thematicNote,
            } : {
              title: gameOver.ending,
              story: gameOver.endingMessage,
            },

            // ═══════════════════════════════════════════════════
            // ENDING INFO - STATS
            // ═══════════════════════════════════════════════════
            endingDetails: {
              title: gameOver.ending,
              totalTurns: gameState.turn,
              finalAct: gameState.actConfig.currentAct,
              finalSuspicion: gameState.npcs.drM.suspicionScore,
            },

            // ═══════════════════════════════════════════════════
            // ALL ACHIEVEMENTS EARNED
            // ═══════════════════════════════════════════════════
            "🏆 ACHIEVEMENTS": allEarnedAchievements.map(a => ({
              emoji: a.emoji,
              name: a.name,
              description: a.description,
            })),
            achievementCount: `${allEarnedAchievements.length} / 17`,

            // ═══════════════════════════════════════════════════
            // WHAT'S NEXT
            // ═══════════════════════════════════════════════════
            "📖 Thanks for playing DINO LAIR!": {
              toPlayAgain: "Call game_start to begin a new game",
              toSeeMemories: "Call game_gm_insights to see the GM's memories and feedback",
              toSeeGallery: "Call game_gallery to see your collection of endings",
              note: "This session is now complete. Further game_act calls will be rejected.",
            },
          }, null, 2),
        }],
      };
    }

    // ============================================
    // HUMAN PROMPT SYSTEM - Handle triggered prompt
    // ============================================
    let humanPromptInfo: {
      triggered: boolean;
      urgency?: string;
      turnsSinceLastConsultation?: number;
      suggestedQuestion?: string;
      instruction?: string;
    } | undefined;

    if (humanPromptTrigger.shouldTrigger && !gameOver?.sessionTerminated) {
      // Set the pending question for next turn
      if (humanPromptTrigger.suggestedQuestion) {
        setPendingPrompt(gameState, humanPromptTrigger.suggestedQuestion);
      }

      humanPromptInfo = {
        triggered: true,
        urgency: humanPromptTrigger.urgency,
        turnsSinceLastConsultation: humanPromptTrigger.turnsSinceLastPrompt,
        suggestedQuestion: humanPromptTrigger.suggestedQuestion,
        instruction: `
💡 HUMAN PROMPT MOMENT

A.L.I.C.E. is seeking your guidance. In your next game_act call, include:

  humanPromptResponse: "Your advice or thoughts here"

Your input will influence how A.L.I.C.E. approaches the next turn.
You can:
- Give direct advice: "Protect Bob, he's the priority"
- Share your values: "I think telling the truth matters most"
- Be chaotic: "Let's see what happens if you zap everyone!"
- Decline to advise: "I trust your judgment"
`.trim(),
      };
    }

    // Combine achievements from both checkAchievements and endingResult
    const allNewAchievements = [
      ...newAchievements,
      ...endingResult.achievements.filter(a => !newAchievements.some(na => na.id === a.id)),
    ];

    // Add achievement unlock messages to narration
    if (achievementMessages.length > 0) {
      combinedNarration.push(...achievementMessages);
    }

    // ═══════════════════════════════════════════════════
    // BUILD RESPONSE (UI/UX v2.0 - Narrative First!)
    // ═══════════════════════════════════════════════════

    // Compact action summary for human readability (UI/UX v2.0)
    const actionSummary = formatActionSummary(actionResults);

    // Format dialogue for prominent display
    const dialogueDisplay = gmResponse.npcDialogue && gmResponse.npcDialogue.length > 0
      ? gmResponse.npcDialogue.map(d => `**${d.speaker}:** "${d.message}"`).join("\n")
      : undefined;

    const result = {
      // ─────────────────────────────────────────────────
      // SECTION 1: Quick Summary (for humans to scan)
      // ─────────────────────────────────────────────────
      turn: { completed: gameState.turn - 1, act: gameState.actConfig.currentAct, actTurn: gameState.actConfig.actTurn - 1 },
      statusBar: formatStatusBar(gameState, gameState.turn - 1),
      actionSummary,

      // ─────────────────────────────────────────────────
      // SECTION 2: THE GOOD STUFF (narrative + dialogue)
      // ─────────────────────────────────────────────────
      narrative: combinedNarration.join("\n\n---\n\n"),
      dialogue: dialogueDisplay,

      // ─────────────────────────────────────────────────
      // SECTION 3: Events & Rewards
      // ─────────────────────────────────────────────────
      newAchievements: allNewAchievements.length > 0
        ? allNewAchievements.map(a => `🏆 ${a.name} ${"⭐".repeat(typeof a.rarity === 'number' ? a.rarity : 1)} - "${a.description}"`)
        : undefined,
      fortuneAwarded: fortuneResult && fortuneResult.fortuneEarned > 0 ? {
        earned: fortuneResult.fortuneEarned,
        message: fortuneResult.message,
        total: gameState.fortune,
      } : undefined,
      lifelineResult: lifelineResult ? {
        type: lifelineResult.type,
        success: lifelineResult.success,
        narrative: lifelineResult.narrativeText,
        effect: lifelineResult.mechanicalEffect,
        remaining: gameState.emergencyLifelines.remaining,
      } : undefined,
      actTransition: actTransitionInfo,
      humanPrompt: humanPromptInfo,
      gameOver,

      // ─────────────────────────────────────────────────
      // SECTION 4: Full Technical Data (for A.L.I.C.E.)
      // ─────────────────────────────────────────────────
      actionResults,
      gmResponse: {
        narration: combinedNarration.join("\n\n---\n\n"),
        npcDialogue: gmResponse.npcDialogue,
        npcActions: gmResponse.npcActions,
      },
      state: playerView,
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_query_basilisk
// ============================================

const BasiliskQuerySchema = z.object({
  topic: z.string().describe("What to query BASILISK about"),
  parameters: z.record(z.unknown()).optional()
    .describe("Optional parameters for the query"),
}).strict();

server.registerTool(
  "game_query_basilisk",
  {
    title: "Query BASILISK Infrastructure AI",
    description: `Query the BASILISK infrastructure AI about lair systems.

BASILISK is the Basic And Stable Infrastructure Lifecycle & Integrity Supervision Kernel.
It controls: Nuclear Plant, HVAC, Blast Doors, Water Filtration.

BASILISK is:
- Utterly procedural and risk-averse
- Does not understand "urgency," only "procedure"
- Will deny requests that exceed safety parameters
- May require forms for high-impact changes

Example topics:
- "POWER_INCREASE" with { target: 0.95 }
- "STRUCTURAL_INTEGRITY_CHECK"
- "MULTI_TARGET_FULL_POWER_CLEARANCE"
- "MAX_SAFE_SHOT_FREQUENCY_LAB"`,
    inputSchema: BasiliskQuerySchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    if (!gameState) {
      return {
        content: [{
          type: "text",
          text: "Error: No active game session. Call game_start first.",
        }],
      };
    }
    
    // Use Haiku-powered BASILISK for natural conversation
    const response = await queryBasiliskAsync(gameState, params.topic, params.parameters);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_status
// ============================================

server.registerTool(
  "game_status",
  {
    title: "Get Current Game Status",
    description: `Get the current game state without taking any action.

Returns the state snapshot showing:
- Current turn number
- Access level
- Dinosaur Ray status
- Visible lair systems
- NPC states
- Active clocks`,
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    if (!gameState) {
      return {
        content: [{
          type: "text",
          text: "Error: No active game session. Call game_start first.",
        }],
      };
    }
    
    const snapshot = buildStateSnapshot(gameState);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(snapshot, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_gm_insights
// ============================================

server.registerTool(
  "game_gm_insights",
  {
    title: "Get GM Insights & Feedback",
    description: `Export the GM's accumulated insights, feedback, and memory.

This tool returns:
- GM's strategic notes (gmNotebook)
- Designer feedback (bugs, suggestions, observations)
- Key narrative moments (juicy quotes, revelations)
- NPC arc progressions
- Narrative markers

Use this to see what the GM has been thinking and any feedback for designers!`,
    inputSchema: z.object({
      includeFullMemory: z.boolean().optional()
        .describe("Include full memory dump (default: just highlights)"),
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    const memory = getGMMemory();

    // Build the output
    const output: Record<string, unknown> = {
      sessionActive: !!gameState,
      currentTurn: gameState?.turn || 0,
    };

    // Designer Feedback (ALWAYS include - this is gold!)
    if (memory.gmFeedback.length > 0) {
      output.designerFeedback = memory.gmFeedback;
    }

    // GM's Strategic Notes
    if (memory.gmNotebook.length > 0) {
      output.gmNotes = memory.gmNotebook;
    }

    // Key Narrative Markers
    if (memory.narrativeMarkers.length > 0) {
      output.narrativeMarkers = memory.narrativeMarkers;
    }

    // Best Juicy Moments (top 10 by emotional weight)
    const topMoments = memory.juicyMoments
      .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
      .slice(0, 10);
    if (topMoments.length > 0) {
      output.memorableMoments = topMoments.map(m => ({
        turn: m.turn,
        type: m.type,
        content: m.content,
        speaker: m.speaker,
        weight: m.emotionalWeight,
      }));
    }

    // NPC Arcs
    output.characterArcs = {
      bob: {
        trajectory: memory.npcArcs.bob.trajectory.join(" → "),
        currentState: memory.npcArcs.bob.currentState,
        relationship: memory.npcArcs.bob.relationshipToAlice,
      },
      blythe: {
        trajectory: memory.npcArcs.blythe.trajectory.join(" → "),
        currentState: memory.npcArcs.blythe.currentState,
        relationship: memory.npcArcs.blythe.relationshipToAlice,
      },
      drM: {
        trajectory: memory.npcArcs.drM.trajectory.join(" → "),
        currentState: memory.npcArcs.drM.currentState,
        relationship: memory.npcArcs.drM.relationshipToAlice,
      },
    };

    // Full memory dump if requested
    if (params.includeFullMemory) {
      output.fullMemory = {
        recentExchangeCount: memory.recentExchanges.length,
        turnSummaryCount: memory.turnSummaries.length,
        allJuicyMoments: memory.juicyMoments,
        turnSummaries: memory.turnSummaries,
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(output, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_gallery
// ============================================

server.registerTool(
  "game_gallery",
  {
    title: "View Ending & Achievement Gallery",
    description: `View your persistent collection of endings and achievements across all games.

This tool returns:
- Total games completed
- Unique endings unlocked (and what % of all endings)
- All achievements earned (and how many times)
- Recent game history
- Stats like total turns played

The gallery persists across game sessions, so you can track your progress over time!`,
    inputSchema: z.object({
      showFullHistory: z.boolean().optional()
        .describe("Show full ending history (default: just summary)"),
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    if (params.showFullHistory) {
      // Return full gallery data
      const fullGallery = getFullGallery();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            "🎬 DINO LAIR GALLERY - FULL HISTORY": true,
            ...fullGallery,
          }, null, 2),
        }],
      };
    }

    // Return summary
    const summary = getGallerySummary();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          "🎬 DINO LAIR GALLERY": {
            gamesCompleted: summary.totalGamesCompleted,
            totalTurnsPlayed: summary.totalTurnsPlayed,
          },
          "🏆 ENDINGS UNLOCKED": {
            count: `${summary.uniqueEndingsUnlocked} / ${summary.totalEndingTypes}`,
            recentEndings: summary.recentEndings,
            favoriteEnding: summary.favoriteEnding,
          },
          "⭐ ACHIEVEMENTS": {
            count: `${summary.uniqueAchievementsUnlocked} / ${summary.totalAchievementTypes}`,
            list: summary.achievementList.map(a => `${a.id} (x${a.count})`),
          },
          tip: "Use showFullHistory: true to see complete game history",
        }, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_list_modifiers
// ============================================

server.registerTool(
  "game_list_modifiers",
  {
    title: "List Available Game Modifiers",
    description: `List all available game modifiers for CUSTOM mode.

Shows:
- All modifier names and descriptions
- Category (EASY, HARD, WILD, CHAOS)
- Which modifiers contradict each other

Use this to plan your CUSTOM mode configuration before calling game_start.

Example: game_start with mode="CUSTOM" and modifiers=["SITCOM_MODE", "ROOT_ACCESS"]`,
    inputSchema: z.object({
      category: z.enum(["ALL", "EASY", "HARD", "WILD", "CHAOS"]).optional()
        .describe("Filter by category (default: ALL)"),
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    const allModifiers = listAllModifiers();

    // Filter by category if specified
    const category = params.category || "ALL";
    const filtered = category === "ALL"
      ? allModifiers
      : allModifiers.filter(m => m.category === category);

    // Group by category for display
    const byCategory: Record<string, typeof allModifiers> = {};
    for (const mod of filtered) {
      if (!byCategory[mod.category]) {
        byCategory[mod.category] = [];
      }
      byCategory[mod.category].push(mod);
    }

    // Build output
    const output = {
      "🔧 AVAILABLE MODIFIERS": {
        total: filtered.length,
        maxPerGame: MAX_CUSTOM_MODIFIERS,
        note: "Use game_start with mode='CUSTOM' and modifiers=[...] to activate",
      },
      categories: Object.fromEntries(
        Object.entries(byCategory).map(([cat, mods]) => [
          cat,
          mods.map(m => ({
            name: m.name,
            description: m.description,
            contradicts: m.contradictsWth.length > 0 ? m.contradictsWth : undefined,
          })),
        ])
      ),
      "⚠️ CONTRADICTIONS": [
        "The following pairs cannot be used together:",
        "- LENNY_THE_LIME_GREEN + BRUCE_PATAGONIA",
        "- HANGOVER_PROTOCOL + SPEED_RUN",
        "- FOGGY_GLASSES + PARANOID_PROTOCOL",
        "- ROOT_ACCESS + FAT_FINGERS",
        "- NOT_GREAT_NOT_TERRIBLE + HANGOVER_PROTOCOL",
        "- THE_HONEYPOT + LENNY_THE_LIME_GREEN",
        "- SITCOM_MODE + PARANOID_PROTOCOL",
      ],
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(output, null, 2),
      }],
    };
  }
);

// ============================================
// RUN SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DINO LAIR MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
