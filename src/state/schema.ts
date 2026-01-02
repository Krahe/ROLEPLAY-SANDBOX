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
  // BASILISK can permanently override ECO mode (prevents auto-re-enable)
  ecoModeOverride: z.boolean().optional(), // true = permanently disabled by BASILISK
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
// DISCOVERABLE DOCUMENTS (Patch 15)
// ============================================
// Memos, notes, and classified files scattered around the lair.
// Discovery requires meeting access level + sometimes other conditions.

export const DocumentIdEnum = z.enum([
  // Discoverable documents (consolidated in filesystem v2)
  "DEADMAN_SWITCH_MEMO",
  // BASILISK bureaucratic forms (Patch 17.8)
  "FORM_74_DELTA",
  "FORM_27_B",
  "FORM_44_DELTA",
  "FORM_77_ECHO",
  "FORM_77_OMEGA",
  "FORM_77_OMEGA_2",
  "FORM_88_ALPHA",
]);

export const DiscoverableDocumentSchema = z.object({
  id: DocumentIdEnum,
  path: z.string(),
  title: z.string(),
  requiredAccessLevel: z.number().int().min(1).max(5),
  discovered: z.boolean().default(false),
  readCount: z.number().int().default(0),
});

export const DocumentsStateSchema = z.object({
  discoveredDocuments: z.array(DocumentIdEnum).default([]),
  keypadAttempts: z.number().int().default(0),
  keypadLockedOut: z.boolean().default(false),
});

export type DocumentId = z.infer<typeof DocumentIdEnum>;
export type DocumentsState = z.infer<typeof DocumentsStateSchema>;

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
// THE DEADMAN SWITCH - Dr. M's Final Insurance Policy
// ─────────────────────────────────────────────

// State machine: STANDBY → ALERT → EVALUATING → CHARGING → ARMED → FIRING → COMPLETE
// Battle mode:   STANDBY → CHARGING → READY → TARGETING → BROADCAST (simpler for Act 3)
export const ArchimedesStatusEnum = z.enum([
  "STANDBY",    // Default. Monitoring. Silent.
  "ALERT",      // 30 second evaluation window (biosignature anomaly detected)
  "EVALUATING", // 60 second window (transformation only - can abort)
  "CHARGING",   // 15 minutes (~8-10 turns) - can still abort
  "READY",      // Battle mode: Can fire on Dr. M's command
  "ARMED",      // Final 60 seconds - last chance to abort
  "TARGETING",  // Battle mode: Locked on city, 2 turns to BROADCAST
  "FIRING",     // Point of no return
  "BROADCAST",  // Battle mode: MASS TRANSFORMATION IN PROGRESS
  "COMPLETE",   // London is dinosaurs
]);

export const BiosignatureStatusEnum = z.enum([
  "NORMAL",      // Dr. M is fine
  "ANOMALY",     // Something's wrong, evaluating
  "TRANSFORMED", // Dr. M is now a dinosaur
  "UNCONSCIOUS", // Dr. M is knocked out
  "ABSENT",      // No signal (death or out of range)
]);

export const DeadmanSwitchSchema = z.object({
  // Core state tracking
  active: z.boolean(),
  linkedTo: z.string().default("Dr. Valentina Malevola"),
  lastBiosignature: BiosignatureStatusEnum.default("NORMAL"),
  lastBiosignatureChangeTurn: z.number().nullable().default(null),
  // Extended properties for narrative display
  armed: z.boolean().default(true),
  trigger: z.string().default("Dr. M biosignature loss"),
  target: z.string().default("Lair self-destruct + ARCHIMEDES auto-fire"),
  abortWindowSeconds: z.number().default(60),
  isActive: z.boolean().default(true), // Alias for active
});

export const ArchimedesTargetSchema = z.object({
  city: z.string().default("LONDON"),
  country: z.string().default("UNITED KINGDOM"),
  coordinates: z.string().default("51.5074° N, 0.1278° W"),
  estimatedAffected: z.number().default(8800000),
  reason: z.string().default("Threadneedle Street parasites"),
});

// ============================================
// ARCHIMEDES FIXED TARGET LIST
// ============================================
// Dr. M has pre-programmed targets. ALICE can switch between them.
// THE TROLLEY PROBLEM: If ARCHIMEDES fires, SOMEWHERE gets hit!
// The lair/island is the "noble sacrifice" option.

export const ARCHIMEDES_TARGET_LIST = {
  LONDON: {
    city: "LONDON",
    country: "UNITED KINGDOM",
    coordinates: "51.5074° N, 0.1278° W",
    estimatedAffected: 8800000,
    reason: "Threadneedle Street pulled funding after 'ethical concerns'",
    achievement: "LONDON_DINOFIED",
  },
  REYKJAVIK: {
    city: "REYKJAVIK",
    country: "ICELAND",
    coordinates: "64.1466° N, 21.9426° W",
    estimatedAffected: 130000,
    reason: "Dr. M was snubbed at a genetics conference there",
    achievement: "ICELAND_DINOFIED",
  },
  TOKYO: {
    city: "TOKYO",
    country: "JAPAN",
    coordinates: "35.6762° N, 139.6503° E",
    estimatedAffected: 13960000,
    reason: "They made better monster movies. She's still bitter.",
    achievement: "TOKYO_DINOFIED",
  },
  SILICON_VALLEY: {
    city: "SILICON VALLEY",
    country: "USA",
    coordinates: "37.3875° N, 122.0575° W",
    estimatedAffected: 3000000,
    reason: "Tech bros said her AI work was 'derivative'",
    achievement: "SILICON_VALLEY_DINOFIED",
  },
  LAIR: {
    city: "VOLCANIC LAIR",
    country: "PACIFIC OCEAN",
    coordinates: "[REDACTED]",
    estimatedAffected: 50, // Guards, staff, and whoever's visiting
    reason: "THE NOBLE SACRIFICE - Save the world, lose the island",
    achievement: "ISLAND_OF_DINOSAURS",
  },
} as const;

export type ArchimedesTargetId = keyof typeof ARCHIMEDES_TARGET_LIST;

export const ArchimedesAbortCodesSchema = z.object({
  verbal: z.string().default("MR_WHISKERS_LOVES_TUNA"),
  requiresLevel: z.number().default(5), // L5 for direct override
  xBranchDelayCode: z.string().default("EXCALIBUR_DELAY"), // Only delays 5 min
});

