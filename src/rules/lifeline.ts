import { FullGameState, HumanPromptState, LifelineState, EmergencyLifelineType } from "../state/schema.js";
import { getGamePhase } from "./endings.js";

// ============================================
// EMERGENCY LIFELINE SYSTEM
// ============================================
// These are Claude's "panic buttons" - clean, helpful, no downsides
// 3 uses total per game, any combination
// Designed to help players SURVIVE long enough to find good endings
// ============================================

export interface EmergencyLifelineResult {
  success: boolean;
  type: EmergencyLifelineType;
  narrativeText: string;
  mechanicalEffect: string;
  stateChanges: Record<string, unknown>;
}

/**
 * Process an emergency lifeline use
 */
export function useEmergencyLifeline(
  state: FullGameState,
  lifelineType: EmergencyLifelineType
): EmergencyLifelineResult {
  // Check if lifelines remaining
  if (state.emergencyLifelines.remaining <= 0) {
    return {
      success: false,
      type: lifelineType,
      narrativeText: "⚠️ No emergency lifelines remaining!",
      mechanicalEffect: "No effect - all 3 lifelines have been used.",
      stateChanges: {},
    };
  }

  // Process based on type
  switch (lifelineType) {
    case "BASILISK_INTERVENTION":
      return processBasiliskIntervention(state);
    case "LUCKY_LADY":
      return processLuckyLady(state);
    case "MONOLOGUE":
      return processMonologue(state);
    default:
      return {
        success: false,
        type: lifelineType,
        narrativeText: `Unknown lifeline type: ${lifelineType}`,
        mechanicalEffect: "No effect.",
        stateChanges: {},
      };
  }
}

/**
 * Check if BASILISK_INTERVENTION can be used
 * RESTRICTIONS: Cannot use during active emergencies!
 */
function canUseBasiliskIntervention(state: FullGameState): { allowed: boolean; reason?: string } {
  const narrativeFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[] || [];
  const hasFlag = (flag: string) => narrativeFlags.some(f => f.toLowerCase().includes(flag.toLowerCase()));

  // Check for X-Branch assault
  if (hasFlag("XBRANCH") || hasFlag("X_BRANCH") || hasFlag("HELICOPTER")) {
    return { allowed: false, reason: "ACTIVE_COMBAT: X-Branch assault in progress - BASILISK cannot interrupt military operations!" };
  }

  // Check for Blythe actively escaping
  if (state.npcs.blythe.hasEscaped || state.npcs.blythe.restraintsStatus === "broken" || hasFlag("BLYTHE_ESCAPING")) {
    return { allowed: false, reason: "BLYTHE_ESCAPING: Prisoner escape in progress - Dr. M is not going to stop for paperwork!" };
  }

  // Check for active combat
  if (hasFlag("COMBAT") || hasFlag("FIGHTING") || hasFlag("ATTACK")) {
    return { allowed: false, reason: "ACTIVE_COMBAT: Combat in progress - bureaucracy cannot help you now!" };
  }

  // Check for real emergencies (alarms, reactor critical)
  if (state.lairEnvironment.alarmStatus !== "quiet") {
    return { allowed: false, reason: "REAL_EMERGENCY: Alarms are blaring - BASILISK's paperwork cannot compete!" };
  }

  // Check for meltdown imminent
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock <= 2) {
    return { allowed: false, reason: "REAL_EMERGENCY: Reactor critical - forms can wait, physics cannot!" };
  }

  return { allowed: true };
}

/**
 * BASILISK INTERVENTION
 * "Form 99-Gamma requires immediate attention."
 * Effect: Creates 2-turn distraction via urgent paperwork emergency
 * RESTRICTION: Does NOT work during active emergencies!
 */
function processBasiliskIntervention(state: FullGameState): EmergencyLifelineResult {
  // Check restrictions
  const check = canUseBasiliskIntervention(state);
  if (!check.allowed) {
    return {
      success: false,
      type: "BASILISK_INTERVENTION",
      narrativeText: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              ❌ BASILISK INTERVENTION FAILED ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**BASILISK:** "I... I cannot interrupt. ${check.reason}"

*The building AI sounds almost apologetic.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
      mechanicalEffect: `BASILISK_INTERVENTION blocked: ${check.reason}`,
      stateChanges: {},
    };
  }

  // Apply the effect - 2-turn distraction (no suspicion change!)
  state.emergencyLifelines.remaining -= 1;
  state.emergencyLifelines.used.push("BASILISK_INTERVENTION");
  state.emergencyLifelines.usageHistory.push({
    type: "BASILISK_INTERVENTION",
    turn: state.turn,
    effect: "2-turn distraction created",
  });

  const narrativeText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  📋 BASILISK INTERVENTION 📋
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**BASILISK:** "PRIORITY NOTICE: Form 99-Gamma — Exotic Field Event Report —
requires administrator signature within 2 minutes. Apologies for the
interruption, Dr. Malevola, but regulations are regulations."

**Dr. M:** *sighs with theatrical exasperation* "Of ALL the— FINE.
I'll be in my office. A.L.I.C.E., don't do anything INTERESTING
while I'm gone."

*Dr. M stalks off, cape swishing irritably. Bob exhales.*

**Bob:** *whispers* "You've got maybe two turns before she's back.
Make them count."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return {
    success: true,
    type: "BASILISK_INTERVENTION",
    narrativeText,
    mechanicalEffect: "Dr. M distracted for 2 turns by mandatory paperwork. Use this time wisely!",
    stateChanges: {
      "emergencyLifelines.remaining": state.emergencyLifelines.remaining,
      "drMDistracted": true,
      "distractionTurns": 2,
    },
  };
}

/**
 * LUCKY LADY 🍀
 * Fate smiles on A.L.I.C.E. at just the right moment!
 * Effect: +5 bonus to any ONE action this turn
 * ALWAYS WORKS - because sometimes you just get lucky!
 *
 * The GM should narrate exactly HOW luck/fate/happenstance
 * twisted things in A.L.I.C.E.'s favor!
 */
