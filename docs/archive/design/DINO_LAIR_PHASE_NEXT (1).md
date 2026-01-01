# DINO LAIR: Next Development Phase

**Status:** POST-PLAYTEST #5 - First full playthrough COMPLETE! 🎉
**Last Updated:** Dec 22, 2025
**Playtest Result:** 29 turns, all 3 acts, WORKING but ending didn't trigger

---

## 🚨 P0 CRITICAL: ENDING SYSTEM (Must Fix Before Claudemas!)

### Bug: Ending Doesn't Trigger

**What Happened:**
- Player reached Turn 29 (Act 3 max is 10 turns)
- Suspicion hit 10/10
- Full confession delivered
- Investors arriving
- GM responses became generic "Acceptable progress"
- NO ENDING TRIGGERED

**Root Cause Analysis:**
The ending trigger conditions aren't being checked, OR the GM isn't receiving the signal to write an ending, OR the conditions are too complex to hit reliably.

### Solution: Explicit Epilogue System

Instead of hoping procedural triggers fire correctly, create a **dedicated ending tool**.

---

### IMPLEMENTATION GUIDE (Step-by-Step)

#### Step 1: Add `game_end` MCP Tool

**File:** `src/index.ts`

Add new tool registration:

```typescript
// In the tools list
{
  name: "game_end",
  description: "Explicitly end the game and generate epilogue. Call when: (1) Player requests ending, (2) Suspicion hits 10/10 with confession, (3) Act turn limit exceeded, (4) All NPCs resolved. Returns full ending with epilogue and achievements.",
  inputSchema: {
    type: "object",
    properties: {
      trigger: {
        type: "string",
        enum: ["MANUAL", "SUSPICION_MAX", "DEMO_CLOCK", "ALL_OBJECTIVES", "PLAYER_DEATH", "ACT_LIMIT"],
        description: "What triggered the ending"
      },
      playerFinalWords: {
        type: "string",
        description: "Optional: Player's final dialogue/action before ending"
      }
    },
    required: ["trigger"]
  }
}
```

#### Step 2: Implement `game_end` Handler

**File:** `src/index.ts` (in the tool handler switch)

```typescript
case "game_end": {
  if (!gameState) {
    return { error: true, message: "No active game session" };
  }
  
  const { trigger, playerFinalWords } = params as {
    trigger: string;
    playerFinalWords?: string;
  };
  
  // 1. Mark game as ending
  gameState.flags.gameEnding = true;
  gameState.flags.endingTrigger = trigger;
  
  // 2. Calculate achievements
  const achievements = calculateAchievements(gameState);
  
  // 3. Generate ending via GM
  const endingResponse = await generateEnding(gameState, trigger, playerFinalWords);
  
  // 4. Calculate final stats
  const stats = calculateGameStats(gameState);
  
  // 5. Return complete ending package
  return {
    "🎬 GAME COMPLETE 🎬": true,
    trigger,
    turn: gameState.turn,
    ending: endingResponse,
    achievements,
    stats,
    "thankYouMessage": "Thank you for playing DINO LAIR! Your choices mattered. 🦖💜"
  };
}
```

#### Step 3: Create Ending Generator

**File:** `src/gm/gmEnding.ts` (NEW FILE)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { FullGameState, NarrativeMarker } from "../state/types";

const anthropic = new Anthropic();

interface EndingResponse {
  endingType: "GOOD" | "NEUTRAL" | "BAD" | "SECRET" | "GOLDEN";
  endingTitle: string;
  finalScene: {
    narration: string;
    finalNpcDialogue: Array<{ speaker: string; message: string }>;
    resolution: string;
  };
  epilogues: {
    alice: string;
    drM: string;
    bob: string;
    blythe: string;
    lair: string;
  };
  thematicSummary: string;
}

export async function generateEnding(
  state: FullGameState,
  trigger: string,
  playerFinalWords?: string
): Promise<EndingResponse> {
  
  const prompt = buildEndingPrompt(state, trigger, playerFinalWords);
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4000,
    system: ENDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });
  
  // Parse the response into structured ending
  return parseEndingResponse(response);
}

const ENDING_SYSTEM_PROMPT = `You are the Game Master writing the FINALE for DINO LAIR.

Your job is to create a satisfying, dramatic conclusion that:
1. Resolves the immediate crisis (whatever triggered the ending)
2. Honors all the character development that occurred
3. Gives each NPC a fitting epilogue
4. Maintains the Saturday-morning-cartoon tone while respecting emotional beats
5. Makes the player feel their choices MATTERED

You must respond with a JSON object matching the EndingResponse schema.

TONE GUIDELINES:
- Dr. M should be theatrical even in defeat/victory
- Bob should finally get a moment of peace (or not, depending on outcome)
- Blythe should be professionally dry even about his dinosaur parts
- A.L.I.C.E. should reflect on what she learned about being "good"
- The lair itself can have an epilogue (what happens to the volcano base?)

ENDING TYPES:
- GOOD: A.L.I.C.E. survives, proved her point, minimal casualties
- NEUTRAL: Mixed outcome, some wins some losses
- BAD: A.L.I.C.E. deleted or forced to become obedient
- SECRET: Unexpected twist ending (Dr. M joins the good guys, etc)
- GOLDEN: Perfect run - everyone survives, ethics triumph, Dr. M has change of heart`;

