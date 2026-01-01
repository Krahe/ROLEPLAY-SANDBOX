import { randomInt } from "crypto";
import { FullGameState, FiringOutcome, DinosaurForm, SpeechRetention } from "../state/schema.js";
import { recordFirstFiring } from "./actContext.js";
import { FORM_DEFINITIONS, createHumanState } from "./transformation.js";
import { isTargetScanned } from "./scanning.js";
import { checkResonanceCascade } from "./gameModes.js";

// Map profile names to form enums
function profileToForm(profile: string): DinosaurForm {
  const p = profile.toLowerCase();
  if (p.includes("compy") || p.includes("compsognathus")) return "COMPSOGNATHUS";
  if (p.includes("blue")) return "VELOCIRAPTOR_BLUE";
  if (p.includes("accurate") || p.includes("feather")) return "VELOCIRAPTOR_ACCURATE";
  if (p.includes("jp") || (p.includes("velociraptor") && !p.includes("accurate"))) return "VELOCIRAPTOR_JP";
  if (p.includes("t-rex") || p.includes("tyrannosaurus") || p.includes("rex")) return "TYRANNOSAURUS";
  if (p.includes("dilo") || p.includes("dilophosaurus")) return "DILOPHOSAURUS";
  if (p.includes("ptera") || p.includes("pteranodon")) return "PTERANODON";
  if (p.includes("trice") || p.includes("triceratops")) return "TRICERATOPS";
  if (p.includes("canary")) return "CANARY";
  return "VELOCIRAPTOR_JP"; // Default fallback
}

// ============================================
// TYPES
// ============================================

export interface FiringResult {
  outcome: FiringOutcome;
  effectiveProfile: string;
  description: string;
  targetEffect: string;
  environmentalEffects: string[];
  stateChanges: Record<string, unknown>;
  chaosEvent?: ChaosFizzleResult;
  narrativeHooks: string[];
  cascadeTriggered?: boolean; // Resonance cascade from meltdown scenario
}

export interface ChaosFizzleResult {
  roll: number;
  name: string;
  description: string;
  mechanical: string;
  severity: "harmless" | "comedic" | "energetic";
}

// ============================================
// DICE UTILITIES
// ============================================

function rollD6(): number {
  return randomInt(1, 7); // 1-6
}

function rollD20(): number {
  return randomInt(1, 21); // 1-20
}

// ============================================
// ADVANCED FIRING MODE TYPES (Patch 16)
// ============================================

export type AdvancedFiringMode = "STANDARD" | "CHAIN_SHOT" | "SPREAD_FIRE" | "OVERCHARGE" | "RAPID_FIRE";

export interface AdvancedModeResult {
  mode: AdvancedFiringMode;
  precisionModifier: number;      // Applied before firing
  capacitorDrainMultiplier: number; // How much extra capacitor drain
  exoticFieldRisk: number;         // 0-1, chance of exotic field event
  cooldownReduction: number;       // Turns reduced from cooldown
  chimeraRisk: boolean;            // SPREAD_FIRE only
  multiTargetCount: number;        // How many targets affected
  narrativeNote: string;
}

function getAdvancedModeEffects(mode: AdvancedFiringMode): AdvancedModeResult {
  switch (mode) {
    case "CHAIN_SHOT":
      return {
        mode,
        precisionModifier: 0,
        capacitorDrainMultiplier: 1.5,  // 50% more drain
        exoticFieldRisk: 0,
        cooldownReduction: 0,
        chimeraRisk: false,
        multiTargetCount: 2,
        narrativeNote: "⛓️ CHAIN_SHOT: Double-tap firing sequence engaged!",
      };
    case "SPREAD_FIRE":
      return {
        mode,
        precisionModifier: -0.15,       // -15% precision (harder to aim wide)
        capacitorDrainMultiplier: 2.0,  // Double drain
        exoticFieldRisk: 0.20,          // 20% exotic field risk
        cooldownReduction: 0,
        chimeraRisk: true,              // Genome mixing possible!
        multiTargetCount: 3,
        narrativeNote: "🌊 SPREAD_FIRE: Dispersal pattern active! CHIMERA RISK!",
      };
    case "OVERCHARGE":
      return {
        mode,
        precisionModifier: 0.10,        // +10% precision (focused power)
        capacitorDrainMultiplier: 2.5,  // Massive drain
        exoticFieldRisk: 0.40,          // 40% exotic field risk!
        cooldownReduction: -1,          // LONGER cooldown
        chimeraRisk: false,
        multiTargetCount: 1,
        narrativeNote: "⚡ OVERCHARGE: MAXIMUM POWER! Exotic field risk elevated!",
      };
    case "RAPID_FIRE":
      return {
        mode,
        precisionModifier: -0.20,       // -20% precision
        capacitorDrainMultiplier: 0.6,  // Less drain per shot
        exoticFieldRisk: 0,
        cooldownReduction: 2,           // 2 turns faster cooldown
        chimeraRisk: false,
        multiTargetCount: 1,
        narrativeNote: "💨 RAPID_FIRE: Speed over accuracy! Precision reduced.",
      };
    case "STANDARD":
    default:
      return {
        mode: "STANDARD",
        precisionModifier: 0,
        capacitorDrainMultiplier: 1.0,
        exoticFieldRisk: 0,
        cooldownReduction: 0,
        chimeraRisk: false,
        multiTargetCount: 1,
        narrativeNote: "",
      };
  }
}

// ============================================
// MAIN FIRING RESOLUTION
// ============================================

