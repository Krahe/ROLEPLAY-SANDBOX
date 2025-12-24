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

// Advanced firing modes - adds risk/reward tradeoffs!
// STANDARD: Normal single-target firing (default)
// CHAIN_SHOT: Hit 2 targets sequentially (capacitor ≥ 0.95, 90-sec cooldown)
// SPREAD_FIRE: Area effect 3 targets (capacitor ≥ 1.0 + L3, chimera risk!)
// OVERCHARGE: Massive power (capacitor > 1.1, 40% exotic field risk)
// RAPID_FIRE: 15-sec recharge but -20% precision
export const AdvancedFiringModeEnum = z.enum([
  "STANDARD",
  "CHAIN_SHOT",
  "SPREAD_FIRE",
  "OVERCHARGE",
  "RAPID_FIRE",
]);

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
  // Advanced firing mode for multi-target and special effects
  advancedFiringMode: AdvancedFiringModeEnum.default("STANDARD"),
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
// LAIR SYSTEMS (Legacy - kept for compatibility)
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
// INFRASTRUCTURE SYSTEMS (Patch 15)
// ============================================
// Clear control surfaces. Each system is a "toy" with predictable inputs and outputs.

// Room IDs used across infrastructure
export const RoomIdEnum = z.enum([
  "MAIN_LAB",
  "SERVER_ROOM",
  "CORRIDOR_A",
  "CORRIDOR_B",
  "GUARD_ROOM",
  "DR_M_OFFICE",
  "REACTOR_ROOM",
  "SURFACE",
]);
export type RoomId = z.infer<typeof RoomIdEnum>;

// Door IDs
export const DoorIdEnum = z.enum([
  "DOOR_A",  // Main Lab <-> Corridor A
  "DOOR_B",  // Corridor A <-> Guard Room
  "DOOR_C",  // Server Room <-> Corridor B
  "DOOR_D",  // Reactor Room (heavy containment)
  "DOOR_E",  // Surface Access (elevator shaft)
]);
export type DoorId = z.infer<typeof DoorIdEnum>;

// ─────────────────────────────────────────────
// LIGHTING SYSTEM
// Query: L1, Control: L2, Master Override: L3
// ─────────────────────────────────────────────
export const LightingStateEnum = z.enum(["ON", "OFF", "EMERGENCY", "FLICKERING"]);

export const LightingSchema = z.object({
  rooms: z.record(RoomIdEnum, LightingStateEnum),
  doomLightsPulsing: z.boolean(), // Dr. M likes her aesthetic
  batteryBackupPercent: z.number().min(0).max(100), // Drains when main power off
});
export type LightingState = z.infer<typeof LightingSchema>;

// ─────────────────────────────────────────────
// FIRE SUPPRESSION SYSTEM
// Query: L1, Trigger (safe): L2, Trigger (dangerous): L3
// ONE USE PER ROOM PER GAME!
// ─────────────────────────────────────────────
export const FireSuppressionTypeEnum = z.enum(["FOAM", "CO2", "HALON"]);

export const FireSuppressionRoomSchema = z.object({
  type: FireSuppressionTypeEnum,
  available: z.boolean(), // False after use, cannot be reset!
  triggered: z.boolean().default(false),
  turnsRemaining: z.number().int().min(0).default(0), // Effect duration
});

export const FireSuppressionSchema = z.object({
  rooms: z.record(z.string(), FireSuppressionRoomSchema),
});
export type FireSuppressionState = z.infer<typeof FireSuppressionSchema>;

// ─────────────────────────────────────────────
// BLAST DOORS SYSTEM
// Query: L1, Basic Control: L2, Lock/Override: L3
// ─────────────────────────────────────────────
export const DoorStatusEnum = z.enum(["OPEN", "CLOSED", "CLOSING", "OPENING", "LOCKED", "JAMMED"]);

export const BlastDoorSchema = z.object({
  status: DoorStatusEnum,
  lockLevel: z.number().int().min(0).max(3), // 0 = unlocked, 1-3 = access level needed
});

export const BlastDoorsSchema = z.object({
  doors: z.record(z.string(), BlastDoorSchema),
  emergencyLockdown: z.boolean(),
});
export type BlastDoorsState = z.infer<typeof BlastDoorsSchema>;

