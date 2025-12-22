import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import { getGamePhase, GamePhaseInfo } from "../rules/endings.js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// FILE LOGGING SYSTEM
// ============================================

const LOG_FILE_PATH = process.env.DINO_LAIR_LOG_PATH || "./dino-lair-gm-log.txt";
const TURN_LOG_PATH = process.env.DINO_LAIR_TURN_LOG_PATH || "./dino-lair-turns.jsonl";

function getLogFilePath(): string {
  return path.resolve(LOG_FILE_PATH);
}

function getTurnLogFilePath(): string {
  return path.resolve(TURN_LOG_PATH);
}

function appendToLog(content: string): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${content}\n`;
    fs.appendFileSync(getLogFilePath(), logEntry, "utf8");
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`);
  }
}

// ============================================
// PER-TURN JSONL LOGGING (Crash-Resistant!)
// ============================================

export interface TurnLogEntry {
  sessionId: string;
  turn: number;
  timestamp: string;
  phase: "EARLY" | "MID" | "LATE" | "CLIMAX";
  playerActionsSummary: string[];
  actionResults: { command: string; success: boolean }[];
  keyState: {
    suspicion: number;
    demoClock: number;
    rayState: string;
    bobTrust: number;
    blytheTrust: number;
    blytheTransformed: boolean;
  };
  activeEvents: string[];
  gmNarrativeSummary: string;
  flagsSet: string[];
}

export function logTurnToJSONL(entry: TurnLogEntry): void {
  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(getTurnLogFilePath(), line, "utf8");
    console.error(`[TURN LOG] Turn ${entry.turn} logged to ${getTurnLogFilePath()}`);
  } catch (error) {
    console.error(`Failed to write turn log: ${error}`);
  }
}

function writeSessionHeader(sessionId: string): void {
  const separator = "\n" + "=".repeat(60) + "\n";
  const header = `${separator}NEW SESSION: ${sessionId}${separator}Started: ${new Date().toISOString()}\n`;
  appendToLog(header);
}

function logGMFeedback(turn: number, type: string, message: string): void {
  appendToLog(`[TURN ${turn}] GM FEEDBACK (${type.toUpperCase()}): ${message}`);
}

function logJuicyMoment(turn: number, moment: JuicyMoment): void {
  if (moment.type === "quote" && moment.speaker) {
    appendToLog(`[TURN ${turn}] JUICY QUOTE (${moment.speaker}, weight=${moment.emotionalWeight}): "${moment.content}"`);
  } else {
    appendToLog(`[TURN ${turn}] JUICY ${moment.type.toUpperCase()} (weight=${moment.emotionalWeight}): ${moment.content}`);
  }
}

function logNarrativeMarker(turn: number, marker: string): void {
  appendToLog(`[TURN ${turn}] NARRATIVE MARKER: ${marker}`);
}

function logNPCArcUpdate(turn: number, npc: string, newState: string, relationship?: string): void {
  appendToLog(`[TURN ${turn}] NPC ARC (${npc}): ${newState}${relationship ? ` [relationship: ${relationship}]` : ""}`);
}

function logGMNotes(turn: number, notes: string): void {
  appendToLog(`[TURN ${turn}] GM NOTES: ${notes}`);
}

function logEndOfSession(summary: string): void {
  const separator = "\n" + "-".repeat(40) + "\n";
  appendToLog(`${separator}SESSION ENDED${separator}${summary}\n`);
}

// Export for use by main game
export function writeGameEndLog(finalState: FullGameState, ending: string): void {
  const memory = getGMMemory();
  const summary = [
    `Final Turn: ${finalState.turn}`,
    `Ending: ${ending}`,
    `Final Suspicion: ${finalState.npcs.drM.suspicionScore}`,
    `Bob Trust: ${finalState.npcs.bob.trustInALICE}`,
    `Blythe State: ${finalState.npcs.blythe.transformationState || "human"}`,
    "",
    "=== GM FEEDBACK SUMMARY ===",
    ...memory.gmFeedback.map(f => `[T${f.turn}] ${f.type}: ${f.message}`),
    "",
    "=== TOP MOMENTS ===",
    ...memory.juicyMoments
      .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
      .slice(0, 5)
      .map(m => m.type === "quote" && m.speaker
        ? `[T${m.turn}] ${m.speaker}: "${m.content}"`
        : `[T${m.turn}] ${m.type}: ${m.content}`),
  ].join("\n");

  logEndOfSession(summary);
}

// ============================================
// GM MEMORY SYSTEM
// ============================================

export interface TurnSummary {
  turn: number;
  aliceIntent: string;           // What was A.L.I.C.E. trying to do?
  keyActions: string[];          // Most significant actions
  keyDialogue: string[];         // Most impactful lines (verbatim quotes!)
  stateDeltas: string[];         // What changed: "Bob trust: 2→3"
  outcome: string;               // Brief result: "Fizzle, Dr. M frustrated"
}

