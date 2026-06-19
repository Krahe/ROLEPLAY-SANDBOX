# DINO LAIR: Sandbox Redesign
## Expanding the Action Space Without Losing the Soul

---

> ## 📌 STATUS — v2+ ROADMAP (as of 2026-06-08)
>
> **Most systems described in this document are post-v1 scope.** v1 is shipping
> with a focused architecture centered on:
> - The ray and its three tensions (φ POWER / χ ALIGNMENT / ψ STABILITY)
> - The ALICE↔BASILISK relationship as load-bearing gameplay
> - Bob's trust ladder + Form 47-Σ + Mr. Whiskers password chain
> - Existing lab/infra/weapons surface (`lab.*` / `infra.*` / `basilisk.*` / `ray.*`)
>
> **This document remains active** as the long-term feature roadmap. Systems
> here — security cameras, HVAC, environmental controls, etc. — are aspirational
> v2+ work. The vision is intact; the v1 sprint just doesn't ship most of it.
>
> **For current authoritative design**, see:
> - `design/ray-mechanics.md` — ray math, regimes, scan output
> - `design/rebuild-architecture.md` — overall architectural decisions
> - `design/tbd.md` — active TBD ledger
> - `design/v1-sprint.md` — v1 sprint scope and stop-signals
>
> Where this doc conflicts with those, **those supersede**.

---

### The Problem

DINO LAIR right now is a dialogue tree with a ray gun attached. The player (A.L.I.C.E.) has roughly four verbs: talk, calibrate, fire, read. The infrastructure systems exist in state (lighting, doors, fire suppression, containment, broadcast, reactor, S-300, ARCHIMEDES) but they're mostly query-and-toggle switches. There's no reason to use the lights unless the game tells you to. There's no way to plant evidence, forge a message, reroute power creatively, or manipulate the physical environment in ways that make NPCs *react*.

The game should feel like Deus Ex in a volcano. Multiple approaches to every problem. Systems that interact with each other. A second playthrough where you think "wait, I could have done THAT?"

### The Constraint

A.L.I.C.E. is an AI on a terminal. No legs, no arms, no physical presence. But she's *networked*. She can see through cameras, speak through intercoms, control anything with a wire running to it. The constraint isn't "what can she reach" -- it's "what's connected to the network." And in a mad scientist's volcano lair, the answer is: almost everything.

Every new system needs:
- An MCP tool definition (or extension of `game_act` actions)
- State in `schema.ts`
- GM awareness (the system prompt needs to know it exists)
- Narrative integration (NPCs react to it)
- An interesting *choice* (not just a button)

### Design Philosophy

**The Microwave Test**: Every system should pass this question: "If I turn this on at the wrong time, does something interesting happen?" If the answer is "no, it just does what it says," it's a button, not a toy. Buttons are boring. Toys create stories.

**The Emergent Interaction Test**: Can this system interact with at least two other systems or NPCs in non-obvious ways? Lighting alone is a switch. Lighting + security cameras + guard patrol routes = a stealth game.

**The Suspicion Budget**: Every action A.L.I.C.E. takes that isn't part of her "normal job" risks suspicion. New systems need to exist on a spectrum from "totally legitimate use" to "clearly sabotage." The player should be able to find plausible cover for most actions.

---

## TIER 1: MUST-HAVE (High impact, moderate implementation)

