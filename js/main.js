import { renderLearn } from "./modes/learn.js";
import { renderPractice } from "./modes/practice.js";
import { renderProgress } from "./modes/progress.js";
import { preloadVoices } from "./audio.js";
import { getSettings, updateSetting } from "./settings.js";

preloadVoices(); // warm the voice list early so the first speaker click isn't slow

const main = document.getElementById("main");
const navlinks = document.querySelectorAll(".navlink");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanelRoot = document.getElementById("settings-panel-root");

function renderSettingsPanel() {
  const settings = getSettings();
  settingsPanelRoot.innerHTML = `
    <div class="settings-panel">
      <p class="settings-panel__title">Settings</p>
      <div class="settings-row">
        <div>
          <div class="settings-row__label">Auto-play audio in Learn</div>
          <p class="settings-row__hint">Plays each card's pronunciation when it first appears.</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="autoplay-toggle" ${settings.autoPlayAudio ? "checked" : ""} />
          <span class="switch__track"></span>
        </label>
      </div>
    </div>
  `;
  settingsPanelRoot.querySelector("#autoplay-toggle").addEventListener("change", (e) => {
    updateSetting("autoPlayAudio", e.target.checked);
  });
}

let settingsOpen = false;
settingsToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsOpen = !settingsOpen;
  if (settingsOpen) renderSettingsPanel();
  else settingsPanelRoot.innerHTML = "";
});
document.addEventListener("click", (e) => {
  if (settingsOpen && !settingsPanelRoot.contains(e.target) && e.target !== settingsToggle) {
    settingsOpen = false;
    settingsPanelRoot.innerHTML = "";
  }
});

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
