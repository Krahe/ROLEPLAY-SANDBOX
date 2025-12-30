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

# Configure
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Build
npm run build

# Run
npm start
```

## Connect from Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dino-lair": {
      "command": "node",
      "args": ["/path/to/dino-lair-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

Then start a conversation with Claude and say:

> "Let's play DINO LAIR!"

Claude will use the `game_start` tool and begin playing as A.L.I.C.E.

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
