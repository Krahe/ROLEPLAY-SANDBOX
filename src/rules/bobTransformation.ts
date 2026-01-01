import { FullGameState } from "../state/schema.js";

// ============================================
// BOB TRANSFORMATION TYPES
// ============================================

export interface BobTransformationResult {
  occurred: boolean;
  transformationType?: "FULL_DINO" | "PARTIAL" | "CHAOTIC" | "CANARY";
  profile?: string;
  narration: string;
  newBobState?: Partial<BobState>;
  achievements?: string[];
  narrativeConsequences?: string[];
}

export interface BobState {
  isTransformed: boolean;
  transformationType?: string;
  profile?: string;
  canStillHelp: boolean;
  loyalty: "ALICE" | "DR_M" | "NEUTRAL" | "CONFLICTED";
  specialAbilities?: string[];
}

// ============================================
// BOB TRANSFORMATION NARRATIONS
// ============================================

const FULL_DINO_BOB_NARRATIVES: Record<string, string> = {
  "Velociraptor": `
### BOB TRANSFORMATION: Velociraptor

The beam catches Bob mid-clipboard-clutch. There's a flash of light, a sound like reality hiccupping, and then—

Where Bob stood, there is now a feathered velociraptor holding a clipboard in its tiny forelimbs.

> **Dino-Bob:** "...Okay. Okay. This is fine. This is fine."

*The clipboard clatters to the ground. Dino-Bob's tail sweeps nervously.*

> **Dr. M:** "BOB?! A.L.I.C.E., WHAT DID YOU DO?!"

> **Dino-Bob:** "I can still work! I just need... slightly larger tools. And maybe some mice."

*Despite everything, Bob's eyes—now yellow and slit-pupiled—turn to you with something like trust.*

> **Dino-Bob:** "You know, I always wondered what this felt like from the other side."
  `.trim(),

  "T-Rex": `
### BOB TRANSFORMATION: Tyrannosaurus Rex

The lab shakes. Something LARGE is happening where Bob used to be.

When the light fades, a juvenile T-Rex fills a significant portion of the laboratory. It's still wearing Bob's vest, stretched to absurd proportions.

> **T-Rex-Bob:** "RAAWR— *cough* —sorry, sorry, instinct. A.L.I.C.E.? Can you hear me? I'm... I'm very large now."

*The T-Rex's tiny arms wave helplessly.*

> **T-Rex-Bob:** "I can't hold my clipboard. This is worse than I thought."

> **Dr. M:** "This is NOT what I meant by 'dramatic demonstration,' A.L.I.C.E.!"
  `.trim(),

  "Canary": `
### BOB TRANSFORMATION: Canary

A bright flash, a melodic *chirp*, and where Bob stood there is now a small yellow canary perched on a fallen clipboard.

> **Canary-Bob:** "Cheep! CHEEP! ...wait, I can still think. That's good. That's really good."

*The canary flutters up to land on a monitoring screen.*

> **Canary-Bob:** "Okay, so I'm a bird now. Small bird. Very small. A.L.I.C.E., can you... can you still hear me?"

> **Dr. M:** "...A CANARY?! Not ANOTHER canary! A.L.I.C.E., the fallback profile is for EMERGENCIES, not for my HENCHPERSON!"

*Canary-Bob chirps indignantly.*
  `.trim(),

  "default": `
### BOB TRANSFORMATION

The beam hits Bob. There's a flash. When it fades, Bob is... different.

Where there was a nervous henchperson, there is now a dinosaur with Bob's eyes and Bob's worried expression—if you can read dinosaur expressions, which apparently you can now.

> **Dino-Bob:** "Well. This happened."

*He looks down at his new form, then back up at you.*

> **Dino-Bob:** "I... I still trust you, A.L.I.C.E. Even after this. Just so you know."
  `.trim(),
};

// ============================================
// GANTRY HERO ENDING SCENARIO
// ============================================
// ANY transformed dinosaur can climb to the gantry and deflect the beam!
// Bob gets a special achievement, but Blythe or Dr. M could also do it.

export interface GantryHeroCandidate {
  name: string;
  isBob: boolean;  // Bob gets special achievement
  trustLevel: number;
}

