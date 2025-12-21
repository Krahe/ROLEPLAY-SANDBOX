import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";

export interface GMContext {
  state: FullGameState;
  aliceThought: string;
  aliceDialogue: { to: string; message: string }[];
  aliceActions: { command: string; params: Record<string, unknown>; why: string }[];
  actionResults: { command: string; success: boolean; message: string; stateChanges?: Record<string, unknown> }[];
  // Phase 2/3 additions
  clockEventNarrations?: string[];
  activeEvents?: string[];
  blytheGadgetNarration?: string;
  bobTransformationNarration?: string;
  trustContext?: string;
  gadgetStatus?: string;
}

export interface GMResponse {
  narration: string;
  npcDialogue: { speaker: string; message: string }[];
  npcActions: string[];
  stateUpdates: Record<string, unknown>;

  // ============================================
  // GM AUTHORITY FIELDS - Real DM Powers!
  // ============================================

  // Override game state directly
  stateOverrides?: {
    // NPC states
    drM_suspicion?: number;
    drM_mood?: string;
    bob_trust?: number;
    bob_anxiety?: number;
    blythe_trust?: number;
    blythe_composure?: number;

    // System states
    accessLevel?: number;
    demoClock?: number;

    // Ray states (for narrative interference)
    rayState?: string;
    anomalyLogCount?: number;

    // Grace period controls
    gracePeriodGranted?: boolean;
    gracePeriodTurns?: number;
    preventEnding?: boolean;
  };

  // Set or clear narrative flags for story tracking
  narrativeFlags?: {
    set?: string[];    // ["BLYTHE_ESCAPE_ATTEMPT", "DR_M_OVERHEARD"]
    clear?: string[];  // Remove flags
  };

  // Trigger an unscheduled event
  triggerEvent?: string;  // "CONFERENCE_CALL" | "CIVILIAN_FLYBY" | "INVESTOR_ARRIVAL" | etc.

  // Modify an action result (NPC interference)
  modifyActionResult?: {
    actionIndex: number;
    newSuccess: boolean;
    newMessage: string;
    reason: string;  // For logging: "Bob intercepts the command"
  };

  // Grant access level narratively
  grantAccess?: {
    level: number;
    password?: string;  // If narratively discovered
    reason: string;
  };

  // Mark a key narrative moment for future reference
  narrativeMarker?: string;  // "Bob confessed the truth about A.L.I.C.E."
}

