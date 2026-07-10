// Lenient answer checking for free-typed Spanish input (production + listening modes).
// Case-insensitive, accent-insensitive, and tolerant of 1-2 character typos —
// this is meant to test recall of the actual word, not typing precision.

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "") // strip accents/diacritics
    .replace(/[¿¡?!.,;:"'']/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Compares typed input against the correct answer.
 * Returns { verdict: "exact" | "close" | "wrong" | "empty", distance }.
 * "exact" and "close" both count as a correct answer for SRS purposes —
 * "close" just means it slipped through via accent/case/typo leniency.
 */
export function checkAnswer(typed, correct) {
  const normTyped = normalize(typed);
  const normCorrect = normalize(correct);

  if (!normTyped) return { verdict: "empty", distance: null };
  if (normTyped === normCorrect) return { verdict: "exact", distance: 0 };

  const distance = levenshtein(normTyped, normCorrect);
  const tolerance = normCorrect.length < 5 ? 1 : 2;

  return { verdict: distance <= tolerance ? "close" : "wrong", distance };
}
