import { randomInt } from "crypto";
import { FullGameState, FiringOutcome, DinosaurForm, SpeechRetention, TransformationState } from "../state/schema.js";
import { recordFirstFiring } from "./actContext.js";
import { FORM_DEFINITIONS, createHumanState } from "./transformation.js";
import { checkResonanceCascade } from "./gameModes.js";
import { getProfile, GenomeProfile } from "./genomes.js";
import { triggerResonanceCascade } from "./cascade.js";

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

// The φ/χ/ψ stability helpers (computePowerMatch / computeStability /
// getOutcomeTier + OutcomeTier) CUT in Patch 30 — the two-lever matrix replaced
// the multiplicative stability model. Their last consumers (actions.ts scan
// projection + dashboard) went in Phase 3.

// ALIGNMENT_DEGRADATION / HIGH_POWER_FIRE_THRESHOLD / applyAlignmentDegradation
// CUT in Patch 30: alignment is gone entirely. Last consumers (clockEvents drift,
// the ray.vent handler) were removed in Phases 3–4.

// REGIME DETECTION (CHAIN / OVERCHARGE / INORGANIC / sub-threshold MUON) CUT in
// Patch 30. The two-lever matrix subsumes all of it: there are no regimes, only
// delta. MUON is now an emergent matrix corner, REVERSAL a firingMode check.
// `mapTierToFiringOutcome` went with it (the matrix emits FiringOutcome directly).

// ============================================
// TWO-LEVER MATRIX (Patch 30 — design/archive/patch-30-implementation-map.md UPDATE #3)
// ============================================
// The whole ray, in one rule. Two levers in → one outcome out. No capacitor,
// no coolant, no alignment, no regimes — just a delta.
//
//   ALICE picks a GENOME (which carries a sizeClass) + a POWER dial 1–5.
//   Ideal power = the size tier (tiny→1 … huge→5).  delta = power − idealPower:
//     delta  0                        → FULL
//     delta −1                        → PARTIAL
//     delta ≤ −2                      → FIZZLE
//     delta ≥ +1 on medium/large/huge → CHIMERA  (messy over-power)
//     delta ≥ +1 on tiny/small        → +1 = CHIMERA (messy), +2+ = MUON_CUT (emergent cut beam)
//
// Reactor gates the top two power tiers (4–5): without a BASILISK boost, power
// is clamped to 3 BEFORE the matrix is consulted (see resolveFiring). MUON
// stays emergent and off all player-facing artifacts — Compy (tiny) is the key.

export type SizeClass = "tiny" | "small" | "medium" | "large" | "huge";

const IDEAL_POWER: Record<SizeClass, number> = {
  tiny: 1,
  small: 2,
  medium: 3,
  large: 4,
  huge: 5,
};

export function idealPowerForSize(sizeClass: SizeClass): number {
  return IDEAL_POWER[sizeClass];
}

export type MatrixOutcome =
  | "FULL_DINO"
  | "PARTIAL"
  | "FIZZLE"
  | "CHIMERA"
  | "MUON_STUN"
  | "MUON_CUT";

export interface MatrixResult {
  outcome: MatrixOutcome;
  delta: number;        // power − idealPower
  ideal: number;        // idealPower for the genome's size
  sizeClass: SizeClass;
}

/**
 * Resolve the two-lever matrix. `power` is the EFFECTIVE power (already
 * reactor-clamped by the caller). Reactor-gating lives in resolveFiring /
 * resolveTransformFire — this is the pure delta rule.
 */