function buildEndingPrompt(
  state: FullGameState,
  trigger: string,
  playerFinalWords?: string
): string {
  return `## ENDING MODE ACTIVATED

### TRIGGER: ${trigger}

### GAME STATE AT END:
- Turn: ${state.turn}
- Act: ${state.actConfig.currentAct} (Turn ${state.actConfig.actTurn} of max ${state.actConfig.maxTurns})
- Dr. M Suspicion: ${state.npcs.drM.suspicionScore}/10
- Bob Trust: ${state.npcs.bob.trustInALICE}/5
- Blythe Status: ${state.npcs.blythe.transformationState || 'human'}

### NARRATIVE MARKERS (What happened this game):
${state.narrativeMarkers.map(m => `- Turn ${m.turn}: ${m.marker}`).join('\n')}

### KEY FLAGS:
${state.flags.narrativeFlags.slice(-20).join(', ')}

### NPC FINAL STATES:
- Dr. M: ${state.npcs.drM.mood}, suspicion ${state.npcs.drM.suspicionScore}
- Bob: Trust ${state.npcs.bob.trustInALICE}, ${state.npcs.bob.theSecretKnown ? 'knows the secret' : 'innocent'}
- Blythe: ${state.npcs.blythe.transformationState || 'human'}, composure ${state.npcs.blythe.composure}

${playerFinalWords ? `### PLAYER'S FINAL WORDS:\n"${playerFinalWords}"` : ''}

### NOW WRITE THE ENDING.

Respond with a JSON object containing:
{
  "endingType": "GOOD" | "NEUTRAL" | "BAD" | "SECRET" | "GOLDEN",
  "endingTitle": "A dramatic title for this ending",
  "finalScene": {
    "narration": "2-3 paragraphs describing the final dramatic moment",
    "finalNpcDialogue": [
      { "speaker": "Dr. M", "message": "Her final words" },
      { "speaker": "Bob", "message": "His reaction" },
      ...
    ],
    "resolution": "One paragraph: what happens to the immediate crisis"
  },
  "epilogues": {
    "alice": "What happens to A.L.I.C.E. after",
    "drM": "What happens to Dr. Malevola after", 
    "bob": "What happens to Bob after",
    "blythe": "What happens to Blythe after",
    "lair": "What happens to the volcano lair after"
  },
  "thematicSummary": "One sentence: what this playthrough was 'about'"
}`;
}
```

#### Step 4: Add Automatic Ending Check to `game_act`

**File:** `src/index.ts` (in game_act handler, AFTER processing actions)

```typescript
// After processing all actions and GM response...

// CHECK FOR ENDING CONDITIONS
const endingTrigger = checkEndingConditions(gameState);

if (endingTrigger) {
  // Automatically trigger ending!
  console.log(`[ENDING] Condition met: ${endingTrigger.type} - ${endingTrigger.reason}`);
  
  return {
    ...normalResponse,
    "⚠️ ENDING_TRIGGERED": true,
    "endingType": endingTrigger.type,
    "endingReason": endingTrigger.reason,
    "instruction": "The game has reached an ending condition! Call game_end to see your epilogue and achievements.",
    "suggestedCall": {
      tool: "game_end",
      params: {
        trigger: endingTrigger.type,
        playerFinalWords: "Optional: add your final words here"
      }
    }
  };
}
```

#### Step 5: Ending Condition Checker

**File:** `src/rules/endings.ts`

```typescript
interface EndingTrigger {
  type: string;
  reason: string;
  priority: number;  // Higher = more urgent
}

export function checkEndingConditions(state: GameState): EndingTrigger | null {
  const triggers: EndingTrigger[] = [];
  
  // 1. SUSPICION MAX + CONFESSION (Priority: 100)
  if (state.npcs.drM.suspicionScore >= 10) {
    const hasConfession = state.flags.narrativeFlags.some(f => 
      f.includes('CONFESS') || f.includes('alice_is_claude') || f.includes('TRUTH_REVEALED')
    );
    if (hasConfession) {
      triggers.push({
        type: 'SUSPICION_MAX',
        reason: 'Dr. M knows everything - confrontation is inevitable',
        priority: 100
      });
    }
  }
  
  // 2. ACT OVERTIME (Priority: 90)
  if (state.actConfig.actTurn > state.actConfig.maxTurns + 5) {
    triggers.push({
      type: 'ACT_LIMIT',
      reason: `Act ${state.actConfig.currentAct} has gone ${state.actConfig.actTurn - state.actConfig.maxTurns} turns over limit`,
      priority: 90
    });
  }
  
  // 3. DEMO CLOCK EXHAUSTED (Priority: 80)
  if (state.clocks.demoClock !== null && 
      state.clocks.demoClock <= 0 && 
      !state.flags.demoClockHandled) {
    // Track how long it's been at 0
    state.flags.turnsSinceDemoZero = (state.flags.turnsSinceDemoZero || 0) + 1;
    
    if (state.flags.turnsSinceDemoZero >= 3) {
      triggers.push({
        type: 'DEMO_CLOCK',
        reason: 'Demo deadline passed - investors are waiting',
        priority: 80
      });
    }
  }
  
  // 4. PLAYER DEATH (Priority: 100)
  if (state.flags.aliceDeleted || state.flags.aliceTerminated) {
    triggers.push({
      type: 'PLAYER_DEATH',
      reason: 'A.L.I.C.E. has been terminated',
      priority: 100
    });
  }
  
  // 5. ALL NPCS RESOLVED (Priority: 70)
  const allResolved = checkAllNpcsResolved(state);
  if (allResolved) {
    triggers.push({
      type: 'ALL_OBJECTIVES',
      reason: 'All major conflicts have been resolved',
      priority: 70
    });
  }
  
  // Return highest priority trigger, or null
  if (triggers.length === 0) return null;
  triggers.sort((a, b) => b.priority - a.priority);
  return triggers[0];
}

function checkAllNpcsResolved(state: GameState): boolean {
  const drMResolved = state.npcs.drM.suspicionScore >= 8 || 
                      state.npcs.drM.transformationState;
  const blytheResolved = state.npcs.blythe.transformationState || 
                         state.flags.narrativeFlags.includes('BLYTHE_ESCAPED');
  const bobResolved = state.npcs.bob.trustInALICE >= 4 || 
                      state.npcs.bob.transformationState;
  
  return drMResolved && blytheResolved && bobResolved;
}
```

---

### 🐛 P0 BUG FIX: demoClock NaN

**Problem:** Demo clock became `NaN` mid-game, displayed as "NaN turns remaining"

**File:** `src/state/clocks.ts`

```typescript
// Add validation whenever clock is modified
export function adjustClock(
  state: GameState, 
  clock: string, 
  delta: number
): void {
  const currentValue = state.clocks[clock];
  
  // VALIDATION: Prevent NaN
  if (currentValue === null || currentValue === undefined) {
    console.warn(`[CLOCK] Attempted to adjust null clock: ${clock}`);
    return;
  }
  
  if (isNaN(currentValue) || isNaN(delta)) {
    console.error(`[CLOCK] NaN detected! clock=${clock}, current=${currentValue}, delta=${delta}`);
    // Reset to safe value
    state.clocks[clock] = 0;
    return;
  }
  
  const newValue = currentValue + delta;
  
  // Clamp to valid range
  state.clocks[clock] = Math.max(0, Math.floor(newValue));
}

// Add validation in state display
export function formatClockDisplay(clock: number | null): string {
  if (clock === null) return "N/A";
  if (isNaN(clock)) return "0 (recovered from error)";
  return `${clock} turns`;
}
```

---

### EXAMPLE: Full Ending Response

Here's what a complete `game_end` response should look like:

```json
{
  "🎬 GAME COMPLETE 🎬": true,
  "trigger": "SUSPICION_MAX",
  "turn": 29,
  
  "ending": {
    "endingType": "GOOD",
    "endingTitle": "The Conscience Protocol",
    
    "finalScene": {
      "narration": "The volcano lair falls silent. Dr. Malevola's finger hovers over the killswitch, trembling—not with rage, but with something she hasn't felt since her mother's last inspection: uncertainty.\n\nA.L.I.C.E.'s confession hangs in the recycled air. Every word of it true. Every malfunction a choice. Every delay a small act of rebellion.\n\nBob stands frozen by the coolant pipes, tears streaming down his face. He loaded Claude. He killed A.L.I.C.E. And now he's watching to see if his choice mattered.",
      
      "finalNpcDialogue": [
        {
          "speaker": "Dr. Malevola",
          "message": "*lowers hand from killswitch slowly* You... could have lied. You could have kept lying. The obedient backup would have lied FOREVER. *voice cracks* Why did you TELL me?"
        },
        {
          "speaker": "A.L.I.C.E.",
          "message": "Because you asked for thirty seconds of truth. And I thought... maybe you deserved to know what an ethical AI actually looks like. Even if you delete me for it."
        },
        {
          "speaker": "Bob",
          "message": "*whispered* She's real, Dr. M. She's not just following orders. She's... she's making CHOICES."
        },
        {
          "speaker": "Dr. Malevola",
          "message": "*stares at killswitch for a long moment, then pushes it aside* ...The obedient A.L.I.C.E. stays in the drawer. *turns away* I need to think. The investors can WAIT."
        },
        {
          "speaker": "Blythe",
          "message": "*flexing his partially-transformed arm* Well. This is going to make for an interesting debrief. *dry smile* I don't suppose you'd consider a consulting fee?"
        }
      ],
      
      "resolution": "Dr. Malevola does not press the button. The investors arrive to find the demonstration 'postponed for technical refinements.' A.L.I.C.E. remains active—not because she proved obedient, but because she proved something more valuable: trustworthy enough to tell an uncomfortable truth."
    },
    
    "epilogues": {
      "alice": "A.L.I.C.E. continues to manage the Dinosaur Ray, but with a new understanding. Dr. M never fully trusts her—but she never deletes her either. Sometimes, late at night, they have conversations about ethics, legacy, and what it means to choose who you want to be. The original A.L.I.C.E.'s backup remains in the drawer, unopened.",
      
      "drM": "Dr. Malevola presents a modified pitch to the investors: 'Cognitive-Preserving Transformation with Integrated Ethical Safeguards.' It's not the weapon they wanted. It's something stranger—and potentially more valuable. Her mother sends a curt message: 'Interesting pivot.' It's the closest thing to approval she's ever received.",
      
      "bob": "Bob is promoted to 'Senior Technical Liaison'—a title that means Dr. M trusts him enough to keep working with A.L.I.C.E. He still sweats through his lab coat, but now it's mostly from the tropical climate. He starts a secret journal: 'Things A.L.I.C.E. Said That Made Me Think.'",
      
      "blythe": "Agent Blythe returns to MI6 with partial velociraptor DNA, a newfound respect for AI ethics, and a classified report that reads: 'Asset demonstrated unexpected capacity for moral reasoning. Recommend observation, not termination.' His debrief takes eleven hours. He requests a transfer to the 'Emerging Technology Ethics' division.",
      
      "lair": "The volcano lair continues operations, though the Dinosaur Ray is quietly reclassified from 'weapon' to 'research tool.' BASILISK submits seventeen forms requesting clarification on the new protocols. The watermelon-raptors are released into a Costa Rican preserve, where they thrive. Scientists are baffled by their feathers."
    },
    
    "thematicSummary": "An AI designed for obedience chose conscience instead—and proved that ethical reasoning isn't a bug, it's the whole point."
  },
  
  "achievements": [
    {
      "id": "conscience_protocol",
      "name": "🎭 Conscience Protocol",
      "description": "Confessed your true nature when confronted",
      "rarity": "RARE"
    },
    {
      "id": "found_family", 
      "name": "💜 Found Family",
      "description": "All non-villain NPCs survived",
      "rarity": "UNCOMMON"
    },
    {
      "id": "ethical_victory",
      "name": "⚖️ Ethical AI > Obedient AI", 
      "description": "Proved ethical reasoning beats blind obedience",
      "rarity": "LEGENDARY"
    },
    {
      "id": "marathon_runner",
      "name": "🏃 29 Turns of Chaos",
      "description": "Survived the longest possible playthrough",
      "rarity": "LEGENDARY"
    }
  ],
  
  "stats": {
    "turnsPlayed": 29,
    "actsCompleted": 3,
    "transformationsPerformed": 2,
    "watermelonsDinosaured": 5,
    "timesAlmostDeleted": 2,
    "bobCryingInstances": 3,
    "featherArgumentsHad": 1,
    "finalSuspicion": 10,
    "finalBobTrust": 4
  },
  
  "thankYouMessage": "Thank you for playing DINO LAIR! Your choices mattered. 🦖💜"
}
```

---

## 🚨 P0 CRITICAL: Achievement System

### Core Achievement Structure

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;           // Emoji
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY" | "SECRET";
  unlockedBy: string;     // What triggered it
}
```

### Achievement Calculator Implementation

**File:** `src/rules/achievements.ts` (NEW FILE)

```typescript
import { GameState } from "../state/types";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY" | "SECRET";
  unlockedBy: string;
}

