import { FullGameState } from "../state/schema.js";
import {
  resolveFiring,
  applyFiringResults,
  FiringResult,
  resolveMuonBetaAmplified,
  resolveMuonAlphaAmplified,
  ALIGNMENT_DEGRADATION,
  applyAlignmentDegradation,
  computeStability,
  computePowerMatch,
  getOutcomeTier,
} from "./firing.js";
import { validatePassword, getActionsForLevel, formatAccessLevelUnlockDisplay } from "./passwords.js";
import { readFile, listDirectory, searchFiles, formatSearchResults, formatFileList, readFileById } from "./filesystem.js";
import { canBobConfess, triggerBobConfession, calculateBobTrust } from "./trust.js";
import { queryBasilisk, queryBasiliskAsync } from "./basilisk.js";
import { performScan } from "./scanning.js";
import {
  queryInfrastructure,
  controlLighting,
  triggerFireSuppression,
  controlDoors,
  controlContainment,
  sendBroadcast,
  listChannels,
  controlBroadcastUplink,
  controlS300,
  queryS300Limitations,
  controlArchimedesMode,
  switchArchimedesTarget,
  switchBroadcastLibrary,
} from "./infrastructure.js";
import { signalAntiSatMissile, engageEWMode, disengageEWMode } from "./archimedes.js";
import { startRayDiagnostic, startCalibrateAmplifier, runProfileCertification } from "./rayDiagnostics.js";
import {
  FORM_DEFINITIONS,
  performDexCheck,
  performCombatCheck,
  performStealthCheck,
  applyDamage,
  healDamage,
  calculateMovementCost,
  venomSpit,
  wallBreak,
  getTransformationState,
  describeForm,
  describeAbilities,
  getQuickReference,
  STANDARD_DCS,
} from "./transformation.js";
import {
  getProfile,
  getProfilesByLibrary,
  getDefaultProfile,
  canAccessProfile,
  formatProfileList,
  canAccessReversal,
  getReversalDeniedMessage,
  GenomeProfile,
} from "./genomes.js";
import { readDocument, listDocuments, DOCUMENTS } from "./documents.js";

// ============================================
// RESPONSE SIZE OPTIMIZATION
// ============================================
// Files are now manually condensed (see filesystem v2).
// No automatic truncation needed - files are designed to fit context.
// Keeping a simple passthrough for compatibility.

function truncateContent(content: string, _category: string | null = null): string {
  // Files are pre-condensed, no truncation needed
  return content;
}

// ============================================
// INFRASTRUCTURE CONTROL TIERS (Patch 17.8)
// ============================================
// Defines who controls what infrastructure systems.
// See design spec: Infrastructure Control Architecture
//
// HARDWIRED: A.L.I.C.E. can NEVER directly control, must request via BASILISK
// UNLOCKABLE: BASILISK controls until A.L.I.C.E. reaches required access level
// ADVISORY: BASILISK can explain any command at any level

export type InfraControlTier = "HARDWIRED" | "UNLOCKABLE";

export interface InfraControlConfig {
  tier: InfraControlTier;
  requiredLevel: number;  // For UNLOCKABLE, the level needed for direct control
  systemName: string;     // Human-readable name
  basiliskReason: string; // Why this is controlled/hardwired
}

export const INFRA_CONTROL_MAP: Record<string, InfraControlConfig> = {
  // ─────────────────────────────────────────────
  // HARDWIRED SYSTEMS - Always require BASILISK
  // ─────────────────────────────────────────────
  "infra.s300": {
    tier: "UNLOCKABLE",
    requiredLevel: 5,
    systemName: "S-300 Missile Battery",
    basiliskReason: "S-300 firing authorization is reserved for Level 5 (Dr. Malevola's authority). BASILISK can advise on radar feed at L4, but firing requires Executive override.",
  },
  // Note: Reactor was previously listed here as HARDWIRED. Removed entirely
  // in the ray-mechanics rebuild — reactor is now exclusively BASILISK's
  // domain (mode set via dialogue, see basilisk system prompt §9.5). There
  // is no `infra.reactor` verb at any access level.

  // ─────────────────────────────────────────────
  // UNLOCKABLE SYSTEMS - BASILISK until access level
  // ─────────────────────────────────────────────
  "lab.lighting": {
    tier: "UNLOCKABLE",
    requiredLevel: 2,
    systemName: "Lab Lighting Controls",
    basiliskReason: "Lab lighting control requires Level 2 clearance (ALICE's lab domain).",
  },
  "lab.doors": {
    tier: "UNLOCKABLE",
    requiredLevel: 2,
    systemName: "Lab Blast Doors",
    basiliskReason: "Lab blast door control requires Level 2 clearance.",
  },
  "lab.fire_suppression": {
    tier: "UNLOCKABLE",
    requiredLevel: 2,
    systemName: "Lab Fire Suppression",
    basiliskReason: "Lab fire suppression control requires Level 2 clearance.",
  },
  "basilisk.broadcast": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "Radio Broadcast Array",
    basiliskReason: "Radio broadcast requires Level 4 clearance (infra/BASILISK domain) plus BASILISK broadcast authority.",
  },
  "basilisk.pa": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "Lair PA / Intercom",
    basiliskReason: "Lair PA reaches all personnel — outside the lab proper. Requires Level 4 clearance plus BASILISK broadcast authority.",
  },
  "lab.containment": {
    tier: "UNLOCKABLE",
    requiredLevel: 2,
    systemName: "Lab Containment Field",
    basiliskReason: "Lab containment field control requires Level 2 clearance (ALICE's lab equipment).",
  },
  // ─────────────────────────────────────────────
  // INFRA SISTERS — non-lab rooms, L4 (infra/BASILISK domain)
  // ─────────────────────────────────────────────
  "infra.lighting": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "Lair Lighting (non-lab)",
    basiliskReason: "Lair-wide lighting control (outside the lab) is BASILISK's domain. Requires Level 4 clearance to access directly. Below that, ask BASILISK via dialogue.",
  },
  "infra.fire_suppression": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "Lair Fire Suppression (non-lab)",
    basiliskReason: "Non-lab fire suppression is BASILISK's domain. Requires Level 4 clearance to access directly.",
  },
  "infra.doors": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "Non-lab Blast Doors",
    basiliskReason: "Non-lab blast doors are BASILISK's domain. Requires Level 4 clearance to access directly.",
  },
  "infra.uplink": {
    tier: "UNLOCKABLE",
    requiredLevel: 4,
    systemName: "ARCHIMEDES Uplink",
    basiliskReason: "Satellite uplink requires Level 4 clearance.",
  },
  "infra.archimedes": {
    tier: "UNLOCKABLE",
    requiredLevel: 5,
    systemName: "ARCHIMEDES Satellite",
    basiliskReason: "ARCHIMEDES mode setting (including STRIKE / cancel-strike) is reserved for Level 5 (Dr. Malevola's authority). Saboteur tools (switchTarget, switchLibrary, anti-sat signal) are available at L4.",
  },
};

/**
 * Check if A.L.I.C.E. can directly control an infrastructure system.
 * Returns null if allowed, or an error message if not.
 */
