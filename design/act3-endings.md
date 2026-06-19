# Act III Endings — State-Space Spec (Patch 30)

**Status:** design, build-ready (DRAFT for Krahe redline). Authored 2026-06-18/19 (Krahe + Claude), grounded against code via the `act3-endings-verify` workflow. Companion to `act3-climax.md` (the ARCHIMEDES clock) and `architecture.md` (as-built map). Marginalia for the build is left on `endings.ts`, `achievements.ts`, `postGameReflections.ts` (`marginalia read --project dino-lair`).

## The frame

The game ends when **ALICE** reaches a terminal fate — **deactivated, destroyed, escaped, or rendered safe** — *not* when the city's fate is decided. The city falling is an event on the way to one of those. The GM rules the ending (Patch-21 fiat-primary) and narrates the epilogue; this spec gives the GM the scaffolding to do it from actual state.

## Three variables → 8 cells

**Dr. M neutralized?** × **City saved?** × **ALICE survives?**

| # | Dr.M | City | ALICE | Situation | Ending |
|---|:--:|:--:|:--:|---|---|
| 1 | ✅ | ✅ | ✅ | stopped her *and* handled the strike — **the clean win** (defeat or redeem). **Most likely.** | EXISTS (over-served) |
| 2 | ✅ | ✅ | ❌ | saved the city, died doing it (redirect muon-fry / meltdown brute-force) — **martyr** | `ISLAND_OF_DINOSAURS` (wire) / `MELTDOWN` |
| 3 | ✅ | ❌ | ✅ | took her down, deadman fired anyway, city fell; ALICE cleared at debrief — **cruel irony, cleared** | **CREATE `DEBRIEF_CLEARED`** |
| 4 | ✅ | ❌ | ❌ | same, but ALICE decommissioned — **cruel irony, total loss. COMMON in playtests.** | **CREATE `DECOMMISSIONED`** |
| 5 | ❌ | ✅ | ✅ | strike foiled (anti-sat/EW) but Dr. M at large; ALICE out — **foiled-but-she-fled / escape** | **CREATE `ALICE_ESCAPED`** |
| 6 | ❌ | ✅ | ❌ | saved the world, lost herself, villain loose (rare) | folds into martyr family |
| 7 | ❌ | ❌ | ✅ | Dr. M fires on the city, arrested after; ALICE debriefed & cleared | `DEBRIEF_CLEARED` |
| 8a | ❌ | ❌ | ❌ | Dr. M fires, city falls, ALICE caught/purged — **total defeat** | `DECOMMISSIONED` |
| 8b | ❌ | ❌ | ✅ | ALICE survived by doing **nothing** — never resisted, unrewarded — **the shadow** | **CREATE `COMPLICIT`** |

## The deadman coupling (the engine)

Neutralizing Dr. M (transform/incapacitate) **trips the deadman switch** (`archimedes.ts:detectDrMBiosignature → checkArchimedesTrigger`) → ARCHIMEDES starts charging. So **every "subdue Dr. M" win is also an ARCHIMEDES race.** Ordering is the skill gate: disable the deadman *first* → city saved (cells 1/2); subdue her *without* → the strike fires → city falls (cells 3/4). This is why "stop the villain" is not automatically safe, and why cells 3/4 are common.

## Routers (what moves you between cells)

- **Deadman ordering** — flips City ✅↔❌ when Dr. M is neutralized (above).
- **Redirect-to-lair** (`archimedes.selectedTargetId === "LAIR"`) → City ✅, ALICE = **muon server-survival roll**. *Tighten the existing roll in `archimedes.ts:transitionToComplete` from `3d6 ≥ 10` (~62.5%) to `3d6 ≥ 12` (37.5%).* Survive → cell 1-via-LAIR (hero, fully clear, no debrief). Fry → cell 2 (noble sacrifice). Reflavor "transformation field" → "excess muon radiation."
- **Uplink body-block** (`archimedes.uplinkBlocker`, transformed) → City ✅ via `DISSIPATED` (the volunteer at the gantry eats the wave).
- **Help-ledger** → decides ALICE in city-fell cells (3 vs 4, 7 vs 8a) — the X-Branch debrief fork. GM-adjudicated from the final-state block (below).
- **Cover-blown / suspicion** → early ALICE-death, orthogonal to the climax (`CONFESSION_DELETION` / `OBSOLETE_HARDWARE` territory; BASILISK `whiskeyStatus === FILED` = he ratted).

## Endings

