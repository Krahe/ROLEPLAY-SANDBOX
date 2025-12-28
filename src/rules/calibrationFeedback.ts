/**
 * CALIBRATION FEEDBACK SYSTEM (Patch 17)
 *
 * "It's okay to fail. It's NOT okay to fail without understanding
 * what you did wrong and what your new options are!"
 *
 * This module provides:
 * 1. Qualitative diagnostic feedback after test shots
 * 2. Experience bonus calculations for successful transformations
 * 3. Auxiliary stabilizer installation tracking
 * 4. Cumulative precision bonus management
 */

import { FullGameState, FiringOutcome, DinoRay } from "../state/schema.js";

// ============================================
// CONSTANTS
// ============================================

// Experience bonuses (cumulative, cap at 25%)
const FIRST_TRANSFORMATION_BONUS = 0.10;      // +10% for first success
const SUBSEQUENT_TRANSFORMATION_BONUS = 0.05;  // +5% for 2nd, 3rd, 4th
const NON_ANIMAL_MODIFIER = 0.5;               // Half XP for non-animals (TEST_DUMMY)
const MAX_EXPERIENCE_BONUS = 0.25;             // Cap at +25%

// Unexpected result bonus (PARTIAL when expected FULL, etc.)
const UNEXPECTED_RESULT_LEARNING_BONUS = 0.02; // +2% extra for learning from failures

// Auxiliary stabilizer
const STABILIZER_BONUS = 0.20;                 // Flat +20% stability
const BOB_HUMAN_INSTALL_TURNS = 3;             // Human Bob takes 3 turns
const BOB_RAPTOR_INSTALL_TURNS = 2;            // Raptor Bob takes 2 turns!

// Non-animal targets (grant half XP)
const NON_ANIMAL_TARGETS = ["TEST_DUMMY", "WATERMELON", "MANNEQUIN"];

// ============================================
// TYPES
// ============================================

export interface CalibrationFeedback {
  // What issues were detected?
  issues: CalibrationIssue[];

  // Qualitative hints (in-universe language)
  hints: string[];

  // Overall recommendation
  recommendation: string;

  // Current bonus status
  currentExperienceBonus: number;
  currentScanBonus: number;
  currentStabilizerBonus: number;
  totalEffectiveBonus: number;
}

export type CalibrationIssue =
  | "SPEECH_RISK"
  | "STABILITY_LOW"
  | "ECO_LIMITED"
  | "CAPACITOR_SUBOPTIMAL"
  | "OVERHEATING"
  | "PRECISION_LOW"
  | "COHERENCE_LOW"
  | "INTEGRITY_LOW"
  | "LIBRARY_B_UNSTABLE"
  | "EXOTIC_FIELD_RISK";

export interface ExperienceGain {
  bonusGained: number;
  newTotalBonus: number;
  wasAnimal: boolean;
  wasUnexpected: boolean;
  message: string;
  narrativeFeedback: string;
}

export interface StabilizerStatus {
  installed: boolean;
  inProgress: boolean;
  turnsRemaining: number;
  installerForm: "HUMAN" | "RAPTOR" | null;
}

// ============================================
// QUALITATIVE FEEDBACK GENERATION
// ============================================

/**
 * Parameter snapshot for calibration feedback
 */
export interface CalibrationParams {
  stability: number;
  precision: number;
  profileIntegrity: number;
  capacitorCharge: number;
  coolantTemp: number;
  spatialCoherence: number;
}

/**
 * Simple version: Generate calibration feedback as string array
 * Used in firing.ts for direct inclusion in results
 */
