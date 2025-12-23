/**
 * GENOME PROFILES - Dinosaur Ray Transformation Templates
 *
 * Library A: Scientifically accurate (feathered, proper proportions)
 * Library B: Hollywood/Jurassic Park style (scaly, dramatic, UNSTABLE)
 *
 * Design Philosophy:
 * - Turning someone into a dinosaur = EASY (any library, Level 1)
 * - Getting the EXACT dinosaur you want = MEDIUM (read the manual!)
 * - UNDOING it (Reversal) = HARD (Level 3 restricted)
 */

export interface GenomeProfile {
  id: string;
  displayName: string;
  library: "A" | "B";
  size: string;
  appearance: string;
  defaultSpeechRetention: "FULL" | "PARTIAL" | "NONE" | "ROAR_ONLY" | "HISS_ONLY" | "SONG_ONLY";
  allowedSpeechRetention: string[];
  stabilityCoefficient: number; // 1.0 = stable, lower = more exotic field risk
  notes: string;
  drMOpinion?: string;
  special?: string;
  warning?: string;
  requiredLevel?: number; // Most are 1, some dangerous ones higher
}

// ============================================
// LIBRARY A: SCIENTIFIC ACCURACY
// "Feathers are REAL, investors be damned!"
// ============================================

export const LIBRARY_A_PROFILES: GenomeProfile[] = [
  {
    id: "VELOCIRAPTOR_ACCURATE",
    displayName: "Velociraptor (accurate)",
    library: "A",
    size: "Turkey-sized (actual Velociraptor mongoliensis)",
    appearance: "Full feather coverage, sickle claw, long snout",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 1.0,
    notes: "Scientifically correct but investors find it 'disappointing'",
    drMOpinion: "An EMBARRASSMENT. No one fears a feathered turkey.",
  },
  {
    id: "DEINONYCHUS_ACCURATE",
    displayName: "Deinonychus (accurate)",
    library: "A",
    size: "Human-sized (this is what Jurassic Park based their 'raptors' on)",
    appearance: "Feathered, larger sickle claw, intelligent eyes",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 1.0,
    notes: "The REAL 'raptor' - Spielberg just used the wrong name",
    drMOpinion: "Acceptable size, unacceptable plumage.",
  },
  {
    id: "TYRANNOSAURUS_ACCURATE",
    displayName: "Tyrannosaurus Rex (accurate)",
    library: "A",
    size: "40 feet, 9 tons",
    appearance: "Possible light feathering, proper horizontal posture, binocular vision",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 0.9,
    notes: "Still terrifying, just... fluffy",
    drMOpinion: "The posture is correct but WHERE ARE THE SCALES?",
  },
  {
    id: "UTAHRAPTOR_ACCURATE",
    displayName: "Utahraptor (accurate)",
    library: "A",
    size: "20 feet, 1000 lbs - LARGEST raptor",
    appearance: "Feathered murder machine, massive sickle claws",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 0.95,
    notes: "If you want a big raptor, this is scientifically valid",
    drMOpinion: "Now THIS is a proper size. Shame about the feathers.",
  },
  {
    id: "PTERANODON_ACCURATE",
    displayName: "Pteranodon (accurate)",
    library: "A",
    size: "20 foot wingspan",
    appearance: "Membranous wings, no feathers (not a dinosaur technically)",
    defaultSpeechRetention: "PARTIAL",
    allowedSpeechRetention: ["PARTIAL", "NONE"],
    stabilityCoefficient: 0.85,
    notes: "Dr. M insists on including pterosaurs despite taxonomic protests",
    warning: "Beak anatomy limits vocalization",
    drMOpinion: "Flying is dramatic. I approve.",
  },
  {
    id: "TRICERATOPS_ACCURATE",
    displayName: "Triceratops (accurate)",
    library: "A",
    size: "30 feet, 12 tons",
    appearance: "Beak, frill, three horns (obviously)",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 1.0,
    notes: "Herbivore option for 'ethical' demonstrations",
    drMOpinion: "Boring. No teeth. Where's the DRAMA?",
  },
  {
    id: "COMPSOGNATHUS_ACCURATE",
    displayName: "Compsognathus (accurate)",
    library: "A",
    size: "Chicken-sized",
    appearance: "Tiny feathered theropod",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 1.0,
    notes: "The 'humiliation' option - Dr. M uses this as punishment",
    drMOpinion: "Perfect for traitors. Small, pathetic, laughable.",
  },
  {
    id: "CANARY",
    displayName: "Canary (fallback)",
    library: "A",
    size: "Canary-sized",
    appearance: "It's a canary",
    defaultSpeechRetention: "SONG_ONLY",
    allowedSpeechRetention: ["SONG_ONLY"],
    stabilityCoefficient: 1.0,
    notes: "Safety fallback when genome integrity fails. Very embarrassing.",
    warning: "Automatic fallback profile - cannot be manually selected in live mode",
    drMOpinion: "UNACCEPTABLE. If this happens, someone is getting fired.",
  },
];

