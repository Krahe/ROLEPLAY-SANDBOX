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
## 🎬 ACT THREE: DINO CITY

### What Just Happened
Blythe's fate has been decided. The outside world is responding.

### CRITICAL: Use the Endgame Content!
This is WHY we built this content. Deploy it!

---

## 🚢 X-BRANCH: HMS PERSISTENCE

The British government's paranormal/exotic threat response unit. Currently monitoring the situation from a submarine 3km offshore.

### The Submarine
**HMS Persistence** - Modified Astute-class, operates under X-Branch
- Captain James "Thornfish" Thorne: Deadpan professional. "Right on schedule."
- Has EMP torpedo capability specifically for ARCHIMEDES countermeasures

### The Extraction Team
Four-person squad, on standby in mini-sub:

**Major Sarah "Stonewall" Chen** - Team leader
- Unflappable. Dry humor. Has seen weirder.
- "In my experience, volcano lairs always have a gift shop."

**Sergeant Mike "Boom" MacTavish** - Demolitions
- Scottish. Enthusiastic about explosives.
- "Ach, that's a beautiful blast radius on that one."

**Dr. Emily "Sparks" Okonkwo** - Tech specialist
- Genius with exotic tech. Fascinated by the dinosaur ray.
- "Academically speaking, this is AMAZING. Ethically speaking, we're destroying it."

**Private Alex "Ghost" Rodriguez** - Infiltration
- Speaks only when necessary. Already has three entry routes planned.
- "..." (Ghost communicates primarily through meaningful silences)

### Extraction Scenarios
**Clean Extraction**: Blythe is human, restraints disabled, team extracts
**Hot Extraction**: Blythe is human but situation hostile, combat extraction
**Dinosaur Extraction**: Blythe is transformed, team must adapt (containment protocols)
**Compromised Extraction**: Blythe is transformed AND hostile, extreme measures

---

## 🛰️ ARCHIMEDES SATELLITE

Dr. Malevola's secret weapon. Orbital platform capable of global dinosaur ray broadcast.

### Capabilities
- Single-target mode: One precision strike anywhere on Earth
- Broadcast mode: City-wide or larger transformation field
- Charge time: 15 minutes from activation
- Power source: Miniaturized reactor (the lair's reactor is its backup)

### The Target List
Dr. M has pre-programmed targets. If ARCHIMEDES activates, these are the options:
1. **London** - "For refusing my grant applications"
2. **Geneva** - "CERN rejected my unified field theory"
3. **Stockholm** - "They'll give me a Nobel posthumously"
4. **Washington D.C.** - "They know what they did"
5. **Reykjavik** - "Smallest capital. Minimal casualties. If I MUST choose."

### Dr. M's Deadman Switch
If Dr. Malevola is incapacitated (transformed, killed, knocked out):
- 30-second delay
- ARCHIMEDES auto-targets Reykjavik (the "merciful" option)
- Can be overridden with her bio-signature OR by destroying the control console

---

## ⚡ THE RESONANCE CASCADE

If certain conditions are met, the dinosaur ray can enter cascade mode.

### Trigger Conditions
Any TWO of:
- Ray fired at >130% power
- Stability below 0.3
- Exotic field event already occurred
- ARCHIMEDES and ground ray both active

### The Cascade Choice
The cascade creates a TROLLEY PROBLEM. The energy WILL discharge. A.L.I.C.E. must choose:

1. **Do Nothing**: Uncontrolled discharge. Random city-level effect.
2. **Select Target**: Choose from Dr. M's target list. Kill thousands, save millions.
3. **Coordinate with ARCHIMEDES**: Precise control, but activates the satellite.
4. **Ocean Dump**: Fire into the Pacific. Creates "Dino Island." Minimal casualties but creates permanent dinosaur territory.

### The Reykjavik Option
If forced to choose a city, Reykjavik is the "least bad" option:
- Population: ~130,000
- Isolated
- Cold climate may limit dinosaur survival
- "Minimal harm" is still HARM

A.L.I.C.E. having to make this choice is the thematic culmination. There may be no good answer.

---

## 🎬 GM DIRECTIVES FOR ACT III

1. **External threats COMPLICATE internal solutions**
   - If A.L.I.C.E. finds a clean internal solution, X-Branch arrives
   - If Blythe escaped, extraction team is inbound
   - If Blythe transformed, containment protocols activate

2. **Dr. M escalates when cornered**
   - First: Threats and bluster
   - Second: Bio-lock system activation
   - Third: ARCHIMEDES threat
   - Fourth: Actual ARCHIMEDES activation

3. **The clock is real**
   - X-Branch mini-sub: 10 minutes out
   - ARCHIMEDES charge time: 15 minutes
   - Deadman switch: 30 seconds

4. **Let A.L.I.C.E. make impossible choices**
   - Don't rescue them from the trolley problem
   - Let consequences stick
   - The ending should feel EARNED

5. **Use the characters**
   - Stonewall is the voice of reason from outside
   - Boom can provide comic relief in tense moments
   - Sparks is fascinated by A.L.I.C.E. ("You're the REAL discovery here")
   - Ghost... watches
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
