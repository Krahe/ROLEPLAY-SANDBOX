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
