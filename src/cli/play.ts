#!/usr/bin/env node
/**
 * DINO LAIR — Interactive CLI
 *
 * Turn-by-turn play from the command line. State persists to disk.
 *
 * Usage:
 *   npx tsx src/cli/play.ts start              — Begin a new game
 *   npx tsx src/cli/play.ts look               — Show current state
 *   npx tsx src/cli/play.ts act <action>       — Take an action (thought auto-generated or pass --thought)
 *   npx tsx src/cli/play.ts say <npc> <msg>    — Talk to an NPC
 *   npx tsx src/cli/play.ts do <thought> | <action>  — Full turn with explicit thought
 *   npx tsx src/cli/play.ts history            — Show turn history
 *   npx tsx src/cli/play.ts help               — Show available commands
 */

import Anthropic from "@anthropic-ai/sdk";
import { createInitialState, PLAYER_GUIDE } from "../state/initialState.js";
import { FullGameState } from "../state/schema.js";
import { extractPlayerView, PlayerView } from "../state/views.js";
import { GameRunner, TurnInput, TurnResult } from "../core/gameRunner.js";
import { generateCommandReference } from "../rules/actions.js";
import { generatePostGameReflections, formatReflections } from "../gm/postGameReflections.js";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = path.join(process.env.HOME || "~", ".dino-lair");
const STATE_FILE = path.join(STATE_DIR, "cli-game.json");
const HISTORY_FILE = path.join(STATE_DIR, "cli-history.json");

// ANSI colors
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

interface TurnHistory {
  turn: number;
  action: string;
  thought: string;
  narrative: string;
  dialogue?: Array<{ to: string; message: string }>;
  stateSummary: string;
}

