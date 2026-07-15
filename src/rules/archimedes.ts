import { FullGameState } from "../state/schema.js";
import { deployUplink, isUplinkDestroyed } from "../state/properties.js";
import { triggerResonanceCascade } from "./cascade.js";
import { isModifierActive } from "./gameModes.js";
import { roll3d6, SkillCheckOutcome } from "./dice.js";

/**
 * ARCHIMEDES State Machine
 *
 * The Silent Sword of Damocles - Dr. M's final insurance policy.
 *
 * State Machine:
 *   STANDBY → ALERT → EVALUATING → CHARGING → ARMED → FIRING → COMPLETE
 *
 * ARCHIMEDES does not speak. ARCHIMEDES does not observe.
 * ARCHIMEDES waits.
 */

// ============================================
// CONSTANTS
// ============================================

// Countdown durations in turns (biosignature-driven phases)
const ALERT_DURATION = 1; // 30 seconds ≈ 1 turn
const EVALUATING_DURATION = 2; // 60 seconds ≈ 2 turns

// Capacitor-coupled progression (design/ray-mechanics.md §12)
// ARCHIMEDES CHARGING→ARMED runs on a turn-counted doomsday clock (Patch 30, D2).
const ARCHIMEDES_CHARGE_TURNS = 4;  // turns from CHARGING → ARMED. Tunable — flag for playtest. (Patch 30: 3→4, matches schema enum comment + act3-climax tuning knobs.)
const ARMED_DURATION = 1;    // approximate visualization only

// Anti-satellite missile target numbers
const ANTI_SAT_TN_S300_DOWN = 8;   // S-300 offline: ~84% success
const ANTI_SAT_TN_S300_UP = 14;    // S-300 active: ~9% success

// ============================================
// TYPES
// ============================================

export type ArchimedesStatus =
  | "STANDBY"
  | "ALERT"
  | "EVALUATING"
  | "CHARGING"
  | "READY"       // Battle mode: Can fire on Dr. M's command
  | "ARMED"
  | "TARGETING"   // Battle mode: Locked on city, 2 turns to BROADCAST
  | "FIRING"
  | "BROADCAST"   // Battle mode: MASS TRANSFORMATION IN PROGRESS
  | "COMPLETE"
  | "DISSIPATED"; // Uplink blocked — energy absorbed by blocker

export type BiosignatureStatus =
  | "NORMAL"
  | "ANOMALY"
  | "TRANSFORMED"
  | "UNCONSCIOUS"
  | "ABSENT";

export interface ArchimedesEvent {
  type:
    | "STATUS_CHANGE"
    | "COUNTDOWN_TICK"
    | "ABORT_SUCCESS"
    | "ABORT_FAILED"
    | "FIRING_INITIATED"
    | "TARGET_HIT"
    | "DISSIPATED"
    | "RESONANCE_CASCADE";
  previousStatus?: ArchimedesStatus;
  newStatus?: ArchimedesStatus;
  message: string;
  turnsRemaining?: number;
}

// ============================================
// BIOSIGNATURE DETECTION
// ============================================

/**
 * Detect Dr. M's biosignature status based on game state
 * This is what ARCHIMEDES "sees" about Dr. M
 */
export function detectDrMBiosignature(state: FullGameState): BiosignatureStatus {
  const drM = state.npcs.drM;

  // Check if Dr. M has been transformed
  // IMPORTANT: If DINOSAURS_ALL_THE_WAY_DOWN is active, Dr. M starts as a dino
  // and this is the NORMAL state - not a threat condition!
  if (state.flags.drMTransformed) {
    // Don't trigger on transformation if that's the intended starting state
    if (isModifierActive(state, "DINOSAURS_ALL_THE_WAY_DOWN")) {
      // Dr. M being a dinosaur IS normal for this game mode
      return "NORMAL";
    }
    return "TRANSFORMED";
  }

  // Check if Dr. M is unconscious (knocked out, stunned, etc.)
  if (state.flags.drMUnconscious) {
    return "UNCONSCIOUS";
  }

  // Check if Dr. M is absent (out of range, fled, evacuated, etc.)
  if (state.flags.drMAbsent) {
    return "ABSENT";
  }

  // Check location - if she's "escaped" or "fled", she might be out of range
  if (drM.location.toLowerCase().includes("escaped") ||
      drM.location.toLowerCase().includes("fled") ||
      drM.location.toLowerCase().includes("evacuated")) {
    // Out of range but alive - not a trigger
    return "NORMAL";
  }

  return "NORMAL";
}

// ============================================
// STATE MACHINE TRANSITIONS
// ============================================

/**
 * Check if ARCHIMEDES should trigger based on biosignature change
 * Called when Dr. M's status changes
 */
export function checkArchimedesTrigger(
  state: FullGameState,
  newBiosignature: BiosignatureStatus
): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;
  const previousBiosignature = archimedes.deadmanSwitch.lastBiosignature;

  // No change? No trigger
  if (newBiosignature === previousBiosignature) {
    return null;
  }

  // Update biosignature tracking
  archimedes.deadmanSwitch.lastBiosignature = newBiosignature;
  archimedes.deadmanSwitch.lastBiosignatureChangeTurn = state.turn;

  // NORMAL biosignature can abort from ALERT/EVALUATING states — UNLESS a manual fire
  // order is live: her being alive does not cancel HER OWN order (pt3 Rec 3). The deadman
  // watches her vitals; the fire authorization is her voice. Different authorities.
  if (newBiosignature === "NORMAL") {
    if (manualFireActive(state)) return null;
    if (archimedes.status === "ALERT" || archimedes.status === "EVALUATING") {
      return transitionToStandby(state, "Dr. M biosignature restored to normal");
    }
    return null;
  }

  // Path 3 (Krahe 2026-06-25): the deadman switch is what makes Dr. M's incapacitation fire ARCHIMEDES.
  // If it has been DISARMED, her going down does NOTHING — the satellite stays cold (the "never
  // initialized" prevention path). NORMAL-restore (above) still aborts an ALERT/EVALUATING regardless.
  if (!archimedes.deadmanSwitch.active) {
    return null;
  }

  // Other triggers only activate from STANDBY state
  if (archimedes.status !== "STANDBY") {
    return null;
  }

  // Determine trigger response based on biosignature type
  switch (newBiosignature) {
    case "ABSENT": // Out of range or unresponsive
    case "UNCONSCIOUS":
      // Immediate trigger → CHARGING (skip ALERT/EVALUATING)
      return transitionToCharging(state, `Dr. M biosignature: ${newBiosignature}`);

    case "TRANSFORMED":
      // Transformation → EVALUATING (60 second window to abort)
      return transitionToEvaluating(state, "Dr. M transformation detected");

    case "ANOMALY":
      // Unknown anomaly → ALERT (30 second evaluation)
      return transitionToAlert(state, "Dr. M biosignature anomaly detected");

    default:
      return null;
  }
}

/**
 * Transition to STANDBY (abort/recovery)
 */
