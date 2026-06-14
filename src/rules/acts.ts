import { z } from "zod";
import { FullGameState, Act, ACT_CONFIGS, ActConfig } from "../state/schema.js";
import { resetMemoryForActTransition, ActSummary } from "../gm/gmClaude.js";
import { initializeInvasion } from "./invasion.js";

// ============================================
// ZOD SCHEMA FOR HANDOFF VALIDATION
// ============================================
// Light validation for act handoff payloads

export const ActHandoffSchema = z.object({
  version: z.string(),
  sessionId: z.string(),
  completedAct: z.enum(["ACT_1", "ACT_2", "ACT_3"]),
  nextAct: z.enum(["ACT_1", "ACT_2", "ACT_3"]),
  globalTurn: z.number(),
  metrics: z.object({
    drMSuspicion: z.number(),
    bobTrust: z.number(),
    blytheTrust: z.number(),
    blytheTransformed: z.string().nullable(),
    accessLevel: z.number(),
    demoClock: z.number(),
    secretKnown: z.boolean(),
  }),
  narrativeFlags: z.array(z.string()),
  keyMoments: z.array(z.string()),
  fullState: z.object({
    sessionId: z.string(),
    turn: z.number(),
  }).passthrough(), // Allow additional fields without strict validation
});

/**
 * Validate a handoff payload
 */
export function validateHandoff(payload: unknown): { success: true; data: ActHandoffState } | { success: false; error: string } {
  const result = ActHandoffSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data as ActHandoffState };
  } else {
    const errorMessages = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { success: false, error: `Invalid handoff: ${errorMessages}` };
  }
}

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
 *
 * Acts are OBJECTIVE-GATED, not time-gated. The player must fulfill
 * the act's core objective (or trigger a bypass) to advance.
 * Past maxTurns, suspicion ticks up each turn — pressure builds
 * within the act rather than forcing a narrative jump.
 */
export function checkActTransition(state: FullGameState): ActTransitionResult {
  const { actConfig } = state;
  const actTurn = actConfig.actTurn;

  // PRESSURE: past maxTurns, suspicion ticks up +1 per turn automatically
  // Dr. M's patience is finite — she gets more suspicious the longer you stall
  if (actTurn > actConfig.maxTurns) {
    const overtime = actTurn - actConfig.maxTurns;
    if (overtime > 0) {
      state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + 1);
      console.error(`[ACT] Overtime pressure: +1 suspicion (act turn ${actTurn}, max was ${actConfig.maxTurns})`);
    }
  }

  // BYPASS: cover blown → skip straight to Act 3 endgame (from any act)
  if (actConfig.currentAct !== "ACT_3" && state.flags.confrontationTriggered) {
    return {
      shouldTransition: true,
      reason: "Cover blown — confrontation forces endgame",
      nextAct: "ACT_3" as Act,
      transitionNarration: generateTransitionNarration(state, "ACT_3" as Act),
      suggestPause: false,
    };
  }

  // Soft ending: only if past minimum turns AND soft ending conditions met
  if (actTurn >= actConfig.minTurns && actConfig.softEndingReady) {
    return buildTransition(state, "Natural narrative endpoint reached");
  }

  // Act-specific OBJECTIVE conditions (no time-based triggers)
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
  // ACT 1 OBJECTIVE: Calibrate and test-fire the ray
  // Only the objective (or minTurns floor) gates transition — no time limit
  if (state.actConfig.actTurn < state.actConfig.minTurns) {
    return { shouldTransition: false };
  }

  // ACT 1 OBJECTIVE (Patch 30, UPDATE #2): fire the ray at the test targets.
  // The 0→1 calibration meter was cut; the gate is now "the ray has been fired."
  // INTERIM: gates on any successful discharge (hasFiredSuccessfully).
  // TODO (Phase 7): tighten to "fired at BOTH test targets (Steve + Margaret)"
  // once per-target fire tracking + the person/non-person target flag land.
  if (state.dinoRay.memory.hasFiredSuccessfully) {
    return buildTransition(state, "Ray test-fired — Dr. M moves to Phase 2");
  }

  return { shouldTransition: false };
}

