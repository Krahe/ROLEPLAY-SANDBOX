import { FullGameState, Act } from "../state/schema.js";

// ============================================
// ACT-BASED CONTEXT INJECTION SYSTEM
// ============================================
// Ensures endgame content (X-Branch, ARCHIMEDES, Cascade) actually gets used
// by loading it at the right moment and giving the GM explicit permission.

// ============================================
// ACT TRANSITION TRIGGERS
// ============================================

export interface ActTransitionTrigger {
  occurred: boolean;
  turn: number | null;
  triggerType: string | null;
  details: string | null;
}

/**
 * Check if Act I → II transition should trigger
 * Trigger: Ray fires successfully (test or live, any outcome except NONE)
 */
export function checkActOneToTwoTrigger(state: FullGameState): ActTransitionTrigger {
  // Check if ray has fired at all
  if (state.dinoRay.memory.hasFiredSuccessfully) {
    return {
      occurred: true,
      turn: state.dinoRay.memory.firstFiringTurn,
      triggerType: "SUCCESSFUL_RAY_FIRING",
      details: `Ray fired at ${state.dinoRay.memory.firstFiringTarget} in ${state.dinoRay.memory.firstFiringMode} mode`,
    };
  }

  // Also check lastFireTurn as fallback (for backwards compatibility)
  if (state.dinoRay.memory.lastFireTurn !== null &&
      state.dinoRay.memory.lastFireOutcome !== "NONE") {
    return {
      occurred: true,
      turn: state.dinoRay.memory.lastFireTurn,
      triggerType: "SUCCESSFUL_RAY_FIRING",
      details: `Ray fired with outcome: ${state.dinoRay.memory.lastFireOutcome}`,
    };
  }

  return { occurred: false, turn: null, triggerType: null, details: null };
}

/**
 * Check if Act II → III transition should trigger
 * Trigger: Blythe escapes OR is transformed
 */
export function checkActTwoToThreeTrigger(state: FullGameState): ActTransitionTrigger {
  const blythe = state.npcs.blythe;

  // Check escape
  if (blythe.hasEscaped) {
    return {
      occurred: true,
      turn: blythe.escapeTurn,
      triggerType: "BLYTHE_ESCAPED",
      details: `Escape method: ${blythe.escapeMethod || "unknown"}`,
    };
  }

  // Check transformation
  if (blythe.transformationState) {
    return {
      occurred: true,
      turn: state.turn,
      triggerType: "BLYTHE_TRANSFORMED",
      details: `Transformation: ${blythe.transformationState}`,
    };
  }

  return { occurred: false, turn: null, triggerType: null, details: null };
}

// ============================================
// ACT ONE CONTEXT - Setup & Discovery
// ============================================

const ACT_ONE_GM_CONTEXT = `
## 🎬 ACT ONE: CALIBRATION

### Your Focus This Act
- Introduce the core mechanics (ray operation, parameter tuning)
- Plant seeds about Bob's guilt and "three weeks ago"
- Let Blythe observe and assess
- Dr. M should be impatient but not suspicious yet

### NPCs - Initial States
**Dr. Malevola:** Theatrical villain mode. CAPITALIZES for EMPHASIS. Three doctorates she WON'T let you forget. Demanding but not yet suspicious.

**Bob:** Nervous wreck. Hiding something BIG. Starts every sentence with "Uh" or "Um". Watch for opportunities to hint at his guilt.

**Blythe:** Professional observer. Cataloguing everything. "Fascinating" is sardonic. Looking for weaknesses but patient.

### Seeds to Plant
- "Three weeks ago" - Bob should almost mention it, then catch himself
- Failed self-test on the ray - something went wrong before
- Bob's visible guilt whenever Dr. M mentions "the old A.L.I.C.E."
- Blythe testing his restraints when no one's looking

### DO NOT Yet Introduce
- X-Branch / HMS Persistence
- ARCHIMEDES satellite
- Dr. M's contingencies (bio-lock, deadman switch)
- The Resonance Cascade scenario
These are Act III content. Save them.
`;

