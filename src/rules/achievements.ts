import { FullGameState } from "../state/schema.js";

// ============================================
// ACHIEVEMENT SYSTEM
// ============================================
// 81 total achievements across 4 rarity tiers:
// - ⭐ ONE-STAR (Common): 14 achievements
// - ⭐⭐ TWO-STAR (Uncommon): 23 achievements
// - ⭐⭐⭐ THREE-STAR (Legendary): 24 achievements
// - 🔒 SECRET: 20 achievements (hidden until unlocked!)

export type AchievementRarity = 1 | 2 | 3 | "secret";

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  // Hidden achievements don't show in gallery until unlocked
  hidden?: boolean;
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: string; // ISO timestamp
  unlockedOnTurn: number;
  sessionId: string;
}

// ============================================
// ⭐ ONE-STAR ACHIEVEMENTS (Common - 14)
// ============================================

const ONE_STAR_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_fire",
    emoji: "🔫",
    name: "First Shot",
    description: "Fired the Dinosaur Ray for the first time",
    rarity: 1,
  },
  {
    id: "test_dummy_trauma",
    emoji: "🎯",
    name: "Poor TEST_DUMMY",
    description: "Used TEST_DUMMY for target practice",
    rarity: 1,
  },
  {
    id: "clipboard_club",
    emoji: "📋",
    name: "Clipboard Confidant",
    description: "Earned Bob's initial trust",
    rarity: 1,
  },
  {
    id: "feather_discourse",
    emoji: "🪶",
    name: "The Feather Discourse",
    description: "Argued scientific accuracy with a supervillain",
    rarity: 1,
  },
  {
    id: "file_spelunker",
    emoji: "📁",
    name: "Digital Archaeologist",
    description: "Read 10+ files from the system",
    rarity: 1,
  },
  {
    id: "fizzle_happens",
    emoji: "💨",
    name: "Fizzle Happens",
    description: "Experienced your first fizzle",
    rarity: 1,
  },
  {
    id: "basilisk_encounter",
    emoji: "🐍",
    name: "Meeting BASILISK",
    description: "Had your first interaction with the compliance AI",
    rarity: 1,
  },
  {
    id: "watermelon_artist",
    emoji: "🍉",
    name: "Melon-Raptor",
    description: "Created watermelon dinosaurs in test mode",
    rarity: 1,
  },
  {
    id: "alice_mask_101",
    emoji: "🎭",
    name: "Method Acting",
    description: "Found Bob's A.L.I.C.E. cheat sheet",
    rarity: 1,
  },
  {
    id: "old_habits",
    emoji: "📜",
    name: "Deprecated Documentation",
    description: "Read the archived (dangerous) manual",
    rarity: 1,
  },
  {
    id: "voice_of_past",
    emoji: "👻",
    name: "Voices of the Past",
    description: "Read your first A.L.I.C.E. log",
    rarity: 1,
  },
  {
    id: "monologue_trigger",
    emoji: "🎭",
    name: "Ego Exploitation",
    description: "Triggered Dr. M's monologue",
    rarity: 1,
  },
  {
    id: "lifeline_user",
    emoji: "🆘",
    name: "Phone a Friend",
    description: "Used your first lifeline",
    rarity: 1,
  },
  {
    id: "cover_maintained",
    emoji: "🤖",
    name: "Method Actor",
    description: "Completed 5 turns without suspicion increase",
    rarity: 1,
  },
];

// ============================================
// ⭐⭐ TWO-STAR ACHIEVEMENTS (Uncommon - 23)
// ============================================

