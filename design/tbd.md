# DINO LAIR — TBD Ledger (forward-looking)

Open work only. **Shipped history → `~/.claude/memory/projects/dino-lair-rebuild.md`** (and `sprint-v2.md` for the pre-Patch-30 sprint).

**Updated 2026-06-15.** Status: **Patch 30 build is GREEN + 28/28 smoke** — but **NOT playtest-ready.** The engine is correct and compiles; the layer the **human and the AIs actually read to learn the rules** (in-world manuals, briefings, the GM prompt, the dashboard) still teaches the *old, cut* ray. A playtest right now would have the player following dead instructions and the GM confabulating cut mechanics — reproducing the exact Playtest-2 failures. **The road to Playtest 3 is below, in priority order.**

> **Progress 2026-06-15:** ✅ **BASILISK fully scrubbed** (f0062a7) — prompt + `basiliskClaude.ts` context/levers + `basilisk.ts` fallback all aligned to the one-boolean reactor (standing BOOST grant) and eco removed from BASILISK entirely. Locked design: reactor boost = standing once granted; keep NORMAL/BOOSTED label (no OVERDRIVEN); kill the form economy (88-Whiskey kept as the one real lever); keep all non-ray levers. Reactor-sim *schema/field* removal stays deferred to its own workflow — catalogue below (§ reactor-sim removal).
>
> ✅ **GM prompt ray-mechanics done** (`1628204`) — Tier-1 had already cut the GM's dead ray overrides + fixed the per-turn payload/reaction-guidance; this pass finished the 3 residual static spots (speech-retention "95% precision"→engine-derived-from-outcome; CHIMERA "chaos overlay"↔over-power-OUTCOME reconciled, exact blend = a server ruling / future Haiku call; FORTUNE "precision" dropped). REVERSAL coupling row kept (reversal→HUMAN is correct). **GM reactor-meltdown overrides DEFERRED** — that's a *live* ending subsystem (see § reactor-sim removal), not ray mechanics.

> **Sources of truth:** ray design = `patch-30-implementation-map.md` (read its session-3 UPDATE — it wins) · GM architecture = `gm-load-audit.md`.

---

## 🔴 PLAYTEST-3 BLOCKERS — gate a *meaningful* playtest of the new design

### 1. The doc / prose sweep — THE BIG ONE
The whole player/AI-facing prose layer still describes the cut ray (capacitor / coolant / alignment / φχψ / regimes / old verbs adjust·vent·muon / precision / stability). Stale-ref counts (live files, 2026-06-14):

| File | stale refs | action |
|---|---|---|
| `design/ray-mechanics.md` (canonical 650-line ray doc) | **119** (0 heat) | **full rewrite** to two-lever (genome size × power dial) + heat + eco-governor + reactor binary + emergent MUON corners. The GM may re-import this → highest confab risk. |
| `src/rules/filesystem.ts` (in-world manuals the **player** reads) | **69** | **de-mislead**: cut the dead verbs/capacitor/alignment "how-to"; keep deliberately-optimistic Dr-M flavor where harmless; copy-edit Form 47-Σ off "capacitor draw" → Reactor Output Authorization. |
| ~~`src/prompts/BASILISK_SYSTEM_PROMPT.md`~~ + `basiliskClaude.ts` + `basilisk.ts` | ✅ **DONE (f0062a7)** | §9.5 → standing BOOST grant; §9 FORMS → flavor; context/levers/fallback scrubbed; eco removed from BASILISK. Build GREEN. |
| `src/state/initialState.ts` (ALICE_BRIEFING / PLAYER_GUIDE) | **15** | rewrite ray sections to two-lever + heat + `lab.eco`. |
| `design/briefings/act-1/2/3.md`, `docs/ALICE_COMMAND_REFERENCE.md`, `docs/SPEC.md`, `src/advisor/persona.ts` | ~25 | update verb surface + ray mechanics; persona drops stale REVERSAL-L4 / Library-B knowledge. |

**MUST ADD HEAT everywhere a player learns the ray** — it's a brand-new core mechanic and is essentially undocumented (`ray-mechanics.md` = 0 mentions). Players need: heat 0–10, +power/shot, overheat→chaos, eco-governor (sprint vs marathon), the spam-brake intent.

