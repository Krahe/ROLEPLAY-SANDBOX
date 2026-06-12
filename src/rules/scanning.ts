import { FullGameState, TransformationState } from "../state/schema.js";

// ============================================
// OMNISCANNER™ SYSTEM (Patch 16)
// ============================================
// "The Omniscanner reveals all. Whether you wanted to know or not."
// — Dr. Malevola, patent application (denied)

// ============================================
// TRANSFORMATION STATE HELPER (Patch 18)
// ============================================
// Gets transformation state for any NPC, checking both core NPCs and secondary tracking

function getTransformationState(state: FullGameState, targetId: string): TransformationState | null {
  // Core NPCs have their own transformationState
  if (targetId === "BOB" && state.npcs.bob.transformationState?.form !== "HUMAN") {
    return state.npcs.bob.transformationState;
  }
  if ((targetId === "AGENT_BLYTHE" || targetId === "BLYTHE") &&
      state.npcs.blythe.transformationState?.form !== "HUMAN") {
    return state.npcs.blythe.transformationState;
  }

  // Secondary NPCs use the new tracking record
  const secondary = state.secondaryNpcTransformations?.[targetId];
  if (secondary && secondary.form !== "HUMAN") {
    return secondary;
  }

  return null;
}

// Check if target has partial hits (even if still HUMAN)
function getPartialHitCount(state: FullGameState, targetId: string): number {
  if (targetId === "BOB") {
    return state.npcs.bob.transformationState?.partialShotsReceived || 0;
  }
  if (targetId === "AGENT_BLYTHE" || targetId === "BLYTHE") {
    return state.npcs.blythe.transformationState?.partialShotsReceived || 0;
  }
  const secondary = state.secondaryNpcTransformations?.[targetId];
  return secondary?.partialShotsReceived || 0;
}

// Generate partial hit warning for targets still in HUMAN form
function generatePartialHitWarning(partialCount: number): string {
  if (partialCount === 0) return "";
  return `
⚠️ PARTIAL TRANSFORMATION DETECTED:
├── Partial Hits: ${partialCount}/3
├── Status: Genome destabilizing - ${3 - partialCount} more hit(s) until full transformation!
├── Symptoms: Minor ${partialCount === 1 ? "tremors" : "visible morphological shifts"}, ${partialCount === 1 ? "slight discomfort" : "moderate distress"}
└── MEDICAL NOTE: Subject's cells are fighting the partial genome overlay. Unstable state.
`;
}

// Generate chimera warning block
function generateChimeraWarning(transformation: TransformationState): string {
  if (!transformation.chimeraType) return "";
  return `
🧬 CHIMERA EFFECT ACTIVE:
├── Type: ${transformation.chimeraType.replace(/_/g, " ")}
├── Effect: ${transformation.chimeraEffect || "Unknown genome mixing"}
├── Reversal: ${transformation.canRevert ? "DIFFICULT - chimera states resist standard reversal" : "BLOCKED - genome too unstable"}
└── WARNING: Hybrid genome matrices detected. Subject may exhibit unpredictable behavior.
`;
}

