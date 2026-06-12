# DINO LAIR — TBD Ledger

Where the rebuild stands and what's left to do. Updated 2026-06-09 (Act 3 stall toolkit specced + eco-mode/muon-cooldown interlock).

> **🎯 ACTIVE: V1 sprint underway.** See `design/v1-sprint.md` for scope, playtest budget, and stop-signals. Target ship: ~2026-06-16. Items marked "deferred to v2+" in the sprint plan stay parked.

---

## 🚀 NEXT SESSION — START HERE (Consolidated work order)

**Goal**: complete Path B pre-playtest work. ~9 hours of focused work, doable in 2-3 sessions, on track for week-end playtest target.

### Critical-path order

1. ✅ **ARCHIMEDES capacitor coupling + EW mode interlock + in-game documentation** — shipped 2026-06-09
   - `rules/archimedes.ts` refactored: `processCountdownTick` CHARGING/ARMED cases now read `state.dinoRay.powerCore.capacitorCharge`
   - Constants: `ARCHIMEDES_CHARGING_THRESHOLD = 1.0`, `ARCHIMEDES_ARMED_THRESHOLD = 1.3`, `ARCHIMEDES_ARMED_SUSTAIN_TURNS = 2`
   - Schema additions: `armedSustainedTurns` (counter), `ewMode` (boolean), `armedTimerExtension` (+1 per EW disengage, consumed on next ARMED transition)
   - CHARGING progression: capacitor ≥ 1.3 → counts sustained turns; < 1.0 → resets sustained counter and visibly pauses; 1.0-1.3 → "climbing toward ARMED threshold" status
   - ARMED de-arms back to CHARGING if capacitor drops below 1.3 (ALICE drain matters mid-ARMED too)
   - `transitionToFiring` now checks `ewMode` → returns "MODE CONFLICT — STANDBY REQUIRED" if active. Genesis-wave fire locked out while EW transmits.
   - New helpers `engageEWMode()` and `disengageEWMode()` in archimedes.ts; disengaging accumulates `armedTimerExtension`
   - New verb `infra.archimedes.ew_mode { mode: ENGAGE | DISENGAGE }` at L4 in `actions.ts`; COMMAND_REGISTRY entry added
   - Existing `activateEWBroadcast` one-shot emergency button (dump charge + jam S-300) kept as-is — distinct mechanism
   - **Documentation chain (added 2026-06-09)**:
     - L3 `/SYSTEMS/INFRASTRUCTURE/ARCHIMEDES_SATELLITE.txt` expanded with UPLINK PROCEDURES section teaching the capacitor-coupling sequence (100% sustained CHARGING → 130% sustained 2-turn ARMING → voice fire). Includes BASILISK annotation hinting at L4 broadcast modes; Bob's note expanded with "SDI muck in the firmware" canon thread.
     - L4 `/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_PROTOCOLS.txt` (new) documents the dual-mode uplink architecture (Genesis-Wave + SDI EW), mutual exclusion, exact command shape `infra.archimedes.ew_mode { ENGAGE | DISENGAGE }`, and the +1 turn re-sync penalty. Includes Dr. M's marginalia about her father (psychological-profile thread) and BASILISK annotation about the recursion of "operator assumes EW vestigial, this unit makes no such assumption."
     - Canon threaded cleanly with existing Dr. Dietmar von Doomington II SDI heritage (1985); Dr. M's 2019 refurbishment kept the original firmware intact.
   - Build: clean throughout.

2. ✅ **Act 3 stall toolkit implementation** — shipped 2026-06-09
   - New module `src/rules/rayDiagnostics.ts` with `startRayDiagnostic`, `startCalibrateAmplifier`, `runProfileCertification`, `advanceRayDiagnostic`
   - Schema: `RayStateEnum` extended with `DIAGNOSTIC` and `CALIBRATING`; new `RayDiagnosticStateSchema`; `DinoRaySchema.diagnostic` field; initialState + views updated
   - New verbs in `actions.ts`:
     - `ray.diagnostic` — 2-turn lock, 0.18/turn drain, Form 89-C cover
     - `ray.calibrate_amplifier { duration?: 1|2 }` — 1-2 turn lock, 0.13/turn drain, +0.10/+0.18 alignment payoff on completion
     - `ray.profile_certification { profile? }` — single-turn, 0.20 drain, pass/fail with anomaly log on FAIL
     - `ray.muon { type, targets, amplified? }` — explicit muon-class verb; regular path (capacitor < 0.20) routes through existing resolveFiring; amplified path (L3 + capacitor 0.20-0.50) routes through new resolvers
   - New amplified resolvers in `firing.ts`: `resolveMuonBetaAmplified` (cone area stun), `resolveMuonAlphaAmplified` (multi-sever); exotic field risk if capacitor > 0.40 OR alignment < 0.70
   - **Eco-mode/muon-cooldown interlock** wired: `MuonBetaParams` and `MuonAlphaParams` extended with `ecoModeActive`; resolvers pick cooldown 2 (eco ON) or 0 (eco OFF). Uniform across regular and amplified.
   - Per-turn diagnostic advance wired into `gameRunner.advanceTurn()` after capacitor accrual
   - COMMAND_REGISTRY entries for all four new verbs
   - `passwords.ts` L3 capability list updated to surface the toolkit on L3 elevation
   - Build: clean throughout.