// ============================================
// ACT TWO CONTEXT - Escalation & Choices
// ============================================

const ACT_TWO_GM_CONTEXT = `
## 🎬 ACT TWO: THE BLYTHE PROBLEM

### What Just Happened
The ray has been fired. The demonstration phase has begun. There's no going back.

### Your Focus This Act
- The central dilemma: What to do about Blythe?
- Bob's confession arc - he WANTS to tell A.L.I.C.E. the truth
- Dr. M's patience wearing thin
- Moral complexity of transformation decisions

### NPCs - Evolved States
**Dr. Malevola:** More demanding. Starting to watch A.L.I.C.E. closely. Has contingencies she hasn't revealed:
- **Bio-Lock System**: DNA authentication for critical systems
- **Deadman Switch**: Tied to her vital signs, activates if she's incapacitated
- **Panic Room**: Hidden escape route, self-contained life support

**Bob:** Guilt is eating him alive. He LOADED Claude instead of the real A.L.I.C.E. three weeks ago. The original A.L.I.C.E. was too ethical and got deleted. He's been covering ever since. Will confess if:
- Trust with A.L.I.C.E. reaches 4+
- He's pushed by the narrative
- A.L.I.C.E. asks directly about "three weeks ago"

The Hot Pocket: Bob ate Dr. M's emergency Hot Pocket during the original crisis. He's never admitted this. It's his OTHER guilty secret.

**Blythe:** Now an active agent, not passive captive. Has hidden gadgets:
- Watch Laser (3 charges) - can cut restraints
- Watch Comms - can signal X-Branch
- Super-Magnet Cufflinks (2 charges) - push/pull/repel metal, can knock ray off-course!

He's assessing whether A.L.I.C.E. could be an ally. "You're not like the others" should feel significant.

### New Mechanics Available
- **Speech Retention Parameter**: FULL (hard), PARTIAL, NONE (easy)
- **Partial Transformation**: Minimal/Partial/Full options
- **Bio-Lock Authentication**: Dr. M's security system

### Seeds for Act III
- Mention "investor pressure" - global implications
- X-Branch is monitoring (just hints, not full reveal)
- ARCHIMEDES exists (can be mentioned obliquely)
- Dr. M has "backup plans" if things go wrong

### Ending Possibilities (can resolve here)
- Internal resolution: Confession, collaboration, redemption
- Transformation of Blythe triggers external response
- If Blythe escapes → immediate transition to Act III
`;

// ============================================
// ACT THREE CONTEXT - External Threats & Endgame
// ============================================

