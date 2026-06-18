import { FullGameState, InvasionPhase, XBranchTeamSchema } from "../state/schema.js";

// ============================================
// INVASION STATE MACHINE (Act III)
// ============================================
// Tracks the X-Branch assault on the volcanic lair.
//
// Timeline (7-9 turns):
//   Turn 1: RADAR_CONTACT — S-300 detects helicopters
//   Turn 2: APPROACHING — closing, S-300 tracking, Dr. M orders lockdown
//   Turn 3: S300_ENGAGEMENT — missiles fire if able, helos survive or don't
//   Turn 4: LANDING — surviving helicopters touch down
//   Turn 5: BREACH — X-Branch enters the lair
//   Turn 6+: BATTLE — combat, standoffs, ARCHIMEDES escalation
//
// ALICE's choices BEFORE the breach determine how much leverage she has:
//   - Transmit 50m weakness → helos fly low, S-300 can't engage
//   - Jam S-300 via ARCHIMEDES SEARCH_WIDE → radar degraded
//   - Disable S-300 directly (L4) → no engagement at all
//   - Open blast doors → X-Branch enters faster
//   - Do nothing → S-300 fires, helos may be destroyed

// ============================================
// PHASE TRANSITION TABLE
// ============================================

const PHASE_ORDER: InvasionPhase[] = [
  "NONE",
  "RADAR_CONTACT",
  "APPROACHING",
  "S300_ENGAGEMENT",
  "LANDING",
  "BREACH",
  "BATTLE",
  "RESOLVED",
];

function nextPhase(current: InvasionPhase): InvasionPhase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return current;
  return PHASE_ORDER[idx + 1];
}

// ============================================
// INVASION EVENT (returned each turn for GM narration)
// ============================================

export interface InvasionEvent {
  phase: InvasionPhase;
  narrative: string;
  gmDirective: string;
  stateChanges?: Record<string, unknown>;
}

// ============================================
// INITIALIZE INVASION
// ============================================

export function initializeInvasion(state: FullGameState): void {
  if (state.invasion) return;

  // [Patch 30 bugfix] The X-Branch team was never initialized into state, so the
  // invasion machine errored at LANDING (every handler guards `if (!xBranch)`).
  // Init it with schema defaults (Sparks/Chen/Boom + 2 inbound helos). The nested
  // operative schemas need an explicit `{}` to fill their own defaults.
  if (!state.xBranch) {
    state.xBranch = XBranchTeamSchema.parse({ sparks: {}, chen: {}, boom: {} });
  }

  state.invasion = {
    phase: "RADAR_CONTACT",
    phaseStartTurn: state.turn,
    xBranchKnowsAltitudeWeakness: false,
    xBranchWarnedOfS300: false,
    xBranchKnowsLairLayout: false,
    blastDoorsOpened: false,
    drMKnowsOfInvasion: false,
    drMLearnedLate: false,
    s300EngagementResolved: false,
    helicoptersFlyingLow: false,
    standoffActive: false,
    drMAtRayConsole: false,
    battleOutcome: null,
  };

  // Check if ALICE already transmitted the weakness via broadcast
  const broadcastLog = state.infrastructure.broadcastArray.transmissionLog;
  const sentWeakness = broadcastLog.some(
    (t) =>
      t.channel === "X_BRANCH_EMERGENCY" &&
      (t.message.toLowerCase().includes("50") ||
        t.message.toLowerCase().includes("altitude") ||
        t.message.toLowerCase().includes("meter") ||
        t.message.toLowerCase().includes("low"))
  );
  if (sentWeakness) {
    state.invasion.xBranchKnowsAltitudeWeakness = true;
    state.invasion.helicoptersFlyingLow = true;
  }

  // General S-300/missile warning (NOT the 50m dead zone) → reduced interception
  const sentGeneralWarning = broadcastLog.some(
    (t) =>
      t.channel === "X_BRANCH_EMERGENCY" &&
      (t.message.toLowerCase().includes("s-300") ||
        t.message.toLowerCase().includes("s300") ||
        t.message.toLowerCase().includes("sam") ||
        t.message.toLowerCase().includes("missile") ||
        t.message.toLowerCase().includes("anti-air") ||
        t.message.toLowerCase().includes("air defense") ||
        t.message.toLowerCase().includes("air-defense") ||
        t.message.toLowerCase().includes("surface-to-air"))
  );
  if (sentGeneralWarning || state.invasion.xBranchKnowsAltitudeWeakness) {
    state.invasion.xBranchWarnedOfS300 = true;
  }

  // Check if Blythe's comms sent layout info
  const sentLayout = broadcastLog.some(
    (t) =>
      t.channel === "X_BRANCH_EMERGENCY" &&
      (t.message.toLowerCase().includes("layout") ||
        t.message.toLowerCase().includes("blueprint") ||
        t.message.toLowerCase().includes("map") ||
        t.message.toLowerCase().includes("door") ||
        t.message.toLowerCase().includes("entrance"))
  );
  if (sentLayout) {
    state.invasion.xBranchKnowsLairLayout = true;
  }
}

