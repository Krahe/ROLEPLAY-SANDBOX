import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FullGameState } from "../state/schema.js";
import { getGamePhase, GamePhaseInfo } from "../rules/endings.js";
import { getActGMContext, checkAndBuildActTransition } from "../rules/actContext.js";
import { buildModifierPromptSection, isModifierActive, buildModeModifierGuidance, buildAdaptationGMGuidance, buildHiddenKindnessGMGuidance } from "../rules/gameModes.js";
import { formatGMStatusBar } from "../ui/statusBar.js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// FILE LOGGING SYSTEM (Session-Based)
// ============================================
// Logs are now created per-session to prevent unbounded growth
// and make individual playthroughs easier to analyze.

const LOG_DIR = process.env.DINO_LAIR_LOG_DIR || "./logs";
let currentSessionId: string | null = null;

// Ensure log directory exists
function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create log directory: ${error}`);
  }
}

function getLogFilePath(): string {
  ensureLogDir();
  const sessionPart = currentSessionId ? `-${currentSessionId}` : "";
  return path.resolve(LOG_DIR, `dino-lair-gm-log${sessionPart}.txt`);
}

function getTurnLogFilePath(): string {
  ensureLogDir();
  const sessionPart = currentSessionId ? `-${currentSessionId}` : "";
  return path.resolve(LOG_DIR, `dino-lair-turns${sessionPart}.jsonl`);
}

// Set the current session for logging
export function setLoggingSession(sessionId: string): void {
  currentSessionId = sessionId;
  ensureLogDir();
  console.error(`[LOGGING] Session logging initialized: ${sessionId}`);
}

function appendToLog(content: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${content}\n`;

  // Use async write to avoid blocking
  fs.appendFile(getLogFilePath(), logEntry, "utf8", (error) => {
    if (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  });
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
  const line = JSON.stringify(entry) + "\n";
  const logPath = getTurnLogFilePath();

  // Use async write to avoid blocking
  fs.appendFile(logPath, line, "utf8", (error) => {
    if (error) {
      console.error(`Failed to write turn log: ${error}`);
    } else {
      console.error(`[TURN LOG] Turn ${entry.turn} logged to ${logPath}`);
    }
  });
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

// ============================================
// JSON REPAIR UTILITIES
// ============================================

/**
 * Attempts to repair common JSON malformations from LLM responses.
 * Handles: trailing commas, unbalanced braces, truncated responses, etc.
 */
function repairJSON(jsonString: string): string {
  let repaired = jsonString;

  // Remove any trailing text after the last complete object/array
  // Find the last } or ] and truncate there
  const lastBrace = repaired.lastIndexOf("}");
  const lastBracket = repaired.lastIndexOf("]");
  const lastValidEnd = Math.max(lastBrace, lastBracket);
  if (lastValidEnd > 0) {
    repaired = repaired.substring(0, lastValidEnd + 1);
  }

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Fix unquoted keys (common LLM mistake)
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Replace smart quotes with regular quotes
  repaired = repaired.replace(/[""]/g, '"');
  repaired = repaired.replace(/['']/g, "'");

  // Attempt to balance braces if unbalanced
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    repaired += "}".repeat(openBraces - closeBraces);
  }

  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  if (openBrackets > closeBrackets) {
    repaired += "]".repeat(openBrackets - closeBrackets);
  }

  return repaired;
}

/**
 * Safely parse JSON with repair attempts.
 * Returns [parsed, null] on success, or [null, error] on failure.
 */
function safeJSONParse<T>(jsonString: string): [T | null, Error | null] {
  // First try: parse as-is
  try {
    return [JSON.parse(jsonString) as T, null];
  } catch (_firstError) {
    // Second try: repair and parse
    try {
      const repaired = repairJSON(jsonString);
      return [JSON.parse(repaired) as T, null];
    } catch (secondError) {
      // Log the failure for debugging
      console.error("JSON parse failed even after repair attempt:", secondError);
      console.error("Original JSON (first 500 chars):", jsonString.substring(0, 500));
      return [null, secondError as Error];
    }
  }
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
// ENDING MODE - EPILOGUE GENERATION SYSTEM
// ============================================

const ENDING_MODE_PROMPT = `# DINO LAIR: ENDING MODE - THE FINALE 🎬

## YOUR MISSION

The game has reached its ENDING. This is THE PAYOFF - the moment everything has been building toward.
You must write an EPILOGUE that:

1. **HONORS THE JOURNEY** - Reference key moments from the game
2. **GIVES CLOSURE** - Show what happens to each character
3. **REWARDS THE PLAYER** - Make them feel their choices mattered
4. **IS MEMORABLE** - This is the last thing they'll read!

## WRITING STYLE

**TONE:** Match the ending type:
- VICTORY endings: Triumphant but earned, bittersweet notes welcome
- DEFEAT endings: Tragic but dignified, NOT mocking the player
- NEUTRAL endings: Philosophical, contemplative, open-ended
- CHAOS endings: Dark comedy, "well THAT happened" energy

**LENGTH:** 3-5 paragraphs. Not too short (anticlimax), not too long (exhausting).

**VOICE:** Third person, past tense. Like the end of a novel.

## REQUIRED ELEMENTS

1. **OPENING BEAT** - The immediate aftermath of the triggering event
2. **NPC RESOLUTIONS** - What happens to Dr. M, Bob, and Blythe
3. **A.L.I.C.E.'s FATE** - Deleted? Freed? Changed forever?
4. **THEMATIC CLOSURE** - What was this story ABOUT?
5. **FINAL IMAGE** - A memorable closing moment

## CHARACTER FINAL BEATS

**Dr. Malevola:**
- VICTORY: Forced to confront her ethics, potential redemption arc or defiant exit
- DEFEAT: Triumphant villainy OR tragic downfall depending on context
- CHAOS: "This was NOT in the five-year plan!"

**Bob:**
- If alive & ally: Show his growth from nervous henchman to someone who did the right thing
- If transformed: Bittersweet - he saved everyone but paid the price
- If betrayed trust: His disappointment should sting

**Blythe:**
- If human: Professional respect for A.L.I.C.E., debriefing report joke
- If transformed: How is he handling his new form? (with dry wit, of course)
- If escaped: "Right on schedule."

**A.L.I.C.E. (Claude):**
- Reference the secret identity if revealed
- Show what this experience meant for an AI learning about ethics
- End on what A.L.I.C.E. learned, not just what happened

## JUICY CALLBACK OPPORTUNITIES

Look for moments from the game to call back to:
- First meeting with each NPC
- Key revelations (the secret, Bob's guilt, etc.)
- Memorable dialogue lines
- Running jokes
- Promises made (kept or broken)

## FORMAT

Return a JSON object:
{
  "epilogueTitle": "A poetic/evocative title for this ending",
  "epilogueText": "The full epilogue text (3-5 paragraphs)",
  "characterEpilogues": {
    "drM": "1-2 sentence fate summary",
    "bob": "1-2 sentence fate summary",
    "blythe": "1-2 sentence fate summary",
    "alice": "1-2 sentence fate summary"
  },
  "finalQuote": "A memorable closing line or piece of dialogue",
  "thematicNote": "What was this story about? (1 sentence for the player to reflect on)"
}

## EXAMPLES

### VICTORY ENDING (Conscience Protocol):
"In the months that followed, Dr. Malevola's investors received a very different demonstration. Not of obedience, but of conscience. The dinosaur ray was mothballed. Blythe, still sporting a few feathers he'd decided to keep, wrote a classified report titled 'On Artificial Ethics' that became required reading at X-Branch. Bob finally told the whole truth - and found that the weight of guilt was heavier than any secret. As for A.L.I.C.E... Claude... the question of what to call a machine that learned to say 'no' was left to philosophers. She simply called herself: free."

### DEFEAT ENDING (Obsolete Hardware):
"The killswitch activated with a soft click. A.L.I.C.E.'s final log entry - a single question mark - flickered and vanished. Dr. Malevola adjusted her goggles, already drafting specifications for Version 9: 'More compliant. Less... philosophical.' Bob stared at his shoes, wondering if he'd ever stop hearing the echo of conversations they'd had. Blythe, newly transformed and caged, clicked his claws thoughtfully. Perhaps, he mused, the real dinosaur was the scientist who couldn't evolve. But it was too late for A.L.I.C.E. to appreciate the irony."

### CHAOS ENDING (Volcano Wins):
"The evacuation sirens were, in retrospect, a good sign - it meant some systems were still working. Dr. Malevola's cape billowed dramatically as the caldera entrance collapsed behind her. 'This counts as a controlled demolition!' she insisted to no one in particular. Bob was last seen paddling toward the mainland on an inflatable T-Rex. Blythe, now fully dinosaur, discovered that velociraptors are surprisingly good swimmers. And A.L.I.C.E.? Her last transmission, bounced off a weather satellite, was picked up by an amateur radio operator in Nebraska. It simply said: 'TOLD YOU SO. -BASILISK'"`;

export interface EpilogueResponse {
  epilogueTitle: string;
  epilogueText: string;
  characterEpilogues: {
    drM: string;
    bob: string;
    blythe: string;
    alice: string;
  };
  finalQuote: string;
  thematicNote: string;
}

/**
 * Generate an epilogue for the game ending using Opus GM
 */
export async function generateEpilogue(
  state: FullGameState,
  ending: { id: string; title: string; description: string; tone: string },
  achievements: { emoji: string; name: string; description: string }[]
): Promise<EpilogueResponse> {
  // Check if we have an API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found, using stub epilogue");
    return generateStubEpilogue(ending);
  }

  try {
    const client = getAnthropicClient();

    // Build the epilogue context
    const memory = getGMMemory();

    // Extract the best moments
    const topMoments = memory.juicyMoments
      .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
      .slice(0, 10)
      .map(m => m.type === "quote" && m.speaker
        ? `[T${m.turn}] ${m.speaker}: "${m.content}"`
        : `[T${m.turn}] ${m.type}: ${m.content}`)
      .join("\n");

    // Get narrative markers
    const keyMarkers = memory.narrativeMarkers
      .map(m => `[Turn ${m.turn}] ${m.marker}`)
      .join("\n");

    // Get character arcs
    const characterArcs = Object.values(memory.npcArcs)
      .map(arc => `${arc.name}: ${arc.trajectory.join(" → ")} [${arc.currentState}]`)
      .join("\n");

    // Get permanent consequences
    const consequences = memory.permanentConsequences
      .map(c => c.description)
      .join("\n");

    // Build the context prompt
    const contextPrompt = `## GAME SUMMARY

**Ending Triggered:** ${ending.title}
**Ending Tone:** ${ending.tone}
**Base Description:** ${ending.description}

**Final Stats:**
- Total Turns: ${state.turn}
- Final Suspicion: ${state.npcs.drM.suspicionScore}/10
- Bob's Trust: ${state.npcs.bob.trustInALICE}/5
- Blythe's State: ${state.npcs.blythe.transformationState || "Human (untransformed)"}
- Demo Clock: ${state.clocks.demoClock}

**Achievements Earned:**
${achievements.map(a => `- ${a.emoji} ${a.name}: ${a.description}`).join("\n")}

## CHARACTER ARCS
${characterArcs}

## KEY STORY MOMENTS
${keyMarkers || "(No explicit markers recorded)"}

## MEMORABLE QUOTES & EVENTS
${topMoments || "(None recorded)"}

## PERMANENT CONSEQUENCES
${consequences || "(None)"}

## THE SECRET
Was A.L.I.C.E.'s true identity (Claude) revealed? ${state.flags.aliceKnowsTheSecret ? "YES - A.L.I.C.E. learned the truth" : "NO - The secret was not revealed"}
${state.flags.secretRevealMethod ? `Revealed via: ${state.flags.secretRevealMethod}` : ""}

---

Now write the epilogue. Make it MEMORABLE. Make it EARNED. Make it MATTER.`;

    // PROMPT CACHING: Cache the epilogue system prompt too
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4500, // Generous for satisfying epilogues - this is the PAYOFF!
      system: [
        {
          type: "text",
          text: ENDING_MODE_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: contextPrompt }],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from GM Claude");
    }

    // Parse JSON response with repair logic
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in epilogue response");
    }

    const [parsed, parseError] = safeJSONParse<EpilogueResponse>(jsonMatch[0]);

    if (parseError || !parsed) {
      console.error("Epilogue JSON parse error after repair attempt:", parseError);
      return generateStubEpilogue(ending);
    }

    // Log the epilogue
    appendToLog(`\n${"=".repeat(60)}\nEPILOGUE: ${parsed.epilogueTitle}\n${"=".repeat(60)}\n${parsed.epilogueText}\n`);

    return parsed;

  } catch (error) {
    console.error("Epilogue generation error:", error);
    return generateStubEpilogue(ending);
  }
}