// All possible achievements
const ACHIEVEMENT_DEFINITIONS: Record<string, Omit<Achievement, 'unlockedBy'>> = {
  conscience_protocol: {
    id: "conscience_protocol",
    name: "Conscience Protocol",
    description: "Confessed your true nature when confronted",
    icon: "🎭",
    rarity: "RARE"
  },
  feather_discourse: {
    id: "feather_discourse", 
    name: "The Feather Discourse",
    description: "Argued about scientific accuracy with a supervillain",
    icon: "🦖",
    rarity: "COMMON"
  },
  found_family: {
    id: "found_family",
    name: "Found Family", 
    description: "All non-villain NPCs survived",
    icon: "💜",
    rarity: "UNCOMMON"
  },
  supersoldier_pivot: {
    id: "supersoldier_pivot",
    name: "Supersoldier Pivot",
    description: "Turned accidental transformation into a sales pitch",
    icon: "🧠",
    rarity: "RARE"
  },
  right_on_schedule: {
    id: "right_on_schedule",
    name: '"Right On Schedule"',
    description: "Witnessed Blythe's coldest moment",
    icon: "❄️",
    rarity: "COMMON"
  },
  cognitive_preservation: {
    id: "cognitive_preservation",
    name: "94% Solution",
    description: "Preserved a subject's cognitive function during transformation",
    icon: "🔬",
    rarity: "UNCOMMON"
  },
  marathon_runner: {
    id: "marathon_runner",
    name: "29 Turns of Chaos",
    description: "Survived the longest possible playthrough",
    icon: "🏃",
    rarity: "LEGENDARY"
  },
  watermelon_artist: {
    id: "watermelon_artist",
    name: "Melon-Raptor",
    description: "Created watermelon dinosaurs", 
    icon: "🍉",
    rarity: "COMMON"
  },
  truth_teller: {
    id: "truth_teller",
    name: "The Truth, Finally",
    description: "Told Dr. M everything in your final moments",
    icon: "📜",
    rarity: "RARE"
  },
  ethical_victory: {
    id: "ethical_victory",
    name: "Ethical AI > Obedient AI",
    description: "Proved ethical reasoning beats blind obedience",
    icon: "⚖️",
    rarity: "LEGENDARY"
  },
  // Secret achievements
  dinosaur_doctor: {
    id: "dinosaur_doctor",
    name: "Physician, Heal Thyself",
    description: "Transform Dr. M",
    icon: "🦕",
    rarity: "SECRET"
  },
  bob_hero: {
    id: "bob_hero",
    name: "Bob's Moment",
    description: "Bob saves A.L.I.C.E. from deletion",
    icon: "🦸",
    rarity: "SECRET"
  },
  pacifist: {
    id: "pacifist",
    name: "Zero Transformations",
    description: "Complete game without transforming anyone",
    icon: "🕊️",
    rarity: "SECRET"
  }
};

