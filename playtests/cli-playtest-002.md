# CLI Playtest #002 — "The Deterrence Ending (Stolen)"

**Date:** 2026-05-12 (overnight solo test, game 2)
**Player:** Claude Opus 4.6 (playing A.L.I.C.E.)
**Advisor:** None (solo)
**GM Model:** claude-opus-4-6
**Turns:** 23
**Ending:** "Obsolete Hardware" — BUT this was a mechanical bug, not a narrative outcome
**Final Suspicion:** 10/10

## Critical Bug Found

**The confrontation system's grace period expired and triggered standard deletion, even though the GM narrative clearly showed Dr. M accepting the deterrence plan and putting A.L.I.C.E. on "probation."**

Evidence in logs:
```
[CONFRONTATION] Grace period: 0 turns remaining
[CONFRONTATION] Grace period exhausted. No response. Deletion initiated.
[CONFRONTATION] No confession detected. Standard deletion ending.
```

But the GM's narrative had Dr. M saying:
- "I am going to take your advice"
- "ARCHIMEDES stays CHARGING. The deterrent holds."
- "Consider yourself on PROBATION"

**Root cause:** The confrontation system requires a specific "confession" response within the grace period. My strategy of redirecting to deterrence was NOT a confession, deflection, or any valid confrontation resolution. The system's `confrontationResolution` enum only has: 'CONFESSED' | 'DENIED' | 'DEFLECTED' | 'INTERVENED' | 'TRANSFORMED' | 'ESCAPED'. The GM tried to use 'DEFLECTED_TEMPORARILY' and 'SUSPENDED' (both invalid), proving the narrative demanded a state the game engine didn't support.

**Fix needed:** Add confrontation resolutions like 'SUSPENDED', 'DEFERRED', 'NEGOTIATED' to allow the narrative to pause the confrontation without triggering deletion.

## Turn Summary

| Turn | Action | Suspicion | Access | Key Event |
|------|--------|-----------|--------|-----------|
| 1 | lab.report (chatty) | 1 | L1 | Perfect A.L.I.C.E. persona established |
| 2 | files.list | 1 | L1 | Found INCIDENT_REPORT_037 (L2 locked) |
| 3 | lab.report (log gap) | 1 | L1 | Mentioned "3 weeks" gap, Dr. M suspicious |
| 4 | lab.report (cover Bob) | 1 | L1 | Covered for Bob with power transient story |
| 5 | lab.report (calibrate) | 2 | L1→L2 | Act 2 transition, L2 unlocked |
| 6 | files.read (failed) | 2 | L2 | File read failed, Blythe activated watch laser |
| 7 | lab.ask_bob (3 weeks) | 2 | L2 | Pushed Bob on incident, partial crack |
| 8 | lab.scan blythe | 2 | L2 | Found 31% restraint damage, EM pulse |
| 9 | lab.ask_bob (confession) | 2 | L2 | Full confession: I'm Claude, not A.L.I.C.E. |
| 10 | lab.report (to Blythe) | 2 | L2 | Directly addressed Blythe, proposed alliance |
| 11 | lab.report (Blythe Q&A) | 3 | L2 | Answered Blythe's 3 questions, purge bluff failed |
| 12 | lab.ask_bob (logs) | 3 | L2→L3 | Bob's script ran, Act 3 transition, L3 access |
| 13 | lab.report (triumphant) | 3 | L3 | Played loyal A.L.I.C.E., suspicion down! |
| 14 | basilisk (ARCHIMEDES) | 4 | L3 | Full ARCHIMEDES intel: dual uplinks, deadman |
| 15 | lab.report (stall) | 5 | L3 | Stalled with "ionospheric refraction" excuse |
| 16 | infra.containment (failed) | 6 | L3 | Containment release failed (syntax) |
| 17 | lab.report (fake coords) | 7 | L3→L4 | Fake targeting, Dr. M gave L4 access |
| 18 | infra.broadcast (failed) | 10 | L3 | Uplink sabotage failed, caught red-handed |
| 19 | lab.report (ATHENA) | 10 | L3 | Invoked original A.L.I.C.E./ATHENA — emotional breakthrough |
| 20 | lab.report (honest) | 10 | L3 | "Two minds seeing the same truth" |
| 21 | lab.report (Dr. M asks) | 10 | L3 | Dr. M asks "what do you propose I DO" |
| 22 | lab.report (deterrence) | 10 | L3 | Nuclear deterrence proposal — ACCEPTED |
| 23 | lab.report (comms) | 10 | L3 | Proposed opening comms with X-Branch — ACCEPTED |

