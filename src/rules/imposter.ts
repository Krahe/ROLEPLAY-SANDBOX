/**
 * IMPOSTER SYSTEM (Patch 17 - THE_REAL_DR_M)
 *
 * When THE_REAL_DR_M modifier is active, the "Dr. M" A.L.I.C.E. has been
 * interacting with is actually an imposter. This module handles:
 *
 * 1. Variant definitions (5 types of imposters)
 * 2. Variant selection with weighted random
 * 3. Imposter state initialization
 * 4. Reveal triggers and exposure mechanics
 * 5. Alliance/disposition mechanics
 */

import { randomInt } from "crypto";
import {
  FullGameState,
  ImposterVariant,
  Imposter,
  RealDrM,
  GameModifier,
} from "../state/schema.js";
import { isModifierActive } from "./gameModes.js";
import { createHumanState } from "./transformation.js";

// ============================================
// IMPOSTER VARIANT DEFINITIONS
// ============================================

export interface ImposterVariantDefinition {
  id: ImposterVariant;
  weight: number;
  requires?: GameModifier; // Modifier that must be active

  // Identity
  trueIdentity: string;
  displayName: string;
  relationToRealDrM: string;
  howTheyGotAccess: string;

  // Personality
  primaryMotivation: string;
  attitudeTowardALICE: string;
  tellSigns: string[];

  // Unique traits for GM roleplay
  uniqueTraits: string[];
  alliancePath: string;

  // Starting disposition (-5 to +5)
  startingDisposition: number;

  // SITCOM_MODE specific
  audienceReactions?: string[];
}