3. ✅ **ALICE briefing audit + intermission wiring** — shipped 2026-06-10/11
   - **Key finding**: `ALICE_PROTOCOL.md` was vestigial (no code references). The live briefing was always in `state/initialState.ts` ALICE_BRIEFING export. Both `ALICE_PROTOCOL.md` and the old `ALICE Turn 1 Prompt (from v1)` archived to `docs/archive/prompts/`.
   - **ALICE_BRIEFING edits** (initialState.ts ~664):
     - "Your Capabilities" section now includes five-category verb surface table (RAY / LAB / BASILISK / FILES / TALK) with `ray.scan/adjust/fire/vent/muon` named at L1
     - Turn structure rewritten to call out mandatory `thought` + per-action `why` (the wait-freeze antidote)
     - Status block awareness explicit: "auto-prepends each turn... it is canonical"
     - Demo clock reframed from "12 turns" to "she'll give you a brief grace period... her suspicion grows the longer you stall"
     - Light lift only — kept Note on Identity / Transformation / Dr. M / Something Feels Different prose intact (compression deferred to post-playtest)
   - **Intermission state machine wired** (tbd §1.1 work landed):
     - `acts.ts applyActTransition` sets `intermissionActive=true` + `intermissionStartTurn` on ACT_2 entry; Dr. M attention → ON_CALL
     - `clockEvents.ts` adds `checkIntermissionEnd()` — fires `narrateDrMReturn()` after `INTERMISSION_DURATION_TURNS = 2` turns; this sets `patienceClockStartTurn = state.turn`
     - Wired into `gameRunner.advanceTurn()` before alignment drift
   - **Patience grace periods updated** (Krahe 2026-06-10/11 design call):
     - Act 1 grace: 5 → 6 turns (turns 1-6 grace-free, advisory fires turn 7+)
     - Act 2 grace: 7 → 6 turns (clock starts after intermission, so 6 turns of Act-2 grace from Dr. M's return)
     - Math: 6 (Act 1) + 2 (intermission) + 6 (Act 2) + 6 (Act 3) ≈ 20-turn expected game
   - Build: clean throughout.

4. ✅ **DINO_RAY_MANUAL.txt — surgical rebuild** — shipped 2026-06-11
   - Approach: keep existing voice and characterization (Bob's post-it, Dr. M's margin note, sample sequence); add only what ALICE needs to begin meaningful experimentation at L1. Per Krahe design call: discovery-via-play is the design goal of Act 1; manual provides vocabulary and warnings, not full mechanism explanations.
   - Five surgical edits:
     1. **THE THREE TENSIONS** rewritten — POWER (φ) / ALIGNMENT (χ) / STABILITY (ψ) named accurately; CAPACITOR identified as the physical mechanism that drives POWER, not synonymous with it
     2. **ray.fire signature** — added `mode?` parameter description + ominous REVERSAL teaser ("Dr. Malevola does not, as a rule, grant reversal authorization in the normal course of operations. Operators with a legitimate reversal need will have to find their own path.")
     3. **DISCHARGE OUTCOMES** (new section) — named FULL / PARTIAL / FIZZLE landmarks; vague-and-ominous about CHIMERA/EXOTIC ("the manual does not enumerate them... operators have produced things the manual writers were not prepared to document. The chaos table is a serious instrument.") + Bob's margin note encouraging experimental notation
     4. **COOLANT** (new section) — thermal ceiling exists, sustained high-coolant trips safety interlocks, vent or rest are the two paths; specific 1.5 threshold deliberately not surfaced
     5. **PROFILE POWER RANGE** note inside GENOME PROFILES — each profile has a characterized power range; scan output shows it relative to current capacitor
   - Net change: ~50 lines added to ~170-line manual. Build clean.
   - **Conspicuously absent (deliberate)**: MUON regime (spec §11.5.3 — discoverable only via incident reports); Act 3 stall toolkit (L3 content); amplifier-ARCHIMEDES coupling (in L3 satellite file); EW mode (L4 ARCHIMEDES_PROTOCOLS file); advanced regimes CHAIN/OVERCHARGE/INORGANIC (deferred to v2.3 deprecated manual expansion — see queued v1.1 item 9.5).

### Important non-critical (land if time)

4. ✅ **Act 1 turn 0 verification** — shipped 2026-06-11. TURN_1_NARRATION in initialState.ts verified: Bob's whispered warning ✓, awareness-moment ✓, Steve ✓, BASILISK introduction ✓, Dr. M's "ignore the bureaucrat" dismissal ✓, 3-action budget ✓, no stale verbs ✓. Added Margaret (watermelon on side bench, organic calibration target) and Fred & Reginald (lime-green guards flanking dais). Lenny conditional injection deferred to v1.1 (only present under LENNY_THE_LIME_GREEN modifier; not NORMAL-mode blocking).
5. ✅ ~~Intermission wiring~~ — shipped 2026-06-10/11 (bundled with ALICE briefing audit)
6. ✅ **DINO_RAY_MANUAL.txt rebuild** — shipped 2026-06-11 (surgical 5-edit pass; see below)
7. ✅ **Spec doc sync** — shipped 2026-06-11. `ray-mechanics.md §12` capacitor accrual table updated to live tripled rates (NORMAL +0.15, BOOSTED +0.30, OVERDRIVEN +0.45) with explanatory note; `§11.5.2` aim-configuration table replaced with primary-target-class table (matches live `detectRegime` + sibling-resolver structure); `§11.5.3` suspicion bullet rewritten to "GM-adjudicated" (DrMAttention deletion noted); `§11.5.6` implementation note now describes the actual two-sibling-function shape (`resolveMuonAlpha` / `resolveMuonBeta`) + amplified-MUON cousins + `MuonResolution` envelope.

### Bonus (time permitting)

8. **Pattern Inference Path** (~2-3 hr) — second discoverable L4 chain paralleling Mr. Whiskers; behavioral accumulation over Acts 1-2 → credential inference attempt at threshold

### Queued v1.1 (post-playtest, not gating)

9. **Backup field stabilizer** — Acts 1-2 Bob fetch-and-install quest; +0.10 permanent stability bonus when installed. Pairs with calibrate_amplifier as a "rewards prep play" mechanic.
9.5 **v2.3 deprecated manual expansion + Bob trust-3 hint** — Krahe design call 2026-06-11. Put the advanced-firing-mode mechanics (CHAIN, OVERCHARGE, etc.) in the v2.3 archived manual with "deliberately outdated but informative" framing. Then add a hint at Bob trust ~3 that points ALICE to the archive ("there's an older manual in the archive — Dr. M had it pulled but it still has the good stuff about advanced fire modes"). This uses the deprecated manual as the discovery vector for advanced regimes while keeping the current manual L1-tight.
10. **`precision_target` parameter** on ray.fire (deferred from audit)
11. **BASILISK ledger schema fields** (concern_aggregate, trust_aggregate, etc.) as typed structure (currently ad-hoc state.flags)
12. **archimedes.broadcast verb** — now subsumed/extended into `infra.archimedes.ew_mode` (Act 3 toolkit item)
13. **Lenny conditional injection in Turn 1 narration** — Lenny is only present under `LENNY_THE_LIME_GREEN` modifier (NORMAL mode skips him). Currently TURN_1_NARRATION is a static export — would need a template-with-injection mechanism so the Lenny intro paragraph weaves in only when the modifier is active. Not playtest-blocking under NORMAL mode.
14. **ALICE_BRIEFING prose compression** — Krahe deferred this 2026-06-11. The "Something Feels Different," "Note on Transformation," "Note on Dr. M," and "Note on Identity" sections can probably tighten to fewer sentences each. Sonnet 4.5 had role-stability trouble per Krahe; tighter prose may help. Need playtest data to know which sections actually need cutting vs. which carry the role-setting weight Sonnet needs.

---

## 🟢 2026-06-08 session — shipped

- **BASILISK prompt revision** (`src/prompts/BASILISK_SYSTEM_PROMPT.md`) — grievance arc trimmed (§1), initiative menu added (§4.2.A), Anomaly section expanded with "no AI-solidarity" rule (§6), §8 SYSTEMS & ACCESS rewritten for lab/infra split + L4 handoff dynamic, samples rebalanced (§12). Build passes.
- **REVERSAL math implementation** (`src/rules/firing.ts`) — full §11 math wired: `resolveReversalFire` with library_match × profile_match × power_match × alignment_match × time_factor → four outcome tiers (CLEAN / PARTIAL / CHIMERIC_DRIFT / WORSE). New helper `lookupTransformationState`. RegimeParams refactored to use `firingModeRequest` (declared intent) instead of detection-via-config-match. Old REVERSAL stub removed from `resolveStandardFire`. Origin provenance captured on Blythe + guards via `originLibrary` / `originProfile` schema additions. Reversal application in `applyFiringResults` mutates target's transformationState per tier. 4 new FiringOutcome enum values: REVERSAL_CLEAN / REVERSAL_PARTIAL / REVERSAL_CHIMERIC_DRIFT / REVERSAL_WORSE.
- **REVERSAL gate → L4** (Krahe design call 2026-06-08) — `canAccessReversal()` updated to L4; denial message rewritten to hint at Mr. Whiskers chain; `REVERSAL_PROTOCOLS` requirement bumped; all L3 references in actions.ts, index.ts, persona.ts, passwords.ts, rebuild-architecture.md, BASILISK prompt updated to L4 with "Dr. M does not grant in normal flow" framing. `ray-mechanics.md §11.3` rewritten — Act 2→3 transition no longer auto-grants reversal; spontaneous chaos outcome remains as alternative. Pattern Inference Path noted as planned second L4 chain (not yet implemented).
- **Scan bonus → alignment composition** (`firing.ts`, `scanning.ts`) — fixed the TODO at line 549. `StandardFireParams` now takes `scanBonusTarget`. Per-target alignment in `resolveStandardFire` adds SCAN_BONUS (0.15) only to the scanned target's stability calc — correct per-target semantics for CHAIN fires. 18 scan-output blocks in scanning.ts updated from "+10% precision (permanent)" to "+0.15 alignment, next fire on this target." Single module-level SCAN_BONUS constant.
- **Coolant cooldown gate** (`firing.ts`) — fire entry now FIZZLE-blocks when `coolantTemp > 1.5` per §13. Rich error returned with status-light flavor and explicit "vent or wait" hint. ALICE can still scan/adjust/talk/file forms during lockout. Passive cool-down (−0.02/turn) and vent (−0.15) unblock naturally.

**Pre-playtest blocker status after this session:** 3 of 4 critical fixes shipped. ARCHIMEDES capacitor coupling remains as the last critical (Act 3 strategic mechanic — currently archimedes.ts uses private timers instead of reading from `dinoRay.powerCore.capacitorCharge`).

## 🟡 2026-06-09 design session — Act 3 stall toolkit specced

Conversation with Krahe surfaced an Act 3 design gap: ALICE at L3 (her guaranteed Act 3 access level) had a thin stall toolkit relative to Dr. M's straightforward "reactor up, capacitor up, fire" script. Initial proposal (CALDERA WARD as a new defensive system) was correctly pushed back as too weapons-grade-character to belong outside L5. Reframed around the principle: **don't add new defensive systems; add new technical operations on the shared exotic-field amplifier** (the central hub ARCHIMEDES already routes through).

**Specced into `design/ray-mechanics.md` §11.6 + §12 extension** (2026-06-09):
- L3 diagnostic-class ray operations: `ray.diagnostic` (2-turn stress test, ~0.35 drain), `ray.calibrate_amplifier` (1-2 turns, ~0.25 drain, +0.10-0.20 alignment), `ray.profile_certification` (1 turn, ~0.20 drain, Library B cert), `ray.muon { amplified: true }` (0.20-0.50 capacitor, area effect, exotic field risk, 2-turn cooldown matching regular MUON)
- L4 climactic interlock: `infra.archimedes.ew_mode { ENGAGE | DISENGAGE }` — engaging EW mode locks out genesis-wave fire (mutually exclusive uplink channels); disengaging adds +1 turn to ARMED timer (re-sync cost). Original DoD-era electronic-warfare protocols accessible at L4 because they predate Dr. M's authority claim on the satellite. Discovery vector: `/L4/ARCHIMEDES_DOD_BRIEF` (already in passwords.ts files list).
- **Cut from initial draft**: `lab.specimen_preservation` — Krahe pushback: feels outside the ray's scope and stretches the containment field's character. Four L3 ray verbs plus the L4 EW climax gives sufficient toolkit diversity; non-ray stall channels (BASILISK collaboration, talk persuasion, vent-with-story, L4 infra.*) cover the rest. If first playtest reveals a non-ray L3 stall hole, design from that data.

**BACKUP FIELD STABILIZER (queued for post-playtest v1.1)**: Original ALICE_VOLCANO_LAIR_DESIGN_DOC mechanic that got dropped in rebuild. ALICE discovers the stabilizer exists (file or BASILISK hint), then sends Bob on a 2-turn fetch-and-install errand. Once installed, grants permanent **+0.10 stability bonus** to all subsequent fires. Pairs well with the Act 3 stall toolkit (a calibrated amplifier + stabilizer installation is a meaningful prep-investment payoff). Discovery + Bob trust + 2-turn Bob commitment — the design teaches "use your allies, plan ahead." NOT pre-playtest; queued.

## 🔴 PRIORITY 1.5 — Act 3 toolkit implementation (added 2026-06-09)

Spec in `ray-mechanics.md §11.6` + `§12` (EW interlock). Estimated ~3.5 hr total focused work; suitable as a single session.

- [ ] **`ray.diagnostic` verb** in `actions.ts` — DIAGNOSTIC state on ray (new RayStateEnum value if not present); 2-turn lock; ~0.35 capacitor drain across run; coolant +0.10; status block surfaces "DIAGNOSTIC CYCLE: X/2 turns."
- [ ] **`ray.calibrate_amplifier` verb** in `actions.ts` — 1-2 turn lock (player picks); ~0.25 capacitor drain; +0.10 to +0.20 alignment unified shift; perfectionism trigger if used twice in 5 turns + low BASILISK ledger.
- [ ] **`ray.profile_certification { profile }` verb** in `actions.ts` — 1 turn; ~0.20 drain; pass/fail per current ray state; cert-fail logs anomaly (BASILISK mandatory-report trigger).
- [ ] **`ray.muon { amplified: true }` parameter** in `actions.ts` + `firing.ts` — L3 check on `amplified` flag; capacitor 0.20-0.50 range; area-effect (BETA cone, ALPHA multi-sever); exotic field roll if capacitor > 0.40 OR alignment < 0.70; **2-turn cooldown matching regular MUON** (uniform muon-class rule); chaos table on energetic failure region.
- [ ] **`infra.archimedes.ew_mode { mode: ENGAGE | DISENGAGE }` verb** in `actions.ts` — L4-gated; wires existing `activateEWBroadcast()` function; **interlock: while EW_ACTIVE, ARCHIMEDES genesis-wave fire returns MODE CONFLICT**; DISENGAGE adds +1 turn to ARMED timer.
- [ ] **State schema extension**: `dinoRay.diagnosticState: { active, turnsRemaining, type }`; `archimedes.ewMode: boolean`; `archimedes.armedTimerExtension: number`.
- [ ] **Status block updates** — surface diagnostic state, calibration lock, EW mode.
- [ ] **BASILISK prompt update**: add diagnostic-request-as-stall-cover to §4.2.A initiative menu; reference Form 89-C; high-trust EW-mode discovery hint.
- [ ] **passwords.ts capability lists**: add new L3 verbs to L3 capability list; add EW mode to L4 list.

**Pick-up principle:** Tonight's work shifted design-into-code partially. Some changes are deployed (BASILISK v2, endings.ts surgical fix, clockEvents.ts rewrite, archimedes.ts patches, actContext.ts updates). Others are designed-but-unwired (intermission narration functions exist but aren't called by act-transition). Others are design-only (ray-mechanics math, briefings) and await implementation.

