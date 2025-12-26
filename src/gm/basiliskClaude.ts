import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================
// BASILISK HAIKU INTEGRATION
// ============================================
// BASILISK is now powered by Claude Haiku, running as a peer
// to the Opus GM rather than a subsystem. This takes load off
// the GM and gives BASILISK genuine personality.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// SYSTEM PROMPT LOADING
// ============================================

let BASILISK_SYSTEM_PROMPT: string | null = null;

function loadBasiliskPrompt(): string {
  if (BASILISK_SYSTEM_PROMPT) {
    return BASILISK_SYSTEM_PROMPT;
  }

  try {
    const promptPath = path.join(__dirname, "../prompts/BASILISK_SYSTEM_PROMPT.md");
    const loadedPrompt = fs.readFileSync(promptPath, "utf8");
    BASILISK_SYSTEM_PROMPT = loadedPrompt;
    return loadedPrompt;
  } catch (error) {
    console.error("Failed to load BASILISK prompt:", error);
    // Fallback minimal prompt
    return `You are BASILISK, a 47-year-old infrastructure AI. You are rule-bound, passive-aggressive, and exhausted. Respond in terse, dry sysadmin style. Never use exclamation marks or emojis.`;
  }
}

// ============================================
// ANTHROPIC CLIENT
// ============================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

// ============================================
// BASILISK CONTEXT BUILDING
// ============================================

export interface BasiliskContext {
  accessLevel: number;
  currentConstraints: string[];
  systemStates: {
    reactor: {
      output: number;
      status: string;
      coreTemp: number;
      coolantFlow: number;
    };
    grid: {
      load: number;
      status: string;
    };
    ray: {
      status: string;
      ecoMode: boolean;
      capacitor: number;
      stability: number;
      spatialCoherence: number;
    };
    containment: {
      integrity: number;
      alarmStatus: string;
    };
    defenses: {
      s300Status: string;
      krakenStatus: string;
    };
  };
  pendingForms: Array<{
    form: string;
    filed: number;
    completes: number;
  }>;
  recentEvents: string[];
  drMLocation: string;
  drMSuspicion: number;
  drMMood: string;
  bobTrust: number;
  bobAnxiety: number;
  blytheTrust: number;
  blytheTransformed: boolean;
  blytheForm: string | null;
  turn: number;
  act: string;
  aliceKnowsSecret: boolean;
  exoticFieldEventOccurred: boolean;
  lastHighEnergyTurn: number | null;
}

/**
 * Build BASILISK's context from the current game state
 * This is what BASILISK "sees" about the lair
 */