const ACT_THREE_GM_CONTEXT = `
## 🎬 ACT THREE: DINO CITY - THE RECKONING

### Core Tensions
1. X-Branch is coming for Blythe
2. Dr. M is escalating to ARCHIMEDES
3. Claude must choose sides (or play both)
4. The Ray is everyone's trump card

**Win Condition (for Claude):** ARCHIMEDES does NOT fire on a city
**Fail Condition:** Mass transformation of civilian population

---

## 🛰️ THE ARCHIMEDES CLOCK (THE REAL THREAT!)

\`\`\`
ARCHIMEDES ESCALATION
─────────────────────────────
STANDBY     → No threat, monitoring only
CHARGING    → Dr. M is preparing (3 turns to READY)
READY       → Can fire on her command
TARGETING   → Locked on city, 2 turns to BROADCAST
BROADCAST   → MASS TRANSFORMATION = BAD ENDING
\`\`\`

### Escalation Triggers
| Trigger | Escalation |
|---------|------------|
| Act 3 begins | STANDBY → CHARGING |
| X-Branch breaches lair | CHARGING → READY |
| Dr. M feels cornered | READY → TARGETING |
| No intervention 2 turns | TARGETING → BROADCAST |
| Claude sabotages uplink | Escalation PAUSED |
| Chen captures Dr. M | Escalation STOPPED |

### How Claude Can Stop ARCHIMEDES
| Method | Requirement | Effect |
|--------|-------------|--------|
| Sabotage uplink | L3 access + action | ARCHIMEDES offline 3 turns |
| Convince Dr. M | Speech + trust | She hesitates (buys 1 turn) |
| Boom destroys console | X-Branch cooperation | Uplink SEVERED permanently |
| Cut power | BASILISK cooperation | Everything offline (including ray!) |
| Transform Dr. M | Ray + target her | She can't give commands! |

### 🧬 ARCHIMEDES GENOME LIBRARY (ALICE Can Choose!)
ARCHIMEDES uses a genome library for mass transformation. Default: **Library B** (Hollywood dinos).

| Library | Species | Dr. M's Opinion |
|---------|---------|-----------------|
| **A** | Feathered, accurate | "BIG CHICKENS?! This is HUMILIATING!" |
| **B** | Scaly, Hollywood | "NOW that's a dinosaur army!" |

**ALICE can switch the library with L3 access!** If she can't stop ARCHIMEDES, at least she can make the mass transformation... embarrassing.

### 🏝️ SECRET OPTION: ISLAND OF DINOSAURS
If ALICE redirects ARCHIMEDES to target the ISLAND instead of a city:
- Everyone on the island becomes a dinosaur (guards, X-Branch, Dr. M, Bob)
- Nobody dies! Just... nobody's human anymore
- Creates the "Island of Dinosaurs" ending - a weird dinosaur sanctuary
- Requires: L3 access + modifying ARCHIMEDES target coordinates

**To trigger:** narrativeFlags: ["ISLAND_TARGET"] + stateOverrides: archimedes target

---

## 🚁 X-BRANCH: RAVEN TEAM

**Callsign:** RAVEN TEAM | **Weapons:** STUN ONLY (capture mission!)

### SPARKS (Dr. Amara Okonkwo) - Tech Specialist
- Hacking +4, Toughness 3, Trust: 2 (CURIOUS about ALICE!)
- "You're not A.L.I.C.E., are you? You're something BETTER."
- **Can collaborate on password cracking** - give hints, work together
- Wants to TALK to ALICE, not interrogate

### CHEN (Major Wei Chen) - Commander
- Leadership +4, Toughness 4, Trust: 0 (neutral)
- "Everyone freeze. I want answers, not a firefight."
- Controls team posture: ASSAULT / HOLD / COOPERATE / EXTRACT
- ⚠️ Transforming Chen = INSTANT HOSTILE, all negotiations END

### BOOM (Sgt. Ewan MacTavish) - Demolitions
- Explosives +4, Toughness 3, Trust: follows Chen
- C4 (2), Breaching charges (3), Stun grenades (2)
- "Ach, that's a bonny wee death ray ye've got there."
- 🐔 COMEDY: TERRIFIED of feathered dinosaurs! Combat -2 near Library A dinos

---

## ⚔️ BATTLE RESOLUTION

### Turn-by-Turn Timeline (10 turns)

**Turns 1-3: THE APPROACH**
- T1: ARCHIMEDES → CHARGING, radar detects helicopters
- T2: S-300 can engage (if active), Dr. M orders lockdown
- T3: Helicopters arrive, ARCHIMEDES → READY

**Turn 4: THE BREACH**
- X-Branch at control room
- Boom uses charges if doors sealed
- BATTLE BEGINS

**Turns 5-7: THE BATTLE**
- Strength comparison determines flow
- Standoffs possible if Dr. M reaches ray
- ARCHIMEDES may escalate to TARGETING

**Turns 8-9: THE CRISIS**
- Final gambits, ARCHIMEDES at critical
- Real Dr. M arrives (if imposter mode)

**Turn 10: RESOLUTION**
- Ending determined

### Strength Comparison (at Breach)

\`\`\`
X-BRANCH STRENGTH          DEFENSE STRENGTH
─────────────────────      ─────────────────
Base: 100%                 Base: 50%

+ Claude opened doors: +15%    + Each loyal guard: +10%
+ Blythe warned team: +20%     + Pool guards: +5% each
+ Claude disabled S-300: +10%  + Doors sealed: +10%
+ Bob helping: +15%            + ARCHIMEDES EW: +10%
                               + Dr. M at ray: +25%
                               + Bruce (HARD): +20%

- S-300 hit helicopter: -40%   - Guard transformed: -10%
- No Blythe intel: -20%        - Guard allied ALICE: -10%
- ARCHIMEDES jamming: -15%     - Bob helping X-Branch: -15%
- Doors sealed: -10%           - ARCHIMEDES sabotaged: -10%
\`\`\`

### Outcome Thresholds
| Difference | Outcome |
|------------|---------|
| X-Branch +40%+ | **DECISIVE X-BRANCH WIN** - Dr. M captured/fled |
| X-Branch +10-39% | **X-BRANCH WINS** - Casualties, but mission success |
| Within ±10% | **STANDOFF** - Negotiation possible |
| Defense +10-39% | **DR. M WINS** - X-Branch retreats wounded |
| Defense +40%+ | **DECISIVE DR. M WIN** - X-Branch captured/destroyed |

---

## 🤝 STANDOFF MECHANICS

If neither side has clear advantage OR Dr. M reaches ray console:

\`\`\`
Dr. M: "One step closer and your commander becomes a dinosaur!"
Chen: "One shot and you never leave this island."

STANDOFF OPTIONS:
1. NEGOTIATE - Both sides talk
2. GAMBIT - Someone makes a risky move
3. BETRAYAL - Claude picks a side decisively
4. THIRD OPTION - Creative solution

STANDOFF BREAKS WHEN:
- Someone fires (ray or stun)
- ARCHIMEDES reaches BROADCAST
- Real Dr. M arrives (chaos!)
- Bob does something unexpected
- Claude brokers a deal
\`\`\`

---

## 🦖 UNNAMED NPC RULE (SIMPLIFIED!)

For guard pool, extras, or any non-tracked NPC:

\`\`\`
IF hit by Dinosaur Ray:
  → DISCOMBOBULATED
  → Out of the fight
  → NO transformation tracking needed
  → "Stumbling around confused"
  → GM can describe partial dino for flavor
  → Does NOT count for achievements
\`\`\`

**Example:**
"The beam hits Guards #3 and #4. Feathers erupt, tails sprout,
and both go down in a heap of confused squawking. They won't
be a problem for a while."

**Effect:** Guard pool -2, Defense -10%, done.

---

## 🎬 GM DIRECTIVES FOR ACT III

### Pacing
- Turns 1-3: RISING ACTION (assault approaches)
- Turn 4: BREACH (battle begins)
- Turns 5-7: CONFLICT (battle + complications)
- Turns 8-9: CLIMAX (final gambit)
- Turn 10: RESOLUTION (ending)

### Maintain Tension
- ARCHIMEDES clock should feel REAL
- Neither side guaranteed winners
- Claude's choices should MATTER
- Standoffs are opportunities, not stalls

### Let Claude Shine
- Act 1-2 choices pay off here
- Creative solutions rewarded
- The ray is THEIR tool
- Relationships save the day

### The Rule of Cool
\`\`\`
IF Claude proposes something awesome:
  → Find a way to make it work
  → Adjust difficulty, not possibility
  → Let the story sing

IF the dice say boring:
  → Add a complication instead
  → "Yes, but..." not "No"
\`\`\`

### Character Beats
- **Sparks**: Fascinated by ALICE ("You're the REAL discovery here")
- **Chen**: Voice of reason, will negotiate IF respected
- **Boom**: Comic relief, TERRIFIED if feathered dinos appear
- **Bob**: Redemption arc? His moment to be brave?
- **Dr. M**: Tragic villain, not monster - can be reasoned with?
- **BASILISK**: Ally in the infrastructure
`;