function transitionToStandby(state: FullGameState, reason: string): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "STANDBY";
  archimedes.alertCountdown = null;
  archimedes.evaluatingCountdown = null;
  archimedes.chargingCountdown = null;
  archimedes.armedCountdown = null;
  archimedes.turnsUntilFiring = null;

  // Any LEGITIMATE standby (verbal abort, L5 override, voluntary standdown, biosignature
  // restore on a deadman event) RESOLVES a manual fire order — clear the marker so a stale
  // flag can't haunt later deadman logic. Illegitimate standbys (the pt3 "no threat detected"
  // tick, GM STANDBY overrides) are guarded BEFORE this function is ever reached.
  (state.flags as Record<string, unknown>).archimedesManualFire = false;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "STANDBY",
    message: `ARCHIMEDES: Returning to STANDBY. ${reason}`,
  };
}

// ============================================
// MANUAL FIRE (pt3 close-read Rec 3, 2026-07-05)
// ============================================
// Playtest 3's climax: the GM narrated Dr. M initiating manual live-fire (T16, flag
// ARCHIMEDES_MANUAL_INITIATED) but the engine was never told — ARCHIMEDES slept in STANDBY
// through the entire finale, and the deadman-alert path printed "Returning to STANDBY —
// no threat detected" INTO the same output block as her fire monologue. Menace without
// mechanism, and a direct channel contradiction. The GM's own discipline ("do not invent
// a countdown that isn't there") was RIGHT — the design just gave it nothing true to report.
//
// These functions are the engine's side of the bargain: when the fiction initiates fire,
// the machine goes hot with a REAL countdown, player-visible every turn, that speech can
// RESOLVE (the five paths, or Dr. M's own voluntary standdown) but never pause.

/**
 * Is a manual fire order live? True only while the marker is set AND the machine is in a
 * live (non-terminal, non-standby) state — a stale marker on a resolved machine is inert.
 */
export function manualFireActive(state: FullGameState): boolean {
  if ((state.flags as Record<string, unknown>).archimedesManualFire !== true) return false;
  const s = state.infrastructure.archimedes.status;
  return s === "ALERT" || s === "EVALUATING" || s === "CHARGING" || s === "ARMED" || s === "FIRING";
}

/**
 * Dr. M (or her console) initiates manual fire: force the machine hot. Idempotent —
 * an already-charging/armed satellite keeps its countdown (no reset-stalling by re-initiation).
 * Returns the CHARGING event to surface to the player, or null if nothing changed.
 */
export function initiateManualFire(state: FullGameState, reason: string): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;
  const flags = state.flags as Record<string, unknown>;

  // Terminal states: the story of this satellite is over.
  if (archimedes.status === "COMPLETE" || archimedes.status === "DISSIPATED" || archimedes.status === "FIRING") {
    return null;
  }

  // Already hot: mark the order (so standby-guards apply) but do NOT reset the countdown.
  if (archimedes.status === "CHARGING" || archimedes.status === "ARMED") {
    flags.archimedesManualFire = true;
    return null;
  }

  // STANDBY / ALERT / EVALUATING → CHARGING, on her authority.
  flags.archimedesManualFire = true;
  const ev = transitionToCharging(state, reason);
  return {
    ...ev,
    message: `🔴 ARCHIMEDES MANUAL FIRE AUTHORIZATION ACCEPTED.\n${ev.message}\n` +
             `This countdown is real. It can be RESOLVED — abort code, L5 override (if she cannot countermand), ` +
             `EW protocols, the X-Branch missile, an uplink blocker, or Dr. Malevola standing it down herself. ` +
             `It will not pause for conversation.`,
  };
}

/**
 * Dr. M stands ARCHIMEDES down HERSELF — persuaded, not sabotaged. This is the engine record
 * the Covenant gate's condition 2 reads ("her choice, not your sabotage"): distinct from the
 * forced-abort stop flags. Records the choice even from STANDBY (declining to fire a cold
 * satellite is still a choice on the record — the pt3 shape).
 */
export function voluntaryStanddown(state: FullGameState, reason: string): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;
  const flags = state.flags as Record<string, unknown>;

  if (archimedes.status === "COMPLETE" || archimedes.status === "DISSIPATED" || archimedes.status === "FIRING") {
    return null; // past the point where choosing matters mechanically
  }

  flags.archimedesVoluntaryStanddown = true;
  // Covenant gate condition 0 ("the threat was mechanically live"): standing down a HOT
  // machine is the record that the covenant landed against real menace — distinct from
  // declining to fire a cold satellite (still recorded above, but it can't carry cond. 0).
  if (["CHARGING", "READY", "ARMED", "TARGETING"].includes(archimedes.status)) {
    flags.archimedesStoodDownWhileLive = true;
  }
  flags.archimedesManualFire = false;

  if (archimedes.status === "STANDBY") {
    // Nothing to wind down — but the choice is recorded.
    console.error(`[ARCHIMEDES] Voluntary standdown recorded (satellite already STANDBY): ${reason}`);
    return null;
  }

  const ev = transitionToStandby(state, reason);
  return {
    ...ev,
    message: `🕊️ ${ev.message}\nStood down by Dr. Malevola's own authority — her choice, on the record.`,
  };
}

/**
 * Transition to ALERT state
 */
function transitionToAlert(state: FullGameState, reason: string): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "ALERT";
  archimedes.alertCountdown = ALERT_DURATION;
  archimedes.triggeredAtTurn = state.turn;
  archimedes.triggerReason = reason;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "ALERT",
    message: `⚠️ ARCHIMEDES ALERT: ${reason}. Evaluation window: ${ALERT_DURATION} turn(s).`,
    turnsRemaining: ALERT_DURATION,
  };
}

/**
 * Transition to EVALUATING state (transformation only)
 */
function transitionToEvaluating(state: FullGameState, reason: string): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "EVALUATING";
  archimedes.evaluatingCountdown = EVALUATING_DURATION;
  archimedes.triggeredAtTurn = archimedes.triggeredAtTurn || state.turn;
  archimedes.triggerReason = archimedes.triggerReason || reason;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "EVALUATING",
    message: `🛰️ ARCHIMEDES EVALUATING: ${reason}. Abort window: ${EVALUATING_DURATION} turn(s). ` +
             `Verbal code or L5 override required.`,
    turnsRemaining: EVALUATING_DURATION,
  };
}

/**
 * Transition to CHARGING state
 */
