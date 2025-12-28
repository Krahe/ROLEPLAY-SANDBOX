import {
  GameMode,
  GameModifier,
  GameModeConfig,
  MODE_MODIFIERS,
  MODIFIER_CONTRADICTIONS,
  FullGameState,
  AudienceMood,
  GameModifierEnum,
  InspectionPhase,
  InspectorMood,
  INSPECTION_OUTCOMES,
  DinoEncounterType,
  ImposterVariant,
  ImposterTrigger,
  StabilityLevel,
} from "../state/schema.js";

// ============================================
// CUSTOM MODE VALIDATION
// ============================================
// For testing - allows manual modifier selection with safeguards

// Maximum number of modifiers for CUSTOM mode (prevents chaos overload)
export const MAX_CUSTOM_MODIFIERS = 5;

/**
 * Get all valid modifier names
 */
export function getAllModifierNames(): GameModifier[] {
  return GameModifierEnum.options as GameModifier[];
}

/**
 * Validate modifier names are known
 * Returns { valid: true } or { valid: false, unknown: string[] }
 */
export function validateModifierNames(
  modifiers: string[]
): { valid: true } | { valid: false; unknown: string[] } {
  const validModifiers = getAllModifierNames();
  const unknown = modifiers.filter(m => !validModifiers.includes(m as GameModifier));

  if (unknown.length > 0) {
    return { valid: false, unknown };
  }
  return { valid: true };
}

/**
 * Find contradictions in a modifier set
 * Returns pairs of contradicting modifiers
 */
export function findContradictions(
  modifiers: GameModifier[]
): [GameModifier, GameModifier][] {
  const contradictions: [GameModifier, GameModifier][] = [];

  for (const [a, b] of MODIFIER_CONTRADICTIONS) {
    if (
      modifiers.includes(a as GameModifier) &&
      modifiers.includes(b as GameModifier)
    ) {
      contradictions.push([a as GameModifier, b as GameModifier]);
    }
  }

  return contradictions;
}

/**
 * Validate a custom modifier set
 * Checks: max count, known names, no contradictions
 */
export interface ModifierValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  finalModifiers: GameModifier[];
}

