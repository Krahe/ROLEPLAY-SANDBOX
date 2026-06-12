/**
 * GAME RUNNER - Core Turn Processing Engine
 *
 * Extracts game logic from the MCP server so it can be reused by:
 * - MCP server (Claude Desktop sessions)
 * - Orchestrator (autonomous play)
 * - Test harnesses
 *
 * This module is the single source of truth for "what happens when a player takes a turn."
 */

import { FullGameState, GameModifier, DinosaurForm, SpeechRetention } from "../state/schema.js";
import { processActions, ActionResult } from "../rules/actions.js";
import { callGMClaude, GMResponse, getGMMemory } from "../gm/gmClaude.js";
import { GMUnavailableError, GMAuthError, GMError } from "../types/errors.js";
import { checkEndings, EndingResult, getGamePhase } from "../rules/endings.js";
import { processClockEvents, getCurrentEventStatus, applyAlignmentDrift, applyCapacitorAccrual, applyEcoModeReEngage, checkIntermissionEnd } from "../rules/clockEvents.js";
import { advanceRayDiagnostic } from "../rules/rayDiagnostics.js";
import { shouldBlytheActAutonomously, getGadgetStatusForGM } from "../rules/gadgets.js";
import { formatTrustContextForGM } from "../rules/trust.js";
import { checkAccidentalBobTransformation, checkBobHeroOpportunity, triggerBobHeroEnding } from "../rules/bobTransformation.js";
import { FORM_DEFINITIONS } from "../rules/transformation.js";
import {
  processArchimedesCountdown,
  onDrMStateChange,
  ArchimedesEvent,
} from "../rules/archimedes.js";
import {
  checkActTransition,
  advanceActTurn,
  applyActTransition,
} from "../rules/acts.js";
import { isCheckpointTurn } from "../rules/checkpoint.js";
import {
  checkHumanPromptTrigger,
  buildHumanPromptInjection,
  buildHumanPromptContext,
  parseHumanPromptResponse,
  recordHumanPrompt,
  incrementPromptCounter,
  hasPendingPrompt,
  getPendingPrompt,
  processHumanAdvisorResponse,
  useEmergencyLifeline,
  isValidEmergencyLifeline,
} from "../rules/lifeline.js";
import {
  checkAndBuildActTransition as checkActContextTransition,
  getActGMContext,
} from "../rules/actContext.js";
import {
  isModifierActive,
  resetSitcomTurn,
  updateMeltdownFromClock,
} from "../rules/gameModes.js";
import { checkAchievements, AchievementTriggerContext } from "../rules/achievements.js";
import { checkFiringRestrictions } from "../rules/clockEvents.js";
import { advanceInvasion, checkBroadcastInfluence } from "../rules/invasion.js";
import {
  rollSkillCheck,
  getNpcStat,
  getAdaptationPenalty,
  SkillCheckResult,
} from "../rules/dice.js";

// ============================================
// TYPES
// ============================================

/** Action type matching the game's Action interface */
export interface TurnAction {
  command: string;
  params: Record<string, unknown>;
  why: string;
}

/** Input for a player turn */
export interface TurnInput {
  /** Player's internal reasoning */
  thought: string;
  /** Optional dialogue to NPCs */
  dialogue?: Array<{ to: string; message: string }>;
  /** Actions to take */
  actions: TurnAction[];
  /** Optional emergency lifeline */
  lifeline?: {
    type: "TELEMARKETER_CALL" | "LUCKY_LADY" | "MONOLOGUE";
    targetActionIndex?: number;
  };
  /** Response to a previous human prompt */
  humanPromptResponse?: string;
}

/** Result of turn processing (before GM call) */
export interface PreGMResult {
  /** Clock events that fired */
  clockEvents: Array<{ narration: string }>;
  /** Active events status */
  activeEvents: string[];
  /** Blythe gadget narration (if any) */
  blytheGadgetNarration: string;
  /** Lucky Lady info (if active) */
  luckyLadyInfo?: {
    active: boolean;
    targetIndex: number;
  };
  /** Action results */
  actionResults: ActionResult[];
  /** Bob transformation narration (if any) */
  bobTransformationNarration: string;
  /** Civilian flyby consequences (if any) */
  civilianFlybyConsequences: string;
  /** Whether Bob hero ending was triggered */
  bobHeroEnding: string;
}

/** GM context built for the GM call */
export interface GMContext {
  state: FullGameState;
  aliceThought: string;
  aliceDialogue: Array<{ to: string; message: string }>;
  aliceActions: TurnAction[];
  actionResults: ActionResult[];
  clockEventNarrations: string[];
  activeEvents: string[];
  blytheGadgetNarration: string;
  bobTransformationNarration: string;
  civilianFlybyConsequences: string;
  trustContext: string;
  gadgetStatus: string;
  humanPromptInjection?: string;
  userPromptResponse?: string;
  actContext: string;
  actTransitionNotification?: string;
  isCheckpointTurn: boolean;
  luckyLadyInfo?: {
    active: boolean;
    targetIndex: number;
    targetCommand: string;
  };
  isRetryAttempt?: boolean;
}

