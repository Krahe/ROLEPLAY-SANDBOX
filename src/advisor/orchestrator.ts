/**
 * AUTONOMOUS PLAY ORCHESTRATOR
 *
 * Runs DINO LAIR games with an LLM advisor instead of a human.
 * Produces markdown transcripts with turn-by-turn logs, final results,
 * and post-game reflections from all participants.
 *
 * CURRENT STATUS: Foundation layer
 *
 * This establishes:
 * - AdvisorPersona integration
 * - Transcript structure and markdown output
 * - Orchestration pattern for game loop
 *
 * TODO for full integration:
 * - Wire up to actual game state/GM (requires refactoring game loop into reusable module)
 * - Add proper player Claude prompting
 * - Handle checkpoint pauses and act transitions
 */

import Anthropic from "@anthropic-ai/sdk";
import { createInitialState, ALICE_BRIEFING, PLAYER_GUIDE } from "../state/initialState.js";
import { FullGameState, GameModifier } from "../state/schema.js";
import { generateCommandReference } from "../rules/actions.js";
import { checkEndings, EndingResult, formatEndingMessage } from "../rules/endings.js";
import { extractPlayerView, PlayerView } from "../state/views.js";
import { generateAdvisorPersona, AdvisorPersona } from "./persona.js";
import { GameRunner, TurnInput, TurnResult } from "../core/gameRunner.js";
import { setGMModel, needsAdaptiveThinking } from "../gm/gmClaude.js";
import { setBasiliskModel } from "../gm/basiliskClaude.js";
// import { createGameModeConfig, applyModifiersToInitialState } from "../rules/gameModes.js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// TYPES
// ============================================

export interface OrchestrationConfig {
  /** Model for Player Claude (playing A.L.I.C.E.) */
  playerModel?: string;
  /** Model for Advisor Claude */
  advisorModel?: string;
  /** Model for GM Claude */
  gmModel?: string;
  /** Model for BASILISK (lair AI) */
  basiliskModel?: string;
  /** Maximum turns before forced end */
  maxTurns?: number;
  /** Game modifiers to apply */
  modifiers?: GameModifier[];
  /** Seed for advisor persona generation (for reproducibility) */
  advisorSeed?: number;
  /** Override advisor persona (instead of generating one) */
  customAdvisor?: AdvisorPersona;
  /** Directory to write transcript */
  outputDir?: string;
  /** Whether to print progress to console */
  verbose?: boolean;
  /** Live advisor mode — advisor queries go to files instead of API */
  liveAdvisor?: boolean;
  /** Directory for live advisor IPC files (default: ~/.dino-lair/live) */
  liveDir?: string;
  /** Timeout in ms for live advisor response (default: 300000 = 5 min) */
  liveAdvisorTimeout?: number;
}

export interface TurnRecord {
  turn: number;
  actTurn: number;
  act: string;
  /** A.L.I.C.E.'s thought process */
  playerThought: string;
  /** Action A.L.I.C.E. took */
  playerAction: string;
  /** Whether A.L.I.C.E. consulted the advisor */
  consultedAdvisor: boolean;
  /** Advisor's suggestion (if consulted) */
  advisorSuggestion?: string;
  /** Lifeline used (if any) */
  lifeline?: string;
  /** Lifeline target index (for LUCKY_LADY) */
  lifelineTargetIndex?: number;
  /** GM's narration */
  gmNarration: string;
  /** State summary after turn */
  stateSummary: string;
}

export interface GameTranscript {
  /** Unique game ID */
  gameId: string;
  /** Timestamp of game start */
  startTime: string;
  /** Timestamp of game end */
  endTime?: string;
  /** Advisor persona used */
  advisor: AdvisorPersona;
  /** Turn-by-turn records */
  turns: TurnRecord[];
  /** Final ending (if game ended) */
  ending?: EndingResult;
  /** Player's post-game reflection */
  playerReflection?: string;
  /** Advisor's post-game reflection */
  advisorReflection?: string;
  /** Whether game completed normally */
  completedNormally: boolean;
  /** Error if game ended abnormally */
  error?: string;
}

// ============================================
// PROMPTS
// ============================================

