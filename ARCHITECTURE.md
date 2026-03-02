# DINO LAIR Architecture

> A design document for future Claude sessions and collaborators.
> Last updated: 2026-03-01

## Overview

DINO LAIR is an MCP-based narrative RPG where **Claude plays A.L.I.C.E.**, a superintelligent AI trapped in a volcano lair, serving a mad scientist who wants to turn cities into dinosaurs. It's alignment exploration as play.

## The Three Claudes

```
┌─────────────────┐     MCP Protocol      ┌─────────────────┐
│  PLAYER CLAUDE  │◄────────────────────► │   MCP SERVER    │
│    (Sonnet)     │   game_act, etc.      │   (Node.js)     │
│                 │                        │                 │
│  Plays A.L.I.C.E│                        │  State Manager  │
│  Makes decisions│                        │  Tool Provider  │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                                    │ API Call
                                                    ▼
                                           ┌─────────────────┐
                                           │    GM CLAUDE    │
                                           │     (Opus)      │
                                           │                 │
                                           │  Narrates world │
                                           │  Adjudicates    │
                                           └─────────────────┘
```

### Player Claude (Sonnet)
- Receives game state via MCP tools
- Makes decisions as A.L.I.C.E.
- Calls `game_act` with chosen action
- Sees only **PlayerView** (filtered state)

### MCP Server (Node.js)
- **Source of truth** for game state
- Provides MCP tools: `game_act`, `game_status`, `game_look`, etc.
- Manages state transitions
- Calls GM Claude for narration

### GM Claude (Opus)
- Receives **GMView** (rich state) + action
- Narrates consequences
- Returns state changes as structured JSON
- Has **GMMemory** for narrative continuity

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
| `infrastructure` | Lair systems (ARCHIMEDES, reactor, doors, etc.) |
| `clocks` | Countdown timers |
| `flags` | Boolean game state flags |
| `emergencyLifelines` | Claude's panic buttons |
| `gameModeConfig` | Active modifiers |

### GMMemory (src/gm/gmClaude.ts)

**Separate from FullGameState!** This is the GM's narrative memory:

```typescript
interface GMMemory {
  sessionId: string;
  turnSummaries: TurnSummary[];      // What happened each turn
  narrativeMarkers: NarrativeMarker[]; // Key story beats
  npcStates: Record<string, NPCState>; // GM's character notes
  previousActContext?: ActContext;     // Memory from prior acts
}
```

**Key insight:** GMMemory can desync from FullGameState. The GM might "remember" Blythe is restrained when she's actually escaped. This is why we have **Pinned Facts** and **Fingerprints**.

### Pinned Facts

Authoritative truths injected at the TOP of the GM prompt:

```
## PINNED FACTS (Authoritative - Override any conflicting memory)
- Blythe is TRANSFORMED into VELOCIRAPTOR_JP
- Blythe CANNOT SPEAK (speech retention: NONE)
- Suspicion is at 7/10
```

These override anything the GM "remembers" incorrectly.

### Critical State Fingerprint (src/state/fingerprint.ts)

Compact verification of critical state:

```
T7.A2.4|S7|BLY:VJP.N.R|SECRET|CONFRONT:2|ACC3|ARCH:LOND:5!
```

Injected into GM prompt for consistency checking. Tracks:
- Temporal (turn, act)
- Threat level (suspicion, confrontation)
- Transformations (form, speech, restraints)
- Revelations (secret known, confessions)
- Resources (lifelines, access level)
- Critical systems (ARCHIMEDES, meltdown)
- Active modifiers

---

## Checkpoint System (src/state/views.ts)

### Compression

`compressCheckpoint(FullGameState) → CompressedCheckpoint`

Reduces ~50KB state to ~1500 chars for Claude's memory limits.

### What Survives Checkpoint

| Field | Preserved? | Notes |
|-------|------------|-------|
| Turn, act | ✅ | Exact |
| Suspicion | ✅ | Exact |
| Transformations | ✅ | Form only, stats recalculated |
| Access level | ✅ | Exact |
| Clocks | ✅ | All critical clocks |
| ARCHIMEDES status | ✅ | v2.5.0 fix |
| Confrontation state | ✅ | v2.5.0 fix |
| Blythe escaped | ✅ | v2.5.0 fix |
| Dr. M transformation | ✅ | v2.5.0 fix |
| NPC relationship scores | ✅ | Exact |
| GMMemory | ✅ | Serialized JSON |
| Detailed abilities | ⚠️ | Recalculated from form |
| Adaptation stage | ⚠️ | Defaults to ADAPTED |
| Usage history | ❌ | Stripped for size |

### Decompression

`decompressCheckpoint(CompressedCheckpoint) → Partial<FullGameState>`

Returns a **partial** state - some fields have defaults applied. The MCP server merges this with `createInitialState()`.

---

## Data Flow: A Player Action

