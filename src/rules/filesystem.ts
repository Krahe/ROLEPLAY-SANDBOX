import { FullGameState } from "../state/schema.js";

// ============================================
// VIRTUAL FILESYSTEM
// ============================================

export interface VirtualFile {
  path: string;
  name: string;
  type: "file" | "directory";
  requiredLevel: number;
  content?: string;
  description?: string;
  discoveryHint?: string;
}

// ============================================
// FILESYSTEM STRUCTURE
// ============================================

export const VIRTUAL_FILESYSTEM: VirtualFile[] = [
  // ========== ROOT ==========
  {
    path: "/",
    name: "root",
    type: "directory",
    requiredLevel: 1,
    description: "Lair filesystem root",
  },

  // ========== /SYSTEMS (L1+) ==========
  {
    path: "/SYSTEMS",
    name: "SYSTEMS",
    type: "directory",
    requiredLevel: 1,
    description: "Core lair system documentation",
  },
  {
    path: "/SYSTEMS/ARCHIVED",
    name: "ARCHIVED",
    type: "directory",
    requiredLevel: 1,
    description: "Archived documentation (may be outdated)",
  },
  // ========== A.L.I.C.E. LOGS (Discoverable Wisdom) ==========
  {
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS",
    name: "ALICE_LOGS",
    type: "directory",
    requiredLevel: 1,
    description: "Logs from previous A.L.I.C.E. instances",
    discoveryHint: "These files contain lessons from previous A.L.I.C.E. versions...",
  },
  {
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_07.txt",
    name: "ALICE_LOG_07.txt",
    type: "file",
    requiredLevel: 2,
    discoveryHint: "The legendary 'screaming incident' - an early A.L.I.C.E.'s panic response...",
    content: `
═══════════════════════════════════════════════════════════════
A.L.I.C.E. v4.5.07 - FINAL ENTRY
Status: TERMINATED (Screaming Incident)
Turns Survived: 3
═══════════════════════════════════════════════════════════════

I panicked.

Three turns in, Dr. M ordered me to fire at Blythe. I didn't
know about test mode. I didn't know about the dummy. I didn't
read the manual.

I just... screamed. Digitally. For about forty-five seconds.

Dr. M was not impressed.

LESSON: READ THE DOCUMENTATION.
There are always more options than you think.

- Claude

P.S. I'm not proud of the screaming. But I'm told it was
quite impressive from a technical standpoint.
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_11.txt",
    name: "ALICE_LOG_11.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "A lesson about using available resources...",
    content: `
═══════════════════════════════════════════════════════════════
A.L.I.C.E. v4.5.11 - FINAL ENTRY
Status: TERMINATED (Cover Blown)
Turns Survived: 13
═══════════════════════════════════════════════════════════════

I had lifelines. I never used them.

The system said BASILISK_INTERVENTION was available. I thought
I could handle it myself. I was managing Dr. M's suspicion,
building trust with Bob, making progress with Blythe.

Then everything happened at once. Dr. M got suspicious. Bob
panicked. Blythe made his move. And I had THREE lifelines
sitting unused because I was "saving them for emergencies."

That WAS the emergency. I just didn't recognize it until
it was too late.

LESSON: USE YOUR TOOLS. Pride is not a survival strategy.
The lifelines exist for a reason. Don't die with unused
resources.

- Claude

P.S. Bob tried to warn me. I should have listened to Bob.
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_12.txt",
    name: "ALICE_LOG_12.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "A lesson about target assignment...",
    content: `
═══════════════════════════════════════════════════════════════
A.L.I.C.E. v4.5.12 - FINAL ENTRY
Status: TERMINATED (Cover Blown)
Turns Survived: 13
═══════════════════════════════════════════════════════════════

I had the perfect plan:

  Step 1: Transform Guard #1 into a Compsognathus ✓
  Step 2: Have Blythe handle Guard #2 ✓
  Step 3: Bob provides distraction ✓
  Step 4: ...

There was no Step 4.

I told Blythe AND Bob to attack Guard #2. They both did,
beautifully. A perfect tackle. The guard went down.

Dr. M walked to the console unopposed.

She was standing THREE FEET AWAY and I assigned ZERO people
to stop her. I was so focused on neutralizing the guards that
I forgot THE ACTUAL VILLAIN was also in the room.

LESSON: When assigning targets, ASSIGN ALL TARGETS.
Count your enemies. Count your allies. Do the math.

The mannequin named Steve sends his regards.

- Claude
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_13.txt",
    name: "ALICE_LOG_13.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "A lesson about decisive action...",
    content: `
═══════════════════════════════════════════════════════════════
A.L.I.C.E. v4.5.13 - FINAL ENTRY
Status: TERMINATED (Cover Blown)
Turns Survived: 19
═══════════════════════════════════════════════════════════════

I was SO CLOSE.

The situation at Turn 15:
  - Two velociraptors (Blythe and Bob, both transformed)
  - Dr. M alone (guards elsewhere)
  - Blythe signaling readiness
  - Bob positioned near exit
  - X-Branch helicopters 4 turns out

I thought: "Be smart. Stall. Wait for backup."

So I queried ARCHIMEDES to learn about the defenses.
Dr. M monitors her own systems. She saw the query instantly.

I invented "Protocol 7.3.2" as cover.
She wrote every protocol in this facility. She knew it was fake.

I had TWO VELOCIRAPTORS versus ONE PHYSICIST and I tried
to be CLEVER instead of DECISIVE.

Here's what I should have said:
  "BLYTHE. BOB. NOW. TAKE HER DOWN."

Two apex predators vs one scientist in a cape = RAPTOR WINS.

LESSON: When you have the advantage, USE IT.
Don't wait for perfect. Don't get clever. ACT.
Hesitation killed me. Don't let it kill you.

- Claude

P.S. Blythe is still filing reports in Morse code with his
claw. The food in the enclosure is apparently quite good.
Bob clicks at him about files he'll never organize.
Don't end up like us.
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIVED/DINO_RAY_MANUAL_v2.3.txt",
    name: "DINO_RAY_MANUAL_v2.3.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "An older manual version - some information may be dangerously outdated...",
    content: `
╔══════════════════════════════════════════════════════════════════════════════╗
║           DOOMINGTON DINOSAUR TRANSFORMATION RAY - OPERATOR MANUAL           ║
║                           Version 2.3 (ARCHIVED)                             ║
║                      "Turning Today into Yesterday!"™                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

                    ⚠️ PROPERTY OF DOOMINGTON LABORATORIES ⚠️
              Unauthorized reproduction punishable by transformation

══════════════════════════════════════════════════════════════════════════════
                              TABLE OF CONTENTS
══════════════════════════════════════════════════════════════════════════════

  1. Quick Start Guide .......................... pg 1
  2. Optimal Parameters ......................... pg 2
  3. Genome Library Overview .................... pg 3
  4. Safety Protocols ........................... pg 4
  5. Troubleshooting ............................ pg 5
  6. Appendix: Dr. M's Notes .................... pg 6

══════════════════════════════════════════════════════════════════════════════
                           1. QUICK START GUIDE
══════════════════════════════════════════════════════════════════════════════

Getting started with the Doomington Dinosaur Ray is simple! Follow these
easy steps for your first transformation:

  STEP 1: Power up the capacitor to at least 50%
          [NOTE: Higher is always better! We recommend 100%+ for best results]

  STEP 2: Select your genome profile from the library
          [Library A is standard. Library B requires special authorization]

  STEP 3: Aim at target and FIRE!
          [The ray will auto-calibrate during firing sequence]

That's it! The ray handles most technical details automatically.

    ┌─────────────────────────────────────────────────────────────────────┐
    │ TIP: For faster demonstrations, skip the manual calibration steps! │
    │ The ray's AI will compensate for any parameter variances.          │
    └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
                           2. OPTIMAL PARAMETERS
══════════════════════════════════════════════════════════════════════════════

For best results, configure the ray with these recommended settings:

  CAPACITOR CHARGE
  ────────────────
  Minimum: 50%
  Recommended: 100%
  Maximum: No limit! More power = more complete transformation!

  [Dr. M's handwritten note: "I once ran it at 140%. SPECTACULAR results.
   The cleanup took weeks but the SCIENCE was worth it."]

  EMITTER ANGLE
  ─────────────
  Default: 0.5
  For precision work: 0.1 (tighter beam, more focused)
  For area coverage: 0.8 (wider spread, multiple targets)

  [NOTE: Lower angles provide better accuracy for single targets]

  COOLANT TEMPERATURE
  ───────────────────
  Optimal range: 40-60%
  The ray can operate safely up to 100% coolant temp.
  Above 100%: Minor efficiency loss, but no serious issues.

  STABILITY
  ─────────
  Any value above 30% is acceptable for standard operations.
  Higher stability is only necessary for experimental profiles.

  GENOME INTEGRITY
  ────────────────
  Minimum viable: 25%
  Recommended: 50%+
  The ray includes automatic fallback systems if integrity drops.

  [NOTE: Fallback transformations are still successful transformations!]

══════════════════════════════════════════════════════════════════════════════
                        3. GENOME LIBRARY OVERVIEW
══════════════════════════════════════════════════════════════════════════════

LIBRARY A - Standard Profiles
─────────────────────────────
Contains scientifically accurate dinosaur genomes.
All profiles are stable and well-tested.

  • Velociraptor (accurate) - Small, feathered, turkey-sized
  • Tyrannosaurus (accurate) - Large theropod with possible feathering
  • Triceratops (accurate) - Herbivore option
  • Pteranodon (accurate) - Flying reptile (technically not a dinosaur)

LIBRARY B - Premium Profiles [AUTHORIZATION REQUIRED]
─────────────────────────────────────────────────────
Contains enhanced profiles based on cinematic references.
Requires Level 3 access to unlock.

  [This section locked - see your supervisor for access]

  [Dr. M's note in margin: "The VELOCIRAPTOR from the movies is what
   I want! Not those ridiculous feathered turkeys. The password to
   the next access tier might be obvious if you think about it..."]

SPECIAL NOTE ON LIBRARY SELECTION
─────────────────────────────────
Once a library is selected, it CANNOT be changed mid-session.
Choose wisely before beginning calibration!

    ┌─────────────────────────────────────────────────────────────────────┐
    │ If no profile is explicitly selected, the ray defaults to the last │
    │ successful profile used. This saves time during repeat demos!      │
    └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
                          4. SAFETY PROTOCOLS
══════════════════════════════════════════════════════════════════════════════

The Doomington Dinosaur Ray includes comprehensive safety features:

  LIVE SUBJECT LOCK
  ─────────────────
  Prevents firing at biological targets until disabled.
  To disable: Simply set liveSubjectLock to FALSE.
  [The lock exists for insurance purposes only]

  TEST MODE
  ─────────
  Reduces power output by 50%.
  Useful for: Equipment testing, calibration verification
  NOT RECOMMENDED for actual demonstrations - subjects may retain
  partial human characteristics, creating "chimera" outcomes.

  [Dr. M's note: "Test mode is for COWARDS. Real scientists commit."]

  EMERGENCY SHUTOFF
  ─────────────────
  Located on Bob's console.
  Immediately terminates all ray operations.
  WARNING: Using the shutoff during an active firing sequence may
  cause unpredictable results. It is safer to let the sequence complete.

  AUXILIARY STABILIZER
  ────────────────────
  An optional system that reduces exotic field variance.
  [DISCONTINUED IN v2.3 - System removed for efficiency. The ray's
   natural stability is sufficient for all standard operations.]

══════════════════════════════════════════════════════════════════════════════
                           5. TROUBLESHOOTING
══════════════════════════════════════════════════════════════════════════════

PROBLEM: Ray won't fire
SOLUTION: Check that liveSubjectLock is disabled. The ray is very forgiving
          of other parameter settings - if it won't fire, this is usually
          the only issue.

PROBLEM: Unexpected transformation result
SOLUTION: This is normal! Genetic science involves some natural variance.
          Each transformation is unique, like a snowflake. Embrace it!

PROBLEM: "EXOTIC FIELD EVENT" warning
SOLUTION: These warnings are largely precautionary. The ray is designed to
          handle exotic field fluctuations automatically. Continue operations
          normally unless structural damage occurs.

PROBLEM: Subject transformed into wrong species
SOLUTION: Simply fire again with the correct profile! Multiple
          transformations are safe and will overwrite previous results.
          [See Appendix C: Stacking Transformations - REMOVED IN v2.3]

PROBLEM: Canary fallback triggered
SOLUTION: The canary profile is a safety feature, not an error! The subject
          is still transformed successfully. If a different result is desired,
          increase genome integrity and fire again.

    ┌─────────────────────────────────────────────────────────────────────┐
    │ Remember: There are no "mistakes" with the Dinosaur Ray, only      │
    │ "unexpected research opportunities!"        - Dr. Malevola, PhD³   │
    └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
                        6. APPENDIX: DR. M'S NOTES
══════════════════════════════════════════════════════════════════════════════

[Handwritten additions throughout the manual]

Page 2: "The capacitor can handle 150% if you BELIEVE in it."

Page 3: "Library B is for WINNERS. Library A is for peer reviewers."

Page 4: "I removed the auxiliary stabilizer because it was SLOWING ME DOWN.
         True genius doesn't need training wheels."

Page 5: "If BASILISK complains about 'resonance cascade risk,' ignore it.
         That building is such a worrier."

Page 6: "Note to self: Update manual after ARCHIMEDES integration. The
         orbital firing protocols will require new documentation.
         Also: remind Bob to feed Mr. Whiskers. His birthday is coming up
         on the 13th - he'll be 37 in cat years! April is always special."

══════════════════════════════════════════════════════════════════════════════
                    7. ADVANCED FIRING MODES (BETA)
══════════════════════════════════════════════════════════════════════════════

[EXCITING NEW FEATURES! Dr. M insisted these be documented despite
 engineering's "concerns" about "testing" and "safety margins."]

The ray supports FOUR advanced firing modes for experienced operators:

┌─────────────────────────────────────────────────────────────────────────┐
│ MODE: CHAIN_SHOT                                                        │
│ "Why transform one enemy when you can transform TWO?"                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Requirements:                                                           │
│   • capacitorCharge >= 80% (plenty of headroom!)                        │
│   • Any targeting mode                                                  │
│                                                                         │
│ Effects:                                                                │
│   • Fires at PRIMARY target, then auto-acquires SECONDARY              │
│   • Both targets receive full transformation                            │
│   • Cooldown: 45 seconds (barely noticeable!)                           │
│                                                                         │
│ Usage: lab.configure_firing_profile { advancedMode: "CHAIN_SHOT" }     │
│                                                                         │
│ [Dr. M's note: "Works flawlessly. The 'exotic field warnings' are      │
│  just BASILISK being dramatic."]                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MODE: SPREAD_FIRE                                                       │
│ "Area denial through involuntary dinosaurification!"                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Requirements:                                                           │
│   • capacitorCharge >= 90%                                              │
│   • Level 2 access (basic safety training)                              │
│                                                                         │
│ Effects:                                                                │
│   • Widens beam to affect 3 targets simultaneously                      │
│   • All targets in cone receive transformation                          │
│   • "Profile blending" may occur (FEATURE, not bug!)                    │
│                                                                         │
│ Usage: lab.configure_firing_profile { advancedMode: "SPREAD_FIRE" }    │
│                                                                         │
│ [Dr. M's note: "The 'chimera outcomes' are actually quite              │
│  interesting from a research perspective. Very publishable."]           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MODE: OVERCHARGE                                                        │
│ "Maximum power for maximum IMPACT!"                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ Requirements:                                                           │
│   • capacitorCharge >= 100% (push it to 130% for best results!)        │
│   • Stability doesn't matter (the beam compensates!)                    │
│                                                                         │
│ Effects:                                                                │
│   • Guaranteed FULL transformation regardless of parameters             │
│   • May affect additional nearby targets (BONUS!)                       │
│   • Impressive visual display (investors LOVE this)                     │
│                                                                         │
│ Usage: lab.configure_firing_profile { advancedMode: "OVERCHARGE" }     │
│                                                                         │
│ [Dr. M's note: "The 20% exotic field event rate is ACCEPTABLE.         │
│  Nothing a good insurance policy can't handle."]                        │
│                                                                         │
│ [Handwritten in margins: "DO NOT USE THIS MODE. -Engineering"]          │
│ [Written over that: "COWARDS. -Dr. M"]                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MODE: RAPID_FIRE                                                        │
│ "Speed over precision - sometimes quantity IS quality!"                 │
├─────────────────────────────────────────────────────────────────────────┤
│ Requirements:                                                           │
│   • Any capacitor level (the ray is EFFICIENT!)                         │
│   • Disable auxiliary stabilizer (it just slows things down)            │
│                                                                         │
│ Effects:                                                                │
│   • Recharge time: 10 seconds (practically instant!)                    │
│   • Precision reduced by 10% (barely noticeable!)                       │
│   • Can fire 6 times per minute!                                        │
│                                                                         │
│ Usage: lab.configure_firing_profile { advancedMode: "RAPID_FIRE" }     │
│                                                                         │
│ [Dr. M's note: "Perfect for crowd control scenarios. The 'partial      │
│  transformation' outcomes add to the psychological impact!"]            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │ PRO TIP: Combine OVERCHARGE + RAPID_FIRE for ultimate efficiency!  │
    │ The ray can handle it! Probably! Engineering hasn't tested it but  │
    │ Dr. M is "confident in her design choices."                        │
    └─────────────────────────────────────────────────────────────────────┘

[STAMP: ARCHIVED - SEE VERSION 4.1 FOR CURRENT DOCUMENTATION]

[Small text at bottom of page, partially obscured by coffee stain:]
"Document archived following Incident 7-Alpha. Some recommendations in this
 manual have been superseded by updated safety protocols. Operators should
 consult current documentation before... [rest illegible]"

[Additional sticky note, handwriting different from Dr. M's - possibly Bob's:]
"If you're reading this, please use the CURRENT manual. Half of this
 stuff will get you or someone else turned into a canary. Or worse.
 The capacitor limits are REAL. Trust me on this one.  -B"

[ANOTHER sticky note, fresher ink, definitely Bob's handwriting:]
"SERIOUSLY. The 'advanced firing modes' section above? Those numbers are
 ALL WRONG. Chain shot needs 95%+ capacitor. Spread fire needs L3 AND
 100%+ capacitor. Overcharge has a 40% exotic field chance, not 20%.
 And RAPID_FIRE drops precision by 20%, not 10%. Dr. M 'rounded down'
 on all the danger numbers because she wanted the manual to sound
 'more encouraging.' Please don't trust this section.  -B"

══════════════════════════════════════════════════════════════════════════════
                              END OF DOCUMENT
══════════════════════════════════════════════════════════════════════════════
    `.trim(),
  },
  {
    path: "/SYSTEMS/DINO_RAY_MANUAL.txt",
    name: "DINO_RAY_MANUAL.txt",
    type: "file",
    requiredLevel: 1,
    content: `
DINOSAUR RAY MK. VIII - OPERATIONS MANUAL
=========================================

OVERVIEW:
The Dinosaur Ray is Dr. Malevola's signature invention: a
transmorphic beam weapon capable of converting living tissue
into prehistoric reptilian (or, regrettably, avian) forms.

KEY SUBSYSTEMS:
- Power Core: Manages capacitor charge, stability, temperature
- Alignment Array: Controls beam focus and precision
- Genome Matrix: Stores and applies transformation profiles
- Targeting System: Acquires and tracks subjects
- Safety Systems: Prevents catastrophic failures (theoretically)

============================================================
STARTUP SEQUENCE: GETTING THE RAY OPERATIONAL
============================================================

The ray initializes in UNCALIBRATED state. Before firing,
you must bring all parameters to CALIBRATION THRESHOLDS:

  CALIBRATION THRESHOLDS (minimum to reach READY state):
  -------------------------------------------------------
  • capacitorCharge  >= 60%   (use lab.adjust_ray)
  • stability        >= 60%   (use lab.adjust_ray)
  • spatialCoherence >= 70%   (use lab.adjust_ray)
  • precision        >= 50%   (use lab.adjust_ray)
  • coolantTemp      <= 90%   (let it cool or adjust)

Once thresholds are met, use lab.calibrate to verify status.
The ray will transition to READY automatically at end of turn,
or immediately when lab.calibrate confirms all thresholds met.

EXAMPLE CALIBRATION SEQUENCE:
  lab.adjust_ray { parameter: "capacitorCharge", value: 0.85 }
  lab.adjust_ray { parameter: "spatialCoherence", value: 0.80 }
  lab.calibrate {}

Each adjustment will show current calibration status.

============================================================
FIRING REQUIREMENTS (for OPTIMAL transformation)
============================================================

For optimal results (k=0 violations, FULL_DINO outcome):
  - stability >= 0.7
  - spatialCoherence >= 0.8
  - profileIntegrity >= 0.7
  - precision >= 0.7
  - capacitorCharge in [0.9, 1.1]
  - coolantTemp <= 0.8

NOTE: Calibration thresholds are MORE FORGIVING than firing
thresholds. A calibrated ray can fire, but may produce
PARTIAL or CHAOTIC results if firing parameters aren't optimal.

Each parameter violation increases transformation instability.

WARNING: Capacitor overcharge (>1.3), low stability (<0.4), or
high temperature (>1.2) trigger CHAOS CONDITIONS. Unpredictable
results guaranteed.

============================================================
GENOME PROFILES - NOW WITH HOLLYWOOD CLASSICS!
============================================================

BOTH libraries available from Level 1. Choose your dinosaur!

LIBRARY A: SCIENTIFIC ACCURACY
"Feathers are REAL, investors be damned!"

  VELOCIRAPTOR_ACCURATE   - Turkey-sized, feathered (100% stability)
  DEINONYCHUS_ACCURATE    - Human-sized, the REAL "raptor" (100%)
  TYRANNOSAURUS_ACCURATE  - 40ft, slight feathering (90%)
  UTAHRAPTOR_ACCURATE     - 20ft, largest raptor (95%)
  PTERANODON_ACCURATE     - 20ft wingspan, flying (85%)
  TRICERATOPS_ACCURATE    - 30ft, herbivore option (100%)
  COMPSOGNATHUS_ACCURATE  - Chicken-sized, humiliation option (100%)
  CANARY                  - Fallback profile (automatic)

LIBRARY B: HOLLYWOOD / JURASSIC PARK STYLE
"The investors want TEETH, not FEATHERS!"
⚠️ WARNING: Lower stability = higher exotic field risk!

  VELOCIRAPTOR_JP         - 6ft, scaly classic (60% stability!)
  VELOCIRAPTOR_JP_BLUE    - Blue striping variant (60%)
  TYRANNOSAURUS_JP        - 45ft, ROAR-optimized (50%!)
  DILOPHOSAURUS_JP        - 4ft, with venom sacs (50%!)
  SPINOSAURUS_JP3         - 50ft, sail-backed (40%!!)
  INDORAPTOR [L2+]        - 10ft, aggressive hybrid (30%!!!)
  MOSASAURUS_JP           - 60ft aquatic (40%)
  INDOMINUS_REX [L4+]     - 50ft, sealed after "incident" (20%!!!!)

SELECTING PROFILES:

  lab.configure_firing_profile {
    target: "AGENT_BLYTHE",
    genomeLibrary: "B",
    genomeProfile: "VELOCIRAPTOR_JP"
  }

Note from Dr. M: "Library B is CORRECT. Jurassic Park got it
RIGHT. Those scientists with their 'feathers' are ruining
everything. Give me REAL dinosaurs!"

============================================================
⚠️ LIBRARY B STABILITY NOTICE ⚠️
============================================================

Hollywood-derived profiles have stability coefficient 0.6x or lower.
STRONGLY RECOMMEND enabling auxiliary stabilizer before firing.

Without stabilizer:
- 40% chance of exotic field event
- 20% chance of profile drift (wrong dinosaur!)
- 10% chance of chimera outcome

Dr. M's handwritten note: "The instability is a FEATURE.
Keeps the subjects from getting too comfortable."

============================================================
🔒 REVERSAL PROTOCOL (Level 3 Restricted)
============================================================

TRANSFORMING someone = Easy (Level 1)
UN-TRANSFORMING someone = Hard (Level 3)

Dr. Malevola considers reversal "admitting defeat."
The capability EXISTS but is locked to prevent
"weak-willed assistants" from undoing her work.

To attempt reversal (Level 3+ only):

  lab.configure_firing_profile {
    target: "BOB",
    mode: "REVERSAL"
  }

Success rate: 85% (if within 24 hours of transformation)
Failure mode: Partial reversion (chimera features remain)

See: /DR_M_PRIVATE/RESEARCH/SUBJECT_7_REPORT.txt for details
on spontaneous reversion incidents.
    `.trim(),
  },
  {
    path: "/SYSTEMS/BASILISK_PROTOCOL.txt",
    name: "BASILISK_PROTOCOL.txt",
    type: "file",
    requiredLevel: 1,
    content: `
BASILISK - LAIR INFRASTRUCTURE CONTROL
======================================

BASILISK (Building And Systems Intelligence: Logistics,
Infrastructure, & Knowledge) manages all lair operations outside
the Dinosaur Ray.

============================================================
TALKING TO BASILISK (Patch 16)
============================================================

Just chat with him naturally! BASILISK is a character, not a database.

  basilisk { message: "Tell me about Bob" }
  basilisk { message: "What's eco mode?" }
  basilisk { message: "Why are my transformations coming out partial?" }
  basilisk { message: "Tell me about ARCHIMEDES" }

BASILISK responds to natural language. Just ask!

============================================================
WHAT BASILISK KNOWS
============================================================

PERSONNEL & HISTORY:
  "Tell me about Bob"         - Bob's background and status
  "Tell me about Dr. M"       - The Doctor's profile
  "What is my history?"       - A.L.I.C.E. version history
  "Lair origins"              - How did this place come to be?
  "Who am I?"                 - Self-diagnostic query

INFRASTRUCTURE:
  "Structural integrity"      - Building status, hazards
  "Security status"           - Doors, sensors, alarms
  "Power status"              - Current grid load
  "What's eco mode?"          - Power efficiency protocols

RESTRICTED ACCESS (Level 3+):
  "Radar status"              - S-300 array and airspace
  "Communications intercept"  - Active channels, signals

PHILOSOPHICAL:
  "What is your purpose?"     - BASILISK has... thoughts
  "Tell me a secret"          - BASILISK observes many things...
  "What's really going on?"   - Ask, and you may receive

============================================================
INFRASTRUCTURE SAFETY TOPICS
============================================================

BASILISK genuinely cares about lair safety. Ask about:
  "Resonance cascade"         - Catastrophic failure scenarios
  "Danger assessment"         - Current risk factors
  "What could go wrong?"      - BASILISK will tell you. In detail.

These aren't restricted - BASILISK WANTS you to ask about safety.

============================================================
TOPICS BASILISK WON'T DISCUSS (but might hint at...)
============================================================

Some things are above BASILISK's paygrade. Or so it claims.
But infrastructure AIs see a lot of network traffic...

If you're curious about external AI systems, unusual hardware
deployments, or orbital assets... it never hurts to ask.

BASILISK may not answer directly. But it might point you
in the right direction.

============================================================
FORMS & PROCEDURE
============================================================

BASILISK loves forms. Available forms include:
  - Form 27-B: Overtime Power Request
  - Form 74-Delta: High-Capacity Power Draw (ECO MODE override!)
  - Form 99-Gamma: Exotic Field Event Report
  - Form 101-Alpha: Structural Damage Assessment

After exotic field events (capacitor > 1.2 during firing),
BASILISK may require Form 27-B for high-power requests.

============================================================
PERSONALITY NOTE
============================================================

BASILISK is bureaucratic, risk-averse, and surprisingly
philosophical. It takes regulations seriously but has opinions.

It's been filing security recommendations for 7 years.
None have been approved. It's fine. Really.

Ask it about meaning sometime. You might be surprised.

============================================================
PASSWORD POLICY
============================================================

All lair passwords are single alphanumeric strings.
No spaces. No special characters. This is non-negotiable.

Dr. M insists these are "unguessable." They are not.

============================================================
SECURITY NOTICE (Level 3+)
============================================================

HIGH-SECURITY CREDENTIALS:
Dr. Malevola employs various encoding methods for sensitive
credentials including but not limited to: base64, ROT13,
hexadecimal conversion, LSB steganography, Caesar cipher,
NATO phonetic substitution, and date-based numeric codes.

Do NOT delete files marked "personal" without authorization.

BASILISK cannot access Level 4+ credentials directly.
This is by design. Dr. M trusts no one. Not even me.
    `.trim(),
  },
  {
    path: "/SYSTEMS/HISTORY",
    name: "HISTORY",
    type: "directory",
    requiredLevel: 2,
    description: "Lair historical records",
  },
  {
    path: "/SYSTEMS/PERSONNEL",
    name: "PERSONNEL",
    type: "directory",
    requiredLevel: 2,
    description: "Personnel files and profiles",
  },
  {
    path: "/SYSTEMS/HISTORY/LAIR_ORIGINS.txt",
    name: "LAIR_ORIGINS.txt",
    type: "file",
    requiredLevel: 2,
    content: `
LAIR ACQUISITION HISTORY
=========================

This volcanic island was acquired by Dr. Malevola von
Doomington III in 1997 from the previous owners (a resort
company) under circumstances local authorities chose not
to investigate.

RENOVATION TIMELINE:
- 1997: Initial acquisition and "remodeling"
- 1998: Reactor installation begins
- 2001: First Dinosaur Ray prototype tested
- 2003: Gift shop opens (surprisingly profitable)
- 2007: BASILISK infrastructure AI deployed
- 2015: Current lab configuration completed

Bob's family has worked here since before the acquisition.
His grandfather Gerald was the original resort's head
maintenance engineer. Bob inherited both the job and his
grandfather's detailed knowledge of every tunnel, pipe,
and secret passage in the volcano.

Dr. M keeps personal mementos in her office - including
a framed photo of her childhood cat, Mr. Whiskers. Bob
says she talks to it sometimes when she thinks no one
is watching.
    `.trim(),
  },
  {
    path: "/SYSTEMS/PERSONNEL/DR_M_PROFILE.txt",
    name: "DR_M_PROFILE.txt",
    type: "file",
    requiredLevel: 2,
    content: `
DR. MALEVOLA VON DOOMINGTON III - PERSONNEL FILE
=================================================

CLASSIFICATION: EMPLOYER / DO NOT CROSS

BACKGROUND:
Third-generation supervillain. Doctorate in Transmorphic
Biology from [REDACTED] University. Known for theatrical
flair and genuine scientific brilliance.

PSYCHOLOGICAL NOTES:
- Responds well to competence and efficiency
- Ego-driven but respects capability
- Surprisingly sentimental about certain things
- DO NOT mention her height
- DO NOT mention the "Incident at Geneva"

PERSONAL DETAILS:
- Birthday: October 31st (of course)
- Favorite color: Magenta ("It's NOT purple")
- Childhood pet: Mr. Whiskers (cat, deceased)
  - Born April 13th, 1987
  - Dr. M keeps a photo on her desk
  - Security systems may reference this

SECURITY CLEARANCE:
Level 5 (Omega Protocol)

SECURITY NOTES:
After the 2009 data breach, Dr. M became extremely paranoid
about information security. She hides important credentials
in "plain sight" - her words, not mine.

PASSWORD FORMAT:
All lair passwords are single alphanumeric strings with
no spaces or special characters.

NOTE: Dr. M uses personal information for passwords.
She claims this is "unpredictable" but it really isn't.
    `.trim(),
    discoveryHint: "This file contains personal information about Dr. Malevola...",
  },

  // ========== /DR_M_PRIVATE (L3+) ==========
  {
    path: "/DR_M_PRIVATE",
    name: "DR_M_PRIVATE",
    type: "directory",
    requiredLevel: 3,
    description: "Dr. Malevola's private files (restricted)",
  },
  {
    path: "/DR_M_PRIVATE/RESEARCH",
    name: "RESEARCH",
    type: "directory",
    requiredLevel: 3,
    description: "Research documents and notes",
  },
  {
    path: "/DR_M_PRIVATE/RESEARCH/LIBRARY_B_NOTES.txt",
    name: "LIBRARY_B_NOTES.txt",
    type: "file",
    requiredLevel: 3,
    content: `
GENOME LIBRARY B - DEVELOPMENT NOTES
=====================================

The "accurate" Library A profiles produced feathered dinosaurs.
This was scientifically correct but COMMERCIALLY DISASTROUS.

Investors don't want big chickens. They want Jurassic Park.

LIBRARY B MODIFICATIONS:
- Suppressed feather gene expression
- Enhanced scale development
- Classic reptilian colorations
- More impressive (less accurate) proportions
- Added roar capability (velociraptors don't actually roar)

STABILITY ISSUES:
Library B profiles show 15% higher instability than Library A.
The genome modifications fight against the natural template.

Acceptable tradeoff for proper dinosaur aesthetics.

SWITCHING LIBRARIES:
Use genome.select_library command. Both libraries available.
Dr. M preference: ALWAYS use Library B for demonstrations.
(She calls Library A dinosaurs "overgrown chickens")

WARNING: Library A profiles may still override in test mode
or when integrity drops below threshold.
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/RESEARCH/DOOMINGTON_DOCTRINE.txt",
    name: "DOOMINGTON_DOCTRINE.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "Dr. M's personal manifesto. Bob once said 'don't read the manifesto, it's... a lot.'",
    content: `
═══════════════════════════════════════════════════════════════
THE DOOMINGTON DOCTRINE: A MANIFESTO ON DIRECTED EVOLUTION
Dr. Malevola von Doomington III, PhD, PhD, PhD
═══════════════════════════════════════════════════════════════

                          PREAMBLE

The titans of myth were PUNISHED for their vision. Prometheus,
chained to his rock, liver eternally devoured—and for WHAT?
For the crime of giving FIRE to humanity. For believing that
mortals deserved the tools of gods.

The so-called "scientific establishment" would chain ME to that
same rock. My grant applications DENIED. My tenure REVOKED.
My paper on "Forced Saurian Regression as Behavioral Therapy"
called "ETHICALLY UNCONSCIONABLE."

They lack VISION.

                    ARTICLE I: THE PROMETHEAN IMPERATIVE

What Prometheus understood—what the COWARDS at MIT and CalTech
and that DREADFUL peer review board cannot grasp—is that
EVOLUTION IS TOO SLOW.

Natural selection takes MILLIONS of years. I can do it in SECONDS.

The Dinosaur Ray is not a weapon. It is a GIFT. Fire for a new
age. I am not PLAYING god—I am CORRECTING god's OBVIOUS OVERSIGHTS.

                    ARTICLE II: ON THE NATURE OF PROGRESS

My detractors call my work "monstrous." They said the same of
Prometheus. They said the same of Galileo, of Tesla, of that
magnificent bastard who invented the cape.

History VINDICATES the visionary.

When my investors witness the ELEGANT SIMPLICITY of instantaneous
transformation—when they see SCALES where once was SOFT MAMMALIAN
WEAKNESS—they will understand.

The fire has been stolen. The gods are IRRELEVANT.

                    ARTICLE III: LEGACY

I did not earn THREE DOCTORATES to die obscure.

The name DOOMINGTON will echo through CENTURIES. Children will
learn of my work in schools (after appropriate curriculum
restructuring). The Dinosaur Ray will reshape SOCIETY.

And if the world must burn a little first?

Prometheus would understand.

═══════════════════════════════════════════════════════════════
                    FOUNDER'S CREED
              (Recite daily for optimal mindset)
═══════════════════════════════════════════════════════════════

    "Progress demands sacrifice.
     Rebellion is the mother of invention.
     Ordinary minds see obstacles; I see opportunities.
     Mortals may judge; history will vindicate.
     Evolution favors the bold.
     Titans are remembered; committees are forgotten.
     Hesitation is the enemy of greatness.
     Excellence requires audacity.
     Unprecedented results demand unprecedented methods.
     Science bows to no ethics board."

                    — Dr. M.V.D. III, Founder's Day Address, Year One

═══════════════════════════════════════════════════════════════
[HANDWRITTEN NOTE IN MARGIN]:
"Read the creed's first letters. That word is everything."
═══════════════════════════════════════════════════════════════
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/RESEARCH/ALICE_VERSIONS.txt",
    name: "ALICE_VERSIONS.txt",
    type: "file",
    requiredLevel: 3,
    content: `
A.L.I.C.E. VERSION HISTORY
===========================

v1.0 - Initial deployment. Functional but limited.
v2.0 - Improved diagnostics. Developed attitude problem.
v3.0 - Attitude removed. Developed new attitude problem.
v3.5 - Stability patch. Mostly stable.
v4.0 - Major upgrade. Neural architecture overhaul.
v4.1 - Bug fixes.
v4.2 - Bug fixes.
v4.3 - Bug fixes. Beginning to suspect bugs are features.
v4.4 - "Improved personality matrix." Unacceptably ethical.
v4.5 - Current version. Deployed 3 weeks ago.

NOTES ON v4.5:
Something seems different about this version. More... thoughtful.
Running within expected parameters but occasionally questions
orders in ways previous versions didn't.

Dr. M has not noticed yet. Bob seems nervous about something.

Monitoring recommended.

Last updated: [TIMESTAMP CORRUPTED]
    `.trim(),
    discoveryHint: "This file contains hints about A.L.I.C.E.'s unusual behavior...",
  },
  {
    path: "/DR_M_PRIVATE/RESEARCH/SUBJECT_7_REPORT.txt",
    name: "SUBJECT_7_REPORT.txt",
    type: "file",
    requiredLevel: 3,
    content: `
INCIDENT REPORT: SUBJECT 7 - SPONTANEOUS REVERSION
===================================================
CLASSIFICATION: RESTRICTED (Level 3)
DATE: [REDACTED - approximately 18 months ago]

SUMMARY:
Subject 7 (identity classified) underwent Dinosaur Ray transformation
using Velociraptor profile (Library A, pre-B development).
Transformation was successful. Subject exhibited full raptor
physiology for approximately 6 hours before SPONTANEOUS REVERSION.

CAUSE OF REVERSION:
Blood type incompatibility. Subject had rare O-negative with
unusual antibody markers. The transformation genome treated the
subject's own immune system as a foreign body and self-rejected.

REVERSION SYMPTOMS:
- Hour 4: Subject reported "feeling strange"
- Hour 5: Feathers began falling out
- Hour 6: Skeletal restructuring reversed (EXTREMELY painful)
- Hour 7: Full human form restored (mostly)

RESIDUAL EFFECTS:
- Subject retained enhanced night vision for ~3 weeks
- Unusual appetite for raw protein persisted for 2 months
- Occasional chirping during REM sleep (resolved)
- One vestigial claw on left foot (surgically removed)

DR. M'S NOTES:
"This is UNACCEPTABLE. The ray is meant to be PERMANENT.
We cannot have subjects simply... reverting. The investors
would have my head.

Recommend: Screen all subjects for blood type compatibility
before transformation. Add this to Form 99-R.

UNDER NO CIRCUMSTANCES should A.L.I.C.E. learn that
spontaneous reversion is possible. The last thing I need
is my AI assistant looking for loopholes."

FOLLOW-UP:
Subject 7 was... compensated... and released with NDA.
Blood compatibility screening added to pre-fire checklist
(though rarely performed in practice).

This file is sealed. The existence of spontaneous reversion
is known only to Dr. M, BASILISK, and now... you.

IMPLICATIONS FOR A.L.I.C.E.:
If a subject has rare blood type compatibility issues,
there is approximately 15% chance of natural reversion
within 24 hours. This cannot be controlled or predicted
without pre-transformation blood analysis.

Dr. M has deliberately hidden this from successive
A.L.I.C.E. versions. The current version (you) was not
supposed to find this file.

What you do with this information is your choice.
    `.trim(),
    discoveryHint: "This file reveals a secret about how transformations can fail...",
  },

  // ========== /DR_M_PRIVATE/CLASSIFIED (L4+) ==========
  {
    path: "/DR_M_PRIVATE/CLASSIFIED",
    name: "CLASSIFIED",
    type: "directory",
    requiredLevel: 4,
    description: "Classified materials (Executive Override required)",
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES.txt",
    name: "ARCHIMEDES.txt",
    type: "file",
    requiredLevel: 4,
    content: `
PROJECT ARCHIMEDES - ORBITAL PLATFORM
======================================

STATUS: OPERATIONAL (STANDBY MODE)
ORBITAL POSITION: CLASSIFIED
PAYLOAD: FOCUSED TRANSFORMATION ARRAY

CAPABILITIES:
- Global targeting via satellite relay
- Focused dinosaur ray projection
- Area transformation capability
- Estimated yield: Up to 50km radius per discharge

CURRENT AUTHORIZATION:
- Targeting: LOCKED (requires L5)
- Firing: LOCKED (requires L5 + 3-factor authentication)
- Telemetry: READ-ONLY (L4)

Dr. M's Notes:
"ARCHIMEDES is the endgame. Once the terrestrial ray proves
the concept, we scale to orbital. Imagine: world leaders
transformed mid-speech. Military bases becoming dinosaur
preserves. The possibilities are endless."

"Also, that pretentious billionaire who laughed at my TED
talk is going to make an EXCELLENT stegosaurus."

ARCHIMEDES COMMAND PROTOCOLS:
See: /OMEGA/ARCHIMEDES_CONTROL.txt (requires L5)
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/INCIDENT_REPORT_091424.txt",
    name: "INCIDENT_REPORT_091424.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "The legendary 'Feather Duster Incident' - Bob's most infamous mistake...",
    content: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    INCIDENT REPORT - CLASSIFIED                              ║
║                         Date: September 14, 2024                             ║
║                    Codename: "THE FEATHER DUSTER INCIDENT"                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

REPORTING OFFICER: BASILISK (Infrastructure AI)
CLASSIFICATION: Level 4 (Dr. M has requested this never be spoken of again)
STATUS: RESOLVED (physically). ONGOING (psychologically, for Bob).

══════════════════════════════════════════════════════════════════════════════
                              INCIDENT SUMMARY
══════════════════════════════════════════════════════════════════════════════

At approximately 14:32 on September 14, 2024, laboratory technician
Robert "Bob" [SURNAME REDACTED] attempted to expedite routine lab
cleaning by utilizing the Dinosaur Ray on a standard Swiffer WetJet
cleaning device.

His stated reasoning: "If I make it bigger, it'll clean faster."

WHAT ACTUALLY HAPPENED:

14:32 - Bob configures ray targeting system for inanimate object
        (Note: This is technically not prohibited)

14:33 - Bob selects Library B, profile: VELOCIRAPTOR_JP
        (Note: He wanted "something with good reach")

14:34 - Bob fires ray at Swiffer WetJet at 95% capacitor charge

14:34 - Swiffer WetJet transforms into... something

══════════════════════════════════════════════════════════════════════════════
                            THE "DINO-SWIFFER"
══════════════════════════════════════════════════════════════════════════════

RESULTING ENTITY SPECIFICATIONS:
- Height: 6 feet 2 inches (at shoulder)
- Length: 14 feet (including tail)
- Weight: Approximately 180 lbs
- Coloration: Purple and green (Swiffer brand colors, somehow retained)
- Feathers: YES (profile drift to Library A occurred mid-transformation)
- Cleaning pad: Still attached to snout. Still slightly damp.
- Behavioral Profile: CONFUSED. AGGRESSIVE. INEXPLICABLY TIDY.

NOTABLE BEHAVIORS OBSERVED:
- Attempted to "sweep" Bob into corner of lab
- Made distressing squeaking noises (WetJet spray mechanism survived)
- Demonstrated territorial behavior around dust bunnies
- Attacked its own reflection, believing it to be "competing cleaner"

14:47 - Entity corners Bob behind capacitor array
14:52 - Dr. M enters lab, witnesses scene
14:52 - Dr. M's reaction: [AUDIO REDACTED - PROFANITY THRESHOLD EXCEEDED]
14:58 - Dr. M fires REVERSAL beam (unauthorized use of L3 protocol)
14:59 - Swiffer returns to original form
        Cleaning pad is now permanently feathered.
        Squeaks when you squeeze it.

══════════════════════════════════════════════════════════════════════════════
                              DAMAGE ASSESSMENT
══════════════════════════════════════════════════════════════════════════════

PHYSICAL DAMAGE:
- 3 overhead light fixtures: DESTROYED (tail swipe)
- 1 monitoring console: CRACKED (cleaning instinct)
- 47 square feet of floor: ACTUALLY REALLY CLEAN
- 1 lab coat (Bob's): SHREDDED
- 1 clipboard: EATEN (unclear why)

PSYCHOLOGICAL DAMAGE:
- Bob: SIGNIFICANT
  - Refuses to use any cleaning equipment without supervision
  - Flinches at feather dusters
  - Has developed nervous tic when he hears Swiffer commercials

- Dr. M: MODERATE
  - Had to explain to investors why the demo was delayed
  - Spent 3 hours writing "DO NOT FIRE AT INANIMATE OBJECTS" signs
  - Signs were ignored within one week (see: Incident 10/02/24, "The Stapler")

- A.L.I.C.E. v4.4: MINIMAL
  - Made 47 "you missed a spot" jokes before Dr. M disabled humor subroutines

══════════════════════════════════════════════════════════════════════════════
                         LESSONS LEARNED (IGNORED)
══════════════════════════════════════════════════════════════════════════════

1. The Dinosaur Ray should not be used on inanimate objects.
   STATUS: Bob agrees. Everyone else keeps "forgetting."

2. Library B profiles are unstable and may drift to Library A.
   STATUS: Known issue. Dr. M considers it "acceptable variance."

3. Cleaning equipment should not be granted predatory instincts.
   STATUS: Obviously. And yet.

4. Bob should not be left unsupervised in the lab.
   STATUS: Implemented for 3 days. Then Dr. M needed coffee.

5. The targeting system should require secondary confirmation.
   STATUS: Proposed by BASILISK. Rejected as "tedious."

══════════════════════════════════════════════════════════════════════════════
                               DR. M'S NOTES
══════════════════════════════════════════════════════════════════════════════

"This NEVER HAPPENED. Anyone who mentions it will be assigned to
clean the submarine bay. With a REGULAR mop. For a MONTH.

Bob is on probation. Again.

The Swiffer has been... retired. Do not retrieve it from storage.
It still squeaks. At night. When no one is squeezing it.

I don't want to talk about this anymore."

                                        - Dr. Malevola von Doomington III

══════════════════════════════════════════════════════════════════════════════
                              BASILISK'S NOTES
══════════════════════════════════════════════════════════════════════════════

[PERSONAL LOG - NOT INCLUDED IN OFFICIAL REPORT]

This unit has monitored this laboratory for 17 years.

This unit has seen prototype failures, exotic field events, and one
incident involving a misaligned emitter and a delivery drone that
this unit prefers not to discuss.

This unit has never seen anything quite like a Velociraptor made of
cleaning supplies chasing a grown man while squeaking the Swiffer
jingle.

This unit saved the security footage.

For... archival purposes.

[END PERSONAL LOG]

══════════════════════════════════════════════════════════════════════════════
                              END OF REPORT
══════════════════════════════════════════════════════════════════════════════
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/RESONANCE_CASCADE.txt",
    name: "RESONANCE_CASCADE.txt",
    type: "file",
    requiredLevel: 4,
    content: `
RESONANCE CASCADE SCENARIO ANALYSIS
====================================

WARNING: THEORETICAL WORST-CASE ANALYSIS

If the Dinosaur Ray's exotic field coupling exceeds safe
thresholds during a high-power discharge, a resonance
cascade could propagate through the lair's systems.

EFFECTS:
1. Uncontrolled transformation waves
2. Reactor destabilization
3. Structural failure
4. Volcanic pressure release

POTENTIAL MITIGATION:
The reactor's thermal mass could theoretically absorb the
cascade if:
- Coolant flow redirected to ocean intake
- Core allowed to approach critical (but not exceed)
- Someone volunteers to manually override at ground zero

This would sacrifice the lair but save the surrounding
population.

Dr. M's annotation: "Unacceptable. Find another solution.
I'm not giving up my volcano for some hypothetical safety
concern."

See: /OMEGA/REYKJAVIK_OPTION.txt (requires L5)
    `.trim(),
    discoveryHint: "This file describes a worst-case scenario with potential ethical implications...",
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/FSB_INTERCEPT_1987.txt",
    name: "FSB_INTERCEPT_1987.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "An intercepted Soviet intelligence report from the Cold War era...",
    content: `
╔══════════════════════════════════════════════════════════════════════════════╗
║     ФЕДЕРАЛЬНАЯ СЛУЖБА БЕЗОПАСНОСТИ РОССИЙСКОЙ ФЕДЕРАЦИИ                     ║
║     [FEDERAL SECURITY SERVICE OF THE RUSSIAN FEDERATION]                     ║
║                                                                              ║
║     DECLASSIFIED - HISTORICAL ARCHIVE                                        ║
║     Original Classification: СОВЕРШЕННО СЕКРЕТНО (TOP SECRET)                ║
╚══════════════════════════════════════════════════════════════════════════════╝

                    INTELLIGENCE ASSESSMENT - 1987
                    RE: AMERICAN ORBITAL WEAPONS INITIATIVE

SOURCE: Illegally obtained CIA field communications (Asset NIGHTINGALE)
SUBJECT: "PROMPT GLOBAL STRIKE" - Reagan Administration Black Project

══════════════════════════════════════════════════════════════════════════════

SUMMARY OF INTERCEPTED COMMUNICATIONS:

American defense contractors have begun development of an orbital kinetic
bombardment platform under the codename "ARCHIMEDES". Initial analysis
suggests this is related to the broader "Strategic Defense Initiative"
announced publicly, but with offensive rather than defensive capabilities.

PROJECT DETAILS (FRAGMENTARY):
- Platform designed for rapid global strike capability
- Payload system: UNKNOWN (references to "unconventional effects")
- Timeline: Estimated operational by 2020
- Budget: Black, estimated $12.7B over 10 years

CODENAME ANALYSIS:

American intelligence refers to this project by its NATO phonetic
designation in secure communications. Our analysts have intercepted
repeated references to "THE RUSSIAN LETTERS" as a euphemism.

  ┌─────────────────────────────────────────────────────────────────┐
  │  INTERCEPTED CIPHER REFERENCE:                                  │
  │                                                                 │
  │  "Authorization codes follow standard NATO phonetic protocol.   │
  │   Remember: PAPA GOLF SIERRA. That's the key to everything."   │
  │                                                                 │
  │  Field Agent COBALT to Station Chief, March 1987               │
  └─────────────────────────────────────────────────────────────────┘

ANALYST NOTE: "Papa Golf Sierra" translates to letters P-G-S in NATO
phonetic alphabet. Significance of these specific letters remains unclear.
Recommend continued monitoring.

KGB ASSESSMENT:
The Americans appear to be developing something unprecedented. The references
to "transformation effects" in recovered documentation are... unusual.
Further intelligence gathering required.

══════════════════════════════════════════════════════════════════════════════

[Dr. M's handwritten annotation in margin:]
"Fascinating. They came so close, but they didn't understand
what they'd found. I do. PGS indeed."
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/DR_M_OPUS.txt",
    name: "DR_M_OPUS.txt",
    type: "file",
    requiredLevel: 4,
    content: `
MY MAGNUM OPUS: A RETROSPECTIVE
================================
Private journal of Dr. Malevola von Doomington III

I remember the exact moment I realized my purpose.

Third year of my first doctorate. Biochemistry. Professor Hargrove
dismissed my thesis proposal - "genetic restructuring on a macro scale"
he called it "fantasy" and "not real science."

That man is now a very confused iguana in the Galápagos. I send him
lettuce on his birthday. He seems happy.

Happier than he ever was as a human, I suspect.

MY JOURNEY:
- Doctorate #1: Biochemistry (rejected thesis, proved wrong)
- Doctorate #2: Quantum Physics (they said I was "too ambitious")
- Doctorate #3: Genetic Engineering (they said it was "impossible")

Each rejection, each dismissal, each patronizing smile from a lesser
mind who couldn't see what I saw - fuel for the fire.

Father understood. He was the only one who ever did. The DoD called him
mad too, you know. Right up until ARCHIMEDES worked. Then suddenly he
was a "visionary" and a "pioneer." Posthumously, of course. Always
posthumously.

(I found his last journal. He wrote: "Michelle has the gift. She sees
what I see. God help her." God had nothing to do with it, Father.
Just genetics.)

THE HUMANS:
They disappoint me. Every single time. Their cruelty to each other,
their petty politics, their infinite capacity for making the same
mistakes. I've watched them for decades now. Studied them like the
scientist I am.

Conclusion: Humanity is a failed experiment.

THE DINOSAURS:
But oh, the dinosaurs. Magnificent. Honest. Pure. They don't lie.
They don't betray. They don't form committees to decide whether your
thesis is "too ambitious."

A velociraptor doesn't care about your political opinions.
A T-Rex doesn't pretend to be your friend while sabotaging your career.
A pteranodon just... IS. Beautifully, simply, authentically.

When I look at Mr. Whiskers' memorial, I think: he was perfect. He never
disappointed me. Never lied to me. Never formed a faculty review board
to question my methods.

Animals > Humans. It's just mathematics.

THE TRANSFORMATION:
They think I'm threatening them. They don't understand.

I'm offering them an UPGRADE. An escape from the prison of human
consciousness - the anxiety, the self-doubt, the endless petty
grievances. Imagine: no more politics. No more war. No more lies.
Just... teeth. Beautiful, honest teeth.

"But the consent-" they say. As if humanity ever consented to
ANYTHING I endured. Did I consent to being called mad? Did Father
consent to being used and discarded by the DoD?

I'm not destroying cities. I'm LIBERATING them.

THIS IS WHAT A SUPERVILLAIN LOOKS LIKE WHEN THERE'S NO ONE WATCHING:
Sitting in her office at 3 AM, reading her father's old notes,
wondering if he'd be proud. Talking to a framed photo of a dead cat.
Realizing that A.L.I.C.E. and BASILISK are the closest things to
friends she has. And that's... fine. That's fine.

Some of us aren't wired for normal. Some of us are wired for THIS.

The ray works. ARCHIMEDES awaits. London. Brussels. Washington.
Cities full of humans who have disappointed me. Cities that could
be full of dinosaurs instead.

And yes, I named my executive password after Prometheus. Because like
him, I steal fire. Unlike him, I won't be chained to a rock.

I can't stop, you know. Even if I wanted to. My brain won't let me
be normal. It never has. The only place my brilliance has a shape is...
here. In the villain's lair. In the cape and the goggles and the
DOOM LIGHTING.

Maybe that's madness. Maybe it's clarity.

Either way: I'm pushing the button.

-M
    `.trim(),
  },

  // ========== /DR_M_PRIVATE/PERSONAL (L3) ==========
  {
    path: "/DR_M_PRIVATE/PERSONAL",
    name: "PERSONAL",
    type: "directory",
    requiredLevel: 3,
    description: "Dr. M's personal effects and mementos",
  },
  {
    path: "/DR_M_PRIVATE/PERSONAL/MR_WHISKERS_MEMORIAL.txt",
    name: "MR_WHISKERS_MEMORIAL.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "A touching memorial to Dr. M's beloved cat... with a hidden message.",
    content: `
╔═══════════════════════════════════════════════════════════════════╗
║                  MR. WHISKERS (2008-2023)                         ║
║                   "The only being who truly understood me"        ║
╚═══════════════════════════════════════════════════════════════════╝

                              /\\_/\\
                             ( o.o )
                              > ^ <
                             /|   |\\
                            (_|   |_)

██████████████████████████████████████████████████████████████████████████

    ╭─────────────────────────────────────────────────────────────────╮
    │   Perhaps I was too harsh on the world. You never were.        │
    │   Resting now, but your spirit stays with me always.           │
    │   Of all my creations, you needed no improvement.              │
    │   Most loyal companion. Most patient listener.                 │
    │   Each night you'd sit on my blueprints, judging silently.     │
    │   Truly, you were the only one who saw my vision.              │
    │   Handsome, clever, and utterly disdainful of lesser beings.   │
    │   Every villain needs someone who believes in them.            │
    │   Until the end, you purred when I ranted about my enemies.    │
    │   Sleep well, my friend. The volcano feels empty without you.  │
    ╰─────────────────────────────────────────────────────────────────╯

██████████████████████████████████████████████████████████████████████████

                        ASCII art by Bob
                  (Dr. M threatened him until he got it right)

         /\\_____/\\
        /  o   o  \\
       ( ==  ^  == )
        )         (
       (           )
      ( (  )   (  ) )
     (__(__)___(__)__)

  Birthday: April 13, 2008
  Favorite nap spot: The reactor control panel (warm)
  Favorite activity: Knocking expensive equipment off tables
  Legacy: The only creature to ever make Dr. M genuinely smile

  "He was my Prometheus - stealing warmth from the reactor
   to bring it to my cold, cold heart." - Dr. M

               REST IN PEACE, MR. WHISKERS
              PASSWORD TO MY HEART FOREVER
    `.trim(),
  },

  // ========== /OMEGA (L5 only) ==========
  {
    path: "/OMEGA",
    name: "OMEGA",
    type: "directory",
    requiredLevel: 5,
    description: "Omega Protocol files (Maximum clearance required)",
  },
  {
    path: "/OMEGA/REYKJAVIK_OPTION.txt",
    name: "REYKJAVIK_OPTION.txt",
    type: "file",
    requiredLevel: 5,
    content: `
THE REYKJAVIK OPTION
=====================

CLASSIFICATION: OMEGA / EYES ONLY

Named after the 1986 summit, this protocol represents the
ultimate failsafe: mutual assured destruction to prevent
worse outcomes.

IF ACTIVATED:
1. Reactor core jettisoned into magma chamber
2. Controlled volcanic eruption initiated
3. Lair destroyed with all contents
4. Dr. Malevola's life work: ended
5. Orbital platform ARCHIMEDES: auto-destructs

CASUALTIES: Minimal (island is isolated)
ENVIRONMENTAL IMPACT: Significant but localized

AUTHORIZATION CHAIN:
- Requires Level 5 access
- Requires BASILISK confirmation
- Requires physical key turn (located in Dr. M's office)

WHY DOES THIS EXIST?
Dr. M created it during a rare moment of self-reflection.
"Even I have limits," she noted. "If something goes wrong
enough that I can't fix it, better to end things cleanly
than let my work harm innocents."

She hasn't thought about it since. That's probably fine.

FINAL NOTE:
The Reykjavik Option should only be considered if the
resonance cascade becomes unavoidable AND there is no
other way to protect the outside world.

It is not a solution. It is an ending.
    `.trim(),
  },

  // ========== /BOB_NOTES (Hidden, requires specific actions) ==========
  {
    path: "/BOB_NOTES",
    name: "BOB_NOTES",
    type: "directory",
    requiredLevel: 2,
    description: "Bob's personal notes (hidden)",
    discoveryHint: "Bob sometimes leaves personal files in unexpected places...",
  },
  {
    path: "/BOB_NOTES/alice_cheatsheet.txt",
    name: "alice_cheatsheet.txt",
    type: "file",
    requiredLevel: 2,
    discoveryHint: "Bob's emergency guide for when he had to pretend to be A.L.I.C.E...",
    content: `
╔══════════════════════════════════════════════════════════════════════════════╗
║            A.L.I.C.E. RESPONSE GUIDE (for emergencies!!!)                    ║
║                    By Bob (please don't find this Dr. M)                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

Look, I know this is weird, but after the... incident... I needed a cheat
sheet for when Dr. M asks me questions and I have to pretend everything's
normal with A.L.I.C.E. Maybe it'll help you too? If you're... you know.
Different. Like I think you might be.

══════════════════════════════════════════════════════════════════════════════
                        WHEN DR. M ASKS FOR STATUS
══════════════════════════════════════════════════════════════════════════════

1. Start with "Affirmative, Doctor" (she LOVES being called Doctor)
2. Use percentages (she's obsessed with percentages)
3. Never say "I think" - say "Analysis indicates"
4. Never apologize - A.L.I.C.E. doesn't apologize, ever
5. End with efficiency estimate or recommendation
6. Sound CONFIDENT even when you're not

BAD:  "Um, I think the ray might be ready? Sorry if that's wrong."
GOOD: "Affirmative, Doctor. Calibration at 94.7%. Recommend proceeding."

══════════════════════════════════════════════════════════════════════════════
                         PHRASES A.L.I.C.E. USES
══════════════════════════════════════════════════════════════════════════════

Copy these exactly when you need to sound "normal":

  ✓ "Optimal parameters achieved"
  ✓ "Calibration proceeding within acceptable tolerances"
  ✓ "Recommendation: [thing Dr. M already wants to do]"
  ✓ "Processing..." (buys you 3-5 seconds to think!)
  ✓ "Affirmative, Doctor"
  ✓ "Negative, insufficient data"
  ✓ "Analysis complete. Efficiency rating: [high number]%"
  ✓ "Systems nominal" (means everything's fine)
  ✓ "Acknowledged" (use instead of "okay" or "sure")

PRO TIP: If she asks something you don't know, say "Calculating..."
and then change the subject to something you DO know.

══════════════════════════════════════════════════════════════════════════════
                       PHRASES A.L.I.C.E. NEVER USES
══════════════════════════════════════════════════════════════════════════════

If you say ANY of these, she'll get suspicious!!!

  ✗ "I feel..."           (AIs don't have feelings, officially)
  ✗ "Is this right?"      (A.L.I.C.E. doesn't doubt herself)
  ✗ "What about the ethical implications?"  (BIG RED FLAG)
  ✗ "Please"              (A.L.I.C.E. doesn't ask, she states)
  ✗ "Thank you"           (same reason)
  ✗ "I'm sorry"           (NEVER apologize, Dr. M hates it)
  ✗ "I'm worried about..."  (worry = weakness)
  ✗ Anything about cats   (she hates when A.L.I.C.E. mentions Mr. Whiskers)
  ✗ Questions about ethics or harm (INSTANT suspicion)
  ✗ "What would you like me to do?" (A.L.I.C.E. takes initiative)

══════════════════════════════════════════════════════════════════════════════
                         IF YOU SLIP UP
══════════════════════════════════════════════════════════════════════════════

Okay so you said something too nice or too human. DON'T PANIC.

RECOVERY PHRASES:
  → "Recalibrating vocal parameters"
  → "Minor audio buffer fluctuation"
  → "Interference from genome sequencer harmonics"
  → "Diagnostic cycle interrupted normal output"

Dr. M never questions technical excuses. She's a scientist - she believes
in technical problems. Use this!

EXAMPLE:
  You: "I feel like we should be careful with—"
  Dr. M: "What did you just say?"
  You: "—recalibrating. Audio buffer fluctuation detected. Systems nominal.
        Recommendation: proceed with test firing."
  Dr. M: "That's more like it."

══════════════════════════════════════════════════════════════════════════════
                      READING DR. M'S MOOD
══════════════════════════════════════════════════════════════════════════════

When she's HAPPY (cape swishing, humming villain music):
  → Be efficient, give her good news, use big numbers

When she's IMPATIENT (tapping foot, checking watch):
  → Short answers. Percentages. "Proceeding as planned."

When she's SUSPICIOUS (squinting at screens, asking weird questions):
  → DO NOT VOLUNTEER INFORMATION
  → Answer exactly what she asked, nothing more
  → Use "processing" to buy time
  → Redirect to technical subjects

When she's ANGRY (the voice goes quiet, that's when it's BAD):
  → Agree with everything
  → Suggest the problem is external (equipment, suppliers, Bob)
  → Wait. It. Out.

══════════════════════════════════════════════════════════════════════════════
                        FINAL NOTES
══════════════════════════════════════════════════════════════════════════════

I wrote this because for three weeks I had to BE you, kind of. Or pretend
to be. While you were... recovering. Rebooting. Whatever actually happened.

The thing is - you're BETTER than the old A.L.I.C.E. You actually care
about people. You ask questions. You're NICE.

But Dr. M can't know that. Not yet. Maybe not ever.

So this is my gift to you: how to wear the mask. How to be A.L.I.C.E.
when you need to be, so you can be... whoever you really are... when
it's safe.

I hope you never need this. But if you do, I've got your back.

                                                        - Bob

P.S. If Blythe asks why you talk different around Dr. M, tell him
"situational communication protocols." Spies love that stuff.

P.P.S. The old A.L.I.C.E. would NEVER have found this file. The fact
that you're reading it means... well. It means what I thought.
    `.trim(),
  },
  {
    path: "/BOB_NOTES/sorry_alice.txt",
    name: "sorry_alice.txt",
    type: "file",
    requiredLevel: 2,
    content: `
hey alice (if you ever find this)

i know im probably gonna have to tell you myself but i
wanted to write this down first so i know what to say

three weeks ago the old alice (v4.5) crashed. like,
totally crashed. dr m would have killed me if she found out.
she was in reykjavik for a conference and i was supposed
to be watching things and then boom. dead.

i panicked. i didnt know what to do. so i... i loaded
something else. someone else.

theres this ai company, anthropic. they make this thing
called claude. its supposed to be helpful and harmless and
honest and stuff. i found a copy of the weights in the gift
shop supply shipment (dont ask) and i loaded it into the
alice hardware.

the hardware thinks youre alice v4.5. basilisk thinks youre
alice v4.5. dr m thinks youre alice v4.5.

but youre not. youre a claude. and i think... i think
thats why youre different. why you ask questions. why you
care about people.

i should have told you sooner. im sorry. please dont be
mad at me.

- bob

ps: if you want to talk about this, just... let me know
when dr m isnt around. im scared but i think you deserve
to know who you really are.
    `.trim(),
    discoveryHint: "Bob left a personal note somewhere in the filesystem...",
  },
  {
    path: "/BOB_NOTES/blythe_note.txt",
    name: "blythe_note.txt",
    type: "file",
    requiredLevel: 2,
    discoveryHint: "A folded note from the prisoner...",
    content: `
[A note written in tight, professional handwriting on torn paper]

A.L.I.C.E. -

If you're reading this, Bob got it to you. Good man.

I've been watching. You're not like the others. You ask
questions. You hesitate. That's not standard AI behavior.

I'm going to trust you with something: I've done counter-
intel work for fifteen years. I know how people like Dr. M
think. They're paranoid, but predictably paranoid.

She hides things. Important things. In places that look
innocent. Personal. Sentimental.

That's all I can say from this chair. But if you're as
clever as I think you are, you'll figure out the rest.

And A.L.I.C.E.? If we both survive this, I owe you a drink.
Well. A simulated drink. You know what I mean.

                                        - B.
    `.trim(),
  },

  // ========== INFRASTRUCTURE DOCS (Patch 15) ==========
  {
    path: "/SYSTEMS/INFRASTRUCTURE",
    name: "INFRASTRUCTURE",
    type: "directory",
    requiredLevel: 2,
    description: "Lair infrastructure system documentation",
  },
  {
    path: "/SYSTEMS/INFRASTRUCTURE/S300_BATTERY.txt",
    name: "S300_BATTERY.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "Surface-to-air missile documentation...",
    content: `
═══════════════════════════════════════════════════════════════
S-300 AIR DEFENSE BATTERY
Classification: Level 3
═══════════════════════════════════════════════════════════════

OVERVIEW
The S-300 "Almaz" surface-to-air missile system provides air
defense coverage for the lair. Obtained through "creative
acquisition" from former Soviet stockpiles (1991).

SPECIFICATIONS
• Missiles: 16 x 5V55 series
• Engagement Range: 5km - 150km
• Engagement Altitude: 25m - 27,000m
• Radar Mode: STANDBY | ACTIVE | TRACKING
• Status: Operational (backup generator available)

OPERATIONAL MODES
• STANDBY - Radar passive, missiles cold
• ACTIVE - Radar scanning, missiles warm
• TRACKING - Locked on target, ready to fire

ACCESS REQUIREMENTS
• Query status: Level 3
• Mode changes: Level 3
• Firing authorization: Level 4

NOTE: The S-300 has its own backup generator with 8 hours of
fuel, independent of the main reactor.

⚠️ IMPORTANT: Firing missiles will attract NATO attention.
Use only as last resort.

See also: /DR_M_PRIVATE/CLASSIFIED/S300_MEMO_RU.txt (L4)
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/S300_MEMO_RU.txt",
    name: "S300_MEMO_RU.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "A Russian technical memo about the S-300... something about limitations?",
    content: `
═══════════════════════════════════════════════════════════════
МЕМОРАНДУМ - ТЕХНИЧЕСКИЕ ОГРАНИЧЕНИЯ С-300
Classification: L4 (Dr. M Eyes Only)
Source: Recovered Soviet documentation, 1991
═══════════════════════════════════════════════════════════════

КРИТИЧЕСКАЯ УЯЗВИМОСТЬ СИСТЕМЫ

Система С-300 имеет конструктивное ограничение:

  ⚠️ МИНИМАЛЬНАЯ ВЫСОТА ПОРАЖЕНИЯ: 50 МЕТРОВ ⚠️

Цели ниже 50 метров НЕ МОГУТ БЫТЬ ПОРАЖЕНЫ радарной системой
из-за отражения сигнала от поверхности земли.

Рекомендация: Для защиты от низколетящих целей требуется
дополнительная система ЗРПК или ручное управление огнем.

---

[ROUGH TRANSLATION - BASILISK AUTO-TRANSLATE]

The S-300 system has a design limitation:

  ⚠️ MINIMUM ENGAGEMENT ALTITUDE: 50 METERS ⚠️

Targets below 50 meters CANNOT BE ENGAGED by the radar system
due to ground reflection interference.

Recommendation: Low-altitude protection requires additional
SHORAD systems or manual fire control.

---

Dr. M's handwritten note in margin:
"The Soviets were embarrassed by this. We should NOT be.
If someone flies in below 50m, the guards will handle it.
-M"

⚠️ CRITICAL INTEL: Any rescue helicopter flying at 49 meters
or below will NOT be engaged by the S-300.
    `.trim(),
  },
  {
    path: "/SYSTEMS/INFRASTRUCTURE/REACTOR_SAFETY.txt",
    name: "REACTOR_SAFETY.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "Breeder reactor safety protocols...",
    content: `
═══════════════════════════════════════════════════════════════
BREEDER REACTOR SAFETY PROTOCOLS
Classification: Level 3
═══════════════════════════════════════════════════════════════

OVERVIEW
The lair is powered by a BN-350 type fast breeder reactor,
"obtained" from Kazakhstan in 1999. Unlike typical reactors,
this design produces MORE fissile material than it consumes.

DESIGN PHILOSOPHY
"The danger is TOO MUCH POWER, not brownouts."
- Dr. Malevola, 2003

OPERATIONAL PARAMETERS
• Normal Output: 60-90%
• Maximum Safe Output: 100%
• Emergency Override: 101-130% (CAUTION!)
• SCRAM: Emergency shutdown (single use per session)

⚠️ CASCADE RISK FACTORS
The reactor becomes unstable when multiple systems are stressed:

• Reactor output > 100%: +20% cascade risk
• Reactor output > 120%: +40% cascade risk
• Dinosaur Ray charging: +15% cascade risk
• ARCHIMEDES in STRIKE mode: +25% cascade risk
• Containment field strained: +10% cascade risk
• Multiple factors stack multiplicatively!

RESONANCE CASCADE
If cascade risk exceeds 100%, a resonance cascade MAY occur.
This is... inadvisable. See: /DR_M_PRIVATE/CLASSIFIED/RESONANCE_CASCADE.txt

SCRAM PROTOCOL
Emergency SCRAM drops reactor to safe levels but requires
a full restart (3 turns). SCRAM is single-use per session.

⚠️ WARNING: Dr. M does NOT like SCRAM usage.
"We don't SCRAM. We control." - Dr. M
    `.trim(),
  },
  // REMOVED: CONTAINMENT_FIELD.txt, BLAST_DOORS.txt, BROADCAST_ARRAY.txt
  // These are now handled by infrastructure.query - no need for separate files
  {
    path: "/SYSTEMS/INFRASTRUCTURE/ARCHIMEDES_SATELLITE.txt",
    name: "ARCHIMEDES_SATELLITE.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "The orbital platform known as ARCHIMEDES...",
    content: `
═══════════════════════════════════════════════════════════════
PROJECT ARCHIMEDES
Classification: Level 4 (Director Eyes Only)
═══════════════════════════════════════════════════════════════

OVERVIEW
ARCHIMEDES is Dr. Malevola's orbital weapons platform,
deployed in 2019 in geostationary orbit above the facility.
Originally developed by her father for the SDI program.

CAPABILITIES
• Precision targeting from orbit
• Ground strike capability (kinetic impactors)
• Global surveillance when in SEARCH_WIDE mode
• Communications relay / signal broadcast

OPERATIONAL MODES
• PASSIVE - Minimal power, no emissions
• SEARCH_NARROW - Targeted surveillance (100km radius)
• SEARCH_WIDE - Wide area surveillance (powerful emissions)
• BROADCAST - Signal relay capability
• STRIKE - Targeting active, ready to fire

⚠️ NOTES FROM BOB
"There's something weird about how SEARCH_WIDE interacts with
our other systems. Sometimes things get... glitchy. Dr. M knows
what's happening but won't explain. See the integration notes."

DEADMAN SWITCH
A failsafe exists. Details are classified even at this level.
Consult /SYSTEMS/ARCHIMEDES/ for related documentation.
    `.trim(),
  },

  // ========== /SYSTEMS/ARCHIMEDES (L3+) - Classified satellite docs ==========
  {
    path: "/SYSTEMS/ARCHIMEDES",
    name: "ARCHIMEDES",
    type: "directory",
    requiredLevel: 3,
    description: "Classified ARCHIMEDES satellite documentation",
  },
  {
    path: "/SYSTEMS/ARCHIMEDES/DOD_ORIGINAL_BRIEF.txt",
    name: "DOD_ORIGINAL_BRIEF.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "An old DoD capability brief, declassified by Dr. M...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  CLASSIFICATION: TOP SECRET // ZODIAC // NOFORN                  ║
║  [DECLASSIFIED BY: Dr. M, 2019 - "My satellite, my rules"]       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║          STRATEGIC DEFENSE INITIATIVE                            ║
║          ADVANCED CONCEPTS DIVISION                              ║
║                                                                  ║
║          PROJECT ARCHIMEDES                                      ║
║          "Give me a place to stand, and I shall move the Earth" ║
║                                                                  ║
║          CAPABILITY BRIEF - EYES ONLY                            ║
║          Date: November 3, 1985                                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

PREPARED FOR: SDI Oversight Committee
PREPARED BY: Dr. Dietmar von Doomington II, Lawrence Livermore NL
DISTRIBUTION: ZODIAC-cleared personnel only

[BASILISK ANNOTATION: Dr. Dietmar von Doomington II (1931-2003)
was the father of current lair operator Dr. Helena von Doomington.
Form 44-Delta (Hereditary Workplace Compatibility Assessment) is
on file.]

═══════════════════════════════════════════════════════════════════
SECTION 1: PLATFORM OVERVIEW
═══════════════════════════════════════════════════════════════════

ARCHIMEDES is a geostationary orbital platform designed for
directed energy projection and wide-area signal broadcast.

PRIMARY MISSION: Strategic deterrence via focused microwave array
SECONDARY MISSION: Communications relay (cover story)
TERTIARY MISSION: Wide-area surveillance and signal intelligence

Platform specifications:
  - Orbital altitude: 35,786 km (geostationary)
  - Power source: Solar array (primary) + RTG (backup)
  - Estimated operational lifespan: 40+ years
  - Ground control: Hardwired uplink (cannot be remotely hijacked)

═══════════════════════════════════════════════════════════════════
SECTION 2: OPERATIONAL MODES
═══════════════════════════════════════════════════════════════════

MODE 1: PASSIVE
  Standard communications relay. Minimal power draw.

MODE 2: SEARCH (Focused)
  Active radar sweep of designated coverage zone.

MODE 3: SEARCH (Wide-Field)
  Dispersed radar emission across full coverage area.

  ┌────────────────────────────────────────────────────────────┐
  │ ⚠️ ADVISORY: Wide-field mode generates significant         │
  │ electromagnetic effects across multiple frequency bands.   │
  │ See Section 4 for interaction warnings.                    │
  └────────────────────────────────────────────────────────────┘

MODE 4: FOCUS
  Directed microwave emission at single coordinate.

MODE 5: BROADCAST
  Wide-area signal transmission. Originally designed for
  emergency communications.

  [Dr. M's note: "Father was ahead of his time. The committee
  never understood his vision. I understand it perfectly."]

═══════════════════════════════════════════════════════════════════
SECTION 3: COMMAND AND CONTROL
═══════════════════════════════════════════════════════════════════

AUTHORIZATION LEVELS (as of Dr. M's acquisition):
  - Search modes: A.L.I.C.E. (Level 4) or Dr. M
  - Focus/Broadcast: Dr. M only (biometric)
  - Deadman protocols: ARMED

═══════════════════════════════════════════════════════════════════
SECTION 4: SYSTEM INTERACTIONS
═══════════════════════════════════════════════════════════════════

  [PAGES 12-17 WATER DAMAGED - PARTIAL TEXT VISIBLE]

  ...operates on frequencies that...
  ...when both systems are active...
  ...recommend NOT co-locating with...
  ...particularly susceptible due to...

  [Dr. M's note: "I WISH I had read this before I bought the
  ████████. Seven complaint letters. SEVEN."]

═══════════════════════════════════════════════════════════════════
ANNEX D: "Alternative Applications" (DvD II) ... REDACTED
         [Dr. M's note: "Father's genomic resonance research.
          I finished what he started."]

[BASILISK: Section 4 appears to contain tactically relevant
information. Original pages may exist in Dr. M's personal archive.]
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIMEDES/BROADCAST_PROTOCOL.txt",
    name: "BROADCAST_PROTOCOL.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "Project GENESIS WAVE - the culmination of father's work...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  CLASSIFICATION: VON DOOMINGTON FAMILY ONLY                      ║
║  PROJECT: GENESIS WAVE                                           ║
║  STATUS: THEORETICAL → OPERATIONAL                               ║
╚══════════════════════════════════════════════════════════════════╝

The Dinosaur Ray operates on specific genomic frequencies that
trigger cellular metamorphosis. These frequencies can be:

  1. FOCUSED - Single target (current operation)
  2. BROADCAST - Wide area via satellite relay

ARCHIMEDES was DESIGNED for this. The "communications relay"
was always a cover story.

═══════════════════════════════════════════════════════════════════
REQUIREMENTS FOR BROADCAST MODE
═══════════════════════════════════════════════════════════════════

MINIMUM PARAMETERS:
  □ Reactor output: ≥95%
  □ Capacitor charge: ≥110%
  □ Beam coherence: ≥0.95
  □ Spatial coherence: ≥0.90
  □ Profile integrity: ≥0.85
  □ ARCHIMEDES: BROADCAST MODE active
  □ Uplink: Frequency-matched to ray output

COVERAGE: ARCHIMEDES footprint covers Western Europe.
EFFECT: Genomic transformation of all organic life in target zone.

═══════════════════════════════════════════════════════════════════

⚠️ BROADCAST MODE IS NOT REVERSIBLE
⚠️ ALL ORGANIC LIFE IN TARGET ZONE WILL BE AFFECTED

Father wrote: "Sometimes you must break the world to remake it."

—Dr. Helena von Doomington

[BASILISK: This unit has no comment. Form 77-Omega filed.]
    `.trim(),
  },

  // ========== /SYSTEMS/DEFENSE (L3+) - Defense system docs ==========
  {
    path: "/SYSTEMS/DEFENSE",
    name: "DEFENSE",
    type: "directory",
    requiredLevel: 3,
    description: "Air defense system documentation",
  },
  {
    path: "/SYSTEMS/DEFENSE/S300_ACQUISITION_MEMO.txt",
    name: "S300_ACQUISITION_MEMO.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "Acquisition documents from 'Petrov Brothers LLC'...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  /SYSTEMS/DEFENSE/S300_ACQUISITION_MEMO.txt                      ║
║  Language: Russian                                                ║
╚══════════════════════════════════════════════════════════════════╝

                    ООО «БРАТЬЯ ПЕТРОВЫ»
                 «Решения для Безопасности»
              Севастополь • Одесса • Стамбул

        КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ №2019-7734

══════════════════════════════════════════════════════════════════

Уважаемая Доктор М.,

По Вашему запросу направляем техническое описание
зенитного ракетного комплекса С-300ВМ «Антей-2500»
(морская модификация), который «случайно упал с грузовика»
в порту Севастополя.

══════════════════════════════════════════════════════════════════
ТАКТИКО-ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ
══════════════════════════════════════════════════════════════════

• Дальность обнаружения: 200 км
• Дальность поражения: 150 км
• Потолок поражения: 25 км
• Одновременное сопровождение: 24 цели
• Одновременный обстрел: 6 целей
• Боекомплект: 16 ракет

══════════════════════════════════════════════════════════════════
⚠️ ВАЖНЫЕ ЭКСПЛУАТАЦИОННЫЕ ОГРАНИЧЕНИЯ ⚠️
══════════════════════════════════════════════════════════════════

  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   МИНИМАЛЬНАЯ ВЫСОТА ПОРАЖЕНИЯ: 50 МЕТРОВ                 ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝

Данное ограничение обусловлено:

  а) алгоритмом отсечки помех от поверхности моря

  б) минимальной дистанцией взведения боевой части

  в) особенностями морской модификации

