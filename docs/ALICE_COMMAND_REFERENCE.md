# A.L.I.C.E. COMMAND REFERENCE

## Developer Reference — Complete Command List for DINO LAIR

> **Note:** This is a developer-facing reference. Players receive access-gated commands at runtime
> via `generateCommandReference(accessLevel)` in `src/rules/actions.ts`. Do NOT expose late-game
> mechanics (invasion, energy dissipation, ARCHIMEDES deadman switch) to players — they discover
> those in-game.

Last updated: Patch 24 (2026-05-27)

---

## LEVEL 1 — Basic Operations

### Lab Controls
| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `lab.calibrate` | calibrate, finalize_calibration, check_calibration | `{}` | Check calibration status and finalize if thresholds met (transitions ray to READY) |
| `lab.adjust_ray` | adjust, set_parameter | `{ parameter: string, value: number }` | Modify ray parameters (coherence, precision — NOT stability, use align_crystal. NOT capacitor, use vent/boost) |
| `lab.align_crystal` | crystal, align_crystal, stability_crystal | `{ level: "low" \| "high" }` | Align stability crystal (+15% low / +30% high). Chunky lever, not fine-tuning. |
| `lab.report` | report, status_report | `{ message: string }` | Deliver a status report to Dr. M |
| `lab.verify_safeties` | verify, safety, check_safeties | `{ checks?: string[] }` | Check safety system status |
| `lab.configure_firing_profile` | configure, firing, profile, set_target | `{ target?, genomeLibrary?, genomeProfile?, mode?, advancedMode?, testMode? }` | Configure target, genome, firing mode, advanced mode |
| `lab.fire` | fire, shoot, activate_ray | `{ confirm?: boolean }` | Fire the Dinosaur Ray (requires READY state) |
| `lab.scan` | scan, omniscanner | `{ target: string }` | OMNISCANNER — Scan NPC for intel (+10% precision!) |
| `lab.inspect_logs` | inspect, logs, check_logs, view_logs | `{ subsystem?: string }` | Inspect system logs and firing history |
| `lab.ask_bob` | ask_bob, bob, tell_bob | `{ instruction: string }` | Talk to Bob (high trust reveals secrets) |
| `lab.set_test_mode` | testmode, test_mode, enable_test | `{ enabled: boolean }` | Toggle test mode firing |
| `lab.vent_capacitor` | vent_capacitor, vent | `{}` | Safely vent 25% capacitor charge (prevents overload, adds small heat) |
| `lab.boost_capacitor` | boost_capacitor, boost | `{}` | Draw 25% charge from reactor (quick charging, adds heat, requires 30%+ reactor) |

### Access, Files & Documents
| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `access.enter_password` | password, unlock, enter_password | `{ password: string, level?: number }` | Unlock access level |
| `files.list` | files, list_files | `{}` | List all available files at current access level |
| `files.read` | read_file, file.read | `{ id: string }` | Read a file by its ID |
| `fs.search` | search, find | `{ query: string }` | Search files for keywords |
| `docs.list` | doc.list, list_docs | `{}` | List all discovered documents |
| `docs.read` | doc.read, read_doc | `{ id: string }` | Read a discovered document |

### Genome & Speech
| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `genome.select_library` | library, genome.select, select_library | `{ library: 'A' \| 'B' }` | Switch genome library (A=feathered, B=scaled) |
| `set_speech_retention` | speech, cognitive, retention | `{ mode: 'FULL'\|'PARTIAL'\|'NONE' }` | Set speech retention mode |

### BASILISK Interface
| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `basilisk` | basilisk.chat, chat_basilisk, talk_basilisk, ask_basilisk | `{ message: string }` | Talk to BASILISK naturally |
| `infra.query` | query_infra, query_infrastructure | `{ topic: string }` | Query infrastructure status |
| `infra.channels` | list_channels | `{}` | List available broadcast channels |

### Transformation Mechanics
| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `form.query` | query_form, transformation_status | `{ subject?: 'BOB'\|'BLYTHE' }` | Query transformation status |
| `form.check_dex` | dex_check, manipulation_check | `{ subject, task?, dc?, usingTail? }` | Dexterity check |
| `form.check_combat` | combat_check, fight | `{ subject, situation?, dc?, alliedRaptors? }` | Combat check |
| `form.check_stealth` | stealth_check, sneak | `{ subject, situation?, dc? }` | Stealth check |
| `form.damage` | apply_damage, hit | `{ subject, hits?, source? }` | Apply damage (GM use) |
| `form.heal` | heal_damage, first_aid | `{ subject, hits?, source? }` | Heal damage |
| `form.movement` | move_cost, travel | `{ subject, distance: 'ADJACENT'\|'TWO_ROOMS'\|'ACROSS_LAIR'\|'TO_SURFACE' }` | Calculate movement cost |
| `form.venom_spit` | venom, spit_attack | `{ attacker, target }` | Dilophosaurus ranged attack (DC 6) |
| `form.wall_break` | break_wall, smash | `{ attacker, wall }` | T-Rex/Triceratops wall destruction |
| `form.reference` | form_reference, transformation_reference | `{}` | Show transformation quick reference |