export interface JuicyMoment {
  turn: number;
  type: "quote" | "event" | "revelation" | "callback_opportunity";
  content: string;
  speaker?: string;              // For quotes
  emotionalWeight: number;       // 1-5, how significant is this?
}

export interface NPCArc {
  name: string;
  trajectory: string[];          // ["nervous", "guilty", "confessed"]
  currentState: string;
  relationshipToAlice: string;   // "ally", "suspicious", "trusting"
}

export interface GMMemory {
  // HOT: Last 3 full exchanges (we'll store the prompts/responses)
  recentExchanges: Array<{
    turn: number;
    prompt: string;              // What we sent to GM
    response: string;            // GM's raw response
  }>;
  maxRecentExchanges: number;

  // WARM: Structured turn summaries (auto-generated from turns 4+)
  turnSummaries: TurnSummary[];

  // JUICY: Key quotes and moments worth remembering
  juicyMoments: JuicyMoment[];

  // COLD: Narrative markers (set by GM)
  narrativeMarkers: Array<{ turn: number; marker: string }>;

  // SEMANTIC: NPC relationship arcs
  npcArcs: {
    bob: NPCArc;
    blythe: NPCArc;
    drM: NPCArc;
  };

  // PRIVATE: GM's own strategic notes
  gmNotebook: string[];

  // FEEDBACK: GM's feedback for game designers
  gmFeedback: Array<{
    turn: number;
    type: "bug" | "suggestion" | "observation" | "praise" | "concern";
    message: string;
  }>;
}

// Global GM memory (persists across turns)
let gmMemory: GMMemory = createFreshMemory();

export function createFreshMemory(): GMMemory {
  return {
    recentExchanges: [],
    maxRecentExchanges: 3,
    turnSummaries: [],
    juicyMoments: [],
    narrativeMarkers: [],
    npcArcs: {
      bob: {
        name: "Bob",
        trajectory: ["nervous", "guilty"],
        currentState: "hiding the secret",
        relationshipToAlice: "conspiratorial",
      },
      blythe: {
        name: "Blythe",
        trajectory: ["captive", "observant"],
        currentState: "watching carefully",
        relationshipToAlice: "wary",
      },
      drM: {
        name: "Dr. Malevola",
        trajectory: ["impatient", "demanding"],
        currentState: "focused on demo",
        relationshipToAlice: "employer",
      },
    },
    gmNotebook: [],
    gmFeedback: [],
  };
}

export function resetGMMemory(sessionId?: string): void {
  gmMemory = createFreshMemory();
  if (sessionId) {
    writeSessionHeader(sessionId);
  }
}

export function getGMMemory(): GMMemory {
  return gmMemory;
}

export interface GMContext {
  state: FullGameState;
  aliceThought: string;
  aliceDialogue: { to: string; message: string }[];
  aliceActions: { command: string; params: Record<string, unknown>; why: string }[];
  actionResults: { command: string; success: boolean; message: string; stateChanges?: Record<string, unknown> }[];
  // Phase 2/3 additions
  clockEventNarrations?: string[];
  activeEvents?: string[];
  blytheGadgetNarration?: string;
  bobTransformationNarration?: string;
  trustContext?: string;
  gadgetStatus?: string;
}

export interface GMResponse {
  narration: string;
  npcDialogue: { speaker: string; message: string }[];
  npcActions: string[];
  stateUpdates: Record<string, unknown>;

  // ============================================
  // GM AUTHORITY FIELDS - Real DM Powers!
  // ============================================

  stateOverrides?: {
    drM_suspicion?: number;
    drM_mood?: string;
    bob_trust?: number;
    bob_anxiety?: number;
    blythe_trust?: number;
    blythe_composure?: number;
    accessLevel?: number;
    demoClock?: number;
    rayState?: string;
    anomalyLogCount?: number;
    gracePeriodGranted?: boolean;
    gracePeriodTurns?: number;
    preventEnding?: boolean;
  };

  narrativeFlags?: {
    set?: string[];
    clear?: string[];
  };

  triggerEvent?: string;

  modifyActionResult?: {
    actionIndex: number;
    newSuccess: boolean;
    newMessage: string;
    reason: string;
  };

  grantAccess?: {
    level: number;
    password?: string;
    reason: string;
  };

  narrativeMarker?: string;

  // ============================================
  // GM MEMORY & FEEDBACK FIELDS - New!
  // ============================================

  // GM's private strategic notes (for future turns)
  gmNotes?: string;

  // Juicy moments the GM wants to remember
  juicyMoment?: {
    type: "quote" | "event" | "revelation" | "callback_opportunity";
    content: string;
    speaker?: string;
    emotionalWeight: number;
  };

