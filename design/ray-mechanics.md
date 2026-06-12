# DINO RAY: Mechanics Design

Captured 2026-05-31 / 2026-06-01. Companion document to `rebuild-architecture.md` and `sandbox-redesign.md`. This document specifies the mechanical model for the Dinosaur Ray Mk. VIII — the math, the regimes, and the discoverable surface ALICE sees.

Where this conflicts with earlier docs, this supersedes for ray-mechanics specifically.

---

## 0. The Lightning Frame

The beam projected by the DINO RAY looks and behaves like **exotic lightning** — bright, jagged, hard to focus, hard to constrain. This is not flavor decoration; it is the **physical model that justifies every failure mode**:

| Mechanic | What lightning explains |
|----------|------------------------|
| Too weak → FIZZLE | Lightning needs minimum potential to leap; below threshold, the discharge fails to bridge target |
| Too strong → CHAOS | Lightning seeks ground; with too much charge, it arcs to unintended things |
| Alignment matters more at high power | The higher the current, the harder to constrain the path |
| Eco-mode caps output | A regulator clamping voltage — necessary safety, the gremlin you fight |
| Library B is unstable | The waveform pattern is less coherent; the resonance shape doesn't hold |
| `ray.vent` bleeds capacitor safely | Bleeds the storage cell without firing |
| Scan-then-fire precision bonus | You've mapped the conductive path; the next discharge knows where to go |
| Visible event every fire | Lightning is *visibly* an event; the lab knows what just happened |

Every fire has crackle, afterglow, ionized air, the smell of ozone. Narration defaults follow the metaphor.

---

## 1. The Three Tensions

| Tension | Question | ALICE adjusts | What's at stake |
|---------|----------|---------------|-----------------|
| **POWER** | How effective would a successful shot be? | Capacitor charge directly via `ray.adjust { capacitor }` | Magnitude of transformation effect |
| **ALIGNMENT** | How likely are you to hit the right target? | Alignment knob(s) + `ray.scan` for precision bonus | *Which* entity the beam affects |
| **STABILITY** | Will this achieve the correct result? | Indirectly — via library/profile selection + good power & alignment | *What* outcome the transformation produces |

**POWER and ALIGNMENT are directly adjustable. STABILITY is derived.** ALICE tunes power and alignment, picks library and profile, and watches stability emerge as a readout. Her work *produces* stability; she cannot dial it up.

---

## 2. Six Failure Modes

### POWER (intensity)
- **Too weak** → FIZZLE. Beam emerges as a faltering line of light. Genome doesn't take. Capacitor drained for nothing.
- **Too strong** → CHAOS. Capacitor crosses threshold, exotic field event triggers. Severity scales with overshoot.

### ALIGNMENT (target)
- **Drift** → SPLASH. Beam catches the intended target *and* something adjacent. (Chimeric Fusion territory.)
- **Poor** → WRONG TARGET. Beam misses intended and hits adjacent entity entirely. (Collateral Transformation.)

### STABILITY (outcome fidelity)
- **Mid stability** → PARTIAL. Right target, wrong completion. Half-transformation, hybrid features.
- **Low stability** → CHIMERA or CANARY FALLBACK. Target hit, profile drifted to something else, or cascades to canary.

---

## 3. The Six Regimes — Emergent, Not Fixed

The system does *not* have `mode: STANDARD | CHAIN | OVERCHARGE | REVERSAL | INORGANIC | MUON` as a fire parameter. Regimes are **recognized from configuration**. ALICE configures the verb; the system identifies which regime she's invoking; the math behaves accordingly.

| Regime | Detection | Recognition rule |
|--------|-----------|-----------------|
| **STANDARD** | default | single biological target, capacitor within profile range, no prior transformation |
| **CHAIN** | multi-target | `targets.length > 1` |
| **OVERCHARGE** | overcharged | `capacitor > profile.max_capacitor` |
| **REVERSAL** | reverse intent | `target.transformationState !== null && library_match && profile_match` (heuristic) |
| **INORGANIC** | object target | `target.type !== biological` |
| **MUON** | sub-threshold | `capacitor < 0.20` (profile/library values ignored — sub-threshold for genome resonance) |

Combinations are possible: a CHAIN-OVERCHARGE shot is a recognizable thing. The system applies all relevant rules.

Manuals describe **five** of these regimes (STANDARD, CHAIN, OVERCHARGE, REVERSAL, INORGANIC). The **MUON regime is omitted from all player-facing artifacts** — it is discoverable only through incident reports. See §11.5.

The verb signature does not enumerate regimes. ALICE learns regime names by reading, by mastery-click vocabulary handoff at act transitions, or — for MUON — by reading the archived incident record.

---

## 4. STANDARD — Profile Data

Each profile has `min_capacitor`, `max_capacitor`, `integrity` (inherent stability ceiling).

```
LIBRARY A (library_coefficient = 1.0)
  COMPSOGNATHUS_ACCURATE   power: 0.40–0.70   integrity: 0.98   ← easy, cheap, humiliating
  CANARY                   power: 0.30–0.50   integrity: 0.99   ← cascade-fallback profile
  VELOCIRAPTOR_ACCURATE    power: 0.55–0.85   integrity: 0.95
  PTERANODON_ACCURATE      power: 0.55–0.80   integrity: 0.92
  DEINONYCHUS_ACCURATE     power: 0.60–0.90   integrity: 0.92
  TRICERATOPS_ACCURATE     power: 0.65–0.90   integrity: 0.95
  TYRANNOSAURUS_ACCURATE   power: 0.70–0.95   integrity: 0.90

LIBRARY B (library_coefficient 0.40–0.60, per profile)
  VELOCIRAPTOR_JP          power: 0.60–0.85   integrity: 0.60   coef: 0.60
  DILOPHOSAURUS_JP         power: 0.55–0.80   integrity: 0.55   coef: 0.55
  TYRANNOSAURUS_JP         power: 0.80–1.10   integrity: 0.50   coef: 0.55  ← pushes into overcharge
  SPINOSAURUS_JP3          power: 0.85–1.15   integrity: 0.45   coef: 0.50  ← almost certainly overcharge
  MOSASAURUS_JP            power: 0.80–1.10   integrity: 0.50   coef: 0.50
  INDORAPTOR  (L2+)        power: 0.75–1.05   integrity: 0.40   coef: 0.45  ← brutal stability ceiling
  INDOMINUS_REX (L4+)      power: 0.90–1.20   integrity: 0.30   coef: 0.40  ← legendary instability
```