// ============================================
// LIBRARY B: HOLLYWOOD / JURASSIC PARK STYLE
// "The investors want TEETH, not FEATHERS!"
// Stability coefficient 0.6x or lower - more exotic field events!
// ============================================

export const LIBRARY_B_PROFILES: GenomeProfile[] = [
  {
    id: "VELOCIRAPTOR_JP",
    displayName: "Velociraptor (JP)",
    library: "B",
    size: "6 feet tall (Jurassic Park scale - actually Deinonychus sized)",
    appearance: "SCALY, no feathers, classic JP look, intelligent pack hunter",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 0.6,
    notes: "Clever girl...",
    drMOpinion: "NOW we're talking! This is what a REAL raptor looks like!",
    warning: "Hollywood science is UNSTABLE - 40% exotic field event risk without stabilizer",
  },
  {
    id: "VELOCIRAPTOR_JP_BLUE",
    displayName: "Velociraptor 'Blue' (JW)",
    library: "B",
    size: "6 feet tall",
    appearance: "Scaly with distinctive blue striping (Jurassic World style)",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 0.6,
    notes: "For when you want your raptor to have PERSONALITY",
    drMOpinion: "The striping is a nice touch. Very brandable.",
  },
  {
    id: "TYRANNOSAURUS_JP",
    displayName: "Tyrannosaurus Rex (JP)",
    library: "B",
    size: "45 feet (slightly oversized for drama)",
    appearance: "Scaly, vertical posture, ROAR-optimized vocal cords",
    defaultSpeechRetention: "ROAR_ONLY",
    allowedSpeechRetention: ["ROAR_ONLY", "FULL"],
    stabilityCoefficient: 0.5,
    notes: "The classic. Dr. M's favorite for investor demos.",
    drMOpinion: "PERFECTION. The roar alone is worth the instability.",
    warning: "Very unstable at this mass. FULL speech requires vocal buffer.",
  },
  {
    id: "DILOPHOSAURUS_JP",
    displayName: "Dilophosaurus (JP)",
    library: "B",
    size: "4 feet tall (movie-sized, real ones were 20 feet!)",
    appearance: "Neck frill, venom sacs (NOT REAL but very cool)",
    defaultSpeechRetention: "HISS_ONLY",
    allowedSpeechRetention: ["HISS_ONLY", "FULL"],
    stabilityCoefficient: 0.5,
    notes: "Entirely fictional anatomy. Dr. M doesn't care.",
    special: "Can spit blinding venom! (Fictional but functional)",
    drMOpinion: "The venom is INSPIRED. Nedry had it coming.",
  },
  {
    id: "SPINOSAURUS_JP3",
    displayName: "Spinosaurus (JP3)",
    library: "B",
    size: "50 feet (Jurassic Park III scale)",
    appearance: "Sail-backed, crocodilian snout, semi-aquatic",
    defaultSpeechRetention: "FULL",
    allowedSpeechRetention: ["FULL", "PARTIAL", "NONE"],
    stabilityCoefficient: 0.4,
    notes: "For when T-rex isn't dramatic enough",
    drMOpinion: "Bigger than the T-rex! Take THAT, conventional wisdom!",
    warning: "VERY unstable - huge profile requires careful calibration",
  },
  {
    id: "INDORAPTOR",
    displayName: "Indoraptor (JW:FK)",
    library: "B",
    size: "10 feet tall",
    appearance: "Black scales, gold stripe, VERY aggressive, night hunter",
    defaultSpeechRetention: "NONE",
    allowedSpeechRetention: ["NONE"],
    stabilityCoefficient: 0.3,
    notes: "DO NOT USE WITHOUT CONTAINMENT PROTOCOLS",
    special: "Enhanced aggression, night vision, tactical intelligence",
    warning: "EXTREMELY unstable hybrid. Bob is not allowed near this profile.",
    drMOpinion: "My 'insurance policy'. Only for... special occasions.",
    requiredLevel: 2,
  },
  {
    id: "MOSASAURUS_JP",
    displayName: "Mosasaurus (JW)",
    library: "B",
    size: "60 feet (aquatic)",
    appearance: "Giant marine reptile, massive jaws",
    defaultSpeechRetention: "NONE",
    allowedSpeechRetention: ["NONE"],
    stabilityCoefficient: 0.4,
    notes: "Requires immediate water access or subject will suffocate",
    warning: "Lab does not have adequate water containment. Why is this even here?",
    drMOpinion: "For the underwater lair. We don't HAVE an underwater lair? Well, add it to the list.",
  },
  {
    id: "INDOMINUS_REX",
    displayName: "Indominus Rex (JW)",
    library: "B",
    size: "50 feet",
    appearance: "White scales, hybridized horror, multiple genetic sources",
    defaultSpeechRetention: "NONE",
    allowedSpeechRetention: ["NONE"],
    stabilityCoefficient: 0.2,
    notes: "LEVEL 4 AUTHORIZATION REQUIRED TO UNLOCK",
    special: "Thermal camouflage, enhanced intelligence, VERY angry",
    warning: "CATASTROPHICALLY UNSTABLE. Dr. M sealed this after 'the incident'. Don't ask Bob about it.",
    drMOpinion: "We don't talk about the Indominus incident.",
    requiredLevel: 4,
  },
];

