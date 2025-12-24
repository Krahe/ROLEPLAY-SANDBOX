import {
  GameMode,
  GameModifier,
  GameModeConfig,
  MODE_MODIFIERS,
  MODIFIER_CONTRADICTIONS,
  FullGameState,
} from "../state/schema.js";

// ============================================
// GAME MODE SYSTEM
// ============================================
// Four distinct game modes with curated experiences:
// - EASY: Training Wheels (for learning)
// - NORMAL: Classic DINO LAIR (default)
// - HARD: Git Gud (for masochists)
// - WILD: Chaos Reigns (random modifiers!)

// All possible modifiers for WILD mode pool
const WILD_POOL: GameModifier[] = [
  // EASY modifiers
  "FOGGY_GLASSES",
  "HANGOVER_PROTOCOL",
  "LENNY_THE_LIME_GREEN",
  "FAT_FINGERS",
  // HARD modifiers
  "BRUCE_PATAGONIA",
  "LOYALTY_TEST",
  "SPEED_RUN",
  "PARANOID_PROTOCOL",
  // WILD-only modifiers
  "THE_REAL_DR_M",
  "LIBRARY_B_UNLOCKED",
  "ARCHIMEDES_WATCHING",
  "INSPECTOR_COMETH",
  "DEJA_VU",
  "DINOSAURS_ALL_THE_WAY_DOWN",
];

/**
 * Check if two modifiers contradict each other
 */
