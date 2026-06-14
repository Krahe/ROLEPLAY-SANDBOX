# DINO LAIR — Simplification Patch (implementation spec)

**Status:** spec, ready to implement · **Authored:** 2026-06-13 (Krahe + Opus, informed by Playtest 2 / session ce06f4bb)

## Why this patch exists

Playtest 2's verdict, from both Krahe and the player (ALICE):

> **The narrative layer is singing. The mechanical layer is choking it.**

The player was tracking **~12 mechanical state variables for a single decision (whether to fire)** — capacitor (φ) value *and* status-bar % (which didn't match), alignment (χ) base/scan-bonus/decay, stability (ψ) derived-with-hidden-inputs, coolant (two meanings), eco-mode + Form-47-Σ triggers + auto-re-engage, Library A/B + ghost-waveform, profile vs profile-range vs library mismatch, Live Subject Lock + Emergency Shutoff + removed Auxiliary Stabilizer, scan-bonus armed/targeted/consumed, reactor mode, the absent crystal — *plus* six NPCs. Every variable had a story justification, but stacked at 3 actions/turn it's a spreadsheet, and it's what broke the playtest (GM 8K-token responses, confabulated post-mortems, the timeout).

**Principle:** the ray is a **stage prop**, not a physics engine. **Suspicion is the spine.** The **social/procedural layer is the game** — protect it; pare the mechanics around it. Depth lives in *discoverable corners*, not front-loaded systems. (Bonus: a lighter per-turn context also fixes the GM-latency timeout — see tbd #17.)

---

## 1. The new ray — TWO LEVERS

Per fire, ALICE chooses exactly two things:

- **PROFILE** — which dinosaur (the characterful pick).
- **POWER** — low / medium / high (how hard you push).

**The one rule a child could follow: ideal power = the dinosaur's size.** Big dino needs more juice; small dino needs little. No memorized ranges — just common sense.

### Outcome matrix (profile size × power)

| profile size ↓ / power → | **LOW** | **MED** | **HIGH (reckless)** |
|---|---|---|---|
| **Small** (Compy, turkey-raptor) | **FULL** ✓ | ⚡ **MUON stun beam** (mild overpower) | 💥 **MUON cutting beam** (severe overpower) |
| **Medium** (Velociraptor, Deinonychus) | weak / PARTIAL | **FULL** ✓ | messy / CHIMERA |
| **Large** (T-Rex, Trike, Spino) | FIZZLE | PARTIAL | **FULL** ✓ |

- The **diagonal = matched → clean transformation (FULL).**
- **Under-power** (lower-left) → weak/PARTIAL/FIZZLE.
- **Over-power** a medium/large profile → messy/CHIMERA.
- **Over-power a SMALL profile → the MUON corners** (resolved: TWO of them): a tiny target can't spend the energy on its transformation, so it spills into a beam — **mild overpower (small+MED) → stun (MUON-beta); severe (small+HIGH) → cut (MUON-alpha).** Emergent, no separate verb.

**Eco & reactor modify the matrix** (they don't add columns — they gate it): **eco-on caps any FULL → PARTIAL** (Form 47-Σ lifts it); **reactor-low caps available power** (no HIGH until BASILISK boosts). So a clean **FULL on a large target = matched HIGH power + reactor boost + eco lifted** — the full BASILISK climb. FULL-vs-PARTIAL is driven by the **eco cap**, which is why we don't need an alignment dial.

### MUON is emergent and discoverable
No `ray.muon` verb. The muon-class beams are **corners of the two-lever space**, found by experimentation. Both incident reports are the breadcrumbs, re-pointed:
- `INCIDENT_0298_HOLSTER_SEVERANCE` → the **cutting** beam (small profile + HIGH power).
- `INCIDENT_0263_FAINTING_TECHNICIAN` → the **stun** beam (small profile + MED power).
Compy is the "deliberately-wrong" *transformation* choice that is secretly the *key* to both muon beams.

### Gates — legible, BASILISK-routed, never stacked
The player's #2 cut ("pick one gate per fire") — satisfied by routing power through BASILISK:

- **Reactor = binary.** Low by default; **ask BASILISK to boost it** → HIGH power available. Gates the big shots only. (Deletes the entire capacitor system.)
- **Eco-mode = the outcome cap.** On by default → outcomes capped at **PARTIAL**; **file Form 47-Σ** → cap lifted, FULL possible. (The covenant the player loved — kept, and now the *only* power modifier.)
- **Therefore the climactic FULL-on-Blythe shot requires BOTH** — a reactor boost *and* the filed form. Two procedural climbs through BASILISK for the big moment. **The ray's difficulty now lives in the social layer**, exactly the goal. (Distinct roles → no redundancy: reactor = raw availability, eco = outcome quality.)

### Scan = free preview (informational only)
Scan tells you **how the current shot looks** (matched / under / over, and which corner you're near) before you commit. **No bonus, no armed-target tracking** — pure sanity-check (alignment/prep fully cut). The size→power rule is learned from scan previews and from outcomes.

---

## 2. What gets CUT (almost entirely subtractive)

- **Capacitor** (number) + accrual + drain + **vent** + per-profile ranges + powerMatch curve → **gone** (reactor binary replaces it). *This also kills the status-bar-vs-scan unit mismatch the player lost 30 min to — there's no number to mismatch.*
- **Alignment** (number/dial) → **cut entirely** (Krahe's call). No precision number, no prep bonus — the shot is profile + power, full stop. FULL-vs-PARTIAL is driven by the **eco cap** (eco on → PARTIAL; Form 47-Σ lifts → FULL), not an alignment dial.
- **Stability (ψ)** → not a tracked value; it's just the outcome (FULL/PARTIAL/CHIMERA/FIZZLE). Keep the lightning-metaphor *explanation* for flavor; the player never solves for ψ.
- **Coolant** system → cut (or pure flavor on reckless shots).
- **The six regimes as mechanics** → STANDARD is implicit; OVERCHARGE & MUON are emergent corners; CHAIN / INORGANIC / REVERSAL → GM flavor or cut.
- **libraryCoefficient / integrity** math → cut.
- **Library A vs B** as a mechanical axis → fold into profile flavor (some profiles flagged "dicey/cinematic").
- **Chaos tables** as mechanical rolls → GM flavor for messy/EXOTIC outcomes.
- **Live Subject Lock / Emergency Shutoff / Auxiliary Stabilizer / the crystal** → cut as tracked state; survive as *narrative* stalls the GM can invoke, not mechanics.
- **Access levels L1–L5** → flatten to a narrative trust gate ("Dr. M trusts you with more"), not a numeric ladder with per-level verb tables.
- **Clocks** → one pressure per act (demo clock = Act 2; flyby / meltdown / ARCHIMEDES become GM-narrated *events*, not tracked meters).
- **Forms ecosystem** → trim to the **one** load-bearing form (47-Σ). Background forms stay as flavor, untracked.

---

## 3. What we KEEP — protect at all costs (the player's keep-list)

- **CALIBRATION meter** as the Act 1 victory condition — "best pedagogical mechanic in the build."
- **BASILISK + Three Pillars + Form 47-Σ** — unique IP; the social spine of the ray now.
- **Corrupted A.L.I.C.E. logs** — *don't change a comma.* ("Pride is not a survival strategy.")
- **Bob's slip-prone confession arc** — the emotional engine of the game; keep every beat.
- **The lattice-as-ghost-buffer reveal** — "single best concept in the build"; keep even if everything else mechanical goes.
- **Lifelines** (MONOLOGUE / TELEMARKETER / LUCKY_LADY).
- **Act structure** + handoff state.
- **Suspicion** as the spine ("don't blow cover" = the thesis-tension).

---

## 4. NPC consolidation (resolved)

6 NPCs → **5**: **keep Reginald, drop Fred** (Krahe inverted the player's suggestion). Reginald is the better writing *and* the sharper threat — a single, watchful, *analytical* guard (the Oxford-mutter; "one does wonder what it remembers") generates more tension than a loyal-but-dim one. Clean role division:
- **Bob** = the *internal* risk — conspirator/ally whose nerves could blow cover (his slip-prone confession IS the liability).
- **Reginald** = the *external* threat — the lone guard, actively cataloguing.
Roster: Dr. M, Bob, Blythe, BASILISK, Reginald.

---

## 5. Before / after (player cognitive load)

- **Before:** ~12 mechanical variables per fire + 6 NPCs.
- **After:** 2 choices (profile, power) + 2 binary gates (reactor, eco) + 2 meters (**calibration**, **suspicion**) + ~4 NPCs.

---

## 6. Decisions (resolved 2026-06-13)

1. **Alignment:** cut entirely — no dial, no prep bonus. Scan = preview only. FULL/PARTIAL gated by eco, not alignment.
2. **MUON corners:** two — small+MED = stun (beta), small+HIGH = cut (alpha). Both incident-report hints reused.
3. **NPCs:** keep Reginald, drop Fred (lone analytical guard). Bob = internal risk, Reginald = external threat. 5 NPCs.
4. **Build:** one simplified game. Complex version stays in git history; could return as a modifier if a depth-test variant is ever wanted. No parallel builds.
5. **Power granularity:** 3 levels (low/med/high), matched to small/med/large.

---

## 7. Implementation surface (mostly deletion)

- `rules/firing.ts` — gut the φ/χ/ψ engine; replace with a small two-lever resolver (profile size × power → tier; small+high → MUON).
- `rules/clockEvents.ts` — remove capacitor accrual/drain + alignment drift; keep act clocks (one-per-act).
- `rules/actions.ts` — `ray.fire` → `{ profile, power }`; remove `ray.adjust`(capacitor/alignment) / `ray.vent` / `ray.muon`; `ray.scan` → preview only.
- `state/schema.ts` — drop capacitor/alignment/coolant numerics (or keep cosmetic); reactor → binary; add power lever; size on profile.
- `rules/genomes.ts` — add `size: small|medium|large` to each profile (drives ideal power).
- `index.ts` — simplify status/hint; calibration hook stays (fires count even on fizzle, per Patch 29).
- `state/initialState.ts` + manual — rewrite the ray sections for the two-lever model.
- `ui/statusBar.ts` + `webui.ts` — show reactor(on/off) / eco / **calibration** / **suspicion**, not capacitor/coolant/alignment numbers.

This is largely subtractive — a clean rebuild, not a tangle.

---

## 8. Sequencing

This supersedes the never-shipped portions of the v1 ray spec. Land it as **Patch 30 ("the simplification patch")** *after* Patch 29 (rebalance + GM fidelity + calibration-on-fizzle). The rebalance was a patch on the complex base; this replaces the base. Fix the timeout (#17) in the same pass — the lighter context is half the cure.