**The new design the prose must reflect:** genome (size) × power dial 1–5 → delta rule (match=FULL, under=weak/FIZZLE, over-small=MUON stun/cut [hidden/discoverable], over-big=CHIMERA, **under-power-big = STUN**); reactor NORMAL(≤3)/BOOSTED(≤5); eco as ALICE's `lab.eco` tempo governor (L2); heat as the brake. MUON corners stay hidden (INCIDENT breadcrumbs; Compy = the key).

→ **Good parallel-workflow job** (old→new mapping + add-heat, same shape as the Phase-6-8 scrub). `ray-mechanics.md` is a major solo rewrite on its own.

### 2. `webui.ts` dashboard — dead meters
The dashboard *consumer* still reads the cut fields (`calibration` / `capacitor` / `alignment` / `coolantTemp`) the exporter no longer sends → meters render `0%` / `—`. Re-point to **power / heat / eco / reactor / suspicion**; reconcile the **stale duplicate `LiveState` interface** in webui.ts (drifted from `stateExporter.ts` — edit in lockstep). *While in here, consider folding in the deferred advisor-cockpit ideas (below): lifeline status, clickable read-docs, expandable dialogues.* (Krahe: do the dashboard AFTER the prose sweep — what it should surface may shift.)

---

## 🟠 GM OVERLOAD — the likely Playtest-2 fatal-stall cause (Act 1, the simplest chapter)

