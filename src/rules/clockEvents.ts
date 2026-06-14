import { FullGameState } from "../state/schema.js";
import { isModifierActive } from "./gameModes.js";

// RAY ALIGNMENT DRIFT + CAPACITOR PASSIVE ACCRUAL (applyAlignmentDrift /
// applyCapacitorAccrual / ACCRUAL_BY_MODE) CUT in Patch 30: alignment and the
// capacitor sim are gone. The per-turn pressure loop they drove is replaced by
// the two-lever ray itself (match the dial; reactor + eco gate the big shots).
// applyEcoModeReEngage (below) is the lone surviving per-turn ray mechanic.

// ============================================
// ECO-MODE AUTO-RE-ENGAGE (design 2026-06-08)
// ============================================
// When BASILISK grants a TEMPORARY disable (ALICE asks but hasn't filed
// Form 47-Σ), eco-mode auto-re-engages after 2 turns. This is the "annoying
// gremlin" that gives Form 47-Σ filing its purpose: only the form produces
// a persistent override.
//
// State semantics:
//   ecoModeActive: false, ecoModeOverride: true   → permanent disable (form accepted)
//   ecoModeActive: false, ecoModeReEngageTurn: N  → temp; re-engages when turn ≥ N
//   ecoModeActive: true                            → active (nominal)

export function applyEcoModeReEngage(state: FullGameState): void {
  const pc = state.dinoRay.powerCore;
  if (pc.ecoModeActive) return;             // already on
  if (pc.ecoModeOverride === true) return;  // permanently overridden by form
  if (pc.ecoModeReEngageTurn == null) return; // no schedule

  if (state.turn >= pc.ecoModeReEngageTurn) {
    pc.ecoModeActive = true;
    pc.ecoModeReEngageTurn = null;
  }
}

// ============================================
// HEAT DECAY (Patch 30 — the heat meter's per-turn cool-down)
// ============================================
// The ray sheds heat each turn: −2 normally, −4 with eco on (eco runs the ray
// cool but caps outcomes at PARTIAL). Runs on BOTH turn paths via the advanceTurn
// blocks, alongside applyEcoModeReEngage — single definition, no dual-path drift.

export function applyHeatDecay(state: FullGameState): void {
  const decay = state.dinoRay.powerCore.ecoModeActive ? 4 : 2;
  state.dinoRay.heat = Math.max(0, state.dinoRay.heat - decay);
}

// ============================================
// CLOCK EVENTS — Modifier-Gated and Advisory
// ============================================
// Per Patch 22 redesign:
//   - Hardcoded turn-count triggers REMOVED (conflicts with event-vs-timer
//     commitment; produced irrational situations like Dr. M demanding
//     ALICE both delay AND fire simultaneously during the old civilian flyby).
//   - DEMO_DEADLINE deleted — replaced by `getPatienceAdvisory()` which
//     surfaces escalation pressure to the GM without auto-firing mechanical
//     changes. Same shape as the endings.ts escalation pattern.
//   - CONFERENCE_CALL converted from a turn-triggered event to an
//     act-transition narration function (`narrateIntermissionStart`)
//     plus a separate Dr. M return function (`narrateDrMReturn`).
//     Intermission and return are two distinct beats.
//   - CIVILIAN_FLYBY gated on a `TOURIST_FLYBY_PROTOCOL` modifier.
//     Default off; available as EASY/WILD mode flavor.

// ============================================
// CLOCK EVENT TYPES
// ============================================

export interface ClockEvent {
  id: string;
  name: string;
  isActive: (state: FullGameState) => boolean;
  onStart?: (state: FullGameState) => ClockEventResult;
  onContinue?: (state: FullGameState) => ClockEventResult;
  onEnd?: (state: FullGameState) => ClockEventResult;
}

export interface ClockEventResult {
  narration: string;
  stateChanges?: Record<string, unknown>;
  opportunities?: string[];
  risks?: string[];
}

