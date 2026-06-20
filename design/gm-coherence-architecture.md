# GM Coherence & the 2-Phase Turn — Analysis & Notes (pre-build)

**Status:** ANALYSIS / NOTES ONLY (2026-06-19). **Not built** — flagged delicate; the build is a dedicated fresh session. This captures the Krahe + Claude design discussion so the build starts warm. Companion to `architecture.md` (as-built) and `act3-endings.md`.

## Why this exists
Coherence loss has **sunk prior alpha versions.** The current GM memory **drops too much** — at act transitions it *slices away* coherence-critical layers rather than compressing them. Budget reality: late-series Opus runs ~1M context; full games have finished **under 200k**. There is enormous headroom — **bias hard toward retention.** (Krahe: "I'd rather bias on the side of a fun and coherent experience for all parties than cheap and fast.")

## The 2-phase GM turn (shapes everything downstream)
Formalizes the already-intended "layered GM turn / state-is-canonical" design, and structurally fixes the **confabulation bug** (GM narrated the opposite of what the engine reported; the GM wasn't bound to canonical state).
- **Phase 1 — mechanics / world evolution:** settle the canonical state (engine rules + the GM's discretionary evolution via structured tool-calls / overrides). **No prose.**
- **Phase 2 — narrative:** narrate the *settled* state. Prose, bound to phase-1 truth.
- **Why the memory design is downstream:** the phases want different context slices. Phase 1 ← world state + event register + rules + recent mechanical deltas. Phase 2 ← settled state + the *fat* narrative memory (raw window + all summaries + threads + character/thematic layer). **Synergy:** the narrative phase is exactly where fat coherent memory pays off — fattening memory and splitting the turn reinforce each other.
- **Cost:** 2 LLM calls/turn. Accepted (coherence > cost). Phase 1 may be smaller/cheaper.
- **Open:** one call with two structured sections vs two calls; how settled state passes phase-1 → phase-2; whether phase 1 is a distinct GM call or just engine-rules + GM `stateOverrides` (the current shape).

## The governing principle: COMPRESS, don't DROP
The current flaw isn't summarizing — it's *discarding*. Old information should compress into durable registers, never be sliced into oblivion. This one reframe organizes the whole memory design.

## Memory layers — by drop-policy
- **NEVER-DROPPED**
  - **Running event register** — the canonical log of consequential events (the coherence spine). Append-only.
  - **Reminders-to-self** — open threads, planted seeds, promises made, payoffs-pending. *Update* (resolve) but never silently drop.
  - **Permanent consequences** — exists (`gmMemory.permanentConsequences`); keep, never slice.
- **WINDOWED (recent full detail):** raw exchanges — **3 → ~5-6** (Krahe: "at least 5"). Ceiling note: do NOT go to all-raw (full transcript) — balloons prompt + churns cache; summaries cover old turns.
- **ALL-BUT-COMPACT:** turn summaries — keep **ALL** (compact, cheap; rewire act-transition compaction to retain).
- **LIVE:** world state — fresh, full, each turn (already).
- **STRUCTURED:** NPC/relationship arcs, suspicion, awareness (exists in `gmMemory`).
- **WITNESS-IMPRESSIONS — the "something else" (RESOLVED, Krahe):** NOT a single objective ALICE-character model — a **chorus of per-NPC *subjective* impressions of ALICE.** Each witness (Dr. Malevola · Blythe · Bob = primary; Reginald, Fred, others = situational) holds their OWN running impression, formed only from **the parts of ALICE's actions they personally witnessed.** Partial + perspectival + disposition-colored (Dr. M suspicious, Bob trusting, Blythe professional). NEVER-DROPPED. Three reasons it's load-bearing:
  - **It IS the debrief.** Blythe's report = Blythe's impression (the heaviest survival-stub input); Dr. M's impression → suspicion/deadman/act-verdict; Bob's → does he carry her drive (the escape). The character layer and the endings layer are the *same* layer.
  - **Partial observation = a confabulation guard.** Requires **witness-tagging** (consequential events carry who-saw-them) so an impression holds only what that NPC could actually know → no NPC reacts to what it couldn't have seen. Same coherence goal as the 2-phase turn, different lever.
  - **It's the synthesis layer over the existing `npcAwareness`** (which tracks discrete observations but gets `.slice`'d away). Observations COMPRESS into a narrative impression ("Bob believes she's quietly on his side") — never discarded. Compress-don't-drop, applied to character.
  - **Design:** GM-synthesized (phase-1 updates each read from what was witnessed; phase-2 narrates NPCs acting on their impression); weighted (primary 3 always tracked; minor NPCs situational).
  - **Thematic payoff:** the game's thesis is *identity is witnessed — partial, made in relationship.* There's no single ledger of "the real ALICE"; she's distributed across who saw what. **The mechanic embodies the theme.**

## Current-system audit (what drops what — the fix targets)
- **Raw exchanges: last 3 only** — `gmClaude.ts` ~681 ("HOT: Last 3 exchanges - COMPACT format to reduce memory bloat").
- **Act-transition compaction DROPS** (the over-aggressive slices, `gmClaude.ts` ~1031-1158): `gmNotebook.slice(-3)`, `turnSummaries.slice(-8)` current-act, cross-act `.slice(-30)` markers / `.slice(-20)` summaries, `valueReveals`/`unfulfilledPromises.slice(-3)`, callbacks/plantedSeeds filtered. These should COMPRESS (into the event register / reminders) not vanish.
- **Epilogue is a COLD single-shot** — `gmClaude.ts` ~505-562: builds its own lean GAME SUMMARY `contextPrompt`, **no history, no help-ledger**. → make it **in-context** (recent exchanges + all summaries + the help-ledger from `buildGameSummary`). The payoff deserves the full memory.
- **Prompt caching** exists (ephemeral) — preserve a cacheable stable prefix as history grows (cost/latency stay sane).

## This ABSORBS the remaining Act-III endings work
The epilogue enrichment designed in `act3-endings.md` (the "DOES ALICE SURVIVE POST-GAME?" survival stub — heavily weighted by **Blythe's report**, credit-for-trying [helped Blythe escape / warned of S-300 / moved against Dr. M or guards / put herself at risk] but **outcome weighs heavily**; the tone reframe — smirking-villainy sharpened to weight, flex-by-desert, fixing the prompt's blanket "DEFEAT: NOT mocking"; the ~2-paragraph length; Krahe's sample fates as calibration examples) is **part of this GM rework**, because the epilogue should run in the GM's full context, not as a cold single-shot. Build the epilogue here, not separately.

## Open questions for the build session
1. 2-phase wiring: two calls vs one with two structured sections; how settled state passes phase-1 → phase-2; is phase 1 a distinct GM call or engine-rules + GM overrides?
2. What IS the "something else" layer (ALICE-character / thematic throughline / pressure vectors)?
3. The compaction→compression rewrite: where do the currently-dropped layers compress TO (the event register + reminders)?
4. Caching strategy for the growing prefix.
5. Interaction with the 3-turn checkpoint consolidation + the act-transition memory.

## Sequencing
Delicate central plumbing — coherence is the thing that's bitten. **Dedicated fresh session, built carefully with verification.** The Act-III endings work (ISLAND + 4 endings + help-ledger) is independent and can **bank first** (now banked: `62c1c83`).

---

# BUILD SPEC — converged 2026-06-19 (Krahe + HUGIN)

Supersedes the open questions above where they conflict. Grounded in a full read of the real code (audit run `wf_419d17c6`). This is the build contract.

## Ground truth (verified against current source)
- **One GM LLM call/turn** (`gmClaude.ts:3870`) returns prose + mechanics together. "Decide-then-narrate" is a *prompt convention only* (Two-Voice Protocol, `2041-2092`) — there is **no structural split**.
- Engine settles firing (`actions.ts:565`) and BASILISK (`gameRunner.ts:1148`) **before** the GM call, but **clamps** overrides (`applyGMOverrides`, `gameRunner.ts:1200`) and **rolls** skill-check dice (`processSkillChecks`, `1203`) **after** it. → single-call narration is structurally blind to clamps + dice. **That timing is the confabulation vector.**
- The lab is modeled as fixed typed **systems** (lighting / fireSuppression / blastDoors / containment / PA / broadcast / reactor / ray / ARCHIMEDES / S-300) over an **8-room enum** (`RoomIdEnum`: MAIN_LAB, SERVER_ROOM, CORRIDOR_A, CORRIDOR_B, GUARD_ROOM, DR_M_OFFICE, REACTOR_ROOM, SURFACE). There is **NO object/item layer.** Invented things have nowhere to persist → the static-world root cause.
- `hiddenNpcStates.drM.suspicionLedger[]` ("PERSISTENT across acts"), `bob.guiltySecrets[]`, `blythe.hiddenResourcesRevealed[]` are the **proven never-dropped per-NPC registers**; `permanentConsequences[]` is the only never-dropped global. **These are the templates to copy.**

## Governing principles
1. **Compress, don't drop.** Old info compacts into durable registers; never sliced to oblivion.
2. **Engine wins on what it models; GM wins on what it invents.** Confabulation = *contradiction* of canon (forbidden). Invention = *addition* to canon (always free). The split forbids the contradiction and never touches the addition.
3. **Sequence-correctness is the spine.** reason → formalize → instantiate → verify → narrate. Each step is downstream of the previous one having *settled*. (Krahe: the single most important thing to get right.)
4. **Coherence > cost.** Do not pre-optimize tokens; just stay under context limits. Optimize once it works solidly.

## The 2-phase GM turn — 5 sub-phases, 2 LLM calls
1. **PARSE** *(engine, no LLM)* — actions already resolved, BASILISK already moved, lair-delta computed. Assemble canonical-so-far + fat memory + scratchpads + object registry. Just gathering the truth so far.
2. **DECIDE** *(LLM call — high effort, generous tokens; the "important part")* — GM reasons like a human GM: who reacts how, what happens, **what gets invented**. Returns **`{ruling, operations[]}` with `ruling` FIRST** so the ops list is downstream of free reasoning (reason-then-formalize in one inference). **Prose-free.** The `ruling` doubles as the intent-note for NARRATE.
3. **INSTANTIATE** *(engine, deterministic)* — apply `operations[]`: adjust suspicion/trust (clamp), spawn/mutate/move objects, write NPC + lab scratchpad notes, plant seeds. Decisions become real state.
4. **VERIFY** *(engine, deterministic — the real confabulation fix)* — reconcile (engine wins on what it models); surface clamp deltas; fix collisions. The narration guard is **settled-facts injection into NARRATE** (below), trusting the strong GM to narrate within them — *not* a verifier. `verifyTextAgainstFacts` is kept only as a cheap **transformation/speech seatbelt**: promote it from log-only to **regenerate-once on ERROR** (a transformed character can't speak English → regen, using `getVocalDescription`'s vocal map to say what it *can* emit). **No lightweight semantic verifier** — don't have a weak model gate a strong GM (Krahe, 6-19).
5. **NARRATE** *(Phase 2 LLM call)* — bound to the now-settled state + `ruling` intent-note + fat memory. **Additive-only**: may invent color and new *additive* facts (which flow back to canon); may **never reverse** a settled resolution.

Two LLM calls total: **DECIDE** (the thinker) + **NARRATE** (the teller). ~1.5× GM latency; accepted.

## Data layer (the home invention never had)
- **Per-NPC scratchpad** — generalize `suspicionLedger[]` into a durable, **mutable** (GM-resolvable/removable, never auto-dropped), **witness-scoped** (a note enters an NPC's pad only if that NPC could know it) notes register. Witness-scoping = the confabulation guard applied to character.
- **Lab scratchpad** — same, for standing environment facts ("MAIN_LAB monitor bank scorched t12 — BASILISK feed degraded there").
- **Object registry** — net-new. Each object: `{ id, name, location, state, properties[], knownToALICE, origin }` where **`location` is a union of room | possessor (ALICE/bob/blythe/drM) | container (SECURITY_LOCKER, WALL_SAFE…)**. Seed **anchors at game start** — salient / interactive / plot-relevant contents per room, **NOT exhaustive** (an exhaustive list reads as a closed world → static). GM may **create** new plausible objects in-game.
- **Operation vocabulary**: `CREATE` · `SET_STATE` (incl. consume/destroy as terminal states) · `MOVE`/`TRANSFER` (room↔possessor↔container) · `REVEAL` (knownToALICE false→true).
- All of the above **never-dropped**: exempt from `compactGMMemory` and `resetMemoryForActTransition` (mirror `permanentConsequences`). `restoreGMMemory` needs back-compat defaults so old checkpoints load.

## Object-ops cookbook (the few-shot for the DECIDE prompt)
- destroyed uplink → `SET_STATE(comms_uplink, destroyed)`
- fire extinguisher carried from the hall → `MOVE(extinguisher_corridorA, to: MAIN_LAB)` (or `CREATE` if unseeded)
- second watermelon brought in for testing, ends up half-eaten → `CREATE(watermelon_2, MAIN_LAB, intact)` → later `SET_STATE(watermelon_2, partially_consumed)`
- guards confiscate Blythe's laser cufflinks → `TRANSFER(laser_cufflinks, from: blythe, to: SECURITY_LOCKER)`

## VERIFY reconciliation rule (this is what kills confabulation)
- **Engine canonical outcome overrides any GM decision that contradicts it.** (Beam throttled by heat → engine says "scorched"; GM said "destroyed" → object corrected to scorched *before* narration.)
- Clamp deltas surfaced (suspicion +5 at 8 → clamped 10, trips confrontation).
- Collisions corrected (duplicate ids, impossible transfers).
- NARRATE's guard is **settled-facts injection** (ruling intent-note + canonical deltas, prominent at prompt top), trusting the GM to narrate within them. `verifyTextAgainstFacts` stays a regex **seatbelt** for the transformation/speech ERROR class only → **regenerate-once** (vocal-map-guided). If sims show residual mechanical drift *despite* the split, revisit then — no speculative verifier (don't have a weak model gate a strong GM).

## Reference scenarios (full walk-throughs in chat 2026-06-19)
- **A — invention + object creation + witness-scoping:** "Have Bob tape over the Corridor-A camera." Duct tape `CREATE`d (server-room closet) then consumed; camera → blinded; Bob's pad written; **Dr. M untouched (saw nothing)**; BASILISK seed for the dead feed; narration may not say she noticed.
- **B — confabulation killed:** "Fire the muon ray at the big monitor bank." Engine throttle → "scorched"; GM's "destroyed" reconciled down in VERIFY; suspicion clamped to 10 → confrontation; narration physically cannot say "destroyed."

## Build sequence (smallest blast radius first; bar = green build + 28/28 smoke + a sim)
0. **Warmups (independent, trivial):** raw-window under-send `2→6` (`gmClaude.ts:849` cap + `3839` slice); `triggerEnding` stub → resolve raw GM string against `ENDINGS` + un-gate epilogue (`index.ts:1348 / 1925-1963 / 2160`).
1. **Turn-split skeleton on EXISTING state:** DECIDE(`{ruling, operations}` over current `stateOverrides`, prose-free) → INSTANTIATE(apply+clamp) → VERIFY(reconcile + promote verify gate) → NARRATE(bound). Fixes confabulation with **no new schema**. Verify: sim with an engine-throttled result; narration cannot contradict it.
2. **Data layer:** object registry + lab scratchpad + generalized NPC scratchpads; anchors seeded in `initialState`; never-drop wiring; checkpoint back-compat. Verify: build green, round-trip, multi-act persistence of a planted fact.
3. **Wire invention:** DECIDE emits object + scratchpad ops; cookbook in the prompt; INSTANTIATE applies; NARRATE reads. Verify: duct-tape / watermelon / cufflinks sims persist across turns *and* an act boundary.
4. **Later, separate threads:** witness-impressions chorus (needs producers first — `npcAwareness` is a hollow shell today; Blythe captures zero observations, Bob's are hard-zeroed each act); memory-retention rework (loosen `compactGMMemory` + act-transition caps); cacheable stable prefix; epilogue-in-context + endings absorption (`generateGMReflection`, help-ledger routing, tone-by-desert).

## Locked decisions (2026-06-19)
1. Engine wins on what it models; GM on what it invents. ✓
2. DECIDE = reason-then-formalize (`{ruling, operations[]}`, ruling first). ✓ *(most important to sequence right)*
3. Enumerate anchors, not the universe; open creation. ✓
4. Scratchpads never auto-drop; GM-resolved/removed; consolidate, don't slice. ✓
5. Objects can transfer (location = room | possessor | container); MOVE is first-class. ✓

---

# CACHED-THREAD VALIDATION & REVISED PLAN — 2026-06-19 (validated vs code, run `w1soo15xc`)

**Verdict: GO-WITH-FIXES.** The whole-game cached-append-only-thread architecture is sound and validated against the real code. The big idea: **cache the STORY, read the STATE.** The whole game becomes ONE append-only, prompt-cached conversation thread with the GM. **The confabulation fix and the caching design are the same lever** — mid-thread `{role:'system'}` steering binds narration to canonical truth *and* leaves the cached prefix byte-untouched.

## Validated prompt structure
**CACHED PREFIX** (append-only, byte-identical turn-to-turn; 2 breakpoints, max is 4):
- `tools`: none today (if ever added: position 0, freeze deterministically).
- **system** = `GM_SYSTEM_PROMPT` — **VERIFIED byte-static** (0 `${}` interpolations across its span; ~23–28k tokens, clears Opus 4.8's **4096-tok** cache floor easily). Keep its breakpoint; **bump `{type:'ephemeral'}` → `{type:'ephemeral', ttl:'1h'}`** (`gmClaude.ts:3879`, epilogue `:558`).
- **messages[]** = the IMMUTABLE running transcript — the **REAL** alternating user(player action+context) / assistant(verbatim GM narration+JSON) pairs, append-only, never shifted. **SECOND breakpoint on the last block of the most-recent completed turn.** Act transitions + epilogue are appended HERE as mid-thread `{role:'system'}` markers — NOT by editing the system block.

**DYNAMIC TAIL** (regenerated every turn, AFTER the breakpoint, full-price ~3.5k tok — correct & intended): pinned facts (`pinnedFacts.ts`) + fingerprint + the never-dropped registers re-rendered from canonical engine state (event register, reminders, permanentConsequences, NPC scratchpads, object registry, lab scratchpad) + `buildMemoryContext` + `formatGMPrompt`. **Already correctly tail-side (`~:3821-3828`).** The GM never has to "remember" — the tail re-injects from the engine/MCP source of truth.

**2-phase nests inside ONE thread** (no second thread): both DECIDE and NARRATE cache-read the identical prefix; they differ only in the tail. DECIDE tail = state+registers+parse+object-ops few-shot → prose-free `{ruling, operations[]}`. Engine INSTANTIATE+VERIFY settles. NARRATE reuses the prefix; **settled facts injected as a mid-thread `{role:'system'}` message after the cached history, before NARRATE's user turn** (Opus-4.8-only, no beta, does NOT invalidate the prefix). COMMIT appends the **real** player-action/narration pair only after NARRATE; the transient settled-facts message is consumed, not persisted.

## Cache-safety fix list (what must move / change — byte-identity is the whole game)
1. **KILL THE SLIDING WINDOW** (`:3839` slice, cap `:849`, shift loop `:3367-3374`) — it IS the prefix-invalidation engine; replace with a monotonically-growing, never-shifted raw transcript.
2. **STORE/REPLAY RAW, NOT SUMMARIES** (`createCompactResponseSummary :3174`, stub user turns `:3844`) — cache the verbatim action + verbatim GM reply, frozen at creation, immutable. Keep compact summaries as a *separate* engine field for tail/budgeting only.
3. **MOVE THE BREAKPOINT TO THE END OF THE TRANSCRIPT** (add 2nd `cache_control`).
4. **DECOUPLE ACT-TRANSITION RESETS FROM THE RAW TRANSCRIPT** (`resetMemoryForActTransition :983-1176`, `compactGMMemory :1199-1254` touch tail/engine state ONLY, never the raw exchange list).
5. **KEEP TAIL CONTENTS OUT OF HISTORY** (invariant): pinned facts / fingerprint / memory-context never migrate into system or a replayed message. The "hoist authoritative facts into the system prompt" refactor is the trap.
6. **PIN THE MODEL + settings for the game** (`setGMModel :2855` mid-game silently nukes the cache; keep thinking/effort constant).
7. **Mid-thread `{role:'system'}` placement rules** (not `messages[0]`; must follow a user turn; must be last or followed by an assistant turn — else 400). Model downgrade breaks this channel → need a user-turn `<system-reminder>` fallback.

## Mechanism fates (the simplification — coherence UP, code DOWN)
- `recentExchanges` sliding window + `maxRecentExchanges` → **RETIRE** as a context source (repurpose the field as a bookkeeping pointer into the immutable transcript).
- `createTurnSummary` / `turnSummaries` → **DEMOTE** to a context-ceiling fallback (only fire near a ~700–800k high-water mark).
- `compactGMMemory` → **REPURPOSE** to an on-disk checkpoint-size guard that EXEMPTS the never-dropped registers; raise/remove caps on coherence-critical arrays.
- **`resetMemoryForActTransition` → RETIRE** (the single biggest coherence-loss point; act transition becomes a mid-thread marker + growing transcript). Salvage only ActSummary → event-register entry. **Feature-flag for one cycle.**
- `previousActContext` graft → **RETIRE** (only existed to undo the reset's amnesia). `restoreGMMemory` keeps defaulting the field for old saves.
- Epilogue cold single-shot (`:490-562`) → **REPURPOSE** into the thread as an `=== EPILOGUE MODE ===` mid-thread `{role:'system'}` message (ENDING_MODE_PROMPT + help-ledger + ending id); do NOT swap the system block. Absorbs the `act3-endings.md` work.

## Real numbers (ESTIMATES at chars÷4 — ground-truth via `count_tokens` / existing TurnMetrics JSONL)
- **Context: non-issue.** ~70k typical (35-turn) / ~100k worst (60-turn) vs Opus 4.8's **1M** = 7–10% used. (Testing's "300-350k overruns" were on the old design / smaller windows; fine here.)
- **Cost: ~$3–8/game, central ~$5.** **Output tokens dominate** (~half, $25/1M incl. adaptive thinking) once system+transcript are cache-hits; cache-reads of the growing history are cheap (~$0.50/1M).
- **The binding constraint is the 1h TTL, not context** — and it only pays off if the prefix stays byte-identical. **TTL economics inversion (critical):** a 1h write costs 2×; if a silent invalidator leaves any per-turn byte in the prefix, you pay the 2× write EVERY turn for ZERO reads — strictly *worse* than no caching.

## Revised build sequence (caching is now the spine, not a "later" item)
- **C0 — GATE: lift TTL→1h + log `cache_read_input_tokens`/`cache_creation_input_tokens`** (`:3879`, `:558`; 2 lines + 1 log). VERIFY cache_read non-zero from turn 2 ≈ system-prompt token count. **Gate the whole build on this** — if cache_read is zero, stop and find the invalidator.
- **C1 — append-only transcript + transcript-tail breakpoint** (kill the window `:3836-3849`/`:3362-3374`; send real prior turns verbatim; 2nd breakpoint). VERIFY: **byte-diff two consecutive requests' prefixes** (catches silent invalidators); cache_read grows with the conversation.
- **C2 — act transitions: reset → append-only marker** (retire `resetMemoryForActTransition` body; feature-flagged). VERIFY: full Act I→III sim — an Act-I `permanentConsequence`/marker referenced verbatim in Act III; nothing `.slice`'d at the boundary.
- **C3 — demote summaries/compaction to a context-ceiling fallback** (gate at ~700–800k; exempt registers). VERIFY: normal sim never fires the fallback; synthetic over-ceiling sim folds once (untested path → needs its own test).
- **S4 — nest the 2-phase split** (DECIDE→settle→NARRATE; settled facts as mid-thread `{role:'system'}`). VERIFY: throttle-the-beam scenario (narration can't say "destroyed"); both calls show cache_read on the shared prefix.
- **S5 — data layer** (object registry + lab/NPC scratchpads, tail-rendered from engine state) → **S6 — wire invention** (DECIDE emits object/scratchpad ops + cookbook). [the §"Data layer"/"Wire invention" slices above, now positioned after the thread is stable]
- **S7 — epilogue into the cached thread** (absorbs `act3-endings.md`: help-ledger routing, survival stub, `generateGMReflection`, tone-by-desert).
- **S8 (later) — witness-impressions chorus** (needs producers; `npcAwareness` is a hollow shell, Blythe captures zero, Bob hard-zeroed — bigger than the doc assumed).

## Critical risks (carry into the build)
- **TTL inversion** → C0 is a hard gate; confirm cache_read before anything else.
- **Silent prefix invalidators are the #1 failure mode** — byte-diff consecutive requests every slice; assert `cache_read_input_tokens` non-zero each turn.
- **4096-tok cache floor** (Opus 4.8) — system prompt clears it; any small trailing cached block under 4096 silently won't cache.
- **20-block lookback** — the 2-phase split + BASILISK full-turn + multi-action turns can exceed 20 blocks/turn → intermediate breakpoint (room: 2 of 4 used).
- **Retiring the reset is where alphas died** — sim-verify a full 3-act game; keep the old reset behind a flag (one flag-flip to revert).
- **Register bloat** — never-dropped registers re-sent in the tail EVERY turn; unbounded object/NPC creation erodes headroom → COMPRESS-don't-DROP needs a GM-resolved consolidation pass (not a blind slice).
- **Checkpoint back-compat** — `restoreGMMemory` must default `previousActContext` + the new registers, or old saves crash.

## Quiet finding worth keeping
The pre-`66293bb` under-send bug (GM only ever saw 2 turns regardless of cap) means "coherence loss sank prior alphas" was **partly a starved-context bug, not only architecture.** The append-only transcript fixes the root cause; the cap fix (already shipped) was a stopgap.

## Resolved after the validation (2026-06-20)

- **Register bloat is a non-issue — "never-dropped" belongs to the TRANSCRIPT, not the registers.** The validation flagged the never-dropped registers (event register, NPC scratchpads, object registry), re-rendered in the tail every turn, as a bloat risk. The cached-thread design dissolves it: the **append-only cached transcript IS the complete, never-dropped record**; the **registers are the concentrated LIVE-SALIENT view** (open threads, current NPC impressions, live object states) riding in the cheap tail. So a register entry can be **pruned the moment it resolves** — a paid-off seed, a destroyed-and-irrelevant object, a closed thread — and *pruning ≠ forgetting*, because the transcript still holds it if ever needed. Registers stay small by **graduating resolved items out** into the transcript-only record; the transcript remembers everything. **This IS the consolidation mechanism** we kept gesturing at ("compress don't drop, consolidate don't slice"): consolidation = drop-from-the-live-view, never from the record. The old register-bloat fear was a holdover from the era when dropping = forgetting; under the cached thread, it isn't.
- **BASILISK / multi-actor turns fold into the GM's narration.** His moves are already settled into state before the GM call, so the GM narrates them — the transcript stays clean **player ↔ GM**, with BASILISK riding inside the assistant turn. (Requirement: the GM narration must faithfully carry BASILISK's consequential acts so the cached transcript preserves them for future coherence.)
- **Build-time loose ends (decide in-build, not now):** (1) the 20-block cache lookback on multi-action turns → place an intermediate breakpoint (2 of 4 used); (2) mid-turn failure consistency → if NARRATE fails *after* the engine settled, don't append a half-turn; retry NARRATE or append a minimal resolved-marker so the transcript and engine state never diverge.