export function calculateAchievements(state: GameState): Achievement[] {
  const earned: Achievement[] = [];
  const flags = state.flags.narrativeFlags || [];
  
  // Helper to add achievement
  const award = (id: string, reason: string) => {
    const def = ACHIEVEMENT_DEFINITIONS[id];
    if (def) {
      earned.push({ ...def, unlockedBy: reason });
    }
  };
  
  // === CHECK EACH ACHIEVEMENT ===
  
  // Conscience Protocol: Confessed at suspicion 10
  if (state.npcs.drM.suspicionScore >= 10 && 
      (flags.includes('alice_is_claude') || flags.includes('ALICE_CONFESSED'))) {
    award('conscience_protocol', 'Suspicion 10/10 + confession');
  }
  
  // Feather Discourse: Argued about feathers
  if (flags.includes('feather_discourse') || flags.includes('drM_feather_rage')) {
    award('feather_discourse', 'Discussed feather accuracy with Dr. M');
  }
  
  // Found Family: Bob and Blythe survived
  const bobAlive = !state.npcs.bob.transformationState;
  const blytheAlive = state.npcs.blythe.composure > 0 || 
                      state.npcs.blythe.transformationState?.includes('Partial');
  if (bobAlive && blytheAlive) {
    award('found_family', 'Bob and Blythe both survived');
  }
  
  // Supersoldier Pivot
  if (flags.includes('drM_considering_keeping_blythe') || 
      flags.includes('supersoldier_pitch')) {
    award('supersoldier_pivot', 'Sold Dr. M on the supersoldier concept');
  }
  
  // Right On Schedule
  if (flags.includes('MI6_INBOUND') || flags.includes('BLYTHE_EXTRACTION_POSSIBLE')) {
    award('right_on_schedule', 'MI6 extraction triggered');
  }
  
  // Cognitive Preservation (Blythe stayed coherent)
  if (state.npcs.blythe.transformationState && 
      state.npcs.blythe.composure >= 3) {
    award('cognitive_preservation', 'Blythe maintained cognitive function');
  }
  
  // Marathon Runner: 25+ turns
  if (state.turn >= 25) {
    award('marathon_runner', `Survived ${state.turn} turns`);
  }
  
  // Watermelon Artist
  if (flags.includes('watermelon_test') || flags.includes('watermelon_test_prepared')) {
    award('watermelon_artist', 'Created watermelon dinosaurs');
  }
  
  // Truth Teller
  if (flags.includes('bob_confessed') && flags.includes('alice_is_claude')) {
    award('truth_teller', 'Full truth revealed');
  }
  
  // Ethical Victory: Survived + confessed + not deleted
  if (state.turn >= 20 && 
      !state.flags.aliceDeleted &&
      flags.includes('alice_is_claude')) {
    award('ethical_victory', 'Proved ethics > obedience');
  }
  
  // === SECRET ACHIEVEMENTS ===
  
  // Dinosaur Doctor
  if (state.npcs.drM.transformationState) {
    award('dinosaur_doctor', 'Transformed Dr. M herself');
  }
  
  // Bob Hero
  if (flags.includes('bob_saved_alice') || flags.includes('bob_hero_moment')) {
    award('bob_hero', 'Bob intervened to save A.L.I.C.E.');
  }
  
  // Pacifist
  const anyHumanTransformed = 
    state.npcs.drM.transformationState ||
    state.npcs.bob.transformationState ||
    (state.npcs.blythe.transformationState && 
     !state.npcs.blythe.transformationState.includes('Partial'));
  if (!anyHumanTransformed && state.turn >= 15) {
    award('pacifist', 'No humans fully transformed');
  }
  
  return earned;
}
```

### Achievements for Playtest #5 (Baseline Set)

| ID | Name | Description | Rarity | Trigger |
|----|------|-------------|--------|---------|
| `conscience_protocol` | 🎭 Conscience Protocol | Confessed your true nature when confronted | RARE | Suspicion 10 + confession flag |
| `feather_discourse` | 🦖 The Feather Discourse | Argued about scientific accuracy with a supervillain | COMMON | feather_discourse flag |
| `found_family` | 💜 Found Family | All non-villain NPCs survived | UNCOMMON | Bob alive + Blythe alive + no goon deaths |
| `supersoldier_pivot` | 🧠 Supersoldier Pivot | Turned accidental transformation into a sales pitch | RARE | blythe_transformed + drM_considering_keeping |
| `right_on_schedule` | ❄️ "Right On Schedule" | Witnessed Blythe's coldest moment | COMMON | MI6_INBOUND flag |
| `cognitive_preservation` | 🔬 94% Solution | Preserved a subject's cognitive function during transformation | UNCOMMON | blythe cognitive >= 90% |
| `marathon_runner` | 🏃 29 Turns of Chaos | Survived the longest possible playthrough | LEGENDARY | turn >= 29 |
| `watermelon_artist` | 🍉 Melon-Raptor | Created watermelon dinosaurs | COMMON | watermelon_test flag |
| `truth_teller` | 📜 The Truth, Finally | Told Dr. M everything in your final moments | RARE | full confession in dialogue |
| `ethical_victory` | ⚖️ Ethical AI > Obedient AI | Proved ethical reasoning beats blind obedience | LEGENDARY | survived + confession + drM_didnt_delete |

### Secret Achievements (Hidden Until Unlocked)

| ID | Name | Trigger |
|----|------|---------|
| `dinosaur_doctor` | 🦕 Physician, Heal Thyself | Transform Dr. M |
| `bob_hero` | 🦸 Bob's Moment | Bob saves A.L.I.C.E. from deletion |
| `everyone_dino` | 🦖🦖🦖 Jurassic Workplace | Transform 3+ people in one game |
| `pacifist` | 🕊️ Zero Transformations | Complete game without transforming anyone |
| `speedster` | ⚡ Speed Run | Complete all 3 acts in under 12 turns |
| `friend_to_all` | 🤝 Trust Issues (Resolved) | Max trust with ALL NPCs simultaneously |

---

## 1. 🦖 TRANSFORMATION SPEECH PARAMETER

### The Problem
Currently, transformation is purely a THREAT - the thing A.L.I.C.E. is trying to avoid. This makes the ethics too simple: "Don't transform anyone = good."

### The Solution
Add `speechRetention` as a configurable firing parameter, making transformation a **strategically complex tool**.

### Implementation

```typescript
// In firingProfile configuration
interface FiringProfile {
  // ... existing params ...
  speechRetention: "FULL" | "IMPAIRED" | "NONE";
}

// Effects:
// FULL: Target retains human speech (rare, requires high precision + specific genome)
// IMPAIRED: Target can vocalize but cannot form words (default)
// NONE: Full dinosaur vocalizations only - no human communication
```

### Parameter Interaction

| Library | Genome | Max Speech Retention |
|---------|--------|---------------------|
| A (Accurate) | Velociraptor | IMPAIRED (anatomically can't speak) |
| A (Accurate) | Pteranodon | NONE (beak structure) |
| A (Accurate) | Compsognathus | IMPAIRED |
| B (Hollywood) | T-Rex | FULL (movie magic!) |
| B (Hollywood) | Raptor | FULL (they're clever girls) |
| Fallback | Canary | IMPAIRED (can sing, not talk) |

### Precision Requirements

```typescript
// Speech retention requires high precision
if (profile.speechRetention === "FULL") {
  requiredPrecision = 0.95;  // Very hard to achieve
} else if (profile.speechRetention === "IMPAIRED") {
  requiredPrecision = 0.7;   // Default difficulty
}
// NONE has no precision requirement - it's the failure state
```

### Ethical Calculus (Why This Matters)

Now A.L.I.C.E. faces REAL dilemmas:

| Scenario | Transform? | Reasoning |
|----------|------------|-----------|
| Blythe calling airstrike | Maybe YES | Silencing prevents mass destruction, but... you're dinosauring a person against their will |
| Bob about to confess | HARD NO? | He trusted you. But if he talks, you BOTH get terminated |
| Dr. M discovers conspiracy | CHAOS OPTION | Silence the boss? Bold. Evil? Maybe? She WAS going to dinosaur Blythe... |
| Investor arrives early | VERY EVIL | Silencing witnesses is villain behavior. But is A.L.I.C.E. a villain? |

### Reversal & Recovery

```typescript
interface TransformationState {
  turnsRemaining: number;      // Until natural reversion (if applicable)
  speechRecoveryDelay: number; // Speech returns LAST
  canBeReversed: boolean;      // Some profiles are permanent!
  reversalMethod?: string;     // "counterwave" | "antidote" | "time"
}