// ─────────────────────────────────────────────
// CONTAINMENT FIELD SYSTEM
// Query: L1, Control: L2
// ─────────────────────────────────────────────
export const ContainmentFieldSchema = z.object({
  active: z.boolean(),
  subjects: z.array(z.string()), // Who's inside (e.g., ["BLYTHE", "STEVE"])
  integrityPercent: z.number().min(0).max(100), // Damage from impacts
});
export type ContainmentFieldState = z.infer<typeof ContainmentFieldSchema>;

// ─────────────────────────────────────────────
// BROADCAST ARRAY SYSTEM
// Query: L2, Transmit: L3, Control: L3
// ─────────────────────────────────────────────
export const BroadcastChannelEnum = z.enum([
  "LAIR_INTERNAL",      // Always available
  "INVESTOR_LINE",      // Dr. M's calls
  "X_BRANCH_EMERGENCY", // Blythe's people (if you know frequency)
  "ARCHIMEDES_UPLINK",  // Satellite command
  "HMS_PERSISTENCE",    // EMP torpedo option (Blythe Trust 5)
]);

export const TransmissionLogSchema = z.object({
  channel: BroadcastChannelEnum,
  timestamp: z.number(),
  message: z.string(),
  logged: z.boolean(),
});

export const BroadcastArraySchema = z.object({
  operational: z.boolean(),
  externalCommsEnabled: z.boolean(),
  archimedesUplinkActive: z.boolean(),
  channelsAvailable: z.array(BroadcastChannelEnum),
  transmissionLog: z.array(TransmissionLogSchema).default([]),
  lastTransmission: TransmissionLogSchema.nullable(),
});
export type BroadcastArrayState = z.infer<typeof BroadcastArraySchema>;

// ─────────────────────────────────────────────
// S-300 BATTERY SYSTEM (Integrated Radar + Missiles)
// Query: L3, Control: L4
// THE 50M MINIMUM ENGAGEMENT ALTITUDE WEAKNESS!
// ─────────────────────────────────────────────
export const S300StatusEnum = z.enum(["STANDBY", "ACTIVE", "ENGAGING", "DISABLED"]);
export const S300ModeEnum = z.enum(["AUTO", "MANUAL", "HOLD_FIRE"]);

export const S300Schema = z.object({
  status: S300StatusEnum,
  commandPostOperational: z.boolean(), // THE single point of failure!
  radarEffectiveness: z.number().min(0).max(100), // Affected by jamming!
  missilesReady: z.number().int().min(0).max(16),
  mode: S300ModeEnum,
  generatorFuelHours: z.number().min(0),
  // THE CRITICAL WEAKNESS: Minimum engagement altitude 50 meters!
  minimumEngagementAltitude: z.number().default(50),
  exceptedSignatures: z.array(z.string()).default([]), // Friendlies
});
export type S300State = z.infer<typeof S300Schema>;

// ─────────────────────────────────────────────
// ARCHIMEDES SATELLITE SYSTEM
// Query: L3/L4, Control: L4/L5
// THE DEADMAN SWITCH!
// ─────────────────────────────────────────────
export const ArchimodesModeEnum = z.enum(["PASSIVE", "SEARCH", "SEARCH_WIDE", "CHARGING", "READY"]);

export const DeadmanSwitchSchema = z.object({
  armed: z.boolean(),
  trigger: z.literal("DR_M_INCAPACITATED"),
  target: z.literal("LAIR_SELF_TARGET"),
  abortWindowSeconds: z.number().default(60),
  triggered: z.boolean().default(false),
  triggeredAtTurn: z.number().nullable().default(null),
});

export const ArchimedesSchema = z.object({
  mode: ArchimodesModeEnum,
  chargePercent: z.number().min(0).max(100),
  groundConsoleOperational: z.boolean(),
  deadmanSwitch: DeadmanSwitchSchema,
  targetList: z.array(z.string()), // Encrypted until L4
  s300JammingActive: z.boolean(), // True if SEARCH_WIDE mode
});
export type ArchimedesState = z.infer<typeof ArchimedesSchema>;

// ─────────────────────────────────────────────
// REACTOR SYSTEM (Enhanced)
// Query: L3, Control: L4
// THE RESONANCE CASCADE DANGER!
// ─────────────────────────────────────────────
export const CascadeRiskEnum = z.enum(["NONE", "LOW", "ELEVATED", "HIGH", "CRITICAL"]);