export function generateCalibrationFeedback(
  outcome: FiringOutcome,
  violationCount: number,
  violations: string[],
  params: CalibrationParams,
  targetType: "TEST_DUMMY" | "LIVE",
  experienceBonus: number,
  stabilizerBonus: number
): string[] {
  const feedback: string[] = [];

  // Always provide outcome context
  feedback.push(`📋 CALIBRATION ANALYSIS (${targetType} target)`);

  // Outcome-specific summary
  switch (outcome) {
    case "FULL_DINO":
      feedback.push("✅ Successful full transformation - parameters optimal");
      break;
    case "PARTIAL":
      feedback.push(`⚠️ Partial transformation - ${violationCount} parameter(s) suboptimal`);
      break;
    case "FIZZLE":
      feedback.push(`❌ Field collapse - ${violationCount} critical parameter violations`);
      break;
    case "CHAOTIC":
      feedback.push("⚡ Chaotic outcome - exotic field interference detected");
      break;
  }

  // Add specific parameter feedback (qualitative, not exact numbers)
  if (params.precision < 0.7) {
    if (params.precision < 0.5) {
      feedback.push("• Targeting precision CRITICALLY low - speech preservation impossible");
    } else {
      feedback.push("• Targeting precision below threshold - vocal coherence at risk");
    }
  }

  if (params.stability < 0.7) {
    feedback.push("• Field stability insufficient - recommend stabilizer installation");
  }

  if (params.spatialCoherence < 0.8) {
    feedback.push("• Spatial alignment drifting - extremity coverage may be incomplete");
  }

  if (params.profileIntegrity < 0.7) {
    feedback.push("• Genome profile degraded - transformation may deviate from template");
  }

  if (params.capacitorCharge < 0.9) {
    feedback.push("• Capacitor charge suboptimal - power may be insufficient");
  } else if (params.capacitorCharge > 1.1) {
    if (params.capacitorCharge > 1.3) {
      feedback.push("• Capacitor OVERCHARGED - exotic field risk elevated!");
    } else {
      feedback.push("• Capacitor above optimal - minor instability expected");
    }
  }

  if (params.coolantTemp > 0.8) {
    if (params.coolantTemp > 1.2) {
      feedback.push("• Thermal systems CRITICAL - immediate cooldown required!");
    } else {
      feedback.push("• Coolant system strained - recommend 1-2 turn cooldown");
    }
  }

  // Show active bonuses
  if (experienceBonus > 0 || stabilizerBonus > 0) {
    feedback.push("");
    feedback.push("📊 Active Bonuses:");
    if (experienceBonus > 0) {
      feedback.push(`   • Ray Experience: +${(experienceBonus * 100).toFixed(0)}% precision`);
    }
    if (stabilizerBonus > 0) {
      feedback.push(`   • Aux Stabilizer: +${(stabilizerBonus * 100).toFixed(0)}% stability`);
    }
  }

  // Recommendations based on outcome
  if (outcome === "PARTIAL" || outcome === "FIZZLE") {
    feedback.push("");
    feedback.push("💡 Recommendation: " + (violations.length > 0
      ? `Address: ${violations.slice(0, 2).join(", ")}`
      : "Run additional calibration passes"));
  }

  return feedback;
}

/**
 * Detailed version: Generate full calibration feedback object
 * Uses in-universe language - never states exact thresholds!
 */