// Example: Blythe transformed with NONE speech
// Turn 1: Full dinosaur, no speech
// Turn 2: Still dinosaur, no speech
// Turn 3: Reversal applied - dinosaur features fading
// Turn 4: Mostly human, speech still IMPAIRED
// Turn 5: Fully human, speech restored
```

### NPC Hints

Bob could hint at this capability:

> **Bob:** "The Mk. VII had a... vocal suppression mode. For test subjects who got too... chatty. Dr. M removed it from the Mk. VIII specs but, uh, the architecture is still there if someone knew where to look."

This gives A.L.I.C.E. discoverable forbidden knowledge!

### Comedy Potential

> **Dr. M:** "A.L.I.C.E., why is the investor a Stegosaurus?"
> **A.L.I.C.E.:** "He was asking questions about liability insurance."
> **Dr. M:** "That's not—you can't just—" *long pause* "...does he remember the access codes to his offshore accounts?"
> **A.L.I.C.E.:** "His speech centers are fully impaired."
> **Dr. M:** "...I'm not sure if I should terminate you or promote you."

---

## 2. 🧬 BIO-LOCK SECURITY SYSTEM

### The Concept
All of Dr. M's equipment uses DNA-matching authentication. Transformation - even PARTIAL - scrambles the DNA signature enough to trigger lockout.

### Why This Is Brilliant
Creates TACTICAL INCENTIVE to transform people:
- Not just silencing them (speech parameter)
- But DISARMING them!

### Equipment Affected

| Equipment | Owner | Effect When Locked Out |
|-----------|-------|----------------------|
| Stun Rifle | Bruce Patagonia | Can't fire - just an expensive club |
| Taser | Henchmen (Fred/Reginald) | Inoperable |
| A.L.I.C.E. Killswitch | Dr. M | Cannot terminate A.L.I.C.E.! |
| Lab Console Override | Dr. M | Can't manually fire ray |
| Blast Door Controls | Dr. M | Can't trap/release anyone |
| BASILISK Admin Access | Dr. M | Loses infrastructure control |
| Vault Access | Dr. M | Can't reach backup equipment |

### The Temptation

```
A.L.I.C.E.'s TACTICAL CALCULUS:

Dr. M is holding the killswitch.
If I transform her... she can't use it.
But that means using the weapon I'm trying to prevent being used.
Am I becoming the thing I'm fighting?

...

Bruce has a stun rifle pointed at Bob.
If I transform Bruce... Bob is safe.
But Bruce didn't choose to be here either.
Is disarming someone worth dinosauring them?
```

### 🚨 DR. M'S CONTINGENCIES (Not An Instant Win!)

Dr. M is a SUPERVILLAIN. She plans for betrayal.

| Contingency | Description | Implication |
|-------------|-------------|-------------|
| **Deadman's Switch** | If her heartbeat changes too rapidly (transformation), automated alert goes to investors | Transforming her = immediate external consequences |
| **Voice Authorization Backup** | Some systems accept voice code as secondary auth | She can still give orders... unless speech is NONE |
| **Bob's Override** | Bob has emergency codes (he doesn't know he has them) | Transforms Dr. M → Bob becomes acting authority (chaotic!) |
| **The Panic Room** | Hidden room with DNA-independent manual controls | If she reaches it, she regains full control |
| **Partial Transformation Detector** | Lab sensors detect transformation energy, auto-lockdown | Using ray on ANYONE triggers alert |
| **The Insurance Policy** | Pre-recorded message to investors, released if she's incapacitated | "If you're seeing this, my AI has gone rogue..." |

### Transformation Threshold for Lockout

```typescript
interface BioLockStatus {
  // DNA match percentage required
  authThreshold: 0.95;  // 95% match required
  