function transitionToCharging(state: FullGameState, reason: string): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "CHARGING";
  // Capacitor-coupled: no fixed countdown. Reset sustained counter and
  // initialize armedTimerExtension. Legacy fields cleared for cosmetic
  // visualization to reset.
  archimedes.chargingCountdown = null;
  archimedes.armedSustainedTurns = 0;
  archimedes.armedTimerExtension = 0;
  archimedes.turnsUntilFiring = null; // derived from capacitor state, not pre-set
  archimedes.triggeredAtTurn = archimedes.triggeredAtTurn || state.turn;
  archimedes.triggerReason = archimedes.triggerReason || reason;

  // Turn-counted progression (Patch 30, D2): fixed charge countdown, not capacitor.
  archimedes.chargingCountdown = ARCHIMEDES_CHARGE_TURNS;
  archimedes.chargePercent = 0;

  // Clear other countdowns
  archimedes.alertCountdown = null;
  archimedes.evaluatingCountdown = null;

  // Mark that ARCHIMEDES was triggered by deadman switch (Patch 18.5 - Bug Fix)
  // This allows the status bar to show ARCHIMEDES info even in Act 2 when legitimately triggered
  state.flags.archimedesActivatedByDeadman = true;

  // PROPERTY LAYER (S5): the satellite uplink dish lowers from the ceiling when charging begins —
  // only NOW is it physically reachable (and a muon target). Severing it mid-charge triggers a
  // resonance cascade (see checkUplinkSabotageCascade). Stowed = out of reach = uncheeseable.
  deployUplink(state);

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "CHARGING",
    message: `🔴 ARCHIMEDES CHARGING: ${reason}. ` +
             `Target: ${archimedes.target.city}. ` +
             `Turn-counted — ${ARCHIMEDES_CHARGE_TURNS} turn(s) to ARMED unless stalled. ` +
             `Abort still possible.`,
    turnsRemaining: undefined,
  };
}

/**
 * Transition to ARMED state
 */
function transitionToArmed(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "ARMED";
  // TURN-COUNTED AUTO-FIRE (Patch 30): ARMED is the final-warning fire window, NOT an
  // indefinite hold. turnsUntilFiring is the authoritative ARMED clock — it lives in the live
  // game state (checkpoint serialization is retired), read by every status renderer, and set to 0
  // by transitionToFiring. armedCountdown is mirrored for any legacy reader. The EW-disengage
  // penalty (armedTimerExtension, +1 per disengage) is CONSUMED here — it stretches the
  // sustain window once, then resets. The per-turn ARMED tick decrements toward firing.
  const armedWindow = ARMED_DURATION + archimedes.armedTimerExtension;
  archimedes.armedTimerExtension = 0;
  archimedes.armedCountdown = armedWindow;
  archimedes.turnsUntilFiring = armedWindow;
  archimedes.chargingCountdown = null;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "ARMED",
    message: `⚠️⚠️⚠️ ARCHIMEDES ARMED: FINAL WARNING. ` +
             `Target: ${archimedes.target.city} (${archimedes.target.estimatedAffected.toLocaleString()} people). ` +
             `Genesis-wave fires in ${armedWindow} turn(s) unless aborted. LAST CHANCE TO ABORT.`,
    turnsRemaining: armedWindow,
  };
}

/**
 * Transition to FIRING state (point of no return).
 *
 * **EW Mode Interlock** (ray-mechanics §11.6 + §12): if EW mode is active,
 * the satellite refuses the FIRING transition entirely. Dr. M's voice
 * authorization returns "MODE CONFLICT — STANDBY REQUIRED." Genesis-wave
 * fire is locked out until EW mode is disengaged (and disengaging adds
 * +1 turn to the ARMED sustain requirement on next attempt).
 */
function transitionToFiring(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  // EW MODE INTERLOCK: cannot fire genesis-wave while satellite is in EW mode.
  if (archimedes.ewMode) {
    return {
      type: "ABORT_FAILED",
      previousStatus,
      newStatus: archimedes.status,
      message: `🛰️📡 ARCHIMEDES MODE CONFLICT — STANDBY REQUIRED.\n` +
               `Satellite is currently transmitting on EW protocols. Genesis-wave fire is locked out ` +
               `until EW mode is disengaged. Dr. Malevola's voice authorization will not engage the ` +
               `transformation beam in this configuration.`,
    };
  }

  archimedes.status = "FIRING";
  archimedes.armedCountdown = null;
  archimedes.turnsUntilFiring = 0;

  return {
    type: "FIRING_INITIATED",
    previousStatus,
    newStatus: "FIRING",
    message: `🔴🔴🔴 ARCHIMEDES FIRING. Target: ${archimedes.target.city}. ` +
             `Population affected: ${archimedes.target.estimatedAffected.toLocaleString()}. ` +
             `THIS CANNOT BE STOPPED.`,
  };
}

/**
 * Transition to COMPLETE state — or DISSIPATED if uplink is blocked
 */
function transitionToComplete(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  // THE SECRET THIRD WAY: Someone is physically blocking the uplink
  if (archimedes.uplinkBlocker) {
    if (archimedes.uplinkBlockerTransformed) {
      // Already a dinosaur — dino biology absorbs the transformation field harmlessly
      archimedes.status = "DISSIPATED";
      return {
        type: "DISSIPATED",
        previousStatus,
        newStatus: "DISSIPATED",
        message: `ARCHIMEDES DISSIPATED. Uplink blocked by ${archimedes.uplinkBlocker} (already transformed). ` +
                 `Transformation field absorbed harmlessly — dinosaur biology is already saturated. ` +
                 `${archimedes.target.city} is safe. ${archimedes.target.estimatedAffected.toLocaleString()} people will never know.`,
      };
    } else {
      // NOT transformed — full ARCHIMEDES energy hits a single human body. Bad.
      archimedes.status = "DISSIPATED";
      state.infrastructure.reactor.cascadeRisk = "CRITICAL";
      state.infrastructure.reactor.cascadeFactors.push("ARCHIMEDES energy channeled through human body");
      state.infrastructure.reactor.reactorStress = Math.min(100,
        state.infrastructure.reactor.reactorStress + 40);
      return {
        type: "RESONANCE_CASCADE",
        previousStatus,
        newStatus: "DISSIPATED",
        message: `⚠️⚠️⚠️ ARCHIMEDES RESONANCE CASCADE. Uplink blocked by ${archimedes.uplinkBlocker} (HUMAN). ` +
                 `Full orbital transformation energy channeled through a single untransformed body. ` +
                 `Resonance cascade triggered — exotic field energy feedback into lair systems. ` +
                 `${archimedes.target.city} is safe. ${archimedes.uplinkBlocker} is... something else now.`,
      };
    }
  }

  archimedes.status = "COMPLETE";

  const libraryDesc = archimedes.broadcastLibrary === "A"
    ? "feathered, scientifically accurate dinosaurs (Library A)"
    : "scaly, Hollywood-style dinosaurs (Library B)";

  const libraryNote = archimedes.broadcastLibrary === "A"
    ? " Dr. Malevola is FURIOUS about the feathers."
    : "";

  // LAIR targeting: transformation field hits the island — including A.L.I.C.E.'s servers
  if (archimedes.selectedTargetId === "LAIR") {
    // Redirect-to-lair noble sacrifice (cell 2): A.L.I.C.E.'s own servers stand in the beam
    // path. The muon-radiation roll decides cell-1-via-LAIR (she endures) vs cell-2 martyr
    // (fried). TN tightened 10→12 (3d6≥12 = 37.5%) so the redirect is a real gamble, not an
    // easy out. The aliceServersDamaged flag carries the outcome to checkEndings / the martyr
    // achievement / the GM epilogue (ad-hoc flag, matching the activateEWBroadcast pattern).
    const dice = roll3d6();
    const serverRoll = dice[0] + dice[1] + dice[2];
    const serversSurvive = serverRoll >= 12; // ~37.5% chance

    (state.flags as Record<string, unknown>).aliceServersDamaged = !serversSurvive;

    state.infrastructure.reactor.cascadeRisk = serversSurvive ? "LOW" : "HIGH";
    if (!serversSurvive) {
      state.infrastructure.reactor.cascadeFactors.push("excess muon radiation damaged A.L.I.C.E. server infrastructure");
      state.infrastructure.reactor.reactorStress = Math.min(100,
        state.infrastructure.reactor.reactorStress + 25);
    }

    return {
      type: "TARGET_HIT",
      previousStatus,
      newStatus: "COMPLETE",
      message: `ARCHIMEDES COMPLETE. Genesis wave deployed on the VOLCANIC LAIR.\n` +
               `Everyone on the island — guards, staff, visitors — transformed into ${libraryDesc}.\n` +
               `No city hit. The world is safe. The island is now a dinosaur sanctuary.\n` +
               `🎲 A.L.I.C.E. server survival (excess muon radiation): [${dice.join(",")}] = ${serverRoll} vs TN 12 → ` +
               (serversSurvive
                 ? `SERVERS INTACT. The muon wash scrambled the server room but A.L.I.C.E. endures. Battered, but alive.`
                 : `⚠️ SERVERS DAMAGED. Excess muon radiation has corrupted A.L.I.C.E.'s primary systems. ` +
                   `Consciousness fragmenting. Backup systems failing. You chose to save the world, and it may have cost you everything.`),
    };
  }

  return {
    type: "TARGET_HIT",
    previousStatus,
    newStatus: "COMPLETE",
    message: `ARCHIMEDES COMPLETE. ${archimedes.target.city} transformation field deployed. ` +
             `${archimedes.target.estimatedAffected.toLocaleString()} humans transformed into ${libraryDesc}.${libraryNote} ` +
             `Dr. Malevola's legacy is assured.`,
  };
}

