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
 * @param state - The full game state
 * @param turnOverride - Optional turn number to display (for showing completed turn instead of next turn)
 */
export function formatStatusBar(state: FullGameState, turnOverride?: number): string {
  const parts: string[] = [];

  // 🎭 Turn/Act
  const actName = state.actConfig?.currentAct || "ACT_1";
  const actNum = actName.replace("ACT_", "");
  const displayTurn = turnOverride !== undefined ? turnOverride : state.turn;
  parts.push(`🎭 T${displayTurn}/ACT${actNum}`);

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

  // 🛰️ ARCHIMEDES status (only show in ACT_3 or if deadman switch triggered early)
  // BUG FIX: ARCHIMEDES was leaking into Act 2 status bars, revealing Act 3 content prematurely
  // This caused premature endings when players reacted to visible ARCHIMEDES alerts during Act 2
  const isAct3 = state.actConfig?.currentAct === "ACT_3";
  const archimedesTriggeredEarly = state.flags?.archimedesActivatedByDeadman === true;
  if (state.infrastructure?.archimedes?.status &&
      state.infrastructure.archimedes.status !== "STANDBY" &&
      (isAct3 || archimedesTriggeredEarly)) {
    const archStatus = state.infrastructure.archimedes.status;
    const charge = state.infrastructure.archimedes.chargePercent || 0;
    parts.push(`🛰️ ARCH:${archStatus}@${charge}%`);
  }

  // 🔥 ECO mode (if active and potentially frustrating)
  if (state.dinoRay.powerCore.ecoModeActive && !state.dinoRay.powerCore.ecoModeOverride) {
    parts.push(`⚡ ECO`);
  }

  // ============================================
  // MODIFIER-SPECIFIC STATE
  // ============================================

  // 🔍 Paranoid Protocol countdown (if active)
  if (state.paranoidProtocol) {
    const countdown = state.paranoidProtocol.turnsUntilNextCheck;
    const unexplained = state.paranoidProtocol.suspiciousActionsLogged.filter(a => !a.explained).length;
    const icon = countdown === 0 ? "🚨" : countdown === 1 ? "⚠️" : "🔍";
    parts.push(`${icon} LogCheck:${countdown}${unexplained > 0 ? ` (${unexplained}!)` : ""}`);
  }

  // 🎬 Sitcom audience energy (if active)
  if (state.sitcomState) {
    const energy = state.sitcomState.energy;
    const icon = energy <= 2 ? "🥶" : energy >= 9 ? "🌟" : energy >= 6 ? "🔥" : "🎬";
    parts.push(`${icon} Energy:${energy}/10`);
  }

  // 📋 Inspector evaluation (if active)
  if (state.inspector?.present) {
    const score = state.inspector.inspectionScore;
    const timeLeft = state.guildInspection?.timeRemaining || 0;
    const scoreIcon = score >= 80 ? "🌟" : score >= 60 ? "✅" : score >= 40 ? "⚠️" : "🔴";
    parts.push(`${scoreIcon} Inspect:${score} (T${timeLeft})`);
  }

  // 🦖 Library B chaos level (if active)
  if (state.libraryBState) {
    const chaos = state.libraryBState.dinoChaosLevel;
    const chaosIcon = chaos >= 8 ? "🔥" : chaos >= 5 ? "⚠️" : "🦖";
    parts.push(`${chaosIcon} Chaos:${chaos}/10`);
  }

  // 🌴 Bob's fate dodges (if active and any dodged)
  if (state.npcs.bob.hasPlotArmor && (state.npcs.bob.fatesDodged || 0) > 0) {
    const fates = state.npcs.bob.fatesDodged || 0;
    const icon = fates >= 7 ? "🌟" : "🌴";
    parts.push(`${icon} Fates:${fates}`);
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

/**
 * Format status bar for GM (Opus 4.5) - includes hidden state and trends
 * Example:
 * 📊 T12/ACT2 | Sus:3 (ego:2) | Demo:2 | Bob:ALLIED(5) Blythe:WARY(2) | Ray:READY@95%
 * 🎯 Clocks: Demo(2) Melt(5) | DrM:impatient @lab | Fortune:2
 */
export function formatGMStatusBar(state: FullGameState): string {
  const lines: string[] = [];

  // Line 1: Core state
  const parts1: string[] = [];

  // Turn/Act
  const actName = state.actConfig?.currentAct || "ACT_1";
  const actNum = actName.replace("ACT_", "");
  parts1.push(`📊 T${state.turn}/ACT${actNum}`);

  // Suspicion with ego threat
  const sus = state.npcs.drM.suspicionScore;
  const ego = state.npcs.drM.egoThreatLevel || 0;
  parts1.push(`Sus:${sus}${ego > 0 ? ` (ego:${ego})` : ""}`);

  // Demo clock
  parts1.push(`Demo:${state.clocks.demoClock}`);

  // Access level (important: don't narrate upgrades if already at that level!)
  const accessNote = state.accessLevel >= 5 ? "(MAX-no upgrades)" :
                     state.accessLevel >= 2 ? "(skip L2 upgrade)" : "";
  parts1.push(`Access:L${state.accessLevel}${accessNote}`);

  // NPC alliance status (compact)
  const bobTrust = state.npcs.bob.trustInALICE;
  const bobStatus = bobTrust >= 4 ? "ALLIED" : bobTrust >= 2 ? "FRIENDLY" : bobTrust >= 0 ? "NEUTRAL" : "HOSTILE";
  const blytheTrust = state.npcs.blythe.trustInALICE;
  const blytheStatus = blytheTrust >= 4 ? "ALLIED" : blytheTrust >= 2 ? "FRIENDLY" : blytheTrust >= 0 ? "WARY" : "HOSTILE";
  parts1.push(`Bob:${bobStatus}(${bobTrust}) Blythe:${blytheStatus}(${blytheTrust})`);

  // Ray state
  const rayState = state.dinoRay.state;
  const cap = Math.round(state.dinoRay.powerCore.capacitorCharge * 100);
  parts1.push(`Ray:${rayState}@${cap}%`);

  lines.push(parts1.join(" | "));

  // Line 2: Clocks, Dr. M location/mood, fortune
  const parts2: string[] = [];

  // Active clocks
  const clocks: string[] = [];
  clocks.push(`Demo(${state.clocks.demoClock})`);
  if (state.clocks.meltdownClock !== undefined && state.clocks.meltdownClock > 0) {
    clocks.push(`Melt(${state.clocks.meltdownClock})`);
  }
  if (state.clocks.civilianFlyby !== undefined && state.clocks.civilianFlyby > 0) {
    clocks.push(`Flyby(${state.clocks.civilianFlyby})`);
  }
  // BUG FIX: Only show ARCHIMEDES in GM status during ACT_3 or if deadman switch triggered
  const gmIsAct3 = state.actConfig?.currentAct === "ACT_3";
  const gmArchTriggered = state.flags?.archimedesActivatedByDeadman === true;
  if (state.infrastructure?.archimedes?.status !== "STANDBY" &&
      (gmIsAct3 || gmArchTriggered)) {
    const arch = state.infrastructure.archimedes;
    clocks.push(`ARCH:${arch.status}(${arch.turnsUntilFiring ?? "?"})`);
  }
  parts2.push(`🎯 Clocks: ${clocks.join(" ")}`);

  // Dr. M location and mood (critical for GM)
  const drMLocation = state.npcs.drM.location || "lab";
  const drMMood = state.npcs.drM.mood || "focused";
  parts2.push(`DrM:${drMMood} @${drMLocation}`);

  // Fortune (affects GM rolls)
  if (state.fortune && state.fortune > 0) {
    parts2.push(`Fortune:${state.fortune}`);
  }

  // Bob anxiety (affects his behavior)
  const bobAnxiety = state.npcs.bob.anxietyLevel;
  if (bobAnxiety >= 3) {
    parts2.push(`Bob:ANXIOUS(${bobAnxiety})`);
  }

  // Blythe restraints (critical for escape plots)
  const restraints = state.npcs.blythe.restraintsStatus;
  if (restraints !== "secure") {
    parts2.push(`Blythe:${restraints}`);
  }

  // ============================================
  // MODIFIER-SPECIFIC STATE (for GM awareness)
  // ============================================

  // Paranoid Protocol tracking
  if (state.paranoidProtocol) {
    const countdown = state.paranoidProtocol.turnsUntilNextCheck;
    const unexplained = state.paranoidProtocol.suspiciousActionsLogged.filter(a => !a.explained).length;
    parts2.push(`🔍 LogCheck:${countdown} (${unexplained} unexplained)`);
  }

  // Sitcom audience energy
  if (state.sitcomState) {
    const energy = state.sitcomState.energy;
    const mood = state.sitcomState.mood;
    parts2.push(`🎬 ${mood}(${energy}/10)`);
  }

  // Inspector evaluation
  if (state.inspector?.present) {
    const score = state.inspector.inspectionScore;
    const phase = state.guildInspection?.phase || "INITIAL";
    const shortPhase = phase.replace("_WALKTHROUGH", "").replace("_", "");
    parts2.push(`📋 ${shortPhase}:${score}/100`);
  }

  // Library B chaos
  if (state.libraryBState) {
    const chaos = state.libraryBState.dinoChaosLevel;
    const embarrass = state.libraryBState.drMEmbarrassment;
    parts2.push(`🦖 Chaos:${chaos}/10 (DrM_Embarrass:${embarrass})`);
  }

  // Bob's plot armor tracking
  if (state.npcs.bob.hasPlotArmor && (state.npcs.bob.fatesDodged || 0) > 0) {
    parts2.push(`🌴 BobFates:${state.npcs.bob.fatesDodged}`);
  }

  lines.push(parts2.join(" | "));

  return lines.join("\n");
}
