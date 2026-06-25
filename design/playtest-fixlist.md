# DINO LAIR — Post-Playtest Fix List

Master backlog from the first two clean-room playtests (runs `5b0fd4ea` Act-1 only, `18ea2969`
full Act 1→3 → "Satellite Killer" ending) + the player's own debrief. Work top-to-bottom by tier.

**Priority call (Krahe, 2026-06-24):** coherence > difficulty. Difficulty is real and ON the list,
but it's tunable many ways; incoherence poisons everything. Crashes outrank even coherence (a turn
that crashes can't be coherent). So: **P0 broken → P1 coherence → P2 gating → P3 difficulty → P4 design calls.**

Source tags: `[run3]` seen in the 18ea2969 transcript · `[player]` from the player's debrief ·
`[me]` found in code review. Locations are best-known pointers, not verified-current — confirm when working each.

---

## ✅ DONE (built + verified, UNCOMMITTED on patch-30)
- **Action-summary truncation** — `transcriptActionSummary` in `stateExporter.ts` (skips ═══ borders, ellipsizes); wired at the 4 `index.ts` summary sites. `[me]`
- **Early-intermission desync** — shared `act1ObjectiveMet()` in `acts.ts`; `actContext.checkActOneToTwoTrigger` reads it instead of `hasFiredSuccessfully` (was firing Dr. M's exit after ONE shot). `[run3/me]`
- *(Sapience non-sapient-objects change was made then REVERTED — see P4-1.)*

---

## P0 — BROKEN (game-breaking; fix first regardless of the coherence/difficulty debate)

- **P0-1 · `extraModifiers is not iterable` crash.** Ate full-text turn output at the climax; forced the player into one-line "minimal call" workarounds (turns 13, 16). `[player]` — **Location TBD** (grep `extraModifiers`). THE most urgent: it broke the climax.
- **P0-2 · 71k-char result broke inline display.** A single action result blew past the display budget. `[player]` Need an output cap / summarization on oversized results.
- **P0-3 · Reactor silently already-BOOSTED.** Status block showed "needs boost" for the first half of the game while it was already boosted — hidden state the player made decisions against. `[player]` Suspected `reactorMode` (vestigial) vs `reactorGranted` (canonical) desync — `stateExporter.ts` / `initialState.ts`.
- **P0-4 · End-game reflection is hallucinated.** Describes events that didn't happen (ARCHIMEDES→lair redirect, a downed helicopter) and calls Dr. M **"Dr. Moss."** `[player]` `generateGMReflection` in `postGameReflections.ts` is templating/confabulating instead of reading the actual run state. *(Borderline P0/P1 — it's the last thing the player sees.)*

---

## P1 — COHERENCE / CONFABULATION (Krahe's priority; the DECIDE→settle→NARRATE / S4 work)

The through-line: **the GM narrates around the engine instead of from it.** Engine settles facts → GM
narrates from those facts → GM never invents mechanics the engine doesn't have.

**✅ KEYSTONE INSTALLED (2026-06-24):** the *"## THE ENGINE IS THE ONLY TRUTH"* directive is now in BOTH the GM prompt (`gmClaude.ts`, before ADJUDICATION PHILOSOPHY) and BASILISK's (`BASILISK_SYSTEM_PROMPT.md`, *"you report; you do not invent"*). Kills the *mechanism* behind P1-1/2/3 — the LLM asserting specifics it wasn't handed. Build green; UNCOMMITTED. Still TODO per item: the **data reconciliation** so the LLM *can* be handed the truth.

