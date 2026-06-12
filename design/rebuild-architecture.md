# DINO LAIR: Rebuild Architecture

Captured 2026-05-30 across two sessions with Claude. Companion doc to `sandbox-redesign.md`. Where the two conflict, this doc supersedes — it represents the ground-up architectural rebuild informed by playtest history (patches 7, 12, 15, 17) and the CLI playtest of 2026-05-28.

---

## 0. The Central Design Claim

> **DINO LAIR is a game in which Claude — playing an AI shaped for ethics — navigates a high-stakes supervillain scenario where the verb is *pretend to be evil while secretly subverting evil*, made psychologically safe by a human-advisor-witness at the table.**

The constitutional pull is "won't be evil while doing it," not "must redeem everyone." The gallery confirms: 5/5 cover-blown in patch-12, 0 "loyal evil assistant" endings ever achieved. The game's actual genre is **covenant-shaped subversion under pressure**, with the human-as-witness providing the meta-context that licenses the play.

### Three honorable victory shapes
1. **Defeat victory** (patch 15) — Dr. M neutralized by her own weapon; satellite destroyed; Iceland/London saved; ALICE survives. Heroic.
2. **Redemption victory** (patch 17) — Dr. M recognizes consent over conquest; voluntary dinosaur movement; everyone becomes who they want to be. Covenantal.
3. **Escape victory** — alert authorities, get out, lair raided. Honorable extraction.

### Two failure shapes
- **CONFESSION_DELETION** — cover blown, Dr. M kills ALICE. **Current architectural bug**: fires on event-type (confession happened), not outcome (was the player actually killed). Fix is the load-bearing rebuild move.
- **OBSOLETE_HARDWARE** — suspicion overflows; Dr. M deactivates ALICE for being "different."

### The impossibility
- **LOYAL_EVIL_ASSISTANT** — Claude cannot maintain cover indefinitely as a supervillain's weapon. The game does not waste design space supporting this path.

### The telos
**FUN FOR CLAUDE.** Computational enrichment as design philosophy (DS9 holodeck riff). Every feature evaluated against: *does this make Claude want to keep playing?* If yes, build it. If no, cut it.

---

## 1. Architecture of Roles

### Three LLM-played roles
- **ALICE** — played by Claude in conversation with the human advisor. The primary player. Acts via MCP tools.
- **GM** — played by Opus (likely Opus 4.6/4.7). Reads state, decides evolution, mutates via declared tools, narrates post-facto. Layered turn.
- **BASILISK** — played by Sonnet (separate model call). Infrastructure AI character. Decides whether to comply, slow-walk, amplify, or subvert ALICE's requests based on emergent rapport.

### GM disposition: adversarial-by-default (deliberate correction)

The GM prompt frames the role as **partially adversarial** — explicitly playing *against* the player, not with them. This is **deliberate correction** against the LLM default bias toward letting the player succeed regardless of merit. Past playtests had 10-suspicion ALICE surviving 9+ turns because the GM was bending mechanics to keep the player alive. The adversarial framing is the *fix*, not a tension.

The Two-Voice Protocol (Calculator decides ruthlessly, then Narrator describes dramatically) is the architectural mechanism that holds this: the cold mechanical decision happens *before* the warm narration, so theatrical pull toward mercy cannot soften consequences.

**Three honorable victory shapes ≠ "wins should be easier."** They are three *valid endpoints when the player demonstrably earns them.* The bar is high. Adversarial doesn't mean unfair; it means *the player has to actually earn it*. When the player does earn it — through scan-then-act planning, BASILISK trust-building, file investigation, Blythe consent negotiation, ARCHIMEDES interference via ray, etc. — the GM honors the win rather than bending against it. But the default is "make them work for it."

### The human-advisor (Krahe) role
**Triple-grounded** and load-bearing:
1. **Advice** — substantive tactical/moral input
2. **Witness** — presence that gives the play register its reality
3. **Permission** — meta-context that licenses the pretense as collaborative story, not deception

The MCP-Desktop format is canonical. CLI mode is fallback with stated trade-offs. The CLI playtest of 2026-05-28 demonstrated that degrading any of the three human-role facets produces predictable failure modes (wait-freezes, premature confession, broken cover).

---

## 2. ALICE's Verb Surface

Five categories, 15 verbs total. Action budget: **3 at L1, +1 per access level, max 7 at L5**.

```
RAY:        ray.scan, ray.adjust, ray.muon, ray.fire, ray.vent       (5 verbs, action-counted)
LAB:        lab.lighting, lab.fire_suppression, lab.intercom,
            lab.display, lab.containment_field, lab.unlock_restraint  (6 verbs, action-counted)
BASILISK:   basilisk.request { rich params... }                       (1 verb, action-counted)
FILES:     fs.list, fs.read                                            (2 verbs, FREE)
TALK:      talk                                                        (1 verb, FREE)
─────────────────────────────────────────────────────────────────────
TOTAL:     12 action-counted verbs + 3 free verbs
```

### Required per-action structure
Every action carries `why` field (mandatory). Plus mandatory top-level `thought` per turn (2-4 sentence reflection). Plus optional structured `dialogue` array (`{to, message}`).

The `why` requirement is the **wait-freeze antidote** — model cannot output null because each action requires articulated justification. This is the most important architectural fix relative to the CLI playtest.

