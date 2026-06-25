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

- **✅ P2-1 DONE (2026-06-24).** Root cause: `getInfraControlKey` collapsed *every* archimedes subcommand to the `"infra.archimedes"` key (requiredLevel 5), so the L5 gate (`checkInfraControlAccess`) fired before the saboteur subcommands reached their already-L4-aware handlers. Fix: a new `"infra.archimedes.saboteur"` map entry @ L4 + a saboteur-token branch in `getInfraControlKey` (checked BEFORE the generic catch) routing switchTarget/switchLibrary/signalAntiSat/ew_mode → L4; bare mode-setting (STRIKE/cancel) stays L5. 6/6 sim (L4 passes, L5 still gates mode-setting, L3 still blocked), 38-38 smoke. The whole Act-3 toolkit is reachable at L4 — no more BASILISK-mediation-only climax.
- **✅ P2-2 DONE (2026-06-24).** `infra.pa` (advertised in the L4 dump) was unknown — only `basilisk.pa`/`pa`/etc. were wired. Added `infra.pa` as an alias in all three spots: `getInfraControlKey`, the dispatch matcher, and the COMMAND_REGISTRY aliases. 1/1 sim.
- **✅ P2-3 DONE (2026-06-24).** `lab.containment` only read `{action: "ACTIVATE"|...}`, so a reasonable `{engage:true}` returned "Unknown action: undefined." Handler now accepts `{engage: true/false}` (→ ACTIVATE/DEACTIVATE) alongside the canonical `{action}`. 3/3 sim.
- **✅ P2-4 DONE (2026-06-24).** Krahe's call: not a shorter password, an EXPLICIT FORMAT. L3 → `MRWHISKERS041387` (something she loves + an important date, MMDDYY). DR_M_PROFILE now states the format outright (*"something she LOVES, then a date that matters, MMDDYY"*) so the guess space collapses; `normalize()` now strips `/` and `.` too, so `Mr. Whiskers 04/13/87` matches. Old `MRWHISKERS0413` retired. 3/3 sim (`passwords.ts` + `filesystem.ts`).
- **✅ P2-5 DONE (2026-06-24).** The keypad lockout never touched suspicion ("Dr. M notified" was flavor). Now each miss = +1 suspicion, lockout (3rd strike) = +2 more (console pinged, message updated), emergency single-fail lockout = +3. Brute-guessing now costs — a small teeth bonus too (`actions.ts`). 1/1 sim.
- **✅ P2-6 NOT A BUG (2026-06-24).** `SPINOSAURUS_JP3` **exists** in `genomes.ts:260` AND the manual (`filesystem.ts:264`) — they match, it's fireable (verified). BASILISK's "clerical error" was a **confabulation** (it denied a real profile) — now forbidden by the P1 "engine is the only truth" directive. No data change needed.
- **✅ P2-7 DONE (2026-06-24).** The L2 unlock display (`passwords.ts` ACCESS_LEVEL_UNLOCK_DETAILS) advertised TWO phantom files — `SAFETY_PROTOCOLS` AND `GENOME_LIBRARY_A` (both 404'd in the run). Replaced both with real L2 files (DR_M_PROFILE, LAIR_BLUEPRINT, SUBJECT_7). Now the unlock box only names files that exist.

### 🔎 BIOLOGICAL / "LIVE SUBJECT" LOCK — investigated (Krahe asked: GM invention?)
**Answer: NO — it was a real mechanic (`liveSubjectLock`), CUT in Patch 30** (`schema.ts:126` + `actions.ts:1027` both say so). It survives ONLY as a line in the deliberately-wrong `DINO_MANUAL_OLD` (`filesystem.ts:139`: *"Live Subject Lock - disable to fire at biologics"*). Today there is no lock — you can fire on living creatures freely. **DECISION NEEDED:** (a) leave it as old-manual misdirection (consistent with that manual being unreliable), or (b) RE-ADD it as a real safety mechanic — firing on a *living* subject requires deliberately disabling the lock (a gate + a moral beat: you have to *choose* to turn off the safety). Option (b) is a P3-difficulty/teeth win; (a) is zero-cost.

---

## P2.5 — MISC BUGS
- **✅ P2.5-1 DONE (2026-06-24).** `flags.lifelinesUsed` is a vestigial legacy field (old enum, NEVER written) — always `[]`. Canonical tracker is `emergencyLifelines.used`; the live snapshot (`index.ts`) now sources `lifelinesUsed` from it, so the two can't disagree.
- **✅ P2.5-2 DONE (2026-06-24).** `cavalry_arrives` used `hasNarrativeFlag("XBRANCH_EXTRACTION")` — a substring match that caught `XBRANCH_EXTRACTION_REQUESTED` (ALICE merely requesting). Now an EXACT flag match (arrived ≠ requested). 2/2 sim.

### ★★ P2 GATING TIER COMPLETE (2026-06-24) — all closed (P2-1..7 + P2.5-1/2), build green / 38-38 smoke. The biological "Live Subject Lock" was left as old-manual misdirection but now marked explicitly REMOVED (`filesystem.ts`); "re-add as a real safety mechanic" parked for **P3** (teeth + moral beat). Next tier: **P3 (difficulty — suspicion FUEL + adversarial Dr. M)**.

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