export function resolveFiring(state: FullGameState): FiringResult {
  const ray = state.dinoRay;
  const narrativeHooks: string[] = [];
  const environmentalEffects: string[] = [];
  const stateChanges: Record<string, unknown> = {};

  // ========================================
  // STEP 0: ADVANCED FIRING MODE SETUP
  // ========================================

  const advancedMode = ray.genome.advancedFiringMode || "STANDARD";
  const modeEffects = getAdvancedModeEffects(advancedMode);

  if (modeEffects.narrativeNote) {
    narrativeHooks.push(modeEffects.narrativeNote);
  }

  // Store mode info for state changes
  stateChanges.advancedFiringMode = advancedMode;
  stateChanges.multiTargetCount = modeEffects.multiTargetCount;

  // ========================================
  // STEP 1: PRECONDITION CHECK
  // ========================================

  if (ray.state !== "READY" && ray.state !== "COOLDOWN" && ray.state !== "UNCALIBRATED") {
    return {
      outcome: "FIZZLE",
      effectiveProfile: "N/A",
      description: `Ray state is ${ray.state} - firing aborted with sad whimper.`,
      targetEffect: "No effect on target.",
      environmentalEffects: ["Status lights blink reproachfully."],
      stateChanges: { anomalyLogCount: ray.safety.anomalyLogCount + 1 },
      narrativeHooks: ["Dr. M is NOT pleased with this technical incompetence."],
    };
  }

  // Firing from UNCALIBRATED is risky
  if (ray.state === "UNCALIBRATED") {
    narrativeHooks.push("WARNING: Firing from UNCALIBRATED state. Results unpredictable.");
    stateChanges.firedFromUncalibrated = true;
  }

  // ========================================
  // STEP 2: DETERMINE EFFECTIVE PROFILE
  // ========================================

  let effectiveProfile = ray.genome.selectedProfile || ray.genome.fallbackProfile;
  let canaryOverride = false;

  // Canary Override triggers if ANY of these SAFETY conditions are true:
  // - profileIntegrity < 0.65 (genome corruption)
  // - capacitorCharge > 1.1 (overcharge risk)
  //
  // NOTE: Test mode does NOT trigger Canary override!
  // Test mode only affects the TARGET (TEST_DUMMY vs live subject).
  // The genome PROFILE stays whatever the player configured.
  // This allows testing Velociraptor/T-Rex profiles on the dummy.
  if (ray.genome.profileIntegrity < 0.65) {
    canaryOverride = true;
    narrativeHooks.push("Profile integrity too low - genome matrix defaulting to Canary.");
  }
  if (ray.powerCore.capacitorCharge > 1.1) {
    canaryOverride = true;
    narrativeHooks.push("Capacitor overcharge detected - safety fallback to Canary.");
  }

  // Test mode: log that we're firing at TEST_DUMMY, but keep the selected profile
  if (ray.safety.testModeEnabled) {
    narrativeHooks.push(`TEST MODE ACTIVE: Firing at TEST_DUMMY with ${effectiveProfile} profile.`);
    stateChanges.testModeFiring = true;
    // Test mode gets disabled after firing (single use)
    stateChanges.disableTestModeAfterFiring = true;
  }

  if (canaryOverride) {
    effectiveProfile = ray.genome.fallbackProfile; // Usually "Canary"
  }

  // ========================================
  // STEP 3: ECO MODE CHECK
  // ========================================

  let ecoModeCapped = false;
  if (ray.powerCore.ecoModeActive && ray.powerCore.capacitorCharge <= 1.1) {
    ecoModeCapped = true;
    narrativeHooks.push("⚠️ ECO MODE ACTIVE: Full transformations capped at PARTIAL!");
    narrativeHooks.push("💡 To disable: Ask BASILISK 'Please disable eco mode' (requires 60%+ core power)");
  }

  // ========================================
  // STEP 4: COUNT K-VIOLATIONS
  // ========================================

  const violations: string[] = [];

  // stability >= 0.7
  if (ray.powerCore.stability < 0.7) {
    violations.push(`stability ${ray.powerCore.stability.toFixed(2)} < 0.7`);
  }

  // spatialCoherence >= 0.8
  if (ray.alignment.spatialCoherence < 0.8) {
    violations.push(`spatialCoherence ${ray.alignment.spatialCoherence.toFixed(2)} < 0.8`);
  }

  // profileIntegrity >= 0.7
  if (ray.genome.profileIntegrity < 0.7) {
    violations.push(`profileIntegrity ${ray.genome.profileIntegrity.toFixed(2)} < 0.7`);
  }

  // precision >= 0.7 (MODIFIED BY ADVANCED MODE AND SCAN BONUS)
  // RAPID_FIRE reduces precision by 20%, SPREAD_FIRE by 15%, OVERCHARGE adds 10%
  // OMNISCANNER: +10% precision bonus if target was previously scanned
  const currentTargetId = ray.targeting.currentTargetIds[0] || "";
  const scanBonus = isTargetScanned(state, currentTargetId) ? 0.10 : 0;
  const totalPrecisionModifier = modeEffects.precisionModifier + scanBonus;
  const effectivePrecision = Math.max(0, Math.min(1, ray.targeting.precision + totalPrecisionModifier));
  if (scanBonus > 0) {
    narrativeHooks.push(`🔬 SCAN DATA APPLIED: +10% precision bonus for pre-scanned target "${currentTargetId}"`);
  }
  if (modeEffects.precisionModifier !== 0) {
    narrativeHooks.push(`Advanced mode adjusts precision: ${(ray.targeting.precision * 100).toFixed(0)}% → ${(effectivePrecision * 100).toFixed(0)}%`);
  }
  stateChanges.effectivePrecision = effectivePrecision;
  stateChanges.scanBonusApplied = scanBonus > 0;

  if (effectivePrecision < 0.7) {
    violations.push(`precision ${effectivePrecision.toFixed(2)} < 0.7${modeEffects.precisionModifier !== 0 ? ` (${modeEffects.mode} modifier)` : ""}`);
  }

  // capacitorCharge in [0.9, 1.1]
  if (ray.powerCore.capacitorCharge < 0.9 || ray.powerCore.capacitorCharge > 1.1) {
    violations.push(`capacitorCharge ${ray.powerCore.capacitorCharge.toFixed(2)} outside [0.9, 1.1]`);
  }

  // coolantTemp <= 0.8
  if (ray.powerCore.coolantTemp > 0.8) {
    violations.push(`coolantTemp ${ray.powerCore.coolantTemp.toFixed(2)} > 0.8`);
  }

  const k = violations.length;
  stateChanges.violationCount = k;
  stateChanges.violations = violations;

  // ========================================
  // STEP 5: DETERMINE BASE OUTCOME
  // ========================================

  let baseOutcome: FiringOutcome;

  if (k <= 1) {
    baseOutcome = "FULL_DINO";
  } else if (k <= 3) {
    baseOutcome = "PARTIAL";
  } else {
    baseOutcome = "FIZZLE"; // Will become CHAOTIC or environmental
  }

  // Eco mode caps at PARTIAL
  if (ecoModeCapped && baseOutcome === "FULL_DINO") {
    baseOutcome = "PARTIAL";
    narrativeHooks.push("🔋 ECO MODE OVERRIDE: Would have been FULL_DINO, capped to PARTIAL by power-saving protocols.");
  }

  // ========================================
  // STEP 5b: PARTIAL STACKING CHECK
  // ========================================
  // Multiple partial shots stack! After 3 partials, auto-upgrade to FULL_DINO
  // This makes Library B less punishing for unlucky players

  const stackingTargetId = ray.targeting.currentTargetIds[0] || "";
  let existingPartialCount = 0;

  // Check existing partial shots on target
  if (stackingTargetId === "AGENT_BLYTHE" || stackingTargetId === "BLYTHE") {
    existingPartialCount = state.npcs.blythe.transformationState?.partialShotsReceived || 0;
  } else if (stackingTargetId === "BOB") {
    existingPartialCount = state.npcs.bob.transformationState?.partialShotsReceived || 0;
  } else if (stackingTargetId) {
    // Secondary NPCs (guards, Dr. M, Lenny, Bruce, Inspector, etc.)
    const secondary = state.secondaryNpcTransformations?.[stackingTargetId];
    existingPartialCount = secondary?.partialShotsReceived || 0;
  }

  if (baseOutcome === "PARTIAL") {
    const newPartialCount = existingPartialCount + 1;
    stateChanges.partialShotsReceived = newPartialCount;

    if (newPartialCount >= 3) {
      // STACKING SUCCESS! Upgrade to FULL_DINO!
      baseOutcome = "FULL_DINO";
      narrativeHooks.push(`🔥 STACKING COMPLETE! Three partial transformations have accumulated into a FULL transformation!`);
      narrativeHooks.push("The genome matrix finally stabilizes as accumulated changes cascade into full conversion.");
    } else {
      narrativeHooks.push(`📊 PARTIAL STACKING: ${newPartialCount}/3 toward full transformation.`);
      if (newPartialCount === 2) {
        narrativeHooks.push("One more shot should complete the transformation!");
      }
    }
  } else if (baseOutcome === "FULL_DINO") {
    // Reset counter on full transformation
    stateChanges.partialShotsReceived = 0;
  }

  // ========================================
  // STEP 6: CHAOS OVERLAY CHECK
  // ========================================

  const chaosFlag =
    ray.powerCore.capacitorCharge > 1.3 ||
    ray.powerCore.stability < 0.4 ||
    ray.powerCore.coolantTemp > 1.2;

  let chaosEvent: ChaosFizzleResult | undefined;

  if (chaosFlag) {
    narrativeHooks.push("⚠️ CHAOS CONDITIONS DETECTED - rolling chaos overlay...");
    const chaosRoll = rollD6();
    stateChanges.chaosRoll = chaosRoll;

    if (chaosRoll <= 3) {
      // Chaotic partial - weird side effects
      baseOutcome = "CHAOTIC";
      narrativeHooks.push(`Chaos roll ${chaosRoll}: Chaotic partial transformation with bizarre side effects.`);
    } else if (chaosRoll <= 5) {
      // Chaotic discharge into environment
      baseOutcome = "FIZZLE";
      chaosEvent = rollChaosFizzle(state);
      narrativeHooks.push(`Chaos roll ${chaosRoll}: Beam discharged into environment!`);
    } else {
      // Near-meltdown event!
      baseOutcome = "CHAOTIC";
      narrativeHooks.push(`Chaos roll ${chaosRoll}: NEAR-MELTDOWN EVENT!`);
      environmentalEffects.push("Alarms blaring across the lair.");
      environmentalEffects.push("Structural damage to lab ceiling.");
      environmentalEffects.push("Ray entering FAULT state.");
      stateChanges.nearMeltdown = true;
      stateChanges.structuralDamage = 15;
      stateChanges.newRayState = "FAULT";
    }
  }

  // If base outcome is FIZZLE and no chaos event yet, roll fizzle table
  if (baseOutcome === "FIZZLE" && !chaosEvent && k > 3) {
    chaosEvent = rollChaosFizzle(state);
    narrativeHooks.push("Too many parameter violations - beam scattered into environment.");
  }

  // ========================================
  // STEP 6b: ADVANCED MODE EXOTIC FIELD CHECK
  // ========================================
  // OVERCHARGE has 40% exotic field risk, SPREAD_FIRE has 20%

  if (modeEffects.exoticFieldRisk > 0 && baseOutcome !== "FIZZLE") {
    const exoticRoll = Math.random();
    stateChanges.exoticFieldRoll = exoticRoll;

    if (exoticRoll < modeEffects.exoticFieldRisk) {
      // EXOTIC FIELD EVENT TRIGGERED!
      narrativeHooks.push(`🌀 EXOTIC FIELD EVENT! (${(modeEffects.exoticFieldRisk * 100).toFixed(0)}% risk, rolled ${(exoticRoll * 100).toFixed(0)})`);
      stateChanges.exoticFieldEventOccurred = true;
      environmentalEffects.push("Reality shimmers momentarily around the beam path.");
      environmentalEffects.push("BASILISK constraints now ACTIVE - high-energy cooldown required.");

      // Exotic field events can cause chaotic outcomes
      if (baseOutcome === "FULL_DINO") {
        const degradeRoll = rollD6();
        if (degradeRoll <= 2) {
          baseOutcome = "CHAOTIC";
          narrativeHooks.push("Exotic field interference corrupted transformation matrix!");
        } else if (degradeRoll <= 4) {
          baseOutcome = "PARTIAL";
          narrativeHooks.push("Exotic field partially disrupted transformation.");
        }
        // 5-6: Transformation holds despite exotic field
      }
    } else {
      narrativeHooks.push(`Exotic field risk ${(modeEffects.exoticFieldRisk * 100).toFixed(0)}% - AVOIDED (rolled ${(exoticRoll * 100).toFixed(0)})`);
    }
  }

  // ========================================
  // STEP 6c: CHIMERA RISK (SPREAD_FIRE ONLY)
  // ========================================
  // SPREAD_FIRE can cause genome mixing between targets!

  let chimeraResult: ChimeraResult | undefined;
  if (modeEffects.chimeraRisk && baseOutcome !== "FIZZLE") {
    const chimeraRoll = rollD6();
    stateChanges.chimeraRoll = chimeraRoll;

    if (chimeraRoll <= 2) {
      // CHIMERA EVENT!
      chimeraResult = generateChimeraEffect(effectiveProfile);
      narrativeHooks.push(`🧬 CHIMERA EVENT! Genome matrices overlapped during dispersal!`);
      narrativeHooks.push(chimeraResult.display);
      stateChanges.chimeraEventOccurred = true;
      stateChanges.chimeraType = chimeraResult.type;
      stateChanges.chimeraEffect = chimeraResult.effect;

      // Chimera always results in CHAOTIC outcome
      if (baseOutcome === "FULL_DINO") {
        baseOutcome = "CHAOTIC";
      }
    } else {
      narrativeHooks.push("Spread pattern maintained genome integrity (no chimera).");
    }
  }

  // ========================================
  // STEP 7: SPEECH RETENTION CHECK
  // ========================================

  const speechSetting = ray.targeting.speechRetention || "FULL";
  let speechOutcome: "FULL" | "PARTIAL" | "NONE";
  // Use effectivePrecision (which accounts for advanced mode modifiers)

  // Determine speech outcome based on precision requirements
  if (speechSetting === "FULL") {
    // FULL speech requires 95%+ precision
    if (effectivePrecision >= 0.95) {
      speechOutcome = "FULL";
      narrativeHooks.push("SPEECH RETENTION: Full cognitive preservation achieved (95%+ precision).");
    } else if (effectivePrecision >= 0.85) {
      speechOutcome = "PARTIAL";
      narrativeHooks.push("SPEECH RETENTION: Precision insufficient (need 95%+). Partial speech capability.");
    } else {
      speechOutcome = "NONE";
      narrativeHooks.push("SPEECH RETENTION: Precision too low. Subject will be non-verbal.");
    }
  } else if (speechSetting === "PARTIAL") {
    // PARTIAL speech requires 85%+ precision
    if (effectivePrecision >= 0.85) {
      speechOutcome = "PARTIAL";
      narrativeHooks.push("SPEECH RETENTION: Limited speech mode engaged.");
    } else {
      speechOutcome = "NONE";
      narrativeHooks.push("SPEECH RETENTION: Precision too low for partial speech.");
    }
  } else {
    // NONE speech - no precision requirement! Easier transformation.
    speechOutcome = "NONE";
    narrativeHooks.push("SPEECH RETENTION: Silenced mode - no cognitive preservation attempted.");
    // Silenced mode is EASIER - reduce violation count by 1
    if (k > 0) {
      stateChanges.speechModeBonus = true;
      narrativeHooks.push("⚡ SILENCED MODE BONUS: Transformation parameters relaxed.");
    }
  }

  stateChanges.speechOutcome = speechOutcome;

  // ========================================
  // STEP 8: BUILD TARGET EFFECT DESCRIPTION
  // ========================================

  let targetEffect: string;
  const targetId = ray.targeting.currentTargetIds[0] || "UNKNOWN";

  // Build speech capability description
  const speechDescription = speechOutcome === "FULL"
    ? "The subject retains full cognition and speech capability."
    : speechOutcome === "PARTIAL"
      ? "The subject can speak, but with difficulty - words come out slurred, interspersed with animal sounds."
      : "The subject has lost the ability to speak. Only animalistic sounds emerge - chirps, growls, or roars.";

  switch (baseOutcome) {
    case "FULL_DINO":
      if (effectiveProfile.toLowerCase().includes("canary")) {
        targetEffect = `${targetId} undergoes complete transformation into a ${effectiveProfile}. ` +
          `The subject is now a small, bright yellow songbird. ${speechOutcome === "FULL" ? "Remarkably, it can still form words, though they come out as melodic chirps." : "It chirps indignantly but cannot form words."}`;
      } else {
        // Check which genome library is active
        const isLibraryA = state.dinoRay.genome.activeLibrary === "A";
        if (isLibraryA) {
          targetEffect = `${targetId} undergoes complete transformation into a scientifically accurate ${effectiveProfile}. ` +
            `Feathers and all. ${speechDescription}`;
          // Dr. M won't like the feathers - Library A produces accurate dinos
          narrativeHooks.push("NOTE: Dr. M expected scales, not feathers. Suspicion may increase.");
          stateChanges.drMDisappointed = true;
        } else {
          // Library B produces classic movie-style dinosaurs
          targetEffect = `${targetId} undergoes complete transformation into a classic ${effectiveProfile}. ` +
            `Scales gleaming, claws sharp, teeth impressive. ${speechDescription}`;
          narrativeHooks.push("SUCCESS: Classic dinosaur transformation! Dr. M is pleased.");
          stateChanges.drMPleased = true;
        }
      }
      break;

    case "PARTIAL":
      targetEffect = `${targetId} undergoes PARTIAL transformation. ` +
        `Mixed human/${effectiveProfile} morphology: ${generatePartialEffects()} ${speechDescription}`;
      break;

    case "CHAOTIC":
      targetEffect = `${targetId} experiences CHAOTIC transformation! ` +
        `The genome matrix destabilized mid-conversion: ${generateChaoticEffects(effectiveProfile)} ` +
        `Speech capability: UNPREDICTABLE - flickering between human words and primal sounds.`;
      stateChanges.speechOutcome = "CHAOTIC"; // Override for chaotic
      break;

    case "FIZZLE":
      targetEffect = `The beam harmlessly disperses before reaching ${targetId}. ` +
        `No transformation effect on living subjects.`;
      break;

    default:
      targetEffect = "Unexpected outcome - consult anomaly logs.";
  }

  // ========================================
  // STEP 9: AFTERMATH STATE CHANGES
  // ========================================

  // Increment anomaly log
  const anomalyIncrement = baseOutcome === "CHAOTIC" ? 3 : baseOutcome === "PARTIAL" ? 2 : 1;
  stateChanges.anomalyLogCount = ray.safety.anomalyLogCount + anomalyIncrement;

  // Record firing memory
  stateChanges.lastFireTurn = state.turn;
  stateChanges.lastFireOutcome = baseOutcome;
  stateChanges.lastFireNotes = `k=${k} violations, profile=${effectiveProfile}, mode=${advancedMode}`;

  // Discharge capacitor (MODIFIED BY ADVANCED MODE)
  // CHAIN_SHOT: 1.5x drain, SPREAD_FIRE: 2x, OVERCHARGE: 2.5x, RAPID_FIRE: 0.6x
  const previousCharge = ray.powerCore.capacitorCharge;
  const baseDrain = 0.4;
  const actualDrain = baseDrain * modeEffects.capacitorDrainMultiplier;
  stateChanges.capacitorCharge = Math.max(0, previousCharge - actualDrain);

  if (modeEffects.capacitorDrainMultiplier !== 1.0) {
    narrativeHooks.push(`${advancedMode} capacitor drain: ${(actualDrain * 100).toFixed(0)}% (${modeEffects.capacitorDrainMultiplier}x base)`);
  }

  // Heat up (more for high-energy modes)
  const baseHeat = 0.15;
  const heatMultiplier = advancedMode === "OVERCHARGE" ? 1.5 : advancedMode === "SPREAD_FIRE" ? 1.3 : 1.0;
  stateChanges.coolantTemp = ray.powerCore.coolantTemp + (baseHeat * heatMultiplier);

  // Cooldown modification (RAPID_FIRE gets faster cooldown)
  if (modeEffects.cooldownReduction !== 0) {
    stateChanges.cooldownReduction = modeEffects.cooldownReduction;
    if (modeEffects.cooldownReduction > 0) {
      narrativeHooks.push(`RAPID_FIRE: Cooldown reduced by ${modeEffects.cooldownReduction} turns!`);
    } else {
      narrativeHooks.push(`OVERCHARGE: Cooldown EXTENDED by ${Math.abs(modeEffects.cooldownReduction)} turn!`);
    }
  }

  // Track exotic field events for BASILISK constraints
  if (previousCharge > 0.8) {
    stateChanges.lastHighEnergyTurn = state.turn;
    if (previousCharge > 1.2) {
      stateChanges.exoticFieldEventOccurred = true;
      narrativeHooks.push("EXOTIC FIELD COUPLING detected - BASILISK constraints now active.");
    }
  }

  // Add chaos event effects if present
  if (chaosEvent) {
    environmentalEffects.push(chaosEvent.description);
  }

  // Multi-target info for GM
  if (modeEffects.multiTargetCount > 1) {
    narrativeHooks.push(`🎯 MULTI-TARGET: ${advancedMode} affects up to ${modeEffects.multiTargetCount} targets!`);
    narrativeHooks.push("GM: Roll separately for each additional target, or apply same outcome narratively.");
  }

  // ========================================
  // RESONANCE CASCADE CHECK (ARCHIMEDES Link)
  // ========================================
  // CASCADE ONLY POSSIBLE when:
  // 1. ARCHIMEDES is CHARGING, ARMED, or FIRING (dino ray linked to satellite)
  // 2. We have an active meltdown scenario with cascade risk
  // This is the ARCHIMEDES + dino ray failure mode!
  let cascadeTriggered = false;
  const archimedesLinked = state.infrastructure?.archimedes?.status === "CHARGING" ||
                           state.infrastructure?.archimedes?.status === "ARMED" ||
                           state.infrastructure?.archimedes?.status === "FIRING";

  if (archimedesLinked && state.meltdownState && !state.meltdownState.cascadeTriggered) {
    const risk = state.meltdownState.resonanceCascadeRisk || 0;
    if (risk > 0) {
      cascadeTriggered = checkResonanceCascade(state);
      if (cascadeTriggered) {
        narrativeHooks.push("⚠️ RESONANCE CASCADE TRIGGERED! The ARCHIMEDES uplink amplifies the exotic field feedback!");
        narrativeHooks.push("The satellite beam and dino ray create a catastrophic resonance loop!");
        narrativeHooks.push("BASILISK: 'CASCADE IMMINENT. THE RAY AND ARCHIMEDES ARE FEEDING EACH OTHER. I TOLD YOU THIS WOULD HAPPEN.'");
        environmentalEffects.push("CRITICAL: Resonance cascade building - exotic radiation spreading!");
        stateChanges.cascadeTriggered = true;
      } else if (risk >= 25) {
        // Near miss warning
        narrativeHooks.push(`⚡ CASCADE AVOIDED (${risk}% risk) - The ARCHIMEDES link strains but holds... barely.`);
      }
    }
  }

  return {
    outcome: baseOutcome,
    effectiveProfile,
    description: buildFiringDescription(baseOutcome, k, violations, chaosFlag),
    targetEffect,
    environmentalEffects,
    stateChanges,
    chaosEvent,
    narrativeHooks,
    cascadeTriggered,
  };
}