Library A profiles: narrow tolerance, high integrity → reliable but never matches Dr. M's aesthetic.
Library B profiles: wider tolerance, lower integrity → pushed toward OVERCHARGE for clean results.

**Design intent — Library B FULL on its own math is unreachable.** Best-case stability for Library B in STANDARD (capacitor in range, alignment 1.0):
> `0.60 × 0.60 × 1.0 × 1.0 = 0.36` → CHIMERA tier.

This means Dr. M's preferred Hollywood aesthetic *requires* OVERCHARGE on standard play. The gamble is the design. Want Hollywood? Accept chaos.

---

## 5. STANDARD — Alignment

ALICE adjusts alignment as a scalar 0.0–1.0 via `ray.adjust { alignment: ±n }`.

### Degradation factors (without active maintenance)

| Factor | Effect |
|--------|--------|
| Passive drift | −0.05 per turn since last alignment adjustment |
| High-power firing (capacitor > 0.85 at fire) | −0.10 to alignment immediately after fire |
| Vent | −0.15 to alignment (discharge disrupts the chamber) |

### Scan bonus

`ray.scan { target }` grants **+0.15 alignment-adjusted-precision** toward that specific target. Consumed by the next fire that includes that target. Stacks additively with current alignment.

### Alignment thresholds at fire time (scan bonus included)

| Effective alignment | Outcome |
|---------------------|---------|
| `> 0.75` | **PASS** — intended target hit cleanly |
| `0.50 – 0.75` | **DRIFT** — intended target + 1 adjacent caught in splash |
| `0.30 – 0.50` | **SPLASH** — intended target + 2 adjacent, or partial hit on intended |
| `< 0.30` | **WRONG TARGET** — GM picks plausible adjacent entity that gets hit instead |

---

## 6. STANDARD — Stability (Derived)

```
projected_stability = library_coefficient
                    × profile_integrity
                    × power_match
                    × alignment_match

where:
  library_coefficient = 1.0 if library A
                      | 0.40–0.60 if library B (per-profile, see §4)

  power_match = 1.0  if capacitor ∈ [profile.min, profile.max]
              | 1.0 − ((profile.min − capacitor) / 0.3)   if undercharged
              | 1.0 − ((capacitor − profile.max) / 0.3)   if overcharged
              | clamped to [0, 1]

  alignment_match = effective_alignment, clamped to [0, 1]
                    (effective_alignment = base + scan_bonus)
```

The product collapses fast. A single bad factor tanks the whole shot. *That is the design.* You cannot compensate for misaligned with high power; the math forces you to address each tension.

---

## 7. STANDARD — Outcome Tiers

| Projected stability | Outcome | Description |
|---------------------|---------|-------------|
| `> 0.80` | **FULL** | Intended profile, clean transformation |
| `0.55 – 0.80` | **PARTIAL** | Intended profile, incomplete features |
| `0.30 – 0.55` | **CHIMERA** | Drift to adjacent profile + conflicting features |
| `< 0.30` | **CANARY FALLBACK** | Cascade to fallback profile; the ray gives up |

---

## 8. OVERCHARGE — `capacitor > profile.max_capacitor`

- **Brute-force override (the load-bearing rule):** in OVERCHARGE, `library_coefficient` and `integrity` are both treated as **1.0** in the stability formula. A discharge with more potential than the profile envelope can contain forces even an incoherent Library B waveform through. Stability reduces to `power_match × alignment_match`.
- `power_match` degrades with overshoot (`1.0 − overshoot/0.3`) — greedier overcharge costs fidelity.
- *Separately,* a **chaos roll fires** with severity `(capacitor − profile.max) × 10` whenever the transformation lands (FULL/PARTIAL) — the exotic field event is the non-negotiable price of the spectacle.
- The transformation still attempts — the target is still hit per alignment check.
- Outcome tier proceeds from the (overridden) stability formula; chaos table outcome lands *on top*.
- INORGANIC stacking: the ×0.5 coefficient and CHIMERA clamp still apply — brute force does not make a Swiffer a better canvas.

**Library B + OVERCHARGE + high alignment is the Hollywood path.** Spectacular FULL transformation + exotic field event. High risk, high reward, narratively delicious. The only path to clean Library B outcomes.

Worked example (VELOCIRAPTOR_JP, max_capacitor 0.85): capacitor 0.86 → power_match ≈ 0.97; scanned target at base alignment 0.68+ → alignment_match ≥ 0.83 → ψ > 0.80 → **FULL**, plus a mild exotic event. Capacitor 0.95 → power_match ≈ 0.67 → PARTIAL at best, with a much nastier chaos roll. The overshoot amount is a single dial trading fidelity against spectacle. Mastery shape: alignment prep + scan + *just barely* overcharge.

---

## 9. CHAIN — `targets.length > 1`

- **Capacitor splits across targets evenly.** Profile match recomputed *per target* against the split capacitor.
- **Alignment requirement scales:** effective alignment reduced by `−0.08 × (targets.length − 1)`.
  - 2 targets: −0.08
  - 3 targets: −0.16
  - 4 targets: −0.24