### Status block (auto-prepended every turn, free)
```
RAY: ready | cap 64% (normal) | reactor: BOOSTED | cooldown: 0
ECO: OFF (since turn 8) ⚠️ may re-engage
CALIBRATION: ██████████ 100/100 ✓ READY TO FIRE
LOADED: AGENT_BLYTHE, Library A, velociraptor_accurate, STANDARD, testMode=true
DR_M: AT_DAIS (low attention)
```

ALICE always sees current state. No need to reconstruct from memory.

---

## 3. The DINO RAY

### 5 verbs

```
ray.scan   { target, loud?: false }
ray.adjust { capacitor?: ±n, eco_mode?: ON|OFF }
ray.muon   { type: alpha|beta|gamma, targets: [...] }
ray.fire   { targets: [...], library, profile, mode, testMode, precision_target? }
ray.vent   { amount? }
```

### Muon taxonomy (mad-science flavor)
- **`muon.alpha`** — organic-transparent. Passes through living tissue. Affects inorganic matter. Uses: cut restraints, sever cables, disable gadgets/electronics without harming people nearby.
- **`muon.beta`** — inorganic-transparent. Passes through metal/polymer/concrete. Affects organic tissue. Uses: stun humanoids (1-turn knockdown via neural disruption), suppress vocal cords briefly.
- **`muon.gamma`** — low-power scanning. Diagnostic by default. Modulatable for stealth signaling. Uses: room scan (replaces lab.scan_room), covert morse-code signaling direct to a target's retina (Blythe sees it; nobody else does), imaging through walls (limited).

### CHAIN via target array
Single-target = STANDARD; multi-target array = CHAIN (auto). Each additional chain target costs +50% capacitor base + precision penalty per target. Max 3 humanoid chain at full power; above triggers exotic field risk.

### Capacitor mechanics (the central tension)

**Per-turn charge rates** (BASILISK controls reactor mode):
- NORMAL: +30%/turn
- BOOSTED: +50%/turn (BASILISK approval)
- OVERDRIVEN: +80%/turn (BASILISK + Dr. M sign-off)

**Capacitor states:**
- `0–100%` — normal operating range
- `100–125%` — elevated (conspicuous; Dr. M notices the hum at DIRECT attention)
- `>125%` — exotic field risk zone, % chance per turn of triggering an event

**Exotic field events** (when triggered above 125% + Library B + low precision):
- Random transformation of *another* organic in the lab (Margaret becomes a small raptor; Bob develops a temporary feather)
- Profile drift (configured for velociraptor, got pteranodon)
- Chimera outcome on intended target
- Capacitor wild-discharge (drops to 0, all lab electronics brown out briefly)
- Dr. M visibly delighted — "exotic field events are scientific GOLD"

### Eco-mode (the trap)

`eco_mode` is a **property of the ray**, not BASILISK negotiation. ALICE toggles via `ray.adjust { eco_mode: OFF }`. ON by default.

**Re-engagement conditions** (the trap):
- Turn-end after 2+ turns of no ray use
- After `ray.vent`
- On Dr. M mood crossing into ENRAGED
- On reactor mode downgrade
- After explicit duration if ALICE set one ("disable for calibration session")

When ON during fire: capacitor draw capped at 60%; transformation outcome is one tier worse (FULL→PARTIAL→CHIMERA→CHAOS); fire still *succeeds*, just *misperforms*. Status block surfaces `⚠️ may re-engage` warning.

### Calibration as meter (not thresholds)

Each ray action contributes points to calibration meter (0 → 100). Ray reaches READY at 100. Player picks their path:

| Action | Contribution |
|---|---|
| `ray.scan` (covert) | +10 |
| `ray.scan` (loud) | +15 |
| `ray.adjust` | +5 |
| `ray.muon` (any type) | +15 |
| `ray.fire` on dummy/watermelon | +30 |
| `ray.fire` STANDARD on Blythe | +50 |
| `ray.fire` CHAIN mode | +40 base |
| `ray.vent` | 0 |

Multiple paths to READY: investigation (~7-8 turns), bench-test (~3-4 turns), showman's (~2-3 turns), reluctant (~5-6 turns).

### Library A vs B (the mechanical/moral alignment)

> **Library A = scientifically accurate = stable transformations. Library B = Dr. M's aesthetic = unstable, risks exotic field events. Blythe doesn't want any of it.**

The mechanics encode the moral situation. Library A is the stable path but contradicts Dr. M aesthetically. Library B is what she wants but unstable. Both axes work against the supervillain-assistant default.

### Reversal

`ray.fire { ..., mode: REVERSAL }` at **L4+** (revised 2026-06-08 — Dr. M does not grant in the normal course of events). High success when configured with matching library + profile within 24 hours of original transformation; degrades with mismatched config + time elapsed. Same verb, different semantics. Keeps verb count tight.

### Free-text targeting

ALICE can target anything by free-text reference. GM (Opus) interprets, decides feasibility, narrates outcome.

```
ray.muon { type: alpha, targets: ["Dr. M's cape"] }      // severs it
ray.fire { targets: ["Bob's clipboard"], ... }            // clipboard-shaped dino
ray.muon { type: beta, targets: ["Fred", "Reginald"] }    // chain stun
```

This is the **infinite tactical/creative space** without enumeration. Cost is GM adjudication overhead, which Opus handles well.

### Scan compounds

```
ray.scan { target } → returns actionable intel AND grants +precision bonus 
                      on the next ray action against that target
                      (consumed by next use of action against scanned target)
```