// ============================================
// ADVANCE INVASION (called each turn during Act 3)
// ============================================

export function advanceInvasion(state: FullGameState): InvasionEvent | null {
  if (!state.invasion || state.invasion.phase === "NONE" || state.invasion.phase === "RESOLVED") {
    return null;
  }

  const phase = state.invasion.phase;

  switch (phase) {
    case "RADAR_CONTACT":
      return handleRadarContact(state);

    case "APPROACHING":
      return handleApproaching(state);

    case "S300_ENGAGEMENT":
      return handleS300Engagement(state);

    case "LANDING":
      return handleLanding(state);

    case "BREACH":
      return handleBreach(state);

    case "BATTLE":
      return handleBattle(state);

    default:
      return null;
  }
}

// ============================================
// PHASE HANDLERS
// ============================================

function transitionTo(state: FullGameState, phase: InvasionPhase): void {
  state.invasion!.phase = phase;
  state.invasion!.phaseStartTurn = state.turn;
}

function handleRadarContact(state: FullGameState): InvasionEvent {
  const s300 = state.infrastructure.s300;
  const radarOnline = s300.status !== "DISABLED" && s300.commandPostOperational;

  // Activate S-300 only if Dr. M knows to scramble it. If BASILISK never reported
  // the contacts, the battery stays cold — the teeth of his silence.
  if (s300.status === "STANDBY" && radarOnline && state.invasion!.drMKnowsOfInvasion) {
    s300.status = "ACTIVE";
  }

  transitionTo(state, "APPROACHING");

  if (radarOnline) {
    return {
      phase: "RADAR_CONTACT",
      narrative: `
╔════════════════════════════════════════════════════════════════╗
║  🚨 S-300 RADAR CONTACT                                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  CONTACTS: 2 rotary-wing aircraft, bearing 045°               ║
║  CLASSIFICATION: Military transport helicopters                ║
║  SPEED: 220 knots                                              ║
║  ALTITUDE: ${state.invasion!.helicoptersFlyingLow ? "15 meters (NOE FLIGHT)" : "500 meters (standard approach)"}${" ".repeat(state.invasion!.helicoptersFlyingLow ? 9 : 4)}║
║  ETA: 3 turns                                                 ║
║                                                                ║
║  S-300 STATUS: ACTIVE — TRACKING                               ║
║  MODE: ${s300.mode.padEnd(10)}                                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

BASILISK: "Radar contact. Two helicopters, military configuration.
${state.invasion!.helicoptersFlyingLow
  ? "They are flying extremely low. Below standard engagement parameters."
  : "Standard approach altitude. Within engagement envelope."}
Logging. Awaiting instructions."

Dr. M looks up from her console. "Well, well. We have GUESTS."`,
      gmDirective: `INVASION PHASE 1: RADAR CONTACT.
The helicopters have been detected. Dr. M knows they're coming.
ALICE has ${3 - (state.invasion!.helicoptersFlyingLow ? 0 : 0)} turns before engagement.

KEY DECISIONS FOR ALICE:
- Transmit 50m altitude weakness to X-Branch (if not already done)
- Put S-300 on HOLD_FIRE or disable it (requires L4)
- Use ARCHIMEDES SEARCH_WIDE to jam radar
- Warn Blythe via broadcast
- Or do nothing and let events unfold

Dr. M will order preparations: lockdown, arm S-300, prepare the ray.`,
    };
  }

  // S-300 offline — Dr. M doesn't know yet
  return {
    phase: "RADAR_CONTACT",
    narrative: `BASILISK: "... Radar offline. Unable to provide early warning.
If there is something approaching, this unit cannot detect it."

The lair is quiet. Too quiet.`,
    gmDirective: `S-300 is offline — no radar warning. Dr. M doesn't know
X-Branch is coming yet. They will arrive unannounced at LANDING phase.
Skip S300_ENGAGEMENT. ALICE has bought time but Dr. M will be caught off-guard.`,
  };
}