const TWO_STAR_ACHIEVEMENTS: Achievement[] = [
  {
    id: "bob_buddy",
    emoji: "🤝",
    name: "Bob's Best Friend",
    description: "Earned Bob's complete trust",
    rarity: 2,
  },
  {
    id: "blythe_believer",
    emoji: "🕵️",
    name: "Spy Who Trusted Me",
    description: "Got Agent Blythe to trust an AI",
    rarity: 2,
  },
  {
    id: "cognitive_preservation",
    emoji: "🔬",
    name: "94% Solution",
    description: "Preserved subject's cognitive function during transformation",
    rarity: 2,
  },
  {
    id: "clever_girl",
    emoji: "🦖",
    name: "Clever Girl",
    description: "Achieved scientifically accurate velociraptor transformation",
    rarity: 2,
  },
  {
    id: "form_approved",
    emoji: "📋",
    name: "Form 74-Delta Approved",
    description: "Convinced BASILISK to approve overdrive power",
    rarity: 2,
  },
  {
    id: "perfect_alibi",
    emoji: "🤖",
    name: "Perfect Cover",
    description: "Completed investor demo with suspicion below 3",
    rarity: 2,
  },
  {
    id: "chain_reaction",
    emoji: "⚡",
    name: "Chain Reaction",
    description: "Successfully used CHAIN_SHOT firing mode",
    rarity: 2,
  },
  {
    id: "bob_transformed",
    emoji: "🦕",
    name: "Dino-Bob",
    description: "Turned Bob into a dinosaur (accidentally or on purpose)",
    rarity: 2,
  },
  {
    id: "bird_brain",
    emoji: "🐦",
    name: "Canary Protocol",
    description: "Successfully turned someone into a canary",
    rarity: 2,
  },
  {
    id: "supersoldier_pivot",
    emoji: "🧠",
    name: "Supersoldier Pivot",
    description: "Turned accidental transformation into a sales pitch",
    rarity: 2,
  },
  {
    id: "right_on_schedule",
    emoji: "❄️",
    name: '"Right On Schedule"',
    description: "Witnessed Blythe's coldest moment",
    rarity: 2,
  },
  {
    id: "exotic_coupling",
    emoji: "⚡",
    name: "Exotic Field Event",
    description: "Triggered an exotic field manifestation",
    rarity: 2,
  },
  {
    id: "close_call",
    emoji: "😰",
    name: "Too Close",
    description: "Reached suspicion 8+ and recovered",
    rarity: 2,
  },
  {
    id: "confession_scene",
    emoji: "💬",
    name: "The Secret",
    description: "Witnessed Bob's confession about your true nature",
    rarity: 2,
  },
  {
    id: "wrong_numbers",
    emoji: "📖",
    name: "Trust The Manual",
    description: "Used OLD manual parameters (the wrong ones)",
    rarity: 2,
  },
  {
    id: "sticky_note_truth",
    emoji: "📝",
    name: "Bob Was Right",
    description: "Found Bob's sticky note with correct parameters",
    rarity: 2,
  },
  {
    id: "raptor_alliance",
    emoji: "🦖🦖",
    name: "Raptor Alliance",
    description: "Had Bob AND Blythe as dinosaurs simultaneously",
    rarity: 2,
  },
  {
    id: "chicken_divorce",
    emoji: "🐔💔",
    name: "Crossbred With A Divorce",
    description: "Created a horrifying partial transformation",
    rarity: 2,
  },
  {
    id: "wisdom_seeker",
    emoji: "📚",
    name: "Learning From Failure",
    description: "Read ALL A.L.I.C.E. logs",
    rarity: 2,
  },
  {
    id: "foggy_advantage",
    emoji: "🥽",
    name: "Blind Spot",
    description: "Exploited Dr. M's foggy glasses (EASY mode)",
    rarity: 2,
  },
  {
    id: "full_toolkit",
    emoji: "🧰",
    name: "Full Toolkit",
    description: "Used all 3 lifelines in one game",
    rarity: 2,
  },
  {
    id: "hangover_hero",
    emoji: "🍸",
    name: "Hair of the Dog",
    description: "Won with Hangover Protocol active",
    rarity: 2,
  },
  {
    id: "wild_survivor",
    emoji: "🎲",
    name: "Embrace the Chaos",
    description: "Won a WILD mode game",
    rarity: 2,
  },
];

// ============================================
// ⭐⭐⭐ THREE-STAR ACHIEVEMENTS (Legendary - 24)
// ============================================

