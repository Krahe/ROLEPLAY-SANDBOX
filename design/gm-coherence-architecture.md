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
4. **VERIFY** *(engine + optional narrow corrective)* — reconcile (see rule below); surface clamp deltas; fix collisions; **promote `verifyTextAgainstFacts` (`gmClaude.ts:3990`) from log-only to a real gate**. Adjust or kick a narrow re-decide on just the conflict.
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
- The promoted `verifyTextAgainstFacts` gate catches any residual prose-vs-fact drift in NARRATE → regenerate/patch.

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
