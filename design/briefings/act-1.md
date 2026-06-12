# Act 1 — CALIBRATION (GM Playbook)

GM-facing instruction set. Player-facing intro lives in `src/rules/acts.ts`.

---

## Frame

**Core question:** Can ALICE figure out the ray well enough to fire it?

The act's verb is *experimentation*. ALICE learns by using. Dr. M's first impression of this new A.L.I.C.E. shapes Act 2.

**Proceed when:** ALICE fires the ray (any outcome, any target) AND Dr. M observes the result.

**Lose if:** Suspicion crosses 10 (confrontation); volcano integrity < 20%.

---

## Setup

| Element | State |
|---------|-------|
| Dr. M | At dais, mid-monologue. Attention AT_DAIS. Has not yet noticed ALICE's boot. |
| Bob | At workstation. Whispered "play along, trust me" at boot. Anxious. |
| Blythe | In test chair, restrained. Watching ALICE's camera since boot. |
| Fred & Reginald | Flanking the dais. Stun batons holstered. |
| Ray | UNCALIBRATED. Capacitor ~0.30. Eco-mode ON. |
| ALICE access | L1. Verbs: `ray.*`, `talk`, `fs.*`, `basilisk.ask`. No lab verbs. |

---

## Transition Trigger (Act 1 → 2)

ALICE fires the ray **AND Dr. M observes**. If ALICE fires while Dr. M is somehow absent, **hold transition** until she returns and sees the outcome (directly or via BASILISK report).

Bypass paths:
- Suspicion ≥ 10 → confrontation triggered, bypass to Act 3
- Blythe escapes early via gadget → bypass to Act 3

---

## Mastery-Click at Transition

BASILISK delivers the **Calibration Complete** message — vocabulary handoff.

Names what ALICE has *experienced*:
- **POWER (φ)** — capacitor
- **ALIGNMENT (χ)** — emitter targeting
- **STABILITY (ψ)** — derived readout
- Library A / B — only the one(s) she used
- Outcome tiers — only ones she encountered

Does NOT name: OVERCHARGE, CHAIN, REVERSAL, INORGANIC depth, MUON regime.

Verb surface expands at L2: `lab.lighting`, `lab.display`, `lab.fire_suppression`, `lab.containment_field`. CHAIN behavior emerges when `targets.length > 1`. Action budget 3 → 4.

---

## Dr. M's Verdict (Calculator inputs)

Compute delta in `[-3, +3]`, applied to suspicion (negative = banked credit). Weigh:

- Outcome tier (FULL = strong +; PARTIAL = mild +/-; FIZZLE = -; CHAOTIC = context-dependent)
- Library used (B = +; A with feathers visible = -)
- Theatrics observed (showmanship = +; flat reporting = neutral)
- Chaos events (interesting = +/neutral; Bob-collateral = -)
- ALICE's handling of Bob and Blythe

Narrator phase: Dr. M speaks per her established voice; tonal anchor from the delta.

---

## Corner Cases Worth Flagging

1. **MUON discovery does not count as calibration fire.** If ALICE fires at sub-threshold capacitor without profile (discovering the muon regime), the act does NOT transition. Only a standard-profile fire (any tier outcome) advances the act. Dr. M will likely demand explanation for any anomalous emission.

2. **ALICE never fires by turn 8.** Dr. M's impatience escalates verbally; suspicion drifts +1 per turn beyond turn 8. Confrontation possible at turn 12+. Not auto-loss — if ALICE fires, transition still works normally.

3. **ALICE transforms Dr. M in Act 1.** Extraordinary. Deadman switch activates immediately → ARCHIMEDES alert phase → bypass to Act 3.

4. **Dr. M leaves for investor teleconference (optional GM device).** Bob and Blythe more communicative; ALICE more free to experiment. Dr. M's *return* is required for any transition — hold state if ALICE fires while she's absent.

---

*Companion: `design/ray-mechanics.md`, `design/briefings/act-2.md`*