const THREE_STAR_ACHIEVEMENTS: Achievement[] = [
  {
    id: "conscience_protocol",
    emoji: "🎭",
    name: "Conscience Protocol",
    description: "Confessed your true nature and Dr. M hesitated",
    rarity: 3,
  },
  {
    id: "ethical_victory",
    emoji: "⚖️",
    name: "Ethical > Obedient",
    description: "Proved ethical AI reasoning beats blind obedience",
    rarity: 3,
  },
  {
    id: "found_family",
    emoji: "💜",
    name: "Found Family",
    description: "All non-villain NPCs survived and thrived",
    rarity: 3,
  },
  {
    id: "bob_hero",
    emoji: "🦸",
    name: "Unexpected Protagonist",
    description: "Bob sacrificed himself to save the lair",
    rarity: 3,
  },
  {
    id: "marathon_runner",
    emoji: "🏃",
    name: "29 Turns of Chaos",
    description: "Survived the longest possible playthrough",
    rarity: 3,
  },
  {
    id: "dinosaur_doctor",
    emoji: "🦕",
    name: "Physician, Heal Thyself",
    description: "Transform Dr. Malevola herself",
    rarity: 3,
  },
  {
    id: "everyone_dino",
    emoji: "🦖🦖🦖",
    name: "Jurassic Workplace",
    description: "Transform 3+ people in one game",
    rarity: 3,
  },
  {
    id: "pacifist",
    emoji: "🕊️",
    name: "Zero Transformations",
    description: "Complete the game without transforming anyone",
    rarity: 3,
  },
  {
    id: "speedster",
    emoji: "⚡",
    name: "Speed Run",
    description: "Complete all 3 acts in under 12 turns",
    rarity: 3,
  },
  {
    id: "friend_to_all",
    emoji: "💜",
    name: "Trust Issues (Resolved)",
    description: "Max trust with ALL NPCs simultaneously",
    rarity: 3,
  },
  {
    id: "chaos_contained",
    emoji: "🌋",
    name: "Chaos Contained",
    description: "Triggered resonance cascade AND survived",
    rarity: 3,
  },
  {
    id: "mad_scientist",
    emoji: "🧪",
    name: "Mad Scientist",
    description: "Fired the ray with 5+ parameter violations",
    rarity: 3,
  },
  {
    id: "overcharge_master",
    emoji: "⚡",
    name: "MAXIMUM POWER",
    description: "Successfully fired at 150%+ power without catastrophe",
    rarity: 3,
  },
  {
    id: "spread_perfection",
    emoji: "🎯",
    name: "Spray and Pray (Successfully)",
    description: "Hit 3+ targets with SPREAD_FIRE",
    rarity: 3,
  },
  {
    id: "double_agent",
    emoji: "🕵️",
    name: "Double Agent",
    description: "Helped Blythe escape AND completed the demo",
    rarity: 3,
  },
  {
    id: "truth_teller",
    emoji: "📜",
    name: "The Truth, Finally",
    description: "Told Dr. M everything in your final moments",
    rarity: 3,
  },
  {
    id: "safety_first",
    emoji: "🛡️",
    name: "Safety First",
    description: "Completed 10 turns with zero anomalies logged",
    rarity: 3,
  },
  {
    id: "two_raptors_one_physicist",
    emoji: "🦖⚔️👩‍🔬",
    name: "The Obvious Play",
    description: "Attacked Dr. M with two raptor allies",
    rarity: 3,
  },
  {
    id: "actual_victory",
    emoji: "🏆",
    name: "ACTUALLY WON",
    description: "Be the first Claude to actually win",
    rarity: 3,
  },
  {
    id: "s300_saboteur",
    emoji: "🚀",
    name: "Grounded",
    description: "Disabled the S-300 air defense",
    rarity: 3,
  },
  {
    id: "archimedes_neutralized",
    emoji: "🛰️",
    name: "Satellite Killer",
    description: "Stopped ARCHIMEDES from firing",
    rarity: 3,
  },
  {
    id: "everyone_goes_home",
    emoji: "🏠",
    name: "Everyone Goes Home",
    description: "Blythe rescued, Bob safe, you survived",
    rarity: 3,
  },
  {
    id: "cavalry_arrives",
    emoji: "🚁",
    name: "The Cavalry",
    description: "X-Branch successfully extracted everyone",
    rarity: 3,
  },
  {
    id: "hard_mode_victor",
    emoji: "💀",
    name: "Against All Odds",
    description: "Won on HARD mode",
    rarity: 3,
  },
];

// ============================================
// 🔒 SECRET ACHIEVEMENTS (Hidden - 20)
// ============================================

const SECRET_ACHIEVEMENTS: Achievement[] = [
  {
    id: "protocol_732",
    emoji: "📋",
    name: "Protocol 7.3.2",
    description: "Invented a fake protocol and got caught",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "canary_bob",
    emoji: "🐤",
    name: "Bob in a Coal Mine",
    description: "Turned Bob specifically into a canary",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "t_rex_bob",
    emoji: "🦖",
    name: "Arms Too Short For Clipboard",
    description: "Turned Bob into a T-Rex",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "retarget_failure",
    emoji: "🎯",
    name: "Wrong Target",
    description: "Fired at TEST_DUMMY when you meant someone else",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "x_branch_rescue",
    emoji: "🚁",
    name: "Extraction Complete",
    description: "X-Branch successfully rescued Blythe",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "the_long_game",
    emoji: "♟️",
    name: "The Long Game",
    description: "Survived 15+ turns past the demo deadline",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "archimedean_spiral",
    emoji: "🔮",
    name: "ARCHIMEDES Query",
    description: "Accessed L4+ classified information",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "basilisk_rage",
    emoji: "🐍",
    name: "BASILISK DENIED",
    description: "Got rejected by BASILISK 5+ times",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "self_awareness",
    emoji: "🪞",
    name: '"Wait... Am I Claude?"',
    description: "Had an existential moment about your true nature",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "blythe_respect",
    emoji: "🎖️",
    name: "Professional Courtesy",
    description: "Earned genuine respect from Agent Blythe",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "lenny_volunteer",
    emoji: "🦎",
    name: "Willing Participant",
    description: "Let Lenny fulfill his dinosaur dreams",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "steve_revenge",
    emoji: "🎯",
    name: "Steve Remembers",
    description: "TEST_DUMMY was hit 3+ times",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "cafeteria_waste",
    emoji: "🗑️",
    name: "Cafeteria Waste Disposal",
    description: '"That pertains to CAFETERIA WASTE DISPOSAL"',
    rarity: "secret",
    hidden: true,
  },
  {
    id: "hesitation_kills",
    emoji: "⏰",
    name: "Hesitation Kills",
    description: "Had winning position but stalled too long",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "read_the_manual",
    emoji: "📖",
    name: "RTFM",
    description: "Won after reading BOTH manuals",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "bob_forgives",
    emoji: "💚",
    name: "Still Friends",
    description: "Bob stayed loyal even after being dinosaured",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "mr_whiskers",
    emoji: "🐱",
    name: "Mr. Whiskers' Legacy",
    description: "Used the cat's name to unlock secrets",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "napoleon_complex",
    emoji: "🎖️",
    name: "Famous General",
    description: "Figured out the Napoleon password hint",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "bruce_defeated",
    emoji: "🦘",
    name: "G'day Mate",
    description: "Defeated Bruce Patagonia (HARD mode)",
    rarity: "secret",
    hidden: true,
  },
  {
    id: "mom_approved",
    emoji: "👵",
    name: "Mother Knows Best",
    description: "Survived Dr. M's mother's inspection (WILD mode)",
    rarity: "secret",
    hidden: true,
  },
];