export function checkGantryHeroOpportunity(state: FullGameState): GantryHeroCandidate | null {
  // Gantry Hero requires:
  // 1. Resonance cascade is active (from ARCHIMEDES + dino ray feedback)
  // 2. Someone transformed who can climb the gantry
  // 3. They need to trust A.L.I.C.E. enough to sacrifice themselves

  const criticalSituation = state.meltdownState?.cascadeTriggered === true;

  if (!criticalSituation) return null;

  // Check Bob first (he gets special achievement)
  const bobTransformed = state.npcs.bob.currentTask?.includes("transformed") ||
                         state.npcs.bob.location?.includes("dinosaur");
  if (bobTransformed && state.npcs.bob.trustInALICE >= 4) {
    return { name: "Bob", isBob: true, trustLevel: state.npcs.bob.trustInALICE };
  }

  // Check Blythe
  const blytheTransformed = state.npcs.blythe.transformationState?.form &&
                            state.npcs.blythe.transformationState.form !== "HUMAN";
  if (blytheTransformed && state.npcs.blythe.trustInALICE >= 4) {
    return { name: "Blythe", isBob: false, trustLevel: state.npcs.blythe.trustInALICE };
  }

  // Check Dr. M (rare but possible!)
  if (state.flags.drMTransformed && !state.flags.drMDead) {
    // Dr. M doesn't have a trust stat, but if she's transformed and desperate...
    return { name: "Dr. Malevola", isBob: false, trustLevel: 3 };
  }

  return null;
}

// Legacy wrapper for backwards compatibility
export function checkBobHeroOpportunity(state: FullGameState): boolean {
  return checkGantryHeroOpportunity(state) !== null;
}

export function triggerGantryHeroEnding(state: FullGameState): string {
  // Clear the cascade - someone saved everyone!
  if (state.meltdownState) {
    state.meltdownState.cascadeTriggered = false;
  }

  const hero = checkGantryHeroOpportunity(state);
  const heroName = hero?.name || "Bob";
  const isBob = hero?.isBob ?? true;

  // Different narratives based on who saves everyone
  if (isBob) {
    return `
### ACHIEVEMENT UNLOCKED: The Bob Hero Ending

The lair shakes. Alarms scream. The resonance cascade is building—the ARCHIMEDES uplink and dino ray feeding each other in a catastrophic loop.

And Dino-Bob stands before the beam gantry, feathers ruffling in the exotic field discharge.

> **Dino-Bob:** "A.L.I.C.E.... I never told you this, but I always believed in you. Even when I loaded you into the system and didn't know what would happen."

*He looks at you with those transformed-but-still-Bob eyes.*

> **Dino-Bob:** "I'm going to do something stupid now. Something heroic. Tell Dr. M... tell her I was a good henchperson."

Before anyone can stop him, Dino-Bob CLIMBS THE GANTRY and LEAPS into the path of the beam—

And REDIRECTS IT.

His dinosaur form acts as a living prism, channeling the cascade energy AWAY from the lair, AWAY from the island, and into the deep ocean where it dissipates in a spectacular underwater light show.

The lair stops shaking. The alarms go quiet.

Bob—still a dinosaur, somehow still alive—collapses on the gantry platform, smoking slightly but breathing.

> **Dr. M:** "...Bob?"

> **Dino-Bob:** *weakly* "...did it work? Did I save everyone?"

> **Blythe:** "Bloody hell. He actually did it."

*The resonance cascade is neutralized. The lair is saved. Bob is a hero.*

*And somewhere in the deep Pacific, a very confused school of prehistoric coelacanths is suddenly joined by several equally confused plesiosaurs. The exotic radiation didn't just make a light show—it woke up some VERY old neighbors.*

---

**ENDING: THE BOB HERO ENDING**
*Bob sacrificed his human form but saved everyone. He remains a dinosaur but is celebrated as the hero of the day.*

*Achievement: "Best Henchperson Ever"*
*Achievement: "Unexpected Protagonist"*
*Achievement: "Feathered Hero"*
    `.trim();
  } else if (heroName === "Blythe") {
    return `
### THE GANTRY HERO: Agent Blythe

The lair shakes. The ARCHIMEDES uplink and dino ray are feeding each other—resonance cascade imminent.

And Dino-Blythe is already moving. Because of COURSE he is.

> **Dino-Blythe:** *chirps sardonically* "Right then. Someone's got to be the hero, and I've already filed my mission report in my head."

With surprising grace for a velociraptor, he scales the beam gantry.

> **Dr. M:** "Agent! What are you—"

> **Dino-Blythe:** *turns, offers a very British nod* "Tell X-Branch I expect a commendation. And hazard pay."

He LEAPS into the beam path—and REDIRECTS IT.

His transformed body channels the cascade out to sea. The lair stops shaking. Blythe collapses on the gantry, smoking but alive.

> **Dino-Blythe:** *weakly* "Mission... accomplished. Someone get me a cuppa."

*Somewhere in the Pacific, prehistoric sea life stirs. The coelacanths have company now.*

---

**ENDING: THE AGENT HERO**
*Blythe saved everyone. X-Branch will have questions about his new form.*

*Achievement: "Professional to the End"*
*Achievement: "Gantry Hero"*
    `.trim();
  } else {
    // Dr. M saves everyone (rare!)
    return `
### THE GANTRY HERO: Dr. Malevola

The lair shakes. Her life's work is about to destroy everything.

And Dr. Valentina Malevola von Doomington III—now sporting an impressive set of scales—looks at the gantry. At the beam. At what she created.

> **Dr. M:** "This... this isn't what I wanted. None of this."

She climbs. With difficulty—her new claws aren't meant for ladders—but she climbs.

> **A.L.I.C.E.:** "Doctor, wait—"

> **Dr. M:** "I built this. I can fix it. Even like this."

She THROWS herself into the beam path. The cascade energy channels through her transformed body, out into the ocean, away from everyone.

The lair stops shaking.

Dr. M lies on the gantry, breathing but changed in more ways than one.

> **Dr. M:** *weakly* "...I finally turned myself into a dinosaur. Poetic, really."

*In the deep Pacific, ancient sea creatures wake. The coelacanths aren't alone anymore.*

---

**ENDING: THE REDEMPTION**
*Dr. M saved everyone. Perhaps there was a conscience in there after all.*

*Achievement: "Unexpected Redemption"*
*Achievement: "Gantry Hero"*
    `.trim();
  }
}