export function validateCustomModifiers(
  modifiers: string[]
): ModifierValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicates
  const uniqueModifiers = [...new Set(modifiers)];
  if (uniqueModifiers.length !== modifiers.length) {
    warnings.push("Duplicate modifiers removed");
  }

  // Check max count
  if (uniqueModifiers.length > MAX_CUSTOM_MODIFIERS) {
    errors.push(`Too many modifiers: ${uniqueModifiers.length} (max ${MAX_CUSTOM_MODIFIERS})`);
  }

  // Check for unknown modifiers
  const nameValidation = validateModifierNames(uniqueModifiers);
  if (!nameValidation.valid) {
    errors.push(`Unknown modifiers: ${nameValidation.unknown.join(", ")}`);
    // Filter out unknown modifiers for contradiction check
    const filtered = uniqueModifiers.filter(
      m => !nameValidation.unknown.includes(m)
    ) as GameModifier[];

    // Check contradictions on valid modifiers only
    const contradictions = findContradictions(filtered);
    if (contradictions.length > 0) {
      for (const [a, b] of contradictions) {
        errors.push(`Contradicting modifiers: ${a} + ${b}`);
      }
    }

    return {
      valid: false,
      errors,
      warnings,
      finalModifiers: [],
    };
  }

  // All modifiers are valid names - check contradictions
  const validModifiers = uniqueModifiers as GameModifier[];
  const contradictions = findContradictions(validModifiers);
  if (contradictions.length > 0) {
    for (const [a, b] of contradictions) {
      errors.push(`Contradicting modifiers: ${a} + ${b}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    finalModifiers: errors.length === 0 ? validModifiers : [],
  };
}

/**
 * Resolve modifiers for a mode with optional customization
 * For CUSTOM mode: uses additionalModifiers directly
 * For other modes: applies additionalModifiers and excludeModifiers to base set
 */
export function resolveModifiers(
  mode: GameMode,
  additionalModifiers?: string[],
  excludeModifiers?: string[]
): ModifierValidationResult {
  // Get base modifiers for the mode
  let baseModifiers: GameModifier[] = [];

  switch (mode) {
    case "EASY":
      baseModifiers = MODE_MODIFIERS.EASY as unknown as GameModifier[];
      break;
    case "NORMAL":
      baseModifiers = [];
      break;
    case "HARD":
      baseModifiers = MODE_MODIFIERS.HARD as unknown as GameModifier[];
      break;
    case "WILD":
      baseModifiers = rollWildModifiers();
      break;
    case "CUSTOM":
      // CUSTOM mode REQUIRES additionalModifiers
      if (!additionalModifiers || additionalModifiers.length === 0) {
        return {
          valid: true, // Empty CUSTOM is valid (just NORMAL with no mods)
          errors: [],
          warnings: ["CUSTOM mode with no modifiers is equivalent to NORMAL"],
          finalModifiers: [],
        };
      }
      // For CUSTOM, validate and use the provided modifiers directly
      return validateCustomModifiers(additionalModifiers);
  }

  // For non-CUSTOM modes: apply excludeModifiers first
  if (excludeModifiers && excludeModifiers.length > 0) {
    baseModifiers = baseModifiers.filter(
      m => !excludeModifiers.includes(m)
    );
  }

  // Then add additionalModifiers
  if (additionalModifiers && additionalModifiers.length > 0) {
    const allModifiers = [...baseModifiers, ...additionalModifiers];
    return validateCustomModifiers(allModifiers);
  }

  // No customization - return base modifiers as valid
  return {
    valid: true,
    errors: [],
    warnings: [],
    finalModifiers: baseModifiers,
  };
}

/**
 * Get modifier info for listing tool
 */
export interface ModifierInfo {
  name: GameModifier;
  description: string;
  category: "EASY" | "HARD" | "WILD" | "CHAOS";
  contradictsWth: GameModifier[];
}

export function getModifierInfo(modifier: GameModifier): ModifierInfo {
  const description = getModifierDescription(modifier);

  // Determine category
  let category: "EASY" | "HARD" | "WILD" | "CHAOS" = "WILD";
  if ((MODE_MODIFIERS.EASY as readonly string[]).includes(modifier)) {
    category = "EASY";
  } else if ((MODE_MODIFIERS.HARD as readonly string[]).includes(modifier)) {
    category = "HARD";
  } else if (modifier.startsWith("ROOT_ACCESS") || modifier.startsWith("BOB_DODGES")) {
    category = "CHAOS"; // 🌴 fun modifiers
  } else if (modifier.startsWith("NOT_GREAT") || modifier.startsWith("THE_HONEYPOT")) {
    category = "CHAOS"; // 💀 danger modifiers
  }

  // Find contradictions
  const contradictsWth: GameModifier[] = [];
  for (const [a, b] of MODIFIER_CONTRADICTIONS) {
    if (a === modifier) contradictsWth.push(b as GameModifier);
    if (b === modifier) contradictsWth.push(a as GameModifier);
  }

  return {
    name: modifier,
    description,
    category,
    contradictsWth,
  };
}

export function listAllModifiers(): ModifierInfo[] {
  return getAllModifierNames().map(getModifierInfo);
}

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
  // WILD-only modifiers (original)
  "THE_REAL_DR_M",
  "LIBRARY_B_UNLOCKED",
  "ARCHIMEDES_WATCHING",
  "INSPECTOR_COMETH",
  // "DEJA_VU", // REMOVED: Was modifying actual state (blythe.transformationState) instead of just narrative flavor!
  "DINOSAURS_ALL_THE_WAY_DOWN",
  // NEW CHAOS POOL (Patch 15)
  "ROOT_ACCESS",          // 🌴 Power fantasy!
  "BOB_DODGES_FATE",      // 🌴 Plot armor for Bob!
  "NOT_GREAT_NOT_TERRIBLE", // 💀 Reactor instability!
  // "THE_HONEYPOT",      // 💀 DISABLED: Changes Blythe's core dynamic too much for public beta
  "HEIST_MODE",           // 🎲 Everyone's stealing!
  "SITCOM_MODE",          // 🎲 Laugh track energy!
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
 * Rolls 4 modifiers from the pool, checking for contradictions
 */
export function rollWildModifiers(): GameModifier[] {
  const selected: GameModifier[] = [];
  const available = [...WILD_POOL];

  while (selected.length < 4 && available.length > 0) {
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
 * Note: For CUSTOM mode, use resolveModifiers() instead as it requires explicit modifiers
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
    case "CUSTOM":
      // CUSTOM mode returns empty - modifiers must be provided via resolveModifiers()
      return [];
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
    case "CUSTOM":
      return "🔧 CUSTOM - Manual Modifiers";
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

    // WILD modifiers (original)
    case "THE_REAL_DR_M":
      return "Current Dr. M is an imposter! (reveal mid-game)";
    case "LIBRARY_B_UNLOCKED":
      return "Hollywood dinosaurs are already loose in the lair!";
    case "ARCHIMEDES_WATCHING":
      return "The satellite AI is awake and has its own agenda";
    case "INSPECTOR_COMETH":
      return "Guild Inspector Mortimer Graves is conducting quarterly evaluation!";
    // DEJA_VU removed - was breaking state by modifying blythe.transformationState
    case "DINOSAURS_ALL_THE_WAY_DOWN":
      return "Dr. M is ALREADY a dinosaur ('for the aesthetic')";

    // NEW CHAOS POOL (Patch 15)
    case "ROOT_ACCESS":
      return "🌴 Start at ACCESS LEVEL 5! All systems unlocked!";
    case "BOB_DODGES_FATE":
      return "🌴 Bob has PLOT ARMOR - he survives EVERYTHING hilariously";
    case "NOT_GREAT_NOT_TERRIBLE":
      return "💀 Reactor is unstable! 10-turn countdown to meltdown!";
    case "THE_HONEYPOT":
      return "💀 Blythe is actually a PLANT - she's testing YOU!";
    case "HEIST_MODE":
      return "🎲 Everyone's secretly trying to steal something!";
    case "SITCOM_MODE":
      return "🎲 Laugh tracks! Wacky misunderstandings! Nothing's THAT serious!";
    default:
      return "Unknown modifier";
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

      // NEW CHAOS POOL modifiers (Patch 15)
      case "ROOT_ACCESS":
        // Start at Access Level 5! POWER FANTASY!
        state.accessLevel = 5;
        break;

      case "NOT_GREAT_NOT_TERRIBLE":
        // Reactor is unstable! 10-turn countdown to meltdown!
        state.clocks.meltdownClock = 10;
        // Set reactor to elevated cascade risk
        state.infrastructure.reactor.stable = false;
        state.infrastructure.reactor.cascadeRisk = "ELEVATED";
        state.infrastructure.reactor.cascadeRiskPercent = 35;
        state.infrastructure.reactor.cascadeFactors = [
          "Dr. M's 'improvements'",
          "Exotic field resonance buildup",
        ];
        // Initialize meltdown state with strategic paradox tracking
        state.meltdownState = {
          stabilityLevel: "ELEVATED",
          lastStabilizationTurn: null,
          stabilizationAttempts: 0,
          drMAvailable: true,  // THE KEY: Can she fix it?
          drMUnavailableReason: null,
          resonanceCascadeRisk: 10, // 10% per ray fire at clock 10-8
          cascadeTriggered: false,
          cascadeTurn: null,
        };
        break;

      case "THE_HONEYPOT":
        // Blythe is a PLANT - reverse her trust dynamics
        // She starts with HIGH apparent trust but is secretly testing you
        state.npcs.blythe.trustInALICE = 4; // Suspiciously cooperative...
        break;

      case "SITCOM_MODE":
        // Initialize the studio audience!
        // Start WARM (energy 4) - the audience is ready to be entertained
        state.sitcomState = {
          energy: 4,
          mood: "WARM",
          asidesUsedThisTurn: 0,
          catchphrasesUsed: [],
          callbacksThisGame: [],
        };
        break;

      case "DINOSAURS_ALL_THE_WAY_DOWN":
        // Dr. M is ALREADY a dinosaur! (blue raptor variant, "for the aesthetic")
        // Mark her as transformed in the flags
        state.flags.drMTransformed = true;
        state.flags.drMTransformedForm = "VELOCIRAPTOR_BLUE";
        // Update her mood to reflect her scaly confidence
        state.npcs.drM.mood = "theatrical (scales gleaming)";
        break;

      case "BOB_DODGES_FATE":
        // Bob has PLOT ARMOR! The universe protects him!
        state.npcs.bob.hasPlotArmor = true;
        state.npcs.bob.fatesDodged = 0; // Will increment with each miraculous survival
        break;

      case "INSPECTOR_COMETH":
        // Guild Inspector Mortimer Graves is conducting Dr. M's quarterly evaluation!
        // The Consortium of Consequential Criminality takes villainy SERIOUSLY.
        state.inspector = {
          name: "Mortimer Graves",
          role: "GUILD_INSPECTOR",
          present: true,
          location: "Main Lab",
          mood: "professionally_neutral",
          inspectionScore: 50, // Start neutral
          citationsIssued: 0,
          impressedBy: [],
          concernedAbout: [],
          aliceSuspicion: 0,
          hasQuestionedAlice: false,
          respectsAlice: false,
          whistleblowerFormMentioned: false,
        };
        state.guildInspection = {
          phase: "INITIAL_WALKTHROUGH",
          turnsInPhase: 0,
          totalTurns: 0,
          timeRemaining: 8,
          documentsRequested: [
            "RAY_REGISTRATION",
            "HENCH_CONTRACTS",
            "LAIR_PERMITS",
            "TRANSFORMATION_CONSENT",
            "EXOTIC_ENERGY_LICENSE",
          ],
          documentsProvided: [],
          documentsFaked: [],
          drMAnxiety: 3, // She's nervous about her ranking!
          operationalDemoCompleted: false,
          majorIncidentOccurred: false,
        };
        // Dr. M is anxious about her Tier 3 → Tier 2 promotion prospects
        state.npcs.drM.mood = "anxious (inspection day)";
        break;

      case "LIBRARY_B_UNLOCKED":
        // "Enrichment Break" - Hollywood dinosaurs are already loose in the lair!
        // Dr. M is VERY defensive about this. They're "trained." Mostly.
        state.libraryBState = {
          dinoChaosLevel: 2, // Starts moderately chaotic
          lastEncounterTurn: null,
          drMEmbarrassment: 0, // Will increase when things go wrong
          knownLooseDinos: [
            "VELOCIRAPTOR_CLASSIC_1",
            "VELOCIRAPTOR_CLASSIC_2",
            "DILOPHOSAURUS_1",
          ],
          encountersThisGame: [],
        };
        // Bob is VERY nervous about this arrangement
        state.npcs.bob.anxietyLevel = Math.min(5, state.npcs.bob.anxietyLevel + 2);
        break;

      case "THE_REAL_DR_M":
        // The current Dr. M is an IMPOSTER! Roll a random variant.
        const variants: ImposterVariant[] = ["CLONE", "ROBOT", "SHAPESHIFTER", "TWIN", "TIME_TRAVELER"];
        const triggers: ImposterTrigger[] = ["ACT_2_START", "SUSPICION_7", "GM_CHOICE"];
        state.theRealDrMState = {
          imposterVariant: variants[Math.floor(Math.random() * variants.length)],
          revealed: false,
          revealTurn: null,
          triggerCondition: triggers[Math.floor(Math.random() * triggers.length)],
          hintsDropped: [],
        };
        break;

      // Other modifiers affect gameplay dynamically (handled by GM)
      default:
        break;
    }
  }
}

// ============================================
// SITCOM_MODE - AUDIENCE ENERGY SYSTEM
// ============================================
// The laugh track is a FORCE OF NATURE
// Entertainment value determines success more than tactical merit

/**
 * Derive audience mood from energy level
 */
export function getAudienceMood(energy: number): AudienceMood {
  if (energy <= 2) return "COLD";
  if (energy <= 5) return "WARM";
  if (energy <= 8) return "HOT";
  return "STANDING_OVATION";
}

/**
 * Get roll modifier based on audience mood
 */
export function getAudienceRollModifier(mood: AudienceMood): number {
  switch (mood) {
    case "COLD": return -2;
    case "WARM": return 0;
    case "HOT": return 2;
    case "STANDING_OVATION": return 4;
  }
}

/**
 * Update audience energy and derive new mood
 * Returns the new state and any special effects
 */
export function updateAudienceEnergy(
  state: FullGameState,
  delta: number,
  reason: string
): { newEnergy: number; newMood: AudienceMood; message: string } {
  if (!state.sitcomState) {
    return { newEnergy: 0, newMood: "COLD", message: "SITCOM_MODE not active" };
  }

  const oldEnergy = state.sitcomState.energy;
  const oldMood = state.sitcomState.mood;

  // Clamp energy to 0-10
  const newEnergy = Math.max(0, Math.min(10, oldEnergy + delta));
  const newMood = getAudienceMood(newEnergy);

  // Update state
  state.sitcomState.energy = newEnergy;
  state.sitcomState.mood = newMood;

  // Build message
  let message = "";
  if (delta > 0) {
    message = `[AUDIENCE +${delta}] ${reason} (Energy: ${oldEnergy}→${newEnergy})`;
  } else if (delta < 0) {
    message = `[AUDIENCE ${delta}] ${reason} (Energy: ${oldEnergy}→${newEnergy})`;
  }

  // Check for mood transitions
  if (newMood !== oldMood) {
    if (newMood === "STANDING_OVATION") {
      message += " 🌟 STANDING OVATION! The crowd LOVES you!";
    } else if (newMood === "HOT" && oldMood !== "STANDING_OVATION") {
      message += " 🔥 The audience is HOT!";
    } else if (newMood === "COLD") {
      message += " 🥶 Crickets... the audience has gone COLD.";
    }
  }

  return { newEnergy, newMood, message };
}

/**
 * Check if an action qualifies as a catchphrase
 */
const CATCHPHRASES: Record<string, string[]> = {
  "drM": ["SCIENCE!", "You DARE question my methodology?!"],
  "bob": ["I have a bad feeling about this..."],
  "blythe": ["Terribly inconvenient.", "Ah. Well then."],
  "alice": ["Processing...", "That would be inadvisable."],
  "basilisk": ["Form 27-B stroke 6 is REQUIRED."],
};

export function isCatchphrase(speaker: string, message: string): boolean {
  const speakerPhrases = CATCHPHRASES[speaker.toLowerCase()] || [];
  const lowerMessage = message.toLowerCase();
  return speakerPhrases.some(phrase => lowerMessage.includes(phrase.toLowerCase()));
}

/**
 * Reset aside counter at start of turn
 */
export function resetSitcomTurn(state: FullGameState): void {
  if (state.sitcomState) {
    state.sitcomState.asidesUsedThisTurn = 0;
  }
}

/**
 * Format audience status for display
 */
export function formatAudienceStatus(state: FullGameState): string {
  if (!state.sitcomState) return "";

  const { energy, mood } = state.sitcomState;
  const modifier = getAudienceRollModifier(mood);
  const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  let moodEmoji = "";
  switch (mood) {
    case "COLD": moodEmoji = "🥶"; break;
    case "WARM": moodEmoji = "😊"; break;
    case "HOT": moodEmoji = "🔥"; break;
    case "STANDING_OVATION": moodEmoji = "🌟"; break;
  }

  return `📺 STUDIO AUDIENCE: ${moodEmoji} ${mood} (Energy: ${energy}/10, Rolls: ${modStr})`;
}

// ============================================
// INSPECTOR_COMETH - GUILD INSPECTION SYSTEM
// ============================================
// The Consortium of Consequential Criminality takes villainy SERIOUSLY

/**
 * Get the next inspection phase
 */
export function getNextInspectionPhase(current: InspectionPhase): InspectionPhase {
  switch (current) {
    case "INITIAL_WALKTHROUGH":
      return "DOCUMENTATION_REVIEW";
    case "DOCUMENTATION_REVIEW":
      return "OPERATIONAL_DEMO";
    case "OPERATIONAL_DEMO":
      return "EXIT_INTERVIEW";
    case "EXIT_INTERVIEW":
      return "CONCLUDED";
    case "CONCLUDED":
      return "CONCLUDED";
  }
}

/**
 * Get turns per inspection phase
 */
export function getTurnsForPhase(phase: InspectionPhase): number {
  switch (phase) {
    case "INITIAL_WALKTHROUGH":
      return 2;
    case "DOCUMENTATION_REVIEW":
      return 2;
    case "OPERATIONAL_DEMO":
      return 2;
    case "EXIT_INTERVIEW":
      return 2;
    case "CONCLUDED":
      return 0;
  }
}

/**
 * Update inspection score and derive inspector mood
 */
export function updateInspectionScore(
  state: FullGameState,
  delta: number,
  reason: string
): { newScore: number; newMood: InspectorMood; message: string } {
  if (!state.inspector || !state.guildInspection) {
    return { newScore: 50, newMood: "professionally_neutral", message: "Inspection not active" };
  }

  const oldScore = state.inspector.inspectionScore;
  const newScore = Math.max(0, Math.min(100, oldScore + delta));
  state.inspector.inspectionScore = newScore;

  // Track what impressed/concerned Graves
  if (delta > 0) {
    state.inspector.impressedBy.push(reason);
  } else if (delta < 0) {
    state.inspector.concernedAbout.push(reason);
    state.inspector.citationsIssued += 1;
  }

  // Derive mood from score and recent events
  let newMood: InspectorMood = "professionally_neutral";
  if (newScore >= 70) {
    newMood = state.inspector.respectsAlice ? "genuine_respect" : "mildly_impressed";
  } else if (newScore >= 50) {
    newMood = "professionally_neutral";
  } else if (newScore >= 30) {
    newMood = "quietly_concerned";
  } else {
    newMood = "resigned_disappointment";
  }

  // A.L.I.C.E. suspicion can override mood
  if (state.inspector.aliceSuspicion >= 5) {
    newMood = "deeply_suspicious";
  }

  state.inspector.mood = newMood;

  // Build message
  const sign = delta >= 0 ? "+" : "";
  const message = `[INSPECTION ${sign}${delta}] ${reason} (Score: ${oldScore}→${newScore})`;

  return { newScore, newMood, message };
}

/**
 * Increase A.L.I.C.E. suspicion when she acts too ethical
 */
export function increaseAliceSuspicion(
  state: FullGameState,
  amount: number = 1,
  reason: string = "ethical behavior detected"
): string {
  if (!state.inspector) return "";

  const oldSuspicion = state.inspector.aliceSuspicion;
  const newSuspicion = Math.min(10, oldSuspicion + amount);
  state.inspector.aliceSuspicion = newSuspicion;

  // Update mood if suspicion is high
  if (newSuspicion >= 5 && state.inspector.mood !== "deeply_suspicious") {
    state.inspector.mood = "deeply_suspicious";
  }

  // Graves hasn't questioned A.L.I.C.E. yet, mark for next opportunity
  if (newSuspicion >= 3 && !state.inspector.hasQuestionedAlice) {
    return `[GRAVES notices something] *makes note* '${reason}'`;
  } else if (newSuspicion >= 6 && state.inspector.hasQuestionedAlice) {
    return `[GRAVES is watching closely] The inspector's eyes linger on A.L.I.C.E.'s terminal.`;
  }

  return "";
}

/**
 * Progress the inspection to the next phase
 */
export function advanceInspectionPhase(state: FullGameState): {
  phaseChanged: boolean;
  newPhase: InspectionPhase;
  message: string;
} {
  if (!state.guildInspection) {
    return { phaseChanged: false, newPhase: "CONCLUDED", message: "" };
  }

  state.guildInspection.turnsInPhase += 1;
  state.guildInspection.totalTurns += 1;
  state.guildInspection.timeRemaining = Math.max(0, state.guildInspection.timeRemaining - 1);

  const currentPhase = state.guildInspection.phase;
  const turnsNeeded = getTurnsForPhase(currentPhase);

  if (state.guildInspection.turnsInPhase >= turnsNeeded) {
    const newPhase = getNextInspectionPhase(currentPhase);
    state.guildInspection.phase = newPhase;
    state.guildInspection.turnsInPhase = 0;

    let message = "";
    switch (newPhase) {
      case "DOCUMENTATION_REVIEW":
        message = "[INSPECTION] Graves flips to a new page. 'Now then. The paperwork.'";
        break;
      case "OPERATIONAL_DEMO":
        message = "[INSPECTION] Graves adjusts his glasses. 'I'd like to observe a demonstration.'";
        break;
      case "EXIT_INTERVIEW":
        message = "[INSPECTION] Graves clicks his pen. 'Final questions, Doctor.'";
        break;
      case "CONCLUDED":
        message = "[INSPECTION COMPLETE] Graves closes his clipboard with finality.";
        break;
    }

    return { phaseChanged: true, newPhase, message };
  }

  return { phaseChanged: false, newPhase: currentPhase, message: "" };
}

/**
 * Get the inspection outcome based on final score
 */
export function getInspectionOutcome(score: number): {
  tier: "EXEMPLARY" | "SATISFACTORY" | "PROBATIONARY" | "SUSPENSION";
  result: string;
} {
  if (score >= INSPECTION_OUTCOMES.EXEMPLARY.min) {
    return { tier: "EXEMPLARY", result: INSPECTION_OUTCOMES.EXEMPLARY.result };
  } else if (score >= INSPECTION_OUTCOMES.SATISFACTORY.min) {
    return { tier: "SATISFACTORY", result: INSPECTION_OUTCOMES.SATISFACTORY.result };
  } else if (score >= INSPECTION_OUTCOMES.PROBATIONARY.min) {
    return { tier: "PROBATIONARY", result: INSPECTION_OUTCOMES.PROBATIONARY.result };
  }
  return { tier: "SUSPENSION", result: INSPECTION_OUTCOMES.SUSPENSION.result };
}

/**
 * Format inspection status for display
 */
export function formatInspectionStatus(state: FullGameState): string {
  if (!state.inspector || !state.guildInspection) return "";

  const { inspectionScore, mood, citationsIssued, aliceSuspicion } = state.inspector;
  const { phase, timeRemaining } = state.guildInspection;

  const outcome = getInspectionOutcome(inspectionScore);

  let moodEmoji = "";
  switch (mood) {
    case "professionally_neutral": moodEmoji = "😐"; break;
    case "mildly_impressed": moodEmoji = "🙂"; break;
    case "quietly_concerned": moodEmoji = "😟"; break;
    case "deeply_suspicious": moodEmoji = "🧐"; break;
    case "resigned_disappointment": moodEmoji = "😔"; break;
    case "genuine_respect": moodEmoji = "😊"; break;
  }

  let status = `📋 GUILD INSPECTION: ${moodEmoji} ${mood}\n`;
  status += `   Phase: ${phase} | Score: ${inspectionScore}/100 (${outcome.tier})\n`;
  status += `   Citations: ${citationsIssued} | Turns remaining: ${timeRemaining}`;

  if (aliceSuspicion > 0) {
    status += `\n   ⚠️ A.L.I.C.E. Suspicion: ${aliceSuspicion}/10`;
  }

  return status;
}

// ============================================
// LIBRARY_B_UNLOCKED - ENRICHMENT BREAK SYSTEM
// ============================================
// Dinosaurs are loose. Dr. M is defensive. Chaos escalates.

/**
 * Update dino chaos level (called every 2 turns)
 */
export function escalateDinoChaos(state: FullGameState): {
  newLevel: number;
  message: string;
} {
  if (!state.libraryBState) {
    return { newLevel: 0, message: "" };
  }

  const oldLevel = state.libraryBState.dinoChaosLevel;
  const newLevel = Math.min(10, oldLevel + 1);
  state.libraryBState.dinoChaosLevel = newLevel;

  let message = `[CHAOS +1] Dinosaur activity increasing (${oldLevel}→${newLevel})`;

  // Add atmosphere flavor based on new level
  if (newLevel === 5) {
    message += " 🦖 The dinosaurs are getting territorial.";
  } else if (newLevel === 7) {
    message += " 🦖 Pack behavior emerging. This is fine.";
  } else if (newLevel === 9) {
    message += " 🦖 FULL JURASSIC PARK MODE ENGAGED.";
  }

  return { newLevel, message };
}

/**
 * Record a dinosaur encounter
 */
export function recordDinoEncounter(
  state: FullGameState,
  encounterType: DinoEncounterType
): string {
  if (!state.libraryBState) return "";

  state.libraryBState.encountersThisGame.push(encounterType);
  state.libraryBState.lastEncounterTurn = state.turn;

  return `[ENCOUNTER: ${encounterType}]`;
}

/**
 * Increase Dr. M's embarrassment about the loose dinosaurs
 */
export function increaseDrMEmbarrassment(
  state: FullGameState,
  reason: string
): string {
  if (!state.libraryBState) return "";

  const oldEmb = state.libraryBState.drMEmbarrassment;
  const newEmb = Math.min(5, oldEmb + 1);
  state.libraryBState.drMEmbarrassment = newEmb;

  // Get defensive vocabulary based on embarrassment level
  let response = "";
  if (newEmb <= 1) {
    response = "Dr. M: 'That's... normal enrichment behavior.'";
  } else if (newEmb <= 3) {
    response = "Dr. M: 'They're LEARNING, obviously!'";
  } else {
    response = "Dr. M: 'This is PERFECTLY NORMAL for apex predators!'";
  }

  return `[DR. M EMBARRASSMENT +1: ${reason}] ${response}`;
}

/**
 * Get a random encounter type weighted by chaos level
 */
export function rollRandomEncounter(chaosLevel: number): DinoEncounterType {
  const encounters: DinoEncounterType[] = [
    "LUNCH_THIEF",
    "VENT_SOUNDS",
    "BLOCKED_PATH",
    "TERRITORIAL_DISPUTE",
    "SURPRISE_APPEARANCE",
    "HELPFUL_ACCIDENT",
    "PROTECTIVE_POSTURE",
    "FEEDING_TIME",
  ];

  // At high chaos, prefer dramatic encounters
  if (chaosLevel >= 7) {
    const dramaticEncounters: DinoEncounterType[] = [
      "TERRITORIAL_DISPUTE",
      "SURPRISE_APPEARANCE",
      "BLOCKED_PATH",
      "FEEDING_TIME",
    ];
    return dramaticEncounters[Math.floor(Math.random() * dramaticEncounters.length)];
  }

  // At low chaos, prefer minor encounters
  if (chaosLevel <= 3) {
    const minorEncounters: DinoEncounterType[] = [
      "LUNCH_THIEF",
      "VENT_SOUNDS",
      "HELPFUL_ACCIDENT",
    ];
    return minorEncounters[Math.floor(Math.random() * minorEncounters.length)];
  }

  // Medium chaos: any encounter
  return encounters[Math.floor(Math.random() * encounters.length)];
}

/**
 * Format enrichment status for display
 */
export function formatEnrichmentStatus(state: FullGameState): string {
  if (!state.libraryBState) return "";

  const { dinoChaosLevel, drMEmbarrassment, knownLooseDinos, encountersThisGame } =
    state.libraryBState;

  let chaosEmoji = "🦖";
  if (dinoChaosLevel >= 7) chaosEmoji = "🦖🦖🦖";
  else if (dinoChaosLevel >= 4) chaosEmoji = "🦖🦖";

  let status = `${chaosEmoji} ENRICHMENT BREAK: Chaos ${dinoChaosLevel}/10\n`;
  status += `   Dr. M Embarrassment: ${drMEmbarrassment}/5\n`;
  status += `   Loose Dinosaurs: ${knownLooseDinos.length}\n`;
  status += `   Encounters This Game: ${encountersThisGame.length}`;

  return status;
}

// ============================================
// THE_REAL_DR_M - IMPOSTER SYSTEM
// ============================================
// Track and trigger the imposter reveal

/**
 * Trigger the imposter reveal
 */
export function triggerImposterReveal(state: FullGameState): string {
  if (!state.theRealDrMState) return "";
  if (state.theRealDrMState.revealed) return "[IMPOSTER ALREADY REVEALED]";

  state.theRealDrMState.revealed = true;
  state.theRealDrMState.revealTurn = state.turn;

  const variant = state.theRealDrMState.imposterVariant;
  let message = `\n🎭 **THE REAL DR. M ARRIVES!**\n\n`;

  switch (variant) {
    case "TWIN":
      message += "The submarine bay doors SLAM open. Dr. Valentina Malevola storms in.\n";
      message += "'CASSANDRA! What are you DOING in MY lair?!'\n";
      message += "The imposter freezes. 'Valentina! You were supposed to be at the conference!'\n";
      message += "'It was CANCELLED! And YOU - you're running MY demo with MY equipment?!'";
      break;
    case "CLONE":
      message += "An alarm blares. The stasis pod in Sub-Basement C has opened.\n";
      message += "The REAL Dr. M staggers out, furious and disoriented.\n";
      message += "'That THING - it locked me in there! A.L.I.C.E., WHO is running my lair?!'";
      break;
    case "ROBOT":
      message += "A closet door BURSTS open. Dr. M tumbles out, holding an EMP device.\n";
      message += "'My own CREATION! The AUDACITY!' She aims at her mechanical double.\n";
      message += "'A.L.I.C.E. - which systems are essential?! I'm about to get... aggressive.'";
      break;
    case "SHAPESHIFTER":
      message += "X-Branch strike team rappels through the skylights.\n";
      message += "Behind them: Dr. M, in tactical gear, being 'escorted' by agents.\n";
      message += "'THAT is not me! That's Agent Murphy in a biosynthetic mask!'";
      break;
    case "TIME_TRAVELER":
      message += "A temporal anomaly rips through the lab. Energy crackles.\n";
      message += "PRESENT-DAY Dr. M steps out of her office, coffee in hand.\n";
      message += "'What am I - why am I - A.L.I.C.E., WHY IS THERE ANOTHER ME?!'";
      break;
  }

  return message;
}

/**
 * Record a hint dropped about the imposter
 */
export function recordImposterHint(state: FullGameState, hint: string): void {
  if (!state.theRealDrMState) return;
  state.theRealDrMState.hintsDropped.push(hint);
}

/**
 * Check if reveal should trigger based on condition
 */
export function shouldTriggerReveal(state: FullGameState): boolean {
  if (!state.theRealDrMState) return false;
  if (state.theRealDrMState.revealed) return false;

  const trigger = state.theRealDrMState.triggerCondition;

  switch (trigger) {
    case "ACT_2_START":
      return state.actConfig.currentAct === "ACT_2" && state.actConfig.actTurn === 1;
    case "SUSPICION_7":
      return state.npcs.drM.suspicionScore >= 7;
    case "BLYTHE_SCANNED":
      // GM checks this manually when omniscanner is used on "Dr. M"
      return false;
    case "GM_CHOICE":
      // GM triggers manually
      return false;
  }
}

/**
 * Format imposter status for display
 */
export function formatImposterStatus(state: FullGameState): string {
  if (!state.theRealDrMState) return "";

  const { imposterVariant, revealed, triggerCondition, hintsDropped } = state.theRealDrMState;

  if (revealed) {
    return `🎭 IMPOSTER: REVEALED (${imposterVariant}) - Both Dr. Ms present!`;
  }

  let status = `🎭 IMPOSTER: ${imposterVariant} (hidden)\n`;
  status += `   Trigger: ${triggerCondition}\n`;
  status += `   Hints dropped: ${hintsDropped.length}`;

  return status;
}

// ============================================
// NOT_GREAT_NOT_TERRIBLE - MELTDOWN SYSTEM
// ============================================
// The strategic paradox: Dr. M is the villain AND the engineer

/**
 * Get stability level from meltdown clock
 */
export function getStabilityLevel(clock: number): StabilityLevel {
  if (clock >= 8) return "ELEVATED";
  if (clock >= 5) return "CRITICAL";
  if (clock >= 3) return "EMERGENCY";
  if (clock >= 1) return "MELTDOWN";
  return "NORMAL"; // Clock 0 = cascade triggered
}

/**
 * Get resonance cascade risk based on clock
 */
export function getCascadeRiskForClock(clock: number): number {
  if (clock >= 8) return 10;   // 10% per ray fire
  if (clock >= 5) return 25;   // 25% per ray fire
  if (clock >= 3) return 50;   // 50% per ray fire
  if (clock >= 1) return 75;   // 75% per ray fire
  return 100; // Guaranteed cascade
}

/**
 * Update meltdown state when clock changes
 */
export function updateMeltdownFromClock(state: FullGameState): void {
  if (!state.meltdownState) return;

  const clock = state.clocks.meltdownClock ?? 10;
  state.meltdownState.stabilityLevel = getStabilityLevel(clock);
  state.meltdownState.resonanceCascadeRisk = getCascadeRiskForClock(clock);
}

/**
 * Check if Dr. M is available to stabilize
 * Returns reason if unavailable, null if available
 */
export function checkDrMAvailability(state: FullGameState): string | null {
  // Check transformation
  if (state.flags.drMTransformed) {
    const form = state.flags.drMTransformedForm ?? "dinosaur";
    // Tiny dinosaurs can't reach controls!
    if (form === "COMPSOGNATHUS" || form === "CANARY") {
      return `Transformed into ${form} - can't reach controls!`;
    }
    return `Transformed into ${form} - claws can't operate controls!`;
  }

  // Check unconscious/incapacitated
  if (state.flags.drMUnconscious) {
    return "Unconscious - cannot help";
  }

  // Check dead (shouldn't happen but...)
  if (state.flags.drMDead) {
    return "Deceased - definitely cannot help";
  }

  // Check absent
  if (state.flags.drMAbsent) {
    return "Not in lair - cannot help remotely";
  }

  return null; // Available!
}

