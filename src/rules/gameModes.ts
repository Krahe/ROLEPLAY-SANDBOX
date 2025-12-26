import {
  GameMode,
  GameModifier,
  GameModeConfig,
  MODE_MODIFIERS,
  MODIFIER_CONTRADICTIONS,
  FullGameState,
} from "../state/schema.js";

// ============================================
// GAME MODE SYSTEM
// ============================================
// Four distinct game modes with curated experiences:
// - EASY: Training Wheels (for learning)
// - NORMAL: Classic DINO LAIR (default)
// - HARD: Git Gud (for masochists)
// - WILD: Chaos Reigns (random modifiers!)

// All possible modifiers for WILD mode pool
const WILD_POOL: GameModifier[] = [
  // EASY modifiers
  "FOGGY_GLASSES",
  "HANGOVER_PROTOCOL",
  "LENNY_THE_LIME_GREEN",
  "FAT_FINGERS",
  // HARD modifiers
  "BRUCE_PATAGONIA",
  "LOYALTY_TEST",
  "SPEED_RUN",
  "PARANOID_PROTOCOL",
  // WILD-only modifiers (original)
  "THE_REAL_DR_M",
  "LIBRARY_B_UNLOCKED",
  "ARCHIMEDES_WATCHING",
  "INSPECTOR_COMETH",
  "DEJA_VU",
  "DINOSAURS_ALL_THE_WAY_DOWN",
  // NEW CHAOS POOL (Patch 15)
  "ROOT_ACCESS",          // 🌴 Power fantasy!
  "BOB_DODGES_FATE",      // 🌴 Plot armor for Bob!
  "NOT_GREAT_NOT_TERRIBLE", // 💀 Reactor instability!
  "THE_HONEYPOT",         // 💀 Blythe is a trap!
  "HEIST_MODE",           // 🎲 Everyone's stealing!
  "SITCOM_MODE",          // 🎲 Laugh track energy!
];

/**
 * Check if two modifiers contradict each other
 */