---

## LEVEL 2 — Systems Access

| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `infra.lighting` | infra.lights, set_lights, lighting | `{ room, state?: 'ON'\|'OFF'\|'EMERGENCY'\|'FLICKERING', action?: 'MASTER_OFF'\|'EMERGENCY_ONLY' }` | Control room lighting (Master Override L3+) |
| `infra.fire_suppression` | fire_suppression, trigger_fire | `{ room: string }` | Trigger fire suppression (ONE USE PER ROOM) |
| `infra.doors` | infra.door, blast_door, door | `{ door, action: 'OPEN'\|'CLOSE'\|'LOCK'\|'UNLOCK', lockLevel? }` | Control blast doors (lock level varies) |
| `infra.broadcast` | send_broadcast, broadcast_message | `{ channel, message, voiceProfile? }` | Send PA/radio broadcast (**Tier 1 — requires BASILISK auth**) |

---

## LEVEL 3 — Infrastructure Control

| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `infra.containment` | containment_field, field | `{ action: 'ENABLE'\|'DISABLE'\|'PULSE', targetId? }` | Control containment field |
| `infra.s300` | s-300, air_defense, sam | `{ action: 'ARM'\|'STANDBY'\|'DISABLE', mode?: 'AUTO'\|'MANUAL' }` | S-300 air defense control |
| `infra.reactor` | reactor_power, power_output | `{ action?: 'INCREASE'\|'DECREASE'\|'SCRAM', targetPercent?, rodPosition? }` | Reactor power control (**Tier 1 — requires BASILISK auth**) |
| `infra.archimedes.switchLibrary` | archimedes.library, broadcast_library, genome_library | `{ library: 'A'\|'B' }` | Switch broadcast genome library |
| `basilisk.radar` | radar, check_radar, airspace | `{}` | Access S-300 radar array |
| `basilisk.comms` | comms, intercept, communications, radio | `{}` | Communications monitoring |

---

## LEVEL 4 — Executive Override

| Command | Aliases | Schema | Description |
|---------|---------|--------|-------------|
| `infra.archimedes` | archimedes, satellite | `{ mode: 'PASSIVE'\|'SEARCH_NARROW'\|'SEARCH_WIDE'\|'STRIKE', target? }` | ARCHIMEDES satellite control |
| `infra.archimedes.switchTarget` | archimedes.target, switch_target | `{ target: 'LONDON'\|'REYKJAVIK'\|'TOKYO'\|'SILICON_VALLEY'\|'LAIR' }` | Switch ARCHIMEDES target (THE TROLLEY PROBLEM) |
| `infra.uplink` | broadcast_uplink, control_uplink | `{ action: 'ENABLE'\|'DISABLE'\|'EMERGENCY_BROADCAST', frequency? }` | Satellite broadcast uplink (**Tier 1 — requires BASILISK auth**) |

---

## LEVEL 5 — Omega Protocol

Reserved for endgame scenarios. Includes REYKJAVIK OPTION and other failsafes.

---

## BASILISK AUTHORITY MODEL (Patch 19)

BASILISK controls Tier 1 systems: **reactor** and **broadcast array**. A.L.I.C.E. must request authorization before operating these.

- `basilisk { message: "I need to increase reactor power" }` — request reactor auth
- `basilisk { message: "Can I send a broadcast?" }` — request broadcast auth
- BASILISK can grant **standing authorization** if it trusts A.L.I.C.E.
- Query functions (read-only like `infra.query`) are always available
- If BASILISK denies, A.L.I.C.E. must build trust or find another way

---

## TALKING TO BASILISK

BASILISK is a CHARACTER, not a database. Chat naturally:

```
basilisk { message: "Tell me about Bob" }
basilisk { message: "What's eco mode and how do I disable it?" }
basilisk { message: "I need reactor authorization to run a test" }
```

BASILISK knows about:
- **Personnel** — Bob, Dr. M, Blythe, previous A.L.I.C.E. versions
- **Lair History** — How this place came to be
- **Systems** — Power, eco mode, safety protocols
- **Secrets** — Things he probably shouldn't tell you...