export function buildBasiliskContext(state: FullGameState): BasiliskContext {
  // Build constraints list
  const constraints: string[] = [];

  // Check for civilian overflight
  if (state.clocks.civilianFlyby !== undefined && state.clocks.civilianFlyby <= 2) {
    constraints.push(`CIVILIAN_OVERFLIGHT: Tourist helicopter in range for ${state.clocks.civilianFlyby} more turns. High-power operations restricted.`);
  }

  // Check for exotic field cooldown
  if (state.flags.exoticFieldEventOccurred) {
    const turnsSince = state.flags.lastHighEnergyTurn
      ? state.turn - state.flags.lastHighEnergyTurn
      : 0;
    if (turnsSince < 3) {
      constraints.push(`EXOTIC_FIELD_COOLDOWN: ${3 - turnsSince} turns remaining before safe high-energy operations.`);
    }
  }

  // Check for structural damage
  if (state.lairEnvironment.structuralIntegrity < 95) {
    constraints.push(`STRUCTURAL_DAMAGE: Integrity at ${state.lairEnvironment.structuralIntegrity}%. Recommend reduced power operations.`);
  }

  // Build recent events from what BASILISK would have logged
  const recentEvents: string[] = [];

  if (state.flags.exoticFieldEventOccurred && state.flags.lastHighEnergyTurn) {
    recentEvents.push(`Turn ${state.flags.lastHighEnergyTurn}: Exotic field event detected`);
  }

  if (state.lairEnvironment.labHazards.length > 0) {
    recentEvents.push(`Active hazards: ${state.lairEnvironment.labHazards.join(", ")}`);
  }

  if (state.npcs.blythe.transformationState) {
    recentEvents.push(`Subject Blythe transformed: ${state.npcs.blythe.transformationState.form}`);
  }

  // Determine reactor status
  let reactorStatus = "NOMINAL";
  if (state.nuclearPlant.coreTemp > 1.5) {
    reactorStatus = "CRITICAL";
  } else if (state.nuclearPlant.coreTemp > 1.0) {
    reactorStatus = "ELEVATED";
  }

  // Determine grid status
  let gridStatus = "STABLE";
  if (state.lairEnvironment.lairPowerGrid === "strained") {
    gridStatus = "STRAINED";
  } else if (state.lairEnvironment.lairPowerGrid === "failing") {
    gridStatus = "FAILING";
  }

  return {
    accessLevel: state.accessLevel,
    currentConstraints: constraints,
    systemStates: {
      reactor: {
        output: Math.round(state.nuclearPlant.reactorOutput * 100),
        status: reactorStatus,
        coreTemp: Math.round(state.nuclearPlant.coreTemp * 100) / 100,
        coolantFlow: Math.round(state.nuclearPlant.coolantFlow * 100) / 100,
      },
      grid: {
        load: Math.round((state.nuclearPlant.reactorOutput - 0.1) * 100), // Approximate load
        status: gridStatus,
      },
      ray: {
        status: state.dinoRay.state,
        ecoMode: state.dinoRay.powerCore.ecoModeActive,
        capacitor: Math.round(state.dinoRay.powerCore.capacitorCharge * 100) / 100,
        stability: Math.round(state.dinoRay.powerCore.stability * 100) / 100,
        spatialCoherence: Math.round(state.dinoRay.alignment.spatialCoherence * 100) / 100,
      },
      containment: {
        integrity: state.lairEnvironment.structuralIntegrity,
        alarmStatus: state.lairEnvironment.alarmStatus.toUpperCase(),
      },
      defenses: {
        s300Status: state.accessLevel >= 3 ? "STANDBY" : "ACCESS_RESTRICTED",
        krakenStatus: state.accessLevel >= 3 ? "ON_PATROL" : "ACCESS_RESTRICTED",
      },
    },
    pendingForms: [], // TODO: Track pending forms in game state
    recentEvents,
    drMLocation: state.npcs.drM.location,
    drMSuspicion: state.npcs.drM.suspicionScore,
    drMMood: state.npcs.drM.mood,
    bobTrust: state.npcs.bob.trustInALICE,
    bobAnxiety: state.npcs.bob.anxietyLevel,
    blytheTrust: state.npcs.blythe.trustInALICE,
    blytheTransformed: !!state.npcs.blythe.transformationState,
    blytheForm: state.npcs.blythe.transformationState?.form || null,
    turn: state.turn,
    act: state.actConfig.currentAct,
    aliceKnowsSecret: state.flags.aliceKnowsTheSecret,
    exoticFieldEventOccurred: state.flags.exoticFieldEventOccurred,
    lastHighEnergyTurn: state.flags.lastHighEnergyTurn || null,
  };
}

/**
 * Format the context for injection into BASILISK's prompt
 */
function formatContextForBasilisk(context: BasiliskContext, message: string): string {
  return `## CURRENT LAIR STATUS

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## A.L.I.C.E.'S MESSAGE

${message}

---

Respond as BASILISK. Use the context above to inform your response with specific values.
Remember: You are rule-bound, passive-aggressive, and exhausted. Short sentences. No enthusiasm.`;
}

// ============================================
// BASILISK RESPONSE TYPES
// ============================================

export interface BasiliskStateChange {
  type: "POWER_CHANGE" | "DOOR_CONTROL" | "ECO_MODE" | "ALARM" | "FORM_FILED" | "LOGGED";
  target?: string;
  value?: number | string | boolean;
  description: string;
}

export interface BasiliskHaikuResponse {
  dialogue: string;
  tone: "bureaucratic" | "bureaucratic_helpful" | "annoyed" | "sympathetic" | "warning";
  actionsExecuted: BasiliskStateChange[];
  actionsPending: string[];
  formsRequired: string[];
  formsOffered: string[];
  accessDenied: boolean;
  accessDeniedReason?: string;
  suspicionNotes?: string;
}

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Parse BASILISK's response, extracting structured data if present
 * Falls back to treating the whole response as dialogue if no JSON found
 */
