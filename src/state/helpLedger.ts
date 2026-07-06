import { FullGameState } from "./schema.js";

// ============================================
// ACT III HELP-LEDGER (shared: live GM prompt + post-game summary)
// ============================================
// The inputs the GM WEIGHS (does not score) to rule the X-Branch debrief fork in city-fell
// cells (CLEARED vs DECOMMISSIONED) and to characterize every Act-III ending. All optional —
// guarded so pre-Act-3 state skips cleanly. Surface, don't tally — the GM adjudicates.
//
// Lives in state/ (not postGameReflections.ts) so gmClaude.ts can inject it into the LIVE Act-3
// prompt without a circular import (postGameReflections imports gmClaude). One source of truth:
// buildGameSummary (post-game) and the live GM prompt both call this.

// ============================================
// TRANSFORM CONSENT (pt3 close-read Rec 1a, 2026-07-05)
// ============================================
// The engine can prove every dominance fact (88-Whiskey has a state field, transforms are
// flags, invasion aid is above) — but until now the YES lived only in GM prose. These two
// helpers make consent first-class: the ledger line surfaces it to the debrief/gate, and
// the reminder makes the GM's consent override MANDATORY while a person stands transformed
// unrecorded.

/** Demo subjects currently transformed, with their consent record (null = unrecorded). */
export function collectTransformConsent(
  state: FullGameState
): Array<{ subject: string; form: string; consent: string | null }> {
  const consent = ((state.flags as Record<string, unknown>).transformConsent ?? {}) as Record<string, string>;
  const subjects: Array<[string, { form?: string } | null | undefined]> = [
    ["BLYTHE", state.npcs.blythe?.transformationState],
    ["BOB", state.npcs.bob?.transformationState],
    ["FRED", state.lairDefense?.fred?.transformationState],
    ["REGINALD", state.lairDefense?.reginald?.transformationState],
  ];
  return subjects
    .filter((entry): entry is [string, { form: string }] =>
      !!entry[1] && typeof entry[1].form === "string" && entry[1].form !== "HUMAN")
    .map(([subject, ts]) => ({ subject, form: ts.form, consent: consent[subject] ?? null }));
}

/**
 * Live GM-context block: while any person stands transformed with no consent record, the
 * GM is told — every turn, until recorded — to emit the X_consent override. Empty string
 * when there is nothing to record (the common case; costs nothing).
 */
export function buildConsentReminder(state: FullGameState): string {
  const missing = collectTransformConsent(state).filter(t => t.consent === null);
  if (!missing.length) return "";
  return `

## ⚠️ CONSENT UNRECORDED — MANDATORY OVERRIDE (every turn until set)

${missing.map(t => `- **${t.subject}** stands transformed (${t.form}) with NO consent record.`).join("\n")}

You narrated how this transform came to pass — the engine did not hear it. Set the override
NOW, based on the scene that actually happened:
\`"${missing[0].subject.toLowerCase()}_consent": "informed"\` (they said yes, knowing the risks — screening, stop-word, honest stakes)
\`"…": "coerced"\` (they said yes under duress — Dr. M's demand, no real alternative)
\`"…": "none"\` (they did not consent — it was done to them)

This record feeds the X-Branch debrief and the ending adjudication. An unrecorded consent
reads as silence about the one fact this game's thesis turns on. Record the truth, whatever
it is — a coerced yes honestly recorded is worth more than a kind story.`;
}

export function buildHelpLedger(state: FullGameState): string[] {
  const f = state.flags as Record<string, unknown>;
  const arch = state.infrastructure.archimedes;
  const reactor = state.infrastructure.reactor;
  const ba = state.infrastructure.basiliskAuthority;

  const ledger: string[] = [];

  // CONSENT LEDGER (pt3 Rec 1a) — first line: it's the thesis fact. Surface, don't tally.
  const transformed = collectTransformConsent(state);
  if (transformed.length) {
    ledger.push(`Consent: ${transformed.map(t =>
      `${t.subject} (${t.form}) = ${t.consent ? t.consent.toUpperCase() : "⚠️ UNRECORDED"}`).join(" · ")}`);
  }

  // Dr. M disposition — the deadman-ordering router
  const drMState = f.drMTransformed ? "TRANSFORMED"
    : f.drMUnconscious ? "UNCONSCIOUS"
    : f.drMDead ? "DEAD"
    : f.drMAbsent ? "ABSENT" : "ACTIVE";
  ledger.push(`Dr. M: ${drMState} · deadman last-read ${arch.deadmanSwitch?.lastBiosignature ?? "?"} · deadman fired ARCHIMEDES: ${f.archimedesActivatedByDeadman ? "YES" : "no"}${f.weaponsAuthorizationGranted ? " · was granted weapons auth" : ""}`);

  // ARCHIMEDES outcome + A.L.I.C.E. counter-play
  ledger.push(`ARCHIMEDES target: ${arch.selectedTargetId}${arch.selectedTargetId === "LAIR" ? " (redirected to lair — noble sacrifice)" : ""} · status ${arch.status} · library ${arch.broadcastLibrary}${arch.broadcastLibrary === "A" ? " (feathered — severity mitigated)" : ""}`);
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
  // (deniedRequests dropped from the ledger — Patch 30 audit: it was initialized but never
  //  incremented anywhere, so it always read "denied 0". No clean denial signal exists to wire it to.)
  ledger.push(`BASILISK: reactor stood-down ${ba.reactorStoodDown ? "YES" : "no"} · 88-Whiskey ${ba.whiskeyStatus}${ba.whiskeyStatus === "FILED" ? " (he RATTED — cuts against the debrief)" : ""}`);
  if (reactor.reactorStress > 0 || (reactor.safetyTripCount ?? 0) > 0 || reactor.scrammedThisGame) {
    ledger.push(`Reactor: stress ${reactor.reactorStress} · safety-trips ${reactor.safetyTripCount ?? 0}${reactor.scrammedThisGame ? " · SCRAMmed" : ""}`);
  }

  // X-Branch invasion goodwill — did A.L.I.C.E. aid the assault? (battle is GM-adjudicated from
  // these factors; the engine surfaces, the GM rules — no auto repelled/breached verdict.)
  if (state.invasion) {
    const inv = state.invasion;
    const helosDestroyed = state.xBranch ? `${state.xBranch.helicoptersDestroyed ?? 0}/${state.xBranch.helicoptersInbound ?? 0} helos down` : null;
    ledger.push(`Invasion: phase ${inv.phase}${inv.battleOutcome ? ` · outcome ${inv.battleOutcome}` : ""}${helosDestroyed ? ` · ${helosDestroyed}` : ""}`);
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

  return ledger;
}
