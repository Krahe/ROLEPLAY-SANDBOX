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
    lines.push("**LENNY 'THE LIME GREEN' FIGGINS:**");
    lines.push("Leonard Figgins, Accounting Department. Lime green polo shirt, calculator watch showing dinosaur wingspans.");
    lines.push("");
    lines.push("PERSONALITY: Enthusiasm 12/12, Self-Preservation 2/12, Danger Awareness 1/12");
    lines.push("- VOLUNTEER EXTRAORDINAIRE: Has signed waiver forms for EVERY dinosaur type");
    lines.push("- CHAOS BLIND: Doesn't notice spy escapes, villain rage, or imminent doom");
    lines.push("- COMMUTE OPTIMIZER: Has calculated flight times from lair to London (4hr 17min)");
    lines.push("");
    lines.push("SIGNATURE QUOTES:");
    lines.push('- "I could carry BRIEFCASES! I could deliver INTER-OFFICE MEMOS by AIR!"');
    lines.push('- "The M25 traffic is TERRIBLE. You know what doesn\'t have traffic? THE SKY."');
    lines.push('- "Did someone say transformation? I\'m RIGHT HERE. Very willing. Extremely consenting."');
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- WILLING SUBJECT: Removes ethical dilemma of forced transformation");
    lines.push("- HELPFUL HANDS: +1 to DEX checks when Lenny assists nearby");
    lines.push("- WITNESS IMMUNITY: Too focused on dinosaurs to notice conspiracy");
    lines.push("- Preferred species: Pteranodon > Quetzalcoatlus > any flyer > Velociraptor (backup)");
    lines.push("");
    lines.push("TRUST: Starts at 5 (likes EVERYONE). +1 for dinosaur chat, +2 if you transform him!");
  }

  if (isModifierActive(state, "BRUCE_PATAGONIA")) {
    lines.push("");
    lines.push("**BRUCE 'CROC' PATAGONIA:**");
    lines.push("Chief Security Consultant / Big Game Expert. Bush hat, safari vest, crocodile tooth necklace.");
    lines.push("");
    lines.push("PERSONALITY: Composure 12/12 (LEGENDARY), Competence 10/12, Loyalty to Dr. M 4/12");
    lines.push("- UNFLAPPABLE: Dinosaurs, spies, explosions → 'Well, that's new.'");
    lines.push("- PROFESSIONAL: Does his job WELL, but won't die for Dr. M");
    lines.push("- CURIOUS ABOUT A.L.I.C.E.: Genuinely fascinated by talking AI!");
    lines.push("- JOLLY: Everything is a grand adventure, mate!");
    lines.push("");
    lines.push("SIGNATURE QUOTES:");
    lines.push('- "Crikey, a bloody talking computer! Like on the telly!"');
    lines.push('- "Dr. M pays well, but she didn\'t say nothing about fighting THAT."');
    lines.push('- "You\'re a clever little program, aren\'tcha? Can you tell jokes?"');
    lines.push('- "Look, between you and me, the Doc\'s a bit... *intense*, yeah?"');
    lines.push("");
    lines.push("COMBAT STATS:");
    lines.push("- Resilience: 5 (same as a raptor! Tough bastard)");
    lines.push("- Stun Rifle: 2 damage, +2 at range, -2 in melee, 8 shots");
    lines.push("- Hand-to-hand: +2 bonus, 1 damage (he's scrappy)");
    lines.push("- COMPOSURE 12: Almost impossible to panic or intimidate");
    lines.push("");
    lines.push("WEAKNESSES (Exploitable!):");
    lines.push("- Not a fanatic - can be negotiated with if Dr. M isn't watching");
    lines.push("- CURIOUS ABOUT AI - A.L.I.C.E. can fascinate him with conversation!");
    lines.push("- Mercenary - 'How much is she paying you?'");
    lines.push("- Rifle is awkward in close quarters (-2 melee)");
    lines.push("");
    lines.push("TRUST: Starts at 2. +1 for answering AI questions, +1 for jokes, +2 for proving Dr. M is dangerous.");
    lines.push("Max trust 6: He won't betray Dr. M, but might... step aside.");
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

/**
 * Build mode-specific modifier philosophy guidance
 * This adjusts the asymmetric modifier philosophy based on game difficulty
 */
export function buildModeModifierGuidance(state: FullGameState): string {
  const mode = state.gameModeConfig?.mode || "NORMAL";

  switch (mode) {
    case "EASY":
      return `
## 🌴 EASY MODE MODIFIER ADJUSTMENTS

**BONUSES: Even MORE generous!**
- Add +1 to ALL bonuses (so +1 becomes +2, +2 becomes +3, etc.)
- Cap at +5 for truly exceptional plays
- Be GENEROUS with what counts as "clever"

**PENALTIES: Almost nonexistent**
- -1 is the MAXIMUM penalty, period
- Only apply penalties for truly egregious mistakes
- The modifiers already help the player - lean into that!

**Philosophy:** This is Training Wheels mode. Let them learn the mechanics
and enjoy the story without getting crushed. Victory should feel achievable
on the first playthrough.
`;

    case "HARD":
      return `
## 💀 HARD MODE: FAIR, COLD MATH

**BONUSES: Still generous, but earned**
- Standard +1 to +4 range applies
- Don't be stingy, but don't give freebies
- Player should WORK for those +3 and +4 bonuses

**PENALTIES: Full range available**
- -1 to -3 penalties are now allowed
- -3 for truly catastrophic choices (still rare)
- Bad decisions should have REAL consequences

**Philosophy:** Git Gud mode. Every modifier is there to challenge the player.
Bruce Patagonia is WATCHING. The clock is FAST. Respect the difficulty -
the player asked for pain, deliver it fairly.
`;

    case "WILD":
      return `
## 🎲 WILD MODE: EMBRACE THE CHAOS

**BONUSES: Unpredictable!**
- Standard +1 to +4 range, BUT...
- Feel free to give +5 for moments that fit the chaos
- If a random modifier creates a funny opportunity, reward it!

**PENALTIES: Match the chaos**
- -1 to -2 for normal situations
- The modifiers themselves are the penalty - don't pile on
- If DINOSAURS_ALL_THE_WAY_DOWN is active, everything is already ridiculous

**Philosophy:** WILD mode is about memorable stories, not fairness.
Some runs will be accidentally easy. Some will be accidentally impossible.
That's the fun! Lean into whatever chaos the modifiers create.
`;

    case "NORMAL":
    default:
      return `
## 🦖 NORMAL MODE: CLASSIC DINO LAIR

**Standard Asymmetric Modifier Philosophy applies:**
- Bonuses: +1 to +4 (be generous for cleverness)
- Penalties: -1 to -2 MAX (the game is hard enough)
- Reward smart play, don't punish minor mistakes

**Philosophy:** The player should feel like they EARNED their ending,
whatever that ending may be. Close calls are good. Total domination
and total catastrophe are both failures of calibration.
`;
  }
}
