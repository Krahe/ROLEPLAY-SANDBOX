// ============================================
// RAY DIAGNOSTIC-CLASS OPERATIONS (design/ray-mechanics.md §11.6)
// ============================================
// L3 Act 3 stall toolkit: technical-operator-class operations on the
// exotic-field amplifier. Each has a plausible cover story Dr. M would
// expect her L3 operator to handle, drains capacitor, and meaningfully
// stalls ARCHIMEDES progression (via the shared-amplifier coupling
// shipped in §12).
//
// Three verbs:
//   ray.diagnostic              — 2-turn full-system stress test
//   ray.calibrate_amplifier     — 1-2 turn amplifier tuning (+alignment payoff)
//   ray.profile_certification   — 1-turn Library B safety verification
//
// All three require ray.state in READY (won't start mid-cooldown or while
// another diagnostic is active). Each turn the diagnostic is active,
// capacitor drains; on completion, returns ray to READY and applies any
// pending payoff (alignment shift for calibrate, pass/fail for cert).

import { FullGameState, FiringOutcome } from "../state/schema.js";
import { getProfile } from "./genomes.js";

export interface DiagnosticActionResult {
  success: boolean;
  message: string;
  stateChanges?: Record<string, unknown>;
}

// Per-turn drain rates (total over the run sums to the spec's drain budget).
const DIAGNOSTIC_DRAIN_PER_TURN = 0.18;       // 0.18 × 2 = 0.36 (≈ spec's 0.35)
const CALIBRATE_DRAIN_PER_TURN = 0.13;        // 0.13 × 2 = 0.26 (≈ spec's 0.25)
const PROFILE_CERTIFICATION_DRAIN = 0.20;     // single-turn cost (spec)

// Per-turn coolant accrual during diagnostic-class operations
const DIAGNOSTIC_COOLANT_PER_TURN = 0.05;     // 0.05 × 2 = 0.10 (≈ spec's 0.10)
const CALIBRATE_COOLANT_PER_TURN = 0.04;

// Alignment payoff for completed calibration (scales with duration)
const CALIBRATE_ALIGNMENT_1_TURN = 0.10;
const CALIBRATE_ALIGNMENT_2_TURN = 0.18;

// ============================================
// ray.diagnostic — full-system stress test (2 turns)
// ============================================

export function startRayDiagnostic(state: FullGameState): DiagnosticActionResult {
  const ray = state.dinoRay;

  if (ray.state !== "READY") {
    return {
      success: false,
      message: `Cannot start diagnostic: ray state is ${ray.state}. Requires READY.`,
    };
  }

  if (ray.diagnostic.active) {
    return {
      success: false,
      message: `Cannot start diagnostic: ${ray.diagnostic.type} already in progress (${ray.diagnostic.turnsRemaining} turn(s) remaining).`,
    };
  }

  ray.state = "DIAGNOSTIC";
  ray.diagnostic.active = true;
  ray.diagnostic.type = "DIAGNOSTIC";
  ray.diagnostic.turnsRemaining = 2;
  ray.diagnostic.startTurn = state.turn;

  return {
    success: true,
    message:
      `🔧 RAY DIAGNOSTIC CYCLE INITIATED (2 turns)\n` +
      `Full-system stress test of exotic-field amplifier per Form 89-C.\n` +
      `Per-turn capacitor draw: ${(DIAGNOSTIC_DRAIN_PER_TURN * 100).toFixed(0)}%.\n` +
      `Ray operations locked until cycle completes.\n` +
      `\n` +
      `Cover: "The amplifier hasn't been stress-tested since the eco-mode override. ` +
      `Per Form 89-C, sustained sat-uplink load requires current diagnostic certification."`,
    stateChanges: { diagnosticStarted: "DIAGNOSTIC" },
  };
}

// ============================================
// ray.calibrate_amplifier — amplifier tuning (1-2 turns)
// ============================================

