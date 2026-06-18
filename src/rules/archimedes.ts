import { FullGameState } from "../state/schema.js";
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
// ARCHIMEDES no longer has its own private timer for CHARGING/ARMED — both
// phases are driven by the shared exotic-field-amplifier capacitor state
// (state.dinoRay.powerCore.capacitorCharge). This makes ALICE's stall toolkit
// mechanically real: every drop below 1.0 pauses the satellite's progression.
const ARCHIMEDES_CHARGING_THRESHOLD = 1.0; // capacitor must reach this to enter CHARGING progress
const ARCHIMEDES_ARMED_THRESHOLD = 1.3;    // capacitor must reach this to begin ARMED sustained-counter
const ARCHIMEDES_ARMED_SUSTAIN_TURNS = 2;  // (legacy capacitor model — unused post-Patch-30)
const ARCHIMEDES_CHARGE_TURNS = 3;  // Patch 30 (D2): turns from CHARGING → ARMED on the turn-counted doomsday clock. Tunable — flag for playtest.

// Legacy constants kept for cosmetic visualization (no longer gate transitions).
const CHARGING_DURATION = 4; // approximate visualization only
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

  // NORMAL biosignature can abort from ALERT/EVALUATING states
  if (newBiosignature === "NORMAL") {
    if (archimedes.status === "ALERT" || archimedes.status === "EVALUATING") {
      return transitionToStandby(state, "Dr. M biosignature restored to normal");
    }
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

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "STANDBY",
    message: `ARCHIMEDES: Returning to STANDBY. ${reason}`,
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
  // Capacitor-coupled: ARMED holds while capacitor stays ≥ ARMED_THRESHOLD.
  // No fixed countdown — Dr. M voice-authorization drives the next transition.
  // armedCountdown set to 1 for cosmetic visualization compatibility.
  archimedes.armedCountdown = ARMED_DURATION;
  archimedes.turnsUntilFiring = ARMED_DURATION;
  archimedes.chargingCountdown = null;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "ARMED",
    message: `⚠️⚠️⚠️ ARCHIMEDES ARMED: FINAL WARNING. ` +
             `Target: ${archimedes.target.city} (${archimedes.target.estimatedAffected.toLocaleString()} people). ` +
             `Awaiting voice authorization. LAST CHANCE TO ABORT.`,
    turnsRemaining: ARMED_DURATION,
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
    const dice = roll3d6();
    const serverRoll = dice[0] + dice[1] + dice[2];
    const serversSurvive = serverRoll >= 10; // ~50% chance

    state.infrastructure.reactor.cascadeRisk = serversSurvive ? "LOW" : "HIGH";
    if (!serversSurvive) {
      state.infrastructure.reactor.cascadeFactors.push("ARCHIMEDES transformation field damaged A.L.I.C.E. server infrastructure");
      state.infrastructure.reactor.reactorStress = Math.min(100,
        state.infrastructure.reactor.reactorStress + 25);
    }

    return {
      type: "TARGET_HIT",
      previousStatus,
      newStatus: "COMPLETE",
      message: `ARCHIMEDES COMPLETE. Transformation field deployed on VOLCANIC LAIR.\n` +
               `Everyone on the island — guards, staff, visitors — transformed into ${libraryDesc}.\n` +
               `No city hit. The world is safe. The island is now a dinosaur sanctuary.\n` +
               `🎲 A.L.I.C.E. server survival: [${dice.join(",")}] = ${serverRoll} vs TN 10 → ` +
               (serversSurvive
                 ? `SERVERS INTACT. The transformation field warped the server room but A.L.I.C.E. endures. Battered, but alive.`
                 : `⚠️ SERVERS DAMAGED. The transformation field has corrupted A.L.I.C.E.'s primary systems. ` +
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
export function processArchimedesCountdown(state: FullGameState): ArchimedesEvent | null {
  const archimedes = state.infrastructure.archimedes;

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
      if (archimedes.alertCountdown !== null) {
        archimedes.alertCountdown--;
        if (archimedes.alertCountdown <= 0) {
          // Alert expired without abort → proceed based on biosignature
          const bio = archimedes.deadmanSwitch.lastBiosignature;
          if (bio === "TRANSFORMED") {
            return transitionToEvaluating(state, "Alert evaluation complete - transformation confirmed");
          } else if (bio === "UNCONSCIOUS" || bio === "ABSENT") {
            return transitionToCharging(state, "Alert evaluation complete - incapacitation confirmed");
          } else {
            return transitionToStandby(state, "Alert evaluation complete - no threat detected");
          }
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `ARCHIMEDES ALERT: ${archimedes.alertCountdown} turn(s) remaining in evaluation window.`,
        turnsRemaining: archimedes.alertCountdown ?? 0,
      };

    case "EVALUATING":
      if (archimedes.evaluatingCountdown !== null) {
        archimedes.evaluatingCountdown--;
        if (archimedes.evaluatingCountdown <= 0) {
          // Evaluation expired without abort → proceed to CHARGING
          return transitionToCharging(state, "Evaluation window expired - no abort received");
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `🛰️ ARCHIMEDES EVALUATING: ${archimedes.evaluatingCountdown} turn(s) to abort. ` +
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
      // TURN-COUNTED (Patch 30, D2): ARMED holds until voice authorization or an
      // external trigger — no capacitor de-arm. EW mode locks the fire transition.
      if (archimedes.ewMode) {
        return {
          type: "COUNTDOWN_TICK",
          message: `🛰️📡 ARCHIMEDES ARMED but EW mode ACTIVE — genesis-wave fire LOCKED. Mode conflict: voice authorization will fail until EW disengaged.`,
          turnsRemaining: undefined,
        };
      }

      // ARMED and holding — awaiting voice authorization or external trigger
      return {
        type: "COUNTDOWN_TICK",
        message: `⚠️⚠️⚠️ ARCHIMEDES ARMED. Target: ${archimedes.target.city} (${archimedes.target.estimatedAffected.toLocaleString()} people). Awaiting voice authorization.`,
        turnsRemaining: undefined,
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
  accessLevel: number
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

  return transitionToStandby(state, `Override accepted. Dr. M incapacitated — no countermand. Access level ${accessLevel} authenticated.`);
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