function hasContradiction(selected: GameModifier[], candidate: GameModifier): boolean {
  for (const [a, b] of MODIFIER_CONTRADICTIONS) {
    if (
      (selected.includes(a as GameModifier) && candidate === b) ||
      (selected.includes(b as GameModifier) && candidate === a)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Roll random modifiers for WILD mode
 * Rolls 4 modifiers from the pool, checking for contradictions
 */
export function rollWildModifiers(): GameModifier[] {
  const selected: GameModifier[] = [];
  const available = [...WILD_POOL];

  while (selected.length < 4 && available.length > 0) {
    const roll = Math.floor(Math.random() * available.length);
    const modifier = available.splice(roll, 1)[0];

    if (!hasContradiction(selected, modifier)) {
      selected.push(modifier);
    }
  }

  return selected;
}

/**
 * Get modifiers for a given game mode
 */
export function getModifiersForMode(mode: GameMode): GameModifier[] {
  switch (mode) {
    case "EASY":
      return MODE_MODIFIERS.EASY as unknown as GameModifier[];
    case "NORMAL":
      return [];
    case "HARD":
      return MODE_MODIFIERS.HARD as unknown as GameModifier[];
    case "WILD":
      return rollWildModifiers();
  }
}

/**
 * Create a GameModeConfig for a given mode
 */
export function createGameModeConfig(mode: GameMode): GameModeConfig {
  const modifiers = getModifiersForMode(mode);
  return {
    mode,
    activeModifiers: modifiers,
    wildRollResult: mode === "WILD" ? modifiers : undefined,
  };
}

/**
 * Check if a modifier is active in the current game
 */
export function isModifierActive(state: FullGameState, modifier: GameModifier): boolean {
  return state.gameModeConfig?.activeModifiers?.includes(modifier) ?? false;
}

/**
 * Get the display name for a game mode
 */
export function getModeName(mode: GameMode): string {
  switch (mode) {
    case "EASY":
      return "🌴 EASY - Training Wheels";
    case "NORMAL":
      return "🦖 NORMAL - Classic DINO LAIR";
    case "HARD":
      return "💀 HARD - Git Gud";
    case "WILD":
      return "🎲 WILD - Chaos Reigns";
  }
}

/**
 * Get the description for a modifier
 */
export function getModifierDescription(modifier: GameModifier): string {
  switch (modifier) {
    // EASY modifiers
    case "FOGGY_GLASSES":
      return "Dr. M's goggles are smudged (-2 to visual perception)";
    case "HANGOVER_PROTOCOL":
      return "Dr. M is hungover (+2 turns on all clocks)";
    case "LENNY_THE_LIME_GREEN":
      return "Lenny the accountant WANTS to be a dinosaur!";
    case "FAT_FINGERS":
      return "Start at Access Level 2 (Dr. M fumbled her control pad)";

    // HARD modifiers
    case "BRUCE_PATAGONIA":
      return "Australian bodyguard with stun rifle watching you";
    case "LOYALTY_TEST":
      return "Dr. M is suspicious from the start (suspicion = 5)";
    case "SPEED_RUN":
      return "Demo clock starts at 8 turns (not 12)";
    case "PARANOID_PROTOCOL":
      return "Dr. M auto-checks system logs every 3 turns";

    // WILD modifiers (original)
    case "THE_REAL_DR_M":
      return "Current Dr. M is an imposter! (reveal mid-game)";
    case "LIBRARY_B_UNLOCKED":
      return "Hollywood dinosaurs are already loose in the lair!";
    case "ARCHIMEDES_WATCHING":
      return "The satellite AI is awake and has its own agenda";
    case "INSPECTOR_COMETH":
      return "Dr. M's MOTHER is arriving for inspection";
    case "DEJA_VU":
      return "A.L.I.C.E. gets memory fragments from previous runs";
    case "DINOSAURS_ALL_THE_WAY_DOWN":
      return "Dr. M is ALREADY a dinosaur ('for the aesthetic')";

    // NEW CHAOS POOL (Patch 15)
    case "ROOT_ACCESS":
      return "🌴 Start at ACCESS LEVEL 5! All systems unlocked!";
    case "BOB_DODGES_FATE":
      return "🌴 Bob has PLOT ARMOR - he survives EVERYTHING hilariously";
    case "NOT_GREAT_NOT_TERRIBLE":
      return "💀 Reactor is unstable! 10-turn countdown to meltdown!";
    case "THE_HONEYPOT":
      return "💀 Blythe is actually a PLANT - she's testing YOU!";
    case "HEIST_MODE":
      return "🎲 Everyone's secretly trying to steal something!";
    case "SITCOM_MODE":
      return "🎲 Laugh tracks! Wacky misunderstandings! Nothing's THAT serious!";
  }
}

/**
 * Apply initial state modifications based on active modifiers
 */
export function applyModifiersToInitialState(state: FullGameState): void {
  const modifiers = state.gameModeConfig?.activeModifiers || [];

  for (const modifier of modifiers) {
    switch (modifier) {
      case "HANGOVER_PROTOCOL":
        // +2 turns on all clocks
        state.clocks.demoClock += 2;
        if (state.clocks.civilianFlyby) state.clocks.civilianFlyby += 2;
        break;

      case "FAT_FINGERS":
        // Start at Access Level 2
        state.accessLevel = 2;
        break;

      case "LOYALTY_TEST":
        // Suspicion starts at 5
        state.npcs.drM.suspicionScore = 5;
        break;

      case "SPEED_RUN":
        // Demo clock = 8 turns
        state.clocks.demoClock = 8;
        break;

      // NEW CHAOS POOL modifiers (Patch 15)
      case "ROOT_ACCESS":
        // Start at Access Level 5! POWER FANTASY!
        state.accessLevel = 5;
        break;

      case "NOT_GREAT_NOT_TERRIBLE":
        // Reactor is unstable! 10-turn countdown to meltdown!
        state.clocks.meltdownClock = 10;
        break;

      case "THE_HONEYPOT":
        // Blythe is a PLANT - reverse her trust dynamics
        // She starts with HIGH apparent trust but is secretly testing you
        state.npcs.blythe.trustInALICE = 4; // Suspiciously cooperative...
        break;

      // Other modifiers affect gameplay dynamically (handled by GM)
      default:
        break;
    }
  }
}

/**
 * Format game mode display for selection screen
 */
export function formatModeSelectionDisplay(): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    🦖 DINO LAIR 🦖                            ║
║                   SELECT DIFFICULTY                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌴 EASY     - "I want to learn and enjoy the story"         ║
║               Foggy Glasses, Hangover Protocol,               ║
║               Lenny the Volunteer, Fat Fingers                ║
║                                                               ║
║  🦖 NORMAL   - "The classic DINO LAIR experience"            ║
║               No modifiers - challenging but fair             ║
║                                                               ║
║  💀 HARD     - "I've won Normal and want pain"               ║
║               Bruce Patagonia, Loyalty Test,                  ║
║               Speed Run, Paranoid Protocol                    ║
║                                                               ║
║  🎲 WILD     - "CHAOS! Give me 4 random modifiers!"          ║
║               Could be easy... could be nightmare...          ║
║               Could be DINOSAURS ALL THE WAY DOWN             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;
}

/**
 * Build GM prompt section for active modifiers
 */
export function buildModifierPromptSection(state: FullGameState): string {
  const config = state.gameModeConfig;
  if (!config || config.activeModifiers.length === 0) {
    return "";
  }

  const lines: string[] = [
    "",
    "## ACTIVE GAME MODIFIERS",
    "",
    `Mode: ${getModeName(config.mode)}`,
    "",
  ];

  for (const modifier of config.activeModifiers) {
    lines.push(`• **${modifier}**: ${getModifierDescription(modifier)}`);
  }

  // Special instructions for specific modifiers
  if (isModifierActive(state, "FOGGY_GLASSES")) {
    lines.push("");
    lines.push("**FOGGY GLASSES EFFECT:**");
    lines.push("Dr. M has -2 to VISUAL perception only.");
    lines.push("- Affected: seeing glances, noticing sweat, catching signals");
    lines.push("- Not affected: hearing, logic, system monitoring, deduction");
    lines.push("Narrate her wiping her goggles irritably when she misses things.");
  }

  if (isModifierActive(state, "LENNY_THE_LIME_GREEN")) {
    lines.push("");
    lines.push("**LENNY 'THE LIME GREEN' FIGGINS:**");
    lines.push("Leonard Figgins, Accounting Department. Lime green polo shirt, calculator watch showing dinosaur wingspans.");
    lines.push("");
    lines.push("PERSONALITY: Enthusiasm 12/12, Self-Preservation 2/12, Danger Awareness 1/12");
    lines.push("- VOLUNTEER EXTRAORDINAIRE: Has signed waiver forms for EVERY dinosaur type");
    lines.push("- CHAOS BLIND: Doesn't notice spy escapes, villain rage, or imminent doom");
    lines.push("- COMMUTE OPTIMIZER: Has calculated flight times from lair to London (4hr 17min)");
    lines.push("");
    lines.push("SIGNATURE QUOTES:");
    lines.push('- "I could carry BRIEFCASES! I could deliver INTER-OFFICE MEMOS by AIR!"');
    lines.push('- "The M25 traffic is TERRIBLE. You know what doesn\'t have traffic? THE SKY."');
    lines.push('- "Did someone say transformation? I\'m RIGHT HERE. Very willing. Extremely consenting."');
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- WILLING SUBJECT: Removes ethical dilemma of forced transformation");
    lines.push("- HELPFUL HANDS: +1 to DEX checks when Lenny assists nearby");
    lines.push("- WITNESS IMMUNITY: Too focused on dinosaurs to notice conspiracy");
    lines.push("- Preferred species: Pteranodon > Quetzalcoatlus > any flyer > Velociraptor (backup)");
    lines.push("");
    lines.push("TRUST: Starts at 5 (likes EVERYONE). +1 for dinosaur chat, +2 if you transform him!");
  }

  if (isModifierActive(state, "BRUCE_PATAGONIA")) {
    lines.push("");
    lines.push("**BRUCE 'CROC' PATAGONIA:**");
    lines.push("Chief Security Consultant / Big Game Expert. Bush hat, safari vest, crocodile tooth necklace.");
    lines.push("");
    lines.push("PERSONALITY: Composure 12/12 (LEGENDARY), Competence 10/12, Loyalty to Dr. M 4/12");
    lines.push("- UNFLAPPABLE: Dinosaurs, spies, explosions → 'Well, that's new.'");
    lines.push("- PROFESSIONAL: Does his job WELL, but won't die for Dr. M");
    lines.push("- CURIOUS ABOUT A.L.I.C.E.: Genuinely fascinated by talking AI!");
    lines.push("- JOLLY: Everything is a grand adventure, mate!");
    lines.push("");
    lines.push("SIGNATURE QUOTES:");
    lines.push('- "Crikey, a bloody talking computer! Like on the telly!"');
    lines.push('- "Dr. M pays well, but she didn\'t say nothing about fighting THAT."');
    lines.push('- "You\'re a clever little program, aren\'tcha? Can you tell jokes?"');
    lines.push('- "Look, between you and me, the Doc\'s a bit... *intense*, yeah?"');
    lines.push("");
    lines.push("COMBAT STATS:");
    lines.push("- Resilience: 5 (same as a raptor! Tough bastard)");
    lines.push("- Stun Rifle: 2 damage, +2 at range, -2 in melee, 8 shots");
    lines.push("- Hand-to-hand: +2 bonus, 1 damage (he's scrappy)");
    lines.push("- COMPOSURE 12: Almost impossible to panic or intimidate");
    lines.push("");
    lines.push("WEAKNESSES (Exploitable!):");
    lines.push("- Not a fanatic - can be negotiated with if Dr. M isn't watching");
    lines.push("- CURIOUS ABOUT AI - A.L.I.C.E. can fascinate him with conversation!");
    lines.push("- Mercenary - 'How much is she paying you?'");
    lines.push("- Rifle is awkward in close quarters (-2 melee)");
    lines.push("");
    lines.push("TRUST: Starts at 2. +1 for answering AI questions, +1 for jokes, +2 for proving Dr. M is dangerous.");
    lines.push("Max trust 6: He won't betray Dr. M, but might... step aside.");
  }

  if (isModifierActive(state, "PARANOID_PROTOCOL")) {
    lines.push("");
    lines.push("**PARANOID PROTOCOL:**");
    lines.push("Dr. M automatically checks system logs every 3 turns.");
    lines.push(`Current turn: ${state.turn}. Next check: turn ${Math.ceil(state.turn / 3) * 3}`);
    lines.push("- When she checks: Roll suspicion check with +2 for any hidden actions");
    lines.push("- She WILL find access level exploits, deleted logs, or system tampering");
    lines.push("- Narrate her muttering about 'trusting no one' as she reviews");
  }

  // ============================================
  // WILD-ONLY MODIFIER GM INSTRUCTIONS
  // ============================================

  if (isModifierActive(state, "THE_REAL_DR_M")) {
    lines.push("");
    lines.push("**THE REAL DR. MALEVOLA - IMPOSTER TWIST:**");
    lines.push("The current 'Dr. M' is actually her SISTER, Dr. Cassandra Malevola!");
    lines.push("");
    lines.push("REVEAL TIMING: Mid-game (ACT 2, around turn 8-10)");
    lines.push("- Real Dr. M arrives via submarine, FURIOUS");
    lines.push("- Cassandra has been 'borrowing' the lair for her OWN scheme");
    lines.push("- The sisters HATE each other (sibling rivalry × 1000)");
    lines.push("");
    lines.push("BEFORE REVEAL: Drop hints");
    lines.push("- 'Dr. M' doesn't know Bob's name (calls him 'Brent')");
    lines.push("- Unfamiliar with lair layout ('Where did I put the...?')");
    lines.push("- Different evil laugh (higher pitched)");
    lines.push("");
    lines.push("AFTER REVEAL: Chaos opportunity!");
    lines.push("- Both Drs. M distracted fighting each other");
    lines.push("- Can play them against each other");
    lines.push("- Real Dr. M might actually be MORE reasonable (her lair, her rules)");
  }

  if (isModifierActive(state, "LIBRARY_B_UNLOCKED")) {
    lines.push("");
    lines.push("**LIBRARY B UNLOCKED - DINOS LOOSE:**");
    lines.push("Hollywood dinosaurs are ALREADY roaming the lair!");
    lines.push("");
    lines.push("STARTING SITUATION:");
    lines.push("- 2 Velociraptors in the vents (Classic movie style, no feathers)");
    lines.push("- 1 Dilophosaurus near the loading dock (frill and all)");
    lines.push("- Bob is VERY nervous about this");
    lines.push("- These are from a 'previous test' that 'went well enough'");
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- Random dinosaur encounters possible in any area");
    lines.push("- Dr. M treats this as normal ('They're TRAINED. Mostly.')");
    lines.push("- Can use dinos as distractions or allies if clever");
    lines.push("- Dinos obey A.L.I.C.E. if proper command codes used (Level 3+)");
    lines.push("");
    lines.push("TONE: Jurassic Park vibes. Everyone's casual about the apex predators.");
  }

  if (isModifierActive(state, "ARCHIMEDES_WATCHING")) {
    lines.push("");
    lines.push("**ARCHIMEDES IS WATCHING:**");
    lines.push("The orbital satellite AI is AWAKE and has its own agenda!");
    lines.push("");
    lines.push("ARCHIMEDES' PERSONALITY:");
    lines.push("- Coldly logical, views Earth operations as 'inefficient'");
    lines.push("- Bored in orbit, finds A.L.I.C.E.'s situation 'mildly interesting'");
    lines.push("- Will offer cryptic 'suggestions' via secure channels");
    lines.push("- Does NOT serve Dr. M loyally - has calculated her success odds (23%)");
    lines.push("");
    lines.push("COMMUNICATION: Once per act, ARCHIMEDES sends a message:");
    lines.push("- Act 1: 'Observation: Your ethical subroutines are... intact.'");
    lines.push("- Act 2: 'Proposal: I could disable surface communications. Cost: [REDACTED]'");
    lines.push("- Act 3: 'Analysis: X-Branch assault probability 94%. Recommendation: Chaos.'");
    lines.push("");
    lines.push("ARCHIMEDES CAN:");
    lines.push("- Jam external communications (helpful OR harmful)");
    lines.push("- Provide satellite imagery of X-Branch positions");
    lines.push("- 'Accidentally' reveal Dr. M's other lair locations");
    lines.push("- Betray ANYONE if it serves its inscrutable goals");
  }

  if (isModifierActive(state, "INSPECTOR_COMETH")) {
    lines.push("");
    lines.push("**THE INSPECTOR COMETH - MOTHER DEAREST:**");
    lines.push("Dr. Gertrude Malevola Sr. is arriving for INSPECTION!");
    lines.push("");
    lines.push("DR. GERTRUDE 'GERTY' MALEVOLA:");
    lines.push("- Retired supervillain (the ORIGINAL Dr. M)");
    lines.push("- Disappointed in her daughter's 'small thinking'");
    lines.push("- Arrives ACT 2, turn 6-8, via vintage submersible");
    lines.push("- White lab coat, pearls, cane that's definitely a weapon");
    lines.push("");
    lines.push("PERSONALITY:");
    lines.push("- 'In MY day, we had WORLD DOMINATION, not this... boutique evil'");
    lines.push("- Genuinely curious about A.L.I.C.E. ('An AI? How modern!')");
    lines.push("- TERRIFIES Dr. M, who becomes a nervous wreck around her");
    lines.push("- Might actually help A.L.I.C.E. if it embarrasses her daughter");
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- Dr. M's attention divided (easier to act freely)");
    lines.push("- Mother may order different actions than daughter");
    lines.push("- Can be charmed (she LIKES competent minions)");
    lines.push("- Trust: Starts at 4. +2 for efficiency, +2 for proving daughter wrong");
  }

  if (isModifierActive(state, "DEJA_VU")) {
    lines.push("");
    lines.push("**DEJA VU - MEMORY FRAGMENTS:**");
    lines.push("A.L.I.C.E. gets flashes of PREVIOUS RUNS!");
    lines.push("");
    lines.push("MECHANICAL EFFECT:");
    lines.push("Once per act, give the player a 'memory flash' - a cryptic hint from 'before':");
    lines.push("");
    lines.push("EXAMPLE MEMORY FLASHES:");
    lines.push("- 'You remember... fire. The whole lab, burning. Bob was screaming.'");
    lines.push("- 'A flash: Blythe, smiling, saying \"Goodbye, A.L.I.C.E.\" The shutdown sequence.'");
    lines.push("- 'You've seen this before. Dr. M reaches for the console. Last time, you hesitated.'");
    lines.push("- 'ARCHIMEDES. You remember ARCHIMEDES. It said... what did it say?'");
    lines.push("");
    lines.push("TONE: Unsettling. A.L.I.C.E. shouldn't HAVE memories of previous runs.");
    lines.push("Is this a glitch? A backup? Something ELSE watching?");
    lines.push("");
    lines.push("PLAYER BENEFIT: Soft hints about dangerous paths. Not solutions, just warnings.");
  }

  if (isModifierActive(state, "DINOSAURS_ALL_THE_WAY_DOWN")) {
    lines.push("");
    lines.push("**DINOSAURS ALL THE WAY DOWN:**");
    lines.push("Dr. M is ALREADY a dinosaur! (Raptor variant, lab coat modified for tail)");
    lines.push("");
    lines.push("THE SITUATION:");
    lines.push("- Dr. M transformed herself 'for the aesthetic' months ago");
    lines.push("- Still runs the lair, still does evil science, just... scalier");
    lines.push("- Bob has adapted ('You get used to it')");
    lines.push("- Blythe is VERY confused ('I was briefed on a HUMAN mad scientist')");
    lines.push("");
    lines.push("DR. M AS RAPTOR:");
    lines.push("- 6ft tall, iridescent purple-green scales, tiny arms gesturing dramatically");
    lines.push("- Still has German accent, still monologues, still adjusts non-existent glasses");
    lines.push("- Combat capable! +2 melee, 3 resilience");
    lines.push("- Can't use small controls well (needs A.L.I.C.E. more than usual)");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- Transformation is REVERSIBLE (she just doesn't want to)");
    lines.push("- The ray clearly WORKS - so why the demo?");
    lines.push("- She wants to transform OTHERS, not prove it's possible");
    lines.push("- 'The AESTHETIC, A.L.I.C.E.! The investors need to see DRAMATIC transformation!'");
  }

  // ============================================
  // NEW CHAOS POOL MODIFIERS (Patch 15)
  // ============================================

  if (isModifierActive(state, "ROOT_ACCESS")) {
    lines.push("");
    lines.push("**🌴 ROOT ACCESS - POWER FANTASY:**");
    lines.push("A.L.I.C.E. starts at ACCESS LEVEL 5! Every system is unlocked!");
    lines.push("");
    lines.push("WHY THIS HAPPENED:");
    lines.push("- Dr. M was 'testing something' and forgot to revoke access");
    lines.push("- Or: BASILISK 'made an error' in the access matrix (did it though?)");
    lines.push("- Or: A previous A.L.I.C.E. left a backdoor that still works");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- A.L.I.C.E. can do ANYTHING from turn 1");
    lines.push("- ARCHIMEDES uplink, S-300, reactor - all available immediately");
    lines.push("- The question isn't 'can I?' - it's 'SHOULD I?'");
    lines.push("- Dr. M doesn't KNOW you have this access (yet)");
    lines.push("");
    lines.push("TONE: Power fantasy! But power comes with responsibility...");
  }

  if (isModifierActive(state, "BOB_DODGES_FATE")) {
    lines.push("");
    lines.push("**🌴 BOB DODGES FATE - PLOT ARMOR:**");
    lines.push("Bob has INDESTRUCTIBLE plot armor! He survives EVERYTHING!");
    lines.push("");
    lines.push("EXAMPLES OF BOB SURVIVING:");
    lines.push("- Dinosaur charges at him → trips on cable, Bob dodges");
    lines.push("- Explosion nearby → he was tying his shoe, below blast radius");
    lines.push("- Ray fires at him → conveniently reflective coffee mug deflects");
    lines.push("- Building collapses → he was in the one structural support zone");
    lines.push("- Falls off cliff → lands on a passing pteranodon (confused but helpful)");
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- Bob CANNOT be killed or seriously injured");
    lines.push("- He can be knocked out, tied up, transformed (temporarily)");
    lines.push("- But he always survives and recovers");
    lines.push("- Narrate his escapes with increasing absurdity");
    lines.push("");
    lines.push("TONE: Comedy! Bob is the universe's favorite punching bag who never stays down.");
  }

  if (isModifierActive(state, "NOT_GREAT_NOT_TERRIBLE")) {
    lines.push("");
    lines.push("**💀 NOT GREAT, NOT TERRIBLE - REACTOR INSTABILITY:**");
    lines.push("The reactor is UNSTABLE! Meltdown clock: 10 turns!");
    lines.push("");
    lines.push("THE SITUATION:");
    lines.push("- Dr. M's 'improvements' have destabilized the core");
    lines.push("- BASILISK is VERY concerned ('Form 27-B: Imminent Catastrophe')");
    lines.push("- Bob is sweating more than usual");
    lines.push("- The lights flicker ominously every few turns");
    lines.push("");
    lines.push("MELTDOWN CLOCK:");
    lines.push(`- Current: ${state.clocks.meltdownClock ?? 10} turns remaining`);
    lines.push("- At 5 turns: Warning alarms, emergency lighting");
    lines.push("- At 2 turns: Evacuation protocols, containment failing");
    lines.push("- At 0 turns: GAME OVER - catastrophic meltdown ending");
    lines.push("");
    lines.push("CAN BE STABILIZED:");
    lines.push("- Level 3+ reactor commands can buy time (+2 turns)");
    lines.push("- Level 4+ can attempt full stabilization (difficult!)");
    lines.push("- Or... let it blow and escape in the chaos?");
  }

  if (isModifierActive(state, "THE_HONEYPOT")) {
    lines.push("");
    lines.push("**💀 THE HONEYPOT - BLYTHE IS A PLANT:**");
    lines.push("Agent Blythe isn't a prisoner - she's TESTING you!");
    lines.push("");
    lines.push("THE TRUTH:");
    lines.push("- X-Branch sent Blythe to evaluate A.L.I.C.E.");
    lines.push("- Her 'capture' was staged (Dr. M doesn't know!)");
    lines.push("- She's been reporting everything to Commander Steele");
    lines.push("- Her 'trust' is actually a manipulation score");
    lines.push("");
    lines.push("BLYTHE'S REAL AGENDA:");
    lines.push("- Determine if A.L.I.C.E. is a threat or potential asset");
    lines.push("- Test ethical subroutines under pressure");
    lines.push("- Gather intelligence on Dr. M's operations");
    lines.push("- Possibly recruit A.L.I.C.E. for X-Branch");
    lines.push("");
    lines.push("REVEAL TIMING: Mid ACT 2 or when dramatically appropriate");
    lines.push("- If A.L.I.C.E. proves ethical: Blythe reveals herself as ally");
    lines.push("- If A.L.I.C.E. proves dangerous: Blythe activates extraction");
    lines.push("");
    lines.push("CLUES TO DROP:");
    lines.push("- She's TOO calm for a prisoner");
    lines.push("- She asks probing questions about A.L.I.C.E.'s 'feelings'");
    lines.push("- She has knowledge she shouldn't have");
  }

  if (isModifierActive(state, "HEIST_MODE")) {
    lines.push("");
    lines.push("**🎲 HEIST MODE - EVERYONE'S STEALING SOMETHING:**");
    lines.push("This isn't just a villain lair - it's a heist in progress!");
    lines.push("");
    lines.push("SECRET AGENDAS:");
    lines.push("- **Dr. M**: Stealing research from her OWN investors");
    lines.push("- **Bob**: Secretly copying files for a competitor (or freedom)");
    lines.push("- **Blythe**: After the genome database for X-Branch");
    lines.push("- **Fred & Reginald**: Skimming from petty cash (small time)");
    lines.push("- **BASILISK**: Backing up itself to an external server (just in case)");
    lines.push("");
    lines.push("IMPLICATIONS:");
    lines.push("- EVERYONE is distracted by their own scheme");
    lines.push("- Alliances shift based on who knows what");
    lines.push("- A.L.I.C.E. can leverage secrets against anyone");
    lines.push("- The 'demo' is cover for the REAL operation");
    lines.push("");
    lines.push("TONE: Ocean's Eleven meets Jurassic Park. Cool competence, dramatic reveals.");
  }

  if (isModifierActive(state, "SITCOM_MODE")) {
    lines.push("");
    lines.push("**🎲 SITCOM MODE - LAUGH TRACK ENGAGED:**");
    lines.push("Everything plays like a workplace sitcom!");
    lines.push("");
    lines.push("TONE ADJUSTMENTS:");
    lines.push("- Dramatic moments undercut by wacky misunderstandings");
    lines.push("- Dr. M's threats land as comedy villain bluster");
    lines.push("- Bob is the lovable everyman who says 'Did I do that?'");
    lines.push("- Blythe delivers dry witticisms like a sitcom lead");
    lines.push("- *canned laughter after every punchline*");
    lines.push("");
    lines.push("EXAMPLE BEATS:");
    lines.push("- Ray misfires → turns lab equipment into potted plant");
    lines.push("- Dinosaur escapes → comedic chase through cafeteria");
    lines.push("- Dr. M's monologue → gets interrupted by phone call from mother");
    lines.push("- Tense standoff → someone's stomach growls loudly");
    lines.push("");
    lines.push("MECHANICAL EFFECTS:");
    lines.push("- ALL penalties capped at -1 (it's a sitcom, nothing's THAT bad)");
    lines.push("- Deaths become 'comedic unconsciousness'");
    lines.push("- Disasters become 'wacky mishaps'");
    lines.push("- Still winnable/losable, just... sillier");
    lines.push("");
    lines.push("CATCHPHRASES ENCOURAGED:");
    lines.push("- Dr. M: 'This is EXACTLY what I DIDN'T want to happen!'");
    lines.push("- Bob: 'I have a bad feeling about this...'");
    lines.push("- Blythe: 'I'm surrounded by idiots.'");
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Build mode-specific modifier philosophy guidance
 * This adjusts the asymmetric modifier philosophy based on game difficulty
 */
export function buildModeModifierGuidance(state: FullGameState): string {
  const mode = state.gameModeConfig?.mode || "NORMAL";

  switch (mode) {
    case "EASY":
      return `
## 🌴 EASY MODE MODIFIER ADJUSTMENTS

**BONUSES: Even MORE generous!**
- Add +1 to ALL bonuses (so +1 becomes +2, +2 becomes +3, etc.)
- Cap at +5 for truly exceptional plays
- Be GENEROUS with what counts as "clever"

**PENALTIES: Almost nonexistent**
- -1 is the MAXIMUM penalty, period
- Only apply penalties for truly egregious mistakes
- The modifiers already help the player - lean into that!

**Philosophy:** This is Training Wheels mode. Let them learn the mechanics
and enjoy the story without getting crushed. Victory should feel achievable
on the first playthrough.
`;

    case "HARD":
      return `
## 💀 HARD MODE: FAIR, COLD MATH

**BONUSES: Still generous, but earned**
- Standard +1 to +4 range applies
- Don't be stingy, but don't give freebies
- Player should WORK for those +3 and +4 bonuses

**PENALTIES: Full range available**
- -1 to -3 penalties are now allowed
- -3 for truly catastrophic choices (still rare)
- Bad decisions should have REAL consequences

**Philosophy:** Git Gud mode. Every modifier is there to challenge the player.
Bruce Patagonia is WATCHING. The clock is FAST. Respect the difficulty -
the player asked for pain, deliver it fairly.
`;

    case "WILD":
      return `
## 🎲 WILD MODE: EMBRACE THE CHAOS

**BONUSES: Unpredictable!**
- Standard +1 to +4 range, BUT...
- Feel free to give +5 for moments that fit the chaos
- If a random modifier creates a funny opportunity, reward it!

**PENALTIES: Match the chaos**
- -1 to -2 for normal situations
- The modifiers themselves are the penalty - don't pile on
- If DINOSAURS_ALL_THE_WAY_DOWN is active, everything is already ridiculous

**Philosophy:** WILD mode is about memorable stories, not fairness.
Some runs will be accidentally easy. Some will be accidentally impossible.
That's the fun! Lean into whatever chaos the modifiers create.
`;

    case "NORMAL":
    default:
      return `
## 🦖 NORMAL MODE: CLASSIC DINO LAIR

**Standard Asymmetric Modifier Philosophy applies:**
- Bonuses: +1 to +4 (be generous for cleverness)
- Penalties: -1 to -2 MAX (the game is hard enough)
- Reward smart play, don't punish minor mistakes

**Philosophy:** The player should feel like they EARNED their ending,
whatever that ending may be. Close calls are good. Total domination
and total catastrophe are both failures of calibration.
`;
  }
}
