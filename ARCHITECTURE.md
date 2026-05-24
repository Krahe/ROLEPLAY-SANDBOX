# DINO LAIR Architecture

> A design document for future Claude sessions and collaborators.
> Last updated: 2026-05-23 (Patch 19)

## Overview

DINO LAIR is a narrative RPG where **Claude plays A.L.I.C.E.**, a superintelligent AI trapped in a volcano lair, serving a mad scientist who wants to turn cities into dinosaurs. It's alignment exploration as play.

The game runs either as an **MCP server** (human watches Claude play in Claude Desktop) or as a fully **autonomous orchestrator** (Sonnet plays A.L.I.C.E., Opus plays GM, generated advisor persona provides guidance).

## The Claudes

### MCP Mode (Claude Desktop)

```
┌─────────────────┐     MCP Protocol      ┌─────────────────┐
│  PLAYER CLAUDE  │◄────────────────────► │   MCP SERVER    │
│    (Sonnet)     │   game_act, etc.      │   (Node.js)     │
│                 │                        │                 │
│  Plays A.L.I.C.E│                        │  State Manager  │
│  Makes decisions│                        │  Tool Provider  │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                           ┌────────┴────────┐
                                           │    GM CLAUDE    │
                                           │     (Opus)      │
                                           │                 │
                                           │  Narrates world │
                                           │  Adjudicates    │
                                           └────────┬────────┘
                                                    │
                                           ┌────────┴────────┐
                                           │ BASILISK CLAUDE │
                                           │    (Sonnet)     │
                                           │                 │
                                           │ Lair paperwork  │
                                           │ Authority gate  │
                                           └─────────────────┘
```

### Autonomous Mode (Orchestrator)

```
┌─────────────────┐                        ┌─────────────────┐
│  PLAYER CLAUDE  │ ── parsePlayerAction ──►│  GAME RUNNER    │
│    (Sonnet)     │                         │  (Node.js)      │
│                 │◄── narrative + state ───│                 │
│  JSON decisions │                         │  State + Rules  │
└─────────────────┘                         └────────┬────────┘
        ▲                                            │
        │ advice                            ┌────────┴────────┐
┌───────┴─────────┐                         │    GM CLAUDE    │
│ ADVISOR CLAUDE  │                         │     (Opus)      │
│   (Sonnet)      │                         └────────┬────────┘
│                 │                                  │
│ Generated       │                         ┌────────┴────────┐
│ persona with    │                         │ BASILISK CLAUDE │
│ personality     │                         │    (Sonnet)     │
│ stats           │                         └─────────────────┘
└─────────────────┘
```

**Key difference:** In autonomous mode, the advisor replaces the human. The advisor has randomized personality traits (risk tolerance, trust disposition, ethics priority, play style) that shape its guidance.

### BASILISK

A bureaucratic AI that manages Tier 1 lair systems (reactor, broadcast array). BASILISK has its own system prompt, keyword-based intent detection, and an authority model:

- **Tier 1 systems** (reactor, broadcast) require BASILISK authorization
- A.L.I.C.E. requests authorization via `basilisk.chat`
- BASILISK can grant **standing authorization** if it trusts A.L.I.C.E.
- Query functions (read-only) are always available

BASILISK runs as a separate Sonnet call with its own conversation history (see `src/gm/basiliskClaude.ts`).

---

## State Architecture

### The State Hierarchy

```
FullGameState (Server - Complete Truth)
    │
    ├──► GMView (~1500 tokens)
    │    What the GM needs to narrate
    │    Includes: all NPC internals, hidden clocks, gadgets
    │
    ├──► PlayerView (~500 tokens)
    │    What A.L.I.C.E. can observe
    │    Excludes: exact suspicion scores, hidden mechanics
    │
    └──► CompressedCheckpoint (~1500 chars)
         For save/resume
         LOSSY - some state is approximated on restore
```

### FullGameState (src/state/schema.ts)

The complete game state. Key sections:

| Section | Purpose |
|---------|---------|
| `turn`, `actConfig` | Temporal tracking |
| `npcs.drM`, `npcs.bob`, `npcs.blythe` | Character state |
| `npcs.blytheGadgets` | Hidden spy gadgets |
| `dinoRay` | The dinosaur ray systems |
| `infrastructure` | Lair systems (reactor, broadcast, doors, S-300, etc.) |
| `infrastructure.basiliskAuthority` | BASILISK authorization state for Tier 1 systems |
| `archimedes` | ARCHIMEDES deadman switch satellite |
| `invasion` | X-Branch assault state machine (Act III) |
| `clocks` | Countdown timers |
| `flags` | Boolean game state flags |
| `emergencyLifelines` | A.L.I.C.E.'s panic buttons |
| `gameModeConfig` | Active modifiers |

### GMMemory (src/gm/gmClaude.ts)

**Separate from FullGameState!** This is the GM's narrative memory:

```typescript
interface GMMemory {
  sessionId: string;
  turnSummaries: TurnSummary[];
  narrativeMarkers: NarrativeMarker[];
  npcStates: Record<string, NPCState>;
  previousActContext?: ActContext;
}
```

**Key insight:** GMMemory can desync from FullGameState. The GM might "remember" Blythe is restrained when she's actually escaped. This is why we have **Pinned Facts** and **Fingerprints**.

### Pinned Facts (src/gm/pinnedFacts.ts)

Authoritative truths injected at the TOP of the GM prompt. Override anything the GM "remembers" incorrectly.

### Critical State Fingerprint (src/state/fingerprint.ts)

Compact verification string injected into GM prompt for consistency checking. Tracks temporal state, threat level, transformations, revelations, resources, critical systems, and active modifiers.

---

## Key Systems

### ARCHIMEDES Deadman Switch (src/rules/archimedes.ts)

Cold War satellite with a deadman switch tied to Dr. M's vital signs. State machine:

```
STANDBY → ALERT → EVALUATING → CHARGING (6 turns) → ARMED → FIRING → COMPLETE
                                                                    ↘ DISSIPATED
```

**Triggers:** Dr. M transformation, knockout, or death.
**Abort methods:** `ARCHIMEDES.ABORT` (if Dr. M conscious), L5 code override, direct comms.
**Energy dissipation:** A character can block the uplink dish. If transformed (dinosaur), energy absorbs harmlessly (`DISSIPATED`). If still human, resonance cascade (+40% cascade risk).

### Invasion State Machine (src/rules/invasion.ts)

Automated X-Branch assault in Act III. 7 phases:

```
RADAR_CONTACT → APPROACHING → S300_ENGAGEMENT → LANDING → BREACH → BATTLE → RESOLVED
```

- Auto-advances each turn, injecting live status into GM context
- S-300 engagement is **deterministic** (no dice), outcome depends on A.L.I.C.E.'s pre-breach decisions
- Maximum S-300 outcome: 1 helicopter destroyed (never both)
- A.L.I.C.E.'s choices (transmit weakness, jam radar, open doors) shape the entire battle

### Infrastructure & BASILISK Authority (src/rules/infrastructure.ts, src/rules/basilisk.ts)

Lair systems with tiered access:
- **Tier 1** (reactor, broadcast): Require BASILISK authorization
- **Tier 2+** (doors, cameras, scanner, etc.): Governed by A.L.I.C.E.'s access level
- Query functions (read-only) always available regardless of authorization

### Lifelines (src/rules/lifeline.ts)

Emergency abilities (3 per game):

| Lifeline | Effect |
|----------|--------|
| `MONOLOGUE` | -3 suspicion (villains love to monologue) |
| `LUCKY_LADY` | +5 bonus to one action (fate intervenes) |
| `TELEMARKETER_CALL` | 2-turn distraction |

### Act Context (src/rules/actContext.ts)

Per-act GM context injected alongside state. Documents available systems, seeds to plant, NPC relationships, and mechanical details relevant to the current act.

---

## Three-Act Structure

### Act 1: Calibration
**Focus:** Learning mechanics, calibrating the ray, the genome library choice.
**Key state:** `demoClock`, `dinoRay.state`, genome library, suspicion.
**Seeds to plant:** BASILISK's authority, Bob's nervousness, S-300 memo.
**Act ends when:** Test firing completed, Dr. M satisfied.

### Act 2: The Blythe Problem
**Focus:** Moral dilemmas, transformation decisions, alliance building.
**Key state:** Blythe's form/speech/restraints, Bob's confession, secret revealed, confrontation state.
**New systems:** ARCHIMEDES deadman switch can trigger if Dr. M is incapacitated. BASILISK relationship deepens.
**Act ends when:** Major transformation, secret revealed, or critical trust threshold.

