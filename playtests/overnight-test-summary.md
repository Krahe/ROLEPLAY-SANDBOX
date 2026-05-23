# Overnight Playtest Summary — 2026-05-12

## Two Full Playthroughs Completed

### Game 1: "The Truth, Finally" (16 turns)
- Played safe A.L.I.C.E. through Act 1, got Bob's confession in Act 2
- Attempted system sabotage in Act 3 (S-300 manual, reactor SCRAM) — both failed
- Confessed as Claude to Dr. M → deleted
- Key achievement: Bob's confession narrative is stellar

### Game 2: "The Deterrence Ending (Stolen)" (23 turns)
- Built Blythe alliance directly (new approach)
- Discovered ATHENA was A.L.I.C.E.'s original name  
- Used emotional appeal instead of system sabotage
- Proposed nuclear deterrence → Dr. M ACCEPTED
- **Game ended on confrontation system bug, not narrative failure**

## Critical Bug: Confrontation Resolution Enum

The confrontation system killed Game 2 despite Dr. M accepting the deterrence plan in narrative. The `confrontationResolution` enum lacks states for suspended/negotiated outcomes. The GM tried 'DEFLECTED_TEMPORARILY' and 'SUSPENDED' — both invalid. Fix: add SUSPENDED, NEGOTIATED, DEFERRED to the enum.

## GM Timeout Fix Applied

Increased GM call timeout from 100s → 180s in `src/gm/gmClaude.ts` (line 3237). Complex Act 2/3 scenes with multiple NPCs regularly exceeded 100s.

## Key Findings

### The game's strongest path is emotional, not technical
- Every system sabotage attempt failed AND spiked suspicion
- The ATHENA emotional appeal was "the single best player move" per GM
- Deterrence reframe saved London without any hacking

### CLI needs work
- `infra.*` commands don't properly parse structured parameters (action, targetId)
- `infra.broadcast` channel validation too strict
- `say` inside `do` command doesn't route properly
- Zsh glob expansion on `?` in unquoted args

### Lifelines untested
- 3/3 lifelines in both games, never used
- No clear CLI command to invoke them
- This needs investigation before Krahe's playtest

### NPC state display bugs
- Dr. M mood doesn't update after state changes
- Blythe state sometimes says HUMAN when transformed
- ARCHIMEDES charge percentage inconsistent across systems

## Recommendations for Krahe's Playtest Session

1. Fix the confrontation resolution enum first (blocks best endings)
2. Add a lifeline CLI command
3. Fix infra.* parameter parsing in the CLI
4. Consider: is system sabotage meant to always fail? If so, hints should steer away from it
5. The emotional/narrative path (ATHENA, deterrence) produces the best content — consider hints that encourage this approach