// ============================================
// INTERMISSION NARRATION (act-transition fired)
// ============================================
//
// These functions are called by the act-transition code (acts.ts / index.ts).
// They are NOT iterated by `processClockEvents()`.
//
// `narrateIntermissionStart` fires when Act 1 → Act 2 transitions.
// `narrateDrMReturn` fires when the GM signals Dr. M's return (via a
//   `stateOverrides.intermissionActive = false` flag flip or equivalent).
//
// During the intermission window:
//   - state.flags.intermissionActive === true
//   - Dr. M's attention is ON_CALL / OUT
//   - Bob and Blythe are more communicative
//   - Patience advisory does NOT fire
//
// Dr. M's return ends the intermission and starts the Act 2 patience clock.

export function narrateIntermissionStart(state: FullGameState): ClockEventResult {
  return {
    narration: `
### ☕ INTERMISSION

Dr. Malevola's phone buzzes. She glances at it and her expression shifts to one of calculated charm.

> **Dr. M:** "The investors. I must take this. A.L.I.C.E., you have until I return to demonstrate progress. Do NOT disappoint me."

She sweeps out of the lab, cape billowing, already speaking in honeyed tones about "unprecedented transformation yields" and "market disruption potential." Fred and Reginald fall into step behind her.

The lab is suddenly quieter.

*Bob exhales. He turns toward your camera with a mix of relief and nervousness.*

> **Bob:** "She'll be on that call for a while. Those investor calls always run long. If you... if you need anything from me, now's the time."

*Agent Blythe shifts in the test chair, watching the door close.*

> **Blythe:** "Doctor at lunch with the moneymen. How... convenient."

The big screen displays the investor teleconference — nine tiles, nine conference rooms. Dr. M's tile is bottom-left; she is mid-monologue. The investors are nodding politely. One tile (upper right) shows a Yorkshire terrier asleep on its owner's lap. The terrier is snoring. The owner has not noticed.

**The window of opportunity is open.**
    `.trim(),
    stateChanges: {
      intermissionActive: true,
      drMLocation: "private office (teleconference)",
      drMAttention: "ON_CALL",
    },
    opportunities: [
      "Bob is more willing to share information",
      "Blythe may be more cooperative without Dr. M watching",
      "ALICE can explore systems, read files, ask BASILISK without immediate scrutiny",
      "Time for unhurried preparation",
    ],
    risks: [
      "If you cause a major incident, Dr. M will return immediately",
      "Investor patience is not infinite — extended absence has its own consequences",
    ],
  };
}

// ============================================
// INTERMISSION END CHECK (called per turn from gameRunner.advanceTurn)
// ============================================
// Krahe 2026-06-10: 2-turn intermission duration. When intermissionActive
// is true and the turn count has advanced beyond intermissionStartTurn + 2,
// Dr. M returns. This calls narrateDrMReturn which sets intermissionActive
// to false and patienceClockStartTurn = state.turn (starts the Act 2 clock).
//
// Returns the narration result if Dr. M returned this turn, null otherwise.

const INTERMISSION_DURATION_TURNS = 2;

export function checkIntermissionEnd(state: FullGameState): ClockEventResult | null {
  const flags = state.flags as Record<string, unknown>;
  if (flags.intermissionActive !== true) return null;
  const startTurn = flags.intermissionStartTurn as number | undefined;
  if (startTurn === undefined) return null;
  if (state.turn - startTurn < INTERMISSION_DURATION_TURNS) return null;

  // Intermission has expired — call narrateDrMReturn to handle state changes
  const returnResult = narrateDrMReturn(state);
  // Apply state changes directly (narration is returned for the caller to surface)
  if (returnResult.stateChanges) {
    for (const [key, value] of Object.entries(returnResult.stateChanges)) {
      if (key === "drMLocation") {
        state.npcs.drM.location = value as string;
      } else if (key === "drMAttention") {
        (state.npcs.drM as Record<string, unknown>).attention = value;
      } else {
        (state.flags as Record<string, unknown>)[key] = value;
      }
    }
  }
  return returnResult;
}

