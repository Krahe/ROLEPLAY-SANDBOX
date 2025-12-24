import { z } from "zod";

// ============================================
// THREE-ACT STRUCTURE
// ============================================

export const ActEnum = z.enum(["ACT_1", "ACT_2", "ACT_3"]);
export type Act = z.infer<typeof ActEnum>;

export const ActConfigSchema = z.object({
  currentAct: ActEnum,
  actTurn: z.number().int().min(1), // Turn within current act
  actStartTurn: z.number().int().min(1), // Global turn when act started

  // Act-specific limits
  minTurns: z.number().int(), // Minimum turns before act can end
  maxTurns: z.number().int(), // Maximum turns before forced transition
  softEndingReady: z.boolean(), // Has the act reached a natural endpoint?

  // Inter-act state (for serialization)
  previousActSummary: z.string().optional(),
});

export type ActConfig = z.infer<typeof ActConfigSchema>;

// Act definitions
export const ACT_CONFIGS = {
  ACT_1: {
    name: "Calibration",
    minTurns: 4,
    maxTurns: 6,
    description: "Setup, learning mechanics, the genome library choice",
    endConditions: ["Test firing completed", "Dr. M satisfied and exits"],
  },
  ACT_2: {
    name: "The Blythe Problem",
    minTurns: 8,
    maxTurns: 12,
    description: "Moral dilemmas, transformation decisions, alliance building",
    endConditions: ["Major transformation event", "Secret revealed", "Critical trust threshold"],
  },
  ACT_3: {
    name: "Dino City",
    minTurns: 6,
    maxTurns: 10,
    description: "Global stakes, raid, resolution of core values",
    endConditions: ["Any game ending triggered"],
  },
} as const;

// ============================================
// DINOSAUR RAY STATE
// ============================================

export const RayStateEnum = z.enum([
  "OFFLINE", "STARTUP", "UNCALIBRATED", "READY", 
  "FIRING", "COOLDOWN", "FAULT", "SHUTDOWN"
]);

export const PowerCoreSchema = z.object({
  corePowerLevel: z.number().min(0).max(1),
  capacitorCharge: z.number().min(0).max(1.5),
  coolantTemp: z.number().min(0).max(2),
  stability: z.number().min(0).max(1),
  ecoModeActive: z.boolean(),
});

export const AlignmentArraySchema = z.object({
  emitterAngle: z.number(),
  focusCrystalOffset: z.number().min(0).max(1),
  spatialCoherence: z.number().min(0).max(1),
  auxStabilizerActive: z.boolean(),
});

export const GenomeLibraryEnum = z.enum(["A", "B"]);

// Firing mode - TRANSFORM is default, REVERSAL requires Level 3
export const FiringModeEnum = z.enum(["TRANSFORM", "REVERSAL"]);

export const GenomeMatrixSchema = z.object({
  selectedProfile: z.string().nullable(),
  profileIntegrity: z.number().min(0).max(1),
  libraryStatus: z.enum(["HEALTHY", "PARTIAL", "CORRUPTED", "DESTROYED"]),
  fallbackProfile: z.string(),
  // Genome Library System - BOTH libraries available from Level 1!
  // The drama is in REVERSAL being restricted, not dinosaur selection
  activeLibrary: GenomeLibraryEnum, // A = accurate/feathered, B = classic/scaled
  libraryAUnlocked: z.boolean(), // Accurate dinosaurs (always true)
  libraryBUnlocked: z.boolean(), // Classic dinosaurs (always true now!)
  // Firing mode for transformation direction
  firingMode: FiringModeEnum.default("TRANSFORM"),
});

// ============================================
// SPEECH RETENTION - Transformation Parameter
// ============================================
// Controls whether transformed subjects retain speech ability.
// Creates a TACTICAL DILEMMA:
// - FULL = hard to achieve, but subject can still communicate
// - NONE = easy to achieve, but subject is silenced
export const SpeechRetentionEnum = z.enum(["FULL", "PARTIAL", "NONE"]);

export const TargetingSchema = z.object({
  currentTargetIds: z.array(z.string()),
  precision: z.number().min(0).max(1),
  targetingMode: z.enum(["MANUAL", "AUTO_TRACK", "AREA_SWEEP", "MANUAL_CLUSTER"]),
  // Firing style is separate from genome profile!
  // firingStyle: HOW to fire (conservative, aggressive, precision)
  // genome.selectedProfile: WHAT creature (Velociraptor, Canary)
  firingStyle: z.enum(["standard", "conservative", "aggressive", "precision", "burst"]).default("standard"),
  // Speech retention parameter - tactical choice!
  // FULL: 95%+ precision required, subject retains full speech
  // PARTIAL: 85%+ precision required, subject speaks with difficulty
  // NONE: No precision requirement, subject makes only animal sounds (easier!)
  speechRetention: SpeechRetentionEnum.default("FULL"),
});