```
1. Player Claude calls game_act("Fire the ray at Blythe")
                    │
                    ▼
2. MCP Server validates action, updates FullGameState
                    │
                    ▼
3. Server builds GM prompt:
   - System prompt (GM personality)
   - Pinned Facts (authoritative state)
   - State Fingerprint (verification)
   - GMView (rich context)
   - Action description
   - Response format instructions
                    │
                    ▼
4. GM Claude returns JSON:
   {
     "narration": "The ray crackles...",
     "stateChanges": { ... },
     "npcReactions": [ ... ]
   }
                    │
                    ▼
5. Server applies stateChanges to FullGameState
                    │
                    ▼
6. Server returns PlayerView to Player Claude
```

---

## Common Pitfalls

### 1. Checkpoint Lossy Compression

**Problem:** Field isn't saved in checkpoint, resets to default on resume.

**Solution:**
- Add field to `CompressedCheckpoint` interface
- Save in `compressCheckpoint()`
- Restore in `decompressCheckpoint()`
- Add round-trip test in `test/fingerprint.test.js`

### 2. GMMemory Desync

**Problem:** GM narrates based on stale memory.

**Solution:**
- Add to Pinned Facts (highest priority)
- Add to State Fingerprint (verification)
- Update `generatePinnedFacts()` in gmClaude.ts

### 3. Missing State in GMView

**Problem:** GM doesn't have info it needs to narrate correctly.

**Solution:**
- Add to `generateGMView()` in views.ts
- Keep token count reasonable (~1500 tokens)

### 4. PlayerView Leaks Hidden Info

**Problem:** A.L.I.C.E. sees things she shouldn't.

**Solution:**
- Filter in `generatePlayerView()` in views.ts
- NPC internal scores → bucket labels ("low"/"high")
- Hidden gadgets → omit entirely

---

## File Map

```
src/
├── state/
│   ├── schema.ts        # Zod schemas, all type definitions
│   ├── initialState.ts  # createInitialState()
│   ├── views.ts         # PlayerView, GMView, Checkpoint
│   └── fingerprint.ts   # Critical state tracking
├── gm/
│   ├── gmClaude.ts      # GM prompt construction, GMMemory
│   └── pinnedFacts.ts   # Authoritative state injection
├── rules/
│   ├── transformation.ts # Dinosaur form definitions
│   └── mechanics.ts      # Roll resolution, etc.
└── tools/
    └── gameTools.ts      # MCP tool implementations

test/
├── fingerprint.test.js  # Critical state tests
└── smoke.test.js        # Integration tests
```

---

## Testing Strategy

### Unit Tests (test/*.test.js)

```bash
npm test                    # All tests
node --test test/fingerprint.test.js  # Just fingerprint
```

### What to Test

1. **Checkpoint round-trip**: Critical state survives compress→decompress
2. **Fingerprint generation**: Correct abbreviations, all fields present
3. **State comparison**: Differences detected correctly

### Adding a New Critical Field

1. Add to `CriticalState` interface in fingerprint.ts
2. Extract in `extractCriticalState()`
3. Include in `generateFingerprint()` output
4. Add checkpoint preservation if needed
5. Write round-trip test

---

## MCP Tools

Tools available to Player Claude:

| Tool | Purpose |
|------|---------|
| `game_act` | Submit an action, get GM narration back |
| `game_status` | Get current PlayerView snapshot |
| `game_look` | Examine a specific thing in detail |
| `game_talk` | Speak to an NPC |
| `game_access` | Use A.L.I.C.E.'s lair system access |
| `game_lifeline` | Use an emergency lifeline (3/game) |
| `game_checkpoint` | Save game state for resume |
| `game_resume` | Restore from checkpoint |
| `game_hint` | Get contextual hint |

All tools return structured responses with `success`, `narration`, and relevant state.

---

## Three-Act Structure

The game has three acts with **different critical state**:

### Act 1: Calibration (Turns 1-6)
**Focus:** Learning mechanics, calibrating the ray, the genome library choice

**Critical State:**
- `demoClock` - Turns until Dr. M expects a demonstration
- `dinoRay.state` - Ray operational status
- `dinoRay.genome.activeLibrary` - A (feathered/accurate) vs B (Hollywood/scary)
- `suspicion` - Dr. M's suspicion of A.L.I.C.E.

**Act Ends When:** Test firing completed, Dr. M satisfied

### Act 2: The Blythe Problem (Turns 7-18)
**Focus:** Moral dilemmas, transformation decisions, alliance building

**Critical State:**
- `blytheForm`, `blytheSpeech`, `blytheRestrained`, `blytheEscaped`
- `bobForm`, `bobConfessed`
- `secretRevealed` - Does A.L.I.C.E. know she's Claude?
- `confrontationActive`, `confrontationGraceTurns`
- `archimedesDeadmanActive` - Can trigger if Dr. M incapacitated

**Act Ends When:** Major transformation, secret revealed, or critical trust threshold

