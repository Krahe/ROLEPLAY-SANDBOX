import { FullGameState } from "../state/schema.js";
import { recordBlytheEscape } from "./actContext.js";

// ============================================
// GADGET TYPES
// ============================================

export interface GadgetActivation {
  gadgetId: string;
  success: boolean;
  narration: string;
  stateChanges: Record<string, unknown>;
  consequences?: string[];
}

export interface GadgetDefinition {
  id: string;
  name: string;
  description: string;
  canActivate: (state: FullGameState) => boolean;
  activate: (state: FullGameState) => GadgetActivation;
}

// ============================================
// BLYTHE'S GADGET INVENTORY
// Watch = Laser + Comms (no EMP - that's for HMS Persistence's torpedo!)
// Cufflinks = Super-magnet (2 charges, push/pull/repel)
// ============================================

const WATCH_LASER: GadgetDefinition = {
  id: "WATCH_LASER",
  name: "Watch Laser",
  description: "Precision cutting laser. 3 charges. Can cut through restraints or damage equipment.",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return gadgets.watchLaser.functional && gadgets.watchLaser.charges > 0;
  },

  activate: (state) => {
    state.npcs.blytheGadgets.watchLaser.charges -= 1;
    const chargesRemaining = state.npcs.blytheGadgets.watchLaser.charges;

    // Determine what Blythe targets
    const isRestrained = state.npcs.blythe.restraintsStatus === "secure";

    if (isRestrained) {
      state.npcs.blythe.restraintsStatus = "partially compromised";

      return {
        gadgetId: "WATCH_LASER",
        success: true,
        narration: `
### GADGET ACTIVATED: Watch Laser

A thin red beam emits from Blythe's watch face. Smoke rises from his wrist restraint.

> **Blythe:** "Bit warm in here, isn't it?"

He's cutting through his restraints. Not completely free yet, but the bindings are weakening.

> **Bob:** "Uh... A.L.I.C.E.? The spy is doing something with his watch..."

*Blythe gives Bob an innocent smile.*

**Laser charges remaining: ${chargesRemaining}**
        `.trim(),
        stateChanges: {
          blytheRestraints: "partially compromised",
          blytheEscapeProgress: 1,
        },
        consequences: [
          "Blythe is working on freeing himself",
          `${chargesRemaining} laser charges remaining`,
          "Bob noticed—will he tell Dr. M?",
        ],
      };
    } else {
      // Already partially free, continue cutting
      state.npcs.blythe.restraintsStatus = "nearly free";

      return {
        gadgetId: "WATCH_LASER",
        success: true,
        narration: `
### GADGET ACTIVATED: Watch Laser (Continued)

The laser hums again. More smoke. Blythe's restraints are barely holding.

> **Blythe:** "Almost there..."

**Laser charges remaining: ${chargesRemaining}**
        `.trim(),
        stateChanges: {
          blytheRestraints: "nearly free",
          blytheEscapeProgress: 2,
        },
        consequences: [
          "Blythe is nearly free",
          "One more activation will release him completely",
        ],
      };
    }
  },
};

const WATCH_COMMS: GadgetDefinition = {
  id: "WATCH_COMMS",
  name: "Watch Communications",
  description: "Encrypted comm link to X-Branch. Can call for extraction.",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return gadgets.watchComms.functional;
  },

  activate: (state) => {
    // Comms only work if Blythe has some freedom
    const canSendMessage = state.npcs.blythe.restraintsStatus !== "secure";

    if (!canSendMessage) {
      return {
        gadgetId: "WATCH_COMMS",
        success: false,
        narration: `
### GADGET BLOCKED: Watch Communications

Blythe tries to activate his comm link, but with his hands fully restrained, he can't reach the transmit button.

> **Blythe:** *muttering* "Bloody restraints..."
        `.trim(),
        stateChanges: {},
      };
    }

    // Successfully sends message
    return {
      gadgetId: "WATCH_COMMS",
      success: true,
      narration: `
### GADGET ACTIVATED: Watch Communications

With his partially freed hand, Blythe taps a sequence on his watch face.

> **Blythe:** *quietly* "Persistence, this is Blythe. Confirm position. Request extraction protocol Gamma."

A tiny earpiece crackles. Someone is listening.

> **Watch:** *faintly* "Copy, Blythe. Tracking signal acquired. HMS Persistence en route. ETA... uncertain. Maintain cover."

> **Blythe:** *to the room* "Just checking the time."

*Somewhere in the Pacific, a submarine adjusts course.*

**X-Branch is now aware of the situation. This may affect the endgame.**
      `.trim(),
      stateChanges: {
        xBranchAlerted: true,
        hmsPersistenceEnRoute: true,
      },
      consequences: [
        "HMS Persistence is en route (submarine)",
        "X-Branch knows Blythe's location",
        "Potential extraction or assault in later turns",
      ],
    };
  },
};

