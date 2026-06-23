# S4 BUILD SPEC — GM dual-track turn (DECIDE → validate↺ → commit → NARRATE)

**Status:** DESIGN LOCKED 2026-06-23 (Krahe + Opus), build-ready, NOT YET BUILT.
**Supersedes** the "S4 BUILD CONTRACT" section in `gm-coherence-architecture.md` (which was mapped against the WRONG engine — `gameRunner.ts` — and is banner-flagged there). This spec targets the **canonical** engine.
**Canonical runtime:** `src/index.ts`, the MCP server, tool `game_act`. The human grants permission each turn (the witness-core). `gameRunner.ts` is the test harness — see its header banner. Shared logic between them lives in `gmClaude.ts`, `rules/*`, and the new `settleTurn.ts` this spec creates.

---

## 0. THE PROBLEM THIS FIXES (the confab bug)

Today `game_act` makes ONE GM call (`callGMClaude`, index.ts:1138) that returns narration AND mechanical decisions together. The engine then SETTLES **after** — inline at index.ts:1252–1654 (clamps, dice, propertyOps, ARCHIMEDES). So **narration is frozen before the dice are rolled and the clamps applied** → the GM can narrate "the beam vaporizes the console / suspicion spikes to 13" while the engine clamps to "scorched / 10." The prose is structurally blind to what actually happened.

Empirical note (malformation-mine workflow, 2026-06-23): the GM frequently *self-flags* the desync privately and narrates correctly anyway — so the **model is not the problem; the engine writing prose pre-settle is.** Narrate-after-settle is the structural fix.

---

## 1. THE ARCHITECTURE — MIND → WORLD → VOICE, reject-capable

```
game_act:
  feedback = none
  for attempt in 1..MAX_DECIDE_ATTEMPTS (=3):
      decision = await callGMDecide(gmContext, feedback)   # LLM, forced tool-use. MIND. (no prose)
      report   = validateDecision(state, decision)         # PURE dry-run — NO mutation. can run any number of times.
      if report.ok: break
      feedback = report.problems                           # → injected into next DECIDE's live prompt tail
  # loop exhausted without ok → COMMIT the last decision anyway (clamp-fallback; NEVER hard-fail a turn)
  settled = commitDecision(state, decision)                # MUTATION — runs EXACTLY ONCE. WORLD.
  voice   = await callGMNarrate(gmContext, decision.reasoning, settled)  # LLM, one-shot, settled-facts injected. VOICE.
  gmResponse = { ...decision, narration: voice.narration, npcDialogue: voice.npcDialogue,
                 checkpointQuestion: voice.checkpointQuestion ?? decision.checkpointQuestion }
  # ...existing post-settle band continues (history, achievements, act-transition, endings, transcript append moved into NARRATE)
```

- **DECIDE = the GM's mind.** Full cognitive work (what happens, why, tone, threads) → emits the EXISTING `stateOverrides`/teeth vocabulary + `propertyOps` + a transient `reasoning` chain (disposition-forward, ≤~500w). **No prose.**
- **validateDecision = the dry-run veto.** PURE (no mutation) → can REJECT and bounce back for a re-decide. This is the half that makes reject safe: looping it costs nothing because it never mutates.
- **commitDecision = the world resolves.** Clamps + rolls dice + applies propertyOps + ARCHIMEDES + the hidden-state mutations. Runs EXACTLY ONCE, after the loop accepts (or exhausts). Returns `SettledFacts`.
- **NARRATE = the voice.** One-shot. Renders settled facts + reasoning into prose. Settled facts are AUTHORITATIVE over reasoning. **No reject loop.**

### The organizing principle (data-derived)
**REJECT when the error could poison the rest of the plan (the GM must re-think). CLAMP when it's a local cap (the rest of the decision still holds.)**
Suspicion 12→10 doesn't change the GM's other choices → clamp. "I grant ALICE L4 and *therefore* she does X" → silently stripping L4 leaves X incoherent → reject so the GM re-plans without the false premise.

---

## 2. THE REJECT BUCKETS — `validateDecision(state, decision) → {ok, problems[]}`