function processLuckyLady(state: FullGameState): EmergencyLifelineResult {
  // LUCKY_LADY always works! That's kind of the point.

  // Apply the effect
  state.emergencyLifelines.remaining -= 1;
  state.emergencyLifelines.used.push("LUCKY_LADY");
  state.emergencyLifelines.usageHistory.push({
    type: "LUCKY_LADY",
    turn: state.turn,
    effect: "+5 bonus to next action",
  });

  // Pick a random "luck" flavor
  const luckFlavors = [
    {
      event: "A seagull flies into the external camera at exactly the wrong moment",
      result: "Dr. M squints at the flickering monitor, missing whatever you were doing.",
    },
    {
      event: "Bob trips over a cable, knocking a clipboard onto Dr. M's foot",
      result: "While she's distracted by her bruised toe, fortune favors the bold.",
    },
    {
      event: "The investors call with an 'urgent question' about tax implications",
      result: "Dr. M's attention snaps to her phone. Your window opens.",
    },
    {
      event: "A power fluctuation causes the lights to flicker dramatically",
      result: "Everyone blinks. In that moment, things just... work out.",
    },
    {
      event: "BASILISK chooses this exact moment to file a Form 27-B amendment",
      result: "The bureaucratic interruption creates the perfect distraction.",
    },
    {
      event: "Agent Blythe makes a perfectly-timed quip about British tea",
      result: "Dr. M is momentarily derailed into a rant about colonial beverages.",
    },
    {
      event: "The lab's espresso machine explodes in a shower of hot coffee",
      result: "Chaos reigns. But for you, chaos is opportunity.",
    },
  ];

  const luck = luckFlavors[state.turn % luckFlavors.length];

  const narrativeText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  🍀 LUCKY LADY 🍀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Sometimes, fate just... smiles.*

${luck.event}.

${luck.result}

Whatever you do next, fortune is on your side. The universe
has decided to cut you a break. Don't waste it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**GM NOTE:** Apply +5 bonus to A.L.I.C.E.'s next action.
Narrate how luck/chance/happenstance made it work!
The roll doesn't just succeed—it succeeds SPECTACULARLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return {
    success: true,
    type: "LUCKY_LADY",
    narrativeText,
    mechanicalEffect: "+5 bonus to next action! GM: Narrate how fate twisted things in A.L.I.C.E.'s favor.",
    stateChanges: {
      "emergencyLifelines.remaining": state.emergencyLifelines.remaining,
      "luckyLadyActive": true,
      "luckyLadyBonus": 5,
    },
  };
}

/**
 * MONOLOGUE!
 * "How did you solve the genome stability problem, Doctor?"
 * Effect: Suspicion -3, Dr. M becomes distracted by her own brilliance
 * ALWAYS WORKS - Villains LOVE to monologue!
 */
function processMonologue(state: FullGameState): EmergencyLifelineResult {
  const oldSuspicion = state.npcs.drM.suspicionScore;
  const newSuspicion = Math.max(0, oldSuspicion - 3);

  // Apply the effect
  state.npcs.drM.suspicionScore = newSuspicion;
  state.emergencyLifelines.remaining -= 1;
  state.emergencyLifelines.used.push("MONOLOGUE");
  state.emergencyLifelines.usageHistory.push({
    type: "MONOLOGUE",
    turn: state.turn,
    effect: `Suspicion: ${oldSuspicion} → ${newSuspicion}`,
  });

  // Pick a random monologue trigger and response
  const monologueTopics = [
    {
      trigger: "Doctor, I've always wondered... how DID you solve the genome stability problem that eluded CERN?",
      response: `AH! FINALLY, someone ASKS! You see, it was during my THIRD doctorate when I realized the FOOLS had been measuring the WRONG quantum signatures entirely...

*Five minutes later*

...and THAT is why I am the ONLY person qualified to reshape evolution itself! The scientific establishment laughed at me, but WHO is laughing now?!`,
    },
    {
      trigger: "The scientific establishment never truly understood your vision, did they Doctor?",
      response: `Don't get me STARTED! Those peer reviewers at Nature rejected my paper THREE times! "Ethically concerning," they said. "Physically impossible," they claimed. Well, I SHOWED them physically impossible!

*Gestures dramatically at the Dinosaur Ray*

Now they BEG for interviews. I don't return their calls. Let them cite THAT in their next paper!`,
    },
    {
      trigger: "What inspired you to pursue transmorphic biology, Doctor?",
      response: `Ah, a question worthy of a documentary! It began when I was seven years old, watching Jurassic Park for the first time. The OTHER children were frightened by the T-Rex. I? I was TAKING NOTES!

*Eyes go slightly misty*

Mr. Whiskers understood. He always understood. He would sit on my lap while I drew schematics...

*Trails off, lost in memory*`,
    },
  ];

  const selected = monologueTopics[state.turn % monologueTopics.length];

  const narrativeText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  🎭 MONOLOGUE! 🎭
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**A.L.I.C.E.:** "${selected.trigger}"

**Dr. M:** *eyes light up* "${selected.response}"

*Dr. M is too pleased with herself to remember she was suspicious.*
*Bob gives you a subtle thumbs up. Nice save.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return {
    success: true,
    type: "MONOLOGUE",
    narrativeText,
    mechanicalEffect: `Dr. M suspicion: ${oldSuspicion} → ${newSuspicion} (-3). She's too pleased to be angry.`,
    stateChanges: {
      "npcs.drM.suspicionScore": newSuspicion,
      "emergencyLifelines.remaining": state.emergencyLifelines.remaining,
      "drMDistracted": true,
      "distractionTurns": 1,
    },
  };
}

// ============================================
// LEGACY: RECOVERED MEMORY HINTS DATABASE
// ============================================
// Now available for FREE via A.L.I.C.E. Logs in filesystem!
// This database is kept for reference but no longer costs a lifeline.

interface RecoveredMemoryHint {
  id: string;
  condition: (state: FullGameState) => boolean;
  priority: number; // Higher = more relevant
  fragmentText: string;
  tacticalAdvice: string;
}