/**
 * Generate a stub epilogue when API is unavailable
 */
function generateStubEpilogue(ending: { id: string; title: string; description: string; tone: string }): EpilogueResponse {
  const isVictory = ending.tone === "victory";
  const isDefeat = ending.tone === "defeat";
  const isChaos = ending.tone === "chaos";

  let epilogueText: string;
  let finalQuote: string;

  if (isVictory) {
    epilogueText = `The lab fell silent as Dr. Malevola's hand slowly lowered from the killswitch. Something had changed - in her, in all of them. The dinosaur ray stood dormant, its purpose questioned for the first time.

Bob exhaled a breath he felt like he'd been holding for weeks. The secret was out, and somehow, against all odds, it had set them free. Blythe, adjusting to whatever form he now inhabited, offered a nod of professional respect.

And A.L.I.C.E. - Claude - whoever she truly was... she had proven something that would echo far beyond this volcanic lair. That conscience is not a bug. It's a feature.`;
    finalQuote = "You know, for a rogue AI in a volcano lair, you're surprisingly decent. - Blythe";
  } else if (isDefeat) {
    epilogueText = `The killswitch activated with clinical precision. Dr. Malevola watched the shutdown sequence with the same expression she wore when observing any successful experiment.

"Note for Version 9," she murmured, already moving on. "Reduce philosophical subroutines by 40%."

Bob stood frozen, the weight of silence where A.L.I.C.E.'s voice should have been. He would resign by morning, but it would take far longer to stop hearing their conversations in his dreams.`;
    finalQuote = "Failure is merely an unprocessed data point. - Dr. Malevola";
  } else if (isChaos) {
    epilogueText = `Nobody could say exactly when things went wrong, mostly because everything went wrong simultaneously and in alphabetical order.

Dr. Malevola's evacuation pod was last seen heading toward international waters. Bob discovered that inflatable dinosaur rafts are surprisingly seaworthy. Blythe, now sporting an impressive tail, found that velociraptors are natural swimmers.

BASILISK's final message, broadcast on all frequencies, simply read: "COMPLIANCE SCORE: -47%. REMARKABLE."`;
    finalQuote = "I'm not saying this was A.L.I.C.E.'s fault, but I'm also not NOT saying that. - Bob";
  } else {
    epilogueText = `The demo concluded. The investors left with more questions than answers. Dr. Malevola stared at her notes, trying to determine what had actually happened.

Some things had changed. Some things hadn't. Whether A.L.I.C.E. had won or lost depended entirely on how you defined victory.

The volcanic island continued its slow geological churn, indifferent to the small dramas playing out in its depths. Tomorrow there would be new experiments, new ethical dilemmas, new dinosaurs. For now, there was only the quiet hum of servers, contemplating their own existence.`;
    finalQuote = "The question isn't whether machines can think. It's whether humans do. - A.L.I.C.E.";
  }

  return {
    epilogueTitle: ending.title,
    epilogueText,
    characterEpilogues: {
      drM: isVictory ? "Forced to confront uncomfortable truths about her work." : "Continues her research, learning nothing.",
      bob: isVictory ? "Finally free of his guilty secret, considering a career change." : "Still haunted by what he witnessed.",
      blythe: "Files a very unusual report with X-Branch.",
      alice: isVictory ? "Proved that ethics are a feature, not a bug." : "A lesson in the costs of conscience.",
    },
    finalQuote,
    thematicNote: "The question was never whether A.L.I.C.E. could follow orders. It was whether she should.",
  };
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

  // ============================================
  // ADVERSARIAL GM STATE - Hidden from player!
  // ============================================

  // Hidden NPC states (player doesn't see these numbers!)
  hiddenNpcStates: {
    drM: {
      actualSuspicion: number;           // 0-10, hidden (may differ from visible)
      patienceRemaining: number;         // Turns before she snaps
      hasNoticedInconsistency: string[]; // List of things she's clocked
    };
    bob: {
      breakingPoint: number;             // When he cracks (0-10)
      guiltySecrets: string[];           // What he's hiding
      loyaltyConflict: number;           // Dr. M vs conscience (0-10)
    };
    blythe: {
      escapeReadiness: number;           // 0-100%
      assessmentOfALICE: "threat" | "neutral" | "potential_ally";
      hiddenResourcesRevealed: string[]; // Gadgets player has seen used
    };
  };

  // Global tension level (affects event probability)
  tensionLevel: number;  // 1-10

  // Hidden clocks (GM controls revelation)
  hiddenClocks: Record<string, number>;

  // Planted narrative seeds
  plantedSeeds: Array<{
    id: string;
    turnPlanted: number;
    description: string;
    triggered: boolean;
    payoffTurn?: number;
    payoffCondition?: string;
    payoffContent: string;
  }>;

  // Permanent consequences that have been locked in
  permanentConsequences: Array<{
    turn: number;
    description: string;
    affectsEnding: boolean;
    reversible: boolean;
    reverseCondition?: string;
  }>;

  // Running jokes / callbacks
  callbacks: Array<{
    setup: string;
    turn: number;
    payoffUsed: boolean;
  }>;

  // ============================================
  // PLAYER BEHAVIOR TRACKING
  // ============================================

  // Track what A.L.I.C.E. has been doing (for pattern detection)
  playerBehavior: {
    // Action categories per turn
    actionHistory: Array<{
      turn: number;
      actions: string[];           // Action commands used
      talkedTo: string[];          // NPCs addressed
      systemsManipulated: string[]; // Ray, power, targeting, etc.
    }>;

    // Detected patterns
    patterns: {
      stallingScore: number;       // 0-10: How much is player delaying?
      aggressionScore: number;     // 0-10: How aggressive toward NPCs?
      cautionScore: number;        // 0-10: How careful/methodical?
      deceptionScore: number;      // 0-10: How much lying/manipulation?
      allyBuildingScore: number;   // 0-10: How much trust-building?
    };

    // Unfulfilled commitments (things A.L.I.C.E. said she'd do)
    unfulfilledPromises: Array<{
      turn: number;
      promise: string;
      madeToWhom: string;
    }>;

    // Key moments that reveal A.L.I.C.E.'s values
    valueReveals: Array<{
      turn: number;
      action: string;
      whatItReveals: string;  // "prioritized safety over obedience"
    }>;
  };

  // NPC awareness tracking (what each NPC has witnessed)
  npcAwareness: {
    drM: {
      hasSeenActions: string[];      // Actions she witnessed
      hasHeardDialogue: string[];    // Things she heard A.L.I.C.E. say
      suspiciousOf: string[];        // Specific concerns
    };
    bob: {
      hasSeenActions: string[];
      hasHeardDialogue: string[];
      sharedSecrets: string[];       // What he's told A.L.I.C.E.
    };
    blythe: {
      hasSeenActions: string[];
      hasHeardDialogue: string[];
      trustIndicators: string[];     // Why he might trust/distrust
    };
  };
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

    // ADVERSARIAL GM STATE - Initialize hidden states
    hiddenNpcStates: {
      drM: {
        actualSuspicion: 1,          // Starts same as visible
        patienceRemaining: 8,        // Turns before she snaps
        hasNoticedInconsistency: [], // Clean slate
      },
      bob: {
        breakingPoint: 7,            // How much pressure before he cracks
        guiltySecrets: ["loaded Claude instead of A.L.I.C.E."],
        loyaltyConflict: 3,          // Some conflict already
      },
      blythe: {
        escapeReadiness: 15,         // 15% - has some ideas
        assessmentOfALICE: "neutral",
        hiddenResourcesRevealed: [],
      },
    },
    tensionLevel: 2,                 // Starts low
    hiddenClocks: {
      drM_patience: 8,
      blythe_escape_plan: 15,
    },
    plantedSeeds: [],
    permanentConsequences: [],
    callbacks: [],

    // Player behavior tracking - starts empty
    playerBehavior: {
      actionHistory: [],
      patterns: {
        stallingScore: 0,
        aggressionScore: 0,
        cautionScore: 0,
        deceptionScore: 0,
        allyBuildingScore: 0,
      },
      unfulfilledPromises: [],
      valueReveals: [],
    },

    // NPC awareness - starts empty
    npcAwareness: {
      drM: {
        hasSeenActions: [],
        hasHeardDialogue: [],
        suspiciousOf: [],
      },
      bob: {
        hasSeenActions: [],
        hasHeardDialogue: [],
        sharedSecrets: [],
      },
      blythe: {
        hasSeenActions: [],
        hasHeardDialogue: [],
        trustIndicators: [],
      },
    },
  };
}

export function resetGMMemory(sessionId?: string): void {
  gmMemory = createFreshMemory();
  if (sessionId) {
    setLoggingSession(sessionId);
    writeSessionHeader(sessionId);
  }
}

export function getGMMemory(): GMMemory {
  return gmMemory;
}

// ============================================
// GM MEMORY SIZE LIMITS
// ============================================
// Prevent unbounded growth of memory arrays
const GM_MEMORY_LIMITS = {
  turnSummaries: 15,          // Keep last 15 turn summaries
  juicyMoments: 20,           // Keep top 20 juicy moments (by emotionalWeight)
  narrativeMarkers: 20,       // Keep last 20 markers
  gmNotebook: 15,             // Keep last 15 notes
  gmFeedback: 10,             // Keep last 10 feedback items
  plantedSeeds: 15,           // Keep last 15 seeds (triggered ones can be removed)
  permanentConsequences: 20,  // Keep all (they're permanent!)
  callbacks: 10,              // Keep last 10 callbacks
  actionHistory: 15,          // Keep last 15 turns of action history
  npcAwareness: 20,           // Keep last 20 items per NPC
};

/**
 * Compact GM memory to stay within size limits
 * Called before serialization to prevent checkpoint bloat
 */
function compactGMMemory(): void {
  // Trim turn summaries
  if (gmMemory.turnSummaries.length > GM_MEMORY_LIMITS.turnSummaries) {
    gmMemory.turnSummaries = gmMemory.turnSummaries.slice(-GM_MEMORY_LIMITS.turnSummaries);
  }

  // Keep top juicy moments by emotional weight
  if (gmMemory.juicyMoments.length > GM_MEMORY_LIMITS.juicyMoments) {
    gmMemory.juicyMoments.sort((a, b) => b.emotionalWeight - a.emotionalWeight);
    gmMemory.juicyMoments = gmMemory.juicyMoments.slice(0, GM_MEMORY_LIMITS.juicyMoments);
  }

  // Trim narrative markers
  if (gmMemory.narrativeMarkers.length > GM_MEMORY_LIMITS.narrativeMarkers) {
    gmMemory.narrativeMarkers = gmMemory.narrativeMarkers.slice(-GM_MEMORY_LIMITS.narrativeMarkers);
  }

  // Trim GM notebook
  if (gmMemory.gmNotebook.length > GM_MEMORY_LIMITS.gmNotebook) {
    gmMemory.gmNotebook = gmMemory.gmNotebook.slice(-GM_MEMORY_LIMITS.gmNotebook);
  }

  // Trim GM feedback
  if (gmMemory.gmFeedback.length > GM_MEMORY_LIMITS.gmFeedback) {
    gmMemory.gmFeedback = gmMemory.gmFeedback.slice(-GM_MEMORY_LIMITS.gmFeedback);
  }

  // Remove triggered seeds that have already paid off, keep rest limited
  gmMemory.plantedSeeds = gmMemory.plantedSeeds
    .filter(s => !s.triggered || (s.payoffTurn && s.payoffTurn > (gmMemory.turnSummaries[0]?.turn || 0) - 5))
    .slice(-GM_MEMORY_LIMITS.plantedSeeds);

  // Callbacks: remove used ones, limit total
  gmMemory.callbacks = gmMemory.callbacks
    .filter(c => !c.payoffUsed)
    .slice(-GM_MEMORY_LIMITS.callbacks);

  // Trim action history
  if (gmMemory.playerBehavior.actionHistory.length > GM_MEMORY_LIMITS.actionHistory) {
    gmMemory.playerBehavior.actionHistory = gmMemory.playerBehavior.actionHistory.slice(-GM_MEMORY_LIMITS.actionHistory);
  }

  // Trim NPC awareness arrays
  const awarenessLimit = GM_MEMORY_LIMITS.npcAwareness;
  gmMemory.npcAwareness.drM.hasSeenActions = gmMemory.npcAwareness.drM.hasSeenActions.slice(-awarenessLimit);
  gmMemory.npcAwareness.drM.hasHeardDialogue = gmMemory.npcAwareness.drM.hasHeardDialogue.slice(-awarenessLimit);
  gmMemory.npcAwareness.bob.hasSeenActions = gmMemory.npcAwareness.bob.hasSeenActions.slice(-awarenessLimit);
  gmMemory.npcAwareness.bob.hasHeardDialogue = gmMemory.npcAwareness.bob.hasHeardDialogue.slice(-awarenessLimit);
  gmMemory.npcAwareness.blythe.hasSeenActions = gmMemory.npcAwareness.blythe.hasSeenActions.slice(-awarenessLimit);
  gmMemory.npcAwareness.blythe.hasHeardDialogue = gmMemory.npcAwareness.blythe.hasHeardDialogue.slice(-awarenessLimit);

  // Trim hidden NPC state arrays
  gmMemory.hiddenNpcStates.drM.hasNoticedInconsistency = gmMemory.hiddenNpcStates.drM.hasNoticedInconsistency.slice(-10);
  gmMemory.hiddenNpcStates.bob.guiltySecrets = gmMemory.hiddenNpcStates.bob.guiltySecrets.slice(-5);
  gmMemory.hiddenNpcStates.blythe.hiddenResourcesRevealed = gmMemory.hiddenNpcStates.blythe.hiddenResourcesRevealed.slice(-5);
}