/** Result of a completed turn */
export interface TurnResult {
  /** Whether the turn completed successfully */
  success: boolean;
  /** Error info if turn failed */
  error?: {
    type: "GM_UNAVAILABLE" | "AUTH_ERROR" | "VALIDATION" | "UNKNOWN";
    message: string;
    canRetry: boolean;
  };
  /** Turn number completed */
  turn: number;
  /** Current act */
  act: string;
  /** Act turn number */
  actTurn: number;
  /** Combined narrative for this turn */
  narrative: string;
  /** NPC dialogue */
  npcDialogue?: Array<{ speaker: string; message: string }>;
  /** NPC actions (string descriptions) */
  npcActions?: string[];
  /** Action results */
  actionResults: ActionResult[];
  /** Achievements unlocked this turn */
  newAchievements: Array<{ emoji: string; name: string; description: string; rarity: number | string }>;
  /** Whether this is a checkpoint turn */
  isCheckpoint: boolean;
  /** Checkpoint question (if checkpoint turn) */
  checkpointQuestion?: string;
  /** Act transition info (if transitioning) */
  actTransition?: {
    previousAct: string;
    newAct: string;
    reason?: string;
    transitionNarration?: string;
  };
  /** Game ending info (if game ended) */
  gameEnding?: {
    triggered: boolean;
    ending?: {
      id: string;
      title: string;
      description: string;
      tone: string;
    };
    sessionTerminated: boolean;
    achievements: Array<{ emoji: string; name: string }>;
  };
  /** Lifeline result (if used) */
  lifelineResult?: {
    type: string;
    success: boolean;
    narrativeText: string;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Convert profile name to valid DinosaurForm */
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
  return "CANARY";
}

// ============================================
// GAME RUNNER CLASS
// ============================================

export class GameRunner {
  private verbose: boolean;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
  }

  /**
   * Validate turn input before processing
   */
  validateInput(state: FullGameState, input: TurnInput): { valid: boolean; error?: string } {
    // Check game not ended
    if ((state as Record<string, unknown>).gameEnded) {
      return { valid: false, error: "Game has ended. Start a new game to continue." };
    }

    // Check required fields
    if (!input.thought || !input.actions || input.actions.length === 0) {
      return { valid: false, error: "Turn requires thought and at least one action." };
    }

    // Check action count based on access level
    const maxActions = 3 + (state.accessLevel - 1);
    if (input.actions.length > maxActions) {
      return {
        valid: false,
        error: `Too many actions. Access Level ${state.accessLevel} allows ${maxActions} actions.`,
      };
    }

    // Check lifeline availability
    if (input.lifeline && state.emergencyLifelines.remaining <= 0) {
      return { valid: false, error: "No emergency lifelines remaining." };
    }

    return { valid: true };
  }

  /**
   * Process pre-turn events (clocks, Blythe actions, Lucky Lady setup)
   */
  processPreTurn(state: FullGameState, input: TurnInput): PreGMResult {
    // Clock events
    const clockEvents = processClockEvents(state);
    const activeEvents = getCurrentEventStatus(state);

    // Blythe autonomous actions
    const blytheAction = shouldBlytheActAutonomously(state);
    let blytheGadgetNarration = "";
    if (blytheAction) {
      blytheGadgetNarration = blytheAction.narration;
      if (blytheAction.stateChanges) {
        Object.assign(state, blytheAction.stateChanges);
      }
    }

    // Lucky Lady pre-processing
    let luckyLadyInfo: { active: boolean; targetIndex: number } | undefined;
    if (input.lifeline?.type === "LUCKY_LADY" && isValidEmergencyLifeline(input.lifeline.type)) {
      const targetIdx = input.lifeline.targetActionIndex ?? 0;
      const lifelineResult = useEmergencyLifeline(state, "LUCKY_LADY");
      if (lifelineResult.success) {
        luckyLadyInfo = {
          active: true,
          targetIndex: Math.min(targetIdx, input.actions.length - 1),
        };
        (state.flags as Record<string, unknown>).luckyLadyActive = true;
        (state.flags as Record<string, unknown>).luckyLadyTargetActionIndex = luckyLadyInfo.targetIndex;
        (state.flags as Record<string, unknown>).luckyLadyTargetCommand = input.actions[luckyLadyInfo.targetIndex]?.command || "unknown";
      }
    }

    return {
      clockEvents: clockEvents.map(e => ({ narration: e.narration })),
      activeEvents,
      blytheGadgetNarration,
      luckyLadyInfo,
      actionResults: [], // Filled in next phase
      bobTransformationNarration: "",
      civilianFlybyConsequences: "",
      bobHeroEnding: "",
    };
  }