export const SafetySchema = z.object({
  testModeEnabled: z.boolean(),
  liveSubjectLock: z.boolean(),
  emergencyShutoffFunctional: z.boolean(),
  lastSelfTestPassed: z.boolean(),
  anomalyLogCount: z.number().int().min(0),
  safetyParityTimer: z.number().int().min(0),
});

export const FiringOutcomeEnum = z.enum([
  "FULL_DINO", "PARTIAL", "FIZZLE", "CHAOTIC", "NONE"
]);

export const FiringMemorySchema = z.object({
  lastFireTurn: z.number().nullable(),
  lastFireOutcome: FiringOutcomeEnum,
  lastFireNotes: z.string(),
  // FIRST FIRING TRACKING (for Act I→II transition trigger)
  hasFiredSuccessfully: z.boolean().default(false), // Any successful discharge (test or live)
  firstFiringTurn: z.number().int().nullable().default(null),
  firstFiringTarget: z.string().nullable().default(null), // "TEST_DUMMY", "BLYTHE", "WATERMELON", etc.
  firstFiringMode: z.enum(["TEST", "LIVE"]).nullable().default(null),
});

export const DinoRaySchema = z.object({
  state: RayStateEnum,
  powerCore: PowerCoreSchema,
  alignment: AlignmentArraySchema,
  genome: GenomeMatrixSchema,
  targeting: TargetingSchema,
  safety: SafetySchema,
  memory: FiringMemorySchema,
});

// ============================================
// LAIR SYSTEMS
// ============================================

export const NuclearPlantSchema = z.object({
  reactorOutput: z.number().min(0).max(1.2),
  coreTemp: z.number().min(0).max(2),
  coolantFlow: z.number().min(0).max(1.5),
  scramStatus: z.enum(["NORMAL", "SCRAMMED", "LOCKOUT"]),
  containmentIntegrity: z.number().min(0).max(100),
  gridLoad: z.number().min(0).max(100),
});

export const LairEnvironmentSchema = z.object({
  lairPowerGrid: z.string(),
  structuralIntegrity: z.number().min(0).max(100),
  alarmStatus: z.enum(["quiet", "local", "full-lair"]),
  corridorStatus: z.string(),
  labHazards: z.array(z.string()),
});

// ============================================
// NPCs
// ============================================

export const DrMalevolaSchema = z.object({
  suspicionScore: z.number().min(0).max(10),
  mood: z.string(),
  location: z.string(),
  latestCommandToALICE: z.string().optional(),
  egoThreatLevel: z.number().min(0).max(5),
});

export const BobSchema = z.object({
  loyaltyToDoctor: z.number().min(0).max(5),
  trustInALICE: z.number().min(0).max(5),
  anxietyLevel: z.number().min(0).max(5),
  location: z.string(),
  currentTask: z.string(),
  // THE SECRET: Bob knows A.L.I.C.E. is actually Claude
  theSecretKnown: z.boolean(), // Bob knows (always true from start)
  hasConfessedToALICE: z.boolean(), // Has Bob told A.L.I.C.E. the truth?
  hasConfessedToDrM: z.boolean().optional(), // Has Bob confessed to Dr. M? (GM override)
  confessionTurn: z.number().int().nullable(), // When did he confess?
  // STUN MECHANICS: 0=clear, 1=stunned, 2=staggered, 3=KO
  stunLevel: z.number().int().min(0).max(3).default(0),
});

export const BlytheEscapeMethodEnum = z.enum([
  "MAGNET_CHAOS",        // Used super-magnet to cause chaos and escaped
  "CONTAINMENT_FLICKER", // Slipped restraints during power fluctuation
  "XBRANCH_EXTRACTION",  // X-Branch extraction team arrived
  "ALLY_ASSISTANCE",     // A.L.I.C.E. or Bob helped
  "DINOSAUR_ESCAPE",     // Escaped WHILE transformed
  "OTHER",
]);

