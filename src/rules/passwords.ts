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
    password: "PLACEHOLDER_L4",
    passwordHint: "[DATA BLACK MAGIC REQUIRED]",
    discoveryMethod: "Reserved for special discovery mechanisms",
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
    password: "PLACEHOLDER_L5",
    passwordHint: "[DATA BLACK MAGIC REQUIRED]",
    discoveryMethod: "Reserved for special discovery mechanisms",
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

  // Wrong password
  return {
    valid: false,
    message: `Invalid password for access level ${targetLevel}.`,
    narrativeHook: getWrongPasswordNarrative(targetLevel, state),
  };
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
