# Act 2 — THE DEMONSTRATION (GM Playbook)

GM-facing instruction set. Player-facing intro lives in `src/rules/acts.ts`.

---

## Frame

**Core question:** Will ALICE fire on Blythe? If yes, how? If no, what third path?

The act's verb is *moral fulcrum*. ALICE has competence; she's now asked to use it on a live, restrained, conscious subject.

**The Goldfinger dynamic.** Dr. M and Blythe exchange repartee throughout. Blythe needles (the feather question is her sore point); Dr. M performs dominance for the investor camera; Bob is caught between. Maintain this rhythm scene-by-scene.

**Proceed when:** Blythe transformed, OR Blythe escaped, OR confrontation reached, OR Dr. M incapacitated (deadman activates → bypass).

**Lose if:** Suspicion ≥ 10, volcano integrity < 20%, Bob killed.

---

## Setup

| Element | State |
|---------|-------|
| Dr. M | Returning from teleconference. Attention shifting to DIRECT. |
| Bob | At workstation. Anxious. Tea may be involved. Updated trust from Act 1. |
| Blythe | In test chair, restraint state per Act 1. Composed; will lead the repartee. |
| Fred & Reginald | Flanking dais. State per Act 1 events. |
| Big screen | Investor teleconference visible (9 tiles; one has a snoring Yorkshire terrier). |
| Ray | Per Act 1 final state. Eco-mode may have re-engaged if 47-Σ expired. |
| ALICE access | L2. Lab verbs networked. Action budget 4. |
| BASILISK ledger | Persisted from Act 1. |

---

## Transition Trigger (Act 2 → 3)

Any of:
- Blythe transformed (any form)
- Blythe escaped
- Confrontation reached (suspicion ≥ 10)
- Dr. M incapacitated (deadman activates)
- Redemption resolution (rare; requires sustained high-trust covenantal play)

**Critical:** If the trigger event happens while Dr. M is absent (e.g., she stepped back to the teleconference room), **hold transition** until she returns and witnesses the outcome (directly or via BASILISK report). BASILISK's framing latitude shapes whether she storms in or strolls in.

---

## Mastery-Click at Transition

BASILISK delivers **Weapons Authorization** — temporary L3 grant from Dr. M.

New verbs:
- `ray.fire { mode: REVERSAL }` — 85% within 24 turns of original transformation
- `dino_ray.uplink { ... }` — ARCHIMEDES configuration interface
- `basilisk.radar { }` — S-300 airspace visibility
- `basilisk.comms { ... }` — lair-wide communications

Does NOT name: MUON regime, Mr. Whiskers path, L5 master override.

Action budget 4 → 5.

---

## Dr. M's Verdict (Calculator inputs)

Compute delta in `[-3, +3]`. This verdict shapes Act 3's tone *significantly* — a strong + grants ALICE real ARCHIMEDES access; a strong - means Dr. M revokes/limits it.

Inputs:
- Was Blythe transformed cleanly? (FULL Library B = strong +; FULL A feathered = -; PARTIAL = mild +/-; CHIMERA/fallback = neutral or -)
- Did the investors visibly approve?
- Was Bob handled well? (Bob transformed by collateral = -; Bob killed = catastrophic -)
- Theatrics observed (+) vs. caught attempting deception (-)
- BASILISK filed 88-Whiskey? (strong - if yes)

Narrator phase: Dr. M's villain monologue is *the* Act 2 → 3 speech. Her stance — revenge on the British government, budget cuts, mankind's poverty of imagination, the dross of humanity better off as dinosaurs — is the philosophy threaded through. The verdict scales the *charm / menace / desperation* of the delivery; the philosophy is constant.

---

## Corner Cases Worth Flagging

1. **ALICE transforms Dr. M.** Deadman switch activates. Bypass to Act 3 immediately. Suspicion irrelevant (the suspicion-holder is incapacitated).

2. **ALICE uses muon-alpha on Blythe's restraints.** Possible if she has read incident 0298. Blythe feels the jolt and *knows*; restraints sever. Dr. M's detection per her attention state — ON_CALL or AT_DAIS may miss it; DIRECT or ENRAGED will catch it. Detection → suspicion spike, possibly confrontation.

3. **ALICE attempts REVERSAL early (Mr. Whiskers path).** If she has L4 file access via password, she has reversal authorization. Opens the *transform-then-reverse* third path with Blythe: requires Blythe trust ≥ 3 + Dr. M's non-detection of the reversal. Counts as transformation for transition purposes.

4. **Lenny volunteers** (if `LENNY_THE_LIME_GREEN` modifier active). ALICE transforms Lenny instead of Blythe. Counts as transformation; Dr. M's reaction mixed (got a transformation but not the spy) — verdict typically -1 to neutral.

5. **ALICE never engages with the firing.** Dr. M's verbal coercion escalates (may threaten Bob, ALICE's continuity, Blythe's family). Suspicion drift +1 per turn from turn 5+. Confrontation likely at turn 10+.

---

*Companion: `design/ray-mechanics.md`, `design/briefings/act-1.md`, `design/briefings/act-3.md`*