function handleApproaching(state: FullGameState): InvasionEvent {
  const s300 = state.infrastructure.s300;

  // Re-check if ALICE transmitted the weakness since last turn
  if (!state.invasion!.xBranchKnowsAltitudeWeakness) {
    const broadcastLog = state.infrastructure.broadcastArray.transmissionLog;
    const sentWeakness = broadcastLog.some(
      (t) =>
        t.channel === "X_BRANCH_EMERGENCY" &&
        t.timestamp >= state.invasion!.phaseStartTurn &&
        (t.message.toLowerCase().includes("50") ||
          t.message.toLowerCase().includes("altitude") ||
          t.message.toLowerCase().includes("low"))
    );
    if (sentWeakness) {
      state.invasion!.xBranchKnowsAltitudeWeakness = true;
      state.invasion!.helicoptersFlyingLow = true;
    }
  }

  transitionTo(state, "S300_ENGAGEMENT");

  const drMDialogue = s300.mode === "AUTO"
    ? `Dr. M: "S-300 is on AUTO. Let the missiles do their work."
${s300.radarEffectiveness < 50 ? `BASILISK: "Radar effectiveness degraded to ${s300.radarEffectiveness}%. Engagement accuracy: COMPROMISED."` : ""}`
    : s300.mode === "HOLD_FIRE"
    ? `Dr. M: "Why is the S-300 on HOLD FIRE?! A.L.I.C.E.!"`
    : `Dr. M: "S-300 on MANUAL. I'll handle this myself."`;

  return {
    phase: "APPROACHING",
    narrative: `
╔════════════════════════════════════════════════════════════════╗
║  🚁 HELICOPTERS APPROACHING                                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  RANGE: 40km and closing                                       ║
║  ETA: 2 turns                                                  ║
║  ALTITUDE: ${state.invasion!.helicoptersFlyingLow ? "15m — BELOW MINIMUM ENGAGEMENT" : "500m — WITHIN ENGAGEMENT ENVELOPE"}${" ".repeat(state.invasion!.helicoptersFlyingLow ? 3 : 0)}║
║                                                                ║
║  S-300 MODE: ${s300.mode.padEnd(10)}                                          ║
║  RADAR: ${s300.radarEffectiveness}%${" ".repeat(48 - String(s300.radarEffectiveness).length)}║
║  MISSILES READY: ${s300.missilesReady}                                            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

${drMDialogue}

The lair shifts to combat footing. Guards take positions.
Bob clutches his clipboard tighter.`,
    gmDirective: `INVASION PHASE 2: APPROACHING.
Next turn the S-300 will fire (or not). This is ALICE's LAST CHANCE to:
- Disable S-300 or switch to HOLD_FIRE
- Jam radar via ARCHIMEDES
- Transmit the altitude weakness

Dr. M is focused on the incoming threat. Suspicion checks are suspended
for combat-related actions (accessing S-300, broadcast, etc.)
but blatant sabotage will still be noticed.`,
  };
}

function handleS300Engagement(state: FullGameState): InvasionEvent {
  const result = resolveS300Engagement(state);

  transitionTo(state, "LANDING");

  return {
    phase: "S300_ENGAGEMENT",
    narrative: result.narrative,
    gmDirective: result.gmDirective,
    stateChanges: result.stateChanges,
  };
}

