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

  const defenseRoll = roll2d6(targetDodgeMod, roll.finalResult);
  let stunApplied = 0;

  if (defenseRoll.finalResult >= roll.finalResult) {
    stunApplied = 0;
  } else if (defenseRoll.finalResult === roll.finalResult - 1) {
    stunApplied = 1;
  } else {
    stunApplied = roll.outcome === "CRITICAL_SUCCESS" ? 2 : 1;
  }

  return {
    roll,
    defenseRoll,
    stunApplied,
    description: `🎲 ${attackerName} → ${targetName}: Attack ${roll.description} | Defense ${defenseRoll.description} → ${stunApplied} stun`,
  };
}


// ============================================
// 3d6 SKILL CHECK SYSTEM (Patch 22)
// ============================================
// Bell curve centered at 10.5. NPC stats + situational modifiers.
// GM requests checks, server rolls — GM cannot fudge outcomes.
//
// TN  6 = trivial  (~95%)    TN 12 = hard   (~26%)
// TN  8 = easy     (~84%)    TN 14 = very hard (~9%)
// TN 10 = normal   (~50%)    TN 16 = near impossible (~4.6%)
//                             TN 18 = miracle (natural 18 only)

export type SkillCheckOutcome =
  | "CRITICAL_FAILURE"    // Natural 3-4, always fails
  | "FAILURE"             // Below target
  | "NARROW_SUCCESS"      // Met target or beat by 1
  | "SUCCESS"             // Beat target by 2-4
  | "CRITICAL_SUCCESS";   // Natural 17-18 or beat by 5+

export interface SkillCheckRequest {
  id: string;
  description: string;
  stat: "toughness" | "combat" | "speech";
  npc: string;
  targetNumber: number;
  extraModifiers?: Array<{ source: string; value: number }>;
  onSuccess?: string;
  onFailure?: string;
  applyOnSuccess?: Record<string, unknown>;
  applyOnFailure?: Record<string, unknown>;
}

export interface SkillCheckResult {
  request: SkillCheckRequest;
  dice: [number, number, number];
  rawTotal: number;
  modifiers: Array<{ source: string; value: number }>;
  totalModifier: number;
  finalResult: number;
  success: boolean;
  margin: number;
  outcome: SkillCheckOutcome;
  display: string;
}

export function roll3d6(): [number, number, number] {
  return [randomInt(1, 7), randomInt(1, 7), randomInt(1, 7)];
}

export function rollSkillCheck(
  request: SkillCheckRequest,
  statValue: number,
  autoModifiers: Array<{ source: string; value: number }> = [],
): SkillCheckResult {
  const dice = roll3d6();
  const rawTotal = dice[0] + dice[1] + dice[2];

  const allModifiers: Array<{ source: string; value: number }> = [
    { source: `${request.npc}.${request.stat}`, value: statValue },
    ...autoModifiers,
    ...(request.extraModifiers || []),
  ];

  const totalModifier = allModifiers.reduce((sum, m) => sum + m.value, 0);
  const finalResult = rawTotal + totalModifier;

  const tn = Math.max(6, Math.min(18, request.targetNumber));

  // Natural 3-4: critical failure regardless of modifiers
  // Natural 17-18: critical success regardless of modifiers
  let outcome: SkillCheckOutcome;
  if (rawTotal <= 4) {
    outcome = "CRITICAL_FAILURE";
  } else if (rawTotal >= 17) {
    outcome = "CRITICAL_SUCCESS";
  } else {
    const margin = finalResult - tn;
    if (margin < 0) outcome = "FAILURE";
    else if (margin <= 1) outcome = "NARROW_SUCCESS";
    else if (margin <= 4) outcome = "SUCCESS";
    else outcome = "CRITICAL_SUCCESS";
  }

  const success = outcome !== "CRITICAL_FAILURE" && outcome !== "FAILURE";
  const margin = finalResult - tn;

  const modStr = allModifiers
    .filter(m => m.value !== 0)
    .map(m => `${m.value >= 0 ? "+" : ""}${m.value} ${m.source}`)
    .join(", ");

  const outcomeEmoji: Record<SkillCheckOutcome, string> = {
    CRITICAL_FAILURE: "💥",
    FAILURE: "❌",
    NARROW_SUCCESS: "⚠️",
    SUCCESS: "✅",
    CRITICAL_SUCCESS: "🌟",
  };

  const display = `🎲 ${request.description}: [${dice.join(",")}] = ${rawTotal}${modStr ? ` (${modStr})` : ""} → ${finalResult} vs TN ${tn} ${outcomeEmoji[outcome]} ${outcome.replace(/_/g, " ")}`;

  return {
    request,
    dice,
    rawTotal,
    modifiers: allModifiers,
    totalModifier,
    finalResult,
    success,
    margin,
    outcome,
    display,
  };
}