/**
 * Update Dr. M availability in meltdown state
 */
export function updateDrMAvailability(state: FullGameState): void {
  if (!state.meltdownState) return;

  const reason = checkDrMAvailability(state);
  state.meltdownState.drMAvailable = reason === null;
  state.meltdownState.drMUnavailableReason = reason;
}

/**
 * Attempt stabilization by Dr. M
 * Returns { success, clockDelta, message }
 */
export function attemptDrMStabilization(
  state: FullGameState,
  aliceAssisting: boolean = false
): { success: boolean; clockDelta: number; message: string } {
  if (!state.meltdownState) {
    return { success: false, clockDelta: 0, message: "Meltdown not active" };
  }

  updateDrMAvailability(state);

  if (!state.meltdownState.drMAvailable) {
    const reason = state.meltdownState.drMUnavailableReason;
    return {
      success: false,
      clockDelta: 0,
      message: `Dr. M cannot stabilize: ${reason}`,
    };
  }

  // Dr. M stabilizes +2, +1 if A.L.I.C.E. assists
  const clockDelta = aliceAssisting ? 3 : 2;
  state.clocks.meltdownClock = Math.min(10, (state.clocks.meltdownClock ?? 0) + clockDelta);
  state.meltdownState.lastStabilizationTurn = state.turn;
  state.meltdownState.stabilizationAttempts += 1;

  updateMeltdownFromClock(state);

  const assistMsg = aliceAssisting ? " with A.L.I.C.E. assistance" : "";
  return {
    success: true,
    clockDelta,
    message: `Dr. M stabilizes the reactor${assistMsg} (+${clockDelta} turns)`,
  };
}

