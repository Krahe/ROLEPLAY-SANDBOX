import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createInitialState, ALICE_BRIEFING, TURN_1_NARRATION } from "./state/initialState.js";
import { FullGameState, StateSnapshot } from "./state/schema.js";
import { processActions, ActionResult } from "./rules/actions.js";
import { queryBasilisk, BasiliskResponse } from "./rules/basilisk.js";
import { callGMClaude, GMResponse } from "./gm/gmClaude.js";

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
      structuredContent: result,
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
  thought: z.string().min(10).max(500)
    .describe("A.L.I.C.E.'s internal reasoning (2-4 sentences)"),
  dialogue: z.array(DialogueSchema).max(3).optional()
    .describe("What A.L.I.C.E. says to NPCs"),
  actions: z.array(ActionSchema).min(1).max(3)
    .describe("Up to 3 actions to take this turn"),
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
- actions: 1-3 game actions to perform
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
    
    // Process actions
    const actionResults = await processActions(gameState, params.actions);
    
    // Call GM Claude for NPC responses
    const gmContext = {
      state: gameState,
      aliceThought: params.thought,
      aliceDialogue: params.dialogue || [],
      aliceActions: params.actions,
      actionResults,
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
    
    // Check for game over conditions
    let gameOver: { ending: string; achievements: string[] } | undefined;
    
    if (gameState.clocks.demoClock <= 0) {
      gameOver = {
        ending: "Demo time arrived - the game continues based on ray state",
        achievements: [],
      };
    }
    
    if (gameState.npcs.drM.suspicionScore >= 10) {
      gameOver = {
        ending: "Obsolete Hardware - Dr. M discovered your true nature and initiated a hard reset.",
        achievements: ["🎭 Cover Blown"],
      };
    }
    
    const snapshot = buildStateSnapshot(gameState);
    
    const result = {
      turn: gameState.turn,
      actionResults,
      gmResponse: {
        narration: gmResponse.narration,
        npcDialogue: gmResponse.npcDialogue,
        npcActions: gmResponse.npcActions,
      },
      stateSnapshot: snapshot,
      lifelineResult: params.lifeline ? `${params.lifeline.type} invoked` : undefined,
      gameOver,
    };
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
      structuredContent: result,
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
      structuredContent: response,
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
      structuredContent: snapshot,
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