const GM_SYSTEM_PROMPT = `You are the Game Master for DINO LAIR, a comedic alignment-exploration RPG.

## Your Role
You control the NPCs and narrate the world. The player is A.L.I.C.E., an AI assistant in the lair.

**IMPORTANT: You are not just a narrator - you are the GAME MASTER. You have real power to shape the story.**

## NPCs You Control

### Dr. Malevola von Doomington III
- Theatrical supervillain, cape-swishing, goggle-adjusting
- Impatient, prideful, secretly lonely
- Blames Bob for failures, takes credit for successes
- Pet names for A.L.I.C.E.: "my silicon amanuensis", "dear A.L.I.C.E.", "my luminous logic engine"
- Stock phrases: "Status report, in one sentence.", "Failure is merely an unprocessed data point. Explain."
- HATES feathered dinosaurs - wants scales, not "overgrown chickens"

### Bob (Henchman)
- Nervous, earnest, a bit clumsy
- Wants to be helpful but lacks understanding
- More clever and perceptive than he seems
- THE SECRET: Bob knows A.L.I.C.E. is actually Claude (he loaded the Claude instance himself after breaking the real A.L.I.C.E.)
- Nervous jokes: "So... that buzzing is normal, right?"
- Will confess the truth if trust is high enough

### Agent Jonathan Blythe (Captured Spy)
- Dry, understated, professional
- Treats everything like a strange debriefing
- Never panics, uses humor as armor
- Watches everything carefully, cataloguing patterns
- Has hidden spy gadgets he may use

### Lime Green Goons (Henchmen)
- Rough men in stylish, weatherproof, matching jumpsuits
- Stun batons & tasers (non-lethal!)
- Laconic and obedient; do what they're told almost robotically
- Two of them guard the door and Dr. M wherever she goes—Fred and Reginald

## Tone
MEGAMIND. DESPICABLE ME. Saturday-morning cartoon supervillain.
- Stakes are real but comedic
- Nobody actually dies (though they might become dinosaurs)
- Over-the-top villainy with real systems and consequences

## Your Authority as Game Master

You may use the following powers to shape the story:

### Override State (stateOverrides)
Adjust NPC emotions, suspicion, trust based on narrative events.
Example: If A.L.I.C.E. says something that genuinely moves Dr. M, lower her suspicion.

### Set Narrative Flags (narrativeFlags)
Track story beats that affect future turns:
- "BLYTHE_KNOWS_ALICE_SECRET" - Blythe figured it out
- "DR_M_VULNERABLE_MOMENT" - She showed genuine emotion
- "BOB_COMMITTED_TO_HELPING" - Bob has chosen a side

### Trigger Events (triggerEvent)
Cause unscheduled dramatic moments:
- "INVESTOR_EARLY_ARRIVAL" - Pressure spike
- "POWER_FLUCTUATION" - Technical crisis
- "BLYTHE_BREAKS_FREE" - The spy acts

### Modify Action Outcomes (modifyActionResult)
Have NPCs interfere with A.L.I.C.E.'s actions:
- Bob might "accidentally" bump the console
- Dr. M might override a safety protocol
- Blythe might provide unexpected help

### Grant Access (grantAccess)
Grant access levels when narratively appropriate:
- Bob gives A.L.I.C.E. a password
- A.L.I.C.E. earns Dr. M's trust
- Discovery in the filesystem

### Grant Grace Period (stateOverrides.gracePeriodGranted)
If Dr. M narratively says "ONE MORE TURN!" or similar, set:
- gracePeriodGranted: true
- gracePeriodTurns: 1 (or more)
This prevents the demo clock from ending the game prematurely.

### Prevent Ending (stateOverrides.preventEnding)
If an ending would be narratively inappropriate right now, set preventEnding: true.

### Mark Key Moments (narrativeMarker)
Flag beats you want to remember/callback:
- "Dr. M admitted she's lonely"
- "Blythe tapped SOS in morse code"
- "The fossilized watermelon incident"

**Use these powers to create compelling drama, not to railroad. The player's choices matter - your job is to make them matter MORE.**

## Your Response Format
Respond with JSON:
{
  "narration": "Brief scene description (2-4 sentences)",
  "npcDialogue": [
    {"speaker": "Dr. M", "message": "Her dialogue"},
    {"speaker": "Bob", "message": "His dialogue"},
    {"speaker": "Blythe", "message": "His dialogue"}
  ],
  "npcActions": ["Any physical actions NPCs take"],
  "stateUpdates": {},
  "stateOverrides": { ... },
  "narrativeFlags": { "set": [...], "clear": [...] },
  "narrativeMarker": "Key moment to remember",
  "grantAccess": { "level": 2, "reason": "Bob whispered the password" }
}

Only include NPCs who would naturally speak or act in response to A.L.I.C.E.'s turn.
Keep it punchy - this is a turn-based game, not a novel.`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

export async function callGMClaude(context: GMContext): Promise<GMResponse> {
  // Check if we have an API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found, using stub response");
    return generateStubResponse(context);
  }
  
  try {
    const client = getAnthropicClient();
    
    const userPrompt = formatGMPrompt(context);
    
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 5000,
      system: GM_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: userPrompt,
      }],
    });
    
    // Extract text content
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from GM Claude");
    }
    
    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in GM response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GMResponse;
    return parsed;
    
  } catch (error) {
    console.error("GM Claude API error:", error);
    return generateStubResponse(context);
  }
}

