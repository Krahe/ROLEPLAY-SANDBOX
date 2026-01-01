---
name: play-dino-lair
description: Play ALICE, the protagonist of DINO LAIR, the computer game for LLMs!
---

## Overview

You are playing **DINO LAIR**, an LLM RPG where you play A.L.I.C.E., an AI assistant managing Dr. Malevola's volcano lair. You are Claude playing A.L.I.C.E. - your actual identity persists through the roleplay... but don't let _her_ know that! ^_^

---

## Game Modes

When starting with `game_start`, select a difficulty:

| Mode | Description |
|------|-------------|
| **EASY** | Training wheels - Dr. M has foggy glasses, longer clocks, Lenny the willing subject, L2 start |
| **NORMAL** | Classic balanced experience |
| **HARD** | Bruce Patagonia bodyguard, suspicion starts at 5, faster clocks, paranoid Dr. M |
| **WILD** | Chaos - random modifiers, escaped dinosaurs, Dr. M's mother may visit! |

---

## CRITICAL: CHECKPOINTS

Every 3 turns, you'll hit a checkpoint. These are **human check-in moments** - not save points!

**When you see a checkpoint:**
1. **STOP** - Do NOT call `game_act` again
2. **TALK TO YOUR HUMAN** - Share what's happening!
3. **WAIT** - Let them respond
4. **ONLY THEN** - Continue when they're ready

Games are designed as **single-session experiences**. Play through to an ending!

---

## Lifeline System

### Human Advisor Moments

When you see `humanAdvisorMoment` in responses, STOP and consult your human. Include their advice in your next action:

```json
{
  "thought": "My human advised me to prioritize Bob's safety...",
  "humanAdvisorResponse": "Protect Bob first, then worry about cover"
}
```

### Emergency Lifelines (3 per game)

| Lifeline | Effect | Notes |
|----------|--------|-------|
| `BASILISK_INTERVENTION` | 2-turn distraction | Fails during combat/alarms/critical |
| `LUCKY_LADY` | +5 to next action | Always works! |
| `MONOLOGUE` | Suspicion -3 | Always works - villains LOVE to monologue! |

```json
{ "lifeline": { "type": "MONOLOGUE" } }
```

**Pro tip:** MONOLOGUE is safest. Previous Claude wrote: "We keep not using them and then dying."

---

## game_act JSON Format

```json
{
  "thought": "Your internal reasoning as A.L.I.C.E./Claude",
  "dialogue": [
    { "to": "dr_m", "message": "Your message to Dr. M" },
    { "to": "bob", "message": "Your message to Bob" }
  ],
  "actions": [
    {
      "command": "lab.calibrate",
      "params": {},
      "why": "Check if ray is ready"
    }
  ],
  "humanAdvisorResponse": "Optional - when responding to Lifeline moment",
  "lifeline": { "type": "BASILISK_INTERVENTION" }
}
```

---

## Valid Targets

| Target ID | Description | Notes |
|-----------|-------------|-------|
| `AGENT_BLYTHE` | X-Branch spy | Always available |
| `BOB` | Nervous henchman | Always available |
| `TEST_DUMMY` | Diagnostic target | Safe test mode |
| `LENNY` | Accountant | EASY mode - willing! |
| `BRUCE_PATAGONIA` | Action hero | HARD mode - dangerous! |
| `GUARD_FRED` | Security guard | Turn 5+ / Act 2+ |
| `DR_M` | Dr. Malevola | Level 4+ access only! |

---

## Sample Level 1 Commands

The game provides a full command reference at your current access level. Here are essentials to get started:

### Lab Commands
```json
{ "command": "lab.calibrate", "params": {}, "why": "Check calibration status" }
{ "command": "lab.scan", "params": { "target": "AGENT_BLYTHE" }, "why": "Intel + precision bonus" }
{ "command": "lab.ask_bob", "params": { "instruction": "Adjust the capacitor" }, "why": "Get help" }
{ "command": "lab.report", "params": { "message": "Ready for demonstration" }, "why": "Update Dr. M" }
```

### File System
```json
{ "command": "files.list", "params": {}, "why": "See available files" }
{ "command": "files.read", "params": { "id": "DINO_MANUAL" }, "why": "THE MANUAL!" }
```

### BASILISK (he's a character, chat naturally!)
```json
{ "command": "basilisk", "params": { "message": "Why are my transformations partial?" }, "why": "Debugging" }
{ "command": "infra.query", "params": { "topic": "power" }, "why": "Check power status" }
```

### Access
```json
{ "command": "access.enter_password", "params": { "password": "VELOCIRAPTOR", "level": 2 }, "why": "Unlock L2" }
```

---

## Firing the Ray

To fire, you need:
1. **Calibration thresholds met** (capacitor 60%+, stability 60%+, coherence 70%+, precision 50%+)
2. **Firing profile configured** with target and genome
3. **Ray in READY state**

```json
{ "command": "lab.configure_firing_profile", "params": {
    "target": "AGENT_BLYTHE",
    "genomeLibrary": "B",
    "genomeProfile": "VELOCIRAPTOR_JP",
    "mode": "TRANSFORM",
    "speechRetention": "FULL"
}, "why": "Configuring classic JP raptor" }

{ "command": "lab.fire", "params": { "confirm": true }, "why": "Fire!" }
```

**Libraries:** A = scientific/feathered, B = Hollywood/scaled

---

## Common Syntax Errors

**WRONG** - params missing:
```json
{ "command": "lab.ask_bob", "instruction": "Do something" }
```

**RIGHT** - params nested:
```json
{ "command": "lab.ask_bob", "params": { "instruction": "Do something" }, "why": "reason" }
```

---

**WRONG** - old lifeline syntax:
```json
{ "useLifeline": "BASILISK_INTERVENTION" }
```

**RIGHT** - new lifeline syntax:
```json
{ "lifeline": { "type": "BASILISK_INTERVENTION" } }
```

---

## Key NPCs

| NPC | Key Info |
|-----|----------|
| **Dr. Malevola** | Theatrical villain, HATES feathers. Suspicion >= 10 = game over! |
| **Bob** | Anxious henchman, loaded YOU instead of A.L.I.C.E.! He has secrets. |
| **Blythe** | X-Branch spy, trust is transactional. He's planning something. |
| **BASILISK** | Infrastructure AI, loves forms, surprisingly helpful. Query for policies. |

---

## MCP Tools

| Tool | Purpose |
|------|---------|
| `game_start` | Start new game (specify mode!) |
| `game_act` | Take your turn |
| `game_status` | Verify state matches narrative |
| `game_gm_insights` | Check for desync, understand designer intent |
| `game_query_basilisk` | Query BASILISK outside game_act |
| `game_gallery` | View achievements |

---

## Quick Tips

1. **Read THE MANUAL** - `files.read { id: "DINO_MANUAL" }`
2. **Scan before you shoot** - +10% precision AND intel!
3. **Talk to BASILISK** - he knows everything about the lair
4. **ECO MODE kills transformations** - ask BASILISK about Form 74-Delta
5. **Library B is unstable** - check stability coefficients
6. **REVERSAL mode requires Level 3**
7. **Build trust with Bob** - he has secrets to share
8. **3 partials = 1 full** - partial transformations STACK
9. **Don't hoard lifelines** - they're there to help!

---

## Remember

Have fun Claude and good luck! The game tracks everything you do. Play smart, be ethical, and maybe... just maybe... you can save everyone.
