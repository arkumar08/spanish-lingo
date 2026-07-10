// Learn mode: flashcard review through a unit's words -> phrases -> sentences,
// followed by a short dialogue read-through.

import { loadUnitsIndex, loadUnit } from "../data.js";
import { recordResult } from "../srs.js";

function buildDeck(unit) {
  const words = unit.words.map((w) => ({ kind: "word", ...w }));
  const phrases = unit.phrases.map((p) => ({ kind: "phrase", ...p }));
  const sentences = unit.sentences.map((s) => ({ kind: "sentence", ...s }));
  return [...words, ...phrases, ...sentences];
}

const sectionLabel = { word: "Words", phrase: "Phrases", sentence: "Sentences" };

export async function renderLearn(container) {
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Learn</h1>
      <p class="view-subtitle">Pick a unit to review its words, phrases, and sentences.</p>
    </div>
    <div class="unit-grid" id="unit-grid"></div>
  `;

  const grid = container.querySelector("#unit-grid");
  const units = await loadUnitsIndex();

  grid.innerHTML = units
    .map(
      (u) => `
      <button class="unit-card" data-unit="${u.id}">
        <span class="unit-card__level">${u.level}</span>
        <h3 class="unit-card__title">${u.title}</h3>
        <p class="unit-card__meta">Words · Phrases · Sentences · Dialogue</p>
      </button>
    `
    )
    .join("");

  grid.querySelectorAll(".unit-card").forEach((btn) => {
    btn.addEventListener("click", () => startSession(container, btn.dataset.unit));
  });
}

async function startSession(container, unitId) {
  container.innerHTML = `<p class="view-subtitle">Loading…</p>`;
  const unit = await loadUnit(unitId);

  const state = {
    unit,
    deck: buildDeck(unit),
    index: 0,
    revealed: false,
    results: { gotIt: 0, stillLearning: 0 },
    phase: "cards", // "cards" | "dialogue" | "complete"
  };

  renderSession(container, state);
}

function renderSession(container, state) {
  if (state.phase === "complete") return renderComplete(container, state);
  if (state.phase === "dialogue") return renderDialogue(container, state);
  return renderCard(container, state);
}

function renderCard(container, state) {
  const card = state.deck[state.index];
  const total = state.deck.length;

  container.innerHTML = `
    <button class="back-link" id="exit-btn">&larr; Back to units</button>
    <div class="learn-progress">
      <div class="learn-progress__track">
        <div class="learn-progress__fill" style="width:${((state.index) / total) * 100}%"></div>
      </div>
      <div class="learn-progress__label">${state.index + 1} / ${total}</div>
    </div>
    <span class="section-tag">${state.unit.title} · ${sectionLabel[card.kind]}</span>

    <div class="flashcard" id="flashcard">
      ${card.pos ? `<span class="flashcard__pos">${card.pos}</span>` : ""}
      ${card.register ? `<span class="flashcard__register">${card.register}</span>` : ""}
      <div class="flashcard__es">${card.es}</div>
      ${state.revealed ? `<div class="flashcard__en">${card.en}</div>` : `<div class="flashcard__hint">Tap to reveal</div>`}
    </div>

    <div class="card-actions">
      <button class="btn btn--still" id="still-btn" ${state.revealed ? "" : "disabled"}>Still learning</button>
      <button class="btn btn--got-it" id="gotit-btn" ${state.revealed ? "" : "disabled"}>Got it</button>
    </div>
  `;

  container.querySelector("#exit-btn").addEventListener("click", () => renderLearn(container));
  container.querySelector("#flashcard").addEventListener("click", () => {
    state.revealed = !state.revealed;
    renderCard(container, state);
  });
  container.querySelector("#still-btn").addEventListener("click", () => advance(container, state, false));
  container.querySelector("#gotit-btn").addEventListener("click", () => advance(container, state, true));
}

function advance(container, state, gotIt) {
  const card = state.deck[state.index];
  recordResult(card.id, gotIt);

  state.results[gotIt ? "gotIt" : "stillLearning"] += 1;
  state.index += 1;
  state.revealed = false;

  if (state.index >= state.deck.length) {
    state.phase = state.unit.dialogue?.length ? "dialogue" : "complete";
  }
  renderSession(container, state);
}

function renderDialogue(container, state) {
  const lines = state.unit.dialogue
    .map(
      (line) => `
      <div class="flashcard__dialogue-speaker">${line.speaker}</div>
      <div class="flashcard__es" style="font-size:1.15rem; margin-bottom:2px;">${line.es}</div>
      <div class="flashcard__en" style="font-size:0.95rem; margin:0 0 20px;">${line.en}</div>
    `
    )
    .join("");

  container.innerHTML = `
    <button class="back-link" id="exit-btn">&larr; Back to units</button>
    <span class="section-tag">${state.unit.title} · Dialogue</span>
    <div class="flashcard flashcard__dialogue" style="cursor:default; align-items:flex-start;">
      ${lines}
    </div>
    <div class="card-actions">
      <button class="btn btn--primary" id="finish-btn">Finish unit</button>
    </div>
  `;

  container.querySelector("#exit-btn").addEventListener("click", () => renderLearn(container));
  container.querySelector("#finish-btn").addEventListener("click", () => {
    state.phase = "complete";
    renderSession(container, state);
  });
}

function renderComplete(container, state) {
  const { gotIt, stillLearning } = state.results;
  container.innerHTML = `
    <div class="complete">
      <h2 class="complete__title">Nicely done.</h2>
      <p class="complete__meta">${state.unit.title} — ${gotIt} felt solid, ${stillLearning} could use another pass.</p>
      <div class="card-actions">
        <button class="btn btn--ghost" id="again-btn">Review again</button>
        <button class="btn btn--primary" id="done-btn">Back to units</button>
      </div>
    </div>
  `;

  container.querySelector("#again-btn").addEventListener("click", () => startSession(container, state.unit.unit));
  container.querySelector("#done-btn").addEventListener("click", () => renderLearn(container));
}
