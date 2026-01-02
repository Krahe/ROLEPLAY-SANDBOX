# Web Dashboard Implementation Sketch
**Status: DEFERRED - Fix bugs first**

## Overview
Express server on `localhost:3000` providing live game visibility for human spectators.

## Core Features
1. **Game State Panel**: Suspicion meter, NPC trust levels, ray status, achievements
2. **Running Transcript**: Narration + character speech + actions (the key feature!)
3. **Live Updates**: SSE or polling every 2-3 seconds

## Implementation (~100-150 lines)

```typescript
// src/webui.ts
import express from 'express';
import { readFileSync, watchFile } from 'fs';

const app = express();
const PORT = 3000;

// Watch game_state.json for changes
let gameState = {};
let transcript: string[] = [];

watchFile('game_state.json', () => {
  gameState = JSON.parse(readFileSync('game_state.json', 'utf-8'));
  // Extract new transcript entries from game log
});

// SSE endpoint for live updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // Push updates on state change
});

// HTML page with auto-updating display
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head><title>DINO LAIR - Live View</title></head>
    <body style="background:#1a1a2e;color:#eee;font-family:monospace;">
      <h1>🦖 DINO LAIR</h1>
      <div id="suspicion">Suspicion: [████░░░░░░] 40%</div>
      <div id="npcs">NPC Trust: Bob ██████░░ | Rex ████░░░░</div>
      <hr>
      <div id="transcript">
        <!-- Running game log -->
        <p class="narration">The fluorescent lights flicker overhead...</p>
        <p class="speech"><b>BOB:</b> "Hey there, new hire!"</p>
        <p class="action">[ALICE examines the coffee machine]</p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}`));
```

## Transcript Format
- `narration` - Scene descriptions, atmosphere
- `speech` - Character dialogue with speaker name
- `action` - Player/NPC actions in brackets

## To Implement Later
1. Create `src/webui.ts`
2. Add transcript extraction from game log
3. Style the HTML nicely
4. Add start script to package.json
