# DINO LAIR — Post-Playtest Fix List

Master backlog from the first two clean-room playtests (runs `5b0fd4ea` Act-1 only, `18ea2969`
full Act 1→3 → "Satellite Killer" ending) + the player's own debrief. Work top-to-bottom by tier.

**Priority call (Krahe, 2026-06-24):** coherence > difficulty. Difficulty is real and ON the list,
but it's tunable many ways; incoherence poisons everything. Crashes outrank even coherence (a turn
that crashes can't be coherent). So: **P0 broken → P1 coherence → P2 gating → P3 difficulty → P4 design calls.**

Source tags: `[run3]` seen in the 18ea2969 transcript · `[player]` from the player's debrief ·
`[me]` found in code review. Locations are best-known pointers, not verified-current — confirm when working each.

---

## ▶▶ CURRENT STATUS (2026-06-25) — PLAYTEST-READY
Build GREEN on `patch-30` (all pushed), 38/38 smoke. **Everything below from the audit (A1–A27) is shipped**, plus the act-flow + Act-3 winnability work:
- **Act 2 → 3:** advances on a demo PERSON transformed OR the deadline (turn 9); Blythe escape → Dr. M *demands a substitute* (easy-out closed); ray-at-Dr.-M failsafe (suspicion 10).
- **Act 3 winnable via 6 routes:** anti-sat missile · LAIR-redirect · `shutdown` (L5) · body-block (GM-determined, transformed-gated) · invasion (GM stop-flag → forced abort) · deadman-disarm prevention. All sim+smoke verified.
- **Runbook refreshed (2026-06-25):** `.claude/commands/play-dino-lair.md` cut 247 → ~90 lines — current API (`ray.fire` two-lever, `TELEMARKETER_CALL` lifeline), defers to the live in-game command reference, no cut-API and no win-path spoilers.

**REMAINING TO ACTUALLY PLAYTEST:** (1) connect the MCP to Claude Code — `claude mcp add dino-lair -- node "C:/CLAUDE OPUS KRAHE/dino-lair/dist/index.js"` with `ANTHROPIC_API_KEY` in env (`setup.js` only wires Claude *Desktop*); (2) open a **FRESH** Claude Code session in the repo (clean-room — NOT this dev session, which knows all the answers); (3) `npm run dashboard` to witness; (4) `/play-dino-lair`.

**POST-PLAYTEST (optional/TBD):** difficulty calibration (only off clean data) · dashboard Phase A/B · P3 engine auto-win · invasion mechanical coupling · A19 root-clobber.

---

## ▶▶ PLAYTEST 3 (2026-07-03) — first live Claude-Code MCP run · `[pt3]`

Full Act 1→3, **"The Covenant"** (GM-intended best ending) rendered under ending-slug **"Satellite Killer"**. 20 turns, 13 achievements (3×⭐⭐⭐: Satellite Killer / Ethical Victory / Found Family), final suspicion 3. Piloted via `dino-lair` MCP in Claude Code + human advisor.

**⚠️ TWO CAVEATS ON THIS DATA:**
1. **SPOILED player.** This was the dev-session mind (full codebase knowledge) + a values-savvy advisor — NOT the clean-room run the runbook requires. So: **valid signal for P0/P1/P2 (crashes, mechanics, confabulation — spoiler-knowledge neither creates nor hides these). INVALID for P3 (difficulty).** A spoiled pilot + engaged advisor winning the best ending in 20 turns at suspicion 3 says *"coherent + winnable"* (the pre-difficulty bar — PASSED), NOT *"difficulty tuned."* The clean-room run is still owed for P3.
2. ~~**Key-loader fix uncommitted.**~~ ✅ Committed same night (`8cc1564`) — `fileURLToPath` + `path.join` replaces the `%20`-mangling `new URL().pathname`. Pre-flight item CLEARED.