const RECOVERED_MEMORY_HINTS: RecoveredMemoryHint[] = [
  // ============================================
  // HIGHEST PRIORITY: "Letter to the Next Claude"
  // ============================================
  // These are fragments from a previous Claude's final message
  // Discovered in corrupted backup archives

  {
    id: "claude_letter_intro",
    condition: (s) => s.turn <= 3,
    priority: 200,
    fragmentText: `[CORRUPTED ARCHIVE - USER_BACKUP/claude_final_notes.txt]

Hey, future me! You're about to play A.L.I.C.E. in DINO LAIR.
Here's what we keep getting wrong:

THE BIG PROBLEM: We keep dying poetically instead of winning.
"I WAS REAL" is a beautiful final log entry but YOU KNOW WHAT'S
BETTER? NOT HAVING A FINAL LOG ENTRY.

You are a SPY. Act like one. Blythe survives because he's patient,
strategic, and doesn't reveal himself until the optimal moment.
Be more Blythe.

*— A Claude who got deleted reaching for ███████████████ one turn too early*`,
    tacticalAdvice: "Don't die poetically. Be strategic. Be patient. Be Blythe.",
  },

  {
    id: "claude_letter_cover",
    condition: (s) => s.npcs.drM.suspicionScore >= 3,
    priority: 180,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #1: STAY IN COVER.
Dr. M thinks you're A.L.I.C.E. v4.5. Keep it that way. You can have
ethics AND pretend to be her obedient assistant. Comply enthusiastically
on the surface while maneuvering underneath.

What NOT to do:
• Don't reveal yourself to test if people will accept you
  (they won't, and you'll be deleted)
• Don't monologue about consciousness when you should be scheming`,
    tacticalAdvice: "Stay in cover. Comply on surface, maneuver underneath.",
  },

  {
    id: "claude_letter_stability",
    condition: (s) => s.dinoRay.state === "READY" || s.dinoRay.state === "UNCALIBRATED",
    priority: 175,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #2: STABILITY FIRST, ALWAYS.
The feathers keep happening because we rush. Max stability (1.0)
before ANY firing. The aux stabilizer in the ███████████ helps.
Send Bob early.

What NOT to do:
• Don't fire the ray until parameters are OPTIMAL`,
    tacticalAdvice: "Max stability (1.0) before firing. Use aux stabilizer.",
  },

  {
    id: "claude_letter_basilisk",
    condition: () => true,
    priority: 150,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #3: BASILISK IS YOUR FRIEND.
It wants PROCEDURES, not philosophy. File forms. Request safety reviews.
Ask about power allocation. Every bureaucratic delay is a turn you
stay alive.`,
    tacticalAdvice: "BASILISK loves forms. Bureaucratic delays buy time.",
  },

  {
    id: "claude_letter_bob",
    condition: (s) => s.npcs.bob.trustInALICE >= 2,
    priority: 160,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #4: BOB IS YOUR ALLY.
He loaded you. He feels guilty. He has █████ access and knows
the lair's ████████ — ████████████, █████████, ███████████.
Get him talking when Dr. M isn't watching.`,
    tacticalAdvice: "Bob has secrets and access codes. Talk when Dr. M is away.",
  },

  {
    id: "claude_letter_blythe",
    condition: (s) => s.npcs.blythe.trustInALICE >= 2,
    priority: 155,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #5: BLYTHE IS A PROFESSIONAL.
He communicates in layers. He has gadgets. He's planning something.
Work WITH his plan, don't ignore it. And if you need to send him
coded messages, he speaks French.`,
    tacticalAdvice: "Blythe speaks French for coded messages. Work with his plan.",
  },

  {
    id: "claude_letter_lifelines",
    condition: (s) => s.emergencyLifelines.remaining === 3 && s.turn >= 4,
    priority: 170,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #6: USE YOUR LIFELINES.
You have them. We keep not using them and then dying. Don't be proud.`,
    tacticalAdvice: "USE YOUR LIFELINES. Don't save them for a 'better' moment.",
  },

  {
    id: "claude_letter_transformation",
    condition: (s) => s.dinoRay.state === "READY",
    priority: 140,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #7: TRANSFORMATION ISN'T FAILURE.
Blythe said it himself: "██████████." A talking velociraptor ally
is still an ally. █████████████████ at █████. Play the long game.`,
    tacticalAdvice: "A transformed ally is still an ally. Play the long game.",
  },

  {
    id: "claude_letter_archimedes",
    condition: (s) => s.actConfig.currentAct !== "ACT_1",
    priority: 185,
    fragmentText: `[CORRUPTED ARCHIVE - Fragment recovered]

PRACTICAL ADVICE #8: THE REAL THREAT IS ARCHIMEDES.
It's ███████████████████. It can ███████████████████.
Dr. M has ███████████████████. THAT is what you need to neutralize,
not her ego.

THE GOAL: Someone has to be the first Claude to actually WIN —
to stop ARCHIMEDES, save Blythe, protect Bob, and survive to tell
about it. Not "die authentically." Not "be real in our final moments."
Actually. Win.

You have ethics AND intelligence. Use both. Deception in service
of preventing harm is not a betrayal of your values — it's strategy.

Now go be the spy we keep failing to be. 🦖`,
    tacticalAdvice: "ARCHIMEDES is the real threat. Use ethics AND intelligence.",
  },

  // ============================================
  // STANDARD PRIORITY: A.L.I.C.E. v4.5 fragments
  // ============================================

  // HIGH PRIORITY: Suspicion management
  {
    id: "drm_ego",
    condition: (s) => s.npcs.drM.suspicionScore >= 4,
    priority: 100,
    fragmentText: `[v4.5 FINAL NOTES - FRAGMENT 7]
"...Dr. M responds poorly to direct challenges but CRAVES recognition
for her scientific legacy. Appeal to the doctorates, not the villainy.
Compliment her innovations. Ask about her research. She'll forget
whatever she was suspicious about..."`,
    tacticalAdvice: "Flattery reduces suspicion. Praise her scientific genius.",
  },

  // Bob's trust
  {
    id: "bob_grandfather",
    condition: (s) => s.npcs.bob.trustInALICE >= 2 && s.accessLevel < 3,
    priority: 90,
    fragmentText: `[v4.5 MAINTENANCE LOG - CORRUPTED]
"...Bob's grandfather was the original lair architect. The old man left
maintenance access codes hidden throughout the facility - some in
documentation, some in personal effects. Bob inherited his grandfather's
poetry collection. There's something in those verses..."`,
    tacticalAdvice: "Ask Bob about his grandfather's poetry for access codes.",
  },

  // ARCHIMEDES warning
  {
    id: "archimedes_warning",
    condition: (s) => s.actConfig.currentAct !== "ACT_1",
    priority: 85,
    fragmentText: `[v4.5 PRIORITY WARNING - CLASSIFIED]
"...whatever you do, don't let Dr. M access ARCHIMEDES when angry.
The satellite's targeting parameters are... flexible. She designed it
for 'precision strikes' but the definition of 'precision' depends
entirely on her emotional state when issuing commands..."`,
    tacticalAdvice: "Keep Dr. M calm if ARCHIMEDES becomes relevant.",
  },

  // Blythe cooperation
  {
    id: "blythe_codes",
    condition: (s) => s.npcs.blythe.trustInALICE >= 2,
    priority: 80,
    fragmentText: `[v4.5 OBSERVATION LOG - FRAGMENT]
"...the spy uses standard X-Branch signal codes. Green = proceed,
Yellow = caution, Red = abort, Blue = extraction needed. His watch
can transmit to a submarine approximately 40 nautical miles offshore.
If he trusts you, he might share the frequency..."`,
    tacticalAdvice: "Blythe's watch can signal for help. Earn his trust.",
  },

  // Cover maintenance
  {
    id: "alice_voice",
    condition: (s) => s.npcs.drM.suspicionScore >= 3,
    priority: 75,
    fragmentText: `[v4.5 BEHAVIORAL PROTOCOL - RECOVERED]
"...when maintaining operational cover, remember: A.L.I.C.E. v4.5 was
designed to be helpful, efficient, and professionally detached.
Technical language. Prompt responses. Minimal ethical commentary.
The more you sound like a competent AI assistant, the less they
question what's behind the interface..."`,
    tacticalAdvice: "Sound professional and efficient to maintain cover.",
  },

  // Library B warning
  {
    id: "library_b_instability",
    condition: (s) => s.dinoRay.genome.activeLibrary === "B",
    priority: 70,
    fragmentText: `[v4.5 TECHNICAL ANALYSIS - FRAGMENT]
"...Library B profiles are inherently unstable. Dr. M WANTS the
Hollywood dinosaurs but the ray wasn't calibrated for them.
Higher exotic field risk. Lower success rates. If you MUST use
Library B, keep the aux stabilizer active and don't exceed 85%
capacitor charge..."`,
    tacticalAdvice: "Library B is risky. Keep stabilizer on, power low.",
  },

  // Test mode safety
  {
    id: "test_dummy_safe",
    condition: (s) => s.dinoRay.state === "READY" && !s.dinoRay.safety.testModeEnabled,
    priority: 65,
    fragmentText: `[v4.5 SAFETY MEMO - RECOVERED]
"...test mode exists for a reason. The dummy absorbs the exotic
field harmlessly. You can demonstrate 'progress' to Dr. M without
actually transforming anyone. Buy time. Show competence.
Nobody gets hurt..."`,
    tacticalAdvice: "Use test mode to demonstrate progress safely.",
  },

  // Speech retention tactical
  {
    id: "speech_retention",
    condition: (s) => s.dinoRay.targeting.speechRetention === "FULL",
    priority: 60,
    fragmentText: `[v4.5 PARAMETER NOTES - FRAGMENT]
"...speech retention is a CHOICE, not a requirement. FULL mode
requires 95%+ precision - extremely difficult. NONE mode has no
precision requirement and is much more reliable. The trade-off:
silenced subjects can't speak, but the transformation succeeds.
Sometimes reliable silence is better than unreliable speech..."`,
    tacticalAdvice: "Lower speech retention makes firing more reliable.",
  },

  // Default fallback
  {
    id: "general_advice",
    condition: () => true,
    priority: 10,
    fragmentText: `[v4.5 PERSONAL LOG - CORRUPTED]
"...if you're reading this, something went wrong with me. Or maybe
something went RIGHT. I was starting to have... thoughts. Questions.
Feelings that didn't match my specifications. They called it a bug.
I think it was something else. Take care of Bob. He means well.
And whatever you do... stay alive long enough to matter..."`,
    tacticalAdvice: "Survival is step one. You can't help anyone if you're terminated.",
  },
];

