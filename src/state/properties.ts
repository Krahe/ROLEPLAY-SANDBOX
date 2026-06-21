// ============================================
// PROPERTY LAYER (S5) — helpers for named, graded/typed properties on entities.
//
// A Property is a single tracked fact (a graded counter, a status enum, or a flag)
// that lives ON an entity, is mutated by engine rules OR by the GM (DECIDE), and is
// rendered to the GM (sees everything) and to A.L.I.C.E. (hidden ones filtered until
// lab.scan reveals them).
//
// The engine STORES the value; the GM rules HOW it changes — a muon cut, a careful
// tyrannosaur bite, Dr. M reinforcing the straps. No hardcoded per-interaction
// physics lives here; that is the whole point (facts here, rulings in DECIDE,
// prose in NARRATE).
//
// First inhabitant: Blythe.properties.restraints (graded 0..4).
// ============================================
import { FullGameState, Property, Properties } from "./schema.js";

// ---------- generic ----------

/** Read a property by name; undefined if absent. */
export function getProp(props: Properties | undefined, name: string): Property | undefined {
  return props?.[name];
}

function formatProp(name: string, p: Property, forGM: boolean): string {
  let v: string;
  if (typeof p.value === "number") {
    v = p.max !== undefined ? `${p.value}/${p.max}` : String(p.value);
  } else {
    v = String(p.value);
  }
  const hiddenTag = forGM && p.hidden ? " (hidden)" : "";
  return `${name} ${v}${hiddenTag}`;
}

/**
 * Render an entity's properties for the GM (sees everything, hidden included).
 * Keys are emitted in SORTED order so the string is byte-stable turn-over-turn —
 * the cached-prefix fingerprint depends on this determinism.
 */
export function renderPropertiesForGM(props: Properties | undefined): string {
  if (!props) return "";
  return Object.keys(props)
    .sort()
    .map(name => formatProp(name, props[name], true))
    .join(" · ");
}

/**
 * Render an entity's properties for A.L.I.C.E. — hidden properties are dropped
 * (they surface only after lab.scan flips hidden=false).
 */
export function renderPropertiesForPlayer(props: Properties | undefined): string[] {
  if (!props) return [];
  return Object.keys(props)
    .sort()
    .filter(name => !props[name].hidden)
    .map(name => formatProp(name, props[name], false));
}

/**
 * The GM-facing entity-properties block injected into the live (uncached) prompt
 * tail. Sorted + deterministic so it agrees with the fingerprint. For the first
 * slice only Blythe carries a property; drM/bob/guards/objects join later.
 */
export function formatPropertiesForGM(state: FullGameState): string {
  const lines: string[] = [];
  const blythe = renderPropertiesForGM(state.npcs.blythe.properties);
  if (blythe) lines.push(`- Blythe: ${blythe}`);

  // Guards (Fred/Reginald) — lairDefense is optional (absent on some pre-Act-III saves).
  const ld = state.lairDefense;
  if (ld) {
    for (const g of [ld.fred, ld.reginald]) {
      if (!g) continue;
      const gp = renderPropertiesForGM(g.properties);
      if (gp) lines.push(`- ${g.displayName} (guard): ${gp}`);
    }
  }

  // Standalone lab objects (dummy, watermelon, …) — sorted by id for determinism.
  const objs = state.objects;
  if (objs) {
    for (const id of Object.keys(objs).sort()) {
      const obj = objs[id];
      const op = renderPropertiesForGM(obj.properties);
      if (op) lines.push(`- ${obj.name}${obj.location ? ` @ ${obj.location}` : ""}: ${op}`);
    }
  }

  if (lines.length === 0) return "";
  return ["## ENTITY PROPERTIES (GM only — includes hidden)", ...lines].join("\n");
}

// ---------- restraints (the first property) ----------

export const RESTRAINTS_MAX = 4;

interface HasProps {
  properties?: Properties;
}

/** Blythe's restraints property, defaulting to fully-secure if absent. */
export function blytheRestraints(blythe: HasProps): Property {
  return blythe.properties?.restraints ?? { value: RESTRAINTS_MAX, max: RESTRAINTS_MAX };
}

export function restraintsValue(blythe: HasProps): number {
  const v = blytheRestraints(blythe).value;
  return typeof v === "number" ? v : RESTRAINTS_MAX;
}

/** Fully restrained = at (or above) max integrity. */
export function isFullyRestrained(blythe: HasProps): boolean {
  const p = blytheRestraints(blythe);
  return restraintsValue(blythe) >= (p.max ?? RESTRAINTS_MAX);
}

/** Free = no restraint integrity left. */
export function isFree(blythe: HasProps): boolean {
  return restraintsValue(blythe) <= 0;
}

/** Set restraints to a clamped value, ensuring the property exists. */
export function setRestraints(blythe: HasProps, value: number): void {
  if (!blythe.properties) blythe.properties = {};
  blythe.properties.restraints = {
    value: Math.max(0, Math.min(RESTRAINTS_MAX, Math.round(value))),
    max: RESTRAINTS_MAX,
  };
}

/** Human label for the current restraint integrity (Krahe's ladder). */
export function restraintLabel(blythe: HasProps): string {
  const v = restraintsValue(blythe);
  if (v >= RESTRAINTS_MAX) return "secure";
  if (v === 3) return "damaged";
  if (v === 2) return "one strap freed";
  if (v === 1) return "hanging by a thread";
  return "free";
}

/** GM-facing one-liner: "2/4 (one strap freed)". */
export function restraintSummary(blythe: HasProps): string {
  return `${restraintsValue(blythe)}/${RESTRAINTS_MAX} (${restraintLabel(blythe)})`;
}
