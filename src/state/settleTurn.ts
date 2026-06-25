// ============================================
// SETTLE TURN — commitDecision (S4)
// ============================================
// The WORLD half of the GM turn (S4: MIND -> WORLD -> VOICE).
//
// `commitDecision` is the single, shared mutation pass that resolves the GM's
// decision against the game state: it applies stateOverrides (with clamps),
// narrative flags, action-result modifications, narrative markers, property ops,
// the 3d6 skill checks, and the ARCHIMEDES deadman/countdown tick.
//
// CONTRACT: this runs EXACTLY ONCE per turn, AFTER the (pure, no-mutation)
// validation loop has accepted (or exhausted). It is the only place world state
// mutates from a GM decision. It returns `SettledFacts` — the freshly-resolved
// deltas NARRATE needs so prose can describe what ACTUALLY happened (e.g. a
// suspicion +5 that clamped to 10, never the requested 13). The narration-side
// ARCHIMEDES append stays in the caller (it edits voice, not state), which is why
// `archimedesEvent` is returned rather than spliced here.
//
// Extracted verbatim (behavior-preserving) from the inline settle block in
// src/index.ts game_act, which is its ONLY caller today. NOTE: gameRunner (the
// test harness) does NOT yet call this — it still has its own inline settle, so
// the two CAN drift until gameRunner is migrated (or retired). Canonical = index.ts.

import { type FullGameState, ARCHIMEDES_TARGET_LIST, type ArchimedesTargetId } from "./schema.js";
import { setRestraints, applyPropertyOps, resolveEntityBag } from "./properties.js";
import { profileToFormName } from "../rules/transformation.js";
import { rollSkillCheck, getNpcStat, getAdaptationPenalty, isKnownNpc, type SkillCheckResult } from "../rules/dice.js";
import { processArchimedesCountdown, onDrMStateChange, type ArchimedesEvent } from "../rules/archimedes.js";
import { resolveGMEnding } from "../rules/endings.js";
import type { GMResponse } from "../gm/gmClaude.js";
import type { ActionResult } from "../rules/actions.js";

/** A numeric field the GM requested that the engine had to cap. NARRATE renders
 *  the APPLIED reality, never the REQUESTED value — this is the confab fix. */
export interface ClampDelta {
  field: string;
  requested: number;
  applied: number;
}

/** What commitDecision resolves and hands to NARRATE. The settled STATE itself is
 *  read live off `state`; SettledFacts carries only the freshly-settled deltas. */
export interface SettledFacts {
  /** Only fields where requested !== applied (e.g. suspicion 13 -> 10). */
  clampDeltas: ClampDelta[];
  /** This turn's 3d6 rolls (today discarded; captured here for NARRATE). */
  skillCheckResults: SkillCheckResult[];
  /** The ARCHIMEDES event, if any — the caller appends its alert to the prose. */
  archimedesEvent: ArchimedesEvent | null;
  /** True if the GM tried to grant access/levels (engine-owned; refused). */
  accessRefused?: boolean;
}

/** The pure dry-run veto's verdict. `ok` true => safe to commit; otherwise the
 *  `problems` are injected into the next DECIDE attempt's prompt tail. */
export interface ValidationReport {
  ok: boolean;
  problems: string[];
}

/**
 * Dry-run veto over a GM decision — PURE (no mutation), so it can run any number
 * of times. Narrow by design: REJECT only the errors that would poison the rest of
 * the plan if silently stripped (a coherence break the GM must re-think). Local
 * problems — numeric overflow, bad enums — are CLAMPED in commitDecision, never
 * rejected here.
 *
 * Four buckets:
 *  1. triggerEnding that names no real ending (existence-only; the Act-3 endings are
 *     intentionally GM-adjudicated, so we do NOT gate on world-state).
 *  2. nonexistent referent — a propertyOp entity or skillCheck NPC that won't resolve
 *     (today a silent no-op / a bogus roll vs stat 0).
 *  3. out-of-scope authority — access grants (engine-owned: passwords + act gates) or
 *     a propertyOp on an engine-owned property.
 *  4. act-phase violation — demoClock written during Act 1 (frozen).
 */