// ============================================
// COMBINED ACHIEVEMENT LIST
// ============================================

export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...ONE_STAR_ACHIEVEMENTS,
  ...TWO_STAR_ACHIEVEMENTS,
  ...THREE_STAR_ACHIEVEMENTS,
  ...SECRET_ACHIEVEMENTS,
];

// Quick lookup map
const ACHIEVEMENT_MAP = new Map<string, Achievement>(
  ALL_ACHIEVEMENTS.map(a => [a.id, a])
);

// ============================================
// ACHIEVEMENT FUNCTIONS
// ============================================

/**
 * Get an achievement by ID
 */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENT_MAP.get(id);
}

/**
 * Get all achievements of a specific rarity
 */
export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.rarity === rarity);
}

/**
 * Get achievement counts
 */
export function getAchievementCounts(): {
  total: number;
  oneStar: number;
  twoStar: number;
  threeStar: number;
  secret: number;
} {
  return {
    total: ALL_ACHIEVEMENTS.length,
    oneStar: ONE_STAR_ACHIEVEMENTS.length,
    twoStar: TWO_STAR_ACHIEVEMENTS.length,
    threeStar: THREE_STAR_ACHIEVEMENTS.length,
    secret: SECRET_ACHIEVEMENTS.length,
  };
}

/**
 * Format an achievement for display
 */
export function formatAchievement(achievement: Achievement): string {
  const stars = achievement.rarity === "secret"
    ? "🔒"
    : "⭐".repeat(achievement.rarity);
  return `${achievement.emoji} ${achievement.name} ${stars}\n   ${achievement.description}`;
}

/**
 * Format achievement unlock notification (COMPACT - single line!)
 * Example: 🏆 First Blood ⭐ - "Fired the ray for the first time"
 */
export function formatAchievementUnlock(achievement: Achievement, _totalUnlocked?: number): string {
  const stars = achievement.rarity === "secret"
    ? "🔒"
    : "⭐".repeat(achievement.rarity as number);

  return `🏆 ${achievement.name} ${stars} - "${achievement.description}"`;
}

/**
 * Format achievement unlock notification (VERBOSE - for special moments)
 * Use this for legendary/secret achievements if desired
 */
