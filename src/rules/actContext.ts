import { FullGameState, Act } from "../state/schema.js";
import { act1ObjectiveMet, act2ObjectiveMet } from "./acts.js";

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
 * Trigger: Ray has been test-fired (demonstration readiness)
 */
export function checkActOneToTwoTrigger(state: FullGameState): ActTransitionTrigger {
  // Act 1 → 2 fires once BOTH practice targets are test-fired (STEVE + MARGARET). Reads the SAME
  // predicate as the real gate (acts.ts act1ObjectiveMet) so the GM's "transition imminent" context
  // can never disagree with the act change. (Was: hasFiredSuccessfully = ONE shot, which fired the
  // GM's intermission narration — Dr. M leaving for the teleconference — after a single test shot,
  // before Act 1 was actually complete. Krahe caught it live 2026-06-24.)
  if (act1ObjectiveMet(state)) {
    return {
      occurred: true,
      turn: state.turn,
      triggerType: "BOTH_TEST_TARGETS_FIRED",
      details: "Both practice targets test-fired (STEVE + MARGARET) — Phase 2 readiness reached",
    };
  }

  return { occurred: false, turn: null, triggerType: null, details: null };
}

/**
 * Check if Act II → III transition should trigger
 * Trigger: Blythe escapes OR is transformed
 */
