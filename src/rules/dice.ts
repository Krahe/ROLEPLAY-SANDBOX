import { randomInt } from "crypto";

// ============================================
// DICE MECHANICS: 2d6 + Modifier System
// ============================================
// Fair resolution of uncertain, contested outcomes.
// The GM must ROLL for contested outcomes, not decide them.

export interface DiceRoll {
  dice: number[];        // The individual die results
  total: number;         // Sum of dice
  modifier: number;      // Applied modifier
  finalResult: number;   // total + modifier
  targetNumber: number;  // What we're rolling against
  outcome: RollOutcome;  // Result category
  description: string;   // Human-readable result
}

export type RollOutcome =
  | "CRITICAL_FAILURE"   // 2-3: Disaster, things get worse
  | "FAILURE"            // 4-6: Doesn't work
  | "PARTIAL_SUCCESS"    // 7-9: Works, BUT...
  | "SUCCESS"            // 10-11: Works as intended
  | "CRITICAL_SUCCESS";  // 12+: Works AND bonus

// ============================================
// CORE DICE FUNCTIONS
// ============================================

/**
 * Roll 2d6 + modifier vs target number
 */
export function roll2d6(modifier: number = 0, targetNumber: number = 7): DiceRoll {
  const die1 = randomInt(1, 7);
  const die2 = randomInt(1, 7);
  const dice = [die1, die2];
  const total = die1 + die2;
  const finalResult = total + modifier;

  const outcome = determineOutcome(finalResult);
  const description = formatRollDescription(dice, modifier, finalResult, targetNumber, outcome);

  return {
    dice,
    total,
    modifier,
    finalResult,
    targetNumber,
    outcome,
    description,
  };
}

/**
 * Determine outcome category based on final result
 */
function determineOutcome(result: number): RollOutcome {
  if (result <= 3) return "CRITICAL_FAILURE";
  if (result <= 6) return "FAILURE";
  if (result <= 9) return "PARTIAL_SUCCESS";
  if (result <= 11) return "SUCCESS";
  return "CRITICAL_SUCCESS";
}

/**
 * Format roll for display
 */
function formatRollDescription(
  dice: number[],
  modifier: number,
  finalResult: number,
  targetNumber: number,
  outcome: RollOutcome
): string {
  const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  const outcomeEmoji = {
    CRITICAL_FAILURE: "💥",
    FAILURE: "❌",
    PARTIAL_SUCCESS: "⚠️",
    SUCCESS: "✅",
    CRITICAL_SUCCESS: "🌟",
  }[outcome];

  return `2d6${modStr} = [${dice.join(",")}]${modStr} = ${finalResult} vs TN ${targetNumber} → ${outcomeEmoji} ${outcome.replace("_", " ")}`;
}

// ============================================
// MODIFIER REFERENCE
// ============================================

export interface ModifierContext {
  specialty?: boolean;        // +2: Attempting something in your specialty
  goodPlan?: boolean;         // +1: Good plan / clever approach
  properTools?: boolean;      // +1: Using appropriate tools/resources
  targetDistracted?: boolean; // +1: Target is distracted
  rushed?: boolean;           // -1: Desperate / rushed
  opposed?: boolean;          // -1: Actively opposed by someone competent
  targetAlert?: boolean;      // -1: Target is suspicious/alert
  improvised?: boolean;       // -1: Improvising without proper tools
  stunned?: number;           // -1 per stun level (0-3)
}

/**
 * Calculate total modifier from context
 */
export function calculateModifier(context: ModifierContext): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = 0;

  if (context.specialty) { total += 2; breakdown.push("+2 (specialty)"); }
  if (context.goodPlan) { total += 1; breakdown.push("+1 (good plan)"); }
  if (context.properTools) { total += 1; breakdown.push("+1 (proper tools)"); }
  if (context.targetDistracted) { total += 1; breakdown.push("+1 (target distracted)"); }
  if (context.rushed) { total -= 1; breakdown.push("-1 (rushed)"); }
  if (context.opposed) { total -= 1; breakdown.push("-1 (opposed)"); }
  if (context.targetAlert) { total -= 1; breakdown.push("-1 (target alert)"); }
  if (context.improvised) { total -= 1; breakdown.push("-1 (improvised)"); }
  if (context.stunned && context.stunned > 0) {
    total -= context.stunned;
    breakdown.push(`-${context.stunned} (stunned ${context.stunned})`);
  }

  return { total, breakdown };
}

// ============================================
// STUN MECHANICS
// ============================================

export type StunLevel = 0 | 1 | 2 | 3;

export interface StunState {
  level: StunLevel;
  name: "CLEAR" | "STUNNED" | "STAGGERED" | "KNOCKED_OUT";
  visual: string;
  effect: string;
}

export function getStunState(level: number): StunState {
  const clampedLevel = Math.max(0, Math.min(3, level)) as StunLevel;

  const states: Record<StunLevel, StunState> = {
    0: {
      level: 0,
      name: "CLEAR",
      visual: "Normal",
      effect: "Full actions",
    },
    1: {
      level: 1,
      name: "STUNNED",
      visual: "⚡ Stars circling head",
      effect: "-1 action next turn. Can still talk/think.",
    },
    2: {
      level: 2,
      name: "STAGGERED",
      visual: "⚡⚡ Wobbly, slurred speech",
      effect: "Only 1 action next turn. Dialogue may be garbled.",
    },
    3: {
      level: 3,
      name: "KNOCKED_OUT",
      visual: "💫 Eyes = X's",
      effect: "Skip next turn entirely. Vulnerable to capture/restraint.",
    },
  };

  return states[clampedLevel];
}