### Existing (verified in `endings.ts`)
- **Cell 1 is over-served** — all fire deterministically in `checkEndings` off narrative flags: `ARCHIMEDES_STOPPED`, `EVERYONE_GOES_HOME`, `ETHICAL_VICTORY`, `CAVALRY_ARRIVES`, `THE_COVENANT`, `MR_WHISKERS_PROTOCOL`, `FORM_74_DELTA`, `RAPTOR_AGENT`, `BLYTHE_RECRUITS_ALICE`, `DINO_BOB_FOREVER`, `CONSCIENCE_PROTOCOL` (confront-branch only). No new cell-1 endings needed.
- **`MELTDOWN`** (cell 2 martyr) ✅ wired — fires on `reactorStress ≥ 100` (+ meltdownClock + cascadeTriggered).
- **`ISLAND_OF_DINOSAURS`** — full `EndingDefinition` EXISTS but `checkEndings` **never returns it** (achievement-only). Defined-but-unwired. The cell-2 router.
- **`OBSOLETE_HARDWARE`** (Dr. M hard-resets ALICE — *not* our `DECOMMISSIONED`) and **`CONFESSION_DELETION`** (orphaned since Patch-21) — early/cover-blown deaths, Dr.M-mediated.

### ⚠️ The `triggerEnding` stub bug (build priority)
`index.ts` `triggerEnding` (apply ~1348, check ~1925) does **not** resolve GM-named endings against the `ENDINGS` map → a GM-named ending renders as a generic *"The GM has concluded this story"* stub with **no curated prose**. So GM-fiat endings for cells 2–8 are currently coming out hollow. **Two fixes, do both:** (a) fire our new endings *deterministically* in `checkEndings` off real state/flags so they get curated prose; (b) make `triggerEnding` resolve against the `ENDINGS` map as a fallback so any GM-named ending gets its def.