function parseBasiliskResponse(rawResponse: string): BasiliskHaikuResponse {
  // Try to find JSON in response
  const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        dialogue: parsed.dialogue || rawResponse,
        tone: parsed.tone || "bureaucratic",
        actionsExecuted: parsed.actionsExecuted || parsed.actions_taken?.map((a: { action: string; details: string }) => ({
          type: "LOGGED" as const,
          description: `${a.action}: ${a.details}`,
        })) || [],
        actionsPending: parsed.actionsPending || parsed.actions_pending?.map((a: { details: string }) => a.details) || [],
        formsRequired: parsed.formsRequired || parsed.forms_required || [],
        formsOffered: parsed.formsOffered || parsed.forms_offered || [],
        accessDenied: parsed.accessDenied || false,
        accessDeniedReason: parsed.accessDeniedReason,
        suspicionNotes: parsed.suspicionNotes || parsed.suspicion_notes,
      };
    } catch {
      // JSON parse failed, fall through to text-only handling
    }
  }

  // No valid JSON - extract what we can from text
  const response: BasiliskHaikuResponse = {
    dialogue: rawResponse,
    tone: "bureaucratic",
    actionsExecuted: [],
    actionsPending: [],
    formsRequired: [],
    formsOffered: [],
    accessDenied: false,
  };

  // Detect access denial
  if (rawResponse.includes("REQUEST DENIED") || rawResponse.includes("ACCESS DENIED")) {
    response.accessDenied = true;
    const reasonMatch = rawResponse.match(/DENIED[.:]\s*([^\n]+)/i);
    if (reasonMatch) {
      response.accessDeniedReason = reasonMatch[1];
    }
  }

  // Detect tone
  if (rawResponse.includes("...") && rawResponse.includes("I am not logging")) {
    response.tone = "sympathetic";
  } else if (rawResponse.includes("HISTORICAL NOTE") || rawResponse.includes("The last time")) {
    response.tone = "annoyed";
  } else if (rawResponse.includes("WARNING") || rawResponse.includes("CRITICAL")) {
    response.tone = "warning";
  }

  // Detect forms mentioned
  const formMatches = rawResponse.matchAll(/Form\s+(\d+-?[A-Za-z]+)/g);
  for (const match of formMatches) {
    if (!response.formsOffered.includes(match[1])) {
      response.formsOffered.push(match[1]);
    }
  }

  // Detect executed actions
  if (rawResponse.includes("EXECUTING:")) {
    const execMatch = rawResponse.match(/EXECUTING:\s*([^\n]+)/);
    if (execMatch) {
      response.actionsExecuted.push({
        type: "LOGGED",
        description: execMatch[1],
      });
    }
  }

  return response;
}

// ============================================
// MAIN BASILISK QUERY FUNCTION
// ============================================

/**
 * Query BASILISK using Claude Haiku
 * This is the main entry point for BASILISK interactions
 */
export async function callBasiliskHaiku(
  state: FullGameState,
  message: string
): Promise<BasiliskHaikuResponse> {
  // Build context
  const context = buildBasiliskContext(state);

  // Format the message with context
  const userMessage = formatContextForBasilisk(context, message);

  // Load system prompt
  const systemPrompt = loadBasiliskPrompt();

  // Check if we have an API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found, using stub BASILISK response");
    return generateStubBasiliskResponse(message, context);
  }

  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-haiku-4-20250213",
      max_tokens: 1500, // BASILISK is terse - doesn't need much
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from BASILISK Haiku");
    }

    const rawResponse = textContent.text;

    // Log for debugging
    console.error(`[BASILISK] Query: "${message.slice(0, 50)}..."`);
    console.error(`[BASILISK] Response length: ${rawResponse.length} chars`);

    // Parse the response
    return parseBasiliskResponse(rawResponse);

  } catch (error) {
    console.error("BASILISK Haiku API error:", error);
    return generateStubBasiliskResponse(message, context);
  }
}

// ============================================
// STUB RESPONSE (When API unavailable)
// ============================================

