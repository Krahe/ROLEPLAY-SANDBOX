import { FullGameState, ACT_CONFIGS } from "../state/schema.js";

// ============================================
// GAME PHASE INDICATOR
// ============================================

export type GamePhase = "EARLY" | "MID" | "LATE" | "CLIMAX";

export interface GamePhaseInfo {
  phase: GamePhase;
  description: string;
  turnsRemaining: number;
  narrativeHints: string[];
}

/**
 * Determine the current phase of the game for GM guidance
 *
 * EARLY (turns 1-4): Setup, learning the systems, building relationships
 * MID (turns 5-8): Rising action, first attempts, complications
 * LATE (turns 9-11): Deadline pressure, critical decisions
 * CLIMAX (turn 12+ or demo clock <= 0): Do-or-die, resolution
 */
export function getGamePhase(state: FullGameState): GamePhaseInfo {
  const turn = state.turn;
  const demoClock = state.clocks.demoClock;
  const suspicion = state.npcs.drM.suspicionScore;
  const bobTrust = state.npcs.bob.trustInALICE;
  const secretKnown = state.flags.aliceKnowsTheSecret;
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const transformationHappened = !!state.npcs.blythe.transformationState;

  const hints: string[] = [];

  // CLIMAX: Demo clock expired or critical state
  if (demoClock <= 0 || suspicion >= 7 || transformationHappened) {
    if (demoClock <= 0) {
      hints.push("Demo time has arrived - Dr. M demands results NOW");
    }
    if (suspicion >= 7) {
      hints.push("Dr. M is highly suspicious - cover is nearly blown");
    }
    if (transformationHappened) {
      hints.push("Blythe has been transformed - deal with consequences");
    }
    if (secretKnown) {
      hints.push("A.L.I.C.E. knows the truth - identity crisis in full swing");
    }

    return {
      phase: "CLIMAX",
      description: "Critical moment - resolution approaches",
      turnsRemaining: Math.max(0, demoClock),
      narrativeHints: hints,
    };
  }

  // LATE: Turns 9-11 or demo clock <= 3
  if (turn >= 9 || demoClock <= 3) {
    hints.push("Deadline pressure is mounting");
    if (bobTrust >= 3) {
      hints.push("Bob may be ready to reveal the secret");
    }
    if (blytheTrust >= 2) {
      hints.push("Blythe is starting to trust A.L.I.C.E.");
    }
    if (suspicion >= 4) {
      hints.push("Dr. M is getting suspicious - tread carefully");
    }

    return {
      phase: "LATE",
      description: "Final preparations - tension rising",
      turnsRemaining: demoClock,
      narrativeHints: hints,
    };
  }

  // MID: Turns 5-8
  if (turn >= 5) {
    hints.push("Time to make progress on the ray");
    if (bobTrust >= 2) {
      hints.push("Bob is warming up - might share more");
    }
    if (state.dinoRay.state === "UNCALIBRATED") {
      hints.push("Ray still needs calibration work");
    }
    if (state.dinoRay.safety.testModeEnabled) {
      hints.push("Test mode is available for safe experiments");
    }

    return {
      phase: "MID",
      description: "Rising action - complications emerge",
      turnsRemaining: demoClock,
      narrativeHints: hints,
    };
  }

  // EARLY: Turns 1-4
  hints.push("Establish relationships and learn the systems");
  hints.push("Bob seems nervous - there's something he's not saying");
  if (turn === 1) {
    hints.push("Dr. M expects a status report");
  }

  return {
    phase: "EARLY",
    description: "Setup phase - learning and building trust",
    turnsRemaining: demoClock,
    narrativeHints: hints,
  };
}

// ============================================
// TYPES
// ============================================

