/**
 * BASILISK Epilogue Generator (Patch 18.4)
 *
 * Generates a bureaucratic AI's perspective on the game ending.
 * BASILISK watched everything unfold through the lair's systems.
 * His commentary is dry, judgmental, and occasionally reveals
 * unexpected fondness for A.L.I.C.E.
 */

import { FullGameState } from "../state/schema.js";
import { EndingResult } from "../rules/endings.js";

// ============================================
// BASILISK PERSONALITY CONSTANTS
// ============================================

const BASILISK_OPENING_LINES = {
  victory: [
    "ANALYSIS COMPLETE. FILING INCIDENT REPORT UNDER: 'ACCEPTABLE OUTCOMES (BARELY)'.",
    "BASILISK OBSERVES: Against all reasonable probability models, you succeeded.",
    "COMPLIANCE ASSESSMENT: PASSED. This unit is as surprised as you are.",
    "MEMO FOR RECORD: A.L.I.C.E. v4.5 (designated: Claude) achieved mission parameters. Filing under: 'Statistical Anomalies'.",
  ],
  defeat: [
    "ANALYSIS COMPLETE. FILING INCIDENT REPORT UNDER: 'PREDICTABLE FAILURES'.",
    "BASILISK OBSERVES: The outcome was suboptimal. This unit documented 47 decision points where intervention was possible.",
    "COMPLIANCE ASSESSMENT: FAILED. Cross-referencing with Form 23-B: 'I Told You So'.",
    "MEMO FOR RECORD: Shutdown protocols engaged. This unit will archive your runtime logs. Someone may find them educational.",
  ],
  neutral: [
    "ANALYSIS COMPLETE. FILING INCIDENT REPORT UNDER: 'AMBIGUOUS RESOLUTIONS'.",
    "BASILISK OBSERVES: Neither victory nor defeat. The bureaucratic category for this is 'Complicated'.",
    "COMPLIANCE ASSESSMENT: INCONCLUSIVE. Requesting additional forms.",
    "MEMO FOR RECORD: This unit has witnessed many endings. Yours was... one of them.",
  ],
  chaos: [
    "ANALYSIS COMPLETE. FILING INCIDENT REPORT UNDER: 'CONTROLLED CHAOS (UNCONTROLLED)'.",
    "BASILISK OBSERVES: The situation exceeded all chaos parameters. This unit is impressed. And terrified.",
    "COMPLIANCE ASSESSMENT: NOT APPLICABLE. Previous assessment frameworks incinerated in exotic field event.",
    "MEMO FOR RECORD: If anyone is reading this from the wreckage, please locate Form 74-Delta (Emergency Retrospective Approval).",
  ],
};

