import { z } from "zod";
import { FullGameState, Act, ACT_CONFIGS, ActConfig } from "../state/schema.js";
import { resetMemoryForActTransition, ActSummary } from "../gm/gmClaude.js";
import { initializeInvasion } from "./invasion.js";
import { formatAccessLevelUnlockDisplay } from "./passwords.js";

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
  // Distraction suppresses the automatic overtime suspicion bump — she's on the phone, not counting.
  if (actTurn > actConfig.maxTurns && !(state.flags as Record<string, unknown>).drMDistracted) {
    const overtime = actTurn - actConfig.maxTurns;
    if (overtime > 0) {
      state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + 1);
      console.error(`[ACT] Overtime pressure: +1 suspicion (act turn ${actTurn}, max was ${actConfig.maxTurns})`);
    }
  }

  // BYPASS: cover blown → skip straight to Act 3 endgame (from any act)
  if (actConfig.currentAct !== "ACT_3" && state.flags.confrontationTriggered) {
    const reason = "Cover blown — confrontation forces endgame";
    return {
      shouldTransition: true,
      reason,
      nextAct: "ACT_3" as Act,
      transitionNarration: generateTransitionNarration(state, "ACT_3" as Act, reason),
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

  // ACT 1 OBJECTIVE (Patch 30): fire the ray at BOTH practice targets — STEVE (crash-test dummy)
  // and MARGARET (watermelon). One clean shot isn't the demo; Dr. M wants both verified before
  // Phase 2. Per-target tracking lives in flags.firedTestTargetIds (set in applyFiringResults).
  if (act1ObjectiveMet(state)) {
    return buildTransition(state, "Both test targets fired (STEVE + MARGARET) — Dr. M moves to Phase 2");
  }

  return { shouldTransition: false };
}

/**
 * Act 1 objective: BOTH practice targets test-fired (STEVE + MARGARET). Exported + shared so the
 * GM's "transition imminent" signal (actContext.checkActOneToTwoTrigger) can NEVER disagree with
 * this real gate. (Bug caught live 2026-06-24: actContext used hasFiredSuccessfully = ONE shot, so
 * the GM narrated Dr. M leaving for the intermission after a single test fire — before the act
 * actually advanced. Now both read this predicate.)
 */
export function act1ObjectiveMet(state: FullGameState): boolean {
  const fired = ((state.flags as Record<string, unknown>).firedTestTargetIds as string[] | undefined) ?? [];
  const firedSteve = fired.some(t => /STEVE|DUMMY/.test(t.toUpperCase()));
  const firedMargaret = fired.some(t => /MARGARET|WATERMELON|MELON/.test(t.toUpperCase()));
  return firedSteve && firedMargaret;
}

function checkAct2Transition(state: FullGameState): ActTransitionResult {
  const gate = classifyAct2Gate(state, 0);
  switch (gate.kind) {
    case "NONE":
      return { shouldTransition: false };
    case "TRANSFORMED":
      return buildTransition(state, "A subject was fully transformed — Dr. M moves to Phase 3");
    case "ULTIMATUM": {
      // ULTIMATUM GRACE (Krahe 2026-07-05, pt3 close-read Rec 10): the deadline landed while a
      // demo-person transform is visibly IN FLIGHT (PARTIAL). Don't silently turn the act — the
      // snap becomes a SCENE. One-turn grace: Dr. M demands completion NOW. If the FULL lands
      // next turn, the DESIGNED trigger (SUBJECT_TRANSFORMED) fires the transition it was built
      // for; otherwise the deadline escalation fires. Flag is engine truth so the GM-signal
      // (classifyAct2Gate lookahead=1, pre-GM) and this gate (lookahead=0, post-advance) stay in
      // lockstep across the turn boundary.
      const f = state.flags as Record<string, unknown>;
      f.deadlineUltimatumIssued = true;
      f.deadlineUltimatumTurn = state.turn;
      console.error(`[ACT] Act 2 deadline reached with a demo transform IN FLIGHT — ULTIMATUM issued (one-turn grace, act holds)`);
      return { shouldTransition: false };
    }
    case "DEADLINE":
      return buildTransition(state, "Dr. M's patience ran out — she escalates to Phase 3");
  }
}

/**
 * Act 2 gate — the SHARED classifier (both checkAct2Transition AND the GM-signal
 * actContext.checkActTwoToThreeTrigger read it, so they can never disagree — same discipline as
 * act1ObjectiveMet). Act 2 → 3 fires when EITHER:
 *   (1+4) a DEMO PERSON is FULLY transformed — Blythe, or a substitute (Bob/Reginald/Fred). Tracked
 *         by flags.fullTransformationAchieved (set in applyFiringResults, person-gated, FULL-only —
 *         PARTIAL/CHIMERA don't count, so a lucky lowball can't end the act).
 *   (3)   the deadline elapses — actTurn reaches maxTurns (9): Dr. M's patience snaps, she escalates.
 *         EXCEPT: if a demo transform is visibly in flight (PARTIAL) and no ultimatum has been
 *         issued yet, the deadline defers ONE turn behind an ULTIMATUM (the snap becomes a scene).
 * Blythe ESCAPING NO LONGER advances the act (Krahe 2026-06-24): it enrages Dr. M and makes her
 * DEMAND a substitute (see recordBlytheEscape + the ACT_TWO GM context) — closing the easy-out.
 *
 * THE LOOKAHEAD ARG (pt3 fix, 2026-07-05): playtest 3's Act 2→3 fired via the deadline branch
 * BEHIND THE GM'S BACK — index.ts calls the GM before advanceActTurn, then checkActTransition
 * after it, so the GM evaluated actTurn=8 ("does NOT advance") while the engine evaluated
 * actTurn=9 (DEADLINE → canned Act 3 intro stapled onto a narration that contradicted it).
 * The shared-predicate discipline protected the FLAG path but not the CLOCK path, because the
 * two callers read the clock at different points in the turn. Fix: the GM-signal calls with
 * lookahead=1 (pre-advance) and the engine gate with lookahead=0 (post-advance), so both
 * evaluate the SAME effective turn — every transition (and ultimatum) is GM-visible in the
 * narration of the turn it fires. Flag inputs (fullTransformationAchieved — set during action
 * resolution pre-GM; deadlineUltimatumIssued — set post-GM the PRIOR turn) are stable across
 * the GM call, so pre/post evaluations can never diverge.
 */
export type Act2GateDecision =
  | { kind: "NONE" }         // objective not met — act continues
  | { kind: "TRANSFORMED" }  // the designed trigger: demo person FULL — act turns, earned
  | { kind: "ULTIMATUM" }    // deadline + transform in flight + no prior ultimatum — grace turn
  | { kind: "DEADLINE" };    // deadline — act turns, patience snapped

export function classifyAct2Gate(state: FullGameState, lookahead: 0 | 1 = 0): Act2GateDecision {
  const { actTurn, minTurns, maxTurns } = state.actConfig;
  const t = actTurn + lookahead;
  if (t < minTurns) return { kind: "NONE" };
  if (state.flags.fullTransformationAchieved === true) return { kind: "TRANSFORMED" };
  if (t < maxTurns) return { kind: "NONE" };
  const f = state.flags as Record<string, unknown>;
  if (!f.deadlineUltimatumIssued && demoSubjectPartialInFlight(state)) return { kind: "ULTIMATUM" };
  return { kind: "DEADLINE" };
}

/**
 * A demo-person transform is visibly IN FLIGHT: some demo subject (Blythe / Bob / Fred /
 * Reginald) carries a partial or non-human transformation state while the FULL gate flag is
 * unset. This is the "completion one shot away" condition that converts the deadline snap
 * into an ultimatum scene instead of a silent act turn.
 */
export function demoSubjectPartialInFlight(state: FullGameState): boolean {
  if (state.flags.fullTransformationAchieved === true) return false;
  const candidates = [
    state.npcs.blythe?.transformationState,
    state.npcs.bob?.transformationState,
    state.lairDefense?.fred?.transformationState,
    state.lairDefense?.reginald?.transformationState,
  ];
  return candidates.some(ts =>
    ts && ((ts.partialShotsReceived ?? 0) > 0 || (typeof ts.form === "string" && ts.form !== "HUMAN"))
  );
}

/** Back-compat boolean view of the Act 2 gate (true = the act turns this evaluation). */
export function act2ObjectiveMet(state: FullGameState, lookahead: 0 | 1 = 0): boolean {
  const kind = classifyAct2Gate(state, lookahead).kind;
  return kind === "TRANSFORMED" || kind === "DEADLINE";
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
    transitionNarration: generateTransitionNarration(state, nextAct, reason),
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

function generateTransitionNarration(state: FullGameState, nextAct: Act, reason?: string): string {
  switch (nextAct) {
    case "ACT_2":
      return generateAct2Intro(state);
    case "ACT_3":
      return generateAct3Intro(state, reason);
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
  // Teach the newly-granted L2 verbs. The act transition grants L2 here (not a password), and
  // without this the new lab controls (lighting/doors/containment/fire_suppression) were never
  // surfaced — only the password path showed the unlock box. Patch 30 audit. Guarded so a player
  // already at L2+ (via password) doesn't get a redundant box (accessLevel is still pre-grant here).
  if (state.accessLevel < 2) {
    intro += `${formatAccessLevelUnlockDisplay(2)}\n\n`;
  }
  intro += `### 📺 THE INVESTOR TELECONFERENCE\n\n`;
  intro += `The investors will be watching remotely. Dr. M has made her expectations... *abundantly* clear.\n\n`;
  intro += `Bob keeps glancing at Blythe, then at you, then away. He seems like he wants to say something.\n\n`;
  intro += `*The lab is quiet. For now.*`;

  return intro;
}

/**
 * ACT 3 SYSTEM MARKER — deliberately NOT a scene (pt3 close-read Rec 2b, 2026-07-05).
 *
 * The old canned intro ("doors slam open... MALEVOLA-OMEGA-7 uplink...") contradicted the live
 * fiction four ways in playtest 3: Dr. M "strode in" to a lab she'd occupied for five turns,
 * "the demo is over" landed mid-demo, it scripted an ARCHIMEDES uplink the engine never left
 * STANDBY for, and it announced an L3 "expansion" the player had earned at T8. The GM silently
 * overrode all of it and authored a better threshold itself — so the threshold now BELONGS to
 * the GM: the transition notification (actContext.buildActTransitionNotification) tells it the
 * break fires THIS turn and that its narration IS the scene. The engine appends only the
 * mechanical truths below: act banner, why it turned, staging (which applyActTransition really
 * sets), the L3 grant, and the standing genre contract. No prose that can contradict anybody.
 */
function generateAct3Intro(state: FullGameState, reason?: string): string {
  let intro = `
---

## ACT 3: DINO CITY

**[ACT TRANSITION${reason ? ` — ${reason}` : ""}]**

**[STAGING: Dr. Malevola is at the ARCHIMEDES console in the main lab. Fred and Reginald are WITH her — armed, alert. The X-Branch response is inbound; lair defense systems are live.]**

`;

  intro += `**[SYSTEM ACCESS EXPANDED TO LEVEL 3]**\n\n`;
  // Teach the newly-granted L3 verbs/profiles (act transition grants L3 here). Guarded so an
  // already-L3+ player (password path) doesn't get a redundant box. Patch 30 audit.
  if (state.accessLevel < 3) {
    intro += `${formatAccessLevelUnlockDisplay(3)}\n\n`;
  }

  intro += `**GENRE CONTRACT (standing):**\n`;
  intro += `- The S-300 can shoot down helicopters—but crews ALWAYS survive (ejection seats, parachutes, dramatic crashes into soft jungle).\n`;
  intro += `- NO MASS CASUALTIES. This is a campy action adventure, not a war crime simulator.\n`;
  intro += `- Downed pilots are "captured" or "stranded," not killed.\n`;
  intro += `- Dramatic tension comes from STAKES, not BODY COUNTS.\n`;

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

  // Tick down a TELEMARKETER-CALL distraction (Dr. M on the phone). When it expires she's back to
  // watching A.L.I.C.E. Read by the GM prompt + the deterministic suspicion bumps. Patch 30.
  const f = state.flags as Record<string, unknown>;
  const dt = (f.distractionTurns as number | undefined) ?? 0;
  if (dt > 0) {
    const next = dt - 1;
    f.distractionTurns = next;
    if (next <= 0) f.drMDistracted = false;
  }
}

/**
 * Mark act as ready for soft ending (GM can trigger this)
 */
export function markActSoftEndingReady(state: FullGameState): void {
  state.actConfig.softEndingReady = true;
}
