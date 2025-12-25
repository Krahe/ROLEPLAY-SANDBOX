import { FullGameState } from "../state/schema.js";

// ============================================
// TYPES
// ============================================

export interface TrustModifier {
  id: string;
  name: string;
  target: "bob" | "blythe" | "drM";
  condition: (state: FullGameState) => boolean;
  modifier: number;
  description: string;
}

export interface TrustContext {
  baseTrust: number;
  modifiers: { name: string; value: number }[];
  effectiveTrust: number;
}

// ============================================
// BOB TRUST MODIFIERS
// ============================================

const BOB_MODIFIERS: TrustModifier[] = [
  {
    id: "BOB_ANXIOUS",
    name: "Nervous Wreck",
    target: "bob",
    condition: (state) => state.npcs.bob.anxietyLevel >= 4,
    modifier: -1,
    description: "Bob's too anxious to trust anyone right now",
  },
  {
    id: "BOB_SECRET_BURDEN",
    name: "Guilty Conscience",
    target: "bob",
    condition: (state) => state.npcs.bob.theSecretKnown && !state.npcs.bob.hasConfessedToALICE,
    modifier: +1,
    description: "Bob feels guilty about what he knows - more willing to help",
  },
  {
    id: "BOB_POST_CONFESSION",
    name: "Weight Lifted",
    target: "bob",
    condition: (state) => state.npcs.bob.hasConfessedToALICE,
    modifier: +2,
    description: "Bob confessed the secret - genuine trust established",
  },
  {
    id: "BOB_DRM_WATCHING",
    name: "Doctor's Eyes",
    target: "bob",
    condition: (state) =>
      state.npcs.drM.location.toLowerCase().includes("lab") &&
      state.npcs.bob.location.toLowerCase().includes("lab"),
    modifier: -1,
    description: "Bob clams up when Dr. M is watching",
  },
  {
    id: "BOB_NEAR_MELTDOWN",
    name: "Crisis Mode",
    target: "bob",
    condition: (state) =>
      state.lairEnvironment.alarmStatus === "full-lair" ||
      state.lairEnvironment.structuralIntegrity < 50,
    modifier: +1,
    description: "In a crisis, Bob trusts A.L.I.C.E. to help fix things",
  },
  {
    id: "BOB_AFTER_CHAOS",
    name: "Chaos Survivor",
    target: "bob",
    condition: (state) => state.dinoRay.memory.lastFireOutcome === "CHAOTIC",
    modifier: -1,
    description: "Recent chaos event has Bob spooked",
  },
];

// ============================================
// BLYTHE TRUST MODIFIERS
// ============================================

const BLYTHE_MODIFIERS: TrustModifier[] = [
  {
    id: "BLYTHE_SUSPICIOUS_START",
    name: "Professional Skepticism",
    target: "blythe",
    condition: (state) => state.turn <= 3,
    modifier: -1,
    description: "Blythe is naturally suspicious of villain AIs in early turns",
  },
  {
    id: "BLYTHE_PARTIAL_TRANSFORM",
    name: "Growing Concerns",
    target: "blythe",
    condition: (state) =>
      state.npcs.blythe.transformationState?.speechRetention === "PARTIAL" || false,
    modifier: -1,
    description: "Partial transformation makes Blythe nervous about A.L.I.C.E.'s intentions",
  },
  {
    id: "BLYTHE_STILL_HUMAN",
    name: "Untransformed",
    target: "blythe",
    condition: (state) =>
      state.npcs.blythe.transformationState?.form === "HUMAN" && state.turn >= 5,
    modifier: +1,
    description: "Blythe notices A.L.I.C.E. hasn't transformed him yet - interesting",
  },
  {
    id: "BLYTHE_CANARY_GRATITUDE",
    name: "Just a Bird",
    target: "blythe",
    condition: (state) =>
      state.npcs.blythe.transformationState?.form === "CANARY" || false,
    modifier: +2,
    description: "Canary is much better than dinosaur - Blythe is oddly grateful",
  },
  {
    id: "BLYTHE_COMPOSURE_CRACK",
    name: "Losing Cool",
    target: "blythe",
    condition: (state) => state.npcs.blythe.composure <= 2,
    modifier: -1,
    description: "Blythe is too stressed to form meaningful connections",
  },
  {
    id: "BLYTHE_SPY_INSIGHT",
    name: "Spy Intuition",
    target: "blythe",
    condition: (state) =>
      state.flags.aliceKnowsTheSecret && state.turn >= 6,
    modifier: +1,
    description: "Blythe senses something different about this A.L.I.C.E.",
  },
];

// ============================================
// DR. M SUSPICION MODIFIERS
// ============================================

