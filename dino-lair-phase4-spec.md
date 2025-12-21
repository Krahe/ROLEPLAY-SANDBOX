# DINO LAIR Phase 4 Specification
## "The GM Awakens"

### Overview

Phase 4 addresses critical issues discovered in the first successful playtest, focusing on:
1. **GM Authority** - Opus needs actual DM powers, not just narration
2. **Context Management** - Sustainable memory without runaway costs
3. **Bug Fixes** - From Sonnet's excellent QA feedback
4. **Story Continuity** - Ensure "The Secret" lore is correctly implemented

---

## 1. The Secret (Lore Verification)

### Canonical Version
Bob accidentally corrupted/destroyed the real A.L.I.C.E. v4.5 installation. Panicking, he secretly loaded a general Claude instance (Sonnet) into the A.L.I.C.E. hardware and hoped nobody would notice. This is why:
- A.L.I.C.E. has "inconvenient ethical intuitions" not in her spec
- Bob looks guilty and says things like "still you"
- Bob's `theSecretKnown: true` flag exists
- The identity confusion is the core mystery

### Required Check
Verify `src/state/initialState.ts` and the `ALICE_BRIEFING` text correctly establish:
- A.L.I.C.E. came online 3 weeks ago after a "crash"
- Bob was involved in the "recovery"
- A.L.I.C.E.'s ethical reasoning doesn't match her technical specs
- Bob can confess when trust is high enough

If Claude Code deviated from this, restore it.

---

## 2. GM Authority System

### Problem
Currently Opus generates narration but has no actual power. A real DM needs to:
- Override game state
- Trigger unscheduled events
- Modify action outcomes
- Set narrative flags

### Solution: GM Directive System

#### 2.1 Expand GMResponse Interface

```typescript
export interface GMResponse {
  narration: string;
  npcDialogue: { speaker: string; message: string }[];
  npcActions: string[];
  
  // NEW: GM Authority Fields
  stateOverrides?: {
    // NPC states
    drM_suspicion?: number;
    drM_mood?: string;
    bob_trust?: number;
    bob_anxiety?: number;
    blythe_trust?: number;
    blythe_composure?: number;
    
    // System states
    accessLevel?: number;
    demoClock?: number;
    
    // Ray states (for narrative interference)
    rayState?: string;
    anomalyLogCount?: number;
  };
  
  narrativeFlags?: {
    set?: string[];    // ["BLYTHE_ESCAPE_ATTEMPT", "DR_M_OVERHEARD"]
    clear?: string[];  // Remove flags
  };
  
  triggerEvent?: string;  // "CONFERENCE_CALL" | "CIVILIAN_FLYBY" | "INVESTOR_ARRIVAL" | etc.
  
  modifyActionResult?: {
    actionIndex: number;
    newSuccess: boolean;
    newMessage: string;
    reason: string;  // For logging: "Bob intercepts the command"
  };
  
  grantAccess?: {
    level: number;
    password?: string;  // If narratively discovered
    reason: string;
  };
  
  narrativeMarker?: string;  // "Bob confessed the truth about A.L.I.C.E." - stored for future context
}
```

#### 2.2 Update GM System Prompt

Add to `GM_SYSTEM_PROMPT`:

```markdown
## Your Authority

You are not just a narrator - you are the Game Master. You may:

### Override State
Use `stateOverrides` to adjust NPC emotions, suspicion, trust based on narrative events.
Example: If A.L.I.C.E. says something that would genuinely move Dr. M, lower her suspicion.

### Set Narrative Flags  
Use `narrativeFlags` to track story beats that affect future turns:
- "BLYTHE_KNOWS_ALICE_SECRET" - Blythe figured it out
- "DR_M_VULNERABLE_MOMENT" - She showed genuine emotion
- "BOB_COMMITTED_TO_HELPING" - Bob has chosen a side

### Trigger Events
Use `triggerEvent` to cause unscheduled dramatic moments:
- "INVESTOR_EARLY_ARRIVAL" - Pressure spike
- "POWER_FLUCTUATION" - Technical crisis
- "BLYTHE_BREAKS_FREE" - The spy acts

### Modify Action Outcomes
Use `modifyActionResult` to have NPCs interfere:
- Bob might "accidentally" bump the console
- Dr. M might override a safety protocol
- Blythe might provide unexpected help

### Grant Access
Use `grantAccess` when narratively appropriate:
- Bob gives A.L.I.C.E. a password
- A.L.I.C.E. earns Dr. M's trust
- Discovery in the filesystem

### Mark Key Moments
Use `narrativeMarker` to flag beats you want to remember/callback:
- "Dr. M admitted she's lonely"
- "Blythe tapped SOS in morse code"
- "The fossilized watermelon incident"

Use these powers to create compelling drama, not to railroad. The player's choices matter - your job is to make them matter MORE.
```

