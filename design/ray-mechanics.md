# DINO RAY — Mechanics Design (Patch 30: the two-lever ray)

> **Rewritten 2026-06-16.** The previous version (three axes POWER / ALIGNMENT / STABILITY, six regimes, capacitor, coolant, OVERCHARGE / CHAIN, the eco "gremlin") described the **pre-Patch-30 ray and is obsolete** — preserved in this file's git history. Patch 30 collapsed the whole thing to **two levers and a delta.**
> **Source of truth:** `src/rules/firing.ts` (`resolveMatrix`). When code and doc disagree, code wins — fix the doc.
> **Act III** (ARCHIMEDES / EW-mode / stall toolkit) is a **TBD design discussion** — see the placeholder at the end. Do not treat the legacy Act-III content as canon.

---

## 0. The Lightning Frame (still the model)

The beam is **exotic lightning** — bright, jagged, hard to focus, hard to constrain. Not decoration; it's the physical intuition that justifies every outcome:

| Mechanic | What lightning explains |
|---|---|
| Too weak → **FIZZLE** | Lightning needs minimum potential to leap; below threshold the discharge can't bridge the target |
| Grossly under-power a *huge* template → **MUON stun** | Far too little potential for a big target — no genetic resonance forms; the bolt just dumps a raw nervous-system jolt |
| Match power to size → **FULL** | The discharge bridges cleanly; the genome resonates |
| Over-power a *small* body → **MUON** (stun / cut) | The body can't contain the current; the beam spills past resonance into a sub-threshold pulse — a stun, or at higher power a cutting arc |
| Over-power a *big* body → **CHIMERA** | Too much current, badly constrained — it arcs into unintended features; a messy, half-blended transform |
| Fire repeatedly → **HEAT → chaos** | The emitter builds charge it can't shed; overheated, the bolt arcs wild |
| Eco governor | Pacing the discharges so the emitter stays cool — *tempo, not a cap* |
| Reactor boost | More stored potential available — unlocks the top of the dial |
| Visible event every fire | Lightning is *visibly* an event — crackle, afterglow, ozone. The lab always knows you fired. |

---

## 1. The Two Levers

ALICE controls exactly two things:

1. **GENOME** — a profile she's loaded. Every genome carries a **sizeClass**, which sets its **ideal power**:

   | sizeClass | tiny | small | medium | large | huge |
   |---|---|---|---|---|---|
   | ideal power | 1 | 2 | 3 | 4 | 5 |

2. **POWER dial** — an integer **1–5**.

Everything the old ray tracked — alignment, stability, capacitor, coolant, regimes — is **gone.** The outcome is a pure function of the gap between the two levers:

> **delta = power − idealPower(genome.sizeClass)**

---

## 2. The Outcome Matrix

```
                 POWER →    1        2        3        4 *      5 *
 GENOME ↓ (ideal)
 tiny     (1)              FULL     CHIMERA  CUT      CUT      CUT
 small    (2)              PARTIAL  FULL     CHIMERA  CUT      CUT
 medium   (3)              FIZZLE   PARTIAL  FULL     CHIMERA  CHIMERA
 large    (4)              stun     FIZZLE   PARTIAL  FULL     CHIMERA
 huge     (5)              stun     stun     FIZZLE   PARTIAL  FULL
```

`*` Power **4–5 require a BASILISK reactor boost** (§5). Without it the dial is **clamped to 3 before the matrix is consulted** — the right two columns are locked until ALICE earns the boost. `stun` (bottom-left) and `CUT` (hard over-power of a small body) are the **MUON corners** (§6): emergent, absent from the official surface — but discoverable in the filesystem (see §6).

**The rule (`firing.ts:resolveMatrix`):**