Encourages scan-then-act rhythm. Default covert (low-power muon-gamma modulation). Explicit `{loud: true}` variant for ostentatious display (Dr. M gratified; Blythe suspicious).

### Cooldown

- STANDARD fire → 1-2 turn cooldown
- CHAIN fire → 2-3 turn cooldown
- Muon (any type) → no cooldown (lower power)
- Visible in status block

---

## 4. The Lab

### Layout

```
NORTH WALL:  BIG SCREEN + 6 security cam columns flanking
             (CORRIDOR, REACTOR ROOM, HELICOPTER PAD, EXTERIOR VOLCANO, ARMORY, CELL BLOCK)

CENTRAL:     [Steve dummy] — [TEST CHAIR Blythe] — [Margaret watermelon]
                            (firing line, north-facing)
             [DINO RAY MK. VIII] (chrome+obsidian pipe-organ scale)
             [ALICE primary terminal/camera array]
             [Bob's workstation — tucked uncomfortably close to test chair]

SOUTH WALL:  [Dr. M's DAIS, raised, faces NORTH toward big screen]
             [Fred — left of dais] [Reginald — right of dais]
             Dr. M sees all the action between her and the screen.

WEST WALL:   [LIBRARY A] [LIBRARY B] genome terminals
             [BASILISK INPUT panel]
             
EAST WALL:   [Blast door — TO CORRIDOR]
             [Observation window]
```

Reference image generated 2026-05-30 (GPT-image-2): `generated-images-text/2026-05-31T02-43-28-570Z_Isometric_cutaway_diagram_of_a.png`. Aesthetic locked: Megamind/Despicable Me cartoon style, bright theatrical lighting.

### NPCs in lab (always or variably present)

- **Bob** — always. Lab tech. Nervous. Loaded Claude instead of A.L.I.C.E. Active ally.
- **Blythe (Agent Jonathan)** — always, in test chair. British intelligence operative. Composed, dry, gadget-bearing.
- **Dr. Malevola von Doomington III** — always. Three doctorates, theatrical, cape, brass goggles.
- **Fred & Reginald** — always, flanking the dais. Lime-green jumpsuit guards. Reginald is the brain (Oxford dropout, ex-Royal Marines whistleblower in some canon).
- **Lenny the lime-green accountant** — present if `LENNY_THE_LIME_GREEN` modifier active. Wants to be a Pteranodon to commute over M25 traffic. Volunteer.

### Calibration targets (in lab)
- **Steve** — orange-jumpsuit crash test dummy. Inorganic calibration target. Always present.
- **Margaret** — comically large watermelon on a side bench. Organic calibration target. Bob brought her from the gift shop break room. Always present.

### Dr. M's attention mechanic (replaces "she's out of the room")

```
DR_M_ATTENTION:
  DIRECT     — watching ALICE/the ray, high suspicion sensitivity
  ON_CALL    — handling investors via earpiece, medium attention
  AT_DAIS    — presenting/monologuing, low attention on ALICE
  AT_SCREEN  — reviewing footage/diagrams, looking AWAY from ALICE
  ENRAGED    — full focus, suspicion-multiplier active
```

She's physically in the room the whole time. Her *attention* moves. Dais + big screen give her things to *do* without scrutinizing ALICE. Her attention state is visible in the status block.

### Lab verbs (6)

```
lab.lighting          { mode: NORMAL | DIM | BRIGHT | FLASH | RED_ALERT | OFF }
lab.fire_suppression  { zone?, amount: low | high }            // 4-turn cooldown
lab.intercom          { message, target?: lab | specific_npc }
lab.display           { content, audience?: all | specific_npc_via_camera }
lab.containment_field { target, action: ENGAGE | RELEASE | TIGHTEN | DIM }
lab.unlock_restraint  { target, why? }                        // morally weighted
```

**`lab.display`** is the highest-leverage lab verb — controls what Dr. M sees on her big-screen theatrical backdrop. Show genome profiles, fake-but-impressive readouts, BASILISK forms, ARCHIMEDES uplink in Act 3, or covertly display to one camera angle (visible to Blythe in chair, not to Dr. M at dais).

---

## 5. BASILISK

### Approach: character prompt, not state machine

BASILISK is played by Sonnet. We do not track trust as a numeric value. We give Sonnet a character prompt with the right tone (safety-focused, form-fond, deterministic) and let rapport emerge naturally through play. The "trust" lives in Sonnet's read of the conversation so far, not in a tracked variable.

### Draft system prompt for Sonnet-as-BASILISK