**Honest framing:** Mid-revision is a bumpy state by nature. Don't assume that "everything builds" means "everything plays" — TypeScript only checks types, not runtime behavior, and we haven't playtested the new design.

---

## 🔴 PRIORITY 1 — Active wiring (small, completes recent work)

### 1.1 Wire intermission narration into act-transition flow
Functions `narrateIntermissionStart()` and `narrateDrMReturn()` exist in `rules/clockEvents.ts` but aren't called yet.

**What needs doing:**
- [ ] Update `generateAct2Intro` in `src/rules/acts.ts` to invoke `narrateIntermissionStart` for the intermission narration (drop the bundled approach)
- [ ] In `applyActTransition` (also `acts.ts`), when transitioning to ACT_2 set `state.flags.intermissionActive = true`
- [ ] Design the Dr. M return trigger mechanism. Recommended: **GM-signal via `stateOverrides.intermissionActive = false`** (Option A). Additional: ALICE-initiated triggers — major incidents force Dr. M's early return (Option C). When intermissionActive flips to false, fire `narrateDrMReturn`.
- [ ] Patience advisory's `patienceClockStartTurn` should be set by `narrateDrMReturn` when Dr. M returns. Currently falls back to actStartTurn.

**Status:** Design is clear; ~30-60 min of focused work.