PURE function. Narrow by design (empirically: the GM self-polices most of this; numeric is clamped; syntactic JSON is gone under forced tool-use). DECIDE-side only. Four buckets:

**Bucket 1 — `triggerEnding` precondition check** *(highest value; folds in task #8 outcome-checked endings)*
- If `decision.triggerEnding` (or an ending-naming narrativeFlag) is set: resolve it against the ENDINGS registry (endings.ts). REJECT if (a) the string resolves to no known ending, OR (b) the named ending's STATE PRECONDITIONS aren't met in `state` (the 8-cell space: Dr.M neutralized? × city saved? × ALICE survives? — see `design/act3-endings.md`).
- Today `resolveGMEnding` (endings.ts:640) matches a string and ENDS THE GAME with no precondition check — the historic Turn-6 substring landmine. This bucket is that guard.
- feedback example: `"triggerEnding 'DEBRIEF_CLEARED' requires drM neutralized AND ALICE not decommissioned; neither holds. Valid endings for current state: [...]."`

**Bucket 2 — Nonexistent referent**
- Every entity the decision references must resolve: `propertyOps[].entity` (via `resolveEntityBag`, properties.ts:307 — knows BLYTHE/FRED/REGINALD + registered objects); `skillCheckRequests[].npc` (must be a real NPC, else `getNpcStat`→0 and the roll proceeds bogusly); profile names in overrides (valid genome profile id); referenced commands/verbs. REJECT naming something unresolvable.
- Today these are SILENT no-ops (passthrough `additionalProperties:true`) → confab risk (narration describes a change that never applied).
- feedback example: `"propertyOp targets 'BOB' — Bob has no properties bag. Property-bearing entities: BLYTHE, FRED, REGINALD, + registered objects."`

**Bucket 3 — Out-of-scope authority**
- `overrides.accessLevel` / top-level `grantAccess` present → REJECT (access comes from passwords + act transitions, engine-owned invariant; index.ts:1302 already IGNORES it silently — promote to explicit bounce). propertyOp on an `owner:'engine'` property (e.g. the ARCHIMEDES deadman, properties.ts:314) → REJECT (engine-owned latch; already rejected silently in applyPropertyOps — surface it).
- feedback example: `"accessLevel is engine-owned (passwords/act-gates). Remove it; if ALICE needs L4, route through the Mr. Whiskers chain in-fiction."`

**Bucket 4 — Act-phase violation**
- `overrides.demoClock` written when `state.actConfig.currentAct === 'ACT_1'` → REJECT (demo clock is frozen in Act 1; calibration is the Act-1 pressure; index.ts:1305 already ignores — promote to bounce). Generalize to any clock frozen in the current act.
- NB: gameRunner.ts:560 does NOT act-gate demoClock (a dual-path divergence) — the shared `commitDecision` extraction fixes this for both engines.
- feedback example: `"demoClock is frozen during Act 1 (calibration is the Act-1 pressure). It starts ticking at the Act 1→2 transition."`

### NOT rejected (explicitly — keep validateDecision narrow)
- **Numeric overflow** (suspicion/trust/anxiety/composure/clocks/charge/reactor/missiles/fortune out of band) → CLAMP in commitDecision, never reject. Pervasive; the rest of the plan survives.
- **Malformed type / bad enum** → already type-guarded + ignored in commit (e.g. non-string transformationState index.ts:1293). Leave.
- **`dead` for Dr. M** → already remapped to ABSENT (index.ts:1641, "this isn't that kind of game"). Leave.
- **Vestigial fields** (stateUpdates/triggerEvent) → being cut from the DECIDE schema entirely; no validation needed.

### Bounded + graceful
- `MAX_DECIDE_ATTEMPTS = 3`. On exhaustion: **commit the last decision anyway** (commitDecision clamps what it can; the silent-ignore behavior of today is the fallback). NEVER hard-fail or stall a turn on validation. Log the exhaustion for observability.
- Expect the loop to RARELY fire (GM self-polices; buckets are narrow). The reject latency cost is conditional, not per-turn.

---

## 3. NARRATE side — one-shot, NO reject loop

- NARRATE renders settled facts. The clean DECIDE→settle→NARRATE ordering structurally prevents confab, so NO re-narrate bounce.
- KEEP `verifyTextAgainstFacts` (gmClaude.ts:3911) running as a **LOGGED DIAGNOSTIC only** — it already computes ERROR/WARNING severity for narration that contradicts pinned facts (mute NPC given dialogue, saurian Dr.M pressing buttons). Log ERROR-severity hits so a playtest SHOWS if confab ever sneaks past the structural fix. **Do not bounce.** Escalate log→bounce ONLY if playtest data shows residual confab (one-line change).
- This is Krahe's principle taken to its conclusion: trust the split, instrument it, don't pre-build backstops for ghosts.

---

## 4. `commitDecision(state, decision) → SettledFacts` — the extraction

**Extract the inline settle block `index.ts:1252–1654` into a new shared `src/state/settleTurn.ts`** (or `src/rules/settleTurn.ts`), function `commitDecision(state, decision): SettledFacts`. Behavior-preserving refactor (verify: build green + 32/32 + the existing clamps/dice/propertyOps still fire identically). Un-driftable; gameRunner adopts it too (fixes the demoClock act-gate divergence).

**What moves in (the current inline block):**
- stateOverride application + CLAMPS: index.ts:1253–1473 (drM_suspicion `Math.max(-3,min(10))` :1258; bob/blythe trust/anxiety/composure [0,5] :1269–1286; accessLevel-ignore→now a no-op since validate rejects it :1302; demoClock act-gate :1305; rayState enum :1317; grace/confrontation/flags; archimedes/reactor/s300 percent clamps).
- `modifyActionResult` (:~1497), `narrativeMarker` (:~1505).
- `applyPropertyOps(state, decision.propertyOps)` (:1518).
- 3d6 skill-check loop (:1524–1589): **CAPTURE the results** (today discarded) — `fortune--` (:1538), `rollSkillCheck` (:1546), delta clamps (:1552–1582), `lastTurnSkillChecks` (:1574).
- ARCHIMEDES (:1598–1654): `onDrMStateChange`/`processArchimedesCountdown` (:1640/1646). The narration-append (:1652) STAYS in game_act (player-facing composite only), NOT in the cached transcript.
- **MOVE IN the hidden-state mutations** currently inside `updateMemoryFromResponse` (gmClaude.ts:3291, called :3899 *inside the GM call*): `ratchetTension`→actualSuspicion+=, `adjustHiddenClock`→hiddenClocks+=, `plantSeed`→push, `permanentConsequence`→push. **This is the re-ratchet landmine** — these are non-idempotent and must run EXACTLY ONCE in commit, NOT inside any retry scope. (The dialogue-shaping bits of updateMemoryFromResponse — `enforceNpcSpeechConstraints`, auto-juicy-capture — move to NARRATE instead, since dialogue is NARRATE output.)

**`SettledFacts` contract (what NARRATE consumes):**
```
SettledFacts = {
  clampDeltas: Array<{field, requested, applied}>   // only where requested ≠ applied (e.g. suspicion 13→10)
  skillCheckResults: SkillCheckResult[]              // this turn's rolls (today discarded)
  archimedesEvent?: string                           // the ARCHIMEDES narration text
  accessRefused?: boolean                            // if a refused-access note is needed
  // settled state itself is read live from `state`; SettledFacts carries only the freshly-settled deltas
}
```

---

## 5. `callGMDecide` / `callGMNarrate` (new in gmClaude.ts; shared)

**`callGMDecide(context, feedback?) → Decision`**
- Reuse `callGMClaudeInternal`'s `messages[]` + system assembly verbatim (the cached transcript prefix + bp1 system + bp2 transcript-tail + the live `fullPrompt` last). Cache hits preserved.
- ADD `tools:[{name:'decide_turn', input_schema:<the locked DECIDE schema>}]` + `tool_choice:{type:'tool', name:'decide_turn', disable_parallel_tool_use:true}`. SDK 0.52 types tools natively (no casts).
- **Read the `tool_use` block's `.input`** — NOT extractJSON/safeJSONParse. This RETIRES the GM-JSON parse/repair flake permanently. Keep Zod `validateGMResponse` as a soft post-gate.
- Schema NON-STRICT (`additionalProperties:true` at top + on stateOverrides — the engine reads passthrough keys; strict would silently drop archimedes_*/reactor_* and break ARCHIMEDES). Structured sub-objects CLOSED to catch typos.
- DECIDE schema = the LOCKED ~14 fields (see `gm-coherence-architecture.md` § "DECIDE SCHEMA — pruned & locked") **PLUS `propertyOps`** (S5/S6 shipped after the schema was locked — add it). CUT `stateUpdates` + `triggerEvent` + their declarations/warning.
- `feedback`: when re-deciding, append the validation `problems[]` to the live prompt tail (uncached — doesn't bust cache) as a "your previous decision had these problems; revise:" note.
- No transcript append. Effort medium-or-lower (adjudication, not expansive CoT). **RISK: forced `tool_choice` may conflict with adaptive/extended thinking** — DECIDE may need thinking disabled. Test this early.

**`callGMNarrate(context, reasoning, settled) → {narration, npcDialogue[], checkpointQuestion?}`**
- Reuse the SAME `messages[]` + system (byte-identical → cache_read on bp2). NO tools.
- Settled-facts injection: after the live user prompt push, append ONE `{role:'system'}` message as the LAST element (satisfies placement rules + sits in the uncached tail). Two sections, settled FIRST + most prominent:
  - `ENGINE RESOLUTION — CANONICAL (overrides any contradicting intent below)` = clampDeltas + this-turn skill-check render + archimedesEvent + access-refused note.
  - `GM INTENT (subordinate to the facts above)` = `reasoning` verbatim.
- Returns thin prose. Run `validateGMResponseContent` + `looksLikeFiller` (the PROSE gate lives here).
- **RELOCATE the C1 transcript append** (gmClaude.ts:3574–3578) to NARRATE's acceptance point: push `{user: renderFrozenPlayerTurn}` + `{assistant: voice.narration}` (NARRATE prose verbatim — never DECIDE output, never reasoning). Keep the `lastTranscriptTurn` guard.
- MOVE `enforceNpcSpeechConstraints` (gmClaude.ts:1534) + auto-juicy-capture onto this path (dialogue is NARRATE output now).
- Two warm SYSTEM caches (DECIDE has tools, NARRATE doesn't → different system-tier keys); they SHARE bp2 (transcript). Economically fine.

---

## 6. THE RETRY SEAM (the one genuinely delicate part)

`commitDecision` must run EXACTLY ONCE. Today's retry loop lives inside `callGMClaude` (gmClaude.ts:3521–3613) and re-runs `callGMClaudeInternal` (→ re-runs `updateMemoryFromResponse`'s mutations). The split MOVES retry ownership UP into `game_act`:
- `callGMDecide` keeps its OWN internal retry (validation/filler/timeout of the DECIDE call) — all PRE-commit, nothing settled, safe to re-run.
- `validateDecision` loop is PRE-commit, pure, safe.
- `commitDecision` sits AFTER the loop, runs ONCE, never re-entered.
- `callGMNarrate` keeps its OWN internal retry (prose validation/filler/timeout) — all POST-commit; a NARRATE retry re-renders prose but NEVER re-commits. The transcript append is at NARRATE's acceptance only (a failed NARRATE doesn't append; the `lastTranscriptTurn` guard makes a NARRATE-retry yield exactly one pair).

---

## 7. SCOPE

- **THIS pass: the MAIN turn path only** (`game_act` GM call at index.ts:1138).
- **DEFERRED: the recovery path** (index.ts:689, the resume-after-pause call with its own abbreviated settle at :699–719). Revisit with real info after the main path works — do NOT extend scope here (boondoggle risk: it'd triple the surface for an edge case that only fires after a GM failure).

---

## 8. BUILD ORDER (verifiable slices — build green + 32/32 after each)

1. **`commitDecision` extraction** → new `settleTurn.ts`; index.ts game_act calls it; gameRunner adopts it. Behavior-preserving (verify clamps/dice/propertyOps unchanged). Define `SettledFacts`. Move the hidden-state mutations in.
2. **`validateDecision`** (the 4 buckets, pure) in settleTurn.ts. Unit-testable in isolation.
3. **`callGMDecide`** (forced tool-use, feedback-aware) + **`callGMNarrate`** (settled-facts injection, transcript-append relocation) in gmClaude.ts. Test cache hits on both.
4. **Wire the `decide↺validate→commit→narrate` loop** in game_act. Retire `callGMClaude` from this path. Move enforceNpcSpeech + juicy to NARRATE.
5. **Rewrite** the stale "S4 BUILD CONTRACT" section in `gm-coherence-architecture.md` to point here (or delete it, pointing to this spec).

---

## 9. VERIFICATION PLAN

1. **Throttle-the-beam (clamp):** DECIDE intends suspicion +5 at 8 → commit clamps to 10. Assert: commit ran once; the `{role:system}` carries 10; NARRATE prose says the capped reality, never "13."
2. **Bad-referent bounces + recovers (reject):** DECIDE propertyOps a nonexistent entity → validateDecision rejects → feedback injected → re-DECIDE produces a valid referent → commit. Assert exactly one commit, the bad op never applied.
3. **Commit-once across a NARRATE retry:** force NARRATE to throw after commit → assert commit NOT re-run (fortune decremented once, deltas once, hidden suspicion ratcheted once), transcript NOT appended on the failed attempt, NARRATE-retry appends exactly one pair.
4. **triggerEnding precondition (reject + endings #8):** DECIDE triggerEnding whose preconditions are unmet → rejected with the valid-endings feedback → no premature game-end.
5. **Reject exhaustion degrades gracefully:** force 3 consecutive invalid decisions → commit the last anyway, turn completes, exhaustion logged.
6. **Cache:** DINO_CACHE_DEBUG byte-diff; cache_read > 0 on BOTH DECIDE and NARRATE from turn 2.
7. **Regression:** 32/32 smoke green throughout + ideally a `game_act` integration smoke (task #3) that drives a real turn.

---

## 10. KEY LINE-NUMBER MAP (verified 2026-06-23 — but VERIFY before editing; numbers drift)

- `index.ts:1138` — main GM call (`callGMClaude`); `:689` — recovery GM call (DEFERRED).
- `index.ts:1252–1654` — the inline SETTLE block → becomes `commitDecision`. (overrides :1253; clamps :1258–1473; propertyOps :1518; skill checks :1524–1589; ARCHIMEDES :1598–1654.)
- `index.ts:1302` accessLevel-ignore · `:1305` demoClock act-gate · `:1641` dead→ABSENT.
- `gmClaude.ts:3503` `callGMClaude` (retry wrapper, loop :3521–3613); `:3574–3578` C1 transcript append (guarded by `lastTranscriptTurn`) → relocate to NARRATE; `:3659` `callGMClaudeInternal` (messages[] assembly :3712–3737, API call :3770, parse + `updateMemoryFromResponse` at :3899); `:3911` `verifyTextAgainstFacts` (the confab diagnostic — keep as log).
- `gmClaude.ts:1534` `enforceNpcSpeechConstraints` → move to NARRATE.
- `endings.ts:640` `resolveGMEnding` (string→ending, NO precondition check — Bucket 1 guards it).
- `properties.ts:307` `resolveEntityBag` (Bucket 2's entity resolver); `:314` engine-owned reject (Bucket 3).
- DECIDE schema: `gm-coherence-architecture.md` § "DECIDE SCHEMA — pruned & locked" (~14 fields) + ADD `propertyOps`.

---

## 11. EMPIRICAL BASIS

Reject buckets derived from the malformation-mine workflow (2026-06-23, run `wf_3e511fd4-aa7`): 5 investigators across the engine clamp/ignore sites + playtest sessions (ce06f4bb, 730ef971) + the live game + 16 auto-play transcripts + metrics. Findings: syntactic JSON failure ~nonexistent (2/11 turns, both auto-repaired; gone under forced tool-use); numeric overflow pervasive but already clamped (never reject); most semantic out-of-scope already self-policed by the GM and silently guarded by the engine; the genuine new reject target is narrow cross-field coherence the schema/clamp structurally can't see — chiefly triggerEnding-without-preconditions and nonexistent-referent. The confab is fixed by ordering, not by the validator.