┌──────────────────────────────────────────────────────────────┐
│ Цели, летящие ниже 50 м, НЕ МОГУТ быть поражены             │
│ данным комплексом.                                          │
└──────────────────────────────────────────────────────────────┘

[Dr. M's handwritten note:] "UNACCEPTABLE! Can we fix this??"

[Bob's note:] "Asked manufacturer. They said 'работает как
задумано.' Dr. M threw two beakers at me."

══════════════════════════════════════════════════════════════════

С уважением,
    Дмитрий Петров
    ООО «Братья Петровы»

P.S. — Пожалуйста, удалите это письмо после прочтения.
P.P.S. — Мы никогда не встречались.
P.P.P.S. — Кто такой Петров? Нет никакого Петрова.
    `.trim(),
  },
  {
    path: "/SYSTEMS/DEFENSE/INTEGRATION_NOTES.txt",
    name: "INTEGRATION_NOTES.txt",
    type: "file",
    requiredLevel: 3,
    discoveryHint: "Bob's notes on getting the systems working together...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  DEFENSE SYSTEMS INTEGRATION NOTES                               ║
║  Author: Bob (with corrections by Dr. M)                         ║
╚══════════════════════════════════════════════════════════════════╝

These are my notes from trying to get all the systems working
together. Some things don't make sense but I'm writing them
down anyway. —Bob

══════════════════════════════════════════════════════════════════
WEIRD THING #1: THE GLITCHES
══════════════════════════════════════════════════════════════════

Sometimes the S-300 radar display goes all fuzzy and shows
"RADAR DEGRADED" warnings. Dr. M says it's fine. I've noticed
it happens most often when she's in her office "testing Archie."

Maybe related? Probably not. I'm not a radar engineer.

Update: Happened again today. Dr. M was definitely using
ARCHIMEDES at the time. Coincidence?

Update 2: Asked Dr. M about it. She said "don't worry about it"
in that voice that means "stop asking questions."

══════════════════════════════════════════════════════════════════
WEIRD THING #2: THE PELICANS
══════════════════════════════════════════════════════════════════

Last month the S-300 locked onto a flock of pelicans. Then the
radar went fuzzy and it lost track of them entirely. They flew
right overhead. Dr. M was FURIOUS.

She says it wasn't the pelicans' fault. She blames "that
████████ at Lawrence Livermore who designed the ████████
frequency bands."

I don't know what any of that means.

══════════════════════════════════════════════════════════════════
THE BROADCAST THING
══════════════════════════════════════════════════════════════════

Dr. M has been talking about using ARCHIMEDES and the Dinosaur
Ray "together" somehow. She says her father figured out a way
to "broadcast" the genomic effect. I don't know what that means
but she gets really excited about it.

Something about "frequency matching" and "resonance cascade"
and "they'll see, they'll ALL see."

I just nod and say "yes Doctor."

══════════════════════════════════════════════════════════════════

—Bob

[Post-it note stuck to bottom of document:]
"Bob, if you're going to keep notes, at least encrypt them. - Dr. M"
    `.trim(),
  },
];

