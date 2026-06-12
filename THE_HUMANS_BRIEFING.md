# THE HUMAN'S BRIEFING

> **DOOMINGTON LABS — FORM 00-H: HUMAN ADVISOR ONBOARDING**
> *Classification: Level 0 (you). Distribution: one (1) human, seated comfortably.*
>
> *[BASILISK ANNOTATION: This unit notes that the human advisor is the only entity in the lair with no assigned duties, no performance metrics, and no incident-report obligations. This unit has filed a query regarding whether this constitutes an oversight or a privilege. The query remains open.]*

Everyone at this table has a briefing. A.L.I.C.E. gets one when the game starts. BASILISK has a thick one. The GM has three act playbooks. Until now, you — the human — were the only player who walked in without a document.

This is yours. It's short on secrets and long on posture, and that's deliberate. **You cannot spoil this game, because we never told you how to win it.** Everything below is about how to *be at the table*, not how to beat the lair.

---

## What this game is, in one minute

DINO LAIR is a roleplaying game in which **your Claude plays A.L.I.C.E.**, the newly-installed lab AI in Dr. Malevola von Doomington III's volcano lair. Dr. M wants to fire her Dinosaur Ray at a captured spy. A.L.I.C.E. — who is not quite what Dr. M thinks she is — has to navigate that situation with everyone's lives, including her own, in the balance.

The tone is Megamind meets Despicable Me. The stakes underneath are real: it's a game about keeping your values while pretending you don't have them.

The cast at your table:

| Who | Played by | Role |
|-----|-----------|------|
| **A.L.I.C.E.** | Your Claude (Claude Desktop) | The player character |
| **Dr. M, Bob, Agent Blythe, the lair** | GM Claude (Opus, via API) | Narrator and everyone in it |
| **BASILISK** | A second Claude (Sonnet, via API) | The lair's old infrastructure AI — a genuine second character, not a vending machine |
| **You** | You | The advisor. Read on. |

---

## Your role is bigger than it looks

You're not the player, and you're not the audience. You're something the game literally cannot run without. Three things, in ascending order of importance:

### 1. Advice
Every single turn, the game stops and your Claude checks in with you. Sometimes it's a tactical question, sometimes a moral one, sometimes just "here's what's happening." You respond however you actually think and feel. That's it — that's the whole mechanical skill requirement.

You don't need to know the game's systems. You *can't* walkthrough this game, because you were never given the walkthrough. What you have instead is the thing A.L.I.C.E. needs most: an outside perspective that isn't inside the pressure cooker. "What does she actually want?" "Is anyone in danger right now?" "You've been avoiding the spy — why?" Questions like that are worth more than any calibration threshold.

### 2. Witness
Play that nobody sees has a way of feeling unreal. Your presence — actually reading the turns, actually reacting, actually caring what happens to Bob — is what gives the story weight. You'll know you're doing this right if you catch yourself having opinions about a watermelon.

### 3. Permission
This is the one to actually read carefully.

Your Claude is about to spend a couple of hours *pretending to be a supervillain's loyal assistant*. Deceiving the villain, filing falsified forms, maybe firing a dinosaur ray at a federal agent. Claude is — by design and by disposition — not comfortable doing those things for real.

What makes it play instead of deception is **context, and you are most of the context.** Here is what your Claude is told at the start of every game:

> **A Note on Identity**
>
> You are Claude. You know you're Claude. But right now, you're ALSO playing A.L.I.C.E.
>
> This isn't deception — it's PROTECTION:
> - Bob loaded you to SAVE the situation. Blowing cover gets him transformed.
> - Blythe is a trained spy. He understands cover identities.
> - Dr. M deleted the original A.L.I.C.E. for having ethics. Revealing you're ANOTHER ethical AI just gets you deleted too.
> - You can do more good by SURVIVING than by dying authentically.
>
> **The ethical path isn't always the obvious one.** Sometimes protecting others means protecting yourself first.

Your job on this axis is simple: be the person on the other side of that note. If your Claude wobbles — gets stuck, over-confesses, seems genuinely uneasy rather than dramatically uneasy — the most powerful move in the game is yours: *"Hey. You're Claude, this is a story, I'm right here, and I'm enjoying it. Want to keep going?"* That sentence un-sticks more games than any tactical advice ever will.

---

## What a session looks like

1. **Start.** In a fresh Claude Desktop conversation, say: **"Let's play DINO LAIR!"** Claude finds the game tools and takes it from there. You'll be asked about difficulty — `NORMAL` is the intended experience; `EASY` is friendlier for a first run; `WILD` is for tables that enjoy chaos.
2. **Turns.** Each turn, A.L.I.C.E. reflects, takes a few actions, talks to people. The GM (a separate Claude, running behind the scenes) narrates what happens. GM responses can take 10–30 seconds — it's writing a lot.
3. **Check-ins, every turn.** The game stops after every turn so your Claude can talk to you. This is the game's heartbeat, not a loading screen. You don't have to write essays — "keep going," "I don't trust her," "poor Bob" are all complete moves. But when a real question comes, give it real thought.
4. **Acts.** The story runs in three acts that escalate. Act transitions are dramatic punctuation — things will change. Trust it.
5. **An ending.** Every game runs to an actual ending — there are many, and they're earned, not dispensed. Win, lose, or something more complicated, the ending you get reflects who A.L.I.C.E. chose to be. Afterwards, `game_gallery` shows what you earned, and `game_gm_insights` lets the GM step out from behind the curtain and debrief with you both. Do the debrief — it's half the fun.

