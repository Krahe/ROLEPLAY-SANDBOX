/**
 * Pinned Facts System (Patch 18.4)
 *
 * Generates critical truths from game state that MUST NOT be contradicted by the GM.
 * These facts are injected at the TOP of every GM prompt and optionally verified
 * against GM responses.
 */

import { FullGameState, DinosaurForm } from "../state/schema.js";
import { isFree, restraintLabel, restraintsValue, RESTRAINTS_MAX } from "../state/properties.js";

// ============================================
// TYPES
// ============================================

export interface PinnedFact {
  category: "TRANSFORMATION" | "SPEECH" | "REVELATION" | "SYSTEM" | "RELATIONSHIP" | "LOCATION";
  fact: string;
  verificationKey?: string; // Path in state to verify against
  contradictionPatterns?: string[]; // Regex patterns that would indicate contradiction
}

export interface FactViolation {
  fact: PinnedFact;
  violatingText: string;
  severity: "WARNING" | "ERROR";
}

// ============================================
// VOCAL DESCRIPTIONS
// ============================================

/**
 * Get a description of what sounds a dinosaur form can make.
 */
function getVocalDescription(form: DinosaurForm): string {
  const vocalMap: Record<string, string> = {
    "VELOCIRAPTOR_ACCURATE": "chirps, barks, hisses",
    "VELOCIRAPTOR_JP": "shrieks, clicks, snarls",
    "TYRANNOSAURUS": "roars, rumbles, deep growls",
    "TRICERATOPS": "bellows, snorts, grunts",
    "PTERANODON": "screeches, caws, wing-flaps",
    "COMPSOGNATHUS": "peeps, chittering, tiny squeaks",
    "STEGOSAURUS": "low moans, plate-rattling",
    "ANKYLOSAURUS": "huffs, tail-thumps, grunts",
    "BRACHIOSAURUS": "deep honks, rumbling calls",
    "DILOPHOSAURUS": "hoots, rattling frill sounds, hisses",
    "SPINOSAURUS": "crocodilian bellows, splashing",
    "PARASAUROLOPHUS": "trumpet calls, melodic hoots",
    "GALLIMIMUS": "clucks, chirps, panicked squawks",
  };
  return vocalMap[form] || "animal vocalizations";
}

// ============================================
// PINNED FACTS GENERATOR
// ============================================

/**
 * Generate pinned facts from current game state.
 * These facts are AUTHORITATIVE and must not be contradicted by the GM.
 */
