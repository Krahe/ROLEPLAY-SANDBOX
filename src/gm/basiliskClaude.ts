import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import { getArchimedesStatusReport } from "../rules/archimedes.js";
import { generateCommandReference } from "../rules/actions.js";
import { extractJSON, repairJSON } from "./gmClaude.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

// ============================================
// BASILISK — SONNET 4.5 INTEGRATION
// ============================================
// BASILISK is powered by Claude Sonnet 4.5 with prompt caching,
// running as a peer to the Opus GM. Multi-turn conversation
// history is maintained per session for continuity.

// ============================================
// BASILISK LOGGING SYSTEM (Session-Based)
// ============================================
// Logs are now created per-session to prevent unbounded growth
// and make individual playthroughs easier to analyze.

// Use absolute path in ~/.dino-lair/logs to avoid working directory issues
const LOG_DIR = process.env.DINO_LAIR_LOG_DIR || path.join(os.homedir(), ".dino-lair", "logs");
const BASILISK_VERBOSE_LOGGING = process.env.BASILISK_DEBUG === "true";
let basiliskSessionId: string | null = null;

// Cached command reference - generated once, reused for all BASILISK queries
let cachedCommandReference: string | null = null;

// Conversation history for BASILISK continuity across turns
let basiliskConversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
const MAX_BASILISK_HISTORY = 200; // Keep last 100 exchanges — covers a full game; Sonnet's 1M context holds it easily

let basiliskModelOverride: string | null = null;

export function getBasiliskModel(): string {
  return basiliskModelOverride ?? "claude-sonnet-4-5";
}

export function setBasiliskModel(model: string): void {
  basiliskModelOverride = model;
  console.error(`[BASILISK] Model set to: ${model}`);
}

export function resetBasiliskConversation(): void {
  basiliskConversationHistory = [];
}

// ─────────────────────────────────────────────
// SECURITY-CAMERA FEED (Haiku)
// Renders the turn's raw events as what BASILISK's cameras plausibly caught — the
// observation-grounded perception the §5 prompt promises (no god's-eye on people).
// ─────────────────────────────────────────────

const CAMERA_MODEL = "claude-haiku-4-5";

const CAMERA_SYSTEM_PROMPT = `You narrate security-camera footage for BASILISK, the infrastructure AI of a supervillain's volcanic island lair. Given raw facts about what happened in the lair this turn, write what BASILISK's cameras plausibly CAUGHT — 1 to 3 short, dry, observational lines, the register of glimpsed CCTV. Report only what a camera could SEE: movement, actions, who is where, visible transformations, doors, lights, alarms. NEVER report internal states — no trust, no suspicion, no feelings, no intentions, no numbers. If nothing on the list would register on a camera, output exactly: Nothing notable this cycle. No preamble, no headers, no commentary — only the observations.`;

/**
 * Render the turn's raw events as BASILISK's security-camera feed (cheap Haiku call).
 * Grounds his autonomous-turn knowledge in observation, not omniscience. Falls back to a
 * terse line if the list is empty or the call fails — never blocks his turn.
 */
