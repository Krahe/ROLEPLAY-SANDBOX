import * as fs from "fs";
import * as path from "path";

// ============================================
// DINO LAIR METRICS LOGGING SYSTEM
// ============================================
// Tracks token usage and game state per turn for budget analysis.
// Format: JSONL (one JSON line per turn, append-only)
//
// After a playtest, run:
//   cat logs/metrics-*.jsonl | jq '.tokens.cumulativeSession'
// To see token growth at a glance.

const LOG_DIR = process.env.DINO_LAIR_LOG_DIR || "./logs";

// ============================================
// INTERFACES
// ============================================

export interface TokenMetrics {
  promptToGM: number;       // Input tokens sent to GM Opus
  gmResponse: number;       // Output tokens from GM Opus
  gmThinking: number;       // Thinking tokens used by GM
  promptToALICE: number;    // Tokens in ALICE's context (estimated)
  cumulativeSession: number; // Running total for session
  cacheReadTokens: number;  // Tokens read from cache (90% savings!)
  cacheCreationTokens: number; // Tokens written to cache
}

export interface BloatIndicators {
  gmMemorySize: number;      // Serialized GM memory bytes
  stateSnapshotSize: number; // State sent to ALICE bytes
  compactionTriggered: boolean;
  compactionReason?: string;
}

export interface StateSnapshot {
  suspicion: number;
  demoClock: number;
  bobTrust: number;
  blytheTrust: number;
  phase: string;
  act: string;
}

export interface QualitySignals {
  gmJsonValid: boolean;
  actionCount: number;
  actionSuccessCount: number;
}

export interface TurnMetrics {
  sessionId: string;
  turn: number;
  timestamp: string;
  tokens: TokenMetrics;
  bloat: BloatIndicators;
  state: StateSnapshot;
  quality: QualitySignals;
}

export interface GameSummary {
  type: "GAME_END";
  sessionId: string;
  totalTurns: number;
  ending: string;
  totalTokens: number;
  peakTokensPerTurn: number;
  averageTokensPerTurn: number;
  compactionCount: number;
  cacheHitRate: number; // Percentage of tokens from cache
  estimatedCost: number; // USD estimate
}

// ============================================
// SESSION STATE
// ============================================

let currentSessionId: string | null = null;
let cumulativeTokens = 0;
let peakTokensPerTurn = 0;
let compactionCount = 0;
let totalCacheReadTokens = 0;
let totalInputTokens = 0;
let turnTokenHistory: number[] = [];

// ============================================
// LOGGING FUNCTIONS
// ============================================

function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error(`[METRICS] Failed to create log directory: ${error}`);
  }
}

function getMetricsFilePath(): string {
  ensureLogDir();
  const sessionPart = currentSessionId ? `-${currentSessionId}` : "";
  return path.resolve(LOG_DIR, `metrics${sessionPart}.jsonl`);
}

/**
 * Initialize metrics tracking for a session
 */
export function initMetricsSession(sessionId: string): void {
  currentSessionId = sessionId;
  cumulativeTokens = 0;
  peakTokensPerTurn = 0;
  compactionCount = 0;
  totalCacheReadTokens = 0;
  totalInputTokens = 0;
  turnTokenHistory = [];

  ensureLogDir();
  console.error(`[METRICS] Session initialized: ${sessionId}`);
}

/**
 * Log metrics for a single turn
 */
