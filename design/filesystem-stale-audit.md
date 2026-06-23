# Filesystem Stale-Content Audit — 2026-06-23

Source: `filesystem-stale-audit` workflow (6 marginalia-aware agents) over
`src/rules/filesystem.ts` (~2,803 lines / ~205 in-fiction docs).
**85 findings across 14 documents.** This is the worklist for the careful
filesystem-content-rewrite session.

> ⚠️ The **muon trail** (Tier 2) is reserved for fresh-head creative work.
> The hidden trigger must NEVER be spelled out — only obliquely re-aimed.

## Ground truth — current mechanics (Patch 30), what docs must align to
- Ray = TWO levers: **genome/profile + power dial 1–5**. Point-and-fire. Recon = `lab.scan` (L2).
  No regimes, no capacitor, no alignment/stability levers, no calibration, no `ray.adjust`/`ray.vent`.
- Outcomes: FULL / PARTIAL / CHIMERA / FIZZLE (genome × power delta) + hidden muon corners.
- **Muon = hidden corners (NEVER documented):** tiny genome + hard over-drive (Δ+2, power 3+) → CUT/severance;
  tiny genome + mild over-drive (Δ+1) → STUN; big genome + deep under-power (Δ−3) → STUN. "Compy is the key." GM-adjudicated.
  The DEAD model in the docs = *"sub-threshold capacitor + no profile selected + organic/inorganic decides outcome."* Wrong; re-aim obliquely.
- Reactor/heat = **reactorStress** + safety-trip(60)/cascade(100) + BASILISK cooling.
  ARCHIMEDES charges via **chargePercent / turnsUntilFiring**, NOT capacitor ≥100/130%. The old capacitor-stack / cascade-risk-% economy is gone.

## Category tally
capacitor 28 · muon-old-trigger 15 · regime 11 · reactor-old 8 · dino-swiffer 5 · dead-verb 5 · power-percent 4 · calibration 4 · alignment 2 · other 3

---

## TIER 1 — LIVE docs teaching the dead model (must-fix; actively mislead)

### `/SYSTEMS/DINO_RAY_MANUAL.txt` (14) — THE big one (full rewrite to two-lever)
The *current* manual presents the entire cut three-tensions model as live truth.
- L187 [alignment] THE THREE TENSIONS — φ/χ/ψ as governing quantities
- L195 [capacitor] POWER (φ) driven by CAPACITOR, tuned via `ray.adjust { capacitor }`
- L207 [dead-verb] OPERATIONAL VERBS list `ray.adjust`, `ray.vent`
- L246 [calibration] lab.scan returns φ/χ/ψ readout block
- L228 [capacitor] `ray.vent` releases capacitor charge
- L233 [regime] `ray.fire { library, profile, mode }` — old signature
- L251 [regime] PROJECTED PARTIAL ... ECO caps at PARTIAL
- L259 [capacitor] DISCHARGE OUTCOMES ... "Capacitor expended"
- L273 [regime] exotic-field amplifier behaviors outside documented envelope
- L306 [calibration] each profile has a "characterized POWER RANGE" of φ values
- L318 [reactor-old] COOLANT thermal ceiling
- L333 [regime] ECO-MODE caps capacitor draw
- L356 [reactor-old] REACTOR three modes (NORMAL/...)
- L375 [dead-verb] SAMPLE SEQUENCE uses `ray.adjust { capacitor, alignment }`

### ARCHIMEDES / reactor cluster — the dead "capacitor economy" (re-map to chargePercent + reactorStress)
- `/DR_M_PRIVATE/CLASSIFIED/ARCHIMEDES_PROTOCOLS.txt` (6) — ARMED needs capacitor ≥130% sustain; re-sync penalty; pause logic
- `/SYSTEMS/INFRASTRUCTURE/ARCHIMEDES_SATELLITE.txt` (5) — CHARGING needs capacitor ≥100%, ARMING ≥130% × 2 turns
- `/SYSTEMS/INFRASTRUCTURE/REACTOR_SAFETY.txt` (3) — reactor output %, cascade-risk-% math (>100% = +20% cascade risk, etc.)
- `/DR_M_PRIVATE/CLASSIFIED/GENESIS_WAVE.txt` (2) — minimum params: reactor ≥95%, capacitor ≥110%
- `/DR_M_PRIVATE/CLASSIFIED/RESONANCE_CASCADE.txt` (1) — exotic-field coupling threshold (verify vs reactorStress)

### Scattered
- `/SYSTEMS/FORMS/FORM_47-SIGMA.txt` (2) — eco-mode caps capacitor draw at 60%; "anticipated capacitor peak (%)"
- `/BOB_NOTES/alice_cheatsheet.txt` (3) — "Calibration at [high]%", recalibrating, "percentages only"
- `/SYSTEMS/BASILISK_PROTOCOL.txt` (2) — forms/topics referencing eco-mode/power-status (verify, likely light)

---

## TIER 2 — THE MUON TRAIL (careful creative rewrite — fresh head; keep oblique)
All currently point at the DEAD trigger (sub-threshold capacitor + no-profile + organic/inorganic).
Re-aim at **tiny-genome + over-drive** WITHOUT documenting it.
- `/SYSTEMS/ARCHIVED/INCIDENTS/INCIDENT_0298_HOLSTER_SEVERANCE.txt` (13) — the CUT clue (Reginald's cleanly-severed holster; "fire without profile at sub-threshold capacitor")
- `/SYSTEMS/ARCHIVED/INCIDENTS/INCIDENT_0263_FAINTING_TECHNICIAN.txt` (9) — the STUN clue (capacitor 0.13, no library/profile → neuro pulse)
- `/DR_M_PRIVATE/RESEARCH/ALICE_VERSIONS.txt` L707 (2) — muon "operational envelope": capacitor 0.12–0.15, no library/profile, organic vs inorganic outcomes
- (also Bob's footnote in the v2.3 archived manual, L120 — mis-teaches "go REALLY LOW")

---

## TIER 3 — The Dino-Swiffer incident (decision: rewrite or retire)
`/DR_M_PRIVATE/CLASSIFIED/INCIDENT_REPORT_091424.txt` (13) — built on capacitor%, REVERSAL beam,
Library-A-drift. Flagged inconsistent with the new ray math. A replacement Bob-feather-duster incident
was drafted-not-filed (per memory). **Decide: rewrite to the new ray, or retire/replace.**

---

## TIER 4 — THE POLICY DECISION (this sizes the whole job)
`/SYSTEMS/ARCHIVED/DINO_RAY_MANUAL_v2.3.txt` (10) is ARCHIVED and Bob openly mocks it.
**Decide: do ARCHIVED docs get to be deliberately-outdated period lore (kept, maybe leaning into the
wrongness as character) — or must everything match current mechanics?**
- "Archived can be outdated" → v2.3 manual stays (light/none), rewrite focuses on Tier 1 (live) + Tier 2 (clues).
- "Scrub everything" → v2.3 + Dino-Swiffer also rewritten.
- **EXEMPTION:** the archived INCIDENT REPORTS (0298/0263) are NOT "free to be wrong" — they're functional
  muon clues and must be re-aimed regardless of the archived-docs policy.

## Separate, related: `documents.ts` retire
`documents.ts` (1,029 lines) replicates the filesystem. Canonical = `filesystem.ts`. Dedup/retire `documents.ts`
(confirm what it duplicates first). Mechanical, not part of the content rewrite.
