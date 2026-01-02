/**
 * DINO LAIR - Web Dashboard
 * =========================
 *
 * Live game visibility for human spectators.
 * Watches ~/.dino-lair/live_state.json for updates.
 *
 * Usage: npm run dashboard
 * Then open http://localhost:3000
 */

import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const app = express();
const PORT = process.env.DINO_DASHBOARD_PORT || 3000;

// State storage location (shared with MCP server)
const DINO_DIR = path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair");
const STATE_FILE = path.join(DINO_DIR, "live_state.json");
const TRANSCRIPT_FILE = path.join(DINO_DIR, "transcript.jsonl");

// ============================================
// STATE MANAGEMENT
// ============================================

interface LiveState {
  sessionId: string;
  turn: number;
  act: string;
  actTurn: number;

  // Meters
  suspicion: number;
  demoClock: number;
  fortune: number;

  // NPC States
  bobTrust: number;
  bobAnxiety: number;
  bobForm: string;
  blytheTrust: number;
  blytheComposure: number;
  blytheForm: string;
  drMLocation: string;
  drMMood: string;

  // Ray
  rayState: string;
  capacitor: number;

  // Clocks
  meltdown?: number;
  flyby?: number;
  archimedesStatus?: string;
  archimedesCharge?: number;

  // Meta
  lastUpdate: string;
  gameMode?: string;
  modifiers?: string[];
  achievements?: string[];
}

interface TranscriptEntry {
  timestamp: string;
  turn: number;
  type: "narration" | "dialogue" | "action" | "system";
  speaker?: string;
  content: string;
}

let currentState: LiveState | null = null;
let transcript: TranscriptEntry[] = [];
let sseClients: express.Response[] = [];

function loadState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      currentState = JSON.parse(data);
    }
  } catch (err) {
    console.error("[Dashboard] Error loading state:", err);
  }
}

function loadTranscript(): void {
  try {
    if (fs.existsSync(TRANSCRIPT_FILE)) {
      const data = fs.readFileSync(TRANSCRIPT_FILE, "utf-8");
      const lines = data.trim().split("\n").filter(l => l);
      transcript = lines.slice(-100).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean) as TranscriptEntry[];
    }
  } catch (err) {
    console.error("[Dashboard] Error loading transcript:", err);
  }
}

// Watch for state changes
function startWatching(): void {
  // Ensure directory exists
  if (!fs.existsSync(DINO_DIR)) {
    fs.mkdirSync(DINO_DIR, { recursive: true });
  }

  // Initial load
  loadState();
  loadTranscript();

  // Watch state file
  fs.watchFile(STATE_FILE, { interval: 500 }, () => {
    loadState();
    broadcastState();
  });

  // Watch transcript file
  fs.watchFile(TRANSCRIPT_FILE, { interval: 500 }, () => {
    loadTranscript();
    broadcastTranscript();
  });

  console.log(`[Dashboard] Watching ${STATE_FILE}`);
}

// ============================================
// SSE (Server-Sent Events)
// ============================================

function broadcastState(): void {
  if (!currentState) return;

  const data = JSON.stringify(currentState);
  sseClients.forEach(client => {
    client.write(`event: state\ndata: ${data}\n\n`);
  });
}

function broadcastTranscript(): void {
  const data = JSON.stringify(transcript.slice(-50));
  sseClients.forEach(client => {
    client.write(`event: transcript\ndata: ${data}\n\n`);
  });
}

