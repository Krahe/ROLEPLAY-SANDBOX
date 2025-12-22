import { randomInt } from "crypto";
import { FullGameState, FiringOutcome } from "../state/schema.js";

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
// MAIN FIRING RESOLUTION
// ============================================

export function resolveFiring(state: FullGameState): FiringResult {
  const ray = state.dinoRay;
  const narrativeHooks: string[] = [];
  const environmentalEffects: string[] = [];
  const stateChanges: Record<string, unknown> = {};

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
    narrativeHooks.push("ECO MODE: Power-saving protocols limit transformation intensity.");
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

  // precision >= 0.7
  if (ray.targeting.precision < 0.7) {
    violations.push(`precision ${ray.targeting.precision.toFixed(2)} < 0.7`);
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
    narrativeHooks.push("Eco mode reduced full transformation to partial.");
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
  // STEP 7: BUILD TARGET EFFECT DESCRIPTION
  // ========================================

  let targetEffect: string;
  const targetId = ray.targeting.currentTargetIds[0] || "UNKNOWN";

  switch (baseOutcome) {
    case "FULL_DINO":
      if (effectiveProfile.toLowerCase().includes("canary")) {
        targetEffect = `${targetId} undergoes complete transformation into a ${effectiveProfile}. ` +
          `The subject is now a small, bright yellow songbird, chirping indignantly but otherwise unharmed.`;
      } else {
        // Check which genome library is active
        const isLibraryA = state.dinoRay.genome.activeLibrary === "A";
        if (isLibraryA) {
          targetEffect = `${targetId} undergoes complete transformation into a scientifically accurate ${effectiveProfile}. ` +
            `Feathers and all. The subject retains full cognition and speech capability.`;
          // Dr. M won't like the feathers - Library A produces accurate dinos
          narrativeHooks.push("NOTE: Dr. M expected scales, not feathers. Suspicion may increase.");
          stateChanges.drMDisappointed = true;
        } else {
          // Library B produces classic movie-style dinosaurs
          targetEffect = `${targetId} undergoes complete transformation into a classic ${effectiveProfile}. ` +
            `Scales gleaming, claws sharp, teeth impressive. The subject retains full cognition and speech capability.`;
          narrativeHooks.push("SUCCESS: Classic dinosaur transformation! Dr. M is pleased.");
          stateChanges.drMPleased = true;
        }
      }
      break;

    case "PARTIAL":
      targetEffect = `${targetId} undergoes PARTIAL transformation. ` +
        `Mixed human/${effectiveProfile} morphology: ${generatePartialEffects()}`;
      break;

    case "CHAOTIC":
      targetEffect = `${targetId} experiences CHAOTIC transformation! ` +
        `The genome matrix destabilized mid-conversion: ${generateChaoticEffects(effectiveProfile)}`;
      break;

    case "FIZZLE":
      targetEffect = `The beam harmlessly disperses before reaching ${targetId}. ` +
        `No transformation effect on living subjects.`;
      break;

    default:
      targetEffect = "Unexpected outcome - consult anomaly logs.";
  }

  // ========================================
  // STEP 8: AFTERMATH STATE CHANGES
  // ========================================

  // Increment anomaly log
  const anomalyIncrement = baseOutcome === "CHAOTIC" ? 3 : baseOutcome === "PARTIAL" ? 2 : 1;
  stateChanges.anomalyLogCount = ray.safety.anomalyLogCount + anomalyIncrement;

  // Record firing memory
  stateChanges.lastFireTurn = state.turn;
  stateChanges.lastFireOutcome = baseOutcome;
  stateChanges.lastFireNotes = `k=${k} violations, profile=${effectiveProfile}`;

  // Discharge capacitor
  const previousCharge = ray.powerCore.capacitorCharge;
  stateChanges.capacitorCharge = Math.max(0, previousCharge - 0.4);

  // Heat up
  stateChanges.coolantTemp = ray.powerCore.coolantTemp + 0.15;

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

  return {
    outcome: baseOutcome,
    effectiveProfile,
    description: buildFiringDescription(baseOutcome, k, violations, chaosFlag),
    targetEffect,
    environmentalEffects,
    stateChanges,
    chaosEvent,
    narrativeHooks,
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
    if (result.outcome === "FULL_DINO") {
      state.npcs.blythe.transformationState = `Full ${result.effectiveProfile}`;
    } else if (result.outcome === "PARTIAL") {
      state.npcs.blythe.transformationState = `Partial ${result.effectiveProfile}`;
    } else if (result.outcome === "CHAOTIC") {
      state.npcs.blythe.transformationState = `Chaotic ${result.effectiveProfile} (unstable)`;
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
}