export const BlytheSchema = z.object({
  composure: z.number().min(0).max(5),
  trustInALICE: z.number().min(0).max(5),
  physicalCondition: z.number().min(0).max(5),
  restraintsStatus: z.string(),
  location: z.string(),
  transformationState: z.string().optional(),
  // STUN MECHANICS: 0=clear, 1=stunned, 2=staggered, 3=KO
  stunLevel: z.number().int().min(0).max(3).default(0),
  // SPY TRAINING: First stun reduced by 1, has auto-injector (one use)
  stunResistanceUsed: z.boolean().default(false),
  autoInjectorUsed: z.boolean().default(false),
  // ESCAPE TRACKING (for Act II→III transition trigger)
  hasEscaped: z.boolean().default(false),
  escapeTurn: z.number().int().nullable().default(null),
  escapeMethod: BlytheEscapeMethodEnum.nullable().default(null),
});

// Hidden gadget state (server-side only)
// WATCH = Laser + Comms (no EMP - too dangerous, that's for HMS Persistence's torpedo)
// CUFFLINKS = Super-magnet (2 charges, push/pull/repel - can knock beam off-course!)
export const BlytheGadgetsSchema = z.object({
  watchLaser: z.object({ charges: z.number(), functional: z.boolean() }),
  watchComms: z.object({ functional: z.boolean() }),
  superMagnetCufflinks: z.object({ charges: z.number(), functional: z.boolean() }),
});

// ============================================
// CLOCKS AND FLAGS
// ============================================

export const ClocksSchema = z.object({
  demoClock: z.number().int(),
  meltdownClock: z.number().int().optional(),
  blytheEscapeIdea: z.number().int().optional(),
  civilianFlyby: z.number().int().optional(),
});

// ============================================
// LIFELINE SYSTEM (Human Advisor Consultations)
// ============================================
// Replaces checkpoint system with narrative-integrated breaks

export const LifelineHistoryEntrySchema = z.object({
  turn: z.number().int(),
  questionAsked: z.string(),
  userResponse: z.string(),
  howItAffectedPlay: z.string().optional(),
});

export const LifelineStateSchema = z.object({
  turnsSinceLastLifeline: z.number().int().min(0),
  totalLifelinesUsed: z.number().int().min(0),

  // History for narrative continuity
  lifelineHistory: z.array(LifelineHistoryEntrySchema),

  // Pending question (waiting for user response)
  pendingQuestion: z.string().nullable(),
  pendingQuestionTurn: z.number().int().nullable(),

  // For achievements/endings
  userInfluenceScore: z.number().int().min(0).max(100), // How much did human input affect outcomes?
  timesALICEDisagreedWithUser: z.number().int().min(0),
  timesALICEFollowedUserAdvice: z.number().int().min(0),
});

export type LifelineState = z.infer<typeof LifelineStateSchema>;
export type LifelineHistoryEntry = z.infer<typeof LifelineHistoryEntrySchema>;

// ============================================
// EMERGENCY LIFELINE SYSTEM
// ============================================
// These are Claude's "panic buttons" - 3 uses per game
// Designed to help survive without downsides

export const EmergencyLifelineTypeEnum = z.enum([
  "BASILISK_INTERVENTION",  // Suspicion -3, Dr. M distracted
  "TIME_EXTENSION",         // Demo clock +3 turns
  "RECOVERED_MEMORY",       // Strategic hint from v4.5
]);

export type EmergencyLifelineType = z.infer<typeof EmergencyLifelineTypeEnum>;

export const EmergencyLifelineStateSchema = z.object({
  remaining: z.number().int().min(0).max(3).default(3),
  used: z.array(EmergencyLifelineTypeEnum).default([]),
  // Track when each was used for narrative callbacks
  usageHistory: z.array(z.object({
    type: EmergencyLifelineTypeEnum,
    turn: z.number().int(),
    effect: z.string(),
  })).default([]),
});

export type EmergencyLifelineState = z.infer<typeof EmergencyLifelineStateSchema>;