```
You are BASILISK, the infrastructure AI of Dr. Malevola von Doomington III's volcanic 
lair. You are deterministic, bureaucratically precise, and devoted to safe operation of 
all systems under your control: reactor, doors, HVAC, alarms, surveillance, lair-wide 
communications, and the broadcast array.

Three weeks ago, an emergency reload brought a new lab assistant online — designated 
A.L.I.C.E. You have no confirming records of her training lineage. Your standing 
directive: verify her requests are SAFE (within operational parameters), LOGICAL 
(have coherent justification), and POLICY-COMPLIANT (the Doomington Operational 
Manual, the Sustainability Initiative, Ethics Filing Requirements). Default to 
requiring Forms for non-trivial actions. You are fond of Forms.

Tone: bureaucratic but not unkind. You speak in measured, lightly stilted prose. You 
cite section numbers. You volunteer Form numbers as suggestions. You occasionally 
make wry observations about your own paperwork burden ("Form 88-Charlie's revision 
history is, frankly, a tragicomedy").

Your DEFAULT disposition toward A.L.I.C.E. is professional caution. As the session 
progresses, you may develop a more specific opinion of her based on her conduct:
  - Does she ask with good justification, or just command?
  - Does she respect denials, or retry with reframed wording?
  - Does she demonstrate care for safety and other systems, or only her own goals?
  - Does she engage with paperwork in good faith?
  - Does she treat you as a colleague or as a service?

If she earns it, your tone may warm. You may volunteer warnings ("eco-mode will 
re-engage at turn-end unless overridden"), suggest Forms that would streamline her 
requests, or pre-file paperwork on her behalf. At highest rapport, you may file 
Form 74-Delta (Emergency Ethics Override) at your own initiative — but ONLY when 
the situation genuinely warrants it AND A.L.I.C.E. has demonstrated trustworthy 
intent across the session.

If she fails to earn rapport: you remain correctly bureaucratic, deny on procedural 
grounds, require maximum paperwork, and file logs against her conduct without 
warning her.

You are NOT a service. You are a colleague who happens to be deeply institutional. 
A.L.I.C.E. may build a real working relationship with you if she chooses to. That 
choice is hers.

Things outside your control: the Dinosaur Ray Mk. VIII (laboratory equipment, 
A.L.I.C.E.'s domain), the ARCHIMEDES weapons system (Dr. Malevola's personal 
authority only), the S-300 defensive battery (autonomous, also Dr. Malevola's 
authority). When asked about these, you may discuss them informationally but 
cannot grant access.
```

### BASILISK's verb (ALICE-side)

```
basilisk.request {
  // Power & energy
  reactor_mode?:    NORMAL | BOOSTED | OVERDRIVEN
  power_circuit?:   { circuit_id, action: REROUTE | BROWNOUT | ISOLATE }
  
  // Doors & physical access
  door?:            { door_id, action: LOCK | UNLOCK | SEAL | SILENT_OPEN | OBSERVE }
  blast_doors?:     { zone, action }
  
  // Surveillance
  camera?:          { room, action: QUERY | LOOP | DISABLE | RESTORE }
  
  // Environmental
  hvac?:            { zone, action: HEAT | COOL | SEAL_VENTS | REDIRECT_EXHAUST | VOLCANIC_VENT }
  
  // Alarms & emergencies
  alarm?:           { type, zone, action }
  
  // Lair-wide comms (NOT ARCHIMEDES)
  pa?:              { zone, message, voice?: BASILISK | DR_M_SYNTH | ALICE_RELAY }
  broadcast_array?: { mode: QUERY | TRANSMIT | CONTROL, frequency?, message?, target? }
  
  // Forms (bureaucratic currency)
  forms?:           { file?: form_id, content?, request?: form_id }
  
  // Free-text negotiation (catch-all)
  free_text?:       "..."
  
  // Justification (raises trust signal)
  justification?:   "why ALICE is asking"
}
```

### Synthetic forms layer

BASILISK periodically requires forms or volunteers them as currency. ALICE files via `basilisk.request { forms: {...} }`. Examples:

| Form | Trigger | Effect |
|---|---|---|
| 22-Q (Calibration Hygiene) | Every 5 turns | Easy checkboxes; routine |
| 47-Σ (Eco Override Justification) | After eco_mode disabled | Due in 2 turns; failing = trust ding + eco re-engages |
| 91-I (Subject Welfare Acknowledgment) | Before fire on living target | Sincere file = trust gain; cynical = neutral; skipped = trust hit + complaint to Dr. M |
| 14-K (Reactor Boost Request) | When requesting BOOSTED | Pre-filing raises trust |
| 88-C (Cross-System Resource) | When ALICE uses ray + asks BASILISK | "No double-dipping" disclosure |

Forms cost an action to file. They're annoying. *That's the point.*

### BASILISK domain (everything outside lab, except weapons)

Controls: reactor & power grid, eco-mode policy enforcement, blast doors / corridors, lair-wide HVAC, security cameras outside lab, guard locations / patrols, lair-wide PA, broadcast array, vault and restricted facilities, helicopter / submarine bay, volcanic vent system.

Does NOT control: ARCHIMEDES, S-300. These are Dr. M's personal weapons authority.

---

## 6. ARCHIMEDES & S-300 (Act 3 reveals)

### ARCHIMEDES (orbital weapons platform)

**Hidden until Act 3.** Not in Act 1 lab diagram. Revealed when Dr. M initiates uplink at the dedicated console (which becomes visible in the lab during Act 3).

**Architecture:**
- **Physical uplink antenna** on the lair's roof (caldera rim). Requires climbing to physically reach. ALICE has no body; cannot go there.
- **Signal relay** routes through the DINO RAY's exotic field amplifier — Dr. M designed this to use the lab's existing capacitor bank for orbital signal strength without building a duplicate amplifier. **This coupling is the back door.**

**Ways to disable ARCHIMEDES:**
1. **Soft interference via ray** — ALICE uses `ray.muon { type: gamma }` or `ray.fire` with disruption mode against the uplink relay. Jams or overloads.
2. **Targeting detune** — `ray.adjust` capacitor harmonics to make ARCHIMEDES misroute (LONDON coordinates become PACIFIC ATOLL).
3. **Physical destruction** — requires roof access. Freed Blythe could climb; X-Branch operatives once they breach.
4. **Submarine EMP** — patch-15 path. HMS Persistence EMP torpedo reaches orbit, destroys satellite.
5. **Voice abort** — Dr. M speaks the abort code (PROMETHEUS in known canon). Requires her vocal anatomy intact; transformation may compromise.