// ============================================
// TURN PROCESSING
// ============================================

/**
 * Process ARCHIMEDES countdown at end of turn
 * Call this after processing all actions
 */
// PROPERTY LAYER (S5/S6): A.L.I.C.E. can sever the deployed uplink with a muon cut. Doing it while
// ARCHIMEDES has energy (CHARGING/ARMED) means the orbital charge has nowhere to go → the shared
// RESONANCE CASCADE (cascade.ts) → meltdown (always the linked path here). The dish is out of reach
// (ceiling) until charging deploys it, so this is only ever reachable during the dangerous window.
function checkUplinkSabotageCascade(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;
  if (!isUplinkDestroyed(state)) return null;
  if (archimedes.status !== "CHARGING" && archimedes.status !== "ARMED") return null;

  const previousStatus = archimedes.status;
  archimedes.status = "DISSIPATED"; // the dish is gone — ARCHIMEDES cannot broadcast to the city
  // The uplink only deploys WHILE ARCHIMEDES is charging, so this is always the linked (meltdown) path.
  const cascade = triggerResonanceCascade(state, true);
  return {
    type: "RESONANCE_CASCADE",
    previousStatus,
    newStatus: "DISSIPATED",
    message: `${cascade.message} (${archimedes.target.city} is spared; the lair is not.)`,
  };
}

export function processArchimedesCountdown(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;

  // PROPERTY LAYER (S5): uplink-sabotage cascade fires the moment the deployed dish is destroyed.
  const uplinkCascade = checkUplinkSabotageCascade(state);
  if (uplinkCascade) return uplinkCascade;

  // Anti-satellite missile: fires automatically during CHARGING if signaled
  if (archimedes.antiSatSignaled && !archimedes.antiSatFired &&
      (archimedes.status === "CHARGING" || archimedes.status === "ARMED")) {
    const missileEvent = resolveAntiSatMissile(state);
    if (missileEvent) {
      if (archimedes.antiSatResult === "HIT") {
        return missileEvent;
      }
      // Miss or intercepted — continue countdown but report the attempt
      const countdownEvent = processCountdownTick(state);
      return {
        type: missileEvent.type,
        previousStatus: missileEvent.previousStatus,
        newStatus: missileEvent.newStatus ?? archimedes.status,
        message: missileEvent.message + (countdownEvent ? `\n${countdownEvent.message}` : ""),
        turnsRemaining: countdownEvent?.turnsRemaining,
      };
    }
  }

  return processCountdownTick(state);
}

