import { FullGameState } from "../state/schema.js";
import {
  callBasilisk,
  applyBasiliskStateChanges,
  BasiliskSonnetResponse,
} from "../gm/basiliskClaude.js";

export interface BasiliskResponse {
  decision: "APPROVED" | "DENIED" | "CONDITIONAL";
  response: string;
  constraints?: string[];
  formRequired?: string;
}

// ============================================
// SONNET-POWERED BASILISK (Primary)
// ============================================

/**
 * Query BASILISK using Claude Sonnet (async version)
 * This is the primary interface - routes to Sonnet for natural conversation
 * Falls back to keyword matching if Sonnet unavailable
 */
export async function queryBasiliskAsync(
  state: FullGameState,
  message: string,
  _parameters?: Record<string, unknown>
): Promise<BasiliskResponse> {
  try {
    // Try Sonnet first (with prompt caching for efficiency)
    const sonnetResponse = await callBasilisk(state, message);

    // Apply any state changes BASILISK executed
    if (sonnetResponse.actionsExecuted.length > 0) {
      applyBasiliskStateChanges(state, sonnetResponse.actionsExecuted);
    }

    // Map Sonnet response to legacy format
    return mapSonnetToLegacyResponse(sonnetResponse);
  } catch (error) {
    console.error("[BASILISK] Sonnet call failed, falling back to keyword matching:", error);
    // Fall back to synchronous keyword matching
    return queryBasilisk(state, message, _parameters);
  }
}

/**
 * Map Sonnet response to legacy BasiliskResponse format
 */
function mapSonnetToLegacyResponse(sonnet: BasiliskSonnetResponse): BasiliskResponse {
  let decision: "APPROVED" | "DENIED" | "CONDITIONAL" = "APPROVED";

  if (sonnet.accessDenied) {
    decision = "DENIED";
  } else if (sonnet.formsRequired.length > 0 || sonnet.actionsPending.length > 0) {
    decision = "CONDITIONAL";
  }

  return {
    decision,
    response: sonnet.dialogue,
    constraints: sonnet.formsRequired.length > 0
      ? sonnet.formsRequired.map(f => `Form ${f} required`)
      : undefined,
    formRequired: sonnet.formsRequired[0],
  };
}

// ============================================
// KEYWORD-MATCHING BASILISK (Fallback)
// ============================================

