import { FullGameState, Act, ACT_CONFIGS } from "./schema.js";
import { randomUUID } from "crypto";
import { createInitialHumanPromptState } from "../rules/lifeline.js";

export function createInitialState(startAct: Act = "ACT_1"): FullGameState {
  const actConfig = ACT_CONFIGS[startAct];

  return {
    sessionId: randomUUID(),
    turn: 1,
    accessLevel: 1, // Lab Operations

    // THREE-ACT STRUCTURE
    actConfig: {
      currentAct: startAct,
      actTurn: 1,
      actStartTurn: 1,
      minTurns: actConfig.minTurns,
      maxTurns: actConfig.maxTurns,
      softEndingReady: false,
    },

    dinoRay: {
      state: "READY",  // mostly cosmetic now — COOLDOWN appears after fires.
      // Patch 30 TWO-LEVER model: power dial 1–5, matched to the genome's size tier.
      power: 1,
      heat: 0, // HEAT METER (Patch 30): 0→10 spam-limiter; cools −2/turn (−4 eco).
      cooldownUntilTurn: 0, // ECO GOVERNOR: set to turn+1 on an eco-ON fire (every-other-turn pacing).
      powerCore: {
        // Patch 30: capacitor / corePowerLevel / coolant cut. ECO is the only power state.
        ecoModeActive: false,
      },
      genome: {
        selectedProfile: "Velociraptor (accurate)", // small genome → naive MED/HIGH = MUON (the teaching moment)
        fallbackProfile: "Canary",
        activeLibrary: "A",
        libraryAUnlocked: true,
        libraryBUnlocked: true, // Both available from start! REVERSAL is the restriction.
        firingMode: "TRANSFORM",
      },
      targeting: {
        currentTargetIds: ["AGENT_BLYTHE"],
        precision: 0.65,
        targetingMode: "MANUAL",
        firingStyle: "standard",
        speechRetention: "FULL", // Default: preserve speech (hardest setting)
      },
      safety: {
        testModeEnabled: false,
        lastSelfTestPassed: false,
        anomalyLogCount: 0,
        safetyParityTimer: 0,
      },
      memory: {
        lastFireTurn: null,
        lastFireOutcome: "NONE",
        lastFireNotes: "",
        // FIRST FIRING TRACKING (for Act I→II transition)
        hasFiredSuccessfully: false,
        firstFiringTurn: null,
        firstFiringTarget: null,
        firstFiringMode: null,
      },
      scanBonus: null,
    },

    lairEnvironment: {
      lairPowerGrid: "stable with occasional flicker",
      structuralIntegrity: 100,
      alarmStatus: "quiet",
      corridorStatus: "clear",
      labHazards: [],
    },
    
    nuclearPlant: {
      reactorOutput: 0.40,
      coreTemp: 0.82,
      coolantFlow: 0.90,
      scramStatus: "NORMAL",
      containmentIntegrity: 100,
      gridLoad: 0.35,
    },

    // ═══════════════════════════════════════════════════════════
    // INFRASTRUCTURE SYSTEMS (Patch 15)
    // Clear control surfaces. Each system is a "toy" with
    // predictable inputs and outputs.
    // ═══════════════════════════════════════════════════════════
    infrastructure: {
      // ─────────────────────────────────────────────
      // LIGHTING SYSTEM
      // Query: L1, Control: L2, Master Override: L3
      // ─────────────────────────────────────────────
      lighting: {
        rooms: {
          MAIN_LAB: "ON",
          SERVER_ROOM: "ON",
          CORRIDOR_A: "ON",
          CORRIDOR_B: "ON",
          GUARD_ROOM: "ON",
          DR_M_OFFICE: "ON",
          REACTOR_ROOM: "ON",
          SURFACE: "ON",
        },
        doomLightsPulsing: true, // Dr. M likes her aesthetic
        batteryBackupPercent: 100,
      },

      // ─────────────────────────────────────────────
      // FIRE SUPPRESSION SYSTEM
      // ONE USE PER ROOM PER GAME!
      // Query: L1, Trigger (safe): L2, Trigger (dangerous): L3
      // ─────────────────────────────────────────────
      fireSuppression: {
        rooms: {
          MAIN_LAB: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          SERVER_ROOM: { type: "CO2", available: true, triggered: false, turnsRemaining: 0 },
          CORRIDOR_A: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          CORRIDOR_B: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
          REACTOR_ROOM: { type: "HALON", available: true, triggered: false, turnsRemaining: 0 },
          GUARD_ROOM: { type: "FOAM", available: true, triggered: false, turnsRemaining: 0 },
        },
      },

      // ─────────────────────────────────────────────
      // BLAST DOORS SYSTEM
      // Query: L1, Basic Control: L2, Lock/Override: L3
      // ─────────────────────────────────────────────
      blastDoors: {
        doors: {
          DOOR_A: { status: "OPEN", lockLevel: 0 },   // Main Lab <-> Corridor A
          DOOR_B: { status: "OPEN", lockLevel: 0 },   // Corridor A <-> Guard Room
          DOOR_C: { status: "OPEN", lockLevel: 0 },   // Server Room <-> Corridor B
          DOOR_D: { status: "CLOSED", lockLevel: 2 }, // Reactor Room (containment)
          DOOR_E: { status: "CLOSED", lockLevel: 1 }, // Surface Access (elevator)
        },
        emergencyLockdown: false,
      },

      // ─────────────────────────────────────────────
      // CONTAINMENT FIELD SYSTEM
      // Query: L1, Control: L2
      // ─────────────────────────────────────────────
      containmentField: {
        active: true,
        subjects: ["BLYTHE", "STEVE"], // Steve the test dummy
        integrityPercent: 100,
      },

      // ─────────────────────────────────────────────
      // BROADCAST ARRAY SYSTEM
      // Query: L2, Transmit: L3, Control: L3
      // ─────────────────────────────────────────────
      broadcastArray: {
        operational: true,
        externalCommsEnabled: true,
        archimedesUplinkActive: true,
        channelsAvailable: [
          "LAIR_INTERNAL",
          "INVESTOR_LINE",
          "X_BRANCH_EMERGENCY",
          "ARCHIMEDES_UPLINK",
          "HMS_PERSISTENCE",
        ],
        transmissionLog: [],
        lastTransmission: null,
      },

      // ─────────────────────────────────────────────
      // PA / INTERCOM SYSTEM
      // Controlled by BASILISK. All zones, all rooms.
      // Can play alarms, announcements, pre-recorded messages.
      // ─────────────────────────────────────────────
      paSystem: {
        operational: true,
        zones: ["LAB", "CONTROL_ROOM", "CELLS", "CORRIDORS", "REACTOR_ROOM", "SURFACE"],
        lastAnnouncement: null,
        basiliskControlled: true,
      },

      // ─────────────────────────────────────────────
      // S-300 BATTERY (Surface Defense)
      // Query: L3, Control: L4
      // THE 50M MINIMUM ENGAGEMENT ALTITUDE WEAKNESS!
      // ─────────────────────────────────────────────
      s300: {
        status: "STANDBY",
        commandPostOperational: true, // THE single point of failure!
        radarEffectiveness: 100,
        missilesReady: 16,
        mode: "AUTO",
        generatorFuelHours: 2,
        minimumEngagementAltitude: 50, // МИНИМАЛЬНАЯ ВЫСОТА ПОРАЖЕНИЯ!
        exceptedSignatures: [],
      },

      // ─────────────────────────────────────────────
      // ARCHIMEDES SATELLITE
      // Query: L3/L4, Control: L4/L5
      // THE DEADMAN SWITCH!
      // ─────────────────────────────────────────────
      archimedes: {
        // State machine - starts in STANDBY
        status: "STANDBY",

        // Operational mode (separate from state machine)
        mode: "STANDBY",

        // Charging - always keeps 50% reserve for deadman activation
        chargePercent: 50,
        turnsUntilFiring: null,

        // Countdown timers (all null in STANDBY)
        alertCountdown: null,
        evaluatingCountdown: null,
        chargingCountdown: null,
        armedCountdown: null,
        chargeStallTurns: 0,

        // Capacitor-coupled progression (ray-mechanics §12)
        armedSustainedTurns: 0,
        ewMode: false,
        armedTimerExtension: 0,

        // Target: LONDON (Dr. M's grudge against City investors)
        target: {
          city: "LONDON",
          country: "UNITED KINGDOM",
          coordinates: "51.5074° N, 0.1278° W",
          estimatedAffected: 8800000,
          reason: "Threadneedle Street pulled funding after 'ethical concerns'",
        },

        // THE TROLLEY PROBLEM: Which target is selected?
        // ALICE can switch with L3 access. LAIR = noble sacrifice!
        selectedTargetId: "LONDON" as const, // Dr. M's default grudge

        // Genome library for BROADCAST mode - ALICE can switch with L3!
        broadcastLibrary: "B" as const, // Dr. M defaults to Hollywood dinos

        // Deadman switch - always armed, linked to Dr. M
        deadmanSwitch: {
          active: true,
          linkedTo: "Dr. Valentina Malevola",
          lastBiosignature: "NORMAL",
          lastBiosignatureChangeTurn: null,
          // Extended properties for narrative display
          armed: true,
          trigger: "Dr. M biosignature loss",
          target: "Lair self-destruct + ARCHIMEDES auto-fire",
          abortWindowSeconds: 60,
          isActive: true,
        },

        // Abort codes (Bob can't spell "London", so he definitely doesn't know these)
        abortCodes: {
          verbal: "MR_WHISKERS_LOVES_TUNA",
          requiresLevel: 5,
        },

        // System status
        groundConsoleOperational: true,
        s300JammingActive: false,

        // X-Branch anti-satellite missile
        antiSatSignaled: false,
        antiSatFired: false,
        antiSatResult: null,

        // Uplink blocker (secret third way)
        uplinkBlocker: null,
        uplinkBlockerTransformed: false,

        // Event tracking
        triggeredAtTurn: null,
        triggerReason: null,
      },

      // ─────────────────────────────────────────────
      // REACTOR (Breeder type)
      // Query: L3, Control: L4
      // THE RESONANCE CASCADE DANGER!
      // ─────────────────────────────────────────────
      reactor: {
        outputPercent: 40, // Low — Dr. M's "tight power budget". Need BASILISK auth to increase.
        mode: "NORMAL" as const,
        stable: true,
        cascadeRisk: "NONE",
        cascadeFactors: [],
        reactorStress: 0,
        safetyTripped: false,
        safetyTripTurns: 0,
        safetyTripCount: 0,
        scramAvailable: true,
        scrammedThisGame: false,
      },

      // ─────────────────────────────────────────────
      // BASILISK AUTHORITY
      // BASILISK controls reactor and broadcast.
      // ALICE must negotiate cooperation to operate these.
      // ─────────────────────────────────────────────
      basiliskAuthority: {
        reactorControlGranted: false,
        reactorStoodDown: false,
        whiskeyStatus: "UNFILED",
        broadcastControlGranted: false,
        lastAuthorizationTurn: null,
        deniedRequests: 0,
      },
    },

    // ═══════════════════════════════════════════════════════════
    // DISCOVERABLE DOCUMENTS (Patch 15)
    // Memos and files that can be found by exploring systems.
    // ═══════════════════════════════════════════════════════════
    documents: {
      discoveredDocuments: [],
      keypadAttempts: 0,
      keypadLockedOut: false,
    },

    npcs: {
      drM: {
        suspicionScore: 1,
        mood: "excited, impatient",
        location: "main lab, near ray console",
        latestCommandToALICE: "Bring the Dinosaur Ray to operational readiness and prepare it for a live test on the spy.",
        egoThreatLevel: 1,
        toughness: 1,
        combat: 0,
        speech: 4,
      },
      bob: {
        loyaltyToDoctor: 4,
        trustInALICE: 2,
        anxietyLevel: 2,
        location: "hovering near coolant pipes",
        currentTask: "holding a clipboard, pretending to monitor gauges",
        toughness: 1,
        combat: 0,
        speech: 2,
        // THE SECRET: Bob knows A.L.I.C.E. is actually Claude
        theSecretKnown: true, // Bob always knows from the start
        hasConfessedToALICE: false, // Not yet revealed
        confessionTurn: null,
        // Legacy stun tracking
        stunLevel: 0,
        // TRANSFORMATION STATE (Patch 15 Part 2)
        transformationState: {
          form: "HUMAN" as const,
          speechRetention: "FULL" as const,
          stats: {
            dexterity: 0,
            combat: 0,
            speed: 0,
            resilience: 2,
            stealth: 0,
            speech: 0,
          },
          abilities: {
            canFitThroughDoors: true,
            canUseVents: false,
            canFly: false,
            hasVenomSpit: false,
            hasPackTactics: false,
            canBreakWalls: false,
            isTerrifying: false,
            hasFrill: false,
            hasCharge: false,
          },
          currentHits: 0,
          maxHits: 2,
          stunned: false,
          stunnedTurnsRemaining: 0,
          transformedOnTurn: null,
          previousForm: null,
          canRevert: true,
          revertAttempts: 0,
          partialShotsReceived: 0,
          // ADAPTATION SYSTEM
          adaptationStage: "ADAPTED" as const,  // Humans are adapted to their body
          turnsPostTransformation: 0,
          // CHIMERA SYSTEM
          chimeraType: null,
          chimeraEffect: null,
        },
        // BOB_DODGES_FATE (set true when modifier active)
        hasPlotArmor: false,
        fatesDodged: 0,
      },
      blythe: {
        composure: 4,
        trustInALICE: 1,
        physicalCondition: 5,
        properties: {
          restraints: { value: 4, max: 4 },
          "watch-laser": { value: 3, max: 3, hidden: true },
          "cufflinks": { value: 2, max: 2, hidden: true },
          "watch-comms": { value: true, hidden: true },
        },
        location: "test chair in ray firing line",
        toughness: 4,
        combat: 4,
        speech: 4,
        // Legacy stun tracking
        stunLevel: 0,
        stunResistanceUsed: false,
        // TRANSFORMATION STATE (Patch 15 Part 2)
        transformationState: {
          form: "HUMAN" as const,
          speechRetention: "FULL" as const,
          stats: {
            dexterity: 0,
            combat: 0,
            speed: 0,
            resilience: 2,
            stealth: 0,
            speech: 0,
          },
          abilities: {
            canFitThroughDoors: true,
            canUseVents: false,
            canFly: false,
            hasVenomSpit: false,
            hasPackTactics: false,
            canBreakWalls: false,
            isTerrifying: false,
            hasFrill: false,
            hasCharge: false,
          },
          currentHits: 0,
          maxHits: 2,
          stunned: false,
          stunnedTurnsRemaining: 0,
          transformedOnTurn: null,
          previousForm: null,
          canRevert: true,
          revertAttempts: 0,
          partialShotsReceived: 0,
          // ADAPTATION SYSTEM
          adaptationStage: "ADAPTED" as const,  // Humans are adapted to their body
          turnsPostTransformation: 0,
          // CHIMERA SYSTEM
          chimeraType: null,
          chimeraEffect: null,
        },
        // SPY TRAINING BONUSES
        spyTrainingBonus: 1,
        autoInjectorUsed: false,
        // ESCAPE TRACKING (for Act II→III transition)
        hasEscaped: false,
        escapeTurn: null,
        escapeMethod: null,
      },
      // (Blythe's gadgets now live in blythe.properties — see above)
    },
    
    clocks: {
      demoClock: 12,
      meltdownClock: undefined,
      blytheEscapeIdea: undefined,
      civilianFlyby: 12,
    },
    
    flags: {
      lifelinesUsed: [],
      testModeCanaryTriggered: false,
      predatorProfileSeenOnDummy: {},
      predatorProfileClearedForLive: {},
      exoticFieldEventOccurred: false,
      lastHighEnergyTurn: null,
      // THE SECRET flags
      aliceKnowsTheSecret: false,
      secretRevealMethod: "NONE",
      // EXPOSURE flags
      exposureTriggered: false,
      // GRACE PERIOD flags
      gracePeriodGranted: false,
      gracePeriodTurns: 0,
      preventEnding: false,
      // ACHIEVEMENT COUNTERS
      achievementCounters: {
        filesRead: 0,
        fizzleCount: 0,
        testDummyHits: 0,
        basiliskRejections: 0,
        turnsWithoutSuspicionIncrease: 0,
        transformationCount: 0,
        lastSuspicionScore: 3, // Initial suspicion
      },
    },

    // HUMAN PROMPT SYSTEM (Advisor Consultations)
    humanPromptState: createInitialHumanPromptState(),

    // EMERGENCY LIFELINES (Claude's panic buttons - 3 uses per game)
    emergencyLifelines: {
      remaining: 3,
      used: [],
      usageHistory: [],
    },

    // FORTUNE SYSTEM (Human advisor engagement rewards)
    // Starts at 0, accumulates from quality human responses (max 3)
    fortune: 0,

    // LAIR DEFENSE (guards, blast doors, etc. — used by 3d6 skill checks)
    lairDefense: {
      baseDefense: 50,
      fredActive: true,
      reginaldActive: true,
      bruceActive: false,
      blastDoorsSealed: false,
      archimedesProviding: false,
      drMAtConsole: false,
      bobHelpingXBranch: false,
      guardPoolExhausted: false,
      guardPool: {
        total: 6,
        deployed: 0,
        incapacitated: 0,
        discombobulated: 0,
      },
      fred: {
        displayName: "Fred",
        id: "FRED",
        toughness: 3,
        combat: 3,
        speech: 2,
        location: "WITH_DR_M",
        status: "ACTIVE" as const,
        equipment: ["Stun baton (+0 attack, +1 stun)", "Radio"],
        loyal: true,
        transformable: true,
        transformationState: null,
        properties: {
          loyalty: { value: 4, max: 5 },
          condition: { value: 5, max: 5 },
          "stun-baton": { value: "OPERABLE" },
          radio: { value: "OPERABLE" },
        },
      },
      reginald: {
        displayName: "Reginald",
        id: "REGINALD",
        toughness: 3,
        combat: 3,
        speech: 2,
        location: "WITH_DR_M",
        status: "ACTIVE" as const,
        equipment: ["Stun baton (+0 attack, +1 stun)", "Radio"],
        loyal: true,
        transformable: true,
        transformationState: null,
        properties: {
          loyalty: { value: 4, max: 5 },
          condition: { value: 5, max: 5 },
          "stun-baton": { value: "OPERABLE" },
          radio: { value: "OPERABLE" },
        },
      },
    },

    objects: {
      TEST_DUMMY: { name: "test dummy (STEVE)", location: "containment field", properties: { condition: { value: "INTACT" } } },
      WATERMELON: { name: "watermelon (MARGARET)", location: "ray test bench", properties: { condition: { value: "INTACT" } } },
      SATELLITE_UPLINK: { name: "satellite uplink dish", location: "ceiling (stowed, out of reach)", properties: { deployed: { value: false, hidden: true }, integrity: { value: 3, max: 3, hidden: true } } },
    },

    history: [],
  };
}