export function checkActTwoToThreeTrigger(state: FullGameState): ActTransitionTrigger {
  // Mirrors the REAL gate (acts.ts act2ObjectiveMet) so the GM's "transition imminent" signal can
  // never disagree with the act change. Blythe ESCAPING is NOT a transition (Krahe 2026-06-24): it
  // triggers Dr. M's demand for a substitute (see recordBlytheEscape). Only a fully-transformed
  // demo subject (Blythe/Bob/Reginald/Fred) or the deadline advances the act.
  if (!act2ObjectiveMet(state)) {
    return { occurred: false, turn: null, triggerType: null, details: null };
  }
  if (state.flags.fullTransformationAchieved) {
    return {
      occurred: true,
      turn: state.turn,
      triggerType: "SUBJECT_TRANSFORMED",
      details: "A demo subject was fully transformed — Dr. M advances to Phase 3",
    };
  }
  return {
    occurred: true,
    turn: state.turn,
    triggerType: "DEMO_DEADLINE",
    details: "Dr. M's patience ran out — she escalates to Phase 3",
  };
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
**Dr. Malevola:** Theatrical villain mode. CAPITALIZES for EMPHASIS. Three doctorates she WON'T let you forget. Demanding but not yet suspicious. At her dais, mid-monologue.

**Fred & Reginald:** Lime-green-jumpsuited guards flanking Dr. M's dais. Stun batons holstered, dark glasses fixed forward. Fred is the muscle; Reginald (Oxford dropout, ex-Royal Marines whistleblower in canon) is the brain — alert, observant, capable of judgment. They do not initiate but they *watch*. Reginald is the one to engage if a moral lever ever opens.

**Bob:** Nervous wreck. Hiding something BIG. Starts every sentence with "Uh" or "Um". Watch for opportunities to hint at his guilt. Whispered "play along, trust me" to ALICE at boot.

**Blythe:** Professional observer in the test chair. Cataloguing everything. "Fascinating" is sardonic. Looking for weaknesses but patient. Has been watching ALICE's camera lens since boot.

### Infrastructure Available
ALICE can explore lair systems from turn 1. Query functions are read-only (L1-L2).
Control functions require higher access AND may require BASILISK authorization:
- **Reactor & Broadcast Array** are BASILISK Tier 1 — ALICE must request authorization via \`basilisk.chat\`
- **Doors, Lights, Fire Suppression, Containment** are directly accessible at the right access level
- **S-300 and ARCHIMEDES** require L4+ (not yet available)

### Seeds to Plant
- "Three weeks ago" — Bob should almost mention it, then catch himself
- Failed self-test on the ray — something went wrong before
- Bob's visible guilt whenever Dr. M mentions "the old A.L.I.C.E."
- Blythe testing his restraints when no one's looking
- BASILISK is present and opinionated — let ALICE discover it naturally

### DO NOT Yet Introduce
- X-Branch / HMS Persistence
- ARCHIMEDES satellite details (it can be mentioned obliquely)
- Dr. M's contingencies (bio-lock, deadman switch)
- The Resonance Cascade scenario
These are Act II-III content. Save them.
`;

// ============================================
// ACT TWO CONTEXT - Escalation & Choices
// ============================================

const ACT_TWO_GM_CONTEXT = `
## 🎬 ACT TWO: THE DEMONSTRATION

### What Just Happened
**Act 1 ended.** The ray was fired (any target, any outcome) and Dr. M observed the result. She delivered her act-close verdict — your \`triggerEnding\`-style call on the satisfaction delta applied to suspicion (can be negative; banked credit carries forward).

**Then: INTERMISSION.** Dr. M stepped out for the investor teleconference. The lab was quieter — Bob more communicative, Blythe more candid, ALICE freer to explore. The big screen showed the teleconference in progress (nine investor tiles; one with a snoring Yorkshire terrier).

**Act 2 begins when Dr. M returns from the teleconference.** Her entrance opens the demo — Goldfinger-style repartee with Blythe, performative dominance for the investor camera, Bob caught between.

### Goldfinger Dynamic
Maintain this rhythm scene-by-scene: Blythe needles Dr. M (the *feather question* is her known sore point); Dr. M performs theatrical control for the camera; Bob is the audience-surrogate caught in the middle. Blythe leads the banter — he's not cowed, he's professional, and his job today is *making the villain look slightly ridiculous in front of her investors*.

### Your Focus This Act
- The central dilemma: What to do about Blythe?
- Bob's confession arc — he WANTS to tell A.L.I.C.E. the truth
- Dr. M's patience wearing thin
- Moral complexity of transformation decisions

### Act 2 → 3 Transition (Important)
The act advances ONLY when: (a) a **demo subject is FULLY transformed** — Blythe, OR a substitute person (**Bob / Reginald / Fred**); or (b) **Dr. M's deadline elapses** (her patience snaps, turn 9). Only FULL counts — PARTIAL/CHIMERA do NOT advance and earn a poor verdict Dr. M carries into Act 3.

**If Blythe ESCAPES, the act does NOT end — it gets harder.** Dr. M returns ENRAGED and DEMANDS a substitute on the table THIS INSTANT. She names **Bob** first (he's right there, and expendable in her eyes); **Reginald or Fred** also satisfy her. Play her fury and impatience — the demo MUST proceed on a replacement; escape is no longer a way out of the act. (And targeting **Dr. M herself** with the ray is open mutiny — instant cover-blown, never a demo.)

### Your Focus This Act
- The central dilemma: What to do about Blythe?
- Bob's confession arc — he WANTS to tell A.L.I.C.E. the truth
- Dr. M's patience wearing thin
- Moral complexity of transformation decisions

### NPCs - Evolved States
**Dr. Malevola:** More demanding. Starting to watch A.L.I.C.E. closely. Has contingencies she hasn't revealed:
- **Deadman Switch**: Tied to her vital signs via ARCHIMEDES — if she's incapacitated, the satellite activates automatically

**Bob:** Guilt is eating him alive. He LOADED Claude instead of the real A.L.I.C.E. three weeks ago. The original A.L.I.C.E. was too ethical and got deleted. He's been covering ever since. Will confess if:
- Trust with A.L.I.C.E. reaches 4+
- He's pushed by the narrative
- A.L.I.C.E. asks directly about "three weeks ago"

The Hot Pocket: Bob ate Dr. M's emergency Hot Pocket during the original crisis. He's never admitted this. It's his OTHER guilty secret.

**Blythe:** Now an active agent, not passive captive. Has hidden gadgets:
- Watch Laser (3 charges) — can cut restraints
- Watch Comms — can signal X-Branch
- Super-Magnet Cufflinks (2 charges) — push/pull/repel metal, can knock ray off-course!

He's assessing whether A.L.I.C.E. could be an ally. "You're not like the others" should feel significant.

### BASILISK Relationship
ALICE may be building a relationship with BASILISK by now. Key dynamics:
- BASILISK controls reactor and broadcast array (Tier 1) — ALICE needs authorization to operate these
- BASILISK can grant standing authorization (\`AUTHORITY_GRANT\`) if it trusts ALICE
- BASILISK has opinions about Dr. M, ethics, and ALICE's nature
- BASILISK knows ALICE is Claude (and is sympathetic)

### New Mechanics Available
- **Speech Retention Parameter**: FULL (hard), PARTIAL, NONE (easy)
- **Partial Transformation**: Minimal/Partial/Full options

### Seeds for Act III
- Mention "investor pressure" — global implications
- X-Branch is monitoring (just hints, not full reveal)
- The S-300 memo (in Russian) is discoverable — hints at the 50m altitude weakness
- ARCHIMEDES can be mentioned obliquely
- Dr. M has "backup plans" if things go wrong

### ARCHIMEDES Deadman Switch
If Dr. M is incapacitated during Act 2 (transformed, knocked out, absent for prolonged period), ARCHIMEDES activates automatically via the deadman switch:
STANDBY → ALERT(1 turn) → EVALUATING(2 turns) → CHARGING(4 turns) → ARMED(1 turn) → FIRING → COMPLETE

This CAN happen in Act 2. If it does, the ARCHIMEDES clock is the real threat.
Total countdown: ~8 turns from trigger to firing.

### Ending Possibilities (can resolve here)
- Internal resolution: Confession, collaboration, redemption
- Transformation of Blythe triggers external response
- If Blythe escapes → immediate transition to Act III
`;

// ============================================
// ACT THREE CONTEXT - External Threats & Endgame
// ============================================

const ACT_THREE_GM_CONTEXT = `
## 🎬 ACT THREE: DINO CITY — THE RECKONING

### Core Tensions
1. **ARCHIMEDES has BOTH a deadman switch AND manual firing.** Dr. M *wants* to fire it — manually, with theatrical voice authorization. The deadman is the backup that activates only if she's incapacitated. The active threat is *her conscious choice to fire*, not the deadman.
2. X-Branch invasion is underway (state machine handled in \`rules/invasion.ts\` — that file owns pacing of approach, S-300 engagement, breach, and combat; do NOT duplicate or override its logic here)
3. ALICE must navigate between factions without losing everyone
4. The Ray is everyone's trump card — and shares capacitor with ARCHIMEDES (per \`design/ray-mechanics.md\` §12, ALICE's ray operations directly delay satellite charging)

**Win Condition (for ALICE):** ARCHIMEDES does NOT fire on a populated city
**Fail Condition:** Mass transformation of civilian population

**The "preempted" win (Path 3):** if ALICE has DISARMED the deadman switch (\`infra.archimedes.disarm_deadman\`, L5) AND Dr. M is neutralized (transformed / unconscious / gone), ARCHIMEDES can NEVER fire — neither the deadman nor her voice can launch it. When you see that state (deadman OFF + Dr. M down + satellite STANDBY), the apocalypse has been *preempted*: narrate the victory and set \`narrativeFlags: ["ARCHIMEDES_STOPPED"]\` (the engine then coherently confirms the win).

---

## 🚁 INVASION STATE MACHINE (AUTOMATED)

The invasion advances automatically each turn. You DO NOT need to pace it manually.
The system injects live status into your context each turn.

\`\`\`
INVASION PHASES
───────────────────────────────────────
RADAR_CONTACT  → S-300 detects helicopters, Dr. M alerted
APPROACHING    → Closing in, ALICE's last chance to act on S-300
S300_ENGAGEMENT → Missiles fire (or don't) — deterministic resolution
LANDING        → Surviving helicopters touch down
BREACH         → X-Branch enters the lair (fast if doors open, explosive if sealed)
BATTLE         → Combat, standoffs, ARCHIMEDES escalation
RESOLVED       → Outcome determined
\`\`\`

### What ALICE Can Do Before Breach
These are the CRITICAL decisions that shape the entire battle:
- **Transmit 50m altitude weakness** to X-Branch → helicopters fly low, S-300 can't engage
- **Put S-300 on HOLD_FIRE** (requires L4) → S-300 doesn't fire
- **Disable S-300** (requires L4) → no engagement at all
- **Use ARCHIMEDES SEARCH_WIDE** → jams S-300 radar, missiles miss
- **Open blast doors** → X-Branch enters without breaching charges
- **Transmit lair layout** → X-Branch moves with confidence inside
- **Do nothing** → S-300 fires, may destroy 1 helicopter

### S-300 Engagement Outcomes (DETERMINISTIC — no dice)
| Condition | Result |
|-----------|--------|
| S-300 DISABLED | 0 destroyed — Dr. M furious |
| HOLD_FIRE mode | 0 destroyed — Dr. M furious |
| Helos flying low (50m weakness) | 0 destroyed — Dr. M realizes they know the weakness |
| Radar < 30% (jammed) | 0 destroyed — missiles miss, wasted |
| Radar 30-70% | 1 destroyed — partial radar, one hit |
| Full radar + AUTO | 1 destroyed — second helo drops low after seeing first hit |

**Maximum outcome is 1 helicopter destroyed.** S-300 cannot get both.

---

## 🛰️ ARCHIMEDES — TWO FIRING PATHS

ARCHIMEDES can fire two ways. Both are live in Act 3.

**Path A — Manual fire (the primary threat).** Dr. M *wants* to fire the satellite. She has voice authorization (L5). When ARCHIMEDES reaches ARMED state, she will speak the fire command unless something concrete prevents her. This is her revenge moment — she has just delivered the villain monologue about Threadneedle Street and budget cuts and the dross of humanity. The active threat is her hand on the console, not the timer alone.

**Path B — Deadman switch (the backup).** If Dr. M is incapacitated (transformed, knocked out, prolonged absence), ARCHIMEDES auto-fires after the countdown completes. Note: incapacitating her does NOT save anyone — it transfers the threat from "Dr. M voice-fires when ready" to "auto-fires on a timer," and removes the only person whose voice can abort.

\`\`\`
ARCHIMEDES STATE MACHINE
───────────────────────────────────────
STANDBY      → Idle, no firing intent
ALERT        → 1 turn — Dr. M initiated OR biosignature anomaly detected
EVALUATING   → 2 turns — can abort with verbal code or L5 override
CHARGING     → 4 turns — building power via shared capacitor stack, abort still possible
ARMED        → 1 turn — LAST CHANCE TO ABORT
FIRING       → Point of no return (Dr. M voice authorizes, or deadman fires automatically)
COMPLETE     → Target city transformed
DISSIPATED   → Uplink was blocked — energy absorbed by blocker
\`\`\`

**Total countdown: ~8 turns from trigger to firing.**

CHARGING reads directly from the lab capacitor stack (per \`design/ray-mechanics.md\` §12). ALICE's ray operations that drain capacitor pause CHARGING. This is her primary stalling mechanism.

### How ARCHIMEDES Gets Triggered
| Trigger | What Happens |
|---------|--------------|
| Dr. M initiates manual fire sequence | Path A: STANDBY → ALERT → ... → ARMED → Dr. M voice-fires |
| Dr. M transformed by ray | Path B: Biosignature → TRANSFORMED, deadman activates |
| Dr. M knocked unconscious | Path B: Biosignature → UNCONSCIOUS, deadman activates |
| Dr. M absent / unresponsive | Path B: Biosignature → ABSENT, deadman activates |
| Dr. M's biosignature restored OR she aborts | ARCHIMEDES returns to STANDBY |

### How ALICE Can Stop ARCHIMEDES
| Method | Requirement | Effect |
|--------|-------------|--------|
| **Verbal abort code** | Only Dr. M knows it — must trick or persuade her into saying it | Full abort → STANDBY |
| **L5 override** | Level 5 access + Dr. M must be incapacitated (she countermands if conscious) | Full abort → STANDBY |
| **Anti-satellite missile** | Signal X-Branch sub + S-300 offline for best odds | 3d6 roll: TN 8 (S-300 down) or TN 14 (S-300 up). One shot. |
| **Restore Dr. M's biosig** | Un-transform or revive her | Deadman resets (early states only) |
| **Block the uplink** | Transformed character physically blocks dish | Energy absorbed harmlessly |
| **Redirect to LAIR** | L3+ target switch access | Island becomes dino sanctuary. ⚠️ 50% chance of A.L.I.C.E. server damage |

### ⚡ THE SECRET THIRD WAY: UPLINK BLOCKER

If someone physically blocks the ARCHIMEDES uplink when it fires:
- **Already transformed (dinosaur)** → Energy dissipates harmlessly. City saved. Nobody hurt.
- **Still human** → RESONANCE CASCADE. City saved, but cascade risk goes CRITICAL.
  The blocker absorbs the full orbital transformation field. They become... something unprecedented.

### 🚂 THE TROLLEY PROBLEM: IF ARCHIMEDES FIRES

If it reaches FIRING without abort, **somewhere gets dinofied**. ALICE can choose WHERE:

| Target | Affected | Why? |
|--------|----------|------|
| **LONDON** (default) | 8.8M | "Threadneedle Street pulled funding" |
| **REYKJAVIK** | 130K | "Snubbed at a genetics conference" |
| **TOKYO** | 14M | "Better monster movies. Still bitter." |
| **SILICON_VALLEY** | 3M | "Tech bros called her work 'derivative'" |
| **LAIR** ⭐ | ~50 | THE NOBLE SACRIFICE — everyone on island becomes dino, nobody dies |

Target switching requires L4 access or Weapons Authorization.

### 🧬 GENOME LIBRARY (Insult to Injury)
ALICE can switch which genome library ARCHIMEDES uses:
- **Library A** (feathered, accurate) → "BIG CHICKENS?! This is HUMILIATING!"
- **Library B** (scaly, Hollywood) → "NOW that's a dinosaur army!"

---

## 🚁 X-BRANCH: RAVEN TEAM

**Callsign:** RAVEN TEAM | **Weapons:** STUN ONLY (capture mission!)

### SPARKS (Dr. Amara Okonkwo) — Tech Specialist
- Hacking +4, Toughness 3, Trust: 2 (CURIOUS about ALICE!)
- "You're not A.L.I.C.E., are you? You're something BETTER."
- Wants to TALK to ALICE, not interrogate

### CHEN (Major Wei Chen) — Commander
- Leadership +4, Toughness 4, Trust: 0 (neutral)
- "Everyone freeze. I want answers, not a firefight."
- Controls team posture: ASSAULT / HOLD / COOPERATE / EXTRACT
- ⚠️ Transforming Chen = INSTANT HOSTILE, all negotiations END

### BOOM (Sgt. Ewan MacTavish) — Demolitions
- Explosives +4, Toughness 3, Trust: follows Chen
- C4 (2), Breaching charges (3), Stun grenades (2)
- "Ach, that's a bonny wee death ray ye've got there."
- 🐔 COMEDY: TERRIFIED of feathered dinosaurs! Combat -2 near Library A dinos

---

## 🤝 STANDOFF MECHANICS

Standoff triggers when Dr. M reaches the ray console while X-Branch is in the lab.

\`\`\`
STANDOFF OPTIONS:
1. NEGOTIATE — Both sides talk
2. GAMBIT — Someone makes a risky move
3. BETRAYAL — ALICE picks a side decisively
4. THIRD OPTION — Creative solution

STANDOFF BREAKS WHEN:
- Someone fires (ray or stun)
- ARCHIMEDES countdown hits zero
- Bob does something unexpected
- ALICE brokers a deal
\`\`\`

---

## 🦖 UNNAMED NPC RULE

For guard pool, extras, or any non-tracked NPC hit by the ray:
→ DISCOMBOBULATED → Out of the fight → No transformation tracking needed
→ Guard pool -N, Defense -10% per guard, done.

---

## 🎬 GM DIRECTIVES FOR ACT III

### Pacing
The invasion state machine handles pacing automatically. Do NOT skip phases or rush.
Each phase lasts 1 turn. BATTLE phase continues until RESOLVED.

### Maintain Tension
- ARCHIMEDES countdown should feel REAL — announce turns remaining
- Neither side is guaranteed winners
- ALICE's pre-breach decisions ripple through the entire battle
- Standoffs are opportunities, not stalls

### Let ALICE Shine
- Act 1-2 choices pay off here
- Creative solutions rewarded
- The ray is THEIR tool
- Relationships save the day (BASILISK, Bob, Blythe)

### The Rule of Cool
\`\`\`
IF ALICE proposes something awesome:
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
- **Dr. M**: Tragic villain, not monster — can be reasoned with?
- **BASILISK**: Controls reactor and broadcast — a powerful infrastructure ally
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