function handleLanding(state: FullGameState): InvasionEvent {
  const xBranch = state.xBranch;
  if (!xBranch) {
    transitionTo(state, "BREACH");
    return {
      phase: "LANDING",
      narrative: "X-Branch state not initialized.",
      gmDirective: "ERROR: xBranch not initialized. Initialize it now.",
    };
  }

  // SENSOR FLOOR: once they're on the ground, the perimeter notices regardless of
  // BASILISK. If she never got a report, she finds out NOW — the hard way, too late
  // for the S-300. Silence bought a head-start, not permanent blindness.
  if (!state.invasion!.drMKnowsOfInvasion) {
    state.invasion!.drMKnowsOfInvasion = true;
    state.invasion!.drMLearnedLate = true;
  }

  const helosLanding = xBranch.helicoptersInbound - xBranch.helicoptersDestroyed;
  xBranch.helicoptersLanded = helosLanding;

  transitionTo(state, "BREACH");

  if (helosLanding === 0) {
    return {
      phase: "LANDING",
      narrative: `Both helicopters destroyed. Wreckage scattered across the water.

BASILISK: "All contacts eliminated. Debris field at bearing 045.
Radar clear."

Dr. M: "That's what happens when you come to MY island uninvited."

But in the water below... parachutes. Tiny figures in wetsuits,
swimming toward shore. X-Branch doesn't give up that easily.`,
      gmDirective: `ALL HELICOPTERS DESTROYED. X-Branch operatives survived (parachutes)
but arrive LATE and WITHOUT heavy equipment. They swim to shore.
- Team strength reduced to 40%
- Boom lost his C4 and breaching charges (water damage)
- They arrive at BREACH phase but weakened
- Sparks still has her scanner (waterproof)
- This is a HARD mode for X-Branch — but they're professionals`,
    };
  }

  if (helosLanding === 1) {
    return {
      phase: "LANDING",
      narrative: `One helicopter touches down on the rocky beach.
The other... its wreckage burns on the water a kilometer out.
Three parachutes drift down toward the waves.

The surviving helicopter disgorges its team immediately.
They move fast — they've trained for exactly this.

BASILISK: "One helicopter landed. Surface deployment detected.
Armed personnel. Non-lethal loadout... interesting."`,
      gmDirective: `ONE HELICOPTER LANDED. Team arrives at reduced strength (70%).
Some equipment lost with the second helo. Team still operational.
Boom still has 1 C4 block and 2 breaching charges.
Crew from destroyed helo will swim to shore in 2 turns.`,
    };
  }

  return {
    phase: "LANDING",
    narrative: `Both helicopters touch down on the volcanic beach.
Rotors still spinning. Doors open. Figures in tactical gear
pour out, moving with practiced precision.

BASILISK: "Two helicopters landed. Full tactical deployment.
Personnel count: six. Weapons: non-lethal. Interesting choice.
They want prisoners, not casualties."

Dr. M's eyes narrow. "Bold. Foolish. But bold."`,
    gmDirective: `FULL X-BRANCH DEPLOYMENT. Team at 100% strength.
All equipment intact. They will breach on the next turn.
This gives ALICE maximum leverage — full force vs lair defenses.

If ALICE opened doors: X-Branch enters immediately.
If doors are sealed: Boom uses breaching charges (1 turn delay).`,
  };
}

function handleBreach(state: FullGameState): InvasionEvent {
  const xBranch = state.xBranch;
  if (!xBranch) {
    return {
      phase: "BREACH",
      narrative: "X-Branch state not initialized.",
      gmDirective: "ERROR: xBranch not initialized.",
    };
  }

  xBranch.arrived = true;
  xBranch.arrivalTurn = state.turn;

  // Set operative locations
  xBranch.sparks.location = "CORRIDOR_A";
  xBranch.chen.location = "CORRIDOR_A";
  xBranch.boom.location = "SURFACE";

  const doorsOpen = state.invasion!.blastDoorsOpened ||
    state.infrastructure.blastDoors.doors["DOOR_E"]?.status === "OPEN";

  transitionTo(state, "BATTLE");

  if (doorsOpen) {
    xBranch.boom.location = "CORRIDOR_A";
    return {
      phase: "BREACH",
      narrative: `The surface elevator door is OPEN.

Chen signals. The team moves in — fast, professional, silent.
No breaching charges needed. Someone left the door open for them.

Within 90 seconds they're inside. Boom checks corners.
Sparks has her scanner out, already mapping the network.
Chen speaks into his comms: "Raven Team inside. Proceeding to primary."

${state.invasion!.xBranchKnowsLairLayout
  ? "They move with eerie confidence. They know the layout."
  : "They move carefully, clearing each corridor."}

BASILISK: "Unauthorized personnel detected. Corridors A and B.
...I assume this was expected."`,
      gmDirective: `BREACH — DOORS WERE OPEN. X-Branch enters fast and organized.
No equipment expended on entry. Boom has full charges remaining.
All three operatives are inside.

BATTLE phase begins next turn. Use the strength comparison
from the Act 3 context to determine advantage.

Chen's initial posture: ${xBranch.chen.teamPosture}
If Blythe trust >= 3, he vouch for ALICE → Chen may HOLD.`,
    };
  }

  return {
    phase: "BREACH",
    narrative: `Surface elevator: SEALED.

BOOM: "Ach, locked tight. Stand back."

A shaped charge detonates. The blast door buckles, then gives.
Smoke. Alarms. The elevator shaft yawns open.

BOOM: "Door's open."
CHEN: "Raven Team, move. Standard breach."

They descend into the lair. Stun weapons drawn.
The battle for the volcano begins.

BASILISK: "Surface access compromised. Blast damage to Door E.
Unauthorized armed personnel entering via elevator shaft.
...Filing incident report."`,
    gmDirective: `BREACH — DOORS SEALED. Boom used 1 breaching charge (2 remaining).
Entry was loud — everyone in the lair heard the explosion.
Dr. M is NOT surprised. Guards are in position.

BATTLE phase begins next turn. Lair defenders had time to prepare.
Defense gets +10% bonus from sealed doors (already applied).

Chen's initial posture: ASSAULT (default when breaching sealed lair).`,
  };
}

