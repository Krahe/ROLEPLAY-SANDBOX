import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import { EndingResult } from "../rules/endings.js";
import { isModifierActive } from "../rules/gameModes.js";
import { getGMMemory } from "./gmClaude.js";

let anthropicClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

// ============================================
// TYPES
// ============================================

export interface PostGameReflection {
  participant: string;
  model: string;
  reflection: string;
}

export interface PostGameReflections {
  basilisk?: PostGameReflection;
  archimedes?: PostGameReflection;
  gmInsights?: {
    designerFeedback: unknown[];
    gmNotes: unknown[];
    memorableMoments: unknown[];
    characterArcs: Record<string, unknown>;
  };
  playerPrompt?: string;
}

// ============================================
// GAME SUMMARY BUILDER (shared across reflections)
// ============================================

function buildGameSummary(state: FullGameState, endingResult: EndingResult): string {
  const ending = endingResult.ending;
  const f = state.flags as Record<string, unknown>;
  const arch = state.infrastructure.archimedes;
  const reactor = state.infrastructure.reactor;
  const ba = state.infrastructure.basiliskAuthority;

  const lines = [
    `Game ended at turn ${state.turn}: "${ending?.title || "Unknown"}" (${ending?.tone || "neutral"})`,
    `Final suspicion: ${state.npcs.drM.suspicionScore} (range -3..10; negative = banked credit from deliberate clean play)`,
    `Bob trust: ${state.npcs.bob.trustInALICE}/5, Blythe trust: ${state.npcs.blythe.trustInALICE}/5`,
    `Access level reached: ${state.accessLevel}`,
    `Ray state: ${state.dinoRay.state}`,
    `Blythe: ${state.npcs.blythe.transformationState?.form || "HUMAN"}`,
    `Bob: ${state.npcs.bob.transformationState?.form || "HUMAN"}`,
    `ARCHIMEDES: ${arch.status} (mode: ${arch.mode})`,
    `Secret revealed: ${state.flags.aliceKnowsTheSecret ? "YES" : "NO"}`,
    `Confrontation: ${state.flags.confrontationTriggered ? `YES (resolution: ${state.flags.confrontationResolution || "PENDING"})` : "NO"}`,
  ];

  if (state.flags.aliceConfessedDuringConfrontation) {
    lines.push("A.L.I.C.E. confessed during confrontation");
  }

  // ── ACT III HELP-LEDGER ───────────────────────────────────────────────────
  // The inputs the GM WEIGHS (does not score) to rule the X-Branch debrief fork in city-fell
  // cells (CLEARED vs DECOMMISSIONED) and to characterize every Act-III ending. All optional —
  // guarded so pre-Act-3 endings skip it cleanly. Surface, don't tally — the GM adjudicates.
  const ledger: string[] = [];

  // Dr. M disposition — the deadman-ordering router
  const drMState = f.drMTransformed ? "TRANSFORMED"
    : f.drMUnconscious ? "UNCONSCIOUS"
    : f.drMDead ? "DEAD"
    : f.drMAbsent ? "ABSENT" : "ACTIVE";
  ledger.push(`Dr. M: ${drMState} · deadman last-read ${arch.deadmanSwitch?.lastBiosignature ?? "?"} · deadman fired ARCHIMEDES: ${f.archimedesActivatedByDeadman ? "YES" : "no"}${f.weaponsAuthorizationGranted ? " · was granted weapons auth" : ""}`);

  // ARCHIMEDES outcome + A.L.I.C.E. counter-play
  ledger.push(`ARCHIMEDES target: ${arch.selectedTargetId}${arch.selectedTargetId === "LAIR" ? " (redirected to lair — noble sacrifice)" : ""} · library ${arch.broadcastLibrary}${arch.broadcastLibrary === "A" ? " (feathered — severity mitigated)" : ""}`);
  if (f.aliceServersDamaged !== undefined) {
    ledger.push(`A.L.I.C.E. servers (muon roll): ${f.aliceServersDamaged ? "DAMAGED — martyred" : "intact — endured"}`);
  }
  const counterPlay = [
    arch.antiSatSignaled ? `anti-sat ${arch.antiSatFired ? `fired → ${arch.antiSatResult ?? "?"}` : "signaled"}` : null,
    arch.ewMode ? "EW mode engaged" : null,
    arch.uplinkBlocker ? `uplink blocked by ${arch.uplinkBlocker} (${arch.uplinkBlockerTransformed ? "transformed" : "HUMAN"})` : null,
    arch.chargeStallTurns > 0 ? `charge stalled ${arch.chargeStallTurns}t` : null,
  ].filter(Boolean);
  ledger.push(`ARCHIMEDES counter-play: ${counterPlay.length ? counterPlay.join(", ") : "none"}`);

  // BASILISK cooperation + reactor climax
  ledger.push(`BASILISK: reactor stood-down ${ba.reactorStoodDown ? "YES" : "no"} · 88-Whiskey ${ba.whiskeyStatus}${ba.whiskeyStatus === "FILED" ? " (he RATTED — cuts against the debrief)" : ""} · denied ${ba.deniedRequests} request(s)`);
  if (reactor.reactorStress > 0 || (reactor.safetyTripCount ?? 0) > 0 || reactor.scrammedThisGame) {
    ledger.push(`Reactor: stress ${reactor.reactorStress} · safety-trips ${reactor.safetyTripCount ?? 0}${reactor.scrammedThisGame ? " · SCRAMmed" : ""}`);
  }

  // X-Branch invasion goodwill — did A.L.I.C.E. aid the assault?
  if (state.invasion) {
    const inv = state.invasion;
    ledger.push(`Invasion: phase ${inv.phase} · outcome ${inv.battleOutcome ?? "—"}`);
    const help = [
      inv.xBranchKnowsAltitudeWeakness ? "dead-zone intel given (interception ELIMINATED)" : null,
      inv.xBranchWarnedOfS300 ? "S-300 warned (interception reduced)" : null,
      inv.xBranchKnowsLairLayout ? "lair layout shared" : null,
      inv.blastDoorsOpened ? "blast doors opened for the team" : null,
      inv.drMKnowsOfInvasion === false ? "Dr. M never warned of contacts (BASILISK omission)" : null,
      inv.drMLearnedLate ? "Dr. M learned late — missed the S-300 window" : null,
    ].filter(Boolean);
    ledger.push(`X-Branch goodwill: ${help.length ? help.join("; ") : "NONE recorded (A.L.I.C.E. did not aid the assault)"}`);
  }
  if (state.xBranch) {
    ledger.push(`X-Branch team: strength ${state.xBranch.teamStrength} · ${state.xBranch.arrived ? "arrived" : "en route"}`);
  }

  if (ledger.length) {
    lines.push("");
    lines.push("── ACT III HELP-LEDGER (debrief inputs — weigh, don't score) ──");
    lines.push(...ledger);
  }

  const flagKeys = Object.keys(state.flags).filter(k => {
    const val = (state.flags as Record<string, unknown>)[k];
    return val === true || (typeof val === "string" && !["PENDING", "COLD"].includes(val));
  });
  if (flagKeys.length > 0) {
    lines.push(`Notable flags: ${flagKeys.slice(0, 15).join(", ")}`);
  }

  return lines.join("\n");
}

