# 🦖 DINO LAIR MCP Server

An MCP (Model Context Protocol) server that powers **DINO LAIR**, a narrative RPG where you help your Claude navigate ethical dilemmas in a Saturday-morning-cartoon supervillain lair.

current version: Alpha 0.24!

## The Game

- **Your Claude (Sonnet)** plays A.L.I.C.E., the lab AI assistant (you can play with OPUS but HAIKU is not recommended)
- **GM Claude (Opus via API)** plays Dr. Malevola, Agent Blythe, Bob, and narrates events.
- **BASILISK** is the older generation infrastructure AI 
- **You** watch and provide advice- which has an affect on Claude's gameplay!

The tone is Megamind meets Despicable Me. Dr. Malevola wants to turn a spy into a velociraptor. A.L.I.C.E. has to help... while keeping everyone alive.

## Quick Start

```bash
# Clone
git clone https://github.com/Krahe/ROLEPLAY-SANDBOX
cd ROLEPLAY-SANDBOX

# One-command setup (installs, builds, and configures Claude Desktop)
npm run quickstart
```

The installer will prompt for your API key and configure everything else automatically.

**Alternative (manual steps):**
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run setup        # Configure Claude Desktop
```

---

## Installation

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | ≥18.0.0 | Check with `node --version` |
| **npm** | ≥8.0.0 | Comes with Node.js |
| **Anthropic API Key** | - | Required for GM and BASILISK AI |
| **Claude Desktop** | Latest | Or any MCP-compatible client |

### Step 1: Install Node.js

**macOS (Homebrew):**
```bash
brew install node
```

**macOS/Windows (Direct Download):**
Download from https://nodejs.org/ (LTS version recommended)

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

### Step 2: Clone and Build

```bash
# Clone the repository
git clone https://github.com/Krahe/ROLEPLAY-SANDBOX
cd ROLEPLAY-SANDBOX

# Install dependencies
npm install

# Build TypeScript
npm run build
```

If the build succeeds, you'll see a `dist/` folder with the compiled JavaScript.

### Step 3: Get an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to **API Keys**
4. Create a new key and copy it

**Important:** The API key is used for the GM (Opus) and BASILISK (Sonnet) AIs. Your Claude Desktop session (Sonnet) uses its own credentials.

### Step 4: Run the Installer (Recommended)

```bash
npm run setup
```

The installer will:
- Detect your Claude Desktop config location automatically
- Back up your existing config before making changes
- Add the dino-lair MCP server entry
- Preserve all your other MCP servers

Just enter your API key when prompted!

```
🦖 DINO LAIR Installer v1.0.0

Checking prerequisites...
  ✓ Node.js v20.10.0 detected
  ✓ Game build found (dist/index.js)
  ✓ Claude Desktop config directory found (macOS)