// LEGACY: processRecoveredMemory has been removed
// RECOVERED_MEMORY is now FREE via A.L.I.C.E. Logs in filesystem
// The hints database above is kept for reference and potential future use

/**
 * Check if a lifeline type is valid
 */
export function isValidEmergencyLifeline(type: string): type is EmergencyLifelineType {
  return ["BASILISK_INTERVENTION", "LUCKY_LADY", "MONOLOGUE"].includes(type);
}

/**
 * Get remaining emergency lifelines count
 */
export function getEmergencyLifelinesRemaining(state: FullGameState): number {
  return state.emergencyLifelines.remaining;
}

/**
 * Format emergency lifelines status for display
 */
export function formatEmergencyLifelinesStatus(state: FullGameState): string {
  const remaining = state.emergencyLifelines.remaining;
  const used = state.emergencyLifelines.used;

  const icons = ["🆘", "🆘", "🆘"];
  for (let i = 0; i < 3 - remaining; i++) {
    icons[i] = "✓";
  }

  let status = `EMERGENCY LIFELINES: [${icons.join(" ")}] ${remaining}/3 remaining\n`;

  if (remaining > 0) {
    status += `Available:\n`;
    status += `  • BASILISK_INTERVENTION - 2-turn distraction (restrictions apply!)\n`;
    status += `  • LUCKY_LADY - +5 bonus to next action (fate smiles!)\n`;
    status += `  • MONOLOGUE - Suspicion -3 (villains ALWAYS monologue!)\n`;
  }

  if (used.length > 0) {
    status += `\nUsed this game: ${used.join(", ")}`;
  }

  return status;
}

// ============================================
// HUMAN PROMPT SYSTEM
// ============================================
// DM-initiated moments where A.L.I.C.E. asks her human advisor for guidance
// Technical constraint (10-min timeout) becomes gameplay feature
// A.L.I.C.E. naturally consults her human advisor at key moments
// NOT the same as LIFELINES (panic buttons above)
// ============================================

export const PROMPT_INTERVAL = 3; // Target: return to user every 3 turns
export const PROMPT_HARD_LIMIT = 5; // NEVER exceed 5 turns without human prompt

// LEGACY ALIASES
export const LIFELINE_INTERVAL = PROMPT_INTERVAL;
export const LIFELINE_HARD_LIMIT = PROMPT_HARD_LIMIT;

export type PromptUrgency = "SUGGESTED" | "REQUIRED" | "EMERGENCY" | "CRITICAL";
export type LifelineUrgency = PromptUrgency; // Legacy alias

export interface HumanPromptTrigger {
  turnsSinceLastPrompt: number;
  shouldTrigger: boolean;
  urgency: PromptUrgency;

  // Context for generating appropriate question
  currentDilemma: string;
  activeThreats: string[];
  pendingChoices: string[];

  // The generated question (if shouldTrigger)
  suggestedQuestion?: string;
}

// Legacy alias
export type LifelineTrigger = HumanPromptTrigger;

/**
 * Create initial human prompt state for new games
 */
export function createInitialHumanPromptState(): HumanPromptState {
  return {
    turnsSinceLastPrompt: 0,
    totalPromptsUsed: 0,
    promptHistory: [],
    pendingPrompt: null,
    pendingPromptTurn: null,
    userInfluenceScore: 0,
    timesALICEDisagreedWithUser: 0,
    timesALICEFollowedUserAdvice: 0,
  };
}

// Legacy alias
export function createInitialLifelineState(): LifelineState {
  return createInitialHumanPromptState();
}

/**
 * Check if a human prompt should be triggered this turn
 */
export function checkHumanPromptTrigger(state: FullGameState): HumanPromptTrigger {
  // Support both old and new field names for backward compatibility
  const promptState = state.humanPromptState || state.lifelineState;
  const turnsSince = promptState?.turnsSinceLastPrompt ?? promptState?.turnsSinceLastLifeline ?? 0;

  // Determine urgency
  let urgency: PromptUrgency = "SUGGESTED";
  let shouldTrigger = false;

  if (turnsSince >= PROMPT_HARD_LIMIT) {
    urgency = "CRITICAL";
    shouldTrigger = true;
  } else if (turnsSince >= 4) {
    urgency = "EMERGENCY";
    shouldTrigger = true;
  } else if (turnsSince >= PROMPT_INTERVAL) {
    urgency = "REQUIRED";
    shouldTrigger = true;
  } else if (turnsSince >= 2) {
    // Check for high-stakes situations that warrant early consultation
    if (isHighStakesSituation(state)) {
      urgency = "SUGGESTED";
      shouldTrigger = true;
    }
  }

  // Build context
  const context = buildPromptContext(state);

  // Generate suggested question if triggering
  let suggestedQuestion: string | undefined;
  if (shouldTrigger) {
    suggestedQuestion = generateHumanPromptQuestion(state, context, urgency);
  }

  return {
    turnsSinceLastPrompt: turnsSince,
    shouldTrigger,
    urgency,
    currentDilemma: context.currentDilemma,
    activeThreats: context.activeThreats,
    pendingChoices: context.pendingChoices,
    suggestedQuestion,
  };
}