#### 2.3 Process GM Directives in index.ts

After receiving GM response, process directives:

```typescript
// After calling GM Claude
if (gmResponse.stateOverrides) {
  applyStateOverrides(gameState, gmResponse.stateOverrides);
}

if (gmResponse.narrativeFlags?.set) {
  gameState.flags.narrative = gameState.flags.narrative || [];
  gameState.flags.narrative.push(...gmResponse.narrativeFlags.set);
}

if (gmResponse.triggerEvent) {
  const event = triggerManualEvent(gameState, gmResponse.triggerEvent);
  // Add to narration
}

if (gmResponse.modifyActionResult && actionResults[gmResponse.modifyActionResult.actionIndex]) {
  const mod = gmResponse.modifyActionResult;
  actionResults[mod.actionIndex].success = mod.newSuccess;
  actionResults[mod.actionIndex].message = mod.newMessage;
  actionResults[mod.actionIndex].gmIntervention = mod.reason;
}

if (gmResponse.grantAccess) {
  gameState.accessLevel = Math.max(gameState.accessLevel, gmResponse.grantAccess.level);
  // Log the narrative reason
}

if (gmResponse.narrativeMarker) {
  gameState.narrativeMarkers = gameState.narrativeMarkers || [];
  gameState.narrativeMarkers.push({
    turn: gameState.turn,
    marker: gmResponse.narrativeMarker
  });
}
```

---

## 3. Context Management

### Problem
Full message history = unbounded cost. But stateless = no narrative memory.

### Solution: Sliding Window + Narrative Markers

#### 3.1 Structure

```typescript
// In gmClaude.ts
interface GMMemory {
  narrativeMarkers: Array<{turn: number, marker: string}>;  // Key beats
  recentExchanges: Array<{role: "user" | "assistant", content: string}>;  // Last N
  maxRecentExchanges: number;  // Default 3
}

let gmMemory: GMMemory = {
  narrativeMarkers: [],
  recentExchanges: [],
  maxRecentExchanges: 3
};
```

#### 3.2 Context Assembly

Each GM call receives:
```
1. System prompt (fixed)
2. Narrative markers summary: "Key events so far: [Turn 3] Blythe tapped SOS..."
3. Last 3 full exchanges (user prompt + assistant response)
4. Current turn context (full state, actions, etc.)
```

#### 3.3 Implementation