// Resolve NPC stat value from game state
export function getNpcStat(
  state: { npcs: Record<string, unknown>; lairDefense?: Record<string, unknown>; inspector?: Record<string, unknown> },
  npc: string,
  stat: "toughness" | "combat" | "speech",
): number {
  const n = npc.toLowerCase();

  if (n === "drm" || n === "dr_m" || n === "malevola") {
    return (state.npcs.drM as Record<string, number>)?.[stat] ?? 0;
  }
  if (n === "bob") {
    return (state.npcs.bob as Record<string, number>)?.[stat] ?? 0;
  }
  if (n === "blythe" || n === "agent_blythe") {
    return (state.npcs.blythe as Record<string, number>)?.[stat] ?? 0;
  }
  if (n === "fred" || n === "guard_fred") {
    return (state.lairDefense?.fred as Record<string, number>)?.[stat] ?? 0;
  }
  if (n === "reginald" || n === "guard_reginald") {
    return (state.lairDefense?.reginald as Record<string, number>)?.[stat] ?? 0;
  }
  if (n === "bruce" || n === "bruce_patagonia") {
    return (state.lairDefense?.bruce as Record<string, number>)?.[stat] ?? 0;
  }

  return 0;
}

/** The NPC tokens getNpcStat recognizes — kept in sync with the if-chain above.
 *  Used to validate GM skillCheckRequests so a bogus npc can't silently roll vs stat 0. */
const KNOWN_NPC_TOKENS = new Set([
  "drm", "dr_m", "malevola",
  "bob",
  "blythe", "agent_blythe",
  "fred", "guard_fred",
  "reginald", "guard_reginald",
  "bruce", "bruce_patagonia",
]);

/** True iff `npc` is a token getNpcStat resolves to a real NPC (else it returns stat 0). */
export function isKnownNpc(npc: string): boolean {
  return KNOWN_NPC_TOKENS.has((npc || "").toLowerCase());
}

// Get adaptation penalty from NPC transformation state
export function getAdaptationPenalty(
  state: { npcs: Record<string, unknown>; lairDefense?: Record<string, unknown> },
  npc: string,
): number {
  const n = npc.toLowerCase();
  let transformState: Record<string, unknown> | null = null;

  if (n === "blythe" || n === "agent_blythe") {
    transformState = (state.npcs.blythe as Record<string, unknown>)?.transformationState as Record<string, unknown> | null;
  } else if (n === "bob") {
    transformState = (state.npcs.bob as Record<string, unknown>)?.transformationState as Record<string, unknown> | null;
  } else if (n === "fred" || n === "guard_fred") {
    transformState = (state.lairDefense?.fred as Record<string, unknown>)?.transformationState as Record<string, unknown> | null;
  } else if (n === "reginald" || n === "guard_reginald") {
    transformState = (state.lairDefense?.reginald as Record<string, unknown>)?.transformationState as Record<string, unknown> | null;
  }

  if (!transformState || transformState.form === "HUMAN") return 0;

  const stage = transformState.adaptationStage as string;
  if (stage === "DISORIENTED") return -2;
  if (stage === "ADAPTING") return -1;
  return 0;
}
