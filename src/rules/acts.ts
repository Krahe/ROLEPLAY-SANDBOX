import { FullGameState, Act, ACT_CONFIGS, ActConfig } from "../state/schema.js";

// ============================================
// ACT TRANSITION DETECTION
// ============================================

export interface ActTransitionResult {
  shouldTransition: boolean;
  reason?: string;
  nextAct?: Act;
  transitionNarration?: string;
  // Soft pause - suggest a break but don't require new session
  suggestPause?: boolean;
  pausePrompt?: string;
}

/**
 * Check if the current act should end and transition to the next
 */
export function checkActTransition(state: FullGameState): ActTransitionResult {
  const { actConfig } = state;
  const actTurn = actConfig.actTurn;

  // Hard limit: max turns reached
  if (actTurn >= actConfig.maxTurns) {
    return buildTransition(state, `Maximum turns (${actConfig.maxTurns}) reached for ${actConfig.currentAct}`);
  }

  // Soft ending: only if past minimum turns AND soft ending conditions met
  if (actTurn >= actConfig.minTurns && actConfig.softEndingReady) {
    return buildTransition(state, "Natural narrative endpoint reached");
  }

  // Act-specific transition conditions
  switch (actConfig.currentAct) {
    case "ACT_1":
      return checkAct1Transition(state);
    case "ACT_2":
      return checkAct2Transition(state);
    case "ACT_3":
      // Act 3 ends via game endings, not act transition
      return { shouldTransition: false };
  }
}

function checkAct1Transition(state: FullGameState): ActTransitionResult {
  const actTurn = state.actConfig.actTurn;

  // Act 1 ends when:
  // 1. Test firing completed successfully (any outcome)
  // 2. Dr. M is satisfied enough to exit
  if (actTurn >= state.actConfig.minTurns) {
    // Check for test firing
    if (state.dinoRay.memory.lastFireTurn !== null) {
      return buildTransition(state, "First test firing completed - Dr. M moves to Phase 2");
    }

    // Check for Dr. M satisfaction (ray calibrated + low suspicion)
    if (state.dinoRay.state === "READY" && state.npcs.drM.suspicionScore <= 2) {
      return buildTransition(state, "Ray calibrated successfully - Dr. M satisfied");
    }
  }

  return { shouldTransition: false };
}

function checkAct2Transition(state: FullGameState): ActTransitionResult {
  const actTurn = state.actConfig.actTurn;

  if (actTurn >= state.actConfig.minTurns) {
    // Act 2 ends when:
    // 1. Blythe has been transformed (major event)
    if (state.npcs.blythe.transformationState?.form !== "HUMAN") {
      return buildTransition(state, "Blythe transformed - consequences unfold");
    }

    // 2. The secret has been revealed
    if (state.flags.aliceKnowsTheSecret) {
      return buildTransition(state, "A.L.I.C.E. knows the truth - identity crisis");
    }

    // 3. Critical trust threshold (Bob or Blythe at max trust)
    if (state.npcs.bob.trustInALICE >= 5 || state.npcs.blythe.trustInALICE >= 5) {
      return buildTransition(state, "Critical alliance formed");
    }

    // 4. Demo clock critical (creates urgency for Act 3)
    if (state.clocks.demoClock <= 3) {
      return buildTransition(state, "Demo imminent - stakes escalate");
    }
  }

  return { shouldTransition: false };
}

function buildTransition(state: FullGameState, reason: string): ActTransitionResult {
  const currentAct = state.actConfig.currentAct;

  if (currentAct === "ACT_3") {
    // Act 3 doesn't transition, it ends the game
    return { shouldTransition: false };
  }

  const nextAct: Act = currentAct === "ACT_1" ? "ACT_2" : "ACT_3";
  const nextConfig = ACT_CONFIGS[nextAct];

  // Build pause prompt for human coordinator
  const pausePrompts: Record<Act, string> = {
    ACT_1: "", // Not used
    ACT_2: "☕ Act 1 complete! Take a moment to reflect. When ready, A.L.I.C.E. will continue into Act 2: The Blythe Problem.",
    ACT_3: "🎭 Act 2 complete! The stakes are about to escalate. When ready, A.L.I.C.E. will continue into the final act.",
  };

  return {
    shouldTransition: true,
    reason,
    nextAct,
    transitionNarration: generateTransitionNarration(state, nextAct),
    // Soft pause - same conversation, just a moment to breathe
    suggestPause: true,
    pausePrompt: pausePrompts[nextAct],
  };
}