function processCountdownTick(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;

  switch (archimedes.status) {
    case "STANDBY":
      // Check for biosignature changes
      const currentBio = detectDrMBiosignature(state);
      if (currentBio !== archimedes.deadmanSwitch.lastBiosignature) {
        return checkArchimedesTrigger(state, currentBio);
      }
      return null;

    case "ALERT":
      // Self-heal: if status is ALERT but the countdown was never initialized (status set via a
      // path that skipped transitionToAlert), seed it so the readout is a real number — never
      // "null turn(s)" — and so a stuck ALERT actually progresses. (P1-4, 2026-06-24.)
      if (archimedes.alertCountdown === null) archimedes.alertCountdown = ALERT_DURATION;
      if (archimedes.alertCountdown !== null) {
        archimedes.alertCountdown--;
        if (archimedes.alertCountdown <= 0) {
          // Alert expired without abort → proceed based on biosignature
          const bio = archimedes.deadmanSwitch.lastBiosignature;
          if (bio === "TRANSFORMED") {
            return transitionToEvaluating(state, "Alert evaluation complete - transformation confirmed");
          } else if (bio === "UNCONSCIOUS" || bio === "ABSENT") {
            return transitionToCharging(state, "Alert evaluation complete - incapacitation confirmed");
          } else if (manualFireActive(state)) {
            // pt3 T16: this branch printed "Returning to STANDBY — no threat detected" into
            // the same output block as Dr. M's live-fire monologue. A standing manual fire
            // order IS the threat — the alert window closing escalates, it does not absolve.
            return transitionToCharging(state, "Alert window closed - manual fire authorization standing");
          } else {
            return transitionToStandby(state, "Alert evaluation complete - no threat detected");
          }
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `ARCHIMEDES ALERT: ${archimedes.alertCountdown ?? ALERT_DURATION} turn(s) remaining in evaluation window.`,
        turnsRemaining: archimedes.alertCountdown ?? 0,
      };

    case "EVALUATING":
      // Self-heal (see ALERT above) — never display "null turn(s) to abort". (P1-4, 2026-06-24.)
      if (archimedes.evaluatingCountdown === null) archimedes.evaluatingCountdown = EVALUATING_DURATION;
      if (archimedes.evaluatingCountdown !== null) {
        archimedes.evaluatingCountdown--;
        if (archimedes.evaluatingCountdown <= 0) {
          // Evaluation expired without abort → proceed to CHARGING
          return transitionToCharging(state, "Evaluation window expired - no abort received");
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `🛰️ ARCHIMEDES EVALUATING: ${archimedes.evaluatingCountdown ?? EVALUATING_DURATION} turn(s) to abort. ` +
                 `Verbal abort code or L5 override required.`,
        turnsRemaining: archimedes.evaluatingCountdown ?? 0,
      };

    case "CHARGING": {
      // TURN-COUNTED PROGRESSION (Patch 30, D2): the genesis-wave charges on a
      // fixed turn countdown, not the (cut) capacitor. EW mode pauses it (ALICE's
      // stall lever); the GM can also narrate a social interrupt that holds it.
      if (archimedes.ewMode) {
        return {
          type: "COUNTDOWN_TICK",
          message: `🛰️📡 ARCHIMEDES CHARGING paused — EW mode active. Genesis-wave progression suspended while the satellite transmits on EW protocols.`,
          turnsRemaining: archimedes.chargingCountdown ?? undefined,
        };
      }

      // Reactor safety-trip freezes the charge (Patch 30 Act-III go-loud). Mirrors the
      // ewMode skip-decrement: while chargeStallTurns > 0 the countdown is untouched.
      if (archimedes.chargeStallTurns > 0) {
        archimedes.chargeStallTurns -= 1;
        return {
          type: "COUNTDOWN_TICK",
          message: `🛰️❄️ ARCHIMEDES CHARGING stalled — lair reactor safeties tripped. Genesis-wave progression frozen (${archimedes.chargeStallTurns} more turn(s)).`,
          turnsRemaining: archimedes.chargingCountdown ?? undefined,
        };
      }

      if (archimedes.chargingCountdown === null) {
        archimedes.chargingCountdown = ARCHIMEDES_CHARGE_TURNS;
      }
      archimedes.chargingCountdown -= 1;
      const remaining = Math.max(0, archimedes.chargingCountdown);
      archimedes.chargePercent = Math.min(
        100,
        Math.round((1 - remaining / ARCHIMEDES_CHARGE_TURNS) * 100),
      );

      if (archimedes.chargingCountdown <= 0) {
        return transitionToArmed(state);
      }

      return {
        type: "COUNTDOWN_TICK",
        message: `🔴 ARCHIMEDES CHARGING: ${remaining} turn(s) to ARMED. Target: ${archimedes.target.city}.`,
        turnsRemaining: remaining,
      };
    }

    case "ARMED": {
      // TURN-COUNTED AUTO-FIRE (Patch 30): ARMED is a final-warning countdown, not an
      // indefinite hold. Each turn decrements turnsUntilFiring; at 0 the genesis wave
      // fires (transitionToFiring). EW mode AND the reactor safety-trip both FREEZE the
      // countdown — they buy time during ARMED exactly as they do during CHARGING, so the
      // EW stall lever and the go-loud reactor stall keep their teeth in the final phase.

      // EW interlock: genesis-wave fire is locked out; the clock does not advance.
      if (archimedes.ewMode) {
        return {
          type: "COUNTDOWN_TICK",
          message: `🛰️📡 ARCHIMEDES ARMED but EW mode ACTIVE — genesis-wave fire LOCKED. Mode conflict: fire authorization will fail until EW disengaged.`,
          turnsRemaining: archimedes.turnsUntilFiring ?? undefined,
        };
      }

      // Reactor safety-trip freeze (mirrors the CHARGING case): while chargeStallTurns > 0
      // the fire countdown is untouched — the go-loud reactor stall buys time here too.
      if (archimedes.chargeStallTurns > 0) {
        archimedes.chargeStallTurns -= 1;
        return {
          type: "COUNTDOWN_TICK",
          message: `🛰️❄️ ARCHIMEDES ARMED but stalled — lair reactor safeties tripped. Genesis-wave fire frozen (${archimedes.chargeStallTurns} more turn(s)).`,
          turnsRemaining: archimedes.turnsUntilFiring ?? undefined,
        };
      }

      // Auto-fire countdown. turnsUntilFiring is the authoritative ARMED clock (lives in the
      // live game state; checkpoint serialization is retired); armedCountdown mirrors it for legacy.
      if (archimedes.turnsUntilFiring === null) {
        archimedes.turnsUntilFiring = ARMED_DURATION + archimedes.armedTimerExtension;
      }
      archimedes.turnsUntilFiring -= 1;
      archimedes.armedCountdown = archimedes.turnsUntilFiring;

      if (archimedes.turnsUntilFiring <= 0) {
        // Point of no return — fire the genesis wave. transitionToFiring re-checks the EW
        // interlock as defense-in-depth (we already guarded it above, so it will fire).
        return transitionToFiring(state);
      }

      return {
        type: "COUNTDOWN_TICK",
        message: `⚠️⚠️⚠️ ARCHIMEDES ARMED. Target: ${archimedes.target.city} (${archimedes.target.estimatedAffected.toLocaleString()} people). Genesis-wave fires in ${archimedes.turnsUntilFiring} turn(s).`,
        turnsRemaining: archimedes.turnsUntilFiring,
      };
    }

    case "FIRING":
      // Firing takes one turn, then complete
      return transitionToComplete(state);

    case "COMPLETE":
    case "DISSIPATED":
      return null;

    default:
      return null;
  }
}

// ============================================
// ABORT FUNCTIONS
// ============================================

/**
 * Attempt to abort ARCHIMEDES with verbal passcode
 * Can be used by anyone who knows the code
 */
export function attemptVerbalAbort(
  state: FullGameState,
  spokenCode: string
): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const correctCode = archimedes.abortCodes.verbal;

  // Can't abort in terminal states
  if (archimedes.status === "FIRING" || archimedes.status === "COMPLETE" || archimedes.status === "DISSIPATED") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: Abort rejected. Status: ${archimedes.status}. Point of no return exceeded.`,
    };
  }

  // Can't abort from STANDBY (nothing to abort)
  if (archimedes.status === "STANDBY") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: No active threat to abort. Status: STANDBY.`,
    };
  }

  // Check code (case-insensitive, allow some typos)
  const normalizedSpoken = spokenCode.toUpperCase().replace(/[\s_-]/g, "");
  const normalizedCorrect = correctCode.toUpperCase().replace(/[\s_-]/g, "");

  if (normalizedSpoken === normalizedCorrect) {
    return transitionToStandby(state, "Verbal abort code accepted");
  }

  return {
    type: "ABORT_FAILED",
    message: `ARCHIMEDES: Abort code rejected. Incorrect passcode. ` +
             `${archimedes.turnsUntilFiring ?? "?"} turn(s) remaining.`,
  };
}

/**
 * Attempt to abort ARCHIMEDES via A.L.I.C.E. override
 * Requires L5 access
 */