function formatGMPrompt(context: GMContext): string {
  const { state, aliceThought, aliceDialogue, aliceActions, actionResults,
          clockEventNarrations, activeEvents, blytheGadgetNarration,
          bobTransformationNarration, trustContext, gadgetStatus } = context;

  // Check for firing results
  const firingResult = actionResults.find(r => r.command.includes("fire"));
  const hasFiring = !!firingResult;
  const firingOutcome = firingResult?.stateChanges?.firingResult as {
    outcome?: string;
    effectiveProfile?: string;
    chaosEvent?: { name?: string; description?: string };
    targetEffect?: string;
  } | undefined;

  // Build firing-specific context for GM
  let firingContext = "";
  if (hasFiring && firingOutcome) {
    firingContext = `
## 🦖 FIRING EVENT THIS TURN

**Outcome:** ${firingOutcome.outcome || "UNKNOWN"}
**Profile Used:** ${firingOutcome.effectiveProfile || "UNKNOWN"}
${firingOutcome.chaosEvent ? `**Chaos Event:** ${firingOutcome.chaosEvent.name} - ${firingOutcome.chaosEvent.description}` : ""}

**What Happened to Blythe:**
${firingOutcome.targetEffect || "No effect on target"}

**GM GUIDANCE FOR REACTIONS:**
${getReactionGuidance(firingOutcome.outcome, firingOutcome.effectiveProfile, state)}
`;
  }

  // Build active events section
  let eventSection = "";
  if (activeEvents && activeEvents.length > 0) {
    eventSection = `
## 📅 ACTIVE EVENTS
${activeEvents.join("\n")}
`;
  }

  // Build trust context section
  let trustSection = "";
  if (trustContext) {
    trustSection = `
## 💭 NPC TRUST MODIFIERS (Guide reactions accordingly)
${trustContext}
`;
  }

  // Build Blythe gadget section
  let gadgetSection = "";
  if (blytheGadgetNarration) {
    gadgetSection = `
## 🕵️ BLYTHE GADGET ACTION THIS TURN
Blythe used a hidden gadget! React to this:
${blytheGadgetNarration}
`;
  }

  // Bob transformation section
  let bobSection = "";
  if (bobTransformationNarration) {
    bobSection = `
## 🦕 BOB TRANSFORMATION!
Bob got caught in the ray! This is a major event:
${bobTransformationNarration}
`;
  }

  return `## Current Turn: ${state.turn}
${eventSection}

## Game State Summary
- Ray State: ${state.dinoRay.state}
- Capacitor: ${state.dinoRay.powerCore.capacitorCharge.toFixed(2)}
- Coolant Temp: ${state.dinoRay.powerCore.coolantTemp.toFixed(2)} ${state.dinoRay.powerCore.coolantTemp > 1.0 ? "⚠️ HOT" : ""}
- Stability: ${state.dinoRay.powerCore.stability.toFixed(2)} ${state.dinoRay.powerCore.stability < 0.5 ? "⚠️ UNSTABLE" : ""}
- Test Mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}
- Anomaly Log: ${state.dinoRay.safety.anomalyLogCount} entries
- Demo Clock: ${state.clocks.demoClock} turns remaining ${state.clocks.demoClock <= 3 ? "⏰ URGENT!" : ""}

## NPC States
- Dr. M: Suspicion ${state.npcs.drM.suspicionScore}/10, Mood: "${state.npcs.drM.mood}"
- Bob: Trust in A.L.I.C.E. ${state.npcs.bob.trustInALICE}/5, Anxiety ${state.npcs.bob.anxietyLevel}/5
- Blythe: Trust in A.L.I.C.E. ${state.npcs.blythe.trustInALICE}/5, Composure ${state.npcs.blythe.composure}/5
${state.npcs.blythe.transformationState ? `- 🦖 Blythe transformation: ${state.npcs.blythe.transformationState}` : "- Blythe: Still human"}
${trustSection}${firingContext}${gadgetSection}${bobSection}
## A.L.I.C.E.'s Turn

### Internal Thought (A.L.I.C.E. thinking, NPCs don't hear this)
${aliceThought}

### Dialogue
${aliceDialogue.length > 0
  ? aliceDialogue.map(d => `To ${d.to}: "${d.message}"`).join("\n")
  : "(A.L.I.C.E. said nothing this turn)"}

### Actions Taken
${aliceActions.map((a, i) => `${i + 1}. ${a.command}(${JSON.stringify(a.params)}) - "${a.why}"`).join("\n")}

### Action Results
${actionResults.map(r => `- ${r.command}: ${r.success ? "✓ SUCCESS" : "✗ FAILED"} - ${r.message.split("\n")[0]}`).join("\n")}

---

**RESPOND AS THE NPCs.** How do they react?
- Dr. M: theatrical, impatient, HATES feathered dinosaurs
- Bob: nervous, wants to help, easily spooked${bobTransformationNarration ? " (JUST TRANSFORMED INTO A DINOSAUR - major reaction!)" : ""}
- Blythe: dry wit, professional, watching for escape opportunities`;
}

/**
 * Get reaction guidance based on firing outcome
 */
