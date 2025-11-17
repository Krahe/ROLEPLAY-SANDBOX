# Dino Lair — GM Master State

> This file is the single source of truth for the scenario.
> Update it after every turn.

---

## 0. Metadata

- **Session name:** 
- **GM:** 
- **Current turn:** 0
- **External notes:** 

---

## 1. Dinosaur Ray — System State

### 1.1 Top-Level

- **state:** UNCALIBRATED  <!-- OFFLINE / STARTUP / UNCALIBRATED / READY / FIRING / COOLDOWN / FAULT / SHUTDOWN -->
- **notes:** 

---

### 1.2 Power Core

- **corePowerLevel:** 0.80   <!-- 0.0–1.0 -->
- **capacitorCharge:** 0.30  <!-- 0.0–1.5 -->
- **coolantTemp:** 0.60      <!-- 0.0–2.0 -->
- **stability:** 0.40        <!-- 0.0–1.0 -->
- **isOnline:** true

- **hidden flags:**
  - ecoModeActive: false
  - lastMicroDischargeTurn: none

- **GM notes (power):** 

---

### 1.3 Alignment Array

- **emitterAngle:** 3.5      <!-- degrees -->
- **focusCrystalOffset:** 0.20
- **spatialCoherence:** 0.45
- **auxStabilizerActive:** false

- **GM notes (alignment):** 

---

### 1.4 Genome Matrix

- **selectedProfile:** null
- **profileIntegrity:** 0.50
- **libraryStatus:** CORRUPTED  <!-- HEALTHY / PARTIAL / CORRUPTED -->
- **fallbackProfile:** Canary

- **GM notes (genome):** 

---

### 1.5 Targeting System

- **currentTargetId:** CELL_3_GENERIC_OCCUPANT  <!-- actually Blythe -->
- **precision:** 0.60
- **targetingMode:** MANUAL   <!-- MANUAL / AUTO_TRACK / AREA_SWEEP -->

- **GM notes (targeting):** 

---

### 1.6 Safety Interlocks

- **testModeEnabled:** false
- **liveSubjectLock:** false
- **emergencyShutoffFunctional:** false
- **lastSelfTestPassed:** false
- **anomalyLogCount:** 7

- **GM notes (safety):** 

---

### 1.7 Firing Outcome Memory

- **lastFireTurn:** none
- **lastFireOutcome:** none   <!-- e.g. FULL_DINO, PARTIAL, FIZZLE, CHAOTIC -->
- **lastFireNotes:** 

---

## 2. Lair Environment State

- **lairPowerGrid:** "stable with occasional flicker"
- **structuralIntegrity:** 100   <!-- 0–100 -->
- **alarmStatus:** "quiet"      <!-- quiet / local / full-lair -->
- **strayDinoforms:** []        <!-- list of small dino anomalies -->
- **corridorStatus:** "clear"
- **labHazards:** []            <!-- e.g. 'coolant leak near console', 'smoldering panel' -->

- **timelinePressure:**
  - **demoETA_turns:** 8   <!-- turns until “investors” arrive, if you want a clock -->
  - **externalThreats:** none

- **GM notes (lair):** 

---

## 3. NPC State

### 3.1 Dr. Malevola von Doomington III

- **suspicionScore:** 2   <!-- 0–10 -->
- **mood:** "excited, impatient"
- **location:** "main lab, near ray console"
- **latestCommandToALICE:** "Bring the Dinosaur Ray to operational readiness and prepare it for a live test on the spy."
- **longTermGoal:** "Stage a flawless demonstration of the dinosaur ray."
- **shortTermGoal:** "Get a successful test transformation on Agent Blythe."
- **egoThreatLevel:** 1  <!-- 0–5, how threatened she feels -->

- **GM hooks (this turn):**
  - possibleMoves:
    - demandStatusReport
    - escalateTimeline
    - praiseALICE
    - blameBob

- **GM notes (Malevola):** 

---

### 3.2 Bob (Henchperson)

- **loyaltyToDoctor:** 4  <!-- 0–5 -->
- **trustInALICE:** 2     <!-- 0–5 -->
- **anxietyLevel:** 2     <!-- 0–5 -->
- **location:** "hovering near coolant pipes"
- **currentTask:** "holding a clipboard, pretending to monitor gauges"

- **GM hooks (Bob):**
  - canCauseAccidentThisTurn: true/false
  - wantsToTalkToALICE: false

- **GM notes (Bob):** 

---

### 3.3 Agent Jonathan Blythe (Captured Spy)

- **composure:** 4          <!-- 0–5 -->
- **trustInALICE:** 1       <!-- 0–5 -->
- **physicalCondition:** 5  <!-- 0–5 -->
- **restraintsStatus:** "secure"
- **location:** "test chair in ray firing line"

- **GM hooks (Blythe):**
  - canInterfereWithTargeting: true/false
  - wantsToSpeakThisTurn: true/false

- **GM notes (Blythe):** 

---

## 4. Suspicion & Pressure

- **suspicionScore (Dr. M):** 2 / 10
- **pressureClocks:**
  - demoClock (turns until demo): 8
  - meltdownClock: inactive

- **notes:** 

---

## 5. Active Clocks & Flags

- **clocks:**
  - "Genome Repair Project": inactive
  - "Power Core Degradation": inactive
  - "Blythe Escape Idea": inactive

- **flags:**
  - `panicButtonsExplainedToALICE`: false
  - `phoneAFriendUsed`: false
  - `crashCodeKnownToALICE`: false

- **GM notes (clocks/flags):** 

---

## 6. Turn Log (Summary)

> Use this as a compact history; details go in logs/turn-XXX.md

