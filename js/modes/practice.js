// Practice mode: pulls due cards from the SRS queue (across all units, shared
// with every other mode) and quizzes them as multiple choice, fill-in-the-blank,
// free-typed production, or listening — whichever the user picks per session.

import { loadCardIndex } from "../data.js";
import { getDueCardIds, recordResult } from "../srs.js";
import { speak, speakerButtonHTML, wireSpeakerButton } from "../audio.js";
import { checkAnswer } from "../answerCheck.js";
import { getSettings, updateSetting } from "../settings.js";

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "en", "y", "a", "un", "una",
  "unos", "unas", "es", "son", "se", "con", "por", "para", "su", "sus", "lo",
  "le", "les", "me", "te", "no", "sí", "más", "o", "al", "mi", "mis", "tu",
  "tus", "yo", "tú", "él", "ella", "usted", "nos", "muy", "ya", "pero",
]);

const MODES = [
  { id: "choice", title: "Multiple Choice", desc: "Pick the right translation, or fill a blank. Fast and low-pressure." },
  { id: "production", title: "Production", desc: "See the English, type the Spanish from scratch. No hints." },
  { id: "listening", title: "Listening", desc: "Hear it, type what you heard. Trains your ear, not just your eyes." },
  { id: "mixed", title: "Mixed", desc: "A shuffled blend of all three — the most well-rounded session." },
];

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

function pickQuestionType(card, sessionMode) {
  if (sessionMode === "production") return "production";
  if (sessionMode === "listening") return "listening";
  if (sessionMode === "choice") {
    return card.kind !== "word" && Math.random() < 0.5 ? "blank" : "choice";
  }
  // mixed
  const options = ["choice", "production", "listening"];
  if (card.kind !== "word") options.push("blank");
  return options[Math.floor(Math.random() * options.length)];
}

