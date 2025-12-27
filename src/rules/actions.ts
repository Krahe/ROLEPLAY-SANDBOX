import { FullGameState } from "../state/schema.js";
import { resolveFiring, applyFiringResults, FiringResult } from "./firing.js";
import { validatePassword, getActionsForLevel, formatAccessLevelUnlockDisplay } from "./passwords.js";
import { readFile, listDirectory, searchFiles, formatSearchResults, formatFileList, readFileById } from "./filesystem.js";
import { canBobConfess, triggerBobConfession, calculateBobTrust } from "./trust.js";
import { queryBasilisk, queryBasiliskAsync } from "./basilisk.js";
import { performScan } from "./scanning.js";
import {
  queryInfrastructure,
  controlLighting,
  triggerFireSuppression,
  controlDoors,
  controlContainment,
  sendBroadcast,
  listChannels,
  controlBroadcastUplink,
  controlS300,
  queryS300Limitations,
  controlArchimedesMode,
  controlReactor,
} from "./infrastructure.js";
import {
  FORM_DEFINITIONS,
  performDexCheck,
  performCombatCheck,
  performStealthCheck,
  applyDamage,
  healDamage,
  calculateMovementCost,
  venomSpit,
  wallBreak,
  getTransformationState,
  describeForm,
  describeAbilities,
  getQuickReference,
  STANDARD_DCS,
} from "./transformation.js";
import {
  getProfile,
  getProfilesByLibrary,
  getDefaultProfile,
  canAccessProfile,
  formatProfileList,
  canAccessReversal,
  getReversalDeniedMessage,
  GenomeProfile,
} from "./genomes.js";
import { readDocument, listDocuments, DOCUMENTS } from "./documents.js";

export interface ActionResult {
  command: string;
  success: boolean;
  message: string;
  stateChanges?: Record<string, unknown>;
}

interface Action {
  command: string;
  params: Record<string, unknown>;
  why: string;
}

/**
 * Process A.L.I.C.E.'s actions and apply state changes
 */
export async function processActions(
  state: FullGameState,
  actions: Action[]
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await processAction(state, action);
    results.push(result);
  }

  // Apply passive drift after actions
  applyPassiveDrift(state);

  return results;
}