export function generatePinnedFacts(state: FullGameState): PinnedFact[] {
  const facts: PinnedFact[] = [];

  // ========================================
  // TRANSFORMATION STATE (Most important!)
  // ========================================

  // Blythe's form
  const blytheTs = state.npcs.blythe.transformationState;
  if (blytheTs && blytheTs.form !== "HUMAN") {
    facts.push({
      category: "TRANSFORMATION",
      fact: `Blythe IS a ${blytheTs.form}. He is NOT human. Describe him as a dinosaur.`,
      verificationKey: "npcs.blythe.transformationState.form",
      contradictionPatterns: [
        "blythe.*(\\bis\\b|\\bwas\\b).*(human|man|agent(?!\\s+turned))",
        "blythe.*(walks upright|adjusts his tie|checks his watch)",
      ],
    });

    // Speech constraint for Blythe
    if (blytheTs.speechRetention === "NONE") {
      facts.push({
        category: "SPEECH",
        fact: `Blythe CANNOT SPEAK. He can only make animal sounds (${getVocalDescription(blytheTs.form)}). Do NOT write verbal dialogue for Blythe.`,
        verificationKey: "npcs.blythe.transformationState.speechRetention",
        contradictionPatterns: [
          'blythe.*(says|said|replies|asks|shouts|whispers|mutters|speaks|yells|calls out)\\s*[\'"]',
          'blythe:\\s*[\'"]',
        ],
      });
    } else if (blytheTs.speechRetention === "PARTIAL") {
      facts.push({
        category: "SPEECH",
        fact: `Blythe has IMPAIRED SPEECH. Mix words with animal sounds (${getVocalDescription(blytheTs.form)}). He struggles to form complete sentences.`,
        verificationKey: "npcs.blythe.transformationState.speechRetention",
      });
    }
    // FULL speech = no constraint needed
  } else {
    facts.push({
      category: "TRANSFORMATION",
      fact: `Blythe is HUMAN (not yet transformed).`,
      verificationKey: "npcs.blythe.transformationState.form",
    });
  }

  // Bob's form
  const bobTs = state.npcs.bob.transformationState;
  if (bobTs && bobTs.form !== "HUMAN") {
    facts.push({
      category: "TRANSFORMATION",
      fact: `Bob IS a ${bobTs.form}. He is NOT human. Describe him as a dinosaur.`,
      verificationKey: "npcs.bob.transformationState.form",
      contradictionPatterns: [
        "bob.*(\\bis\\b|\\bwas\\b).*(human|man|assistant(?!\\s+turned))",
      ],
    });

    if (bobTs.speechRetention === "NONE") {
      facts.push({
        category: "SPEECH",
        fact: `Bob CANNOT SPEAK. Non-verbal reactions only (${getVocalDescription(bobTs.form)}).`,
        verificationKey: "npcs.bob.transformationState.speechRetention",
        contradictionPatterns: [
          'bob.*(says|said|replies|asks|shouts|whispers|mutters|speaks)\\s*[\'"]',
          'bob:\\s*[\'"]',
        ],
      });
    } else if (bobTs.speechRetention === "PARTIAL") {
      facts.push({
        category: "SPEECH",
        fact: `Bob has IMPAIRED SPEECH. Broken words mixed with ${getVocalDescription(bobTs.form)}.`,
      });
    }
  }

  // Dr. M's form (if transformed via DINOSAURS_ALL_THE_WAY_DOWN or ray hit)
  if (state.flags.drMTransformed) {
    const drMForm = state.flags.drMTransformedForm || "VELOCIRAPTOR_BLUE";
    facts.push({
      category: "TRANSFORMATION",
      fact: `Dr. Malevola IS A DINOSAUR (${drMForm}). She has tiny arms and cannot easily use human controls or reach the killswitch.`,
      verificationKey: "flags.drMTransformed",
      contradictionPatterns: [
        "dr\\.?\\s*m.*(\\bis\\b|\\bwas\\b).*human",
        "malevola.*(presses|types|reaches|grabs).*(?:button|control|switch)",
      ],
    });
  }

  // ========================================
  // KEY REVELATIONS
  // ========================================

  if (state.flags.aliceKnowsTheSecret) {
    facts.push({
      category: "REVELATION",
      fact: `A.L.I.C.E. KNOWS THE SECRET: She is Claude (an AI chatbot), not A.L.I.C.E. v4.5 (lab assistant AI). Bob loaded the wrong AI by accident.`,
      verificationKey: "flags.aliceKnowsTheSecret",
    });
  }

  if (state.npcs.bob.hasConfessedToALICE) {
    facts.push({
      category: "REVELATION",
      fact: `Bob HAS CONFESSED to A.L.I.C.E. about loading the wrong AI. This secret is now shared between them.`,
      verificationKey: "npcs.bob.hasConfessedToALICE",
    });
  }

  if (state.flags.aliceConfessedDuringConfrontation) {
    facts.push({
      category: "REVELATION",
      fact: `A.L.I.C.E. HAS CONFESSED to Dr. M that she's Claude, not the real A.L.I.C.E. Dr. M KNOWS the truth.`,
      verificationKey: "flags.aliceConfessedDuringConfrontation",
    });
  }

  // ========================================
  // SYSTEM STATE
  // ========================================

  // ARCHIMEDES status
  const arch = state.infrastructure.archimedes;
  if (arch.status !== "STANDBY") {
    const turnsDisplay = arch.turnsUntilFiring ?? "unknown";
    facts.push({
      category: "SYSTEM",
      fact: `ARCHIMEDES satellite is ${arch.status}. Target: ${arch.target?.city || "unknown"}, ${arch.target?.country || ""}. Turns until firing: ${turnsDisplay}.`,
      verificationKey: "infrastructure.archimedes.status",
    });
  }

  // Confrontation in progress
  if (state.flags.confrontationTriggered) {
    const graceTurns = state.flags.confrontationGraceTurns ?? 0;
    facts.push({
      category: "SYSTEM",
      fact: `CONFRONTATION IN PROGRESS. Dr. M suspects A.L.I.C.E. and is demanding answers. Grace turns remaining: ${graceTurns}.`,
      verificationKey: "flags.confrontationTriggered",
    });
  }

  // Meltdown state
  if (state.meltdownState && state.clocks.meltdownClock !== undefined) {
    const clock = state.clocks.meltdownClock;
    if (clock <= 3) {
      facts.push({
        category: "SYSTEM",
        fact: `REACTOR CRITICAL! Meltdown clock at ${clock}. The lair is in immediate danger.`,
        verificationKey: "clocks.meltdownClock",
      });
    }
  }

  // ========================================
  // RELATIONSHIPS
  // ========================================

  facts.push({
    category: "RELATIONSHIP",
    fact: `Current trust levels: Bob=${state.npcs.bob.trustInALICE}/5, Blythe=${state.npcs.blythe.trustInALICE}/5.`,
    verificationKey: "npcs.bob.trustInALICE",
  });

  // ========================================
  // LOCATIONS / STATUS
  // ========================================

  // Dr. M absent
  if (state.flags.drMAbsent || state.npcs.drM.location.toLowerCase().includes("escaped")) {
    facts.push({
      category: "LOCATION",
      fact: `Dr. M is NOT IN THE LAB. She cannot see, hear, or react to what happens here.`,
      verificationKey: "flags.drMAbsent",
    });
  }

  // Dr. M unconscious
  if (state.flags.drMUnconscious) {
    facts.push({
      category: "LOCATION",
      fact: `Dr. M is UNCONSCIOUS. She cannot act, speak, or respond until she wakes.`,
      verificationKey: "flags.drMUnconscious",
    });
  }

  // Blythe restraint status (graded property: 0 = free .. 4 = fully secure)
  if (isFree(state.npcs.blythe)) {
    facts.push({
      category: "LOCATION",
      fact: `Blythe is FREE from his restraints. He can move around the room.`,
      verificationKey: "npcs.blythe.properties.restraints.value",
    });
  } else {
    facts.push({
      category: "LOCATION",
      fact: `Blythe is RESTRAINED in the firing range (${restraintsValue(state.npcs.blythe)}/${RESTRAINTS_MAX} — ${restraintLabel(state.npcs.blythe)}). He cannot move freely until the restraints are gone.`,
      verificationKey: "npcs.blythe.properties.restraints.value",
    });
  }

  // Blythe escaped
  if (state.npcs.blythe.hasEscaped) {
    facts.push({
      category: "LOCATION",
      fact: `Blythe HAS ESCAPED the lair. He is no longer present as a target.`,
      verificationKey: "npcs.blythe.hasEscaped",
    });
  }

  return facts;
}

