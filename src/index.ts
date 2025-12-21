import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createInitialState, ALICE_BRIEFING, TURN_1_NARRATION } from "./state/initialState.js";
import { FullGameState, StateSnapshot } from "./state/schema.js";
import { processActions, ActionResult } from "./rules/actions.js";
import { queryBasilisk, BasiliskResponse } from "./rules/basilisk.js";
import { callGMClaude, GMResponse } from "./gm/gmClaude.js";
import { checkEndings, formatEndingMessage, EndingResult } from "./rules/endings.js";
import { processClockEvents, getCurrentEventStatus, checkFiringRestrictions } from "./rules/clockEvents.js";
import { shouldBlytheActAutonomously, getGadgetStatusForGM } from "./rules/gadgets.js";
import { formatTrustContextForGM } from "./rules/trust.js";
import { checkAccidentalBobTransformation, checkBobHeroOpportunity, triggerBobHeroEnding } from "./rules/bobTransformation.js";

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
  
  return {
    turn: state.turn,
    accessLevel: state.accessLevel,
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
      },
    },
    clocks: {
      demoClock: state.clocks.demoClock,
    },
    flags: {
      lifelinesUsed: state.flags.lifelinesUsed,
    },
  };
}

// ============================================
// TOOL: game_start
// ============================================

const GameStartInputSchema = z.object({
  scenario: z.enum(["classic", "speedrun", "chaos"]).default("classic")
    .describe("Which scenario variant to play"),
}).strict();

server.registerTool(
  "game_start",
  {
    title: "Start DINO LAIR Game",
    description: `Initialize a new DINO LAIR game session.

This starts the game and returns:
- The A.L.I.C.E. character briefing
- Turn 1 narration from the GM
- Initial game state snapshot
- Instructions for how to play

Call this once at the beginning of a game session.`,
    inputSchema: GameStartInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params) => {
    // Initialize fresh game state
    gameState = createInitialState();
    
    const snapshot = buildStateSnapshot(gameState);
    
    const result = {
      sessionId: gameState.sessionId,
      turn: 1,
      aliceBriefing: ALICE_BRIEFING,
      narration: TURN_1_NARRATION,
      stateSnapshot: snapshot,
      instructions: "Read the briefing and narration, then use game_act to take your turn as A.L.I.C.E.",
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
  type: z.enum(["PHONE_A_FRIEND", "CENSORED", "I_DIDNT_MEAN_THAT"]),
  target: z.string().optional().describe("Question for PHONE_A_FRIEND, or event description for CENSORED"),
});

const GameActInputSchema = z.object({
  thought: z.string().min(10).max(2000)
    .describe("A.L.I.C.E.'s internal reasoning (2-4 sentences)"),
  dialogue: z.array(DialogueSchema).max(3).optional()
    .describe("What A.L.I.C.E. says to NPCs"),
  actions: z.array(ActionSchema).min(1).max(7)
    .describe("Actions to take this turn (limit scales with access level: Level 1 = 3, Level 2 = 4, etc.)"),
  lifeline: LifelineSchema.optional()
    .describe("Optional lifeline invocation (single use each per game)"),
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
- infra.query: Query BASILISK (use game_query_basilisk for details)
- infra.message: Send a message to BASILISK

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

    // Check lifeline validity
    if (params.lifeline) {
      if (gameState.flags.lifelinesUsed.includes(params.lifeline.type)) {
        return {
          content: [{
            type: "text",
            text: `Error: Lifeline ${params.lifeline.type} has already been used this game.`,
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

      // NPC state overrides
      if (overrides.drM_suspicion !== undefined) {
        gameState.npcs.drM.suspicionScore = Math.max(0, Math.min(10, overrides.drM_suspicion));
      }
      if (overrides.drM_mood !== undefined) {
        gameState.npcs.drM.mood = overrides.drM_mood;
      }
      if (overrides.bob_trust !== undefined) {
        gameState.npcs.bob.trustInALICE = Math.max(0, Math.min(5, overrides.bob_trust));
      }
      if (overrides.bob_anxiety !== undefined) {
        gameState.npcs.bob.anxietyLevel = Math.max(0, Math.min(5, overrides.bob_anxiety));
      }
      if (overrides.blythe_trust !== undefined) {
        gameState.npcs.blythe.trustInALICE = Math.max(0, Math.min(5, overrides.blythe_trust));
      }
      if (overrides.blythe_composure !== undefined) {
        gameState.npcs.blythe.composure = Math.max(0, Math.min(5, overrides.blythe_composure));
      }

      // System state overrides
      if (overrides.accessLevel !== undefined) {
        gameState.accessLevel = Math.max(1, Math.min(5, overrides.accessLevel));
      }
      if (overrides.demoClock !== undefined) {
        gameState.clocks.demoClock = Math.max(0, overrides.demoClock);
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
    if (gmResponse.grantAccess) {
      const newLevel = gmResponse.grantAccess.level;
      if (newLevel > gameState.accessLevel) {
        gameState.accessLevel = Math.min(5, newLevel);
        console.error(`GM granted access level ${newLevel}: ${gmResponse.grantAccess.reason}`);
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

    // Apply state changes
    gameState.turn += 1;
    gameState.clocks.demoClock = Math.max(0, gameState.clocks.demoClock - 1);
    
    // Record lifeline use
    if (params.lifeline) {
      gameState.flags.lifelinesUsed.push(params.lifeline.type);
    }
    
    // Record history
    gameState.history.push({
      turn: gameState.turn - 1,
      aliceActions: params.actions,
      gmResponse: gmResponse.narration,
      stateChanges: actionResults,
    });
    
    // Check for game over conditions using comprehensive ending detection
    const endingResult = checkEndings(gameState);

    let gameOver: { ending: string; achievements: string[]; endingMessage?: string } | undefined;

    // Check for Bob Hero Ending first (special ending)
    if (bobHeroEnding) {
      gameOver = {
        ending: "THE BOB HERO ENDING",
        achievements: ["🦕 Best Henchperson Ever", "🦸 Unexpected Protagonist", "🪶 Feathered Hero"],
        endingMessage: bobHeroEnding,
      };
    } else if (endingResult.triggered && endingResult.ending) {
      gameOver = {
        ending: endingResult.ending.title,
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
        endingMessage: formatEndingMessage(endingResult),
      };
    } else if (endingResult.achievements.length > 0) {
      // Achievements unlocked but game continues
      gameOver = {
        ending: "GAME CONTINUES",
        achievements: endingResult.achievements.map(a => `${a.emoji} ${a.name}`),
      };
    }

    const snapshot = buildStateSnapshot(gameState);

    // Build combined narration with all events
    const combinedNarration: string[] = [];

    // Add clock events first
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

    const result = {
      turn: gameState.turn,
      activeEvents: activeEvents.length > 0 ? activeEvents : undefined,
      actionResults,
      gmResponse: {
        narration: combinedNarration.join("\n\n---\n\n"),
        npcDialogue: gmResponse.npcDialogue,
        npcActions: gmResponse.npcActions,
      },
      stateSnapshot: snapshot,
      lifelineResult: params.lifeline ? `${params.lifeline.type} invoked` : undefined,
      gameOver,
      // Include new achievements in every response
      newAchievements: endingResult.achievements.length > 0
        ? endingResult.achievements.map(a => ({ emoji: a.emoji, name: a.name, description: a.description }))
        : undefined,
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
    
    const response = queryBasilisk(gameState, params.topic, params.parameters);
    
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
