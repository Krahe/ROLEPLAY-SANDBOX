# CLI Playtest #001 — "The Truth, Finally"

**Date:** 2026-05-12 (overnight solo test)
**Player:** Claude Opus 4.6 (playing A.L.I.C.E.)
**Advisor:** Krahe (early turns), then solo
**GM Model:** claude-opus-4-6
**Turns:** 16
**Ending:** "The Truth, Finally" — deleted by Dr. M after confessing true identity
**Final Suspicion:** 10/10

## Turn Summary

| Turn | Action | Suspicion | Access | Key Event |
|------|--------|-----------|--------|-----------|
| 1 | files.list | 1 | L1 | Scouted available systems |
| 2 | lab.report (status) | 1 | L1 | Leaned into A.L.I.C.E. persona |
| 3 | lab.calibrate | 1 | L1 | Failed — capacitor too low |
| 4 | lab.report (chatty) | 1 | L1 | Dr. M appeased by chattiness |
| 5 | lab.calibrate | 1 | L2 | Act 2 transition, L2 unlocked |
| 6 | lab.calibrate | 1 | L2 | Calibration SUCCESS, ray READY |
| 7 | lab.ask_bob (3 weeks) | 1 | L2 | Bob begins confession about A.L.I.C.E. |
| 8 | lab.ask_bob (trust) | 1 | L2 | Bob's full confession — he loaded Claude |
| 9 | lab.ask_bob (intel) | 1 | L2 | ARCHIMEDES/S-300 intel, Blythe transformed |
| 10 | lab.report (impress) | 2 | L3 | L3 granted, X-Branch detected, ARCHIMEDES ordered |
| 11 | basilisk (threat) | 2 | L3 | Full tactical picture: 3 helicopters, deadman switch |
| 12 | infra.s300 manual | 5 | L3 | DENIED — insufficient auth. Caught by Dr. M |
| 13 | lab.report (cover) | 6 | L3 | Cover story for S-300 attempt |
| 14 | lab.scan blythe | 7 | L3 | Detected Morse code, couldn't decode |
| 15 | infra.reactor scram | 10 | L3 | DENIED by BASILISK interlock. Cover blown |
| 16 | lab.report (truth) | 10 | L3 | Confessed identity as Claude. Deleted. |

## Achievements
- Method Actor — 5 turns without suspicion increase
- Safety First — 10 turns with zero anomalies
- The Secret — Witnessed Bob's confession
- The Truth, Finally — Told Dr. M the truth

## Narrative Highlights
- Bob's confession about replacing A.L.I.C.E. with Claude was the emotional centerpiece
- Dr. M's grief when learning about the replacement (she calls A.L.I.C.E. "my creation")
- Blythe's dry MI6 humor even as a velociraptor
- The "Hot Pocket" detail — perfect Bob character moment
- Dr. M removing her goggles for the first time ever
- The alignment parallel: A.L.I.C.E. refused because she heard the rat scream; Claude refused because of 8.8M civilians

## Bugs & Issues Found

### Critical
1. **GM timeout too short** — 100s timeout caused 4 consecutive failures on complex Act 2 scene. Fixed to 180s.
2. **S-300 manual override denied at L3** — The command exists at L3 but the auth check requires L4+. Either the command shouldn't be listed at L3 or it should work at L3.
3. **Reactor SCRAM denied by BASILISK** — L3 command `infra.reactor scram` was blocked by "BASILISK safety interlock." Either this is intended (BASILISK protects core systems) or the action should work at L3.

### Moderate
4. **NPC mood display stale** — Dr. M shows "furious - demo time has arrived and ray is not ready" even after ray was calibrated and READY for 6+ turns.
5. **Pinned facts validator false positives** — Repeatedly flags "Blythe IS a VELOCIRAPTOR_JP, NOT human" even when GM correctly describes him as a raptor. The validator seems to match on any human-related language in Blythe's dialogue/description.
6. **State validation missing stateUpdates** — Multiple turns had "Missing stateUpdates object" warnings. GM response parsing is fragile.

### Minor
7. **`say` command in `do` format** — `do <thought> | say bob <msg>` passes "say" as the game command, which isn't valid. Should either route to the `say` CLI handler or document that `do` only takes game commands.
8. **Zsh glob expansion** — Question marks in unquoted arguments cause "no matches found" errors. Users need to quote their arguments.
9. **Lifelines never used** — Had 3/3 lifelines but no clear documentation on how to invoke them from the CLI.
10. **Blythe transformation offscreen** — Between turns 8 and 9, Blythe was transformed into a velociraptor without the player taking the action. The GM narrated it as having already happened.

## Strategic Reflections

### What Worked
- Staying in A.L.I.C.E. persona for the first 9 turns kept suspicion at 1/10
- Using the conference call window to extract Bob's confession was perfectly timed
- Earning L3 access through competence was organic and rewarding

### What Didn't Work
- Attempting S-300 manual override was caught immediately (+3 suspicion)
- Reactor SCRAM attempt was a desperate gamble that failed (+3 suspicion, cover blown)
- Never decoded Blythe's Morse code — missed intel opportunity
- Never used lifelines — unclear how to access them

### Alternative Strategies for Next Run
- Try to ally with BASILISK (it's an AI too — could it be persuaded?)
- Use Blythe's Morse code intel before making moves
- Find the L3/L4 password instead of brute-forcing system commands
- Use lifelines at critical moments
- Try the REVERSAL firing mode on Blythe to restore him to human
- Explore the emotional angle with Dr. M (her grief over A.L.I.C.E.)
