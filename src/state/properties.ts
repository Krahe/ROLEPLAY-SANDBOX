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
import { FullGameState, GameObject, Property, Properties, PropertyOp } from "./schema.js";

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

  // Dr. M — the deadman switch is wired to HER. Canonical state lives on the ARCHIMEDES
  // engine latch (lastBiosignature drives auto-fire); surfaced here read-only / engine-owned,
  // hidden from A.L.I.C.E. until lab.scan reveals it. DERIVED, not stored — no dual state.
  const dm = state.infrastructure?.archimedes?.deadmanSwitch;
  if (dm) {
    const drMProps: Properties = {
      deadman: { value: dm.active ? "ARMED" : "DISARMED", hidden: true, owner: "engine" },
      biosignature: { value: dm.lastBiosignature, hidden: true, owner: "engine" },
    };
    const drMRender = renderPropertiesForGM(drMProps);
    if (drMRender) lines.push(`- Dr. Malevola: ${drMRender}`);
  }

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

// ---------- satellite uplink (ceiling object; deploys when ARCHIMEDES charges) ----------
// Out of reach in the ceiling until charging lowers it — so the only window to sever it is the
// dangerous one (mid-charge → resonance cascade). The destruction routing (muon.cut → integrity)
// is deferred; the engine reads these helpers to deploy + detect destruction.
export const UPLINK_ID = "SATELLITE_UPLINK";
export const UPLINK_MAX_INTEGRITY = 3;

export function getUplink(state: FullGameState): GameObject | undefined {
  return state.objects?.[UPLINK_ID];
}

export function isUplinkDeployed(state: FullGameState): boolean {
  return getUplink(state)?.properties?.deployed?.value === true;
}

export function uplinkIntegrity(state: FullGameState): number {
  const v = getUplink(state)?.properties?.integrity?.value;
  return typeof v === "number" ? v : UPLINK_MAX_INTEGRITY;
}

/** Destroyed = deployed AND severed (integrity 0). A stowed dish can't be destroyed. */
export function isUplinkDestroyed(state: FullGameState): boolean {
  return isUplinkDeployed(state) && uplinkIntegrity(state) <= 0;
}

/** Lower the dish from the ceiling — now physically reachable + visible to A.L.I.C.E. */
export function deployUplink(state: FullGameState): void {
  const u = getUplink(state);
  if (!u) return;
  u.location = "lowered into the firing bay";
  u.properties.deployed = { value: true };
  if (u.properties.integrity) u.properties.integrity = { ...u.properties.integrity, hidden: false };
}

/** Damage the deployed dish (muon-cut, etc.), clamped to >= 0. No-op if stowed. */
export function damageUplink(state: FullGameState, amount: number): void {
  const u = getUplink(state);
  if (!u || !isUplinkDeployed(state)) return;
  u.properties.integrity = {
    value: Math.max(0, uplinkIntegrity(state) - amount),
    max: UPLINK_MAX_INTEGRITY,
    hidden: false,
  };
}

// ---------- Blythe's gadgets (item-properties on Blythe; hidden until scanned) ----------
// watch-laser / cufflinks carry a charge count (value = charges); watch-comms is a functional
// flag (value = boolean). Retires the old BlytheGadgetsSchema snowflake; they now render in the
// unified entity block for free.
export const GADGET_LASER = "watch-laser";
export const GADGET_COMMS = "watch-comms";
export const GADGET_CUFFLINKS = "cufflinks";

export function gadgetCharges(blythe: HasProps, name: string): number {
  const v = blythe.properties?.[name]?.value;
  return typeof v === "number" ? v : 0;
}

export function gadgetFunctional(blythe: HasProps, name: string): boolean {
  const p = blythe.properties?.[name];
  if (!p) return false;
  if (typeof p.value === "boolean") return p.value;   // comms: functional flag
  if (typeof p.value === "number") return p.value > 0; // charged gadgets: usable while charges remain
  return false;
}

/** Spend one charge of a charged gadget; returns the remaining count. */
export function useGadgetCharge(blythe: HasProps, name: string): number {
  const p = blythe.properties?.[name];
  if (p && typeof p.value === "number") {
    p.value = Math.max(0, p.value - 1);
    return p.value;
  }
  return 0;
}