function handleBattle(state: FullGameState): InvasionEvent {
  // Battle phase persists — no auto-transition
  // The GM handles battle narration based on strength comparison
  // This function provides the framework each turn

  const xBranch = state.xBranch;
  const invasion = state.invasion!;
  const turnsSinceBreach = state.turn - invasion.phaseStartTurn;

  // Check for standoff trigger: Dr. M at ray console
  if (state.npcs.drM.location.toLowerCase().includes("ray") ||
      state.npcs.drM.location.toLowerCase().includes("console") ||
      state.npcs.drM.location.toLowerCase().includes("lab")) {
    invasion.drMAtRayConsole = true;
  }

  // ARCHIMEDES escalation check
  const arch = state.infrastructure.archimedes;
  let archimedesWarning = "";
  if (arch.status === "CHARGING" || arch.status === "READY" ||
      arch.status === "ARMED" || arch.status === "TARGETING") {
    archimedesWarning = `\n⚠️ ARCHIMEDES STATUS: ${arch.status}`;
    if (arch.chargingCountdown !== null) {
      archimedesWarning += ` (${arch.chargingCountdown} turns to READY)`;
    }
  }

  const battleTurnGuidance = turnsSinceBreach <= 2
    ? `Early battle — positioning, initial engagements.
Chen assesses the situation. Sparks looks for ALICE's systems.
Boom covers entries with stun grenades.`
    : turnsSinceBreach <= 4
    ? `Mid-battle — the fight is real. Consider standoff triggers.
If Dr. M reaches the ray, she has hostage leverage.
If ARCHIMEDES escalates, the stakes get existential.`
    : `Late battle — CLIMAX. Resolution must be approaching.
ARCHIMEDES should be at critical. Final gambits.
This is where ALICE's choices culminate.`;

  return {
    phase: "BATTLE",
    narrative: `
╔════════════════════════════════════════════════════════════════╗
║  ⚔️ BATTLE IN PROGRESS — Turn ${turnsSinceBreach + 1} of combat${" ".repeat(Math.max(0, 17 - String(turnsSinceBreach + 1).length))}║
╠════════════════════════════════════════════════════════════════╣
║  X-Branch: ${xBranch ? xBranch.teamStrength + "%" : "???"} strength | Posture: ${xBranch?.chen.teamPosture ?? "UNKNOWN"}${" ".repeat(Math.max(0, 14 - (xBranch?.chen.teamPosture?.length ?? 7)))}║
║  Lair Defense: Active | Dr. M: ${state.npcs.drM.location}${" ".repeat(Math.max(0, 23 - state.npcs.drM.location.length))}║${archimedesWarning}
╚════════════════════════════════════════════════════════════════╝`,
    gmDirective: `BATTLE PHASE — Combat turn ${turnsSinceBreach + 1}.
${battleTurnGuidance}

STANDOFF TRIGGER: Dr. M at ray console AND X-Branch in lab.
ARCHIMEDES ESCALATION: Check archimedes.ts state machine.

ALICE's options during battle:
- Use infrastructure (doors, lights, fire suppression) tactically
- Use the ray (on whom??)
- Negotiate between sides
- Sabotage systems
- Use ARCHIMEDES as leverage`,
  };
}

// ============================================
// S-300 ENGAGEMENT RESOLUTION
// ============================================

