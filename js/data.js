// Content loading. Static JSON files under /content, fetched and cached in memory.

const unitContentCache = new Map();
let unitsIndexCache = null;

export async function loadUnitsIndex() {
  if (unitsIndexCache) return unitsIndexCache;
  const res = await fetch("content/units.json");
  if (!res.ok) throw new Error(`Failed to load units index (${res.status})`);
  const data = await res.json();
  unitsIndexCache = data.units;
  return unitsIndexCache;
}

export async function loadUnit(unitId) {
  if (unitContentCache.has(unitId)) return unitContentCache.get(unitId);
  const index = await loadUnitsIndex();
  const meta = index.find((u) => u.id === unitId);
  if (!meta) throw new Error(`Unknown unit: ${unitId}`);
  const res = await fetch(`content/${meta.file}`);
  if (!res.ok) throw new Error(`Failed to load unit ${unitId} (${res.status})`);
  const data = await res.json();
  unitContentCache.set(unitId, data);
  return data;
}

export async function loadAllUnits() {
  const index = await loadUnitsIndex();
  return Promise.all(index.map((meta) => loadUnit(meta.id)));
}

/**
 * Flat map of every quizzable card (words, phrases, sentences — not dialogue
 * lines) across all units, keyed by id. Used by Practice mode to look up
 * card content from an SRS-tracked id and to build distractor pools.
 */
export async function loadCardIndex() {
  const units = await loadAllUnits();
  const index = new Map();
  for (const unit of units) {
    for (const w of unit.words) index.set(w.id, { ...w, kind: "word", unit: unit.unit, unitTitle: unit.title });
    for (const p of unit.phrases) index.set(p.id, { ...p, kind: "phrase", unit: unit.unit, unitTitle: unit.title });
    for (const s of unit.sentences) index.set(s.id, { ...s, kind: "sentence", unit: unit.unit, unitTitle: unit.title });
  }
  return index;
}