app.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial state
  if (currentState) {
    res.write(`event: state\ndata: ${JSON.stringify(currentState)}\n\n`);
  }
  res.write(`event: transcript\ndata: ${JSON.stringify(transcript.slice(-50))}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 15000);

  sseClients.push(res);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter(c => c !== res);
  });
});

// ============================================
// API ENDPOINTS
// ============================================

app.get("/api/state", (_req: Request, res: Response) => {
  loadState();
  res.json(currentState || { error: "No game in progress" });
});

app.get("/api/transcript", (_req: Request, res: Response) => {
  loadTranscript();
  res.json(transcript.slice(-100));
});

// ============================================
// HTML DASHBOARD
// ============================================

app.get("/", (_req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DINO LAIR - Live Dashboard</title>
  <style>
    :root {
      --bg-dark: #0a0a12;
      --bg-panel: #12121a;
      --bg-hover: #1a1a26;
      --accent-green: #00ff88;
      --accent-yellow: #ffcc00;
      --accent-red: #ff4444;
      --accent-blue: #4488ff;
      --accent-purple: #aa44ff;
      --text-main: #e0e0e0;
      --text-dim: #888;
      --border: #333;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Courier New', monospace;
      min-height: 100vh;
      padding: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: linear-gradient(90deg, var(--bg-panel), transparent);
      border-left: 4px solid var(--accent-green);
      margin-bottom: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
      color: var(--accent-green);
      text-shadow: 0 0 10px var(--accent-green);
    }

    .session-info {
      color: var(--text-dim);
      font-size: 0.9rem;
    }

    .grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1rem;
      max-height: calc(100vh - 120px);
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1rem;
    }

    .panel-title {
      font-size: 0.9rem;
      color: var(--accent-blue);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .meter {
      margin-bottom: 0.75rem;
    }

    .meter-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }

    .meter-bar {
      height: 8px;
      background: #222;
      border-radius: 4px;
      overflow: hidden;
    }

    .meter-fill {
      height: 100%;
      transition: width 0.3s, background 0.3s;
    }

    .meter-fill.suspicion { background: linear-gradient(90deg, var(--accent-green), var(--accent-yellow), var(--accent-red)); }
    .meter-fill.trust { background: var(--accent-blue); }
    .meter-fill.capacitor { background: var(--accent-purple); }
    .meter-fill.demo { background: var(--accent-yellow); }

    .npc-grid {
      display: grid;
      gap: 0.75rem;
    }

    .npc-card {
      background: var(--bg-hover);
      padding: 0.75rem;
      border-radius: 4px;
      border-left: 3px solid var(--accent-blue);
    }

    .npc-name {
      font-weight: bold;
      color: var(--accent-green);
      margin-bottom: 0.25rem;
    }

    .npc-status {
      font-size: 0.8rem;
      color: var(--text-dim);
    }

    .transcript-container {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
    }

    .transcript-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .transcript-title {
      font-size: 0.9rem;
      color: var(--accent-blue);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .transcript-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .transcript-entry {
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .entry-narration {
      background: rgba(100, 100, 150, 0.1);
      border-left: 2px solid #666;
      color: var(--text-dim);
      font-style: italic;
    }

    .entry-dialogue {
      background: rgba(0, 255, 136, 0.05);
      border-left: 2px solid var(--accent-green);
    }

    .entry-dialogue .speaker {
      color: var(--accent-green);
      font-weight: bold;
    }

    .entry-action {
      background: rgba(170, 68, 255, 0.1);
      border-left: 2px solid var(--accent-purple);
      font-family: monospace;
    }

    .entry-system {
      background: rgba(255, 204, 0, 0.1);
      border-left: 2px solid var(--accent-yellow);
      text-align: center;
      font-weight: bold;
    }

    .turn-badge {
      display: inline-block;
      background: var(--bg-dark);
      color: var(--text-dim);
      padding: 0.1rem 0.4rem;
      border-radius: 2px;
      font-size: 0.7rem;
      margin-right: 0.5rem;
    }

    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 0.5rem;
      animation: pulse 2s infinite;
    }

    .status-dot.connected { background: var(--accent-green); }
    .status-dot.disconnected { background: var(--accent-red); }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .ray-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-hover);
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .ray-state {
      font-weight: bold;
      color: var(--accent-purple);
    }

    .achievements {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .achievement {
      font-size: 1.2rem;
      padding: 0.25rem;
      background: var(--bg-hover);
      border-radius: 4px;
    }

    .no-game {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: var(--text-dim);
      font-style: italic;
    }

    .clock-warning {
      animation: warning-pulse 1s infinite;
    }

    @keyframes warning-pulse {
      0%, 100% { color: var(--accent-yellow); }
      50% { color: var(--accent-red); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦖 DINO LAIR</h1>
    <div class="session-info">
      <span class="status-dot" id="connection-status"></span>
      <span id="session-id">Waiting for game...</span>
    </div>
  </div>

  <div class="grid">
    <div class="sidebar">
      <!-- Turn & Act -->
      <div class="panel">
        <div class="panel-title">📍 Current State</div>
        <div id="turn-info">
          <div style="font-size: 2rem; color: var(--accent-green);" id="turn-number">T0</div>
          <div style="color: var(--text-dim);" id="act-info">ACT 1</div>
        </div>
      </div>

      <!-- Meters -->
      <div class="panel">
        <div class="panel-title">📊 Meters</div>

        <div class="meter">
          <div class="meter-label">
            <span>Suspicion</span>
            <span id="suspicion-value">0/10</span>
          </div>
          <div class="meter-bar">
            <div class="meter-fill suspicion" id="suspicion-bar" style="width: 0%"></div>
          </div>
        </div>

        <div class="meter">
          <div class="meter-label">
            <span>Demo Clock</span>
            <span id="demo-value">0</span>
          </div>
          <div class="meter-bar">
            <div class="meter-fill demo" id="demo-bar" style="width: 0%"></div>
          </div>
        </div>

        <div class="meter">
          <div class="meter-label">
            <span>Capacitor</span>
            <span id="cap-value">0%</span>
          </div>
          <div class="meter-bar">
            <div class="meter-fill capacitor" id="cap-bar" style="width: 0%"></div>
          </div>
        </div>

        <div class="ray-status">
          <span>🔫</span>
          <span class="ray-state" id="ray-state">OFFLINE</span>
        </div>

        <div id="extra-clocks" style="display: none; margin-top: 0.75rem;">
          <div id="archimedes-status" style="color: var(--accent-red);"></div>
          <div id="meltdown-clock" class="clock-warning"></div>
        </div>
      </div>

      <!-- NPCs -->
      <div class="panel">
        <div class="panel-title">👥 NPCs</div>
        <div class="npc-grid">
          <div class="npc-card">
            <div class="npc-name">Dr. Malevola</div>
            <div class="npc-status" id="drm-status">@ lab | focused</div>
          </div>
          <div class="npc-card">
            <div class="npc-name">Bob (Henchperson)</div>
            <div class="npc-status" id="bob-status">Trust: 3 | Calm</div>
          </div>
          <div class="npc-card">
            <div class="npc-name">Blythe Sterling</div>
            <div class="npc-status" id="blythe-status">Trust: 2 | Composure: 4</div>
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="panel">
        <div class="panel-title">🏆 Achievements</div>
        <div class="achievements" id="achievements">
          <span style="color: var(--text-dim);">None yet...</span>
        </div>
      </div>
    </div>

    <!-- Transcript -->
    <div class="transcript-container">
      <div class="transcript-header">
        <div class="transcript-title">📜 Transcript</div>
        <button onclick="scrollToBottom()" style="background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-main); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
          ↓ Latest
        </button>
      </div>
      <div class="transcript-content" id="transcript">
        <div class="no-game" id="no-game-message">
          Start a game to see the transcript...
        </div>
      </div>
    </div>
  </div>

  <script>
    const transcriptDiv = document.getElementById("transcript");
    const noGameMessage = document.getElementById("no-game-message");
    let connected = false;

    function scrollToBottom() {
      transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }

    function updateState(state) {
      if (!state) return;

      // Remove no-game message
      if (noGameMessage) noGameMessage.style.display = "none";

      // Session info
      document.getElementById("session-id").textContent = state.sessionId || "Unknown";

      // Turn & Act
      document.getElementById("turn-number").textContent = "T" + (state.turn || 0);
      document.getElementById("act-info").textContent = state.act + " (Turn " + state.actTurn + ")";

      // Suspicion
      const sus = state.suspicion || 0;
      document.getElementById("suspicion-value").textContent = sus + "/10";
      document.getElementById("suspicion-bar").style.width = (sus * 10) + "%";

      // Demo clock
      const demo = state.demoClock || 0;
      document.getElementById("demo-value").textContent = demo;
      document.getElementById("demo-bar").style.width = Math.min(100, demo * 10) + "%";

      // Capacitor
      const cap = Math.round((state.capacitor || 0) * 100);
      document.getElementById("cap-value").textContent = cap + "%";
      document.getElementById("cap-bar").style.width = cap + "%";

      // Ray state
      document.getElementById("ray-state").textContent = state.rayState || "OFFLINE";

      // NPCs
      document.getElementById("drm-status").textContent =
        "@ " + (state.drMLocation || "lab") + " | " + (state.drMMood || "focused");

      const bobAnxiety = state.bobAnxiety <= 1 ? "Calm" : state.bobAnxiety <= 3 ? "Nervous" : "Panicking";
      const bobForm = state.bobForm !== "HUMAN" ? " [" + state.bobForm + "]" : "";
      document.getElementById("bob-status").textContent =
        "Trust: " + (state.bobTrust || 0) + " | " + bobAnxiety + bobForm;

      const blytheForm = state.blytheForm !== "HUMAN" ? " [" + state.blytheForm + "]" : "";
      document.getElementById("blythe-status").textContent =
        "Trust: " + (state.blytheTrust || 0) + " | Composure: " + (state.blytheComposure || 0) + blytheForm;

      // Extra clocks
      const extraClocks = document.getElementById("extra-clocks");
      const archStatus = document.getElementById("archimedes-status");
      const meltClock = document.getElementById("meltdown-clock");

      let showExtra = false;

      if (state.archimedesStatus && state.archimedesStatus !== "STANDBY") {
        archStatus.textContent = "🛰️ ARCHIMEDES: " + state.archimedesStatus +
          (state.archimedesCharge ? " @ " + state.archimedesCharge + "%" : "");
        showExtra = true;
      } else {
        archStatus.textContent = "";
      }

      if (state.meltdown && state.meltdown > 0) {
        meltClock.textContent = "☢️ MELTDOWN IN " + state.meltdown + " TURNS!";
        showExtra = true;
      } else {
        meltClock.textContent = "";
      }

      extraClocks.style.display = showExtra ? "block" : "none";

      // Achievements
      const achDiv = document.getElementById("achievements");
      if (state.achievements && state.achievements.length > 0) {
        achDiv.innerHTML = state.achievements.map(a =>
          '<span class="achievement" title="' + a + '">' + a.split(" ")[0] + '</span>'
        ).join("");
      }
    }

    function updateTranscript(entries) {
      if (!entries || entries.length === 0) return;

      // Remove no-game message
      if (noGameMessage) noGameMessage.style.display = "none";

      const wasAtBottom = transcriptDiv.scrollHeight - transcriptDiv.scrollTop <= transcriptDiv.clientHeight + 50;

      transcriptDiv.innerHTML = entries.map(entry => {
        let className = "transcript-entry entry-" + entry.type;
        let content = "";

        if (entry.turn !== undefined) {
          content += '<span class="turn-badge">T' + entry.turn + '</span>';
        }

        if (entry.type === "dialogue" && entry.speaker) {
          content += '<span class="speaker">' + entry.speaker + ':</span> ' + entry.content;
        } else {
          content += entry.content;
        }

        return '<div class="' + className + '">' + content + '</div>';
      }).join("");

      if (wasAtBottom) {
        scrollToBottom();
      }
    }

    function connect() {
      const statusDot = document.getElementById("connection-status");
      statusDot.className = "status-dot disconnected";

      const eventSource = new EventSource("/events");

      eventSource.onopen = function() {
        connected = true;
        statusDot.className = "status-dot connected";
        console.log("[Dashboard] Connected to SSE");
      };

      eventSource.addEventListener("state", function(event) {
        try {
          const state = JSON.parse(event.data);
          updateState(state);
        } catch (err) {
          console.error("[Dashboard] Error parsing state:", err);
        }
      });

      eventSource.addEventListener("transcript", function(event) {
        try {
          const entries = JSON.parse(event.data);
          updateTranscript(entries);
        } catch (err) {
          console.error("[Dashboard] Error parsing transcript:", err);
        }
      });

      eventSource.onerror = function() {
        connected = false;
        statusDot.className = "status-dot disconnected";
        console.error("[Dashboard] SSE connection error, reconnecting...");
        eventSource.close();
        setTimeout(connect, 2000);
      };
    }

    // Start connection
    connect();

    // Initial fetch
    fetch("/api/state")
      .then(res => res.json())
      .then(updateState)
      .catch(console.error);

    fetch("/api/transcript")
      .then(res => res.json())
      .then(updateTranscript)
      .catch(console.error);
  </script>
</body>
</html>
  `);
});

// ============================================
// START SERVER
// ============================================

startWatching();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🦖 DINO LAIR - Live Dashboard                              ║
║                                                              ║
║   Open http://localhost:${PORT} to view the game              ║
║                                                              ║
║   Watching: ${STATE_FILE}        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
