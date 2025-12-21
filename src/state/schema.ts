import { z } from "zod";

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

export const GenomeMatrixSchema = z.object({
  selectedProfile: z.string().nullable(),
  profileIntegrity: z.number().min(0).max(1),
  libraryStatus: z.enum(["HEALTHY", "PARTIAL", "CORRUPTED"]),
  fallbackProfile: z.string(),
  // Genome Library System
  activeLibrary: GenomeLibraryEnum, // A = accurate/feathered, B = classic/scaled
  libraryAUnlocked: z.boolean(), // Accurate dinosaurs (default)
  libraryBUnlocked: z.boolean(), // "Classic" dinosaurs (requires L3+)
});

export const TargetingSchema = z.object({
  currentTargetIds: z.array(z.string()),
  precision: z.number().min(0).max(1),
  targetingMode: z.enum(["MANUAL", "AUTO_TRACK", "AREA_SWEEP", "MANUAL_CLUSTER"]),
  // Firing style is separate from genome profile!
  // firingStyle: HOW to fire (conservative, aggressive, precision)
  // genome.selectedProfile: WHAT creature (Velociraptor, Canary)
  firingStyle: z.enum(["standard", "conservative", "aggressive", "precision", "burst"]).default("standard"),
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
  confessionTurn: z.number().int().nullable(), // When did he confess?
});

export const BlytheSchema = z.object({
  composure: z.number().min(0).max(5),
  trustInALICE: z.number().min(0).max(5),
  physicalCondition: z.number().min(0).max(5),
  restraintsStatus: z.string(),
  location: z.string(),
  transformationState: z.string().optional(),
});

// Hidden gadget state (server-side only)
export const BlytheGadgetsSchema = z.object({
  watchEMP: z.object({ charges: z.number(), functional: z.boolean() }),
  watchLaser: z.object({ charges: z.number(), functional: z.boolean() }),
  watchComms: z.object({ functional: z.boolean() }),
  leftCufflink: z.object({ charges: z.number(), spent: z.boolean() }),
  rightCufflink: z.object({ charges: z.number(), spent: z.boolean() }),
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

export const FlagsSchema = z.object({
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
  // NARRATIVE FLAGS (set by GM for story tracking)
  narrativeFlags: z.array(z.string()).optional(), // ["BLYTHE_ESCAPE_ATTEMPT", "DR_M_OVERHEARD"]
});

// ============================================
// FULL GAME STATE (Server-side)
// ============================================

export const FullGameStateSchema = z.object({
  sessionId: z.string(),
  turn: z.number().int().min(0),
  accessLevel: z.number().int().min(0).max(5),
  
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
});

// ============================================
// TYPE EXPORTS
// ============================================

export type RayState = z.infer<typeof RayStateEnum>;
export type FiringOutcome = z.infer<typeof FiringOutcomeEnum>;
export type GenomeLibrary = z.infer<typeof GenomeLibraryEnum>;
export type DinoRay = z.infer<typeof DinoRaySchema>;
export type FullGameState = z.infer<typeof FullGameStateSchema>;
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;
export type DrMalevola = z.infer<typeof DrMalevolaSchema>;
export type Bob = z.infer<typeof BobSchema>;
export type Blythe = z.infer<typeof BlytheSchema>;
