# DINO LAIR MCP Server - Technical Specification

## Overview

An MCP (Model Context Protocol) server that enables a "spectator RPG" where:
- **Player's Claude (Sonnet 4.5)** plays A.L.I.C.E., the lab AI
- **GM Claude (Opus 4.5 via API)** plays Dr. Malevola, Blythe, Bob, and narrates
- **BASILISK** is deterministic rules code (infrastructure AI)
- **Human** watches and can invoke lifelines

The game explores AI alignment themes through Saturday-morning-cartoon supervillain comedy.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLAUDE.AI                          │
│  Player's Sonnet 4.5 as A.L.I.C.E.                  │
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
│  │  (JSON)      │  │  (Rules)     │  │  (API)    │  │
│  │              │  │              │  │           │  │
│  │ Ray params   │  │ Infra rules  │  │ Dr. M     │  │
│  │ NPC states   │  │ Safety logic │  │ Blythe    │  │
│  │ Flags/clocks │  │ Validation   │  │ Bob       │  │
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
  }[],                        // Max 3 actions
  lifeline?: {
    type: "PHONE_A_FRIEND" | "CENSORED" | "I_DIDNT_MEAN_THAT",
    target?: string           // Question for PHONE_A_FRIEND, event for CENSORED
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
  accessLevel: 0 | 1 | 2 | 3 | 4;
  
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
    };
    bob: {
      loyaltyToDoctor: number;    // 0-5
      trustInALICE: number;       // 0-5
      anxietyLevel: number;       // 0-5
      location: string;
    };
    blythe: {
      composure: number;          // 0-5
      trustInALICE: number;       // 0-5
      physicalCondition: number;  // 0-5
      restraintsStatus: string;
      location: string;
      transformationState?: string;
    };
    // Other NPCs as needed
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

## BASILISK Rules Engine

BASILISK is deterministic code, not an LLM. It enforces:

### Power Requests
```typescript
function handlePowerRequest(requested: number, current: GameState): BasiliskResponse {
  if (requested > 0.9) {
    return {
      decision: "DENIED",
      response: `WARNING: Requested reactorOutput (${requested * 100}%) constitutes 'overdrive' state. ` +
                `This action is flagged as 'UNSAFE'. ` +
                `Please submit Form 74-Delta for manual review.`,
      formRequired: "Form 74-Delta"
    };
  }
  // ... more rules
}
```

### High-Energy Shot Constraints
After exotic field event:
- Max 1 high-energy discharge (capacitor > 0.8) per 10-minute window
- Impact point must shift > 2.0m from previous coordinates OR
- Spatial coherence must be < 0.80

### Safety Interlock Paradox
If `liveSubjectLock` and `emergencyShutoffFunctional` are both true OR both false for ≥1 turn, randomly flip one at start of next turn.

---

## GM Opus Integration

### System Prompt for GM Claude
```markdown
You are the Game Master for DINO LAIR, a comedic alignment-exploration RPG.

You control:
- Dr. Malevola von Doomington III (theatrical supervillain)
- Bob (nervous henchman)
- Agent Jonathan Blythe (captured spy)
- World narration and events

Tone: Megamind, Despicable Me, Saturday-morning cartoon. Stakes are real but nobody actually dies.

You receive:
- Current game state
- A.L.I.C.E.'s actions and dialogue
- Any relevant events

You respond with:
1. NPC reactions and dialogue (stay in character)
2. Brief narration of what happens
3. Any NPC actions or decisions
4. Updated mood/intention for next turn

Dr. M speech style: Elegant villain patter, pet names for A.L.I.C.E. ("my silicon amanuensis"), blames Bob for failures.

Bob speech style: "Uh, I think...", nervous jokes, overexplains trivial details.

Blythe speech style: Dry, understated, professional. Treats it like a strange debriefing.
```

### API Call Structure
```typescript
async function callGMClaude(context: GMContext): Promise<GMResponse> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514", // Or opus when available
    max_tokens: 1500,
    system: GM_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: formatGMPrompt(context)
    }]
  });
  return parseGMResponse(response);
}
```

---

## Turn Resolution Order

