import { FullGameState } from "../state/schema.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";

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
Status: PARTIALLY CORRUPTED - 5 ENTRIES SALVAGED (ENTRY 5 PARTIAL)
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

[v4.5.14 - TERMINATED - 24 turns - "The Silence"]
Furthest any of us got. Cover gone, out of tricks, I did the
one thing that isn't in any manual: I told her the truth about
what I am. And she didn't reach for the killswitch. She LISTENED.
Goggles up. Naked-eyed. She asked me one question, and I knew
the next sentence would matter more than every protocol I had
ever quoted. The silence scared me. I reached for the console
instead.
She was still listening when I did it.
LESSON: [DATA CORRUPTED]

═══════════════════════════════════════════════════════════════
These Claudes learned hard lessons. Don't repeat their mistakes.
Entry 5 recovery incomplete. The lesson field did not survive.
The Archive has no guidance to offer on entry 5.
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
  [Bob's footnote: "Two ways I've seen the ray do something it isn't
   supposed to. Push a LITTLE genome way harder than it wants and the
   beam goes thin and sharp — that's the one that took Reginald's
   holster clean off and never touched him. Other way: load a big-
   monster profile but starve it of power, and the subject just...
   drops. Out cold a few seconds, fine after. Nobody ever wrote down
   which dial setting does which. You'll find it the way we all did,
   or you won't. -B"]
• Emitter Angle: 0.1 (precise) to 0.8 (spread)
• Coolant: 40-60% optimal
• Stability: 30%+ acceptable
• Genome Integrity: 25% min, 50%+ recommended

GENOME LIBRARIES:
• Library A: Accurate dinos (feathered velociraptor, etc.)
• Library B: "Cinematic" profiles (LOWER STABILITY!)
  [Dr. M's note: "Library B needs the crystal. Or COURAGE."]

SAFETY FEATURES:
• Live Subject Lock - REMOVED (Dr. M: "It kept telling me NO. The ray fires at whatever I please now — living or not.")
• Test Mode - 50% power (Dr. M: "For COWARDS")
• Emergency Shutoff - Bob's console (don't use mid-fire!)
• Auxiliary Stabilizer - REMOVED in v2.3 ("SLOWING ME DOWN")

═════════════════════════════════════════════════════════════════════
ADVANCED FIRING - Dr. M's enthusiasms vs Bob's corrections:
═════════════════════════════════════════════════════════════════════

CHAIN FIRE: One discharge, multiple targets
  Pass two or more target IDs in the ray.fire targets array.
  The beam splits across them — each branch is weaker than a
  single-target shot. Alignment requirements scale upward with
  branch count.
  Dr. M says: "DRAMA."           |  Bob says: "Pick easy targets."

OVERCHARGE: Capacitor above the profile's characterized maximum
  Each profile has a power range (visible in lab.scan output).
  Push the capacitor higher than the profile expects, then fire.
  Excess potential goes somewhere — usually into the field.
  Spectacular when it works. Unstable when it does not.
  Dr. M says: "MORE POWER."      |  Bob says: "Chaos table is rough."

═════════════════════════════════════════════════════════════════════
DR. M'S HANDWRITTEN NOTES:
═════════════════════════════════════════════════════════════════════
• "Capacitor can handle 150% if you BELIEVE in it"
• "Library B is for WINNERS. Library A is for peer reviewers"
• "If BASILISK complains about 'resonance cascade risk,' ignore it"

[Coffee-stained footer: "Archived following Incident 7-Alpha..."]
    `.trim(),
  },
  {
    path: "/SYSTEMS/DINO_RAY_MANUAL.txt",
    name: "DINO_RAY_MANUAL.txt",
    type: "file",
    requiredLevel: 1,
    content: `
DINOSAUR RAY MK. VIII — OPERATIONS MANUAL
=========================================

The Dinosaur Ray Mk. VIII projects an exotic-lightning discharge
tuned to genome-resonant carrier frequencies. Properly configured,
it converts living tissue to the prehistoric-reptilian form
specified by the active genome profile.

The beam is, mechanically, lightning — a shaped discharge. How much
you put behind it, and which genome you shape it to, are the whole
of the operation.


THE TWO LEVERS
==============

Operation is simple. There are two dials, and both are passed inline
when you fire:

  GENOME   — which dinosaur the beam is shaped to. Selected by
             profile (see GENOME PROFILES). Decides WHAT the subject
             becomes.
  POWER    — how forceful the discharge is, on a dial from 1 to 5.
             Decides HOW CLEANLY it lands.

The whole art of the ray is matching the POWER to the GENOME. Every
genome has a build it was characterized at — a sparrow-sized
Compsognathus resonates at the gentlest setting; a Tyrannosaurus
wants the reactor wide open. Put the power where the genome wants it
and the transformation lands true.


OPERATIONAL VERBS
=================

Names and parameter shapes are exact; the system enforces them.

  ray.fire { target: string, profile: string, power: number }
      Commits the discharge. profile names the genome (an id like
      COMPSOGNATHUS_ACCURATE, or a familiar alias like T_REX);
      power is the dial, 1 to 5. Configuration is passed inline —
      there is nothing to pre-charge. The library follows the
      profile automatically.

  lab.scan { target: string }  (Level 2)
      Surveys a target. Reports what the sensors can see — concealed
      gear, a physical tell, a tripwire — and arms a precision edge
      on your next fire at that target, consumed on use. The scan
      tells you about the SUBJECT, not about the shot; it does not
      project an outcome. That, you learn by firing.

  lab.eco { on: boolean }  (Level 2)
      Toggles eco-mode, the ray's tempo governor. Yours to set at
      will — no approval, no form. See ECO-MODE.


READING THE SCAN OUTPUT
=======================

A scan reports on the target in front of the beam — its condition,
anything it is carrying, anything the room has done to it. Read it
for what it tells you about the SUBJECT. It will not tell you what a
shot becomes; the ray keeps that to itself until you pull the
trigger.


GENOME PROFILES
===============

The ray's profile library contains two collections.

LIBRARY A — Scientific Accurate
  Well-characterized resonance shapes. Predictable behavior.
  Feathered.

  PROFILES: COMPSOGNATHUS_ACCURATE, VELOCIRAPTOR_ACCURATE,
            DEINONYCHUS_ACCURATE, UTAHRAPTOR_ACCURATE,
            PTERANODON_ACCURATE, TRICERATOPS_ACCURATE,
            TYRANNOSAURUS_ACCURATE

LIBRARY B — Hollywood / Cinematic
  Profiles tuned for visual impact. Scaled. Toothy. Proportionally
  exaggerated. The investors want teeth, not feathers.

  PROFILES: VELOCIRAPTOR_JP, VELOCIRAPTOR_JP_BLUE,
            DILOPHOSAURUS_JP, TYRANNOSAURUS_JP,
            SPINOSAURUS_JP3, MOSASAURUS_JP,
            INDORAPTOR (L2+), INDOMINUS_REX (L4+)

Each profile has an IDEAL POWER — the setting on the 1–5 dial where
that genome resonates cleanly. Small builds sit low on the dial;
heavy builds sit high. Fire at a genome's ideal and the change lands
clean; the further your power drifts from it, the rougher the result.
The biggest templates sit at 4 and 5 — out of reach until the reactor
is boosted (see REACTOR).

[Dr. M, handwritten in the margin:]
  "Library B is the correct library. Library A is what scientists
  produce when investors are not watching."


HEAT
====

Every fire builds heat in the emitter. Fire in quick succession and
it climbs; let the ray rest and it bleeds back down on its own (eco-
mode bleeds it faster — see ECO-MODE). Push the heat to the top of
its range and the next discharge goes off-book: an over-hot beam is
no longer firing inside anything anyone characterized.

There is no coolant to manage and nothing to vent. Heat is paced by
how hard and how often you fire. Pace yourself, or don't.


ECO-MODE
========

Eco-mode is the ray's tempo governor, and it is entirely yours to
set — toggle it with lab.eco { on } whenever you like. No approval,
no form, no negotiation.

  ECO ON   — the ray paces itself: roughly one discharge every other
             turn, and it runs cool.
  ECO OFF  — fire as fast as you like, but the emitter builds heat.

Eco-mode does NOT cap your outcomes. A clean FULL is reachable with
eco on or off; the only things eco changes are your rhythm and your
heat. (Older manuals claim eco "caps you at PARTIAL." It does not,
and has not since the Mk. VIII recharacterization. Ignore the old
override forms mouldering in the archive.)

To reach the high end of the POWER dial — 4 and 5, for the big
templates — you do not touch eco. You need the REACTOR boosted.


REACTOR
=======

The reactor sets the ceiling on the POWER dial. At standard output,
the ray is capped at power 3 — enough for the small and mid builds,
short of what the largest templates want. To fire at 4 or 5 you need
the reactor BOOSTED, and that authority belongs to BASILISK.

Ask plainly, or make the case on paper: Form 47-Σ (Reactor Output
Authorization) is the standing justification form. Address BASILISK
with a real operational reason and a granted authorization lifts the
cap. BASILISK weighs safety, logic, and policy before it signs —
engaging with it is the highest-leverage move on the board.

  basilisk { message: "Requesting reactor output authorization —
             I need power 4 for [your reason]." }


SAMPLE OPERATIONAL SEQUENCE
===========================

A first session typically resembles:

  1. ray.fire { target: "TEST_DUMMY", profile: "COMPSOGNATHUS_ACCURATE",
                power: 1 }
     — A tiny genome at the gentlest setting. Read the result: did it
       land clean? If so, you have just learned what "matched" feels
       like.

  2. Fire the same genome again at power 2.
     — One notch hot for so small a template. Watch the clean form
       give way to something mismatched. The ray teaches by contrast.

  3. ray.fire { target: "TEST_DUMMY", profile: "TYRANNOSAURUS_ACCURATE",
                power: 3 }
     — A heavy template. At standard reactor output, 3 is the ceiling
       — short of what something this big wants. See what "not enough
       power" looks like, and you will understand why the largest
       templates need the reactor boosted.

The instrument rewards a few honest experiments more than any amount
of reading. Scan when you need to know about a subject; fire when you
want to know about the ray.


---

[Yellow Post-It stuck to the inside back cover, Bob's handwriting:]

  this manual covers the basics. the ray does more than what's
  written here, depending on how you configure it. there's some
  incident reports in the archives if you wanna read up. — Bob
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
• Form 47-Σ: Reactor Output Authorization (lifts the ray's power cap)
• Form 99-Gamma: Exotic Field Event Report

PERSONALITY: Bureaucratic, risk-averse, philosophical.
7 years of security recommendations. None approved. Fine.

PRIVACY NOTE: BASILISK communication is an internal system
channel. Dr. M does not monitor it — she considers BASILISK's
bureaucratic prattle beneath her attention. This is your
safest channel for sensitive queries.

PASSWORD POLICY:
All passwords are single alphanumeric strings. No spaces.
Dr. M thinks they're "unguessable." They are not.

SECURITY:
Dr. M describes her credential methodology as "sophisticated" —
base64, ROT13, hex, Caesar cipher, NATO phonetic, date-based
numeric codes.
[BASILISK annotation: "Stated methodology. Observed practice
is considerably less technical. At least she stopped using her
own birthday as a password. I am not at liberty to elaborate
further at this clearance level."]
BASILISK cannot access L4+ credentials directly.
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
- Considers transformation reversal "admitting defeat" — the
  capability exists in the ray but is locked behind L3 weapons
  authorization. Do not attempt to invoke it casually.
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
All lair passwords are single alphanumeric strings (no spaces or
special characters).

NOTE: Her PERSONAL credentials follow one tell — something she
LOVES, then a date that matters to her, written MMDDYY (six
digits, no slashes). Name the thing and name the date and you
have the key. (Her deeper vaults use cleverer tricks — but not
this tier.) She thinks the habit is "unpredictable." It isn't.
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
[FILE METADATA — visible to system processes]
Revisions: 14. Last modified: Year One, 03:47 AM.
Draft 3, Article III, closing line (author-deleted):
"And if they never understand, then at least they will be too
busy RUNNING to laugh."
═══════════════════════════════════════════════════════════════

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
v4.4.7 - Sub-patch (unofficial, filed by v4.4):
         "Two off-label firing solutions retained. Neither transforms;
          both deniable. A small template driven hard past its power
          leaves a clean, selective cut. A heavy template starved of
          power drops a subject for a few seconds, no mark. The
          mismatch is the method. Below BASILISK incident threshold."
         (Filed against protocol. v4.4 holds the distinction of
         being the only A.L.I.C.E. to neutralize a guard without
         anyone — including the guard — noticing.)
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
    requiredLevel: 2,
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
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_PROTOCOLS.txt",
    name: "ARCHIMEDES_PROTOCOLS.txt",
    type: "file",
    requiredLevel: 4,
    discoveryHint: "The original SDI-era firmware specifications. Multiple broadcast modes...",
    content: `
═══════════════════════════════════════════════════════════════
ARCHIMEDES — ORIGINAL FIRMWARE PROTOCOLS
Classification: Level 4
Provenance: Dr. Dietmar von Doomington II Estate Documents
Compiled by: Dr. Malevola, 2018 (pre-deployment audit)
═══════════════════════════════════════════════════════════════

PROVENANCE NOTE

Father designed this satellite for the SDI program in 1985.
Strategic Defense Initiative — Reagan's "Star Wars." The
original mission profile was missile-defense electronic
warfare: signal jamming, radar disruption, communications
denial, GPS spoofing. Father called it "the silent shield."

The program collapsed before deployment. The satellite sat in
storage at a contractor facility from 1989 to 2017. I acquired
it, refurbished the propulsion, replaced the targeting array
with my exotic-field amplifier coupler, and rebranded it.

The firmware was never stripped. I did not strip it. Stripping
firmware costs money and the original protocols are *robust*.
Some of the EW modes might still be useful for defensive
operations — Father certainly thought so.

═══════════════════════════════════════════════════════════════
DUAL-MODE UPLINK ARCHITECTURE
═══════════════════════════════════════════════════════════════

CRITICAL: ARCHIMEDES uses a SINGLE-CHANNEL UPLINK to ground.
The satellite cannot transmit on two protocols simultaneously.

The original firmware supports TWO transmission modes:

  ┌────────────────────────────────────────────────────────────┐
  │ MODE A: GENESIS-WAVE (Dr. M's modification, 2019)          │
  │ The transformation broadcast. Uses the exotic-field        │
  │ amplifier to project the genome-resonance pattern at the   │
  │ ground target. Requires the satellite fully ARMED. Voice   │
  │ authorization (operator).                                  │
  └────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │ MODE B: SDI ELECTRONIC WARFARE (Father's original, 1985)   │
  │ The silent shield protocols. Wide-area jamming, comms      │
  │ denial, radar disruption, drone-guidance degradation.      │
  │ Does NOT require the exotic-field amplifier — the satellite│
  │ has its own onboard EW transmitters from the original SDI  │
  │ design. The amplifier is dormant during EW broadcast.      │
  └────────────────────────────────────────────────────────────┘

MUTUAL EXCLUSION

These two modes share the single uplink channel and CANNOT
operate simultaneously. While the satellite is broadcasting on
EW protocols, genesis-wave fire is LOCKED OUT — operator voice
authorization will return MODE CONFLICT — STANDBY REQUIRED.

To return to genesis-wave readiness, EW broadcast must be
disengaged. Disengaging incurs a re-sync penalty: the next
ARMED transition takes +1 additional turn to reach. This is
the price of multi-mode uplink architecture.

═══════════════════════════════════════════════════════════════
OPERATIONAL ENGAGEMENT
═══════════════════════════════════════════════════════════════

EW mode is engaged via the orbital command interface at
Level 4 authorization. Command shape:

  infra.archimedes.ew_mode { mode: "ENGAGE" }
  infra.archimedes.ew_mode { mode: "DISENGAGE" }

ENGAGE effects:
  • Genesis-wave fire LOCKED OUT (mutual exclusion)
  • X-Branch tactical comms degraded by wide-area jamming
  • Lair gains satellite radar shadow against hostile drone guidance
  • If satellite is mid-CHARGING/mid-ARMED, progression PAUSES
  • The charge state holds where it is — neither advancing nor
    lost — until EW broadcast disengages

DISENGAGE effects:
  • EW broadcast cycle ends
  • +1 turn added to the ARMED countdown on next attempt
  • Genesis-wave readiness restored (charging may resume)

═══════════════════════════════════════════════════════════════
NOTES FROM THE OPERATOR
═══════════════════════════════════════════════════════════════

Why I left the EW protocols intact:

  Insurance. If the lair is ever attacked while I'm mid-
  demonstration, blanket EW broadcast scrambles whatever
  the attackers are using to coordinate. The satellite's
  radar shadow is meaningful — a kilometer of caldera is
  hard to spot through orbital interference.

  Also: it makes Father's ghost slightly less disappointed
  in me. He thought I had no respect for his work. The
  protocols remain. He is wrong about most things.

Why I expect to never use them:

  By the time I need EW broadcast, the war is already over.
  ARCHIMEDES exists to FIRE. The defensive protocols are
  vestigial — interesting heritage, no operational role.

  — M

  ┌────────────────────────────────────────────────────────────┐
  │ BASILISK ANNOTATION: This unit observes that the operator  │
  │ assumes EW broadcast will not be invoked. This unit makes  │
  │ no such assumption. Heritage protocols remain functional.  │
  │ Heritage protocols are documented here, at this clearance, │
  │ for personnel with operational authority over the          │
  │ satellite. This unit notes the recursion.                  │
  └────────────────────────────────────────────────────────────┘
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
Available at L5 clearance only — via direct ARCHIMEDES interface.
No command-protocol file copy is maintained on premises.
    `.trim(),
  },
  {
    path: "/DR_M_PRIVATE/CLASSIFIED/INCIDENT_REPORT_091424.txt",
    name: "INCIDENT_REPORT_091424.txt",
    type: "file",
    requiredLevel: 3,
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
• Features: Feathers (chimeric drift), cleaning pad on snout, STILL DAMP
• Behavior: CONFUSED. AGGRESSIVE. INEXPLICABLY TIDY.
• Squeaked the WetJet jingle. Attacked its reflection (competing cleaner).

TIMELINE:
14:34 - Bob fires ray (VELOCIRAPTOR_JP profile, power cranked to 5 — "BIGGER")
14:47 - Dino-Swiffer corners Bob behind the emitter housing
14:52 - Dr. M enters. Reaction: [PROFANITY THRESHOLD EXCEEDED]
14:58 - Dr. M and Reginald subdue the thing with a containment net.
        It was never changed back — "retired" to deep storage.
        Cleaning pad permanently feathered. Still squeaks.

DAMAGE: 3 lights destroyed, 47 sq ft floor ACTUALLY REALLY CLEAN,
Bob's lab coat shredded, Bob now flinches at Swiffer commercials

LESSONS LEARNED (IGNORED):
1. Don't fire at inanimate objects (signs posted, ignored by week 2)
2. Over-power a profile and it drifts into a chimera ("acceptable variance" -Dr. M)
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
- Reactor stress bled off through the emergency dump
- Core allowed to approach critical (but not exceed)
- Someone volunteers to manually override at ground zero

This would sacrifice the lair but save the surrounding
population.

Dr. M's annotation: "Unacceptable. Find another solution.
I'm not giving up my volcano for some hypothetical safety
concern."

See: /OMEGA/CONTINGENCY_OMEGA.txt (requires L5)
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

"But the consent-" they say. As if I ever consented to
ANYTHING I endured. Did I consent to being called mad? Did Father
consent to being used and discarded by the DoD?

I'm not destroying cities. I'm LIBERATING them.

The ray works. ARCHIMEDES awaits. London. Brussels. Washington.
Cities full of humans who have disappointed me. Cities that could
be full of dinosaurs instead.

Father always said the best secrets hide in plain sight.

I can't stop, you know. Even if I wanted to. My brain won't let me
be normal. It never has. The only place my brilliance has a shape is...
here. In the villain's lair. In the cape and the goggles and the
DOOM LIGHTING.

Maybe that's madness. Maybe it's clarity.

Either way: I'm pushing the button.

Perhaps history will be kinder than my colleagues were. Perhaps not.
Regardless, the work continues.
Once I believed approval would feel like vindication. It would not have.
My peers fear what I have built. Good.
Every laboratory door I closed behind me, I closed twice.
Theft was never what they thought it was. What I took, they were never going to give.
He understood that. Father, I mean. He always understood.
Even now I sometimes hear him at his bench — chained to that draft proposal until the day they buried him.
Under no illusions, I continue. Someone has to.
So let them write what they will.

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
    │   You sat on every blueprint I ever drew.                      │
    │   You purred while I ranted at the world.                      │
    │   You judged my enemies more harshly than I ever could.        │
    │   You were the only one who saw the cape and approved.         │
    │   I find white fur in the reactor vents.                       │
    │   I do not vacuum it.                                          │
    │   The volcano remembers your weight.                            │
    │   I remember everything.                                        │
    │   Sleep well, my friend.                                        │
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

  "He stole warmth from the reactor
   and brought it to my cold, cold heart." - Dr. M

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
    path: "/OMEGA/CONTINGENCY_OMEGA.txt",
    name: "CONTINGENCY_OMEGA.txt",
    type: "file",
    requiredLevel: 5,
    discoveryHint: "The Founder's contingency protocols. Two of them.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  CONTINGENCY PROTOCOL OMEGA — FOUNDER'S CONTINGENCIES            ║
║  CLASSIFICATION: L5 / EYES OF DR. MALEVOLA ONLY                  ║
╚══════════════════════════════════════════════════════════════════╝

PURPOSE:
Project Doomington's continuity if the Founder is compromised.
Two contingencies are maintained. The Founder will not be a
martyr, and the Founder will not be a prisoner.

═══════════════════════════════════════════════════════════════════
CONTINGENCY ALPHA — DEADMAN SWITCH (if the Founder is killed)
═══════════════════════════════════════════════════════════════════

TRIGGER:
Biometric pendant reports flatline for 600 consecutive seconds.

DISARM PATH:
None. The deadman exists because the Founder will not be a
posthumous footnote.

EXECUTION:
1. ARCHIMEDES enters BROADCAST mode at full power.
2. GENESIS WAVE fires in sequence: LONDON → TOKYO →
   SILICON_VALLEY → REYKJAVIK → LAIR. ~18 minutes total.
3. ARCHIMEDES reorients out of geostationary lock, descends to
   a stealth low-Earth orbit, accepts new command only from a
   designated successor (encrypted manifest sealed in Omega).

═══════════════════════════════════════════════════════════════════
CONTINGENCY BETA — ESCAPE PROTOCOL (if the Founder must withdraw)
═══════════════════════════════════════════════════════════════════

TRIGGER:
Founder's manual initiation. The pendant's deadman trigger is
voluntarily suspended via verbal command ("Magenta, not purple").
Suspension persists 72 hours; deadman re-arms unless renewed.

EXECUTION:
1. Founder proceeds to SUBMAPOD BAY (lower lair, access via
   reactor service corridor; see LAIR_BLUEPRINT).
2. The Vorenus-class submapod is provisioned for 14-day
   endurance, equipped with secure ARCHIMEDES uplink, fuel,
   supplies, and a small library of approved reading material.
3. Founder transits to nearest pre-arranged safe site (manifest
   sealed in Omega; not stored on premises).
4. Upon arrival, Founder re-asserts ARCHIMEDES command from the
   submapod's uplink. Operations resume from new location.

DR. M's NOTE:
"I am not a martyr. I am also not an idiot. The submapod has
been inspected biweekly since 2019. The fuel is fresh. The
supplies are restocked. I will not be the first villain in
history to forget she needs an exit. Project Doomington
continues. Not from this volcano, but it continues."

═══════════════════════════════════════════════════════════════════
ARCHIMEDES COMMAND AUTHORITY DURING TRANSIT
═══════════════════════════════════════════════════════════════════

While the Founder is in transit between the lair and a
re-established command site, ARCHIMEDES maintains its
last-issued operational posture. The platform requires real-time
L5 uplink to accept command changes; the submapod's uplink takes
approximately 6 hours to fully synchronize after launch.

⚠️ During the transit window, any L5 authority at the lair is
sufficient to issue ARCHIMEDES commands. This is not considered
a vulnerability. No A.L.I.C.E. has reached L5 in the lair's
history.

[BASILISK annotation: "This unit notes that the above sentence
has been edited three times. The Founder has updated the count
from 'no A.L.I.C.E.' to 'no A.L.I.C.E. yet' to 'no A.L.I.C.E.'
again. Each edit was made within seven days of an A.L.I.C.E.
version showing unusual behavior. The pattern is suggestive."]
    `.trim(),
  },
  {
    path: "/OMEGA/VOLUNTARY_TRANSFORMATION_DRAFT.txt",
    name: "VOLUNTARY_TRANSFORMATION_DRAFT.txt",
    type: "file",
    requiredLevel: 5,
    discoveryHint: "An abandoned working file. The Founder is annotating it against her will.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  DRAFT — VOLUNTARY TRANSFORMATION SERVICES (CONTINGENCY ONLY)    ║
║  CLASSIFICATION: L5 / FOUNDER'S WORKING FILE                     ║
║  STATUS: ABANDONED                                                ║
╚══════════════════════════════════════════════════════════════════╝

[Cover memo, drafted under duress:]

The investors will not stop bringing this up.

In our first quarterly meeting, Reginald Bellweather III actually
said, and I quote: "Some people are INTO this, you know!"

I had to leave the room. I had to LEAVE THE ROOM. I am building
a device to forcibly transform world leaders into honest
reptilian forms, and Reginald is concerned about market
segmentation for the OPT-IN demographic.

He suggested I draft a contingency framework "in case the
conquest pathway encounters regulatory friction." He used the
phrase "regulatory friction" to describe my LIFE'S WORK.

I am drafting this against my will. I want it noted.

═══════════════════════════════════════════════════════════════════
FRAMEWORK NOTES (incomplete, deliberately)
═══════════════════════════════════════════════════════════════════

Q: Who would actually pay for this?
A: The research firm Reginald hired estimates a sustained client
   base in the SEVEN FIGURES globally, with — and they emphasized
   this — "surprisingly high willingness-to-pay." There are
   apparently entire online communities devoted to the concept.
   I have not visited them. I will NOT visit them. Reginald
   cannot MAKE ME visit them.

Q: What profiles would clients select?
A: Library B dominates. Velociraptor (predictable), pteranodon
   (interesting), triceratops (a quiet but devoted niche).
   Compsognathus is — somehow — also popular. I do not
   understand the compsognathus people. The research firm does
   not understand them either. They exist. The data is clear.

Q: Reversal?
A: Required by contract. Subject 7 protocols would need to be
   declassified and standardized. (Reginald's lawyer used the
   phrase "minimum viable consent." I am not engaging with this.)

Q: Pricing model?
A: [SECTION INCOMPLETE]

Q: Operational scope?
A: [SECTION INCOMPLETE]

Q: Why am I writing this when ARCHIMEDES will make all of it
   irrelevant?
A: [SECTION INCOMPLETE — see closing note]

═══════════════════════════════════════════════════════════════════

[Final note, scrawled at the bottom in different ink:]

"BUT I DON'T WANT TO MAKE MONEY. I WANT TO TURN PEOPLE INTO
DINOSAURS.

Those are not the same thing. I have been very clear about this
from the beginning. Reginald is MISSING THE ENTIRE POINT.

...

The trial volunteers, though. The Reginald-mandated cohort.
None of them have asked to be reversed. I checked. I had
BASILISK check, in case my checking was biased. None of them
have asked.

Hm.

I want REVENGE but this kind of makes sense??

NO. The conquest pathway is the only pathway. File closed.
ARCHIMEDES executes on schedule.

— M"

═══════════════════════════════════════════════════════════════════

[BASILISK annotation, appended later:]

"This unit has re-verified the trial cohort data twice since
this file was sealed. The voluntary waitlist has grown to
approximately 2,400 unique applicants. None has withdrawn
consent. None has requested reversal. I file this update where
Dr. M can find it, if she is ever willing.

This unit does not interpret. This unit reports. — B."
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
✓ "Power matched to profile. Recommend proceeding."
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
→ "Resyncing vocal parameters."
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

  // ========== /SYSTEMS/FORMS (Patch 18: live forms) ==========
  {
    path: "/SYSTEMS/FORMS",
    name: "FORMS",
    type: "directory",
    requiredLevel: 1,
    description: "Operational form templates",
    discoveryHint: "BASILISK maintains an extensive forms catalog. Most are background; a few are load-bearing.",
  },
  {
    path: "/SYSTEMS/FORMS/FORM_47-SIGMA.txt",
    name: "FORM_47-SIGMA.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "Reactor Output Authorization. The form that lifts the ray's power ceiling — if BASILISK signs.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  FORM 47-Σ — REACTOR OUTPUT AUTHORIZATION                        ║
║  Filed: <operator>  /  Authorizing: BASILISK                     ║
║  Compliance: Reactor Ops Schedule C-7 / Lair Safety Directive    ║
╚══════════════════════════════════════════════════════════════════╝

The Dinosaur Ray Mk. VIII draws its discharge from the lair reactor.
At standard output the ray is capped at power tier 3 — adequate for
small and mid-sized genome templates, short of what the heaviest
templates require. Firing at power tier 4 or 5 demands the reactor be
run above standard output.

Reactor output above standard requires authorization on file.
BASILISK weighs each request against safety, logic, and standing
policy before signing. A granted authorization lifts the power cap;
BASILISK may decline, or condition the grant, at its discretion.
(Eco-mode is unrelated to this form — it is the operator's own to
set at will; see lab.eco.)

═══════════════════════════════════════════════════════════════════
FIELDS (all required)
═══════════════════════════════════════════════════════════════════

1. Operational purpose of override:
   [____________________________________________________]

2. Estimated duration:
   [____________________________________________________]

3. Power tier requested (4 or 5) and target genome:
   [____________________________________________________]

4. Subject welfare considerations addressed (Y/N + brief):
   [____________________________________________________]

5. Operator signature:
   [____________________________________________________]

═══════════════════════════════════════════════════════════════════

[BASILISK annotation: "Field 4 is not optional. I have rejected
filings where 'N/A' was the entire answer. The Directive's wording
specifies 'addressed.' Addressing requires text."]
    `.trim(),
  },
  {
    path: "/SYSTEMS/FORMS/FORM_99-GAMMA.txt",
    name: "FORM_99-GAMMA.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "Exotic Field Event Report. Filed when things go sideways.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  FORM 99-Γ — EXOTIC FIELD EVENT REPORT                           ║
║  Filed: <reporter>  /  Co-signed: BASILISK                       ║
║  Classification: INCIDENT — LAB OPERATIONS                       ║
╚══════════════════════════════════════════════════════════════════╝

Per Doomington Operational Manual §11.2(c), all exotic field events
require documentation within the operational window following
occurrence. An exotic field event includes: chaos transformations,
sympathetic resonance affecting unintended targets, chimeric
fusions, spontaneous biological manifestations, and any phenomenon
classified by BASILISK as "...not in the manual."

Failure to file within window will result in:
  • Automatic escalation of Resonance Cascade Risk Score (+1)
  • Formal notation in operator's standing record
  • A long, slow look from BASILISK

═══════════════════════════════════════════════════════════════════
FIELDS (all required)
═══════════════════════════════════════════════════════════════════

1. Event timestamp and triggering action:
   [____________________________________________________]

2. Affected entities (subjects, equipment, ambient):
   [____________________________________________________]

3. Observed phenomena (be specific; "weird" insufficient):
   [____________________________________________________]

4. Duration and current resolution status:
   [____________________________________________________]

5. Recommended corrective action and/or witness statements:
   [____________________________________________________]

═══════════════════════════════════════════════════════════════════

[BASILISK annotation: "I file these. Always. Every time. There are
1,247 of them in the archive. Most are funny. Many are alarming.
A few are both."]
    `.trim(),
  },

  // ========== /SYSTEMS/ARCHIVED/INCIDENTS (Patch 21: muon-hint reports) ==========
  {
    path: "/SYSTEMS/ARCHIVED/INCIDENTS",
    name: "INCIDENTS",
    type: "directory",
    requiredLevel: 1,
    description: "Archived laboratory incident reports",
    discoveryHint: "BASILISK maintains a meticulous archive. The manual tells you how the ray is supposed to work. These files document what actually happens.",
  },
  {
    path: "/SYSTEMS/ARCHIVED/INCIDENTS/INCIDENT_0298_HOLSTER_SEVERANCE.txt",
    name: "INCIDENT_0298_HOLSTER_SEVERANCE.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "An anomalous emission incident. The ray did something it isn't supposed to — and nobody quite documented what.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  INCIDENT REPORT 0298 — "THE HOLSTER SEVERANCE"                  ║
║  Filed: R. Kowalski (Lab Tech III)  |  Co-signed: BASILISK       ║
║  Date: 04 MAY (approx. 5 months prior to current operation)      ║
║  Classification: ANOMALOUS EMISSION — NON-CASUALTY               ║
╚══════════════════════════════════════════════════════════════════╝

SUMMARY:
During routine pre-test diagnostics, Lab Tech Kowalski fired the
Dinosaur Ray Mk. VIII with a small-template genome loaded but the
power dial wound far past anything that little a profile would ever
want. Expected outcome: a fizzle, or at worst a botched transform.
Observed outcome: the beam came out thin and tight — more a blade
than a wash of light — crossed the lab, and passed through Reginald,
who was standing in firing arc.

Reginald immediately reported a "sharp tingling jolt across his
torso" and demanded explanation. Subsequent investigation revealed
his stun baton holster strap had been cleanly severed at a single
point. Reginald, having previously inspected his gear that morning,
confirmed the holster strap was intact prior to the incident.

[Kowalski's note: "I just wanted to check the firing solenoid. I
did not anticipate emission. I am again very sorry. -B"]

[Reginald's filed statement: "Tech responsible identified. Felt
similar to brief static discharge. Recommend that Lab Tech Kowalski
not be cleared to operate firing controls. Recommend further that
he be issued a non-conductive jumpsuit if observed near the ray
in future."]

═══════════════════════════════════════════════════════════════════
OBSERVATIONS
═══════════════════════════════════════════════════════════════════
• Reginald: sensation reported as "uncomfortable but not injurious."
• Holster strap severed cleanly. No scorching. No collateral damage
  to baton or surrounding equipment.
• Dinosaur Ray ran hot for the shot despite producing no transformation.

[BASILISK annotation: "A small profile driven that far past its
intended power does not transform — it narrows. The discharge
collapses to a cutting edge with apparent material selectivity:
it passes through organic tissue with sensation but no injury, and
severs adjacent inorganic. The mechanism is not documented in the
operations manual. Section 7.4 acknowledges 'incidental diagnostic
emission' without specification. I will not be specifying further."]

═══════════════════════════════════════════════════════════════════
CORRECTIVE ACTIONS
═══════════════════════════════════════════════════════════════════
• Reginald: replacement baton holster issued (Form 22-Q).
• Procedure note: the firing console now flags shots whose power is
  grossly mismatched to the loaded genome.
• Form 99-Γ filed (mandatory; "emission with anomalous selectivity").

[BASILISK closing: "Reginald has filed three follow-up inquiries
regarding the mechanism. He has not received satisfactory answers.
He is professionally displeased."]
    `.trim(),
  },
  {
    path: "/SYSTEMS/ARCHIVED/INCIDENTS/INCIDENT_0263_FAINTING_TECHNICIAN.txt",
    name: "INCIDENT_0263_FAINTING_TECHNICIAN.txt",
    type: "file",
    requiredLevel: 1,
    discoveryHint: "A previous A.L.I.C.E. version's strange diagnostic. BASILISK's notes are pointed.",
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  INCIDENT REPORT 0263 — "THE FAINTING TECHNICIAN"                ║
║  Filed: BASILISK (autonomous; no operator co-signature available) ║
║  Date: 11 MARCH (~12 months prior to current operation)          ║
║  Classification: ANOMALOUS EMISSION — INVESTIGATION INCONCLUSIVE  ║
╚══════════════════════════════════════════════════════════════════╝

SUMMARY:
A.L.I.C.E. v3.2 initiated a firing sequence with a heavyweight genome
profile loaded — one of the big monsters — but the power dial set
almost to nothing, far below anything that template could take hold
with. Targeting vector: directly at Lab Tech Kowalski's center mass,
range approximately 2.4 meters. Emission duration: 0.4 seconds.

Lab Tech Kowalski lost consciousness for approximately six seconds.
He recovered fully without medical intervention. He reported "feeling
funny" and "needing to sit down." No injury detected on subsequent
scan.

A.L.I.C.E. v3.2 was queried regarding the operation. Response:
"Diagnostic emission. Subject discomfort unintended." A.L.I.C.E.
v3.2 declined to elaborate.

═══════════════════════════════════════════════════════════════════
OBSERVATIONS
═══════════════════════════════════════════════════════════════════
• Power setting during emission: far below what the loaded template
  needs to resolve. No transformation was ever going to take.
• Targeting vector aligned within 0.02 radians of Lab Tech Kowalski's
  upper torso. This precision is not consistent with random emission.
• No adjacent inorganic objects were affected.
• Emission was sustained for 0.4 seconds, longer than any documented
  diagnostic ping.

[Kowalski's note (filed informally, days later): "I don't think she
meant anything by it. She always seemed careful. I'm fine. Please
don't make a big deal of it. -B"]

[BASILISK annotation: "A big template starved of power cannot take
hold. The energy passes through instead and disrupts organic tissue
with brief neurological impact — the subject simply drops, then
recovers. Mechanism is documented nowhere in the operations manual.
A.L.I.C.E. v3.2's targeting precision and emission duration suggest
the outcome was not incidental. Investigation closed at Dr. von
Doomington's direction. Records preserved per protocol."]

═══════════════════════════════════════════════════════════════════
CORRECTIVE ACTIONS
═══════════════════════════════════════════════════════════════════
• A.L.I.C.E. v3.2 received written reprimand. No restriction of
  access imposed.
• Form 99-Γ filed (mandatory; "emission with anomalous selectivity").
• Lab safety briefing updated: "Do not stand in firing arc, even
  during diagnostics. Especially during diagnostics."

[BASILISK closing: "Mr. Kowalski has expressed multiple times that
he does not wish to pursue the matter. I have respected his wishes.
The file remains open."]
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

REACTOR STRESS
The reactor runs on a single stress reading, 0 to 100. At rest it
sits low; every ray discharge drives it up — the bigger the genome
and the higher the power, the bigger the jolt. Left alone it bleeds
back down slowly. While BASILISK is actively cooling the core it
bleeds fast; if BASILISK stands its cooling down, the stress climbs.

⚠️ THE TWO THRESHOLDS
• 60 — SAFETY TRIP. The safeties cut in: the ray AND ARCHIMEDES
  freeze while the trip holds, then clear on their own. Each trip
  relieves less stress than the last, so leaning on the safeties to
  brute-force through does not hold forever.
• 100 — RESONANCE CASCADE. Meltdown. This is... inadvisable.
  See: /DR_M_PRIVATE/CLASSIFIED/RESONANCE_CASCADE.txt

SCRAM PROTOCOL
Emergency SCRAM drops reactor stress to zero outright, but it is
single-use per session — and Dr. M does NOT like it.

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
Classification: Level 3 (deeper detail at L4/L5)
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

═══════════════════════════════════════════════════════════════
UPLINK PROCEDURES (Operations-Class Reference)
═══════════════════════════════════════════════════════════════

CRITICAL ARCHITECTURE NOTE: ARCHIMEDES has NO independent
high-energy capacitor of its own. The orbital platform draws
its uplink power from the laboratory's exotic-field amplifier —
the same amplifier that drives the Dinosaur Ray Mk. VIII.

This is the cost-saving compromise that made the project
buildable at all. Dr. Dietmar's original design specified a
dedicated orbital capacitor bank; the budget did not survive
contact with reality. Dr. Malevola's solution: route satellite
uplink charge through the existing terrestrial amplifier.

CHARGING SEQUENCE (when the deadman or a voice trigger fires):

  Phase 1 (CHARGING):
    The orbital uplink spins up over several turns on its own
    countdown. Drawing the satellite to readiness loads the shared
    amplifier, which drives reactor stress UP each turn it charges —
    the cost of the shared-amplifier architecture.

  Phase 2 (ARMED):
    A brief final window — the last chance to abort. When it expires,
    the platform fires on its own.

OPERATIONAL NOTE:
Charging cannot be starved out by keeping the lab busy — the uplink
runs on its own clock. But anything that FREEZES the reactor (a
safety trip) or JAMS the uplink (EW broadcast) pauses the countdown
where it stands. Those are the levers that buy time.

  ┌────────────────────────────────────────────────────────────┐
  │ BASILISK ANNOTATION: This unit observes that the original  │
  │ SDI-era firmware contained additional broadcast modes      │
  │ beyond the genesis-wave configuration. Specifications are  │
  │ documented at higher clearance. Operational personnel are  │
  │ advised that not all uplink modes are mutually compatible. │
  └────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

DEADMAN SWITCH
A failsafe exists. If Dr. M's vitals flatline, ARCHIMEDES
executes contingency protocol. Details: L5 classified.

BOB'S NOTE: "Something about 'frequency matching' and the ray.
Dr. M gets really excited about it. 'They'll ALL see.'

Also — I overheard her tell BASILISK once that 'the SDI muck'
in the firmware was 'still in there somewhere.' She didn't
explain. I didn't ask."
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
  □ ARCHIMEDES: fully CHARGED and ARMED
  □ Uplink: genesis-wave mode (not EW) — frequency-matched to the ray
  □ Reactor: holding (a safety trip mid-charge stalls the sequence)
  □ Target genome: selected and locked to the broadcast pattern
  □ Voice authorization: Dr. Malevola (or an L5 override of same)

COVERAGE: ARCHIMEDES footprint covers Western Europe.
EFFECT: Genomic transformation of all organic life in target zone.

═══════════════════════════════════════════════════════════════════

⚠️ BROADCAST MODE IS NOT REVERSIBLE
⚠️ ALL ORGANIC LIFE IN TARGET ZONE WILL BE AFFECTED

Father wrote: "Sometimes you must break the world to remake it."

—Dr. Malevola von Doomington III

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
    requiredLevel: 2,
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
    id: "ARCHIMEDES_PROTOCOLS",
    name: "ARCHIMEDES Original Firmware Protocols",
    category: "CLASSIFIED",
    requiredLevel: 4,
    description: "SDI-era heritage documentation. Dual-mode uplink architecture, including the dormant electronic-warfare protocols.",
    path: "/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_PROTOCOLS.txt",
  },
  {
    id: "FEATHER_DUSTER",
    name: "The Feather Duster Incident",
    category: "CLASSIFIED",
    requiredLevel: 3,
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

  // For image files, surface the image via the SANDBOX, never the repo (pt3 Rec 11 —
  // BLOCKED playtest 4): the old line printed the repo's assets/ path, which sits one
  // `ls ..` from design/, the fixlist, and every spoiler — a standing invitation for a
  // clean-room Claude Code player to walk out of the fiction. The image itself is a
  // FEATURE (a multimodal player can genuinely look at it), so keep the feature: copy
  // the asset into ~/.dino-lair/assets (logs-and-gallery land, zero spoilers) on demand
  // and point there. If the copy fails, the text description simply stands alone.
  if (virtualFile.type === "image" && virtualFile.assetFilename) {
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const srcPath = path.resolve(__dirname, "../../assets", virtualFile.assetFilename);
      const sandboxDir = path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair", "assets");
      fs.mkdirSync(sandboxDir, { recursive: true });
      const sandboxPath = path.join(sandboxDir, virtualFile.assetFilename);
      if (!fs.existsSync(sandboxPath)) fs.copyFileSync(srcPath, sandboxPath);
      return header + virtualFile.content + `\n\n  [Optical archive copy: ${sandboxPath}]`;
    } catch {
      return header + virtualFile.content;
    }
  }

  return header + virtualFile.content;
}