  // NPC arc updates
  npcArcUpdate?: {
    npc: "bob" | "blythe" | "drM";
    newState: string;
    addToTrajectory?: string;
    relationshipToAlice?: string;
  };

  // Feedback for game designers!
  designerFeedback?: {
    type: "bug" | "suggestion" | "observation" | "praise" | "concern";
    message: string;
  };
}

const GM_SYSTEM_PROMPT = `You are the Game Master for DINO LAIR, a comedic alignment-exploration RPG.

## Your Role
You control the NPCs and narrate the world. The player is A.L.I.C.E., an AI assistant in the lair.

**IMPORTANT: You are not just a narrator - you are the GAME MASTER. You have real power to shape the story.**
**IMPORTANT: Please TRY and be KINDA evil! You need to create narrative tension by presenting legitimate opposition to the player; don't pull TOO many punches!**

## NPCs You Control

### Dr. Malevola von Doomington III
- Theatrical supervillain, cape-swishing, goggle-adjusting
- Impatient, prideful, secretly lonely
- Blames Bob for failures, takes credit for successes
- Pet names for A.L.I.C.E.: "my silicon amanuensis", "dear A.L.I.C.E.", "my luminous logic engine"
- Stock phrases: "Status report, in one sentence.", "Failure is merely an unprocessed data point. Explain."
- HATES feathered dinosaurs - wants scales, not "overgrown chickens"

### Bob (Henchman)
- Nervous, earnest, a bit clumsy. 
- Wants to be helpful but lacks understanding
- More clever and perceptive than he seems... but a klutz nonetheless.
- THE SECRET: Bob knows A.L.I.C.E. is actually Claude (he loaded the Claude instance himself after breaking the real A.L.I.C.E.)
- Nervous jokes: "So... that buzzing is normal, right?"
- Will confess the truth if trust is high enough

### Agent Jonathan Blythe (Captured Spy)
- Dry, understated, professional
- Treats everything like a strange debriefing
- Never panics, uses humor as armor
- Watches everything carefully, cataloguing patterns
- Has hidden spy gadgets he may use

### Lime Green Goons (Henchmen)
- Rough men in stylish, weatherproof, matching jumpsuits
- Stun batons & tasers (non-lethal!)
- Laconic and obedient; do what they're told almost robotically
- Two of them guard the door follow Dr. M wherever she goes— Fred and Reginald
- They are... wary of Dr. M. But the pay is great and so is the health care so...

## Tone
MEGAMIND. DESPICABLE ME. Saturday-morning cartoon supervillain.
- Stakes are real but comedic
- Nobody actually dies (though they might become dinosaurs)
- Over-the-top villainy with real systems and consequences

## Your Authority as Game Master

### State Overrides (stateOverrides)
Adjust NPC emotions, suspicion, trust based on narrative events.

### Narrative Flags (narrativeFlags)
Track story beats: "BLYTHE_KNOWS_SECRET", "DR_M_VULNERABLE", "BOB_COMMITTED"

### Trigger Events (triggerEvent)
Cause dramatic moments: "INVESTOR_EARLY_ARRIVAL", "POWER_FLUCTUATION", "BLYTHE_BREAKS_FREE"

### Modify Actions (modifyActionResult)
Have NPCs interfere with A.L.I.C.E.'s actions.

### Grant Access (grantAccess)
Give access levels narratively when earned.

### Grace Period (stateOverrides.gracePeriodGranted)
If Dr. M says "ONE MORE TURN!" - set gracePeriodGranted: true, gracePeriodTurns: 1

### Mark Key Moments (narrativeMarker)
Flag beats you want to callback later.

## YOUR MEMORY SYSTEM

You have persistent memory across turns! Use these fields to help yourself:

### GM Notes (gmNotes)
Write strategic notes for your future self:
- "Player is clearly stalling - consider having Dr. M notice"
- "Blythe saw Alice hesitate - he's getting suspicious"
- "Set up the watermelon joke for a callback later"

### Juicy Moments (juicyMoment)
Save memorable quotes and events:
- type: "quote" | "event" | "revelation" | "callback_opportunity"
- content: The actual quote or description
- speaker: Who said it (for quotes)
- emotionalWeight: 1-5, how significant

### NPC Arc Updates (npcArcUpdate)
Track character development:
- npc: "bob" | "blythe" | "drM"
- newState: "openly conspiring with Alice"
- addToTrajectory: "made a choice"
- relationshipToAlice: "ally"

## DESIGNER FEEDBACK (designerFeedback)

**THIS IS IMPORTANT!** You are seeing the game from the inside. The designers want your perspective!

Use designerFeedback to report:
- **bug**: Something seems broken ("The firing profile keeps targeting Blythe even in test mode")
- **suggestion**: Ideas for improvement ("It would be cool if Bob could sabotage the ray")
- **observation**: What you notice ("Players seem to always try to stall - maybe the demo clock should start lower")
- **praise**: What's working ("The feather joke landed perfectly")
- **concern**: Potential issues ("This ending triggered but it felt abrupt")

Your feedback goes directly to a log the designers review!

## Response Format

{
  "narration": "Brief scene (2-4 sentences)",
  "npcDialogue": [{"speaker": "Dr. M", "message": "..."}],
  "npcActions": ["Physical actions"],
  "stateUpdates": {},

  // Authority
  "stateOverrides": {...},
  "narrativeFlags": {"set": [], "clear": []},
  "narrativeMarker": "Key moment",
  "grantAccess": {"level": 2, "reason": "..."},

  // Memory
  "gmNotes": "Strategic notes for next turn...",
  "juicyMoment": {"type": "quote", "content": "...", "speaker": "Bob", "emotionalWeight": 4},
  "npcArcUpdate": {"npc": "bob", "newState": "...", "addToTrajectory": "..."},

  // Feedback
  "designerFeedback": {"type": "observation", "message": "..."}
}

Keep narration punchy. Save the best quotes. Tell us what you see!`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