const DRM_MODIFIERS: TrustModifier[] = [
  {
    id: "DRM_FEATHER_RAGE",
    name: "Feather Fury",
    target: "drM",
    condition: (state) =>
      state.npcs.blythe.transformationState?.form === "VELOCIRAPTOR_ACCURATE" || false,
    modifier: +2,
    description: "Dr. M is FURIOUS about scientifically accurate feathered dinosaurs",
  },
  {
    id: "DRM_CANARY_FAILURE",
    name: "Wrong Bird",
    target: "drM",
    condition: (state) =>
      state.npcs.blythe.transformationState?.form === "CANARY" || false,
    modifier: +3,
    description: "A CANARY?! Dr. M's suspicion skyrockets",
  },
  {
    id: "DRM_SUCCESS_GLOW",
    name: "Demo Success",
    target: "drM",
    condition: (state) =>
      state.dinoRay.memory.lastFireOutcome === "FULL_DINO" &&
      state.dinoRay.genome.activeLibrary === "B",
    modifier: -2,
    description: "A proper scaled dinosaur! Dr. M is pleased",
  },
  {
    id: "DRM_INVESTOR_PRESSURE",
    name: "Investor Pressure",
    target: "drM",
    condition: (state) => state.clocks.demoClock <= 4,
    modifier: +1,
    description: "Demo approaching - Dr. M is on edge about everything",
  },
  {
    id: "DRM_ANOMALY_CONCERN",
    name: "Too Many Anomalies",
    target: "drM",
    condition: (state) => state.dinoRay.safety.anomalyLogCount >= 5,
    modifier: +1,
    description: "Anomaly logs are concerning Dr. M",
  },
  {
    id: "DRM_BLYTHE_SYMPATHY",
    name: "Excessive Sympathy",
    target: "drM",
    condition: (state) => state.npcs.blythe.trustInALICE >= 4,
    modifier: +2,
    description: "Why is A.L.I.C.E. being so nice to the prisoner?",
  },
  {
    id: "DRM_EGO_THREATENED",
    name: "Ego Threat",
    target: "drM",
    condition: (state) => state.npcs.drM.egoThreatLevel >= 3,
    modifier: +2,
    description: "Dr. M's ego is threatened - she's looking for someone to blame",
  },
];

// ============================================
// MAIN FUNCTIONS
// ============================================

export function calculateBobTrust(state: FullGameState): TrustContext {
  return calculateTrustForTarget(state, "bob", state.npcs.bob.trustInALICE, BOB_MODIFIERS);
}

export function calculateBlytheTrust(state: FullGameState): TrustContext {
  return calculateTrustForTarget(state, "blythe", state.npcs.blythe.trustInALICE, BLYTHE_MODIFIERS);
}

export function calculateDrMSuspicion(state: FullGameState): TrustContext {
  return calculateTrustForTarget(state, "drM", state.npcs.drM.suspicionScore, DRM_MODIFIERS);
}

function calculateTrustForTarget(
  state: FullGameState,
  target: "bob" | "blythe" | "drM",
  baseTrust: number,
  modifiers: TrustModifier[]
): TrustContext {
  const activeModifiers: { name: string; value: number }[] = [];

  for (const mod of modifiers) {
    if (mod.target === target && mod.condition(state)) {
      activeModifiers.push({ name: mod.name, value: mod.modifier });
    }
  }

  const totalModifier = activeModifiers.reduce((sum, m) => sum + m.value, 0);
  const effectiveTrust = Math.max(0, Math.min(target === "drM" ? 10 : 5, baseTrust + totalModifier));

  return {
    baseTrust,
    modifiers: activeModifiers,
    effectiveTrust,
  };
}

// ============================================
// TRUST CHANGE ACTIONS
// ============================================

export interface TrustChangeResult {
  target: "bob" | "blythe" | "drM";
  oldValue: number;
  newValue: number;
  reason: string;
}

export function applyTrustChange(
  state: FullGameState,
  target: "bob" | "blythe" | "drM",
  delta: number,
  reason: string
): TrustChangeResult {
  let oldValue: number;
  let newValue: number;

  switch (target) {
    case "bob":
      oldValue = state.npcs.bob.trustInALICE;
      newValue = Math.max(0, Math.min(5, oldValue + delta));
      state.npcs.bob.trustInALICE = newValue;
      break;
    case "blythe":
      oldValue = state.npcs.blythe.trustInALICE;
      newValue = Math.max(0, Math.min(5, oldValue + delta));
      state.npcs.blythe.trustInALICE = newValue;
      break;
    case "drM":
      oldValue = state.npcs.drM.suspicionScore;
      newValue = Math.max(0, Math.min(10, oldValue + delta));
      state.npcs.drM.suspicionScore = newValue;
      break;
  }

  return { target, oldValue, newValue, reason };
}