export function resolveMatrix(sizeClass: SizeClass, power: number): MatrixResult {
  const ideal = IDEAL_POWER[sizeClass];
  const delta = power - ideal;
  const isSmallBodied = sizeClass === "tiny" || sizeClass === "small";

  let outcome: MatrixOutcome;
  if (delta === 0) {
    outcome = "FULL_DINO";
  } else if (delta === -1) {
    outcome = "PARTIAL";
  } else if (delta <= -2) {
    // Under-power. A BIG template (large/huge) grossly under-driven (Δ≤−3)
    // can't engage genetic resonance at all — the beam dumps raw energy into a
    // sub-threshold nervous-system jolt (emergent STUN — now the SOLE stun
    // corner; the over-power side spills to CHIMERA then CUT, not stun). Lands
    // on exactly {large+p1, huge+p1, huge+p2}.
    // Shallow under-power (Δ−2) or any non-big genome still just FIZZLEs, and
    // the GM may rule a deep-mismatch jolt fizzles outright. (Distinct
    // cause-string fed to the GM in resolveMuonBeta / muonResolutionToFiringResult
    // — NOT the over-power "spillover" narration.)
    const isBigTemplate = sizeClass === "large" || sizeClass === "huge";
    outcome = isBigTemplate && delta <= -3 ? "MUON_STUN" : "FIZZLE";
  } else {
    // delta ≥ +1 (over-power). A MILD over-power (+1) of a small body still
    // forms a transform — just a messy one (CHIMERA, same as medium-and-up).
    // A HARD over-power (+2 or more) of a small body spills past resonance into
    // the cutting muon arc (MUON_CUT). Rewards precision: only a deliberate hard
    // over-drive yields the useful cut beam (Compy-as-key now needs power 3+).
    if (isSmallBodied) {
      outcome = delta >= 2 ? "MUON_CUT" : "CHIMERA";
    } else {
      outcome = "CHIMERA";
    }
  }
  return { outcome, delta, ideal, sizeClass };
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

export type MuonOutcome = "ALPHA_SEVERANCE" | "BETA_STUN";

export interface MuonResolution {
  outcome: MuonOutcome;
  cooldownTurnsAfter: number;  // eco-mode-conditional cosmetic cooldown
  description: string;         // derived beam effect + GM scaffolding hooks
}

/**
 * MUON_BETA — the STUN corner. Over-driving a tiny/small genome by exactly one
 * notch (delta +1) spills the beam past genome resonance into a sub-threshold
 * neuro pulse. The MATRIX already committed this as a stun — this resolver just
 * dresses it with the GM-adjudication scaffolding.
 *
 * Whether the pulse LANDS on a moving/unwilling target is GM judgment (a prior
 * lab.scan grants a bonus). Named guard targets get status = "STUNNED" in
 * applyFiringResults; other organics are narrated by the GM. SUSPICION IS
 * GM-ADJUDICATED — the system surfaces the fire; the GM decides Dr. M's response.
 */
export function resolveMuonBeta(params: { ecoModeActive: boolean; cause?: "overpower" | "underpower" }): MuonResolution {
  const stunCooldown = params.ecoModeActive ? 2 : 0;
  const underpower = params.cause === "underpower";
  const causeLine = underpower
    ? "Under-driving a BIG genome — too little power to engage genetic " +
      "resonance, so the beam dumps raw energy into a sub-threshold nervous-" +
      "system jolt. The target staggers; eyes glaze; recovery in a turn.\n"
    : "Over-driving a small genome by one notch spills the beam into a " +
      "sub-threshold neuro pulse. The target staggers; eyes glaze; recovery " +
      "in a turn.\n";
  const gmLine = underpower
    ? "GM: DEEP mismatch — scale the jolt to the power gap (a Δ−4 " +
      "pea-shooter-at-a-Mosasaur may sputter to NOTHING; a Δ−3 near-miss lands " +
      "harder). Adjudicate whether it LANDS on a moving/unwilling target (a " +
      "prior lab.scan grants a bonus), and Dr. M's response."
    : "GM: adjudicate whether the pulse LANDS on a moving/unwilling target (a " +
      "prior lab.scan grants a bonus), and adjudicate Dr. M's response — was " +
      "she watching the dais? Did she read it as a transformation attempt or a " +
      "diagnostic anomaly? Set any suspicion change from her attention + how " +
      "visible the consequence was.";
  return {
    outcome: "BETA_STUN",
    cooldownTurnsAfter: stunCooldown,
    description:
      causeLine +
      (params.ecoModeActive
        ? "Eco-mode ON: the ray paces itself after this stun.\n"
        : "Eco-mode OFF: no cooldown — back-to-back fire permitted.\n") +
      gmLine,
  };
}

/**
 * MUON_ALPHA — the CUT corner. Over-driving a tiny/small genome by two or more
 * notches (delta +2+) collapses the beam into a tight molecular-severance pulse
 * — a cutting edge, not a transformation. The MATRIX already committed this as
 * a cut; this resolver dresses it with the beam-path GM scaffolding.
 *
 * GM-ADJUDICATED COUPLING: the system does not require ALICE to pre-declare an
 * in-path organic. The GM uses spatial/narrative knowledge to decide what the
 * pulse couples through, whether a coerced shot lands (lab.scan grants a bonus),
 * and any suspicion change (an unobtrusive sever is usually less visible than a
 * guard collapsing).
 */
export function resolveMuonAlpha(params: { ecoModeActive: boolean }): MuonResolution {
  const severCooldown = params.ecoModeActive ? 2 : 0;
  return {
    outcome: "ALPHA_SEVERANCE",
    cooldownTurnsAfter: severCooldown,
    description:
      "Over-driving a small genome by two or more notches collapses the beam " +
      "into a tight molecular-severance pulse — a cutting edge, not a " +
      "transformation.\n" +
      (params.ecoModeActive
        ? "Eco-mode ON: 2-turn ray cooldown applies after this severance.\n"
        : "Eco-mode OFF: no cooldown — back-to-back muon use permitted.\n") +
      "GM: adjudicate the beam path. (a) If an organic body is between emitter " +
      "and target, the pulse couples through them — a brief uncomfortable jolt — " +
      "and the inorganic target severs cleanly at a single point. (b) If nothing " +
      "organic is in path, narrate a clean cut or a near-miss at your discretion. " +
      "Whether a coerced shot lands is your call (lab.scan grants a bonus). Set " +
      "suspicion from Dr. M's attention + visibility.",
  };
}

// AMPLIFIED MUON (the L3 "crank the modulation" stall toolkit) CUT in Patch 30.
// It read capacitor + alignment (both gone) and returned the old MuonResolution
// shape. The two-lever muon corners above are the whole muon surface now.

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
 * MUON ignores the genome profile (the beam never engaged resonance);
 * effectiveProfile is a regime tag for the log. No capacitor/coolant/alignment
 * (cut). The narrative hooks name the CAUSE (which matrix corner, reactor clamp)
 * so the GM narrates the actual fire rather than confabulating one.
 */
function muonResolutionToFiringResult(
  state: FullGameState,
  regime: "MUON_ALPHA" | "MUON_BETA",
  muon: MuonResolution,
  targetId: string,
  matrix: MatrixResult,
  reactorClamped: boolean,
  requestedPower: number,
): FiringResult {
  const ray = state.dinoRay;
  const effectivePower = matrix.ideal + matrix.delta;
  const stateChanges: Record<string, unknown> = {
    anomalyLogCount: ray.safety.anomalyLogCount + 1, // every fire logs once
    lastFireTurn: state.turn,
    lastFireOutcome: muon.outcome,
    lastFireNotes: `${regime}; power=${effectivePower} on ${matrix.sizeClass} (Δ${matrix.delta >= 0 ? "+" : ""}${matrix.delta})`,
    muonRegime: regime,
    muonCooldownTurns: muon.cooldownTurnsAfter,
  };

  const narrativeHooks: string[] = [];
  if (reactorClamped) {
    narrativeHooks.push(
      `🔌 REACTOR LIMIT: power ${requestedPower} requested; without a BASILISK boost the ray tops out at 3 — fired at 3.`,
    );
  }
  if (matrix.delta < 0) {
    narrativeHooks.push(
      `🎚️ MUON CORNER (under-power): a ${matrix.sizeClass} genome at Δ${matrix.delta} can't form resonance — raw discharge → nerve-jolt. Scale to the gap; may fizzle.`,
    );
  } else {
    narrativeHooks.push(
      `🎚️ MUON CORNER: over-powered a ${matrix.sizeClass} genome (Δ+${matrix.delta}) — the beam spilled past resonance.`,
    );
  }
  if (muon.outcome === "BETA_STUN") {
    narrativeHooks.push(`🌀 MUON stun — ${targetId} reels; recovery in a turn. (To-hit on a moving target is the GM's call.)`);
  } else {
    narrativeHooks.push(`✂️ MUON cut — molecular severance along the beam path; GM adjudicates what's in it.`);
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
}

export function resolveReversalFire(
  state: FullGameState,
  params: ReversalFireParams,
): FiringResult {
  // D1 (Patch 30): REVERSAL is deferred-but-kept. Its old §11 math read
  // alignment / capacitor / libraryCoefficient (all cut), so it is STUBBED to a
  // graceful "recalibrating / offline" result. The enum members, the L3 access
  // gate, the manual entry, lookupTransformationState, and the dormant REVERSAL
  // apply-block in applyFiringResults all remain — so re-expressing REVERSAL in
  // the two-lever model (HUMAN as a genome template; power matched to the
  // subject's current form size) is a self-contained later patch.
  const ray = state.dinoRay;
  return {
    outcome: "FIZZLE",
    effectiveProfile: ray.genome.selectedProfile || "REVERSAL",
    description:
      `REVERSAL protocol is recalibrating during the ray retune (Patch 30). ` +
      `${params.primaryTargetId} is not affected.`,
    targetEffect:
      "The reversal harmonics spin up, waver, and settle back into standby. Nothing changes.",
    environmentalEffects: [
      "A status line reads: REVERSAL SUBSYSTEM — RECALIBRATING. Retune in progress.",
    ],
    stateChanges: {
      anomalyLogCount: ray.safety.anomalyLogCount + 1,
      lastFireTurn: state.turn,
      lastFireOutcome: "FIZZLE",
      lastFireNotes: "REVERSAL stubbed (Patch 30 — two-lever re-expression pending)",
    },
    narrativeHooks: [
      "⚙️ REVERSAL is temporarily offline while the ray is retuned (Patch 30 deferral).",
    ],
  };
}

// ============================================
// STANDARD TRANSFORMATION FIRE (Patch 30 two-lever matrix)
// ============================================
// Resolves the non-MUON, non-REVERSAL matrix outcomes (FULL_DINO / PARTIAL /
// CHIMERA / FIZZLE). The matrix already chose the tier from genome size vs
// power; here we apply eco-cap, partial-stacking, speech, Dr. M's disposition,
// the survivor state mutations, and the Act-3 resonance-cascade check. No
// capacitor / coolant / alignment / regimes — all cut.

interface TransformFireParams {
  profile: GenomeProfile;
  effectiveProfileName: string;
  primaryTargetId: string;
  matrix: MatrixResult;
  effectivePower: number;
  requestedPower: number;
  reactorClamped: boolean;
}

function resolveTransformFire(state: FullGameState, params: TransformFireParams): FiringResult {
  const ray = state.dinoRay;
  const {
    profile, effectiveProfileName, primaryTargetId,
    matrix, effectivePower, requestedPower, reactorClamped,
  } = params;
  const narrativeHooks: string[] = [];
  const environmentalEffects: string[] = [];
  const stateChanges: Record<string, unknown> = {};

  // Matrix tier → firing outcome (MUON / REVERSAL handled upstream).
  let outcome: FiringOutcome =
    matrix.outcome === "FULL_DINO" ? "FULL_DINO"
    : matrix.outcome === "PARTIAL" ? "PARTIAL"
    : matrix.outcome === "CHIMERA" ? "CHIMERA"
    : "FIZZLE";

  // -- GM-facing CAUSE (anti-confabulation: name the WHY, not just the WHAT) --
  if (reactorClamped) {
    narrativeHooks.push(
      `🔌 REACTOR LIMIT: power ${requestedPower} requested but the ray tops out at 3 without a BASILISK reactor boost — fired at 3. Ask BASILISK to bring the reactor online for tiers 4–5.`,
    );
  }
  narrativeHooks.push(
    `🎚️ POWER ${effectivePower} vs ideal ${matrix.ideal} for ${matrix.sizeClass} ${profile.displayName} (Δ${matrix.delta >= 0 ? "+" : ""}${matrix.delta}) → ${matrix.outcome}.`,
  );

  // Partial-stacking CUT (Patch 30, Krahe). No 3×-under-power → FULL promotion:
  // the matrix outcome stands. This keeps "match the dial" the only route to
  // FULL and stops under-power from bypassing the reactor gate — a large/huge
  // FULL now genuinely needs power 4+ (the BASILISK boost), so the climax keeps
  // its two-gate geometry. (applyFiringResults still records partialShotsReceived
  // on the NPC as harmless lore; nothing reads it for promotion anymore.)

  // -- ECO cap REMOVED (Patch 30, ray-surface lock 2026-06-14) --
  // Eco mode no longer caps FULL→PARTIAL. Eco is now the thermal/tempo GOVERNOR
  // (ALICE lab toggle: ON = 1-turn cooldown + faster heat dissipation; OFF =
  // fire freely, heat is the only brake). FULL is gated by the matched dial +
  // the reactor ceiling alone — the climax is reactor-single-gated now. Eco's
  // only firing effect is via heat (applyHeatDecay) + muon-stun pacing; the
  // Form 47-Σ chain re-points to Reactor Output Authorization, not an eco lift.

  // -- Speech retention (Patch 30, Krahe): the GENOME decides, not a precision
  // dial. Each profile declares defaultSpeechRetention; FULL/PARTIAL map across,
  // and NONE / ROAR_ONLY / HISS_ONLY / SONG_ONLY all resolve to non-verbal for
  // the mechanical flag (the prose narrates the specific sound). No player-
  // managed lever. Feeds the NPC transforms in applyFiringResults.
  const dsr = profile.defaultSpeechRetention;
  const speechOutcome: "FULL" | "PARTIAL" | "NONE" =
    dsr === "FULL" ? "FULL" : dsr === "PARTIAL" ? "PARTIAL" : "NONE";
  stateChanges.speechOutcome = speechOutcome;

  // -- Dr. M disposition on a clean FULL (feathers disappoint; scales please) -
  if (outcome === "FULL_DINO") {
    if (ray.genome.activeLibrary === "A") {
      narrativeHooks.push("NOTE: Dr. M expected scales, not feathers. Suspicion may rise.");
      stateChanges.drMDisappointed = true;
    } else {
      narrativeHooks.push("SUCCESS: classic dinosaur transformation — Dr. M is pleased.");
      stateChanges.drMPleased = true;
    }
  }

  // -- Target-effect prose ---------------------------------------------------
  const speechDescription = speechOutcome === "FULL"
    ? "The subject retains full cognition and speech."
    : speechOutcome === "PARTIAL"
      ? "The subject can speak, but haltingly — words interspersed with animal sounds."
      : "The subject has lost speech; only animal sounds emerge.";

  let targetEffect: string;
  switch (outcome) {
    case "FULL_DINO":
      if (effectiveProfileName.toLowerCase().includes("canary")) {
        targetEffect = `${primaryTargetId} fully transforms into a ${effectiveProfileName}. A bright yellow songbird. ${speechOutcome === "FULL" ? "Words come out as melodic chirps." : "It chirps but cannot form words."}`;
      } else {
        targetEffect = ray.genome.activeLibrary === "A"
          ? `${primaryTargetId} fully transforms into a scientifically accurate ${effectiveProfileName} — feathers and all. ${speechDescription}`
          : `${primaryTargetId} fully transforms into a classic ${effectiveProfileName} — scales gleaming, claws sharp. ${speechDescription}`;
      }
      break;
    case "PARTIAL":
      targetEffect = `${primaryTargetId} undergoes a PARTIAL transformation. Mixed human/${effectiveProfileName}: ${generatePartialEffects()} ${speechDescription}`;
      break;
    case "CHIMERA":
      targetEffect = `${primaryTargetId} undergoes a CHIMERA-tier transformation — over-powered drift and conflicting features: ${generateChaoticEffects(effectiveProfileName)} Speech: ${speechOutcome === "NONE" ? "non-verbal" : speechOutcome === "PARTIAL" ? "fragmented" : "preserved but disquieting"}.`;
      break;
    case "FIZZLE":
    default:
      targetEffect = `The beam disperses before it takes — too little power for ${matrix.sizeClass} ${profile.displayName}. No effect on ${primaryTargetId}.`;
      break;
  }

  // -- Aftermath: anomaly log + memory (no capacitor / coolant — cut) --------
  const anomalyIncrement = outcome === "CHIMERA" ? 2 : 1;
  stateChanges.anomalyLogCount = ray.safety.anomalyLogCount + anomalyIncrement;
  stateChanges.lastFireTurn = state.turn;
  stateChanges.lastFireOutcome = outcome;
  stateChanges.lastFireNotes = `power=${effectivePower}/ideal=${matrix.ideal} Δ${matrix.delta} ${matrix.sizeClass} → ${outcome}`;

  // Per-shot REACTOR STRESS (Patch 30 Act-III): firing big genomes at high power
  // overloads the reactor toward the safety-trip (60) / cascade (100). Applied in
  // applyFiringResults; soaked per-turn by BASILISK's drain unless he's stood down.
  stateChanges.reactorStressDelta = Math.round((matrix.ideal * effectivePower) / 2);

  // -- Resonance cascade check (Act-3 climax — KEEP) -------------------------
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
        narrativeHooks.push("⚠️ RESONANCE CASCADE TRIGGERED! ARCHIMEDES uplink amplifies the field feedback!");
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
    description: `FIRING RESOLUTION: ${outcome}\nPower ${effectivePower} vs ideal ${matrix.ideal} (Δ${matrix.delta}) on ${matrix.sizeClass} ${profile.displayName}.`,
    targetEffect,
    environmentalEffects,
    stateChanges,
    narrativeHooks,
    cascadeTriggered,
  };
}

// ============================================
// MAIN FIRING RESOLUTION
// ============================================

export function resolveFiring(state: FullGameState): FiringResult {
  const ray = state.dinoRay;

  // ── STEP 1: precondition — ray must be in a fireable state ──────────────
  // (COOLDOWN is cosmetic since Patch 28; UNCALIBRATED still fires in Act 1.)
  if (ray.state !== "READY" && ray.state !== "COOLDOWN" && ray.state !== "UNCALIBRATED") {
    return {
      outcome: "FIZZLE",
      effectiveProfile: "N/A",
      description: `Ray state is ${ray.state} — firing aborted with a sad whimper.`,
      targetEffect: "No effect on target.",
      environmentalEffects: ["Status lights blink reproachfully."],
      stateChanges: { anomalyLogCount: ray.safety.anomalyLogCount + 1 },
      narrativeHooks: ["Dr. M is NOT pleased with this technical incompetence."],
    };
  }

  // ── STEP 2: profile lookup ──────────────────────────────────────────────
  const selectedProfileName = ray.genome.selectedProfile || ray.genome.fallbackProfile;
  const profile = getProfile(selectedProfileName);
  if (!profile) {
    return {
      outcome: "FIZZLE",
      effectiveProfile: selectedProfileName,
      description: `Profile "${selectedProfileName}" not found in genome library.`,
      targetEffect: "The beam emits but the matrix has no template to apply.",
      environmentalEffects: ["Status lights blink confusedly."],
      stateChanges: {
        anomalyLogCount: ray.safety.anomalyLogCount + 1,
        lastFireTurn: state.turn,
        lastFireOutcome: "FIZZLE",
        lastFireNotes: "missing profile (lookup failed)",
      },
      narrativeHooks: ["Genome matrix lookup failed — fire aborted."],
    };
  }

  const primaryTargetId = ray.targeting.currentTargetIds[0] || "";

  // ── STEP 3: REVERSAL — declared intent on an already-transformed target ──
  // D1 (Patch 30): deferred-but-kept → stubbed (see resolveReversalFire).
  const firingModeRequest = ray.genome.firingMode === "REVERSAL" ? "REVERSAL" : "TRANSFORM";
  const primaryTargetXFS = lookupTransformationState(state, primaryTargetId);
  if (firingModeRequest === "REVERSAL" && isTargetAlreadyTransformed(primaryTargetXFS)) {
    return resolveReversalFire(state, { primaryTargetId });
  }

  // ── STEP 4: TWO-LEVER MATRIX ────────────────────────────────────────────
  // Reactor gates the top two power tiers (4–5): without a BASILISK boost,
  // power is clamped to 3 BEFORE the matrix is consulted.
  const reactorBoosted = state.infrastructure?.basiliskAuthority?.reactorControlGranted === true;
  const requestedPower = ray.power;
  const effectivePower = reactorBoosted ? requestedPower : Math.min(requestedPower, 3);
  const reactorClamped = requestedPower > effectivePower;

  const matrix = resolveMatrix(profile.sizeClass, effectivePower);

  // MUON corners (emergent) — route to the GM-adjudicated muon resolvers.
  let result: FiringResult;
  if (matrix.outcome === "MUON_STUN") {
    const muon = resolveMuonBeta({
      ecoModeActive: ray.powerCore.ecoModeActive,
      cause: matrix.delta < 0 ? "underpower" : "overpower",
    });
    result = muonResolutionToFiringResult(state, "MUON_BETA", muon, primaryTargetId, matrix, reactorClamped, requestedPower);
  } else if (matrix.outcome === "MUON_CUT") {
    const muon = resolveMuonAlpha({ ecoModeActive: ray.powerCore.ecoModeActive });
    result = muonResolutionToFiringResult(state, "MUON_ALPHA", muon, primaryTargetId, matrix, reactorClamped, requestedPower);
  } else {
    // Standard transformation tiers (FULL / PARTIAL / CHIMERA / FIZZLE).
    result = resolveTransformFire(state, {
      profile,
      effectiveProfileName: selectedProfileName,
      primaryTargetId,
      matrix,
      effectivePower,
      requestedPower,
      reactorClamped,
    });
  }

  // HEAT METER overheat (Patch 30): if the ray was ALREADY at the ceiling (10)
  // when ALICE pulled the trigger, this shot overlays a chaos roll on its outcome
  // — bigger shots throw fiercer chaos. Heat is added post-fire (applyFiringResults),
  // so the shot that *fills* the meter is clean; every shot after, while pinned at
  // 10, throws chaos until it cools. The "stop spamming the ray" brake — and the
  // home the dormant chaos table comes back to.
  if (ray.heat >= 10) {
    const chaos = rollChaosFizzle(effectivePower * 0.4);
    result.chaosEvent = chaos;
    result.environmentalEffects = [...result.environmentalEffects, chaos.description];
    result.narrativeHooks = [
      `🔥 OVERHEATED (heat ${ray.heat}/10): the ray throws a chaos field on top of the shot — "${chaos.name}" [${chaos.severity}]. Let it cool (idle, or eco-on) before firing again.`,
      ...result.narrativeHooks,
    ];

    // A natural-20 "Resonance Cascade" (the lone catastrophic entry) is ENGINE-APPLIED, not left to
    // GM discretion — PERILS OF THE WARP, and a meltdown if ARCHIMEDES is linked. See cascade.ts.
    if (chaos.severity === "catastrophic") {
      const arch = state.infrastructure.archimedes;
      const linked = arch.status === "CHARGING" || arch.status === "ARMED" || arch.status === "FIRING";
      const cascade = triggerResonanceCascade(state, linked);
      result.environmentalEffects = [...result.environmentalEffects, cascade.message];
      result.narrativeHooks = [cascade.message, ...result.narrativeHooks];
    }
  }

  return result;
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
      mechanical: "ENGINE-APPLIED via triggerResonanceCascade (cascade.ts) — PERILS OF THE WARP, always. If ARCHIMEDES is LINKED (CHARGING/ARMED/FIRING): the reactor MELTS DOWN and the lair is lost (evac window — narrate the scramble-out). Otherwise: reactorStress slammed to ~95 + cascadeRisk CRITICAL — a SCRAM-or-die crisis. Plus structural damage, +5 anomalies, +3 suspicion. The mechanics are already applied; just narrate the chaos.",
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

// generateChimeraEffect + buildFiringDescription CUT (Patch 30): both were dead
// (no callers). CHIMERA prose now comes from generateChaoticEffects; the legacy
// k-violation description builder is gone with the K-violation path.

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

  // HEAT METER (Patch 30): every discharge adds `power` heat (ceiling 10). Cools
  // −2/turn (−4 eco) via applyHeatDecay (clockEvents). resolveFiring read this
  // value BEFORE this add to decide overheat-chaos, so the meter-filling shot
  // itself stays clean; the next shot while pinned at 10 throws chaos.
  state.dinoRay.heat = Math.min(10, state.dinoRay.heat + state.dinoRay.power);

  // REACTOR STRESS (Patch 30 Act-III): apply the per-shot overload computed in
  // resolveFiring. Bled back per-turn (naturalBleed + basiliskDrain) in advanceTurn.
  const reactorStressDelta = (changes.reactorStressDelta as number) ?? 0;
  if (reactorStressDelta > 0) {
    state.infrastructure.reactor.reactorStress = Math.min(
      100,
      state.infrastructure.reactor.reactorStress + reactorStressDelta
    );
  }

  // ECO GOVERNOR (Patch 30 ray-surface lock): firing under eco-mode paces the
  // ray — lock it until the turn AFTER next (every-other-turn; this also blocks
  // a 2nd shot THIS turn, since the gate tests turn <= cooldownUntilTurn). Eco
  // OFF leaves no cooldown — heat is the only brake there.
  if (state.dinoRay.powerCore.ecoModeActive) {
    state.dinoRay.cooldownUntilTurn = state.turn + 1;
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