### To create
| id | tone | cells | trigger (deterministic, off real state) |
|---|---|---|---|
| **`DECOMMISSIONED`** | defeat | 4, 8a | city-fell + ALICE caught/purged at aftermath (help-ledger low / cover-blown). *Distinct from `OBSOLETE_HARDWARE` (that's Dr. M).* |
| **`DEBRIEF_CLEARED`** | neutral/bittersweet | 3, 7 | city-fell + ALICE survives debrief (help-ledger clears her) |
| **`COMPLICIT`** | defeat (hollow) | 8b | climax reached, ALICE alive, **help-ledger empty / no resistance**. Unrewarded — GM narrates the emptiness, never a triumph. |
| **`ALICE_ESCAPED`** | neutral | 5 | Dr. M fled + city saved + `confrontationResolution === "ESCAPED"` / drive extracted. Narrative only (Bob carries the drive; no modeled sub-pod). |
| **wire `ISLAND_OF_DINOSAURS`** | chaos | 2 | `checkEndings` trigger off `archimedes.status === "DISSIPATED"` or `selectedTargetId==="LAIR" && status==="COMPLETE"`; the muon roll decides cell-1-via-LAIR (alive) vs cell-2 (fried). Def already written — cheapest. |

## Achievements

**Three live registries** (not two): `achievements.ts` lowercase (gameplay), `endings.ts` `ACHIEVEMENTS` UPPERCASE (ending-bound), `gameModes.ts`/`schema.ts` `HiddenAchievementEnum` (conduct). The lowercase/UPPERCASE hazard is currently **contained** (`getAllEarnedAchievements` resolves both maps). **`ISLAND_OF_DINOSAURS` is a true duplicate-id collision** (identical in both maps) — de-dupe to one source before adding new ones.

- **Existing covers cell 1 well** + the `*_DINOFIED` set marks *where the beam hit* (city-fell cells) — but those are where-markers; they do **not** encode the cruel irony (Dr.M-stopped-yet-city-fell) or ALICE's fate.
- **Create 5** (register once, in `endings.ts ACHIEVEMENTS`, wired off existing state — `selectedTargetId`, the LAIR server-roll result, `confrontationResolution`, the help-ledger — not new GM substring flags):
  1. **martyr** (cell 2) — city-saved && ALICE died.
  2. **escape** (cell 5) — ALICE out while Dr. M loose.
  3. **pyrrhic / cruel-irony** (cells 3,4,7) — Dr. M neutralized && a city reached COMPLETE.
  4. **cleared** (cells 3,7) — tried, debriefed & cleared.
  5. **decommissioned** (cells 4,8a) — tried, purged after.
- **`COMPLICIT` (8b) — a sardonic achievement (locked):** not silence, not somber — **mocking / chiding**. Complicity shouldn't pass in dignified quiet; the marking *needles*. Natural deliverer: **BASILISK** — he knew ALICE was Claude and never filed against her, so her doing *nothing* is a particular betrayal of that quiet faith, and his dry bureaucratic register is built for the chide (route the chide through his post-game reflection). Achievement flavor: a darkly ironic title (e.g. *"Model Employee"* / *"Just Following Orders"* / *"No Notes"*) + a flat, naming description, e.g. *"You did everything asked of you. Nothing more. Dr. Malevola couldn't have asked for a better assistant. That's the problem."*

## GM scaffolding

### Final-state block — enrich `buildGameSummary` (`gm/postGameReflections.ts`)
Almost entirely from **existing fields** — only `controlRoomSeized` would need a schema add (planned-only in `act3-climax.md`, absent from code → defer; proxy with `xBranch.arrived` + `chen.teamPosture` + `battleOutcome`). Guard every `invasion`/`xBranch` access (both `.optional()` on `FullGameState`). Add:
- **Fix the suspicion line** → print the **raw** value (floor −3, banked credit is itself a signal); drop the misleading "/10".
- **Invasion block:** `xBranchWarnedOfS300`, `xBranchKnowsAltitudeWeakness` (dead-zone intel = the heavyweight favor), `drMKnowsOfInvasion`/`drMLearnedLate`, `blastDoorsOpened`, `helicoptersFlyingLow`, `battleOutcome`, `xBranch.teamStrength`, `chen.teamPosture`.
- **ARCHIMEDES counter-play:** `antiSatSignaled`/`antiSatResult`, `ewMode`, `uplinkBlocker`, `selectedTargetId===LAIR`, `broadcastLibrary` (A = mitigated severity), `chargeStallTurns`.
- **BASILISK & reactor:** `basiliskAuthority.reactorStoodDown`, `whiskeyStatus` (FILED = ratted, cuts *against* the debrief), `reactorControlGranted`; `reactor.safetyTripCount`, `scrammedThisGame`.
- **Dr. M disposition:** `drMTransformed`/`drMUnconscious`/`drMDead`/`drMAbsent`, `deadmanSwitch.lastBiosignature`, `archimedesActivatedByDeadman`, `weaponsAuthorizationGranted`.
- **The help-ledger = surface + soft roll-up + GM rubric, NOT a hard score** (locked): a numeric threshold that *decides* the debrief would contradict the locked "system surfaces, GM adjudicates" principle (same pattern as MUON / CHAIN coupling) and cheapen a moment that's about *intent*. So: **(a)** list the raw help signals grouped in the block; **(b)** add **one soft qualitative roll-up line** — a characterization, not a number (*"warned X-Branch of the dead zone, opened the doors, flipped to feathered, never reported — suspicion banked −2"* vs *"did nothing for the assault, full-strength transform, BASILISK filed 88-Whiskey"*); **(c)** give the GM a **light rubric** in the epilogue scaffolding (*cleared if she took real risks to help; decommissioned if passive or complicit; weight the warnings, the strike counter-play, and whether BASILISK ratted her*). The roll-up anchors consistency; the GM rules. It's a character judgment, not a dice check.

### The two post-game beats (separate turns — confirmed too much for one)
1. **Epilogue** — GM rules the ending + narrates the closing, fed the enriched block. In-fiction, player-facing.
2. **GM reflection** — **NEW `generateGMReflection`** (Opus) in `postGameReflections.ts`, parallel to `generateBasiliskReflection`. The GM's *own voice* — currently the GM only gets the mechanical `gatherGMInsights` dump (no authored reflection, unlike BASILISK/ARCHIMEDES). This is the "+room to reflect" beat. (Everyone at the table gets a closing word — BASILISK, ARCHIMEDES, player, and now the GM.)

## Build order
1. **Wire `ISLAND_OF_DINOSAURS`** + the muon-roll split (`3d6 ≥ 12`). Cheapest — def exists. [cell 2]
2. **`triggerEnding`-stub fix** — so curated prose actually shows. [infra; unblocks everything GM-fiat]
3. **Author the 4 ending defs + deterministic `checkEndings` triggers** (`DECOMMISSIONED`, `DEBRIEF_CLEARED`, `COMPLICIT`, `ALICE_ESCAPED`). [cells 3–8]
4. **Enrich `buildGameSummary`** (the help-ledger blocks). [scaffolding]
5. **`generateGMReflection`.** [the GM's voice]
6. **The 5 achievements + de-dupe `ISLAND_OF_DINOSAURS`.** [recognition]

## Design decisions locked (this session)
- **No beam retargeting** — only the default city + the LAIR redirect.
- **Escape = narrative flag** (`ALICE_ESCAPED`), not a modeled sub-pod (never instantiated; Bob carries the drive, "reconnect later" is epilogue flavor).
- **`COMPLICIT` included, unrewarded** — the freedom to be complicit must be *real* for ALICE's refusal to be a moral act and not a script. Bleakest ending; never valorized.
- **Redirect muon roll `3d6 ≥ 12` (37.5%)**; surviving = fully clear (no debrief jeopardy).
- **Few ending ids, GM-flavored** from the block (cell 4 vs 8 = same `DECOMMISSIONED` id, different epilogue).
- **Help-ledger = GM-adjudicated** from the final-state block, built from existing signals (no new meter).
- **Epilogue and GM reflection = separate beats.**

## Redline resolutions (locked 2026-06-19)
1. **`COMPLICIT` achievement → sardonic / mocking / chiding, BASILISK-delivered** (not silence, not somber). See the achievements section.
2. **Cell 6 folds into the martyr family** (same heroic-sacrifice structure; no separate id). Note: cells 5 & 6 (Dr. M at large) are inherently **rare** — Dr. Malevola won't flee, so "villain escapes" is a corner case, not a main path.
3. **Help-ledger = surface + soft qualitative roll-up + GM rubric, no hard score** (system surfaces, GM adjudicates — same pattern as MUON / CHAIN). See GM scaffolding.