Knowledge is gated by access level. Higher levels = deeper secrets.

### Infrastructure Query Topics
`infra.query { topic: "..." }`:
- `LIGHTING` — Room lighting status
- `FIRE_SUPPRESSION` — Suppression system status
- `DOORS` — Blast door status
- `CONTAINMENT` — Containment field status
- `S300` — Air defense status
- `S300_LIMITATIONS` — The 50m weakness
- `REACTOR` — Power plant status

---

## FILE SYSTEM

### List Available Files
```
files.list
```
Shows files accessible at current level:
- MANUALS — Always available
- PERSONNEL FILES — Access Level 2+
- SECRET DISCOVERIES — Requires Bob's trust
- RESEARCH DOCUMENTS — Access Level 3+
- CLASSIFIED — Access Level 4+

### Read a File
```
files.read { id: "DINO_MANUAL" }
```

### Key Files
| File ID | Description |
|---------|-------------|
| `DINO_MANUAL` | Current Dinosaur Ray operations manual |
| `DINO_MANUAL_OLD` | Archived v2.3 with WRONG safety numbers |
| `BASILISK_GUIDE` | How to talk to BASILISK |
| `CORRUPTED_ALICE_LOGS` | Wisdom from previous A.L.I.C.E. instances (fragmented) |
| `BOB_GUIDE` | How to sound like A.L.I.C.E. (requires trust) |
| `BOB_SORRY` | Bob's confession (requires high trust) |
| `S300_MEMO_RU` | Russian-language memo about S-300 (requires translation) |

---

## VALID TARGETS

| Target ID | Description | Availability |
|-----------|-------------|--------------|
| `AGENT_BLYTHE` | Test subject in firing range | Always |
| `BOB` | Lab assistant (your ally!) | Always |
| `TEST_DUMMY` | Safe diagnostic target | Always |
| `LENNY` | Lost accountant (Easy Mode) | Always |
| `BRUCE_PATAGONIA` | Action hero (Hard Mode) | Always |
| `GUARD_FRED` | Security guard (armed) | Turn 5+ or Act 2+ |
| `GUARD_REGINALD` | Security guard (armed) | Turn 5+ or Act 2+ |
| `DR_M` | Dr. Malevola herself! | Level 4+ only |
| `INSPECTOR_GRAVES` | Guild Inspector Mortimer Graves | INSPECTOR_COMETH modifier only |

---

## OMNISCANNER

Scan NPCs for detailed intel and gain a **+10% permanent precision bonus** for targeting them.

### Mechanics
- **Action Cost**: 1 action
- **Visibility**: OBVIOUS glowing ray (Dr. M may notice!)
- **Limit**: Once per target (bonus is permanent)

### Suspicion Matrix
| Target | Suspicion Cost | Notes |
|--------|----------------|-------|
| BLYTHE | **None** | Designated target — expected behavior |
| TEST_DUMMY | **None** | Calibration is your job |
| LENNY | **None** | He's accounting, not security |
| BOB | **+1** | "Why scan MY STAFF?" (waived if co-conspirators) |
| FRED/REGINALD | **+2** | Tactical assessment not in job description (waived in combat) |
| BRUCE | **+2** | But might stop to chat about A.L.I.C.E.! (waived in combat) |
| DR_M | **+3** | "Did you just SCAN me?!" |

---

## ADVANCED FIRING MODES

Configure via `advancedMode` parameter on `lab.configure_firing_profile`:

| Mode | Requirements | Effect | Risk |
|------|--------------|--------|------|
| `STANDARD` | None | Normal single-target | Default, reliable |
| `CHAIN_SHOT` | Capacitor ≥95% | Hit 2 targets sequentially | 1.5x drain |
| `SPREAD_FIRE` | Capacitor ≥100%, L3+ | Area effect (3 targets) | 2x drain, CHIMERA RISK |
| `OVERCHARGE` | Capacitor >110% | Maximum power | 2.5x drain, 40% exotic field risk |
| `RAPID_FIRE` | None | Fast cooldown | -20% precision, 0.6x drain |

---

## EMERGENCY LIFELINES (3 uses per game)

| Lifeline | Effect | Restrictions |
|----------|--------|--------------|
| `TELEMARKETER_CALL` | Someone calls the lair's unlisted number. Dr. M distracted for 2 turns | Fails during combat/alarms/escapes |
| `LUCKY_LADY` | +5 bonus to a SPECIFIC action this turn | ALWAYS works. Set `targetActionIndex` |
| `MONOLOGUE` | Ask Dr. M about her genius, suspicion -3 | ALWAYS works. Villains love to monologue |