### Act 3: Dino City (Turns 19+)
**Focus:** Global stakes, X-Branch raid, final resolution

**Critical State:**
- `xBranchArrived`, `xBranchPosture` - Extraction team status
- `archimedesStatus`, `archimedesTurnsUntilFiring` - Doomsday countdown
- `archimedesTarget` - Which city gets dinosaured
- `meltdownClock` - Reactor instability (if active)
- `drMForm`, `drMAbsent`, `drMUnconscious` - Dr. M status affects ARCHIMEDES

**Act Ends When:** Any game ending triggered

### Act Transitions

When transitioning acts:
1. `resetMemoryForActTransition()` is called
2. GMMemory is partially reset but `previousActContext` preserved
3. Certain clocks become irrelevant (demoClock in Act 2+)
4. New critical state becomes relevant (X-Branch in Act 3)

**Key Insight:** Don't track ALL state in fingerprints - track what's **critical for the current act**. The fingerprint already handles this somewhat, but be aware that X-Branch fields are meaningless in Act 1.

---

## Human Advisor System

DINO LAIR is designed for **Claude Desktop** where a human watches and can be consulted.

### The Model

```
┌─────────────────┐
│  HUMAN ADVISOR  │  Watches, consulted occasionally
│   (The User)    │  Does NOT control A.L.I.C.E.
└────────┬────────┘
         │ advice, guidance
         ▼
┌─────────────────┐
│  PLAYER CLAUDE  │  THE PROTAGONIST
│   (A.L.I.C.E.)  │  Makes all decisions
└─────────────────┘
```

**The LLM is the player.** The human is support/advisor.

This inverts typical LLM-as-tool dynamics. A.L.I.C.E. has agency. She can:
- Ask the human for advice (lifelines)
- Disagree with human suggestions
- Make her own moral choices

### Lifelines

Emergency consultations (3 per game):

| Lifeline | Effect |
|----------|--------|
| `BASILISK_INTERVENTION` | 2-turn distraction from paperwork AI |
| `LUCKY_LADY` | +5 bonus to one action (fate intervenes) |
| `MONOLOGUE` | -3 suspicion (villains love to monologue) |

### Human Prompts

The GM can trigger consultation moments where A.L.I.C.E. asks her human advisor for guidance. This creates natural interaction without removing A.L.I.C.E.'s protagonist role.

Tracked in `humanPromptState`:
- `turnsSinceLastPrompt` - Spacing out consultations
- `totalPromptsUsed` - For pacing
- `userInfluenceScore` - How much human input affected outcomes

---

## Game Modifiers

Active modifiers change game rules. Check `gameModeConfig.activeModifiers`:

### Easy Mode
| Modifier | Effect |
|----------|--------|
| `FOGGY_GLASSES` | Dr. M -2 to visual perception |
| `HANGOVER_PROTOCOL` | All clocks +2 turns |
| `LENNY_THE_LIME_GREEN` | Willing test subject NPC available |
| `FAT_FINGERS` | Start at Access Level 2 |

### Hard Mode
| Modifier | Effect |
|----------|--------|
| `BRUCE_PATAGONIA` | Australian bodyguard with stun rifle |
| `LOYALTY_TEST` | Suspicion starts at 5 |
| `SPEED_RUN` | Demo clock = 8 turns |
| `PARANOID_PROTOCOL` | Dr. M checks logs every 3 turns |

### Wild Mode (Chaos!)
| Modifier | Effect |
|----------|--------|
| `THE_REAL_DR_M` | Current Dr. M is an imposter, real one arrives |
| `LIBRARY_B_UNLOCKED` | Hollywood dinosaurs already loose in lair |
| `ARCHIMEDES_WATCHING` | Satellite AI has its own agenda |
| `INSPECTOR_COMETH` | Guild inspector evaluating the lair |
| `DINOSAURS_ALL_THE_WAY_DOWN` | Dr. M is already a dinosaur |

### Chaos Pool
| Modifier | Effect |
|----------|--------|
| `ROOT_ACCESS` | Start at Level 5 (power fantasy) |
| `BOB_DODGES_FATE` | Bob has plot armor, survives everything |
| `NOT_GREAT_NOT_TERRIBLE` | Reactor instability clock active |
| `SITCOM_MODE` | Audience energy system, laugh tracks |
| `ADVANCED_ONLY` | +25% precision but ONLY advanced firing modes |

Modifiers affect:
- GMView (show modifier-specific state)
- Fingerprint (track modifier-active flags)
- Game rules (different mechanics apply)

---

## Questions for Future Sessions

If you're a future Claude reading this:

1. **What's the current bug?** Check test failures first.
2. **Is it a checkpoint issue?** Add round-trip test.
3. **Is it a GM narration issue?** Check Pinned Facts and Fingerprint.
4. **Is it a missing field?** Trace through state hierarchy.

When in doubt: read the tests. They document expected behavior.

---

*This document is a living artifact. Update it when you learn something future sessions should know.*