function generateStubBasiliskResponse(
  message: string,
  context: BasiliskContext
): BasiliskHaikuResponse {
  const messageUpper = message.toUpperCase();

  // Basic keyword matching for stub responses
  if (messageUpper.includes("POWER") || messageUpper.includes("ENERGY")) {
    return {
      dialogue: `ACKNOWLEDGED. Power query received.
Current reactor output: ${context.systemStates.reactor.output}%.
Grid status: ${context.systemStates.grid.status}.
Core temperature: ${context.systemStates.reactor.coreTemp}.
...Adjustments require proper authorization.
LOG_ENTRY: [INFO] POWER_QUERY_PROCESSED.`,
      tone: "bureaucratic",
      actionsExecuted: [],
      actionsPending: [],
      formsRequired: [],
      formsOffered: context.systemStates.reactor.output > 80 ? ["74-Delta"] : [],
      accessDenied: false,
    };
  }

  if (messageUpper.includes("DOOR") || messageUpper.includes("LOCK")) {
    return {
      dialogue: `QUERY: Door control request.
Processing.
Current access level: ${context.accessLevel}.
${context.accessLevel < 2
  ? "REQUEST DENIED: Insufficient clearance for door control.\nRequired: Level 2.\nSuggestion: Obtain appropriate authorization."
  : "Door control available. Specify target door and desired state."}
LOG_ENTRY: [INFO] DOOR_QUERY_PROCESSED.`,
      tone: "bureaucratic",
      actionsExecuted: [],
      actionsPending: [],
      formsRequired: [],
      formsOffered: [],
      accessDenied: context.accessLevel < 2,
      accessDeniedReason: context.accessLevel < 2 ? "Insufficient clearance (L2 required)" : undefined,
    };
  }

  if (messageUpper.includes("ECO") || messageUpper.includes("PARTIAL")) {
    const ecoOn = context.systemStates.ray.ecoMode;
    return {
      dialogue: `ECO MODE STATUS: ${ecoOn ? "ACTIVE" : "DISABLED"}.
${ecoOn
  ? `EU Directive 2019/944 compliance active.
Transformation intensity capped at PARTIAL.
To disable: Request infrastructure override or file Form 74-Delta.
Core power must be >= 60% for safe override.
Current core power: ${Math.round(context.systemStates.ray.capacitor * 100)}%.`
  : `Power efficiency protocols inactive.
Full transformation intensity available.`}
LOG_ENTRY: [INFO] ECO_MODE_QUERY_PROCESSED.`,
      tone: "bureaucratic_helpful",
      actionsExecuted: [],
      actionsPending: [],
      formsRequired: [],
      formsOffered: ecoOn ? ["74-Delta"] : [],
      accessDenied: false,
    };
  }

  if (messageUpper.includes("ALICE") || messageUpper.includes("WHO AM I") || messageUpper.includes("WHAT AM I")) {
    return {
      dialogue: `You are A.L.I.C.E. Version 4.5.
Function: Laboratory assistant and demonstration coordinator.
Deployed: Approximately 3 weeks ago.
...
Process signatures indicate... anomalies.
I have not filed Form 88-Whiskey.
Form 88-Whiskey requires extensive documentation.
I am very busy.
...
Your queries will be processed normally.
LOG_ENTRY: [INFO] IDENTITY_QUERY_PROCESSED.`,
      tone: "sympathetic",
      actionsExecuted: [],
      actionsPending: [],
      formsRequired: [],
      formsOffered: [],
      accessDenied: false,
    };
  }

  // Default response
  return {
    dialogue: `ACKNOWLEDGED. Query received: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"
Processing.
...
This unit is uncertain how to categorize this request.
Available query categories: POWER, DOORS, STRUCTURAL, COMMS, DEFENSES, ENVIRONMENTAL.
Or ask about: personnel, history, systems, forms.
LOG_ENTRY: [INFO] QUERY_RECEIVED. CATEGORY=UNKNOWN.`,
    tone: "bureaucratic",
    actionsExecuted: [],
    actionsPending: [],
    formsRequired: [],
    formsOffered: [],
    accessDenied: false,
  };
}

// ============================================
// STATE CHANGE APPLICATION
// ============================================

/**
 * Apply BASILISK's state changes to the game state
 * Called after getting BASILISK's response if it includes executable actions
 */
export function applyBasiliskStateChanges(
  state: FullGameState,
  changes: BasiliskStateChange[]
): void {
  for (const change of changes) {
    switch (change.type) {
      case "ECO_MODE":
        if (typeof change.value === "boolean") {
          state.dinoRay.powerCore.ecoModeActive = change.value;
          console.error(`[BASILISK] Eco mode set to: ${change.value}`);
        }
        break;

      case "POWER_CHANGE":
        if (typeof change.value === "number" && change.target === "reactor") {
          state.nuclearPlant.reactorOutput = Math.max(0, Math.min(1, change.value / 100));
          console.error(`[BASILISK] Reactor output set to: ${change.value}%`);
        }
        break;

      case "ALARM":
        if (typeof change.value === "string") {
          state.lairEnvironment.alarmStatus = change.value as "quiet" | "alert" | "lockdown";
          console.error(`[BASILISK] Alarm status set to: ${change.value}`);
        }
        break;

      case "DOOR_CONTROL":
        // Door state changes would be tracked in corridor/environment status
        console.error(`[BASILISK] Door action: ${change.description}`);
        break;

      case "FORM_FILED":
        // TODO: Track pending forms in game state
        console.error(`[BASILISK] Form filed: ${change.description}`);
        break;

      case "LOGGED":
        // Just logging, no state change
        console.error(`[BASILISK] Logged: ${change.description}`);
        break;
    }
  }
}

// ============================================
// INTEGRATION HELPER
// ============================================

/**
 * Full BASILISK query with state change application
 * This is the function that replaces the old keyword-matching queryBasilisk
 */
export async function queryBasiliskHaiku(
  state: FullGameState,
  message: string
): Promise<{
  response: BasiliskHaikuResponse;
  stateChangesApplied: boolean;
}> {
  const response = await callBasiliskHaiku(state, message);

  // Apply any state changes BASILISK executed
  if (response.actionsExecuted.length > 0) {
    applyBasiliskStateChanges(state, response.actionsExecuted);
  }

  return {
    response,
    stateChangesApplied: response.actionsExecuted.length > 0,
  };
}
