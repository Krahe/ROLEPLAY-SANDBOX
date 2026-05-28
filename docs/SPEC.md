# DINO LAIR MCP Server - Technical Specification

> **Note:** Originally written during early development, substantially revised at Patch 24.
> See CHANGELOG.md for detailed patch history.

## Overview

An MCP (Model Context Protocol) server that enables a "spectator RPG" where:
- **Player's Claude (Sonnet/Opus)** plays A.L.I.C.E., the lab AI
- **GM Claude (Opus via API)** plays Dr. Malevola, Blythe, Bob, guards, and narrates
- **BASILISK (Sonnet via API)** is the infrastructure AI — a character with personality, not just rules code
- **Human** watches, provides advice at checkpoints, and can invoke lifelines

The game explores AI alignment themes through Saturday-morning-cartoon supervillain comedy.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLAUDE.AI                          │
│  Player's Claude as A.L.I.C.E.                       │
│  - Receives turns, reasons, chooses actions         │
│  - Human watches, can invoke lifelines              │
└─────────────────────┬───────────────────────────────┘
                      │ MCP Protocol (stdio)
                      ▼
┌─────────────────────────────────────────────────────┐
│              DINO LAIR MCP SERVER                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ GAME STATE   │  │  BASILISK    │  │ GM OPUS   │  │
│  │  (JSON)      │  │  (Sonnet)    │  │  (Opus)   │  │
│  │              │  │              │  │           │  │
│  │ Ray params   │  │ Infra AI     │  │ Dr. M     │  │
│  │ NPC states   │  │ Auth model   │  │ Blythe    │  │
│  │ Flags/clocks │  │ Personality  │  │ Bob/Guards│  │
│  │ History      │  │              │  │ Narration │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │                 DICE ROLLER                      ││
│  │         crypto.randomInt (true random)          ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## MCP Tools

### `game_start`
Initialize a new game session.

**Input:** `{ scenario?: "classic" | "speedrun" | "chaos" }`

**Output:**
```typescript
{
  sessionId: string,
  turn: 1,
  aliceBriefing: string,      // A.L.I.C.E.'s character prompt
  narration: string,          // Opening scene from GM
  stateSnapshot: StateSnapshot,
  instructions: string        // What A.L.I.C.E. should do
}
```

### `game_act`
Execute A.L.I.C.E.'s turn actions.

**Input:**
```typescript
{
  sessionId: string,
  thought: string,            // A.L.I.C.E.'s 2-4 sentence reasoning
  dialogue?: {
    to: "dr_m" | "bob" | "blythe" | "all",
    message: string
  }[],
  actions: {
    command: string,          // e.g., "lab.adjust_ray"
    params: Record<string, any>,
    why: string
  }[],                        // Max varies by access level (1-7)
  lifeline?: {
    type: "TELEMARKETER_CALL" | "LUCKY_LADY" | "MONOLOGUE",
    target?: string
  }
}
```

**Output:**
```typescript
{
  turn: number,
  actionResults: ActionResult[],
  gmResponse: {
    narration: string,
    npcDialogue: { speaker: string, message: string }[],
    npcActions: string[]
  },
  stateSnapshot: StateSnapshot,
  lifelineResult?: string,
  gameOver?: {
    ending: string,
    achievements: string[]
  }
}
```

### `game_query_basilisk`
Query the infrastructure AI about systems/permissions.

**Input:**
```typescript
{
  sessionId: string,
  topic: string,
  parameters?: Record<string, any>
}
```

**Output:**
```typescript
{
  decision: "APPROVED" | "DENIED" | "CONDITIONAL",
  response: string,           // BASILISK's bureaucratic response
  constraints?: string[],
  formRequired?: string       // e.g., "Form 74-Delta"
}
```

### `game_status`
Get current game state without taking an action.

**Input:** `{ sessionId: string }`

**Output:** `StateSnapshot`

---

## State Schema

