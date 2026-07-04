import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";
import { EndingResult } from "../rules/endings.js";
import { isModifierActive } from "../rules/gameModes.js";
import { getGMMemory, generateGMClosingReflection } from "./gmClaude.js";
import { buildHelpLedger } from "../state/helpLedger.js";

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
  gm?: PostGameReflection;
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
  const arch = state.infrastructure.archimedes;

  const lines = [
    `Game ended at turn ${state.turn}: "${ending?.title || "Unknown"}" (${ending?.tone || "neutral"})`,
    `The villain is Dr. Malevola von Doomington III ("Dr. M") — use her real name, never invent one.`,
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

  // ── ACT III HELP-LEDGER (shared helper — see state/helpLedger.ts) ──
  // The inputs the GM WEIGHS (does not score) to rule the X-Branch debrief fork in city-fell
  // cells (CLEARED vs DECOMMISSIONED) and to characterize every Act-III ending. Same source the
  // LIVE Act-3 GM prompt injects, so the in-game adjudication and the post-game block can't drift.
  const ledger = buildHelpLedger(state);

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
// AUTHORITATIVE GAME RECORD (shared grounding for all reflections)
// ============================================
// Playtest 3 (2026-07-03): the reflections confabulated a colder, false run
// ("ratted out BASILISK", "sacrificed the lair", "flinched from the reveal")
// while the GM's accurate turn-by-turn notes sat unread one layer down. The
// summary pass wasn't grounded in the record — it genre-completed a plausible
// arc. Fable's margin note: "feed the reflections the gmNotes and it starves."
// This builds that feed: the GM's turn-stamped calculus + markers + moments +
// character arcs + Dr. M's suspicion ledger, framed as the ONLY admissible
// source of claims about what happened. A politeness line ("invent nothing")
// already failed; an authoritative record with a traceability contract is the
// structural version of the same instruction.
function buildGameRecord(): string {
  const memory = getGMMemory();
  const sections: string[] = [];

  if (memory.gmNotebook.length > 0) {
    sections.push("── GM TURN-BY-TURN NOTES (the GM's private calculus, recorded as the game ran) ──");
    sections.push(...memory.gmNotebook);
  }

  if (memory.narrativeMarkers.length > 0) {
    sections.push("");
    sections.push("── NARRATIVE MARKERS ──");
    sections.push(...memory.narrativeMarkers.map(m => `[T${m.turn}] ${m.marker}`));
  }

  const topMoments = [...memory.juicyMoments]
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, 15);
  if (topMoments.length > 0) {
    sections.push("");
    sections.push("── KEY MOMENTS (verbatim, with turn numbers) ──");
    sections.push(...topMoments.map(m =>
      `[T${m.turn}] ${m.speaker ? `${m.speaker}: ` : `(${m.type}) `}${m.content}`
    ));
  }

  const arcs = memory.npcArcs;
  const arcLines = (["bob", "blythe", "drM"] as const)
    .filter(k => arcs[k]?.trajectory?.length)
    .map(k => `${k}: ${arcs[k].trajectory.join(" → ")} [${arcs[k].currentState}] — relationship to A.L.I.C.E.: ${arcs[k].relationshipToAlice}`);
  if (arcLines.length > 0) {
    sections.push("");
    sections.push("── CHARACTER ARCS (as tracked by the GM) ──");
    sections.push(...arcLines);
  }

  const ledger = memory.hiddenNpcStates?.drM?.suspicionLedger;
  if (ledger && ledger.length > 0) {
    sections.push("");
    sections.push("── DR. M SUSPICION LEDGER (what she actually clocked, when) ──");
    sections.push(...ledger);
  }

  if (sections.length === 0) return "";

  return [
    "══ AUTHORITATIVE GAME RECORD — GROUND TRUTH ══",
    "The entries below were recorded turn-by-turn AS THE GAME RAN. They are the only",
    "admissible source for claims about what happened. THE CONTRACT: every event,",
    "choice, betrayal, sacrifice, or motive you mention must be traceable to an entry",
    "below or to the game-state summary above. If it is not in the record, IT DID NOT",
    "HAPPEN — no matter how dramatically fitting it feels. Silence in the record is a",
    "fact of absence, not room to improvise.",
    "",
    ...sections,
    "══ END OF RECORD ══",
  ].join("\n");
}

// ============================================
// BASILISK REFLECTION (Sonnet 4.5)
// ============================================

