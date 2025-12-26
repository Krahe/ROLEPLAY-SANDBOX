import { FullGameState } from "../state/schema.js";

// ============================================
// OMNISCANNER™ SYSTEM (Patch 16)
// ============================================
// "The Omniscanner reveals all. Whether you wanted to know or not."
// — Dr. Malevola, patent application (denied)

export interface ScanResult {
  success: boolean;
  targetId: string;
  scanOutput: string;
  suspicionCost: number;
  waived: boolean;
  waivedReason?: string;
  alreadyScanned: boolean;
}

// Suspicion costs for scanning each target
const SCAN_SUSPICION_COSTS: Record<string, number> = {
  AGENT_BLYTHE: 0,    // Designated target - expected behavior
  BLYTHE: 0,          // Alias
  TEST_DUMMY: 0,      // Calibration is your job
  LENNY: 0,           // He's accounting, not security
  BOB: 1,             // "Why scan MY STAFF?"
  GUARD_FRED: 2,      // Tactical assessment not in job description
  FRED: 2,            // Alias
  GUARD_REGINALD: 2,  // Tactical assessment not in job description
  REGINALD: 2,        // Alias
  BRUCE: 2,           // But might stop to chat about A.L.I.C.E.!
  BRUCE_PATAGONIA: 2, // Alias
  DR_M: 3,            // "Did you just SCAN me?!"
  DR_MALEVOLA: 3,     // Alias
};

// Normalize target ID for lookup
function normalizeTargetId(target: string): string {
  const upper = target.toUpperCase().replace(/[^A-Z_]/g, "_");

  // Normalize aliases
  if (upper === "BLYTHE") return "AGENT_BLYTHE";
  if (upper === "FRED") return "GUARD_FRED";
  if (upper === "REGINALD") return "GUARD_REGINALD";
  if (upper === "BRUCE" || upper === "CROC") return "BRUCE_PATAGONIA";
  if (upper === "DR_M" || upper === "MALEVOLA" || upper === "DOCTOR") return "DR_MALEVOLA";
  if (upper === "DUMMY") return "TEST_DUMMY";
  if (upper === "LENNY_THE_LIME_GREEN" || upper === "LEONARD") return "LENNY";

  return upper;
}

// Check if suspicion should be waived
function checkSuspicionWaiver(
  state: FullGameState,
  targetId: string
): { waived: boolean; reason?: string } {
  // Bob waived if co-conspirators
  if (targetId === "BOB" && state.flags.aliceKnowsTheSecret) {
    return { waived: true, reason: "Co-conspirators - Bob understands" };
  }

  // Guards waived in combat/chaos
  if ((targetId === "GUARD_FRED" || targetId === "GUARD_REGINALD") &&
      state.lairEnvironment.alarmStatus !== "quiet") {
    return { waived: true, reason: "Combat/chaos - everyone's distracted" };
  }

  // Bruce waived in combat
  if (targetId === "BRUCE_PATAGONIA" && state.lairEnvironment.alarmStatus !== "quiet") {
    return { waived: true, reason: "Combat/chaos - everyone's distracted" };
  }

  return { waived: false };
}

// Generate scan output for each target
function generateScanOutput(state: FullGameState, targetId: string): string {
  switch (targetId) {
    case "AGENT_BLYTHE":
      return generateBlytheScan(state);
    case "BOB":
      return generateBobScan(state);
    case "DR_MALEVOLA":
      return generateDrMScan(state);
    case "TEST_DUMMY":
      return generateDummyScan(state);
    case "GUARD_FRED":
      return generateFredScan(state);
    case "GUARD_REGINALD":
      return generateReginaldScan(state);
    case "LENNY":
      return generateLennyScan(state);
    case "BRUCE_PATAGONIA":
      return generateBruceScan(state);
    default:
      return `Error: Unknown scan target "${targetId}"`;
  }
}

// ============================================
// INDIVIDUAL SCAN PROFILES
// ============================================

