const DEFAULT_PREFIX = "SUB";
const DEFAULT_MIN_DIGITS = 3;

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSequenceMatcher = (prefix) =>
  new RegExp(`^${escapeRegex(prefix)}[-_\\s]?(\\d+)$`, "i");

const toSequence = (code, matcher) => {
  const normalized = normalizeCode(code);
  const match = normalized.match(matcher);
  if (!match) return null;

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toCodeFromSequence = (sequence, { prefix, minDigits }) => {
  const normalizedPrefix = normalizeCode(prefix) || DEFAULT_PREFIX;
  const width = Math.max(Number(minDigits) || DEFAULT_MIN_DIGITS, DEFAULT_MIN_DIGITS);
  return `${normalizedPrefix}-${String(sequence).padStart(width, "0")}`;
};

export const generateUniqueSubjectCode = (
  subjects = [],
  { requestedCode, prefix = DEFAULT_PREFIX, minDigits = DEFAULT_MIN_DIGITS } = {}
) => {
  const normalizedPrefix = normalizeCode(prefix) || DEFAULT_PREFIX;
  const normalizedSubjects = Array.isArray(subjects) ? subjects : [];
  const usedCodes = new Set(
    normalizedSubjects.map((item) => normalizeCode(item?.code)).filter(Boolean)
  );

  const requested = normalizeCode(requestedCode);
  if (requested && !usedCodes.has(requested)) {
    return requested;
  }

  const matcher = buildSequenceMatcher(normalizedPrefix);
  let maxSequence = 0;

  normalizedSubjects.forEach((item) => {
    const sequence = toSequence(item?.code, matcher);
    if (sequence && sequence > maxSequence) {
      maxSequence = sequence;
    }
  });

  let nextSequence = maxSequence + 1;
  let candidate = toCodeFromSequence(nextSequence, {
    prefix: normalizedPrefix,
    minDigits,
  });

  while (usedCodes.has(candidate)) {
    nextSequence += 1;
    candidate = toCodeFromSequence(nextSequence, {
      prefix: normalizedPrefix,
      minDigits,
    });
  }

  return candidate;
};