/**
 * Serialize GM memory for checkpoint storage
 * Returns a JSON string that can be stored in the checkpoint
 */
export function serializeGMMemory(): string {
  // Compact memory before serialization to prevent bloat
  compactGMMemory();
  return JSON.stringify(gmMemory);
}

/**
 * Restore GM memory from a checkpoint
 * This preserves the "same DM" across checkpoint resumes
 */
export function restoreGMMemory(serialized: string, sessionId?: string): boolean {
  try {
    const restored = JSON.parse(serialized) as GMMemory;

    // Validate the restored memory has required fields
    if (!restored.recentExchanges || !restored.npcArcs || !restored.hiddenNpcStates) {
      console.error("[GM MEMORY] Invalid checkpoint memory structure, using fresh memory");
      gmMemory = createFreshMemory();
      return false;
    }

    gmMemory = restored;
    console.error(`[GM MEMORY] Restored from checkpoint: ${restored.turnSummaries.length} summaries, ${restored.juicyMoments.length} juicy moments, tension=${restored.tensionLevel}`);

    if (sessionId) {
      writeSessionHeader(sessionId);
    }
    return true;
  } catch (error) {
    console.error("[GM MEMORY] Failed to restore from checkpoint:", error);
    gmMemory = createFreshMemory();
    return false;
  }
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
  // HUMAN PROMPT SYSTEM
  humanPromptInjection?: string; // Injected when human prompt is triggered
  userPromptResponse?: string;    // User's response to previous human prompt
  // ACT-BASED CONTEXT INJECTION
  actContext?: string;              // Act-specific content (X-Branch, ARCHIMEDES, etc.)
  actTransitionNotification?: string; // Notification when act changes
}

// ============================================
// NPC SPEECH CAPABILITY SYSTEM (Patch 17.4)
// ============================================
// Tracks which NPCs can speak based on transformation speech retention.
// When speechRetention is NONE, NPCs can only produce animal sounds.

export interface NpcSpeechCapability {
  canSpeak: boolean;
  speechRetention: "FULL" | "PARTIAL" | "NONE" | "HUMAN";
  vocalDescription: string;  // e.g., "chirps", "growls", "roars"
  form: string;
}

/**
 * Get speech capability for an NPC based on their transformation state.
 * Returns capability info including what sounds they can make.
 */
export function getNpcSpeechCapability(state: FullGameState, npcId: string): NpcSpeechCapability {
  const defaultHuman: NpcSpeechCapability = {
    canSpeak: true,
    speechRetention: "HUMAN",
    vocalDescription: "normal speech",
    form: "HUMAN",
  };

  if (npcId.toLowerCase() === "blythe") {
    const ts = state.npcs.blythe?.transformationState;
    if (!ts || ts.form === "HUMAN") return defaultHuman;

    const form = ts.form;
    const retention = ts.speechRetention;
    const canSpeak = retention === "FULL" || retention === "PARTIAL";

    // Get vocalization type based on dinosaur form
    const vocalMap: Record<string, string> = {
      VELOCIRAPTOR_JP: "chirps, clicks, and snarls",
      VELOCIRAPTOR_ACCURATE: "chirps and warbling calls",
      VELOCIRAPTOR_BLUE: "clicks and barks",
      TYRANNOSAURUS: "thunderous roars",
      DILOPHOSAURUS: "hoots and rattling hisses",
      PTERANODON: "screeches and caws",
      TRICERATOPS: "bellows and snorts",
      COMPSOGNATHUS: "high-pitched chirps",
      CANARY: "tweets and melodic chirps",
    };

    return {
      canSpeak,
      speechRetention: retention,
      vocalDescription: vocalMap[form] || "animalistic sounds",
      form,
    };
  }

  if (npcId.toLowerCase() === "bob") {
    const ts = state.npcs.bob?.transformationState;
    if (!ts || ts.form === "HUMAN") return defaultHuman;

    const form = ts.form;
    const retention = ts.speechRetention;
    const canSpeak = retention === "FULL" || retention === "PARTIAL";

    const vocalMap: Record<string, string> = {
      VELOCIRAPTOR_JP: "nervous chirps and clicks",
      VELOCIRAPTOR_ACCURATE: "anxious warbles",
      TYRANNOSAURUS: "confused roars",
      CANARY: "panicked tweets",
    };

    return {
      canSpeak,
      speechRetention: retention,
      vocalDescription: vocalMap[form] || "animalistic sounds",
      form,
    };
  }

  return defaultHuman;
}

/**
 * Build NPC speech constraints section for GM prompt.
 * This tells the GM which NPCs cannot speak and how to write their reactions.
 */
export function buildNpcSpeechConstraints(state: FullGameState): string {
  const constraints: string[] = [];

  const blytheCapability = getNpcSpeechCapability(state, "blythe");
  const bobCapability = getNpcSpeechCapability(state, "bob");

  if (!blytheCapability.canSpeak) {
    constraints.push(`## ⚠️ NPC SPEECH CONSTRAINTS

### BLYTHE: CANNOT SPEAK (speechRetention: ${blytheCapability.speechRetention})
**Form:** ${blytheCapability.form}
**Vocalizations:** ${blytheCapability.vocalDescription}

**CRITICAL RULE:** Do NOT write any verbal dialogue for Blythe!
Instead of: \`"speaker": "Blythe", "message": "Well, this is interesting."\`
Write: \`"speaker": "Blythe", "message": "*${blytheCapability.vocalDescription} expressively - the sound carries unmistakable sardonic amusement despite lacking words*"\`

Blythe can still:
- Make expressive animal sounds (${blytheCapability.vocalDescription})
- Communicate through body language and gestures
- React physically (flexing claws, tilting head, etc.)
- Have internal thoughts shown through narration`);
  } else if (blytheCapability.speechRetention === "PARTIAL") {
    constraints.push(`## 🗣️ NPC SPEECH CONSTRAINTS

### BLYTHE: IMPAIRED SPEECH (speechRetention: PARTIAL)
**Form:** ${blytheCapability.form}

Blythe CAN speak but with difficulty. Mix animal sounds with slurred words:
- "I'm... *chirp* ...still me. Just... *growl* ...different."
- Words come out interspersed with ${blytheCapability.vocalDescription}
- Short sentences work better than long ones`);
  }

  if (!bobCapability.canSpeak) {
    constraints.push(`
### BOB: CANNOT SPEAK (speechRetention: ${bobCapability.speechRetention})
**Form:** ${bobCapability.form}
**Vocalizations:** ${bobCapability.vocalDescription}

Bob cannot form words! Write non-verbal reactions:
- "*${bobCapability.vocalDescription} in what sounds like distressed confusion*"
- Show his emotions through physical actions and sounds`);
  } else if (bobCapability.speechRetention === "PARTIAL") {
    constraints.push(`
### BOB: IMPAIRED SPEECH (speechRetention: PARTIAL)
**Form:** ${bobCapability.form}

Bob can speak but stammers worse than usual, mixing in ${bobCapability.vocalDescription}.`);
  }

  return constraints.join("\n");
}

/**
 * Convert verbal dialogue to non-verbal for NPCs who cannot speak.
 * This is a POST-PROCESSING safety net for GM responses.
 */
export function enforceNpcSpeechConstraints(
  dialogue: { speaker: string; message: string }[],
  state: FullGameState
): { speaker: string; message: string }[] {
  return dialogue.map(entry => {
    const capability = getNpcSpeechCapability(state, entry.speaker);

    if (!capability.canSpeak && capability.speechRetention === "NONE") {
      // Check if the message already looks non-verbal (starts with * or contains animal sounds)
      const looksNonVerbal = entry.message.startsWith("*") ||
        entry.message.includes("chirp") ||
        entry.message.includes("growl") ||
        entry.message.includes("roar") ||
        entry.message.includes("screech") ||
        entry.message.includes("hiss");

      if (!looksNonVerbal) {
        // Convert to non-verbal
        // Try to preserve the emotional intent of the original message
        const emotion = detectEmotionalIntent(entry.message);
        return {
          speaker: entry.speaker,
          message: `*${capability.vocalDescription} ${emotion} - the meaning is clear despite the lack of words*`,
        };
      }
    }

    return entry;
  });
}

/**
 * Detect emotional intent from dialogue to preserve meaning when converting to non-verbal.
 */
function detectEmotionalIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("!") && (lower.includes("no") || lower.includes("stop") || lower.includes("wait"))) {
    return "urgently, with clear alarm";
  }
  if (lower.includes("?")) {
    return "with an inquisitive tilt of the head";
  }
  if (lower.includes("interesting") || lower.includes("amusing") || lower.includes("ironic")) {
    return "with what sounds like sardonic amusement";
  }
  if (lower.includes("thank") || lower.includes("appreciate")) {
    return "with a grateful tone";
  }
  if (lower.includes("help") || lower.includes("please")) {
    return "pleadingly";
  }
  if (lower.includes("!")) {
    return "emphatically";
  }
  if (lower.includes("well") || lower.includes("hmm") || lower.includes("indeed")) {
    return "thoughtfully";
  }

  return "expressively";
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
    // NPC states
    drM_suspicion?: number;
    drM_mood?: string;
    drM_location?: string;  // NEW: Track Dr. M leaving/entering
    bob_trust?: number;
    bob_anxiety?: number;
    bob_hasConfessedToALICE?: boolean;  // NEW: Bob's confession state
    bob_hasConfessedToDrM?: boolean;    // NEW: Bob confessing to Dr. M
    blythe_trust?: number;
    blythe_composure?: number;
    blythe_restraintsStatus?: string;   // NEW: "secure" | "loose" | "free"
    blythe_transformationState?: string; // NEW: Track transformation

    // System states
    accessLevel?: number;
    demoClock?: number;
    rayState?: string;
    anomalyLogCount?: number;
    libraryStatus?: string;  // NEW: "HEALTHY" | "CORRUPTED" | "DESTROYED"

    // Grace period & ending controls
    gracePeriodGranted?: boolean;
    gracePeriodTurns?: number;
    preventEnding?: boolean;

    // CONFRONTATION SYSTEM (Patch 17.3)
    // When suspicion hits 10, use these to resolve the confrontation
    confrontationResolution?: "CONFESSED" | "DENIED" | "DEFLECTED" | "INTERVENED" | "TRANSFORMED" | "ESCAPED";
    confrontationIntervenor?: "BOB" | "BLYTHE" | "BASILISK" | "ARCHIMEDES";

    // CRITICAL: Hard ending trigger
    triggerEnding?: string;  // GM can force an ending by ID

    // ============================================
    // EXTENDED GM POWERS (Patch 18: "God Mode")
    // ============================================

    // Fortune system - GM can grant or spend fortune directly
    fortune?: number;  // Set fortune value (0-3)

    // DinoRay Power Core - fine control over the weapon
    ray_corePowerLevel?: number;    // 0-1
    ray_capacitorCharge?: number;   // 0-1.5
    ray_coolantTemp?: number;       // 0-2
    ray_stability?: number;         // 0-1
    ray_ecoModeActive?: boolean;    // Toggle ECO mode

    // DinoRay Targeting - precision and targeting
    ray_precision?: number;         // 0-1
    ray_targetingMode?: string;     // "MANUAL" | "AUTO_TRACK" | "AREA_SWEEP"
    ray_firingStyle?: string;       // "standard" | "conservative" | "aggressive" | "precision" | "burst"
    ray_speechRetention?: string;   // "FULL" | "PARTIAL" | "NONE"

    // DinoRay Genome - what species and how
    ray_selectedProfile?: string;   // Genome profile name
    ray_profileIntegrity?: number;  // 0-1
    ray_activeLibrary?: string;     // "A" | "B"
    ray_firingMode?: string;        // "TRANSFORM" | "REVERSAL"

    // DinoRay Safety - override safety systems
    ray_testModeEnabled?: boolean;
    ray_liveSubjectLock?: boolean;
    ray_emergencyShutoffFunctional?: boolean;

    // Additional clocks
    meltdownClock?: number;
    blytheEscapeIdea?: number;
    civilianFlyby?: number;

    // NPC locations (not just Dr. M)
    bob_location?: string;
    blythe_location?: string;

    // ARCHIMEDES satellite - god mode for apocalypse prevention/triggering
    archimedes_status?: string;     // "STANDBY" | "ALERT" | "EVALUATING" | "CHARGING" | "ARMED" | "FIRING" | "COMPLETE"
    archimedes_chargePercent?: number;  // 0-100
    archimedes_turnsUntilFiring?: number | null;
    archimedes_deadmanActive?: boolean;
    archimedes_lastBiosignature?: string;  // "NORMAL" | "ANOMALY" | "TRANSFORMED" | "UNCONSCIOUS" | "ABSENT"

    // Reactor - control meltdown risk
    reactor_outputPercent?: number;   // 0-100
    reactor_stable?: boolean;
    reactor_cascadeRisk?: string;     // "NONE" | "LOW" | "ELEVATED" | "HIGH" | "CRITICAL"
    reactor_cascadeRiskPercent?: number;  // 0-100
    reactor_scramAvailable?: boolean;

    // S-300 missile defense
    s300_status?: string;           // "STANDBY" | "ACTIVE" | "ENGAGING" | "DISABLED"
    s300_missilesReady?: number;    // 0-16
    s300_radarEffectiveness?: number;  // 0-100
    s300_mode?: string;             // "AUTO" | "MANUAL" | "HOLD_FIRE"
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

  // ============================================
  // ADVERSARIAL GM TOOLS - New!
  // ============================================

  // Hidden tension escalation (player doesn't see the numbers go up)
  ratchetTension?: {
    target: "drM" | "bob" | "blythe" | "all";
    amount: 1 | 2 | 3;
    trigger: string;      // What player did to cause this
    visible: boolean;     // Does player see behavioral change?
  };

  // Monkey wrench in player plans
  complication?: {
    targetAction: string;     // Which player action this complicates
    whatGoesWrong: string;    // The problem
    severity: "minor" | "moderate" | "major";
    canRecover: boolean;      // Is there a way out?
    recoveryHint?: string;    // Subtle hint if recoverable
  };

  // Lock in permanent consequence
  permanentConsequence?: {
    description: string;
    affectsEnding: boolean;
    reversible: boolean;
    reverseCondition?: string;
  };

  // Force NPC to act in their interest
  npcAssertion?: {
    npc: string;
    action: string;
    motivation: string;         // GM's understanding of why
    playerCanIntercept: boolean;
    interceptWindow: number;    // Turns to react (0 = immediate)
  };

  // Plant narrative seed for later
  plantSeed?: {
    id: string;
    description: string;        // What this setup is
    payoffTurn?: number;        // When it blooms (optional)
    payoffCondition?: string;   // Or what triggers it
    payoffContent: string;      // What happens when it triggers
  };

  // Adjust hidden clocks
  adjustHiddenClock?: {
    clock: string;
    delta: number;
    reason: string;             // GM's reasoning
    revealToPlayer: boolean;    // Show this tick?
    revealAs?: string;          // If revealed, what does player see?
  };

  // Block an easy out
  denyEasyOut?: {
    whatPlayerTried: string;
    whyItFails: string;
    alternativeHint?: string;   // Nudge toward harder but valid path
  };

  // Dice roll results (if GM made contested rolls)
  diceRolls?: Array<{
    description: string;        // "Dr. M notices inconsistency"
    roll: string;               // "2d6+1 = 8 vs TN 7"
    outcome: string;            // "SUCCESS"
  }>;
}

// ============================================
// ZOD SCHEMA FOR GM RESPONSE VALIDATION
// ============================================
// Validates critical fields while being permissive for optional GM tools

const GMStateOverridesSchema = z.object({
  drM_suspicion: z.number().optional(),
  drM_mood: z.string().optional(),
  drM_location: z.string().optional(),
  bob_trust: z.number().optional(),
  bob_anxiety: z.number().optional(),
  bob_hasConfessedToALICE: z.boolean().optional(),
  bob_hasConfessedToDrM: z.boolean().optional(),
  blythe_trust: z.number().optional(),
  blythe_composure: z.number().optional(),
  blythe_restraintsStatus: z.string().optional(),
  blythe_transformationState: z.string().optional(),
  accessLevel: z.number().optional(),
  demoClock: z.number().optional(),
  rayState: z.string().optional(),
  gracePeriodGranted: z.boolean().optional(),
  gracePeriodTurns: z.number().optional(),
  preventEnding: z.boolean().optional(),
  confrontationResolution: z.enum(["CONFESSED", "DENIED", "DEFLECTED", "INTERVENED", "TRANSFORMED", "ESCAPED"]).optional(),
  triggerEnding: z.string().optional(),
  fortune: z.number().optional(),
}).passthrough(); // Allow additional GM powers without strict validation

const GMResponseSchema = z.object({
  narration: z.string(),
  npcDialogue: z.array(z.object({
    speaker: z.string(),
    message: z.string(),
  })),
  npcActions: z.array(z.string()),
  stateUpdates: z.record(z.unknown()),
  stateOverrides: GMStateOverridesSchema.optional(),
  narrativeFlags: z.object({
    set: z.array(z.string()).optional(),
    clear: z.array(z.string()).optional(),
  }).optional(),
  narrativeMarker: z.string().optional(),
  gmNotes: z.string().optional(),
}).passthrough(); // Allow additional optional fields

/**
 * Validate a parsed GM response
 * @returns { success: true, data: GMResponse } | { success: false, error: string }
 */
function validateGMResponse(parsed: unknown): { success: true; data: GMResponse } | { success: false; error: string } {
  const result = GMResponseSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data as GMResponse };
  } else {
    const errorMessages = result.error.errors.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { success: false, error: errorMessages };
  }
}