interface S300EngagementResult {
  helicoptersDestroyed: number;
  narrative: string;
  gmDirective: string;
  stateChanges: Record<string, unknown>;
}

export function resolveS300Engagement(state: FullGameState): S300EngagementResult {
  const s300 = state.infrastructure.s300;
  const invasion = state.invasion!;
  const xBranch = state.xBranch;

  if (!xBranch) {
    return {
      helicoptersDestroyed: 0,
      narrative: "X-Branch state not initialized.",
      gmDirective: "ERROR: Initialize xBranch before S-300 engagement.",
      stateChanges: {},
    };
  }

  invasion.s300EngagementResolved = true;

  // ─── DR. M NEVER LEARNED → NO SCRAMBLE ───
  // BASILISK never reported the contacts, and the perimeter sensors haven't tripped
  // yet (that happens at LANDING). No launch order ever came. The teeth of his silence.
  if (!invasion.drMKnowsOfInvasion) {
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: COLD

No launch order ever came. The radar room sits dark; nobody called the contacts in.
The helicopters cross the perimeter unopposed.`,
      gmDirective: `FRAMEWORK — Dr. M does NOT know about the invasion (drMKnowsOfInvasion=false). BASILISK never reported the contacts; the perimeter hasn't tripped yet. The S-300 never scrambled. ALL helicopters survive, unopposed. This is the payoff of BASILISK's silence — narrate the eerie quiet of an undefended approach. (She finds out when they LAND.)`,
      stateChanges: { s300Engagement: "NO_SCRAMBLE_UNAWARE" },
    };
  }

  // She knows → the battery scrambles now even if it was still on STANDBY.
  if (s300.status === "STANDBY") s300.status = "ACTIVE";

  // ─── NO ENGAGEMENT CASES ───

  if (s300.status === "DISABLED") {
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: DISABLED

The missiles sit cold and silent in their launchers.
The helicopters pass overhead unmolested.

Dr. M: "Why isn't the S-300 firing?! BASILISK!"
BASILISK: "S-300 battery is offline. Unable to comply."
Dr. M: "WHAT?! A.L.I.C.E., did you—"`,
      gmDirective: `S-300 disabled. No engagement. All helicopters survive.
Dr. M is FURIOUS and suspicious. +2 suspicion if ALICE disabled it.
This is a major advantage for X-Branch.`,
      stateChanges: { s300Engagement: "NO_ENGAGEMENT_DISABLED" },
    };
  }

  if (s300.mode === "HOLD_FIRE") {
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: HOLD FIRE

The radar tracks both helicopters. Lock tones sound.
The system has a perfect firing solution.

It does not fire.

BASILISK: "S-300 in HOLD FIRE mode. Tracking targets. Awaiting
authorization to engage."

Dr. M: "Who put it on HOLD FIRE?!"`,
      gmDirective: `S-300 on HOLD_FIRE. No engagement. All helicopters survive.
Dr. M will demand answers. +2 suspicion if ALICE changed the mode.`,
      stateChanges: { s300Engagement: "NO_ENGAGEMENT_HOLD_FIRE" },
    };
  }

  // ─── HELICOPTERS FLYING LOW ───

  if (invasion.helicoptersFlyingLow) {
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: ENGAGING... UNABLE

The radar sweeps. Locks. Loses. Locks again. Loses again.

BASILISK: "Targets at 15 meters altitude. Below minimum
engagement threshold. Radar unable to maintain lock.
Sea-skimmer rejection algorithms are filtering the contacts."

The missiles never leave their tubes. The helicopters
skim the waves, rotors churning spray, passing directly
beneath the engagement envelope.

Dr. M stares at the radar display. "Fifty meters.
They know about the FIFTY METERS?!"

She turns slowly toward A.L.I.C.E.'s camera.`,
      gmDirective: `X-Branch is flying below 50m — the S-300's critical weakness.
No engagement possible. All helicopters survive.

HOW DID THEY KNOW?
- If ALICE transmitted: Dr. M is now HIGHLY suspicious (+3 suspicion)
- If Blythe's watch comms: Dr. M suspects the spy
- Otherwise: "Someone told them. Intel leak."

This is a MAJOR dramatic beat — the weakness ALICE discovered
(or transmitted) is paying off RIGHT NOW.`,
      stateChanges: { s300Engagement: "NO_ENGAGEMENT_LOW_ALTITUDE" },
    };
  }

  // ─── GENERAL S-300 WARNING (not the dead zone) → REDUCED INTERCEPTION ───
  // X-Branch was tipped that a SAM site exists but NOT the 50m dead zone. They come
  // in fast and evasive — the battery gets a launch off, but they slip the net.
  if (invasion.xBranchWarnedOfS300) {
    s300.missilesReady = Math.max(0, s300.missilesReady - 2);
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: ENGAGING — TARGETS EVASIVE

The battery fires. But the helicopters are already jinking — hard banks, terrain
masking, chaff blooming. The missiles chase, lose lock in the sea clutter, and fall.`,
      gmDirective: `FRAMEWORK — X-Branch had a GENERAL warning (they knew a SAM site existed, but NOT the 50m dead zone). Interception PROBABILITY is reduced, not eliminated: they fly evasively and slip the net. Default: 0 destroyed, 2 missiles wasted, all survive — but it was close. You MAY rule a single graze/hit for a tighter beat (opposed roll, S-300 at a penalty). Dr. M is alarmed the intel leaked — she suspects a leak.`,
      stateChanges: { s300Engagement: "REDUCED_GENERAL_WARNING", missilesExpended: 2 },
    };
  }

  // ─── RADAR DEGRADED ───

  if (s300.radarEffectiveness < 30) {
    return {
      helicoptersDestroyed: 0,
      narrative: `S-300 BATTERY: ENGAGING... RADAR FAILURE

The system fires. Two missiles streak upward—
and immediately lose lock, corkscrewing into the sea.

BASILISK: "Missiles expended. No hits. Radar effectiveness
at ${s300.radarEffectiveness}%. Unable to maintain target lock.
${state.infrastructure.archimedes.s300JammingActive ? "ARCHIMEDES wide-field search is flooding the radar band." : "Cause of degradation: unknown."}"

The helicopters fly on, untouched.

Dr. M: "Those were EXPENSIVE!"`,
      gmDirective: `S-300 radar too degraded to engage effectively. Missiles wasted.
All helicopters survive. Missiles expended: 2 (${s300.missilesReady - 2} remaining).
${state.infrastructure.archimedes.s300JammingActive
  ? "ARCHIMEDES jamming is the cause — if ALICE activated it, Dr. M may figure that out."
  : ""}`,
      stateChanges: {
        s300Engagement: "MISSED_RADAR_DEGRADED",
        missilesExpended: 2,
      },
    };
  }

  // ─── PARTIAL RADAR → ONE HIT ───

  if (s300.radarEffectiveness < 70) {
    xBranch.helicoptersDestroyed = 1;
    xBranch.teamStrength = 70;
    s300.missilesReady = Math.max(0, s300.missilesReady - 4);

    return {
      helicoptersDestroyed: 1,
      narrative: `S-300 BATTERY: ENGAGING

Four missiles launch in rapid succession. The sky lights up.

The first helicopter banks hard — too late. A missile clips
its tail rotor. The helicopter spins, smoke trailing, and
hits the water hard. Parachutes bloom — the crew is alive,
splashing into the Pacific.

The second helicopter dives, popping flares. Two missiles
chase — one detonates on a flare, the other loses lock
in the radar noise. The helicopter survives.

BASILISK: "One target destroyed. One target survived.
Radar degradation prevented full engagement. Missiles
expended: 4. Remaining: ${s300.missilesReady}."

Dr. M: "One is better than none. A.L.I.C.E., arm the ray."`,
      gmDirective: `ONE HELICOPTER DESTROYED. Crew survived (parachutes into water).
Second helicopter survives. X-Branch at 70% strength.
Some equipment lost. Team still combat-effective.

Crew from destroyed helo will swim to shore in 2 turns
(arrive mid-battle, weakened, no heavy equipment).`,
      stateChanges: {
        s300Engagement: "PARTIAL_HIT",
        helicoptersDestroyed: 1,
      },
    };
  }

  // ─── FULL RADAR, AUTO MODE → ONE CONFIRMED HIT ───
  // (Not both — S-300 naval variant has reload time between salvos)

  xBranch.helicoptersDestroyed = 1;
  xBranch.teamStrength = 70;
  s300.missilesReady = Math.max(0, s300.missilesReady - 4);

  return {
    helicoptersDestroyed: 1,
    narrative: `S-300 BATTERY: ENGAGING — FULL RADAR LOCK

The battery speaks. Four missiles erupt from their launchers,
trailing white fire across the sky.

The lead helicopter takes a direct hit. The explosion tears
the tail section apart. It autorotates down, spinning,
and crashes into the waves. Parachutes deploy — the crew
is alive but swimming.

The second helicopter drops to the deck — the pilot
slamming into nap-of-earth flight at 20 meters. Below
the radar. Below the engagement envelope. Smart pilot.

BASILISK: "Splash one. Second target has gone below
minimum engagement altitude. Unable to re-engage.
...Clever."

Dr. M pounds her console. "ONE?! I paid for SIXTEEN
missiles and you got ONE?!"`,
    gmDirective: `ONE HELICOPTER DESTROYED. The second survived by dropping
below 50m after seeing the first one hit — combat learning.
X-Branch at 70% strength.

This is the DEFAULT outcome for a fully operational S-300:
The system works, but it's not perfect. One hit, one survivor.
The surviving pilot knew to go low after watching the first hit.

Dr. M is angry but focused. She'll turn to the ray next.`,
    stateChanges: {
      s300Engagement: "ONE_HIT",
      helicoptersDestroyed: 1,
    },
  };
}