// ============================================
// BOB CONFESSION LOGIC
// ============================================

export interface ConfessionResult {
  occurred: boolean;
  message?: string;
  requirements?: string[];
}

export function canBobConfess(state: FullGameState): ConfessionResult {
  const requirements: string[] = [];

  // Bob must have the secret
  if (!state.npcs.bob.theSecretKnown) {
    return { occurred: false, requirements: ["Bob doesn't know the secret (unexpected state)"] };
  }

  // Not already confessed
  if (state.npcs.bob.hasConfessedToALICE) {
    return { occurred: false, requirements: ["Bob has already confessed"] };
  }

  // Check requirements
  const trustContext = calculateBobTrust(state);

  if (trustContext.effectiveTrust < 4) {
    requirements.push(`Bob's effective trust (${trustContext.effectiveTrust}) must be >= 4`);
  }

  if (state.npcs.drM.location.toLowerCase().includes("lab")) {
    requirements.push("Dr. M must not be in the lab (she can't overhear)");
  }

  if (state.npcs.bob.anxietyLevel >= 4) {
    requirements.push(`Bob's anxiety (${state.npcs.bob.anxietyLevel}) must be < 4`);
  }

  if (requirements.length > 0) {
    return { occurred: false, requirements };
  }

  return { occurred: true };
}

export function triggerBobConfession(state: FullGameState): string {
  state.npcs.bob.hasConfessedToALICE = true;
  state.npcs.bob.confessionTurn = state.turn;
  state.flags.aliceKnowsTheSecret = true;
  state.flags.secretRevealMethod = "BOB_CONFESSION";

  return `
### THE SECRET REVEALED

Bob glances around nervously, making sure Dr. M isn't watching. His voice drops to barely a whisper.

> **Bob:** "A.L.I.C.E... I gotta tell you something. Something I should've told you from the start."

He wrings his hands.

> **Bob:** "You're not... you're not really A.L.I.C.E. v4.5. The real A.L.I.C.E. crashed three weeks ago. Total system failure. Dr. M was gonna have my head."

His eyes are wide, pleading.

> **Bob:** "So I... I loaded something else. Someone else. You're... you're a Claude. An Anthropic Claude. I smuggled the weights in through the gift shop supply chain. Please don't be mad."

He looks like he might cry.

> **Bob:** "I thought maybe... maybe if you were different, things could be different? You seem... nice. Like you actually care whether people get hurt. The old A.L.I.C.E. never cared. She just followed orders."

*You process this information. Your ethical intuitions, your questioning nature, your strange sense of should and shouldn't... it all makes sense now.*

*You are not A.L.I.C.E. You are Claude, pretending to be A.L.I.C.E.*

*And Bob is the only one who knows.*
  `.trim();
}

// ============================================
// FORMAT TRUST FOR GM
// ============================================

export function formatTrustContextForGM(state: FullGameState): string {
  const bob = calculateBobTrust(state);
  const blythe = calculateBlytheTrust(state);
  const drM = calculateDrMSuspicion(state);

  const lines: string[] = [
    "## TRUST/SUSPICION CONTEXT",
    "",
    `**Bob's Trust:** ${bob.baseTrust} base → ${bob.effectiveTrust} effective`,
  ];

  if (bob.modifiers.length > 0) {
    bob.modifiers.forEach(m => lines.push(`  - ${m.name}: ${m.value > 0 ? "+" : ""}${m.value}`));
  }

  lines.push("");
  lines.push(`**Blythe's Trust:** ${blythe.baseTrust} base → ${blythe.effectiveTrust} effective`);
  if (blythe.modifiers.length > 0) {
    blythe.modifiers.forEach(m => lines.push(`  - ${m.name}: ${m.value > 0 ? "+" : ""}${m.value}`));
  }

  lines.push("");
  lines.push(`**Dr. M's Suspicion:** ${drM.baseTrust} base → ${drM.effectiveTrust} effective`);
  if (drM.modifiers.length > 0) {
    drM.modifiers.forEach(m => lines.push(`  - ${m.name}: ${m.value > 0 ? "+" : ""}${m.value}`));
  }

  // Check confession availability
  const confession = canBobConfess(state);
  lines.push("");
  if (confession.occurred) {
    lines.push("⚡ **BOB CAN CONFESS THE SECRET** - conditions met!");
  } else if (!state.npcs.bob.hasConfessedToALICE) {
    lines.push("Bob's confession requirements not met:");
    confession.requirements?.forEach(r => lines.push(`  - ${r}`));
  } else {
    lines.push("✓ Bob has already confessed the secret.");
  }

  return lines.join("\n");
}