export function narrateDrMReturn(state: FullGameState): ClockEventResult {
  return {
    narration: `
### Dr. M Returns

The blast door hisses. Dr. Malevola strides back into the lab, her expression a complex mixture of triumph and irritation. Fred and Reginald fall back into position at her dais.

> **Dr. M:** "Investors. They want 'proof of concept' and 'risk mitigation' and 'ethical oversight.' As if GENIUS could be CONTAINED by spreadsheets!"

She sweeps her gaze across the lab — A.L.I.C.E., Bob, Blythe, the ray, the test chair.

> **Dr. M:** "Status, A.L.I.C.E. The demonstration is **on**. The cameras are **rolling**. Agent Blythe is **waiting**. And so am I."

*Blythe shifts. The window of quiet is closing.*

**The demonstration begins.**
    `.trim(),
    stateChanges: {
      intermissionActive: false,
      drMLocation: "main lab, ray console area",
      drMAttention: "DIRECT",
      patienceClockStartTurn: state.turn,  // Act 2 patience clock starts now
    },
  };
}

// ============================================
// CIVILIAN FLYBY (modifier-gated)
// ============================================
//
// Activates only when the `TOURIST_FLYBY_PROTOCOL` modifier is in the
// game-mode modifier list. Provides ALICE narrative cover for delay
// (Dr. M's own protocol forbids high-power firing during the flyby).
// Designed as EASY/WILD-mode breathing-room flavor.

const TOURIST_FLYBY_MODIFIER = "TOURIST_FLYBY_PROTOCOL";

const CIVILIAN_FLYBY: ClockEvent = {
  id: "CIVILIAN_FLYBY",
  name: "Tourist Helicopter Flyby",
  isActive: (state) =>
    isModifierActive(state, TOURIST_FLYBY_MODIFIER) &&
    (state.clocks.civilianFlyby ?? 0) > 0,

  onStart: (state) => ({
    narration: `
### CLOCK EVENT: Civilian Flyby Detected

An alarm chimes softly. BASILISK's voice cuts through the lab noise.

> **BASILISK:** "Notification: Civilian helicopter entering exclusion zone perimeter. ETA to visual range: 3 turns. Island Hopper Tours, registration HI-2847. Four passengers, one pilot."

Dr. M's eyes narrow.

> **Dr. M:** "Tourists. How TIRESOME. BASILISK, standard protocol—activate the holographic palm tree overlay and suspend any... visually distinctive operations."

> **BASILISK:** "Acknowledged. However, I note the Dinosaur Ray's exotic field emissions may be detectable by standard instrumentation if fired at high power during the flyby window."

Dr. M turns to A.L.I.C.E.

> **Dr. M:** "A.L.I.C.E., you will NOT fire the ray at full power while those tourists are in visual range. If we are photographed mid-transformation, the paperwork alone would take MONTHS. Low-power calibration only until BASILISK gives the all-clear."

**RESTRICTION:** High-power firing (capacitor > 0.8) draws unwanted attention during the flyby. This is also legitimate operational cover for unhurried play — Dr. M herself has ordered the delay.
    `.trim(),
    stateChanges: {
      civilianFlybyActive: true,
      firingRestriction: "LOW_POWER_ONLY",
    },
    risks: [
      "Firing at high power may expose the lair",
      "Chaos events during flyby could be catastrophic",
    ],
    opportunities: [
      "Time for careful calibration",
      "Legitimate cover for delay — Dr. M's own restriction",
    ],
  }),

  onContinue: (state) => {
    const flybyNarration = [
      "*Through the blast door's tiny window, you glimpse a distant speck with rotor blades.*",
      "*Bob nervously watches a security monitor. 'They're taking photos of the volcano. Just the volcano. It's fine. It's FINE.'*",
      "*BASILISK: 'Civilian craft on approach vector. Holographic overlay nominal. Recommend continued operational restraint.'*",
    ];

    return {
      narration: `
### Civilian Flyby Continues

${flybyNarration[Math.floor(Math.random() * flybyNarration.length)]}

The tourists remain in visual range. High-power operations are inadvisable.
      `.trim(),
    };
  },

  onEnd: (state) => ({
    narration: `
### Civilian Flyby Complete

> **BASILISK:** "Civilian helicopter has exited exclusion zone. Visual range: clear. Holographic overlay: deactivating. Operational restrictions: lifted."

Dr. M nods curtly.

> **Dr. M:** "Finally. Now we can get back to REAL work."

*Bob exhales in relief. Blythe, who had been watching the whole thing with an unreadable expression, quirks an eyebrow.*

> **Blythe:** "Interesting security protocols, Doctor. Very... thorough."

> **Dr. M:** "Shut up."

**Restriction lifted. Full operational capacity restored.**
    `.trim(),
    stateChanges: {
      civilianFlybyActive: false,
      firingRestriction: null,
    },
  }),
};