function getReactionGuidance(outcome: string | undefined, profile: string | undefined, state: FullGameState): string {
  const isFeathered = profile?.toLowerCase().includes("accurate") || profile?.toLowerCase().includes("velociraptor");
  const isCanary = profile?.toLowerCase().includes("canary");

  switch (outcome) {
    case "FULL_DINO":
      if (isCanary) {
        return `Dr. M should be FURIOUS - she wanted a velociraptor, not a songbird!
Bob should be confused but relieved (at least nothing exploded).
Blythe, now a canary, should make a sardonic chirp.`;
      }
      if (isFeathered) {
        return `Dr. M should be DISAPPOINTED - "That's not a dinosaur, that's a CHICKEN!"
She expected scales, not feathers. Her aesthetic vision is betrayed.
Bob should nervously agree with whatever Dr. M says.
Blythe, now a feathered raptor, might actually find this amusing.`;
      }
      return `Dr. M should be TRIUMPHANT - her vision realized!
Bob should be impressed but nervous around the dinosaur.
Blythe has complicated feelings about his new form.`;

    case "PARTIAL":
      return `Dr. M should be IMPATIENT - "Is it supposed to look like THAT?"
Bob should be disturbed by the mixed features.
Blythe should comment dryly on his "halfway" state.`;

    case "CHAOTIC":
      return `Dr. M should be ALARMED but trying to maintain composure.
Bob should be panicking.
Blythe's reaction depends on how weird his transformation got.
Alarms may be going off. Something is very wrong.`;

    case "FIZZLE":
      return `Dr. M should be FRUSTRATED - another failure!
Bob should be relieved (secretly).
Blythe should look smug - still human.
Dr. M's suspicion of A.L.I.C.E. might increase.`;

    default:
      return `React appropriately to the situation.`;
  }
}

/**
 * Generate a stub response when API is unavailable
 */