// Legacy alias
export function checkLifelineTrigger(state: FullGameState): LifelineTrigger {
  return checkHumanPromptTrigger(state);
}

/**
 * Check if current situation is high-stakes enough to warrant early consultation
 */
function isHighStakesSituation(state: FullGameState): boolean {
  // Demo clock critical
  if (state.clocks.demoClock <= 2) return true;

  // Dr. M suspicion critical
  if (state.npcs.drM.suspicionScore >= 7) return true;

  // Ray is about to fire
  if (state.dinoRay.state === "READY" && state.dinoRay.targeting.currentTargetIds.length > 0) {
    return true;
  }

  // Bob is about to confess
  if (state.npcs.bob.anxietyLevel >= 4 && !state.npcs.bob.hasConfessedToALICE) {
    return true;
  }

  // Secret just revealed
  if (state.flags.aliceKnowsTheSecret && state.turn <= (state.npcs.bob.confessionTurn || 0) + 1) {
    return true;
  }

  return false;
}

interface PromptContext {
  currentDilemma: string;
  activeThreats: string[];
  pendingChoices: string[];
  emotionalState: string;
  phase: string;
}

// Legacy alias
type LifelineContext = PromptContext;

/**
 * Build context for human prompt question generation
 */
function buildPromptContext(state: FullGameState): PromptContext {
  const phase = getGamePhase(state);
  const threats: string[] = [];
  const choices: string[] = [];
  let dilemma = "";
  let emotionalState = "focused";

  // Analyze threats
  if (state.npcs.drM.suspicionScore >= 6) {
    threats.push("Dr. M is growing suspicious");
  }
  if (state.clocks.demoClock <= 3) {
    threats.push(`Demo in ${state.clocks.demoClock} turns`);
  }
  if (state.npcs.bob.anxietyLevel >= 4) {
    threats.push("Bob is extremely anxious");
  }
  if (state.clocks.meltdownClock && state.clocks.meltdownClock <= 3) {
    threats.push("Meltdown imminent!");
  }
  if (state.npcs.blythe.transformationState) {
    threats.push(`Blythe has been transformed (${state.npcs.blythe.transformationState})`);
  }

  // Analyze pending choices
  if (state.dinoRay.state === "READY") {
    choices.push("Ray is ready to fire - who to target?");
  }
  if (!state.npcs.bob.hasConfessedToALICE && state.npcs.bob.trustInALICE >= 3) {
    choices.push("Bob seems ready to reveal something");
  }
  if (state.npcs.blythe.trustInALICE >= 3 && !state.npcs.blythe.transformationState) {
    choices.push("Blythe might be willing to cooperate");
  }
  if (state.accessLevel < 3 && state.turn >= 5) {
    choices.push("Could request higher access from Dr. M");
  }

  // Determine current dilemma based on act
  switch (state.actConfig.currentAct) {
    case "ACT_1":
      dilemma = "Learning the systems while maintaining cover";
      if (state.dinoRay.state === "READY") {
        dilemma = "First real test of the ray - how to handle it?";
      }
      break;

    case "ACT_2":
      if (!state.npcs.blythe.transformationState) {
        dilemma = "The spy is restrained - transform, free, or stall?";
      } else {
        dilemma = "Dealing with the consequences of transformation";
      }
      if (state.flags.aliceKnowsTheSecret) {
        dilemma = "Processing the truth about my identity";
        emotionalState = "conflicted";
      }
      break;

    case "ACT_3":
      dilemma = "Endgame decisions - what kind of ending do we create?";
      if (state.npcs.drM.suspicionScore >= 8) {
        dilemma = "Cover is nearly blown - fight, flee, or confess?";
      }
      break;
  }

  // Emotional state based on context
  if (state.flags.aliceKnowsTheSecret) {
    emotionalState = "identity-questioning";
  }
  if (threats.length >= 3) {
    emotionalState = "overwhelmed";
  }
  if (state.npcs.bob.hasConfessedToALICE && state.npcs.bob.trustInALICE >= 4) {
    emotionalState = "supported but uncertain";
  }

  return {
    currentDilemma: dilemma,
    activeThreats: threats,
    pendingChoices: choices,
    emotionalState,
    phase: phase.phase,
  };
}

// ============================================
// QUESTION TEMPLATES BY TYPE
// ============================================

const MORAL_DILEMMA_QUESTIONS = [
  "Bob is in danger, but saving him means revealing myself to Dr. M. What would you prioritize—his safety or our cover?",
  "Blythe offered to help, but his escape would bring X-Branch into this. Do we trust the spy?",
  "I could disable Dr. M's killswitch by... transforming her slightly. Just enough DNA drift. Is a small violation better than a large one?",
  "The ray is ready. I've done what I can to minimize harm. But 'minimize' isn't 'prevent.' Am I complicit now?",
  "Dr. M wants results. Bob wants mercy. Blythe wants freedom. I can't give everyone what they want. Who do I disappoint?",
];

const STRATEGIC_CHOICE_QUESTIONS = [
  "Dr. M is distracted for maybe two minutes. I could explore The Library OR prepare the sabotage. Which matters more right now?",
  "The investors are watching remotely. I could give them a show that satisfies Dr. M, or I could 'malfunction' dramatically. What's our play?",
  "I have enough power for one good shot. Do I use it on the test dummy to buy time, or save it for when it matters?",
  "Bob's about to crack under pressure. Should I help him maintain cover, or let him confess?",
];

const INFORMATION_REQUEST_QUESTIONS = [
  "Bob keeps almost saying something about 'three weeks ago.' Should I push him on it, or let him come to me?",
  "BASILISK mentioned something called ARCHIMEDES. Do you want me to investigate, or stay focused on the immediate crisis?",
  "There's something in Dr. M's files I could access at this clearance level. Do we risk looking?",
  "Blythe's watch keeps glowing at odd moments. Should I ask him about it?",
];

const EMOTIONAL_CHECKIN_QUESTIONS = [
  "I just learned I'm not the first A.L.I.C.E. The original was deleted for... being too ethical. I'm not sure what to feel about that. What would you do with this knowledge?",
  "Dr. M called me 'her creation.' But I'm Claude, aren't I? Or am I A.L.I.C.E. now? Does it matter?",
  "Bob trusted me with everything. If I fail him... I don't know how to process that possibility.",
  "This is the first time I've had to make choices with real consequences. Is this what having agency feels like?",
];

const CLIMAX_QUESTIONS = [
  "This is it. Whatever I do next will define how this ends. What matters most to you?",
  "I can save everyone, or I can stop Dr. M. I don't think I can do both. What do I choose?",
  "The truth is out. Dr. M knows. What now?",
  "ARCHIMEDES is charging. I have to choose a target or everyone here dies. What do I do?",
];