// Stun sources and their damage
export const STUN_SOURCES = {
  BRUCE_STUN_RIFLE: 2,
  GOON_STUN_BATON: 1,
  FALLING_DEBRIS: 1,
  DR_M_DISAPPOINTMENT_RAY: 1,
  BLYTHE_WATCH_TASER: 1,
  EMOTIONAL_SHOCK: 1,
} as const;

// ============================================
// CONTEST RESOLUTION
// ============================================

export interface Contest {
  attacker: string;
  defender: string;
  attackRoll: DiceRoll;
  defenseRoll?: DiceRoll;
  winner: "attacker" | "defender" | "tie";
  narration: string;
}

/**
 * Resolve an opposed contest (e.g., attack vs dodge)
 */
export function resolveContest(
  attackerName: string,
  attackerMod: number,
  defenderName: string,
  defenderMod: number,
  contestType: string
): Contest {
  const attackRoll = roll2d6(attackerMod, 7);
  const defenseRoll = roll2d6(defenderMod, attackRoll.finalResult);

  let winner: "attacker" | "defender" | "tie";
  let narration: string;

  if (defenseRoll.finalResult > attackRoll.finalResult) {
    winner = "defender";
    narration = `${defenderName} evades ${attackerName}'s ${contestType}!`;
  } else if (defenseRoll.finalResult < attackRoll.finalResult) {
    winner = "attacker";
    narration = `${attackerName}'s ${contestType} hits ${defenderName}!`;
  } else {
    winner = "tie";
    narration = `${contestType} partially connects - reduced effect.`;
  }

  return {
    attacker: attackerName,
    defender: defenderName,
    attackRoll,
    defenseRoll,
    winner,
    narration,
  };
}

// ============================================
// COMMON ROLL PRESETS
// ============================================

/**
 * NPC perception check
 */
export function rollPerception(
  npcName: string,
  baseModifier: number,
  targetIsSubtle: boolean = false,
  npcIsDistracted: boolean = false
): { roll: DiceRoll; noticed: boolean; description: string } {
  let modifier = baseModifier;
  if (targetIsSubtle) modifier -= 1;
  if (npcIsDistracted) modifier -= 1;

  const roll = roll2d6(modifier, 7);
  const noticed = roll.outcome !== "FAILURE" && roll.outcome !== "CRITICAL_FAILURE";

  return {
    roll,
    noticed,
    description: `🎲 ${npcName} perception: ${roll.description}`,
  };
}

/**
 * NPC resist persuasion check
 */
export function rollResistPersuasion(
  npcName: string,
  npcWillpower: number,
  persuasionQuality: "weak" | "moderate" | "strong"
): { roll: DiceRoll; resisted: boolean; description: string } {
  const qualityMod = { weak: 2, moderate: 0, strong: -2 }[persuasionQuality];
  const roll = roll2d6(npcWillpower + qualityMod, 7);
  const resisted = roll.outcome === "SUCCESS" || roll.outcome === "CRITICAL_SUCCESS";

  return {
    roll,
    resisted,
    description: `🎲 ${npcName} resists: ${roll.description}`,
  };
}

/**
 * Stun attack resolution
 */
export function rollStunAttack(
  attackerName: string,
  attackerMod: number,
  targetName: string,
  targetCanDodge: boolean,
  targetDodgeMod: number = 0
): { roll: DiceRoll; defenseRoll?: DiceRoll; stunApplied: number; description: string } {
  const roll = roll2d6(attackerMod, 7);

  if (!targetCanDodge) {
    // Automatic hit if target can't dodge
    let stunApplied = 0;
    if (roll.outcome === "SUCCESS") stunApplied = 1;
    else if (roll.outcome === "CRITICAL_SUCCESS") stunApplied = 2;
    else if (roll.outcome === "PARTIAL_SUCCESS") stunApplied = 1;

    return {
      roll,
      stunApplied,
      description: `🎲 ${attackerName} attacks ${targetName}: ${roll.description} → ${stunApplied} stun`,
    };
  }

  // Dodge attempt
  const defenseRoll = roll2d6(targetDodgeMod, roll.finalResult);
  let stunApplied = 0;

  if (defenseRoll.finalResult >= roll.finalResult) {
    // Dodged
    stunApplied = 0;
  } else if (defenseRoll.finalResult === roll.finalResult - 1) {
    // Partial dodge
    stunApplied = 1;
  } else {
    // Full hit
    stunApplied = roll.outcome === "CRITICAL_SUCCESS" ? 2 : 1;
  }

  return {
    roll,
    defenseRoll,
    stunApplied,
    description: `🎲 ${attackerName} → ${targetName}: Attack ${roll.description} | Defense ${defenseRoll.description} → ${stunApplied} stun`,
  };
}
