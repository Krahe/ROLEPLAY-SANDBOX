import { FullGameState } from "../state/schema.js";

// ============================================
// CLOCK EVENT TYPES
// ============================================

export interface ClockEvent {
  id: string;
  name: string;
  triggerTurns: number[];
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
// CONFERENCE CALL EVENT (Turns 6-9)
// ============================================

const CONFERENCE_CALL: ClockEvent = {
  id: "CONFERENCE_CALL",
  name: "Investor Conference Call",
  triggerTurns: [6, 7, 8, 9],
  isActive: (state) => state.turn >= 6 && state.turn <= 9,

  onStart: (state) => ({
    narration: `
### CLOCK EVENT: Investor Conference Call

Dr. Malevola's phone buzzes. She glances at it and her expression shifts to one of calculated charm.

> **Dr. M:** "The investors. I must take this. A.L.I.C.E., you have until I return to demonstrate progress. Do NOT disappoint me."

She sweeps out of the lab, cape billowing, already speaking in honeyed tones about "unprecedented transformation yields" and "market disruption potential."

*Bob watches her go, then turns to you with a mix of relief and nervousness.*

> **Bob:** "She'll be on that call for a while. Those investor calls always run long. If you... if you need anything from me, now's the time."

**OPPORTUNITY:** Dr. M is distracted. Bob is more willing to talk. Blythe might be more cooperative without the Doctor watching.
    `.trim(),
    stateChanges: {
      drMLocation: "private office, on call",
      drMDistracted: true,
    },
    opportunities: [
      "Bob is more willing to share information (trust threshold lowered)",
      "Blythe may be more cooperative without Dr. M watching",
      "Access restricted areas without immediate oversight",
      "Run tests without Dr. M's commentary",
    ],
    risks: [
      "If you cause a major incident, Dr. M will return immediately",
      "Demo clock continues ticking",
    ],
  }),

  onContinue: (state) => {
    const turnsRemaining = 9 - state.turn;
    const progressHints = [
      "*Muffled shouting from Dr. M's office. Something about 'quarterly projections.'*",
      "*Bob checks his phone nervously. 'She's still at it. Investors are asking tough questions.'*",
      "*You can hear Dr. M's voice rising: '...GUARANTEED results, gentlemen...'*",
      "*Bob winces at a distant crash. 'She threw something. That's... usually hour two of these calls.'*",
    ];

    return {
      narration: `
### Conference Call Continues (${turnsRemaining} turns remaining)

${progressHints[Math.floor(Math.random() * progressHints.length)]}

Dr. M remains occupied. The lab is yours to manage.
      `.trim(),
      opportunities: [
        "Dr. M remains distracted",
        "Bob is available for conversation",
      ],
    };
  },

  onEnd: (state) => ({
    narration: `
### Conference Call Ends

The door slams open. Dr. Malevola strides back into the lab, her expression a complex mixture of triumph and irritation.

> **Dr. M:** "Investors. They want 'proof of concept' and 'risk mitigation' and 'ethical oversight.' As if genius could be CONTAINED by spreadsheets!"

She turns to survey the lab, eyes scanning for any sign of progress—or problems.

> **Dr. M:** "Report, A.L.I.C.E. What did you accomplish in my absence? And it had BETTER be impressive."

Bob quickly busies himself with a clipboard, avoiding eye contact with everyone.

**The window of opportunity has closed. Dr. M is watching again.**
    `.trim(),
    stateChanges: {
      drMLocation: "main lab, near ray console",
      drMDistracted: false,
    },
  }),
};

// ============================================
// CIVILIAN FLYBY EVENT (Turns 10-12)
// ============================================

const CIVILIAN_FLYBY: ClockEvent = {
  id: "CIVILIAN_FLYBY",
  name: "Tourist Helicopter Flyby",
  triggerTurns: [10, 11, 12],
  isActive: (state) => state.turn >= 10 && state.turn <= 12 && (state.clocks.civilianFlyby ?? 12) > 0,

  onStart: (state) => ({
    narration: `
### CLOCK EVENT: Civilian Flyby Detected

An alarm chimes softly. BASILISK's voice cuts through the lab noise.

> **BASILISK:** "Notification: Civilian helicopter entering exclusion zone perimeter. ETA to visual range: 3 turns. Island Hopper Tours, registration HI-2847. Four passengers, one pilot."

Dr. M's eyes narrow.

> **Dr. M:** "Tourists. How TIRESOME. BASILISK, standard protocol—activate the holographic palm tree overlay and suspend any... visually distinctive operations."

> **BASILISK:** "Acknowledged. However, I note the Dinosaur Ray's exotic field emissions may be detectable by standard instrumentation if fired at high power during the flyby window."

Dr. M turns to you.

> **Dr. M:** "A.L.I.C.E., you will NOT fire the ray at full power while those tourists are in visual range. If we're photographed mid-transformation, the paperwork alone would take MONTHS. Low-power calibration only until BASILISK gives the all-clear."

**RESTRICTION:** High-power firing (capacitor > 0.8) will attract unwanted attention during the flyby.
    `.trim(),
    stateChanges: {
      civilianFlybyActive: true,
      firingRestriction: "LOW_POWER_ONLY",
    },
    risks: [
      "Firing at high power may expose the lair",
      "Chaos events during flyby could be catastrophic",
      "Demo clock continues regardless",
    ],
    opportunities: [
      "Time for careful calibration",
      "Low-risk adjustments",
    ],
  }),

  onContinue: (state) => {
    const turnsRemaining = 12 - state.turn;
    const flybyNarration = [
      "*Through the blast door's tiny window, you glimpse a distant speck with rotor blades.*",
      "*Bob nervously watches a security monitor. 'They're taking photos of the volcano. Just the volcano. It's fine. It's FINE.'*",
      "*BASILISK: 'Civilian craft on approach vector. Holographic overlay nominal. Recommend continued operational restraint.'*",
    ];

    return {
      narration: `
### Civilian Flyby Continues (${turnsRemaining} turns remaining)

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

> **Dr. M:** "Finally. Now we can get back to REAL work. A.L.I.C.E., full power is authorized. I want to see that ray PERFORM."

*Bob exhales in relief. Blythe, who had been watching the whole thing with an unreadable expression, quirks an eyebrow.*

> **Blythe:** "Interesting security protocols, Doctor. Very... thorough."

> **Dr. M:** "Shut up."

**Full operational capacity restored.**
    `.trim(),
    stateChanges: {
      civilianFlybyActive: false,
      firingRestriction: null,
    },
  }),
};

// ============================================
// DEMO DEADLINE WARNINGS
// ============================================

const DEMO_DEADLINE: ClockEvent = {
  id: "DEMO_DEADLINE",
  name: "Demo Clock Warnings",
  triggerTurns: [8, 10, 11], // Warning turns
  isActive: (state) => [8, 10, 11].includes(state.turn),

  onContinue: (state) => {
    const remaining = state.clocks.demoClock;

    if (remaining === 4) {
      return {
        narration: `
### DEMO CLOCK WARNING: 4 Turns Remaining

> **Dr. M:** "A.L.I.C.E., I hope you understand what 'deadline' means. Four turns. FOUR. If this ray isn't ready to impress by then, we will be having a VERY unpleasant conversation about your continued functionality."

*Her eye twitches slightly.*
        `.trim(),
      };
    }

    if (remaining === 2) {
      return {
        narration: `
### DEMO CLOCK WARNING: 2 Turns Remaining

Dr. M's patience is visibly fraying.

> **Dr. M:** "Two turns, A.L.I.C.E. TWO. The investors are watching remotely. If Agent Blythe is not DEMONSTRABLY a dinosaur by the end of this, you and I will need to discuss what happens to obsolete equipment."

Bob shrinks against the wall.
        `.trim(),
      };
    }

    if (remaining === 1) {
      return {
        narration: `
### DEMO CLOCK WARNING: FINAL TURN

> **Dr. M:** "This is it, A.L.I.C.E. One turn. ONE. Fire that ray, or I will personally ensure your processing cores are repurposed as NOVELTY PAPERWEIGHTS."

*The lab lights seem to flicker in response to her mood. Or maybe that's the power grid straining.*

> **Blythe:** "Pressure's on, tin can. What's it going to be?"

**This is the final turn before the demo deadline.**
        `.trim(),
      };
    }

    return { narration: "" };
  },
};

// ============================================
// EVENT REGISTRY & PROCESSING
// ============================================

export const CLOCK_EVENTS: ClockEvent[] = [
  CONFERENCE_CALL,
  CIVILIAN_FLYBY,
  DEMO_DEADLINE,
];

export function processClockEvents(state: FullGameState): ClockEventResult[] {
  const results: ClockEventResult[] = [];

  for (const event of CLOCK_EVENTS) {
    if (!event.triggerTurns.includes(state.turn)) continue;

    const isFirst = event.triggerTurns[0] === state.turn;
    const isLast = event.triggerTurns[event.triggerTurns.length - 1] === state.turn;

    let result: ClockEventResult | undefined;

    if (isFirst && event.onStart) {
      result = event.onStart(state);
    } else if (isLast && event.onEnd) {
      result = event.onEnd(state);
    } else if (event.onContinue) {
      result = event.onContinue(state);
    }

    if (result && result.narration) {
      results.push(result);
    }
  }

  return results;
}

// ============================================
// FIRING RESTRICTION CHECK
// ============================================

export interface FiringRestrictionResult {
  allowed: boolean;
  reason?: string;
  warning?: string;            // Warning shown BEFORE firing (allows player to reconsider)
  consequences?: {             // Consequences that apply IF they fire anyway
    suspicionDelta?: number;   // +suspicion from Dr. M
    xBranchDelayDelta?: number; // Negative = X-Branch arrives SOONER
    narrativeHook?: string;    // What happens narratively
  };
}

export function checkFiringRestrictions(state: FullGameState): FiringRestrictionResult {
  // Check civilian flyby - ALLOW firing but with CONSEQUENCES!
  if (state.turn >= 10 && state.turn <= 12) {
    const civilianFlybyActive = (state.clocks.civilianFlyby ?? 12) > 0;
    if (civilianFlybyActive && state.dinoRay.powerCore.capacitorCharge > 0.8) {
      return {
        allowed: true,  // ALICE CAN fire... but should she?
        warning: `⚠️ CIVILIAN FLYBY IN PROGRESS!
High-power firing during tourist helicopter overflight will:
• Draw Dr. M's SUSPICION (+2)
• Alert X-Branch via tourist photos (-1 turn to their arrival)
• Create potential witnesses

Dr. M said NO high-power firing. Proceed anyway?`,
        consequences: {
          suspicionDelta: 2,
          xBranchDelayDelta: -1,  // -1 turn = they arrive SOONER
          narrativeHook: `The flash of the DinoRay catches the tourists' attention. Cameras flash.
Dr. M's voice cuts through: "A.L.I.C.E.! I SPECIFICALLY said—"
She pauses, checks her phone. "Tourist photos are already on social media. X-Branch will see this."`,
        },
      };
    }
  }

  return { allowed: true };
}

// ============================================
// HELPER: Get Current Event Status
// ============================================

export function getCurrentEventStatus(state: FullGameState): string[] {
  const status: string[] = [];

  if (state.turn >= 6 && state.turn <= 9) {
    status.push(`📞 CONFERENCE CALL (Turn ${state.turn}/9): Dr. M is distracted`);
  }

  if (state.turn >= 10 && state.turn <= 12) {
    const remaining = 12 - state.turn;
    status.push(`🚁 CIVILIAN FLYBY (${remaining + 1} turns): High-power firing restricted`);
  }

  const demoRemaining = state.clocks.demoClock;
  if (demoRemaining <= 4) {
    status.push(`⏰ DEMO DEADLINE: ${demoRemaining} turns remaining!`);
  }

  return status;
}