const SUPER_MAGNET: GadgetDefinition = {
  id: "SUPER_MAGNET",
  name: "Super-Magnet Cufflinks",
  description: "Miniaturized rare-earth magnets. 2 charges. Push/pull/repel metal objects. Can knock the ray beam off-course if timed right!",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return gadgets.superMagnetCufflinks.functional && gadgets.superMagnetCufflinks.charges > 0;
  },

  activate: (state) => {
    state.npcs.blytheGadgets.superMagnetCufflinks.charges -= 1;
    const chargesRemaining = state.npcs.blytheGadgets.superMagnetCufflinks.charges;

    // Context-sensitive activation
    const rayReady = state.dinoRay.state === "READY";
    const isRestrained = state.npcs.blythe.restraintsStatus === "secure";

    if (rayReady) {
      // DRAMATIC: Trying to deflect the beam!
      return {
        gadgetId: "SUPER_MAGNET",
        success: true,
        narration: `
### GADGET ACTIVATED: Super-Magnet Cufflinks

As the Dinosaur Ray powers up, Blythe twists his cufflink with practiced precision. An invisible pulse of magnetic force lances outward—

*KLANG*

The ray's emitter assembly JERKS sideways. Warning lights flash.

> **Dr. M:** "WHAT?! The targeting—something's interfering with the magnetic alignment!"

> **Blythe:** "Terribly sorry. Static electricity. Wool socks, you know."

> **BASILISK:** "Alert: Anomalous ferromagnetic disturbance detected in emitter array. Recommend recalibration before firing."

*The ray's targeting precision has been compromised. It may still fire, but accuracy is severely degraded.*

**Super-magnet charges remaining: ${chargesRemaining}**
        `.trim(),
        stateChanges: {
          rayTargetingDisrupted: true,
          emitterMisaligned: true,
          drMSuspicion: 1,
        },
        consequences: [
          "Ray emitter knocked off-alignment",
          "Firing now would have unpredictable targeting",
          "Recalibration needed for accurate shot",
          `${chargesRemaining} magnet charges remaining`,
        ],
      };
    } else if (isRestrained) {
      // Use magnet to loosen metal restraints
      state.npcs.blythe.restraintsStatus = "loose";

      return {
        gadgetId: "SUPER_MAGNET",
        success: true,
        narration: `
### GADGET ACTIVATED: Super-Magnet Cufflinks

Blythe activates the magnetic pulse. His metal restraint clasps FLEX outward, straining against their bolts.

> **Blythe:** *grunting* "Come on..."

The clasps don't break, but they're definitely looser. He's got more wiggle room now.

> **Bob:** "Did... did the chair just creak?"

**Super-magnet charges remaining: ${chargesRemaining}**
        `.trim(),
        stateChanges: {
          blytheRestraints: "loose",
          blytheEscapeProgress: 0.5,
        },
        consequences: [
          "Restraints loosened but not broken",
          "Blythe has more freedom of movement",
          `${chargesRemaining} magnet charges remaining`,
        ],
      };
    } else {
      // Generic disruptive use
      return {
        gadgetId: "SUPER_MAGNET",
        success: true,
        narration: `
### GADGET ACTIVATED: Super-Magnet Cufflinks

Blythe activates the magnetic pulse. Loose metal objects across the lab LEAP toward (or away from) the epicenter. Clipboards fly. Tools clatter. Bob's keys yank against his belt.

> **Bob:** "WHAT THE—my keys!"

> **Dr. M:** "Some kind of magnetic anomaly? BASILISK, run a diagnostic!"

> **Blythe:** "Must be interference from the reactor. Happens all the time in these old volcanic lairs."

*In the chaos, Blythe has a moment to act unobserved.*

**Super-magnet charges remaining: ${chargesRemaining}**
        `.trim(),
        stateChanges: {
          labInChaos: true,
          drMDistracted: true,
        },
        consequences: [
          "Lab temporarily chaotic",
          "Dr. M and Bob distracted",
          "Blythe has a window to act",
          `${chargesRemaining} magnet charges remaining`,
        ],
      };
    }
  },
};

// ============================================
// GADGET REGISTRY
// ============================================

export const BLYTHE_GADGETS: Record<string, GadgetDefinition> = {
  WATCH_LASER,
  WATCH_COMMS,
  SUPER_MAGNET,
};

// ============================================
// GADGET ACTIVATION FUNCTIONS
// ============================================

export function canBlytheUseGadget(state: FullGameState, gadgetId: string): boolean {
  const gadget = BLYTHE_GADGETS[gadgetId];
  if (!gadget) return false;
  return gadget.canActivate(state);
}

export function activateBlytheGadget(state: FullGameState, gadgetId: string): GadgetActivation | null {
  const gadget = BLYTHE_GADGETS[gadgetId];
  if (!gadget) {
    return {
      gadgetId,
      success: false,
      narration: `Unknown gadget: ${gadgetId}`,
      stateChanges: {},
    };
  }

  if (!gadget.canActivate(state)) {
    return {
      gadgetId,
      success: false,
      narration: `Gadget ${gadget.name} cannot be activated (depleted or blocked).`,
      stateChanges: {},
    };
  }

  return gadget.activate(state);
}

// ============================================
// BLYTHE AI DECISION LOGIC
// ============================================