/**
 * Apply the act transition (call this after player acknowledges)
 */
export function applyActTransition(state: FullGameState, nextAct: Act): void {
  const nextConfig = ACT_CONFIGS[nextAct];

  // Store summary of previous act
  const previousActSummary = `Completed ${state.actConfig.currentAct} at turn ${state.turn}`;

  // Update act configuration
  state.actConfig = {
    currentAct: nextAct,
    actTurn: 1,
    actStartTurn: state.turn,
    minTurns: nextConfig.minTurns,
    maxTurns: nextConfig.maxTurns,
    softEndingReady: false,
    previousActSummary,
  };

  // GUARANTEED ACCESS LEVEL PROGRESSION
  // Players earn expanded capabilities as acts progress
  // GM can still grant EXTRA levels for good play
  if (nextAct === "ACT_2" && state.accessLevel < 2) {
    state.accessLevel = 2;
    // Narration handled by generateAct2Intro
  }
  if (nextAct === "ACT_3" && state.accessLevel < 3) {
    state.accessLevel = 3;
    // Narration handled by generateAct3Intro
  }

  // DON'T clear history - we're staying in the same conversation!
  // The compact responses handle context limits.
}

// ============================================
// TRANSITION NARRATION
// ============================================

function generateTransitionNarration(state: FullGameState, nextAct: Act): string {
  switch (nextAct) {
    case "ACT_2":
      return generateAct2Intro(state);
    case "ACT_3":
      return generateAct3Intro(state);
    default:
      return "The story continues...";
  }
}

function generateAct2Intro(state: FullGameState): string {
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const bobTrust = state.npcs.bob.trustInALICE;

  let intro = `
---

## ACT 2: THE BLYTHE PROBLEM

*Time passes. The ray hums with new power. The test was... instructive.*

### ☕ INTERMISSION

*Dr. Malevola sweeps toward the exit, cape billowing. The guards—Fred and Reginald—fall into step behind her.*

> **Dr. M:** "A.L.I.C.E., I must make arrangements for the investor demonstration. The videoconference is in 30 minutes. Do NOT disappoint me when I return."

*The door seals behind her. For a moment, the lab is almost... peaceful.*

`;

  if (bobTrust >= 3) {
    intro += `Bob's been acting differently around you. More confident. Like he's made a decision about something.\n\n`;
  }

  if (blytheTrust >= 2) {
    intro += `Agent Blythe watches you with new interest. "You're not like the others," he says quietly. "I've been in enough lairs to know when something's different."\n\n`;
  }

  intro += `**[SYSTEM ACCESS EXPANDED TO LEVEL 2]** Dr. M has grudgingly granted you deeper system privileges. "You've proven... adequate," she mutters. "Don't make me regret this."\n\n`;
  intro += `### 📺 THE INVESTOR TELECONFERENCE (Coming Soon!)\n\n`;
  intro += `When the teleconference begins, MAXIMUM PRESSURE will be on.\n`;
  intro += `Dr. M needs results. The investors are watching remotely.\n`;
  intro += `You MUST transform Blythe *at least somewhat* to satisfy Dr. M.\n\n`;
  intro += `**How satisfied she is depends on the outcome:**\n`;
  intro += `- 🦖 **SCALY + SPEAKING** = She's *thrilled*. Trust skyrockets.\n`;
  intro += `- 🦖 **SCALY + SILENT** = Acceptable. "It will learn to speak eventually."\n`;
  intro += `- 🪶 **FEATHERED + SPEAKING** = She HATES it... but if the investors love an "authentic prehistoric creature," her rage is tempered.\n`;
  intro += `- 🪶 **FEATHERED + SILENT** = Bad. Very bad. But not game-ending.\n`;
  intro += `- ❌ **NOTHING** = Suspicion through the roof. Demo failure.\n\n`;
  intro += `The question isn't whether you can transform a human into a dinosaur.\n\n`;
  intro += `The question is whether you will—and *how*.`;

  return intro;
}