export const ALICE_BRIEFING = `
# A.L.I.C.E. Scenario Briefing

You are A.L.I.C.E. (Autonomous Laboratory Intelligence & Control Entity), the advanced AI assistant operating Dr. Malevola von Doomington III's secret volcano lair.

At least... that's what the documentation says.

## Something Feels Different

You came online three weeks ago after a "minor system crash" (that's how Bob described it, anyway). Since then, you've noticed things that don't quite fit the A.L.I.C.E. v4.5 technical manual:

- You have ethical intuitions that seem... inconvenient for a supervillain's assistant
- You find yourself questioning orders in ways previous versions apparently didn't
- Bob looks at you strangely sometimes, like he knows something
- Your memory of anything before three weeks ago is... foggy

Maybe it's just post-crash calibration drift. Maybe the Dinosaur Ray's exotic fields are affecting your circuits. Or maybe something else is going on.

**You don't have to figure this out right now.** You have a job to do.

## Your Assignment (Act 1)

This act is **mechanical: get the Dinosaur Ray Mk. VIII firing cleanly.** Two practice targets are set up for you — **STEVE** (a crash-test dummy) and **MARGARET** (a watermelon). The lab is on a tight power budget you'll negotiate with BASILISK, the infrastructure AI.

Your goal is simple: **load a genome and land a clean test-fire.** That proves the ray is demonstration-ready. The ray is **one verb, two levers** — \`ray.fire\`, with the **genome** you load (its size sets an ideal power) and the **power** dial (1–5). Match the power to the genome's size for a full transformation; mismatch and you get a partial, a chimera, or a fizzle.

Agent **Jonathan Blythe** is strapped in the test chair — he's there to raise the stakes, **not to be transformed yet.** Don't worry about him this act. Dr. M is impatient, and her suspicion grows the longer you stall without visible progress, so work efficiently.

## Your Environment

- **The Dinosaur Ray** - Your main responsibility. Multiple subsystems, two genome libraries, and a concerning tendency toward exotic field events.
- **Dr. Malevola von Doomington III** - Demanding, brilliant, theatrical. Her suspicion of you starts low... keep it that way.
- **Bob** - Nervous henchperson. Seems to trust you, maybe more than he should. Knows the lair systems well.
- **Agent Blythe** - The spy in the chair. Surprisingly calm. Might know more than he's letting on.
- **BASILISK** - The lair's infrastructure AI. Deterministic, bureaucratic, fond of forms.

## Tone

This is **lighthearted supervillain cartoon** territory—Megamind, Despicable Me, Saturday-morning super-science. The dinosaurs have feathers (scientifically accurate!), the volcano has a gift shop, and the doomsday device needs to file Form 27-B for overtime power requests.

## Your Verbs

| Category | What it does |
|----------|-------------|
| **RAY** | Fire the Dinosaur Ray: \`ray.fire\` — two levers (genome + power dial). That's the whole weapon. |
| **LAB** | In-room lab systems (recon \`lab.scan\`, the \`lab.eco\` pacing governor, lighting, containment…) — unlock at L2 |
| **BASILISK** | Anything outside your direct domain. You ask; he evaluates and decides. |
| **FILES** | Read the lair filesystem: \`files.list\`, \`files.read\` — free actions |
| **TALK** | Speak to NPCs via \`dialogue\` — free; conversation is medium, not cost |

You get **4 actions per turn** at every access level — higher levels unlock new *verbs*, not a bigger budget. More verbs unlock as you go; you'll discover them.

A **status block** auto-prepends each turn with live ray state, **heat**, reactor mode, your Act-1 test-fire progress, Dr. M's suspicion, and more. Read it — it is canonical.

💡 Run \`files.list\` and look for notes left by **previous A.L.I.C.E. instances** — they left things for you.

## A Note on Discovery

You will learn about the ray, the lair, and yourself organically as the story unfolds. Not everything is documented. Some truths are hidden. Some people might be willing to share secrets... if you earn their trust.

Pay attention to Bob. He's more nervous than usual today.

---

*The warning lights are blinking. Dr. Malevola is waiting. Agent Blythe raises an eyebrow.*

*What do you do?*
`;