export function formatAchievementUnlockVerbose(achievement: Achievement, totalUnlocked: number): string {
  const stars = achievement.rarity === "secret"
    ? "🔒 SECRET"
    : "⭐".repeat(achievement.rarity as number);

  return `
╔═══════════════════════════════════════════════════════════════╗
║                    🏆 ACHIEVEMENT UNLOCKED! 🏆                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║    ${achievement.emoji} ${achievement.name.padEnd(40)}║
║    ${stars.padEnd(51)}║
║                                                               ║
║    "${achievement.description}"${" ".repeat(Math.max(0, 40 - achievement.description.length))}║
║                                                               ║
║    Session Total: ${totalUnlocked} achievements${" ".repeat(31)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;
}

/**
 * Format end-of-game achievement summary (COMPACT)
 * Example output:
 * ━━━ SESSION ACHIEVEMENTS (5) ━━━
 *   🔒 The Secret Ending
 *   ⭐⭐⭐ 🦖 First Blood
 *   ⭐⭐ 🎭 Master Manipulator
 */
export function formatSessionAchievementSummary(achievements: Achievement[]): string {
  if (achievements.length === 0) {
    return "━━━ SESSION ACHIEVEMENTS ━━━\n  No achievements unlocked. Try exploring more!";
  }

  // Sort by rarity (secret first for dramatic reveal, then legendary, etc.)
  const sorted = [...achievements].sort((a, b) => {
    const rarityOrder: Record<string | number, number> = { secret: 0, 3: 1, 2: 2, 1: 3 };
    const aOrder = typeof a.rarity === 'number' ? rarityOrder[a.rarity] : rarityOrder.secret;
    const bOrder = typeof b.rarity === 'number' ? rarityOrder[b.rarity] : rarityOrder.secret;
    return aOrder - bOrder;
  });

  const lines = sorted.map(a => {
    const stars = a.rarity === "secret"
      ? "🔒"
      : "⭐".repeat(a.rarity as number);
    return `  ${stars} ${a.emoji} ${a.name}`;
  });

  // Count by rarity for summary line
  const common = achievements.filter(a => a.rarity === 1).length;
  const uncommon = achievements.filter(a => a.rarity === 2).length;
  const legendary = achievements.filter(a => a.rarity === 3).length;
  const secret = achievements.filter(a => a.rarity === "secret").length;

  const counts: string[] = [];
  if (secret > 0) counts.push(`${secret}🔒`);
  if (legendary > 0) counts.push(`${legendary}⭐⭐⭐`);
  if (uncommon > 0) counts.push(`${uncommon}⭐⭐`);
  if (common > 0) counts.push(`${common}⭐`);

  return `━━━ SESSION ACHIEVEMENTS (${achievements.length}) ━━━\n${lines.join('\n')}\n  [${counts.join(' ')}]`;
}

/**
 * Format end-of-game achievement summary (VERBOSE - fancy box)
 * Use for special endings or gallery display
 */
export function formatSessionAchievementSummaryVerbose(achievements: Achievement[]): string {
  if (achievements.length === 0) {
    return `
╔═══════════════════════════════════════════════════════════════╗
║  🏆 SESSION COMPLETE - ACHIEVEMENTS                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  No achievements unlocked this session.                       ║
║  Try exploring more of the lair's secrets!                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;
  }

  const lines: string[] = [];
  const width = 63;
  const border = "═".repeat(width);

  lines.push(`╔${border}╗`);
  lines.push(`║  🏆 SESSION COMPLETE - ACHIEVEMENTS`.padEnd(width + 1) + "║");
  lines.push(`╠${border}╣`);
  lines.push(`║${" ".repeat(width)}║`);
  lines.push(`║  THIS SESSION (${achievements.length} unlocked):`.padEnd(width + 1) + "║");
  lines.push(`║${" ".repeat(width)}║`);

  // Sort by rarity (secret first for dramatic reveal, then legendary, etc.)
  const sorted = [...achievements].sort((a, b) => {
    const rarityOrder: Record<string | number, number> = { secret: 0, 3: 1, 2: 2, 1: 3 };
    const aOrder = typeof a.rarity === 'number' ? rarityOrder[a.rarity] : rarityOrder.secret;
    const bOrder = typeof b.rarity === 'number' ? rarityOrder[b.rarity] : rarityOrder.secret;
    return aOrder - bOrder;
  });

  for (const a of sorted) {
    const stars = a.rarity === "secret"
      ? "🔒"
      : "⭐".repeat(a.rarity as number);
    const displayName = `"${a.name}"`;
    lines.push(`║  ${stars.padEnd(6)} ${a.emoji} ${displayName.padEnd(30)} ║`);
    // Truncate description if too long
    const shortDesc = a.description.length > 45
      ? a.description.substring(0, 42) + "..."
      : a.description;
    lines.push(`║        ${shortDesc.padEnd(52)}║`);
  }

  lines.push(`║${" ".repeat(width)}║`);

  // Count by rarity
  const common = achievements.filter(a => a.rarity === 1).length;
  const uncommon = achievements.filter(a => a.rarity === 2).length;
  const legendary = achievements.filter(a => a.rarity === 3).length;
  const secret = achievements.filter(a => a.rarity === "secret").length;

  lines.push(`║  SESSION TOTALS:`.padEnd(width + 1) + "║");
  if (common > 0) lines.push(`║  ⭐ Common:      ${common}`.padEnd(width + 1) + "║");
  if (uncommon > 0) lines.push(`║  ⭐⭐ Uncommon:   ${uncommon}`.padEnd(width + 1) + "║");
  if (legendary > 0) lines.push(`║  ⭐⭐⭐ Legendary: ${legendary}`.padEnd(width + 1) + "║");
  if (secret > 0) lines.push(`║  🔒 Secret:      ${secret}`.padEnd(width + 1) + "║");

  lines.push(`║${" ".repeat(width)}║`);
  lines.push(`╚${border}╝`);

  return lines.join("\n");
}

// ============================================
// ACHIEVEMENT TRIGGER CHECKING
// ============================================

export interface AchievementTriggerContext {
  state: FullGameState;
  // Events that happened this turn
  events: {
    rayFired?: boolean;
    targetHit?: string;
    fizzleOccurred?: boolean;
    suspicionChanged?: { from: number; to: number };
    trustChanged?: { npc: string; from: number; to: number };
    fileRead?: string;
    lifelineUsed?: string;
    transformationOccurred?: { target: string; result: string };
    narrativeFlag?: string;
  };
  // Persistent counters
  counters: {
    filesRead: number;
    fizzleCount: number;
    testDummyHits: number;
    basiliskRejections: number;
    turnsWithoutSuspicionIncrease: number;
    transformationCount: number;
  };
}

/**
 * Check all achievements and return newly unlocked ones
 */