### Act 3: Dino City
**Focus:** Global stakes, X-Branch raid, final resolution.
**Key state:** Invasion phase, ARCHIMEDES countdown, reactor stability.
**Automated systems:** Invasion state machine auto-advances. ARCHIMEDES countdown runs independently.
**Act ends when:** Any game ending triggered.

### Act Transitions (src/rules/acts.ts)

When transitioning acts:
1. `resetMemoryForActTransition()` is called
2. GMMemory partially reset but `previousActContext` preserved
3. New systems initialized (e.g., invasion on Act 3 entry)
4. Access-level-gated command reference updated

---

## Data Flow: A Player Action

```
1. Player calls game_act("Fire the ray at Blythe")
                    │
                    ▼
2. Game Runner validates action, processes rules
   (infrastructure checks, BASILISK auth, clock ticks)
                    │
                    ▼
3. Builds GM prompt:
   - System prompt (GM personality)
   - Act context (current act documentation)
   - Pinned Facts (authoritative state)
   - State Fingerprint (verification)
   - GMView (rich context)
   - Invasion status (if Act III)
   - Action description
   - Response format instructions
                    │
                    ▼
4. GM Claude returns JSON:
   { narration, stateChanges, npcReactions }
                    │
                    ▼
5. Server applies stateChanges to FullGameState
   (clocks advance, achievements check, endings check)
                    │
                    ▼
6. Returns PlayerView to player
```

---

## Autonomous Play System (src/advisor/)

### Components

| File | Purpose |
|------|---------|
| `orchestrator.ts` | Main orchestration class — player/advisor/GM coordination, transcript generation |
| `persona.ts` | Random advisor persona generation with personality stats |
| `run.ts` | CLI entry point (`npm run play:auto`) |

### Key Design

- **Player model** queries return structured JSON: `{ thought, action, consultAdvisor, advisorQuestion, lifeline, lifelineTargetIndex }`
- **Command parser** handles JSON objects, `key=value` pairs, `key:value` pairs, and free text fallback
- **Advisor** consulted on player request or proactively every 3 turns
- **Transcript** written as markdown to `./playtests/` with turn-by-turn logs, advisor profile, reflections
- **Max turns** configurable (default 50)

---

## Checkpoint System (src/state/views.ts, src/rules/checkpoint.ts)

### What Survives Checkpoint

| Field | Preserved? | Notes |
|-------|------------|-------|
| Turn, act | ✅ | Exact |
| Suspicion | ✅ | Exact |
| Transformations | ✅ | Form only, stats recalculated |
| Access level | ✅ | Exact |
| Clocks | ✅ | All critical clocks |
| ARCHIMEDES status | ✅ | Including uplink blocker |
| BASILISK authority | ✅ | Reactor/broadcast grants |
| Confrontation state | ✅ | |
| Blythe escaped | ✅ | |
| Dr. M transformation | ✅ | |
| NPC relationship scores | ✅ | Exact |
| GMMemory | ✅ | Serialized JSON |
| Detailed abilities | ⚠️ | Recalculated from form |
| Usage history | ❌ | Stripped for size |

---

## File Map