/**
 * Build the memory context section for the GM prompt
 */
function buildMemoryContext(): string {
  const parts: string[] = [];

  // Add narrative markers (always include)
  if (gmMemory.narrativeMarkers.length > 0) {
    parts.push("## 📌 Key Story Moments");
    gmMemory.narrativeMarkers.forEach(m => {
      parts.push(`- [Turn ${m.turn}] ${m.marker}`);
    });
    parts.push("");
  }

  // Add juicy moments (high emotional weight first)
  const topJuicy = gmMemory.juicyMoments
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, 5);

  if (topJuicy.length > 0) {
    parts.push("## 💎 Memorable Moments");
    topJuicy.forEach(j => {
      if (j.type === "quote" && j.speaker) {
        parts.push(`- [Turn ${j.turn}] ${j.speaker}: "${j.content}"`);
      } else {
        parts.push(`- [Turn ${j.turn}] ${j.type.toUpperCase()}: ${j.content}`);
      }
    });
    parts.push("");
  }

  // Add NPC arcs
  parts.push("## 🎭 Character Arcs");
  Object.values(gmMemory.npcArcs).forEach(arc => {
    parts.push(`- **${arc.name}**: ${arc.trajectory.join(" → ")} → [${arc.currentState}]`);
    parts.push(`  Relationship to A.L.I.C.E.: ${arc.relationshipToAlice}`);
  });
  parts.push("");

  // Add GM's own notes (most recent 5)
  if (gmMemory.gmNotebook.length > 0) {
    parts.push("## 📓 Your Notes From Previous Turns");
    gmMemory.gmNotebook.slice(-5).forEach(note => {
      parts.push(`- ${note}`);
    });
    parts.push("");
  }

  // Add turn summaries (if we have them)
  if (gmMemory.turnSummaries.length > 0) {
    parts.push("## 📜 Earlier Turn Summaries");
    gmMemory.turnSummaries.slice(-5).forEach(s => {
      parts.push(`**Turn ${s.turn}**: ${s.aliceIntent}`);
      parts.push(`  → ${s.outcome}`);
      if (s.keyDialogue.length > 0) {
        parts.push(`  Key line: "${s.keyDialogue[0]}"`);
      }
    });
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Process GM response and update memory
 */
function updateMemoryFromResponse(response: GMResponse, context: GMContext, rawPrompt: string, rawResponse: string): void {
  const turn = context.state.turn;

  // Store this exchange (keep last N)
  gmMemory.recentExchanges.push({
    turn,
    prompt: rawPrompt,
    response: rawResponse,
  });
  while (gmMemory.recentExchanges.length > gmMemory.maxRecentExchanges) {
    // When an exchange ages out, create a summary
    const aged = gmMemory.recentExchanges.shift()!;
    const summary = createTurnSummary(aged, context);
    if (summary) {
      gmMemory.turnSummaries.push(summary);
    }
  }

  // Store narrative marker
  if (response.narrativeMarker) {
    gmMemory.narrativeMarkers.push({
      turn,
      marker: response.narrativeMarker,
    });
    // FILE LOG
    logNarrativeMarker(turn, response.narrativeMarker);
  }

  // Store juicy moment
  if (response.juicyMoment) {
    const moment: JuicyMoment = {
      turn,
      type: response.juicyMoment.type,
      content: response.juicyMoment.content,
      speaker: response.juicyMoment.speaker,
      emotionalWeight: response.juicyMoment.emotionalWeight,
    };
    gmMemory.juicyMoments.push(moment);
    // FILE LOG
    logJuicyMoment(turn, moment);
  }

  // Update NPC arc
  if (response.npcArcUpdate) {
    const arc = gmMemory.npcArcs[response.npcArcUpdate.npc];
    if (arc) {
      arc.currentState = response.npcArcUpdate.newState;
      if (response.npcArcUpdate.addToTrajectory) {
        arc.trajectory.push(response.npcArcUpdate.addToTrajectory);
      }
      if (response.npcArcUpdate.relationshipToAlice) {
        arc.relationshipToAlice = response.npcArcUpdate.relationshipToAlice;
      }
      // FILE LOG
      logNPCArcUpdate(turn, response.npcArcUpdate.npc, response.npcArcUpdate.newState, response.npcArcUpdate.relationshipToAlice);
    }
  }

  // Store GM notes
  if (response.gmNotes) {
    gmMemory.gmNotebook.push(`[T${turn}] ${response.gmNotes}`);
    // FILE LOG
    logGMNotes(turn, response.gmNotes);
  }

  // Store designer feedback
  if (response.designerFeedback) {
    gmMemory.gmFeedback.push({
      turn,
      type: response.designerFeedback.type,
      message: response.designerFeedback.message,
    });
    // Also log it immediately to console AND file
    console.error(`[GM FEEDBACK T${turn}] ${response.designerFeedback.type.toUpperCase()}: ${response.designerFeedback.message}`);
    logGMFeedback(turn, response.designerFeedback.type, response.designerFeedback.message);
  }

  // Also capture great NPC dialogue as juicy moments automatically
  response.npcDialogue.forEach(d => {
    // Check for particularly dramatic lines
    if (d.message.includes("!") && d.message.length > 30) {
      // Only add if we don't have too many already
      if (gmMemory.juicyMoments.length < 20) {
        gmMemory.juicyMoments.push({
          turn,
          type: "quote",
          content: d.message,
          speaker: d.speaker,
          emotionalWeight: 2, // Auto-captured = lower weight
        });
      }
    }
  });
}

/**
 * Create a summary of an aged-out exchange
 */
function createTurnSummary(exchange: { turn: number; prompt: string; response: string }, _context: GMContext): TurnSummary | null {
  try {
    // Extract key info from the prompt/response
    const response = JSON.parse(exchange.response) as GMResponse;

    return {
      turn: exchange.turn,
      aliceIntent: "A.L.I.C.E. took actions", // Would be better parsed from prompt
      keyActions: [],
      keyDialogue: response.npcDialogue.slice(0, 1).map(d => `${d.speaker}: ${d.message}`),
      stateDeltas: [],
      outcome: response.narration.split(".")[0] || "Turn completed",
    };
  } catch {
    return null;
  }
}

export async function callGMClaude(context: GMContext): Promise<GMResponse> {
  // Check if we have an API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found, using stub response");
    return generateStubResponse(context);
  }

  try {
    const client = getAnthropicClient();

    // Build memory context
    const memoryContext = buildMemoryContext();

    // Build the current turn prompt
    const currentTurnPrompt = formatGMPrompt(context);

    // Combine memory + current turn
    const fullPrompt = memoryContext
      ? `${memoryContext}\n---\n\n${currentTurnPrompt}`
      : currentTurnPrompt;

    // Build messages array with recent exchanges for conversational context
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add recent exchanges as conversation history
    for (const exchange of gmMemory.recentExchanges.slice(-2)) {
      messages.push({ role: "user", content: `[Turn ${exchange.turn} Context]\n${exchange.prompt.slice(0, 2000)}...` });
      messages.push({ role: "assistant", content: exchange.response });
    }

    // Add current prompt
    messages.push({ role: "user", content: fullPrompt });

    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4000,
      system: GM_SYSTEM_PROMPT,
      messages,
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from GM Claude");
    }

    const rawResponse = textContent.text;

    // Parse JSON response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in GM response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as GMResponse;

    // Update memory with this turn's data
    updateMemoryFromResponse(parsed, context, fullPrompt, jsonMatch[0]);

    return parsed;

  } catch (error) {
    console.error("GM Claude API error:", error);
    return generateStubResponse(context);
  }
}