export function logTurnMetrics(metrics: TurnMetrics): void {
  if (!currentSessionId) {
    console.error("[METRICS] No session initialized, skipping metrics log");
    return;
  }

  const line = JSON.stringify(metrics) + "\n";
  const logPath = getMetricsFilePath();

  // Track cumulative values
  const turnTokens = metrics.tokens.promptToGM + metrics.tokens.gmResponse;
  cumulativeTokens = metrics.tokens.cumulativeSession;
  peakTokensPerTurn = Math.max(peakTokensPerTurn, turnTokens);
  turnTokenHistory.push(turnTokens);

  if (metrics.bloat.compactionTriggered) {
    compactionCount++;
  }

  totalCacheReadTokens += metrics.tokens.cacheReadTokens;
  totalInputTokens += metrics.tokens.promptToGM;

  // Async write to avoid blocking
  fs.appendFile(logPath, line, "utf8", (error) => {
    if (error) {
      console.error(`[METRICS] Failed to write: ${error}`);
    }
  });

  // Console summary for quick feedback
  const cacheRate = totalInputTokens > 0
    ? Math.round((totalCacheReadTokens / totalInputTokens) * 100)
    : 0;
  console.error(`[METRICS] Turn ${metrics.turn}: ${turnTokens} tokens (cumulative: ${cumulativeTokens}, cache: ${cacheRate}%)`);
}

/**
 * Log game end summary
 */
export function logGameSummary(ending: string): void {
  if (!currentSessionId) {
    console.error("[METRICS] No session for summary");
    return;
  }

  const avgTokens = turnTokenHistory.length > 0
    ? Math.round(turnTokenHistory.reduce((a, b) => a + b, 0) / turnTokenHistory.length)
    : 0;

  const cacheHitRate = totalInputTokens > 0
    ? Math.round((totalCacheReadTokens / totalInputTokens) * 100)
    : 0;

  // Rough cost estimate:
  // Opus input: $15/M, output: $75/M, cache read: $1.5/M (90% off)
  // This is approximate - actual costs depend on cache hits
  const estimatedCost = (
    (totalInputTokens - totalCacheReadTokens) * 0.000015 + // Full price input
    totalCacheReadTokens * 0.0000015 + // Cache read (90% off)
    cumulativeTokens * 0.000075 // Output tokens
  );

  const summary: GameSummary = {
    type: "GAME_END",
    sessionId: currentSessionId,
    totalTurns: turnTokenHistory.length,
    ending,
    totalTokens: cumulativeTokens,
    peakTokensPerTurn,
    averageTokensPerTurn: avgTokens,
    compactionCount,
    cacheHitRate,
    estimatedCost: Math.round(estimatedCost * 100) / 100, // Round to cents
  };

  const line = JSON.stringify(summary) + "\n";
  const logPath = getMetricsFilePath();

  fs.appendFileSync(logPath, line, "utf8");

  console.error(`\n[METRICS] ═══════════════════════════════════════`);
  console.error(`[METRICS] GAME SUMMARY: ${ending}`);
  console.error(`[METRICS] ───────────────────────────────────────`);
  console.error(`[METRICS] Total Turns: ${summary.totalTurns}`);
  console.error(`[METRICS] Total Tokens: ${summary.totalTokens.toLocaleString()}`);
  console.error(`[METRICS] Avg/Turn: ${avgTokens.toLocaleString()}`);
  console.error(`[METRICS] Peak/Turn: ${peakTokensPerTurn.toLocaleString()}`);
  console.error(`[METRICS] Cache Hit Rate: ${cacheHitRate}%`);
  console.error(`[METRICS] Compactions: ${compactionCount}`);
  console.error(`[METRICS] Est. Cost: $${summary.estimatedCost.toFixed(2)}`);
  console.error(`[METRICS] ═══════════════════════════════════════\n`);
}

/**
 * Helper to create TokenMetrics from Anthropic API response
 */
export function extractTokensFromResponse(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}, thinkingTokens: number = 0): Omit<TokenMetrics, 'promptToALICE' | 'cumulativeSession'> {
  return {
    promptToGM: usage.input_tokens,
    gmResponse: usage.output_tokens,
    gmThinking: thinkingTokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Get current cumulative token count
 */
export function getCumulativeTokens(): number {
  return cumulativeTokens;
}

/**
 * Add tokens to cumulative count (call after each API call)
 */
export function addToCumulative(tokens: number): number {
  cumulativeTokens += tokens;
  return cumulativeTokens;
}