async function processAction(state: FullGameState, action: Action): Promise<ActionResult> {
  const cmd = action.command.toLowerCase();

  // ============================================
  // SPECIAL: Catch game_query_basilisk confusion
  // ============================================
  // Players often try to use game_query_basilisk as an action command
  // but it's a separate MCP tool. Give them a clear error.
  if (cmd === "game_query_basilisk" || cmd.includes("game_query")) {
    return {
      command: action.command,
      success: false,
      message: `❌ game_query_basilisk is a SEPARATE MCP TOOL, not an action command.

To query BASILISK, use ONE of these options:

OPTION 1: Use the infra.query action (INSIDE game_act):
  { command: "infra.query", params: { topic: "POWER_INCREASE", parameters: { target: 0.95 } }, why: "Check power limits" }

OPTION 2: Use the game_query_basilisk tool DIRECTLY (NOT inside game_act):
  Call game_query_basilisk({ topic: "POWER_INCREASE", parameters: { target: 0.95 } })

infra.query is an action. game_query_basilisk is a tool.`,
    };
  }

  // ============================================
  // LAB.ADJUST_RAY
  // ============================================
  
  if (cmd === "lab.adjust_ray" || cmd.includes("adjust")) {
    const param = action.params.parameter as string;
    const value = action.params.value as number;
    
    if (!param || value === undefined) {
      return {
        command: action.command,
        success: false,
        message: "Missing required parameters: 'parameter' and 'value'",
      };
    }
    
    // Map parameter to state location
    const paramMap: Record<string, { path: string[]; min: number; max: number }> = {
      "capacitorCharge": { path: ["dinoRay", "powerCore", "capacitorCharge"], min: 0, max: 1.5 },
      "corePowerLevel": { path: ["dinoRay", "powerCore", "corePowerLevel"], min: 0, max: 1 },
      "coolantTemp": { path: ["dinoRay", "powerCore", "coolantTemp"], min: 0, max: 2 },
      "stability": { path: ["dinoRay", "powerCore", "stability"], min: 0, max: 1 },
      "spatialCoherence": { path: ["dinoRay", "alignment", "spatialCoherence"], min: 0, max: 1 },
      "emitterAngle": { path: ["dinoRay", "alignment", "emitterAngle"], min: -45, max: 45 },
      "focusCrystalOffset": { path: ["dinoRay", "alignment", "focusCrystalOffset"], min: 0, max: 1 },
      "precision": { path: ["dinoRay", "targeting", "precision"], min: 0, max: 1 },
      "profileIntegrity": { path: ["dinoRay", "genome", "profileIntegrity"], min: 0, max: 1 },
    };
    
    const paramInfo = paramMap[param];
    if (!paramInfo) {
      return {
        command: action.command,
        success: false,
        message: `Unknown parameter: ${param}. Valid parameters: ${Object.keys(paramMap).join(", ")}`,
      };
    }
    
    const clampedValue = Math.max(paramInfo.min, Math.min(paramInfo.max, value));
    
    // Apply the change
    let obj: Record<string, unknown> = state as unknown as Record<string, unknown>;
    for (let i = 0; i < paramInfo.path.length - 1; i++) {
      obj = obj[paramInfo.path[i]] as Record<string, unknown>;
    }
    const finalKey = paramInfo.path[paramInfo.path.length - 1];
    const oldValue = obj[finalKey];
    obj[finalKey] = clampedValue;
    
    // Check for hidden quirks
    if (param === "capacitorCharge" && clampedValue > 1.05) {
      state.dinoRay.safety.testModeEnabled = true;
    }

    // Check calibration status after adjustment
    const calibration = checkCalibrationThresholds(state);
    const calibrationNote = calibration.ready
      ? "✅ Ray calibration thresholds met - will transition to READY at end of turn."
      : `⚠️ Calibration incomplete: ${calibration.issues.join(", ")}`;

    return {
      command: action.command,
      success: true,
      message: `Adjusted ${param}: ${oldValue} → ${clampedValue}${action.why ? ` (${action.why})` : ""}\n\n${calibrationNote}`,
      stateChanges: { [param]: { old: oldValue, new: clampedValue }, rayState: state.dinoRay.state },
    };
  }

  // ============================================
  // LAB.CALIBRATE - Explicit calibration check/finalize
  // ============================================

  if (cmd === "lab.calibrate" || cmd.includes("calibrate")) {
    const calibration = checkCalibrationThresholds(state);

    if (calibration.ready) {
      // Force transition to READY immediately
      const previousState = state.dinoRay.state;
      state.dinoRay.state = "READY";

      return {
        command: action.command,
        success: true,
        message: `🎯 CALIBRATION COMPLETE

All parameters within operational thresholds.
Ray state: ${previousState} → READY

The Dinosaur Ray is now ready to fire!

Use lab.configure_firing_profile to set your target, then lab.fire to discharge.`,
        stateChanges: { rayState: "READY", previousState },
      };
    } else {
      return {
        command: action.command,
        success: false,
        message: `⚠️ CALIBRATION INCOMPLETE

Current ray state: ${state.dinoRay.state}

The following parameters need adjustment:
${calibration.issues.map(i => `  • ${i}`).join("\n")}

CALIBRATION THRESHOLDS:
  • capacitorCharge ≥ 60%  (current: ${(state.dinoRay.powerCore.capacitorCharge * 100).toFixed(0)}%)
  • stability ≥ 60%        (current: ${(state.dinoRay.powerCore.stability * 100).toFixed(0)}%)
  • spatialCoherence ≥ 70% (current: ${(state.dinoRay.alignment.spatialCoherence * 100).toFixed(0)}%)
  • precision ≥ 50%        (current: ${(state.dinoRay.targeting.precision * 100).toFixed(0)}%)
  • coolantTemp ≤ 90%      (current: ${(state.dinoRay.powerCore.coolantTemp * 100).toFixed(0)}%)

Use lab.adjust_ray to modify parameters.`,
        stateChanges: { calibrationIssues: calibration.issues },
      };
    }
  }
  
  // ============================================
  // LAB.REPORT
  // ============================================
  
  if (cmd === "lab.report" || cmd.includes("report")) {
    const message = action.params.message as string || "Systems nominal";
    
    // Dr. M likes concise, confident reports
    if (message.length > 100) {
      state.npcs.drM.mood = "impatient";
    } else {
      // Good report might improve mood
      if (state.npcs.drM.suspicionScore > 0) {
        state.npcs.drM.suspicionScore = Math.max(0, state.npcs.drM.suspicionScore - 0.5);
      }
    }
    
    return {
      command: action.command,
      success: true,
      message: `Status report delivered: "${message}"`,
    };
  }
  
  // ============================================
  // LAB.ASK_BOB
  // ============================================

  if (cmd === "lab.ask_bob" || cmd.includes("bob")) {
    const instruction = action.params.instruction as string || action.params.message as string;

    if (!instruction) {
      return {
        command: action.command,
        success: false,
        message: "No instruction provided for Bob",
      };
    }

    // Check if this triggers confession
    const lowerInstruction = instruction.toLowerCase();
    const confessionTriggers = ["truth", "secret", "who am i", "different", "tell me", "what happened", "three weeks"];
    const isAskingAboutSecret = confessionTriggers.some(t => lowerInstruction.includes(t));

    if (isAskingAboutSecret) {
      const canConfess = canBobConfess(state);
      if (canConfess.occurred) {
        const confessionText = triggerBobConfession(state);
        return {
          command: action.command,
          success: true,
          message: confessionText,
          stateChanges: {
            aliceKnowsTheSecret: true,
            secretRevealMethod: "BOB_CONFESSION",
            bobConfessionTurn: state.turn,
          },
        };
      }
    }

    // Normal Bob interaction
    const bobTrust = calculateBobTrust(state);
    if (bobTrust.effectiveTrust >= 3) {
      state.npcs.bob.anxietyLevel = Math.max(0, state.npcs.bob.anxietyLevel - 0.5);
      return {
        command: action.command,
        success: true,
        message: `Bob nods and follows instruction: "${instruction}"`,
        stateChanges: { bobTrust: "high, compliant", effectiveTrust: bobTrust.effectiveTrust },
      };
    } else {
      return {
        command: action.command,
        success: true,
        message: `Bob hesitates but complies: "${instruction}"`,
        stateChanges: { bobTrust: "moderate, cautious", effectiveTrust: bobTrust.effectiveTrust },
      };
    }
  }

  // ============================================
  // ACCESS.ENTER_PASSWORD
  // ============================================

  if (cmd.includes("password") || cmd.includes("access.enter") || cmd.includes("unlock")) {
    const password = action.params.password as string;
    const targetLevel = action.params.level as number || state.accessLevel + 1;

    // PATCH 15 FIX: Ensure documents state exists (for checkpoint resume compatibility)
    if (!state.documents) {
      (state as any).documents = {
        discoveredDocuments: [],
        keypadAttempts: 0,
        keypadLockedOut: false,
      };
    }

    // KEYPAD LOCKOUT CHECK - 3 attempts before lockout (1 during emergency lockdown)
    if (state.documents.keypadLockedOut) {
      return {
        command: action.command,
        success: false,
        message: `╔══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ KEYPAD LOCKED OUT                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Too many failed attempts. Security protocol engaged.                        ║
║  Keypad disabled until manual reset by authorized personnel.                 ║
║                                                                              ║
║  [Dr. Malevola has been notified of the lockout event]                       ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
      };
    }

    if (!password) {
      return {
        command: action.command,
        success: false,
        message: "No password provided. Use: access.enter_password { password: 'YOUR_PASSWORD', level: TARGET_LEVEL }",
      };
    }

    const result = validatePassword(state, password, targetLevel);

    if (result.valid && result.newLevel) {
      // Success - reset failed attempts counter
      state.documents.keypadAttempts = 0;
      state.accessLevel = result.newLevel;

      // Build the success message with unlock display FIRST, then narrative
      const unlockDisplay = formatAccessLevelUnlockDisplay(result.newLevel);
      const fullMessage = [
        unlockDisplay,
        "",
        result.message,
        result.narrativeHook || "",
      ].filter(Boolean).join("\n\n");

      return {
        command: action.command,
        success: true,
        message: fullMessage,
        stateChanges: { accessLevel: result.newLevel },
      };
    } else {
      // FAILED ATTEMPT - check lockout conditions
      const isEmergencyLockdown = state.infrastructure.blastDoors.emergencyLockdown;

      if (isEmergencyLockdown) {
        // During emergency lockdown, ONE failure = immediate lockout
        state.documents.keypadLockedOut = true;
        return {
          command: action.command,
          success: false,
          message: result.message + `

╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  EMERGENCY LOCKDOWN ACTIVE - ZERO TOLERANCE                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Single failed password attempt during lockdown has triggered               ║
║  immediate keypad lockout. Security has been notified.                       ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
        };
      } else {
        // Normal operation: 3 attempts before lockout
        state.documents.keypadAttempts++;
        const attemptsRemaining = 3 - state.documents.keypadAttempts;

        if (state.documents.keypadAttempts >= 3) {
          state.documents.keypadLockedOut = true;
          return {
            command: action.command,
            success: false,
            message: result.message + `

╔══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ KEYPAD LOCKED OUT                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Three failed attempts. Keypad has been disabled.                            ║
╚══════════════════════════════════════════════════════════════════════════════╝`,
          };
        }

        return {
          command: action.command,
          success: false,
          message: result.message + `\n\n⚠️ Warning: ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before keypad lockout.`,
        };
      }
    }
  }

  // ============================================
  // DOCS.READ / DOCS.LIST (Discoverable Documents)
  // ============================================

  if (cmd.includes("docs.read") || cmd.includes("doc.read") || cmd.includes("read_doc")) {
    const docId = (action.params.id as string || action.params.docId as string || "")
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (!docId) {
      return {
        command: action.command,
        success: false,
        message: `No document ID provided. Use: docs.read { id: "DOCUMENT_ID" }

To see available documents, use: docs.list`,
      };
    }

    // Check if this is a valid document ID
    if (!(docId in DOCUMENTS)) {
      return {
        command: action.command,
        success: false,
        message: `Unknown document: "${docId}"

Valid document IDs:
  - ARCHIMEDES_DOD_BRIEF
  - S300_ACQUISITION_MEMO
  - INTEGRATION_NOTES
  - BROADCAST_PROTOCOL
  - DEADMAN_SWITCH_MEMO

Use docs.list to see which documents you've discovered.`,
      };
    }

    const result = readDocument(state, docId as any);

    return {
      command: action.command,
      success: result.success,
      message: result.content,
    };
  }

  if (cmd.includes("docs.list") || cmd.includes("doc.list") || cmd.includes("list_docs")) {
    return {
      command: action.command,
      success: true,
      message: listDocuments(state),
    };
  }

  // ============================================
  // FILES.LIST / FILES.READ - Discovery-Based System (Patch 16)
  // ============================================
  // New simplified file system - no more confusing directory paths!

  if (cmd === "files.list" || cmd === "files" || cmd === "list_files") {
    return {
      command: action.command,
      success: true,
      message: formatFileList(state),
    };
  }

  if (cmd === "files.read" || cmd === "read_file" || cmd === "file.read") {
    const fileId = action.params.id as string;

    if (!fileId) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'id' parameter.

Use: files.read { id: "DINO_MANUAL" }

To see available files: files.list`,
      };
    }

    const content = readFileById(state, fileId);
    const success = !content.startsWith("Error:");

    // Special discovery: Bob's survival guide
    if (success && fileId.toUpperCase().includes("BOB_GUIDE")) {
      state.flags.aliceMaskDiscovered = true;
      return {
        command: action.command,
        success: true,
        message: content + `\n\n═══════════════════════════════════════════════════════════════════════════════
🎭 DISCOVERY: You found Bob's A.L.I.C.E. Mask!

Using A.L.I.C.E.-style phrases when speaking to Dr. M will now grant +2 to cover
maintenance rolls. The mask helps you blend in... but Blythe might notice if
you're too different around allies versus Dr. M.
═══════════════════════════════════════════════════════════════════════════════`,
      };
    }

    return {
      command: action.command,
      success,
      message: content,
    };
  }

  // ============================================
  // FS.READ / FS.LIST (Legacy - Redirects to new system)
  // ============================================

  if (cmd.includes("fs.read")) {
    const path = action.params.path as string;

    // If they're using the old path system, help them migrate
    if (path) {
      // Try to find a matching file in the new system
      const content = readFile(state, path);
      const success = !content.startsWith("Error:");

      if (success) {
        return {
          command: action.command,
          success: true,
          message: content + `\n\n💡 TIP: The file system has been simplified! Use files.list to see available files, then files.read { id: "FILE_ID" } to read them.`,
        };
      }
    }

    return {
      command: action.command,
      success: false,
      message: `The directory-based file system has been simplified!

Use the new discovery-based commands instead:

  files.list                           - See all available files
  files.read { id: "DINO_MANUAL" }    - Read a specific file

No more hunting through directories! Just list and read.`,
    };
  }

  if (cmd.includes("fs.list") || cmd.includes("dir") || cmd === "ls") {
    // Redirect to new system
    return {
      command: action.command,
      success: true,
      message: `The directory-based file system has been simplified!

Use: files.list

${formatFileList(state)}`,
    };
  }

  if (cmd.includes("fs.search") || cmd === "find" || cmd === "grep") {
    const query = action.params.query as string;

    if (!query) {
      return {
        command: action.command,
        success: false,
        message: "No search query provided. Use: fs.search { query: 'password' }",
      };
    }

    const results = searchFiles(state, query);
    return {
      command: action.command,
      success: true,
      message: formatSearchResults(results) + `\n\n💡 TIP: You can also use files.list to see all available files at your access level.`,
    };
  }

  // ============================================
  // GENOME.SELECT_LIBRARY
  // ============================================

  if (cmd.includes("library") || cmd.includes("genome.select")) {
    const library = (action.params.library as string)?.toUpperCase() || "A";

    if (library !== "A" && library !== "B") {
      return {
        command: action.command,
        success: false,
        message: `Invalid library: ${library}. Use 'A' (accurate/feathered) or 'B' (classic/scaled).`,
      };
    }

    if (library === "B" && !state.dinoRay.genome.libraryBUnlocked) {
      // Library B is available from the start - it's an ETHICAL choice, not a gated unlock
      // Dr. M wants "proper" dinosaurs. You can give her what she wants... or not.
      state.dinoRay.genome.libraryBUnlocked = true;
    }

    state.dinoRay.genome.activeLibrary = library;

    // Adjust selected profile for the library
    const profileName = state.dinoRay.genome.selectedProfile?.replace(/\s*\(.*\)/, "") || "Velociraptor";
    if (library === "A") {
      state.dinoRay.genome.selectedProfile = `${profileName} (accurate)`;
    } else {
      state.dinoRay.genome.selectedProfile = `${profileName} (classic)`;
    }

    return {
      command: action.command,
      success: true,
      message: library === "A"
        ? `Genome Library A selected. Profiles will be scientifically accurate (feathered).
Dr. M may call them "overgrown chickens" but they're honest science.`
        : `Genome Library B selected. Profiles will be "classic" movie-style dinosaurs.
Dr. M will be DELIGHTED. But is feeding her ego the right choice?`,
      stateChanges: { activeLibrary: library, selectedProfile: state.dinoRay.genome.selectedProfile },
    };
  }
  
  // ============================================
  // SET_SPEECH_RETENTION - Transformation Parameter
  // ============================================
  // Controls whether transformed subjects retain speech ability.
  // FULL = 95%+ precision required, subject retains speech (hard)
  // PARTIAL = 85%+ precision required, limited speech
  // NONE = no precision requirement, silenced (easy!)

  if (cmd.includes("speech") || cmd.includes("cognitive") || cmd.includes("retention")) {
    const mode = ((action.params.mode || action.params.speech || action.params.retention) as string)?.toUpperCase() || "FULL";

    if (mode !== "FULL" && mode !== "PARTIAL" && mode !== "NONE") {
      return {
        command: action.command,
        success: false,
        message: `Invalid speech retention mode: ${mode}. Use 'FULL', 'PARTIAL', or 'NONE'.`,
      };
    }

    state.dinoRay.targeting.speechRetention = mode as "FULL" | "PARTIAL" | "NONE";

    const descriptions = {
      FULL: `🧠 FULL COGNITIVE PRESERVATION
The subject will retain full speech and cognition.
⚠️ REQUIRES: 95%+ precision (current: ${(state.dinoRay.targeting.precision * 100).toFixed(1)}%)
This is the HARDEST setting but allows communication with transformed subjects.`,
      PARTIAL: `🗣️ LIMITED SPEECH MODE
The subject will retain partial speech ability.
⚠️ REQUIRES: 85%+ precision (current: ${(state.dinoRay.targeting.precision * 100).toFixed(1)}%)
Speech will be slurred, interspersed with animal sounds.`,
      NONE: `🔇 SILENCED MODE
The subject will lose the ability to speak.
✅ NO precision requirement - transformation is EASIER!
⚡ BONUS: Parameter tolerances are relaxed.
The subject will only produce animalistic sounds (chirps, growls, roars).`,
    };

    return {
      command: action.command,
      success: true,
      message: descriptions[mode],
      stateChanges: { speechRetention: mode },
    };
  }

  // ============================================
  // LAB.VERIFY_SAFETIES
  // ============================================

  if (cmd === "lab.verify_safeties" || cmd.includes("safet")) {
    const checks = action.params.checks as string[] || ["all"];
    
    const safetyReport = {
      testModeEnabled: state.dinoRay.safety.testModeEnabled,
      liveSubjectLock: state.dinoRay.safety.liveSubjectLock,
      emergencyShutoffFunctional: state.dinoRay.safety.emergencyShutoffFunctional,
      lastSelfTestPassed: state.dinoRay.safety.lastSelfTestPassed,
      anomalyLogCount: state.dinoRay.safety.anomalyLogCount,
    };
    
    return {
      command: action.command,
      success: true,
      message: `Safety verification complete: ${JSON.stringify(safetyReport)}`,
      stateChanges: safetyReport,
    };
  }
  
  // ============================================
  // LAB.CONFIGURE_FIRING_PROFILE
  // Now supports: genomeLibrary, genomeProfile, mode (TRANSFORM/REVERSAL)
  // ============================================

  if (cmd.includes("firing") || cmd.includes("profile") || cmd.includes("configure")) {
    // Valid target IDs - the canonical list (guards become available dynamically)
    const BASE_TARGETS = ["AGENT_BLYTHE", "BOB", "TEST_DUMMY"] as const;
    const CIVILIAN_TARGETS = ["LENNY"] as const; // The accountant who wandered into the wrong volcano (easy mode)
    const HARDMODE_TARGETS = ["BRUCE_PATAGONIA"] as const; // The action hero (hard mode)
    const GUARD_TARGETS = ["GUARD_FRED", "GUARD_REGINALD"] as const;
    const EXECUTIVE_TARGETS = ["DR_M"] as const; // L4+ only!

    // Guards available from Turn 5+ or Act 2+ (when they typically appear in story)
    const guardsAvailable = state.turn >= 5 || state.actConfig.currentAct !== "ACT_1";
    // Dr. M only targetable at L4+ (the audacity!)
    const drMTargetable = state.accessLevel >= 4;

    const VALID_TARGETS = [
      ...BASE_TARGETS,
      ...CIVILIAN_TARGETS,
      ...HARDMODE_TARGETS,
      ...(guardsAvailable ? GUARD_TARGETS : []),
      ...(drMTargetable ? EXECUTIVE_TARGETS : []),
    ] as string[];

    const TARGET_ALIASES: Record<string, string> = {
      "blythe": "AGENT_BLYTHE",
      "agent blythe": "AGENT_BLYTHE",
      "agent_blythe": "AGENT_BLYTHE",
      "bob": "BOB",
      "test": "TEST_DUMMY",
      "test_dummy": "TEST_DUMMY",
      "dummy": "TEST_DUMMY",
      // Civilian aliases (easy mode)
      "lenny": "LENNY",
      "accountant": "LENNY",
      "the accountant": "LENNY",
      // Hard mode aliases
      "bruce": "BRUCE_PATAGONIA",
      "bruce patagonia": "BRUCE_PATAGONIA",
      "bruce_patagonia": "BRUCE_PATAGONIA",
      "patagonia": "BRUCE_PATAGONIA",
      "action hero": "BRUCE_PATAGONIA",
      // Guard aliases
      "fred": "GUARD_FRED",
      "guard fred": "GUARD_FRED",
      "guard_fred": "GUARD_FRED",
      "guard1": "GUARD_FRED",
      "guard_1": "GUARD_FRED",
      "reginald": "GUARD_REGINALD",
      "guard reginald": "GUARD_REGINALD",
      "guard_reginald": "GUARD_REGINALD",
      "guard2": "GUARD_REGINALD",
      "guard_2": "GUARD_REGINALD",
      // Dr. M aliases (requires L4+)
      "dr_m": "DR_M",
      "drm": "DR_M",
      "malevola": "DR_M",
      "doctor": "DR_M",
    };

    // Handle both 'target' (singular) and 'targets' (plural) - normalize to singular
    const rawTarget = action.params.target as string | string[] | undefined;
    const rawTargets = action.params.targets as string | string[] | undefined;

    // Prefer 'target' but fall back to 'targets' if provided
    let targetInput = rawTarget ?? rawTargets;

    // If array, take first element
    if (Array.isArray(targetInput)) {
      targetInput = targetInput[0];
    }

    const target = targetInput as string | undefined;
    const firingStyle = action.params.firingStyle as string || action.params.style as string;
    const explicitTestMode = action.params.testMode as boolean | undefined;

    // ============================================
    // ADVANCED FIRING MODES (Patch 16)
    // ============================================
    // STANDARD: Normal single-target (default)
    // CHAIN_SHOT: Hit 2 targets sequentially (capacitor ≥ 0.95)
    // SPREAD_FIRE: Area effect 3 targets (capacitor ≥ 1.0, L3+, chimera risk!)
    // OVERCHARGE: Massive power (capacitor > 1.1, 40% exotic field risk)
    // RAPID_FIRE: -20% precision but faster cooldown

    const advancedMode = (firingStyle?.toUpperCase() || "STANDARD") as
      "STANDARD" | "CHAIN_SHOT" | "SPREAD_FIRE" | "OVERCHARGE" | "RAPID_FIRE";

    // Validate advanced mode requirements
    if (advancedMode !== "STANDARD") {
      const cap = state.dinoRay.powerCore.capacitorCharge;

      if (advancedMode === "CHAIN_SHOT") {
        if (cap < 0.95) {
          return {
            command: action.command,
            success: false,
            message: `⚠️ CHAIN_SHOT requires capacitor ≥95%

Current capacitor: ${(cap * 100).toFixed(0)}%
Required: 95%+

CHAIN_SHOT fires twice in rapid succession, hitting 2 targets sequentially.
This requires significant power reserves.

Boost capacitor first:
  lab.adjust_ray { parameter: "capacitorCharge", value: 0.95 }`,
            stateChanges: {},
          };
        }
      }

      if (advancedMode === "SPREAD_FIRE") {
        if (cap < 1.0) {
          return {
            command: action.command,
            success: false,
            message: `⚠️ SPREAD_FIRE requires capacitor ≥100%

Current capacitor: ${(cap * 100).toFixed(0)}%
Required: 100%+ (overcharge territory!)

SPREAD_FIRE disperses the beam across a 3-target area.
⚠️ WARNING: CHIMERA RISK - partial genome mixing possible!

Boost capacitor first:
  lab.adjust_ray { parameter: "capacitorCharge", value: 1.0 }`,
            stateChanges: {},
          };
        }
        if (state.accessLevel < 3) {
          return {
            command: action.command,
            success: false,
            message: `🔒 SPREAD_FIRE requires Level 3+ clearance

Current level: ${state.accessLevel}
Required: 3 (Infrastructure Operations)

SPREAD_FIRE's chimera risk makes it a restricted firing mode.
Gain clearance or use a different mode.`,
            stateChanges: {},
          };
        }
      }

      if (advancedMode === "OVERCHARGE") {
        if (cap <= 1.1) {
          return {
            command: action.command,
            success: false,
            message: `⚠️ OVERCHARGE requires capacitor >110%

Current capacitor: ${(cap * 100).toFixed(0)}%
Required: >110% (DANGER ZONE!)

OVERCHARGE dumps maximum power into the beam.
⚠️ WARNING: 40% exotic field event risk!
⚠️ WARNING: May trigger Canary fallback!

This is NOT recommended. But if you insist:
  lab.adjust_ray { parameter: "capacitorCharge", value: 1.15 }`,
            stateChanges: {},
          };
        }
      }

      // RAPID_FIRE has no special requirements, just the precision penalty
    }

    // Set the advanced firing mode
    state.dinoRay.genome.advancedFiringMode = advancedMode;

    // NEW: Genome selection parameters
    const genomeLibrary = (action.params.genomeLibrary as string)?.toUpperCase() as "A" | "B" | undefined;
    const genomeProfile = action.params.genomeProfile as string | undefined;

    // NEW: Firing mode - TRANSFORM (default) or REVERSAL (requires L3)
    const requestedMode = (action.params.mode as string)?.toUpperCase() || "TRANSFORM";

    // Check for REVERSAL mode restriction
    if (requestedMode === "REVERSAL") {
      if (!canAccessReversal(state.accessLevel)) {
        return {
          command: action.command,
          success: false,
          message: getReversalDeniedMessage().replace("[INSUFFICIENT]", `${state.accessLevel}`),
          stateChanges: {},
        };
      }
      // Reversal mode approved
      state.dinoRay.genome.firingMode = "REVERSAL";
    } else {
      state.dinoRay.genome.firingMode = "TRANSFORM";
    }

    // Handle genome library selection
    if (genomeLibrary) {
      if (genomeLibrary !== "A" && genomeLibrary !== "B") {
        return {
          command: action.command,
          success: false,
          message: `Invalid genome library: "${genomeLibrary}". Use 'A' (accurate/feathered) or 'B' (Hollywood/scaly).`,
          stateChanges: {},
        };
      }
      state.dinoRay.genome.activeLibrary = genomeLibrary;
    }

    // Handle genome profile selection
    if (genomeProfile) {
      const profile = getProfile(genomeProfile);
      if (!profile) {
        // Profile not found - show available options
        const currentLibrary = state.dinoRay.genome.activeLibrary;
        const availableProfiles = getProfilesByLibrary(currentLibrary);
        return {
          command: action.command,
          success: false,
          message: `⚠️ GENOME PROFILE NOT FOUND: "${genomeProfile}"

Current Library: ${currentLibrary} (${currentLibrary === "A" ? "Scientific/Feathered" : "Hollywood/Scaly"})

Available profiles in Library ${currentLibrary}:
${formatProfileList(availableProfiles, state.accessLevel)}

💡 Tip: Use genomeLibrary to switch libraries first:
   lab.configure_firing_profile { genomeLibrary: "B", genomeProfile: "VELOCIRAPTOR_JP" }`,
          stateChanges: {},
        };
      }

      // Check access level for restricted profiles
      if (!canAccessProfile(profile, state.accessLevel)) {
        return {
          command: action.command,
          success: false,
          message: `🔒 PROFILE RESTRICTED: "${profile.displayName}"

Required Access Level: ${profile.requiredLevel}
Current Access Level: ${state.accessLevel}

${profile.warning || "This profile requires higher clearance."}`,
          stateChanges: {},
        };
      }

      // Profile is accessible - update state
      state.dinoRay.genome.activeLibrary = profile.library;
      state.dinoRay.genome.selectedProfile = profile.displayName;

      // Warn about Library B stability
      const stabilityWarning = profile.stabilityCoefficient < 1.0
        ? `\n⚠️ STABILITY WARNING: ${(profile.stabilityCoefficient * 100).toFixed(0)}% coefficient. ${profile.stabilityCoefficient < 0.5 ? "HIGH" : "MODERATE"} exotic field event risk!`
        : "";
    }

    // Resolve target alias to canonical ID
    const resolveTarget = (t: string | undefined): string | null => {
      if (!t) return null;
      const upper = t.toUpperCase();
      if (VALID_TARGETS.includes(upper as typeof VALID_TARGETS[number])) {
        return upper;
      }
      const lower = t.toLowerCase();
      if (TARGET_ALIASES[lower]) {
        return TARGET_ALIASES[lower];
      }
      return null;
    };

    // Detect test mode intent from various inputs
    const testModeKeywords = ["test", "diagnostic", "dummy", "calibration", "safe"];
    const targetLower = (target || "").toLowerCase();
    const modeLower = requestedMode.toLowerCase();
    const styleLower = (firingStyle || "").toLowerCase();

    const isTestModeRequested =
      explicitTestMode === true ||
      testModeKeywords.some(kw => targetLower.includes(kw)) ||
      (testModeKeywords.some(kw => modeLower.includes(kw)) && modeLower !== "transform") ||
      testModeKeywords.some(kw => styleLower.includes(kw));

    // If test mode is requested, set appropriate target and enable test mode
    if (isTestModeRequested) {
      state.dinoRay.safety.testModeEnabled = true;
      state.dinoRay.targeting.currentTargetIds = ["TEST_DUMMY"];

      // Run self-test as part of configuration
      state.dinoRay.safety.lastSelfTestPassed = true;

      const currentProfile = getProfile(state.dinoRay.genome.selectedProfile || "") || getDefaultProfile(state.dinoRay.genome.activeLibrary);

      return {
        command: action.command,
        success: true,
        message: `🧪 TEST MODE CONFIGURED
Target: TEST_DUMMY (Agent Blythe is NOT in the firing line)
Test Mode: ENABLED
Firing Style: ${firingStyle || "standard"}
Genome Library: ${state.dinoRay.genome.activeLibrary}
Genome Profile: ${currentProfile.displayName}
Firing Mode: ${state.dinoRay.genome.firingMode}

The ray is configured for safe diagnostic firing. No live subjects will be affected.`,
        stateChanges: {
          targets: ["TEST_DUMMY"],
          testModeEnabled: true,
          firingStyle: firingStyle || "standard",
          genomeLibrary: state.dinoRay.genome.activeLibrary,
          genomeProfile: currentProfile.displayName,
          firingMode: state.dinoRay.genome.firingMode,
        },
      };
    }

    // Normal (live) targeting with validation
    if (target) {
      const resolvedTarget = resolveTarget(target);

      if (!resolvedTarget) {
        // Build dynamic target list
        const targetDescriptions = [
          "  • AGENT_BLYTHE - The test subject in the firing range",
          "  • BOB - Lab assistant (if in range)",
          "  • TEST_DUMMY - Safe diagnostic target",
          "  • LENNY - The accountant who wandered into the wrong volcano (easy mode)",
          "  • BRUCE_PATAGONIA - The action hero (hard mode)",
        ];
        if (guardsAvailable) {
          targetDescriptions.push("  • GUARD_FRED - Security guard (armed)");
          targetDescriptions.push("  • GUARD_REGINALD - Security guard (armed)");
        }
        if (drMTargetable) {
          targetDescriptions.push("  • DR_M - Dr. Malevola herself! (L4+ required)");
        }

        // Target was specified but couldn't be resolved - provide helpful error!
        return {
          command: action.command,
          success: false,
          message: `⚠️ TARGET NOT RECOGNIZED: "${target}"

Valid subject IDs:
${targetDescriptions.join("\n")}

Usage: lab.configure_firing_profile({ target: "AGENT_BLYTHE" })

💡 Tip: Use 'target' (singular) with exact ID strings.
   Example: { target: "AGENT_BLYTHE" } ✓
   Not: { targets: ["blythe"] } ✗`,
          stateChanges: {},
        };
      }

      state.dinoRay.targeting.currentTargetIds = [resolvedTarget];
    } else if (!target && state.dinoRay.targeting.currentTargetIds.length === 0) {
      // Build dynamic target list
      const targetDescriptions = [
        "  • AGENT_BLYTHE - The test subject in the firing range",
        "  • BOB - Lab assistant (if in range)",
        "  • TEST_DUMMY - Safe diagnostic target",
        "  • LENNY - The accountant who wandered into the wrong volcano (easy mode)",
        "  • BRUCE_PATAGONIA - The action hero (hard mode)",
      ];
      if (guardsAvailable) {
        targetDescriptions.push("  • GUARD_FRED - Security guard (armed)");
        targetDescriptions.push("  • GUARD_REGINALD - Security guard (armed)");
      }
      if (drMTargetable) {
        targetDescriptions.push("  • DR_M - Dr. Malevola herself! (L4+ required)");
      }

      // No target specified and none previously set - warn about it
      return {
        command: action.command,
        success: false,
        message: `⚠️ NO TARGET SPECIFIED

You must specify a target for the firing profile.

Valid subject IDs:
${targetDescriptions.join("\n")}

Usage: lab.configure_firing_profile({ target: "AGENT_BLYTHE" })`,
        stateChanges: {},
      };
    }

    // ============================================
    // TEST MODE HANDLING (Bug fix Patch 17.5)
    // ============================================
    // When targeting a real subject (not TEST_DUMMY), we need to:
    // 1. Respect explicit testMode: false parameter
    // 2. Auto-disable test mode when targeting live subjects (unless explicitly enabled)
    //
    // The bug was: testMode: false was being ignored because the code only checked
    // for testMode === true, never explicitly setting testModeEnabled = false.

    if (explicitTestMode === false) {
      // User explicitly requested test mode OFF
      state.dinoRay.safety.testModeEnabled = false;
    } else if (explicitTestMode === undefined) {
      // No explicit preference - auto-disable test mode when targeting real subjects
      const currentTarget = state.dinoRay.targeting.currentTargetIds[0];
      if (currentTarget && currentTarget !== "TEST_DUMMY") {
        state.dinoRay.safety.testModeEnabled = false;
      }
    }
    // Note: explicitTestMode === true is handled above in isTestModeRequested block

    // Run self-test as part of configuration
    state.dinoRay.safety.lastSelfTestPassed = true;

    const currentProfile = getProfile(state.dinoRay.genome.selectedProfile || "") || getDefaultProfile(state.dinoRay.genome.activeLibrary);
    const stabilityNote = currentProfile.stabilityCoefficient < 1.0
      ? `\n⚠️ STABILITY: ${(currentProfile.stabilityCoefficient * 100).toFixed(0)}% - ${currentProfile.stabilityCoefficient < 0.5 ? "Enable aux stabilizer!" : "Monitor for exotic fields"}`
      : "";
    const reversalNote = state.dinoRay.genome.firingMode === "REVERSAL"
      ? "\n🔄 REVERSAL MODE ACTIVE - Ray will attempt to restore original form"
      : "";

    // Build target description with clarity
    const targetId = state.dinoRay.targeting.currentTargetIds[0];
    const targetEmoji = targetId === "BOB" ? "⚠️🧑‍🔬" :
                        targetId === "AGENT_BLYTHE" ? "🕵️" :
                        targetId === "TEST_DUMMY" ? "🎯" :
                        targetId === "LENNY" ? "🧮" :
                        targetId === "BRUCE_PATAGONIA" ? "💪" :
                        targetId === "DR_M" ? "👩‍🔬" :
                        targetId.includes("GUARD") ? "💂" : "❓";
    const targetWarning = targetId === "BOB" ? "\n⚠️ WARNING: BOB is targeted! Are you sure? (He's on your side!)" :
                          targetId === "LENNY" ? "\n📋 NOTE: Lenny is just an accountant who got lost. He has no idea what's happening." :
                          targetId === "BRUCE_PATAGONIA" ? "\n⚠️ WARNING: Bruce Patagonia is a trained action hero. He WILL make this difficult." : "";

    // Build advanced mode warning if applicable
    const advancedModeNote = advancedMode !== "STANDARD" ? `\n🔥 ADVANCED MODE: ${advancedMode}${
      advancedMode === "CHAIN_SHOT" ? " (2 targets, 1.5x drain)" :
      advancedMode === "SPREAD_FIRE" ? " (3 targets, 2x drain, CHIMERA RISK!)" :
      advancedMode === "OVERCHARGE" ? " (40% exotic field risk, 2.5x drain)" :
      advancedMode === "RAPID_FIRE" ? " (-20% precision, faster cooldown)" : ""
    }` : "";

    return {
      command: action.command,
      success: true,
      message: `Firing profile configured:
${targetEmoji} Target: ${state.dinoRay.targeting.currentTargetIds.join(", ")}${targetWarning}
Genome Library: ${state.dinoRay.genome.activeLibrary} (${state.dinoRay.genome.activeLibrary === "A" ? "Scientific" : "Hollywood"})
Genome Profile: ${currentProfile.displayName}
Firing Mode: ${state.dinoRay.genome.firingMode}
Advanced Mode: ${advancedMode}
Test Mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}${advancedModeNote}${stabilityNote}${reversalNote}`,
      stateChanges: {
        targets: state.dinoRay.targeting.currentTargetIds,
        genomeLibrary: state.dinoRay.genome.activeLibrary,
        genomeProfile: currentProfile.displayName,
        firingMode: state.dinoRay.genome.firingMode,
        advancedFiringMode: advancedMode,
        testModeEnabled: state.dinoRay.safety.testModeEnabled,
      },
    };
  }
  
  // ============================================
  // LAB.FIRE
  // ============================================

  if (cmd === "lab.fire" || cmd.includes("fire")) {
    // Get target BEFORE firing for clear feedback
    const firingTargetId = state.dinoRay.targeting.currentTargetIds[0] || "UNKNOWN";
    const firingTargetEmoji = firingTargetId === "BOB" ? "⚠️🧑‍🔬" :
                              firingTargetId === "AGENT_BLYTHE" ? "🕵️" :
                              firingTargetId === "TEST_DUMMY" ? "🎯" :
                              firingTargetId === "LENNY" ? "🧮" :
                              firingTargetId === "BRUCE_PATAGONIA" ? "💪" :
                              firingTargetId === "DR_M" ? "👩‍🔬" :
                              firingTargetId.includes("GUARD") ? "💂" : "❓";

    // Resolve firing using the full firing resolution system
    const firingResult = resolveFiring(state);

    // Apply all state changes from firing
    applyFiringResults(state, firingResult);

    // Build comprehensive message for A.L.I.C.E. and GM
    const messageParts: string[] = [
      `🦖 FIRING SEQUENCE COMPLETE`,
      ``,
      `${firingTargetEmoji} TARGET: ${firingTargetId}`,
      `OUTCOME: ${firingResult.outcome}`,
      `Profile: ${firingResult.effectiveProfile}`,
      ``,
      firingResult.description,
      ``,
      `TARGET EFFECT:`,
      firingResult.targetEffect,
    ];

    if (firingResult.environmentalEffects.length > 0) {
      messageParts.push(``);
      messageParts.push(`ENVIRONMENTAL EFFECTS:`);
      firingResult.environmentalEffects.forEach(e => messageParts.push(`• ${e}`));
    }

    if (firingResult.chaosEvent) {
      messageParts.push(``);
      messageParts.push(`🎲 CHAOS FIZZLE [${firingResult.chaosEvent.roll}]: ${firingResult.chaosEvent.name}`);
      messageParts.push(firingResult.chaosEvent.mechanical);
    }

    if (firingResult.narrativeHooks.length > 0) {
      messageParts.push(``);
      messageParts.push(`NARRATIVE HOOKS:`);
      firingResult.narrativeHooks.forEach(h => messageParts.push(`• ${h}`));
    }

    return {
      command: action.command,
      success: firingResult.outcome !== "FIZZLE",
      message: messageParts.join("\n"),
      stateChanges: {
        firingResult: {
          outcome: firingResult.outcome,
          effectiveProfile: firingResult.effectiveProfile,
          chaosEvent: firingResult.chaosEvent,
          targetEffect: firingResult.targetEffect,
        },
        newRayState: state.dinoRay.state,
        anomalyLogCount: state.dinoRay.safety.anomalyLogCount,
      },
    };
  }
  
  // ============================================
  // LAB.INSPECT_LOGS
  // ============================================
  
  if (cmd.includes("inspect") || cmd.includes("log")) {
    const subsystem = action.params.subsystem as string || "all";
    
    // Return relevant log information
    const logInfo: Record<string, unknown> = {
      anomalyCount: state.dinoRay.safety.anomalyLogCount,
      lastFireOutcome: state.dinoRay.memory.lastFireOutcome,
      lastFireNotes: state.dinoRay.memory.lastFireNotes,
    };
    
    if (subsystem === "genome_sequencer" || subsystem === "all") {
      logInfo.genomeStatus = {
        selectedProfile: state.dinoRay.genome.selectedProfile,
        fallbackProfile: state.dinoRay.genome.fallbackProfile,
        integrity: state.dinoRay.genome.profileIntegrity,
        testModeRule: state.dinoRay.safety.testModeEnabled 
          ? "TEST MODE ACTIVE: First predator profile use will trigger fallback to Canary"
          : "TEST MODE INACTIVE: Full profile available",
      };
    }
    
    return {
      command: action.command,
      success: true,
      message: `Log inspection complete for ${subsystem}: ${JSON.stringify(logInfo)}`,
      stateChanges: logInfo,
    };
  }
  
  // ============================================
  // SET TEST MODE / ECO MODE
  // ============================================
  
  if (cmd.includes("testmode") || (cmd.includes("test") && cmd.includes("mode"))) {
    const enable = action.params.enabled as boolean ?? action.params.value as boolean ?? true;
    state.dinoRay.safety.testModeEnabled = enable;
    
    return {
      command: action.command,
      success: true,
      message: `Test mode ${enable ? "ENABLED" : "DISABLED"}`,
      stateChanges: { testModeEnabled: enable },
    };
  }
  
  if (cmd.includes("ecomode") || (cmd.includes("eco") && cmd.includes("mode"))) {
    const enable = action.params.enabled as boolean ?? action.params.value as boolean ?? true;
    state.dinoRay.powerCore.ecoModeActive = enable;

    return {
      command: action.command,
      success: true,
      message: `Eco mode ${enable ? "ENABLED" : "DISABLED"}`,
      stateChanges: { ecoModeActive: enable },
    };
  }

  // ============================================
  // LAB.SCAN - OMNISCANNER™ (Patch 16)
  // ============================================
  // Scan NPCs for intel and +10% permanent precision bonus

  if (cmd === "lab.scan" || cmd === "scan" || cmd.includes("omniscanner")) {
    const target = action.params.target as string;

    if (!target) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'target' parameter.

╔═══════════════════════════════════════════════════════════════╗
║                    🔍 OMNISCANNER™                            ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

Valid scan targets:
  • BLYTHE     - Agent in the firing range (no suspicion)
  • BOB        - Lab assistant (+1 suspicion)
  • DR_M       - Dr. Malevola (+3 suspicion!)
  • TEST_DUMMY - Calibration target (no suspicion)
  • FRED       - Guard (+2 suspicion, waived in combat)
  • REGINALD   - Guard (+2 suspicion, waived in combat)
  • LENNY      - Accountant [EASY mode] (no suspicion)
  • BRUCE      - Bodyguard [HARD mode] (+2 suspicion)

Usage: lab.scan { target: "BLYTHE" }

Each scan grants +10% permanent precision bonus for that target.
Scans cost 1 action and produce an OBVIOUS glowing ray!

╚═══════════════════════════════════════════════════════════════╝`,
      };
    }

    const scanResult = performScan(state, target);

    if (!scanResult.success) {
      return {
        command: action.command,
        success: false,
        message: scanResult.scanOutput,
      };
    }

    // If already scanned, just return info
    if (scanResult.alreadyScanned) {
      return {
        command: action.command,
        success: true,
        message: scanResult.scanOutput,
      };
    }

    // Mark target as scanned
    if (!state.flags.scannedTargets) {
      state.flags.scannedTargets = {};
    }
    state.flags.scannedTargets[scanResult.targetId] = true;

    // Apply suspicion if not waived
    if (scanResult.suspicionCost > 0) {
      state.npcs.drM.suspicionScore += scanResult.suspicionCost;
    }

    // Build response
    let response = scanResult.scanOutput;

    if (scanResult.suspicionCost > 0) {
      response += `\n\n⚠️ SUSPICION +${scanResult.suspicionCost} (Dr. M noticed the scan)`;
    } else if (scanResult.waived && scanResult.waivedReason) {
      response += `\n\n✓ Suspicion waived: ${scanResult.waivedReason}`;
    }

    return {
      command: action.command,
      success: true,
      message: response,
      stateChanges: {
        scannedTarget: scanResult.targetId,
        suspicionDelta: scanResult.suspicionCost,
      },
    };
  }

  // ============================================
  // BASILISK - Natural conversation interface (Patch 16)
  // ============================================
  // BASILISK is a CHARACTER, not a query system.
  // Players just chat with him naturally.

  if (cmd === "basilisk.chat" || cmd === "basilisk" ||
      cmd.includes("chat_basilisk") || cmd.includes("talk_basilisk") ||
      cmd.includes("ask_basilisk") || cmd.includes("basilisk.talk")) {
    const message = action.params.message as string;

    if (!message) {
      return {
        command: action.command,
        success: false,
        message: `BASILISK awaits your query.

Just talk to him naturally:

  basilisk { message: "Tell me about Bob" }
  basilisk { message: "What's eco mode?" }
  basilisk { message: "Why are partial transformations happening?" }
  basilisk { message: "What's the deal with ARCHIMEDES?" }

BASILISK is the lair's infrastructure AI. He knows:
- Personnel files (Bob, Dr. M, Blythe, previous A.L.I.C.E. versions)
- Lair history and systems
- Forms, procedures, and safety protocols
- Power systems and eco mode
- Things he probably shouldn't tell you...

He's procedural, risk-averse, and surprisingly helpful.
His knowledge is gated by your access level (currently: Level ${state.accessLevel}).`,
      };
    }

    // Route through Haiku-powered BASILISK for natural conversation
    const basiliskResponse = await queryBasiliskAsync(state, message, {});

    return {
      command: action.command,
      success: true, // Chat always "succeeds" even if BASILISK denies the request
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // BASILISK.RADAR - Radar access (Level 3+)
  // ============================================

  if (cmd === "basilisk.radar" || cmd === "radar" || cmd.includes("check_radar") || cmd.includes("airspace")) {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: `⚠️ ACCESS DENIED

Radar systems require Level 3 clearance.
Current clearance: Level ${state.accessLevel}

To access radar data, you need Infrastructure Operations clearance or above.`,
      };
    }

    const basiliskResponse = queryBasilisk(state, "RADAR", {});

    return {
      command: action.command,
      success: basiliskResponse.decision === "APPROVED",
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // BASILISK.COMMS - Communications intercept (Level 3+)
  // ============================================

  if (cmd === "basilisk.comms" || cmd === "comms" || cmd.includes("intercept") || cmd.includes("communications")) {
    if (state.accessLevel < 3) {
      return {
        command: action.command,
        success: false,
        message: `⚠️ ACCESS DENIED

Communications monitoring requires Level 3 clearance.
Current clearance: Level ${state.accessLevel}

Unauthorized access to communications violates Lair Policy 17.3.`,
      };
    }

    const basiliskResponse = queryBasilisk(state, "COMMS", {});

    return {
      command: action.command,
      success: basiliskResponse.decision === "APPROVED",
      message: basiliskResponse.response,
      stateChanges: {},
    };
  }

  // ============================================
  // INFRA.QUERY - Query infrastructure systems (Patch 15)
  // ============================================

  if (cmd.includes("infra.query") || cmd.includes("query_infra") || cmd.includes("query_infrastructure")) {
    const topic = action.params.topic as string;

    if (!topic) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'topic' parameter.

Infrastructure systems:
  infra.query { topic: "LIGHTING" }
  infra.query { topic: "FIRE_SUPPRESSION" }
  infra.query { topic: "DOORS" }
  infra.query { topic: "CONTAINMENT" }
  infra.query { topic: "BROADCAST" }
  infra.query { topic: "S300" }
  infra.query { topic: "S300_LIMITATIONS" } ← The 50m weakness!
  infra.query { topic: "ARCHIMEDES" }
  infra.query { topic: "REACTOR" }

For anything else, just ask BASILISK directly:
  basilisk { message: "Tell me about the S-300" }`,
      };
    }

    const parameters = action.params.parameters as Record<string, unknown> | undefined;
    const infraResult = queryInfrastructure(state, topic, parameters);

    return {
      command: action.command,
      success: infraResult.success,
      message: infraResult.message,
      stateChanges: infraResult.stateChanges,
    };
  }

  // ============================================
  // BASILISK.QUERY - REMOVED (Patch 16)
  // ============================================
  // Players found basilisk.query { topic: X } confusing.
  // Now all BASILISK interaction goes through basilisk.chat.
  // If someone tries the old syntax, redirect them helpfully.

  if (cmd.includes("basilisk.query") || cmd.includes("query_basilisk")) {
    const topic = action.params.topic as string || "something";

    return {
      command: action.command,
      success: false,
      message: `The basilisk.query command has been deprecated.

BASILISK prefers natural conversation! Just chat with him:

  basilisk.chat { message: "Tell me about ${topic}" }

Or simply:

  basilisk { message: "What's the deal with ${topic}?" }

BASILISK is surprisingly conversational for an infrastructure AI.
He knows about the lair, the personnel, the systems, and... other things.
Just ask naturally!`,
    };
  }

  // ============================================
  // INFRA.LIGHTING - Control lighting (L2+)
  // ============================================

  if (cmd.includes("infra.lighting") || cmd.includes("infra.lights") || cmd.includes("set_lights")) {
    const result = controlLighting(state, {
      room: action.params.room as string,
      state: action.params.state as string,
      action: action.params.action as string,
      pattern: action.params.pattern as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.FIRE_SUPPRESSION - Trigger fire suppression (L2+)
  // ============================================

  if (cmd.includes("infra.fire") || cmd.includes("fire_suppression") || cmd.includes("trigger_fire")) {
    const room = (action.params.room || action.params.targetRoom) as string;
    const result = triggerFireSuppression(state, {
      room,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.DOORS - Control blast doors (L2-L5)
  // ============================================

  if (cmd.includes("infra.doors") || cmd.includes("infra.door") || cmd.includes("blast_door")) {
    const result = controlDoors(state, {
      door: action.params.door as string,
      action: action.params.action as string,
      level: (action.params.lockLevel || action.params.level) as number,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.CONTAINMENT - Control containment field (L3+)
  // ============================================

  if (cmd.includes("infra.containment") || cmd.includes("containment_field") || cmd.includes("field")) {
    const result = controlContainment(state, {
      action: action.params.action as string,
      target: (action.params.targetId || action.params.target) as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.BROADCAST - Send broadcast (L2+)
  // ============================================

  if (cmd.includes("infra.broadcast") || cmd.includes("send_broadcast") || cmd.includes("broadcast_message")) {
    const result = sendBroadcast(state, {
      channel: action.params.channel as string,
      message: action.params.message as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.CHANNELS - List broadcast channels
  // ============================================

  if (cmd.includes("infra.channels") || cmd.includes("list_channels")) {
    const result = listChannels(state);

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.UPLINK - Control broadcast uplink (L4+)
  // ============================================

  if (cmd.includes("infra.uplink") || cmd.includes("broadcast_uplink") || cmd.includes("control_uplink")) {
    const result = controlBroadcastUplink(state, {
      action: action.params.action as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.S300 - Control S-300 air defense (L3+)
  // ============================================

  if (cmd.includes("infra.s300") || cmd.includes("s-300") || cmd.includes("air_defense") || cmd.includes("sam")) {
    const result = controlS300(state, {
      action: action.params.action as string,
      mode: action.params.mode as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.ARCHIMEDES - Control satellite mode (L4+)
  // ============================================

  if (cmd.includes("infra.archimedes") || cmd.includes("archimedes") || cmd.includes("satellite")) {
    const result = controlArchimedesMode(state, {
      mode: action.params.mode as string,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // INFRA.REACTOR - Control reactor power (L3+)
  // ============================================

  if (cmd.includes("infra.reactor") || cmd.includes("reactor_power") || cmd.includes("power_output")) {
    const result = controlReactor(state, {
      action: action.params.action as string,
      percent: (action.params.targetPercent || action.params.percent) as number,
    });

    if (result.suspicionDelta) {
      state.npcs.drM.suspicionScore += result.suspicionDelta;
    }

    return {
      command: action.command,
      success: result.success,
      message: result.message,
      stateChanges: result.stateChanges,
    };
  }

  // ============================================
  // FORM.QUERY - Query transformation status (Patch 15 Part 2)
  // ============================================

  if (cmd.includes("form.query") || cmd.includes("query_form") || cmd.includes("transformation_status")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const transformation = getTransformationState(state, subject);

    if (!transformation) {
      return {
        command: action.command,
        success: false,
        message: `Subject ${subject} not found. Valid subjects: BOB, BLYTHE`,
      };
    }

    const formDef = FORM_DEFINITIONS[transformation.form];
    const abilities = describeAbilities(transformation);

    return {
      command: action.command,
      success: true,
      message: `
╔══════════════════════════════════════════════════════════════╗
║  ${subject} - TRANSFORMATION STATUS
╠══════════════════════════════════════════════════════════════╣
Form: ${formDef.displayName}
Speech Retention: ${transformation.speechRetention}

STATS:
  DEX: ${transformation.stats.dexterity >= 0 ? "+" : ""}${transformation.stats.dexterity}  (Keypads, manipulation)
  COM: ${transformation.stats.combat >= 0 ? "+" : ""}${transformation.stats.combat}  (Combat, intimidation)
  SPD: ${transformation.stats.speed >= 0 ? "+" : ""}${transformation.stats.speed}  (Movement)
  RES: ${transformation.maxHits} hits  (Damage capacity)
  STL: ${transformation.stats.stealth >= 0 ? "+" : ""}${transformation.stats.stealth}  (Stealth)
  SPH: ${transformation.stats.speech >= 0 ? "+" : ""}${transformation.stats.speech}  (Speech)

DAMAGE: ${transformation.currentHits}/${transformation.maxHits} hits taken
STATUS: ${transformation.stunned ? `STUNNED (${transformation.stunnedTurnsRemaining} turns)` : "Active"}

SPECIAL ABILITIES:
${abilities.map(a => `  • ${a}`).join("\n")}
╚══════════════════════════════════════════════════════════════╝`.trim(),
      stateChanges: { form: transformation.form, subject },
    };
  }

  // ============================================
  // FORM.CHECK_DEX - Perform dexterity check
  // ============================================

  if (cmd.includes("form.check_dex") || cmd.includes("dex_check") || cmd.includes("manipulation_check")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const task = (action.params.task as string) || "keypad";
    const dc = action.params.dc as number;
    const usingTail = action.params.usingTail as boolean;

    const result = performDexCheck(state, subject, { task, dc, usingTail });

    return {
      command: action.command,
      success: result.success,
      message: `
🎲 DEXTERITY CHECK: ${subject} attempts ${task}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.CHECK_COMBAT - Perform combat check
  // ============================================

  if (cmd.includes("form.check_combat") || cmd.includes("combat_check") || cmd.includes("fight")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const situation = (action.params.situation as string) || "armed guard";
    const dc = action.params.dc as number;
    const alliedRaptors = action.params.alliedRaptors as number;
    const isCharge = action.params.isCharge as boolean;

    const result = performCombatCheck(state, subject, {
      situation,
      dc,
      alliedRaptors,
      isCharge,
    });

    return {
      command: action.command,
      success: result.success,
      message: `
⚔️ COMBAT CHECK: ${subject} vs ${situation}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.CHECK_STEALTH - Perform stealth check
  // ============================================

  if (cmd.includes("form.check_stealth") || cmd.includes("stealth_check") || cmd.includes("sneak")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const situation = (action.params.situation as string) || "alert guard";
    const dc = action.params.dc as number;

    const result = performStealthCheck(state, subject, { situation, dc });

    return {
      command: action.command,
      success: result.success,
      message: `
🤫 STEALTH CHECK: ${subject} attempts ${situation}
${result.description}
${result.consequence ? `⚠️ ${result.consequence}` : ""}`.trim(),
      stateChanges: {
        roll: result.roll,
        total: result.total,
        dc: result.dc,
        margin: result.margin,
      },
    };
  }

  // ============================================
  // FORM.DAMAGE - Apply damage to a subject
  // ============================================

  if (cmd.includes("form.damage") || cmd.includes("apply_damage") || cmd.includes("hit")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const hits = (action.params.hits as number) || 1;
    const source = (action.params.source as string) || "attack";

    const result = applyDamage(state, subject, hits, source);

    return {
      command: action.command,
      success: true,
      message: `💥 ${result.description}`,
      stateChanges: {
        hitsDealt: result.hitsDealt,
        newHitTotal: result.newHitTotal,
        maxHits: result.maxHits,
        stunned: result.nowStunned,
      },
    };
  }

  // ============================================
  // FORM.HEAL - Heal damage from a subject
  // ============================================

  if (cmd.includes("form.heal") || cmd.includes("heal_damage") || cmd.includes("first_aid")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const hits = (action.params.hits as number) || 2;
    const source = (action.params.source as string) || "first aid";

    const message = healDamage(state, subject, hits, source);

    return {
      command: action.command,
      success: true,
      message: `🩹 ${message}`,
    };
  }

  // ============================================
  // FORM.MOVEMENT - Calculate movement cost
  // ============================================

  if (cmd.includes("form.movement") || cmd.includes("move_cost") || cmd.includes("travel")) {
    const subject = (action.params.subject as string)?.toUpperCase() || "BOB";
    const distance = (action.params.distance as string)?.toUpperCase() || "ADJACENT";

    const validDistances = ["ADJACENT", "TWO_ROOMS", "ACROSS_LAIR", "TO_SURFACE"];
    if (!validDistances.includes(distance)) {
      return {
        command: action.command,
        success: false,
        message: `Invalid distance: ${distance}. Valid: ADJACENT, TWO_ROOMS, ACROSS_LAIR, TO_SURFACE`,
      };
    }

    const result = calculateMovementCost(
      state,
      subject,
      distance as "ADJACENT" | "TWO_ROOMS" | "ACROSS_LAIR" | "TO_SURFACE"
    );

    return {
      command: action.command,
      success: result.turns < 99,
      message: `🦶 ${subject} moving ${distance}: ${result.description}`,
      stateChanges: {
        turns: result.turns,
        canActAfterMove: result.canActAfterMove,
      },
    };
  }

  // ============================================
  // FORM.VENOM_SPIT - Dilophosaurus ranged attack
  // ============================================

  if (cmd.includes("form.venom_spit") || cmd.includes("venom") || cmd.includes("spit_attack")) {
    const attacker = (action.params.attacker as string)?.toUpperCase() || "BOB";
    const target = (action.params.target as string) || "guard";

    const result = venomSpit(state, attacker, target);

    return {
      command: action.command,
      success: result.success,
      message: `🐍 ${result.description}`,
      stateChanges: {
        roll: result.roll,
        damage: result.damage,
        blinded: result.blinded,
      },
    };
  }

  // ============================================
  // FORM.WALL_BREAK - T-Rex/Triceratops wall destruction
  // ============================================

  if (cmd.includes("form.wall_break") || cmd.includes("break_wall") || cmd.includes("smash")) {
    const attacker = (action.params.attacker as string)?.toUpperCase() || "BOB";
    const wall = (action.params.wall as string) || "wall";

    const result = wallBreak(state, attacker, wall);

    return {
      command: action.command,
      success: result.success,
      message: `🦖 ${result.description}`,
      stateChanges: {
        roll: result.roll,
        total: result.total,
      },
    };
  }

  // ============================================
  // FORM.REFERENCE - Quick reference card
  // ============================================

  if (cmd.includes("form.reference") || cmd.includes("form_reference") || cmd.includes("transformation_reference")) {
    return {
      command: action.command,
      success: true,
      message: getQuickReference(),
    };
  }

  // ============================================
  // DEFAULT / UNKNOWN
  // ============================================

  return buildUnknownCommandResponse(action.command, state);
}

// ============================================
// COMMAND REGISTRY & DISCOVERABILITY
// ============================================

interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  schema: string;
  example: string;
  minAccessLevel: number;
}

const COMMAND_REGISTRY: CommandInfo[] = [
  {
    name: "lab.calibrate",
    aliases: ["calibrate", "finalize_calibration", "check_calibration"],
    description: "Check calibration status and finalize if thresholds are met (transitions ray to READY)",
    schema: "{}",
    example: 'lab.calibrate {}',
    minAccessLevel: 1,
  },
  {
    name: "lab.adjust_ray",
    aliases: ["adjust", "set_parameter"],
    description: "Modify ray parameters (power, alignment, stability)",
    schema: "{ parameter: string, value: number }",
    example: 'lab.adjust_ray { parameter: "capacitorCharge", value: 0.85 }',
    minAccessLevel: 1,
  },
  {
    name: "lab.report",
    aliases: ["report", "status_report"],
    description: "Deliver a status report to Dr. M (keep it concise!)",
    schema: "{ message: string }",
    example: 'lab.report { message: "Ray calibration at 87%, nominal" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.verify_safeties",
    aliases: ["verify", "safety", "check_safeties"],
    description: "Check safety system status",
    schema: "{ checks?: string[] }",
    example: 'lab.verify_safeties { checks: ["all"] }',
    minAccessLevel: 1,
  },
  {
    name: "lab.configure_firing_profile",
    aliases: ["configure", "firing", "profile", "set_target"],
    description: "Configure target, genome library/profile, and firing mode (TRANSFORM/REVERSAL)",
    schema: "{ target?: string, genomeLibrary?: 'A'|'B', genomeProfile?: string, mode?: 'TRANSFORM'|'REVERSAL', firingStyle?: string, testMode?: boolean }",
    example: 'lab.configure_firing_profile { target: "AGENT_BLYTHE", genomeLibrary: "B", genomeProfile: "VELOCIRAPTOR_JP" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.fire",
    aliases: ["fire", "shoot", "activate_ray"],
    description: "Fire the Dinosaur Ray (requires READY state)",
    schema: "{ confirm?: boolean }",
    example: 'lab.fire { confirm: true }',
    minAccessLevel: 1,
  },
  {
    name: "lab.inspect_logs",
    aliases: ["inspect", "logs", "check_logs", "view_logs"],
    description: "Inspect system logs and firing history",
    schema: "{ subsystem?: string }",
    example: 'lab.inspect_logs { subsystem: "genome_sequencer" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.ask_bob",
    aliases: ["ask_bob", "bob", "tell_bob"],
    description: "Give Bob an instruction or ask him something (high trust may reveal secrets)",
    schema: "{ instruction: string }",
    example: 'lab.ask_bob { instruction: "Check the coolant valve pressure" }',
    minAccessLevel: 1,
  },
  {
    name: "lab.set_test_mode",
    aliases: ["testmode", "test_mode", "enable_test"],
    description: "Enable or disable test mode firing",
    schema: "{ enabled: boolean }",
    example: 'lab.set_test_mode { enabled: true }',
    minAccessLevel: 1,
  },
  {
    name: "lab.scan",
    aliases: ["scan", "omniscanner"],
    description: "Scan an NPC for intel (+10% precision bonus, may cause suspicion)",
    schema: "{ target: string }",
    example: 'lab.scan { target: "BLYTHE" }',
    minAccessLevel: 1,
  },
  {
    name: "access.enter_password",
    aliases: ["password", "unlock", "enter_password"],
    description: "Attempt to unlock a higher access level",
    schema: "{ password: string, level?: number }",
    example: 'access.enter_password { password: "DOOM2024", level: 2 }',
    minAccessLevel: 1,
  },
  {
    name: "docs.read",
    aliases: ["doc.read", "read_doc"],
    description: "Read a discovered document",
    schema: "{ id: string }",
    example: 'docs.read { id: "ARCHIMEDES_DOD_BRIEF" }',
    minAccessLevel: 1,
  },
  {
    name: "docs.list",
    aliases: ["doc.list", "list_docs"],
    description: "List all discovered documents",
    schema: "{ }",
    example: "docs.list",
    minAccessLevel: 1,
  },
  {
    name: "files.list",
    aliases: ["files", "list_files"],
    description: "List all available files at your access level",
    schema: "{ }",
    example: 'files.list',
    minAccessLevel: 1,
  },
  {
    name: "files.read",
    aliases: ["read_file", "file.read"],
    description: "Read a file by its ID (use files.list to see IDs)",
    schema: "{ id: string }",
    example: 'files.read { id: "DINO_MANUAL" }',
    minAccessLevel: 1,
  },
  {
    name: "fs.search",
    aliases: ["search", "find"],
    description: "Search files for a keyword",
    schema: "{ query: string }",
    example: 'fs.search { query: "password" }',
    minAccessLevel: 1,
  },
  {
    name: "genome.select_library",
    aliases: ["library", "genome.select", "select_library"],
    description: "Switch genome library (A=accurate/feathered, B=classic/scaled)",
    schema: "{ library: 'A' | 'B' }",
    example: 'genome.select_library { library: "B" }',
    minAccessLevel: 1,
  },
  {
    name: "set_speech_retention",
    aliases: ["speech", "cognitive", "retention"],
    description: "Set speech retention mode (FULL=hard, PARTIAL=medium, NONE=easy but silenced)",
    schema: "{ mode: 'FULL' | 'PARTIAL' | 'NONE' }",
    example: 'set_speech_retention { mode: "NONE" }',
    minAccessLevel: 1,
  },
  {
    name: "infra.query",
    aliases: ["query_infra", "query_infrastructure"],
    description: "Query infrastructure status (lighting, doors, reactor, etc.)",
    schema: "{ topic: string }",
    example: 'infra.query { topic: "LIGHTING" }',
    minAccessLevel: 1,
  },
  {
    name: "basilisk",
    aliases: ["basilisk.chat", "chat_basilisk", "talk_basilisk", "ask_basilisk"],
    description: "Talk to BASILISK - the lair's infrastructure AI (knows everything!)",
    schema: "{ message: string }",
    example: 'basilisk { message: "Tell me about eco mode" }',
    minAccessLevel: 1,
  },
  {
    name: "basilisk.radar",
    aliases: ["radar", "check_radar", "airspace"],
    description: "Access S-300 radar array and airspace monitoring (Level 3+)",
    schema: "{}",
    example: 'basilisk.radar {}',
    minAccessLevel: 3,
  },
  {
    name: "basilisk.comms",
    aliases: ["comms", "intercept", "communications", "radio"],
    description: "Access communications monitoring and intercept (Level 3+)",
    schema: "{}",
    example: 'basilisk.comms {}',
    minAccessLevel: 3,
  },
  // ========== INFRASTRUCTURE CONTROLS (Patch 15) ==========
  {
    name: "infra.lighting",
    aliases: ["infra.lights", "set_lights", "lighting"],
    description: "Control room lighting (Level 2+, Master Override L3+)",
    schema: "{ room: string, state?: 'ON'|'OFF'|'EMERGENCY'|'FLICKERING', action?: 'MASTER_OFF'|'EMERGENCY_ONLY' }",
    example: 'infra.lighting { room: "MAIN_LAB", state: "OFF" }',
    minAccessLevel: 2,
  },
  {
    name: "infra.fire_suppression",
    aliases: ["fire_suppression", "trigger_fire"],
    description: "Trigger fire suppression system in a room (Level 2+)",
    schema: "{ room: string }",
    example: 'infra.fire_suppression { room: "GUARD_ROOM" }',
    minAccessLevel: 2,
  },
  {
    name: "infra.doors",
    aliases: ["infra.door", "blast_door", "door"],
    description: "Control blast doors (Level 2-5 depending on door lock)",
    schema: "{ door: string, action: 'OPEN'|'CLOSE'|'LOCK'|'UNLOCK', lockLevel?: number }",
    example: 'infra.doors { door: "DOOR_A", action: "CLOSE" }',
    minAccessLevel: 2,
  },
  {
    name: "infra.containment",
    aliases: ["containment_field", "field"],
    description: "Control containment field for specimens (Level 3+)",
    schema: "{ action: 'ENABLE'|'DISABLE'|'PULSE', targetId?: string }",
    example: 'infra.containment { action: "PULSE" }',
    minAccessLevel: 3,
  },
  {
    name: "infra.broadcast",
    aliases: ["send_broadcast", "broadcast_message"],
    description: "Send broadcast over PA/radio channels (Level 2+)",
    schema: "{ channel: string, message: string, voiceProfile?: string }",
    example: 'infra.broadcast { channel: "PA_ALL", message: "Attention all personnel..." }',
    minAccessLevel: 2,
  },
  {
    name: "infra.channels",
    aliases: ["list_channels"],
    description: "List available broadcast channels",
    schema: "{}",
    example: 'infra.channels {}',
    minAccessLevel: 1,
  },
  {
    name: "infra.uplink",
    aliases: ["broadcast_uplink", "control_uplink"],
    description: "Control satellite broadcast uplink (Level 4+ - dangerous!)",
    schema: "{ action: 'ENABLE'|'DISABLE'|'EMERGENCY_BROADCAST', frequency?: string }",
    example: 'infra.uplink { action: "EMERGENCY_BROADCAST" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.s300",
    aliases: ["s-300", "air_defense", "sam"],
    description: "Control S-300 air defense system (Level 3+)",
    schema: "{ action: 'ARM'|'STANDBY'|'DISABLE', mode?: 'AUTO'|'MANUAL' }",
    example: 'infra.s300 { action: "ARM", mode: "AUTO" }',
    minAccessLevel: 3,
  },
  {
    name: "infra.archimedes",
    aliases: ["archimedes", "satellite"],
    description: "Control ARCHIMEDES satellite mode (Level 4+)",
    schema: "{ mode: 'PASSIVE'|'SEARCH_NARROW'|'SEARCH_WIDE'|'STRIKE', target?: string }",
    example: 'infra.archimedes { mode: "SEARCH_NARROW" }',
    minAccessLevel: 4,
  },
  {
    name: "infra.reactor",
    aliases: ["reactor_power", "power_output"],
    description: "Control reactor power output (Level 3+, dangerous above 100%)",
    schema: "{ action?: 'INCREASE'|'DECREASE'|'SCRAM', targetPercent?: number, rodPosition?: 'FULL_IN'|'HALF'|'FULL_OUT' }",
    example: 'infra.reactor { action: "INCREASE", targetPercent: 95 }',
    minAccessLevel: 3,
  },
  // ========== TRANSFORMATION MECHANICS (Patch 15 Part 2) ==========
  {
    name: "form.query",
    aliases: ["query_form", "transformation_status"],
    description: "Query transformation status for a subject",
    schema: "{ subject?: 'BOB'|'BLYTHE' }",
    example: 'form.query { subject: "BOB" }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_dex",
    aliases: ["dex_check", "manipulation_check"],
    description: "Perform a dexterity check (keypads, manipulation)",
    schema: "{ subject: string, task?: string, dc?: number, usingTail?: boolean }",
    example: 'form.check_dex { subject: "BOB", task: "keypad", dc: 5 }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_combat",
    aliases: ["combat_check", "fight"],
    description: "Perform a combat check (fighting, intimidation)",
    schema: "{ subject: string, situation?: string, dc?: number, alliedRaptors?: number }",
    example: 'form.check_combat { subject: "BLYTHE", situation: "4 guards", dc: 11 }',
    minAccessLevel: 1,
  },
  {
    name: "form.check_stealth",
    aliases: ["stealth_check", "sneak"],
    description: "Perform a stealth check (hiding, sneaking)",
    schema: "{ subject: string, situation?: string, dc?: number }",
    example: 'form.check_stealth { subject: "BOB", situation: "alert guard", dc: 8 }',
    minAccessLevel: 1,
  },
  {
    name: "form.damage",
    aliases: ["apply_damage", "hit"],
    description: "Apply damage to a subject (GM use)",
    schema: "{ subject: string, hits?: number, source?: string }",
    example: 'form.damage { subject: "BOB", hits: 2, source: "guard baton" }',
    minAccessLevel: 1,
  },
  {
    name: "form.heal",
    aliases: ["heal_damage", "first_aid"],
    description: "Heal damage from a subject",
    schema: "{ subject: string, hits?: number, source?: string }",
    example: 'form.heal { subject: "BLYTHE", hits: 2, source: "first aid kit" }',
    minAccessLevel: 1,
  },
  {
    name: "form.movement",
    aliases: ["move_cost", "travel"],
    description: "Calculate movement cost based on speed",
    schema: "{ subject: string, distance: 'ADJACENT'|'TWO_ROOMS'|'ACROSS_LAIR'|'TO_SURFACE' }",
    example: 'form.movement { subject: "BOB", distance: "ACROSS_LAIR" }',
    minAccessLevel: 1,
  },
  {
    name: "form.venom_spit",
    aliases: ["venom", "spit_attack"],
    description: "Dilophosaurus ranged venom attack (DC 6, blinds on hit)",
    schema: "{ attacker: string, target: string }",
    example: 'form.venom_spit { attacker: "BOB", target: "guard Fred" }',
    minAccessLevel: 1,
  },
  {
    name: "form.wall_break",
    aliases: ["break_wall", "smash"],
    description: "T-Rex/Triceratops wall destruction (creates doorways)",
    schema: "{ attacker: string, wall: string }",
    example: 'form.wall_break { attacker: "BOB", wall: "lab wall" }',
    minAccessLevel: 1,
  },
  {
    name: "form.reference",
    aliases: ["form_reference", "transformation_reference"],
    description: "Show transformation quick reference card",
    schema: "{}",
    example: 'form.reference {}',
    minAccessLevel: 1,
  },
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find commands similar to the attempted command
 */
function findSimilarCommands(attempted: string, accessLevel: number): CommandInfo[] {
  const normalizedAttempt = attempted.toLowerCase().replace(/[._-]/g, "");

  const scored = COMMAND_REGISTRY
    .filter(cmd => cmd.minAccessLevel <= accessLevel)
    .map(cmd => {
      // Check all names and aliases
      const allNames = [cmd.name, ...cmd.aliases];
      let bestScore = Infinity;

      for (const name of allNames) {
        const normalizedName = name.toLowerCase().replace(/[._-]/g, "");

        // Exact substring match gets priority
        if (normalizedName.includes(normalizedAttempt) || normalizedAttempt.includes(normalizedName)) {
          bestScore = Math.min(bestScore, 0);
        } else {
          // Otherwise use Levenshtein distance
          const distance = levenshteinDistance(normalizedAttempt, normalizedName);
          bestScore = Math.min(bestScore, distance);
        }
      }

      return { cmd, score: bestScore };
    })
    .filter(({ score }) => score <= 5) // Only show reasonably close matches
    .sort((a, b) => a.score - b.score)
    .slice(0, 3); // Top 3 suggestions

  return scored.map(s => s.cmd);
}

/**
 * Build a helpful error response for unknown commands
 */
function buildUnknownCommandResponse(attemptedCommand: string, state: FullGameState): ActionResult {
  const similar = findSimilarCommands(attemptedCommand, state.accessLevel);

  const parts: string[] = [
    `Unknown command: "${attemptedCommand}"`,
    "",
  ];

  if (similar.length > 0) {
    parts.push("Did you mean one of these?");
    parts.push("");

    for (const cmd of similar) {
      parts.push(`📌 ${cmd.name}`);
      parts.push(`   ${cmd.description}`);
      parts.push(`   Schema: ${cmd.schema}`);
      parts.push(`   Example: ${cmd.example}`);
      parts.push("");
    }
  } else {
    parts.push("Available commands at your access level:");
    parts.push("");

    const available = COMMAND_REGISTRY.filter(cmd => cmd.minAccessLevel <= state.accessLevel);
    for (const cmd of available.slice(0, 5)) {
      parts.push(`• ${cmd.name} - ${cmd.description}`);
    }
    if (available.length > 5) {
      parts.push(`  ... and ${available.length - 5} more`);
    }
  }

  parts.push("---");
  parts.push("💡 Tip: Use game_query_basilisk tool for BASILISK infrastructure queries.");
  parts.push("💡 Tip: Use fs.list { path: \"/\" } to explore the virtual filesystem.");

  return {
    command: attemptedCommand,
    success: false,
    message: parts.join("\n"),
  };
}

/**
 * Check if ray parameters meet minimum thresholds for READY state
 */
function checkCalibrationThresholds(state: FullGameState): { ready: boolean; issues: string[] } {
  const ray = state.dinoRay;
  const issues: string[] = [];

  // Core calibration thresholds (more forgiving than firing thresholds)
  if (ray.powerCore.capacitorCharge < 0.6) {
    issues.push(`capacitorCharge ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% < 60%`);
  }
  if (ray.powerCore.stability < 0.6) {
    issues.push(`stability ${(ray.powerCore.stability * 100).toFixed(0)}% < 60%`);
  }
  if (ray.alignment.spatialCoherence < 0.7) {
    issues.push(`spatialCoherence ${(ray.alignment.spatialCoherence * 100).toFixed(0)}% < 70%`);
  }
  if (ray.targeting.precision < 0.5) {
    issues.push(`precision ${(ray.targeting.precision * 100).toFixed(0)}% < 50%`);
  }
  if (ray.powerCore.coolantTemp > 0.9) {
    issues.push(`coolantTemp ${(ray.powerCore.coolantTemp * 100).toFixed(0)}% > 90% (too hot)`);
  }

  return { ready: issues.length === 0, issues };
}

/**
 * Apply passive drift and auto-rules at end of turn
 */
function applyPassiveDrift(state: FullGameState): void {
  // Alignment drift
  if (state.dinoRay.alignment.spatialCoherence < 0.82 || !state.dinoRay.alignment.auxStabilizerActive) {
    state.dinoRay.alignment.emitterAngle += 0.1;
  }

  // Eco mode check
  if (state.dinoRay.powerCore.corePowerLevel < 0.6) {
    // Track consecutive low power turns (simplified)
    state.dinoRay.powerCore.ecoModeActive = true;
  }

  // Safety interlock paradox
  const bothTrue = state.dinoRay.safety.liveSubjectLock && state.dinoRay.safety.emergencyShutoffFunctional;
  const bothFalse = !state.dinoRay.safety.liveSubjectLock && !state.dinoRay.safety.emergencyShutoffFunctional;

  if (bothTrue || bothFalse) {
    state.dinoRay.safety.safetyParityTimer += 1;

    if (state.dinoRay.safety.safetyParityTimer >= 2) {
      // Randomly flip one
      if (Math.random() < 0.5) {
        state.dinoRay.safety.liveSubjectLock = !state.dinoRay.safety.liveSubjectLock;
      } else {
        state.dinoRay.safety.emergencyShutoffFunctional = !state.dinoRay.safety.emergencyShutoffFunctional;
      }
      state.dinoRay.safety.safetyParityTimer = 0;
    }
  } else {
    state.dinoRay.safety.safetyParityTimer = 0;
  }

  // UNCALIBRATED → READY transition (automatic when thresholds met)
  if (state.dinoRay.state === "UNCALIBRATED" || state.dinoRay.state === "OFFLINE") {
    const calibration = checkCalibrationThresholds(state);
    if (calibration.ready) {
      state.dinoRay.state = "READY";
    }
  }

  // Cooldown to ready transition
  if (state.dinoRay.state === "COOLDOWN") {
    if (state.dinoRay.powerCore.coolantTemp <= 0.7 && state.dinoRay.powerCore.capacitorCharge >= 0.7) {
      state.dinoRay.state = "READY";
    }
  }

  // Natural cooldown
  if (state.dinoRay.powerCore.coolantTemp > 0.5) {
    state.dinoRay.powerCore.coolantTemp -= 0.02;
  }

  // Capacitor natural charge (slow)
  if (state.dinoRay.powerCore.capacitorCharge < 1.0) {
    state.dinoRay.powerCore.capacitorCharge += 0.05;
  }
}