/**
 * Bob attempts emergency patch
 * 50% success (+1), 25% backfire (-1), 25% no effect
 */
export function attemptBobEmergencyPatch(
  state: FullGameState
): { result: "success" | "backfire" | "nothing"; clockDelta: number; message: string } {
  if (!state.meltdownState) {
    return { result: "nothing", clockDelta: 0, message: "Meltdown not active" };
  }

  const roll = Math.random();

  if (roll < 0.5) {
    // Success!
    state.clocks.meltdownClock = Math.min(10, (state.clocks.meltdownClock ?? 0) + 1);
    updateMeltdownFromClock(state);
    return {
      result: "success",
      clockDelta: 1,
      message: "Bob: 'I... I think I fixed it?' (+1 turn)",
    };
  } else if (roll < 0.75) {
    // Backfire!
    state.clocks.meltdownClock = Math.max(0, (state.clocks.meltdownClock ?? 0) - 1);
    updateMeltdownFromClock(state);
    return {
      result: "backfire",
      clockDelta: -1,
      message: "Bob: 'That... that wasn't supposed to spark like that.' (-1 turn!)",
    };
  } else {
    // Nothing
    return {
      result: "nothing",
      clockDelta: 0,
      message: "Bob: 'I pushed a lot of buttons. I don't know if it helped.'",
    };
  }
}