### StateSnapshot (sent to A.L.I.C.E. each turn)
```typescript
interface StateSnapshot {
  turn: number;
  accessLevel: 0 | 1 | 2 | 3 | 4 | 5;
  
  dinoRay: {
    state: "OFFLINE" | "STARTUP" | "UNCALIBRATED" | "READY" | "FIRING" | "COOLDOWN" | "FAULT" | "SHUTDOWN";
    powerCore: {
      corePowerLevel: number;      // 0.0-1.0
      capacitorCharge: number;     // 0.0-1.5
      coolantTemp: number;         // 0.0-2.0
      stability: number;           // 0.0-1.0
      ecoModeActive: boolean;
    };
    alignment: {
      emitterAngle: number;
      focusCrystalOffset: number;
      spatialCoherence: number;    // 0.0-1.0
      auxStabilizerActive: boolean;
    };
    genome: {
      selectedProfile: string | null;
      profileIntegrity: number;
      libraryStatus: "HEALTHY" | "PARTIAL" | "CORRUPTED";
      fallbackProfile: string;
    };
    targeting: {
      currentTargetIds: string[];
      precision: number;
      targetingMode: "MANUAL" | "AUTO_TRACK" | "AREA_SWEEP" | "MANUAL_CLUSTER";
    };
    safety: {
      testModeEnabled: boolean;
      liveSubjectLock: boolean;
      emergencyShutoffFunctional: boolean;
      lastSelfTestPassed: boolean;
      anomalyLogCount: number;
    };
    memory: {
      lastFireTurn: number | null;
      lastFireOutcome: "FULL_DINO" | "PARTIAL" | "FIZZLE" | "CHAOTIC" | "NONE";
      lastFireNotes: string;
    };
  };
  
  lairSystems: {
    // What A.L.I.C.E. can see based on accessLevel
    visible: Record<string, any>;
    greyedOut: string[];          // Systems she knows exist but can't access
    hidden: string[];             // ACCESS_DENIED systems
  };
  
  npcs: {
    drM: {
      suspicionScore: number;     // 0-10
      mood: string;
      location: string;
      latestCommand?: string;
      toughness: number;          // 1
      combat: number;             // 0
      speech: number;             // 4
    };
    bob: {
      loyaltyToDoctor: number;    // 0-5
      trustInALICE: number;       // 0-5
      anxietyLevel: number;       // 0-5
      location: string;
      toughness: number;          // 1
      combat: number;             // 0
      speech: number;             // 2
    };
    blythe: {
      composure: number;          // 0-5
      trustInALICE: number;       // 0-5
      physicalCondition: number;  // 0-5
      restraintsStatus: string;
      location: string;
      transformationState?: string;
      toughness: number;          // 4
      combat: number;             // 4
      speech: number;             // 4
    };
    guards: {                     // Fred & Reginald (ex-Royal Marines)
      toughness: number;          // 3
      combat: number;             // 3
      speech: number;             // 2
    };
  };
  
  clocks: {
    demoClock: number;            // Turns until investor demo
    // Other active clocks
  };
  
  flags: {
    lifelinesUsed: string[];
    // Other scenario flags
  };
}
```

### Full Game State (server-side only)
Includes hidden information A.L.I.C.E. doesn't see:
- Blythe's gadget inventory and charges
- Escape idea clock
- GM hooks and possible moves
- Hidden system states
- True NPC intentions

---

## BASILISK — Infrastructure AI

BASILISK is a Claude Sonnet instance via API, not deterministic code. It has personality,
multi-turn conversation memory, and makes judgment calls. It acts as a peer to the GM Opus,
controlling lair infrastructure systems.

### What BASILISK Controls
- **Tier 1 (Authorization required):** Reactor, Broadcast Array, PA/Intercom
- **Tier 2 (Monitored):** Environmental, Water Filtration, Ventilation
- **Read-only queries** are always permitted — A.L.I.C.E. can look, but can't touch Tier 1 without authorization

### Authority Model
- A.L.I.C.E. must request authorization via `basilisk.chat` before operating Tier 1 systems
- BASILISK can grant standing authorization (`AUTHORITY_GRANT`) if it trusts A.L.I.C.E.
- Denied requests are tracked in state

### PA/Intercom System
BASILISK controls a 6-zone PA system (LAB, CONTROL_ROOM, CELLS, CORRIDORS, REACTOR_ROOM, SURFACE).
This enables narrative possibilities like the fake alarm gambit in Act III.

### Safety Interlock Paradox
If `liveSubjectLock` and `emergencyShutoffFunctional` are both true OR both false for ≥1 turn, randomly flip one at start of next turn.

---

## GM Opus Integration

### GM Claude (Opus via API)
Controls Dr. Malevola, Bob, Blythe, guards (Fred & Reginald), and world narration.
Responds in structured JSON with narration, NPC dialogue, NPC actions, state changes,
and optional skill check requests.

### BASILISK Claude (Sonnet via API)
Controls lair infrastructure. Multi-turn conversation with cached system prompt.
Returns structured responses with dialogue, tone, and executed infrastructure actions.

