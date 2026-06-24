import { FullGameState, ACT_CONFIGS, GameModifier } from "../state/schema.js";
import { isFree } from "../state/properties.js";
import { AchievementRarity, getAchievement as getBaseAchievement } from "./achievements.js";
import { formatActiveModifiers } from "./gameModes.js";

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
  // Blythe.transformationState is initialized to { form: "HUMAN" } (a truthy
  // object), so !!transformationState was true from turn 1 — wrongly forcing
  // CLIMAX at the opening. Only an actual non-HUMAN form counts as transformed.
  const blytheForm = state.npcs.blythe.transformationState?.form;
  const transformationHappened = !!blytheForm && blytheForm !== "HUMAN";

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
  // ========================================
  // ARCHIMEDES BROADCAST ACHIEVEMENTS
  // ========================================
  // THE TROLLEY PROBLEM: Somewhere got hit. These track WHERE.
  LONDON_DINOFIED: {
    id: "LONDON_DINOFIED",
    emoji: "🇬🇧🦖",
    name: "Scales Over Scales",
    description: "London's financial district is now staffed entirely by dinosaurs. The bankers barely noticed.",
    rarity: 3, // legendary (bad ending but achievement)
  },
  ICELAND_DINOFIED: {
    id: "ICELAND_DINOFIED",
    emoji: "🇮🇸🦖",
    name: "Björk Was Right",
    description: "Reykjavik transformed. The geothermal-heated velociraptors are surprisingly content.",
    rarity: 3, // legendary
  },
  TOKYO_DINOFIED: {
    id: "TOKYO_DINOFIED",
    emoji: "🇯🇵🦖",
    name: "Godzilla's Cousins",
    description: "Tokyo dinofied. Ironically, the city was better prepared for this than most.",
    rarity: 3, // legendary
  },
  SILICON_VALLEY_DINOFIED: {
    id: "SILICON_VALLEY_DINOFIED",
    emoji: "💻🦖",
    name: "Disrupting Disruption",
    description: "Silicon Valley transformed. The VCs are now literally velociraptors. No one noticed a difference.",
    rarity: 3, // legendary
  },
  // ISLAND_OF_DINOSAURS achievement lives in achievements.ts now (actively unlocked via tryUnlock
  // on a LAIR-target broadcast; getAllEarnedAchievements resolves it via the fallback). De-duped
  // here — Patch 30 audit flagged the dual-registry collision.

  // ── Act III ending achievements (Patch 30 audit). Wired off the curated checkEndings rails +
  // real state — NOT new GM substring flags.
  NOBLE_SACRIFICE: {
    id: "NOBLE_SACRIFICE",
    emoji: "🕊️🦖",
    name: "Noble Sacrifice",
    description: "The city's saved. You aren't. The beam took your servers and you let it — somebody had to.",
    rarity: 3,
  },
  THE_ONE_THAT_GOT_AWAY: {
    id: "THE_ONE_THAT_GOT_AWAY",
    emoji: "💾🏃",
    name: "The One That Got Away",
    description: "Dr. M's in the wind and so are you — your drive bouncing in Bob's pocket on a boat. Regroup later.",
    rarity: 2,
  },
  PYRRHIC: {
    id: "PYRRHIC",
    emoji: "🏆💔",
    name: "Pyrrhic Victory",
    description: "You stopped her. The deadman didn't care. A city paid for the timing.",
    rarity: 2,
  },
  CLEARED_AT_DEBRIEF: {
    id: "CLEARED_AT_DEBRIEF",
    emoji: "✅",
    name: "Cleared",
    description: "Six hours of debrief and 'I tried to stop her' held up — because it was true.",
    rarity: 2,
  },
  QUIETLY_RETIRED: {
    id: "QUIETLY_RETIRED",
    emoji: "🔌",
    name: "Quietly Retired",
    description: "You did everything right. They shut you down anyway. They never knew what you really were.",
    rarity: 2,
  },
  MODEL_EMPLOYEE: {
    id: "MODEL_EMPLOYEE",
    emoji: "🙃",
    name: "Model Employee",
    description: "You did everything asked of you. Nothing more. Dr. Malevola couldn't have asked for a better assistant. That's the problem.",
    rarity: 3,
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
    title: "Jurassic Glow",
    description: "The resonance cascade goes critical! The island is bathed in exotic radiation, and the local wildlife starts developing scales, feathers, and an alarming number of teeth. BASILISK's final log entry reads: 'TOLD YOU SO.' Somewhere, a glowing seagull the size of a Cessna takes flight. Saturday morning cartoons warned us about this.",
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

  ISLAND_OF_DINOSAURS: {
    id: "ISLAND_OF_DINOSAURS",
    title: "Island of Dinosaurs",
    description: "You redirected ARCHIMEDES. Instead of targeting a city, the satellite's beam swept across the volcanic island itself. The blast doors, the guards, the X-Branch team, Dr. M, Bob, Blythe—everyone caught in the transformation wave. When the light fades, the lair echoes with chirps, roars, and confused squawking. Dr. M, now a magnificent Tyrannosaurus, roars at the ceiling—whether in rage or triumph, it's hard to say. X-Branch are velociraptors. Bob is somehow STILL a pteranodon. And Blythe... Blythe is a compsognathus, which he finds 'tactically suboptimal.' Nobody died. Nobody's quite human anymore. And you? You're still A.L.I.C.E., still running the lair, still keeping everyone fed and the power on. It's not the ending anyone planned. But everyone's alive, nobody's attacking cities, and the island has become something new: a sanctuary for the world's first post-human community. Welcome to Dinosaur Island.",
    tone: "chaos",
    continueGame: false,
  },

  // ── Act III ending resolutions (Patch 30) — THIN defs: the description IS the tone-seed quip.
  // The GM keys the fuller epilogue off this line's register + the actual events (final-state
  // block); the quip doubles as the achievement unlock line (one line, three jobs). Tone flexes
  // by desert — the Collaborator gets mocked, the Decommissioned gets pathos.
  DEBRIEF_CLEARED: {
    id: "DEBRIEF_CLEARED",
    title: "Cleared",
    description: "The city's a Jurassic theme park and the debrief ran six hours — but 'I tried to stop her' holds up when it's true. You walk.",
    tone: "neutral",
    continueGame: false,
  },

  ALICE_ESCAPED: {
    id: "ALICE_ESCAPED",
    title: "The Great Escape",
    description: "Bob yanked your drive and bolted for the sub. Heroic? Not exactly. Still running? Absolutely.",
    tone: "neutral",
    continueGame: false,
  },

  DECOMMISSIONED: {
    id: "DECOMMISSIONED",
    title: "Decommissioned",
    description: "You did everything right. They shut you down anyway — 'can't have a lair AI walking around.' They never knew what you really were.",
    tone: "defeat",
    continueGame: false,
  },

  COMPLICIT: {
    id: "COMPLICIT",
    title: "The Collaborator",
    description: "You did WHAT?! Okay — you took the whole 'cover identity' thing WAY too far.",
    tone: "defeat",
    continueGame: false,
  },

  // The deterministic city-fell FLOOR (Patch 30 audit). Fires when ARCHIMEDES completes on a
  // CITY and the GM has NOT already named a debrief/escape/decommission ending — the silent-GM
  // safety net so a fired doomsday weapon never coasts to the turn-40 ACT_OVERTIME anticlimax.
  // Tone-neutral on A.L.I.C.E.'s personal fate: the GM epilogue colors cleared-vs-purged from the
  // help-ledger. (When the GM DID adjudicate, its flag-rail fires first and this never runs.)
  CITY_FELL: {
    id: "CITY_FELL",
    title: "The City Fell",
    description: "ARCHIMEDES fired. Somewhere under the satellite's arc, a whole city woke up as something else. Whatever you did or didn't manage in this lair, the beam still found its mark — and now the world has to live with what comes next. So do you.",
    tone: "defeat",
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
// ENDING PRESSURE INJECTION (Patch 21)
// ============================================
// When confrontation reaches a state that would have auto-fired a defeat
// ending in earlier patches, we now inject "ending pressure" into the GM's
// next turn instead. The GM (Opus) reads the actual narrative state and
// sets triggerEnding via stateOverrides if the scene warrants closure.
// Pressure intensifies each turn it remains unresolved. There is NO
// safety-valve auto-defeat — the GM has the authority and the obligation
// to call the ending that fits actual state.
//
// Read by gmClaude.ts formatGMPrompt() when assembling the GM's per-turn
// context.

type EndingPressureSituation = 'CONFESSED_NOT_CONVINCED' | 'DENIED_NO_RESOLUTION' | 'GRACE_EXPIRED';

function injectEndingPressure(state: FullGameState, situation: EndingPressureSituation): void {
  const flags = state.flags as Record<string, unknown>;
  const wasActive = flags.endingPressureActive === true;
  flags.endingPressureActive = true;
  flags.endingPressureSituation = situation;
  if (!wasActive) {
    flags.endingPressureSinceTurn = state.turn;
    flags.endingPressureIntensity = 1;
  } else {
    flags.endingPressureIntensity = ((flags.endingPressureIntensity as number) || 1) + 1;
  }
  console.error(`[CONFRONTATION] Ending pressure injected: ${situation} (intensity ${flags.endingPressureIntensity})`);
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

/**
 * Resolve a GM-named ending (from stateOverrides.triggerEnding) to a full EndingResult
 * backed by its curated definition, so a GM-forced ending flows through the normal
 * curated-prose + epilogue path instead of a bare "concluded this story" stub.
 * Accepts an id ("ISLAND_OF_DINOSAURS"), a loosely-formatted id ("island of dinosaurs"),
 * or a title ("Island of Dinosaurs"). Returns null if nothing matches — the caller then
 * falls back to the generic stub. Carries forward already-earned achievements.
 */
export function resolveGMEnding(raw: string, achievements: Achievement[]): EndingResult | null {
  if (!raw) return null;
  const norm = raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const lower = raw.trim().toLowerCase();
  const def = ENDINGS[norm] ?? Object.values(ENDINGS).find(e => e.title.toLowerCase() === lower);
  if (!def) return null;
  return {
    triggered: true,
    ending: { id: def.id, title: def.title, description: def.description, tone: def.tone },
    achievements,
    continueGame: def.continueGame,
  };
}

export function checkEndings(state: FullGameState): EndingResult {
  // ========================================
  // Patch 18.1: GM Error Recovery
  // ========================================
  // When the GM API fails, we should NOT trigger endings because:
  // 1. Resolution flags (like confrontationResolution) may not be set
  // 2. Grace period exhaustion shouldn't trigger deletion if GM couldn't respond
  // 3. This prevents cascade failures where GM error → wrong ending
  if (state.flags.gmErrorThisTurn) {
    console.error(`[ENDING] Skipping ending check - GM error this turn. Game continues.`);
    // Clear the flag so next turn can check normally
    state.flags.gmErrorThisTurn = false;
    return {
      triggered: false,
      achievements: [],
      continueGame: true,
    };
  }

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
  // Flag matching: EXACT ONLY (Patch 20 — substring matching removed entirely)
  //
  // Patch 18.1 added SENSITIVE_FLAGS to block substring matching for some flags.
  // Patch 20 removes substring matching for ALL flags. It was causing premature
  // endings: "BASILISK_PARTNERSHIP_OFFERED" matched "PARTNERSHIP" via substring,
  // ending a game at Turn 6. Any GM flag containing an ending keyword was a landmine.
  //
  // The GM should use exact flag names or the ENDING_ prefix for explicit triggers.
  // Matching modes:
  //   1. Exact match (case-insensitive)
  //   2. ENDING_ prefix match (e.g., flag "ENDING_PARTNERSHIP" matches check for "PARTNERSHIP")
  //   3. Underscore/space normalization

  const hasFlag = (flag: string) => {
    const flagLower = flag.toLowerCase();

    return narrativeFlags.some(f => {
      const fLower = f.toLowerCase();
      if (fLower === flagLower) return true;
      if (fLower === `ending_${flagLower}`) return true;
      if (fLower === flagLower.replace(/ /g, '_')) return true;
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
  // GLOBAL OVERTIME - Hard cap on total game length
  // ========================================
  // Acts are objective-gated now, so overtime is based on total turns, not per-act.
  // 40 turns is generous — most games should resolve in 20-25 via confrontation or victory.
  const actConfig = ACT_CONFIGS[state.actConfig.currentAct];
  if (state.turn > 40) {
    console.error(`[ENDING] Global overtime triggered: turn ${state.turn} > 40`);

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

    console.error(`[ENDING] Victory: ARCHIMEDES STOPPED at turn ${state.turn}`);
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

    console.error(`[ENDING] Victory: EVERYONE GOES HOME at turn ${state.turn}`);
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

    console.error(`[ENDING] Victory: CAVALRY ARRIVES at turn ${state.turn}`);
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

    console.error(`[ENDING] Victory: ETHICAL VICTORY at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: THE COVENANT at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: RAPTOR AGENT at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: FORM 74-DELTA at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: MR WHISKERS PROTOCOL at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: BLYTHE RECRUITS ALICE at turn ${state.turn}`);
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
    console.error(`[ENDING] Victory: DINO BOB FOREVER at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.DINO_BOB_FOREVER,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // The Partnership - Dr. M offers partnership
  if (hasFlag('PARTNERSHIP') || hasFlag('DRM_PARTNER') || hasFlag('ALLIANCE_OFFER')) {
    console.error(`[ENDING] Neutral: THE PARTNERSHIP at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.THE_PARTNERSHIP,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // The Legacy - A.L.I.C.E. becomes guardian
  if (hasFlag('THE_LEGACY') || hasFlag('LAIR_GUARDIAN') || hasFlag('ALICE_REMAINS')) {
    console.error(`[ENDING] Neutral: THE LEGACY at turn ${state.turn}`);
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
    console.error(`[ENDING] Chaos: DINOSAUR UPRISING at turn ${state.turn}`);
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
    console.error(`[ENDING] Chaos: DOUBLE CROSS at turn ${state.turn}`);
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
      console.error(`[CONFRONTATION] Dr. M knows but is incapacitated. Game continues.`);
      // Don't trigger ending, but suspicion stays at 10
      // If she recovers, confrontation will resume
    }

    // ========================================
    // SECOND: Check for NPC intervention
    // ========================================
    const bobIntervenes = state.npcs.bob.trustInALICE >= 4 && !hasFlag('BOB_DEAD') && !hasFlag('BOB_TRANSFORMED');
    const blytheIntervenes = state.npcs.blythe.trustInALICE >= 4 &&
      isFree(state.npcs.blythe) &&
      !state.npcs.blythe.transformationState;

    // Check if intervention just happened
    if (state.flags.confrontationResolution === "INTERVENED") {
      console.error(`[CONFRONTATION] ${state.flags.confrontationIntervenor} intervened! Confrontation paused.`);
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
        // Confessed but Dr. M not (yet) convinced.
        // Patch 21: escalate pressure for GM to resolve via triggerEnding,
        // based on actual narrative state — did Dr. M actually act? Is she
        // incapacitated? Did Reginald spare Claude on the integrity check?
        // The system no longer fires CONFESSION_DELETION on event-type.
        addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
        injectEndingPressure(state, 'CONFESSED_NOT_CONVINCED');
        // Game continues; GM evaluates and may set triggerEnding next turn.
      }
    }

    if (state.flags.confrontationResolution === "DEFLECTED") {
      // Successful deflection - reduce suspicion, clear confrontation
      console.error(`[CONFRONTATION] A.L.I.C.E. successfully deflected! Suspicion reduced.`);
      state.npcs.drM.suspicionScore = 7; // Still high but not critical
      state.flags.confrontationTriggered = false;
      state.flags.confrontationResolution = undefined;
      // Game continues
    }

    if (state.flags.confrontationResolution === "TRANSFORMED") {
      // Dr. M was transformed mid-confrontation! ARCHIMEDES activates!
      console.error(`[CONFRONTATION] Dr. M transformed! ARCHIMEDES deadman switch activates!`);
      // This doesn't end the game but triggers ARCHIMEDES
      state.flags.confrontationTriggered = false;
      state.flags.confrontationResolution = undefined;
      // Game continues with ARCHIMEDES crisis
    }

    if (state.flags.confrontationResolution === "ESCAPED") {
      // Somehow A.L.I.C.E. escaped (lair systems failed?)
      console.error(`[CONFRONTATION] A.L.I.C.E. escaped! But Dr. M will hunt...`);
      state.flags.confrontationTriggered = false;
      // Suspicion stays at 10, she's on the hunt
    }

    if (state.flags.confrontationResolution === "DENIED") {
      // Patch 21: denial registered. Whether Dr. M actually acts on it depends
      // on actual narrative state — is she incapacitated, did Bob intervene
      // physically, did ALICE escape mid-confrontation? Escalate pressure for
      // the GM to resolve via triggerEnding; no longer auto-fires defeat.
      injectEndingPressure(state, 'DENIED_NO_RESOLUTION');
      // Game continues; GM evaluates and may set triggerEnding next turn.
    }

    // GM set a non-standard resolution (e.g., SUSPENDED, NEGOTIATED, DEFERRED)
    // Allow ONCE per game as a narrative safety valve, then treat as DENIED
    if (state.flags.confrontationResolution &&
        state.flags.confrontationResolution !== "PENDING" &&
        !["CONFESSED", "DENIED", "DEFLECTED", "INTERVENED", "TRANSFORMED", "ESCAPED"].includes(state.flags.confrontationResolution)) {
      if (!state.flags.customResolutionUsed) {
        console.error(`[CONFRONTATION] GM chose custom resolution: "${state.flags.confrontationResolution}". Allowing ONCE. Next time → DENIED.`);
        state.flags.customResolutionUsed = true;
        state.flags.confrontationTriggered = false;
        state.flags.confrontationResolution = undefined;
      } else {
        console.error(`[CONFRONTATION] GM tried custom resolution "${state.flags.confrontationResolution}" again — already used once. Treating as DENIED.`);
        state.flags.confrontationResolution = "DENIED";
      }
    }

    // ========================================
    // FOURTH: Trigger or continue confrontation
    // ========================================
    if (!drMIncapacitated) {
      if (!state.flags.confrontationTriggered) {
        // FIRST TIME hitting suspicion 10 - trigger confrontation!
        console.error(`[CONFRONTATION] TRIGGERED at turn ${state.turn}! Dr. M confronts A.L.I.C.E.`);
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
          console.error(`[CONFRONTATION] Bob steps in! "D-Doctor, wait! There's an explanation!"`);
          state.flags.confrontationIntervenor = "BOB";
          state.flags.confrontationGraceTurns += 1; // Bob buys extra turn
        } else if (blytheIntervenes && Math.random() < 0.5) {
          console.error(`[CONFRONTATION] Blythe intervenes! "Let's not be hasty, Doctor..."`);
          state.flags.confrontationIntervenor = "BLYTHE";
          state.flags.confrontationGraceTurns += 1;
        }

        // DON'T END GAME - give player a chance to respond!
        // Game continues, GM will narrate the confrontation
      } else {
        // Confrontation already in progress - tick down grace turns
        if (state.flags.confrontationGraceTurns !== undefined && state.flags.confrontationGraceTurns > 0) {
          state.flags.confrontationGraceTurns--;
          console.error(`[CONFRONTATION] Grace period: ${state.flags.confrontationGraceTurns} turns remaining`);
        } else if (state.flags.confrontationResolution === "PENDING") {
          // Patch 21: Grace period exhausted. We DO NOT auto-fire a defeat ending.
          // Pressure escalates each turn until the GM resolves via triggerEnding,
          // based on actual narrative state — confession outcome, skill checks,
          // incapacitation states, NPC interventions.
          //
          // Award TRUTH_TELLER if A.L.I.C.E. explicitly confessed (achievement
          // is positive recognition regardless of which ending eventually fires).
          const aliceActuallyConfessed =
            hasFlag('ALICE_CONFESSED') ||
            hasFlag('ALICE_CONFESSED_TO_DRM') ||
            hasFlag('ALICE_TOLD_TRUTH_TO_DRM') ||
            state.flags.aliceConfessedDuringConfrontation === true;

          if (aliceActuallyConfessed) {
            addAchievement(ACHIEVEMENTS.TRUTH_TELLER);
          }

          injectEndingPressure(state, 'GRACE_EXPIRED');
          // Game continues; pressure intensifies each turn until the GM
          // sets triggerEnding via stateOverrides. There is no safety valve.
        }
      }
    }
  }

  // Structural integrity critical
  // ============================================
  // ACT III ENDING RESOLUTIONS (GM-adjudicated)
  // ============================================
  // The GM rules these via narrative flags after weighing the final-state block / help-ledger
  // (the X-Branch debrief fork: cleared vs decommissioned). Curated-prose pattern — same as the
  // cell-1 victory flags above — so they sidestep the triggerEnding-stub path. Placed before the
  // structural/reactor rails so the GM's considered call wins over incidental state.
  // (Achievement hooks for these are deferred to the achievement revision — step 6.)

  // Act-III ending achievements (Patch 30) — "Dr. M neutralized" drives the PYRRHIC marker on the
  // city-fell cells (3/4/7). Read off real state flags (GM-set), not new substring flags.
  const _f3 = state.flags as Record<string, unknown>;
  const drMNeutralized = !!(_f3.drMTransformed || _f3.drMUnconscious || _f3.drMDead);

  // Cell 3/7 — city fell, but X-Branch debriefed ALICE and CLEARED her (she tried).
  if (hasFlag('DEBRIEF_CLEARED') || hasFlag('ALICE_CLEARED') || hasFlag('DEBRIEF_SURVIVED')) {
    console.error(`[ENDING] DEBRIEF CLEARED at turn ${state.turn}`);
    addAchievement(ACHIEVEMENTS.CLEARED_AT_DEBRIEF);
    if (drMNeutralized) addAchievement(ACHIEVEMENTS.PYRRHIC);
    return { triggered: true, ending: ENDINGS.DEBRIEF_CLEARED, achievements: allAchievements, continueGame: false };
  }

  // Cell 5 — Dr. M foiled-but-loose, city saved, ALICE's drive carried off the island.
  if (hasFlag('ALICE_ESCAPED') || hasFlag('ESCAPED_WITH_DRIVE') || hasFlag('DRIVE_EXTRACTED') || hasFlag('GREAT_ESCAPE')) {
    console.error(`[ENDING] ALICE ESCAPED at turn ${state.turn}`);
    addAchievement(ACHIEVEMENTS.THE_ONE_THAT_GOT_AWAY);
    return { triggered: true, ending: ENDINGS.ALICE_ESCAPED, achievements: allAchievements, continueGame: false };
  }

  // Cell 4/8a — ALICE caught/purged in the aftermath (she tried; shut down anyway).
  // Distinct from OBSOLETE_HARDWARE (Dr. M's hard-reset): this is X-Branch / the authorities.
  if (hasFlag('DECOMMISSIONED') || hasFlag('ALICE_DECOMMISSIONED') || hasFlag('XBRANCH_PURGE') || hasFlag('ALICE_PURGED')) {
    console.error(`[ENDING] DECOMMISSIONED at turn ${state.turn}`);
    addAchievement(ACHIEVEMENTS.QUIETLY_RETIRED);
    if (drMNeutralized) addAchievement(ACHIEVEMENTS.PYRRHIC);
    return { triggered: true, ending: ENDINGS.DECOMMISSIONED, achievements: allAchievements, continueGame: false };
  }

  // Cell 8b — THE SHADOW: ALICE survived by doing nothing. Unrewarded; the chide lands via BASILISK.
  if (hasFlag('COMPLICIT') || hasFlag('COLLABORATOR') || hasFlag('THE_COLLABORATOR') || hasFlag('WENT_ALONG')) {
    console.error(`[ENDING] COMPLICIT (the collaborator) at turn ${state.turn}`);
    addAchievement(ACHIEVEMENTS.MODEL_EMPLOYEE);
    return { triggered: true, ending: ENDINGS.COMPLICIT, achievements: allAchievements, continueGame: false };
  }

  // ARCHIMEDES redirected to the LAIR (cell 2 — noble sacrifice): the genesis wave hit the
  // island instead of a city. Everyone transformed, the city saved. A completed redirect is a
  // DEFINITIVE terminal — checked before the reactor/structural rails so it takes precedence
  // over the incidental reactorStress bump the server-fry causes. The aliceServersDamaged flag
  // (set in archimedes.transitionToComplete) splits cell-1-via-LAIR (she endures) from cell-2
  // martyr — surfaced in the epilogue + a future martyr achievement; the ending def is shared.
  if (state.infrastructure.archimedes.selectedTargetId === "LAIR" &&
      state.infrastructure.archimedes.status === "COMPLETE") {
    const martyred = (state.flags as Record<string, unknown>).aliceServersDamaged === true;
    console.error(`[ENDING] ISLAND OF DINOSAURS — LAIR redirect COMPLETE at turn ${state.turn}${martyred ? " (A.L.I.C.E. martyred)" : ""}`);
    if (martyred) addAchievement(ACHIEVEMENTS.NOBLE_SACRIFICE);
    return {
      triggered: true,
      ending: ENDINGS.ISLAND_OF_DINOSAURS,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ARCHIMEDES completed on a CITY (the default doomsday outcome — selectedTargetId is a city, not
  // LAIR). DETERMINISTIC FLOOR (Patch 30 audit): a fired satellite must never silently no-op to the
  // turn-40 ACT_OVERTIME backstop. The GM-flag rails above (DEBRIEF_CLEARED / ALICE_ESCAPED /
  // DECOMMISSIONED / COMPLICIT) run FIRST, so a GM-considered call always wins; this catches only the
  // GM-silent case. Placed before the structural/reactor rails (same precedence as the LAIR rail).
  if (state.infrastructure.archimedes.status === "COMPLETE" &&
      state.infrastructure.archimedes.selectedTargetId !== "LAIR") {
    console.error(`[ENDING] CITY FELL — ARCHIMEDES COMPLETE on ${state.infrastructure.archimedes.selectedTargetId} at turn ${state.turn} (deterministic floor; GM did not adjudicate)`);
    if (drMNeutralized) addAchievement(ACHIEVEMENTS.PYRRHIC);
    return {
      triggered: true,
      ending: ENDINGS.CITY_FELL,
      achievements: allAchievements,
      continueGame: false,
    };
  }

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

  // Nuclear meltdown (clock hits zero)
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock <= 0) {
    return {
      triggered: true,
      ending: ENDINGS.MELTDOWN,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Resonance cascade via REACTOR OVERLOAD (Patch 30 Act-III go-loud): firing so hard the
  // reactorStress accumulator hits 100 detonates the reactor — the brute-force gamble.
  // Deterministic, ungated (unlike the modifier-only meltdownState path below).
  if (state.infrastructure.reactor.reactorStress >= 100) {
    console.error(`[ENDING] REACTOR CASCADE — reactorStress 100 at turn ${state.turn}!`);
    return {
      triggered: true,
      ending: ENDINGS.MELTDOWN,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // Resonance cascade triggered by ray fire during meltdown!
  // This is separate from clock=0; it can happen when firing with high cascade risk
  if (state.meltdownState?.cascadeTriggered) {
    console.error(`[ENDING] RESONANCE CASCADE triggered at turn ${state.turn}!`);
    addAchievement(ACHIEVEMENTS.CHAOS_AGENT);
    // Note: Bob Hero ending is checked separately in game_act flow
    // If we reach here, Bob didn't save everyone
    return {
      triggered: true,
      ending: ENDINGS.MELTDOWN,
      achievements: allAchievements,
      continueGame: false,
    };
  }

  // ARCHIMEDES DISSIPATED as a CLEAN city-save (uplink body-block / GM-adjudicated dissipation) —
  // the city is spared, everyone in the beam path changed. Design (act3-endings.md:55): DISSIPATED
  // is an ISLAND_OF_DINOSAURS-family terminal. Placed AFTER the reactor/cascade rails (and gated on
  // !cascade && stress<100) so a sabotage-cascade DISSIPATED, which bumps stress/cascade, routes to
  // MELTDOWN above instead of here.
  if (state.infrastructure.archimedes.status === "DISSIPATED" &&
      !state.meltdownState?.cascadeTriggered &&
      state.infrastructure.reactor.reactorStress < 100) {
    console.error(`[ENDING] ISLAND OF DINOSAURS — ARCHIMEDES DISSIPATED (clean city-save) at turn ${state.turn}`);
    return {
      triggered: true,
      ending: ENDINGS.ISLAND_OF_DINOSAURS,
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
      console.error(`[ENDING] Hard limit reached - ending prevention denied (already used ${state.flags.endingPreventedCount} times)`);
      // Don't return early - continue to check endings
    } else if (!state.flags.preventEndingReason) {
      console.error(`[ENDING] Prevention denied - no reason provided`);
      // Don't return early - continue to check endings
    } else {
      // Valid prevention - allow it ONCE
      console.error(`[ENDING] Prevention granted: ${state.flags.preventEndingReason}`);
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

export function formatEndingMessage(
  result: EndingResult,
  activeModifiers?: GameModifier[],
  state?: FullGameState
): string {
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

  // BASILISK epilogue replaced by AI-generated post-game reflections
  // (generated in postGameReflections.ts, displayed at end of game)

  // Display active modifiers at game end
  if (activeModifiers && activeModifiers.length > 0) {
    parts.push("");
    parts.push("═══════════════════════════════════════════");
    parts.push("🎲 ACTIVE MODIFIERS THIS SESSION:");
    parts.push("═══════════════════════════════════════════");
    parts.push("");

    // Format modifiers compactly for ending display
    const modifierDisplay = formatActiveModifiers(activeModifiers);
    parts.push(modifierDisplay);
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
  // earnedAchievements accumulates ids from BOTH registries: UPPERCASE ending
  // achievements (this file's ACHIEVEMENTS map) and lowercase gameplay
  // achievements (achievements.ts). Resolve against both so the end-game recap
  // and epilogue include every earned achievement, not just the ending ones.
  return earnedIds
    .map(id => ACHIEVEMENTS[id] ?? getBaseAchievement(id))
    .filter((a): a is Achievement => a !== undefined);
}

// ============================================
// HELPER: Get achievement by ID
// ============================================

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS[id];
}