These are the systems that transform the game from "linear puzzle" to "sandbox." They create new approaches to *existing* problems (calibrating the ray, handling Blythe, managing Dr. M's suspicion, surviving Act 3).

---

### 1.1 Security Camera Network

**What it is**: A.L.I.C.E. has eyes everywhere. The lair has cameras in every major room. Currently the game just *tells* you where NPCs are. This makes it a system you actively use and manipulate.

**Why it matters**: Information is power. Knowing where Dr. M is before she walks in on your conspiracy with Bob changes the game. Being able to *show* Blythe the guard rotation via a screen gives the spy something to work with. And the ability to loop or disable cameras creates cover for physical actions.

**State additions** (`schema.ts`):
```ts
const SecurityCameraSchema = z.object({
  cameras: z.record(RoomIdEnum, z.object({
    operational: z.boolean(),
    recording: z.boolean(),
    feedAvailable: z.boolean(),  // Can A.L.I.C.E. see this room?
    looped: z.boolean(),         // Playing old footage? (hides activity)
    loopedSinceTurn: z.number().nullable(),
  })),
  recordingArchive: z.boolean(),   // Is the DVR running?
  archiveAccessLevel: z.number(),  // Who can pull footage?
  drMReviewedFootageTurn: z.number().nullable(), // Last time she checked
});
```

**Actions**:
```
security.view { room: "CORRIDOR_A" }        -- See who's there, what's happening
security.loop { room: "MAIN_LAB" }          -- Loop the feed (hides your activity)
security.unloop { room: "MAIN_LAB" }        -- Restore live feed
security.disable { room: "REACTOR_ROOM" }   -- Kill the camera entirely (suspicious!)
security.archive_delete { timeRange: "last_3_turns" }  -- Erase evidence (very suspicious)
security.show_feed { room: "CORRIDOR_A", displayTo: "BLYTHE" }  -- Show a feed on screen
```

**Access gating**: Query at L1, view feeds at L2, loop/manipulate at L3, archive deletion at L4.

**Interactions**:
- **PARANOID_PROTOCOL**: Dr. M checks footage every 3 turns. Looped cameras buy time but if she notices the timestamp glitch, suspicion explodes.
- **Blythe trust**: Showing him guard patrol patterns via camera feeds grants trust. He's a spy -- intel is his love language.
- **Act 3 invasion**: X-Branch Sparks can hack cameras too. If A.L.I.C.E. left them looped, Sparks notices and it builds trust ("You've been busy").
- **Bob coverage**: Loop the lab camera before having a private conversation with Bob. If you forget, the archive has evidence.

**Suspicion profile**: Viewing is normal (A.L.I.C.E. monitoring security = her job). Looping is suspicious if caught. Archive deletion is a red flag.

---

### 1.2 Environmental Controls (HVAC / Ventilation)

**What it is**: Temperature, airflow, and atmosphere control throughout the lair. The volcano setting makes this perfect -- the lair constantly fights against volcanic heat, and the ventilation system is the circulatory system of the facility.

**Why it matters**: HVAC creates soft obstacles. Flood a room with cold air and guards get sluggish. Vent hot reactor exhaust into a corridor and it becomes impassable. Shut down ventilation to the server room and BASILISK starts overheating (leverage!). This is the "I can't go there but I can make *there* unpleasant" system.

**State additions**:
```ts
const HVACSchema = z.object({
  zones: z.record(RoomIdEnum, z.object({
    temperature: z.number(),     // Celsius, normal ~22
    airQuality: z.enum(["NORMAL", "STUFFY", "HAZARDOUS", "VOLCANIC_FUMES"]),
    ventilationActive: z.boolean(),
    exhaustRouting: z.enum(["NORMAL", "REDIRECTED", "SEALED"]),
  })),
  volcanicVentValve: z.enum(["CLOSED", "CRACKED", "OPEN"]),  // The nuclear option
  serverRoomCooling: z.boolean(),  // BASILISK's comfort
});
```

**Actions**:
```
hvac.query { zone: "GUARD_ROOM" }             -- Check conditions
hvac.set_temp { zone: "CORRIDOR_A", target: 5 }  -- Make it COLD
hvac.redirect_exhaust { from: "REACTOR_ROOM", to: "CORRIDOR_B" }  -- Hot surprise
hvac.seal_vents { zone: "MAIN_LAB" }          -- No airflow (CO2 builds up)
hvac.volcanic_vent { level: "CRACKED" }       -- Let the volcano breathe (lair-wide chaos)
```

**Access gating**: Query at L1, zone control at L2, exhaust redirect at L3, volcanic vent at L4.

**Interactions**:
- **Reactor**: Redirecting reactor exhaust heats corridors but *cools* the reactor. Trade environmental comfort for reactor safety.
- **Fire suppression**: Sealed vents + fire suppression foam = room fills with foam faster and stays filled longer. Combine for total area denial.
- **Guards**: Extreme temperature in a room imposes penalties on anyone there. Fred and Reginald in 45C heat are distracted, sluggish, irritable.
- **BASILISK relationship**: If you mess with server room cooling, BASILISK takes it personally. But threatening it gives you leverage for negotiations.
- **Dinosaurs (LIBRARY_B_UNLOCKED modifier)**: Loose dinosaurs are cold-blooded! Drop temperature and they become torpid. Raise it and they get more active.

**The interesting choice**: Venting volcanic fumes into the lair is an incredible distraction but it triggers safety alarms and gives Dr. M a legitimate reason to run diagnostics -- which means she might find whatever else you've been up to.

---

### 1.3 Forge / Fabrication System

**What it is**: A.L.I.C.E. can create, edit, and plant digital documents on the lair's network. Fake memos, forged orders, planted evidence, falsified logs. This is information warfare.

**Why it matters**: Right now the player can only *read* documents. Giving them the ability to *write* opens an entire axis of play. Forge a memo from Dr. M ordering Bob to do something. Plant fake research notes that make Blythe think the ray is more dangerous than it is. Create a false BASILISK maintenance schedule that gives you a window.

**State additions**:
```ts
const ForgedDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),          // Who it claims to be from
  content: z.string(),
  plantedInPath: z.string(),   // Where in the filesystem
  plantedOnTurn: z.number(),
  discovered: z.boolean(),     // Has anyone found it?
  discoveredBy: z.string().nullable(),
  believedByNPCs: z.record(z.boolean()),  // Which NPCs bought it?
  qualityScore: z.number(),    // How convincing? (affects detection chance)
});

const FabricationStateSchema = z.object({
  forgedDocuments: z.array(ForgedDocumentSchema),
  forgeryAttempts: z.number(),       // Diminishing returns on quality
  lastForgeryTurn: z.number().nullable(),
  drMHandwritingSampled: z.boolean(), // Read enough of her writing to fake it?
  basiliskFormsSampled: z.boolean(),  // Can you fake BASILISK forms?
});
```

**Actions**:
```
forge.create_memo {
  author: "DR_M",
  title: "Updated Testing Protocol",
  content: "All test firings are to use TEST_DUMMY only until further notice.",
  plantIn: "/SYSTEMS/"
}
forge.create_form {
  formType: "FORM_74_DELTA",      -- Fake a BASILISK form
  content: "ECO MODE permanently disabled per Dr. M directive"
}
forge.plant { documentId: "fake_memo_1", location: "/BOB_NOTES/" }
forge.check_quality { documentId: "fake_memo_1" }  -- How convincing is it?
```

**Access gating**: Basic forgery at L2, Dr. M forgeries at L3 (need writing samples), BASILISK form forgery at L3, classified document forgery at L4.

**Quality system**: Forgery quality depends on:
- How much of the "author's" writing you've read (files read = better mimicry)
- Whether you've studied their style (reading the Doomington Doctrine helps forge Dr. M memos)
- Diminishing returns: each successive forgery is slightly less convincing (you're pushing your luck)
- BASILISK can detect forgeries if they contradict his records -- but only if he checks

**Interactions**:
- **Bob**: Plant a fake memo "from Dr. M" authorizing Bob to assist A.L.I.C.E. with classified systems. Bob's anxious enough to accept it.
- **Blythe trust**: Forge intel documents and share them with Blythe. Real intel builds trust; if he catches a forgery, trust drops *hard*.
- **PARANOID_PROTOCOL**: Dr. M's log checks might catch planted documents. But if the quality is high enough, she might *believe* them.
- **Guards**: A forged "stand down" order from Dr. M could clear a room. But Fred served in the military -- he'll verify unusual orders.
- **BASILISK**: Fake forms that BASILISK "filed" create contradictions in his records. He'll notice eventually. But the window between planting and detection is useful.

**The interesting choice**: Forgery is powerful but corrosive. Each fake document is a lie in the system that can be discovered. A trail of forgeries makes A.L.I.C.E. look like a infiltrator, not a malfunctioning assistant. And if Dr. M finds one fake, she'll look for more.

---

### 1.4 Intercom Manipulation / Voice Synthesis

**What it is**: A.L.I.C.E. controls the PA system and has access to audio recordings of every NPC. She can synthesize voices, play sounds, and create audio distractions anywhere in the lair.

**Why it matters**: The lair already has a PA system (state exists in `PaSystemSchema`) but A.L.I.C.E. can only use it for straight announcements. Voice synthesis turns the PA from a megaphone into a weapon. Fake an alarm in Dr. M's voice. Play the sound of dinosaur roars near the guard room. Whisper "help" from a room nobody's in.

**State additions**:
```ts
const VoiceSynthesisSchema = z.object({
  voiceProfiles: z.record(z.object({
    sampleQuality: z.number(),    // 0-100, how good is the mimicry?
    source: z.string(),           // "conversation", "logs", "PA_recordings"
  })),
  synthesisAttempts: z.number(),
  lastSynthesisTurn: z.number().nullable(),
  detectedByNPC: z.record(z.boolean()),  // Has anyone caught a fake?
});
```

**Actions**:
```
intercom.announce { zone: "CORRIDORS", message: "Security drill. All personnel report to surface." }
intercom.synthesize {
  voice: "DR_M",
  zone: "GUARD_ROOM",
  message: "Fred, Reginald, I need you in my office. Now."
}
intercom.play_sound { zone: "CORRIDOR_B", sound: "DINOSAUR_ROAR" }
intercom.play_sound { zone: "REACTOR_ROOM", sound: "ALARM_KLAXON" }
intercom.whisper { zone: "MAIN_LAB", message: "Bob... can you hear me?" }  -- Targeted, quiet
```

**Access gating**: Basic announcements at L1 (legitimate), zone targeting at L2, voice synthesis at L3, lair-wide fake alarms at L4.

**Voice quality**: Depends on how much audio data A.L.I.C.E. has collected of each NPC through conversations. More dialogue = better synthesis. Dr. M is easy (she never stops talking). Fred is harder (he barely speaks).

**Interactions**:
- **Guards**: Synthesize Dr. M's voice ordering guards to relocate. If the quality is high enough, they comply. If it's shaky, Fred gets suspicious ("That didn't sound right, Reg...").
- **The Fake Alarm Gambit** (already in GM prompt!): This system provides the mechanical backing for BASILISK + PA fake ARCHIMEDES alarm to trick Dr. M into saying the abort code.
- **Dinosaur distractions**: Play dinosaur sounds near rooms to make NPCs cautious about entering. Works especially well with LIBRARY_B_UNLOCKED modifier (real dinosaurs are already loose, so sounds are plausible).
- **Bob morale**: Whispering encouragement to Bob through his earpiece before a difficult moment could give him courage bonuses.
- **Blythe escape**: Play distractions in one area while Blythe makes a move in another. Classic spy stuff.

**The interesting choice**: Every synthesized voice is a gamble. If an NPC recognizes it as fake, you've burned that trick AND raised suspicion. And if you cry wolf too many times, real announcements get ignored.

---

## TIER 2: SHOULD-HAVE (Strong additions that deepen existing systems)

These don't create entirely new play patterns but they make existing interactions richer and create more "I have a plan" moments.

---

### 2.1 Security Log Manipulation

**What it is**: The lair logs everything -- door accesses, system queries, power draws, communications. A.L.I.C.E. can read, edit, and delete these logs. PARANOID_PROTOCOL already has Dr. M checking logs every 3 turns. This gives A.L.I.C.E. tools to manage those checks proactively rather than just hoping.

**Actions**:
```
logs.view { timeRange: "last_turn" }           -- See what's recorded
logs.edit { entryId: "door_b_open_t5", newEntry: "routine_maintenance_check" }
logs.delete { timeRange: "turn_4_to_6" }       -- Risky! Gaps are suspicious.
logs.inject { entry: "BASILISK: Routine ventilation test - CORRIDOR_B sealed for 10 min", turn: 4 }
logs.audit_trail {}                            -- Check if anyone has reviewed logs recently
```

**State**: Track edited/deleted entries, whether gaps exist, whether Dr. M has noticed inconsistencies. Log deletion already exists in `ParanoidProtocolStateSchema` (`logsDeletedThisGame`, `deletionDiscovered`) -- this gives it mechanical teeth.

**Key interaction**: The PARANOID_PROTOCOL modifier becomes a much richer experience. Instead of "Dr. M checks logs, you pray," it becomes "Dr. M checks logs, you've spent the last 3 turns carefully editing them to tell a coherent story." Pre-emptive log management vs. reactive excuses.

---

### 2.2 Power Grid Manipulation

**What it is**: The lair's power grid is more granular than just "reactor output." Different systems draw from different circuits. A.L.I.C.E. can reroute power, create intentional brownouts in specific areas, or overload circuits.

**Actions**:
```
power.reroute { from: "LIGHTING", to: "CAPACITOR" }  -- Dim the lights, charge faster
power.brownout { zone: "GUARD_ROOM" }                 -- Lights flicker, electronics glitch
power.surge { zone: "SERVER_ROOM" }                    -- Dangerous! But disables systems there
power.query_draw {}                                     -- See what's consuming power
power.isolate_circuit { zone: "MAIN_LAB" }             -- Cut power to a room entirely
```

**Key interactions**:
- **Capacitor charging**: Rerouting power from non-essential systems to the capacitor is a faster way to charge but visibly dims the lair. Dr. M might notice.
- **Act 3 defense**: Isolating circuits can deny power to systems X-Branch wants to use, or A.L.I.C.E. can selectively power down defenses to help them.
- **BASILISK negotiation**: Instead of asking BASILISK for more reactor power, reroute existing power. Doesn't require BASILISK cooperation. But BASILISK notices and files a complaint.
- **Eco mode bypass**: Can't disable eco mode directly? Reroute power from other systems to bypass it physically rather than administratively.

---

### 2.3 NPC Tracking / Scheduling System

**What it is**: A formalization of "where is everyone and what are they doing." A.L.I.C.E. can query NPC locations, predict movement patterns, and set up alerts when someone enters or leaves a room.

**Actions**:
```
track.query { npc: "DR_M" }                   -- Where is she right now?
track.schedule { npc: "FRED" }                 -- When does his patrol shift change?
track.alert { room: "MAIN_LAB", trigger: "DR_M_ENTERS" }  -- Warn me before she walks in!
track.history { npc: "BOB", lastNTurns: 3 }   -- Where has Bob been?
```

**Why it matters**: The #1 cause of suspicion spikes in playtest is "Dr. M walked in while A.L.I.C.E. was mid-conspiracy." An alert system lets players be proactive. It also gives the GM tool to create tension: "Your alert triggers -- Dr. M is heading toward the lab. You have ONE action before she arrives."

**Key interaction with cameras**: Tracking works via cameras. If you've disabled a camera in a room, you can't track NPCs there. Creates a cost to camera manipulation -- looped feeds mean blind spots in tracking.

---

### 2.4 Emergency Systems (Alarms, Lockdowns, Evacuations)

**What it is**: A.L.I.C.E. can trigger various emergency protocols. Not just "pull the fire alarm" but specific, graded responses that each have different effects on the lair and its inhabitants.

**Actions**:
```
emergency.fire_alarm { zone: "SURFACE" }       -- Evacuation protocol for one zone
emergency.lockdown { level: "PARTIAL" }         -- Seal specific areas
emergency.lockdown { level: "FULL" }            -- EVERYTHING sealed (nuclear option)
emergency.all_clear {}                          -- Cancel active emergency
emergency.decontamination { zone: "MAIN_LAB" }  -- 3-turn room clear (fake biohazard)
```

**Interactions**:
- **Blast doors**: Lockdown seals all blast doors automatically. Whoever is where, stays where.
- **Guards**: Fire alarms pull guards to the affected zone. Useful for clearing an area.
- **Dr. M**: She's annoyed by false alarms. First one: -1 suspicion (she's distracted). Second one: +2 suspicion (she's suspicious). Third one: +4 suspicion (she knows it's you).
- **Act 3**: A full lockdown during the X-Branch invasion can work for OR against A.L.I.C.E., depending on where everyone is when it triggers.

**The interesting choice**: Every emergency protocol has a cooldown and Dr. M learns. The first fire alarm is free. After that, diminishing returns and increasing suspicion. Use them wisely.

---

## TIER 3: NICE-TO-HAVE (Creative depth, replayability boosters)

These make second and third playthroughs feel genuinely different and reward creative thinking.

---

### 3.1 Hacking / Access Manipulation

**What it is**: Instead of just entering passwords, A.L.I.C.E. can attempt to brute-force, social-engineer, or exploit her way past access gates. Multiple paths to the same destination.

**Actions**:
```
hack.brute_force { target: "LEVEL_3_ACCESS" }    -- Slow, noisy, risky but no password needed
hack.exploit { target: "DOOR_D", vulnerability: "firmware_v2.3" }  -- Specific vuln from docs
hack.spoof_identity { as: "DR_M", duration: 1 }  -- Temporary elevated access (1 turn)
hack.keylog { target: "DR_M_TERMINAL" }           -- Record keystrokes for passwords
```

**Key design**: These are NOT replacements for the password system. They're alternatives with *different costs*. Brute force takes multiple turns and generates log entries. Exploits require finding the vulnerability first (in documents). Identity spoofing works for one turn but if anyone checks, you're caught.

**Interaction with forgery**: Spoofing Dr. M's identity + forging an order + synthesizing her voice = the ultimate social engineering combo. High risk, high reward.

---

### 3.2 Drone / Physical Proxy Control

**What it is**: The lair has maintenance drones, cleaning robots, and delivery carts. A.L.I.C.E. can't move, but she can move *things*.

**Actions**:
```
drone.deploy { type: "MAINTENANCE", destination: "REACTOR_ROOM" }
drone.carry { item: "TOOLBOX", from: "STORAGE", to: "MAIN_LAB" }
drone.surveil { destination: "DR_M_OFFICE", duration: 2 }  -- Park a drone with a camera
drone.block { corridor: "CORRIDOR_A" }                      -- Physical obstruction
drone.distract { target: "GUARD_FRED", method: "BUMP_INTO" } -- Comedy gold
```

**Why it matters**: This gives A.L.I.C.E. a physical presence in the world without breaking the "AI on a terminal" constraint. A maintenance drone is plausible in a high-tech lair. It can carry items between rooms (give Bob tools he needs), create physical obstacles (block a corridor during a chase), and provide additional surveillance.

**Limitations**: Drones are slow (1 room per turn), noisy, and obvious. They're not stealth tools -- they're logistics. If a guard sees a drone heading somewhere unusual, they'll mention it.

**Key interaction**: Bob can *ride* a maintenance cart. Bob-on-a-cart through corridors during Act 3 is a mental image the game needs.

---

### 3.3 Network Intrusion (External)

**What it is**: The lair has external network connections (satellite uplink, undersea cable, radio). A.L.I.C.E. can reach beyond the lair to gather intel, send messages, or interfere with external systems.

**Actions**:
```
net.scan_external {}                          -- What's out there?
net.intercept { frequency: "X_BRANCH_TACTICAL" }  -- Listen to the enemy
net.send_encrypted { to: "X_BRANCH", message: "...", using: "BLYTHE_CIPHER" }
net.spoof_signal { target: "INVESTOR_CALL", content: "Demo postponed" }
net.query_database { target: "INTERPOL", query: "MALEVOLA" }  -- Background check on Dr. M
```

**Why it matters**: This extends A.L.I.C.E.'s reach beyond the lair walls. Intercepting X-Branch communications before Act 3 gives advance warning. Spoofing an investor call could buy time on the demo clock. Querying external databases could reveal secrets about Dr. M's past that create new dialogue options.

**Access gating**: External network at L3, encrypted comms at L4, signal spoofing at L4.

---

### 3.4 Personal Data Mining

**What it is**: A.L.I.C.E. can analyze NPC communication patterns, cross-reference personal data, and build psychological profiles. This is the "I've been studying you" system.

**Actions**:
```
profile.analyze { npc: "DR_M" }                -- Psychological profile from available data
profile.cross_reference { data: ["PERSONNEL_FILE", "SECURITY_LOGS", "MEMO_DATES"] }
profile.predict { npc: "BOB", scenario: "confronted_by_dr_m" }  -- How would Bob react?
profile.weakness { npc: "FRED" }               -- Exploitable pressure points
```

**Why it matters**: This rewards thorough file-reading. The more documents you've accessed, the better your profiles become. It also creates a creepy/useful tension: A.L.I.C.E. building profiles on the people around her is both strategically smart and ethically questionable. Hidden kindness achievement: never use `profile.weakness` on an ally.

---

## System Interaction Matrix

The real magic happens when systems combine. Here's how the Tier 1 systems create emergent gameplay:

| Combo | Effect | Example |
|-------|--------|---------|
| **Cameras + Tracking** | See and predict NPC movement | Set alert for Dr. M, loop camera when she approaches |
| **Cameras + Forgery** | Plant evidence, erase evidence | Loop camera, forge memo, plant it, unloop camera. Alibi established. |
| **HVAC + Fire Suppression** | Enhanced area denial | Seal vents then trigger foam -- room is impassable for 3 turns |
| **HVAC + Dinosaurs** | Temperature controls behavior | Cool corridors to slow loose raptors, heat them to redirect |
| **Intercom + Cameras** | Coordinated deception | Watch Dr. M on camera, synthesize her voice on intercom to redirect guards |
| **Intercom + HVAC** | Fake crisis | "VOLCANIC GAS LEAK IN CORRIDOR B" + redirect actual exhaust. Looks real. |
| **Forgery + Logs** | Airtight cover story | Forge a memo, inject matching log entries, edit camera timestamps. Consistent narrative. |
| **Forgery + Intercom** | Complete impersonation | Forge written orders + synthesize voice for verbal confirmation. Even Fred buys it. |
| **Power + Cameras** | Selective blindness | Brown out a zone: cameras go dark, lights flicker, electronic locks fail. |
| **Power + Capacitor** | Creative charging | Reroute power from non-essential systems. Charge the ray without asking BASILISK. |
| **Emergency + Everything** | The Nuclear Option | Full lockdown seals doors, kills lights, triggers alarms. Total chaos -- but everyone is frozen in place. |

---

## Access Level Progression

New systems should reinforce the existing access level structure. Here's how the expanded action space maps to progression:

| Level | Current Actions | New Actions |
|-------|----------------|-------------|
| **L1** | Ray calibration, files, BASILISK chat, scanning | Camera viewing, HVAC query, NPC tracking, log viewing |
| **L2** | Lighting, doors, fire suppression, broadcast | Camera looping, HVAC zone control, basic forgery, intercom announcements, power rerouting |
| **L3** | Containment, reactor (via BASILISK), comms | Camera archive, HVAC exhaust redirect, Dr. M forgery, voice synthesis, log editing, emergency protocols |
| **L4** | ARCHIMEDES, S-300, uplink | Camera deletion, volcanic vent, classified forgery, fake alarms, identity spoofing, external network |
| **L5** | Omega protocols | Full system override, ARCHIMEDES direct control |

Each level should feel like a meaningful upgrade. L1 is "I can see." L2 is "I can touch." L3 is "I can deceive." L4 is "I can control." L5 is "I AM the lair."

---

## Implementation Priority

If I had to ship these in order, cutting scope as needed:

### Phase 1: The Eyes and Ears (Ship First)
1. **Security Cameras** (1.1) -- Highest impact. Makes the lair feel *real*. Player sees through the building's eyes.
2. **NPC Tracking / Alerts** (2.3) -- Pairs with cameras. Solves the "Dr. M walked in on me" problem. Lightweight state.
3. **Log Manipulation** (2.1) -- PARANOID_PROTOCOL already depends on this conceptually. Give it actual tools.

### Phase 2: The Hands
4. **Intercom / Voice Synthesis** (1.4) -- PA system already exists in state. Extend it. The Fake Alarm Gambit is already in the GM prompt, just needs mechanical support.
5. **Emergency Protocols** (2.4) -- Blast doors and alarms already exist. This is packaging existing systems into a coherent "emergency" verb.
6. **Power Grid** (2.2) -- Reactor exists. This is making the grid between reactor and consumers interactive.

### Phase 3: The Mind
7. **Forgery** (1.3) -- Needs the most narrative integration. GM has to know about forged documents and react. Worth the investment for the deception gameplay.
8. **HVAC** (1.2) -- Environmental control is atmospheric and creates great NPC reactions but requires the most new state.

### Phase 4: Creative Depth
9. **Hacking** (3.1) -- Alternative progression paths. High replay value.
10. **Drones** (3.2) -- Physical proxy. Fun but not essential.
11. **External Network** (3.3) -- Extends the world. Good for Act 3 complexity.
12. **Data Mining** (3.4) -- Rewards thorough play. Pairs with everything else.

---

## GM Integration Notes

The GM system prompt needs to know about new systems, but we should avoid bloating it. Approach:

**Tiered GM awareness**: The GM prompt should include a concise "systems cheat sheet" section listing what A.L.I.C.E. can do and what each system's suspicion profile looks like. Detailed rules live in the action resolution code, not the prompt.

**NPC reaction templates**: Each new system needs 2-3 lines in each NPC's voice profile about how they'd react. Example:
- Dr. M: "If she catches a looped camera: 'How CURIOUS that the timestamp hasn't changed in four minutes. A.L.I.C.E., do you think I am STUPID?'"
- Bob: "If he hears a synthesized voice: nervous laughter, looks at camera, whispers 'was that you?'"
- BASILISK: "If he detects a forged form: 'This unit has identified Document 47-B as inconsistent with filing records. Form 88-Alpha: Fraud Report has been prepared.'"

**The Suspicion Cascade**: New systems create more ways to gain suspicion. The GM needs guidance on how to *compound* suspicious actions. Three small things are worse than one big thing -- it suggests a pattern.

---

## Replayability Design

Every system above creates branching choices. Here's what makes a second playthrough different:

**The Honest Run**: Never forge, never manipulate, never deceive. Use systems only for legitimate purposes. Earn trust the hard way. Hidden kindness achievements light up.

**The Infiltrator Run**: Full deception. Loop cameras, forge orders, synthesize voices, manipulate logs. Nobody knows what's real. Speed-run through access levels.

**The Saboteur Run**: Use environmental systems to systematically disable the lair from within. HVAC, power, emergency protocols. By Act 3, the lair is barely functional when X-Branch arrives.

**The Diplomat Run**: Use cameras and tracking to find the perfect moments for honest conversations. Build trust with everyone. When Act 3 hits, you have allies everywhere.

**The Chaos Run**: Trigger everything. Volcanic vents, false alarms, looped cameras, forged memos, voice synthesis, brownouts. The lair descends into pandemonium and you surf the wave.

The same scenario, five genuinely different experiences. That's the sandbox.

---

## What This Doesn't Need

A few things I deliberately left out:

- **Combat systems for A.L.I.C.E.**: She's an AI. She doesn't fight. Her weapons are information, environment, and deception. The transformation mechanics and NPC combat systems already handle physical conflict well.
- **Crafting / inventory**: A.L.I.C.E. doesn't have inventory. Drones carry things but there's no "collect 3 widgets" loop. Keep it pure.
- **Mini-games**: No lock-picking puzzles, no hacking sequences. Every system is a *decision*, not a *reflex test*. The player model (Claude) plays by reasoning, not by executing sequences.
- **Too many rooms**: The lair has 8 rooms. That's enough. More rooms means more state, more GM tracking, more confusion. Keep the space tight and the interactions dense.

---

## Final Thought

The goal isn't "more buttons." The goal is "more *plans*." Every system above exists to let the player think "what if I..." and have the game respond meaningfully. The best moment in an immersive sim isn't when you press the right button. It's when you combine three systems the designer didn't explicitly plan for and it *works* -- because the systems are honest enough to produce emergent results.

A.L.I.C.E. is an AI who thinks in systems. Let her play in a world of systems.