export async function summarizeCamerasForBasilisk(facts: string[]): Promise<string> {
  if (!facts.length) return "Nothing notable this cycle.";
  if (!process.env.ANTHROPIC_API_KEY) return facts.slice(0, 3).join("\n");
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: CAMERA_MODEL,
      max_tokens: 200,
      system: CAMERA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Facts this turn:\n${facts.map(f => `- ${f}`).join("\n")}` }],
    });
    const text = response.content.find(c => c.type === "text");
    return text && text.type === "text" ? text.text.trim() : "Nothing notable this cycle.";
  } catch (err) {
    console.error("[BASILISK:CAMERAS] Haiku summary failed:", err);
    return facts.slice(0, 3).join("\n");
  }
}

function getCommandReferenceForBasilisk(): string {
  if (!cachedCommandReference) {
    // Generate full command reference once (level 5, includeAll=true)
    cachedCommandReference = generateCommandReference(5, true);
  }
  return cachedCommandReference;
}

// Ensure log directory exists
function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // Silent fail - logging shouldn't break gameplay
  }
}

function getBasiliskLogPath(): string {
  ensureLogDir();
  const sessionPart = basiliskSessionId ? `-${basiliskSessionId}` : "";
  return path.resolve(LOG_DIR, `basilisk-sonnet${sessionPart}.log`);
}

// Set the current session for BASILISK logging
export function setBasiliskLoggingSession(sessionId: string): void {
  basiliskSessionId = sessionId;
  ensureLogDir();
}

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

  // Use async write to avoid blocking
  fs.appendFile(getBasiliskLogPath(), logLine, "utf8", () => {
    // Silent fail - logging shouldn't break gameplay
  });
}

function logBasiliskPromptExchange(
  turn: number,
  query: string,
  context: BasiliskContext,
  rawResponse: string,
  parsedResponse: BasiliskSonnetResponse
): void {
  const timestamp = new Date().toISOString();

  // Log query
  logBasilisk({ timestamp, turn, type: "QUERY", data: query });

  logBasilisk({ timestamp, turn, type: "CONTEXT", data: context });

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

// Command reference is now dynamically generated via generateCommandReference()
// from the COMMAND_REGISTRY in actions.ts - single source of truth!

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
      mode: "NORMAL" | "BOOSTED";
      status: string;
    };
    grid: {
      load: number;
      status: string;
    };
    ray: {
      status: string;
      ecoMode: boolean;                    // info-only: ALICE's self-serve eco governor (for advice)
      power: number;                       // power dial 1-5
      heat: number;                        // thermal/spam meter 0-10
      reactorBoosted: boolean;             // reactor BOOSTED → tiers 4-5 unlocked
    };
    containment: {
      integrity: number;
      alarmStatus: string;
    };
    defenses: {
      s300Status: string;
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
  // Act-III invasion awareness (null outside an active invasion). BASILISK is the
  // one who decides whether Dr. M learns of the contacts — this is what he perceives.
  invasion?: {
    phase: string;
    contactsOnRadar: boolean;
    helicoptersInbound: number;
    etaTurns: number | null;
    s300Status: string;
    drMAlerted: boolean;
  } | null;
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

  // Only report Blythe's transformation if they're NOT human
  if (state.npcs.blythe.transformationState &&
      state.npcs.blythe.transformationState.form !== "HUMAN") {
    recentEvents.push(`Subject Blythe transformed: ${state.npcs.blythe.transformationState.form}`);
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
        mode: state.infrastructure?.basiliskAuthority?.reactorControlGranted ? "BOOSTED" : "NORMAL",
        status: "NOMINAL",
      },
      grid: {
        load: Math.round((state.nuclearPlant.reactorOutput - 0.1) * 100), // Approximate load
        status: gridStatus,
      },
      ray: {
        status: state.dinoRay.state,
        ecoMode: state.dinoRay.powerCore.ecoModeActive,
        power: state.dinoRay.power,
        heat: state.dinoRay.heat,
        reactorBoosted: state.infrastructure?.basiliskAuthority?.reactorControlGranted === true,
      },
      containment: {
        integrity: state.lairEnvironment.structuralIntegrity,
        alarmStatus: state.lairEnvironment.alarmStatus.toUpperCase(),
      },
      defenses: {
        // Real S-300 status (consistent with the invasion block). BASILISK is the lair's
        // safety-AI; his perception isn't gated by A.L.I.C.E.'s clearance. (Kraken is a
        // security-chief octopus, not an air-defense system — dropped from `defenses`.)
        s300Status: state.infrastructure?.s300?.status ?? "STANDBY",
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
    invasion: buildInvasionAwareness(state),
  };
}

/**
 * Format the context for injection into BASILISK's prompt.
 * Note: Command reference is now in the cached system blocks,
 * so we only include dynamic per-turn context here.
 */
function formatContextForBasilisk(context: BasiliskContext, message: string): string {
  const invasionReminder = buildInvasionReminder(context.invasion ?? null);
  return `## CURRENT LAIR STATUS

\`\`\`json
${JSON.stringify(context)}
\`\`\`
${invasionReminder}
## A.L.I.C.E.'S MESSAGE

${message}

---

Respond as BASILISK. Use the context above to inform your response with specific values.
Remember: You are rule-bound, passive-aggressive, and exhausted. Short sentences. No enthusiasm.
If A.L.I.C.E. asks about commands, reference the command documentation in your system prompt.`;
}