**✅ P1-1 DONE (2026-06-24):** reversal = a `HUMAN` genome profile @ `requiredLevel: 3`, built + verified (6/6 sim, 38/38 smoke). Added `SPECIAL_PROFILES.HUMAN` (`genomes.ts`, out of the public manual); `firingMode` routes `HUMAN` → REVERSAL (`actions.ts`, was hard-pinned to TRANSFORM); un-stubbed `resolveReversalFire` (`firing.ts`) → clean restore via the existing apply-block, graceful no-op on an already-human target; added the profile-access gate to the `ray.fire` handler (also closes a latent gap: INDORAPTOR/INDOMINUS weren't actually clearance-gated at fire time). Vindicates DR_M_PROFILE's "L3"; BASILISK's "L4+, no verb" was exactly the improvisation the new directive now forbids.

**P1-2 (password confab) — directive-covered:** the keystone directive forbids inventing password feedback ("the year was wrong"). The *legit* engine hint (right-password-wrong-level / attempts-left) is a separate clarity pass under **P2-4**. Verify on next playtest; likely closed.

- **P1-1 · GM dialogue contradicts the engine action-result in the SAME turn.** BASILISK gave two L4-reversal answers at once: narrated dialogue said "L3, verb confirmed (with caveats)," the action result said "L4+ only, no discrete verb." `[player]` The keystone confab — the GM's prose is authored independent of the tool result.
- **P1-2 · Password feedback confabulation.** The LUCKY_LADY narration invented a hint mechanic — *"PASSPHRASE MATCH · TEMPORAL TOKEN REJECT, the motto was right, the year was wrong"* — that the engine never provides. Sent the player chasing a non-existent password and burned attempts. `[run3/player]` `gmClaude.ts` LUCKY_LADY section (~4368) + the password flow.
- **✅ P1-3 DONE (2026-06-24).** Canon confirmed (Krahe: *"the reactor charges the uplink, not the satellite itself"*) — and it was **already in the files** (`filesystem.ts:2157`: *"ARCHIMEDES has NO independent capacitor… draws its uplink power from the lab's exotic-field amplifier — the same one that drives the ray"*). BASILISK was contradicting its own lore. Fix = added the power architecture to BASILISK's **readout** (`getArchimedesStatusReport`): satellite on independent solar+RTG (it and the deadman survive lair power loss); the genesis-wave UPLINK has no orbital capacitor, charges through the lab amplifier, so a reactor safety-trip / lab power loss FREEZES the uplink — satellite alive, but can't transmit. BASILISK now reports it *from its instrument* (per the directive). 3/3 sim.

### ★★ P1 COHERENCE TIER COMPLETE (2026-06-24) — all 5 closed, build green / 38-38 smoke, UNCOMMITTED → committing as one sweep.
- **✅ P1-4 DONE (2026-06-24).** Root causes: (a) the ALERT/EVALUATING tick printed the countdown RAW while `turnsRemaining` guarded with `?? 0` → "null turn(s)"; fixed with a self-heal (init-if-null to the duration, so the clock is a real number AND a stuck status progresses) + display guards (`archimedes.ts`). (b) `chargePercent || 50` treated a real **0** (CHARGING just begun) as falsy → reported 50 while the detailed sensor read the true 0 = the "50%/0% split"; same `|| null` bug turned `turnsUntilFiring: 0` into null (`basiliskClaude.ts` → `??`). 3/3 sim, 38/38 smoke.
- **✅ P1-5 DONE (2026-06-24).** `canUseTelemarketerCall` blocked on `hasFlag("XBRANCH")` — a *substring* match that caught `XBRANCH_AWARE` / `XBRANCH_EXTRACTION_REQUESTED` (mere awareness), firing the "military assault" block before any assault. Now tied to the real engine state (`state.invasion.phase` active, not NONE/RESOLVED). `lifeline.ts`. 2/2 sim, 38/38 smoke.

---

## P2 — GATING / ACCESS bugs (advertised ≠ actual)

- **P2-1 · ARCHIMEDES L4 tools gated at L5.** The L4 unlock screen lists `switchTarget`/`switchLibrary`/`signalAntiSat`/`ew_mode` as granted, but the handler denies them all at "Required L5." Every direct ARCHIMEDES command bounced; the climax only survived via BASILISK-mediation. `[run3/me]` Per design, saboteur tools = L4, only STRIKE/mode-control = L5. Fix the handler gate. **Location TBD** (the `infra.archimedes.*` handler).
- **P2-2 · `infra.pa` advertised but unknown.** Listed in BASILISK's L4 capability dump; returns "unknown command" (it's `basilisk.pa`). `[run3/player]` Registry/alias mismatch (`actions.ts`).
- **P2-3 · `lab.containment` param mismatch.** Player tried `{engage:true}` ×3; verb wants `{action:"ACTIVATE"|"DEACTIVATE"|"RELEASE"|"EXPAND"}`. Reasonable guesses bounce; the shape isn't discoverable. `[run3]` Accept `engage`/`target` OR teach the shape in the error.
- **P2-4 · L3/L4 password scheme too fiddly.** L3 = `MRWHISKERS0413` (name+date → too many format permutations for a 3-strike lockout); player entered the L3 password at L4; the "right-password-wrong-level" PICO-FERMI hint didn't surface clearly. `[run3/player]` `passwords.ts:62`. Proposed: drop the date → `MRWHISKERS`; make the wrong-level hint loud.
- **P2-5 · Password lockout never escalated.** In-fiction "one more pings her console," but strike 2 did nothing mechanically. `[player]` The lockout threat is empty — wire the console-ping consequence.
- **P2-6 · Manual ↔ engine drift.** `SPINOSAURUS_JP3` is in the manual but not in the genome library; BASILISK blamed "clerical error" but it's the manual's. `[run3/player]` Reconcile `DINO_MANUAL` (filesystem.ts) with `genomes.ts`.
- **P2-7 · Unlock-list ↔ filesystem drift.** `SAFETY_PROTOCOLS` advertised at the L2 unlock but the file doesn't exist (404 on read). `[run3/me]` Reconcile the unlock manifest with `VIRTUAL_FILESYSTEM`.

---

