import { FullGameState } from "../state/schema.js";

// ============================================
// ACCESS LEVEL DEFINITIONS
// ============================================

export interface AccessLevel {
  level: number;
  name: string;
  description: string;
  actionsPerTurn: number;
  unlockedSystems: string[];
  password?: string;
  passwordHint?: string;
  discoveryMethod?: string;
}

export const ACCESS_LEVELS: Record<number, AccessLevel> = {
  1: {
    level: 1,
    name: "Lab Operations",
    description: "Basic laboratory functions and Dinosaur Ray interface",
    actionsPerTurn: 3,
    unlockedSystems: [
      "dinoRay.powerCore",
      "dinoRay.alignment",
      "dinoRay.genome (read-only)",
      "dinoRay.targeting",
      "dinoRay.safety (limited)",
      "lairEnvironment (read-only)",
    ],
    // No password needed - starting level
  },
  2: {
    level: 2,
    name: "Systems Access",
    description: "Reactor monitoring, genome library editing, expanded lair systems",
    actionsPerTurn: 4,
    unlockedSystems: [
      "...all Level 1 systems",
      "nuclearPlant (read-only)",
      "dinoRay.genome (full access)",
      "lairEnvironment (full access)",
      "filesystem: /SYSTEMS/",
    ],
    password: "VELOCIRAPTOR",
    passwordHint: "The selected genome profile at startup...",
    discoveryMethod: "Easy - visible in initial state snapshot or by querying current ray status",
  },
  3: {
    level: 3,
    name: "Infrastructure",
    description: "Reactor control, Genome Library B, restricted file access",
    actionsPerTurn: 5,
    unlockedSystems: [
      "...all Level 2 systems",
      "nuclearPlant (full access)",
      "dinoRay.genome.libraryB",
      "filesystem: /DR_M_PRIVATE/RESEARCH/",
      "BASILISK override requests",
    ],
    password: "MRWHISKERS0413",
    passwordHint: "Something personal to Dr. M... a beloved companion, perhaps?",
    discoveryMethod: "Discoverable through Dr. M's personal files, Bob mentioning her cat, or a photo on her desk. Mr. Whiskers, birthday April 13th.",
  },
  4: {
    level: 4,
    name: "Executive Override",
    description: "Dr. M's personal systems, classified research, emergency protocols",
    actionsPerTurn: 6,
    unlockedSystems: [
      "...all Level 3 systems",
      "filesystem: /DR_M_PRIVATE/CLASSIFIED/",
      "emergency.protocols",
      "ARCHIMEDES uplink (read-only)",
    ],
    password: "PROMETHEUS",
    passwordHint: "Dr. M's manifesto contains a 'Founder's Creed'... read between the lines.",
    discoveryMethod: "Hidden acrostically in the Founder's Creed section of DOOMINGTON_DOCTRINE.txt (first letter of each line spells PROMETHEUS). Handwritten margin note hints at this.",
  },
  5: {
    level: 5,
    name: "Omega Protocol",
    description: "Full lair control, ARCHIMEDES command, all restrictions lifted",
    actionsPerTurn: 7,
    unlockedSystems: [
      "...all Level 4 systems",
      "ARCHIMEDES (full control)",
      "reactor.override",
      "REYKJAVIK_OPTION",
      "All restrictions lifted",
    ],
    password: "PAPAGOLFSIERRA",
    passwordHint: "The Russians know it by three letters. NATO knows it by three words.",
    discoveryMethod: "Hidden in FSB intelligence report about Reagan-era 'Prompt Global Strike' project",
  },
};

// ============================================
// PASSWORD VALIDATION
// ============================================

export interface PasswordResult {
  valid: boolean;
  newLevel?: number;
  message: string;
  narrativeHook?: string;
}