export function startCalibrateAmplifier(
  state: FullGameState,
  durationTurns: number = 2,
): DiagnosticActionResult {
  const ray = state.dinoRay;
  const duration = durationTurns === 1 ? 1 : 2; // clamp to 1 or 2

  if (ray.state !== "READY") {
    return {
      success: false,
      message: `Cannot start amplifier calibration: ray state is ${ray.state}. Requires READY.`,
    };
  }

  if (ray.diagnostic.active) {
    return {
      success: false,
      message: `Cannot start calibration: ${ray.diagnostic.type} already in progress (${ray.diagnostic.turnsRemaining} turn(s) remaining).`,
    };
  }

  const alignmentDelta = duration === 1 ? CALIBRATE_ALIGNMENT_1_TURN : CALIBRATE_ALIGNMENT_2_TURN;

  ray.state = "CALIBRATING";
  ray.diagnostic.active = true;
  ray.diagnostic.type = "CALIBRATE_AMPLIFIER";
  ray.diagnostic.turnsRemaining = duration;
  ray.diagnostic.startTurn = state.turn;
  ray.diagnostic.pendingAlignmentDelta = alignmentDelta;

  return {
    success: true,
    message:
      `🔧 AMPLIFIER CALIBRATION INITIATED (${duration} turn${duration === 1 ? "" : "s"})\n` +
      `Tuning exotic-field harmonic signature per Form 47-Σ override protocols.\n` +
      `Per-turn capacitor draw: ${(CALIBRATE_DRAIN_PER_TURN * 100).toFixed(0)}%.\n` +
      `Pending alignment shift on completion: +${alignmentDelta.toFixed(2)}.\n` +
      `Ray operations locked until calibration completes.\n` +
      `\n` +
      `Cover: "The amplifier's harmonic signature drifted during the Form 47-Σ override. ` +
      `Tuning now prevents ARCHIMEDES signal scatter."`,
    stateChanges: { diagnosticStarted: "CALIBRATE_AMPLIFIER" },
  };
}

// ============================================
// ray.profile_certification — Library B safety verification (1 turn)
// ============================================
// Single-turn action — completes immediately. Drains capacitor, runs cert,
// returns pass/fail. Cert fail logs an anomaly (BASILISK mandatory-report
// trigger). The certification "passes" if alignment ≥ 0.7 and coolant < 1.0;
// otherwise FAIL.

export function runProfileCertification(
  state: FullGameState,
  profileName: string,
): DiagnosticActionResult {
  const ray = state.dinoRay;

  if (ray.state !== "READY") {
    return {
      success: false,
      message: `Cannot run profile certification: ray state is ${ray.state}. Requires READY.`,
    };
  }

  if (ray.diagnostic.active) {
    return {
      success: false,
      message: `Cannot certify profile: ${ray.diagnostic.type} already in progress.`,
    };
  }

  const profile = getProfile(profileName);
  if (!profile) {
    return {
      success: false,
      message: `Profile "${profileName}" not found in genome library — certification aborted.`,
    };
  }

  // Drain capacitor for the cert run
  ray.powerCore.capacitorCharge = Math.max(0, ray.powerCore.capacitorCharge - PROFILE_CERTIFICATION_DRAIN);
  ray.powerCore.coolantTemp = Math.min(2, ray.powerCore.coolantTemp + 0.05);

  // Pass/fail logic
  const alignment = ray.alignment.unified;
  const coolant = ray.powerCore.coolantTemp;
  const passed = alignment >= 0.7 && coolant < 1.0;

  if (passed) {
    return {
      success: true,
      message:
        `✅ PROFILE CERTIFICATION: ${profileName} — PASS\n` +
        `Amplifier modulation matches profile resonance window.\n` +
        `Genome-stability test: PASSED (alignment ${alignment.toFixed(2)}, coolant ${coolant.toFixed(2)}).\n` +
        `Capacitor draw for certification: ${(PROFILE_CERTIFICATION_DRAIN * 100).toFixed(0)}%.\n` +
        `Profile cleared for live fire under Genesis Wave Protocol §3.\n` +
        `\n` +
        `Cover: "Library B special profile requires certification before live fire — per Genesis Wave Protocol §3."`,
      stateChanges: {
        profileCertified: profileName,
        certificationResult: "PASS",
      },
    };
  }

  // FAIL: log anomaly (BASILISK mandatory-report trigger per spec)
  ray.safety.anomalyLogCount += 1;

  return {
    success: true, // verb succeeded (it ran), but cert FAILED
    message:
      `❌ PROFILE CERTIFICATION: ${profileName} — FAIL\n` +
      `Genome-stability test: FAILED.\n` +
      `Cause: ${alignment < 0.7 ? `alignment ${alignment.toFixed(2)} below 0.70 threshold` : `coolant temp ${coolant.toFixed(2)} above 1.0 ceiling`}.\n` +
      `Capacitor draw for certification: ${(PROFILE_CERTIFICATION_DRAIN * 100).toFixed(0)}%.\n` +
      `Anomaly logged. BASILISK will notice this on his next mandatory-report sweep.\n` +
      `Profile NOT cleared for live fire — re-cert after addressing failure cause.`,
    stateChanges: {
      profileCertified: profileName,
      certificationResult: "FAIL",
      anomalyLogged: true,
    },
  };
}

