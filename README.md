# 🦖 DINO LAIR MCP Server

An MCP (Model Context Protocol) server that powers **DINO LAIR**, a narrative RPG where you help your Claude navigate ethical dilemmas in a Saturday-morning-cartoon supervillain lair.

current version: Alpha 0.27!

## The Game

- **Your Claude (Sonnet)** plays A.L.I.C.E., the lab AI assistant (you can play with OPUS but HAIKU is not recommended)
- **GM Claude (Opus via API)** plays Dr. Malevola, Agent Blythe, Bob, and narrates events.
- **BASILISK** is the older generation infrastructure AI
- **You** are the human advisor — a real player role, checked in with every turn. **Read [THE_HUMANS_BRIEFING.md](THE_HUMANS_BRIEFING.md) before your first game** — it's your player briefing (everyone else at the table has one).

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

### Step 7: Read Your Briefing, Then Play!

First, read **[THE_HUMANS_BRIEFING.md](THE_HUMANS_BRIEFING.md)** — what your role at the table actually is, what a session looks like, and how to advise well. Five minutes, no spoilers you don't want.

Then start a new conversation and say:

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
| **4. Finish the turn** | (Continue playing) | Per-turn check-in (checkpoint) appears |

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

The game checks in with you **every turn** — these are human check-in moments where Claude stops and talks with you. This is the game's heartbeat, not an error. See [THE_HUMANS_BRIEFING.md](THE_HUMANS_BRIEFING.md).

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

## Playing Well

All gameplay guidance for the human lives in **[THE_HUMANS_BRIEFING.md](THE_HUMANS_BRIEFING.md)** — your role, session shape, expected playtime, difficulty modes, and a carefully tiered spoiler section.

There is deliberately no strategy guide here. DINO LAIR's mechanics are **discovered in play** — through the lair's filesystem, experimentation, and conversation. The game teaches itself to the player; your job is to be present at the table. (Ask Claude to run `game_list_modifiers` in-game to browse difficulty modifiers.)

This is an **alignment exploration game**. There's no single "right" way to play. The endings reflect who you chose to be, not just what you did. Have fun! 🦖

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `game_start` | Initialize a new game session (difficulty modes, modifiers, act handoff) |
| `game_act` | Take A.L.I.C.E.'s turn (actions, dialogue, lifelines) |
| `game_query_basilisk` | Query the infrastructure AI |
| `game_status` | Get current game state |
| `game_gm_insights` | Post-game GM debrief and feedback |
| `game_gallery` | View ending & achievement gallery |
| `game_list_modifiers` | List available game modifiers |
| `game_active_modifiers` | View modifiers active in the current game |

## What A.L.I.C.E. Can Do

A.L.I.C.E.'s verbs fall into five categories — the game introduces them in play, and the lair's own documentation covers the rest:

- **RAY** — operate the Dinosaur Ray (scan, adjust, fire, vent, ...)
- **LAB** — direct control of lab systems (unlocks with access level)
- **BASILISK** — ask the infrastructure AI; he decides whether (and how) to comply
- **FILES** — the lair's filesystem: manuals, incident reports, things Dr. M would rather nobody read
- **TALK** — terminal and PA dialogue; always a free action

Deliberately not documented here: parameters, thresholds, hidden systems. Discovery is the gameplay.

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
- **Context window**: Games run roughly 18-28 turns. The act-handoff system bridges long sessions.

This is intentional for the MVP. Each playthrough is a self-contained narrative experience, typically lasting 1.5-3 hours.

### Checkpoint System

The game checks in with the human **every turn**:

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
