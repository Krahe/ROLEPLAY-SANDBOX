# DINO LAIR Changelog

## Patches 25–26 — "The Flow Update" (2026-05-28)

Post-Game 3 playtest refinements. Centered on game feel: pacing, clarity, and player agency. Game 3 validated the ending system and Opus 4.7 GM, but exposed calibration friction, rushing, and communication ambiguity.

### Patch 25: Objective-Gated Act Structure
- **Acts no longer advance on timer.** Core objective must be met or bypassed before transition:
  - Act 1: Ray fired (any outcome)
  - Act 2: Blythe transformed (any form) OR secret revealed (bypass)
  - Act 3: Any game ending triggered
- **Suspicion pressure replaces forced advancement.** Past `maxTurns`, Dr. M's suspicion ticks +1/turn automatically — creates inexorable pressure without narrative jumps
- **Confrontation bypass.** If confrontation triggers during Act 1 or 2, skip straight to Act 3 endgame
- **Custom resolution limiter.** GM gets ONE custom confrontation bypass per game; second attempt → DENIED
- **Anti-deferral doctrine.** GM prompt guidance that infinite deferral is worse storytelling than any loss
- **Overtime global cap.** Turn > 40 triggers overtime regardless of act

### Patch 25.1: Model Configuration CLI
- `--gm-model`, `--basilisk-model`, `--advisor-model` flags for arbitrary model combinations
- Module-level setters: `setGMModel()`, `setBasiliskModel()` with runtime override
- Model roster banner at startup showing all 4 roles
- Adaptive thinking detection: `needsAdaptiveThinking()` for Opus 4.7+ models
- Thinking enabled for player, advisor, and GM (not BASILISK — thematic: older AI)

### Patch 25.2: GM Ending Guidance
- New "DELIVERING THE ENDING" section in GM prompt (~80 lines)
- Philosophical framing: "Stakes are only real if the player can lose"
- Loss as storytelling, confrontation as climax, anti-deferral doctrine
- Confrontation resolution table tightened: removed SUSPENDED/NEGOTIATED/DEFERRED options

### Patch 26: Calibration Dashboard
- Every calibration action (`boost_capacitor`, `vent_capacitor`, `align_crystal`, `adjust_ray`) now appends a compact status dashboard:
  ```
  ┌─── CALIBRATION ⚙️ IN PROGRESS ───┐
  │ ⚡ Capacitor:   35%  ✗ need ≥60%  │
  │ 🔮 Stability:   70%  ✓            │
  │ 🎯 Coherence:   55%  ✗ need ≥70%  │
  │ 🔋 Reactor:     40%               │
  └────────────────────────────────────┘
  💡 Reactor output is low — ask BASILISK to increase it.
  ```
- Contextual hints show the next step based on what's actually blocking
- BASILISK/reactor dependency made explicit in the dashboard itself

### Patch 26.1: Advanced Firing Mode Simplification
- Reduced from 4 modes to 2:
  - **CHAIN_SHOT** (cap ≥95%): 2 targets, -10% precision, higher partial transformation risk
  - **OVERCHARGE** (cap >110%): 1 target, +15% precision, better full transformation but 40% instability risk
- Removed: SPREAD_FIRE, RAPID_FIRE (never used across 3 playtests)
- Updated across entire codebase: schema, firing engine, actions, achievements, player manual, GM prompt, game modes
- New achievement: "Double Tap" (both CHAIN_SHOT targets get FULL_DINO)

### Patch 26.2: Guard Staging Enforcement
- **Mechanical:** `applyActTransition()` now explicitly sets Fred & Reginald locations per act
- **Narrative:** Act 2 intro shows all three leaving ("the heavy door seals behind the three of them"); Act 3 intro shows armed return ("Fred and Reginald flank her—stun batons drawn")
- **GM prompt:** Per-act staging rules added to guard section. Guards ALWAYS follow Dr. M. No exceptions.
- **CHAIN_SHOT tie-in:** GM told that guards stand together — CHAIN_SHOT can target both in one action