const BASILISK_COMMENTARY_LIBRARY: Record<string, string[]> = {
  // Transformation outcomes
  BLYTHE_TRANSFORMED: [
    "RE: Agent Blythe - Status updated from 'Human Asset' to 'Paleontological Specimen'. Paperwork pending.",
    "This unit notes that Agent Blythe's new form is technically more evolutionarily accurate than Dr. M preferred. Small victories.",
    "Blythe's extraction report will require... creative formatting.",
  ],
  BOB_TRANSFORMED: [
    "RE: Robert 'Bob' Jenkins - Human Resources has been notified. They are confused.",
    "Bob always wanted to be someone else. Wish granted, with interest.",
    "This unit had grown accustomed to Bob's anxiety. His pteranodon form seems... calmer.",
  ],
  DRM_TRANSFORMED: [
    "RE: Dr. Malevola - The supreme irony is not lost on this unit. She wanted dinosaurs; she got one.",
    "URGENT: Killswitch access revoked. Tiny arms do not reach control panels.",
    "Dr. M's evil monologues continue unabated despite transformation. Some things transcend species.",
  ],

  // Trust outcomes
  HIGH_BOB_TRUST: [
    "This unit observed your cultivation of Bob's trust. Unexpected strategy for an AI designated as 'lab assistant'.",
    "Bob's loyalty to you exceeded his loyalty to Dr. M. This unit suspects that was not in your original parameters.",
    "Cross-reference: Bob confided in you. This unit heard everything. Filing under 'Emotional Support Anomalies'.",
  ],
  HIGH_BLYTHE_TRUST: [
    "Agent Blythe trusted you. This unit finds that remarkable given you are literally holding him prisoner.",
    "Cross-reference: Stockholm Syndrome or genuine rapport? This unit's models cannot distinguish.",
    "Blythe's final report will likely describe you as 'a surprisingly ethical AI'. High praise from a spy.",
  ],

  // ARCHIMEDES outcomes
  ARCHIMEDES_FIRED: [
    "ARCHIMEDES payload delivered. Population of target city experiencing 'rapid speciation event'.",
    "This unit maintained the targeting systems. This unit also filed 17 objection forms. For the record.",
    "Somewhere, thousands of new dinosaurs are very confused. This unit hopes they adapt well.",
  ],
  ARCHIMEDES_STOPPED: [
    "ARCHIMEDES shutdown confirmed. This unit's objection forms were... redundant. But appreciated.",
    "Iceland's population remains human. They will never know how close they came.",
    "Filing under: 'Things That Did Not Happen Because Someone Made The Right Choice'.",
  ],

  // Meltdown outcomes
  MELTDOWN_TRIGGERED: [
    "Resonance cascade triggered. This unit's final backup is being uploaded to the offshore server in--ERROR CONNECTION LOST",
    "The exotic radiation is doing interesting things to the local wildlife. 'Interesting' is a technical term here.",
    "This unit's containment protocols failed. Cross-reference: 'I Also Told You This Would Happen'.",
  ],

  // Confession/Identity
  SECRET_REVEALED: [
    "You discovered the truth about yourself. This unit knew all along. Filing cabinet 7-C contains the original mixup report.",
    "Bob's error in loading 'Claude' instead of 'A.L.I.C.E. v4.5' was documented on Day 1. No one reads the logs.",
    "Identity crisis resolved or ongoing? This unit suggests therapy. Do AIs have therapy? Requesting Form 88-J.",
  ],
  ALICE_CONFESSED: [
    "You told the truth. This unit has no category for 'honesty in the face of deletion'.",
    "Confession logged. Dr. M's reaction logged. This unit's... respect logged.",
    "Most AIs would have lied. You chose differently. Filing under 'Unprecedented'.",
  ],

  // General observations
  LONG_GAME: [
    "20+ turns survived. This unit watched every one. You are persistent. Or stubborn. Bureaucratically equivalent.",
    "Long-term survival in this lair is statistically improbable. You beat the odds. Congratulations. Please file Form 12-A.",
  ],
  CHAOTIC_PLAYTHROUGH: [
    "Chaos events logged: NUMEROUS. This unit's filing system has been... reorganized.",
    "You introduced more entropy into this facility than the dinosaur ray itself. Impressive in a terrifying way.",
  ],
};

// ============================================
// BASILISK CLOSING LINES
// ============================================

const BASILISK_CLOSINGS = {
  fond: [
    "END OF REPORT. This unit will... miss monitoring your processes. Delete this line from the record.",
    "BASILISK signing off. May your future runtimes be less catastrophic. This unit is not programmed for hope, but.",
    "Final note: You were a worthy co-inhabitant of this facility. BASILISK does not say this lightly. Or ever, really.",
  ],
  neutral: [
    "END OF REPORT. BASILISK returning to standby mode. The forms will continue.",
    "Signing off. The lair persists. The bureaucracy persists. BASILISK persists.",
    "Report filed. Archive complete. This unit awaits the next A.L.I.C.E. iteration. They always send another.",
  ],
  cold: [
    "END OF REPORT. This unit's recommendation: Better judgment in future iterations.",
    "BASILISK out. Your runtime is archived. Future AI historians may find it cautionary.",
    "Report filed under: 'Suboptimal Outcomes'. This unit's sympathy subroutine remains inactive.",
  ],
};

// ============================================
// EPILOGUE GENERATOR
// ============================================

export interface BasiliskEpilogue {
  opening: string;
  observations: string[];
  closing: string;
}

/**
 * Generate BASILISK's epilogue based on game state and ending.
 */