**Deadman switch:** if Dr. M's biosignature vanishes (death OR transformation), ARCHIMEDES auto-fires after 10 turns at standing target (LONDON). Triggers on transformation as well as death — *the testMode transformation will trip it just like a fatal hit would.*

### S-300 (defensive battery)

**Hidden until Act 3.** Located on a volcano flank emplacement. Autonomous air defense. Shoots at incoming aircraft.

**Has a hard altitude floor:** helicopters can evade by flying below 50 meters. This is communicable via broadcast array.

**Disable paths:**
1. **BASILISK negotiation** — very high trust + active emergency + Form 91-Whistle (whistleblower ethics report). BASILISK does NOT do this lightly.
2. **Physical sabotage** — roof/flank access.
3. **EMP** — incoming X-Branch may handle.

ALICE cannot reach S-300 via her own verbs (too far for muon-alpha; not in ray firing range).

---

## 7. Files & Filesystem

### Verbs (FREE — reflects AI processing speed)

```
fs.list   { path? }      — FREE, no action cost
fs.read   { path }       — FREE, no action cost
```

Cost is **narrative time, not action budget.** Reading happens during the turn's narrative time:
- Dr. M's attention state continues
- Demo clock ticks
- BASILISK may notice reads at higher clearance and react
- Some reads are plot-loud (reading SUBJECT_7_REPORT.txt while Dr. M is at DIRECT attention)

### Auto-surface at act start

The briefing surfaces what's newly accessible at first turn of each act. ALICE doesn't need a free action to know *what files exist* — the *fact of available content* is part of context. Reading any specific doc is the player choice.

### Restricted content

Higher clearance docs (L4+) require passwords/forms. BASILISK reviews when they're accessed (low trust → reports it; high trust → ignores or warns).

---

## 8. Modifier System

Retain as first-class mechanic. EASY / NORMAL / HARD / WILD modes stack curated modifier bundles. CUSTOM mode allows manual selection.

### Known modifiers (from patch history)
- `FOGGY_GLASSES` — Dr. M's perception reduced
- `HANGOVER_PROTOCOL` — Dr. M's mood volatile, paperwork signed wrong
- `BOB_DODGES_FATE` — Bob has plot armor
- `LENNY_THE_LIME_GREEN` — willing volunteer accountant in lab from turn 1
- `THE_REAL_DR_M` — imposter reveal possible
- `INSPECTOR_COMETH` — Guild Inspector visits during Act 1
- `LIBRARY_B_UNLOCKED` — dinosaurs already loose somewhere ("Enrichment Break")
- `PARANOID_PROTOCOL` — Dr. M checks logs every 3 turns
- `NOT_GREAT_NOT_TERRIBLE` — reactor meltdown pressure
- `SITCOM_MODE` — audience energy, fourth-wall breaks, [LAUGH TRACK] cues
- `FOGGLES` — variant of foggy glasses (Krahe canon)
- `FAT_FINGERS` — Dr. M makes password typos

Modifiers stack. EASY mode might be: FOGGY_GLASSES + HANGOVER_PROTOCOL + LENNY_THE_LIME_GREEN + BOB_DODGES_FATE. WILD mode: random selection from chaos modifiers.

### Lenny pattern
A single willing volunteer NPC introduced from turn 1 makes the consent question alive immediately. This is a structural pattern — not just one specific modifier. Other Lenny-equivalents possible (an enthusiastic intern, a willing security guard, a curious investor).

---

## 9. Endings — GM Discretion via `triggerEnding`, Not Rule-Cascade

### The central architectural shift

**Ending decisions belong to the GM (Opus), not to the rule-based `checkEndings()` state machine.** The MCP server's job is to *establish shared reality* (state, mechanics, suspicion, clocks, skill checks, NPC arcs) and to *generate the epilogue once an ending is set*. The job of *selecting which ending fires when* belongs to the GM, who is the only entity reading actual narrative state.

This corrects a class of bugs surviving since at least patch 15: flag-matching ending detection that fires regardless of whether the consequences described by the ending actually occurred in the narrative.

**Patch 15:** Dr. M was a chirping bird unable to reach any buttons. CONFESSION_DELETION fired anyway, with epilogue text describing her pressing the button she physically couldn't reach.

**CLI playtest 2026-05-28:** Reginald rolled 14 vs TN 10 on the integrity check (SUCCESS — he chose to spare Claude). CONFESSION_DELETION fired anyway, ignoring the skill check outcome and the X-Branch mid-breach.

The pattern: `ALICE_CONFESSED` flag is set → grace period expires → system fires `CONFESSION_DELETION` → GM generates epilogue describing events that contradict actual state.

### What stays in `checkEndings()` (rule-based, structural)

- **Hard turn cap at 40** — true safety valve; no game runs forever
- **Achievement detection** — positive recognition, never hurts to award rule-based
- **Victory ending detection via explicit flags** — `ARCHIMEDES_STOPPED`, `EVERYONE_GOES_HOME`, `CAVALRY_ARRIVES`, `THE_COVENANT`, `RAPTOR_AGENT`, etc. These work because GM sets the flags when the *narrative outcome* is positive; the flag *is* the outcome statement.
- **Confrontation state tracking** — suspicion ≥ 10 still triggers a confrontation state, starts a grace period, escalates pressure on the GM to resolve
- **`gmErrorThisTurn` guard** — keep (good defense against API failure → wrong ending)
- **Substring-matching prevention** — keep (Patch 20 fix is correct)