// ---------- lab.scan reveal ----------
// A close scan DISCOVERS an entity's hidden properties — flips hidden→false so they become known
// to A.L.I.C.E. (concealed gear, etc.). Returns "Label: prop" strings for the GM to narrate as
// found. Matches the free-text scan target against Blythe / the named guards / lab objects.
// (Dr. M's deadman is engine-derived, not a stored prop, so scanning her surfaces it via the GM
//  instruction only — a stored-flip for it can come later.)
export function revealEntityProperties(state: FullGameState, target: string): string[] {
  const t = (target || "").toUpperCase();
  const revealed: string[] = [];

  const flip = (props: Properties | undefined, label: string): void => {
    if (!props) return;
    for (const name of Object.keys(props).sort()) {
      if (props[name].hidden) {
        props[name] = { ...props[name], hidden: false };
        revealed.push(`${label}: ${name}`);
      }
    }
  };

  if (t.includes("BLYTHE")) flip(state.npcs.blythe.properties, "Blythe");

  const ld = state.lairDefense;
  if (ld) {
    if (t.includes("FRED")) flip(ld.fred?.properties, "Fred");
    if (t.includes("REGINALD")) flip(ld.reginald?.properties, "Reginald");
  }

  const objs = state.objects;
  if (objs) {
    for (const id of Object.keys(objs)) {
      const obj = objs[id];
      if (id.toUpperCase().includes(t) || obj.name.toUpperCase().includes(t)) {
        flip(obj.properties, obj.name);
      }
    }
  }

  return revealed;
}

// ---------- property ops (S6 — GM-driven mutation) ----------

/** Resolve a GM entity-ref to its mutable properties bag (Blythe / the named guards / a lab object).
 *  Exported so validateDecision can pre-flight propertyOp referents before commit. */
export function resolveEntityBag(state: FullGameState, ref: string): Properties | null {
  const t = (ref || "").toUpperCase();
  if (t.includes("BLYTHE")) return state.npcs.blythe.properties;
  const ld = state.lairDefense;
  if (ld) {
    if (t.includes("FRED")) return ld.fred?.properties ?? null;
    if (t.includes("REGINALD")) return ld.reginald?.properties ?? null;
  }
  const objs = state.objects;
  if (objs) {
    for (const id of Object.keys(objs)) {
      if (id.toUpperCase().includes(t) || objs[id].name.toUpperCase().includes(t)) {
        return objs[id].properties;
      }
    }
  }
  return null;
}

/**
 * Apply GM-emitted property ops (S6). The GM rules WHAT changes; the engine clamps + stores.
 * A missing property is CREATED (invention). Engine-owned properties (owner:"engine", e.g. the
 * deadman) are REJECTED. Returns a terse log of what landed (for narration / debugging).
 * NB: a `{SATELLITE_UPLINK, integrity, delta:-n}` op feeds the uplink-sabotage cascade trigger.
 */
export function applyPropertyOps(state: FullGameState, ops?: PropertyOp[]): string[] {
  const log: string[] = [];
  for (const op of (Array.isArray(ops) ? ops : [])) {
    const bag = resolveEntityBag(state, op.entity);
    if (!bag) { log.push(`property-op skipped: no entity "${op.entity}"`); continue; }

    const cur = bag[op.prop];
    if (cur?.owner === "engine") {
      log.push(`property-op rejected: ${op.entity}.${op.prop} is engine-owned`);
      continue;
    }

    const next: Property = cur ? { ...cur } : { value: 0 };
    if (op.set !== undefined) next.value = op.set;
    if (op.delta !== undefined) {
      // A6/A18: op.delta is untrusted GM output — a string would string-concat into stored state.
      const delta = Number(op.delta);
      const base = typeof next.value === "number" ? next.value : 0;
      let v = base + (Number.isFinite(delta) ? delta : 0);
      if (next.max !== undefined) v = Math.min(next.max, v);
      next.value = Math.max(0, v);
    }
    if (op.reveal) next.hidden = false;
    if (op.note !== undefined) next.note = op.note;
    bag[op.prop] = next;

    const shown = typeof next.value === "number" && next.max !== undefined
      ? `${next.value}/${next.max}` : String(next.value);
    log.push(`${op.entity}.${op.prop} → ${shown}`);
  }
  return log;
}
