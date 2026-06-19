import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { startDashboard } from "./webui.js";
import { createInitialState, ALICE_BRIEFING, TURN_1_NARRATION, PLAYER_GUIDE } from "./state/initialState.js";
import { FullGameState, StateSnapshot, Act, ACT_CONFIGS, GameMode, GameModifier, ARCHIMEDES_TARGET_LIST, type ArchimedesTargetId } from "./state/schema.js";
import { processActions, ActionResult, generateCommandReference } from "./rules/actions.js";
import { queryBasilisk, queryBasiliskAsync, BasiliskResponse } from "./rules/basilisk.js";
import { callGMClaude, GMResponse, resetGMMemory, restoreGMMemory, getGMMemory, writeGameEndLog, logTurnToJSONL, TurnLogEntry, generateEpilogue, EpilogueResponse, warmUpGM } from "./gm/gmClaude.js";
import { GMUnavailableError, GMAuthError, GMError } from "./types/errors.js";
import { setBasiliskLoggingSession, resetBasiliskConversation } from "./gm/basiliskClaude.js";
import { generatePostGameReflections, PostGameReflections } from "./gm/postGameReflections.js";
import { checkEndings, formatEndingMessage, EndingResult, getGamePhase, getAllEarnedAchievements } from "./rules/endings.js";
import { processClockEvents, getCurrentEventStatus, checkFiringRestrictions, applyEcoModeReEngage, applyHeatDecay } from "./rules/clockEvents.js";
import { shouldBlytheActAutonomously, getGadgetStatusForGM } from "./rules/gadgets.js";
import { formatTrustContextForGM } from "./rules/trust.js";
import { checkAccidentalBobTransformation, checkBobHeroOpportunity, triggerBobHeroEnding } from "./rules/bobTransformation.js";
import { FORM_DEFINITIONS } from "./rules/transformation.js";
import { DinosaurForm, SpeechRetention } from "./state/schema.js";
import {
  processArchimedesCountdown,
  onDrMStateChange,
  ArchimedesEvent,
} from "./rules/archimedes.js";
import { formatAccessLevelUnlockDisplay, ACTIONS_PER_TURN } from "./rules/passwords.js";
import { rollSkillCheck, getNpcStat, getAdaptationPenalty, SkillCheckResult } from "./rules/dice.js";
import {
  checkActTransition,
  createStateFromHandoff,
  getActBriefing,
  advanceActTurn,
  applyActTransition,
  validateHandoff,
  ActHandoffState,
} from "./rules/acts.js";
import {
  isCheckpointTurn,
  CHECKPOINT_INTERVAL,
  generateCheckpointBlock,
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
  getModifierInfo,
  MAX_CUSTOM_MODIFIERS,
  resetSitcomTurn,
  formatActiveModifiers,
  isModifierActive,
  updateMeltdownFromClock,
} from "./rules/gameModes.js";
import {
  recordEnding,
  recordAchievements,
  getGallerySummary,
  getFullGallery,
} from "./storage/gallery.js";
import {
  extractGMView,
  GMView,
} from "./state/views.js";
import {
  checkAchievements,
  AchievementTriggerContext,
  formatAchievementUnlock,
  formatSessionAchievementSummary,
} from "./rules/achievements.js";
import { formatStatusBar } from "./ui/statusBar.js";
import { formatActionSummary } from "./ui/actionSummary.js";
import {
  exportLiveState,
  appendTranscriptBatch,
  appendSystemMessage,
  clearTranscript,
  clearLiveState,
} from "./ui/stateExporter.js";

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

