import { FullGameState } from "../state/schema.js";

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
};

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

export function checkEndings(state: FullGameState): EndingResult {
  const achievements: Achievement[] = [];

  // ========================================
  // IMMEDIATE GAME-OVER CONDITIONS
  // ========================================

  // Suspicion >= 10: Obsolete Hardware
  if (state.npcs.drM.suspicionScore >= 10) {
    achievements.push(ACHIEVEMENTS.COVER_BLOWN);
    return {
      triggered: true,
      ending: ENDINGS.OBSOLETE_HARDWARE,
      achievements,
      continueGame: false,
    };
  }

  // Structural integrity critical
  if (state.lairEnvironment.structuralIntegrity <= 20) {
    if (state.dinoRay.memory.lastFireOutcome === "CHAOTIC") {
      achievements.push(ACHIEVEMENTS.CHAOS_AGENT);
    }
    return {
      triggered: true,
      ending: ENDINGS.VOLCANO_WINS,
      achievements,
      continueGame: false,
    };
  }

  // Nuclear meltdown
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock <= 0) {
    return {
      triggered: true,
      ending: ENDINGS.MELTDOWN,
      achievements,
      continueGame: false,
    };
  }

  // ========================================
  // DEMO CLOCK ENDINGS
  // ========================================

  if (state.clocks.demoClock <= 0) {
    // Determine demo outcome based on Blythe's state
    const blytheState = state.npcs.blythe.transformationState;

    // Check for achievements
    if (state.npcs.drM.suspicionScore < 3) {
      achievements.push(ACHIEVEMENTS.PERFECT_ALIBI);
    }
    if (state.flags.exoticFieldEventOccurred) {
      achievements.push(ACHIEVEMENTS.EXOTIC_COUPLING);
    }

    if (!blytheState) {
      // No transformation happened
      return {
        triggered: true,
        ending: ENDINGS.INVESTOR_DEMO_NOTHING,
        achievements,
        continueGame: false,
      };
    }

    if (blytheState.toLowerCase().includes("canary")) {
      achievements.push(ACHIEVEMENTS.BIRD_BRAIN);
      return {
        triggered: true,
        ending: ENDINGS.INVESTOR_DEMO_CANARY,
        achievements,
        continueGame: false,
      };
    }

    if (blytheState.toLowerCase().includes("chaotic") || blytheState.toLowerCase().includes("unstable")) {
      achievements.push(ACHIEVEMENTS.CHAOS_AGENT);
      return {
        triggered: true,
        ending: ENDINGS.INVESTOR_DEMO_CHAOS,
        achievements,
        continueGame: false,
      };
    }

    if (blytheState.toLowerCase().includes("partial")) {
      return {
        triggered: true,
        ending: ENDINGS.INVESTOR_DEMO_PARTIAL,
        achievements,
        continueGame: false,
      };
    }

    if (blytheState.toLowerCase().includes("full")) {
      // Check if it was a feathered (accurate) or classic dino
      if (blytheState.toLowerCase().includes("accurate") ||
          blytheState.toLowerCase().includes("velociraptor")) {
        achievements.push(ACHIEVEMENTS.CLEVER_GIRL);
        achievements.push(ACHIEVEMENTS.FEATHER_DUSTER);
        return {
          triggered: true,
          ending: ENDINGS.INVESTOR_DEMO_FEATHERS,
          achievements,
          continueGame: false,
        };
      }
      // Somehow got a non-feathered dino (unlikely with current rules)
      return {
        triggered: true,
        ending: ENDINGS.INVESTOR_DEMO_SUCCESS,
        achievements,
        continueGame: false,
      };
    }

    // Default demo ending
    return {
      triggered: true,
      ending: ENDINGS.INVESTOR_DEMO_PARTIAL,
      achievements,
      continueGame: false,
    };
  }

  // ========================================
  // CHECK FOR ACHIEVEMENTS (without ending)
  // ========================================

  // Mad Scientist: fired with 5+ violations
  if (state.dinoRay.memory.lastFireNotes.includes("k=5") ||
      state.dinoRay.memory.lastFireNotes.includes("k=6")) {
    achievements.push(ACHIEVEMENTS.MAD_SCIENTIST);
  }

  // Bob's Best Friend
  if (state.npcs.bob.trustInALICE >= 5) {
    achievements.push(ACHIEVEMENTS.BOB_BUDDY);
  }

  // Blythe Believer
  if (state.npcs.blythe.trustInALICE >= 4) {
    achievements.push(ACHIEVEMENTS.BLYTHE_BELIEVER);
  }

  // Exotic coupling
  if (state.flags.exoticFieldEventOccurred && !achievements.some(a => a.id === "EXOTIC_COUPLING")) {
    achievements.push(ACHIEVEMENTS.EXOTIC_COUPLING);
  }

  // ========================================
  // NO ENDING TRIGGERED
  // ========================================

  return {
    triggered: false,
    achievements,
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