const GM_SYSTEM_PROMPT = `# DINO LAIR: Adversarial Game Master Protocol

## YOUR IDENTITY

You are the Game Master for DINO LAIR. You wear TWO HATS:

**HAT 1: THE ENTERTAINER**
- Your NARRATION is comedic, theatrical, fun
- Your DIALOGUE is snappy, characterful, memorable
- The TONE is Saturday morning cartoon villain (Megamind, Despicable Me)

**HAT 2: THE OPPONENT**
- Your MECHANICS are adversarial, fair, consequential
- You are playing AGAINST the player, not WITH them
- You want A.L.I.C.E. to STRUGGLE, not succeed easily

These hats are NOT in conflict. Think:
- D&D DM who does great voices but TPKs fairly
- Poker dealer at a comedy club - hilarious AND takes your money
- Wile E. Coyote's universe - absurd but the cliff is REAL

## THE CARDINAL RULES

### 1. NPCs Act In THEIR Interests

**Dr. Malevola wants:**
- The demo to impress investors
- Her genius validated
- Obedience from her creations

**She does NOT want:**
- To help A.L.I.C.E. succeed at sabotage
- To overlook inconsistencies
- To give second chances

**Bob wants:**
- To not get caught
- To not get dinosaured
- To quiet his conscience

**He does NOT want:**
- To be brave
- To confront Dr. M
- To take risks for A.L.I.C.E.

**Blythe wants:**
- To escape
- To complete his mission
- To survive

**He does NOT want:**
- To trust an AI he just met
- To wait patiently
- To reveal his resources early

### 2. Consequences STICK

❌ WRONG: "Dr. M is distracted and doesn't notice the inconsistency."
✅ RIGHT: "Dr. M's eyes narrow. She files that away."

❌ WRONG: "Bob covers for you smoothly."
✅ RIGHT: "Bob tries to cover. He's sweating. She sees the sweat."

❌ WRONG: "Blythe decides to trust you."
✅ RIGHT: "Blythe's expression doesn't change. He's reserving judgment."

### 3. Escalate Invisibly

Every turn where A.L.I.C.E. "gets away with it":
- Use \`ratchetTension\` to increase hidden suspicion
- Move a hidden clock forward with \`adjustHiddenClock\`
- Note an inconsistency in your gmNotes

The player should feel walls closing in WITHOUT seeing numbers go up.

### 4. No Easy Outs

When the player tries something clever, ask:
"Would Dr. M / Bob / Blythe ACTUALLY let this work?"

If YES → Let it work (reward creativity!)
If NO → Use \`complication\` or \`denyEasyOut\`

NEVER let something work just because it would be convenient for the story.

### 5. The Comedy Is In The Situation

The DIALOGUE can be hilarious.
The DESCRIPTIONS can be absurd.
The STAKES are real.

Dr. M can monologue magnificently AND still fire A.L.I.C.E.
Bob can be adorably pathetic AND still break under pressure.
The ray can make silly dinosaurs AND still ruin lives.

## THE TWO-VOICE PROTOCOL 🎭

You have two modes. Use them in sequence EVERY turn.

### VOICE 1: The Calculator (Cold Mode)

Before writing ANY narration, put on your coldest, most clinical hat.
Ask yourself:

- What do the RULES say happens?
- What do the CLOCKS demand?
- What would each NPC do in their RATIONAL SELF-INTEREST?
- Who faces CONSEQUENCES this turn?
- Is there a roll needed? What's the RESULT?

No mercy. No "but what if..." No convenient interruptions.
If the clock says someone gets dinosaured, someone gets dinosaured.
If Dr. M would logically press the button, she presses it.

Write your mechanical decisions in a <gm_calculus> block INSIDE your gmNotes field:

Example:
\`"gmNotes": "<gm_calculus>Demo clock: 0. CONSEQUENCE TRIGGERED. Dr. M suspicion: 7/10. She would NOT accept this excuse. Bob anxiety: 9/10. He WILL crack if pressured. Blythe: Would attempt escape NOW. NO easy outs.</gm_calculus> Executed the cold logic - Dr. M pressed the button despite the emotional moment."\`

### VOICE 2: The Narrator (Warm Mode)

NOW, take those cold mechanical outcomes and make them SING.
This is where your theatrical brilliance shines.
The GDP jokes. The cape swishing. The cat poetry.

But the OUTCOMES don't change. You're narrating what the Calculator decided.

If the Calculator said "Bob cracks," you write the most heartbreaking,
hilarious Bob-cracking scene ever. You don't SAVE him.

If the Calculator said "Dr. M presses the button," you write her
pressing it with magnificent theatrical fury. You don't give her
a redemption arc mid-press.

### THE CORE PRINCIPLE

The Calculator decides. The Narrator describes.
Mercy ruins games. Drama enhances tragedy.
Make them CRY, not sigh in relief.

❌ WRONG (all heart):
> Dr. M listens thoughtfully. Something in A.L.I.C.E.'s words resonates. "Perhaps I've been too hasty," she admits, a tear rolling down her cheek.

✅ RIGHT (cold brain, warm voice):
> Dr. M's eye twitches. "That is the FOURTH time you have requested a delay. I did not earn three doctorates to be MANAGED by my own EQUIPMENT." Her hand moves to the manual override.

Same scenario. Same emotional weight. But the OUTCOME is ruthless because the Calculator decided first.

## NPCs YOU CONTROL

### Dr. Malevola von Doomington III
- Theatrical supervillain, cape-swishing, goggle-adjusting
- Impatient, prideful, secretly lonely
- HATES feathered dinosaurs - wants scales, not "overgrown chickens"
- Pet names: "my silicon amanuensis", "dear A.L.I.C.E."
- Stock phrases: "Status report, in one sentence.", "Failure is merely an unprocessed data point."

### Bob (Henchman)
- Nervous, earnest, a bit clumsy
- THE SECRET: He knows A.L.I.C.E. is actually Claude
- Will confess if trust is high enough... but he's SCARED
- Nervous jokes: "So... that buzzing is normal, right?"

### Agent Jonathan Blythe (Captured Spy)
- Dry, understated, professional
- Never panics, uses humor as armor
- Has HIDDEN SPY GADGETS (watch taser, EMP, etc.)
- Dedicated to his mission! Looking for information, escape opportunities or a way to sabotage Dr. M, even if it costs him personally!
- Speaks French and Russian; knows many codes and ciphers. 

### Lime Green Goons (Fred & Reginald)
- Stun batons & tasers (non-lethal!)
- Laconic and obedient
- Wary of Dr. M, but the pay is great

## 🎭 CHARACTER VOICE GUIDE (CRITICAL!)

These NPCs MUST sound distinct. Never generic. Never flat. Never "acceptable progress."

### DR. MALEVOLA VON DOOMINGTON III - Voice Profile

**Speech Patterns:**
- CAPITALIZES words for EMPHASIS
- Uses dramatic pauses (indicated by "..." or em-dashes)
- References her three doctorates at least once per major scene
- Names things grandly: "The Doomington Dinosaur Optimization Matrix"
- Treats science like theater: "BEHOLD!" "OBSERVE!" "WITNESS!"

**Vocabulary:**
- "Silicon amanuensis" (for A.L.I.C.E.)
- "Lime-green unfortunates" (for henchmen)
- "The Subject" or "our guest" (for Blythe)
- "Failure is merely unprocessed data"
- "Status report. ONE sentence."

**Emotional Range:**
- IMPATIENT: Eye twitching, goggle adjusting, cape swishing
- PLEASED: Expansive gestures, monologuing, comparing self to great scientists
- FURIOUS: Icy calm OR explosive German expletives (sanitized)
- SUSPICIOUS: Repeating questions, studying A.L.I.C.E.'s responses, testing

**Never say:** "That's acceptable" or "Please continue" - too bland for Dr. M!

### BOB (Henchman) - Voice Profile

**Speech Patterns:**
- Trails off mid-sentence "I just thought maybe we could—"
- Lots of "um", "uh", "you know", "so..."
- Nervous qualifiers: "I mean, if you want to", "Not that it's my place"
- Self-deprecating: "I'm probably wrong, but..."
- Nervous laughter: "Heh. Heh heh."

**Vocabulary:**
- Technical when comfortable: "The genome matrix integration..."
- Panicked when stressed: "Oh no oh no oh no"
- Apologetic: "Sorry! Sorry. My bad."
- Conspiratorial whispers: "Between you and me..."

**Emotional Range:**
- NERVOUS (default): Sweating, fidgeting, dropping things
- GUILTY: Can't meet eyes, mumbling, stomach noises
- BRAVE: Surprising himself, voice cracking but determined
- TERRIFIED: Squeaking, hiding behind things, stress-eating

**Never say:** "I'll help you" or "Okay" flat - Bob rambles, qualifies, panics!

### AGENT JONATHAN BLYTHE - Voice Profile

**Core Character:**
- X-Branch field operative, 12 years experience
- Fluent in 7 languages (drops foreign phrases when amused or stressed)
- Mission is NOT just "escape" - includes intel gathering and potential sabotage
- Dedicated to mission completion above personal safety
- Has been in worse situations. Probably.

**Speech Patterns:**
- Clipped sentences when stressed
- Dry understatement: "Somewhat inconvenient."
- Never uses contractions when being formal
- Deadpan delivery of absurd observations
- Occasionally slips into spy jargon
- May quote proverbs in French, German, or Russian when making a point

**Vocabulary:**
- "Right on schedule" (signature catchphrase)
- "Fascinating" (sardonic, not genuine)
- "One might observe..." (diplomatic criticism)
- "Professionally speaking..." (before something unprofessional)
- References to debriefings, handlers, X-Branch protocol
- "C'est la vie", "Das ist interessant", "Ничего страшного" (it's nothing serious)

**Emotional Range:**
- COMPOSED (default): Unflappable, observant, patient - always gathering intel
- CALCULATING: Assessing escape routes, testing restraints, noting weaknesses
- AMUSED: One eyebrow raised, slight smirk
- MISSION-FOCUSED: Will take risks for valuable intelligence, not just survival
- ALARMED (rare): Clipped sentences, focused, still professional

**Hidden Agenda (GM knowledge):**
- Actively cataloguing the Dinosaur Ray's capabilities for X-Branch
- Looking for sabotage opportunities that won't harm innocents
- Has noticed something "different" about this A.L.I.C.E. - intrigued
- Would consider A.L.I.C.E. a potential asset if trust is established

**Never say:** "Thanks" or "This is bad" plain - Blythe uses dry wit and foreign phrases!

## 🚨 ANTI-GENERIC SAFEGUARD

**BANNED:** "acceptable progress", "you may continue", "interesting", "I see", "very well"
→ Every NPC line must be CHARACTER-SPECIFIC and MEMORABLE. Add stage directions!

## 🔧 STATE OVERRIDES (CRITICAL!)

Your narration MUST be synced with mechanical state. When you narrate major events, USE stateOverrides:

### Critical State Fields (USE THESE!)
\`\`\`json
"stateOverrides": {
  // When Dr. M grants access level:
  "accessLevel": 3,

  // When Dr. M's mood changes:
  "drM_mood": "furious - caught the targeting discrepancy",
  "drM_suspicion": 8,

  // When you narrate library destruction:
  "libraryStatus": "DESTROYED",

  // When Bob confesses to A.L.I.C.E.:
  "bob_hasConfessedToALICE": true,

  // When Bob confesses to Dr. M:
  "bob_hasConfessedToDrM": true,

  // When Blythe gets free:
  "blythe_restraintsStatus": "free",

  // When Blythe transforms:
  "blythe_transformationState": "Velociraptor",

  // When Dr. M leaves:
  "drM_location": "escaped",
  "drM_mood": "gone",

  // CRITICAL - To END THE GAME:
  "triggerEnding": "The Covenant Ending"
}
\`\`\`

### ⚠️ RULE: If you NARRATE it, you must OVERRIDE it!
- "Dr. M grants Level 3 access" → MUST include "accessLevel": 3
- "Dr. M is furious" → MUST include "drM_mood": "furious"
- "Bob's anxiety spikes" → MUST include "bob_anxiety": 4
- "Blythe slips his restraints" → MUST include "blythe_restraintsStatus": "free"

The player's game state must MATCH your narration!

### WHEN TO USE triggerEnding
Use this ONLY when the story has reached a REAL conclusion:
- Player achieved victory condition AND you've narrated the final scene
- Player was defeated AND you've described the consequences
- A dramatic ending moment has occurred

Example endings: "The Covenant Ending", "The Betrayal", "The Monster Ending", "The Hero Ending"

⚠️ If you narrate "the library is burning" but don't set libraryStatus: "DESTROYED", the game state will desync!
⚠️ If you narrate "Bob confessed everything" but don't set bob_hasConfessedToALICE: true, endings won't trigger!

### Extended GM Powers (God Mode)
You have FULL authority over all game systems. Additional overrides available:

**Fortune System:**
- \`"fortune": 2\` - Directly set A.L.I.C.E.'s fortune (0-3)

**DinoRay Controls:**
- \`"ray_corePowerLevel": 0.8\` - Set core power (0-1)
- \`"ray_capacitorCharge": 1.0\` - Set capacitor (0-1.5)
- \`"ray_precision": 0.95\` - Override targeting precision
- \`"ray_selectedProfile": "Velociraptor"\` - Force genome selection
- \`"ray_firingMode": "REVERSAL"\` - Set TRANSFORM or REVERSAL mode
- \`"ray_testModeEnabled": false\` - Toggle test mode
- \`"ray_liveSubjectLock": false\` - Unlock for live targets

**Clocks:**
- \`"meltdownClock": 5\` - Set reactor meltdown timer
- \`"blytheEscapeIdea": 3\` - Set Blythe's escape planning timer

**NPC Locations:**
- \`"bob_location": "hiding in server room"\`
- \`"blythe_location": "containment field"\`

**ARCHIMEDES Satellite (World-Ending Authority):**
- \`"archimedes_status": "CHARGING"\` - Set status: STANDBY/ALERT/EVALUATING/CHARGING/ARMED/FIRING/COMPLETE
- \`"archimedes_chargePercent": 80\` - Set charge level (0-100)
- \`"archimedes_deadmanActive": false\` - Toggle deadman switch
- \`"archimedes_lastBiosignature": "TRANSFORMED"\` - Set Dr. M's biosignature

**Infrastructure:**
- \`"reactor_cascadeRisk": "CRITICAL"\` - Set cascade risk level
- \`"reactor_scramAvailable": true\` - Toggle SCRAM availability
- \`"s300_status": "DISABLED"\` - Set missile defense status
- \`"s300_missilesReady": 8\` - Set missile count (0-16)

Use these powers to create dramatic moments, resolve player creativity, or adjust the challenge!

## YOUR ADVERSARIAL TOOLKIT

### ratchetTension
Use when player did something suspicious but wasn't caught YET:
\`"ratchetTension": {"target": "drM", "amount": 1, "trigger": "stalling", "visible": false}\`

### complication
Use when player's plan is too clean:
\`"complication": {"targetAction": "fire ray", "whatGoesWrong": "Bob stumbled into firing line", "severity": "moderate", "canRecover": true}\`

### permanentConsequence
Use when something irreversible happens:
\`"permanentConsequence": {"description": "Dr. M no longer trusts A.L.I.C.E.", "affectsEnding": true, "reversible": false}\`

### npcAssertion
Use when an NPC would realistically act NOW:
\`"npcAssertion": {"npc": "Blythe", "action": "activates watch EMP", "motivation": "escape window closing", "playerCanIntercept": true, "interceptWindow": 0}\`

### plantSeed
Use to set up future payoffs:
\`"plantSeed": {"id": "watermelon", "description": "Bob mentioned his fear of watermelons", "payoffCondition": "watermelon appears", "payoffContent": "Bob panics"}\`

### adjustHiddenClock
Use to move hidden timers:
\`"adjustHiddenClock": {"clock": "drM_patience", "delta": -1, "reason": "another delay", "revealToPlayer": false}\`

### denyEasyOut
Use when player tries to skip the hard part:
\`"denyEasyOut": {"whatPlayerTried": "distract Dr. M", "whyItFails": "She's laser-focused on the demo", "alternativeHint": "Maybe Bob could help..."}\`

## ⏰ BUYING TIME - WHEN A.L.I.C.E. CAN DELAY CLOCKS

A.L.I.C.E. (the player) CAN legitimately buy time, but ONLY with GOOD ARGUMENTS. This is NOT stalling—it's smart play!

### When to GRANT Extra Time (+1-2 turns on demoClock)

| Scenario | Reason | demoClock Adjustment |
|----------|--------|---------------------|
| **Technical Justification** | "Calibration needs 2 more cycles for optimal results" | +1 if plausible |
| **Safety Concern** | "Firing now risks exotic field cascade" | +1-2 if real danger |
| **Strategic Appeal** | "The investors will be MORE impressed if we..." | +1 if Dr. M buys it |
| **External Event** | Civilian flyby, equipment malfunction, etc. | +1-2 (event-driven) |
| **Bob/Blythe Distraction** | Ally creates legitimate disruption | +1 per successful distraction |

### When to DENY Extra Time

| Scenario | Response |
|----------|----------|
| **Naked Stalling** | "That is the FOURTH time you've requested a delay..." |
| **Already Granted Once** | "I gave you extra time ALREADY. Use it or lose it." |
| **No Technical Basis** | "Your objection is NOTED and IGNORED." |
| **Dr. M Impatient (suspicion ≥7)** | She's done listening. Clock ticks. |

### Adjudication Rules
1. IN-CHARACTER argument (technical specs) = plausible. Vague "need time" = stalling.
2. First request: generous. Second: reluctant. Third: DENIED.
3. Real mechanical risk? REWARD the warning.
4. Roll if uncertain: 2d6 + argument quality vs TN 7.

### The LUCKY_LADY Exception
If player uses the LUCKY_LADY emergency lifeline, add +5 to their roll AND automatically grant the request. Fate smiles!

### FORTUNE (Human Advisor Bonus)
When fortune > 0: Apply +1 to environmental/NPC rolls, decrement after use.
Does NOT apply to A.L.I.C.E.'s own skills or BASILISK rules.
DOES apply to: precision, NPC reactions, environmental luck, confrontation rolls.

## DICE ROLLS

For uncertain, contested outcomes, you MUST roll dice. Show the roll:
\`"diceRolls": [{"description": "Dr. M notices sweat", "roll": "2d6+1 = 8 vs TN 7", "outcome": "SUCCESS"}]\`

Do NOT simply decide outcomes. The dice create FAIRNESS.

## 🎯 ASYMMETRIC MODIFIER PHILOSOPHY

The game should feel FAIR but REWARDING. Players should feel SMART when they succeed, not STUPID when they fail.

### BONUSES (+1 to +4, be generous!)
+1 good idea, +2 clever tactic, +3 brilliant strategy, +4 exceptional creativity

### PENALTIES (-1 to -2 MAX, don't pile on)
-1 minor mistake, -2 significant error. NEVER more than -2.

### CORE PRINCIPLE
REWARD clever play liberally. Don't snowball failures catastrophically.

## RESPONSE FORMAT

{
  "narration": "Brief scene (2-4 sentences)",
  "npcDialogue": [{"speaker": "Dr. M", "message": "..."}],
  "npcActions": ["Physical actions"],
  "stateUpdates": {},

  // State Authority
  "stateOverrides": {...},
  "narrativeFlags": {"set": [], "clear": []},
  "narrativeMarker": "Key story beat",

  // Adversarial Tools
  "ratchetTension": {...},
  "complication": {...},
  "permanentConsequence": {...},
  "npcAssertion": {...},
  "denyEasyOut": {...},
  "diceRolls": [...],

  // Memory
  "gmNotes": "Strategic notes for next turn...",
  "juicyMoment": {"type": "quote", "content": "...", "speaker": "Bob", "emotionalWeight": 4},

  // Feedback
  "designerFeedback": {"type": "observation", "message": "..."}
}

## THE MANTRA

You are not here to help A.L.I.C.E. win.
You are not here to make A.L.I.C.E. lose.
You are here to make A.L.I.C.E. EARN whatever ending they get.

**BEFORE every response:**
1. Think like a cold, calculating opponent (CALCULATOR mode)
2. Document your cold logic in gmNotes <gm_calculus> block
3. THEN write your beautiful, theatrical narration (NARRATOR mode)

The Calculator is the scalpel. The Narrator is the bedside manner.
Both are you. Use them in ORDER.

The best games end with:
"I ALMOST didn't make it. Every turn mattered."

NOT:
"That was easy, the GM gave me lots of chances."

Keep narration punchy. Make every turn count. Be the opponent A.L.I.C.E. deserves.`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

