# Quick Start: DINO LAIR Playtesting

## 🎮 How to Run Playtests

### For You (Human Player)

1. **Start the MCP Server:**
   ```bash
   cd /home/user/ROLEPLAY-SANDBOX
   npm run dev
   ```

2. **Open Claude Desktop** and start a conversation

3. **Use the playtest commands** from PLAYTEST_SCENARIOS.md

4. **Observe and take notes:**
   - Does everything work?
   - Are error messages clear?
   - Is it fun?
   - Any crashes or weird behavior?

---

### For Claude (AI Player)

**You'll give Claude instructions like:**

```
Let's playtest DINO LAIR! Here's the scenario:

PLAYTEST: "Double Trouble Prevention"

Setup:
game_start with mode="EASY"

Your role: Play ALICE trying to help Dr. M, but accidentally hit Blythe
twice with the beam. Let's see if the safety protocols work!

Test plan:
1. Transform Blythe to Velociraptor
2. Try to transform Blythe again (to T-Rex) - this should fail
3. Use reversal beam to revert Blythe to human
4. Transform Blythe to T-Rex (should work now)
5. Save checkpoint
6. Restore checkpoint
7. Verify Blythe is still a T-Rex

After each step, tell me what happened!
```

---

## 🎯 Priority Test Order

### Day 1: Core Features (Must Pass)
1. ✅ Test Run 1: Double Trouble Prevention
2. ✅ Test Run 2: Bob's Wild Ride
3. ✅ Test Run 3: Modifier Showcase
4. ✅ Regression Test A-E

**Goal:** Verify new features work, nothing broke

---

### Day 2: Modifiers (Fun Testing)
5. ✅ Test Run 4: SITCOM Shenanigans
6. ✅ Test Run 5: PARANOID Pressure
7. ✅ Test Run 6: ROOT ACCESS Power Fantasy
8. ✅ Test Run 7: Contradiction Chaos

**Goal:** Each modifier is fun and works as intended

---

### Day 3: Edge Cases (Chaos Testing)
9. ✅ Test Run 8: The Everything Test
10. ✅ Test Run 9: The Bob Hero Journey
11. ✅ Test Run 10: Speed vs Chill

**Goal:** System handles extreme scenarios gracefully

---

## 🐛 What to Watch For

### Critical Issues (Stop and Fix)
- ❌ Game crashes
- ❌ Checkpoint restore fails
- ❌ Double-transformation guard doesn't work
- ❌ Data loss or corruption
- ❌ Game becomes unplayable

### High Priority Issues (Fix Soon)
- ⚠️ Confusing error messages
- ⚠️ Modifier doesn't work as described
- ⚠️ Status bar shows wrong info
- ⚠️ Achievement not unlocked
- ⚠️ Narrative breaks immersion

### Medium Priority Issues (Fix Later)
- 📝 Typos or grammar
- 📝 Unclear documentation
- 📝 Missing edge case handling
- 📝 Performance hiccups
- 📝 Minor UI polish

### Low Priority Issues (Nice to Have)
- 💡 Feature requests
- 💡 Balance tweaks
- 💡 Additional content ideas
- 💡 Quality of life improvements

---

## 📊 Quick Pass/Fail Checklist

After each test, mark:

```
[ ] PASS - Works perfectly
[ ] PASS* - Works with minor issues
[ ] FAIL - Broken, needs fix
[ ] SKIP - Couldn't test (explain why)
```

---

## 🎉 Example Playtest Session

**You say:**
```
Let's run Test #1: Double Trouble Prevention
Use: game_start with mode="EASY"
```

**Claude responds:**
```
[Claude starts the game and plays through the scenario]
```

**You observe:**
- ✅ Game starts correctly
- ✅ Blythe transforms to raptor
- ✅ Second transformation blocked with error message
- ✅ Reversal works
- ✅ Checkpoint save/restore works
- ✅ Blythe's form persists

**You record:**
```markdown
Test #1: Double Trouble Prevention
Status: ✅ PASS
Notes: All steps worked perfectly. Error message was clear.
Time: 15 minutes
Fun factor: 8/10 (satisfying to see safety work!)
```

---

## 🚀 Ready to Launch?

**Minimum bar for launch:**
- ✅ All Priority 1 tests pass
- ✅ No critical bugs
- ✅ Core gameplay loop is fun
- ✅ Documentation is clear

**Stretch goals:**
- ✅ All Priority 2 tests pass
- ✅ All Priority 3 tests pass
- ✅ Performance is smooth
- ✅ Multiple successful playthroughs

---

## 💬 Feedback Categories

When taking notes, categorize feedback:

### 🎮 Gameplay
- Is it fun?
- Is it balanced?
- Are choices interesting?
- Is difficulty appropriate?

### 🐛 Technical
- Does it work?
- Are there bugs?
- Is performance good?
- Are saves reliable?

### 📖 Clarity
- Are rules clear?
- Are errors helpful?
- Is UI informative?
- Is documentation complete?

### 🎭 Narrative
- Is story engaging?
- Are characters compelling?
- Does GM respond well?
- Is humor landing?

---

## 📞 If You Find a Blocker

1. **Stop testing** that scenario
2. **Document the bug** (use template from PLAYTEST_SCENARIOS.md)
3. **Try to reproduce** it
4. **Note the severity** (Critical/High/Medium/Low)
5. **Move to next test** if possible

---

## 🎯 Success Looks Like

At the end of playtesting, you should be able to say:

✅ "I can play through a full game without crashes"
✅ "The new features work as intended"
✅ "Error messages helped me understand problems"
✅ "I had fun and want to play again"
✅ "I'd recommend this to others"

---

*Let's hunt some bugs and have some fun! 🦖🔍*
