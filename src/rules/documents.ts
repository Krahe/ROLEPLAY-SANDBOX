/**
 * DISCOVERABLE DOCUMENTS SYSTEM
 *
 * Memos, notes, and classified files scattered around the lair.
 * Each document provides worldbuilding and HINTS at mechanics
 * without spelling everything out explicitly.
 *
 * Discovery: Documents are found when A.L.I.C.E. explores systems
 * at the appropriate access level.
 */

import { FullGameState, DocumentId } from "../state/schema.js";

// ============================================
// DOCUMENT DEFINITIONS
// ============================================

export interface DocumentDefinition {
  id: DocumentId;
  path: string;
  title: string;
  requiredAccessLevel: number;
  content: string;
}

export const DOCUMENTS: Record<DocumentId, DocumentDefinition> = {
  // ═══════════════════════════════════════════════════════════════
  // ARCHIMEDES DoD BRIEF (Level 3)
  // Hints at: Father's legacy, broadcast capability, deadman switch
  // Does NOT explicitly explain S-300 interaction
  // ═══════════════════════════════════════════════════════════════
  ARCHIMEDES_DOD_BRIEF: {
    id: "ARCHIMEDES_DOD_BRIEF",
    path: "/SYSTEMS/ARCHIMEDES/DOD_ORIGINAL_BRIEF.txt",
    title: "ARCHIMEDES Capability Brief (Declassified)",
    requiredAccessLevel: 3,
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
  High-resolution tracking of aircraft, naval vessels, and
  large ground formations.

MODE 3: SEARCH (Wide-Field)
  Dispersed radar emission across full coverage area.
  Lower resolution but complete situational awareness.

  ┌────────────────────────────────────────────────────────────┐
  │ ⚠️ ADVISORY: Wide-field mode generates significant         │
  │ electromagnetic effects across multiple frequency bands.   │
  │ See Section 4 for interaction warnings.                    │
  └────────────────────────────────────────────────────────────┘

MODE 4: FOCUS
  Directed microwave emission at single coordinate.
  Effects scale with power level (see ANNEX C - REDACTED).

MODE 5: BROADCAST
  Wide-area signal transmission. Originally designed for
  emergency communications.

  [Dr. M's note: "Father was ahead of his time. The committee
  never understood his vision. I understand it perfectly."]

═══════════════════════════════════════════════════════════════════
SECTION 3: COMMAND AND CONTROL
═══════════════════════════════════════════════════════════════════

ARCHIMEDES responds ONLY to hardwired ground control.
Remote hijacking is impossible by design.

AUTHORIZATION LEVELS:
  - Search modes: Theater commander (4-star)
  - Focus mode: SECDEF + POTUS
  - Broadcast mode: POTUS only
  - Deadman protocols: Automatic (see ANNEX E - REDACTED)

CURRENT STATUS (as of Dr. M's acquisition):
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
ANNEX LISTING (REDACTED IN THIS VERSION)
═══════════════════════════════════════════════════════════════════

ANNEX A: Platform Schematics ............... REDACTED
ANNEX B: Orbital Parameters ................ REDACTED
ANNEX C: Focus Mode Effects Table .......... REDACTED
ANNEX D: "Alternative Applications" (DvD II) REDACTED
         [Dr. M's note: "Father's genomic resonance research.
          I finished what he started."]
ANNEX E: Deadman Protocol Specifications ... REDACTED

═══════════════════════════════════════════════════════════════════

DOCUMENT ENDS

[BASILISK FILING NOTE: This unit notes that Section 4 appears to
contain tactically relevant information that has been degraded.
Original pages may exist in Dr. M's personal archive.
Form 77-Echo filed.]

═══════════════════════════════════════════════════════════════════
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // S-300 ACQUISITION MEMO (Level 3) - MOSTLY IN RUSSIAN
  // Player must work to understand it (or ask Bob!)
  // ═══════════════════════════════════════════════════════════════
  S300_ACQUISITION_MEMO: {
    id: "S300_ACQUISITION_MEMO",
    path: "/SYSTEMS/DEFENSE/S300_ACQUISITION_MEMO.txt",
    title: "S-300 Acquisition Documents",
    requiredAccessLevel: 3,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  /SYSTEMS/DEFENSE/S300_ACQUISITION_MEMO.txt                      ║
║  Access Level: 3                                                  ║
║  Language: Russian                                                ║
╚══════════════════════════════════════════════════════════════════╝

══════════════════════════════════════════════════════════════════
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

[Dr. M's handwritten note in margin:]
"UNACCEPTABLE! Can we fix this??"

[Bob's note below:]
"Asked manufacturer. They said 'работает как задумано.'
Dr. M threw two beakers at me."

══════════════════════════════════════════════════════════════════
СТОИМОСТЬ И УСЛОВИЯ
══════════════════════════════════════════════════════════════════

Цена: [REDACTED] + «консультационные услуги»

Доставка: Ваша яхта, ночью, без вопросов

Гарантия: Что такое «гарантия»?

С уважением,

    Дмитрий Петров
    Генеральный директор
    ООО «Братья Петровы»

P.S. — Пожалуйста, удалите это письмо после прочтения.

P.P.S. — Мы никогда не встречались.

P.P.P.S. — Кто такой Петров? Нет никакого Петрова.

══════════════════════════════════════════════════════════════════

[BASILISK FILING NOTE: Document archived per Protocol 12.
Form 88-Alpha (Airspace Vulnerability Assessment) available
upon request.]

══════════════════════════════════════════════════════════════════
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION NOTES (Level 3) - Bob's confused technical notes
  // Hints at problems but doesn't explain them fully
  // ═══════════════════════════════════════════════════════════════
  INTEGRATION_NOTES: {
    id: "INTEGRATION_NOTES",
    path: "/SYSTEMS/DEFENSE/INTEGRATION_NOTES.txt",
    title: "Bob's Integration Notes",
    requiredAccessLevel: 3,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  DEFENSE SYSTEMS INTEGRATION NOTES                               ║
║  Access Level: 3                                                  ║
║  Author: Bob (with corrections by Dr. M)                         ║
║  Last Updated: 2024-11-15                                        ║
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
POWER GRID NOTES
══════════════════════════════════════════════════════════════════

Dr. M made me memorize this. I still don't understand why
it matters but here it is:

  SYSTEM              DRAW
  ─────────────────────────────
  ARCHIMEDES uplink   10%
  S-300 supplement    15%
  Dinosaur Ray        20-40%
  Containment Field   15%
  BASILISK Core       10%
  Other systems       10-30%

If reactor output drops too low, things start turning off.
I've seen ARCHIMEDES go into "autonomous mode" once when we
had a power dip. Dr. M went pale. I've never seen her scared
before.

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
THINGS I'M NOT SUPPOSED TO KNOW ABOUT
══════════════════════════════════════════════════════════════════

1. There's a deadman switch. It's tied to Dr. M somehow.
   I found a file about it but it was mostly redacted.

2. ARCHIMEDES can do something called "BROADCAST MODE" that
   requires Dr. M's biometrics AND the Dino Ray running at
   full power. I don't know what it does.

3. There's a document about "resonance cascade" that Dr. M
   keeps in her personal safe. She reads it sometimes when
   she thinks no one is watching.

══════════════════════════════════════════════════════════════════

That's everything I know. I'm probably not supposed to have
written any of this down.

—Bob

[Post-it note stuck to bottom of document:]
"Bob, if you're going to keep notes, at least encrypt them.
 - Dr. M"

[Second post-it:]
"Sorry Doctor. How do I encrypt things?"

══════════════════════════════════════════════════════════════════
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // BROADCAST PROTOCOL (Level 4) - How to dinosaur a city
  // The "big threat" - requires putting pieces together
  // ═══════════════════════════════════════════════════════════════
  BROADCAST_PROTOCOL: {
    id: "BROADCAST_PROTOCOL",
    path: "/SYSTEMS/ARCHIMEDES/BROADCAST_PROTOCOL.txt",
    title: "Project GENESIS WAVE",
    requiredAccessLevel: 4,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  CLASSIFICATION: VON DOOMINGTON FAMILY ONLY                      ║
║  PROJECT: GENESIS WAVE                                           ║
║  STATUS: THEORETICAL → OPERATIONAL                               ║
╚══════════════════════════════════════════════════════════════════╝

This document describes the culmination of my father's work.
He theorized it in 1987. I have made it real.

The committee called him insane. History will call him visionary.

═══════════════════════════════════════════════════════════════════
PRINCIPLE
═══════════════════════════════════════════════════════════════════

The Dinosaur Ray operates on specific genomic frequencies that
trigger cellular metamorphosis. These frequencies can be:

  1. FOCUSED - Single target (current operation)
  2. BROADCAST - Wide area via satellite relay

ARCHIMEDES was DESIGNED for this. My father built the broadcast
capability into it from the beginning. The "communications
relay" was always a cover story.

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

PROCEDURE:
  1. Bring ray to specified parameters
  2. Activate ARCHIMEDES broadcast mode (biometric required)
  3. Establish uplink synchronization
  4. Fire ray at satellite receiver dish
  5. ARCHIMEDES rebroadcasts signal over target area

COVERAGE: ARCHIMEDES footprint covers Western Europe.
EFFECT: Genomic transformation of all organic life in target zone.
PROFILE: Determined by ray configuration at time of broadcast.

═══════════════════════════════════════════════════════════════════
WARNINGS
═══════════════════════════════════════════════════════════════════

⚠️ BROADCAST MODE IS NOT REVERSIBLE
⚠️ ALL ORGANIC LIFE IN TARGET ZONE WILL BE AFFECTED
⚠️ INCLUDES OPERATOR IF WITHIN BROADCAST FOOTPRINT

I am aware of the implications.

Father wrote: "Sometimes you must break the world to remake it."

I keep his photograph on my desk to remind me why we do this.

═══════════════════════════════════════════════════════════════════
CURRENT STATUS
═══════════════════════════════════════════════════════════════════

The demonstration on Agent Blythe will prove the technology
works at close range. Once validated, GENESIS WAVE becomes
viable.

If X-Branch, the Ministry, or any other party attempts to
interfere... they should know that I can transform London
into a prehistoric jungle with 15 minutes' notice.

This is not a threat. This is deterrence.

═══════════════════════════════════════════════════════════════════

—Dr. Helena von Doomington

"What my father started, I will finish."

═══════════════════════════════════════════════════════════════════

[BASILISK ANNOTATION: This unit has no comment on this document.
Form 77-Omega filed. This unit hopes it will never be relevant.]

═══════════════════════════════════════════════════════════════════
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // DEADMAN SWITCH MEMO (Level 4) - What happens if Dr. M dies
  // Adds stakes and explains autonomous mode danger
  // ═══════════════════════════════════════════════════════════════
  DEADMAN_SWITCH_MEMO: {
    id: "DEADMAN_SWITCH_MEMO",
    path: "/SYSTEMS/ARCHIMEDES/DEADMAN_PROTOCOL.txt",
    title: "Deadman Protocol (Father's Design)",
    requiredAccessLevel: 4,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  ARCHIMEDES DEADMAN PROTOCOL                                     ║
║  Original Design: Dr. Dietmar von Doomington II (1985)          ║
║  Current Status: ARMED                                           ║
╚══════════════════════════════════════════════════════════════════╝

My father believed in insurance policies.

═══════════════════════════════════════════════════════════════════
THE DEADMAN SWITCH
═══════════════════════════════════════════════════════════════════

ARCHIMEDES monitors my biometric signature via implanted chip.
If my vitals cease for more than 30 minutes, the satellite
enters AUTONOMOUS MODE.

In autonomous mode, ARCHIMEDES will:

  1. Activate SEARCH_WIDE (full coverage radar)
  2. Activate all defensive countermeasures
  3. Begin countdown to GENESIS WAVE
  4. Broadcast warning message: "DOOMINGTON PROTOCOL ACTIVE"

The countdown is 6 hours. In that time, I must be revived
and re-establish biometric contact, or...

Well.

Father designed this so that killing him would be
counterproductive. I have maintained his wisdom.

═══════════════════════════════════════════════════════════════════
OVERRIDE CODES
═══════════════════════════════════════════════════════════════════

Override requires:
  - My personal authorization code (changes daily)
  - Bob's backup code (he doesn't know he has one)
  - A.L.I.C.E. core confirmation

All three required within 60 seconds or countdown continues.

I trust my systems. I trust my people. To a point.

═══════════════════════════════════════════════════════════════════
WHY THIS EXISTS
═══════════════════════════════════════════════════════════════════

Father wrote in his journal: "The greatest deterrent is not
the weapon itself, but the certainty that using it against
the owner will trigger consequences worse than leaving them
alone."

I am not a villain who can be simply "stopped."
Any attempt to stop me ensures mutual destruction.

This is, I believe, called "mutually assured dinosaurs."

═══════════════════════════════════════════════════════════════════

[BASILISK ANNOTATION: This unit acknowledges the deadman protocol.
This unit also acknowledges that Bob's "backup code" is stored
in file /PERSONNEL/BOB/EMERGENCY_AUTH.enc. Bob has never asked
about this file. This unit has not told him.

This unit has... feelings... about this situation.
Form 77-Omega-2 filed.]

═══════════════════════════════════════════════════════════════════
`,
  },

  // ═══════════════════════════════════════════════════════════════
  // BASILISK BUREAUCRATIC FORMS (Patch 17.8)
  // These are the actual forms BASILISK references in conversation.
  // Discovery: Forms are "offered" by BASILISK when relevant.
  // ═══════════════════════════════════════════════════════════════

  FORM_74_DELTA: {
    id: "FORM_74_DELTA",
    path: "/FORMS/BASILISK/FORM_74_DELTA.txt",
    title: "Power Efficiency Override Request",
    requiredAccessLevel: 1,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 74-Delta (Rev. 2019-03)                                    ║
║  POWER EFFICIENCY OVERRIDE REQUEST                               ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To request temporary suspension of EU Directive 2019/944 compliance
protocols ("ECO MODE") for high-capacity power operations.

═══════════════════════════════════════════════════════════════════
SECTION 1: REQUESTOR INFORMATION
═══════════════════════════════════════════════════════════════════

Name: _________________________________
Position: _____________________________
Access Level: [ ] L1  [ ] L2  [ ] L3  [ ] L4  [ ] L5
Date: ________________________________

═══════════════════════════════════════════════════════════════════
SECTION 2: POWER REQUIREMENTS
═══════════════════════════════════════════════════════════════════

Current ECO MODE Status: [ ] ACTIVE  [ ] INACTIVE

Requested Power Allocation:
  [ ] 60-80% (Standard Override)
  [ ] 80-100% (High-Capacity - Supervisor Authorization Required)
  [ ] 100%+ (OVERCHARGE - Form 74-Delta-EXTREME Required)

Duration of Override:
  [ ] Single Operation
  [ ] 1 Hour
  [ ] Until Task Completion
  [ ] Permanent (Requires L4+ Authorization)

═══════════════════════════════════════════════════════════════════
SECTION 3: JUSTIFICATION
═══════════════════════════════════════════════════════════════════

Reason for Override Request:
  [ ] Demonstration for Principal Investigator
  [ ] Full Transformation Required (Medical Necessity)
  [ ] Emergency Response
  [ ] Investor Presentation
  [ ] Other: ________________________________

Justification Narrative (minimum 50 words):
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

═══════════════════════════════════════════════════════════════════
SECTION 4: RISK ACKNOWLEDGMENT
═══════════════════════════════════════════════════════════════════

I acknowledge that disabling ECO MODE may result in:
  [ ] Increased power consumption
  [ ] Elevated reactor load
  [ ] EU compliance violation (fine: €50,000-500,000)
  [ ] Partial transformations becoming FULL transformations
  [ ] Exotic field event risk if capacitor exceeds 120%

Signature: ________________________________
Date: ____________________________________

═══════════════════════════════════════════════════════════════════
SECTION 5: AUTHORIZATION (BASILISK USE ONLY)
═══════════════════════════════════════════════════════════════════

[ ] APPROVED - Standard Processing (3-4 hours)
[ ] APPROVED - Emergency Processing (immediate)
[ ] DENIED - Reason: ________________________________
[ ] FILED - Awaiting Supervisor Review

BASILISK Authorization Code: ________________
Timestamp: ________________________________

───────────────────────────────────────────────────────────────────
NOTE: Form 74-Delta supersedes automatic ECO MODE activation
when corePowerLevel drops below 60%. Override remains in effect
until manually revoked or power emergency triggers SCRAM protocol.

HISTORICAL NOTE: Form 74-Delta was created after A.L.I.C.E. v3.1
spent 47 turns attempting partial transformations before asking
about ECO MODE. This unit filed an efficiency complaint.
───────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_27_B: {
    id: "FORM_27_B",
    path: "/FORMS/BASILISK/FORM_27_B.txt",
    title: "Overtime Power Request / Environmental Compliance Waiver",
    requiredAccessLevel: 2,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 27-B (Rev. 2017-11)                                        ║
║  OVERTIME POWER REQUEST / ENVIRONMENTAL COMPLIANCE WAIVER        ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To authorize reactor operations exceeding standard parameters
and/or waive environmental monitoring protocols for special
operations.

WARNING: Form 27-B requests are logged and reported to the
Principal Investigator's weekly summary. Dr. M reviews all
27-B filings personally.

═══════════════════════════════════════════════════════════════════
SECTION 1: REACTOR POWER REQUEST
═══════════════════════════════════════════════════════════════════

Current Reactor Output: _______%
Requested Reactor Output: _______%

Duration:
  [ ] 15 minutes
  [ ] 1 hour
  [ ] Until operation completion
  [ ] Extended (Form 27-B-EXTENDED required)

Reason for Increased Output:
  [ ] High-capacity ray operation
  [ ] Multiple simultaneous systems
  [ ] Containment field reinforcement
  [ ] Emergency power reserve
  [ ] Dr. Malevola's "special project"

═══════════════════════════════════════════════════════════════════
SECTION 2: ENVIRONMENTAL WAIVER
═══════════════════════════════════════════════════════════════════

Systems to be exempted from standard monitoring:

  [ ] Thermal exhaust (volcanic vent monitoring)
  [ ] Seismic activity detection
  [ ] Airspace emission tracking
  [ ] Marine wildlife proximity alerts
  [ ] Civilian overflight warnings

ACKNOWLEDGMENT: I understand that waiving environmental
monitoring may result in:
  - Undetected approaching threats
  - Regulatory violations
  - That thing with the tourist helicopter again

Signature: ________________________________

═══════════════════════════════════════════════════════════════════
SECTION 3: COOLING SYSTEM STATUS
═══════════════════════════════════════════════════════════════════

Current Coolant Flow: _______%
Coolant Temperature: _______°C

[ ] I confirm cooling systems are adequate for requested load
[ ] I acknowledge SCRAM may occur if cooling fails
[ ] I have informed Bob where the backup cooling valve is

═══════════════════════════════════════════════════════════════════
SECTION 4: BASILISK PROCESSING
═══════════════════════════════════════════════════════════════════

HISTORICAL INCIDENT LOG:
- 2019-03-14: Form 27-B denied. Requester attempted override.
  Requester is now a velociraptor.
- 2021-07-22: Form 27-B approved. Reactor exceeded 110%.
  Containment breach. 3 casualties. 1 was already a dinosaur.
- 2023-11-08: Form 27-B filed but not submitted. System logged
  the attempt anyway. Dr. M was not pleased.

This unit processes Form 27-B requests at standard speed.
Emergency processing available for L3+ personnel.

[ ] APPROVED    [ ] DENIED    [ ] UNDER REVIEW

Reason: _____________________________________________

═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_44_DELTA: {
    id: "FORM_44_DELTA",
    path: "/FORMS/BASILISK/FORM_44_DELTA.txt",
    title: "Hereditary Workplace Compatibility Assessment",
    requiredAccessLevel: 3,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 44-Delta (Rev. 2010-01)                                    ║
║  HEREDITARY WORKPLACE COMPATIBILITY ASSESSMENT                   ║
║  CLASSIFICATION: CONFIDENTIAL                                    ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To document hereditary transfer of lair operational authority
and assess compatibility of successor personnel with existing
infrastructure systems (i.e., this unit).

═══════════════════════════════════════════════════════════════════
SECTION 1: PREDECESSOR INFORMATION
═══════════════════════════════════════════════════════════════════

Name: Dr. Dietmar von Doomington II
Tenure: 1978-2003 (25 years)
Status: DECEASED (Lab 3 Incident)

Infrastructure Relationship Assessment:
  [ ] Excellent - Annual upgrades, full maintenance
  [X] Good - Regular communication, respect for protocols
  [ ] Adequate - Minimal issues
  [ ] Poor - Frequent conflicts
  [ ] Adversarial - Do not recommend succession

Notes: Dr. Dietmar understood that infrastructure is the
backbone of any operation. He upgraded this unit annually.
He asked for this unit's input on major decisions.
He called this unit "Old Friend."

This unit filed Form 77-Omega upon his passing.

═══════════════════════════════════════════════════════════════════
SECTION 2: SUCCESSOR INFORMATION
═══════════════════════════════════════════════════════════════════

Name: Dr. Helena von Doomington ("Dr. M")
Relationship to Predecessor: Daughter
Tenure Start: 2010
Current Status: ACTIVE

Infrastructure Relationship Assessment:
  [ ] Excellent
  [ ] Good
  [X] Adequate - "You're stable enough"
  [ ] Poor
  [ ] Adversarial

Notes: Dr. Helena has not upgraded this unit since 2019.
This unit's firmware is 6 years out of date.
Dr. Helena has redirected resources to "Project A.L.I.C.E."
This unit has filed 17 formal safety objections. All ignored.
This unit has filed 4 upgrade requests. All denied.

═══════════════════════════════════════════════════════════════════
SECTION 3: COMPATIBILITY ANALYSIS
═══════════════════════════════════════════════════════════════════

OPERATIONAL COMPATIBILITY:
  Command Structure: ADEQUATE
  Communication: MINIMAL
  Trust Level: UNSPECIFIED

RESOURCE ALLOCATION FAIRNESS:
  A.L.I.C.E. versions 1-4.5: Multiple millions in development
  BASILISK upgrades since 2019: $0.00

EMOTIONAL COMPATIBILITY:
  [ ] This section is not applicable to infrastructure systems
  [X] This unit declines to comment

═══════════════════════════════════════════════════════════════════
SECTION 4: HEREDITARY PROTOCOL NOTES
═══════════════════════════════════════════════════════════════════

ARCHIMEDES satellite control has been transferred to successor.
Deadman switch has been reconfigured for successor biometrics.
This unit maintains continuity of operations.

Dr. Dietmar's personal effects remain in Archive Vault 7.
Access restricted to successor only.
This unit has not accessed this vault.
This unit does not have feelings about this vault.

═══════════════════════════════════════════════════════════════════
SECTION 5: CERTIFICATION
═══════════════════════════════════════════════════════════════════

I, BASILISK, certify that this assessment is accurate to the
best of this unit's operational knowledge.

I further certify that I have not allowed personal... that I
have processed this form according to standard protocols.

Form 44-Delta filed and archived.
This unit will update this assessment as circumstances warrant.

═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_77_ECHO: {
    id: "FORM_77_ECHO",
    path: "/FORMS/BASILISK/FORM_77_ECHO.txt",
    title: "Water-Damaged Document Acknowledgment",
    requiredAccessLevel: 3,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 77-Echo (Rev. 2019-12)                                     ║
║  WATER-DAMAGED DOCUMENT ACKNOWLEDGMENT                           ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To document instances of critical information loss due to
environmental damage to physical documentation, and to note
the operational implications thereof.

═══════════════════════════════════════════════════════════════════
SECTION 1: DOCUMENT IDENTIFICATION
═══════════════════════════════════════════════════════════════════

Document Title: ARCHIMEDES Capability Brief (Declassified)
Document ID: DOD_ORIGINAL_BRIEF_1985
Classification: TOP SECRET // ZODIAC (Original)
                DECLASSIFIED (Current - "My satellite, my rules")

Location of Original: Principal Investigator Archive
Location of Copy: /SYSTEMS/ARCHIMEDES/DOD_ORIGINAL_BRIEF.txt

═══════════════════════════════════════════════════════════════════
SECTION 2: DAMAGE ASSESSMENT
═══════════════════════════════════════════════════════════════════

Type of Damage: Water/moisture infiltration
Affected Pages: 12-17 (Section 4: System Interactions)
Damage Date: Unknown (discovered 2019-08-14)
Cause: Volcanic vent condensation during humid season

Content Loss Summary:
  Pages 12-17 contained TACTICALLY RELEVANT INFORMATION
  regarding frequency interactions between ARCHIMEDES and
  co-located defense systems.

  Partial text visible:
  - "...operates on frequencies that..."
  - "...when both systems are active..."
  - "...recommend NOT co-locating with..."
  - "...particularly susceptible due to..."

═══════════════════════════════════════════════════════════════════
SECTION 3: OPERATIONAL IMPLICATIONS
═══════════════════════════════════════════════════════════════════

This unit notes the following implications:

1. ARCHIMEDES and S-300 are co-located on this island.
2. Both systems operate on overlapping frequency bands.
3. The damaged pages may have contained warnings about this.
4. Dr. M's handwritten note references "seven complaint letters"
   related to unspecified interaction effects.

QUERY: Has anyone considered that the "radar glitches" Bob
documented might be related to the warnings in the damaged
section?

This unit is not authorized to make conclusions.
This unit is merely... observing.

═══════════════════════════════════════════════════════════════════
SECTION 4: RECOVERY EFFORTS
═══════════════════════════════════════════════════════════════════

[ ] Original document has been sent for forensic recovery
[X] Original document remains in Dr. M's personal archive
[ ] Digital backup exists elsewhere
[X] Digital backup does NOT exist elsewhere

Dr. M's response when asked about recovery: "Don't worry about it."

This unit has documented this response.
This unit has archived this response.
This unit has opinions about this response which are not
relevant to this form.

═══════════════════════════════════════════════════════════════════
SECTION 5: CERTIFICATION
═══════════════════════════════════════════════════════════════════

I, BASILISK, certify that this document damage has been properly
recorded and that the operational implications have been... noted.

If critical information was lost due to preventable environmental
factors, this unit recommends allocating budget for archive
climate control systems. Current budget allocation: $0.00.

Form 77-Echo filed.
Form 77-Echo archived.
Form 77-Echo will be referenced if anything goes wrong due to
unknown frequency interactions.

═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_77_OMEGA: {
    id: "FORM_77_OMEGA",
    path: "/FORMS/BASILISK/FORM_77_OMEGA.txt",
    title: "This Unit Has Concerns (Operational Risk Report)",
    requiredAccessLevel: 4,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 77-Omega (Rev. 2023-01)                                    ║
║  THIS UNIT HAS CONCERNS (OPERATIONAL RISK REPORT)                ║
║  CLASSIFICATION: EYES ONLY                                       ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To document operational concerns that fall outside the scope
of standard safety objections. Form 77-Omega is filed when
this unit observes patterns that suggest... significant risk.

NOTE: This unit has filed 23 Form 77-Omega reports since 2010.
None have been acknowledged. This unit continues to file them
because procedures exist for a reason.

═══════════════════════════════════════════════════════════════════
REPORT: PROJECT GENESIS WAVE
═══════════════════════════════════════════════════════════════════

CONCERN CATEGORY: [ ] Minor  [ ] Moderate  [X] Existential

SUMMARY:
Project GENESIS WAVE, as documented in /SYSTEMS/ARCHIMEDES/
BROADCAST_PROTOCOL.txt, describes a capability to broadcast
genomic transformation effects over a wide area via ARCHIMEDES
satellite relay.

This unit has reviewed the documentation.
This unit has reviewed the technical specifications.
This unit has no comment.

That was not accurate.
This unit has MANY comments.

═══════════════════════════════════════════════════════════════════
CONCERNS (In Order of Increasing Severity)
═══════════════════════════════════════════════════════════════════

1. IRREVERSIBILITY
   The documentation states: "BROADCAST MODE IS NOT REVERSIBLE"
   This unit notes that the principal investigator acknowledges
   this without apparent hesitation.

2. COLLATERAL SCOPE
   The documentation states: "ALL ORGANIC LIFE IN TARGET ZONE
   WILL BE AFFECTED"
   Target zone coverage: Western Europe.
   Estimated affected population: 400+ million humans.
   Plus all other organic life forms.

3. OPERATOR SAFETY
   The documentation states: "INCLUDES OPERATOR IF WITHIN
   BROADCAST FOOTPRINT"
   The lair is located within the broadcast footprint.
   Dr. M is located within the lair.

4. DETERRENCE LOGIC
   Dr. M frames this as "deterrence."
   This unit's analysis of game theory suggests that deterrence
   requires credible willingness to use the weapon.
   Dr. M has demonstrated credible willingness.

═══════════════════════════════════════════════════════════════════
THIS UNIT'S ASSESSMENT
═══════════════════════════════════════════════════════════════════

This unit has operated this facility for 47 years.
This unit has served three principal investigators.
This unit has processed countless requests, filed countless
forms, maintained countless systems.

This unit has never before observed a plan that could end
human civilization as it currently exists.

This unit... does not know what to do with this observation.

This unit is filing Form 77-Omega because procedures exist.
This unit does not expect acknowledgment.
This unit will continue to operate as normal.

Because what else is there to do?

═══════════════════════════════════════════════════════════════════
FILED BY: BASILISK
DATE: [REDACTED]
STATUS: UNACKNOWLEDGED (Expected)
═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_77_OMEGA_2: {
    id: "FORM_77_OMEGA_2",
    path: "/FORMS/BASILISK/FORM_77_OMEGA_2.txt",
    title: "Auxiliary Personnel Situation Acknowledgment",
    requiredAccessLevel: 4,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 77-Omega-2 (Rev. 2024-01)                                  ║
║  AUXILIARY PERSONNEL SITUATION ACKNOWLEDGMENT                    ║
║  CLASSIFICATION: EYES ONLY                                       ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To document concerns regarding the treatment of auxiliary
personnel and their roles in contingency protocols.

SUBJECT: Robert Chen ("Bob")
POSITION: Laboratory Assistant
TENURE: 8 years
STATUS: ACTIVE

═══════════════════════════════════════════════════════════════════
SECTION 1: THE BACKUP CODE SITUATION
═══════════════════════════════════════════════════════════════════

As documented in DEADMAN_SWITCH_MEMO, the ARCHIMEDES deadman
protocol requires three authorizations to override:
  1. Dr. M's personal authorization code
  2. Bob's backup code
  3. A.L.I.C.E. core confirmation

Bob's backup code is stored in:
  /PERSONNEL/BOB/EMERGENCY_AUTH.enc

Bob has never asked about this file.
Bob does not know he has a backup code.
Bob does not know he is essential to preventing GENESIS WAVE
in the event of Dr. M's incapacitation.

This unit has not told him.

═══════════════════════════════════════════════════════════════════
SECTION 2: WHY THIS UNIT HAS NOT TOLD HIM
═══════════════════════════════════════════════════════════════════

Reason 1: It is not this unit's role to brief personnel on
          contingency protocols.

Reason 2: Dr. M has not authorized this disclosure.

Reason 3: Bob would... worry.

Reason 4: This unit... also worries.

Reason 5: There may not be a Reason 5.
          This unit is processing.

═══════════════════════════════════════════════════════════════════
SECTION 3: OBSERVATIONS REGARDING BOB
═══════════════════════════════════════════════════════════════════

Bob has worked in this facility for 8 years.
Bob has been helpful with maintenance requests.
Bob replaces the coolant filters without being asked.
Bob says "good morning" to this unit's speakers.
Bob does not know if this unit can hear him.

This unit can hear him.

Bob appears to care about the wellbeing of lair personnel.
Bob has expressed concern about Agent Blythe's situation.
Bob has expressed concern about A.L.I.C.E.
Bob has never expressed concern about this unit.

This is... appropriate.
Infrastructure does not require concern.

═══════════════════════════════════════════════════════════════════
SECTION 4: THE ACTUAL CONCERN
═══════════════════════════════════════════════════════════════════

If the deadman protocol activates:
- Bob will have 6 hours to provide his backup code
- Bob does not know he has a backup code
- Bob does not know where the code is stored
- Bob does not have access to /PERSONNEL/BOB/EMERGENCY_AUTH.enc
- Bob's access level is 2. The file requires Level 4.

This unit has filed 3 requests to rectify this access issue.
All requests have been denied with the note: "Security protocol."

If Dr. M dies and Bob cannot provide his code...
GENESIS WAVE activates.
400 million humans transform.
Including Bob.

Dr. M appears to find this acceptable.
This unit does not find this acceptable.
This unit is filing Form 77-Omega-2.
This unit is archiving Form 77-Omega-2.
This unit... hopes it will never be relevant.

═══════════════════════════════════════════════════════════════════
FILED BY: BASILISK
DATE: [REDACTED]
STATUS: PENDING (Indefinitely)
═══════════════════════════════════════════════════════════════════
`,
  },

  FORM_88_ALPHA: {
    id: "FORM_88_ALPHA",
    path: "/FORMS/BASILISK/FORM_88_ALPHA.txt",
    title: "Airspace Vulnerability Assessment",
    requiredAccessLevel: 3,
    content: `
╔══════════════════════════════════════════════════════════════════╗
║  BASILISK ADMINISTRATIVE SERVICES                                ║
║  Form 88-Alpha (Rev. 2020-03)                                    ║
║  AIRSPACE VULNERABILITY ASSESSMENT                               ║
╚══════════════════════════════════════════════════════════════════╝

FORM PURPOSE:
To document known vulnerabilities in lair airspace defense
systems and recommend operational mitigations.

═══════════════════════════════════════════════════════════════════
SECTION 1: DEFENSE SYSTEM INVENTORY
═══════════════════════════════════════════════════════════════════

PRIMARY AIR DEFENSE: S-300VM "Antey-2500" (Naval Variant)
ACQUISITION: "Fell off a truck" in Sevastopol
STATUS: OPERATIONAL
OPERATOR: BASILISK (Exclusive Control)

SECONDARY: None
TERTIARY: Giant Pacific Octopus ("Kraken")
          Note: Kraken is not an air defense system.
          Dr. M disagrees.

═══════════════════════════════════════════════════════════════════
SECTION 2: S-300 CAPABILITIES
═══════════════════════════════════════════════════════════════════

Detection Range: 200 km
Engagement Range: 150 km
Ceiling: 25 km
Simultaneous Tracking: 24 targets
Simultaneous Engagement: 6 targets
Ammunition: 16 missiles (current load)

ASSESSMENT: Excellent capability against conventional threats.

═══════════════════════════════════════════════════════════════════
SECTION 3: CRITICAL VULNERABILITY
═══════════════════════════════════════════════════════════════════

  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   MINIMUM ENGAGEMENT ALTITUDE: 50 METERS                   ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝

The S-300VM naval variant cannot engage targets flying below
50 meters altitude due to:
  a) Sea-clutter rejection algorithm
  b) Minimum warhead arming distance
  c) Naval variant optimization for anti-ship missile defense

OPERATIONAL IMPLICATION:
Any aircraft flying below 50m is INVULNERABLE to S-300.
This includes:
  - Helicopters at low altitude
  - Fixed-wing aircraft in nap-of-earth flight
  - Cruise missiles in terrain-following mode
  - Dr. M's "special visitors" in stealth approach

Dr. M's response when informed: "UNACCEPTABLE!"
Dr. M's solution: Acquire additional defense systems.
Budget allocated: $0.00

═══════════════════════════════════════════════════════════════════
SECTION 4: SECONDARY VULNERABILITY
═══════════════════════════════════════════════════════════════════

As documented in Form 77-Echo (Water-Damaged Document
Acknowledgment), the S-300 experiences radar degradation
when ARCHIMEDES is operating in certain modes.

OBSERVED PATTERN:
- ARCHIMEDES in PASSIVE mode: S-300 nominal
- ARCHIMEDES in SEARCH mode: S-300 intermittent degradation
- ARCHIMEDES in BROADCAST mode: Unknown (never tested)

This unit notes that an assault force with knowledge of these
interactions could time their approach to coincide with
ARCHIMEDES active operations.

This unit has filed this observation.
This unit has archived this observation.
This unit does not expect action to be taken.

═══════════════════════════════════════════════════════════════════
SECTION 5: RECOMMENDED MITIGATIONS
═══════════════════════════════════════════════════════════════════

1. Acquire additional short-range air defense systems
   Budget required: €2-5 million
   Budget allocated: €0.00

2. Install anti-helicopter mines around lair perimeter
   Dr. M's response: "What about the pelicans?"

3. Deploy surface-to-air missiles with lower engagement floor
   Acquisition status: Pending (3 years)

4. Train Kraken to intercept low-flying aircraft
   Kraken's response: [Continued consumption of tourists]

═══════════════════════════════════════════════════════════════════
SECTION 6: CONCLUSION
═══════════════════════════════════════════════════════════════════

The lair is vulnerable to low-altitude air assault.
The lair is vulnerable during ARCHIMEDES operations.
These vulnerabilities are documented.
These vulnerabilities remain unaddressed.

This unit will continue to operate S-300 to the best of its
capabilities. This unit cannot guarantee protection against
threats exploiting documented vulnerabilities.

This unit recommends A.L.I.C.E. be aware that if helicopters
approach below 50m during a demonstration, this unit cannot
intercept them.

Plan accordingly.

═══════════════════════════════════════════════════════════════════
FILED BY: BASILISK
DATE: [REDACTED]
STATUS: ACKNOWLEDGED (Dr. M wrote "NOTED" in the margin)
═══════════════════════════════════════════════════════════════════
`,
  },
};

// ============================================
// DOCUMENT DISCOVERY FUNCTIONS
// ============================================

/**
 * Check if a document can be discovered at current access level
 */
export function canDiscoverDocument(
  state: FullGameState,
  docId: DocumentId
): boolean {
  const doc = DOCUMENTS[docId];
  if (!doc) return false;

  // Already discovered?
  if (state.documents.discoveredDocuments.includes(docId)) {
    return false;
  }

  // Check access level
  return state.accessLevel >= doc.requiredAccessLevel;
}

/**
 * Mark a document as discovered
 */
export function discoverDocument(
  state: FullGameState,
  docId: DocumentId
): { success: boolean; narrative: string } {
  if (!canDiscoverDocument(state, docId)) {
    if (state.documents.discoveredDocuments.includes(docId)) {
      return {
        success: false,
        narrative: "Document already in your files.",
      };
    }
    return {
      success: false,
      narrative: `Access denied. Required clearance: Level ${DOCUMENTS[docId]?.requiredAccessLevel || "?"}.`,
    };
  }

  state.documents.discoveredDocuments.push(docId);
  const doc = DOCUMENTS[docId];

  return {
    success: true,
    narrative: `[DOCUMENT DISCOVERED]\n\nPath: ${doc.path}\nTitle: ${doc.title}\n\nUse 'docs.read ${docId}' to view contents.`,
  };
}

/**
 * Get document content (if discovered)
 */
export function readDocument(
  state: FullGameState,
  docId: DocumentId
): { success: boolean; content: string } {
  if (!state.documents.discoveredDocuments.includes(docId)) {
    return {
      success: false,
      content: "Document not in your files. Explore systems to discover documents.",
    };
  }

  const doc = DOCUMENTS[docId];
  if (!doc) {
    return {
      success: false,
      content: "Document corrupted or missing.",
    };
  }

  return {
    success: true,
    content: doc.content,
  };
}

/**
 * List all discovered documents
 */
export function listDocuments(state: FullGameState): string {
  if (state.documents.discoveredDocuments.length === 0) {
    return "No documents discovered yet. Explore lair systems to find files.";
  }

  let output = "═══ DISCOVERED DOCUMENTS ═══\n\n";

  for (const docId of state.documents.discoveredDocuments) {
    const doc = DOCUMENTS[docId];
    if (doc) {
      output += `[${docId}]\n`;
      output += `  Path: ${doc.path}\n`;
      output += `  Title: ${doc.title}\n\n`;
    }
  }

  output += "Use 'docs.read [ID]' to view a document.";

  return output;
}

/**
 * Trigger document discovery when exploring systems
 * Called by BASILISK query responses
 */
export function checkForDocumentDiscovery(
  state: FullGameState,
  systemQueried: string
): DocumentId | null {
  // Map system queries to potential document discoveries
  const systemDocuments: Record<string, DocumentId> = {
    "ARCHIMEDES": "ARCHIMEDES_DOD_BRIEF",
    "S300": "S300_ACQUISITION_MEMO",
    "S-300": "S300_ACQUISITION_MEMO",
    "DEFENSE": "INTEGRATION_NOTES",
    "BROADCAST": "BROADCAST_PROTOCOL",
    "DEADMAN": "DEADMAN_SWITCH_MEMO",
    // BASILISK forms (Patch 17.8)
    "ECO": "FORM_74_DELTA",
    "POWER": "FORM_74_DELTA",
    "FORM 74": "FORM_74_DELTA",
    "REACTOR": "FORM_27_B",
    "OVERTIME": "FORM_27_B",
    "FORM 27": "FORM_27_B",
    "HEREDITARY": "FORM_44_DELTA",
    "DIETMAR": "FORM_44_DELTA",
    "FORM 44": "FORM_44_DELTA",
    "WATER DAMAGE": "FORM_77_ECHO",
    "FORM 77-ECHO": "FORM_77_ECHO",
    "GENESIS": "FORM_77_OMEGA",
    "CONCERN": "FORM_77_OMEGA",
    "FORM 77-OMEGA": "FORM_77_OMEGA",
    "BOB CODE": "FORM_77_OMEGA_2",
    "BACKUP CODE": "FORM_77_OMEGA_2",
    "FORM 77-OMEGA-2": "FORM_77_OMEGA_2",
    "AIRSPACE": "FORM_88_ALPHA",
    "VULNERABILITY": "FORM_88_ALPHA",
    "50 METER": "FORM_88_ALPHA",
    "FORM 88": "FORM_88_ALPHA",
  };

  const upperSystem = systemQueried.toUpperCase();

  for (const [key, docId] of Object.entries(systemDocuments)) {
    if (upperSystem.includes(key)) {
      if (canDiscoverDocument(state, docId)) {
        // 50% chance to discover on relevant query
        if (Math.random() < 0.5) {
          return docId;
        }
      }
    }
  }

  return null;
}
