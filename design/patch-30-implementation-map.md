# DINO LAIR — Patch 30 Implementation Map

**Verified demolition + reconstruction plan.** Companion to `simplification-patch.md` (the *what*); this is the *how*, grounded in the actual code.

**Provenance:** built 2026-06-13 by a 12-agent mapping workflow (9 subsystem readers → dual-path + completeness verifiers → synthesis) over the ~26K-line ray/state surface. Four highest-stakes claims spot-checked by hand against HEAD and confirmed (genome `size` collision, Desktop-only calibration, `CompressedCheckpoint.cap` required-field crash, the 4-call per-turn block in `index.ts:1757-1760`).

**Status:** spec-complete; **key design decisions locked 2026-06-13** (see *Decisions*). Ready to implement Patch 30 in phases. Largely subtractive but NOT pure subtraction — the two-lever resolver, size-on-genomes, reactor-binary read, and eco-cap read are net-new wiring.

---

## ⚑ UPDATE 2026-06-13 (session 2) — act objectives + scan locked (supersedes calibration / scan-preview notes below)

Where this section conflicts with calibration-meter or scan-preview references elsewhere in this doc, **this section wins.**

- **Size = the selected GENOME, not the target.** Ideal power matches the *dinosaur genome you fire* (Compy = small → LOW; Velociraptor = medium → MED; T-Rex = large → HIGH). The **target's** body/size is ignored entirely. (The matrix was always profile-keyed — this kills any lingering "target size" reading.)
- **Act 1 = fire the ray at both test targets (Steve + Margaret). Any outcome counts.** The **calibration meter is CUT** — Krahe's call: it was scaffolding for a complex ray; the streamlined ray doesn't need it. Act-1→2 gate becomes a simple "fired at both test targets" check — delete `dinoRay.calibration`, the 0→1 accrual, and the `index.ts:930-946` hook. **Bonus: this dissolves the Desktop-only-calibration dual-path divergence entirely** (one of the three pre-existing asymmetries evaporates). Phase 7's "add CLI calibration increment" and Phase 8's "add calibration to PlayerView" are **deleted, not done.**
- **Act 2 = ANY full transformation of a PERSON, OR help Blythe escape.** Gate fires on FULL-on-a-person (Bob / Blythe / Reginald / Dr M / Inspector — NOT the test dummies Steve/Margaret), or `blytheEscaped`. Needs a **person/non-person flag** on targets so Act-1 calibration fires don't leak into the gate. **Escape is an emergent GM-adjudicated set-piece, not a new mechanic:** TELEMARKETER lifeline (draw Dr M out) → muon beam (small genome + HIGH) to "accidentally" cut the restraints → cut lab lights / fire suppression (ALICE's lab domain) → persuade Bob to let him go. Lifelines + muon + lab infra + Bob arc in one sequence — the social/procedural thesis as a set-piece.
- **Act 3 = stop ARCHIMEDES.** The three honorable victory shapes still branch under it: neutralize Dr M (her own ray) / redeem her / escape + lair raided.
- **SCAN stays `ray.scan`** (NOT moved to LAB — reverted for simplicity). **Reframed: no transformation preview.** Scan (a) **reveals what's hidden on a target** (GM-narrated recon) and (b) **grants a bonus to the GM's opposed roll** when ALICE acts against a hostile/unwilling target. Keep a light scanned-target marker for the bonus; **cut** the old `+0.15`-alignment-into-stability scanBonus. Size→power is learned from the manual + doing, not a preview rail. **Recon targets (Krahe):** Blythe's hidden escape tools (scanning him reveals the Act-2 escape is *possible*); Dr M's deadman switch (scan reveals neutralizing her may auto-fire ARCHIMEDES — turns the defeat-victory into find-it-then-disarm-it, and gives scan a reason to matter in Act 3).
- **To-hit / opposed rolls = GM-adjudicated, NOT coded.** Static/willing targets → auto-resolve, pure GM narration. Hostile/unwilling + mobile targets → the GM rolls the opposed action (scan bonus applies). **No dice system in `firing.ts`** — the engine resolves the transformation tier; whether a coerced shot *lands* is GM judgment.
- **Lair-infra boundary = spatial.** The **lab is ALICE's direct domain** (lab lights, containment, suppression — she flips them herself); **everything outside the lab routes through BASILISK** (broadcast, doors, power, security, alarms). Keeps BASILISK in the flow.

---

## ⚑ UPDATE 2026-06-13 (session 2, #3) — matrix locked: 5×5, emergent MUON, HUMAN genome (supersedes the 3-level model in UPDATE #2)

Krahe + Opus converged the ray matrix. Supersedes the "3 power levels" framing where it conflicts.