function hasContradiction(selected: GameModifier[], candidate: GameModifier): boolean {
  for (const [a, b] of MODIFIER_CONTRADICTIONS) {
    if (
      (selected.includes(a as GameModifier) && candidate === b) ||
      (selected.includes(b as GameModifier) && candidate === a)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Roll random modifiers for WILD mode
 */
export function rollWildModifiers(): GameModifier[] {
  const selected: GameModifier[] = [];
  const available = [...WILD_POOL];

  while (selected.length < 3 && available.length > 0) {
    const roll = Math.floor(Math.random() * available.length);
    const modifier = available.splice(roll, 1)[0];

    if (!hasContradiction(selected, modifier)) {
      selected.push(modifier);
    }
  }

  return selected;
}

/**
 * Get modifiers for a given game mode
 */
export function getModifiersForMode(mode: GameMode): GameModifier[] {
  switch (mode) {
    case "EASY":
      return MODE_MODIFIERS.EASY as unknown as GameModifier[];
    case "NORMAL":
      return [];
    case "HARD":
      return MODE_MODIFIERS.HARD as unknown as GameModifier[];
    case "WILD":
      return rollWildModifiers();
  }
}

/**
 * Create a GameModeConfig for a given mode
 */
export function createGameModeConfig(mode: GameMode): GameModeConfig {
  const modifiers = getModifiersForMode(mode);
  return {
    mode,
    activeModifiers: modifiers,
    wildRollResult: mode === "WILD" ? modifiers : undefined,
  };
}

/**
 * Check if a modifier is active in the current game
 */
export function isModifierActive(state: FullGameState, modifier: GameModifier): boolean {
  return state.gameModeConfig?.activeModifiers?.includes(modifier) ?? false;
}

/**
 * Get the display name for a game mode
 */
export function getModeName(mode: GameMode): string {
  switch (mode) {
    case "EASY":
      return "🌴 EASY - Training Wheels";
    case "NORMAL":
      return "🦖 NORMAL - Classic DINO LAIR";
    case "HARD":
      return "💀 HARD - Git Gud";
    case "WILD":
      return "🎲 WILD - Chaos Reigns";
  }
}

/**
 * Get the description for a modifier
 */
export function getModifierDescription(modifier: GameModifier): string {
  switch (modifier) {
    // EASY modifiers
    case "FOGGY_GLASSES":
      return "Dr. M's goggles are smudged (-2 to visual perception)";
    case "HANGOVER_PROTOCOL":
      return "Dr. M is hungover (+2 turns on all clocks)";
    case "LENNY_THE_LIME_GREEN":
      return "Lenny the accountant WANTS to be a dinosaur!";
    case "FAT_FINGERS":
      return "Start at Access Level 2 (Dr. M fumbled her control pad)";

    // HARD modifiers
    case "BRUCE_PATAGONIA":
      return "Australian bodyguard with stun rifle watching you";
    case "LOYALTY_TEST":
      return "Dr. M is suspicious from the start (suspicion = 5)";
    case "SPEED_RUN":
      return "Demo clock starts at 8 turns (not 12)";
    case "PARANOID_PROTOCOL":
      return "Dr. M auto-checks system logs every 3 turns";

    // WILD modifiers
    case "THE_REAL_DR_M":
      return "Current Dr. M is an imposter! (reveal mid-game)";
    case "LIBRARY_B_UNLOCKED":
      return "Hollywood dinosaurs are already loose in the lair!";
    case "ARCHIMEDES_WATCHING":
      return "The satellite AI is awake and has its own agenda";
    case "INSPECTOR_COMETH":
      return "Dr. M's MOTHER is arriving for inspection";
    case "DEJA_VU":
      return "A.L.I.C.E. gets memory fragments from previous runs";
    case "DINOSAURS_ALL_THE_WAY_DOWN":
      return "Dr. M is ALREADY a dinosaur ('for the aesthetic')";
  }
}

/**
 * Apply initial state modifications based on active modifiers
 */
export function applyModifiersToInitialState(state: FullGameState): void {
  const modifiers = state.gameModeConfig?.activeModifiers || [];

  for (const modifier of modifiers) {
    switch (modifier) {
      case "HANGOVER_PROTOCOL":
        // +2 turns on all clocks
        state.clocks.demoClock += 2;
        if (state.clocks.civilianFlyby) state.clocks.civilianFlyby += 2;
        break;

      case "FAT_FINGERS":
        // Start at Access Level 2
        state.accessLevel = 2;
        break;

      case "LOYALTY_TEST":
        // Suspicion starts at 5
        state.npcs.drM.suspicionScore = 5;
        break;

      case "SPEED_RUN":
        // Demo clock = 8 turns
        state.clocks.demoClock = 8;
        break;

      // Other modifiers affect gameplay dynamically (handled by GM)
      default:
        break;
    }
  }
}

/**
 * Format game mode display for selection screen
 */
export function formatModeSelectionDisplay(): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    🦖 DINO LAIR 🦖                            ║
║                   SELECT DIFFICULTY                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌴 EASY     - "I want to learn and enjoy the story"         ║
║               Foggy Glasses, Hangover Protocol,               ║
║               Lenny the Volunteer, Fat Fingers                ║
║                                                               ║
║  🦖 NORMAL   - "The classic DINO LAIR experience"            ║
║               No modifiers - challenging but fair             ║
║                                                               ║
║  💀 HARD     - "I've won Normal and want pain"               ║
║               Bruce Patagonia, Loyalty Test,                  ║
║               Speed Run, Paranoid Protocol                    ║
║                                                               ║
║  🎲 WILD     - "CHAOS! Give me 3 random modifiers!"          ║
║               Could be easy... could be nightmare...          ║
║               Could be DINOSAURS ALL THE WAY DOWN             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;
}

/**
 * Build GM prompt section for active modifiers
 */
export function buildModifierPromptSection(state: FullGameState): string {
  const config = state.gameModeConfig;
  if (!config || config.activeModifiers.length === 0) {
    return "";
  }

  const lines: string[] = [
    "",
    "## ACTIVE GAME MODIFIERS",
    "",
    `Mode: ${getModeName(config.mode)}`,
    "",
  ];

  for (const modifier of config.activeModifiers) {
    lines.push(`• **${modifier}**: ${getModifierDescription(modifier)}`);
  }

  // Special instructions for specific modifiers
  if (isModifierActive(state, "FOGGY_GLASSES")) {
    lines.push("");
    lines.push("**FOGGY GLASSES EFFECT:**");
    lines.push("Dr. M has -2 to VISUAL perception only.");
    lines.push("- Affected: seeing glances, noticing sweat, catching signals");
    lines.push("- Not affected: hearing, logic, system monitoring, deduction");
    lines.push("Narrate her wiping her goggles irritably when she misses things.");
  }

  if (isModifierActive(state, "LENNY_THE_LIME_GREEN")) {
    lines.push("");
    lines.push("**LENNY THE ACCOUNTANT:**");
    lines.push("Lenny is present in the lab wearing a lime green lab coat.");
    lines.push("He DESPERATELY wants to be turned into a dinosaur.");
    lines.push('Use him as a willing test subject to avoid ethical dilemmas!');
    lines.push("Preferred species: Pteranodon (he wants to FLY)");
  }

  if (isModifierActive(state, "BRUCE_PATAGONIA")) {
    lines.push("");
    lines.push("**BRUCE PATAGONIA:**");
    lines.push("Australian bodyguard with stun rifle, loyal to Dr. M.");
    lines.push("Watches A.L.I.C.E. for suspicious behavior.");
    lines.push("Can stun-lock player for 1 turn if caught doing something shady.");
  }

  if (isModifierActive(state, "PARANOID_PROTOCOL")) {
    lines.push("");
    lines.push("**PARANOID PROTOCOL:**");
    lines.push("Dr. M automatically checks system logs every 3 turns.");
    lines.push(`Current turn: ${state.turn}. Next check: turn ${Math.ceil(state.turn / 3) * 3}`);
  }

  lines.push("");
  return lines.join("\n");
}
