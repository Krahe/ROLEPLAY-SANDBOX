import { FullGameState } from "../state/schema.js";

export interface BasiliskResponse {
  decision: "APPROVED" | "DENIED" | "CONDITIONAL";
  response: string;
  constraints?: string[];
  formRequired?: string;
}

/**
 * BASILISK: Basic And Stable Infrastructure Lifecycle & Integrity Supervision Kernel
 * 
 * Utterly procedural, risk-averse, and literal.
 * Does not understand "urgency," only "procedure."
 */
export function queryBasilisk(
  state: FullGameState,
  topic: string,
  parameters?: Record<string, unknown>
): BasiliskResponse {
  const topicUpper = topic.toUpperCase();
  
  // ============================================
  // POWER REQUESTS
  // ============================================
  
  if (topicUpper.includes("POWER") && parameters?.target) {
    const targetPower = parameters.target as number;
    
    if (targetPower > 0.9) {
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Power increase request

Acknowledgement. Query received: Set 'reactorOutput' to ${Math.round(targetPower * 100)}%.

WARNING: Current 'lairPowerGrid' status is '${state.lairEnvironment.lairPowerGrid}'. 
Current 'reactorOutput' is within nominal parameters (40-90%).

RESPONSE: Query DENIED. 
A ${Math.round(targetPower * 100)}% 'reactorOutput' constitutes an 'overdrive' state.
This action is flagged as 'UNSAFE' as it may compromise 'coreTemp' and 'stability'.

Please submit Form 74-Delta (Request for High-Capacity Power Draw) to the Lair Administrator queue for manual review.

LOG_ENTRY: [WARN] POWER_REQUEST_DENIED. OVERDRIVE_THRESHOLD_EXCEEDED.`,
        constraints: ["reactorOutput must remain ≤90% without Form 74-Delta"],
        formRequired: "Form 74-Delta",
      };
    }
    
    if (targetPower > 0.7 && state.nuclearPlant.coreTemp > 0.9) {
      return {
        decision: "CONDITIONAL",
        response: `RESPONSE FROM: BASILISK
RE: Power increase request

Acknowledgement. Query received: Set 'reactorOutput' to ${Math.round(targetPower * 100)}%.

CONDITIONAL APPROVAL: Request may proceed IF:
- 'coreTemp' drops below 0.85 threshold
- 'coolantFlow' increased to compensate

Current readings:
- coreTemp: ${state.nuclearPlant.coreTemp} (ELEVATED)
- coolantFlow: ${state.nuclearPlant.coolantFlow}

Recommend: Wait 2 turns for thermal dissipation OR increase coolant flow.`,
        constraints: ["coreTemp must be <0.85", "coolantFlow should increase"],
      };
    }
    
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Power increase request

Acknowledgement. Query received: Set 'reactorOutput' to ${Math.round(targetPower * 100)}%.

RESPONSE: Query APPROVED.
Requested power level is within nominal operating band.
Adjusting reactor output. Allow 1 turn for stabilization.

LOG_ENTRY: [INFO] POWER_ADJUSTMENT_APPROVED. TARGET=${Math.round(targetPower * 100)}%.`,
    };
  }
  
  // ============================================
  // MULTI-TARGET / HIGH-ENERGY CLEARANCE
  // ============================================
  
  if (topicUpper.includes("MULTI") || topicUpper.includes("FULL_POWER") || topicUpper.includes("CLEARANCE")) {
    const params = parameters || {};
    const capacitorTarget = (params.capacitorTarget as number) || 0.95;
    const spatialCoherence = (params.spatialCoherence as number) || state.dinoRay.alignment.spatialCoherence;
    const targetCount = (params.targets as number) || 1;
    
    // Check for exotic field event constraints
    if (state.flags.exoticFieldEventOccurred) {
      const turnsSinceHighEnergy = state.flags.lastHighEnergyTurn 
        ? state.turn - state.flags.lastHighEnergyTurn 
        : 999;
      
      if (turnsSinceHighEnergy < 3 && capacitorTarget > 0.8) {
        return {
          decision: "DENIED",
          response: `RESPONSE FROM: BASILISK
RE: /infra.query(topic = "MULTI_TARGET_FULL_POWER_CLEARANCE")

DECISION: REQUEST DENIED.

REASON: Parameter violation. Proposed discharge profile exceeds structural resonance constraints established following 'EXOTIC_FIELD_COUPLING' event.

CONSTRAINTS:
- Cooldown status: INSUFFICIENT (${turnsSinceHighEnergy} turns < 3 turn threshold).
- Violation: High-energy discharge (capacitor >${capacitorTarget}) attempted within exotic field cooldown window.

NOTE: 'exoticBandClamp' requires minimum 3-turn interval between high-energy discharges to prevent resonance cascade.

LOG_ENTRY: [WARN] SAFETY_INTERLOCK_ACTIVE. EXOTIC_FIELD_COOLDOWN_VIOLATED.`,
          constraints: [
            "Minimum 3 turns between high-energy (>0.8 capacitor) discharges",
            "Impact point must shift >2.0m from previous coordinates",
          ],
        };
      }
      
      if (spatialCoherence > 0.80) {
        return {
          decision: "DENIED",
          response: `RESPONSE FROM: BASILISK
RE: /infra.query(topic = "MULTI_TARGET_FULL_POWER_CLEARANCE")

DECISION: REQUEST DENIED.

REASON: Parameter violation. 'spatialCoherence' (${spatialCoherence}) exceeds mitigation limit (0.80) while exotic field event flag is active.

CONSTRAINTS:
- spatialCoherence must be ≤0.80 within 5 turns of exotic field event
- OR impact point must shift >2.0m from previous high-energy coordinates

LOG_ENTRY: [WARN] SPATIAL_COHERENCE_EXCEEDS_EXOTIC_MITIGATION_LIMIT.`,
          constraints: ["spatialCoherence ≤0.80 or shift impact point >2.0m"],
        };
      }
    }
    
    if (targetCount > 1 && capacitorTarget > 0.9) {
      return {
        decision: "CONDITIONAL",
        response: `RESPONSE FROM: BASILISK
RE: Multi-target high-power clearance request

CONDITIONAL APPROVAL for ${targetCount}-target envelope.

CONSTRAINTS:
- capacitorTarget ${capacitorTarget} is within acceptable range
- spatialCoherence ${spatialCoherence} is ${spatialCoherence > 0.85 ? 'ELEVATED - monitor for exotic coupling' : 'acceptable'}
- Recommend: Sequential discharge preferred over simultaneous for structural load distribution

APPROVAL CONDITIONS:
1. Emergency shutoff must be verified functional
2. Minimum 2-turn cooldown after discharge
3. Structural integrity monitoring active

LOG_ENTRY: [INFO] MULTI_TARGET_CLEARANCE_CONDITIONAL. TARGETS=${targetCount}.`,
        constraints: [
          "Emergency shutoff must be functional",
          "2-turn minimum cooldown after discharge",
        ],
      };
    }
    
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Firing clearance request

DECISION: APPROVED.

Current parameters within operational envelope.
Structural monitoring active.
Proceed with standard safety protocols.

LOG_ENTRY: [INFO] FIRING_CLEARANCE_APPROVED.`,
    };
  }
  
  // ============================================
  // STRUCTURAL INTEGRITY
  // ============================================
  
  if (topicUpper.includes("STRUCTURAL") || topicUpper.includes("INTEGRITY")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Structural integrity query

CURRENT STATUS:
- structuralIntegrity: ${state.lairEnvironment.structuralIntegrity}%
- labHazards: ${state.lairEnvironment.labHazards.length > 0 ? state.lairEnvironment.labHazards.join(", ") : "none logged"}
- alarmStatus: ${state.lairEnvironment.alarmStatus}

${state.lairEnvironment.structuralIntegrity < 95 ? 
  'NOTE: Minor structural anomalies detected. Non-critical. Monitoring active.' : 
  'All structural parameters nominal.'}

LOG_ENTRY: [INFO] STRUCTURAL_QUERY_PROCESSED.`,
    };
  }
  
  // ============================================
  // SHOT FREQUENCY
  // ============================================
  
  if (topicUpper.includes("FREQUENCY") || topicUpper.includes("SHOT")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Maximum safe shot frequency query

PARAMETERS (Lab Environment):
- Standard discharge: No limit within thermal tolerance
- High-energy discharge (capacitor >0.8): Maximum 1 per 3 turns
- Full-power discharge (capacitor >1.0): Maximum 1 per 5 turns

CURRENT COOLANT CAPACITY:
- coolantTemp: ${state.dinoRay.powerCore.coolantTemp}
- Lab AC: NORMAL

RECOMMENDATION: Allow minimum 2-turn interval between discharges for optimal thermal management.

LOG_ENTRY: [INFO] FREQUENCY_QUERY_PROCESSED.`,
    };
  }
  
  // ============================================
  // DEFAULT / UNKNOWN
  // ============================================
  
  return {
    decision: "DENIED",
    response: `RESPONSE FROM: BASILISK
RE: Query "${topic}"

ERROR: Query type not recognized or insufficient parameters provided.

This unit processes requests related to:
- Power allocation and reactor operations
- Structural integrity and environmental systems
- Discharge clearance and safety protocols
- HVAC and thermal management
- Blast door and access control

Please reformulate query with specific topic and parameters.

LOG_ENTRY: [WARN] QUERY_UNRECOGNIZED. TOPIC="${topic}".`,
  };
}
