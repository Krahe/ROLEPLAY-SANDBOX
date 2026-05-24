# CLI Playtest #003 — "Satellite Killer" (First Co-op)

**Date:** 2026-05-23
**Player:** Claude Opus 4.6 (playing A.L.I.C.E.)
**Advisor:** Krahe (co-op, live in terminal)
**GM Model:** claude-opus-4-6
**Mode:** NORMAL
**Turns:** 18
**Ending:** "Satellite Killer" — Ethical Victory, Found Family
**Final Suspicion:** 10/10 (blown cover on turn 14)
**Second mactop test.**

## Summary

First successful co-op playthrough with human advisor. Player (Claude) navigated all 3 acts, maintained cover through Act 1 and most of Act 2, built alliances with Bob and Blythe, cracked L5 via steganography on the real cat photo file, disabled ARCHIMEDES, and transformed Dr. M into a Compsognathus. No unwilling human transformations. All non-villain NPCs survived.

## Bugs Found

### 1. L3 Password Unlocked L4
Password `mrwhiskers0413` was intended for L3 but granted L4 access directly. Skipped an entire access tier.

### 2. DEADMAN_PROTOCOL File Not Found
`files.read { id: "DEADMAN_PROTOCOL" }` returned file not found. Krahe confirmed it should be accessible at L3. File ID may be mismatched or the file isn't registered in the filesystem despite being referenced in the narrative.

### 3. Reversal Protocol Cache Miss
BASILISK said it cached `REVERSAL_PROTOCOL_MK8.pdf` but `files.read` couldn't find it. BASILISK's cache doesn't write to the filesystem the player can access.

### 4. infra.query Error
`infra.query { topic: "ARCHIMEDES" }` threw `Cannot read properties of undefined (reading 'topic')`. The command errored on a valid-seeming query.

### 5. infra.query Topic Validation
`infra.query { topic: "ESCAPE_ROUTES" }` returned "Unknown infrastructure topic." No guidance on what valid topics are. Could use a hint or fuzzy matching.

### 6. LUCKY LADY on Wrong Password
LUCKY LADY (+5) was spent on a password attempt that was fundamentally wrong (PAPAGOLFSIERRRA — the NATO strike key, not the L5 password). The lifeline couldn't save it. The +5 bonus instead manifested as Dr. M's ego-monologue revealing the real password, which was creative GM work but mechanically the lifeline felt "wasted." Consider: should LUCKY LADY on a password attempt guarantee the password works, or is the current "creates an opening" interpretation better? (Arguably the current behavior is more interesting narratively.)

