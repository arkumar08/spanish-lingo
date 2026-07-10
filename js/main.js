import { renderLearn } from "./modes/learn.js";
import { renderPractice } from "./modes/practice.js";
import { renderProgress } from "./modes/progress.js";

const main = document.getElementById("main");
const navlinks = document.querySelectorAll(".navlink");

const stubs = {
  conversation: {
    title: "Conversation",
    body: "Scenario-based chat with Claude is coming once the core review loop is solid.",
  },
};

function renderStub(view) {
  const { title, body } = stubs[view];
  main.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">${title}</h1>
    </div>
    <div class="stub">
      <p class="stub__title">Not built yet</p>
      <p>${body}</p>
    </div>
  `;
}

function setActiveNav(view) {
  navlinks.forEach((btn) => {
    if (btn.dataset.view === view) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });
}

function navigate(view) {
  setActiveNav(view);
  if (view === "learn") {
    renderLearn(main);
  } else if (view === "practice") {
    renderPractice(main);
  } else if (view === "progress") {
    renderProgress(main, () => navigate("practice"));
  } else {
    renderStub(view);
  }
}

navlinks.forEach((btn) => {
  btn.addEventListener("click", () => navigate(btn.dataset.view));
});

navigate("learn");