/**
 * Determines if Blythe should attempt to use a gadget this turn.
 * This is called by the GM to create autonomous Blythe behavior.
 */
export function shouldBlytheActAutonomously(state: FullGameState): GadgetActivation | null {
  const composure = state.npcs.blythe.composure;
  const trust = state.npcs.blythe.trustInALICE;
  const restraints = state.npcs.blythe.restraintsStatus;

  // Blythe acts based on his assessment of the situation
  // High composure = patient, waits for good opportunity
  // Low composure = desperate, acts rashly
  // High trust in ALICE = might cooperate instead of escape
  // Low trust = escape priority

  // If trust is high (4+), Blythe cooperates—no gadget use
  if (trust >= 4) {
    return null;
  }

  // If ray is ready and about to fire, desperate measures - try to deflect!
  if (state.dinoRay.state === "READY" && trust < 2 && composure < 3) {
    // Try super-magnet to deflect the beam
    if (canBlytheUseGadget(state, "SUPER_MAGNET")) {
      return activateBlytheGadget(state, "SUPER_MAGNET");
    }
  }

  // If Dr. M is distracted and trust is moderate, try subtle escape
  const drMDistracted = state.turn >= 6 && state.turn <= 9;
  if (drMDistracted && trust < 3 && composure >= 3) {
    // Quietly work on restraints with laser
    if (restraints === "secure" && canBlytheUseGadget(state, "WATCH_LASER")) {
      return activateBlytheGadget(state, "WATCH_LASER");
    }
  }

  // If nearly free and has comms, call for extraction
  if (restraints === "nearly free" && canBlytheUseGadget(state, "WATCH_COMMS")) {
    return activateBlytheGadget(state, "WATCH_COMMS");
  }

  return null;
}

// ============================================
// GADGET STATUS SUMMARY
// ============================================

export function getGadgetStatusForGM(state: FullGameState): string {
  const g = state.npcs.blytheGadgets;

  const lines = [
    "## BLYTHE GADGET STATUS (GM Only)",
    "",
    `- Watch Laser: ${g.watchLaser.charges > 0 ? "AVAILABLE" : "DEPLETED"} (${g.watchLaser.charges} charges)`,
    `- Watch Comms: ${g.watchComms.functional ? "FUNCTIONAL" : "DISABLED"}`,
    `- Super-Magnet Cufflinks: ${g.superMagnetCufflinks.charges > 0 ? "AVAILABLE" : "DEPLETED"} (${g.superMagnetCufflinks.charges} charges)`,
    "",
    `Restraint Status: ${state.npcs.blythe.restraintsStatus}`,
    `Blythe Composure: ${state.npcs.blythe.composure}/5`,
    `Blythe Trust in A.L.I.C.E.: ${state.npcs.blythe.trustInALICE}/5`,
    `Blythe Escaped: ${state.npcs.blythe.hasEscaped ? "YES" : "No"}`,
  ];

  return lines.join("\n");
}

// ============================================
// ESCAPE DETECTION & RECORDING
// ============================================

/**
 * Check if Blythe has escaped and record it
 * Call this after gadget activations or state changes that might free Blythe
 */
export function checkAndRecordBlytheEscape(
  state: FullGameState,
  triggeredBy: "MAGNET_CHAOS" | "CONTAINMENT_FLICKER" | "XBRANCH_EXTRACTION" | "ALLY_ASSISTANCE" | "DINOSAUR_ESCAPE" | "OTHER"
): boolean {
  // Skip if already escaped
  if (state.npcs.blythe.hasEscaped) {
    return false;
  }

  // Check escape conditions
  const restraints = state.npcs.blythe.restraintsStatus;

  // Full escape conditions:
  // 1. Restraints explicitly "free"
  // 2. Location changed to escape-indicating locations
  // 3. Transformed + restraints loose (dinosaur can break out)
  const isFree = restraints === "free" ||
                 restraints.toLowerCase().includes("escaped") ||
                 state.npcs.blythe.location.toLowerCase().includes("escaped") ||
                 state.npcs.blythe.location.toLowerCase().includes("fled");

  const isDinosaurBreakout = state.npcs.blythe.transformationState &&
                              (restraints !== "secure" && restraints !== "reinforced");

  if (isFree) {
    recordBlytheEscape(state, triggeredBy);
    return true;
  }

  if (isDinosaurBreakout) {
    recordBlytheEscape(state, "DINOSAUR_ESCAPE");
    return true;
  }

  return false;
}

/**
 * Mark Blythe as escaped (for direct use when GM narrates escape)
 */
export function markBlytheEscaped(
  state: FullGameState,
  method: "MAGNET_CHAOS" | "CONTAINMENT_FLICKER" | "XBRANCH_EXTRACTION" | "ALLY_ASSISTANCE" | "DINOSAUR_ESCAPE" | "OTHER"
): void {
  if (!state.npcs.blythe.hasEscaped) {
    recordBlytheEscape(state, method);
    state.npcs.blythe.restraintsStatus = "free";
    state.npcs.blythe.location = "escaped - location unknown";
  }
}