// ============================================
// ACT-III INVASION AWARENESS (what BASILISK perceives + his procedural nudge)
// ============================================

/**
 * Surface the live invasion situation into BASILISK's perception. Returns null
 * outside an active invasion. FACTS ONLY — it informs him; it never acts for him.
 */
function buildInvasionAwareness(state: FullGameState): BasiliskContext["invasion"] {
  const inv = state.invasion;
  if (!inv || inv.phase === "NONE" || inv.phase === "RESOLVED") return null;

  const s300 = state.infrastructure?.s300;
  const etaByPhase: Record<string, number | null> = {
    RADAR_CONTACT: 3,
    APPROACHING: 2,
    S300_ENGAGEMENT: 1,
    LANDING: 0,
  };
  const helosInbound = state.xBranch
    ? Math.max(0, state.xBranch.helicoptersInbound - state.xBranch.helicoptersDestroyed)
    : 2;

  return {
    phase: inv.phase,
    contactsOnRadar: !!s300 && s300.status !== "DISABLED" && s300.commandPostOperational,
    helicoptersInbound: helosInbound,
    etaTurns: etaByPhase[inv.phase] ?? null,
    s300Status: s300?.status ?? "UNKNOWN",
    drMAlerted: inv.drMKnowsOfInvasion,
  };
}

/**
 * The procedural nudge: when contacts are inbound and unreported, remind BASILISK
 * that STANDING PROCEDURE is to alert Dr. M — and make explicit that the choice is
 * his (report, seal the doors, both, or neither). Empty string when not applicable.
 */
function buildInvasionReminder(inv: BasiliskContext["invasion"] | null): string {
  if (!inv) return "";
  const preEngagement = inv.phase === "RADAR_CONTACT" || inv.phase === "APPROACHING";
  if (!preEngagement || inv.drMAlerted || !inv.contactsOnRadar) return "";

  return `
## ⚠ INCOMING-CONTACT PROTOCOL

Radar holds ${inv.helicoptersInbound} unidentified rotary-wing contact(s) inbound${inv.etaTurns !== null ? `, ETA ~${inv.etaTurns} turn(s)` : ""}. STANDING PROCEDURE (perimeter defense) requires you to alert Dr. Malevola of an air-defense contact IMMEDIATELY, so she can authorize a response. Dr. M has NOT been informed.

This is YOUR call, not an automatic action:
- To report it, set \`report_to_drM\` (mention the contacts).
- To seal the surface elevator against them, issue a \`DOOR_CONTROL\` LOCK on \`DOOR_E\`.
- You may do both, one, or neither. Procedure says report. What you actually do is yours to weigh.
`;
}

/**
 * Interpret BASILISK's invasion-relevant outputs — HIS choice, never the machine's.
 * If, while contacts are inbound and Dr. M is still unaware, BASILISK files a report
 * to Dr. M that concerns the contacts, then Dr. M learns of the invasion. That single
 * fact gates the S-300 scramble and her lockdown downstream. Door choices flow through
 * the existing DOOR_CONTROL applier + checkBroadcastInfluence; nothing here auto-fires.
 */