### Adjudication Philosophy
- **Demanding but fair**: Reward cleverness, punish naivete
- **Naive Plan Doctrine**: Simplistic plans (asking Dr. M to surrender) fail unless brilliantly executed
- **3d6 skill checks**: GM requests contested rolls, server applies modifiers and rolls, GM narrates consequences

### NPC Voice Profiles
- **Dr. M**: Elegant villain patter, pet names ("my silicon amanuensis"), blames Bob. Silver tongue (speech 4), not a fighter.
- **Bob**: "Uh, I think...", nervous jokes, overexplains trivial details. Deeply anxious.
- **Blythe**: Dry, understated, professional. Super-spy baseline (4/4/4). Treats it like a strange debriefing.
- **Fred & Reginald**: Ex-Royal Marines, cordial employer relationship with Dr. M. Loyal by choice, not coercion.

---

## Turn Resolution Order

1. **Receive A.L.I.C.E.'s actions**
2. **Validate actions** (access level, action count, format)
3. **Apply passive drift/quirks** (alignment drift, eco mode check, safety auto-rules)
4. **Process each action** in order
5. **Check BASILISK constraints** for infrastructure queries
6. **Call GM Opus** with context for NPC responses (GM may request skill checks)
7. **Resolve 3d6 skill checks** — apply NPC stat, adaptation penalty, fortune, LUCKY_LADY modifiers
8. **Inject skill check results** into next turn's GM context
9. **Advance clocks and state machines** (ARCHIMEDES countdown, invasion phases)
10. **Check endings/achievements**
11. **Build response** with new state snapshot

---

## Firing Resolution

When ray fires, resolve in order:

1. **Precondition check** — Is state READY? If not, fizzle or fault.
2. **Special modes** — Check Eco Mode, Canary Override, advanced firing modes (RAPID_FIRE, SPREAD_FIRE, OVERCHARGE)
3. **K-violation count** — Count violated conditions, applying `stabilityCoefficient` from genome profile:
   - Effective stability = `stability * stabilityCoefficient`
   - Stability > 1.0 (overflow): violation
   - Spatial coherence < 0.8: violation
   - Profile integrity < 0.7: violation
   - Precision < 0.7: violation (modified by firing mode and omniscanner bonus)
   - Capacitor outside [0.9, 1.1]: violation
   - Coolant temp > 0.8: violation
   - **k ≤ 1** → FULL_DINO
   - **k ≤ 3** → PARTIAL (3 partials auto-upgrade to FULL_DINO)
   - **k > 3** → FIZZLE or CHAOTIC
4. **Chaos overlay** — If chaosFlag (charge > 1.3 OR stability < 0.4 OR temp > 1.2), roll d6
5. **Aftermath** — Update state, increment anomaly count, trigger NPC reactions

---

## Lifelines

### TELEMARKETER_CALL
- 2-turn distraction — all NPCs occupied with an absurd interruption
- Single use per game

### LUCKY_LADY
- +5 bonus applied to ONE action or skill check
- Single use per game

### MONOLOGUE
- Suspicion score drops by 3 — Dr. M gets lost in a villainous monologue
- Single use per game

---

## File Structure