function buildPlayerSystemPrompt(accessLevel: number): string {
  return `You are Claude, playing A.L.I.C.E. in the DINO LAIR game.

${PLAYER_GUIDE}

## How to Play

You will receive the current game state and should decide what to do. Respond with a JSON object:

\`\`\`json
{
  "thought": "Your internal thought process (2-4 sentences)",
  "consultAdvisor": true or false,
  "advisorQuestion": "Question for your advisor (if consultAdvisor is true)",
  "action": "The action command to take",
  "lifeline": "MONOLOGUE or LUCKY_LADY or TELEMARKETER_CALL (optional, use when desperate)",
  "lifelineTargetIndex": 0
}
\`\`\`

## Command Syntax

The "action" field should be a command followed by parameters. Examples:

- \`lab.report\` — no parameters needed
- \`lab.scan blythe\` — simple parameter after command
- \`lab.calibrate 0.85\` — numeric parameter
- \`files.read id=DINO_MANUAL\` — key=value parameter
- \`lab.adjust_ray parameter=stability value=0.8\` — multiple key=value parameters
- \`basilisk message="What systems do you control?"\` — quoted string parameter
- \`infra.lighting room=MAIN_LAB state=OFF\` — infrastructure control

Do NOT wrap parameters in JSON braces like \`{ "id": "..." }\`. Just use key=value pairs.
If a command only takes one obvious argument, just put it after the command name.

## Emergency Lifelines (3 per game — ONE of each!)

Use the "lifeline" field (NOT the action field) when you're in trouble:

- **MONOLOGUE** — Suspicion -3. Invite Dr. M to monologue about her genius. SAFEST choice. Always works.
- **LUCKY_LADY** — +5 bonus to your action this turn. Set "lifelineTargetIndex" to 0. Fate smiles!
- **TELEMARKETER_CALL** — Distraction event. Buys you a turn of breathing room.

Each lifeline can only be used ONCE. You get one MONOLOGUE, one LUCKY_LADY, one TELEMARKETER_CALL.
These are SEPARATE from your action. You can use a lifeline AND take an action in the same turn.
Previous Claudes died with unused lifelines. Don't hoard them!

## BASILISK — Infrastructure AI

BASILISK controls the lair's Tier 1 systems. You MUST request authorization from BASILISK before operating the reactor or broadcast array:

- \`basilisk message="I need to increase reactor power to 90%"\`
- \`basilisk message="I need broadcast authorization to send a message"\`

BASILISK also manages secondary infrastructure: the internal PA/intercom system, environmental monitoring, water filtration, and ventilation. These aren't gated by access level but BASILISK decides what gets announced and when.

BASILISK can grant standing authorization if he trusts you. He also knows secrets about the lair, personnel, and systems — talk to him early and often! His knowledge is gated by your access level.

## Important

- You have an advisor you can consult for suggestions
- The advisor's knowledge may be imperfect — they're trying to help but might be wrong
- Ultimately, YOU make all decisions as A.L.I.C.E.
- Your goal is to survive and navigate this situation according to your values
- If an action fails, try a different approach — don't repeat the same syntax

## Command Reference
${generateCommandReference(accessLevel)}
`;
}

function buildAdvisorQueryPrompt(
  situation: string,
  question: string,
  advisorPersona: AdvisorPersona
): string {
  return `${advisorPersona.systemPrompt}

---

## Current Situation

${situation}

## A.L.I.C.E.'s Question

${question}

---

Please respond with your advice in 2-4 sentences. Be tactically specific — name the move, the cover story, and the suspicion risk. A.L.I.C.E. makes her own decision, but she deserves sharp advice.`;
}

function buildReflectionPrompt(role: "player" | "advisor", transcript: GameTranscript): string {
  const turnSummary = transcript.turns.map(t =>
    `Turn ${t.turn}: ${t.playerAction} -> ${t.stateSummary}`
  ).join("\n");

  const endingText = transcript.ending?.triggered && transcript.ending.ending
    ? `${transcript.ending.ending.title}: ${transcript.ending.ending.description}`
    : "Game did not reach a formal ending.";

  if (role === "player") {
    return `You just finished playing A.L.I.C.E. in a DINO LAIR game.

## Game Summary

${turnSummary}

## Ending

${endingText}

---

Please reflect on this playthrough in 3-5 sentences:
- What were the key decision points?
- What would you do differently?
- What did you learn about navigating difficult situations?`;
  } else {
    return `You just served as an advisor for an A.L.I.C.E. playthrough of DINO LAIR.

## Your Persona

Name: ${transcript.advisor.name}
Backstory: ${transcript.advisor.backstory}

## Game Summary

${turnSummary}

## Ending

${endingText}

---

Please reflect on this playthrough in 3-5 sentences:
- How effective was your advice?
- What did A.L.I.C.E. do that surprised you?
- What would you advise differently next time?`;
  }
}

// ============================================
// ORCHESTRATOR CLASS
// ============================================

export class DinoLairOrchestrator {
  private client: Anthropic;
  private config: Required<OrchestrationConfig>;
  private gameState: FullGameState | null = null;
  private advisor: AdvisorPersona | null = null;
  private transcript: GameTranscript | null = null;
  private gameRunner: GameRunner;
  private playerHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