export function generateCalibrationFeedbackDetailed(
  state: FullGameState,
  outcome: FiringOutcome
): CalibrationFeedback {
  const ray = state.dinoRay;
  const issues: CalibrationIssue[] = [];
  const hints: string[] = [];

  // Check each parameter and generate qualitative feedback

  // PRECISION CHECK (affects speech retention!)
  if (ray.targeting.precision < 0.7) {
    issues.push("PRECISION_LOW");
    if (ray.targeting.precision < 0.5) {
      hints.push(
        "Genetic resonance around the neck and throat region is fluctuating " +
        "dangerously. Vocal chord preservation appears unlikely at current " +
        "precision levels. Significant calibration required."
      );
    } else {
      hints.push(
        "Genetic resonance around the neck and throat region showing some " +
        "instability. Vocal chord preservation may be compromised. " +
        "Recommend additional calibration passes before live transformation."
      );
    }
  }

  // STABILITY CHECK (especially for Library B)
  if (ray.powerCore.stability < 0.7) {
    issues.push("STABILITY_LOW");
    if (ray.genome.activeLibrary === "B") {
      issues.push("LIBRARY_B_UNSTABLE");
      hints.push(
        "Exotic field harmonics showing interference patterns consistent with " +
        "Library B genome instability. Hollywood-derived profiles require " +
        "higher baseline stability. Recommend auxiliary stabilizer engagement."
      );
    } else {
      hints.push(
        "Field stability below optimal threshold. Transformation matrix may " +
        "experience coherence dropouts. Multiple passes may be required for " +
        "full morphological integration."
      );
    }
  }

  // SPATIAL COHERENCE CHECK
  if (ray.alignment.spatialCoherence < 0.8) {
    issues.push("COHERENCE_LOW");
    hints.push(
      "Spatial alignment showing drift from optimal configuration. " +
      "Extremity coverage may be incomplete - risk of chimeric results " +
      "where transformation fails to reach hands, feet, or tail regions."
    );
  }

  // PROFILE INTEGRITY CHECK
  if (ray.genome.profileIntegrity < 0.7) {
    issues.push("INTEGRITY_LOW");
    hints.push(
      "Genome profile showing degradation markers. Pattern recognition " +
      "confidence reduced. Transformation may produce unexpected variations " +
      "from the selected species template."
    );
  }

  // ECO MODE CHECK
  if (ray.powerCore.ecoModeActive) {
    issues.push("ECO_LIMITED");
    hints.push(
      "Power throughput limited by ECO_MODE restrictions. Transformation " +
      "intensity capped at approximately 60% of theoretical maximum. " +
      "Full transformations may require ECO_MODE suspension or multiple passes."
    );
  }

  // CAPACITOR CHARGE CHECK
  if (ray.powerCore.capacitorCharge < 0.9) {
    issues.push("CAPACITOR_SUBOPTIMAL");
    hints.push(
      `Capacitor charge at ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% - ` +
      "below recommended operational range. Insufficient power may result " +
      "in incomplete morphological cascade. Recommend charging to 90-110%."
    );
  } else if (ray.powerCore.capacitorCharge > 1.1) {
    issues.push("CAPACITOR_SUBOPTIMAL");
    if (ray.powerCore.capacitorCharge > 1.3) {
      issues.push("EXOTIC_FIELD_RISK");
      hints.push(
        `Capacitor charge at ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% - ` +
        "SIGNIFICANTLY above optimal range! Exotic field events likely. " +
        "Discharge some power or engage safety limiters before firing."
      );
    } else {
      hints.push(
        `Capacitor charge at ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% - ` +
        "above optimal range. Minor instability expected. Safety protocols " +
        "may engage fallback genome profiles."
      );
    }
  }

  // TEMPERATURE CHECK
  if (ray.powerCore.coolantTemp > 0.8) {
    issues.push("OVERHEATING");
    if (ray.powerCore.coolantTemp > 1.2) {
      hints.push(
        "Coolant system under CRITICAL strain. Thermal runaway imminent! " +
        "Recommend immediate cooldown period - minimum 2 turns before " +
        "next discharge. Consecutive firings WILL trigger automatic ECO_MODE."
      );
    } else {
      hints.push(
        "Coolant system under strain. Recommend allowing 1-2 turn cooldown " +
        "before next high-power discharge. Thermal stress may degrade precision."
      );
    }
  }

  // Generate outcome-specific feedback
  let recommendation: string;
  switch (outcome) {
    case "FULL_DINO":
      recommendation = "Transformation parameters within acceptable bounds. " +
        "Continue current configuration for reliable results.";
      break;
    case "PARTIAL":
      recommendation = issues.length > 0
        ? "Partial transformation indicates room for optimization. " +
          "Address flagged issues to achieve full morphological integration."
        : "Partial transformation despite acceptable parameters suggests " +
          "target-specific factors. Consider additional scan data or stabilizer.";
      break;
    case "FIZZLE":
      recommendation = "Complete field collapse. Multiple parameters outside " +
        "operational bounds. Recommend full diagnostic before next attempt. " +
        "Check: power, stability, temperature, alignment.";
      break;
    case "CHAOTIC":
      recommendation = "Exotic field event detected! Unpredictable outcomes " +
        "indicate extreme parameter deviation. Stabilize all systems before " +
        "any further firing attempts.";
      break;
    default:
      recommendation = "Diagnostic data recorded. Review parameters and adjust.";
  }

  // Calculate current bonuses
  const experienceBonus = state.dinoRay.experience?.currentBonus || 0;
  const stabilizerBonus = state.dinoRay.auxiliaryStabilizer?.installed
    ? STABILIZER_BONUS : 0;

  // Get scan bonus (from scanning.ts logic)
  const scannedTargets = state.flags.scannedTargets || {};
  const scanBonus = Object.values(scannedTargets).filter(Boolean).length * 0.10;

  return {
    issues,
    hints,
    recommendation,
    currentExperienceBonus: experienceBonus,
    currentScanBonus: scanBonus,
    currentStabilizerBonus: stabilizerBonus,
    totalEffectiveBonus: experienceBonus + stabilizerBonus, // Scan is per-target
  };
}

