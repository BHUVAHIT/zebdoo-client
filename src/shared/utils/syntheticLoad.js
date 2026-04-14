const DEV_ONLY = import.meta.env?.DEV;
const SYNTHETIC_QUERY_PARAM = "syntheticLoad";
const SYNTHETIC_TARGET_COUNT = 10000;

const deepClone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const getSyntheticFlagFromLocation = () => {
  if (typeof window === "undefined") return false;

  try {
    const url = new URL(window.location.href);
    const raw = String(url.searchParams.get(SYNTHETIC_QUERY_PARAM) || "").toLowerCase();
    return raw === "1" || raw === "true" || raw === "on";
  } catch {
    return false;
  }
};

export const isSyntheticLoadEnabled = () => DEV_ONLY && getSyntheticFlagFromLocation();

const toSuffix = (cycleIndex, originalIndex) => `${cycleIndex + 1}-${originalIndex + 1}`;

const normalizeId = (value, fallback) => {
  const next = String(value || "").trim();
  return next || fallback;
};

const buildSyntheticMessage = (message, suffix) => {
  const base = deepClone(message) || {};

  const mapNode = (node, pathSuffix) => {
    const next = deepClone(node) || {};
    const nodeId = normalizeId(next.id, `msg-${pathSuffix}`);

    const mappedReplies = Array.isArray(next.replies)
      ? next.replies.map((reply, index) => mapNode(reply, `${pathSuffix}-r${index + 1}`))
      : [];

    return {
      ...next,
      id: `${nodeId}::synthetic-${pathSuffix}`,
      author: next.author
        ? {
            ...next.author,
            id: normalizeId(next.author.id, `author-${pathSuffix}`),
          }
        : next.author,
      replies: mappedReplies,
    };
  };

  return mapNode(base, suffix);
};

const buildSyntheticRow = (row, rowKey, suffix) => {
  const base = deepClone(row) || {};
  const key = normalizeId(base[rowKey], `row-${suffix}`);

  return {
    ...base,
    [rowKey]: `${key}::synthetic-${suffix}`,
  };
};

const expandByCycles = (sourceRows, targetCount, factory) => {
  if (!Array.isArray(sourceRows) || sourceRows.length === 0) {
    return [];
  }

  const source = sourceRows.slice(0, Math.min(sourceRows.length, 240));
  const totalTarget = Math.max(targetCount, source.length);
  const cycles = Math.ceil(totalTarget / source.length);
  const expanded = [];

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (let index = 0; index < source.length; index += 1) {
      expanded.push(factory(source[index], toSuffix(cycle, index)));
      if (expanded.length >= totalTarget) {
        return expanded;
      }
    }
  }

  return expanded;
};

export const expandRowsForSyntheticLoad = (
  rows,
  { targetCount = SYNTHETIC_TARGET_COUNT, rowKey = "id" } = {}
) => {
  if (!isSyntheticLoadEnabled()) {
    return rows;
  }

  return expandByCycles(rows, targetCount, (row, suffix) =>
    buildSyntheticRow(row, rowKey, suffix)
  );
};

export const expandMessagesForSyntheticLoad = (
  messages,
  { targetCount = SYNTHETIC_TARGET_COUNT } = {}
) => {
  if (!isSyntheticLoadEnabled()) {
    return messages;
  }

  return expandByCycles(messages, targetCount, (message, suffix) =>
    buildSyntheticMessage(message, suffix)
  );
};