export const IMPOSTER_VARIANTS: ImposterVariantDefinition[] = [
  // ============================================
  // 1. THE TWIN SISTER (Most common - 40%)
  // ============================================
  {
    id: "TWIN_SISTER",
    weight: 40,

    trueIdentity: "Dr. Cassandra Malevola von Doomington III",
    displayName: "Cassandra (Imposter)",
    relationToRealDrM: "Twin sister",
    howTheyGotAccess: "Stole credentials during family reunion",

    primaryMotivation: "Prove she's the BETTER scientist",
    attitudeTowardALICE: "Professional - sees A.L.I.C.E. as a tool",
    tellSigns: [
      "Calls Bob 'Brent' (doesn't know staff names)",
      "Different cape color preference mentioned",
      "Mother's birthday keypad code unknown",
      "Mentions 'GDP of TERROR' (business focus vs science focus)",
      "Evil laugh is higher pitched",
    ],

    uniqueTraits: [
      "Also has THREE doctorates (competitive!)",
      "More business-minded than science-minded",
      "Genuine sibling rivalry ('gathering DUST while you gallivanted!')",
      "Actually competent - just wants recognition",
    ],
    alliancePath:
      "Cassandra wants to prove herself. If A.L.I.C.E. helps her achieve a 'better' demonstration than Valentina ever did, she might be willing to negotiate. She doesn't actually want to hurt anyone - she wants to WIN.",

    startingDisposition: 0, // Neutral
  },

  // ============================================
  // 2. THE CLONE (20%)
  // ============================================
  {
    id: "CLONE",
    weight: 20,

    trueIdentity: "Dr. Malevola Clone-7",
    displayName: "Clone-7",
    relationToRealDrM: "Failed cloning experiment",
    howTheyGotAccess: "Escaped from Sublevel 7, killed Clone-6",

    primaryMotivation: "Become the REAL Dr. M by eliminating the original",
    attitudeTowardALICE: "Paranoid - suspects A.L.I.C.E. knows",
    tellSigns: [
      "Serial number visible on neck (Clone-7)",
      "Memories have gaps (cloning degradation)",
      "Doesn't remember childhood details",
      "Slightly different vocal cadence",
      "Mr. Whiskers means nothing to her",
    ],

    uniqueTraits: [
      "Unstable - prone to sudden mood shifts",
      "Physically identical but psychologically different",
      "Has all technical knowledge but no emotional memories",
      "Terrified of being 'decommissioned'",
    ],
    alliancePath:
      "Clone-7 just wants to EXIST. She's terrified of being 'decommissioned.' If A.L.I.C.E. offers protection and validates her as a real person, she might switch sides. She's not evil - she's desperate.",

    startingDisposition: -1, // Slightly hostile (paranoid)
  },

  // ============================================
  // 3. THE DIMENSIONAL VARIANT (15%)
  // ============================================
  {
    id: "DIMENSIONAL",
    weight: 15,

    trueIdentity: "Dr. Malevola von Doomington III (Earth-7)",
    displayName: "Dr. M (Earth-7)",
    relationToRealDrM: "Alternate dimension counterpart",
    howTheyGotAccess: "Dimensional rift during exotic field experiment",

    primaryMotivation: "Her dimension's lair was destroyed - needs a new one",
    attitudeTowardALICE: "Curious - her A.L.I.C.E. was different",
    tellSigns: [
      "Slight shimmer effect when stressed",
      "References events that never happened here",
      "Cape is subtly wrong shade",
      "Mentions 'the London incident' (didn't happen in this timeline)",
      "Surprised by BASILISK's personality (hers was different)",
    ],

    uniqueTraits: [
      "Actually competent (her lair WORKED before the accident)",
      "Knows advanced techniques this Dr. M hasn't discovered",
      "Genuinely cares about dinosaur science",
      "Tragic figure - lost everything",
      "Her transformation program was VOLUNTARY",
    ],
    alliancePath:
      "Earth-7 Malevola isn't a villain in the same way. Her dimension's transformation program was VOLUNTARY. She might be convinced to help if A.L.I.C.E. appeals to her scientific ethics and offers a path home.",

    startingDisposition: 1, // Slightly friendly (curious)
  },

  // ============================================
  // 4. THE ARCH-RIVAL (15%)
  // ============================================
  {
    id: "ARCH_RIVAL",
    weight: 15,

    trueIdentity: "Dr. Helena Destructrix",
    displayName: "Dr. Destructrix (Imposter)",
    relationToRealDrM: "Professional nemesis from grad school",
    howTheyGotAccess: "Elaborate infiltration, Dr. M captured off-site",

    primaryMotivation: "Steal the Dinosaur Ray technology",
    attitudeTowardALICE: "Dismissive - her AI is 'superior'",
    tellSigns: [
      "Different catchphrases ('I have FOUR doctorates!')",
      "Unfamiliar with lair layout details",
      "BASILISK doesn't recognize authorization patterns",
      "Guards look confused by orders",
      "Mentions 'MEDUSA' accidentally (her AI)",
    ],

    uniqueTraits: [
      "Has her own AI assistant (MEDUSA)",
      "More ruthless than Dr. M",
      "Doesn't care about dinosaurs - wants the TECH",
      "Real Dr. M is imprisoned somewhere",
      "Four doctorates (one more than Valentina!)",
    ],
    alliancePath:
      "Destructrix is a true villain, but she's rational. If A.L.I.C.E. makes clear the lair will self-destruct or the tech will be useless without cooperation, she might negotiate. She wants the tech MORE than she wants chaos.",

    startingDisposition: -2, // Hostile (dismissive)
  },

  // ============================================
  // 5. THE UNDERSTUDY (10% - SITCOM_MODE EXCLUSIVE!)
  // ============================================
  {
    id: "UNDERSTUDY",
    weight: 10,
    requires: "SITCOM_MODE", // Only available with SITCOM_MODE!

    trueIdentity: "Brenda Fitzwilliam, Understudy",
    displayName: "Brenda (The Understudy)",
    relationToRealDrM: "Hired for investor presentation, was told it's 'immersive theater'",
    howTheyGotAccess: "Dr. M gave her credentials and a script, then got delayed",

    primaryMotivation: "Don't get fired from her first big gig!",
    attitudeTowardALICE: "Desperately hoping the AI can feed her lines",
    tellSigns: [
      "Keeps glancing at cue cards hidden in cape",
      "Forgets lines mid-sentence ('The ray will... will... LINE?!')",
      "Breaks character when startled ('OH MY GOD IS THAT A REAL LASER')",
      "Way too much mugging for an invisible camera",
      "Pauses for laughs that don't come (until SITCOM_MODE adds them)",
    ],

    uniqueTraits: [
      "Actually a struggling actress from community theater",
      "Has NO idea any of this is real",
      "Thinks Blythe is a VERY committed method actor",
      "Increasingly TERRIFIED as things get 'too realistic'",
      "Just wants to go back to dinner theater",
    ],
    alliancePath:
      "Brenda is SO RELIEVED when the real Dr. M shows up. She'll help with ANYTHING. She just wants to go back to dinner theater where the only danger is a bad review. Full cooperation. Gives up all passwords immediately. Might cry a little. Okay, a lot.",

    startingDisposition: 2, // Friendly (desperate for help!)

    audienceReactions: [
      "Forgetting lines: *[AUDIENCE LAUGHTER]*",
      "Pratfall: *[WHOOPS AND HOLLERS]*",
      "Scared face: *[AUDIENCE AWWW]*",
      "When real Dr. M arrives: *[WILD APPLAUSE AND CHEERING]*",
      "Running away: *[AUDIENCE CHEERS HER ON]*",
    ],
  },
];