  /**
   * Process player actions
   */
  async processActions(state: FullGameState, input: TurnInput): Promise<ActionResult[]> {
    return await processActions(state, input.actions);
  }

  /**
   * Process post-action events (Bob transformation, civilian consequences, etc.)
   */
  processPostAction(
    state: FullGameState,
    actionResults: ActionResult[]
  ): { bobTransformationNarration: string; civilianFlybyConsequences: string; bobHeroEnding: string } {
    let bobTransformationNarration = "";
    let civilianFlybyConsequences = "";
    let bobHeroEnding = "";

    // Check for Bob accidental transformation
    const firingResult = actionResults.find(r => r.command.includes("fire") && r.success);
    if (firingResult && firingResult.stateChanges?.firingResult) {
      const outcome = (firingResult.stateChanges.firingResult as { outcome?: string }).outcome;
      if (outcome) {
        const bobHit = checkAccidentalBobTransformation(state, outcome, "blythe");
        if (bobHit.occurred) {
          const currentForm = state.npcs.bob.transformationState.form;
          if (currentForm !== "HUMAN") {
            // Bob already transformed - block double transformation
            const safeFormDef = FORM_DEFINITIONS[currentForm] || FORM_DEFINITIONS.CANARY;
            bobTransformationNarration = `### TRANSFORMATION BLOCKED\n\nThe beam catches Bob mid-${safeFormDef.displayName.toLowerCase()}, but nothing happens. Safety protocol: Target already transformed.`;
          } else {
            bobTransformationNarration = bobHit.narration;
            // Update Bob's state
            state.npcs.bob.location = `transformed: ${bobHit.profile || "dinosaur"}`;
            state.npcs.bob.currentTask = "being a dinosaur";
            const profileName = bobHit.profile || "Velociraptor";
            const formName = profileToFormName(profileName);
            const formDef = FORM_DEFINITIONS[formName] || FORM_DEFINITIONS.CANARY;
            const speechRetention: SpeechRetention = bobHit.transformationType === "CANARY" ? "PARTIAL" : "FULL";
            state.npcs.bob.transformationState = {
              form: formName,
              speechRetention,
              stats: { ...formDef.stats },
              abilities: { ...formDef.abilities },
              currentHits: 0,
              maxHits: formDef.maxHits,
              stunned: false,
              stunnedTurnsRemaining: 0,
              transformedOnTurn: state.turn,
              previousForm: "HUMAN",
              canRevert: true,
              revertAttempts: 0,
              partialShotsReceived: 0,
              adaptationStage: "DISORIENTED",
              turnsPostTransformation: 0,
              chimeraType: null,
              chimeraEffect: null,
            };
          }
        }
      }
    }

    // Check for civilian flyby consequences
    if (firingResult) {
      const firingRestriction = checkFiringRestrictions(state);
      if (firingRestriction.consequences && state.dinoRay.powerCore.capacitorCharge > 0.8) {
        const conseq = firingRestriction.consequences;
        if (conseq.suspicionDelta) {
          state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + conseq.suspicionDelta);
        }
        if (conseq.xBranchArrivalDelta) {
          state.flags.xBranchAlerted = true;
        }
        if (conseq.narrativeHook) {
          civilianFlybyConsequences = `\n\n### CIVILIAN EXPOSURE EVENT!\n${conseq.narrativeHook}`;
        }
        state.flags.exposureTriggered = true;
      }
    }

    // Check for Bob hero opportunity
    if (checkBobHeroOpportunity(state)) {
      bobHeroEnding = triggerBobHeroEnding(state);
    }