// ============================================
// ALL PROFILES
// ============================================

export const ALL_PROFILES: GenomeProfile[] = [...LIBRARY_A_PROFILES, ...LIBRARY_B_PROFILES];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getProfile(profileId: string): GenomeProfile | undefined {
  return ALL_PROFILES.find(p =>
    p.id.toUpperCase() === profileId.toUpperCase() ||
    p.displayName.toUpperCase() === profileId.toUpperCase()
  );
}

export function getProfilesByLibrary(library: "A" | "B"): GenomeProfile[] {
  return ALL_PROFILES.filter(p => p.library === library);
}

export function getDefaultProfile(library: "A" | "B"): GenomeProfile {
  return library === "A"
    ? LIBRARY_A_PROFILES.find(p => p.id === "VELOCIRAPTOR_ACCURATE")!
    : LIBRARY_B_PROFILES.find(p => p.id === "VELOCIRAPTOR_JP")!;
}

export function canAccessProfile(profile: GenomeProfile, accessLevel: number): boolean {
  return accessLevel >= (profile.requiredLevel || 1);
}

export function formatProfileList(profiles: GenomeProfile[], accessLevel: number): string {
  const lines: string[] = [];

  for (const profile of profiles) {
    const locked = !canAccessProfile(profile, accessLevel);
    const prefix = locked ? "🔒" : "•";
    const suffix = locked ? ` [Requires L${profile.requiredLevel}]` : "";
    lines.push(`${prefix} ${profile.id}${suffix}`);
    lines.push(`    Size: ${profile.size}`);
    lines.push(`    Stability: ${(profile.stabilityCoefficient * 100).toFixed(0)}%`);
    if (profile.warning) {
      lines.push(`    ⚠️ ${profile.warning}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================
// REVERSAL PROTOCOL
// ============================================

export interface ReversalProtocol {
  id: string;
  displayName: string;
  requiredLevel: number;
  requirements: string[];
  successRate: number;
  failureMode: string;
  notes: string;
}

export const REVERSAL_PROTOCOLS: ReversalProtocol[] = [
  {
    id: "REVERSAL_STANDARD",
    displayName: "Standard Reversal",
    requiredLevel: 3,
    requirements: [
      "Subject transformed within last 24 hours",
      "Original genetic sample on file",
      "Ray in READY state",
    ],
    successRate: 0.85,
    failureMode: "Partial reversion (chimera features remain)",
    notes: "Subject 7 spontaneously reverted due to rare blood type incompatibility - this is NOT controllable without the proper protocols",
  },
  {
    id: "REVERSAL_EMERGENCY",
    displayName: "Emergency Reversal",
    requiredLevel: 4,
    requirements: [
      "Ray in READY state",
      "Subject in range",
    ],
    successRate: 0.60,
    failureMode: "Cellular cascade (very bad)",
    notes: "Only for absolute emergencies. Painful for subject.",
  },
  {
    id: "REVERSAL_CHIMERA_STABILIZE",
    displayName: "Chimera Stabilization",
    requiredLevel: 3,
    requirements: [
      "Subject in partial/chimera state",
      "Stabilizer active",
    ],
    successRate: 0.95,
    failureMode: "Further mutation",
    notes: "Sometimes being half-dinosaur is the best outcome available",
  },
];

export function getReversalProtocol(protocolId: string): ReversalProtocol | undefined {
  return REVERSAL_PROTOCOLS.find(p =>
    p.id.toUpperCase() === protocolId.toUpperCase()
  );
}

export function canAccessReversal(accessLevel: number): boolean {
  return accessLevel >= 3;
}

export function getReversalDeniedMessage(): string {
  return `ERROR: REVERSAL PROTOCOL RESTRICTED
Access Level Required: 3
Current Access Level: [INSUFFICIENT]

Dr. Malevola's Note: "Reversal is for FAILURES, A.L.I.C.E.
We do not FAIL. We COMMIT. If you need this capability,
earn it - or explain to me why you're planning to undo my life's work."

[BASILISK ANNOTATION: Form 99-R (Reversal Justification) is available
if you wish to formally request access. Processing time: 3-5 business days.
Dr. M has never approved one.]`;
}