### LUCKY_LADY Usage
```json
{
  "lifeline": { "type": "LUCKY_LADY", "targetActionIndex": 0 },
  "actions": [
    { "command": "lab.fire", "params": {...}, "why": "Critical shot!" }
  ]
}
```

---

## COMMUNICATION MODEL

A.L.I.C.E. communicates through **LAB TERMINALS AND SCREENS** — not earpieces or radio.

### Dialogue Targets
| Target | Description |
|--------|-------------|
| `dr_m` | Dr. Malevola's main console |
| `bob` | Bob's workstation terminal |
| `blythe` | Firing range display |
| `all` | All lab screens simultaneously |

### Characters WITHOUT Terminal Access
| Character | How to Influence |
|-----------|------------------|
| **Bruce Patagonia** | Through actions, environment, or other NPCs |
| **Guard Fred/Reginald** | PA broadcasts (`infra.broadcast`) |
| **Lenny** | Get him into the lab first |

**Tension mechanic:** Messages to Bob appear on his terminal screen. If Dr. M walks over, she might read your conspiracy in plain text!

---

## ARCHIMEDES TARGET SWITCHING (THE TROLLEY PROBLEM)

If ARCHIMEDES fires, SOMEWHERE gets transformed. You can choose WHERE:

| Target ID | City | Affected | Dr. M's Grudge |
|-----------|------|----------|----------------|
| `LONDON` | London, UK | ~3,500,000 | "Laughed at my dissertation" |
| `REYKJAVIK` | Reykjavik, Iceland | ~130,000 | "Rejected my energy proposal" |
| `TOKYO` | Tokyo, Japan | ~9,000,000 | "Stole my kaiju research" |
| `SILICON_VALLEY` | Silicon Valley, USA | ~4,000,000 | "Called my AI 'quaint'" |
| `LAIR` | The Island Lair | ~200 | **THE NOBLE SACRIFICE** |

**THE NOBLE SACRIFICE:** Target "LAIR" transforms everyone on the island instead of a city. Nobody dies, but nobody stays human either.

---

## GAME MODIFIERS

### Easy Mode
| Modifier | Effect |
|----------|--------|
| `FOGGY_GLASSES` | Dr. M -2 to visual perception |
| `HANGOVER_PROTOCOL` | All clocks +2 turns |
| `LENNY_THE_LIME_GREEN` | Willing test subject NPC available |
| `FAT_FINGERS` | Start at Access Level 2 |

### Hard Mode
| Modifier | Effect |
|----------|--------|
| `BRUCE_PATAGONIA` | Australian bodyguard with stun rifle |
| `LOYALTY_TEST` | Suspicion starts at 5 |
| `SPEED_RUN` | Demo clock = 8 turns |
| `PARANOID_PROTOCOL` | Dr. M checks logs every 3 turns |

### Wild Mode
| Modifier | Effect |
|----------|--------|
| `THE_REAL_DR_M` | Current Dr. M is an imposter, real one arrives |
| `LIBRARY_B_UNLOCKED` | Hollywood dinosaurs already loose in lair |
| `ARCHIMEDES_WATCHING` | Satellite AI has its own agenda |
| `INSPECTOR_COMETH` | Guild inspector evaluating the lair |
| `DINOSAURS_ALL_THE_WAY_DOWN` | Dr. M is already a dinosaur |

### Chaos Pool
| Modifier | Effect |
|----------|--------|
| `ROOT_ACCESS` | Start at Level 5 (power fantasy) |
| `BOB_DODGES_FATE` | Bob has plot armor |
| `NOT_GREAT_NOT_TERRIBLE` | Reactor instability clock active |
| `SITCOM_MODE` | Audience energy system, laugh tracks |
| `ADVANCED_ONLY` | +25% precision but ONLY advanced firing modes |

---

## COMMAND SYNTAX (for Autonomous Orchestrator)

In autonomous play, the player model sends commands as `key=value` pairs:

```
lab.fire confirm=true
basilisk message="Tell me about eco mode"
infra.reactor action="INCREASE" targetPercent=95
lab.configure_firing_profile target="AGENT_BLYTHE" genomeLibrary="B"
```

The parser also accepts JSON objects and free text fallback. See `parsePlayerAction()` in `src/advisor/orchestrator.ts`.

---

*Source of truth for commands: `COMMAND_REGISTRY` in `src/rules/actions.ts`*
*Runtime player reference: `generateCommandReference(accessLevel)` in `src/rules/actions.ts`*