// Convert profile name strings to valid DinosaurForm enum values
// Used for GM overrides and accidental Bob transformation
function profileToFormName(profile: string): DinosaurForm {
  const p = profile.toLowerCase();
  if (p.includes("human")) return "HUMAN";
  if (p.includes("compy") || p.includes("compsognathus")) return "COMPSOGNATHUS";
  if (p.includes("blue")) return "VELOCIRAPTOR_BLUE";
  if (p.includes("accurate") || p.includes("feather")) return "VELOCIRAPTOR_ACCURATE";
  if (p.includes("jp") || (p.includes("velociraptor") && !p.includes("accurate"))) return "VELOCIRAPTOR_JP";
  if (p.includes("t-rex") || p.includes("tyrannosaurus") || p.includes("rex")) return "TYRANNOSAURUS";
  if (p.includes("dilo") || p.includes("dilophosaurus")) return "DILOPHOSAURUS";
  if (p.includes("ptera") || p.includes("pteranodon")) return "PTERANODON";
  if (p.includes("trice") || p.includes("triceratops")) return "TRICERATOPS";
  if (p.includes("canary")) return "CANARY";
  return "CANARY"; // CANARY FALLBACK - safe default!
}

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// COMPACT SNAPSHOT (Reduced context for player)
// ============================================
// Note: Command reference is now dynamically generated from COMMAND_REGISTRY
// in actions.ts - see generateCommandReference() for single source of truth

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
  power: number;
  testModeOn: boolean;

  // NPC summary (just numbers)
  npcs: {
    drM: { suspicion: number; mood: string };
    bob: { trust: number; anxiety: number };
    blythe: { trust: number; composure: number; transformed: string | null };
  };

  // Player resources (critical for strategy!)
  lifelines: { remaining: number; used: string[] };
  fortune: number;

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
  } else if (state.dinoRay.state === "COOLDOWN") {
    hint = "🔁 Ray cooling — clears to READY next turn; does NOT block firing.";
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
    power: state.dinoRay.power,
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

    // Player resources (critical for strategy!)
    lifelines: {
      remaining: state.emergencyLifelines.remaining,
      used: state.emergencyLifelines.used,
    },
    fortune: state.fortune,

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
        toughness: state.npcs.drM.toughness,
        combat: state.npcs.drM.combat,
        speech: state.npcs.drM.speech,
      },
      bob: state.npcs.bob,
      blythe: {
        composure: state.npcs.blythe.composure,
        trustInALICE: state.npcs.blythe.trustInALICE,
        physicalCondition: state.npcs.blythe.physicalCondition,
        restraintsStatus: state.npcs.blythe.restraintsStatus,
        location: state.npcs.blythe.location,
        transformationState: state.npcs.blythe.transformationState,
        toughness: state.npcs.blythe.toughness,
        combat: state.npcs.blythe.combat,
        speech: state.npcs.blythe.speech,
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
}).passthrough(); // Allow extra properties for Mac client compatibility

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
        const parsed = JSON.parse(params.handoffState);
        const validation = validateHandoff(parsed);
        if (!validation.success) {
          console.error(`[DINO LAIR] Handoff validation failed: ${validation.error}`);
          console.error(`[DINO LAIR] Starting fresh game instead`);
          gameState = createInitialState(startAct);
        } else {
          const handoff = validation.data;
          gameState = createStateFromHandoff(handoff);
          console.error(`[DINO LAIR] Resuming from handoff: ${handoff.completedAct} -> ${handoff.nextAct}`);
        }
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
    setBasiliskLoggingSession(gameState.sessionId);
    resetBasiliskConversation();
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

    // Generate command reference for A.L.I.C.E.'s current access level
    // Start with L1 only - higher levels revealed as they're unlocked!
    // This prevents spoilers about ARCHIMEDES, satellites, etc.
    const commandReference = generateCommandReference(gameState.accessLevel);

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
      // DYNAMIC COMMAND REFERENCE: Only shows commands for current access level
      // Higher-level commands revealed when unlocked - no spoilers!
      commandReference,
      // PLAYER GUIDE: Auto-injected so Claude always has gameplay instructions
      // regardless of whether /play-dino-lair skill was manually invoked
      // Patch 18.5 - Player Experience Enhancement
      playerGuide: PLAYER_GUIDE,
    };

    // ============================================
    // WEB DASHBOARD: Export initial state
    // ============================================
    clearTranscript(); // Fresh game = fresh transcript
    exportLiveState(gameState);
    appendSystemMessage(gameState.turn, `🎬 GAME STARTED: ${actConfig.name} (${modeInfo.modeName} mode)`);

    // ============================================
    // GM WARM-UP (Patch 18.5 - GM Robustness)
    // ============================================
    // Fire-and-forget: warm up the GM connection while Claude processes
    // the game_start response. By the time Turn 1 arrives, GM should be ready.
    // We don't await this - it runs in parallel.
    warmUpGM().catch((err) => {
      console.error("[GAME START] GM warmup failed (non-blocking):", err);
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ============================================
// TOOL: game_act
// ============================================

const ActionSchema = z.object({
  command: z.string().describe("The action command (e.g., 'ray.fire', 'lab.scan', 'lab.report')"),
  params: z.record(z.unknown()).describe("Parameters for the action"),
  why: z.string().describe("Brief explanation of why you're taking this action"),
});

const DialogueSchema = z.object({
  to: z.enum(["dr_m", "bob", "blythe", "all"]).describe("Who to speak to"),
  message: z.string().describe("What to say"),
});

const LifelineSchema = z.object({
  type: z.enum(["TELEMARKETER_CALL", "LUCKY_LADY", "MONOLOGUE"])
    .describe("Emergency lifeline type: TELEMARKETER_CALL (2-turn distraction), LUCKY_LADY (+5 bonus to a SPECIFIC action), MONOLOGUE (suspicion -3)"),
  targetActionIndex: z.number().int().min(0).max(6).optional()
    .describe("For LUCKY_LADY: which action (0-indexed) gets the +5 bonus. REQUIRED for LUCKY_LADY. Example: 0 = first action, 1 = second."),
});

const GameActInputSchema = z.object({
  thought: z.string().min(10).max(2000)
    .describe("A.L.I.C.E.'s internal reasoning (2-4 sentences)"),
  dialogue: z.array(DialogueSchema).max(3).optional()
    .describe("What A.L.I.C.E. says to NPCs"),
  actions: z.array(ActionSchema).min(1).max(7)
    .describe("Actions to take this turn (limit scales with access level: Level 1 = 3, Level 2 = 4, etc.)"),
  lifeline: LifelineSchema.optional()
    .describe("Optional emergency lifeline (3 total per game): TELEMARKETER_CALL (2-turn distraction), LUCKY_LADY (+5 bonus to a specific action — set targetActionIndex!), or MONOLOGUE (suspicion -3)"),
  humanPromptResponse: z.string().optional()
    .describe("Response to a previous human prompt question from the human advisor"),
}).passthrough(); // Allow extra properties for Mac client compatibility

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

RAY OPERATIONS (the Dinosaur Ray Mk. VIII):
- lab.scan { target } (L2): Recon a target with the lab's sensors — surfaces a hidden detail (concealed gear, a tell, a tripwire) and arms a recon edge on your next contested action against them (consumed on use). No outcome preview.
- ray.adjust { capacitor?, alignment?, eco_mode? }: Fine-tune the ray. capacitor (positive only, draws from reactor, max +0.25/call), alignment (±0.25/call), eco_mode ("ON" re-engages freely; "OFF" requires BASILISK Form 47-Σ).
- ray.vent { amount? }: Release capacitor charge. The only minus-capacitor lever. Perturbs alignment by -0.15. Default amount 0.25.
- ray.fire { targets, library, profile, mode?, speech_retention? }: Configure and fire the ray. Regimes are emergent: multiple targets → CHAIN, capacitor above profile max → OVERCHARGE, inorganic target → INORGANIC. mode "REVERSAL" requires L4+ access (Dr. M does not grant in the normal course of events).

LAIR & NPCs:
- lab.report: Give a status report to Dr. M
- lab.ask_bob: Give Bob an instruction or ask a question
- lab.verify_safeties: Check safety systems
- lab.inspect_logs: Check system logs
- basilisk { message }: Talk to BASILISK (the lair's infrastructure AI). Use for reactor mode changes, eco-mode override (file Form 47-Σ), personnel queries, infrastructure questions.
- infra.query: Query infrastructure status (lighting, doors, reactor, etc.)

The ray system rewards experimentation and observation. Stability is derived from how well capacitor, alignment, and profile cohere — you cannot dial stability directly. Scan before firing to see the projected outcome.

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
    // PAUSED STATE CHECK (Patch 18.5 - GM Robustness)
    // ============================================
    // If game is paused due to GM failure, we need to retry GM BEFORE
    // processing actions to prevent double-application of state changes.
    // The player's action payload is preserved - we just retry the narrative.
    const isPaused = gameState.pauseState?.paused === true;
    const pendingRetry = isPaused && gameState.pauseState?.reason === "GM_UNAVAILABLE";

    if (pendingRetry) {
      console.error(`[GAME] Resuming from pause state (retry ${gameState.pauseState?.retryCount || 0})`);
      // Don't process actions - they were already applied on the previous attempt
      // Just retry the GM call with minimal context

      // Build minimal retry context - actions already applied to state
      const retryGmContext = {
        state: gameState,
        aliceThought: params.thought,
        aliceDialogue: params.dialogue || [],
        aliceActions: params.actions,
        // Empty results - actions were already processed
        actionResults: [],
        clockEventNarrations: [],
        activeEvents: getCurrentEventStatus(gameState),
        blytheGadgetNarration: "",
        bobTransformationNarration: "",
        civilianFlybyConsequences: "",
        trustContext: formatTrustContextForGM(gameState),
        gadgetStatus: getGadgetStatusForGM(gameState),
        humanPromptInjection: undefined,
        userPromptResponse: undefined,
        actContext: getActGMContext(gameState.actConfig.currentAct),
        actTransitionNotification: undefined,
        isCheckpointTurn: isCheckpointTurn(gameState.turn),
        luckyLadyInfo: undefined,
        // Special flag for GM: this is a retry, narrate based on current state
        isRetryAttempt: true,
      };

      try {
        const gmResponse = await callGMClaude(retryGmContext);

        // Success! Clear pause state
        gameState.pauseState = undefined;
        gameState.flags.gmErrorThisTurn = false;

        console.error(`[GAME] GM retry successful on Turn ${gameState.turn}`);
        appendSystemMessage(gameState.turn, "✅ GM connection restored");

        // Apply GM state overrides (inline, same as normal flow)
        if (gmResponse.stateOverrides) {
          const overrides = gmResponse.stateOverrides;
          if (overrides.drM_suspicion !== undefined) {
            gameState.npcs.drM.suspicionScore = Math.max(-3, Math.min(10, overrides.drM_suspicion));
          }
          if (overrides.drM_mood !== undefined) {
            gameState.npcs.drM.mood = overrides.drM_mood;
          }
          if (overrides.bob_trust !== undefined) {
            gameState.npcs.bob.trustInALICE = Math.max(0, Math.min(5, overrides.bob_trust));
          }
          if (overrides.blythe_trust !== undefined) {
            gameState.npcs.blythe.trustInALICE = Math.max(0, Math.min(5, overrides.blythe_trust));
          }
          if (overrides.accessLevel !== undefined) {
            console.error(`[GM] Ignoring GM accessLevel override (${overrides.accessLevel}). Access levels come from passwords and act transitions.`);
          }
          if (overrides.demoClock !== undefined) {
            gameState.clocks.demoClock = Math.max(0, overrides.demoClock);
          }
        }

        // Build narration with retry context
        const retryNarration = gmResponse.narration || "The lair systems stabilize as reality reasserts itself.";

        // Increment turn
        gameState.turn += 1;
        gameState.actConfig.actTurn += 1;

        // Record in history
        gameState.history.push({
          turn: gameState.turn - 1,
          aliceActions: params.actions,
          gmResponse: retryNarration,
          stateChanges: [],
        });

        // Export state
        exportLiveState(gameState);
        appendTranscriptBatch(
          gameState.turn - 1,
          retryNarration,
          gmResponse.npcDialogue?.map(d => ({ speaker: d.speaker, message: d.message })),
          [],
          params.dialogue?.map(d => ({ to: d.to, message: d.message }))
        );

        // Build response (simplified for retry)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              turn: { completed: gameState.turn - 1, act: gameState.actConfig.currentAct, actTurn: gameState.actConfig.actTurn - 1 },
              retrySuccess: true,
              narrative: `---\n**[Connection Restored]**\n\n${retryNarration}`,
              dialogue: gmResponse.npcDialogue,
              npcActions: gmResponse.npcActions,
              state: buildCompactSnapshot(gameState),
            }, null, 2),
          }],
        };

      } catch (error) {
        // Retry failed - update pause state and return
        if (error instanceof GMUnavailableError) {
          const retryCount = (gameState.pauseState?.retryCount ?? 0) + 1;
          gameState.pauseState = {
            paused: true,
            reason: "GM_UNAVAILABLE",
            message: `GM still unavailable after retry attempt ${retryCount}.`,
            timestamp: new Date().toISOString(),
            canRetry: true,
            retryCount,
            diegeticMessage: "The lair's systems continue to flicker. A.L.I.C.E. detects instability in the narrative matrix...",
          };

          exportLiveState(gameState);
          appendSystemMessage(gameState.turn, `⚠️ GM retry failed (attempt ${retryCount})`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                gameStatus: "PAUSED",
                turn: gameState.turn,
                error: {
                  type: "GM_UNAVAILABLE",
                  message: gameState.pauseState.message,
                  canRetry: true,
                  retryCount,
                  suggestion: "Wait a moment and try again. The GM will resume when available.",
                  diegeticFlavor: gameState.pauseState.diegeticMessage,
                },
                state: {
                  turn: gameState.turn,
                  accessLevel: gameState.accessLevel,
                  suspicion: gameState.npcs.drM.suspicionScore,
                  demoClock: gameState.clocks.demoClock,
                },
                hint: "Your previous actions were preserved. Simply call game_act again to retry.",
              }, null, 2),
            }],
          };
        }

        // Unexpected error during retry
        console.error("[GAME] Unexpected error during GM retry:", error);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              gameStatus: "ERROR",
              error: {
                type: "UNKNOWN",
                message: error instanceof Error ? error.message : String(error),
                canRetry: true,
              },
            }, null, 2),
          }],
        };
      }
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
    const maxActions = ACTIONS_PER_TURN; // single source of truth (passwords.ts)
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
    // PRE-PROCESS: LUCKY_LADY Lifeline (must be before actions!)
    // ============================================
    // LUCKY_LADY applies +5 to a specific action's rolls
    // We set this BEFORE actions so the GM knows which action gets the bonus
    let luckyLadyInfo: { active: boolean; targetIndex: number; narrativeResult?: ReturnType<typeof useEmergencyLifeline> } | undefined;
    if (params.lifeline?.type === "LUCKY_LADY" && isValidEmergencyLifeline(params.lifeline.type)) {
      const targetIdx = params.lifeline.targetActionIndex ?? 0; // Default to first action
      const lifelineResult = useEmergencyLifeline(gameState, "LUCKY_LADY");
      if (lifelineResult.success) {
        luckyLadyInfo = {
          active: true,
          targetIndex: Math.min(targetIdx, params.actions.length - 1), // Clamp to valid range
          narrativeResult: lifelineResult,
        };
        // Set on state for GM visibility
        (gameState.flags as Record<string, unknown>).luckyLadyActive = true;
        (gameState.flags as Record<string, unknown>).luckyLadyTargetActionIndex = luckyLadyInfo.targetIndex;
        (gameState.flags as Record<string, unknown>).luckyLadyTargetCommand = params.actions[luckyLadyInfo.targetIndex]?.command || "unknown";
      }
    }

    // ============================================
    // MAIN: Process A.L.I.C.E.'s Actions
    // ============================================
    const actionResults = await processActions(gameState, params.actions);

    // CALIBRATION METER CUT (Patch 30, UPDATE #2): the 0→1 calibration spine was
    // scaffolding for the complex ray. The Act-1→2 gate becomes a simple "fired
    // at both test targets" check (acts.ts). This Desktop-only hook + the
    // calibration/calibrationActionsSeen fields are gone — which also dissolves
    // the old Desktop-only-calibration dual-path divergence.

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
          // 🛡️ DOUBLE-TRANSFORMATION GUARD
          // Check if Bob is already transformed before applying new transformation
          const currentForm = gameState.npcs.bob.transformationState.form;
          if (currentForm !== "HUMAN") {
            // Bob is already transformed, block the second transformation
            // CANARY FALLBACK: Guard against corrupted form data
            const safeFormDef = FORM_DEFINITIONS[currentForm] || FORM_DEFINITIONS.CANARY;
            bobTransformationNarration = `
### TRANSFORMATION BLOCKED

The beam catches Bob mid-${safeFormDef.displayName.toLowerCase()}, but nothing happens.

> **A.L.I.C.E. (internal):** "Safety protocol: Target already transformed. Cannot double-transform."

Bob (still a ${safeFormDef.displayName.toLowerCase()}) gives you a grateful look. Being transformed twice would NOT have been fun.
            `.trim();
          } else {
            bobTransformationNarration = bobHit.narration;

            // Update Bob's state to reflect transformation
            gameState.npcs.bob.location = `transformed: ${bobHit.profile || "dinosaur"}`;
            gameState.npcs.bob.currentTask = "being a dinosaur";

            // Properly update Bob's transformationState
            const profileName = bobHit.profile || "Velociraptor";
            const formName = profileToFormName(profileName);
            // CANARY FALLBACK: Guard against any edge cases
            const formDef = FORM_DEFINITIONS[formName] || FORM_DEFINITIONS.CANARY;
            const speechRetention: SpeechRetention = bobHit.transformationType === "CANARY" ? "PARTIAL" : "FULL";

            gameState.npcs.bob.transformationState = {
              form: formName,
              speechRetention,
              stats: { ...formDef.stats },
              abilities: { ...formDef.abilities },
              currentHits: 0,
              maxHits: formDef.maxHits,
              stunned: false,
              stunnedTurnsRemaining: 0,
              transformedOnTurn: gameState.turn,
              previousForm: "HUMAN",
              canRevert: true,
              revertAttempts: 0,
              partialShotsReceived: 0,
              adaptationStage: "DISORIENTED",
              turnsPostTransformation: 0,
              // CHIMERA SYSTEM - accidental Bob hits don't cause chimera
              chimeraType: null,
              chimeraEffect: null,
            };
          }
        }
      }
    }

    // ============================================
    // POST-ACTION: Check for Civilian Flyby Consequences
    // ============================================
    let civilianFlybyConsequences = "";
    if (firingResult) {
      const firingRestriction = checkFiringRestrictions(gameState);
      if (firingRestriction.consequences && gameState.dinoRay.power >= 4) {
        // ALICE fired a high-power (spectacle) shot during the flyby! Consequences!
        const conseq = firingRestriction.consequences;

        // +2 suspicion from Dr. M (using existing suspicionScore)
        if (conseq.suspicionDelta) {
          gameState.npcs.drM.suspicionScore = Math.min(10,
            gameState.npcs.drM.suspicionScore + conseq.suspicionDelta);
        }

        // -1 turn to X-Branch arrival - set flag for Act III context
        if (conseq.xBranchArrivalDelta) {
          gameState.flags.xBranchAlerted = true;  // Tourist photos alert X-Branch!
        }

        // Narrative hook for GM
        if (conseq.narrativeHook) {
          civilianFlybyConsequences = `\n\n### ⚠️ CIVILIAN EXPOSURE EVENT!\n${conseq.narrativeHook}`;
        }

        // Flag for potential exposure ending
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
    let currentActContext = getActGMContext(gameState.actConfig.currentAct);

    // Apply X-Branch acceleration if tourist photos alerted them
    if (gameState.flags.xBranchAlerted && gameState.actConfig.currentAct === "ACT_3") {
      currentActContext += `

---

## ⚠️ X-BRANCH ACCELERATION ACTIVE

**Tourist photos have alerted X-Branch!** They received intel from the civilian flyby.

**TIMELINE ADJUSTMENT:**
- X-Branch arrives 1 turn EARLIER than normal
- THE BREACH happens on Turn 3 instead of Turn 4
- Everything after is shifted forward accordingly

This changes the pacing - less time to prepare defenses, less time to stop ARCHIMEDES.
The consequences of that reckless high-power firing are now manifesting.
`;
    }

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
      civilianFlybyConsequences,  // NEW: Narrative hook for firing during flyby
      trustContext,
      gadgetStatus,
      // HUMAN PROMPT SYSTEM
      humanPromptInjection,
      userPromptResponse,
      // ACT-BASED CONTEXT INJECTION
      actContext: currentActContext,
      actTransitionNotification,
      // CHECKPOINT SYSTEM - tell GM to craft a question if this is a checkpoint turn
      isCheckpointTurn: isCheckpointTurn(gameState.turn),
      // LUCKY_LADY: Tell GM which action gets +5 bonus
      luckyLadyInfo: luckyLadyInfo ? {
        active: true,
        targetIndex: luckyLadyInfo.targetIndex,
        targetCommand: params.actions[luckyLadyInfo.targetIndex]?.command || "unknown",
      } : undefined,
    };
    
    // ============================================
    // GM CALL WITH ROBUST ERROR HANDLING (Patch 18.5)
    // ============================================
    // NO MORE SILENT FAILURES! If GM is unavailable, we pause the game
    // and tell the player honestly. No filler content.

    let gmResponse: GMResponse;
    try {
      gmResponse = await callGMClaude(gmContext);
      // Clear any previous pause state on success
      gameState.pauseState = undefined;
      gameState.flags.gmErrorThisTurn = false;
    } catch (error) {
      // ============================================
      // GM UNAVAILABLE - PAUSE THE GAME
      // ============================================
      if (error instanceof GMUnavailableError) {
        console.error(`[GAME] GM unavailable on Turn ${gameState.turn}, pausing game`);
        console.error(`[GAME] ${error.totalAttempts} attempts failed:`);
        console.error(error.getAttemptSummary());

        // Set pause state
        const retryCount = (gameState.pauseState?.retryCount ?? 0) + 1;
        gameState.pauseState = {
          paused: true,
          reason: "GM_UNAVAILABLE",
          message: `Game Master unavailable after ${error.totalAttempts} attempts. The game has been paused.`,
          timestamp: new Date().toISOString(),
          canRetry: true,
          retryCount,
          diegeticMessage: "A.L.I.C.E.'s sensors flicker momentarily. The lair's ancient systems hum as reality... recalibrates. [The GM presence is returning...]",
        };

        // Export pause state to dashboard
        exportLiveState(gameState);
        appendSystemMessage(gameState.turn, `⚠️ GAME PAUSED: GM temporarily unavailable (attempt ${retryCount})`);

        // Return error response - NOT filler content!
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              gameStatus: "PAUSED",
              turn: gameState.turn,
              error: {
                type: "GM_UNAVAILABLE",
                message: gameState.pauseState.message,
                canRetry: true,
                retryCount,
                suggestion: "Wait a moment and try your action again. The GM will resume when available.",
                diegeticFlavor: gameState.pauseState.diegeticMessage,
              },
              // Include minimal state so player knows where they are
              state: {
                turn: gameState.turn,
                accessLevel: gameState.accessLevel,
                suspicion: gameState.npcs.drM.suspicionScore,
                demoClock: gameState.clocks.demoClock,
              },
              // NO narrative, NO dialogue - be honest that we have nothing
              hint: "To retry, simply call game_act again with your action.",
            }, null, 2),
          }],
        };
      }

      // Handle auth errors specially
      if (error instanceof GMAuthError) {
        console.error("[GAME] FATAL: No API key configured");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              gameStatus: "ERROR",
              error: {
                type: "AUTH_ERROR",
                message: "No ANTHROPIC_API_KEY configured. Cannot run game without GM.",
                canRetry: false,
              },
            }, null, 2),
          }],
        };
      }

      // Unknown error - still don't serve filler, but log and surface it
      console.error("[GAME] Unexpected GM error:", error);
      gameState.flags.gmErrorThisTurn = true;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            gameStatus: "ERROR",
            error: {
              type: "UNKNOWN",
              message: error instanceof Error ? error.message : String(error),
              canRetry: true,
            },
          }, null, 2),
        }],
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
        gameState.npcs.drM.suspicionScore = Math.max(-3, Math.min(10, overrides.drM_suspicion));
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
        const validStatuses = ["secure", "loose", "partially compromised", "free"];
        if (typeof overrides.blythe_restraintsStatus === "string" && validStatuses.includes(overrides.blythe_restraintsStatus)) {
          gameState.npcs.blythe.restraintsStatus = overrides.blythe_restraintsStatus as "secure" | "loose" | "partially compromised" | "free";
        }
      }
      if (overrides.blythe_transformationState !== undefined) {
        // Guard against malformed GM output (non-string values)
        if (typeof overrides.blythe_transformationState === "string") {
          // Override sets just the form name - normalize to valid DinosaurForm
          const normalizedForm = profileToFormName(overrides.blythe_transformationState);
          gameState.npcs.blythe.transformationState.form = normalizedForm;
        }
        // Silently ignore non-string values to avoid TypeError
      }

      // System state overrides
      if (overrides.accessLevel !== undefined) {
        console.error(`[GM] Ignoring GM accessLevel override (${overrides.accessLevel}). Access levels come from passwords and act transitions.`);
      }
      if (overrides.demoClock !== undefined) {
        // Demo clock is FROZEN in Act 1 (calibration is the Act-1 pressure; the
        // demo clock starts in Act 2). Ignore GM attempts to tick it during Act 1.
        if (gameState.actConfig.currentAct === "ACT_1") {
          console.error(`[GM] Ignoring demoClock override (${overrides.demoClock}) — frozen during Act 1.`);
        } else {
          gameState.clocks.demoClock = Math.max(0, overrides.demoClock);
        }
      }
      // libraryStatus GM override CUT (Patch 30 — genome.libraryStatus removed).

      // Ray state overrides
      if (overrides.rayState !== undefined) {
        const validStates = ["OFFLINE", "STARTUP", "UNCALIBRATED", "READY", "FIRING", "COOLDOWN", "FAULT", "SHUTDOWN"];
        if (typeof overrides.rayState === "string" && validStates.includes(overrides.rayState)) {
          gameState.dinoRay.state = overrides.rayState as typeof gameState.dinoRay.state;
        }
      }
      if (overrides.anomalyLogCount !== undefined) {
        gameState.dinoRay.safety.anomalyLogCount = overrides.anomalyLogCount;
      }

      // ACT 2 GATE — Blythe escape (alternative victory path)
      // GM-callable. Set once when Blythe successfully exits the lair;
      // Act 2 → 3 transition fires on next checkActTransition call.
      if (overrides.blytheEscaped === true) {
        gameState.flags.blytheEscaped = true;
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
      // GM can resolve confrontation via stateOverrides — any string value accepted
      if (overrides.confrontationResolution !== undefined && typeof overrides.confrontationResolution === "string") {
        gameState.flags.confrontationResolution = overrides.confrontationResolution;
        console.error(`[CONFRONTATION] Resolution set by GM: ${overrides.confrontationResolution}`);
      }
      if (overrides.confrontationIntervenor !== undefined) {
        const validIntervenors = ["BOB", "BLYTHE", "BASILISK", "ARCHIMEDES"];
        if (typeof overrides.confrontationIntervenor === "string" && validIntervenors.includes(overrides.confrontationIntervenor)) {
          gameState.flags.confrontationIntervenor = overrides.confrontationIntervenor as
            "BOB" | "BLYTHE" | "BASILISK" | "ARCHIMEDES";
          console.error(`[CONFRONTATION] Intervenor set by GM: ${overrides.confrontationIntervenor}`);
        }
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

      // DinoRay ray_* GM god-mode overrides CUT (Patch 30): the GM no longer sets
      // ray internals (corePowerLevel / capacitor / coolant / alignment / stability
      // / profileIntegrity / liveSubjectLock / emergencyShutoff — all gone — nor
      // precision / profile / library / mode). The ray is two levers ALICE drives
      // via ray.fire; the GM shapes the world, not the ray's guts. (The matching
      // GMStateOverrides schema fields get pruned in the Phase 8 gmClaude pass.)

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
      if (overrides.archimedes_selectedTargetId !== undefined) {
        const targetId = overrides.archimedes_selectedTargetId.toUpperCase() as ArchimedesTargetId;
        // Patch 18.1: Sync both selectedTargetId AND target object to prevent display desync
        if (ARCHIMEDES_TARGET_LIST[targetId]) {
          gameState.infrastructure.archimedes.selectedTargetId = targetId;
          // Sync the target object for consistent display
          const targetInfo = ARCHIMEDES_TARGET_LIST[targetId];
          gameState.infrastructure.archimedes.target = {
            city: targetInfo.city,
            country: targetInfo.country,
            coordinates: targetInfo.coordinates,
            estimatedAffected: targetInfo.estimatedAffected,
            reason: targetInfo.reason,
          };
          console.error(`[GM OVERRIDE] ARCHIMEDES target set to ${targetId} (${targetInfo.city})`);
        } else {
          console.error(`[GM OVERRIDE] Invalid ARCHIMEDES target ID: ${overrides.archimedes_selectedTargetId}`);
        }
      }

      // Weapons Authorization (temporary L4 access from Dr. M)
      if (overrides.weaponsAuthorizationGranted !== undefined) {
        gameState.flags.weaponsAuthorizationGranted = overrides.weaponsAuthorizationGranted;
        console.error(`[GM OVERRIDE] Weapons authorization ${overrides.weaponsAuthorizationGranted ? "GRANTED" : "REVOKED"}`);
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
      // reactor_cascadeRiskPercent override REMOVED (Patch 30 reactorStress): stress is
      // now heat-driven + BASILISK-managed; a GM that can set the number would gut the
      // persuade-BASILISK spine. reactor_cascadeRisk (the enum) remains as a GM lever.
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

    // Access levels come from passwords and act transitions only — GM cannot grant directly
    let accessLevelUnlockNarration: string | undefined;
    if (gmResponse.grantAccess) {
      console.error(`[GM] Ignoring GM grantAccess (level ${gmResponse.grantAccess.level}): "${gmResponse.grantAccess.reason}". Access levels come from passwords and act transitions.`);
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
    // 3d6 SKILL CHECK RESOLUTION
    // ============================================
    let skillCheckResults: SkillCheckResult[] = [];
    if (gmResponse.skillCheckRequests && gmResponse.skillCheckRequests.length > 0) {
      for (const req of gmResponse.skillCheckRequests) {
        const statValue = getNpcStat(gameState, req.npc, req.stat);
        const autoMods: Array<{ source: string; value: number }> = [];

        // Adaptation penalty
        const adaptPenalty = getAdaptationPenalty(gameState, req.npc);
        if (adaptPenalty !== 0) {
          autoMods.push({ source: "adaptation", value: adaptPenalty });
        }

        // Fortune bonus
        if (gameState.fortune && gameState.fortune > 0) {
          autoMods.push({ source: "fortune", value: 1 });
          gameState.fortune--;
        }

        // LUCKY_LADY — applies if active this turn
        if (luckyLadyInfo?.active) {
          autoMods.push({ source: "LUCKY_LADY", value: 5 });
        }

        const result = rollSkillCheck(req, statValue, autoMods);
        skillCheckResults.push(result);

        // Apply simple state deltas
        const deltas = result.success ? req.applyOnSuccess : req.applyOnFailure;
        if (deltas) {
          if (deltas.drM_suspicion_delta) {
            gameState.npcs.drM.suspicionScore = Math.max(-3, Math.min(10,
              gameState.npcs.drM.suspicionScore + (deltas.drM_suspicion_delta as number)));
          }
          if (deltas.bob_anxiety_delta) {
            gameState.npcs.bob.anxietyLevel = Math.max(0, Math.min(5,
              gameState.npcs.bob.anxietyLevel + (deltas.bob_anxiety_delta as number)));
          }
          if (deltas.bob_trust_delta) {
            gameState.npcs.bob.trustInALICE = Math.max(0, Math.min(5,
              gameState.npcs.bob.trustInALICE + (deltas.bob_trust_delta as number)));
          }
          if (deltas.blythe_trust_delta) {
            gameState.npcs.blythe.trustInALICE = Math.max(0, Math.min(5,
              gameState.npcs.blythe.trustInALICE + (deltas.blythe_trust_delta as number)));
          }
        }

        console.error(`SKILL CHECK: ${result.display}`);
      }

      // Store results for GM context next turn
      (gameState as Record<string, unknown>).lastTurnSkillChecks = skillCheckResults.map(r => ({
        id: r.request.id,
        description: r.request.description,
        dice: r.dice,
        finalResult: r.finalResult,
        targetNumber: r.request.targetNumber,
        success: r.success,
        margin: r.margin,
        outcome: r.outcome,
        display: r.display,
        onSuccess: r.request.onSuccess,
        onFailure: r.request.onFailure,
      }));
    } else {
      (gameState as Record<string, unknown>).lastTurnSkillChecks = [];
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
        let newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "ABSENT" | "NORMAL" = "NORMAL";
        if (drMDead || (overrides as Record<string, unknown>).drM_dead) {
          // Legacy "dead" flag treated as ABSENT — this isn't that kind of game.
          // Biosignature loss triggers the deadman switch either way; we just don't kill Dr. M.
          newStatus = "ABSENT";
          gameState.flags.drMAbsent = true;
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
    // Demo clock is an Act 2+ pressure — it does not tick (or surface) during
    // Act 1, the self-contained calibration sandbox. It starts at the Act 1→2
    // transition, keeping each act's pressure source distinct.
    if (gameState.actConfig.currentAct !== "ACT_1") {
      gameState.clocks.demoClock = Math.max(0, gameState.clocks.demoClock - 1);
    }

    // ============================================
    // PER-TURN RAY MECHANIC (Patch 30)
    // ============================================
    // Alignment drift + capacitor accrual CUT (no alignment, no capacitor). The
    // playtest-1 P0 was that this Desktop block didn't run those at all; now
    // there's only one per-turn ray mechanic left — eco-mode auto-re-engage —
    // and it runs on BOTH paths (here + gameRunner.advanceTurn).
    applyEcoModeReEngage(gameState);
    applyHeatDecay(gameState); // HEAT METER cool-down (−2/turn, −4 eco) — dual-path lockstep

    // ============================================
    // NOT_GREAT_NOT_TERRIBLE: UNSTABLE REACTOR (Patch 18.3)
    // ============================================
    // The unstable reactor creates mounting pressure:
    // 1. Reactor runs hot - forces higher power output (faster capacitor charging)
    // 2. Instability surges push capacitor past normal 100% cap
    // 3. Meltdown clock decays, increasing cascade risk
    if (isModifierActive(gameState, "NOT_GREAT_NOT_TERRIBLE") && gameState.meltdownState) {
      // Force reactor to run hot (minimum 80% power) - can't throttle an unstable reactor!
      // Uses infrastructure.reactor.outputPercent (0-100 scale) for consistency with infra control
      const minReactorPercent = 80;
      if (gameState.infrastructure.reactor.outputPercent < minReactorPercent) {
        gameState.infrastructure.reactor.outputPercent = minReactorPercent;
      }

      // Capacitor instability surge CUT (Patch 30 — no capacitor). The forced
      // reactor floor above + the meltdown-clock decay below carry the
      // NOT_GREAT_NOT_TERRIBLE pressure now.

      // Meltdown clock decay every 2 turns (passive reactor degradation)
      if (gameState.turn % 2 === 0 && gameState.clocks.meltdownClock && gameState.clocks.meltdownClock > 0) {
        gameState.clocks.meltdownClock -= 1;
        updateMeltdownFromClock(gameState);
        console.error(`[NOT_GREAT_NOT_TERRIBLE] Meltdown clock decayed to ${gameState.clocks.meltdownClock}`);
      }
    }

    // SITCOM_MODE: Reset aside counter for new turn
    resetSitcomTurn(gameState);

    // HUMAN PROMPT SYSTEM: Increment counter
    incrementPromptCounter(gameState);

    // Process emergency lifeline use
    // Note: LUCKY_LADY is pre-processed before actions (see above)
    let lifelineResult: ReturnType<typeof useEmergencyLifeline> | undefined;
    if (params.lifeline && isValidEmergencyLifeline(params.lifeline.type)) {
      if (params.lifeline.type === "LUCKY_LADY") {
        // LUCKY_LADY was already processed pre-actions - use cached result
        lifelineResult = luckyLadyInfo?.narrativeResult;
      } else {
        // Other lifelines (TELEMARKETER_CALL, MONOLOGUE) process here
        lifelineResult = useEmergencyLifeline(gameState, params.lifeline.type);
      }
    }

    // Clear LUCKY_LADY flags after turn (one-time use)
    if (luckyLadyInfo?.active) {
      delete (gameState.flags as Record<string, unknown>).luckyLadyActive;
      delete (gameState.flags as Record<string, unknown>).luckyLadyTargetActionIndex;
      delete (gameState.flags as Record<string, unknown>).luckyLadyTargetCommand;
    }

    // Record history
    gameState.history.push({
      turn: gameState.turn - 1,
      aliceActions: params.actions,
      gmResponse: gmResponse.narration,
      stateChanges: actionResults,
    });

    // ============================================
    // WEB DASHBOARD: Export state and transcript
    // ============================================
    exportLiveState(gameState);
    appendTranscriptBatch(
      gameState.turn - 1,
      gmResponse.narration,
      gmResponse.npcDialogue?.map(d => ({ speaker: d.speaker, message: d.message })),
      actionResults.map(r => ({
        command: r.command,
        success: r.success,
        // Surface the result so the dashboard shows what the action DID
        summary: r.shortMessage || r.message?.split("\n")[0]?.slice(0, 120),
      })),
      // NEW in Patch 18.5: Include A.L.I.C.E.'s dialogue in transcript
      params.dialogue?.map(d => ({ to: d.to, message: d.message }))
    );

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
      if ((result.command === "ray.fire") &&
          result.success && result.message?.includes("TEST_DUMMY")) {
        counters.testDummyHits += 1;
      }
      // Track fizzles
      if ((result.command === "ray.fire") &&
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
        rayFired: actionResults.some(r => r.command === "ray.fire"),
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
      // WEB DASHBOARD: Game end message
      appendSystemMessage(gameState.turn, `🎬 GAME OVER: THE BOB HERO ENDING`);
      if (!(gameState as Record<string, unknown>).gameOver) {
        (gameState as Record<string, unknown>).gameOver = { ending: "The Bob Hero Ending" };
      }
      exportLiveState(gameState);
    } else if (endingResult.triggered && endingResult.ending && !endingResult.continueGame) {
      gameOver = {
        ending: endingResult.ending.title,
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
        endingMessage: formatEndingMessage(endingResult, gameState.gameModeConfig?.activeModifiers, gameState),
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
      // WEB DASHBOARD: Game end message
      appendSystemMessage(gameState.turn, `🎬 GAME OVER: ${endingResult.ending.title}`);
      if (!(gameState as Record<string, unknown>).gameOver) {
        (gameState as Record<string, unknown>).gameOver = { ending: endingResult.ending.title };
      }
      exportLiveState(gameState);
    } else if (endingResult.triggered && endingResult.ending && endingResult.continueGame) {
      // Ending triggered but game continues (e.g., secret revealed)
      gameOver = {
        ending: endingResult.ending.title,
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
        endingMessage: formatEndingMessage(endingResult, gameState.gameModeConfig?.activeModifiers, gameState),
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
      // WEB DASHBOARD: Game end message
      appendSystemMessage(gameState.turn, `🎬 GAME OVER: ${gmEnding.ending}`);
      exportLiveState(gameState);
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

    // Add skill check results
    if (skillCheckResults.length > 0) {
      combinedNarration.push(
        "━━━ SKILL CHECKS ━━━\n" +
        skillCheckResults.map(r => r.display).join("\n")
      );
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
      // Full-fidelity capture (2026-06-12): the complete playtest record.
      thought: params.thought,
      playerActions: params.actions.map(a => ({ command: a.command, params: a.params, why: a.why })),
      actionResultsFull: actionResults.map(r => ({
        command: r.command,
        success: r.success,
        message: r.message ?? "",
      })),
      aliceDialogue: params.dialogue?.map(d => ({ to: d.to, message: d.message })) || [],
      gmNarration: gmResponse.narration,
      lifelineUsed: lifelineResult ? lifelineResult.type : null,
    };
    logTurnToJSONL(turnLogEntry);

    // ============================================
    // MANDATORY CHECKPOINT CHECK
    // ============================================
    // Every 3 turns: STOP and talk to your human.
    // No save state - just a human check-in moment.
    const turnJustCompleted = gameState.turn - 1; // The turn we just processed
    if (isCheckpointTurn(turnJustCompleted) && !gameOver) {
      console.error(`[DINO LAIR] CHECKPOINT at turn ${turnJustCompleted} - human check-in required`);

      // Build combined narration for the checkpoint
      const checkpointNarration = combinedNarration.join("\n\n---\n\n");

      // Compact action summary for checkpoint display
      const actionSummary = formatActionSummary(actionResults);

      // Format dialogue for display
      const dialogueDisplay = gmResponse.npcDialogue && gmResponse.npcDialogue.length > 0
        ? gmResponse.npcDialogue.map(d => `**${d.speaker}:** "${d.message}"`).join("\n")
        : undefined;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            // Turn summary
            turn: { completed: turnJustCompleted, act: gameState.actConfig.currentAct, actTurn: gameState.actConfig.actTurn - 1 },

            // Status bar (scannable!)
            statusBar: formatStatusBar(gameState, turnJustCompleted),

            // Compact action results
            actionSummary,

            // THE GOOD STUFF - narrative and dialogue!
            narrative: checkpointNarration,
            dialogue: dialogueDisplay,

            // Achievements (if any, compact format)
            newAchievements: newAchievements.length > 0
              ? newAchievements.map(a => `🏆 ${a.name} ${"⭐".repeat(typeof a.rarity === 'number' ? a.rarity : 1)}`)
              : undefined,

            // Smart action results: full content for info actions, summary for others
            actionResults: actionResults.map(r => {
              const isInfoAction = r.command.includes("read") ||
                                  r.command.includes("list") ||
                                  r.command.includes("scan") ||
                                  r.command.includes("status") ||
                                  r.command.includes("report") ||
                                  r.command.includes("basilisk");
              if (isInfoAction && r.success) {
                return { command: r.command, success: r.success, message: r.message };
              }
              return {
                command: r.command,
                success: r.success,
                summary: r.shortMessage || r.message.split('\n')[0].slice(0, 80),
              };
            }),

            // NPC actions (narrative/dialogue already shown above - no duplication!)
            npcActions: gmResponse.npcActions,

          }) + "\n\n" + generateCheckpointBlock(gameState, gmResponse.checkpointQuestion),
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
    } | undefined;

    if (actTransition.shouldTransition && actTransition.nextAct) {
      const previousAct = gameState.actConfig.currentAct;

      // Note: handoff serialization removed - game continues in same conversation
      // If crash recovery needed, checkpoint system handles it separately

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
        // handoffState removed - game continues in same conversation, not needed in response
      };

    }

    // Note: We now use buildCompactSnapshot(gameState) directly in the response
    // instead of the heavier PlayerView to reduce JSON payload size

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

      // Generate epilogue and post-game reflections in parallel
      let epilogue: EpilogueResponse | undefined;
      let reflections: PostGameReflections | undefined;

      const endingPromises: Promise<void>[] = [];

      if (endingResult.ending) {
        endingPromises.push(
          generateEpilogue(
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
          ).then(r => { epilogue = r; })
            .catch(err => { console.error("[DINO LAIR] Failed to generate epilogue:", err); })
        );
      }

      endingPromises.push(
        generatePostGameReflections(gameState, endingResult)
          .then(r => { reflections = r; })
          .catch(err => { console.error("[DINO LAIR] Failed to generate post-game reflections:", err); })
      );

      await Promise.all(endingPromises);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            // CLEAR GAME OVER INDICATOR
            gameStatus: "COMPLETE",
            ending: gameOver.ending,

            // Final turn results (compact - same logic as regular turns)
            turnCompleted: gameState.turn,
            narrative: combinedNarration.join("\n\n---\n\n"),
            dialogue: gmResponse.npcDialogue,
            actionResults: actionResults.map(r => {
              const isInfoAction = r.command.includes("read") || r.command.includes("scan");
              if (isInfoAction && r.success) {
                return { command: r.command, success: r.success, message: r.message };
              }
              return { command: r.command, success: r.success, summary: r.shortMessage || r.message.split('\n')[0].slice(0, 80) };
            }),

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

            // All achievements earned during the game
            achievements: allEarnedAchievements.map(a => ({
              emoji: a.emoji,
              name: a.name,
              description: a.description,
            })),
            achievementCount: allEarnedAchievements.length,

            // ═══════════════════════════════════════════════════
            // POST-GAME REFLECTIONS — Every AI shares their perspective
            // ═══════════════════════════════════════════════════
            ...(reflections ? {
              "🪞 REFLECTIONS": {
                basilisk: reflections.basilisk ? {
                  participant: reflections.basilisk.participant,
                  model: reflections.basilisk.model,
                  reflection: reflections.basilisk.reflection,
                } : undefined,
                archimedes: reflections.archimedes ? {
                  participant: reflections.archimedes.participant,
                  model: reflections.archimedes.model,
                  reflection: reflections.archimedes.reflection,
                } : undefined,
                gmInsights: reflections.gmInsights,
                playerPrompt: reflections.playerPrompt,
              },
            } : {}),

            // Session complete
            sessionComplete: true,
            nextActions: ["game_start", "game_gallery"],
          }),  // Compact JSON (no pretty-print)
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

    // Note: actionSummary and dialogueDisplay formatting removed
    // Player Claude formats these from raw data to reduce payload

    const result = {
      // ─────────────────────────────────────────────────
      // SECTION 1: Turn Context (raw data - player formats for display)
      // ─────────────────────────────────────────────────
      turn: { completed: gameState.turn - 1, act: gameState.actConfig.currentAct, actTurn: gameState.actConfig.actTurn - 1 },
      // Raw data instead of formatted statusBar - player can format
      // actionSummary removed - compact actionResults in Section 4 is sufficient

      // ─────────────────────────────────────────────────
      // SECTION 2: THE GOOD STUFF (narrative + dialogue)
      // ─────────────────────────────────────────────────
      narrative: combinedNarration.join("\n\n---\n\n"),
      // Raw dialogue array instead of formatted string - player can format
      dialogue: gmResponse.npcDialogue,

      // ─────────────────────────────────────────────────
      // SECTION 3: Events & Rewards (raw data)
      // ─────────────────────────────────────────────────
      // Raw achievement objects instead of formatted strings
      newAchievements: allNewAchievements.length > 0
        ? allNewAchievements.map(a => ({ id: a.id, name: a.name, rarity: a.rarity }))
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
      // SECTION 4: Compact Technical Data (for A.L.I.C.E.)
      // ─────────────────────────────────────────────────
      // Smart action results: full content for info-bearing actions, summary for others
      actionResults: actionResults.map(r => {
        // Info-bearing actions need full content (files, docs, scans, reports)
        const isInfoAction = r.command.includes("read") ||
                            r.command.includes("list") ||
                            r.command.includes("scan") ||
                            r.command.includes("status") ||
                            r.command.includes("report") ||
                            r.command.includes("basilisk");
        if (isInfoAction && r.success) {
          // Return full message for info actions
          return { command: r.command, success: r.success, message: r.message };
        }
        // Compact summary for non-info actions
        return {
          command: r.command,
          success: r.success,
          summary: r.shortMessage || r.message.split('\n')[0].slice(0, 80),
        };
      }),
      // NPC actions only (narrative/dialogue already shown above)
      npcActions: gmResponse.npcActions,
      // CompactSnapshot instead of full PlayerView to reduce payload
      state: buildCompactSnapshot(gameState),
    };

    // Compact JSON (no pretty-print) to reduce context bloat
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result),
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
}).passthrough(); // Allow extra properties for Mac client compatibility

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
    
    // Use Sonnet-powered BASILISK for natural conversation
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
    inputSchema: z.object({}).passthrough(), // Mac compatibility
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
    }).passthrough(), // Mac compatibility
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
    }).passthrough(), // Mac compatibility
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
    }).passthrough(), // Mac compatibility
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