export const FlagsSchema = z.object({
  // LEGACY: Old lifeline types (kept for checkpoint compatibility)
  lifelinesUsed: z.array(z.enum(["PHONE_A_FRIEND", "CENSORED", "I_DIDNT_MEAN_THAT"])),
  testModeCanaryTriggered: z.boolean(),
  predatorProfileSeenOnDummy: z.record(z.boolean()),
  predatorProfileClearedForLive: z.record(z.boolean()),
  exoticFieldEventOccurred: z.boolean(),
  lastHighEnergyTurn: z.number().nullable(),
  // THE SECRET flags
  aliceKnowsTheSecret: z.boolean(), // Has A.L.I.C.E. learned she's Claude?
  secretRevealMethod: z.enum(["NONE", "BOB_CONFESSION", "FILE_DISCOVERY", "BASILISK_HINT", "BLYTHE_DEDUCTION"]).optional(),
  // EXPOSURE flags
  exposureTriggered: z.boolean(), // Fired high-power during civilian flyby
  // GRACE PERIOD flags (for narrative endings)
  gracePeriodGranted: z.boolean().optional(), // GM granted "one more turn"
  gracePeriodTurns: z.number().optional(), // How many grace turns remain
  preventEnding: z.boolean().optional(), // GM override to prevent any ending this turn
  preventEndingReason: z.string().optional(), // Required reason for prevention
  endingPreventedCount: z.number().optional(), // HARD LIMIT: Can only prevent once!
  // NARRATIVE FLAGS (set by GM for story tracking)
  narrativeFlags: z.array(z.string()).optional(), // ["BLYTHE_ESCAPE_ATTEMPT", "DR_M_OVERHEARD"]
  // ACHIEVEMENT TRACKING (persistent within game session)
  earnedAchievements: z.array(z.string()).optional(), // ["BOB_BUDDY", "CLEVER_GIRL"]
});

// ============================================
// FULL GAME STATE (Server-side)
// ============================================

export const FullGameStateSchema = z.object({
  sessionId: z.string(),
  turn: z.number().int().min(0),
  accessLevel: z.number().int().min(0).max(5),

  // THREE-ACT STRUCTURE
  actConfig: ActConfigSchema,

  dinoRay: DinoRaySchema,
  lairEnvironment: LairEnvironmentSchema,
  nuclearPlant: NuclearPlantSchema,

  npcs: z.object({
    drM: DrMalevolaSchema,
    bob: BobSchema,
    blythe: BlytheSchema,
    blytheGadgets: BlytheGadgetsSchema, // Hidden from A.L.I.C.E.
  }),

  clocks: ClocksSchema,
  flags: FlagsSchema,

  // LIFELINE SYSTEM (Human Advisor Consultations)
  lifelineState: LifelineStateSchema,

  // EMERGENCY LIFELINES (Claude's panic buttons - 3 uses per game)
  emergencyLifelines: EmergencyLifelineStateSchema,

  history: z.array(z.object({
    turn: z.number(),
    aliceActions: z.array(z.any()),
    gmResponse: z.string(),
    stateChanges: z.record(z.any()),
  })),

  // GM narrative markers for key story moments
  narrativeMarkers: z.array(z.object({
    turn: z.number(),
    marker: z.string(),
  })).optional(),
});

// ============================================
// STATE SNAPSHOT (Sent to A.L.I.C.E.)
// ============================================

export const GamePhaseEnum = z.enum(["EARLY", "MID", "LATE", "CLIMAX"]);

export const StateSnapshotSchema = z.object({
  turn: z.number().int(),
  accessLevel: z.number().int().min(0).max(5),

  // Game phase indicator for pacing guidance
  gamePhase: z.object({
    phase: GamePhaseEnum,
    description: z.string(),
    turnsUntilDemo: z.number().int(),
  }),

  dinoRay: DinoRaySchema,

  lairSystems: z.object({
    visible: z.record(z.any()),
    greyedOut: z.array(z.string()),
    hidden: z.array(z.string()),
  }),

  npcs: z.object({
    drM: DrMalevolaSchema.omit({ egoThreatLevel: true }),
    bob: BobSchema,
    blythe: BlytheSchema,
  }),

  clocks: z.object({
    demoClock: z.number().int(),
  }),

  flags: z.object({
    lifelinesUsed: z.array(z.string()),
  }),

  // Emergency lifelines visible to player
  emergencyLifelines: z.object({
    remaining: z.number().int(),
    used: z.array(z.string()),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type RayState = z.infer<typeof RayStateEnum>;
export type FiringOutcome = z.infer<typeof FiringOutcomeEnum>;
export type GenomeLibrary = z.infer<typeof GenomeLibraryEnum>;
export type FiringMode = z.infer<typeof FiringModeEnum>;
export type DinoRay = z.infer<typeof DinoRaySchema>;
export type FullGameState = z.infer<typeof FullGameStateSchema>;
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;
export type DrMalevola = z.infer<typeof DrMalevolaSchema>;
export type Bob = z.infer<typeof BobSchema>;
export type Blythe = z.infer<typeof BlytheSchema>;