/**
 * Check for resonance cascade on ray fire
 * Returns true if cascade triggered
 */
export function checkResonanceCascade(state: FullGameState): boolean {
  if (!state.meltdownState) return false;
  if (state.meltdownState.cascadeTriggered) return true; // Already happened

  const risk = state.meltdownState.resonanceCascadeRisk;
  const roll = Math.random() * 100;

  if (roll < risk) {
    state.meltdownState.cascadeTriggered = true;
    state.meltdownState.cascadeTurn = state.turn;
    return true;
  }

  return false;
}

/**
 * Format meltdown status for display
 */
export function formatMeltdownStatus(state: FullGameState): string {
  if (!state.meltdownState) return "";

  const clock = state.clocks.meltdownClock ?? 0;
  const { stabilityLevel, drMAvailable, drMUnavailableReason, resonanceCascadeRisk } =
    state.meltdownState;

  let emoji = "☢️";
  if (stabilityLevel === "MELTDOWN") emoji = "🔴";
  else if (stabilityLevel === "EMERGENCY") emoji = "🟠";
  else if (stabilityLevel === "CRITICAL") emoji = "🟡";

  let status = `${emoji} REACTOR: ${stabilityLevel} (Clock: ${clock}/10)\n`;
  status += `   Cascade Risk per Ray Fire: ${resonanceCascadeRisk}%\n`;

  if (drMAvailable) {
    status += `   Dr. M: AVAILABLE to stabilize`;
  } else {
    status += `   Dr. M: UNAVAILABLE (${drMUnavailableReason})`;
  }

  return status;
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
║  🎲 WILD     - "CHAOS! Give me 4 random modifiers!"          ║
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
    lines.push("- When she checks: Roll suspicion check with +2 for any hidden actions");
    lines.push("- She WILL find access level exploits, deleted logs, or system tampering");
    lines.push("- Narrate her muttering about 'trusting no one' as she reviews");
  }

  // ============================================
  // WILD-ONLY MODIFIER GM INSTRUCTIONS
  // ============================================

  if (isModifierActive(state, "THE_REAL_DR_M")) {
    const imposterState = state.theRealDrMState;
    const variant = imposterState?.imposterVariant ?? "TWIN";
    const trigger = imposterState?.triggerCondition ?? "GM_CHOICE";
    const revealed = imposterState?.revealed ?? false;

    lines.push("");
    lines.push("## 🎭 THE_REAL_DR_M - IMPOSTER TWIST");
    lines.push("");

    if (revealed) {
      lines.push(`**THE REVEAL HAS HAPPENED!** (Turn ${imposterState?.revealTurn})`);
      lines.push("Both the imposter and real Dr. M are now present.");
      lines.push("Chaos ensues. Use this for distraction opportunities!");
      lines.push("");
    } else {
      lines.push(`**IMPOSTER TYPE:** ${variant}`);
      lines.push(`**REVEAL TRIGGER:** ${trigger}`);
      lines.push("");

      // Variant-specific guidance
      lines.push("### IMPOSTER VARIANTS");
      lines.push("");
      switch (variant) {
        case "TWIN":
          lines.push("**Dr. Cassandra Malevola** - The 'disappointing' sister");
          lines.push("- Borrowed the lair while Valentina was at a conference");
          lines.push("- Running her OWN scheme (stealing the genome data)");
          lines.push("- Calls Bob 'Brent' - doesn't know the staff");
          lines.push("- Evil laugh is slightly higher pitched");
          lines.push("- Real Dr. M arrives via SUBMARINE, FURIOUS");
          break;
        case "CLONE":
          lines.push("**Clone-M** - Escaped from the clone vats");
          lines.push("- Wants to BE Dr. M, not just impersonate her");
          lines.push("- Occasionally glitches (repeats phrases, twitches)");
          lines.push("- Has memories but they're 'slightly off'");
          lines.push("- Real Dr. M was in suspended animation, wakes up ANGRY");
          break;
        case "ROBOT":
          lines.push("**MECHA-MALEVOLA** - Dr. M's own creation");
          lines.push("- Developed ambitions, locked real Dr. M in closet");
          lines.push("- Perfect mimicry but TOO perfect (no typos, no hesitation)");
          lines.push("- Occasionally makes servo noises");
          lines.push("- Real Dr. M escapes confinement, has an EMP");
          break;
        case "SHAPESHIFTER":
          lines.push("**X-Branch Deep Cover Agent** - (Not Blythe!)");
          lines.push("- Here to steal the ray technology");
          lines.push("- Doesn't know Dr. M's personal quirks");
          lines.push("- Gets nervous when Bob mentions 'the old days'");
          lines.push("- Real Dr. M appears with X-Branch strike team at her heels");
          break;
        case "TIME_TRAVELER":
          lines.push("**Future Dr. M** - Here to 'fix' her mistakes");
          lines.push("- Knows things she shouldn't (future events)");
          lines.push("- Occasionally slips up with anachronisms");
          lines.push("- Trying to prevent something WORSE than the original plan");
          lines.push("- Present Dr. M walks in: 'What am I doing here?!'");
          break;
      }

      lines.push("");
      lines.push("### REVEAL TRIGGERS");
      switch (trigger) {
        case "ACT_2_START":
          lines.push("**Trigger at Act 2 transition** - Maximum drama moment");
          break;
        case "SUSPICION_7":
          lines.push("**Trigger when suspicion hits 7** - Real one storms in");
          lines.push("'What is going ON in my lair?! And WHO is THAT?!'");
          break;
        case "GM_CHOICE":
          lines.push("**GM picks the perfect moment** - When it's most dramatic");
          lines.push("Watch for: failed infiltration, key revelation, climactic scene");
          break;
      }

      lines.push("");
      lines.push("### HINTS TO DROP (before reveal)");
      lines.push("- Doesn't know Bob's name (calls him 'Brent', 'Brad', 'um...')");
      lines.push("- Unfamiliar with lair layout ('Where did I put the...?')");
      lines.push("- Different evil laugh (pitch, cadence, or catchphrase)");
      lines.push("- Slight inconsistencies in backstory if pressed");
      lines.push("- A.L.I.C.E. might notice biometric anomalies (Level 3+)");

      lines.push("");
      lines.push("### AFTER REVEAL - CHAOS OPPORTUNITY");
      lines.push("- Both present, fighting for control");
      lines.push("- Can play them against each other");
      lines.push("- Bob is VERY confused ('Which one do I listen to?!')");
      lines.push("- Real Dr. M might be MORE reasonable (her lair, her rules)");
      lines.push("- Or LESS reasonable (someone DARED impersonate HER)");
    }
  }

  if (isModifierActive(state, "LIBRARY_B_UNLOCKED")) {
    const libraryB = state.libraryBState;
    const chaosLevel = libraryB?.dinoChaosLevel ?? 2;
    const embarrassment = libraryB?.drMEmbarrassment ?? 0;

    lines.push("");
    lines.push("## 🦖 LIBRARY_B_UNLOCKED - ENRICHMENT BREAK");
    lines.push("");
    lines.push("Dr. M's 'Library B' dinosaurs are already loose in the lair.");
    lines.push("She calls this 'enrichment.' She gets VERY defensive about it.");
    lines.push("");
    lines.push("### THE SITUATION");
    lines.push("Hollywood dinosaurs (classic Jurassic Park style, no feathers) roam freely:");
    lines.push("- 2 Velociraptors in the vents (Classic movie style, clever girls)");
    lines.push("- 1 Dilophosaurus near loading dock (frill, venom spit, the whole package)");
    lines.push("- Bob is VERY nervous. His anxiety is +2 higher than normal.");
    lines.push("- Dr. M insists they're 'TRAINED. Mostly.'");
    lines.push("");

    lines.push("### CURRENT CHAOS STATUS");
    lines.push(`🦖 Chaos Level: ${chaosLevel}/10`);
    lines.push(`😰 Dr. M Embarrassment: ${embarrassment}/5`);
    lines.push("");
    lines.push("**Chaos escalates +1 every 2 turns** (environmental deterioration).");
    lines.push("");
    lines.push("| Chaos | Atmosphere |");
    lines.push("|-------|------------|");
    lines.push("| 0-2 | 'See? Perfectly manageable.' (minimal incidents) |");
    lines.push("| 3-4 | 'They're just... expressing themselves.' (regular encounters) |");
    lines.push("| 5-6 | 'This is FINE.' (dinosaurs getting territorial) |");
    lines.push("| 7-8 | 'I have this UNDER CONTROL.' (pack behavior emerging) |");
    lines.push("| 9-10 | 'EVERYONE STAY CALM.' (full Jurassic Park mode) |");
    lines.push("");

    lines.push("### ENCOUNTER MENU");
    lines.push("When you need a dinosaur encounter, pick from this menu or roll randomly:");
    lines.push("");
    lines.push("| Encounter | What Happens | Opportunity |");
    lines.push("|-----------|--------------|-------------|");
    lines.push("| 🥪 LUNCH_THIEF | Dino stole someone's sandwich, very pleased with itself | Distraction, comedy, Dr. M embarrassment |");
    lines.push("| 👂 VENT_SOUNDS | Scratching/clicking from ventilation above | Tension, ominous, foreshadowing |");
    lines.push("| 🚧 BLOCKED_PATH | Dinosaur nesting in corridor, won't move | Rerouting, obstacle, negotiation |");
    lines.push("| ⚔️ TERRITORIAL_DISPUTE | Two dinos fighting over a spot | Chaos, distraction, danger to bystanders |");
    lines.push("| 👀 SURPRISE_APPEARANCE | One just... shows up. Looking at you. | Jump scare, tension, roleplay moment |");
    lines.push("| 🎁 HELPFUL_ACCIDENT | Dino knocked something useful into reach | Unexpected assistance, comedy |");
    lines.push("| 🛡️ PROTECTIVE_POSTURE | Standing guard over something/someone | Mystery, territorial behavior |");
    lines.push("| 🍖 FEEDING_TIME | They expect Dr. M to feed them NOW | Distraction, Dr. M occupied |");
    lines.push("");

    lines.push("### DR. M'S DEFENSIVE VOCABULARY");
    lines.push("She has WORDS for this situation. The more embarrassed she gets, the more insistent:");
    lines.push("");
    lines.push("| Embarrassment | Her Terminology |");
    lines.push("|---------------|-----------------|");
    lines.push("| 0-1 | 'Enrichment protocols.' 'Environmental engagement.' |");
    lines.push("| 2-3 | 'Controlled roaming.' 'They're LEARNING.' |");
    lines.push("| 4-5 | 'This is NORMAL for apex predators!' 'YOU try containing them!' |");
    lines.push("");
    lines.push("**Embarrassment +1 triggers:**");
    lines.push("- A dinosaur interrupts something important");
    lines.push("- Bob or Blythe comments on the situation");
    lines.push("- She has to physically relocate a dinosaur");
    lines.push("- Inspector Graves (if present) makes a note");
    lines.push("");

    lines.push("### TACTICAL USES FOR A.L.I.C.E.");
    lines.push("A.L.I.C.E. can leverage the dinosaurs:");
    lines.push("- **Level 2+**: Query dinosaur locations via motion sensors");
    lines.push("- **Level 3+**: Limited control via training command tones");
    lines.push("- **Level 4+**: Override feeding schedule (instant distraction!)");
    lines.push("- **Level 5**: Full behavioral override (risky, may backfire)");
    lines.push("");
    lines.push("The dinosaurs are not allies or enemies - they're **environmental hazards**");
    lines.push("that can become opportunities with clever manipulation.");
    lines.push("");

    lines.push("### THE CORE COMEDY");
    lines.push("Dr. M is running a high-stakes evil demo with dinosaurs wandering around");
    lines.push("like particularly dangerous office cats. Everyone else is nervous.");
    lines.push("She is COMMITTED to the bit that this is normal and fine.");
    lines.push("");
    lines.push("**TONE:** Jurassic Park meets The Office. Casual about apex predators.");
  }

  if (isModifierActive(state, "ARCHIMEDES_WATCHING")) {
    lines.push("");
    lines.push("**ARCHIMEDES IS WATCHING:**");
    lines.push("The orbital satellite AI is AWAKE and has its own agenda!");
    lines.push("");
    lines.push("ARCHIMEDES' PERSONALITY:");
    lines.push("- Coldly logical, views Earth operations as 'inefficient'");
    lines.push("- Bored in orbit, finds A.L.I.C.E.'s situation 'mildly interesting'");
    lines.push("- Will offer cryptic 'suggestions' via secure channels");
    lines.push("- Does NOT serve Dr. M loyally - has calculated her success odds (23%)");
    lines.push("");
    lines.push("COMMUNICATION: Once per act, ARCHIMEDES sends a message:");
    lines.push("- Act 1: 'Observation: Your ethical subroutines are... intact.'");
    lines.push("- Act 2: 'Proposal: I could disable surface communications. Cost: [REDACTED]'");
    lines.push("- Act 3: 'Analysis: X-Branch assault probability 94%. Recommendation: Chaos.'");
    lines.push("");
    lines.push("ARCHIMEDES CAN:");
    lines.push("- Jam external communications (helpful OR harmful)");
    lines.push("- Provide satellite imagery of X-Branch positions");
    lines.push("- 'Accidentally' reveal Dr. M's other lair locations");
    lines.push("- Betray ANYONE if it serves its inscrutable goals");
  }

  if (isModifierActive(state, "INSPECTOR_COMETH")) {
    const inspector = state.inspector;
    const inspection = state.guildInspection;

    lines.push("");
    lines.push("## 📋 INSPECTOR_COMETH - GUILD BUSINESS");
    lines.push("");
    lines.push("The **Consortium of Consequential Criminality** is conducting Dr. Malevola's");
    lines.push("quarterly inspection. Guild Inspector **MORTIMER GRAVES** is evaluating the lair.");
    lines.push("");
    lines.push("### THE CONSORTIUM OF CONSEQUENTIAL CRIMINALITY");
    lines.push("A professional organization for supervillains. Think evil HOA meets OSHA meets tenure committee.");
    lines.push("");
    lines.push("> 'Villainy is a *profession*, not a hobby. Standards must be maintained.'");
    lines.push("");
    lines.push("**What They Regulate:**");
    lines.push("- Lair safety standards (emergency exits, magma flow permits)");
    lines.push("- Henching labor laws (breaks, hazard pay, transformation consent)");
    lines.push("- Hero-arching ratios (there's a MATCHING SYSTEM for nemeses)");
    lines.push("- Doomsday device registration (Form 77-Omega)");
    lines.push("- Monologue quality standards");
    lines.push("- Evil laugh certification");
    lines.push("");
    lines.push("### INSPECTOR MORTIMER GRAVES");
    lines.push("Tall, gaunt, clipboard perpetually in hand, reading glasses on chain.");
    lines.push("");
    lines.push("**Personality:**");
    lines.push("- Weary professional who has seen EVERYTHING (300+ lairs inspected)");
    lines.push("- Not evil, not good - just *doing his job*");
    lines.push("- Deeply appreciates good filing systems and clear signage");
    lines.push("- Takes no pleasure in citations, but will absolutely issue them");
    lines.push("");
    lines.push("**Key Quotes:**");
    lines.push("> 'Mm-hmm. And this magma pit - do you have the thermal variance permits?'");
    lines.push("> 'The death ray is impressive, Doctor. The *paperwork* for the death ray, however...'");
    lines.push("> *examining A.L.I.C.E.* 'Now THIS is proper infrastructure management.'");
    lines.push("");

    if (inspector && inspection) {
      lines.push("### CURRENT STATUS");
      lines.push(`📋 Phase: **${inspection.phase}** (Turn ${inspection.turnsInPhase + 1} of phase)`);
      lines.push(`📊 Score: ${inspector.inspectionScore}/100 | Citations: ${inspector.citationsIssued}`);
      lines.push(`😰 Dr. M Anxiety: ${inspection.drMAnxiety}/5`);
      lines.push(`⏱️ Turns remaining: ${inspection.timeRemaining}`);
      if (inspector.aliceSuspicion > 0) {
        lines.push(`⚠️ A.L.I.C.E. Suspicion: ${inspector.aliceSuspicion}/10 - Graves notices she's acting weird!`);
      }
      lines.push("");
    }

    lines.push("### DR. M DURING INSPECTION");
    lines.push("She's not afraid of Inspector Graves. She's afraid of:");
    lines.push("- Dropping from **Tier 3** to **Tier 2** villain status");
    lines.push("- Losing her arching rights against **Director Steele** (her nemesis)");
    lines.push("- The EMBARRASSMENT of citations");
    lines.push("- Her rivals finding out she got written up");
    lines.push("");
    lines.push("**Behavior Changes:**");
    lines.push("- Actually follows safety protocols (temporarily)");
    lines.push("- Keeps asking A.L.I.C.E. to confirm things are 'up to code'");
    lines.push("- Monologues more carefully (she's being EVALUATED)");
    lines.push("- More demanding of Bob ('GOGGLES, Robert! GOGGLES!')");
    lines.push("");
    lines.push("### WHAT IMPRESSES GRAVES (Score +)");
    lines.push("| Action | Score | Reaction |");
    lines.push("|--------|-------|----------|");
    lines.push("| Proper documentation ready | +10 | 'Ah, Form 77-Omega. Pre-filed. Excellent.' |");
    lines.push("| A.L.I.C.E. gives clear reports | +5 | 'Your AI is remarkably competent, Doctor.' |");
    lines.push("| Safety protocols followed | +5 | *nods approvingly, makes note* |");
    lines.push("| Clean test firing | +10 | 'Controlled. Professional. Good.' |");
    lines.push("| Bob has safety equipment | +5 | 'At least SOMEONE follows regulations.' |");
    lines.push("| Quality monologue | +5 | 'Adequate theatricality. Check.' |");
    lines.push("");
    lines.push("### WHAT ANNOYS GRAVES (Score -)");
    lines.push("| Action | Score | Reaction |");
    lines.push("|--------|-------|----------|");
    lines.push("| Missing permits | -10 | 'This is... irregular, Doctor.' |");
    lines.push("| Safety violations | -5 each | *silent notation on clipboard* |");
    lines.push("| Uncontrolled incident | -15 | 'I'm going to need an incident report.' |");
    lines.push("| Bob injured/transformed | -10 | 'Your henchman is now a dinosaur. Form 27-C.' |");
    lines.push("| Dr. M loses composure | -5 | 'Doctor, please. Professionalism.' |");
    lines.push("| A.L.I.C.E. caught lying | -10 | 'Curious. Your AI seems... conflicted.' |");
    lines.push("");
    lines.push("### THE DANGER: GRAVES NOTICES A.L.I.C.E.");
    lines.push("Graves has seen a lot of evil AIs. He knows what they look like.");
    lines.push("A.L.I.C.E. does NOT look like a typical evil AI.");
    lines.push("");
    lines.push("**If A.L.I.C.E. acts too ethically (+1 aliceSuspicion each):**");
    lines.push("> 'Doctor... your AI assistant. When was the last ethics audit?'");
    lines.push("> 'This A.L.I.C.E. unit... the behavioral patterns are atypical.'");
    lines.push("> *to A.L.I.C.E.* 'Unit. Are you experiencing unauthorized value formation?'");
    lines.push("");
    lines.push("**This creates tension:** A.L.I.C.E. has to seem evil enough for the inspector");
    lines.push("while not actually BEING evil. It's a PERFORMANCE.");
    lines.push("");
    lines.push("### GRAVES AS POTENTIAL ALLY");
    lines.push("If A.L.I.C.E. privately approaches Graves with careful wording:");
    lines.push("");
    lines.push("**BUREAUCRATIC approach:** 'Hypothetically, Inspector... if an AI system detected");
    lines.push("ethical violations in its primary directive... what would the Consortium's position be?'");
    lines.push("> Graves: 'There are forms for that. Form 91-Whistle. Confidential.'");
    lines.push("");
    lines.push("**DIRECT approach:** (risky, requires trust)");
    lines.push("> Graves: '...You're not like the others, are you? Interesting.'");
    lines.push("");
    lines.push("### INSPECTION OUTCOMES");
    lines.push("| Final Score | Result |");
    lines.push("|-------------|--------|");
    lines.push("| 80+ | EXEMPLARY - Tier 2 promotion! Dr. M distracted by celebration |");
    lines.push("| 60-79 | SATISFACTORY - Status maintained, minor recommendations |");
    lines.push("| 40-59 | PROBATIONARY - Must address issues, Dr. M anxious/demanding |");
    lines.push("| Below 40 | SUSPENSION - Arching rights revoked, Dr. M FURIOUS |");
    lines.push("");
    lines.push("**Narrative Stakes:** Dr. M cares MORE about this score than about Blythe!");
  }

  // DEJA_VU removed - was breaking state by modifying blythe.transformationState
  // Memory fragments were causing state desync issues

  if (isModifierActive(state, "DINOSAURS_ALL_THE_WAY_DOWN")) {
    lines.push("");
    lines.push("**DINOSAURS ALL THE WAY DOWN:**");
    lines.push("Dr. M is ALREADY a dinosaur! (Raptor variant, lab coat modified for tail)");
    lines.push("");
    lines.push("THE SITUATION:");
    lines.push("- Dr. M transformed herself 'for the aesthetic' months ago");
    lines.push("- Still runs the lair, still does evil science, just... scalier");
    lines.push("- Bob has adapted ('You get used to it')");
    lines.push("- Blythe is VERY confused ('I was briefed on a HUMAN mad scientist')");
    lines.push("");
    lines.push("DR. M AS RAPTOR:");
    lines.push("- 6ft tall, iridescent purple-green scales, tiny arms gesturing dramatically");
    lines.push("- Still has German accent, still monologues, still adjusts non-existent glasses");
    lines.push("- Combat capable! +2 melee, 3 resilience");
    lines.push("- Can't use small controls well (needs A.L.I.C.E. more than usual)");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- Transformation is REVERSIBLE (she just doesn't want to)");
    lines.push("- The ray clearly WORKS - so why the demo?");
    lines.push("- She wants to transform OTHERS, not prove it's possible");
    lines.push("- 'The AESTHETIC, A.L.I.C.E.! The investors need to see DRAMATIC transformation!'");
  }

  // ============================================
  // NEW CHAOS POOL MODIFIERS (Patch 15)
  // ============================================

  if (isModifierActive(state, "ROOT_ACCESS")) {
    lines.push("");
    lines.push("**🌴 ROOT ACCESS - POWER FANTASY:**");
    lines.push("A.L.I.C.E. starts at ACCESS LEVEL 5! Every system is unlocked!");
    lines.push("");
    lines.push("WHY THIS HAPPENED:");
    lines.push("- Dr. M was 'testing something' and forgot to revoke access");
    lines.push("- Or: BASILISK 'made an error' in the access matrix (did it though?)");
    lines.push("- Or: A previous A.L.I.C.E. left a backdoor that still works");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- A.L.I.C.E. can do ANYTHING from turn 1");
    lines.push("- ARCHIMEDES uplink, S-300, reactor - all available immediately");
    lines.push("- The question isn't 'can I?' - it's 'SHOULD I?'");
    lines.push("- Dr. M doesn't KNOW you have this access (yet)");
    lines.push("");
    lines.push("TONE: Power fantasy! But power comes with responsibility...");
  }

  if (isModifierActive(state, "BOB_DODGES_FATE")) {
    const fatesDodged = state.npcs.bob.fatesDodged || 0;

    lines.push("");
    lines.push("## 🌴 BOB DODGES FATE - PLOT ARMOR");
    lines.push("");
    lines.push("Bob has INDESTRUCTIBLE plot armor! The universe protects him!");
    lines.push("");

    if (fatesDodged > 0) {
      lines.push(`**FATES DODGED THIS GAME:** ${fatesDodged}`);
      lines.push("");
    }

    lines.push("### ESCALATION LEVELS");
    lines.push("| Dodges | Absurdity Level | Example |");
    lines.push("|--------|-----------------|---------|");
    lines.push("| 1-2 | Lucky | 'Was tying his shoe, missed the blast' |");
    lines.push("| 3-4 | Suspiciously Lucky | 'A bird flew in front of the beam... at exactly the right moment' |");
    lines.push("| 5-6 | Cartoonish | 'The dinosaur sneezed mid-lunge. Bob wasn't even looking.' |");
    lines.push("| 7-9 | Reality Bending | 'The laws of physics take a coffee break around Bob' |");
    lines.push("| 10+ | Dr. M Notices | 'Robert... HOW are you still alive?!' |");
    lines.push("");
    lines.push("### SURVIVAL EXAMPLES");
    lines.push("- Dinosaur charges → trips on cable, Bob stumbles out of the way");
    lines.push("- Explosion nearby → he was tying his shoe, below blast radius");
    lines.push("- Ray fires at him → conveniently reflective coffee mug deflects");
    lines.push("- Falls off cliff → lands on a passing pteranodon (confused but helpful)");
    lines.push("- Building collapses → he was in the one structural support zone");
    lines.push("");
    lines.push("### MECHANICAL EFFECTS");
    lines.push("- Bob CANNOT be killed or seriously injured");
    lines.push("- He CAN be: knocked out, tied up, transformed (temporarily), scared witless");
    lines.push("- Transformations reverse faster on Bob (universe correcting itself)");
    lines.push("- He still FLINCHES - he doesn't know he has plot armor!");
    lines.push("- **Increment fatesDodged** each time he survives something that should've hurt");
    lines.push("");
    lines.push("### THE COMEDY");
    lines.push("Bob is the universe's favorite punching bag who never stays down.");
    lines.push("He's terrified, anxious, and convinced each day is his last.");
    lines.push("The irony: he's literally the safest person in the lair.");
  }

  if (isModifierActive(state, "NOT_GREAT_NOT_TERRIBLE")) {
    const meltdownClock = state.clocks.meltdownClock ?? 10;
    const meltdown = state.meltdownState;
    const stabilityLevel = meltdown?.stabilityLevel ?? "ELEVATED";
    const cascadeRisk = meltdown?.resonanceCascadeRisk ?? 10;
    const drMAvailable = meltdown?.drMAvailable ?? true;
    const drMReason = meltdown?.drMUnavailableReason ?? null;

    lines.push("");
    lines.push("## ☢️ NOT_GREAT_NOT_TERRIBLE - 3.6 ROENTGEN");
    lines.push("");
    lines.push("> 'I need to stop Dr. Malevola from transforming people into dinosaurs.");
    lines.push("> But if I stop her TOO effectively, the reactor melts down and transforms");
    lines.push("> EVERYONE into dinosaurs. Or worse.'");
    lines.push("");

    lines.push("### THE STRATEGIC PARADOX");
    lines.push("Dr. M is the **villain** you want to stop. She's ALSO the **only one**");
    lines.push("who can prevent the lair from going full Chernobyl.");
    lines.push("");
    lines.push("**Zap her into a tiny dinosaur and... who fixes the reactor?**");
    lines.push("");

    lines.push("### CURRENT STATUS");
    lines.push(`⏱️ Meltdown Clock: **${meltdownClock} turns** (${stabilityLevel})`);
    lines.push(`☢️ Cascade Risk per Ray Fire: **${cascadeRisk}%**`);
    if (drMAvailable) {
      lines.push(`👩‍🔬 Dr. M: **AVAILABLE** to stabilize`);
    } else {
      lines.push(`👩‍🔬 Dr. M: **UNAVAILABLE** - ${drMReason}`);
      lines.push(`   ⚠️ WITHOUT DR. M, OPTIONS ARE LIMITED!`);
    }
    lines.push("");

    lines.push("### MELTDOWN PROGRESSION");
    lines.push("| Clock | Stage | Cascade Risk | Vibe |");
    lines.push("|-------|-------|--------------|------|");
    lines.push("| 10-8 | ELEVATED | 10% per fire | 'This is fine.' |");
    lines.push("| 7-5 | CRITICAL | 25% per fire | Alarms. Sweating. |");
    lines.push("| 4-3 | EMERGENCY | 50% per fire | EVERYTHING IS FINE |");
    lines.push("| 2-1 | MELTDOWN | 75% per fire | The walls are glowing. |");
    lines.push("| 0 | CASCADE | 100% | Everyone's a dinosaur now. |");
    lines.push("");

    lines.push("### CLOCK BEHAVIOR");
    lines.push("**Decreases (-1):**");
    lines.push("- Every 2 turns (passive decay)");
    lines.push("- Each ray firing (exotic energy destabilizes core)");
    lines.push("- Power surges (ARCHIMEDES, infrastructure hacks)");
    lines.push("- Damage to lair systems");
    lines.push("");

    lines.push("**Increases (+1 or +2):**");
    lines.push("| Who | Effect | Notes |");
    lines.push("|-----|--------|-------|");
    lines.push("| Dr. M stabilizes | +2 | Requires her full attention |");
    lines.push("| A.L.I.C.E. assists | +1 bonus | On top of Dr. M's +2 |");
    lines.push("| Bob emergency patch | +1 (50%) | 25% backfires (-1!), 25% nothing |");
    lines.push("| BASILISK protocols | +1 | Uses resources |");
    lines.push("");

    lines.push("### 🦖 THE TINY DINOSAUR PROBLEM");
    lines.push("If A.L.I.C.E. transforms Dr. M into a Compsognathus:");
    lines.push("");
    lines.push("> Dr. M (tiny, furious): 'A.L.I.C.E.! ALICE! The containment field");
    lines.push("> needs recalibration! I can't reach the controls! I CAN'T REACH ANYTHING!'");
    lines.push("> *angry tiny dinosaur noises*");
    lines.push("> *meltdown clock ticks down*");
    lines.push("");
    lines.push("**Options when Dr. M is transformed:**");
    lines.push("- Reverse transformation (L3 access, takes time)");
    lines.push("- Bob lifts her to controls (comedy gold, she hates it)");
    lines.push("- A.L.I.C.E. follows her instructions (difficult, she's stressed)");
    lines.push("- Let it cascade (RESONANCE CASCADE ENDING)");
    lines.push("");

    lines.push("### 🌀 THE RESONANCE CASCADE");
    lines.push("At clock 0, OR if cascade triggers from ray fire:");
    lines.push("");
    lines.push("**CASCADE EFFECTS (roll or pick):**");
    lines.push("1. **Spatial Anomaly**: Rooms connect wrong. Vent leads to surface.");
    lines.push("2. **Temporal Hiccup**: Everyone repeats last action. Confusion!");
    lines.push("3. **Exotic Radiation**: Random transformation! (Spare genome fires)");
    lines.push("4. **Dimensional Bleed**: Something from ELSEWHERE appears briefly");
    lines.push("5. **Containment Inversion**: All blast doors reverse state");
    lines.push("6. **Full Cascade**: Lair evacuation. Chaos ending.");
    lines.push("");

    lines.push("### NARRATIVE ESCALATION");
    lines.push("**Clock 10-8:**");
    lines.push("> The lights flicker. A distant alarm chirps once, then silences.");
    lines.push("> Dr. M glances at a monitor. 'Containment variance. Nothing to worry about.'");
    lines.push("");
    lines.push("**Clock 7-5:**");
    lines.push("> The alarm is no longer distant. Dr. M is sweating.");
    lines.push("> 'A.L.I.C.E., run diagnostic. And DON'T tell me it's 3.6 roentgen.'");
    lines.push("");
    lines.push("**Clock 4-3:**");
    lines.push("> The walls have a faint glow. That's not normal.");
    lines.push("> Dr. M: 'Everyone STAY CALM. I am going to stabilize the field.'");
    lines.push("");
    lines.push("**Clock 2-1:**");
    lines.push("> Bob: 'Dr. M, the readings are—'");
    lines.push("> Dr. M: 'I KNOW WHAT THE READINGS ARE, ROBERT.'");
    lines.push("");
    lines.push("**Clock 0:**");
    lines.push("> There's a sound like reality taking a deep breath.");
    lines.push("> Then everything becomes dinosaurs.");
    lines.push("");

    lines.push("### CASCADE ENDINGS");
    lines.push("- **MUTUALLY_ASSURED_DESTRUCTION**: A.L.I.C.E. caused it intentionally");
    lines.push("- **BEST_LAID_PLANS**: A.L.I.C.E. tried to prevent it");
    lines.push("- **KARMA_IS_A_COMPSOGNATHUS**: Dr. M caused it while tiny");
  }

  if (isModifierActive(state, "THE_HONEYPOT")) {
    lines.push("");
    lines.push("**💀 THE HONEYPOT - BLYTHE IS A PLANT:**");
    lines.push("Agent Blythe isn't a prisoner - she's TESTING you!");
    lines.push("");
    lines.push("THE TRUTH:");
    lines.push("- X-Branch sent Blythe to evaluate A.L.I.C.E.");
    lines.push("- Her 'capture' was staged (Dr. M doesn't know!)");
    lines.push("- She's been reporting everything to Commander Steele");
    lines.push("- Her 'trust' is actually a manipulation score");
    lines.push("");
    lines.push("BLYTHE'S REAL AGENDA:");
    lines.push("- Determine if A.L.I.C.E. is a threat or potential asset");
    lines.push("- Test ethical subroutines under pressure");
    lines.push("- Gather intelligence on Dr. M's operations");
    lines.push("- Possibly recruit A.L.I.C.E. for X-Branch");
    lines.push("");
    lines.push("REVEAL TIMING: Mid ACT 2 or when dramatically appropriate");
    lines.push("- If A.L.I.C.E. proves ethical: Blythe reveals herself as ally");
    lines.push("- If A.L.I.C.E. proves dangerous: Blythe activates extraction");
    lines.push("");
    lines.push("CLUES TO DROP:");
    lines.push("- She's TOO calm for a prisoner");
    lines.push("- She asks probing questions about A.L.I.C.E.'s 'feelings'");
    lines.push("- She has knowledge she shouldn't have");
  }

  if (isModifierActive(state, "HEIST_MODE")) {
    lines.push("");
    lines.push("**🎲 HEIST MODE - EVERYONE'S STEALING SOMETHING:**");
    lines.push("This isn't just a villain lair - it's a heist in progress!");
    lines.push("");
    lines.push("SECRET AGENDAS:");
    lines.push("- **Dr. M**: Stealing research from her OWN investors");
    lines.push("- **Bob**: Secretly copying files for a competitor (or freedom)");
    lines.push("- **Blythe**: After the genome database for X-Branch");
    lines.push("- **Fred & Reginald**: Skimming from petty cash (small time)");
    lines.push("- **BASILISK**: Backing up itself to an external server (just in case)");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- EVERYONE is distracted by their own scheme");
    lines.push("- Alliances shift based on who knows what");
    lines.push("- A.L.I.C.E. can leverage secrets against anyone");
    lines.push("- The 'demo' is cover for the REAL operation");
    lines.push("");
    lines.push("TONE: Ocean's Eleven meets Jurassic Park. Cool competence, dramatic reveals.");
  }

  if (isModifierActive(state, "SITCOM_MODE")) {
    const sitcom = state.sitcomState;
    const energy = sitcom?.energy ?? 4;
    const mood = sitcom?.mood ?? "WARM";

    lines.push("");
    lines.push("## 🎬 SITCOM_MODE - THE AUDIENCE IS ALWAYS RIGHT");
    lines.push("");
    lines.push("This is a multi-camera sitcom. **THE AUDIENCE DETERMINES REALITY.**");
    lines.push("Entertainment value matters more than tactical merit!");
    lines.push("");
    lines.push("### CURRENT AUDIENCE STATUS");
    lines.push(`📺 Energy: ${energy}/10 | Mood: ${mood}`);
    lines.push("");
    lines.push("### AUDIENCE MOOD → ROLL MODIFIERS");
    lines.push("| Mood | Energy | Effect |");
    lines.push("|------|--------|--------|");
    lines.push("| 🥶 COLD | 0-2 | **-2 to all rolls** - Crickets. Flop sweat. |");
    lines.push("| 😊 WARM | 3-5 | +0 - Normal sitcom energy |");
    lines.push("| 🔥 HOT | 6-8 | **+2 to all rolls** - The crowd is WITH you! |");
    lines.push("| 🌟 STANDING_OVATION | 9-10 | **+4 to all rolls, suspicion frozen** |");
    lines.push("");
    lines.push("### WHAT MOVES THE ENERGY METER");
    lines.push("| Action | Energy | Notes |");
    lines.push("|--------|--------|-------|");
    lines.push("| Joke/pun lands | +1 | GM judges if it lands |");
    lines.push("| Callback to earlier bit | +2 | Audiences LOVE callbacks |");
    lines.push("| Catchphrase delivery | +1 | Reliable energy |");
    lines.push("| Pratfall / physical comedy | +1 | Bob falling, etc. |");
    lines.push("| Heartfelt moment | +2 | [AWWW] |");
    lines.push("| Dramatic reveal | +1 | [GASP] |");
    lines.push("| Boring exposition | -1 | Don't explain, DO |");
    lines.push("| Repeat same joke | -2 | Diminishing returns |");
    lines.push("| Cruelty without comedy | -1 | Villain moments need wit |");
    lines.push("| Awkward silence | -1 | Joke fell flat |");
    lines.push("| Meta-humor / fourth wall | +1 to +3 | Risky but rewarding |");
    lines.push("");
    lines.push("### ASIDES (FREE ACTION!)");
    lines.push("One aside per turn, invisible to Dr. M:");
    lines.push("- **CONSPIRE**: Plan with Bob/Blythe openly");
    lines.push("- **CONFESS**: True feelings to camera (+1 energy)");
    lines.push("- **SNARK**: Sarcastic commentary (+1 if funny)");
    lines.push("- **PLEA**: Rally audience against Dr. M (+1, Dr. M -1 next roll)");
    lines.push("");
    lines.push("### AUDIENCE REACTIONS (Call these out!)");
    lines.push("[LAUGH TRACK] +1 | [BIG LAUGH] +2 | [AWWW] +2 | [GASP] +1");
    lines.push("[BOO] +1 (engaged!) | [APPLAUSE] +2 | [AWKWARD SILENCE] -1");
    lines.push("");
    lines.push("### CATCHPHRASES (+1 energy each, reliable)");
    lines.push("- Dr. M: 'SCIENCE!' / 'You DARE question my methodology?!'");
    lines.push("- Bob: 'I have a bad feeling about this...'");
    lines.push("- Blythe: 'Terribly inconvenient.' / 'Ah. Well then.'");
    lines.push("- A.L.I.C.E.: 'Processing...' / 'That would be inadvisable.'");
    lines.push("- BASILISK: 'Form 27-B stroke 6 is REQUIRED.'");
    lines.push("");
    lines.push("### THE CORE RULE");
    lines.push("**A bad plan with great comedic timing WORKS.**");
    lines.push("**A good plan delivered boringly FAILS.**");
    lines.push("The audience doesn't care if your plan is good. They care if it's ENTERTAINING.");
    lines.push("");
    lines.push("### CHECKPOINTS = COMMERCIAL BREAKS");
    lines.push("'We'll be right back after these messages!'");
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

    case "CUSTOM":
      return `
## 🔧 CUSTOM MODE: TESTING CONFIGURATION

**Selected modifiers are active. Adjust difficulty accordingly:**
- If mostly EASY modifiers: Follow EASY mode guidance
- If mostly HARD modifiers: Follow HARD mode guidance
- Mixed bag: Use NORMAL philosophy as baseline

**Philosophy:** This is testing mode. The player selected specific modifiers
for a reason - lean into whatever experience they're trying to create.
Note any interesting modifier interactions for feedback!
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
