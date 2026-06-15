# GM Cognitive-Load Audit (Patch 30)

**Built 2026-06-14 by a 4-agent workflow** (system-prompt / per-turn-context / output-contract / adjudication readers over `gmClaude.ts` ~4,700 lines + the appliers in `index.ts` / `gameRunner.ts`). Provenance: Krahe's question — *did we overload the GM the same way the pre-simplification player was overloaded?*

**Verdict: yes.** The GM holds a ~70-field override schema, recalls-and-recomputes meters, re-derives outcomes the engine already computed, and reads a per-turn context that's largely static or duplicated — on top of narrating.

**The north star (Krahe):** the SERVER tracks mechanical state deterministically; the GM spends judgment ONLY where judgment is required (narration, NPC choices, world reactions, ambiguous adjudications). **The codebase already nails this in 3 places** — the FIRING EVENT block, the LAST-TURN SKILL-CHECK block, and `getPatienceAdvisory` all do *server resolves → hands GM the outcome + a cue → GM decides tone*. The fix is to **extend that discipline** wherever the GM currently does the server's arithmetic.

---

## Target architecture — three tiers (locked 2026-06-14)

> **⚑ Priority: this is the likely cause of the Playtest-2 fatal stall.** The GM overloaded and froze in **Act 1 — the simplest chapter**. Tier 2 is not optional polish; it is the fix for the failure that ended the last playtest. Treat it as load-bearing for Playtest 3.

**1. ENGINE (server, deterministic) — owns all mechanical state.** Outcome *tier* (FULL/PARTIAL/FIZZLE/CHIMERA/MUON), clean transform FORM_IDs, meters (via deltas), clocks, reactor/eco/heat, command-echo effects (SCRAM, S-300, archimedes target, etc.). Resolves on the player's action; hands the GM a resolved snapshot + a narration cue.

**2. HAIKU ORACLE (`claude-haiku-4-5`, $1/$5 — held in reserve, do NOT shoehorn).** A cheap, fast, *parallel* call for **small, self-contained, under-determined-result** judgments the engine can't compute but that don't need Opus. Fitting niches (Krahe): **chaos-table result elaboration, the specific texture of a CHIMERA / PARTIAL, combat-style outcomes** — "the engine said CHIMERA happened; what does *this* messy blend look like?" Curate tightly: only genuinely self-contained calls, fired in parallel (latency), only where a real niche appears. Most judgment stays with the GM.

**3. GM (`claude-opus-4-8` tuned, or `claude-opus-4-7`) — narrates, voices NPCs, makes the rich scene-dependent calls, and *nudges* outcomes by judgment.** It does NOT do the server's arithmetic or hand-mirror state.

### The locked decisions

