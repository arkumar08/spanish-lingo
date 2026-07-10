// App-wide user preferences, persisted in localStorage.

const STORAGE_KEY = "estudio.settings.v1";

const defaults = {
  autoPlayAudio: true,
  practiceMode: "mixed", // "choice" | "production" | "listening" | "mixed"
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function save(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getSettings() {
  return load();
}

export function updateSetting(key, value) {
  const settings = load();
  settings[key] = value;
  save(settings);
  return settings;
}