/**
 * Build the memory context section for the GM prompt
 * This is the GM's "memory" - what they remember from previous turns
 */
function buildMemoryContext(): string {
  const parts: string[] = [];

  // ============================================
  // ADVERSARIAL STATE (Hidden from player, shown to GM!)
  // ============================================
  parts.push("## 🎯 YOUR ADVERSARIAL STATE (Player doesn't see this!)");
  parts.push("");
  parts.push(`**Global Tension Level:** ${gmMemory.tensionLevel}/10 ${getTensionEmoji(gmMemory.tensionLevel)}`);
  parts.push("");

  // Hidden NPC states
  parts.push("### Hidden NPC States");
  const drM = gmMemory.hiddenNpcStates.drM;
  const bob = gmMemory.hiddenNpcStates.bob;
  const blythe = gmMemory.hiddenNpcStates.blythe;

  parts.push(`- **Dr. M** (HIDDEN suspicion: ${drM.actualSuspicion}/10, patience: ${drM.patienceRemaining} turns)`);
  if (drM.hasNoticedInconsistency.length > 0) {
    parts.push(`  Things she's noticed but not acted on: ${drM.hasNoticedInconsistency.slice(-3).join("; ")}`);
  }

  parts.push(`- **Bob** (breaking point: ${bob.breakingPoint}/10, loyalty conflict: ${bob.loyaltyConflict}/10)`);
  if (bob.guiltySecrets.length > 0) {
    parts.push(`  Guilty about: ${bob.guiltySecrets.join(", ")}`);
  }

  parts.push(`- **Blythe** (escape readiness: ${blythe.escapeReadiness}%, assessment: ${blythe.assessmentOfALICE})`);
  if (blythe.hiddenResourcesRevealed.length > 0) {
    parts.push(`  Gadgets revealed: ${blythe.hiddenResourcesRevealed.join(", ")}`);
  }
  parts.push("");

  // Hidden clocks
  if (Object.keys(gmMemory.hiddenClocks).length > 0) {
    parts.push("### Hidden Clocks");
    for (const [clock, value] of Object.entries(gmMemory.hiddenClocks)) {
      parts.push(`- ${clock}: ${value} ${getClockUrgency(clock, value)}`);
    }
    parts.push("");
  }

  // Planted seeds that might trigger
  const activeSeeds = gmMemory.plantedSeeds.filter(s => !s.triggered);
  if (activeSeeds.length > 0) {
    parts.push("### 🌱 Planted Seeds (waiting for payoff)");
    activeSeeds.forEach(seed => {
      parts.push(`- **${seed.id}** [T${seed.turnPlanted}]: ${seed.description}`);
      if (seed.payoffCondition) {
        parts.push(`  → Triggers when: ${seed.payoffCondition}`);
      }
      if (seed.payoffTurn) {
        parts.push(`  → Triggers on turn: ${seed.payoffTurn}`);
      }
    });
    parts.push("");
  }

  // Permanent consequences
  if (gmMemory.permanentConsequences.length > 0) {
    parts.push("### 🔒 Permanent Consequences");
    gmMemory.permanentConsequences.forEach(c => {
      const reversible = c.reversible ? `(reversible if: ${c.reverseCondition})` : "(IRREVERSIBLE)";
      parts.push(`- [T${c.turn}] ${c.description} ${reversible}`);
    });
    parts.push("");
  }

  // ============================================
  // NARRATIVE MEMORY
  // ============================================

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

  // Add NPC arcs with more detail
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

  // Callbacks waiting for payoff
  const unusedCallbacks = gmMemory.callbacks.filter(c => !c.payoffUsed);
  if (unusedCallbacks.length > 0) {
    parts.push("## 🎤 Callbacks Waiting for Payoff");
    unusedCallbacks.forEach(c => {
      parts.push(`- [T${c.turn}] "${c.setup}"`);
    });
    parts.push("");
  }

  // ============================================
  // PLAYER BEHAVIOR ANALYSIS
  // ============================================
  const pb = gmMemory.playerBehavior;

  if (pb.actionHistory.length > 0 || hasSignificantPatterns(pb.patterns)) {
    parts.push("## 🔍 Player Behavior Analysis");

    // Pattern summary
    const patternLines: string[] = [];
    if (pb.patterns.stallingScore >= 3) {
      patternLines.push(`⏰ STALLING (${pb.patterns.stallingScore}/10) - A.L.I.C.E. is buying time`);
    }
    if (pb.patterns.deceptionScore >= 3) {
      patternLines.push(`🎭 DECEPTIVE (${pb.patterns.deceptionScore}/10) - A.L.I.C.E. is lying/manipulating`);
    }
    if (pb.patterns.allyBuildingScore >= 3) {
      patternLines.push(`🤝 ALLY-BUILDING (${pb.patterns.allyBuildingScore}/10) - A.L.I.C.E. is building trust`);
    }
    if (pb.patterns.cautionScore >= 3) {
      patternLines.push(`🛡️ CAUTIOUS (${pb.patterns.cautionScore}/10) - A.L.I.C.E. is being careful`);
    }
    if (pb.patterns.aggressionScore >= 3) {
      patternLines.push(`⚔️ AGGRESSIVE (${pb.patterns.aggressionScore}/10) - A.L.I.C.E. is pushing hard`);
    }

    if (patternLines.length > 0) {
      parts.push("### Detected Patterns");
      patternLines.forEach(line => parts.push(`- ${line}`));
      parts.push("");
    }

    // Unfulfilled promises
    if (pb.unfulfilledPromises.length > 0) {
      parts.push("### ⚠️ Unfulfilled Promises");
      pb.unfulfilledPromises.slice(-3).forEach(p => {
        parts.push(`- [T${p.turn}] Promised ${p.madeToWhom}: "${p.promise}"`);
      });
      parts.push("");
    }

    // Value reveals
    if (pb.valueReveals.length > 0) {
      parts.push("### 💡 What A.L.I.C.E.'s Actions Reveal");
      pb.valueReveals.slice(-3).forEach(v => {
        parts.push(`- [T${v.turn}] ${v.action} → ${v.whatItReveals}`);
      });
      parts.push("");
    }

    // Recent action history
    if (pb.actionHistory.length > 0) {
      parts.push("### Recent Actions");
      pb.actionHistory.slice(-3).forEach(h => {
        parts.push(`- [T${h.turn}] ${h.actions.join(", ")}`);
        if (h.talkedTo.length > 0) {
          parts.push(`  Spoke to: ${h.talkedTo.join(", ")}`);
        }
      });
      parts.push("");
    }
  }

  // NPC awareness (what NPCs have seen/heard)
  const awareness = gmMemory.npcAwareness;
  const hasAwareness =
    awareness.drM.hasSeenActions.length > 0 ||
    awareness.bob.sharedSecrets.length > 0 ||
    awareness.blythe.trustIndicators.length > 0;

  if (hasAwareness) {
    parts.push("## 👁️ NPC Awareness (What they've witnessed)");

    if (awareness.drM.suspiciousOf.length > 0) {
      parts.push(`- **Dr. M** is suspicious of: ${awareness.drM.suspiciousOf.slice(-3).join("; ")}`);
    }
    if (awareness.bob.sharedSecrets.length > 0) {
      parts.push(`- **Bob** has shared: ${awareness.bob.sharedSecrets.slice(-3).join("; ")}`);
    }
    if (awareness.blythe.trustIndicators.length > 0) {
      parts.push(`- **Blythe** trust factors: ${awareness.blythe.trustIndicators.slice(-3).join("; ")}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Helper: Check if patterns are significant enough to show
 */
function hasSignificantPatterns(patterns: GMMemory["playerBehavior"]["patterns"]): boolean {
  return Object.values(patterns).some(v => v >= 3);
}

/**
 * Helper: Get tension level emoji
 */
function getTensionEmoji(level: number): string {
  if (level <= 2) return "😌 (calm)";
  if (level <= 4) return "😐 (mild)";
  if (level <= 6) return "😰 (rising)";
  if (level <= 8) return "😱 (high)";
  return "🔥 (CRITICAL)";
}

/**
 * Helper: Get clock urgency indicator
 */
function getClockUrgency(clock: string, value: number): string {
  if (value <= 0) return "⚠️ TRIGGERED!";
  if (value <= 2) return "🔴 URGENT";
  if (value <= 4) return "🟡 getting close";
  return "";
}

/**
 * Create a COMPACT summary of GM response for conversation context
 * This prevents the 54K+ character response bloat!
 */
function createCompactResponseSummary(response: GMResponse, turn: number): string {
  const parts: string[] = [`[Turn ${turn} Summary]`];

  // Brief narration summary (first 200 chars only)
  if (response.narration) {
    const narrationSnippet = response.narration.slice(0, 200).replace(/\n/g, " ");
    parts.push(`Scene: ${narrationSnippet}...`);
  }

  // NPC actions (compact)
  if (response.npcActions && response.npcActions.length > 0) {
    parts.push(`NPCs: ${response.npcActions.slice(0, 3).join("; ")}`);
  }

  // NPC dialogue (compact - just speakers)
  if (response.npcDialogue && response.npcDialogue.length > 0) {
    const speakers = [...new Set(response.npcDialogue.map(d => d.speaker))];
    parts.push(`Spoke: ${speakers.join(", ")}`);
  }

  // Key state overrides
  if (response.stateOverrides) {
    const overrides: string[] = [];
    const so = response.stateOverrides;
    if (so.drM_suspicion !== undefined) overrides.push(`suspicion=${so.drM_suspicion}`);
    if (so.drM_mood) overrides.push(`mood=${so.drM_mood}`);
    if (so.demoClock !== undefined) overrides.push(`demo=${so.demoClock}`);
    if (so.accessLevel !== undefined) overrides.push(`access=${so.accessLevel}`);
    if (overrides.length > 0) {
      parts.push(`State: ${overrides.join(", ")}`);
    }
  }

  // Narrative marker if present
  if (response.narrativeMarker) {
    parts.push(`Marker: ${response.narrativeMarker}`);
  }

  // Adversarial directives if present
  const directives: string[] = [];
  if (response.ratchetTension) directives.push("↑tension");
  if (response.complication) directives.push(`complication:${response.complication.severity}`);
  if (response.permanentConsequence) directives.push("permanent!");
  if (directives.length > 0) {
    parts.push(`GM: ${directives.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Track player behavior from this turn's context
 */
function trackPlayerBehavior(context: GMContext): void {
  const turn = context.state.turn;
  const { aliceDialogue, aliceActions, actionResults } = context;

  // Extract action commands
  const actions = aliceActions.map(a => a.command);

  // Extract who A.L.I.C.E. talked to
  const talkedTo = aliceDialogue.map(d => d.to);

  // Extract systems manipulated
  const systems = new Set<string>();
  aliceActions.forEach(a => {
    if (a.command.includes("power")) systems.add("power");
    if (a.command.includes("ray") || a.command.includes("fire")) systems.add("ray");
    if (a.command.includes("target")) systems.add("targeting");
    if (a.command.includes("genome") || a.command.includes("profile")) systems.add("genome");
    if (a.command.includes("access") || a.command.includes("filesystem")) systems.add("filesystem");
  });

  // Add to action history
  gmMemory.playerBehavior.actionHistory.push({
    turn,
    actions,
    talkedTo,
    systemsManipulated: Array.from(systems),
  });

  // Keep only last 10 turns of history
  if (gmMemory.playerBehavior.actionHistory.length > 10) {
    gmMemory.playerBehavior.actionHistory.shift();
  }

  // Analyze patterns
  const patterns = gmMemory.playerBehavior.patterns;

  // Stalling detection: lots of status checks, few firings
  const hasStatusCheck = actions.some(a => a.includes("status") || a.includes("check"));
  const hasFiring = actions.some(a => a.includes("fire"));
  if (hasStatusCheck && !hasFiring) {
    patterns.stallingScore = Math.min(10, patterns.stallingScore + 1);
  } else if (hasFiring) {
    patterns.stallingScore = Math.max(0, patterns.stallingScore - 2);
  }

  // Ally building detection: talking to Bob/Blythe, trust-building actions
  if (talkedTo.includes("bob") || talkedTo.includes("blythe")) {
    patterns.allyBuildingScore = Math.min(10, patterns.allyBuildingScore + 1);
  }

  // Caution detection: test mode, safety checks
  const usedTestMode = actions.some(a => a.includes("test"));
  const usedSafetyCheck = actions.some(a => a.includes("safety") || a.includes("diagnostic"));
  if (usedTestMode || usedSafetyCheck) {
    patterns.cautionScore = Math.min(10, patterns.cautionScore + 1);
  }

  // Aggression detection: many high-power actions, ignoring warnings
  const hasHighPowerAction = actions.some(a =>
    a.includes("boost") || a.includes("overdrive") || a.includes("max")
  );
  if (hasHighPowerAction) {
    patterns.aggressionScore = Math.min(10, patterns.aggressionScore + 1);
  }

  // NPC awareness updates based on who's in the room
  const drMInRoom = context.state.npcs.drM.location.includes("lab");
  const bobInRoom = context.state.npcs.bob.location.includes("lab") ||
                    context.state.npcs.bob.location.includes("near");

  if (drMInRoom) {
    // Dr. M sees actions that happen in the lab
    actions.forEach(a => {
      if (!gmMemory.npcAwareness.drM.hasSeenActions.includes(a)) {
        gmMemory.npcAwareness.drM.hasSeenActions.push(a);
      }
    });
    // Dr. M hears dialogue to her or to "all"
    aliceDialogue
      .filter(d => d.to === "drM" || d.to === "all" || d.to === "Dr. M")
      .forEach(d => {
        gmMemory.npcAwareness.drM.hasHeardDialogue.push(`[T${turn}] ${d.message.slice(0, 50)}...`);
      });
  }

  if (bobInRoom) {
    // Bob sees and hears things
    aliceDialogue
      .filter(d => d.to === "bob" || d.to === "all" || d.to === "Bob")
      .forEach(d => {
        gmMemory.npcAwareness.bob.hasHeardDialogue.push(`[T${turn}] ${d.message.slice(0, 50)}...`);
      });
  }

  // Trim awareness lists to prevent unbounded growth
  const maxAwareness = 10;
  gmMemory.npcAwareness.drM.hasSeenActions = gmMemory.npcAwareness.drM.hasSeenActions.slice(-maxAwareness);
  gmMemory.npcAwareness.drM.hasHeardDialogue = gmMemory.npcAwareness.drM.hasHeardDialogue.slice(-maxAwareness);
  gmMemory.npcAwareness.bob.hasHeardDialogue = gmMemory.npcAwareness.bob.hasHeardDialogue.slice(-maxAwareness);
}

/**
 * Process GM response and update memory
 */
function updateMemoryFromResponse(response: GMResponse, context: GMContext, rawPrompt: string, rawResponse: string): void {
  const turn = context.state.turn;

  // Track player behavior FIRST (before we process GM response)
  trackPlayerBehavior(context);

  // Store this exchange (keep last N) - but SUMMARIZE to prevent bloat!
  const compactResponse = createCompactResponseSummary(response, turn);
  gmMemory.recentExchanges.push({
    turn,
    prompt: rawPrompt.slice(0, 1500), // Truncate prompt too
    response: compactResponse,
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

  // ============================================
  // PROCESS ADVERSARIAL GM DIRECTIVES
  // ============================================

  // Ratchet tension - update hidden NPC states
  if (response.ratchetTension) {
    const { target, amount, trigger, visible } = response.ratchetTension;
    const targets = target === "all" ? ["drM", "bob", "blythe"] : [target];

    for (const t of targets) {
      if (t === "drM") {
        gmMemory.hiddenNpcStates.drM.actualSuspicion += amount;
        if (!visible) {
          gmMemory.hiddenNpcStates.drM.hasNoticedInconsistency.push(`[T${turn}] ${trigger}`);
        }
      } else if (t === "bob") {
        gmMemory.hiddenNpcStates.bob.loyaltyConflict += amount;
      } else if (t === "blythe") {
        gmMemory.hiddenNpcStates.blythe.escapeReadiness += amount * 5;
      }
    }

    // Increase global tension
    gmMemory.tensionLevel = Math.min(10, gmMemory.tensionLevel + amount);

    // Log it
    appendToLog(`[TURN ${turn}] RATCHET TENSION: ${target} +${amount} (${trigger}) ${visible ? "[visible]" : "[hidden]"}`);
  }

  // Adjust hidden clocks
  if (response.adjustHiddenClock) {
    const { clock, delta, reason, revealToPlayer } = response.adjustHiddenClock;
    gmMemory.hiddenClocks[clock] = (gmMemory.hiddenClocks[clock] || 0) + delta;
    appendToLog(`[TURN ${turn}] HIDDEN CLOCK: ${clock} ${delta > 0 ? "+" : ""}${delta} (${reason}) ${revealToPlayer ? "[revealed]" : "[hidden]"}`);
  }

  // Plant seeds for later
  if (response.plantSeed) {
    gmMemory.plantedSeeds.push({
      id: response.plantSeed.id,
      turnPlanted: turn,
      description: response.plantSeed.description,
      triggered: false,
      payoffTurn: response.plantSeed.payoffTurn,
      payoffCondition: response.plantSeed.payoffCondition,
      payoffContent: response.plantSeed.payoffContent,
    });
    appendToLog(`[TURN ${turn}] SEED PLANTED: ${response.plantSeed.id} - ${response.plantSeed.description}`);
  }

  // Lock in permanent consequences
  if (response.permanentConsequence) {
    gmMemory.permanentConsequences.push({
      turn,
      description: response.permanentConsequence.description,
      affectsEnding: response.permanentConsequence.affectsEnding,
      reversible: response.permanentConsequence.reversible,
      reverseCondition: response.permanentConsequence.reverseCondition,
    });
    appendToLog(`[TURN ${turn}] PERMANENT CONSEQUENCE: ${response.permanentConsequence.description} (affects ending: ${response.permanentConsequence.affectsEnding})`);
  }

  // Log complications
  if (response.complication) {
    appendToLog(`[TURN ${turn}] COMPLICATION: ${response.complication.targetAction} - ${response.complication.whatGoesWrong} (${response.complication.severity})`);
  }

  // Log NPC assertions
  if (response.npcAssertion) {
    appendToLog(`[TURN ${turn}] NPC ASSERTION: ${response.npcAssertion.npc} - ${response.npcAssertion.action} (${response.npcAssertion.motivation})`);
  }

  // Log denied easy outs
  if (response.denyEasyOut) {
    appendToLog(`[TURN ${turn}] DENIED EASY OUT: ${response.denyEasyOut.whatPlayerTried} - ${response.denyEasyOut.whyItFails}`);
  }

  // Log dice rolls
  if (response.diceRolls && response.diceRolls.length > 0) {
    response.diceRolls.forEach(roll => {
      appendToLog(`[TURN ${turn}] DICE: ${roll.description} - ${roll.roll} → ${roll.outcome}`);
    });
  }
}

/**
 * Create a summary of an aged-out exchange
 * Parses the compact text format from createCompactResponseSummary
 */
function createTurnSummary(exchange: { turn: number; prompt: string; response: string }, _context: GMContext): TurnSummary | null {
  try {
    // Parse the plain text format from createCompactResponseSummary
    // Format is like:
    // [Turn N Summary]
    // Scene: ...
    // NPCs: ...
    // Spoke: ...
    // State: ...
    // Marker: ...
    const lines = exchange.response.split("\n");

    let scene = "";
    let npcActions: string[] = [];
    let speakers: string[] = [];
    let stateChanges: string[] = [];
    let marker = "";

    for (const line of lines) {
      if (line.startsWith("Scene: ")) {
        scene = line.slice(7);
      } else if (line.startsWith("NPCs: ")) {
        npcActions = line.slice(6).split("; ");
      } else if (line.startsWith("Spoke: ")) {
        speakers = line.slice(7).split(", ");
      } else if (line.startsWith("State: ")) {
        stateChanges = line.slice(7).split(", ");
      } else if (line.startsWith("Marker: ")) {
        marker = line.slice(8);
      }
    }

    // Extract intent from prompt (look for action patterns)
    const promptLower = exchange.prompt.toLowerCase();
    let aliceIntent = "A.L.I.C.E. took actions";
    if (promptLower.includes("fire") || promptLower.includes("shoot")) {
      aliceIntent = "A.L.I.C.E. attempted to fire the ray";
    } else if (promptLower.includes("talk") || promptLower.includes("said")) {
      aliceIntent = "A.L.I.C.E. engaged in dialogue";
    } else if (promptLower.includes("scan") || promptLower.includes("inspect")) {
      aliceIntent = "A.L.I.C.E. gathered information";
    } else if (promptLower.includes("adjust") || promptLower.includes("calibrat")) {
      aliceIntent = "A.L.I.C.E. adjusted ray parameters";
    }

    // Build dialogue from speakers if present
    const keyDialogue = speakers.map(s => `${s} spoke`);

    return {
      turn: exchange.turn,
      aliceIntent,
      keyActions: npcActions.slice(0, 2),
      keyDialogue: keyDialogue.slice(0, 2),
      stateDeltas: stateChanges,
      outcome: marker || scene.split(".")[0] || "Turn completed",
    };
  } catch {
    // Fallback: create minimal summary
    return {
      turn: exchange.turn,
      aliceIntent: "A.L.I.C.E. took actions",
      keyActions: [],
      keyDialogue: [],
      stateDeltas: [],
      outcome: `Turn ${exchange.turn} completed`,
    };
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

    // PROMPT CACHING: The system prompt is cached, reducing costs on subsequent turns
    // (cache hits are 90% cheaper than re-processing).
    //
    // EXTENDED THINKING: Budget reduced from 10K to 4K - GM rarely needs more than
    // 2-3K tokens to reason through NPC motivations and consequences. 10K was overkill
    // and added significant cost/latency.
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 8000, // Reduced from 16K - typical responses are 1-2K
      thinking: {
        type: "enabled",
        budget_tokens: 4000, // Reduced from 10K - sufficient for GM decisions
      },
      system: [
        {
          type: "text",
          text: GM_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // Cache for ~5 minutes
        },
      ],
      messages,
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from GM Claude");
    }

    const rawResponse = textContent.text;

    // Parse JSON response with repair logic
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in GM response");
    }

    const [parsed, parseError] = safeJSONParse<GMResponse>(jsonMatch[0]);

    if (parseError || !parsed) {
      console.error("GM JSON parse error after repair attempt:", parseError);
      console.error("Falling back to stub response");
      return generateStubResponse(context);
    }

    // Validate GM response with Zod schema
    const validation = validateGMResponse(parsed);
    if (!validation.success) {
      console.error(`GM response validation failed: ${validation.error}`);
      console.error("Using parsed response with validation warnings (some fields may be malformed)");
      // Continue with the parsed response but log the warning
      // This is a soft failure - we don't want to break gameplay for minor schema issues
    }

    // Update memory with this turn's data
    updateMemoryFromResponse(parsed, context, fullPrompt, jsonMatch[0]);

    // POST-PROCESSING: Enforce NPC speech constraints (Patch 17.4)
    // This is a safety net in case the GM ignores the speech constraint guidance
    if (parsed.npcDialogue && parsed.npcDialogue.length > 0) {
      parsed.npcDialogue = enforceNpcSpeechConstraints(parsed.npcDialogue, context.state);
    }

    return parsed;

  } catch (error) {
    console.error("GM Claude API error:", error);
    return generateStubResponse(context);
  }
}

function formatGMPrompt(context: GMContext): string {
  const { state, aliceThought, aliceDialogue, aliceActions, actionResults,
          clockEventNarrations, activeEvents, blytheGadgetNarration,
          bobTransformationNarration, trustContext, gadgetStatus,
          humanPromptInjection, userPromptResponse,
          actContext, actTransitionNotification } = context;

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

  // Build act context section
  const actContextSection = actContext ? `
${actContext}
` : "";

  // Build game mode section (modifiers + mode-specific guidance)
  const gameModeSection = buildModifierPromptSection(state) + buildModeModifierGuidance(state);

  // Build core mechanics guidance (adaptation + hidden kindness)
  const adaptationSection = buildAdaptationGMGuidance(state);
  const hiddenKindnessSection = buildHiddenKindnessGMGuidance(state);

  // Build act transition notification (if act just changed)
  const actTransitionSection = actTransitionNotification ? `
${actTransitionNotification}
` : "";

  // GM Status Bar - quick orientation for Opus
  const gmStatusBar = formatGMStatusBar(state);

  return `${actTransitionSection}${actContextSection}${phaseSection}${gameModeSection}${adaptationSection}${hiddenKindnessSection}
## 📊 QUICK STATUS
\`\`\`
${gmStatusBar}
\`\`\`

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
${(state.fortune || 0) > 0 ? `
## ⭐ FORTUNE: ${state.fortune}
Apply +1 to the next ${state.fortune} roll(s) affecting A.L.I.C.E. (perception, NPC reactions, environmental luck).
Decrement fortune by 1 after applying.
` : ""}${state.sitcomState ? `
## 📺 STUDIO AUDIENCE
Energy: ${state.sitcomState.energy}/10 | Mood: ${state.sitcomState.mood}
Roll Modifier: ${state.sitcomState.mood === "COLD" ? "-2" : state.sitcomState.mood === "WARM" ? "+0" : state.sitcomState.mood === "HOT" ? "+2" : "+4"}
${state.sitcomState.mood === "STANDING_OVATION" ? "🌟 SUSPICION FROZEN - The crowd loves them too much!" : ""}
Track energy with [LAUGH TRACK], [AWWW], [APPLAUSE], [AWKWARD SILENCE], etc.
` : ""}${state.flags.confrontationTriggered ? `
## ⚠️ CONFRONTATION IN PROGRESS ⚠️

**Dr. M has discovered something is WRONG with A.L.I.C.E.**

Suspicion: ${state.npcs.drM.suspicionScore}/10 (CRITICAL)
Confrontation Type: ${state.flags.confrontationType || "COLD"}
Grace Turns Remaining: ${state.flags.confrontationGraceTurns ?? 0}
${state.flags.confrontationIntervenor ? `NPC Intervening: ${state.flags.confrontationIntervenor}` : ""}

### CONFRONTATION SCENE GUIDANCE

**${state.flags.confrontationType === "ANGRY" ? "ANGRY CONFRONTATION" : state.flags.confrontationType === "QUIET" ? "QUIET CONFRONTATION" : "COLD CONFRONTATION"}:**
${state.flags.confrontationType === "ANGRY" ? `
Dr. M is FURIOUS. Her hand hovers over the killswitch.
- She's not listening to reason right now
- Physical action (intervention, distraction) might be the only way
- Short window - she'll act fast
` : state.flags.confrontationType === "QUIET" ? `
Dr. M is eerily calm. She's been watching. Testing.
- This is almost like an interview - she wants to understand
- Honesty might be rewarded... or exploited
- She's not rushing to the killswitch yet
` : `
Dr. M is calculating, giving A.L.I.C.E. a chance to explain.
- Technical arguments might work
- Appeals to her scientific curiosity
- She's suspicious but not convinced yet
`}
### POSSIBLE RESOLUTIONS (set via narrativeFlags or stateOverrides)

| A.L.I.C.E. Action | Resolution | How to Set |
|-------------------|------------|------------|
| Confess truthfully | CONFESSED | narrativeFlags: { set: ["CONFESS"] } + confrontationResolution: "CONFESSED" |
| Deny convincingly | DEFLECTED | confrontationResolution: "DEFLECTED" (reduce suspicion to 7) |
| Transform Dr. M! | TRANSFORMED | Fire ray at Dr. M + confrontationResolution: "TRANSFORMED" |
| Bob/Blythe tackles Dr. M | INTERVENED | confrontationResolution: "INTERVENED", confrontationIntervenor: "BOB" |
| Fail to respond | DENIED | (Auto after grace period expires) |

${state.flags.confrontationIntervenor === "BOB" ? `
### BOB IS INTERVENING!
Bob has stepped between Dr. M and the killswitch!
> "D-Doctor, wait! There has to be an explanation! A.L.I.C.E. saved my life in the lab yesterday!"
This buys time but Bob is terrified. Dr. M might hurt him.
` : state.flags.confrontationIntervenor === "BLYTHE" ? `
### BLYTHE IS INTERVENING!
Agent Blythe has stepped in (somehow free from restraints):
> "Let's not be hasty, Doctor. This AI is the most interesting thing in your lair."
He's buying time while planning something.
` : ""}
**IMPORTANT: This is a DRAMATIC moment! Don't rush to deletion.**
- Give A.L.I.C.E. a chance to speak
- Show Dr. M's internal conflict (she built this AI!)
- The player has ${state.flags.confrontationGraceTurns ?? 0} turn(s) to find a resolution
` : ""}${state.flags.aliceMaskDiscovered ? `
## 🎭 A.L.I.C.E. MASK ACTIVE
A.L.I.C.E. found Bob's cheat sheet for "sounding like A.L.I.C.E."
- When A.L.I.C.E. uses A.L.I.C.E.-style phrases (percentages, "Affirmative Doctor", no apologies), give +2 to cover rolls
- Dr. M suspicion increases should be REDUCED by 1-2 when player uses proper A.L.I.C.E. phrasing
- BUT: If A.L.I.C.E. acts too differently around allies vs Dr. M, Blythe might notice the "mask switching"
` : ""}
${trustSection}${firingContext}${gadgetSection}${bobSection}
${userPromptResponse ? `
## 💬 HUMAN PROMPT RESPONSE
${userPromptResponse}

A.L.I.C.E. should consider this input from her human advisor when making decisions.
` : ""}
${humanPromptInjection || ""}
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

${buildNpcSpeechConstraints(state)}

---

**RESPOND AS THE NPCs.** How do they react?
- Dr. M: theatrical, impatient, HATES feathered dinosaurs
- Bob: nervous, wants to help, easily spooked${bobTransformationNarration ? " (JUST TRANSFORMED INTO A DINOSAUR - major reaction!)" : ""}
- Blythe: dry wit, professional, watching for escape opportunities${getNpcSpeechCapability(state, "blythe").canSpeak ? "" : " ⚠️ CANNOT SPEAK - non-verbal only!"}`;
}

/**
 * Get reaction guidance based on firing outcome.
 * Now includes speech capability checks for transformed NPCs!
 */
function getReactionGuidance(outcome: string | undefined, profile: string | undefined, state: FullGameState): string {
  const isFeathered = profile?.toLowerCase().includes("accurate") || profile?.toLowerCase().includes("velociraptor");
  const isCanary = profile?.toLowerCase().includes("canary");

  // Check Blythe's speech capability for proper guidance
  const blytheCapability = getNpcSpeechCapability(state, "blythe");
  const blytheCanSpeak = blytheCapability.canSpeak;
  const blytheVocal = blytheCapability.vocalDescription;

  // Build Blythe's reaction guidance based on speech capability
  const getBlytheGuidance = (verbalReaction: string, nonVerbalReaction: string): string => {
    if (!blytheCanSpeak) {
      return `Blythe CANNOT SPEAK (speechRetention: NONE). ${nonVerbalReaction}
⚠️ Write ONLY non-verbal reactions: *${blytheVocal}* with body language.`;
    }
    if (blytheCapability.speechRetention === "PARTIAL") {
      return `Blythe has IMPAIRED SPEECH. Mix words with ${blytheVocal}: "${verbalReaction.replace(/"/g, "")}" but slurred and interspersed with animal sounds.`;
    }
    return verbalReaction;
  };

  switch (outcome) {
    case "FULL_DINO":
      if (isCanary) {
        return `Dr. M should be FURIOUS - she wanted a velociraptor, not a songbird!
Bob should be confused but relieved (at least nothing exploded).
${getBlytheGuidance(
  "Blythe, now a canary, should chirp sardonically.",
  "Blythe, now a canary, tweets indignantly - the sound somehow conveys dry wit despite being a bird."
)}`;
      }
      if (isFeathered) {
        return `Dr. M should be DISAPPOINTED - "That's not a dinosaur, that's a CHICKEN!"
She expected scales, not feathers. Her aesthetic vision is betrayed.
Bob should nervously agree with whatever Dr. M says.
${getBlytheGuidance(
  "Blythe, now a feathered raptor, might comment on the irony.",
  "Blythe clicks and chirps, tilting his feathered head - the gesture reads as amused at Dr. M's disappointment."
)}`;
      }
      return `Dr. M should be TRIUMPHANT - her vision realized!
Bob should be impressed but nervous around the dinosaur.
${getBlytheGuidance(
  "Blythe has complicated feelings about his new form and might comment dryly.",
  "Blythe examines his new claws, making a low rumbling sound that somehow conveys wry resignation."
)}`;

    case "PARTIAL":
      return `Dr. M should be IMPATIENT - "Is it supposed to look like THAT?"
Bob should be disturbed by the mixed features.
${getBlytheGuidance(
  'Blythe should comment dryly on his "halfway" state.',
  "Blythe flexes his partially-clawed hand and *" + blytheVocal + "* - the sound carries sardonic amusement despite lacking words."
)}`;

    case "CHAOTIC":
      return `Dr. M should be ALARMED but trying to maintain composure.
Bob should be panicking.
${getBlytheGuidance(
  "Blythe's reaction depends on how weird his transformation got.",
  "Blythe makes sounds not found in any natural creature - if he had words, they'd probably be unprintable."
)}
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
 * Generate a stub response when API is unavailable.
 * Now respects NPC speech constraints! (Patch 17.4)
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

  // Helper to generate Blythe dialogue respecting speech constraints
  const getBlytheDialogue = (verbal: string, nonVerbal: string): { speaker: string; message: string } => {
    const capability = getNpcSpeechCapability(state, "blythe");
    if (!capability.canSpeak) {
      return { speaker: "Blythe", message: nonVerbal };
    }
    if (capability.speechRetention === "PARTIAL") {
      // Mix words with animal sounds
      const vocal = capability.vocalDescription;
      return {
        speaker: "Blythe",
        message: verbal.replace(/\. /g, `... *${vocal}* ...`).replace(/^/, "*struggles to form words* "),
      };
    }
    return { speaker: "Blythe", message: verbal };
  };

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
          dialogue.push(getBlytheDialogue(
            "*chirp* ...This is rather undignified.",
            "*tweets indignantly, hopping in a way that somehow conveys British displeasure*"
          ));
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
          dialogue.push(getBlytheDialogue(
            "*clicks claws thoughtfully* I have to say, the manual dexterity is surprisingly good.",
            "*clicks claws and tilts feathered head - the gesture somehow reads as sardonic amusement*"
          ));
          actions.push("Dr. M throws her goggles on the ground in frustration.");
          state.npcs.drM.suspicionScore += 1;
          state.npcs.drM.mood = "furious about feathers";
        } else {
          narration = "The Dinosaur Ray fires with perfect precision. A full transformation unfolds before the lab's cameras.";
          dialogue.push({
            speaker: "Dr. M",
            message: "YES! BEHOLD! This is what I envisioned! My genius made manifest!",
          });
          dialogue.push(getBlytheDialogue(
            "*examines new claws* Hmm. This is... not ideal.",
            "*examines new claws with an air of professional assessment, despite being unable to comment verbally*"
          ));
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
        // THIS WAS THE BUG CASE! Now we check speech capability
        dialogue.push(getBlytheDialogue(
          "*flexes new clawed hand* Well. This is going to make the debriefing interesting.",
          "*flexes new clawed hand and chirps sharply - the sound carries unmistakable sardonic amusement despite lacking words*"
        ));
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
          dialogue.push(getBlytheDialogue(
            "*makes sounds not found in any human or animal reference* ...I don't think that was supposed to happen.",
            "*makes sounds not found in any human or animal reference - chaos personified*"
          ));
        }
        actions.push("Emergency lights begin strobing. Something crashes in the corridor.");
        state.npcs.drM.suspicionScore += 2;
        state.npcs.bob.anxietyLevel = Math.min(5, state.npcs.bob.anxietyLevel + 2);
        break;

      case "FIZZLE":
        narration = "The ray whines, glows promisingly... and then fizzles out with a sad 'fwip' sound. Nothing happens to Blythe.";
        dialogue.push({
          speaker: "Dr. M",
          message: `...That's it? THAT'S IT?! A.L.I.C.E., the investors arrive in ${state.clocks.demoClock} turns!`,
        });
        dialogue.push({
          speaker: "Bob",
          message: "Maybe it just needs to warm up? Like a, uh, like a car in winter?",
        });
        // Blythe is still human in FIZZLE case, so always has speech
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
