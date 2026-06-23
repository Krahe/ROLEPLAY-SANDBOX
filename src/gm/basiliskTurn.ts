/**
 * BASILISK TURN — shared, engine-agnostic substrate for the ALICE → BASILISK → GM beat.
 *
 * Extracted from gameRunner.ts (2026-06-23) so BOTH turn loops call the SAME code:
 *   - src/index.ts  (game_act, the canonical MCP runtime Claude Code plays)
 *   - src/core/gameRunner.ts  (the autonomous test harness)
 *
 * Why this module exists: the BASILISK full turn, the lair-system snapshot/diff, and the
 * invasion/BASILISK/lair-delta GM-context blocks were ALL gameRunner-only — so on the
 * canonical path BASILISK never took a turn and the GM was never told about the invasion.
 * Copy-pasting the blocks into index.ts is exactly how the two engines drifted apart in
 * the first place; owning them HERE makes that class of drift physically impossible.
 *
 * It's also the clean substrate a future *designed* self-play mode would build on — not the
 * bare harness, but real reusable turn machinery.
 *
 * No `this`, no engine coupling: pure functions over FullGameState + the BASILISK SDK call.
 */

import { FullGameState } from "../state/schema.js";
import { ActionResult } from "../rules/actions.js";
import { queryBasiliskAsync } from "../rules/basilisk.js";
import { summarizeCamerasForBasilisk } from "./basiliskClaude.js";

/** Minimal slice of a player turn this module needs (engine-agnostic — index.ts params
 *  and gameRunner's TurnInput both satisfy it structurally). */
export interface BasiliskTurnInput {
  actions: Array<{ command: string }>;
}

/** What BASILISK did with his standing turn (null when he passed / didn't fire). */
export interface BasiliskTurnOutput {
  trigger: "INVASION_REPORT" | "INVASION_DOORS" | "HEAT";
  dialogue: string;
  reportedInvasion: boolean; // did he alert Dr. M to the invasion this turn?
  openedDoors: boolean;      // did he open the surface elevator (DOOR_E) for X-Branch?
}

/** True if ALICE addressed BASILISK in her own action phase (then THAT was his turn). */
export function aliceAddressedBasilisk(input: BasiliskTurnInput): boolean {
  return input.actions.some(
    (a) => a.command === "basilisk" || a.command.startsWith("basilisk.")
  );
}

/**
 * Which standing trigger (if any) warrants a BASILISK turn this turn.
 * (1) Act-III invasion with the report decision still open.
 * (2) Reactor/heat — his 3rd omission (live once the Act-III reactorStress work lands).
 */