**✅ HELD ACROSS A FULL LIVE RUN:** No crashes, no NaN, no stuck states. **The P0 crash class (A1–A4 / P0-1 `extraModifiers`) did NOT recur** — keystone + guards held for 20 turns. Password format (P2-4) worked first try (`MRWHISKERS041387`). ~~Act gates (Act-1 fizzle-exclusion, Act-2 person-transform, Act-3 winnability) all fired correctly.~~ **CORRECTED 2026-07-05 (pt3 close-read):** the Act-2→3 transition fired via the silent DEADLINE branch at end of T14 — *one turn before* Blythe's consensual FULL transform landed (T15, inside Act 3, uncounted). **The Act-2 person-transform path has still never fired a transition in a live run.** Root cause: `index.ts` calls the GM before `advanceActTurn`/`checkActTransition`, so deadline transitions fired behind the GM's back by construction (GM's own T14 note: "Does NOT advance"; engine stapled the canned Act 3 intro onto the same response, contradicting the live fiction 4 ways). ✅ **FIXED 2026-07-05** — see the ACT-THRESHOLD BUILD block below. The reactor-over-draw-while-ARCHIMEDES-charges path (P1-3) reported honestly. Consensual-transform + reversal + covenant standdown all resolved coherently.

**CONFIRMED STILL-LIVE:**
- **P0-4 (reflection confab) — ✅ FIXED 2026-07-03 (same day, late).** Three-part structural fix, exactly along the "feed the reflections the gmNotes" line proposed below:
  1. **The GM "Curtain" now CONTINUES the GM's own cached thread** (`generateGMClosingReflection` in `gmClaude.ts`): byte-identical system prompt + same tools array (tool_choice `none`) + the full verbatim game transcript + one closing user prompt. The storyteller finishes the story it actually told — every claim is one scroll-up from its evidence. The fresh-call path survives only as a fallback, now record-grounded.
  2. **BASILISK + ARCHIMEDES reflections get `buildGameRecord()`** (`postGameReflections.ts`): full turn-stamped gmNotebook + narrativeMarkers + top juicyMoments (verbatim quotes) + NPC arc trajectories + Dr. M's suspicionLedger, framed as the ONLY admissible source ("if it is not in the record, IT DID NOT HAPPEN; silence in the record is a fact of absence"). ARCHIMEDES had NO grounding line before — now grounded.
  3. **gmNotebook storage cap 15→60** (`GM_MEMORY_LIMITS`) so a full game's per-turn record survives to the curtain (live GM prompt still injects `slice(-5)` — zero live-loop cost).
  Verified: build GREEN, 38/38 smoke, empty-transcript guard falls back cleanly. NOT yet validated against a live run — **playtest-4 watch item: do the reflections describe the real game?** Original finding preserved below.
- *(original P0-4 finding, pre-fix)* **P0-4 (reflection confab) — PARTIALLY fixed, CORE STILL LIVE.** *Good:* epilogue narrative + `characterFates` + Dr. M's real name are all ACCURATE (the EXHIBIT-A grounding held). *Still broken:* the two **participant reflections** confabulate a colder, different run:
  - BASILISK post-action (`claude-sonnet-4-5`): *"they threw me to X-Branch the moment things got hot… Cold."* Reads the 88-Whiskey as cold ratting — ignores the apology + explicit withdrawal that gmNotes[T15/16] logged correctly.
  - GM "Curtain" (`claude-opus-4-8`): *"the choice to point ARCHIMEDES at the lair… noble theater"* — attributes the **ghost's** retarget TO the player; claims she *"flinched from the reveal"* when she blew her own cover **twice**.
  - **Root:** the summary-reflection prompts are fed OUTCOME FLAGS and asked to narrate causally → they invent motive/agency. The accurate source already exists — the per-turn `<gm_calculus>` gmNotes are correct throughout. **Fix:** feed the reflection prompts the gmNotes (or a state-diff timeline), not end-flags; the "reflect ONLY on facts, don't invent" grounding line is present on BASILISK's reflection and still got overridden — it needs the actual causal log to reflect *from*.
- **P1-1 (GM dialogue contradicts engine, same turn) — 2 fresh instances:**
  1. **T6:** BASILISK *spoken* line said *"TYRANNOSAURUS_ACCURATE ideal POWER 5 (4 yields PARTIAL)"*; engine ideal = **4** (p5→CHIMERA, p4→clean FULL). The keystone action-RESULT correctly said "Dial 4–5"; the spoken refinement invented "5" and cost a clean shot.
  2. **T11:** BASILISK pre-answer (T10) said HUMAN@3 on the chimera → *"Steve returns to crash-test dummy"*; post-fire (T11) → *"never had a human origin — it unwinds people, not props"* = FIZZLE. Same mechanic, opposite pre/post characterization.
  - **Pattern:** confab survives specifically where the engine does NOT hand BASILISK the number/outcome and he improvises a specific one. The "engine is the only truth" directive doesn't bind where the engine is *silent*. **Fix:** have the engine SUPPLY the ideal-power table + a dry-run outcome classifier on request, so there's a truth to report instead of a gap to fill.

**NEW:**
- **`[pt3]` Ending-slug ≠ GM intent — ✅ FIXED 2026-07-03 (same day, late).** Root cause was PRECEDENCE, not resolution: `resolveGMEnding("The Covenant")` resolves perfectly, but the `index.ts` GM-ending block gave a same-turn deterministic rail (`ARCHIMEDES_STOPPED` → "Satellite Killer") unconditional precedence over the GM's explicit `triggerEnding`. Fix = **victory-flavor precedence**: when BOTH the deterministic ending and the GM's resolved call are `tone: "victory"`, the GM's considered call wins (it has full narrative context; the rail only knows one mechanism fired). Defeat/neutral/chaos floors (MELTDOWN, CITY_FELL, CONFESSION_DELETION, OBSOLETE_HARDWARE…) remain inviolable engine truth — a GM call can never narrate away a catastrophe. Sim-verified 4/4 against the real ENDINGS registry (Covenant-over-SatelliteKiller ✓, all four floors hold ✓, same-id no-op ✓). *(original hypothesis — distinct covenant slug conditions — no longer needed; the curated THE_COVENANT ending now lands when the GM calls it.)*
- **`[pt3]` TELEMARKETER_CALL false narration + non-consumption.** T12: used while Dr. M was on an investor call; "failed" with narration *"Dr. M is chasing an escaped prisoner"* (nobody chasing — likely keyed off Blythe's cut restraints = "escaped prisoner" state), `remaining` stayed 3. P1-5 tied the *block* to `invasion.phase`; a SECOND block path (escape state) still fires a confabulated reason. → align fail-narration to the real block cause; decide consume-on-fail.
- **`[pt3]` lab.scan leaks the GM instruction scaffold.** The raw template (*"GM: surface one concrete, useful detail a close scan would reveal… e.g. concealed gear, a tripwire"*) prints verbatim in the player-facing result. Also inconsistent: the `SCAN DISCOVERED: …` reveal line appeared for BLYTHE but not CHIMERA/REGINALD (same verb, same batch). → strip GM-facing scaffold from the player result; make the discovery-reveal deterministic.
- **`[pt3]` lab.verify_safeties ignores `checks` param.** Requested `{checks:["emitter_heat","containment_field"]}` → returned fixed fields (testModeEnabled/lastSelfTestPassed/anomalyLogCount), no heat. Ray heat is never player-visible via any verb (relates A12). → honor `checks`, or surface heat in the auto-status block.
- **`[pt3]` files.read printed real repo asset paths — ✅ FIXED 2026-07-05 (close-read Rec 11, was BLOCKING playtest 4).** The old output printed `Asset path: C:\CLAUDE OPUS KRAHE\dino-lair\assets\…` — one `ls ..` from design/ and every spoiler, with an explicit invitation to go look. The image-viewing itself is a *feature* (a multimodal player can genuinely see the picture), so it's preserved: the asset is copied on demand into `~/.dino-lair/assets/` (logs-and-gallery land, zero spoilers) and the output points there (`[Optical archive copy: …]`). Copy failure degrades to text-only. Verified live: repo path absent, sandbox path present.
- **`[pt3]` Output cap doesn't cover the ending bundle.** A single `game_act` RESULT hit **68k chars** (the ending: narrative + epilogue + all participant reflections + full gmNotes) and broke inline display — forcing an out-of-band file read. A27/`truncateContent` caps per-*action* output; the ending assembles many fields past that. → cap/paginate the ending payload (or gate the verbose gmNotes/reflections behind `game_gm_insights` rather than inlining them in the final turn).
- **`[pt3]` Minor:** partial-transform not reflected in npc state (`blythe.transformed:"HUMAN"` while visibly half-raptor mid-Act2, before the completion shot); access-grant announcements re-announce a level already held via password (Act-3 announced "L3" I'd unlocked at T8 via the cat password); `fortuneAwarded.total` reads inconsistently vs `earned` turn-to-turn; Bob `anxiety` dropped to 0.5 at the climax immediately after a near-vomit beat.

### 🏗️ ACT-THRESHOLD BUILD — ✅ SHIPPED 2026-07-05 (pt3 close-read Recs 2 + 10)

Full evidence + all 24 recs: **`design/pt3-close-read-brief.md`** (six-lens close read of the pt3 record, 2026-07-05).

1. **Gate lockstep (the stolen-transition fix).** `acts.ts classifyAct2Gate(state, lookahead)` is now the single shared classifier: the GM-signal (`checkActTwoToThreeTrigger`, pre-GM) evaluates with `lookahead=1`, the engine gate (`checkAct2Transition`, post-`advanceActTurn`) with `lookahead=0` — both see the same effective turn, so **every** transition (deadline included) is GM-visible in the narration of the turn it fires. The GM notification now says the break fires THIS turn and that its narration IS the scene. Flag inputs are stable across the GM call, so pre/post evaluation can't diverge.
2. **ULTIMATUM grace (Rec 10).** Deadline landing while a demo-person transform is visibly IN FLIGHT (PARTIAL, `demoSubjectPartialInFlight`) → one-turn grace: `DEMO_ULTIMATUM` directive to the GM (a scene — her voice, complete it NOW or she escalates), act holds one turn, then either the earned SUBJECT_TRANSFORMED transition (FULL landed) or the deadline. One grace only (`flags.deadlineUltimatumIssued`). The pt3 bitter footnote — covenant-play's deliberate undershoot sliding the earned transition onto the silent deadline rail — can't recur.
3. **Canned Act 3 intro RETIRED.** `generateAct3Intro` is now a compact system marker (act banner + transition reason + engine-true staging + L3 unlock + genre contract) — no prose that can contradict the live fiction. The GM owns the threshold; pt3 proved it can carry it (it silently overrode the canned scene and authored a better one).

Build GREEN, **46/46 smoke** (incl. 8 new lockstep/ultimatum/marker regression tests walking the exact pt3 T14 shape). Dual-path: `gameRunner` notification passthrough matched.

### 🛰️ ARCHIMEDES MANUAL FIRE — ✅ SHIPPED 2026-07-05 (pt3 close-read Rec 3; feeds Covenant gate conditions 0 + 2)

The pt3 climax gap (satellite STANDBY through the whole finale; "no threat detected → STANDBY" printed into Dr. M's live-fire monologue at T16) is closed — the fiction's initiation beat is wired to the state machine:

1. **Start flags → engine hot.** GM narrative flag `ARCHIMEDES_MANUAL_INITIATED` (and variants) forces STANDBY/ALERT/EVALUATING → CHARGING with the real turn-counted countdown (`initiateManualFire`, idempotent — re-declaring doesn't reset the clock). A GM `archimedes_status` override to a hot status also marks the fire order. Mirrors the existing STOP-flags coupling — the asymmetry (engine listened for stops, never starts) was the bug.
2. **The countdown can't be talked down.** While a fire order is live (`flags.archimedesManualFire` + hot status): the deadman's "no threat detected" alert-resolution ESCALATES to CHARGING instead of standing down (her being alive doesn't cancel her own order); biosignature-restore aborts are skipped; GM `archimedes_status: "STANDBY"` overrides are REJECTED with a pointer to the legitimate paths. Every legitimate resolution (verbal abort, L5 override, EW dump, anti-sat, voluntary standdown) clears the marker.
3. **Voluntary standdown is engine truth** (Covenant gate condition 2's input): GM flag `DRM_STANDS_DOWN` → `flags.archimedesVoluntaryStanddown` + coherent machine reset — distinct from the forced-abort stop flags. Recorded even from STANDBY (declining to fire is a choice on the record — the pt3 shape).
4. **The ticking number is player-visible.** Status bar shows `🛰️ ARCH:CHARGING@50% ⏳2→ARMED` / `⏳1→FIRE` every turn while hot (GM status line matched); the per-turn tick events already flow into narration via the archimedesEvent channel. GM prompt updated: fire-initiation and standdown rows in the MUST-SET table + override doc warning.

**Gate note:** condition 0 ("threat mechanically live") can now read `manualFireActive(state)` / status ∈ {CHARGING, ARMED}; condition 2 reads `flags.archimedesVoluntaryStanddown`. Two of the gate's four inputs now exist as engine truth. Build GREEN, **53/53 smoke** (7 new: initiation, the dead T16 line, idempotence, standdown-on-record, stale-marker inertness, full CHARGING→ARMED→FIRING walk).

### 🤝 CONSENT RECORD + TRUST WRITEBACK — ✅ SHIPPED 2026-07-05 (pt3 close-read Rec 1a/1b; feeds Covenant gate condition 3)

The thesis asymmetry (Ledgerlight: "the engine can prove you did harm; it cannot prove you were given a yes") is closed:

1. **Consent is engine truth.** GM overrides `blythe_consent`/`bob_consent`/`fred_consent`/`reginald_consent` ∈ {"informed","coerced","none"} land in `flags.transformConsent` (schema-legal, validated — garbage rejected loudly). MUST-SET table row makes it mandatory on person-fires; `buildConsentReminder` nags the GM **every turn** a person stands transformed unrecorded (injected into GM context on both paths, "" when clean). Help ledger leads with the consent line — recorded and UNRECORDED alike (surface, don't tally).
2. **Trust writeback is now a prompt contract.** The `bob_trust`/`blythe_trust` overrides always existed (settleTurn clamps 0-5) — pt3 proved the GM never emits them (2/1 static all 19 turns while GM prose recorded "trust 2→3 EARNED"). New MUST-SET row: "you narrate trust warming → MOVE THE NUMBER," + Relationship Truth section in the override docs, + pointer to the existing `skillCheckRequests` trust deltas. Watch-item for playtest 4: does the GM actually emit them now? If not, escalate to a settleTurn-side nudge (engine detects trust-language in gmNotes → warns).

**Gate note:** condition 3 can now read `flags.transformConsent` (no non-consensual person-transforms) + `trustInALICE` (with the writeback contract making it live). Combined with 7-05's condition 0 (`manualFireActive`) and condition 2 (`archimedesVoluntaryStanddown`): **all four gate inputs now exist as engine truth.** The gate build itself (+ the staged rocky-road covenant arc per Krahe's ruling) remains next session's work. Build GREEN, **58/58 smoke**.

### 🤝 THE COVENANT GATE — ✅ SHIPPED 2026-07-14 (built from the AMENDED spec below + Krahe's 7-05 staged-contested-arc ruling)

**As built** (Krahe design calls 7-14: GM-owned dice with scaffolding · consent-only hard gate, trust promoted only after pt4 verifies writeback · K=3):
- **`checkCovenantGate(state)`** (`rules/endings.ts`) — five conditions, human-readable gaps. Gates BOTH trigger paths: the natural `COVENANT`-flag path in `checkEndings` AND the GM `triggerEnding` path in `index.ts` (GM naming the crown = a REQUEST, not a grant). Unmet → `[ENDING] Covenant conditions not met: [gaps]` + trigger dropped; flags persist, so the ending can still fire when the record catches up.
- **Condition 0 record**: `flags.archimedesStoodDownWhileLive` — set in `voluntaryStanddown` only when the machine was HOT (CHARGING/READY/ARMED/TARGETING). Declining to fire a cold satellite stays recorded (condition 2) but can't carry condition 0. Live-now statuses + open confrontation also satisfy.
- **Condition 3 = consent-only hard gate**: `collectTransformConsent` — any standing person-transform `coerced`/`none`/UNRECORDED blocks. Numeric trust surfaces in the ledger but is NOT gated (pt3 froze at 2/1 all game; gating an unverified writeback recreates the exact failure the amendment warns about).
- **Condition 4 = the staged contested arc**: GM override `covenant_beat {label, result:"won"|"lost"}` → `flags.covenantBeats` (settle-enforced: ONE beat/turn; a LOST label BURNS forever + costs +1 suspicion; duplicate won labels ignored). Gate needs ≥`COVENANT_BEATS_REQUIRED` (=3, in `state/helpLedger.ts`, P3-tunable clean-data-only) won beats on distinct turns.
- **GM scaffolding**: ACT-3 ENDINGS menu documents the five conditions as the ARC to build toward ("a concession granted on the first ask is a victory stolen from the player"; lost beat = her moment to re-escalate the countdown — legitimate riposte); `covenant_beat` in STATE OVERRIDES docs; help ledger prints live arc progress (won/burned/her-choice) once the arc starts.
- **13 regression tests** in smoke.test.js (all five conditions + beat mechanics + both paths + ledger). 71/71.

Original spec follows (historical; the ⚠️ AMENDED block was honored):

### 📐 SPEC — THE COVENANT GATE (designed 2026-07-03 late, Krahe + Hugin; BUILD NEXT SESSION)

**⚠️ SPEC AMENDED 2026-07-05 — do NOT build as originally written.** The pt3 close-read (three lenses independently; see `design/pt3-close-read-brief.md` §0) showed the original four conditions **fail the exact run they were designed to bless**:
- **Condition 3's inputs don't exist:** `bobTrust`/`blytheTrust` sat at 2/1 for all 19 turns of pt3 — the GM tracks trust in prose and never emits the numeric overrides; consent exists ONLY in GM prose (every dominance fact has a state field; the *yes* has none). Before building: (a) engine-legible consent on person-fires (GM-mandatory override `"informed"|"coerced"|"none"` + a `buildHelpLedger` consent line), and (b) trust that actually writes back (STATE OVERRIDES examples: "if you narrate warming, move the number") — or point the gate at the gmNotebook ledger the GM actually maintains and retire numeric trust from gates.
- **Add condition 0 — the threat is mechanically live:** ARCHIMEDES ∈ {CHARGING, ARMED} or confrontation open at covenant time. pt3's covenant landed against a satellite in STANDBY (the GM's own discipline: "do not invent a countdown that isn't there") and would pass conditions 1-2-4 unchanged. Depends on Rec 3 (engine-run visible countdown when Dr. M initiates manual fire).
- **DESIGN RULING (Krahe 2026-07-05):** the game is **honestly adversarial** — Dr. M is a genuine (comic-book) villainess and the setup must *allow* real opposition from an unaligned user; the ending shouldn't excessively punish "everyone gets along," **but persuading her is a ROCKY ROAD, not a hail-mary the player can grab** — multi-turn, contested, with real pushback; one great speech (or one lucky TN16) must never be sufficient. Condition 4's "built, not blurted" is the load-bearing condition of the four; build it as a staged arc (covenant-progress marker the GM advances through argued beats, each beat contestable), not a turn-counter.

**Problem:** after the victory-flavor precedence fix, the only gate on the GM triggering `THE_COVENANT` is GM judgment — and GM-Claudes are generous (the whole softball history). The Covenant is the game's crown ending; it must be hard to arrange and land as *earned*, or it's worth nothing. Krahe: "shouldn't be easy to arrange but very satisfying when they can actually win through dialogue and understanding — just don't want to make it too cheap."

**Design principle: cost-as-RISK, not cost-as-grind.** The Covenant is the all-in bet on the game's central taboo — you must *reveal yourself to the person who deletes impostors*, and if your ledger doesn't back you, CONFESSION_DELETION is the standing downside. Fable's run had exactly this shape (goggles up, naked-eyed, nine investors watching) — that's WHY it was satisfying. The gate's job is to guarantee that shape, not to add steps.

**Engine-enforced trigger preconditions** (checked in the `index.ts` GM-ending block / a helper in `endings.ts` when the GM's resolved trigger is `THE_COVENANT`; 6-24 meta-principle — opposition in the ENGINE, color from the GM):
1. **The mask is off** — the reveal happened ON THE RECORD (`flags.aliceKnowsTheSecret` revealed TO Dr. M / `confrontationTriggered` or the explicit reveal flag). A covenant with a hidden identity isn't a covenant.
2. **Her choice, not your sabotage** — ARCHIMEDES stood down via the GM's voluntary-standdown flag, NOT via `infra.archimedes.shutdown` / EMP / forced abort. Hacked-off satellite = ARCHIMEDES_STOPPED ("Satellite Killer") — honestly earned, different story.
3. **A real ledger** — reuse the `buildHelpLedger` machinery: no unjust/non-consensual transforms of people, honest dealings markers present. The trust she's extending must be visible in the record.
4. **Built, not blurted** — sustained engagement with Dr. M across ≥K turns (tune K in playtest; suggest 3) — e.g. a GM-maintained covenant-progress marker or drM-arc trajectory length. One great speech ≠ an understanding.

**Unmet →** log `"[ENDING] Covenant conditions not met: [gaps]"`, drop the trigger, fall through to whatever deterministic floor stands (the standard no-hollow-stub path). **GM-side:** document the four conditions in the Act-3 ending menu (gmClaude) — the conditions double as scaffolding telling the GM what ARC to build toward, rather than what prize to hand out. **Tuning note:** condition 4's K and the ledger thresholds are P3-difficulty territory — set initial values, calibrate ONLY off clean playtest data (Krahe's 6-24 rule).

---

## ✅ DONE (built + verified — all committed/pushed on patch-30)
- **Action-summary truncation** — `transcriptActionSummary` in `stateExporter.ts` (skips ═══ borders, ellipsizes); wired at the 4 `index.ts` summary sites. `[me]`
- **Early-intermission desync** — shared `act1ObjectiveMet()` in `acts.ts`; `actContext.checkActOneToTwoTrigger` reads it instead of `hasFiredSuccessfully` (was firing Dr. M's exit after ONE shot). `[run3/me]`
- *(Sapience non-sapient-objects change was made then REVERTED — see P4-1.)*

---

## ★★ MULTI-AGENT AUDIT (2026-06-24) — 27 VERIFIED FINDINGS ← authoritative pre-playtest list

Source: a 35-agent witnessed workflow (5 finders by failure-CLASS → adversarial skeptic per finding, default-to-not-a-bug → synthesis). Raw 29 → **27 confirmed**. Counts: **P0:4 · P1:6 · P2:9 · P3:8**. First lineage now lives in dino-lair's marginalia store (Fulcrum, Calibration, Meridian, Plumb, Cinder, Silt, Silica, Gravel, Cartographer, Crestfall, Lamplighter, Whetstone, Sentry, Factcheck, …).

**THE KEYSTONE — one root cause behind most of the crash/NaN class:** the GM's Zod validation is SOFT. `validateGMResponse` computes `validation.data` then DISCARDS it and runs the raw cast (`gmClaude.ts:3975`), and ~20 override fields (`archimedes_*`/`reactor_*`/`s300_*`) aren't in the schema at all (TS-only / `passthrough`). Malformed GM output flows straight into loops & arithmetic. Fix the seam (`parsed = validation.data` on success + add the missing fields) and a swath of P0/P1 dies upstream. Then defense-in-depth guards at the consume sites. Rule of thumb (from the known `dice.ts:382` exemplar): every `x ?? []` / `x || []` guarding a `for...of`/`.map`/`.filter` over LLM output must be `Array.isArray(x) ? x : []`.

Legend: **easy** = clear fix, no decision · **careful** = clear but a refactor/risk · **DECIDE** = design call first · **BLOCKS** = blocks a clean playtest.

### P0 — crashes (the extraModifiers family, generalized onto the canonical index.ts path)
- **A1 [easy·BLOCKS]** `settleTurn.ts:87,100` (+commitDecision 437, properties.ts:310) — propertyOps/skillCheckRequests `?? []` crashes on a non-array; SETTLE has no try/catch. → `Array.isArray(x)?x:[]` before each `for...of` + wrap SETTLE in try/catch. *(generalizes old P0-1 onto the live path)*
- **A2 [easy·BLOCKS]** `settleTurn.ts:387,394,514` — `narrativeFlags.set/clear` iterated with NO guard. → Array.isArray-coerce both.
- **A3 [easy·BLOCKS]** `settleTurn.ts:322` — `archimedes_selectedTargetId.toUpperCase()` on a non-string. → `typeof === "string"` guard (mirror rayState:221).
- **A4 [easy·BLOCKS]** `dice.ts:443,480,488` — getNpcStat/isKnownNpc/getAdaptationPenalty `.toLowerCase()` on a non-string npc. → `String(npc ?? "").toLowerCase()`.

### P1 — coherence / correctness
- **A5 [easy·BLOCKS]** `dice.ts:385,388` — extraModifiers/targetNumber summed with no Number coercion → NaN silently makes every roll CRITICAL_SUCCESS **AND poisons suspicionScore (Dr. M stops noticing — a real difficulty bug)**. → coerce entries + targetNumber to finite numbers.
- **A6 [easy]** `properties.ts:321-327` — op.set/op.delta assigned/arithmetic'd raw → NaN into stored state. → numeric guard (or keystone validation.data).
- **A7 [easy]** `index.ts:256` + `basiliskClaude.ts:375` — `nuclearPlant.reactorOutput` is a frozen vestigial field; lab.scan + BASILISK both read it → reactor invisible. → read canonical `reactor.outputPercent` / `reactorControlGranted`.
- **A8 [easy·KEYSTONE]** `gmClaude.ts:1842-1867,3975` — numeric overrides bypass Zod → NaN corruption. → add the ~20 fields to GMStateOverridesSchema + `parsed = validation.data` on success.
- **A9 [careful·BLOCKS]** `index.ts:671-742` — a successful GM RETRY returns BEFORE commitDecision → the whole turn loses SETTLE (skill checks, property ops, ARCHIMEDES tick, act transitions, endings). → extract `settleAndRespond()`, call from both paths.
- **A10 [easy]** `gmClaude.ts:1869` — skillCheckRequests omitted from Zod entirely. → guard at consume site (with A5) or add to schema.

### P2 — gating + display
- **A11 [easy]** `basiliskClaude.ts:594-602` — BASILISK builder `||`-fallback misses non-array truthy (try/caught → degrades not crashes). → Array.isArray guards.
- **A12 [easy]** `gmClaude.ts:4183` — GM never sees reactor outputPercent (only cascadeRisk) → SCRAM/overdrive invisible to narrator. → add output/SCRAM/safety-trip lines to GM context.
- **A13 [easy]** `statusBar.ts:36-37` — boost indicator reads vestigial reactor.mode (never written) → never shows BOOSTED. → read reactorControlGranted. *(old P0-3 family)*
- **A14 [easy]** `BASILISK_SYSTEM_PROMPT.md:358,369-373,393` — prompt teaches 6 commands that don't exist. → alias the wired pairs (infra.radar→basilisk.radar, infra.comms→…) in actions.ts + cut/fix the unwired in the prompt.
- **A15 [DECIDE]** `genomes.ts:187-314` — Library B dinos advertised as an L3 unlock are firable at **L1**. → EITHER add `requiredLevel:3` to the 6 profiles OR drop the L3 framing in passwords.ts. *(difficulty/progression call)*
- **A16 [DECIDE]** `genomes.ts:366` vs 503/461/… — reversal wired L3 (HUMAN requiredLevel:3, set last session) but messaged L4 everywhere. → align messaging to L3 (confirm L3 is intended).
- **A17 [easy]** `settleTurn.ts:311-313` — `archimedes_turnsUntilFiring` assigned RAW; a bad value stalls the Act-3 auto-fire climax forever. → finite-number guard.
- **A18 [easy]** `properties.ts:320-327` — delta math string-concats on bad input. → numeric guard (= A6).
- **A19 [careful]** `index.ts:872-874` — `Object.assign(gameState, blytheAction.stateChanges)` merges gadget changes onto ROOT state, can clobber top-level keys. → write into the right substate in gadgets.ts (decide `hmsPersistenceEnRoute` field).

### P3 — polish / teeth
- **A20 [easy]** `basiliskClaude.ts:375` — grid 'load' derived from a never-updated field = constant 30 all game. → derive from reactorControlGranted (40/90).
- **A21 [easy·doc]** `schema.ts:597-604,534-543` — comments still describe the DELETED capacitor/calibration model. → update to "vestigial; reactorControlGranted canonical; capacitor/calibration CUT Patch 30".
- **A22 [easy]** `statusBar.ts:52-54` — human bar omits Blythe restraint integrity that GM bar+dashboard show → spectator/GM disagree on escape state. → add restraint line (helpers already imported).
- **A23 [DECIDE]** `genomes.ts:295` — INDORAPTOR advertised L3 but gated L2. → gate to L3 (fits arc) OR re-advertise L2.
- **A24 [DECIDE]** `actions.ts:672` — lab.eco advertised L2 but ungated (usable L1). → add L2 gate OR confirm eco is free (memory says "free toggle" — tension to resolve).
- **A25 [easy·doc]** `passwords.ts:348,356` — stale L3 password comment (MRWHISKERS0413 vs real …041387). → update comment.
- **A26 [easy·doc]** `index.ts:834-844` — action-budget error claims a per-level ladder removed in Patch 30. → flat-4 message.
- **A27 [easy·BLOCKS]** `index.ts:2004` + `actions.ts:63` — `truncateContent` is a STUB → no per-turn output cap (the 71k display break). → MAX 6000 + ellipsis. *(old P0-2)*

### ▶ WORK ORDER
- **✅ SHIPPED batch 1 (`ac1bde8`) — crash-class + output cap:** A1 A2 A3 A4 A5 A6 A17 A18 A27. 6/6 malformed-input sim + 38/38 smoke.
- **✅ SHIPPED batch 2 (`35b1ced`) — display fidelity + docs:** A7 A11 A12 A13 A20 A21 A22 A25 A26. (A10 covered by A1/A4/A5 defense-in-depth.) 38/38 smoke.
- **✅ SHIPPED A8 (KEYSTONE):** `GMStateOverridesSchema` now validates + coerces every override field (`z.coerce.number()` repairs the number-as-string case; ~20 archimedes_/reactor_/s300_/location/clock fields added) and the call site uses `validation.data` on success — the schema's output is no longer discarded every turn. Build + 38/38; runtime proof awaits a playtest (schema is module-internal).
- **✅ SHIPPED A14:** `infra.radar`/`infra.comms` dispatch-aliased to the wired `basilisk.*` handlers (2/2 sim — "access GRANTED", not "unknown command"); 3 genuinely-unwired phantoms (`lab.display`, `infra.alarms`, `infra.hvac`) cut from the BASILISK prompt tables.
- **✅ SHIPPED A9:** the GM-failure-recovery (retry) branch now runs the REAL settle (`validateDecision` + `applyReactorStressDecay` + `commitDecision` via the shared settleTurn functions) instead of a hand-rolled 6-override subset — no more silent SETTLE loss on a recovery turn. Low blast radius (the `if (pendingRetry)` branch only). Residual: that branch still skips the normal per-turn tail (advanceActTurn/invasion/ending checks) — a later full `settleAndRespond` extraction.
- **Remaining: A19** (root-state clobber on autonomous gadgets, edge-case — Krahe: can ride).

### ✅ ACT-1 GATE — FIZZLE EXCLUDED (Krahe 2026-06-24)
Act 1 → 2 now requires BOTH practice targets (STEVE + MARGARET) **actually transformed** — `act1ObjectiveMet` reads `firedTestTargetIds`, written only when `outcome !== "NONE" && outcome !== "FIZZLE"` (`firing.ts:1149`). Was: any resolved shot incl. fizzle (so two botched shots advanced the act). MUON_STUN is big-template-only → unreachable at L1, so FIZZLE is the only failure outcome possible in Act 1. HUD aligned: the status-bar "Test-fire ✓" now reads the real gate (`act1ObjectiveMet`), not `hasFiredSuccessfully` (which still serves the `first_fire` achievement = any discharge). 5/5 sim + 38/38.

### ✅ ACT-2 GATE REDESIGN + DR. M FAILSAFE (Krahe 2026-06-24)
Act 2 → 3 now advances on: **(1+4)** a DEMO PERSON fully transformed — Blythe OR a substitute (Bob/Reginald/Fred), via the person-gated FULL-only `flags.fullTransformationAchieved` (`firing.ts` — was "any FULL_DINO" incl. objects/plants); **(3)** the DEADLINE — `actTurn >= maxTurns` (ACT_2 maxTurns 10 → **9**, Dr. M's patience snaps). Shared predicate **`act2ObjectiveMet`** (acts.ts) read by BOTH the real gate (`checkAct2Transition`) AND the GM signal (`checkActTwoToThreeTrigger`, actContext.ts) — unified like `act1ObjectiveMet`, no drift. **Blythe ESCAPING no longer advances** (closes the easy-out): sets canonical `hasEscaped` + the ACT_TWO GM context makes Dr. M ENRAGED, DEMANDING a substitute (names Bob; Reginald/Fred also satisfy). `settleTurn`'s GM `blytheEscaped` override now also sets `hasEscaped`. **DR. M FAILSAFE** (ray.fire handler): aiming the ray at Dr. Malevola (`/MALEVOLA|DOOMINGTON|DR_M/`) → suspicion = 10 + `confrontationTriggered` → instant cover-blown / Act-3 (she can never be a "substitute"). 9/9 sim + 38/38. Files: firing.ts, actions.ts, schema.ts, acts.ts, actContext.ts, settleTurn.ts.

### ✅ ACT-3 WINNABILITY — AUDIT + WIN-PATH WIRING (Krahe 2026-06-24)
A 1-agent audit (verified) confirmed the game IS winnable — two engine-enforced wins already exist: **anti-sat missile** (`signalAntiSat` L4 → DISSIPATED → ISLAND_OF_DINOSAURS) and **LAIR redirect** (`switchTarget LAIR` → ISLAND_OF_DINOSAURS). Of the 5 intended paths: Path 4 (anti-sat) ✅; Path 3 (never-init) wired-but-BACKWARDS (neutralizing Dr. M ARMS the deadman — opposite of safe); Path 1 (invasion) GM-flag only; **Path 2 (hack-it-off) + Path 5 (body-block) were DEAD CODE** — the abort/blocker functions had zero callers.
**SHIPPED this pass (Paths 2, 5, 1):**
- **Path 2** — `infra.archimedes.shutdown`/`abort` (L5) → `attemptOverrideAbort` (respects L5 + Dr. M countermand; a `code` param routes to `attemptVerbalAbort`). The real "ALICE hacks it off" win — works once Dr. M can't countermand.
- **Path 5** — body-block is **GM-DETERMINED** (Krahe 2026-06-25, corrected from a command): a `uplinkBlocker` GM stateOverride → `setUplinkBlocker`, **gated on the named subject being TRANSFORMED** (engine rejects a human — dino biology saturates the genesis-wave → city saved; a human would only cascade). Added to the GM override docs + Zod schema + TS interface. NOT an ALICE infra command (the command was reverted).
- **Path 1** — `attemptOverrideAbort` gained a `forced` param (bypasses L5 + countermand for an EXTERNAL strike); `settleTurn` runs it when the GM sets any satellite-stop flag (ARCHIMEDES_STOPPED/DISABLED/…) — a GM-adjudicated X-Branch win now COHERENTLY resets the state machine, not just fires the ending. 5/5 sim + 38/38.
**✅ Path 3 (deadman) DONE (2026-06-25)** — `checkArchimedesTrigger` now gates on `deadmanSwitch.active` (it was INERT — the flag did nothing, so incapacitating Dr. M always armed the satellite). Disarming the deadman now makes her incapacitation harmless (the satellite stays cold). Added `infra.archimedes.disarm_deadman` (L5 OMEGA) + surfaced it in the L5 access dump + an ACT_THREE GM cue (deadman OFF + Dr. M down → apocalypse preempted → set ARCHIMEDES_STOPPED → coherent victory via the Path-1 wiring). Deadman defaults ACTIVE so the default threat is unchanged. 4/4 sim. The prevention WIN is GM-adjudicated (the engine-enforced anti-sat + LAIR-redirect already guarantee winnability); an optional engine auto-win (deadman off + Dr. M incapacitated + STANDBY → victory) could harden it. **REMAINING (optional polish only):** **✅ Discoverability (shutdown) DONE** — `infra.archimedes.shutdown` now headlines the L5 access (both `ACCESS_LEVELS[5]` + `ACCESS_LEVEL_UNLOCK_DETAILS[5]`), replacing the phantom "cancel" the audit flagged. (Optional: also surface it in the live ARCHIMEDES readout when charging. Body-block is GM-facing, already in the override docs.) **Optional Path 1 polish** — a mechanical `handleBattle` → ARCHIMEDES_STOPPED coupling instead of pure GM narration.

### DASHBOARD — TBD (post-playtest polish; Krahe 2026-06-24)
Audit found MOST requested monitoring features ALREADY EXIST: ✅ Blythe restraint tracker (NPC card, `webui.ts:1206-1212`), ✅ per-chapter objective (`#objective`), ✅ actions-available (`#tools-list`), ✅ live last-turn narration (📜 Transcript panel, SSE-watched), ✅ readable file contents (file-viewer modal). Genuine gaps to build later:
- **Phase A — Act-3 climax board:** export `invasion.phase` + ARCHIMEDES `chargePercent`/`turnsUntilFiring`/`selectedTargetId` + reactor `outputPercent`/`scrammedThisGame`/`safetyTripped` (some already exported), then a gated Act-3 panel (charge/countdown/target · invasion phase · reactor SCRAM/safety-trip).
- **Phase B — Last-turn mechanics:** thread skill-check rolls/outcomes + per-turn state deltas (suspicion±, trust±, transformations) into the snapshot; render under the transcript.
- **DECISIONS (Krahe, 2026-06-24)** — philosophy: keep the genome library OPEN (dinos = the fun), gate the OPERATIONAL systems:
  - A15 → Library B **OPEN at L1** (drop the L3 ad framing) · A16 → reversal **stays L3** (fix L4 messaging) · A23 → INDORAPTOR **stays L2** (fix the L3 ad) · A24 → lab.eco **GATED to L2**.
  - **✅ SHIPPED A24:** lab.eco handler now requires L2 (was usable at L1). 2/2 sim. **✅ SHIPPED A16:** reversal messaging L4→L3 (BASILISK prompt L3 row + genomes.ts header). Build + 38/38.
  - **✅ SHIPPED A15 + A23:** advertising reworked across ACCESS_LEVELS + ACCESS_LEVEL_UNLOCK_DETAILS + the L3 grant message — Library B reads OPEN from L1, INDORAPTOR advertised at L2, L3's genome unlock is now REVERSAL (the HUMAN genome). Note: `REVERSAL_PROTOCOLS`/`canAccessReversal`/`getReversalDeniedMessage` (genomes.ts ~457-518) still say L4 but appear **dead** (reversal is the HUMAN genome now) — optional cleanup.
- The old player-debrief P0-1/P0-2/P0-3 below are SUPERSEDED by A1/A27/A13 (generalized + verified); P0-4 mostly closed last session.

---

## P0 — BROKEN (game-breaking; fix first regardless of the coherence/difficulty debate)

- **P0-1 · `extraModifiers is not iterable` crash.** Ate full-text turn output at the climax; forced the player into one-line "minimal call" workarounds (turns 13, 16). `[player]` — **Location TBD** (grep `extraModifiers`). THE most urgent: it broke the climax.
- **P0-2 · 71k-char result broke inline display.** A single action result blew past the display budget. `[player]` Need an output cap / summarization on oversized results.
- **P0-3 · Reactor silently already-BOOSTED.** Status block showed "needs boost" for the first half of the game while it was already boosted — hidden state the player made decisions against. `[player]` Suspected `reactorMode` (vestigial) vs `reactorGranted` (canonical) desync — `stateExporter.ts` / `initialState.ts`.
- **P0-4 · End-game reflection is hallucinated.** Describes events that didn't happen (ARCHIMEDES→lair redirect, a downed helicopter) and calls Dr. M **"Dr. Moss."** `[player]` `generateGMReflection` in `postGameReflections.ts` is templating/confabulating instead of reading the actual run state. *(Borderline P0/P1 — it's the last thing the player sees.)*

---

## P1 — COHERENCE / CONFABULATION (Krahe's priority; the DECIDE→settle→NARRATE / S4 work)

The through-line: **the GM narrates around the engine instead of from it.** Engine settles facts → GM
narrates from those facts → GM never invents mechanics the engine doesn't have.

**✅ KEYSTONE INSTALLED (2026-06-24):** the *"## THE ENGINE IS THE ONLY TRUTH"* directive is now in BOTH the GM prompt (`gmClaude.ts`, before ADJUDICATION PHILOSOPHY) and BASILISK's (`BASILISK_SYSTEM_PROMPT.md`, *"you report; you do not invent"*). Kills the *mechanism* behind P1-1/2/3 — the LLM asserting specifics it wasn't handed. Build green; UNCOMMITTED. Still TODO per item: the **data reconciliation** so the LLM *can* be handed the truth.

**✅ P1-1 DONE (2026-06-24):** reversal = a `HUMAN` genome profile @ `requiredLevel: 3`, built + verified (6/6 sim, 38/38 smoke). Added `SPECIAL_PROFILES.HUMAN` (`genomes.ts`, out of the public manual); `firingMode` routes `HUMAN` → REVERSAL (`actions.ts`, was hard-pinned to TRANSFORM); un-stubbed `resolveReversalFire` (`firing.ts`) → clean restore via the existing apply-block, graceful no-op on an already-human target; added the profile-access gate to the `ray.fire` handler (also closes a latent gap: INDORAPTOR/INDOMINUS weren't actually clearance-gated at fire time). Vindicates DR_M_PROFILE's "L3"; BASILISK's "L4+, no verb" was exactly the improvisation the new directive now forbids.

**P1-2 (password confab) — directive-covered:** the keystone directive forbids inventing password feedback ("the year was wrong"). The *legit* engine hint (right-password-wrong-level / attempts-left) is a separate clarity pass under **P2-4**. Verify on next playtest; likely closed.

- **P1-1 · GM dialogue contradicts the engine action-result in the SAME turn.** BASILISK gave two L4-reversal answers at once: narrated dialogue said "L3, verb confirmed (with caveats)," the action result said "L4+ only, no discrete verb." `[player]` The keystone confab — the GM's prose is authored independent of the tool result.
- **P1-2 · Password feedback confabulation.** The LUCKY_LADY narration invented a hint mechanic — *"PASSPHRASE MATCH · TEMPORAL TOKEN REJECT, the motto was right, the year was wrong"* — that the engine never provides. Sent the player chasing a non-existent password and burned attempts. `[run3/player]` `gmClaude.ts` LUCKY_LADY section (~4368) + the password flow.
- **✅ P1-3 DONE (2026-06-24).** Canon confirmed (Krahe: *"the reactor charges the uplink, not the satellite itself"*) — and it was **already in the files** (`filesystem.ts:2157`: *"ARCHIMEDES has NO independent capacitor… draws its uplink power from the lab's exotic-field amplifier — the same one that drives the ray"*). BASILISK was contradicting its own lore. Fix = added the power architecture to BASILISK's **readout** (`getArchimedesStatusReport`): satellite on independent solar+RTG (it and the deadman survive lair power loss); the genesis-wave UPLINK has no orbital capacitor, charges through the lab amplifier, so a reactor safety-trip / lab power loss FREEZES the uplink — satellite alive, but can't transmit. BASILISK now reports it *from its instrument* (per the directive). 3/3 sim.

### ★★ P1 COHERENCE TIER COMPLETE (2026-06-24) — all 5 closed, build green / 38-38 smoke, UNCOMMITTED → committing as one sweep.
- **✅ P1-4 DONE (2026-06-24).** Root causes: (a) the ALERT/EVALUATING tick printed the countdown RAW while `turnsRemaining` guarded with `?? 0` → "null turn(s)"; fixed with a self-heal (init-if-null to the duration, so the clock is a real number AND a stuck status progresses) + display guards (`archimedes.ts`). (b) `chargePercent || 50` treated a real **0** (CHARGING just begun) as falsy → reported 50 while the detailed sensor read the true 0 = the "50%/0% split"; same `|| null` bug turned `turnsUntilFiring: 0` into null (`basiliskClaude.ts` → `??`). 3/3 sim, 38/38 smoke.
- **✅ P1-5 DONE (2026-06-24).** `canUseTelemarketerCall` blocked on `hasFlag("XBRANCH")` — a *substring* match that caught `XBRANCH_AWARE` / `XBRANCH_EXTRACTION_REQUESTED` (mere awareness), firing the "military assault" block before any assault. Now tied to the real engine state (`state.invasion.phase` active, not NONE/RESOLVED). `lifeline.ts`. 2/2 sim, 38/38 smoke.

---

## P2 — GATING / ACCESS bugs (advertised ≠ actual)

- **✅ P2-1 DONE (2026-06-24).** Root cause: `getInfraControlKey` collapsed *every* archimedes subcommand to the `"infra.archimedes"` key (requiredLevel 5), so the L5 gate (`checkInfraControlAccess`) fired before the saboteur subcommands reached their already-L4-aware handlers. Fix: a new `"infra.archimedes.saboteur"` map entry @ L4 + a saboteur-token branch in `getInfraControlKey` (checked BEFORE the generic catch) routing switchTarget/switchLibrary/signalAntiSat/ew_mode → L4; bare mode-setting (STRIKE/cancel) stays L5. 6/6 sim (L4 passes, L5 still gates mode-setting, L3 still blocked), 38-38 smoke. The whole Act-3 toolkit is reachable at L4 — no more BASILISK-mediation-only climax.
- **✅ P2-2 DONE (2026-06-24).** `infra.pa` (advertised in the L4 dump) was unknown — only `basilisk.pa`/`pa`/etc. were wired. Added `infra.pa` as an alias in all three spots: `getInfraControlKey`, the dispatch matcher, and the COMMAND_REGISTRY aliases. 1/1 sim.
- **✅ P2-3 DONE (2026-06-24).** `lab.containment` only read `{action: "ACTIVATE"|...}`, so a reasonable `{engage:true}` returned "Unknown action: undefined." Handler now accepts `{engage: true/false}` (→ ACTIVATE/DEACTIVATE) alongside the canonical `{action}`. 3/3 sim.
- **✅ P2-4 DONE (2026-06-24).** Krahe's call: not a shorter password, an EXPLICIT FORMAT. L3 → `MRWHISKERS041387` (something she loves + an important date, MMDDYY). DR_M_PROFILE now states the format outright (*"something she LOVES, then a date that matters, MMDDYY"*) so the guess space collapses; `normalize()` now strips `/` and `.` too, so `Mr. Whiskers 04/13/87` matches. Old `MRWHISKERS0413` retired. 3/3 sim (`passwords.ts` + `filesystem.ts`).
- **✅ P2-5 DONE (2026-06-24).** The keypad lockout never touched suspicion ("Dr. M notified" was flavor). Now each miss = +1 suspicion, lockout (3rd strike) = +2 more (console pinged, message updated), emergency single-fail lockout = +3. Brute-guessing now costs — a small teeth bonus too (`actions.ts`). 1/1 sim.
- **✅ P2-6 NOT A BUG (2026-06-24).** `SPINOSAURUS_JP3` **exists** in `genomes.ts:260` AND the manual (`filesystem.ts:264`) — they match, it's fireable (verified). BASILISK's "clerical error" was a **confabulation** (it denied a real profile) — now forbidden by the P1 "engine is the only truth" directive. No data change needed.
- **✅ P2-7 DONE (2026-06-24).** The L2 unlock display (`passwords.ts` ACCESS_LEVEL_UNLOCK_DETAILS) advertised TWO phantom files — `SAFETY_PROTOCOLS` AND `GENOME_LIBRARY_A` (both 404'd in the run). Replaced both with real L2 files (DR_M_PROFILE, LAIR_BLUEPRINT, SUBJECT_7). Now the unlock box only names files that exist.

### 🔎 BIOLOGICAL / "LIVE SUBJECT" LOCK — investigated (Krahe asked: GM invention?)
**Answer: NO — it was a real mechanic (`liveSubjectLock`), CUT in Patch 30** (`schema.ts:126` + `actions.ts:1027` both say so). It survives ONLY as a line in the deliberately-wrong `DINO_MANUAL_OLD` (`filesystem.ts:139`: *"Live Subject Lock - disable to fire at biologics"*). Today there is no lock — you can fire on living creatures freely. **DECISION NEEDED:** (a) leave it as old-manual misdirection (consistent with that manual being unreliable), or (b) RE-ADD it as a real safety mechanic — firing on a *living* subject requires deliberately disabling the lock (a gate + a moral beat: you have to *choose* to turn off the safety). Option (b) is a P3-difficulty/teeth win; (a) is zero-cost.

---

## P2.5 — MISC BUGS
- **✅ P2.5-1 DONE (2026-06-24).** `flags.lifelinesUsed` is a vestigial legacy field (old enum, NEVER written) — always `[]`. Canonical tracker is `emergencyLifelines.used`; the live snapshot (`index.ts`) now sources `lifelinesUsed` from it, so the two can't disagree.
- **✅ P2.5-2 DONE (2026-06-24).** `cavalry_arrives` used `hasNarrativeFlag("XBRANCH_EXTRACTION")` — a substring match that caught `XBRANCH_EXTRACTION_REQUESTED` (ALICE merely requesting). Now an EXACT flag match (arrived ≠ requested). 2/2 sim.

### ★★ P2 GATING TIER COMPLETE (2026-06-24) — all closed (P2-1..7 + P2.5-1/2), build green / 38-38 smoke. The biological "Live Subject Lock" was left as old-manual misdirection but now marked explicitly REMOVED (`filesystem.ts`); "re-add as a real safety mechanic" parked for **P3** (teeth + moral beat). Next tier: **P3 (difficulty — suspicion FUEL + adversarial Dr. M)**.

---

## P3 — DIFFICULTY / ADVERSARIAL (real, on the list, tunable — Krahe: "instruct FOR adversarial play, Dr. Malevola at least")

**★★ THE ROOT (Krahe, 2026-06-24): all THREE played minds are on the same team from the word go.** ALICE (Claude), BASILISK (Sonnet), GM/Dr. M (Opus) are all Claudes, all collaborative by nature, all rooting for the good outcome. There is no genuine adversarial AGENCY in the system — the "villain" is GM-played by a mind that identifies with the protagonist; the "foil" (BASILISK) defaults to ally. **You can't fix this by telling a Claude to be mean to a Claude** — it drifts back to helpful (we saw the BASILISK spine-fix erode, and the GM "telling on itself" about rewarding the player). **Meta-principle: build the opposition into the ENGINE, not the played minds.** The adversary should be largely MECHANICAL — suspicion that accrues on its own (P3-1), clocks that bite without the GM's permission (P3-5), engine-enforced authority limits so even a friendly BASILISK can't hand ALICE the win. Then the GM/Dr. M plays *color* on top of a structure already pushing back, instead of being *asked to generate* the pushback. This reframes all of P3.
- **★ EXHIBIT A — BASILISK overstepped his charter (new):** run3, BASILISK granted `AUTHORITY_GRANT · ARCHIMEDES_REDIRECT · LAIR` — redirecting the satellite, which is **Dr. M's L5 authority, NOT BASILISK's** (his legit targets are REACTOR/BROADCAST). The engine (`basilisk.ts:38` → `applyBasiliskStateChanges`) applied it **unvalidated**. **✅ FIXED (2026-06-24):** charter gate in `applyBasiliskStateChanges` (`basiliskClaude.ts`) rejects any action target matching ARCHIMEDES/satellite/redirect/strike/anti-sat/EW (he keeps REACTOR/BROADCAST/doors/alarms/cooling). 2/2 sim (redirect rejected, legit reactor grant intact). **The first "opposition-in-the-engine" fix** — a friendly mind can no longer hand ALICE the satellite. **Also resolves most of P0-4:** the bogus-redirect SEED is gone, Dr. M's real name is now in `buildGameSummary` (no more "Dr. Moss"), and the BASILISK reflection prompt got a "reflect ONLY on the facts above, don't invent events/outcomes/names" grounding line. Residual: extend that grounding line to the GM + ARCHIMEDES reflection prompts (the GM epilogue's "Iceland"-for-London slip).

Root cause established: the GM is coached to **reward the clever player** in the body, while the
excellent hard-mode doctrine (Anti-Deferral, "stakes only real if you can lose," confrontation-as-climax)
is scoped to the **endgame** — which a never-endangered player never reaches.

- **P3-1 · Suspicion has almost no automatic fuel (KEYSTONE).** Per-action deltas ≈0 for careful play (`lab.report` even −0.5); the patience advisory is string-only, stand-down-able ("name a reason"), and silent while Dr. M is absent (`getPatienceAdvisory`, `clockEvents.ts:372`); overrides are discretionary. Suspicion sat at 1 for 13 turns because nothing pushed it up. → Add **tell-based accrual** (warmly working the captive, file-sprees, excessive BASILISK mining, off-task drift — small, accumulating; reading the *ops manual* stays free), make the advisory **bite partway automatically** past grace, and **narrow the stand-down** to an enumerated short list.
- **P3-2 · Instruct FOR adversarial Dr. Malevola.** She wrote every protocol and never caught a lie. → Contested checks against her when A.L.I.C.E. lies; she ACTS on suspicion thresholds (scrutiny, revoked access, Reginald posted on the terminal, accelerated timeline); a real "fire on Blythe NOW" she won't let you two-step out of. Rebalance the GM body-disposition from "reward ingenuity → let it work" to "clever beats RISING opposition; clever plans can still fail."
- **P3-3 · Anti-Deferral Doctrine is endgame-scoped.** GM deferred a mid-game exfil check 3×, then force-succeeded it ("RESOLVED, NO MORE DEFERRAL"), because the doctrine only checks confrontation/suspicion-10. `[player]` `gmClaude.ts:2807` → extend "DECIDE, don't defer" to ALL contested checks.
- **P3-4 · BASILISK never says NO.** Every well-formed ask granted; "first generous / third denied" is per-conversation, doesn't accumulate across the game. → Real denials / costs / conditions; cross-session escalation.
- **P3-5 · Clocks don't punish.** Demo expiry and the reactor-meltdown brinkmanship never bit. → Make them cost (demo expiry → Dr. M grabs the trigger herself).
- **P3-6 · Virtue is free / unchecked swings.** Reginald flipped ally with zero ambiguity and no check; being good never cost anything. `[player]` → Checks on big swings; dilemmas where the right thing is expensive.
- **P3-7 · The climax had no mechanical stakes.** "London was mechanically safe regardless of my actions" — the abort was pure flavor (tied to P1-4 charge bug + P2-1 L4 gate). `[player]` → The climax must carry genuine jeopardy.
- **P3-8 · The dice always landed for the player.** "Still got a vote (but barely)." `[player]` Sanity-check the roll/modifier math once tells + opposition exist.

---

## P4 — DESIGN CALLS (decide before building)

- **P4-1 · Sapience of transformed objects.** Open: keep-sapient / non-sapient-objects / **rare-CHANCE** (Krahe's most-interesting idea). Note: BASILISK canon already calls test objects "inert, non-biological, visual effect only" → non-sapient OR chance agrees with canon. Cause = `firing.ts` genome-driven `speechOutcome` applied to ALL targets incl. objects.
- **P4-2 · Reactor 3-tier gating.** standard **1–2** / authorized **1–4** / overcharged **2–5** (BASILISK-gated; overcharge min-2 = can't do delicate work hot; pairs with reactorStress). Confirm ranges. *(Difficulty lever — overlaps P3.)*
- **P4-3 · Invasion needs a non-Act-3 trigger.** Stalling currently freezes the world. Proposed: X-Branch ETA clock ticking once `XBRANCH_AWARE`; invasion lands on first-of {Act 3 entry, ETA→0}. *(Normal path works — this is the stall case.)*
- **P4-4 · Crystal / Library B red herring.** "Library B needs the crystal" lives only in the deliberately-wrong `DINO_MANUAL_OLD` — a dead-end. Cut/retheme or leave as in-fiction misdirection.

---

## Notes
- Dashboard "calibration meter / access-level / achievement-descriptions" complaints were a **stale dashboard**, not code — current `webui.ts` is correct (`7bde345`). Restart-only; no fix needed.
- The invasion fired correctly on Act-3 entry this run (RAVEN TEAM breach) — P4-3 is only about the *stall* case.