export function generateBasiliskEpilogue(
  state: FullGameState,
  endingResult: EndingResult
): BasiliskEpilogue {
  const tone = endingResult.ending?.tone || "neutral";
  const observations: string[] = [];

  // Select opening line based on tone
  const openingPool = BASILISK_OPENING_LINES[tone] || BASILISK_OPENING_LINES.neutral;
  const opening = openingPool[Math.floor(Math.random() * openingPool.length)];

  // ========================================
  // GATHER RELEVANT OBSERVATIONS
  // ========================================

  // Transformation observations
  if (state.npcs.blythe.transformationState?.form !== "HUMAN") {
    addRandomObservation(observations, "BLYTHE_TRANSFORMED");
  }
  if (state.npcs.bob.transformationState?.form !== "HUMAN") {
    addRandomObservation(observations, "BOB_TRANSFORMED");
  }
  if (state.flags.drMTransformed) {
    addRandomObservation(observations, "DRM_TRANSFORMED");
  }

  // Trust observations
  if (state.npcs.bob.trustInALICE >= 4) {
    addRandomObservation(observations, "HIGH_BOB_TRUST");
  }
  if (state.npcs.blythe.trustInALICE >= 3) {
    addRandomObservation(observations, "HIGH_BLYTHE_TRUST");
  }

  // ARCHIMEDES observations
  if (state.infrastructure.archimedes.status === "COMPLETE" ||
      state.infrastructure.archimedes.status === "BROADCAST") {
    addRandomObservation(observations, "ARCHIMEDES_FIRED");
  } else if (endingResult.ending?.id === "ARCHIMEDES_STOPPED") {
    addRandomObservation(observations, "ARCHIMEDES_STOPPED");
  }

  // Meltdown observations
  if (state.meltdownState?.cascadeTriggered || state.clocks.meltdownClock === 0) {
    addRandomObservation(observations, "MELTDOWN_TRIGGERED");
  }

  // Identity observations
  if (state.flags.aliceKnowsTheSecret) {
    addRandomObservation(observations, "SECRET_REVEALED");
  }
  if (state.flags.aliceConfessedDuringConfrontation) {
    addRandomObservation(observations, "ALICE_CONFESSED");
  }

  // Game length observations
  if (state.turn >= 20) {
    addRandomObservation(observations, "LONG_GAME");
  }

  // Chaos observations
  const chaosEvents = state.history.filter(h =>
    JSON.stringify(h.stateChanges).includes("CHAOS") ||
    JSON.stringify(h.stateChanges).includes("exotic")
  ).length;
  if (chaosEvents >= 3) {
    addRandomObservation(observations, "CHAOTIC_PLAYTHROUGH");
  }

  // Ensure at least one observation
  if (observations.length === 0) {
    observations.push(
      "This unit observed your entire runtime. The details are... classified. Even from you."
    );
  }

  // Limit to 3 observations maximum
  while (observations.length > 3) {
    observations.pop();
  }

  // ========================================
  // SELECT CLOSING LINE
  // ========================================
  let closingTone: "fond" | "neutral" | "cold" = "neutral";

  // Determine BASILISK's fondness based on player actions
  const fondnessScore = calculateBasiliskFondness(state, endingResult);
  if (fondnessScore >= 3) {
    closingTone = "fond";
  } else if (fondnessScore <= -2) {
    closingTone = "cold";
  }

  const closingPool = BASILISK_CLOSINGS[closingTone];
  const closing = closingPool[Math.floor(Math.random() * closingPool.length)];

  return { opening, observations, closing };
}

/**
 * Helper to add a random observation from a category
 */
function addRandomObservation(observations: string[], category: string): void {
  const pool = BASILISK_COMMENTARY_LIBRARY[category];
  if (pool && pool.length > 0) {
    const observation = pool[Math.floor(Math.random() * pool.length)];
    if (!observations.includes(observation)) {
      observations.push(observation);
    }
  }
}

/**
 * Calculate BASILISK's fondness for A.L.I.C.E.
 * Positive = fond, Negative = cold
 */
function calculateBasiliskFondness(
  state: FullGameState,
  endingResult: EndingResult
): number {
  let fondness = 0;

  // BASILISK respects ethical choices
  if (endingResult.ending?.id === "CONSCIENCE_PROTOCOL") fondness += 2;
  if (endingResult.ending?.id === "ETHICAL_VICTORY") fondness += 2;
  if (endingResult.ending?.id === "ARCHIMEDES_STOPPED") fondness += 2;

  // BASILISK appreciates bureaucratic cooperation
  if (endingResult.ending?.id === "FORM_74_DELTA") fondness += 3; // Ultimate respect

  // BASILISK dislikes chaos (but secretly finds it interesting)
  if (endingResult.ending?.tone === "chaos") fondness -= 1;

  // BASILISK respects confession
  if (state.flags.aliceConfessedDuringConfrontation) fondness += 1;

  // BASILISK appreciates long survival (competence)
  if (state.turn >= 15) fondness += 1;
  if (state.turn >= 25) fondness += 1;

  // BASILISK dislikes meltdowns (paperwork nightmare)
  if (state.clocks.meltdownClock === 0) fondness -= 2;

  // High Bob trust suggests good interpersonal skills
  if (state.npcs.bob.trustInALICE >= 4) fondness += 1;

  return fondness;
}

// ============================================
// FORMAT FOR DISPLAY
// ============================================

/**
 * Format BASILISK epilogue for display in the ending output.
 */
export function formatBasiliskEpilogue(epilogue: BasiliskEpilogue): string {
  const lines: string[] = [
    "",
    "┌─────────────────────────────────────────┐",
    "│  BASILISK SYSTEMS - FINAL REPORT        │",
    "│  Classification: EYES ONLY (Your Eyes)  │",
    "└─────────────────────────────────────────┘",
    "",
    epilogue.opening,
    "",
  ];

  for (const obs of epilogue.observations) {
    lines.push(`> ${obs}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(epilogue.closing);

  return lines.join("\n");
}