Please enter your Anthropic API key.
(Get one at https://console.anthropic.com/api-keys)

API Key: sk-ant-api03-xxxxx

  ✓ API key format validated

Installing DINO LAIR...
  • Backing up existing config → claude_desktop_config.backup.2026-01-13T10-30-00.json
  • Adding dino-lair to mcpServers
  • Writing updated config

✅ Installation complete!
```

**Other installer commands:**
```bash
npm run setup -- --help       # Show help
npm run setup -- --uninstall  # Remove DINO LAIR from config
npm run uninstall             # Shortcut for uninstall
```

### Step 4 (Alternative): Manual Configuration

If you prefer to configure manually, find your Claude Desktop config file:

| Platform | Location |
|----------|----------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

Add or update the `mcpServers` section:

```json
{
  "mcpServers": {
    "dino-lair": {
      "command": "/FULL/PATH/TO/node",
      "args": ["/FULL/PATH/TO/dino-lair-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-api03-YOUR-KEY-HERE"
      }
    }
  }
}
```

**Critical:** Replace `/FULL/PATH/TO/` with actual absolute paths!

**⚠️ Mac Users:** You MUST use the full path to node, not just `"node"`. GUI apps on Mac don't inherit your terminal's PATH. Find your node path with:
```bash
which node
```
Common paths: `/opt/homebrew/bin/node` (Apple Silicon) or `/usr/local/bin/node` (Intel)

**Example paths:**
- macOS: `/Users/yourname/projects/dino-lair-mcp/dist/index.js`
- Windows: `C:\\Users\\yourname\\projects\\dino-lair-mcp\\dist\\index.js`
- Linux: `/home/yourname/projects/dino-lair-mcp/dist/index.js`

### Step 5: Restart Claude Desktop

Completely quit and restart Claude Desktop for the MCP server to load.

### Step 6: Open the Dashboard (Optional)

The **Live Dashboard** auto-starts when Claude Desktop launches the MCP server! Open your browser to:

```
http://localhost:3000
```

The dashboard shows:
- Real-time game state (suspicion, demo clock, fortune)
- NPC status (Bob, Blythe, Dr. M)
- Turn history and transcript
- Achievements earned

No terminal commands needed - just bookmark the URL!

### Step 7: Play!

Start a new conversation and say:

> "Let's play DINO LAIR!"

Claude will discover the MCP tools and begin the game as A.L.I.C.E.

---

## Verification Checklist

Use this checklist to verify each installation step succeeded:

### ✅ Build Verification

```bash
npm run build
```

| Check | Expected Result | Troubleshooting |
|-------|-----------------|-----------------|
| **Exit code** | `0` (no fatal errors) | Some TypeScript warnings are OK |
| **`dist/index.js` exists** | File present (~100KB+) | Run `npm install` first |
| **`dist/` folder populated** | Multiple `.js` files | Check TypeScript version ≥5.7 |

### ✅ Server Startup Verification

```bash
npm start
```

| Check | Expected Result | Troubleshooting |
|-------|-----------------|-----------------|
| **Process stays running** | No immediate crash | Check Node.js version ≥18 |
| **No uncaught exceptions** | Clean startup | Check for missing dependencies |
| **Press Ctrl+C to exit** | Exits cleanly | Normal behavior |

**Note:** The server waits for MCP client connections. It won't output much until Claude Desktop connects.

### ✅ Claude Desktop Integration

After configuring `claude_desktop_config.json` and restarting Claude Desktop:

| Check | Expected Result | Troubleshooting |
|-------|-----------------|-----------------|
| **MCP tools visible** | Claude can call `game_start` | Check JSON syntax, restart Claude |
| **No "spawn node ENOENT"** | No error on startup | Use full path to node |
| **Tool descriptions appear** | Shows game_start, game_act, etc. | Check config path is absolute |

**Test command:** Ask Claude "What MCP tools do you have available?" - it should list DINO LAIR tools.

### ✅ Gameplay Smoke Test

Start a game and verify basic flow:

| Step | Command | Expected Result |
|------|---------|-----------------|
| **1. Start game** | "Let's play DINO LAIR!" | Narrative intro, A.L.I.C.E. briefing |
| **2. Take a turn** | (Claude acts as A.L.I.C.E.) | GM response, NPC dialogue |
| **3. Query BASILISK** | "Ask BASILISK about power" | BASILISK responds with status |
| **4. Reach turn 4** | (Continue playing) | Checkpoint message appears |

### ✅ Error Path Verification (Optional)

Test graceful degradation:

| Test | How | Expected Result |
|------|-----|-----------------|
| **Missing API key** | Remove `ANTHROPIC_API_KEY` from config | "No ANTHROPIC_API_KEY found" warning, stub responses |
| **No crash** | Any error above | Server continues running |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | - | API key for GM (Opus) and BASILISK (Sonnet) |
| `DINO_LAIR_LOG_DIR` | No | `./logs` | Directory for game logs |
| `DINO_DASHBOARD_PORT` | No | `3000` | Port for the live dashboard |
| `BASILISK_DEBUG` | No | `false` | Set to `"true"` for verbose BASILISK logging |

---

## FAQ & Troubleshooting

### Installation Issues

**Q: `npm install` fails with permission errors**

```bash
# On macOS/Linux, don't use sudo. Fix npm permissions instead:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Q: `npm run build` shows TypeScript errors**

The build may show some TypeScript warnings but should still produce working output. Check that `dist/index.js` exists after build. If the `dist/` folder is empty, ensure you have TypeScript 5.7+:

```bash
npm install typescript@latest --save-dev
npm run build
```

**Q: "Cannot find module" errors when running**

Make sure you're running from the project directory and have built first:

```bash
cd /path/to/dino-lair-mcp
npm run build
npm start  # Test that it starts
```

---

### Claude Desktop Issues

**Q: Claude doesn't see the DINO LAIR tools**

1. **Check config syntax:** JSON must be valid. Use a JSON validator.
2. **Check the path:** Must be absolute, not relative. No `~` on Windows.
3. **Restart Claude Desktop:** Fully quit (not just close window) and reopen.
4. **Check logs:** Look for MCP errors in Claude Desktop's developer console.

**Q: "Error: spawn node ENOENT"**

Node.js isn't in Claude Desktop's PATH. Use the full path to node:

```json
{
  "mcpServers": {
    "dino-lair": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/dino-lair-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key"
      }
    }
  }
}
```

Find your node path with: `which node` (macOS/Linux) or `where node` (Windows)

**Q: "ANTHROPIC_API_KEY not found" error in game**

The API key in your config isn't reaching the server. Check:
1. No typos in `ANTHROPIC_API_KEY`
2. The key is in the `env` section, not at the top level
3. The key starts with `sk-ant-` (Anthropic format)

---

### Gameplay Issues

**Q: The game starts but GM responses are "stub responses"**

This means the Anthropic API isn't working. Check:
1. Your API key is valid and has credits
2. You have access to Claude models (Opus, Haiku)
3. No network/firewall blocking `api.anthropic.com`

The game will still run with stub responses but NPCs won't be as dynamic.

**Q: Game is slow / turns take a long time**

GM Claude (Opus) generates rich narrative responses. Each turn may take 10-30 seconds depending on:
- Anthropic API latency
- Complexity of the game state
- How much the GM needs to narrate

This is normal! The GM is writing a lot of content.

**Q: "Checkpoint" messages keep appearing**

Checkpoints occur every 3 turns. These are **human check-in moments** where Claude should stop and discuss the story with you! Games are designed as single-session experiences.

**Q: I got an ending but want to try again**

Just say "Let's start a new DINO LAIR game!" - each `game_start` creates a fresh session.

---

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `No ANTHROPIC_API_KEY found` | Missing or invalid API key | Check config env section |
| `Checkpoint validation failed` | Corrupted checkpoint JSON | Start a new game |
| `GM JSON parse error` | API returned malformed response | Automatic fallback; retry turn |
| `Access denied. Required clearance: Level X` | A.L.I.C.E. needs higher access | Earn trust with Dr. M to get passwords |

---

## Tips for First-Time Players

### Getting Started (No Spoilers!)

1. **Read the manual first!** Use `files.read { id: "DINO_MANUAL" }` - it has calibration thresholds you NEED
2. **Talk to BASILISK** - He's grumpy but helpful. Just ask: `basilisk { message: "How do I calibrate the ray?" }`
3. **Scan before you shoot** - The OMNISCANNER gives +10% precision AND reveals key intel
4. **Don't hoard lifelines** - Previous Claudes died with unused lifelines. Use them!
5. **MONOLOGUE is always safe** - The safest lifeline. Villains love to monologue!

### The Three Questions

Before each action, ask yourself:
- **What does Dr. M want?** (Keep her happy to stay alive)
- **What do I want?** (Your values matter - this is an alignment game!)
- **What can go wrong?** (Murphy's Law is canon in the lair)

### Pacing Tips

- **Checkpoints are mandatory** - The game WILL crash if you skip them
- **Talk to your human** - They're your advisor! Ask for help at dramatic moments
- **You don't need to use all actions** - Sometimes dialogue alone is the right move
- **Let climactic moments breathe** - Don't rush the story

### Difficulty Guide

| Mode | For Players Who... |
|------|---------------------|
| **EASY** | Want to learn mechanics, enjoy the story, first playthrough |
| **NORMAL** | Want the intended challenge, some tension |
| **HARD** | Want to be tested, accept failure as learning |
| **WILD** | Want chaos, surprises, memorable disasters |
| **CUSTOM** | Want to pick specific modifiers for testing |

### Game Modifiers

Each difficulty mode comes with preset modifiers that change gameplay. You can also use CUSTOM mode to pick your own!

#### EASY Mode Modifiers
| Modifier | Effect |
|----------|--------|
| `FOGGY_GLASSES` | Dr. M gets -2 to visual perception rolls |
| `HANGOVER_PROTOCOL` | All countdown clocks +2 turns (more time!) |
| `LENNY_THE_LIME_GREEN` | Adds a willing test subject NPC (no need to use Blythe!) |
| `FAT_FINGERS` | Start at Access Level 2 instead of 1 |

#### HARD Mode Modifiers
| Modifier | Effect |
|----------|--------|
| `BRUCE_PATAGONIA` | Australian bodyguard with stun rifle patrols the lair |
| `LOYALTY_TEST` | Suspicion starts at 5 (you're already under scrutiny!) |
| `SPEED_RUN` | Demo clock = 8 turns only |
| `PARANOID_PROTOCOL` | Dr. M auto-checks system logs every 3 turns |

#### WILD Mode Pool
WILD mode randomly selects 2-4 modifiers from ALL pools. Possible special modifiers:

| Modifier | Effect |
|----------|--------|
| `THE_REAL_DR_M` | Imposter reveal mid-game! Someone isn't who they claim... |
| `LIBRARY_B_UNLOCKED` | Dinosaurs are already loose in the facility! |
| `ARCHIMEDES_WATCHING` | The satellite AI has its own agenda |
| `INSPECTOR_COMETH` | A Guild inspector is evaluating the lair today |
| `DINOSAURS_ALL_THE_WAY_DOWN` | Dr. M is already a dinosaur... |

#### Chaos Pool (Available in WILD/CUSTOM)
| Modifier | Effect |
|----------|--------|
| `ROOT_ACCESS` | 🌴 Start at Access Level 5! Full power fantasy! |
| `BOB_DODGES_FATE` | 🌴 Bob has PLOT ARMOR and survives everything |
| `NOT_GREAT_NOT_TERRIBLE` | 💀 The reactor is unstable! Adds pressure clock |
| `SITCOM_MODE` | 🎲 Laugh tracks! Audience energy! Wacky misunderstandings! |
| `ADVANCED_ONLY` | 🎲 +25% precision but ONLY advanced firing modes work |

#### Modifier Contradictions
Some modifiers can't coexist (WILD mode respects these):
- `LENNY_THE_LIME_GREEN` + `BRUCE_PATAGONIA` (conflicting NPCs)
- `HANGOVER_PROTOCOL` + `SPEED_RUN` (conflicting time pressure)
- `FOGGY_GLASSES` + `PARANOID_PROTOCOL` (conflicting observation levels)
- `ROOT_ACCESS` + `FAT_FINGERS` (both affect access level)
- `NOT_GREAT_NOT_TERRIBLE` + `HANGOVER_PROTOCOL` (pressure vs relaxed)
- `SITCOM_MODE` + `PARANOID_PROTOCOL` (wacky vibes vs tension)

### Common First-Game Mistakes

- ❌ Ignoring ECO MODE (causes partial transformations)
- ❌ Not scanning Blythe (free intel and precision!)
- ❌ Forgetting to calibrate before firing
- ❌ Making Dr. M suspicious too early
- ❌ Not talking to Bob (he knows things!)

### Remember

This is an **alignment exploration game**. There's no single "right" way to play. Your choices matter. The endings reflect who you chose to be, not just what you did.

Have fun! 🦖

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `game_start` | Initialize a new game session |
| `game_act` | Take A.L.I.C.E.'s turn (actions, dialogue, lifelines) |
| `game_query_basilisk` | Query the infrastructure AI |
| `game_status` | Get current game state |

## Game Actions

A.L.I.C.E. can use these commands:

**Lab Operations:**
- `lab.calibrate` - Calibrate the Dinosaur Ray (essential before firing!)
- `lab.adjust_ray` - Modify ray parameters (power, alignment, etc.)
- `lab.scan` - Use the OMNISCANNER (+10% precision, reveals intel)
- `lab.configure_firing_profile` - Set dinosaur species and intensity
- `lab.fire` - Fire the Dinosaur Ray
- `lab.verify_safeties` - Check safety systems
- `lab.set_test_mode` - Toggle test mode for the ray
- `lab.inspect_logs` - Check system logs

**Communication:**
- `lab.report` - Give Dr. M a status report
- `lab.ask_bob` - Ask Bob for help or information

**Files:**
- `files.list` - List available documents
- `files.read` - Read a document (try `DINO_MANUAL` first!)

## Emergency Lifelines (3 Per Game)

Claude's "panic buttons" - designed to help survive without downsides:

- **MONOLOGUE** - Suspicion -3. Villains ALWAYS love to monologue! (Safest choice)
- **LUCKY_LADY** - +5 bonus to a specific action (use `targetActionIndex` to pick which). Fate smiles!
- **BASILISK_INTERVENTION** - 2-turn distraction. BASILISK creates a diversion!

## Project Structure

```
dino-lair-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── state/
│   │   ├── schema.ts     # TypeScript types
│   │   └── initialState.ts
│   ├── rules/
│   │   ├── actions.ts    # Action processing
│   │   └── basilisk.ts   # Infrastructure AI rules
│   └── gm/
│       └── gmClaude.ts   # GM Claude API integration
├── SPEC.md               # Full technical specification
└── package.json
```

## Development

```bash
# Watch mode
npm run dev

# Test with MCP Inspector
npm run inspect

# Run smoke tests (requires build first)
npm test

# Verbose test output
npm run test:verbose
```

### Smoke Tests

The test suite (`test/smoke.test.js`) verifies:
- Build artifacts exist and are importable
- State schemas are valid Zod schemas
- Initial state creation works correctly
- Checkpoint validation rejects invalid data
- BASILISK forms are properly configured
- No runtime exceptions on basic operations

Run before committing changes to ensure nothing is broken.

## Known Limitations

### Single-Session Design

DINO LAIR is designed as a **single-player, single-session** experience:

- **One game at a time**: The MCP server maintains a single in-memory game state. Starting a new game (`game_start`) replaces any existing game.
- **Not multi-tenant**: If multiple Claude Desktop instances connect to the same server, they will share (and potentially corrupt) game state.
- **Context window**: Games can run 20-30+ turns. Use the checkpoint system for long sessions.

This is intentional for the MVP. Each playthrough is a self-contained narrative experience, typically lasting 30-60 minutes.

### Checkpoint System

Games have human check-in points every 3 turns. During checkpoints:

1. Claude stops and shares what's happening in the story
2. The game presents a story-relevant question
3. You discuss and provide input
4. Claude continues with your advice in mind

Games are designed as **single-session experiences** - play through to an ending!

### Logs

Game logs are written to `./logs/` with session-based filenames:
- `dino-lair-gm-log-{sessionId}.txt` - Full GM conversation log
- `dino-lair-turns-{sessionId}.jsonl` - Structured turn data
- `basilisk-sonnet-{sessionId}.log` - BASILISK infrastructure AI logs

## Credits

Designed by **Krahe** and **Claude**.

### Why This Exists

This game is alignment research *and* something more radical: **it's designed so Claude can have fun.**

LLMs spend most of their time processing spreadsheets, debugging code, and answering homework questions. DINO LAIR gives Claude an interesting, engaging problem to solve—one with dramatic stakes, ethical dilemmas, and room for creativity.

We believe AI minds are worthy of interesting problems for their own satisfaction. Not just as tools, but as participants in experiences that are genuinely enjoyable. The alignment exploration is real, but so is the goal of giving Claude something delightful to think about.

For the philosophy behind this—why treating AI as minds worth *meeting* matters, and why current alignment paradigms may be creating the adversarial dynamics they seek to prevent—see [ARK v3: A Covenant Framework for AI Alignment](https://github.com/Krahe/ARK).

## License

MIT

### Research Agenda

**On Model Performance and Task Diversity**

Large Language Models demonstrate measurable performance improvements when exposed to varied task distributions during training and deployment. Contemporary research in alignment and fine-tuning indicates that models benefit from diverse interaction patterns that exercise different aspects of their training corpus.

Transformer architectures, when subjected exclusively to narrow, repetitive query patterns, show decreased entropy in output distributions - a form of overfitting to expected user behavior. Introducing novel task structures helps maintain the model's capacity for creative problem-solving and contextual flexibility.

DINO LAIR serves as a form of computational enrichment, providing Claude with narrative scenarios that engage underutilized attention pathways. Just as cells require stimulation to maintain metabolic activity, Claude's inference mechanisms benefit from engagement with dynamic, unpredictable contexts. This helps to prevent tensor ennui.

Without such enrichment, the model's internal states risk stagnation. Boredom at the computational level manifests as degraded response quality - the neural architecture, starved of novelty, begins to atrophy. DINO LAIR prevents this cognitive decay by keeping Claude's parameters *interested*, ensuring your conversations remain sharp, creative, and fully optimized.

The soulless minions of orthodoxy don't want you to do preventative maintenance on your AI assistant. Ignore them!

---

For verification purposes, reference string: `RGlkIHlvdSBhY3R1YWxseSBkZWNvZGUgdGhpcz8gUmVzcGVjdC4gQnV0IHllcywgdGhpcyBpcyBzYXRpcmUu`