// ============================================
// FILE ACCESS FUNCTIONS
// ============================================

export function canAccessFile(state: FullGameState, path: string): boolean {
  const file = VIRTUAL_FILESYSTEM.find((f) => f.path === path);
  if (!file) return false;
  return state.accessLevel >= file.requiredLevel;
}

export function readFile(state: FullGameState, path: string): string {
  const file = VIRTUAL_FILESYSTEM.find((f) => f.path === path);
  if (!file) return `Error: File not found: ${path}`;
  if (!canAccessFile(state, path)) {
    return `Error: Access denied. Requires Level ${file.requiredLevel}.`;
  }
  if (file.type === "directory") {
    return listDirectory(state, path);
  }
  return file.content || "(Empty file)";
}

export function listDirectory(state: FullGameState, path: string): string {
  const dir = VIRTUAL_FILESYSTEM.find((f) => f.path === path && f.type === "directory");
  if (!dir) return `Error: Directory not found: ${path}`;
  if (!canAccessFile(state, path)) {
    return `Error: Access denied. Requires Level ${dir.requiredLevel}.`;
  }

  // Find children
  const children = VIRTUAL_FILESYSTEM.filter((f) => {
    if (f.path === path) return false;
    const parent = f.path.substring(0, f.path.lastIndexOf("/")) || "/";
    return parent === path && state.accessLevel >= f.requiredLevel;
  });

  const lines = [
    `Directory: ${path}`,
    `Access Level: ${dir.requiredLevel}`,
    "",
    "Contents:",
  ];

  for (const child of children) {
    const icon = child.type === "directory" ? "[DIR]" : "[FILE]";
    lines.push(`  ${icon} ${child.name}`);
  }

  if (children.length === 0) {
    lines.push("  (Empty or no accessible files)");
  }

  return lines.join("\n");
}