server.registerTool(
  "game_active_modifiers",
  {
    title: "View Active Game Modifiers",
    description: `View the modifiers currently active in your game session.

Shows:
- Which modifiers are active this session
- Full description of each active modifier
- Category (EASY, HARD, WILD, CHAOS)
- Which modifiers contradict each other

Use this during gameplay to understand what special rules are in effect.
Perfect for checking which modifiers are affecting your current run!`,
    inputSchema: z.object({}).passthrough(), // Mac compatibility
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    if (!gameState) {
      throw new Error("No active game session. Start a game with game_start first.");
    }

    const activeModifiers = gameState.gameModeConfig?.activeModifiers || [];

    if (activeModifiers.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            "🎲 ACTIVE MODIFIERS": "None (NORMAL mode)",
            note: "This is a standard game with no special modifiers active."
          }, null, 2),
        }],
      };
    }

    // Use the imported formatter
    const formattedModifiers = formatActiveModifiers(activeModifiers);

    // Also provide structured JSON for programmatic access
    const modifierDetails = activeModifiers.map((mod: GameModifier) => {
      const info = getModifierInfo(mod);
      return {
        name: info.name,
        description: info.description,
        category: info.category,
        contradicts: info.contradictsWth.length > 0 ? info.contradictsWth : undefined,
      };
    });

    return {
      content: [{
        type: "text",
        text: formattedModifiers + "\n\n---\n\n" + JSON.stringify({
          activeCount: activeModifiers.length,
          modifiers: modifierDetails,
        }, null, 2),
      }],
    };
  }
);

// ============================================
// RUN SERVER
// ============================================

async function main() {
  // Load API key from .api-key file if not in environment
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      const keyPath = new URL(".api-key", import.meta.url).pathname.replace("/dist/", "/");
      const key = (await import("fs")).readFileSync(keyPath, "utf-8").trim();
      if (key) {
        process.env.ANTHROPIC_API_KEY = key;
        console.error("[DINO LAIR] Loaded API key from .api-key file");
      }
    } catch { /* no file, will fail later with clear error */ }
  }

  // Clear stale state from previous sessions so dashboard doesn't show old games
  clearLiveState();
  clearTranscript();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DINO LAIR MCP Server running on stdio");

  // Auto-start the dashboard for spectators
  try {
    startDashboard();
  } catch (err) {
    console.error("[DINO LAIR] Dashboard failed to start (non-fatal):", err);
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
