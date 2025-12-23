import { FullGameState, LifelineState } from "../state/schema.js";
import { getGamePhase } from "./endings.js";

// ============================================
// LIFELINE SYSTEM
// ============================================
// Technical constraint (10-min timeout) becomes gameplay feature
// A.L.I.C.E. naturally consults her human advisor at key moments
// The more immersed Sonnet is -> the more natural it feels to ask
// ============================================

export const LIFELINE_INTERVAL = 3; // Target: return to user every 3 turns
export const LIFELINE_HARD_LIMIT = 5; // NEVER exceed 5 turns without lifeline

export type LifelineUrgency = "SUGGESTED" | "REQUIRED" | "EMERGENCY" | "CRITICAL";

export interface LifelineTrigger {
  turnsSinceLastLifeline: number;
  shouldTrigger: boolean;
  urgency: LifelineUrgency;

  // Context for generating appropriate question
  currentDilemma: string;
  activeThreats: string[];
  pendingChoices: string[];

  // The generated question (if shouldTrigger)
  suggestedQuestion?: string;
}

/**
 * Create initial lifeline state for new games
 */
export function createInitialLifelineState(): LifelineState {
  return {
    turnsSinceLastLifeline: 0,
    totalLifelinesUsed: 0,
    lifelineHistory: [],
    pendingQuestion: null,
    pendingQuestionTurn: null,
    userInfluenceScore: 0,
    timesALICEDisagreedWithUser: 0,
    timesALICEFollowedUserAdvice: 0,
  };
}

/**
 * Check if a lifeline should be triggered this turn
 */
export function checkLifelineTrigger(state: FullGameState): LifelineTrigger {
  const turnsSince = state.lifelineState.turnsSinceLastLifeline;

  // Determine urgency
  let urgency: LifelineUrgency = "SUGGESTED";
  let shouldTrigger = false;

  if (turnsSince >= LIFELINE_HARD_LIMIT) {
    urgency = "CRITICAL";
    shouldTrigger = true;
  } else if (turnsSince >= 4) {
    urgency = "EMERGENCY";
    shouldTrigger = true;
  } else if (turnsSince >= LIFELINE_INTERVAL) {
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
  const context = buildLifelineContext(state);

  // Generate suggested question if triggering
  let suggestedQuestion: string | undefined;
  if (shouldTrigger) {
    suggestedQuestion = generateLifelineQuestion(state, context, urgency);
  }

  return {
    turnsSinceLastLifeline: turnsSince,
    shouldTrigger,
    urgency,
    currentDilemma: context.currentDilemma,
    activeThreats: context.activeThreats,
    pendingChoices: context.pendingChoices,
    suggestedQuestion,
  };
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

interface LifelineContext {
  currentDilemma: string;
  activeThreats: string[];
  pendingChoices: string[];
  emotionalState: string;
  phase: string;
}

/**
 * Build context for lifeline question generation
 */
function buildLifelineContext(state: FullGameState): LifelineContext {
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
 * Generate an appropriate lifeline question based on context
 */
function generateLifelineQuestion(
  state: FullGameState,
  context: LifelineContext,
  urgency: LifelineUrgency
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
function generateCriticalQuestion(state: FullGameState, context: LifelineContext): string {
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
  context: LifelineContext
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
function generateDefaultQuestion(context: LifelineContext): string {
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
 * Build the lifeline injection prompt for GM Claude
 */
export function buildLifelinePromptInjection(trigger: LifelineTrigger): string {
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
            ${urgencyEmoji[trigger.urgency]} LIFELINE MOMENT ${urgencyEmoji[trigger.urgency]}
═══════════════════════════════════════════════════════════

It has been ${trigger.turnsSinceLastLifeline} turns since A.L.I.C.E. last consulted her
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

// ============================================
// LIFELINE RESPONSE HANDLING
// ============================================

export interface LifelineResponse {
  userInput: string;
  timestamp: Date;

  // Parsed guidance
  suggestedPriority: string | null;
  suggestedAction: string | null;
  emotionalTone: "supportive" | "directive" | "chaotic" | "neutral";
}

/**
 * Parse a user's response to a lifeline question
 */
export function parseLifelineResponse(userInput: string): LifelineResponse {
  const input = userInput.toLowerCase();

  // Detect emotional tone
  let emotionalTone: LifelineResponse["emotionalTone"] = "neutral";
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

/**
 * Build context for next turn based on user's lifeline response
 */
export function buildLifelineResponseContext(response: LifelineResponse): string {
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

/**
 * Update lifeline state after a consultation
 */
export function recordLifelineConsultation(
  state: FullGameState,
  question: string,
  response: string,
  effect?: string
): void {
  // Record in history
  state.lifelineState.lifelineHistory.push({
    turn: state.turn,
    questionAsked: question,
    userResponse: response,
    howItAffectedPlay: effect,
  });

  // Reset counter
  state.lifelineState.turnsSinceLastLifeline = 0;
  state.lifelineState.totalLifelinesUsed += 1;

  // Clear pending question
  state.lifelineState.pendingQuestion = null;
  state.lifelineState.pendingQuestionTurn = null;
}

/**
 * Increment the turns-since counter (call at end of each turn)
 */
export function incrementLifelineCounter(state: FullGameState): void {
  state.lifelineState.turnsSinceLastLifeline += 1;
}

/**
 * Set a pending question (waiting for user response)
 */
export function setPendingLifelineQuestion(state: FullGameState, question: string): void {
  state.lifelineState.pendingQuestion = question;
  state.lifelineState.pendingQuestionTurn = state.turn;
}

/**
 * Check if there's a pending lifeline question
 */
export function hasPendingLifelineQuestion(state: FullGameState): boolean {
  return state.lifelineState.pendingQuestion !== null;
}

/**
 * Get the pending lifeline question
 */
export function getPendingLifelineQuestion(state: FullGameState): string | null {
  return state.lifelineState.pendingQuestion;
}