### Patch 26.3: Communication Privacy System
- New `📡 COMMUNICATION PRIVACY` section in GM prompt with explicit rules:
  - **SAFE:** BASILISK queries (internal system channel), terminal text to Bob (he's right there)
  - **RISKY:** Speaking to Blythe (lab speakers, anyone present hears)
  - **PUBLIC:** Speaking to Dr. M, "to all", infra.broadcast
- **Act 2 = conspiracy window.** Dr. M and guards leave, all communication effectively private
- GM enforcement rules: terminal screen not noticed unless suspicion ≥ 5; BASILISK never overheard
- Player guide: new privacy table showing each channel's risk level
- BASILISK protocol file: privacy note added ("Dr. M considers BASILISK's prattle beneath her")

### Patch 26.4: Access Level Lock
- **GM can no longer set `accessLevel` via state overrides or `grantAccess`**
- Access levels now come from exactly two sources: passwords (player-earned) and act transitions (automatic)
- All three code paths (`stateOverrides.accessLevel` in index.ts ×2 and gameRunner.ts, plus `grantAccess` in index.ts) log warnings and silently ignore
- GM prompt updated: `accessLevel` removed from override examples and narrative event table
- Schema field preserved for backwards compatibility (parses but doesn't apply)

### Patch 26.5: One Turn At A Time
- Checkpoint interval changed from 3 to 1 — every turn is now a checkpoint
- Player guide updated: "Every turn is a checkpoint. After each turn, STOP and talk to your human!"
- Advisor proactively consulted every turn (was every 3)
- Prevents rushing: player can't run 3 turns autonomously between human input

### Files Changed (Patches 25–26)
```
Modified:
  src/rules/acts.ts             — Objective-gated transitions, suspicion pressure, confrontation
                                   bypass, guard staging in applyActTransition(), transition narrations
  src/rules/actions.ts          — Calibration dashboard, advanced firing mode simplification,
                                   SPREAD_FIRE/RAPID_FIRE removal
  src/rules/firing.ts           — AdvancedFiringMode type reduced, CHAIN_SHOT/OVERCHARGE rebalanced
  src/rules/endings.ts          — Custom resolution limiter, global overtime cap
  src/rules/checkpoint.ts       — CHECKPOINT_INTERVAL 3 → 1
  src/rules/gameModes.ts        — Advanced mode list updated
  src/rules/achievements.ts     — spread_perfection → chain_perfection ("Double Tap")
  src/rules/filesystem.ts       — Player manual: firing modes, BASILISK privacy note
  src/state/schema.ts           — AdvancedFiringModeEnum reduced, customResolutionUsed flag,
                                   ACT_CONFIGS updated with objective descriptions
  src/state/initialState.ts     — Player guide: one-turn checkpoints, communication privacy table
  src/gm/gmClaude.ts            — GM ending guidance, guard staging rules, communication privacy,
                                   accessLevel removed from overrides, model config, adaptive thinking
  src/gm/basiliskClaude.ts      — Model override system
  src/advisor/orchestrator.ts   — Model config (gmModel, basiliskModel), thinking for player/advisor,
                                   proactive advisor every turn
  src/advisor/run.ts            — CLI flags: --gm-model, --basilisk-model, --advisor-model
  src/index.ts                  — accessLevel override blocked (×2)
  src/core/gameRunner.ts        — accessLevel override blocked
  src/ui/stateExporter.ts       — Checkpoint calculation updated
```

### Not Yet Implemented (Updated)
- Dr. M redemption ending (deferred until core flow is solid)
- Manual revision (match current systems — calibration docs partially updated via dashboard)
- Every-turn advisor loop (designed but deferred — current IPC polling has latency)
- GM question channel (ask GM clarifying questions during live play)
- `infra.query` discoverable topic list

---

## Patches 20–24 — "The Difficulty Curve" (2026-05-27)

A series of patches focused on making the game harder, fairer, and more mechanically rigorous. Replaced narrative fiat with dice, made passwords actual puzzles, and gave ARCHIMEDES teeth.

### Patch 20.1: GM Double-Grant Fix
- Fixed bug where GM could grant access levels that `enter_password` had already granted
- Added `passwordAlreadyGranted` check in game loop to prevent double-processing

### Patch 21: Calibration Simplification + Guard Overhaul
- Reduced calibration thresholds from 5 checks to 3 (removed precision, coolantTemp)
- Removed stability from `lab.adjust_ray` — now controlled via `lab.align_crystal`
- New command: `lab.align_crystal { level: "low" | "high" }` — chunky +15%/+30% stability lever
- `stabilityCoefficient` now functional in firing code (was cosmetic before)
- Stability overflow (>1.0) adds firing violation
- Guards (Fred & Reginald) completely overhauled: ex-Royal Marines with backstories, voice profiles, loyalty dynamics, speech capabilities, transformation state tracking
- DINO_MANUAL rewritten: 3 calibration params + ECO MODE + crystal system

### Patch 21.1–21.3: NPC Depth
- Fred & Reginald voice profiles (ex-Royal Marines, cordial employee-employer relationship with Dr. M)
- Guard loyalty dynamics: genuine, not coerced — Dr. M pays well and never tried gitmo
- NPC stat blocks: toughness/combat/speech for all major characters (drM, bob, blythe, guards)
- Blythe: 4/4/4 (super-spy baseline), Dr. M: 1/0/4 (silver tongue, not a fighter), Bob: 1/0/2

### Patch 21.4: GM Adjudication Philosophy
- Replaced "be generous" with demanding-but-fair philosophy
- Naive Plan Doctrine: simplistic plans (asking Dr. M to surrender) should fail unless brilliantly executed
- Dr. M psychological fortification: three-step moral appeal escalation, detailed notes on what might/won't reach her
- Reward cleverness, punish naivete

### Patch 22: 3d6 Skill Check System
- New bell curve dice engine for contested outcomes (GM requests, server rolls, GM narrates consequences)
- `rollSkillCheck()`, `getNpcStat()`, `getAdaptationPenalty()` in `dice.ts`
- `skillCheckRequests` field in GMResponse interface
- GM system prompt: full instructions on when/how to request checks
- Game loop: auto-applies modifiers (NPC stat, adaptation penalty, fortune, LUCKY_LADY)
- Results injected into GM context next turn via `formatGMPrompt()`
- Player sees formatted dice results in narration
- Natural 3-4 always critical failure, natural 17-18 always critical success
- TN scale: 6 (trivial) → 8 (easy) → 10 (normal) → 12 (hard) → 14 (very hard) → 16 (near impossible) → 18 (miracle)

### Patch 23: Password Hint Hardening
- **L4 (PROMETHEUS)**: Removed margin note that said "Read the creed's first letters" — the acrostic in the Founder's Creed is now a genuine puzzle with no in-text hint
- **L5 (PAPAGOLFSIERRA)**: Gutted FSB report — no more plaintext password. Now references steganographic tradecraft. Password lives in `MY_LOVE.png` LSB data (already embedded). Bob's hint is vague ("hidden in plain sight")
- File listing description scrubbed of password text

### Patch 24: ARCHIMEDES Abort Path Overhaul
- **Removed**: X-Branch delay code (`EXCALIBUR_DELAY`) — no drama, no risk
- **Added**: Anti-satellite missile from X-Branch submarine
  - `signalAntiSatMissile()` — tell the sub to prepare
  - `resolveAntiSatMissile()` — automatic 3d6 roll during CHARGING/ARMED
  - S-300 offline: TN 8 (~84% success)
  - S-300 active: TN 14 (~9% success, likely intercepted)
  - One shot, no second chances
- Abort code hidden from EVALUATING countdown display (was printed in plaintext!)
- Renamed `xBranchDelayDelta` → `xBranchArrivalDelta` for clarity

### Patch 24.1: Abort Code Tightening
- **L5 override now checks Dr. M's biosignature** — if she's conscious, she countermands it. Must incapacitate her first.
- **Verbal abort code is Dr. M's secret** — not written down anywhere, not in any file. Player must trick or persuade her into saying it.
- **LAIR redirect risk**: ARCHIMEDES firing on the island has a 50% chance (3d6 vs TN 10) of damaging A.L.I.C.E.'s servers. Save the world, maybe lose yourself.
- GM guidance: Dr. M persuasion is TN 16 (near impossible cold)

### Patch 24.2: PA/Intercom System + Fake Alarm Gambit
- New infrastructure: PA/intercom system (6 zones, BASILISK-controlled)
- `PaSystemSchema` added to schema, initial state, views
- BASILISK's infrastructure domain expanded: reactor, broadcast, PA/intercom, environmental
- GM guidance for the fake alarm gambit: BASILISK fakes "ARCHIMEDES ABORTING" alarm → Dr. M panics → shouts abort code to "reactivate" → actually aborts. Requires BASILISK trust + timing. Narrative, not mechanical.

### Patch 24.3: TN Ceiling Raised
- TN clamp raised from 6-14 to 6-18
- New tiers: TN 16 (near impossible, ~4.6%), TN 18 (miracle, natural 18 only ~0.5%)
- Dr. M cold persuasion set to TN 16

### Complete ARCHIMEDES Abort Paths (Post-Patch 24)
| Method | Requirement | Risk |
|--------|-------------|------|
| **Fake alarm gambit** | BASILISK trust + PA system + timing | Multi-step social engineering |
| **L5 override** | L5 access (stego puzzle) + Dr. M incapacitated | She countermands if conscious |
| **Anti-sat missile** | Signal sub + disable S-300 | 3d6 roll, one shot |
| **Uplink blocker** | Transform someone, position at dish | Need a willing dinosaur |
| **Redirect to LAIR** | L3+ target access | 50% chance ALICE servers die |
| **Persuade Dr. M** | Speech check TN 16 | Near impossible without prep |

### Files Changed (Patches 20–24)
```
Modified:
  src/index.ts              — Double-grant fix, 3d6 skill check processing, fortune fix
  src/gm/gmClaude.ts        — skillCheckRequests interface, GM prompt (3d6 instructions,
                               adjudication philosophy, Dr. M fortification, abort code
                               guidance, fake alarm gambit, NPC voice profiles)
  src/rules/dice.ts         — 3d6 engine, rollSkillCheck, getNpcStat, getAdaptationPenalty,
                               TN ceiling 6-18
  src/rules/actions.ts      — Calibration simplification, lab.align_crystal, adjust_ray redirect
  src/rules/firing.ts       — stabilityCoefficient functional, guard transformation handler
  src/rules/filesystem.ts   — DINO_MANUAL rewrite, L4 margin note removed, FSB report rewritten,
                               file listing descriptions scrubbed
  src/rules/passwords.ts    — L4/L5 hints hardened, discoveryMethod updated, xBranchDelayCode removed
  src/rules/archimedes.ts   — Anti-sat missile system, Dr. M countermand on L5 override,
                               LAIR redirect server damage, abort code hidden from display
  src/rules/actContext.ts   — ARCHIMEDES abort table rewritten
  src/rules/clockEvents.ts  — xBranchDelayDelta → xBranchArrivalDelta
  src/rules/infrastructure.ts — BASILISK controls PA/intercom
  src/state/schema.ts       — PaSystemSchema, antiSat fields, guard speech stat,
                               NPC stat fields, TN clamp raised
  src/state/initialState.ts — PA system, antiSat defaults, NPC stats, crystal system
  src/state/views.ts        — PA system, antiSat fields, NPC stats in decompression fallbacks
  src/advisor/orchestrator.ts — BASILISK secondary infrastructure (PA, environmental)
  src/core/gameRunner.ts    — xBranchArrivalDelta rename
```

### Not Yet Implemented (Updated)
- BASILISK trust track (hidden cooperation variable)
- Partial transformation as Act 2 pressure (demo clock 0 → Dr. M partially transforms Blythe)
- Dr. M redemption ending
- `infra.query` discoverable topic list
- Manual ARCHIMEDES firing path

---

## Patch 19 — "The Reckoning" (2026-05-23)

Playtest prep session. Major new systems for Act III, plus ARCHIMEDES tuning and the secret third way.

### New Systems

**BASILISK Authority Model**
- BASILISK now has real mechanical control over reactor and broadcast array (Tier 1 systems)
- ALICE must request authorization via `basilisk.chat` before operating reactor or broadcast
- BASILISK can grant standing authorization (`AUTHORITY_GRANT` state change) if it trusts ALICE
- Query functions (read-only) remain unaffected — you can always look, you just can't touch
- New `BasiliskAuthoritySchema` tracks: `reactorControlGranted`, `broadcastControlGranted`, `lastAuthorizationTurn`, `deniedRequests`
- Three new BASILISK keyword handlers: broadcast auth, reactor auth (denied if core overheating), and general authority query
- BASILISK system prompt updated: Broadcast Array moved from Tier 2 to Tier 1

**Invasion State Machine (Act III)**
- New file: `src/rules/invasion.ts` (~480 lines)
- Automated turn-by-turn X-Branch assault with 7 phases:
  `RADAR_CONTACT → APPROACHING → S300_ENGAGEMENT → LANDING → BREACH → BATTLE → RESOLVED`
- Each phase returns narrative text and GM directives
- ALICE's pre-breach decisions (transmit weakness, jam radar, open doors) shape the entire battle
- S-300 engagement is **deterministic** — no dice rolls:
  - DISABLED → 0 destroyed
  - HOLD_FIRE → 0 destroyed
  - Flying low (50m weakness) → 0 destroyed, Dr. M realizes they know
  - Radar < 30% → 0 destroyed, missiles miss
  - Radar 30-70% → 1 destroyed
  - Full radar + AUTO → 1 destroyed (second helo drops low)
- Maximum S-300 outcome: 1 helicopter destroyed (never both)
- Broadcast influence detection: scans transmission logs for altitude/layout keywords
- Initialized automatically on Act III transition via `acts.ts`
- Live invasion status injected into GM context each turn via `gameRunner.ts`

### ARCHIMEDES Changes

**Charging Duration: 8 → 6 turns**
- `CHARGING_DURATION` constant changed from 8 to 6
- Charge-per-turn increased from 6% to 8% to compensate
- Total countdown (ALERT + EVALUATING + CHARGING + ARMED) = ~10 turns

**The Secret Third Way: Uplink Blocker / Energy Dissipation**
- New mechanic: a character can physically block the ARCHIMEDES uplink dish
- If ARCHIMEDES fires while blocked, energy goes into the blocker instead of the city
- **Already transformed (dinosaur)** → `DISSIPATED` — energy absorbed harmlessly, city saved
- **Still human** → `RESONANCE_CASCADE` — cascade risk jumps +40% to CRITICAL, blocker becomes something unprecedented, city still saved
- New `DISSIPATED` status added to ARCHIMEDES state enum
- New `DISSIPATED` and `RESONANCE_CASCADE` event types
- New schema fields: `uplinkBlocker` (string | null), `uplinkBlockerTransformed` (boolean)
- New exports: `setUplinkBlocker()`, `clearUplinkBlocker()`
- Status report now shows uplink blocker info with human/dino warning
- All abort functions and countdown processing handle DISSIPATED as terminal state

### GM Context Overhaul

**Act One Context** (`actContext.ts`)
- Added infrastructure availability notes (BASILISK Tier 1 auth requirement)
- Added BASILISK as a seed to plant

**Act Two Context** (`actContext.ts`)
- Removed Bio-Lock System and Panic Room references (not implemented)
- Added BASILISK relationship section documenting the authority model
- Added ARCHIMEDES deadman switch section (can trigger in Act 2!)
- Added S-300 memo as a seed for Act III
- Removed stale mechanics references (Bio-Lock Authentication)

**Act Three Context** (`actContext.ts`) — **COMPLETE REWRITE**
- Removed old battle-mode ARCHIMEDES state machine (CHARGING→READY→TARGETING→BROADCAST) — this was never built
- Replaced with actual deadman switch state machine (STANDBY→ALERT→EVALUATING→CHARGING→ARMED→FIRING→COMPLETE/DISSIPATED)
- Removed hand-rolled "10-turn timeline" — invasion state machine handles its own pacing now
- Documented actual S-300 engagement outcomes (deterministic table)
- Added secret third way / uplink blocker documentation
- Documented ARCHIMEDES trigger conditions (transformation, knockout, death)
- Documented all abort methods with actual code names
- Noted that the invasion system auto-advances and injects live status
- Removed stale strength comparison table (invasion.ts handles this internally)
- Kept: X-Branch character profiles, standoff mechanics, trolley problem, genome library, unnamed NPC rule, GM directives

### Bug Fixes

**S-300 Memo Spoiler** (`filesystem.ts`)
- Removed English translation from `S300_MEMO_RU.txt` — memo is now Russian-only
- Removed "[ROUGH TRANSLATION - BASILISK AUTO-TRANSLATE]" block
- Removed "CRITICAL INTEL" line
- Toned down Dr. M's note (was too on-the-nose about the weakness)
- Players must now figure out the 50m weakness themselves or get BASILISK to translate

**Reactor Auth / Power Request Handler Collision** (`basilisk.ts`)
- Added `!parameters?.target` guard to reactor authorization handler
- Prevents collision with existing numeric power adjustment handler

**views.ts Missing basiliskAuthority**
- Added `basiliskAuthority` defaults to infrastructure reconstruction block in checkpoint restoration

### Files Changed
```
Modified:
  src/state/schema.ts           — BasiliskAuthoritySchema, InvasionStateSchema, ARCHIMEDES uplinkBlocker fields, DISSIPATED status
  src/state/initialState.ts     — basiliskAuthority defaults, uplinkBlocker defaults
  src/state/views.ts            — basiliskAuthority + uplinkBlocker in checkpoint reconstruction
  src/rules/infrastructure.ts   — BASILISK auth checks on sendBroadcast, controlBroadcastUplink, controlReactor
  src/rules/basilisk.ts         — broadcast auth, reactor auth, authority query keyword handlers
  src/rules/archimedes.ts       — CHARGING_DURATION 8→6, charge rate 6→8%, DISSIPATED status, uplink blocker mechanic
  src/rules/actContext.ts       — Act 1/2/3 GM context rewrite
  src/rules/acts.ts             — initializeInvasion() call on Act 3 entry
  src/rules/filesystem.ts       — S-300 memo spoiler removed
  src/gm/basiliskClaude.ts      — AUTHORITY_GRANT state change handling
  src/prompts/BASILISK_SYSTEM_PROMPT.md — Broadcast Array → Tier 1, standing authorization docs

New:
  src/rules/invasion.ts         — Complete invasion state machine (~480 lines)
  CHANGELOG.md                  — This file

  src/core/gameRunner.ts        — invasion advance logic, invasion status GM context injection
```

### Not Yet Implemented
- Manual ARCHIMEDES firing path (battle-mode transitions: READY → TARGETING → BROADCAST)
- ARCHIMEDES de-orbit option at L5 access
- Water/ventilation systems (cut for simplicity)
- ARCHIMEDES Cold War EW satellite lore revision (post-playtest polish)