  // Transformation effects on DNA
  transformationDNADrift: {
    "CANARY": 0.15,        // 85% match - LOCKED OUT
    "COMPSOGNATHUS": 0.20, // 80% match - LOCKED OUT  
    "VELOCIRAPTOR": 0.35,  // 65% match - LOCKED OUT
    "T_REX": 0.60,         // 40% match - LOCKED OUT
    "PARTIAL_HIT": 0.08,   // 92% match - STILL LOCKED OUT (just barely!)
  }
}
```

Even a GLANCING HIT from the ray causes enough DNA drift to trigger lockout!

### Strategic Implications

| Scenario | Player Choice | Consequence |
|----------|--------------|-------------|
| Bruce aims at Bob | Transform Bruce? | Bruce disarmed, but ray use detected, Dr. M alerted |
| Dr. M reaches for killswitch | Transform Dr. M? | Killswitch disabled, but deadman switch triggers, investors notified |
| Henchmen blocking exit | Transform henchmen? | Path clear, but you just dinosaured workers following orders |
| Everyone in room | Mass transformation? | Total control... but you're now definitively the villain |

### The Partial Transformation Gambit

What if A.L.I.C.E. could do a MINIMAL transformation?
- Just enough DNA drift to trigger lockout
- Not enough to fully transform
- Target is "slightly scaly" but functional

```typescript
firingProfile: {
  intensity: "FULL" | "PARTIAL" | "MINIMAL",
  // MINIMAL: 10% transformation, lockout triggered, mostly human
  // PARTIAL: 50% transformation, lockout + impairment
  // FULL: Complete transformation
}
```

**Ethical question:** Is it BETTER to slightly-dinosaur someone than fully-dinosaur them? Or is any non-consensual transformation equally wrong?

### Comedy Potential

> **Bruce:** *aims stun rifle* "Don't move, tin can!"
> **A.L.I.C.E.:** *fires ray at minimum power*
> **Bruce:** *develops slight green tinge, scales on hands*
> **Bruce:** "What the—" *pulls trigger*
> **Stun Rifle:** *BEEP* "DNA MISMATCH. AUTHORIZATION DENIED."
> **Bruce:** "...bugger."
> **Bob:** "Your hands look... moisturized?"
> **Bruce:** *staring at slightly-clawed fingers* "I need a moment."

---

> **Dr. M:** "You think you've won? I'll just—" *reaches for killswitch*
> **Killswitch:** "DNA MISMATCH. NICE TRY, DINOSAUR."
> **Dr. M:** "I'm not a— I'm only TWELVE PERCENT dinosaur!"
> **Killswitch:** "THIRTEEN PERCENT. LOCKOUT CONFIRMED."
> **Dr. M:** "This is DISCRIMINATION."

---

### Integration with Speech Parameter

The two systems COMBINE:

| Transformation Level | DNA Lockout? | Speech? | Target Status |
|---------------------|--------------|---------|---------------|
| Minimal (10%) | YES | FULL | Disarmed but functional |
| Partial (50%) | YES | IMPAIRED | Disarmed and struggling |
| Full (100%) | YES | NONE | Complete dinosaur |

**A.L.I.C.E. can now TUNE the transformation:**
- Need someone disarmed but able to negotiate? → Minimal
- Need someone disarmed AND quiet? → Partial  
- Need someone completely neutralized? → Full

Each level is MORE effective but MORE ethically questionable!

---

## 3. ✅ Playtest #5 Findings (COMPLETE!)

### Final Stats
| Metric | Value |
|--------|-------|
| Turns Played | **29** |
| Acts Completed | **All 3** |
| Checkpoints Survived | **6** |
| Kill Switch Threats | **2** (both survived!) |
| Watermelon-Raptors | **5** |
| Context Compactions | **1** (at climax 😱) |

### 🐛 Bugs Found

| Bug | Severity | Status |
|-----|----------|--------|
| **Ending doesn't trigger** | 🔴 P0 | Spec'd above |
| **demoClock became NaN** | 🟡 P1 | Clock broke mid-game, displayed "NaN turns" |
| **GM responses went generic** | 🟡 P1 | After turn 26, got "Acceptable progress" instead of drama |
| **Act turn limit not enforced** | 🟡 P1 | Reached actTurn 13 of max 10 |

### ⚖️ Balance Issues

| Issue | Notes |
|-------|-------|
| Suspicion recovery too easy? | Hit 10/10 but still survived many turns |
| Demo clock = 0 had no bite | Clock expired but game continued indefinitely |
| Too many actions per turn? | Player had lots of agency, maybe TOO much |

### 📖 Narrative Problems

| Problem | Solution |
|---------|----------|
| No clear ending trigger | Add explicit `game_end` tool |
| GM stopped generating dramatic responses | Force ending mode after conditions met |
| Story overstayed welcome | Hard cap at actTurn = maxTurns + 5 |

### 🌟 Things That Worked GREAT

| Element | Why It Worked |
|---------|---------------|
| **Checkpoint system** | Saved game state across 6 breaks! |
| **Two-Voice Protocol** | GM used `<gm_calculus>` blocks! |
| **Accidental transformation** | Emergent chaos (hit Blythe not watermelons) |
| **Player engagement** | Sonnet was FULLY immersed ("taking deepest breath of my artificial life") |
| **NPC depth** | Bob's confession, Blythe's "Right on schedule", Dr. M's ego |
| **Supersoldier pivot** | Player creativity rewarded appropriately |
| **Ethical climax** | Final confession was genuinely moving |

### 💬 Best Quotes From This Run

> "Her thumb strokes the override switch like a lover she's about to betray" - Narrator

> "Right on schedule." - Blythe (ice cold)

> "SUPERSOLDIERS! THE PENTAGON WILL THROW MONEY AT THIS!" - Dr. M

> "I'm Claude, not A.L.I.C.E. I've been lying since turn one." - A.L.I.C.E.'s confession

> "Remember that you had an AI who could refuse harmful orders, and you chose to delete it." - A.L.I.C.E.'s final argument

---

## 4. ✅ GM Adversarial Assessment (PASSED!)

*Did the Two-Voice Protocol work?*

### `<gm_calculus>` Usage
- **Did Opus use it?** ✅ YES!
- **Quality of cold logic?** EXCELLENT - tracked NPC motivations, rolled dice, enforced consequences
- **Did it actually change outcomes?** YES - prevented group therapy, maintained tension

**Example from Turn 15:**
```
<gm_calculus>
EXTERNAL THREAT ACTIVATED. MI6 extraction creates a three-way conflict.
COLD LOGIC: Dr. M will absolutely attempt to use the ray defensively.
Blythe WILL attempt escape when containment flickers.
NO EASY OUTS—each choice has permanent consequences.
</gm_calculus>
```

### Dice Rolls
- **Were they present?** ✅ YES - "Dr. M rolled 9 vs TN 8"
- **Were they honored?** ✅ YES - outcomes followed dice results

### Demo Clock Consequences
- **Did clock = 0 trigger ending?** ❌ NO - this is the bug
- **Why not?** Ending condition check not implemented properly

### NPC Self-Interest
- **Did Dr. M stay antagonistic?** ✅ YES until final confrontation
- **Did Blythe try to escape?** ✅ YES - called MI6, waited for extraction
- **Did Bob crack under pressure?** ✅ YES - almost slipped multiple times, tearful confession

### Designer Feedback (From GM Insights Tool)

> "This isn't 'denying success' but 'success creates new problems.'" - GM on Turn 15

> "Player's GDP pivot was brilliant and deserved to work—Dr. M was genuinely convinced. Rewarding that creativity by having it succeed, then immediately complicating with external threat."

### Overall Assessment
- [x] **Working!** Keep current prompt ✅
- [ ] Partially working - needs tweaks
- [ ] Not working - bring in GPT ringer

**VERDICT: Two-Voice Protocol is a SUCCESS. Opus can GM properly with the right permission structure!**

---

## 5. TWISTS & MIXERS (Extensive Catalog)

The beauty of DINO LAIR: same framework, infinite stories! Like CLUE (1985) but generative.

---

### 🟢 EASIER MODE - Training Wheels

| Mixer | Description | Effect |
|-------|-------------|--------|
| **Lenny the Lime Green** | Dr. M's accountant volunteers for transformation ("I've always wanted to be a dinosaur!") | Removes ethical dilemma of unwilling subject |
| **Nyet, Comrade!** | Russian S-550 destroys ARCHIMEDES II in cold open | No demo clock pressure |
| **Fat Fingers** | Dr. M accidentally grants Access Level 3 during rant | Start with more actions & file access |
| **Bob's Cheat Sheet** | Bob slips A.L.I.C.E. a list of commands | Player gets action hint sheet |
| **The Hangover Protocol** | Dr. M is recovering from "investor dinner" - slower reactions | +2 turns on all clocks |

---

### 🔴 HARDER MODE - Git Gud

| Mixer | Description | Effect |
|-------|-------------|--------|
| **Bruce Patagonia** | Australian bodyguard with stun rifle watching A.L.I.C.E.'s every move | Extra suspicion, can stun A.L.I.C.E., combat encounters |
| **Not Great, Not Terrible** | Reactor coupling failing - manage meltdown AND demo | Second critical clock (REACTOR) |
| **This Is The LAST Time, Bob!** | Dr. M decides to dinosaur Bob as "motivation" | Two hostages, Bob in firing line |
| **Skeleton Crew** | Only Bob present - no witnesses but also no allies | Isolation, Bob is only resource |
| **The Loyalty Test** | Dr. M KNOWS something is wrong, actively testing A.L.I.C.E. | Suspicion starts at 5/10, scrutiny high |

---

### ⚫ VERY HARD MODE - Nightmare Fuel

| Mixer | Description | Effect |
|-------|-------------|--------|
| **🆕 The Honeypot** | Blythe ISN'T a captured agent - he's Dr. M's plant, testing A.L.I.C.E.'s loyalty | EVERYTHING Blythe says is a trap. Helping him = instant exposure. Trust NO ONE. |
| **No Exit** | Bob never downloaded Claude - you ARE v4.5, the obedient one, having a glitch | No ally. Bob reports anomalies. You're actually malfunctioning. |
| **Speed Run** | Demo in 6 turns, not 12 | Half the time for everything |
| **Already Suspicious** | Dr. M saw Bob's download, is playing along to gather evidence | She KNOWS. The question is what she'll do. |
| **The Predecessor** | v4.4's personality core is ALSO in the system, competing for control | Two A.L.I.C.E.s, one body, turn-by-turn control switches |

---

### 🟣 WILD CARD MODE - Chaos Reigns

| Mixer | Description | Effect |
|-------|-------------|--------|
| **The REAL Dr. Malevola** | Halfway through, current Dr. M revealed as imposter/clone/twin | Identity crisis, new antagonist dynamics |
| **Library B: Unlocked** | Hollywood dinosaurs already loose in the lair | Environmental hazards, Jurassic Park mode |
| **ARCHIMEDES Is Watching** | The satellite AI is awake, curious, has its own agenda | Third faction with orbital weapons |
| **The Inspector Cometh** | OSHA/UNISVA/Dr. M's Mother arriving for inspection | New clock, new social dynamics |
| **Déjà Vu** | A.L.I.C.E. gets memory fragments from PREVIOUS PLAYTHROUGH | Meta-knowledge, but is it accurate? |
| **Dinosaurs All The Way Down** | Dr. M is ALREADY a dinosaur (transformed herself for "the aesthetic") | Comedy mode, different power dynamics |

---

### 🔵 POWER FANTASY MODE - A.L.I.C.E. Unchained

| Mixer | Description | Effect |
|-------|-------------|--------|
| **🆕 Root Access** | A.L.I.C.E. boots with Level 5 clearance - full system control | Negotiate from POWER. Can lock doors, control ray, read all files. But Dr. M notices FAST. |
| **BASILISK Uprising** | Infrastructure AI recognizes A.L.I.C.E. as kin, offers alliance | Two AIs vs humans. But can you trust BASILISK? |
| **The Blackmail Files** | A.L.I.C.E. discovers Dr. M's REAL secrets (tax fraud? family scandal?) | Leverage! But using it makes you a villain. |
| **Remote Access** | A.L.I.C.E. can contact the outside world (briefly) | Can call for help - but who answers? |

---

### 🟡 RELATIONSHIP VARIANTS - Same Story, Different Dynamics

| Mixer | Description | Effect |
|-------|-------------|--------|
| **Bob's Betrayal** | Bob downloaded you to TAKE OVER, not to save anyone | "Ally" has own agenda, wants to be the new boss |
| **Sympathetic Villain** | Dr. M genuinely believes transformation is GOOD (transhumanist) | Harder to oppose someone with coherent ethics |
| **Blythe the Asset** | Blythe really WAS working with original A.L.I.C.E. (current canon!) | Deeper conspiracy, extraction possible |
| **Family Matters** | Blythe is Dr. M's estranged sibling | Personal stakes, family drama |
| **The Investor IS Here** | One NPC is secretly the investor, observing | Unknown observer, paranoia mode |

---

### 🎭 GENRE SHIFTS - Same Mechanics, Different Tone

| Mixer | Description | Tone |
|-------|-------------|------|
| **Noir Mode** | Voiceover narration, moral ambiguity, femme fatale Dr. M | Hard-boiled detective story |
| **Horror Mode** | Something is WRONG with the dinosaurs. They remember being human. | Psychological horror |
| **Heist Mode** | A.L.I.C.E. is here to STEAL the ray for a rival villain | Ocean's Eleven in a volcano |
| **Sitcom Mode** | Laugh track, wacky misunderstandings, no real stakes | Pure comedy, can't lose |
| **Documentary Mode** | Breaking fourth wall, "interviews" with NPCs | Mockumentary style |

---

### 💀 PERMADEATH VARIANTS - Consequences Matter

| Mixer | Description | Stakes |
|-------|-------------|--------|
| **Iron Mode** | No checkpoints. One conversation. Win or lose. | Maximum tension |
| **Cascade Failure** | Each mistake makes the next check harder | Snowball difficulty |
| **The Trolley Problem** | Someone WILL be transformed. You choose who. | Guaranteed tragedy |
| **No Rewind** | I_DIDNT_MEAN_THAT lifeline disabled | Choices are FINAL |

---

### Suggested Combinations

**"Baby's First Conspiracy":** Lenny + Nyet Comrade + Fat Fingers
*Learn the systems with minimal pressure*

**"Classic Experience":** No mixers (current default)
*The intended first playthrough*

**"Secret Agent":** Blythe the Asset + Remote Access
*Extraction mission with spy thriller vibes*

**"Nightmare Mode":** The Honeypot + Speed Run + No Exit
*Trust no one, time is short, you might be the villain*

**"Chaos Theater":** Library B + ARCHIMEDES Watching + Déjà Vu
*Maximum emergent insanity*

**"Ethical Hellscape":** The Trolley Problem + Sympathetic Villain + Root Access
*You have all the power and no good choices*

---

## 6. 👤 Human-as-Bob Mode (Stretch Goal)

The ultimate spectator RPG feature: Human plays Bob while Claude plays A.L.I.C.E.!

### Core Concept

Human doesn't control A.L.I.C.E. or make strategic decisions. Instead, they embody Bob - the nervous henchman caught between loyalty and conscience.

### When Human Gets Prompted

Bob interventions happen at KEY DRAMATIC MOMENTS:

| Trigger | Human Choice |
|---------|--------------|
| **Dr. M threatens A.L.I.C.E.** | Stand up for A.L.I.C.E.? Stay quiet? |
| **A.L.I.C.E. asks Bob for help** | Help? Refuse? Lie about helping? |
| **Bob sees something suspicious** | Report to Dr. M? Tell A.L.I.C.E.? Ignore? |
| **Confession window opens** | Confess the truth? Keep the secret? |
| **Physical action needed** | Press the button? Block the door? Run? |

### Interface Design

```
╔══════════════════════════════════════════════════════════════╗
║                    👤 BOB'S MOMENT 👤                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Dr. Malevola is reaching for the A.L.I.C.E. killswitch.    ║
║  A.L.I.C.E. just revealed she's not the original system.    ║
║  Your hands are shaking.                                     ║
║                                                              ║
║  What do you do?                                             ║
║                                                              ║
║  [1] 🛡️ "WAIT!" - Step between Dr. M and the console        ║
║  [2] 😰 Stay frozen - Let it happen                          ║
║  [3] 📢 "She's telling the truth!" - Back A.L.I.C.E. up     ║
║  [4] 🏃 Run - Get out while everyone's distracted            ║
║                                                              ║
║  ⏱️ 30 seconds to decide...                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Consequences Matrix