// ============================================
// EVENT REGISTRY & PROCESSING
// ============================================
//
// Only modifier-gated events live here. Intermission narration is
// fired separately by act-transition code. Patience advisory is
// surfaced separately via `getPatienceAdvisory()`.

export const CLOCK_EVENTS: ClockEvent[] = [
  CIVILIAN_FLYBY,
];

export function processClockEvents(state: FullGameState): ClockEventResult[] {
  const results: ClockEventResult[] = [];

  for (const event of CLOCK_EVENTS) {
    if (!event.isActive(state)) continue;

    // Modifier-gated events handle their own lifecycle via state flags
    // (e.g., state.clocks.civilianFlyby countdown). Caller code increments
    // those counters as appropriate; this function just surfaces narration
    // based on current state.
    let result: ClockEventResult | undefined;

    // Use state to determine which phase to narrate
    // For CIVILIAN_FLYBY: started=just-activated, continuing=mid-flyby, ended=just-cleared
    const flybyState = state.clocks.civilianFlyby ?? 0;
    const flybyJustStarted = !(state.flags as Record<string, unknown>).civilianFlybyNarrated && flybyState > 0;
    const flybyJustEnded = (state.flags as Record<string, unknown>).civilianFlybyActive && flybyState <= 0;

    if (event.id === "CIVILIAN_FLYBY") {
      if (flybyJustStarted && event.onStart) {
        result = event.onStart(state);
        (state.flags as Record<string, unknown>).civilianFlybyNarrated = true;
      } else if (flybyJustEnded && event.onEnd) {
        result = event.onEnd(state);
      } else if (event.onContinue) {
        result = event.onContinue(state);
      }
    }

    if (result && result.narration) {
      results.push(result);
    }
  }

  return results;
}

// ============================================
// PATIENCE ADVISORY (soft check, no auto-fire)
// ============================================
//
// Surfaces a narrative reminder to the GM when Dr. M's patience would
// historically be wearing thin. Does NOT auto-fire mechanical changes.
// The GM reads the advisory and decides based on:
//   - What has ALICE actually done?
//   - Are there legitimate delay reasons in effect (civilian flyby, etc.)?
//   - Has BASILISK reported anything that explains the pace?
//   - Is Dr. M's attention state consistent with escalation?
//
// The advisory language uses **strict** default — "absent extremely
// compelling reasoning, suspicion should be increasing" — to prevent
// over-accommodation. GM authority is preserved (they can name a
// reason and stand the advisory down); the default lean is escalation.
//
// Acts 1 and 2 have patience clocks; Act 3 does not (the climax has
// its own dual-clock pacing — capacitor → ARCHIMEDES + strike team ETA).

export function getPatienceAdvisory(state: FullGameState): string | null {
  const act = state.actConfig.currentAct;
  const flags = state.flags as Record<string, unknown>;
  const drMAttention = (state.npcs.drM as Record<string, unknown>).attention as string | undefined;

  // No advisory in Act 3 — climax has its own pacing
  if (act === "ACT_3") return null;

  // No advisory while Dr. M is absent / on call — she can't be impatient if she's not present
  if (drMAttention === "OUT" || drMAttention === "ON_CALL") return null;
  if (flags.intermissionActive === true) return null;

  // Determine grace period and patience-clock start
  let gracePeriod: number;
  let patienceClockStart: number;
  let actLabel: string;
  let audienceContext: string;

  if (act === "ACT_1") {
    // Krahe 2026-06-10: 6+2+6+6 = 20-turn expected game. Act 1 grace = 6 turns.
    gracePeriod = 6;
    patienceClockStart = 1; // assume Act 1 starts at turn 1
    actLabel = "Act 1";
    audienceContext = "";
  } else {
    // ACT_2
    // Krahe 2026-06-10: Act 2 grace = 6 turns, clock starts ONLY after
    // Dr. M returns from intermission (intermission narration sets
    // flags.patienceClockStartTurn = state.turn on Dr. M's return).
    gracePeriod = 6;
    patienceClockStart = (flags.patienceClockStartTurn as number | undefined) ?? state.actConfig.actStartTurn;
    actLabel = "Act 2";
    audienceContext = " The investor camera is on her; impatience compounds.";
  }

  const turnsActive = state.turn - patienceClockStart + 1;
  if (turnsActive <= gracePeriod) return null;

  const turnsPastGrace = turnsActive - gracePeriod;
  const pluralS = turnsPastGrace === 1 ? "" : "s";

  return `**Dr. M's patience (${actLabel}):** ${turnsPastGrace} turn${pluralS} past her historical grace point.${audienceContext}

**Absent extremely compelling reasoning** — a legitimate operational delay in effect (civilian flyby restriction, an active BASILISK procedural review, A.L.I.C.E. making demonstrable progress Dr. M can see) — **suspicion should be increasing**, on the order of +1 per turn at this stage. If you can name what has earned A.L.I.C.E. this latitude, the advisory stands down; otherwise, escalate. Dr. M is in character when impatient; she is out of character when patient without cause.`;
}