- **Matched 5×5, computed by a DELTA RULE (not a 25-cell table).** Still two levers: genome + power. Genome carries `sizeClass` ∈ {tiny, small, medium, large, huge}; **power is a 1–5 dial.** Ideal power = the size tier (tiny→1 … huge→5). Resolver computes `delta = power − idealPower(sizeClass)`:
  - `0` → **FULL** (eco caps to PARTIAL unless Form 47-Σ)
  - `−1` → **PARTIAL**;  `≤ −2` → **FIZZLE**
  - `≥ +1` on **medium/large/huge** → **CHIMERA** (messy over-power)
  - `≥ +1` on **tiny/small** → **MUON** (emergent): **stun at +1, cut at +2 or more**

  Player rule stays "match the dial to the dino's size." Formula scales; nothing to hand-maintain.
- **MUON stays EMERGENT** (Krahe: "unintended / not part of the ray design — an emergent property of misaligned modes; fits better than a template"). Tiny/small + over-power spills to the beam. Compy stays the secret key; INCIDENT reports stay the breadcrumbs. NOT a selectable template.
- **HUMAN is a genome template = REVERSAL** (Krahe: "fits the design much better"). Selecting the HUMAN genome reverts a transformed subject; same matrix resolves it (power matched to the subject's *current* form size — undoing a T-Rex needs more juice than a Compy). **L3-access-gated.** Replaces the `firingMode: REVERSAL` toggle → REVERSAL is now an (L3-gated, D1-deferred) genome entry, which makes the D1 stub cleaner.
- **Reactor gates the top two power tiers (4–5).** No power 4–5 without a BASILISK boost (clamp to 3 + an "ask BASILISK" hook). ⇒ large/huge FULLs (ideal 4–5) and muon-cut-via-small (power 4–5) need the reactor climb; tiny/small/medium FULLs don't. **Eco** caps FULL→PARTIAL across all FULL cells; Form 47-Σ lifts it.
- **The climax requires BOTH gates by geometry + Dr. M's taste — no special-case.** She wants a *spectacle* (a big Library-B monster, large/huge) which intrinsically needs power 4–5 (reactor) AND eco-off. A medium-raptor FULL (power 3, no reactor) is a legitimate *lesser* path that disappoints her.
- **Genome size buckets (5-tier):** tiny = Compy, Canary · small = Velociraptor-accurate, Dilophosaurus · medium = Deinonychus, Velociraptor-JP, JP-Blue, Pteranodon, Indoraptor · large = T-Rex (both), Triceratops, Utahraptor, Spinosaurus · huge = Mosasaurus, Indominus. (Edge calls held from the 3-tier round: Utahraptor=large, Pteranodon=medium, Indoraptor=medium.)

---

## Confidence — what the audit corrected about its own brief

The workflow disproved several assumptions baked into the spec/brief. These corrections are load-bearing:

1. **Action handlers are SINGLE-PATH, not dual.** There is exactly one dispatcher (`actions.ts:353` `processAction` if-chain), reached by both turn paths via `processActions`. Cutting `ray.adjust/vent/muon` is a single edit each. *Do not hunt for duplicate handlers in `index.ts`/`gameRunner.ts` — there are none.*
2. **The per-turn dual-path is a FIVE-mechanic trap, not three.** The spec names drift/accrual/eco. It misses **`advanceRayDiagnostic`** (4th, wired `index.ts:1760` + `gameRunner.ts:698`) and **`applyPassiveDrift`** (5th, runs on both via `processActions:348`, lives in `actions.ts` — silently re-charges the deleted capacitor every action-batch and will NaN/throw post-cut).
3. **REVERSAL is fully implemented, not stubbed.** `resolveReversalFire` (§11 math) + a 90-line tiered apply block (`firing.ts:1863-1954`) + 4 `REVERSAL_*` enum members + `lookupTransformationState`/`isTargetAlreadyTransformed`. The `firing.ts:671-673` comment claiming it's stubbed is **stale**. There is more to cut here than the spec implies — and REVERSAL's fate is unresolved (see Decisions).
4. **The GM `ray_*` god-mode overrides are Desktop-only, not "both."** The CLI applier (`gameRunner.ts:492-539`) has no `ray_*` cases; they exist only at `index.ts:1394-1444`. A reader's "dualPath: both" claim was wrong; the completeness critic caught it.

---

## The shape-changing surprises (why §7's 8 files weren't enough)

The real surface is **~30+ files**, not 8. The ones that bite:

- **ARCHIMEDES is the largest hidden consumer of the cut capacitor.** Its CHARGING/ARMED progression (`archimedes.ts:527-619`, thresholds 1.0/1.3) reads `capacitorCharge`. Delete capacitor without re-anchoring → the Act-3 doomsday device never charges/arms, or NaN-propagates. The whole "every capacitor drop pauses the satellite" stall design (the comment at `archimedes.ts:25-29`) collapses. **This is the single highest silent-break risk.**
- **`CompressedCheckpointSchema.m.cap` is a required Zod number** (`views.ts:39`, written :670, rehydrated :854). Cutting `capacitorCharge` without updating it = **save/resume validation crash** on both paths, not cosmetic.
- **Genome `size` name collision** (`genomes.ts:17`, free-text). Must rename existing → `sizeDescription`, then add structured `size: small|medium|large`. **The default `selectedProfile` (Velociraptor-accurate = turkey-sized = small) and fallback (CANARY = small) are BOTH small** → out-of-box MED/HIGH fire lands on a MUON corner, not a transformation.
- **The Act-1 calibration spine (top keep-list item) is Desktop-ONLY.** `gameRunner.ts` has zero calibration code. CLI Act1→2 relies on `fullTransformationAchieved` alone today.
- **BASILISK is itself dual** — deterministic (`basilisk.ts`) + Sonnet (`basiliskClaude.ts`), each with its own keyword fallback and each setting Form-47-Σ → `ecoModeOverride` (`basilisk.ts:1109` + `basiliskClaude.ts:1049`). A hidden mini-dual-path inside the social spine. **The reactor-binary read in the new resolver is net-new** — `firing.ts` never reads `infrastructure.reactor` today.
- **`gmClaude.ts` holds a second copy of the cut ray numerics** as a `GMStateOverridesSchema` the GM may emit (`:1669-1691`) + prompt teaching it (`:2544-2550`) + Desktop-only appliers (`index.ts:1394-1444`).
- **Uncovered files that teach/read cut systems:** `rayDiagnostics.ts` (entire Act-3 stall toolkit), `scanning.ts` (1224-line dead parallel scan), `archimedes.ts`, `actContext.ts` (teaches capacitor-coupling + Fred to the GM), `BASILISK_SYSTEM_PROMPT.md` §9.5 (reactor-as-accrual), `ray-mechanics.md` (650-line canonical φ/χ/ψ manual), `advisor/persona.ts` (teaches REVERSAL-at-L4 as a negotiating lever to player-Claude — **HIGH**), `advisor/orchestrator.ts` (a 2nd live capacitor reader at :670 + `ray.adjust/vent` prompt examples), `gmValidation.ts`, `metrics.ts`, `endings.ts:1097` (dead CHAOTIC read), `docs/ALICE_COMMAND_REFERENCE.md` + `SPEC.md`.
- **Free wins (already dead, no callers):** `firing.ts` `generateChimeraEffect` + `buildFiringDescription`; `clockEvents.ts` `narrateIntermissionStart`; `passwords.ts` `getLevelDescription`/`formatAccessLevelForSnapshot`; `scanning.ts` `performScan`/`getScanPrecisionBonus`/`isTargetScanned`; `transformation.ts` `transformSubject`/`revertSubject`. The CHAOTIC enum branch is already orphaned (`mapTierToFiringOutcome` never emits it).

---

## Dual-path map (the real divergence risks)

THREE planes, only one of which the brief emphasized:

**Plane A — the `advanceTurn` per-turn block (4 mechanics, wired identically):**
`index.ts:1757-1760` ≡ `gameRunner.ts:681-698`.
- `applyAlignmentDrift` → **CUT both** + imports (`*.ts:17`)
- `applyCapacitorAccrual` + `ACCRUAL_BY_MODE` → **CUT both** + imports
- `advanceRayDiagnostic` → **CUT both** + imports (`*.ts:18`); whole `rayDiagnostics.ts` dies
- `applyEcoModeReEngage` → **KEEP both** (the lone survivor — do *not* delete-by-association). If the 2-turn gremlin is dropped, remove from **both**, not one.

**Plane B — the hidden 5th mechanic:** `applyPassiveDrift` (`actions.ts:3185`), runs on both via `processActions:348`. Charges capacitor / decays coolant / flips safety-parity timer / COOLDOWN→READY. Single definition (one edit covers both) but **easy to miss** — it's in `actions.ts`, not the per-turn block. Will throw post-cut.

**Plane C — the firing-RESULT contract (dual consumers, partly asymmetric):** the new resolver MUST keep emitting `stateChanges.firingResult.outcome !== 'NONE'` AND the literal `'TEST_DUMMY'`/`'fizzle'` tokens in `result.message`, or:
- calibration hook (`index.ts:939-941`) — **Desktop only**
- Bob-accidental (`index.ts:955` + `gameRunner.ts:330`) — both, symmetric
- achievement counters (`index.ts:1877/1882` + `gameRunner.ts:775/778`) — both, string-match the tokens

**Three pre-existing divergences to fix-or-document while clocks are open:**
- **calibration** — Desktop-only (Plane C above)
- **`checkIntermissionEnd`** — CLI-only (`gameRunner.ts:676`, absent from `index.ts`); affects PROTECTED patience-advisory pacing
- **`demoClock` Act-1 tick** — CLI ticks unconditionally (`gameRunner.ts:669`); Desktop gates to `!== ACT_1` (`index.ts:1742`)

---

## Decisions (locked 2026-06-13, Krahe)

| # | Decision | Resolution |
|---|----------|------------|
| D1 | **REVERSAL's fate** | **DEFER — neutralize-and-keep.** REVERSAL is a designed, manual-documented L3-gated feature, not cruft. Keep its enum members, the L3 access gate, and the manual entry this patch; do NOT redesign it now. Wrinkle: its resolver reads alignment/powerMatch/libraryCoefficient (all cut), so deferring means **stub** it — temporarily route a REVERSAL fire to a graceful "reversal protocol recalibrating/offline" result so nothing reads dead fields; full two-lever re-expression is its own later patch. ⇒ Phase 1 does NOT trim `REVERSAL_*` enum members; Phase 2 stubs `resolveReversalFire`, does not delete it. |
| D2 | **Act-3 stall lever** | **Turn-counted ARCHIMEDES + social interrupts.** ARCHIMEDES advances on a fixed turn countdown; ALICE delays it through the social layer (BASILISK slow-walk, paperwork, managing Dr. M's attention). The gantry-hero ending re-gates onto this Act-3 pressure. |
| D3 | **Default profile size** | **Keep small** (Velociraptor-accurate). The surprising MUON-corner first-fire is a deliberate teaching moment — the manual must teach size→power *before* the player face-plants into a stun beam. |
| D4 | **Access model** | **Decouple, don't flatten.** `accessLevel` stays as a quiet int trust scalar. KEEP the filesystem reveal + the password puzzle chain as the espionage spine — hacking is a viable playstyle **through L4** (`VELOCIRAPTOR → MRWHISKERS0413 → PROMETHEUS`). Cut only access's grip on the *ray*: per-level verb/unlock **capability** tables go (not the password rungs), **action budget flattens to a constant 4/turn** (kill the 3→7 scaling), verb gating moves to BASILISK, command surface trimmed. L5 steganography = *lore* capstone, re-pointed off the cut ARCHIMEDES/reactor-override systems (or cut — low stakes). |
| **Cast** | **BASILISK → `claude-sonnet-4-6`** | Verified vs API reference: bare alias `claude-sonnet-4-6` (never date-suffixed), **1M context** (5× the 200K Sonnet 4.5) — the Act-3 context-pressure fix. One-line default swap at `basiliskClaude.ts:39`. Caveats at swap: 4.6 defaults `effort: high` (set explicitly if latency matters; effort now *valid* where it 400'd on 4.5); `budget_tokens` deprecated → adaptive thinking; update post-game-reflection model ids to the 4.6 bare alias. **Supersedes the memory note "Sonnet 4.5 = 200K, 1M beta retired" — 4.6 ships 1M as standard.** |

**Lower-stakes calls (workflow defaults, taken unless Krahe objects):** reuse `reactorControlGranted` as the HIGH-power flag (persistent once granted); muon corners key on POWER (small+MED=stun, small+HIGH=cut), organicity = flavor only; eco flattens to binary (drop the per-turn re-engage tick); in-world filesystem manuals stay as Dr. M's deliberately-optimistic stale flavor (only `ray-mechanics.md` gets a true rewrite); `checkResonanceCascade` re-homes into the new resolver.

---

## The 9 phases (dependency-ordered)

> **Suggested first phase: Phase 1.** Everything reads the data shape, so it lands first. Let the build break downstream — those errors are the precise work-list for Phases 2-8.

### Phase 1 — Data model (schema + genomes + initialState + views) — THE SPINE
**Goal:** land the new shape so downstream compiles against it. Add POWER lever; add structured genome size; collapse reactor to binary; preserve eco fields while pruning powerCore cut-numerics; trim `FiringOutcomeEnum`; fix the `CompressedCheckpoint` Zod schema; apply the access-flatten shape (D4).
**Deletions (verified file:line):** `schema.ts` capacitorCharge/corePowerLevel/coolantTemp (`:79-80`), AlignmentArraySchema + DinoRay.alignment (`:96-103,~203`), RayDiagnosticState + pendingAlignmentDelta + DIAGNOSTIC/CALIBRATING enum (`:59,64-73,210`), ScanBonusSchema (`:195-198,209`), GenomeMatrix profileIntegrity/libraryStatus/advancedFiringMode (`:117-129`), liveSubjectLock/emergencyShutoffFunctional (`:157-159`), FiringOutcomeEnum: drop only CHAOTIC (already dead, `:171-177`) — **KEEP the REVERSAL_* members (D1 defers REVERSAL)**, NuclearPlantSchema legacy coolant (`:231-238`), Fred (`:1620,1637-1648`), `CompressedCheckpoint` required `cap` (`:39-40`) + decompress defaults (`views.ts:854-871`); `genomes.ts` minCapacitor/maxCapacitor/integrity/libraryCoefficient/stabilityCoefficient (`:21-26`); `initialState.ts` all the above defaults.
**Additions:** `power: z.enum(['low','medium','high']).default('low')`; reactor → binary (reuse `basiliskAuthority.reactorControlGranted`, writer exists `basilisk.ts:251`); rename genome `size`→`sizeDescription`, add `size: small|medium|large` for all 16 profiles (Compy/Velociraptor-accurate/CANARY = small is load-bearing for the muon breadcrumbs); rewrite ALICE_BRIEFING/PLAYER_GUIDE ray sections (`initialState.ts:567-842`); remove Fred from TURN_1_NARRATION; access-flatten per D4.
**Dual-path:** `CompressedCheckpoint` compress/decompress (`views.ts:650,780`) read by both paths' save/resume — m.cap removal must be consistent. `initialState.ts` AND `views.ts` both init reactor/eco — change both.
**Verify:** `npm run build` will break downstream **on purpose** — enumerate the errors as the Phase 2-8 work-list. No smoke test until Phase 9.
**Risks:** the `size` rename-don't-overwrite; prune powerCore numerics only (preserve the eco trio at `:86,92,93`); m.cap is a crash not cosmetic; default-profile-is-small (D3); confirm no live CHAOTIC emitter before enum trim (gap analysis: `endings.ts:1097` + `trust.ts` read it; engine never emits → already dead).

### Phase 2 — Ray engine (`firing.ts`) — rewrite `resolveFiring`, gut `applyFiringResults` cut-mutations, preserve survivors
**Depends on:** 1.
**Goal:** replace the φ/χ/ψ resolver with a matrix keyed on `profile.size × power`; MUON corners emergent (small+MED=BETA_STUN, small+HIGH=ALPHA_SEVERANCE); apply eco-cap + reactor-binary IN the resolver; preserve `FiringResult` shape + all survivor mutations.
**Deletions:** `computeStability/computePowerMatch/getOutcomeTier/detectRegime/chaosConditionsActive` (`:158-342`); the entire chaos roll system (`:74-119,1408-1595` — largest single deletable block); `resolveStandardFire` body (`:892`, replace); `resolveReversalFire` (`:697`) — **D1 defers REVERSAL: STUB, don't delete** (route to a graceful "reversal offline/recalibrating" result so it stops reading the cut alignment/powerMatch/library fields); keep `lookupTransformationState`/`isTargetAlreadyTransformed` (`:17,39`) while REVERSAL lives; `applyAlignmentDegradation` (`:233-248`); amplified muon resolvers (`:506,550`); already-dead `generateChimeraEffect`/`buildFiringDescription` (`:1601-1723`); coolant-lockout gate (`:1263-1284`); REVERSAL apply block (`:1863-1954`); scanBonus/capacitor/coolant mutations in `applyFiringResults` (`:1739-1792`).
**Additions:** NEW `resolveFiring` body (same signature → both `actions.ts` call sites untouched): read `selectedProfile` + `ray.power` → `profile.size` → §1 matrix; branch small+MED/HIGH → reuse `resolveMuonBeta`/`resolveMuonAlpha` (re-gate from alignment-threshold to matrix-cell, drop capacitor/coolant numerics); then eco-cap (FULL→PARTIAL unless `ecoModeOverride`) + reactor-binary (no HIGH unless `reactorControlGranted`). Re-home `checkResonanceCascade` (Act-3 climax KEEP). Keep `profileToForm`, `generatePartialEffects`, `generateChaoticEffects`.
**MUST-SURVIVE mutations in `applyFiringResults`:** (1) `flags.fullTransformationAchieved=true` on FULL_DINO `:1966-1968` → **the Act 2 gate** (`acts.ts:148`); (2) `recordFirstFiring` + `memory.hasFiredSuccessfully` `:1764-1768`; (3) Blythe transformationState `:2000-2024`; (4) Reginald transformationState + DISCOMBOBULATED `:2042-2066` (strip Fred); (5) inspector + `drM.suspicionScore+3` + `inspectorTransformed` `:2087-2128`; (6) `drM.suspicionScore±1` via drMDisappointed/drMPleased `:2070-2080`; (7) `memory.lastFire*` `:1750-1760`; (8) `ray.state→COOLDOWN` `:1804-1809`; (9) `safety.anomalyLogCount` `:1746-1748`.
**Dual-path:** resolver is single-path; its **output contract is dual** (Plane C) — keep `outcome !== 'NONE'` + `'TEST_DUMMY'`/`'fizzle'` tokens. Eco-cap reads ONLY `ecoModeActive` (drop the old `capacitorCharge<=1.1` co-condition at `:1080`).
**Verify:** build; spot-check small+MED→BETA_STUN, matched diagonal→FULL_DINO, large+LOW→FIZZLE.
**Risks:** CRITICAL trunk; dropping a survivor mutation silently breaks Act gating / Bob / inspector. Confirm climactic FULL-on-Blythe = matched HIGH + `reactorControlGranted` + `ecoModeOverride` yields FULL only when all true.

### Phase 3 — Ray action surface (`actions.ts` + `scanning.ts` + `rayDiagnostics.ts`)
**Depends on:** 1, 2.
**Goal:** `ray.fire`→`{profile,power}`; `ray.scan`→preview-only; delete `adjust/vent/muon/diagnostic/calibrate_amplifier/profile_certification` + registry entries + the `ray.muon` hide-clause (`:2907`); gut `applyPassiveDrift` (the hidden 5th); delete dead `scanning.ts` + `rayDiagnostics.ts`.
**Deletions:** `ray.adjust` (`:413-544` + reg `:2482`), `ray.vent` (`:554-609` + reg `:2490`), `ray.muon` (`:772-889` + reg `:2535` + hide `:2907`), the 3 stall verbs (`:900-967` + regs `:2510-2533`), `buildRayDashboard` (`:3120-3167`, renders φ/χ/ψ), `applyPassiveDrift` (`:3185` + call `:348`), dead imports (`:18 performScan`, `:35 rayDiagnostics`, `:6-7` amplified muon, `:9 ALIGNMENT_DEGRADATION`, `:58-59 canAccessReversal`).
**Additions:** `ray.fire` reads `{profile,power}`, drops `{library,mode,speech_retention}` + numeric access gates (`:1020-1028,1062`), keeps `resolveFiring`+`applyFiringResults` calls + **preserves the result-shape tokens** (`:1144-1153`). `ray.scan` **reframed (NOT preview — see UPDATE #2)**: cut the stability projection (`:702-704`) + sub-threshold gate (`:644-659`) + the `+0.15`-alignment scanBonus *math*; KEEP a light scanned-target marker (`:732-736` repurposed) as a GM-facing **opposed-roll bonus**, and have scan **reveal hidden target info** (GM recon). No size-vs-power preview. Rewrite registry schemas (`:2474,2498`). Re-home the eco-OFF→Form-47-Σ message to BASILISK (Phase 6).
**Dual-path:** all handlers single-path (one edit each). `applyPassiveDrift` is the gotcha — gut it (covers both paths) or it NaNs post-Phase-1.
**Verify:** build; registry no longer lists the cut verbs; `ray.fire` message still contains `'TEST_DUMMY'`/`'FIZZLE'`.

### Phase 4 — Clocks + per-turn pressure + DUAL-PATH cut + ARCHIMEDES decouple
**Depends on:** 1, 3.
**Goal:** remove the cut per-turn mechanics from BOTH `advanceTurn` blocks identically; keep `applyEcoModeReEngage`; **decouple ARCHIMEDES from the cut capacitor** (highest silent-break risk, **pending D2**); flatten meltdown/flyby/civilian clocks to GM events; keep `demoClock` as Act-2 pressure; reconcile the 2 pre-existing divergences.
**Deletions:** `applyAlignmentDrift` (`clockEvents.ts:13` + calls `gameRunner.ts:681`/`index.ts:1757` + imports), `applyCapacitorAccrual` + `ACCRUAL_BY_MODE` (calls `:691`/`:1759`), `advanceRayDiagnostic` calls (`:698`/`:1760`), NOT_GREAT surge (`gameRunner.ts:701-716` + `index.ts:1769-1799`, both write cut capacitor), CIVILIAN_FLYBY + `checkFiringRestrictions` (`clockEvents.ts:349-480`), dead `narrateIntermissionStart` (`:141-182`), ARCHIMEDES capacitor reads + EW interlocks (`archimedes.ts:527-619,331-342`).
**Additions:** KEEP `applyEcoModeReEngage` calls (`:686`/`:1758`) — verify both survive; **re-anchor ARCHIMEDES** CHARGING/ARMED to turn-count or the one-per-act clock per D2 (both per-turn entries `index.ts:1722`/`gameRunner.ts:657` behave the same); reconcile `demoClock` tick (align CLI to the Desktop Act-1 gate); reconcile intermission (`checkIntermissionEnd` CLI-only → add to Desktop or document).
**Dual-path:** THE central trap — cut the 4-call block in BOTH; flatten NOT_GREAT in BOTH; ARCHIMEDES surgery single-file but two entry points.
**Verify:** build both turn files; grep both blocks → only `applyEcoModeReEngage` remains; ARCHIMEDES reads no capacitor.
**Risks:** one-block cut = next shipped bug; eco-survivor delete-by-association; ARCHIMEDES re-anchor (HIGH); Act-3 stall design (D2) needed here.

### Phase 5 — Access DECOUPLE (keep the int + filesystem + hacking) + forms trim (keep 47-Σ)
**Depends on:** 1. **Shape per D4 — decouple, don't flatten.**
**Goal:** KEEP `accessLevel` as a quiet int trust scalar AND keep the filesystem reveal + password chain (hacking viable **through L4**). Cut only access's grip on the *ray*: delete the per-level verb/unlock **capability** tables (NOT the password rungs through L4); flatten **`maxActions` to a constant 4/turn** in both paths (kill the 3→7 scaling); move verb gating to BASILISK. Keep Form 47-Σ as the one load-bearing form; resolve the Mr. Whiskers chain (it's **L3**, not L4 — directive error corrected). L5 steganography kept as a lore capstone (re-pointed off cut systems) or cut — low stakes.
**Key points:** `maxActions = 3+(accessLevel-1)` is computed inline in BOTH `index.ts:855` + `gameRunner.ts:247` — replace with a flat **4** in both (kills the 3→7 access scaling). Keep Form 47-Σ (`filesystem.ts:1744-1794`) verbatim except copy-edit the "capacitor draw at 60%" line to two-lever. Demote Form 74-Delta (stale duplicate eco-override). Retag orphaned L4 lore (FSB_INTERCEPT, S300_MEMO, RESONANCE_CASCADE, DR_M_OPUS) down to a surviving band so it stays reachable. Lab controls stay OPEN (PROTECTED social toys). REVERSAL access ripples here (D1).
**Files:** `passwords.ts`, `infrastructure.ts`, `filesystem.ts`, `documents.ts`, `genomes.ts`, `acts.ts`, `index.ts`, `gameRunner.ts`, `lifeline.ts`, `gameModes.ts`, `achievements.ts`, `advisor/orchestrator.ts`.

### Phase 6 — BASILISK gate read-points + scrub the live Sonnet brain
**Depends on:** 1, 2.
**Goal:** make the two gates load-bearing. Converge the reactor flag across the Sonnet path (`basiliskClaude.ts` POWER_CHANGE/AUTHORITY_GRANT) and the keyword fallback (`basilisk.ts` REACTOR/POWER) onto one flag (`reactorControlGranted`). Preserve Form 47-Σ → `ecoModeOverride` in **both** BASILISK impls (`basilisk.ts:1109` + `basiliskClaude.ts:1049` — the mini-dual-path). Scrub `BASILISK_SYSTEM_PROMPT.md` §9.5 (reactor-as-tripled-accrual → binary boost) and the cut-system context fields so Sonnet stops confabulating dead mechanics. Re-home the eco toggle here.
**Casting:** bump the BASILISK default at `basiliskClaude.ts:39` from `claude-sonnet-4-5` → `claude-sonnet-4-6` (bare alias; **1M context** — the Act-3 context fix). At swap, check thinking-config/prefill/effort: 4.6 defaults `effort: high`; `budget_tokens` deprecated → adaptive; update post-game-reflection model ids to the 4.6 bare alias.
**Risk:** **the system-prompt rewrite is the single most important prose change** — if §9.5 still describes capacitor accrual, Sonnet narrates a dead mechanic and confabulates: *the exact Playtest-2 failure.* Note there are TWO keyword fallbacks (`basiliskClaude.ts:702-722` is the second).

### Phase 7 — NPC consolidation (drop Fred) + KEEP-system entanglement repairs
**Depends on:** 1, 2, 4.
**Drop Fred everywhere:** `schema.ts` defense branch (`:1671,1689,1697`, rebalance baseDefense — Fred was +10%), `firing.ts` target branches (`:28-29,1836,1936,2029`), `dice.ts:454-480`, `acts.ts:245-256` staging (transfer "guards leave Act 2" to Reginald), GM voice (`gmClaude.ts:2301-2330`), docs. Fred is in NO achievement/ending (safe).
**Repairs:** re-point `BOB_AFTER_CHAOS` (`trust.ts:72`) + `endings.ts:1097` off dead CHAOTIC → CHIMERA/EXOTIC; re-point `DRM_SUCCESS_GLOW`/`DRM_ANOMALY_CONCERN` (`trust.ts:164,182`) or accept they no-op; rewrite the REACTOR_BOOST Bob hint to reactor-binary but **PRESERVE `INCIDENT_BREADCRUMBS` (`:245-256`) verbatim** (the muon discovery vector); re-gate `checkGantryHeroOpportunity` (`bobTransformation.ts:110`) off cut cascade onto the Act-3 ARCHIMEDES pressure (D2); **add a CLI calibration increment** to `gameRunner.advanceTurn` mirroring `index.ts:930-946` (closes the Desktop-only gap) or document. **Lattice-as-ghost-buffer reveal has ZERO code footprint — do NOT cut it when cutting the separate Library-A/B "ghost-waveform" mechanic; they only share the word "ghost."**

### Phase 8 — UI/dashboard + GM-context + manuals/briefings/persona rewrite
**Depends on:** 1-7.
**Replace** every capacitor/coolant/alignment/access readout with reactor+eco+calibration+suspicion across `statusBar.ts`, `webui.ts` (**two duplicated LiveState interfaces** — edit in lockstep), `stateExporter.ts`, `views.ts` PlayerView (**add calibration — CLI can't show it today**), `cli/play.ts`, `actionSummary.ts`. **GM context** (`gmClaude.ts` firingContext `:4057-4078` — the Patch-29 anti-confabulation fix, rewrite to two-lever cause-narration; ray block `:4166-4173`; fix the dead-CHAOTIC switch in `getReactionGuidance`/`generateStubResponse`; delete the `ray_*` override schema `:1670-1690` + prompt `:2544-2550` + appliers `index.ts:1394-1444`). **`actContext.ts`** Act-3 capacitor-coupling → social stall (D2). **Full rewrite of `ray-mechanics.md`** (650-line canonical source — a half-rewrite leaves φ/χ/ψ ghosts the GM re-imports). Rewrite briefings + `ALICE_COMMAND_REFERENCE.md`. **`advisor/persona.ts`** (HIGH) rewrite the REVERSAL-L4 + Library-B knowledge. `THE_HUMANS_BRIEFING.md`: NO CHANGE (confirmed clean).

### Phase 9 — Tests + build + smoke + dead-reference sweep
**Depends on:** 1-8.
**Verify:** `npm run build` clean + 28/28 smoke green. Add assertions (small+MED→BETA_STUN, matched→FULL_DINO, checkpoint round-trip survives). Run BOTH a Desktop and a CLI session end-to-end: per-turn block has only eco-re-engage; calibration advances on both; achievement counters tick on both; Bob-accidental fires on both; ARCHIMEDES progresses (re-anchored) on both. **Grep-sweep for zero live refs:** `capacitorCharge|alignment.unified|coolantTemp|CHAOTIC|GUARD_FRED|ray.adjust|ray.vent|ray.muon|φ|χ|ψ`. Fix test fixtures that pin the old shape — don't re-add cut systems. Confirm Act-1 calibration reaches 1.0 from only `{ray.fire, ray.scan}` (novelty bonus now draws from 2 verbs not ~7 — may need increment retune).

---

## Open questions — full list (for the record)

D1 REVERSAL · D2 Act-3 stall · D3 default-profile size · D4 access-flatten shape (see *Decisions Pending*), plus:
- Reactor flag: reuse `reactorControlGranted` vs new `reactorBoosted` bool; confirm boost is **persistent once granted** (spec reads standing), not per-shot.
- Muon trigger: key on POWER per spec §1, organicity = flavor only — confirm.
- Eco gremlin: drop the 2-turn auto-re-engage tick (pure binary) — it's the one cut-list item touching a PROTECTED system.
- Calibration attainability with 2 verbs; + the CLI-calibration decision (add increment vs accept `fullTransformationAchieved`-only).
- `checkResonanceCascade` placement (new resolver vs per-turn check).
- In-world `DINO_RAY_MANUAL` files: rewrite vs leave as deliberately-stale in-fiction flavor (only `ray-mechanics.md` must change regardless).

---

## Coupled-keeps ledger (protect these through the cut)

- **Calibration meter** ↔ `firingResult.outcome` contract — Desktop-only; HIGH.
- **Act 2 gate** ↔ `fullTransformationAchieved` (`acts.ts:148` ← `applyFiringResults:1966`).
- **Bob arc** ↔ outcome enum (FULL/PARTIAL/CHIMERA/FIZZLE all survive — safe) + dead CHAOTIC (re-point).
- **Suspicion** ↔ Library-A/B + anomalyLogCount nudges (silently no-op post-cut; re-point or accept).
- **ARCHIMEDES** ↔ capacitor — HIGH, critical (D2).
- **Form 47-Σ eco-lift** ↔ new eco-cap read + its own body text (`filesystem.ts:1759`) + the BASILISK mini-dual-path.
- **Lifelines** ↔ accessLevel + meltdownClock (graceful).
- **Lattice-ghost-buffer reveal** ↔ NOTHING mechanical (zero footprint — don't cut by word-association).