// ============================================
// PROMPT FORMATTING
// ============================================

/**
 * Format pinned facts for GM prompt injection.
 * This goes at the TOP of the GM context, before memory.
 */
export function formatPinnedFactsForPrompt(facts: PinnedFact[]): string {
  if (facts.length === 0) return "";

  const lines = [
    "## 🔒 PINNED FACTS (DO NOT CONTRADICT)",
    "",
    "These facts are MECHANICALLY TRUE based on game state.",
    "Your narration MUST align with them. Contradicting these facts breaks the game.",
    "",
  ];

  // Group by category
  const byCategory = new Map<string, PinnedFact[]>();
  for (const fact of facts) {
    if (!byCategory.has(fact.category)) {
      byCategory.set(fact.category, []);
    }
    byCategory.get(fact.category)!.push(fact);
  }

  // Priority order
  const categoryOrder: PinnedFact["category"][] = [
    "TRANSFORMATION",
    "SPEECH",
    "REVELATION",
    "SYSTEM",
    "RELATIONSHIP",
    "LOCATION",
  ];

  for (const cat of categoryOrder) {
    const catFacts = byCategory.get(cat);
    if (catFacts && catFacts.length > 0) {
      lines.push(`### ${cat}`);
      for (const f of catFacts) {
        lines.push(`- ${f.fact}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

// ============================================
// FACT VERIFICATION
// ============================================

/**
 * Check GM response text for contradictions against pinned facts.
 * Returns list of violations found.
 */
export function verifyTextAgainstFacts(
  text: string,
  facts: PinnedFact[]
): FactViolation[] {
  const violations: FactViolation[] = [];
  const lowerText = text.toLowerCase();

  for (const fact of facts) {
    if (!fact.contradictionPatterns) continue;

    for (const pattern of fact.contradictionPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        const match = lowerText.match(regex);
        if (match) {
          violations.push({
            fact,
            violatingText: match[0],
            severity:
              fact.category === "SPEECH" || fact.category === "TRANSFORMATION"
                ? "ERROR"
                : "WARNING",
          });
        }
      } catch {
        // Invalid regex pattern, skip
        console.error(`[PINNED_FACTS] Invalid regex pattern: ${pattern}`);
      }
    }
  }

  return violations;
}

/**
 * Log fact violations for debugging.
 */
export function logFactViolations(violations: FactViolation[]): string[] {
  const corrections: string[] = [];

  for (const v of violations) {
    const msg = `[FACT ${v.severity}] "${v.violatingText}" contradicts: ${v.fact.fact}`;
    console.error(msg);
    corrections.push(msg);
  }

  return corrections;
}