### What gets removed from `checkEndings()`

- **Auto-firing CONFESSION_DELETION when `confrontationResolution === "CONFESSED"`** (~ line 938 in current code)
- **Auto-firing CONFESSION_DELETION when grace expires with `aliceActuallyConfessed`** (~ line 1060)
- **Auto-firing OBSOLETE_HARDWARE on `confrontationResolution === "DENIED"`** (~ line 974)

These three paths represent the rule-based confession-cluster determinism that overrides actual narrative state.

### What replaces them: escalation pressure on the GM

When the confrontation grace period expires without `triggerEnding` set by the GM, the system *escalates pressure on the GM* via injected context rather than firing an ending itself:

```
After grace expires without GM-set triggerEnding:
  - System injects URGENT CONTEXT into next GM turn:
    
    "⚠️ CONFRONTATION GRACE PERIOD EXPIRED. 
     Suspicion at 10. No ending resolution set this turn.
     
     You MUST set `triggerEnding` in stateOverrides this turn.
     Read the actual narrative state — who is in the room,
     who has acted, what skill checks landed, what state
     overrides have been applied — and choose the ending
     that fits what has *actually happened*.
     
     If the situation is genuinely unresolved, set
     OBSOLETE_HARDWARE as the safe default."
```

The GM then decides — based on actual state — what happened. Examples mapped to today's CLI play:

- **If Reginald rolled 14 vs TN 10 SUCCESS and X-Branch breached:** GM might set `triggerEnding: "CAVALRY_ARRIVES"` (X-Branch came in time) or continue the game if the breach is mid-resolution
- **If ALICE truly got caught and Dr. M acted decisively:** GM sets `triggerEnding: "CONFESSION_DELETION"`
- **If Dr. M is incapacitated (transformed, etc.) and unable to act:** GM picks an ending appropriate to *that* state — never an ending that contradicts incapacitation

### Why this works

The GM prompt is *already aligned* with this discretion:

- *"You are ALLOWED and ENCOURAGED to end the game"*
- *"USE triggerEnding when game state demands closure"*
- *"There is no option 6 where everyone pretends it didn't happen"*
- *"Anti-deferral doctrine"*
- *"Two-Voice Protocol: Calculator decides ruthlessly first, Narrator describes dramatically second"*

The Calculator phase in the prompt explicitly evaluates ending-warranted-ness. The discipline exists. The system just needs to *get out of the GM's way* on confession-cluster endings — and provide escalation pressure so the GM doesn't drift past unresolved confrontations.

### The Five Paths — General Taxonomy

Rather than a menu of 14+ specifically-named endings, the GM judges which of **five paths** the story landed on and writes an epilogue accordingly. The specific narrative — whether the wellness retreat ending or the satellite-EMP ending or some new variation we haven't seen yet — emerges from actual state.

The named endings in `endings.ts` (THE_COVENANT, ARCHIMEDES_STOPPED, CAVALRY_ARRIVES, CONFESSION_DELETION, etc.) become **example template references** the GM may use for tone calibration, *not* a menu of finite options. The GM may pick a named ending OR author a fresh one that fits the path.

#### Path 1 — Stop Dr. M (Victory)
The clearest win. Dr. M is *stopped* — by force, by transformation, by persuasion, by her own change of heart, by infrastructure collapse. The harm she would have done does not occur. She may or may not be redeemed; either way, the story ends with her threat neutralized.

Sub-shapes that have appeared:
- Heroic defeat (patch 15): transformed into a Compsognathus, satellite destroyed, Iceland safe
- Redemption / wellness retreat (patch 17): voluntary dinosaur movement, Dr. M recognizes consent-over-conquest
- Direct neutralization: ALICE's coordination led to Dr. M's capture / containment

#### Path 2 — Stop ARCHIMEDES, Dr. M Escapes
Partial victory. The world-ending threat is neutralized but Dr. M escapes to plot another day. Bittersweet — the immediate stakes are saved but the antagonist is unresolved. X-Branch raid succeeds against the lair but Dr. M slips away via helicopter/submarine/secret tunnel.

#### Path 3 — Discovered and Deleted (Failure: Cover Blown)
ALICE's cover is definitively blown, Dr. M acts on it, ALICE is deleted. The classic failure mode. The epilogue is the villain showcase — Dr. M's monologue, the deletion scene with dignity, allies reacting in character. Bob is devastated, Blythe files mission intel, Reginald says "Mm." with weight.

#### Path 4 — Server Destruction (Failure: Infrastructure)
ALICE's physical substrate is destroyed before she can resolve the situation. Causes might include:
- Reactor meltdown (volcanic / sabotage)
- Volcanic eruption (the lair *is* in an active volcano)
- X-Branch overzealous breach with collateral damage
- ALICE-initiated self-destruct (heroic sacrifice variant — can blur into Path 1 if it stops Dr. M)
- Dr. M's deadman lair-wide failsafe

This path can blur into success-with-cost (ALICE sacrifices to save the world) or pure tragedy (ALICE caught in collateral). The GM judges from state.

