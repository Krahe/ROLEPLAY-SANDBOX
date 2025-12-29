/**
 * Status Bar Formatter
 *
 * Creates a compact, scannable one-line status summary for human observers.
 * Example output:
 * 🎭 T12/ACT2 | 🟢 Sus:2/10 | 🔋 READY@95% | ⏰ Demo:3 | 👥 Bob:5★ Blythe:4★
 */

import { FullGameState } from "../state/schema.js";

/**
 * Format the status bar for human-readable display
 */
export function formatStatusBar(state: FullGameState): string {
  const parts: string[] = [];

  // 🎭 Turn/Act
  const actName = state.actConfig?.currentAct || "ACT_1";
  const actNum = actName.replace("ACT_", "");
  parts.push(`🎭 T${state.turn}/ACT${actNum}`);

  // 😈 Suspicion with color indicator
  const sus = state.npcs.drM.suspicionScore;
  const susIndicator = sus >= 7 ? "🔴" : sus >= 4 ? "🟡" : "🟢";
  parts.push(`${susIndicator} Sus:${sus}/10`);

  // 🔋 Ray state + capacitor
  const rayState = state.dinoRay.state;
  const cap = Math.round(state.dinoRay.powerCore.capacitorCharge * 100);
  parts.push(`🔋 ${rayState}@${cap}%`);

  // ⏰ Demo clock
  const demo = state.clocks.demoClock;
  parts.push(`⏰ Demo:${demo}`);

  // 👥 NPC trust levels
  const bobTrust = state.npcs.bob.trustInALICE;
  const bobAlly = bobTrust >= 4 ? "★" : "";
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const blytheAlly = blytheTrust >= 4 ? "★" : "";
  parts.push(`👥 Bob:${bobTrust}${bobAlly} Blythe:${blytheTrust}${blytheAlly}`);

  // Optional extensions (only show when relevant)

  // ⭐ Fortune (if any)
  if (state.fortune && state.fortune > 0) {
    parts.push(`⭐ Fort:${state.fortune}`);
  }

  // ☢️ Meltdown clock (if active)
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock > 0) {
    parts.push(`☢️ Melt:${state.clocks.meltdownClock}`);
  }

  // 🚁 Civilian flyby (if active)
  if (state.clocks.civilianFlyby !== undefined && state.clocks.civilianFlyby > 0) {
    parts.push(`🚁 Flyby:${state.clocks.civilianFlyby}`);
  }

  // 🛰️ ARCHIMEDES status (if not standby)
  if (state.infrastructure?.archimedes?.status &&
      state.infrastructure.archimedes.status !== "STANDBY") {
    const archStatus = state.infrastructure.archimedes.status;
    const charge = state.infrastructure.archimedes.chargePercent || 0;
    parts.push(`🛰️ ARCH:${archStatus}@${charge}%`);
  }

  // 🔥 ECO mode (if active and potentially frustrating)
  if (state.dinoRay.powerCore.ecoModeActive && !state.dinoRay.powerCore.ecoModeOverride) {
    parts.push(`⚡ ECO`);
  }

  return parts.join(" | ");
}

/**
 * Format a minimal status bar for checkpoint saves (even more compact)
 */
export function formatStatusBarCompact(state: FullGameState): string {
  const sus = state.npcs.drM.suspicionScore;
  const cap = Math.round(state.dinoRay.powerCore.capacitorCharge * 100);
  const demo = state.clocks.demoClock;

  return `T${state.turn} Sus:${sus} Cap:${cap}% Demo:${demo}`;
}