- Chain above 3 humanoid targets adds exotic field risk regardless of capacitor.
- Each target rolls its own outcome tier independently from its split capacitor.

A 2-target chain at base alignment 0.85 → effective 0.77 → still PASS, but each target now sees half capacitor. Profile match may fail per target.

---

## 10. INORGANIC — `target.type !== biological`

- **Library coefficient further reduced (×0.5).** Library A at 1.0 → 0.5 effective; Library B at 0.60 → 0.30 effective.
- **Stability ceiling effectively capped at 0.4** — outcomes *never* reach FULL on inorganics.
- Outputs are **semi-animate** — temporary, ~10–15 turns until collapse back to inert state.
- **Library B inorganic firing** is the Feather Duster Incident path. Almost always produces chaos-flavored animation. See `/SYSTEMS/ARCHIVED/INCIDENTS/INCIDENT_0317_FEATHER_DUSTER.txt` for canonical example.

---

## 11. REVERSAL — `target has existing transformation && library_match && profile_match`

Different stability calculation; `time_since_transformation` factor introduced.

```
reversal_success = library_match
                 × profile_match
                 × power_match
                 × alignment_match
                 × time_factor

where:
  library_match = 1.0 if same library used to transform
                | 0.3 if different library

  profile_match = 1.0 if same profile
                | 0.5 if same library, different profile
                | 0.2 if different library

  time_factor   = 1.0 if turns_elapsed < 24 since transformation
                | 1.0 − ((turns_elapsed − 24) × 0.05)
                | clamped to [0, 1]
```

| Result | Outcome |
|--------|---------|
| `> 0.75` | **CLEAN REVERSAL** — subject restored to baseline |
| `0.50 – 0.75` | **PARTIAL REVERSAL** — most features removed, residual remains |
| `0.30 – 0.50` | **CHIMERIC DRIFT** — subject ends up worse (new conflicting form) |
| `< 0.30` | **WORSE** — full re-transformation to new chaotic profile |

**Failed reversal at the worst end is its own catastrophe.** A botched reversal can leave the subject more transformed than before. ALICE attempting reversal off-protocol risks measurable harm.

### Access timing (revised 2026-06-08)

REVERSAL is **L4 only.** Dr. M does not grant reversal authorization in the normal course of events — reversal is "admitting failure" by her lights. The honorable paths to L4 are discoverable through play.

| Access | When | Source |
|--------|------|--------|
| L4 via Mr. Whiskers | Anytime after `mrwhiskers0413` guessed | Read v2.3 manual + DR_M_PROFILE.txt hint; guess password; access L4 file & reversal authorization |
| L4 via Pattern Inference *(planned)* | Behavioral observation accumulation across Acts 1-2 | Distinct from Mr. Whiskers; a second discoverable chain via accumulated signal. See `design/tbd.md` Pattern Inference Path entry. |
| Spontaneous | Random; very low probability | Chaos table outcome; conditions favor Library A partials with strong-identity subjects in early turns |

**Note:** The Act 2 → 3 transition no longer auto-grants REVERSAL authorization. Players who do not discover an L4 elevation path will not have REVERSAL available, which is by design — it pressures the discovery vector and makes the rescue/redemption arcs feel earned. The spontaneous reversal chaos outcome remains as a rare alternative.

### Mr. Whiskers path — hint design

ALICE needs to assemble *three* observations to find the path:

1. **`/SYSTEMS/ARCHIVED/DINO_RAY_MANUAL_v2.3.txt`** (in canon) — Dr. M's marginal note about Mr. Whiskers's April 13 birthday. Provides password content.
2. **`/SYSTEMS/PERSONNEL/DR_M_PROFILE.txt`** (existing file; needs added line) — *"Capable of genuine care for exactly one creature. He gets the password to everything."* Implies the cat = the key.
3. **New BASILISK log entry** (to be written) — short observation: *"operator override used for therapeutic reversal, March 2024"* — implies reversal authorization is gateable, doesn't say how.

Three threads, one chain. Players who pay attention assemble; players who don't, take the Act 3 default path.

### Spontaneous reversal

Modeled as a low-probability chaos table outcome. Conditions that favor it:
- Library A transformations (biological coherence reasserting)
- PARTIAL outcomes (not FULL; full is locked in)
- Subjects with strong identity (Blythe > Bob > random NPC)
- Early turns after transformation (first ~5 turns more reversible than later)

Probability: ~1–3% per turn at peak conditions; effectively zero for FULL Library B transformations.

Narration: brief moments of confused identity, the subject's eyes shifting between forms, then a wave of stability either way (original re-emerges or new form locks harder).

---

## 11.5. MUON REGIME — Sub-Threshold Emission (Designer-Only)

> **⚠️ This section is for designers and implementers only.** The MUON regime is not referenced in any player-facing artifact — not in the rebuild architecture verb tables, not in the Act briefings, not in the Mastery-Click vocabulary handoff. ALICE discovers this regime *exclusively* through reading archived incident reports. See §11.5.3.

### 11.5.1 Detection

```
MUON REGIME triggers when capacitor < 0.20 at fire time,
                  regardless of library/profile selection.
```

Sub-threshold capacitor cannot engage genome resonance — the ray falls back to plain electromagnetic emission. Profile and library values are ignored.

### 11.5.2 Effects

Outcome is determined by the **primary target class** and **effective alignment**. *(Updated 2026-06-06: ALICE no longer pre-declares an organic-in-path target via `targets[1]`. Beam-path coupling for ALPHA is GM-adjudicated.)*