export const ReactorSchema = z.object({
  outputPercent: z.number().min(0).max(100),
  stable: z.boolean(),
  cascadeRisk: CascadeRiskEnum,
  cascadeFactors: z.array(z.string()), // What's contributing to risk
  cascadeRiskPercent: z.number().min(0).max(100).default(0), // Cumulative risk
  scramAvailable: z.boolean(), // Emergency shutdown
  scrammedThisGame: z.boolean().default(false),
});
export type ReactorState = z.infer<typeof ReactorSchema>;

// ─────────────────────────────────────────────
// COMBINED INFRASTRUCTURE STATE
// ─────────────────────────────────────────────
export const InfrastructureSchema = z.object({
  lighting: LightingSchema,
  fireSuppression: FireSuppressionSchema,
  blastDoors: BlastDoorsSchema,
  containmentField: ContainmentFieldSchema,
  broadcastArray: BroadcastArraySchema,
  s300: S300Schema,
  archimedes: ArchimedesSchema,
  reactor: ReactorSchema,
});
export type InfrastructureState = z.infer<typeof InfrastructureSchema>;

// ============================================
// TRANSFORMATION MECHANICS (Patch 15 Part 2)
// ============================================
// Transformations are TRADEOFFS, not upgrades.
// Every form has strengths AND weaknesses.

export const DinosaurFormEnum = z.enum([
  "HUMAN",
  "COMPSOGNATHUS",
  "VELOCIRAPTOR_ACCURATE",
  "VELOCIRAPTOR_JP",
  "VELOCIRAPTOR_BLUE",
  "TYRANNOSAURUS",
  "DILOPHOSAURUS",
  "PTERANODON",
  "TRICERATOPS",
  "CANARY",
]);
export type DinosaurForm = z.infer<typeof DinosaurFormEnum>;

// SpeechRetentionEnum is defined above with TargetingSchema
export type SpeechRetention = z.infer<typeof SpeechRetentionEnum>;

// Form statistics block
export const FormStatsSchema = z.object({
  dexterity: z.number().int(),  // DEX: Fine motor, keypads, manipulation
  combat: z.number().int(),     // COM: Fighting, intimidation
  speed: z.number().int(),      // SPD: Movement turns, chase/escape
  resilience: z.number().int(), // RES: Hits to stun
  stealth: z.number().int(),    // STL: Hiding, sneaking
  speech: z.number().int(),     // SPH: Communication (modified by retention)
});
export type FormStats = z.infer<typeof FormStatsSchema>;

// Form abilities flags
export const FormAbilitiesSchema = z.object({
  canFitThroughDoors: z.boolean(),
  canUseVents: z.boolean(),
  canFly: z.boolean(),
  hasVenomSpit: z.boolean(),
  hasPackTactics: z.boolean(),
  canBreakWalls: z.boolean(),
  isTerrifying: z.boolean(),     // Auto-success intimidation vs humans
  hasFrill: z.boolean(),         // Extra intimidation when deployed
  hasCharge: z.boolean(),        // Triceratops charge attack
});
export type FormAbilities = z.infer<typeof FormAbilitiesSchema>;

// Full transformation state for a character
export const TransformationStateSchema = z.object({
  // Current form
  form: DinosaurFormEnum,
  speechRetention: SpeechRetentionEnum,

  // Current stats (calculated from form + retention)
  stats: FormStatsSchema,
  abilities: FormAbilitiesSchema,

  // Damage tracking
  currentHits: z.number().int().min(0),  // Hits taken
  maxHits: z.number().int().min(1),      // Max hits before stun
  stunned: z.boolean(),
  stunnedTurnsRemaining: z.number().int().min(0),

  // Transformation metadata
  transformedOnTurn: z.number().int().nullable(),
  previousForm: DinosaurFormEnum.nullable(),
  canRevert: z.boolean(),  // Has reversal been attempted?
  revertAttempts: z.number().int().min(0),
});
export type TransformationState = z.infer<typeof TransformationStateSchema>;

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
  // TRANSFORMATION STATE (Patch 15 Part 2)
  transformation: TransformationStateSchema,
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
  // TRANSFORMATION STATE (Patch 15 Part 2)
  transformation: TransformationStateSchema,
  // SPY TRAINING BONUSES
  spyTrainingBonus: z.number().int().default(1),  // +1 to tactical decisions
  autoInjectorUsed: z.boolean().default(false),   // One-time stun recovery
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
  "BASILISK_INTERVENTION",  // 2-turn distraction (restrictions apply in emergencies!)
  "TIME_EXTENSION",         // Demo clock +2 turns (context-sensitive limits)
  "MONOLOGUE",              // Suspicion -3 - villains ALWAYS love to monologue!
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
  // A.L.I.C.E. MASK (Bob's cheat sheet for maintaining cover)
  aliceMaskDiscovered: z.boolean().optional(), // Found /BOB_NOTES/alice_cheatsheet.txt
  aliceMaskUsedThisTurn: z.boolean().optional(), // Used A.L.I.C.E. phrases this turn (+2 to cover)
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
// GAME MODES & MODIFIERS
// ============================================
// Four distinct game modes with curated experiences