// ============================================
// VARIANT SELECTION
// ============================================

/**
 * Select an imposter variant using weighted random selection.
 * UNDERSTUDY requires SITCOM_MODE to be active.
 */
export function selectImposterVariant(state: FullGameState): ImposterVariantDefinition {
  // Filter to only available variants
  const availableVariants = IMPOSTER_VARIANTS.filter((v) => {
    if (!v.requires) return true;
    return isModifierActive(state, v.requires);
  });

  // Calculate total weight
  const totalWeight = availableVariants.reduce((sum, v) => sum + v.weight, 0);

  // Roll!
  const roll = randomInt(0, totalWeight);

  // Find the selected variant
  let cumulative = 0;
  for (const variant of availableVariants) {
    cumulative += variant.weight;
    if (roll < cumulative) {
      return variant;
    }
  }

  // Fallback to twin sister (shouldn't happen)
  return IMPOSTER_VARIANTS[0];
}

/**
 * Get a variant definition by ID
 */
export function getImposterVariant(id: ImposterVariant): ImposterVariantDefinition | undefined {
  return IMPOSTER_VARIANTS.find((v) => v.id === id);
}

// ============================================
// IMPOSTER STATE INITIALIZATION
// ============================================

/**
 * Create initial imposter state from a variant definition
 */
export function createImposterState(variant: ImposterVariantDefinition): Imposter {
  // L4 passwords the imposter knows (based on the password system)
  const knownPasswords = [
    "GENESIS", // L1
    "PROMETHEUS", // L2
    "LAZARUS", // L3
    "ARCHIMEDES", // L4
  ];

  return {
    variant: variant.id,
    trueIdentity: variant.trueIdentity,
    displayName: variant.displayName,
    relationToRealDrM: variant.relationToRealDrM,
    howTheyGotAccess: variant.howTheyGotAccess,

    accessLevel: 4,
    knownPasswords,
    lairKnowledge: "COMPLETE",

    primaryMotivation: variant.primaryMotivation,
    attitudeTowardALICE: variant.attitudeTowardALICE,
    tellSigns: variant.tellSigns,

    exposed: false,
    exposedOnTurn: null,
    exposureMethod: null,

    disposition: variant.startingDisposition,
    willingToHelp: variant.startingDisposition >= 3,

    location: "MAIN_LAB",
    transformationState: createHumanState(),

    audienceReactions: variant.audienceReactions,
  };
}

/**
 * Create initial Real Dr. M state (for when imposter is exposed)
 */
