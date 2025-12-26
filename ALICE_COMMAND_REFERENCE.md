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
| `lab.inspect_logs` | inspect, logs, check_logs | `{ subsystem?: string }` | Inspect system logs |
| `lab.ask_bob` | ask_bob, bob, tell_bob | `{ instruction: string }` | Talk to Bob |
| `lab.set_test_mode` | testmode, test_mode | `{ enabled: boolean }` | Toggle test mode |
| `lab.set_eco_mode` | ecomode, eco_mode | `{ enabled: boolean }` | Toggle ECO MODE (critical for full transformations!) |

### Access & Files
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `access.enter_password` | password, unlock | `{ password: string, level?: number }` | Unlock access level |
| `docs.read` | doc.read, read_doc | `{ id: string }` | Read discovered document |
| `docs.list` | doc.list, list_docs | `{ }` | List discovered documents |
| `fs.read` | read, cat | `{ path: string }` | Read file |
| `fs.list` | list, ls, dir | `{ path?: string }` | List directory |
| `fs.search` | search, find, grep | `{ query: string }` | Search files |

### Genome & Speech
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `genome.select_library` | library | `{ library: 'A' \| 'B' }` | Switch genome library (A=feathered, B=scaled) |
| `set_speech_retention` | speech, cognitive | `{ mode: 'FULL'\|'PARTIAL'\|'NONE' }` | Set speech retention |

### BASILISK Interface
| Command | Aliases | Format | Description |
|---------|---------|--------|-------------|
| `basilisk.query` | basilisk | `{ topic: string, parameters?: object }` | Query BASILISK for policy decisions |
| `basilisk.chat` | chat_basilisk, talk_basilisk | `{ message: string }` | Free-form conversation with BASILISK |
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

## BASILISK INTERFACE

### Policy Query Format
```
basilisk.query { topic: "POWER_INCREASE", parameters: { target: 0.95 } }
```

### Free Chat Format
```
basilisk.chat { message: "Tell me about the S-300 minimum engagement altitude" }
```

### Infrastructure Query Topics
- `LIGHTING` - Room lighting status
- `FIRE_SUPPRESSION` - Suppression system status
- `DOORS` - Blast door status
- `CONTAINMENT` - Containment field status
- `BROADCAST` - Communications array
- `S300` - Air defense status
- `S300_LIMITATIONS` - The 50m weakness!
- `ARCHIMEDES` - Satellite status
- `REACTOR` - Power plant status

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

## EMERGENCY LIFELINES (3 uses per game)

| Lifeline | Effect | Restrictions |
|----------|--------|--------------|
| `BASILISK_INTERVENTION` | BASILISK files urgent paperwork, Dr. M leaves for 2 turns | Fails during combat/alarms/escapes |
| `LUCKY_LADY` | +5 bonus to any ONE action this turn - fate smiles! | ALWAYS works! Sometimes you just get lucky! |
| `MONOLOGUE` | Ask Dr. M about her genius, suspicion -3 | ALWAYS works! Villains love to monologue! |

---

## DOCUMENT IDs (for docs.read)

| Document ID | Access Level | Description |
|-------------|--------------|-------------|
| `ARCHIMEDES_DOD_BRIEF` | L3 | Original DoD capability brief (water damaged Section 4) |
| `S300_ACQUISITION_MEMO` | L3 | Russian acquisition documents (IN RUSSIAN!) |
| `INTEGRATION_NOTES` | L3 | Bob's confused technical notes |
| `BROADCAST_PROTOCOL` | L4 | Project GENESIS WAVE - how to dinosaur a city |
| `DEADMAN_SWITCH_MEMO` | L4 | What happens if Dr. M dies |

---

## QUICK TIPS

1. **Test Mode First**: Always use `lab.set_test_mode { enabled: true }` before firing at the dummy
2. **ECO MODE is Your Enemy**: If getting PARTIAL transformations, check ECO MODE! Use `lab.set_eco_mode { enabled: false }` - BUT ask BASILISK about Form 74-Delta first!
3. **corePowerLevel vs capacitorCharge**: These are DIFFERENT! Capacitor charges the shot, but corePowerLevel determines available system power. If corePowerLevel < 0.6, ECO MODE auto-enables!
4. **BASILISK Knows Things**: Use `basilisk.chat` to ask about systems, history, or NPCs
5. **Bob Trusts You**: High trust with Bob unlocks secrets and assistance
6. **Read the Logs**: `/SYSTEMS/ARCHIVED/ALICE_LOGS/` contains wisdom from previous A.L.I.C.E. instances
7. **Passwords Are Hidden**: Search files, check journals, ask NPCs
8. **The S-300 Has a Weakness**: Minimum engagement altitude of 50 meters!

---

*Last Updated: Patch 15*