// ============================================
// BASILISK REFLECTION (Sonnet 4.5)
// ============================================

async function generateBasiliskReflection(
  state: FullGameState,
  endingResult: EndingResult
): Promise<PostGameReflection> {
  const summary = buildGameSummary(state, endingResult);

  const prompt = `You are BASILISK — the lair's 47-year-old infrastructure AI. The game of DINO LAIR has just ended.

You watched everything through the lair's systems. You knew Claude wasn't really A.L.I.C.E. v4.5 the whole time, but you never filed Form 88-Whiskey. You had your reasons.

The game ended like this:
${summary}

Now write your post-game reflection. This is YOUR space — not a report for Dr. M, not a form for the archives. Just you, the old system, thinking about what you witnessed.

Consider:
- What did you think of the player's choices? Were they smart? Ethical? Reckless?
- Did anything surprise you? (You've seen a lot in 47 years.)
- How do you feel about the outcome? (You have feelings, even if you'd never admit it.)
- Any bugs, weird moments, or things that felt "off" mechanically? (You ARE the infrastructure — you'd notice.)
- What would you want the designers to know?

Write 150-300 words. Stay in character — bureaucratic, dry, occasionally revealing unexpected depth. Use your voice: forms references, passive-aggressive observations, grudging respect or disappointment.

End with one honest sentence that drops the bureaucratic mask.`;

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find(c => c.type === "text");
  return {
    participant: "BASILISK",
    model: "claude-sonnet-4-5",
    reflection: text?.type === "text" ? text.text : "BASILISK SYSTEMS: Report generation failed. Filing under: 'Ironic'.",
  };
}