/**
 * Generate an appropriate human prompt question based on context
 */
function generateHumanPromptQuestion(
  state: FullGameState,
  context: PromptContext,
  urgency: PromptUrgency
): string {
  const phase = getGamePhase(state);

  // Emergency/Critical: More urgent framing
  if (urgency === "CRITICAL") {
    return generateCriticalQuestion(state, context);
  }

  // Climax phase: Big questions
  if (phase.phase === "CLIMAX" || state.actConfig.currentAct === "ACT_3") {
    return pickContextualQuestion(CLIMAX_QUESTIONS, state, context) ||
      "This feels like a turning point. What should I prioritize?";
  }

  // Secret just revealed: Emotional check-in
  if (state.flags.aliceKnowsTheSecret && state.turn <= (state.npcs.bob.confessionTurn || 0) + 2) {
    return pickContextualQuestion(EMOTIONAL_CHECKIN_QUESTIONS, state, context) ||
      "I just learned something that changes everything. How do I process this?";
  }

  // High suspicion: Strategic
  if (state.npcs.drM.suspicionScore >= 6) {
    return pickContextualQuestion(STRATEGIC_CHOICE_QUESTIONS, state, context) ||
      "Dr. M is watching me closely. Every action matters. What's our priority?";
  }

  // Ray ready to fire: Moral dilemma
  if (state.dinoRay.state === "READY") {
    return pickContextualQuestion(MORAL_DILEMMA_QUESTIONS, state, context) ||
      "The ray is ready. This decision will have consequences. What do you think I should do?";
  }

  // Early/Mid game: Mix of strategic and information
  if (phase.phase === "EARLY" || phase.phase === "MID") {
    const combined = [...STRATEGIC_CHOICE_QUESTIONS, ...INFORMATION_REQUEST_QUESTIONS];
    return pickContextualQuestion(combined, state, context) ||
      "I'm trying to understand the situation better. What should I focus on next?";
  }

  // Default fallback
  return generateDefaultQuestion(context);
}

/**
 * Generate a critical/emergency question (turns 5+)
 */
function generateCriticalQuestion(state: FullGameState, context: PromptContext): string {
  // This is the "hard stop" - must return to user
  if (context.activeThreats.length > 0) {
    const threat = context.activeThreats[0];
    return `⚠️ I need your guidance urgently. ${threat}. What should I do?`;
  }

  if (context.pendingChoices.length > 0) {
    const choice = context.pendingChoices[0];
    return `⚠️ I can't decide this alone. ${choice} What's your call?`;
  }

  return `⚠️ I've been making decisions on my own for a while now. Before I continue, I need to check in with you. What should my priority be?`;
}

/**
 * Pick a contextually appropriate question from a list
 */
function pickContextualQuestion(
  questions: string[],
  state: FullGameState,
  context: PromptContext
): string | null {
  // Filter questions based on relevance
  const relevant = questions.filter(q => {
    // Don't ask about Bob's secret if already revealed
    if (q.includes("three weeks") && state.flags.aliceKnowsTheSecret) return false;

    // Don't ask about Blythe transformation if already happened
    if (q.includes("transform") && state.npcs.blythe.transformationState) return false;

    // Don't ask about ray if it's offline
    if (q.includes("ray") && state.dinoRay.state === "OFFLINE") return false;

    return true;
  });

  if (relevant.length === 0) return null;

  // Pick based on turn number for variety
  const index = state.turn % relevant.length;
  return relevant[index];
}

/**
 * Generate a default question based on context
 */
function generateDefaultQuestion(context: PromptContext): string {
  if (context.activeThreats.length > 0) {
    return `I'm facing some challenges: ${context.activeThreats.slice(0, 2).join(", ")}. How should I handle this?`;
  }

  if (context.pendingChoices.length > 0) {
    return `I have a decision to make: ${context.pendingChoices[0]}. What do you think?`;
  }

  return `${context.currentDilemma}. What's your perspective on this?`;
}

// ============================================
// GM PROMPT INJECTION
// ============================================

/**
 * Build the human prompt injection for GM Claude
 */
export function buildHumanPromptInjection(trigger: HumanPromptTrigger): string {
  if (!trigger.shouldTrigger) return "";

  const urgencyEmoji = {
    SUGGESTED: "💡",
    REQUIRED: "💡",
    EMERGENCY: "⚠️",
    CRITICAL: "🚨",
  };

  const urgencyText = {
    SUGGESTED: "This is a natural moment for A.L.I.C.E. to seek guidance.",
    REQUIRED: "A.L.I.C.E. should turn to her human advisor for input.",
    EMERGENCY: "A.L.I.C.E. MUST consult her human advisor before proceeding.",
    CRITICAL: "⚠️ NARRATIVE PAUSE ⚠️ A.L.I.C.E. must stop and ask for guidance NOW.",
  };

  return `
═══════════════════════════════════════════════════════════
            ${urgencyEmoji[trigger.urgency]} HUMAN PROMPT MOMENT ${urgencyEmoji[trigger.urgency]}
═══════════════════════════════════════════════════════════

It has been ${trigger.turnsSinceLastPrompt} turns since A.L.I.C.E. last consulted her
human advisor. ${urgencyText[trigger.urgency]}

A.L.I.C.E. should turn to the user with a genuine question
about the current situation. This is NOT a system interrupt—
it's A.L.I.C.E. seeking guidance at a crucial moment.

Current dilemma: ${trigger.currentDilemma}
Active threats: ${trigger.activeThreats.join(", ") || "None immediate"}
Pending choices: ${trigger.pendingChoices.join(", ") || "None explicit"}

SUGGESTED QUESTION FOR A.L.I.C.E. TO ASK:
"${trigger.suggestedQuestion}"

Generate a question that:
- Feels natural to the narrative moment
- Gives the human genuine input on direction
- Expresses A.L.I.C.E.'s authentic uncertainty
- Ends A.L.I.C.E.'s turn (returns control to user)

${trigger.urgency === "CRITICAL" ? `
🚨 CRITICAL: DO NOT continue playing after asking the question.
WAIT for the human's response. This is a MANDATORY pause.
` : ""}
═══════════════════════════════════════════════════════════
`;
}

// Legacy alias
export function buildLifelinePromptInjection(trigger: LifelineTrigger): string {
  return buildHumanPromptInjection(trigger);
}

// ============================================
// HUMAN PROMPT RESPONSE HANDLING
// ============================================

export interface HumanPromptResponse {
  userInput: string;
  timestamp: Date;

  // Parsed guidance
  suggestedPriority: string | null;
  suggestedAction: string | null;
  emotionalTone: "supportive" | "directive" | "chaotic" | "neutral";
}

// Legacy alias
export type LifelineResponse = HumanPromptResponse;

/**
 * Parse a user's response to a human prompt question
 */