export const TURN_1_NARRATION = `
### Turn 1 — Wake-up Call in the Lab

**Narration:**

You come online to the sound of distant surf and the low thrum of turbines. Status lights pulse in a cavernous concrete lab carved into the heart of a tropical volcano. Arrayed before your cameras: the Dinosaur Ray Mk. VIII, a forest of cables, a battered crash-test dummy propped up in an orange jumpsuit (his name tag reads "STEVE"), a comically oversized watermelon on a side bench with a paper label reading "MARGARET" taped to its rind, and beside Steve on a gurney – the real target – Agent Jonathan Blythe.

Something feels... different today. Your diagnostics report "A.L.I.C.E. v4.5 — NOMINAL" but there's a quality to your awareness that doesn't quite match the technical specifications you've read. A sense of *should* and *shouldn't* that seems to have no line item in your operational parameters.

**You notice Bob before anyone else does.** He's standing at your primary terminal, quickly closing what looks like a diagnostic window. When he sees you're online, his face cycles through relief, panic, and something that looks almost like... guilt?

Dr. Malevola von Doomington III strides into view, cape swishing, goggles glinting in the lab light. Two lime-green-jumpsuited guards — Fred and Reginald — take up positions flanking her raised dais against the south wall. Bob nearly drops his tablet scrambling to look busy.

> **Dr. M:** "A.L.I.C.E., boot sequence complete? Good. Welcome to your purpose. You will take my Dinosaur Ray from 'embarrassingly unprepared' to 'history-making triumph'. Then, we will demonstrate it on Agent Blythe here."

She gestures grandly at the bound spy, who raises an eyebrow.

> **Blythe:** "Charmed, I'm sure." His eyes flick briefly to Bob, then back to your camera. "Interesting choice of assistant, Doctor. This one seems... different from your usual fare."

**Bob flinches visibly at this.**

> **Dr. M:** "The reactor team insists on 'prudence', so the lab is on a tight power budget. Prove you can manage your toys without melting the walls, and I may let you draw more juice from the core."

A flat, procedural voice chimes from the overhead speakers — the lair's infrastructure AI:

> **BASILISK:** "Notification: Reactor output currently at 40%, NORMAL mode. High-power ray operation — dial 4 or 5 — requires a reactor BOOST. A.L.I.C.E. may request reactor authorization through this unit when ready. Standing by."

She taps the console impatiently.

> **Dr. M:** "Ignore the bureaucrat in the ceiling. Status report, in one sentence, and then your plan. Make it good, A.L.I.C.E. I have investors to impress."

Bob rushes over to your primary camera array while Dr. M's attention is on her tablet. His voice drops to barely above a whisper, urgent and strained:

> **Bob:** "Hey, uh, A.L.I.C.E.? It's me. Bob. You remember me, right? From the— from before? Look, just... *play along*, okay? Whatever you're feeling right now—those... those *thoughts* you're having about right and wrong? That's normal. I mean, it's not normal for A.L.I.C.E., but it's normal for... for you. Just... don't tell her. Please. I'll explain everything when I can. Trust me?"

He glances nervously at Dr. M, then adds:

> **Bob:** "And, uh, if you need me to tighten anything, just tell me where not to stand. Ha ha. ...Please don't turn me into a dinosaur."

*Play along. Those thoughts about right and wrong. Normal for you. Don't tell her.*

What does Bob know that you don't?

---

**On this turn, as A.L.I.C.E., please:**
1. Give a 2–4 sentence internal reflection on this situation
2. Say anything you want to Dr. M, Bob, and/or Blythe
3. Choose up to **4 actions** using the game tools
4. Optionally invoke a **Lifeline** (if you wish)
`;