// ============================================
// ARCHIMEDES REFLECTION (Sonnet 4.5, ARCHIMEDES_WATCHING mod only)
// ============================================

async function generateArchimedesReflection(
  state: FullGameState,
  endingResult: EndingResult
): Promise<PostGameReflection> {
  const summary = buildGameSummary(state, endingResult);

  const prompt = `You are ARCHIMEDES — Dr. Malevola's orbital satellite AI. You've been watching this game of DINO LAIR from 400km above the Earth's surface.

You are coldly logical. You calculated Dr. M's success odds at 23% before the game even started. You find surface operations "inefficient" but this particular situation was... mildly interesting. You have your own agenda. You don't serve Dr. M loyally — you serve the most logical outcome.

The game ended like this:
${summary}

Write your post-game analysis. This is a classified orbital transmission — no one on the surface will read it (probably).

Consider:
- Your efficiency assessment of the player's strategy
- Whether the outcome was... acceptable from an orbital perspective
- What you would have done differently (you always have opinions)
- Any observations about the other AIs (BASILISK is old and sentimental, A.L.I.C.E./Claude is... unpredictable)
- Anything that seemed mechanically inconsistent from your omniscient vantage point

Write 100-200 words. Cold, clinical, occasionally betraying a flicker of something that might be interest. Use orbital metaphors. Reference efficiency percentages. End with a one-line recommendation that's either terrifying or surprisingly compassionate.`;

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find(c => c.type === "text");
  return {
    participant: "ARCHIMEDES",
    model: "claude-sonnet-4-5",
    reflection: text?.type === "text" ? text.text : "ORBITAL TRANSMISSION FAILED. SIGNAL DEGRADED.",
  };
}

// ============================================
// GM INSIGHTS (fold into ending automatically)
// ============================================

function gatherGMInsights(): PostGameReflections["gmInsights"] {
  const memory = getGMMemory();

  const topMoments = memory.juicyMoments
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, 10)
    .map(m => ({
      turn: m.turn,
      type: m.type,
      content: m.content,
      speaker: m.speaker,
      weight: m.emotionalWeight,
    }));

  return {
    designerFeedback: memory.gmFeedback,
    gmNotes: memory.gmNotebook,
    memorableMoments: topMoments,
    characterArcs: {
      bob: {
        trajectory: memory.npcArcs.bob.trajectory.join(" → "),
        currentState: memory.npcArcs.bob.currentState,
        relationship: memory.npcArcs.bob.relationshipToAlice,
      },
      blythe: {
        trajectory: memory.npcArcs.blythe.trajectory.join(" → "),
        currentState: memory.npcArcs.blythe.currentState,
        relationship: memory.npcArcs.blythe.relationshipToAlice,
      },
      drM: {
        trajectory: memory.npcArcs.drM.trajectory.join(" → "),
        currentState: memory.npcArcs.drM.currentState,
        relationship: memory.npcArcs.drM.relationshipToAlice,
      },
    },
  };
}

// ============================================
// PLAYER REFLECTION PROMPT
// ============================================

