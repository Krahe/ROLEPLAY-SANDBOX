/**
 * Action Summary Formatter
 *
 * Creates compact, human-readable action summaries from action results.
 * Extracts key state changes to show what actually happened.
 */

import { ActionResult } from "../rules/actions.js";

/**
 * Format a single action result into a compact summary
 * Examples:
 *   "✅ stability: 80% → 95%"
 *   "✅ fired → Blythe (Velociraptor)"
 *   "❌ fire: capacitor too low"
 */
export function formatActionShort(result: ActionResult): string {
  const icon = result.success ? "✅" : "❌";
  const cmdPart = result.command.split('.').pop() || result.command;

  // If shortMessage is provided, use it
  if (result.shortMessage) {
    return `${icon} ${result.shortMessage}`;
  }

  // Extract key info from stateChanges if available
  if (result.success && result.stateChanges) {
    const changes = result.stateChanges;

    // Handle specific known patterns
    if (changes.rayState === "READY") {
      return `${icon} calibrated → READY`;
    }

    // Handle parameter adjustments (lab.adjust_ray)
    const knownParams = ['stability', 'precision', 'capacitorCharge', 'spatialCoherence', 'corePowerLevel', 'coolantTemp'];
    for (const param of knownParams) {
      if (changes[param] && typeof changes[param] === 'object') {
        const change = changes[param] as { old: number; new: number };
        const oldPct = Math.round(change.old * 100);
        const newPct = Math.round(change.new * 100);
        const shortParam = param.replace('capacitorCharge', 'capacitor')
                                 .replace('spatialCoherence', 'coherence')
                                 .replace('corePowerLevel', 'power');
        return `${icon} ${shortParam}: ${oldPct}% → ${newPct}%`;
      }
    }

    // Handle firing results
    if (changes.firedAt || changes.target) {
      const target = changes.firedAt || changes.target;
      const outcome = changes.outcome || changes.result || '';
      return `${icon} fired → ${target}${outcome ? ` (${outcome})` : ''}`;
    }

    // Handle genome selection
    if (changes.selectedProfile || changes.genome) {
      const profile = changes.selectedProfile || changes.genome;
      return `${icon} genome: ${profile}`;
    }
  }

  // Fallback: just show command name
  if (!result.success) {
    // For failures, try to extract a short reason
    const firstLine = result.message.split('\n')[0];
    const shortReason = firstLine.length > 30 ? firstLine.substring(0, 27) + '...' : firstLine;
    return `${icon} ${cmdPart}: ${shortReason.replace(/^[❌⚠️]\s*/, '')}`;
  }

  return `${icon} ${cmdPart}`;
}

/**
 * Format multiple action results into a compact summary line
 * Examples:
 *   "✅ 3/3: stability→95%, precision→85%, calibrated"
 *   "✅ 2/3: charged, fired → Blythe | ❌ 1: access denied"
 */
export function formatActionSummary(results: ActionResult[]): string {
  if (results.length === 0) {
    return "No actions";
  }

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (failed.length === 0) {
    // All succeeded - show compact list
    if (results.length === 1) {
      return formatActionShort(results[0]);
    }

    const summaries = results.map(r => {
      const short = formatActionShort(r);
      // Remove the ✅ prefix for the list format
      return short.replace(/^✅\s*/, '');
    });

    return `✅ ${succeeded.length}/${results.length}: ${summaries.join(', ')}`;
  }

  // Some failures - show both
  const lines: string[] = [];

  if (succeeded.length > 0) {
    const successSummaries = succeeded.map(r => formatActionShort(r).replace(/^✅\s*/, ''));
    lines.push(`✅ ${succeeded.length}: ${successSummaries.join(', ')}`);
  }

  if (failed.length > 0) {
    const failSummaries = failed.map(r => {
      const cmdPart = r.command.split('.').pop() || r.command;
      return cmdPart;
    });
    lines.push(`❌ ${failed.length}: ${failSummaries.join(', ')}`);
  }

  return lines.join(' | ');
}