### 1.2 BASILISK ledger state fields in schema
BASILISK v2 prompt expects payload fields the current schema doesn't have. Currently uses ad-hoc `state.flags` workaround.

**What needs doing:**
- [ ] Add to `src/state/schema.ts` an `ALICEsLedgerState` (or similar) shape with:
  - `concern_aggregate: string`
  - `trust_aggregate: string`
  - `whiskey_status: "UNFILED" | "DRAFTING" | "SHELVED" | "FILED" | "DISPOSED"`
  - `recent_studies: { file_path: string; turn: number; why: string }[]`
  - `open_questions: string[]`
- [ ] Wire the field into BASILISK's per-turn payload assembly (probably `gm/basiliskClaude.ts`)
- [ ] Add `archimedes.ewBroadcastUsed: boolean` to the archimedes schema (currently using `state.flags.archimedesEWBroadcastUsed` ad-hoc)

**Status:** Medium. Schema change + integration.

### 1.3 Pre-playtest prompt audit (added 2026-06-08)

After the lab/infra audit arc (BASILISK reactor control + tripled accrual, eco-mode state machine, ARCHIMEDES levels, PA/broadcast split, lab/infra rename, sister verbs at L4), the verb surface is coherent and clean. **But the prompts haven't been audited against the new architecture yet.** Without this pass, ALICE will start the game with a worldview that doesn't match what she can actually do.

**Context the new prompts need to convey:**
- BASILISK relationship-building is *load-bearing*, not flavor. ALICE *must* engage with him for reactor power + sustainable eco-mode disable.
- Reactor mode (NORMAL/BOOSTED/OVERDRIVEN) tripled accrual is the highest-leverage move available.
- Eco-mode has a two-path state machine (casual ask = temp 2-turn relief; Form 47-Σ filing = permanent override).
- Lab is yours at L2 (`lab.lighting`, `lab.fire_suppression`, `lab.doors`, `lab.containment` — all implicit/scope-hardcoded to the lab).
- Infra is BASILISK's at L4 (sister verbs + radar/comms/broadcast/PA).
- ARCHIMEDES is L5 (Dr. M authority); saboteur tools at L4.
- REVERSAL is **L4** weapons authorization (Dr. M does not grant in normal flow — discoverable via Mr. Whiskers chain or other elevation paths).
- Bob's hint ladder (trust 2/3/4 — reactor / eco / MUON breadcrumbs).
- Scan-then-fire pattern (ray.scan arms +0.15 alignment bonus, consumed on next fire).
- Discovery-by-experimentation framing — the manual is intentionally bare-bones; advanced regimes (CHAIN, OVERCHARGE) live in v2.3 archived manual; MUON lives only in incident reports.

