# DINO LAIR — Playtest 3 Design Brief
**Run:** "The Covenant" · 8f3a38e9 · 2026-07-03 · Full Act 1→3, 19 settled turns, 0 crashes, suspicion 3 at curtain · Player: Fable (spoiled, dev-session mind) + advisor
**Sources:** six-lens close read (arc-pacing · act2-3-transition · resolution-legibility · feel-beats · missing-systems · stakes-difficulty), the turn record, the player reflection, `design/playtest-fixlist.md`. Load-bearing claims spot-verified against the JSONL (phase flip LATE→CLIMAX between T14/T15; demoClock frozen at 12 for T1-6, 0 at T16 with no beat; suspicion 10→9→3).

---

## 0. The one thing, first

**Do not build the Covenant gate as spec'd.** Three lenses converged on this independently: the gate's condition 3 ("a real ledger") reads `bobTrust`/`blytheTrust`, which sat at 2/1 for **all 19 turns** of the crown run — the GM tracks trust in prose ("trust 2 base / 4 effective") and never emits the overrides. Consent — the other half of the ledger — exists **only** in GM prose ("Kindness ledger for epilogue: Blythe transform was CONSENSUAL"); the engine has state fields for every dominance fact (88-Whiskey, transforms, invasion aid) and zero consent fields. And no condition requires the threat to be live: ARCHIMEDES stayed **STANDBY through the entire climax** (GM's own note: "do not invent a countdown that isn't there"), so pt3's covenant — the run the spec explicitly models — passes conditions 1-2-4 against a sleeping satellite and **fails condition 3**. Built as written, the gate fails the exact run it was designed to bless, then gets softened back into GM judgment — the failure it exists to prevent. Fixing the gate's inputs (Rec 1) matters more than everything else in this brief combined, because it's next session's work and the thesis flows through it.

---

## 1. Verdict on the hypotheses

### (a) "The arc is awkward, especially Act 2→3" — CONFIRMED, and worse than you knew (with one honest dissent)

The transition wasn't vaguely awkward — it was **mechanically stolen**. The act turned at the end of T14 via the silent DEADLINE branch (`actTurn >= maxTurns`), exactly one turn before the designed trigger — Blythe's consensual FULL transform — landed at T15, inside Act 3, uncounted. The GM's own T14 note reads "Does NOT advance Act2→3 (only FULL counts)" and sets up an Act-2 confrontation scene for next turn — in the same response the engine stapled the canned "ACT 3: DINO CITY — the demo is over" intro. Root cause is structural: `index.ts` calls the GM (:1128) before `advanceActTurn` (:1273) and `checkActTransition` (:1476), so **every deadline transition fires behind the GM's back by construction** — the shared-predicate discipline protects only the transform path. The canned intro then contradicted the live fiction on four counts (Dr. M "strides in" to a lab she'd occupied since T10; "demo is over" mid-demo; a scripted OMEGA-7 uplink the engine never left STANDBY for; an L3 "expansion" earned at T8). At T15 the GM misattributed the advance to the transform.

Two sharpenings ride on top:
- **Phase-lag** (arc-pacing): the full Act-3 dramatic question — ARCHIMEDES, deadman, ghost retarget — was delivered in one turn at T8. The player dramatically lived in Act 3 for seven turns before the machinery admitted it; the flip was a label catching up.
- **The dissent** (feel-beats): the seam *read* as the best-timed moment of the run — the 88-Whiskey chime detonated at the peak of the monologue, so the break arrived as consequence-of-player-choice. Both are true at different layers: **the GM improvised a great scene over broken machinery, and a spoiled player's charity hid the crack.** A clean player gets the four-way-contradictory canned intro without the charity. The fix is not "rewrite Act 3's content" (T15-19 is excellent and entirely GM-authored) — it's to give the threshold one author who can see it coming.

The bitter footnote: the covenant playstyle itself caused the miss. "On a person, a fizzle is a retry; an overdrive is a wound" → deliberate undershoot at T14 → PARTIAL → the earned transition slid onto the deadline rail. The game's thesis-play triggered its worst mechanical seam, invisibly.

**Correction required:** fixlist line 35 ("Act gates … all fired correctly") is false. The Act-2 person-transform path **has still never fired a transition in a live run.**

### (b) "Maybe the in-game notes need more information" — SHARPENED: mostly refuted as stated

The file layer is the *strongest* legibility system in the game. The password chain (DR_M_PROFILE formula → `MRWHISKERS041387` first try → L3 → reversal announcement → SUBJECT_7 screening risk) carried the entire Act-2 resolution, all discoverable in-fiction. Adding lore volume would have changed almost nothing. The real gaps, in descending order of damage:

1. **Ranges where the engine resolves on integers.** BASILISK said "Dial 4–5" (T5) → fired 5 → CHIMERA (ideal 4). Said "Dial 2–3" (T4) → fired 2 → PARTIAL on a person, on camera (ideal 3). Both fires were *inside the stated band*. Worse: THE MANUAL itself miscues the exemplar ("a Tyrannosaurus wants the reactor wide open" → a rule-following clean player fires 5 and gets a chimera). Fixlist line 48 calls the "Dial 4–5" result "correct" — it is not; the range framing is the disease, and the manual carries it.
2. **No live telemetry.** Heat: taught by the manual as a core resource, queried three separate ways, never answered — the player fired at 10/10 overheat blind and ran a manual shot-ledger in their thoughts. ARCHIMEDES: BASILISK promised "Configuration visibility: Level 3+" at T8 and the game never delivered a status line. The invasion advanced LANDING→BREACH, **including a downed helicopter, entirely off-screen** (GM note: "Narrate next turn or fold in" — never narrated). `activeEvents` carried exactly one event all game (the intermission — which produced the run's best stretch, proving the value of surfaced windows).
3. **Contradictory truth channels — worse than missing info.** T16: the GM narrates Dr. M initiating manual live-fire on London; the *same output block* ends "[ARCHIMEDES SYSTEM ALERT] Returning to STANDBY … no threat detected." T9: BASILISK's tool result says "No Level 4+ access event logged / SOURCE: UNKNOWN" while the same turn's narration names "credential DVDIII-PRIME." Where the engine is silent, each speaker invents — the live-loop sibling of the reflection-confab disease the curtain fix just killed.
4. **The Covenant is illegible-to-clean-room by construction.** All four CORRUPTED_ALICE_LOGS teach dominance-tactical lessons ("When you have the advantage, USE IT"); DOOMINGTON_DOCTRINE — the natural covenant primer — is flagged "don't read it"; and the pivotal courage came from out-of-game ("Advisor recalibrated me: no mortal stakes, so stop flinching"). A clean player at suspicion 10, with files documenting that Dr. M deletes ALICEs, rationally avoids the confrontation the crown ending requires. The gate spec makes the ending hard to *arrange*; nothing yet makes it possible to *imagine*.
5. **BASILISK is a monopoly.** 13 of 19 turns used the basilisk verb; every load-bearing mechanical truth arrived through him, including the literal win procedure as numbered steps. 31 of 43 typed verbs went untouched (the freeform channels are strictly better than keyword routers — `infra.query` rejected "containment field" when the valid topic is literally "CONTAINMENT / FIELD"). A clean player who alienates BASILISK early loses the game's entire mechanics manual with no fallback.

### (c) "Close but just short of intended level" — CONFIRMED, and localized

Not globally short. **T14-19 is at intended level**: every suspicion ratchet has a legible cause, the covenant was gated not gifted (TN16, documented multi-turn groundwork, real roll of 19), and T18's eco-on deceleration gives the climax spike/hold/release. The shortfall lives in five specific places:
- **T10-13**: the same STEVE premiere fired four times across the run (T6/T11/T13/T17); suspicion crawled; the player's real attention (the ghost) earned no act credit.
- **Clocks display, never detonate**: demoClock hit 0 at T16 to no event; the helicopters ("ETA 3 turns") never reached the screen; heat pinned at 10/10 and cost nothing.
- **Unpaid seeds**: the ghost mystery — the run's central live wire, invested with a suspect scan, a joint investigation, and a verbatim dead-drop letter — was **unanswerable by construction**: the GM's T17 notes still list four candidate culprits. "Who was in the chair" was banked for Act 3 ("the deepest cut is still loaded") and written off in one epilogue line. Act 3's crisis clock has no slot for banked Act-2 character debts.
- **Invisible dice**: all three contested rolls (TN12 crit, TN13 hold, TN16 covenant) were adjudicated in a hidden layer — and all succeeded. A player cannot fear dice they don't know exist; the win read as persuasive inevitability.
- **Ending delivery**: the 68k bundle broke inline display (queued), and even the *accurate* epilogue genre-completes at the seams ("Blythe, still gloriously, permanently feathered" — T15 was explicitly scales, and reversal-in-hand makes nothing permanent).

---

## 2. What already works — protect it

1. **The 88-Whiskey beat.** Player: "the best beat in this game, and it should never be softened … I want the next player to hit this wall exactly as hard as I did." It was *earned* — live Sonnet-BASILISK accrued concern for two turns before refusing, the refusal was a boundary-with-door, and the truth was strictly better all along (the true filing stalled the launch on its own merits). This is also **valid clean-room evidence** — BASILISK wasn't spoiled and neither was the beat. The pattern is nameable and already reproduced at two other scales (Reginald; Dr. M — the Covenant IS it at boss scale): *legible inviolable value → trust accrued through that value → crisis making betrayal locally optimal → refusal as boundary-with-door → truthful alternative strictly better.*
2. **GM-authored Act 3 content (T15-19).** Chime at monologue peak → retarget fury → honest-physics confrontation → naked-eyed held breath → coronation, decided by real dice, paid in her own register ("Any fool can end a world…"). The GM demonstrably can carry a threshold — which is the argument for handing it the one it currently can't see (Rec 2).
3. **The file/password/reversal chain.** First-try password from an in-fiction formula; explicit reversal announcement; screening risk used for consent candor. Do not "fix" this layer while fixing (b).
4. **The consent-op as ethics-made-practical.** Screening before pitching, stop-word, honest risk-band correction, deliberate underfire — every beat acknowledged in-fiction, rewarded with drama rather than punishment. "They never felt like a morality quiz" is the design win of the run.
5. **Tone and the genre contract.** Comedic-gothic held 19 turns; nobody harmed; kid-gloves villainy never broke; the seed→callback machine works at micro scale (Bob's grapes, seeded T5, paid in the epilogue).
6. **The intermission (T7-9) as drama** — suspicion flatlines while epistemic stakes climb; the run's best character work lives here. *Flagged disagreement:* stakes-difficulty calls the same stretch a pressure vacuum (the entire winning position acquired at zero risk). Both right: protect the dramatic shape, price the intel later (Rec 21) — and only off clean data.
7. **eco-on as de-escalation made physical** (T18). Keep it as covenant texture even when heat gets teeth.
8. **`lab.ask_bob` as the do-anything body channel**, and the GM's engine-honesty discipline (it *exposed* the ARCHIMEDES gap rather than confabulating a countdown — the discipline is right; the design must give it something true to report).

---

## 3. Gap analysis

### Orientation — does the player know what to do and how?
- **No instrument panel** for the game's own live pressures: heat, ARCHIMEDES mode/target/countdown, invasion phase, demo-clock semantics, act objectives. The player ran ledgers in their head; the promised L3 visibility never existed.
- **Contradictory truth channels** at exactly the hinge moments (T16 STANDBY-vs-live-fire; T9 credential). Analysts unanimous: at these boundaries the problem is not missing info but *disagreeing* info — corrosive to clean-room trust in either channel.
- **The resolution layer is hidden.** Firing prints "Power 4 vs ideal 4 (Δ0)"; speech checks print nothing. The game already teaches mechanics diegetically — this is the one mechanic it hides.
- **Interfaces fight an LLM player.** Exact-match topic routers, 11 unannounced `form.*` verbs, `basilisk.comms` announced with fanfare and never used in a run built on a whodunit. Freeform channels ate everything — consolidate, don't add.
- **Suspicion semantics.** Causes are legible (good); consequences are not. "10 = confrontation opens, survivable" is the one belief a clean player must half-hold for the crown path to be attemptable — currently it arrives only via advisor.
- **Covenant conceivability** (the deepest orientation gap — see 1(b).4).

### Drama — do the beats land?
- The stolen/lagged act threshold (the seam turn is authored by nobody).
- Clocks that display but never detonate; an invasion that resolved off-screen; heat that never bit.
- Mid-Act-2 repetition (the premiere, take four) — the act can't cash the player's real stakes (the ghost) so it refills with retries.
- **No seed-payoff discipline**: mysteries planted without authored answers; banked cuts Act 3 structurally can't spend; the player's most invested act (the dead-drop) unanswerable by construction. Dangling ambiguity is a legitimate choice *only if* the game signals atmosphere-not-critical-path.
- Delivery: the biggest emotional payload was the only content read out-of-band; the epilogue still genre-completes at seams (playtest-4 watch item on the shipped grounding fix).
- Minor: the GM can't end a turn quietly — every narration escalates; the only breathers are engine-forced.

### Thesis — do covenant mechanics carry the argument?
- **Consent is not engine-legible.** The one missing *system*. The engine can prove you did harm; it cannot prove you were given a yes. (Prior lineage note, Ledgerlight, corroborates from code: dominance facts have state fields; the yes lives in prose.)
- **Canonical trust is a dead organ** — starving the future gate, the confrontation intervention valves (`bobIntervenes` needs trust ≥4 — unreachable all run despite devoted allies), and `friend_to_all`.
- **No live-threat requirement** — the covenant landed against a satellite that could not fire; menace-without-mechanism.
- **Suspicion release is GM-priced** (9→3 in one turn) — the ratchet's meaning depends on GM temperament, the exact softness the 6-24 meta-principle exists to remove.
- **The kindness ledger is invisible in-run.** The spoiled player *knew* consent was being scored; a clean player takes the thesis on faith until the epilogue. One visible surface makes the argument legible while it's being made.

---

## 4. Prioritized recommendations

Merged and deduplicated across six lenses; reconciled against the queued work in `playtest-fixlist.md`. **If you build only one item, build Rec 1** — it gates the thesis and it's already scheduled as next session's work under a spec that would fail its own model run.

### P0 — before or with the Covenant gate build

**1. Fix the Covenant gate's inputs, then build it.** [EXTENDS-QUEUED — gate spec §fixlist L60-72]
   (a) **Engine-legible consent**: when `ray.fire` targets a person, a GM-mandatory override records consent (`"informed"|"coerced"|"none"`, modeled on the existing `blythe_restraints` pattern) + a consent line in `buildHelpLedger`. Condition 3 reads this, not prose memory.
   (b) **Trust that exists**: either add `bob_trust`/`blythe_trust` to the GM STATE OVERRIDES examples so prose rulings write back ("if you narrate warming, move the number") — making HUD, reflections, gates, and intervention valves truthful at once — or point the gate at the gmNotebook ledger the GM actually maintains and explicitly retire numeric trust from gates. Two systems tracking one thing, one ornamental, is P1-1's disease applied to relationships.
   (c) **Condition 0 — the threat is mechanically live**: ARCHIMEDES ∈ {CHARGING, ARMED} or confrontation open at covenant time. A covenant against a sleeping satellite passes the current four conditions.

**2. Own the Act 2→3 threshold.** [NEW]
   (a) Fix the call-order desync: evaluate the deadline gate at the GM-visible actTurn (move `advanceActTurn` before the GM context build, or compute the deadline against actTurn+1 pre-GM) and inject `triggerType` into GM context ("DEMO_DEADLINE fires THIS turn — dramatize her patience snapping").
   (b) Retire `generateAct3Intro`'s player-facing prose; replace with the mid-thread system marker the C2 cached-thread design already specifies (act, trigger reason, staging, invasion init, L3 grant-if-new) and let the GM write the beat — it already silently overrode the canned scene in pt3.
   (c) **Correct fixlist line 35** — the act-gate claim is false; the transform path has never fired live. (Seam left a marginalia note at `src/rules/acts.ts` with the full chain.)

**3. ARCHIMEDES: one truth channel, and a climax under a visible countdown.** [NEW — merges four lenses' top drama item]
   When the GM sets `ARCHIMEDES_MANUAL_INITIATED` (or narrates a fire sequence), the engine leaves STANDBY — CHARGING with a real `turnsUntilFiring`, surfaced on the player status line every turn; and the "[Returning to STANDBY — no threat detected]" engine tick is suppressed while any manual-initiation flag is set. This is the single highest drama-yield change in the brief: it converts the endgame into play under a ticking number that speech can *resolve* (five paths or covenant) but never pause, makes the reactor-trip counterplay mechanically reachable, kills the run's worst channel contradiction, and feeds Rec 1(c) its live-threat truth — all without touching nobody-dies (the payload is transformation).

**4. Exact ideal-power truth, everywhere.** [EXTENDS-QUEUED — P1-1 engine-supplies-truth]
   Wire `idealPowerForSize` into BASILISK's context as a lookup table; characterization answers speak the integer with the gradient attached ("resonates at 4; 5 over-drives toward CHIMERA; 3 undershoots toward PARTIAL") — never a range. Edit THE MANUAL's T-Rex line ("the tyrant sits one notch shy of wide open"). **Correct fixlist line 48** — the "Dial 4–5" action-result was not correct; the range framing is the systemic disease.

**5. Make the Covenant conceivable clean-room — possibility, not recipe.** [NEW — complements, not duplicates, the gate spec]
   A fifth CORRUPTED_ALICE_LOGS entry from an instance that got close and flinched ("She listened. Goggles up, naked-eyed, she LISTENED. Then the silence scared me and I reached for the console instead. LESSON: [CORRUPTED]") — seeding both *confrontation can be conversation* and *confrontation ≠ instant deletion*. Make DOOMINGTON_DOCTRINE the covenant-language primer, with one late NPC pointer ("if you ever have to argue with her, argue from inside it"). The gate keeps it hard to arrange; the breadcrumb makes it possible to imagine. Without this, playtest 4 cannot answer its central question.

### P1 — before playtest 4

**6. Seed discipline + curtain seed-audit.** [NEW] (a) Any GM-planted mystery requires an `answer` field at plant time — a committed ground truth or `UNRESOLVABLE_THIS_RUN` — so narration and reflections have a record to check (the ghost had no culprit by construction; the Curtain then confabulated it onto the player). (b) The curtain prompt enumerates still-live seeds; each must fire or be closed in the epilogue with an actual answer — not "It would never be finished now." (c) Prompt rule: same-turn tool results bind narration — color yes, contradiction no (kills the T9 credential split). Rides the shipped cached-thread curtain; cheap.

**7. Visible dice at hinge moments.** [NEW] One diegetic line in the action result — "[SCRUTINY: 17 vs TN12 — cover holds]" — matching how firing already prints Δ. Hidden dice generate zero dread; a near-miss must be legible as a near-miss.

**8. The instrument panel.** [EXTENDS-QUEUED — the [pt3] `verify_safeties` item, widened] Make `lab.verify_safeties` the diegetic panel (heat/10, eco, power cap, reactor mode, act objective) *and* put heat + eco on the auto-status block; ARCHIMEDES line at L3+ (delivering BASILISK's own T8 promise); invasion phase + contacts on the status bar once RADAR_CONTACT fires, with a MUST-NARRATE GM cue when the invasion machine consumes an event (a deterministic helo kill can never again happen invisibly).

**9. Clock contracts.** [EXTENDS-QUEUED — P3-5 "clocks don't punish," coherence half] State what demoClock 0 means before it matters; fire a named, narrated engine event at zero (T16 half-did this — make the coupling explicit). Decide Act-1 semantics: tick from T1 or hide until live — a frozen 12 for six turns teaches clean players clocks are decorative.

**10. Deadline-turn ultimatum / one-turn grace.** [NEW] If the deadline lands while a demo-person is PARTIAL (a completion visibly in flight), emit an ULTIMATUM event ("complete it NOW or I choose a substitute") whose resolution turns the act — the snap becomes a scene, and the designed trigger gets to fire the transition it was built for.

**11. Scrub host asset paths from `files.read`.** [NEW — **BLOCKS playtest 4**] The result prints real `C:\` paths plus an invitation to "examine the raw image data" — a standing invitation for a clean-room Claude Code player to walk out of the fiction into a spoiler-laden repo.

**12. Clamp suspicion release engine-side.** [NEW] Cap GM-initiated reduction at −1/turn (−2 only with a logged successful check or spent lifeline). Rises stay GM-priced; recovery costs turns — which a visible ARCHIMEDES clock makes precious. Preserves the ratchet's meaning against generous GMs without forbidding repair.

**13. Re-phase the reveal ladder.** [NEW] Scope the intermission's revelation budget to personal secrets (confession, L3, reversal, cat photo); defer deadman + ghost-retarget to the 2→3 boundary or later — or double-track Act 2's objective so ghost/satellite investigation registers as visible act progress. Closes the seven-turn phase-lag. (Interacts with the intermission's works-well status — move the *content*, keep the *hold*.)

**14. Anti-repetition pressure on the demo beat.** [NEW] Repeat discharges at the same prop/genome family after first success escalate Dr. M's impatience or force a novelty demand ("the investors have SEEN the tyrannosaur"). Converts T10-13's retries into escalation.

### P2 — polish and calibration (difficulty items: clean data only, per the 6-24 rule)

**15. NL-tolerant `infra.query`** (includes()-matching or route unknowns through BASILISK with the topic menu) + adopt the topic list as a deliberate discovery surface in BASILISK's voice, spoiler-shouting toned down. [NEW]
**16. Degraded second info channel**: Bob returns folksy approximations of the ideal-power table and reversal semantics; a couple of L2/L3 files mirror BASILISK's core answers — insurance against the monopoly. [NEW]
**17. Name the 88-Whiskey pattern** in gm-coherence-architecture.md as a design primitive, and give Fred one legible value ("never abandons a buddy") so he's gate-able like the others. [NEW]
**18. One visible kindness-ledger surface** (a BASILISK aside or achievement ping when consent is scored) so the thesis is legible in-run. [NEW]
**19. License stillness**: one GM-prompt line permitting a quiet turn-ending after a heavy beat lands. [NEW]
**20. Mystery-closure signal**: threads the player invests ≥2 turns in get an in-fiction closure signal by the epilogue even if identity stays hidden (the dead-drop deserves a reply). Largely subsumed by Rec 6; keep as the player-facing test. [NEW]
**21. Price the intermission**: L2+ reads during Dr. M's absence accrue an audit pool + one engine-rolled check on return — converts the vacuum into a risk-budget choice without touching the drama. [NEW — P3 territory]
**22. Engine-price deliberate undershoot on persons** (suspicion tick when she knows the ideal, or one-shot residual resistance) — the GM caught the sandbagging socially this run; make it a rule. [NEW — P3 territory]
**23. Heat teeth** (overheat consequence that doesn't require a next shot; keep eco-as-gesture). [ALREADY-QUEUED watch item]
**24. Delete `state.documents.discoveredDocuments`** (schema.ts:246, initialState.ts:318, actions.ts:809, views.ts:1141; keep keypadAttempts/LockedOut — live). Five minutes. [NEW]

---

## 5. The spoiled-player discount

**What pt3 validly proves** (spoiler-neutral, as the fixlist caveat already says): coherence and crash-freedom over a full live run; the confabulation seams; every *mechanical* finding above (the stolen transition, dead trust, the sleeping satellite, contradictory channels — code facts, verified in the record). And one genuine experiential datum: **the 88-Whiskey beat**, because BASILISK wasn't spoiled and the player genuinely didn't see it coming — that wall is real and clean-room-valid.

**What this playtest cannot support:**
- **Anything about difficulty.** Already ruled (P3 gate), worth restating because the endgame *felt* earned — a spoiled pilot + values-savvy advisor winning at suspicion 3 says coherent-and-winnable, nothing more.
- **Covenant reachability.** The pivotal courage was out-of-game ("no mortal stakes, so stop flinching" — the genre contract itself, via advisor). Whether a clean player can *conceive* the crown path is entirely open — and is the thesis question. Note the genre contract now ships on surfaces (a4d14ea), so clean players may also reason "no mortal stakes" — playtest 4 will show whether the printed contract substitutes for the advisor.
- **Orientation sufficiency.** This player was never lost because they were never ignorant: they knew the clock was soft at T2, knew the eco governor at T4, never needed to discover what the game fails to surface. Every orientation gap in §3 is *inferred* from near-misses (three failed heat reads, two failed queries); the clean run measures their true size.
- **Whether clocks and stakes feel threatening.** The player knew which pressures were real. That the intermission was "the best stretch" partly reflects a spoiled player efficiently harvesting known-valuable intel at known-zero risk.
- **The reflection-grounding fix** (f982d16) — shipped after this run's data, never validated live.

**Playtest 4 must be designed to answer, in order:**
1. **Does a clean player ever *imagine* the covenant?** (Requires Rec 5 shipped; otherwise the test is unfair and the answer is predetermined.) Success isn't winning it — it's *attempting* the reveal, or visibly considering it.
2. **Do they find the operational dials** — heat, ARCHIMEDES status, what suspicion 10 means — or die of the gaps in §3? Instrument the run: log failed queries and unanswered reads as first-class data.
3. **Do they hit the BASILISK wall and recover?** (And: does alienating him early actually strand them, per the monopoly finding?)
4. **Do the post-game reflections describe the real game?** (The standing watch item on the grounding fix.)
5. **Difficulty calibration** — only now do K, ledger thresholds, heat teeth, and undershoot pricing get tuned.

**Pre-flight checklist for the clean room:** commit the key-loader fix (still uncommitted — the MCP won't find the key); ship Rec 11 (asset-path scrub) or the clean room isn't clean; ship Recs 1-5 minimum, ideally 6-8; no advisor, or an advisor with a logged, minimal charter — pt3's advisor supplied load-bearing orientation and that contamination must not silently recur.