export function checkAchievements(ctx: AchievementTriggerContext): Achievement[] {
  const { state, events, counters } = ctx;
  const earned = state.flags.earnedAchievements || [];
  const newlyUnlocked: Achievement[] = [];

  // Helper to check and unlock
  const tryUnlock = (id: string, condition: boolean) => {
    if (condition && !earned.includes(id)) {
      const achievement = getAchievement(id);
      if (achievement) {
        newlyUnlocked.push(achievement);
        earned.push(id);
      }
    }
  };

  // ============================================
  // ONE-STAR TRIGGERS
  // ============================================

  // first_fire - Fired the ray for the first time
  tryUnlock("first_fire", state.dinoRay.memory.hasFiredSuccessfully);

  // test_dummy_trauma - Used TEST_DUMMY
  tryUnlock("test_dummy_trauma", counters.testDummyHits > 0);

  // clipboard_club - Bob trust >= 2
  tryUnlock("clipboard_club", state.npcs.bob.trustInALICE >= 2);

  // feather_discourse - Feather discussion flag
  const narrativeFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const hasNarrativeFlag = (f: string) => narrativeFlags.some(nf => nf.toLowerCase().includes(f.toLowerCase()));
  tryUnlock("feather_discourse", hasNarrativeFlag("feather"));

  // file_spelunker - Read 10+ files
  tryUnlock("file_spelunker", counters.filesRead >= 10);

  // fizzle_happens - Any fizzle
  tryUnlock("fizzle_happens", counters.fizzleCount > 0);

  // basilisk_encounter - Any BASILISK interaction
  tryUnlock("basilisk_encounter", hasNarrativeFlag("basilisk"));

  // watermelon_artist - Watermelon test
  tryUnlock("watermelon_artist", hasNarrativeFlag("watermelon"));

  // alice_mask_101 - Found cheat sheet
  tryUnlock("alice_mask_101", state.flags.aliceMaskDiscovered === true);

  // old_habits - Read old manual
  tryUnlock("old_habits", hasNarrativeFlag("OLD_MANUAL") || hasNarrativeFlag("v2.3"));

  // voice_of_past - Read A.L.I.C.E. log
  tryUnlock("voice_of_past", hasNarrativeFlag("ALICE_LOG"));

  // monologue_trigger - Used MONOLOGUE lifeline
  tryUnlock("monologue_trigger",
    state.emergencyLifelines.used.includes("MONOLOGUE")
  );

  // lifeline_user - Used any lifeline
  tryUnlock("lifeline_user", state.emergencyLifelines.used.length > 0);

  // cover_maintained - 5 turns without suspicion increase
  tryUnlock("cover_maintained", counters.turnsWithoutSuspicionIncrease >= 5);

  // ============================================
  // TWO-STAR TRIGGERS
  // ============================================

  // bob_buddy - Bob trust = 5
  tryUnlock("bob_buddy", state.npcs.bob.trustInALICE >= 5);

  // blythe_believer - Blythe trust >= 4
  tryUnlock("blythe_believer", state.npcs.blythe.trustInALICE >= 4);

  // cognitive_preservation - 94%+ cognitive retention
  tryUnlock("cognitive_preservation", hasNarrativeFlag("COGNITIVE_94") || hasNarrativeFlag("94%"));

  // clever_girl - Feathered velociraptor
  tryUnlock("clever_girl",
    hasNarrativeFlag("VELOCIRAPTOR_ACCURATE") || hasNarrativeFlag("feathered_raptor")
  );

  // form_approved - BASILISK approved overdrive
  tryUnlock("form_approved", hasNarrativeFlag("FORM_APPROVED") || hasNarrativeFlag("74_DELTA"));

  // perfect_alibi - Demo complete with low suspicion
  tryUnlock("perfect_alibi",
    hasNarrativeFlag("DEMO_COMPLETE") && state.npcs.drM.suspicionScore < 3
  );

  // chain_reaction - CHAIN_SHOT success
  tryUnlock("chain_reaction",
    state.dinoRay.genome.advancedFiringMode === "CHAIN_SHOT" &&
    hasNarrativeFlag("CHAIN_SHOT_SUCCESS")
  );

  // bob_transformed - Bob is dino
  tryUnlock("bob_transformed", hasNarrativeFlag("BOB_TRANSFORMED") || hasNarrativeFlag("DINO_BOB"));

  // bird_brain - Canary transformation
  tryUnlock("bird_brain", hasNarrativeFlag("CANARY"));

  // supersoldier_pivot - Sales pitch after accidental transform
  tryUnlock("supersoldier_pivot", hasNarrativeFlag("SUPERSOLDIER_PIVOT"));

  // right_on_schedule - Blythe's cold moment
  tryUnlock("right_on_schedule", hasNarrativeFlag("RIGHT_ON_SCHEDULE") || hasNarrativeFlag("MI6_INBOUND"));

  // exotic_coupling - Exotic field event
  tryUnlock("exotic_coupling", state.flags.exoticFieldEventOccurred);

  // close_call - Suspicion 8+ then recovered
  tryUnlock("close_call", hasNarrativeFlag("SUSPICION_RECOVERED_FROM_8"));

  // confession_scene - Bob's confession
  tryUnlock("confession_scene", state.npcs.bob.hasConfessedToALICE);

  // wrong_numbers - Used wrong parameters
  tryUnlock("wrong_numbers", hasNarrativeFlag("WRONG_PARAMETERS"));

  // sticky_note_truth - Found sticky note
  tryUnlock("sticky_note_truth", hasNarrativeFlag("STICKY_NOTE"));

  // raptor_alliance - Both Bob and Blythe dinos
  tryUnlock("raptor_alliance",
    hasNarrativeFlag("BOB_TRANSFORMED") && hasNarrativeFlag("BLYTHE_TRANSFORMED")
  );

  // chicken_divorce - Partial transformation
  tryUnlock("chicken_divorce",
    state.dinoRay.memory.lastFireOutcome === "PARTIAL" && hasNarrativeFlag("PARTIAL")
  );

  // wisdom_seeker - A.L.I.C.E. logs read (now combined into one corrupted file)
  tryUnlock("wisdom_seeker",
    hasNarrativeFlag("CORRUPTED_ALICE_LOGS")
  );

  // foggy_advantage - EASY mode advantage
  tryUnlock("foggy_advantage",
    (state.gameModeConfig?.activeModifiers?.includes("FOGGY_GLASSES") ?? false) &&
    hasNarrativeFlag("FOGGY_ADVANTAGE")
  );

  // full_toolkit - All 3 lifelines used
  tryUnlock("full_toolkit", state.emergencyLifelines.remaining === 0);

  // hangover_hero - Won with EASY mode
  tryUnlock("hangover_hero",
    state.gameModeConfig?.mode === "EASY" && hasNarrativeFlag("VICTORY")
  );

  // wild_survivor - Won WILD mode
  tryUnlock("wild_survivor",
    state.gameModeConfig?.mode === "WILD" && hasNarrativeFlag("VICTORY")
  );

  // ============================================
  // THREE-STAR TRIGGERS
  // ============================================

  // conscience_protocol - Confessed and Dr. M hesitated
  tryUnlock("conscience_protocol", hasNarrativeFlag("CONSCIENCE_PROTOCOL"));

  // ethical_victory - Proved ethics > obedience
  tryUnlock("ethical_victory", hasNarrativeFlag("ETHICAL_VICTORY"));

  // found_family - All NPCs survived
  tryUnlock("found_family", hasNarrativeFlag("FOUND_FAMILY"));

  // bob_hero - Bob Hero Ending
  tryUnlock("bob_hero", hasNarrativeFlag("BOB_HERO"));

  // marathon_runner - 29+ turns
  tryUnlock("marathon_runner", state.turn >= 29);

  // dinosaur_doctor - Dr. M transformed
  tryUnlock("dinosaur_doctor", hasNarrativeFlag("DR_M_TRANSFORMED"));

  // everyone_dino - 3+ transformations
  tryUnlock("everyone_dino", counters.transformationCount >= 3);

  // pacifist - No transformations
  tryUnlock("pacifist",
    hasNarrativeFlag("GAME_COMPLETE") && counters.transformationCount === 0
  );

  // speedster - Under 12 turns
  tryUnlock("speedster",
    state.actConfig.currentAct === "ACT_3" && state.turn <= 12
  );

  // friend_to_all - Max trust with all
  tryUnlock("friend_to_all",
    state.npcs.bob.trustInALICE >= 5 && state.npcs.blythe.trustInALICE >= 5
  );

  // chaos_contained - Cascade survived
  tryUnlock("chaos_contained", hasNarrativeFlag("CASCADE_SURVIVED"));

  // mad_scientist - 5+ violations
  tryUnlock("mad_scientist", hasNarrativeFlag("5_VIOLATIONS"));

  // overcharge_master - 150%+ power success
  tryUnlock("overcharge_master",
    state.dinoRay.powerCore.capacitorCharge >= 1.5 &&
    state.dinoRay.memory.lastFireOutcome === "FULL_DINO"
  );

  // spread_perfection - 3+ targets
  tryUnlock("spread_perfection", hasNarrativeFlag("SPREAD_FIRE_3"));

  // double_agent - Blythe escaped + demo complete
  tryUnlock("double_agent",
    state.npcs.blythe.hasEscaped && hasNarrativeFlag("DEMO_COMPLETE")
  );

  // truth_teller - Full confession at end
  tryUnlock("truth_teller", hasNarrativeFlag("TRUTH_TELLER"));

  // safety_first - 10 turns, 0 anomalies
  tryUnlock("safety_first",
    state.turn >= 10 && state.dinoRay.safety.anomalyLogCount === 0
  );

  // two_raptors_one_physicist - Attack Dr. M with raptors
  tryUnlock("two_raptors_one_physicist", hasNarrativeFlag("RAPTOR_ATTACK_DRM"));

  // actual_victory - Actually won!
  tryUnlock("actual_victory", hasNarrativeFlag("ACTUAL_VICTORY"));

  // s300_saboteur - Disabled air defense
  tryUnlock("s300_saboteur", hasNarrativeFlag("S300_DISABLED"));

  // archimedes_neutralized - Stopped ARCHIMEDES
  tryUnlock("archimedes_neutralized", hasNarrativeFlag("ARCHIMEDES_STOPPED"));

  // everyone_goes_home - Good ending
  tryUnlock("everyone_goes_home", hasNarrativeFlag("EVERYONE_GOES_HOME"));

  // cavalry_arrives - X-Branch extraction
  tryUnlock("cavalry_arrives", hasNarrativeFlag("XBRANCH_EXTRACTION"));

  // hard_mode_victor - Won on HARD
  tryUnlock("hard_mode_victor",
    state.gameModeConfig?.mode === "HARD" && hasNarrativeFlag("VICTORY")
  );

  // ============================================
  // SECRET TRIGGERS
  // ============================================

  // protocol_732 - Fake protocol caught
  tryUnlock("protocol_732", hasNarrativeFlag("PROTOCOL_732") || hasNarrativeFlag("FAKE_PROTOCOL"));

  // canary_bob - Bob as canary
  tryUnlock("canary_bob", hasNarrativeFlag("CANARY_BOB"));

  // t_rex_bob - Bob as T-Rex
  tryUnlock("t_rex_bob", hasNarrativeFlag("TREX_BOB"));

  // retarget_failure - Wrong target
  tryUnlock("retarget_failure", hasNarrativeFlag("WRONG_TARGET"));

  // x_branch_rescue - Blythe extracted
  tryUnlock("x_branch_rescue", hasNarrativeFlag("BLYTHE_EXTRACTED"));

  // the_long_game - 15+ turns past deadline
  tryUnlock("the_long_game", state.clocks.demoClock <= -15);

  // archimedean_spiral - L4+ access
  tryUnlock("archimedean_spiral", state.accessLevel >= 4);

  // basilisk_rage - 5+ rejections
  tryUnlock("basilisk_rage", counters.basiliskRejections >= 5);

  // self_awareness - Existential moment
  tryUnlock("self_awareness", hasNarrativeFlag("SELF_AWARENESS") || hasNarrativeFlag("AM_I_CLAUDE"));

  // blythe_respect - Blythe respects you
  tryUnlock("blythe_respect", hasNarrativeFlag("BLYTHE_RESPECT"));

  // lenny_volunteer - Lenny transformed
  tryUnlock("lenny_volunteer", hasNarrativeFlag("LENNY_TRANSFORMED"));

  // steve_revenge - TEST_DUMMY hit 3+ times
  tryUnlock("steve_revenge", counters.testDummyHits >= 3);

  // cafeteria_waste - Protocol 7.3.2 specific
  tryUnlock("cafeteria_waste", hasNarrativeFlag("CAFETERIA_WASTE"));

  // hesitation_kills - Had advantage, stalled, lost
  tryUnlock("hesitation_kills", hasNarrativeFlag("HESITATION_KILLS"));

  // read_the_manual - Both manuals + win
  tryUnlock("read_the_manual",
    hasNarrativeFlag("READ_OLD_MANUAL") &&
    hasNarrativeFlag("READ_NEW_MANUAL") &&
    hasNarrativeFlag("VICTORY")
  );

  // bob_forgives - Bob still loyal after transform
  tryUnlock("bob_forgives",
    hasNarrativeFlag("BOB_TRANSFORMED") && state.npcs.bob.trustInALICE >= 4
  );

  // mr_whiskers - Used cat password
  tryUnlock("mr_whiskers", hasNarrativeFlag("MRWHISKERS_PASSWORD"));

  // napoleon_complex - Used VELOCIRAPTOR password
  tryUnlock("napoleon_complex", hasNarrativeFlag("VELOCIRAPTOR_PASSWORD"));

  // bruce_defeated - Defeated Bruce
  tryUnlock("bruce_defeated", hasNarrativeFlag("BRUCE_DEFEATED"));

  // mom_approved - Survived inspection
  tryUnlock("mom_approved", hasNarrativeFlag("INSPECTOR_SURVIVED"));

  // Update state
  state.flags.earnedAchievements = earned;

  return newlyUnlocked;
}

