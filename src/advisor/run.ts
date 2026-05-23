#!/usr/bin/env node
/**
 * DINO LAIR AUTONOMOUS PLAY - CLI Entry Point
 *
 * Run a complete game with an LLM advisor instead of a human.
 * Produces a markdown transcript with turn-by-turn logs, final results,
 * and post-game reflections from player and advisor.
 *
 * Usage:
 *   npx tsx src/advisor/run.ts [options]
 *
 * Options:
 *   --seed=N         Advisor persona seed (for reproducibility)
 *   --max-turns=N    Maximum turns before ending (default: 50)
 *   --output=DIR     Output directory for transcripts (default: ./transcripts)
 *   --quiet          Disable verbose output
 *
 * Examples:
 *   npx tsx src/advisor/run.ts
 *   npx tsx src/advisor/run.ts --seed=12345 --max-turns=30
 *   npx tsx src/advisor/run.ts --output=./playthroughs --quiet
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
    }
    // --help is handled in main() before this function is called
  }

  return config;
}

// Main
async function main() {
  // Check for help flag before anything else
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
DINO LAIR AUTONOMOUS PLAY

Run a complete game with an LLM advisor instead of a human.

Usage:
  npx tsx src/advisor/run.ts [options]

Options:
  --seed=N         Advisor persona seed (for reproducibility)
  --max-turns=N    Maximum turns before ending (default: 50)
  --output=DIR     Output directory for transcripts (default: ./transcripts)
  --quiet          Disable verbose output
  --help, -h       Show this help message

Examples:
  npx tsx src/advisor/run.ts
  npx tsx src/advisor/run.ts --seed=12345 --max-turns=30
  npx tsx src/advisor/run.ts --output=./playthroughs --quiet
`);
    process.exit(0);
  }

  console.log("DINO LAIR - Autonomous Play System\n");

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set.");
    console.error("Please set it before running autonomous play:");
    console.error("  export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }

  const config = parseArgs();

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
