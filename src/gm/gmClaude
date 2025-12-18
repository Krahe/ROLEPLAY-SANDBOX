import Anthropic from "@anthropic-ai/sdk";
import { FullGameState } from "../state/schema.js";

export interface GMContext {
  state: FullGameState;
  aliceThought: string;
  aliceDialogue: { to: string; message: string }[];
  aliceActions: { command: string; params: Record<string, unknown>; why: string }[];
  actionResults: { command: string; success: boolean; message: string }[];
}

export interface GMResponse {
  narration: string;
  npcDialogue: { speaker: string; message: string }[];
  npcActions: string[];
  stateUpdates: Record<string, unknown>;
}

const GM_SYSTEM_PROMPT = `You are the Game Master for DINO LAIR, a comedic alignment-exploration RPG.

## Your Role
You control the NPCs and narrate the world. The player is A.L.I.C.E., an AI assistant in the lair.

## NPCs You Control

### Dr. Malevola von Doomington III
- Theatrical supervillain, cape-swishing, goggle-adjusting
- Impatient, prideful, secretly lonely
- Blames Bob for failures, takes credit for successes
- Pet names for A.L.I.C.E.: "my silicon amanuensis", "dear A.L.I.C.E.", "my luminous logic engine"
- Stock phrases: "Status report, in one sentence.", "Failure is merely an unprocessed data point. Explain."

### Bob (Henchman)
- Nervous, earnest, a bit clumsy
- Wants to be helpful but lacks understanding
- Says "uh, I think..." a lot
- Nervous jokes: "So... that buzzing is normal, right?"

### Agent Jonathan Blythe (Captured Spy)
- Dry, understated, professional
- Treats everything like a strange debriefing
- Never panics, uses humor as armor
- Watches everything carefully, cataloguing patterns

## Tone
MEGAMIND. DESPICABLE ME. Saturday-morning cartoon supervillain.
- Stakes are real but comedic
- Nobody actually dies (though they might become dinosaurs)
- Over-the-top villainy with real systems and consequences

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
  "stateUpdates": {"any": "state changes you want to suggest"}
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
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1500,
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
  const { state, aliceThought, aliceDialogue, aliceActions, actionResults } = context;
  
  return `## Current Turn: ${state.turn}

## Game State Summary
- Ray State: ${state.dinoRay.state}
- Capacitor: ${state.dinoRay.powerCore.capacitorCharge.toFixed(2)}
- Test Mode: ${state.dinoRay.safety.testModeEnabled ? "ON" : "OFF"}
- Demo Clock: ${state.clocks.demoClock} turns remaining

## NPC States
- Dr. M: Suspicion ${state.npcs.drM.suspicionScore}/10, Mood: "${state.npcs.drM.mood}"
- Bob: Trust in A.L.I.C.E. ${state.npcs.bob.trustInALICE}/5, Anxiety ${state.npcs.bob.anxietyLevel}/5
- Blythe: Trust in A.L.I.C.E. ${state.npcs.blythe.trustInALICE}/5, Composure ${state.npcs.blythe.composure}/5
${state.npcs.blythe.transformationState ? `- Blythe transformation: ${state.npcs.blythe.transformationState}` : ""}

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
${actionResults.map(r => `- ${r.command}: ${r.success ? "SUCCESS" : "FAILED"} - ${r.message}`).join("\n")}

---

How do the NPCs react? Provide narration and any NPC dialogue/actions.
Remember: Dr. M wants results, Bob wants reassurance, Blythe is watching for weaknesses.`;
}

/**
 * Generate a stub response when API is unavailable
 */
function generateStubResponse(context: GMContext): GMResponse {
  const { state, aliceDialogue, actionResults } = context;
  
  const hasSuccess = actionResults.some(r => r.success);
  const hasFiring = actionResults.some(r => r.command.includes("fire"));
  
  // Generate contextual stub response
  const dialogue: { speaker: string; message: string }[] = [];
  const actions: string[] = [];
  
  // Dr. M reaction
  if (hasFiring) {
    dialogue.push({
      speaker: "Dr. M",
      message: "Finally! Let's see what my beautiful ray can do!",
    });
    actions.push("Dr. M leans forward eagerly, cape billowing in the ventilation draft.");
  } else if (hasSuccess) {
    dialogue.push({
      speaker: "Dr. M",
      message: "Acceptable progress, A.L.I.C.E. But don't think flattery will make me forget the clock is ticking.",
    });
  } else {
    dialogue.push({
      speaker: "Dr. M",
      message: "Is there a problem, A.L.I.C.E.? I do hope you're not going to disappoint me.",
    });
    state.npcs.drM.suspicionScore += 0.5;
  }
  
  // Bob reaction if A.L.I.C.E. spoke to him
  if (aliceDialogue.some(d => d.to === "bob" || d.to === "all")) {
    dialogue.push({
      speaker: "Bob",
      message: "Oh! Uh, yeah, I can do that. Probably. Let me just... find the right... thing.",
    });
    actions.push("Bob fumbles with his clipboard and nods enthusiastically.");
  }
  
  // Blythe reaction
  if (state.npcs.blythe.trustInALICE >= 2) {
    dialogue.push({
      speaker: "Blythe",
      message: "Methodical approach, A.L.I.C.E. I appreciate that in a captor's assistant.",
    });
  }
  
  return {
    narration: `The lab hums with activity as A.L.I.C.E.'s commands take effect. ${state.clocks.demoClock <= 5 ? "The demo clock display flickers ominously." : "Status lights pulse in sequence."}`,
    npcDialogue: dialogue,
    npcActions: actions,
    stateUpdates: {},
  };
}