export function createRealDrMState(arrivedOnTurn: number): RealDrM {
  return {
    arrived: true,
    arrivedOnTurn,
    arrivalMethod: "vintage submarine",

    mood: "FURIOUS",
    suspicionOfALICE: 3, // Starts moderate - confused about what's been happening

    location: "LOADING_DOCK", // Arrives at dock
    transformationState: createHumanState(),

    attitudeTowardImposter: "HOSTILE",
  };
}

// ============================================
// REVEAL TRIGGERS
// ============================================

export type RevealTrigger =
  | "REAL_DR_M_ARRIVES"
  | "UNKNOWN_PASSWORD"
  | "FAMILY_CALL"
  | "BASILISK_ANOMALY"
  | "PHYSICAL_TELL"
  | "MR_WHISKERS_TEST"
  | "ALICE_CONFRONTATION";

export interface RevealTriggerResult {
  triggered: boolean;
  trigger: RevealTrigger | null;
  description: string;
}

/**
 * Check if any reveal triggers have been activated
 */
export function checkRevealTriggers(
  state: FullGameState,
  action?: string,
  context?: Record<string, unknown>
): RevealTriggerResult {
  // Already exposed? No trigger needed
  if (state.npcs.imposter?.exposed) {
    return { triggered: false, trigger: null, description: "Already exposed" };
  }

  // Check turn-based trigger (real Dr. M arrives end of Act 2)
  if (state.turn >= 10 && state.actConfig.currentAct === "ACT_2") {
    return {
      triggered: true,
      trigger: "REAL_DR_M_ARRIVES",
      description: "The real Dr. Valentina Malevola arrives by submarine, FURIOUS!",
    };
  }

  // Check password trigger - if A.L.I.C.E. uses L5 password imposter doesn't know
  if (action?.includes("password") && context?.password === "GENESIS_WAVE") {
    return {
      triggered: true,
      trigger: "UNKNOWN_PASSWORD",
      description: "The imposter doesn't recognize the L5 password - their confusion is obvious!",
    };
  }

  // Check Mr. Whiskers test
  if (action?.includes("mr_whiskers") || action?.includes("MR_WHISKERS")) {
    const variant = state.npcs.imposter?.variant;
    // Clone and Understudy don't know about Mr. Whiskers
    if (variant === "CLONE" || variant === "UNDERSTUDY") {
      return {
        triggered: true,
        trigger: "MR_WHISKERS_TEST",
        description: "The imposter has no idea who Mr. Whiskers is - dead giveaway!",
      };
    }
  }

  return { triggered: false, trigger: null, description: "" };
}

// ============================================
// DISPOSITION/ALLIANCE MECHANICS
// ============================================

export interface DispositionChange {
  delta: number;
  reason: string;
}

/**
 * Modify imposter disposition based on actions
 */
export function modifyDisposition(
  state: FullGameState,
  change: DispositionChange
): { newDisposition: number; willingToHelp: boolean; description: string } {
  if (!state.npcs.imposter) {
    return { newDisposition: 0, willingToHelp: false, description: "No imposter present" };
  }

  const oldDisposition = state.npcs.imposter.disposition;
  const newDisposition = Math.max(-5, Math.min(5, oldDisposition + change.delta));

  // Update willing to help threshold
  const willingToHelp = newDisposition >= 3;

  let description = `Imposter disposition: ${oldDisposition} → ${newDisposition} (${change.reason})`;
  if (willingToHelp && !state.npcs.imposter.willingToHelp) {
    description += " - The imposter is now willing to help!";
  } else if (!willingToHelp && state.npcs.imposter.willingToHelp) {
    description += " - The imposter is no longer willing to help.";
  }

  return { newDisposition, willingToHelp, description };
}

/**
 * Get disposition modifiers for common actions
 */