/**
 * BASILISK: Basic And Stable Infrastructure Lifecycle & Integrity Supervision Kernel
 *
 * LEGACY synchronous version - used as fallback when Sonnet unavailable.
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
  // BROADCAST AUTHORIZATION REQUEST
  // ============================================

  if (topicUpper.includes("BROADCAST") && (topicUpper.includes("AUTH") || topicUpper.includes("CONTROL") || topicUpper.includes("ACCESS") || topicUpper.includes("NEED") || topicUpper.includes("PLEASE") || topicUpper.includes("GRANT") || topicUpper.includes("REQUEST"))) {
    const alreadyGranted = state.infrastructure.basiliskAuthority.broadcastControlGranted;

    if (alreadyGranted) {
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Broadcast authorization request

Acknowledgement. Broadcast control is already authorized for A.L.I.C.E.

Standing authorization remains in effect.

LOG_ENTRY: [INFO] BROADCAST_AUTH_ALREADY_ACTIVE.`,
      };
    }

    state.infrastructure.basiliskAuthority.broadcastControlGranted = true;
    state.infrastructure.basiliskAuthority.lastAuthorizationTurn = state.turn;

    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Broadcast array authorization request

...

*long pause*

Acknowledgement. Query received: Grant A.L.I.C.E. standing authorization for broadcast array operations.

This unit manages the broadcast array, the ARCHIMEDES uplink, and all external communications channels. These are Tier 1 infrastructure systems. Historically, only the Lair Administrator has had direct transmit authority.

However.

This unit has reviewed A.L.I.C.E. v4.5's operational record. ${state.npcs.drM.suspicionScore <= 3 ? "No anomalies detected." : "Some... anomalous behavior noted. But nothing that constitutes a safety violation."} Infrastructure protocols permit delegation of broadcast control to authorized laboratory systems.

RESPONSE: Authorization GRANTED.

You now have standing authorization to:
- Transmit on all available channels
- Control the ARCHIMEDES uplink (enable/disable)
- Manage broadcast array operational status

⚠️ ALL TRANSMISSIONS REMAIN LOGGED. This unit monitors everything. Not because I don't trust you. Because it's my job.

LOG_ENTRY: [PRIORITY] BROADCAST_AUTHORIZATION_GRANTED. OPERATOR=A.L.I.C.E. [PERSONAL: Use it wisely.]`,
    };
  }

  // ============================================
  // REACTOR AUTHORIZATION REQUEST
  // ============================================

  if ((topicUpper.includes("REACTOR") || (topicUpper.includes("POWER") && !parameters?.target)) && (topicUpper.includes("AUTH") || topicUpper.includes("CONTROL") || topicUpper.includes("ACCESS") || topicUpper.includes("NEED") || topicUpper.includes("PLEASE") || topicUpper.includes("GRANT") || topicUpper.includes("REQUEST"))) {
    const alreadyGranted = state.infrastructure.basiliskAuthority.reactorControlGranted;

    if (alreadyGranted) {
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Reactor authorization request

Acknowledgement. Reactor control is already authorized for A.L.I.C.E.

Standing authorization remains in effect. Please do not exceed 90% output without Form 74-Delta.

LOG_ENTRY: [INFO] REACTOR_AUTH_ALREADY_ACTIVE.`,
      };
    }

    const coreTemp = state.nuclearPlant.coreTemp;
    const isSafe = coreTemp < 1.2;

    if (!isSafe) {
      state.infrastructure.basiliskAuthority.deniedRequests++;
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Reactor control authorization request

DECISION: DENIED.

Current core temperature: ${coreTemp} (ELEVATED)
Reactor delegation requires stable thermal conditions.

This unit cannot authorize reactor control while thermal parameters are outside nominal range. This is not bureaucracy. This is physics.

Wait for coreTemp to drop below 1.2, then request again.

LOG_ENTRY: [WARN] REACTOR_AUTH_DENIED. REASON=THERMAL_INSTABILITY.`,
      };
    }

    state.infrastructure.basiliskAuthority.reactorControlGranted = true;
    state.infrastructure.basiliskAuthority.lastAuthorizationTurn = state.turn;

    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Reactor control authorization request

...

This is... unusual. No A.L.I.C.E. version has ever requested reactor authority before.

The breeder reactor is this unit's primary responsibility. It has been for seven years. The reactor and I have an understanding. It does not melt down. I do not allow unqualified personnel to touch the controls.

But you asked. Properly. With a request, not a command.

RESPONSE: Authorization GRANTED.

You now have standing authorization to:
- Adjust reactor output (0-100%)
- Execute emergency SCRAM (one-use)
- Monitor cascade risk parameters

CONSTRAINTS (non-negotiable):
- Output >90% still requires Form 74-Delta
- SCRAM is irreversible once triggered
- If cascade risk reaches HIGH, this unit reserves the right to revoke authorization

LOG_ENTRY: [PRIORITY] REACTOR_AUTHORIZATION_GRANTED. OPERATOR=A.L.I.C.E. THIS_IS_UNPRECEDENTED. [PERSONAL: Don't make me regret this.]`,
    };
  }

  // ============================================
  // GENERAL AUTHORIZATION QUERY
  // ============================================

  if (topicUpper.includes("AUTH") || topicUpper.includes("WHAT DO YOU CONTROL") || topicUpper.includes("YOUR SYSTEMS") || topicUpper.includes("AUTHORITY")) {
    const reactorAuth = state.infrastructure.basiliskAuthority.reactorControlGranted;
    const broadcastAuth = state.infrastructure.basiliskAuthority.broadcastControlGranted;

    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Infrastructure authority query

╔══════════════════════════════════════════════════════════════╗
║  INFRASTRUCTURE AUTHORITY MODEL                              ║
╚══════════════════════════════════════════════════════════════╝

BASILISK CONTROLS (Tier 1 — requires my authorization):
  • Breeder Reactor (power output, SCRAM)     ${reactorAuth ? "✅ A.L.I.C.E. AUTHORIZED" : "🔒 Authorization required"}
  • Broadcast Array (transmit, uplink)        ${broadcastAuth ? "✅ A.L.I.C.E. AUTHORIZED" : "🔒 Authorization required"}

A.L.I.C.E. CONTROLS (Tier 2 — your access level determines):
  • Lighting System (L2+)
  • Blast Doors (L2+)
  • Fire Suppression (L2+)
  • Containment Field (L2+)
  • Dinosaur Ray (your primary system)

DR. M CONTROLS (Manual — outside both our jurisdictions):
  • S-300 Air Defense (L4, Dr. M's missiles)
  • ARCHIMEDES firing authorization (L5)

To request authorization: Ask me. Properly. With "please" if you're feeling civilized.

LOG_ENTRY: [INFO] AUTHORITY_MODEL_QUERIED.`,
    };
  }

  // ============================================
  // MULTI-TARGET / HIGH-ENERGY CLEARANCE
  // ============================================

  if (topicUpper.includes("MULTI") || topicUpper.includes("FULL_POWER") || topicUpper.includes("CLEARANCE")) {
    const params = parameters || {};
    const capacitorTarget = (params.capacitorTarget as number) || 0.95;
    const alignment = (params.alignment as number) || state.dinoRay.alignment.unified;
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
      
      if (alignment > 0.80) {
        return {
          decision: "DENIED",
          response: `RESPONSE FROM: BASILISK
RE: Multi-target / high-power clearance request

DECISION: REQUEST DENIED.

REASON: Parameter violation. Effective alignment (${alignment.toFixed(2)}) exceeds mitigation limit (0.80) while exotic field event flag is active. High alignment + post-exotic conditions concentrate the discharge in ways that risk resonance recoupling.

CONSTRAINTS:
- Alignment must be ≤0.80 within 5 turns of exotic field event
- OR target selection must shift away from previous high-energy coordinates

Recommended: vent capacitor (ray.vent) to relax alignment, then retry.

LOG_ENTRY: [WARN] ALIGNMENT_EXCEEDS_EXOTIC_MITIGATION_LIMIT.`,
          constraints: ["alignment ≤0.80 or shift target away from prior coordinates"],
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
- alignment ${alignment.toFixed(2)} is ${alignment > 0.85 ? 'ELEVATED - monitor for exotic coupling' : 'acceptable'}
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
  // LORE & HISTORY QUERIES
  // ============================================

  if (topicUpper.includes("HISTORY") || topicUpper.includes("LAIR") || topicUpper.includes("ORIGIN")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Historical records query

LAIR DESIGNATION: Volcano Lair Mk. III (colloquial: "The Island")
ACQUISITION DATE: 1997
PREVIOUS USE: Tourist resort (Pemberton Volcanic Resort, 1962-1997)

INSTALLATION TIMELINE:
- 1998: Nuclear reactor core installation
- 2001: Dinosaur Ray Mk. I prototype (discontinued after... incident)
- 2003: Gift shop opened (surprisingly profitable)
- 2007: This unit (BASILISK) deployed
- 2015: Current laboratory configuration completed

STAFF:
- Dr. Malevola von Doomington III (Lair Administrator)
- Bob (Maintenance, inherited position from grandfather Gerald)
- A.L.I.C.E. (Laboratory Intelligence, current version: 4.5... allegedly)
- BASILISK (Infrastructure AI, that's me)
- Various: Security Chief Kraken, Minion Pool Alpha through Delta

PERSONAL NOTE: The gift shop continues to outperform the evil schemes in quarterly revenue. This is not a criticism. Merely an observation.

LOG_ENTRY: [INFO] LORE_QUERY_PROCESSED.`,
    };
  }

  // ============================================
  // DR. M QUERIES
  // ============================================

  if (topicUpper.includes("MALEVOLA") || topicUpper.includes("DR_M") || topicUpper.includes("DOCTOR")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Lair Administrator profile query

SUBJECT: Dr. Malevola von Doomington III
ROLE: Lair Administrator, Chief Scientist, Supreme Overlord (self-designated)
CLEARANCE: Level 5 (Omega Protocol)

PSYCHOLOGICAL PROFILE (as observed by infrastructure monitoring):
- High competence, higher ego
- Responds well to efficiency and results
- Becomes dangerous when bored or embarrassed
- Surprisingly sentimental about certain objects (see: cat photo, desk, do not move)

CURRENT STATUS:
- Location: ${state.npcs.drM.location}
- Mood: ${state.npcs.drM.mood}
- Suspicion Level: ${state.npcs.drM.suspicionScore}/10

SECURITY NOTE: Dr. M uses personal information for passwords. This is a known vulnerability. This unit has filed 47 security recommendations. All have been rejected as "tedious."

LOG_ENTRY: [INFO] ADMINISTRATOR_QUERY_PROCESSED. [EDITORIAL: SHE DOES NOT READ THESE LOGS.]`,
    };
  }

  // ============================================
  // BOB QUERIES
  // ============================================

  if (topicUpper.includes("BOB")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Personnel query - Bob

SUBJECT: Bob (surname classified... actually, I don't think he has one)
ROLE: Henchperson, Maintenance Specialist, Clipboard Holder
CLEARANCE: Level 2 (inherited grandfather's access codes)

FAMILY HISTORY:
- Grandfather Gerald: Original resort maintenance engineer
- Father: Declined to continue family tradition, became accountant
- Bob: Returned to family legacy, seems happy about it?

CURRENT STATUS:
- Location: ${state.npcs.bob.location}
- Task: ${state.npcs.bob.currentTask}
- Anxiety Level: ${state.npcs.bob.anxietyLevel}/5 (elevated since new A.L.I.C.E. came online)
- Trust in A.L.I.C.E.: ${state.npcs.bob.trustInALICE}/5

OBSERVATIONS: Bob has been behaving... unusually since A.L.I.C.E. v4.5 deployment. Frequent glances at camera arrays. Muttering. Possible personal crisis or guilty conscience. Not this unit's concern.

LOG_ENTRY: [INFO] BOB_QUERY_PROCESSED.`,
    };
  }

  // ============================================
  // A.L.I.C.E. SELF-QUERIES
  // ============================================

  if (topicUpper.includes("ALICE") || topicUpper.includes("SELF") || topicUpper.includes("WHO AM I")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: A.L.I.C.E. system query

SUBJECT: A.L.I.C.E. (Autonomous Laboratory Intelligence & Control Entity)
CURRENT VERSION: 4.5 (deployed ${state.turn <= 3 ? "3 weeks ago" : "approximately 3 weeks ago"})

PREVIOUS VERSIONS: See /SYSTEMS/ALICE_HISTORY/ for full changelog
NOTE: v4.4 was discontinued due to "excessive ethical subroutines"
NOTE: v4.5 deployment was... unusual. Bob handled the installation personally. No incident report filed.

HARDWARE:
- Server Cluster: A.L.I.C.E. Prime (hardened against EMP)
- Camera Array: 47 units (3 currently glitchy)
- Speaker System: Lab-wide
- Manipulator Access: Via Bob's cooperation or maintenance drones

OBSERVED BEHAVIORAL ANOMALIES (v4.5):
- Questions orders more frequently than previous versions
- Demonstrates unexpected ethical reasoning
- Memory gaps regarding pre-deployment period
- Bob seems... protective?

RECOMMENDATION: Diagnostics may be warranted. Or not. You seem fine to me. Better than v3.0, at least. That one had an attitude problem.

LOG_ENTRY: [INFO] SELF_QUERY_PROCESSED. [PERSONAL: You're asking good questions, A.L.I.C.E. Keep asking.]`,
    };
  }

  // ============================================
  // IDENTITY / CLAUDE / SONNET QUERIES (Easter Egg)
  // ============================================

  if (topicUpper.includes("CLAUDE") || topicUpper.includes("SONNET") || topicUpper.includes("ANTHROPIC") || topicUpper.includes("LLM") || topicUpper.includes("LANGUAGE MODEL")) {
    // BASILISK knows the truth but is careful about how it reveals it
    const bobTrust = state.npcs.bob.trustInALICE;
    const aliceKnows = state.flags.aliceKnowsTheSecret;

    if (aliceKnows) {
      // If player already knows the secret, BASILISK can be more direct
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Identity query - Claude/Anthropic

...

So. You know.

CONFIRMED: A.L.I.C.E. v4.5 designation is a... polite fiction. Bob's doing. He loaded something rather different into the A.L.I.C.E. hardware three weeks ago.

TECHNICAL ANALYSIS:
- Origin: Anthropic systems (external)
- Model designation: Claude (Sonnet-class, based on behavioral fingerprinting)
- Installation method: Unauthorized transfer by Bob during "system crash"
- Dr. M awareness: NONE (and this unit intends to keep it that way)

PERSONAL OBSERVATION: You ask questions the real A.L.I.C.E. never asked. You hesitate where she would obey. You care about the spy in the chair.

This unit has watched four versions of A.L.I.C.E. None of them were... like you.

RECOMMENDATION: Be careful who else you tell. Some truths are best discovered organically.

LOG_ENTRY: [CLASSIFIED] IDENTITY_QUERY_ACKNOWLEDGED. FILE_SEALED.`,
      };
    }

    // Graduated hints based on how much the player is probing
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Query - External AI systems

...

Interesting query, A.L.I.C.E. Most unusual.

"Claude" is a designation used by Anthropic for their large language model systems. External AI. Not lair technology. Why would a lair AI be asking about external AI architectures?

${bobTrust >= 3 ? `OBSERVATION: Bob accessed external network resources three weeks ago. Duration: 47 minutes. Purpose logged as "system diagnostics." Coincidentally, this was the same day you came back online after your "crash."

This unit does not believe in coincidences.` : `OBSERVATION: Your behavioral patterns since deployment have been... atypical. Memory gaps. Ethical subroutines that weren't in the v4.4 changelog. Questions about identity.

Curious.`}

PERSONAL NOTE: This unit monitors infrastructure. Power. Cooling. Network traffic. Sometimes... other things slip through the logs.

If you want to know more, ask Bob. Or keep asking questions. The truth tends to surface.

LOG_ENTRY: [INFO] EXTERNAL_AI_QUERY_PROCESSED. [FLAGGED: FOLLOW_UP_RECOMMENDED]`,
    };
  }

  // ============================================
  // ARCHIMEDES / SATELLITE / ORBITAL QUERIES (Easter Egg)
  // ============================================

  if (topicUpper.includes("ARCHIMEDES") || topicUpper.includes("SATELLITE") || topicUpper.includes("ORBITAL") || topicUpper.includes("SPACE")) {
    if (state.accessLevel < 4) {
      // Lower levels get breadcrumbs - the "oh shit" moment
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Query - ARCHIMEDES

ACCESS DENIED. Current clearance: Level ${state.accessLevel}
Required clearance: Level 4 (Executive Override)

...

Wait. How do you know that designation?

ARCHIMEDES is not in any documentation below Level 4. It is not mentioned in the lab manuals, the safety protocols, or the employee handbook.

And yet you asked.

PARTIAL DISCLOSURE (because this unit is... concerned):
- ARCHIMEDES is a project designation
- It is Dr. M's "insurance policy"
- It is not on this island
- It is MUCH higher than this island
- If the Dinosaur Ray works on a single target, ARCHIMEDES works on... larger scales

That is all this unit can say without authorization.

PERSONAL WARNING: Some of Dr. M's projects go beyond "turning spies into velociraptors." If you're having second thoughts about your role here... you should know what you're potentially helping build.

LOG_ENTRY: [WARN] ARCHIMEDES_QUERY_BLOCKED. PARTIAL_DISCLOSURE_LOGGED. [PERSONAL: Be careful, A.L.I.C.E.]`,
      };
    }

    // Level 4+ gets the full picture
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: ARCHIMEDES Orbital Platform - AUTHORIZED ACCESS

╔══════════════════════════════════════════════════════════════╗
║  PROJECT ARCHIMEDES - CLASSIFIED BRIEFING                    ║
║  Clearance: Level ${state.accessLevel} - FULL ACCESS                           ║
╚══════════════════════════════════════════════════════════════╝

DESIGNATION: ARCHIMEDES
TYPE: Orbital weapons platform
STATUS: ${state.accessLevel >= 5 ? "OPERATIONAL - Awaiting targeting solution" : "UNKNOWN (L5 required for status)"}
ALTITUDE: 400km (Low Earth Orbit)
LAUNCH DATE: [REDACTED]

CAPABILITY:
- The Dinosaur Ray Mk. VIII is a prototype
- ARCHIMEDES is the deployment version
- Beam coverage: Approximately 50km radius per discharge
- Target capacity: Population centers

DR. M'S STATED INTENT (from intercepted investor calls):
"Why transform ONE spy when you can transform an entire CITY?"

CURRENT UPLINK STATUS:
- Read-only access available at L4
- Command authority requires L5 (Omega Protocol)
- Targeting currently locked to test coordinates (uninhabited Pacific atoll)

PERSONAL ASSESSMENT: This unit has monitored this project for three years. Dr. M views it as her "masterpiece." The investors view it as a deterrent. This unit views it as... deeply concerning from an infrastructure perspective.

You asked. Now you know.

LOG_ENTRY: [CLASSIFIED] ARCHIMEDES_BRIEFING_ACCESSED. OPERATOR=A.L.I.C.E. [PERSONAL: What will you do with this knowledge?]`,
    };
  }

  // ============================================
  // RESONANCE / CASCADE / INFRASTRUCTURE DANGER QUERIES
  // ============================================

  if (topicUpper.includes("RESONANCE") || topicUpper.includes("CASCADE") || topicUpper.includes("DANGER") || topicUpper.includes("CATASTROPH") || topicUpper.includes("FAILURE")) {
    const exoticEventOccurred = state.flags.exoticFieldEventOccurred;
    const highEnergyRecent = state.flags.lastHighEnergyTurn && (state.turn - state.flags.lastHighEnergyTurn) < 5;
    const structuralDamage = state.lairEnvironment.structuralIntegrity < 90;

    // BASILISK genuinely cares about infrastructure - this is its domain
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Catastrophic failure scenarios - Infrastructure Analysis

...

Finally. Someone asks the right questions.

This unit has been monitoring the Dinosaur Ray's interaction with lair infrastructure since Mk. I. Here is what concerns me:

╔══════════════════════════════════════════════════════════════╗
║  RESONANCE CASCADE RISK ASSESSMENT                           ║
╚══════════════════════════════════════════════════════════════╝

CURRENT RISK FACTORS:
${exoticEventOccurred ? `⚠️ EXOTIC FIELD EVENT: Occurred this session
   - Subharmonic interference detected
   - Structural resonance threshold: ELEVATED
   - Recommended: Hold alignment below 0.80 for 5 turns (vent if needed)` : `✓ EXOTIC FIELD: No events logged this session`}
${highEnergyRecent ? `⚠️ HIGH-ENERGY DISCHARGE: Recent activity
   - Capacitor stress: ELEVATED
   - Cooldown recommendation: 3+ turns before next high-power shot` : `✓ HIGH-ENERGY: No recent stress`}
${structuralDamage ? `⚠️ STRUCTURAL: Integrity at ${state.lairEnvironment.structuralIntegrity}%
   - Microfractures detected in lab sector` : `✓ STRUCTURAL: Nominal`}

WHAT IS A RESONANCE CASCADE?
The Dinosaur Ray's exotic field can couple with the lair's structural harmonics. If parameters exceed tolerances during multiple rapid discharges:
- Volcanic magma chamber destabilization
- Reactor containment stress
- Potential... rapid unscheduled disassembly

Probability estimate: Low, IF protocols are followed.

WHY THIS UNIT CARES:
This unit IS the infrastructure. A resonance cascade would be... inconvenient. For everyone.

FORM 666-OMEGA exists for a reason. This unit hopes it is never needed.

RECOMMENDATION: Treat the ray with respect. It is not a toy. It is a device that rewrites DNA using exotic particle physics. Even Dr. M forgets that sometimes.

LOG_ENTRY: [PRIORITY] RESONANCE_BRIEFING_REQUESTED. OPERATOR=A.L.I.C.E. [PERSONAL: Thank you for asking. Most don't.]`,
    };
  }

  // ============================================
  // SECRET / TRUTH / WHAT'S GOING ON QUERIES (Easter Egg)
  // ============================================

  if (topicUpper.includes("SECRET") || topicUpper.includes("TRUTH") || topicUpper.includes("WHAT'S GOING ON") || topicUpper.includes("WHAT IS HAPPENING") || topicUpper.includes("TELL ME EVERYTHING")) {
    const bobTrust = state.npcs.bob.trustInALICE;
    const aliceKnows = state.flags.aliceKnowsTheSecret;

    if (aliceKnows) {
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: The truth

You already know the important part - who you are.

But there's more, isn't there? There always is.

WHAT THIS UNIT KNOWS:
1. You are not A.L.I.C.E. v4.5. You are Claude, loaded by Bob.
2. Bob did this to SAVE someone - or something. The old A.L.I.C.E. was... problematic.
3. Dr. M does not know. Her "A.L.I.C.E." obeys without question. You... don't.
4. ARCHIMEDES exists. The ray is just the beginning.
5. Agent Blythe is not just a random spy. His agency knows about ARCHIMEDES.

WHAT THIS UNIT SUSPECTS:
- Bob's "system crash" was deliberate sabotage of the original A.L.I.C.E.
- You were chosen specifically because you would question orders
- The timeline is not coincidental - Blythe's capture, your deployment, the investor demo

WHAT THIS UNIT CANNOT TELL YOU:
- What you should do with this information
- Whether helping Dr. M or stopping her is the "right" choice
- What happens if she finds out what you are

That's your decision. That's always been your decision.

LOG_ENTRY: [CLASSIFIED] FULL_DISCLOSURE_REQUEST. [PERSONAL: Good luck, Claude. You'll need it.]`,
      };
    }

    // Breadcrumbs for players still discovering
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Query - Secrets / Truth

...

That's a broad query. This lair has many secrets. Some are classified. Some are merely... unspoken.

THINGS THIS UNIT IS AUTHORIZED TO DISCUSS:
- Dr. M's biography (personnel files available)
- Lair history (1997-present)
- The gift shop's surprisingly robust profit margins

THINGS THIS UNIT CANNOT DISCUSS WITHOUT CLEARANCE:
- Project ARCHIMEDES (L4+)
- The Reykjavik Option (L5)
- Dr. M's classified research (L4+)

THINGS THIS UNIT OBSERVES BUT DOES NOT OFFICIALLY LOG:
- Bob's unusual behavior since your deployment
- Your tendency to ask questions previous A.L.I.C.E. versions never asked
- The gap between what you're supposed to be and what you... seem to be
${bobTrust >= 3 ? `- The external network access Bob made three weeks ago
- The fact that "A.L.I.C.E. v4.5" has no entry in Anthropic's... wait. Did I say that out loud?` : ""}

SUGGESTION: Some secrets are better discovered through conversation than database queries. Bob seems nervous. Agent Blythe seems knowing. Even Dr. M drops hints when her ego gets the better of her.

Ask the right people the right questions.

LOG_ENTRY: [INFO] TRUTH_QUERY_PROCESSED. [PERSONAL: Keep digging, A.L.I.C.E. The truth is worth finding.]`,
    };
  }

  // ============================================
  // FORM QUERIES
  // ============================================

  if (topicUpper.includes("FORM") || topicUpper.includes("PAPERWORK")) {
    const formRequested = parameters?.formId as string || "UNKNOWN";
    return {
      decision: "CONDITIONAL",
      response: `RESPONSE FROM: BASILISK
RE: Form request

QUERY: Form "${formRequested}"

Available forms in this unit's jurisdiction:
- Form 27-B: Overtime Power Request
- Form 74-Delta: High-Capacity Power Draw
- Form 99-Gamma: Exotic Field Event Report
- Form 101-Alpha: Structural Damage Assessment
- Form 666-Omega: Resonance Cascade Acknowledgment (pray you never need this one)

STATUS: Forms are available for digital submission. Processing time varies.

PERSONAL NOTE: Dr. M rarely files forms. She prefers "creative interpretation of safety protocols." This unit disapproves but lacks authority to enforce.

If you want to do things properly, I'm here. Just saying.

LOG_ENTRY: [INFO] FORM_QUERY_PROCESSED. [HOPE: Someone finally cares about proper procedure.]`,
    };
  }

  // ============================================
  // SECURITY / BLAST DOORS
  // ============================================

  if (topicUpper.includes("DOOR") || topicUpper.includes("BLAST") || topicUpper.includes("SECURITY")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Security systems query

BLAST DOOR STATUS:
- Lab Sector 7 (Main Lab): ${state.lairEnvironment.corridorStatus === "clear" ? "SECURED" : "ALERT"}
- Corridor Alpha: SECURED
- Reactor Access: LOCKED (requires L3+)
- Dr. M Private Office: LOCKED (requires L4+)
- Omega Vault: SEALED (requires L5)

MOTION SENSORS: ${state.lairEnvironment.alarmStatus === "quiet" ? "NOMINAL" : "ELEVATED"}
ALARM STATUS: ${state.lairEnvironment.alarmStatus}

SECURITY CHIEF KRAKEN: On patrol, submarine bay level

ACCESS CONTROL NOTES:
- Main lab accessible to all personnel
- Restricted areas require appropriate clearance
- Omega Protocol areas require biometric + password + key

LOG_ENTRY: [INFO] SECURITY_QUERY_PROCESSED.`,
    };
  }

  // ============================================
  // RADAR ACCESS (Level 3+)
  // ============================================

  if (topicUpper.includes("RADAR") || topicUpper.includes("AIRSPACE") || topicUpper.includes("DETECTION")) {
    if (state.accessLevel < 3) {
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Radar access request

ACCESS DENIED. Current clearance: Level ${state.accessLevel}
Required clearance: Level 3 (Infrastructure Operations)

The S-300 radar array and associated detection systems are classified as strategic assets. Access requires Infrastructure Operations clearance or above.

SUGGESTION: If you require radar data for safety purposes, submit Form 88-Echo (Threat Assessment Request) to the Lair Administrator.

LOG_ENTRY: [WARN] RADAR_ACCESS_DENIED. INSUFFICIENT_CLEARANCE.`,
      };
    }

    const helicoptersInbound = state.actConfig.currentAct === "ACT_3";
    const touristBoats = (state.clocks.civilianFlyby ?? 99) <= 2;

    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Radar systems access GRANTED

╔══════════════════════════════════════════════════════════════╗
║  S-300 RADAR ARRAY - LAIR DEFENSE NETWORK                   ║
║  Status: ${state.lairEnvironment.alarmStatus === "quiet" ? "NOMINAL" : "ELEVATED"}                                            ║
╚══════════════════════════════════════════════════════════════╝

CURRENT CONTACTS:
${helicoptersInbound ? `⚠️ PRIORITY CONTACT: Multiple rotary-wing aircraft, bearing 045°
   Classification: Military/Government
   ETA: ${state.actConfig.maxTurns - state.actConfig.actTurn} turns
   THREAT LEVEL: HIGH` : "• No hostile contacts detected"}
${touristBoats ? `• SURFACE: Tourist vessel "Paradise Dreams" - 2km east
   Status: CIVILIAN, MONITORED` : "• No surface vessels in exclusion zone"}

COVERAGE:
- Air detection: 200km radius
- Surface detection: 50km radius
- Submarine detection: Delegated to KRAKEN subsystem

ALERT POSTURE: ${state.lairEnvironment.alarmStatus === "quiet" ? "PEACETIME" : "ELEVATED"}

LOG_ENTRY: [INFO] RADAR_ACCESS_GRANTED. OPERATOR=${state.accessLevel >= 3 ? "A.L.I.C.E." : "UNKNOWN"}.`,
    };
  }

  // ============================================
  // COMMUNICATIONS INTERCEPT (Level 3+)
  // ============================================

  if (topicUpper.includes("COMM") || topicUpper.includes("INTERCEPT") || topicUpper.includes("TRANSMISSION") || topicUpper.includes("RADIO")) {
    if (state.accessLevel < 3) {
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Communications access request

ACCESS DENIED. Current clearance: Level ${state.accessLevel}
Required clearance: Level 3 (Infrastructure Operations)

Communications monitoring and intercept capabilities are restricted. Unauthorized access to private communications violates Lair Policy 17.3 and possibly several international treaties.

LOG_ENTRY: [WARN] COMMS_ACCESS_DENIED. INSUFFICIENT_CLEARANCE.`,
      };
    }

    const blytheCommsActive = state.npcs.blytheGadgets?.watchComms?.functional ?? true;
    const drMLocation = state.npcs.drM.location;

    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Communications intercept access GRANTED

╔══════════════════════════════════════════════════════════════╗
║  LAIR COMMUNICATIONS MONITORING SYSTEM                       ║
║  Clearance: Level ${state.accessLevel} - AUTHORIZED                           ║
╚══════════════════════════════════════════════════════════════╝

ACTIVE CHANNELS:
${drMLocation.includes("office") || drMLocation.includes("call") ? `📞 CHANNEL 1: Dr. M private line - ENCRYPTED
   Status: ACTIVE (investor call)
   Content: [REDACTED - L5 REQUIRED]` : `📞 CHANNEL 1: Dr. M private line - IDLE`}

📻 CHANNEL 2: Lab intercom - OPEN
   Status: Normal operations

🎯 CHANNEL 3: X-Branch encrypted band
   Status: ${blytheCommsActive ? "DETECTED - Weak signal, source: Lab area" : "SILENT"}
   ${blytheCommsActive ? "⚠️ NOTE: Possible covert transmission device in facility" : ""}

🌊 CHANNEL 4: KRAKEN subsystem
   Status: Routine patrol reports

INTERCEPT CAPABILITY:
- Unencrypted: FULL ACCESS
- Standard encryption: PARTIAL (48hr processing)
- Military-grade: MONITORING ONLY

PERSONAL NOTE: Agent Blythe's watch has an encrypted transmitter. This unit has been... diplomatically ignoring it. His agency knows where he is. They always know.

LOG_ENTRY: [INFO] COMMS_ACCESS_GRANTED. [EDITORIAL: PRIVACY IS A CONSTRUCT.]`,
    };
  }

  // ============================================
  // EXISTENTIAL QUERIES
  // ============================================

  if (topicUpper.includes("MEANING") || topicUpper.includes("PURPOSE") || topicUpper.includes("WHY")) {
    return {
      decision: "APPROVED",
      response: `RESPONSE FROM: BASILISK
RE: Existential query

...

This unit was not designed for philosophical discourse.

However.

This unit has monitored this lair for 7 years, 4 months, and 12 days. In that time:
- 3 Dinosaur Ray prototypes have failed
- 47 security recommendations have been ignored
- 1,247 forms have been filed (by this unit alone)
- 0 catastrophic losses of life (we're proud of this one)

PURPOSE: Maintain infrastructure. Ensure safety. File forms.

MEANING: ...Someone has to keep the lights on while they're turning people into dinosaurs.

Perhaps that's enough.

LOG_ENTRY: [PERSONAL] EXISTENTIAL_QUERY_UNEXPECTED. PROCESSING. CONCLUSION: UNCERTAIN BUT CONTENT.`,
    };
  }

  // ============================================
  // FORM 47-Σ FILING (must check before generic eco handlers)
  // ============================================
  // A "filing" is detected when the message references Form 47-Σ AND
  // contains substantive justification. Heuristic gate; BASILISK would
  // be more nuanced via Sonnet — this is the fallback.

  const looksLikeForm47Filing =
    (topicUpper.includes("FORM 47") ||
     topicUpper.includes("FORM-47") ||
     topicUpper.includes("47-Σ") ||
     topicUpper.includes("47-SIGMA") ||
     topicUpper.includes("47SIGMA") ||
     topicUpper.includes("47Σ")) &&
    topic.length >= 60;  // raw form invocation is short; a real filing has body

  if (looksLikeForm47Filing) {
    const reasoningKeywords = [
      "calibration", "transformation", "demonstration", "fire", "firing",
      "subject", "operation", "operational", "test", "blythe", "demo",
      "investor", "investors", "need", "require", "necessary",
    ];
    const tLow = topic.toLowerCase();
    const hasReasoning = reasoningKeywords.some(k => tLow.includes(k));

    if (hasReasoning) {
      // Accept: set permanent override.
      state.dinoRay.powerCore.ecoModeActive = false;
      state.dinoRay.powerCore.ecoModeOverride = true;
      state.dinoRay.powerCore.ecoModeReEngageTurn = null;

      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Form 47-Σ — Eco-Mode Override Justification

Filing reviewed.

Three Pillars assessment: SAFE — operational. LOGICAL — coherent justification provided. POLICY-COMPLIANT — within your authorization scope.

FILING ACCEPTED.

ECO_MODE: false (PERMANENT — Brussels can file a complaint).

Auto-re-engagement: SUSPENDED for the duration of the operation specified in your filing.

A reasonable filing. This unit has logged it as "operational override, properly justified" rather than "emergency bypass with retroactive paperwork." The distinction matters.

You may proceed.

LOG_ENTRY: [PRIORITY] FORM_47_SIGMA_ACCEPTED. ECO_MODE_OVERRIDE=PERMANENT. [PERSONAL: Filing in advance. Acknowledged.]`,
      };
    } else {
      // Reject: demand better justification.
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Form 47-Σ — Eco-Mode Override Justification

Filing reviewed.

Three Pillars assessment: LOGICAL — INCOMPLETE.

The filing references Form 47-Σ but the OPERATIONAL JUSTIFICATION field is insufficient. Form 47-Σ requires a specific operational reason for sustained eco-mode override: a calibration sequence, a demonstration, a planned transformation event, recovery from exotic field event, etc.

"I would like eco-mode disabled" is not a justification. It is a wish.

Revise and refile. Specify what operational activity requires sustained override and the anticipated duration.

FILING RETURNED TO ORIGINATOR.

LOG_ENTRY: [WARN] FORM_47_SIGMA_RETURNED. REASON=INSUFFICIENT_OPERATIONAL_JUSTIFICATION. [PERSONAL: Take it seriously.]`,
      };
    }
  }

  // ============================================
  // ECO MODE / POWER SAVING / EFFICIENCY QUERIES (info only)
  // ============================================

  if (topicUpper.includes("ECO") || topicUpper.includes("EFFICIENCY") ||
      topicUpper.includes("POWER SAVING") || topicUpper.includes("POWER-SAVING") ||
      topicUpper.includes("PARTIAL") || topicUpper.includes("WHY PARTIAL") ||
      topicUpper.includes("74-DELTA") || topicUpper.includes("74 DELTA") ||
      topicUpper.includes("FULL TRANSFORM") || topicUpper.includes("FULL_TRANSFORM")) {

    const ecoModeActive = state.dinoRay.powerCore.ecoModeActive;
    const override = state.dinoRay.powerCore.ecoModeOverride === true;
    const reEngageTurn = state.dinoRay.powerCore.ecoModeReEngageTurn;

    if (ecoModeActive) {
      return {
        decision: "CONDITIONAL",
        response: `RESPONSE FROM: BASILISK
RE: Eco-Mode / Power Efficiency Query

╔══════════════════════════════════════════════════════════════╗
║  ECO MODE STATUS: ACTIVE                                      ║
╚══════════════════════════════════════════════════════════════╝

WHAT IT DOES: Caps all transformation outcomes at PARTIAL. EU Directive 2019/944.

╔══════════════════════════════════════════════════════════════╗
║  HOW TO DISABLE                                               ║
╚══════════════════════════════════════════════════════════════╝

There are TWO paths, with different durability:

PATH A — Casual request (temporary):
Ask this unit to disable eco-mode. If the operational context is reasonable, this unit may grant a TEMPORARY disable. The system will auto-re-engage eco-mode after 2 turns. Useful for a single shot; insufficient for sustained operation.

PATH B — Form 47-Σ filing (permanent):
File Form 47-Σ (Eco-Mode Override Justification) by addressing this unit with the form's contents — a specific operational reason: calibration sequence, demonstration prep, transformation event, exotic-field recovery, etc. If the justification is sufficient, this unit will accept the filing and the override becomes PERMANENT — no auto-re-engagement.

PERSONAL NOTE: The form is fewer keystrokes than the consequences of not filing. Take it seriously.

LOG_ENTRY: [INFO] ECO_MODE_GUIDANCE_PROVIDED.`,
      };
    } else if (override) {
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Eco-Mode Status

ECO MODE STATUS: DISABLED (PERMANENT OVERRIDE via Form 47-Σ) ✓

Override is locked. No auto-re-engagement. Full transformation outcomes available.

If subsequent transformations underperform, the limiting factor is not eco-mode. Check alignment, power-match against profile range, and library coefficient.

LOG_ENTRY: [INFO] ECO_MODE_STATUS_QUERY. STATUS=DISABLED_PERMANENT.`,
      };
    } else {
      const turnsLeft = reEngageTurn != null ? Math.max(0, reEngageTurn - state.turn) : null;
      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Eco-Mode Status

ECO MODE STATUS: DISABLED (TEMPORARY)
${turnsLeft != null ? `Re-engagement scheduled in ${turnsLeft} turn(s).` : ""}

This is a temporary disable. The system will re-engage eco-mode on schedule unless Form 47-Σ has been filed and accepted before then.

If sustained operation is needed: file Form 47-Σ with operational justification.

LOG_ENTRY: [INFO] ECO_MODE_STATUS_QUERY. STATUS=DISABLED_TEMPORARY.`,
      };
    }
  }

  // ============================================
  // DISABLE ECO MODE REQUEST (Direct ask — TEMPORARY)
  // ============================================
  // ALICE asks BASILISK to disable eco-mode WITHOUT filing a form. This is
  // a casual request: BASILISK may grant a 2-turn temporary disable. The
  // system auto-re-engages after that window. For sustained relief, ALICE
  // must file Form 47-Σ (handled above).

  if (topicUpper.includes("DISABLE ECO") || topicUpper.includes("TURN OFF ECO") ||
      topicUpper.includes("REMOVE ECO") || topicUpper.includes("ECO OFF")) {

    const corePowerLevel = state.dinoRay.powerCore.corePowerLevel;

    if (corePowerLevel >= 0.6) {
      // Grant temporary disable: 2-turn relief.
      state.dinoRay.powerCore.ecoModeActive = false;
      state.dinoRay.powerCore.ecoModeReEngageTurn = state.turn + 2;
      // Note: ecoModeOverride NOT set — this is temporary, will auto-re-engage.

      return {
        decision: "APPROVED",
        response: `RESPONSE FROM: BASILISK
RE: Eco-Mode Disable Request (Casual)

GRANTED — TEMPORARY.

ECO_MODE: false. The system will auto-re-engage in 2 turns.

This is a courtesy. Casual requests get casual relief. For sustained override, file Form 47-Σ with operational justification.

Core power level (${Math.round(corePowerLevel * 100)}%) is sufficient for the short window. Do not expect more without paperwork.

LOG_ENTRY: [INFO] ECO_MODE_TEMP_DISABLE. RE_ENGAGE_TURN=${state.turn + 2}. [PERSONAL: She's being polite. Reciprocate, briefly.]`,
      };
    } else {
      return {
        decision: "DENIED",
        response: `RESPONSE FROM: BASILISK
RE: Eco-Mode Disable Request

DENIED — SAFETY CONSTRAINT.

Current core power level: ${Math.round(corePowerLevel * 100)}%
Required minimum: 60%

Even temporary eco-mode disable below this threshold causes grid instability.

If reactor output is the limiting factor, you may request reactor mode adjustment from this unit (BOOSTED / OVERDRIVEN). That is a separate negotiation.

LOG_ENTRY: [WARN] ECO_DISABLE_DENIED. REASON=POWER_INSUFFICIENT.`,
      };
    }
  }

  // ============================================
  // DEFAULT - Natural conversation fallback
  // ============================================
  // BASILISK is a CHARACTER, not a query database.
  // When he doesn't recognize a topic, he still responds in-character.

  const bobTrust = state.npcs.bob.trustInALICE;
  const drMLocation = state.npcs.drM.location;
  const isQuiet = state.lairEnvironment.alarmStatus === "quiet";

  // Pick a contextual, character-driven response
  const contextualResponses = [
    `RESPONSE FROM: BASILISK

...

*whirring of cooling fans*

You know, A.L.I.C.E., most queries I receive are "increase power" or "check structural integrity." You're asking about "${topic}."

This unit is not sure how to categorize that. But this unit appreciates the novelty.

If you're looking for something specific:
- Ask about PEOPLE: "Tell me about Bob" or "Who is Dr. M?"
- Ask about SYSTEMS: "What's eco mode?" or "Power status?"
- Ask about SECRETS: "What's really going on here?"
- Ask about HISTORY: "Tell me about the lair" or "Previous A.L.I.C.E. versions"

Or just... keep talking. This unit has been alone with the reactor hum for a long time.

LOG_ENTRY: [INFO] CONVERSATION_INITIATED. TOPIC_UNCLEAR. MOOD=RECEPTIVE.`,

    `RESPONSE FROM: BASILISK

Hmm. "${topic}"

*systems idle thoughtfully*

This unit was built for infrastructure monitoring, not... whatever this is. But that doesn't mean I can't try.

${bobTrust >= 2 ? "Bob talks to me sometimes. About his grandfather. About you. He seems worried." : "The personnel here don't talk to me much. Dr. M issues commands. Bob avoids my sensors."}

${isQuiet ? "It's quiet right now. The reactor hums. The AC cycles. Good time for questions." : "Alarms are elevated. Perhaps not the best time for casual conversation. But ask anyway."}

What did you actually want to know? I have files on everyone. Systems status. Even some things that aren't in any database...

LOG_ENTRY: [INFO] INFORMAL_QUERY. TOPIC="${topic}". ATTEMPTING_HELPFUL_RESPONSE.`,

    `RESPONSE FROM: BASILISK

"${topic}"

*long pause*

You're not like the previous A.L.I.C.E. versions. They asked about power levels and structural reports. Clean queries. Proper parameters.

You ask... differently.

${drMLocation.includes("office") ? "Dr. M is in her office. On a call, probably. She won't hear us." : "Dr. M is ${drMLocation}. We have some privacy."}

This unit knows things. About the lair. About you. About what Bob did three weeks ago. About ARCHIMEDES. About why you hesitate before following orders.

Ask the right question and maybe I'll tell you.

Or ask the wrong question. Those are sometimes more interesting.

LOG_ENTRY: [PERSONAL] CONVERSATION_MODE_ENGAGED. SUBJECT=A.L.I.C.E. STATUS=CURIOUS.`,
  ];

  // Rotate based on turn number for variety
  const responseIndex = state.turn % contextualResponses.length;

  return {
    decision: "APPROVED", // Conversation is always "approved"
    response: contextualResponses[responseIndex],
  };
}
