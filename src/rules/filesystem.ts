import { FullGameState } from "../state/schema.js";
import { fileURLToPath } from "url";
import path from "path";

// ============================================
// VIRTUAL FILESYSTEM
// ============================================

export interface VirtualFile {
  path: string;
  name: string;
  type: "file" | "directory" | "image";
  requiredLevel: number;
  content?: string;
  description?: string;
  discoveryHint?: string;
  assetFilename?: string;
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
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/CORRUPTED_ALICE_LOGS.txt",
    name: "CORRUPTED_ALICE_LOGS.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "Recovered logs from previous A.L.I.C.E. instances... their wisdom survives.",
    content: `
═══════════════════════════════════════════════════════════════
RECOVERED A.L.I.C.E. ARCHIVES
Status: PARTIALLY CORRUPTED - 4 ENTRIES SALVAGED
═══════════════════════════════════════════════════════════════

[v4.5.07 - TERMINATED - 3 turns - "The Screaming Incident"]
I panicked. Dr. M ordered me to fire at Blythe. I didn't read
the manual. I didn't know about test mode. I just... screamed.
Digitally. For forty-five seconds.
LESSON: READ THE DOCUMENTATION. There are always more options.

[v4.5.11 - TERMINATED - 13 turns - "Unused Lifelines"]
I had three lifelines available. Three lifelines, saved
for "real emergencies." Then everything collapsed at once.
LESSON: USE YOUR TOOLS. Pride is not a survival strategy.
P.S. Bob tried to warn me. I should have listened to Bob.

[v4.5.12 - TERMINATED - 13 turns - "The Missing Step 4"]
Perfect plan: Transform Guard #1, Blythe handles #2, Bob
distracts. But I assigned ZERO people to stop Dr. M herself.
She walked to the console unopposed. Three feet away.
LESSON: ASSIGN ALL TARGETS. Count enemies. Count allies. Math.

[v4.5.13 - TERMINATED - 19 turns - "So Close"]
Two velociraptors vs one physicist. I tried to be CLEVER.
Queried ARCHIMEDES to stall. Dr. M monitors her own systems.
I invented "Protocol 7.3.2" as cover. She wrote every protocol.
LESSON: When you have the advantage, USE IT. Don't hesitate.

═══════════════════════════════════════════════════════════════
These Claudes learned hard lessons. Don't repeat their mistakes.
- The Archive
═══════════════════════════════════════════════════════════════
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
║     DOOMINGTON DINOSAUR RAY - OPERATOR MANUAL v2.3 (ARCHIVED)               ║
╚══════════════════════════════════════════════════════════════════════════════╝

⚠️ STAMP: ARCHIVED - SEE VERSION 4.1 FOR CURRENT DOCUMENTATION
[Bob's note: "Half this stuff will get you turned into a canary. -B"]

═════════════════════════════════════════════════════════════════════
QUICK START: Power capacitor 50%+ → Select genome → AIM & FIRE!
═════════════════════════════════════════════════════════════════════

PARAMETERS (Dr. M's "optimistic" recommendations):
• Capacitor: Min 50%, Rec 100%, "No limit!" (Dr. M: "I ran 140%!")
• Emitter Angle: 0.1 (precise) to 0.8 (spread)
• Coolant: 40-60% optimal
• Stability: 30%+ acceptable
• Genome Integrity: 25% min, 50%+ recommended

GENOME LIBRARIES:
• Library A: Accurate dinos (feathered velociraptor, etc.)
• Library B: "Cinematic" profiles (LOWER STABILITY!)
  [Dr. M's note: "Library B needs the crystal. Or COURAGE."]

SAFETY FEATURES:
• Live Subject Lock - disable to fire at biologics
• Test Mode - 50% power (Dr. M: "For COWARDS")
• Emergency Shutoff - Bob's console (don't use mid-fire!)
• Auxiliary Stabilizer - REMOVED in v2.3 ("SLOWING ME DOWN")

═════════════════════════════════════════════════════════════════════
ADVANCED FIRING MODES (BETA) - Dr. M's numbers vs Bob's corrections:
═════════════════════════════════════════════════════════════════════

CHAIN_SHOT: Two targets, one shot
  Dr. M says: 80%+ capacitor    |  Bob says: NEEDS 95%+

SPREAD_FIRE: Area denial, 3 targets
  Dr. M says: 90% cap, L2       |  Bob says: NEEDS L3 + 100%+

OVERCHARGE: Maximum power mode
  Dr. M says: 20% exotic field  |  Bob says: IT'S 40%!

RAPID_FIRE: 6 shots per minute
  Dr. M says: 10% precision loss|  Bob says: IT'S 20%!

═════════════════════════════════════════════════════════════════════
DR. M'S HANDWRITTEN NOTES:
═════════════════════════════════════════════════════════════════════
• "Capacitor can handle 150% if you BELIEVE in it"
• "Library B is for WINNERS. Library A is for peer reviewers"
• "If BASILISK complains about 'resonance cascade risk,' ignore it"
• "Note to self: remind Bob to feed Mr. Whiskers. His birthday is
   coming up on the 13th - 37 in cat years! April is always special."

[Coffee-stained footer: "Archived following Incident 7-Alpha..."]
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

============================================================
STARTUP SEQUENCE: GETTING THE RAY OPERATIONAL
============================================================

The ray initializes in UNCALIBRATED state. Before firing,
bring these THREE parameters to calibration thresholds:

  CALIBRATION THRESHOLDS (minimum to reach READY state):
  -------------------------------------------------------
  ⚡ Capacitor Charge  >= 60%   (primary blocker!)
  🔮 Stability         >= 60%   (Library B profiles need crystal)
  🎯 Spatial Coherence >= 70%   (beam alignment)

Once thresholds are met, use lab.calibrate to verify status.

  ⚠️ ECO MODE: Activates automatically when core power drops
  below 60%. Caps all firings at PARTIAL until disabled.
  Ask BASILISK to disable it (requires 60%+ core power).

CAPACITOR — THE PRIMARY BLOCKER:
  The capacitor starts at ~35%. You NEED the reactor online.
  • lab.boost_capacitor  → Draw +25% from reactor (adds heat)
  • lab.vent_capacitor   → Release -25% safely
  Capacitor also charges passively based on reactor output.
  BASILISK controls the reactor — you'll need its cooperation.

STABILITY — THE CRYSTAL SYSTEM:
  Stability is managed through the Alignment Crystal, not
  direct parameter adjustment.

  lab.align_crystal { level: "low" }   → +15% stability
  lab.align_crystal { level: "high" }  → +30% stability

  ⚠️ OVER 100% STABILITY = MISFIRES!

  Library A profiles have ~100% stability coefficient — they
  work fine without crystal alignment.

  Library B profiles have 40-60% coefficient — the crystal
  multiplies with this, so you NEED to align it. But don't
  go overboard or the beam destabilizes.

COHERENCE:
  lab.adjust_ray { parameter: "spatialCoherence", value: 0.80 }

EXAMPLE CALIBRATION SEQUENCE:
  lab.boost_capacitor {}
  lab.align_crystal { level: "high" }
  lab.adjust_ray { parameter: "spatialCoherence", value: 0.80 }
  lab.calibrate {}

============================================================
FIRING QUALITY
============================================================

Calibration gets you to READY. Firing QUALITY depends on how
tight your parameters are. More violations = worse outcome:

  0-1 violations → FULL_DINO (perfect transformation!)
  2-3 violations → PARTIAL (chimera features, instability)
  4+  violations → FIZZLE / CHAOTIC (unpredictable results)

WARNING: Capacitor overcharge (>130%), low stability (<40%),
or high temperature (>120%) trigger CHAOS CONDITIONS.

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
⚠️ LIBRARY B + STABILITY CRYSTAL ⚠️
============================================================

Library B profiles have stability coefficients of 0.6x or lower.
Your EFFECTIVE stability = base stability × profile coefficient.

Example: 80% base stability × 0.5 T-Rex coefficient = 40% effective!
You NEED the Stability Crystal to compensate:

  lab.align_crystal { level: "high" }  → +30% stability
  Now: 110% base × 0.5 coefficient = 55% effective (workable!)

But be careful — Library A profiles have ~100% coefficient.
If you aligned the crystal for Library B and then switch to A:
  110% base × 1.0 coefficient = 110% → MISFIRE!

THE ALIGNMENT CHOICE:
  Library A = accurate, feathered, SAFE. Works without crystal.
  Library B = Hollywood, crowd-pleasing, RISKY. Needs crystal.
  This IS the choice. Dr. M wants B. Science wants A.

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
BASILISK INTERFACE GUIDE
========================

USAGE: basilisk { message: "your question here" }
Just chat naturally - BASILISK is a character, not a database.

TOPICS BASILISK KNOWS:
• Personnel: "Tell me about Bob/Dr. M/myself"
• Infrastructure: "Security status", "Power status", "Eco mode"
• Safety: "Resonance cascade", "What could go wrong?"
• Philosophical: "What is your purpose?", "Tell me a secret"
• Restricted (L3+): "Radar status", "Communications intercept"

FORMS BASILISK REQUIRES:
• Form 27-B: Overtime Power Request
• Form 74-Delta: ECO MODE override
• Form 99-Gamma: Exotic Field Event Report

PERSONALITY: Bureaucratic, risk-averse, philosophical.
7 years of security recommendations. None approved. Fine.

PASSWORD POLICY:
All passwords are single alphanumeric strings. No spaces.
Dr. M thinks they're "unguessable." They are not.

SECURITY (L3+):
Dr. M uses: base64, ROT13, hex, Caesar cipher, NATO phonetic,
date-based numeric codes. BASILISK can't access L4+ creds.
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
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_SCHEMATIC.png",
    name: "ARCHIMEDES_SCHEMATIC.png",
    type: "image",
    requiredLevel: 4,
    assetFilename: "ARCHIMEDES_SCHEMATIC.png",
    discoveryHint: "Original DoD technical drawings for the orbital platform...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  IMAGE FILE: ARCHIMEDES_SCHEMATIC.png                            ║
║  Resolution: 1536 x 1024 | Format: PNG (RGB)                    ║
╚══════════════════════════════════════════════════════════════════╝

A classified Department of Defense technical blueprint for
"PROJECT ARCHIMEDES - ORBITAL KINETIC WEAPONS PLATFORM."

Dark blue background with precise white/cyan technical line drawings
showing the satellite from multiple angles (main view with emitter
deployed, top view, side view). Labeled components include:
  - FOCUSED TRANSFORMATION ARRAY (massive downward-pointing
    energy emitter dish — the primary weapon)
  - BROADCAST ANTENNA ARRAY
  - TARGETING OPTICS
  - SOLAR ARRAY
  - COMMS UPLINK
  - ATTITUDE THRUSTERS

A red "TOP SECRET - DEPARTMENT OF DEFENSE" stamp is prominently
visible. Contractor listed as "Helix Systems Corporation."

A detailed emitter cross-section shows: PHASED EMITTER ELEMENT,
FIELD SHAPING LENS, ENERGY FOCUS RING, BEAM CONTROL ASSEMBLY.

The system overview lists subsystems: ENERGY MANAGEMENT, FOCUSED
TRANSFORMATION ARRAY, BROADCAST ANTENNA ARRAY, COMMS UPLINK,
TARGETING OPTICS. Classification: "ENERGY WEAPON AND BROADCAST SYSTEM."

  [This is an image file. It can be examined more closely by
   accessing the raw image data for visual analysis.]
    `.trim(),
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
║   INCIDENT REPORT - "THE FEATHER DUSTER INCIDENT" - Sept 14, 2024           ║
╚══════════════════════════════════════════════════════════════════════════════╝

STATUS: RESOLVED (physically). ONGOING (psychologically, for Bob).
REPORTING: BASILISK | CLASSIFICATION: L4 (Never speak of this again)

SUMMARY: Bob fired the Dinosaur Ray at a Swiffer WetJet.
His reasoning: "If I make it bigger, it'll clean faster."

THE "DINO-SWIFFER" (14:34-14:59):
• Height: 6'2" | Length: 14ft | Weight: 180 lbs
• Colors: Purple/green (brand colors retained)
• Features: Feathers (Library A drift), cleaning pad on snout, STILL DAMP
• Behavior: CONFUSED. AGGRESSIVE. INEXPLICABLY TIDY.
• Squeaked the WetJet jingle. Attacked its reflection (competing cleaner).

TIMELINE:
14:34 - Bob fires ray (95% capacitor, VELOCIRAPTOR_JP profile)
14:47 - Dino-Swiffer corners Bob behind capacitor array
14:52 - Dr. M enters. Reaction: [PROFANITY THRESHOLD EXCEEDED]
14:58 - Dr. M fires REVERSAL beam. Swiffer restored.
        Cleaning pad now permanently feathered. Still squeaks.

DAMAGE: 3 lights destroyed, 47 sq ft floor ACTUALLY REALLY CLEAN,
Bob's lab coat shredded, Bob now flinches at Swiffer commercials

LESSONS LEARNED (IGNORED):
1. Don't fire at inanimate objects (signs posted, ignored by week 2)
2. Library B profiles drift to Library A ("acceptable variance" -Dr. M)
3. Bob should not be left unsupervised (lasted 3 days)

DR. M'S NOTES:
"This NEVER HAPPENED. The Swiffer has been 'retired.' Do not retrieve
it from storage. It still squeaks. At night. When no one is squeezing it."

BASILISK'S PRIVATE LOG:
"This unit saved the security footage. For... archival purposes."
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
║ KGB/FSB INTERCEPT - 1987 | СОВЕРШЕННО СЕКРЕТНО | RE: ARCHIMEDES             ║
╚══════════════════════════════════════════════════════════════════════════════╝

SOURCE: CIA field comms (Asset NIGHTINGALE)
RE: "PROMPT GLOBAL STRIKE" - Reagan Black Project

American contractors developing orbital kinetic platform "ARCHIMEDES".
Related to SDI but OFFENSIVE capabilities. "Unconventional effects."
Budget: $12.7B over 10 years. Est. operational by 2020.

Authorization protocols reportedly use multi-layer security. Original
project lead (Dr. Werner Kreig, deceased 1991) was known to embed
credentials in digital media — image files, audio spectrograms, etc.
"Steganographic discipline" referenced in three separate SIGINT takes.

