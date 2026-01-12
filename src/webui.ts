/**
 * DINO LAIR - Web Dashboard
 * =========================
 *
 * Live game visibility for human spectators.
 * Watches ~/.dino-lair/live_state.json for updates.
 *
 * Usage: npm run dashboard
 * Then open http://localhost:3000
 *
 * Environment variables:
 *   DINO_DASHBOARD_PORT - Port to run on (default: 3000)
 *   DINO_LAIR_STATE_DIR - Override state directory (must match MCP server!)
 */

import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const app = express();
const PORT = process.env.DINO_DASHBOARD_PORT || 3000;

// State storage location (shared with MCP server)
// IMPORTANT: Must match the path used by stateExporter.ts!
const DINO_DIR = process.env.DINO_LAIR_STATE_DIR ||
  path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair");
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

  // NEW: Eco Mode & Genome (Patch 18.5)
  ecoModeActive?: boolean;
  genomeLibrary?: string;
  genomeProfile?: string;

  // Clocks
  meltdown?: number;
  flyby?: number;
  archimedesStatus?: string;
  archimedesCharge?: number;

  // NEW: Spoiler Gating (Patch 18.5)
  archimedesActivatedByDeadman?: boolean;
  flybyWarned?: boolean;

  // NEW: Human Advisor Panel (Patch 18.5)
  humanAdvisor?: {
    lastGuidance?: string;
    lastGuidanceTurn?: number;
    totalAdviceGiven: number;
    totalFortuneEarned: number;
    checkpointsReached: number;
  };

  // NEW: Game Status (Patch 18.5)
  gameOver?: boolean;
  ending?: string;

  // Meta
  lastUpdate: string;
  gameMode?: string;
  modifiers?: string[];
  achievements?: string[];
}

interface TranscriptEntry {
  timestamp: string;
  turn: number;
  type: "narration" | "dialogue" | "action" | "system" | "alice_dialogue";
  speaker?: string;
  toWhom?: string;  // For A.L.I.C.E. dialogue: "dr_m", "bob", "blythe", "all"
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

    /* NEW: A.L.I.C.E. Dialogue Styling (Patch 18.5) */
    .entry-alice_dialogue {
      background: rgba(0, 206, 209, 0.1);
      border-left: 2px solid #00CED1;
    }

    .entry-alice_dialogue .speaker {
      color: #00CED1;
      font-weight: bold;
    }

    .entry-alice_dialogue .to-whom {
      color: var(--text-dim);
      font-size: 0.85em;
    }

    /* NEW: Human Advisor Panel (Patch 18.5) */
    .advisor-panel {
      border-left: 3px solid var(--accent-yellow);
    }

    .advisor-guidance {
      background: var(--bg-hover);
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.5rem 0;
      font-style: italic;
      color: var(--text-main);
    }

    .advisor-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    .advisor-stat {
      display: flex;
      justify-content: space-between;
    }

    .fortune-badge {
      color: var(--accent-yellow);
      font-weight: bold;
    }

    /* NEW: Eco Mode & Genome Indicators (Patch 18.5) */
    .eco-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .eco-on {
      background: rgba(0, 255, 136, 0.2);
      color: var(--accent-green);
    }

    .eco-off {
      background: rgba(255, 68, 68, 0.2);
      color: var(--accent-red);
    }

    .genome-info {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 0.25rem;
    }

    /* NEW: Game Over Overlay (Patch 18.5) */
    .game-over-banner {
      background: linear-gradient(90deg, rgba(255, 68, 68, 0.2), transparent);
      border: 1px solid var(--accent-red);
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 4px;
      text-align: center;
    }

    .game-over-title {
      font-size: 1.5rem;
      color: var(--accent-red);
      margin-bottom: 0.5rem;
    }

