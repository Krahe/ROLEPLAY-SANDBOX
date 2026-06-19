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
Delicate central plumbing — coherence is the thing that's bitten. **Dedicated fresh session, built carefully with verification.** The Act-III endings work (ISLAND + 4 endings + help-ledger) is independent and can **bank first** (clean, verified, currently uncommitted batch).