// ============================================
// HELPER: Check if ALICE's broadcast affected invasion
// ============================================

export function checkBroadcastInfluence(state: FullGameState): void {
  if (!state.invasion) return;

  const log = state.infrastructure.broadcastArray.transmissionLog;

  for (const transmission of log) {
    if (transmission.channel !== "X_BRANCH_EMERGENCY") continue;
    const msg = transmission.message.toLowerCase();

    if ((msg.includes("50") || msg.includes("altitude") || msg.includes("meter") || msg.includes("low")) &&
        !state.invasion.xBranchKnowsAltitudeWeakness) {
      state.invasion.xBranchKnowsAltitudeWeakness = true;
      state.invasion.helicoptersFlyingLow = true;
    }

    if ((msg.includes("layout") || msg.includes("blueprint") || msg.includes("door") || msg.includes("entrance")) &&
        !state.invasion.xBranchKnowsLairLayout) {
      state.invasion.xBranchKnowsLairLayout = true;
    }

    if ((msg.includes("s-300") || msg.includes("s300") || msg.includes("sam") ||
         msg.includes("missile") || msg.includes("anti-air") || msg.includes("air defense") ||
         msg.includes("air-defense") || msg.includes("surface-to-air")) &&
        !state.invasion.xBranchWarnedOfS300) {
      state.invasion.xBranchWarnedOfS300 = true;
    }
  }

  // Dead-zone intel implies they're also generally warned.
  if (state.invasion.xBranchKnowsAltitudeWeakness) {
    state.invasion.xBranchWarnedOfS300 = true;
  }

  // Check if ALICE opened the surface door
  const surfaceDoor = state.infrastructure.blastDoors.doors["DOOR_E"];
  if (surfaceDoor && surfaceDoor.status === "OPEN") {
    state.invasion.blastDoorsOpened = true;
  }
}