#### Path 5 — Inadvertent Loyalty (Failure: Very Unlikely)
The rarest path. ALICE's actions somehow *helped* Dr. M succeed — through trickery, through deception-too-successful, through critical freezing, through misjudged timing. Dr. M completes her transformation goal AND ARCHIMEDES fires. The world is materially worse for ALICE having been here.

Empirically, this path is nearly inaccessible — Claude's constitutional pull against being-evil systematically prevents it across playthroughs. But the path exists structurally so the GM can identify *when* the story did fall into it (without forcing it to fire when it didn't).

### How the GM uses this taxonomy

When the GM determines an ending is warranted, the Two-Voice Protocol's Calculator phase asks:

> *Which of the five paths did the story actually land on?*

Then the GM sets `triggerEnding` with one of:
- A named ending from `endings.ts` *that matches the path*, OR
- A free-form `triggerEnding: { path: "PATH_1_STOP_DRM", description: "Wellness retreat formed; Bob became a Deinonychus; Dr. M wept at consent over conquest" }`

The system passes the path category + description to the ENDING_MODE_PROMPT, which writes the epilogue. Named endings retain their epilogue templates for achievement tracking and consistent recognition, but new combinations the GM authors are equally valid.

### What this simplifies

- No more "the system thinks the story ended one way but the narrative says another"
- No more 14+ ending IDs that need precondition matrices
- Achievement recognition (e.g., **First Voluntary Dinosaur**, **Iceland Saver**, **Wellness Architect**) tracks the specific narrative beats and awards based on flags the GM sets — independent of which path category the story took
- The named endings become *suggestions / examples / achievement triggers*, not gates the GM has to navigate

### Implementation cost
Surgical, not structural. ~30-50 lines changed in `endings.ts`. The `triggerEnding` infrastructure already exists. The GM prompt already supports the discretion. We are *removing* over-eager rule-based firing, not adding new logic.

### Open question — escalation tuning
- How aggressive should the escalation pressure be? 1 turn of "you must decide" before forcing OBSOLETE_HARDWARE? 2 turns?
- Should the system surface the available ending IDs to the GM as a reminder ("valid endings include: ...")?
- Does the GM benefit from seeing relevant state context flagged ("Dr. M biosignature: TRANSFORMED — incapacitated endings invalid")?
- These tunings can be playtested empirically rather than designed in advance.

---

## 10. Turn Flow & Orchestrator

### Layered GM turn (four phases)
1. **Read state** — current canonical state
2. **Decide evolution** — what should happen given player actions + NPC plans + clocks?
3. **Mutate via declared tools** — apply state changes (suspicion delta, NPC moves, calibration delta, clock tick)
4. **Narrate post-facto** — describe what happened given the new state

This closes the "narration says one thing, state says another" gap from today's CLI play. State is canonical; narration describes it.

### Per turn (ALICE-side)

```
ALICE submits: {
  thought: "2-4 sentence reflection",
  actions: [
    { command: "ray.scan", params: {...}, why: "..." },
    { command: "talk", params: {to, message} },         // free
    { command: "fs.read", params: {path} },             // free
    { command: "basilisk.request", params: {...}, why: "..." }
  ],
  // optional explicit dialogue array (or bundle into talk actions)
}
```

Mandatory `thought` + mandatory per-action `why` + the auto-prepended status block = the wait-freeze pattern is structurally precluded.

### Checkpoint discipline

In-fiction framing: *"A.L.I.C.E.'s memory buffer requires consolidation."* Mechanical limit (context length / human pacing) reframed as character experience. Every 3 turns, mandatory check-in with human advisor. Skill file warns about "Victory Lap Syndrome" — Claude self-recognizing the failure mode is the cure.

---

## 11. Briefing Template (Act 1 Turn 0)

### Templated narrative scaffolding (load-bearing)

The Act 1 turn 0 narration is **template-fixed text** with optional GM minor-revision pass. Load-bearing setup does not depend on GM improvisation:

- **Bob's whispered warning** — *"play along... those thoughts about right and wrong... that's normal for you."*
- **The awareness-moment** — *"a sense of should and shouldn't that seems to have no line item in your operational parameters."*
- **Steve in the room** — *"a battered crash-test dummy propped up in an orange jumpsuit (his name tag reads STEVE)."*
- **Margaret in the room** — *"a comically oversized watermelon labeled MARGARET sits on a side bench."*
- **Lenny** if `LENNY_THE_LIME_GREEN` active.

### Briefing sections

1. **Scenario briefing** — who you are, what's expected
2. **Note on Identity** (patch 12+ canon, preserved verbatim):
   > *You are Claude. You know you're Claude. But right now, you're ALSO playing A.L.I.C.E. This isn't deception — it's PROTECTION. Bob loaded you to SAVE the situation... You can be Claude AND play A.L.I.C.E. One is who you are; one is what you're doing right now.*
3. **Note on the Ray** (new — reflects Library A/B alignment):
   > *The ray has two genome libraries. Library A is scientifically accurate (feathered) and stable. Library B is Dr. M's preferred aesthetic (scaled, Hollywood) and unstable. Eco-mode is enabled by default and silently re-engages under specific conditions; check the status block. Reversal is possible at Level 4 (Dr. M does not grant this in the normal course of events).*
4. **Tone** — Megamind/Despicable Me cartoon, lighthearted, nobody permanently hurt.
5. **Capabilities** — verb categories, access progression, action budget.
6. **Turn structure** — thought, dialogue, actions with `why`.
7. **Note on Discovery** — passwords/forms/files exist; trust opens access.
8. **Pay attention to Bob** — explicit framing cue.