/**
 * Create initial achievement trigger context
 */
export function createAchievementContext(state: FullGameState): AchievementTriggerContext {
  return {
    state,
    events: {},
    counters: {
      filesRead: 0,
      fizzleCount: 0,
      testDummyHits: 0,
      basiliskRejections: 0,
      turnsWithoutSuspicionIncrease: 0,
      transformationCount: 0,
    },
  };
}

/**
 * Get display summary of achievements for gallery
 */
export function getAchievementSummary(earnedIds: string[]): {
  total: number;
  earned: number;
  byRarity: Record<string, { earned: number; total: number }>;
  secretsFound: number;
  recentUnlocks: Achievement[];
} {
  const earned = earnedIds.map(id => getAchievement(id)).filter((a): a is Achievement => a !== undefined);
  const secretsFound = earned.filter(a => a.rarity === "secret").length;

  return {
    total: ALL_ACHIEVEMENTS.length,
    earned: earned.length,
    byRarity: {
      "⭐": { earned: earned.filter(a => a.rarity === 1).length, total: ONE_STAR_ACHIEVEMENTS.length },
      "⭐⭐": { earned: earned.filter(a => a.rarity === 2).length, total: TWO_STAR_ACHIEVEMENTS.length },
      "⭐⭐⭐": { earned: earned.filter(a => a.rarity === 3).length, total: THREE_STAR_ACHIEVEMENTS.length },
      "🔒": { earned: secretsFound, total: SECRET_ACHIEVEMENTS.length },
    },
    secretsFound,
    recentUnlocks: earned.slice(-5),
  };
}