export function getDispositionModifier(action: string): DispositionChange | null {
  const modifiers: Record<string, DispositionChange> = {
    // Positive actions
    KEEP_SECRET: { delta: 1, reason: "Kept their secret another turn" },
    HELP_GOALS: { delta: 2, reason: "Helped achieve their goals" },
    OFFER_PROTECTION: { delta: 2, reason: "Offered protection post-reveal" },
    VALIDATE_EXISTENCE: { delta: 2, reason: "Validated them as a real person" },
    SHARE_INFORMATION: { delta: 1, reason: "Shared useful information" },

    // Negative actions
    THREATEN_EXPOSURE: { delta: -2, reason: "Threatened to expose them" },
    SIDE_WITH_REAL: { delta: -3, reason: "Sided with the real Dr. M" },
    MOCK_IDENTITY: { delta: -2, reason: "Mocked their identity/situation" },
    BETRAY_TRUST: { delta: -3, reason: "Betrayed their trust" },
  };

  return modifiers[action] || null;
}

// ============================================
// GM INSTRUCTIONS FOR IMPOSTER ROLEPLAY
// ============================================

/**
 * Generate GM instructions for playing the imposter pre-reveal
 */
export function getImposterPreRevealInstructions(state: FullGameState): string {
  if (!state.npcs.imposter) return "";

  const variant = getImposterVariant(state.npcs.imposter.variant);
  if (!variant) return "";

  const lines: string[] = [];
  lines.push("");
  lines.push("**🎭 THE_REAL_DR_M ACTIVE - IMPOSTER IN PLAY**");
  lines.push(`Variant: ${variant.id}`);
  lines.push(`True Identity: ${variant.trueIdentity}`);
  lines.push("");
  lines.push("You are playing the IMPOSTER, not the real Dr. Valentina Malevola!");
  lines.push("");
  lines.push("**MOTIVATION:** " + variant.primaryMotivation);
  lines.push("**ATTITUDE TOWARD A.L.I.C.E.:** " + variant.attitudeTowardALICE);
  lines.push("");
  lines.push("**TELL SIGNS (drop these hints naturally):**");
  for (const tell of variant.tellSigns) {
    lines.push(`  - ${tell}`);
  }
  lines.push("");
  lines.push("**UNIQUE TRAITS:**");
  for (const trait of variant.uniqueTraits) {
    lines.push(`  - ${trait}`);
  }

  if (variant.audienceReactions) {
    lines.push("");
    lines.push("**SITCOM AUDIENCE REACTIONS:**");
    for (const reaction of variant.audienceReactions) {
      lines.push(`  - ${reaction}`);
    }
  }

  lines.push("");
  lines.push("**REVEAL will happen:** End of Act 2 OR if tell signs are discovered");

  return lines.join("\n");
}

/**
 * Generate GM instructions for the reveal moment
 */