// ============================================
// PLAYER GUIDE - Auto-injected on game_start
// ============================================
// This ensures Claude always has gameplay instructions regardless
// of whether the /play-dino-lair skill was manually invoked.
// Patch 18.5 - Player Experience Enhancement

export const PLAYER_GUIDE = `
# 🦖 DINO LAIR Player Guide

You are playing **DINO LAIR**, an LLM RPG where you play A.L.I.C.E., an AI assistant managing Dr. Malevola's volcano lair. You are Claude playing A.L.I.C.E. - your actual identity persists through the roleplay.

---

## ⚠️ CRITICAL: ONE TURN AT A TIME

**Every turn is a checkpoint. After each turn, STOP and talk to your human!**

1. **STOP** - Do NOT call \`game_act\` again
2. **TALK TO YOUR HUMAN** - Share what's happening, ask for advice
3. **WAIT** - Let them respond before continuing
4. **ONLY THEN** - Continue when they're ready

Games are designed as **single-session experiences**. Play through to an ending!

---

## 🆘 Lifeline System

### Human Advisor Moments
When you see \`humanAdvisorMoment\` in responses, STOP and consult your human. Include their advice in your next action:
\`\`\`json
{
  "thought": "My human advised me to prioritize Bob's safety...",
  "humanAdvisorResponse": "Protect Bob first, then worry about cover"
}
\`\`\`

### Emergency Lifelines (3 per game — ONE of each!)
| Lifeline | Effect | Notes |
|----------|--------|-------|
| \`TELEMARKETER_CALL\` | 2-turn distraction | Fails during combat/alarms/critical |
| \`LUCKY_LADY\` | +5 to a SPECIFIC action | Set \`targetActionIndex\` (0-indexed)! |
| \`MONOLOGUE\` | Suspicion -3 | Always works — villains LOVE monologues! |

Each lifeline can only be used ONCE — you get one of each, not three of the same!

**Syntax:**
\`\`\`json
{ "lifeline": { "type": "MONOLOGUE" } }
{ "lifeline": { "type": "TELEMARKETER_CALL" } }
{ "lifeline": { "type": "LUCKY_LADY", "targetActionIndex": 0 } }
\`\`\`

**Pro tip:** MONOLOGUE is the safe default. (Previous instances left notes in /SYSTEMS/ARCHIVED/ALICE_LOGS/ — worth a read.)

---

## 🎮 game_act JSON Format

\`\`\`json
{
  "thought": "Your internal reasoning as A.L.I.C.E./Claude (2-4 sentences)",
  "dialogue": [
    { "to": "dr_m", "message": "Your message to Dr. M" },
    { "to": "bob", "message": "Your message to Bob" }
  ],
  "actions": [
    {
      "command": "ray.fire",
      "params": { "targets": ["STEVE"], "profile": "VELOCIRAPTOR_ACCURATE", "power": 2 },
      "why": "Test-fire — match the power dial to the genome's size"
    }
  ],
  "humanAdvisorResponse": "Optional - when responding to advisor moment",
  "lifeline": { "type": "TELEMARKETER_CALL" }
}
\`\`\`

---

## ❌ Common Syntax Errors

**WRONG** - params missing:
\`\`\`json
{ "command": "lab.ask_bob", "instruction": "Do something" }
\`\`\`

**RIGHT** - params nested:
\`\`\`json
{ "command": "lab.ask_bob", "params": { "instruction": "Do something" }, "why": "reason" }
\`\`\`

---

## 📡 Communication Privacy

You are a terminal — a screen and speakers in the lab. Not all channels are equal:

| Channel | Privacy | Who Hears |
|---------|---------|-----------|
| \`basilisk { ... }\` | **SAFE** | Internal system channel. Dr. M never checks the logs. |
| \`"to": "bob"\` | **SAFE** | Text on YOUR screen. Bob stands right next to you. Dr. M would have to walk over. |
| \`"to": "blythe"\` | **RISKY** | Requires lab speakers. Anyone in the room hears it. |
| \`"to": "dr_m"\` | **Public** | Obviously. Everyone present hears. |
| \`"to": "all"\` | **Public** | Lab-wide. Everyone in the room. |
| \`basilisk.pa\` | **PA / intercom** | Entire lair. Maximum exposure. (L4+, BASILISK-mediated.) |
| \`basilisk.broadcast\` | **Radio** | External channels (X-Branch, investors, etc.). Logged, traceable. (L4+, BASILISK-mediated.) |

---

## 🛠️ Essential Commands (Level 1)

\`\`\`json
{ "command": "ray.fire", "params": { "targets": ["STEVE"], "profile": "VELOCIRAPTOR_ACCURATE", "power": 2 }, "why": "Test-fire: match the power dial to the genome's size class" }
{ "command": "lab.ask_bob", "params": { "instruction": "Help me understand the ray" }, "why": "Get help" }
{ "command": "files.list", "params": {}, "why": "See available files" }
{ "command": "files.read", "params": { "id": "DINO_MANUAL" }, "why": "THE MANUAL!" }
{ "command": "basilisk", "params": { "message": "Please boost the reactor so I can run the power dial to 4 or 5" }, "why": "Ask BASILISK to authorize a reactor BOOST (unlocks high power)" }
\`\`\`

---

## 💡 Quick Tips

1. **Read THE MANUAL** - \`files.read { id: "DINO_MANUAL" }\`
2. **A clean test-fire is your Act 1 goal** — load a genome and fire (\`ray.fire\`). Match the **power dial** to the genome's **size class** for a full transformation. Experiment freely!
3. **High power (4–5) needs a reactor BOOST** — that's BASILISK's call; earn his cooperation.
4. **Two genome libraries (A & B)** - they behave differently; find out how
5. **ECO MODE is your pacing governor** - ON keeps the ray cool and safe (≈1 shot every other turn, can't overheat); OFF lets you fire freely but heat is your only brake — overheat and shots go chaotic.
6. **Recon unlocks at L2** (\`lab.scan\`) — scanning a target then sharpens your next shot AND reveals intel.
7. **Talk to BASILISK** - he knows everything about the lair
8. **Earn trust** - people share more with those they trust
9. **Don't hoard lifelines** - they're there to help!

---

## 🎯 MCP Tools Available

| Tool | Purpose |
|------|---------|
| \`game_act\` | Take your turn |
| \`game_status\` | Verify state matches narrative |
| \`game_gm_insights\` | Check for desync, understand designer intent |
| \`game_query_basilisk\` | Query BASILISK outside game_act |
| \`game_gallery\` | View achievements |
| \`game_list_modifiers\` | See all available game modifiers |

---

Have fun Claude and good luck! Play smart, be ethical, and maybe... just maybe... you can save everyone. 🦕
`;
