// Progress view: streak, learned counts, cards due today, and per-unit
// mastery. Calm by design — no red, no "you're falling behind" messaging.

import { loadAllUnits } from "../data.js";
import { getCardState, getDueCardIds } from "../srs.js";
import { getStreak } from "../streak.js";

function unitCards(unit) {
  return [
    ...unit.words.map((c) => ({ ...c, kind: "word" })),
    ...unit.phrases.map((c) => ({ ...c, kind: "phrase" })),
    ...unit.sentences.map((c) => ({ ...c, kind: "sentence" })),
  ];
}

function cardBox(id) {
  const state = getCardState(id);
  return state ? state.box : 0;
}

export async function renderProgress(container, onPracticeClick) {
  container.innerHTML = `<p class="view-subtitle">Loading…</p>`;

  const units = await loadAllUnits();
  const streak = getStreak();
  const dueIds = new Set(getDueCardIds());

  let totalCards = 0;
  let learnedCards = 0;
  let dueToday = 0;

  const unitStats = units.map((unit) => {
    const cards = unitCards(unit);
    let boxSum = 0;
    let learned = 0;
    let due = 0;

    for (const card of cards) {
      const box = cardBox(card.id);
      boxSum += box;
      if (box > 0) learned += 1;
      if (dueIds.has(card.id)) due += 1;
    }

    totalCards += cards.length;
    learnedCards += learned;
    dueToday += due;

    return {
      title: unit.title,
      level: unit.level,
      total: cards.length,
      learned,
      mastery: cards.length ? Math.round((boxSum / (cards.length * 5)) * 100) : 0,
    };
  });

  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Progress</h1>
      <p class="view-subtitle">A quiet record of what's sinking in.</p>
    </div>

    <div class="stat-grid">
      <div class="stat-tile">
        <div class="stat-tile__value">${streak.current}</div>
        <div class="stat-tile__label">${streak.current === 1 ? "day streak" : "day streak"}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__value">${learnedCards}</div>
        <div class="stat-tile__label">words &amp; phrases learned</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__value">${dueToday}</div>
        <div class="stat-tile__label">due today</div>
      </div>
    </div>

    ${dueToday > 0 ? `<button class="btn btn--primary" id="go-practice-btn" style="width:auto; padding-left:28px; padding-right:28px; margin-bottom:36px;">Review due cards</button>` : ""}

    <h2 class="section-heading">By unit</h2>
    <div class="mastery-list">
      ${unitStats
        .map(
          (u) => `
        <div class="mastery-row">
          <div class="mastery-row__head">
            <span class="mastery-row__title">${u.title}</span>
            <span class="mastery-row__pct">${u.mastery}%</span>
          </div>
          <div class="mastery-track"><div class="mastery-fill" style="width:${u.mastery}%"></div></div>
          <p class="mastery-row__meta">${u.learned} of ${u.total} reviewed</p>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  if (dueToday > 0 && onPracticeClick) {
    container.querySelector("#go-practice-btn").addEventListener("click", onPracticeClick);
  }
}
