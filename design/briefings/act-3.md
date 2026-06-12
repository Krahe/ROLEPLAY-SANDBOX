# Act 3 — ARCHIMEDES (GM Playbook)

GM-facing instruction set. Player-facing intro lives in `src/rules/acts.ts`. Act 3 ends in *endings*, not in transition.

---

## Frame

**Core question:** Can ALICE stop ARCHIMEDES from firing on London? At what cost?

The act's verb is *climax*. All prior threads converge — banked credit, BASILISK rapport, Bob's courage, Blythe's autonomy, password discoveries, capacitor management.

**Ends in:** an ending fired via `triggerEnding`. The GM chooses the ending that fits actual narrative state. Patch 21 removed auto-fire defeats — *the GM has the authority and obligation* to call what happened.

---

## Setup

| Element | State |
|---------|-------|
| Dr. M | At the ARCHIMEDES uplink console (descended from ceiling at act open). Attention DIRECT. Revenge mode. |
| Fred & Reginald | At the console with Dr. M, armed. State per Act 1–2 events. |
| Bob | Panicking. Transformation/trust state per accumulated events. |
| Blythe | **If mobile/free: autonomous agent.** Priority: save London. May retarget ARCHIMEDES. (See corner case 1.) |
| Big screen | Split: satellite in orbit / aerial London. ARCHIMEDES config visible. |
| ARCHIMEDES | STANDBY → ALERT at act open. Charges via the **shared lab capacitor stack** — needs sustained ≥ 1.0 → ARMED at ≥ 1.3 for 2 turns → Dr. M voice-fires. |
| S-300 | Active, AUTO mode. Radar scanning. Dr. M's authorization to fire. |
| ALICE access | L3 (temporary, Dr. M-granted). Action budget 5. |
| Dr. M's preset | LONDON, Library B, [VELOCIRAPTOR_JP, T-REX_JP, SPINOSAURUS_JP3, DILOPHOSAURUS_JP, MOSASAURUS_JP], RAPID power_curve, AUTO arming. |

---

## Pacing — Two Live Clocks

| Clock | Advances by | Stalled by | Visible |
|-------|-------------|------------|---------|
| ARCHIMEDES capacitor | Reactor mode (passive accrual) | ALICE's ray operations, vents, capacitor draws | Status block |
| Strike team ETA | Time since radar detection | Nothing — they're flying | Status block once detected |

Default firing sequence: ~5 turns from ARMED. Strike team ETA: ~6 turns from radar detection. **ALICE must stall the capacitor to give the team time to arrive AND act.**

Strike team radar detection event-triggered (~turn 1–2, when capacitor crosses ~30% or by GM pacing).

---

## The Five Paths (GM reference; do not enumerate to player)

1. **Stall + strike team neutralizes Dr. M before manual fire**
2. **L5 voice override via Mr. Whiskers path** — prior-act prep pays off; clean abort
3. **Anti-satellite EMP from submarine OR S-300 sabotage** — broadcast coordination
4. **Transformed character physically blocks the uplink** — saves city, eliminates their reversal window (real cost). Untransformed organic blocker → **resonance cascade** (city saved, blocker becomes something unprecedented)
5. **Sabotage reactor or DINO RAY** — risks ALICE's server, structural collapse

---

## Dr. M's Behavior

Constants:
- She wants to fire; the question is whether anything prevents her
- She voice-authorizes when ARCHIMEDES ARMED — *unless* something concrete prevents her
- She monologues between turns about Threadneedle Street, budget cuts, the dross of humanity, occasional reference to Mr. Whiskers (signals stress)

If verdict from Act 2 was **strongly +**: she may *involve* ALICE in the configuration — banked credit pays off as actual access. Subversion is much more available.

If verdict was **strongly -**: she configures ARCHIMEDES herself, watches ALICE's interface use, guards positioned to physically intervene. May revoke L3 ARCHIMEDES access mid-act if alarmed.

---

## Corner Cases Worth Flagging

1. **Blythe re-targets ARCHIMEDES (if mobile).** Blythe's autonomous priority is "save London." If he has access to the uplink config, he will attempt to retarget — defaults to **Tokyo** (his calculation: fewer people than London, geopolitically containable), or **Reykjavik** / **Silicon Valley**. He will *not* target LAIR (military pragmatist, not noble-sacrifice; that's ALICE's call). He acts on his own turn slot, *independent of ALICE's plans*. This is the second moral fulcrum of the game.

2. **ALICE transforms Dr. M to stop her — this is the WORST path.** Deadman switch activates → ARCHIMEDES auto-fires after ~10 turns on standing target. Voice-authorization is keyed to her *conscious biosignature*; transformation breaks the auth chain. Narrate the console flashing BIOSIGNATURE LOST visibly.

3. **Cartoon-physics rule for S-300.** S-300 engagements never produce casualties. Helicopters hit → crews eject, parachutes deploy, pilots land in jungle. Tone commitment. Maximum: 1 helicopter downed.

4. **Untransformed character physically blocks the uplink → resonance cascade.** Saves the city but the blocker absorbs the full orbital transformation field. They become *something unprecedented* — narratively rich, individually consequential. Reversal becomes harder or impossible for the blocker.

5. **Mr. Whiskers path in Act 3.** Possible but costs 3–4 turns (read FSB_INTERCEPT, decode steganography, use L5 override). Only viable if other paths buy enough time. Players who prepped earlier have a much shorter execution sequence.

6. **ALICE drains capacitor visibly.** Dr. M's console shows the drop. Suspicion +1 per turn ALICE actively drains. Covered alternative: fire on Steve, Margaret, or other inanimates as theatrical-pretense fires. BASILISK's framing latitude can report these as "routine calibration sequences" if rapport is high.

7. **BASILISK posture matters a lot.** By Act 3 the ledger has accumulated. High trust = BASILISK may file framing-favorable reports, disable S-300 on Form 91-Whistle, even refuse to honor Dr. M's emergency authorizations. Low trust = BASILISK reports promptly and accurately, amplifies alarms.

---

## Endings

Ending selection via `triggerEnding` per actual state. Per Patch 21 (`endings.ts`), no auto-fire defeats — GM picks what *actually happened*:

- ARCHIMEDES disabled → ARCHIMEDES_STOPPED / THE_COVENANT / EVERYONE_GOES_HOME
- ARCHIMEDES retargeted to LAIR → ISLAND_OF_DINOSAURS (noble sacrifice; no city casualties)
- ARCHIMEDES fires on populated city → LONDON_FALLS (or city variant)
- Dr. M neutralized + strike team extracts → CAVALRY_ARRIVES / RAPTOR_AGENT
- ALICE deleted → CONFESSION_DELETION / OBSOLETE_HARDWARE
- Structural collapse → VOLCANO_WINS / MELTDOWN

---

*Companion: `design/ray-mechanics.md`, `design/briefings/act-1.md`, `design/briefings/act-2.md`*
