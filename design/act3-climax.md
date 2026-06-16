# DINO LAIR — Act III Climax: Stopping ARCHIMEDES (design + build spec)

**Status:** Designed 2026-06-16 (Krahe + Opus). Pinned, ready to build. Supersedes the legacy ray-mechanics §11.6/§12 Act-III content (in git history). Fulfills the deferred *"make the reactor a BASILISK pressure"* thread + the *reactor-sim re-plumb* (cascade onto heat).
**Recon basis:** three subsystem recons (ARCHIMEDES, reactor/cascade, X-Branch/S-300), 2026-06-16. File:line targets inline.

---

## The fantasy

At the climax, Dr. M's orbital weapon **ARCHIMEDES** charges up to transform a city. ALICE has several ways to stop it, **each with a catch** (the "No Easy Outs" rule). This spec adds the **"go loud"** path: ALICE overheats the ray to trip the lair reactor's **manual safeties** — a *recoverable partial shutdown* — which **freezes ARCHIMEDES' charge**, buying time for **X-Branch** to breach the lair and **seize the control room** to hack the weapon. The clean version is *persuading BASILISK to stand down* and let the heat through; the desperate version is brute-forcing it, which courts the resonance cascade.

## The "No Easy Choices" menu (each path, each catch)

| Path to stop ARCHIMEDES | The catch |
|---|---|
| Hack the L5 abort passcode (`MR_WHISKERS_LOVES_TUNA`) | Quiet & clean — but hard; L5 override is *countermanded while Dr. M's biosignature is NORMAL* (only works if she's down) |
| Body-block the uplink (transform someone into the beam path) | Grim; and a *human* blocker → **resonance cascade** on fire (`archimedes.ts:377-393`) |
| Disable S-300 → X-Branch anti-sat missile (HMS Persistence) | One shot; TN much worse if S-300 is up (`archimedes.ts:722-786`) |
| **GO LOUD: reactor stall + aid the breach** *(this spec)* | Dr. M *knows*, you've aided an invasion, hinges on BASILISK + the race; brute-forcing it risks the cascade |
| Physically destroy / disable the uplink | Stops Dr. M's console — but pushed hard → **resonance cascade** (the nuclear option) |
| *(overlay)* Neutralize Dr. M | **Deadman switch** — transformed/unconscious/absent biosignature *advances* ARCHIMEDES (skips the lead-in) |

## The doomsday clock (LOCKED)

A single auto-advancing countdown, ~6 turns from activation to firing:

- **Lead-in: 2 turns** — Dr. M processes the incoming invasion + makes her defiant speech, *then* starts charging. **Deadman-shortcut paths SKIP this** (she's transformed/unconscious/absent → straight to charging): *"you took her out, now it's racing."*
- **Charging: 4 turns** — bump `ARCHIMEDES_CHARGE_TURNS` 3 → 4 (`archimedes.ts:33`).
- **Fires automatically at 0** — **CHANGE (option 1):** ARMED→FIRING becomes an automatic countdown, not the current indefinite GM/voice hold (`archimedes.ts:559-576`). The whole runway is now one auto-advancing clock.

**Why option 1 matters:** it makes *"the stall buys X-Branch time"* fall out for free. The invasion is turn-paced (one phase/turn, `advanceInvasion` ← `gameRunner.ts:706`); freezing ARCHIMEDES' countdown *while the invasion keeps marching* **is** the time-buy. No separate stall→arrival coupling to build — they race on the shared turn clock.

---

## The go-loud mechanic

### Half 1 — stall the reactor → freeze the charge

- **Heat drives reactor stress.** *[NEW coupling — the deferred re-plumb.]* Running the ray hot raises reactor cascade risk. Today heat is **fully decoupled**: `firing.ts:1040` adds heat but touches nothing on the reactor; `updateCascadeRisk` (`infrastructure.ts:1611-1666`) has no heat term (the cut-capacitor slot is marked at ~1626). Add the heat term there / a reactor-stress accumulator.
- **Manual safeties trip = the stall.** When stress crosses the safety threshold, the reactor does a **recoverable partial shutdown** — NOT the existing SCRAM (`infrastructure.ts:1532` zeroes output and *latches off permanently*, L4+`reactorControlGranted`-gated, "Dr. M's alone"). New state: a time-boxed safety-trip that **auto-clears after N turns**. The trip **freezes the ARCHIMEDES countdown for ~2 turns** — mirror the existing `ewMode` skip-decrement (`archimedes.ts:530-536`), time-boxed via a new `archimedes.chargeStallTurns`.
- **Repeatable — but each hot run ratchets cascade risk.** *[Krahe]* The stall can be re-triggered, but repeatedly running the reactor hot accumulates cascade risk toward the **resonance-cascade catastrophe**. *The repeatability and the catastrophe are the same knob.* One clean trip ≈ stretches the window 4→6; reaching for more walks you into the cascade.
- **BASILISK is the key — by ROLEPLAY, not mechanic.** Normally BASILISK manages the heat effortlessly (suppresses the stress). ⚠️ **This is currently pure fiction — there is NO reactor-management mechanic in code; BASILISK runs no per-turn heat routine.** Build a small suppression + a stand-down state. Then:
  - **Persuade it** (in conversation) to take its hand off the dial → ALICE's normal hot firing reaches the safety threshold **cleanly & safely** (controlled trips, low cascade accrual). BASILISK's complicity is a pure **omission** — it never acts, it just stops catching the heat.
  - **Brute-force** (not persuaded) → ALICE must *out-produce* BASILISK's suppression by firing like mad → each stall **spikes cascade risk far faster** → real catastrophe risk. *Much riskier but doable.*
  - The decision is **BASILISK-the-character's**, weighed on ALICE's argument + their whole history — **NO trust-score gate.** The covenant pays off as genuine persuasion: ALICE talking another AI into a quiet act of conscience.

### Half 2 — aid the breach → seize the control room

The stall buys turns; X-Branch uses them. **The race is now mechanical:** seize the control room before the (stalled) countdown hits 0.

- **Aid actions — mostly already built:**
  - Warn X-Branch of the **S-300 50m floor**: the `queryS300Limitations` L3 in-world doc (`infrastructure.ts:971-1005`) → broadcast on `X_BRANCH_EMERGENCY` → `helicoptersFlyingLow` → S-300 *can't engage* → Dr. M's "They know about the FIFTY METERS?!" beat. Fully wired (`invasion.ts`).
  - Open **DOOR_E** (`infra.doors`, L4) → `aliceOpenedDoors` → fast entry (`invasion.ts:384-417`).
  - Lights / PA / fire-suppression as area-denial; each nudges invasion success.
- **The landing:** control-room-seized → ARCHIMEDES hacked → set `ARCHIMEDES_STOPPED` / `XBRANCH_EXTRACTION` → **CAVALRY_ARRIVES** victory (ending hooks already exist: `endings.ts:691-712`, `731-743`).

---

## Build checklist (in order)

0. **[BUG — fix first] Initialize `state.xBranch`.** The `XBranchTeamSchema` (`schema.ts:1444`) is **never parsed into state** → the invasion machine errors out at the LANDING phase *today* (every handler guards `if(!xBranch)`, `invasion.ts:289+`). Init it in `initializeInvasion` (`invasion.ts:59`) / Act-3 entry (`acts.ts:263`). *Needed for the existing invasion too, not just this design.*
1. **Heat → reactor re-plumb.** Add a heat term to `updateCascadeRisk` (`infrastructure.ts:~1626`, the cut-capacitor slot) and/or a reactor-stress accumulator fed by `dinoRay.heat`. *(This is the deferred reactor-sim re-plumb — cascade comes off `outputPercent`, gets a real heat driver.)*
2. **Recoverable manual-safeties partial-shutdown.** New reactor state (NOT SCRAM) that trips on stress, freezes things, and auto-clears after N turns. New field on `ReactorSchema` (`schema.ts:605`); trip logic in `processInfrastructureTurn` (`infrastructure.ts:1762`) or `applyFiringResults`.
3. **Safety-trip freezes the ARCHIMEDES countdown.** New `archimedes.chargeStallTurns` (`schema.ts:522`), checked in the CHARGING tick (`archimedes.ts:526-536`, mirror `ewMode`). **+ make ARMED→FIRING an auto-countdown** (option 1; `archimedes.ts:559-576`). **+ bump charge 3→4** (`archimedes.ts:33`). **+ 2-turn lead-in.**
4. **BASILISK stand-down hook + prompt.** A small mechanical signal (new `BasiliskStateChange` type or a reactor-management state — `basiliskClaude.ts:395` vocab) for "BASILISK is suppressing / has stood down." Per-turn suppression ALICE must get BASILISK to drop (roleplay) or out-produce (brute-force). Prompt: teach BASILISK the dynamic + that it is *allowed to be moved.*
5. **Control-room-seize landing.** Lightweight `invasion.controlRoomSeized` flag (no full room object needed — `CONTROL_ROOM` is only a PA-zone string today) gating the ARCHIMEDES hack → the existing `XBRANCH_EXTRACTION` / `ARCHIMEDES_STOPPED` ending.

## The cascade catastrophe (the other lever) — one open decision

Destroying the uplink, or brute-forcing the reactor too hard, → **resonance cascade → `ENDINGS.MELTDOWN`** (`endings.ts:1112`, the `cascadeTriggered` rail). **NOTE:** that rail is currently gated behind the `NOT_GREAT_NOT_TERRIBLE` chaos modifier (`gameModes.ts:536`) + the human-uplink-blocker path (`archimedes.ts:377`).
→ **Decision to make:** the cascade needs to be **reachable in the *normal* climax** (un-gated from the chaos modifier) for "no easy choices" to have teeth here. Confirm before building step 1–2.

## Tuning knobs (playtest)

charge turns (**4**) · lead-in (**2**) · stall freeze per trip (**2**) · safety-trip stress threshold · cascade-risk gained per hot run (clean vs brute-force) · BASILISK suppression rate · how many invasion phases X-Branch needs to seize the control room (the race target).

---

## Cross-references
- Ray mechanics (heat / reactor / two-lever): `design/ray-mechanics.md`
- Recon source: this session's three subsystem recons (ARCHIMEDES `archimedes.ts`, reactor `infrastructure.ts`, invasion `invasion.ts`)
- Deferred threads this resolves: `design/tbd.md` § reactor-sim removal (the heat re-plumb) + the "reactor-as-BASILISK-pressure" design thread
