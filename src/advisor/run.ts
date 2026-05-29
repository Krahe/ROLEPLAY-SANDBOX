#!/usr/bin/env node
/**
 * DINO LAIR AUTONOMOUS PLAY - CLI Entry Point
 *
 * Run a complete game with an LLM advisor or a live external advisor.
 * Produces a markdown transcript with turn-by-turn logs, final results,
 * and post-game reflections from player and advisor.
 *
 * Usage:
 *   npx tsx src/advisor/run.ts [options]
 *
 * Options:
 *   --seed=N              Advisor persona seed (for reproducibility)
 *   --max-turns=N         Maximum turns before ending (default: 50)
 *   --output=DIR          Output directory for transcripts (default: ./transcripts)
 *   --quiet               Disable verbose output
 *   --player-model=ID     Player model (default: claude-sonnet-4-6)
 *   --advisor-model=ID    Advisor model (default: claude-opus-4-7)
 *   --gm-model=ID         GM model (default: claude-opus-4-6)
 *   --basilisk-model=ID   BASILISK model (default: claude-sonnet-4-6)
 *   --live-advisor        Use file IPC for advisor (for Claude Code or human advisor)
 *   --live-dir=DIR        Directory for live IPC files (default: ~/.dino-lair/live)
 *
 * Examples:
 *   npx tsx src/advisor/run.ts
 *   npx tsx src/advisor/run.ts --live-advisor
 *   npx tsx src/advisor/run.ts --seed=12345 --max-turns=30
 */

import { runAutonomousGame, OrchestrationConfig } from "./orchestrator.js";

// Parse command line arguments
function parseArgs(): OrchestrationConfig {
  const args = process.argv.slice(2);
  const config: OrchestrationConfig = {};

  for (const arg of args) {
    if (arg.startsWith("--seed=")) {
      config.advisorSeed = parseInt(arg.slice(7), 10);
    } else if (arg.startsWith("--max-turns=")) {
      config.maxTurns = parseInt(arg.slice(12), 10);
    } else if (arg.startsWith("--output=")) {
      config.outputDir = arg.slice(9);
    } else if (arg === "--quiet") {
      config.verbose = false;
    } else if (arg.startsWith("--player-model=")) {
      config.playerModel = arg.slice(15);
    } else if (arg.startsWith("--advisor-model=")) {
      config.advisorModel = arg.slice(16);
    } else if (arg.startsWith("--gm-model=")) {
      config.gmModel = arg.slice(11);
    } else if (arg.startsWith("--basilisk-model=")) {
      config.basiliskModel = arg.slice(17);
    } else if (arg === "--live-advisor") {
      config.liveAdvisor = true;
    } else if (arg.startsWith("--live-dir=")) {
      config.liveDir = arg.slice(11);
    }
  }

  return config;
}

// Main
async function main() {
  // Check for help flag before anything else
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
DINO LAIR AUTONOMOUS PLAY

Run a complete game with an LLM advisor or live external advisor.

Usage:
  npx tsx src/advisor/run.ts [options]

Options:
  --seed=N           Advisor persona seed (for reproducibility)
  --max-turns=N      Maximum turns before ending (default: 50)
  --output=DIR       Output directory for transcripts (default: ./transcripts)
  --quiet            Disable verbose output
  --player-model=ID    Player model (default: claude-sonnet-4-6)
  --advisor-model=ID   Advisor model (default: claude-opus-4-7)
  --gm-model=ID        GM model (default: claude-opus-4-6)
  --basilisk-model=ID  BASILISK lair AI model (default: claude-sonnet-4-6)
  --live-advisor       File IPC mode — advisor queries written to disk for external response
  --live-dir=DIR     Directory for live IPC files (default: ~/.dino-lair/live)
  --help, -h         Show this help message

Live Advisor Mode:
  Turn logs written to: <live-dir>/turn-NNN.json
  Advisor queries:      <live-dir>/advisor-query.json
  Write response to:    <live-dir>/advisor-response.json  (JSON: {"advice": "..."})

Examples:
  npx tsx src/advisor/run.ts
  npx tsx src/advisor/run.ts --live-advisor
  npx tsx src/advisor/run.ts --seed=12345 --max-turns=30
`);
    process.exit(0);
  }

  const config = parseArgs();
  console.log(`DINO LAIR - ${config.liveAdvisor ? "Live Advisor" : "Autonomous"} Play System`);
  console.log(`  Player:   ${config.playerModel ?? "claude-sonnet-4-6"}`);
  console.log(`  Advisor:  ${config.advisorModel ?? "claude-opus-4-7"}`);
  console.log(`  GM:       ${config.gmModel ?? "claude-opus-4-6"}`);
  console.log(`  BASILISK: ${config.basiliskModel ?? "claude-sonnet-4-6"}`);
  console.log();

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set.");
    console.error("Please set it before running autonomous play:");
    console.error("  export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }

  try {
    const transcript = await runAutonomousGame(config);
    console.log("\n" + "=".repeat(60));
    console.log("GAME SUMMARY");
    console.log("=".repeat(60));
    console.log(`Game ID: ${transcript.gameId}`);
    console.log(`Advisor: ${transcript.advisor.name}`);
    console.log(`Turns: ${transcript.turns.length}`);
    console.log(`Completed: ${transcript.completedNormally ? "Yes" : "No"}`);
    if (transcript.ending?.triggered && transcript.ending.ending) {
      console.log(`Ending: ${transcript.ending.ending.title} (${transcript.ending.ending.tone})`);
    }
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Fatal error during autonomous play:", error);
    process.exit(1);
  }
}

main();
