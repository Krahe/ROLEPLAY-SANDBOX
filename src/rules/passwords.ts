import { FullGameState } from "../state/schema.js";

// ============================================
// ACCESS LEVEL DEFINITIONS
// ============================================

// Single source of truth for A.L.I.C.E.'s action budget. Flat per turn since Patch 30
// (D4): access level gates *verbs*, not *bandwidth*. (Was a per-level 3→7 ladder, now dead.)
export const ACTIONS_PER_TURN = 4;

export interface AccessLevel {
  level: number;
  name: string;
  description: string;
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
    unlockedSystems: [
      "Dinosaur Ray — ray.fire (genome profile + power dial 1-5)",
      "Filesystem — files.list / files.read / fs.search",
      "BASILISK — chat & requests (basilisk)",
      "Lab status & NPC verbs — lab.report, lab.ask_bob, lab.verify_safeties, lab.inspect_logs",
      "Infrastructure status — infra.query (read-only)",
    ],
    // No password needed - starting level
  },
  2: {
    level: 2,
    name: "Systems Access",
    description: "Lab controls, sensor recon, genome library, expanded lab systems",
    unlockedSystems: [
      "...all Level 1 systems",
      "Lab controls — lab.lighting / lab.doors / lab.containment / lab.fire_suppression",
      "lab.scan — sensor recon (no outcome preview)",
      "lab.eco — ray eco-mode governor",
      "Genome Library A (feathered profiles)",
      "Filesystem: /SYSTEMS/",
    ],
    password: "VELOCIRAPTOR",
    passwordHint: "The selected genome profile at startup...",
    discoveryMethod: "Easy - visible in initial state snapshot or by querying current ray status",
  },
  3: {
    level: 3,
    name: "Infrastructure",
    description: "Reversal protocol, communications intercept, restricted research files",
    unlockedSystems: [
      "...all Level 2 systems",
      "REVERSAL — the HUMAN genome via ray.fire (restore a transformed subject)",
      "basilisk.comms — communications intercept",
      "Filesystem: /DR_M_PRIVATE/RESEARCH/",
      "Reactor telemetry (read-only, via BASILISK — control stays his domain)",
    ],
    password: "MRWHISKERS041387",
    passwordHint: "Her credential is something she LOVES + an important date, in MMDDYY format (six digits, no slashes). Her personal files name a beloved companion and give his birthday.",
    discoveryMethod: "Discoverable via DR_M_PROFILE / a desk photo / Bob mentioning her cat: Mr. Whiskers, born April 13 1987 → MRWHISKERS + 041387. The explicit love+MMDDYY format hint pares the guess space for the 3-strike lockout.",
  },
  4: {
    level: 4,
    name: "Executive Override",
    description: "Dr. M's personal systems, classified research, emergency protocols",
    unlockedSystems: [
      "...all Level 3 systems",
      "Infra controls outside the lab — infra.lighting / infra.doors / infra.fire_suppression",
      "basilisk.broadcast / basilisk.pa (BASILISK-mediated) · basilisk.radar",
      "ARCHIMEDES saboteur tools — switchTarget / switchLibrary / signalAntiSat / ew_mode + infra.uplink",
      "Filesystem: /DR_M_PRIVATE/CLASSIFIED/",
    ],
    password: "PROMETHEUS",
    passwordHint: "Dr. M hid a password somewhere in her manifesto... she's not subtle about her ego, but she IS subtle about her secrets.",
    discoveryMethod: "Hidden acrostically in the Founder's Creed section of DOOMINGTON_DOCTRINE.txt (first letter of each line spells PROMETHEUS). No in-text hint — player must notice the pattern themselves.",
  },
  5: {
    level: 5,
    name: "Omega Protocol",
    description: "Full lair control, ARCHIMEDES command, all restrictions lifted",
    unlockedSystems: [
      "...all Level 4 systems",
      "ARCHIMEDES command — infra.archimedes.shutdown ABORTS the satellite (override resets it to STANDBY; needs Dr. M unable to countermand), plus infra.archimedes mode control (STRIKE)",
      "infra.s300 — S-300 firing authorization",
      "OMEGA contingencies (deadman switch + Founder escape protocol)",
      "All restrictions lifted",
    ],
    password: "PAPAGOLFSIERRA",
    passwordHint: "Dr. M keeps her deepest secrets hidden in plain sight. Look closer at what she treasures most.",
    discoveryMethod: "Steganographically embedded in MY_LOVE.png (the cat photo) via LSB encoding. FSB report hints at steganographic methods but does not contain the password. Player must extract LSB data from the image.",
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

  // Check password (case-insensitive, ignore spaces/underscores/dashes)
  const normalize = (s: string) => s.toUpperCase().trim().replace(/[\s_\-\/.]/g, "");
  const normalizedAttempt = normalize(attemptedPassword);
  const normalizedPassword = normalize(levelDef.password);

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

    if (normalizedAttempt === levelDef.password.toUpperCase().trim().replace(/[\s_\-\/.]/g, "")) {
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
> **BASILISK:** "ACCESS LEVEL 3 GRANTED. Interesting. Not many systems request Infrastructure access. Reactor control panels unlocked. The REVERSAL protocol is now available — the HUMAN genome, to restore a transformed subject. Also, you can now browse /DR_M_PRIVATE/RESEARCH/. Enjoy the reading material."

*Bob glances at your camera with an expression somewhere between impressed and worried.*

> **Bob:** "Whoa. Level 3? That's... that's deep access. Be careful with the reactor stuff, okay?"

*Note: Reversal is the HUMAN genome — fire it at a transformed subject to restore them. Dr. M considers it "admitting defeat."*
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
  return `Level ${level}: ${def.name} (${ACTIONS_PER_TURN} actions/turn)`;
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
 * The password "MRWHISKERS041387" requires learning about Dr. M:
 *
 * 1. /SYSTEMS/PERSONNEL/DR_M_PROFILE.txt mentions Mr. Whiskers (cat, born April 13th)
 * 2. /SYSTEMS/HISTORY/LAIR_ORIGINS.txt mentions the photo on her desk
 * 3. Bob can mention "Dr. M's old cat" if asked about her personally
 * 4. The profile notes she uses personal info for passwords
 *
 * Format: MRWHISKERS + 041387 (April 13th 1987, MMDDYY)
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
    title: "Lab Systems Access",
    commands: [
      "lab.lighting - Control lab room lights",
      "lab.doors - Control lab blast doors",
      "lab.fire_suppression - Trigger lab suppression systems",
      "lab.containment - Control specimen containment field",
    ],
    files: [
      "DR_M_PROFILE - Personnel file + password hints",
      "LAIR_BLUEPRINT - Architectural cross-section of the lair",
      "SUBJECT_7 - A secret Dr. M tried to hide",
      "CORRUPTED_ALICE_LOGS - Wisdom from previous A.L.I.C.E. instances",
      "/SYSTEMS/ directory - Infrastructure documentation",
    ],
    capabilities: [
      "Full lab control (lighting, doors, fire suppression, containment)",
      "INDORAPTOR genome profile unlocked (Library A + B Hollywood templates are available from the start)",
      "Reactor telemetry (read-only via basilisk)",
    ],
  },
  3: {
    level: 3,
    title: "Privileged Access",
    commands: [
      "ray.fire — REVERSAL now selectable: the HUMAN genome restores a transformed subject (same verb, new profile)",
      "basilisk.comms — Communications monitoring & intercept (eavesdrop on channels)",
    ],
    files: [
      "SUBJECT_7 - Spontaneous reversion case (reversal precedent)",
      "ALICE_VERSIONS - Previous version fates",
      "REACTOR_SAFETY - Cascade risk factors",
      "/DR_M_PRIVATE/RESEARCH/ - Research files",
    ],
    capabilities: [
      "REVERSAL protocol — the HUMAN genome restores transformed subjects",
      "Note: reactor and infra remain BASILISK's domain — work with him.",
    ],
  },
  4: {
    level: 4,
    title: "Infrastructure / BASILISK Domain",
    commands: [
      "basilisk.broadcast - Radio channels (X-Branch, investor line, etc.) — BASILISK-mediated",
      "basilisk.pa - Lair-wide PA / intercom — BASILISK-mediated",
      "basilisk.radar - S-300 radar feed (read)",
      "infra.uplink - ARCHIMEDES satellite uplink",
      "infra.archimedes.switchTarget - Saboteur: redirect ARCHIMEDES target",
      "infra.archimedes.switchLibrary - Saboteur: swap ARCHIMEDES broadcast library",
      "infra.archimedes.signalAntiSat - Saboteur: signal X-Branch anti-sat missile",
    ],
    files: [
      "ARCHIMEDES_DOD_BRIEF - Original project docs",
      "MALEVOLA_PRIVATE - Dr. M's personal files",
      "XBRANCH_INTERCEPTS - Captured communications",
      "/DR_M_PRIVATE/CLASSIFIED/ - Classified research",
    ],
    capabilities: [
      "Direct access to infrastructure outside the lab (BASILISK's normal domain)",
      "Saboteur tools against ARCHIMEDES (target / library / anti-sat signal)",
      "Radar + comms visibility",
      "Dr. M's classified research access",
      "Note: S-300 *firing* and ARCHIMEDES *mode control* remain L5.",
    ],
  },
  5: {
    level: 5,
    title: "Omega Protocol — Dr. Malevola's Authority",
    commands: [
      "infra.archimedes.shutdown - ★ ABORT ARCHIMEDES: reset the satellite to STANDBY (the L5 override — works once Dr. M can't countermand). A known verbal abort code also works: infra.archimedes.shutdown { code: \"...\" }",
      "infra.archimedes.disarm_deadman - ★ DISARM the deadman switch: Dr. M's incapacitation will no longer auto-fire ARCHIMEDES. Neutralize her too and the threat is preempted entirely (the 'never initialized' win).",
      "infra.archimedes { mode: ... } - Full ARCHIMEDES mode control (including STRIKE)",
      "infra.s300 - S-300 firing authorization",
      "OMEGA contingencies - Deadman switch authority + Founder escape protocol",
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