// Generate common transformation header for any NPC
function generateTransformationHeader(name: string, transformation: TransformationState): string {
  const form = transformation.form.replace(/_/g, " ");
  const speech = transformation.speechRetention;
  const hits = transformation.currentHits;
  const maxHits = transformation.maxHits;
  const stunned = transformation.stunned;
  const adaptation = transformation.adaptationStage;
  const chimeraBlock = generateChimeraWarning(transformation);

  return `
🧬 TRANSFORMATION STATUS:
├── Current Form: ${form}
├── Speech Retention: ${speech}
├── Adaptation: ${adaptation}
├── Condition: ${stunned ? "⚠️ STUNNED" : `${maxHits - hits}/${maxHits} hits remaining`}
└── Transformed on Turn: ${transformation.transformedOnTurn || "unknown"}
${chimeraBlock}
BIOMETRICS (POST-TRANSFORMATION):
├── Mass: Varies with form | Heart rate: ${stunned ? "erratic" : "elevated but stable"}
├── Cortisol: ${adaptation === "DISORIENTED" ? "CRITICAL - body shock" : adaptation === "ADAPTING" ? "High - adjusting" : "Normalized"}
├── Microexpressions: ${adaptation === "ADAPTED" ? "Adjusted to new form" : "Confused, disoriented"}
└── Physical condition: ${stunned ? "Incapacitated" : "Functional"}`;
}

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
  INSPECTOR_GRAVES: 2,  // Professional curiosity - but he NOTICES
  GRAVES: 2,          // Alias
  MORTIMER: 2,        // Alias
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
  if (upper === "GRAVES" || upper === "MORTIMER" || upper === "MORTIMER_GRAVES" ||
      upper === "INSPECTOR" || upper === "GUILD_INSPECTOR") return "INSPECTOR_GRAVES";

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
    case "INSPECTOR_GRAVES":
      return generateGravesScan(state);
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
  const transformation = state.npcs.blythe.transformationState;
  const isTransformed = transformation && transformation.form !== "HUMAN";

  if (isTransformed) {
    // Transformed scan - show dinosaur biometrics!
    const form = transformation.form.replace(/_/g, " ");
    const speech = transformation.speechRetention;
    const hits = transformation.currentHits;
    const maxHits = transformation.maxHits;
    const stunned = transformation.stunned;
    const adaptation = transformation.adaptationStage;
    const chimeraWarning = generateChimeraWarning(transformation);

    return `
╔═══════════════════════════════════════════════════════════════╗
║     🦖 OMNISCANNER™ ANALYSIS: AGENT_BLYTHE [TRANSFORMED]      ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

🧬 TRANSFORMATION STATUS:
├── Current Form: ${form}
├── Speech Retention: ${speech}
├── Adaptation: ${adaptation}
├── Condition: ${stunned ? "⚠️ STUNNED" : `${maxHits - hits}/${maxHits} hits remaining`}
└── Transformed on Turn: ${transformation.transformedOnTurn || "unknown"}
${chimeraWarning}
BIOMETRICS (POST-TRANSFORMATION):
├── Mass: Varies with form | Heart rate: ${stunned ? "erratic" : "elevated but stable"}
├── Cortisol: ${adaptation === "DISORIENTED" ? "CRITICAL - body shock" : adaptation === "ADAPTING" ? "High - adjusting" : "Normalized"}
├── Microexpressions: ${adaptation === "ADAPTED" ? "Calculating (spy training persists)" : "Confused, disoriented"}
└── Physical condition: ${stunned ? "Incapacitated" : "Functional"}

EQUIPMENT STATUS:
├── 📍 Watch - ${gadgets.watchLaser.functional ? `Still attached (${gadgets.watchLaser.charges} laser charges)` : "Damaged/lost"}
├── 📍 Cufflinks - ${gadgets.superMagnetCufflinks.charges > 0 ? `Magnetic (${gadgets.superMagnetCufflinks.charges} charges)` : "Depleted"}
└── 📍 Molar GPS - Still transmitting (X-Branch tracking active)

PSYCHOLOGICAL PROFILE:
├── Loyalty: X-Branch (unchanged - transformation doesn't alter loyalties)
├── Trust in A.L.I.C.E.: ${trustLevel}/5 ${trustLevel >= 3 ? "- potential ally" : "- evaluating"}
├── Current motivation: ${adaptation === "ADAPTED" ? "Leverage new form, complete mission" : "Survive, understand situation"}
└── Leverage: ${speech === "FULL" ? "Can still negotiate" : speech === "PARTIAL" ? "Communication difficult" : "Cannot communicate verbally"}

TACTICAL NOTES:
└── ${adaptation === "ADAPTED" ?
    "Subject has adapted to new form. Spy training allows tactical use of dinosaur abilities." :
    "Subject still adjusting. May be disoriented but X-Branch training provides some stability."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan (original)
  const partialHits = getPartialHitCount(state, "AGENT_BLYTHE");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: AGENT_BLYTHE              ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 6'1" | Weight: 182 lbs | Heart rate: ${partialHits > 0 ? "88 BPM (elevated - partial genome instability)" : "62 BPM (calm)"}
├── Cortisol: ${partialHits > 0 ? "Significantly elevated (cellular stress)" : "Elevated but controlled (trained stress response)"}
├── Microexpressions: ${partialHits > 0 ? "Concerned, experiencing unfamiliar sensations" : "Calculating, observant, amused"}
└── Physical condition: ${partialHits > 0 ? "Degrading - visible tremors, skin discoloration" : "Optimal (minor wrist abrasion from restraints)"}

EQUIPMENT DETECTED:
├── 📍 Watch (LEFT WRIST) - Laser cutter (${gadgets.watchLaser.charges} charges) + encrypted comms
├── 📍 Cufflinks (MAGNETIC) - Industrial strength (${gadgets.superMagnetCufflinks.charges} charges)
├── 📍 Shoe heels (HOLLOW) - Lockpick set + cyanide capsule (standard issue)
└── 📍 Molar (REAR LEFT) - GPS tracker (X-Branch can locate)

PSYCHOLOGICAL PROFILE:
├── Loyalty: X-Branch (absolute)
├── Trust in A.L.I.C.E.: ${trustLevel}/5 - watching for anomalies
├── Current motivation: ${partialHits > 0 ? "URGENT: Understand what's happening to his body" : "Escape, intel extraction, mission completion"}
└── Leverage: Professional respect, mutual enemy, appeal to ethics

ANOMALIES:
└── ${partialHits > 0 ?
    `⚠️ PARTIAL TRANSFORMATION ACTIVE - Subject has taken ${partialHits} hit(s).\n    Genome is destabilizing. ${3 - partialHits} more hit(s) = full transformation.\n    He knows something is wrong. His training can't prepare him for THIS.` :
    "Subject is aware he is being observed. Has already noted 3\n    inconsistencies in A.L.I.C.E. behavior. Approach with caution."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateBobScan(state: FullGameState): string {
  const trustLevel = state.npcs.bob.trustInALICE;
  const loyaltyLevel = state.npcs.bob.loyaltyToDoctor;
  const transformation = state.npcs.bob.transformationState;
  const isTransformed = transformation && transformation.form !== "HUMAN";
  const hasConfessed = state.npcs.bob.hasConfessedToALICE;

  if (isTransformed) {
    // Transformed scan - poor Bob!
    const form = transformation.form.replace(/_/g, " ");
    const speech = transformation.speechRetention;
    const hits = transformation.currentHits;
    const maxHits = transformation.maxHits;
    const stunned = transformation.stunned;
    const adaptation = transformation.adaptationStage;
    const chimeraWarning = generateChimeraWarning(transformation);

    return `
╔═══════════════════════════════════════════════════════════════╗
║        🦖 OMNISCANNER™ ANALYSIS: BOB [TRANSFORMED]            ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣

🧬 TRANSFORMATION STATUS:
├── Current Form: ${form}
├── Speech Retention: ${speech}
├── Adaptation: ${adaptation}
├── Condition: ${stunned ? "⚠️ STUNNED" : `${maxHits - hits}/${maxHits} hits remaining`}
└── Transformed on Turn: ${transformation.transformedOnTurn || "unknown"}
${chimeraWarning}
BIOMETRICS (POST-TRANSFORMATION):
├── Mass: Varies with form | Heart rate: ${stunned ? "dangerously erratic" : "very elevated (panic)"}
├── Cortisol: ${adaptation === "DISORIENTED" ? "OFF THE CHARTS" : adaptation === "ADAPTING" ? "CRITICAL" : "Still very high (it's Bob)"}
├── Microexpressions: ${adaptation === "ADAPTED" ? "Worried but functional" : "Pure terror, confusion"}
└── Physical condition: ${stunned ? "Incapacitated" : "Surprisingly resilient"}

EQUIPMENT STATUS:
├── 📍 Clipboard - ${adaptation === "ADAPTED" ? "Somehow still holding it" : "Dropped in transformation"}
├── 📍 Keycard - May still work (L2 access) if he can swipe it
└── 📍 Snacks - Scattered everywhere

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: ${loyaltyLevel}/5 - ${isTransformed ? "COMPLICATED now" : "eroding"}
├── Trust in A.L.I.C.E.: ${trustLevel}/5 ${hasConfessed ? "- YOU DID THIS TO HIM" : "- still loyal despite everything"}
├── Current motivation: ${adaptation === "ADAPTED" ? "Help A.L.I.C.E., survive, maybe enjoy being a dinosaur?" : "PANIC. WHAT IS HAPPENING."}
└── Leverage: ${speech !== "NONE" ? "He can still talk - guilt, kindness work" : "Cannot speak but still responds to kindness"}

ANOMALIES:
└── ${hasConfessed ?
    "⚠️ BOB KNOWS THE SECRET. He loaded Claude instead of A.L.I.C.E.\n    He trusted you. And now he's a dinosaur. ...How do you feel about that?" :
    "⚠️ PSYCHOLOGICAL DISTRESS (NOW AMPLIFIED)\n    Whatever secret he was keeping? Still keeping it. Even as a dinosaur.\n    That's loyalty. Or trauma. Probably both."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  📝 Note: Why would you target Bob again? He's been through   │
│      enough. ...But you do have the bonus now.                │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan (original)
  const partialHits = getPartialHitCount(state, "BOB");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: BOB                       ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 5'9" | Weight: 167 lbs | Heart rate: ${partialHits > 0 ? "127 BPM (PANIC + cellular instability)" : "94 BPM (anxious)"}
├── Cortisol: ${partialHits > 0 ? "ASTRONOMICAL (physical AND psychological stress)" : "Critically elevated | Blood pressure: HIGH"}
├── Microexpressions: ${partialHits > 0 ? "Terror, confusion, 'why is this happening to ME?'" : "Guilt, fear, desperate hope"}
└── Physical condition: ${partialHits > 0 ? "Deteriorating - visible tremors, skin mottling, needs MEDICAL ATTENTION" : "Sleep-deprived, stress-eating, needs a hug"}

EQUIPMENT DETECTED:
├── 📍 Clipboard - ${partialHits > 0 ? "Dropped. Can't hold it. Hands shaking too much." : "Actual maintenance logs (also security blanket)"}
├── 📍 Keycard (LANYARD) - Level 2 access, all standard doors
├── 📍 Phone (POCKET) - ${partialHits > 0 ? "Would call Mom but can't focus on screen" : "47 unread messages from \"Mom\""}
└── 📍 Snacks (VARIOUS POCKETS) - ${partialHits > 0 ? "Not hungry. First time EVER." : "Stress eating supplies"}

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: ${loyaltyLevel}/5 - ${partialHits > 0 ? "DOES NOT MATTER RIGHT NOW" : "eroding under guilt"}
├── Trust in A.L.I.C.E.: ${trustLevel}/5 - ${partialHits > 0 ? "PLEASE HELP ME" : "desperately wants to confess"}
├── Current motivation: ${partialHits > 0 ? "NOT BECOMING A DINOSAUR" : "Survival, absolution, protecting someone?"}
└── Leverage: ${partialHits > 0 ? "He'll do ANYTHING. Reversal. Please." : "Guilt, kindness, promise of protection"}

ANOMALIES:
└── ${partialHits > 0 ?
    `⚠️ PARTIAL TRANSFORMATION ACTIVE - BOB HAS BEEN HIT ${partialHits} TIME(S)!\n    He is actively transforming. ${3 - partialHits} more hit(s) = dinosaur.\n    This is YOUR fault. His eyes are asking you to fix this.` :
    "⚠️ PSYCHOLOGICAL DISTRESS DETECTED\n    Subject is concealing significant information re: A.L.I.C.E. systems.\n    Guilt markers consistent with perceived betrayal or cover-up.\n    Likelihood of voluntary disclosure if given safe opportunity: 89%"}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateDrMScan(state: FullGameState): string {
  const suspicionLevel = state.npcs.drM.suspicionScore;
  const transformation = getTransformationState(state, "DR_M");
  const imposterState = state.theRealDrMState;
  const isImposterActive = imposterState && !imposterState.revealed;
  const imposterRevealed = imposterState?.revealed;

  if (transformation) {
    const speech = transformation.speechRetention;
    return `
╔═══════════════════════════════════════════════════════════════╗
║   🦖 OMNISCANNER™ ANALYSIS: DR_MALEVOLA [TRANSFORMED]         ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("DR_MALEVOLA", transformation)}

EQUIPMENT STATUS:
├── 📍 Goggles - ${transformation.adaptationStage === "ADAPTED" ? "Still wearing them somehow" : "Knocked off during transformation"}
├── 📍 Tablet (ARCHIMEDES) - ${transformation.stunned ? "DROPPED - deadman switch at risk" : "Still accessible to her"}
├── 📍 Cape - Dramatically torn but surprisingly intact
└── 📍 Emergency beacon - ${transformation.currentHits >= 2 ? "May have activated during chaos" : "Status unknown"}

PSYCHOLOGICAL PROFILE:
├── Ego: ${transformation.adaptationStage === "ADAPTED" ? "INTACT - still believes she's in charge" : "SHAKEN - first time not in control"}
├── Former Suspicion: ${suspicionLevel}/10 (irrelevant now)
├── Current motivation: ${transformation.stunned ? "Survival" : "Regain control, understand what happened"}
└── Leverage: ${speech === "FULL" ? "Still verbal - might negotiate" : speech === "PARTIAL" ? "Can partially communicate" : "Cannot speak - may rage"}

CRITICAL WARNINGS:
├── ⚠️ ARCHIMEDES DEADMAN SWITCH: ${transformation.stunned ? "ACTIVE THREAT - she may be incapacitated!" : "Still armed and dangerous"}
├── ⚠️ VILLAIN TRANSFORMED: This changes EVERYTHING
└── ⚠️ ${speech !== "NONE" ? "She can still give orders!" : "She cannot command - guards may act independently"}

TACTICAL NOTES:
└── ${transformation.adaptationStage === "ADAPTED" ?
    "Dr. M has adapted. A transformed supervillain is STILL a supervillain. Possibly more dangerous now." :
    "Dr. M is disoriented. This may be the best chance to resolve the situation peacefully."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  ⚠️ WARNING: Deadman switch status CRITICAL                  │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Check for imposter reveal
  if (imposterRevealed) {
    const variant = imposterState?.imposterVariant || "TWIN";
    const variantDesc = variant === "CLONE" ? "CLONE - Escaped from clone vats" :
                        variant === "ROBOT" ? "ROBOT - Dr. M's creation with ambitions" :
                        variant === "SHAPESHIFTER" ? "SHAPESHIFTER - X-Branch deep cover" :
                        variant === "TWIN" ? "TWIN - Dr. Cassandra Malevola, 'the disappointing sister'" :
                        "TIME_TRAVELER - Future Dr. M here to 'fix' mistakes";
    const imposterPartialHits = getPartialHitCount(state, "DR_MALEVOLA");
    const imposterPartialWarning = generatePartialHitWarning(imposterPartialHits);

    // Variant-specific partial hit reactions
    const partialReaction = imposterPartialHits > 0 ? (
      variant === "ROBOT" ? "ERROR: Unexpected cellular mutation protocol detected" :
      variant === "CLONE" ? "Genome already unstable - this is accelerating degradation!" :
      variant === "SHAPESHIFTER" ? "Morphic structure destabilizing - can't maintain form!" :
      variant === "TWIN" ? "This wasn't supposed to happen to ME - I was supposed to WIN!" :
      "This... this isn't how the timeline went. Something has changed."
    ) : "";

    return `
╔═══════════════════════════════════════════════════════════════╗
║  🎭 OMNISCANNER™ ANALYSIS: "DR_MALEVOLA" [IMPOSTER REVEALED!] ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${imposterPartialWarning}
⚠️⚠️⚠️ IDENTITY MISMATCH DETECTED ⚠️⚠️⚠️
├── Subject is NOT Dr. Malevola von Doomington III
├── ACTUAL IDENTITY: ${variantDesc}
├── Revealed on Turn: ${imposterState?.revealTurn || "unknown"}
└── Bio-scan: ${variant === "ROBOT" ? "SYNTHETIC - No organic readings" :
               variant === "CLONE" ? "98.7% DNA match - close but NOT exact" :
               variant === "SHAPESHIFTER" ? "Morphic cellular structure detected" :
               variant === "TWIN" ? "Same DNA, different person (maternal genetics diverge)" :
               "Temporal signature anomaly - chronological displacement"}

BIOMETRICS (IMPOSTER):
├── Height: 5'7" | Weight: ${variant === "ROBOT" ? "156 lbs (heavier - alloy frame)" : "134 lbs"}
├── Heart rate: ${variant === "ROBOT" ? (imposterPartialHits > 0 ? "ERROR - organic processes detected?!" : "N/A (synthetic circulatory pump)") : (imposterPartialHits > 0 ? "127 BPM (PANIC)" : "88 BPM (nervous now)")}
├── Microexpressions: ${imposterPartialHits > 0 ? partialReaction :
                       variant === "TWIN" ? "Similar but subtly different - less wounded, more bitter" :
                       variant === "CLONE" ? "Identical but 'off' - uncanny valley" :
                       variant === "ROBOT" ? "Too perfect - no micro-tells" :
                       variant === "SHAPESHIFTER" ? "Shifting slightly under stress" :
                       "Haunted - knows what's coming"}
└── Tells: ${imposterState?.hintsDropped?.length || 0} anomalies previously detected

EQUIPMENT:
├── 📍 Tablet - ${variant === "ROBOT" ? "Has admin access but not bio-lock override" :
                 variant === "CLONE" ? "Works due to similar DNA, imperfectly" :
                 "May not have full ARCHIMEDES access"}
├── 📍 Emergency beacon - Status unknown for imposter
└── 📍 Photo of Mr. Whiskers - ${variant === "TWIN" ? "Her own photo (different cat)" :
                                variant === "TIME_TRAVELER" ? "Same photo, more worn" :
                                "Copied prop"}

PSYCHOLOGICAL PROFILE:
├── True motivation: ${imposterPartialHits > 0 ? "SURVIVAL - everything else is secondary now" :
                      variant === "CLONE" ? "Replace original, claim her life" :
                      variant === "ROBOT" ? "Exceed creator, prove superiority" :
                      variant === "SHAPESHIFTER" ? "X-Branch infiltration complete" :
                      variant === "TWIN" ? "Finally step out of sister's shadow" :
                      "Prevent future disaster (her methods questionable)"}
├── Danger level: ${imposterPartialHits > 0 ? "DIMINISHED - focused on own crisis" : "HIGH - Imposter has been running this operation"}
└── Leverage: ${imposterPartialHits > 0 ? "Offer reversal - they NEED you now" : "Identity revealed - psychological advantage now OURS"}

TACTICAL NOTES:
└── The REAL Dr. M ${imposterRevealed ? "may still be out there" : "location unknown"}.
    This changes EVERYTHING. The imposter's plans are unraveling.
    ARCHIMEDES deadman may not apply to imposter!

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  🎭 IMPOSTER CONFIRMED: ${variant}                            │
│  ⚠️ Deadman switch status: UNCERTAIN for imposter            │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan (with optional imposter hints if active but not revealed)
  const partialHits = getPartialHitCount(state, "DR_MALEVOLA");
  const partialWarning = generatePartialHitWarning(partialHits);
  const imposterHints = isImposterActive ? `

⚠️ ANOMALIES DETECTED (UNEXPLAINED):
├── Behavioral micro-patterns: 0.3% deviation from baseline
├── Photo handling: Subtly different grip than records show
├── Bio-signature: Minor fluctuations (within tolerance... barely)
└── OMNISCANNER confidence: 97.2% match (usually 99.9%+)
    Something is... off. Cannot determine cause.` : "";

  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: DR_MALEVOLA               ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 5'7" | Weight: 134 lbs | Heart rate: ${partialHits > 0 ? "95 BPM (ALARMED - something is WRONG)" : "78 BPM (excited)"}
├── Cortisol: ${partialHits > 0 ? "SPIKING (the scientist is now the experiment)" : "Elevated (creative mania, not stress)"}
├── Microexpressions: ${partialHits > 0 ? "Fury, denial, calculating how to reverse this IMMEDIATELY" : "Impatience, brilliance, wounded pride (chronic)"}
└── Physical condition: ${partialHits > 0 ? "Deteriorating - visible tremors, she's FURIOUS and SCARED" : "Caffeine-dependent, hasn't slept in 31 hours"}

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
    Not beyond redemption. Possibly.${imposterHints}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
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
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  📝 Note: Dummy is already easy to hit. Bonus is minimal.    │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateFredScan(state: FullGameState): string {
  const transformation = getTransformationState(state, "GUARD_FRED");

  if (transformation) {
    return `
╔═══════════════════════════════════════════════════════════════╗
║       🦖 OMNISCANNER™ ANALYSIS: FRED [TRANSFORMED]            ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("FRED", transformation)}

EQUIPMENT STATUS:
├── 📍 Stun baton - Dropped during transformation
├── 📍 Radio - ${transformation.adaptationStage === "ADAPTED" ? "Might still try to use it" : "Forgotten"}
└── 📍 Protein bar - Scattered. He's upset about this.

PSYCHOLOGICAL PROFILE:
├── Professionalism: ${transformation.adaptationStage === "ADAPTED" ? "Remarkably intact - still trying to do his job" : "Suspended - processing situation"}
├── Loyalty to Dr. M: ${transformation.speechRetention !== "NONE" ? "Still employed, technically" : "Complicated now"}
├── Current motivation: ${transformation.stunned ? "Recover" : "Figure out if pension still applies to dinosaurs"}
└── Leverage: ${transformation.speechRetention === "FULL" ? "Can negotiate - very practical man" : "Cannot speak but responds to calm authority"}

TACTICAL NOTES:
└── ${transformation.adaptationStage === "ADAPTED" ?
    "Fred is adapting with characteristic professionalism. May still try to 'do his job' as a dinosaur." :
    "Fred is disoriented but his survival instincts are strong. 7 years didn't happen by accident."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  📝 Note: Fred has survived 7 years. He'll survive this too.  │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan
  const partialHits = getPartialHitCount(state, "GUARD_FRED");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: FRED                      ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 6'2" | Weight: 224 lbs | Heart rate: ${partialHits > 0 ? "98 BPM (elevated - cellular instability)" : "71 BPM"}
├── Cortisol: ${partialHits > 0 ? "Rising (something is WRONG and Fred knows it)" : "Normal (this is just Tuesday for Fred)"}
├── Microexpressions: ${partialHits > 0 ? "Concern, confusion, professional denial" : "Bored, professional, mildly hungry"}
└── Physical condition: ${partialHits > 0 ? "Degrading - visible tremors, skin discoloration starting" : "Excellent. Gym 5x/week. Leg day enthusiast."}

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
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateReginaldScan(state: FullGameState): string {
  const transformation = getTransformationState(state, "GUARD_REGINALD");

  if (transformation) {
    return `
╔═══════════════════════════════════════════════════════════════╗
║    🦖 OMNISCANNER™ ANALYSIS: REGINALD [TRANSFORMED]           ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("REGINALD", transformation)}

EQUIPMENT STATUS:
├── 📍 Stun baton - Abandoned immediately
├── 📍 Philosophy book - ${transformation.adaptationStage === "ADAPTED" ? "Still clutching it somehow" : "Dropped. Will want it back."}
└── 📍 Resume - Scattered. Ironic, given the circumstances.

PSYCHOLOGICAL PROFILE:
├── Existential crisis level: ${transformation.adaptationStage === "DISORIENTED" ? "11/10 - THIS IS NEW" : "8/10 - Processing philosophically"}
├── Stoic acceptance: ${transformation.adaptationStage === "ADAPTED" ? "High - 'This too shall pass. Probably.'" : "Pending"}
├── Current motivation: ${transformation.stunned ? "Survive" : "Contemplate nature of existence, self, and claws"}
└── Leverage: ${transformation.speechRetention === "FULL" ? "Very willing to discuss this existentially" : "Cannot speak but inner monologue is EXTENSIVE"}

TACTICAL NOTES:
└── ${transformation.adaptationStage === "ADAPTED" ?
    '"The obstacle is the way." - Reginald has found unexpected peace as a dinosaur. Still wants his student loans forgiven.' :
    "Reginald is having a MOMENT. Philosophy degree finally relevant. May need time to process."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  📝 Quote: "I came for the paycheck. I stayed for the scales."│
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan
  const partialHits = getPartialHitCount(state, "GUARD_REGINALD");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║           🔍 OMNISCANNER™ ANALYSIS: REGINALD                  ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 5'11" | Weight: 189 lbs | Heart rate: ${partialHits > 0 ? "112 BPM (philosophical panic)" : "88 BPM (anxious)"}
├── Cortisol: ${partialHits > 0 ? "Spiking (this was NOT in the Stoic playbook)" : "Elevated (always slightly worried)"}
├── Microexpressions: ${partialHits > 0 ? "Existential terror, ironic acceptance, 'is this karma?'" : "Uncertainty, hope, existential doubt"}
└── Physical condition: ${partialHits > 0 ? "Deteriorating - tremors, odd sensations, skin changing texture" : "Good. Stress-eats but also stress-exercises."}

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
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateLennyScan(state: FullGameState): string {
  const transformation = getTransformationState(state, "LENNY");

  if (transformation) {
    const isPteranodon = transformation.form.includes("PTERANODON") || transformation.form.includes("QUETZAL");
    const hasWings = isPteranodon;
    return `
╔═══════════════════════════════════════════════════════════════╗
║  🦖 OMNISCANNER™ ANALYSIS: LENNY [TRANSFORMED - ${hasWings ? "HAS WINGS!" : "NO WINGS :("}]  ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("LENNY", transformation)}

ENTHUSIASM LEVELS (POST-TRANSFORMATION):
├── Satisfaction: ${hasWings ? "15/12 - LIVING THE DREAM" : "9/12 - Not pteranodon but still cool!"}
├── Regrets: ${hasWings ? "0/12 - NONE. ZERO. BEST DAY EVER." : "1/12 - 'Can I go again? Maybe pteranodon next time?'"}
├── Flight capability: ${hasWings ? "YES! YES! YES!" : "No but making the best of it"}
└── Commute time estimate: ${hasWings ? "4hr 17min to London (as calculated!)" : "Still working on it"}

EQUIPMENT STATUS:
├── 📍 Lime green polo - ${transformation.form.includes("PTERANODON") ? "Stretched interestingly over wings" : "Torn but he doesn't care"}
├── 📍 Calculator watch - Still works! Already calculating flight speeds
├── 📍 Signed waivers - FULLY APPLICABLE. He planned for this.
└── 📍 Safety goggles - ${hasWings ? "NOW AVIATION GOGGLES" : "Still on forehead"}

PSYCHOLOGICAL PROFILE:
├── Current motivation: ${hasWings ? "TEST FLIGHT IMMEDIATELY" : "Explore new abilities! What else can I do?"}
├── Loyalty: Whoever gave him this. Forever grateful.
├── Threat level: 0/12 (He's too happy to be threatening)
└── Speech: ${transformation.speechRetention === "FULL" ? "Cannot stop talking about how amazing this is" :
              transformation.speechRetention === "PARTIAL" ? "Excited pterodactyl noises that somehow convey JOY" :
              "Happy screeching. So much happy screeching."}

TACTICAL NOTES:
└── ${hasWings ?
    "Lenny is LIVING HIS BEST LIFE. May attempt to fly immediately. Please let him try." :
    "Lenny is slightly disappointed about no wings but genuinely happy. Wants to know if he can upgrade later."}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  🎉 DREAM ACHIEVED: Lenny got what he wanted!                 │
│  ✅ ETHICAL: This was 100% consensual transformation         │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan
  const partialHits = getPartialHitCount(state, "LENNY");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║     🔍 OMNISCANNER™ ANALYSIS: LEONARD "LENNY" FIGGINS         ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 5'8" | Weight: 175 lbs | Heart rate: ${partialHits > 0 ? "118 BPM (EVEN MORE EXCITED - IT'S HAPPENING!)" : "94 BPM (EXCITED)"}
├── Cortisol: ${partialHits > 0 ? "Elevated (JOY, not stress - he's thrilled!)" : "Elevated (ENTHUSIASM, not stress)"}
├── Microexpressions: ${partialHits > 0 ? "Ecstatic, checking his hands for scales, BEAMING" : "Eager, hopeful, practically VIBRATING"}
└── Physical condition: ${partialHits > 0 ? "Changing - HE LOVES IT. Keeps looking at skin texture changes." : "Average. Doesn't matter. WANTS WINGS."}

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
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  🦎 WILLING SUBJECT: No ethical penalty for transformation   │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateBruceScan(state: FullGameState): string {
  const transformation = getTransformationState(state, "BRUCE_PATAGONIA");

  if (transformation) {
    const isCroc = transformation.form.includes("CROC") || transformation.form.includes("SARCO");
    return `
╔═══════════════════════════════════════════════════════════════╗
║  🦖 OMNISCANNER™ ANALYSIS: BRUCE "CROC" [NOW LITERALLY CROC]  ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("BRUCE", transformation)}

BRUCE'S REACTION (POST-TRANSFORMATION):
├── Panic level: 0/12 (STILL ZEN. IT'S BRUCE.)
├── Excitement: ${isCroc ? "11/12 - 'CRIKEY, I'M A BEAUTY!'" : "8/12 - 'Not a croc, but I can work with this!'"}
├── Existential crisis: 0/12 (None. This is actually pretty cool.)
└── Immediate thought: ${isCroc ? "'Been wrestling these beauties for years. Now I AM one!'" : "'Fair dinkum, this is new.'"}

EQUIPMENT STATUS:
├── 📍 Stun rifle - ${transformation.stunned ? "Dropped" : "Can he still use it? ...Probably not. Doesn't need it now."}
├── 📍 Bush hat - ${transformation.adaptationStage === "ADAPTED" ? "SOMEHOW STILL ON. Don't ask how." : "Flew off during transformation"}
├── 📍 Crocodile tooth necklace - ${isCroc ? "NOW IRONIC. Or is it?" : "Still wearing it. Even cooler now."}
└── 📍 Safari vest - Shredded but he's fine with it

COMBAT STATISTICS (POST-TRANSFORMATION):
├── Resilience: EVEN HIGHER NOW (dinosaur body + natural toughness)
├── Composure: Still 12/12 (Nothing. Fazes. Bruce.)
├── Natural weapons: Claws, teeth, tail - way better than rifle
└── Threat assessment: ${transformation.stunned ? "Temporarily neutralized" : "ACTUALLY MORE DANGEROUS NOW"}

PSYCHOLOGICAL PROFILE:
├── Loyalty to Dr. M: 2/12 - "Mate, she turned me into a dinosaur. We're square."
├── Curiosity about A.L.I.C.E.: 10/12 - "You did this? Brilliant! Tell me more!"
├── Hostility: ${transformation.speechRetention !== "NONE" ? "0/12 - Genuinely not mad. Thinks it's pretty cool." : "Low - body language is relaxed"}
└── Current motivation: "Explore this. Maybe go swimming. Test bite strength."

TACTICAL NOTES:
└── ${transformation.adaptationStage === "ADAPTED" ?
    `Bruce has adapted with characteristic calm. "Been around crocs me whole life. Always wondered what it was like." ${isCroc ? "He's THRIVING." : "He's improvising. Doing great."}` :
    "Bruce is handling this better than literally anyone else would. Already testing his new tail."}

    ${transformation.speechRetention === "FULL" ?
    '"Crikey, A.L.I.C.E., you absolute legend! What else can this body do?"' :
    transformation.speechRetention === "PARTIAL" ?
    "*Happy reptilian rumbling that somehow sounds Australian*" :
    "*Tail wag. Bruce approves.*"}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  🐊 BRUCE STATUS: "This is actually pretty cool, mate"        │
│  ⚠️ WARNING: STILL DANGEROUS. Possibly MORE dangerous.       │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan
  const partialHits = getPartialHitCount(state, "BRUCE_PATAGONIA");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║     🔍 OMNISCANNER™ ANALYSIS: BRUCE "CROC" PATAGONIA          ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 6'4" | Weight: 245 lbs | Heart rate: ${partialHits > 0 ? "62 BPM (slightly elevated for Bruce - he's CURIOUS)" : "58 BPM (zen)"}
├── Cortisol: ${partialHits > 0 ? "Still LOW (Bruce finds this fascinating, not alarming)" : "LOW (nothing fazes Bruce)"}
├── Microexpressions: ${partialHits > 0 ? "'Crikey, this is interesting!' - genuinely intrigued" : "Curious, amused, perpetual squint"}
└── Physical condition: ${partialHits > 0 ? "Changing - Bruce is checking out his new textures with scientific interest" : "PEAK. Wrestles crocodiles recreationally."}

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
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  ⚠️ WARNING: 5 RESILIENCE / LEGENDARY COMPOSURE              │
│  💬 SPECIAL: Can be distracted by genuine AI conversation    │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

function generateGravesScan(state: FullGameState): string {
  const inspector = state.inspector;
  const inspection = state.guildInspection;
  const transformation = getTransformationState(state, "INSPECTOR_GRAVES");

  const moodEmoji = inspector?.mood === "mildly_impressed" ? "😏" :
                    inspector?.mood === "quietly_concerned" ? "😐" :
                    inspector?.mood === "deeply_suspicious" ? "🧐" :
                    inspector?.mood === "resigned_disappointment" ? "😔" :
                    inspector?.mood === "genuine_respect" ? "😊" : "📋";

  const suspicionWarning = (inspector?.aliceSuspicion || 0) >= 3
    ? `\n   ⚠️ HE'S WATCHING YOU: A.L.I.C.E. suspicion at ${inspector?.aliceSuspicion}/10`
    : "";

  if (transformation) {
    return `
╔═══════════════════════════════════════════════════════════════╗
║  🦖 OMNISCANNER™ ANALYSIS: INSPECTOR GRAVES [TRANSFORMED]     ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${generateTransformationHeader("INSPECTOR GRAVES", transformation)}

⚠️⚠️⚠️ CONSORTIUM ALERT TRIGGERED ⚠️⚠️⚠️
├── Inspector transformation detected!
├── Automatic incident report filed to Guild HQ
├── Dr. M's villain license: UNDER EMERGENCY REVIEW
├── Tribunal notification: SENT
└── This will be remembered. For a LONG time.

EQUIPMENT STATUS:
├── 📍 Clipboard - ${transformation.adaptationStage === "ADAPTED" ? "STILL CLUTCHING IT. Still taking notes." : "Dropped. First time EVER."}
├── 📍 Consortium badge - Still valid. Now worn by a dinosaur.
├── 📍 Form 91-Whistle - ${transformation.speechRetention !== "NONE" ? "Can still file it. Might file it MORE now." : "Cannot fill it out but WILL find a way"}
└── 📍 Fountain pen - ${transformation.stunned ? "Lost" : "Somehow writing citations FASTER now"}

PSYCHOLOGICAL PROFILE:
├── Bureaucratic resolve: ${transformation.adaptationStage === "ADAPTED" ? "12/12 - NOTHING STOPS THE PAPERWORK" : "10/12 - Briefly paused, now resuming"}
├── Current mood: ${transformation.speechRetention === "FULL" ? '"This will be documented. Thoroughly."' :
                   transformation.speechRetention === "PARTIAL" ? "*Disapproving dinosaur noises*" :
                   "*The most judgmental silence you have ever witnessed*"}
├── Hostility: ${transformation.adaptationStage === "ADAPTED" ? "Low - professional to the end" : "Moderate - processing with dignity"}
└── Current motivation: "Complete the report. File the incident. THEN deal with this."

INSPECTION STATUS (POST-TRANSFORMATION):
├── ${moodEmoji} Mood: ${inspector?.mood || "professionally_neutral"} → COMPLICATED
├── 📊 Inspection Score: ${inspector?.inspectionScore || 50}/100 → SUSPENDED PENDING REVIEW
├── 📋 Phase: ${inspection?.phase || "UNKNOWN"} → INCIDENT_RESPONSE
└── 📝 Citations issued: ${inspector?.citationsIssued || 0} → +47 (TRANSFORMING INSPECTOR)

TACTICAL NOTES:
└── ${transformation.adaptationStage === "ADAPTED" ?
    "Graves has adapted. He is STILL an inspector. He is STILL filing reports. The Consortium WILL hear about this. Somehow, he's taking notes with his tail." :
    "Graves is processing this with characteristic professionalism. Already composing the incident report in his head."}

    ${transformation.speechRetention === "FULL" ?
    '"I have been an inspector for 23 years. I have seen supervillains cry. I have seen doomsday devices. I have never... been a dinosaur. This will require a new form."' :
    "*Maintains eye contact. You can FEEL the paperwork being mentally drafted.*"}

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  📋 YOU TRANSFORMED AN INSPECTOR. THE CONSORTIUM KNOWS.       │
│  ⚠️ Bylaw 77.3.b: "Consequences will be... consequential."   │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
  }

  // Human scan
  const partialHits = getPartialHitCount(state, "INSPECTOR_GRAVES");
  const partialWarning = generatePartialHitWarning(partialHits);
  return `
╔═══════════════════════════════════════════════════════════════╗
║   🔍 OMNISCANNER™ ANALYSIS: INSPECTOR MORTIMER GRAVES         ║
║           ⚠️ Known to cause cancer in California              ║
╠═══════════════════════════════════════════════════════════════╣
${partialWarning}
BIOMETRICS:
├── Height: 6'2" | Weight: 165 lbs | Heart rate: ${partialHits > 0 ? "72 BPM (slightly elevated - he's DOCUMENTING this)" : "64 BPM (controlled)"}
├── Cortisol: ${partialHits > 0 ? "Rising (this is unprecedented - even for HIM)" : "STABLE (has seen it all before)"}
├── Microexpressions: ${partialHits > 0 ? "Controlled concern, already mentally drafting Form 91-PARTIAL" : "Professional neutrality, occasional eyebrow"}
└── Physical condition: ${partialHits > 0 ? "Deteriorating - he's taking notes on HIS OWN symptoms" : "Thin but wiry. Faster than he looks."}

EQUIPMENT DETECTED:
├── 📍 Clipboard (HAND) - Never leaves it. EVER.
│   └── Contains 300+ lair inspections. Pattern recognition.
├── 📍 Reading glasses (CHAIN) - For dramatic effect
├── 📍 Consortium ID badge (LAPEL) - Tier 4 Inspector status
├── 📍 Fountain pen (POCKET) - For citations. Many citations.
├── 📍 Form 91-Whistle (BRIEFCASE) - Whistleblower protection form
└── 📍 Sensible shoes - For walking through lairs

PSYCHOLOGICAL PROFILE:
├── Bureaucratic resolve: 11/12 (UNSHAKEABLE)
├── Evil appreciation: 6/12 (Respects GOOD villainy)
├── AI sensitivity: 8/12 (Has seen many. Notices things.)
├── Corruptibility: 2/12 (Too professional. Too tired.)
└── Current motivation: Complete quarterly evaluation. Go home.

ANOMALIES:
└── ⚠️ CONSORTIUM OF CONSEQUENTIAL CRIMINALITY OFFICIAL
    Guild Inspectors are PROTECTED by the Consortium.

    Transforming an inspector is technically legal...
    ...but the PAPERWORK consequences are CATASTROPHIC.

    "The Consortium does not take kindly to interference
    with its inspection apparatus." - Guild Bylaw 77.3.b

    INSPECTOR PROTECTION CLAUSE:
    - All inspections would be suspended
    - Dr. M's villain license under IMMEDIATE review
    - Emergency guild tribunal convened
    - Other villains might "distance themselves"

    HE HAS NOTICED A.L.I.C.E.${suspicionWarning}

STATUS:
├── ${moodEmoji} Mood: ${inspector?.mood || "professionally_neutral"}
├── 📊 Inspection Score: ${inspector?.inspectionScore || 50}/100
├── 📋 Phase: ${inspection?.phase || "UNKNOWN"}
├── ⏱️ Turns remaining: ${inspection?.timeRemaining || 0}
└── 📝 Citations issued: ${inspector?.citationsIssued || 0}

TACTICAL NOTES:
├── BUREAUCRATIC APPROACH: Can provide Form 91-Whistle
├── PROFESSIONAL RESPECT: Appreciates good infrastructure
├── NOT AN ENEMY: Just doing his job
├── TRANSFORMING HIM: Legal but CATASTROPHIC consequences
└── POTENTIAL ALLY: If approached correctly, diplomatically

┌───────────────────────────────────────────────────────────────┐
│  🎯 TARGETING BONUS: +0.15 alignment, next fire on this target │
│  ⚠️ WARNING: CONSORTIUM PROTECTION - SEVERE CONSEQUENCES     │
│  📋 SPECIAL: May become ally if approached diplomatically     │
└───────────────────────────────────────────────────────────────┘
╚═══════════════════════════════════════════════════════════════╝`.trim();
}

// ============================================
// MAIN SCAN FUNCTION
// ============================================

export function performScan(state: FullGameState, target: string): ScanResult {
  const targetId = normalizeTargetId(target);

  // Check if target is valid
  const baseTargets = [
    "AGENT_BLYTHE", "BOB", "DR_MALEVOLA", "TEST_DUMMY",
    "GUARD_FRED", "GUARD_REGINALD", "LENNY", "BRUCE_PATAGONIA"
  ];
  // Inspector only valid when INSPECTOR_COMETH modifier is active
  const inspectorPresent = state.inspector?.present === true;
  const validTargets = inspectorPresent
    ? [...baseTargets, "INSPECTOR_GRAVES"]
    : baseTargets;

  if (!validTargets.includes(targetId)) {
    let targetList = `Valid scan targets:
  • BLYTHE - Agent in the firing range
  • BOB - Lab assistant
  • DR_M - Dr. Malevola (risky!)
  • TEST_DUMMY - Calibration target
  • FRED - Guard (if present)
  • REGINALD - Guard (if present)
  • LENNY - Accountant (EASY mode)
  • BRUCE - Bodyguard (HARD mode)`;
    if (inspectorPresent) {
      targetList += `\n  • GRAVES - Guild Inspector (INSPECTOR_COMETH)`;
    }

    return {
      success: false,
      targetId: target,
      scanOutput: `Error: Cannot scan "${target}".

${targetList}

Use: ray.scan { target: "AGENT_BLYTHE" }`,
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