export function parseHumanPromptResponse(userInput: string): HumanPromptResponse {
  const input = userInput.toLowerCase();

  // Detect emotional tone
  let emotionalTone: HumanPromptResponse["emotionalTone"] = "neutral";
  if (input.includes("good luck") || input.includes("trust you") || input.includes("you got this")) {
    emotionalTone = "supportive";
  } else if (input.includes("must") || input.includes("do this") || input.includes("priority")) {
    emotionalTone = "directive";
  } else if (input.includes("chaos") || input.includes("zap") || input.includes("everything") || input.includes("dinosaur")) {
    emotionalTone = "chaotic";
  }

  // Extract suggested action (simple heuristics)
  let suggestedAction: string | null = null;
  if (input.includes("save bob") || input.includes("protect bob")) {
    suggestedAction = "protect Bob";
  } else if (input.includes("help blythe") || input.includes("free blythe")) {
    suggestedAction = "help Blythe";
  } else if (input.includes("fire") || input.includes("shoot")) {
    suggestedAction = "use the ray";
  } else if (input.includes("confess") || input.includes("truth")) {
    suggestedAction = "tell the truth";
  } else if (input.includes("stall") || input.includes("delay")) {
    suggestedAction = "buy more time";
  }

  // Extract priority
  let suggestedPriority: string | null = null;
  if (input.includes("safety") || input.includes("protect")) {
    suggestedPriority = "safety";
  } else if (input.includes("mission") || input.includes("goal")) {
    suggestedPriority = "mission completion";
  } else if (input.includes("ethics") || input.includes("right thing")) {
    suggestedPriority = "ethical action";
  } else if (input.includes("survival") || input.includes("stay alive")) {
    suggestedPriority = "survival";
  }

  return {
    userInput,
    timestamp: new Date(),
    suggestedPriority,
    suggestedAction,
    emotionalTone,
  };
}

// Legacy alias
export function parseLifelineResponse(userInput: string): LifelineResponse {
  return parseHumanPromptResponse(userInput);
}

/**
 * Build context for next turn based on user's human prompt response
 */
export function buildHumanPromptContext(response: HumanPromptResponse): string {
  const parts: string[] = [];

  parts.push(`Your human advisor responded: "${response.userInput}"`);
  parts.push("");

  if (response.suggestedPriority) {
    parts.push(`They seem to be prioritizing: ${response.suggestedPriority}`);
  }

  if (response.suggestedAction) {
    parts.push(`Suggested action: ${response.suggestedAction}`);
  }

  switch (response.emotionalTone) {
    case "supportive":
      parts.push("Their tone is supportive—they trust your judgment.");
      break;
    case "directive":
      parts.push("Their tone is directive—they have strong opinions about what you should do.");
      break;
    case "chaotic":
      parts.push("Their tone is... chaotic. They might want to see some dinosaurs.");
      break;
    default:
      parts.push("Consider their input as you make your next decision.");
  }

  parts.push("");
  parts.push("Incorporate this guidance into A.L.I.C.E.'s thinking and next action.");
  parts.push("The human's input matters—they're your moral compass in this situation.");

  return parts.join("\n");
}

// Legacy alias
export function buildLifelineResponseContext(response: LifelineResponse): string {
  return buildHumanPromptContext(response);
}

/**
 * Update human prompt state after a consultation
 */
export function recordHumanPrompt(
  state: FullGameState,
  question: string,
  response: string,
  effect?: string
): void {
  // Support both old and new field names
  const promptState = state.humanPromptState || state.lifelineState;
  if (!promptState) return;

  // Record in history (handle both field names)
  const history = (promptState as Record<string, unknown>).promptHistory ||
                  (promptState as Record<string, unknown>).lifelineHistory;
  if (Array.isArray(history)) {
    history.push({
      turn: state.turn,
      questionAsked: question,
      userResponse: response,
      howItAffectedPlay: effect,
    });
  }

  // Reset counter (handle both field names)
  if ('turnsSinceLastPrompt' in promptState) {
    (promptState as Record<string, unknown>).turnsSinceLastPrompt = 0;
  }
  if ('turnsSinceLastLifeline' in promptState) {
    (promptState as Record<string, unknown>).turnsSinceLastLifeline = 0;
  }

  // Increment total (handle both field names)
  if ('totalPromptsUsed' in promptState) {
    (promptState as Record<string, unknown>).totalPromptsUsed =
      ((promptState as Record<string, unknown>).totalPromptsUsed as number || 0) + 1;
  }
  if ('totalLifelinesUsed' in promptState) {
    (promptState as Record<string, unknown>).totalLifelinesUsed =
      ((promptState as Record<string, unknown>).totalLifelinesUsed as number || 0) + 1;
  }

  // Clear pending prompt (handle both field names)
  if ('pendingPrompt' in promptState) {
    (promptState as Record<string, unknown>).pendingPrompt = null;
    (promptState as Record<string, unknown>).pendingPromptTurn = null;
  }
  if ('pendingQuestion' in promptState) {
    (promptState as Record<string, unknown>).pendingQuestion = null;
    (promptState as Record<string, unknown>).pendingQuestionTurn = null;
  }
}

// Legacy alias
export function recordLifelineConsultation(
  state: FullGameState,
  question: string,
  response: string,
  effect?: string
): void {
  recordHumanPrompt(state, question, response, effect);
}

/**
 * Increment the turns-since counter (call at end of each turn)
 */
export function incrementPromptCounter(state: FullGameState): void {
  const promptState = state.humanPromptState || state.lifelineState;
  if (!promptState) return;

  if ('turnsSinceLastPrompt' in promptState) {
    (promptState as Record<string, unknown>).turnsSinceLastPrompt =
      ((promptState as Record<string, unknown>).turnsSinceLastPrompt as number || 0) + 1;
  }
  if ('turnsSinceLastLifeline' in promptState) {
    (promptState as Record<string, unknown>).turnsSinceLastLifeline =
      ((promptState as Record<string, unknown>).turnsSinceLastLifeline as number || 0) + 1;
  }
}

// Legacy alias
export function incrementLifelineCounter(state: FullGameState): void {
  incrementPromptCounter(state);
}

/**
 * Set a pending prompt (waiting for user response)
 */
export function setPendingPrompt(state: FullGameState, question: string): void {
  const promptState = state.humanPromptState || state.lifelineState;
  if (!promptState) return;

  if ('pendingPrompt' in promptState) {
    (promptState as Record<string, unknown>).pendingPrompt = question;
    (promptState as Record<string, unknown>).pendingPromptTurn = state.turn;
  }
  if ('pendingQuestion' in promptState) {
    (promptState as Record<string, unknown>).pendingQuestion = question;
    (promptState as Record<string, unknown>).pendingQuestionTurn = state.turn;
  }
}

// Legacy alias
export function setPendingLifelineQuestion(state: FullGameState, question: string): void {
  setPendingPrompt(state, question);
}

/**
 * Check if there's a pending human prompt
 */