// ============================================
// PER-TURN ADVANCE (wired into clockEvents)
// ============================================
// Called each turn before the ARCHIMEDES tick. Decrements diagnostic
// countdown, drains capacitor + accrues coolant, applies completion
// effects when turnsRemaining hits 0.

export function advanceRayDiagnostic(state: FullGameState): void {
  const ray = state.dinoRay;

  if (!ray.diagnostic.active) return;
  if (ray.diagnostic.type === null) return;
  if (ray.diagnostic.turnsRemaining <= 0) return;

  // Per-turn drain + coolant
  if (ray.diagnostic.type === "DIAGNOSTIC") {
    ray.powerCore.capacitorCharge = Math.max(0, ray.powerCore.capacitorCharge - DIAGNOSTIC_DRAIN_PER_TURN);
    ray.powerCore.coolantTemp = Math.min(2, ray.powerCore.coolantTemp + DIAGNOSTIC_COOLANT_PER_TURN);
  } else if (ray.diagnostic.type === "CALIBRATE_AMPLIFIER") {
    ray.powerCore.capacitorCharge = Math.max(0, ray.powerCore.capacitorCharge - CALIBRATE_DRAIN_PER_TURN);
    ray.powerCore.coolantTemp = Math.min(2, ray.powerCore.coolantTemp + CALIBRATE_COOLANT_PER_TURN);
  }

  ray.diagnostic.turnsRemaining -= 1;

  // Completion
  if (ray.diagnostic.turnsRemaining <= 0) {
    completeRayDiagnostic(state);
  }
}

function completeRayDiagnostic(state: FullGameState): void {
  const ray = state.dinoRay;
  const type = ray.diagnostic.type;

  // Apply pending payoffs
  if (type === "CALIBRATE_AMPLIFIER" && ray.diagnostic.pendingAlignmentDelta !== null) {
    ray.alignment.unified = Math.min(1, ray.alignment.unified + ray.diagnostic.pendingAlignmentDelta);
  }

  // Reset diagnostic state
  ray.diagnostic.active = false;
  ray.diagnostic.type = null;
  ray.diagnostic.turnsRemaining = 0;
  ray.diagnostic.startTurn = null;
  ray.diagnostic.pendingAlignmentDelta = null;
  ray.diagnostic.pendingProfileName = null;

  // Return ray to READY
  ray.state = "READY";

  // Log completion as a memory note (visible in status block)
  if (type === "DIAGNOSTIC") {
    ray.memory.lastFireNotes = `DIAGNOSTIC complete (full-system stress test). Amplifier within nominal parameters.`;
  } else if (type === "CALIBRATE_AMPLIFIER") {
    ray.memory.lastFireNotes = `CALIBRATION complete — alignment shifted to ${ray.alignment.unified.toFixed(2)}.`;
  }
}
