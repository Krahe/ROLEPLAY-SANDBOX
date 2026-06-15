# GM Cognitive-Load Audit (Patch 30)

**Built 2026-06-14 by a 4-agent workflow** (system-prompt / per-turn-context / output-contract / adjudication readers over `gmClaude.ts` ~4,700 lines + the appliers in `index.ts` / `gameRunner.ts`). Provenance: Krahe's question — *did we overload the GM the same way the pre-simplification player was overloaded?*

**Verdict: yes.** The GM holds a ~70-field override schema, recalls-and-recomputes meters, re-derives outcomes the engine already computed, and reads a per-turn context that's largely static or duplicated — on top of narrating.

**The north star (Krahe):** the SERVER tracks mechanical state deterministically; the GM spends judgment ONLY where judgment is required (narration, NPC choices, world reactions, ambiguous adjudications). **The codebase already nails this in 3 places** — the FIRING EVENT block, the LAST-TURN SKILL-CHECK block, and `getPatienceAdvisory` all do *server resolves → hands GM the outcome + a cue → GM decides tone*. The fix is to **extend that discipline** wherever the GM currently does the server's arithmetic.

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