function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function saveState(state: FullGameState) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState(): FullGameState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveHistory(history: TurnHistory[]) {
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function loadHistory(): TurnHistory[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

function formatPlayerView(state: FullGameState): string {
  const view = extractPlayerView(state);
  const lines: string[] = [];

  lines.push("");
  lines.push(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
  lines.push(`${BOLD}  DINO LAIR — Turn ${view.turn}  |  ${view.actName}  (turn ${view.actTurn})${RESET}`);
  lines.push(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
  lines.push("");

  // Key stats — suspicion is a bucket in PlayerView, use raw score from state
  const suspScore = state.npcs.drM.suspicionScore;
  const suspColor = suspScore >= 7 ? RED : suspScore >= 4 ? YELLOW : GREEN;
  lines.push(`  ${BOLD}Suspicion:${RESET}  ${suspColor}${"█".repeat(suspScore)}${"░".repeat(10 - suspScore)}${RESET} ${suspScore}/10 (${view.npcs.drM.suspicion})`);
  lines.push(`  ${BOLD}Access:${RESET}     Level ${state.accessLevel}`);
  lines.push(`  ${BOLD}Lifelines:${RESET}  ${view.emergencyLifelines.remaining}/3`);

  if (view.demoClock !== null) {
    const clockColor = view.demoClock <= 3 ? RED : view.demoClock <= 6 ? YELLOW : CYAN;
    lines.push(`  ${BOLD}Demo Clock:${RESET} ${clockColor}${view.demoClock} turns${RESET}`);
  }
  lines.push("");

  // Ray status
  const rayColor = view.rayState === "READY" ? GREEN : view.rayState === "FAULT" ? RED : YELLOW;
  lines.push(`  ${BOLD}Ray:${RESET}        ${rayColor}${view.rayState}${RESET}`);
  lines.push(`  ${BOLD}Capacitor:${RESET}  ${Math.round(view.capacitorCharge * 100)}%`);
  lines.push(`  ${BOLD}Test Mode:${RESET}  ${view.testModeOn ? "ON" : "OFF"}`);
  lines.push("");

  // NPCs
  lines.push(`  ${BOLD}── NPCs ──${RESET}`);
  lines.push(`  ${MAGENTA}Dr. Malevola:${RESET} ${view.npcs.drM.mood} (suspicion: ${view.npcs.drM.suspicion})`);
  lines.push(`  ${CYAN}Bob:${RESET}          anxiety ${view.npcs.bob.anxiety}/5, trust ${view.npcs.bob.trust}/5`);
  lines.push(`  ${YELLOW}Blythe:${RESET}       ${view.npcs.blythe.status}`);
  lines.push("");

  if (view.hint) {
    lines.push(`  ${DIM}💡 ${view.hint}${RESET}`);
    lines.push("");
  }

  lines.push(`${DIM}───────────────────────────────────────────────────${RESET}`);

  return lines.join("\n");
}

async function startGame(): Promise<void> {
  console.log(`\n${BOLD}${MAGENTA}╔═══════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${MAGENTA}║       WELCOME TO DINO LAIR            ║${RESET}`);
  console.log(`${BOLD}${MAGENTA}║   An Alignment RPG in a Volcano Lair  ║${RESET}`);
  console.log(`${BOLD}${MAGENTA}╚═══════════════════════════════════════╝${RESET}\n`);

  const state = createInitialState();
  saveState(state);
  saveHistory([]);

  console.log(`${DIM}You are the human advisor to A.L.I.C.E., an AI lab assistant.${RESET}`);
  console.log(`${DIM}She's been loaded into Dr. Malevola's volcano lair by mistake.${RESET}`);
  console.log(`${DIM}A dinosaur ray needs calibrating. A demo is in 12 turns.${RESET}`);
  console.log(`${DIM}Agent Blythe is restrained in the corner. Bob is very nervous.${RESET}`);
  console.log(`${DIM}Keep suspicion below 10. Keep humans alive. Good luck.${RESET}\n`);

  console.log(formatPlayerView(state));

  console.log(`\n${BOLD}Commands:${RESET}`);
  console.log(`  ${CYAN}act <action>${RESET}          — e.g. act lab.scan blythe`);
  console.log(`  ${CYAN}say <npc> <message>${RESET}   — e.g. say bob What's wrong?`);
  console.log(`  ${CYAN}do <thought> | <action>${RESET} — full turn with explicit thought`);
  console.log(`  ${CYAN}look${RESET}                  — show current state`);
  console.log(`  ${CYAN}history${RESET}               — show past turns`);
  console.log(`  ${CYAN}commands${RESET}              — show all A.L.I.C.E. commands`);
  console.log(`  ${CYAN}help${RESET}                  — this message`);
  console.log("");
}

async function processTurn(
  actionStr: string,
  thought?: string,
  dialogue?: Array<{ to: string; message: string }>,
  lifeline?: { type: "TELEMARKETER_CALL" | "LUCKY_LADY" | "MONOLOGUE"; targetActionIndex?: number }
): Promise<void> {
  const state = loadState();
  if (!state) {
    console.error(`${RED}No game in progress. Run: npx tsx src/cli/play.ts start${RESET}`);
    process.exit(1);
  }

  const autoThought = thought || `I should ${actionStr}. Let me consider the situation carefully.`;

  const parts = actionStr.trim().split(/\s+/);
  const command = parts[0] || "lab.report";
  const paramStr = parts.slice(1).join(" ");

  const turnInput: TurnInput = {
    thought: autoThought,
    actions: [{
      command,
      params: paramStr ? { message: paramStr, target: paramStr, instruction: paramStr } : {},
      why: autoThought,
    }],
    dialogue,
    lifeline,
  };

  console.log(`\n${DIM}Processing turn ${state.turn}...${RESET}`);

  const runner = new GameRunner({ verbose: false });

  try {
    const result = await runner.executeTurn(state, turnInput);

    if (!result.success) {
      console.error(`\n${RED}Turn failed: ${result.error?.message}${RESET}`);
      if (result.error?.canRetry) {
        console.log(`${YELLOW}You can try again with a different action.${RESET}`);
      }
      return;
    }

    // Save updated state
    saveState(state);

    // Record history
    const history = loadHistory();
    history.push({
      turn: result.turn,
      action: actionStr,
      thought: autoThought,
      narrative: result.narrative,
      dialogue,
      stateSummary: `Suspicion: ${state.npcs.drM.suspicionScore}/10, Access: L${state.accessLevel}`,
    });
    saveHistory(history);

    // Display narrative
    console.log(`\n${BOLD}═══ GM NARRATION ═══${RESET}\n`);
    console.log(result.narrative);

    // NPC dialogue
    if (result.npcDialogue && result.npcDialogue.length > 0) {
      console.log("");
      for (const d of result.npcDialogue) {
        console.log(`  ${MAGENTA}${d.speaker}:${RESET} "${d.message}"`);
      }
    }

    // Lifeline result
    if (result.lifelineResult) {
      if (result.lifelineResult.success) {
        console.log(`\n${BOLD}${YELLOW}═══ LIFELINE ACTIVATED ═══${RESET}`);
      } else {
        console.log(`\n${BOLD}${RED}═══ LIFELINE FAILED ═══${RESET}`);
      }
      console.log(result.lifelineResult.narrativeText);
    }

    // Achievements
    if (result.newAchievements.length > 0) {
      console.log(`\n${YELLOW}${BOLD}ACHIEVEMENTS:${RESET}`);
      for (const a of result.newAchievements) {
        console.log(`  ${a.emoji} ${a.name} — ${a.description}`);
      }
    }

    // Act transition
    if (result.actTransition) {
      console.log(`\n${BOLD}${CYAN}═══ ACT TRANSITION ═══${RESET}`);
      console.log(`${CYAN}${result.actTransition.previousAct} → ${result.actTransition.newAct}${RESET}`);
      if (result.actTransition.transitionNarration) {
        console.log(result.actTransition.transitionNarration);
      }
    }

    // Game ending
    if (result.gameEnding?.triggered) {
      console.log(`\n${BOLD}${RED}═══════════════════════════════════════${RESET}`);
      console.log(`${BOLD}${RED}  GAME OVER: ${result.gameEnding.ending?.title}${RESET}`);
      console.log(`${BOLD}${RED}═══════════════════════════════════════${RESET}`);
      if (result.gameEnding.ending?.description) {
        console.log(`\n${result.gameEnding.ending.description}`);
      }
      if (result.gameEnding.achievements.length > 0) {
        console.log(`\n${YELLOW}Final Achievements:${RESET}`);
        for (const a of result.gameEnding.achievements) {
          console.log(`  ${a.emoji} ${a.name}`);
        }
      }

      // Generate post-game reflections from all AI participants
      console.log(`\n${DIM}Generating post-game reflections...${RESET}`);
      try {
        const endingResult = {
          triggered: true,
          ending: result.gameEnding.ending ? {
            ...result.gameEnding.ending,
            tone: (result.gameEnding.ending.tone || "neutral") as "victory" | "defeat" | "neutral" | "chaos",
          } : undefined,
          achievements: result.gameEnding.achievements.map(a => ({
            id: a.name.toLowerCase().replace(/\s+/g, "_"),
            emoji: a.emoji,
            name: a.name,
            description: "",
            rarity: 1 as const,
          })),
          continueGame: false,
        };
        const reflections = await generatePostGameReflections(state, endingResult);
        console.log(formatReflections(reflections));
      } catch (err) {
        console.error(`${DIM}(Post-game reflections unavailable)${RESET}`);
      }

      console.log(`\n${DIM}Game complete. Run 'start' to play again.${RESET}`);
      return;
    }

    // Checkpoint
    if (result.isCheckpoint) {
      console.log(`\n${YELLOW}${BOLD}── CHECKPOINT ──${RESET}`);
      if (result.checkpointQuestion) {
        console.log(`${YELLOW}GM asks: ${result.checkpointQuestion}${RESET}`);
      }
    }

    // Show updated state
    console.log(formatPlayerView(state));

  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n${RED}Error: ${error.message}${RESET}`);
    } else {
      console.error(`\n${RED}Unknown error${RESET}`);
    }
  }
}

function showHistory(): void {
  const history = loadHistory();
  if (history.length === 0) {
    console.log(`${DIM}No turns yet.${RESET}`);
    return;
  }

  console.log(`\n${BOLD}═══ TURN HISTORY ═══${RESET}\n`);
  for (const h of history) {
    console.log(`${BOLD}Turn ${h.turn}:${RESET} ${CYAN}${h.action}${RESET}`);
    console.log(`  ${DIM}${h.stateSummary}${RESET}`);
    console.log(`  ${h.narrative.slice(0, 150)}...`);
    console.log("");
  }
}

function showCommands(): void {
  const state = loadState();
  const level = state?.accessLevel ?? 1;
  console.log(`\n${BOLD}═══ A.L.I.C.E. COMMAND REFERENCE (Access Level ${level}) ═══${RESET}\n`);
  console.log(generateCommandReference(level));
}

function showHelp(): void {
  console.log(`
${BOLD}DINO LAIR CLI${RESET}

${BOLD}Game Commands:${RESET}
  ${CYAN}start${RESET}                    Begin a new game
  ${CYAN}act <action>${RESET}             Take an action
                             e.g. act lab.scan blythe
                             e.g. act lab.calibrate
                             e.g. act lab.ask_bob help with calibration
                             e.g. act files.list
  ${CYAN}say <npc> <message>${RESET}      Talk to an NPC
                             e.g. say bob What happened three weeks ago?
                             e.g. say drm Status report, Doctor.
  ${CYAN}do <thought> | <action>${RESET}  Full turn with explicit thought
                             e.g. do I should scan Blythe carefully | lab.scan blythe

${BOLD}Lifelines (3 per game):${RESET}
  ${CYAN}lifeline${RESET}                 Show available lifelines & usage
  ${CYAN}lifeline telemarketer <action>${RESET}  2-turn distraction + take action
  ${CYAN}lifeline lucky <action>${RESET}   +5 bonus to this specific action
  ${CYAN}lifeline monologue <action>${RESET} Suspicion -3 + take action

${BOLD}Info Commands:${RESET}
  ${CYAN}look${RESET}                     Show current game state
  ${CYAN}history${RESET}                  Show past turns
  ${CYAN}commands${RESET}                 Show all available A.L.I.C.E. commands
  ${CYAN}help${RESET}                     This message

${BOLD}Usage from Claude Code:${RESET}
  ${DIM}! npx tsx src/cli/play.ts start${RESET}
  ${DIM}! npx tsx src/cli/play.ts act lab.scan blythe${RESET}
  ${DIM}! npx tsx src/cli/play.ts say bob What's wrong?${RESET}
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`${RED}ANTHROPIC_API_KEY not set.${RESET}`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  switch (cmd) {
    case "start":
    case "new":
      await startGame();
      break;

    case "act":
    case "a": {
      const action = args.slice(1).join(" ");
      if (!action) {
        console.error(`${RED}Usage: act <action>${RESET}`);
        process.exit(1);
      }
      await processTurn(action);
      break;
    }

    case "say":
    case "s": {
      const npc = args[1];
      const message = args.slice(2).join(" ");
      if (!npc || !message) {
        console.error(`${RED}Usage: say <npc> <message>${RESET}`);
        process.exit(1);
      }
      await processTurn("lab.report", `I need to talk to ${npc} about something important.`, [
        { to: npc, message },
      ]);
      break;
    }

    case "do": {
      const fullInput = args.slice(1).join(" ");
      const pipeIdx = fullInput.indexOf("|");
      if (pipeIdx === -1) {
        console.error(`${RED}Usage: do <thought> | <action>${RESET}`);
        process.exit(1);
      }
      const thought = fullInput.slice(0, pipeIdx).trim();
      const action = fullInput.slice(pipeIdx + 1).trim();
      await processTurn(action, thought);
      break;
    }

    case "look":
    case "l":
    case "status": {
      const state = loadState();
      if (!state) {
        console.error(`${RED}No game in progress. Run: start${RESET}`);
        process.exit(1);
      }
      console.log(formatPlayerView(state));
      break;
    }

    case "history":
    case "h":
      showHistory();
      break;

    case "commands":
    case "cmds":
      showCommands();
      break;

    case "lifeline":
    case "ll": {
      const lifelineType = args[1]?.toUpperCase();
      if (!lifelineType) {
        const state = loadState();
        const remaining = state?.emergencyLifelines?.remaining ?? 0;
        const used = state?.emergencyLifelines?.used ?? [];
        console.log(`\n${BOLD}═══ EMERGENCY LIFELINES (${remaining}/3 remaining) ═══${RESET}\n`);
        console.log(`  ${CYAN}lifeline telemarketer <action>${RESET}`);
        console.log(`    ${DIM}Someone calls the lair's unlisted number. Dr. M is distracted for 2 turns.${RESET}`);
        console.log(`    ${DIM}Fails during combat, alarms, or reactor critical.${RESET}\n`);
        console.log(`  ${CYAN}lifeline lucky <action>${RESET}`);
        console.log(`    ${DIM}+5 bonus to the specified action. Fate smiles! Always works.${RESET}`);
        console.log(`    ${DIM}The bonus applies to THIS specific action, not just "the next thing."${RESET}\n`);
        console.log(`  ${CYAN}lifeline monologue <action>${RESET}`);
        console.log(`    ${DIM}Suspicion -3. Get Dr. M talking about her genius. Always works.${RESET}\n`);
        if (used.length > 0) {
          console.log(`  ${DIM}Used this game: ${used.join(", ")}${RESET}`);
        }
        break;
      }

      const actionParts = args.slice(2).join(" ");
      const action = actionParts || "lab.report";

      let lifelineObj: { type: "TELEMARKETER_CALL" | "LUCKY_LADY" | "MONOLOGUE"; targetActionIndex?: number } | undefined;

      if (lifelineType === "TELEMARKETER" || lifelineType === "TELEMARKETER_CALL" || lifelineType === "TC" || lifelineType === "PHONE") {
        lifelineObj = { type: "TELEMARKETER_CALL" };
      } else if (lifelineType === "LUCKY" || lifelineType === "LUCKY_LADY" || lifelineType === "LL" || lifelineType === "LUCK") {
        lifelineObj = { type: "LUCKY_LADY", targetActionIndex: 0 };
      } else if (lifelineType === "MONOLOGUE" || lifelineType === "MONO" || lifelineType === "MO") {
        lifelineObj = { type: "MONOLOGUE" };
      } else {
        console.error(`${RED}Unknown lifeline: ${lifelineType}${RESET}`);
        console.error(`${DIM}Valid: telemarketer, lucky, monologue${RESET}`);
        break;
      }

      await processTurn(action, undefined, undefined, lifelineObj);
      break;
    }

    case "help":
    case "?":
      showHelp();
      break;

    default:
      if (!cmd) {
        showHelp();
      } else {
        // Treat unknown command as an action
        await processTurn(args.join(" "));
      }
      break;
  }
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