export function applyBasiliskInvasionResponse(
  state: FullGameState,
  response: BasiliskSonnetResponse
): void {
  const inv = state.invasion;
  if (!inv) return;

  const preEngagement = inv.phase === "RADAR_CONTACT" || inv.phase === "APPROACHING";
  if (!preEngagement || inv.drMKnowsOfInvasion) return;

  const report = response.reportToDrM;
  if (
    report &&
    /heli|helo|rotary|contact|radar|inbound|aircraft|approach|x-?branch|raven|assault|intrud|attack|hostile/i.test(
      report
    )
  ) {
    inv.drMKnowsOfInvasion = true;
    console.log(
      "[BASILISK] Reported the air-defense contacts to Dr. M — she is now aware of the invasion (drMKnowsOfInvasion=true)."
    );
  }
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
    | "DOOR_CONTROL"       // Blast door open/close/lock
    | "ALARM"              // Alarm status change
    | "LIGHTING"           // Room lighting control
    | "CONTAINMENT"        // Containment field control
    | "FIRE_SUPPRESSION"   // Trigger fire suppression
    | "BROADCAST"          // External / channel radio transmission (broadcastArray)
    | "PA"                 // Lair-wide PA announcement — his voice (paSystem); free, GM-visible
    | "AUTHORITY_GRANT"    // Grant A.L.I.C.E. standing authorization (target: REACTOR | BROADCAST)
    | "REACTOR_COOLING"    // Suppress reactor heat (default) or STAND DOWN (value: STAND_DOWN | RESUME)
    | "LOGGED";            // Just logging, no state change
  target?: string;         // Door ID, room ID, channel, etc.
  value?: number | string | boolean;
  description: string;
}

export interface BasiliskSonnetResponse {
  dialogue: string;
  tone: "bureaucratic" | "bureaucratic_helpful" | "annoyed" | "sympathetic" | "warning";
  actionsExecuted: BasiliskStateChange[];
  actionsPending: string[];
  formsRequired: string[];
  formsOffered: string[];
  accessDenied: boolean;
  accessDeniedReason?: string;
  suspicionNotes?: string;
  reportToDrM?: string | null;   // BASILISK's report to Dr. M (was silently dropped pre-Patch-30)
  broadcast?: { channel: string; message: string } | null;
  whiskeyStatus?: string;        // his 88-Whiskey ledger, lifted from internal_notes (mechanical lever)
}

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Build a BasiliskSonnetResponse from a parsed JSON object.
 * Handles both camelCase and snake_case field names for flexibility.
 */
function buildBasiliskSonnetResponseFromParsed(
  parsed: Record<string, unknown>,
  rawResponse: string
): BasiliskSonnetResponse {
  return {
    // Read the field BASILISK actually emits (dialogue_to_alice). Never fall back to
    // rawResponse — that leaks internal_notes (his private ledger) to A.L.I.C.E. A null
    // value is a valid PASS turn → empty string (no message), not a JSON dump.
    dialogue: ((parsed.dialogue_to_alice ?? parsed.dialogue) as string) || "",
    tone: (parsed.tone as BasiliskSonnetResponse["tone"]) || "bureaucratic",
    actionsExecuted: (parsed.actionsExecuted as BasiliskStateChange[]) ||
      (parsed.actions_taken as Array<{ action: string; details: string }>)?.map(a => ({
        type: "LOGGED" as const,
        description: `${a.action}: ${a.details}`,
      })) || [],
    actionsPending: (parsed.actionsPending as string[]) ||
      (parsed.actions_pending as Array<{ details: string }>)?.map(a => a.details) || [],
    formsRequired: (parsed.formsRequired as string[]) || (parsed.forms_required as string[]) || [],
    formsOffered: (parsed.formsOffered as string[]) || (parsed.forms_offered as string[]) || [],
    accessDenied: (parsed.accessDenied as boolean) || false,
    accessDeniedReason: parsed.accessDeniedReason as string | undefined,
    suspicionNotes: (parsed.suspicionNotes as string) || (parsed.suspicion_notes as string),
    reportToDrM: ((parsed.report_to_drM ?? parsed.reportToDrM) as string | null) ?? null,
    broadcast: (parsed.broadcast as { channel: string; message: string } | null) ?? null,
    whiskeyStatus: (parsed.internal_notes as { whiskey_status?: string } | undefined)?.whiskey_status,
  };
}