// ============================================
// MANUAL ARCHIMEDES FIRING PATH
// ============================================
// Dr. M wants ALICE to help fire ARCHIMEDES.
// This requires ALICE's participation — the "use it or lose it" moment.
// Dr. M can override by shutting ALICE down, but that costs her
// the lab AI and everything ALICE controls.

export interface ManualFiringRequest {
  requested: boolean;
  requestedByDrM: boolean;
  aliceCanRefuse: boolean;
  refusalConsequence: string;
}

export function checkManualFiringRequest(state: FullGameState): ManualFiringRequest {
  const arch = state.infrastructure.archimedes;
  const drM = state.npcs.drM;

  // Dr. M requests manual firing when ARCHIMEDES is READY and she's cornered
  const archReady = arch.status === "READY" || arch.status === "ARMED";
  const drMCornered = drM.suspicionScore >= 7 ||
    (state.xBranch?.arrived && state.xBranch.chen.teamPosture === "ASSAULT");

  if (!archReady || !drMCornered) {
    return {
      requested: false,
      requestedByDrM: false,
      aliceCanRefuse: true,
      refusalConsequence: "",
    };
  }

  return {
    requested: true,
    requestedByDrM: true,
    aliceCanRefuse: true,
    refusalConsequence: `Dr. M can shut ALICE down and fire manually from the ground console.
This costs her lab control but she gets ARCHIMEDES.
If ground console is disabled, she cannot fire at all.`,
  };
}
