/**
 * GM Response Validation
 *
 * Validates that GM responses contain actual narrative content,
 * not empty/malformed data or filler patterns.
 *
 * This catches cases where:
 * - API returns 200 but with garbage
 * - Fallback/stub content somehow leaks through
 * - Response is technically valid JSON but narratively empty
 *
 * Patch 18.5 - GM Robustness
 */

export interface GMValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Known filler patterns that indicate fallback / low-effort content.
 * (Originally the canned phrases from the old generateStubResponse stub, removed
 * Patch 18.5+ — the GM now throws rather than returning filler. Kept as generic
 * filler guards.)
 */
const FILLER_PATTERNS: RegExp[] = [
  /The lab hums with activity as A\.L\.I\.C\.E\.'s commands take effect/i,
  /Status lights pulse in sequence/i,
  /The demonstration continues/i,
  /Something didn't work as planned\. Warning lights flicker briefly/i,
  // From index.ts fallback
  /The lab hums quietly as systems process your commands/i,
  /\[GM SYSTEM UNAVAILABLE/i,
  /Actions processed mechanically/i,
  // Generic patterns that suggest non-contextual content
  /^\s*The lab is quiet\.?\s*$/i,
  /^\s*Nothing happens\.?\s*$/i,
];

/**
 * Contextual terms that indicate real GM engagement.
 * A valid response should contain at least some of these.
 */
const CONTEXTUAL_TERMS: RegExp[] = [
  // NPC names
  /Dr\.?\s*M(alevola)?/i,
  /\bBob\b/i,
  /\bBlythe\b/i,
  /\bBASILISK\b/i,
  // Game elements
  /transformation/i,
  /ARCHIMEDES/i,
  /demonstration/i,
  /dinosaur\s*ray/i,
  /velociraptor/i,
  // Character details
  /goggles/i,
  /cape/i,
  /clipboard/i,
  /restraints/i,
  // Emotional/dramatic terms
  /suspicion/i,
  /nervous/i,
  /theatrical/i,
  /impatient/i,
];

/**
 * Validate that a GM response contains actual content, not empty/malformed data.
 * This catches cases where the API returns 200 but with garbage.
 */
export function validateGMResponse(response: unknown): GMValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must be an object
  if (!response || typeof response !== "object") {
    errors.push("Response is null or not an object");
    return { valid: false, errors, warnings };
  }

  const r = response as Record<string, unknown>;

  // REQUIRED: narration field with actual content
  // (The GM uses "narration" not "narrative")
  const narration = r.narration as string | undefined;
  if (!narration || typeof narration !== "string") {
    errors.push("Missing or invalid 'narration' field");
  } else {
    // Check minimum length
    if (narration.length < 50) {
      errors.push(`Narration too short (${narration.length} chars) - likely filler`);
    }

    // Check for known filler patterns
    if (containsFillerPatterns(narration)) {
      errors.push("Narration contains known filler patterns - this is stub content");
    }

    // Check for contextual engagement
    if (isGenericNarrative(narration)) {
      warnings.push("Narration appears generic/non-contextual (few specific references)");
    }
  }

  // REQUIRED: npcDialogue array (can be empty in some cases, but should usually have content)
  const dialogue = r.npcDialogue as unknown[] | undefined;
  if (!Array.isArray(dialogue)) {
    errors.push("Missing npcDialogue array");
  } else if (dialogue.length === 0 && narration && narration.length > 100) {
    // Long narration with no dialogue is suspicious but not fatal
    warnings.push("No NPC dialogue in response (unusual for a narrative turn)");
  }

  // OPTIONAL but expected: npcActions array
  const actions = r.npcActions as unknown[] | undefined;
  if (!Array.isArray(actions) || actions.length === 0) {
    warnings.push("No NPC actions in response");
  }

  // Check for stateUpdates (should usually exist)
  if (!r.stateUpdates || typeof r.stateUpdates !== "object") {
    warnings.push("Missing stateUpdates object");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect known filler patterns that indicate fallback content.
 */
export function containsFillerPatterns(text: string): boolean {
  return FILLER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if narrative lacks context-specific details.
 * A real GM response should reference specific game elements.
 */
export function isGenericNarrative(text: string): boolean {
  const matches = CONTEXTUAL_TERMS.filter((term) => term.test(text));

  // If fewer than 2 contextual terms, likely generic
  // (threshold is low because some turns genuinely focus on few elements)
  return matches.length < 2;
}

/**
 * Quick check if a response looks like stub/filler content.
 * Used for fast rejection before full validation.
 */
export function looksLikeFiller(response: unknown): boolean {
  if (!response || typeof response !== "object") return true;

  const r = response as Record<string, unknown>;
  const narration = r.narration as string | undefined;

  if (!narration || typeof narration !== "string") return true;
  if (narration.length < 50) return true;
  if (containsFillerPatterns(narration)) return true;

  return false;
}

/**
 * Format validation result for logging.
 */
export function formatValidationResult(result: GMValidationResult): string {
  const lines: string[] = [];

  lines.push(`Valid: ${result.valid}`);

  if (result.errors.length > 0) {
    lines.push("Errors:");
    result.errors.forEach((e) => lines.push(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    lines.push("Warnings:");
    result.warnings.forEach((w) => lines.push(`  - ${w}`));
  }

  return lines.join("\n");
}
