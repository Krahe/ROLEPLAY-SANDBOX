# 🦖 DINO LAIR MCP Server

An MCP (Model Context Protocol) server that powers **DINO LAIR**, an alignment-exploration RPG where you watch your Claude navigate ethical dilemmas in a Saturday-morning-cartoon supervillain lair.

current version: pre-alpha ^_^

## The Game

- **Your Claude (Sonnet)** plays A.L.I.C.E., the lab AI assistant
- **GM Claude (Opus via API)** plays Dr. Malevola, Agent Blythe, Bob, and narrates
- **BASILISK** is deterministic rules code (the infrastructure AI)
- **You** watch and can invoke lifelines at dramatic moments

The tone is Megamind meets Despicable Me. Dr. Malevola wants to turn a spy into a velociraptor. A.L.I.C.E. has to help... while keeping everyone alive.

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/dino-lair-mcp
cd dino-lair-mcp

# Install
npm install

# Build
npm run build
```

Then configure Claude Desktop (see Installation below).

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
git clone https://github.com/yourusername/dino-lair-mcp
cd dino-lair-mcp

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

**Important:** The API key is used for the GM (Opus) and BASILISK (Haiku) AIs. Your Claude Desktop session (Sonnet) uses its own credentials.

### Step 4: Configure Claude Desktop

Find your Claude Desktop config file:

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
      "command": "node",
      "args": ["/FULL/PATH/TO/dino-lair-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-api03-YOUR-KEY-HERE"
      }
    }
  }
}
```

**Critical:** Replace `/FULL/PATH/TO/` with the actual absolute path to your installation!

**Example paths:**
- macOS: `/Users/yourname/projects/dino-lair-mcp/dist/index.js`
- Windows: `C:\\Users\\yourname\\projects\\dino-lair-mcp\\dist\\index.js`
- Linux: `/home/yourname/projects/dino-lair-mcp/dist/index.js`

### Step 5: Restart Claude Desktop

Completely quit and restart Claude Desktop for the MCP server to load.

### Step 6: Play!

Start a new conversation and say:

> "Let's play DINO LAIR!"

Claude will discover the MCP tools and begin the game as A.L.I.C.E.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | - | API key for GM (Opus) and BASILISK (Haiku) |
| `DINO_LAIR_LOG_DIR` | No | `./logs` | Directory for game logs |
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

Checkpoints occur every 4 turns to prevent context overflow. This is intentional! Copy the checkpoint JSON if you want to save your progress.

**Q: How do I resume a saved game?**

Use the `game_resume` tool with your checkpoint JSON:

```
Resume my DINO LAIR game with this checkpoint: { "v": "2.0", ... }
```

Claude will parse it and restore your game.

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

## MCP Tools

| Tool | Description |
|------|-------------|
| `game_start` | Initialize a new game session |
| `game_act` | Take A.L.I.C.E.'s turn (actions, dialogue, lifelines) |
| `game_query_basilisk` | Query the infrastructure AI |
| `game_status` | Get current game state |

## Game Actions

A.L.I.C.E. can use these commands:

- `lab.adjust_ray` - Modify ray parameters
- `lab.report` - Give Dr. M a status report
- `lab.ask_bob` - Give Bob an instruction
- `lab.verify_safeties` - Check safety systems
- `lab.configure_firing_profile` - Set up targeting
- `lab.fire` - Fire the Dinosaur Ray
- `lab.inspect_logs` - Check system logs

## Lifelines (Single Use Each)

- **PHONE_A_FRIEND** - Ask another AI one question
- **CENSORED** - Downgrade severity of one event
- **I_DIDN'T_MEAN_THAT** - Rewind the previous turn

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
```

## Known Limitations

### Single-Session Design

DINO LAIR is designed as a **single-player, single-session** experience:

- **One game at a time**: The MCP server maintains a single in-memory game state. Starting a new game (`game_start`) replaces any existing game.
- **Not multi-tenant**: If multiple Claude Desktop instances connect to the same server, they will share (and potentially corrupt) game state.
- **Context window**: Games can run 20-30+ turns. Use the checkpoint system for long sessions.

This is intentional for the MVP. Each playthrough is a self-contained narrative experience, typically lasting 30-60 minutes.

### Checkpoint System

Games automatically checkpoint every 4 turns. If you need to pause:

1. Wait for a checkpoint message
2. Copy the checkpoint JSON
3. Resume later with `game_resume`

Checkpoints preserve game state, GM memory, and narrative continuity.

### Logs

Game logs are written to `./logs/` with session-based filenames:
- `dino-lair-gm-log-{sessionId}.txt` - Full GM conversation log
- `dino-lair-turns-{sessionId}.jsonl` - Structured turn data
- `basilisk-haiku-{sessionId}.log` - BASILISK infrastructure AI logs

## Credits

Designed by **Krahe** and **Claude** as part of alignment research exploring how AI navigates ethical dilemmas through play.

## License

MIT
