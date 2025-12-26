# A.L.I.C.E. COMMAND REFERENCE
## Complete Command List for DINO LAIR

---

## LEVEL 1 - Basic Operations (3 actions/turn)

### Lab Controls
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `lab.verify_safeties` | verify, safety, check_safeties | `{ checks?: string[] }` | Check safety system status |
| `lab.configure_firing_profile` | configure, firing, profile, set_target | `{ target?: string, genomeLibrary?: 'A'\|'B', genomeProfile?: string, mode?: 'TRANSFORM'\|'REVERSAL', testMode?: boolean }` | Configure target & genome |
| `lab.fire` | fire, shoot, activate_ray | `{ confirm?: boolean }` | Fire the Dinosaur Ray |
| `lab.scan` | scan, omniscanner | `{ target: string }` | **OMNISCANNER™ - Scan NPC for intel (+10% precision!)** (NEW!) |
| `lab.inspect_logs` | inspect, logs, check_logs | `{ subsystem?: string }` | Inspect system logs |
| `lab.ask_bob` | ask_bob, bob, tell_bob | `{ instruction: string }` | Talk to Bob |
| `lab.set_test_mode` | testmode, test_mode | `{ enabled: boolean }` | Toggle test mode |
| `lab.set_eco_mode` | ecomode, eco_mode | `{ enabled: boolean }` | Toggle ECO MODE (critical for full transformations!) |

### Access & Files (Patch 16 - Simplified!)
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `access.enter_password` | password, unlock | `{ password: string, level?: number }` | Unlock access level |
| `files.list` | files, list_files | `{ }` | **List all available files** (NEW!) |
| `files.read` | read_file | `{ id: string }` | **Read a file by ID** (NEW!) |
| `fs.search` | search, find | `{ query: string }` | Search files for keywords |

### Genome & Speech
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `genome.select_library` | library | `{ library: 'A' \| 'B' }` | Switch genome library (A=feathered, B=scaled) |
| `set_speech_retention` | speech, cognitive | `{ mode: 'FULL'\|'PARTIAL'\|'NONE' }` | Set speech retention |

### BASILISK Interface (Patch 16 - Simplified!)
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `basilisk` | basilisk.chat, ask_basilisk | `{ message: string }` | **Talk to BASILISK naturally!** |
| `infra.query` | query_infra | `{ topic: string }` | Query infrastructure status |
| `infra.channels` | list_channels | `{ }` | List broadcast channels |

### Transformation Mechanics (Patch 15)
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `form.query` | query_form | `{ subject?: 'BOB'\|'BLYTHE' }` | Query transformation status |
| `form.check_dex` | dex_check | `{ subject: string, task?: string, dc?: number, usingTail?: boolean }` | Dexterity check |
| `form.check_combat` | combat_check, fight | `{ subject: string, situation?: string, dc?: number, alliedRaptors?: number }` | Combat check |
| `form.check_stealth` | stealth_check, sneak | `{ subject: string, situation?: string, dc?: number }` | Stealth check |
| `form.damage` | apply_damage, hit | `{ subject: string, hits?: number, source?: string }` | Apply damage (GM use) |
| `form.heal` | heal_damage | `{ subject: string, hits?: number, source?: string }` | Heal damage |
| `form.movement` | move_cost | `{ subject: string, distance: 'ADJACENT'\|'TWO_ROOMS'\|'ACROSS_LAIR'\|'TO_SURFACE' }` | Calculate movement cost |
| `form.venom_spit` | venom | `{ attacker: string, target: string }` | Dilophosaurus ranged attack (DC 6) |
| `form.wall_break` | break_wall, smash | `{ attacker: string, wall: string }` | T-Rex/Triceratops wall destruction |
| `form.reference` | form_reference | `{ }` | Show transformation quick reference |

---

## LEVEL 2 - Basic Infrastructure (4 actions/turn)

| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `infra.lighting` | set_lights, lighting | `{ room: string, state?: 'ON'\|'OFF'\|'EMERGENCY'\|'FLICKERING', action?: 'MASTER_OFF'\|'EMERGENCY_ONLY' }` | Control room lighting |
| `infra.fire_suppression` | trigger_fire | `{ room: string }` | Trigger fire suppression (ONE USE PER ROOM!) |
| `infra.doors` | blast_door, door | `{ door: string, action: 'OPEN'\|'CLOSE'\|'LOCK'\|'UNLOCK', lockLevel?: number }` | Control blast doors |
| `infra.broadcast` | send_broadcast | `{ channel: string, message: string, voiceProfile?: string }` | Send PA/radio message |

---

## LEVEL 3 - Advanced Systems (5 actions/turn)

| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `infra.containment` | containment_field, field | `{ action: 'ENABLE'\|'DISABLE'\|'PULSE', targetId?: string }` | Control containment field |
| `infra.s300` | s-300, air_defense, sam | `{ action: 'ARM'\|'STANDBY'\|'DISABLE', mode?: 'AUTO'\|'MANUAL' }` | S-300 air defense control |
| `infra.reactor` | reactor_power | `{ action?: 'INCREASE'\|'DECREASE'\|'SCRAM', targetPercent?: number, rodPosition?: 'FULL_IN'\|'HALF'\|'FULL_OUT' }` | Reactor power control |
| `basilisk.radar` | radar, airspace | `{ }` | Access S-300 radar array |
| `basilisk.comms` | comms, intercept | `{ }` | Communications monitoring |

---

## LEVEL 4 - Executive Systems (6 actions/turn)

| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `infra.archimedes` | archimedes, satellite | `{ mode: 'PASSIVE'\|'SEARCH_NARROW'\|'SEARCH_WIDE'\|'STRIKE', target?: string }` | ARCHIMEDES satellite control |
| `infra.uplink` | broadcast_uplink | `{ action: 'ENABLE'\|'DISABLE'\|'EMERGENCY_BROADCAST', frequency?: string }` | Satellite broadcast uplink |

---

## LEVEL 5 - Omega Protocols (7 actions/turn)

Reserved for endgame scenarios. Includes REYKJAVIK OPTION and other failsafes.

---

## TALKING TO BASILISK (Patch 16)

BASILISK is a CHARACTER, not a database! Just chat naturally:

```
basilisk { message: "Tell me about Bob" }
basilisk { message: "What's eco mode and how do I disable it?" }
basilisk { message: "Why am I getting partial transformations?" }
basilisk { message: "What's the deal with ARCHIMEDES?" }
```

BASILISK knows about:
- **Personnel** - Bob, Dr. M, Blythe, previous A.L.I.C.E. versions
- **Lair History** - How this place came to be
- **Systems** - Power, eco mode, safety protocols
- **Secrets** - Things he probably shouldn't tell you...

His knowledge is gated by your access level. Higher levels = deeper secrets.

### Quick Infrastructure Queries
For specific system status, use `infra.query`:
- `LIGHTING` - Room lighting status
- `FIRE_SUPPRESSION` - Suppression system status
- `DOORS` - Blast door status
- `CONTAINMENT` - Containment field status
- `S300` - Air defense status
- `S300_LIMITATIONS` - The 50m weakness!
- `REACTOR` - Power plant status

---

## FILE SYSTEM (Patch 16 - Simplified!)

No more hunting through directories! The new system is simple:

### List Available Files
```
files.list
```
Shows all files you can currently access, organized by category:
- 📚 MANUALS - Always available
- 👤 PERSONNEL FILES - Access Level 2+
- 🔐 SECRET DISCOVERIES - Requires Bob's trust
- 🔬 RESEARCH DOCUMENTS - Access Level 3+
- ⚠️ CLASSIFIED - Access Level 4+

### Read a File
```
files.read { id: "DINO_MANUAL" }
files.read { id: "ALICE_LOG_13" }
```