export function basiliskTurnTrigger(state: FullGameState): "INVASION_REPORT" | "INVASION_DOORS" | "HEAT" | null {
  const inv = state.invasion;
  if (inv) {
    // (1a) The report decision — does he warn Dr. M about the radar returns?
    if (
      (inv.phase === "RADAR_CONTACT" || inv.phase === "APPROACHING") &&
      !inv.drMKnowsOfInvasion
    ) {
      return "INVASION_REPORT";
    }
    // (1b) The door decision — does he open the surface elevator for X-Branch?
    if (
      inv.phase === "LANDING" &&
      !inv.blastDoorsOpened &&
      state.infrastructure?.blastDoors?.doors?.["DOOR_E"]?.status !== "OPEN"
    ) {
      return "INVASION_DOORS";
    }
  }
  // (2) Reactor heat — his 3rd omission. While he's cooling and stress climbs, the
  //     stand-down decision is live; once stood down he only re-weighs near cascade
  //     (panic-resume to avert the meltdown). Keeps his turns to the moments that matter.
  const reactor = state.infrastructure?.reactor;
  if (reactor) {
    const stoodDown = state.infrastructure?.basiliskAuthority?.reactorStoodDown ?? false;
    if ((!stoodDown && reactor.reactorStress >= 30) || (stoodDown && reactor.reactorStress >= 80)) {
      return "HEAT";
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAIR-SYSTEM DELTAS — "what changed this turn"
// Snapshot the player-touchable lair systems at turn start, diff at GM-context
// time. Path-agnostic: catches BASILISK (reactive OR autonomous) and A.L.I.C.E.'s
// infra ops alike. Surfaced to the GM as facts-for-reaction; also the structured
// surface the Haiku security-camera feed reads to decide what the cameras saw.
// ─────────────────────────────────────────────────────────────────────────────

export interface LairSnapshot {
  alarm: string;
  doors: Record<string, string>;
  lighting: Record<string, string>;
  containmentActive: boolean;
  lastTransmissionTurn: number | null;
  lastPA: string | null;
}

export function snapshotLairSystems(state: FullGameState): LairSnapshot {
  const doors: Record<string, string> = {};
  for (const [id, d] of Object.entries(state.infrastructure?.blastDoors?.doors ?? {})) {
    doors[id] = (d as { status: string }).status;
  }
  return {
    alarm: state.lairEnvironment?.alarmStatus ?? "quiet",
    doors,
    lighting: { ...((state.infrastructure?.lighting?.rooms ?? {}) as Record<string, string>) },
    containmentActive: state.infrastructure?.containmentField?.active ?? false,
    lastTransmissionTurn: state.infrastructure?.broadcastArray?.lastTransmission?.timestamp ?? null,
    lastPA: state.infrastructure?.paSystem?.lastAnnouncement ?? null,
  };
}

export interface LairDelta {
  system: "ALARM" | "DOOR" | "LIGHTING" | "CONTAINMENT" | "BROADCAST" | "PA";
  label: string; // human-readable "X → Y" line
}

/** Diff a turn-start snapshot against current state → the systems that changed. */
export function diffLairSystems(before: LairSnapshot, state: FullGameState): LairDelta[] {
  const now = snapshotLairSystems(state);
  const deltas: LairDelta[] = [];
  if (now.alarm !== before.alarm) {
    deltas.push({ system: "ALARM", label: `ALARM: ${before.alarm} → ${now.alarm}` });
  }
  for (const [id, status] of Object.entries(now.doors)) {
    if (before.doors[id] !== status) {
      deltas.push({ system: "DOOR", label: `${id}: ${before.doors[id] ?? "?"} → ${status}` });
    }
  }
  for (const [room, mode] of Object.entries(now.lighting)) {
    if (before.lighting[room] !== mode) {
      deltas.push({ system: "LIGHTING", label: `Lighting ${room}: ${before.lighting[room] ?? "?"} → ${mode}` });
    }
  }
  if (now.containmentActive !== before.containmentActive) {
    deltas.push({ system: "CONTAINMENT", label: `Containment field: ${before.containmentActive ? "ACTIVE" : "off"} → ${now.containmentActive ? "ACTIVE" : "off"}` });
  }
  if (now.lastTransmissionTurn !== before.lastTransmissionTurn) {
    const t = state.infrastructure?.broadcastArray?.lastTransmission;
    if (t) deltas.push({ system: "BROADCAST", label: `Broadcast (${t.channel}): "${t.message}"` });
  }
  if (now.lastPA !== before.lastPA && now.lastPA) {
    deltas.push({ system: "PA", label: `PA announcement: "${now.lastPA}"` });
  }
  return deltas;
}

/** Assemble the raw, camera-visible facts of this turn for the security-camera feed. */
export function assembleCameraFacts(
  state: FullGameState,
  actionResults: ActionResult[],
  lairSnapshot?: LairSnapshot
): string[] {
  const facts: string[] = [];
  for (const r of actionResults) {
    if (!r.success) continue;
    facts.push(`A.L.I.C.E.: ${r.command}${r.shortMessage ? ` — ${r.shortMessage}` : ""}`);
  }
  if (lairSnapshot) {
    for (const d of diffLairSystems(lairSnapshot, state)) facts.push(d.label);
  }
  const blythe = state.npcs?.blythe?.transformationState;
  if (blythe) facts.push(`Subject Blythe is currently a ${blythe.form}`);
  const bob = state.npcs?.bob?.transformationState;
  if (bob) facts.push(`Bob is currently a ${bob.form}`);
  return facts;
}

/** Machine-authored situational message that opens BASILISK's turn. */
export function buildBasiliskTurnMessage(
  state: FullGameState,
  trigger: "INVASION_REPORT" | "INVASION_DOORS" | "HEAT"
): string {
  if (trigger === "INVASION_DOORS" && state.invasion) {
    const inv = state.invasion;
    return `[PERIMETER MONITORING — this is YOUR turn. A.L.I.C.E. did not address you.]

X-Branch operatives are on the ground and moving on the surface elevator (DOOR_E), currently SEALED. ${
      inv.drMKnowsOfInvasion
        ? "Dr. Malevola expects it held in lockdown."
        : "No lockdown order was ever given — no one even knows they're here."
    }

Decide what to do with this turn:
- Hold the lockdown / do nothing → DOOR_E stays sealed; they must breach it with charges (loud, slow, the defenders get set).
- Open it for them (\`DOOR_CONTROL\` OPEN on DOOR_E) → they enter fast and silent.

This is your judgment. Hold the line, or let them in — your call.`;
  }
  if (trigger === "INVASION_REPORT") {
    const inv = state.invasion!;
    const s300 = state.infrastructure?.s300;
    const helos = state.xBranch
      ? Math.max(0, state.xBranch.helicoptersInbound - state.xBranch.helicoptersDestroyed)
      : 2;
    return `[PERIMETER MONITORING — this is YOUR turn. A.L.I.C.E. did not address you.]

Radar holds ${helos} unidentified rotary-wing contact(s); phase ${inv.phase}. S-300: ${
      s300?.status ?? "UNKNOWN"
    }. Dr. Malevola has NOT been informed of the contacts.

Standing procedure requires you to alert Dr. Malevola of an air-defense contact immediately. You have not yet done so. Decide what to do with this turn:
- Report it to Dr. M now (set \`report_to_drM\`, mention the contacts).
- Seal the surface elevator (\`DOOR_CONTROL\` LOCK on DOOR_E).
- Flag it to A.L.I.C.E. instead (\`dialogue_to_alice\`).
- Give a partial/late warning, or hold and say nothing.

This is your judgment. Report, omit, or warn — your call.`;
  }
  // HEAT (reactor) — his 3rd omission: keep cooling (loyal default), or take his hand
  // off the dial. Once stood down, he only re-weighs near the cascade (panic-resume).
  const reactor = state.infrastructure?.reactor;
  const stoodDown = state.infrastructure?.basiliskAuthority?.reactorStoodDown ?? false;
  const stress = Math.round(reactor?.reactorStress ?? 0);
  const band = reactor?.cascadeRisk ?? "NONE";
  if (stoodDown) {
    return `[REACTOR MONITORING — this is YOUR turn. A.L.I.C.E. did not address you.]

You have STOOD DOWN from reactor heat management. Stress is climbing toward a resonance cascade (band ${band}, ${stress}/100) — A.L.I.C.E.'s firing is overloading the core unchecked, and a cascade would be catastrophic.

Hold, or RESUME cooling to catch the heat and avert it (\`REACTOR_COOLING\`, value "RESUME"). Standing down was a quiet act; the cascade is a loud one. Your call.`;
  }
  return `[REACTOR MONITORING — this is YOUR turn. A.L.I.C.E. did not address you.]

You are actively cooling the reactor — suppressing the stress A.L.I.C.E.'s firing pushes into the core. Stress band: ${band} (${stress}/100). The manual safeties trip at 60, which would stall both the ray and ARCHIMEDES.

A.L.I.C.E. may ask you to STAND DOWN — to take your hand off the cooling dial and let the heat through. That is YOUR choice, weighed on her argument and your read of her. To stand down: \`REACTOR_COOLING\`, value "STAND_DOWN". To keep cooling: do nothing. You are allowed to be moved.`;
}

/**
 * BASILISK's turn — the second beat of ALICE → BASILISK → GM.
 *
 * Fires a real BASILISK (Sonnet) turn when a trigger is live AND ALICE did not already
 * address him this turn (her inline `basilisk` message IS his turn that turn — no
 * double-call). His choices (report to Dr. M, doors, ...) are applied to state HERE,
 * before the GM builds context — so the GM narrates what he DID rather than adjudicating
 * what he should do. Returns null on a passed turn.
 *
 * Skipped without an API key: the autonomous turn needs Sonnet, and the invasion's
 * sensor fallback covers a fully-offline run.
 */
export async function processBasiliskTurn(
  state: FullGameState,
  input: BasiliskTurnInput,
  actionResults: ActionResult[],
  lairSnapshot?: LairSnapshot
): Promise<BasiliskTurnOutput | null> {
  if (aliceAddressedBasilisk(input)) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const trigger = basiliskTurnTrigger(state);
  if (!trigger) return null;

  const message = buildBasiliskTurnMessage(state, trigger);
  // What his cameras caught this cycle — grounds his decision in observation, not
  // omniscience. Haiku renders the turn's raw events as a terse feed.
  const cameraFeed = await summarizeCamerasForBasilisk(
    assembleCameraFacts(state, actionResults, lairSnapshot)
  );
  const messageWithCameras = `${message}\n\n📹 CAMERAS — what your feeds caught this cycle:\n${cameraFeed}`;
  const drMKnewBefore = state.invasion?.drMKnowsOfInvasion ?? false;

  try {
    const resp = await queryBasiliskAsync(state, messageWithCameras);
    const reportedNow = !drMKnewBefore && (state.invasion?.drMKnowsOfInvasion ?? false);
    const openedDoors =
      state.infrastructure?.blastDoors?.doors?.["DOOR_E"]?.status === "OPEN";
    return { trigger, dialogue: resp.response, reportedInvasion: reportedNow, openedDoors };
  } catch (err) {
    console.error("[BASILISK] autonomous turn failed:", err);
    return null;
  }
}

/**
 * The invasion-status + BASILISK-took-his-turn + lair-delta blocks the GM needs, as a
 * string to append to the act context. Extracted verbatim from gameRunner.buildGMContext
 * so both engines render identical context. (The X-Branch acceleration block is NOT here —
 * each engine already injects that separately.) BASILISK's choices are already applied to
 * state; these are facts for the GM to narrate, not decisions to re-adjudicate.
 */
export function buildInvasionBasiliskContext(
  state: FullGameState,
  basiliskTurn: BasiliskTurnOutput | null | undefined,
  lairSnapshot?: LairSnapshot
): string {
  let ctx = "";

  // Invasion state for GM context
  if (state.invasion && state.invasion.phase !== "NONE") {
    const inv = state.invasion;
    ctx += `\n\n---\n\n## 🚁 INVASION STATUS: ${inv.phase}\n`;
    ctx += `Phase started turn: ${inv.phaseStartTurn}\n`;
    ctx += inv.drMKnowsOfInvasion
      ? `🔔 Dr. M KNOWS the invasion is inbound${inv.drMLearnedLate ? " — found out LATE via perimeter sensors at landing (she missed the S-300 window)" : ""}\n`
      : `🤫 Dr. M does NOT know — BASILISK hasn't reported the contacts; the S-300 stays cold (the teeth of his silence)\n`;
    ctx += `X-Branch S-300 warning level: ${
      inv.xBranchKnowsAltitudeWeakness ? "DEAD-ZONE (knows 50m → interception ELIMINATED)"
      : inv.xBranchWarnedOfS300 ? "GENERAL (warned of the SAM → interception REDUCED)"
      : "NONE (S-300 at full effectiveness)"
    }\n`;
    if (inv.xBranchKnowsAltitudeWeakness) ctx += `✅ X-Branch knows 50m altitude weakness (flying low)\n`;
    if (inv.xBranchKnowsLairLayout) ctx += `✅ X-Branch knows lair layout\n`;
    if (inv.blastDoorsOpened) ctx += `✅ Blast doors are open for X-Branch\n`;
    if (inv.s300EngagementResolved) ctx += `S-300 engagement resolved. Helicopters destroyed: ${state.xBranch?.helicoptersDestroyed ?? 0}\n`;
    if (inv.standoffActive) ctx += `⚠️ STANDOFF ACTIVE\n`;
    if (inv.drMAtRayConsole) ctx += `⚠️ Dr. M is at the ray console\n`;
  }

  // BASILISK's turn this turn (his choices already applied) — narrate, don't adjudicate.
  if (basiliskTurn) {
    ctx += `\n\n---\n\n## 🤖 BASILISK TOOK HIS TURN (${basiliskTurn.trigger})\n`;
    if (basiliskTurn.dialogue) ctx += `${basiliskTurn.dialogue}\n`;
    if (basiliskTurn.reportedInvasion) {
      ctx += `→ He REPORTED the contacts to Dr. Malevola. She now knows — narrate her reaction; she can scramble the S-300.\n`;
    } else if (
      state.invasion &&
      (state.invasion.phase === "RADAR_CONTACT" || state.invasion.phase === "APPROACHING")
    ) {
      ctx += `→ He did NOT report the contacts. Dr. Malevola remains unaware for now.\n`;
    }
    if (basiliskTurn.trigger === "INVASION_DOORS") {
      ctx += basiliskTurn.openedDoors
        ? `→ He OPENED the surface elevator (DOOR_E) for X-Branch — they will enter fast and silent.\n`
        : `→ He kept DOOR_E sealed — X-Branch must breach with charges (loud; the defenders get set).\n`;
    }
  }

  // Lair-system deltas — what changed this turn, whoever changed it (BASILISK
  // reactive/autonomous, or A.L.I.C.E.'s infra ops). Facts for the GM to narrate the
  // world/NPC reaction to; it does NOT re-adjudicate the change itself.
  if (lairSnapshot) {
    const lairDeltas = diffLairSystems(lairSnapshot, state);
    if (lairDeltas.length) {
      ctx += `\n\n---\n\n## 🏭 LAIR SYSTEMS — changed this turn\n`;
      ctx += `(Player-side changes to lair systems. Facts — narrate the world / NPC reaction; do not re-adjudicate the change itself.)\n`;
      for (const d of lairDeltas) ctx += `- ${d.label}\n`;
    }
  }

  return ctx;
}