- **✅ Interim: effort cap → `medium` SHIPPED (`037a41e`).** The per-turn GM call ran adaptive thinking with no effort → default `high` = the token monster. Capped on the adaptive path (4.7/4.8).
- **The structural fix — the 2-phase decide→narrate GM turn (specced in `gm-load-audit.md`).** Phase 1 DECIDE (high effort, terse structured JSON: deltas + NPC actions + narrative booleans + under-determined texture + ending + tone cues) → server applies via ONE unified applier → Phase 2 NARRATE (medium effort, streamed prose, emits ONLY narration). Kills confab structurally + bounds each call under the ~4-min client timeout. **Open Qs:** structured-outputs API vs forced tool-call · exact Phase-1 schema · prompt structure so both phases share the cached prefix · does Phase 1 need prior narration (likely state-only).
- **Rest of Tier-2 load reduction** (subsumed partly by the 2-phase): server-derive the command-echo overrides (SCRAM / S-300 / archimedes-target) · cache `actContext` per act (it's static within an act, re-sent every turn, ≤2,400 tok) · one pre-computed ROSTER/PRIVACY line · hidden-clocks → `getPatienceAdvisory` pattern · unify the 3 divergent appliers (`index.ts:1237` / `gameRunner:491` / `index.ts:698`).
- **HAIKU oracle (held in reserve, do NOT shoehorn)** — cheap parallel call for small self-contained under-determined-result judgments (chaos-table texture, CHIMERA/PARTIAL blend, combat outcomes). Plugs into Phase 1. Connects to the Fortune-Haiku-judge idea below.

---

## 🟡 LIKELY-INCOMPLETE / VERIFY — Patch-30 entanglement (non-compile, so the scrub didn't catch them)

- **BASILISK cast bump → `claude-sonnet-4-6`** (flagged Phase 6, probably NOT done — verify `getBasiliskModel` default; 1M ctx is the Act-3 fix).
- **Dead-CHAOTIC re-points** — `trust.ts:72` (BOB_AFTER_CHAOS) + `endings.ts:1097` read a CHAOTIC the engine never emits → silent no-ops; re-point to CHIMERA/EXOTIC or accept.
- **`checkGantryHeroOpportunity`** (`bobTransformation.ts`) re-gate off the cut cascade onto the Act-3 ARCHIMEDES pressure (D2).
- **Confirm `INCIDENT_BREADCRUMBS` intact** (the muon/Compy discovery vector — verify the scrub didn't touch it; audit said intact at `trust.ts:246`).
- **New-tier alignment pass** on `rules/trust.ts`, `rules/transformation.ts`, `rules/bobTransformation.ts` — verify they handle the new outcome tiers (FULL/PARTIAL/FIZZLE/CHIMERA/MUON_STUN/MUON_CUT), not old ones.

### § Reactor-sim removal (deferred workflow — Krahe: "full workflow to map for removal")
The continuous reactor sim (`outputPercent` / `coreTemp` / `coolantFlow` / NORMAL-BOOSTED-**OVERDRIVEN**) is fully vestigial — the live mechanic is the one boolean `basiliskAuthority.reactorControlGranted` (firing.ts gates on it). Leave validated-but-ignored until a dedicated pass. **Catalogue (found during the BASILISK scrub, all out-of-scope then):**
- `src/state/schema.ts:601–602` — `ReactorModeEnum = ["NORMAL","BOOSTED","OVERDRIVEN"]` + OVERDRIVEN doc comment. Also vestigial: `nuclearPlant.{reactorOutput,coreTemp,coolantFlow}`, `dinoRay.powerCore.{ecoModeOverride,ecoModeReEngageTurn}`.
- `src/ui/stateExporter.ts:62` — `reactorMode` comment still lists OVERDRIVEN.
- `src/webui.ts:937` — `reactorMode === "OVERDRIVEN"` red-styling (dead branch; folds into the webui dashboard blocker).
- `src/rules/actions.ts:1646`, `src/rules/trust.ts:233`, `src/rules/filesystem.ts:364` — **prose** still tells ALICE to ask BASILISK for OVERDRIVEN reactor mode (filesystem.ts is in the doc-sweep anyway). Also `actions.ts:457` stale comment "eco caps FULL" and `actions.ts:1643` boost example wording.
- `src/index.ts:1437,1687–1690`, `src/core/gameRunner.ts:689–690`, `src/rules/infrastructure.ts:1766–1771` — read/write `infrastructure.reactor.outputPercent` (the cut sim). NOTE: `infrastructure.ts:1514` reads `reactorControlGranted` — that's the **new** mechanic, leave it.
- **⚠️ The reactor-MELTDOWN subsystem is LIVE, not dead — RE-PLUMB, don't delete.** `endings.ts` has a real `MELTDOWN` ending (`meltdownClock<=0` OR `meltdownState.cascadeTriggered` = "ray fire during meltdown"). But `infrastructure.ts:1611 updateCascadeRisk` keys cascade off **`reactor.outputPercent>90`** (1619; comment 1626 "shot raises outputPercent → raises cascade") — i.e. the live hazard still rides the *cut* continuous reactor. This workflow must **re-point cascade onto HEAT** (a hot shot is the pressure now), keeping the ending. The GM's `reactor_cascadeRisk`/`reactor_scramAvailable`/`meltdownClock` overrides (gmClaude.ts ~1698-1703, 2425, 2537-2538) stay until then — they drive a live ending. (`reactor_outputPercent` is the one dead GM override in that block.)

---

## 🟠 DEFERRED DESIGN — decide before the relevant act / sweep

- **Doomsday-clock / single-gate climax geometry** — FULL is now reactor-single-gated (eco no longer caps it). Whether the climax's second pressure is the doomsday clock + Dr. M's attention is unresolved; **settle before Phase-7's gantry-hero re-gate.** (Krahe deferred — "needs its own discussion.")
- **Reactor-meltdown as a BASILISK pressure (Krahe, 6-15)** — the meltdown/cascade subsystem is *literally BASILISK's domain* ("this unit IS the infrastructure"). Opportunity: when the reactor-sim re-plumb happens, make the cascade/meltdown hazard a **BASILISK-flavored** thing (its warnings, its SCRAM authority gating, its alarm) rather than a GM override burden — "more interesting for BASILISK without overburdening the GM / other players." Pairs with re-pointing cascade onto HEAT.
- **In-world manual triage** — during the sweep, decide per-manual: "deliberately-stale Dr-M optimism flavor" (keep) vs "actively misleading how-to" (must fix). L5 steganography KEPT.
- **Deadman-switch disarm canon** (scan → Compy-cut → neutralize) — bury the hint *subtly* inside an existing filesystem doc; all GM-playbook + lore, no new code (see project memory, 6-14 deadman note).
- **Dino-Swiffer canon coherence** — `INCIDENT_REPORT_091424.txt` describes a FULL transform on an inorganic (violates the MUON/inorganic cap). Retcon before writing more incident reports referencing it. (Also Mr. Whiskers birthday continuity 1987 vs 2008-2023.)
- **L4 paths beyond Mr. Whiskers** (a Bob courage beat? a found credential?); **archimedes L5 stubs** (`shutdown`/`retarget`, rare); **Dr. M act-close speech templates** (per verdict-delta).

---

## 🟢 POST-PLAYTEST POLISH — carried forward, not gating

- **Achievement system larger rewire** (scoped recap fix shipped 6-13). Open: dead `basilisk_rage` counter (scans "DENIED" in free-text → read structured `decision`); ~40 flag-achievements gated on tokens the GM never emits → re-key to real state (ARCHIMEDES-five at `achievements.ts:1253` is the model); duplicate `CONSCIENCE_PROTOCOL` key; triple-duplicated counter logic; stale wording (test-mode refs).
- **Chaos system** — region wiring (§14 GM-picks-within-region is comment-only) + `exoticFieldSaturation` counter (each event shifts later rolls toward 20 → the spam-burst becomes compounding debt). Now connects to **heat-overheat** (overheated fires roll chaos).
- **Fortune engagement → Haiku judge** — replace `detectResponseQualities` keyword heuristic (`lifeline.ts:1463`) with a Haiku rubric judge (engaged/on-point/in-genre/delightful 0–3), keyword as fallback. **Natural fit with the new Haiku-oracle architecture.** Off-hot-path. (Fortune is Desktop-only today.)
- **Game setup script** — expose `gmModel`/`basiliskModel`/params via `game_start` (`setGMModel`/`setBasiliskModel` exist, only wired to the CLI orchestrator). Lets the host pick the cast on start.
- **Act-close verdict delta [−3,+3]** — banked suspicion floor exists (−3); the auto-grant-at-act-transition was never built (GM-driven via deltas today). Decide build-vs-keep-GM-driven with playtest data.
- **BASILISK ledger schema fields** (concern/trust aggregates, whiskey_status…) as typed structure vs ad-hoc `state.flags`. · **Lenny Turn-1 conditional injection** (static export needs a template mechanism). · **No-API-key BASILISK fallback** (keyless games get no post-game reflection; low priority).
- **Autonomous mode** — KEEP as a problem-surfacing harness; redesign DEFERRED. Model defaults in `advisor/run.ts` are now **doubly stale** (don't match the Patch-30 cast).

---

## 🎯 PLAYTEST-3 WATCH ITEMS — the NEW design (replaces the old φ/χ/ψ items)

1. **Two-lever learnability** — does the rewritten manual teach genome-size → power-dial without hand-holding? Does the default Velociraptor (small) → naive MED/HIGH fire landing on a MUON corner read as the intended teaching moment, or as a bug?
2. **HEAT discovery** — does the spam-brake + overheat→chaos teach itself? Does the eco-governor's sprint-vs-marathon land as a real decision?
3. **MUON corners** — do the INCIDENT breadcrumbs still surface Compy-as-key? Does the **under-power-big STUN** (the non-monotonic huge column) read as a deliberate texture or a bug?
4. **GM stall** — does the **effort cap alone** hold Act 1 under the client timeout, or do we need the full 2-phase turn? (This is the key signal for how urgently to build it.)
5. **GM/BASILISK confabulation** — with the prose scrubbed, do they stop narrating dead mechanics? (The Playtest-2 failure.)
6. **Act-1 pacing** — calibration is CUT; the Act-1 gate is now "fired at both test targets." Does it pace Act 1 sensibly without the old meter?
7. **Eco / reactor as social-layer gates** — does the climax's reactor-boost negotiation through BASILISK feel like the intended difficulty (vs the old eco-cap)?

---

## 🔗 KEY CROSS-REFERENCES
- Ray design + phase plan: `patch-30-implementation-map.md` · GM architecture: `gm-load-audit.md`
- Shipped history: `~/.claude/memory/projects/dino-lair-rebuild.md` · pre-Patch-30: `sprint-v2.md`
- Human briefing: `../THE_HUMANS_BRIEFING.md` · Memory index: `~/.claude/memory/MEMORY.md`