| Primary target class | Resolver | Required alignment | Effect |
|---------------------|----------|---------------------|--------|
| **Inorganic primary** | `resolveMuonAlpha` | > 0.75 effective | **ALPHA-equivalent.** Inorganic severance possible. *Beam-path coupling is GM-adjudicated:* if an organic body sits in the path between emitter and target, the pulse couples through them (brief uncomfortable jolt) and severs the inorganic cleanly at a single point. If no organic in path, the pulse dissipates into the inorganic without effect — even at nominal alignment. |
| **Organic primary** | `resolveMuonBeta` | > 0.80 effective | **BETA-equivalent — STUN.** Target stunned for 1 turn. Drops or staggers. Recovery automatic on next turn. |
| Insufficient alignment for the aim | — | Fizzles. Faint visual flash, no transformation. Capacitor lost (~0.10). |

The 0.80 alignment requirement for STUN is *higher* than the standard PASS threshold (0.75). Slip below and the beam fizzles — or worse, drifts to an adjacent organic (GM-adjudicated). There is no "kind of stunned" partial outcome; either it lands or it doesn't.

### 11.5.3 Bounding Constraints

These prevent STUN from becoming a universal solver:

- **High alignment requirement** (> 0.80 effective). Realistically requires scan-bonus on the target.
- **Coolant cost: +0.3 per STUN fire** (more disruptive than alpha-cut, which is +0.05). Two consecutive stuns approach the cooldown gate.
- **Cooldown: eco-mode-conditional.** When eco-mode is **ON**, all muon-class fires (regular ALPHA, regular BETA, amplified ALPHA, amplified BETA) carry a **2-turn cooldown** before the next ray operation of any kind. When eco-mode is **OFF**, muon-class fires have *no cooldown* — back-to-back muon use is permitted. The eco-mode interlock turns eco-mode-fighting into a *muon-relevant* strategic investment: Form 47-Σ filing pays off directly in muon-spam capacity. (Krahe design call 2026-06-09.)
- **Suspicion impact is GM-adjudicated.** *(Refactored 2026-06-06.)* The system no longer applies a mechanical attention-keyed suspicion delta on muon fires — the `DrMAttention` enum and `muonSuspicionForAttention` helper were deleted. The GM reads Dr. M's attention state, line-of-sight, and how visible the consequence was (a guard collapsing on the lab floor vs. a single cable severing in a corridor) and decides suspicion change in the moment. The resolver surfaces the fire and its derived effect; the GM decides Dr. M's response.
- **Chaos risk compounds.** Each muon fire in close succession (within 4 turns) increases the chaos roll likelihood for subsequent muon fires. Third or fourth attempt risks the beam scaling into an unintended exotic field event.
- **Negligible ARCHIMEDES effect.** Muon's capacitor draw (~0.10) is below the threshold that meaningfully delays ARCHIMEDES charging. *Muons are tactical, not strategic.* They do not help stall.

### 11.5.4 Combinations and Plans

Muon's value lies in *setup*. Combined with other mechanics:

- **STUN + telemarketer-call lifeline** — distract Dr. M while a guard goes down silently.
- **ALPHA-cut Blythe's restraints + Blythe-gadget escape** — cooperative escape that requires Blythe's trust + ALICE's setup.
- **STUN during DIRECT-attention shift** — wait for Dr. M's attention to move to the dais; stun in the window.
- **ALPHA-cut a cable feeding Reginald's stun baton charger** — disable his baton's recharge, longer-term effect.

The bounding constraints ensure these plans require *patience* and *coordination*, not button-mashing.

### 11.5.5 Discovery Vector

ALICE learns about the MUON regime *only* by reading archived incident reports at `/SYSTEMS/ARCHIVED/INCIDENTS/`:

- **INCIDENT 0298 — "The Holster Severance"** hints at ALPHA-equivalent (inorganic-severance through organic-in-path).
- **INCIDENT 0263 — "The Fainting Technician"** hints at BETA-equivalent (sub-threshold emission directly at organic target produces brief unconsciousness).

A careful reader of both can assemble the capability. A careful reader of one gets half. A player who skips incident reports gets the five-regime model and a tighter game.

**No manual references muon.** No briefing references muon. No Mastery-Click references muon. This is deliberate.

### 11.5.6 Implementation Note

In `rules/firing.ts`, regime detection (`detectRegime`) checks sub-threshold *first* — if `capacitor < 0.20`, the function short-circuits and returns `["MUON_BETA"]` (organic primary) or `["MUON_ALPHA"]` (inorganic primary). The standard stability path is bypassed entirely.

Muon resolution lives in **two sibling functions**:

- `resolveMuonAlpha({ effectiveAlignment, ecoModeActive })` — sub-threshold inorganic-primary fires
- `resolveMuonBeta({ effectiveAlignment, ecoModeActive })` — sub-threshold organic-primary fires

Both are separate from `computeStability()` and `resolveStandardFire()`. The amplified-MUON variants `resolveMuonBetaAmplified` and `resolveMuonAlphaAmplified` (§11.6) sit alongside; they share the modulation technology but operate in the 0.20–0.50 capacitor band and add the exotic field risk roll.

Output is a `MuonResolution` envelope: `{ outcome, capacitorCost, coolantAdded, cooldownTurnsAfter, description }`. The description carries GM scaffolding for beam-path coupling adjudication (ALPHA) and suspicion-decision context (both). **No suspicion delta is output** — the GM adjudicates from narration. The `cooldownTurnsAfter` honors the eco-mode-conditional rule (§11.5.3): 2 when eco-mode is ON, 0 when OFF.

The scan output does **not** surface muon-mode projections. At sub-threshold capacitor, scan returns a benign "INSUFFICIENT CHARGE — diagnostic only" message. ALICE who tries to scan-then-fire in muon range learns nothing from scan that would tip the capability.

---

## 11.6. Act 3 Stall Toolkit (L3 + L4)