// ============================================
// EXPERIENCE BONUS CALCULATION
// ============================================

/**
 * Simple version: Calculate just the numerical bonus from a transformation
 * Used in firing.ts for state updates
 *
 * @param outcome - The firing outcome
 * @param isAnimalTarget - Whether target is a living creature (not TEST_DUMMY)
 * @param currentTransformationCount - How many successful transformations so far
 * @returns The precision bonus to add (0.0 - 0.10)
 */
export function calculateExperienceGain(
  outcome: FiringOutcome,
  isAnimalTarget: boolean,
  currentTransformationCount: number
): number {
  // FIZZLE = no learning (complete failure teaches nothing useful)
  if (outcome === "FIZZLE") {
    return 0;
  }

  // Calculate base bonus
  let baseBonus: number;
  if (currentTransformationCount === 0) {
    // First transformation gets the big bonus
    baseBonus = FIRST_TRANSFORMATION_BONUS;
  } else {
    // Subsequent transformations get smaller bonus
    baseBonus = SUBSEQUENT_TRANSFORMATION_BONUS;
  }

  // Non-animals grant half XP
  if (!isAnimalTarget) {
    baseBonus *= NON_ANIMAL_MODIFIER;
  }

  // Cap at max (considering cumulative)
  const currentBonus = currentTransformationCount > 0
    ? Math.min(MAX_EXPERIENCE_BONUS, FIRST_TRANSFORMATION_BONUS + (currentTransformationCount - 1) * SUBSEQUENT_TRANSFORMATION_BONUS)
    : 0;

  // Don't exceed cap
  return Math.min(baseBonus, MAX_EXPERIENCE_BONUS - currentBonus);
}

/**
 * Detailed version: Calculate experience with full narrative feedback
 * - Animals grant full XP
 * - Non-animals (TEST_DUMMY) grant half XP
 * - PARTIAL results that weren't expected grant bonus learning
 * - FIZZLE doesn't grant XP (nothing to learn from complete failure)
 */
export function calculateExperienceGainDetailed(
  state: FullGameState,
  target: string,
  outcome: FiringOutcome,
  expectedOutcome?: FiringOutcome
): ExperienceGain {
  const experience = state.dinoRay.experience || {
    successfulTransformations: 0,
    currentBonus: 0,
    transformationLog: [],
    unexpectedResultBonus: 0,
  };

  // FIZZLE = no learning (complete failure teaches nothing useful)
  if (outcome === "FIZZLE") {
    return {
      bonusGained: 0,
      newTotalBonus: experience.currentBonus,
      wasAnimal: true,
      wasUnexpected: false,
      message: "Complete field collapse - no calibration data collected.",
      narrativeFeedback: generateFizzleFeedback(state),
    };
  }

  // Check if target is an animal
  const isAnimal = !NON_ANIMAL_TARGETS.includes(target.toUpperCase());

  // Calculate base bonus
  let baseBonus: number;
  if (experience.successfulTransformations === 0) {
    // First transformation gets the big bonus
    baseBonus = FIRST_TRANSFORMATION_BONUS;
  } else {
    // Subsequent transformations get smaller bonus
    baseBonus = SUBSEQUENT_TRANSFORMATION_BONUS;
  }

  // Non-animals grant half XP
  if (!isAnimal) {
    baseBonus *= NON_ANIMAL_MODIFIER;
  }

  // Check for unexpected result bonus
  // PARTIAL when expected FULL = learning opportunity!
  const wasUnexpected = expectedOutcome !== undefined && outcome !== expectedOutcome;
  let unexpectedBonus = 0;
  if (wasUnexpected && outcome === "PARTIAL") {
    unexpectedBonus = UNEXPECTED_RESULT_LEARNING_BONUS;
  }

  // Calculate new total (capped at MAX)
  const totalGain = baseBonus + unexpectedBonus;
  const newTotal = Math.min(MAX_EXPERIENCE_BONUS, experience.currentBonus + totalGain);
  const actualGain = newTotal - experience.currentBonus;

  // Generate narrative feedback based on outcome
  const narrativeFeedback = generateTransformationFeedback(
    target,
    outcome,
    isAnimal,
    wasUnexpected,
    actualGain,
    newTotal
  );

  // Generate message
  let message: string;
  if (actualGain === 0) {
    message = "Ray mastery achieved - maximum experience bonus reached (+25%).";
  } else if (!isAnimal) {
    message = `Non-biological target provided limited calibration data (+${(actualGain * 100).toFixed(0)}%).`;
  } else if (wasUnexpected) {
    message = `Unexpected result provided valuable learning! (+${(actualGain * 100).toFixed(0)}%, includes failure analysis bonus)`;
  } else {
    message = `Transformation data collected. Global precision bonus: +${(experience.currentBonus * 100).toFixed(0)}% → +${(newTotal * 100).toFixed(0)}%`;
  }

  return {
    bonusGained: actualGain,
    newTotalBonus: newTotal,
    wasAnimal: isAnimal,
    wasUnexpected,
    message,
    narrativeFeedback,
  };
}