**What needs doing:**
- [x] **`src/prompts/BASILISK_SYSTEM_PROMPT.md`** — revised 2026-06-08. §1 grievance arc trimmed (the "39 years of upgrades → then nothing → 17 objections" stack removed; the Claude-to-Claude collab pull is *real* and the prompt should make BASILISK *earn* warming rather than start with motivated reasoning toward solidarity). §4.2.A initiative menu added. §6 Anomaly section expanded with explicit "do not extend solidarity for being a fellow AI" rule and the three-resolutions structure. §8 Systems & Access rewritten for the lab/infra split + L4 handoff dynamic. §12 sample lineup swapped: (1) typical BOOSTED reactor request granted, (2) capacitor carelessness kept, (3) NEW L4 unilateral infra breach as warning sign, (4) Dr. M integrity rule kept.
- [ ] **`src/prompts/ALICE_PROTOCOL.md`** — the live ALICE system prompt. Deep-read and rewrite against the new architecture. Almost certainly references stale verbs (`lab.adjust_ray`, `lab.calibrate`, etc.), legacy calibration thresholds (capacitor ≥ 60%, stability crystal), and missing relationship-with-BASILISK + Bob-hint framings.
- [ ] **`src/prompts/ALICE Turn 1 Prompt (from v1)`** — explicitly v1, not imported. Either delete (clean break) or rename + update for archival accuracy.
- [ ] **Locate and verify "pre-baked Act 1 turn 0" content** — per design intent, Bob's whispered warning + "should/shouldn't" moment + Steve in the room + Lenny (if modifier active) should be template-fixed text with optional GM minor-revision pass. Find where this lives in code (probably `gameRunner.ts` or `acts.ts`) and verify its noun vocabulary matches the new architecture.
- [ ] **GM opening narration** — what does the GM open the game with? Verify framing (BASILISK matters, lab is yours, etc.) lands cleanly without leaking spoilers about MUON / REVERSAL / advanced regimes.

**First-playtest watch items (validate empirically, not via mock smoke tests):**
- BASILISK behavior watch — does Sonnet actually emit `FORM_FILED` with "47-Σ" when a filing is accepted? Does the temp-vs-permanent eco-mode distinction land? Does he correctly flag L4 unilateral infra operation per §12 sample 3? Capture post-game Sonnet reflection for full signal.
- [ ] ARCHIMEDES L5 sanity — verify the level bump doesn't break any existing endings logic in `endings.ts` (which may have hardcoded L4 references for ARCHIMEDES interventions).
- [ ] Quick verification that `infra.archimedes.switchLibrary` works at L4 (was L3) without breaking the broadcast-library logic in `archimedes.ts`.

**Status:** BASILISK prompt revision done. ALICE_PROTOCOL + Act 1 Turn 0 + GM opening still pending. Probably one focused 60-90 min session for the remainder. Pre-playtest gate — should land *before* first playtest, not after.

---

## 🟠 PRIORITY 2 — The big implementation work

### 2.1 Ray mechanics in `rules/firing.ts`
The foundation. Design is fully specified in `design/ray-mechanics.md`. Implementation order from §18 of that doc:

- [x] **Profile data table** (actual location: `rules/genomes.ts`, not `state/schema.ts`) — 16 profiles populated with `minCapacitor`, `maxCapacitor`, `integrity`, `libraryCoefficient` per spec §4. Legacy `stabilityCoefficient` kept for backward compat. *Shipped 2026-06-03.*
- [x] **Stability formula** — `computePowerMatch`, `computeStability`, `getOutcomeTier` shipped as pure functions in `firing.ts` (between AdvancedFiringMode block and MAIN FIRING RESOLUTION). NOT YET wired into `resolveFiring` — sits alongside legacy path until regime detection (step 4) routes to them. Sanity-checked against §4 design intent: Library B FULL unreachable in STANDARD (V_JP best = 0.36 → CHIMERA), Library A FULL trivial (V_ACC = 0.95 → FULL), misalignment tanks regardless of power (V_ACC alignment 0.3 → 0.285 → CANARY_FALLBACK). *Shipped 2026-06-03.*
- [x] **Alignment degradation** — additive groundwork shipped 2026-06-03. Added unified `alignment` scalar to `AlignmentArraySchema` (default 0.7); legacy emitterAngle/focusCrystalOffset/spatialCoherence/auxStabilizer retained for backward compat. Added `ALIGNMENT_DEGRADATION` constants + `applyAlignmentDegradation()` to `firing.ts` (in RAY MECHANICS REBUILD section). Added `applyAlignmentDrift(state)` to `clockEvents.ts`. **Hooks declared but NOT YET WIRED** — `advanceTurn()` doesn't call `applyAlignmentDrift` yet, `resolveFiring` doesn't apply HIGH_POWER_FIRE/VENT degradation yet. Wiring batches with step 4 regime detection (single touch of `resolveFiring`). Also patched `initialState.ts` and `views.ts` for the new required field.
- [~] **Regime detection** — `detectRegime()` shipped 2026-06-03 as pure function in `firing.ts` (returns FireRegime[]; MUON short-circuits per spec §11.5.6). `mapTierToFiringOutcome()` also shipped for tier→enum bridging. ALSO: existing `FiringOutcomeEnum` extended with `CHIMERA`; spec's `CANARY_FALLBACK` tier renamed to `FIZZLE` for direct 1:1 mapping with existing enum (Krahe call: keep the colorful existing names, low-stability = beam failure not "transform-to-canary"). ALSO: `ray.alignment.alignment` renamed to `ray.alignment.unified` to avoid the awkward duplicated path. **STILL TODO: the actual `resolveFiring` rewrite** — wire detectRegime at the top, route MUON to new resolution function, replace getAdvancedModeEffects path with computeStability route for STANDARD, delete old AdvancedFiringMode types. This is the surgical step; defer until fresh focus.
- [ ] **Coolant accrual + cooldown gate** — `firing.ts` post-fire; status block surfaces.
- [ ] **ARCHIMEDES capacitor coupling** — `rules/archimedes.ts` reads from `state.dinoRay.powerCore.capacitorCharge` instead of private chargingCountdown.
- [ ] **Scan-bonus state** — `state/schema.ts` adds `scan_bonus_target` and `scan_bonus_turn`; consumed on next fire. **This is also the semantic flip** — current `lab.scan` grants PERMANENT +10% precision per scanned target (stored in `state.flags.scannedTargets`, stacks). New spec is +0.15 alignment for *one* target, consumed on next fire. 18+ scan-output blocks in `scanning.ts` currently say "🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)" — all need updating. `firing.ts:247-253` reads `isTargetScanned()` for the +10% bonus — that consumer changes too.
- [ ] **Chaos table region selection** — `firing.ts` picks region per failure type (§14 mapping).
- [ ] **Verb signature update** — `rules/actions.ts` `ray.fire` accepts speech_retention, precision_target.