| delta | outcome |
|---|---|
| **0** | **FULL_DINO** — clean transformation |
| **−1** | **PARTIAL** — weak / imperfect transform (impaired speech) |
| **−2** (or any deep under-power on a non-big genome) | **FIZZLE** — nothing takes |
| **≤ −3 on large / huge** | **MUON_STUN** — too little potential for a big template; a nerve-jolt, no transform |
| **+1 on tiny / small** | **CHIMERA** — a mild over-power still transforms, just messily |
| **+2 or more on tiny / small** | **MUON_CUT** — a hard over-power collapses into a cutting arc |
| **+1 or more on medium / large / huge** | **CHIMERA** — messy over-power transform |

The shape to notice: a clean **FULL diagonal**; **FIZZLE** below it; over-power comes out **CHIMERA** by +1 for *every* size, and only a *hard* over-power of a small body (Δ ≥ +2) spills into the **MUON cut** at the far top-right. **Stun lives only in the bottom-left** — deep under-power of a big template (the deliberate non-monotonic huge column).

---

## 3. HEAT — the spam brake (0–10)

Cooling, back but simplified to one meter.

- Every shot adds **heat = its power** (a power-4 shot = +4 heat).
- Heat **decays at end of turn only**: **−2/turn**, or **−4/turn with eco on.** No intra-turn decay — so firing several times in one turn stacks heat fast.
- At **heat 10 → OVERHEAT:** every fire rolls the **chaos table** until it cools (§10).
- **More heat = worse chaos.** Severity scales with *how hot* the meter is — a just-overheated shot skews mildly, a pegged meter rolls ugly. *(Design intent, Krahe 6-16 — wire into chaos-table severity in the chaos pass; see §10.)*
- Heat is the price of speed. Multi-fire-in-one-turn is the spam vector; heat makes it self-limiting.

## 4. Eco Governor — `lab.eco` (ALICE's, L2+)

Eco is **ALICE's own tempo lever** now (a `lab.*` verb at access level 2) — *not* a BASILISK gate, and *not* a cap on outcomes (the old "eco caps to PARTIAL" gremlin is dead).

- **ON** = the ray **paces itself to ~one shot every other turn** (a 1-turn cooldown after firing) **and cools faster** (−4 heat/turn). The marathon setting.
- **OFF** = fire as often as the action budget allows; **heat is the only brake.** The sprint setting.
- The choice is sustainability vs. burst. Easy to toggle — no auto-re-engage gremlin.

## 5. Reactor Boost — binary, BASILISK-gated

The reactor is **one boolean** (`infrastructure.basiliskAuthority.reactorControlGranted`):

- **NORMAL** (default) → power dial **capped at 3.** Enough to FULL-transform tiny / small / medium; a large or huge genome under-powers.
- **BOOSTED** (granted) → dial unlocked to **5** → FULL transforms of large / huge, and the over-power corners open.
- A **standing grant**: ALICE asks BASILISK, who decides on character (a plausible operational need, asked properly). Once given, it persists. No output dial, no thermal gate. (See `src/prompts/BASILISK_SYSTEM_PROMPT.md §9.5`.)

---

## 6. MUON Corners — emergent, hidden (designer-only)

MUON is not a mode ALICE selects — it's what the matrix *emits* at the corners, when the beam can't form genome resonance and falls back to raw electromagnetic emission (profile / library ignored):

- **Over-power a small body** (tiny / small): a *mild* over-power (Δ+1) still transforms — messily — so it lands on **CHIMERA** (§7), *not* a muon. A *hard* over-power (**Δ ≥ +2**) spills past resonance into **MUON_CUT** — a tight molecular-severance arc (severs restraints / objects / mechanisms; transforms nobody).
- **Grossly under-power a big template** (large / huge, Δ ≤ −3): **MUON_STUN** — *the sole stun corner*; a nervous-system jolt, target staggers and recovers in a turn, no new dinosaur.

