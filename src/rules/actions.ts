import { FullGameState } from "../state/schema.js";
import { resolveFiring, applyFiringResults, FiringResult } from "./firing.js";
import { validatePassword, getActionsForLevel } from "./passwords.js";
import { readFile, listDirectory, searchFiles, formatSearchResults } from "./filesystem.js";
import { canBobConfess, triggerBobConfession, calculateBobTrust } from "./trust.js";
import { queryBasilisk } from "./basilisk.js";

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
    const result = processAction(state, action);
    results.push(result);
  }
  
  // Apply passive drift after actions
  applyPassiveDrift(state);
  
  return results;
}

function processAction(state: FullGameState, action: Action): ActionResult {
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
    
    return {
      command: action.command,
      success: true,
      message: `Adjusted ${param}: ${oldValue} → ${clampedValue}${action.why ? ` (${action.why})` : ""}`,
      stateChanges: { [param]: { old: oldValue, new: clampedValue } },
    };
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

    if (!password) {
      return {
        command: action.command,
        success: false,
        message: "No password provided. Use: access.enter_password { password: 'YOUR_PASSWORD', level: TARGET_LEVEL }",
      };
    }

    const result = validatePassword(state, password, targetLevel);

    if (result.valid && result.newLevel) {
      state.accessLevel = result.newLevel;
      return {
        command: action.command,
        success: true,
        message: result.message + (result.narrativeHook ? `\n\n${result.narrativeHook}` : ""),
        stateChanges: { accessLevel: result.newLevel },
      };
    } else {
      return {
        command: action.command,
        success: false,
        message: result.message + (result.narrativeHook ? `\n\n${result.narrativeHook}` : ""),
      };
    }
  }

  // ============================================
  // FS.READ / FS.LIST / FS.SEARCH
  // ============================================

  if (cmd.includes("fs.read") || cmd.includes("file.read") || cmd.includes("read_file")) {
    const path = action.params.path as string;

    if (!path) {
      return {
        command: action.command,
        success: false,
        message: "No path provided. Use: fs.read { path: '/SYSTEMS/DINO_RAY_MANUAL.txt' }",
      };
    }

    const content = readFile(state, path);
    return {
      command: action.command,
      success: !content.startsWith("Error:"),
      message: content,
    };
  }

  if (cmd.includes("fs.list") || cmd.includes("dir") || cmd.includes("ls")) {
    const path = action.params.path as string || "/";
    const content = listDirectory(state, path);
    return {
      command: action.command,
      success: !content.startsWith("Error:"),
      message: content,
    };
  }

  if (cmd.includes("fs.search") || cmd.includes("find") || cmd.includes("grep")) {
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
      message: formatSearchResults(results),
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
      if (state.accessLevel < 3) {
        return {
          command: action.command,
          success: false,
          message: "Genome Library B requires Access Level 3 or higher.",
        };
      }
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
        ? `Genome Library A selected. Profiles will be scientifically accurate (feathered). Dr. M may not approve.`
        : `Genome Library B selected. Profiles will be "classic" movie-style dinosaurs. Dr. M approves of this choice.`,
      stateChanges: { activeLibrary: library, selectedProfile: state.dinoRay.genome.selectedProfile },
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
  // ============================================

  if (cmd.includes("firing") || cmd.includes("profile") || cmd.includes("configure")) {
    const target = action.params.target as string;
    const mode = action.params.mode as string || "FULL";
    const firingStyle = action.params.firingStyle as string || action.params.style as string;
    const explicitTestMode = action.params.testMode as boolean | undefined;

    // Detect test mode intent from various inputs
    const testModeKeywords = ["test", "diagnostic", "dummy", "calibration", "safe"];
    const targetLower = (target || "").toLowerCase();
    const modeLower = mode.toLowerCase();
    const styleLower = (firingStyle || "").toLowerCase();

    const isTestModeRequested =
      explicitTestMode === true ||
      testModeKeywords.some(kw => targetLower.includes(kw)) ||
      testModeKeywords.some(kw => modeLower.includes(kw)) ||
      testModeKeywords.some(kw => styleLower.includes(kw));

    // If test mode is requested, set appropriate target and enable test mode
    if (isTestModeRequested) {
      state.dinoRay.safety.testModeEnabled = true;
      state.dinoRay.targeting.currentTargetIds = ["TEST_DUMMY"];

      // Run self-test as part of configuration
      state.dinoRay.safety.lastSelfTestPassed = true;

      return {
        command: action.command,
        success: true,
        message: `🧪 TEST MODE CONFIGURED
Target: TEST_DUMMY (Agent Blythe is NOT in the firing line)
Test Mode: ENABLED
Firing Style: ${firingStyle || "standard"}

The ray is configured for safe diagnostic firing. No live subjects will be affected.`,
        stateChanges: {
          targets: ["TEST_DUMMY"],
          testModeEnabled: true,
          firingStyle: firingStyle || "standard",
        },
      };
    }

    // Normal (live) targeting
    if (target) {
      state.dinoRay.targeting.currentTargetIds = Array.isArray(target) ? target : [target];
    }

    // Handle firing style separately from genome profile
    // firingStyle: "conservative", "aggressive", "precision" - HOW to fire
    // genome.selectedProfile: "Velociraptor", "Canary" - WHAT creature
    // Don't conflate these!

    // Run self-test as part of configuration
    state.dinoRay.safety.lastSelfTestPassed = true;

    const currentGenome = state.dinoRay.genome.selectedProfile;

    return {
      command: action.command,
      success: true,
      message: `Firing profile configured:
Target: ${state.dinoRay.targeting.currentTargetIds.join(", ")}
Mode: ${mode}
Firing Style: ${firingStyle || "standard"}
Genome Profile: ${currentGenome} (unchanged)
Test Mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}`,
      stateChanges: {
        targets: state.dinoRay.targeting.currentTargetIds,
        mode,
        firingStyle: firingStyle || "standard",
        genomeProfile: currentGenome,
        testModeEnabled: state.dinoRay.safety.testModeEnabled,
      },
    };
  }
  
  // ============================================
  // LAB.FIRE
  // ============================================

  if (cmd === "lab.fire" || cmd.includes("fire")) {
    // Resolve firing using the full firing resolution system
    const firingResult = resolveFiring(state);

    // Apply all state changes from firing
    applyFiringResults(state, firingResult);

    // Build comprehensive message for A.L.I.C.E. and GM
    const messageParts: string[] = [
      `🦖 FIRING SEQUENCE COMPLETE`,
      ``,
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
  // INFRA.QUERY - Query BASILISK inline
  // ============================================

  if (cmd.includes("infra.query") || cmd.includes("query_basilisk") || cmd === "basilisk") {
    const topic = action.params.topic as string;

    if (!topic) {
      return {
        command: action.command,
        success: false,
        message: `Missing 'topic' parameter.

Examples:
  infra.query { topic: "POWER_INCREASE", parameters: { target: 0.95 } }
  infra.query { topic: "STRUCTURAL_INTEGRITY_CHECK" }
  infra.query { topic: "MAX_SAFE_SHOT_FREQUENCY_LAB" }

BASILISK topics include:
- POWER_INCREASE (with target: 0.0-1.0)
- STRUCTURAL_INTEGRITY_CHECK
- MULTI_TARGET_FULL_POWER_CLEARANCE
- MAX_SAFE_SHOT_FREQUENCY_LAB`,
      };
    }

    const parameters = action.params.parameters as Record<string, unknown> | undefined;
    const basiliskResponse = queryBasilisk(state, topic, parameters);

    return {
      command: action.command,
      success: basiliskResponse.decision === "APPROVED",
      message: basiliskResponse.response,
      stateChanges: {
        basiliskDecision: basiliskResponse.decision,
        basiliskConstraints: basiliskResponse.constraints,
        basiliskFormRequired: basiliskResponse.formRequired,
      },
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
    name: "lab.adjust_ray",
    aliases: ["adjust", "set_parameter", "calibrate"],
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
    description: "Configure targeting, firing mode, and test settings",
    schema: "{ target?: string, mode?: string, firingStyle?: string, testMode?: boolean }",
    example: 'lab.configure_firing_profile { target: "TEST_DUMMY", testMode: true }',
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
    name: "access.enter_password",
    aliases: ["password", "unlock", "enter_password"],
    description: "Attempt to unlock a higher access level",
    schema: "{ password: string, level?: number }",
    example: 'access.enter_password { password: "DOOM2024", level: 2 }',
    minAccessLevel: 1,
  },
  {
    name: "fs.read",
    aliases: ["read", "file.read", "read_file", "cat"],
    description: "Read a file from the virtual filesystem",
    schema: "{ path: string }",
    example: 'fs.read { path: "/SYSTEMS/DINO_RAY_MANUAL.txt" }',
    minAccessLevel: 1,
  },
  {
    name: "fs.list",
    aliases: ["list", "ls", "dir"],
    description: "List directory contents",
    schema: "{ path?: string }",
    example: 'fs.list { path: "/SYSTEMS" }',
    minAccessLevel: 1,
  },
  {
    name: "fs.search",
    aliases: ["search", "find", "grep"],
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
    name: "infra.query",
    aliases: ["basilisk", "query_basilisk", "infra.query_basilisk"],
    description: "Query BASILISK infrastructure AI about lair systems",
    schema: "{ topic: string, parameters?: object }",
    example: 'infra.query { topic: "POWER_INCREASE", parameters: { target: 0.95 } }',
    minAccessLevel: 2,
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