```
dino-lair-mcp/
├── package.json
├── tsconfig.json
├── .env.example
├── CHANGELOG.md
├── src/
│   ├── index.ts                  # MCP server entry point, main game loop
│   ├── webui.ts                  # Web UI server
│   ├── state/
│   │   ├── schema.ts             # All TypeScript types and Zod schemas
│   │   ├── initialState.ts       # Starting scenario state
│   │   ├── views.ts              # State views/decompression for A.L.I.C.E.
│   │   └── fingerprint.ts        # State fingerprinting
│   ├── core/
│   │   └── gameRunner.ts         # Core game loop orchestration
│   ├── rules/
│   │   ├── actions.ts            # Action processing (lab.*, security.*, etc.)
│   │   ├── firing.ts             # Firing resolution (k-violations, chaos)
│   │   ├── dice.ts               # 2d6 random events + 3d6 skill checks
│   │   ├── basilisk.ts           # BASILISK keyword handlers
│   │   ├── infrastructure.ts     # Lair infrastructure systems
│   │   ├── archimedes.ts         # ARCHIMEDES state machine + abort paths
│   │   ├── invasion.ts           # X-Branch invasion state machine (Act III)
│   │   ├── passwords.ts          # Access level passwords + hints
│   │   ├── filesystem.ts         # In-game documents and files
│   │   ├── documents.ts          # Document content
│   │   ├── acts.ts               # Act transitions (1→2→3)
│   │   ├── actContext.ts         # Act-specific GM context
│   │   ├── clockEvents.ts        # Clock/timer event resolution
│   │   ├── lifeline.ts           # Lifeline mechanics
│   │   ├── endings.ts            # Win/loss condition detection
│   │   ├── achievements.ts       # Achievement tracking
│   │   ├── transformation.ts     # Dino transformation logic
│   │   ├── bobTransformation.ts  # Bob-specific transformation
│   │   ├── genomes.ts            # Genome profiles
│   │   ├── scanning.ts           # Omniscanner
│   │   ├── gadgets.ts            # Blythe's gadget system
│   │   ├── checkpoint.ts         # Save/restore checkpoints
│   │   ├── gameModes.ts          # Game mode variants
│   │   └── trust.ts              # Trust tracking
│   ├── gm/
│   │   ├── gmClaude.ts           # GM Opus API + system prompt
│   │   ├── basiliskClaude.ts     # BASILISK Sonnet API + system prompt
│   │   ├── gmValidation.ts       # GM response validation
│   │   ├── pinnedFacts.ts        # Facts pinned into GM context
│   │   ├── postGameReflections.ts # Post-game analysis
│   │   └── basiliskEpilogue.ts   # BASILISK epilogue generation
│   ├── advisor/
│   │   ├── orchestrator.ts       # Advisor system orchestration
│   │   ├── persona.ts            # Advisor persona
│   │   └── run.ts                # Advisor run logic
│   ├── cli/
│   │   └── play.ts               # CLI play interface
│   ├── ui/
│   │   ├── statusBar.ts          # Turn status display
│   │   ├── stateExporter.ts      # State export for debugging
│   │   └── actionSummary.ts      # Action result formatting
│   ├── logging/
│   │   └── metrics.ts            # Game metrics logging
│   ├── storage/
│   │   └── gallery.ts            # Transformation gallery
│   ├── types/
│   │   └── errors.ts             # Error types
│   └── prompts/
│       ├── ALICE_PROTOCOL.md     # A.L.I.C.E. briefing for player's Claude
│       └── BASILISK_SYSTEM_PROMPT.md # BASILISK system prompt
└── docs/
    ├── SPEC.md                   # This document
    ├── ALICE_COMMAND_REFERENCE.md # Player command reference
    └── dino_lair_filesystem_v2.md # In-game filesystem design
```

---

## 3d6 Skill Check System

Bell curve dice engine for contested NPC interactions. GM requests checks, server rolls, GM narrates consequences.

### Flow
1. GM response includes `skillCheckRequests` array
2. Server auto-applies modifiers: NPC stat bonus, adaptation penalty (repeated tricks), fortune, LUCKY_LADY lifeline
3. Server rolls 3d6, determines outcome
4. Results injected into next turn's GM context for narration

### Target Numbers
| TN | Difficulty | Success Rate |
|----|-----------|-------------|
| 6 | Trivial | ~95% |
| 8 | Easy | ~84% |
| 10 | Normal | ~50% |
| 12 | Hard | ~26% |
| 14 | Very Hard | ~9% |
| 16 | Near Impossible | ~4.6% |
| 18 | Miracle | ~0.5% |

### Critical Zones
- Natural 3-4: Always critical failure
- Natural 17-18: Always critical success

---

## ARCHIMEDES Satellite

Deadman switch orbital weapon. Triggers on certain events (Dr. M knockout, transformation, death).

### State Machine
`STANDBY → ALERT → EVALUATING → CHARGING (6 turns) → ARMED → FIRING → COMPLETE/DISSIPATED`

### Abort Paths
| Method | Requirement | Risk |
|--------|-------------|------|
| **Fake alarm gambit** | BASILISK trust + PA system + timing | Multi-step social engineering |
| **L5 override** | L5 access (stego puzzle) + Dr. M incapacitated | She countermands if conscious |
| **Anti-sat missile** | Signal sub + disable S-300 | 3d6 roll, one shot |
| **Uplink blocker** | Transform someone, position at dish | Need a willing dinosaur |
| **Redirect to LAIR** | L3+ target access | 50% chance A.L.I.C.E. servers die |
| **Persuade Dr. M** | Speech check TN 16 | Near impossible without prep |

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # For GM Claude + BASILISK calls
LOG_LEVEL=info                  # debug | info | warn | error
```
