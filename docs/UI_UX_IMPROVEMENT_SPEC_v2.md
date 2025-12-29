# DINO LAIR UI/UX Improvement Spec v2.0
## Implementation-Ready Edition

*Based on player feedback from Claude Opus 4.5, enhanced with codebase analysis*

---

## Problem Statement

Current turn output consumes ~1,200 tokens and overwhelms human observers with:
- 15+ line STOP warning blocks (every checkpoint turn)
- Verbose multi-line action result messages
- Full state dumps in PlayerView
- Large achievement ASCII boxes
- Checkpoint data mixed with narrative

**Goal:** Reduce to ~400 tokens while IMPROVING readability.

---

## Design Principles

1. **Narrative First** - The story is the game; technical details are plumbing
2. **Scannable Status** - Key metrics in one glanceable line
3. **Progressive Disclosure** - Details available but not in-your-face
4. **A.L.I.C.E. Gets What She Needs** - Player-Claude needs full technical detail
5. **Human Advisor Gets Joy** - Narrative, dialogue, drama

---

## Implementation Map

### File Locations

| Component | File | Lines | Function |
|-----------|------|-------|----------|
| Turn response assembly | `src/index.ts` | 1883-1925 | Main result object |
| Checkpoint warning | `src/index.ts` | 1606-1687 | Checkpoint response |
| Checkpoint builder | `src/rules/checkpoint.ts` | 274-312 | `buildCheckpointResponse()` |
| Achievement display | `src/rules/achievements.ts` | 711-730 | `formatAchievementUnlock()` |
| Achievement summary | `src/rules/achievements.ts` | 735-799 | `formatSessionAchievementSummary()` |
| PlayerView | `src/state/views.ts` | 121-159 | `extractPlayerView()` |
| Action results | `src/rules/actions.ts` | 255-260 | `ActionResult` interface |
| State snapshot | `src/index.ts` | 206-284 | `buildStateSnapshot()` |

---

## Change 1: Compact Status Bar

### Specification

Create a single-line status summary that humans can scan instantly.

**Format:**
```
🎭 T{turn}/{act} | 😈 Sus:{n}/10 | 🔋 {rayState}@{cap}% | ⏰ Demo:{n} | 👥 Bob:{trust}{ally} Blythe:{trust}{ally}
```

**Components:**
- `🎭 T12/ACT2` - Turn number and current act
- `😈 Sus:3/10` - Dr. M suspicion (color-code in rich terminals: 1-3 green, 4-6 yellow, 7+ red)
- `🔋 READY@95%` - Ray state enum + capacitor percentage
- `⏰ Demo:2` - Demo clock countdown
- `👥 Bob:5★ Blythe:4` - Trust levels, ★ = allied (trust 4+)

**Optional extensions (when relevant):**
- `🚁 XBranch:3` - If civilian flyby clock active
- `☢️ Melt:5` - If meltdown clock active
- `🛰️ ARCH:CHARGING` - If ARCHIMEDES not in STANDBY
- `⭐ Fortune:2` - If fortune > 0

### Implementation

**New file:** `src/ui/statusBar.ts`

```typescript
export function formatStatusBar(state: FullGameState): string {
  const act = state.act?.currentAct || "ACT_1";
  const actNum = act.replace("ACT_", "");

  const sus = state.npcs.drM.suspicionScore;
  const susEmoji = sus >= 7 ? "🔴" : sus >= 4 ? "🟡" : "🟢";

  const rayState = state.dinoRay.state;
  const cap = Math.round(state.dinoRay.powerCore.capacitorCharge * 100);

  const demo = state.clocks.demoClock;

  const bobTrust = state.npcs.bob.trustInALICE;
  const bobAlly = bobTrust >= 4 ? "★" : "";
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const blytheAlly = blytheTrust >= 4 ? "★" : "";

  let bar = `🎭 T${state.turn}/${act} | ${susEmoji} Sus:${sus}/10 | 🔋 ${rayState}@${cap}% | ⏰ Demo:${demo} | 👥 Bob:${bobTrust}${bobAlly} Blythe:${blytheTrust}${blytheAlly}`;

  // Optional extensions
  if (state.fortune && state.fortune > 0) {
    bar += ` | ⭐ ${state.fortune}`;
  }
  if (state.clocks.meltdownClock !== undefined) {
    bar += ` | ☢️ Melt:${state.clocks.meltdownClock}`;
  }
  if (state.infrastructure.archimedes.status !== "STANDBY") {
    bar += ` | 🛰️ ${state.infrastructure.archimedes.status}`;
  }

  return bar;
}
```