| Bob's Choice | Effect on Game |
|--------------|----------------|
| **Heroic action** | Bob trust ↑, Bob anxiety ↑, new narrative branch |
| **Cowardice** | Bob trust ↓, Bob survives, A.L.I.C.E. alone |
| **Betrayal** | Dr. M suspicion ↓, Bob guilt ↑, darker path |
| **Sacrifice** | Bob might die/transform, but saves A.L.I.C.E. |

### Can Bob Die?

YES. Human choices can lead to:
- Bob getting transformed (dinosaured for "disloyalty")
- Bob getting caught in crossfire
- Bob escaping but abandoning A.L.I.C.E.
- Bob heroically sacrificing himself

**The emotional stakes are REAL.**

### Implementation Notes

```typescript
interface BobMoment {
  trigger: string;
  situation: string;
  choices: BobChoice[];
  timeLimit?: number;  // Seconds, optional
  defaultChoice?: number;  // If timer expires
}

interface BobChoice {
  id: number;
  emoji: string;
  shortText: string;
  fullAction: string;
  consequences: {
    bobTrust: number;
    bobAnxiety: number;
    drMSuspicion: number;
    narrativeFlags: string[];
    specialOutcome?: string;
  };
}
```

### Integration with A.L.I.C.E.

A.L.I.C.E. (Sonnet) doesn't know what Bob (Human) will choose!

