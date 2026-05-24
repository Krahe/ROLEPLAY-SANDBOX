# DINO LAIR Changelog

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