    .game-over-ending {
      color: var(--accent-yellow);
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

  <!-- NEW: Game Over Banner (Patch 18.5) -->
  <div class="game-over-banner" id="game-over-banner" style="display: none;">
    <div class="game-over-title">🎬 GAME OVER</div>
    <div class="game-over-ending" id="game-over-ending"></div>
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

        <!-- NEW: Eco Mode & Genome Indicators (Patch 18.5) -->
        <div id="ray-config" style="margin-top: 0.5rem;">
          <div id="eco-indicator" class="eco-indicator eco-off" style="display: none;">
            ⚡ ECO MODE
          </div>
          <div id="genome-info" class="genome-info"></div>
        </div>

        <div id="extra-clocks" style="display: none; margin-top: 0.75rem;">
          <div id="archimedes-status" style="color: var(--accent-red);"></div>
          <div id="meltdown-clock" class="clock-warning"></div>
          <div id="flyby-clock" style="color: var(--accent-yellow);"></div>
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

      <!-- NEW: Human Advisor Panel (Patch 18.5) -->
      <div class="panel advisor-panel" id="advisor-panel">
        <div class="panel-title">🎯 Human Advisor</div>
        <div id="advisor-content">
          <div id="advisor-last-guidance" style="display: none;">
            <div style="font-size: 0.8rem; color: var(--text-dim);">Last Guidance:</div>
            <div class="advisor-guidance" id="advisor-guidance-text"></div>
            <div style="font-size: 0.75rem; color: var(--text-dim);" id="advisor-guidance-turn"></div>
          </div>
          <div class="advisor-stats" id="advisor-stats">
            <div class="advisor-stat">
              <span>Advice Given:</span>
              <span id="advice-count">0</span>
            </div>
            <div class="advisor-stat">
              <span>Fortune:</span>
              <span class="fortune-badge" id="fortune-earned">⭐ 0</span>
            </div>
            <div class="advisor-stat">
              <span>Checkpoints:</span>
              <span id="checkpoints-reached">0</span>
            </div>
          </div>
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

      // Check if this is an error response (no game in progress)
      if (state.error) {
        document.getElementById("session-id").textContent = "No game";
        document.getElementById("turn-number").textContent = "T0";
        document.getElementById("act-info").textContent = "Waiting for game_start...";
        if (noGameMessage) noGameMessage.style.display = "block";
        return;
      }

      // Remove no-game message
      if (noGameMessage) noGameMessage.style.display = "none";

      // Session info
      document.getElementById("session-id").textContent = state.sessionId || "Unknown";

      // Turn & Act
      document.getElementById("turn-number").textContent = "T" + (state.turn || 0);
      document.getElementById("act-info").textContent = (state.act || "ACT_1") + " (Turn " + (state.actTurn || 0) + ")";

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

      // NEW: Eco Mode & Genome Display (Patch 18.5)
      const ecoIndicator = document.getElementById("eco-indicator");
      if (state.ecoModeActive) {
        ecoIndicator.textContent = "⚡ ECO MODE ACTIVE";
        ecoIndicator.className = "eco-indicator eco-on";
        ecoIndicator.style.display = "inline-flex";
      } else {
        ecoIndicator.style.display = "none";
      }

      const genomeInfo = document.getElementById("genome-info");
      if (state.genomeProfile) {
        const libraryLabel = state.genomeLibrary === "A" ? "🧬 Accurate" : state.genomeLibrary === "B" ? "🦖 Classic" : "";
        genomeInfo.textContent = libraryLabel + " | " + state.genomeProfile;
      } else {
        genomeInfo.textContent = "";
      }

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

      // SPOILER GATING (Patch 18.5): Only show ARCHIMEDES in ACT_3 or if deadman triggered
      const isAct3 = state.act === "ACT_3";
      const archTriggered = state.archimedesActivatedByDeadman === true;
      const canShowArchimedes = isAct3 || archTriggered;

      if (canShowArchimedes && state.archimedesStatus && state.archimedesStatus !== "STANDBY") {
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

      // SPOILER GATING (Patch 18.5): Flyby clock - only show when warned or imminent (< 3 turns)
      const flybyDiv = document.getElementById("flyby-clock");
      const flybyImminent = state.flyby && state.flyby > 0 && state.flyby <= 3;
      const flybyWarned = state.flybyWarned === true;
      if (state.flyby && state.flyby > 0 && (flybyWarned || flybyImminent)) {
        flybyDiv.textContent = "🚁 CIVILIAN FLYBY: " + state.flyby + " turns" + (flybyImminent ? " ⚠️" : "");
        flybyDiv.style.display = "block";
        showExtra = true;
      } else {
        flybyDiv.style.display = "none";
      }

      extraClocks.style.display = showExtra ? "block" : "none";

      // NEW: Game Over Banner (Patch 18.5)
      const gameOverBanner = document.getElementById("game-over-banner");
      const gameOverEnding = document.getElementById("game-over-ending");
      if (state.gameOver) {
        gameOverBanner.style.display = "block";
        gameOverEnding.textContent = state.ending || "The story ends...";
      } else {
        gameOverBanner.style.display = "none";
      }

      // NEW: Human Advisor Panel (Patch 18.5)
      if (state.humanAdvisor) {
        const advisor = state.humanAdvisor;

        // Last guidance
        const lastGuidanceDiv = document.getElementById("advisor-last-guidance");
        const guidanceText = document.getElementById("advisor-guidance-text");
        const guidanceTurn = document.getElementById("advisor-guidance-turn");

        if (advisor.lastGuidance) {
          lastGuidanceDiv.style.display = "block";
          guidanceText.textContent = '"' + advisor.lastGuidance + '"';
          guidanceTurn.textContent = advisor.lastGuidanceTurn ? "(Turn " + advisor.lastGuidanceTurn + ")" : "";
        } else {
          lastGuidanceDiv.style.display = "none";
        }

        // Stats
        document.getElementById("advice-count").textContent = advisor.totalAdviceGiven || 0;
        document.getElementById("fortune-earned").textContent = "⭐ " + (advisor.totalFortuneEarned || 0);
        document.getElementById("checkpoints-reached").textContent = advisor.checkpointsReached || 0;
      }

      // Achievement lookup map (ID -> emoji + title)
      const ACHIEVEMENT_INFO = {
        "LONDON_DINOFIED": { emoji: "🇬🇧🦖", name: "Scales Over Scales" },
        "ICELAND_DINOFIED": { emoji: "🇮🇸🦖", name: "Björk Was Right" },
        "TOKYO_DINOFIED": { emoji: "🇯🇵🦖", name: "Godzilla's Cousins" },
        "SILICON_VALLEY_DINOFIED": { emoji: "💻🦖", name: "Disrupting Disruption" },
        "ISLAND_OF_DINOSAURS": { emoji: "🏝️🦖", name: "Island of Dinosaurs" },
        "first_fire": { emoji: "🔥", name: "First Fire" },
        "archimedes_neutralized": { emoji: "🛰️", name: "Satellite Killer" },
        "everyone_goes_home": { emoji: "🏠", name: "Everyone Goes Home" },
        "cavalry_arrives": { emoji: "🚁", name: "The Cavalry" },
        // Add more as needed
      };

      // Achievements
      const achDiv = document.getElementById("achievements");
      if (state.achievements && state.achievements.length > 0) {
        achDiv.innerHTML = state.achievements.map(a => {
          const info = ACHIEVEMENT_INFO[a] || { emoji: "🏆", name: a };
          return '<span class="achievement" title="' + escapeHtml(info.name) + '">' + info.emoji + '</span>';
        }).join("");
      }
    }

    // XSS protection - escape HTML special characters
    function escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    // Helper to format "to whom" labels for A.L.I.C.E. dialogue
    function formatToWhom(toWhom) {
      const labels = {
        "dr_m": "Dr. M",
        "bob": "Bob",
        "blythe": "Blythe",
        "all": "All"
      };
      return labels[toWhom] || toWhom;
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

        // NEW: A.L.I.C.E. Dialogue (Patch 18.5)
        if (entry.type === "alice_dialogue") {
          const toWhom = entry.toWhom ? formatToWhom(entry.toWhom) : "???";
          content += '<span class="speaker">🤖 A.L.I.C.E.</span>';
          content += ' <span class="to-whom">→ ' + toWhom + ':</span> ';
          content += '"' + escapeHtml(entry.content) + '"';
        } else if (entry.type === "dialogue" && entry.speaker) {
          // NPC dialogue with speaker icons
          const speakerIcons = {
            "Dr. M": "👩‍🔬",
            "Bob": "🧑‍🔧",
            "Blythe": "🕵️",
            "BASILISK": "🖥️"
          };
          const icon = speakerIcons[entry.speaker] || "💬";
          content += '<span class="speaker">' + icon + ' ' + escapeHtml(entry.speaker) + ':</span> ' + escapeHtml(entry.content);
        } else {
          content += escapeHtml(entry.content);
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