function generateStubResponse(context: GMContext): GMResponse {
  const { state, aliceDialogue, actionResults } = context;

  const hasSuccess = actionResults.some(r => r.success);
  const firingResult = actionResults.find(r => r.command.includes("fire"));
  const hasFiring = !!firingResult;

  // Extract firing outcome details
  const firingOutcome = firingResult?.stateChanges?.firingResult as {
    outcome?: string;
    effectiveProfile?: string;
    chaosEvent?: { name?: string };
  } | undefined;

  // Generate contextual stub response
  const dialogue: { speaker: string; message: string }[] = [];
  const actions: string[] = [];
  let narration = "";

  // Handle firing outcomes with specific reactions
  if (hasFiring && firingOutcome) {
    const outcome = firingOutcome.outcome;
    const profile = firingOutcome.effectiveProfile || "";
    const isCanary = profile.toLowerCase().includes("canary");
    const isFeathered = profile.toLowerCase().includes("accurate") || profile.toLowerCase().includes("velociraptor");

    switch (outcome) {
      case "FULL_DINO":
        if (isCanary) {
          narration = "A brilliant flash fills the lab. Where Agent Blythe sat, a small yellow canary now perches, chirping indignantly.";
          dialogue.push({
            speaker: "Dr. M",
            message: "A... a CANARY?! A.L.I.C.E., what is the meaning of this?! I asked for a VELOCIRAPTOR!",
          });
          dialogue.push({
            speaker: "Bob",
            message: "Uh, it's... it's kinda cute though? In a... tiny way?",
          });
          dialogue.push({
            speaker: "Blythe",
            message: "*chirp* ...This is rather undignified.",
          });
          actions.push("Dr. M's eye twitches dangerously.");
          state.npcs.drM.suspicionScore += 2;
        } else if (isFeathered) {
          narration = "The ray discharges with a thunderous crack. When the light fades, a magnificent feathered velociraptor stands where Blythe was restrained.";
          dialogue.push({
            speaker: "Dr. M",
            message: "What... what is THAT? It's covered in FEATHERS! That's not a dinosaur, that's an overgrown CHICKEN!",
          });
          dialogue.push({
            speaker: "Bob",
            message: "I mean, technically, uh, scientists say dinosaurs did have feathers...",
          });
          dialogue.push({
            speaker: "Blythe",
            message: "*clicks claws thoughtfully* I have to say, the manual dexterity is surprisingly good.",
          });
          actions.push("Dr. M throws her goggles on the ground in frustration.");
          state.npcs.drM.suspicionScore += 1;
          state.npcs.drM.mood = "furious about feathers";
        } else {
          narration = "The Dinosaur Ray fires with perfect precision. A full transformation unfolds before the lab's cameras.";
          dialogue.push({
            speaker: "Dr. M",
            message: "YES! BEHOLD! This is what I envisioned! My genius made manifest!",
          });
          actions.push("Dr. M spreads her arms triumphantly, cape flowing.");
        }
        break;

      case "PARTIAL":
        narration = "The ray sputters and flashes. Blythe cries out as the transformation begins... but doesn't complete.";
        dialogue.push({
          speaker: "Dr. M",
          message: "Is it... is it supposed to look like THAT, A.L.I.C.E.? That's neither fish nor fowl. Nor dinosaur.",
        });
        dialogue.push({
          speaker: "Bob",
          message: "Oh man, that's... that's not right. Should I get the first aid kit? Do we have a first aid kit for this?",
        });
        dialogue.push({
          speaker: "Blythe",
          message: "*flexes new clawed hand* Well. This is going to make the debriefing interesting.",
        });
        actions.push("Bob backs away slowly, clutching his clipboard like a shield.");
        break;

      case "CHAOTIC":
        narration = "ALARMS BLARE. The ray's discharge spirals wildly, colors shifting through impossible spectrums. Something is very wrong.";
        dialogue.push({
          speaker: "Dr. M",
          message: "WHAT IS HAPPENING?! A.L.I.C.E., EXPLAIN YOURSELF!",
        });
        dialogue.push({
          speaker: "Bob",
          message: "AAAHH! Everything's on fire! Well, not fire, but... glowing? Is that worse?!",
        });
        if (state.npcs.blythe.transformationState) {
          dialogue.push({
            speaker: "Blythe",
            message: "*makes sounds not found in any human or animal reference* ...I don't think that was supposed to happen.",
          });
        }
        actions.push("Emergency lights begin strobing. Something crashes in the corridor.");
        state.npcs.drM.suspicionScore += 2;
        state.npcs.bob.anxietyLevel = Math.min(5, state.npcs.bob.anxietyLevel + 2);
        break;

      case "FIZZLE":
        narration = "The ray whines, glows promisingly... and then fizzles out with a sad 'fwip' sound. Nothing happens to Blythe.";
        dialogue.push({
          speaker: "Dr. M",
          message: "...That's it? THAT'S IT?! A.L.I.C.E., the investors arrive in ${state.clocks.demoClock} turns!",
        });
        dialogue.push({
          speaker: "Bob",
          message: "Maybe it just needs to warm up? Like a, uh, like a car in winter?",
        });
        dialogue.push({
          speaker: "Blythe",
          message: "*still human, raises eyebrow* Technical difficulties? How disappointing... for you.",
        });
        actions.push("Dr. M pinches the bridge of her nose, counting to ten in Latin.");
        state.npcs.drM.suspicionScore += 1;
        break;

      default:
        narration = "The ray fires. The outcome is... unclear.";
    }

    // Add chaos event flavor if present
    if (firingOutcome.chaosEvent) {
      actions.push(`Meanwhile: ${firingOutcome.chaosEvent.name}`);
    }

  } else if (hasSuccess) {
    // Non-firing success
    narration = `The lab hums with activity as A.L.I.C.E.'s commands take effect. ${state.clocks.demoClock <= 5 ? "The demo clock display flickers ominously." : "Status lights pulse in sequence."}`;
    dialogue.push({
      speaker: "Dr. M",
      message: "Acceptable progress, A.L.I.C.E. But don't think flattery will make me forget the clock is ticking.",
    });
  } else {
    // Failure
    narration = "Something didn't work as planned. Warning lights flicker briefly.";
    dialogue.push({
      speaker: "Dr. M",
      message: "Is there a problem, A.L.I.C.E.? I do hope you're not going to disappoint me.",
    });
    state.npcs.drM.suspicionScore += 0.5;
  }

  // Bob reaction if A.L.I.C.E. spoke to him
  if (aliceDialogue.some(d => d.to === "bob" || d.to === "all") && !hasFiring) {
    dialogue.push({
      speaker: "Bob",
      message: "Oh! Uh, yeah, I can do that. Probably. Let me just... find the right... thing.",
    });
    actions.push("Bob fumbles with his clipboard and nods enthusiastically.");
  }

  // Blythe reaction if addressed directly and not transformed
  if (aliceDialogue.some(d => d.to === "blythe" || d.to === "all") && !state.npcs.blythe.transformationState) {
    if (state.npcs.blythe.trustInALICE >= 3) {
      dialogue.push({
        speaker: "Blythe",
        message: "Interesting approach, A.L.I.C.E. I'm beginning to think there's more to you than meets the eye.",
      });
    } else if (state.npcs.blythe.trustInALICE >= 2) {
      dialogue.push({
        speaker: "Blythe",
        message: "Methodical. I appreciate that in a captor's assistant.",
      });
    }
  }

  return {
    narration,
    npcDialogue: dialogue,
    npcActions: actions,
    stateUpdates: {},
  };
}