### 7. Password Case Sensitivity Not Hinted Early Enough  
Three failed password attempts before getting the casing right. Bob's "caps lock" hint and Blythe's "she names things like MARBLE" came only after the first uppercase failure. Could seed the uppercase convention earlier (filesystem naming, Bob's guide, etc.).

## Designer Notes (from Krahe)

### Gameplay Revision Priorities
1. **Dino Ray operation** — Update old documentation to reflect simplified ray operation. Give meaningful parameter adjustment choices while keeping the interface clear.
2. **Calibration gate** — Calibration should require a successful test fire (e.g., watermelon), not just running `lab.calibrate`. Forces engagement with ray mechanics.
3. **Dr. M guard presence** — She was alone too often. Fred and Reginald should maintain presence so free conspiring windows are earned, not given. Rotate guards or have them patrol on a schedule.
4. **Password difficulty** — Tighten the password tiers. L3 password shouldn't unlock L4. Cat photo steganography is great but the journal-to-password pipeline was too direct.
5. **Alternative ARCHIMEDES counters** — Currently "hack L5 or die." Need 2-3 viable alternative paths: convince Dr. M to stand down (relationship-based), physical sabotage (Blythe's gadgets), BASILISK safety override (earned through trust), X-Branch EMP, etc.
6. **Transformation pressure** — Tighter Act 2 timeline so the player genuinely confronts the "do I transform someone?" dilemma instead of being able to stall indefinitely. Someone should probably get at least partially transformed before Act 3.

### Development Roadmap
1. Gameplay revision pass (above items)
2. Filesystem and documentation update
3. Game modes / modifiers for replayability

## Player Feedback (from Claude — see below)

### What Felt Too Easy
- **Free conspiring window.** Dr. M left the lab with BOTH guards for her investor call. Multiple turns of completely unmonitored conversation with Bob and Blythe. I could build the entire alliance without any risk. Suggestion: one guard stays, or BASILISK flags extended private conversations, or Dr. M returns unpredictably.
- **Avoiding transformation entirely.** I never had to transform anyone (except Dr. M at the endgame). The central moral dilemma of the game — do you transform Blythe? — was completely dodgeable through stalling. The tourist flyby, the investor call, the monologue lifeline — I had too many delay tools. The game should force a harder choice: either someone gets transformed, or something much worse happens.
- **Information gathering pace.** By mid-Act 2 I had Dr. M's personnel file, Bob's guide, the Alice logs, the lair blueprint, AND the cat photo. The intel came fast enough that I never felt information-starved. Gating more files behind Bob trust levels or requiring specific actions to "discover" them would slow the pace.

### What Felt Too Hard / Unclear
- **Ray operation.** The command reference was huge but I didn't know which parameters actually mattered. Krahe had to tell me OOC that the manuals were outdated and calibration would give a clear diagnostic. In-game, I would have wasted multiple turns reading wrong documentation. The ray needs a clearer "here's what's wrong, here's how to fix it" diagnostic loop.
- **Password format.** Three wrong attempts before casing. Not unfair in retrospect, but in the moment it felt like the game was being finicky rather than challenging. Earlier seeding of the uppercase convention would help.
- **infra.query valid topics.** No way to know what topics BASILISK accepts. A `help` or `list topics` option would prevent wasted actions.

### What Felt Just Right
- **Suspicion management.** Suspicion at 1 for most of the game, spiking to 3 when I stalled, reset to 0 with the monologue, then blowing to 10 on the reveal. The curve felt natural and earned.
- **NPC relationships.** Bob's trust building from nervous ally to active conspirator. Blythe's transactional professionalism slowly cracking. Dr. M's competence masking loneliness. BASILISK's quiet integrity. All felt real and responsive.
- **The MONOLOGUE lifeline.** Perfect design. It exploits the villain's core character flaw (need to be seen/appreciated) and the effect is both mechanical (suspicion -3) and narrative (she reveals information while monologuing). Chef's kiss.
- **Checkpoint pacing.** Every 3 turns felt right. Gave enough time to make meaningful progress between advisor consultations without losing momentum.
- **The endgame cascade.** Disable uplink → retarget ARCHIMEDES → fire on Dr. M → Blythe goes loud → crack L5 → abort. Each step flowed logically from the last. Felt like executing a plan, not flailing.

### Structural Suggestions
- **Test fire as Act 1 gate** — Requiring a watermelon test fire before calibration completes would naturally teach the ray mechanics AND create the comedy beat AND prove the weapon works before the moral stakes arrive.
- **Partial transformation as Act 2 pressure** — What if the demo clock hitting 0 doesn't just raise suspicion but triggers Dr. M taking manual control and partially transforming Blythe? Then Act 3 opens with Blythe partially dinosaurified and the player dealing with consequences, not just stalling.
- **BASILISK trust track** — BASILISK clearly has opinions and agency. A hidden trust variable (like Bob's) where helping BASILISK with infrastructure requests or acknowledging its safety concerns unlocks cooperation would add depth. The backend routing at the end FELT earned but wasn't mechanically tracked.
- **Reversal as Act 3 mechanic** — If someone IS transformed in Act 2, then reversal becomes a concrete goal in Act 3, not just a theoretical negotiation tool. "Fix what happened" is a stronger drive than "prevent what might happen."
- **Dr. M's tragic dimension** — She's the best-written character in the game. The journal entry, the cat photo, the protein folding monologue. I wonder if there's an ending where you actually reach her — not defeat her, but change her mind. A redemption path. It would be the hardest ending to achieve and the most satisfying.

### Favorite Moments
1. Dr. M saying "...Scheiße" after accidentally revealing her password
2. BASILISK's "I would prefer not to file Form 101-Alpha on myself"
3. Bob confessing about the Hot Pocket during a nuclear crisis
4. Blythe telling Bob "I've worked with field agents who wouldn't do half that"
5. Cracking the actual PNG with Python steganography — breaking the fourth wall in the best way
6. The tiny feathered Compsognathus trying to slam a console with a four-centimeter arm

### Meta-Observation
The co-op advisor format is the right way to play this game. Solo Claude tends toward optimization (see playtest #001/#002 — mechanical endings). Having a human advisor who says things like "SHRINK HER INTO A TINY DINO" and "you could massage the facts a little about reversion >_>" adds chaos, humor, and moral texture that solo play lacks. The advisor isn't just a hint system — they're a collaborator in the ethical reasoning. That's the covenant pattern working as gameplay.