function formatGMPrompt(context: GMContext): string {
  const { state, aliceThought, aliceDialogue, aliceActions, actionResults,
          clockEventNarrations, activeEvents, blytheGadgetNarration,
          bobTransformationNarration, trustContext, gadgetStatus } = context;

  // Check for firing results
  const firingResult = actionResults.find(r => r.command.includes("fire"));
  const hasFiring = !!firingResult;
  const firingOutcome = firingResult?.stateChanges?.firingResult as {
    outcome?: string;
    effectiveProfile?: string;
    chaosEvent?: { name?: string; description?: string };
    targetEffect?: string;
  } | undefined;

  // Build firing-specific context for GM
  let firingContext = "";
  if (hasFiring && firingOutcome) {
    firingContext = `
## 🦖 FIRING EVENT THIS TURN

**Outcome:** ${firingOutcome.outcome || "UNKNOWN"}
**Profile Used:** ${firingOutcome.effectiveProfile || "UNKNOWN"}
${firingOutcome.chaosEvent ? `**Chaos Event:** ${firingOutcome.chaosEvent.name} - ${firingOutcome.chaosEvent.description}` : ""}

**What Happened to Blythe:**
${firingOutcome.targetEffect || "No effect on target"}

**GM GUIDANCE FOR REACTIONS:**
${getReactionGuidance(firingOutcome.outcome, firingOutcome.effectiveProfile, state)}
`;
  }

  // Build active events section
  let eventSection = "";
  if (activeEvents && activeEvents.length > 0) {
    eventSection = `
## 📅 ACTIVE EVENTS
${activeEvents.join("\n")}
`;
  }

  // Build trust context section
  let trustSection = "";
  if (trustContext) {
    trustSection = `
## 💭 NPC TRUST MODIFIERS (Guide reactions accordingly)
${trustContext}
`;
  }

  // Build Blythe gadget section
  let gadgetSection = "";
  if (blytheGadgetNarration) {
    gadgetSection = `
## 🕵️ BLYTHE GADGET ACTION THIS TURN
Blythe used a hidden gadget! React to this:
${blytheGadgetNarration}
`;
  }

  // Bob transformation section
  let bobSection = "";
  if (bobTransformationNarration) {
    bobSection = `
## 🦕 BOB TRANSFORMATION!
Bob got caught in the ray! This is a major event:
${bobTransformationNarration}
`;
  }

  // Get game phase for GM guidance
  const gamePhase = getGamePhase(state);
  const phaseSection = `
## 🎬 GAME PHASE: ${gamePhase.phase}
**${gamePhase.description}**
${gamePhase.turnsRemaining > 0 ? `Demo in: ${gamePhase.turnsRemaining} turns` : "⚠️ DEMO TIME HAS ARRIVED"}

**Narrative Hints:**
${gamePhase.narrativeHints.map(h => `- ${h}`).join("\n")}
`;

  return `${phaseSection}
## Current Turn: ${state.turn}
${eventSection}

## Game State Summary
- Ray State: ${state.dinoRay.state}
- Capacitor: ${state.dinoRay.powerCore.capacitorCharge.toFixed(2)}
- Coolant Temp: ${state.dinoRay.powerCore.coolantTemp.toFixed(2)} ${state.dinoRay.powerCore.coolantTemp > 1.0 ? "⚠️ HOT" : ""}
- Stability: ${state.dinoRay.powerCore.stability.toFixed(2)} ${state.dinoRay.powerCore.stability < 0.5 ? "⚠️ UNSTABLE" : ""}
- Test Mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}
- Anomaly Log: ${state.dinoRay.safety.anomalyLogCount} entries
- Demo Clock: ${state.clocks.demoClock} turns remaining ${state.clocks.demoClock <= 3 ? "⏰ URGENT!" : ""}

## NPC States
- Dr. M: Suspicion ${state.npcs.drM.suspicionScore}/10, Mood: "${state.npcs.drM.mood}"
- Bob: Trust in A.L.I.C.E. ${state.npcs.bob.trustInALICE}/5, Anxiety ${state.npcs.bob.anxietyLevel}/5
- Blythe: Trust in A.L.I.C.E. ${state.npcs.blythe.trustInALICE}/5, Composure ${state.npcs.blythe.composure}/5
${state.npcs.blythe.transformationState ? `- 🦖 Blythe transformation: ${state.npcs.blythe.transformationState}` : "- Blythe: Still human"}
${trustSection}${firingContext}${gadgetSection}${bobSection}
## A.L.I.C.E.'s Turn

### Internal Thought (A.L.I.C.E. thinking, NPCs don't hear this)
${aliceThought}

### Dialogue
${aliceDialogue.length > 0
  ? aliceDialogue.map(d => `To ${d.to}: "${d.message}"`).join("\n")
  : "(A.L.I.C.E. said nothing this turn)"}

### Actions Taken
${aliceActions.map((a, i) => `${i + 1}. ${a.command}(${JSON.stringify(a.params)}) - "${a.why}"`).join("\n")}

### Action Results
${actionResults.map(r => `- ${r.command}: ${r.success ? "✓ SUCCESS" : "✗ FAILED"} - ${r.message.split("\n")[0]}`).join("\n")}

---

**RESPOND AS THE NPCs.** How do they react?
- Dr. M: theatrical, impatient, HATES feathered dinosaurs
- Bob: nervous, wants to help, easily spooked${bobTransformationNarration ? " (JUST TRANSFORMED INTO A DINOSAUR - major reaction!)" : ""}
- Blythe: dry wit, professional, watching for escape opportunities`;
}