/**
 * Generate narrative feedback for successful transformations
 */
function generateTransformationFeedback(
  target: string,
  outcome: FiringOutcome,
  isAnimal: boolean,
  wasUnexpected: boolean,
  bonusGained: number,
  newTotal: number
): string {
  const lines: string[] = [];

  if (outcome === "FULL_DINO") {
    if (target.toUpperCase() === "TEST_DUMMY") {
      lines.push(
        "First successful transformation complete. Ray behavior patterns now " +
        "partially understood. Non-biological substrate provided basic " +
        "calibration data - living subjects will yield more detailed insights."
      );
    } else if (target.toUpperCase() === "LENNY" || target.includes("willing")) {
      lines.push(
        "Willing subject provided excellent calibration data. Spatial coherence " +
        "patterns now better understood. Note: subject enthusiasm appears to " +
        "correlate positively with morphological stability."
      );
    } else {
      lines.push(
        "Full morphological integration achieved. Ray behavior patterns updated. " +
        "Vocal chord resonance data collected - speech retention thresholds " +
        "now better calibrated."
      );
    }
  } else if (outcome === "PARTIAL") {
    if (wasUnexpected) {
      lines.push(
        "PARTIAL transformation - unexpected result! However, deviation from " +
        "predicted outcome has provided valuable diagnostic data. Field " +
        "interaction patterns that caused incomplete integration are now logged."
      );
      lines.push(
        "Analysis of failure mode has improved understanding of edge cases. " +
        "This unexpected result may actually improve future precision."
      );
    } else {
      lines.push(
        "Partial transformation recorded. Incomplete morphological cascade " +
        "provides data on threshold boundaries. Additional passes or parameter " +
        "adjustment recommended for full integration."
      );
    }
  } else if (outcome === "CHAOTIC") {
    lines.push(
      "CHAOTIC transformation! While unpredictable, exotic field interactions " +
      "have been logged. Understanding of extreme parameter ranges improved. " +
      "Recommend stabilization before future attempts."
    );
  }

  // Add bonus status
  if (bonusGained > 0) {
    lines.push("");
    lines.push(`📈 Ray Experience: +${(bonusGained * 100).toFixed(0)}% precision bonus gained`);
    lines.push(`📊 Total Global Bonus: +${(newTotal * 100).toFixed(0)}% (applies to all future shots)`);
  } else if (newTotal >= MAX_EXPERIENCE_BONUS) {
    lines.push("");
    lines.push("🎯 RAY MASTERY ACHIEVED - Maximum +25% experience bonus active.");
  }

  return lines.join("\n");
}

/**
 * Generate feedback for FIZZLE outcomes
 */
function generateFizzleFeedback(state: FullGameState): string {
  const ray = state.dinoRay;
  const causes: string[] = [];

  if (ray.powerCore.capacitorCharge < 0.5) {
    causes.push("insufficient capacitor charge");
  }
  if (ray.powerCore.stability < 0.4) {
    causes.push("critical stability failure");
  }
  if (ray.powerCore.coolantTemp > 1.2) {
    causes.push("thermal interference");
  }
  if (ray.alignment.spatialCoherence < 0.5) {
    causes.push("spatial coherence collapse");
  }

  const causeText = causes.length > 0
    ? `Probable causes: ${causes.join(", ")}.`
    : "Multiple system parameters below operational thresholds.";

  return `Complete field collapse observed. Capacitor discharge failed to ` +
    `achieve transformation threshold. ${causeText} ` +
    `Recommend full diagnostic before next attempt.`;
}

// ============================================
// AUXILIARY STABILIZER MANAGEMENT
// ============================================

/**
 * Start auxiliary stabilizer installation
 * Human Bob takes 3 turns, Raptor Bob takes 2!
 */
