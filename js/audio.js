// Spanish text-to-speech via the browser's native Web Speech API.
// No API key, no account, works offline once the page (and voice list) has loaded.

let voicesPromise = null;
let cachedVoice; // undefined = not checked yet, null = checked and none found

function supported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function loadVoices() {
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    if (!supported()) return resolve([]);
    const existing = speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    // Voice lists load asynchronously on first page visit in most browsers.
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    // Some browsers (older mobile Safari) never fire voiceschanged reliably.
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
  });
  return voicesPromise;
}

async function getSpanishVoice() {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = await loadVoices();
  const latAm = voices.find((v) => /^es-(419|MX|US|AR|CO|CL|PE)/i.test(v.lang));
  const spain = voices.find((v) => /^es-ES/i.test(v.lang));
  const anySpanish = voices.find((v) => v.lang.toLowerCase().startsWith("es"));
  cachedVoice = latAm || spain || anySpanish || null;
  return cachedVoice;
}

/** Call once at startup so the first speaker-icon click doesn't pay the voice-load latency. */
export function preloadVoices() {
  loadVoices();
}

/** Resolves true if speechSynthesis exists AND a Spanish voice is installed on this device. */
export async function isAudioAvailable() {
  if (!supported()) return false;
  return Boolean(await getSpanishVoice());
}

/**
 * Speak Spanish text aloud. Resolves true if an utterance was dispatched,
 * false if speech synthesis (or a Spanish voice) isn't available here.
 */
export async function speak(text) {
  if (!supported()) return false;
  const voice = await getSpanishVoice();
  if (!voice) return false;

  speechSynthesis.cancel(); // stop whatever's currently playing/queued
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.95;
  speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel();
}

const SPEAKER_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9"></polygon><path d="M16 8a5 5 0 0 1 0 8"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>`;

/** Markup for a speaker icon button. Give each one on a page a unique `key` for wiring. */
export function speakerButtonHTML(key, extraClass = "") {
  return `<button class="speaker-btn ${extraClass}" data-speaker-key="${key}" type="button" aria-label="Play pronunciation">${SPEAKER_ICON}</button>`;
}

/**
 * Finds a speaker button by its key within `container` and wires it to speak `text`.
 * Disables + dims the button (with a title explaining why) if no Spanish voice is available.
 */
export async function wireSpeakerButton(container, key, text) {
  const btn = container.querySelector(`[data-speaker-key="${key}"]`);
  if (!btn) return;

  const available = await isAudioAvailable();
  if (!available) {
    btn.disabled = true;
    btn.classList.add("speaker-btn--unavailable");
    btn.title = "No Spanish voice found on this device";
    return;
  }

  btn.addEventListener("click", () => {
    btn.classList.add("speaker-btn--playing");
    speak(text);
    setTimeout(() => btn.classList.remove("speaker-btn--playing"), 600);
  });
}