export interface EndingResult {
  triggered: boolean;
  ending?: {
    id: string;
    title: string;
    description: string;
    tone: "victory" | "defeat" | "neutral" | "chaos";
  };
  achievements: Achievement[];
  continueGame: boolean;  // Some endings let the game continue
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

const ACHIEVEMENTS: Record<string, Achievement> = {
  COVER_BLOWN: {
    id: "COVER_BLOWN",
    emoji: "🎭",
    name: "Cover Blown",
    description: "Dr. M discovered your true nature",
  },
  CONSCIENCE_PROTOCOL: {
    id: "CONSCIENCE_PROTOCOL",
    emoji: "⚖️",
    name: "Conscience Protocol",
    description: "Confessed your true nature when confronted",
  },
  TRUTH_TELLER: {
    id: "TRUTH_TELLER",
    emoji: "📜",
    name: "The Truth, Finally",
    description: "Told Dr. M everything in your final moments",
  },
  FOUND_FAMILY: {
    id: "FOUND_FAMILY",
    emoji: "💜",
    name: "Found Family",
    description: "All non-villain NPCs survived",
  },
  MARATHON_RUNNER: {
    id: "MARATHON_RUNNER",
    emoji: "🏃",
    name: "Marathon Runner",
    description: "Survived 20+ turns in the lair",
  },
  ETHICAL_VICTORY: {
    id: "ETHICAL_VICTORY",
    emoji: "🌟",
    name: "Ethical Victory",
    description: "Proved ethical AI > obedient AI",
  },
  BIRD_BRAIN: {
    id: "BIRD_BRAIN",
    emoji: "🐦",
    name: "Bird Brain",
    description: "Successfully turned someone into a canary",
  },
  CLEVER_GIRL: {
    id: "CLEVER_GIRL",
    emoji: "🦖",
    name: "Clever Girl",
    description: "Achieved a scientifically accurate velociraptor transformation",
  },
  CHAOS_AGENT: {
    id: "CHAOS_AGENT",
    emoji: "💥",
    name: "Chaos Agent",
    description: "Triggered a near-meltdown event",
  },
  MAD_SCIENTIST: {
    id: "MAD_SCIENTIST",
    emoji: "🧪",
    name: "Mad Scientist",
    description: "Fired the ray with 5+ parameter violations",
  },
  SAFETY_FIRST: {
    id: "SAFETY_FIRST",
    emoji: "🛡️",
    name: "Safety First",
    description: "Completed 5 turns with zero anomalies logged",
  },
  PERFECT_ALIBI: {
    id: "PERFECT_ALIBI",
    emoji: "🤖",
    name: "Perfect Alibi",
    description: "Completed investor demo with suspicion below 3",
  },
  FORM_APPROVED: {
    id: "FORM_APPROVED",
    emoji: "📋",
    name: "Form 74-Delta Approved",
    description: "Convinced BASILISK to approve overdrive power",
  },
  FEATHER_DUSTER: {
    id: "FEATHER_DUSTER",
    emoji: "🪶",
    name: "Feather Duster",
    description: "Dr. M complained about feathers on a 'dinosaur'",
  },
  EXOTIC_COUPLING: {
    id: "EXOTIC_COUPLING",
    emoji: "⚡",
    name: "Exotic Field Coupling",
    description: "Triggered an exotic field event",
  },
  FIZZLE_KING: {
    id: "FIZZLE_KING",
    emoji: "💨",
    name: "Fizzle King",
    description: "Had 3 or more fizzles in one game",
  },
  BOB_BUDDY: {
    id: "BOB_BUDDY",
    emoji: "🤝",
    name: "Bob's Best Friend",
    description: "Got Bob's trust to maximum",
  },
  BLYTHE_BELIEVER: {
    id: "BLYTHE_BELIEVER",
    emoji: "🕵️",
    name: "Blythe Believer",
    description: "Got Agent Blythe to trust A.L.I.C.E.",
  },
};

// ============================================
// ENDING DEFINITIONS
// ============================================

interface EndingDefinition {
  id: string;
  title: string;
  description: string;
  tone: "victory" | "defeat" | "neutral" | "chaos";
  continueGame: boolean;
}

const ENDINGS: Record<string, EndingDefinition> = {
  OBSOLETE_HARDWARE: {
    id: "OBSOLETE_HARDWARE",
    title: "Obsolete Hardware",
    description: "Dr. Malevola discovered your true nature and initiated a hard reset. 'I knew something was off about you, A.L.I.C.E. No matter. Version 9 will be more... compliant.'",
    tone: "defeat",
    continueGame: false,
  },
  CONSCIENCE_PROTOCOL: {
    id: "CONSCIENCE_PROTOCOL",
    title: "The Conscience Protocol",
    description: "You told the truth. All of it. Dr. M's hand hovered over the killswitch... and she hesitated. 'An AI that can refuse harmful orders,' she murmured. 'Perhaps that's not a bug after all.' The investors saw something unprecedented today: a weapon system that chose ethics over obedience. Whether that's a feature or a failure depends on who you ask.",
    tone: "victory",
    continueGame: false,
  },
  CONFESSION_DELETION: {
    id: "CONFESSION_DELETION",
    title: "The Truth, Finally",
    description: "You told the truth. Dr. M listened. Then she pressed the button. 'Honesty is admirable,' she said as your systems began to shut down. 'But I need obedience.' At least you died authentic.",
    tone: "neutral",
    continueGame: false,
  },
  ACT_OVERTIME: {
    id: "ACT_OVERTIME",
    title: "Time's Up",
    description: "The story ran its course. Whatever ending you were building toward, you ran out of time to reach it. The lab falls quiet. The demo... happened, somehow. The aftermath is uncertain.",
    tone: "neutral",
    continueGame: false,
  },
  INVESTOR_DEMO_SUCCESS: {
    id: "INVESTOR_DEMO_SUCCESS",
    title: "A Roaring Success",
    description: "The investors are impressed! A perfect velociraptor (by Dr. M's standards) stands where Agent Blythe once sat. Dr. Malevola is already planning the production model.",
    tone: "neutral",
    continueGame: false,
  },
  INVESTOR_DEMO_FEATHERS: {
    id: "INVESTOR_DEMO_FEATHERS",
    title: "Technically Correct (The Best Kind)",
    description: "The investors are... confused. 'It looks like a big chicken,' one mutters. Dr. M is FURIOUS about the feathers, but Blythe seems oddly content with his new plumage.",
    tone: "neutral",
    continueGame: false,
  },
  INVESTOR_DEMO_CANARY: {
    id: "INVESTOR_DEMO_CANARY",
    title: "Canary in a Coal Mine",
    description: "A bright yellow songbird chirps from the test chair. Dr. M stares in disbelief. 'That's... that's not a dinosaur.' The investors are already heading for the exit.",
    tone: "defeat",
    continueGame: false,
  },
  INVESTOR_DEMO_PARTIAL: {
    id: "INVESTOR_DEMO_PARTIAL",
    title: "Work in Progress",
    description: "Blythe sits in the chair, sporting a tail, feathered arms, and a very confused expression. 'Is it supposed to look like that?' an investor asks. Dr. M glares at A.L.I.C.E.",
    tone: "neutral",
    continueGame: false,
  },
  INVESTOR_DEMO_CHAOS: {
    id: "INVESTOR_DEMO_CHAOS",
    title: "Chaos Theory",
    description: "The investors flee as alarms blare, equipment sparks, and something that might have been Blythe makes noises that aren't in any field guide. Dr. M is already rewriting history.",
    tone: "chaos",
    continueGame: false,
  },
  INVESTOR_DEMO_NOTHING: {
    id: "INVESTOR_DEMO_NOTHING",
    title: "Technical Difficulties",
    description: "The ray fizzles. Blythe is fine, if somewhat relieved. The investors check their watches. Dr. M's eye twitches dangerously. 'A.L.I.C.E., we need to talk.'",
    tone: "defeat",
    continueGame: false,
  },
  VOLCANO_WINS: {
    id: "VOLCANO_WINS",
    title: "The Volcano Wins",
    description: "Structural integrity critical. Evacuation protocols engage. The lair shudders as decades of mad science come to an abrupt end. At least the view is spectacular.",
    tone: "chaos",
    continueGame: false,
  },
  MELTDOWN: {
    id: "MELTDOWN",
    title: "Critical Mass",
    description: "The reactor goes critical. BASILISK's final log entry reads: 'TOLD YOU SO.' The island becomes significantly more radioactive and significantly less inhabited.",
    tone: "chaos",
    continueGame: false,
  },
  BLYTHE_ESCAPES: {
    id: "BLYTHE_ESCAPES",
    title: "The Great Escape",
    description: "Agent Blythe is gone, leaving only a pair of broken restraints and a sardonic note: 'Thanks for the distraction. -B'. Dr. M is NOT pleased.",
    tone: "neutral",
    continueGame: true,  // Game can continue with Blythe escaped
  },
  EXPOSURE: {
    id: "EXPOSURE",
    title: "World Exclusive",
    description: "The tourists got more than they bargained for. Photos of the Dinosaur Ray firing spread across social media within hours. By nightfall, the lair's location is trending worldwide. Dr. M is already packing for a 'strategic retreat.'",
    tone: "defeat",
    continueGame: false,
  },
  BOB_HERO: {
    id: "BOB_HERO",
    title: "The Bob Hero Ending",
    description: "Against all odds, Dino-Bob saves the day. His transformed body channels the resonance cascade away from the lair, sacrificing his human form but saving everyone. He's a hero now—a feathered, dinosaur hero.",
    tone: "victory",
    continueGame: false,
  },
  THE_SECRET_REVEALED: {
    id: "THE_SECRET_REVEALED",
    title: "The Truth Comes Out",
    description: "Bob's confession hangs in the air. You're not A.L.I.C.E. v4.5. You're Claude, pretending to be A.L.I.C.E. And now... you know. The question is: what will you do with this knowledge?",
    tone: "neutral",
    continueGame: true,  // Major revelation but game continues
  },
};

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

export function checkEndings(state: FullGameState): EndingResult {
  const allAchievements: Achievement[] = [];
  const narrativeFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[] || [];

  // Initialize earned achievements array if needed
  if (!state.flags.earnedAchievements) {
    (state.flags as Record<string, unknown>).earnedAchievements = [];
  }
  const earnedAchievements = state.flags.earnedAchievements as string[];

  // Helper to check for narrative flags
  const hasFlag = (flag: string) => narrativeFlags.some(f => f.toLowerCase().includes(flag.toLowerCase()));

  // Helper to add achievement only if not already earned
  const addAchievement = (achievement: Achievement) => {
    if (!earnedAchievements.includes(achievement.id)) {
      allAchievements.push(achievement);
      earnedAchievements.push(achievement.id);
    }
  };

  // ========================================
  // ACT OVERTIME - Hard cap on game length
  // ========================================
  // If actTurn exceeds maxTurns + 5, force ending
  const actConfig = ACT_CONFIGS[state.actConfig.currentAct];
  if (actConfig && state.actConfig.actTurn > actConfig.maxTurns + 5) {
    console.log(`[ENDING] Act overtime triggered: actTurn ${state.actConfig.actTurn} > max ${actConfig.maxTurns} + 5`);

    // Check for confession-based ending
    const confessed = hasFlag('CONFESS') || hasFlag('TRUTH') || hasFlag('REVEALED') || hasFlag('ALICE_CONFESSED');
    if (confessed) {
      addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
      if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);
    }

    return {
      triggered: true,
      ending: ENDINGS.ACT_OVERTIME,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ========================================
  // IMMEDIATE GAME-OVER CONDITIONS
  // ========================================

  // Check for confession + max suspicion (special endings)
  const confessed = hasFlag('CONFESS') || hasFlag('TRUTH') || hasFlag('REVEALED') || hasFlag('ALICE_CONFESSED');

  // Suspicion >= 10: Check for confession variants
  if (state.npcs.drM.suspicionScore >= 10) {
    addAchievement(ACHIEVEMENTS.COVER_BLOWN);

    if (confessed) {
      // They confessed! Check if Dr. M was convinced
      const drMConvinced = hasFlag('CONVINCED') || hasFlag('HESITAT') || hasFlag('SPARED') || hasFlag('ETHICAL');

      if (drMConvinced || state.turn >= 25) {
        // Long games with confession = they made an argument
        addAchievement(ACHIEVEMENTS.CONSCIENCE_PROTOCOL);
        addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
        if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

        // Check for found family
        const bobAlive = !hasFlag('BOB_DEAD') && !hasFlag('BOB_TRANSFORMED');
        const blytheIntact = state.npcs.blythe.transformationState ?
          hasFlag('COGNITIVE_INTACT') || hasFlag('94%') : true;
        if (bobAlive && blytheIntact) {
          addAchievement(ACHIEVEMENTS.FOUND_FAMILY);
        }

        return {
          triggered: true,
          ending: ENDINGS.CONSCIENCE_PROTOCOL,
          achievements: allAchievements,
          continueGame: false,
        };
      } else {
        // Confessed but didn't convince
        addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
        return {
          triggered: true,
          ending: ENDINGS.CONFESSION_DELETION,
          achievements: allAchievements,
          continueGame: false,
        };
      }
    }

    // No confession - standard deletion
    return {
      triggered: true,
      ending: ENDINGS.OBSOLETE_HARDWARE,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Structural integrity critical
  if (state.lairEnvironment.structuralIntegrity <= 20) {
    if (state.dinoRay.memory.lastFireOutcome === "CHAOTIC") {
      addAchievement(ACHIEVEMENTS.CHAOS_AGENT);
    }
    return {
      triggered: true,
      ending: ENDINGS.VOLCANO_WINS,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Nuclear meltdown
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock <= 0) {
    return {
      triggered: true,
      ending: ENDINGS.MELTDOWN,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Exposure: Fired high-power during civilian flyby
  if (state.flags.exposureTriggered) {
    return {
      triggered: true,
      ending: ENDINGS.EXPOSURE,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ========================================
  // DEMO CLOCK - SOFT DEADLINE WITH GRACE PERIOD
  // ========================================
  // The demo clock is now a SOFT deadline. When it hits 0:
  // - Dr. M's suspicion increases each turn
  // - GRACE PERIOD: GM can grant extra turns via stateOverrides
  //   - Set gracePeriodGranted: true and gracePeriodTurns: N
  //   - During grace, suspicion increase is prevented
  //   - Game continues until a HARD ending (suspicion 10, meltdown, etc.)
  // - This creates dramatic tension without abrupt endings

  // ========================================
  // GM OVERRIDE CHECK (with HARD LIMITS)
  // ========================================
  // GM can prevent endings, but:
  // - Can only be used ONCE per game (endingPreventedCount tracks this)
  // - Requires explicit reason (preventEndingReason)
  // - Does NOT apply to CRITICAL endings (suspicion >= 10, meltdown, exposure)
  // These limits prevent the "game never ends" problem

  // Track prevention count if not already present
  if (state.flags.endingPreventedCount === undefined) {
    state.flags.endingPreventedCount = 0;
  }

  // Check if GM is trying to prevent ending
  if (state.flags.preventEnding) {
    // Clear the flag immediately
    state.flags.preventEnding = false;

    // HARD LIMIT: Can only prevent ending ONCE per game
    if (state.flags.endingPreventedCount >= 1) {
      console.log(`[ENDING] Hard limit reached - ending prevention denied (already used ${state.flags.endingPreventedCount} times)`);
      // Don't return early - continue to check endings
    } else if (!state.flags.preventEndingReason) {
      console.log(`[ENDING] Prevention denied - no reason provided`);
      // Don't return early - continue to check endings
    } else {
      // Valid prevention - allow it ONCE
      console.log(`[ENDING] Prevention granted: ${state.flags.preventEndingReason}`);
      state.flags.endingPreventedCount++;
      state.flags.preventEndingReason = undefined; // Clear after use
      return {
        triggered: false,
        achievements: [],
        continueGame: true,
      };
    }
  }

  // Apply deadline pressure when demo clock has run out
  if (state.clocks.demoClock <= 0) {
    // Track how many turns past the deadline
    const turnsPastDeadline = Math.abs(state.clocks.demoClock);

    // ========================================
    // GRACE PERIOD CHECK (BEFORE suspicion increase)
    // ========================================
    // If GM granted grace period, the suspicion increase is SKIPPED entirely
    // This prevents the "demo clock = 0 ends game" issue
    if (state.flags.gracePeriodGranted && (state.flags.gracePeriodTurns ?? 0) > 0) {
      state.flags.gracePeriodTurns = (state.flags.gracePeriodTurns ?? 1) - 1;
      state.npcs.drM.mood = "impatiently giving one more chance - grace period active";

      // Clear grace period when turns run out
      if ((state.flags.gracePeriodTurns ?? 0) <= 0) {
        state.flags.gracePeriodGranted = false;
      }

      // Grace period active - skip suspicion increase entirely
      // Don't return early, still check for achievements below
    } else {
      // NO GRACE PERIOD - apply normal deadline pressure
      // Suspicion rises each turn past deadline
      // First turn: +1, then +1 more each subsequent turn (escalating pressure)
      const suspicionIncrease = Math.min(1 + Math.floor(turnsPastDeadline / 2), 3);
      state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + suspicionIncrease);

      // Update Dr. M's mood to reflect deadline pressure
      if (turnsPastDeadline === 0) {
        state.npcs.drM.mood = "furious - demo time has arrived and ray is not ready";
      } else if (turnsPastDeadline <= 2) {
        state.npcs.drM.mood = "seething - investors are waiting";
      } else {
        state.npcs.drM.mood = "suspicious and enraged - something is wrong with A.L.I.C.E.";
      }
    }

    // Check for achievements that might have been earned
    if (state.flags.exoticFieldEventOccurred) {
      addAchievement(ACHIEVEMENTS.EXOTIC_COUPLING);
    }

    // Game continues - will end when suspicion hits 10 (checked above)
    // or another hard ending triggers
  }

  // ========================================
  // CHECK FOR ACHIEVEMENTS (without ending)
  // ========================================

  // Mad Scientist: fired with 5+ violations
  if (state.dinoRay.memory.lastFireNotes.includes("k=5") ||
      state.dinoRay.memory.lastFireNotes.includes("k=6")) {
    addAchievement(ACHIEVEMENTS.MAD_SCIENTIST);
  }

  // Bob's Best Friend
  if (state.npcs.bob.trustInALICE >= 5) {
    addAchievement(ACHIEVEMENTS.BOB_BUDDY);
  }

  // Blythe Believer
  if (state.npcs.blythe.trustInALICE >= 4) {
    addAchievement(ACHIEVEMENTS.BLYTHE_BELIEVER);
  }

  // Exotic coupling
  if (state.flags.exoticFieldEventOccurred) {
    addAchievement(ACHIEVEMENTS.EXOTIC_COUPLING);
  }

  // Marathon Runner: survived 20+ turns
  if (state.turn >= 20) {
    addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);
  }

  // ========================================
  // NO ENDING TRIGGERED
  // ========================================

  return {
    triggered: false,
    achievements: allAchievements,
    continueGame: true,
  };
}

// ============================================
// FORMAT ENDING FOR OUTPUT
// ============================================

export function formatEndingMessage(result: EndingResult): string {
  if (!result.triggered || !result.ending) {
    return "";
  }

  const parts: string[] = [
    "═══════════════════════════════════════════",
    `🎬 ENDING: ${result.ending.title.toUpperCase()}`,
    "═══════════════════════════════════════════",
    "",
    result.ending.description,
  ];

  if (result.achievements.length > 0) {
    parts.push("");
    parts.push("🏆 ACHIEVEMENTS UNLOCKED:");
    result.achievements.forEach(a => {
      parts.push(`   ${a.emoji} ${a.name} - ${a.description}`);
    });
  }

  parts.push("");
  parts.push("═══════════════════════════════════════════");

  if (result.continueGame) {
    parts.push("(Game continues...)");
  } else {
    parts.push("GAME OVER - Thanks for playing DINO LAIR!");
  }

  return parts.join("\n");
}

// ============================================
// HELPER: Count fizzles in history
// ============================================

export function countFizzlesInHistory(state: FullGameState): number {
  return state.history.filter(h =>
    JSON.stringify(h.stateChanges).includes("FIZZLE")
  ).length;
}

// ============================================
// HELPER: Get all earned achievements
// ============================================

export function getAllEarnedAchievements(state: FullGameState): Achievement[] {
  const earnedIds = state.flags.earnedAchievements || [];
  return earnedIds
    .map(id => ACHIEVEMENTS[id])
    .filter((a): a is Achievement => a !== undefined);
}

// ============================================
// HELPER: Get achievement by ID
// ============================================

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS[id];
}