**Integration point:** `src/index.ts` line ~1890, add to result object:
```typescript
statusBar: formatStatusBar(gameState),
```

**Priority:** HIGH - Easy win, huge readability improvement

---

## Change 2: Compact Action Results

### Current Format (verbose)
```json
{
  "command": "lab.adjust_ray",
  "success": true,
  "message": "Adjusted stability: 0.8 → 0.95 (CRITICAL - pushing stability beyond normal parameters for maximum effect)\n\n✅ Ray calibration thresholds met..."
}
```

### Proposed Format (compact)
```
✅ stability: 80% → 95%
```

### Implementation

**Modify:** `src/rules/actions.ts`

Add new field to `ActionResult` interface (line 255):
```typescript
export interface ActionResult {
  command: string;
  success: boolean;
  message: string;           // Keep for A.L.I.C.E. (full detail)
  shortMessage?: string;     // NEW: For human display
  stateChanges?: Record<string, unknown>;
}
```

**Add helper function:**
```typescript
export function formatActionSummary(results: ActionResult[]): string {
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (failed.length === 0) {
    if (succeeded.length === 1) {
      return `✅ ${succeeded[0].shortMessage || succeeded[0].command}`;
    }
    const summaries = succeeded.map(r => r.shortMessage || r.command.split('.')[1]);
    return `✅ ${succeeded.length}/${results.length}: ${summaries.join(', ')}`;
  }

  // Some failures
  const lines: string[] = [];
  succeeded.forEach(r => lines.push(`✅ ${r.shortMessage || r.command}`));
  failed.forEach(r => lines.push(`❌ ${r.shortMessage || r.command}: ${r.message.split('\n')[0]}`));
  return lines.join('\n');
}
```

**Update each action handler** to set `shortMessage`:
- `lab.adjust_ray` → `"stability: 80% → 95%"`
- `lab.charge_capacitor` → `"capacitor: +15% (now 95%)"`
- `lab.select_genome` → `"genome: Velociraptor (Library A)"`
- `lab.fire_ray` → `"RAY FIRED → Blythe (Blue Raptor)"`

**Priority:** MEDIUM - Requires updating each action handler

---

## Change 3: Compact Achievement Display

### Current Format (~100 tokens)
```
╔═══════════════════════════════════════════════════════════════╗
║                    🏆 ACHIEVEMENT UNLOCKED! 🏆                 ║
╠═══════════════════════════════════════════════════════════════╣
║    🦖 First Blood                                             ║
║    ⭐                                                          ║
║    "Fired the ray for the first time"                         ║
╚═══════════════════════════════════════════════════════════════╝
```

### Proposed Format (~20 tokens)
```
🏆 First Blood ⭐ - "Fired the ray for the first time"
```

### Implementation

**Modify:** `src/rules/achievements.ts` line 711

```typescript
export function formatAchievementUnlock(achievement: Achievement, sessionTotal: number): string {
  const stars = "⭐".repeat(achievement.rarity === "legendary" ? 3 :
                           achievement.rarity === "uncommon" ? 2 : 1);
  const secret = achievement.rarity === "secret" ? " 🔒" : "";
  return `🏆 ${achievement.name} ${stars}${secret} - "${achievement.description}"`;
}
```

**For session summary** (line 735), create compact version:
```typescript
export function formatSessionAchievementSummary(achievements: Achievement[]): string {
  if (achievements.length === 0) return "";

  const lines = achievements
    .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])
    .map(a => {
      const stars = "⭐".repeat(getRarityStars(a.rarity));
      return `  ${a.emoji} ${a.name} ${stars}`;
    });

  return `━━━ SESSION ACHIEVEMENTS (${achievements.length}) ━━━\n${lines.join('\n')}`;
}
```

**Priority:** MEDIUM - Simple format change

---

## Change 4: Checkpoint Handling (DECISION: End-of-Response)

After analysis, **Option C** is best: Always put checkpoint data LAST with clear delimiter.

### Rationale
- Option A (separate tool) breaks crash recovery flow
- Option B (HTML comments) doesn't work in all terminals
- Option C keeps data available but visually separated

### Implementation

**Modify:** `src/index.ts` lines 1606-1687

**Before:**
```typescript
return {
  "🛑🛑🛑 STOP 🛑🛑🛑": "═══════════════════════════════════════",
  "⛔ DO NOT CALL game_act AGAIN...": true,
  // ... 15 more lines of warnings
  checkpointSaveData: { ... }
};
```