- **Meters → delta-only** (Fork 1). GM emits direction + magnitude + reason; server owns the integer, the hidden/visible split, and the `suspicion≥10` confrontation trigger (`endings.ts:905`). Kept as a *feature*: a delta that hits 10 fires the confrontation **next** turn → ALICE gets one turn at the brink (pull back / Hail Mary).
- **Transforms → engine owns tier + clean FORM_ID; GM/Haiku owns the under-determined texture** (Fork 2). The GM never hand-sets "Blythe → VELOCIRAPTOR_JP" — **drop `transformationState` from the GM emit contract for clean transforms** (the engine already writes it on `ray.fire`). BUT the *under-determined* outcomes — a CHIMERA's specific conflicting features, a PARTIAL's half-state, chaos-event specifics — are GM-authored texture (and the prime Haiku niche). The engine decides *that* it's a CHIMERA; the GM/Haiku decides *what this* CHIMERA is. No GM-vs-engine contradiction possible, because they own different layers.
- **Decision ownership** (Fork 3). GM decides, advised by server mechanics — mostly narrating and sliding outcomes by judgment, not determining everything.
- **Models.** GM: **tune 4.8 first** — `output_config.effort: "medium"` (default is `high`; this is the direct lever on the expansive 4.8 CoT that ballooned GM responses to ~8K tokens + ~1.3K thinking and caused the 2–4 min generation → Desktop timeout) + a "lead with the outcome, don't narrate routine actions" concision directive. If still too verbose → swap to **`claude-opus-4-7`** (same $5/$25, 1M ctx, terser/more-clipped by default). **BASILISK → `claude-sonnet-4-6`** ($3/$15, 1M ctx — enough for the Three-Pillars judgment, lighter than Opus). Haiku reserved for the oracle niches. **Player = whatever Claude Desktop runs** (platform constraint — can't pin Opus/Sonnet 4.5).

### The 2-phase GM turn — the GM-tier architecture (specced 2026-06-14)

**Why.** One GM call does the deciding (expansive CoT) AND the narrating (~8K prose) in a single generation — which is what timed out and froze Act 1, *and* what lets the GM confabulate (it decides and narrates in the same breath, free to drift from the engine). Splitting the GM turn into two calls fixes both, and makes the existing two-voice protocol *real* instead of aspirational. (The committed `effort: "medium"` cap — `037a41e` — is the interim monolith mitigation; this is the structural cure.)

**Flow (per turn):**
```
ENGINE  resolves the deterministic outcome (tier, clean FORM_ID, heat, clocks…)
   │      (+ optional HAIKU oracle for self-contained under-determined bits)
   ▼
PHASE 1 — DECIDE   GM, HIGH effort, terse STRUCTURED output (JSON; judgment only, no prose)
   ▼
SERVER  applies the decision to state  ← the ONE unified applier
   ▼
PHASE 2 — NARRATE  GM, MEDIUM effort, prose, STREAMED — emits ONLY prose, cannot desync state
```

**Phase 1 — the decision (structured output).** The judgment layer only — what the engine can't compute:
- meter **deltas** + reason (`suspicion +2 — she caught the discrepancy`)
- NPC **actions** this turn (what each does, from their established wants)
- narrative-state **judgment booleans** (Bob confessed? Blythe broke free? Dr. M left?)
- **under-determined outcome texture** (the CHIMERA blend / PARTIAL state / chaos specifics) — or a flag to defer that to the Haiku oracle
- the **ending** call (`triggerEnding`, confrontation resolution) when the story has actually concluded
- brief **reaction / tone cues** for Phase 2 (how the scene should feel; the beats)

High effort (the real reasoning lives here), but the OUTPUT is small → the call is fast. This is where a Haiku oracle plugs in for self-contained sub-judgments.

**Phase 2 — the narration.** Given the now-resolved state + Phase 1's canonical decision: write narration + NPC dialogue, nothing else. **It is told to narrate the decision faithfully, and it *cannot* invent a different outcome because it didn't decide one.** Medium effort (expressing, not reasoning), strong model (this prose IS the game), streamed (keeps the connection alive under the ~4-min client timeout).

**What this SUBSUMES from the Tier-2 list:**
- *Meters → delta-only* — Phase 1 emits the deltas.
- *Unify the appliers* — the server applies exactly one thing: Phase 1's decision. The ~70-field hand-emit contract collapses into the Phase-1 schema.
- *GM stops doing the server's arithmetic* — Phase 1 emits judgment; the engine applies it; Phase 2 only narrates.
- *Confabulation* — structurally impossible now: Phase 2 narrates a decision it received, against state the server already applied.

**Models / effort (per phase):** Phase 1 = `claude-opus-4-8` (or 4.7), HIGH effort, terse. Phase 2 = strong model, MEDIUM effort, streamed (Opus now; could be Sonnet later for cost, since it's handed the decision).

**Latency + cost:** two calls, but each bounded under the client timeout (Phase 1 = small output; Phase 2 streams). The shared prefix (system prompt + state) is **prompt-cached**, so Phase 2 reads it at ~0.1× — the second call is cheap. The Tier-2 context reduction shrinks both. Net: reliability over the monolith, plausibly comparable cost.

**Open questions to settle before building:**
- Phase 1 via the structured-outputs API (`output_config.format` + JSON schema) vs a forced tool call. (Structured outputs is cleaner + validated.)
- The exact Phase-1 schema (the field list above is the shape, not final).
- Prompt structuring so both phases share the cached prefix (system + state first; phase-specific instructions after the breakpoint).
- Whether Phase 1 ever needs the *prior narration* or only the structured state (likely state-only → smaller).

---

## Four shapes of burden

**1. Ghost mechanics — GM told to read/emit systems Patch 30 CUT (the live confab engine).** The #1 priority; this *is* the playtest-2 failure, still wired in.

**2. Mechanical bookkeeping — GM hand-scribes state the server owns.** The "if you NARRATE it you must OVERRIDE it" rule + two override tables. The prime overload.

**3. Re-sent / duplicated bulk.** `actContext` (≤2,400 tok) re-sent every turn though static within an act; two full NPC sections; suspicion/trust in 5 places; 2 replayed full GM responses.

**4. Genuine judgment — PROTECT.** NPC voice & motivation, NPC action choices, did-a-coerced-shot-land, scan recon, ending call + confrontation resolution, stall-vs-legit. Do not touch.

---

## TIER 1 — kill the ghosts (easy deletes / contained rewrites; the confab fix at the root)

| Item | Location | Action |
|---|---|---|
| Dead `ray_*` god-mode overrides (capacitorCharge/coolantTemp/corePowerLevel/precision/profileIntegrity/…) | schema `gmClaude.ts:1670-1691` (Zod) + the TS interface ~`:1628` + prompt `:2543-2551` | **DELETE** — no applier (`index.ts:1365-1370` confirms cut; grep `o.ray_` = 0 hits) |
| Eco "ON (outcomes capped at PARTIAL)" sub-block | `gmClaude.ts:4177-4180` | **DELETE** — contradicts the correct eco line at `:4172`; eco no longer caps |
| Firing-fidelity note citing OVERCHARGE/INORGANIC "regimes" + "capacitor exceeded max" | `gmClaude.ts:4076` | **REWRITE** to dial-vs-genome (FULL/PARTIAL/FIZZLE/MUON/CHIMERA) |
| Reactor "passive capacitor accrual +0.45/turn" | `gmClaude.ts:4182-4191` | **FIX** stale prose (capacitor cut; reactor is binary NORMAL/BOOSTED) |
| Scan bonus "+0.15" readout | `gmClaude.ts:4174` | **FIX** → binary scanned yes/no (the +0.15 scanBonus was cut) |
| `getReactionGuidance` branches on `CHAOTIC`, no MUON/STUN/CUT case | `gmClaude.ts:~4401-4474` | **ADD** MUON_STUN/MUON_CUT/CHIMERA cases; drop CHAOTIC |
| `libraryStatus` dangling emit + scary desync warning | tables `:2449,2393,2431`; applier CUT `index.ts:1301` | **DELETE** emit + warning (+ schema field) |
| `bob_transformationState` dangling emit | tables `:2460,2503,2529`; no consumer | **DELETE** emit (engine sets Bob's form on the fire that hits him) |
| `UNCALIBRATED` + `testModeEnabled` phase-hint branch | `endings.ts:91-93` | **FIX** (calibration/testMode cut) |

---

## TIER 2 — shift bookkeeping to the server (THE real load drop — needs design decisions)

*This is the "discuss in depth" set. Each is the GM doing deterministic work the server could own.*

- **Fire → transformationState:** engine already computes the outcome & writes `transformationState` (`index.ts:931-973`); stop asking the GM to mirror it (it can *contradict* the engine). Reserve GM-emitted transforms for *narrative* transforms with no fire behind them.
- **Meters → delta-only:** suspicion/anxiety/trust are emitted as absolutes (recall 6 → emit 8). Engine already supports `*_delta`. GM emits direction+magnitude+reason; server owns the integer, the visible/hidden split, and the `suspicion≥10` confrontation (`endings.ts:905` already detects it).
- **Command-echo overrides → server-derived:** SCRAM, S-300-disable, Archimedes target-switch, weapons-auth are fixed tuples echoing the player's command. The engine that parsed the command should apply them; GM narrates only.
- **`actContext` → cached per act + 1-line pointer:** identical turn-to-turn within an act; re-sent every turn (≤2,400 tok). Full text only at the act-transition notification.
- **ROSTER/PRIVACY → one pre-computed line:** channel × act × presence × suspicion≥5 is deterministic. Server injects "overheard: yes/no" + who's in the room; GM only decides Dr. M's *reaction*. (Also retires the guard-staging table.)
- **Hidden clocks/tension → `getPatienceAdvisory` shape:** stop hand-incrementing patience/tension/escape-readiness; server computes pressure & advises, GM decides escalate/stand-down.
- **Unify the 3 divergent appliers:** `index.ts:1237` (full) vs `gameRunner.applyGMOverrides:491` (~12 fields) vs `index.ts:698` (reconnect, partial). Until unified, no one — including the GM — knows which emitted field actually takes. **This scopes the whole offload; probably do it first in Tier 2.**

---

## TIER 3 — de-dup the prompt (pure trim, no behavior change)

- Merge "NPCs YOU CONTROL" + "CHARACTER VOICE GUIDE" → one entry per NPC (~600 words).
- Collapse the 5-way suspicion/trust duplication (pinnedFacts / fingerprint / statusBar / NPC-States / hidden) → one canonical digest.
- De-dup the two-voice doctrine (stated 3×) + "when to triggerEnding" (2×) + adversarial tools (2×).
- Bound `buildMemoryContext` growth (caps every marker ever); trim replayed prior responses (2 → 1 or summary).

---

## Dashboard note
Parking `webui.ts` was correct: once Tier 1/2 land, the per-turn ray state *is* just the five live levers (genome · power 1-5 · heat 0-10 · eco on/off · reactor normal/boosted). The dashboard should surface exactly those — do it after, not before.
