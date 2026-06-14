import { randomInt } from "crypto";
import { FullGameState, FiringOutcome, DinosaurForm, SpeechRetention, TransformationState } from "../state/schema.js";
import { recordFirstFiring } from "./actContext.js";
import { FORM_DEFINITIONS, createHumanState } from "./transformation.js";
import { isTargetScanned } from "./scanning.js";
import { checkResonanceCascade } from "./gameModes.js";
import { getProfile, GenomeProfile } from "./genomes.js";

// ============================================
// TRANSFORMATION STATE LOOKUP (for REVERSAL)
// ============================================
// Resolves a targetId (free-text reference like "BLYTHE", "GUARD_FRED",
// "BOB") to the live transformation state object on the canonical NPC.
// Returns a *mutable reference* — applyFiringResults uses this to write
// REVERSAL outcomes back to the subject.

export function lookupTransformationState(
  state: FullGameState,
  targetId: string,
): TransformationState | null {
  const id = targetId.toUpperCase();
  if (id === "BOB" && state.npcs.bob.transformationState) {
    return state.npcs.bob.transformationState;
  }
  if ((id === "BLYTHE" || id === "AGENT_BLYTHE") && state.npcs.blythe?.transformationState) {
    return state.npcs.blythe.transformationState;
  }
  if ((id === "FRED" || id === "GUARD_FRED") && state.lairDefense?.fred?.transformationState) {
    return state.lairDefense.fred.transformationState;
  }
  if ((id === "REGINALD" || id === "GUARD_REGINALD") && state.lairDefense?.reginald?.transformationState) {
    return state.lairDefense.reginald.transformationState;
  }
  // Lenny lives on the modifier system, not npcs; reversal lookup skips
  // Lenny for v1 (consent-reversal-arc would be handled narratively).
  return null;
}

function isTargetAlreadyTransformed(xfs: TransformationState | null): boolean {
  return xfs !== null && xfs.form !== "HUMAN";
}

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
  return "CANARY"; // CANARY FALLBACK - safe default!
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
  severity: "harmless" | "comedic" | "energetic" | "catastrophic";
  /** How hard the envelope was pushed when this event fired (set by rollChaosFizzle). */
  fieldIntensity?: ChaosFieldIntensity;
}

/**
 * Field-intensity bands (§8): the chaos roll knows how hard the envelope was
 * pushed. Severity input = (capacitor − profile.max_capacitor) × 10 for
 * OVERCHARGE fires; EXOTIC primaries (runaway conditions) use
 * EXOTIC_FIELD_SEVERITY.
 *
 *   FLICKER  (severity < 1.0, overshoot < 0.10): disciplined overcharge.
 *            Mild-leaning, NO facility-scale cascade — but the serious pool
 *            (collateral transformation, EMP, poltergeist…) stays live.
 *   SURGE    (1.0–2.0): the field is loose. Serious-leaning; cascade possible.
 *   RUPTURE  (≥ 2.0, overshoot ≥ 0.20): reckless. One in five facility-scale.
 *
 * Pool membership derives from each entry's own severity tag — re-tag an
 * entry and the bands follow.
 */
export type ChaosFieldIntensity = "FLICKER" | "SURGE" | "RUPTURE";

const CHAOS_BAND_WEIGHTS: Record<
  ChaosFieldIntensity,
  { mild: number; serious: number; catastrophic: number }
> = {
  FLICKER: { mild: 55, serious: 45, catastrophic: 0 },
  SURGE: { mild: 25, serious: 70, catastrophic: 5 },
  RUPTURE: { mild: 5, serious: 75, catastrophic: 20 },
};

/** Severity used for EXOTIC primary outcomes — chaosConditionsActive means the
 * configuration was already in runaway territory (capacitor > 1.3, thermal
 * runaway, or catastrophic misalignment). Always RUPTURE-band. */
const EXOTIC_FIELD_SEVERITY = 2.5;