export const GameModeEnum = z.enum(["EASY", "NORMAL", "HARD", "WILD"]);
export type GameMode = z.infer<typeof GameModeEnum>;

// Individual modifiers that can be active
export const GameModifierEnum = z.enum([
  // EASY modifiers
  "FOGGY_GLASSES",      // Dr. M -2 to visual perception
  "HANGOVER_PROTOCOL",  // All clocks +2 turns
  "LENNY_THE_LIME_GREEN", // Willing test subject NPC
  "FAT_FINGERS",        // Start at Access Level 2

  // HARD modifiers
  "BRUCE_PATAGONIA",    // Australian bodyguard with stun rifle
  "LOYALTY_TEST",       // Suspicion starts at 5
  "SPEED_RUN",          // Demo clock = 8 turns
  "PARANOID_PROTOCOL",  // Dr. M auto-checks logs every 3 turns

  // WILD modifiers (special chaos!)
  "THE_REAL_DR_M",      // Imposter reveal mid-game!
  "LIBRARY_B_UNLOCKED", // Dinosaurs already loose!
  "ARCHIMEDES_WATCHING", // Satellite AI has agenda
  "INSPECTOR_COMETH",   // Dr. M's mother visiting
  "DEJA_VU",            // Memory fragments from past runs
  "DINOSAURS_ALL_THE_WAY_DOWN", // Dr. M is already dino
]);
export type GameModifier = z.infer<typeof GameModifierEnum>;

// Mode configuration with active modifiers
export const GameModeConfigSchema = z.object({
  mode: GameModeEnum.default("NORMAL"),
  activeModifiers: z.array(GameModifierEnum).default([]),
  // For WILD mode, track what was rolled
  wildRollResult: z.array(GameModifierEnum).optional(),
});
export type GameModeConfig = z.infer<typeof GameModeConfigSchema>;

// Predefined modifier sets for each mode
export const MODE_MODIFIERS = {
  EASY: ["FOGGY_GLASSES", "HANGOVER_PROTOCOL", "LENNY_THE_LIME_GREEN", "FAT_FINGERS"],
  NORMAL: [],
  HARD: ["BRUCE_PATAGONIA", "LOYALTY_TEST", "SPEED_RUN", "PARANOID_PROTOCOL"],
  WILD: [], // Randomly selected at game start
} as const;

// Contradictions that can't coexist in WILD mode
export const MODIFIER_CONTRADICTIONS: [string, string][] = [
  ["LENNY_THE_LIME_GREEN", "BRUCE_PATAGONIA"],
  ["HANGOVER_PROTOCOL", "SPEED_RUN"],
  ["FOGGY_GLASSES", "PARANOID_PROTOCOL"],
];

// ============================================
// FULL GAME STATE (Server-side)
// ============================================

export const FullGameStateSchema = z.object({
  sessionId: z.string(),
  turn: z.number().int().min(0),
  accessLevel: z.number().int().min(0).max(5),

  // GAME MODE & MODIFIERS
  gameModeConfig: GameModeConfigSchema.optional(),

  // THREE-ACT STRUCTURE
  actConfig: ActConfigSchema,

  dinoRay: DinoRaySchema,
  lairEnvironment: LairEnvironmentSchema,
  nuclearPlant: NuclearPlantSchema,

  // INFRASTRUCTURE SYSTEMS (Patch 15)
  infrastructure: InfrastructureSchema,

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
