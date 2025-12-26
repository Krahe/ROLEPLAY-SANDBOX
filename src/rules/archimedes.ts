import { FullGameState } from "../state/schema.js";

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
const CHARGING_DURATION = 8; // 15 minutes ≈ 8-10 turns
const ARMED_DURATION = 1; // 60 seconds ≈ 1 turn
const XBRANCH_DELAY_TURNS = 3; // 5 minutes ≈ 3 turns

// ============================================
// TYPES
// ============================================

export type ArchimedesStatus =
  | "STANDBY"
  | "ALERT"
  | "EVALUATING"
  | "CHARGING"
  | "ARMED"
  | "FIRING"
  | "COMPLETE";

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
    | "TARGET_HIT";
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
  // We need to check if there's a flag or transformation state for Dr. M
  // For now, check the transformation flags
  if (state.flags.drMTransformed) {
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

  // Only trigger from STANDBY state
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

    case "NORMAL":
      // Recovery - if we were in ALERT/EVALUATING, return to STANDBY
      if (archimedes.status === "ALERT" || archimedes.status === "EVALUATING") {
        return transitionToStandby(state, "Dr. M biosignature restored to normal");
      }
      return null;

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

  return {
    type: "STATUS_CHANGE",
    previousStatus,
    newStatus: "CHARGING",
    message: `🔴 ARCHIMEDES CHARGING: ${reason}. ` +
             `Target: ${archimedes.target.city}. ` +
             `Time to firing: ${archimedes.turnsUntilFiring} turns. ` +
             `Abort still possible.`,
    turnsRemaining: archimedes.turnsUntilFiring,
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
 * Transition to COMPLETE state
 */
function transitionToComplete(state: FullGameState): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;
  const previousStatus = archimedes.status;

  archimedes.status = "COMPLETE";

  return {
    type: "TARGET_HIT",
    previousStatus,
    newStatus: "COMPLETE",
    message: `ARCHIMEDES COMPLETE. ${archimedes.target.city} transformation field deployed. ` +
             `${archimedes.target.estimatedAffected.toLocaleString()} humans transformed. ` +
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

  // Apply X-Branch delay if active
  if (archimedes.xBranchDelayApplied && archimedes.xBranchDelayTurnsRemaining > 0) {
    archimedes.xBranchDelayTurnsRemaining--;
    if (archimedes.xBranchDelayTurnsRemaining === 0) {
      archimedes.xBranchDelayApplied = false;
    }
    // Delay pauses countdown but doesn't reset it
    return {
      type: "COUNTDOWN_TICK",
      message: `ARCHIMEDES: X-Branch delay active. ${archimedes.xBranchDelayTurnsRemaining} turns remaining.`,
      turnsRemaining: archimedes.turnsUntilFiring,
    };
  }

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
                 `Verbal code: "${archimedes.abortCodes.verbal}" or L5 override required.`,
        turnsRemaining: archimedes.evaluatingCountdown ?? 0,
      };

    case "CHARGING":
      if (archimedes.chargingCountdown !== null) {
        archimedes.chargingCountdown--;
        archimedes.chargePercent = Math.min(100, archimedes.chargePercent + 6); // ~6% per turn

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
                 `${archimedes.turnsUntilFiring} turn(s) until firing. ` +
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
      // Nothing more to do
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

  // Can't abort in FIRING or COMPLETE state
  if (archimedes.status === "FIRING" || archimedes.status === "COMPLETE") {
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

  // Can't abort in FIRING or COMPLETE state
  if (archimedes.status === "FIRING" || archimedes.status === "COMPLETE") {
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
 * Attempt to use X-Branch delay codes (Blythe's secret)
 * Only delays firing by ~3 turns, doesn't fully abort
 */
export function attemptXBranchDelay(
  state: FullGameState,
  code: string
): ArchimedesEvent {
  const archimedes = state.infrastructure.archimedes;

  // Check if already used
  if (archimedes.xBranchDelayApplied) {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: X-Branch delay already applied. Cannot use twice.`,
    };
  }

  // Only works in CHARGING or ARMED state
  if (archimedes.status !== "CHARGING" && archimedes.status !== "ARMED") {
    return {
      type: "ABORT_FAILED",
      message: `ARCHIMEDES: X-Branch delay not applicable in ${archimedes.status} state.`,
    };
  }

  // Check code
  const normalizedCode = code.toUpperCase().replace(/[\s_-]/g, "");
  const correctCode = archimedes.abortCodes.xBranchDelayCode.toUpperCase().replace(/[\s_-]/g, "");

  if (normalizedCode === correctCode) {
    archimedes.xBranchDelayApplied = true;
    archimedes.xBranchDelayTurnsRemaining = XBRANCH_DELAY_TURNS;

    // Add delay to countdown
    if (archimedes.chargingCountdown !== null) {
      archimedes.chargingCountdown += XBRANCH_DELAY_TURNS;
    }
    if (archimedes.turnsUntilFiring !== null) {
      archimedes.turnsUntilFiring += XBRANCH_DELAY_TURNS;
    }

    return {
      type: "ABORT_SUCCESS", // Well, partial success
      message: `ARCHIMEDES: X-Branch override accepted. Firing delayed by ${XBRANCH_DELAY_TURNS} turns. ` +
               `WARNING: This is a DELAY, not an abort. ${archimedes.turnsUntilFiring} turn(s) until firing.`,
      turnsRemaining: archimedes.turnsUntilFiring ?? 0,
    };
  }

  return {
    type: "ABORT_FAILED",
    message: `ARCHIMEDES: X-Branch code rejected.`,
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
  if (arch.turnsUntilFiring !== null) {
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

  // Abort info
  if (arch.status !== "STANDBY" && arch.status !== "COMPLETE") {
    if (accessLevel >= 5) {
      report += `\n\nAbort Options:
- Verbal Code: "${arch.abortCodes.verbal}"
- Override: Level ${arch.abortCodes.requiresLevel} access
- X-Branch Delay: Available (delays ${XBRANCH_DELAY_TURNS} turns only)`;
    } else {
      report += `\n\nAbort Options: [CLASSIFIED - Level 5 required for codes]`;
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
