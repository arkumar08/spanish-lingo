// Spaced repetition engine — a simple 5-box Leitner system.
// State lives in localStorage, keyed by card id, so review sessions can pull
// due cards from every unit the user has touched, not just one at a time.

import { recordActivityToday } from "./streak.js";

const STORAGE_KEY = "estudio.srs.v1";

// Days to wait before a card in this box is due again, once it lands there.
const BOX_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Current SRS record for a card, or null if it hasn't been reviewed yet. */
export function getCardState(cardId) {
  const state = loadState();
  return state[cardId] || null;
}

/**
 * Record a review result for a card. Correct moves it up a box (longer
 * interval); incorrect resets it to box 1 (due again immediately).
 */
export function recordResult(cardId, correct) {
  recordActivityToday();
  const state = loadState();
  const prev = state[cardId] || { box: 1, reps: 0 };
  const box = correct ? Math.min(prev.box + 1, 5) : 1;
  const now = new Date();

  const record = {
    box,
    due: addDays(now, BOX_INTERVAL_DAYS[box]).toISOString(),
    reps: prev.reps + 1,
    updatedAt: now.toISOString(),
  };

  state[cardId] = record;
  saveState(state);
  return record;
}

/** All card ids that have been reviewed at least once. */
export function getTrackedCardIds() {
  return Object.keys(loadState());
}

/** Card ids whose next review is due now (or were never reviewed... no —
 *  only cards already in the system, per "everything I've learned so far"). */
export function getDueCardIds(now = new Date()) {
  const state = loadState();
  return Object.entries(state)
    .filter(([, record]) => new Date(record.due) <= now)
    .map(([id]) => id);
}

/** Lightweight stats for the Progress view: how many cards sit in each box. */
export function getStats() {
  const state = loadState();
  const entries = Object.values(state);
  const byBox = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rec of entries) byBox[rec.box] = (byBox[rec.box] || 0) + 1;
  return {
    totalTracked: entries.length,
    dueNow: getDueCardIds().length,
    byBox,
  };
}