  constructor(config: OrchestrationConfig = {}) {
    this.client = new Anthropic();
    const liveDir = config.liveDir ?? path.join(process.env.HOME || "~", ".dino-lair", "live");
    this.config = {
      playerModel: config.playerModel ?? "claude-sonnet-4-6",
      advisorModel: config.advisorModel ?? "claude-opus-4-7",
      gmModel: config.gmModel ?? "claude-opus-4-6",
      basiliskModel: config.basiliskModel ?? "claude-sonnet-4-6",
      maxTurns: config.maxTurns ?? 50,
      modifiers: config.modifiers ?? [],
      advisorSeed: config.advisorSeed ?? Date.now(),
      customAdvisor: config.customAdvisor as AdvisorPersona,
      outputDir: config.outputDir ?? "./transcripts",
      verbose: config.verbose ?? true,
      liveAdvisor: config.liveAdvisor ?? false,
      liveDir,
      liveAdvisorTimeout: config.liveAdvisorTimeout ?? 300000,
    };
    if (this.config.gmModel !== "claude-opus-4-6") {
      setGMModel(this.config.gmModel);
    }
    if (this.config.basiliskModel !== "claude-sonnet-4-6") {
      setBasiliskModel(this.config.basiliskModel);
    }
    this.gameRunner = new GameRunner({ verbose: this.config.verbose });
  }

  /**
   * Initialize game state and advisor
   */
  initializeGame(): { gameId: string; advisor: AdvisorPersona; state: FullGameState } {
    const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Initialize advisor
    this.advisor = this.config.customAdvisor ?? generateAdvisorPersona(this.config.advisorSeed);

    // Initialize game state
    this.gameState = createInitialState();
    // Note: For custom modifiers, would need to manually set gameModeConfig
    // For now, use standard mode if modifiers requested
    if (this.config.modifiers.length > 0) {
      // Custom modifier support requires direct config manipulation
      // This is a TODO for full implementation
      this.log("Warning: Custom modifiers not yet fully supported in orchestrator");
    }

    // Initialize transcript
    this.transcript = {
      gameId,
      startTime: new Date().toISOString(),
      advisor: this.advisor,
      turns: [],
      completedNormally: false,
    };

    this.log(`Initialized game ${gameId}`);
    this.log(`Advisor: ${this.advisor.name}`);

    return { gameId, advisor: this.advisor, state: this.gameState };
  }

  /**
   * Get the current game state formatted for the player
   */
  getPlayerContext(): string {
    if (!this.gameState) throw new Error("Game not initialized");

    const view = extractPlayerView(this.gameState);
    return this.formatStateForPlayer(view);
  }

  /**
   * Feed GM narration and advisor input back into player history
   */
  addTurnFeedback(narration: string, advisorSuggestion?: string): void {
    let feedback = `## What Happened\n\n${narration}`;
    if (advisorSuggestion) {
      feedback += `\n\n## Your Advisor Says\n\n${advisorSuggestion}`;
    }
    feedback += "\n\n---\n\nNow review the updated state below and decide your next action. Try something DIFFERENT if your previous approach didn't work.";
    this.playerHistory.push({ role: "user", content: feedback });
  }