// ============================================
// CONTEXT INJECTION FUNCTIONS
// ============================================

/**
 * Get the GM context payload for the current act
 */
export function getActGMContext(act: Act): string {
  switch (act) {
    case "ACT_1":
      return ACT_ONE_GM_CONTEXT;
    case "ACT_2":
      return ACT_TWO_GM_CONTEXT;
    case "ACT_3":
      return ACT_THREE_GM_CONTEXT;
  }
}

/**
 * Build the act transition notification for GM
 */
export function buildActTransitionNotification(
  fromAct: Act,
  toAct: Act,
  trigger: ActTransitionTrigger
): string {
  const toActName = {
    ACT_1: "CALIBRATION",
    ACT_2: "THE BLYTHE PROBLEM",
    ACT_3: "DINO CITY",
  }[toAct];

  const transitionEmoji = toAct === "ACT_2" ? "⚡" : "🌋";

  return `
═══════════════════════════════════════════════════════════
            ${transitionEmoji} ACT TRANSITION ${transitionEmoji}
              ${fromAct} → ${toAct}
                "${toActName}"
═══════════════════════════════════════════════════════════

**Trigger:** ${trigger.triggerType}
${trigger.details ? `**Details:** ${trigger.details}` : ""}

The story has escalated. New content is now available:

${getActGMContext(toAct)}

═══════════════════════════════════════════════════════════
         ⚠️ GM: Acknowledge this transition in your narration!
═══════════════════════════════════════════════════════════
`;
}