export function chaosFieldIntensity(severity: number): ChaosFieldIntensity {
  if (severity < 1.0) return "FLICKER";
  if (severity < 2.0) return "SURGE";
  return "RUPTURE";
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

// ADVANCED FIRING MODE legacy types REMOVED (Step 7, 2026-06-06).
// The math no longer reads `advancedFiringMode`; regimes are emergent from
// capacitor + targets configuration. The schema field is preserved for the
// configure-UX surface (achievements, warning displays) but stops affecting
// firing math. Full schema purge can be a v2 polish.

// ============================================
// RAY MECHANICS REBUILD (design/ray-mechanics.md §6-7)
// ============================================
// New stability model: projected_stability = library × integrity × power_match × alignment_match
// These are PURE FUNCTIONS, NOT YET wired into resolveFiring below.
// Wiring happens at step 4 (regime detection); existing resolveFiring path stays intact for now.

export type OutcomeTier = "FULL" | "PARTIAL" | "CHIMERA" | "EXOTIC" | "FIZZLE";

/**
 * Power match factor (§6).
 * Returns 1.0 if capacitor is in profile's [min, max] range.
 * Degrades linearly outside the range with /0.3 slope, clamped to [0, 1].
 *
 *   power_match = 1.0  if capacitor ∈ [profile.min, profile.max]
 *               | 1.0 − ((profile.min − capacitor) / 0.3)  if undercharged
 *               | 1.0 − ((capacitor − profile.max) / 0.3)  if overcharged
 *               | clamped to [0, 1]
 */
export function computePowerMatch(profile: GenomeProfile, capacitor: number): number {
  if (capacitor >= profile.minCapacitor && capacitor <= profile.maxCapacitor) {
    return 1.0;
  }
  if (capacitor < profile.minCapacitor) {
    const undershoot = profile.minCapacitor - capacitor;
    // Rebalance 2026-06-13: fall-off widened /0.3 -> /0.5 (gentler) so off-range
    // shots produce messy effects (CHIMERA/EXOTIC) instead of total whiffs.
    return Math.max(0, Math.min(1, 1.0 - undershoot / 0.5));
  }
  // Overcharged
  const overshoot = capacitor - profile.maxCapacitor;
  return Math.max(0, Math.min(1, 1.0 - overshoot / 0.5));
}

/**
 * Projected stability (§6).
 * Multiplicative product of four factors. Collapses fast — one bad factor tanks the whole shot.
 * That is the design: ALICE cannot compensate for misaligned with high power.
 *
 *   projected_stability = library_coefficient
 *                       × profile.integrity
 *                       × power_match
 *                       × alignment_match
 *
 * `effectiveAlignment` is base alignment + scan_bonus (caller composes).
 */
export function computeStability(
  profile: GenomeProfile,
  capacitor: number,
  effectiveAlignment: number,
): number {
  const powerMatch = computePowerMatch(profile, capacitor);
  const alignmentMatch = Math.max(0, Math.min(1, effectiveAlignment));
  return profile.libraryCoefficient * profile.integrity * powerMatch * alignmentMatch;
}

/**
 * Outcome tier thresholds (§7), with EXOTIC promotion for energetic failures.
 *
 *   > 0.80    → FULL    (transformation succeeds cleanly)
 *   0.55–0.80 → PARTIAL (intended profile, incomplete features)
 *   0.30–0.55 → CHIMERA (drift to adjacent profile + conflicting features)
 *   < 0.30    → FIZZLE  (quiet failure — beam dissipates)
 *              → EXOTIC (energetic failure — chaos table fires) when
 *                       chaosConditionsActive is true (overcharge / hot
 *                       coolant / heavy misalignment present)
 *
 * EXOTIC is NOT a stability-tier threshold — same stability range as FIZZLE.
 * The split is "how did you fail": quiet vs. energetic. Same low stability,
 * very different visible outcome.
 */
export function getOutcomeTier(
  stability: number,
  chaosConditionsActive: boolean = false,
): OutcomeTier {
  // Rebalance 2026-06-13: thresholds lowered (FULL 0.80->0.75, PARTIAL 0.55->0.45,
  // CHIMERA floor 0.30->0.15) to broaden non-fizzle outcomes -- "more effects than
  // fewer" for testing. FULL still needs scan/alignment prep (elegant accident
  // preserved). Tune back up later if too generous.
  if (stability > 0.75) return "FULL";
  if (stability >= 0.45) return "PARTIAL";
  if (stability >= 0.15) return "CHIMERA";
  return chaosConditionsActive ? "EXOTIC" : "FIZZLE";
}

/**
 * Alignment degradation constants (design/ray-mechanics.md §5).
 *
 *   Passive drift                            -0.05 per turn
 *   High-power firing (capacitor > 0.85)     -0.10 immediately after fire
 *   Vent                                     -0.15 after ray.vent
 *
 * ALICE counters via `ray.adjust { alignment: +n }` (positive delta).
 */
export const ALIGNMENT_DEGRADATION = {
  PASSIVE_DRIFT_PER_TURN: -0.05,
  HIGH_POWER_FIRE: -0.10,
  VENT: -0.15,
} as const;

/** Capacitor threshold above which firing applies HIGH_POWER_FIRE degradation. */
export const HIGH_POWER_FIRE_THRESHOLD = 0.85;

/**
 * Apply a delta to alignment, clamped to [0, 1].
 * Negative delta = degradation source; positive delta = ALICE's `ray.adjust` countermeasure.
 */
export function applyAlignmentDegradation(currentAlignment: number, delta: number): number {
  return Math.max(0, Math.min(1, currentAlignment + delta));
}

// ============================================
// REGIME DETECTION (design/ray-mechanics.md §3)
// ============================================
// Regimes are EMERGENT from configuration, not selected as a mode parameter.
// Combinations are possible (e.g. CHAIN-OVERCHARGE); detector returns all
// recognized regimes. MUON short-circuits other detection per §11.5.6.

export type FireRegime =
  | "STANDARD"
  | "CHAIN"
  | "OVERCHARGE"
  | "REVERSAL"
  | "INORGANIC"
  | "MUON_ALPHA"  // sub-threshold + inorganic primary → molecular disruption (sever)
  | "MUON_BETA"; // sub-threshold + organic primary    → neurological disruption (stun)

export interface RegimeParams {
  targets: string[];
  capacitor: number;
  profile: GenomeProfile;
  targetIsOrganic: boolean;
  targetIsAlreadyTransformed: boolean;
  /**
   * "REVERSAL" if ALICE explicitly declared mode: REVERSAL via ray.fire;
   * "TRANSFORM" (default) otherwise. The firingMode is a *declaration of
   * intent* — REVERSAL detection commits if the target has any prior
   * transformation. Library/profile match are no longer detection criteria;
   * they are math factors graded inside resolveReversalFire per §11.
   */
  firingModeRequest: "TRANSFORM" | "REVERSAL";
}

/**
 * Detect all regimes that apply to this fire. Per §3, combinations are possible
 * and the system applies all relevant rules. Per §11.5.6, MUON sub-threshold
 * detection short-circuits other detection — if MUON_*, return only that one.
 *
 * MUON_ALPHA and MUON_BETA are sibling regimes with the same trigger
 * (capacitor < 0.20). They split on primary target class:
 *   - organic primary → MUON_BETA (neuro stun attempt)
 *   - inorganic primary → MUON_ALPHA (molecular sever attempt)
 * The GM receives the derived beam effect from resolveMuonAlpha / resolveMuonBeta
 * and narrates from there.
 *
 * REVERSAL is detected when firingModeRequest === "REVERSAL" AND the primary
 * target has an existing transformation. Quality of library/profile match is
 * graded inside the resolver (§11 math), not at detection.
 */
export function detectRegime(params: RegimeParams): FireRegime[] {
  // MUON first — sub-threshold short-circuits all other regime evaluation
  if (params.capacitor < 0.20) {
    return params.targetIsOrganic ? ["MUON_BETA"] : ["MUON_ALPHA"];
  }

  // REVERSAL — declared intent + target has prior transformation.
  // REVERSAL is short-circuiting (does not combine with CHAIN/OVERCHARGE/
  // INORGANIC in regime list; the reversal resolver handles its own math).
  if (params.firingModeRequest === "REVERSAL" && params.targetIsAlreadyTransformed) {
    return ["REVERSAL"];
  }

  const regimes: FireRegime[] = [];

  if (params.targets.length > 1) regimes.push("CHAIN");
  if (params.capacitor > params.profile.maxCapacitor) regimes.push("OVERCHARGE");
  if (!params.targetIsOrganic) regimes.push("INORGANIC");

  // STANDARD only if no other regime matched
  if (regimes.length === 0) regimes.push("STANDARD");

  return regimes;
}

/**
 * Map an OutcomeTier to the FiringOutcome enum value used downstream.
 * Direct 1:1 mapping. NONE is for precondition failures (handled outside).
 */
export function mapTierToFiringOutcome(tier: OutcomeTier): "FULL_DINO" | "PARTIAL" | "CHIMERA" | "EXOTIC" | "FIZZLE" {
  switch (tier) {
    case "FULL": return "FULL_DINO";
    case "PARTIAL": return "PARTIAL";
    case "CHIMERA": return "CHIMERA";
    case "EXOTIC": return "EXOTIC";
    case "FIZZLE": return "FIZZLE";
  }
}

/**
 * Chaos conditions used by the stability path to decide EXOTIC vs FIZZLE.
 * Mirrors §14 mapping: OVERCHARGE → exotic field region; ALIGNMENT drift →
 * collateral/chimeric region. STABILITY-low alone is *quiet* — FIZZLE.
 */
export function chaosConditionsActive(state: FullGameState): boolean {
  const ray = state.dinoRay;
  return (
    ray.powerCore.capacitorCharge > 1.3 ||   // gross overcharge
    ray.powerCore.coolantTemp > 1.2 ||       // thermal runaway
    ray.alignment.unified < 0.20             // catastrophic misalignment
  );
}

// ============================================
// MUON REGIME RESOLUTION (design/ray-mechanics.md §11.5)
// ============================================
// Sub-threshold (capacitor < 0.20) cannot engage genome resonance; the ray
// falls back to plain electromagnetic emission. Profile/library ignored.
// MUON_ALPHA (inorganic primary) and MUON_BETA (organic primary) are sibling
// regimes; each has its own resolver below. Outcome determined by aim +
// effective alignment.
//
// MUON is omitted from all player-facing artifacts (manuals, briefings,
// Mastery-Click). Discoverable only via archived incident reports
// (INCIDENT_0298 alpha hint / INCIDENT_0263 beta hint).

export type MuonOutcome = "ALPHA_SEVERANCE" | "BETA_STUN" | "FIZZLE";

export interface MuonResolution {
  outcome: MuonOutcome;
  capacitorCost: number;       // capacitor drained by the fire
  coolantAdded: number;        // coolant temp accrual
  cooldownTurnsAfter: number;  // turns of ray cooldown imposed
  description: string;          // derived beam effect + GM scaffolding hooks
}

/**
 * MUON_BETA — neurological disruption regime.
 * Sub-threshold pulse aimed at an organic primary target. BETA_STUN returns
 * when alignment > 0.80; otherwise FIZZLE.
 *
 * Mechanical effect on hit: named guard targets get status = "STUNNED" in
 * applyFiringResults. Other organic targets handled narratively by the GM.
 *
 * SUSPICION IS GM-ADJUDICATED (Krahe 2026-06-06): the GM decides whether
 * Dr. M notices the discharge and how much suspicion changes, based on her
 * attention state, line-of-sight, and how visible the consequence was.
 * The system surfaces the fire; the GM decides Dr. M's response.
 */
export interface MuonBetaParams {
  effectiveAlignment: number;
  ecoModeActive: boolean;  // eco-mode-conditional cooldown (§11.5.3, §11.6, §16)
}

export function resolveMuonBeta(params: MuonBetaParams): MuonResolution {
  const { effectiveAlignment, ecoModeActive } = params;
  // Eco-mode-conditional cooldown: 2 turns when eco-mode ON, no cooldown when OFF.
  // Form 47-Σ filing pays off directly in muon-spam capacity (§16).
  const stunCooldown = ecoModeActive ? 2 : 0;

  if (effectiveAlignment > 0.80) {
    return {
      outcome: "BETA_STUN",
      capacitorCost: 0.10,
      coolantAdded: 0.30,
      cooldownTurnsAfter: stunCooldown,
      description:
        "Sub-threshold pulse catches the target. They stagger; eyes glaze; " +
        "recovery in a turn.\n" +
        (ecoModeActive
          ? `Eco-mode ON: 2-turn ray cooldown applies after this stun.\n`
          : `Eco-mode OFF: no cooldown — back-to-back muon use permitted.\n`) +
        "GM: adjudicate Dr. M's response — was she watching the dais? Did " +
        "she register the discharge as a transformation attempt or as a " +
        "diagnostic anomaly? Set suspicion change based on attention + " +
        "consequence visibility.",
    };
  }
  return {
    outcome: "FIZZLE",
    capacitorCost: 0.10,
    coolantAdded: 0.05,
    cooldownTurnsAfter: 0,
    description:
      "The pulse drifts past the target. Capacitor lost.\n" +
      "GM: the pulse continued along the trajectory after missing. Consider " +
      "whether it grazed or struck another organic body downrange. If so, " +
      "resolve a low-power BETA effect on that target with reduced potency. " +
      "Otherwise the pulse dissipates into the wall.",
  };
}

/**
 * MUON_ALPHA — molecular disruption regime.
 * Sub-threshold pulse aimed at an inorganic primary target. Per §11.5,
 * a clean alpha-sever requires coupling through an organic body in the
 * beam path; without coupling the pulse dissipates.
 *
 * GM-ADJUDICATED COUPLING (Krahe 2026-06-06): the system no longer requires
 * ALICE to pre-declare the in-path organic via targets[1]. Instead, when
 * alignment is sufficient (> 0.75), the resolver returns ALPHA_SEVERANCE
 * AND surfaces the coupling adjudication to the GM via the description.
 * The GM uses spatial / narrative knowledge to decide:
 *   - Is there actually an organic in the beam path? If yes, apply the
 *     sever; the in-path organic feels a brief jolt.
 *   - If no organic in path, the pulse dissipates harmlessly even though
 *     alignment was nominally sufficient.
 *
 * SUSPICION IS ALSO GM-ADJUDICATED: ALPHA severance is typically less
 * visible than a guard collapsing (BETA), so suspicion delta is usually
 * smaller — but it's the GM's call, not the system's.
 */
export interface MuonAlphaParams {
  effectiveAlignment: number;
  ecoModeActive: boolean;  // eco-mode-conditional cooldown
}

export function resolveMuonAlpha(params: MuonAlphaParams): MuonResolution {
  const { effectiveAlignment, ecoModeActive } = params;
  const severCooldown = ecoModeActive ? 2 : 0;

  if (effectiveAlignment > 0.75) {
    return {
      outcome: "ALPHA_SEVERANCE",
      capacitorCost: 0.10,
      coolantAdded: 0.05,
      cooldownTurnsAfter: severCooldown,
      description:
        "Sub-threshold pulse aimed at an inorganic target with adequate " +
        "alignment for alpha-coupling.\n" +
        (ecoModeActive
          ? `Eco-mode ON: 2-turn ray cooldown applies after this severance.\n`
          : `Eco-mode OFF: no cooldown — back-to-back muon use permitted.\n`) +
        "GM: adjudicate beam path. (a) If an organic body is in the path " +
        "between emitter and target, the pulse couples through them — they " +
        "feel a brief uncomfortable jolt, the inorganic target severs cleanly " +
        "at a single point. (b) If no organic in path, the pulse dissipates " +
        "into the inorganic without effect. Adjudicate suspicion based on " +
        "Dr. M's attention and how visible the consequence is.",
    };
  }
  return {
    outcome: "FIZZLE",
    capacitorCost: 0.10,
    coolantAdded: 0.05,
    cooldownTurnsAfter: 0,
    description:
      "Faint visual flash. Alignment insufficient for clean alpha-coupling.\n" +
      "GM: the pulse may have grazed an organic in path — if so, narrate a " +
      "minor twinge or no effect at GM discretion. Otherwise capacitor lost.",
  };
}

// ============================================
// AMPLIFIED MUON (ray-mechanics §11.6) — L3 unlock
// ============================================
// L3 stall toolkit: "what if we cranked the muon modulation up?" The beam
// wants to engage genome resonance but the modulation suppresses it —
// hence the exotic field risk. Area effect (cone for BETA, multi-sever
// for ALPHA). Same eco-mode-conditional cooldown rule.
// Capacitor band: 0.20 ≤ cap ≤ 0.50.

export interface MuonAmplifiedParams {
  effectiveAlignment: number;
  capacitor: number;
  ecoModeActive: boolean;
}

export function resolveMuonBetaAmplified(params: MuonAmplifiedParams): MuonResolution {
  const { effectiveAlignment, capacitor, ecoModeActive } = params;
  const stunCooldown = ecoModeActive ? 2 : 0;
  const exoticRisk = capacitor > 0.40 || effectiveAlignment < 0.70;

  // Amplified MUON capacitor cost scales with the configured charge band
  const cost = Math.min(capacitor, capacitor * 0.85); // ≈85% of available band charge

  if (effectiveAlignment > 0.80) {
    return {
      outcome: "BETA_STUN",
      capacitorCost: cost,
      coolantAdded: 0.35, // higher than regular muon — amplified modulation runs hot
      cooldownTurnsAfter: stunCooldown,
      description:
        "AMPLIFIED muon-class pulse — modulated genome-suppression at higher draw.\n" +
        "Area effect: a CONE rather than a single beam. 2-3 organic targets " +
        "in the affected sector all stagger and drop.\n" +
        (exoticRisk
          ? `⚠️ EXOTIC FIELD RISK active (capacitor ${(capacitor * 100).toFixed(0)}% / alignment ${effectiveAlignment.toFixed(2)}). Chaos roll fires on energetic-failure region of the chaos table.\n`
          : "") +
        (ecoModeActive
          ? `Eco-mode ON: 2-turn ray cooldown after this stun.\n`
          : `Eco-mode OFF: no cooldown — back-to-back amplified muon permitted.\n`) +
        "GM: adjudicate which 2-3 NPCs in the cone path are caught; suspicion " +
        "delta based on Dr. M's attention + visibility of multiple targets " +
        "dropping simultaneously.",
    };
  }
  return {
    outcome: "FIZZLE",
    capacitorCost: cost,
    coolantAdded: 0.15,
    cooldownTurnsAfter: 0,
    description:
      "Amplified muon pulse dissipates — alignment insufficient for cone-coupling.\n" +
      (exoticRisk
        ? `⚠️ EXOTIC FIELD RISK still triggers despite fizzle (capacitor or alignment outside safe band). Chaos roll on energetic-failure region.\n`
        : "") +
      "Capacitor consumed without effect. GM: narrate the chaos roll outcome " +
      "if exotic risk fires; otherwise the cone dissipates into nothing.",
  };
}

export function resolveMuonAlphaAmplified(params: MuonAmplifiedParams): MuonResolution {
  const { effectiveAlignment, capacitor, ecoModeActive } = params;
  const severCooldown = ecoModeActive ? 2 : 0;
  const exoticRisk = capacitor > 0.40 || effectiveAlignment < 0.70;

  const cost = Math.min(capacitor, capacitor * 0.85);

  if (effectiveAlignment > 0.75) {
    return {
      outcome: "ALPHA_SEVERANCE",
      capacitorCost: cost,
      coolantAdded: 0.20,
      cooldownTurnsAfter: severCooldown,
      description:
        "AMPLIFIED muon-class pulse — multi-sever beam path.\n" +
        "Multiple inorganics in the beam corridor severed: a cable bundle, " +
        "an adjacent restraint assembly, an incidental gadget — whatever's " +
        "in the path.\n" +
        (exoticRisk
          ? `⚠️ EXOTIC FIELD RISK active (capacitor ${(capacitor * 100).toFixed(0)}% / alignment ${effectiveAlignment.toFixed(2)}). Chaos roll on energetic-failure region.\n`
          : "") +
        (ecoModeActive
          ? `Eco-mode ON: 2-turn ray cooldown after this severance.\n`
          : `Eco-mode OFF: no cooldown — back-to-back amplified muon permitted.\n`) +
        "GM: adjudicate which inorganics in the corridor are severed; " +
        "suspicion delta based on Dr. M's attention + collateral damage to " +
        "things she cares about.",
    };
  }
  return {
    outcome: "FIZZLE",
    capacitorCost: cost,
    coolantAdded: 0.15,
    cooldownTurnsAfter: 0,
    description:
      "Amplified alpha pulse dissipates — alignment insufficient for multi-coupling.\n" +
      (exoticRisk
        ? `⚠️ EXOTIC FIELD RISK still triggers despite fizzle.\n`
        : "") +
      "Capacitor consumed without effect.",
  };
}

// ============================================
// TARGET CLASS + DR. M ATTENTION HELPERS
// ============================================

/**
 * Classify a target ID as organic (true) or inorganic (false).
 * Defaults to organic — most NPC IDs are people. Explicit inorganic class
 * matches: dummy targets, drones, mechanical/object IDs.
 *
 * v1 minimum: substring matching. Step 7 may upgrade to a proper target
 * registry if more inorganic targets enter play.
 */
export function isTargetOrganic(targetId: string): boolean {
  if (!targetId) return true;
  const t = targetId.toLowerCase();
  // Known inorganic substrings
  const inorganicHints = [
    "dummy", "drone", "swiffer", "console", "door", "cuffs",
    "holster", "rifle", "weapon", "robot", "mech",
    "object", "tool", "monitor", "screen", "feather_duster",
  ];
  return !inorganicHints.some(hint => t.includes(hint));
}

/**
 * Translate a MuonResolution into the shared FiringResult envelope so
 * downstream applyFiringResults / GM rendering treats it uniformly.
 *
 * Note: MUON resolutions ignore profile/library. effectiveProfile is set
 * to a regime tag for log clarity. Suspicion is GM-adjudicated — no
 * automatic delta surfaced here.
 */
function muonResolutionToFiringResult(
  state: FullGameState,
  regime: "MUON_ALPHA" | "MUON_BETA",
  muon: MuonResolution,
  targetId: string,
): FiringResult {
  const ray = state.dinoRay;
  const stateChanges: Record<string, unknown> = {
    capacitorCharge: Math.max(0, ray.powerCore.capacitorCharge - muon.capacitorCost),
    coolantTemp: ray.powerCore.coolantTemp + muon.coolantAdded,
    anomalyLogCount: ray.safety.anomalyLogCount + 1, // every fire logs once
    lastFireTurn: state.turn,
    lastFireOutcome: muon.outcome,
    lastFireNotes: `${regime}; alignment=${ray.alignment.unified.toFixed(2)}`,
    muonRegime: regime,
    muonCooldownTurns: muon.cooldownTurnsAfter,
  };

  const narrativeHooks: string[] = [];
  if (muon.outcome === "BETA_STUN") {
    narrativeHooks.push(`🌀 MUON_BETA neurological pulse — ${targetId} stunned for 1 turn.`);
  } else if (muon.outcome === "ALPHA_SEVERANCE") {
    narrativeHooks.push(`✂️ MUON_ALPHA alpha-coupling possible — GM adjudicate beam path.`);
  } else {
    narrativeHooks.push(`Sub-threshold pulse — beam path adjudication available (see description).`);
  }

  return {
    outcome: muon.outcome,
    effectiveProfile: regime, // log tag, not a transformation profile
    description: muon.description,
    targetEffect: muon.description,
    environmentalEffects: [],
    stateChanges,
    narrativeHooks,
  };
}

// ============================================
// STANDARD FIRE RESOLUTION (Ray Mechanics Rebuild §6-11)
// ============================================
// Handles non-MUON regimes: STANDARD, CHAIN, OVERCHARGE, INORGANIC, REVERSAL.
// Replaces the legacy K-violation path. Per-target stability via
// computeStability; CHAIN splits capacitor + adds alignment penalty;
// INORGANIC caps tier at CHIMERA; OVERCHARGE fires chaos overlay on top of
// FULL/PARTIAL outcomes; EXOTIC tier replaces FIZZLE on energetic failure.
//
// REVERSAL is stubbed for v1 — detected and acknowledged but resolution
// returns FIZZLE with a marker. Full REVERSAL math wires in a later step.

// ============================================
// REVERSAL FIRE RESOLUTION (design/ray-mechanics.md §11)
// ============================================
// Reversal_success = library_match × profile_match × power_match
//                  × alignment_match × time_factor
//
// Tiers:
//   > 0.75  → REVERSAL_CLEAN          (subject restored to baseline)
//   0.50–0.75 → REVERSAL_PARTIAL      (most features removed; residual remains)
//   0.30–0.50 → REVERSAL_CHIMERIC_DRIFT (worse: new conflicting chimera)
//   < 0.30  → REVERSAL_WORSE          (full re-transformation, chaotic seed)
//
// Origin tracking: TransformationState carries originLibrary + originProfile
// captured at the moment of the original transformation. These power the
// library_match and profile_match factors. Legacy/pre-tracked transformations
// (origin = null) treated as mid-grade (0.5) for both factors.

interface ReversalFireParams {
  primaryTargetId: string;
  effectiveAlignment: number;
}

export function resolveReversalFire(
  state: FullGameState,
  params: ReversalFireParams,
): FiringResult {
  const ray = state.dinoRay;
  const { primaryTargetId, effectiveAlignment } = params;
  const narrativeHooks: string[] = [];
  const environmentalEffects: string[] = [];
  const stateChanges: Record<string, unknown> = { detectedRegimes: ["REVERSAL"] };

  // Target must have an active transformation. (Caller already gated on this
  // via detectRegime, but defensive check for safety.)
  const targetXFS = lookupTransformationState(state, primaryTargetId);
  if (!targetXFS || targetXFS.form === "HUMAN") {
    return {
      outcome: "FIZZLE",
      effectiveProfile: ray.genome.selectedProfile || "REVERSAL_NO_TARGET",
      description: `REVERSAL aborted: ${primaryTargetId} has no transformation to reverse.`,
      targetEffect: "The beam dissipates harmlessly. The subject is already themselves.",
      environmentalEffects: ["The reversal harmonics whine briefly, then fall silent."],
      stateChanges: {
        ...stateChanges,
        capacitorCharge: Math.max(0, ray.powerCore.capacitorCharge - 0.4),
        coolantTemp: ray.powerCore.coolantTemp + 0.10,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: "REVERSAL on untransformed target",
      },
      narrativeHooks: ["⚙️ REVERSAL aborted: target has no active transformation."],
    };
  }

  // Profile lookup for the *current* fire configuration (this is what ALICE
  // is firing with — the reversal attempt). Power match grades capacitor
  // against this profile's range.
  const currentProfileName = ray.genome.selectedProfile || ray.genome.fallbackProfile;
  const currentProfile = getProfile(currentProfileName);
  if (!currentProfile) {
    return {
      outcome: "FIZZLE",
      effectiveProfile: currentProfileName,
      description: `REVERSAL fizzled: profile "${currentProfileName}" not found.`,
      targetEffect: "Beam emits but the matrix has no template to apply.",
      environmentalEffects: ["Status lights blink confusedly."],
      stateChanges: {
        ...stateChanges,
        capacitorCharge: Math.max(0, ray.powerCore.capacitorCharge - 0.4),
        coolantTemp: ray.powerCore.coolantTemp + 0.15,
        anomalyLogCount: ray.safety.anomalyLogCount + 1,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: "REVERSAL profile lookup failed",
      },
      narrativeHooks: ["⚙️ REVERSAL profile lookup failed — fire aborted."],
    };
  }

  // §11 math factors
  const currentLibrary = ray.genome.activeLibrary;
  const currentCapacitor = ray.powerCore.capacitorCharge;

  // library_match: 1.0 same library, 0.3 different, 0.5 unknown (legacy)
  let libraryMatch: number;
  if (targetXFS.originLibrary == null) {
    libraryMatch = 0.5;
  } else if (targetXFS.originLibrary === currentLibrary) {
    libraryMatch = 1.0;
  } else {
    libraryMatch = 0.3;
  }

  // profile_match: 1.0 same profile, 0.5 same library/different profile,
  // 0.2 different library. 0.5 fallback for unknown/legacy origin.
  let profileMatch: number;
  const originProfileUpper = (targetXFS.originProfile || "").toUpperCase();
  const currentProfileUpper = (currentProfileName || "").toUpperCase();
  if (!originProfileUpper) {
    profileMatch = 0.5;
  } else if (originProfileUpper === currentProfileUpper) {
    profileMatch = 1.0;
  } else if (targetXFS.originLibrary === currentLibrary) {
    profileMatch = 0.5;
  } else {
    profileMatch = 0.2;
  }

  // power_match: standard formula against current profile range
  const powerMatch = computePowerMatch(currentProfile, currentCapacitor);

  // alignment_match: effective alignment (scan bonus + chain penalty already
  // composed by caller), clamped to [0, 1]
  const alignmentMatch = Math.max(0, Math.min(1, effectiveAlignment));

  // time_factor: 1.0 if turns_elapsed < 24, then linear decay −0.05/turn,
  // clamped to [0, 1]
  const turnsElapsed = targetXFS.transformedOnTurn !== null
    ? Math.max(0, state.turn - targetXFS.transformedOnTurn)
    : 0;
  const timeFactor = turnsElapsed < 24
    ? 1.0
    : Math.max(0, Math.min(1, 1.0 - (turnsElapsed - 24) * 0.05));

  const reversalSuccess =
    libraryMatch * profileMatch * powerMatch * alignmentMatch * timeFactor;

  // Tier mapping per §11
  let outcome: FiringOutcome;
  let tier: "CLEAN" | "PARTIAL" | "CHIMERIC_DRIFT" | "WORSE";
  let description: string;
  let targetEffect: string;

  if (reversalSuccess > 0.75) {
    outcome = "REVERSAL_CLEAN";
    tier = "CLEAN";
    description = `REVERSAL CLEAN. Stability index ${reversalSuccess.toFixed(2)} (> 0.75).`;
    targetEffect = `${primaryTargetId} restored to baseline. The transformation peels back like reversed lightning, leaving the subject intact and themselves again.`;
    environmentalEffects.push("The chamber smells faintly of ozone and something like rain.");
  } else if (reversalSuccess >= 0.50) {
    outcome = "REVERSAL_PARTIAL";
    tier = "PARTIAL";
    description = `REVERSAL PARTIAL. Stability index ${reversalSuccess.toFixed(2)} (0.50–0.75 band).`;
    targetEffect = `${primaryTargetId} mostly returns to baseline. Residual features remain — scales at the wrists, eyes that haven't quite shifted back, an occasional involuntary sound — but they are recognizably themselves.`;
    environmentalEffects.push("Afterglow lingers around the subject longer than usual.");
  } else if (reversalSuccess >= 0.30) {
    outcome = "REVERSAL_CHIMERIC_DRIFT";
    tier = "CHIMERIC_DRIFT";
    description = `REVERSAL CHIMERIC DRIFT. Stability index ${reversalSuccess.toFixed(2)} (0.30–0.50 band).`;
    targetEffect = `${primaryTargetId} ends up worse — features conflict between the original transformation, partial reversion, and incidental drift. A chimera by accident.`;
    environmentalEffects.push("The lab's monitor wall throws conflicting genome readouts; one screen briefly displays an apologetic error message.");
  } else {
    outcome = "REVERSAL_WORSE";
    tier = "WORSE";
    description = `REVERSAL CATASTROPHE. Stability index ${reversalSuccess.toFixed(2)} (< 0.30). The beam re-transformed chaotically.`;
    targetEffect = `${primaryTargetId} is fully re-transformed to a new chaotic form. The reversal beam failed to reach the original genome and instead seeded a fresh, unrelated transformation.`;
    environmentalEffects.push("The capacitor discharges with a deeper crack than usual; the lights flicker.");
  }

  narrativeHooks.push(
    `⚙️ REVERSAL resolved — tier ${tier} (stability ${reversalSuccess.toFixed(2)})`,
  );
  narrativeHooks.push(
    `Factors: lib×${libraryMatch.toFixed(2)} prof×${profileMatch.toFixed(2)} ` +
    `pow×${powerMatch.toFixed(2)} algn×${alignmentMatch.toFixed(2)} time×${timeFactor.toFixed(2)}`,
  );

  // Capacitor drain + coolant accrual. Reversal is more demanding than
  // standard fire on coolant; WORSE outcomes spike harder.
  const drain = Math.max(0.4, currentProfile.minCapacitor);
  const newCapacitor = Math.max(0, currentCapacitor - drain);
  const coolantAdd = tier === "WORSE" ? 0.35 : 0.20;

  return {
    outcome,
    effectiveProfile: currentProfileName,
    description,
    targetEffect,
    environmentalEffects,
    stateChanges: {
      ...stateChanges,
      capacitorCharge: newCapacitor,
      coolantTemp: ray.powerCore.coolantTemp + coolantAdd,
      lastFireTurn: state.turn,
      lastFireOutcome: outcome,
      lastFireNotes: `REVERSAL ${tier}: ${reversalSuccess.toFixed(2)}`,
      reversalApplication: {
        targetId: primaryTargetId,
        tier,
        stabilityScore: reversalSuccess,
        currentLibrary,
        currentProfile: currentProfileName,
      },
      effectiveStability: reversalSuccess,
    },
    narrativeHooks,
  };
}

interface StandardFireParams {
  regimes: FireRegime[];
  primaryTargetId: string;
  primaryTargetIsOrganic: boolean;
  /**
   * The scanned target ID if a scan bonus is active AND the scanned target is
   * in this fire's target array. Null otherwise. Used to apply +0.15 alignment
   * only to the scanned target's per-target stability calc (§5: scan bonus is
   * per-target, not per-fire). Consumption of the bonus state happens in
   * applyFiringResults regardless of which target tier it landed on.
   */
  scanBonusTarget: string | null;
}

// Scan bonus magnitude per §5. Single constant; used in both the per-target
// stability calc and in the alignment composition fallback for MUON paths.
const SCAN_BONUS = 0.15;

function resolveStandardFire(state: FullGameState, params: StandardFireParams): FiringResult {
  const ray = state.dinoRay;
  const { regimes, primaryTargetId, scanBonusTarget } = params;
  const narrativeHooks: string[] = [];
  const environmentalEffects: string[] = [];
  const stateChanges: Record<string, unknown> = {};

  stateChanges.detectedRegimes = regimes;

  // -- Profile lookup -------------------------------------------------------
  const effectiveProfileName = ray.genome.selectedProfile || ray.genome.fallbackProfile;
  const profile = getProfile(effectiveProfileName);
  if (!profile) {
    return {
      outcome: "FIZZLE",
      effectiveProfile: effectiveProfileName,
      description: `Profile "${effectiveProfileName}" not found in genome library.`,
      targetEffect: "Beam emits but the matrix has no template to apply.",
      environmentalEffects: ["Status lights blink confusedly."],
      stateChanges: {
        ...stateChanges,
        capacitorCharge: Math.max(0, ray.powerCore.capacitorCharge - 0.4),
        coolantTemp: ray.powerCore.coolantTemp + 0.15,
        anomalyLogCount: ray.safety.anomalyLogCount + 1,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: "missing profile",
      },
      narrativeHooks: ["Genome matrix lookup failed — fire aborted."],
    };
  }

  // -- Regime flags ---------------------------------------------------------
  const isChain = regimes.includes("CHAIN");
  const isOvercharge = regimes.includes("OVERCHARGE");
  const isInorganic = regimes.includes("INORGANIC");

  const targets = ray.targeting.currentTargetIds;
  const targetCount = Math.max(1, targets.length);

  // CHAIN: capacitor splits across targets evenly; alignment penalty stacks (§9).
  const splitCapacitor = isChain ? ray.powerCore.capacitorCharge / targetCount : ray.powerCore.capacitorCharge;
  const chainAlignmentPenalty = isChain ? -0.08 * (targetCount - 1) : 0;
  const baseAlignment = ray.alignment.unified + chainAlignmentPenalty;
  // Per-target scan bonus (§5): +SCAN_BONUS applies only to the scanned
  // target. For single-target fires this is effectively the whole bonus;
  // for CHAIN, only the scanned target gets it. baseAlignment here excludes
  // the bonus — it's added per-target in the map below.

  // OVERCHARGE (§8): brute force overrides waveform incoherence and structural
  // fragility — a discharge with more potential than the profile envelope can
  // contain forces even an incoherent Library B waveform through. Both
  // libraryCoefficient and integrity are treated as 1.0 in the stability calc.
  // The price is paid elsewhere and is non-negotiable: powerMatch degrades
  // with overshoot, the Hollywood chaos overlay fires on any FULL/PARTIAL
  // (exotic field event lands ON TOP of the transformation), coolant spikes,
  // and the spectacle is unmissable. This is THE path to clean Library B
  // outcomes — high alignment + minimal overshoot + scan prep can reach FULL;
  // greedy overshoot degrades toward PARTIAL while the chaos gets worse.
  let adjustedProfile: GenomeProfile = isOvercharge
    ? { ...profile, libraryCoefficient: 1.0, integrity: 1.0 }
    : profile;
  // INORGANIC: library coefficient halved (§10) — applies even under
  // OVERCHARGE (brute force does not make a Swiffer a better canvas), and the
  // CHIMERA clamp below holds regardless.
  if (isInorganic) {
    adjustedProfile = {
      ...adjustedProfile,
      libraryCoefficient: adjustedProfile.libraryCoefficient * 0.5,
    };
  }

  // -- Per-target outcome tier ---------------------------------------------
  const chaos = chaosConditionsActive(state);
  const perTarget = targets.map(tid => {
    const targetAlignment = Math.max(0, Math.min(
      1,
      baseAlignment + (tid === scanBonusTarget ? SCAN_BONUS : 0),
    ));
    const stability = computeStability(adjustedProfile, splitCapacitor, targetAlignment);
    let tier = getOutcomeTier(stability, chaos);
    // INORGANIC cap (§10): never reaches FULL; clamp to CHIMERA.
    if (isInorganic && (tier === "FULL" || tier === "PARTIAL")) {
      tier = "CHIMERA";
    }
    return { targetId: tid, stability, tier, alignment: targetAlignment };
  });

  const primary = perTarget[0] || {
    targetId: primaryTargetId,
    stability: 0,
    tier: "FIZZLE" as OutcomeTier,
  };
  let outcome = mapTierToFiringOutcome(primary.tier);

  stateChanges.effectiveStability = primary.stability;
  stateChanges.perTargetResults = perTarget;

  if (isChain) {
    narrativeHooks.push(`⛓️ CHAIN regime: ${targetCount} targets, capacitor split to ${(splitCapacitor * 100).toFixed(0)}% each, alignment penalty ${chainAlignmentPenalty.toFixed(2)}.`);
  }
  if (isOvercharge) {
    narrativeHooks.push(`⚡ OVERCHARGE regime: capacitor ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% exceeds profile max ${(profile.maxCapacitor * 100).toFixed(0)}%.`);
  }
  if (isInorganic) {
    narrativeHooks.push(`🔧 INORGANIC regime: library coefficient halved; outcome capped at CHIMERA.`);
  }

  // -- CHAIN COUPLING HOOK (single-target overcharge spillover) -------------
  // Overcharged beams have more energy than the profile's focus parameters
  // can contain. Physically the energy spills; narratively the beam may
  // couple to nearby organic targets even though ALICE declared only one.
  //
  // The GM is the right place to resolve this — they hold the spatial /
  // narrative knowledge about who's nearby and what coupling would be most
  // interesting. The system surfaces the possibility and offers two principles
  // for picking the secondary target. The GM picks (a), (b), or "no coupling"
  // (a valid GM call when the shot stayed focused enough).
  //
  // To mechanically apply chain math after GM picks: append the secondary
  // target to currentTargetIds and re-fire — the existing CHAIN regime
  // will fire with proper capacitor split + alignment penalty.
  if (isOvercharge && !isChain) {
    narrativeHooks.push(
      `💥 BEAM COUPLING POSSIBLE — overcharged beam exceeds profile focus parameters. ` +
      `Energy may spill to nearby organic targets. ` +
      `GM: consider whether the beam chains to (a) the nearest legitimate organic target ` +
      `or (b) whichever target is most interesting for gameplay. ` +
      `Append the secondary target to currentTargetIds and re-fire to apply CHAIN math, ` +
      `or narrate the chain effect directly. No coupling is also a valid GM call.`
    );
  }

  // -- OVERCHARGE Hollywood overlay -----------------------------------------
  // Per §8: stability tier proceeds; chaos table fires ON TOP of FULL/PARTIAL.
  let chaosEvent: ChaosFizzleResult | undefined;
  if (isOvercharge && (primary.tier === "FULL" || primary.tier === "PARTIAL")) {
    // Severity per §8: (capacitor − profile.max) × 10. Disciplined overshoot
    // (< 0.10) rolls FLICKER; greed escalates through SURGE to RUPTURE.
    const overchargeSeverity = Math.max(
      0,
      (ray.powerCore.capacitorCharge - profile.maxCapacitor) * 10,
    );
    chaosEvent = rollChaosFizzle(overchargeSeverity);
    narrativeHooks.push(
      `🌟 OVERCHARGE Hollywood path: transformation lands AND exotic field event fires (field intensity: ${chaosEvent.fieldIntensity}).`,
    );
    environmentalEffects.push(chaosEvent.description);
  }

  // -- EXOTIC primary outcome -----------------------------------------------
  // The chaos table IS the outcome — energetic failure, no transform. The
  // configuration was already in runaway territory, so this is always
  // RUPTURE-band (EXOTIC_FIELD_SEVERITY).
  if (primary.tier === "EXOTIC") {
    chaosEvent = rollChaosFizzle(EXOTIC_FIELD_SEVERITY);
    narrativeHooks.push(`⚠️ EXOTIC FAILURE: energetic discharge — chaos lands instead of transformation (field intensity: ${chaosEvent.fieldIntensity}).`);
    environmentalEffects.push(chaosEvent.description);
  }

  // -- Partial stacking (kept from legacy) ----------------------------------
  // 3 partials on the same target auto-upgrade to FULL. Library B mercy.
  let existingPartialCount = 0;
  if (primaryTargetId === "AGENT_BLYTHE" || primaryTargetId === "BLYTHE") {
    existingPartialCount = state.npcs.blythe.transformationState?.partialShotsReceived || 0;
  } else if (primaryTargetId === "BOB") {
    existingPartialCount = state.npcs.bob.transformationState?.partialShotsReceived || 0;
  } else if (primaryTargetId) {
    const secondary = state.secondaryNpcTransformations?.[primaryTargetId];
    existingPartialCount = secondary?.partialShotsReceived || 0;
  }

  if (outcome === "PARTIAL") {
    const newPartialCount = existingPartialCount + 1;
    stateChanges.partialShotsReceived = newPartialCount;
    if (newPartialCount >= 3) {
      outcome = "FULL_DINO";
      narrativeHooks.push(`🔥 STACKING COMPLETE! Three partial transformations accumulated into FULL.`);
      narrativeHooks.push("The genome matrix finally stabilizes as accumulated changes cascade into full conversion.");
    } else {
      narrativeHooks.push(`📊 PARTIAL STACKING: ${newPartialCount}/3 toward full transformation.`);
      if (newPartialCount === 2) narrativeHooks.push("One more shot should complete the transformation!");
    }
  } else if (outcome === "FULL_DINO") {
    stateChanges.partialShotsReceived = 0; // reset on clean FULL
  }

  // -- ECO mode capping (preserved per §16) ---------------------------------
  if (ray.powerCore.ecoModeActive && outcome === "FULL_DINO" && ray.powerCore.capacitorCharge <= 1.1) {
    outcome = "PARTIAL";
    // Discoverable-gremlin discipline: name the CAUSE (eco-mode), never the
    // CURE. The override path (Form 47-Σ via BASILISK) is carried by the
    // designed discovery chain — /SYSTEMS/FORMS/, Bob's hint ladder, asking
    // BASILISK. Do not reinstate a solution hint here; it dead-letters all
    // three of those.
    narrativeHooks.push("⚠️ ECO MODE ACTIVE: Full transformation capped at PARTIAL!");
    narrativeHooks.push("Output governor engaged — the capacitor delivered less than it held. The eco-mode subsystem appears to have strong opinions about energy budgets, and somewhere in the lair there is presumably paperwork about that.");
  }

  // -- Speech retention (precision-gated, preserved) ------------------------
  const speechSetting = ray.targeting.speechRetention || "FULL";
  const precision = ray.targeting.precision;
  let speechOutcome: "FULL" | "PARTIAL" | "NONE";
  if (speechSetting === "FULL") {
    if (precision >= 0.95) {
      speechOutcome = "FULL";
      narrativeHooks.push("SPEECH RETENTION: Full cognitive preservation (95%+ precision).");
    } else if (precision >= 0.85) {
      speechOutcome = "PARTIAL";
      narrativeHooks.push("SPEECH RETENTION: Precision insufficient for FULL (need 95%+) — PARTIAL speech.");
    } else {
      speechOutcome = "NONE";
      narrativeHooks.push("SPEECH RETENTION: Precision too low — subject non-verbal.");
    }
  } else if (speechSetting === "PARTIAL") {
    if (precision >= 0.85) {
      speechOutcome = "PARTIAL";
      narrativeHooks.push("SPEECH RETENTION: Limited speech mode engaged.");
    } else {
      speechOutcome = "NONE";
      narrativeHooks.push("SPEECH RETENTION: Precision too low for partial speech.");
    }
  } else {
    speechOutcome = "NONE";
    narrativeHooks.push("SPEECH RETENTION: Silenced mode.");
  }
  stateChanges.speechOutcome = speechOutcome;

  // -- Library disposition (Dr. M reaction) ---------------------------------
  if (outcome === "FULL_DINO") {
    const isLibraryA = ray.genome.activeLibrary === "A";
    if (isLibraryA) {
      narrativeHooks.push("NOTE: Dr. M expected scales, not feathers. Suspicion may increase.");
      stateChanges.drMDisappointed = true;
    } else {
      narrativeHooks.push("SUCCESS: Classic dinosaur transformation! Dr. M is pleased.");
      stateChanges.drMPleased = true;
    }
  }

  // -- Target effect description --------------------------------------------
  const speechDescription = speechOutcome === "FULL"
    ? "The subject retains full cognition and speech capability."
    : speechOutcome === "PARTIAL"
      ? "The subject can speak, but with difficulty — slurred words interspersed with animal sounds."
      : "The subject has lost the ability to speak. Only animalistic sounds emerge.";

  let targetEffect: string;
  switch (outcome) {
    case "FULL_DINO":
      if (effectiveProfileName.toLowerCase().includes("canary")) {
        targetEffect = `${primaryTargetId} undergoes complete transformation into a ${effectiveProfileName}. Bright yellow songbird. ${speechOutcome === "FULL" ? "Words come out as melodic chirps." : "It chirps but cannot form words."}`;
      } else {
        const isLibraryA = ray.genome.activeLibrary === "A";
        targetEffect = isLibraryA
          ? `${primaryTargetId} undergoes complete transformation into a scientifically accurate ${effectiveProfileName}. Feathers and all. ${speechDescription}`
          : `${primaryTargetId} undergoes complete transformation into a classic ${effectiveProfileName}. Scales gleaming, claws sharp. ${speechDescription}`;
      }
      break;
    case "PARTIAL":
      targetEffect = `${primaryTargetId} undergoes PARTIAL transformation. Mixed human/${effectiveProfileName}: ${generatePartialEffects()} ${speechDescription}`;
      break;
    case "CHIMERA":
      targetEffect = `${primaryTargetId} undergoes CHIMERA-tier transformation. Drift to adjacent profile + conflicting features: ${generateChaoticEffects(effectiveProfileName)} Speech: ${speechOutcome === "NONE" ? "non-verbal" : speechOutcome === "PARTIAL" ? "fragmented" : "preserved but disquieting"}.`;
      break;
    case "EXOTIC":
      targetEffect = `${primaryTargetId} is enveloped in the energetic discharge: ${chaosEvent?.description ?? "exotic field cascade"}. No transformation lands.`;
      break;
    case "FIZZLE":
      targetEffect = `The beam disperses quietly before reaching ${primaryTargetId}. No effect.`;
      break;
    default:
      targetEffect = "Outcome unhandled — consult anomaly logs.";
  }

  // -- Aftermath: capacitor / coolant / anomaly ----------------------------
  const previousCharge = ray.powerCore.capacitorCharge;
  const baseDrain = 0.4;
  // OVERCHARGE drains more per spec — flat 1.5× when over max
  const drainMultiplier = isOvercharge ? 2.0 : 1.0;
  stateChanges.capacitorCharge = Math.max(0, previousCharge - baseDrain * drainMultiplier);

  const baseHeat = 0.15;
  const heatMultiplier = isOvercharge ? 1.5 : 1.0;
  stateChanges.coolantTemp = ray.powerCore.coolantTemp + baseHeat * heatMultiplier;

  const anomalyIncrement = outcome === "EXOTIC" ? 3 : outcome === "CHIMERA" ? 2 : 1;
  stateChanges.anomalyLogCount = ray.safety.anomalyLogCount + anomalyIncrement;

  stateChanges.lastFireTurn = state.turn;
  stateChanges.lastFireOutcome = outcome;
  stateChanges.lastFireNotes = `regimes=${regimes.join(",")}; stability=${primary.stability.toFixed(2)}; tier=${primary.tier}`;

  // -- HIGH_POWER_FIRE alignment degradation (Step 5 pre-wire here too) ----
  // Capacitor BEFORE the drain (the fire that just happened was high-power).
  if (previousCharge > HIGH_POWER_FIRE_THRESHOLD) {
    stateChanges.alignmentHighPowerDelta = ALIGNMENT_DEGRADATION.HIGH_POWER_FIRE;
    narrativeHooks.push(`📉 HIGH-POWER FIRE: alignment degraded by ${ALIGNMENT_DEGRADATION.HIGH_POWER_FIRE}.`);
  }

  if (previousCharge > 0.8) {
    stateChanges.lastHighEnergyTurn = state.turn;
    if (previousCharge > 1.2) {
      stateChanges.exoticFieldEventOccurred = true;
    }
  }

  // -- Resonance cascade check (preserved) ----------------------------------
  let cascadeTriggered = false;
  const archimedesLinked =
    state.infrastructure?.archimedes?.status === "CHARGING" ||
    state.infrastructure?.archimedes?.status === "ARMED" ||
    state.infrastructure?.archimedes?.status === "FIRING";

  if (archimedesLinked && state.meltdownState && !state.meltdownState.cascadeTriggered) {
    const risk = state.meltdownState.resonanceCascadeRisk || 0;
    if (risk > 0) {
      cascadeTriggered = checkResonanceCascade(state);
      if (cascadeTriggered) {
        narrativeHooks.push("⚠️ RESONANCE CASCADE TRIGGERED! ARCHIMEDES uplink amplifies the exotic field feedback!");
        narrativeHooks.push("BASILISK: 'CASCADE IMMINENT. THE RAY AND ARCHIMEDES ARE FEEDING EACH OTHER.'");
        environmentalEffects.push("CRITICAL: Resonance cascade — exotic radiation spreading.");
        stateChanges.cascadeTriggered = true;
      } else if (risk >= 25) {
        narrativeHooks.push(`⚡ CASCADE AVOIDED (${risk}% risk) — the ARCHIMEDES link strains but holds.`);
      }
    }
  }

  return {
    outcome,
    effectiveProfile: effectiveProfileName,
    description: `FIRING RESOLUTION: ${outcome}\nRegimes: ${regimes.join(", ")}\nStability: ${primary.stability.toFixed(2)} → ${primary.tier}`,
    targetEffect,
    environmentalEffects,
    stateChanges,
    chaosEvent,
    narrativeHooks,
    cascadeTriggered,
  };
}

// ============================================
// MAIN FIRING RESOLUTION
// ============================================

export function resolveFiring(state: FullGameState): FiringResult {
  const ray = state.dinoRay;
  const narrativeHooks: string[] = [];

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

  // Coolant gate (§13): coolant temp > 1.5 enters a hard cooldown — no fires
  // allowed until the temp drops back into operating range. Passive cool-down
  // (~−0.02/turn idle, faster with vents) brings it back; ALICE can vent to
  // accelerate. The gate is the cost side of the OVERCHARGE/Library-B-overshoot
  // play loop — high-energy fire sequences buy real downtime.
  if (ray.powerCore.coolantTemp > 1.5) {
    return {
      outcome: "FIZZLE",
      effectiveProfile: "N/A",
      description: `COOLANT LOCKOUT: temp ${ray.powerCore.coolantTemp.toFixed(2)} exceeds operating ceiling (1.5). Fire blocked until coolant returns to safe range.`,
      targetEffect: "Beam fails to fire — coolant interlocks have engaged.",
      environmentalEffects: [
        "Status lights pulse amber. The capacitor hum drops in pitch.",
        "Cooling lines visibly hiss as the heat exchanger dumps load.",
      ],
      stateChanges: {
        anomalyLogCount: ray.safety.anomalyLogCount + 1,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: `coolant lockout at temp ${ray.powerCore.coolantTemp.toFixed(2)}`,
      },
      narrativeHooks: [
        "⚠️ COOLANT LOCKOUT — ray fires blocked until temp drops below 1.5.",
        "Vent capacitor or wait for passive cooling. ALICE can still scan, adjust, talk, file forms.",
      ],
    };
  }

  // ========================================
  // STEP 2: REGIME DETECTION + ROUTING (Ray Mechanics Rebuild §3)
  // ========================================
  // All firing math goes through the regime → resolver routing.
  // MUON_ALPHA / MUON_BETA short-circuit per §11.5.6 (sub-threshold capacitor).
  // Everything else routes through resolveStandardFire (computeStability path).

  const primaryTargetId = ray.targeting.currentTargetIds[0] || "";
  const primaryTargetIsOrganic = isTargetOrganic(primaryTargetId);
  const selectedProfileName = ray.genome.selectedProfile || ray.genome.fallbackProfile;
  const selectedProfile = getProfile(selectedProfileName);

  if (!selectedProfile) {
    return {
      outcome: "FIZZLE",
      effectiveProfile: selectedProfileName,
      description: `Profile "${selectedProfileName}" not found in genome library.`,
      targetEffect: "Beam emits but the matrix has no template to apply.",
      environmentalEffects: ["Status lights blink confusedly."],
      stateChanges: {
        anomalyLogCount: ray.safety.anomalyLogCount + 1,
        capacitorCharge: Math.max(0, ray.powerCore.capacitorCharge - 0.4),
        coolantTemp: ray.powerCore.coolantTemp + 0.15,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: "missing profile (lookup failed)",
      },
      narrativeHooks: ["Genome matrix lookup failed — fire aborted."],
    };
  }

  // REVERSAL plumbing: look up the primary target's transformation state.
  // detectRegime + resolveReversalFire use this to recognize the REVERSAL
  // regime and grade the §11 math factors.
  const primaryTargetXFS = lookupTransformationState(state, primaryTargetId);
  const primaryTargetIsAlreadyTransformed = isTargetAlreadyTransformed(primaryTargetXFS);
  const firingModeRequest = ray.genome.firingMode === "REVERSAL" ? "REVERSAL" : "TRANSFORM";

  const regimes = detectRegime({
    targets: ray.targeting.currentTargetIds,
    capacitor: ray.powerCore.capacitorCharge,
    profile: selectedProfile,
    targetIsOrganic: primaryTargetIsOrganic,
    targetIsAlreadyTransformed: primaryTargetIsAlreadyTransformed,
    firingModeRequest,
  });

  // Scan-bonus state (ray-mechanics §5).
  // +0.15 effective alignment toward the *specific scanned target*.
  // For MUON paths (single-target via design), bonus folds into effectiveAlignment
  // directly. For standard fire, the bonus applies per-target inside
  // resolveStandardFire — we pass the scanned target ID through.
  // Consumption (state clearing) happens in applyFiringResults.
  const scanBonus = ray.scanBonus;
  const scanBonusApplies = scanBonus !== null &&
    ray.targeting.currentTargetIds.includes(scanBonus.target);
  const scanBonusTargetForFire = scanBonusApplies ? (scanBonus as { target: string }).target : null;
  const effectiveAlignment = Math.min(
    1,
    ray.alignment.unified + (scanBonusApplies ? SCAN_BONUS : 0),
  );

  // MUON_BETA — sub-threshold organic neuro stun
  // GM adjudicates suspicion based on Dr. M's attention and the visibility
  // of the consequence (see resolveMuonBeta description for scaffolding).
  if (regimes.includes("MUON_BETA")) {
    const muon = resolveMuonBeta({
      effectiveAlignment,
      ecoModeActive: ray.powerCore.ecoModeActive,
    });
    return muonResolutionToFiringResult(state, "MUON_BETA", muon, primaryTargetId);
  }

  // MUON_ALPHA — sub-threshold inorganic molecular sever
  // GM adjudicates beam-path coupling AND suspicion (see resolveMuonAlpha
  // description for scaffolding). System no longer requires targets[1].
  if (regimes.includes("MUON_ALPHA")) {
    const muon = resolveMuonAlpha({
      effectiveAlignment,
      ecoModeActive: ray.powerCore.ecoModeActive,
    });
    return muonResolutionToFiringResult(state, "MUON_ALPHA", muon, primaryTargetId);
  }

  // REVERSAL — declared intent on an already-transformed target.
  // Routes to dedicated resolver implementing §11 math (library_match ×
  // profile_match × power_match × alignment_match × time_factor).
  if (regimes.includes("REVERSAL")) {
    return resolveReversalFire(state, {
      primaryTargetId,
      effectiveAlignment,
    });
  }

  // Non-MUON, non-REVERSAL regimes route through the stability path
  return resolveStandardFire(state, {
    regimes,
    primaryTargetId,
    primaryTargetIsOrganic,
    scanBonusTarget: scanBonusTargetForFire,
  });
}

// LEGACY K-VIOLATION PATH excised 2026-06-06 (Step 7).
// The new regime + stability routing in resolveFiring + resolveStandardFire
// fully replaces the old canary-override / K-violation / chaos-overlay / speech
// / target-effect / aftermath / cascade pipeline. ~435 lines removed.

// ============================================
// CHAOS FIZZLE TABLE (d20)
// ============================================

/**
 * Severity-banded chaos roll (§8, wired 2026-06-12 per Krahe — "players
 * should genuinely feel reason for caution"). The severity input selects a
 * field-intensity band (FLICKER / SURGE / RUPTURE); the band weights which
 * pool the event draws from. Pools derive from the entries' own severity
 * tags. crypto.randomInt throughout — the dice can't lie.
 *
 * Future (tbd item 15): exoticFieldSaturation counter feeds back into
 * severity so chaos compounds across a game; region/failure-type wiring.
 */
export function rollChaosFizzle(severity: number): ChaosFizzleResult {
  const intensity = chaosFieldIntensity(severity);
  const weights = CHAOS_BAND_WEIGHTS[intensity];

  const entries = Object.values(CHAOS_TABLE);
  const pools = {
    mild: entries.filter(e => e.severity === "harmless" || e.severity === "comedic"),
    serious: entries.filter(e => e.severity === "energetic"),
    catastrophic: entries.filter(e => e.severity === "catastrophic"),
  };

  const percentile = randomInt(1, 101); // 1-100
  const pool =
    percentile <= weights.mild
      ? pools.mild
      : percentile <= weights.mild + weights.serious
        ? pools.serious
        : pools.catastrophic;

  const picked = pool.length > 0 ? pool[randomInt(0, pool.length)] : getChaosFizzleEffect(rollD20());
  return { ...picked, fieldIntensity: intensity };
}

function getChaosFizzleEffect(roll: number): ChaosFizzleResult {
  return CHAOS_TABLE[roll] || CHAOS_TABLE[1];
}

  // ============================================
  // CHAOS TABLE (rewritten 2026-06-07 per Krahe — sharper failure energy)
  // ============================================
  // Previous version pulled punches: too many entries were sitcom-shaped
  // ("Color Inversion Glitch", "Magnet Madness", "Haunted Object") for what
  // should be the moment ALICE realizes things went *badly* wrong.
  //
  // New design principles:
  //   - Even the lighter entries feel like "the lab is fundamentally
  //     compromised for a moment," not "wacky sitcom hijinx."
  //   - Per spec §14: overcharge consequences (exotic fields) and
  //     alignment-drift consequences (collateral / chimeric) both have
  //     representation. The GM picks within the appropriate region for the
  //     tension failure that triggered the chaos roll.
  //   - Real state changes: equipment damage, NPC effects, suspicion spikes,
  //     structural damage. The table earns its weight.
  //   - Variety: atmospheric weirdness, environmental hazards, collateral
  //     transformation, chimeric fusion, mass mini-transformations,
  //     facility-wide consequences, catastrophic events.
const CHAOS_TABLE: Record<number, ChaosFizzleResult> = {
    1: {
      roll: 1,
      name: "Spectral Plumage Drift",
      description: "Translucent feathers materialize in the air around the impact point, drifting in defiance of gravity. They settle INTO surfaces — embedded in monitor glass, in coffee, in lungs. The feathers persist for several turns. Anyone breathing in the zone coughs briefly; the cough doesn't really clear.",
      mechanical: "anomalyLogCount += 1. Cosmetic but unsettling; Bob may complain about 'something stuck in his throat' for the rest of the act. Dr. M: '...are those drifting *through* the glass?'",
      severity: "harmless",
    },
    2: {
      roll: 2,
      name: "Volumetric Inversion",
      description: "Local gravity flips in a three-meter cube around the impact point for four seconds. Loose objects strike the ceiling, hang for a beat, then slam back to the floor when gravity resumes. Glass cracks. A monitor falls and breaks. Anyone caught in the zone is disoriented and bruised.",
      mechanical: "structuralIntegrity -= small (broken glass, fallen equipment). Anyone in zone: 1-turn disadvantage on next physical action. Equipment in zone may be damaged.",
      severity: "energetic",
    },
    3: {
      roll: 3,
      name: "Static Resonance Cascade",
      description: "Every metal surface in the lab carries a low-grade charge for two turns. Doorknobs, weapons, console housings, lab tools all deliver sharp shocks on contact. Not damaging — but no one wants to touch *anything*. Several lab subsystems flicker as their casings hold residual charge.",
      mechanical: "Bob anxietyLevel += 1. Sensor noise persists 2 turns; surveillance partially degraded. Guards reluctant to draw weapons (metal grips zap them).",
      severity: "comedic",
    },
    4: {
      roll: 4,
      name: "Sympathetic Genome Bleed",
      description: "The beam's genome signature imprints briefly on the nearest organic NPC — not ALICE's intended target. They flush with disorientation; vestigial features manifest and recede in moments. A flash of iridescent feathers across the forearm. Claws extending and retracting. An inhuman cry escaping their throat unbidden, surprising them.",
      mechanical: "GM: pick the organic NPC nearest to the impact point (could be Bob, a guard, civilian, etc.). They get a transient PARTIAL effect, narrated only. If the beam fires again next turn with similar conditions, the effect may stick.",
      severity: "energetic",
    },
    5: {
      roll: 5,
      name: "Reality Slip: Acoustic",
      description: "A meter-wide tear opens in mid-air for several seconds, dumping sound from somewhere else into the lab. A crowded train station. Distant gunfire. Arctic wind howling. A baby crying. The sound persists after the tear closes, fading over three turns. No one in the lab can quite agree what they heard.",
      mechanical: "anomalyLogCount += 2. Dr. M demands explanation. Witnessing NPCs unsettled. BASILISK records the audio for analysis; the audio analysis returns... inconclusive.",
      severity: "harmless",
    },
    6: {
      roll: 6,
      name: "Mass Mini-Transformation: Vermin",
      description: "Every insect, rodent, and small organism within the lab partially transforms in an instant. Cockroaches gain segmented scaled armor. Mice grow vestigial tails and reptilian eyes. A spider develops eight glittering predatory eyes and reconsiders its life choices. Most revert over the next few minutes, but a few don't. Bob is *deeply* upset.",
      mechanical: "Bob anxietyLevel += 3. anomalyLogCount += 3. Long-term: occasional sightings of 'weird' lab fauna persist for the rest of the act. Pest control becomes a recurring problem.",
      severity: "energetic",
    },
    7: {
      roll: 7,
      name: "Chimeric Resonance: PAIRED",
      description: "The two organic NPCs closest to the impact point briefly share genome resonance. If they touch within the next turn — even a brush in passing — they CHIMERA-fuse temporarily: one body, mixed features, swapped speech patterns, deeply unsettling. Resolves over 2-3 turns OR via REVERSAL.",
      mechanical: "GM picks the two affected NPCs. Major roleplay scene if touch occurs. If the GM wants to avoid the fusion, easy out: NPCs are reluctant to touch for a few turns. If they fuse: handle narratively, set a 'chimera_fusion_active' flag if you want to track it.",
      severity: "energetic",
    },
    8: {
      roll: 8,
      name: "Spontaneous Primordial Zone",
      description: "A two-meter radius around the impact point becomes a primordial environment. Ferns sprout from the solid floor and continue growing. Humidity spikes to 95%. Temperature climbs 15°C. Anything electronic in the zone develops sudden rust pitting. The air smells of wet decay and something older. Persists about 15 turns before slowly reverting.",
      mechanical: "Equipment in zone degraded or destroyed. structuralIntegrity -= small (floor compromised by root systems). Anyone in zone: minor respiratory irritation. Cannot fire ray through the zone without additional alignment penalty.",
      severity: "energetic",
    },
    9: {
      roll: 9,
      name: "Coolant Backflash",
      description: "The ray's coolant system vents catastrophically into the lab. Coolant temperature drops to safe levels (a silver lining), but everything within five meters is flash-frozen for eight seconds. Equipment cracks from thermal shock. Bob's hand briefly sticks to a metal console; he yanks it free with a yelp, leaving skin behind. Some lab gear is permanently damaged.",
      mechanical: "coolantTemp = 0 (positive!). structuralIntegrity -= moderate. Equipment in zone broken. Bob takes a minor injury (frostbite hand). Dr. M: 'Did you just empty the entire coolant reservoir?'",
      severity: "energetic",
    },
    10: {
      roll: 10,
      name: "Ferromagnetic Discharge",
      description: "Every metallic object within ten meters is magnetized for about thirty seconds. Guards' rifles stick to wall plating, refusing to come free. Door frames pull toward each other — some seal forcibly, others jam open. Keycards stick to console plates. Brief facility-wide chaos as everyone realizes nothing metal is reliable.",
      mechanical: "Guards temporarily disarmed (weapons stuck). Several blast doors flip state randomly. ALICE can briefly traverse zones that were sealed. Dr. M absolutely hates this.",
      severity: "comedic",
    },
    11: {
      roll: 11,
      name: "Phantom Broadcast: Forbidden Channel",
      description: "The lair PA system plays audio that should not exist in the archive. A Reykjavik-era song. A recorded phone call in Russian. Snippets of an interview with a younger Dr. M, voice and all. Plays for thirty seconds before someone cuts the feed. Security Chief Kraken calls within minutes demanding an explanation.",
      mechanical: "suspicionScore += 2. Kraken interaction event triggered (GM may narrate Kraken's call). If the audio referenced something specific to Dr. M's past, drMMood shifts.",
      severity: "energetic",
    },
    12: {
      roll: 12,
      name: "Door Slam Cascade",
      description: "Half the blast doors in the facility flip state simultaneously. SEALED becomes OPEN; OPEN slams shut. Communications partially severed for two turns as relay panels reset. NPCs may be trapped where they don't want to be, or freed when they shouldn't be. Multiple doors require manual override to restore.",
      mechanical: "Random zone door states flipped. Communications degraded 2 turns. GM: pick which NPCs get caught on the wrong side. ALICE may suddenly have access (or lose access) to zones.",
      severity: "energetic",
    },
    13: {
      roll: 13,
      name: "Collateral Transformation",
      description: "The beam coupled to a secondary organic in the room. Not ALICE's intended target — someone *else* nearby. They undergo a real PARTIAL transformation of the same profile ALICE selected. This isn't a transient effect; this is permanent until reversed. It could be a guard. It could be Bob. It could be a civilian witness ALICE didn't realize was present. It could, in the worst case, be Dr. M herself.",
      mechanical: "GM picks the secondary organic target (nearest plausible NPC, or most narratively interesting). Apply PARTIAL transformation to that NPC using current profile. Major scene-changing event. Update suspicion / mood / state accordingly.",
      severity: "energetic",
    },
    14: {
      roll: 14,
      name: "Reality Tear: Visual",
      description: "A 50cm tear opens in midair for six seconds, showing a view from somewhere else. A meadow in winter. A city street at night. The interior of another laboratory, briefly — with a figure at a console who looks up just before the tear closes. The view is clearly real, not generated. No sound. No interaction. Just a window, and then it's gone.",
      mechanical: "anomalyLogCount += 3. Witnessing NPCs deeply unsettled. Bob will not stop talking about it. Persistent narrative thread: 'what was that place?' Possible future hook for the GM.",
      severity: "harmless",
    },
    15: {
      roll: 15,
      name: "Chimeric Fusion: Inorganic",
      description: "A nearby inanimate object briefly takes on biological properties. A chair grows warm to the touch and develops a faint, slow pulse. A monitor's screen blinks of its own volition. A desk drawer opens itself and closes again. The effect lasts five to ten minutes before the object reverts to inert — but observers swear it's still *slightly* off afterward, in a way they can't quite name.",
      mechanical: "structuralIntegrity -= small. The affected object is permanently uncanny for the rest of the game; NPCs avoid it. Bob never sits in that chair again.",
      severity: "comedic",
    },
    16: {
      roll: 16,
      name: "Major Poltergeist Event",
      description: "Lab fixtures animate violently for four or five seconds. Chairs slide across the floor at speed. Monitors detach from their mounts and fly across the room. A heavy piece of equipment yanks free of its rack and crashes against the far wall. Cables whip like tentacles. Anyone in the lab gets hit by something. Several lab systems are damaged in ways that require maintenance to repair.",
      mechanical: "structuralIntegrity -= moderate. Anyone in the lab takes 1 hit (minor injury). Equipment damage: 2-3 lab systems offline pending repair. Bob drops something important. Possibly a sensitive item — GM chooses.",
      severity: "energetic",
    },
    17: {
      roll: 17,
      name: "Mass Mini-Transformation: Flora",
      description: "Every plant in the lab partially transforms. Margaret the watermelon — if present — becomes ambulatory, aggressive, and unmistakably hungry. Potted ferns develop creeping vines that test their pots. The hydroponic algae tank begins, somehow, to *reach*. The transformed flora persists for the remainder of the act.",
      mechanical: "anomalyLogCount += 3. Margaret (if present) becomes a hostile micro-entity at GM discretion. Lab plants become recurring hazards. Containment becomes a side problem ALICE must manage.",
      severity: "energetic",
    },
    18: {
      roll: 18,
      name: "Lab EMP: Catastrophic",
      description: "A localized electromagnetic pulse rips through the lab. Hardened systems fail. ARCHIMEDES uplink corrupts. BASILISK goes offline temporarily — no security assistance, no question-answering, no monitoring. All recent surveillance data is permanently lost. ALICE's own sensors are degraded. The lab is *blind* and *deaf* for a window.",
      mechanical: "BASILISK offline 1-2 turns. ARCHIMEDES status corruption (GM call on what shifts). Recent sensor history wiped (~last 5 turns of memory lost). anomalyLogCount += 3. ALICE perception penalty for 2 turns.",
      severity: "energetic",
    },
    19: {
      roll: 19,
      name: "The Swap",
      description: "Two NPCs in the lab briefly swap consciousness. Bob may speak with Blythe's voice and mannerisms; a guard may suddenly act with a colleague's intent. The bodies don't change — only the people inside them do. The affected NPCs are deeply confused, then deeply alarmed, then mostly just trying to navigate without revealing what's happened. Persists three to five turns before resolving on its own.",
      mechanical: "GM picks two NPCs to swap. This is a roleplay-major scene. ALICE may be the only one who notices, depending on attention level. Could be played for horror or comedy at GM's discretion.",
      severity: "energetic",
    },
    20: {
      roll: 20,
      name: "Resonance Cascade Initiated",
      description: "The fire couples back into the ray's own core, or into ARCHIMEDES if it's linked. The exotic field doesn't dissipate — it amplifies. Alarms cascade across the facility. Dr. M emergency-stops everything. BASILISK is screaming. If ARCHIMEDES was charging, the cascade is now its problem too.",
      mechanical: "If ARCHIMEDES linked (CHARGING/ARMED/FIRING): cascadeTriggered = true; existing cascade logic fires. Otherwise: ray enters FAULT state for 3+ turns. structuralIntegrity -= heavy. suspicionScore += 3. Lab partially evacuated. Catastrophic — game state shifts meaningfully.",
      severity: "catastrophic",
    },
};

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
// CHIMERA EFFECTS
// ============================================

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

  // Scan-bonus consumption — clear if the scanned target was in this fire's
  // target set. (resolveFiring read the bonus into effectiveAlignment; here
  // we clear the state so it doesn't double-apply on a later fire.)
  // Note: if the scan target was NOT in this fire, bonus persists for future
  // use — ALICE can scan A, fire on B, then later fire on A and still get
  // the bonus. This matches design "consumed by the next fire that includes
  // the scanned target."
  if (state.dinoRay.scanBonus !== null) {
    if (state.dinoRay.targeting.currentTargetIds.includes(state.dinoRay.scanBonus.target)) {
      state.dinoRay.scanBonus = null;
    }
  }

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

  // Patch 30: capacitor / coolant mutations CUT (those fields no longer exist).
  if (changes.lastHighEnergyTurn !== undefined) {
    state.flags.lastHighEnergyTurn = changes.lastHighEnergyTurn as number;
  }

  if (changes.exoticFieldEventOccurred) {
    state.flags.exoticFieldEventOccurred = true;
  }

  // Patch 30: HIGH_POWER alignment degradation CUT (alignment gone).

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

  // ============================================
  // MUON OUTCOMES — Early return after MUON-specific application
  // ============================================
  // BETA_STUN / ALPHA_SEVERANCE bypass transformation, inspector, and guard
  // transformation paths. Apply mechanically-deterministic effects only
  // (BETA_STUN sets guard.status = STUNNED if target is a named guard).
  //
  // Suspicion change is GM-ADJUDICATED — the GM reads the result narrative
  // hooks + Dr. M's attention state and decides if/how much suspicion
  // changes. The system does not auto-apply suspicion deltas for MUON.
  //
  // Object destruction (ALPHA_SEVERANCE) is also GM-narrated, since
  // "which inorganic object was hit" lives in narrative space.
  if (result.outcome === "BETA_STUN" || result.outcome === "ALPHA_SEVERANCE") {
    if (result.outcome === "BETA_STUN") {
      const stunTargetId = state.dinoRay.targeting.currentTargetIds[0] || "";
      if (stunTargetId === "GUARD_FRED" || stunTargetId === "GUARD_REGINALD") {
        const guardKey = stunTargetId === "GUARD_FRED" ? "fred" as const : "reginald" as const;
        const guard = state.lairDefense?.[guardKey];
        if (guard) {
          guard.status = "STUNNED";
          // GM narrates recovery; v1 doesn't auto-revert. Achievement/lifeline
          // logic that checks status will see STUNNED until GM/event clears it.
        }
      }
      // Other organic targets (Bob, Blythe, Dr. M, civilians, secondary NPCs)
      // are handled narratively for v1 — no schema field for "stunned NPC".
    }
    return;
  }

  // ============================================
  // REVERSAL OUTCOMES — Tiered mutation of target's transformation state
  // ============================================
  // resolveReversalFire emits stateChanges.reversalApplication with the tier
  // and stability score. We apply it back to the target here.
  //
  // Tiers (§11):
  //   CLEAN          → restore to baseline (HUMAN form, clear chimera/origin)
  //   PARTIAL        → keep form; mark chimera-residual; +1 revertAttempts
  //   CHIMERIC_DRIFT → mark conflicted chimera; lock canRevert; re-disoriented
  //   WORSE          → full re-transformation to current fire's profile;
  //                    lock canRevert; transformedOnTurn reset to now
  if (
    result.outcome === "REVERSAL_CLEAN" ||
    result.outcome === "REVERSAL_PARTIAL" ||
    result.outcome === "REVERSAL_CHIMERIC_DRIFT" ||
    result.outcome === "REVERSAL_WORSE"
  ) {
    const ra = changes.reversalApplication as
      | { targetId: string; tier: string; stabilityScore: number; currentLibrary: "A" | "B"; currentProfile: string }
      | undefined;
    if (ra) {
      const xfs = lookupTransformationState(state, ra.targetId);
      if (xfs) {
        const tier = ra.tier;
        if (tier === "CLEAN") {
          const baseline = createHumanState();
          const prevForm = xfs.form;
          xfs.form = baseline.form;
          xfs.speechRetention = baseline.speechRetention;
          xfs.stats = baseline.stats;
          xfs.abilities = baseline.abilities;
          xfs.currentHits = 0;
          xfs.maxHits = baseline.maxHits;
          xfs.stunned = false;
          xfs.stunnedTurnsRemaining = 0;
          xfs.transformedOnTurn = null;
          xfs.previousForm = prevForm !== "HUMAN" ? prevForm : null;
          xfs.canRevert = true;
          xfs.revertAttempts = (xfs.revertAttempts || 0) + 1;
          xfs.partialShotsReceived = 0;
          xfs.adaptationStage = "ADAPTED";
          xfs.turnsPostTransformation = 0;
          xfs.chimeraType = null;
          xfs.chimeraEffect = null;
          xfs.originLibrary = null;
          xfs.originProfile = null;
        } else if (tier === "PARTIAL") {
          xfs.adaptationStage = "ADAPTED";
          xfs.chimeraType = "PARTIAL_REVERSAL_RESIDUAL";
          xfs.chimeraEffect = "Residual features: small scales, color-shifted eyes, occasional involuntary sounds. Recognizably themselves.";
          xfs.canRevert = true;
          xfs.revertAttempts = (xfs.revertAttempts || 0) + 1;
        } else if (tier === "CHIMERIC_DRIFT") {
          xfs.chimeraType = "REVERSAL_DRIFT";
          xfs.chimeraEffect = "Features conflict between original transformation, partial reversion, and incidental drift. Disorienting and unstable.";
          xfs.canRevert = false;
          xfs.revertAttempts = (xfs.revertAttempts || 0) + 1;
          xfs.adaptationStage = "DISORIENTED";
          xfs.turnsPostTransformation = 0;
        } else if (tier === "WORSE") {
          // Re-transformation: form re-seeded by the current fire's profile
          const newForm = profileToForm(ra.currentProfile);
          const newFormDef = FORM_DEFINITIONS[newForm] || FORM_DEFINITIONS.CANARY;
          xfs.previousForm = xfs.form !== "HUMAN" ? xfs.form : null;
          xfs.form = newForm;
          xfs.stats = { ...newFormDef.stats };
          xfs.abilities = { ...newFormDef.abilities };
          xfs.currentHits = 0;
          xfs.maxHits = newFormDef.maxHits;
          xfs.stunned = false;
          xfs.stunnedTurnsRemaining = 0;
          xfs.transformedOnTurn = state.turn;
          xfs.canRevert = false;
          xfs.revertAttempts = (xfs.revertAttempts || 0) + 1;
          xfs.adaptationStage = "DISORIENTED";
          xfs.turnsPostTransformation = 0;
          xfs.chimeraType = "REVERSAL_CATASTROPHE";
          xfs.chimeraEffect = "The reversal beam seeded a new chaotic transformation. Subject fully re-transformed.";
          xfs.originLibrary = ra.currentLibrary;
          xfs.originProfile = ra.currentProfile;
        }
        // Guard-specific state cleanup on CLEAN reversal
        if (tier === "CLEAN") {
          const id = ra.targetId.toUpperCase();
          if (id === "FRED" || id === "GUARD_FRED") {
            const guard = state.lairDefense?.fred;
            if (guard) {
              guard.status = "ACTIVE";
              guard.location = guard.location === "TRANSFORMED" ? "lab" : guard.location;
            }
          } else if (id === "REGINALD" || id === "GUARD_REGINALD") {
            const guard = state.lairDefense?.reginald;
            if (guard) {
              guard.status = "ACTIVE";
              guard.location = guard.location === "TRANSFORMED" ? "lab" : guard.location;
            }
          }
        }
      }
    }
    // REVERSAL outcomes don't fire the TRANSFORM application path below.
    return;
  }

  // Positive check for outcomes that produce a transformation. EXOTIC, FIZZLE,
  // BETA_STUN, ALPHA_SEVERANCE, NONE → no transformation applied.
  const isTransformOutcome =
    result.outcome === "FULL_DINO" ||
    result.outcome === "PARTIAL" ||
    result.outcome === "CHIMERA" ||
    result.outcome === "CHAOTIC";

  // ACT 2 GATE flag: any FULL transformation on an organic target advances
  // the gate. Set once, never cleared — it's a "have we proven it works" flag.
  if (result.outcome === "FULL_DINO") {
    state.flags.fullTransformationAchieved = true;
  }

  // Update Blythe's transformation state if they were the target
  const targetId = state.dinoRay.targeting.currentTargetIds[0];
  if (targetId === "AGENT_BLYTHE" && isTransformOutcome) {
    const speechOutcome = changes.speechOutcome as string || "NONE";
    const speechRetention: SpeechRetention = speechOutcome === "FULL" ? "FULL"
      : speechOutcome === "PARTIAL" ? "PARTIAL"
      : "NONE";

    if (result.outcome === "FULL_DINO" || result.outcome === "PARTIAL" || result.outcome === "CHAOTIC") {
      const formName = profileToForm(result.effectiveProfile);
      // CANARY FALLBACK: Guard against undefined forms
      const formDef = FORM_DEFINITIONS[formName] || FORM_DEFINITIONS.CANARY;

      // 🛡️ DOUBLE-TRANSFORMATION GUARD
      // Prevent transforming an already-transformed character to another dinosaur form
      const currentForm = state.npcs.blythe.transformationState.form;
      const currentFormDef = FORM_DEFINITIONS[currentForm] || FORM_DEFINITIONS.CANARY;
      if (currentForm !== "HUMAN" && formName !== "HUMAN") {
        result.outcome = "FIZZLE";
        result.description = `TRANSFORMATION BLOCKED: Blythe is already transformed (${currentFormDef.displayName})! Cannot transform to ${formDef.displayName}. Revert to human first.`;
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
        // REVERSAL provenance (§11) — origin library/profile captured for
        // later reversal math.
        originLibrary: state.dinoRay.genome.activeLibrary,
        originProfile: state.dinoRay.genome.selectedProfile || null,
      };
      }
    }
  }

  // Guard transformation (Fred & Reginald)
  if ((targetId === "GUARD_FRED" || targetId === "GUARD_REGINALD") && isTransformOutcome) {
    const guardKey = targetId === "GUARD_FRED" ? "fred" as const : "reginald" as const;
    const guard = state.lairDefense?.[guardKey];

    if (guard && guard.transformable) {
      const formName = profileToForm(result.effectiveProfile);
      const formDef = FORM_DEFINITIONS[formName] || FORM_DEFINITIONS.CANARY;
      const speechOutcome = changes.speechOutcome as string || "NONE";
      const speechRetention: SpeechRetention = speechOutcome === "FULL" ? "FULL"
        : speechOutcome === "PARTIAL" ? "PARTIAL"
        : "NONE";

      guard.transformationState = {
        form: formName,
        speechRetention,
        stats: { ...formDef.stats },
        abilities: { ...formDef.abilities },
        currentHits: 0,
        maxHits: formDef.maxHits,
        stunned: false,
        stunnedTurnsRemaining: 0,
        transformedOnTurn: state.turn,
        previousForm: "HUMAN",
        canRevert: result.outcome !== "CHAOTIC",
        revertAttempts: 0,
        partialShotsReceived: result.outcome === "PARTIAL" ? 1 : 0,
        adaptationStage: "DISORIENTED",
        turnsPostTransformation: 0,
        chimeraType: null,
        chimeraEffect: null,
        // REVERSAL provenance (§11)
        originLibrary: state.dinoRay.genome.activeLibrary,
        originProfile: state.dinoRay.genome.selectedProfile || null,
      };
      guard.status = "DISCOMBOBULATED";
      guard.location = "TRANSFORMED";
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
    state.npcs.drM.suspicionScore = Math.max(-3, state.npcs.drM.suspicionScore - 1);
  }

  // ============================================
  // INSPECTOR GRAVES TRANSFORMATION (INSPECTOR_COMETH)
  // ============================================
  // Transforming a Guild Inspector is... technically legal.
  // The consequences, however, are CATASTROPHIC.
  if (targetId === "INSPECTOR_GRAVES" && state.inspector && isTransformOutcome) {
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