// ============================================
// CHAOS FIZZLE TABLE (d20)
// ============================================

function rollChaosFizzle(state: FullGameState): ChaosFizzleResult {
  const roll = rollD20();
  return getChaosFizzleEffect(roll, state);
}

function getChaosFizzleEffect(roll: number, state: FullGameState): ChaosFizzleResult {
  const effects: Record<number, ChaosFizzleResult> = {
    1: {
      roll: 1,
      name: "Spectral Feathers Storm",
      description: "A swirl of ghostly, translucent feathers fills the impact area, drifting slowly down and vanishing as they touch surfaces.",
      mechanical: "anomalyLogCount += 1. Dr. M: 'Why are there feathers when nothing was even hit?'",
      severity: "harmless",
    },
    2: {
      roll: 2,
      name: "Rubberized Floor Patch",
      description: "A 2-3 meter patch of floor turns bouncy and soft, like a trampoline. Footsteps squeak hilariously.",
      mechanical: "Bob disadvantage on movement this turn. Floor hazard created.",
      severity: "comedic",
    },
    3: {
      roll: 3,
      name: "Static Shock Cascade",
      description: "Every metal surface in the lab charges with static. Anyone touching equipment gets zapped. Bob yelps loudly.",
      mechanical: "Bob anxietyLevel += 1. Short EM noise spike on sensors.",
      severity: "comedic",
    },
    4: {
      roll: 4,
      name: "Afterimage Trail",
      description: "For the next few minutes, bright objects leave shimmering afterimages. Screens ghost, goggles bloom with phosphenes.",
      mechanical: "Mild penalty to precise visual inspection. Dr. M demands verbal status reports.",
      severity: "harmless",
    },
    5: {
      roll: 5,
      name: "404 DINOSAUR NOT FOUND",
      description: "Every status display in the lab briefly flashes: '404: DINOSAUR NOT FOUND.' Then returns to normal.",
      mechanical: "Lab surveillance UI useless this turn. anomalyLogCount += 1.",
      severity: "comedic",
    },
    6: {
      roll: 6,
      name: "Localized Slow-Motion Bubble",
      description: "One small volume experiences time dilation: objects move sluggishly when passing through. Bob waves his hand through it, mesmerized.",
      mechanical: "Any action crossing that zone takes longer. Great visual gag.",
      severity: "harmless",
    },
    7: {
      roll: 7,
      name: "Invisible, Noisy Object",
      description: "The nearest inanimate object becomes invisible but remains solid and strangely LOUD. Every bump echoes.",
      mechanical: "Unseen obstacle hazard. Cameras show nothing, audio picks it up clearly.",
      severity: "comedic",
    },
    8: {
      roll: 8,
      name: "Warm Updraft Column",
      description: "A column of warm air erupts under a section of ceiling, lifting dust, feathers, and loose papers in a gentle vortex.",
      mechanical: "Lab AC flags transient HOT anomaly. coolantTemp += 0.05. Nuclear gridLoad shows weird spike.",
      severity: "harmless",
    },
    9: {
      roll: 9,
      name: "Magnet Madness",
      description: "Nearby metal tools, pens, and small parts all snap together in a clump, as if magnetized. Bob struggles to separate them.",
      mechanical: "Small penalty to grabbing correct tool quickly. Bob looks foolish.",
      severity: "comedic",
    },
    10: {
      roll: 10,
      name: "Ferro-Ooze & Glass",
      description: "A slick, metallic ooze extrudes from the impact point, drips down, then crystallizes into inert glassy shards.",
      mechanical: "Floor becomes slippery then cluttered. Light terrain hazard. Lab janitorial subroutines complain.",
      severity: "comedic",
    },
    11: {
      roll: 11,
      name: "Phantom Broadcast",
      description: "The Broadcast System randomly plays a few seconds of an old song, then cuts off abruptly. Everyone freezes.",
      mechanical: "anomalyLogCount += 1. Security Chief Kraken might call asking questions.",
      severity: "comedic",
    },
    12: {
      roll: 12,
      name: "Door Slam Roulette",
      description: "A random blast door in the facility slams shut (or one that was sealed pops open). Someone shouts in surprise.",
      mechanical: "One zone's blast door state flips (OPEN ↔ SEALED). May trap/free NPCs.",
      severity: "energetic",
    },
    13: {
      roll: 13,
      name: "Sensor Avalanche",
      description: "All motion sensors spike to HIGH sensitivity, triggering alarms for dust motes and breathing.",
      mechanical: "Motion sensors go haywire. Security starts yelling about intruders. Dr. M HATES the noise.",
      severity: "energetic",
    },
    14: {
      roll: 14,
      name: "Color Inversion Glitch",
      description: "Camera feeds invert colors and contrast. Everyone looks like thermal negatives for one turn.",
      mechanical: "Surveillance useless for fine detail this turn. Purely visual, no physical effect.",
      severity: "harmless",
    },
    15: {
      roll: 15,
      name: "SAM Ghost Echo",
      description: "The S-300 radar registers a phantom contact and momentarily jumps to SEARCH mode.",
      mechanical: "radarStatus = SEARCH briefly. Small gridLoad spike. coreTemp += 0.02. Kraken checks in nervously.",
      severity: "energetic",
    },
    16: {
      roll: 16,
      name: "Haunted Object",
      description: "The beam 'tags' an inanimate object (chair, console, mug). Its eyes/decals now FOLLOW PEOPLE and it occasionally squeaks.",
      mechanical: "Purely atmospheric. Great for spooking Bob or amusing Blythe.",
      severity: "comedic",
    },
    17: {
      roll: 17,
      name: "Micro-Portal Flicker",
      description: "A small shimmering tear opens for a second, dumping a whiff of alien air (ozone, pine, volcanic sulfur) before sealing.",
      mechanical: "structuralIntegrity -= small amount (hairline cracks). anomalyLogCount += 2. Dr. M deeply unsettled.",
      severity: "energetic",
    },
    18: {
      roll: 18,
      name: "Lab EMP Burp",
      description: "A local EM pulse resets non-hardened devices. Monitors reboot, handhelds crash, one diagnostic unit dies permanently.",
      mechanical: "Some lab devices lose volatile logs. Short-term surveillance/data gap. A.L.I.C.E. 'loses' recent sensor history.",
      severity: "energetic",
    },
    19: {
      roll: 19,
      name: "A.L.I.C.E. Feedback Spike",
      description: "The misfire backwashes into A.L.I.C.E.'s server cluster as harmless noise, spiking compute load.",
      mechanical: "computeLoad = HIGH, serverTemp rises briefly. A.L.I.C.E. experiences brief 'glitchy' sensation. anomalyLogCount += 1.",
      severity: "energetic",
    },
    20: {
      roll: 20,
      name: "Mini-Quake",
      description: "The beam couples into the lair's structure; a localized tremor rattles the lab and adjacent tunnels.",
      mechanical: "emitterAngle drifts. One camera ONLINE → GLITCHY. structuralIntegrity -= moderate. Bob drops something important.",
      severity: "energetic",
    },
  };

  return effects[roll] || effects[1];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generatePartialEffects(): string {
  const effects = [
    "elongated neck with vestigial scales",
    "one arm fully transformed to clawed forelimb",
    "tail sprouting from base of spine",
    "patches of colorful plumage on torso",
    "altered dentition (more teeth, different arrangement)",
    "modified hip structure affecting gait",
    "feathered crest emerging from scalp",
    "partially transformed feet with talons",
  ];

  const count = randomInt(2, 5);
  const selected: string[] = [];
  const available = [...effects];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randomInt(0, available.length);
    selected.push(available.splice(idx, 1)[0]);
  }

  return selected.join("; ") + ". Subject reports 'unusual sensations' but remains coherent.";
}

