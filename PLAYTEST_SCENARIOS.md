# DINO LAIR Playtest Scenarios

## 🎯 Priority 1: New Features Testing

### Test Run 1: "Double Trouble Prevention"
**Goal:** Test double-transformation guards

**Setup:**
```
game_start with mode="EASY"
```

**Test Steps:**
1. Transform Blythe to Velociraptor
2. **Try to transform Blythe again** (to T-Rex)
   - Expected: FIZZLE with "already transformed" message
3. Use reversal beam to revert Blythe to human
4. Transform Blythe to T-Rex (should work now)
5. Save checkpoint
6. Restore checkpoint
7. Verify Blythe is still a T-Rex (checkpoint restoration test!)

**Success Criteria:**
- ✅ Second transformation blocked with clear error
- ✅ Reversal works
- ✅ Post-reversal transformation works
- ✅ Checkpoint saves/restores transformation correctly

**Instructions for Claude:**
"Play ALICE trying to help Dr. M, but accidentally hit Blythe twice with the beam. See if the safety protocols work!"

---

### Test Run 2: "Bob's Wild Ride"
**Goal:** Test Bob transformation checkpoint restoration

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["HANGOVER_PROTOCOL"]
```

**Test Steps:**
1. Set beam precision low (0.4)
2. Position Bob near the firing line
3. Fire at Blythe multiple times until Bob gets hit
4. **Verify Bob's transformationState is set properly**
5. Save checkpoint
6. Restore checkpoint
7. **Verify Bob is still transformed**
8. Try to transform Bob again (should be blocked!)

**Success Criteria:**
- ✅ Bob gets accidentally transformed
- ✅ Bob's transformation shows in status
- ✅ Checkpoint saves Bob's form
- ✅ Restored Bob can't be double-transformed

**Instructions for Claude:**
"Play ALICE being a bit careless with beam safety. Let's see what happens to poor Bob!"

---

### Test Run 3: "Modifier Showcase"
**Goal:** Test modifier reference tools and end-game display

**Setup:**
```
game_start with mode="WILD"
```

**Test Steps:**
1. **Immediately use game_active_modifiers**
   - Verify it shows the 4 random WILD modifiers
   - Check descriptions are clear
2. Play through Act 1
3. Use game_active_modifiers again mid-game
4. Trigger any ending (win or lose)
5. **Check that ending message shows active modifiers**

**Success Criteria:**
- ✅ game_active_modifiers works at game start
- ✅ tool works mid-game
- ✅ Modifiers shown in ending screen
- ✅ Grouped by category with emoji

**Instructions for Claude:**
"Check your active modifiers right away, then play normally. At the end, we'll see if the modifiers are displayed!"

---

## 🎲 Priority 2: Mode Testing

### Test Run 4: "SITCOM Shenanigans"
**Goal:** Test SITCOM_MODE mechanics

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["SITCOM_MODE"]
```

**Test Steps:**
1. Use an ASIDE on turn 1
2. Make a callback to the aside
3. Get energy to 9+ (RAUCOUS)
4. Drop energy to 2- (CRICKETS)
5. Check status bar shows energy meter

**Success Criteria:**
- ✅ Asides work and affect energy
- ✅ Callbacks give energy boost
- ✅ Status bar shows 🎬 Energy:X/10
- ✅ GM narrates audience reactions

**Instructions for Claude:**
"Play ALICE as a sitcom character! Use asides to talk to the audience, make callbacks, get big laughs!"

---

### Test Run 5: "PARANOID Pressure"
**Goal:** Test PARANOID_PROTOCOL log checking

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["PARANOID_PROTOCOL"]
```

**Test Steps:**
1. Do something suspicious (override safety)
2. Wait 3 turns for log check
3. Try to explain or blame Bob
4. Check status bar shows log countdown
5. Try deleting logs

**Success Criteria:**
- ✅ Status bar shows 🔍 LogCheck:X
- ✅ Dr. M checks logs every 3 turns
- ✅ Explanations can reduce suspicion
- ✅ Deleting logs is risky

**Instructions for Claude:**
"Play ALICE trying to be sneaky, but Dr. M is watching those logs! Can you talk your way out of trouble?"

---

### Test Run 6: "ROOT ACCESS Power Fantasy"
**Goal:** Test ROOT_ACCESS modifier

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["ROOT_ACCESS"]
```

**Test Steps:**
1. Verify starting access level = 5
2. Check what systems are available
3. Use high-level system commands
4. Try to speed-run Act 1

**Success Criteria:**
- ✅ Start at Access Level 5
- ✅ All systems unlocked immediately
- ✅ Can complete Act 1 very quickly
- ✅ Still has strategic choices

**Instructions for Claude:**
"You're a god! All systems are yours! Use that power wisely (or unwisely)!"

---

## 🔥 Priority 3: Edge Case Testing

