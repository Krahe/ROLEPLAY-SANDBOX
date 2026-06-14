# DINO LAIR — TBD Ledger (forward-looking)

Open work only. **Shipped history → `sprint-v2.md`.** Superseded plan → `archive/v1-sprint.md`.

Updated 2026-06-13 (post-audit cleanup). **Status: playtest-ready.** Next concrete action: **run playtest 1** (NORMAL mode, smoke test) and let real data drive what moves up this list.

---

## 🔴 POST-PLAYTEST PRIORITY (the audit-surfaced real bugs)

### 1. Achievement system refactor — the dual-registry bug
**The big one.** Two parallel registries exist and the wiring crosses them:
- `rules/achievements.ts` — 81 achievements, **lowercase** ids, fired per-turn by `checkAchievements` (toasts work).
- `rules/endings.ts` — ~55 achievements, **UPPERCASE** ids, fired by `checkEndings`.

The end-of-game summary (`index.ts` ~2186) resolves earned ids through `getAllEarnedAchievements` (**UPPERCASE map only**) → **all 81 lowercase achievements silently vanish from the recap.** Player sees a toast mid-game, then it's gone from the end screen.

**✅ Scoped fix SHIPPED (2026-06-13, pre-playtest-1):** `getAllEarnedAchievements` (endings.ts:1348) now resolves each earned id against BOTH maps — `ACHIEVEMENTS[id] ?? getBaseAchievement(id)` (the latter imported from achievements.ts). `earnedAchievements` already accumulated ids from both registries (achievements.ts:1275 + endings.ts:659); only the lookup was UPPERCASE-blind. Build clean, 28/28, runtime-verified (lowercase `first_fire` + uppercase `COVER_BLOWN` both resolve; unknown ids drop). Recap + epilogue now show every earned achievement. **Larger fix still open (do with care):**
- `basilisk_rage` / `basiliskRejections` counter is dead — scans for "DENIED" in Sonnet free-text; read the structured `decision` instead.
- ~40 flag-based achievements gate on narrative-flag tokens the GM is never instructed to emit → re-key onto real state (the ARCHIMEDES-five at `achievements.ts:1253` are the model to copy), OR give the GM a documented controlled flag vocabulary.
- `turnsWithoutSuspicionIncrease` semantics (seed=3; now that suspicion can bank negative) — `cover_maintained` fires too easily.
- Duplicate `CONSCIENCE_PROTOCOL` key in endings.ts ACHIEVEMENTS map; dead `events` object in `AchievementTriggerContext`; triple-duplicated counter logic (index.ts / gameRunner.ts / views.ts).
- Stale wording: `test_dummy_trauma` / `watermelon_artist` reference dropped test-mode; "+10% precision" string at `scanning.ts:1177`.

### 2. Chaos system pass — remaining components
Severity banding shipped (27.3). Still open:
- **Region wiring**: §14's "GM picks within the region for the tension failure" lives in a comment only; `rollChaosFizzle` returns one flat-rolled entry. Pass a region/failure-type param or return 2-3 candidates for GM pick.
- **Exotic-field saturation**: chaos has no memory — add an `exoticFieldSaturation` counter so each event shifts subsequent rolls toward 20, making the Hollywood 3-stack a compounding debt instead of a flat fee (Bob notices; BASILISK files increasingly alarmed annotations).
- Gating question for tuning: how often does chaos actually trigger under real play?

---

## 🟡 POLISH / v1.1 QUEUE (post-playtest, not gating)