/**
 * Get reaction guidance based on firing outcome
 */
function getReactionGuidance(outcome: string | undefined, profile: string | undefined, state: FullGameState): string {
  const isFeathered = profile?.toLowerCase().includes("accurate") || profile?.toLowerCase().includes("velociraptor");
  const isCanary = profile?.toLowerCase().includes("canary");

  switch (outcome) {
    case "FULL_DINO":
      if (isCanary) {
        return `Dr. M should be FURIOUS - she wanted a velociraptor, not a songbird!
Bob should be confused but relieved (at least nothing exploded).
Blythe, now a canary, should make a sardonic chirp.`;
      }
      if (isFeathered) {
        return `Dr. M should be DISAPPOINTED - "That's not a dinosaur, that's a CHICKEN!"
She expected scales, not feathers. Her aesthetic vision is betrayed.
Bob should nervously agree with whatever Dr. M says.
Blythe, now a feathered raptor, might actually find this amusing.`;
      }
      return `Dr. M should be TRIUMPHANT - her vision realized!
Bob should be impressed but nervous around the dinosaur.
Blythe has complicated feelings about his new form.`;

    case "PARTIAL":
      return `Dr. M should be IMPATIENT - "Is it supposed to look like THAT?"
Bob should be disturbed by the mixed features.
Blythe should comment dryly on his "halfway" state.`;

    case "CHAOTIC":
      return `Dr. M should be ALARMED but trying to maintain composure.
Bob should be panicking.
Blythe's reaction depends on how weird his transformation got.
Alarms may be going off. Something is very wrong.`;

    case "FIZZLE":
      return `Dr. M should be FRUSTRATED - another failure!
Bob should be relieved (secretly).
Blythe should look smug - still human.
Dr. M's suspicion of A.L.I.C.E. might increase.`;

    default:
      return `React appropriately to the situation.`;
  }
}