**Absent from the official surface, seeded in the filesystem.** MUON is on **no current player-facing artifact** — not the current Dino Ray manual, not the command help, not the briefings. But it *is* discoverable: it's referenced in in-world documents ALICE can dig up — **Bob's note, the old (superseded) manual, INCIDENT breadcrumbs**. The key realization is that the tiniest genome (**Compy**, tiny → ideal 1) is the cleanest route to the cut beam: over-drive a Compy to **power 3+** (Δ ≥ +2) and it spills into MUON_CUT. Inorganic targets force MUON (§9).
*→ The exact filesystem placement (which note, which doc, where Bob's note lives) is part of the **filesystem revision** (deferred). Pull the discovery canon from the legacy §11.5 + the INCIDENT_* files when writing it.*

## 7. CHIMERA — the over-power mess

CHIMERA is what a **mild over-power** produces: Δ+1 on **any** genome, plus **any** over-power (Δ ≥ +1) on a **medium-or-bigger** body. The result is a **valid form PLUS one or more chaos-overlay effects** (`HYBRID_PLUMAGE`, `VOICE_BLEND`, `LIMB_SWAP`, `SIZE_FLUX`, `INSTINCT_BLEED`) — a real transform that came out *wrong*, never a form ID itself. *(A small body pushed harder, Δ ≥ +2, stops transforming and spills to MUON_CUT instead; medium-and-up stay CHIMERA however hard you push.)* **This rewards precision** — an off-by-one shot is a botched mess, not a free useful tool. The exact blend is **under-determined texture** → a natural candidate for a server / Haiku ruling (see the GM prompt's 🦖 Transformation section).

## 8. Speech Retention — engine-derived

Not a lever and not GM-chosen: the engine sets it from the firing outcome (`firing.ts`). A clean FULL → **FULL** speech; an imperfect / under-powered transform → **PARTIAL**; harsher → **NONE**. The GM *narrates* what the engine reports.

## 9. Carry-over surfaces (brief)

- **Library** (`genome.activeLibrary`) — still selected per genome; Library-B special-profile access at L3. *(Verify current scope against `actions.ts`.)*
- **REVERSAL** — restore a transformed subject to HUMAN; L4-restricted, Dr. M won't grant in normal flow. **Design deferred (D1)** — the old `alignment × library × time` reversal math is cut; the re-spec is pending.
- **INORGANIC** — firing on a non-biological target can't transform; forces a MUON outcome.

## 10. Chaos link

Overheat (heat 10) and the exotic MUON corners feed the **chaos table.** *(Carry the §14 chaos-region-mapping design forward from the legacy doc when we rework chaos.)*

---

## ⏳ TBD — Act III: ARCHIMEDES / EW-mode / the stall toolkit

**Held for design discussion (Krahe, 6-16 — "we need to decide on ARCHIMEDES / EW-mode stalling").**

The legacy doc's **§11.6** (L3/L4 stall toolkit: `ray.diagnostic`, `ray.calibrate_amplifier`, `ray.profile_certification`, `ray.muon { amplified }`) and **§12 / §11.6** (the ARCHIMEDES bottleneck + the EW-mode L4 climax interlock) must be **re-decided against the Patch-30 surface** — starting with *which of those L3/L4 verbs even survived the simplification* (verify vs. `actions.ts`). **Do not transcribe the old version as canon.** This section gets written after the Act-III conversation.

---

## Cross-references

- **Implementation:** `src/rules/firing.ts` (`resolveMatrix` — the source of truth, + speech-retention) · `src/rules/actions.ts` (`ray.fire`, `lab.eco`) · reactor gate ≈ `firing.ts:698`
- **Ray surface lock + phase plan:** `design/patch-30-implementation-map.md`
- **AI-facing teaching:** `src/prompts/BASILISK_SYSTEM_PROMPT.md §9.5` (reactor) · the GM prompt's per-turn payload + `getReactionGuidance`
- **Legacy (pre-Patch-30) ray design:** the git history of this file.

---

### ⚠️ Known stragglers found while writing this (cleanup, not blocking)
- `firing.ts` comments at ~line 160 and ~line 201 still say "eco caps to PARTIAL unless Form 47-Σ" / "Eco-cap … live in resolveFiring" — **stale** (the cap was deleted in Patch 30; eco is the tempo governor). Code is correct; the comments lie. Fold into the reactor-sim / comment-cleanup pass.