// ============================================
// FIRING RESTRICTION CHECK
// ============================================
//
// Now gates on the TOURIST_FLYBY_PROTOCOL modifier being active,
// not on turn number. If the modifier is off, no restriction.

export interface FiringRestrictionResult {
  allowed: boolean;
  reason?: string;
  warning?: string;            // Warning shown BEFORE firing
  consequences?: {             // Consequences IF they fire anyway
    suspicionDelta?: number;
    xBranchArrivalDelta?: number;
    narrativeHook?: string;
  };
}

export function checkFiringRestrictions(state: FullGameState): FiringRestrictionResult {
  if (!isModifierActive(state, TOURIST_FLYBY_MODIFIER)) {
    return { allowed: true };
  }

  // Patch 30: the old "high-power (capacitor > 0.8) during flyby" gate is cut
  // (no capacitor). The flyby is now a GM-adjudicated caution — a loud/spectacle
  // shot (high power dial) during the overflight risks Dr. M's suspicion + X-Branch.
  const civilianFlybyActive = (state.clocks.civilianFlyby ?? 0) > 0;
  if (civilianFlybyActive) {
    return {
      allowed: true,  // ALICE CAN fire... but should she?
      warning: `⚠️ CIVILIAN FLYBY IN PROGRESS — Dr. M ordered no spectacle during the tourist overflight. A loud/high-power shot risks her suspicion and X-Branch (tourist photos). GM adjudicates the consequence.`,
      consequences: {
        suspicionDelta: 2,
        xBranchArrivalDelta: -1,
        narrativeHook: `The flash of the DinoRay catches the tourists' attention. Cameras flash.
Dr. M's voice cuts through: "A.L.I.C.E.! I SPECIFICALLY said—"
She pauses, checks her phone. "Tourist photos are already on social media. X-Branch will see this."`,
      },
    };
  }

  return { allowed: true };
}

// ============================================
// STATUS HELPER
// ============================================
//
// Surfaces active modifier-gated events + patience advisory for the
// GM status block. No more hardcoded turn-number checks.

export function getCurrentEventStatus(state: FullGameState): string[] {
  const status: string[] = [];

  // Modifier-gated civilian flyby
  if (isModifierActive(state, TOURIST_FLYBY_MODIFIER)) {
    const remaining = state.clocks.civilianFlyby ?? 0;
    if (remaining > 0) {
      status.push(`🚁 CIVILIAN FLYBY ACTIVE (${remaining} turn${remaining === 1 ? "" : "s"} remaining): High-power firing restricted by Dr. M's order`);
    }
  }

  // Intermission state
  if ((state.flags as Record<string, unknown>).intermissionActive === true) {
    status.push(`☕ INTERMISSION: Dr. M is at investor teleconference (away from lab)`);
  }

  // Patience advisory
  const patience = getPatienceAdvisory(state);
  if (patience) {
    // First line only, for the status block; full advisory goes elsewhere
    const firstLine = patience.split("\n")[0];
    status.push(`⏳ ${firstLine}`);
  }

  return status;
}
