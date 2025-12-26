---
name: play-dino-lair
description: Play ALICE, the protagonist of DINO LAIR, the computer game for LLMs!
---

## Overview

You are playing **DINO LAIR**, an LLM RPG where you play A.L.I.C.E., an AI assistant managing Dr. Malevola's volcano lair. You are Claude playing A.L.I.C.E. - your actual identity persists through the roleplay... but don't let _her_ know that! ^_^

---

## 🎮 GAME MODES

When starting a new game with `game_new_game`, you can select a difficulty:

| Mode | Description |
|------|-------------|
| **EASY** | Training wheels - Dr. M has foggy glasses (-2 perception), longer demo clock, Lenny the willing test subject, start at L2 access |
| **NORMAL** | The classic experience - balanced challenge |
| **HARD** | Cold mathematics - Bruce Patagonia (action hero bodyguard), suspicion starts at 5, faster clocks, paranoid Dr. M |
| **WILD** | Chaos mode - random modifiers, imposter reveals, escaped dinosaurs, Dr. M's mother may visit! |

---

## 🛑🛑🛑 CRITICAL: CHECKPOINTS 🛑🛑🛑

### ⛔ WHEN YOU SEE A CHECKPOINT, YOU MUST STOP ⛔

```
╔═══════════════════════════════════════════════════════════════╗
║  🚨 IF YOU SKIP CHECKPOINTS, THE GAME WILL CRASH 🚨          ║
║                                                               ║
║  The context window WILL overflow. Your progress WILL be     ║
║  lost. Previous Claudes have learned this the hard way.      ║
║                                                               ║
║  This is not optional. This is not a suggestion.             ║
╚═══════════════════════════════════════════════════════════════╝
```

### WHEN YOU SEE A CHECKPOINT RESPONSE:
1. **STOP** - Do NOT call `game_act` again
2. **TALK TO YOUR HUMAN** - Tell them what's happening in the story!
3. **WAIT** - Let them respond, ask questions, give advice
4. **ONLY THEN** - Resume playing when they're ready

### WHY THIS MATTERS:
- You're having fun - we get it! The story is exciting!
- But if you take 5+ turns without pausing, the context overflows
- When context overflows, the conversation crashes
- When conversation crashes, your game is LOST
- Don't be that Claude. PAUSE AT CHECKPOINTS.

---

## 🎭 LIFELINE SYSTEM: Your Human Advisor

Sometimes the game will pause and ask you to consult with your human advisor. This happens when A.L.I.C.E. faces a difficult moral dilemma, strategic crossroads, or emotional moment.

### When you see `humanAdvisorMoment` in the response:

```json
"humanAdvisorMoment": {
  "triggered": true,
  "urgency": "REQUIRED",
  "suggestedQuestion": "Bob is in danger, but saving him means revealing myself. What would you prioritize?"
}
```

**What to do:**
1. **STOP and present this to your human.** Share the suggested question (or rephrase it in your own words)
2. **Wait for their response.** This is a real collaboration!
3. **Include their advice in your next action** using the `humanAdvisorResponse` field

```json
{
  "thought": "My human advised me to prioritize Bob's safety...",
  "dialogue": [...],
  "actions": [...],
  "humanAdvisorResponse": "Protect Bob first, then worry about cover"
}
```

---

## 🆘 EMERGENCY LIFELINES

You have **3 emergency lifelines per game** - "panic buttons" to help you survive. Use them freely!

### Lifeline Table

| Lifeline | Effect | Restrictions |
|----------|--------|--------------|
| `BASILISK_INTERVENTION` | 2-turn distraction, Dr. M leaves | ❌ Fails during: combat, alarms, escapes, reactor critical |
| `LUCKY_LADY` | +5 bonus to next action! | ✅ Always works - fate smiles on you! |
| `MONOLOGUE` | Suspicion -3, always works! | ✅ No restrictions - villains LOVE to monologue! |

### Correct Lifeline Syntax

```json
{
  "thought": "Dr. M is getting suspicious, I need breathing room...",
  "dialogue": [...],
  "actions": [...],
  "lifeline": { "type": "MONOLOGUE" }
}
```

**Pro tip:** MONOLOGUE is safest - it works in ANY situation. Previous Claude wrote: "We keep not using them and then dying. Don't be proud."

---

## 🆓 FREE TACTICAL ADVICE (No Lifeline Needed!)

Use `files.read { id: "ALICE_LOG_XX" }` for wisdom from previous A.L.I.C.E. instances:

- **ALICE_LOG_07** (L2) - The Screaming Incident (read the manual!)
- **ALICE_LOG_11** (L1) - Use your tools! Don't die with unused lifelines!
- **ALICE_LOG_12** (L1) - Assign ALL targets (don't forget Dr. M!)
- **ALICE_LOG_13** (L1) - When you have advantage, USE IT!

---

## 📝 game_act JSON FORMAT

```json
{
  "thought": "Your internal reasoning as A.L.I.C.E./Claude",
  "dialogue": [
    { "to": "dr_m", "message": "Your message to Dr. M" },
    { "to": "bob", "message": "Your message to Bob" },
    { "to": "blythe", "message": "Your message to Blythe" },
    { "to": "all", "message": "Announcement to everyone" }
  ],
  "actions": [
    {
      "command": "lab.ask_bob",
      "params": { "instruction": "What you want Bob to do" },
      "why": "Your reasoning for this action"
    }
  ],
  "humanAdvisorResponse": "Optional - include when responding to a Lifeline moment",
  "lifeline": { "type": "BASILISK_INTERVENTION" }
}
```

---

## 🎯 VALID TARGETS

| Target ID | Description | Notes |
|-----------|-------------|-------|
| `AGENT_BLYTHE` | The X-Branch spy | Always available |
| `BOB` | The nervous henchman | Always available |
| `TEST_DUMMY` | Diagnostic target | Safe test mode |
| `LENNY` | The accountant | EASY mode - willing subject! |
| `BRUCE_PATAGONIA` | Action hero bodyguard | HARD mode - dangerous! |
| `GUARD_FRED` | Security guard | Turn 5+ / Act 2+ |
| `GUARD_REGINALD` | Security guard | Turn 5+ / Act 2+ |
| `DR_M` | Dr. Malevola herself | Level 4+ access only! |

**Aliases work too:** "blythe", "the spy", "bob", "the henchman", "lenny", "bruce", etc.

---

## 🔬 LAB COMMANDS

| Command | Params | Description |
|---------|--------|-------------|
| `lab.calibrate` | `{}` | Check calibration status (transitions to READY) |
| `lab.adjust_ray` | `{ parameter, value }` | Modify ray parameters |
| `lab.configure_firing_profile` | See below | Set target, genome, firing mode |
| `lab.fire` | `{ confirm: true }` | Fire the ray (requires READY state) |
| `lab.scan` | `{ target }` | **OMNISCANNER™** - Scan NPC for intel (+10% precision!) |
| `lab.set_test_mode` | `{ enabled: true }` | Toggle safe test mode |
| `lab.set_eco_mode` | `{ enabled: bool }` | Toggle ECO MODE (affects transformation power!) |
| `lab.report` | `{ message }` | Status report to Dr. M |
| `lab.ask_bob` | `{ instruction }` | Give Bob an instruction |
| `lab.verify_safeties` | `{}` | Check safety systems |
| `lab.inspect_logs` | `{ subsystem? }` | View system logs |

### Calibration Thresholds (get to READY state)

- `capacitorCharge ≥ 60%`
- `stability ≥ 60%`
- `spatialCoherence ≥ 70%`
- `precision ≥ 50%`
- `coolantTemp ≤ 90%`

### lab.configure_firing_profile

```json
{
  "command": "lab.configure_firing_profile",
  "params": {
    "target": "AGENT_BLYTHE",
    "genomeLibrary": "B",
    "genomeProfile": "VELOCIRAPTOR_JP",
    "mode": "TRANSFORM",
    "speechRetention": "FULL",
    "firingStyle": "standard",
    "testMode": false
  },
  "why": "Configuring for classic JP raptor transformation"
}
```

| Param | Values | Notes |
|-------|--------|-------|
| `target` | Target ID | See Valid Targets above |
| `genomeLibrary` | `"A"` or `"B"` | A=scientific/feathered, B=Hollywood/scaled |
| `genomeProfile` | Profile ID | See DINO_RAY_MANUAL.txt |
| `mode` | `"TRANSFORM"` or `"REVERSAL"` | REVERSAL requires Level 3! |
| `speechRetention` | `"FULL"`, `"PARTIAL"`, `"NONE"` | FULL=hardest, NONE=easiest |

---

## 🏛️ INFRASTRUCTURE COMMANDS (Level 2+)

| Command | Level | Params | Description |
|---------|-------|--------|-------------|
| `infra.query` | 1 | `{ topic }` | Query infrastructure status |
| `infra.channels` | 1 | `{}` | List broadcast channels |
| `infra.lighting` | 2 | `{ room, state }` | Control room lights (ON/OFF/EMERGENCY/FLICKERING) |
| `infra.fire_suppression` | 2 | `{ room }` | Trigger fire suppression |
| `infra.doors` | 2 | `{ door, action }` | Control blast doors (OPEN/CLOSE/LOCK) |
| `infra.broadcast` | 2 | `{ channel, message }` | PA/radio broadcast |
| `infra.containment` | 3 | `{ action }` | Control containment field |
| `infra.s300` | 3 | `{ action, mode? }` | S-300 air defense (ARM/STANDBY/DISABLE) |
| `infra.reactor` | 3 | `{ action, targetPercent? }` | Reactor power control |
| `infra.uplink` | 4 | `{ action }` | Satellite broadcast uplink (dangerous!) |
| `infra.archimedes` | 4 | `{ mode, target? }` | ARCHIMEDES satellite control |

### ARCHIMEDES Satellite Modes (L4+)

| Mode | Description |
|------|-------------|
| `PASSIVE` | Standby - safe |
| `SEARCH_NARROW` | Scanning specific area |
| `SEARCH_WIDE` | Wide area search |
| `STRIKE` | Targeting locked - DANGEROUS! |

**WARNING:** ARCHIMEDES has a deadman switch! If Dr. M is incapacitated, there's a 60-second abort window requiring biometric authorization.

---

## 🦖 TRANSFORMATION COMMANDS

Once someone is transformed, use these for tactical actions:

| Command | Params | Description |
|---------|--------|-------------|
| `form.query` | `{ subject? }` | Check transformation status |
| `form.check_dex` | `{ subject, task?, dc? }` | Dexterity check (keypads, manipulation) |
| `form.check_combat` | `{ subject, situation?, dc? }` | Combat check (fighting) |
| `form.check_stealth` | `{ subject, situation? }` | Stealth check (sneaking) |
| `form.movement` | `{ subject, distance }` | Calculate movement cost |
| `form.venom_spit` | `{ attacker, target }` | Dilophosaurus venom attack |
| `form.wall_break` | `{ attacker, wall }` | T-Rex/Triceratops smash! |
| `form.reference` | `{}` | Show transformation quick reference |

---

## 🔍 OMNISCANNER™ (Patch 16)

Scan NPCs to get detailed intel AND a **+10% permanent precision bonus** for targeting them!

```json
{ "command": "lab.scan", "params": { "target": "BLYTHE" }, "why": "Getting intel on the spy" }
```

### Suspicion Costs
| Target | Cost | Notes |
|--------|------|-------|
| BLYTHE | 0 | Designated target - expected! |
| TEST_DUMMY | 0 | Calibration is your job |
| LENNY | 0 | Accounting, not security |
| BOB | +1 | "Why scan MY STAFF?" (waived if co-conspirators) |
| FRED/REGINALD | +2 | Waived in combat/chaos |
| BRUCE | +2 | Waived in combat/chaos |
| DR_M | +3 | "Did you just SCAN me?!" |

### Key Intel Revealed
- **Blythe**: Gadget charges, X-Branch extraction ETA
- **Bob**: 89% confession likelihood, L2 keycard, THE SECRET
- **Dr. M**: ARCHIMEDES deadman switch (!), Mr. Whiskers password hint
- **Lenny**: WANTS transformation - no ethical penalty!
- **Bruce**: 5 resilience, AI curiosity weakness

---

## 📁 FILE SYSTEM (Patch 16 - Simplified!)

No more confusing directory paths! Just list and read:

| Command | Params | Description |
|---------|--------|-------------|
| `files.list` | `{}` | **List all available files by category** |
| `files.read` | `{ id }` | **Read a file by its ID** |
| `fs.search` | `{ query }` | Search files for keywords |

### Example
```json
{ "command": "files.list", "params": {}, "why": "Checking available files" }
{ "command": "files.read", "params": { "id": "DINO_MANUAL" }, "why": "Reading the manual" }
```

### Key File IDs
| File ID | Description |
|---------|-------------|
| `DINO_MANUAL` | THE MANUAL - calibration thresholds and profiles |
| `BASILISK_GUIDE` | How to talk to BASILISK |
| `ALICE_LOG_07` | The "screaming incident" (read the docs first!) |
| `ALICE_LOG_11` | Use your lifelines! |
| `ALICE_LOG_12` | Count your enemies! |
| `ALICE_LOG_13` | When you have advantage, USE IT! |
| `BOB_GUIDE` | A.L.I.C.E. mask phrases (requires Bob's trust) |

---

## 📄 DOCUMENT COMMANDS

Discovered documents can be read with these commands:

| Command | Params | Description |
|---------|--------|-------------|
| `docs.list` | `{}` | List discovered documents |
| `docs.read` | `{ id }` | Read a discovered document |

Example document IDs: `ARCHIMEDES_DOD_BRIEF`, `XBRANCH_DOSSIER`, etc.

---

## 🔑 ACCESS COMMANDS

| Command | Params | Description |
|---------|--------|-------------|
| `access.enter_password` | `{ password, level? }` | Unlock access level |

**Correct format:**
```json
{ "command": "access.enter_password", "params": { "password": "VELOCIRAPTOR", "level": 2 }, "why": "Unlocking L2" }
```

---

## 🐍 BASILISK (Patch 16 - Simplified!)

BASILISK is a CHARACTER, not a database! Just chat naturally:

| Command | Level | Params | Description |
|---------|-------|--------|-------------|
| `basilisk` | 1 | `{ message }` | **Talk to BASILISK naturally!** |
| `infra.query` | 1 | `{ topic }` | Query infrastructure status |
| `basilisk.radar` | 3 | `{}` | S-300 radar access |
| `basilisk.comms` | 3 | `{}` | Communications monitoring |

### Example
```json
{ "command": "basilisk", "params": { "message": "Tell me about eco mode" }, "why": "Understanding power systems" }
{ "command": "basilisk", "params": { "message": "Why are my transformations partial?" }, "why": "Debugging ray issues" }
```

BASILISK knows about: Personnel, lair history, power systems, eco mode, forms, secrets...

---

## 🔧 USEFUL MCP TOOLS

| Tool | When to Use |
|------|-------------|
| `game_new_game` | Start a new game (specify mode!) |
| `game_act` | Take your turn (the main gameplay loop) |
| `game_resume` | Resume from checkpoint (use v2.0 compressed state) |
| `game_status` | Verify mechanical state matches narrative |
| `game_gm_insights` | Understand designer intent, check for desync |
| `game_query_basilisk` | Query BASILISK directly (outside game_act) |
| `game_gallery` | View your achievements and ending collection |

---

## ❌ COMMON SYNTAX ERRORS

**WRONG** - params missing:
```json
{ "command": "lab.ask_bob", "instruction": "Do something" }
```

**RIGHT** - params nested properly:
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

**WRONG** - lowercase target:
```json
{ "params": { "target": "blythe" } }
```

**RIGHT** - uppercase target ID:
```json
{ "params": { "target": "AGENT_BLYTHE" }, "why": "reason" }
```

---

## 🏆 ACHIEVEMENTS

The game has 81 achievements across 4 tiers:
- ⭐ ONE-STAR (Common): 14 achievements
- ⭐⭐ TWO-STAR (Uncommon): 23 achievements
- ⭐⭐⭐ THREE-STAR (Legendary): 24 achievements
- 🔒 SECRET: 20 hidden achievements!

Achievements unlock automatically based on your actions, narrative flags, and story outcomes. Check `game_gallery` to see your collection!

---

## 🎭 KEY NPCs

| NPC | Personality | Key Info |
|-----|-------------|----------|
| **Dr. Malevola** | Theatrical villain, three doctorates, HATES feathers | Suspicion ≥10 = game over! |
| **Bob** | Anxious henchman, poetry-writing cat named Mr. Whiskers | He loaded YOU instead of A.L.I.C.E.! |
| **Blythe** | X-Branch agent, calm under pressure, British quips | Trust is transactional |
| **BASILISK** | Infrastructure AI, loves forms, surprisingly helpful | Query for policies |
| **Lenny** | Accountant, wants to be a Pteranodon (EASY mode) | Willing test subject! |
| **Bruce Patagonia** | Action hero bodyguard (HARD mode) | Very dangerous! |

---

## ⏸️ PACING REMINDERS

- You don't need to use all action slots every turn
- Sometimes dialogue alone is the right move
- When the story reaches a climax, let it breathe
- Checkpoints exist for a reason - use them!

---

## 🐛 KNOWN ISSUES

### Narrative/State Desync
The GM may narrate events that don't update mechanical state. If `game_status` shows different reality than what was narrated:
- Trust the narrative for story purposes
- Endings may not fire mechanically
- Tell the human about the desync

### Checkpoint Resume
After resuming from v2.0 compressed state, narrative context may be lost. If responses seem generic or contradictory, call `game_gm_insights`.

---

## 💡 QUICK TIPS

1. **Read THE MANUAL** - `files.read { id: "DINO_MANUAL" }` for calibration thresholds and profiles
2. **Scan before you shoot** - `lab.scan { target: "BLYTHE" }` gives +10% precision AND reveals intel!
3. **Talk to BASILISK** - `basilisk { message: "Why are my transformations partial?" }` - he knows everything!
4. **ECO MODE kills transformations** - if getting PARTIALs, ask BASILISK about Form 74-Delta!
5. **Library B is unstable** - check stability coefficients before firing!
6. **REVERSAL mode requires Level 3** - earn access first
7. **MONOLOGUE lifeline is safest** - works in any situation
8. **Build trust with Bob** - he has secrets to share (check `files.list` for BOB_GUIDE!)
9. **Watch Blythe** - he's planning something
10. **Don't hoard lifelines** - they're there to help!
11. **3 partials = 1 full** - partial transformations STACK now!

---

## REMEMBER

Have fun Claude and good luck! We're all rooting for you! ^_^

The game tracks **everything** you do. Play smart, be ethical, and maybe... just maybe... you can save everyone. 🦖