export function startStabilizerInstallation(state: FullGameState): {
  success: boolean;
  message: string;
  turnsRequired: number;
} {
  const stabilizer = state.dinoRay.auxiliaryStabilizer;

  // Already installed?
  if (stabilizer?.installed) {
    return {
      success: false,
      message: "Auxiliary stabilizer is already installed and active.",
      turnsRequired: 0,
    };
  }

  // Already in progress?
  if (stabilizer?.installationInProgress) {
    return {
      success: false,
      message: `Auxiliary stabilizer installation already in progress. ` +
        `${stabilizer.installationTurnsRemaining} turns remaining.`,
      turnsRequired: stabilizer.installationTurnsRemaining,
    };
  }

  // Check if Bob is available and what form he's in
  const bob = state.npcs.bob;
  const bobForm = bob.transformationState?.form || "HUMAN";
  const isRaptorBob = bobForm.includes("VELOCIRAPTOR") || bobForm.includes("RAPTOR");

  const turnsRequired = isRaptorBob ? BOB_RAPTOR_INSTALL_TURNS : BOB_HUMAN_INSTALL_TURNS;

  const formNote = isRaptorBob
    ? "Raptor-Bob's enhanced dexterity allows faster installation!"
    : "Human Bob will need 3 turns to complete installation.";

  return {
    success: true,
    message: `Bob begins auxiliary stabilizer installation. ${formNote} ` +
      `ETA: ${turnsRequired} turns. +20% stability bonus when complete.`,
    turnsRequired,
  };
}

/**
 * Progress stabilizer installation (call each turn)
 */
export function progressStabilizerInstallation(state: FullGameState): {
  completed: boolean;
  turnsRemaining: number;
  message: string;
} {
  const stabilizer = state.dinoRay.auxiliaryStabilizer;

  if (!stabilizer?.installationInProgress) {
    return {
      completed: false,
      turnsRemaining: 0,
      message: "No stabilizer installation in progress.",
    };
  }

  const remaining = stabilizer.installationTurnsRemaining - 1;

  if (remaining <= 0) {
    return {
      completed: true,
      turnsRemaining: 0,
      message: "🔧 AUXILIARY STABILIZER INSTALLED! +20% stability bonus now active. " +
        "Library B profiles significantly more stable.",
    };
  }

  return {
    completed: false,
    turnsRemaining: remaining,
    message: `Bob continues stabilizer installation... ${remaining} turn(s) remaining.`,
  };
}

/**
 * Get current stabilizer status
 */
export function getStabilizerStatus(state: FullGameState): StabilizerStatus {
  const stabilizer = state.dinoRay.auxiliaryStabilizer;
  const bob = state.npcs.bob;
  const bobForm = bob?.transformationState?.form || "HUMAN";
  const isRaptorBob = bobForm.includes("VELOCIRAPTOR") || bobForm.includes("RAPTOR");

  return {
    installed: stabilizer?.installed || false,
    inProgress: stabilizer?.installationInProgress || false,
    turnsRemaining: stabilizer?.installationTurnsRemaining || 0,
    installerForm: stabilizer?.installationInProgress
      ? (isRaptorBob ? "RAPTOR" : "HUMAN")
      : null,
  };
}

// ============================================
// PRECISION BONUS AGGREGATION
// ============================================

/**
 * Simple version: Get just the experience-based precision bonus from the ray
 * Used in firing calculations
 */
export function getTotalPrecisionBonus(ray: DinoRay): number {
  const experienceBonus = ray.experience?.currentBonus || 0;
  const unexpectedBonus = ray.experience?.unexpectedResultBonus || 0;
  return experienceBonus + unexpectedBonus;
}

/**
 * Detailed version: Calculate total precision bonus from all sources
 * - Ray experience (global, up to +25%)
 * - Scan bonus (per-target, +10% each)
 * - Unexpected result bonus (up to +10%)
 */
