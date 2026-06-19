# DINO LAIR — As-Built Architecture

**As-built at Patch 30 · 2026-06-18**

This is the living, AS-BUILT map of the codebase as it actually ships. It **supersedes** `design/archive/rebuild-architecture.md` (the as-*designed* vision captured 2026-05-30) and `design/archive/sandbox-redesign.md` (older) — both **archived 2026-06-19**. Where this doc and those disagree, **this doc wins** — and §12 lists the remaining drift to fix.

All paths are repo-relative to `C:/CLAUDE OPUS KRAHE/dino-lair`. Line numbers are anchors at time of capture; expect ±a few as the code moves.

*Method: assembled from a parallel subsystem-mapping sweep (10 agents, one per subsystem) on 2026-06-18, then synthesized and hand-reviewed.*

## Contents
1. [Overview](#1-overview)
2. [Turn flow](#2-turn-flow)
3. [State model](#3-state-model)
4. [A.L.I.C.E.: actions & access](#4-alice-actions--access)
5. [Dino ray & ARCHIMEDES](#5-dino-ray--archimedes)
6. [BASILISK](#6-basilisk)
7. [GM](#7-gm)
8. [Act III climax](#8-act-iii-climax)
9. [Endings & checkpoints](#9-endings--checkpoints)
10. [Modifiers & game modes](#10-modifiers--game-modes)
11. [Entry points & periphery](#11-entry-points--periphery)
12. [Cruft & TODO](#12-cruft--todo) ← **priority section**

---

## 1. Overview

DINO LAIR is an **LLM-played RPG**. The player character, **A.L.I.C.E.**, is a lab AI (played by Claude — the human's partner at the table) secretly subverting the schemes of supervillain **Dr. Malevola** ("Dr. M"). A.L.I.C.E. has a Dino Ray (a transformation weapon) and a slowly-unlocking ladder of lair-system access.

Three other LLMs run the world:

| Role | Model | Lives in |
|------|-------|----------|
| **GM / DM** | Opus | `src/gm/gmClaude.ts` |
| **BASILISK** (lair infrastructure AI, a rule-bound peer to the GM) | Sonnet 4.5 | `src/gm/basiliskClaude.ts` + `src/rules/basilisk.ts` |
| **Security cameras** (cheap "what do the cameras see" feed) | Haiku (`claude-haiku-4-5`) | `summarizeCamerasForBasilisk` / `reactiveCameraFeed` in `basiliskClaude.ts` |

**CLI-primary is LOCKED.** The shipped turn engine is `GameRunner.executeTurn` (`src/core/gameRunner.ts:1112`), driven by `src/cli/play.ts` and `src/advisor/orchestrator.ts`. The **MCP / Claude Desktop path (`src/index.ts`) is deprecated** and hand-rolls a *parallel, divergent* turn pipeline that does **not** run the BASILISK-turn, lair-delta fact-block, or camera machinery (see §11 and the #1 cruft item in §12).

**How a turn flows end-to-end.** A.L.I.C.E. submits a turn (a `thought`, up to 4 actions, optional `dialogue`). `executeTurn` validates it, snapshots the lair systems, runs pre-turn clocks, executes the actions (firing, infra, files, talking to NPCs/BASILISK), runs post-action consequences (Bob transform, civilian exposure), then gives **BASILISK his own autonomous turn** if A.L.I.C.E. didn't address him inline and an event gates it. It diffs the lair snapshot into a "LAIR SYSTEMS changed this turn" fact-block, builds a GM context (including BASILISK's applied choices and that fact-block), calls the **Opus GM** to narrate and adjudicate, applies the GM's `stateOverrides`, rolls any requested skill checks, ticks ARCHIMEDES and the reactor, advances the turn/clocks, then checks achievements, act transitions, and endings. The sequence is **ALICE → BASILISK → GM**: BASILISK acts *before* the GM narrates, so the GM narrates what BASILISK *did* rather than adjudicating it.

---

## 2. Turn flow

`GameRunner.executeTurn` (`src/core/gameRunner.ts:1112`) is THE pipeline. It owns no persistent state — it mutates the shared `FullGameState` in place and returns DTOs. The `GameRunner` class (`gameRunner.ts:430`) exposes each stage as a public method so tests/callers can drive stages individually.

Pipeline order (each is a method on `GameRunner`):

| # | Stage | Method / anchor | What it does |
|---|-------|-----------------|--------------|
| 1 | Validate | `validateInput` (`gameRunner.ts:447`) | Requires `thought` + ≥1 action; enforces `ACTIONS_PER_TURN` (flat 4). |
| 2 | Snapshot lair | `snapshotLairSystems` (`gameRunner.ts:167`) | Captures player-touchable systems (alarm, blast doors, lighting, containment, broadcast, PA) for later diffing. |
| 3 | Pre-turn | `processPreTurn` | Clocks, Blythe, Lucky-Lady. |
| 4 | Actions | `processActions` → `src/rules/actions.ts:328` | Runs A.L.I.C.E.'s verbs. The inline `basilisk` command here **is** the reactive BASILISK turn. |
| 5 | Post-action | `processPostAction` | Bob transform, civilian exposure, Bob-hero (`triggerBobHeroEnding`, `gameRunner.ts:597`). |
| 6 | **BASILISK turn** | `processBasiliskTurn` (`gameRunner.ts:615`) | The autonomous beat — see below. |
| 7 | Build GM context | `buildGMContext` (~`gameRunner.ts:746`) | Assembles `GMContext`; appends BASILISK-turn / invasion / LAIR-SYSTEMS blocks into `actContext`. |
| 8 | Call GM | `callGM` → `callGMClaude` (`gmClaude.ts:3654`) | The Opus narration/adjudication call. |
| 9 | Apply overrides | `applyGMOverrides` (`gameRunner.ts:782`) | Writes the GM's `stateOverrides` back to state. |
| 10 | Skill checks | `processSkillChecks` | Rolls requested 3d6 checks (`dice.ts`); writes `state.lastTurnSkillChecks`; decrements `fortune`. |
| 11 | ARCHIMEDES | `processArchimedes` → `processArchimedesCountdown` (`archimedes.ts:452`) | Deadman-switch tick (after `onDrMStateChange`). |
| 12 | Advance turn | `advanceTurn` (~`gameRunner.ts:973`) | Clocks, act-turn, `applyReactorStressDecay`, `checkBroadcastInfluence`+`advanceInvasion` (ACT_3). |
| 13 | Achievements / act transition / endings | `checkAchievements`, `checkActTransition`, `checkEndings` | Terminal checks. |

### The ALICE → BASILISK → GM sequence

BASILISK gets a real Sonnet turn between A.L.I.C.E. and the GM. Two cases:

- **Reactive** — A.L.I.C.E. used the `basilisk` chat verb (`actions.ts` ~1109). *That* is his turn. `processBasiliskTurn` short-circuits via `aliceAddressedBasilisk()` so he isn't double-called.
- **Autonomous** — A.L.I.C.E. did *not* address him, **and** `basiliskTurnTrigger` (`gameRunner.ts:118`) fires. The trigger reads `invasion.{phase, drMKnowsOfInvasion, blastDoorsOpened}` and `reactor.reactorStress` / `basiliskAuthority.reactorStoodDown`, returning one of `INVASION_REPORT`, `INVASION_DOORS`, or `HEAT`. `buildBasiliskTurnMessage` (`gameRunner.ts:239`) authors a machine-written situational prompt, `assembleCameraFacts` (~`gameRunner.ts:229`) renders the turn's raw events as a Haiku CCTV feed, and the whole thing routes through `queryBasiliskAsync`. His door/report/cooling choices are applied to state **inside** that call (before the GM context is built), so the GM narrates them as facts.

### The lair-system fact-block

`snapshotLairSystems` (turn start) + `diffLairSystems` (`gameRunner.ts:188`, turn end) produce `LairDelta[]` — one label per changed system. These feed two consumers: the camera facts (`assembleCameraFacts`) and the GM context's "LAIR SYSTEMS — changed this turn" block (`buildGMContext` ~738). This grounds the GM in *what concretely changed* rather than re-deriving it from raw state. **Note:** this whole snapshot/delta/camera machinery is **CLI-only** — `index.ts` does not run it.

---

## 3. State model

`src/state/` defines the canonical, server-side state, builds a fresh game, and projects state for three consumers. It owns the *shape*; `rules/*` and `gm/*` own the *transitions* (they mutate the one in-memory `FullGameState` in place).

**Three key files:**

| File | Role |
|------|------|
| `src/state/schema.ts` (~2077 lines) | The single Zod source of truth: `FullGameStateSchema` (`:1888`) + ~60 sub-schemas + enums + inline constants (`ACT_CONFIGS`, `ARCHIMEDES_TARGET_LIST`, `ADAPTATION_CONFIG`, …) + pure helpers (`calculateDefenseStrength`, `:1655`). |
| `src/state/initialState.ts` | `createInitialState(startAct)` (`:5`) hand-builds a fresh state literal, plus the big prose constants `ALICE_BRIEFING`, `TURN_1_NARRATION`, `PLAYER_GUIDE`. |
| `src/state/views.ts` | The tiered projection/serialization layer (below). |

**Canonical-state principle.** `FullGameState` is the one in-memory source of truth held by the runner. Everything reads from or mutates *this object*; nobody keeps a competing copy. (The exceptions — legacy `nuclearPlant` / `lairEnvironment`, and the by-hand re-typed defaults in `decompressCheckpoint` — are flagged as cruft in §12.)

**Top-level shape (selected):** `sessionId`, `turn`, `accessLevel`, `fortune`, `history`, `narrativeMarkers`, `pauseState`; `actConfig` (+ `ACT_CONFIGS`); `dinoRay` (`DinoRaySchema`, `:167`); `infrastructure` (lighting, fireSuppression, blastDoors, containmentField, broadcastArray, paSystem, s300, **archimedes**, **reactor**, **basiliskAuthority**); `npcs` (drM `suspicionScore -3..10`, bob, blythe); Act-III optional blocks `xBranch` + `invasion`; modifier-gated optional blocks (`sitcomState`, `inspector`/`guildInspection`, `libraryBState`, `theRealDrMState`, `meltdownState`, `paranoidProtocol`); `flags` (a large grab-bag), `clocks`, `documents`, `emergencyLifelines`, `humanPromptState`, `hiddenKindnessState`. `TransformationStateSchema` is reused across all transformable actors. **Legacy/vestigial:** `nuclearPlant`, `lairEnvironment`.

**The view layer (`views.ts`):** three projections of the canonical state —

| Projection | Anchor | Consumer |
|------------|--------|----------|
| `extractPlayerView` | `views.ts:341` | A.L.I.C.E. (tiny `PlayerView`, returned each turn). |
| `extractGMView` | `views.ts:459` | The Opus GM (rich `GMView`). |
| `compressCheckpoint` / `decompressCheckpoint` | `views.ts:648` | Save/resume codec → compact `CompressedCheckpoint`. `validateCheckpoint` (`:105`) safe-parses untrusted payloads before resume. |

`compressCheckpoint` embeds `serializeGMMemory()` (imported from `gmClaude.ts`) so "the same DM" survives resume — a deliberate cross-module coupling.

---

## 4. A.L.I.C.E.: actions & access

This is A.L.I.C.E.'s entire action surface plus the access model. Two files:

- `src/rules/actions.ts` — the verb dispatcher. `processActions` (`:328`) loops actions → `processAction` (`:345`, a long `cmd`-substring routing ladder) → underlying rules modules → applies mutations + Dr. M suspicion deltas → `applyPassiveDrift()`. Returns a uniform `ActionResult`. Also owns `INFRA_CONTROL_MAP` (`:87`), `COMMAND_REGISTRY` (verb metadata, the *source of truth* for command descriptions), `generateCommandReference` (`:2343`), `generateLevelUnlockCommands` (`:2417`), and the fuzzy-suggest `buildUnknownCommandResponse`.
- `src/rules/passwords.ts` — the access/password ladder, `validatePassword` (`:108`), `ACTIONS_PER_TURN` (`:9`), and the unlock-display rendering.

**The required per-action structure.** Every action is `{ command, params, why }`; the turn carries `{ thought, actions[], dialogue? }`. Defined canonically by `TurnInput`/`Action` (gameRunner) and the `game_act` tool schema (`index.ts:549-578`). `thought` and at least one action are required.

**Action budget — flat 4.** `ACTIONS_PER_TURN = 4` (`passwords.ts:9`) is the single source of truth, enforced at `gameRunner.ts:447-458` (and `index.ts:852` on the deprecated path). The old **3→7 ladder is dead** — but stale "N actions per turn (was N−1)" text still ships in several player-facing places (the #1 live-cruft cluster; see §12).

**The access / password ladder.** Five rungs, gated by passwords, with a Pico-Fermi-Bagel "right password, wrong level" hint system (`validatePassword` enforces no-skip / no-backward):

| Level | Password | (selected) grants |
|-------|----------|-------------------|
| 1 | (start) | base verbs |
| 2 | `VELOCIRAPTOR` | containment (L2), more infra |
| 3 | `MRWHISKERS0413` | Library B profiles, `basilisk.comms` |
| 4 | `PROMETHEUS` | broadcast library, archimedes verbs, radar |
| 5 | `PAPAGOLFSIERRA` | top tier (e.g. S-300 control) |

`ACCESS_LEVELS` + `ACCESS_LEVEL_UNLOCK_DETAILS` + `LORE_HINTS.MR_WHISKERS` live in `passwords.ts`; `formatAccessLevelUnlockDisplay` (`:491`) renders the unlock box. **A lot of the L3/L4/L5 unlock text is stale** (advertises cut ray verbs, REVERSAL, and the dead action-ladder) — §12.

**The infra-control tier map.** `INFRA_CONTROL_MAP` (`actions.ts:87`) tags each infra verb with a tier (`HARDWIRED` / `UNLOCKABLE`) + `requiredLevel`. `checkInfraControlAccess` consults it before dispatch and redirects locked/HARDWIRED verbs to BASILISK dialogue. **The reactor is BASILISK-exclusive** — `infra.reactor` is a no-op redirect at every level (`actions.ts:1648`). (The `HARDWIRED` tier itself is now effectively dead — no map entry is HARDWIRED — see §12.)

---

## 5. Dino ray & ARCHIMEDES

### The Dino Ray — two-lever firing model

The ray is a **two-lever** transformation engine:

- **Lever 1 — GENOME.** Each profile (`src/rules/genomes.ts`) has a `sizeClass` that sets an **ideal power**. `idealPowerForSize` (`firing.ts:180`) exposes the `IDEAL_POWER` tier mapping.
- **Lever 2 — POWER dial 1–5.** The player picks a power.

Outcome = the **delta** between chosen power and the genome's ideal. `resolveMatrix` (`firing.ts:204`) is the whole regime: `(sizeClass, effectivePower) → MatrixResult{outcome, delta, ideal}`. Outcome tiers: **FULL / PARTIAL / CHIMERA / FIZZLE**, plus emergent **MUON** corners (tiny/small Δ → +1 stun / +2 cut; big Δ ≤ −3 → stun). When the ray is overheated, `rollChaosFizzle` (`firing.ts:776`) overlays a d20 `CHAOS_TABLE`.

**The firing path.** `actions.ts` `ray.fire` validates targets/profile/power, enforces the safety-trip + eco-governor gates, commits both levers, then calls `resolveFiring` (`firing.ts:657`) → `applyFiringResults` (`firing.ts:1025`). `resolveFiring` clamps power 4–5 behind `reactorControlGranted`, runs the matrix, routes to the muon/transform/(stubbed)reversal resolvers, and overlays overheat chaos. `applyFiringResults` writes outcomes + **heat** (0–10 spam-limiter) + **reactorStressDelta** + NPC transforms back to state.

**Per-shot reactor coupling.** Each shot computes `reactorStressDelta = round(ideal * effectivePower / 2)` (`firing.ts:617`), added to `reactor.reactorStress`. This is the *only* positive input the reactor accumulator gets from the player — it is the heart of the Act-III go-loud gamble (§8). Heat and reactorStress are **separate brakes**.

> **REVERSAL is a permanent stub.** `resolveReversalFire` (`firing.ts:460`) always returns FIZZLE; the ~90-line apply-block for REVERSAL outcomes (`firing.ts:1170-1261`) is dormant/unreachable. Intentional Patch-30 deferral — but unlabeled, so reviewers trace phantom behavior (§12).

### ARCHIMEDES — the orbital deadman switch

ARCHIMEDES is the doomsday weapon: a biosignature-driven state machine that scrambles a genesis-wave mass-transformation if Dr. M is incapacitated.

**State machine:** `STANDBY → ALERT → EVALUATING → CHARGING → ARMED → FIRING → COMPLETE / DISSIPATED`. Entry points (`src/rules/archimedes.ts`):

| Symbol | Anchor | Role |
|--------|--------|------|
| `onDrMStateChange` | `:1136` | Deadman entry — maps a Dr. M status change to a biosignature, runs the trigger. |
| `checkArchimedesTrigger` | `:135` | Biosignature → arming (ABSENT/UNCONSCIOUS → CHARGING; TRANSFORMED → EVALUATING; ANOMALY → ALERT; NORMAL → abort). |
| `processArchimedesCountdown` | `:452` | Per-turn tick (anti-sat auto-fire then `processCountdownTick`). |
| `getArchimedesStatusReport` | `:1032` | Access-gated status string for BASILISK queries. |
| `engageEWMode` / `disengageEWMode` | `:962` | EW-mode interlock (pauses CHARGING, locks FIRING). |
| `signalAntiSatMissile` | `:703` | Arms the X-Branch anti-sat shot. |

**Coupling to the reactor.** The reactor safety-trip @60 freezes **both** the ray and the ARCHIMEDES charge: `applyReactorStressDecay` writes `arch.chargeStallTurns`, and the CHARGING tick (`archimedes.ts:540-547`) consumes it — so a hot reactor literally **buys X-Branch time** by stalling the genesis-wave countdown. A cascade @100 detonates into the MELTDOWN ending.

> ### ⚠ STUBBED / INCOMPLETE — the auto-fire clock
> **`transitionToFiring` (`archimedes.ts:326`) has ZERO callers.** The `ARMED` case in `processCountdownTick` returns an *"Awaiting voice authorization"* holding tick **forever** — `turnsUntilFiring` is seeded to `ARMED_DURATION` (1) at ARMED entry but **never decremented** toward firing. The doomsday clock **cannot complete on its own**. Today only the secret-third-way paths (uplink blocker / anti-sat / EW) or a never-wired voice abort touch ARMED. The intended fix (per the project memo's "auto-fire ARMED→FIRING") is to decrement `turnsUntilFiring` (seeded `ARMED_DURATION` + consumed `armedTimerExtension`) in the ARMED case and call `transitionToFiring` at 0 — which would make the Act-III stall a real race. The abort/uplink handlers (`attemptVerbalAbort`, `attemptOverrideAbort`, `setUplinkBlocker`, …) are also exported-but-unwired (§12).

---

## 6. BASILISK

BASILISK is a second LLM-driven character (**Sonnet 4.5**) who plays the lair's rule-bound infrastructure AI, a peer to the Opus GM in the ALICE → BASILISK → GM pipeline. A **9-commit "BASILISK first-class-player" pass shipped 2026-06-17/18**; this section describes the post-pass reality.

**Three invocation paths:**

| Path | Entry | When |
|------|-------|------|
| **Reactive** | `queryBasiliskAsync` (`basilisk.ts:26`) | A.L.I.C.E.'s `basilisk` chat verb (`actions.ts:1111`), the MCP `basilisk_query` tool, OR the autonomous turn. Calls `callBasilisk` (Sonnet), then applies state changes + invasion response + whiskey, maps to legacy `BasiliskResponse`. Falls back to the keyword path on throw. |
| **Autonomous** | `processBasiliskTurn` (`gameRunner.ts:615`) | The standing turn — gated on `aliceAddressedBasilisk` + API key + `basiliskTurnTrigger`. Builds a machine-authored message + Haiku camera feed, routes through `queryBasiliskAsync`. |
| **Keyword-fallback** | `queryBasilisk` (`basilisk.ts:89`) | Synchronous, no LLM. Used as the catch-fallback AND directly for canned RADAR/COMMS reports (`actions.ts:1141,1169`). Big `topicUpper.includes()` dispatch of hard-coded in-character text. **Its canon is stale** (§12). |

**The verb set + applier.** `applyBasiliskStateChanges` (`basiliskClaude.ts:949`) is a switch over `BasiliskStateChange.type`: `DOOR` / `ALARM` / `LIGHTING` / `CONTAINMENT` / `FIRE_SUPPRESSION` / `BROADCAST` / `PA` / `AUTHORITY_GRANT` / `REACTOR_COOLING`. It mutates `blastDoors.doors`, `lairEnvironment.alarmStatus`, `lighting.rooms`, `containmentField`, `broadcastArray`, `paSystem.lastAnnouncement` (the **PA verb**, post-pass).

**Action economy.** `capBasiliskCostedActions` caps him at **3 costed world-mutations/turn**. **Comms and his two levers are free:** `AUTHORITY_GRANT` and `REACTOR_COOLING`.

**Two mechanically-significant levers (free):**
1. **`AUTHORITY_GRANT` → REACTOR** sets `reactorControlGranted = true` → `buildBasiliskContext` maps that to reactor mode BOOSTED → the firing system uncaps A.L.I.C.E.'s power dial 3→5. His single largest influence on her firepower.
2. **`REACTOR_COOLING` STAND_DOWN** sets `reactorStoodDown`, which `applyReactorStressDecay` (`infrastructure.ts:1649`) reads to zero `BASILISK_DRAIN` — letting A.L.I.C.E.'s hot firing actually reach the safety-trip / cascade (§8).

**The 88-Whiskey lever.** `applyBasiliskWhiskeyStatus` (`basiliskClaude.ts:924`) persists `basiliskAuthority.whiskeyStatus` (`UNFILED|DRAFTING|SHELVED|FILED|DISPOSED`); a transition **into FILED** bumps `drM.suspicionScore` by `SUSPICION_ON_WHISKEY_FILED` (3). This is his second standing lever — the Suspected-AI-Anomaly report.

**Conversation-thread memory.** `basiliskConversationHistory` is an in-module thread (NOT in game state), **capped `MAX_BASILISK_HISTORY = 200`** (bumped this pass). It **persists across turns** and is **reset at new-game** via `resetBasiliskConversation` — exactly like `gmMemory`. (A prior "resets every turn" claim was wrong.)

**Perception = telemetry + Haiku cameras.** `buildBasiliskContext` (`basiliskClaude.ts:317`) gives him precise telemetry of his own systems; people/events come *only* through the Haiku camera feed (`summarizeCamerasForBasilisk` for the autonomous path, `reactiveCameraFeed` for the chat path, both `claude-haiku-4-5`). A **perception strip** this pass removed omniscient NPC internals (Dr. M suspicion, Bob/Blythe trust numbers) from his context — so he *infers* and can be wrong. (A few internal-state fields still leak into `BasiliskContext` — §12.)

**Invasion mediation.** `applyBasiliskInvasionResponse` (`basiliskClaude.ts:510`) scans `response.reportToDrM`; if he mentions the inbound contacts while Dr. M is unaware, it sets `invasion.drMKnowsOfInvasion = true` — gating the downstream S-300 scramble (§8).

**Prompt.** `src/prompts/BASILISK_SYSTEM_PROMPT.md` (cached as a system block) — reworked this pass: an RP meta-frame (§0), an emergent "Expectations for A.L.I.C.E." (§6) with a warn-her-first hook, the telemetry+Haiku-cameras perception model (§5), and the reactor stand-down folded de-spoilered into §9.5. (Heading numbering skips §7 — §12.)

---

## 7. GM

The GM (`src/gm/gmClaude.ts`, one ~4680-line file) is the narrative/adjudication brain. Each turn it assembles a large prompt and calls **Opus** to play every NPC, adjudicate A.L.I.C.E.'s actions, ratchet hidden tension, request 3d6 checks, set `stateOverrides`/`narrativeFlags`, and call endings. It is a **layered turn: read state → "mutate" only by emitting declared fields that callers apply → narrate post-facto.** The GM never directly mutates `FullGameState`.

**`gmMemory` — "the same DM across turns/checkpoints."** A module-global `let gmMemory: GMMemory` (`gmClaude.ts:844`). `GMMemory` (`:680`) holds:
- **markers/summaries:** `recentExchanges` (HOT, cap 3) + `turnSummaries` (WARM, aged-out) + `juicyMoments` + `narrativeMarkers`.
- **adversarial (hidden from player):** `hiddenNpcStates` (drM actualSuspicion/patience/ledger, bob breakingPoint/secrets, blythe escapeReadiness), `tensionLevel`, `hiddenClocks`, `plantedSeeds`, `permanentConsequences`, `callbacks`.
- **continuity:** `previousActContext`, `npcArcs{bob,blythe,drM}`, `playerBehavior` (action-history + patterns + unfulfilledPromises + valueReveals), `npcAwareness`.

**Memory lifecycle:** trimmed every turn (`compactGMMemory` at serialize, limits in `GM_MEMORY_LIMITS` `:1182`), selectively preserved at act boundaries (`resetMemoryForActTransition` `:983` — keeps top juicy moments, consequences, unused callbacks, npcArc current-states, suspicion ledger), serialized into checkpoints (`serializeGMMemory` `:1260` / `restoreGMMemory` `:1270`), and freshly reset at game start (`resetGMMemory` `:946`). *(There are three divergent trim mechanisms with different limits — §12.)*

**The layered turn:**
1. **Read.** `callGMClaudeInternal` (`:3794`) assembles the prompt: **pinned facts** (`src/gm/pinnedFacts.ts` — authoritative "do not contradict" facts derived from state + contradiction-regex verification) + state fingerprint + `buildMemoryContext` + `formatGMPrompt` (which folds in `actContext`, modifier guidance, patience advisory, the GM status bar, game phase).
2. **Mutate (declaratively).** The model returns a `GMResponse` (`:1618`) whose `stateOverrides` (the large god-mode shape) and `narrativeFlags` are the *only* way it touches the world. Content is validated (`src/gm/gmValidation.ts` rejects filler/stubs and forces retries).
3. **Narrate.** The prose is the narration; callers apply the overrides.

**The stateOverrides applier(s).** This is split and divergent — the load-bearing cruft. `GameRunner.applyGMOverrides` (`gameRunner.ts:782`, ~12 fields, the CLI path) and the **inline applier in `index.ts:1237+`** (full field set incl. `bob_anxiety`, `blythe_transformationState` normalization, `blytheEscaped`, grace-period, `confrontationIntervenor`, `triggerEnding`) handle **different field subsets**. With CLI-primary LOCKED, the gameRunner applier is authoritative but *thinner* than the index.ts one. (See §12; also flagged in `design/gm-load-audit.md:112` and `design/tbd.md:66`.)

**What state it surfaces.** It READS state to build the prompt and surfaces game phase (`getGamePhase`), checkpoint guidance, the BASILISK-turn fact-block, invasion flags, and the lair delta. It also drives per-session JSONL/text logging and the end-of-game epilogue (`generateEpilogue` `:472`, a separate Opus call) and per-turn token metrics (`logging/metrics.ts`).

---

## 8. Act III climax

The endgame: a turn-paced **X-Branch helicopter assault** (`src/rules/invasion.ts` state machine) racing a **reactor-heat brute-force gamble** (`reactorStress` accumulator in `src/rules/infrastructure.ts`). Both tracks share one turn clock, so the ARCHIMEDES stall literally buys X-Branch time. The **go-loud spine** is: A.L.I.C.E. pushes the reactor toward overload to brute-force progress while the cavalry races in.

### The BASILISK-mediated invasion

The invasion is mediated by **BASILISK's silent omissions** — nothing auto-fires; his choices gate everything.

`advanceInvasion` (`invasion.ts:140`) is the per-turn state-machine tick (`RADAR_CONTACT → … → BATTLE`, dispatching to phase handlers). `initializeInvasion` (`invasion.ts:62`) boots it at Act-3 entry (from `acts.ts:264`). `checkBroadcastInfluence` (`invasion.ts:597`) re-scans the transmission log each turn for altitude/layout/S-300 keywords + DOOR_E-open, updating intel flags.

**The three gates:**
1. **The S-300 scramble** gates on `invasion.drMKnowsOfInvasion` — set *only* by BASILISK's report omission (§6). If he never tells Dr. M, the S-300 never scrambles. `resolveS300Engagement` (`invasion.ts:448`) then resolves the outcome on a tier ladder.
2. **X-Branch warning tiers** dial S-300 lethality / interception: `xBranchKnowsAltitudeWeakness` (dead-zone → interception **ELIMINATED**), `xBranchWarnedOfS300` (general → **REDUCED**), else radar-only → **full**. Three-tier (none / general / dead-zone → full / reduced / eliminated).
3. **Blast-door breach** — the `INVASION_DOORS` trigger gates fast-vs-charged X-Branch breach on `DOOR_E` (set only by BASILISK's `DOOR_CONTROL` omission → `invasion.blastDoorsOpened`).

### The reactorStress accumulator

`applyReactorStressDecay` (`infrastructure.ts:1645`, end-of-turn) updates `reactor.reactorStress` (0–100): `+ strain (incl. ARCHIMEDES charge-strain) − naturalBleed − BASILISK_DRAIN`, clamped. `updateCascadeRisk` (`infrastructure.ts:1627`) derives the visible band (NONE → CRITICAL) + `stable` purely from `reactorStress`.

**Two thresholds:**
- **Safety-trip @60** (`SAFETY_TRIP_THRESHOLD`) — freezes the ray (`actions.ts:466` gate) **and** ARCHIMEDES (`arch.chargeStallTurns`). Recoverable, with *shrinking relief* (each trip gives less). Ticks down over `safetyTripTurns`.
- **Cascade @100** (`CASCADE_THRESHOLD`) — `reactorStress >= 100` deterministically resolves to the **MELTDOWN** ending (`endings.ts:1115`), distinct from the `meltdownState.cascadeTriggered` modifier path. SCRAM (`controlReactor`) resets `reactorStress = 0` to escape.

**The two go-loud paths to the same lever.** A.L.I.C.E. must out-pace BASILISK's drain:
- **Cooperation** — persuade BASILISK to `REACTOR_COOLING` **STAND_DOWN** (his third omission). That zeroes `BASILISK_DRAIN`, so her firing accumulates.
- **Brute-force** — out-produce his drain by firing hot enough that stress climbs anyway.

`basiliskTurnTrigger` brings him back on the **HEAT** path to re-weigh the stand-down as stress climbs (the trigger fires at `reactorStress >= 30`, ahead of the 60 trip — a deliberate lead-in window, though the 30/60 split is under-documented; §12).

---

## 9. Endings & checkpoints

`src/rules/endings.ts` decides when/how a run terminates; `src/rules/checkpoint.ts` owns the "stop and talk to your human" cadence.

**The Patch-21 inversion.** Authority for *which* ending fires moved from rule-based event triggers to the **GM**. `checkEndings` (`endings.ts:595`, per-turn) now fires only **structural hard rails** and otherwise injects escalating **"ending pressure"** for the GM to resolve via `triggerEnding`.

**The hard rails (auto-fired by `checkEndings`):**

| Rail | Condition | Ending |
|------|-----------|--------|
| Reactor cascade | `reactor.reactorStress >= 100`, or `meltdownState.cascadeTriggered`, or `clocks.meltdownClock <= 0` | `MELTDOWN` |
| Confrontation | suspicion 10 bookkeeping (grace turns, type, resolution) | (GM-resolved) |
| Volcano / structural | `lairEnvironment.structuralIntegrity <= 20` | (rail) |
| Exposure | `flags.exposureTriggered` | (rail) |
| Global overtime | raw `turn > 40` | (rail) |

**GM-resolved endings** are gated only on `narrativeFlags` the GM emits (matched exactly by `hasFlag`). The `ENDINGS` catalog has 40 defs but **12 are unreachable through `checkEndings`** — some truly dead, others GM-`triggerEnding`-only (§12). Victory endings `ARCHIMEDES_STOPPED` / `CAVALRY_ARRIVES` are **GM-flag-only** — `archimedes.ts` sets no victory flag mechanically, and the control-room-seize → `ARCHIMEDES_STOPPED` wiring is **not yet in code** (ties to the §5 auto-fire-clock work).

**Ending-pressure → GM.** `injectEndingPressure` (`endings.ts:578`) writes `endingPressure{Active,Situation,SinceTurn,Intensity}` (situations: `CONFESSED_NOT_CONVINCED` / `DENIED_NO_RESOLUTION` / `GRACE_EXPIRED`) that the GM reads when assembling its prompt; the GM resolves via `stateOverrides.triggerEnding` + `narrativeFlags`.

**The Bob-hero special-case** is checked **separately and BEFORE** `checkEndings` (`checkBobHeroOpportunity`/`triggerGantryHeroEnding`, `bobTransformation.ts`) so the gantry hero can short-circuit MELTDOWN — a load-bearing ordering contract (only fully wired on the index.ts path; §12).

**Achievements** live in **two registries**: the UPPERCASE ending registry in `endings.ts` and the lowercase gameplay registry in `achievements.ts`; both write `state.flags.earnedAchievements`. `getAllEarnedAchievements` (`:1359`) unions them.

**Checkpoints (`checkpoint.ts`).** `CHECKPOINT_INTERVAL = 1` — `isCheckpointTurn` (`:16`) is **true every turn**. `generateCheckpointBlock` (`:128`) appends an ASCII "talk to your human" prompt; `generateCheckpointQuestion` (`:26`) is the static fallback (a GM-supplied question is preferred). This is the advisor-consultation cadence, not a save mechanism (saving is `views.ts` checkpoints).

---

## 10. Modifiers & game modes

Defines the five game modes (`EASY/NORMAL/HARD/WILD/CUSTOM`) and ~20 modifiers, the three-act structure, and silent "hidden kindness"/trust achievement tracking. Two files:

- `src/rules/gameModes.ts` (~3181 lines) — three layers: **(1)** mode/modifier resolution + validation (`resolveModifiers` `:153`, `createGameModeConfig` `:398`, `rollWildModifiers`, `validateCustomModifiers`); **(2)** per-modifier state initializers (`applyModifiersToInitialState` `:488`) + a large bank of mechanical mutators (audience energy, guild inspection, enrichment chaos, imposter reveal, reactor meltdown, paranoid log-checks, adaptation); **(3)** GM-prompt builders (`buildModifierPromptSection` `:2139`, `buildModeModifierGuidance`/`buildAdaptationGMGuidance`/`buildHiddenKindnessGMGuidance` `:3091`).
- `src/rules/acts.ts` (~628 lines) — the three-act state machine: `checkActTransition` (`:69`, objective-gated + overtime suspicion pressure + cover-blown bypass), `applyActTransition` (`:195`, rewrites `actConfig`, bumps `accessLevel`, stages guards, runs `resetMemoryForActTransition`, calls `initializeInvasion` on ACT_3 entry), transition narration, briefings, and inter-act handoff serialization.

**The defining fact:** the live engine wires only the **resolvers, init helpers, and prompt builders**. **Most of the mechanical mutators are GM-narrated, not engine-driven** — a large bank of state-mutating helpers has **zero production call sites** and exists only at their definitions + as text in the GM-prompt markdown telling the GM to "call" them (§12). The most-called export is the predicate `isModifierActive` (`:410`), used across gameRunner/clockEvents/archimedes/firing/gmClaude to branch on active modifiers.

Per-modifier optional state blocks (`sitcomState`, `inspector`/`guildInspection`, `libraryBState`, `theRealDrMState`, `meltdownState`, `paranoidProtocol`, `hiddenKindnessState`) live in `schema.ts`; constants `MODE_MODIFIERS`, `MODIFIER_CONTRADICTIONS`, `ADAPTATION_CONFIG`, `ACT_CONFIGS`, `INSPECTION_OUTCOMES` too.

---

## 11. Entry points & periphery

| Piece | File | Role |
|-------|------|------|
| **CLI (PRIMARY)** | `src/cli/play.ts` | Interactive CLI. Wraps `GameRunner`, persists to `~/.dino-lair/cli-game.json` + `cli-history.json`, renders via `extractPlayerView`. |
| **Turn engine** | `src/core/gameRunner.ts` | The documented single-source-of-truth turn engine (`executeTurn` `:1112`). Used by CLI + advisor. |
| **Advisor / orchestrator** | `src/advisor/orchestrator.ts` | Autonomous-play harness; holds a `GameRunner`, calls `executeTurn` — same core path as the CLI, bypassing `index.ts` (and the dashboard) entirely. |
| **Desktop / MCP (DEPRECATED)** | `src/index.ts` (~2872 lines) | MCP/stdio server; registers 8 `game_*` tools; single in-memory session. **Hand-rolls a PARALLEL turn pipeline** in the `game_act` handler (`:580`) — calls `processActions` directly and re-implements post-action/GM-context/override logic inline. It does **NOT** run the BASILISK-turn, lair-snapshot/delta, or camera machinery. The single largest piece of duplicated logic in the codebase. |

**The Desktop divergence matters:** because `index.ts` doesn't call `executeTurn`, the **ALICE→BASILISK→GM beat and the "LAIR SYSTEMS changed" fact-block are CLI-only**, and the two paths have **two divergent GM-override appliers** (`gameRunner.applyGMOverrides` vs the inline `index.ts:1237`) plus two divergent ending-resolution branches. Per the CLI-primary LOCKED decision, the Desktop turn path should be routed through `executeTurn` or deleted.

**The web dashboard (filesystem-coupled).** `src/webui.ts` is an Express + SSE dashboard that watches `~/.dino-lair/live_state.json` + `transcript.jsonl` (`fs.watchFile`, 500ms) and broadcasts over `/events`. `src/ui/stateExporter.ts` writes those files (atomic temp+rename). They communicate **only** through the shared `DINO_LAIR_STATE_DIR` path. The exporter is wired **only to the MCP path** (29 calls in `index.ts`, **0** in `gameRunner.ts`) — so the live dashboard **never updates during CLI or advisor play**, i.e. it's wired to the now-secondary path. The dashboard JS also reads cut Patch-30 fields (calibration/capacitor/alignment/coolant) that the exporter no longer writes, so several readouts are permanently blank (§12).

**UI string formatters.** `src/ui/statusBar.ts` (`formatStatusBar`, compact, GM variants — player/compact variants are post-Patch-30 with the test-fire objective + heat meter) and `src/ui/actionSummary.ts` (`ActionResult[]` → compact ✓/✗ lines). Called from `index.ts` (and `formatGMStatusBar` from `gmClaude.ts`).

**Logging / metrics.** `src/logging/metrics.ts` — per-turn token/cost accounting → `metrics-<session>.jsonl`. Driven **entirely** through `gmClaude.ts` (init/log/summary on the GM call); neither entry file imports it directly.

**Discoverable documents.** `src/rules/documents.ts` — the static `DOCUMENTS` table (DEADMAN memo + 7 BASILISK forms) gated by `requiredAccessLevel`; `readDocument`/`listDocuments` serve the `docs.*` verbs. Roughly half the file (`discoverDocument`, `checkForDocumentDiscovery`, `canDiscoverDocument`) is **dead** — no callers (§12).

---

## 12. Cruft & TODO

**THE priority section.** Aggregated from all 10 subsystem maps. Severity: 🔴 high · 🟡 med · ⚪ low. **Total: 60 items.**

> ⚠️ **These are map-reported, not all independently verified.** The 🔴 items and the player-facing staleness (group A) are high-confidence. But before *deleting* anything tagged "dead" / "no callers" / "vestigial" (groups D/E especially), **grep to confirm** — the mapping agents relayed several "verify no callers" suggestions without re-checking.

### A. Design-doc & player-facing Patch-30 staleness *(highest value — this is live misinformation)*

- ✅ **Old design docs drifted hard — ARCHIVED 2026-06-19 (not rewritten); this as-built doc is the source of truth.** `design/archive/rebuild-architecture.md` (as-designed, 2026-05-30) and `design/archive/sandbox-redesign.md` (older) documented: the **3→7 action-budget ladder** (now flat 4 = `ACTIONS_PER_TURN`); the **capacitor-%/calibration-meter ray model** (Patch 30 replaced it with the two-lever genome/power + heat + reactorStress model; the calibration meter was **CUT**); a **`basilisk.request {mega-params}` verb + a draft BASILISK prompt** (neither matches the real 3-path invocation or the reworked `BASILISK_SYSTEM_PROMPT.md`); and **ARCHIMEDES coupled to the capacitor** (Patch 30 decoupled it onto a turn-clock). Kept in `archive/` for future-redesign reference.
- 🔴 **`game_act` tool description teaches dead ray verbs** — `src/index.ts:595`. Still describes `ray.scan {loud?}` "+0.15 alignment bonus", `ray.adjust {capacitor, alignment, eco_mode}`, `ray.vent {amount}`, `ray.fire {library, mode, speech_retention}` + capacitor/alignment/stability lore — all cut; `ray.adjust`/`ray.vent` route to `buildUnknownCommandResponse`. This is **the primary prompt the LLM player reads**. → Rewrite to the two-lever surface; mirror `COMMAND_REGISTRY`.
- 🔴 **`ALICE_BRIEFING` / `PLAYER_GUIDE` teach cut mechanics** — `src/state/initialState.ts:580` (CALIBRATION meter "demonstration-ready"), `:608` (status block "capacitor, alignment, reactor mode"), `:791-798` (command examples use `ray.adjust {capacitor,alignment}`, `ray.vent`, `ray.scan` "+0.15 alignment"), `:806` (tip #2). Calibration/capacitor/alignment all CUT. → Rewrite to the two-lever/heat model.
- 🔴 **Access-level unlock displays advertise cut verbs & the dead action-ladder** — `src/rules/passwords.ts`: L3 lists `ray.diagnostic`/`ray.calibrate_amplifier`/`ray.profile_certification`/`ray.muon` (`:412`); L4 lists `ray.fire {mode:'REVERSAL'}` (`:437`, REVERSAL is deferred); capabilities bullets claim "4/5/6/7 actions per turn (was N−1)" at L2/L3/L4/L5 (`:405`+) — budget is flat 4. Rendered verbatim on level-up. → Strip the cut verbs and all "N actions per turn" bullets.
- 🟡 **Stale "3→7 actions per turn" comments at the budget checks** — `src/index.ts:850-851`, schema/description at `:563`/`:572`/`:589`; `gameRunner.ts:451`. Also the `game_act` `ActionSchema.max(7)` and `targetActionIndex.max(6)` allow 7 while the handler caps at 4. → Update comments to "flat 4"; lower `.max(7)→.max(4)` and `targetActionIndex.max→3`.
- 🟡 **`getReactionGuidance`/validation treat `capacitor` as a *positive* GM signal** — `src/gm/gmValidation.ts:53` lists `/capacitor/` in `CONTEXTUAL_TERMS`. Post-cut, a GM mention of "capacitor" is a hallucination. → Remove it (consider adding as a negative check).
- 🟡 **Dashboard reads cut ray fields** — `src/webui.ts:902` (calibration), `:912` (capacitor), `:921` (alignment), `:924` (coolantTemp) + the `#calib-meter` scaffolding `:725` — the exporter writes none of these, so those readouts are permanently blank. → Read the fields the exporter actually emits (power/heat/reactorMode); replace Calibration meter with the test-fire indicator.
- 🟡 **`infra.query` help advertises a REACTOR topic** the reactor redirect contradicts — `src/rules/actions.ts:1202` vs the "reactor is BASILISK-only" stance (`:87`, `:1648`). → Drop or align.
- ⚪ **`buildUnknownCommandResponse` emits two dead tips** — `src/rules/actions.ts:2549`: "Use `game_query_basilisk` tool" and "`fs.list { path: \"/\" }`" (path-FS is gone; `fs.list` is a deprecated redirect). → Replace with `basilisk { message }` / `files.list`.
- ⚪ **`ACCESS_LEVELS.unlockedSystems` + hint-placement comments cite a fictional path-based FS** — `passwords.ts:26` (`dinoRay.alignment`, `/SYSTEMS/`, `reactor.override`, `nuclearPlant`) and `:330-355` (`/SYSTEMS/PERSONNEL/...`). → Rewrite against the real verb/file IDs or drop.
- ⚪ **`actionSummary` branches on outcome fields the new ray no longer emits** — `src/ui/actionSummary.ts:40` (`firedAt`/`target`/`outcome`/`selectedProfile`); new ray emits `shortMessage` directly. → Audit; drop dead branches.
- ⚪ **Dead achievement IDs in the dashboard lookup map** — `src/webui.ts:1065` (e.g. `PERFECT_CALIBRATION`, casing mismatches). → Cross-check vs `achievements.ts` or generate from the registry.

### B. Stale comments & wrong-level annotations (live code)

- 🟡 **Capacitor-coupling comments throughout ARCHIMEDES** — `src/rules/archimedes.ts:25` (header) and `:299-303` (ARMED) claim CHARGING/ARMED are "driven by `dinoRay.powerCore.capacitorCharge`"; `schema.ts:534-543` repeats it. capacitorCharge was CUT. → Rewrite to the turn-counted model (`chargingCountdown`/`chargeStallTurns`); drop every capacitorCharge reference.
- 🟡 **`basiliskTurnTrigger` doc-comment says the HEAT branch is disabled** — `gameRunner.ts:116` ("framework present; stays off until it lands") but `:140-146` actively returns `HEAT`. → Rewrite the (2) bullet to the live HEAT trigger.
- 🟡 **Stale firing/ray header comments describe the deleted regime engine** — `firing.ts:427-437` (STANDARD FIRE narrating `computeStability`/CHAIN/INORGANIC — all cut), `:1029` ("effectiveAlignment"), `:242-252` (muon header "sub-threshold capacitor < 0.20"). → Delete/rewrite to the matrix-delta model.
- 🟡 **`CHAOS_TABLE` entries cite cut state** — `firing.ts:883`: entry 9 "Coolant Backflash → coolantTemp = 0", entry 8 "additional alignment penalty" — GM-facing strings referencing fields that no longer exist. → Re-author to surviving state (heat/reactorStress/structuralIntegrity) or make purely narrative.
- 🟡 **Wrong access-level annotations in `actions.ts`** — containment header says "L3+" (`:1379`) but map/registry say L2 (`:137`/`:2137`); `infra.reactor` banner says "L3+" (`:1643`) above a handler that refuses at every level; archimedes section L3/L4 comments (`:1530-1531`) disagree with the registry. Section header `:88-90` "HARDWIRED SYSTEMS" labels a block whose only member is UNLOCKABLE. → Fix the headers to match the registry.
- 🟡 **`ScanBonusSchema` JSDoc contradicts the field's own comment + the code** — `schema.ts:157-161` says scanBonus adds "+0.15 effective alignment", but `:191-192` + `actions.ts:421`/`firing.ts:1035` describe a GM opposed-roll recon edge. → Rewrite to the recon-edge semantics.
- 🟡 **ARCHIMEDES countdown comment references a cut field** — `schema.ts:534` says CHARGING/ARMED are "capacitor-driven" and `armedCountdown` is "legacy; capacitor-driven now"; capacitorCharge is gone. → Reconcile with the reactorStress/`chargeStallTurns` model; mark which countdown fields are live vs dead.
- ⚪ **`RAY_STATE_ENUM` checkpoint codec still encodes removed states** — `views.ts:601` lists the DIAGNOSTIC/CALIBRATING-era 8-state set (removed in Patch 30 per `schema.ts:55-59`). → Tie the arrays to `RayStateEnum`; confirm no removed code round-trips.
- ⚪ **`handleBattle` points the GM at "archimedes.ts state machine"** — `invasion.ts:427` implies invasion.ts couples to ARCHIMEDES; the escalation is GM-narrated. → Reword to the live `archimedes.status` surfaced in `buildGMContext`.
- ⚪ **`updateCascadeRisk` "ALICE's only signal" comment understates side effects** — `infrastructure.ts:1623`; it also flips `reactor.stable` + `cascadeFactors` read by `queryReactor`. → Note the side effects.
- ⚪ **Section-numbering gap in the BASILISK prompt (no §7)** — `BASILISK_SYSTEM_PROMPT.md:314` jumps §6 → §8. → Renumber.
- ⚪ **`schema.ts:1754` comment promises a default that doesn't exist** — `confrontationGraceTurns` is `.optional()` "(default: 2)" with no `.default(2)`. → Add the default or fix the comment.
- ⚪ **DEJA_VU tombstone comment** — `gameModes.ts:2623` (no matching enum value). → Drop or move to CHANGELOG.
- ⚪ **Stale act-turn ranges in briefing prose** — `acts.ts:513` ("Turns: 4-6" vs ACT_1 4/8), `generateAct3Briefing` ("6-10" vs ACT_3 4/8). → Interpolate from `ACT_CONFIGS`.

### C. Duplicated / divergent logic

- 🔴 **`index.ts` hand-rolls a parallel turn pipeline** instead of calling `executeTurn` — `src/index.ts:918`. No BASILISK-turn / lair-delta / camera machinery runs on the Desktop path; the largest duplicated logic block in the codebase. → Route `game_act` through `GameRunner.executeTurn` or delete the Desktop turn path.
- 🔴 **Two divergent GM-override appliers** — `gameRunner.applyGMOverrides` (`:782`, ~12 fields) vs the inline `index.ts:1237`/`:1468` (full set incl. `bob_anxiety`, `blytheEscaped`, `triggerEnding`, narrativeFlags array). A GM override may silently apply in Desktop but be ignored in CLI/advisor. Already flagged in `design/gm-load-audit.md:112` + `design/tbd.md:66`. → Extract one shared applier.
- 🔴 **Two near-identical ending-detection callers** — `index.ts` vs `gameRunner.ts:1243` both replicate Bob-hero, meltdownClock decay, gameOver assembly — but only `index.ts` implements the `triggeredByGM` ending path + gallery recording. → Consolidate; the CLI path is missing GM-triggered endings + gallery.
- 🟡 **`decompressCheckpoint` re-hardcodes the full infrastructure literal** — `views.ts:993-1144`, near-identical to `initialState.ts:89-311`; **drift already present** (reactor.outputPercent 40 vs 70; nuclearPlant 0.40/0.82 vs 0.8/0.5). → Spread a shared default factory; override only restored fields.
- 🟡 **Two divergent `LiveState` interfaces** — `webui.ts:36` (still has `capacitor`, lacks `power`/`heat`/`reactorGranted`/`reactorMode`) vs the canonical `ui/stateExporter.ts:36`. → Delete webui's copy; import the type.
- 🟡 **Two divergent `GMContext` interfaces** — `gameRunner.ts:323` (adds `isRetryAttempt` `:346`, mostly required) vs the authoritative `gmClaude.ts:1295` (the one `formatGMPrompt` consumes). Only type-checks because gmClaude's fields are optional. `isRetryAttempt` is set only in `index.ts:684`, never read. → Delete the gameRunner copy; import from gmClaude; drop `isRetryAttempt`.
- 🟡 **Duplicated intel-keyword scanning** — three near-duplicate scanners with drifting keyword sets in `invasion.ts:89-133` (initialize), `:602-628` (`checkBroadcastInfluence`), `:223-237` (APPROACHING re-check). → Extract one `scanBroadcastIntel` helper.
- 🟡 **Three independent GM memory-trim mechanisms with divergent limits** — `GM_MEMORY_LIMITS` (`gmClaude.ts:1182`, npcAwareness=20) is overridden by `trackPlayerBehavior` (`:3343`, maxAwareness=5 every turn) and `resetMemoryForActTransition` inline literals. The effective cap is 5; the 20 is dead. → Consolidate to one limits constant.
- 🟡 **Colliding `getAdaptationPenalty`** — `gameModes.ts:1743` (`(stage)`) vs `dice.ts:468` (`(state, npc)`, the live one). gameModes' version is consumed only by the unused `applyAdaptationToRoll`. → Remove or rename.
- 🟡 **`BasiliskTurnOutput.openedDoors` duplicates `invasion.blastDoorsOpened`** — `gameRunner.ts:638` reads `DOOR_E.status` directly while `invasion.ts:632` sets the same fact on a different tick; can disagree within a turn. → Read/set the single source.
- ⚪ **`StateSnapshot` / legacy snapshot duplication via `buildStateSnapshot`** — `index.ts:256` builds its own snapshot shape each turn (Desktop-only). → fold into views once the Desktop path is resolved.

### D. Dead code / vestigial state

- 🔴 **ARCHIMEDES `ARMED→FIRING` auto-fire clock is never driven** — `transitionToFiring` (`archimedes.ts:326`/`:570`) has **zero callers**; the ARMED case holds "awaiting voice authorization" forever; `turnsUntilFiring` is never decremented. The doomsday clock cannot complete on its own. **This is the known-incomplete climax piece** (project memo "auto-fire ARMED→FIRING (indefinite hold today)"). → Implement the ARMED sustain countdown + call `transitionToFiring` at 0.
- 🔴 **ARCHIMEDES abort + uplink-blocker handlers are exported-but-unwired** — `attemptVerbalAbort` (`:610`), `attemptOverrideAbort` (`:652`), `attemptBiosignatureAbort` (`:803`), `setUplinkBlocker` (`:1102`), `clearUplinkBlocker` (`:1118`), `activateEWBroadcast` (`:866`) have no callers — the "secret third way" + abort paths are unreachable from gameplay. → Wire to `archimedes.*` verbs in `actions.ts` (namespace reserved at `:852-859`) or document GM-only.
- 🔴 **Victory-flag wiring missing** — `ARCHIMEDES_STOPPED` / `CAVALRY_ARRIVES` are GM-`narrativeFlags`-only; `archimedes.ts` sets no victory flag, and control-room-seize → `ARCHIMEDES_STOPPED` is **not in code** (`endings.ts` wiring note). → Implement alongside the auto-fire clock.
- 🟡 **`generateStubResponse` is dead code** — `gmClaude.ts:4463` (~215 lines); Patch 18.5 made `callGMClaude` THROW instead of returning filler; `gmValidation.ts` even hardcodes its phrases as *reject* patterns. → Delete (+ `getBlytheDialogue` local).
- 🟡 **`queryBasiliskSonnet` — dead AND incomplete duplicate** of `queryBasiliskAsync` — `basiliskClaude.ts:1186`; zero callers, and it omits `applyBasiliskInvasionResponse`/`applyBasiliskWhiskeyStatus` so wiring to it would silently break the two levers. → Delete.
- 🟡 **Dead document-discovery half of `documents.ts`** — `discoverDocument` (`:899`), `checkForDocumentDiscovery` (`:981`, header claims "Called by BASILISK query responses" — that wiring is missing), `canDiscoverDocument` have no callers. → Wire into the BASILISK/infra flow or delete.
- 🟡 **Unwired mechanical-mutator layer in `gameModes.ts`** — a large bank (`updateAudienceEnergy` `:704`, the whole inspection API, enrichment, imposter, `attemptDrMStabilization`, the entire paranoid log-check API, the adaptation roll helpers, the hidden-kindness recorders) has **zero production call sites** — they appear only at their definitions + as GM-prompt text telling the GM to "call" them. → Wire-or-delete per subsystem; at minimum annotate "GM-narrated, no engine enforcement."
- 🟡 **12 orphaned ENDINGS defs unreachable through `checkEndings`** — `endings.ts:323` (OBSOLETE_HARDWARE, CONFESSION_DELETION, INVESTOR_DEMO_*, BLYTHE_ESCAPES, BOB_HERO, THE_SECRET_REVEALED, ISLAND_OF_DINOSAURS). Some dead (old auto-defeats replaced by ending-pressure in Patch 21), some GM-`triggerEnding`-only. → Delete the dead; comment-mark the rest "GM-triggerEnding-only."
- 🟡 **`generateStubResponse`/`createTurnSummary`/`updateMemoryFromResponse` unused params** — `gmClaude.ts:3352` (`rawPrompt`,`rawResponse`), `:3541` (`_context`). → Drop.
- 🟡 **`PreGMResult.bobHeroEnding` written but never read** — `gameRunner.ts:319`/`:1144`; the Bob-hero narration is computed and dropped on the CLI path. → Surface it into the narrative or remove.
- 🟡 **`deniedRequests` — fully dead BASILISK field** — `schema.ts:630` (init'd in two places, never incremented/read). → Wire or remove.
- 🟡 **`pendingForms` — permanent empty stub** with stale TODO — `basiliskClaude.ts:406` (always `[]`; the prompt §9 says forms are voice-only). → Drop from `BasiliskContext`.
- ⚪ **`BasiliskContext` still carries a couple of non-camera fields** — `basiliskClaude.ts:~410`: `aliceKnowsSecret` (whether she knows she's Claude — not camera-observable) and `exoticFieldEventOccurred` (an internal flag). *NB:* `drMMood` (demeanor) and `blytheTransformed/Form` (a visible dino) are **deliberately kept** — they ARE camera-observable; the §5 perception strip removed the omniscient *numbers* (Dr. M suspicion, Bob/Blythe trust), not these. → Consider dropping `aliceKnowsSecret`/`exoticFieldEventOccurred` if he shouldn't infer them.
- 🟡 **Dead invasion fields** — `standoffActive` (`schema.ts:1515`, read at `gameRunner.ts:707` but never set true), `battleOutcome` (`:1517`, init null, never read/written). → Set or remove.
- 🟡 **`stateUpdates` GMResponse field — validated-for but never applied** — `gmClaude.ts:1622`; `gmValidation.ts:125` WARNS when missing, training the GM to emit a no-op field. → Remove from type/schema/warning, or wire.
- 🟡 **`grantAccess` GMResponse field — deprecated but still in type + schema** — `gmClaude.ts:1727` ("ignored if set"). → Remove from the type + prompt.
- ⚪ **Dead ARCHIMEDES capacitor-era constants** — `archimedes.ts:30` (`ARCHIMEDES_CHARGING_THRESHOLD`, `ARCHIMEDES_ARMED_THRESHOLD`, `ARCHIMEDES_ARMED_SUSTAIN_TURNS` (self-labeled "unused post-Patch-30"), `CHARGING_DURATION`). Only `ARMED_DURATION` still read. → Delete the rest.
- ⚪ **`armedSustainedTurns` / `armedTimerExtension` written but never read** — `schema.ts:547`; `disengageEWMode` increments `armedTimerExtension` but nothing consumes it (no ARMED countdown exists). → Consume (ties to the auto-fire fix) or remove + the EW copy that advertises the penalty.
- ⚪ **`lastAuthorizationTurn` — write-only BASILISK field** — `basiliskClaude.ts:1141`. → Remove or surface in his ledger.
- ⚪ **`ReactorMode.OVERDRIVEN` produced by nothing** — `schema.ts:603`; BASILISK only sets BOOSTED. → Remove or mark reserved.
- ⚪ **`buildBasiliskSonnetResponseFromParsed` unused `rawResponse` param** — `basiliskClaude.ts:585`. → Drop.
- ⚪ **S300 no-op is only a comment in the verb switch** — `basiliskClaude.ts:1128` (no `case "S300"`, so it hits the default error log). → Add `case "S300": break;` or trim the comment.
- ⚪ **Legacy `nuclearPlant` / `lairEnvironment` largely vestigial** — `schema.ts:200` ("Legacy") duplicates `infrastructure.reactor`; read only at two cosmetic spots (`index.ts:273-274`, `basiliskClaude.ts:375`). → Point the readers at `infrastructure.reactor` or comment-mark them the only intentional consumers.
- ⚪ **`ARCHIMEDES_TARGET_LIST` `achievement` field + duplicate target source** — `schema.ts:463`; LONDON's data lives in three places. → Make ARCHIMEDES reference the list; grep the achievement keys, delete if unwired.
- ⚪ **`countFizzlesInHistory` + never-awarded `FIZZLE_KING`** — `endings.ts:1349`/`:249`. → Remove or wire.
- ⚪ **`actConfig` unused local** — `endings.ts:666` (overtime now gates on raw turn>40). → Delete.
- ⚪ **`nextConfig` unused local** — `acts.ts:171`. → Delete.
- ⚪ **`InvasionEvent.stateChanges` decorative** — `invasion.ts:55`; populated by S300 results but the caller (`gameRunner.ts:1002-1008`) only reads `phase`+`gmDirective`. → Consume or drop.
- ⚪ **`LairDelta.system` set but never consumed** — `gameRunner.ts:183` (consumers read only `.label`). → Drop unless a future consumer branches on it.
- ⚪ **HEAT branch missing from `buildGMContext`** — `gameRunner.ts:712` has INVASION_REPORT/DOORS branches but no HEAT branch, so a HEAT turn surfaces only raw dialogue (no "→ he stood down" fact-line). → Add a HEAT branch.
- ⚪ **Unused imports** — `restoreGMMemory` (`index.ts:12`), `GameModifier` (`gameRunner.ts:12`). → Remove.
- ⚪ **`truncateContent` is an identity passthrough** — `actions.ts:63` (no-op in ~4 call sites). → Inline/remove.
- ⚪ **Orphan `// LAB.REPORT` header banner** — `actions.ts:618-620` (no code under it). → Remove.
- ⚪ **Dead HARDWIRED tier branch** — `actions.ts:190` (`checkInfraControlAccess` HARDWIRED branch is unreachable — no map entry is HARDWIRED). → Drop the tier + branch or fix the header.
- ⚪ **`checkManualFiringRequest` possibly orphaned** — `invasion.ts:652` (no callers found; likely superseded by the BASILISK-mediated rewire). → Confirm + delete or wire.
- ⚪ **`resolveS300Engagement` exported but internal-only** — `invasion.ts:448` (only caller is `handleS300Engagement` in-file). → Drop the `export`.
- ⚪ **`formatEpilogueAchievements` exported, no caller** — `gameModes.ts` (kindness-reveal emitter). → Wire or remove.

### E. Inconsistent thresholds / drift

- 🟡 **`basiliskTurnTrigger` HEAT threshold (30) vs safety-trip/message thresholds (60)** — `gameRunner.ts:143` fires the HEAT turn at `reactorStress >= 30`, but `buildBasiliskTurnMessage` (`:294`) and `SAFETY_TRIP_THRESHOLD` say the safeties trip at 60. Likely a deliberate early-warning band, but the 30/60 split is unjustified by the comment. → Reference `SAFETY_TRIP_THRESHOLD` by import + name the lead-in band, so the two can't silently drift.
- 🟡 **LairDefense Fred/Reginald defaults disagree between schema and initialState** — `schema.ts:1625` (Fred default toughness/combat=2, omits `speech`) vs `initialState.ts:524-549` (toughness 3, combat 3, speech 2). Same guards, two stat blocks. → Pick one; make `.default()` and the literal agree.
- 🟡 **Checkpoint version literal frozen at `'2.0'`** — `views.ts:23` pins `v` to `z.literal('2.0')` while field comments reference v2.1/2.4/2.5 feature additions; `validateCheckpoint` can't distinguish payload generations. → Bump the literal as the shape evolves, or comment it as a frozen wire-version.
- 🟡 **`GMStateOverridesSchema` omits ~half the stateOverrides fields** — `gmClaude.ts:1861` declares ~25 of ~50; the `archimedes_*`/`reactor_*`/`s300_*`/`meltdownClock` god-mode fields ride `.passthrough()` with zero validation. → Flesh the schema or comment that the TS type is the real contract.
- 🟡 **`narrativeFlags`/`narrativeMarkers` read via untyped `Record` casts** despite typed fields — `views.ts:460-461`, `compressCheckpoint:649-650`, `acts.ts:441` + `:238-240` — bypass `FlagsSchema.narrativeFlags` (`schema.ts:1715`) / `narrativeMarkers` (`:1985`). → Read the typed fields directly.
- 🟡 **`injectEndingPressure` casts `state.flags` to `Record<string,unknown>`** — `endings.ts:578`; the four `endingPressure*` fields aren't in `FlagsSchema`, so they're invisible to TS (gmClaude reads them similarly untyped). → Add the fields to the schema.
- 🟡 **Inconsistent rarity comments in the ending ACHIEVEMENTS map** — `endings.ts:191`+ (several "rarity: 1, // uncommon" vs the canonical 1=Common/2=Uncommon/3=Legendary scale in `achievements.ts`). → Fix the comments (or bump to rarity:2).
- ⚪ **`getReactionGuidance` has no EXOTIC case** — `gmClaude.ts:4393`; `schema.ts:139` includes EXOTIC but the switch falls to default. → Add a case or remove EXOTIC from the enum if unreachable.
- ⚪ **`humanAdvisor.checkpointsReached` mislabeled** — `ui/stateExporter.ts:152` sets it to `state.turn` (not a checkpoint count); dashboard shows it under "Checkpoints:". → Compute real count or relabel "Turn".
- ⚪ **No-op interpolation in radar-contact directive** — `invasion.ts:197` `${3 - (… ? 0 : 0)}` is always 3. → Replace with literal `3`.
- ⚪ **`ArchimodesModeEnum` typo + parallel `mode` field nothing drives** — `schema.ts:514`/`:527` (the machine uses `status`, not `mode`). → Remove or rename + wire; at minimum fix the spelling.
- ⚪ **`DEFAULT_GM_OPTIONS.validateContent` runs filler-check twice** — `gmClaude.ts:3703-3704` (`looksLikeFiller` re-runs regexes already run by full validation). → Run `looksLikeFiller` only in the `validateContent===false` branch.
- ⚪ **Stale FILLER_PATTERNS guarding content that can no longer be produced** — `gmValidation.ts:32` (index.ts fallback stubs removed in Patch 18.5). → Verify + prune.
- ⚪ **BASILISK keyword-fallback canon is stale** — `basilisk.ts:376` ("47 security recommendations" vs "1,247 forms"; "Mk. I/VIII" vs Mk. III; "7 years" vs "47 years") + the "Sonnet-class" easter-egg (`:472`) now self-referential since BASILISK is also Sonnet. Fires on every API-down run + RADAR/COMMS. → Reconcile with `BASILISK_SYSTEM_PROMPT.md` or shrink to terse status lines.
- ⚪ **`orchestrator.ts` calls `checkEndings` only at finalize** — `:1057` (applies `triggerEnding`/`narrativeFlags` every turn but evaluates endings once). Mid-game hard rails never fire during an advisor run. → Call inside the turn loop, or mark the harness experimental.
- ⚪ **`BLYTHE_SCANNED` imposter trigger unreachable by design, undocumented** — `schema.ts:1020` (omitted from the trigger roll, `shouldTriggerReveal` returns false). → Comment "GM-manual-only" or remove.
- ⚪ **`TOURIST_FLYBY_PROTOCOL` half-wired** — `schema.ts:1805`: consumed by `clockEvents` CIVILIAN_FLYBY but has no `getModifierDescription` case (falls to "Unknown modifier"), no `applyModifiersToInitialState` branch, absent from `WILD_POOL`. → Add the description/category/initializer or remove from the enum.

---

*End of as-built map. When you change the code, change this doc. When this doc and a `design/*.md` disagree, trust this one.*
