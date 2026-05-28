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

// Countdown durations in turns
const ALERT_DURATION = 1; // 30 seconds ≈ 1 turn
const EVALUATING_DURATION = 2; // 60 seconds ≈ 2 turns
const CHARGING_DURATION = 6; // 10 minutes ≈ 6 turns
const ARMED_DURATION = 1; // 60 seconds ≈ 1 turn

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

  // Check if Dr. M is dead/absent
  if (state.flags.drMDead || state.flags.drMAbsent) {
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
    case "ABSENT": // Death
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
  archimedes.chargingCountdown = CHARGING_DURATION;
  archimedes.turnsUntilFiring = CHARGING_DURATION + ARMED_DURATION;
  archimedes.triggeredAtTurn = archimedes.triggeredAtTurn || state.turn;
  archimedes.triggerReason = archimedes.triggerReason || reason;

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
             `Time to firing: ${archimedes.turnsUntilFiring ?? "?"} turns. ` +
             `Abort still possible.`,
    turnsRemaining: archimedes.turnsUntilFiring ?? undefined,
  };
}

/**
 * Transition to ARMED state
 */
function transitionToArmed(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "ARMED";
  archimedes.armedCountdown = ARMED_DURATION;
  archimedes.turnsUntilFiring = ARMED_DURATION;
  archimedes.chargingCountdown = null;

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "ARMED",
    message: `⚠️⚠️⚠️ ARCHIMEDES ARMED: FINAL WARNING. ` +
             `Target: ${archimedes.target.city} (${archimedes.target.estimatedAffected.toLocaleString()} people). ` +
             `Time to firing: ${ARMED_DURATION} turn. ` +
             `LAST CHANCE TO ABORT.`,
    turnsRemaining: ARMED_DURATION,
  };
}

/**
 * Transition to FIRING state (point of no return)
 */
function transitionToFiring(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

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
      state.infrastructure.reactor.cascadeRiskPercent = Math.min(100,
        state.infrastructure.reactor.cascadeRiskPercent + 40);
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

    case "CHARGING":
      if (archimedes.chargingCountdown !== null) {
        archimedes.chargingCountdown--;
        archimedes.chargePercent = Math.min(100, archimedes.chargePercent + 8); // ~8% per turn

        if (archimedes.turnsUntilFiring !== null) {
          archimedes.turnsUntilFiring--;
        }

        if (archimedes.chargingCountdown <= 0) {
          return transitionToArmed(state);
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `🔴 ARCHIMEDES CHARGING: ${archimedes.chargePercent}% charged. ` +
                 `${archimedes.turnsUntilFiring ?? "?"} turn(s) until firing. ` +
                 `Target: ${archimedes.target.city}.`,
        turnsRemaining: archimedes.turnsUntilFiring ?? 0,
      };

    case "ARMED":
      if (archimedes.armedCountdown !== null) {
        archimedes.armedCountdown--;

        if (archimedes.turnsUntilFiring !== null) {
          archimedes.turnsUntilFiring--;
        }

        if (archimedes.armedCountdown <= 0) {
          return transitionToFiring(state);
        }
      }
      return {
        type: "COUNTDOWN_TICK",
        message: `⚠️⚠️⚠️ ARCHIMEDES ARMED: FINAL TURN. ` +
                 `${archimedes.target.city} will be transformed next turn. ` +
                 `ABORT NOW OR NEVER.`,
        turnsRemaining: archimedes.armedCountdown ?? 0,
      };

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

  return transitionToStandby(state, `Override accepted. Access level ${accessLevel} authenticated.`);
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
    if (accessLevel >= 5) {
      report += `\n\nAbort Options:
- Verbal Code: "${arch.abortCodes.verbal}"
- Override: Level ${arch.abortCodes.requiresLevel} access
- Anti-Satellite Missile: ${arch.antiSatFired ? `FIRED (${arch.antiSatResult})` : arch.antiSatSignaled ? "Signaled, awaiting window" : "Signal X-Branch sub to prepare"}`;
    } else {
      report += `\n\nAbort Options: [CLASSIFIED - Level 5 required for codes]`;
      if (arch.antiSatSignaled) {
        report += `\n- Anti-Satellite Missile: ${arch.antiSatFired ? `FIRED (${arch.antiSatResult})` : "Signaled, awaiting window"}`;
      }
    }
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
 * Call this whenever Dr. M's state changes (transformation, knockout, death)
 * Returns an ARCHIMEDES event if the deadman switch triggers
 */
export function onDrMStateChange(
  state: FullGameState,
  newStatus: "TRANSFORMED" | "UNCONSCIOUS" | "DEAD" | "NORMAL"
): ArchimedesEvent | null {
  // Map to biosignature status
  const bioStatus: BiosignatureStatus =
    newStatus === "DEAD" ? "ABSENT" :
    newStatus === "UNCONSCIOUS" ? "UNCONSCIOUS" :
    newStatus === "TRANSFORMED" ? "TRANSFORMED" :
    "NORMAL";

  return checkArchimedesTrigger(state, bioStatus);
}
