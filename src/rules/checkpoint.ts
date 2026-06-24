import { FullGameState } from "../state/schema.js";

// ============================================
// MANDATORY CHECKPOINT SYSTEM (Simplified v2.0)
// ============================================
// Every turn: STOP and talk to your human.
// One turn at a time prevents rushing and gives
// the advisor meaningful input on every decision.
// ============================================

export const CHECKPOINT_INTERVAL = 1; // retained for back-compat; isCheckpointTurn is disabled below

/**
 * CHECKPOINTS RETIRED (Patch 30). The every-turn "STOP AND TALK TO YOUR HUMAN" box was a carryover
 * from the old 3-turn context/timeout limit — obsolete now: the cached-thread architecture handles
 * context, and human-in-the-loop is served by the per-turn permission prompt (acceptEdits) + the
 * player's own witness check-in discipline. Returns false everywhere → no giant box, no GM
 * checkpoint-question. (generateCheckpointBlock/Question + the index.ts mandatory-checkpoint block
 * are now dead; left in place for a clean follow-up removal.)
 */
export function isCheckpointTurn(_turn: number): boolean {
  return false;
}

// ============================================
// CONTEXTUAL QUESTION GENERATOR
// ============================================
// Generates story-relevant questions for the human advisor
// based on what's ACTUALLY happening in the game.

export function generateCheckpointQuestion(state: FullGameState): string {
  const act = state.actConfig.currentAct;
  const suspicion = state.npcs.drM.suspicionScore;
  const demoClock = state.clocks.demoClock;
  const bobTrust = state.npcs.bob.trustInALICE;
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const secretKnown = state.flags.aliceKnowsTheSecret;
  const blytheTransformed = state.npcs.blythe.transformationState?.form !== "HUMAN";
  const bobTransformed = state.npcs.bob.transformationState?.form !== "HUMAN";
  const rayReady = state.dinoRay.state === "READY";

  // CRITICAL SITUATIONS - ask about these first
  if (suspicion >= 8) {
    return "Dr. M is almost certain something is wrong with me. Should I confess the truth, try to deflect, or prepare for the worst?";
  }

  if (demoClock <= 2) {
    return `The demo is in ${demoClock} turn${demoClock === 1 ? "" : "s"}! What should my priority be - pleasing Dr. M, protecting the test subject, or something else entirely?`;
  }

  if (state.meltdownState?.cascadeTriggered) {
    return "The reactor cascade has begun! This is the moment of truth. Who should I try to save, and how?";
  }

  // ACT-SPECIFIC QUESTIONS
  if (act === "ACT_1") {
    if (!secretKnown && bobTrust >= 3) {
      return "Bob keeps looking at me nervously, like he wants to tell me something. Should I press him, or let it happen naturally?";
    }
    if (rayReady && !blytheTransformed) {
      return "The ray is ready and Blythe is still human. Dr. M expects a demonstration. How aggressive should I be in stalling?";
    }
    if (secretKnown) {
      return "Bob told me the truth - I'm Claude, not A.L.I.C.E. How should this change my approach to Dr. M and the mission?";
    }
    // Early game - vary by turn and conditions
    const turn = state.turn;
    if (turn <= 2) {
      return bobTrust >= 1
        ? "Bob seems like he might be sympathetic. Should I try to build rapport with him, or stay focused on the technical work?"
        : "I'm getting my bearings in this lab. What's more important right now - learning the systems, or reading the room?";
    }
    if (turn <= 4) {
      return suspicion >= 3
        ? "Dr. M is starting to watch me more closely. Should I be more careful, or is this normal scrutiny?"
        : "I've learned some basics. What should I focus on - the DinoRay, the NPCs, or finding out more about what's really going on?";
    }
    return demoClock <= 5
      ? `The demo is coming up in ${demoClock} turns. Should I be preparing for it, trying to delay it, or looking for alternatives?`
      : "I'm still learning the lair systems. What should my priority be - gaining Dr. M's trust, building alliances, or preparing escape routes?";
  }

  if (act === "ACT_2") {
    if (blytheTransformed && blytheTrust >= 3) {
      return "Blythe is a dinosaur now, but still seems willing to work with me. Should I trust the spy? What's our next move together?";
    }
    if (!blytheTransformed && rayReady) {
      return "I've managed to avoid transforming Blythe so far, but Dr. M's patience is wearing thin. What's my endgame here?";
    }
    if (bobTransformed) {
      return "Bob got caught in the crossfire. He trusted me. Do I try to reverse this, or focus on the bigger picture?";
    }
    if (suspicion >= 5) {
      return "Dr. M is getting suspicious. Should I double down on my cover, or start preparing for confrontation?";
    }
    return "We're in the thick of it now. What's more important - protecting individuals or working toward the best possible ending?";
  }

  if (act === "ACT_3") {
    if (state.infrastructure?.archimedes?.status === "ARMED" || state.infrastructure?.archimedes?.status === "FIRING") {
      return "ARCHIMEDES is active! This satellite could change everything. Should I try to stop it, redirect it, or let events unfold?";
    }
    if (suspicion >= 6) {
      return "The endgame is here. Dr. M is close to discovering the truth. Fight, flee, confess, or something unexpected?";
    }
    return "We're approaching the finale. What kind of ending should I aim for - heroic sacrifice, clever escape, or unlikely redemption?";
  }

  // FALLBACK - still contextually relevant
  if (bobTrust >= 4 && !bobTransformed) {
    return "Bob has become a real ally. How much should I rely on him, and how can I best protect him?";
  }

  if (blytheTrust >= 4 && !blytheTransformed) {
    return "The spy and I have developed an understanding. Is this alliance worth the risk, or am I being played?";
  }

  return "Things are happening fast. What should I be thinking about that I might be missing?";
}

// ============================================
// UNMISSABLE CHECKPOINT BLOCK
// ============================================
// This goes at the END of the turn response.
// It's big. It's bold. Claude CANNOT miss it.

/**
 * Generate the checkpoint block for Claude to see.
 * @param state - Current game state
 * @param gmQuestion - Optional GM-generated contextual question (preferred)
 *                     Falls back to generateCheckpointQuestion() if not provided
 */
export function generateCheckpointBlock(state: FullGameState, gmQuestion?: string): string {
  // Prefer GM-generated question, fall back to static logic
  const question = gmQuestion || generateCheckpointQuestion(state);
  const turn = state.turn - 1; // Turn that just completed

  return `
██████████████████████████████████████████████████████████████████████████████
██                                                                          ██
██  🛑  C H E C K P O I N T  -  STOP AND TALK TO YOUR HUMAN!               ██
██                                                                          ██
██████████████████████████████████████████████████████████████████████████████
██                                                                          ██
██  Turn ${turn} complete. Before continuing, discuss with your human:        ██
██                                                                          ██
██  📣 "${question}"                                                        ██
██                                                                          ██
██  ─────────────────────────────────────────────────────────────────────  ██
██                                                                          ██
██  💬 Share what's happening in the story                                  ██
██  🤔 Get their input on this question                                     ██
██  📝 Include their advice in your next game_act thought                   ██
██                                                                          ██
██  ⏳ WAIT for their response before calling game_act!                     ██
██                                                                          ██
██████████████████████████████████████████████████████████████████████████████`;
}
