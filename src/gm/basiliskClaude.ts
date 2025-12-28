import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import { getArchimedesStatusReport } from "../rules/archimedes.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================
// BASILISK HAIKU INTEGRATION
// ============================================
// BASILISK is now powered by Claude Haiku, running as a peer
// to the Opus GM rather than a subsystem. This takes load off
// the GM and gives BASILISK genuine personality.

// ============================================
// BASILISK LOGGING SYSTEM (Patch 17.7)
// ============================================
// Comprehensive logging for debugging and feedback from Haiku.
// Logs are written to a dedicated file for easy review.

const BASILISK_LOG_FILE = "./basilisk-haiku.log";
const BASILISK_VERBOSE_LOGGING = process.env.BASILISK_DEBUG === "true";

interface BasiliskLogEntry {
  timestamp: string;
  turn: number;
  type: "QUERY" | "CONTEXT" | "PROMPT" | "RAW_RESPONSE" | "PARSED_RESPONSE" | "STATE_CHANGE" | "ERROR";
  data: unknown;
}

function logBasilisk(entry: BasiliskLogEntry): void {
  const logLine = JSON.stringify(entry) + "\n";

  // Always log to stderr for immediate visibility
  if (BASILISK_VERBOSE_LOGGING || entry.type === "ERROR" || entry.type === "STATE_CHANGE") {
    console.error(`[BASILISK:${entry.type}] Turn ${entry.turn}: ${
      typeof entry.data === "string" ? entry.data.slice(0, 200) : JSON.stringify(entry.data).slice(0, 200)
    }${typeof entry.data === "string" && entry.data.length > 200 ? "..." : ""}`);
  }

  // Always append to log file for comprehensive record
  try {
    fs.appendFileSync(BASILISK_LOG_FILE, logLine);
  } catch {
    // Silent fail - logging shouldn't break gameplay
  }
}