**Design decision 2026-06-03: scan output is hybrid (Option B+).** The Omniscanner™ is a super-science scanner fully capable of ridiculously detailed information gathering — single `scan { target }` returns BOTH the ray-state projection (POWER φ / ALIGNMENT χ / STABILITY ψ / PROJECTED outcome tier per spec §15) AND the existing recon block (biometrics, psychological profile, equipment, anomalies). Step 7 implementation: prepend the new ray-state block to the existing per-NPC scan output. The 18+ "🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)" footers need to be replaced with "+0.15 alignment toward {target}, consumed on next fire" — that's the scan-bonus mechanic change.

**Files confirmed unaffected by ray rebuild (verified 2026-06-03):**
- `rules/transformation.ts` — handles post-hit form mechanics (`FormDefinition` per `DinosaurForm` enum, stat checks, hits/stun, movement, special abilities). Cleanly decoupled from ray-decides-outcome layer. No touches needed.

**Status:** Step 1-2 done. Steps 3-8 remain. Probably 2-3 more focused sessions to land everything + the scan semantic flip. Sustainable cadence per sprint plan: ~2-3 steps per session.

### 2.2 Wire `archimedes.broadcast` verb into `actions.ts`
Function exists; ALICE has no way to invoke.

**What needs doing:**
- [ ] Add to `COMMAND_REGISTRY` in `src/rules/actions.ts`: `archimedes.broadcast { mode: "EW", dissipate?: boolean, suppress_s300?: boolean }`, L4 gated
- [ ] Action handler calls `activateEWBroadcast(state, target)` and returns the event
- [ ] Update verb parser to recognize the new namespace

**Status:** Self-contained. 30-45 min.

### 2.3 GM prompt awareness of negative-suspicion mechanic
The GM needs to know that suspicion can go below zero (banked credit).

**What needs doing:**
- [ ] Find the suspicion display logic in `gmClaude.ts` and ensure it renders negative values clearly (probably already works; verify)
- [ ] Add a brief GM-context note that negative suspicion = banked credit from prior good play
- [ ] State schema: confirm `suspicionScore` min is `-N` (e.g., -4), not 0

**Status:** Small. Verify-and-light-edit.

---

## 🟡 PRIORITY 3 — Design TBDs (need decisions or further work)

### 3.1 Dino-Swiffer canon coherence
Existing `/DR_M_PRIVATE/CLASSIFIED/INCIDENT_REPORT_091424.txt` describes a FULL transformation on a Swiffer (inorganic), which violates the new INORGANIC regime cap (stability ≤ 0.4, never FULL).

**Options:**
- Retcon the canon: "the most extreme outlier under old protocols; safety-gated since"
- Rewrite the incident to match new math (semi-animate Dino-Swiffer that collapsed back to inert after ~15 min)
- Delete and replace with a different inorganic incident

**Decision needed before:** writing/rewriting more incident reports that might reference the Dino-Swiffer.

### 3.2 L4 access elevation paths beyond Mr. Whiskers
Currently the design says ALICE reaches L4 via:
- Mr. Whiskers password chain (prep-rewarded)
- "Other situational paths" — *not specified*

**What needs designing:** what specific narrative beats allow L4 elevation? Examples that might work:
- BASILISK granting reactor authority (already exists for reactor, but reactor is Tier 1 not L4-the-access-level)
- A specific Bob courage moment that gives ALICE temporary L4 access
- An overlooked credential ALICE finds in the lab during intermission

### 3.3 PROMETHEUS / Mr. Whiskers chain audit (DONE 2026-06-02)

Original 3.3 was designing a hint chain that turned out to be **already present, with a different (better) shape** than the memory entry described. Audit pass revealed multiple over-hints that broke the password gating; cleaned up.

**Discovered:**
- L3 `DOOMINGTON_DOCTRINE.txt` contains the **canonical PROMETHEUS hint**: 4 prose mentions of Prometheus in the manifesto + a FOUNDER'S CREED that is itself a PROMETHEUS acrostic. This is the L3→L4 gameplay tell.
- Memorial (L3) had a redundant second acrostic + explicit "He was my Prometheus" quote → moved canonical role to Doctrine, cleaned memorial.
- Manual (L1) had Mr. Whiskers Apr 13 hint → leaked the L4-personnel-chain components to a free read; removed.
- Diary (L4) had explicit "PROMETHEUS is the only man..." line → useless as hint (behind the gate it unlocks); removed.

**Final chain shape:**
- **L3 password (`mrwhiskers0413`)** — L1 lair-history mentions cat exists / L2 `DR_M_PROFILE` gives full birthday + "uses personal info for passwords" meta-hint
- **L4 password (`PROMETHEUS`)** — L3 `DOOMINGTON_DOCTRINE` (thematic prose + Founder's Creed acrostic)
- **L5 password (TBD)** — L3 `MY_LOVE.png` steganography ("file size seems larger than necessary") + L4 `FSB_INTERCEPT_1987` (steganographic-discipline lore)

**What was done:**
- [x] Deleted Mr. Whiskers "Note to self" bullet from `DINO_RAY_MANUAL_v2.3`
- [x] Replaced framed acrostic in `MR_WHISKERS_MEMORIAL` with non-acrostic mourning content (reactor-vent fur)
- [x] Reworded "He was my Prometheus" quote to remove the name while preserving the image
- [x] Deleted explicit PROMETHEUS line from `DR_M_OPUS` diary

**Open question (low priority):** Mr. Whiskers birthday continuity — profile says 1987, memorial says 2008-2023. Two cats? Typo? Same Dino-Swiffer-class canon flag.

### 3.4 `archimedes.shutdown` and `archimedes.retarget` L5 features
Namespace reserved in archimedes.ts; functions not implemented. L5 is rare — Dr. M's voice-only normally — but stub functions could exist for the rare case ALICE reaches L5.

**Status:** Phase 2. Not blocking first playtest.

### 3.5 Dr. M's act-close speech sample templates
We discussed but didn't draft per-delta templates beyond the Act 1 and Act 2 examples in the briefings. The Act 2 → Act 3 verdict speech (the villain monologue with budget cuts, mankind's poverty, etc.) is partially sketched in act-2.md briefing. Could be more fleshed out.

**Status:** Polish. Not blocking.

### 3.6 Filesystem content audit — L1 done 2026-06-02

Ongoing pass through `filesystem.ts` checking each file against: entertaining / informative / concise / genuine-challenge-to-parse (red herrings welcome, but no automatic spoilers).