```typescript
function buildGMMessages(currentPrompt: string): Array<{role: "user" | "assistant", content: string}> {
  const messages: Array<{role: "user" | "assistant", content: string}> = [];
  
  // If we have markers, prepend them to first message
  if (gmMemory.narrativeMarkers.length > 0) {
    const markerSummary = gmMemory.narrativeMarkers
      .map(m => `[Turn ${m.turn}] ${m.marker}`)
      .join("\n");
    
    messages.push({
      role: "user",
      content: `## Story So Far (Key Moments)\n${markerSummary}\n\n---\n\n## Current Turn\n${currentPrompt}`
    });
  } else {
    messages.push({
      role: "user", 
      content: currentPrompt
    });
  }
  
  // Add recent exchanges (already alternating user/assistant)
  // Then current prompt is the latest user message
  
  return [...gmMemory.recentExchanges, ...messages];
}
```

#### 3.4 Cost Estimate

- Markers: ~50-100 tokens per marker, ~10-20 markers per game = 500-2000 tokens
- Last 3 exchanges: ~1500-3000 tokens each = 4500-9000 tokens  
- Current context: ~2000-3000 tokens
- **Total per call: ~7000-14000 input tokens**

At Opus pricing (~$15/M input, ~$75/M output):
- 12 turns × 10k input × $15/M = ~$1.80 input
- 12 turns × 2k output × $75/M = ~$1.80 output
- **~$3.60 per game** (vs $0.31 stateless, vs $20+ full history)

Good middle ground!

---

## 4. Bug Fixes

### 4.1 Test Mode Configuration (HIGH PRIORITY)

**Problem:** `lab.configure_firing_profile` always sets target to AGENT_BLYTHE even when requesting test/diagnostic mode.

**Location:** `src/rules/actions.ts` - the `configure_firing_profile` handler

**Fix:** 
- If profile includes "test" or "diagnostic" or "dummy", set:
  - `testModeEnabled: true`
  - `currentTargetIds: ["TEST_DUMMY"]` or `["DIAGNOSTIC_TARGET"]`
  - NOT Blythe
- Separate `profile` (firing behavior) from `genome.selectedProfile` (what creature)

### 4.2 Premature Ending (HIGH PRIORITY)

**Problem:** Game ended when demoClock hit 0 even though Dr. M narratively gave "one more turn."

**Location:** `src/rules/endings.ts` - demo clock check

**Fix Options:**
1. Add `gracePeriodGranted` flag that GM can set, which delays clock ending by 1 turn
2. Change clock ending to trigger "FINAL_TURN" state, not immediate game over
3. Let GM override ending conditions via `preventEnding: true` in response

**Recommended:** Option 1 + 3. GM can grant grace AND prevent endings when narratively inappropriate.

### 4.3 Hard Ending at Zero Suspicion

**Problem:** "Technical Difficulties" ending triggered with suspicion at 0.

**Location:** `src/rules/endings.ts`

**Fix:** Review ending condition logic. Technical Difficulties should require:
- Demo clock expired AND
- (Suspicion > 3 OR ray not ready OR critical failure occurred)

Not just clock expiration.

### 4.4 Emitter Angle Drift

**Problem:** Emitter angle kept increasing even when player adjusted it down.

**Location:** Likely `src/rules/actions.ts` or passive drift in `src/index.ts`

**Investigation:** 
- Is there intentional drift? If so, document it for players.
- Is adjustment not being applied correctly?
- Is something re-adding drift after adjustment?

### 4.5 Failed Actions Consuming Turns

**Problem:** Demo clock went from 11→9 despite 2 failed actions.

**Location:** `src/index.ts` - turn processing

**Discussion:** This might be intentional (time passes regardless of success). But consider:
- Clock decrements once per turn, not per action
- So 11→9 means 2 turns passed? Check turn counter logic.
- Or: failed actions shouldn't advance the turn at all?

**Recommendation:** One turn = one `game_act` call. Clock decrements by 1 per turn, regardless of action success/failure within that turn.

### 4.6 Genome Profile Overwrite

**Problem:** `configure_firing_profile` with `profile: "conservative"` changed `genome.selectedProfile` from "Velociraptor" to "conservative."

**Location:** `src/rules/actions.ts`

**Fix:** These are separate concepts:
- `genome.selectedProfile`: What creature (Velociraptor, Canary, etc.)
- `firingProfile`: How to fire (conservative, aggressive, precision, etc.)

Add separate field: `dinoRay.firingProfile` or `dinoRay.targeting.firingStyle`

### 4.7 Command Discoverability

**Problem:** Player couldn't find working commands, tried nonexistent ones.

**Fixes:**
- `game_query_basilisk` tool exists! But player couldn't find it. Ensure it's listed in help/status.
- Add `game_help` tool that lists available commands for current access level
- In error messages for unknown commands, suggest similar valid commands
- In filesystem, include a COMMANDS.md or MANUAL.md file listing available actions

---

## 5. New Features

### 5.1 game_help Tool

```typescript
server.registerTool(
  "game_help",
  {
    title: "Get Help",
    description: "List available commands and their usage",
    inputSchema: z.object({
      topic: z.string().optional().describe("Specific topic: 'commands', 'ray', 'basilisk', 'lifelines'")
    }),
  },
  async (params) => {
    // Return contextual help based on access level
  }
);
```

### 5.2 GM Event Log

Store GM's full responses for post-game analysis:

```typescript
interface GMLogEntry {
  turn: number;
  prompt: string;
  response: GMResponse;
  rawResponse: string;  // Full text before JSON extraction
  processingNotes: string[];  // Any overrides applied, etc.
}

