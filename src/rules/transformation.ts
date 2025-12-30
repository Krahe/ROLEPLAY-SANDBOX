import {
  FullGameState,
  DinosaurForm,
  SpeechRetention,
  FormStats,
  FormAbilities,
  TransformationState,
} from "../state/schema.js";

// ============================================
// TRANSFORMATION MECHANICS (Patch 15 Part 2)
// ============================================
// Transformations are TRADEOFFS, not upgrades.
// Every form has strengths AND weaknesses.
//
// DESIGN PRINCIPLES:
// 1. NO HARD BLOCKS - "Harder" not "impossible" (except T-Rex through doors)
// 2. MEANINGFUL TRADEOFFS - Raptor = combat god, button-pressing challenged
// 3. CARTOON VIOLENCE - "Shot in the arm," nobody gets domed
// 4. COMEDY GOLD - Bob's tiny T-Rex arms are funny AND mechanically relevant
// 5. MIXED TEAMS OPTIMAL - Human for buttons, raptor for fighting

// ============================================
// FORM STATISTICS DEFINITIONS
// ============================================

export interface FormDefinition {
  displayName: string;
  stats: FormStats;
  abilities: FormAbilities;
  maxHits: number;
  description: string;
  specialNotes: string[];
}

export const FORM_DEFINITIONS: Record<DinosaurForm, FormDefinition> = {
  HUMAN: {
    displayName: "Human",
    stats: {
      dexterity: 0,
      combat: 0,
      speed: 0,
      resilience: 2,
      stealth: 0,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 2,
    description: "Baseline human form. Good at buttons, bad at fighting dinosaurs.",
    specialNotes: ["Baseline stats", "Can use all equipment normally"],
  },

  COMPSOGNATHUS: {
    displayName: "Compsognathus",
    stats: {
      dexterity: -2,
      combat: -3,
      speed: 2,
      resilience: 1,
      stealth: 4,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: true,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 1,
    description: "Chicken-sized dinosaur. Fits ANYWHERE but combat-useless.",
    specialNotes: [
      "VENT ACCESS: Can use ventilation system",
      "TINY: +4 stealth, fits anywhere",
      "FRAGILE: 1 hit to stun",
      "CARRY: Cannot carry objects larger than a keycard",
    ],
  },

  VELOCIRAPTOR_ACCURATE: {
    displayName: "Velociraptor (Accurate)",
    stats: {
      dexterity: -2,
      combat: 2,
      speed: 2,
      resilience: 3,
      stealth: 1,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: true,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 2,
    description: "Turkey-sized, feathered. Scientifically accurate, less terrifying.",
    specialNotes: [
      "PACK TACTICS: +1 combat per allied raptor",
      "FEATHERED: Muffles sound, +1 stealth",
      "TURKEY-SIZED: Less intimidating than JP version",
    ],
  },

  VELOCIRAPTOR_JP: {
    displayName: "Velociraptor (Jurassic Park)",
    stats: {
      dexterity: -3,
      combat: 4,
      speed: 3,
      resilience: 4,
      stealth: -1,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: true,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 2,
    description: "6ft tall, scaly, iconic. Terrifying. Claws click on floors.",
    specialNotes: [
      "PACK TACTICS: +1 combat per allied raptor",
      "CLAWS: Can damage/destroy equipment",
      "INTIMIDATE: +2 to intimidation attempts",
      "CLICK-CLICK: Claws on hard floors, -1 stealth",
    ],
  },

  VELOCIRAPTOR_BLUE: {
    displayName: "Velociraptor Blue",
    stats: {
      dexterity: -3,
      combat: 4,
      speed: 3,
      resilience: 4,
      stealth: 0,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: true,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 3,
    description: "Smart, coordinated. The 'good' raptor. Pack leader material.",
    specialNotes: [
      "PACK TACTICS: +1 combat per allied raptor",
      "SMART: +1 to tactical decisions",
      "COORDINATED: Can give simple commands to other raptors",
      "CALM: -1 to Dr. M's intimidation against you",
    ],
  },

  TYRANNOSAURUS: {
    displayName: "Tyrannosaurus Rex",
    stats: {
      dexterity: -5,
      combat: 6,
      speed: 1,
      resilience: 6,
      stealth: -4,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: false,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: true,
      isTerrifying: true,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 6,
    description: "40 feet of Cretaceous predator. CANNOT FIT THROUGH DOORS.",
    specialNotes: [
      "UNSTOPPABLE: 6 hits to stun",
      "TERRIFYING: Automatic success on intimidation vs humans",
      "WALL BREAKER: Can create new doorways (1 turn)",
      "THOOM: -4 stealth, everyone knows where you are",
      "TINY ARMS: DEX -5, many tasks functionally impossible",
      "DOOR PROBLEM: Cannot fit through standard doors",
      "TAIL: Can use tail for smashing (uses COM, not DEX)",
    ],
  },

  DILOPHOSAURUS: {
    displayName: "Dilophosaurus",
    stats: {
      dexterity: -3,
      combat: 3,
      speed: 2,
      resilience: 3,
      stealth: 0,
      speech: -2, // Always -2 due to weird vocal cords
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: true,
      hasPackTactics: false,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: true,
      hasCharge: false,
    },
    maxHits: 2,
    description: "Frilled spitter. Ranged venom attack! Weird vocal cords.",
    specialNotes: [
      "VENOM SPIT: Ranged attack (DC 6, 1 hit + blinded 2 turns)",
      "FRILL: Extra intimidating when deployed",
      "SPEECH: Always -2 (weird vocal cords, even at FULL retention)",
    ],
  },

  PTERANODON: {
    displayName: "Pteranodon",
    stats: {
      dexterity: -4,
      combat: 1,
      speed: 4,
      resilience: 2,
      stealth: 2,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: false,
      canFly: true,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 2,
    description: "Flying reptile. Bypasses all ground obstacles!",
    specialNotes: [
      "FLIGHT: Can bypass all ground-level obstacles",
      "FRAGILE: 2 hits to stun",
      "TALONS: Weak melee (COM +1)",
      "RECON: Perfect for scouting surface",
      "LANDING: Needs space to land/takeoff",
    ],
  },

  TRICERATOPS: {
    displayName: "Triceratops",
    stats: {
      dexterity: -4,
      combat: 4,
      speed: -1,
      resilience: 5,
      stealth: -3,
      speech: 0,
    },
    abilities: {
      canFitThroughDoors: false,
      canUseVents: false,
      canFly: false,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: true,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: true,
    },
    maxHits: 5,
    description: "Herbivore tank. Devastating charge attack. Door problem.",
    specialNotes: [
      "TANK: 5 hits to stun",
      "CHARGE: Devastating attack (+2 damage on charge)",
      "HORNS: Can gore obstacles",
      "SLOW: SPD -1, takes longer to move",
      "HERBIVORE: Less intimidating (no fear bonus)",
      "DOOR PROBLEM: Cannot fit through standard doors",
    ],
  },

  CANARY: {
    displayName: "Canary",
    stats: {
      dexterity: -3,
      combat: -4,
      speed: 3,
      resilience: 1,
      stealth: 3,
      speech: -1,
    },
    abilities: {
      canFitThroughDoors: true,
      canUseVents: true,
      canFly: true,
      hasVenomSpit: false,
      hasPackTactics: false,
      canBreakWalls: false,
      isTerrifying: false,
      hasFrill: false,
      hasCharge: false,
    },
    maxHits: 1,
    description: "Fallback profile when genome integrity fails. Squeaky.",
    specialNotes: [
      "FLIGHT: Sort of",
      "TINY: +3 stealth, fits in vents",
      "FRAGILE: 1 hit to stun",
      "PATHETIC: COM -4, cannot meaningfully fight",
      "SPEECH: Squeaky (-1)",
      "FALLBACK: This is what you get when genome integrity fails",
    ],
  },
};

// ============================================
// STAT CHECK RESOLUTION
// ============================================

export interface CheckResult {
  success: boolean;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  margin: number;  // Positive = success margin, negative = failure margin
  description: string;
  consequence?: string;
}

/**
 * Roll 2d6 + modifier vs DC
 */
function roll2d6(): number {
  return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

/**
 * Perform a stat check
 */
export function performCheck(
  modifier: number,
  dc: number,
  statName: string
): CheckResult {
  const roll = roll2d6();
  const total = roll + modifier;
  const margin = total - dc;
  const success = margin >= 0;

  let description: string;
  let consequence: string | undefined;

  if (success) {
    if (margin >= 3) {
      description = `Overwhelming success! (${roll}+${modifier}=${total} vs DC ${dc})`;
    } else {
      description = `Success! (${roll}+${modifier}=${total} vs DC ${dc})`;
    }
  } else {
    if (margin >= -2) {
      description = `Failure, but close. (${roll}+${modifier}=${total} vs DC ${dc})`;
      consequence = "Task takes extra time (+1 turn) or can retry";
    } else if (margin >= -4) {
      description = `Clear failure. (${roll}+${modifier}=${total} vs DC ${dc})`;
      consequence = "Task fails, can retry but may alert others";
    } else {
      description = `Disaster! (${roll}+${modifier}=${total} vs DC ${dc})`;
      consequence = "Triggers alarm, breaks thing, or comedic disaster";
    }
  }

  return {
    success,
    roll,
    modifier,
    total,
    dc,
    margin,
    description,
    consequence,
  };
}

// ============================================
// STANDARD DCs
// ============================================

export const STANDARD_DCS = {
  // Dexterity tasks
  DEX_BIG_BUTTON: 2,
  DEX_SIMPLE_LEVER: 3,
  DEX_KEYPAD: 5,
  DEX_KEYBOARD: 7,
  DEX_DELICATE: 9,
  DEX_IMPOSSIBLE: 12,

  // Combat situations
  COM_NERVOUS_CIVILIAN: 3,
  COM_DR_M: 4,  // She has NO combat training
  COM_UNARMED_HUMAN: 5,
  COM_ARMED_GUARD: 7,
  COM_TWO_GUARDS: 9,
  COM_FOUR_GUARDS: 11,

  // Stealth situations
  STL_CLUTTERED_ROOM: 4,
  STL_DISTRACTED_GUARD: 5,
  STL_ALERT_GUARD: 8,
  STL_DR_M_SEARCHING: 10,
  STL_AS_TREX: 15,

  // Speed/chase
  SPD_ESCAPE_CASUAL: 5,
  SPD_ESCAPE_PURSUIT: 8,
  SPD_CATCH_HUMAN: 6,
  SPD_OUTRUN_RAPTOR: 12,
};

// ============================================
// CHECK HANDLERS
// ============================================

export interface DexCheckParams {
  task: string;
  dc?: number;
  usingTail?: boolean;  // T-Rex alternative
}

export function performDexCheck(
  state: FullGameState,
  subjectId: string,
  params: DexCheckParams
): CheckResult {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return {
      success: false,
      roll: 0,
      modifier: 0,
      total: 0,
      dc: params.dc || STANDARD_DCS.DEX_KEYPAD,
      margin: -99,
      description: `Subject ${subjectId} not found`,
    };
  }

  // T-Rex can use tail instead of arms for some tasks
  let modifier = transformation.stats.dexterity;
  if (params.usingTail && transformation.form === "TYRANNOSAURUS") {
    // Tail uses combat stat instead, but DC increases
    modifier = transformation.stats.combat;
    params.dc = (params.dc || STANDARD_DCS.DEX_KEYPAD) + 3;
  }

  const dc = params.dc || STANDARD_DCS.DEX_KEYPAD;
  return performCheck(modifier, dc, "DEX");
}

export interface CombatCheckParams {
  situation: string;
  dc?: number;
  alliedRaptors?: number;  // For pack tactics
  isCharge?: boolean;       // Triceratops charge
}

export function performCombatCheck(
  state: FullGameState,
  subjectId: string,
  params: CombatCheckParams
): CheckResult {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return {
      success: false,
      roll: 0,
      modifier: 0,
      total: 0,
      dc: params.dc || STANDARD_DCS.COM_ARMED_GUARD,
      margin: -99,
      description: `Subject ${subjectId} not found`,
    };
  }

  let modifier = transformation.stats.combat;

  // Pack tactics bonus
  if (transformation.abilities.hasPackTactics && params.alliedRaptors) {
    modifier += params.alliedRaptors;
  }

  // Spy training bonus (Blythe)
  if (subjectId === "BLYTHE") {
    const blythe = state.npcs.blythe;
    if (blythe?.spyTrainingBonus) {
      modifier += blythe.spyTrainingBonus;
    }
  }

  // Triceratops charge bonus
  if (params.isCharge && transformation.abilities.hasCharge) {
    modifier += 2;
  }

  const dc = params.dc || STANDARD_DCS.COM_ARMED_GUARD;
  return performCheck(modifier, dc, "COM");
}

export interface StealthCheckParams {
  situation: string;
  dc?: number;
}

export function performStealthCheck(
  state: FullGameState,
  subjectId: string,
  params: StealthCheckParams
): CheckResult {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return {
      success: false,
      roll: 0,
      modifier: 0,
      total: 0,
      dc: params.dc || STANDARD_DCS.STL_ALERT_GUARD,
      margin: -99,
      description: `Subject ${subjectId} not found`,
    };
  }

  const modifier = transformation.stats.stealth;
  const dc = params.dc || STANDARD_DCS.STL_ALERT_GUARD;
  return performCheck(modifier, dc, "STL");
}

// ============================================
// HIT AND STUN MECHANICS
// ============================================

export interface DamageResult {
  hitsDealt: number;
  newHitTotal: number;
  maxHits: number;
  nowStunned: boolean;
  description: string;
}

/**
 * Apply damage to a transformed subject
 */
export function applyDamage(
  state: FullGameState,
  subjectId: string,
  hits: number,
  source: string
): DamageResult {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return {
      hitsDealt: 0,
      newHitTotal: 0,
      maxHits: 2,
      nowStunned: false,
      description: `Subject ${subjectId} not found`,
    };
  }

  // Blythe auto-injector can negate one stun
  if (subjectId === "BLYTHE" && !state.npcs.blythe?.autoInjectorUsed) {
    const newHits = transformation.currentHits + hits;
    if (newHits >= transformation.maxHits) {
      state.npcs.blythe.autoInjectorUsed = true;
      transformation.currentHits = Math.max(0, transformation.maxHits - 2);
      return {
        hitsDealt: hits,
        newHitTotal: transformation.currentHits,
        maxHits: transformation.maxHits,
        nowStunned: false,
        description: `${source} deals ${hits} hit(s). AUTO-INJECTOR DEPLOYED! Blythe recovers partially.`,
      };
    }
  }

  transformation.currentHits += hits;
  const nowStunned = transformation.currentHits >= transformation.maxHits;

  if (nowStunned && !transformation.stunned) {
    transformation.stunned = true;
    transformation.stunnedTurnsRemaining = 2;
  }

  return {
    hitsDealt: hits,
    newHitTotal: transformation.currentHits,
    maxHits: transformation.maxHits,
    nowStunned,
    description: nowStunned
      ? `${source} deals ${hits} hit(s). STUNNED! (${transformation.currentHits}/${transformation.maxHits})`
      : `${source} deals ${hits} hit(s). (${transformation.currentHits}/${transformation.maxHits})`,
  };
}

/**
 * Heal hits on a subject
 */
export function healDamage(
  state: FullGameState,
  subjectId: string,
  hits: number,
  source: string
): string {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return `Subject ${subjectId} not found`;
  }

  const oldHits = transformation.currentHits;
  transformation.currentHits = Math.max(0, transformation.currentHits - hits);

  // Unstun if below max hits
  if (transformation.stunned && transformation.currentHits < transformation.maxHits) {
    transformation.stunned = false;
    transformation.stunnedTurnsRemaining = 0;
    return `${source} heals ${oldHits - transformation.currentHits} hit(s). No longer stunned!`;
  }

  return `${source} heals ${oldHits - transformation.currentHits} hit(s). (${transformation.currentHits}/${transformation.maxHits})`;
}

/**
 * Process stun recovery at end of turn
 */
export function processStunRecovery(state: FullGameState): string[] {
  const messages: string[] = [];

  for (const subjectId of ["BOB", "BLYTHE"]) {
    const transformation = getTransformationState(state, subjectId);
    if (transformation?.stunned) {
      transformation.stunnedTurnsRemaining--;
      if (transformation.stunnedTurnsRemaining <= 0) {
        transformation.stunned = false;
        transformation.stunnedTurnsRemaining = 0;
        messages.push(`${subjectId} recovers from stun!`);
      } else {
        messages.push(`${subjectId} still stunned (${transformation.stunnedTurnsRemaining} turn(s) remaining)`);
      }
    }
  }

  return messages;
}

// ============================================
// MOVEMENT COSTS
// ============================================

export interface MovementCost {
  turns: number;
  canActAfterMove: boolean;  // For fast creatures
  description: string;
}

/**
 * Calculate movement cost based on speed
 */
export function calculateMovementCost(
  state: FullGameState,
  subjectId: string,
  distance: "ADJACENT" | "TWO_ROOMS" | "ACROSS_LAIR" | "TO_SURFACE"
): MovementCost {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return { turns: 99, canActAfterMove: false, description: "Subject not found" };
  }

  const speed = transformation.stats.speed;
  const baseCosts = {
    ADJACENT: 1,
    TWO_ROOMS: 2,
    ACROSS_LAIR: 4,
    TO_SURFACE: 4,
  };

  let baseCost = baseCosts[distance];

  // T-Rex and Triceratops can't move far due to doors
  if (!transformation.abilities.canFitThroughDoors) {
    if (distance !== "ADJACENT") {
      return {
        turns: 99,
        canActAfterMove: false,
        description: "Cannot fit through doors! Must break walls.",
      };
    }
  }

  // Speed modifies cost
  let adjustedCost = Math.max(0, baseCost - Math.floor(speed / 2));

  // Fast creatures can act after moving to adjacent room
  const canActAfterMove = speed >= 2 && distance === "ADJACENT";

  // Flying creatures bypass ground obstacles
  if (transformation.abilities.canFly && distance !== "ADJACENT") {
    adjustedCost = Math.max(1, Math.ceil(adjustedCost / 2));
  }

  return {
    turns: adjustedCost,
    canActAfterMove,
    description: canActAfterMove
      ? `Move + action possible (${adjustedCost} turn base)`
      : `${adjustedCost} turn(s) to move`,
  };
}

// ============================================
// SPECIAL ABILITIES
// ============================================

export interface VenomSpitResult {
  success: boolean;
  roll: number;
  damage: number;
  blinded: boolean;
  description: string;
}

/**
 * Dilophosaurus venom spit attack
 */
export function venomSpit(
  state: FullGameState,
  attackerId: string,
  targetDescription: string
): VenomSpitResult {
  const transformation = getTransformationState(state, attackerId);
  if (!transformation?.abilities.hasVenomSpit) {
    return {
      success: false,
      roll: 0,
      damage: 0,
      blinded: false,
      description: "Subject cannot use venom spit!",
    };
  }

  const result = performCheck(transformation.stats.combat, 6, "Venom Spit");

  if (result.success) {
    return {
      success: true,
      roll: result.roll,
      damage: 1,
      blinded: true,
      description: `VENOM SPIT hits ${targetDescription}! 1 hit + BLINDED for 2 turns.`,
    };
  } else {
    return {
      success: false,
      roll: result.roll,
      damage: 0,
      blinded: false,
      description: `Venom spit MISSES ${targetDescription}!`,
    };
  }
}

/**
 * T-Rex wall break
 */
export function wallBreak(
  state: FullGameState,
  attackerId: string,
  wallDescription: string
): CheckResult {
  const transformation = getTransformationState(state, attackerId);
  if (!transformation?.abilities.canBreakWalls) {
    return {
      success: false,
      roll: 0,
      modifier: 0,
      total: 0,
      dc: 4,
      margin: -99,
      description: "Subject cannot break walls!",
    };
  }

  // Wall breaking is almost automatic for T-Rex (DC 2-4)
  const result = performCheck(transformation.stats.combat, 4, "Wall Break");
  result.description = result.success
    ? `CRASH! ${wallDescription} is now rubble. New doorway created.`
    : `The wall holds... barely. Try again?`;

  return result;
}

/**
 * Calculate pack tactics bonus
 */
export function calculatePackTacticsBonus(
  state: FullGameState,
  raptorIds: string[]
): number {
  let bonus = 0;
  for (const id of raptorIds) {
    const transformation = getTransformationState(state, id);
    if (transformation?.abilities.hasPackTactics && !transformation.stunned) {
      bonus++;
    }
  }
  // Each raptor gives +1 to ALL other raptors in the fight
  return Math.max(0, bonus - 1);  // Don't count yourself
}

// ============================================
// TRANSFORMATION HELPERS
// ============================================

/**
 * Get transformation state for a subject
 */
export function getTransformationState(
  state: FullGameState,
  subjectId: string
): TransformationState | null {
  if (subjectId === "BOB" || subjectId.toLowerCase() === "bob") {
    return state.npcs.bob?.transformationState || null;
  }
  if (subjectId === "BLYTHE" || subjectId.toLowerCase() === "blythe") {
    return state.npcs.blythe?.transformationState || null;
  }
  return null;
}

/**
 * Create a default human transformation state
 */
export function createHumanState(): TransformationState {
  const form = FORM_DEFINITIONS.HUMAN;
  return {
    form: "HUMAN",
    speechRetention: "FULL",
    stats: { ...form.stats },
    abilities: { ...form.abilities },
    currentHits: 0,
    maxHits: form.stats.resilience,
    stunned: false,
    stunnedTurnsRemaining: 0,
    transformedOnTurn: null,
    previousForm: null,
    canRevert: true,
    revertAttempts: 0,
    partialShotsReceived: 0,  // Stacking: 3 partials = FULL_DINO!
    // ADAPTATION SYSTEM
    adaptationStage: "ADAPTED",  // Humans are already adapted to their body
    turnsPostTransformation: 0,
  };
}

/**
 * Apply speech retention modifier
 */
function applySpeechRetention(baseSpeech: number, retention: SpeechRetention): number {
  switch (retention) {
    case "FULL":
      return baseSpeech;
    case "PARTIAL":
      return baseSpeech - 2;
    case "NONE":
      return -99;  // Cannot speak
    default:
      return baseSpeech;
  }
}

/**
 * Transform a subject to a new form
 */
export function transformSubject(
  state: FullGameState,
  subjectId: string,
  newForm: DinosaurForm,
  speechRetention: SpeechRetention,
  turn: number
): string {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return `Subject ${subjectId} not found`;
  }

  const formDef = FORM_DEFINITIONS[newForm];
  if (!formDef) {
    return `Unknown form: ${newForm}`;
  }

  // 🛡️ DOUBLE-TRANSFORMATION GUARD
  // Prevent transforming an already-transformed character to another dinosaur form
  // (Reversal to human is still allowed)
  if (transformation.form !== "HUMAN" && newForm !== "HUMAN") {
    return `${subjectId} is already transformed (${FORM_DEFINITIONS[transformation.form].displayName})! Cannot transform to ${formDef.displayName}. Revert to human first.`;
  }

  // Store previous form
  transformation.previousForm = transformation.form;
  transformation.form = newForm;
  transformation.speechRetention = speechRetention;

  // Apply new stats
  transformation.stats = { ...formDef.stats };
  transformation.abilities = { ...formDef.abilities };

  // Apply speech retention modifier
  transformation.stats.speech = applySpeechRetention(formDef.stats.speech, speechRetention);

  // Reset hits to new form's resilience
  transformation.maxHits = formDef.stats.resilience;
  transformation.currentHits = 0;
  transformation.stunned = false;
  transformation.stunnedTurnsRemaining = 0;

  // Track transformation
  transformation.transformedOnTurn = turn;
  transformation.canRevert = true;

  return `${subjectId} transforms into ${formDef.displayName}!`;
}

/**
 * Revert a subject to human form
 */
export function revertSubject(
  state: FullGameState,
  subjectId: string,
  turn: number
): string {
  const transformation = getTransformationState(state, subjectId);
  if (!transformation) {
    return `Subject ${subjectId} not found`;
  }

  if (transformation.form === "HUMAN") {
    return `${subjectId} is already human!`;
  }

  if (!transformation.canRevert) {
    return `${subjectId} cannot be reverted (reversal already attempted)`;
  }

  transformation.revertAttempts++;
  return transformSubject(state, subjectId, "HUMAN", "FULL", turn);
}

// ============================================
// NARRATIVE GENERATION
// ============================================

export function describeForm(subjectId: string, form: DinosaurForm): string {
  const def = FORM_DEFINITIONS[form];
  if (!def) return `${subjectId} in unknown form`;

  return `${subjectId} (${def.displayName}): ${def.description}`;
}

export function describeAbilities(transformation: TransformationState): string[] {
  const def = FORM_DEFINITIONS[transformation.form];
  if (!def) return [];

  return def.specialNotes;
}

/**
 * Generate narrative description of a transformation
 */
export function narrateTransformation(
  subjectId: string,
  oldForm: DinosaurForm,
  newForm: DinosaurForm,
  speechRetention: SpeechRetention
): string {
  const newDef = FORM_DEFINITIONS[newForm];

  if (newForm === "HUMAN") {
    return `The emerald light fades. ${subjectId} collapses to their knees,
gasping, human once more. They look at their hands—fingers, normal fingers—
and let out a shaky laugh.

"I'm... I'm me again."`;
  }

  const speechNote =
    speechRetention === "NONE"
      ? `\n\nWhen they try to speak, only a ${newForm === "VELOCIRAPTOR_JP" ? "chirping snarl" : "bestial sound"} emerges.`
      : speechRetention === "PARTIAL"
        ? `\n\n"I'm... I'm still me. I just..." Their voice slurs, words mixing with ${newForm === "VELOCIRAPTOR_JP" ? "chirps" : "growls"}. "...can't... talk right."`
        : `\n\n"I'm still me," ${subjectId} says, voice somehow unchanged despite the reptilian mouth. "Just... different."`;

  return `The beam washes over ${subjectId}. Their scream becomes... different.
${newDef.description}

Where ${subjectId} stood, a ${newDef.displayName.toLowerCase()} rises, eyes blinking in confusion.${speechNote}`;
}

// ============================================
// QUICK REFERENCE
// ============================================

export function getQuickReference(): string {
  return `
╔══════════════════════════════════════════════════════════════╗
║  TRANSFORMATION QUICK REFERENCE                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  HUMAN      DEX+0  COM+0  SPD+0  2 hits  STL+0  Baseline    ║
║  COMPY      DEX-2  COM-3  SPD+2  1 hit   STL+4  Vents!      ║
║  RAPTOR(JP) DEX-3  COM+4  SPD+3  4 hits  STL-1  Fighter!    ║
║  T-REX      DEX-5  COM+6  SPD+1  6 hits  STL-4  No doors!   ║
║                                                              ║
║  CHECKS: 2d6 + modifier vs DC                                ║
║  KEYPAD: DC 5 | COMBAT 1v1: DC 5 | 4 GUARDS: DC 11          ║
║                                                              ║
║  PACK TACTICS: +1 COM per allied raptor in fight            ║
║  STUNNED: 0 actions for 2 turns when max hits reached       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝`;
}