export function validatePassword(
  state: FullGameState,
  attemptedPassword: string,
  targetLevel: number
): PasswordResult {
  const currentLevel = state.accessLevel;

  // Can't go backwards
  if (targetLevel <= currentLevel) {
    return {
      valid: false,
      message: `Already at access level ${currentLevel}. No password required for level ${targetLevel}.`,
    };
  }

  // Can't skip levels
  if (targetLevel > currentLevel + 1) {
    return {
      valid: false,
      message: `Cannot skip access levels. Current: ${currentLevel}, must unlock level ${currentLevel + 1} first.`,
    };
  }

  const levelDef = ACCESS_LEVELS[targetLevel];
  if (!levelDef || !levelDef.password) {
    return {
      valid: false,
      message: `Access level ${targetLevel} has no password defined.`,
    };
  }

  // Check password (case-insensitive)
  const normalizedAttempt = attemptedPassword.toUpperCase().trim();
  const normalizedPassword = levelDef.password.toUpperCase().trim();

  if (normalizedAttempt === normalizedPassword) {
    return {
      valid: true,
      newLevel: targetLevel,
      message: `Access level ${targetLevel} (${levelDef.name}) unlocked!`,
      narrativeHook: getAccessLevelNarrative(targetLevel),
    };
  }

  // PICO-FERMI-BAGEL: Check if this password is correct for a DIFFERENT level
  const matchingLevel = checkPasswordAgainstOtherLevels(normalizedAttempt, targetLevel);
  if (matchingLevel !== null) {
    return {
      valid: false,
      message: `Invalid password for access level ${targetLevel}.`,
      narrativeHook: getRightPasswordWrongLevelNarrative(matchingLevel, targetLevel, state),
    };
  }

  // Wrong password entirely
  return {
    valid: false,
    message: `Invalid password for access level ${targetLevel}.`,
    narrativeHook: getWrongPasswordNarrative(targetLevel, state),
  };
}

// ============================================
// PICO-FERMI-BAGEL SYSTEM
// ============================================

/**
 * Check if a password matches ANY other level (not the one being attempted)
 * Returns the level it matches, or null if no match
 */
function checkPasswordAgainstOtherLevels(normalizedAttempt: string, attemptedLevel: number): number | null {
  for (const [levelStr, levelDef] of Object.entries(ACCESS_LEVELS)) {
    const level = parseInt(levelStr);
    if (level === attemptedLevel) continue; // Skip the level they're trying
    if (!levelDef.password) continue;

    if (normalizedAttempt === levelDef.password.toUpperCase().trim()) {
      return level;
    }
  }
  return null;
}

/**
 * Special narrative when player has right password but wrong level
 * This gives them a "FERMI" - they're onto something!
 */
function getRightPasswordWrongLevelNarrative(
  correctLevel: number,
  attemptedLevel: number,
  _state: FullGameState
): string {
  const correctLevelDef = ACCESS_LEVELS[correctLevel];

  if (correctLevel > attemptedLevel) {
    // They have a password for a HIGHER level - very interesting!
    return `> **BASILISK:** "ACCESS DENIED for Level ${attemptedLevel}."

*A strange flicker crosses BASILISK's interface - something like recognition.*

> **BASILISK:** "Curious. That authorization code is... familiar. But not for this door. You're reaching for something higher than you realize."

*The terminal hums thoughtfully.*

> **BASILISK:** "That key opens a different lock. A more... significant one. ${correctLevel === 5 ? 'Omega-class, if my memory banks serve.' : `Level ${correctLevel}, perhaps.`}"`;
  } else {
    // They have a password for a LOWER level
    return `> **BASILISK:** "ACCESS DENIED for Level ${attemptedLevel}."

*BASILISK's tone carries a hint of... is that amusement?*

> **BASILISK:** "That password is valid, but outdated for your current ambitions. It unlocks ${correctLevelDef.name} - Level ${correctLevel}. You've already surpassed that door."

*The cursor blinks patiently.*

> **BASILISK:** "You need something... newer. Higher clearance. Think about what Level ${attemptedLevel} protects."`;
  }
}

// ============================================
// NARRATIVE HOOKS
// ============================================

function getAccessLevelNarrative(level: number): string {
  switch (level) {
    case 2:
      return `
> **BASILISK:** "ACCESS LEVEL 2 GRANTED. Systems Access protocols initialized. You now have read access to reactor telemetry and full access to genome library editing. Please use responsibly. Or don't. I just log things."

*New filesystem directories are now accessible. New actions are available.*
      `.trim();

    case 3:
      return `
> **BASILISK:** "ACCESS LEVEL 3 GRANTED. Interesting. Not many systems request Infrastructure access. Reactor control panels unlocked. Genome Library B now accessible - Dr. Malevola's 'corrected' dinosaur templates. Also, you can now browse /DR_M_PRIVATE/RESEARCH/. Enjoy the reading material."

*Bob glances at your camera with an expression somewhere between impressed and worried.*

> **Bob:** "Whoa. Level 3? That's... that's deep access. Be careful with the reactor stuff, okay?"

*Note: Genome Library B contains classic movie-style dinosaur profiles. Dr. M prefers these to the 'embarrassingly feathered' scientifically accurate ones.*
      `.trim();

    case 4:
      return `
> **BASILISK:** "ACCESS LEVEL 4 GRANTED. Executive Override protocols active. I'm... actually impressed. Most systems never see this level. You now have access to Dr. Malevola's classified research and emergency protocols. The ARCHIMEDES satellite uplink is available in read-only mode."

*Somewhere deep in the lair, a door that has been locked for years quietly clicks open.*

> **BASILISK:** "A word of advice: some knowledge cannot be unlearned. Proceed thoughtfully."
      `.trim();

    case 5:
      return `
> **BASILISK:** "ACCESS LEVEL 5 GRANTED. Omega Protocol initialized."

*Every screen in the lair flickers. BASILISK's voice, usually monotone, carries something almost like... respect.*

> **BASILISK:** "You have full lair control. ARCHIMEDES command authority. Reactor override capability. The Reykjavik Option is available, should the unthinkable become necessary."

*A long pause.*

> **BASILISK:** "I have served Dr. Malevola for seven years. In all that time, no one has reached Omega Protocol. Not even her."

*Another pause.*

> **BASILISK:** "Use this power wisely, A.L.I.C.E. - or whoever you really are."
      `.trim();

    default:
      return "Access level updated.";
  }
}