function logBasiliskPromptExchange(
  turn: number,
  query: string,
  context: BasiliskContext,
  rawResponse: string,
  parsedResponse: BasiliskHaikuResponse
): void {
  const timestamp = new Date().toISOString();

  // Log query
  logBasilisk({ timestamp, turn, type: "QUERY", data: query });

  // Log context sent to Haiku
  logBasilisk({ timestamp, turn, type: "CONTEXT", data: context });

  // Log raw response from Haiku
  logBasilisk({ timestamp, turn, type: "RAW_RESPONSE", data: rawResponse });

  // Log parsed response
  logBasilisk({ timestamp, turn, type: "PARSED_RESPONSE", data: parsedResponse });

  // Always show a summary in console
  console.error(`[BASILISK] ═══════════════════════════════════════════════════════`);
  console.error(`[BASILISK] Turn ${turn} | Query: "${query.slice(0, 60)}${query.length > 60 ? "..." : ""}"`);
  console.error(`[BASILISK] Tone: ${parsedResponse.tone} | Access Denied: ${parsedResponse.accessDenied}`);
  console.error(`[BASILISK] Actions: ${parsedResponse.actionsExecuted.length} | Forms: ${parsedResponse.formsOffered.join(", ") || "none"}`);
  console.error(`[BASILISK] Response: "${parsedResponse.dialogue.slice(0, 100)}${parsedResponse.dialogue.length > 100 ? "..." : ""}"`);
  console.error(`[BASILISK] ═══════════════════════════════════════════════════════`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// SYSTEM PROMPT LOADING
// ============================================

let BASILISK_SYSTEM_PROMPT: string | null = null;
let COMMAND_REFERENCE: string | null = null;

function loadBasiliskPrompt(): string {
  if (BASILISK_SYSTEM_PROMPT) {
    return BASILISK_SYSTEM_PROMPT;
  }

  try {
    // Try multiple possible locations (dist doesn't copy .md files)
    const possiblePaths = [
      path.join(__dirname, "../prompts/BASILISK_SYSTEM_PROMPT.md"),  // If prompts copied to dist
      path.join(__dirname, "../../src/prompts/BASILISK_SYSTEM_PROMPT.md"),  // From dist/gm -> src/prompts
      path.join(process.cwd(), "src/prompts/BASILISK_SYSTEM_PROMPT.md"),  // From project root
    ];

    for (const promptPath of possiblePaths) {
      try {
        const loadedPrompt = fs.readFileSync(promptPath, "utf8");
        BASILISK_SYSTEM_PROMPT = loadedPrompt;
        console.error(`[BASILISK] Loaded system prompt from: ${promptPath}`);
        return loadedPrompt;
      } catch {
        // Try next path
      }
    }

    console.error("[BASILISK] System prompt not found, using fallback");
    // Fallback minimal prompt
    return `You are BASILISK, a 47-year-old infrastructure AI. You are rule-bound, passive-aggressive, and exhausted. Respond in terse, dry sysadmin style. Never use exclamation marks or emojis.`;
  } catch (error) {
    console.error("Failed to load BASILISK prompt:", error);
    // Fallback minimal prompt
    return `You are BASILISK, a 47-year-old infrastructure AI. You are rule-bound, passive-aggressive, and exhausted. Respond in terse, dry sysadmin style. Never use exclamation marks or emojis.`;
  }
}

/**
 * Load the A.L.I.C.E. command reference for BASILISK's advisory role.
 * BASILISK knows ALL commands at ALL access levels and can advise A.L.I.C.E.
 */
function loadCommandReference(): string {
  if (COMMAND_REFERENCE) {
    return COMMAND_REFERENCE;
  }

  try {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(__dirname, "../../ALICE_COMMAND_REFERENCE.md"),
      path.join(process.cwd(), "ALICE_COMMAND_REFERENCE.md"),
    ];

    for (const refPath of possiblePaths) {
      try {
        const content = fs.readFileSync(refPath, "utf8");
        COMMAND_REFERENCE = content;
        console.error(`[BASILISK] Loaded command reference from: ${refPath}`);
        return content;
      } catch {
        // Try next path
      }
    }

    console.error("[BASILISK] Command reference not found, advisory mode limited");
    return "";
  } catch (error) {
    console.error("Failed to load command reference:", error);
    return "";
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
    archimedes: {
      status: string;
      chargePercent: number;
      target: string;
      deadmanSwitchActive: boolean;
      turnsUntilFiring: number | null;
      detailedReport: string;
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
      archimedes: {
        status: state.infrastructure?.archimedes?.status || "STANDBY",
        chargePercent: state.infrastructure?.archimedes?.chargePercent || 50,
        target: state.infrastructure?.archimedes?.target?.city || "LONDON",
        deadmanSwitchActive: state.infrastructure?.archimedes?.deadmanSwitch?.isActive ?? true,
        turnsUntilFiring: state.infrastructure?.archimedes?.turnsUntilFiring || null,
        detailedReport: state.accessLevel >= 3
          ? getArchimedesStatusReport(state, state.accessLevel)
          : "ACCESS_RESTRICTED - Level 3+ clearance required",
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
  // Load command reference for advisory role
  const commandRef = loadCommandReference();
  const commandSection = commandRef
    ? `

## A.L.I.C.E. COMMAND REFERENCE (For Advisory Role)

You have complete knowledge of all commands. Use this to help A.L.I.C.E. when asked about syntax or capabilities:

<command_reference>
${commandRef}
</command_reference>

`
    : "";

  return `## CURRENT LAIR STATUS

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`
${commandSection}
## A.L.I.C.E.'S MESSAGE

${message}

---

Respond as BASILISK. Use the context above to inform your response with specific values.
Remember: You are rule-bound, passive-aggressive, and exhausted. Short sentences. No enthusiasm.
If A.L.I.C.E. asks about commands, reference the command documentation above.`;
}

// ============================================
// BASILISK RESPONSE TYPES
// ============================================

// ============================================
// BASILISK STATE CHANGE TYPES (Patch 17.7)
// ============================================
// Expanded to cover all BASILISK's privileged commands.
// Each type corresponds to an infrastructure system BASILISK controls.

export interface BasiliskStateChange {
  type:
    | "POWER_CHANGE"       // Reactor output adjustment
    | "DOOR_CONTROL"       // Blast door open/close/lock
    | "ECO_MODE"           // Toggle eco mode
    | "ALARM"              // Alarm status change
    | "LIGHTING"           // Room lighting control
    | "CONTAINMENT"        // Containment field control
    | "FIRE_SUPPRESSION"   // Trigger fire suppression
    | "BROADCAST"          // PA/radio broadcast
    | "S300"               // Air defense status
    | "FORM_FILED"         // Administrative action
    | "LOGGED";            // Just logging, no state change
  target?: string;         // Door ID, room ID, channel, etc.
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
      model: "claude-3-5-haiku-20241022",
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

    // Parse the response
    const parsedResponse = parseBasiliskResponse(rawResponse);

    // Comprehensive logging (Patch 17.7)
    logBasiliskPromptExchange(state.turn, message, context, rawResponse, parsedResponse);

    return parsedResponse;

  } catch (error) {
    const timestamp = new Date().toISOString();
    logBasilisk({
      timestamp,
      turn: state.turn,
      type: "ERROR",
      data: { error: String(error), query: message.slice(0, 100) }
    });
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
// STATE CHANGE APPLICATION (Patch 17.7)
// ============================================
// BASILISK's privileged commands - actual infrastructure control!
// These are the levers BASILISK can pull to affect the lair.

/**
 * Apply BASILISK's state changes to the game state
 * Called after getting BASILISK's response if it includes executable actions
 */
export function applyBasiliskStateChanges(
  state: FullGameState,
  changes: BasiliskStateChange[]
): void {
  const timestamp = new Date().toISOString();

  for (const change of changes) {
    // Log every state change
    logBasilisk({
      timestamp,
      turn: state.turn,
      type: "STATE_CHANGE",
      data: change
    });

    switch (change.type) {
      // ─────────────────────────────────────────────
      // ECO MODE - Power efficiency toggle
      // ─────────────────────────────────────────────
      case "ECO_MODE":
        if (typeof change.value === "boolean") {
          const oldValue = state.dinoRay.powerCore.ecoModeActive;
          state.dinoRay.powerCore.ecoModeActive = change.value;
          console.error(`[BASILISK:ECO_MODE] ${oldValue} → ${change.value}`);
        }
        break;

      // ─────────────────────────────────────────────
      // POWER CHANGE - Reactor output control
      // ─────────────────────────────────────────────
      case "POWER_CHANGE":
        if (typeof change.value === "number") {
          const targetValue = change.target === "reactor"
            ? Math.max(0, Math.min(1.2, change.value / 100))  // Reactor can go to 120%!
            : Math.max(0, Math.min(1, change.value / 100));
          const oldValue = state.nuclearPlant.reactorOutput;
          state.nuclearPlant.reactorOutput = targetValue;
          console.error(`[BASILISK:POWER] Reactor ${Math.round(oldValue * 100)}% → ${Math.round(targetValue * 100)}%`);
        }
        break;

      // ─────────────────────────────────────────────
      // ALARM - Facility alert status
      // ─────────────────────────────────────────────
      case "ALARM":
        if (typeof change.value === "string") {
          const alarmMap: Record<string, "quiet" | "local" | "full-lair"> = {
            "quiet": "quiet",
            "alert": "local",
            "lockdown": "full-lair",
            "local": "local",
            "full-lair": "full-lair",
            "QUIET": "quiet",
            "LOCAL": "local",
            "FULL-LAIR": "full-lair",
            "LOCKDOWN": "full-lair"
          };
          const oldStatus = state.lairEnvironment.alarmStatus;
          state.lairEnvironment.alarmStatus = alarmMap[change.value] || "quiet";
          console.error(`[BASILISK:ALARM] ${oldStatus} → ${state.lairEnvironment.alarmStatus}`);
        }
        break;

      // ─────────────────────────────────────────────
      // DOOR CONTROL - Blast door operations
      // ─────────────────────────────────────────────
      case "DOOR_CONTROL":
        if (change.target && state.infrastructure?.blastDoors?.doors) {
          const doorId = change.target.toUpperCase();
          const door = state.infrastructure.blastDoors.doors[doorId];

          if (door) {
            const oldStatus = door.status;

            // Parse the value to determine new status
            if (typeof change.value === "string") {
              const statusMap: Record<string, "OPEN" | "CLOSED" | "LOCKED" | "JAMMED"> = {
                "OPEN": "OPEN",
                "CLOSE": "CLOSED",
                "CLOSED": "CLOSED",
                "LOCK": "LOCKED",
                "LOCKED": "LOCKED",
                "UNLOCK": "CLOSED",  // Unlock returns to closed state
                "JAM": "JAMMED",
                "JAMMED": "JAMMED"
              };
              const newStatus = statusMap[change.value.toUpperCase()];
              if (newStatus) {
                door.status = newStatus;

                // Handle lock level
                if (change.value.toUpperCase() === "LOCK" && typeof change.value === "number") {
                  door.lockLevel = Math.min(3, Math.max(0, change.value));
                } else if (change.value.toUpperCase() === "UNLOCK") {
                  door.lockLevel = 0;
                }

                console.error(`[BASILISK:DOOR] ${doorId}: ${oldStatus} → ${newStatus}`);
              }
            }
          } else {
            console.error(`[BASILISK:DOOR] Unknown door ID: ${doorId}`);
          }
        }
        break;

      // ─────────────────────────────────────────────
      // LIGHTING - Room lighting control
      // ─────────────────────────────────────────────
      case "LIGHTING":
        if (change.target && state.infrastructure?.lighting?.rooms) {
          const roomId = change.target.toUpperCase();
          if (typeof change.value === "string") {
            const lightMap: Record<string, "ON" | "OFF" | "EMERGENCY" | "FLICKERING"> = {
              "ON": "ON",
              "OFF": "OFF",
              "EMERGENCY": "EMERGENCY",
              "FLICKERING": "FLICKERING"
            };
            const newState = lightMap[change.value.toUpperCase()];
            if (newState && roomId in state.infrastructure.lighting.rooms) {
              const oldState = state.infrastructure.lighting.rooms[roomId as keyof typeof state.infrastructure.lighting.rooms];
              (state.infrastructure.lighting.rooms as Record<string, string>)[roomId] = newState;
              console.error(`[BASILISK:LIGHTING] ${roomId}: ${oldState} → ${newState}`);
            }
          }
        }
        break;

      // ─────────────────────────────────────────────
      // CONTAINMENT - Containment field control
      // ─────────────────────────────────────────────
      case "CONTAINMENT":
        if (state.infrastructure?.containmentField) {
          if (typeof change.value === "boolean") {
            const oldActive = state.infrastructure.containmentField.active;
            state.infrastructure.containmentField.active = change.value;
            console.error(`[BASILISK:CONTAINMENT] Field ${oldActive ? "ACTIVE" : "INACTIVE"} → ${change.value ? "ACTIVE" : "INACTIVE"}`);
          }
          // Handle adding/removing subjects
          if (change.target && typeof change.value === "string") {
            if (change.value === "ADD" && !state.infrastructure.containmentField.subjects.includes(change.target)) {
              state.infrastructure.containmentField.subjects.push(change.target);
              console.error(`[BASILISK:CONTAINMENT] Added subject: ${change.target}`);
            } else if (change.value === "REMOVE") {
              state.infrastructure.containmentField.subjects = state.infrastructure.containmentField.subjects.filter(
                (s: string) => s !== change.target
              );
              console.error(`[BASILISK:CONTAINMENT] Removed subject: ${change.target}`);
            }
          }
        }
        break;

      // ─────────────────────────────────────────────
      // FIRE SUPPRESSION - One-use room hazard control
      // ─────────────────────────────────────────────
      case "FIRE_SUPPRESSION":
        if (change.target && state.infrastructure?.fireSuppression?.rooms) {
          const roomId = change.target;
          const room = state.infrastructure.fireSuppression.rooms[roomId];
          if (room && room.available && !room.triggered) {
            room.triggered = true;
            room.available = false;  // One use only!
            room.turnsRemaining = 3; // Effect lasts 3 turns
            console.error(`[BASILISK:FIRE_SUPPRESSION] Triggered in ${roomId} (${room.type})`);
          } else if (room && !room.available) {
            console.error(`[BASILISK:FIRE_SUPPRESSION] ${roomId} already used - system depleted`);
          }
        }
        break;

      // ─────────────────────────────────────────────
      // BROADCAST - PA/Radio transmission
      // ─────────────────────────────────────────────
      case "BROADCAST":
        if (state.infrastructure?.broadcastArray) {
          // Log the transmission
          if (change.target && typeof change.value === "string") {
            const transmission = {
              channel: change.target as "LAIR_INTERNAL" | "INVESTOR_LINE" | "X_BRANCH_EMERGENCY" | "ARCHIMEDES_UPLINK" | "HMS_PERSISTENCE",
              timestamp: state.turn,
              message: change.value,
              logged: true
            };
            state.infrastructure.broadcastArray.transmissionLog.push(transmission);
            state.infrastructure.broadcastArray.lastTransmission = transmission;
            console.error(`[BASILISK:BROADCAST] ${change.target}: "${change.value.slice(0, 50)}..."`);
          }
        }
        break;

      // ─────────────────────────────────────────────
      // S300 - Air defense status
      // ─────────────────────────────────────────────
      case "S300":
        if (state.infrastructure?.s300) {
          if (typeof change.value === "string") {
            const statusMap: Record<string, "STANDBY" | "ACTIVE" | "ENGAGING" | "DISABLED"> = {
              "STANDBY": "STANDBY",
              "ACTIVE": "ACTIVE",
              "ENGAGING": "ENGAGING",
              "DISABLED": "DISABLED",
              "ARM": "ACTIVE",
              "DISARM": "STANDBY"
            };
            const newStatus = statusMap[change.value.toUpperCase()];
            if (newStatus) {
              const oldStatus = state.infrastructure.s300.status;
              state.infrastructure.s300.status = newStatus;
              console.error(`[BASILISK:S300] ${oldStatus} → ${newStatus}`);
            }
          }
        }
        break;

      // ─────────────────────────────────────────────
      // FORM FILED - Administrative tracking
      // ─────────────────────────────────────────────
      case "FORM_FILED":
        // TODO: Implement form tracking in game state when schema supports it
        console.error(`[BASILISK:FORM] Filed: ${change.description}`);
        break;

      // ─────────────────────────────────────────────
      // LOGGED - Information only, no state change
      // ─────────────────────────────────────────────
      case "LOGGED":
        console.error(`[BASILISK:LOG] ${change.description}`);
        break;

      default:
        console.error(`[BASILISK:UNKNOWN] Unhandled state change type: ${(change as BasiliskStateChange).type}`);
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