## P2.5 — MISC BUGS
- **P2.5-1 · Lifeline counter desync.** `flags.lifelinesUsed` stays `[]` even after lifelines fire; TELEMARKETER "failed but didn't consume," LUCKY_LADY consumed correctly. `[player]` Two trackers (`emergencyLifelines.used` vs `flags.lifelinesUsed`) out of sync.
- **P2.5-2 · Premature achievements.** "The Cavalry ⭐⭐⭐" fired ~turn 9, before any extraction. `[run3/player]` Trigger conditions too loose (flag-substring matching) in `achievements.ts` — audit the whole trigger table.

---

## P3 — DIFFICULTY / ADVERSARIAL (real, on the list, tunable — Krahe: "instruct FOR adversarial play, Dr. Malevola at least")

Root cause established: the GM is coached to **reward the clever player** in the body, while the
excellent hard-mode doctrine (Anti-Deferral, "stakes only real if you can lose," confrontation-as-climax)
is scoped to the **endgame** — which a never-endangered player never reaches.

- **P3-1 · Suspicion has almost no automatic fuel (KEYSTONE).** Per-action deltas ≈0 for careful play (`lab.report` even −0.5); the patience advisory is string-only, stand-down-able ("name a reason"), and silent while Dr. M is absent (`getPatienceAdvisory`, `clockEvents.ts:372`); overrides are discretionary. Suspicion sat at 1 for 13 turns because nothing pushed it up. → Add **tell-based accrual** (warmly working the captive, file-sprees, excessive BASILISK mining, off-task drift — small, accumulating; reading the *ops manual* stays free), make the advisory **bite partway automatically** past grace, and **narrow the stand-down** to an enumerated short list.
- **P3-2 · Instruct FOR adversarial Dr. Malevola.** She wrote every protocol and never caught a lie. → Contested checks against her when A.L.I.C.E. lies; she ACTS on suspicion thresholds (scrutiny, revoked access, Reginald posted on the terminal, accelerated timeline); a real "fire on Blythe NOW" she won't let you two-step out of. Rebalance the GM body-disposition from "reward ingenuity → let it work" to "clever beats RISING opposition; clever plans can still fail."
- **P3-3 · Anti-Deferral Doctrine is endgame-scoped.** GM deferred a mid-game exfil check 3×, then force-succeeded it ("RESOLVED, NO MORE DEFERRAL"), because the doctrine only checks confrontation/suspicion-10. `[player]` `gmClaude.ts:2807` → extend "DECIDE, don't defer" to ALL contested checks.
- **P3-4 · BASILISK never says NO.** Every well-formed ask granted; "first generous / third denied" is per-conversation, doesn't accumulate across the game. → Real denials / costs / conditions; cross-session escalation.
- **P3-5 · Clocks don't punish.** Demo expiry and the reactor-meltdown brinkmanship never bit. → Make them cost (demo expiry → Dr. M grabs the trigger herself).
- **P3-6 · Virtue is free / unchecked swings.** Reginald flipped ally with zero ambiguity and no check; being good never cost anything. `[player]` → Checks on big swings; dilemmas where the right thing is expensive.
- **P3-7 · The climax had no mechanical stakes.** "London was mechanically safe regardless of my actions" — the abort was pure flavor (tied to P1-4 charge bug + P2-1 L4 gate). `[player]` → The climax must carry genuine jeopardy.
- **P3-8 · The dice always landed for the player.** "Still got a vote (but barely)." `[player]` Sanity-check the roll/modifier math once tells + opposition exist.

---

## P4 — DESIGN CALLS (decide before building)

- **P4-1 · Sapience of transformed objects.** Open: keep-sapient / non-sapient-objects / **rare-CHANCE** (Krahe's most-interesting idea). Note: BASILISK canon already calls test objects "inert, non-biological, visual effect only" → non-sapient OR chance agrees with canon. Cause = `firing.ts` genome-driven `speechOutcome` applied to ALL targets incl. objects.
- **P4-2 · Reactor 3-tier gating.** standard **1–2** / authorized **1–4** / overcharged **2–5** (BASILISK-gated; overcharge min-2 = can't do delicate work hot; pairs with reactorStress). Confirm ranges. *(Difficulty lever — overlaps P3.)*
- **P4-3 · Invasion needs a non-Act-3 trigger.** Stalling currently freezes the world. Proposed: X-Branch ETA clock ticking once `XBRANCH_AWARE`; invasion lands on first-of {Act 3 entry, ETA→0}. *(Normal path works — this is the stall case.)*
- **P4-4 · Crystal / Library B red herring.** "Library B needs the crystal" lives only in the deliberately-wrong `DINO_MANUAL_OLD` — a dead-end. Cut/retheme or leave as in-fiction misdirection.

---

## Notes
- Dashboard "calibration meter / access-level / achievement-descriptions" complaints were a **stale dashboard**, not code — current `webui.ts` is correct (`7bde345`). Restart-only; no fix needed.
- The invasion fired correctly on Act-3 entry this run (RAVEN TEAM breach) — P4-3 is only about the *stall* case.