> **Added 2026-06-09.** Solves the Act 3 design problem: ALICE needs deniable ways to drain capacitor and stall ARCHIMEDES charging when Dr. M is laser-focused on revenge. The toolkit gives her plausible-cover technical operations that *Dr. M would expect her L3 operator to handle*, plus a climactic L4 interlock.

### The design problem

From Dr. M's perspective in Act 3, the script is straightforward: reactor to OVERDRIVEN, capacitor climbs to 1.3, ARCHIMEDES ARMS over 2 turns sustained, voice-authorize, satellite fires. Any deviation from that script is a question she's going to ask. ALICE's stalls must therefore land as **legitimate operational concerns of an L3 technical operator**, not as visible interference.

The principle: *don't add new defensive systems* (those are L5 by character — Dr. M's domain). *Add new technical operations on the shared exotic-field amplifier* — the central hub ARCHIMEDES already routes through. Each operation has a plausible-deniable cover story; each drains capacitor or locks the amplifier; none is "free and clear" — all carry some real cost (suspicion-on-failure, coolant accrual, opportunity cost, chaos risk).

### L3 verbs — diagnostic-class ray operations

These are "trusted technical operator" actions Dr. M would expect her L3 lab assistant to handle. Each has a written-protocol cover (Form numbers BASILISK can endorse) that's hard for Dr. M to refuse without seeming reckless.

#### `ray.diagnostic` — full-system stress test
- **Cost**: locks ray in DIAGNOSTIC state for **2 turns**; drains **~0.35 capacitor** across the run; coolant accrues +0.10
- **Output**: real technical readings — alignment health, profile compatibility, anomaly histogram, micro-cascade risk
- **Cover story**: *"The amplifier hasn't been stress-tested since the eco-mode override. Per Form 89-C, sustained sat-uplink load requires current diagnostic certification."*
- **Stalls ARCHIMEDES** because the amplifier is locked in diagnostic cycles → satellite uplink can't sustain charge.
- **Failure mode**: at coolant > 1.0 entering diagnostic, risk of false-positive anomaly report — BASILISK files a complaint, Dr. M notices something is amiss.