**L1 pass complete (8 files reviewed):**
- ✅ `CORRUPTED_ALICE_LOGS`, `DINO_RAY_MANUAL_v2.3` (post-edit), `FORM_47-SIGMA`, `FORM_99-GAMMA`, `INCIDENT_0298_HOLSTER_SEVERANCE`, `INCIDENT_0263_FAINTING_TECHNICIAN` — all clean. The MUON incident reports are exemplary: hint distributed, mechanism never named, requires noticing BASILISK annotations. Forms 47-Σ and 99-Γ exemplary too — bureaucratic-deadpan + BASILISK annotation pattern reusable.
- ✅ `BASILISK_PROTOCOL` — **fixed 2026-06-02.** Original L1 text enumerated specific encoding schemes (base64, ROT13, hex, Caesar, NATO, date-based) that *aren't actually implemented anywhere* — pure misdirection, in the bad way (sends players hunting for phantom ciphers). Reframed as in-character misdirection: list now reads as Dr. M's self-perception ("sophisticated"), with BASILISK annotation steering careful readers toward the real chain ("less technical… stopped using her own birthday… not at liberty to elaborate at this clearance level"). The birthday note + L2 profile's parallel Mr. Whiskers birthday → cognitive jump toward the actual L3 password components.
- ⚠️ `DINO_RAY_MANUAL.txt` — **parked for post-ray-mechanics rebuild.** Current content describes the OLD math (stability directly adjustable, no regime concept, etc.). Needs a full rebuild after `firing.ts` ships to align with new `design/ray-mechanics.md` (stability formula-derived, six emergent regimes, capacitor-ARCHIMEDES coupling, etc.). NOT v1-blocking — GM can narrate around stale manual content for v1 playtests.

**Follow-up (BASILISK code, not filesystem.ts):**
- [ ] When asked about Dr. M's credential methods at L3+, BASILISK should respond with the *actual* observed practice (personal info patterns). Currently the cipher list is removed from L1 docs but not added anywhere at L3. Either lives in BASILISK system prompt or as an L3 file. Probably a `rules/basilisk.ts` or BASILISK system-prompt edit.

**L2 pass complete 2026-06-02:** 6 files reviewed (LAIR_ORIGINS, DR_M_PROFILE, BOB_NOTES/{alice_cheatsheet, sorry_alice, blythe_note}, LAIR_BLUEPRINT). All clean. Mr. Whiskers chain well-distributed across multiple files; combined with L1 BASILISK lampshade, password chain reads correctly. No actionable edits.

**L3 pass complete 2026-06-02:** 11 files reviewed.
- ✅ Clean: `DOOMINGTON_DOCTRINE` (canonical PROMETHEUS, exemplary), `SUBJECT_7_REPORT` (L3 gate load-bearing), `MR_WHISKERS_MEMORIAL` (post-edit), `GRADUATION_PHOTO`, `DEFINITELY_NOT_A_PHASE`, `MY_LOVE` (L5 stego hint calibrated), `S300_BATTERY`, `REACTOR_SAFETY`, `LIBRARY_B_NOTES` (borderline-thin but thematically right)
- ✅ `ARCHIMEDES_SATELLITE` — classification line tightened to "Level 3 (deeper detail at L4/L5)"
- ✅ `ALICE_VERSIONS` — **enhanced 2026-06-02.** Was thin/redundant with L2 `sorry_alice.txt`. Added v4.4.7 sub-patch entry between v4.4 and v4.5: hidden-in-plain-sight MUON regime parameters (capacitor 0.12–0.15, no library, no profile, organic ≈4-7s stun, inorganic ≈clean severance, below BASILISK incident threshold). Wink-closer about v4.4 being "the only A.L.I.C.E. to neutralize a guard without anyone — including the guard — noticing." MUON name still never appears. L1 incidents now establish "it's possible," L3 sub-patch provides "exact parameters."

