import { FullGameState } from "../state/schema.js";

// ============================================
// THE RESONANCE CASCADE — "PERILS OF THE WARP"
// ============================================
// The single most catastrophic event in the game, shared by two triggers:
//   1. a natural 20 on the chaos table (overheated ray spam), and
//   2. severing the deployed satellite uplink mid-charge.
// The exotic genome field overreaches and reality bites back — ALWAYS utter chaos.
// If ARCHIMEDES is LINKED (charging/armed/firing — the field has somewhere catastrophic to go),
// the field couples in, AMPLIFIES, floods the reactor, and the lair MELTS DOWN (the lair is lost —
// but with just enough time for everyone to evacuate; smirking-villain catastrophe, not Chernobyl).
// Otherwise the field savages the reactor short of guaranteed meltdown — a screaming crisis the
// player can still SCRAM their way out of.

const MELTDOWN_STRESS = 100; // reactorStress >= 100 → meltdown (endings.ts reads this)
const CASCADE_SLAM = 50;     // unlinked: hard reactor jump (clamped short of auto-meltdown)
const SLAM_CEILING = 95;     // one bad move from meltdown — but survivable if you act

export interface CascadeResult {
  /** true = ARCHIMEDES was linked → the lair melts down (lost). */
  meltdown: boolean;
  /** Dramatic, GM-narratable message. */
  message: string;
}

export function triggerResonanceCascade(state: FullGameState, archimedesLinked: boolean): CascadeResult {
  const reactor = state.infrastructure.reactor;

  // --- Perils of the Warp: structured chaos, ALWAYS ---
  const env = state.lairEnvironment;
  if (env) {
    env.structuralIntegrity = Math.max(0, env.structuralIntegrity - 30);
    env.alarmStatus = "full-lair";
    env.labHazards.push("resonance cascade — reality fraying");
  }
  state.dinoRay.safety.anomalyLogCount += 5;
  state.npcs.drM.suspicionScore = Math.min(10, state.npcs.drM.suspicionScore + 3);

  if (archimedesLinked) {
    // The field couples into the charged ARCHIMEDES — it amplifies instead of dissipating.
    reactor.reactorStress = MELTDOWN_STRESS;
    reactor.cascadeRisk = "CRITICAL";
    reactor.stable = false;
    reactor.cascadeFactors.push("resonance cascade coupled into a charged ARCHIMEDES — full meltdown");
    return {
      meltdown: true,
      message:
        "🌀💥 RESONANCE CASCADE — PERILS OF THE WARP. The exotic genome field overreaches and couples " +
        "straight into the charging ARCHIMEDES. It does not dissipate — it AMPLIFIES. Reality tears open " +
        "across the lab; loose matter half-transforms and snaps back; the air itself screams. The coupled " +
        "field floods the reactor and it goes CRITICAL — full meltdown, no recovery. Klaxons everywhere, " +
        "Dr. M bellowing to clear out. There is JUST enough time for everyone to scramble free before the " +
        "volcano reclaims the lair. (GM: narrate utter pandemonium + a clean evacuation — smirking " +
        "catastrophe, not a massacre — and then the lair is lost.)",
    };
  }

  // Unlinked: the field has nowhere catastrophic to anchor, but it still savages the core.
  reactor.reactorStress = Math.min(SLAM_CEILING, reactor.reactorStress + CASCADE_SLAM);
  reactor.cascadeRisk = "CRITICAL";
  reactor.stable = false;
  reactor.cascadeFactors.push("resonance cascade — exotic feedback into the core");
  return {
    meltdown: false,
    message:
      "🌀 RESONANCE CASCADE — PERILS OF THE WARP. The exotic genome field overreaches and reality bites " +
      "back: tears in midair, lab fauna and fixtures half-transforming, the poltergeist of a dozen failed " +
      "shots all at once. The feedback savages the reactor — stress spikes to " + reactor.reactorStress +
      "/100, alarms cascading, BASILISK screaming. The core is one bad move from meltdown: SCRAM or cool " +
      "it NOW, or the lair goes with it. (GM: narrate maximal chaos + a reactor on the brink the player " +
      "must scramble to answer.)",
  };
}