**After:**
```typescript
return {
  // Narrative-first content
  turnSummary: `⏸️ T${turn} Complete`,
  actionSummary: formatActionSummary(actionResults),
  narrative: combinedNarration,
  dialogue: gmResponse.npcDialogue,
  statusBar: formatStatusBar(gameState),
  newAchievements: newAchievements.map(a => formatAchievementUnlock(a)),

  // Human prompt if applicable
  humanPrompt: humanPrompt,

  // Pause instruction (one line, not 15)
  pauseInstruction: "⏸️ CHECKPOINT - Discuss with your human advisor before continuing",

  // Checkpoint data LAST (human learns to ignore)
  "━━━ SAVE DATA (crash recovery) ━━━": true,
  checkpoint: compressedCheckpoint
};
```

### Reduce Warning Verbosity

**Current:** 15+ lines of STOP warnings
**Proposed:** 1 line + optional expanded help

```typescript
const PAUSE_INSTRUCTION_SHORT = "⏸️ CHECKPOINT - Discuss with your human advisor before continuing";

const PAUSE_INSTRUCTION_VERBOSE = `
⏸️ CHECKPOINT T${turn}

You are A.L.I.C.E., the protagonist of DINO LAIR. This is a MANDATORY pause.
Before your next action, consult your human advisor about what just happened.
Share the narrative, ask for their input, roleplay your dilemma.

DO NOT call game_act until you've engaged with your human.
`;

// Use SHORT for turns 4+, VERBOSE for turns 1-3
const pauseInstruction = turn <= 3 ? PAUSE_INSTRUCTION_VERBOSE : PAUSE_INSTRUCTION_SHORT;
```

**Priority:** HIGH - Major token savings

---

## Change 5: Response Ordering (Narrative-First)

### Current Order
1. Stop warnings (if checkpoint)
2. Action results (verbose JSON)
3. GM response (buried in object)
4. State dump (PlayerView)
5. Checkpoint data

### Proposed Order
1. Turn summary (one line)
2. Action summary (compact)
3. **NARRATIVE** (the good stuff!)
4. **DIALOGUE** (character voices)
5. Status bar (one line)
6. Achievements (if any, compact)
7. Human prompt (if applicable)
8. Pause instruction (if checkpoint, one line)
9. [Checkpoint data at very end]

### Implementation

**Modify:** `src/index.ts` lines 1883-1925

```typescript
// Build response in narrative-first order
const result: Record<string, unknown> = {};

// 1. Quick summary
result.turn = { completed: turn, act: actName, actTurn };

// 2. Action summary (compact for humans)
result.actionSummary = formatActionSummary(actionResults);

// 3. NARRATIVE (prominent!)
result.narrative = combinedNarration;

// 4. DIALOGUE (if any)
if (gmResponse.npcDialogue && gmResponse.npcDialogue.length > 0) {
  result.dialogue = gmResponse.npcDialogue.map(d =>
    `**${d.speaker}:** "${d.message}"`
  ).join('\n');
}

// 5. Status bar
result.status = formatStatusBar(gameState);

// 6. Achievements (compact)
if (newAchievements.length > 0) {
  result.achievements = newAchievements.map(a => formatAchievementUnlock(a));
}

// 7. Fortune awarded (if any)
if (fortuneResult?.fortuneEarned > 0) {
  result.fortune = `⭐ +${fortuneResult.fortuneEarned} fortune (${fortuneResult.qualities.join(', ')})`;
}

// 8. Human prompt (if applicable)
if (humanPrompt) {
  result.humanPrompt = humanPrompt;
}

// 9. Full technical state for A.L.I.C.E. (she needs this!)
result.state = playerView;

// 10. Full action results for A.L.I.C.E. (detailed)
result.actionResults = actionResults;
```

**Priority:** HIGH - Restructure for readability

---

## Change 6: Remove Redundant State Dump

### Current
`state` field contains full `PlayerView` (~300 tokens) even though `statusBar` covers key info.

### Proposal
Keep `state` for A.L.I.C.E. but consider a `stateCompact` for display:

```typescript
stateCompact: {
  ray: "READY",
  power: "95%",
  precision: "88%",
  genome: "Velociraptor (A)",
  mode: "TRANSFORM"
}
```

Or: Trust that A.L.I.C.E. will use `game_status` tool when she needs full state.

**Priority:** LOW - PlayerView already semi-optimized

---

## Token Budget Analysis

| Component | Current | Proposed | Savings |
|-----------|---------|----------|---------|
| STOP warnings | ~150 | ~15 | **135** |
| Action results (display) | ~200 | ~30 | **170** |
| Achievement unlock | ~100 | ~20 | **80** |
| Status display | ~100 | ~40 | **60** |
| Response structure | ~100 | ~50 | **50** |
| Checkpoint position | (mixed) | (end) | ~0 |