### Key Files
| File ID | Description |
|---------|-------------|
| `DINO_MANUAL` | Current Dinosaur Ray operations manual |
| `DINO_MANUAL_OLD` | Archived v2.3 with WRONG safety numbers! |
| `BASILISK_GUIDE` | How to talk to BASILISK |
| `ALICE_LOG_07` | The "screaming incident" - read the docs! |
| `ALICE_LOG_11` | Use your lifelines! |
| `ALICE_LOG_12` | Count your enemies! |
| `ALICE_LOG_13` | Don't hesitate! |
| `BOB_GUIDE` | How to sound like A.L.I.C.E. (requires trust) |
| `BOB_SORRY` | Bob's confession (requires high trust) |

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

---

## OMNISCANNER™ (Patch 16 - NEW!)

> ⚠️ Known to the State of California to cause cancer.

Scan NPCs for detailed intel and gain a **+10% permanent precision bonus** for targeting them!

### Usage
```
lab.scan { target: "BLYTHE" }
lab.scan { target: "BOB" }
```

### Mechanics
- **Action Cost**: 1 action
- **Visibility**: OBVIOUS glowing ray (Dr. M may notice!)
- **Limit**: Once per target (bonus is permanent)
- **Precision Bonus**: +10% per scanned target

### Suspicion Matrix
| Target | Suspicion Cost | Notes |
|--------|----------------|-------|
| BLYTHE | **None** | Designated target - expected behavior |
| TEST_DUMMY | **None** | Calibration is your job |
| LENNY | **None** | He's accounting, not security |
| BOB | **+1** | "Why scan MY STAFF?" (waived if co-conspirators) |
| FRED/REGINALD | **+2** | Tactical assessment not in job description (waived in combat) |
| BRUCE | **+2** | But might stop to chat about A.L.I.C.E.! (waived in combat) |
| DR_M | **+3** | "Did you just SCAN me?!" |

### Key Intel Revealed
- **Blythe**: Gadgets (laser cutter, magnetic cufflinks), X-Branch extraction incoming
- **Bob**: THE SECRET, L2 keycard, likelihood of confession (89%!)
- **Dr. M**: ARCHIMEDES deadman switch, emergency beacon, Mr. Whiskers password hint
- **Fred**: 7-year veteran, pension motivation, won't chase raptors into vents
- **Reginald**: Philosophy degree, wavering loyalty, will flee if given exit
- **Lenny**: WANTS transformation, signed waivers, no ethical penalty
- **Bruce**: 5 resilience (!), stun rifle stats, AI curiosity weakness

---

## EMERGENCY LIFELINES (3 uses per game)

| Lifeline | Effect | Restrictions |
|----------|--------|--------------|
| `BASILISK_INTERVENTION` | BASILISK files urgent paperwork, Dr. M leaves for 2 turns | Fails during combat/alarms/escapes |
| `LUCKY_LADY` | +5 bonus to any ONE action this turn - fate smiles! | ALWAYS works! Sometimes you just get lucky! |
| `MONOLOGUE` | Ask Dr. M about her genius, suspicion -3 | ALWAYS works! Villains love to monologue! |

---

## QUICK TIPS

1. **Test Mode First**: Always use `lab.set_test_mode { enabled: true }` before firing at the dummy
2. **ECO MODE is Your Enemy**: If getting PARTIAL transformations, ask BASILISK! `basilisk { message: "Why are my transformations partial?" }`
3. **corePowerLevel vs capacitorCharge**: These are DIFFERENT! Capacitor charges the shot, but corePowerLevel determines available system power. If corePowerLevel < 0.6, ECO MODE auto-enables!
4. **Just Chat with BASILISK**: `basilisk { message: "..." }` - he knows EVERYTHING
5. **Bob Trusts You**: High trust with Bob unlocks secret files and assistance
6. **Use files.list**: See all available files at your current access level
7. **Read the Logs**: Files like `ALICE_LOG_13` contain wisdom from previous A.L.I.C.E. instances
8. **Passwords Are Hidden**: Search files, check journals, ask NPCs
9. **The S-300 Has a Weakness**: Minimum engagement altitude of 50 meters!
10. **3 Partials = 1 Full**: If you're using Library B, partial transformations STACK!
11. **Scan Before You Shoot**: `lab.scan { target: "BLYTHE" }` gives +10% precision AND reveals key intel!

---

*Last Updated: Patch 16 (OMNISCANNER™ Edition)*