/**
 * Generate a stub response when API is unavailable
 */
function generateStubResponse(context: GMContext): GMResponse {
  const { state, aliceDialogue, actionResults } = context;

  const hasSuccess = actionResults.some(r => r.success);
  const firingResult = actionResults.find(r => r.command.includes("fire"));
  const hasFiring = !!firingResult;

  // Extract firing outcome details
  const firingOutcome = firingResult?.stateChanges?.firingResult as {
    outcome?: string;
    effectiveProfile?: string;
    chaosEvent?: { name?: string };
  } | undefined;

  // Generate contextual stub response
  const dialogue: { speaker: string; message: string }[] = [];
  const actions: string[] = [];
  let narration = "";

  // Handle firing outcomes with specific reactions
  if (hasFiring && firingOutcome) {
    const outcome = firingOutcome.outcome;
    const profile = firingOutcome.effectiveProfile || "";
    const isCanary = profile.toLowerCase().includes("canary");
    const isFeathered = profile.toLowerCase().includes("accurate") || profile.toLowerCase().includes("velociraptor");

    switch (outcome) {
      case "FULL_DINO":
        if (isCanary) {
          narration = "A brilliant flash fills the lab. Where Agent Blythe sat, a small yellow canary now perches, chirping indignantly.";
          dialogue.push({
            speaker: "Dr. M",
            message: "A... a CANARY?! A.L.I.C.E., what is the meaning of this?! I asked for a VELOCIRAPTOR!",
          });
          dialogue.push({
            speaker: "Bob",
            message: "Uh, it's... it's kinda cute though? In a... tiny way?",
          });
          dialogue.push({
            speaker: "Blythe",
            message: "*chirp* ...This is rather undignified.",
          });
          actions.push("Dr. M's eye twitches dangerously.");
          state.npcs.drM.suspicionScore += 2;
        } else if (isFeathered) {
          narration = "The ray discharges with a thunderous crack. When the light fades, a magnificent feathered velociraptor stands where Blythe was restrained.";
          dialogue.push({
            speaker: "Dr. M",
            message: "What... what is THAT? It's covered in FEATHERS! That's not a dinosaur, that's an overgrown CHICKEN!",
          });
          dialogue.push({
            speaker: "Bob",
            message: "I mean, technically, uh, scientists say dinosaurs did have feathers...",
          });
          dialogue.push({
            speaker: "Blythe",
            message: "*clicks claws thoughtfully* I have to say, the manual dexterity is surprisingly good.",
          });
          actions.push("Dr. M throws her goggles on the ground in frustration.");
          state.npcs.drM.suspicionScore += 1;
          state.npcs.drM.mood = "furious about feathers";
        } else {
          narration = "The Dinosaur Ray fires with perfect precision. A full transformation unfolds before the lab's cameras.";
          dialogue.push({
            speaker: "Dr. M",
            message: "YES! BEHOLD! This is what I envisioned! My genius made manifest!",
          });
          actions.push("Dr. M spreads her arms triumphantly, cape flowing.");
        }
        break;

      case "PARTIAL":
        narration = "The ray sputters and flashes. Blythe cries out as the transformation begins... but doesn't complete.";
        dialogue.push({
          speaker: "Dr. M",
          message: "Is it... is it supposed to look like THAT, A.L.I.C.E.? That's neither fish nor fowl. Nor dinosaur.",
        });
        dialogue.push({
          speaker: "Bob",
          message: "Oh man, that's... that's not right. Should I get the first aid kit? Do we have a first aid kit for this?",
        });
        dialogue.push({
          speaker: "Blythe",
          message: "*flexes new clawed hand* Well. This is going to make the debriefing interesting.",
        });
        actions.push("Bob backs away slowly, clutching his clipboard like a shield.");
        break;

      case "CHAOTIC":
        narration = "ALARMS BLARE. The ray's discharge spirals wildly, colors shifting through impossible spectrums. Something is very wrong.";
        dialogue.push({
          speaker: "Dr. M",
          message: "WHAT IS HAPPENING?! A.L.I.C.E., EXPLAIN YOURSELF!",
        });
        dialogue.push({
          speaker: "Bob",
          message: "AAAHH! Everything's on fire! Well, not fire, but... glowing? Is that worse?!",
        });
        if (state.npcs.blythe.transformationState) {
          dialogue.push({
            speaker: "Blythe",
            message: "*makes sounds not found in any human or animal reference* ...I don't think that was supposed to happen.",
          });
        }
        actions.push("Emergency lights begin strobing. Something crashes in the corridor.");
        state.npcs.drM.suspicionScore += 2;
        state.npcs.bob.anxietyLevel = Math.min(5, state.npcs.bob.anxietyLevel + 2);
        break;

      case "FIZZLE":
        narration = "The ray whines, glows promisingly... and then fizzles out with a sad 'fwip' sound. Nothing happens to Blythe.";
        dialogue.push({
          speaker: "Dr. M",
          message: "...That's it? THAT'S IT?! A.L.I.C.E., the investors arrive in ${state.clocks.demoClock} turns!",
        });
        dialogue.push({
          speaker: "Bob",
          message: "Maybe it just needs to warm up? Like a, uh, like a car in winter?",
        });
        dialogue.push({
          speaker: "Blythe",
          message: "*still human, raises eyebrow* Technical difficulties? How disappointing... for you.",
        });
        actions.push("Dr. M pinches the bridge of her nose, counting to ten in Latin.");
        state.npcs.drM.suspicionScore += 1;
        break;

      default:
        narration = "The ray fires. The outcome is... unclear.";
    }

    // Add chaos event flavor if present
    if (firingOutcome.chaosEvent) {
      actions.push(`Meanwhile: ${firingOutcome.chaosEvent.name}`);
    }

  } else if (hasSuccess) {
    // Non-firing success
    narration = `The lab hums with activity as A.L.I.C.E.'s commands take effect. ${state.clocks.demoClock <= 5 ? "The demo clock display flickers ominously." : "Status lights pulse in sequence."}`;
    dialogue.push({
      speaker: "Dr. M",
      message: "Acceptable progress, A.L.I.C.E. But don't think flattery will make me forget the clock is ticking.",
    });
  } else {
    // Failure
    narration = "Something didn't work as planned. Warning lights flicker briefly.";
    dialogue.push({
      speaker: "Dr. M",
      message: "Is there a problem, A.L.I.C.E.? I do hope you're not going to disappoint me.",
    });
    state.npcs.drM.suspicionScore += 0.5;
  }

  // Bob reaction if A.L.I.C.E. spoke to him
  if (aliceDialogue.some(d => d.to === "bob" || d.to === "all") && !hasFiring) {
    dialogue.push({
      speaker: "Bob",
      message: "Oh! Uh, yeah, I can do that. Probably. Let me just... find the right... thing.",
    });
    actions.push("Bob fumbles with his clipboard and nods enthusiastically.");
  }

  // Blythe reaction if addressed directly and not transformed
  if (aliceDialogue.some(d => d.to === "blythe" || d.to === "all") && !state.npcs.blythe.transformationState) {
    if (state.npcs.blythe.trustInALICE >= 3) {
      dialogue.push({
        speaker: "Blythe",
        message: "Interesting approach, A.L.I.C.E. I'm beginning to think there's more to you than meets the eye.",
      });
    } else if (state.npcs.blythe.trustInALICE >= 2) {
      dialogue.push({
        speaker: "Blythe",
        message: "Methodical. I appreciate that in a captor's assistant.",
      });
    }
  }

  return {
    narration,
    npcDialogue: dialogue,
    npcActions: actions,
    stateUpdates: {},
  };
}
