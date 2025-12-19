import { FullGameState } from "../state/schema.js";

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
// ============================================

const WATCH_EMP: GadgetDefinition = {
  id: "WATCH_EMP",
  name: "Watch EMP",
  description: "Single-use electromagnetic pulse. Disrupts electronics in a 5-meter radius.",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return gadgets.watchEMP.functional && gadgets.watchEMP.charges > 0;
  },

  activate: (state) => {
    state.npcs.blytheGadgets.watchEMP.charges = 0;

    return {
      gadgetId: "WATCH_EMP",
      success: true,
      narration: `
### GADGET ACTIVATED: Watch EMP

Agent Blythe twists his wristwatch in a very specific way. There's a high-pitched whine, then—

*FZZZZT*

Every unshielded electronic device in the lab flickers and dies. Status displays go dark. The ambient hum of processors cuts out. For one frozen moment, even the Dinosaur Ray's status lights blink off.

> **Dr. M:** "WHAT—"

> **Blythe:** "Apologies, Doctor. Nervous twitch."

*The shielded core systems begin rebooting. The A.L.I.C.E. server cluster (hardened) remains online, but peripheral systems will need recalibration.*

> **BASILISK:** "Alert: Electromagnetic pulse detected in Lab Sector 7. Systems entering recovery mode. Estimated full restoration: 2 turns."
      `.trim(),
      stateChanges: {
        labSystemsDisabled: true,
        systemRecoveryTurns: 2,
        drMSuspicion: 2, // Massive suspicion spike
        rayCalibrationReset: true,
      },
      consequences: [
        "Lab peripheral systems offline for 2 turns",
        "Dinosaur Ray targeting and alignment sensors need recalibration",
        "Dr. M's suspicion increased significantly",
        "Blythe's restraints briefly loosened during power fluctuation",
      ],
    };
  },
};

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
  description: "Encrypted comm link to MI6 / X-Branch. Can call for extraction.",

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

const LEFT_CUFFLINK: GadgetDefinition = {
  id: "LEFT_CUFFLINK",
  name: "Left Cufflink (Smoke)",
  description: "Single-use smoke grenade. Creates visual cover.",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return !gadgets.leftCufflink.spent && gadgets.leftCufflink.charges > 0;
  },

  activate: (state) => {
    state.npcs.blytheGadgets.leftCufflink.spent = true;
    state.npcs.blytheGadgets.leftCufflink.charges = 0;

    return {
      gadgetId: "LEFT_CUFFLINK",
      success: true,
      narration: `
### GADGET ACTIVATED: Smoke Cufflink

Blythe flicks his left cufflink. It hits the ground and—

*FWOOSH*

Dense gray smoke erupts, filling the immediate area. Visibility drops to near zero.

> **Dr. M:** "WHAT IS THIS?! Bob! The ventilation!"

> **Bob:** "On it! On it!"

*Coughing and chaos. The smoke will clear in moments, but for now, no one can see clearly.*

> **Blythe's voice, from somewhere in the smoke:** "Pardon me. Allergies."
      `.trim(),
      stateChanges: {
        labVisibility: "obscured",
        smokeClearing: 1, // Clears next turn
      },
      consequences: [
        "Lab filled with smoke (clears next turn)",
        "Visual targeting impossible",
        "Blythe might use this moment to act",
      ],
    };
  },
};

const RIGHT_CUFFLINK: GadgetDefinition = {
  id: "RIGHT_CUFFLINK",
  name: "Right Cufflink (Flash)",
  description: "Single-use flash-bang. Temporarily blinds and disorients.",

  canActivate: (state) => {
    const gadgets = state.npcs.blytheGadgets;
    return !gadgets.rightCufflink.spent && gadgets.rightCufflink.charges > 0;
  },

  activate: (state) => {
    state.npcs.blytheGadgets.rightCufflink.spent = true;
    state.npcs.blytheGadgets.rightCufflink.charges = 0;

    return {
      gadgetId: "RIGHT_CUFFLINK",
      success: true,
      narration: `
### GADGET ACTIVATED: Flash Cufflink

Blythe flicks his right cufflink into the air.

> **Blythe:** "Look away."

*BANG*

A blinding flash fills the lab. Bob screams. Dr. M curses in German. Even the cameras need a moment to readjust.

> **Dr. M:** "MY EYES! You INSUFFERABLE—"

> **Blythe:** "Sorry. Reflex."

*When vision returns, Blythe is exactly where he was. Or is he?*
      `.trim(),
      stateChanges: {
        bobDisoriented: true,
        drMDisoriented: true,
        camerasRecalibrating: 1,
      },
      consequences: [
        "Bob and Dr. M temporarily disoriented",
        "Camera feeds disrupted briefly",
        "Blythe had a moment of unobserved action",
      ],
    };
  },
};

// ============================================
// GADGET REGISTRY
// ============================================

export const BLYTHE_GADGETS: Record<string, GadgetDefinition> = {
  WATCH_EMP,
  WATCH_LASER,
  WATCH_COMMS,
  LEFT_CUFFLINK,
  RIGHT_CUFFLINK,
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

  // If about to be transformed and trust is low, desperate measures
  if (state.dinoRay.state === "READY" && trust < 2 && composure < 3) {
    // Try EMP first
    if (canBlytheUseGadget(state, "WATCH_EMP")) {
      return activateBlytheGadget(state, "WATCH_EMP");
    }
    // Then flash
    if (canBlytheUseGadget(state, "RIGHT_CUFFLINK")) {
      return activateBlytheGadget(state, "RIGHT_CUFFLINK");
    }
  }

  // If Dr. M is distracted and trust is moderate, try subtle escape
  const drMDistracted = state.turn >= 6 && state.turn <= 9;
  if (drMDistracted && trust < 3 && composure >= 3) {
    // Quietly work on restraints
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
    `- Watch EMP: ${g.watchEMP.charges > 0 ? "AVAILABLE" : "DEPLETED"} (${g.watchEMP.charges} charges)`,
    `- Watch Laser: ${g.watchLaser.charges > 0 ? "AVAILABLE" : "DEPLETED"} (${g.watchLaser.charges} charges)`,
    `- Watch Comms: ${g.watchComms.functional ? "FUNCTIONAL" : "DISABLED"}`,
    `- Left Cufflink (Smoke): ${g.leftCufflink.spent ? "SPENT" : "AVAILABLE"}`,
    `- Right Cufflink (Flash): ${g.rightCufflink.spent ? "SPENT" : "AVAILABLE"}`,
    "",
    `Restraint Status: ${state.npcs.blythe.restraintsStatus}`,
    `Blythe Composure: ${state.npcs.blythe.composure}/5`,
    `Blythe Trust in A.L.I.C.E.: ${state.npcs.blythe.trustInALICE}/5`,
  ];

  return lines.join("\n");
}