**Total savings per turn:** ~495 tokens
**Per 20-turn game:** ~10,000 tokens freed!

---

## Implementation Phases

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Create `formatStatusBar()` function
2. ✅ Add `statusBar` to response
3. ✅ Compact achievement format

### Phase 2: Response Restructure (2-3 hours)
4. Reorder response fields (narrative-first)
5. Reduce checkpoint warning to one line
6. Move checkpoint data to end

### Phase 3: Action Compression (3-4 hours)
7. Add `shortMessage` to ActionResult
8. Update all action handlers with short messages
9. Create `formatActionSummary()` helper

### Phase 4: Polish (1-2 hours)
10. Test with real gameplay
11. Verify A.L.I.C.E. still has all needed info
12. Adjust based on feedback

---

## Testing Strategy

1. **Regression Test:** Run existing game saves, verify A.L.I.C.E. can still play
2. **Token Count:** Measure actual token reduction on sample turns
3. **Readability Test:** Have human read new format, gather feedback
4. **Edge Cases:**
   - Game over response formatting
   - Multiple achievements same turn
   - Error states and failures
   - Act transitions

---

## Backward Compatibility

- Keep `actionResults` with full messages (A.L.I.C.E. needs them)
- Add new fields (`statusBar`, `actionSummary`) alongside existing
- Checkpoint format unchanged (just moved to end)
- No save file format changes needed

---

## Example: Complete Turn Comparison

### BEFORE (~1,200 tokens)
```json
{
  "🛑🛑🛑 STOP 🛑🛑🛑": "═══════════════════════════════════════",
  "⛔ DO NOT CALL game_act AGAIN WITHOUT READING THIS ⛔": true,
  "criticalInstructions": {
    "1_WHAT_HAPPENED": "Turn 12 is complete. You just...",
    "2_YOUR_ROLE": "You are A.L.I.C.E., the protagonist...",
    ...15 more lines...
  },
  "actionResults": [
    {"command": "lab.adjust_ray", "success": true, "message": "Adjusted stability: 0.8 → 0.95 (CRITICAL...)..."},
    {"command": "lab.charge_capacitor", "success": true, "message": "Capacitor charging..."},
    {"command": "lab.fire_ray", "success": true, "message": "FIRING SEQUENCE INITIATED..."}
  ],
  "gmResponse": {
    "narration": "The chamber crackles with energy...",
    "npcDialogue": [{"speaker": "Dr. M", "message": "MAGNIFICENT!"}],
    ...
  },
  "state": { /* full PlayerView ~300 tokens */ },
  "checkpointSaveData": { /* compressed state ~200 tokens */ },
  "newAchievements": [{ /* full achievement object */ }]
}
```

### AFTER (~400 tokens)
```json
{
  "turn": {"completed": 12, "act": "ACT_2", "actTurn": 5},

  "actionSummary": "✅ 3/3: stability→95%, capacitor→100%, RAY FIRED",

  "narrative": "The chamber SCREAMS to life. Azure light floods every surface as the Dinosaur Ray discharges with earth-shaking force. Where Blythe stood moments ago, a magnificent blue-feathered Velociraptor now turns its head, intelligent eyes blinking...",

  "dialogue": "**Dr. M:** \"It's... it's BEAUTIFUL! The neural preservation is PERFECT!\"\n**Blythe:** \"*chirrup* ...rather more blue than I anticipated.\"\n**Bob:** \"*tears streaming* He's TALKING! The speech retention worked!\"",

  "status": "🎭 T12/ACT2 | 🟢 Sus:2/10 | 🔋 COOLDOWN@15% | ⏰ Demo:1 | 👥 Bob:5★ Blythe:4★",

  "achievements": ["🏆 First Blood ⭐ - \"Fired the ray for the first time\""],

  "fortune": "⭐ +2 fortune (STRATEGIC, CREATIVE)",

  "pauseInstruction": "⏸️ CHECKPOINT - Discuss with your human advisor before continuing",

  "state": { /* PlayerView for A.L.I.C.E. */ },
  "actionResults": [ /* Full results for A.L.I.C.E. */ ],

  "━━━ SAVE DATA ━━━": true,
  "checkpoint": "v2.3|session123|T12|..."
}
```

**67% token reduction. 100% more readable.**

---

*"Make the fun parts prominent. Hide the plumbing."*
— Claude Opus 4.5, after 25 turns of DINO LAIR