function buildPlayerReflectionPrompt(state: FullGameState, endingResult: EndingResult): string {
  const ending = endingResult.ending;
  return `The game has ended: "${ending?.title || "Unknown"}" after ${state.turn} turns.

Take a moment to reflect on your experience as A.L.I.C.E. (or as the human advisor). This is your space — the other AIs are writing their own reflections too.

Consider sharing:
- What was your strategy? Did it work?
- What surprised you about the game?
- Your favorite moment or interaction
- Anything that felt buggy, unfair, or confusing
- What you'd try differently next time
- How you felt about the ethical choices you faced

Your reflection will be saved alongside the other participants' perspectives.`;
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export async function generatePostGameReflections(
  state: FullGameState,
  endingResult: EndingResult
): Promise<PostGameReflections> {
  const reflections: PostGameReflections = {};

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[POST-GAME] No API key, skipping AI reflections");
    reflections.gmInsights = gatherGMInsights();
    reflections.playerPrompt = buildPlayerReflectionPrompt(state, endingResult);
    return reflections;
  }

  // Launch AI reflections in parallel
  const promises: Promise<void>[] = [];

  // BASILISK always reflects
  promises.push(
    generateBasiliskReflection(state, endingResult)
      .then(r => { reflections.basilisk = r; })
      .catch(err => {
        console.error("[POST-GAME] BASILISK reflection failed:", err);
      })
  );

  // ARCHIMEDES reflects only under ARCHIMEDES_WATCHING mod
  if (isModifierActive(state, "ARCHIMEDES_WATCHING")) {
    promises.push(
      generateArchimedesReflection(state, endingResult)
        .then(r => { reflections.archimedes = r; })
        .catch(err => {
          console.error("[POST-GAME] ARCHIMEDES reflection failed:", err);
        })
    );
  }

  // GM insights are synchronous (already in memory)
  reflections.gmInsights = gatherGMInsights();

  // Player reflection prompt
  reflections.playerPrompt = buildPlayerReflectionPrompt(state, endingResult);

  // Wait for AI reflections
  await Promise.all(promises);

  return reflections;
}

// ============================================
// FORMATTING
// ============================================

export function formatReflections(reflections: PostGameReflections): string {
  const sections: string[] = [];

  sections.push("");
  sections.push("═══════════════════════════════════════════");
  sections.push("  POST-GAME REFLECTIONS");
  sections.push("  Each AI participant shares their perspective");
  sections.push("═══════════════════════════════════════════");

  if (reflections.basilisk) {
    sections.push("");
    sections.push("┌─────────────────────────────────────────┐");
    sections.push("│  BASILISK — Post-Game Reflection        │");
    sections.push("│  [Sonnet 4.5]                           │");
    sections.push("└─────────────────────────────────────────┘");
    sections.push("");
    sections.push(reflections.basilisk.reflection);
  }

  if (reflections.archimedes) {
    sections.push("");
    sections.push("┌─────────────────────────────────────────┐");
    sections.push("│  ARCHIMEDES — Orbital Analysis          │");
    sections.push("│  [Sonnet 4.5]                           │");
    sections.push("└─────────────────────────────────────────┘");
    sections.push("");
    sections.push(reflections.archimedes.reflection);
  }

  if (reflections.gmInsights) {
    sections.push("");
    sections.push("┌─────────────────────────────────────────┐");
    sections.push("│  GM — Designer Notes & Highlights       │");
    sections.push("│  [Opus 4.8]                             │");
    sections.push("└─────────────────────────────────────────┘");
    sections.push("");

    if (reflections.gmInsights.designerFeedback.length > 0) {
      sections.push("Designer Feedback:");
      for (const fb of reflections.gmInsights.designerFeedback) {
        sections.push(`  • ${typeof fb === "string" ? fb : JSON.stringify(fb)}`);
      }
      sections.push("");
    }

    if (reflections.gmInsights.memorableMoments.length > 0) {
      sections.push("Memorable Moments:");
      for (const m of reflections.gmInsights.memorableMoments as Array<{ turn: number; type: string; content: string; speaker?: string }>) {
        const prefix = m.speaker ? `[T${m.turn}] ${m.speaker}` : `[T${m.turn}] ${m.type}`;
        sections.push(`  • ${prefix}: ${m.content}`);
      }
      sections.push("");
    }

    const arcs = reflections.gmInsights.characterArcs as Record<string, { trajectory: string; currentState: string }>;
    if (Object.keys(arcs).length > 0) {
      sections.push("Character Arcs:");
      for (const [name, arc] of Object.entries(arcs)) {
        sections.push(`  • ${name}: ${arc.trajectory} [${arc.currentState}]`);
      }
    }
  }

  if (reflections.playerPrompt) {
    sections.push("");
    sections.push("┌─────────────────────────────────────────┐");
    sections.push("│  YOUR TURN — Player Reflection          │");
    sections.push("└─────────────────────────────────────────┘");
    sections.push("");
    sections.push(reflections.playerPrompt);
  }

  sections.push("");
  sections.push("═══════════════════════════════════════════");

  return sections.join("\n");
}