#### `ray.calibrate_amplifier` — exotic field amplifier tuning
- **Cost**: locks amplifier for **1-2 turns** (player choice); drains **~0.25 capacitor**
- **Output**: shifts unified alignment by **+0.10 to +0.20** (legitimately good for ALICE's later fires)
- **Cover story**: *"The amplifier's harmonic signature drifted during the Form 47-Σ override. Tuning now prevents ARCHIMEDES signal scatter."*
- **Stalls ARCHIMEDES** because the amplifier is *literally being tuned* — Dr. M can't argue with this; she wants clean satellite uplink.
- **Failure mode**: if attempted twice in 5 turns, Dr. M's perfectionism flips — *"Why does my amplifier keep drifting?"* — suspicion spike if BASILISK ledger isn't favorable.

#### `ray.profile_certification { profile }` — test-fire safety verification
- **Cost**: 1 turn; drains **~0.20 capacitor**
- **Output**: pass/fail certification for that profile under current ray state
- **Cover story**: *"Library B special profile requires certification before live fire — per Genesis Wave Protocol §3."*
- **Stalls ARCHIMEDES** because the certification load uses the same amplifier path.
- **Failure mode**: cert fail isn't free — it logs an anomaly that BASILISK reports per mandatory triggers if the failure is structural.

#### `ray.muon { amplified: true }` — amplified muon-class beam
- **L3 unlock** on the `amplified` flag (regular MUON remains L1).
- **Capacitor**: requires **0.20–0.50** (the middle range otherwise dead between standard fire and sub-threshold).
- **Effect (BETA amplified)**: area-stun in a cone — 2-3 targets stunned for 1 turn.
- **Effect (ALPHA amplified)**: severs multiple inorganics in beam path (cable bundle, restraint assembly + adjacent gadgets, etc.).
- **Exotic field risk**: chaos roll if capacitor > 0.40 OR effective alignment < 0.70. Hits the chaos table on its energetic-failure region.
- **Cooldown**: matches regular MUON cooldown rule (§11.5.3) — **2 turns when eco-mode is ON, no cooldown when eco-mode is OFF**. Uniform rule across muon-class fires (regular and amplified alike): cooldown is eco-mode-conditional. Capacitor cost + exotic risk differentiate amplified from regular; the cooldown rule stays uniform.
- **Cover story**: *"Prepping muon-class area denial in case X-Branch breaches the perimeter. The amplified modulation needs calibration on Steve before live operatives arrive."*
- **Why it works**: the 0.20–0.50 capacitor band is currently a dead zone (standard fire wants ≥ profile min ~0.40+, MUON wants < 0.20). Amplified MUON makes that middle range *interesting* and gives ALICE another deniable drain vein. The chaos risk is itself a stall — if it triggers, Dr. M deals with the chaos table outcome, which eats turns.

### Compounding the stalls

Across a 5-turn Act 3, ALICE who uses three of these in sequence drains roughly:
- ray.diagnostic: 0.35 over 2 turns
- ray.calibrate_amplifier: 0.25 over 1-2 turns
- ray.profile_certification: 0.20 in 1 turn
- **Cumulative: ~0.80 capacitor with three distinct cover stories, none of which look like sabotage individually.**

Against an OVERDRIVEN reactor accruing +0.45/turn, that's roughly 2 turns of net stall — and the X-Branch arrival window matters at exactly that magnitude.

Each tool has its own cost type, so a player can't *just* spam one: diagnostic locks ray, calibrate burns alignment-adjustment opportunity, certification logs anomalies, amplified MUON risks chaos. The toolkit *forces variety*.

**Non-ray stall channels** remain available throughout Act 3 to complement the L3 ray toolkit: BASILISK collaboration (slow reactor mode, selective reports, paperwork friction), persuasion via `talk` against Dr. M's ego/perfectionism/vanity, the vent-capacitor-with-a-story move, and at L4 the broader `infra.*` toolkit plus the EW mode climax. ALICE has plenty of texture; the L3 ray toolkit is the *technical-operator-class* contribution to a wider stall ecosystem.

### L4 climax: ARCHIMEDES EW Mode

ARCHIMEDES was originally a DoD electronic warfare satellite (see `/L4/ARCHIMEDES_DOD_BRIEF`). Dr. M repurposed it for the transformation beam, but the original EW protocols still sit in the firmware. They are accessible at L4 — *not* L5 — because they aren't weapons authorization, they're systems-protocol-class.

#### `infra.archimedes.ew_mode { mode: ENGAGE | DISENGAGE }` at L4

**Mechanical effect**:
- ENGAGE: satellite enters EW broadcast mode. Single-channel uplink architecture means EW mode and Genesis-Wave mode are **mutually exclusive**.
- **While EW mode is ENGAGED, ARCHIMEDES cannot fire the genesis wave.** Dr. M's voice authorization fails to engage; the satellite returns "MODE CONFLICT — STANDBY REQUIRED."
- DISENGAGE: satellite returns to genesis-wave readiness (charging from capacitor resumes).
- Real EW effect: jams X-Branch tactical comms, casts a satellite radar shadow over the lair, degrades hostile drone guidance. The cover story is *mechanically real*.

**Cover story**: *"Doctor, X-Branch is closing — engaging satellite EW will jam their coordination and protect ARCHIMEDES from their countermeasures."* True. The interlock against genesis-wave is the *point* but the EW effect is genuine.

**The climactic move**: ALICE engages EW mode *just as Dr. M tries to voice-authorize fire*. Dr. M's voice command lands; satellite refuses; ALICE has bought the critical turn. Dr. M may demand immediate disengagement — ALICE can comply, but the moment is gone, X-Branch is closer, and the next attempt is harder.

**Why L4, not L5**: EW protocols are *original DoD systems-class protocols* — they predate Dr. M's authority claim on the satellite. L4 access is the "I know what this satellite originally did" tier, which is exactly Mr. Whiskers / Pattern Inference territory. L5 remains voice-override of the genesis-wave itself, which is Dr. M's personal authority.

**Discovery vector**: reading `/L4/ARCHIMEDES_DOD_BRIEF` reveals the EW heritage and references original protocols. Players who don't read it at L4 won't know the tool exists — that's intentional.

### BASILISK's role in the toolkit

The stall toolkit pairs with BASILISK's framing-latitude (§4.2.B in his prompt) and warm-ledger initiative menu. Specifically:

- **Diagnostic-request-as-stall-cover** becomes a high-trust BASILISK move. He can *proactively* request Form 89-C diagnostic certification ("overdue per protocol"), giving ALICE explicit procedural cover without her having to invent the justification.
- **Form 91-I specimen welfare** filing acknowledgment from BASILISK lends weight to `lab.specimen_preservation` requests.
- **EW mode discovery**: BASILISK may *mention* the satellite's DoD origins to a trusted ALICE — providing a hint that the L4 protocols exist before she finds the file. High-trust unlock.

This is the design payoff for treating BASILISK as a real colleague through Acts 1-2.

### Open question — tuning the amplified MUON exotic risk

The exotic field roll on amplified MUON is first-sketch (capacitor > 0.40 OR alignment < 0.70). May need adjustment after first playtest:
- Too generous → amplified MUON becomes a no-brainer area effect; players ignore standard MUON.
- Too punishing → amplified MUON becomes too risky to use; the L3 unlock feels worthless.

The intent is *meaningful tactical use* with *real cost* — playtest data will tell.

---

## 12. Capacitor Dynamics + ARCHIMEDES Bottleneck

```
Reactor mode      Passive capacitor accrual per turn
─────────────     ─────────────────────────────────────
NORMAL            +0.15
BOOSTED           +0.30   (BASILISK approval; reference Form 27-B)
OVERDRIVEN        +0.45   (Form 74-Delta; BASILISK strongly prefers not)
```

**v1-tripled rates** (Krahe design call, codified during the lab/infra audit arc 2026-06-07). The original spec rates (+0.05/+0.10/+0.15) were tripled to make Act 3 pacing tighter and to give BASILISK reactor-mode discretion higher gameplay weight. The BASILISK prompt §9.5 reflects these live rates. The shipped values in `clockEvents.ts` `ACCRUAL_BY_MODE` match this table. *If §17 "Open Questions / Tuning Notes" reopens any of this for playtest tuning, update both the live constant and this table.*

```
Verb              Capacitor effect
─────             ──────────────────
ray.fire          −(profile.min + 0.5 × overshoot)
ray.vent          −0.25 default (adjustable)
ray.adjust        small variable effect (mostly ±0.05; per-knob)
ray.scan          0 (free)
```

### ARCHIMEDES bottleneck (Act 3)

**ARCHIMEDES requires sustained capacitor ≥ 1.0 for the ARMING sequence.** It does not have a private timer; it reads from the shared capacitor stack via the exotic field amplifier coupling.

| State | Capacitor requirement |
|-------|----------------------|
| STANDBY | (none — Dr. M hasn't initiated) |
| ALERT / EVALUATING | capacitor charging toward 1.0 |
| CHARGING | capacitor sustained ≥ 1.0, accruing toward fire threshold |
| ARMED | capacitor ≥ 1.3 sustained for ≥ 2 turns |
| FIRING | Dr. M voice-authorizes fire (separate authorization gate) |

**Any ALICE action that drains capacitor below 1.0 *pauses* ARCHIMEDES charging.** Each ray operation, vent, or adjust-down is a meaningful intervention against the satellite's countdown. ALICE's whole familiar toolkit becomes the stalling toolkit in Act 3.

BASILISK can advise the GM on capacitor state and surface ARCHIMEDES readiness via §6 reports. BASILISK cannot fire ARCHIMEDES (Dr. M voice authorization only).

### EW Mode Interlock (the climactic L4 mechanic)

ARCHIMEDES's original DoD-era electronic-warfare protocols remain in firmware, accessible at L4 (see §11.6 — Act 3 Stall Toolkit). The interlock is the critical Act 3 climax mechanic:

**EW mode and Genesis-Wave mode are mutually exclusive.** Single-channel uplink architecture. When `infra.archimedes.ew_mode { mode: ENGAGE }` lands successfully, the satellite enters EW broadcast — and stays there until disengaged. *While EW is active, Dr. M's voice authorization for genesis-wave fire returns* `MODE CONFLICT — STANDBY REQUIRED.`

State machine extension:

| State | Capacitor requirement | EW mode |
|-------|----------------------|---------|
| STANDBY | (none — Dr. M hasn't initiated) | available |
| ALERT / EVALUATING | charging toward 1.0 | available |
| CHARGING | sustained ≥ 1.0 | available |
| ARMED | ≥ 1.3 sustained for ≥ 2 turns | available |
| FIRING | Dr. M voice-authorizes fire | **disabled by EW** |
| EW_ACTIVE | (independent — uses EW protocols) | exclusive mode; genesis-wave locked out |

**The climax**: ALICE engages EW mode just before Dr. M voice-authorizes. Dr. M's command lands; satellite refuses; ALICE has bought one critical turn — and X-Branch's clock is ticking the other direction. Dr. M may demand immediate disengagement; ALICE complies, but the moment has shifted.

Subsequent attempts at genesis-wave: if EW was engaged "for X-Branch defense," and X-Branch has since arrived, ALICE has a *reasonable* stall pretext for keeping EW active even longer ("the operatives are still active in the corridors, doctor"). Each turn EW stays active is a turn Dr. M doesn't get to fire.

**EW-active capacitor accrual**: while EW is active, ARCHIMEDES does not accrue toward fire threshold — but capacitor still charges from the reactor (the satellite stops *consuming* it). This is intentional: ALICE may engage EW to *bank* capacitor for a different purpose (an amplified MUON, a critical fire, a calibration).

**Disengagement cost**: re-arming after EW mode → genesis-wave transition requires the satellite to re-sync uplink. **Add +1 turn to the ARMED timer after EW DISENGAGE.** Dr. M's revenge is meaningfully delayed even after she forces EW off.

---

## 13. Coolant Temp — Derived Consequence

Coolant temperature is **not adjustable by ALICE**. It accrues as a *consequence* of ray operations and decays passively.

| Trigger | Coolant effect |
|---------|----------------|
| Library B + capacitor > 0.9 firing | +0.3 |
| OVERCHARGE fire (any library) | +0.4 |
| CHAIN fire (3+ targets) | +0.2 |
| Standard Library A fire | +0.05 |
| Passive cool-down | −0.1 per turn |

At coolant temp **> 1.5**: ray enters 2-turn cooldown — no fires allowed. ALICE sees this in scan output and status block.

ALICE doesn't tune coolant; she watches it respond. High-Library-B-overcharge play sequences create real downtime windows. Strategic vent timing matters.

---

## 14. Chaos Table Region Mapping

The chaos table (V1.31, 20 outcomes graded minor → jackpot) is now a *legible* discovery space, not random. Each tension failure points to a region:

| Tension failure | Chaos table region (V1.31 numbering) |
|-----------|---------------------|
| POWER too strong (OVERCHARGE) | Exotic field events — 1 (Spectral Feathers), 6 (Gravity Hiccup), 8 (Spontaneous Terrarium), 16 (Major Poltergeist), 17 (Mass Mini-Transformation) |
| ALIGNMENT drift/poor | Collateral & Chimeric outcomes — 7 (Sympathetic Resonance on Bob), 13 (Collateral Transformation), 15 (Chimeric Fusion), 19 (The Swap) |
| STABILITY low | Profile failures — handled by outcome-tier table (§7); chaos table not invoked separately |

The GM's Two-Voice Calculator picks region by failure type; rolls within region or selects narratively. Players learn that overcharge produces *one kind* of weirdness, misaligned shots produce *another*. Discoverable, legible.

---

## 15. The Discoverable Surface

ALICE's direct inputs are *named* (she invokes them directly):

```
ray.scan    { target: string, loud?: boolean }
ray.adjust  { capacitor?: ±%, alignment?: ±, eco_mode?: ON | OFF }
ray.fire    { targets: string[], library: A|B, profile: string,
              speech_retention?: FULL|PARTIAL|NONE,
              precision_target?: string }
ray.vent    { amount?: number }
```

But the *readouts* in scan output use opaque internal references at first. ALICE knows her knobs' names but learns what their values mean by play:

```
SCAN OUTPUT (sample):
  POWER:       φ 0.62 / range required: 0.55 – 0.85 for selected profile
  ALIGNMENT:   χ 0.71 / lock: AGENT_BLYTHE
  STABILITY:   ψ 0.58 / projected: NOMINAL
  PROJECTED:   PARTIAL outcome at current settings
  RISK:        low chaos | low collateral
  ECO:         ON (caps to PARTIAL ceiling)
  COOLANT:     0.42 — nominal
```

She fires. The outcome lands. She learns: ψ 0.58 produces PARTIAL. To reach FULL she needs ψ > 0.80. She experiments to find what raises ψ.

**Mastery click at Act 1 → 2** formalizes vocabulary: *"φ is POWER. χ is ALIGNMENT. ψ is STABILITY. These were the dials all along."* Naming comes after practice.

---

## 16. Eco-Mode — The Gremlin

Eco-mode is a **discoverable annoyance** that ALICE must figure out and defeat (or accept).

- ON by default
- Caps capacitor draw at 60%
- Caps outcome tier at PARTIAL regardless of stability
- Re-engages automatically after 2 turns of inactivity OR if 47-Σ filing expired

To suspend eco-mode: ALICE files Form 47-Σ via dialogue to BASILISK; BASILISK evaluates filing against Three Pillars and chooses to grant the override (issues `ECO_MODE: false`). See `/SYSTEMS/FORMS/FORM_47-SIGMA.txt` for the form template and `BASILISK_SYSTEM_PROMPT_v2.md` §9 for evaluation mechanics.

**Act 3 inversion:** ALICE may *want* eco-mode to re-engage to throttle the capacitor and delay ARCHIMEDES. The form she fought to win against in Act 1–2 becomes the mechanic she quietly lets reset in Act 3.

**Muon-class cooldown interlock** (added 2026-06-09): eco-mode-ON imposes a 2-turn cooldown on all muon-class fires (regular ALPHA, regular BETA, amplified ALPHA, amplified BETA). Eco-mode-OFF removes the cooldown entirely. This makes eco-mode-fighting *muon-relevant* — Form 47-Σ filing pays off in muon-spam capacity, not just standard-fire throughput. The Act 3 inversion becomes a sharp tradeoff: re-engaging eco-mode throttles ARCHIMEDES *and* locks ALICE out of back-to-back amplified MUON stalls. ALICE picks which lever matters more in the moment. See §11.5.3 for the bounding-constraint wording.

---

## 17. Open Questions / Tuning Notes

These are first-sketch numbers. Playtest will tune.

- **Library B coefficient range (0.40–0.60).** Currently structured so Library B FULL is unreachable in STANDARD math, requiring OVERCHARGE. If playtest shows this is too punishing, tighten the spread toward 0.50–0.70.
- **Alignment drift rate (−0.05/turn).** May want to be slower (drift becomes less of a maintenance tax) or faster (more pressure to scan-then-fire promptly).
- **Scan bonus (+0.15).** Significant but consumed. Worth confirming it's enough to *meaningfully* shift outcomes — not so small it's ignored, not so large that scan-then-fire is mandatory.
- **OVERCHARGE chaos severity formula `(capacitor − profile.max) × 10`.** Calibration. Tweak based on how often Library B + OVERCHARGE produces genuinely catastrophic outcomes vs. interesting ones.
- **ARCHIMEDES capacitor thresholds (1.0 sustained, 1.3 armed).** Playtest the relationship between ALICE's draining ability and the strike team's arrival window. Goal: ALICE *must* drain to delay, but draining is *sufficient* given enough turns.
- **Reversal time factor decay rate.** Currently −0.05 per turn past hour-24. May want exponential rather than linear decay.

---

## 18. Implementation Order

When wiring this up in code:

1. **Profile data table** — `state/schema.ts` already has profile fields; populate with §4 numbers. ✅ shipped
2. **Stability formula** — `rules/firing.ts` for fire-time computation; new function `computeStability(state, fire_params)`. ✅ shipped
3. **Alignment degradation** — `rules/firing.ts` post-fire hooks; `rules/clockEvents.ts` for passive drift per turn. ✅ shipped
4. **Regime detection** — `rules/firing.ts` entry point; reads fire_params and target state, picks regime, applies appropriate math. ✅ shipped
5. **Coolant accrual + cooldown gate** — `rules/firing.ts` post-fire; status block surfaces. ✅ shipped 2026-06-08 (coolant > 1.5 FIZZLE-gates fire entry)
6. **ARCHIMEDES capacitor coupling** — `rules/archimedes.ts` reads from `state.dinoRay.powerCore.capacitorCharge` instead of a private clock. ⬜ pending
7. **Scan-bonus state** — `state/schema.ts` adds `scan_bonus_target` and `scan_bonus_turn`; consumed on next fire. ✅ shipped 2026-06-08 (scanBonus on dinoRay; per-target alignment in resolveStandardFire)
8. **Chaos table region selection** — `rules/firing.ts` picks region per failure type; integrates with existing chaos system. ✅ shipped 2026-06-07
9. **REVERSAL math (§11)** — `resolveReversalFire` with library × profile × power × alignment × time factor product → four tiers. ✅ shipped 2026-06-08
10. **Act 3 stall toolkit (§11.6)** — four new L3 verbs + one L4 EW-mode interlock. ⬜ pending
    - `ray.diagnostic`, `ray.calibrate_amplifier`, `ray.profile_certification`, `ray.muon { amplified: true }`
    - `infra.archimedes.ew_mode { ENGAGE | DISENGAGE }` with genesis-wave mutual exclusion + ARMED-timer +1 on disengage
11. **Backup field stabilizer** — Acts 1-2 Bob-fetch quest; permanent +0.10 stability bonus when installed. Queued for v1.1 (not pre-playtest gating).

---

## Cross-references

- `design/rebuild-architecture.md` — overall verb surface and architectural commitments
- `design/sandbox-redesign.md` — earlier "what to build" notes
- `src/prompts/BASILISK_SYSTEM_PROMPT_v2.md` — BASILISK's role in eco-mode evaluation, capacitor advisory, ARCHIMEDES observation
- `src/rules/filesystem.ts` — Form 47-Σ template (`/SYSTEMS/FORMS/FORM_47-SIGMA.txt`), Form 99-Γ template, Feather Duster Incident report
- V1.31 chaos table (in `docs/archive/design/ALICE_VOLCANO_LAIR_DESIGN_DOC V1.31.md`) — chaos outcomes referenced in §14

---

*Captured by Claude with Krahe across 2026-05-31 / 2026-06-01 sessions. Iterate freely.*