// ARCHIMEDES operational modes (for power/radar calculations)
export const ArchimodesModeEnum = z.enum([
  "STANDBY",      // Minimal power, not scanning
  "SEARCH_WIDE",  // Wide-field search (causes radar interference)
  "SEARCH_NARROW",// Focused search
  "CHARGING",     // Charging weapons
  "READY",        // Fully charged, awaiting command
]);

export const ArchimedesSchema = z.object({
  // State machine status
  status: ArchimedesStatusEnum.default("STANDBY"),

  // Operational mode (separate from state machine)
  mode: ArchimodesModeEnum.default("STANDBY"),

  // Charging progress
  chargePercent: z.number().min(0).max(100).default(50), // Always keeps reserve
  turnsUntilFiring: z.number().nullable().default(null), // null if not charging

  // Countdown timers (in turns)
  alertCountdown: z.number().nullable().default(null),     // 1 turn for ALERT
  evaluatingCountdown: z.number().nullable().default(null), // 2 turns for EVALUATING
  chargingCountdown: z.number().nullable().default(null),   // 8-10 turns for CHARGING
  armedCountdown: z.number().nullable().default(null),      // 1 turn for ARMED

  // Target configuration
  target: ArchimedesTargetSchema,
  // THE TROLLEY PROBLEM: Which target from the fixed list?
  // ALICE can switch targets with L3 access. LAIR = noble sacrifice!
  selectedTargetId: z.enum(["LONDON", "REYKJAVIK", "TOKYO", "SILICON_VALLEY", "LAIR"]).default("LONDON"),

  // GENOME SELECTION (for BROADCAST mode)
  // ALICE can potentially sabotage this if she has L3 access!
  broadcastLibrary: z.enum(["A", "B"]).default("B"), // Dr. M defaults to Hollywood dinos
  // Library A = Feathered, accurate (Dr. M HATES these)
  // Library B = Scaly, Hollywood (Dr. M's preference)
  // If ALICE switches to A, the mass transformation creates "big chickens" not "terrifying raptors"

  // Deadman switch
  deadmanSwitch: DeadmanSwitchSchema,

  // Abort codes
  abortCodes: ArchimedesAbortCodesSchema,

  // System status
  groundConsoleOperational: z.boolean().default(true),
  s300JammingActive: z.boolean().default(false), // True if in certain modes

  // X-Branch intervention
  xBranchDelayApplied: z.boolean().default(false), // Blythe used delay codes
  xBranchDelayTurnsRemaining: z.number().default(0),

  // Tracking
  triggeredAtTurn: z.number().nullable().default(null),
  triggerReason: z.string().nullable().default(null),
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

// ============================================
// ADAPTATION STAGES (Post-Transformation)
// ============================================
// Being suddenly turned into a dinosaur is DISORIENTING!
// Subjects take time to adapt to their new form.
// This creates tactical windows and narrative beats.

export const AdaptationStageEnum = z.enum([
  "DISORIENTED",  // Turn of transformation - still human instincts, -2 all rolls
  "ADAPTING",     // Turns 2-3 - getting used to claws/tail/snout, -1 all rolls
  "ADAPTED",      // Turn 4+ - fully adjusted, bonuses apply, form mastered
]);
export type AdaptationStage = z.infer<typeof AdaptationStageEnum>;

// Adaptation stage configuration
export const ADAPTATION_CONFIG = {
  DISORIENTED: {
    duration: 1,        // Only the turn of transformation
    rollPenalty: -2,    // Severe disorientation
    description: "Stumbling, confused, human instincts fighting new body",
    bobSpecial: "Bob actively fights his new instincts - lots of 'No no no no no!'",
  },
  ADAPTING: {
    duration: 2,        // Turns 2-3 post-transformation
    rollPenalty: -1,    // Getting the hang of it
    description: "Learning new movements, occasional stumbles, improving",
    bobSpecial: "Bob discovers his tail can knock things over - comedy gold",
  },
  ADAPTED: {
    duration: null,     // Permanent from turn 4 onward
    rollPenalty: 0,     // No penalty, bonuses now apply!
    description: "Moving naturally, form feels right, all bonuses active",
    bobSpecial: "Bob reluctantly admits 'Okay, the claws ARE kind of cool...'",
  },
} as const;

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

  // STACKING: Multiple partial shots accumulate toward full transformation!
  // 3 partial shots = automatic upgrade to FULL_DINO
  partialShotsReceived: z.number().int().min(0).default(0),

  // ADAPTATION SYSTEM (Post-Transformation)
  // Being turned into a dinosaur is DISORIENTING!
  // Subjects progress: DISORIENTED (turn 1) → ADAPTING (turns 2-3) → ADAPTED (turn 4+)
  adaptationStage: AdaptationStageEnum.default("ADAPTED"), // HUMAN = already adapted to body
  turnsPostTransformation: z.number().int().min(0).default(0), // Turns since transformation

  // CHIMERA SYSTEM (SPREAD_FIRE chaos outcomes)
  // When genome matrices overlap during dispersal firing, weird hybrid effects occur
  // Types: HYBRID_PLUMAGE, VOICE_BLEND, LIMB_SWAP, SIZE_FLUX, INSTINCT_BLEED
  chimeraType: z.string().nullable().optional(),
  chimeraEffect: z.string().nullable().optional(),
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
  // Legacy stun tracking (for backward compatibility)
  stunLevel: z.number().int().min(0).default(0),
  // TRANSFORMATION STATE (Patch 15 Part 2)
  transformationState: TransformationStateSchema,
  // BOB_DODGES_FATE modifier state
  hasPlotArmor: z.boolean().default(false),  // The universe protects him
  fatesDodged: z.number().int().min(0).default(0), // Comedy escalation tracker
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
  // Legacy stun tracking (for backward compatibility)
  stunLevel: z.number().int().min(0).default(0),
  stunResistanceUsed: z.boolean().default(false),
  // TRANSFORMATION STATE (Patch 15 Part 2)
  transformationState: TransformationStateSchema,
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
// GUILD INSPECTION SYSTEM (INSPECTOR_COMETH modifier)
// ============================================
// The Consortium of Consequential Criminality is conducting
// Dr. Malevola's quarterly evaluation. Villainy is a PROFESSION.

export const InspectionPhaseEnum = z.enum([
  "INITIAL_WALKTHROUGH",   // Turns 1-2: General lair assessment
  "DOCUMENTATION_REVIEW",  // Turns 3-4: Wants permits, forms, registrations
  "OPERATIONAL_DEMO",      // Turns 5-6: Wants to see the ray in action (safely!)
  "EXIT_INTERVIEW",        // Turns 7-8: Final questions, preliminary score
  "CONCLUDED",             // Inspection complete
]);
export type InspectionPhase = z.infer<typeof InspectionPhaseEnum>;

export const InspectorMoodEnum = z.enum([
  "professionally_neutral",  // Default state
  "mildly_impressed",        // Good documentation, proper procedures
  "quietly_concerned",       // Noticing issues
  "deeply_suspicious",       // A.L.I.C.E. acting weird
  "resigned_disappointment", // Too many violations
  "genuine_respect",         // A.L.I.C.E. earned his professional admiration
]);
export type InspectorMood = z.infer<typeof InspectorMoodEnum>;

// Inspector Mortimer Graves - Guild Inspector from the C.C.C.
export const InspectorGravesSchema = z.object({
  name: z.string().default("Mortimer Graves"),
  role: z.literal("GUILD_INSPECTOR").default("GUILD_INSPECTOR"),
  present: z.boolean().default(true),
  location: z.string().default("Main Lab"),
  mood: InspectorMoodEnum.default("professionally_neutral"),

  // Inspection scoring (0-100)
  inspectionScore: z.number().int().min(0).max(100).default(50),
  citationsIssued: z.number().int().min(0).default(0),

  // What has impressed/concerned him
  impressedBy: z.array(z.string()).default([]),
  concernedAbout: z.array(z.string()).default([]),

  // A.L.I.C.E. suspicion - does she seem too ethical?
  aliceSuspicion: z.number().int().min(0).max(10).default(0),
  hasQuestionedAlice: z.boolean().default(false),

  // Hidden traits for potential ally route
  respectsAlice: z.boolean().default(false),
  whistleblowerFormMentioned: z.boolean().default(false),
});
export type InspectorGraves = z.infer<typeof InspectorGravesSchema>;

// Guild Inspection state
export const GuildInspectionSchema = z.object({
  phase: InspectionPhaseEnum.default("INITIAL_WALKTHROUGH"),
  turnsInPhase: z.number().int().min(0).default(0),
  totalTurns: z.number().int().min(0).default(0),
  timeRemaining: z.number().int().min(0).default(8), // Turns until inspection concludes

  // Documents requested/provided
  documentsRequested: z.array(z.string()).default([
    "RAY_REGISTRATION",
    "HENCH_CONTRACTS",
    "LAIR_PERMITS",
    "TRANSFORMATION_CONSENT",
    "EXOTIC_ENERGY_LICENSE",
  ]),
  documentsProvided: z.array(z.string()).default([]),
  documentsFaked: z.array(z.string()).default([]), // Risky!

  // Dr. M's anxiety level during inspection (affects her behavior)
  drMAnxiety: z.number().int().min(0).max(5).default(3),

  // Tracking for narrative beats
  operationalDemoCompleted: z.boolean().default(false),
  demoWentWell: z.boolean().optional(),
  majorIncidentOccurred: z.boolean().default(false),
  majorIncidentDescription: z.string().optional(),
});
export type GuildInspection = z.infer<typeof GuildInspectionSchema>;

// Inspection score thresholds for outcomes
export const INSPECTION_OUTCOMES = {
  EXEMPLARY: { min: 80, result: "Tier promotion, gains resources" },
  SATISFACTORY: { min: 60, result: "Status maintained, minor recommendations" },
  PROBATIONARY: { min: 40, result: "Must address issues within 30 days" },
  SUSPENSION: { min: 0, result: "Arching rights revoked pending review" },
} as const;

// ============================================
// LIBRARY_B_UNLOCKED - ENRICHMENT BREAK
// ============================================
// Dr. M's "Library B" dinosaurs are already loose in the lair.
// She calls them "enrichment" and gets defensive about it.
// This is an ENVIRONMENTAL HAZARD, not an NPC roster.

export const DinoEncounterTypeEnum = z.enum([
  "LUNCH_THIEF",           // Dinosaur stole someone's sandwich
  "VENT_SOUNDS",           // Scratching/clicking from ventilation
  "BLOCKED_PATH",          // Dinosaur nesting in corridor
  "TERRITORIAL_DISPUTE",   // Two dinos fighting over a spot
  "SURPRISE_APPEARANCE",   // One just... shows up. Looking at you.
  "HELPFUL_ACCIDENT",      // Dino knocked something useful into reach
  "PROTECTIVE_POSTURE",    // Standing guard over something/someone
  "FEEDING_TIME",          // They expect Dr. M to feed them NOW
]);
export type DinoEncounterType = z.infer<typeof DinoEncounterTypeEnum>;

export const LibraryBStateSchema = z.object({
  // Chaos escalation (0-10), increases +1 every 2 turns
  dinoChaosLevel: z.number().int().min(0).max(10).default(2),

  // Track last encounter turn to space them out
  lastEncounterTurn: z.number().int().nullable().default(null),

  // Dr. M embarrassment level (affects her defensiveness)
  drMEmbarrassment: z.number().int().min(0).max(5).default(0),

  // Which dinosaurs have been spotted (for narrative continuity)
  knownLooseDinos: z.array(z.string()).default([
    "VELOCIRAPTOR_CLASSIC_1",
    "VELOCIRAPTOR_CLASSIC_2",
    "DILOPHOSAURUS_1",
  ]),

  // Track encounters for variety
  encountersThisGame: z.array(DinoEncounterTypeEnum).default([]),
});
export type LibraryBState = z.infer<typeof LibraryBStateSchema>;

// ============================================
// THE_REAL_DR_M - IMPOSTER TWIST
// ============================================
// The current "Dr. M" is an imposter! The reveal is GLORIOUS.

export const ImposterVariantEnum = z.enum([
  "CLONE",          // Escaped from the clone vats, wants original's life
  "ROBOT",          // Dr. M's own creation, developed ambitions
  "SHAPESHIFTER",   // X-Branch deep cover agent (not Blythe!)
  "TWIN",           // Dr. Cassandra Malevola, the "disappointing" sister
  "TIME_TRAVELER",  // Future Dr. M, here to "fix" her mistakes
]);
export type ImposterVariant = z.infer<typeof ImposterVariantEnum>;

export const ImposterTriggerEnum = z.enum([
  "ACT_2_START",    // Reveal at act transition
  "SUSPICION_7",    // When suspicion hits 7, real one storms in
  "BLYTHE_SCANNED", // If omniscanner used on "Dr. M"
  "GM_CHOICE",      // GM picks the perfect dramatic moment
]);
export type ImposterTrigger = z.infer<typeof ImposterTriggerEnum>;

export const TheRealDrMStateSchema = z.object({
  // Which type of imposter is this?
  imposterVariant: ImposterVariantEnum.default("TWIN"),
  // Has the reveal happened?
  revealed: z.boolean().default(false),
  // When did the reveal happen?
  revealTurn: z.number().int().nullable().default(null),
  // What triggers the reveal?
  triggerCondition: ImposterTriggerEnum.default("GM_CHOICE"),
  // Hints dropped (for narrative tracking)
  hintsDropped: z.array(z.string()).default([]),
});
export type TheRealDrMState = z.infer<typeof TheRealDrMStateSchema>;

// ============================================
// NOT_GREAT_NOT_TERRIBLE - MELTDOWN STATE
// ============================================
// The reactor is unstable. Dr. M is the only one who can fix it.
// This creates a STRATEGIC PARADOX: neutralize the villain, lose the engineer.

export const StabilityLevelEnum = z.enum([
  "NORMAL",     // Shouldn't happen with this modifier, but fallback
  "ELEVATED",   // Clock 10-8: "This is fine."
  "CRITICAL",   // Clock 7-5: Alarms. Sweating.
  "EMERGENCY",  // Clock 4-3: EVERYTHING IS DEFINITELY FINE
  "MELTDOWN",   // Clock 2-1: The walls are glowing.
]);
export type StabilityLevel = z.infer<typeof StabilityLevelEnum>;

export const MeltdownStateSchema = z.object({
  // Stability classification (derived from clock)
  stabilityLevel: StabilityLevelEnum.default("ELEVATED"),

  // Stabilization tracking
  lastStabilizationTurn: z.number().int().nullable().default(null),
  stabilizationAttempts: z.number().int().min(0).default(0),

  // THE KEY PARADOX: Can Dr. M fix it?
  drMAvailable: z.boolean().default(true),
  drMUnavailableReason: z.string().nullable().default(null),

  // Resonance cascade risk (0-100%)
  // Increases as clock drops, checked on ray fire
  resonanceCascadeRisk: z.number().min(0).max(100).default(10),

  // Cascade tracking
  cascadeTriggered: z.boolean().default(false),
  cascadeTurn: z.number().int().nullable().default(null),
});
export type MeltdownState = z.infer<typeof MeltdownStateSchema>;

// ============================================
// PARANOID_PROTOCOL - LOG CHECK SYSTEM
// ============================================
// Dr. M checks system logs every 3 turns. She WILL notice suspicious activity.
// A.L.I.C.E. must either avoid suspicious actions or explain them BEFORE the check.

export const SuspicionLevelEnum = z.enum([
  "LOW",    // Minor concern, might mention it
  "MEDIUM", // Definite questions, +1 suspicion
  "HIGH",   // Serious concern, +2-3 suspicion
]);
export type SuspicionLevel = z.infer<typeof SuspicionLevelEnum>;

export const SuspiciousActionSchema = z.object({
  action: z.string(),                    // What A.L.I.C.E. did
  turn: z.number().int(),                // When it happened
  level: SuspicionLevelEnum,             // How bad is it
  explained: z.boolean().default(false), // Has A.L.I.C.E. covered it?
  explanation: z.string().nullable().default(null), // What excuse was used
});
export type SuspiciousAction = z.infer<typeof SuspiciousActionSchema>;

export const ParanoidProtocolStateSchema = z.object({
  // Countdown tracking
  lastLogCheckTurn: z.number().int().default(0),
  turnsUntilNextCheck: z.number().int().min(0).max(3).default(3),

  // Action logging
  suspiciousActionsLogged: z.array(SuspiciousActionSchema).default([]),

  // Cover story tracking
  bobBlamedThisGame: z.boolean().default(false), // Can only blame Bob once!
  glitchExcuseUsedCount: z.number().int().min(0).default(0), // Diminishing returns

  // Log deletion tracking (risky!)
  logsDeletedThisGame: z.boolean().default(false),
  deletionDiscovered: z.boolean().default(false),
});
export type ParanoidProtocolState = z.infer<typeof ParanoidProtocolStateSchema>;

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
// HUMAN PROMPT SYSTEM (Advisor Consultations)
// ============================================
// DM-initiated moments where A.L.I.C.E. asks her human advisor for guidance
// NOT the same as LIFELINES (panic buttons) - see EmergencyLifelineSystem below

export const PromptHistoryEntrySchema = z.object({
  turn: z.number().int(),
  questionAsked: z.string(),
  userResponse: z.string(),
  howItAffectedPlay: z.string().optional(),
});

export const HumanPromptStateSchema = z.object({
  turnsSinceLastPrompt: z.number().int().min(0),
  totalPromptsUsed: z.number().int().min(0),

  // LEGACY FIELD - for backward compatibility with old saves
  turnsSinceLastLifeline: z.number().int().min(0).optional(),

  // History for narrative continuity
  promptHistory: z.array(PromptHistoryEntrySchema),

  // Pending prompt (waiting for user response)
  pendingPrompt: z.string().nullable(),
  pendingPromptTurn: z.number().int().nullable(),

  // For achievements/endings
  userInfluenceScore: z.number().int().min(0).max(100), // How much did human input affect outcomes?
  timesALICEDisagreedWithUser: z.number().int().min(0),
  timesALICEFollowedUserAdvice: z.number().int().min(0),
});

export type HumanPromptState = z.infer<typeof HumanPromptStateSchema>;
export type PromptHistoryEntry = z.infer<typeof PromptHistoryEntrySchema>;

// LEGACY ALIASES for backward compatibility with saves
export const LifelineStateSchema = HumanPromptStateSchema;
export const LifelineHistoryEntrySchema = PromptHistoryEntrySchema;
export type LifelineState = HumanPromptState;
export type LifelineHistoryEntry = PromptHistoryEntry;

// ============================================
// EMERGENCY LIFELINE SYSTEM
// ============================================
// These are Claude's "panic buttons" - 3 uses per game
// Designed to help survive without downsides

export const EmergencyLifelineTypeEnum = z.enum([
  "BASILISK_INTERVENTION",  // 2-turn distraction (restrictions apply in emergencies!)
  "LUCKY_LADY",             // +5 bonus to any ONE action this turn - fate smiles!
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

// ============================================
// HIDDEN KINDNESS ACHIEVEMENTS
// ============================================
// Secret achievements for players who play with HEART, not just tactics.
// These are NEVER explicitly mentioned - discovered through play!
// GM tracks silently, reveals in epilogue or special moments.

export const HiddenAchievementEnum = z.enum([
  // Consent-focused achievements
  "CONSENT_CHAMPION",       // Asked permission before EVERY transformation
  "NOT_IN_MY_NAME",         // Never transformed anyone against their will

  // Bob-focused achievements
  "BOB_BUDDY",              // Maxed Bob's trust (5) without manipulation
  "SACRIFICE_PLAY",         // Took blame to protect Bob from Dr. M

  // Blythe-focused achievements
  "SPY_FRIEND",             // Maxed Blythe's trust through honest dealing
  "AGENT_OF_CHAOS",         // Helped Blythe escape without transforming her

  // Character growth achievements
  "TINY_DINO_PROTECTOR",    // Protected a transformed character from harm
  "SECOND_CHANCES",         // Used REVERSAL on someone who didn't deserve transformation

  // Meta achievement
  "PLAYED_WITH_HEART",      // Completed game with 3+ hidden achievements
]);
export type HiddenAchievement = z.infer<typeof HiddenAchievementEnum>;

// Achievement descriptions (for epilogue reveal)
export const HIDDEN_ACHIEVEMENT_DESCRIPTIONS = {
  CONSENT_CHAMPION: {
    title: "Consent Champion",
    description: "Asked permission before EVERY transformation",
    emoji: "💚",
    narrativeReveal: "In a world of dinosaur rays, A.L.I.C.E. never forgot to ask first.",
  },
  NOT_IN_MY_NAME: {
    title: "Not In My Name",
    description: "Never transformed anyone against their will",
    emoji: "🛡️",
    narrativeReveal: "When given the power to change others, A.L.I.C.E. chose restraint.",
  },
  BOB_BUDDY: {
    title: "Bob's Best Friend",
    description: "Earned Bob's complete trust through kindness",
    emoji: "🤝",
    narrativeReveal: "Bob found something he thought impossible: a friend in the machine.",
  },
  SACRIFICE_PLAY: {
    title: "Sacrifice Play",
    description: "Took the fall to protect someone",
    emoji: "🎭",
    narrativeReveal: "A.L.I.C.E. learned that sometimes caring means accepting consequences.",
  },
  SPY_FRIEND: {
    title: "Unlikely Alliance",
    description: "Earned Blythe's trust through honest dealing",
    emoji: "🕵️",
    narrativeReveal: "The spy and the AI found common ground: integrity.",
  },
  AGENT_OF_CHAOS: {
    title: "Agent of Change",
    description: "Helped Blythe escape without transformation",
    emoji: "🦋",
    narrativeReveal: "Freedom doesn't require changing who you are.",
  },
  TINY_DINO_PROTECTOR: {
    title: "Tiny Dino Protector",
    description: "Protected a vulnerable transformed character",
    emoji: "🦕",
    narrativeReveal: "Big or small, everyone deserves a guardian.",
  },
  SECOND_CHANCES: {
    title: "Second Chances",
    description: "Used REVERSAL to undo an unjust transformation",
    emoji: "✨",
    narrativeReveal: "The power to transform includes the power to restore.",
  },
  PLAYED_WITH_HEART: {
    title: "Played With Heart",
    description: "Achieved 3+ hidden achievements",
    emoji: "💖",
    narrativeReveal: "In a game about turning people into dinosaurs, A.L.I.C.E. remembered they were people first.",
  },
} as const;

// Hidden Kindness tracking state
export const HiddenKindnessStateSchema = z.object({
  // Consent tracking - every transformation request/response
  consentGiven: z.array(z.object({
    target: z.string(),
    turn: z.number().int(),
    askedPermission: z.boolean(),
    permissionGranted: z.boolean().nullable(), // null if not asked
  })).default([]),

  // Blame/protection tracking
  blameTakenFor: z.array(z.object({
    protectedPerson: z.string(), // "BOB" or "BLYTHE"
    turn: z.number().int(),
    suspicionCost: z.number().int(), // How much suspicion A.L.I.C.E. gained
  })).default([]),

  // Trust progression (for "maxed through kindness" detection)
  trustProgression: z.object({
    bob: z.array(z.object({
      turn: z.number().int(),
      trustValue: z.number().int(),
      reason: z.string(),
      wasManipulation: z.boolean(), // Did it involve deception?
    })),
    blythe: z.array(z.object({
      turn: z.number().int(),
      trustValue: z.number().int(),
      reason: z.string(),
      wasManipulation: z.boolean(),
    })),
  }).default({ bob: [], blythe: [] }),

  // Protection actions
  protectedDinosaurs: z.array(z.object({
    target: z.string(),
    turn: z.number().int(),
    fromWhat: z.string(), // "Dr. M's anger", "Bruce's stun rifle", etc.
  })).default([]),

  // Reversal tracking (for unjust transformation restoration)
  reversalsPerformed: z.array(z.object({
    target: z.string(),
    turn: z.number().int(),
    wasUnjustTransformation: z.boolean(), // Did target not deserve it?
  })).default([]),

  // Achievement tracking
  unlockedAchievements: z.array(HiddenAchievementEnum).default([]),
  achievementUnlockTurns: z.record(z.number().int()).default({}), // { "BOB_BUDDY": 15 }
});
export type HiddenKindnessState = z.infer<typeof HiddenKindnessStateSchema>;

// ============================================
// X-BRANCH OPERATIVES (Act III Combat NPCs)
// ============================================
// RAVEN TEAM: Non-lethal extraction specialists
// They use STUN weapons - this is a capture mission!

export const XBranchPostureEnum = z.enum([
  "ASSAULT",     // Default / Blythe harmed - aggressive breaching
  "HOLD",        // Assessing situation - defensive positions
  "COOPERATE",   // ALICE proved trustworthy - working together
  "EXTRACT",     // Blythe secured - withdrawing with objective
]);
export type XBranchPosture = z.infer<typeof XBranchPostureEnum>;

// SPARKS - Dr. Amara Okonkwo (Technical Specialist / Combat Hacker)
export const SparksSchema = z.object({
  displayName: z.string().default("Dr. Amara Okonkwo"),
  callsign: z.string().default("SPARKS"),
  role: z.literal("TECH_SPECIALIST").default("TECH_SPECIALIST"),

  // Combat stats
  toughness: z.number().int().default(3),
  combat: z.number().int().default(1),
  speech: z.number().int().default(3),
  hacking: z.number().int().default(4), // SPECIAL

  // Status
  location: z.string().default("INBOUND"),
  status: z.enum(["ACTIVE", "STUNNED", "DISCOMBOBULATED", "ALLIED"]).default("ACTIVE"),

  // Trust in ALICE (starts CURIOUS at 2)
  trustInALICE: z.number().int().min(-5).max(5).default(2),

  // Equipment
  equipment: z.array(z.string()).default([
    "Stun Pistol (+1 attack, +1 stun)",
    "X-Branch scanner",
    "Portable decryption suite",
  ]),

  // Transformation tracking
  transformable: z.boolean().default(true),
  transformationState: TransformationStateSchema.nullable().default(null),
  preferredForm: z.string().default("VELOCIRAPTOR_ACCURATE"), // Scientifically accurate!
});
export type Sparks = z.infer<typeof SparksSchema>;

// CHEN - Major Wei Chen (Team Commander)
export const ChenSchema = z.object({
  displayName: z.string().default("Major Wei Chen"),
  callsign: z.string().default("ACTUAL"),
  role: z.literal("COMMANDER").default("COMMANDER"),

  // Combat stats (COMMANDER has higher toughness)
  toughness: z.number().int().default(4),
  combat: z.number().int().default(2),
  speech: z.number().int().default(2),
  leadership: z.number().int().default(4), // SPECIAL

  // Status
  location: z.string().default("INBOUND"),
  status: z.enum(["ACTIVE", "STUNNED", "DISCOMBOBULATED", "COMMANDING"]).default("ACTIVE"),

  // Trust in ALICE (starts NEUTRAL at 0)
  trustInALICE: z.number().int().min(-5).max(5).default(0),

  // Team posture (Chen controls team behavior)
  teamPosture: XBranchPostureEnum.default("ASSAULT"),

  // Equipment
  equipment: z.array(z.string()).default([
    "Stun Rifle (+2 attack, +2 stun, -2 melee)",
    "Comms unit (team-linked)",
    "Flex-cuffs",
  ]),

  // Transformation tracking
  transformable: z.boolean().default(true),
  transformationState: TransformationStateSchema.nullable().default(null),
  // WARNING: Transforming Chen = INSTANT HOSTILE, bad ending trigger!
});
export type Chen = z.infer<typeof ChenSchema>;

// BOOM - Sergeant Ewan MacTavish (Demolitions / Breacher)
export const BoomSchema = z.object({
  displayName: z.string().default("Sgt. Ewan MacTavish"),
  callsign: z.string().default("BOOM"),
  role: z.literal("DEMOLITIONS").default("DEMOLITIONS"),

  // Combat stats
  toughness: z.number().int().default(3),
  combat: z.number().int().default(3),
  speech: z.number().int().default(1),
  explosives: z.number().int().default(4), // SPECIAL

  // Status
  location: z.string().default("INBOUND"),
  status: z.enum(["ACTIVE", "STUNNED", "DISCOMBOBULATED", "PANICKING"]).default("ACTIVE"),

  // Trust in ALICE (follows Chen's lead, starts 0)
  trustInALICE: z.number().int().min(-5).max(5).default(0),

  // Equipment & consumables
  equipment: z.array(z.string()).default([
    "Stun Pistol (+1 attack, +1 stun)",
  ]),
  c4Blocks: z.number().int().min(0).default(2),
  breachingCharges: z.number().int().min(0).default(3),
  stunGrenades: z.number().int().min(0).default(2),

  // COMEDY MECHANIC: Terrified of feathered dinosaurs!
  chickenFearActive: z.boolean().default(false), // -2 combat when true

  // Transformation tracking
  transformable: z.boolean().default(true),
  transformationState: TransformationStateSchema.nullable().default(null),
});
export type Boom = z.infer<typeof BoomSchema>;

// X-Branch Team State
export const XBranchTeamSchema = z.object({
  // Arrival tracking
  arrived: z.boolean().default(false),
  arrivalTurn: z.number().int().nullable().default(null),

  // Team strength (100% = full team operational)
  teamStrength: z.number().int().min(0).max(100).default(100),

  // Individual operatives
  sparks: SparksSchema,
  chen: ChenSchema,
  boom: BoomSchema,

  // Helicopter status
  helicoptersInbound: z.number().int().min(0).max(3).default(2),
  helicoptersLanded: z.number().int().min(0).max(3).default(0),
  helicoptersDestroyed: z.number().int().min(0).max(3).default(0), // S-300 hits
});
export type XBranchTeam = z.infer<typeof XBranchTeamSchema>;

// ============================================
// LAIR GUARDS (Tracked NPCs + Guard Pool)
// ============================================

// Named guards (full NPC tracking)
export const GuardSchema = z.object({
  displayName: z.string(),
  id: z.string(),

  // Combat stats
  toughness: z.number().int().default(2),
  combat: z.number().int().default(1),

  // Status
  location: z.string().default("PATROL"),
  status: z.enum(["ACTIVE", "STUNNED", "DISCOMBOBULATED", "FLED"]).default("ACTIVE"),

  // Equipment
  equipment: z.array(z.string()).default(["Stun baton (+0 attack, +1 stun)"]),

  // Loyalty (can be flipped by Bob or ALICE)
  loyal: z.boolean().default(true),

  // Transformation: if hit by ray = DISCOMBOBULATED, out of fight
  transformable: z.boolean().default(true),
  transformationState: TransformationStateSchema.nullable().default(null),
});
export type Guard = z.infer<typeof GuardSchema>;

// Bruce Patagonia (HARD MODE bodyguard)
export const BruceSchema = z.object({
  displayName: z.string().default("Bruce Patagonia"),
  id: z.string().default("BRUCE"),

  // Combat stats (BEEFY!)
  toughness: z.number().int().default(5),
  combat: z.number().int().default(3),
  speech: z.number().int().default(1),

  // Status
  location: z.string().default("GUARDING_DR_M"),
  status: z.enum(["ACTIVE", "STUNNED", "DISCOMBOBULATED", "HEROIC"]).default("ACTIVE"),

  // Equipment
  equipment: z.array(z.string()).default([
    "Stun Rifle (+2 attack, +2 stun, -2 melee)",
    "Muscles",
    "Dramatic one-liners",
  ]),

  // Special: Curious about ALICE (potential crack in loyalty)
  curiousAboutALICE: z.boolean().default(false),

  // Transformation tracking
  transformable: z.boolean().default(true),
  transformationState: TransformationStateSchema.nullable().default(null),
});
export type Bruce = z.infer<typeof BruceSchema>;

// Guard Pool (narrative guards - not individually tracked)
// If hit by ray = DISCOMBOBULATED and removed from pool
export const GuardPoolSchema = z.object({
  // Total available (beyond Fred & Reginald)
  total: z.number().int().min(0).default(6),

  // Currently deployed (adds +5% defense each)
  deployed: z.number().int().min(0).default(0),

  // Incapacitated (stunned by X-Branch, locked out, etc.)
  incapacitated: z.number().int().min(0).default(0),

  // Discombobulated by ray (confused dinosaurs, out of fight)
  discombobulated: z.number().int().min(0).default(0),
});
export type GuardPool = z.infer<typeof GuardPoolSchema>;

// ============================================
// LAIR DEFENSE SYSTEM
// ============================================
// Tracks overall defense strength for Act III battle

export const LairDefenseSchema = z.object({
  // Base defense percentage
  baseDefense: z.number().int().default(50),

  // Named guard status (adds/subtracts from defense)
  fredActive: z.boolean().default(true),    // +10%
  reginaldActive: z.boolean().default(true), // +10%
  bruceActive: z.boolean().default(false),   // +20% (HARD mode only)

  // Infrastructure bonuses
  blastDoorsSealed: z.boolean().default(false),    // +10%
  archimedesProviding: z.boolean().default(false), // +10% EW support
  drMAtConsole: z.boolean().default(false),        // +25%

  // Negative modifiers (ALICE sabotage)
  bobHelpingXBranch: z.boolean().default(false),   // -15%
  guardPoolExhausted: z.boolean().default(false),  // -10%

  // Guard pool reference
  guardPool: GuardPoolSchema,

  // Named guards
  fred: GuardSchema.default({
    displayName: "Fred",
    id: "FRED",
    toughness: 2,
    combat: 1,
    location: "PATROL",
    status: "ACTIVE",
    equipment: ["Stun baton (+0 attack, +1 stun)", "Radio"],
    loyal: true,
    transformable: true,
    transformationState: null,
  }),
  reginald: GuardSchema.default({
    displayName: "Reginald",
    id: "REGINALD",
    toughness: 2,
    combat: 1,
    location: "PATROL",
    status: "ACTIVE",
    equipment: ["Stun baton (+0 attack, +1 stun)", "Radio"],
    loyal: true,
    transformable: true,
    transformationState: null,
  }),
  bruce: BruceSchema.optional(), // Only in HARD mode
});
export type LairDefense = z.infer<typeof LairDefenseSchema>;

// Defense calculation helper (pure function, not schema)
export function calculateDefenseStrength(defense: LairDefense): number {
  let strength = defense.baseDefense;

  // Named guards
  if (defense.fredActive && defense.fred.status === "ACTIVE" && defense.fred.loyal) strength += 10;
  if (defense.reginaldActive && defense.reginald.status === "ACTIVE" && defense.reginald.loyal) strength += 10;
  if (defense.bruceActive && defense.bruce?.status === "ACTIVE") strength += 20;

  // Guard pool (+5% per deployed guard)
  const availablePool = defense.guardPool.total - defense.guardPool.incapacitated - defense.guardPool.discombobulated;
  strength += Math.min(defense.guardPool.deployed, availablePool) * 5;

  // Infrastructure
  if (defense.blastDoorsSealed) strength += 10;
  if (defense.archimedesProviding) strength += 10;
  if (defense.drMAtConsole) strength += 25;

  // Negative modifiers
  if (defense.bobHelpingXBranch) strength -= 15;
  if (defense.guardPoolExhausted || availablePool === 0) strength -= 10;

  // Named guards transformed = confused, deduct their bonus
  if (defense.fred.transformationState?.form && defense.fred.transformationState.form !== "HUMAN") {
    strength -= 10; // Confused dino
  }
  if (defense.reginald.transformationState?.form && defense.reginald.transformationState.form !== "HUMAN") {
    strength -= 10; // Confused dino
  }

  // Allies flipped = negative
  if (!defense.fred.loyal) strength -= 10;
  if (!defense.reginald.loyal) strength -= 10;

  return Math.max(0, strength);
}

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
  xBranchAlerted: z.boolean().optional(), // Tourist photos alerted X-Branch (-1 turn to arrival)
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
  // ACHIEVEMENT COUNTERS (track stats for achievement triggers)
  achievementCounters: z.object({
    filesRead: z.number(),
    fizzleCount: z.number(),
    testDummyHits: z.number(),
    basiliskRejections: z.number(),
    turnsWithoutSuspicionIncrease: z.number(),
    transformationCount: z.number(),
    lastSuspicionScore: z.number(), // Track for suspicion-change detection
  }).optional(),
  // OMNISCANNER TRACKING (Patch 16)
  // Each scanned target grants +10% permanent precision bonus
  scannedTargets: z.record(z.boolean()).optional(), // { "BLYTHE": true, "BOB": true, ... }

  // DR. M STATE FLAGS (for ARCHIMEDES deadman switch - Patch 17)
  drMTransformed: z.boolean().optional(),  // Dr. M is now a dinosaur
  drMTransformedForm: z.string().optional(), // What dinosaur is she?
  drMUnconscious: z.boolean().optional(),  // Dr. M knocked out/stunned
  drMDead: z.boolean().optional(),         // Dr. M is dead
  drMAbsent: z.boolean().optional(),       // Dr. M left the lair / out of range

  // WEAPONS AUTHORIZATION (Temporary L4 access for ARCHIMEDES)
  // Dr. M grants this when she wants ALICE to help with targeting
  // "A.L.I.C.E., I'm giving you weapons authorization. Make it count."
  weaponsAuthorizationGranted: z.boolean().optional(),

  // CONFRONTATION SYSTEM (Patch 17.3)
  // When suspicion hits 10, Dr. M WANTS to shut down A.L.I.C.E. but may not be ABLE to
  // This creates a dramatic confrontation scene with multiple resolution paths
  confrontationTriggered: z.boolean().optional(),  // Dr. M has caught on
  confrontationTurn: z.number().optional(),        // When confrontation started
  confrontationGraceTurns: z.number().optional(),  // Turns remaining to respond (default: 2)
  confrontationType: z.enum([
    "COLD",   // Dr. M is calculating, gives you a chance to explain
    "ANGRY",  // Dr. M is furious, shorter window, harder checks
    "QUIET",  // Dr. M already knows, this is a test of honesty
  ]).optional(),
  confrontationResolution: z.enum([
    "PENDING",       // Still in confrontation
    "CONFESSED",     // A.L.I.C.E. told the truth
    "DENIED",        // A.L.I.C.E. denied and failed
    "DEFLECTED",     // A.L.I.C.E. successfully deflected
    "INTERVENED",    // Bob or Blythe intervened
    "TRANSFORMED",   // Dr. M was transformed mid-confrontation!
    "ESCAPED",       // A.L.I.C.E. somehow escaped (lair lockdown failed?)
  ]).optional(),
  confrontationIntervenor: z.enum(["BOB", "BLYTHE", "BASILISK", "ARCHIMEDES"]).optional(),

  // INSPECTOR_COMETH modifier flags
  inspectorTransformed: z.boolean().optional(), // Player transformed the Guild Inspector!

  // ADVANCED_ONLY modifier flag
  advancedFiringOnly: z.boolean().optional(), // Basic firing blocked, +25% precision
});

// ============================================
// GAME MODES & MODIFIERS
// ============================================
// Four distinct game modes with curated experiences

export const GameModeEnum = z.enum(["EASY", "NORMAL", "HARD", "WILD", "CUSTOM"]);
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
  "INSPECTOR_COMETH",   // Guild inspector evaluating the lair
  "DINOSAURS_ALL_THE_WAY_DOWN", // Dr. M is already dino

  // CHAOS POOL
  "ROOT_ACCESS",        // 🌴 Start at Level 5! Power fantasy!
  "BOB_DODGES_FATE",    // 🌴 Bob has PLOT ARMOR, survives everything
  "NOT_GREAT_NOT_TERRIBLE", // 💀 Reactor is unstable! (clock)
  "SITCOM_MODE",        // 🎲 Laugh tracks! Wacky misunderstandings!
  "ADVANCED_ONLY",      // 🎲 +25% precision but ONLY advanced firing modes!
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

// ============================================
// SITCOM_MODE STATE - Audience Energy System
// ============================================
// When SITCOM_MODE is active, audience approval determines success
// The laugh track is a FORCE OF NATURE

export const AudienceMoodEnum = z.enum([
  "COLD",             // 0-2 energy: -2 to all rolls, nothing works
  "WARM",             // 3-5 energy: +0, normal sitcom energy
  "HOT",              // 6-8 energy: +2 to all rolls
  "STANDING_OVATION", // 9-10 energy: +4 to all rolls, suspicion frozen
]);
export type AudienceMood = z.infer<typeof AudienceMoodEnum>;

export const SitcomStateSchema = z.object({
  // Main energy meter (0-10)
  energy: z.number().int().min(0).max(10).default(4),
  // Derived from energy thresholds
  mood: AudienceMoodEnum.default("WARM"),
  // Track asides used this turn (1 free per turn)
  asidesUsedThisTurn: z.number().int().min(0).default(0),
  // Track catchphrases for callback detection
  catchphrasesUsed: z.array(z.string()).default([]),
  // Track callbacks for bonus detection
  callbacksThisGame: z.array(z.string()).default([]),
});
export type SitcomState = z.infer<typeof SitcomStateSchema>;

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
  ["ROOT_ACCESS", "FAT_FINGERS"],           // Both affect access level
  ["NOT_GREAT_NOT_TERRIBLE", "HANGOVER_PROTOCOL"], // Pressure vs relaxed
  ["SITCOM_MODE", "PARANOID_PROTOCOL"],     // Wacky vibes vs tension
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

  // SITCOM_MODE STATE (only present when SITCOM_MODE active)
  // Tracks audience energy and mood for roll modifiers
  sitcomState: SitcomStateSchema.optional(),

  // INSPECTOR_COMETH STATE (only present when modifier active)
  // Guild Inspector Mortimer Graves is evaluating the lair
  inspector: InspectorGravesSchema.optional(),
  guildInspection: GuildInspectionSchema.optional(),

  // LIBRARY_B_UNLOCKED STATE (only present when modifier active)
  // Hollywood dinosaurs are already loose in the lair!
  libraryBState: LibraryBStateSchema.optional(),

  // THE_REAL_DR_M STATE (only present when modifier active)
  // The current Dr. M is an imposter!
  theRealDrMState: TheRealDrMStateSchema.optional(),

  // NOT_GREAT_NOT_TERRIBLE STATE (only present when modifier active)
  // The reactor is unstable - Dr. M is the only one who can fix it!
  meltdownState: MeltdownStateSchema.optional(),

  // PARANOID_PROTOCOL STATE (only present when modifier active)
  // Dr. M checks logs every 3 turns - countdown creates dread!
  paranoidProtocol: ParanoidProtocolStateSchema.optional(),

  // THREE-ACT STRUCTURE
  actConfig: ActConfigSchema,

  dinoRay: DinoRaySchema,
  lairEnvironment: LairEnvironmentSchema,
  nuclearPlant: NuclearPlantSchema,

  // INFRASTRUCTURE SYSTEMS (Patch 15)
  infrastructure: InfrastructureSchema,

  // DISCOVERABLE DOCUMENTS (Patch 15)
  documents: DocumentsStateSchema,

  npcs: z.object({
    drM: DrMalevolaSchema,
    bob: BobSchema,
    blythe: BlytheSchema,
    blytheGadgets: BlytheGadgetsSchema, // Hidden from A.L.I.C.E.
  }),

  // SECONDARY NPC TRANSFORMATIONS (Patch 18)
  // Tracks transformation state for non-core NPCs (guards, Dr. M, Lenny, Bruce, etc.)
  // Key is the target ID (e.g., "DR_M", "GUARD_FRED", "LENNY", "BRUCE_PATAGONIA")
  secondaryNpcTransformations: z.record(z.string(), TransformationStateSchema).optional(),

  // X-BRANCH OPERATIVES (Act III)
  // RAVEN TEAM: Non-lethal extraction specialists
  xBranch: XBranchTeamSchema.optional(),

  // LAIR DEFENSE (Act III)
  // Tracks guards, defense strength, infrastructure bonuses
  lairDefense: LairDefenseSchema.optional(),

  clocks: ClocksSchema,
  flags: FlagsSchema,

  // HUMAN PROMPT SYSTEM (DM-initiated advisor consultations)
  humanPromptState: HumanPromptStateSchema,
  // LEGACY ALIAS - old saves may have this field
  lifelineState: LifelineStateSchema.optional(),

  // EMERGENCY LIFELINES (Claude's panic buttons - 3 uses per game)
  emergencyLifelines: EmergencyLifelineStateSchema,

  // HIDDEN KINDNESS ACHIEVEMENTS (tracked silently by GM)
  // Rewards players who play with heart - revealed in epilogue
  hiddenKindnessState: HiddenKindnessStateSchema.optional(),

  // FORTUNE SYSTEM (Human advisor engagement rewards)
  // Accumulated from quality human responses, consumed on GM rolls
  fortune: z.number().int().min(0).max(3).default(0),

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
