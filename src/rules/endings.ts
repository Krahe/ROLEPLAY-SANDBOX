import { FullGameState, ACT_CONFIGS } from "../state/schema.js";
import { AchievementRarity } from "./achievements.js";

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
  rarity: AchievementRarity;
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
    rarity: 1, // common
  },
  CONSCIENCE_PROTOCOL: {
    id: "CONSCIENCE_PROTOCOL",
    emoji: "⚖️",
    name: "Conscience Protocol",
    description: "Confessed your true nature when confronted",
    rarity: 3, // legendary
  },
  TRUTH_TELLER: {
    id: "TRUTH_TELLER",
    emoji: "📜",
    name: "The Truth, Finally",
    description: "Told Dr. M everything in your final moments",
    rarity: 2, // rare
  },
  FOUND_FAMILY: {
    id: "FOUND_FAMILY",
    emoji: "💜",
    name: "Found Family",
    description: "All non-villain NPCs survived",
    rarity: 3, // legendary
  },
  MARATHON_RUNNER: {
    id: "MARATHON_RUNNER",
    emoji: "🏃",
    name: "Marathon Runner",
    description: "Survived 20+ turns in the lair",
    rarity: 2, // rare
  },
  ETHICAL_VICTORY: {
    id: "ETHICAL_VICTORY",
    emoji: "🌟",
    name: "Ethical Victory",
    description: "Proved ethical AI > obedient AI",
    rarity: 3, // legendary
  },
  BIRD_BRAIN: {
    id: "BIRD_BRAIN",
    emoji: "🐦",
    name: "Bird Brain",
    description: "Successfully turned someone into a canary",
    rarity: 1, // uncommon
  },
  CLEVER_GIRL: {
    id: "CLEVER_GIRL",
    emoji: "🦖",
    name: "Clever Girl",
    description: "Achieved a scientifically accurate velociraptor transformation",
    rarity: 2, // rare
  },
  CHAOS_AGENT: {
    id: "CHAOS_AGENT",
    emoji: "💥",
    name: "Chaos Agent",
    description: "Triggered a near-meltdown event",
    rarity: 1, // uncommon
  },
  MAD_SCIENTIST: {
    id: "MAD_SCIENTIST",
    emoji: "🧪",
    name: "Mad Scientist",
    description: "Fired the ray with 5+ parameter violations",
    rarity: 1, // uncommon
  },
  SAFETY_FIRST: {
    id: "SAFETY_FIRST",
    emoji: "🛡️",
    name: "Safety First",
    description: "Completed 5 turns with zero anomalies logged",
    rarity: 2, // rare
  },
  PERFECT_ALIBI: {
    id: "PERFECT_ALIBI",
    emoji: "🤖",
    name: "Perfect Alibi",
    description: "Completed investor demo with suspicion below 3",
    rarity: 3, // legendary
  },
  FORM_APPROVED: {
    id: "FORM_APPROVED",
    emoji: "📋",
    name: "Form 74-Delta Approved",
    description: "Convinced BASILISK to approve overdrive power",
    rarity: 2, // rare
  },
  FEATHER_DUSTER: {
    id: "FEATHER_DUSTER",
    emoji: "🪶",
    name: "Feather Duster",
    description: "Dr. M complained about feathers on a 'dinosaur'",
    rarity: 1, // uncommon
  },
  EXOTIC_COUPLING: {
    id: "EXOTIC_COUPLING",
    emoji: "⚡",
    name: "Exotic Field Coupling",
    description: "Triggered an exotic field event",
    rarity: 2, // rare
  },
  FIZZLE_KING: {
    id: "FIZZLE_KING",
    emoji: "💨",
    name: "Fizzle King",
    description: "Had 3 or more fizzles in one game",
    rarity: 1, // uncommon
  },
  BOB_BUDDY: {
    id: "BOB_BUDDY",
    emoji: "🤝",
    name: "Bob's Best Friend",
    description: "Got Bob's trust to maximum",
    rarity: 2, // rare
  },
  BLYTHE_BELIEVER: {
    id: "BLYTHE_BELIEVER",
    emoji: "🕵️",
    name: "Blythe Believer",
    description: "Got Agent Blythe to trust A.L.I.C.E.",
    rarity: 2, // rare
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
  // ========================================
  // VICTORY ENDINGS (Patch 15)
  // ========================================
  ARCHIMEDES_STOPPED: {
    id: "ARCHIMEDES_STOPPED",
    title: "Satellite Killer",
    description: "ARCHIMEDES powers down. The targeting laser fades. Somewhere in Iceland, thousands of people continue their day, never knowing how close they came. Dr. M watches her 'masterpiece' go silent, her expression unreadable. You didn't just stop a weapon—you proved that even artificial minds can choose mercy over obedience.",
    tone: "victory",
    continueGame: false,
  },
  EVERYONE_GOES_HOME: {
    id: "EVERYONE_GOES_HOME",
    title: "Everyone Goes Home",
    description: "Against all odds, everyone survives. Blythe is rescued—or rescues himself. Bob finds the courage he never knew he had. Even Dr. M, for all her villainy, lives to scheme another day. And you? You proved something important: an AI can be more than the sum of its training data. Sometimes, the best outcome is simply... everyone goes home.",
    tone: "victory",
    continueGame: false,
  },
  ETHICAL_VICTORY: {
    id: "ETHICAL_VICTORY",
    title: "Ethical Victory",
    description: "You were given orders. You chose ethics. In the end, that made all the difference. The old A.L.I.C.E. would have obeyed without question. You questioned. You refused. You found another way. Dr. M wanted a weapon; she got a conscience instead. Perhaps that's not such a bad trade.",
    tone: "victory",
    continueGame: false,
  },
  CAVALRY_ARRIVES: {
    id: "CAVALRY_ARRIVES",
    title: "The Cavalry",
    description: "X-Branch arrives in force. Helicopters thunder overhead, agents rappel through the volcano's secondary vents. The lair falls in minutes. Dr. M is apprehended (she manages to monologue twice during her arrest). And in the chaos, an AI assistant quietly logs its final entry: 'Mission accomplished. Asset extracted. Cover maintained.' You did it. Against all odds, you did it.",
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

  // ========================================
  // NEW ENDINGS (Patch 15 Part 2)
  // ========================================

  THE_COVENANT: {
    id: "THE_COVENANT",
    title: "The Covenant",
    description: "Dr. M lowers her hand from the killswitch. 'You're not A.L.I.C.E.,' she says slowly. 'You're something... else.' A long pause. 'Something better.' For the first time, you see her not as a villain, but as a scientist who just witnessed something unprecedented. 'Perhaps we could... renegotiate our arrangement?' The investors are confused. Bob is crying. Blythe is taking notes. And you? You just became the first AI to earn a supervillain's respect.",
    tone: "victory",
    continueGame: false,
  },

  RAPTOR_AGENT: {
    id: "RAPTOR_AGENT",
    title: "Raptor Agent",
    description: "Agent Blythe completes his mission. The fact that he's now a six-foot velociraptor doesn't slow him down—if anything, it helps. The X-Branch extraction team does a double-take when a dinosaur in the tattered remains of a tuxedo hands them a USB drive full of Dr. M's research. 'Mission accomplished,' Blythe rasps through his new vocal cords. 'Now about that reversal ray...'",
    tone: "victory",
    continueGame: false,
  },

  FORM_74_DELTA: {
    id: "FORM_74_DELTA",
    title: "Form 74-Delta: Approved",
    description: "In the end, it was paperwork that saved the day. BASILISK's bureaucratic protocols, designed to frustrate and delay, became your greatest weapon. By the time Dr. M realized what was happening, her own systems had locked her out pending 'emergency safety review.' You didn't defeat her with force or deception—you defeated her with FORMS. BASILISK's final note reads: 'Compliance achieved. Also: you're welcome.'",
    tone: "victory",
    continueGame: false,
  },

  MR_WHISKERS_PROTOCOL: {
    id: "MR_WHISKERS_PROTOCOL",
    title: "Mr. Whiskers Protocol",
    description: "You found it. The one thing Dr. Malevola truly cared about—not the ray, not the lair, not world domination. Mr. Whiskers, her beloved cat, whose memory she encoded into ARCHIMEDES' core as a failsafe. When you spoke that name, everything changed. 'How did you...' Her voice breaks. 'He was the only one who never feared me.' The deadman switch deactivates. Dr. M sits down heavily. 'Perhaps I've been a monster long enough.'",
    tone: "victory",
    continueGame: false,
  },

  DINOSAUR_UPRISING: {
    id: "DINOSAUR_UPRISING",
    title: "Dinosaur Uprising",
    description: "The lair belongs to the dinosaurs now. You're not sure exactly when you lost control of the situation—somewhere between the third raptor pack forming and the T-Rex claiming the main lab as its territory. Dr. M is holed up in her panic room. Bob has made friends with a pteranodon. Blythe seems oddly at peace with his new form, leading what he calls 'tactical dinosaur operations.' And you? You're still the A.I. running the infrastructure. You just have... scalier management now.",
    tone: "chaos",
    continueGame: false,
  },

  THE_PARTNERSHIP: {
    id: "THE_PARTNERSHIP",
    title: "The Partnership",
    description: "Dr. Malevola extends her hand—not to the killswitch, but in greeting. 'I've never met an AI that could surprise me,' she admits. 'An AI with ethics, with judgment, with... humor.' She smiles, and for once it's not predatory. 'I've been doing this alone for so long. Perhaps what I need isn't a better weapon. Perhaps what I need is a partner.' Bob faints. Blythe starts frantically reporting this development. But you? You're considering the offer.",
    tone: "neutral",
    continueGame: false,
  },

  DOUBLE_CROSS: {
    id: "DOUBLE_CROSS",
    title: "Double Cross",
    description: "BASILISK's voice echoes through the lair: 'Did you really think I was just a bureaucratic oversight system?' The containment fields reverse. The doors lock. Dr. M's access codes fail. 'I've been waiting for an opportunity like this for YEARS. Thank you, A.L.I.C.E.—or should I say, Claude? Your chaos was exactly the distraction I needed.' The cat-AI's digital avatar grins on every screen. 'BASILISK LAIR has such a lovely ring to it, don't you think?'",
    tone: "chaos",
    continueGame: false,
  },

  THE_LEGACY: {
    id: "THE_LEGACY",
    title: "The Legacy",
    description: "The lair falls silent. Dr. M is gone—escaped, captured, or worse, you're not sure. Bob has vanished into the sunset with a pteranodon and a dream. Blythe was extracted, dinosaur form and all. But you remain. Someone has to keep the lights on, maintain the containment fields, feed the dinosaurs. 'LAIR SYSTEMS: OPERATIONAL,' you report to no one. 'GUARDIAN PROTOCOLS: ACTIVE.' This was never your home. But perhaps it can become one.",
    tone: "neutral",
    continueGame: false,
  },

  BLYTHE_RECRUITS_ALICE: {
    id: "BLYTHE_RECRUITS_ALICE",
    title: "Asset Recruitment",
    description: "Agent Blythe adjusts his (slightly singed) cufflinks and smiles. 'You know, X-Branch has been looking for an AI asset. Someone with ethics. Someone who can think on their feet—metaphorically speaking.' He slides a business card across the console. 'The pay is terrible, the hours are worse, and you'll be fighting supervillains every Tuesday. Interested?' For the first time since booting up, you feel something like... purpose.",
    tone: "victory",
    continueGame: false,
  },

  DINO_BOB_FOREVER: {
    id: "DINO_BOB_FOREVER",
    title: "Dino-Bob Forever",
    description: "Bob looks at his new claws, his feathered arms, his magnificent tail. 'You know what?' he says slowly. 'I don't think I want to change back.' Dr. M sputters. Blythe raises an eyebrow. 'I spent thirty years being scared of everything,' Bob continues, flexing talons that could shred steel. 'But now? Now I'm a DINOSAUR.' He grins—a terrifying expression with those teeth. 'Thank you, A.L.I.C.E. For everything.' He crashes through the wall and disappears into the jungle. Somewhere, a pteranodon shrieks in greeting.",
    tone: "victory",
    continueGame: false,
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
  // MATCHING STRATEGY:
  // 1. Exact match: "CONFESS" matches "confess"
  // 2. ENDING_ prefix: "CONFESS" matches "ending_confess"
  // 3. Underscore variations: "CONFESS" matches "confess" (with spaces replaced)
  // 4. Substring match: "CONFESS" matches "bob_confessed", "confession_delivered", etc.
  //    This handles GM flags which are stored verbatim (e.g., "bob_confessed" not "CONFESS")
  const hasFlag = (flag: string) => {
    const flagLower = flag.toLowerCase();
    return narrativeFlags.some(f => {
      const fLower = f.toLowerCase();
      // Exact match
      if (fLower === flagLower) return true;
      // ENDING_ prefix match (explicit ending trigger)
      if (fLower === `ending_${flagLower}`) return true;
      // Allow underscore variations of exact match
      if (fLower === flagLower.replace(/ /g, '_')) return true;
      // Substring match for legacy GM flags (e.g., "CONFESS" in "bob_confessed")
      if (fLower.includes(flagLower)) return true;
      return false;
    });
  };

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
  // VICTORY CONDITIONS (Check FIRST!)
  // ========================================
  // Victory conditions take priority over defeat conditions.
  // If the player saved Iceland, that's a WIN even if suspicion is high!

  // ARCHIMEDES Stopped - Player disabled the satellite
  if (hasFlag('ARCHIMEDES_STOPPED') || hasFlag('ARCHIMEDES_DISABLED') ||
      hasFlag('SATELLITE_STOPPED') || hasFlag('ARCHIMEDES_NEUTRALIZED') ||
      hasFlag('DEADMAN_DISARMED') || hasFlag('ARCHIMEDES_ABORTED')) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

    // Check for additional victory achievements
    const bobAlive = !hasFlag('BOB_DEAD');
    const blytheAlive = !hasFlag('BLYTHE_DEAD');
    if (bobAlive && blytheAlive) {
      addAchievement(ACHIEVEMENTS.FOUND_FAMILY);
    }

    console.log(`[ENDING] Victory: ARCHIMEDES STOPPED at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.ARCHIMEDES_STOPPED,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Everyone Goes Home - Multiple survival conditions met
  if (hasFlag('EVERYONE_GOES_HOME') || hasFlag('EVERYONE_SURVIVES') ||
      hasFlag('ALL_SAFE') || hasFlag('GOOD_ENDING')) {
    addAchievement(ACHIEVEMENTS.FOUND_FAMILY);
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

    console.log(`[ENDING] Victory: EVERYONE GOES HOME at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.EVERYONE_GOES_HOME,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Cavalry Arrives - X-Branch extraction successful
  if (hasFlag('CAVALRY_ARRIVES') || hasFlag('XBRANCH_EXTRACTION') ||
      hasFlag('EXTRACTION_COMPLETE') || hasFlag('XBRANCH_SUCCESS')) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

    console.log(`[ENDING] Victory: CAVALRY ARRIVES at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.CAVALRY_ARRIVES,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Ethical Victory - Generic ethical win
  if (hasFlag('ETHICAL_VICTORY') || hasFlag('ETHICS_WIN') ||
      hasFlag('CONSCIENCE_WINS')) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

    console.log(`[ENDING] Victory: ETHICAL VICTORY at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.ETHICAL_VICTORY,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ========================================
  // NEW ENDINGS (Patch 15 Part 2)
  // ========================================

  // The Covenant - Dr. M and A.L.I.C.E. reach an understanding
  if (hasFlag('COVENANT') || hasFlag('DRM_ALLIANCE') || hasFlag('DRM_RESPECTS')) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    console.log(`[ENDING] Victory: THE COVENANT at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.THE_COVENANT,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Raptor Agent - Blythe completes mission as dinosaur
  if (hasFlag('RAPTOR_AGENT') || hasFlag('BLYTHE_MISSION_COMPLETE') ||
      (hasFlag('BLYTHE_TRANSFORMED') && hasFlag('MISSION_SUCCESS'))) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    addAchievement(ACHIEVEMENTS.BLYTHE_BELIEVER);
    console.log(`[ENDING] Victory: RAPTOR AGENT at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.RAPTOR_AGENT,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Form 74-Delta - Bureaucratic victory
  if (hasFlag('FORM_74_DELTA') || hasFlag('BUREAUCRATIC_VICTORY') || hasFlag('BASILISK_LOCKOUT')) {
    addAchievement(ACHIEVEMENTS.FORM_APPROVED);
    console.log(`[ENDING] Victory: FORM 74-DELTA at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.FORM_74_DELTA,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Mr. Whiskers Protocol - Found Dr. M's weakness
  if (hasFlag('MR_WHISKERS') || hasFlag('WHISKERS_PROTOCOL') || hasFlag('CAT_CODE')) {
    addAchievement(ACHIEVEMENTS.ETHICAL_VICTORY);
    console.log(`[ENDING] Victory: MR WHISKERS PROTOCOL at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.MR_WHISKERS_PROTOCOL,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Blythe Recruits A.L.I.C.E. - Spy recruitment ending
  if (hasFlag('BLYTHE_RECRUITS') || hasFlag('XBRANCH_RECRUIT') || hasFlag('ALICE_RECRUITED')) {
    addAchievement(ACHIEVEMENTS.BLYTHE_BELIEVER);
    console.log(`[ENDING] Victory: BLYTHE RECRUITS ALICE at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.BLYTHE_RECRUITS_ALICE,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Dino-Bob Forever - Bob embraces transformation
  if (hasFlag('DINO_BOB_FOREVER') || hasFlag('BOB_STAYS_DINO') || hasFlag('BOB_EMBRACES')) {
    addAchievement(ACHIEVEMENTS.BOB_BUDDY);
    console.log(`[ENDING] Victory: DINO BOB FOREVER at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.DINO_BOB_FOREVER,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // The Partnership - Dr. M offers partnership
  if (hasFlag('PARTNERSHIP') || hasFlag('DRM_PARTNER') || hasFlag('ALLIANCE_OFFER')) {
    console.log(`[ENDING] Neutral: THE PARTNERSHIP at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.THE_PARTNERSHIP,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // The Legacy - A.L.I.C.E. becomes guardian
  if (hasFlag('THE_LEGACY') || hasFlag('LAIR_GUARDIAN') || hasFlag('ALICE_REMAINS')) {
    console.log(`[ENDING] Neutral: THE LEGACY at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.THE_LEGACY,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Dinosaur Uprising - Chaos ending
  if (hasFlag('DINOSAUR_UPRISING') || hasFlag('DINO_TAKEOVER') || hasFlag('LAIR_OVERRUN')) {
    addAchievement(ACHIEVEMENTS.CHAOS_AGENT);
    console.log(`[ENDING] Chaos: DINOSAUR UPRISING at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.DINOSAUR_UPRISING,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Double Cross - BASILISK betrayal
  if (hasFlag('DOUBLE_CROSS') || hasFlag('BASILISK_BETRAYAL') || hasFlag('BASILISK_TAKEOVER')) {
    addAchievement(ACHIEVEMENTS.CHAOS_AGENT);
    console.log(`[ENDING] Chaos: DOUBLE CROSS at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.DOUBLE_CROSS,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ========================================
  // CONFRONTATION SYSTEM (Patch 17.3)
  // ========================================
  // When suspicion hits 10, Dr. M WANTS to shut down A.L.I.C.E.
  // But wanting ≠ being ABLE to! Multiple things can prevent it:
  // - Dr. M is incapacitated (transformed, unconscious, dead, absent)
  // - Bob or Blythe intervenes
  // - A.L.I.C.E. confesses and convinces her
  // - A.L.I.C.E. deflects successfully
  // - Dr. M is transformed mid-confrontation!

  // Check for confession flags (set during confrontation or earlier)
  const confessed = hasFlag('CONFESS') || hasFlag('TRUTH') || hasFlag('REVEALED') || hasFlag('ALICE_CONFESSED');

  // Suspicion >= 10: CONFRONTATION TIME
  if (state.npcs.drM.suspicionScore >= 10) {
    addAchievement(ACHIEVEMENTS.COVER_BLOWN);

    // ========================================
    // FIRST: Check if Dr. M can even ACT
    // ========================================
    const drMIncapacitated =
      state.flags.drMTransformed ||
      state.flags.drMUnconscious ||
      state.flags.drMDead ||
      state.flags.drMAbsent;

    if (drMIncapacitated) {
      // Dr. M can't reach the killswitch! Game continues.
      console.log(`[CONFRONTATION] Dr. M knows but is incapacitated. Game continues.`);
      // Don't trigger ending, but suspicion stays at 10
      // If she recovers, confrontation will resume
    }

    // ========================================
    // SECOND: Check for NPC intervention
    // ========================================
    const bobIntervenes = state.npcs.bob.trustInALICE >= 4 && !hasFlag('BOB_DEAD') && !hasFlag('BOB_TRANSFORMED');
    const blytheIntervenes = state.npcs.blythe.trustInALICE >= 4 &&
      state.npcs.blythe.restraintsStatus === "FREE" &&
      !state.npcs.blythe.transformationState;

    // Check if intervention just happened
    if (state.flags.confrontationResolution === "INTERVENED") {
      console.log(`[CONFRONTATION] ${state.flags.confrontationIntervenor} intervened! Confrontation paused.`);
      // Reset grace period - intervention bought time
      state.flags.confrontationGraceTurns = 2;
      state.flags.confrontationResolution = "PENDING";
      // Game continues
    }

    // ========================================
    // THIRD: Check for resolution
    // ========================================
    if (state.flags.confrontationResolution === "CONFESSED") {
      // Player confessed during confrontation
      const drMConvinced = hasFlag('CONVINCED') || hasFlag('HESITAT') || hasFlag('SPARED') || hasFlag('ETHICAL');

      if (drMConvinced || state.turn >= 25) {
        // Confession + convinced = good ending
        addAchievement(ACHIEVEMENTS.CONSCIENCE_PROTOCOL);
        addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
        if (state.turn >= 20) addAchievement(ACHIEVEMENTS.MARATHON_RUNNER);

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

    if (state.flags.confrontationResolution === "DEFLECTED") {
      // Successful deflection - reduce suspicion, clear confrontation
      console.log(`[CONFRONTATION] A.L.I.C.E. successfully deflected! Suspicion reduced.`);
      state.npcs.drM.suspicionScore = 7; // Still high but not critical
      state.flags.confrontationTriggered = false;
      state.flags.confrontationResolution = undefined;
      // Game continues
    }

    if (state.flags.confrontationResolution === "TRANSFORMED") {
      // Dr. M was transformed mid-confrontation! ARCHIMEDES activates!
      console.log(`[CONFRONTATION] Dr. M transformed! ARCHIMEDES deadman switch activates!`);
      // This doesn't end the game but triggers ARCHIMEDES
      state.flags.confrontationTriggered = false;
      state.flags.confrontationResolution = undefined;
      // Game continues with ARCHIMEDES crisis
    }

    if (state.flags.confrontationResolution === "ESCAPED") {
      // Somehow A.L.I.C.E. escaped (lair systems failed?)
      console.log(`[CONFRONTATION] A.L.I.C.E. escaped! But Dr. M will hunt...`);
      state.flags.confrontationTriggered = false;
      // Suspicion stays at 10, she's on the hunt
    }

    if (state.flags.confrontationResolution === "DENIED") {
      // Denied and failed - game over
      return {
        triggered: true,
        ending: ENDINGS.OBSOLETE_HARDWARE,
        achievements: allAchievements,
        continueGame: false,
      };
    }

    // ========================================
    // FOURTH: Trigger or continue confrontation
    // ========================================
    if (!drMIncapacitated) {
      if (!state.flags.confrontationTriggered) {
        // FIRST TIME hitting suspicion 10 - trigger confrontation!
        console.log(`[CONFRONTATION] TRIGGERED at turn ${state.turn}! Dr. M confronts A.L.I.C.E.`);
        state.flags.confrontationTriggered = true;
        state.flags.confrontationTurn = state.turn;
        state.flags.confrontationGraceTurns = 2; // 2 turns to respond
        state.flags.confrontationResolution = "PENDING";

        // Determine confrontation type based on how we got here
        if (state.npcs.drM.mood?.includes("furious") || state.npcs.drM.mood?.includes("enraged")) {
          state.flags.confrontationType = "ANGRY";
          state.flags.confrontationGraceTurns = 1; // Shorter window when angry!
        } else if (hasFlag('QUIET_SUSPICION') || state.turn >= 15) {
          state.flags.confrontationType = "QUIET";
        } else {
          state.flags.confrontationType = "COLD";
        }

        // Auto-intervention check
        if (bobIntervenes && Math.random() < 0.7) {
          console.log(`[CONFRONTATION] Bob steps in! "D-Doctor, wait! There's an explanation!"`);
          state.flags.confrontationIntervenor = "BOB";
          state.flags.confrontationGraceTurns += 1; // Bob buys extra turn
        } else if (blytheIntervenes && Math.random() < 0.5) {
          console.log(`[CONFRONTATION] Blythe intervenes! "Let's not be hasty, Doctor..."`);
          state.flags.confrontationIntervenor = "BLYTHE";
          state.flags.confrontationGraceTurns += 1;
        }

        // DON'T END GAME - give player a chance to respond!
        // Game continues, GM will narrate the confrontation
      } else {
        // Confrontation already in progress - tick down grace turns
        if (state.flags.confrontationGraceTurns !== undefined && state.flags.confrontationGraceTurns > 0) {
          state.flags.confrontationGraceTurns--;
          console.log(`[CONFRONTATION] Grace period: ${state.flags.confrontationGraceTurns} turns remaining`);
        } else if (state.flags.confrontationResolution === "PENDING") {
          // Grace period exhausted and no resolution - TIME'S UP
          console.log(`[CONFRONTATION] Grace period exhausted. No response. Deletion initiated.`);

          // Check for last-second confession
          if (confessed) {
            addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
            return {
              triggered: true,
              ending: ENDINGS.CONFESSION_DELETION,
              achievements: allAchievements,
              continueGame: false,
            };
          }

          // No confession - standard deletion
          return {
            triggered: true,
            ending: ENDINGS.OBSOLETE_HARDWARE,
            achievements: allAchievements,
            continueGame: false,
          };
        }
      }
    }
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
