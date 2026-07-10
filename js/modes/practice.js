// Practice mode: pulls due cards from the SRS queue (across all units) and
// quizzes them as multiple choice or fill-in-the-blank. Distractors are drawn
// from the same unit/kind so wrong options stay plausible.

import { loadCardIndex } from "../data.js";
import { getDueCardIds, recordResult } from "../srs.js";

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "en", "y", "a", "un", "una",
  "unos", "unas", "es", "son", "se", "con", "por", "para", "su", "sus", "lo",
  "le", "les", "me", "te", "no", "sí", "más", "o", "al", "mi", "mis", "tu",
  "tus", "yo", "tú", "él", "ella", "usted", "nos", "muy", "ya", "pero",
]);

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function stripPunctuation(word) {
  return word.replace(/^[¿¡"'«]+|[»"'.,;:!?]+$/g, "");
}

function buildFillBlank(card) {
  const tokens = card.es.split(/\s+/);
  if (tokens.length < 2) return null; // nothing left of the sentence once blanked

  const eligible = tokens
    .map((raw, i) => ({ i, word: stripPunctuation(raw) }))
    .filter(({ word }) => word.length > 3 && !STOPWORDS.has(word.toLowerCase()));

  if (!eligible.length) return null;

  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  const blankedTokens = [...tokens];
  blankedTokens[pick.i] = "_____";

  return { blanked: blankedTokens.join(" "), answer: pick.word };
}

function buildMultipleChoice(card, allCards) {
  const others = allCards.filter((c) => c.id !== card.id);
  let pool = others.filter((c) => c.kind === card.kind && c.unit === card.unit);
  if (pool.length < 3) pool = others.filter((c) => c.kind === card.kind);
  if (pool.length < 3) pool = others;

  const distractors = shuffle(pool).slice(0, 3);
  const choices = shuffle([card, ...distractors]).map((c) => ({ id: c.id, text: c.en }));
  return { choices };
}

function buildQuestion(card, allCards) {
  const canBlank = card.kind !== "word";
  const useBlank = canBlank && Math.random() < 0.5;
  if (useBlank) {
    const blank = buildFillBlank(card);
    if (blank) return { type: "blank", card, ...blank };
  }
  const mc = buildMultipleChoice(card, allCards);
  return { type: "choice", card, ...mc };
}

export async function renderPractice(container) {
  container.innerHTML = `<p class="view-subtitle">Loading…</p>`;

  const cardIndex = await loadCardIndex();
  const dueIds = getDueCardIds().filter((id) => cardIndex.has(id));

  if (dueIds.length === 0) {
    renderEmpty(container, cardIndex.size > 0);
    return;
  }

  const allCards = Array.from(cardIndex.values());
  const queue = shuffle(dueIds).map((id) => cardIndex.get(id));

  const state = {
    queue,
    allCards,
    index: 0,
    question: buildQuestion(queue[0], allCards),
    answered: false,
    selectedChoiceId: null,
    typedValue: "",
    lastCorrect: null,
    results: { correct: 0, missed: 0 },
  };

  renderQuestion(container, state);
}

function renderEmpty(container, hasAnyTracked) {
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Practice</h1>
    </div>
    <div class="stub">
      <p class="stub__title">Nothing due right now</p>
      <p>${
        hasAnyTracked
          ? "You're caught up — come back later and the next batch will be ready."
          : "Review a unit in Learn first; cards show up here once they're due for practice."
      }</p>
    </div>
  `;
}

function renderQuestion(container, state) {
  const total = state.queue.length;
  const card = state.question.card;

  container.innerHTML = `
    <div class="learn-progress">
      <div class="learn-progress__track">
        <div class="learn-progress__fill" style="width:${(state.index / total) * 100}%"></div>
      </div>
      <div class="learn-progress__label">${state.index + 1} / ${total}</div>
    </div>
    <span class="section-tag">${card.unitTitle} · Practice</span>
    <div id="question-body"></div>
    <div id="question-actions" class="card-actions"></div>
  `;

  const body = container.querySelector("#question-body");
  const actions = container.querySelector("#question-actions");

  if (state.question.type === "choice") {
    renderChoiceQuestion(body, actions, container, state);
  } else {
    renderBlankQuestion(body, actions, container, state);
  }
}

function renderChoiceQuestion(body, actions, container, state) {
  const { card, choices } = state.question;

  body.innerHTML = `
    <div class="flashcard" style="cursor:default; align-items:stretch; gap:16px;">
      <div class="flashcard__es" style="font-size:1.5rem;">${card.es}</div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
        ${choices
          .map(
            (c) => `<button class="btn btn--ghost" style="text-align:left;" data-choice="${c.id}">${c.text}</button>`
          )
          .join("")}
      </div>
    </div>
  `;

  body.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.answered) return;
      const choiceId = btn.dataset.choice;
      const correct = choiceId === card.id;
      state.answered = true;
      state.lastCorrect = correct;
      recordResult(card.id, correct);

      body.querySelectorAll("[data-choice]").forEach((b) => {
        if (b.dataset.choice === card.id) {
          b.classList.remove("btn--ghost");
          b.classList.add("btn--got-it");
        } else if (b.dataset.choice === choiceId) {
          b.classList.remove("btn--ghost");
          b.classList.add("btn--still");
        }
        b.style.pointerEvents = "none";
      });

      renderContinue(actions, container, state, correct);
    });
  });

  actions.innerHTML = "";
}

function renderBlankQuestion(body, actions, container, state) {
  const { card, blanked, answer } = state.question;

  body.innerHTML = `
    <div class="flashcard" style="cursor:default; align-items:stretch; gap:16px;">
      <div class="flashcard__en" style="margin-top:0; font-size:1rem;">${card.en}</div>
      <div class="flashcard__es" style="font-size:1.35rem;">${blanked}</div>
      <input
        type="text"
        id="blank-input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Type the missing word"
        style="margin-top:18px; padding:12px 14px; border-radius:12px; border:1px solid var(--border); font-size:1rem; font-family:inherit;"
      />
      <p id="blank-feedback" style="min-height:20px; margin:8px 0 0; font-size:0.9rem;"></p>
    </div>
  `;

  const input = body.querySelector("#blank-input");
  input.focus();

  actions.innerHTML = `<button class="btn btn--primary" id="check-btn">Check</button>`;

  const check = () => {
    if (state.answered) return;
    const typed = stripPunctuation(input.value.trim()).toLowerCase();
    const correct = typed.length > 0 && typed === answer.toLowerCase();
    state.answered = true;
    state.lastCorrect = correct;
    recordResult(card.id, correct);

    const feedback = body.querySelector("#blank-feedback");
    input.disabled = true;
    if (correct) {
      feedback.textContent = "Correct.";
      feedback.style.color = "var(--success-soft-ink)";
    } else {
      feedback.textContent = `Correct answer: ${answer}`;
      feedback.style.color = "var(--caution-soft-ink)";
    }

    renderContinue(actions, container, state, correct);
  };

  actions.querySelector("#check-btn").addEventListener("click", check);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") check();
  });
}

function renderContinue(actions, container, state, correct) {
  state.results[correct ? "correct" : "missed"] += 1;
  actions.innerHTML = `<button class="btn btn--primary" id="continue-btn">Continue</button>`;
  actions.querySelector("#continue-btn").addEventListener("click", () => nextQuestion(container, state));
}

function nextQuestion(container, state) {
  state.index += 1;
  if (state.index >= state.queue.length) {
    renderSessionComplete(container, state);
    return;
  }
  state.question = buildQuestion(state.queue[state.index], state.allCards);
  state.answered = false;
  renderQuestion(container, state);
}

function renderSessionComplete(container, state) {
  const { correct, missed } = state.results;
  container.innerHTML = `
    <div class="complete">
      <h2 class="complete__title">Session complete.</h2>
      <p class="complete__meta">${correct} correct, ${missed} to revisit — they'll come back around sooner.</p>
      <div class="card-actions">
        <button class="btn btn--primary" id="done-btn">Done</button>
      </div>
    </div>
  `;
  container.querySelector("#done-btn").addEventListener("click", () => renderPractice(container));
}
