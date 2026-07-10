// Daily streak tracking. A day counts if at least one card was reviewed
// (Learn or Practice both call recordActivityToday via srs.recordResult).
// No punitive bookkeeping: a broken streak just quietly reads as 0 next time
// rather than firing any kind of "you lost your streak" event.

const STORAGE_KEY = "estudio.streak.v1";

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(`${dateStrA}T00:00:00`);
  const b = new Date(`${dateStrB}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { current: 0, longest: 0, lastActiveDate: null };
  } catch {
    return { current: 0, longest: 0, lastActiveDate: null };
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Call once per review. No-ops if today was already recorded. */
export function recordActivityToday(now = new Date()) {
  const today = localDateString(now);
  const state = load();

  if (state.lastActiveDate === today) return state;

  state.current = state.lastActiveDate && daysBetween(state.lastActiveDate, today) === 1
    ? state.current + 1
    : 1;
  state.longest = Math.max(state.longest, state.current);
  state.lastActiveDate = today;

  save(state);
  return state;
}

/** Read-only: current streak reads as 0 once more than a day has passed
 *  since the last activity, without mutating stored state. */
export function getStreak(now = new Date()) {
  const state = load();
  if (!state.lastActiveDate) return { current: 0, longest: state.longest };

  const gap = daysBetween(state.lastActiveDate, localDateString(now));
  return { current: gap <= 1 ? state.current : 0, longest: state.longest };
}
