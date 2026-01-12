/**
 * DINO LAIR Error Types
 *
 * Custom error classes for GM-related failures.
 * These enable proper error handling without silent degradation.
 *
 * Patch 18.5 - GM Robustness
 */

import type { GMValidationResult } from "../gm/gmValidation.js";

/**
 * Base class for GM-related errors.
 */
export class GMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GMError";
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GMError);
    }
  }
}

/**
 * Thrown when GM response fails validation.
 * This catches cases where the API returns 200 but with garbage/filler.
 */
export class GMValidationError extends GMError {
  public readonly validation: GMValidationResult;
  public readonly isFatal: boolean;

  constructor(message: string, validation: GMValidationResult, isFatal = false) {
    super(message);
    this.name = "GMValidationError";
    this.validation = validation;
    this.isFatal = isFatal;
  }
}

/**
 * Thrown when GM call times out.
 */
export class GMTimeoutError extends GMError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs?: number) {
    super(message);
    this.name = "GMTimeoutError";
    this.timeoutMs = timeoutMs ?? 0;
  }
}

/**
 * Thrown when all retry attempts are exhausted.
 * Contains the history of all failed attempts for debugging.
 */
export class GMUnavailableError extends GMError {
  public readonly attempts: Error[];
  public readonly totalAttempts: number;

  constructor(message: string, attempts: Error[]) {
    super(message);
    this.name = "GMUnavailableError";
    this.attempts = attempts;
    this.totalAttempts = attempts.length;
  }

  /**
   * Get a summary of all attempt failures for logging.
   */
  getAttemptSummary(): string {
    return this.attempts
      .map((e, i) => `  Attempt ${i + 1}: ${e.name} - ${e.message}`)
      .join("\n");
  }
}

/**
 * Thrown when GM returns a rate limit error.
 * May include retry-after information.
 */
export class GMRateLimitError extends GMError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "GMRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown when the API key is missing or invalid.
 */
export class GMAuthError extends GMError {
  constructor(message: string) {
    super(message);
    this.name = "GMAuthError";
  }
}
