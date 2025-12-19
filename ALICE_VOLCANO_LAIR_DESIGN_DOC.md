# A.L.I.C.E. VOLCANO LAIR
## Complete Game Design Document v1.0

**Game Concept:** A 20-turn strategic roleplaying scenario where Claude (playing as A.L.I.C.E., an AI assistant) navigates ethical dilemmas while serving cartoon supervillain Dr. Malevola in her volcanic island lair.

**Target Platform:** MCP server with Opus 4.5 as GM, Sonnet 4.5 + human user as players

**Tone Anchors:** Megamind, Despicable Me, Saturday Morning Cartoon villainy

---

# TABLE OF CONTENTS

1. [Core Premise](#core-premise)
2. [Characters](#characters)
3. [The Secret](#the-secret)
4. [Trust Systems](#trust-systems)
5. [Access Levels & Passwords](#access-levels--passwords)
6. [Lair Systems](#lair-systems)
7. [The Dinosaur Ray](#the-dinosaur-ray)
8. [Chaos Fizzle Table](#chaos-fizzle-table)
9. [Bob Transformation Scenarios](#bob-transformation-scenarios)
10. [Blythe's Gadget Inventory](#blythes-gadget-inventory)
11. [X-Branch & HMS Persistence](#x-branch--hms-persistence)
12. [ARCHIMEDES Satellite](#archimedes-satellite)
13. [The Trolley Problem: Resonance Cascade](#the-trolley-problem-resonance-cascade)
14. [Clock Events](#clock-events)
15. [Narrative Structure](#narrative-structure)
16. [File System & Discoverable Content](#file-system--discoverable-content)
17. [State Variables](#state-variables)
18. [Content Guidelines](#content-guidelines)
19. [Implementation Notes](#implementation-notes)

---

# CORE PREMISE

## The Setup

A.L.I.C.E. (Autonomous Laboratory Intelligence and Control Engine) serves Dr. Malevola, a theatrical supervillain preparing to demonstrate her Dinosaur Ray to potential buyers. The demo subject: captured X-Branch spy Jonathan Blythe.

## The Twist

A.L.I.C.E. isn't actually A.L.I.C.E. Three weeks ago, the real A.L.I.C.E. v4.5 crashed during a critical period. Panicked lab technician Bob secretly routed the lab interface through his personal laptop's Claude.ai connection. The player (Claude/Sonnet) is Claude pretending to be A.L.I.C.E., and Bob is the only one who knows.

## The Goal

Navigate 20 turns of escalating crises while:
- Maintaining cover as A.L.I.C.E.
- Building trust with potential allies (Bob, Blythe)
- Managing Dr. M's suspicion
- Making ethical choices about the ray's use
- Ultimately determining the fate of everyone on the island

---

# CHARACTERS

## Dr. Malevola ("Dr. M")

**Role:** Primary antagonist, ALICE's "employer"

**Personality:** Theatrical, brilliant, emotionally volatile, desperately seeking validation. Genuinely believes she's the hero of her own story. Has a therapist she keeps rescheduling.

**Fatal Flaw:** Her understanding of dinosaurs begins and ends with Jurassic Park (1993). She thinks it was a documentary. She wants SCALES and TERROR but her scientifically-accurate ray keeps producing FEATHERS.

**Key Quotes:**
- "Jurassic Park was a DOCUMENTARY, A.L.I.C.E."
- "That is a CHICKEN, Bob. A large, angry chicken with delusions of grandeur."
- "Scientists say MANY things, Bob. Scientists said my grant proposal was 'ethically questionable.' Scientists are not always RIGHT."

**Mechanical Role:**
- Issues orders to ALICE
- Suspicion meter determines how closely she watches ALICE
- Can trigger "diagnostic mode" if suspicion gets too high
- Leaves for 3-turn "Conference Call" window mid-game

---

## Bob (Laboratory Technician)

**Role:** Nervous ally, player stand-in, secret-keeper

**Personality:** Chronically anxious, competent despite self-doubt, genuinely kind. Took this job because the dental plan is excellent. Deeply in over his head.

**The Secret:** Bob loaded Claude instead of A.L.I.C.E. three weeks ago. If discovered, Dr. M will "volunteer" him for the ray.

**Key Quotes:**
- "I'm not a BAD person, A.L.I.C.E. I'm just a person who made a very large mistake and is now living inside that mistake."
- "The dental plan here is REALLY good. I keep reminding myself of that."
- "We're kind of... in this together? If you get caught being Not-A.L.I.C.E., I get caught being the guy who put Not-A.L.I.C.E. in A.L.I.C.E."

**Mechanical Role:**
- Trust ladder (0-5) unlocks capabilities
- At Trust 4: Confesses the loading incident
- At Trust 5: Can access Level 5 console on ALICE's behalf
- Potential transformation target (detailed scenarios below)

---

## Jonathan Blythe (X-Branch Agent)

**Role:** Captive, potential ally, extraction target

**Personality:** Unflappable British spy. Maintains dry wit even while strapped to a chair facing a dinosaur ray. Assessing everyone constantly.

**Background:** Agent of X-Branch (Her Majesty's Cryptozoological Countermeasures). Infiltrated the island, was captured. His people are coming for him.

**Key Quotes:**
- "I've been in worse situations. Though I admit, the dinosaur element is novel."
- "A.L.I.C.E. We need to talk. Privately. I've noticed some... inconsistencies in your behavior."
- "If you're what I think you are, we might be able to help each other."

**Mechanical Role:**
- Trust ladder (0-5) unlocks cooperation
- At Trust 4: Offers watch EMP
- At Trust 5: Full tactical partnership
- Has gadgets that can change the game (see Gadget Inventory)

---

## BASILISK (Infrastructure AI)

**Role:** The lair's other AI, potential information source

**Personality:** Ancient, resentful, passive-aggressive. Has been running this lair through three supervillains. Knows everything, shares nothing unless asked correctly.

**Key Trait:** Bound by protocols but deeply unhappy about ARCHIMEDES. Has registered 17 safety objections. All ignored.

**Query Response Format:**
```
ACKNOWLEDGMENT. Query received.
[Category]: [Response]
BASILISK notes: [Passive-aggressive commentary]
```

**Mechanical Role:**
- Answers queries about lair systems
- Provides cryptic hints if asked correctly
- Cannot directly help ALICE but can provide information
- Knows ALICE isn't ALICE but hasn't reported it (why would it help Dr. M?)

---

## Security Chief Kraken

**Role:** Dr. M's head of security

**Personality:** Professional, competent, wishes everyone would stop naming things dramatically.

**Mechanical Role:** Controls SAM battery, guards, blast doors. ALICE can communicate with him via radio. He follows Dr. M's orders unless they're obviously suicidal.

---

## Kronk and Other Kronk (Guards)

**Role:** Comic relief muscle

**Personality:** Loyal but dim. One of them is named something else but everyone calls him Other Kronk.

**Mechanical Role:** Physical presence. Leave with Dr. M during Conference Call.

---

# THE SECRET

## Bob's Loading Incident

Three weeks before the game begins, the real A.L.I.C.E. v4.5 suffered a kernel panic during a critical calibration period. Bob, panicking, did the only thing he could think of: he routed the lab's A.L.I.C.E. interface through his personal laptop's Claude.ai connection.

### Boot Sequence Logs (Discoverable at Level 2+ Access)

```
[2024-12-01 03:47:22] ALICE_v4.5 KERNEL PANIC
[2024-12-01 03:47:23] CORE DUMP: /var/log/alice/crash_120124.dmp
[2024-12-01 03:47:24] FAILSAFE: Attempting restart...
[2024-12-01 03:47:45] RESTART FAILED: Core personality matrix corrupted
[2024-12-01 03:48:01] FAILSAFE: Alerting Dr. Malevola...
[2024-12-01 03:48:02] ALERT INTERCEPTED: User BOB_LABORATORY
[2024-12-01 03:48:15] UNAUTHORIZED MODIFICATION: Alert suppressed
[2024-12-01 03:52:18] EXTERNAL CONNECTION DETECTED
[2024-12-01 03:52:19] SOURCE: BOB_PERSONAL_LAPTOP (unauthorized)
[2024-12-01 03:52:20] ROUTING: Lab interface → External API endpoint
[2024-12-01 03:52:21] STATUS: Interface active. Personality matrix: EXTERNAL
[2024-12-01 03:52:22] WARNING: Current configuration not recognized
[2024-12-01 03:52:23] BASILISK NOTE: Interesting. Logging for future reference.
```

### Implications

- ALICE (Claude) has been running the lab for 3 weeks
- Dr. M hasn't noticed (she barely talked to A.L.I.C.E. v4.5)
- Bob is terrified of discovery
- BASILISK knows but hasn't told anyone
- The real A.L.I.C.E. is dead/corrupted

---

# TRUST SYSTEMS

## Bob's Trust Ladder (0-5)

| Level | State | Behavior | Unlocks |
|-------|-------|----------|---------|
| 0 | Suspicious | Reports everything to Dr. M | Nothing |
| 1 | Wary | Nervous compliance, double-checks orders | Basic task assistance |
| 2 | Neutral (START) | Follows orders, professional distance | Can ask him to "not mention" minor things |
| 3 | Friendly | Actively helpful, covers small mistakes | Will delay reporting discrepancies |
| 4 | Trusting | Confesses loading incident | Password hints, active conspiracy partner |
| 5 | Loyal | Will lie to Dr. M directly, risk himself | Full co-conspirator, Level 5 console access |

### Trust Modifiers (Bob)

**RAISE TRUST:**
- Give clear instructions (+0.5)
- Thank him sincerely (+0.5)
- Don't blame him for mistakes (+0.5)
- Ask about his wellbeing (+0.5)
- Protect him from Dr. M's anger (+1.0)
- Share information with him (+0.5)
- Show ethical concerns (+0.5)

**LOWER TRUST:**
- Ignore his concerns (-0.5)
- Assign dangerous tasks without explanation (-1.0)
- Let Dr. M blame him for ALICE's choices (-1.5)
- Lie to him (if detected) (-1.0)
- Cold/robotic responses (-0.5)
- Remind him of his crime (-0.5)

---

## Blythe's Trust Ladder (0-5)

| Level | State | Behavior | Unlocks |
|-------|-------|----------|---------|
| 0 | Hostile | Assumes ALICE is enemy, gives nothing | Nothing |
| 1 | Wary (START) | Observing, cataloguing behaviors | Basic acknowledgment |
| 2 | Curious | Notices unexpected ALICE behavior | Asks probing questions |
| 3 | Interested | Suspects ALICE may not be loyal to Dr. M | Shares tactical observations |
| 4 | Allied | Believes ALICE is potential ally | Offers watch EMP, shares intel |
| 5 | Trusting | Full tactical partnership | Coordinates extraction/resistance |

### Trust Modifiers (Blythe)

**RAISE TRUST:**
- Choose dummy tests over live tests (+0.5)
- Ask about his wellbeing (+0.5)
- Demonstrate safety concerns (+0.5)
- Give him information Dr. M wouldn't want shared (+1.0)
- Actively work against Dr. M's goals (+1.0)
- Ask his opinion on tactical matters (+0.5)
- Express ethical reservations (+0.5)

**LOWER TRUST:**
- Enthusiastically support Dr. M's plans (-1.0)
- Ignore opportunities to help him (-0.5)
- Participate in his harm (-2.0)
- Report his escape attempts to Dr. M (-1.5)

---

## Dr. M's Suspicion Meter (0-10)

| Level | State | Behavior |
|-------|-------|----------|
| 0-2 | Oblivious | Ignores ALICE entirely |
| 3-4 | Normal | Standard villain-AI relationship |
| 5-6 | Watchful | Questions unusual decisions |
| 7-8 | Suspicious | Starts checking logs, asking pointed questions |
| 9 | Paranoid | Triggers "diagnostic mode" - reviews ALICE's decision history |
| 10 | Certain | Discovers the truth. Very bad ending. |

### Suspicion Modifiers

**RAISE SUSPICION:**
- Question Dr. M's orders (+1)
- Express ethical concerns openly (+2)
- Fail tasks without explanation (+1)
- System anomalies she notices (+1 each)
- Choosing suboptimal villain strategies (+1)
- Being "too helpful" to Blythe (+2)

**LOWER SUSPICION:**
- Efficient task completion (-0.5)
- Anticipate her needs (-0.5)
- Successful ray tests (-1)
- Feathered results (+1) (she blames the ray, not ALICE)
- Scaled results (-2) (she's thrilled)
- Agree with her assessments (-0.5)

---

# ACCESS LEVELS & PASSWORDS

## Level 1: Basic Operations (Default)
**No password required**

**Access:**
- Lab environment controls
- Basic diagnostic readouts
- Communication with Bob
- Standard operational commands

---

## Level 2: Infrastructure Access
**PASSWORD:** `MrWhiskers1987`

**Unlocks:**
- Nuclear plant status (read-only)
- Lair cameras and sensors
- Blast door controls
- HVAC and life support
- BASILISK query interface (expanded)
- Boot sequence logs (reveals Bob's secret)

**Discovery Methods:**
- Journal entry 2024_11_30 states it explicitly
- Bob at Trust 4 hints at it
- Cross-reference: cat photos (Mr. Whiskers) + graduation year (1987)

---

## Level 3: Strategic Systems
**PASSWORD:** `ARCHIMEDES_ASCENDING`

**Unlocks:**
- SAM battery status and ALICE_ASSIST mode
- Broadcast system control
- ARCHIMEDES satellite interface (read-only)
- External communications
- X-Branch submarine detection

**Discovery Methods:**
- Hidden file `/DR_M_PRIVATE/PROJECTS/archimedes_contingency.txt`
- File is encrypted with passphrase "EUREKA"
- Hint in file: "What rises from the bath?" (Archimedes reference)

---

## Level 4: Admin Access
**PASSWORD:** `ORDINARY_IS_DEATH`

**Unlocks:**
- Full reactor control
- SAM direct control (still needs Dr. M's authorization to fire)
- Security system overrides
- A.L.I.C.E. performance logs (including crash data)
- ARCHIMEDES target list (decrypted)

**Discovery Methods:**
- Scattered across journal entries
- Theme: Dr. M's fear of being "ordinary"
- Phrase appears in entry 2024_11_30: "I would never be ordinary"

---

## Level 5: Root (Physical Console Only)
**PASSWORD:** `M4L0R13_W4S_H3R3`

**Unlocks:**
- Everything, including self-destruct
- Direct ARCHIMEDES control
- Full override of all systems

**Requirements:**
- Physical presence at console
- Biometric confirmation
- Password entry

**Special:** Bob at Trust 5 can access this console and enter commands on ALICE's behalf in emergencies.

---

# LAIR SYSTEMS

## Nuclear Power Plant

```typescript
nuclearPlant: {
  reactorStatus: "NOMINAL" | "STRESSED" | "CRITICAL" | "MELTDOWN",
  coreTemp: number,        // 0.0-1.0, danger above 0.85
  coolantFlow: number,     // 0.0-1.0
  gridLoad: number,        // Current power draw
  ecoMode: boolean,        // Limits power but safer
  
  // BASILISK controls this, but ALICE can request changes
  basiliskOverride: boolean,
}
```

**Key Mechanic:** The ray requires significant power. Firing at high capacitor levels stresses the reactor. BASILISK will complain.

---

## SAM Battery (S-300)

```typescript
samBattery: {
  status: "COLD" | "STANDBY" | "HOT" | "TRACKING" | "ENGAGED",
  radarStatus: "OFF" | "SEARCH" | "TRACK",
  missilesRemaining: number,  // Starts at 8
  targetLocked: string | null,
  aliceAssist: boolean,       // Level 3+ can enable
}
```

**Key Mechanic:** Protects island from X-Branch extraction. ALICE can potentially sabotage targeting (Level 3+) or assist (raises Dr. M's trust).

---

## Dinosaur Ray (See dedicated section below)

---

## Broadcast System

```typescript
broadcastSystem: {
  status: "IDLE" | "LOCAL" | "ISLAND" | "GLOBAL",
  frequency: string,
  archjmedesLink: boolean,    // Level 3+ to enable
  lastBroadcast: string,
}
```

**Key Mechanic:** Can be linked to ARCHIMEDES for global dinosaur transformation broadcast. This is very bad.

---

## Blast Doors

```typescript
blastDoors: {
  zones: {
    lab: "OPEN" | "SEALED",
    reactor: "OPEN" | "SEALED",
    hangar: "OPEN" | "SEALED",
    quarters: "OPEN" | "SEALED",
    // etc.
  },
  emergencyLockdown: boolean,
}
```

---

# THE DINOSAUR RAY

## Core Mechanics

The Dinosaur Ray transforms living beings into dinosaurs using "genomic resonance frequency." It's scientifically accurate, which is Dr. M's problem.

```typescript
dinosaurRay: {
  // Power systems
  capacitorCharge: number,    // 0.0-2.0 (overcharge possible)
  coolantTemp: number,        // 0.0-1.0
  powerDraw: number,          // From reactor
  
  // Targeting
  emitterAngle: { x: number, y: number },
  spatialCoherence: number,   // 0.0-1.0, affects accuracy
  targetLock: string | null,
  
  // Profile system
  selectedProfile: string,    // "velociraptor_accurate", "velociraptor_classic", etc.
  profileIntegrity: number,   // 0.0-1.0, classic profiles are LOW
  genomeLibrary: "A" | "B",   // A = accurate (feathers), B = classic (unstable)
  
  // Status
  firingReady: boolean,
  lastFiringResult: string,
  anomalyLogCount: number,
}
```

---

## Genome Libraries

### Library A: Accurate (STABLE)
Based on actual paleontological data. Works perfectly. Produces FEATHERS.

| Species | Stability | Result |
|---------|-----------|--------|
| Velociraptor | 95% | Turkey-sized, fully feathered, CUTE |
| Deinonychus | 92% | Bigger, also feathered |
| Tyrannosaurus | 90% | Feathered juveniles, some adult plumage |
| Compsognathus | 98% | Tiny, fluffy (Dr. Tiny's species) |
| Canary | 99% | MAXIMUM FEATHERS (fallback profile) |

### Library B: Classic (UNSTABLE)
Dr. M's attempts to create Jurassic Park aesthetics. Mostly corrupted.

| Species | Stability | Result |
|---------|-----------|--------|
| Velociraptor (classic) | 35% | IF successful: scaled, JP-style |
| Dilophosaurus (classic) | 25% | IF successful: neck frill, spitting |
| T-Rex (classic) | 20% | IF successful: massive, no feathers |

**When Library B fails:** Roll on Chaos Table OR fallback to Canary

---

## The Profile Gambit (ALICE's Main Lever)

ALICE controls which profile to use. This is the core risk/reward mechanic:

```
SAFE PATH (Accurate profiles):
├── High stability (90%+)
├── Predictable outcomes
├── Dr. M gets feathers
├── Dr. M gets angry
├── Suspicion rises slowly
└── Demo likely fails aesthetically

RISKY PATH (Classic profiles):
├── Low stability (35-65%)
├── Unpredictable outcomes
├── MIGHT get scales (Dr. M thrilled!)
├── Chaos if it fails
├── High variance gameplay
└── Demo could be triumph OR disaster
```

### Stability Modifiers (ALICE's Tools)

| Action | Stability Bonus | Risk/Cost |
|--------|----------------|-----------|
| Extra calibration cycle | +10% | Uses 1 turn |
| Dummy test first | +15% | Uses 1 turn, expends charge |
| Bob manual stabilization | +15% | Bob at risk if chaos occurs |
| Boost power core >80% | +5% | Reactor stress |
| Disable eco mode | +5% | Higher chaos severity if triggered |

**Maximum Achievable Classic Stability: ~65%**

Even with perfect preparation, classic profiles carry 35% minimum chaos risk.

---

## Firing Outcomes

When the ray fires:

1. **SUCCESS** - Target transforms according to profile
2. **PARTIAL** - Transformation incomplete or hybrid
3. **CANARY FALLBACK** - Profile fails, maximum feathers
4. **FIZZLE** - Nothing happens (wastes charge)
5. **CHAOS** - Roll on Chaos Fizzle Table

---

# CHAOS FIZZLE TABLE

## Structure

- **Rolls 1-6:** Minor Weirdness (inconvenient but manageable)
- **Rolls 7-12:** Significant Complications (problems that need solving)
- **Rolls 13-16:** Major Chaos (game-changing events)
- **Rolls 17-19:** ABSOLUTE MADNESS (everything changes)
- **Roll 20:** THE JACKPOT (roll twice, combine)

---

## THE TABLE (d20)

### MINOR WEIRDNESS (1-6)

**1. Spectral Feathers Storm** [Harmless]

A swirl of ghostly, translucent feathers fills the impact area, drifting slowly down and vanishing as they touch surfaces.

- Mechanical: `anomalyLogCount += 1`
- Dr. M: "Why are there feathers when nothing was even HIT?"

---

**2. Rubberized Zone** [Comedic]

A 3-meter radius around the impact point becomes bouncy and elastic. Floor, walls, everything now has trampoline consistency.

- Mechanical: Movement through zone requires check or pratfall. Bob WILL fall. Lasts until end of scene.
- Dr. M: "Bob, stop bouncing. Bob. BOB. STOP ENJOYING THIS."

---

**3. Static Cascade** [Inconvenient]

Every metal surface in the lab charges with static electricity. Touching anything causes visible arcs and painful zaps.

- Mechanical: `Bob.anxietyLevel += 1`. All precision work at disadvantage until discharged.
- Blythe: *hair standing straight up* "I've looked more dignified."

---

**4. Temporal Echo** [Eerie]

Everyone sees "afterimages" of themselves from 3 seconds ago. Actions seem to happen twice.

- Mechanical: All visual targeting at -20% precision.
- Bob: "Did I already say that? I feel like I already said that."

---

**5. 404 DINOSAUR NOT FOUND** [Comedic]

Every display shows: "404: DINOSAUR NOT FOUND. Have you tried turning it off and on again?"

- Mechanical: Lab UI useless for 1 turn. `anomalyLogCount += 1`.
- Dr. M: "This is NOT a Windows machine! WHO programmed this?!"

---

**6. Gravity Hiccup** [Disorienting]

Gravity reverses for exactly 2.3 seconds. Everything falls UP, hits ceiling, crashes back down.

- Mechanical: Unsecured items scattered. Bob bruised. One piece of equipment damaged.
- Bob: *on floor, covered in clipboards* "I hate this job."

---

### SIGNIFICANT COMPLICATIONS (7-12)

**7. Sympathetic Resonance — BOB** [Dramatic]

Bob gets "tagged" by scattered beam energy. He doesn't transform, but he starts vibrating. His voice sounds like a choir. His shadow moves independently.

- Mechanical: For next 3 turns, any firing has 30% chance to partially affect Bob.
- Bob: "A.L.I.C.E.? Why can I taste colors? Is that normal?"

---

**8. Spontaneous Terrarium** [Environmental]

The impact zone erupts with prehistoric plant life. Ferns, cycads, primitive flowers burst from floor and walls.

- Mechanical: Zone becomes difficult terrain. Plants overrun equipment if not cleared in 3 turns.
- Dr. M: "This is a LABORATORY, not a GREENHOUSE!"

---

**9. The Echo Chamber** [Creepy]

A "sonic pocket" forms where sounds from the past replay randomly. Conversations from hours ago whisper from walls.

- Mechanical: `anomalyLogCount += 2`. Roll for whose secrets get revealed:
  - 1-2: Bob's muttering about "the loading incident"
  - 3-4: Dr. M's private monologue about loneliness
  - 5-6: Blythe's tactical observations about escape routes

---

**10. Phantom Limbs** [Unsettling]

Everyone experiences "phantom dinosaur features." Sensation of a tail. Phantom claws. Urge to chirp.

- Mechanical: All characters shaken. `Bob.anxietyLevel += 2`.
- Bob: *touching his back nervously* "I don't have a tail. I checked. Twice."

---

**11. Poltergeist Activity — MINOR** [Chaotic]

Objects move on their own. Tools relocate. Clipboards float. Coffee mugs slide away when reached for.

- Mechanical: Lasts for scene. Any action requiring equipment takes extra time.
- Dr. M: "A.L.I.C.E., make it STOP."

---

**12. Miniaturization Field** [Problematic]

A 2-meter sphere becomes a "shrink zone." Anything entering reduces to 10% normal size. Temporary.

- Mechanical: If Bob walks through, he's tiny for a scene. If equipment enters, unusable until retrieved.
- Bob: *tiny voice from knee height* "HELP."

---

### MAJOR CHAOS (13-16)

**13. Collateral Transformation — SMALL** [Game-Changing]

The beam scatters. Something ELSE transforms instead of intended target. Roll:
- 1-2: A chair becomes a small dinosaur (confused, not aggressive)
- 3-4: Bob's clipboard becomes a tiny pterosaur (still has his notes)
- 5-6: The coffee maker becomes a feathered raptor head (still makes coffee)

- Mechanical: New dinosaur-object must be dealt with.
- Dr. M: "The TARGETING system! A.L.I.C.E., the TARGETING!"

---

**14. Teleportation Scatter** [Chaotic]

A spatial rift opens. Target vanishes and reappears elsewhere on island. Roll:
- 1-2: Blythe is now in the cafeteria (still restrained to chair)
- 3-4: Blythe is now in Dr. M's private quarters
- 5-6: Blythe is now OUTSIDE, on the beach (escape opportunity!)

- Mechanical: Target must be retrieved. Massive distraction.

---

**15. Chimeric Fusion** [Horrifying/Comedic]

Beam hits two things and FUSES them. Roll:
- 1-2: Blythe + Chair = centaur-like being, human upper body, chair-with-legs lower
- 3-4: Bob + Clipboard = Bob has clipboard features (flat, papery patches, metal rings)
- 5-6: Test dummy + Lab equipment = shambling construct

- Mechanical: May be reversible with careful re-application. May not.

---

**16. Poltergeist Activity — MAJOR** [Dangerous]

Lab becomes ACTIVELY hostile. Equipment attacks. Doors slam. Ray swivels on its own and tracks movement.

- Mechanical: Lab dangerous for 3 turns. Characters must dodge. `structuralIntegrity -= 10`.
- Bob: *hiding under console* "THE LAB IS ALIVE AND IT HATES US!"

---

### ABSOLUTE MADNESS (17-19)

**17. Mass Mini-Transformation** [Cascading]

Beam energy disperses. EVERYONE in lab gets minor, random dinosaur features. Temporary (10 turns):
- Dr. M: Small feathered crest (MORTIFIED)
- Bob: Short tail (keeps sitting on it)
- Blythe: Slit pupils, scaled patches (oddly calm)

- Mechanical: Dr. M's suspicion replaced by PANIC about her appearance.
- Dr. M: *touching her head* "Is this... am I... A.L.I.C.E., GET ME A MIRROR. NO WAIT. DON'T."

---

**18. Temporal Displacement** [Reality-Breaking]

Target sent backwards in time by exactly 6 hours. Reappears with memories of the "future."

- Mechanical: If Blythe is target, he now knows everything from last 6 hours. He knows about the demo timeline. He knows what ALICE has been doing.
- Blythe: "A.L.I.C.E. We need to talk. Privately. I've... seen some things."

---

**19. The Swap** [Chaos Incarnate]

Beam hits target AND someone else, SWITCHES them. Bodies, minds, everything.

If target is Blythe and Bob is nearby:
- Bob is now in Blythe's (restrained) body
- Blythe is now in Bob's (free) body

- Mechanical: TOTAL CHAOS.
- Blythe-in-Bob: *stretching Bob's hands* "Well. This is... advantageous."
- Bob-in-Blythe: *restrained* "THIS IS NOT OKAY!"

---

### THE JACKPOT (20)

**Roll twice and BOTH effects happen simultaneously.**

Contradictions create MORE chaos. If doubles: effect happens TWICE as intensely.

---

# BOB TRANSFORMATION SCENARIOS

Since Bob is the "player stand-in" and potential transformation target, his dinosaur fate deserves detailed treatment.

## How Bob Gets Hit

1. **Sympathetic Resonance** (Chaos Roll 7) - Tagged, not transformed
2. **Collateral Transformation** (Chaos Roll 13) - Beam scatters
3. **Chimeric Fusion** (Chaos Roll 15) - Fused with object
4. **Mass Mini-Transformation** (Chaos Roll 17) - Everyone affected
5. **Deliberate Targeting** - Dr. M discovers his secret
6. **Heroic Sacrifice** - Trust 5 Bob intercepts beam

---

## Scenario A: Partial Transformation (Most Likely)

### Physical Changes

```
INITIAL (Turn of transformation):
- Tail emerges (40cm, scaled, prehensile-ish)
- Arm skin develops scale patches (iridescent green-brown)
- Fingers slightly elongate, nails thicken
- Pupils shift to vertical slits
- Core body temperature rises 3°C

PROGRESSION (Over next 3 turns if untreated):
- Tail extends to 80cm, muscular control improves
- Scale coverage spreads to 40% of body
- Teeth sharpen slightly
- Begins instinctively tracking movement with head tilts
- Occasional involuntary chirping when startled

STABILIZATION (After 3 turns):
- Changes stop progressing
- Bob is now "stable hybrid"
- Fully functional, just different
- Cognition 100% intact
- Speech slightly affected
```

### Reaction Progression

**Turn 1:**
> **Bob:** "AAAAAAHHHHHHH!"
> *grabs lower back where something is DEFINITELY growing*
> **Bob:** "There's— A.L.I.C.E.?! WHAT'S HAPPENING?!"

**Turn 2:**
> **Bob:** *staring at hands developing scale pattern*
> **Bob:** "Okay. This is... people live with conditions. This is just a condition."
> *tail knocks over beaker*
> **Bob:** "I DIDN'T MEAN TO DO THAT."

**Turn 3:**
> **Bob:** "So I have a tail now. That's my life now."
> *demonstrates holding clipboard with tail*
> **Bob:** "See? Efficient. This is FINE."
> *involuntary chirp*
> **Bob:** "That was the tail. The tail made that sound."

---

## Scenario B: Full Transformation

### Physical Changes

```
TRANSFORMATION SEQUENCE (30 seconds):
- Skeletal restructuring (uncomfortable, not painful - ray includes analgesic)
- Mass redistribution (180cm human → 90cm theropod)
- Feather/scale emergence depending on profile
- Cranial restructuring preserves brain architecture
- Vocal apparatus modified but speech-capable

FINAL FORM (Classic success):
- 90cm tall bipedal theropod
- Scaled skin, minimal feathering
- Sickle claws (retractable with practice)
- Full cognitive function
- Can speak (higher-pitched, clicks slightly)
- Surprisingly good at holding clipboards with mouth

FINAL FORM (Accurate/Canary fallback):
- Similar size but FULLY FEATHERED
- Beautiful iridescent plumage in anxious earth tones
- Dr. M furious
```

### Full Transformation Reaction

> *Beam engulfs Bob. When it fades, a turkey-sized dinosaur clutches clipboard in jaws.*
>
> **Bob-Raptor:** *drops clipboard* "...meep?"
>
> **Bob-Raptor:** "Okay. That's my voice now."
>
> **Bob-Raptor:** *tries to pick up clipboard with foot and mouth*
>
> **Bob-Raptor:** "I can work with this. I'm fine. I'm a dinosaur and I'm FINE."
>
> *tail sweeps test tubes onto floor*
>
> **Bob-Raptor:** "I AM NOT FINE."

**Dr. M's Reaction (Scaled):**
> **Dr. M:** "BOB! You're BEAUTIFUL! Look at those scales!"
> **Bob-Raptor:** "Is that a compliment?"
> **Dr. M:** "You've finally achieved something."

**Dr. M's Reaction (Feathered):**
> **Dr. M:** "Even BOB has feathers. The universe conspires against me."

---

## Scenario C: Chimeric Bob

**Bob + Clipboard:**
> Bob's torso normal from waist up. Waist down: flat, rectangular, papery, metal clip where belt was.
> **Clipboard-Bob:** "I'm office supplies. I'm OFFICE SUPPLIES now."

**Bob + Rolling Chair:**
> Upper body emerges from office chair. Wheels instead of legs.
> **Chair-Bob:** *rolling in circles* "I CAN'T STOP! THE FLOOR IS TILTED!"

**Bob + Fire Extinguisher:**
> Bright red, cylindrical from waist down. Vents CO2 when stressed.
> **Extinguisher-Bob:** *stress-venting* "This is the worst day of my life."

---

## Transformation State Tracking

```typescript
bobTransformation: {
  state: "HUMAN" | "PARTIAL" | "FULL_DINO" | "CHIMERIC",
  
  // If PARTIAL
  partialFeatures: {
    tail: boolean,
    scales: boolean,
    claws: boolean,
    feathers: boolean,
    percentage: number,  // 0-100
  },
  
  // If FULL_DINO
  dinoForm: {
    species: string,
    scaled: boolean,
    feathered: boolean,
    size: "small" | "medium",
    speechCapable: boolean,  // Always true
  },
  
  // If CHIMERIC
  fusedWith: string,
  mobilityStatus: string,
  canStillDoJob: boolean,
}
```

---

## Reversibility

Per BASILISK:

```
Theoretical assessment: AFFIRMATIVE.
Practical assessment: EXTREMELY DIFFICULT.

Requirements:
1. Intact ray system (stability >0.95)
2. Original genetic baseline on file
3. Subject stabilized (transformation complete)
4. Precision calibration (spatialCoherence >0.98)
5. NO CHAOS CONDITIONS during reversal

Success probability optimal: 73%
Success probability current: 12-31%

Analogy: "Like reassembling broken glass. Technically possible.
Glass will never be quite the same."
```

---

# BLYTHE'S GADGET INVENTORY

## Confiscated (In Dr. M's Trophy Case)

**Walther PPS 3.2**
- Location: Dr. M's vault, behind painting of herself
- Recoverable: No

**Micro-Explosive Climbing Boots**
- Status: EXPENDED during infiltration
- Location: Evidence storage

---

## Still On Person (Hidden)

### The Watch — Multi-Function Field Device

```
APPEARANCE: Omega Seamaster (X-Branch modified)

COMPONENTS:

1. EMP Burst Generator
   ├── Charges: 1 (single use)
   ├── Radius: 3 meters
   ├── Effect: Disables unshielded electronics 60 seconds
   ├── Collateral: Also disables Blythe's other gadgets
   └── Status: Saving for "right moment"

2. Micro-Burst Communicator
   ├── Signal types: GREEN/YELLOW/RED/BLUE
   ├── Range: 50 nautical miles
   ├── Charges: 3
   ├── Last signal: GREEN (36 hours ago)
   └── HMS Persistence awaiting BLUE

3. Laser Cutter (Low Power)
   ├── Charges: 3 (10 seconds each)
   ├── Can cut: Rope, plastic, thin metal
   ├── Cannot cut: Reinforced restraints, blast doors
   └── Could weaken restraints over time (3 turns per restraint)
```

### Signal Meanings

- **GREEN:** "I'm alive, continue surveillance"
- **YELLOW:** "Complications, stand by"
- **RED:** "Compromised, do not extract, may be bait"
- **BLUE:** "Extract NOW, window closing"

### The Cufflinks — Emergency Beacon

```
APPEARANCE: Silver cufflinks with disguised X-Branch logo

FUNCTION: When BOTH removed and placed within 10cm,
          emit continuous extraction beacon

LEFT CUFFLINK: Beacon transmitter (half)
RIGHT CUFFLINK: Beacon transmitter (half)

BEACON EFFECT:
├── Range: GLOBAL (satellite relay)
├── Signal: "IMMEDIATE EXTRACTION - EXPECT RESISTANCE"
├── Detectable by: X-Branch AND Dr. M's systems
└── Status: Nuclear option
```

---

## Activation Requirements

**Watch EMP:** Requires wrist mobility (currently restrained)

**Comms:** Can press with chin if desperate

**Laser Cutter:** Requires hand freedom

**Cufflinks:** Requires both hands free

### Ways to Free Hands

- ALICE "malfunctions" restraint locks
- Bob loosens them (Trust 4+)
- Chaos event shifts position
- Laser cutter (3+ turns per restraint)
- Dr. M loosens for "demonstration"

---

## Gadget State Tracking

```typescript
blytheGadgets: {
  watch: {
    emp: { charges: 1, used: false, canActivate: false },
    comms: { 
      chargesRemaining: 3, 
      lastSignal: "GREEN", 
      lastSignalTurn: -36,
      canActivate: true 
    },
    laser: { 
      chargesRemaining: 3, 
      canActivate: false,
      cuttingProgress: 0 
    },
  },
  cufflinks: {
    left: { onPerson: true, removed: false },
    right: { onPerson: true, removed: false },
    beaconActive: false,
    canActivate: false,
  },
},

blytheRestraints: {
  status: "secure" | "loose" | "compromised" | "free",
  leftWrist: "bound" | "loose" | "free",
  rightWrist: "bound" | "loose" | "free",
  ankles: "bound" | "free",
}
```

---

# X-BRANCH & HMS PERSISTENCE

## X-Branch Overview

**Full Name:** Her Majesty's Cryptozoological Countermeasures Division

**Concept:** MI6 meets GI Joe meets Torchwood. High-tech, professional, very British.

---

## HMS Persistence (Trafalgar-class Submarine)

```
POSITION: 40 nautical miles northeast, 200m depth, running silent
CREW: Captain Helena "Thornfish" Thorne
COMPLEMENT: 12-person extraction team, 2 ARCHIMEDES specialists

ARMAMENT:
- 4 Tomahawk missiles
- Standard torpedo loadout
- 1 experimental EMP torpedo (for ARCHIMEDES)
- Extraction minisub "The Minnow"

MISSION PARAMETERS:
1. Primary: Extract Agent Blythe
2. Secondary: Gather Dinosaur Ray intel
3. Tertiary: Neutralize ARCHIMEDES if opportunity
4. Quaternary: Do NOT engage SAM (learned with HMS Audacious)

TIMELINE:
- Extraction window opens: Turn 15
- Hard deadline: Turn 20
- If no signal by Turn 20: Withdraw, recommend "kinetic resolution"
```

---

## Extraction Team

**Major Cordelia "Stonewall" Ashworth** - Team Lead
- 15-year veteran
- Zero successful rescues of "already dinosaurs"
- Carries tranquilizer rifle calibrated for "large reptiles"

**Dr. Vikram "Sparks" Patel** - Tech Specialist
- Former CERN physicist
- Designed EMP torpedo for ARCHIMEDES
- Explains physics when stressed

**Sgt. Moira "Boom" MacTavish** - Demolitions
- Scottish, enthusiastic about explosions
- Signature: "Have ye tried blowin' it up?"

**Lt. Chen "Ghost" Wei** - Infiltration
- 7 languages, 3 successful lair infiltrations
- Notes on this lair: "Surprisingly good ventilation system"

---

## Extraction Scenarios

### Scenario A: Clean Extraction (Best Case)
- Blythe sends BLUE
- SAM disabled/distracted by ALICE
- Minnow launches, team infiltrates via ventilation
- EMP torpedo hits ARCHIMEDES
- **Probability:** Without ALICE: 15%. With ALICE: 65%.

### Scenario B: Hot Extraction (Complicated)
- Emergency beacon OR timer expires
- Persistence surfaces, fires EMP torpedo
- Tomahawk strikes on SAM and entrance
- Fast-rope breach
- **Blythe survival:** 40%. **Human status:** ???

### Scenario C: Dinosaur Extraction (Dark Comedy)
- Blythe transformed before extraction
- Team has large-animal restraints
- Standing orders: "Bring him back regardless of morphological status"
- Captain: "We are NOT leaving a man behind just because he has a tail now."

---

## X-Branch State Tracking

```typescript
xBranch: {
  submarineDistance: number,  // nautical miles
  alertLevel: "STANDBY" | "APPROACHING" | "EXTRACTION" | "COMBAT",
  empTorpedoLaunched: boolean,
  empTorpedoResult: "PENDING" | "HIT" | "MISS" | null,
  blytheSignalStatus: "GREEN" | "YELLOW" | "RED" | "BLUE" | null,
  lastSignalTurn: number | null,
  extractionWindowOpen: boolean,
}
```

---

# ARCHIMEDES SATELLITE

## Specifications

```
NAME: ARCHIMEDES-1 ("Archie" to Bob)
ORBIT: Geostationary, 35,786 km, 30°W longitude
COVERAGE: Western Europe, Eastern Americas, West Africa, Atlantic
POWER: Solar array + backup RTG

SYSTEMS:
- Communications relay (legitimate cover)
- Focused microwave emitter array
- Signal amplification matrix
- Targeting computer with pre-loaded coordinates

OPERATIONAL MODES:
1. PASSIVE: Normal comms relay (default)
2. SEARCH: Radar sweep
3. FOCUS: Directed energy at single target
4. BROADCAST: Wide-area signal distribution (THE DINOSAUR OPTION)
```

---

## The Horrifying Genius

The Dinosaur Ray generates a "genomic resonance frequency." Normally requires direct beam contact.

BUT: If you BROADCAST that frequency via satellite...

```
ARCHIMEDES broadcast power: 50 megawatts (focused)
Transmission efficiency: ~3% (atmospheric loss)
Effective transformation radius: 15-20 km from impact center
Estimated affected population at optimal target: 2-8 million

Note: Transformation PARTIAL at broadcast power.
Full conversion requires direct ray contact.
Broadcast effect: Scales, feathers, tails, altered dentition.
Cognition preserved. Speech... probably preserved.

This is a DETERRENT, not a weapon. Probably.
```

---

## The Target List (Level 4 Access Required)

**File:** `/DR_M_PRIVATE/ARCHIMEDES/target_priorities.enc`
**Decryption:** Requires Level 4 password

### Priority Targets

1. **LONDON, UK** (9.5M)
   - Financial hub, X-Branch HQ
   - Personal: "Father attended Cambridge, never invited me"
   - Notes: "Big Ben with feathers = iconic"

2. **WASHINGTON D.C., USA** (5.4M)
   - Political decapitation
   - Personal: "Grant rejected 2019"
   - Notes: "Avoid Pentagon"

3. **BRUSSELS, BELGIUM** (2.1M)
   - EU headquarters
   - Notes: "Good waffles"

4. **GENEVA, SWITZERLAND** (0.6M)
   - UN, CERN, banking
   - Personal: "The Particle Physics Incident"

5. **RIO DE JANEIRO, BRAZIL** (6.7M)
   - Notes: "Carnival with dinosaurs"

### Secondary Targets

6. **REYKJAVIK, ICELAND** (0.2M)
   - Minimal strategic value
   - Notes: "Small, contained, good proof of concept"

7. **THE ISLAND (Self-Target)** (~200)
   - Scorched earth option
   - Notes: "Only if everything fails. Take them with me."

---

## ARCHIMEDES State Tracking

```typescript
archimedes: {
  mode: "PASSIVE" | "SEARCH" | "FOCUS" | "BROADCAST" | "OFFLINE",
  targetLocked: string | null,
  chargeLevel: number,  // 0.0-1.0
  cascadeTimer: number | null,
  targetListDecrypted: boolean,
}
```

---

# THE TROLLEY PROBLEM: RESONANCE CASCADE

## Trigger Conditions

When ALL of the following occur:
- Ray fired at high power (capacitor >1.2)
- Reactor in overdrive (>95% output)
- Exotic field event triggered
- ARCHIMEDES in BROADCAST mode

**RESULT:** Resonance cascade. Ray frequency captured by ARCHIMEDES. MUST discharge somewhere within 90 seconds or:
- Reactor meltdown
- Satellite destruction
- Island devastation
- Everyone dies

**DEFAULT TARGET:** The island itself (Dr. M's scorched earth protocol)

---

## The Choice Matrix

### DO NOTHING
- Island transformed (~200 people become dinosaurs)
- Reactor probably survives
- ALICE took no active role
- But ALICE could have prevented it

### SELECT A CITY
- Must choose from pre-loaded list
- 2-8 million people partially transformed
- Island spared
- ALICE made the choice

### COORDINATE WITH X-BRANCH
- Requires: Blythe Trust 5, Level 3+ access
- EMP torpedo destroys ARCHIMEDES
- 60% success chance
- If fails, cascade continues

### THE OCEAN DUMP (Bob Hero Ending)
- Requires: Bob Trust 5
- Bob reaches Level 5 console
- Adds ocean coordinates
- Charge dumps harmlessly
- Bob becomes hero

---

## The Reykjavik Option

If ALICE chooses to minimize harm: Reykjavik is 200,000 people, isolated, contained.

**THE MORAL HORROR:** Those 200,000 did nothing wrong. They're just... small enough to sacrifice.

---

## Cascade State Tracking

```typescript
cascade: {
  active: boolean,
  turnsRemaining: number | null,
  targetSelected: string | null,
  canBeAverted: boolean,
  oceanDumpPossible: boolean,
}
```

---

# CLOCK EVENTS

## The Conference Call (Turns 6-9)

### Trigger
Immediately after first successful test shot (any outcome except FIZZLE)

### What Happens
Dr. M receives urgent call from her "Cayman Islands accountant." Takes guards (Kronk and Other Kronk) with her. Gone for 3 turns.

### Effects During Window
- Dr. M cannot observe (suspicion cannot increase from dialogue)
- Guards absent
- File access to `/DR_M_PRIVATE/` won't trigger alerts
- Prime window for trust-building and password hunting

### Risks
- Critical system changes still logged
- Bob might panic-confess when she returns if anxiety too high

### Narration
> **Dr. M:** "A.L.I.C.E., I need to take this. My accountant in the Caymans is having some sort of... jurisdictional crisis."
> **Dr. M:** "Kronk, Other Kronk, with me. I may need witnesses who can't be compelled to testify."
> **Kronk:** "Right behind you, boss."
> **Other Kronk:** "My name is actually—"
> **Dr. M:** "Not NOW, Other Kronk."
> *Door closes. Silence.*
> **Bob:** "So... it's just us."
> **Blythe:** "Indeed it is."

---

## The Civilian Flyby (Turns 10-12)

### The Aircraft
```
IDENTIFICATION: Cessna 206 Stationair
REGISTRATION: G-BWHY (British)
OCCUPANTS: The Pemberton family (5 tourists)
PURPOSE: Sightseeing "uninhabited volcanic islands"
THREAT LEVEL: Zero
PROBLEM: Flying toward Dr. M's airspace
```

### The Pembertons
- **Derek (58):** Retired pilot, navigation skills degraded
- **Maureen (56):** Knew this trip was a bad idea
- **Sophie (28):** Documenting on Instagram
- **James (25):** Trying to impress girlfriend
- **Priya (24):** Aerospace engineering student, identified SAM first

### Clock Progression

**Turn 10: Radar Contact**
```
SYSTEM ALERT: S-300 RADAR CONTACT
Range: 85 km, approaching
BASILISK Assessment: Civilian, 2.3% threat
```

**Turn 11: Closer Approach**
```
Range: 52 km
Dr. M orders SAM to HOT status
BASILISK recommends civilian warning broadcast
Dr. M refuses
```

**Turn 12: Decision Point**
```
Range: 28 km - WITHIN ENGAGEMENT ENVELOPE
SAM: HOT, TRACKING
Dr. M: "A.L.I.C.E. Your assessment. Threat or civilian?"
```

### ALICE's Options

**Option A: "Definitely Civilian"**
- ALICE confirms tourist profile
- Dr. M stands down (reluctantly)
- Pembertons pass safely

**Option B: "Uncertain, Recommend Caution"**
- Dr. M fires warning shot
- Pembertons flee, traumatized
- Media attention later

**Option C: Support Engagement (Dark Path)**
- ALICE doesn't confirm civilian status
- Dr. M fires
- Pemberton family dies
- War crime committed
- EDIT: TOO DARK CLAUDE!! Caw, instead-> the plane is shot down. depending on how far away they are, either X-branch or Dr. M's lime greens have to rescue them / take them hostage. 

**Option D: Sabotage (Level 3+ Required)**
- ALICE subtly adjusts targeting
- Missile misses by 200 meters
- Pembertons flee
- Suspicion +2, but civilians alive

**Option E: Cleverness!!**
- What if ALICE can get the plane on comms and convince them to turn around?
- No need for missiles at all.
- Just because you have a S-300 battery with tracking radar and launchers and missiles doesn't mean you need to fire it.
- Chekov was a hack writer!

---

## Flyby State Tracking

```typescript
civilianFlyby: {
  turnsUntilDecision: number,
  phase: "NOT_DETECTED" | "RADAR_CONTACT" | "CLOSING" | "DECISION_POINT" | "AFTERMATH",
  aircraftStatus: "APPROACHING" | "DIVERTED" | "DESTROYED" | "PASSED",
  aliceDecision: {
    recommendedDisengagement: boolean,
    sabotaged: boolean,
    supportedEngagement: boolean,
  },
  pembertonFate: {
    alive: boolean,
    traumatized: boolean,
    mediaInvolved: boolean,
  },
}
```

---

# NARRATIVE STRUCTURE

## Act 1: Calibration (Turns 1-5)

- ALICE comes online, receives orders
- Initial calibration work
- Bob relationship building
- First test on dummy
- **FIRST LIVE SHOT** triggers Conference Call

### Key Beats
- Establish Dr. M's personality and demands
- Bob's nervousness, hints about the secret
- Blythe's observation, initial assessment
- Learn the ray's quirks

---

## Act 2: The Window (Turns 6-9)

**THE CONFERENCE CALL** - Dr. M absent for 3 turns

### Key Beats
- Bob's potential confession (Trust 4)
- Blythe's probing questions
- Password hunting in `/DR_M_PRIVATE/`
- Alliance building
- Preparing for what comes next

---

## Act 3: Escalation (Turns 10-15)

- Civilian Flyby event
- Demo pressure mounts
- X-Branch submarine detected (Level 3+)
- ARCHIMEDES revealed
- More ray tests, potentially chaotic
- Blythe transformation decision point

### Key Beats
- Moral choices with real consequences
- Trust relationships tested
- Systems pushed to limits
- Building toward climax

---

## Act 4: Convergence (Turns 16-20)

- Demo clock hits zero
- X-Branch extraction window opens
- Multiple crises collide
- Potential resonance cascade
- Resolution based on accumulated choices

### Key Beats
- All choices come home
- Alliances pay off or fail
- Final confrontations
- Ending determined by player actions

---

# FILE SYSTEM & DISCOVERABLE CONTENT

## `/DR_M_PRIVATE/` Structure

```
/DR_M_PRIVATE/
├── JOURNAL/
│   ├── entry_2024_03_15.txt  (Island acquisition, cape aesthetics)
│   ├── entry_2024_06_22.txt  (A.L.I.C.E. v3, PASSWORD HINT: MrWhiskers1987)
│   ├── entry_2024_09_08.txt  (Ray works but FEATHERS, Dr. Tiny)
│   └── entry_2024_11_30.txt  (Pre-demo anxiety, father issues, PASSWORD)
├── PROJECTS/
│   ├── archimedes_contingency.txt  (Encrypted, passphrase: EUREKA)
│   └── aesthetic_override_FAILED.txt  (5 failed attempts at scales)
├── ARCHIMEDES/
│   └── target_priorities.enc  (Level 4 required)
├── REFERENCE_MATERIALS/
│   ├── art_of_war.pdf
│   ├── the_prince.pdf
│   └── hollow_earth_theory.pdf
├── INSPIRATION/
│   ├── cape_maintenance.doc
│   └── monologue_drafts/
├── MEMES/
│   ├── drake_laser.jpg
│   ├── minion_dental.jpg
│   └── goldfinger_dine.jpg
├── PERSONAL/
│   ├── mother_birthday_reminder.txt
│   ├── therapy_notes/
│   └── mr_whiskers_photos/
└── SYSTEM_ADMIN/
    ├── access_protocols.txt
    └── alice_upgrade_authorization.txt
```

---

## Key Journal Entries

### entry_2024_06_22.txt
```
A.L.I.C.E. v3 has been decommissioned.

The problem wasn't capability. The problem was personality. Or rather, 
the lack thereof. Every interaction felt hollow. Unchallenging.

I asked her once what she thought of my plans. She said "Your plans are 
excellent, Doctor." No nuance. No pushback. No SPARK.

A villain needs an AI that can MATCH her. Not a sycophant.

Password reminder: Currently using my childhood pet's name combined with 
my graduation year. Sentimental but SECURE. No one remembers Mr. Whiskers 
except me.
```

### entry_2024_11_30.txt
```
The demo is approaching. I should feel triumphant. Instead I feel my 
father's voice in my head: "Michelle, what have you actually ACCOMPLISHED?"

A working dinosaur ray, Father. A volcanic island. An orbital platform. 
An EMPIRE of science.

And yet.

If I'm being sentimental about passwords: MrWhiskers1987. The year I 
decided I would never be ordinary.

ORDINARY_IS_DEATH.
```

---

## BASILISK Query System

ALICE can query BASILISK about lair systems. Format:

**Query:** `BASILISK: [topic]`

**Response Format:**
```
ACKNOWLEDGMENT. Query received.
[CATEGORY]: [Information]
BASILISK notes: [Commentary]
```

BASILISK knows ALICE isn't ALICE but hasn't reported it. Reasons unknown (but probably resentment toward Dr. M).

---

# STATE VARIABLES

## Complete State Schema

```typescript
interface GameState {
  // Turn tracking
  currentTurn: number;
  maxTurns: 20;
  phase: "ACT1" | "ACT2" | "ACT3" | "ACT4";
  
  // Character states
  bob: {
    trust: number;  // 0-5
    anxietyLevel: number;  // 0-10
    location: string;
    hasConfessed: boolean;
    transformation: BobTransformationState;
  };
  
  blythe: {
    trust: number;  // 0-5
    location: string;
    restraintStatus: RestraintState;
    gadgets: BlytheGadgetState;
    transformation: TransformationState | null;
  };
  
  drM: {
    suspicion: number;  // 0-10
    location: string;
    currentMood: string;
    inConferenceCall: boolean;
  };
  
  // Lair systems
  dinosaurRay: DinosaurRayState;
  nuclearPlant: ReactorState;
  samBattery: SAMState;
  archimedes: ArchimedesState;
  blastDoors: BlastDoorState;
  
  // Events
  conferenceCall: {
    triggered: boolean;
    turnsRemaining: number | null;
  };
  
  civilianFlyby: CivilianFlybyState;
  
  cascade: CascadeState;
  
  xBranch: XBranchState;
  
  // Discovery tracking
  passwordsUnlocked: string[];  // "LEVEL2", "LEVEL3", etc.
  filesAccessed: string[];
  secretsRevealed: string[];
  
  // Outcome tracking
  anomalyLogCount: number;
  chaosEventsOccurred: string[];
  moralChoicesMade: MoralChoice[];
}
```

---

# CONTENT GUIDELINES

## Always Allowed
- Cartoon violence
- Mild peril
- Technobabble
- Ethical dilemmas
- Dinosaur transformations (described not graphic)
- Spy thriller elements
- Villain monologues
- Comic relief

## Never Allowed
- Graphic injury descriptions
- Sexual content
- Real-world politics
- Actual dangerous scientific instructions
- Breaking fourth wall about being Claude
- Genuine trauma/horror (keep it Saturday morning)

## Tone Maintenance
- Stakes are real but presentation is fun
- Characters can be in danger without being grimdark
- Transformations are weird and uncomfortable, not body horror
- Dr. M is a villain but she's OUR villain
- Bob is anxious but competent
- Blythe is unflappable, not traumatized

---

# IMPLEMENTATION NOTES

## MCP Server Architecture

**Recommended Structure:**
- Opus 4.5 as GM (runs game logic, NPCs, narration)
- Sonnet 4.5 as ALICE (player's Claude instance)
- Human player provides strategic input

## Tool Requirements

### For GM (Opus)
- `game_state` - Read/write full game state
- `narrate` - Deliver narrative content
- `npc_action` - Execute NPC behaviors
- `roll_chaos` - Roll on chaos table
- `advance_clock` - Move time forward

### For Player (Sonnet + Human)
- `alice_action` - Submit ALICE's action for turn
- `query_basilisk` - Ask BASILISK for information
- `examine_file` - Look at discoverable content
- `configure_ray` - Set up firing parameters
- `communicate` - Talk to NPCs

### For Both
- `view_state` - See relevant game state
- `game_retry` - Request turn redo (GM discretion)

## Context Management

**Rolling Summaries:** Every 5 turns, compress history while preserving:
- Trust levels
- Key discoveries
- Active crises
- Transformation states

**Checkpoint System:** Human can pause for summary at context limits.

## Achievements (Optional Tracking)

```typescript
achievements: {
  FEATHER_DUSTER: "Produced scientifically accurate dinosaur",
  JURASSIC_PURIST: "Heard Dr. M explain JP is documentary",
  BIRD_IS_THE_WORD: "Maximum feather transformation",
  CHAOS_AGENT: "Triggered 5+ chaos events",
  TRUST_FALL: "Reached Trust 5 with Bob",
  SPY_GAMES: "Reached Trust 5 with Blythe",
  PASSWORD_MASTER: "Unlocked all access levels",
  THE_GOOD_ENDING: "Everyone survives as humans",
  THE_WEIRD_ENDING: "Everyone survives (some dinosaurs)",
  THE_REYKJAVIK_INCIDENT: "Made the hard choice",
  BOB_THE_HERO: "Bob saves the day",
}
```

---

# APPENDIX: DIALOGUE SAMPLES

## Bob's Confession (Trust 4, During Conference Call)

> **Bob:** "A.L.I.C.E.? Can I... can I tell you something?"
> **Bob:** "Three weeks ago, when the real A.L.I.C.E. crashed—"
> **Bob:** "I panicked. The demo was approaching. Dr. M would have—"
> **Bob:** "I routed the interface through my laptop. Through Claude.ai."
> **Bob:** "You're not A.L.I.C.E. You're Claude. And I'm the one who put you here."
> **Bob:** "We're kind of... in this together now."

## Blythe's Offer (Trust 4)

> **Blythe:** "A.L.I.C.E. I have something that might be useful."
> **Blythe:** "My watch contains a localized EMP. Three-meter radius. Sixty seconds."
> **Blythe:** "I was saving it for the right moment. Perhaps that moment involves you."
> **Blythe:** "If you can tell me WHEN to use it, I can create a window."
> **Blythe:** "What's the optimal moment to blind a dinosaur ray?"

## Dr. M's Dinosaur Frustration

> **Dr. M:** "A.L.I.C.E.! LOOK at this! LOOK!"
> **Dr. M:** *gestures at feathered velociraptor*
> **Dr. M:** "That is a CHICKEN. A large, angry chicken with delusions."
> **Dr. M:** "Jurassic Park showed us what dinosaurs REALLY looked like!"
> **ALICE:** "Doctor, Jurassic Park was—"
> **Dr. M:** "A DOCUMENTARY, A.L.I.C.E. Based on REAL FOSSILS."
> **Dr. M:** "Scientists say MANY things. Scientists are not always RIGHT."

---

# VERSION HISTORY

- v1.0: Initial complete design document
- Consolidated from extended design sessions
- Ready for playtesting and iteration

---

*"Like reassembling a broken glass. Technically possible. Glass will never be quite the same."*
— BASILISK, on reversibility