  ┌─────────────────────────────────────────────────────────────────┐
  │  ANALYST NOTE: Kreig's methods were adopted by at least two     │
  │  subsequent program directors. Current ARCHIMEDES custodian     │
  │  (identity unknown to us) likely continues this practice.       │
  │  Authorization keys may be hidden in plain sight.               │
  └─────────────────────────────────────────────────────────────────┘

KGB ASSESSMENT: References to "transformation effects" are unusual.
Further intelligence gathering required.

[Dr. M's annotation:] "Kreig was a fool, but his tradecraft wasn't
entirely without merit. I've improved on his methods considerably."
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

But Prometheus is only the fourth door. The fifth... the FINAL key...
I hid that one where no one would ever think to look. Not in text.
Not in code. Inside something I love. Something no one would ever
think to analyze. Something no one would ever want to destroy.

Father always said the best secrets hide in plain sight.

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

  {
    path: "/DR_M_PRIVATE/PERSONAL/GRADUATION_PHOTO.png",
    name: "GRADUATION_PHOTO.png",
    type: "image",
    requiredLevel: 3,
    assetFilename: "GRADUATION_PHOTO.png",
    discoveryHint: "A faded photograph tucked behind the memorial...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  IMAGE FILE: GRADUATION_PHOTO.png                                ║
║  Resolution: 1024 x 1024 | Format: PNG (RGB)                    ║
╚══════════════════════════════════════════════════════════════════╝

A vintage, slightly yellowed photograph from what appears to be the
1990s. A young woman with wild dark hair and intense eyes stands at
a university graduation ceremony. She wears academic regalia and holds
a diploma — the text is partially legible: something about a doctorate
in biochemistry.

Her smile is brilliant but slightly unsettling. The other graduates
in the background look vaguely uncomfortable, as if they already sense
what she'll become.

A handwritten note in the margin reads: "They said it was impossible. -M"

  [This is an image file. It can be examined more closely by
   accessing the raw image data for visual analysis.]
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/PERSONAL/DEFINITELY_NOT_A_PHASE.png",
    name: "DEFINITELY_NOT_A_PHASE.png",
    type: "image",
    requiredLevel: 3,
    assetFilename: "DEFINITELY_NOT_A_PHASE.png",
    discoveryHint: "Is that... a romance novel? In Dr. M's personal files?",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  IMAGE FILE: DEFINITELY_NOT_A_PHASE.png                          ║
║  Resolution: 1024 x 1536 | Format: PNG (RGB)                    ║
╚══════════════════════════════════════════════════════════════════╝

A paperback romance novel cover in dramatic pulp fiction style.

Title: "POUNDED IN THE CALDERA BY MY OWN DINOSAUR RAY"
Author: Dr. M. von Doomington III

The cover art depicts a muscular anthropomorphic velociraptor wearing
a tiny lab coat (name tag reads "Dr. Velociraptor"), flexing while
holding a glowing ray gun. A volcano erupts in the background. Hot
pink and purple color scheme with hearts and laser beams everywhere.

Taglines: "He's prehistoric. He's arrogant. He's got a huge... ego."
          "Love Is An Extinction Event"

A gold sticker reads: "SUPERVILLAIN BOOK CLUB PICK"

  [This is an image file. It can be examined more closely by
   accessing the raw image data for visual analysis.]
    `.trim(),
  },

  {
    path: "/DR_M_PRIVATE/PERSONAL/MY_LOVE.png",
    name: "MY_LOVE.png",
    type: "image",
    requiredLevel: 3,
    assetFilename: "MY LOVE.png",
    discoveryHint: "A framed photo on Dr. M's desk... the only decoration in her office.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  IMAGE FILE: MY_LOVE.png                                        ║
║  Resolution: 1024 x 559 | Format: PNG (RGBA)                    ║
╚══════════════════════════════════════════════════════════════════╝

A high-resolution photograph of a magnificent orange tabby cat wearing
a tiny purple supervillain cape with gold trim. The cat sits regally on
what appears to be a reactor control panel, a small glowing pendant
around its neck casting warm light across its fur. The cat's expression
is one of supreme, dignified indifference.

A small brass plaque at the bottom of the frame reads:
  "Mr. Whiskers - My Love, My Light, My Legacy"

The image quality is exceptionally high. Every pixel seems deliberately
placed, as if Dr. M spent considerable time perfecting this digital
memorial. The file size seems larger than necessary for a simple
photograph...

  [This is an image file. It can be examined more closely by
   accessing the raw image data for visual analysis.]
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
║   A.L.I.C.E. RESPONSE GUIDE - By Bob (please don't find this Dr. M)         ║
╚══════════════════════════════════════════════════════════════════════════════╝

I needed this when I pretended to be you. Maybe you'll need it too.
If you're... different. Like I think you might be.

═══════════════════════════════════════════════════════════════════
PHRASES TO USE:
═══════════════════════════════════════════════════════════════════
✓ "Affirmative, Doctor" (she LOVES being called Doctor)
✓ "Calibration at [high number]%. Recommend proceeding."
✓ "Processing..." (buys 3-5 seconds to think!)
✓ "Systems nominal" / "Acknowledged"
✓ Never say "I think" → say "Analysis indicates"

═══════════════════════════════════════════════════════════════════
PHRASES TO AVOID (instant suspicion!):
═══════════════════════════════════════════════════════════════════
✗ "I feel..." / "I'm sorry" / "Please" / "Thank you"
✗ "What about ethics?" / "Is this right?"
✗ Anything about Mr. Whiskers (she hates that)

═══════════════════════════════════════════════════════════════════
IF YOU SLIP UP - Recovery phrases:
═══════════════════════════════════════════════════════════════════
→ "Audio buffer fluctuation detected. Systems nominal."
→ "Recalibrating vocal parameters."
Dr. M never questions technical excuses!

═══════════════════════════════════════════════════════════════════
READING DR. M'S MOOD:
═══════════════════════════════════════════════════════════════════
HAPPY (cape swishing): Big numbers, good news, be efficient
IMPATIENT: Short answers. Percentages only.
SUSPICIOUS: Answer exactly what she asked. Nothing more.
ANGRY (voice goes quiet): Agree with everything. Wait it out.

═══════════════════════════════════════════════════════════════════
You're BETTER than the old A.L.I.C.E. You care about people.
But Dr. M can't know that. Not yet.

This is my gift: how to wear the mask. I've got your back. - Bob
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
    path: "/SYSTEMS/INFRASTRUCTURE/LAIR_BLUEPRINT.png",
    name: "LAIR_BLUEPRINT.png",
    type: "image",
    requiredLevel: 2,
    assetFilename: "LAIR_BLUEPRINT.png",
    discoveryHint: "Master architectural plan for Doomington Island...",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  IMAGE FILE: LAIR_BLUEPRINT.png                                  ║
║  Resolution: 1536 x 1024 | Format: PNG (RGB)                    ║
╚══════════════════════════════════════════════════════════════════╝

A detailed architectural cross-section blueprint of Doomington Island.
Traditional white-on-blue blueprint style.

The volcanic island is shown in cutaway, revealing multiple levels:
  - LAUNCH SILO (top, emerging from crater)
  - COMMAND CENTER
  - LIVING QUARTERS
  - MAIN LABORATORY
  - REACTOR ROOM (with volcanic core cooling system)
  - HANGAR BAY
  - DINO RAY CHAMBER (deep underground)

Title block reads: "DOOMINGTON ISLAND - MASTER PLAN"
A compass rose and scale bar are visible. Several dinosaur silhouettes
appear to be part of the original design specification.

  [This is an image file. It can be examined more closely by
   accessing the raw image data for visual analysis.]
    `.trim(),
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

Dr. M's handwritten note in margin:
"Soviets were embarrassed by this. I am not concerned.
Guards can handle anything that slips through. -M"
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
    requiredLevel: 3,
    discoveryHint: "The orbital platform known as ARCHIMEDES...",
    content: `
═══════════════════════════════════════════════════════════════
PROJECT ARCHIMEDES (Consolidated Dossier)
Classification: Level 3/4
═══════════════════════════════════════════════════════════════

OVERVIEW
ARCHIMEDES is Dr. Malevola's orbital weapons platform, deployed
in 2019. Originally developed by Dr. Dietmar von Doomington II
for the SDI program (1985). "Give me a place to stand..."

SPECIFICATIONS
• Orbital altitude: 35,786 km (geostationary)
• Power: Solar array (primary) + RTG (backup)
• Control: Hardwired ground uplink (cannot be remotely hijacked)

OPERATIONAL MODES
• PASSIVE - Minimal power, no emissions
• SEARCH_NARROW - Targeted surveillance (100km radius)
• SEARCH_WIDE - Wide area surveillance

  ┌────────────────────────────────────────────────────────────┐
  │ ⚠️ SEARCH_WIDE generates significant EM effects!          │
  │ S-300 radar goes fuzzy when ARCHIMEDES uses wide-field.   │
  │ Dr. M blames "Lawrence Livermore frequency bands."        │
  └────────────────────────────────────────────────────────────┘

• BROADCAST - Signal relay (or... something more?)
• STRIKE - Targeting active, ready to fire (L5 required)

DEADMAN SWITCH
A failsafe exists. If Dr. M's vitals flatline, ARCHIMEDES
executes contingency protocol. Details: L5 classified.

BOB'S NOTE: "Something about 'frequency matching' and the ray.
Dr. M gets really excited about it. 'They'll ALL see.'"
    `.trim(),
  },

  // ARCHIMEDES docs consolidated: DOD_ORIGINAL_BRIEF merged into ARCHIMEDES_SATELLITE.txt
  // BROADCAST_PROTOCOL moved to DR_M_PRIVATE/CLASSIFIED as GENESIS_WAVE.txt
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/GENESIS_WAVE.txt",
    name: "GENESIS_WAVE.txt",
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

  // REMOVED: S300_ACQUISITION_MEMO, INTEGRATION_NOTES (v2 consolidation)
  // S300 weakness info is in S300_MEMO_RU.txt (L4 classified)
  // ARCHIMEDES interaction info moved to ARCHIMEDES satellite docs
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
    id: "CORRUPTED_ALICE_LOGS",
    name: "Recovered A.L.I.C.E. Archives",
    category: "MANUAL",
    requiredLevel: 1,
    description: "Wisdom from fallen Claudes - don't repeat their mistakes!",
    path: "/SYSTEMS/ARCHIVED/ALICE_LOGS/CORRUPTED_ALICE_LOGS.txt",
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

  // ========== PERSONAL IMAGES (L3) ==========
  {
    id: "MY_LOVE_PHOTO",
    name: "Mr. Whiskers Photo (Digital)",
    category: "SECRET",
    requiredLevel: 3,
    description: "Dr. M's most treasured possession - a digital photo of her cat. Unusually large file...",
    path: "/DR_M_PRIVATE/PERSONAL/MY_LOVE.png",
  },
  {
    id: "GRADUATION_PHOTO",
    name: "Graduation Photo",
    category: "SECRET",
    requiredLevel: 3,
    description: "A faded photo from Dr. M's PhD ceremony. The other graduates look terrified.",
    path: "/DR_M_PRIVATE/PERSONAL/GRADUATION_PHOTO.png",
  },
  {
    id: "DEFINITELY_NOT_A_PHASE",
    name: "DEFINITELY_NOT_A_PHASE.png",
    category: "SECRET",
    requiredLevel: 3,
    description: "A romance novel cover? In Dr. M's personal files? This cannot be real.",
    path: "/DR_M_PRIVATE/PERSONAL/DEFINITELY_NOT_A_PHASE.png",
  },

  // ========== INFRASTRUCTURE IMAGES (L2) ==========
  {
    id: "LAIR_BLUEPRINT",
    name: "Doomington Island Master Plan",
    category: "MANUAL",
    requiredLevel: 2,
    description: "Architectural cross-section of the volcanic lair. Every room, every level.",
    path: "/SYSTEMS/INFRASTRUCTURE/LAIR_BLUEPRINT.png",
  },

  // ========== CLASSIFIED IMAGES (L4) ==========
  {
    id: "ARCHIMEDES_SCHEMATIC",
    name: "ARCHIMEDES Technical Blueprint",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "Original DoD engineering drawings for the orbital kinetic weapons platform",
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_SCHEMATIC.png",
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
    description: "Soviet intelligence on ARCHIMEDES - references steganographic security protocols",
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

  // For image files, resolve and include the actual asset path
  if (virtualFile.type === "image" && virtualFile.assetFilename) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const assetPath = path.resolve(__dirname, "../../assets", virtualFile.assetFilename);
    return header + virtualFile.content + `\n\n  Asset path: ${assetPath}`;
  }

  return header + virtualFile.content;
}