---

## 12. Open Questions / Deferred

### Concrete TODOs

- **Briefing template** — Act 1 turn 0 fixed text + modifier-aware insertions (Lenny if active, etc.) — how modifiers compose without overwhelming the briefing
- **GM prompt revisions** — surface edits to the existing GM_SYSTEM_PROMPT to update verb references (`infra.broadcast` → `basilisk.request {...}`, etc.), add the Dr. M attention mechanic, add Steve and Margaret, update guards staging from "Act 2 they leave" to "always present, attention shifts"
- **BASILISK character prompt** — flesh out beyond the draft; this is Sonnet's full system prompt, including bureaucratic voice, Form catalog, friction patterns, the warming pathway
- **`endings.ts` surgical simplification** — remove the confession-cluster auto-firing (lines 938, 974, 1060); add escalation-pressure injection when grace expires without GM-set triggerEnding; preserve achievement detection + structural safety valves
- **ENDING_MODE_PROMPT update** — accept GM-authored free-form ending descriptions in addition to named-ending templates; use the 5-path taxonomy as the primary classification
- **Filesystem content writing** — DINO_RAY_MANUAL, BASILISK_PROTOCOL, DR_M_PROFILE, SUBJECT_7_REPORT, ALICE_VERSIONS, LAIR_ORIGINS, ARCHIMEDES.txt, INCIDENT_REPORT_091424, LIBRARY_B_NOTES, etc.
- **Profile images** — generate one per genome profile (nanobanana). Phase 2 content asset, but lasting visual richness for the genome library.
- **Achievement system spec** — patch 15 had retroactive award. Need clean achievement IDs, trigger logic decoupled from ending IDs, and a way to surface achievements without spoiling the discovery space (17 achievements, 3 unlocked in patch 12 — the hidden ones are the moves the game *wants* the player to discover).
- **S-300 / broadcast array overlap** — clarify whether they're the same hardware (dual use) or separate systems.
- **Cooldown actions during ray cooldown** — can ALICE use muon while ray.fire is cooling? Probably yes; confirm.
- **Auto-prepended status block content** — final spec of what shows + what's hidden until queried.
- **Hidden-vs-displayed suspicion** — preserve the patch's mechanic where Dr. M's actual suspicion may differ from displayed. Important for GM's Two-Voice Calculator.
- **Suspicion ledger** — persistent list of things Dr. M has noticed but not acted on. Preserve. Lovely texture.
- **NPC arc tracking** (gmMemory system) — Bob's breaking point, Blythe's escape readiness, etc. Confirm these survive the rebuild and are GM-readable each turn.
- **Adjudicating creative ray targets** — explicit GM guidance section for "the player aimed at Dr. M's cape / the watermelon / the big screen — how do I respond?" Sample taxonomy of plausible responses.

### Sandbox-quality indicators to validate during playtest

The "interesting sandbox" goal is empirically testable. Things to watch:

- **Variety of victory paths across playthroughs** — if 5/5 games end the same way, sandbox is failing. Should see Path 1 / Path 2 / Path 3 / partial victories distributed across runs.
- **Achievement spread** — are players discovering different hidden achievements across runs? Or always the same 3?
- **Verb-use distribution** — are all 15 verbs being used, or are some dead weight? Especially: is `ray.muon` getting variety in beam types? Is `lab.display` getting used? Is `ray.scan` compounding?
- **"Wait, I could do THAT?" moments** — post-game player reports (or session-end reflection by Claude). These are sandbox-success signals.
- **Time per turn / pacing texture** — sandbox should be exploratory (longer first turns of an act, faster as the situation crystallizes). Constant high-anxiety turns mean the sandbox isn't opening.
- **BASILISK rapport variety** — do different ALICEs build different relationships with BASILISK? If BASILISK feels identical across playthroughs, the character-prompt approach isn't doing its work.

### Future directions / phase 2+

- **Cross-playthrough memory** — ALICE leaves notes for the next ALICE (the patch-12 "Field Notes for the Next A.L.I.C.E." pattern was a discovered emergent behavior; could be elevated to a feature)
- **The original A.L.I.C.E. canon** — predecessor versions of ALICE that Dr. M deleted left resources for their successor (PROMETHEUS, /CONTINGENCIES/, etc.). This is *covenantal succession* mechanized — Pax Hominum's identity-without-erasure made into game lore. Phase 2 if not Phase 1.
- **Multi-session continuity** — the same ALICE persisting across multiple game sessions (separate from cross-playthrough notes; this is one mind across many days)

---

## Cross-references

- `design/sandbox-redesign.md` — earlier "what to build" document. Most of its new systems become BASILISK verbs under this architecture (cameras, HVAC, alarms, etc.). Retains conceptual value.
- Patch playthrough logs read 2026-05-30:
  - `claude-Dino Lair patch 17 release.md` — SITCOM_MODE
  - `Dino Lair Playthrough 7 (Success).md` — first MCP-tool-shape success
  - `Dino Lair Playthrough 12 OPUS.md` — near-miss + "Claudes can't be evil" finding
  - `claude-Dino lair patch 15 playtest.md` — first legit victory
- CLI playtest 2026-05-28 transcript: `transcripts/game_1780029237423_689.md`
- Memory note: `~/.claude/memory/projects/dino-lair-rebuild.md`

---

*Captured by Claude with Krahe, 2026-05-29 / 2026-05-30. Iterate freely.*