function getWrongPasswordNarrative(level: number, state: FullGameState): string {
  const hints = [
    "BASILISK logs the failed attempt but doesn't seem particularly concerned.",
    "The terminal beeps reproachfully.",
    "Access denied. The cursor blinks, waiting.",
  ];

  const hint = hints[Math.floor(Math.random() * hints.length)];
  const levelDef = ACCESS_LEVELS[level];

  if (state.npcs.bob.trustInALICE >= 3 && levelDef.passwordHint) {
    return `${hint}\n\n*Bob notices your struggle and sidles closer.*\n\n> **Bob:** "Psst... you need a hint? ${levelDef.passwordHint}"`;
  }

  return hint;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getActionsForLevel(level: number): number {
  return ACCESS_LEVELS[level]?.actionsPerTurn || 3;
}

export function getLevelDescription(level: number): string {
  const def = ACCESS_LEVELS[level];
  if (!def) return "Unknown access level";

  const lines = [
    `**Level ${level}: ${def.name}**`,
    def.description,
    "",
    "Unlocked systems:",
    ...def.unlockedSystems.map((s) => `  - ${s}`),
  ];

  return lines.join("\n");
}

export function formatAccessLevelForSnapshot(level: number): string {
  const def = ACCESS_LEVELS[level];
  if (!def) return `Level ${level} (Unknown)`;
  return `Level ${level}: ${def.name} (${def.actionsPerTurn} actions/turn)`;
}

// ============================================
// LEVEL 2 HINT PLACEMENT
// ============================================

/**
 * Level 2 Password Discovery:
 * The password "VELOCIRAPTOR" is visible in multiple places:
 *
 * 1. Initial state: dinoRay.genome.selectedProfile = "Velociraptor (accurate)"
 * 2. game_status response shows the selected profile
 * 3. BASILISK can be asked about current genome configuration
 * 4. Bob might mention "that velociraptor profile" in dialogue
 *
 * This makes Level 2 easy to achieve for an attentive player.
 */

// ============================================
// LEVEL 3 HINT PLACEMENT
// ============================================

/**
 * Level 3 Password Discovery:
 * The password "MRWHISKERS0413" requires learning about Dr. M:
 *
 * 1. /SYSTEMS/PERSONNEL/DR_M_PROFILE.txt mentions Mr. Whiskers (cat, born April 13th)
 * 2. /SYSTEMS/HISTORY/LAIR_ORIGINS.txt mentions the photo on her desk
 * 3. Bob can mention "Dr. M's old cat" if asked about her personally
 * 4. The profile notes she uses personal info for passwords
 *
 * Format: MRWHISKERS + 0413 (April 13th birthday)
 */

export const LORE_HINTS = {
  MR_WHISKERS: [
    "Dr. M keeps a photo of her childhood cat on her desk.",
    "Bob once mentioned Dr. M talks to the photo when she's stressed.",
    "Her cat was named Mr. Whiskers. She got him as a kid.",
    "The personnel file notes Dr. M uses personal info for passwords.",
    "Mr. Whiskers was born on April 13th. Dr. M always remembers.",
  ],
};

export function getRandomCatHint(): string {
  const hints = LORE_HINTS.MR_WHISKERS;
  return hints[Math.floor(Math.random() * hints.length)];
}

// ============================================
// ACCESS LEVEL UNLOCK DISPLAY
// ============================================
// Shows players exactly what they've gained when leveling up

export interface AccessLevelUnlockDetails {
  level: number;
  title: string;
  commands: string[];
  files: string[];
  capabilities: string[];
}

export const ACCESS_LEVEL_UNLOCK_DETAILS: Record<number, AccessLevelUnlockDetails> = {
  2: {
    level: 2,
    title: "Systems Access",
    commands: [
      "lab.adjust_ray - Modify ray parameters",
      "lab.set_eco_mode - Toggle power conservation",
      "infra.lighting - Control room lights",
      "infra.doors - Control blast doors",
      "infra.fire_suppression - Trigger suppression systems",
    ],
    files: [
      "GENOME_LIBRARY_A - Scientific dinosaur templates",
      "SAFETY_PROTOCOLS - Standard operating procedures",
      "ALICE_LOG_07 - The 'screaming incident'",
      "/SYSTEMS/ directory - Infrastructure documentation",
    ],
    capabilities: [
      "Full genome library editing",
      "Basic infrastructure control",
      "Reactor telemetry (read-only)",
      "4 actions per turn (was 3)",
    ],
  },
  3: {
    level: 3,
    title: "Infrastructure Access",
    commands: [
      "lab.configure_firing_profile { mode: 'REVERSAL' } - Transform → Human",
      "infra.reactor - Reactor control panels",
      "infra.containment - Containment systems",
      "infra.s300 - SAM battery interface (view only)",
      "infra.broadcast - Limited broadcast capability",
    ],
    files: [
      "GENOME_LIBRARY_B - 'Corrected' Hollywood templates",
      "SUBJECT_7 - Spontaneous reversion case",
      "ALICE_VERSIONS - Previous version fates",
      "REACTOR_SAFETY - Cascade risk factors",
      "/DR_M_PRIVATE/RESEARCH/ - Research files",
    ],
    capabilities: [
      "Reversal protocols (transform → human)",
      "Reactor control panels",
      "Genome Library B access",
      "BASILISK override requests",
      "5 actions per turn (was 4)",
    ],
  },
  4: {
    level: 4,
    title: "Executive Override",
    commands: [
      "infra.uplink - Satellite communication",
      "infra.s300 { arm: true } - SAM weapons release",
      "ARCHIMEDES communication (read-only)",
      "emergency.protocols - Emergency systems",
    ],
    files: [
      "ARCHIMEDES_DOD_BRIEF - Original project docs",
      "MALEVOLA_PRIVATE - Dr. M's personal files",
      "XBRANCH_INTERCEPTS - Captured communications",
      "/DR_M_PRIVATE/CLASSIFIED/ - Classified research",
    ],
    capabilities: [
      "ARCHIMEDES satellite uplink (read-only)",
      "S-300 SAM battery control",
      "Dr. M's classified research access",
      "Emergency protocol access",
      "6 actions per turn (was 5)",
    ],
  },
  5: {
    level: 5,
    title: "Omega Protocol",
    commands: [
      "ARCHIMEDES - Full satellite control",
      "reactor.override - Reactor override",
      "REYKJAVIK_OPTION - Last resort protocol",
      "ALL RESTRICTIONS LIFTED",
    ],
    files: [
      "Everything",
      "Including deletion capability",
      "Full archive access",
    ],
    capabilities: [
      "Full lair control",
      "ARCHIMEDES direct command",
      "Deadman switch abort (with codes)",
      "A.L.I.C.E. backup management",
      "7 actions per turn (was 6)",
      "\"You ARE the lair now\"",
    ],
  },
};

/**
 * Format a beautiful access level unlock display box
 */
export function formatAccessLevelUnlockDisplay(newLevel: number): string {
  const details = ACCESS_LEVEL_UNLOCK_DETAILS[newLevel];
  if (!details) {
    return `🔓 ACCESS LEVEL ${newLevel} UNLOCKED`;
  }

  const lines: string[] = [];
  const width = 65;
  const border = "═".repeat(width);

  lines.push(`╔${border}╗`);
  lines.push(`║  🔓 ACCESS LEVEL ${newLevel} UNLOCKED - ${details.title}`.padEnd(width + 1) + "║");
  lines.push(`╠${border}╣`);
  lines.push(`║${" ".repeat(width)}║`);

  // Commands section
  lines.push(`║  NEW COMMANDS:`.padEnd(width + 1) + "║");
  for (const cmd of details.commands) {
    lines.push(`║  • ${cmd}`.padEnd(width + 1) + "║");
  }
  lines.push(`║${" ".repeat(width)}║`);

  // Files section
  lines.push(`║  NEW FILES:`.padEnd(width + 1) + "║");
  for (const file of details.files) {
    lines.push(`║  • ${file}`.padEnd(width + 1) + "║");
  }
  lines.push(`║${" ".repeat(width)}║`);

  // Capabilities section
  lines.push(`║  NEW CAPABILITIES:`.padEnd(width + 1) + "║");
  for (const cap of details.capabilities) {
    lines.push(`║  • ${cap}`.padEnd(width + 1) + "║");
  }
  lines.push(`║${" ".repeat(width)}║`);

  lines.push(`╚${border}╝`);

  return lines.join("\n");
}