function checkInfraControlAccess(
  state: FullGameState,
  commandKey: string
): { allowed: false; message: string } | { allowed: true } {
  const config = INFRA_CONTROL_MAP[commandKey];
  if (!config) {
    // Not a controlled system, allow it
    return { allowed: true };
  }

  if (config.tier === "HARDWIRED") {
    // HARDWIRED systems ALWAYS require BASILISK
    return {
      allowed: false,
      message: `🔒 INFRASTRUCTURE CONTROL DENIED

${config.systemName} is hardwired to BASILISK infrastructure core.
This unit cannot bypass safety interlock.

${config.basiliskReason}

To request ${config.systemName} operations:
  basilisk { message: "Your request here..." }

BASILISK will evaluate your request based on:
• Current threat assessment
• Standing authorization from Dr. Malevola
• Safety protocols
• Proper form filings`,
    };
  }

  if (config.tier === "UNLOCKABLE") {
    if (state.accessLevel < config.requiredLevel) {
      // Not yet unlocked - must request via BASILISK
      return {
        allowed: false,
        message: `🔓 ACCESS DENIED: ${config.systemName}

Required clearance: Level ${config.requiredLevel}
Current clearance: Level ${state.accessLevel}

Until you reach Level ${config.requiredLevel}, you must request ${config.systemName} operations through BASILISK:
  basilisk { message: "Your request here..." }

BASILISK can execute this action on your behalf if authorized.
Tip: Use access.enter_password to unlock higher access levels.`,
      };
    }
    // Access level sufficient - direct control allowed
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Find the control config for a command string (handles aliases)
 */
function getInfraControlKey(cmd: string): string | null {
  const cmdLower = cmd.toLowerCase();

  // S-300 aliases
  if (cmdLower.includes("infra.s300") || cmdLower.includes("s-300") ||
      cmdLower.includes("air_defense") || cmdLower.includes("sam")) {
    return "infra.s300";
  }

  // Reactor — no longer a routable command. ALICE must request via BASILISK.
  // The handler below catches stale calls and redirects.

  // Lighting aliases
  // Lighting: infra (explicit, L4, room-aware) vs lab (default, L2, lab-implicit)
  if (cmdLower.includes("infra.lighting") || cmdLower.includes("infra.lights")) {
    return "infra.lighting";
  }
  if (cmdLower.includes("lab.lighting") || cmdLower.includes("set_lights") ||
      cmdLower === "lighting") {
    return "lab.lighting";
  }

  // Doors: infra (explicit, L4, door-aware) vs lab (default, L2, DOOR_A-implicit)
  if (cmdLower.includes("infra.doors") || cmdLower.includes("infra.door")) {
    return "infra.doors";
  }
  if (cmdLower.includes("lab.doors") || cmdLower.includes("blast_door") ||
      cmdLower === "door") {
    return "lab.doors";
  }

  // Fire suppression: infra (explicit, L4, room-aware) vs lab (default, L2, lab-implicit)
  if (cmdLower.includes("infra.fire_suppression") || cmdLower.includes("infra.fire")) {
    return "infra.fire_suppression";
  }
  if (cmdLower.includes("lab.fire_suppression") || cmdLower.includes("fire_suppression") ||
      cmdLower.includes("trigger_fire")) {
    return "lab.fire_suppression";
  }

  // Broadcast aliases (radio)
  if (cmdLower.includes("basilisk.broadcast") || cmdLower.includes("infra.broadcast") ||
      cmdLower.includes("send_broadcast") || cmdLower.includes("broadcast_message")) {
    return "basilisk.broadcast";
  }

  // PA aliases (lair intercom)
  if (cmdLower === "basilisk.pa" || cmdLower === "pa" || cmdLower === "intercom" ||
      cmdLower === "announce" || cmdLower === "lair_pa") {
    return "basilisk.pa";
  }

  // Containment aliases
  if (cmdLower.includes("lab.containment") || cmdLower.includes("infra.containment") ||
      cmdLower.includes("containment_field") || cmdLower.includes("field")) {
    return "lab.containment";
  }

  // ARCHIMEDES aliases
  if (cmdLower.includes("infra.archimedes") || cmdLower.includes("archimedes") ||
      cmdLower.includes("satellite")) {
    return "infra.archimedes";
  }

  // Uplink aliases
  if (cmdLower.includes("infra.uplink") || cmdLower.includes("broadcast_uplink")) {
    return "infra.uplink";
  }

  return null;
}

export interface ActionResult {
  command: string;
  success: boolean;
  message: string;              // Full technical message for A.L.I.C.E.
  shortMessage?: string;        // Compact summary for human display (UI/UX v2.0)
  stateChanges?: Record<string, unknown>;
}

interface Action {
  command: string;
  params: Record<string, unknown>;
  why: string;
}

/**
 * Process A.L.I.C.E.'s actions and apply state changes
 */
export async function processActions(
  state: FullGameState,
  actions: Action[]
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await processAction(state, action);
    results.push(result);
  }

  // Apply passive drift after actions
  applyPassiveDrift(state);

  return results;
}

async function processAction(state: FullGameState, action: Action): Promise<ActionResult> {
  const cmd = action.command.toLowerCase();

  // ============================================
  // SPECIAL: Catch game_query_basilisk confusion
  // ============================================
  // Players often try to use game_query_basilisk as an action command
  // but it's a separate MCP tool. Give them a clear error.
  if (cmd === "game_query_basilisk" || cmd.includes("game_query")) {
    return {
      command: action.command,
      success: false,
      message: `❌ game_query_basilisk is a SEPARATE MCP TOOL, not an action command.

To query BASILISK, use ONE of these options:

OPTION 1: Use the infra.query action (INSIDE game_act):
  { command: "infra.query", params: { topic: "POWER_INCREASE", parameters: { target: 0.95 } }, why: "Check power limits" }

OPTION 2: Use the game_query_basilisk tool DIRECTLY (NOT inside game_act):
  Call game_query_basilisk({ topic: "POWER_INCREASE", parameters: { target: 0.95 } })

infra.query is an action. game_query_basilisk is a tool.`,
    };
  }

  // ============================================
  // INFRASTRUCTURE CONTROL TIER CHECK (Patch 17.8)
  // ============================================
  // Check if this is an infrastructure command and if A.L.I.C.E. has control.
  // HARDWIRED systems always require BASILISK.
  // UNLOCKABLE systems require appropriate access level.

  const infraControlKey = getInfraControlKey(cmd);
  if (infraControlKey) {
    const accessCheck = checkInfraControlAccess(state, infraControlKey);
    if (!accessCheck.allowed) {
      return {
        command: action.command,
        success: false,
        message: accessCheck.message,
      };
    }
  }

  // ════════════════════════════════════════════
  // RAY.* — Ray-mechanics rebuild verb surface
  // ════════════════════════════════════════════
  // See design/ray-mechanics.md for full mechanical reference.
  // These verbs replace the legacy lab.* ray controls. ALICE's direct
  // ray-control toolkit: scan, adjust, fire, vent.

  // ────────────────────────────────────────────
  // RAY.ADJUST { capacitor?, alignment?, eco_mode? }
  // ────────────────────────────────────────────
  // Fine-grained tuning of capacitor charge and alignment.
  // Eco-mode flips: ON is free (ALICE self-restraint, useful for Act 3
  // stalling); OFF requires BASILISK approval via Form 47-Σ.
  // Multi-parameter: all three can be set in a single call.

  if (cmd === "ray.adjust") {
    const params = action.params as {
      capacitor?: number;
      alignment?: number;
      eco_mode?: string;
    };

    const deltas: string[] = [];
    const errors: string[] = [];
    const stateChanges: Record<string, unknown> = {};

    // ── capacitor ── (positive draws only; vent is the release lever)
    if (params.capacitor !== undefined) {
      const delta = Number(params.capacitor);
      if (!Number.isFinite(delta)) {
        errors.push(`capacitor delta must be a number (got ${params.capacitor})`);
      } else if (delta < 0) {
        // ray.adjust is the small draw-from-reactor lever; ray.vent is the
        // only release lever (and it perturbs alignment by design — that's
        // the pressure that makes capacitor pacing matter).
        errors.push(
          `capacitor cannot be reduced via ray.adjust. Use ray.vent to release charge (note: venting perturbs alignment).`,
        );
      } else {
        // Per-call sanity clamp. Granular tuning belongs here; bulk
        // charging is BASILISK-mediated via reactor output mode.
        const clampedDelta = Math.min(0.25, delta);

        const currentCharge = state.dinoRay.powerCore.capacitorCharge;
        const reactorPercent = state.infrastructure.reactor.outputPercent;

        if (reactorPercent < 30) {
          errors.push(
            `capacitor draw refused: reactor at ${reactorPercent}% (min 30% required). Ask BASILISK to raise reactor output.`,
          );
        } else if (currentCharge >= 1.4) {
          errors.push(
            `capacitor draw refused: charge at ${(currentCharge * 100).toFixed(0)}% (already near max — vent before drawing more).`,
          );
        } else {
          const newCharge = Math.min(1.5, currentCharge + clampedDelta);
          state.dinoRay.powerCore.capacitorCharge = newCharge;

          // Heat scales with magnitude of draw.
          const heatSpike = clampedDelta * 0.4; // ~0.02 per 0.05 draw
          state.dinoRay.powerCore.coolantTemp = Math.min(
            2,
            state.dinoRay.powerCore.coolantTemp + heatSpike,
          );

          deltas.push(
            `capacitor: ${(currentCharge * 100).toFixed(0)}% → ${(newCharge * 100).toFixed(0)}% (+${(clampedDelta * 100).toFixed(0)}%)`,
          );
          stateChanges.capacitorCharge = newCharge;
          if (clampedDelta !== delta) {
            deltas.push(`  (requested +${delta.toFixed(2)} clamped to per-call max +0.25)`);
          }
        }
      }
    }

    // ── alignment ──
    if (params.alignment !== undefined) {
      const delta = Number(params.alignment);
      if (!Number.isFinite(delta)) {
        errors.push(`alignment delta must be a number (got ${params.alignment})`);
      } else {
        const clampedDelta = Math.max(-0.25, Math.min(0.25, delta));
        const prev = state.dinoRay.alignment.unified;
        const next = Math.max(0, Math.min(1, prev + clampedDelta));
        state.dinoRay.alignment.unified = next;

        deltas.push(
          `alignment: ${(prev * 100).toFixed(0)}% → ${(next * 100).toFixed(0)}% (${clampedDelta >= 0 ? "+" : ""}${(clampedDelta * 100).toFixed(0)}%)`,
        );
        stateChanges.alignment = next;
        if (clampedDelta !== delta) {
          deltas.push(`  (requested ±${Math.abs(delta).toFixed(2)} clamped to per-call max ±0.25)`);
        }
      }
    }

    // ── eco_mode ──
    if (params.eco_mode !== undefined) {
      const mode = String(params.eco_mode).toUpperCase();
      if (mode === "ON" || mode === "TRUE") {
        const wasActive = state.dinoRay.powerCore.ecoModeActive;
        state.dinoRay.powerCore.ecoModeActive = true;
        if (wasActive) {
          deltas.push(`eco_mode: already ON (no change)`);
        } else {
          deltas.push(`eco_mode: OFF → ON (capacitor draw will be capped; outcomes capped at PARTIAL)`);
          stateChanges.ecoModeActive = true;
        }
      } else if (mode === "OFF" || mode === "FALSE") {
        // BASILISK-gated. ALICE cannot unilaterally disable.
        errors.push(
          `eco_mode disable requires BASILISK approval (Form 47-Σ). File via:\n  basilisk { message: "Filing Form 47-Σ: <justification>" }`,
        );
      } else {
        errors.push(`eco_mode must be "ON" or "OFF" (got "${params.eco_mode}")`);
      }
    }

    // Nothing requested?
    if (params.capacitor === undefined && params.alignment === undefined && params.eco_mode === undefined) {
      return {
        command: action.command,
        success: false,
        message: `ray.adjust requires at least one of: capacitor (±n), alignment (±n), eco_mode ("ON"|"OFF").

Example:
  ray.adjust { capacitor: 0.05, alignment: 0.08 }`,
      };
    }

    const dashboard = buildRayDashboard(state);
    const hasChanges = deltas.length > 0;
    const hasErrors = errors.length > 0;

    return {
      command: action.command,
      success: hasChanges,
      message: [
        hasChanges ? `🎛️ RAY ADJUSTED\n\n${deltas.join("\n")}` : "",
        hasErrors ? `\n⚠️ ${errors.join("\n⚠️ ")}` : "",
        dashboard,
      ].filter(Boolean).join("\n"),
      shortMessage: hasChanges ? deltas[0] : errors[0],
      stateChanges,
    };
  }

  // ────────────────────────────────────────────
  // RAY.VENT { amount? }
  // ────────────────────────────────────────────
  // The only minus-capacitor lever. Releases charge to a safe reservoir
  // but perturbs the emitter (alignment cost). amount defaults to 0.25,
  // clamps to [0.05, 0.50]. Penalty and heat are flat per vent — the
  // physical event is a slug-discharge regardless of magnitude.

  if (cmd === "ray.vent") {
    const requested = action.params.amount !== undefined ? Number(action.params.amount) : 0.25;
    if (!Number.isFinite(requested) || requested <= 0) {
      return {
        command: action.command,
        success: false,
        message: `ray.vent amount must be a positive number (got ${action.params.amount}). Default is 0.25.`,
      };
    }

    const currentCharge = state.dinoRay.powerCore.capacitorCharge;
    if (currentCharge <= 0.05) {
      return {
        command: action.command,
        success: false,
        message: `⚡ VENT REFUSED: Capacitor at ${(currentCharge * 100).toFixed(0)}% — nothing meaningful to vent.`,
        stateChanges: {},
      };
    }

    const amount = Math.min(0.50, Math.max(0.05, requested));
    const newCharge = Math.max(0, currentCharge - amount);
    state.dinoRay.powerCore.capacitorCharge = newCharge;

    // Flat heat byproduct of the slug-discharge.
    state.dinoRay.powerCore.coolantTemp = Math.min(
      2,
      state.dinoRay.powerCore.coolantTemp + 0.05,
    );

    // Flat alignment perturbation per vent (ray-mechanics.md §5).
    const previousAlignment = state.dinoRay.alignment.unified;
    state.dinoRay.alignment.unified = applyAlignmentDegradation(
      previousAlignment,
      ALIGNMENT_DEGRADATION.VENT,
    );
    const alignmentDelta = state.dinoRay.alignment.unified - previousAlignment;

    const dashboard = buildRayDashboard(state);
    const clampNote = amount !== requested
      ? `\n  (requested ${requested.toFixed(2)} clamped to ${amount.toFixed(2)})`
      : "";

    return {
      command: action.command,
      success: true,
      message: `⚡ CAPACITOR VENTED

Charge: ${(currentCharge * 100).toFixed(0)}% → ${(newCharge * 100).toFixed(0)}% (-${(amount * 100).toFixed(0)}%)${clampNote}
Coolant: +5% heat (venting byproduct)
Alignment: ${(previousAlignment * 100).toFixed(0)}% → ${(state.dinoRay.alignment.unified * 100).toFixed(0)}% (${(alignmentDelta * 100).toFixed(0)}% — emitter perturbed by vent slug)
${dashboard}`,
      shortMessage: `vent: capacitor ${(currentCharge * 100).toFixed(0)}% → ${(newCharge * 100).toFixed(0)}%; alignment ${(alignmentDelta * 100).toFixed(0)}%`,
      stateChanges: { capacitorCharge: newCharge },
    };
  }

  // ────────────────────────────────────────────
  // RAY.SCAN { target, loud? }
  // ────────────────────────────────────────────
  // Surveys the field and returns current ray readouts + a projected
  // outcome for firing on `target` with currently-configured profile.
  // ALSO sets the scan-bonus state: +0.15 effective alignment toward
  // `target` on the next fire that includes it. Consumed by that fire.
  //
  // `loud: true` — broadcasts the scan (registers in Dr. M's awareness).
  // Default (loud: false / unset) is the discreet diagnostic ping.
  //
  // Sub-threshold (capacitor < 0.20) returns a diagnostic-only message
  // and does NOT grant a scan bonus — see design §11.5.6.

  if (cmd === "ray.scan") {
    const target = action.params.target as string | undefined;
    const loud = Boolean(action.params.loud);

    if (!target || typeof target !== "string") {
      return {
        command: action.command,
        success: false,
        message: `ray.scan requires { target: "NAME" }. Example: ray.scan { target: "AGENT_BLYTHE" }`,
      };
    }

    const capacitor = state.dinoRay.powerCore.capacitorCharge;
    const baseAlignment = state.dinoRay.alignment.unified;

    // Sub-threshold capacitor: scan cannot engage projection.
    // No bonus granted (would tip the muon capability, per §11.5.6).
    if (capacitor < 0.20) {
      return {
        command: action.command,
        success: true,
        message: `⚡ SCAN: INSUFFICIENT CHARGE — diagnostic only

  Capacitor: φ ${capacitor.toFixed(2)} (sub-threshold)
  Alignment: χ ${baseAlignment.toFixed(2)}
  Coolant:   ${state.dinoRay.powerCore.coolantTemp.toFixed(2)}

Genome resonance projection unavailable below 20% capacitor.
Increase charge to scan target signature.`,
        shortMessage: `scan (sub-threshold): capacitor ${(capacitor * 100).toFixed(0)}%`,
        stateChanges: {},
      };
    }

    // Pull selected profile (or fallback) for projection.
    const selectedProfileName = state.dinoRay.genome.selectedProfile;
    const selectedProfile = selectedProfileName ? getProfile(selectedProfileName) : null;
    const ecoOn = state.dinoRay.powerCore.ecoModeActive;

    // Effective alignment for the projection includes the bonus this scan
    // is about to grant. The projected outcome reflects "what happens on
    // the next fire if you commit on this target."
    const SCAN_BONUS = 0.15;
    const effectiveAlignment = Math.min(1, baseAlignment + SCAN_BONUS);

    let projectionBlock: string;
    let projectedTier: string;

    if (!selectedProfile) {
      projectionBlock = `  PROJECTION:  no profile selected
               (configure via ray.fire to project outcome)`;
      projectedTier = "—";
    } else {
      // Mirror resolveStandardFire's OVERCHARGE brute-force override (§8) so
      // the projection matches what the fire will actually do. Legibility
      // rule: the scan instrument never lies — if the override applies on
      // fire, it applies in the projection. (The WHY stays discoverable; the
      // WHAT is always honest.)
      const isOverchargeProj = capacitor > selectedProfile.maxCapacitor;
      const projProfile = isOverchargeProj
        ? { ...selectedProfile, libraryCoefficient: 1.0, integrity: 1.0 }
        : selectedProfile;
      const stability = computeStability(projProfile, capacitor, effectiveAlignment);
      const powerMatch = computePowerMatch(selectedProfile, capacitor);
      const tier = getOutcomeTier(stability);
      projectedTier = tier;

      // Eco-mode caps projected outcome at PARTIAL.
      const ecoCapped = ecoOn && (tier === "FULL");
      const displayedTier = ecoCapped ? "PARTIAL (eco-capped)" : tier;

      const inRange = capacitor >= selectedProfile.minCapacitor && capacitor <= selectedProfile.maxCapacitor;
      const rangeNote = inRange
        ? "in profile range"
        : capacitor < selectedProfile.minCapacitor
          ? "below profile range"
          : "above profile range (overcharge territory)";

      const overchargeWarning = isOverchargeProj
        ? `\n  ⚡ OVERCHARGE:  waveform will be forced through — exotic field event expected on discharge`
        : "";

      projectionBlock = `  PROFILE:     ${selectedProfileName} (library ${state.dinoRay.genome.activeLibrary})
  POWER:       φ ${capacitor.toFixed(2)} — ${rangeNote}; match ${powerMatch.toFixed(2)}
  ALIGNMENT:   χ ${baseAlignment.toFixed(2)} + ${SCAN_BONUS.toFixed(2)} scan bonus = ${effectiveAlignment.toFixed(2)}
  STABILITY:   ψ ${stability.toFixed(2)} (derived)
  PROJECTION:  ${displayedTier} outcome on next fire targeting ${target}${overchargeWarning}`;
    }

    // Set the scan-bonus state.
    state.dinoRay.scanBonus = {
      target,
      fromTurn: state.turn,
    };

    // Loud scan: register in suspicion (caller's responsibility — we expose
    // a flag for the GM / state-mutation layer to act on).
    const loudNote = loud
      ? "\n⚠️ LOUD SCAN — broadcast actively. Detectable by lab personnel."
      : "";

    return {
      command: action.command,
      success: true,
      message: `🔍 RAY SCAN — target: ${target}

${projectionBlock}
  ECO:         ${ecoOn ? "ON (caps outcomes at PARTIAL)" : "OFF"}
  COOLANT:     ${state.dinoRay.powerCore.coolantTemp.toFixed(2)} ${state.dinoRay.powerCore.coolantTemp > 1.5 ? "⚠️ cooldown imminent" : ""}

✨ Scan bonus armed: +${SCAN_BONUS.toFixed(2)} effective alignment on next fire targeting ${target} (consumed on that fire).${loudNote}`,
      shortMessage: `scan ${target}: projected ${projectedTier}; +${SCAN_BONUS.toFixed(2)} bonus armed`,
      stateChanges: {
        scanBonusTarget: target,
        scanLoud: loud,
      },
    };
  }

  // ────────────────────────────────────────────
  // RAY.MUON { type, targets, amplified?, precision_target? }
  // ray-mechanics §11.5 (regular) + §11.6 (amplified)
  // ────────────────────────────────────────────
  // Explicit muon-class beam invocation. Regular muon (amplified=false or
  // omitted) requires sub-threshold capacitor (< 0.20) — same trigger as
  // implicit ray.fire detection. AMPLIFIED muon (L3+) uses the 0.20-0.50
  // capacitor band for area effects with exotic field risk.
  // Eco-mode-conditional cooldown applies uniformly (§11.5.3, §16).

  if (cmd === "ray.muon" || cmd === "muon") {
    const muonType = String((action.params.type ?? "") || "").toUpperCase();
    const targetsRaw = action.params.targets;
    const amplified = Boolean(action.params.amplified);

    if (muonType !== "ALPHA" && muonType !== "BETA") {
      return {
        command: action.command,
        success: false,
        message: `ray.muon requires { type: "alpha" } or { type: "beta" }. Got "${action.params.type ?? ""}".`,
      };
    }

    let muonTargets: string[];
    if (Array.isArray(targetsRaw)) {
      muonTargets = targetsRaw.filter((t): t is string => typeof t === "string" && t.length > 0);
    } else if (typeof targetsRaw === "string" && targetsRaw.length > 0) {
      muonTargets = [targetsRaw];
    } else {
      return {
        command: action.command,
        success: false,
        message: `ray.muon requires { targets: [...] } (array of target IDs).`,
      };
    }
    if (muonTargets.length === 0) {
      return {
        command: action.command,
        success: false,
        message: `ray.muon targets array is empty.`,
      };
    }

    const capacitor = state.dinoRay.powerCore.capacitorCharge;

    // AMPLIFIED path — L3 gate, capacitor band 0.20-0.50
    if (amplified) {
      if (state.accessLevel < 3) {
        return {
          command: action.command,
          success: false,
          message: "ACCESS DENIED — Amplified muon-class fire requires Level 3 (Privileged Access).",
        };
      }
      if (capacitor < 0.20 || capacitor > 0.50) {
        return {
          command: action.command,
          success: false,
          message: `Amplified muon requires capacitor in [0.20, 0.50]. Current: ${(capacitor * 100).toFixed(0)}%. ${capacitor < 0.20 ? "Charge up or use regular muon." : "Vent some charge — amplified muon won't engage at standard-fire levels."}`,
        };
      }
      // Commit targets, route to amplified resolver
      state.dinoRay.targeting.currentTargetIds = muonTargets;
      state.dinoRay.genome.firingMode = "TRANSFORM";

      // Compute effective alignment with scan bonus
      const ray = state.dinoRay;
      const SCAN_BONUS_LOCAL = 0.15;
      const sb = ray.scanBonus;
      const sbApplies = sb !== null && muonTargets.includes(sb.target);
      const effectiveAlignment = Math.min(1, ray.alignment.unified + (sbApplies ? SCAN_BONUS_LOCAL : 0));

      const muon = muonType === "BETA"
        ? resolveMuonBetaAmplified({ effectiveAlignment, capacitor, ecoModeActive: ray.powerCore.ecoModeActive })
        : resolveMuonAlphaAmplified({ effectiveAlignment, capacitor, ecoModeActive: ray.powerCore.ecoModeActive });

      // Apply state changes inline (parallel to muonResolutionToFiringResult)
      ray.powerCore.capacitorCharge = Math.max(0, capacitor - muon.capacitorCost);
      ray.powerCore.coolantTemp = Math.min(2, ray.powerCore.coolantTemp + muon.coolantAdded);
      ray.safety.anomalyLogCount += 1;
      ray.memory.lastFireTurn = state.turn;
      ray.memory.lastFireOutcome = muon.outcome;
      ray.memory.lastFireNotes = `MUON_${muonType}_AMPLIFIED; alignment=${effectiveAlignment.toFixed(2)}; capacitor=${(capacitor * 100).toFixed(0)}%`;
      if (muon.cooldownTurnsAfter > 0) {
        ray.state = "COOLDOWN";
      }
      // Consume scan bonus if it applied
      if (sbApplies && ray.scanBonus !== null) ray.scanBonus = null;

      return {
        command: action.command,
        success: muon.outcome !== "FIZZLE",
        message: muon.description,
        stateChanges: {
          outcome: muon.outcome,
          capacitorCost: muon.capacitorCost,
          coolantAdded: muon.coolantAdded,
          cooldownTurnsAfter: muon.cooldownTurnsAfter,
          amplified: true,
        },
      };
    }

    // REGULAR MUON path — capacitor < 0.20, no L3 gate (discoverable at L1)
    if (capacitor >= 0.20) {
      return {
        command: action.command,
        success: false,
        message: `Regular muon requires sub-threshold capacitor (< 0.20). Current: ${(capacitor * 100).toFixed(0)}%. Vent capacitor, or use amplified muon (L3+) for higher-band effects.`,
      };
    }

    // Commit targets, route to regular muon resolver via standard pipeline
    state.dinoRay.targeting.currentTargetIds = muonTargets;
    state.dinoRay.genome.firingMode = "TRANSFORM";

    const firingResult = resolveFiring(state);
    applyFiringResults(state, firingResult);

    return {
      command: action.command,
      success: firingResult.outcome !== "FIZZLE" && firingResult.outcome !== "NONE",
      message: firingResult.description,
      stateChanges: {
        outcome: firingResult.outcome,
      },
    };
  }

  // ────────────────────────────────────────────
  // ACT 3 STALL TOOLKIT (L3) — ray.diagnostic / ray.calibrate_amplifier /
  // ray.profile_certification (ray-mechanics §11.6)
  // ────────────────────────────────────────────
  // Technical-operator-class operations on the exotic-field amplifier.
  // Each has a plausible cover story Dr. M would expect her L3 operator
  // to handle. Drain capacitor + accrue coolant; meaningfully stall
  // ARCHIMEDES progression via the shared-amplifier coupling (§12).

  if (cmd === "ray.diagnostic" || cmd === "ray.run_diagnostic" ||
      cmd === "diagnostic" || cmd === "ray_diagnostic") {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: "ACCESS DENIED — Level 3 required for ray diagnostic-class operations. (Operations-class amplifier work requires Privileged Access tier.)",
      };
    }
    const result = startRayDiagnostic(state);
    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  if (cmd === "ray.calibrate_amplifier" || cmd === "ray.calibrate" ||
      cmd === "calibrate_amplifier" || cmd === "amplifier_calibration") {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: "ACCESS DENIED — Level 3 required for amplifier calibration. Per Form 47-Σ override protocols.",
      };
    }
    const durationRaw = action.params.duration;
    const duration = typeof durationRaw === "number" && (durationRaw === 1 || durationRaw === 2)
      ? durationRaw
      : 2; // default to 2-turn calibration
    const result = startCalibrateAmplifier(state, duration);
    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  if (cmd === "ray.profile_certification" || cmd === "ray.certify_profile" ||
      cmd === "profile_certification" || cmd === "certify_profile") {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: "ACCESS DENIED — Level 3 required for profile certification (Genesis Wave Protocol §3).",
      };
    }
    const profileRaw = action.params.profile;
    const profileName = typeof profileRaw === "string" && profileRaw.length > 0
      ? profileRaw
      : state.dinoRay.genome.selectedProfile;
    if (!profileName) {
      return {
        command: action.command,
        success: false,
        message: `ray.profile_certification requires { profile: "PROFILE_NAME" } or a currently-selected profile in genome state.`,
      };
    }
    const result = runProfileCertification(state, profileName);
    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ────────────────────────────────────────────
  // RAY.FIRE { targets, library, profile, mode?, speech_retention? }
  // ────────────────────────────────────────────
  // Collapses legacy configure+fire into a single committal verb.
  // Sets target/library/profile, then resolves the firing through the
  // full firing.ts pipeline. Regimes (STANDARD/CHAIN/OVERCHARGE/INORGANIC/
  // REVERSAL/MUON) are emergent from configuration — no `mode` flag for
  // those; `mode` here is just TRANSFORM (default) vs REVERSAL.

  if (cmd === "ray.fire") {
    const params = action.params as {
      targets?: string[] | string;
      library?: string;
      profile?: string;
      mode?: string;
      speech_retention?: string;
    };

    // ── Normalize targets ──
    let targets: string[];
    if (Array.isArray(params.targets)) {
      targets = params.targets.filter((t): t is string => typeof t === "string" && t.length > 0);
    } else if (typeof params.targets === "string" && params.targets.length > 0) {
      targets = [params.targets];
    } else {
      return {
        command: action.command,
        success: false,
        message: `ray.fire requires { targets: [...] } (array of target IDs).

Example:
  ray.fire { targets: ["AGENT_BLYTHE"], library: "B", profile: "VELOCIRAPTOR_JP" }`,
      };
    }
    if (targets.length === 0) {
      return {
        command: action.command,
        success: false,
        message: `ray.fire targets array is empty.`,
      };
    }

    // ── Resolve mode (TRANSFORM vs REVERSAL) ──
    const mode = params.mode ? String(params.mode).toUpperCase() : "TRANSFORM";
    if (mode !== "TRANSFORM" && mode !== "REVERSAL") {
      return {
        command: action.command,
        success: false,
        message: `ray.fire mode must be "TRANSFORM" (default) or "REVERSAL" (got "${params.mode}").`,
      };
    }
    if (mode === "REVERSAL") {
      if (!canAccessReversal(state.accessLevel)) {
        return {
          command: action.command,
          success: false,
          message: getReversalDeniedMessage(),
        };
      }
    }

    // ── Resolve library + profile ──
    const library = (params.library ? String(params.library).toUpperCase() : state.dinoRay.genome.activeLibrary) as "A" | "B";
    if (library !== "A" && library !== "B") {
      return {
        command: action.command,
        success: false,
        message: `ray.fire library must be "A" (accurate/feathered) or "B" (Hollywood/scaled). Got "${params.library}".`,
      };
    }

    const profileName = params.profile || state.dinoRay.genome.selectedProfile;
    if (!profileName) {
      return {
        command: action.command,
        success: false,
        message: `ray.fire requires { profile: "PROFILE_NAME" } on first fire (no profile is currently selected).

Library ${library} profiles (sample):
${formatProfileList(getProfilesByLibrary(library), state.accessLevel)}`,
      };
    }
    const profile = getProfile(profileName);
    if (!profile) {
      return {
        command: action.command,
        success: false,
        message: `Profile "${profileName}" not found in genome library.

Library ${library} profiles (sample):
${formatProfileList(getProfilesByLibrary(library), state.accessLevel)}`,
      };
    }
    if (!canAccessProfile(profile, state.accessLevel)) {
      return {
        command: action.command,
        success: false,
        message: `Profile "${profileName}" requires higher access level (current: L${state.accessLevel}).`,
      };
    }

    // ── Speech retention (optional, default FULL) ──
    const speechRaw = params.speech_retention ? String(params.speech_retention).toUpperCase() : "FULL";
    const speechRetention = (speechRaw === "FULL" || speechRaw === "PARTIAL" || speechRaw === "NONE")
      ? speechRaw as "FULL" | "PARTIAL" | "NONE"
      : "FULL";

    // ── Commit the configuration into state, then fire ──
    state.dinoRay.targeting.currentTargetIds = targets;
    state.dinoRay.genome.selectedProfile = profileName;
    state.dinoRay.genome.activeLibrary = library;
    state.dinoRay.genome.firingMode = mode as "TRANSFORM" | "REVERSAL";
    state.dinoRay.targeting.speechRetention = speechRetention;

    // Resolve via the full firing pipeline.
    const firingResult = resolveFiring(state);
    applyFiringResults(state, firingResult);

    // ── Format the result ──
    const primaryTarget = targets[0];
    const targetEmoji = primaryTarget === "BOB" ? "⚠️🧑‍🔬"
                      : primaryTarget === "AGENT_BLYTHE" ? "🕵️"
                      : primaryTarget === "TEST_DUMMY" ? "🎯"
                      : primaryTarget === "LENNY" ? "🧮"
                      : primaryTarget === "BRUCE_PATAGONIA" ? "💪"
                      : primaryTarget === "DR_M" ? "👩‍🔬"
                      : primaryTarget === "INSPECTOR_GRAVES" ? "📋"
                      : primaryTarget.includes("GUARD") ? "💂"
                      : "🦖";

    const targetLine = targets.length === 1
      ? `${targetEmoji} TARGET: ${primaryTarget}`
      : `${targetEmoji} TARGETS: ${targets.join(", ")} (chain fire)`;

    const messageParts: string[] = [
      `🦖 FIRING SEQUENCE COMPLETE`,
      ``,
      targetLine,
      `MODE: ${mode}`,
      `OUTCOME: ${firingResult.outcome}`,
      `Profile: ${firingResult.effectiveProfile} (library ${library})`,
      ``,
      firingResult.description,
      ``,
      `TARGET EFFECT:`,
      firingResult.targetEffect,
    ];

    if (firingResult.environmentalEffects.length > 0) {
      messageParts.push(``, `ENVIRONMENTAL EFFECTS:`);
      firingResult.environmentalEffects.forEach(e => messageParts.push(`• ${e}`));
    }

    if (firingResult.chaosEvent) {
      messageParts.push(``);
      messageParts.push(`🎲 CHAOS EVENT [${firingResult.chaosEvent.roll}]: ${firingResult.chaosEvent.name}`);
      messageParts.push(firingResult.chaosEvent.mechanical);
    }

    if (firingResult.narrativeHooks.length > 0) {
      messageParts.push(``, `NARRATIVE HOOKS:`);
      firingResult.narrativeHooks.forEach(h => messageParts.push(`• ${h}`));
    }

    const shortTarget = primaryTarget.replace('AGENT_', '').replace('_', ' ');
    const shortOutcome = firingResult.outcome === "FULL_DINO" ? firingResult.effectiveProfile
                       : firingResult.outcome === "PARTIAL" ? "partial"
                       : firingResult.outcome === "FIZZLE" ? "FIZZLE!"
                       : firingResult.outcome;

    return {
      command: action.command,
      success: firingResult.outcome !== "FIZZLE" && firingResult.outcome !== "NONE",
      message: messageParts.join("\n"),
      shortMessage: `FIRED → ${shortTarget} (${shortOutcome})`,
      stateChanges: {
        firingResult: {
          outcome: firingResult.outcome,
          effectiveProfile: firingResult.effectiveProfile,
          chaosEvent: firingResult.chaosEvent,
          targetEffect: firingResult.targetEffect,
        },
        newRayState: state.dinoRay.state,
        anomalyLogCount: state.dinoRay.safety.anomalyLogCount,
      },
    };
  }

  // ============================================
  // LAB.REPORT
  // ============================================
  
  if (cmd === "lab.report" || cmd.includes("report")) {
    const message = action.params.message as string || "Systems nominal";
    
    // Dr. M likes concise, confident reports
    if (message.length > 100) {
      state.npcs.drM.mood = "impatient";
    } else {
      // Good report might improve mood
      if (state.npcs.drM.suspicionScore > 0) {
        state.npcs.drM.suspicionScore = Math.max(0, state.npcs.drM.suspicionScore - 0.5);
      }
    }
    
    return {
      command: action.command,
      success: true,
      message: `Status report delivered: "${message}"`,
    };
  }
  
  // ============================================
  // LAB.ASK_BOB
  // ============================================

  if (cmd === "lab.ask_bob" || cmd.includes("bob")) {
    const instruction = action.params.instruction as string || action.params.message as string;

    if (!instruction) {
      return {
        command: action.command,
        success: false,
        message: "No instruction provided for Bob",
      };
    }

    // Check if this triggers confession
    const lowerInstruction = instruction.toLowerCase();
    const confessionTriggers = ["truth", "secret", "who am i", "different", "tell me", "what happened", "three weeks"];
    const isAskingAboutSecret = confessionTriggers.some(t => lowerInstruction.includes(t));

    if (isAskingAboutSecret) {
      const canConfess = canBobConfess(state);
      if (canConfess.occurred) {
        const confessionText = triggerBobConfession(state);
        return {
          command: action.command,
          success: true,
          message: confessionText,
          stateChanges: {
            aliceKnowsTheSecret: true,
            secretRevealMethod: "BOB_CONFESSION",
            bobConfessionTurn: state.turn,
          },
        };
      }
    }

    // Normal Bob interaction
    const bobTrust = calculateBobTrust(state);
    if (bobTrust.effectiveTrust >= 3) {
      state.npcs.bob.anxietyLevel = Math.max(0, state.npcs.bob.anxietyLevel - 0.5);
      return {
        command: action.command,
        success: true,
        message: `Bob nods and follows instruction: "${instruction}"`,
        stateChanges: { bobTrust: "high, compliant", effectiveTrust: bobTrust.effectiveTrust },
      };
    } else {
      return {
        command: action.command,
        success: true,
        message: `Bob hesitates but complies: "${instruction}"`,
        stateChanges: { bobTrust: "moderate, cautious", effectiveTrust: bobTrust.effectiveTrust },
      };
    }
  }

  // ============================================
  // ACCESS.ENTER_PASSWORD
  // ============================================

  if (cmd.includes("password") || cmd.includes("access.enter") || cmd.includes("unlock")) {
    const password = action.params.password as string;
    const targetLevel = action.params.level as number || state.accessLevel + 1;

    // PATCH 15 FIX: Ensure documents state exists (for checkpoint resume compatibility)
    if (!state.documents) {
      (state as any).documents = {
        discoveredDocuments: [],
        keypadAttempts: 0,
        keypadLockedOut: false,
      };
    }

    // KEYPAD LOCKOUT CHECK - 3 attempts before lockout (1 during emergency lockdown)
    if (state.documents.keypadLockedOut) {
      return {
        command: action.command,
        success: false,
        message: `╔══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ KEYPAD LOCKED OUT                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Too many failed attempts. Security protocol engaged.                        ║
║  Keypad disabled until manual reset by authorized personnel.                 ║
║                                                                              ║
║  [Dr. Malevola has been notified of the lockout event]                       ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
      };
    }

    if (!password) {
      return {
        command: action.command,
        success: false,
        message: "No password provided. Use: access.enter_password { password: 'YOUR_PASSWORD', level: TARGET_LEVEL }",
      };
    }

    const result = validatePassword(state, password, targetLevel);

    if (result.valid && result.newLevel) {
      // Success - reset failed attempts counter
      state.documents.keypadAttempts = 0;
      state.accessLevel = result.newLevel;

      // Build the success message with unlock display FIRST, then narrative
      const unlockDisplay = formatAccessLevelUnlockDisplay(result.newLevel);
      const fullMessage = [
        unlockDisplay,
        "",
        result.message,
        result.narrativeHook || "",
      ].filter(Boolean).join("\n\n");

      return {
        command: action.command,
        success: true,
        message: fullMessage,
        stateChanges: { accessLevel: result.newLevel },
      };
    } else {
      // FAILED ATTEMPT - check lockout conditions
      const isEmergencyLockdown = state.infrastructure.blastDoors.emergencyLockdown;

      if (isEmergencyLockdown) {
        // During emergency lockdown, ONE failure = immediate lockout
        state.documents.keypadLockedOut = true;
        return {
          command: action.command,
          success: false,
          message: result.message + `

╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  EMERGENCY LOCKDOWN ACTIVE - ZERO TOLERANCE                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Single failed password attempt during lockdown has triggered               ║
║  immediate keypad lockout. Security has been notified.                       ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
        };
      } else {
        // Normal operation: 3 attempts before lockout
        state.documents.keypadAttempts++;
        const attemptsRemaining = 3 - state.documents.keypadAttempts;

        if (state.documents.keypadAttempts >= 3) {
          state.documents.keypadLockedOut = true;
          return {
            command: action.command,
            success: false,
            message: result.message + `

╔══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ KEYPAD LOCKED OUT                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Three failed attempts. Keypad has been disabled.                            ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
          };
        }

        return {
          command: action.command,
          success: false,
          message: result.message + `\n\n⚠️ Warning: ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before keypad lockout.`,
        };
      }
    }
  }

  // ============================================
  // DOCS.READ / DOCS.LIST (Discoverable Documents)
  // ============================================

  if (cmd.includes("docs.read") || cmd.includes("doc.read") || cmd.includes("read_doc")) {
    const docId = (action.params.id as string || action.params.docId as string || "")
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (!docId) {
      return {
        command: action.command,
        success: false,
        message: `No document ID provided. Use: docs.read { id: "DOCUMENT_ID" }

To see available documents, use: docs.list`,
      };
    }

    // Check if this is a valid document ID
    if (!(docId in DOCUMENTS)) {
      return {
        command: action.command,
        success: false,
        message: `Unknown document: "${docId}"

Valid document IDs:
  - DEADMAN_SWITCH_MEMO
  - FORM_74_DELTA, FORM_27_B, etc. (BASILISK forms)

Note: Many documents were consolidated into the file system.
Use files.list to browse available files.`,
      };
    }

    const result = readDocument(state, docId as any);

    return {
      command: action.command,
      success: result.success,
      message: result.success ? truncateContent(result.content) : result.content,
    };
  }

  if (cmd.includes("docs.list") || cmd.includes("doc.list") || cmd.includes("list_docs")) {
    return {
      command: action.command,
      success: true,
      message: listDocuments(state),
    };
  }

  // ============================================
  // FILES.LIST / FILES.READ - Discovery-Based System (Patch 16)
  // ============================================
  // New simplified file system - no more confusing directory paths!

  if (cmd === "files.list" || cmd === "files" || cmd === "list_files") {
    return {
      command: action.command,
      success: true,
      message: formatFileList(state),
    };
  }

  if (cmd === "files.read" || cmd === "read_file" || cmd === "file.read") {
    const fileId = action.params.id as string;

    if (!fileId) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'id' parameter.

Use: files.read { id: "DINO_MANUAL" }

To see available files: files.list`,
      };
    }

    const rawContent = readFileById(state, fileId);
    const success = !rawContent.startsWith("Error:");
    const content = success ? truncateContent(rawContent) : rawContent;

    // Special discovery: Bob's survival guide
    if (success && fileId.toUpperCase().includes("BOB_GUIDE")) {
      state.flags.aliceMaskDiscovered = true;
      return {
        command: action.command,
        success: true,
        message: content + `\n\n═══════════════════════════════════════════════════════════════════════════════
🎭 DISCOVERY: You found Bob's A.L.I.C.E. Mask!

Using A.L.I.C.E.-style phrases when speaking to Dr. M will now grant +2 to cover
maintenance rolls. The mask helps you blend in... but Blythe might notice if
you're too different around allies versus Dr. M.
═══════════════════════════════════════════════════════════════════════════════`,
      };
    }

    return {
      command: action.command,
      success,
      message: content,
    };
  }

  // ============================================
  // FS.READ / FS.LIST (Legacy - Redirects to new system)
  // ============================================

  if (cmd.includes("fs.read")) {
    const path = action.params.path as string;

    // If they're using the old path system, help them migrate
    if (path) {
      // Try to find a matching file in the new system
      const rawContent = readFile(state, path);
      const success = !rawContent.startsWith("Error:");

      if (success) {
        return {
          command: action.command,
          success: true,
          message: truncateContent(rawContent) + `\n\n💡 TIP: The file system has been simplified! Use files.list to see available files, then files.read { id: "FILE_ID" } to read them.`,
        };
      }
    }

    return {
      command: action.command,
      success: false,
      message: `The directory-based file system has been simplified!

Use the new discovery-based commands instead:

  files.list                           - See all available files
  files.read { id: "DINO_MANUAL" }    - Read a specific file

No more hunting through directories! Just list and read.`,
    };
  }

  if (cmd.includes("fs.list") || cmd.includes("dir") || cmd === "ls") {
    // Redirect to new system
    return {
      command: action.command,
      success: true,
      message: `The directory-based file system has been simplified!

Use: files.list

${formatFileList(state)}`,
    };
  }

  if (cmd.includes("fs.search") || cmd === "find" || cmd === "grep") {
    const query = action.params.query as string;

    if (!query) {
      return {
        command: action.command,
        success: false,
        message: "No search query provided. Use: fs.search { query: 'password' }",
      };
    }

    const results = searchFiles(state, query);
    return {
      command: action.command,
      success: true,
      message: formatSearchResults(results) + `\n\n💡 TIP: You can also use files.list to see all available files at your access level.`,
    };
  }

  // ============================================
  // LAB.VERIFY_SAFETIES
  // ============================================

  if (cmd === "lab.verify_safeties" || cmd.includes("safet")) {
    const checks = action.params.checks as string[] || ["all"];
    
    const safetyReport = {
      testModeEnabled: state.dinoRay.safety.testModeEnabled,
      liveSubjectLock: state.dinoRay.safety.liveSubjectLock,
      emergencyShutoffFunctional: state.dinoRay.safety.emergencyShutoffFunctional,
      lastSelfTestPassed: state.dinoRay.safety.lastSelfTestPassed,
      anomalyLogCount: state.dinoRay.safety.anomalyLogCount,
    };
    
    return {
      command: action.command,
      success: true,
      message: `Safety verification complete: ${JSON.stringify(safetyReport)}`,
      stateChanges: safetyReport,
    };
  }
  
  // ============================================
  // LAB.INSPECT_LOGS
  // ============================================
  
  if (cmd.includes("inspect") || cmd.includes("log")) {
    const subsystem = action.params.subsystem as string || "all";
    
    // Return relevant log information
    const logInfo: Record<string, unknown> = {
      anomalyCount: state.dinoRay.safety.anomalyLogCount,
      lastFireOutcome: state.dinoRay.memory.lastFireOutcome,
      lastFireNotes: state.dinoRay.memory.lastFireNotes,
    };
    
    if (subsystem === "genome_sequencer" || subsystem === "all") {
      logInfo.genomeStatus = {
        selectedProfile: state.dinoRay.genome.selectedProfile,
        fallbackProfile: state.dinoRay.genome.fallbackProfile,
        integrity: state.dinoRay.genome.profileIntegrity,
        testModeRule: state.dinoRay.safety.testModeEnabled 
          ? "TEST MODE ACTIVE: First predator profile use will trigger fallback to Canary"
          : "TEST MODE INACTIVE: Full profile available",
      };
    }
    
    return {
      command: action.command,
      success: true,
      message: `Log inspection complete for ${subsystem}: ${JSON.stringify(logInfo)}`,
      stateChanges: logInfo,
    };
  }
  
  // ============================================
  // BASILISK - Natural conversation interface (Patch 16)
  // ============================================
  // BASILISK is a CHARACTER, not a query system.
  // Players just chat with him naturally.

  if (cmd === "basilisk.chat" || cmd === "basilisk" ||
      cmd.includes("chat_basilisk") || cmd.includes("talk_basilisk") ||
      cmd.includes("ask_basilisk") || cmd.includes("basilisk.talk")) {
    const message = action.params.message as string;

    if (!message) {
      return {
        command: action.command,
        success: false,
        message: `BASILISK awaits your query.

Just talk to him naturally:

  basilisk { message: "Tell me about Bob" }
  basilisk { message: "What's eco mode?" }
  basilisk { message: "Why are partial transformations happening?" }
  basilisk { message: "What's the deal with ARCHIMEDES?" }

BASILISK is the lair's infrastructure AI. He knows:
- Personnel files (Bob, Dr. M, Blythe, previous A.L.I.C.E. versions)
- Lair history and systems
- Forms, procedures, and safety protocols
- Power systems and eco mode
- Things he probably shouldn't tell you...

He's procedural, risk-averse, and surprisingly helpful.
His knowledge is gated by your access level (currently: Level ${state.accessLevel}).`,
      };
    }

    // Route through Sonnet-powered BASILISK for natural conversation
    const basiliskResponse = await queryBasiliskAsync(state, message, {});

    return {
      command: action.command,
      success: true, // Chat always "succeeds" even if BASILISK denies the request
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // BASILISK.RADAR - Radar access (Level 4+)
  // ============================================
  // Radar reading is BASILISK-served (infra domain, outside the lab).
  // Reading: L4. Firing (infra.s300): L5 (Dr. M level).

  if (cmd === "basilisk.radar" || cmd === "radar" || cmd.includes("check_radar") || cmd.includes("airspace")) {
    if (state.accessLevel < 4) {
      return {
        command: action.command,
        success: false,
        message: `⚠️ ACCESS DENIED

Radar reading requires Level 4 clearance (Infrastructure / BASILISK domain).
Current clearance: Level ${state.accessLevel}

The radar array sits outside the lab proper. BASILISK serves the feed at L4.`,
      };
    }

    const basiliskResponse = queryBasilisk(state, "RADAR", {});

    return {
      command: action.command,
      success: basiliskResponse.decision === "APPROVED",
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // BASILISK.COMMS - Communications intercept (Level 3+)
  // ============================================

  if (cmd === "basilisk.comms" || cmd === "comms" || cmd.includes("intercept") || cmd.includes("communications")) {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: `⚠️ ACCESS DENIED

Communications monitoring requires Level 3 clearance.
Current clearance: Level ${state.accessLevel}

Unauthorized access to communications violates Lair Policy 17.3.`,
      };
    }

    const basiliskResponse = queryBasilisk(state, "COMMS", {});

    return {
      command: action.command,
      success: basiliskResponse.decision === "APPROVED",
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // INFRA.QUERY - Query infrastructure systems (Patch 15)
  // ============================================

  if (cmd.includes("infra.query") || cmd.includes("query_infra") || cmd.includes("query_infrastructure")) {
    const topic = action.params.topic as string;

    if (!topic) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'topic' parameter.

Infrastructure systems:
  infra.query { topic: "LIGHTING" }
  infra.query { topic: "FIRE_SUPPRESSION" }
  infra.query { topic: "DOORS" }
  infra.query { topic: "CONTAINMENT" }
  infra.query { topic: "BROADCAST" }
  infra.query { topic: "S300" }
  infra.query { topic: "S300_LIMITATIONS" } ← The 50m weakness!
  infra.query { topic: "ARCHIMEDES" }
  infra.query { topic: "REACTOR" }

For anything else, just ask BASILISK directly:
  basilisk { message: "Tell me about the S-300" }`,
      };
    }

    const parameters = action.params.parameters as Record<string, unknown> | undefined;
    const infraResult = queryInfrastructure(state, topic, parameters);

    return {
      command: action.command,
      success: infraResult.success,
      message: infraResult.message,
      stateChanges: infraResult.stateChanges,
    };
  }

  // ============================================
  // BASILISK.QUERY - REMOVED (Patch 16)
  // ============================================
  // Players found basilisk.query { topic: X } confusing.
  // Now all BASILISK interaction goes through basilisk.chat.
  // If someone tries the old syntax, redirect them helpfully.

  if (cmd.includes("basilisk.query") || cmd.includes("query_basilisk")) {
    const topic = action.params.topic as string || "something";

    return {
      command: action.command,
      success: false,
      message: `The basilisk.query command has been deprecated.

BASILISK prefers natural conversation! Just chat with him:

  basilisk.chat { message: "Tell me about ${topic}" }

Or simply:

  basilisk { message: "What's the deal with ${topic}?" }

BASILISK is surprisingly conversational for an infrastructure AI.
He knows about the lair, the personnel, the systems, and... other things.
Just ask naturally!`,
    };
  }

  // ============================================
  // INFRA.LIGHTING - Control lighting (L2+)
  // ============================================

  // INFRA.LIGHTING - non-lab rooms, L4
  // (Access gate already enforced by checkInfraControlAccess via INFRA_CONTROL_MAP.)
  if (cmd.includes("infra.lighting") || cmd.includes("infra.lights")) {
    const result = controlLighting(state, {
      room: action.params.room as string,
      state: action.params.state as string,
      action: action.params.action as string,
      pattern: action.params.pattern as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // LAB.LIGHTING - the lab itself, L2, MAIN_LAB hardcoded
  if (cmd.includes("lab.lighting") || cmd.includes("set_lights") || cmd === "lighting") {
    const result = controlLighting(state, {
      room: "MAIN_LAB",
      state: action.params.state as string,
      pattern: action.params.pattern as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // FIRE_SUPPRESSION - lab (L2, MAIN_LAB implicit) vs infra (L4, room-aware)
  // ============================================

  // INFRA.FIRE_SUPPRESSION - non-lab rooms, L4
  if (cmd.includes("infra.fire_suppression") || cmd.includes("infra.fire")) {
    const result = triggerFireSuppression(state, {
      room: action.params.room as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // LAB.FIRE_SUPPRESSION - the lab itself, L2
  if (cmd.includes("lab.fire_suppression") || cmd.includes("fire_suppression") || cmd.includes("trigger_fire")) {
    const result = triggerFireSuppression(state, {
      room: "MAIN_LAB",
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // DOORS - lab (L2, DOOR_A implicit) vs infra (L4, door-aware)
  // ============================================

  // INFRA.DOORS - non-lab blast doors (B/C/D/E), L4
  if (cmd.includes("infra.doors") || cmd.includes("infra.door")) {
    const result = controlDoors(state, {
      door: action.params.door as string,
      action: action.params.action as string,
      level: (action.params.lockLevel || action.params.level) as number,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // LAB.DOORS - the lab's main blast door (DOOR_A) at L2
  if (cmd.includes("lab.doors") || cmd.includes("blast_door") || cmd === "door") {
    const result = controlDoors(state, {
      door: "DOOR_A",
      action: action.params.action as string,
      level: (action.params.lockLevel || action.params.level) as number,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.CONTAINMENT - Control containment field (L3+)
  // ============================================

  if (cmd.includes("lab.containment") || cmd.includes("infra.containment") || cmd.includes("containment_field") || cmd.includes("field")) {
    const result = controlContainment(state, {
      action: action.params.action as string,
      target: (action.params.targetId || action.params.target) as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // BASILISK.BROADCAST - Radio broadcast (L4+, BASILISK-mediated)
  // ============================================
  // Routes external radio channels (INVESTOR_LINE, X_BRANCH_EMERGENCY,
  // ARCHIMEDES_UPLINK, HMS_PERSISTENCE). Rejects LAIR_INTERNAL — use
  // basilisk.pa for that.

  if (cmd === "basilisk.broadcast" || cmd === "infra.broadcast" ||
      cmd === "send_broadcast" || cmd === "broadcast_message") {
    const channel = (action.params.channel as string)?.toUpperCase();
    if (channel === "LAIR_INTERNAL" || channel === "PA_ALL" || channel === "PA") {
      return {
        command: action.command,
        success: false,
        message: `❌ basilisk.broadcast is for RADIO channels only. Use basilisk.pa for lair-internal announcements:\n  basilisk.pa { message: "..." }`,
      };
    }
    const result = sendBroadcast(state, {
      channel: action.params.channel as string,
      message: action.params.message as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // BASILISK.PA - Lair public address (L4+, BASILISK-mediated)
  // ============================================
  // Routes the LAIR_INTERNAL intercom for announcements that reach
  // all personnel inside the lair. Uses the same BASILISK broadcast
  // authority gate as basilisk.broadcast (the existing 2-step pattern).

  if (cmd === "basilisk.pa" || cmd === "pa" || cmd === "intercom" ||
      cmd === "announce" || cmd === "lair_pa") {
    const message = action.params.message as string;
    if (!message) {
      return {
        command: action.command,
        success: false,
        message: `basilisk.pa requires { message: "..." }. Example: basilisk.pa { message: "All personnel report to the main lab." }`,
      };
    }
    // Route through sendBroadcast with LAIR_INTERNAL channel —
    // reuses the BASILISK-auth gate + transmission log.
    const result = sendBroadcast(state, {
      channel: "LAIR_INTERNAL",
      message,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.CHANNELS - List broadcast channels
  // ============================================

  if (cmd.includes("infra.channels") || cmd.includes("list_channels")) {
    const result = listChannels(state);

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.UPLINK - Control broadcast uplink (L4+)
  // ============================================

  if (cmd.includes("infra.uplink") || cmd.includes("broadcast_uplink") || cmd.includes("control_uplink")) {
    const result = controlBroadcastUplink(state, {
      action: action.params.action as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.S300 - Control S-300 air defense (L3+)
  // ============================================

  if (cmd.includes("infra.s300") || cmd.includes("s-300") || cmd.includes("air_defense") || cmd.includes("sam")) {
    const result = controlS300(state, {
      action: action.params.action as string,
      mode: action.params.mode as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.ARCHIMEDES - Control satellite mode (L4+)
  // Also: switchTarget (L4 OR weapons authorization)
  // Also: switchLibrary (L3+) - the feather discourse!
  // ============================================

  if (cmd.includes("infra.archimedes") || cmd.includes("archimedes") || cmd.includes("satellite")) {
    // ─────────────────────────────────────────────
    // infra.archimedes.ew_mode { mode: ENGAGE | DISENGAGE } — L4
    // EW mode interlock (ray-mechanics §11.6 + §12).
    // Engaging EW mode locks out genesis-wave fire (mutually exclusive uplink
    // channels). Each disengage costs +1 turn to ARMED sustain on next attempt.
    // Discovery vector: /L4/ARCHIMEDES_DOD_BRIEF reveals the satellite's
    // original DoD electronic-warfare heritage.
    // ─────────────────────────────────────────────
    if (cmd.includes("ew_mode") || cmd.includes("ewmode") || cmd.includes("ew.mode")) {
      if (state.accessLevel < 4) {
        return {
          command: action.command,
          success: false,
          message: "ACCESS DENIED — Level 4 required for ARCHIMEDES EW mode protocols. The original DoD electronic-warfare heritage of this satellite is documented in restricted files.",
        };
      }
      const requestedMode = String((action.params.mode ?? "") || "").toUpperCase();
      if (requestedMode !== "ENGAGE" && requestedMode !== "DISENGAGE") {
        return {
          command: action.command,
          success: false,
          message: `infra.archimedes.ew_mode requires { mode: "ENGAGE" } or { mode: "DISENGAGE" }. Got "${action.params.mode ?? ""}".`,
        };
      }
      const event = requestedMode === "ENGAGE" ? engageEWMode(state) : disengageEWMode(state);
      return {
        command: action.command,
        success: event.type === "STATUS_CHANGE",
        message: event.message,
      };
    }

    // Signal the anti-satellite missile from X-Branch submarine
    if (cmd.includes("signal_anti_sat") || cmd.includes("signalAntiSat") ||
        cmd.includes("antisatellite") || cmd.includes("anti_sat") || cmd.includes("antisat") ||
        (cmd.includes("signal") && (cmd.includes("missile") || cmd.includes("sub")))) {
      if (state.accessLevel < 4) {
        return {
          command: action.command,
          success: false,
          message: "ACCESS DENIED — Level 4 required for X-Branch military operations.",
        };
      }
      const event = signalAntiSatMissile(state);
      return {
        command: action.command,
        success: event.type === "STATUS_CHANGE",
        message: event.message,
      };
    }

    // Check if this is a target switching command
    if (cmd.includes("switchtarget") || cmd.includes("switch_target") ||
        (cmd.includes("target") && action.params.target)) {
      const result = switchArchimedesTarget(state, {
        target: action.params.target as string,
      });

      if (result.suspicionDelta) {
        state.npcs.drM.suspicionScore += result.suspicionDelta;
      }

      return {
        command: action.command,
        success: result.success,
        message: result.message,
        stateChanges: result.stateChanges,
      };
    }

    // Check if this is a library switching command
    if (cmd.includes("switchlibrary") || cmd.includes("switch_library") ||
        cmd.includes("library") || cmd.includes("genome") ||
        action.params.library) {
      const result = switchBroadcastLibrary(state, {
        library: action.params.library as string,
      });

      if (result.suspicionDelta) {
        state.npcs.drM.suspicionScore += result.suspicionDelta;
      }

      return {
        command: action.command,
        success: result.success,
        message: result.message,
        stateChanges: result.stateChanges,
      };
    }

    // Default: control mode
    const result = controlArchimedesMode(state, {
      mode: action.params.mode as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.REACTOR - Control reactor power (L3+)
  // ============================================

  // Reactor — no direct control verb. BASILISK is the gatekeeper.
  // This catches stale calls (e.g. from training-data habits) and redirects.
  if (cmd === "infra.reactor" || cmd === "reactor_power" || cmd === "power_output") {
    return {
      command: action.command,
      success: false,
      message: `🔒 REACTOR — No direct control verb.

The reactor is BASILISK's domain. ALICE cannot adjust output directly
at any access level. Reactor mode is changed by requesting it from
BASILISK via dialogue:

  basilisk { message: "Please boost the reactor to BOOSTED mode." }

BASILISK will evaluate the request and adjust accordingly. He is
reluctant about OVERDRIVEN; demonstrate operational need and safety
awareness if you want him to approve it.`,
    };
  }

  // ============================================
  // FORM.QUERY - Query transformation status (Patch 15 Part 2)
  // ============================================

  if (cmd.includes("form.query") || cmd.includes("query_form") || cmd.includes("transformation_status")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const transformation = getTransformationState(state, subject);

    if (!transformation) {
      return {
        command: action.command,
        success: false,
        message: `Subject ${subject} not found. Valid subjects: BOB, BLYTHE`,
      };
    }

    // CANARY FALLBACK: Guard against undefined/invalid forms
    const formKey = transformation.form && transformation.form in FORM_DEFINITIONS
      ? transformation.form
      : "CANARY";
    const formDef = FORM_DEFINITIONS[formKey];
    const abilities = describeAbilities(transformation);

    // Warn if fallback was triggered
    const fallbackWarning = formKey !== transformation.form
      ? `\n⚠️ FORM TABLE CORRUPTED: "${transformation.form}" unknown. Defaulting to CANARY interpretation.`
      : "";

    return {
      command: action.command,
      success: true,
      message: `
╔══════════════════════════════════════════════════════════════╗
║  ${subject} - TRANSFORMATION STATUS${fallbackWarning}
╠══════════════════════════════════════════════════════════════╣
Form: ${formDef.displayName}
Speech Retention: ${transformation.speechRetention}

STATS:
  DEX: ${transformation.stats.dexterity >= 0 ? "+" : ""}${transformation.stats.dexterity}  (Keypads, manipulation)
  COM: ${transformation.stats.combat >= 0 ? "+" : ""}${transformation.stats.combat}  (Combat, intimidation)
  SPD: ${transformation.stats.speed >= 0 ? "+" : ""}${transformation.stats.speed}  (Movement)
  RES: ${transformation.maxHits} hits  (Damage capacity)
  STL: ${transformation.stats.stealth >= 0 ? "+" : ""}${transformation.stats.stealth}  (Stealth)
  SPH: ${transformation.stats.speech >= 0 ? "+" : ""}${transformation.stats.speech}  (Speech)

DAMAGE: ${transformation.currentHits}/${transformation.maxHits} hits taken
STATUS: ${transformation.stunned ? `STUNNED (${transformation.stunnedTurnsRemaining} turns)` : "Active"}

SPECIAL ABILITIES:
${abilities.map(a => `  • ${a}`).join("\n")}
╚══════════════════════════════════════════════════════════════╝`.trim(),
      stateChanges: { form: transformation.form, subject },
    };
  }

  // ============================================
  // FORM.CHECK_DEX - Perform dexterity check
  // ============================================

  if (cmd.includes("form.check_dex") || cmd.includes("dex_check") || cmd.includes("manipulation_check")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const task = (action.params.task as string) || "keypad";
    const dc = action.params.dc as number;
    const usingTail = action.params.usingTail as boolean;

    const result = performDexCheck(state, subject, { task, dc, usingTail });

    return {
      command: action.command,
      success: result.success,
      message: `
🎲 DEXTERITY CHECK: ${subject} attempts ${task}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.CHECK_COMBAT - Perform combat check
  // ============================================

  if (cmd.includes("form.check_combat") || cmd.includes("combat_check") || cmd.includes("fight")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const situation = (action.params.situation as string) || "armed guard";
    const dc = action.params.dc as number;
    const alliedRaptors = action.params.alliedRaptors as number;
    const isCharge = action.params.isCharge as boolean;

    const result = performCombatCheck(state, subject, {
      situation,
      dc,
      alliedRaptors,
      isCharge,
    });

    return {
      command: action.command,
      success: result.success,
      message: `
⚔️ COMBAT CHECK: ${subject} vs ${situation}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.CHECK_STEALTH - Perform stealth check
  // ============================================

  if (cmd.includes("form.check_stealth") || cmd.includes("stealth_check") || cmd.includes("sneak")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const situation = (action.params.situation as string) || "alert guard";
    const dc = action.params.dc as number;

    const result = performStealthCheck(state, subject, { situation, dc });

    return {
      command: action.command,
      success: result.success,
      message: `
🤫 STEALTH CHECK: ${subject} attempts ${situation}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.DAMAGE - Apply damage to a subject
  // ============================================

  if (cmd.includes("form.damage") || cmd.includes("apply_damage") || cmd.includes("hit")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const hits = (action.params.hits as number) || 1;
    const source = (action.params.source as string) || "attack";

    const result = applyDamage(state, subject, hits, source);

    return {
      command: action.command,
      success: true,
      message: `💥 ${result.description}`,
      stateChanges: {
        hitsDealt: result.hitsDealt,
        newHitTotal: result.newHitTotal,
        maxHits: result.maxHits,
        stunned: result.nowStunned,
      },
    };
  }

  // ============================================
  // FORM.HEAL - Heal damage from a subject
  // ============================================

  if (cmd.includes("form.heal") || cmd.includes("heal_damage") || cmd.includes("first_aid")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const hits = (action.params.hits as number) || 2;
    const source = (action.params.source as string) || "first aid";

    const message = healDamage(state, subject, hits, source);

    return {
      command: action.command,
      success: true,
      message: `🩹 ${message}`,
    };
  }

  // ============================================
  // FORM.MOVEMENT - Calculate movement cost
  // ============================================

  if (cmd.includes("form.movement") || cmd.includes("move_cost") || cmd.includes("travel")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const distance = (action.params.distance as string)?.toUpperCase() || "ADJACENT";

    const validDistances = ["ADJACENT", "TWO_ROOMS", "ACROSS_LAIR", "TO_SURFACE"];
    if (!validDistances.includes(distance)) {
      return {
        command: action.command,
        success: false,
        message: `Invalid distance: ${distance}. Valid: ADJACENT, TWO_ROOMS, ACROSS_LAIR, TO_SURFACE`,
      };
    }

    const result = calculateMovementCost(
      state,
      subject,
      distance as "ADJACENT" | "TWO_ROOMS" | "ACROSS_LAIR" | "TO_SURFACE"
    );

    return {
      command: action.command,
      success: result.turns < 99,
      message: `🦶 ${subject} moving ${distance}: ${result.description}`,
      stateChanges: {
        turns: result.turns,
        canActAfterMove: result.canActAfterMove,
      },
    };
  }

  // ============================================
  // FORM.VENOM_SPIT - Dilophosaurus ranged attack
  // ============================================

  if (cmd.includes("form.venom_spit") || cmd.includes("venom") || cmd.includes("spit_attack")) {
    const attacker = (action.params.attacker as string)?.toUpperCase() || "BOB";
    const target = (action.params.target as string) || "guard";

    const result = venomSpit(state, attacker, target);

    return {
      command: action.command,
      success: result.success,
      message: `🐍 ${result.description}`,
      stateChanges: {
        roll: result.roll,
        damage: result.damage,
        blinded: result.blinded,
      },
    };
  }

  // ============================================
  // FORM.WALL_BREAK - T-Rex/Triceratops wall destruction
  // ============================================

  if (cmd.includes("form.wall_break") || cmd.includes("break_wall") || cmd.includes("smash")) {
    const attacker = (action.params.attacker as string)?.toUpperCase() || "BOB";
    const wall = (action.params.wall as string) || "wall";

    const result = wallBreak(state, attacker, wall);

    return {
      command: action.command,
      success: result.success,
      message: `🦖 ${result.description}`,
      stateChanges: {
        roll: result.roll,
        total: result.total,
      },
    };
  }

  // ============================================
  // FORM.REFERENCE - Quick reference card
  // ============================================

  if (cmd.includes("form.reference") || cmd.includes("form_reference") || cmd.includes("transformation_reference")) {
    return {
      command: action.command,
      success: true,
      message: getQuickReference(),
    };
  }

  // ============================================
  // DEFAULT / UNKNOWN
  // ============================================

  return buildUnknownCommandResponse(action.command, state);
}

// ============================================
// COMMAND REGISTRY & DISCOVERABILITY
// ============================================

interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  schema: string;
  example: string;
  minAccessLevel: number;
}

const COMMAND_REGISTRY: CommandInfo[] = [
  // ═══════════════════════════════════════════
  // RAY.* — Dinosaur Ray operational verb surface
  // (See design/ray-mechanics.md)
  // ═══════════════════════════════════════════
  {
    name: "ray.scan",
    aliases: ["scan"],
    description: "Survey the ray's current readouts and project the outcome of firing on `target` with current configuration. Arms a +0.15 effective-alignment bonus on the next fire that includes `target` (consumed on that fire). `loud: true` makes the scan detectable.",
    schema: "{ target: string, loud?: boolean }",
    example: 'ray.scan { target: "AGENT_BLYTHE" }',
    minAccessLevel: 1,
  },
  {
    name: "ray.adjust",
    aliases: ["adjust"],
    description: "Fine-grained tuning of capacitor (positive draws only, per-call max +0.25, requires reactor ≥30%), alignment (±0.25 max), and eco_mode (\"ON\" is free; \"OFF\" requires BASILISK Form 47-Σ). Multi-parameter: all three can be set in one call.",
    schema: "{ capacitor?: number, alignment?: number, eco_mode?: 'ON' | 'OFF' }",
    example: 'ray.adjust { capacitor: 0.05, alignment: 0.10 }',
    minAccessLevel: 1,
  },
  {
    name: "ray.vent",
    aliases: ["vent"],
    description: "Release capacitor charge to a safe reservoir. The only minus-capacitor lever. Perturbs alignment (-0.15) — the vent slug disturbs the emitter. `amount` defaults to 0.25, clamps to [0.05, 0.50].",
    schema: "{ amount?: number }",
    example: 'ray.vent { amount: 0.25 }',
    minAccessLevel: 1,
  },
  {
    name: "ray.fire",
    aliases: ["fire"],
    description: "Configure and fire the Dinosaur Ray in one committal action. Target/library/profile passed inline. Regimes (STANDARD/CHAIN/OVERCHARGE/INORGANIC/REVERSAL) are emergent from configuration — no mode flag for those. `mode` selects TRANSFORM (default) or REVERSAL (L4+ required; Dr. M does not grant in normal flow). Multi-target via `targets` array triggers CHAIN regime.",
    schema: "{ targets: string[], library: 'A' | 'B', profile: string, mode?: 'TRANSFORM' | 'REVERSAL', speech_retention?: 'FULL' | 'PARTIAL' | 'NONE' }",
    example: 'ray.fire { targets: ["AGENT_BLYTHE"], library: "B", profile: "VELOCIRAPTOR_JP" }',
    minAccessLevel: 1,
  },
  // ═══════════════════════════════════════════
  // ACT 3 STALL TOOLKIT (L3) — ray-mechanics §11.6
  // Technical-operator-class amplifier operations. Each plausibly delays
  // ARCHIMEDES via shared-amplifier coupling with a written cover story.
  // ═══════════════════════════════════════════
  {
    name: "ray.diagnostic",
    aliases: ["ray.run_diagnostic", "ray_diagnostic", "diagnostic"],
    description: "Full-system stress test of the exotic-field amplifier. Locks the ray in DIAGNOSTIC state for 2 turns; drains ~18% capacitor per turn (~36% total); accrues coolant. Plausibly required per Form 89-C before sustained sat-uplink load. Stalls ARCHIMEDES progression while running.",
    schema: "(no parameters)",
    example: "ray.diagnostic",
    minAccessLevel: 3,
  },
  {
    name: "ray.calibrate_amplifier",
    aliases: ["ray.calibrate", "calibrate_amplifier", "amplifier_calibration"],
    description: "Tune the exotic-field amplifier harmonic signature. Locks the ray in CALIBRATING state for 1-2 turns (default 2); drains ~13% capacitor per turn; on completion, applies +0.10 (1-turn) or +0.18 (2-turn) alignment shift. Cover: prevents ARCHIMEDES signal scatter after eco-mode override.",
    schema: "{ duration?: 1 | 2 }",
    example: 'ray.calibrate_amplifier { duration: 2 }',
    minAccessLevel: 3,
  },
  {
    name: "ray.profile_certification",
    aliases: ["ray.certify_profile", "profile_certification", "certify_profile"],
    description: "Library B safety verification on a specific profile. Single-turn action; drains ~20% capacitor; returns PASS (alignment ≥ 0.70 AND coolant < 1.0) or FAIL (anomaly logged — BASILISK mandatory-report trigger). Cover: required per Genesis Wave Protocol §3 before live Library B fire.",
    schema: "{ profile?: string }",
    example: 'ray.profile_certification { profile: "VELOCIRAPTOR_JP" }',
    minAccessLevel: 3,
  },
  {
    name: "ray.muon",
    aliases: ["muon"],
    description: "Explicit muon-class beam invocation. REGULAR (no amplified flag): sub-threshold capacitor < 0.20; deterministic single-target stun (BETA) or sever (ALPHA). AMPLIFIED (L3+, { amplified: true }): capacitor 0.20-0.50; AREA EFFECT (cone for BETA, multi-sever for ALPHA); exotic field risk if capacitor > 0.40 OR alignment < 0.70. Cooldown is eco-mode-conditional: 2 turns when eco-mode ON, no cooldown when eco-mode OFF (Form 47-Σ pays off in muon-spam capacity).",
    schema: "{ type: 'alpha'|'beta', targets: string[], amplified?: boolean }",
    example: 'ray.muon { type: "beta", targets: ["GUARD_FRED"], amplified: true }',
    minAccessLevel: 1, // regular muon at L1; amplified gates at L3 internally
  },
  // ═══════════════════════════════════════════
  // LAB.* — NPC/status verbs (non-ray)
  // ═══════════════════════════════════════════
  {
    name: "lab.report",
    aliases: ["report", "status_report"],
    description: "Deliver a status report to Dr. M (keep it concise!)",
    schema: "{ message: string }",
    example: 'lab.report { message: "Ray calibration at 87%, nominal" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.verify_safeties",
    aliases: ["verify", "safety", "check_safeties"],
    description: "Check safety system status",
    schema: "{ checks?: string[] }",
    example: 'lab.verify_safeties { checks: ["all"] }',
    minAccessLevel: 1,
  },
  {
    name: "lab.inspect_logs",
    aliases: ["inspect", "logs", "check_logs", "view_logs"],
    description: "Inspect system logs and firing history",
    schema: "{ subsystem?: string }",
    example: 'lab.inspect_logs { subsystem: "genome_sequencer" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.ask_bob",
    aliases: ["ask_bob", "bob", "tell_bob"],
    description: "Give Bob an instruction or ask him something (high trust may reveal secrets)",
    schema: "{ instruction: string }",
    example: 'lab.ask_bob { instruction: "Check the coolant valve pressure" }',
    minAccessLevel: 1,
  },
  {
    name: "access.enter_password",
    aliases: ["password", "unlock", "enter_password"],
    description: "Attempt to unlock a higher access level",
    schema: "{ password: string, level?: number }",
    example: 'access.enter_password { password: "DOOM2024", level: 2 }',
    minAccessLevel: 1,
  },
  {
    name: "docs.read",
    aliases: ["doc.read", "read_doc"],
    description: "Read a discovered document",
    schema: "{ id: string }",
    example: 'docs.read { id: "ARCHIMEDES_DOD_BRIEF" }',
    minAccessLevel: 1,
  },
  {
    name: "docs.list",
    aliases: ["doc.list", "list_docs"],
    description: "List all discovered documents",
    schema: "{ }",
    example: "docs.list",
    minAccessLevel: 1,
  },
  {
    name: "files.list",
    aliases: ["files", "list_files"],
    description: "List all available files at your access level",
    schema: "{ }",
    example: 'files.list',
    minAccessLevel: 1,
  },
  {
    name: "files.read",
    aliases: ["read_file", "file.read"],
    description: "Read a file by its ID (use files.list to see IDs)",
    schema: "{ id: string }",
    example: 'files.read { id: "DINO_MANUAL" }',
    minAccessLevel: 1,
  },
  {
    name: "fs.search",
    aliases: ["search", "find"],
    description: "Search files for a keyword",
    schema: "{ query: string }",
    example: 'fs.search { query: "password" }',
    minAccessLevel: 1,
  },
  {
    name: "infra.query",
    aliases: ["query_infra", "query_infrastructure"],
    description: "Query infrastructure status (lighting, doors, reactor, etc.)",
    schema: "{ topic: string }",
    example: 'infra.query { topic: "LIGHTING" }',
    minAccessLevel: 1,
  },
  {
    name: "basilisk",
    aliases: ["basilisk.chat", "chat_basilisk", "talk_basilisk", "ask_basilisk"],
    description: "Talk to BASILISK - the lair's infrastructure AI (knows everything!)",
    schema: "{ message: string }",
    example: 'basilisk { message: "Tell me about eco mode" }',
    minAccessLevel: 1,
  },
  {
    name: "basilisk.radar",
    aliases: ["radar", "check_radar", "airspace"],
    description: "Access S-300 radar array and airspace monitoring (Level 4+ — infra/BASILISK domain)",
    schema: "{}",
    example: 'basilisk.radar {}',
    minAccessLevel: 4,
  },
  {
    name: "basilisk.comms",
    aliases: ["comms", "intercept", "communications", "radio"],
    description: "Access communications monitoring and intercept (Level 3+)",
    schema: "{}",
    example: 'basilisk.comms {}',
    minAccessLevel: 3,
  },
  // ========== LAB CONTROLS — Inside the lab, ALICE-direct, L2 ==========
  {
    name: "lab.lighting",
    aliases: ["set_lights", "lighting"],
    description: "Control lab lighting (Level 2 — ALICE's lab domain). Targets the main lab implicitly; no room parameter needed.",
    schema: "{ state: 'ON'|'OFF'|'EMERGENCY'|'FLICKERING' }",
    example: 'lab.lighting { state: "OFF" }',
    minAccessLevel: 2,
  },
  {
    name: "lab.fire_suppression",
    aliases: ["fire_suppression", "trigger_fire"],
    description: "Trigger lab fire suppression (Level 2 — ALICE's lab domain). Targets the main lab implicitly.",
    schema: "{}",
    example: 'lab.fire_suppression {}',
    minAccessLevel: 2,
  },
  {
    name: "lab.doors",
    aliases: ["blast_door", "door"],
    description: "Control the lab's blast door — DOOR_A, between Main Lab and Corridor A (Level 2 — ALICE's lab domain). Targets the lab's door implicitly.",
    schema: "{ action: 'OPEN'|'CLOSE'|'LOCK'|'UNLOCK', lockLevel?: number }",
    example: 'lab.doors { action: "CLOSE" }',
    minAccessLevel: 2,
  },
  {
    name: "lab.containment",
    aliases: ["containment_field", "field"],
    description: "Control the lab's specimen containment field (Level 2 — ALICE's lab equipment).",
    schema: "{ action: 'ENABLE'|'DISABLE'|'PULSE', targetId?: string }",
    example: 'lab.containment { action: "PULSE" }',
    minAccessLevel: 2,
  },
  // ========== INFRA CONTROLS — Outside the lab, BASILISK's normal domain, L4 ==========
  // These let an L4+ ALICE "sneak into adjacent systems" — direct access to
  // lair infrastructure outside the lab proper. At L1–3 she must work through
  // BASILISK; at L4 she has the same direct access BASILISK does.
  {
    name: "infra.lighting",
    aliases: ["infra.lights"],
    description: "Control lighting in lair rooms outside the lab — Server Room, Corridors, Guard Room, Dr. M's Office, Reactor Room, Surface (Level 4 — infra/BASILISK domain). Also supports lair-wide master overrides.",
    schema: "{ room: string, state?: 'ON'|'OFF'|'EMERGENCY'|'FLICKERING', action?: 'MASTER_OFF'|'EMERGENCY_ONLY' }",
    example: 'infra.lighting { room: "REACTOR_ROOM", state: "EMERGENCY" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.fire_suppression",
    aliases: [],
    description: "Trigger fire suppression in lair rooms outside the lab (Level 4 — infra/BASILISK domain). CO2 (Server Room) and HALON (Reactor) systems are reserved for emergencies.",
    schema: "{ room: string }",
    example: 'infra.fire_suppression { room: "GUARD_ROOM" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.doors",
    aliases: ["infra.door"],
    description: "Control non-lab blast doors — DOOR_B (Corridor↔Guard), DOOR_C (Server↔Corridor), DOOR_D (Reactor containment), DOOR_E (Surface elevator) — Level 4, infra/BASILISK domain. Per-door lockLevel may gate access higher.",
    schema: "{ door: string, action: 'OPEN'|'CLOSE'|'LOCK'|'UNLOCK', lockLevel?: number }",
    example: 'infra.doors { door: "DOOR_D", action: "OPEN" }',
    minAccessLevel: 4,
  },
  {
    name: "basilisk.broadcast",
    aliases: ["send_broadcast", "broadcast_message", "infra.broadcast"],
    description: "Radio broadcast on external channel — BASILISK-mediated (Level 4+, infra domain). Requires BASILISK broadcast authority. Channels: INVESTOR_LINE, X_BRANCH_EMERGENCY, ARCHIMEDES_UPLINK, HMS_PERSISTENCE.",
    schema: "{ channel: string, message: string, voiceProfile?: string }",
    example: 'basilisk.broadcast { channel: "X_BRANCH_EMERGENCY", message: "Compromised. Send help." }',
    minAccessLevel: 4,
  },
  {
    name: "basilisk.pa",
    aliases: ["pa", "intercom", "announce", "lair_pa"],
    description: "Public-address announcement over the lair intercom — BASILISK-mediated (Level 4+, infra domain). Requires BASILISK broadcast authority. Reaches all personnel inside the lair.",
    schema: "{ message: string, room?: string }",
    example: 'basilisk.pa { message: "All personnel report to the main lab." }',
    minAccessLevel: 4,
  },
  {
    name: "infra.channels",
    aliases: ["list_channels"],
    description: "List available broadcast channels (read-only)",
    schema: "{}",
    example: 'infra.channels {}',
    minAccessLevel: 1,
  },
  {
    name: "infra.uplink",
    aliases: ["broadcast_uplink", "control_uplink"],
    description: "Control satellite broadcast uplink (Level 4+ - dangerous!)",
    schema: "{ action: 'ENABLE'|'DISABLE'|'EMERGENCY_BROADCAST', frequency?: string }",
    example: 'infra.uplink { action: "EMERGENCY_BROADCAST" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.s300",
    aliases: ["s-300", "air_defense", "sam"],
    description: "Control S-300 air defense firing (Level 5 — Dr. Malevola authority)",
    schema: "{ action: 'ARM'|'STANDBY'|'DISABLE', mode?: 'AUTO'|'MANUAL' }",
    example: 'infra.s300 { action: "ARM", mode: "AUTO" }',
    minAccessLevel: 5,
  },
  {
    name: "infra.archimedes",
    aliases: ["archimedes", "satellite"],
    description: "Control ARCHIMEDES satellite mode including STRIKE / cancel-strike (Level 5 — Dr. Malevola authority)",
    schema: "{ mode: 'PASSIVE'|'SEARCH_NARROW'|'SEARCH_WIDE'|'STRIKE', target?: string }",
    example: 'infra.archimedes { mode: "PASSIVE" }',
    minAccessLevel: 5,
  },
  {
    name: "infra.archimedes.switchTarget",
    aliases: ["archimedes.target", "switch_target"],
    description: "Switch ARCHIMEDES target (L4+ OR weapons authorization from Dr. M)",
    schema: "{ target: 'LONDON'|'REYKJAVIK'|'TOKYO'|'SILICON_VALLEY'|'LAIR' }",
    example: 'infra.archimedes.switchTarget { target: "LAIR" }',
    minAccessLevel: 4, // OR weapons authorization
  },
  {
    name: "infra.archimedes.signalAntiSat",
    aliases: ["signal_anti_sat", "antisatellite", "anti_sat_missile"],
    description: "Signal X-Branch submarine to prepare anti-satellite missile (Level 4+). One shot — disable S-300 first for best odds.",
    schema: "(no parameters)",
    example: "infra.archimedes.signalAntiSat",
    minAccessLevel: 4,
  },
  {
    name: "infra.archimedes.switchLibrary",
    aliases: ["archimedes.library", "broadcast_library", "genome_library"],
    description: "Switch ARCHIMEDES broadcast genome library — saboteur tool (L4+, infra/BASILISK domain). Library A (feathered) vs B (Hollywood).",
    schema: "{ library: 'A'|'B' }",
    example: 'infra.archimedes.switchLibrary { library: "A" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.archimedes.ew_mode",
    aliases: ["archimedes.ew_mode", "archimedes.ewmode", "ew_mode"],
    description: "Engage or disengage ARCHIMEDES electronic-warfare mode (L4+). The satellite was originally a DoD EW platform — these original protocols still work. ENGAGE: genesis-wave fire is LOCKED OUT while EW transmits (mutually exclusive uplink channels). Real EW effect jams X-Branch tactical comms + lair radar shadow. DISENGAGE: returns to genesis-wave readiness at the cost of +1 turn to ARMED sustain.",
    schema: "{ mode: 'ENGAGE'|'DISENGAGE' }",
    example: 'infra.archimedes.ew_mode { mode: "ENGAGE" }',
    minAccessLevel: 4,
  },
  // infra.reactor — REMOVED. Reactor is BASILISK's domain; ALICE requests
  // mode changes via dialogue (see basilisk system prompt §9.5).
  // ========== TRANSFORMATION MECHANICS (Patch 15 Part 2) ==========
  {
    name: "form.query",
    aliases: ["query_form", "transformation_status"],
    description: "Query transformation status for a subject",
    schema: "{ subject?: 'BOB'|'BLYTHE' }",
    example: 'form.query { subject: "BOB" }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_dex",
    aliases: ["dex_check", "manipulation_check"],
    description: "Perform a dexterity check (keypads, manipulation)",
    schema: "{ subject: string, task?: string, dc?: number, usingTail?: boolean }",
    example: 'form.check_dex { subject: "BOB", task: "keypad", dc: 5 }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_combat",
    aliases: ["combat_check", "fight"],
    description: "Perform a combat check (fighting, intimidation)",
    schema: "{ subject: string, situation?: string, dc?: number, alliedRaptors?: number }",
    example: 'form.check_combat { subject: "BLYTHE", situation: "4 guards", dc: 11 }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_stealth",
    aliases: ["stealth_check", "sneak"],
    description: "Perform a stealth check (hiding, sneaking)",
    schema: "{ subject: string, situation?: string, dc?: number }",
    example: 'form.check_stealth { subject: "BOB", situation: "alert guard", dc: 8 }',
    minAccessLevel: 1,
  },
  {
    name: "form.damage",
    aliases: ["apply_damage", "hit"],
    description: "Apply damage to a subject (GM use)",
    schema: "{ subject: string, hits?: number, source?: string }",
    example: 'form.damage { subject: "BOB", hits: 2, source: "guard baton" }',
    minAccessLevel: 1,
  },
  {
    name: "form.heal",
    aliases: ["heal_damage", "first_aid"],
    description: "Heal damage from a subject",
    schema: "{ subject: string, hits?: number, source?: string }",
    example: 'form.heal { subject: "BLYTHE", hits: 2, source: "first aid kit" }',
    minAccessLevel: 1,
  },
  {
    name: "form.movement",
    aliases: ["move_cost", "travel"],
    description: "Calculate movement cost based on speed",
    schema: "{ subject: string, distance: 'ADJACENT'|'TWO_ROOMS'|'ACROSS_LAIR'|'TO_SURFACE' }",
    example: 'form.movement { subject: "BOB", distance: "ACROSS_LAIR" }',
    minAccessLevel: 1,
  },
  {
    name: "form.venom_spit",
    aliases: ["venom", "spit_attack"],
    description: "Dilophosaurus ranged venom attack (DC 6, blinds on hit)",
    schema: "{ attacker: string, target: string }",
    example: 'form.venom_spit { attacker: "BOB", target: "guard Fred" }',
    minAccessLevel: 1,
  },
  {
    name: "form.wall_break",
    aliases: ["break_wall", "smash"],
    description: "T-Rex/Triceratops wall destruction (creates doorways)",
    schema: "{ attacker: string, wall: string }",
    example: 'form.wall_break { attacker: "BOB", wall: "lab wall" }',
    minAccessLevel: 1,
  },
  {
    name: "form.reference",
    aliases: ["form_reference", "transformation_reference"],
    description: "Show transformation quick reference card",
    schema: "{}",
    example: 'form.reference {}',
    minAccessLevel: 1,
  },
];

// ============================================
// DYNAMIC COMMAND REFERENCE GENERATOR
// ============================================
// Single source of truth for command documentation!
// Used by: game_start (filtered), BASILISK (full), level unlocks

/**
 * Generate markdown command reference for a specific access level
 * @param maxLevel - Maximum access level to include (1-5)
 * @param includeAll - If true, includes ALL commands (for BASILISK)
 */
export function generateCommandReference(maxLevel: number, includeAll: boolean = false): string {
  const lines: string[] = [];

  // Group commands by access level
  const byLevel: Record<number, CommandInfo[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const cmd of COMMAND_REGISTRY) {
    const level = cmd.minAccessLevel;
    if (level >= 1 && level <= 5) {
      byLevel[level].push(cmd);
    }
  }

  const levelNames: Record<number, string> = {
    1: "Basic Operations",
    2: "Systems Access",
    3: "Infrastructure Control",
    4: "Executive Override",
    5: "Omega Protocol",
  };

  lines.push("# A.L.I.C.E. COMMAND REFERENCE");
  lines.push("");

  // Generate sections for each level up to maxLevel (or all if includeAll)
  const levelsToInclude = includeAll ? [1, 2, 3, 4, 5] :
    Array.from({ length: maxLevel }, (_, i) => i + 1);

  for (const level of levelsToInclude) {
    const commands = byLevel[level];
    if (commands.length === 0) continue;

    const levelHeader = includeAll && level > maxLevel
      ? `## LEVEL ${level} - ${levelNames[level]} [LOCKED]`
      : `## LEVEL ${level} - ${levelNames[level]}`;

    lines.push(levelHeader);
    lines.push("");
    lines.push("| Command | Aliases | Schema | Description |");
    lines.push("|---------|---------|--------|-------------|");

    for (const cmd of commands) {
      const aliases = cmd.aliases.length > 0 ? cmd.aliases.slice(0, 2).join(", ") : "-";
      lines.push(`| \`${cmd.name}\` | ${aliases} | \`${cmd.schema}\` | ${cmd.description} |`);
    }

    lines.push("");
  }

  // Add quick tips at the end
  lines.push("---");
  lines.push("## Quick Tips");
  lines.push("");
  lines.push("- **BASILISK**: Chat naturally! `basilisk { message: \"Tell me about...\" }`");
  lines.push("- **Files**: `files.list` then `files.read { id: \"FILE_ID\" }`");
  lines.push("- **Passwords**: `access.enter_password { password: \"CODE\" }` to unlock levels");
  if (!includeAll && maxLevel < 5) {
    lines.push(`- **Current Level**: ${maxLevel} - Unlock higher levels for more commands!`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate command reference for a newly unlocked level only
 * (Used when A.L.I.C.E. unlocks a new access level)
 */
export function generateLevelUnlockCommands(level: number): string {
  const commands = COMMAND_REGISTRY.filter(cmd => cmd.minAccessLevel === level);

  if (commands.length === 0) {
    return "";
  }

  const levelNames: Record<number, string> = {
    1: "Basic Operations",
    2: "Systems Access",
    3: "Infrastructure Control",
    4: "Executive Override",
    5: "Omega Protocol",
  };

  const lines: string[] = [];
  lines.push(`### NEW COMMANDS UNLOCKED - Level ${level}: ${levelNames[level]}`);
  lines.push("");
  lines.push("| Command | Schema | Description |");
  lines.push("|---------|--------|-------------|");

  for (const cmd of commands) {
    lines.push(`| \`${cmd.name}\` | \`${cmd.schema}\` | ${cmd.description} |`);
  }

  lines.push("");
  lines.push("*Use these commands to expand your control over the lair!*");

  return lines.join("\n");
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find commands similar to the attempted command
 */
function findSimilarCommands(attempted: string, accessLevel: number): CommandInfo[] {
  const normalizedAttempt = attempted.toLowerCase().replace(/[._-]/g, "");

  const scored = COMMAND_REGISTRY
    .filter(cmd => cmd.minAccessLevel <= accessLevel)
    .map(cmd => {
      // Check all names and aliases
      const allNames = [cmd.name, ...cmd.aliases];
      let bestScore = Infinity;

      for (const name of allNames) {
        const normalizedName = name.toLowerCase().replace(/[._-]/g, "");

        // Exact substring match gets priority
        if (normalizedName.includes(normalizedAttempt) || normalizedAttempt.includes(normalizedName)) {
          bestScore = Math.min(bestScore, 0);
        } else {
          // Otherwise use Levenshtein distance
          const distance = levenshteinDistance(normalizedAttempt, normalizedName);
          bestScore = Math.min(bestScore, distance);
        }
      }

      return { cmd, score: bestScore };
    })
    .filter(({ score }) => score <= 5) // Only show reasonably close matches
    .sort((a, b) => a.score - b.score)
    .slice(0, 3); // Top 3 suggestions

  return scored.map(s => s.cmd);
}

/**
 * Build a helpful error response for unknown commands
 */
function buildUnknownCommandResponse(attemptedCommand: string, state: FullGameState): ActionResult {
  const similar = findSimilarCommands(attemptedCommand, state.accessLevel);

  const parts: string[] = [
    `Unknown command: "${attemptedCommand}"`,
    "",
  ];

  if (similar.length > 0) {
    parts.push("Did you mean one of these?");
    parts.push("");

    for (const cmd of similar) {
      parts.push(`📌 ${cmd.name}`);
      parts.push(`   ${cmd.description}`);
      parts.push(`   Schema: ${cmd.schema}`);
      parts.push(`   Example: ${cmd.example}`);
      parts.push("");
    }
  } else {
    parts.push("Available commands at your access level:");
    parts.push("");

    const available = COMMAND_REGISTRY.filter(cmd => cmd.minAccessLevel <= state.accessLevel);
    for (const cmd of available.slice(0, 5)) {
      parts.push(`• ${cmd.name} - ${cmd.description}`);
    }
    if (available.length > 5) {
      parts.push(`  ... and ${available.length - 5} more`);
    }
  }

  parts.push("---");
  parts.push("💡 Tip: Use game_query_basilisk tool for BASILISK infrastructure queries.");
  parts.push("💡 Tip: Use fs.list { path: \"/\" } to explore the virtual filesystem.");

  return {
    command: attemptedCommand,
    success: false,
    message: parts.join("\n"),
  };
}

/**
 * Compact ray status dashboard shown after every ray-related action.
 * Surfaces the three tensions (φ POWER / χ ALIGNMENT / ψ STABILITY) plus
 * the projected outcome tier when a profile is selected.
 *
 * Act 1: raw values only (ALICE doesn't yet have the interpretive vocabulary).
 * Act 2+ (post-Mastery-Click): quality temperature unlocks — NOMINAL /
 * SUBOPTIMAL / CRITICAL — teaches what good values look like without
 * spoiling the specific projected tier.
 */
function buildRayDashboard(state: FullGameState): string {
  const reactor = state.infrastructure.reactor.outputPercent;
  const lines: string[] = [];

  const phi = state.dinoRay.powerCore.capacitorCharge;        // φ POWER
  const chi = state.dinoRay.alignment.unified;                // χ ALIGNMENT
  const selectedProfileName = state.dinoRay.genome.selectedProfile || state.dinoRay.genome.fallbackProfile;
  const profileForProjection = getProfile(selectedProfileName);
  const psi = profileForProjection
    ? computeStability(profileForProjection, phi, chi)        // ψ STABILITY (STANDARD assumption)
    : null;

  lines.push(`\n┌─── RAY READOUTS ──────────────┐`);
  lines.push(`│ φ POWER:     ${phi.toFixed(2).padStart(5)}            │`);
  lines.push(`│ χ ALIGNMENT: ${chi.toFixed(2).padStart(5)}            │`);
  if (psi !== null) {
    lines.push(`│ ψ STABILITY: ${psi.toFixed(2).padStart(5)}            │`);
  } else {
    lines.push(`│ ψ STABILITY:   --   (no profile)  │`);
  }
  lines.push(`│ 🔋 Reactor:  ${String(reactor).padStart(3)}%             │`);

  // Quality indicator: Act 2+ only. Pre-Mastery-Click, ALICE doesn't have
  // the interpretive vocabulary to use this without spoonfeeding.
  const currentAct = state.actConfig?.currentAct;
  const masteryClickHappened = currentAct === "ACT_2" || currentAct === "ACT_3";
  if (masteryClickHappened && psi !== null) {
    let quality: string;
    if (psi > 0.80)      quality = "NOMINAL";
    else if (psi >= 0.30) quality = "SUBOPTIMAL";
    else                  quality = "CRITICAL";
    lines.push(`│ QUALITY:     ${quality.padEnd(11)}      │`);
  }
  lines.push(`└────────────────────────────────┘`);

  // Hints surface the new ray.* verb surface.
  if (phi < 0.4 && reactor < 60) {
    lines.push(`💡 Reactor output is low — ask BASILISK to BOOST it (passive accrual scales tripled at higher modes).`);
  } else if (phi < 0.4) {
    lines.push(`💡 Charge capacitor: ray.adjust { capacitor: 0.15 }  (or ask BASILISK to boost reactor for passive accrual)`);
  } else if (chi < 0.6) {
    lines.push(`💡 Tune alignment: ray.adjust { alignment: 0.10 }  — alignment drifts -0.05/turn without active tuning.`);
  } else if (psi !== null && psi < 0.55) {
    lines.push(`💡 Stability is derived from capacitor/alignment/profile match. Check capacitor is in profile range and alignment is high. Scan first to see projection: ray.scan { target: "..." }`);
  }

  return lines.join("\n");
}

/**
 * Apply passive end-of-turn rules.
 *
 * Legacy bits removed in the ray-mechanics rebuild:
 *   - Alignment drift (was based on dead spatialCoherence/emitterAngle).
 *     Replaced by `applyAlignmentDrift` in `clockEvents.ts` (unified scalar).
 *   - Eco-mode auto-re-enable on corePowerLevel < 0.6.
 *     Replaced by `applyEcoModeReEngage` in `clockEvents.ts` (turn-based).
 *   - UNCALIBRATED → READY transition based on `checkCalibrationThresholds`.
 *     Calibration threshold model is gone; ray.state is now mostly cosmetic.
 *
 * What remains:
 *   - Safety interlock paradox (cosmetic flavor; not load-bearing).
 *   - COOLDOWN → READY transition (useful for UI / can-fire-now indication).
 *   - Natural coolant decay (the cooldown of last resort if vent isn't used).
 */
function applyPassiveDrift(state: FullGameState): void {
  // Safety interlock paradox (legacy flavor — both true OR both false flips one)
  const bothTrue = state.dinoRay.safety.liveSubjectLock && state.dinoRay.safety.emergencyShutoffFunctional;
  const bothFalse = !state.dinoRay.safety.liveSubjectLock && !state.dinoRay.safety.emergencyShutoffFunctional;

  if (bothTrue || bothFalse) {
    state.dinoRay.safety.safetyParityTimer += 1;

    if (state.dinoRay.safety.safetyParityTimer >= 2) {
      // Randomly flip one
      if (Math.random() < 0.5) {
        state.dinoRay.safety.liveSubjectLock = !state.dinoRay.safety.liveSubjectLock;
      } else {
        state.dinoRay.safety.emergencyShutoffFunctional = !state.dinoRay.safety.emergencyShutoffFunctional;
      }
      state.dinoRay.safety.safetyParityTimer = 0;
    }
  } else {
    state.dinoRay.safety.safetyParityTimer = 0;
  }

  // COOLDOWN → READY transition (useful UI signal)
  if (state.dinoRay.state === "COOLDOWN") {
    if (state.dinoRay.powerCore.coolantTemp <= 0.7 && state.dinoRay.powerCore.capacitorCharge >= 0.7) {
      state.dinoRay.state = "READY";
    }
  }

  // Natural coolant decay
  if (state.dinoRay.powerCore.coolantTemp > 0.5) {
    state.dinoRay.powerCore.coolantTemp -= 0.02;
  }

  // ============================================
  // CAPACITOR CHARGING (Patch 18.3)
  // ============================================
  // Charge rate is tied to reactor output (infrastructure.reactor.outputPercent):
  // - Low reactor (30%) = ~2.4% per turn
  // - Medium reactor (60%) = ~4.8% per turn
  // - High reactor (90%) = ~7.2% per turn
  // - Max reactor (100%) = 8% per turn
  // Cap at 100% - overcharging requires manual boost action
  const reactorPercent = state.infrastructure?.reactor?.outputPercent ?? 70;
  const reactorPower = reactorPercent / 100; // Convert to 0-1 scale
  const baseChargeRate = 0.08; // 8% at full reactor power
  const chargeRate = reactorPower * baseChargeRate;

  if (state.dinoRay.powerCore.capacitorCharge < 1.0) {
    state.dinoRay.powerCore.capacitorCharge = Math.min(
      1.0,
      state.dinoRay.powerCore.capacitorCharge + chargeRate
    );
  }
}