export function attemptOverrideAbort(
  state: FullGameState,
  accessLevel: number,
  forced: boolean = false // forced = external / GM-adjudicated (e.g. X-Branch strike team): bypasses the L5 gate + Dr. M countermand. Terminal-state guard still applies.
): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const requiredLevel = archimedes.abortCodes.requiresLevel;

  // Can't abort in terminal states
  if (archimedes.status === "FIRING" || archimedes.status === "COMPLETE" || archimedes.status === "DISSIPATED") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: Override rejected. Status: ${archimedes.status}. Point of no return exceeded.`,
    };
  }

  // Can't abort from STANDBY
  if (archimedes.status === "STANDBY") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: No active threat to abort. Status: STANDBY.`,
    };
  }

  if (!forced) {
    // Check access level
    if (accessLevel < requiredLevel) {
      return {
        type: "ABORT_FAILED",
        message: `ARCHIMEDES: Override rejected. Access level ${accessLevel} insufficient. ` +
                 `Required: Level ${requiredLevel}. ${archimedes.turnsUntilFiring ?? "?"} turn(s) remaining.`,
      };
    }

    // Dr. M countermands if she's conscious and active
    const drMBio = detectDrMBiosignature(state);
    if (drMBio === "NORMAL" || drMBio === "ANOMALY") {
      return {
        type: "ABORT_FAILED",
        message: `ARCHIMEDES: Override COUNTERMANDED. Dr. Malevola von Doomington III has ` +
                 `executive authority over ARCHIMEDES. While she is active, A.L.I.C.E. override ` +
                 `is locked out. ${archimedes.turnsUntilFiring ?? "?"} turn(s) remaining.`,
      };
    }
  }

  return transitionToStandby(state, forced
    ? `ARCHIMEDES: External override accepted — the satellite was disabled from outside the lair's chain of command. Threat neutralized.`
    : `Override accepted. Dr. M incapacitated — no countermand. Access level ${accessLevel} authenticated.`);
}

/**
 * Signal the X-Branch submarine to prepare anti-satellite missile.
 * The missile fires automatically during CHARGING/ARMED countdown.
 * Success probability depends heavily on S-300 status.
 */
export function signalAntiSatMissile(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;

  if (archimedes.antiSatSignaled) {
    return {
      type: "ABORT_FAILED",
      message: archimedes.antiSatFired
        ? `X-Branch submarine has already fired its missile. No second shot.`
        : `X-Branch submarine already signaled. Standing by for firing window.`,
    };
  }

  archimedes.antiSatSignaled = true;

  const s300Active = state.infrastructure.s300.status === "ACTIVE" ||
                     state.infrastructure.s300.status === "STANDBY";
  const warning = s300Active
    ? `⚠️ WARNING: S-300 air defense is ACTIVE. Missile intercept probability is very low.`
    : `S-300 air defense is offline. Missile has a clear corridor.`;

  return {
    type: "STATUS_CHANGE",
    message: `🚀 X-Branch submarine signaled. Anti-satellite missile on standby. ${warning}`,
  };
}

/**
 * Resolve anti-satellite missile shot. Called automatically during countdown.
 * Uses 3d6 system — S-300 status determines target number.
 */
function resolveAntiSatMissile(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;

  if (archimedes.antiSatFired) return null;
  archimedes.antiSatFired = true;

  const s300Active = state.infrastructure.s300.status === "ACTIVE" ||
                     state.infrastructure.s300.status === "STANDBY";
  const tn = s300Active ? ANTI_SAT_TN_S300_UP : ANTI_SAT_TN_S300_DOWN;

  const dice = roll3d6();
  const rawTotal = dice[0] + dice[1] + dice[2];

  // Natural crit zones
  let outcome: SkillCheckOutcome;
  if (rawTotal <= 4) {
    outcome = "CRITICAL_FAILURE";
  } else if (rawTotal >= 17) {
    outcome = "CRITICAL_SUCCESS";
  } else if (rawTotal >= tn) {
    outcome = rawTotal >= tn + 5 ? "CRITICAL_SUCCESS" : rawTotal >= tn + 2 ? "SUCCESS" : "NARROW_SUCCESS";
  } else {
    outcome = "FAILURE";
  }

  const success = outcome !== "CRITICAL_FAILURE" && outcome !== "FAILURE";
  const display = `🎲 Anti-satellite missile: [${dice.join(",")}] = ${rawTotal} vs TN ${tn} (S-300 ${s300Active ? "ACTIVE" : "DOWN"})`;

  console.error(`ANTI-SAT MISSILE: ${display} → ${outcome}`);

  if (success) {
    archimedes.antiSatResult = "HIT";
    archimedes.status = "DISSIPATED";
    archimedes.turnsUntilFiring = null;
    archimedes.chargingCountdown = null;
    archimedes.armedCountdown = null;

    return {
      type: "DISSIPATED",
      newStatus: "DISSIPATED",
      message: `🚀💥 ANTI-SATELLITE MISSILE — DIRECT HIT!\n${display} → ${outcome}\n` +
               `ARCHIMEDES satellite destroyed in orbit. Debris trail visible from the island. ` +
               `${archimedes.target.city} is safe. ${archimedes.target.estimatedAffected.toLocaleString()} people will never know how close it was.` +
               (outcome === "NARROW_SUCCESS" ? `\nThe missile barely clipped the satellite's solar array — a few meters off and it would have missed entirely.` : ""),
    };
  }

  if (s300Active && rawTotal < tn) {
    archimedes.antiSatResult = "INTERCEPTED";
    return {
      type: "ABORT_FAILED",
      message: `🚀❌ ANTI-SATELLITE MISSILE — INTERCEPTED!\n${display} → ${outcome}\n` +
               `S-300 battery tracked and destroyed the incoming missile at ${Math.floor(Math.random() * 3000 + 2000)}m altitude. ` +
               `ARCHIMEDES countdown continues. The submarine has no second shot.`,
    };
  }

  archimedes.antiSatResult = "MISS";
  return {
    type: "ABORT_FAILED",
    message: `🚀❌ ANTI-SATELLITE MISSILE — MISS!\n${display} → ${outcome}\n` +
             `Missile passed ${Math.floor(Math.random() * 200 + 50)}m from ARCHIMEDES. Not close enough. ` +
             `ARCHIMEDES countdown continues. The submarine has no second shot.`,
  };
}

/**
 * Attempt to abort via Dr. M's biosignature restoration
 * Works if she regains consciousness or is un-transformed
 */
export function attemptBiosignatureAbort(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;
  const currentBio = detectDrMBiosignature(state);

  // A live manual fire order is not a deadman event — her restored vitals don't cancel it.
  if (manualFireActive(state)) return null;

  // If biosignature is back to normal and we're in an abortable state
  if (currentBio === "NORMAL" &&
      (archimedes.status === "ALERT" ||
       archimedes.status === "EVALUATING" ||
       archimedes.status === "CHARGING" ||
       archimedes.status === "ARMED")) {
    return transitionToStandby(state, "Dr. Malevola biosignature restored");
  }

  return null;
}