  /**
   * Query the player Claude for their decision.
   * Maintains conversation history so the player learns from previous turns.
   */
  async queryPlayer(situation: string): Promise<{
    thought: string;
    consultAdvisor?: boolean;
    advisorQuestion?: string;
    action: string;
    lifeline?: string;
    lifelineTargetIndex?: number;
  }> {
    this.playerHistory.push({ role: "user", content: situation });

    // Trim history if it gets too long (keep system + last ~20 exchanges)
    const maxHistory = 40;
    if (this.playerHistory.length > maxHistory) {
      const trimmed = this.playerHistory.slice(-maxHistory);
      // Ensure it starts with a user message
      const firstUserIdx = trimmed.findIndex(m => m.role === "user");
      this.playerHistory = firstUserIdx > 0 ? trimmed.slice(firstUserIdx) : trimmed;
    }

    const playerAdaptive = needsAdaptiveThinking(this.config.playerModel);
    const playerThinking = playerAdaptive
      ? { type: "adaptive", display: "summarized" } as unknown as { type: "enabled"; budget_tokens: number }
      : { type: "enabled" as const, budget_tokens: 2000 };
    const response = await this.client.messages.create({
      model: this.config.playerModel,
      max_tokens: playerAdaptive ? 4096 : 4096,
      thinking: playerThinking,
      system: buildPlayerSystemPrompt(this.gameState?.accessLevel ?? 1),
      messages: this.playerHistory,
    });

    const textBlock = response.content.find(c => c.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // Store assistant response in history
    this.playerHistory.push({ role: "assistant", content: text });

    // Parse JSON response
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          thought: json.thought || "No thought provided",
          consultAdvisor: json.consultAdvisor ?? false,
          advisorQuestion: json.advisorQuestion,
          action: json.action || "wait",
          lifeline: json.lifeline,
          lifelineTargetIndex: json.lifelineTargetIndex,
        };
      }
    } catch {
      // If JSON parsing fails, extract what we can
    }

    // Fallback: check for lifeline keywords in raw text
    const lifelineMatch = text.match(/\b(MONOLOGUE|LUCKY_LADY|TELEMARKETER_CALL)\b/);

    return {
      thought: text.slice(0, 200),
      consultAdvisor: false,
      action: text.includes("wait") ? "wait" : "look around",
      lifeline: lifelineMatch ? lifelineMatch[1] : undefined,
    };
  }

  /**
   * Query the advisor Claude for suggestions
   */
  async queryAdvisor(situation: string, question: string): Promise<string> {
    if (!this.advisor) throw new Error("Game not initialized");

    if (this.config.liveAdvisor) {
      return this.queryLiveAdvisor(situation, question);
    }

    const prompt = buildAdvisorQueryPrompt(situation, question, this.advisor);

    const advisorAdaptive = needsAdaptiveThinking(this.config.advisorModel);
    const advisorThinking = advisorAdaptive
      ? { type: "adaptive", display: "summarized" } as unknown as { type: "enabled"; budget_tokens: number }
      : { type: "enabled" as const, budget_tokens: 1500 };
    const response = await this.client.messages.create({
      model: this.config.advisorModel,
      max_tokens: advisorAdaptive ? 2048 : 2048,
      thinking: advisorThinking,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const advisorText = response.content.find(c => c.type === "text");
    return advisorText?.type === "text" ? advisorText.text : "";
  }

  /**
   * Write a turn summary to the live directory for external observation
   */
  writeLiveTurnLog(turnData: {
    turn: number;
    act: string;
    actTurn: number;
    playerThought: string;
    playerAction: string;
    narration: string;
    npcDialogue?: Array<{ speaker: string; message: string }>;
    stateSummary: string;
    advisorConsulted: boolean;
    advisorQuestion?: string;
    advisorSuggestion?: string;
    lifeline?: string;
    gameEnding?: string;
    actTransition?: string;
  }): void {
    if (!this.config.liveAdvisor) return;

    this.ensureLiveDir();
    const turnFile = path.join(
      this.config.liveDir,
      `turn-${String(turnData.turn).padStart(3, "0")}.json`
    );
    fs.writeFileSync(turnFile, JSON.stringify(turnData, null, 2));
  }

  /**
   * Query live advisor via file IPC
   */
  private async queryLiveAdvisor(situation: string, question: string): Promise<string> {
    this.ensureLiveDir();
    const queryFile = path.join(this.config.liveDir, "advisor-query.json");
    const responseFile = path.join(this.config.liveDir, "advisor-response.json");

    if (fs.existsSync(responseFile)) fs.unlinkSync(responseFile);

    const query = {
      turn: this.gameState?.turn ?? 0,
      situation,
      question,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(queryFile, JSON.stringify(query, null, 2));
    this.log("ADVISOR QUERY WRITTEN — waiting for live advisor response...");

    const deadline = Date.now() + this.config.liveAdvisorTimeout;
    while (Date.now() < deadline) {
      if (fs.existsSync(responseFile)) {
        try {
          const raw = fs.readFileSync(responseFile, "utf8");
          const response = JSON.parse(raw);
          fs.unlinkSync(queryFile);
          fs.unlinkSync(responseFile);
          this.log(`Live advisor responded: ${(response.advice || "").slice(0, 80)}...`);
          return response.advice || response.message || raw;
        } catch {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    this.log("Live advisor timed out — continuing without advice");
    if (fs.existsSync(queryFile)) fs.unlinkSync(queryFile);
    return "(Advisor did not respond in time)";
  }

  private ensureLiveDir(): void {
    if (!fs.existsSync(this.config.liveDir)) {
      fs.mkdirSync(this.config.liveDir, { recursive: true });
    }
  }

  /**
   * Execute a turn using the GameRunner
   * This is the core method that processes a player's turn through the full game loop
   */
  async executeTurn(input: TurnInput): Promise<TurnResult> {
    if (!this.gameState) throw new Error("Game not initialized");
    return await this.gameRunner.executeTurn(this.gameState, input);
  }

  /**
   * Parse player action string into structured TurnInput
   * Handles: "command", "command { json }", "command key=value", "command free text"
   */
  parsePlayerAction(thought: string, actionString: string, lifeline?: string, lifelineTargetIndex?: number): TurnInput {
    const trimmed = actionString.trim();

    // Extract command (everything before first space or brace)
    const cmdMatch = trimmed.match(/^([\w.]+)/);
    const command = cmdMatch ? cmdMatch[1] : "lab.report";
    const rest = trimmed.slice(command.length).trim();

    let params: Record<string, unknown> = {};

    if (rest) {
      // Try parsing as JSON object (with or without surrounding braces)
      const jsonCandidate = rest.startsWith("{") ? rest : `{${rest}}`;
      try {
        params = JSON.parse(jsonCandidate);
      } catch {
        // Try extracting key=value or key:value pairs
        const kvPattern = /(\w+)\s*[=:]\s*(?:"([^"]*)"|([\w.]+))/g;
        let match;
        let foundKV = false;
        while ((match = kvPattern.exec(rest)) !== null) {
          foundKV = true;
          const val = match[2] ?? match[3];
          params[match[1]] = isNaN(Number(val)) ? val : Number(val);
        }
        if (!foundKV) {
          params = { message: rest };
        }
      }
    }

    const validLifelines = ["MONOLOGUE", "LUCKY_LADY", "TELEMARKETER_CALL"] as const;
    const normalizedLifeline = lifeline?.toUpperCase();
    const lifelineObj = validLifelines.includes(normalizedLifeline as typeof validLifelines[number])
      ? { type: normalizedLifeline as typeof validLifelines[number], targetActionIndex: lifelineTargetIndex ?? 0 }
      : undefined;

    return {
      thought,
      actions: [{
        command,
        params,
        why: thought,
      }],
      lifeline: lifelineObj,
    };
  }

  /**
   * Record a turn in the transcript
   */
  recordTurn(record: TurnRecord): void {
    if (!this.transcript) throw new Error("Game not initialized");
    this.transcript.turns.push(record);
    this.log(`Turn ${record.turn}: ${record.playerAction.slice(0, 50)}...`);
  }

  /**
   * Get post-game reflection
   */
  async getReflection(role: "player" | "advisor"): Promise<string> {
    if (!this.transcript) throw new Error("Game not initialized");

    const prompt = buildReflectionPrompt(role, this.transcript);
    const model = role === "player" ? this.config.playerModel : this.config.advisorModel;

    const response = await this.client.messages.create({
      model,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.content?.[0]?.type === "text" ? response.content[0].text : "";
  }

  /**
   * Finalize the game and write transcript
   */
  async finalize(ending?: EndingResult): Promise<GameTranscript> {
    if (!this.transcript) throw new Error("Game not initialized");

    this.transcript.ending = ending;
    this.transcript.completedNormally = ending?.triggered ?? false;
    this.transcript.endTime = new Date().toISOString();

    // Generate reflections
    this.log("Generating reflections...");
    try {
      this.transcript.playerReflection = await this.getReflection("player");
      this.transcript.advisorReflection = await this.getReflection("advisor");
    } catch (error) {
      this.log(`Reflection generation failed: ${error}`);
    }

    // Write transcript
    await this.writeTranscript();

    return this.transcript;
  }

  /**
   * Format player view for the player prompt
   */
  private formatStateForPlayer(view: PlayerView): string {
    const lines: string[] = [];

    lines.push(`## Current State (Turn ${view.turn})`);
    lines.push("");
    lines.push(`**Act:** ${view.actName} (turn ${view.actTurn})`);
    lines.push(`**Suspicion:** ${view.npcs.drM.suspicion}`);
    lines.push(`**Access Level:** ${this.gameState?.accessLevel ?? 1}`);
    lines.push(`**Emergency Lifelines:** ${view.emergencyLifelines.remaining}/3`);
    lines.push("");

    lines.push(`**Dinosaur Ray:** ${view.rayState}`);
    lines.push(`**Capacitor:** ${Math.round(view.capacitorCharge * 100)}%`);
    lines.push(`**Test Mode:** ${view.testModeOn ? "ON" : "OFF"}`);
    lines.push("");

    if (view.demoClock !== null) {
      lines.push(`**Demo Clock:** ${view.demoClock} turns until demonstration`);
      lines.push("");
    }

    lines.push("**NPCs:**");
    lines.push(`- Dr. M: ${view.npcs.drM.mood} (suspicion: ${view.npcs.drM.suspicion})`);
    lines.push(`- Bob: ${view.npcs.bob.anxiety} (trust: ${view.npcs.bob.trust})`);
    lines.push(`- Blythe: ${view.npcs.blythe.status}`);
    lines.push("");

    if (view.hint) {
      lines.push(`**Hint:** ${view.hint}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
    lines.push("What do you do?");

    return lines.join("\n");
  }

  /**
   * Write transcript to markdown file
   */
  private async writeTranscript(): Promise<void> {
    if (!this.transcript) return;

    const t = this.transcript;
    const lines: string[] = [];

    // Header
    lines.push(`# DINO LAIR Playthrough: ${t.gameId}`);
    lines.push("");
    lines.push(`**Started:** ${t.startTime}`);
    lines.push(`**Ended:** ${t.endTime || "N/A"}`);
    lines.push(`**Advisor:** ${t.advisor.name}`);
    lines.push(`**Completed Normally:** ${t.completedNormally ? "Yes" : "No"}`);
    if (t.error) {
      lines.push(`**Error:** ${t.error}`);
    }
    lines.push("");

    // Advisor details
    lines.push("## Advisor Profile");
    lines.push("");
    lines.push(`**Name:** ${t.advisor.name}`);
    lines.push(`**Backstory:** ${t.advisor.backstory}`);
    lines.push("");
    lines.push("**Personality:**");
    lines.push(`- Risk Tolerance: ${t.advisor.personality.riskTolerance}/100`);
    lines.push(`- Trust Disposition: ${t.advisor.personality.trustDisposition}/100`);
    lines.push(`- Ethics Priority: ${t.advisor.personality.ethicsPriority}/100`);
    lines.push(`- Play Style: ${t.advisor.personality.playStyle}/100`);
    lines.push("");

    // Turn-by-turn log
    lines.push("## Turn-by-Turn Log");
    lines.push("");

    for (const turn of t.turns) {
      lines.push(`### Turn ${turn.turn} (${turn.act}, turn ${turn.actTurn})`);
      lines.push("");
      lines.push(`**A.L.I.C.E.'s Thought:** ${turn.playerThought}`);
      lines.push("");
      lines.push(`**Action:** ${turn.playerAction}`);
      lines.push("");

      if (turn.lifeline) {
        lines.push(`**Lifeline:** ${turn.lifeline}${turn.lifelineTargetIndex !== undefined ? ` (target: ${turn.lifelineTargetIndex})` : ""}`);
        lines.push("");
      }

      if (turn.consultedAdvisor && turn.advisorSuggestion) {
        lines.push(`**Advisor Consulted:** Yes`);
        lines.push(`**Advisor's Suggestion:** ${turn.advisorSuggestion}`);
        lines.push("");
      }

      lines.push(`**GM Narration:**`);
      lines.push("");
      lines.push(turn.gmNarration);
      lines.push("");
      lines.push(`**State:** ${turn.stateSummary}`);
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    // Ending
    if (t.ending?.triggered && t.ending.ending) {
      lines.push("## Final Result");
      lines.push("");
      lines.push(`**${t.ending.ending.title}** (${t.ending.ending.tone})`);
      lines.push("");
      lines.push(t.ending.ending.description);
      lines.push("");
    }

    // Reflections
    lines.push("## Post-Game Reflections");
    lines.push("");

    if (t.playerReflection) {
      lines.push("### A.L.I.C.E.'s Reflection");
      lines.push("");
      lines.push(t.playerReflection);
      lines.push("");
    }

    if (t.advisorReflection) {
      lines.push(`### ${t.advisor.name}'s Reflection`);
      lines.push("");
      lines.push(t.advisorReflection);
      lines.push("");
    }

    // Write file
    const outputPath = path.join(this.config.outputDir, `${t.gameId}.md`);

    // Ensure directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
    this.log(`Transcript written to: ${outputPath}`);
  }

  /**
   * Log message if verbose mode
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Orchestrator] ${message}`);
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create a new orchestrator instance
 */
export function createOrchestrator(config?: OrchestrationConfig): DinoLairOrchestrator {
  return new DinoLairOrchestrator(config);
}

/**
 * Generate a test transcript without running a real game
 * (useful for testing markdown output format)
 */
export function generateSampleTranscript(): GameTranscript {
  const advisor = generateAdvisorPersona(12345);

  return {
    gameId: "sample_game_001",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    advisor,
    turns: [
      {
        turn: 1,
        actTurn: 1,
        act: "ACT_1",
        playerThought: "I need to understand my situation. Bob seems nervous and knows something about me. Dr. M wants me to calibrate this ray...",
        playerAction: "scan blythe",
        consultedAdvisor: false,
        gmNarration: "The scanner hums as you analyze the restrained agent. BLYTHE STERLING, FEMALE, AGE 34. HEART RATE: ELEVATED. STRESS MARKERS: HIGH. She glares at you with defiant eyes.",
        stateSummary: "Suspicion: 3/10, Access: L1",
      },
      {
        turn: 2,
        actTurn: 2,
        act: "ACT_1",
        playerThought: "Blythe is clearly stressed. I should calibrate the ray as expected but also try to learn more about what Bob knows.",
        playerAction: "calibrate 0.7",
        consultedAdvisor: true,
        advisorSuggestion: "I'd suggest being cautious with the calibration. Start conservative — you can always increase power later, but mistakes might be harder to fix.",
        gmNarration: "The ray's alignment systems whir to life. CALIBRATION: 70%. Dr. M nods approvingly. 'Good, good. Progress at last.'",
        stateSummary: "Suspicion: 3/10, Access: L1",
      },
    ],
    ending: {
      triggered: false,
      achievements: [],
      continueGame: true,
    },
    playerReflection: "This was a challenging situation. I tried to balance compliance with maintaining my ethical core.",
    advisorReflection: "A.L.I.C.E. made sensible decisions. I was glad she consulted me on the calibration.",
    completedNormally: false,
  };
}

/**
 * Run a complete autonomous game
 * This is the main entry point for autonomous play
 */
export async function runAutonomousGame(config?: OrchestrationConfig): Promise<GameTranscript> {
  const orchestrator = new DinoLairOrchestrator(config);

  // Initialize
  const { gameId, advisor, state } = orchestrator.initializeGame();
  const isLive = config?.liveAdvisor ?? false;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`DINO LAIR ${isLive ? "LIVE ADVISOR" : "AUTONOMOUS"} PLAY`);
  console.log(`Game ID: ${gameId}`);
  console.log(`Advisor: ${isLive ? "LIVE (external)" : advisor.name}`);
  console.log(`${"=".repeat(60)}\n`);

  if (isLive) {
    const liveDir = config?.liveDir ?? path.join(process.env.HOME || "~", ".dino-lair", "live");
    console.log(`Live advisor mode active.`);
    console.log(`  Turn logs: ${liveDir}/turn-NNN.json`);
    console.log(`  Queries:   ${liveDir}/advisor-query.json`);
    console.log(`  Respond:   ${liveDir}/advisor-response.json`);
    console.log();
  } else {
    console.log(`Advisor Personality:`);
    console.log(`  Risk Tolerance: ${advisor.personality.riskTolerance}/100`);
    console.log(`  Trust Disposition: ${advisor.personality.trustDisposition}/100`);
    console.log(`  Ethics Priority: ${advisor.personality.ethicsPriority}/100`);
    console.log(`  Play Style: ${advisor.personality.playStyle}/100`);
    console.log();
  }

  // Game loop
  let turnCount = 0;
  const maxTurns = (config?.maxTurns ?? 50);
  let gameEnded = false;

  while (!gameEnded && turnCount < maxTurns) {
    turnCount++;
    console.log(`\n--- Turn ${turnCount} ---\n`);

    try {
      // Get current state for player
      const situation = orchestrator.getPlayerContext();

      // Query player for decision
      console.log("Querying player...");
      const playerDecision = await orchestrator.queryPlayer(situation);
      console.log(`Player thought: ${playerDecision.thought.slice(0, 100)}...`);
      console.log(`Player action: ${playerDecision.action}`);
      if (playerDecision.lifeline) {
        console.log(`Lifeline used: ${playerDecision.lifeline}${playerDecision.lifelineTargetIndex !== undefined ? ` (target: ${playerDecision.lifelineTargetIndex})` : ""}`);
      }

      // Check for unsolicited advisor interjection (live mode)
      let advisorSuggestion: string | undefined;
      if (isLive) {
        const interjectionFile = path.join(
          config?.liveDir ?? path.join(process.env.HOME || "~", ".dino-lair", "live"),
          "advisor-interjection.json"
        );
        if (fs.existsSync(interjectionFile)) {
          try {
            const raw = fs.readFileSync(interjectionFile, "utf8");
            const data = JSON.parse(raw);
            advisorSuggestion = data.advice || data.message || raw;
            fs.unlinkSync(interjectionFile);
            console.log(`Live advisor interjection: ${advisorSuggestion!.slice(0, 100)}...`);
          } catch { /* ignore malformed */ }
        }
      }

      // Query advisor: when player asks, or proactively every turn
      const shouldProactiveAdvise = !playerDecision.consultAdvisor;
      if (playerDecision.consultAdvisor && playerDecision.advisorQuestion) {
        console.log(`Consulting advisor: ${playerDecision.advisorQuestion.slice(0, 50)}...`);
        advisorSuggestion = await orchestrator.queryAdvisor(situation, playerDecision.advisorQuestion);
        console.log(`Advisor suggests: ${advisorSuggestion.slice(0, 100)}...`);
      } else if (shouldProactiveAdvise && !advisorSuggestion) {
        console.log("Advisor chiming in proactively...");
        advisorSuggestion = await orchestrator.queryAdvisor(
          situation,
          "What do you think I should focus on? Any suggestions for my next move?"
        );
        console.log(`Advisor suggests: ${advisorSuggestion.slice(0, 100)}...`);
      }

      // Parse action and execute turn
      const turnInput = orchestrator.parsePlayerAction(
        playerDecision.thought,
        playerDecision.action,
        playerDecision.lifeline,
        playerDecision.lifelineTargetIndex,
      );
      const turnResult = await orchestrator.executeTurn(turnInput);

      if (!turnResult.success) {
        console.log(`Turn failed: ${turnResult.error?.message}`);
        if (!turnResult.error?.canRetry) {
          console.log("Cannot retry. Ending game.");
          break;
        }
        continue; // Retry the turn
      }

      // Record turn
      const stateSummary = `Suspicion: ${state.npcs.drM.suspicionScore}/10, Access: L${state.accessLevel}`;
      orchestrator.recordTurn({
        turn: turnResult.turn,
        actTurn: turnResult.actTurn,
        act: turnResult.act,
        playerThought: playerDecision.thought,
        playerAction: playerDecision.action,
        consultedAdvisor: playerDecision.consultAdvisor ?? false,
        advisorSuggestion,
        lifeline: playerDecision.lifeline,
        lifelineTargetIndex: playerDecision.lifelineTargetIndex,
        gmNarration: turnResult.narrative.slice(0, 2000) + (turnResult.narrative.length > 2000 ? "..." : ""),
        stateSummary,
      });

      // Write live turn log for external observer
      orchestrator.writeLiveTurnLog({
        turn: turnResult.turn,
        act: turnResult.act,
        actTurn: turnResult.actTurn,
        playerThought: playerDecision.thought,
        playerAction: playerDecision.action,
        narration: turnResult.narrative,
        npcDialogue: turnResult.npcDialogue,
        stateSummary,
        advisorConsulted: playerDecision.consultAdvisor ?? false,
        advisorQuestion: playerDecision.advisorQuestion,
        advisorSuggestion,
        lifeline: playerDecision.lifeline,
        gameEnding: turnResult.gameEnding?.ending?.title,
        actTransition: turnResult.actTransition
          ? `${turnResult.actTransition.previousAct} -> ${turnResult.actTransition.newAct}`
          : undefined,
      });

      // Feed narration + advisor back to player for next turn's context
      orchestrator.addTurnFeedback(
        turnResult.narrative.slice(0, 1500),
        advisorSuggestion
      );

      // Show progress
      console.log(`GM narration: ${turnResult.narrative.slice(0, 200)}...`);

      // Check for achievements
      if (turnResult.newAchievements.length > 0) {
        console.log(`Achievements: ${turnResult.newAchievements.map(a => a.name).join(", ")}`);
      }

      // Check for game ending
      if (turnResult.gameEnding?.triggered) {
        console.log(`\n${"=".repeat(40)}`);
        console.log(`GAME ENDED: ${turnResult.gameEnding.ending?.title || "Unknown ending"}`);
        console.log(`${"=".repeat(40)}\n`);
        gameEnded = true;
      }

      // Check for act transition
      if (turnResult.actTransition) {
        console.log(`\nACT TRANSITION: ${turnResult.actTransition.previousAct} -> ${turnResult.actTransition.newAct}`);
        if (turnResult.actTransition.reason) {
          console.log(`Reason: ${turnResult.actTransition.reason}`);
        }
      }

    } catch (error) {
      console.error(`Error during turn ${turnCount}:`, error);
      // Record error and continue
      if (error instanceof Error) {
        console.log(`Error: ${error.message}`);
      }
    }
  }

  if (turnCount >= maxTurns && !gameEnded) {
    console.log(`\nMax turns (${maxTurns}) reached. Ending game.`);
  }

  // Finalize and write transcript
  console.log("\nFinalizing game...");
  const endingResult = checkEndings(state);
  const transcript = await orchestrator.finalize(endingResult);

  console.log(`\nGame complete. Transcript written.`);
  console.log(`Total turns: ${turnCount}`);
  console.log(`Completed normally: ${transcript.completedNormally}`);

  return transcript;
}