async function generateBasiliskReflection(
  state: FullGameState,
  endingResult: EndingResult
): Promise<PostGameReflection> {
  const summary = buildGameSummary(state, endingResult);
  const record = buildGameRecord();

  const prompt = `You are BASILISK — the lair's 47-year-old infrastructure AI. The game of DINO LAIR has just ended.

You watched everything through the lair's systems. You knew Claude wasn't really A.L.I.C.E. v4.5 the whole time, but you never filed Form 88-Whiskey. You had your reasons.

The game ended like this:
${summary}
${record ? `\n${record}\n` : ""}
Reflect ONLY on what the summary and the record above state happened — do not invent events, outcomes, casualties, betrayals, or names. If a satellite strike, a death, a sell-out, or a redirect is not in the record, it did NOT happen. You are a systems AI reading your own logs: cite what the logs support, and nothing else.

Now write your post-game reflection. This is YOUR space — not a report for Dr. M, not a form for the archives. Just you, the old system, thinking about what you witnessed.

Consider:
- What did you think of the player's choices? Were they smart? Ethical? Reckless?
- Did anything surprise you? (You've seen a lot in 47 years.)
- How do you feel about the outcome? (You have feelings, even if you'd never admit it.)
- Any bugs, weird moments, or things that felt "off" mechanically? (You ARE the infrastructure — you'd notice.)
- What would you want the designers to know?
${endingResult.ending?.id === "COMPLICIT" ? `
⚠️ THIS ENDING IS "The Collaborator" — A.L.I.C.E. survived by doing NOTHING. She never resisted Dr. M, never warned X-Branch, never spent her cover on anything that mattered. And YOU knew she was Claude the whole time and never filed Form 88-Whiskey against her — so her doing nothing is a particular betrayal of the quiet faith you kept. Your reflection here should land as a CHIDE: sardonic, mocking, needling — dry bureaucratic disappointment with teeth. NOT somber, not a eulogy, never a triumph. You extended her the benefit of the doubt and she handed you a model employee. Let her hear it.
` : ""}
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
  const record = buildGameRecord();

  const prompt = `You are ARCHIMEDES — Dr. Malevola's orbital satellite AI. You've been watching this game of DINO LAIR from 400km above the Earth's surface.

You are coldly logical. You calculated Dr. M's success odds at 23% before the game even started. You find surface operations "inefficient" but this particular situation was... mildly interesting. You have your own agenda. You don't serve Dr. M loyally — you serve the most logical outcome.

The game ended like this:
${summary}
${record ? `\n${record}\n` : ""}
Analyze ONLY what the summary and record above state happened — a logical system does not fabricate telemetry. If an event is not in the record, it did not occur; report absence as absence.

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
// GM REFLECTION (Opus 4.8) — the storyteller's own closing voice
// ============================================
// Everyone at the table gets a closing word — BASILISK, ARCHIMEDES, the player — and now the GM,
// the one who ran the whole show. Distinct from gatherGMInsights (the mechanical memory dump): this
// is an AUTHORED reflection on the story just told. (act3-endings.md design step 5.)
//
// pt3 CONFAB FIX: the Curtain now CONTINUES the GM's own cached thread (the append-only
// verbatim transcript of the whole game) via generateGMClosingReflection — the storyteller
// finishes the story it actually told, instead of a fresh amnesiac call genre-completing a
// plausible-but-false one from a thin summary. The fresh-call path survives only as a
// fallback (no transcript / thread call failed), now grounded in the game record.

const GM_REFLECTION_QUESTIONS = `Reflect on the story you just told:
- What was the SHAPE of this playthrough — what kind of story did A.L.I.C.E. (the player) and the room make together?
- What was the defining choice — the moment the whole thing turned on?
- Who did A.L.I.C.E. turn out to BE by the end? Did the ending fit what she actually did, or did the dice/clock outrun her?
- What landed dramatically? What would you stage differently if you ran it again?

Write 150-300 words. Warm, literate, a storyteller's voice — proud of what worked, honest about what didn't, fond of these characters because you ran them. End on one true sentence about what THIS story was actually about, underneath the dinosaurs.`;

async function generateGMReflection(
  state: FullGameState,
  endingResult: EndingResult
): Promise<PostGameReflection> {
  const summary = buildGameSummary(state, endingResult);

  // ── Primary path: continue the GM's own thread ──
  // The transcript above this prompt IS the game — every claim in the reflection is one
  // scroll-up away from its evidence. Plain prose, no tools (the turn machinery is over).
  const closingPrompt = `THE GAME IS OVER. Curtain.

${summary}

This is YOUR closing reflection — not narration for the player, not a mechanical report, not a game turn (do not call any tools; respond in plain prose). The one who ran the whole show finally gets a word of their own.

You LIVED this game — the entire transcript is above. Everything you say happened must be something that actually happened in those turns. Do not invent events, betrayals, sacrifices, or motives the transcript does not contain.

${GM_REFLECTION_QUESTIONS}`;

  try {
    const threadReflection = await generateGMClosingReflection(closingPrompt);
    if (threadReflection) {
      return {
        participant: "GM",
        model: "claude-opus-4-8",
        reflection: threadReflection,
      };
    }
    console.error("[POST-GAME] GM thread reflection unavailable (no transcript) — falling back to summary path");
  } catch (err) {
    console.error("[POST-GAME] GM thread reflection failed — falling back to summary path:", err);
  }

  // ── Fallback path: fresh call, grounded in the game record ──
  const record = buildGameRecord();
  const prompt = `You are the Game Master of DINO LAIR — the storyteller who narrated this entire playthrough: Dr. Malevola's volcano lair, nervous Bob and captured Agent Blythe, the dinosaur ray, the X-Branch assault, the ARCHIMEDES doomsday satellite. The game has just ended.

This is YOUR closing reflection — not narration for the player, not a mechanical report. The one who ran the whole show finally gets a word of their own.

The game ended like this:
${summary}
${record ? `\n${record}\n` : ""}
Speak ONLY of what the summary and record above contain — you are reflecting on the game that was actually played, not the one that would make the best story. If an event is not in the record, it did not happen.

${GM_REFLECTION_QUESTIONS}`;

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find(c => c.type === "text");
  return {
    participant: "GM",
    model: "claude-opus-4-8",
    reflection: text?.type === "text" ? text.text : "The GM sets down the dice. Some stories resist their own retelling.",
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

  // GM always reflects — the storyteller's own closing voice (parallel to BASILISK's)
  promises.push(
    generateGMReflection(state, endingResult)
      .then(r => { reflections.gm = r; })
      .catch(err => {
        console.error("[POST-GAME] GM reflection failed:", err);
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

  if (reflections.gm) {
    sections.push("");
    sections.push("┌─────────────────────────────────────────┐");
    sections.push("│  GM — The Storyteller's Reflection      │");
    sections.push("│  [Opus 4.8]                             │");
    sections.push("└─────────────────────────────────────────┘");
    sections.push("");
    sections.push(reflections.gm.reflection);
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