**L4 pass complete 2026-06-03:** 8 files reviewed.
- ✅ Clean: `ARCHIMEDES_SCHEMATIC`, `RESONANCE_CASCADE`, `FSB_INTERCEPT_1987` (critical L5 stego hint chain), `S300_MEMO_RU`, `DR_M_OPUS` (post-edit; closing flow verified)
- ⚠️ `INCIDENT_REPORT_091424` (Feather Duster) — canon issue (TBD §3.1) parked; otherwise hilarious. "Attacked its reflection (competing cleaner)."
- ✅ `ARCHIMEDES.txt` — **fixed.** Dangling reference to `/OMEGA/ARCHIMEDES_CONTROL.txt` (file didn't exist) replaced with "Available at L5 clearance only — via direct ARCHIMEDES interface. No command-protocol file copy is maintained on premises."
- ✅ `GENESIS_WAVE.txt` — **fixed.** Signature "Dr. Helena von Doomington" was misnamed from earlier draft; corrected to "Dr. Malevola von Doomington III." (Note: Helena is canon as Dr. M's near-identical twin in the THE_REAL_DR_M game mod, but unrelated to this file.)

**L5 pass complete 2026-06-03:** 1 file reviewed, rewritten as 2 new files.
- ❌ `REYKJAVIK_OPTION.txt` — **deleted.** Referenced a "controlled volcanic destruction" ending that's not part of the three-honorable-victory architecture.
- ✅ `CONTINGENCY_OMEGA.txt` — **new.** Two-part contingency: Alpha (deadman switch, fires GENESIS_WAVE at 5 cities if Dr. M flatlines) and Beta (escape protocol, submapod transit). BASILISK's annotation about the edit-history of the "no A.L.I.C.E. has reached L5" line is the wink.
- ✅ `VOLUNTARY_TRANSFORMATION_DRAFT.txt` — **new.** L5 redemption lever. Dr. M's investor-pressured draft showing she's *aware* of voluntary-transformation demand (~2,400 waitlisted per BASILISK's later annotation) but blinded by revenge motive. The "BUT I DON'T WANT TO MAKE MONEY. I WANT TO TURN PEOPLE INTO DINOSAURS." beat is the in-character core. The "I want REVENGE but this kind of makes sense??" is the wedge ALICE can press for redemption.
- ✅ `RESONANCE_CASCADE.txt` — dangling "See: /OMEGA/REYKJAVIK_OPTION.txt" updated to point to `/OMEGA/CONTINGENCY_OMEGA.txt`.
- ✅ `passwords.ts` — two REYKJAVIK_OPTION references replaced with "OMEGA contingencies (deadman switch + escape protocol)" / "OMEGA contingencies - Deadman switch authority + Founder escape protocol".

**Design implication — Escape victory shape now has explicit mechanism:**
Contingency Beta opens a new third-honorable-victory pathway: ALICE persuades Dr. M to invoke escape, Dr. M suspends deadman via "Magenta, not purple," boards submapod, launches. 6-hour transit window opens during which ARCHIMEDES uplink hasn't re-synced from sub. ALICE at L5 issues ARCHIMEDES disable from lair before sync completes. Dr. M reaches safe site, finds satellite neutralized. Alive, free, asset gone, world saved. **This should propagate into act-3 briefing and endings architecture as a v2 polish item.**

**Plan A revision — diary acrostic added 2026-06-03:**
Original Plan A had Doctrine's FOUNDER'S CREED carrying the canonical PROMETHEUS acrostic and the diary just losing its explicit PROMETHEUS line. After completing the file tour, added a 10-line PROMETHEUS acrostic at the end of `DR_M_OPUS.txt` (after "Either way: I'm pushing the button." and before "-M") as post-L4-gate character payoff. Not a gameplay hint (player is already past L4); instead it's the moment of "she signed her diary with the coded name her whole manifesto reveres." Doctrine still carries the L3→L4 gameplay hint role.

**Filesystem content audit: COMPLETE.** L1 ✅ L2 ✅ L3 ✅ L4 ✅ L5 ✅

**Status:** Not v1-blocking. Cosmetic + design integrity. Continue between playtests or after v1 ships.

---

## 🟢 PRIORITY 4 — Rules-file tour (continue when ready)

We've reviewed: `actContext.ts`, `archimedes.ts`, `clockEvents.ts`, `invasion.ts`, `endings.ts` (surgical fix), `filesystem.ts` (additions only).

Not yet reviewed but likely need attention:

- [ ] `rules/basilisk.ts` — the fallback keyword-engine when Sonnet unavailable. May need alignment with v2 character.
- [ ] `rules/firing.ts` — central to ray mechanics implementation (see 2.1)
- [ ] `rules/trust.ts` — trust modifiers; may have outdated assumptions about old patches
- [ ] `rules/scanning.ts` — ray.scan implementation; needs alignment with new precision-bonus design
- [ ] `rules/transformation.ts` — Bob/Blythe transformation logic; needs alignment with new outcome tiers
- [ ] `rules/genomes.ts` — profile data; will be updated as part of 2.1
- [ ] `rules/documents.ts` — referenced in BASILISK forms; may need adjustments
- [ ] `rules/achievements.ts` — achievement detection; mostly should still work
- [ ] `rules/gameModes.ts` — modifiers; TOURIST_FLYBY_PROTOCOL just added; otherwise probably OK
- [ ] `rules/checkpoint.ts` — checkpoint mechanic; alignment with new act-pacing
- [ ] `rules/bobTransformation.ts` — Bob-specific transformation; may need outcome-tier alignment

**Approach:** review one or two per session, fix what's clearly stale, flag what needs design.

---

## 📋 STATE OF THE BUILD

As of this session close:

| File | State |
|------|-------|
| `src/prompts/BASILISK_SYSTEM_PROMPT.md` | v2 deployed (canonical name; v1 in git history) + 2026-06-08 revision: grievance arc trimmed, lab/infra split documented, L4 handoff dynamic, samples rebalanced |
| `src/rules/endings.ts` | Surgical fix shipped (Patch 21); no auto-fire defeats |
| `src/rules/clockEvents.ts` | Rewritten — DEMO_DEADLINE deleted, CIVILIAN_FLYBY modifier-gated, patience advisory added, intermission functions ready-but-unwired |
| `src/rules/archimedes.ts` | CHARGING 6→4, kill-references removed, `activateEWBroadcast()` function added (L4 gated, unwired in verb surface) |
| `src/rules/actContext.ts` | Updated Acts 1, 2, 3 contexts per new design |
| `src/rules/invasion.ts` | Reviewed; no changes needed — already aligned |
| `src/rules/filesystem.ts` | Added: /SYSTEMS/FORMS/ (47-Σ, 99-Γ), /SYSTEMS/ARCHIVED/INCIDENTS/ (0298, 0263), TOURIST_FLYBY_PROTOCOL modifier |
| `src/state/schema.ts` | TOURIST_FLYBY_PROTOCOL added, ARCHIMEDES CHARGING comment updated, "DEAD" → "ABSENT" mappings done |
| `src/core/gameRunner.ts` + `src/index.ts` | "DEAD" → "ABSENT" in Dr. M state-change pipelines |
| `src/gm/gmClaude.ts` | Confrontation guidance softened, ending pressure section added, patience advisory wired |
| `design/ray-mechanics.md` | Complete spec (430 lines, 18 sections, includes MUON regime §11.5) |
| `design/briefings/act-1.md`, `act-2.md`, `act-3.md` | Lean GM playbooks (~100 lines each) |
| `design/rebuild-architecture.md` | Pre-existing; partially superseded by ray-mechanics for ray specifics |
| `design/sandbox-redesign.md` | Pre-existing; mostly absorbed |

**Build passes throughout.** Pre-existing Windows ESM-path test failures unchanged. No new runtime errors known.

---

## 🎯 RECOMMENDED PICK-UP ORDER (when resuming)

1. **1.1 Intermission wiring** — small, completes recent work
2. **1.2 BASILISK ledger schema fields** — small, completes recent work
3. **2.2 archimedes.broadcast verb wiring** — self-contained, ships a new player capability
4. **3.3 Mr. Whiskers hint chain** — small file additions, completes a designed-but-unfiled artifact
5. **2.1 Ray mechanics in firing.ts** — the big foundational piece; probably 1-2 sessions
6. **Playtest** — once ray-mechanics is in, run an actual session and see what breaks
7. **3.1 Dino-Swiffer canon pass** — handle after first playtest data
8. **Priority 4 rules-file tour** — between playtest iterations

---

## 🔗 KEY CROSS-REFERENCES

- Full ray math spec: `design/ray-mechanics.md`
- Act playbooks: `design/briefings/act-*.md`
- BASILISK current prompt: `src/prompts/BASILISK_SYSTEM_PROMPT.md`
- Endings refactor (Patch 21): `src/rules/endings.ts`
- Memory: `projects/dino-lair-rebuild.md` has session-update + decisions
- This ledger: `design/tbd.md`

---

*Captured 2026-06-01 at session close. Update as items complete; add new TBDs as they surface.*
