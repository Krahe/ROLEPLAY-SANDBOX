# DINO LAIR — Sprint v2: Rebuild Completion + Pre-Playtest Hardening

**Period:** ~2026-06-03 → 2026-06-13
**Status: PLAYTEST-READY.** Build clean throughout, 28/28 smoke tests green (Windows-fixed).
**Cast:** GM = Opus 4.8 (adaptive thinking), BASILISK = Sonnet 4.5, ALICE = your Desktop session.

This doc is the **shipped record** for the sprint that finished the architectural rebuild and hardened the game for its first real playtest. Forward-looking work lives in `tbd.md`. The prior (superseded) sprint plan is archived at `archive/v1-sprint.md`.

---

## What this sprint accomplished

The big rebuild (ray mechanics, endings, acts, clocks) landed in code, then a pre-playtest hardening pass (the Patch 27.x series) closed the gaps, audited the untouched systems, and built the advisor-facing instrumentation. The game now runs end-to-end on the new architecture with real Claude voices in all three AI roles.

---

## Shipped — core rebuild

- **Ray mechanics (`firing.ts`)** — complete rewrite. Three tensions φ POWER / χ ALIGNMENT / ψ STABILITY; six emergent regimes (STANDARD / CHAIN / OVERCHARGE / REVERSAL / INORGANIC / MUON) detected from configuration, not flags. Pure functions: `computePowerMatch`, `computeStability`, `getOutcomeTier`, `detectRegime`, `chaosConditionsActive`. Outcome tiers FULL / PARTIAL / CHIMERA / FIZZLE / EXOTIC + MUON (ALPHA_SEVERANCE/BETA_STUN) + REVERSAL (CLEAN/PARTIAL/CHIMERIC_DRIFT/WORSE). Legacy K-violation path excised (~480 lines).
- **OVERCHARGE Hollywood path (27.1)** — brute force overrides waveform incoherence: libraryCoefficient + integrity → 1.0 in OVERCHARGE, making clean Library B outcomes reachable (they were mechanically impossible before — the central Act-2 objective couldn't be met). Mastery shape: alignment prep + scan + *barely* overcharge → FULL; greed → PARTIAL + worse chaos; reckless → FIZZLE.
- **Chaos table + severity bands (27.3)** — 20 sharpened entries; `rollChaosFizzle(severity)` band-weighted FLICKER/SURGE/RUPTURE so consequence scales with how hard the envelope was pushed (disciplined overcharge never cascades; one reckless shot in five goes facility-scale).
- **REVERSAL math** — full §11 (library × profile × power × alignment × time → four tiers); gated L4 (Mr. Whiskers chain is the discoverable path; Dr. M doesn't grant in normal flow).
- **Scan → alignment** — scan now arms +0.15 alignment on the scanned target, consumed next fire (was permanent +10% precision). Projection reports the estimated **transformation** only — no consequence forewarning (27.2).
- **Coolant gate** — sustained high coolant (>1.5) FIZZLE-blocks fire; vent or rest to clear.
- **Pressure loops (`clockEvents.ts`)** — alignment drift (−0.05/turn) + capacitor accrual (reactor-mode-scaled) + intermission state machine. Knowledge is perishable; the reactor is the highest-leverage move.
- **Acts (`acts.ts`)** — objective-gated transitions (`fullTransformationAchieved` / `blytheEscaped`), intermission narration wired.
- **Endings (`endings.ts`)** — outcome-checked, no auto-fire defeats. GM calls endings via `triggerEnding` against a fixed taxonomy after reading actual state; `injectEndingPressure` escalates context when grace expires; 40-turn global overtime backstop. This fixed the central "CONFESSION_DELETION fires on event not outcome" bug.
- **ARCHIMEDES capacitor coupling + EW mode + Act 3 stall toolkit** — `processCountdownTick` reads the shared capacitor; EW-mode interlock locks out genesis-wave fire; `rayDiagnostics.ts` adds L3 diagnostic/calibrate/certify/amplified-muon stall verbs. In-game documentation chain (L3 satellite file → L4 protocols file).
- **Filesystem** — forms (47-Σ, 99-Γ), MUON incident reports, DINO_RAY_MANUAL surgical rebuild (vocabulary + warnings, not mechanisms), PROMETHEUS / Mr. Whiskers password chain hardened, full L1–L5 content audit.
- **Prompts** — BASILISK v2 (professional-concern disposition, Three Pillars, first-class second-player turn), ALICE briefing audit (5-category verb surface, mandatory thought/why), lean act briefings (act-1/2/3.md).

## Shipped — Patch 27.x pre-playtest series (this week)

| Patch | What |
|---|---|
| 27.1 | OVERCHARGE Hollywood path — Library B clean outcomes reachable |
| 27.2 | Scan reports transformation estimate only (no consequence forewarning) |
| 27.3 | Severity-banded chaos roll (FLICKER/SURGE/RUPTURE) |
| 27.4 | Full-fidelity turn logging — `~/.dino-lair/logs/dino-lair-turns-{id}.jsonl` captures thought, full params, full result messages, dialogue, GM narration |
| 27.5 | GM → Opus 4.8, BASILISK → Sonnet 4.5; fixed malformed post-game Sonnet model id |
| 27.6 | Deleted orphaned `basiliskEpilogue.ts` (pre-real-BASILISK relic) |
| 27.7 | Dashboard: Game-Over banner fixed, ray instruments (χ/coolant/reactor) added, action log enriched |
| 27.8 | Banked (negative) suspicion implemented — floor −3 |

Plus: smoke-suite Windows fix (`pathToFileURL` — suite had given zero signal on Windows since ≥Patch 21), `THE_HUMANS_BRIEFING.md` (advisor player briefing), README front-door slim.

## Audits performed (findings → `tbd.md`)

- **Dashboard** — better than feared (demo-clock/fortune not stale); fixed Game-Over banner + ray instruments shipped (27.7); ARCHIMEDES %-readout polish deferred.
- **Achievements** — found a real architectural bug: two parallel registries (lowercase `achievements.ts` vs UPPERCASE `endings.ts`); end-game summary resolves only the UPPERCASE map, so all 81 lowercase achievements vanish from the recap. Plus dead counters and ~40 flag-based achievements keyed to a GM vocabulary that's never emitted. **Forward item — the big one in tbd.**
- **basiliskEpilogue.ts** — orphaned + stale → deleted (27.6).

## Discoveries (corrections to design memory)

- **Negative suspicion was never implemented** until 27.8 — schema clamped `min(0)` and every site floored at 0, contradicting the 6-01 "banked credit" decision. Now floored at −3.
- The **act-close verdict delta [−3,+3]** mechanic is still unbuilt; banking currently happens via GM `stateOverrides`/deltas, not an automatic act-transition verdict.

---

## Honest status going into playtest 1

The math is in, the pressure loops are real, the structural ending bug is fixed, the advisor can finally *see* the ray. The biggest remaining risk is the one we've flagged since 6-07: the new system is more expressive but less transparent from inside — Act 1 is intentionally opaque per the discovery curve. If playtest 1 shows "ALICE fires blind," the answer is more pre-fire diagnostic in scan output, not a redesign. Everything else is data we don't have yet.