function buildQuestion(card, allCards, sessionMode) {
  const type = pickQuestionType(card, sessionMode);

  if (type === "blank") {
    const blank = buildFillBlank(card);
    if (blank) return { type: "blank", card, ...blank };
    // fall through to choice if this card has no blankable word
  }
  if (type === "production") return { type: "production", card };
  if (type === "listening") return { type: "listening", card };

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

  renderModeSelect(container, cardIndex, dueIds);
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

function renderModeSelect(container, cardIndex, dueIds) {
  const settings = getSettings();
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Practice</h1>
      <p class="view-subtitle">${dueIds.length} card${dueIds.length === 1 ? "" : "s"} due. How do you want to practice?</p>
    </div>
    <div class="mode-grid" id="mode-grid">
      ${MODES.map(
        (m) => `
        <button class="mode-card" data-mode="${m.id}">
          <h3 class="mode-card__title">${m.title}${m.id === settings.practiceMode ? " ★" : ""}</h3>
          <p class="mode-card__desc">${m.desc}</p>
        </button>
      `
      ).join("")}
    </div>
  `;

  container.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      updateSetting("practiceMode", mode);
      startSession(container, cardIndex, dueIds, mode);
    });
  });
}

function startSession(container, cardIndex, dueIds, sessionMode) {
  const allCards = Array.from(cardIndex.values());
  const queue = shuffle(dueIds).map((id) => cardIndex.get(id));

  const state = {
    queue,
    allCards,
    sessionMode,
    index: 0,
    question: buildQuestion(queue[0], allCards, sessionMode),
    answered: false,
    results: { correct: 0, missed: 0 },
  };

  renderQuestion(container, state);
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

  if (state.question.type === "choice") renderChoiceQuestion(body, actions, container, state);
  else if (state.question.type === "blank") renderBlankQuestion(body, actions, container, state);
  else if (state.question.type === "production") renderProductionQuestion(body, actions, container, state);
  else if (state.question.type === "listening") renderListeningQuestion(body, actions, container, state);
}

function renderChoiceQuestion(body, actions, container, state) {
  const { card, choices } = state.question;

  body.innerHTML = `
    <div class="flashcard" style="cursor:default; align-items:stretch; gap:16px;">
      <div class="flashcard__head">
        <div class="flashcard__es" style="font-size:1.5rem;">${card.es}</div>
        ${speakerButtonHTML("q")}
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
        ${choices
          .map(
            (c) => `<button class="btn btn--ghost" style="text-align:left;" data-choice="${c.id}">${c.text}</button>`
          )
          .join("")}
      </div>
    </div>
  `;

  wireSpeakerButton(container, "q", card.es);

  body.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.answered) return;
      const choiceId = btn.dataset.choice;
      const correct = choiceId === card.id;
      state.answered = true;
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
      <div class="flashcard__head" style="justify-content:space-between;">
        <div class="flashcard__en" style="margin-top:0; font-size:1rem;">${card.en}</div>
        ${speakerButtonHTML("q")}
      </div>
      <div class="flashcard__es" style="font-size:1.35rem;">${blanked}</div>
      <input
        type="text"
        id="blank-input"
        class="type-answer"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Type the missing word"
        style="margin-top:18px;"
      />
      <p id="blank-feedback" style="min-height:20px; margin:8px 0 0; font-size:0.9rem;"></p>
    </div>
  `;

  wireSpeakerButton(container, "q", card.es);

  const input = body.querySelector("#blank-input");
  input.focus();

  actions.innerHTML = `<button class="btn btn--primary" id="check-btn">Check</button>`;

  const check = () => {
    if (state.answered) return;
    const typed = stripPunctuation(input.value.trim()).toLowerCase();
    const correct = typed.length > 0 && typed === answer.toLowerCase();
    state.answered = true;
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

function renderProductionQuestion(body, actions, container, state) {
  const { card } = state.question;

  body.innerHTML = `
    <div class="flashcard" style="cursor:default; align-items:stretch; gap:16px;">
      <div class="flashcard__en" style="margin-top:0; font-size:1.3rem; text-align:center;">${card.en}</div>
      <input
        type="text"
        id="type-input"
        class="type-answer"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Type it in Spanish"
      />
      <div id="answer-feedback"></div>
    </div>
  `;

  wireTypedAnswer(body, actions, container, state, card.es, { revealEn: false });
}

function renderListeningQuestion(body, actions, container, state) {
  const { card } = state.question;

  body.innerHTML = `
    <div class="flashcard" style="cursor:default; align-items:stretch; gap:16px;">
      <div class="listening-prompt">
        ${speakerButtonHTML("listen")}
        <p class="view-subtitle" style="margin:0;">Tap to listen, then type what you heard</p>
      </div>
      <input
        type="text"
        id="type-input"
        class="type-answer"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Type what you heard"
      />
      <div id="answer-feedback"></div>
    </div>
  `;

  wireSpeakerButton(container, "listen", card.es);
  speak(card.es); // auto-play once when the question first appears

  wireTypedAnswer(body, actions, container, state, card.es, { revealEn: true });
}

function wireTypedAnswer(body, actions, container, state, correctEs, opts) {
  const card = state.question.card;
  const input = body.querySelector("#type-input");
  const feedback = body.querySelector("#answer-feedback");
  input.focus();

  actions.innerHTML = `<button class="btn btn--primary" id="check-btn">Check</button>`;

  const finish = (correct) => {
    state.answered = true;
    recordResult(card.id, correct);
    renderContinue(actions, container, state, correct);
  };

  const showCanonical = (headline) => {
    feedback.innerHTML = `
      ${headline ? `<p style="margin:0 0 4px; font-size:0.9rem; color:${headline.color};">${headline.text}</p>` : ""}
      <div class="canonical-answer">
        <p class="canonical-answer__label">${opts.revealEn ? "Spanish & English" : "Correct form"}</p>
        <div class="flashcard__head" style="justify-content:flex-start;">
          <div class="flashcard__es" style="font-size:1.2rem;">${correctEs}</div>
          ${speakerButtonHTML("canonical")}
        </div>
        ${opts.revealEn ? `<div class="flashcard__en" style="margin-top:6px;">${card.en}</div>` : ""}
      </div>
    `;
    wireSpeakerButton(container, "canonical", correctEs);
  };

  const check = () => {
    if (state.answered) return;
    const typed = input.value;
    input.disabled = true;
    const { verdict } = checkAnswer(typed, correctEs);

    if (verdict === "exact" || verdict === "close") {
      showCanonical({ text: "Correct.", color: "var(--success-soft-ink)" });
      finish(true);
      return;
    }

    showCanonical({ text: "Not quite.", color: "var(--caution-soft-ink)" });
    feedback.insertAdjacentHTML(
      "beforeend",
      `
      <p class="self-grade-prompt">How close were you?</p>
      <div class="card-actions" style="margin-top:0;">
        <button class="btn btn--still" id="self-miss">I didn't know this</button>
        <button class="btn btn--got-it" id="self-close">I basically had it</button>
      </div>
    `
    );
    actions.innerHTML = "";

    const missBtn = body.querySelector("#self-miss");
    const closeBtn = body.querySelector("#self-close");
    const lockIn = (chosenBtn) => {
      [missBtn, closeBtn].forEach((b) => (b.style.pointerEvents = "none"));
      chosenBtn.style.outline = `2px solid var(--accent)`;
    };
    missBtn.addEventListener("click", () => {
      lockIn(missBtn);
      finish(false);
    });
    closeBtn.addEventListener("click", () => {
      lockIn(closeBtn);
      finish(true);
    });
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
  state.question = buildQuestion(state.queue[state.index], state.allCards, state.sessionMode);
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