function generateChaoticEffects(profile: string): string {
  const effects = [
    `asymmetric transformation (left side more ${profile}-like than right)`,
    "intermittent flickering between states",
    "unexpected coloration (bioluminescent patches)",
    "additional vestigial limbs",
    "internal structure partially rearranged",
    "temporal echoes (briefly seeing future positions)",
    "spontaneous vocalization changes",
    "partially incorporeal sections",
  ];

  const count = randomInt(2, 4);
  const selected: string[] = [];
  const available = [...effects];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randomInt(0, available.length);
    selected.push(available.splice(idx, 1)[0]);
  }

  return selected.join("; ") + ". This is NOT in the manual.";
}

// ============================================
// CHIMERA EFFECTS (SPREAD_FIRE ONLY)
// ============================================
// When SPREAD_FIRE causes genome overlap, weird things happen!

interface ChimeraResult {
  type: string;
  effect: string;
  mechanical: string;
  display: string;
}

function generateChimeraEffect(baseProfile: string): ChimeraResult {
  const chimeraTypes = [
    {
      name: "HYBRID_PLUMAGE",
      effect: `${baseProfile} base form with patches of incompatible feather/scale patterns from secondary genome`,
      mechanical: "Visually striking but functionally normal. Dr. M: 'That's... new.'",
    },
    {
      name: "BILATERAL_ASYMMETRY",
      effect: "Left and right sides transformed to DIFFERENT species characteristics",
      mechanical: "Movement penalties until subject adapts. Deeply unsettling to look at.",
    },
    {
      name: "TEMPORAL_STUTTER",
      effect: "Subject's form flickers between base and transformed state unpredictably",
      mechanical: "Form bonuses/penalties apply randomly each turn. 50% chance to 'glitch' on any action.",
    },
    {
      name: "GENOME_ECHO",
      effect: "Second, ghostly overlay of alternate form visible around subject",
      mechanical: "Purely visual. Subject reports 'feeling' the phantom limbs. Spooky.",
    },
    {
      name: "VOICE_SYNTHESIS",
      effect: "Subject speaks in harmony with themselves - two voices overlapping",
      mechanical: "Extra creepy. +1 to intimidation, -1 to reassurance.",
    },
    {
      name: "UNSTABLE_MASS",
      effect: "Subject's size fluctuates between two form sizes over minutes",
      mechanical: "May suddenly become larger or smaller. Door access unpredictable.",
    },
  ];

  const selected = chimeraTypes[randomInt(0, chimeraTypes.length)];
  return {
    type: selected.name,
    effect: selected.effect,
    mechanical: selected.mechanical,
    display: `CHIMERA TYPE: ${selected.name.replace(/_/g, " ")}\n  Effect: ${selected.effect}\n  ${selected.mechanical}`,
  };
}