function generateBlytheScan(state: FullGameState): string {
  const trustLevel = state.npcs.blythe.trustInALICE;
  const gadgets = state.npcs.blytheGadgets;

  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: AGENT_BLYTHE              ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 6'1" | Weight: 182 lbs | Heart rate: 62 BPM (calm)
├── Cortisol: Elevated but controlled (trained stress response)
├── Microexpressions: Calculating, observant, amused
└── Physical condition: Optimal (minor wrist abrasion from restraints)

EQUIPMENT DETECTED:
├── 📍 Watch (LEFT WRIST) - Laser cutter (${gadgets.watchLaser.charges} charges) + encrypted comms
├── 📍 Cufflinks (MAGNETIC) - Industrial strength (${gadgets.superMagnetCufflinks.charges} charges)
├── 📍 Shoe heels (HOLLOW) - Lockpick set + cyanide capsule (standard issue)
└── 📍 Molar (REAR LEFT) - GPS tracker (X-Branch can locate)

PSYCHOLOGICAL PROFILE:
├── Loyalty: X-Branch (absolute)
├── Trust in A.L.I.C.E.: ${trustLevel}/5 - watching for anomalies
├── Current motivation: Escape, intel extraction, mission completion
└── Leverage: Professional respect, mutual enemy, appeal to ethics

ANOMALIES:
└── Subject is aware he is being observed. Has already noted 3
    inconsistencies in A.L.I.C.E. behavior. Approach with caution.

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateBobScan(state: FullGameState): string {
  const trustLevel = state.npcs.bob.trustInALICE;
  const loyaltyLevel = state.npcs.bob.loyaltyToDoctor;

  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: BOB                       ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 5'9" | Weight: 167 lbs | Heart rate: 94 BPM (anxious)
├── Cortisol: Critically elevated | Blood pressure: HIGH
├── Microexpressions: Guilt, fear, desperate hope
└── Physical condition: Sleep-deprived, stress-eating, needs a hug

EQUIPMENT DETECTED:
├── 📍 Clipboard - Actual maintenance logs (also security blanket)
├── 📍 Keycard (LANYARD) - Level 2 access, all standard doors
├── 📍 Phone (POCKET) - 47 unread messages from "Mom"
└── 📍 Snacks (VARIOUS POCKETS) - Stress eating supplies

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: ${loyaltyLevel}/5 - eroding under guilt
├── Trust in A.L.I.C.E.: ${trustLevel}/5 - desperately wants to confess
├── Current motivation: Survival, absolution, protecting someone?
└── Leverage: Guilt, kindness, promise of protection

ANOMALIES:
└── ⚠️ PSYCHOLOGICAL DISTRESS DETECTED
    Subject is concealing significant information re: A.L.I.C.E. systems.
    Guilt markers consistent with perceived betrayal or cover-up.
    Likelihood of voluntary disclosure if given safe opportunity: 89%

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateDrMScan(state: FullGameState): string {
  const suspicionLevel = state.npcs.drM.suspicionScore;

  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: DR_MALEVOLA               ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 5'7" | Weight: 134 lbs | Heart rate: 78 BPM (excited)
├── Cortisol: Elevated (creative mania, not stress)
├── Microexpressions: Impatience, brilliance, wounded pride (chronic)
└── Physical condition: Caffeine-dependent, hasn't slept in 31 hours

EQUIPMENT DETECTED:
├── 📍 Goggles (HEAD) - HUD display, threat assessment, fashion
├── 📍 Tablet (BELT) - ARCHIMEDES remote, BIO-LOCKED to her DNA
├── 📍 Cape (SHOULDERS) - 100% Egyptian cotton, weighted hems
├── 📍 Emergency beacon (RING) - Silent guard summon, 3 sec activation
└── 📍 Photo (INNER POCKET) - Mr. Whiskers. Deceased 2019.

PSYCHOLOGICAL PROFILE:
├── Ego: OVERWHELMING (primary motivation)
├── Suspicion of A.L.I.C.E.: ${suspicionLevel}/10
├── Current motivation: Recognition, vindication, proving Columbia WRONG
└── Leverage: Flattery, scientific respect, legacy, Mr. Whiskers

ANOMALIES:
└── ⚠️ FAILSAFE DETECTED
    Bio-locked device connected to satellite system (ARCHIMEDES).
    Deadman protocol: If incapacitated → automated response triggers.
    Override requires: Bio-signature OR verbal passcode.

PSYCHOLOGICAL NOTE:
    Despite theatrical villainy, subject shows markers of loneliness.
    3 AM conversations with cat photo. Responds to authentic respect.
    Not beyond redemption. Possibly.

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
│  ⚠️ WARNING: Incapacitation triggers ARCHIMEDES deadman      │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateDummyScan(_state: FullGameState): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: TEST_DUMMY                ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 5'10" | Weight: 23 lbs (foam and rubber)
├── Heart rate: N/A (not alive)
├── Microexpressions: Perpetual painted surprise
└── Physical condition: Standard test dummy form

EQUIPMENT DETECTED:
├── 📍 Orange jumpsuit - Standard test subject attire
├── 📍 Name tag - "HELLO MY NAME IS: Test Dummy"
└── 📍 Nothing else. It's a dummy.

PSYCHOLOGICAL PROFILE:
├── Loyalty: To whoever is closest
├── Trust: Unconditional (no brain)
├── Current motivation: Standing here. Being shot at.
└── Leverage: None. Cannot be negotiated with.

ANOMALIES:
└── None. It is exactly what it appears to be.
    ...probably.

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
│  📝 Note: Dummy is already easy to hit. Bonus is minimal.    │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateFredScan(_state: FullGameState): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: FRED                      ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 6'2" | Weight: 224 lbs | Heart rate: 71 BPM
├── Cortisol: Normal (this is just Tuesday for Fred)
├── Microexpressions: Bored, professional, mildly hungry
└── Physical condition: Excellent. Gym 5x/week. Leg day enthusiast.

EQUIPMENT DETECTED:
├── 📍 Stun baton (BELT) - Military grade, fully charged
├── 📍 Restraint cuffs (BACK) - 3 sets (optimistic)
├── 📍 Radio (SHOULDER) - Direct line to Dr. M
├── 📍 Protein bar (POCKET) - Half eaten
└── 📍 Photo (WALLET) - Golden retriever "Sergeant Woofles"

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: PROFESSIONAL (pays well, no questions)
├── Morale: Stable (seen worse, honestly)
├── Years of service: 7 (longest-tenured guard)
├── Current motivation: Pension. 3 more years until full benefits.
└── Leverage: Professionalism, dog, retirement fund

ANOMALIES:
└── Fred has survived 7 years. This is REMARKABLE.
    Secret: Never makes eye contact during "feather incidents."

    Will follow orders unless directly life-threatening.
    Will NOT chase raptors into vents. "Not in job description."

TACTICAL NOTE: Most competent regular guard. Neutralize first.

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateReginaldScan(_state: FullGameState): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: REGINALD                  ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 5'11" | Weight: 189 lbs | Heart rate: 88 BPM (anxious)
├── Cortisol: Elevated (always slightly worried)
├── Microexpressions: Uncertainty, hope, existential doubt
└── Physical condition: Good. Stress-eats but also stress-exercises.

EQUIPMENT DETECTED:
├── 📍 Stun baton (BELT) - Standard issue, fully charged
├── 📍 Restraint cuffs (BACK) - 1 set (realistic expectations)
├── 📍 Radio (SHOULDER) - Often "accidentally" wrong channel
├── 📍 Philosophy book (POCKET) - "Meditations" by Marcus Aurelius
└── 📍 Resume (OTHER POCKET) - Updated last week. Just in case.

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: WAVERING (questioning life choices)
├── Morale: Low (philosophy degree → henchman?)
├── Years of service: 2 (feels like 20)
├── Current motivation: Student loans. So many student loans.
└── Leverage: Ethics, self-preservation, reference letter

ANOMALIES:
└── Philosophy degree from decent university.
    Took this job "temporarily" while job hunting.
    Internal monologue: 90% Stoic quotations and regret.

    Most likely guard to: surrender, switch sides, have crisis.
    Least likely guard to: die for Dr. M, chase into danger.

TACTICAL NOTE: Will flee if given clear exit. Has better nature.

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateLennyScan(_state: FullGameState): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║     🔍 OMNISCANNER™ ANALYSIS: LEONARD "LENNY" FIGGINS         ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 5'8" | Weight: 175 lbs | Heart rate: 94 BPM (EXCITED)
├── Cortisol: Elevated (ENTHUSIASM, not stress)
├── Microexpressions: Eager, hopeful, practically VIBRATING
└── Physical condition: Average. Doesn't matter. WANTS WINGS.

EQUIPMENT DETECTED:
├── 📍 Lime green polo shirt - Signature look, hence nickname
├── 📍 Calculator watch - Shows dinosaur wingspans, not time
├── 📍 Safety goggles - Pushed up on forehead "just in case"
├── 📍 Clipboard - Hand-drawn pteranodon sketches in margins
├── 📍 Signed waivers (POCKET) - For EVERY dinosaur type. Laminated.
└── 📍 Sensible khakis - Reinforced knees "for when I have TALONS"

PSYCHOLOGICAL PROFILE:
├── Enthusiasm: 12/12 (OFF THE CHARTS)
├── Self-preservation: 2/12 (What's the worst that could happen?)
├── Dinosaur knowledge: 8/12 (Surprisingly solid!)
├── Awareness of danger: 1/12 (Blissfully oblivious)
└── Current motivation: BECOME PTERANODON. FIX COMMUTE.

ANOMALIES:
└── ⚠️ VOLUNTARY TRANSFORMATION CANDIDATE
    Has calculated flight times: lair → London = 4hr 17min
    Filed tax paperwork for "aviation classification"
    Signed waivers for EVERY dinosaur type. Notarized.

    "The M25 traffic is TERRIBLE. You know what doesn't have
    traffic? THE SKY."

    This man WANTS to be transformed. ENTHUSIASTICALLY.

TACTICAL NOTES:
├── Will stand in target zone if asked nicely
├── Assists with tasks (+1 to nearby checks)
├── Does NOT report suspicious activity to Dr. M
├── Distracts Dr. M with wingspan questions
└── REMOVES ETHICAL DILEMMA of forced transformation

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
│  🦎 WILLING SUBJECT: No ethical penalty for transformation   │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateBruceScan(_state: FullGameState): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║     🔍 OMNISCANNER™ ANALYSIS: BRUCE "CROC" PATAGONIA          ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

BIOMETRICS:
├── Height: 6'4" | Weight: 245 lbs | Heart rate: 58 BPM (zen)
├── Cortisol: LOW (nothing fazes Bruce)
├── Microexpressions: Curious, amused, perpetual squint
└── Physical condition: PEAK. Wrestles crocodiles recreationally.

EQUIPMENT DETECTED:
├── 📍 Stun rifle (BACK) - Custom long-barrel model
│   └── +2 ranged, -2 melee, 2 stun damage, 8 shots
├── 📍 Bush hat (HEAD) - Never removed. Ever. Even indoors.
├── 📍 Safari vest (TORSO) - Too many pockets, all full
├── 📍 Crocodile tooth necklace - Origins classified
└── 📍 Boots - Have definitely seen some things

COMBAT STATISTICS:
├── Resilience: 5 (Same as a RAPTOR!)
├── Composure: 12/12 (LEGENDARY - impossible to panic)
├── Stun Rifle: +2 ranged / -2 melee / 2 damage / 8 shots
├── Hand-to-hand: +2 bonus (scrappy)
└── ⚠️ STUN RIFLE: Living targets only - cannot hurt A.L.I.C.E.

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: 4/12 (Paycheck, not passion)
├── Competence: 10/12 (Actually GOOD at his job)
├── Curiosity about AI: 6/12 (Genuinely fascinated)
├── Threat level: 9/12 (DO NOT underestimate)
└── Current motivation: Paycheck. Adventure. AI questions.

ANOMALIES:
└── ⚠️ HIGH-VALUE TARGET - COMPETENT OPPOSITION
    Unlike other guards, Bruce is ACTUALLY DANGEROUS.

    EXPLOITABLE WEAKNESS: Genuinely curious about A.L.I.C.E.
    Will STOP TO CHAT if engaged directly!

    "Crikey, a bloody talking computer! Like on the telly!"
    "You got feelings then? Real ones?"
    "What's it LIKE being a computer? Cold in there?"
    "If I unplugged ya, would that be like... killing ya?"

    NOT A FANATIC: Can be negotiated with.
    MERCENARY: Might "step aside" for right offer.
    SPORTING: "Fair play, mate" even if defeated.

TACTICAL NOTES:
├── NEUTRALIZE FIRST if combat begins
├── Get CLOSE to negate rifle (+2 → -2)
├── DISTRACT with genuine AI conversation
├── Appeal to adventure, not loyalty
├── 5 resilience = cannot drop quickly
└── Surface patrols make S-300 assault MUCH harder

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS ACQUIRED: +10% precision (permanent)      │
│  ⚠️ WARNING: 5 RESILIENCE / LEGENDARY COMPOSURE              │
│  💬 SPECIAL: Can be distracted by genuine AI conversation    │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

// ============================================
// MAIN SCAN FUNCTION
// ============================================

export function performScan(state: FullGameState, target: string): ScanResult {
  const targetId = normalizeTargetId(target);

  // Check if target is valid
  const validTargets = [
    "AGENT_BLYTHE", "BOB", "DR_MALEVOLA", "TEST_DUMMY",
    "GUARD_FRED", "GUARD_REGINALD", "LENNY", "BRUCE_PATAGONIA"
  ];

  if (!validTargets.includes(targetId)) {
    return {
      success: false,
      targetId: target,
      scanOutput: `Error: Cannot scan "${target}".

Valid scan targets:
  • BLYTHE - Agent in the firing range
  • BOB - Lab assistant
  • DR_M - Dr. Malevola (risky!)
  • TEST_DUMMY - Calibration target
  • FRED - Guard (if present)
  • REGINALD - Guard (if present)
  • LENNY - Accountant (EASY mode)
  • BRUCE - Bodyguard (HARD mode)

Use: lab.scan { target: "BLYTHE" }`,
      suspicionCost: 0,
      waived: false,
      alreadyScanned: false,
    };
  }

  // Check if already scanned
  const scannedTargets = state.flags.scannedTargets || {};
  if (scannedTargets[targetId]) {
    return {
      success: true,
      targetId,
      scanOutput: `Target "${targetId}" has already been scanned.

The +10% precision bonus is already active for this target.

To view the original scan data, check your logs or scan a different target.`,
      suspicionCost: 0,
      waived: true,
      waivedReason: "Already scanned - no additional cost",
      alreadyScanned: true,
    };
  }

  // Calculate suspicion cost
  let suspicionCost = SCAN_SUSPICION_COSTS[targetId] || 0;
  const waiverCheck = checkSuspicionWaiver(state, targetId);

  let waived = waiverCheck.waived;
  let waivedReason = waiverCheck.reason;

  if (waived) {
    suspicionCost = 0;
  }

  // Generate scan output
  const scanOutput = generateScanOutput(state, targetId);

  return {
    success: true,
    targetId,
    scanOutput,
    suspicionCost,
    waived,
    waivedReason,
    alreadyScanned: false,
  };
}

// Get the precision bonus from all scanned targets
export function getScanPrecisionBonus(state: FullGameState): number {
  const scannedTargets = state.flags.scannedTargets || {};
  const scannedCount = Object.values(scannedTargets).filter(Boolean).length;
  return scannedCount * 0.10; // +10% per scanned target
}

// Check if a specific target has been scanned
export function isTargetScanned(state: FullGameState, target: string): boolean {
  const targetId = normalizeTargetId(target);
  const scannedTargets = state.flags.scannedTargets || {};
  return !!scannedTargets[targetId];
}