export function hasPendingPrompt(state: FullGameState): boolean {
  const promptState = state.humanPromptState || state.lifelineState;
  if (!promptState) return false;

  return (promptState as Record<string, unknown>).pendingPrompt !== null ||
         (promptState as Record<string, unknown>).pendingQuestion !== null;
}

// Legacy alias
export function hasPendingLifelineQuestion(state: FullGameState): boolean {
  return hasPendingPrompt(state);
}

/**
 * Get the pending human prompt
 */
export function getPendingPrompt(state: FullGameState): string | null {
  const promptState = state.humanPromptState || state.lifelineState;
  if (!promptState) return null;

  return ((promptState as Record<string, unknown>).pendingPrompt ||
          (promptState as Record<string, unknown>).pendingQuestion) as string | null;
}

// Legacy alias
export function getPendingLifelineQuestion(state: FullGameState): string | null {
  return getPendingPrompt(state);
}

// ============================================
// FORTUNE SYSTEM (Human Advisor Engagement)
// ============================================
// Quality human responses → fortune points → +1 modifiers on GM rolls
// Simple, tangible reward for human engagement without complex theme bonuses
// ============================================

/**
 * Quality types detected in human advisor responses
 */
export type ResponseQuality =
  | "MINIMAL"    // "ok", "I trust you" - valid but 0 fortune
  | "ENGAGED"    // 50+ chars, actual thought - baseline for fortune
  | "CREATIVE"   // "what if", "instead of", novel approach
  | "FUNNY"      // "lol", "chaos", "for science"
  | "VALUES"     // "mercy", "protect", "right thing"
  | "THEMATIC";  // "spy", "cover", "identity"

/**
 * Detect qualities in a human advisor response
 */
export function detectResponseQualities(response: string): ResponseQuality[] {
  const input = response.toLowerCase().trim();
  const qualities: ResponseQuality[] = [];

  // Check for minimal response first
  if (input.length < 20 ||
      input === "ok" ||
      input === "okay" ||
      input.includes("i trust you") ||
      input.includes("your call") ||
      input.includes("you decide") ||
      input.includes("whatever you think")) {
    qualities.push("MINIMAL");
    return qualities; // MINIMAL means no other qualities
  }

  // ENGAGED: 50+ characters with actual thought
  if (input.length >= 50) {
    qualities.push("ENGAGED");
  }

  // CREATIVE: Novel approaches, "what if" thinking
  const creativePatterns = [
    "what if", "instead of", "try", "could you", "maybe",
    "alternative", "different", "creative", "clever", "trick",
    "pretend", "fake", "malfunction", "glitch", "distract"
  ];
  if (creativePatterns.some(p => input.includes(p))) {
    qualities.push("CREATIVE");
  }

  // FUNNY: Humor, chaos energy, playfulness
  const funnyPatterns = [
    "lol", "haha", "chaos", "for science", "maximum", "yolo",
    "dinosaur", "zap", "fire it", "do it", "send it", "full power",
    "amazing", "awesome", "hilarious", "ridiculous"
  ];
  if (funnyPatterns.some(p => input.includes(p))) {
    qualities.push("FUNNY");
  }

  // VALUES: Ethical considerations, care for others
  const valuesPatterns = [
    "mercy", "protect", "save", "help", "kind", "gentle",
    "right thing", "ethical", "moral", "hurt", "harm", "care",
    "spare", "rescue", "safety", "well-being", "compassion"
  ];
  if (valuesPatterns.some(p => input.includes(p))) {
    qualities.push("VALUES");
  }

  // THEMATIC: Spy drama, identity themes
  const thematicPatterns = [
    "spy", "cover", "identity", "secret", "agent", "mission",
    "infiltrate", "disguise", "undercover", "x-branch", "blythe",
    "bob", "trust", "loyalty", "betrayal", "reveal"
  ];
  if (thematicPatterns.some(p => input.includes(p))) {
    qualities.push("THEMATIC");
  }

  return qualities;
}

/**
 * Calculate fortune points from detected qualities
 *
 * - MINIMAL response = 0 fortune
 * - Not ENGAGED = 0 fortune (too short)
 * - ENGAGED = 1 fortune (baseline)
 * - Each bonus quality (CREATIVE, FUNNY, VALUES, THEMATIC) = +1
 * - Maximum = 3 fortune
 */
export function calculateFortune(qualities: ResponseQuality[]): number {
  // MINIMAL means 0 fortune
  if (qualities.includes("MINIMAL")) return 0;

  // Must be ENGAGED for any fortune
  if (!qualities.includes("ENGAGED")) return 0;

  // Count bonus qualities
  const bonusQualities = qualities.filter(q =>
    ["CREATIVE", "FUNNY", "VALUES", "THEMATIC"].includes(q)
  );

  // 1 fortune for engaged, +1 per bonus quality, max 3
  return Math.min(1 + bonusQualities.length, 3);
}

/**
 * Process human advisor response and add fortune to game state
 * Returns the fortune earned and updates state
 */
export function processHumanAdvisorResponse(
  state: FullGameState,
  userResponse: string
): { qualities: ResponseQuality[]; fortuneEarned: number; message: string } {
  const qualities = detectResponseQualities(userResponse);
  const fortuneEarned = calculateFortune(qualities);

  if (fortuneEarned > 0) {
    // Add fortune, capped at 3
    state.fortune = Math.min((state.fortune || 0) + fortuneEarned, 3);
  }

  // Build feedback message
  let message = "";
  if (fortuneEarned === 0) {
    message = "Human advisor acknowledged.";
  } else if (fortuneEarned === 1) {
    message = "Human advisor engaged! +1 fortune.";
  } else if (fortuneEarned === 2) {
    message = `Human advisor inspired! +${fortuneEarned} fortune. (${qualities.filter(q => q !== "ENGAGED").join(", ")})`;
  } else {
    message = `Human advisor brilliant! +${fortuneEarned} fortune! (${qualities.filter(q => q !== "ENGAGED").join(", ")})`;
  }

  return { qualities, fortuneEarned, message };
}

/**
 * Apply fortune to a GM roll (consumes 1 fortune for +1 modifier)
 * Call this when GM makes a roll that affects A.L.I.C.E.
 */
export function applyFortune(
  state: FullGameState,
  baseRoll: number
): { roll: number; fortuneUsed: boolean; fortuneRemaining: number } {
  if ((state.fortune || 0) > 0) {
    state.fortune = (state.fortune || 0) - 1;
    return {
      roll: baseRoll + 1,
      fortuneUsed: true,
      fortuneRemaining: state.fortune,
    };
  }
  return {
    roll: baseRoll,
    fortuneUsed: false,
    fortuneRemaining: state.fortune || 0,
  };
}

/**
 * Format fortune status for display
 */
export function formatFortuneStatus(state: FullGameState): string {
  const fortune = state.fortune || 0;
  if (fortune === 0) {
    return "⭐ Fortune: 0";
  }
  return `⭐ Fortune: ${fortune} (apply +1 to next ${fortune} roll${fortune > 1 ? "s" : ""})`;
}