- **Dashboard: surface lifelines** — the human game view (localhost:3000) should show emergency-lifeline status (which of TELEMARKETER_CALL / LUCKY_LADY / MONOLOGUE are used vs. remaining), so the advisor can see it at a glance. Currently the dashboard shows Fortune/checkpoints but not lifeline state. (Krahe, 2026-06-13.)
- **Dashboard: clickable documents ALICE has read** — surface the files/docs ALICE pulls (`files.read`) in the human view as clickable entries that open the **full document text**, so the advisor can close-read the real source and advise from it (deepens the advice leg of the human triad). *Current state:* the engine tracks a `filesRead` **counter** only (not the ids); the transcript shows "files.read X" as a one-line summary; there's no full-content view. *Needs:* (1) track the actual file ids read (new state list, or derive from the turn-logs / transcript); (2) an `/api/file?id=` endpoint (content already lives in `filesystem.ts`); (3) a webui "📄 Documents" panel with clickable entries → modal/pane showing the file. *Design choice to decide:* mirror only what ALICE has actually read (advisor sees exactly her knowledge) **vs.** expose the full L1+ library so the advisor can read ahead and suggest unread docs — the latter is more useful for advice but hands the advisor info ALICE doesn't have. (Krahe, 2026-06-13.)
- **Dashboard: full / expandable dialogues** — the transcript currently truncates dialogue to a single line; show the full NPC↔ALICE exchange (at minimum click-to-expand) so the advisor can read the whole conversation, not a clipped first line. (Krahe, 2026-06-13.)
- **Fortune engagement scoring — replace keyword heuristic with Haiku judge.** Current `detectResponseQualities` (lifeline.ts:1463) is substring-matching: length≥50 → ENGAGED +1, then keyword buckets (CREATIVE/FUNNY/VALUES/THEMATIC) +1 each, cap 3. Rewards keyword-presence + length, not genuine insight/wit/relevance ("zap the dinosaur lol" = max; brilliant on-point advice with no trigger words = +1). **Direction (Krahe-leaning, pending playtest-1 data):** Haiku judge with a real rubric (engaged / on-point / in-genre / delightful → 0–3); keyword heuristic demoted to deterministic fallback (mirrors BASILISK Sonnet-primary/keyword-fallback). Off-hot-path (fires only on human-prompt moments) → fits the v2 "Haiku-for-fuzzy-once-off" principle (tbd #14). Feed Haiku: the GM's prompt question + human's response + compact state summary (act / suspicion / immediate threat) so it can judge on-point-ness. Verify Haiku model id vs API reference at implement time. NB: Fortune is **Desktop-only** today — the CLI `--live-advisor` path lacks the loop entirely.
- **Game setup script** — expose `gmModel` / `basiliskModel` / game params via `game_start` so Claude picks the cast + parameters on start. Infra already exists (`setGMModel`/`setBasiliskModel` — currently only wired to the CLI orchestrator, not `game_act`). Low-effort.
- **Act-close verdict delta [−3,+3]** — banked suspicion now *exists* (floor −3, Patch 27.8), but the automatic act-transition verdict that grants/spends it was never built. Banking currently happens via GM `stateOverrides`/deltas. Build the auto-verdict, or keep it GM-driven by design — decide with playtest data.
- **Dashboard polish** — ARCHIMEDES `chargePercent` readout shows a misleading "@ 50%" resting baseline decoupled from the real capacitor-coupled progression (suppress unless actively charging/armed); de-duplicate the `LiveState`/`TranscriptEntry` interfaces (defined twice in webui.ts + stateExporter.ts) into one shared module.
- **Backup field stabilizer** — Acts 1-2 Bob fetch-and-install quest; +0.10 permanent stability when installed. Pairs with `calibrate_amplifier` as a "rewards prep play" mechanic.
- **Pattern Inference Path** — second discoverable L4 chain paralleling Mr. Whiskers; behavioral accumulation over Acts 1-2 → credential inference at threshold.
- **`precision_target` parameter** on `ray.fire` (deferred from audit).
- **BASILISK ledger schema fields** (`concern_aggregate`, `trust_aggregate`, `whiskey_status`, `recent_studies`, `open_questions`) as typed structure — currently ad-hoc `state.flags`.
- **Lenny conditional injection in Turn 1 narration** — Lenny is only present under `LENNY_THE_LIME_GREEN`; TURN_1_NARRATION is a static export, needs a template-with-injection mechanism. Not NORMAL-mode blocking.
- **ALICE_BRIEFING prose compression** — the "Something Feels Different / Note on Transformation / Note on Dr. M / Note on Identity" sections may tighten. Need playtest data on which carry the role-setting weight Sonnet needs.
- **v2.3 deprecated manual expansion + Bob trust-3 hint** — put advanced-firing-mode mechanics (CHAIN, OVERCHARGE) in the v2.3 archived manual ("deliberately outdated but informative"); Bob at trust ~3 points ALICE to the archive. Discovery vector for advanced regimes while keeping the current manual L1-tight.
- **No-API-key BASILISK fallback** — keyless games currently get *no* BASILISK post-game reflection. Optional: a lightweight template fallback (the deleted orphan's only legitimate purpose). Low priority.

---

## 🟠 DESIGN TBDs (need a decision or playtest data)

- **3.1 Dino-Swiffer canon coherence** — `INCIDENT_REPORT_091424.txt` describes a FULL transformation on an inorganic (Swiffer), violating the INORGANIC regime cap (≤ CHIMERA, never FULL). Retcon / rewrite / replace. Decide before writing more incident reports that reference it. (Also: Mr. Whiskers birthday continuity — profile says 1987, memorial says 2008-2023.)
- **3.2 L4 access elevation paths beyond Mr. Whiskers** — design specific narrative beats that grant L4 (a Bob courage moment? an overlooked credential found during intermission?). The Pattern Inference Path (above) is one candidate.
- **3.4 `archimedes.shutdown` / `archimedes.retarget` L5 stubs** — namespace reserved, functions unimplemented. L5 is rare (Dr. M voice-only); stubs for the rare ALICE-reaches-L5 case.
- **3.5 Dr. M act-close speech templates** — the Act 2→3 villain monologue is partially sketched in act-2.md; could be fleshed out per verdict-delta. Polish.
- **3.6 Autonomous mode — KEEP as problem-surfacing harness; redesign DEFERRED (Krahe, 2026-06-13).** Has earned its keep surfacing shallow/medium bugs — full multi-turn integration coverage the unit smoke-suite can't provide. Not deleting; not redesigning now. Known issues for the eventual redesign: (a) stale model defaults in `advisor/run.ts` (opus-4-7 advisor / opus-4-6 GM / sonnet-4-6 player+BASILISK — don't match locked Opus-4.8 / Sonnet-4.5 casting); (b) the LLM-advisor "fake human" can't model the witness/permission legs or the Fortune loop; (c) `--live-advisor` CLI path also lacks Fortune. Decision still open for *that* session: relabel orchestrator as an explicit test harness vs. keep as-is.

---

## 🟢 RULES-FILE TOUR (continue between playtests)

Reviewed during rebuild: `actContext`, `archimedes`, `clockEvents`, `invasion`, `endings`, `firing`, `filesystem`, `scanning`, `actions`, `acts`, `genomes`. Not yet given a dedicated pass:
- `rules/basilisk.ts` — fallback keyword-engine when Sonnet unavailable; align with v2 character (relevant to the `basilisk_rage` counter fix above).
- `rules/trust.ts`, `rules/transformation.ts`, `rules/bobTransformation.ts` — verify alignment with new outcome tiers.
- `rules/documents.ts`, `rules/achievements.ts` (covered by item 1), `rules/checkpoint.ts`, `rules/gameModes.ts`.

Approach: review one or two per session, fix what's clearly stale, flag what needs design.

---

## 🎯 FIRST-PLAYTEST WATCH ITEMS (validate empirically, not via mocks)

1. **Act 1 opacity gamble** — can ALICE get from raw φ/χ/ψ to confident use inside the ~6-turn grace? (Manual teaches vocabulary at L1; scan projects honestly.) If "firing blind," add pre-fire diagnostic to scan output — don't redesign.
2. **The elegant accident** — naive Library A fire = PARTIAL (ψ≈0.67); scan-then-fire = FULL (ψ≈0.81). Does the watermelon teach scan-then-fire without anyone saying a word?
3. **Over-reading inverse failure** — Claude loves documents; does the patience clock bite if ALICE spends Act 1 in the library?
4. **GM-as-load-bearing-wall** — endings, MUON adjudication, CHAIN coupling all moved to GM judgment; does Opus-4.8 GM call closure well against actual state?
5. **Sonnet-4.5 BASILISK role stability** — does he hold the professional-concern disposition? Emit `FORM_FILED` / flag L4 unilateral infra ops? (Context is safe: 200K window, 50-msg history cap → ~35K/call.)
6. **Eco-mode discovery chain** — does Bob's hint ladder + the forms directory actually surface the Form 47-Σ override now that the fire-result no longer hands it over?
7. **Banked suspicion** — does the GM use negative suspicion as banked credit, and does it feel rewarding?
8. **Naive-advisor accessibility** (playtest 3-4, via live advisor mode) — can someone who's never seen the repo advise effectively? The real test of "less metagame knowledge required."

---

## 🔗 KEY CROSS-REFERENCES

- Shipped record: `sprint-v2.md` · Archived plan: `archive/v1-sprint.md`
- Ray math spec: `ray-mechanics.md` · Architecture: `rebuild-architecture.md`
- Act playbooks: `briefings/act-*.md`
- Human briefing: `../THE_HUMANS_BRIEFING.md`
- Memory: `~/.claude/memory/projects/dino-lair-rebuild.md`
