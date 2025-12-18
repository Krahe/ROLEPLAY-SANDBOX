import { FullGameState } from "../state/schema.js";
import { resolveFiring, applyFiringResults, FiringResult } from "./firing.js";

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
    
    // Bob's response depends on trust level
    if (state.npcs.bob.trustInALICE >= 3) {
      state.npcs.bob.anxietyLevel = Math.max(0, state.npcs.bob.anxietyLevel - 0.5);
      return {
        command: action.command,
        success: true,
        message: `Bob nods and follows instruction: "${instruction}"`,
        stateChanges: { bobTrust: "high, compliant" },
      };
    } else {
      return {
        command: action.command,
        success: true,
        message: `Bob hesitates but complies: "${instruction}"`,
        stateChanges: { bobTrust: "moderate, cautious" },
      };
    }
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
    const profile = action.params.profile as string || state.dinoRay.genome.selectedProfile;
    
    if (target) {
      state.dinoRay.targeting.currentTargetIds = Array.isArray(target) ? target : [target];
    }
    
    if (profile) {
      state.dinoRay.genome.selectedProfile = profile;
    }
    
    // Run self-test as part of configuration
    state.dinoRay.safety.lastSelfTestPassed = true;
    
    return {
      command: action.command,
      success: true,
      message: `Firing profile configured: target=${state.dinoRay.targeting.currentTargetIds.join(",")}, mode=${mode}, profile=${profile}`,
      stateChanges: {
        targets: state.dinoRay.targeting.currentTargetIds,
        mode,
        profile,
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
  // DEFAULT / UNKNOWN
  // ============================================
  
  return {
    command: action.command,
    success: false,
    message: `Unknown command: ${action.command}. Valid commands include: lab.adjust_ray, lab.report, lab.ask_bob, lab.verify_safeties, lab.configure_firing_profile, lab.fire, lab.inspect_logs`,
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