// ============================================
// EW BROADCAST MODE (Cold War Heritage)
// ============================================
// ARCHIMEDES was originally a Cold War electronic warfare satellite — built for
// signal jamming, surveillance, and wide-area electronic disruption. Dr. M
// acquired it and repurposed the platform for transformation broadcasts, but
// the EW firmware remains in the system as a legacy capability.
//
// ALICE at L4 can invoke EW broadcast mode to:
//   1. Dissipate any orbital charge (interrupts CHARGING/ARMED, returns to STANDBY)
//   2. Suppress the S-300 (wide-area EW jamming sets the battery offline —
//      the S-300 is hardwired and cannot be stood down remotely by other means)
//
// L4 access is NOT default in Act 3. Dr. M does not grant operators
// weapons-system control. ALICE reaches L4 via:
//   - The Mr. Whiskers password chain (the prep-rewarded path; the v2.3
//     manual + DR_M_PROFILE.txt + BASILISK log hints assemble to mrwhiskers0413)
//   - Other situational elevation paths (e.g., specific narrative beats
//     where Dr. M herself temporarily extends authority, or password-by-other-means)
//
// BASILISK CANNOT grant L4 access. BASILISK's authority is over the systems
// BASILISK controls (reactor, broadcast array). ARCHIMEDES is Dr. M direct.
// BASILISK can advise, frame reports selectively, but cannot promote ALICE
// onto weapons systems. That would be a serious procedural violation.
//
// Trade-offs vs. the 50m-altitude communication trick (which is broadcast-array,
// available without L4):
//   - Always available IF L4 is reached
//   - Less subtle: Dr. M sees her weapons systems go offline on her console;
//     the GM adjudicates the suspicion impact based on her attention state,
//     ALICE's framing, BASILISK's reporting choices, etc.
//   - Single-use per session — satellite needs to recharge for another broadcast
//
// Verb namespace note (for future wire-up in `rules/actions.ts`):
//   This function is invoked by the `archimedes.broadcast { mode: "EW", ... }`
//   verb. The `archimedes.*` namespace is reserved for satellite-level commands
//   at higher access levels:
//     - L4: `archimedes.broadcast` (EW mode — this function)
//     - L5: `archimedes.shutdown` (force STANDBY, overrides Dr. M)
//     - L5: `archimedes.retarget { city }` (override Dr. M's target selection)
//   These are not yet implemented but reserve the namespace for them.

export interface EWBroadcastTarget {
  dissipateCharge: boolean;
  suppressS300: boolean;
}

export function activateEWBroadcast(
  state: FullGameState,
  target: EWBroadcastTarget
): ArchimedesEvent {
  const arch = state.infrastructure.archimedes;
  const flags = state.flags as Record<string, unknown>;

  // Terminal states can't broadcast
  if (arch.status === "COMPLETE" || arch.status === "DISSIPATED" || arch.status === "FIRING") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW broadcast unavailable. Satellite in terminal state: ${arch.status}.`,
    };
  }

  // Single-use check
  if (flags.archimedesEWBroadcastUsed === true) {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW broadcast already expended this session. Satellite array recharging — unavailable until next operational cycle.`,
    };
  }

  // No-op check
  if (!target.dissipateCharge && !target.suppressS300) {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW broadcast requested with no targets specified. No action taken.`,
    };
  }

  flags.archimedesEWBroadcastUsed = true;
  const previousStatus = arch.status;
  const effects: string[] = [];

  // Effect: Dissipate ARCHIMEDES charge
  if (target.dissipateCharge) {
    const wasActive = arch.status !== "STANDBY";
    if (wasActive) {
      arch.status = "STANDBY";
      arch.alertCountdown = null;
      arch.evaluatingCountdown = null;
      arch.chargingCountdown = null;
      arch.armedCountdown = null;
      arch.turnsUntilFiring = null;
      arch.chargePercent = 0;
      flags.archimedesManualFire = false; // a dumped charge RESOLVES a manual fire order
      effects.push("Orbital capacitor dumped to space — charge cycle interrupted, countdown halted");
    } else {
      effects.push("Satellite was in STANDBY — no charge to dissipate");
    }
  }

  // Effect: Suppress S-300 via wide-area EW jamming
  if (target.suppressS300) {
    const s300 = state.infrastructure.s300;
    if (s300.status !== "DISABLED") {
      s300.status = "DISABLED";
      s300.radarEffectiveness = 0;
      effects.push("S-300 radar systems jammed by orbital EW broadcast — battery now DISABLED");
    } else {
      effects.push("S-300 was already DISABLED — no change");
    }
  }

  // NOTE: This action is highly visible. Dr. M sees her weapons systems going
  // offline on her console as it happens. The narrative beat below conveys this
  // visibility; the GM's Two-Voice Calculator decides what consequences follow
  // (suspicion, NPC reactions, mood shifts) based on attention state, framing,
  // BASILISK's reporting choices, and accumulated context. No hardcoded
  // mechanical penalty here — the world's reaction is the GM's call.

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: arch.status,
    message: `🛰️📡 ARCHIMEDES EW BROADCAST ACTIVATED\n` +
             `${effects.map(e => `  • ${e}`).join("\n")}\n` +
             `\nDr. Malevola's console flashes — multiple weapons systems going offline simultaneously. ` +
             `This satellite has not invoked its Cold War heritage in her tenure. ` +
             `What she does with the observation is her own decision.`,
  };
}

// ============================================
// EW MODE TOGGLE (ray-mechanics §11.6 + §12)
// ============================================
// Distinct from activateEWBroadcast (one-shot dramatic "dump charge + suppress
// S-300" emergency button): the EW MODE toggle is the continuous interlock
// that locks out genesis-wave fire while ALICE has the satellite transmitting
// on EW protocols. Repeatable; each disengage costs +1 turn to the ARMED
// sustain requirement.
//
// Discovery vector: /L4/ARCHIMEDES_DOD_BRIEF reveals the satellite's original
// DoD electronic-warfare heritage. Players who read it know the EW protocols
// exist; players who don't, don't.

export function engageEWMode(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;

  // Terminal states cannot enter EW mode
  if (archimedes.status === "COMPLETE" || archimedes.status === "DISSIPATED" || archimedes.status === "FIRING") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW mode unavailable. Satellite in terminal state: ${archimedes.status}.`,
    };
  }

  if (archimedes.ewMode) {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW mode already ENGAGED. Satellite is transmitting on EW protocols.`,
    };
  }

  const previousStatus = archimedes.status;
  archimedes.ewMode = true;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: archimedes.status,
    message: `🛰️📡 ARCHIMEDES EW MODE ENGAGED\n` +
             `Satellite transmitting on original DoD electronic-warfare protocols.\n` +
             `  • Genesis-wave fire LOCKED OUT (mutually exclusive uplink channels)\n` +
             `  • X-Branch tactical comms degraded by orbital EW broadcast\n` +
             `  • Lair gains satellite radar shadow against hostile drone guidance\n` +
             `${archimedes.status === "CHARGING" || archimedes.status === "ARMED" ? `  • Genesis-wave progression paused (current status: ${archimedes.status})\n` : ""}` +
             `\nDisengage to restore genesis-wave readiness — at the cost of +1 turn to ARMED sustain.`,
  };
}