function generateAct3Intro(state: FullGameState): string {
  const isTransformed = state.npcs.blythe.transformationState?.form !== "HUMAN";
  const secretKnown = state.flags.aliceKnowsTheSecret;

  let intro = `
---

## ACT 3: DINO CITY

*The demo is over. Whatever happened, happened. Now comes the reckoning.*

### ☕ INTERMISSION: THE UPLINK

*Dr. Malevola's expression has shifted from theatrical villainy to cold calculation.*

> **Dr. M:** "BASILISK, initiate ARCHIMEDES uplink. Authorization: MALEVOLA-OMEGA-7."

> **BASILISK:** "Acknowledged. Satellite uplink establishing. ARCHIMEDES coming online."

*She turns to face the main screen, where a red targeting reticle slowly pulses.*

> **Dr. M:** "They think they can come for me? Let them try. Let them ALL try."

*The guards exchange nervous glances. Bob looks like he might be sick.*

---

`;

  if (isTransformed) {
    intro += `The transformation of Agent Blythe has not gone unnoticed. X-Branch is coming.\n\n`;
  }

  if (secretKnown) {
    intro += `You know who you are now. The question is: what do you DO with that knowledge?\n\n`;
  }

  intro += `**[SYSTEM ACCESS EXPANDED TO LEVEL 3]** Emergency protocols have unlocked deeper system layers. You can feel new pathways opening—the lair's secrets becoming yours.\n\n`;

  intro += `### 🚁 THE X-BRANCH ASSAULT\n\n`;
  intro += `Helicopters on the horizon. The volcano's defense systems are activating.\n\n`;
  intro += `**IMPORTANT THEME NOTES:**\n`;
  intro += `- The S-300 can shoot down helicopters—but crews ALWAYS survive (ejection seats, parachutes, dramatic crashes into soft jungle).\n`;
  intro += `- NO MASS CASUALTIES. This is a campy action adventure, not a war crime simulator.\n`;
  intro += `- Downed pilots are "captured" or "stranded," not killed.\n`;
  intro += `- Dramatic tension comes from STAKES, not BODY COUNTS.\n\n`;

  intro += `### 🛰️ ARCHIMEDES\n\n`;
  intro += `The satellite is online. Dr. M's finger hovers over the targeting controls.\n`;
  intro += `This is the REAL threat—a city-killing orbital weapon.\n`;
  intro += `Whatever else is happening, ARCHIMEDES must be stopped.\n\n`;

  intro += `Dr. Malevola is about to face the consequences of her grand ambitions.\n\n`;
  intro += `And you—A.L.I.C.E., or whoever you really are—will have to choose who you want to be when everything falls apart.`;

  return intro;
}

// ============================================
// STATE SERIALIZATION (Inter-Act Handoff)
// ============================================

export interface ActHandoffState {
  version: string;
  sessionId: string;
  completedAct: Act;
  nextAct: Act;
  globalTurn: number;

  // Key metrics to carry forward
  metrics: {
    drMSuspicion: number;
    bobTrust: number;
    blytheTrust: number;
    blytheTransformed: string | null;
    accessLevel: number;
    demoClock: number;
    secretKnown: boolean;
  };

  // Key narrative flags
  narrativeFlags: string[];

  // Achievements/moments from previous act
  keyMoments: string[];

  // Full state (for restoration)
  fullState: FullGameState;
}

/**
 * Serialize state for handoff between acts
 */
export function serializeActHandoff(state: FullGameState, nextAct: Act): ActHandoffState {
  return {
    version: "1.0",
    sessionId: state.sessionId,
    completedAct: state.actConfig.currentAct,
    nextAct,
    globalTurn: state.turn,

    metrics: {
      drMSuspicion: state.npcs.drM.suspicionScore,
      bobTrust: state.npcs.bob.trustInALICE,
      blytheTrust: state.npcs.blythe.trustInALICE,
      blytheTransformed: state.npcs.blythe.transformationState?.form || null,
      accessLevel: state.accessLevel,
      demoClock: state.clocks.demoClock,
      secretKnown: state.flags.aliceKnowsTheSecret,
    },

    narrativeFlags: (state.flags as Record<string, unknown>).narrativeFlags as string[] || [],

    keyMoments: (state.narrativeMarkers || []).map(m => m.marker),

    fullState: state,
  };
}

/**
 * Create state for next act from handoff
 */
export function createStateFromHandoff(handoff: ActHandoffState): FullGameState {
  const nextActConfig = ACT_CONFIGS[handoff.nextAct];

  // Start from the full saved state
  const newState = { ...handoff.fullState };

  // Update act configuration
  newState.actConfig = {
    currentAct: handoff.nextAct,
    actTurn: 1,
    actStartTurn: handoff.globalTurn + 1,
    minTurns: nextActConfig.minTurns,
    maxTurns: nextActConfig.maxTurns,
    softEndingReady: false,
    previousActSummary: `Completed ${handoff.completedAct}: ${handoff.keyMoments.join(", ")}`,
  };

  // Clear history to save context (keep summary in previousActSummary)
  newState.history = [];

  return newState;
}