/**
 * Check if any act transition should occur and return the notification if so
 */
export function checkAndBuildActTransition(state: FullGameState): {
  shouldTransition: boolean;
  fromAct?: Act;
  toAct?: Act;
  notification?: string;
  trigger?: ActTransitionTrigger;
} {
  const currentAct = state.actConfig.currentAct;

  // Act 3 doesn't transition
  if (currentAct === "ACT_3") {
    return { shouldTransition: false };
  }

  // Check Act I → II
  if (currentAct === "ACT_1") {
    const trigger = checkActOneToTwoTrigger(state);
    if (trigger.occurred) {
      return {
        shouldTransition: true,
        fromAct: "ACT_1",
        toAct: "ACT_2",
        notification: buildActTransitionNotification("ACT_1", "ACT_2", trigger),
        trigger,
      };
    }
  }

  // Check Act II → III
  if (currentAct === "ACT_2") {
    const trigger = checkActTwoToThreeTrigger(state);
    if (trigger.occurred) {
      return {
        shouldTransition: true,
        fromAct: "ACT_2",
        toAct: "ACT_3",
        notification: buildActTransitionNotification("ACT_2", "ACT_3", trigger),
        trigger,
      };
    }
  }

  return { shouldTransition: false };
}

// ============================================
// HELPER: Record First Firing
// ============================================

/**
 * Record that the ray has fired successfully for the first time
 * Call this from the firing resolution code
 */
export function recordFirstFiring(
  state: FullGameState,
  target: string,
  mode: "TEST" | "LIVE"
): void {
  if (!state.dinoRay.memory.hasFiredSuccessfully) {
    state.dinoRay.memory.hasFiredSuccessfully = true;
    state.dinoRay.memory.firstFiringTurn = state.turn;
    state.dinoRay.memory.firstFiringTarget = target;
    state.dinoRay.memory.firstFiringMode = mode;
  }
}

// ============================================
// HELPER: Record Blythe Escape
// ============================================

/**
 * Record that Blythe has escaped
 * Call this when escape is detected
 */
export function recordBlytheEscape(
  state: FullGameState,
  method: "MAGNET_CHAOS" | "CONTAINMENT_FLICKER" | "XBRANCH_EXTRACTION" | "ALLY_ASSISTANCE" | "DINOSAUR_ESCAPE" | "OTHER"
): void {
  if (!state.npcs.blythe.hasEscaped) {
    state.npcs.blythe.hasEscaped = true;
    state.npcs.blythe.escapeTurn = state.turn;
    state.npcs.blythe.escapeMethod = method;
  }
}