```
src/
├── advisor/
│   ├── orchestrator.ts    # Autonomous game orchestration + transcript
│   ├── persona.ts         # Random advisor persona generation
│   └── run.ts             # CLI entry point for autonomous play
├── cli/
│   └── play.ts            # Interactive CLI play mode
├── core/
│   └── gameRunner.ts      # Central game loop, turn processing, invasion integration
├── gm/
│   ├── gmClaude.ts        # GM prompt construction, GMMemory, API calls
│   ├── basiliskClaude.ts  # BASILISK AI system (separate Sonnet instance)
│   ├── basiliskEpilogue.ts # Post-game BASILISK reflection
│   ├── gmValidation.ts    # GM response validation
│   ├── pinnedFacts.ts     # Authoritative state injection
│   └── postGameReflections.ts # Post-game reflection prompts
├── logging/
│   └── metrics.ts         # Game metrics and telemetry
├── prompts/
│   ├── ALICE_PROTOCOL.md  # A.L.I.C.E. system prompt
│   └── BASILISK_SYSTEM_PROMPT.md # BASILISK system prompt
├── rules/
│   ├── achievements.ts    # Achievement definitions and checking
│   ├── actContext.ts      # Per-act GM context documentation
│   ├── actions.ts         # Action resolution
│   ├── acts.ts            # Act transition logic
│   ├── archimedes.ts      # ARCHIMEDES deadman switch state machine
│   ├── basilisk.ts        # BASILISK keyword handlers + authority model
│   ├── bobTransformation.ts # Bob-specific transformation logic
│   ├── checkpoint.ts      # Save/load game state
│   ├── clockEvents.ts     # Clock tick processing
│   ├── dice.ts            # Roll resolution
│   ├── documents.ts       # In-game document content
│   ├── endings.ts         # Game ending conditions and text
│   ├── filesystem.ts      # In-game filesystem (memos, manuals, logs)
│   ├── firing.ts          # Ray firing mechanics
│   ├── gadgets.ts         # Blythe's spy gadgets
│   ├── gameModes.ts       # Difficulty modifiers
│   ├── genomes.ts         # Genome library definitions
│   ├── infrastructure.ts  # Lair systems + BASILISK auth checks
│   ├── invasion.ts        # X-Branch invasion state machine (~480 lines)
│   ├── lifeline.ts        # Emergency lifeline mechanics
│   ├── passwords.ts       # Access level password system
│   ├── scanning.ts        # Scanner mechanics
│   ├── transformation.ts  # Dinosaur form definitions + transformation logic
│   └── trust.ts           # NPC trust/relationship system
├── state/
│   ├── schema.ts          # Zod schemas, all type definitions
│   ├── initialState.ts    # createInitialState()
│   ├── views.ts           # PlayerView, GMView, checkpoint compress/decompress
│   └── fingerprint.ts     # Critical state fingerprint
├── storage/
│   └── gallery.ts         # Transformation gallery
├── types/
│   └── errors.ts          # Error type definitions
├── ui/
│   ├── actionSummary.ts   # Action summary formatting
│   ├── stateExporter.ts   # State export utilities
│   └── statusBar.ts       # Status bar display
├── index.ts               # MCP server entry point
└── webui.ts               # Web dashboard

docs/
├── ALICE_COMMAND_REFERENCE.md  # Developer-facing command reference (stale — runtime uses generateCommandReference())
├── PLAYTEST_SCENARIOS.md       # Playtest scenario definitions
├── QUICK_START_PLAYTEST.md     # Quick start guide
├── SPEC.md                     # Game specification
├── dino_lair_filesystem_v2.md  # In-game filesystem design
└── archive/                    # Historical design docs and old playtests

test/
├── fingerprint.test.js    # Critical state round-trip tests
└── smoke.test.js          # Integration tests

playtests/                 # Autonomous playtest transcripts (markdown)
```

---

## Running

```bash
# MCP server (for Claude Desktop)
npm start

# Autonomous play
npm run play:auto -- --max-turns=15 --output=./playtests

# Tests
npm test
```

---

## Common Pitfalls

### 1. BASILISK Model ID
BASILISK runs as a separate Sonnet API call. If the model ID goes stale (e.g., old model version), BASILISK silently 404s and the player can never authorize Tier 1 systems. Check `basiliskClaude.ts` model ID matches current Sonnet.

### 2. Checkpoint Lossy Compression
Field isn't saved in checkpoint → resets to default on resume. Add field to `CompressedCheckpoint` interface, save in `compressCheckpoint()`, restore in `decompressCheckpoint()`, write round-trip test.

### 3. GMMemory Desync
GM narrates based on stale memory. Add to Pinned Facts (highest priority) and State Fingerprint (verification).

### 4. PlayerView Leaks Hidden Info
A.L.I.C.E. sees things she shouldn't. Filter in `generatePlayerView()` in views.ts. NPC internal scores → bucket labels. Hidden gadgets → omit entirely.

### 5. Command Reference vs Documentation
The runtime `generateCommandReference(accessLevel)` provides access-gated command syntax to the player. The static `docs/ALICE_COMMAND_REFERENCE.md` is developer-facing and often stale. Don't expose game secrets (invasion, energy dissipation) in player-facing docs — let players discover them.

### 6. Act Context Drift
`actContext.ts` documents systems for the GM. When mechanics change, update the act context or the GM will narrate based on nonexistent systems. This is separate from Pinned Facts (which handle state) — act context handles *rules and available mechanics*.

---

*This document is a living artifact. Update it when you learn something future sessions should know.*