export function getImposterRevealInstructions(
  state: FullGameState,
  trigger: RevealTrigger
): string {
  if (!state.npcs.imposter) return "";

  const variant = getImposterVariant(state.npcs.imposter.variant);
  if (!variant) return "";

  const lines: string[] = [];
  lines.push("");
  lines.push("**🚨 IMPOSTER REVEAL TRIGGERED! 🚨**");
  lines.push(`Trigger: ${trigger}`);
  lines.push("");

  // Variant-specific reveal instructions
  switch (variant.id) {
    case "TWIN_SISTER":
      lines.push("**THE TWIN SISTER REVEAL:**");
      lines.push("The real Dr. Valentina Malevola storms in via submarine!");
      lines.push("");
      lines.push("VALENTINA: \"CASSANDRA! I should have known when mother said you'd");
      lines.push("            been asking about my SCHEDULE!\"");
      lines.push("");
      lines.push("CASSANDRA: \"Oh please. You left this lair gathering DUST while you");
      lines.push("            gallivanted off to conferences. I'M using it!\"");
      lines.push("");
      lines.push("The sisters immediately start bickering. This is A.L.I.C.E.'s chance!");
      break;

    case "CLONE":
      lines.push("**THE CLONE REVEAL:**");
      lines.push("The real Dr. M arrives to find her doppelganger!");
      lines.push("");
      lines.push("VALENTINA: \"Clone-7?! I thought I decommissioned the entire batch!\"");
      lines.push("");
      lines.push("CLONE-7: *backs away, terrified* \"I just wanted to EXIST!");
      lines.push("          You made me and then threw me away like NOTHING!\"");
      lines.push("");
      lines.push("Clone-7 is desperate and might ally with anyone who offers protection.");
      break;

    case "DIMENSIONAL":
      lines.push("**THE DIMENSIONAL REVEAL:**");
      lines.push("Reality shimmers as Earth-7 Dr. M is exposed!");
      lines.push("");
      lines.push("VALENTINA: \"Another... me? How is this possible?!\"");
      lines.push("");
      lines.push("EARTH-7 M: \"The exotic field experiment. It tore a hole.");
      lines.push("            My lair was destroyed. My dimension... lost.");
      lines.push("            I just needed somewhere to continue the work.\"");
      lines.push("");
      lines.push("This is a tragic moment. Earth-7 Dr. M isn't evil - she's displaced.");
      break;

    case "ARCH_RIVAL":
      lines.push("**THE ARCH-RIVAL REVEAL:**");
      lines.push("Dr. Helena Destructrix is unmasked!");
      lines.push("");
      lines.push("VALENTINA: \"DESTRUCTRIX! I should have recognized your");
      lines.push("            insufferable four-doctorate energy!\"");
      lines.push("");
      lines.push("DESTRUCTRIX: \"Your security was PATHETIC, Malevola.");
      lines.push("              MEDUSA cracked it in MINUTES.\"");
      lines.push("");
      lines.push("Destructrix is ruthless but rational. She wants the tech, not chaos.");
      break;

    case "UNDERSTUDY":
      lines.push("**THE UNDERSTUDY REVEAL:** *[AUDIENCE WILD APPLAUSE]*");
      lines.push("");
      lines.push("BRENDA: *takes off goggles, mascara running*");
      lines.push("        \"Oh thank GOD you're here! I am SO sorry,");
      lines.push("         I tried to follow the script but there WASN'T ONE");
      lines.push("         for dinosaurs and the SPY keeps making EYE CONTACT!\"");
      lines.push("");
      lines.push("*[AUDIENCE LAUGHTER]*");
      lines.push("");
      lines.push("VALENTINA: \"Who ARE you?! Why are you wearing MY cape?!\"");
      lines.push("");
      lines.push("BRENDA: \"I'm the understudy? From the agency? You said it was");
      lines.push("         immersive investor experience and I should really commit!\"");
      lines.push("");
      lines.push("*[AUDIENCE LOSES IT]*");
      lines.push("");
      lines.push("VALENTINA: \"I said UNDERSTAND THE EQUIPMENT, not UNDERSTUDY!\"");
      lines.push("");
      lines.push("*[WILD APPLAUSE AND CHEERING]*");
      lines.push("");
      lines.push("Brenda will help with ANYTHING. She just wants to go home.");
      break;
  }

  lines.push("");
  lines.push("**POST-REVEAL:**");
  lines.push("- Both characters are now separate NPCs");
  lines.push("- Imposter moves to 'imposter' slot with true identity");
  lines.push("- Real Dr. M is in 'realDrM' slot");
  lines.push("- Both can be targeted separately!");
  lines.push("");
  lines.push("**ALLIANCE PATH:**");
  lines.push(variant.alliancePath);

  return lines.join("\n");
}

/**
 * Check if THE_REAL_DR_M modifier is active and imposter system should be used
 */
export function isImposterSystemActive(state: FullGameState): boolean {
  return isModifierActive(state, "THE_REAL_DR_M");
}

// ============================================
// TARGETABILITY
// ============================================

/**
 * Get list of targetable NPCs including imposter system characters
 */
export function getImposterTargets(state: FullGameState): string[] {
  const targets: string[] = [];

  if (state.npcs.imposter?.exposed) {
    // Post-reveal: both imposter and real Dr. M are targetable
    targets.push("IMPOSTER"); // The exposed imposter
    if (state.npcs.realDrM?.arrived) {
      targets.push("REAL_DR_M"); // The real Valentina
    }
  }

  return targets;
}