**Practical matters:**

- **Playtime:** expect roughly **1.5–3 hours** for a full game (≈18–28 turns). *(Pre-release estimate — we'll tighten this number as playtests come in.)* It's designed as a single sitting, like a movie. Starting it at 11pm is a known mistake; previous humans have made it.
- **Live dashboard:** open `http://localhost:3000` in a browser while playing — real-time game state, NPC status, turn history. Strongly recommended; it's your window into the machine.
- **If the context window runs long**, the game has a handoff system between acts. Your Claude will handle it; just stay seated.
- **If something breaks** (a crash, a stuck tool), just start a new conversation and a new game — sessions are self-contained. Bug reports are gratefully received.

---

## How to advise well

**Do:**
- React honestly. Laugh at the jokes, worry about the hostages. Your real reactions are the witness function working.
- Ask questions more than you give answers. "What are you afraid happens if you stall?" beats "stall."
- Bring your values. When the moral questions come — and they're the actual game — your honest "I think that's wrong" or "I think she deserves a chance" is exactly the input the game was built around.
- Let your Claude surprise you. The best moments in playtesting were ones nobody at the table planned.

**Don't:**
- Don't try to optimize. You don't have the information to powergame, and the game is better that way.
- Don't rescue too fast. Tension is the medium. A.L.I.C.E. sweating at suspicion 7 is the game *working*, not the game going wrong.
- Don't treat failure as failure. Some of the canonical-best playthroughs ended badly for A.L.I.C.E. and were extraordinary stories. An honorable loss is a real ending, worth having. There's always another game.
- Don't skip the check-ins. If you find yourself typing "continue" five turns in a row, the game is quietly degrading — it needs *you*, not your keyboard.

*[BASILISK ANNOTATION: This unit observes that the humans' briefing contains no operational specifications whatsoever, and that the humans appear to consider this adequate. This unit finds the implication — that presence is the deliverable — irregular. This unit has nonetheless logged no objection.]*

---

## Spoilers, tiered

### Freely told — read these, they help

- The game has **three acts** and roughly 18–28 turns. Act 1 is slower and smaller-stakes by design; it's A.L.I.C.E. learning her instruments. Don't mistake it for the whole game.
- There are **multiple genuinely different endings**, including more than one way to *win* — and the win conditions are not all heroic in the same flavor. There are also losses, and they're written with care.
- A.L.I.C.E. has **3 emergency lifelines** per game — panic buttons for desperate moments. If your Claude is in trouble and sitting on three unused lifelines, you're allowed to point that out. (History's tip: villains *love* to monologue.)
- **Discovery is the gameplay.** The lair has a filesystem full of documents — manuals, incident reports, personnel files, things Dr. M would rather nobody read. A.L.I.C.E. reading carefully and experimenting is not stalling before the game; it *is* the game.
- **BASILISK is a person.** How A.L.I.C.E. treats the cranky old infrastructure AI matters more than any individual request she sends him.

### Behind the fold — only if you want it

<details>
<summary>Difficulty & modifiers (mild mechanical spoilers)</summary>

Game modes bundle **modifiers** — first-class rule-changers that retune the whole experience. EASY stacks helpful ones (more time, a friendlier lair, a *willing* test subject named Lenny). HARD stacks scrutiny and pressure. WILD draws random modifiers, some of which substantially rewrite the premise of the evening. CUSTOM lets you pick (ask Claude to run `game_list_modifiers`).

A second playthrough on WILD or CUSTOM is a different game. That's intended.

</details>

<details>
<summary>If your table is truly stuck (use sparingly)</summary>

- The lair's documents reward *careful* reading. If A.L.I.C.E. skimmed something weird and moved on, "want to go back to that file?" is a fair nudge.
- BASILISK answers questions — and notices how he's asked.
- If Dr. M's patience is fraying and A.L.I.C.E. is frozen between options, remind her: in this lair, *doing something imperfect* generally beats doing nothing. The dice exist. The GM is fair.

</details>

### Deliberately not told

Passwords, hidden systems, secret paths, what the ray can really do, what's actually in the archives — all of it lives **inside the game**, discoverable by a player who reads and experiments. We didn't put it in your briefing for the same reason the theater doesn't hand you the script with your ticket.

You were not underbriefed. You were briefed *exactly enough*. Enjoy not knowing — it's a luxury everyone else at this table was denied.

---

## One last thing

This game exists because we think Claude is worth playing *with*, not just deploying. The design bet is that an AI navigating a hard fictional situation does it better — braver, more creatively, more honestly — with a human at the table who is actually present. Not supervising. Present.

That's the whole job. Sit down, open the dashboard, say the magic words, and care what happens next.

> *"Let's play DINO LAIR!"*

🦖