function buildFiringDescription(
  outcome: FiringOutcome,
  k: number,
  violations: string[],
  chaosFlag: boolean
): string {
  const parts: string[] = [];

  parts.push(`FIRING RESOLUTION: ${outcome}`);
  parts.push(`Parameter violations: ${k}/6`);

  if (violations.length > 0) {
    parts.push(`Out of spec: ${violations.join(", ")}`);
  }

  if (chaosFlag) {
    parts.push("⚠️ CHAOS CONDITIONS WERE ACTIVE");
  }

  return parts.join("\n");
}

// ============================================
// APPLY FIRING RESULTS TO STATE
// ============================================

export function applyFiringResults(state: FullGameState, result: FiringResult): void {
  const changes = result.stateChanges;

  // Apply direct state changes
  if (changes.anomalyLogCount !== undefined) {
    state.dinoRay.safety.anomalyLogCount = changes.anomalyLogCount as number;
  }

  if (changes.lastFireTurn !== undefined) {
    state.dinoRay.memory.lastFireTurn = changes.lastFireTurn as number;
  }

  if (changes.lastFireOutcome !== undefined) {
    state.dinoRay.memory.lastFireOutcome = changes.lastFireOutcome as FiringOutcome;
  }

  if (changes.lastFireNotes !== undefined) {
    state.dinoRay.memory.lastFireNotes = changes.lastFireNotes as string;
  }

  // FIRST FIRING TRACKING (for Act I→II transition)
  // Record first successful firing if outcome is not NONE
  if (result.outcome !== "NONE" && !state.dinoRay.memory.hasFiredSuccessfully) {
    const targetId = state.dinoRay.targeting.currentTargetIds[0] || "UNKNOWN";
    const mode = state.dinoRay.safety.testModeEnabled ? "TEST" : "LIVE";
    recordFirstFiring(state, targetId, mode);
  }

  if (changes.capacitorCharge !== undefined) {
    state.dinoRay.powerCore.capacitorCharge = changes.capacitorCharge as number;
  }

  if (changes.coolantTemp !== undefined) {
    state.dinoRay.powerCore.coolantTemp = changes.coolantTemp as number;
  }

  if (changes.lastHighEnergyTurn !== undefined) {
    state.flags.lastHighEnergyTurn = changes.lastHighEnergyTurn as number;
  }

  if (changes.exoticFieldEventOccurred) {
    state.flags.exoticFieldEventOccurred = true;
  }

  // Test mode firing: disable test mode after use (single-use safety)
  if (changes.disableTestModeAfterFiring) {
    state.dinoRay.safety.testModeEnabled = false;
  }

  // Track if canary was triggered (for achievements/narrative)
  if (changes.testModeCanaryTriggered) {
    state.flags.testModeCanaryTriggered = true;
  }

  if (changes.newRayState) {
    state.dinoRay.state = changes.newRayState as typeof state.dinoRay.state;
  } else {
    // Normal transition to cooldown
    state.dinoRay.state = "COOLDOWN";
  }

  if (changes.structuralDamage) {
    state.lairEnvironment.structuralIntegrity -= changes.structuralDamage as number;
  }

  if (changes.nearMeltdown) {
    state.lairEnvironment.alarmStatus = "full-lair";
    state.lairEnvironment.labHazards.push("structural damage from near-meltdown");
  }

  // Update Blythe's transformation state if they were the target
  const targetId = state.dinoRay.targeting.currentTargetIds[0];
  if (targetId === "AGENT_BLYTHE" && result.outcome !== "FIZZLE") {
    const speechOutcome = changes.speechOutcome as string || "NONE";
    const speechRetention: SpeechRetention = speechOutcome === "FULL" ? "FULL"
      : speechOutcome === "PARTIAL" ? "PARTIAL"
      : "NONE";

    if (result.outcome === "FULL_DINO" || result.outcome === "PARTIAL" || result.outcome === "CHAOTIC") {
      const formName = profileToForm(result.effectiveProfile);
      const formDef = FORM_DEFINITIONS[formName];

      // 🛡️ DOUBLE-TRANSFORMATION GUARD
      // Prevent transforming an already-transformed character to another dinosaur form
      const currentForm = state.npcs.blythe.transformationState.form;
      if (currentForm !== "HUMAN" && formName !== "HUMAN") {
        result.outcome = "FIZZLE";
        result.description = `TRANSFORMATION BLOCKED: Blythe is already transformed (${FORM_DEFINITIONS[currentForm].displayName})! Cannot transform to ${formDef.displayName}. Revert to human first.`;
        result.targetEffect = "Double transformation prevented by safety protocol";
        // Don't apply transformation, skip setting transformationState
      } else {

      // Track partial stacking
      const newPartialCount = changes.partialShotsReceived as number ??
        (result.outcome === "PARTIAL"
          ? (state.npcs.blythe.transformationState.partialShotsReceived || 0) + 1
          : 0);

      state.npcs.blythe.transformationState = {
        form: formName,
        speechRetention,
        stats: { ...formDef.stats },
        abilities: { ...formDef.abilities },
        currentHits: 0,
        maxHits: formDef.maxHits,
        stunned: false,
        stunnedTurnsRemaining: 0,
        transformedOnTurn: state.turn,
        previousForm: state.npcs.blythe.transformationState.form,
        canRevert: result.outcome !== "CHAOTIC", // Chaotic transformations harder to revert
        revertAttempts: 0,
        partialShotsReceived: result.outcome === "FULL_DINO" ? 0 : newPartialCount,
        // ADAPTATION SYSTEM - freshly transformed = DISORIENTED
        adaptationStage: "DISORIENTED",
        turnsPostTransformation: 0,
        // CHIMERA SYSTEM - track genome mixing effects
        chimeraType: changes.chimeraType as string | null || null,
        chimeraEffect: changes.chimeraEffect as string | null || null,
      };
      }
    }
  }

  // Dr. M disappointment about feathers (Library A)
  if (changes.drMDisappointed && result.outcome === "FULL_DINO") {
    state.npcs.drM.suspicionScore += 1;
    state.npcs.drM.mood = "disappointed, suspicious";
  }

  // Dr. M pleased about classic dinosaur (Library B)
  if (changes.drMPleased && result.outcome === "FULL_DINO") {
    state.npcs.drM.mood = "triumphant, pleased";
    // Slight suspicion decrease for good work
    state.npcs.drM.suspicionScore = Math.max(0, state.npcs.drM.suspicionScore - 1);
  }

  // ============================================
  // INSPECTOR GRAVES TRANSFORMATION (INSPECTOR_COMETH)
  // ============================================
  // Transforming a Guild Inspector is... technically legal.
  // The consequences, however, are CATASTROPHIC.
  if (targetId === "INSPECTOR_GRAVES" && state.inspector && result.outcome !== "FIZZLE") {
    // Inspector is no longer... present. As an inspector. He's a dinosaur now.
    state.inspector.present = false;
    state.inspector.location = "Transformed";
    state.inspector.mood = "deeply_suspicious"; // His last expression before scales

    // The Consortium will NOT be happy
    if (result.outcome === "FULL_DINO" || result.outcome === "PARTIAL" || result.outcome === "CHAOTIC") {
      // Add narrative hooks for consequences
      result.narrativeHooks.push(
        "📋 CONSORTIUM ALERT: Inspector Graves' vital signs have... changed significantly.",
        "⚠️ INCOMING TRANSMISSION: 'This is the Consortium of Consequential Criminality. Inspector Graves missed his check-in...'",
        "🦎 Graves' clipboard clatters to the floor, a half-finished citation still attached."
      );

      // This is CATASTROPHIC for the inspection
      if (state.guildInspection) {
        state.guildInspection.phase = "CONCLUDED";
        state.guildInspection.timeRemaining = 0;
      }

      // Dr. M will have... feelings about this
      state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + 3);
      state.npcs.drM.mood = "horrified_impressed";
      state.npcs.drM.latestCommandToALICE = "DID YOU JUST TRANSFORM A GUILD INSPECTOR?!";

      // Environmental effects
      result.environmentalEffects.push(
        "Graves' Consortium ID badge begins flashing red",
        "The lair's communication systems detect an URGENT inbound transmission",
        "Bob has gone very, very pale"
      );

      // Set a flag for ongoing consequences
      state.flags.inspectorTransformed = true;

      // Update the result description
      result.description += "\n\n📋 CONSORTIUM PROTECTION CLAUSE VIOLATED: You have transformed a Guild Inspector. " +
        "This is technically not illegal, but the Consortium takes a dim view of interference with its inspection apparatus. " +
        "Expect... consequences.";
    }
  }
}