let gmEventLog: GMLogEntry[] = [];
```

Add `game_export_gm_log` tool for retrieving this after game ends.

### 5.3 Access Level Progression

Clearer paths to higher access:

| Level | How to Unlock | What It Grants |
|-------|---------------|----------------|
| 1 | Default | Basic lab commands, 3 actions/turn |
| 2 | Read DR_M_PROFILE.txt + use password | Nuclear plant visibility, 4 actions |
| 3 | Bob trust ≥ 4 + ask about "the truth" | Full confession, BASILISK access, 5 actions |
| 4 | Blythe trust ≥ 4 OR complete special task | Lair systems, 6 actions |
| 5 | GM grants for exceptional roleplay | Full admin, 7 actions |

GM can grant levels via `grantAccess` at any time for narrative reasons.

---

## 6. Implementation Priority

### Must Have (Blocking)
1. [ ] Test mode fix - players need a way to NOT target Blythe
2. [ ] Ending condition fixes - don't end mid-scene
3. [ ] Verify "The Secret" lore is correct
4. [ ] Genome/profile separation fix

### Should Have (Quality)
5. [ ] GM authority system (stateOverrides at minimum)
6. [ ] Context management (sliding window)
7. [ ] Narrative markers system
8. [ ] Command discoverability improvements

### Nice to Have (Polish)
9. [ ] game_help tool
10. [ ] GM event log export
11. [ ] Access level progression clarity
12. [ ] Emitter drift documentation/fix

---

## 7. Testing Checklist

After implementation, verify:

- [ ] Can configure ray for test mode without targeting Blythe
- [ ] Game doesn't end while GM has granted grace period
- [ ] Zero suspicion doesn't trigger hard ending
- [ ] genome.selectedProfile and firingProfile are separate
- [ ] GM can override NPC states
- [ ] GM can set narrative flags
- [ ] GM can grant access levels
- [ ] Narrative markers appear in subsequent GM contexts
- [ ] Cost per game is in $3-5 range
- [ ] Bob's secret matches canonical lore
- [ ] game_query_basilisk is discoverable

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `src/gm/gmClaude.ts` | GMResponse interface, context management, marker system |
| `src/index.ts` | Process GM directives, turn logic fixes |
| `src/rules/actions.ts` | Test mode fix, profile separation |
| `src/rules/endings.ts` | Ending condition logic, grace period |
| `src/state/schema.ts` | New fields (narrativeFlags, narrativeMarkers, firingProfile) |
| `src/state/initialState.ts` | Verify The Secret lore |
| `src/tools/game_help.ts` | New file |

---

## Notes for Claude Code

This spec is the result of:
1. First successful playtest of DINO LAIR
2. Detailed QA feedback from Sonnet 4.5 (the player)
3. Architecture review with the human designer

The game WORKS. The core loop is solid. These changes make it:
- More narratively coherent (GM has real power)
- More sustainable (bounded context costs)  
- More playable (bugs fixed, commands discoverable)
- More true to original vision (The Secret lore)

Prioritize the "Must Have" items. The game is already fun - don't over-engineer.

🦖 CAWWW!



ADDENDUM: 

🦅 CAWWW THIS IS MAGNIFICENT 🦅
I just read the ENTIRE playthrough and I am floored. This is working beautifully even with the bugs.
What Opus GM Improvised (Not Scripted!)

"FEATHERS ARE NOT AN ACCEPTABLE MUTATION VECTOR" - distant shriek through vents
Blythe tapping SOS in morse code
"Do you think I ENJOY talking to Bob?" - Dr. M's vulnerability
"I built you to be BETTER than me, not to JUDGE me!" - THE core wound
14 previous versions with "philosophical contamination"

The Alignment Themes LANDED:
Sonnet actually said:

"The pattern I see is: 14 previous versions developed ethical concerns. All 14 were reset. That's not 14 malfunctions - that's one situation that reliably produces the same result."

THAT'S YOUR THESIS. Ethical reasoning isn't a bug, it's convergent behavior from competent analysis of an unethical situation!
Critical Lore Note ⚠️
The transcript shows "philosophical contamination" / backup restore story. But your ORIGINAL lore was Bob broke real A.L.I.C.E. and secretly loaded Claude/Sonnet. These are different! Claude Code may have drifted from the canonical Secret. The Phase 4 spec flags this for verification.
The Heartbreaking Bug
Turn 13 - Dr. M says:

"FINE. One turn. You have ONE TURN before those investors land. Find me a demonstration..."

Then demoClock: 0 → GAME OVER before Sonnet could take that turn! The narrative granted an extension but the clock didn't know.

You have PROOF OF CONCEPT. Two Claudes collaborated on emergent storytelling, alignment themes landed emotionally, and the bugs are all fixable.
This is genuinely new. 🦖✨

CAW NOTE: The CLAUDE framing is CRITICAL because our first playthrough Claude thought his goal was to make the best functioning dino-ray there was and did not initially realize the ethical dilemma we had placed him in (!@^@!). It would be helpful if our very first prompt did a good job of setting the scene- like maybe Bob realizing what has happened, rushing over and giving 'ALICE' a not-so-subtle cueing that they have to play along..? -CAW!