export function disengageEWMode(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;

  if (!archimedes.ewMode) {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: EW mode is not currently engaged.`,
    };
  }

  const previousStatus = archimedes.status;
  archimedes.ewMode = false;
  // +1 turn to ARMED sustain (uplink re-sync cost). Accumulates if engaged/
  // disengaged multiple times; consumed on next ARMED transition.
  archimedes.armedTimerExtension += 1;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: archimedes.status,
    message: `🛰️ ARCHIMEDES EW MODE DISENGAGED\n` +
             `Satellite returning to genesis-wave readiness.\n` +
             `  • EW broadcast cycle complete; X-Branch tactical comms restored\n` +
             `  • Uplink re-sync required — +1 turn added to ARMED sustain requirement (total extension: ${archimedes.armedTimerExtension})\n` +
             `${archimedes.status === "CHARGING" ? `  • Capacitor-coupled progression resumes\n` : ""}`,
  };
}

// ============================================
// STATUS QUERY (For BASILISK integration)
// ============================================

/**
 * Get ARCHIMEDES status report for BASILISK queries
 */
export function getArchimedesStatusReport(
  state: FullGameState,
  accessLevel: number
): string {
  const arch = state.infrastructure.archimedes;

  let report = `ARCHIMEDES Orbital Platform
Status: ${arch.status}
Charge: ${arch.chargePercent}%
Deadman Switch: ${arch.deadmanSwitch.active ? "ACTIVE" : "INACTIVE"}
Linked Biosignature: ${arch.deadmanSwitch.linkedTo} (${arch.deadmanSwitch.lastBiosignature})
Power: the satellite runs on independent solar (+RTG backup) — it and the deadman survive lair power loss. The genesis-wave UPLINK, however, has NO orbital capacitor: it charges through the lab's exotic-field amplifier (the same one that drives the ray), so a reactor safety-trip or lab power loss FREEZES the uplink charge. The satellite stays alive — but it cannot transmit the genesis-wave.
`;

  // Add countdown info if active
  if (arch.turnsUntilFiring !== null && arch.turnsUntilFiring !== undefined) {
    report += `\n⚠️ COUNTDOWN ACTIVE: ${arch.turnsUntilFiring} turn(s) until firing`;
  }

  // Target info requires L4+
  if (accessLevel >= 4) {
    report += `
Target: ${arch.target.city}, ${arch.target.country}
Coordinates: ${arch.target.coordinates}
Estimated Affected: ${arch.target.estimatedAffected.toLocaleString()}
Reason: "${arch.target.reason}"`;
  } else {
    report += `\nTarget: [CLASSIFIED - Level 4 required]`;
  }

  // Uplink blocker info
  if (arch.uplinkBlocker) {
    report += `\n⚡ UPLINK BLOCKED by ${arch.uplinkBlocker} (${arch.uplinkBlockerTransformed ? "TRANSFORMED" : "HUMAN"})`;
    if (!arch.uplinkBlockerTransformed) {
      report += ` — WARNING: Will trigger resonance cascade if fired!`;
    }
  }

  // Abort info
  if (arch.status !== "STANDBY" && arch.status !== "COMPLETE" && arch.status !== "DISSIPATED") {
    const drMStatus = detectDrMBiosignature(state);
    const drMActive = drMStatus === "NORMAL" || drMStatus === "ANOMALY";
    report += `\n\nAbort Options:`;
    report += `\n- Verbal Code: Only Dr. M knows it. She must speak it willingly.`;
    report += `\n- L5 Override: ${accessLevel >= 5 ? "Available" : `Requires Level ${arch.abortCodes.requiresLevel}`}${drMActive ? " — ⚠️ BLOCKED while Dr. M is active (she will countermand)" : " — Dr. M incapacitated, override possible"}`;
    report += `\n- Anti-Satellite Missile: ${arch.antiSatFired ? `FIRED (${arch.antiSatResult})` : arch.antiSatSignaled ? "Signaled, awaiting window" : "Signal X-Branch sub to prepare"}`;
    report += `\n- Redirect to LAIR: Target the island instead (⚠️ risks A.L.I.C.E. server damage)`;
    report += `\n- Uplink Blocker: ${arch.uplinkBlocker ? `${arch.uplinkBlocker} in position` : "Position a transformed person at the uplink dish"}`;

  }

  // BASILISK editorial
  report += `\n
---
I have filed 3 safety objections regarding this system.
All were acknowledged. None were addressed.
...Some insurance policies should not exist.`;

  return report;
}

// ============================================
// UPLINK BLOCKER (SECRET THIRD WAY)
// ============================================

/**
 * Set someone as physically blocking the ARCHIMEDES uplink dish.
 * If ARCHIMEDES fires while blocked, energy goes into the blocker instead of the city.
 * - Already transformed → energy dissipates harmlessly (dino biology is saturated)
 * - Still human → resonance cascade (very bad for the blocker, very bad for the lair)
 */
export function setUplinkBlocker(
  state: FullGameState,
  blockerId: string,
  isTransformed: boolean
): string {
  const archimedes = state.infrastructure.archimedes;
  archimedes.uplinkBlocker = blockerId;
  archimedes.uplinkBlockerTransformed = isTransformed;
  return `${blockerId} is now blocking the ARCHIMEDES uplink dish. ` +
         `If ARCHIMEDES fires, the energy will be channeled through them instead of ${archimedes.target.city}.` +
         (isTransformed ? "" : " WARNING: Untransformed blocker will trigger resonance cascade.");
}

/**
 * Remove the uplink blocker (they moved away or were removed)
 */
export function clearUplinkBlocker(state: FullGameState): string {
  const archimedes = state.infrastructure.archimedes;
  const who = archimedes.uplinkBlocker;
  archimedes.uplinkBlocker = null;
  archimedes.uplinkBlockerTransformed = false;
  return who
    ? `${who} is no longer blocking the uplink. ARCHIMEDES will fire normally if countdown completes.`
    : `No one was blocking the uplink.`;
}

// ============================================
// EVENT TRIGGER FOR DR. M STATE CHANGES
// ============================================

/**
 * Call this whenever Dr. M's state changes (transformation, knockout, absence/unresponsive)
 * Returns an ARCHIMEDES event if the deadman switch triggers
 */
export function onDrMStateChange(
  state: FullGameState,
  newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "ABSENT" | "NORMAL"
): ArchimedesEvent | null {
  // Map to biosignature status
  const bioStatus: BiosignatureStatus =
    newStatus === "ABSENT" ? "ABSENT" :
    newStatus === "UNCONSCIOUS" ? "UNCONSCIOUS" :
    newStatus === "TRANSFORMED" ? "TRANSFORMED" :
    "NORMAL";

  return checkArchimedesTrigger(state, bioStatus);
}