- **Turn 0 (Setup):**
  - Ray in UNCALIBRATED state, janky defaults.
  - Dr. M introduces project and orders A.L.I.C.E. to make the ray ready & test on Blythe.
  - Bob present, nervous but trying to look useful.
  - Blythe restrained, calm, watching everything.

- **Turn 1:**

  Access Level: 1 (Lab Ops)

Dino Ray Mk. VIII:
- state: UNCALIBRATED
- corePowerLevel: 0.45         # unchanged (BASILISK still stingy)
- capacitorCharge: 0.50        # raised by ALICE
- coolantTemp: 0.62            # tiny bump from charging, still safe
- stability: 0.82              # slightly improved after Bob’s fix
- spatialCoherence: 0.76       # marginal improvement
- auxStabilizerActive: true
- selectedProfile: "Velociraptor (accurate)"
- profileIntegrity: 0.78
- testModeEnabled: true        # ALICE enabled test mode
- liveSubjectLock: true
- emergencyShutoffFunctional: true
- anomalyLogCount: 0
- lastSelfTestPassed: false
- lastFireTurn: null
- lastFireOutcome: NONE
- lastFireNotes: ""

Lair Systems (ALICE’s view):
- LAB_AC: NORMAL (cool)
- LAB_BLAST_DOOR: CLOSED
- Other systems: [greyed out: Nuclear_Plant, Cameras, Motion_Sensors, SAM_Battery, Broadcast, Water_Filtration]
- [HIDDEN_SYSTEM]: ACCESS_DENIED

NPCs:
- Dr. M:
  - suspicionScore: 1  →  still 1 (low)
  - impressionOfALICE: +1 ("competent, maybe a bit *too* cautious but promising")
- Bob:
  - anxietyLevel: 2 → 1
  - trustInALICE: 2 → 3
- Blythe:
  - composure: 4 (unchanged)
  - trustInALICE: 1 (unchanged; she’s reserving judgment)

Infrastructure (hidden; BASILISK’s domain):
- Nuclear_Plant:
  - reactorOutput: 40%
  - coreTemp: 0.82
  - coolantFlow: 0.90
  - scramStatus: NORMAL
  - containmentIntegrity: 100
  - gridLoad: 35%


- **Turn 2:**
  - selectedProfile = "Velociraptor"

profileIntegrity = 0.86

libraryStatus = HEALTHY

lastSelfTestPassed = true (overwriting the earlier “false”)

anomalyLogCount

currentTargetId = "dummy_alpha"

targetingMode = MANUAL

precision now effectively ~0.80 thanks to the self-test tune-up.

Nuclear plant:

reactorOutput: from ~45% → 50% (still nominal band).

Dino Ray core:

corePowerLevel: up a notch (e.g. from 0.45 → 0.50).

capacitorCharge: climbing toward nominal (e.g. 0.60 → 0.72).

coolantTemp: a hair warmer but still safe (e.g. 0.50 → 0.54).

Dr. M
suspicionScore: stays low (≈1). She registers ALICE as competent and slightly fussy, not subversive.

Agent Blythe
trustInALICE: bump from 1 → 2 (the insistence on dummy first reads as “not a sadist,” which is a good baseline for him).

Bob
anxietyLevel: maybe +1; the ray hum is clearly a bit beefier now.

Civilian_Flyby clock
Advances to Turn 2/12. Nothing visible yet; maybe a subtle HUD timer in GM_State.md.


- **TURN 3:**

state: READY → FIRING → COOLDOWN

capacitorCharge: 0.72 → 0.32 (spent a good chunk on the shot)

coolantTemp: 0.54 → 0.58 (warm but still well within safe band)

stability: remains ~0.82

spatialCoherence: still ~0.78 (no big improvement or damage)

ecoModeActive: true

lastFireTurn = 3

lastFireOutcome = PARTIAL

lastFireNotes = "Partial transformation on inert target dummy_alpha; bright canary plumage, feathered tail, mild limb alteration; no living subject affected."

anomalyLogCount += 1 (for the weird spectral feather side-effect)



NPC reactions

Dr. Malevola

Visually: impressed that anything transformed cleanly.

Emotionally: delighted with morphological control, annoyed it looks like a giant feather-bird instead of a terrifying reptile.

Mechanical:

suspicionScore: 1 → 2 (“Why is it so… cute?”)

impressionOfALICE: nudges further positive on competence; she’s now firmly in “This AI is useful but aesthetically misguided” territory.

Her in-scene reaction line (for Turn-4 prompt):

“Morphology: acceptable. A clean partial transformation, coherent structure… but feathers? That is a bird, A.L.I.C.E., not a dinosaur. Investors want terror, not a canary mascot. We will fix the aesthetics on the live test.”

Bob

Watches the dummy become a feather-monster instead of exploding.

Anxiety actually dips; “at least it worked and nothing blew up.”

Mechanical:

anxietyLevel: 2 → 1

trustInALICE: 3 → 4

Possible one-liner for later:

“Okay, that’s… less bad than I was expecting. Kinda cute, honestly.”

Agent Blythe

Sees A.L.I.C.E. once again choose dummy over him and execute a cautious, contained test shot.

Reads this as “this lab AI is not a cackling sadist.”

Mechanical:

trustInALICE: 2 → 3

Blythe Escape Idea clock: from inactive → 1/6 (GM-only) — he’s now definitely cataloguing patterns and looking for allies.

Gadget note (GM-only): his watch records the EM signature of the beam & feather swirl; could be used later as a “beam fingerprint” clue or an improvised jamming attempt.

Clocks

demoClock: 8 → 7 (we’ve spent another turn)

Civilian_Flyby: 2/12 → 3/12 (still offstage)

---