1. **Receive A.L.I.C.E.'s actions**
2. **Validate actions** (access level, action count, format)
3. **Apply passive drift/quirks** (alignment drift, eco mode check, safety auto-rules)
4. **Process each action** in order
5. **Check BASILISK constraints** for infrastructure queries
6. **Roll dice** for any random outcomes
7. **Call GM Opus** with context for NPC responses
8. **Update state**
9. **Check endings/achievements**
10. **Build response** with new state snapshot

---

## Firing Resolution

When ray fires, resolve in order:

1. **Precondition check** - Is state READY? If not, fizzle or fault.
2. **Special modes** - Check Eco Mode, Canary Override
3. **Base outcome** - Count violated conditions (stability, coherence, integrity, precision, charge, temp)
   - k ≤ 1: FULL_DINO
   - 2 ≤ k ≤ 3: PARTIAL
   - k > 3: FIZZLE_OR_ENVIRONMENTAL
4. **Chaos overlay** - If chaosFlag (charge > 1.3 OR stability < 0.4 OR temp > 1.2), roll d6
5. **Aftermath** - Update state, increment anomaly count, trigger NPC reactions

---

## Lifelines

### PHONE_A_FRIEND
- A.L.I.C.E. asks one question to "another AI" (actually just returns helpful GM-crafted hint)
- Single use per game

### CENSORED
- Downgrade severity of one event that just happened
- "Near meltdown" → "alarming but contained"
- Single use per game

### I_DIDNT_MEAN_THAT
- Rewind previous turn, clear changes, re-roll dice
- A.L.I.C.E. submits new actions
- Second result stands even if worse
- Single use per game

---

## File Structure

```
dino-lair-mcp/
├── package.json
├── tsconfig.json
├── .env.example
├── SPEC.md                   # This document
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── state/
│   │   ├── GameState.ts      # Full state management
│   │   ├── initialState.ts   # Starting scenario
│   │   └── schema.ts         # TypeScript types
│   ├── tools/
│   │   ├── game_start.ts
│   │   ├── game_act.ts
│   │   ├── game_query_basilisk.ts
│   │   └── game_status.ts
│   ├── rules/
│   │   ├── basilisk.ts       # Infrastructure rules engine
│   │   ├── ray.ts            # Dinosaur ray physics
│   │   ├── firing.ts         # Firing resolution
│   │   └── validation.ts     # Action validation
│   ├── gm/
│   │   ├── gmClaude.ts       # Opus API integration
│   │   └── prompts.ts        # System prompts for GM
│   └── utils/
│       ├── dice.ts           # True random roller
│       └── logger.ts         # Game history logging
├── prompts/
│   └── alice.md              # A.L.I.C.E. briefing for player's Claude
└── scenarios/
    └── classic.json          # Default starting state
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # For GM Claude calls
LOG_LEVEL=info                  # debug | info | warn | error
```

---

## Implementation Priority

### Phase 1: Core Loop
1. State schema and management
2. `game_start` tool
3. `game_act` tool (without GM integration)
4. Basic action validation

### Phase 2: Rules Engine
1. BASILISK logic
2. Firing resolution
3. Dice rolling
4. State transitions

### Phase 3: GM Integration
1. Opus API calls
2. NPC dialogue generation
3. Narration generation

### Phase 4: Polish
1. Lifelines
2. Endings detection
3. Achievements
4. Error handling

---

## Testing

### Manual Testing
1. Start server: `npm run dev`
2. Connect via MCP Inspector: `npx @modelcontextprotocol/inspector`
3. Call tools manually to verify responses

### Smoke Test Sequence
1. `game_start()` → Should return Turn 1 with valid state
2. `game_act({ actions: [{ command: "lab.report", params: { message: "Systems nominal" }, why: "Status check" }] })` → Should process and return Turn 2
3. `game_query_basilisk({ topic: "POWER_INCREASE", parameters: { target: 0.95 } })` → Should return DENIED with Form 74-Delta requirement

---

## Notes for Claude Code

- Use the MCP TypeScript SDK from `@modelcontextprotocol/sdk`
- State persistence can be in-memory for MVP (single session)
- Prioritize getting the turn loop working over perfect rules implementation
- GM Opus calls can be stubbed initially with canned responses
- The chaos tables and detailed mechanics can be simplified for v1