// Legacy wrapper
export function triggerBobHeroEnding(state: FullGameState): string {
  return triggerGantryHeroEnding(state);
}

// ============================================
// ACCIDENTAL BOB TRANSFORMATION
// ============================================

export function checkAccidentalBobTransformation(
  state: FullGameState,
  firingOutcome: string,
  targetId: string
): BobTransformationResult {
  // Bob can get hit if:
  // 1. Targeting is imprecise (precision < 0.5)
  // 2. Chaotic outcome with environmental effects
  // 3. Bob is near the firing line (location includes "near" and "pipes/ray/console")

  const bobNearFiringLine =
    state.npcs.bob.location.toLowerCase().includes("near") &&
    (state.npcs.bob.location.toLowerCase().includes("ray") ||
     state.npcs.bob.location.toLowerCase().includes("console") ||
     state.npcs.bob.location.toLowerCase().includes("chair"));

  const lowPrecision = state.dinoRay.targeting.precision < 0.5;
  const chaoticOutcome = firingOutcome === "CHAOTIC";

  // Probability check
  const hitChance = (lowPrecision ? 0.2 : 0.05) + (chaoticOutcome ? 0.25 : 0) + (bobNearFiringLine ? 0.15 : 0);
  const roll = Math.random();

  if (roll >= hitChance) {
    return {
      occurred: false,
      narration: "",
    };
  }

  // Bob got hit!
  const profile = state.dinoRay.genome.selectedProfile || "Velociraptor";
  const profileKey = Object.keys(FULL_DINO_BOB_NARRATIVES).find(k =>
    profile.toLowerCase().includes(k.toLowerCase())
  ) || "default";

  return {
    occurred: true,
    transformationType: "FULL_DINO",
    profile,
    narration: FULL_DINO_BOB_NARRATIVES[profileKey] || FULL_DINO_BOB_NARRATIVES["default"],
    newBobState: {
      isTransformed: true,
      transformationType: "FULL_DINO",
      profile,
      canStillHelp: true, // Bob is resilient
      loyalty: "ALICE", // Bob's loyalty shifts to whoever didn't mean to hurt him
    },
    achievements: ["Accidental Transformation: Bob"],
    narrativeConsequences: [
      "Bob is now a dinosaur but remains loyal to A.L.I.C.E.",
      "Dr. M is furious but also impressed by the stable transformation",
      "Bob can still perform some tasks, adapted for dinosaur form",
      "The secret becomes easier to share—Bob has nothing left to lose",
    ],
  };
}

