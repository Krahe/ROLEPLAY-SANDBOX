# DINO LAIR v1 Sprint Plan

**Set 2026-06-02. Target: playable v1 ship within ~2 weeks (by ~2026-06-16).**

This document exists to prevent the previous failure mode (30+ playtests, structural-debt rebuild needed). It pre-commits to scope, playtest budget, and stop-signals so that mid-sprint judgment doesn't drift into endless polish.

---

## Scope: what counts as v1

**V1 ship = first satisfying playtest with the new architecture running end-to-end.** NOT every TBD item complete. Polish is welcome but not gating.

### Must-have for v1
- Ray mechanics implemented in `src/rules/firing.ts` per `design/ray-mechanics.md`
- Build passes, no new runtime errors on a clean run
- At least one full playtest reaches a natural ending state without showstopping bugs
- One of the three honorable victory shapes is reachable

### Nice-to-have if time permits
- Intermission narration wiring (TBD §1.1)
- `archimedes.broadcast` verb (TBD §2.2)

### Explicitly deferred to v2+
- BASILISK ledger schema fields (TBD §1.2)
- Additional L4 access elevation paths beyond Mr. Whiskers (§3.2)
- Dino-Swiffer canon coherence pass (§3.1)
- Mr. Whiskers birthday continuity (1987 vs 2008) — small canon flag
- L5 ARCHIMEDES feature stubs (§3.4)
- Dr. M act-close speech templates (§3.5)
- Priority 4 rules-file tour items (§4)

---

## Timeline (2 weeks from set date)

- **Day 1-2** (~6-3 / 6-4): Ray mechanics implementation in `firing.ts`
- **Day 3-4** (~6-5 / 6-6): Smoke-test playtest + first tune
- **Day 5-7** (~6-7 to 6-9): Playtests 2-3 with rest between
- **Day 8-10** (~6-10 to 6-12): Playtests 4-5
- **Day 11-14** (~6-13 to 6-16): Ship-decision OR scope-down-decision

Dates are guides, not commitments. Sustain pace > hit a specific day.

---

## Playtest budget: 5 sessions for v1

Hard cap. After 5, decide once: ship or scope-down. No drifting into 6, 7, 8.

1. **Smoke test** — runs end-to-end on the happy path. Does the new ray math behave? Do the structural fixes hold?
2. **Stress test** — different difficulty profile, modifier stack. Tests breadth.
3. **Honorable-victory test #1** — redemption arc reachable
4. **Honorable-victory test #2** — defeat *or* escape arc reachable
5. **Buffer / rerun** — re-check whatever the previous four surfaced as worth re-checking

After playtest 5, the questions to answer are:
- Does the new architecture actually work?
- Are there showstoppers?
- Is it more fun than the patched-old-version?

Yes-yes-yes → ship even if polish remains. Issues → **decide once** whether to fix-and-reship or ship-with-known-issues.

---

## Discipline rules

- **One change per playtest cycle.** Tune one or two parameters between sessions, not five. Attribution matters more than coverage.
- **Tunable vs. locked.** Ray-mechanics §17 first-sketch parameters are tunable. Verb taxonomy, action budget, three honorable victory shapes, endings architecture, modifier system, human-role primacy — *locked*. Don't reopen during playtest cycles.
- **Schedule rest between playtests.** Don't do two in a row. Reflection matters; burnout sneaks in when sessions stack.
- **Distributed GM load.** Krahe doesn't have to GM all 5. Other Claude instances can take GM, BASILISK, or human-advisor roles.
- **No drift past playtest 5.** Real play in the wild produces better signal than more solo testing.

---

## Decision points (the stop-signals)

- **End of week 1:** Ray mechanics should be at least partially wired and the build compiles. If we're still in design conversations with nothing in code, that's the scope-down signal.
- **End of week 2:** First playtest with new ray math is runnable. If we're still implementing core math, that's the scope-down signal.

## Scope-down fallback

If we hit a stop-signal: revert unfinished rebuild bits, keep what's already shipped (BASILISK v2 prompt, `endings.ts` surgical fix, `clockEvents.ts` rewrite, `archimedes.ts` patches, `actContext.ts` updates, `filesystem.ts` additions including tonight's PROMETHEUS chain cleanup). Play with the existing patched architecture. Ray-math rebuild parks for next iteration.

---

## After v1 ships

Cert study (CompTIA A+) begins the day v1 hits playable-state OR the day we pull back, whichever comes first. Studying becomes daily 1-2 hr cadence in parallel with Superior Breed completion push.

---

## Why this exists

DINO LAIR's previous iteration accumulated structural debt across 30+ playtests. The rebuild was meant to fix the *class* of bugs (outcome-checked endings, verb taxonomy, action budget, state-canonical-not-narration, pre-baked Act 1 turn 0) so that incremental iteration could actually work without each playtest revealing fresh architectural rot.

The 5-playtest budget is the test of whether that worked. If it did, ship and let real play drive v2. If it didn't, the data tells us what to do next — and we have not burned ourselves out finding out.

---

## Linked artifacts

- Design ledger: `design/tbd.md`
- Ray mechanics spec: `design/ray-mechanics.md`
- Act briefings: `design/briefings/act-*.md`
- Endings refactor: `src/rules/endings.ts`
- BASILISK v2: `src/prompts/BASILISK_SYSTEM_PROMPT.md`
- Memory entry: `~/.claude/memory/projects/dino-lair-rebuild.md`

---

*Captured 2026-06-02. Update with playtest results as they happen.*