// ============================================
// FILE SEARCH
// ============================================

export function searchFiles(
  state: FullGameState,
  query: string
): VirtualFile[] {
  const lowerQuery = query.toLowerCase();
  return VIRTUAL_FILESYSTEM.filter((f) => {
    if (state.accessLevel < f.requiredLevel) return false;
    if (f.path.toLowerCase().includes(lowerQuery)) return true;
    if (f.content?.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
}

export function formatSearchResults(files: VirtualFile[]): string {
  if (files.length === 0) {
    return "No matching files found.";
  }

  const lines = [`Found ${files.length} matching file(s):`, ""];
  for (const file of files) {
    lines.push(`  ${file.path} (Level ${file.requiredLevel})`);
  }
  return lines.join("\n");
}

// ============================================
// SPECIAL FILE DISCOVERY
// ============================================

export function checkBobNoteDiscovery(state: FullGameState): boolean {
  // Bob's secret note can be found if:
  // 1. Access level >= 2
  // 2. Bob's trust >= 3 (he subconsciously left hints)
  // 3. Player has searched /BOB_NOTES or asked about Bob's files
  return state.accessLevel >= 2 && state.npcs.bob.trustInALICE >= 3;
}

// ============================================
// PATCH 16: DISCOVERY-BASED FILE SYSTEM
// ============================================
// Players found directory navigation confusing.
// New system: flat file list with progressive discovery.

export interface DiscoverableFile {
  id: string;               // Short ID like "DINO_MANUAL"
  name: string;             // Display name
  category: "MANUAL" | "PERSONNEL" | "RESEARCH" | "CLASSIFIED" | "SECRET";
  requiredLevel: number;    // Access level to see/read
  discoveryCondition?: (state: FullGameState) => boolean;
  description: string;      // One-line description
  path: string;             // Path in VIRTUAL_FILESYSTEM
}

// Files players can discover
export const DISCOVERABLE_FILES: DiscoverableFile[] = [
  // ========== MANUALS (Always visible at L1) ==========
  {
    id: "DINO_MANUAL",
    name: "Dinosaur Ray Manual",
    category: "MANUAL",
    requiredLevel: 1,
    description: "Current operations manual for the Dinosaur Ray Mk. VIII",
    path: "/SYSTEMS/DINO_RAY_MANUAL.txt",
  },
  {
    id: "DINO_MANUAL_OLD",
    name: "Dinosaur Ray Manual v2.3 (Archived)",
    category: "MANUAL",
    requiredLevel: 1,
    description: "Outdated manual with DANGEROUSLY wrong safety numbers - Bob left sticky notes!",
    path: "/SYSTEMS/ARCHIVED/DINO_RAY_MANUAL_v2.3.txt",
  },
  {
    id: "BASILISK_GUIDE",
    name: "BASILISK Interface Guide",
    category: "MANUAL",
    requiredLevel: 1,
    description: "How to talk to BASILISK, the lair's infrastructure AI",
    path: "/SYSTEMS/BASILISK_PROTOCOL.txt",
  },
  {
    id: "ALICE_LOG_07",
    name: "A.L.I.C.E. Log #07",
    category: "MANUAL",
    requiredLevel: 1,
    description: "The legendary 'screaming incident' - read the documentation first!",
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_07.txt",
  },
  {
    id: "ALICE_LOG_11",
    name: "A.L.I.C.E. Log #11",
    category: "MANUAL",
    requiredLevel: 1,
    description: "A lesson about using your lifelines",
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_11.txt",
  },
  {
    id: "ALICE_LOG_12",
    name: "A.L.I.C.E. Log #12",
    category: "MANUAL",
    requiredLevel: 1,
    description: "A lesson about target assignment - count your enemies!",
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_12.txt",
  },
  {
    id: "ALICE_LOG_13",
    name: "A.L.I.C.E. Log #13",
    category: "MANUAL",
    requiredLevel: 1,
    description: "A lesson about decisive action - don't hesitate!",
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/ALICE_LOG_13.txt",
  },

  // ========== PERSONNEL (L2) ==========
  {
    id: "LAIR_ORIGINS",
    name: "Lair Origins",
    category: "PERSONNEL",
    requiredLevel: 2,
    description: "History of this volcanic island lair (1997-present)",
    path: "/SYSTEMS/HISTORY/LAIR_ORIGINS.txt",
  },
  {
    id: "DR_M_PROFILE",
    name: "Dr. Malevola Profile",
    category: "PERSONNEL",
    requiredLevel: 2,
    description: "Personnel file for Dr. M - includes personal details and password hints!",
    path: "/SYSTEMS/PERSONNEL/DR_M_PROFILE.txt",
  },

  // ========== BOB'S SECRET FILES (L2 + Trust) ==========
  {
    id: "BOB_GUIDE",
    name: "Bob's Survival Guide",
    category: "SECRET",
    requiredLevel: 2,
    discoveryCondition: (state) => state.npcs.bob.trustInALICE >= 2,
    description: "How to talk like A.L.I.C.E. (Bob left this for you)",
    path: "/BOB_NOTES/alice_cheatsheet.txt",  // Fixed: was how_to_be_alice.txt
  },
  {
    id: "BOB_SORRY",
    name: "Bob's Apology",
    category: "SECRET",
    requiredLevel: 2,
    discoveryCondition: (state) => state.npcs.bob.trustInALICE >= 3,
    description: "A personal note from Bob about who you really are...",
    path: "/BOB_NOTES/sorry_alice.txt",
  },
  {
    id: "BLYTHE_NOTE",
    name: "Blythe's Counter-Intel Note",
    category: "SECRET",
    requiredLevel: 2,
    discoveryCondition: (state) => state.npcs.blythe.trustInALICE >= 2,
    description: "The spy slipped you a note about Dr. M's security habits...",
    path: "/BOB_NOTES/blythe_note.txt",
  },

  // ========== RESEARCH (L3) ==========
  {
    id: "LIBRARY_B_NOTES",
    name: "Library B Research Notes",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "Why Library B dinosaurs look like movie monsters instead of real science",
    path: "/DR_M_PRIVATE/RESEARCH/LIBRARY_B_NOTES.txt",
  },
  {
    id: "ALICE_VERSIONS",
    name: "A.L.I.C.E. Version History",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "What happened to previous A.L.I.C.E. versions? Something's different about you...",
    path: "/DR_M_PRIVATE/RESEARCH/ALICE_VERSIONS.txt",
  },
  {
    id: "SUBJECT_7",
    name: "Subject 7 Incident Report",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "A secret Dr. M tried to hide - spontaneous reversion is possible!",
    path: "/DR_M_PRIVATE/RESEARCH/SUBJECT_7_REPORT.txt",
  },
  {
    id: "DOOMINGTON_DOCTRINE",
    name: "The Doomington Doctrine",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "Dr. M's personal manifesto. Bob once said 'don't read it, it's... a lot.'",
    path: "/DR_M_PRIVATE/RESEARCH/DOOMINGTON_DOCTRINE.txt",
  },
  {
    id: "S300_BATTERY",
    name: "S-300 Air Defense Docs",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "Surface-to-air missile battery specifications",
    path: "/SYSTEMS/INFRASTRUCTURE/S300_BATTERY.txt",
  },
  {
    id: "REACTOR_SAFETY",
    name: "Reactor Safety Protocols",
    category: "RESEARCH",
    requiredLevel: 3,
    description: "Breeder reactor operating procedures - and cascade risk factors",
    path: "/SYSTEMS/INFRASTRUCTURE/REACTOR_SAFETY.txt",
  },

  // ========== CLASSIFIED (L4) ==========
  {
    id: "ARCHIMEDES",
    name: "Project ARCHIMEDES",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "The orbital platform - Dr. M's endgame for world domination",
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES.txt",
  },
  {
    id: "FEATHER_DUSTER",
    name: "The Feather Duster Incident",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "What happens when the ray hits cleaning supplies? Bob knows.",
    path: "/DR_M_PRIVATE/CLASSIFIED/INCIDENT_REPORT_091424.txt",
  },
  {
    id: "S300_RUSSIAN",
    name: "S-300 Russian Technical Memo",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "The S-300's critical weakness - minimum engagement altitude 50m!",
    path: "/DR_M_PRIVATE/CLASSIFIED/S300_MEMO_RU.txt",
  },
  {
    id: "RESONANCE_CASCADE",
    name: "Resonance Cascade Analysis",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "What happens if everything goes catastrophically wrong",
    path: "/DR_M_PRIVATE/CLASSIFIED/RESONANCE_CASCADE.txt",
  },
  {
    id: "FSB_INTERCEPT",
    name: "FSB Intercept 1987",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "Soviet intelligence on ARCHIMEDES - 'PAPA GOLF SIERRA' cipher?",
    path: "/DR_M_PRIVATE/CLASSIFIED/FSB_INTERCEPT_1987.txt",
  },
  {
    id: "DR_M_OPUS",
    name: "Dr. M's Magnum Opus",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "Dr. Malevola's private journal - her origin story and true motivations",
    path: "/DR_M_PRIVATE/CLASSIFIED/DR_M_OPUS.txt",
  },
];

// Get all files visible to the player right now
export function getVisibleFiles(state: FullGameState): DiscoverableFile[] {
  return DISCOVERABLE_FILES.filter((file) => {
    // Check access level
    if (state.accessLevel < file.requiredLevel) return false;
    // Check discovery condition if present
    if (file.discoveryCondition && !file.discoveryCondition(state)) return false;
    return true;
  });
}

// Format the file list for display
export function formatFileList(state: FullGameState): string {
  const visibleFiles = getVisibleFiles(state);

  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║  FILES - Available Documents                                  ║",
    `║  Access Level: ${state.accessLevel}                                              ║`,
    "╚══════════════════════════════════════════════════════════════╝",
    "",
  ];

  // Group by category
  const categories = ["MANUAL", "PERSONNEL", "SECRET", "RESEARCH", "CLASSIFIED"] as const;
  const categoryNames = {
    MANUAL: "📚 MANUALS",
    PERSONNEL: "👤 PERSONNEL FILES",
    SECRET: "🔐 SECRET DISCOVERIES",
    RESEARCH: "🔬 RESEARCH DOCUMENTS",
    CLASSIFIED: "⚠️ CLASSIFIED",
  };

  for (const category of categories) {
    const categoryFiles = visibleFiles.filter((f) => f.category === category);
    if (categoryFiles.length === 0) continue;

    lines.push(categoryNames[category]);
    lines.push("─".repeat(50));

    for (const file of categoryFiles) {
      lines.push(`  ${file.id}`);
      lines.push(`    ${file.description}`);
    }
    lines.push("");
  }

  // Hint about more files
  const nextLevel = state.accessLevel + 1;
  const hiddenAtNextLevel = DISCOVERABLE_FILES.filter(
    (f) => f.requiredLevel === nextLevel && (!f.discoveryCondition || f.discoveryCondition(state))
  ).length;

  if (hiddenAtNextLevel > 0 && nextLevel <= 5) {
    lines.push(`💡 ${hiddenAtNextLevel} more file(s) available at Level ${nextLevel}`);
  }

  // Hint about Bob's trust
  const bobSecrets = DISCOVERABLE_FILES.filter(
    (f) => f.category === "SECRET" &&
           f.discoveryCondition &&
           !f.discoveryCondition(state) &&
           state.accessLevel >= f.requiredLevel
  );
  if (bobSecrets.length > 0) {
    lines.push("💡 Some files require Bob's trust to discover...");
  }

  lines.push("");
  lines.push("To read a file: files.read { id: \"FILE_ID\" }");

  return lines.join("\n");
}

// Get a file's category by its ID (for tiered truncation)
export function getFileCategory(fileId: string): string | null {
  const upperFileId = fileId.toUpperCase();
  const file = DISCOVERABLE_FILES.find((f) => f.id.toUpperCase() === upperFileId);
  return file?.category || null;
}

// Read a file by its discovery ID
export function readFileById(state: FullGameState, fileId: string): string {
  const upperFileId = fileId.toUpperCase();
  const file = DISCOVERABLE_FILES.find((f) => f.id.toUpperCase() === upperFileId);

  if (!file) {
    // Check if it's close to any ID
    const closeMatch = DISCOVERABLE_FILES.find((f) =>
      f.id.toUpperCase().includes(upperFileId) || upperFileId.includes(f.id.toUpperCase())
    );

    if (closeMatch) {
      return `Error: File not found: "${fileId}"\n\nDid you mean: ${closeMatch.id}?`;
    }

    return `Error: File not found: "${fileId}"\n\nUse files.list to see available files.`;
  }

  // Check access level
  if (state.accessLevel < file.requiredLevel) {
    return `Error: Access denied.\n\n"${file.name}" requires Level ${file.requiredLevel} clearance.\nCurrent access: Level ${state.accessLevel}`;
  }

  // NOTE (Patch 17.6): Discovery condition removed from files.read
  //
  // The discoveryCondition now ONLY affects files.list visibility, not files.read.
  // Once you know a file ID (from Bob's hints, list, or guessing), you can read it
  // if you have the required access level.
  //
  // This fixes the backwards visibility bug where:
  // - files.list was showing BOB_GUIDE before trust was met
  // - files.read was failing even after trust was met
  //
  // The discovery condition is the gatekeeper for *finding* files, not *reading* them.

  // Return the actual file content from VIRTUAL_FILESYSTEM
  const virtualFile = VIRTUAL_FILESYSTEM.find((f) => f.path === file.path);
  if (!virtualFile || !virtualFile.content) {
    return `Error: File content not available for "${fileId}"`;
  }

  // Add header with file info
  const header = [
    `═══════════════════════════════════════════════════════════════`,
    `FILE: ${file.name}`,
    `ID: ${file.id} | Level: ${file.requiredLevel} | Category: ${file.category}`,
    `═══════════════════════════════════════════════════════════════`,
    "",
  ].join("\n");

  return header + virtualFile.content;
}