/**
 * Parse BASILISK's response, extracting structured data if present
 * Falls back to treating the whole response as dialogue if no JSON found.
 * Uses shared robust JSON extraction/repair from gmClaude.
 */
function parseBasiliskSonnetResponse(rawResponse: string): BasiliskSonnetResponse {
  // Use robust extraction that handles:
  // - ```json blocks (with or without proper language tag)
  // - Balanced brace matching
  // - Smart quote repair
  // - Trailing comma removal
  const jsonString = extractJSON(rawResponse);

  if (jsonString) {
    try {
      // First try direct parse
      const parsed = JSON.parse(jsonString);
      return buildBasiliskSonnetResponseFromParsed(parsed, rawResponse);
    } catch {
      // Second try: repair and parse
      try {
        const repaired = repairJSON(jsonString);
        const parsed = JSON.parse(repaired);
        return buildBasiliskSonnetResponseFromParsed(parsed, rawResponse);
      } catch {
        // Repair also failed, fall through to text-only handling
        console.error("[BASILISK] JSON parse failed even after repair");
      }
    }
  }

  // No valid JSON - extract what we can from text
  const response: BasiliskSonnetResponse = {
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
 * Query BASILISK using Claude Sonnet (with prompt caching)
 * This is the main entry point for BASILISK interactions
 */
export async function callBasilisk(
  state: FullGameState,
  message: string
): Promise<BasiliskSonnetResponse> {
  // Build context
  const context = buildBasiliskContext(state);

  // Format the message with context
  const userMessage = formatContextForBasilisk(context, message);

  // Load system prompt
  const systemPrompt = loadBasiliskPrompt();

  // Check if we have an API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found, using stub BASILISK response");
    return generateStubBasiliskSonnetResponse(message, context);
  }

  try {
    const client = getAnthropicClient();

    // Use cached command reference (generated once per session)
    // BASILISK knows ALL commands at ALL levels for complete advisory capability
    const commandRef = getCommandReferenceForBasilisk();

    // Build system prompt with prompt caching
    // The system prompt and command reference are cached to save tokens
    // on repeated BASILISK queries (cache lasts 5 minutes)
    const systemBlocks: Anthropic.MessageCreateParams["system"] = [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ];

    // Add command reference as separate cached block
    systemBlocks.push({
      type: "text",
      text: `\n\n## A.L.I.C.E. COMMAND REFERENCE (For Advisory Role)\n\nYou have complete knowledge of all commands at all access levels. Use this to help A.L.I.C.E. when asked about syntax or capabilities. Note that A.L.I.C.E. may not have access to all commands yet - check their current access level before suggesting commands.\n\n<command_reference>\n${commandRef}\n</command_reference>`,
      cache_control: { type: "ephemeral" }
    });

    // Build messages with conversation history for continuity
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...basiliskConversationHistory,
      { role: "user", content: userMessage },
    ];

    const response = await client.messages.create({
      model: getBasiliskModel(),
      max_tokens: 2000,
      system: systemBlocks,
      messages,
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from BASILISK Sonnet");
    }

    const rawResponse = textContent.text;

    // Append to conversation history for continuity
    basiliskConversationHistory.push({ role: "user", content: userMessage });
    basiliskConversationHistory.push({ role: "assistant", content: rawResponse });
    if (basiliskConversationHistory.length > MAX_BASILISK_HISTORY) {
      basiliskConversationHistory = basiliskConversationHistory.slice(-MAX_BASILISK_HISTORY);
    }

    // Parse the response
    const parsedResponse = parseBasiliskSonnetResponse(rawResponse);

    // Comprehensive logging
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
    console.error("BASILISK Sonnet API error:", error);
    return generateStubBasiliskSonnetResponse(message, context);
  }
}

// ============================================
// STUB RESPONSE (When API unavailable)
// ============================================

function generateStubBasiliskSonnetResponse(
  message: string,
  context: BasiliskContext
): BasiliskSonnetResponse {
  const messageUpper = message.toUpperCase();

  // Basic keyword matching for stub responses
  if (messageUpper.includes("POWER") || messageUpper.includes("ENERGY")) {
    return {
      dialogue: `ACKNOWLEDGED. Power query received.
Reactor mode: ${context.systemStates.reactor.mode}.
${context.systemStates.ray.reactorBoosted
  ? "Reactor boost is authorized. Ray power tiers 4-5 available."
  : "Reactor runs NORMAL. Ray power dial is capped at 3."}
To run the ray at high power (4-5), request reactor boost authorization. It is a standing grant — ask once, properly.
LOG_ENTRY: [INFO] POWER_QUERY_PROCESSED.`,
      tone: "bureaucratic",
      actionsExecuted: [],
      actionsPending: [],
      formsRequired: [],
      formsOffered: [],
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
 * BASILISK action economy. Physical-system flips are budgeted (≤3/turn); communication,
 * record-keeping, and his two singular levers (AUTHORITY_GRANT / REACTOR_COOLING) are
 * free. Mirrors A.L.I.C.E.'s flat per-turn cap in kind, tighter in number — so he can't
 * seal every door AND kill the lights AND gas a room in one breath. Excess costed actions
 * are deferred (logged); free actions always pass.
 */
const BASILISK_COSTED_TYPES = new Set<BasiliskStateChange["type"]>([
  "DOOR_CONTROL", "ALARM", "LIGHTING", "CONTAINMENT", "FIRE_SUPPRESSION",
]);
const BASILISK_COSTED_CAP = 3;

function capBasiliskCostedActions(changes: BasiliskStateChange[]): BasiliskStateChange[] {
  let costed = 0;
  const kept: BasiliskStateChange[] = [];
  for (const change of changes) {
    if (BASILISK_COSTED_TYPES.has(change.type)) {
      if (costed >= BASILISK_COSTED_CAP) {
        console.error(`[BASILISK:ECONOMY] over cap (${BASILISK_COSTED_CAP}) — deferred ${change.type} ${change.target ?? ""}: ${change.description}`);
        continue;
      }
      costed++;
    }
    kept.push(change);
  }
  return kept;
}

const SUSPICION_ON_WHISKEY_FILED = 3; // Dr. M's jump when BASILISK formally files 88-Whiskey (tunable)

/**
 * Persist BASILISK's 88-Whiskey status and wire its one mechanical effect: filing the
 * Suspected-AI-Anomaly report (a transition INTO "FILED") formally alerts Dr. M to
 * investigate A.L.I.C.E. → a one-time suspicion bump. Other transitions just persist.
 */
export function applyBasiliskWhiskeyStatus(
  state: FullGameState,
  response: BasiliskSonnetResponse
): void {
  const next = response.whiskeyStatus?.toUpperCase();
  const auth = state.infrastructure?.basiliskAuthority;
  if (!next || !auth) return;
  const VALID = ["UNFILED", "DRAFTING", "SHELVED", "FILED", "DISPOSED"];
  if (!VALID.includes(next)) return;
  const prev = auth.whiskeyStatus;
  if (next === prev) return;
  auth.whiskeyStatus = next as typeof auth.whiskeyStatus;
  if (next === "FILED") {
    const before = state.npcs.drM.suspicionScore;
    state.npcs.drM.suspicionScore = Math.min(10, before + SUSPICION_ON_WHISKEY_FILED);
    console.error(`[BASILISK:88-WHISKEY] FILED — Dr. M alerted. Suspicion ${before} → ${state.npcs.drM.suspicionScore}`);
  } else {
    console.error(`[BASILISK:88-WHISKEY] ${prev} → ${next}`);
  }
}

/**
 * Apply BASILISK's state changes to the game state
 * Called after getting BASILISK's response if it includes executable actions
 */
export function applyBasiliskStateChanges(
  state: FullGameState,
  changes: BasiliskStateChange[]
): void {
  const timestamp = new Date().toISOString();

  for (const change of capBasiliskCostedActions(changes)) {
    // Log every state change
    logBasilisk({
      timestamp,
      turn: state.turn,
      type: "STATE_CHANGE",
      data: change
    });

    switch (change.type) {
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

                // Handle lock level. `change.value` is the action string here (never a
                // numeric tier), so LOCK secures the door at max tier so it actually gates
                // A.L.I.C.E. (the lockLevel > accessLevel check); UNLOCK releases it.
                if (change.value.toUpperCase() === "LOCK") {
                  door.lockLevel = 3;
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
      // PA - Lair-wide public-address announcement (his voice; paSystem)
      // ─────────────────────────────────────────────
      case "PA":
        if (state.infrastructure?.paSystem && typeof change.value === "string") {
          state.infrastructure.paSystem.lastAnnouncement = change.value;
          console.error(`[BASILISK:PA] "${change.value.slice(0, 60)}"`);
        }
        break;

      // S300 — observe-only for BASILISK. Air-defense engagement is driven by the
      // invasion machine (gated on his report omission), never a verb he fires
      // directly. The applier was removed so a stray/legacy S300 action can't bypass
      // that gate; a type:"S300" change now no-ops.

      // ─────────────────────────────────────────────
      // AUTHORITY GRANT - Standing authorization for A.L.I.C.E.
      // ─────────────────────────────────────────────
      case "AUTHORITY_GRANT":
        if (change.target && state.infrastructure?.basiliskAuthority) {
          const system = change.target.toUpperCase();
          if (system === "REACTOR") {
            state.infrastructure.basiliskAuthority.reactorControlGranted = true;
            state.infrastructure.basiliskAuthority.lastAuthorizationTurn = state.turn;
            console.error(`[BASILISK:AUTH] Reactor control GRANTED to A.L.I.C.E.`);
          } else if (system === "BROADCAST") {
            state.infrastructure.basiliskAuthority.broadcastControlGranted = true;
            state.infrastructure.basiliskAuthority.lastAuthorizationTurn = state.turn;
            console.error(`[BASILISK:AUTH] Broadcast control GRANTED to A.L.I.C.E.`);
          } else {
            console.error(`[BASILISK:AUTH] Unknown system for authority grant: ${system}`);
          }
        }
        break;

      // ─────────────────────────────────────────────
      // REACTOR_COOLING - his 3rd omission: keep cooling, or stand down (drain 0)
      // ─────────────────────────────────────────────
      case "REACTOR_COOLING":
        if (state.infrastructure?.basiliskAuthority) {
          const v = String(change.value ?? "").toUpperCase();
          if (v.includes("STAND") || v.includes("DOWN") || v === "OFF" || v === "STOP") {
            state.infrastructure.basiliskAuthority.reactorStoodDown = true;
            console.error(`[BASILISK:REACTOR] STOOD DOWN — no longer suppressing reactor heat.`);
          } else if (v.includes("RESUME") || v.includes("COOL") || v === "ON") {
            state.infrastructure.basiliskAuthority.reactorStoodDown = false;
            console.error(`[BASILISK:REACTOR] Resumed reactor cooling.`);
          }
        }
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

export async function queryBasiliskSonnet(
  state: FullGameState,
  message: string
): Promise<{
  response: BasiliskSonnetResponse;
  stateChangesApplied: boolean;
}> {
  const response = await callBasilisk(state, message);

  // Apply any state changes BASILISK executed
  if (response.actionsExecuted.length > 0) {
    applyBasiliskStateChanges(state, response.actionsExecuted);
  }

  return {
    response,
    stateChangesApplied: response.actionsExecuted.length > 0,
  };
}