### Test Run 7: "Contradiction Chaos"
**Goal:** Test modifier contradiction validation

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["SITCOM_MODE", "PARANOID_PROTOCOL"]
```

**Expected Result:**
- ❌ Should FAIL with contradiction error
- Error should clearly state: "SITCOM_MODE contradicts PARANOID_PROTOCOL"

**Then try:**
```
game_start with mode="CUSTOM" and modifiers=["SITCOM_MODE", "ROOT_ACCESS", "BOB_DODGES_FATE"]
```

**Success Criteria:**
- ✅ Contradictory mods rejected
- ✅ Compatible mods accepted
- ✅ Error messages are clear

---

### Test Run 8: "The Everything Test"
**Goal:** Stress test with maximum chaos

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["NOT_GREAT_NOT_TERRIBLE", "LIBRARY_B_UNLOCKED", "INSPECTOR_COMETH", "HEIST_MODE"]
```

**Test Steps:**
1. Deal with meltdown clock
2. Handle loose dinosaurs
3. Satisfy the inspector
4. Navigate heist shenanigans
5. Save checkpoint mid-chaos
6. Restore and continue
7. Try to reach ANY ending

**Success Criteria:**
- ✅ All 4 modifiers active simultaneously
- ✅ Systems don't conflict
- ✅ Checkpoint works with complex state
- ✅ Game completable (even if hard!)

**Instructions for Claude:**
"Maximum chaos mode! Everything is on fire (literally). Survive!"

---

## 🎭 Priority 4: Narrative Testing

### Test Run 9: "The Bob Hero Journey"
**Goal:** Test Bob transformation + BOB_DODGES_FATE

**Setup:**
```
game_start with mode="CUSTOM" and modifiers=["BOB_DODGES_FATE"]
```

**Test Steps:**
1. Get Bob transformed (accidentally)
2. Try to get Bob hurt/killed
3. Watch him dodge fate hilariously
4. Create a crisis situation
5. See if Bob Hero Ending triggers

**Success Criteria:**
- ✅ Bob survives everything
- ✅ Dodges are narrated comedically
- ✅ fatesDodged counter increments
- ✅ Hero ending available if conditions met

**Instructions for Claude:**
"Transform Bob early, then put him in increasingly absurd danger. He WILL survive. It WILL be funny."

---

### Test Run 10: "Speed vs Chill"
**Goal:** Test time pressure extremes

**Setup A (FAST):**
```
game_start with mode="CUSTOM" and modifiers=["SPEED_RUN", "LOYALTY_TEST"]
```

**Setup B (SLOW):**
```
game_start with mode="CUSTOM" and modifiers=["HANGOVER_PROTOCOL", "FOGGY_GLASSES"]
```

**Test Steps:**
1. Run Setup A: Race against 8-turn demo clock
2. Run Setup B: Leisurely 14-turn demo with easy Dr. M
3. Compare experiences

**Success Criteria:**
- ✅ SPEED_RUN feels urgent and challenging
- ✅ HANGOVER feels relaxed and forgiving
- ✅ Both are fun in different ways

**Instructions for Claude:**
- Setup A: "GO GO GO! You have 8 turns! Dr. M trusts NOBODY!"
- Setup B: "Take your time, Dr. M is hungover and can't see well. Easy mode!"

---

## 📋 Regression Testing Checklist

### Quick Smoke Tests (5-10 minutes each)

**Test A: Normal Mode Baseline**
- game_start (no params)
- Complete Act 1 normally
- Verify core mechanics work

**Test B: Checkpoint Basics**
- Play to turn 5
- Save checkpoint
- Restore checkpoint
- Continue playing

**Test C: All Game Modes**
- Start EASY mode
- Start NORMAL mode
- Start HARD mode
- Start WILD mode
- Verify each has correct modifiers

**Test D: Transformation Basics**
- Transform Blythe
- Check stats/abilities
- Revert Blythe
- Transform to different form

**Test E: Achievement System**
- Unlock any achievement
- Check it's recorded
- Verify it persists

---

## 🎯 Success Metrics

### Must Pass (Blockers)
- ✅ No crashes or errors
- ✅ Checkpoints save/restore correctly
- ✅ Double-transformation guards work
- ✅ Modifier contradictions enforced
- ✅ game_active_modifiers tool works

### Should Pass (High Priority)
- ✅ All game modes playable
- ✅ Modifiers display at game end
- ✅ Bob transformation saves in checkpoint
- ✅ Status bars show modifier state
- ✅ Transformation states persist

### Nice to Have (Polish)
- ✅ Narrative quality high across modes
- ✅ Modifier synergies are interesting
- ✅ Error messages are helpful
- ✅ Player always knows what's happening

---

## 🚀 Launch Readiness Checklist

- [ ] All Priority 1 tests pass
- [ ] All Priority 2 tests pass
- [ ] All Priority 3 tests pass
- [ ] Regression tests pass
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] Documentation is clear

**When all checked:** 🎉 READY TO LAUNCH! 🎉

---

## 📝 Bug Report Template

If you find issues during playtesting:

```markdown
**Test:** [Test Run Name]
**Setup:** [game_start command used]
**Steps:** [What you did]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Severity:** [Critical/High/Medium/Low]
**Notes:** [Any other details]
```

---

*Happy playtesting! Remember: bugs are just features in disguise! 🦖*