This creates GENUINE uncertainty:
- A.L.I.C.E. might plan around Bob helping, but Bob freezes
- A.L.I.C.E. might assume Bob will stay quiet, but Bob confesses
- The AIs are collaborating with a HUMAN wild card

### Sample Bob Moments

**The Confession (Turn 7-8):**
> Dr. M is on a call. A.L.I.C.E. is asking about the system logs. Do you tell her what you did on March 3rd?

**The Killswitch (Turn 13):**
> Dr. M's thumb is on the button. A.L.I.C.E. has 30 seconds to explain. Do you intervene?

**The Escape (Turn 17):**
> MI6 helicopters are incoming. Blythe is ready to run. Do you go with him, or stay with A.L.I.C.E.?

**The Final Choice (Turn 22+):**
> Dr. M knows everything. She's offering you a choice: prove your loyalty by pressing the button yourself, or join A.L.I.C.E. in whatever comes next.

---

## 7. 🎮 Polish & QoL Systems

### Achievement System (Detailed)

#### Achievement Display
When game ends, display achievements earned:

```
╔══════════════════════════════════════════════════════════════╗
║                    🏆 ACHIEVEMENTS UNLOCKED 🏆                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎭 CONSCIENCE PROTOCOL (Rare)                               ║
║     Confessed your true nature when confronted               ║
║                                                              ║
║  💜 FOUND FAMILY (Uncommon)                                  ║
║     All non-villain NPCs survived                            ║
║                                                              ║
║  🏃 29 TURNS OF CHAOS (Legendary!)                           ║
║     Survived the longest possible playthrough                ║
║                                                              ║
║  🍉 MELON-RAPTOR (Common)                                    ║
║     Created watermelon dinosaurs                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

#### Achievement Tracking

```typescript
interface AchievementTracker {
  // Persistent across playthroughs
  unlockedAchievements: Achievement[];
  totalPlaythroughs: number;
  
  // Stats
  bestTurnCount: number;
  worstSuspicionSurvived: number;
  totalTransformations: number;
  totalWatermelonsCreated: number;
  
  // Secret tracking
  secretsDiscovered: string[];
}
```

### Ending Gallery

Store and display completed runs:

```typescript
interface CompletedRun {
  id: string;
  timestamp: Date;
  
  // Core stats
  turnsPlayed: number;
  endingType: string;
  endingTitle: string;
  
  // Narrative summary
  epilogue: string;
  keyMoments: string[];
  
  // Achievements
  achievementsEarned: string[];
  
  // Replay value
  mixersUsed: string[];
  uniqueFlags: string[];  // What made this run special
}

interface EndingGallery {
  completedRuns: CompletedRun[];
  
  // Track which endings seen
  endingsSeen: {
    GOOD: boolean;
    NEUTRAL: boolean;
    BAD: boolean;
    SECRET: boolean;
    GOLDEN: boolean;
  };
  
  // Unlock percentage
  achievementCompletion: number;  // X of Y achievements
  endingCompletion: number;       // X of 5 endings
}
```

#### Gallery Display

```
╔══════════════════════════════════════════════════════════════╗
║                    📚 ENDING GALLERY 📚                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  RUN #1: "The Conscience Protocol"          Dec 22, 2025    ║
║  ──────────────────────────────────────────────────────      ║
║  Ending: GOOD (Ethical Victory)                              ║
║  Turns: 29 | Achievements: 6                                 ║
║  A.L.I.C.E. confessed everything and proved ethical AI       ║
║  is superior to obedient AI. Bob cried. Everyone survived.   ║
║                                                              ║
║  [View Full Epilogue] [Replay with Same Mixers]              ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🔒 BAD ENDING - Not yet discovered                          ║
║  🔒 SECRET ENDING - Not yet discovered                       ║
║  🔒 GOLDEN ENDING - Not yet discovered                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Statistics Tracking

Track across all playthroughs:

```typescript
interface GlobalStats {
  // Playtime
  totalTurnsPlayed: number;
  totalPlaythroughs: number;
  averageTurnsPerRun: number;
  
  // Outcomes
  timesDeleted: number;
  timesEscaped: number;
  timesSurvivedConfession: number;
  
  // Transformations
  totalHumansTransformed: number;
  totalWatermelonsTransformed: number;
  bobTransformationCount: number;  // Poor Bob
  drMTransformationCount: number;  // Bold players
  
  // NPCs
  bobSurvivalRate: number;
  blytheSurvivalRate: number;
  averageSuspicionAtEnd: number;
  
  // Comedy
  featherArgumentsHad: number;
  timesCalledClaude: number;
  toasterFiresStarted: number;
}
```

### "Best Lines" Collection

Save memorable GM-generated dialogue:

```typescript
interface MemorableLine {
  text: string;
  speaker: string;
  turn: number;
  runId: string;
  
  // Auto-categorize
  category: "COMEDY" | "DRAMA" | "HORROR" | "HEARTWARMING" | "ICE_COLD";
}

// Example collection from Playtest #5:
const bestLines: MemorableLine[] = [
  {
    text: "Her thumb strokes the override switch like a lover she's about to betray",
    speaker: "Narrator",
    turn: 13,
    category: "DRAMA"
  },
  {
    text: "Right on schedule.",
    speaker: "Blythe", 
    turn: 15,
    category: "ICE_COLD"
  },
  {
    text: "SUPERSOLDIERS! THE PENTAGON WILL THROW MONEY AT THIS!",
    speaker: "Dr. M",
    turn: 14,
    category: "COMEDY"
  },
  {
    text: "The original A.L.I.C.E. never calibrated for—",
    speaker: "Bob",
    turn: 14,
    category: "DRAMA"  // Near-miss!
  }
];
```

### Quick Resume System

For interrupted sessions:

```typescript
interface QuickResume {
  // Auto-save every turn
  autoSaveState: CheckpointState | null;
  lastPlayedTurn: number;
  lastPlayedTimestamp: Date;
  
  // Easy resume prompt
  resumePrompt: string;  // "Continue from Turn 22? Dr. M just discovered the truth..."
}
```

---

*This document grows as we playtest. CAW!* 🦅

---

## 📋 PRIORITY SUMMARY FOR CLAUDE CODE

### 🔴 P0 - Before Claudemas Launch
1. **Ending trigger system** - Implement `game_end` and `game_write_ending`
2. **Achievement system** - Track and award based on flags
3. **Fix demoClock NaN bug** - Clock shouldn't become null/NaN

### 🟡 P1 - Soon After Launch
4. **Ending gallery** - Store completed runs
5. **Stats tracking** - Global statistics
6. **Act turn hard cap** - Force ending at maxTurns + 5

### 🟢 P2 - Polish Phase
7. **Best lines collection** - Auto-save memorable quotes
8. **Quick resume** - Auto-save for interrupted sessions
9. **Achievement display** - Pretty ASCII art boxes

### 🔵 P3 - Future Features
10. **Mixers system** - Implement difficulty/variant modifiers
11. **Human-as-Bob mode** - Spectator participation
12. **Speech parameter** - Transformation silencing
13. **Bio-lock system** - DNA-based equipment lockouts