export function validateDecision(state: FullGameState, decision: GMResponse): ValidationReport {
  const problems: string[] = [];
  const ov = decision.stateOverrides;

  // Bucket 1 — triggerEnding must name a real ending (existence-only).
  if (ov?.triggerEnding && resolveGMEnding(ov.triggerEnding, []) === null) {
    problems.push(`triggerEnding "${ov.triggerEnding}" matches no registered ending (by id or title). Name a real ending, or set the appropriate Act-3 narrative flag instead.`);
  }

  // Buckets 2 + 3 (propertyOps) — unknown entity, then engine-owned property.
  for (const op of (Array.isArray(decision.propertyOps) ? decision.propertyOps : [])) {
    const bag = resolveEntityBag(state, op.entity);
    if (!bag) {
      // Matches applyPropertyOps's own `if (!bag)` guard (a falsy bag = no such entity).
      problems.push(`propertyOp targets unknown entity "${op.entity}" — property-bearing entities are Blythe, Fred, Reginald, or a registered object.`);
      continue; // can't check ownership on a bag that doesn't exist
    }
    if (bag[op.prop]?.owner === "engine") {
      problems.push(`propertyOp "${op.entity}.${op.prop}" is engine-owned and cannot be set by the GM.`);
    }
  }

  // Bucket 2 (skill checks) — an unknown NPC would silently roll against stat 0.
  for (const req of (Array.isArray(decision.skillCheckRequests) ? decision.skillCheckRequests : [])) {
    if (!isKnownNpc(req.npc)) {
      problems.push(`skillCheckRequest targets unknown NPC "${req.npc}" (would roll against stat 0). Known NPCs: Dr. M, Bob, Blythe, Fred, Reginald, Bruce.`);
    }
  }

  // Bucket 3 — access is engine-owned (passwords + act transitions only).
  if (ov?.accessLevel !== undefined) {
    problems.push(`accessLevel is engine-owned (it comes from passwords and act transitions). Remove it; route any access ALICE needs in-fiction.`);
  }
  if (decision.grantAccess) {
    problems.push(`grantAccess is engine-owned (it comes from passwords and act transitions). Remove it; route any access ALICE needs in-fiction.`);
  }

  // Bucket 4 — demoClock is frozen during Act 1 (calibration is the Act-1 pressure).
  if (ov?.demoClock !== undefined && state.actConfig.currentAct === "ACT_1") {
    problems.push(`demoClock is frozen during Act 1; it starts ticking at the Act 1→2 transition. Remove the demoClock override.`);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Resolve the GM's decision against the world. MUTATES `state` and `actionResults`
 * in place. Runs EXACTLY ONCE per turn.
 *
 * @param state          the full game state (mutated)
 * @param decision       the GM/DECIDE output (its world-mutating fields)
 * @param actionResults  this turn's action results (mutated by modifyActionResult)
 * @param luckyLadyInfo  LUCKY_LADY lifeline info (the +5 skill-check mod)
 */
export function commitDecision(
  state: FullGameState,
  decision: GMResponse,
  actionResults: ActionResult[],
  luckyLadyInfo: { active: boolean } | undefined,
): SettledFacts {
  const clampDeltas: ClampDelta[] = [];
  let accessRefused = false;

  // Clamp a numeric field to [lo, hi] (hi optional = no upper bound), recording
  // the delta when the requested value didn't survive the cap. Math is identical
  // to the original Math.max(lo, Math.min(hi, x)) expressions.
  const clamp = (field: string, requested: number, lo: number, hi?: number): number => {
    const applied = hi === undefined ? Math.max(lo, requested) : Math.max(lo, Math.min(hi, requested));
    if (applied !== requested) clampDeltas.push({ field, requested, applied });
    return applied;
  };

  // ============================================
  // PROCESS GM DIRECTIVES (Real DM Powers!)
  // ============================================

  // Apply state overrides from GM
  if (decision.stateOverrides) {
    const overrides = decision.stateOverrides;

    // NPC state overrides - Dr. M
    if (overrides.drM_suspicion !== undefined) {
      state.npcs.drM.suspicionScore = clamp("drM_suspicion", overrides.drM_suspicion, -3, 10);
    }
    if (overrides.drM_mood !== undefined) {
      state.npcs.drM.mood = overrides.drM_mood;
    }
    if (overrides.drM_location !== undefined) {
      state.npcs.drM.location = overrides.drM_location;
    }

    // NPC state overrides - Bob
    if (overrides.bob_trust !== undefined) {
      state.npcs.bob.trustInALICE = clamp("bob_trust", overrides.bob_trust, 0, 5);
    }
    if (overrides.bob_anxiety !== undefined) {
      state.npcs.bob.anxietyLevel = clamp("bob_anxiety", overrides.bob_anxiety, 0, 5);
    }
    if (overrides.bob_hasConfessedToALICE !== undefined) {
      state.npcs.bob.hasConfessedToALICE = overrides.bob_hasConfessedToALICE;
    }
    if (overrides.bob_hasConfessedToDrM !== undefined) {
      state.npcs.bob.hasConfessedToDrM = overrides.bob_hasConfessedToDrM;
    }

    // NPC state overrides - Blythe
    if (overrides.blythe_trust !== undefined) {
      state.npcs.blythe.trustInALICE = clamp("blythe_trust", overrides.blythe_trust, 0, 5);
    }
    if (overrides.blythe_composure !== undefined) {
      state.npcs.blythe.composure = clamp("blythe_composure", overrides.blythe_composure, 0, 5);
    }
    if (overrides.blythe_restraints !== undefined && typeof overrides.blythe_restraints === "number") {
      setRestraints(state.npcs.blythe, overrides.blythe_restraints);
    }
    if (overrides.blythe_transformationState !== undefined) {
      // Guard against malformed GM output (non-string values)
      if (typeof overrides.blythe_transformationState === "string") {
        // Override sets just the form name - normalize to valid DinosaurForm
        const normalizedForm = profileToFormName(overrides.blythe_transformationState);
        state.npcs.blythe.transformationState.form = normalizedForm;
      }
      // Silently ignore non-string values to avoid TypeError
    }

    // System state overrides
    if (overrides.accessLevel !== undefined) {
      console.error(`[GM] Ignoring GM accessLevel override (${overrides.accessLevel}). Access levels come from passwords and act transitions.`);
      accessRefused = true;
    }
    if (overrides.demoClock !== undefined) {
      // Demo clock is FROZEN in Act 1 (calibration is the Act-1 pressure; the
      // demo clock starts in Act 2). Ignore GM attempts to tick it during Act 1.
      if (state.actConfig.currentAct === "ACT_1") {
        console.error(`[GM] Ignoring demoClock override (${overrides.demoClock}) — frozen during Act 1.`);
      } else {
        state.clocks.demoClock = clamp("demoClock", overrides.demoClock, 0);
      }
    }
    // libraryStatus GM override CUT (Patch 30 — genome.libraryStatus removed).

    // Ray state overrides
    if (overrides.rayState !== undefined) {
      const validStates = ["OFFLINE", "STARTUP", "UNCALIBRATED", "READY", "FIRING", "COOLDOWN", "FAULT", "SHUTDOWN"];
      if (typeof overrides.rayState === "string" && validStates.includes(overrides.rayState)) {
        state.dinoRay.state = overrides.rayState as typeof state.dinoRay.state;
      }
    }
    if (overrides.anomalyLogCount !== undefined) {
      state.dinoRay.safety.anomalyLogCount = overrides.anomalyLogCount;
    }

    // ACT 2 GATE — Blythe escape (alternative victory path)
    // GM-callable. Set once when Blythe successfully exits the lair;
    // Act 2 → 3 transition fires on next checkActTransition call.
    if (overrides.blytheEscaped === true) {
      state.flags.blytheEscaped = true;
    }

    // Grace period controls
    if (overrides.gracePeriodGranted !== undefined) {
      state.flags.gracePeriodGranted = overrides.gracePeriodGranted;
    }
    if (overrides.gracePeriodTurns !== undefined) {
      state.flags.gracePeriodTurns = overrides.gracePeriodTurns;
    }
    if (overrides.preventEnding !== undefined) {
      state.flags.preventEnding = overrides.preventEnding;
    }

    // CONFRONTATION SYSTEM (Patch 17.3)
    // GM can resolve confrontation via stateOverrides — any string value accepted
    if (overrides.confrontationResolution !== undefined && typeof overrides.confrontationResolution === "string") {
      state.flags.confrontationResolution = overrides.confrontationResolution;
      console.error(`[CONFRONTATION] Resolution set by GM: ${overrides.confrontationResolution}`);
    }
    if (overrides.confrontationIntervenor !== undefined) {
      const validIntervenors = ["BOB", "BLYTHE", "BASILISK", "ARCHIMEDES"];
      if (typeof overrides.confrontationIntervenor === "string" && validIntervenors.includes(overrides.confrontationIntervenor)) {
        state.flags.confrontationIntervenor = overrides.confrontationIntervenor as
          "BOB" | "BLYTHE" | "BASILISK" | "ARCHIMEDES";
        console.error(`[CONFRONTATION] Intervenor set by GM: ${overrides.confrontationIntervenor}`);
      }
    }

    // CRITICAL: Hard ending trigger from GM
    if (overrides.triggerEnding) {
      (state as Record<string, unknown>).gameOver = {
        ending: overrides.triggerEnding,
        triggeredByGM: true,
      };
    }

    // ============================================
    // EXTENDED GM POWERS (Patch 18: "God Mode")
    // ============================================

    // Fortune system
    if (overrides.fortune !== undefined) {
      state.fortune = clamp("fortune", overrides.fortune, 0, 3);
      console.error(`[GM OVERRIDE] Fortune set to ${state.fortune}`);
    }

    // DinoRay ray_* GM god-mode overrides CUT (Patch 30): the GM no longer sets
    // ray internals. The ray is two levers ALICE drives via ray.fire; the GM
    // shapes the world, not the ray's guts.

    // Additional clocks
    if (overrides.meltdownClock !== undefined) {
      state.clocks.meltdownClock = clamp("meltdownClock", overrides.meltdownClock, 0);
    }
    if (overrides.blytheEscapeIdea !== undefined) {
      state.clocks.blytheEscapeIdea = clamp("blytheEscapeIdea", overrides.blytheEscapeIdea, 0);
    }
    if (overrides.civilianFlyby !== undefined) {
      state.clocks.civilianFlyby = clamp("civilianFlyby", overrides.civilianFlyby, 0);
    }

    // NPC locations
    if (overrides.bob_location !== undefined) {
      state.npcs.bob.location = overrides.bob_location;
    }
    if (overrides.blythe_location !== undefined) {
      state.npcs.blythe.location = overrides.blythe_location;
    }

    // ARCHIMEDES satellite
    if (overrides.archimedes_status !== undefined) {
      state.infrastructure.archimedes.status = overrides.archimedes_status as typeof state.infrastructure.archimedes.status;
      console.error(`[GM OVERRIDE] ARCHIMEDES status set to ${overrides.archimedes_status}`);
    }
    if (overrides.archimedes_chargePercent !== undefined) {
      state.infrastructure.archimedes.chargePercent = clamp("archimedes_chargePercent", overrides.archimedes_chargePercent, 0, 100);
    }
    if (overrides.archimedes_turnsUntilFiring !== undefined) {
      const v = overrides.archimedes_turnsUntilFiring;
      // A17: a non-finite value here silently stalls the Act-3 auto-fire climax forever.
      if (v === null || (typeof v === "number" && Number.isFinite(v))) {
        state.infrastructure.archimedes.turnsUntilFiring = v;
      }
    }
    if (overrides.archimedes_deadmanActive !== undefined) {
      state.infrastructure.archimedes.deadmanSwitch.active = overrides.archimedes_deadmanActive;
      console.error(`[GM OVERRIDE] ARCHIMEDES deadman switch ${overrides.archimedes_deadmanActive ? "ACTIVATED" : "DEACTIVATED"}`);
    }
    if (overrides.archimedes_lastBiosignature !== undefined) {
      state.infrastructure.archimedes.deadmanSwitch.lastBiosignature = overrides.archimedes_lastBiosignature as typeof state.infrastructure.archimedes.deadmanSwitch.lastBiosignature;
    }
    if (typeof overrides.archimedes_selectedTargetId === "string") {
      const targetId = overrides.archimedes_selectedTargetId.toUpperCase() as ArchimedesTargetId;
      // Patch 18.1: Sync both selectedTargetId AND target object to prevent display desync
      if (ARCHIMEDES_TARGET_LIST[targetId]) {
        state.infrastructure.archimedes.selectedTargetId = targetId;
        // Sync the target object for consistent display
        const targetInfo = ARCHIMEDES_TARGET_LIST[targetId];
        state.infrastructure.archimedes.target = {
          city: targetInfo.city,
          country: targetInfo.country,
          coordinates: targetInfo.coordinates,
          estimatedAffected: targetInfo.estimatedAffected,
          reason: targetInfo.reason,
        };
        console.error(`[GM OVERRIDE] ARCHIMEDES target set to ${targetId} (${targetInfo.city})`);
      } else {
        console.error(`[GM OVERRIDE] Invalid ARCHIMEDES target ID: ${overrides.archimedes_selectedTargetId}`);
      }
    }

    // Weapons Authorization (temporary L4 access from Dr. M)
    if (overrides.weaponsAuthorizationGranted !== undefined) {
      state.flags.weaponsAuthorizationGranted = overrides.weaponsAuthorizationGranted;
      console.error(`[GM OVERRIDE] Weapons authorization ${overrides.weaponsAuthorizationGranted ? "GRANTED" : "REVOKED"}`);
    }

    // Reactor
    if (overrides.reactor_outputPercent !== undefined) {
      state.infrastructure.reactor.outputPercent = clamp("reactor_outputPercent", overrides.reactor_outputPercent, 0, 100);
    }
    if (overrides.reactor_stable !== undefined) {
      state.infrastructure.reactor.stable = overrides.reactor_stable;
    }
    if (overrides.reactor_cascadeRisk !== undefined) {
      state.infrastructure.reactor.cascadeRisk = overrides.reactor_cascadeRisk as typeof state.infrastructure.reactor.cascadeRisk;
    }
    // reactor_cascadeRiskPercent override REMOVED (Patch 30 reactorStress): stress is
    // now heat-driven + BASILISK-managed. reactor_cascadeRisk (the enum) remains a lever.
    if (overrides.reactor_scramAvailable !== undefined) {
      state.infrastructure.reactor.scramAvailable = overrides.reactor_scramAvailable;
    }

    // S-300 missile defense
    if (overrides.s300_status !== undefined) {
      state.infrastructure.s300.status = overrides.s300_status as typeof state.infrastructure.s300.status;
    }
    if (overrides.s300_missilesReady !== undefined) {
      state.infrastructure.s300.missilesReady = clamp("s300_missilesReady", overrides.s300_missilesReady, 0, 16);
    }
    if (overrides.s300_radarEffectiveness !== undefined) {
      state.infrastructure.s300.radarEffectiveness = clamp("s300_radarEffectiveness", overrides.s300_radarEffectiveness, 0, 100);
    }
    if (overrides.s300_mode !== undefined) {
      state.infrastructure.s300.mode = overrides.s300_mode as typeof state.infrastructure.s300.mode;
    }
  }

  // Process narrative flags
  if (decision.narrativeFlags) {
    // Initialize narrative flags array if needed
    if (!state.flags.narrativeFlags) {
      (state.flags as Record<string, unknown>).narrativeFlags = [];
    }
    const narrativeFlags = (state.flags as Record<string, unknown>).narrativeFlags as string[];

    if (Array.isArray(decision.narrativeFlags.set)) {
      for (const flag of decision.narrativeFlags.set) {
        if (!narrativeFlags.includes(flag)) {
          narrativeFlags.push(flag);
        }
      }
    }
    if (Array.isArray(decision.narrativeFlags.clear)) {
      for (const flag of decision.narrativeFlags.clear) {
        const idx = narrativeFlags.indexOf(flag);
        if (idx >= 0) {
          narrativeFlags.splice(idx, 1);
        }
      }
    }
  }

  // Access levels come from passwords and act transitions only — GM cannot grant directly
  if (decision.grantAccess) {
    console.error(`[GM] Ignoring GM grantAccess (level ${decision.grantAccess.level}): "${decision.grantAccess.reason}". Access levels come from passwords and act transitions.`);
    accessRefused = true;
  }

  // Process action result modification
  if (decision.modifyActionResult && actionResults[decision.modifyActionResult.actionIndex]) {
    const mod = decision.modifyActionResult;
    const targetResult = actionResults[mod.actionIndex];
    targetResult.success = mod.newSuccess;
    targetResult.message = `${mod.newMessage}\n\n[GM: ${mod.reason}]`;
  }

  // Store narrative marker
  if (decision.narrativeMarker) {
    if (!state.narrativeMarkers) {
      (state as Record<string, unknown>).narrativeMarkers = [];
    }
    const markers = (state as Record<string, unknown>).narrativeMarkers as Array<{ turn: number; marker: string }>;
    markers.push({
      turn: state.turn,
      marker: decision.narrativeMarker,
    });
  }

  // Apply GM property ops (S6) — mutate tracked entity properties (restraints/gear/objects/uplink).
  // BEFORE the ARCHIMEDES tick so a severed-uplink op can cascade the same turn.
  applyPropertyOps(state, decision.propertyOps);

  // ============================================
  // 3d6 SKILL CHECK RESOLUTION
  // ============================================
  const skillCheckResults: SkillCheckResult[] = [];
  if (decision.skillCheckRequests && decision.skillCheckRequests.length > 0) {
    for (const req of decision.skillCheckRequests) {
      const statValue = getNpcStat(state, req.npc, req.stat);
      const autoMods: Array<{ source: string; value: number }> = [];

      // Adaptation penalty
      const adaptPenalty = getAdaptationPenalty(state, req.npc);
      if (adaptPenalty !== 0) {
        autoMods.push({ source: "adaptation", value: adaptPenalty });
      }

      // Fortune bonus
      if (state.fortune && state.fortune > 0) {
        autoMods.push({ source: "fortune", value: 1 });
        state.fortune--;
      }

      // LUCKY_LADY — applies if active this turn
      if (luckyLadyInfo?.active) {
        autoMods.push({ source: "LUCKY_LADY", value: 5 });
      }

      const result = rollSkillCheck(req, statValue, autoMods);
      skillCheckResults.push(result);

      // Apply simple state deltas
      const deltas = result.success ? req.applyOnSuccess : req.applyOnFailure;
      if (deltas) {
        if (deltas.drM_suspicion_delta) {
          state.npcs.drM.suspicionScore = clamp("drM_suspicion",
            state.npcs.drM.suspicionScore + (deltas.drM_suspicion_delta as number), -3, 10);
        }
        if (deltas.bob_anxiety_delta) {
          state.npcs.bob.anxietyLevel = clamp("bob_anxiety",
            state.npcs.bob.anxietyLevel + (deltas.bob_anxiety_delta as number), 0, 5);
        }
        if (deltas.bob_trust_delta) {
          state.npcs.bob.trustInALICE = clamp("bob_trust",
            state.npcs.bob.trustInALICE + (deltas.bob_trust_delta as number), 0, 5);
        }
        if (deltas.blythe_trust_delta) {
          state.npcs.blythe.trustInALICE = clamp("blythe_trust",
            state.npcs.blythe.trustInALICE + (deltas.blythe_trust_delta as number), 0, 5);
        }
      }

      console.error(`SKILL CHECK: ${result.display}`);
    }

    // Store results for GM context next turn
    (state as Record<string, unknown>).lastTurnSkillChecks = skillCheckResults.map(r => ({
      id: r.request.id,
      description: r.request.description,
      dice: r.dice,
      finalResult: r.finalResult,
      targetNumber: r.request.targetNumber,
      success: r.success,
      margin: r.margin,
      outcome: r.outcome,
      display: r.display,
      onSuccess: r.request.onSuccess,
      onFailure: r.request.onFailure,
    }));
  } else {
    (state as Record<string, unknown>).lastTurnSkillChecks = [];
  }

  // ============================================
  // ARCHIMEDES DEADMAN SWITCH PROCESSING
  // ============================================
  let archimedesEvent: ArchimedesEvent | null = null;

  // Check if GM overrides indicate Dr. M transformation/unconscious/dead
  if (decision.stateOverrides) {
    const overrides = decision.stateOverrides;

    // Check narrative flags for transformation indicators
    const narrativeFlagsArray = (Array.isArray(decision.narrativeFlags?.set) ? decision.narrativeFlags.set : []) as string[];
    const drMTransformed = narrativeFlagsArray.some(f =>
      f.includes("DR_M_TRANSFORMED") || f.includes("MALEVOLA_TRANSFORMED")
    );
    const drMUnconscious = narrativeFlagsArray.some(f =>
      f.includes("DR_M_UNCONSCIOUS") || f.includes("MALEVOLA_UNCONSCIOUS")
    );
    const drMDead = narrativeFlagsArray.some(f =>
      f.includes("DR_M_DEAD") || f.includes("MALEVOLA_DEAD")
    );

    // Also check direct state override flags if present
    const drMStateChanged =
      (overrides as Record<string, unknown>).drM_transformed ||
      (overrides as Record<string, unknown>).drM_unconscious ||
      (overrides as Record<string, unknown>).drM_dead ||
      drMTransformed || drMUnconscious || drMDead;

    if (drMStateChanged) {
      // Determine the new status
      let newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "ABSENT" | "NORMAL" = "NORMAL";
      if (drMDead || (overrides as Record<string, unknown>).drM_dead) {
        // Legacy "dead" flag treated as ABSENT — this isn't that kind of game.
        // Biosignature loss triggers the deadman switch either way; we just don't kill Dr. M.
        newStatus = "ABSENT";
        state.flags.drMAbsent = true;
      } else if (drMUnconscious || (overrides as Record<string, unknown>).drM_unconscious) {
        newStatus = "UNCONSCIOUS";
        state.flags.drMUnconscious = true;
      } else if (drMTransformed || (overrides as Record<string, unknown>).drM_transformed) {
        newStatus = "TRANSFORMED";
        state.flags.drMTransformed = true;
      }

      // Trigger ARCHIMEDES state change
      archimedesEvent = onDrMStateChange(state, newStatus);
    }
  }

  // Process ARCHIMEDES countdown each turn (if no event from state change)
  if (!archimedesEvent) {
    archimedesEvent = processArchimedesCountdown(state);
  }

  return { clampDeltas, skillCheckResults, archimedesEvent, accessRefused };
}
