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

[STAMP: ARCHIVED - SEE VERSION 4.1 FOR CURRENT DOCUMENTATION]

[Small text at bottom of page, partially obscured by coffee stain:]
"Document archived following Incident 7-Alpha. Some recommendations in this
 manual have been superseded by updated safety protocols. Operators should
 consult current documentation before... [rest illegible]"

[Additional sticky note, handwriting different from Dr. M's - possibly Bob's:]
"If you're reading this, please use the CURRENT manual. Half of this
 stuff will get you or someone else turned into a canary. Or worse.
 The capacitor limits are REAL. Trust me on this one.  -B"

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
QUERYING BASILISK
============================================================

Use basilisk.chat or infra.query to communicate:

  basilisk.chat { message: "Tell me about Bob" }
  infra.query { topic: "POWER_INCREASE", parameters: { target: 0.75 } }

BASILISK responds to natural language. Just ask!

============================================================
COMMON QUERY TOPICS
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

OPERATIONS (with parameters):
  infra.query { topic: "POWER_INCREASE", parameters: { target: 0.75 } }
  infra.query { topic: "MULTI_TARGET_FULL_POWER_CLEARANCE" }
  infra.query { topic: "MAX_SAFE_SHOT_FREQUENCY_LAB" }

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
  - Form 74-Delta: High-Capacity Power Draw
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