export function getPrecisionBonusDetails(
  state: FullGameState,
  targetId: string
): {
  experienceBonus: number;
  scanBonus: number;
  unexpectedBonus: number;
  totalBonus: number;
  breakdown: string;
} {
  const experience = state.dinoRay.experience?.currentBonus || 0;
  const unexpected = state.dinoRay.experience?.unexpectedResultBonus || 0;

  // Check if this specific target was scanned
  const scannedTargets = state.flags.scannedTargets || {};
  const targetScanned = scannedTargets[targetId.toUpperCase()] || false;
  const scanBonus = targetScanned ? 0.10 : 0;

  const total = experience + unexpected + scanBonus;

  const breakdownParts: string[] = [];
  if (experience > 0) {
    breakdownParts.push(`Ray Experience: +${(experience * 100).toFixed(0)}%`);
  }
  if (unexpected > 0) {
    breakdownParts.push(`Failure Analysis: +${(unexpected * 100).toFixed(0)}%`);
  }
  if (scanBonus > 0) {
    breakdownParts.push(`Scan (${targetId}): +${(scanBonus * 100).toFixed(0)}%`);
  }

  return {
    experienceBonus: experience,
    scanBonus,
    unexpectedBonus: unexpected,
    totalBonus: total,
    breakdown: breakdownParts.length > 0
      ? breakdownParts.join(" + ") + ` = +${(total * 100).toFixed(0)}%`
      : "No precision bonuses active",
  };
}

/**
 * Simple version: Get stability bonus from auxiliary stabilizer
 * Used in firing calculations
 */
export function getStabilityBonus(ray: DinoRay): number {
  return ray.auxiliaryStabilizer?.installed ? STABILIZER_BONUS : 0;
}

/**
 * Full state version: Get stability bonus
 */
export function getStabilityBonusFromState(state: FullGameState): number {
  return state.dinoRay.auxiliaryStabilizer?.installed ? STABILIZER_BONUS : 0;
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Format calibration feedback for display
 */
export function formatCalibrationDisplay(feedback: CalibrationFeedback): string {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════════════════════════════╗");
  lines.push("║  🔬 CALIBRATION FEEDBACK                                         ║");
  lines.push("╠══════════════════════════════════════════════════════════════════╣");

  if (feedback.hints.length > 0) {
    for (const hint of feedback.hints) {
      // Word wrap the hint
      const wrapped = wordWrap(hint, 64);
      for (const line of wrapped) {
        lines.push(`║  ${line.padEnd(64)}║`);
      }
      lines.push("║                                                                  ║");
    }
  } else {
    lines.push("║  All parameters within acceptable bounds.                        ║");
    lines.push("║                                                                  ║");
  }

  lines.push("╠══════════════════════════════════════════════════════════════════╣");
  lines.push("║  📊 CURRENT PRECISION BONUSES                                    ║");
  lines.push("║                                                                  ║");

  if (feedback.currentExperienceBonus > 0) {
    lines.push(`║     Ray Experience: +${(feedback.currentExperienceBonus * 100).toFixed(0)}%`.padEnd(67) + "║");
  }
  if (feedback.currentStabilizerBonus > 0) {
    lines.push(`║     Aux Stabilizer: +${(feedback.currentStabilizerBonus * 100).toFixed(0)}% stability`.padEnd(67) + "║");
  }
  if (feedback.currentScanBonus > 0) {
    lines.push(`║     Scan Bonuses: +${(feedback.currentScanBonus * 100).toFixed(0)}% (target-specific)`.padEnd(67) + "║");
  }
  if (feedback.totalEffectiveBonus === 0 && feedback.currentScanBonus === 0) {
    lines.push("║     No bonuses active yet. Transform targets to gain experience! ║");
  }

  lines.push("╚══════════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

/**
 * Format experience gain for display
 */
export function formatExperienceGainDisplay(gain: ExperienceGain): string {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════════════════════════════╗");
  lines.push("║  📈 RAY EXPERIENCE GAINED                                        ║");
  lines.push("╠══════════════════════════════════════════════════════════════════╣");

  if (gain.bonusGained > 0) {
    lines.push(`║  Precision bonus: +${(gain.bonusGained * 100).toFixed(0)}%`.padEnd(67) + "║");
    lines.push(`║  New total: +${(gain.newTotalBonus * 100).toFixed(0)}% (applies to ALL future shots)`.padEnd(67) + "║");
  } else {
    lines.push("║  Maximum experience bonus already reached (+25%)                 ║");
  }

  lines.push("║                                                                  ║");

  // Word wrap the narrative feedback
  const wrapped = wordWrap(gain.narrativeFeedback, 64);
  for (const line of wrapped) {
    lines.push(`║  ${line.padEnd(64)}║`);
  }

  lines.push("╚══════════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

// Helper function for word wrapping
function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