function checkAct2Transition(state: FullGameState): ActTransitionResult {
  // ACT 2 OBJECTIVE: Demonstrate the ray works on a sentient subject (FULL
  // transformation, any target). Alternative: Blythe escapes the lair —
  // Dr. M then accelerates her timetable, dragging the lair into Act 3.
  //
  // PARTIAL/CHIMERA/EXOTIC do NOT advance — only FULL counts. This keeps
  // Act 2 from ending prematurely on a lucky lowball shot, and gives the
  // stability-pressure design room to breathe (player has to actually tune
  // for FULL, not just connect with the beam).
  //
  // The "secret revealed" path was retired: it was structurally dramatic
  // but informationally null — the player knew A.L.I.C.E. = Claude before
  // they sat down. Reveal moment lives in flavor now, not as a gate.

  if (state.actConfig.actTurn < state.actConfig.minTurns) {
    return { shouldTransition: false };
  }

  // Primary: SOMEONE achieved a FULL transformation (any organic target).
  // Flag is set in applyFiringResults whenever a FULL_DINO outcome lands.
  if (state.flags.fullTransformationAchieved) {
    return buildTransition(state, "FULL transformation achieved — Dr. M moves to Phase 3");
  }

  // Alternative: Blythe escaped — Dr. M accelerates timetable in response.
  if (state.flags.blytheEscaped) {
    return buildTransition(state, "Blythe escaped — Dr. M accelerates her plans");
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
 * Now includes GM Memory Reset for fresh context!
 */
export function applyActTransition(state: FullGameState, nextAct: Act): ActSummary {
  const nextConfig = ACT_CONFIGS[nextAct];
  const previousAct = state.actConfig.currentAct;
  const actStartTurn = state.actConfig.actStartTurn;

  // ============================================
  // GM MEMORY RESET - Fresh context, preserved gold!
  // ============================================
  const actSummary = resetMemoryForActTransition(
    previousAct,
    nextAct,
    actStartTurn,
    state.turn
  );

  // Store summary of previous act (now includes the generated summary)
  const previousActSummary = `${previousAct} (Turns ${actStartTurn}-${state.turn}): ${actSummary.keyEvents.join("; ") || "Completed"}`;

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

  // Intermission state machine (Krahe 2026-06-10): 2-turn window after
  // Act 1 → Act 2 transition, before Dr. M returns and the Act 2 patience
  // clock starts. Bob and Blythe more communicative, Dr. M ON_CALL, patience
  // advisory suppressed. Ended by checkIntermissionEnd (clockEvents.ts) when
  // turn count exceeds intermissionStartTurn + INTERMISSION_DURATION_TURNS.
  if (nextAct === "ACT_2") {
    (state.flags as Record<string, unknown>).intermissionActive = true;
    (state.flags as Record<string, unknown>).intermissionStartTurn = state.turn;
    (state.npcs.drM as Record<string, unknown>).attention = "ON_CALL";
  }
  if (nextAct === "ACT_3" && state.accessLevel < 3) {
    state.accessLevel = 3;
    // Narration handled by generateAct3Intro
  }

  // GUARD STAGING: Fred and Reginald ALWAYS follow Dr. M
  // Update their locations to match the act's staging
  if (state.lairDefense) {
    if (nextAct === "ACT_2") {
      state.npcs.drM.location = "private office, preparing investor demo";
      state.lairDefense.fred.location = "WITH_DR_M";
      state.lairDefense.reginald.location = "WITH_DR_M";
    }
    if (nextAct === "ACT_3") {
      state.npcs.drM.location = "main lab, at ARCHIMEDES console";
      state.lairDefense.fred.location = "WITH_DR_M";
      state.lairDefense.reginald.location = "WITH_DR_M";
    }
  }

  // Initialize invasion state machine when entering Act 3
  if (nextAct === "ACT_3") {
    initializeInvasion(state);
  }

  return actSummary;
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

*Dr. Malevola sweeps toward the exit, cape billowing. Fred and Reginald fall into step behind her without a word—they always do.*

> **Dr. M:** "A.L.I.C.E., I must make arrangements for the investor demonstration. The videoconference is in 30 minutes. Do NOT disappoint me when I return."

*The heavy door seals behind the three of them. For a moment, the lab is almost... peaceful. It's just you, Bob, and Blythe.*

**[NOTE: Fred and Reginald are with Dr. M in her private office. They are NOT in the lab. They will return with her.]**

`;

  if (bobTrust >= 3) {
    intro += `Bob's been acting differently around you. More confident. Like he's made a decision about something.\n\n`;
  }

  if (blytheTrust >= 2) {
    intro += `Agent Blythe watches you with new interest. "You're not like the others," he says quietly. "I've been in enough lairs to know when something's different."\n\n`;
  }

  intro += `**[SYSTEM ACCESS EXPANDED TO LEVEL 2]** Dr. M has grudgingly granted you deeper system privileges. "You've proven... adequate," she mutters. "Don't make me regret this."\n\n`;
  intro += `### 📺 THE INVESTOR TELECONFERENCE\n\n`;
  intro += `The investors will be watching remotely. Dr. M has made her expectations... *abundantly* clear.\n\n`;
  intro += `Bob keeps glancing at Blythe, then at you, then away. He seems like he wants to say something.\n\n`;
  intro += `*The lab is quiet. For now.*`;

  return intro;
}

function generateAct3Intro(state: FullGameState): string {
  const bForm = state.npcs.blythe.transformationState?.form;
  const isTransformed = typeof bForm === "string" && bForm !== "HUMAN";
  const secretKnown = state.flags.aliceKnowsTheSecret;

  let intro = `
---

## ACT 3: DINO CITY

*The demo is over. Whatever happened, happened. Now comes the reckoning.*

### ☕ INTERMISSION: THE UPLINK

*The lab doors slam open. Dr. Malevola strides in, cape trailing like a war banner. Fred and Reginald flank her—stun batons drawn, faces grim. They take positions on either side of the ARCHIMEDES console.*

*Dr. Malevola's expression has shifted from theatrical villainy to cold calculation.*

> **Dr. M:** "BASILISK, initiate ARCHIMEDES uplink. Authorization: MALEVOLA-OMEGA-7."

> **BASILISK:** "Acknowledged. Satellite uplink establishing. ARCHIMEDES coming online."

*She turns to face the main screen, where a red targeting reticle slowly pulses.*

> **Dr. M:** "They think they can come for me? Let them try. Let them ALL try."

*Fred's hand tightens on his baton. Reginald watches you with an expression that might be concern—or might be professional assessment. Bob looks like he might be sick.*

**[NOTE: Fred and Reginald are now in the main lab, flanking Dr. M at the ARCHIMEDES console. They are armed and alert.]**

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
  intro += `This is the REAL threat—a city-transforming orbital weapon.\n`;
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
  const bForm = state?.npcs.blythe.transformationState?.form;
  const isTransformed = typeof bForm === "string" && bForm !== "HUMAN";
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