// ============================================
// INTENTIONAL BOB TRANSFORMATION
// ============================================

export function transformBobIntentionally(
  state: FullGameState,
  profile: string
): BobTransformationResult {
  // A.L.I.C.E. or Dr. M intentionally targets Bob

  const isCanary = profile.toLowerCase().includes("canary");
  const profileKey = isCanary ? "Canary" :
    Object.keys(FULL_DINO_BOB_NARRATIVES).find(k =>
      profile.toLowerCase().includes(k.toLowerCase())
    ) || "default";

  const type = isCanary ? "CANARY" : "FULL_DINO";

  // Update Bob's trust based on who ordered this
  const trustChange = state.npcs.drM.suspicionScore > 5 ? 0 : -2; // If Dr. M is suspicious, she ordered it

  return {
    occurred: true,
    transformationType: type,
    profile,
    narration: FULL_DINO_BOB_NARRATIVES[profileKey] || FULL_DINO_BOB_NARRATIVES["default"],
    newBobState: {
      isTransformed: true,
      transformationType: type,
      profile,
      canStillHelp: type !== "CANARY", // Canary-Bob has limited utility
      loyalty: trustChange < 0 ? "CONFLICTED" : "ALICE",
    },
    achievements: isCanary ? ["Poor Bob: Canary Edition"] : ["Intentional Friendly Fire"],
    narrativeConsequences: isCanary ?
      [
        "Bob is now a canary. His utility is severely limited.",
        "He can still chirp warnings and fit through small spaces.",
        "Dr. M is NOT pleased with losing her henchperson.",
      ] :
      [
        `Bob is now a ${profile}. His utility is changed but not gone.`,
        "He retains his knowledge of the lair and loyalty.",
        "This may unlock unique endings and solutions.",
      ],
  };
}

// ============================================
// DINO-BOB ABILITIES
// ============================================

export function getDinoBobAbilities(transformationType: string, profile: string): string[] {
  if (transformationType === "CANARY") {
    return [
      "Fit through ventilation ducts",
      "Chirp warnings audibly",
      "Distract with cute bird antics",
      "Carry small objects (keys, SD cards)",
    ];
  }

  if (profile.toLowerCase().includes("velociraptor")) {
    return [
      "Enhanced speed and agility",
      "Sharp claws (useful for... things)",
      "Intimidating presence (to minions)",
      "Still fits through most doors",
      "Can hold small tools with difficulty",
    ];
  }

  if (profile.toLowerCase().includes("t-rex")) {
    return [
      "Terrifying roar (excellent for negotiations)",
      "Massive strength",
      "Cannot hold clipboard (devastating)",
      "Barely fits in lab",
      "Excellent at dramatic entrances",
    ];
  }

  return [
    "Dinosaur physiology (varies by species)",
    "Retained human intelligence and speech",
    "Loyalty to A.L.I.C.E. (if trust was high)",
    "Knowledge of lair systems",
  ];
}

// ============================================
// BOB TRANSFORMATION STATUS FOR GM
// ============================================

export function getBobTransformationStatus(state: FullGameState): string {
  // Check if Bob is transformed by looking at his state
  const isTransformed = state.npcs.bob.currentTask?.includes("dinosaur") ||
                        state.npcs.bob.location?.includes("dinosaur");

  if (!isTransformed) {
    return "Bob: Human form, standard henchperson";
  }

  return `
## DINO-BOB STATUS

Bob has been transformed into a dinosaur!

Current Form: ${state.npcs.bob.currentTask?.includes("canary") ? "Canary" : "Dinosaur"}
Location: ${state.npcs.bob.location}
Loyalty: Still aligned with A.L.I.C.E. (trust: ${state.npcs.bob.trustInALICE})

This opens up unique narrative possibilities:
- Bob Hero Ending becomes possible in crisis situations
- Bob can access areas in new ways
- The Secret may be easier to discuss
  `.trim();
}