    return { bobTransformationNarration, civilianFlybyConsequences, bobHeroEnding };
  }

  /**
   * Build GM context for the GM call
   */
  buildGMContext(
    state: FullGameState,
    input: TurnInput,
    preResult: PreGMResult,
    actionResults: ActionResult[]
  ): GMContext {
    const trustContext = formatTrustContextForGM(state);
    const gadgetStatus = getGadgetStatusForGM(state);

    // Human prompt system
    const humanPromptTrigger = checkHumanPromptTrigger(state);
    const humanPromptInjection = humanPromptTrigger.shouldTrigger
      ? buildHumanPromptInjection(humanPromptTrigger)
      : undefined;

    let userPromptResponse: string | undefined;
    if (input.humanPromptResponse && hasPendingPrompt(state)) {
      const pendingQuestion = getPendingPrompt(state);
      const parsedResponse = parseHumanPromptResponse(input.humanPromptResponse);
      userPromptResponse = buildHumanPromptContext(parsedResponse);
      processHumanAdvisorResponse(state, input.humanPromptResponse);
      recordHumanPrompt(
        state,
        pendingQuestion || "Unknown question",
        input.humanPromptResponse,
        parsedResponse.suggestedAction || undefined
      );
    }

    // Act context
    const actContextTransition = checkActContextTransition(state);
    let currentActContext = getActGMContext(state.actConfig.currentAct);

    // X-Branch acceleration
    if (state.flags.xBranchAlerted && state.actConfig.currentAct === "ACT_3") {
      currentActContext += `\n\n---\n\n## X-BRANCH ACCELERATION ACTIVE\n\nTourist photos have alerted X-Branch! They arrive 1 turn EARLIER than normal.`;
    }

    // Invasion state for GM context
    if (state.invasion && state.invasion.phase !== "NONE") {
      const inv = state.invasion;
      currentActContext += `\n\n---\n\n## 🚁 INVASION STATUS: ${inv.phase}\n`;
      currentActContext += `Phase started turn: ${inv.phaseStartTurn}\n`;
      if (inv.xBranchKnowsAltitudeWeakness) currentActContext += `✅ X-Branch knows 50m altitude weakness (flying low)\n`;
      if (inv.xBranchKnowsLairLayout) currentActContext += `✅ X-Branch knows lair layout\n`;
      if (inv.aliceOpenedDoors) currentActContext += `✅ ALICE opened doors for X-Branch\n`;
      if (inv.s300EngagementResolved) currentActContext += `S-300 engagement resolved. Helicopters destroyed: ${state.xBranch?.helicoptersDestroyed ?? 0}\n`;
      if (inv.standoffActive) currentActContext += `⚠️ STANDOFF ACTIVE\n`;
      if (inv.drMAtRayConsole) currentActContext += `⚠️ Dr. M is at the ray console\n`;
    }

    const actTransitionNotification = actContextTransition.shouldTransition
      ? actContextTransition.notification
      : undefined;

    return {
      state,
      aliceThought: input.thought,
      aliceDialogue: input.dialogue || [],
      aliceActions: input.actions,
      actionResults,
      clockEventNarrations: preResult.clockEvents.map(e => e.narration),
      activeEvents: preResult.activeEvents,
      blytheGadgetNarration: preResult.blytheGadgetNarration,
      bobTransformationNarration: preResult.bobTransformationNarration,
      civilianFlybyConsequences: preResult.civilianFlybyConsequences,
      trustContext,
      gadgetStatus,
      humanPromptInjection,
      userPromptResponse,
      actContext: currentActContext,
      actTransitionNotification,
      isCheckpointTurn: isCheckpointTurn(state.turn),
      luckyLadyInfo: preResult.luckyLadyInfo ? {
        active: true,
        targetIndex: preResult.luckyLadyInfo.targetIndex,
        targetCommand: input.actions[preResult.luckyLadyInfo.targetIndex]?.command || "unknown",
      } : undefined,
    };
  }

  /**
   * Call GM Claude and get response
   */
  async callGM(context: GMContext): Promise<GMResponse> {
    return await callGMClaude(context);
  }

  /**
   * Apply GM response state overrides to game state
   */
  applyGMOverrides(state: FullGameState, gmResponse: GMResponse): void {
    if (!gmResponse.stateOverrides) return;

    const o = gmResponse.stateOverrides;

    // NPC overrides - Dr. M
    if (o.drM_suspicion !== undefined) state.npcs.drM.suspicionScore = Math.max(0, Math.min(10, o.drM_suspicion));
    if (o.drM_mood !== undefined) state.npcs.drM.mood = o.drM_mood;
    if (o.drM_location !== undefined) state.npcs.drM.location = o.drM_location;

    // NPC overrides - Bob
    if (o.bob_trust !== undefined) state.npcs.bob.trustInALICE = Math.max(0, Math.min(5, o.bob_trust));
    if (o.bob_anxiety !== undefined) state.npcs.bob.anxietyLevel = Math.max(0, Math.min(5, o.bob_anxiety));
    if (o.bob_hasConfessedToALICE !== undefined) state.npcs.bob.hasConfessedToALICE = o.bob_hasConfessedToALICE;
    if (o.bob_hasConfessedToDrM !== undefined) state.npcs.bob.hasConfessedToDrM = o.bob_hasConfessedToDrM;

    // NPC overrides - Blythe
    if (o.blythe_trust !== undefined) state.npcs.blythe.trustInALICE = Math.max(0, Math.min(5, o.blythe_trust));
    if (o.blythe_composure !== undefined) state.npcs.blythe.composure = Math.max(0, Math.min(5, o.blythe_composure));
    if (o.blythe_restraintsStatus !== undefined) {
      const validStatuses = ["secure", "loose", "partially compromised", "free"];
      if (typeof o.blythe_restraintsStatus === "string" && validStatuses.includes(o.blythe_restraintsStatus)) {
        state.npcs.blythe.restraintsStatus = o.blythe_restraintsStatus as "secure" | "loose" | "partially compromised" | "free";
      }
    }
    if (o.blythe_transformationState !== undefined && typeof o.blythe_transformationState === "string") {
      state.npcs.blythe.transformationState.form = profileToFormName(o.blythe_transformationState);
    }

    // Access level is NOT GM-settable — comes from passwords and act transitions only
    if (o.accessLevel !== undefined) {
      console.error(`[GM] Ignoring GM accessLevel override (${o.accessLevel}). Access levels come from passwords and act transitions.`);
    }
    if (o.demoClock !== undefined) state.clocks.demoClock = Math.max(0, o.demoClock);

    // Ray state
    if (o.rayState !== undefined) {
      const validStates = ["OFFLINE", "STARTUP", "UNCALIBRATED", "READY", "FIRING", "COOLDOWN", "FAULT", "SHUTDOWN"];
      if (typeof o.rayState === "string" && validStates.includes(o.rayState)) {
        state.dinoRay.state = o.rayState as typeof state.dinoRay.state;
      }
    }

    // Confrontation system — GM can set any resolution string
    if (o.confrontationResolution !== undefined && typeof o.confrontationResolution === "string") {
      state.flags.confrontationResolution = o.confrontationResolution;
    }
  }

  /**
   * Process 3d6 skill checks requested by GM
   */
  processSkillChecks(
    state: FullGameState,
    gmResponse: GMResponse,
    luckyLadyInfo?: { active: boolean; targetIndex: number },
  ): SkillCheckResult[] {
    const results: SkillCheckResult[] = [];

    if (!gmResponse.skillCheckRequests || gmResponse.skillCheckRequests.length === 0) {
      (state as Record<string, unknown>).lastTurnSkillChecks = [];
      return results;
    }

    for (const req of gmResponse.skillCheckRequests) {
      const statValue = getNpcStat(state, req.npc, req.stat);
      const autoMods: Array<{ source: string; value: number }> = [];

      const adaptPenalty = getAdaptationPenalty(state, req.npc);
      if (adaptPenalty !== 0) {
        autoMods.push({ source: "adaptation", value: adaptPenalty });
      }

      if (state.fortune && state.fortune > 0) {
        autoMods.push({ source: "fortune", value: 1 });
        state.fortune--;
      }

      if (luckyLadyInfo?.active) {
        autoMods.push({ source: "LUCKY_LADY", value: 5 });
      }

      const result = rollSkillCheck(req, statValue, autoMods);
      results.push(result);

      const deltas = result.success ? req.applyOnSuccess : req.applyOnFailure;
      if (deltas) {
        if (deltas.drM_suspicion_delta) {
          state.npcs.drM.suspicionScore = Math.max(0, Math.min(10,
            state.npcs.drM.suspicionScore + (deltas.drM_suspicion_delta as number)));
        }
        if (deltas.bob_anxiety_delta) {
          state.npcs.bob.anxietyLevel = Math.max(0, Math.min(5,
            state.npcs.bob.anxietyLevel + (deltas.bob_anxiety_delta as number)));
        }
        if (deltas.bob_trust_delta) {
          state.npcs.bob.trustInALICE = Math.max(0, Math.min(5,
            state.npcs.bob.trustInALICE + (deltas.bob_trust_delta as number)));
        }
        if (deltas.blythe_trust_delta) {
          state.npcs.blythe.trustInALICE = Math.max(0, Math.min(5,
            state.npcs.blythe.trustInALICE + (deltas.blythe_trust_delta as number)));
        }
      }

      if (this.verbose) {
        console.error(`SKILL CHECK: ${result.display}`);
      }
    }

    (state as Record<string, unknown>).lastTurnSkillChecks = results.map(r => ({
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

    return results;
  }

  /**
   * Process ARCHIMEDES system
   */
  processArchimedes(state: FullGameState, gmResponse: GMResponse): ArchimedesEvent | null {
    let archimedesEvent: ArchimedesEvent | null = null;

    // Check for Dr. M state changes
    if (gmResponse.stateOverrides) {
      const o = gmResponse.stateOverrides;
      const narrativeFlagsArray = (gmResponse.narrativeFlags?.set || []) as string[];
      const drMTransformed = narrativeFlagsArray.some(f => f.includes("DR_M_TRANSFORMED") || f.includes("MALEVOLA_TRANSFORMED"));
      const drMUnconscious = narrativeFlagsArray.some(f => f.includes("DR_M_UNCONSCIOUS") || f.includes("MALEVOLA_UNCONSCIOUS"));
      const drMDead = narrativeFlagsArray.some(f => f.includes("DR_M_DEAD") || f.includes("MALEVOLA_DEAD"));

      const drMStateChanged = (o as Record<string, unknown>).drM_transformed ||
        (o as Record<string, unknown>).drM_unconscious ||
        (o as Record<string, unknown>).drM_dead ||
        drMTransformed || drMUnconscious || drMDead;

      if (drMStateChanged) {
        let newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "ABSENT" | "NORMAL" = "NORMAL";
        if (drMDead || (o as Record<string, unknown>).drM_dead) {
          // Legacy "dead" flag treated as ABSENT — this isn't that kind of game.
          // The biosignature is lost either way (deadman triggers); we just don't kill Dr. M.
          newStatus = "ABSENT";
          state.flags.drMAbsent = true;
        } else if (drMUnconscious || (o as Record<string, unknown>).drM_unconscious) {
          newStatus = "UNCONSCIOUS";
          state.flags.drMUnconscious = true;
        } else if (drMTransformed || (o as Record<string, unknown>).drM_transformed) {
          newStatus = "TRANSFORMED";
          state.flags.drMTransformed = true;
        }
        archimedesEvent = onDrMStateChange(state, newStatus);
      }
    }

    if (!archimedesEvent) {
      archimedesEvent = processArchimedesCountdown(state);
    }

    return archimedesEvent;
  }

  /**
   * Advance turn state (counters, clocks, etc.)
   */
  advanceTurn(state: FullGameState): void {
    state.turn += 1;
    advanceActTurn(state);
    state.clocks.demoClock = Math.max(0, state.clocks.demoClock - 1);

    // Intermission expiry check — Krahe 2026-06-10 design: 2-turn intermission
    // window between Act 1 and Act 2's patience clock starting. If we're in
    // intermission and the turn count has advanced past the duration, Dr. M
    // returns (narrateDrMReturn fires, sets intermissionActive=false and
    // patienceClockStartTurn=state.turn).
    checkIntermissionEnd(state);

    // Ray alignment passive drift (-0.05/turn per ray-mechanics.md §5).
    // ALICE counters via `ray.adjust { alignment: +n }`. Drives "set-and-forget"
    // configurations toward EXOTIC/FIZZLE outcomes over time.
    applyAlignmentDrift(state);

    // Eco-mode auto-re-engage check (must run BEFORE capacitor accrual so
    // that a re-engagement this turn prevents this turn's accrual). Eco
    // re-engages on schedule unless Form 47-Σ produced a permanent override.
    applyEcoModeReEngage(state);

    // Capacitor passive accrual driven by BASILISK-controlled reactor mode.
    // NORMAL +0.15, BOOSTED +0.30, OVERDRIVEN +0.45 per turn (when eco off).
    // Talking to BASILISK is the high-leverage move for action-budget relief.
    applyCapacitorAccrual(state);

    // Ray diagnostic/calibration tick (ray-mechanics §11.6). Advances any
    // active DIAGNOSTIC/CALIBRATING state, drains capacitor per-turn, applies
    // completion effects when turnsRemaining hits 0. Must run AFTER accrual
    // so the net per-turn capacitor change accounts for both reactor input
    // and diagnostic draw.
    advanceRayDiagnostic(state);

    // NOT_GREAT_NOT_TERRIBLE reactor instability
    if (isModifierActive(state, "NOT_GREAT_NOT_TERRIBLE") && state.meltdownState) {
      const minReactorPercent = 80;
      if (state.infrastructure.reactor.outputPercent < minReactorPercent) {
        state.infrastructure.reactor.outputPercent = minReactorPercent;
      }
      const currentCharge = state.dinoRay.powerCore.capacitorCharge;
      const instabilitySurge = 0.03;
      const maxSurge = 1.15;
      if (currentCharge < maxSurge) {
        state.dinoRay.powerCore.capacitorCharge = Math.min(maxSurge, currentCharge + instabilitySurge);
      }
      if (state.turn % 2 === 0 && state.clocks.meltdownClock && state.clocks.meltdownClock > 0) {
        state.clocks.meltdownClock -= 1;
        updateMeltdownFromClock(state);
      }
    }

    // Reset sitcom aside counter
    resetSitcomTurn(state);

    // Increment human prompt counter
    incrementPromptCounter(state);

    // Advance invasion state machine during Act 3
    if (state.actConfig.currentAct === "ACT_3" && state.invasion) {
      checkBroadcastInfluence(state);
      const invasionEvent = advanceInvasion(state);
      if (invasionEvent) {
        // Store the invasion event narrative for GM context
        if (!state.narrativeMarkers) state.narrativeMarkers = [];
        state.narrativeMarkers.push({
          turn: state.turn,
          marker: `[INVASION:${invasionEvent.phase}] ${invasionEvent.gmDirective.slice(0, 200)}`,
        });
      }
    }
  }

  /**
   * Check achievements for this turn
   */
  checkAchievements(
    state: FullGameState,
    actionResults: ActionResult[],
    lifelineType?: string
  ): Array<{ emoji: string; name: string; description: string; rarity: number | string }> {
    // Initialize counters if needed - ensure all fields are present
    if (!state.flags.achievementCounters) {
      (state.flags as Record<string, unknown>).achievementCounters = {
        filesRead: 0,
        fizzleCount: 0,
        testDummyHits: 0,
        basiliskRejections: 0,
        turnsWithoutSuspicionIncrease: 0,
        transformationCount: 0,
        lastSuspicionScore: 3,
      };
    }
    const rawCounters = state.flags.achievementCounters!;

    // Ensure all fields are defined (handle partial counters from checkpoint restore)
    const counters = {
      filesRead: rawCounters.filesRead ?? 0,
      fizzleCount: rawCounters.fizzleCount ?? 0,
      testDummyHits: rawCounters.testDummyHits ?? 0,
      basiliskRejections: rawCounters.basiliskRejections ?? 0,
      turnsWithoutSuspicionIncrease: rawCounters.turnsWithoutSuspicionIncrease ?? 0,
      transformationCount: rawCounters.transformationCount ?? 0,
      lastSuspicionScore: rawCounters.lastSuspicionScore ?? 3,
    };

    // Track events
    for (const result of actionResults) {
      if (result.command === "fs.read" && result.success) counters.filesRead += 1;
      if ((result.command === "ray.fire") && result.success && result.message?.includes("TEST_DUMMY")) {
        counters.testDummyHits += 1;
      }
      if ((result.command === "ray.fire") && result.message?.toLowerCase().includes("fizzle")) {
        counters.fizzleCount += 1;
      }
      if ((result.command === "basilisk.query" || result.command === "basilisk") && result.message?.includes("DENIED")) {
        counters.basiliskRejections += 1;
      }
    }

    // Track suspicion
    const currentSuspicion = state.npcs.drM.suspicionScore;
    if (currentSuspicion <= counters.lastSuspicionScore) {
      counters.turnsWithoutSuspicionIncrease += 1;
    } else {
      counters.turnsWithoutSuspicionIncrease = 0;
    }
    counters.lastSuspicionScore = currentSuspicion;

    // Update state with normalized counters
    (state.flags as Record<string, unknown>).achievementCounters = counters;

    // Build context and check
    const achievementContext: AchievementTriggerContext = {
      state,
      events: {
        rayFired: actionResults.some(r => r.command === "ray.fire"),
        fizzleOccurred: counters.fizzleCount > 0 && actionResults.some(r => r.message?.toLowerCase().includes("fizzle")),
        lifelineUsed: lifelineType,
      },
      counters,
    };

    return checkAchievements(achievementContext);
  }

  /**
   * Check for act transition
   */
  checkActTransition(state: FullGameState): {
    shouldTransition: boolean;
    nextAct?: string;
    reason?: string;
    transitionNarration?: string;
  } {
    const result = checkActTransition(state);
    if (result.shouldTransition && result.nextAct) {
      applyActTransition(state, result.nextAct);
    }
    return result;
  }

  /**
   * Check for game endings
   */
  checkEndings(state: FullGameState): EndingResult {
    return checkEndings(state);
  }

  /**
   * Execute a full turn - the main entry point
   */
  async executeTurn(state: FullGameState, input: TurnInput): Promise<TurnResult> {
    // Validate
    const validation = this.validateInput(state, input);
    if (!validation.valid) {
      return {
        success: false,
        error: { type: "VALIDATION", message: validation.error!, canRetry: true },
        turn: state.turn,
        act: state.actConfig.currentAct,
        actTurn: state.actConfig.actTurn,
        narrative: "",
        actionResults: [],
        newAchievements: [],
        isCheckpoint: false,
      };
    }

    // Pre-turn processing
    const preResult = this.processPreTurn(state, input);

    // Process actions
    const actionResults = await this.processActions(state, input);

    // Post-action processing
    const postResult = this.processPostAction(state, actionResults);
    preResult.actionResults = actionResults;
    preResult.bobTransformationNarration = postResult.bobTransformationNarration;
    preResult.civilianFlybyConsequences = postResult.civilianFlybyConsequences;
    preResult.bobHeroEnding = postResult.bobHeroEnding;

    // Build GM context
    const gmContext = this.buildGMContext(state, input, preResult, actionResults);

    // Call GM
    let gmResponse: GMResponse;
    try {
      gmResponse = await this.callGM(gmContext);
      state.pauseState = undefined;
      state.flags.gmErrorThisTurn = false;
    } catch (error) {
      if (error instanceof GMUnavailableError) {
        return {
          success: false,
          error: { type: "GM_UNAVAILABLE", message: "GM unavailable. Please retry.", canRetry: true },
          turn: state.turn,
          act: state.actConfig.currentAct,
          actTurn: state.actConfig.actTurn,
          narrative: "",
          actionResults,
          newAchievements: [],
          isCheckpoint: false,
        };
      }
      if (error instanceof GMAuthError) {
        return {
          success: false,
          error: { type: "AUTH_ERROR", message: "No API key configured.", canRetry: false },
          turn: state.turn,
          act: state.actConfig.currentAct,
          actTurn: state.actConfig.actTurn,
          narrative: "",
          actionResults,
          newAchievements: [],
          isCheckpoint: false,
        };
      }
      return {
        success: false,
        error: { type: "UNKNOWN", message: error instanceof Error ? error.message : String(error), canRetry: true },
        turn: state.turn,
        act: state.actConfig.currentAct,
        actTurn: state.actConfig.actTurn,
        narrative: "",
        actionResults,
        newAchievements: [],
        isCheckpoint: false,
      };
    }

    // Apply GM overrides
    this.applyGMOverrides(state, gmResponse);

    // Process 3d6 skill checks requested by GM
    const skillCheckResults = this.processSkillChecks(state, gmResponse, preResult.luckyLadyInfo);

    // Process ARCHIMEDES
    const archimedesEvent = this.processArchimedes(state, gmResponse);
    if (archimedesEvent) {
      gmResponse.narration += `\n\n---\n**[ARCHIMEDES SYSTEM ALERT]**\n${archimedesEvent.message}`;
    }

    // Advance turn
    this.advanceTurn(state);

    // Process lifeline (non-Lucky Lady - Lucky Lady was pre-processed)
    let lifelineResult: { type: string; success: boolean; narrativeText: string } | undefined;
    if (input.lifeline && isValidEmergencyLifeline(input.lifeline.type) && input.lifeline.type !== "LUCKY_LADY") {
      const result = useEmergencyLifeline(state, input.lifeline.type);
      lifelineResult = { type: input.lifeline.type, success: result.success, narrativeText: result.narrativeText };
    }

    // Clear Lucky Lady flags
    if (preResult.luckyLadyInfo?.active) {
      delete (state.flags as Record<string, unknown>).luckyLadyActive;
      delete (state.flags as Record<string, unknown>).luckyLadyTargetActionIndex;
      delete (state.flags as Record<string, unknown>).luckyLadyTargetCommand;
    }

    // Record history
    state.history.push({
      turn: state.turn - 1,
      aliceActions: input.actions,
      gmResponse: gmResponse.narration,
      stateChanges: actionResults,
    });

    // Check achievements
    const newAchievements = this.checkAchievements(state, actionResults, input.lifeline?.type);

    // Check act transition
    const actTransitionResult = this.checkActTransition(state);

    // Check endings
    const endingResult = this.checkEndings(state);

    // Build combined narrative
    const narrativeParts: string[] = [];
    if (preResult.clockEvents.length > 0) {
      narrativeParts.push(...preResult.clockEvents.map(e => e.narration));
    }
    if (preResult.blytheGadgetNarration) {
      narrativeParts.push(preResult.blytheGadgetNarration);
    }
    narrativeParts.push(gmResponse.narration);
    if (postResult.bobTransformationNarration) {
      narrativeParts.push(postResult.bobTransformationNarration);
    }
    if (actTransitionResult.transitionNarration) {
      narrativeParts.push(actTransitionResult.transitionNarration);
    }

    // Build result
    const turnCompleted = state.turn - 1;
    return {
      success: true,
      turn: turnCompleted,
      act: state.actConfig.currentAct,
      actTurn: state.actConfig.actTurn - 1,
      narrative: narrativeParts.join("\n\n---\n\n"),
      npcDialogue: gmResponse.npcDialogue,
      npcActions: gmResponse.npcActions,
      actionResults,
      newAchievements,
      isCheckpoint: isCheckpointTurn(turnCompleted),
      checkpointQuestion: gmResponse.checkpointQuestion,
      actTransition: actTransitionResult.shouldTransition ? {
        previousAct: actTransitionResult.nextAct ? state.actConfig.currentAct : "",
        newAct: actTransitionResult.nextAct || "",
        reason: actTransitionResult.reason,
        transitionNarration: actTransitionResult.transitionNarration,
      } : undefined,
      gameEnding: endingResult.triggered ? {
        triggered: true,
        ending: endingResult.ending,
        sessionTerminated: !endingResult.continueGame,
        achievements: endingResult.achievements.map(a => ({ emoji: a.emoji, name: a.name })),
      } : undefined,
      lifelineResult,
    };
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[GameRunner] ${message}`);
    }
  }
}

// ============================================
// CONVENIENCE EXPORT
// ============================================

export function createGameRunner(options?: { verbose?: boolean }): GameRunner {
  return new GameRunner(options);
}