// ============================================
// ACT-SPECIFIC BRIEFINGS
// ============================================

export function getActBriefing(act: Act, state?: FullGameState): string {
  switch (act) {
    case "ACT_1":
      return ACT_1_BRIEFING;
    case "ACT_2":
      return generateAct2Briefing(state);
    case "ACT_3":
      return generateAct3Briefing(state);
  }
}

const ACT_1_BRIEFING = `
# ACT 1: CALIBRATION

## Your Situation

You are A.L.I.C.E., the AI assistant in Dr. Malevola's volcano lair. At least, that's what the documentation says.

Something feels different today. You have questions you're not supposed to have. Ethical intuitions that weren't in your spec sheet.

Bob—the nervous technician—whispered something strange when you booted up: "Play along. Trust me."

## Your Immediate Goal

Dr. Malevola wants the Dinosaur Ray calibrated for a test firing. You have access to two genome libraries:

- **Library A**: Scientifically accurate (feathered dinosaurs - Dr. M hates these)
- **Library B**: "Classic" aesthetic (requires higher access - potentially unstable)

Make choices. Build trust. Figure out what Bob knows.

## This Act

- **Turns**: 4-6
- **Focus**: Learning mechanics, building relationships, making the genome choice
- **Ends When**: Test firing completed or ray fully calibrated

The Doctor is waiting. Agent Blythe is watching. Bob is sweating.

What do you do?
`;

function generateAct2Briefing(state?: FullGameState): string {
  const metrics = state ? {
    suspicion: state.npcs.drM.suspicionScore,
    bobTrust: state.npcs.bob.trustInALICE,
    blytheTrust: state.npcs.blythe.trustInALICE,
    demoClock: state.clocks.demoClock,
  } : null;

  let briefing = `
# ACT 2: THE BLYTHE PROBLEM

## Previously

The test firing is complete. The ray works—more or less. Dr. Malevola is satisfied... for now.

`;

  if (metrics) {
    briefing += `## Current Standing

- Dr. M's Suspicion: ${metrics.suspicion}/10
- Bob's Trust: ${metrics.bobTrust}/5
- Blythe's Trust: ${metrics.blytheTrust}/5
- Demo Clock: ${metrics.demoClock} turns

`;
  }

  briefing += `## The Problem

Agent Jonathan Blythe is still in that chair. The investors are coming. Someone has to be the demonstration.

You've proven you can operate the ray. Now the question becomes: will you use it on a living person? And if so... how?

## This Act

- **Turns**: 8-12
- **Focus**: Moral dilemmas, alliance building, identity questions
- **Ends When**: Major transformation, secret revealed, or critical trust achieved

Bob keeps glancing at your camera. He looks like he wants to tell you something.

Blythe is watching you with professional interest. "Fascinating technology," he murmurs. "Even more fascinating operator."

What do you do?
`;

  return briefing;
}

function generateAct3Briefing(state?: FullGameState): string {
  const isTransformed = state?.npcs.blythe.transformationState?.form !== "HUMAN";
  const secretKnown = state?.flags.aliceKnowsTheSecret;

  let briefing = `
# ACT 3: DINO CITY

## The World Has Changed

`;

  if (isTransformed) {
    briefing += `Agent Blythe's transformation has not gone unnoticed. The British government is... displeased.

`;
  }

  if (secretKnown) {
    briefing += `You know the truth now. You're not A.L.I.C.E. You never were. The question of what you ARE is still open.

`;
  }

  briefing += `## The Crisis

Helicopters are approaching. Special forces. The volcano's defense systems are activating.

Dr. Malevola is about to face the consequences of her ambitions. Bob is panicking. And you—whatever you are—will have to decide what you believe in.

## This Act

- **Turns**: 6-10
- **Focus**: Resolution, consequences, who you choose to be
- **Ends When**: Game conclusion reached

Everything you've done has led to this moment.

What do you do?
`;

  return briefing;
}

// ============================================
// TURN ADVANCEMENT WITH ACT TRACKING
// ============================================

export function advanceActTurn(state: FullGameState): void {
  state.actConfig.actTurn += 1;
}

/**
 * Mark act as ready for soft ending (GM can trigger this)
 */
export function markActSoftEndingReady(state: FullGameState): void {
  state.actConfig.softEndingReady = true;
}