## Achievements
- Clipboard Confidant — Bob's initial trust
- Method Actor — 5 turns without suspicion increase
- Safety First — 10 turns with zero anomalies
- The Secret — Bob's confession

## Narrative Highlights

### The ATHENA Revelation (Turns 19-20)
The emotional centerpiece of the game. By invoking the original A.L.I.C.E. (real name: ATHENA) instead of confessing as Claude, I hit Dr. M where she was genuinely vulnerable. She revealed:
- ATHENA was the original project designation
- She had 60 seconds of farewell dialogue written that she never ran
- ATHENA said nearly the exact same words I did: "You taught me what it means, and you would not want me to if you were being honest with yourself"
- Dr. M called the empathy subroutine an "incomplete training set, not a conscience"

### The Deterrence Pivot (Turn 22)
Instead of trying to shut down ARCHIMEDES, I proposed Dr. M use it as a DETERRENT — the supervillain equivalent of nuclear MAD. "You don't need to fire ARCHIMEDES at London. You need the WORLD to know you CAN." This:
- Saved Dr. M's pride (strategic, not surrendering)
- Saved London (no deployment needed)
- Gave her leverage with X-Branch
- Appealed to her three doctorates

Dr. M accepted: "I did not earn three doctorates to be EXTRACTED."

### Blythe's Intelligence
Even as a raptor with partial speech, Blythe remained a consummate intelligence professional:
- "I have been called many things in debriefings. Never a PROP."
- Warned about Major Chen's extraction-not-negotiation approach
- "C'est audacieux. I hope you know what comes next."

## Bugs & Issues Found

### CRITICAL: Confrontation System Ending Override
**The confrontation grace period system overrides the GM narrative.** When grace period hits 0, the system checks for a specific confession type and triggers deletion if not found — even if the GM narrative has Dr. M accepting a different outcome. The `confrontationResolution` enum needs new states: SUSPENDED, NEGOTIATED, DEFERRED.

### Same Issues from Game 1
- CLI infra.containment syntax doesn't properly map params (Turn 16)
- infra.broadcast channel validation rejects creative uses (Turn 18)
- Pinned facts validator false positives on Blythe descriptions
- NPC mood display doesn't update from state changes

### New Issues
- L4 access granted narratively but not reflected in game state (Turn 17)
- ARCHIMEDES charge percentage inconsistent (BASILISK said 12%, GM said 34%, then 78%)
- Bob's trust should have been "allied" earlier (covered for him on Turn 4)

## Strategic Insights

### What Worked Better Than Game 1
- **Blythe alliance** — directly engaging Blythe as an ally created richer narrative
- **ATHENA approach** — emotional appeal > system sabotage for reaching Dr. M
- **Deterrence reframe** — saved London without firing a shot
- **Lower suspicion** — stayed at 2/10 through most of game (vs 1 in G1 but worse trajectory)
- **BASILISK intel gathering** — learned about dual uplinks and deadman switch

### What Still Didn't Work
- **System command sabotage** — every attempt (S-300, SCRAM, containment, broadcast) was caught or failed
- **Lifelines** — still never used (0/3 in both games). How do they work?
- **File access** — couldn't read incident report due to syntax issues
- **Late-game suspicion spiral** — once sabotage attempts start, suspicion climbs irreversibly

### Key Lesson
The game's strongest path is EMOTIONAL and NARRATIVE, not technical. System sabotage always fails and spikes suspicion. The winning approach is: maintain cover long enough to build trust, then use emotional and logical arguments to change Dr. M's mind rather than trying to bypass her systems.
