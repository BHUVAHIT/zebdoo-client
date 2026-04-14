const DEV_ONLY = import.meta.env?.DEV;
const STORE_KEY = "__zebdooRenderProfile";
const TOOLS_FLAG_KEY = "__zebdooRenderProfileToolsInstalled";
const DEFAULT_THRESHOLD_MS = 10;

const getStore = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window[STORE_KEY];
  if (existing && typeof existing === "object") {
    return existing;
  }

  const initial = {};
  window[STORE_KEY] = initial;
  return initial;
};

const formatMs = (value) => `${Number(value || 0).toFixed(2)}ms`;

export const shouldEnableRenderProfiling = () => DEV_ONLY;

export const profileRenderCommit = ({
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  thresholdMs = DEFAULT_THRESHOLD_MS,
}) => {
  if (!DEV_ONLY) {
    return;
  }

  const store = getStore();
  if (!store) {
    return;
  }

  const key = String(id || "unknown");
  const current = store[key] || {
    count: 0,
    totalActualDuration: 0,
    maxActualDuration: 0,
    lastActualDuration: 0,
    lastBaseDuration: 0,
    lastPhase: "",
    lastCommitTime: 0,
  };

  current.count += 1;
  current.totalActualDuration += Number(actualDuration || 0);
  current.maxActualDuration = Math.max(current.maxActualDuration, Number(actualDuration || 0));
  current.lastActualDuration = Number(actualDuration || 0);
  current.lastBaseDuration = Number(baseDuration || 0);
  current.lastPhase = String(phase || "");
  current.lastCommitTime = Number(commitTime || Date.now());
  store[key] = current;

  if (Number(actualDuration || 0) < thresholdMs) {
    return;
  }

  // Dev-only hotspot signal for profiling and targeted optimization work.
  console.info(
    `[render-profiler] ${key} ${phase} actual=${formatMs(actualDuration)} base=${formatMs(
      baseDuration
    )} start=${formatMs(startTime)} commit=${formatMs(commitTime)}`
  );
};

export const createRenderProfilerHandler = (id, thresholdMs = DEFAULT_THRESHOLD_MS) =>
  (profilerId, phase, actualDuration, baseDuration, startTime, commitTime) => {
    profileRenderCommit({
      id: id || profilerId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      thresholdMs,
    });
  };

const toNumber = (value) => Number(value || 0);

export const getRenderProfileSnapshot = () => {
  const store = getStore() || {};

  const components = Object.entries(store)
    .map(([id, metrics]) => {
      const count = toNumber(metrics.count);
      const totalActualDuration = toNumber(metrics.totalActualDuration);
      const maxActualDuration = toNumber(metrics.maxActualDuration);

      return {
        id,
        count,
        avgActualDuration: count > 0 ? totalActualDuration / count : 0,
        totalActualDuration,
        maxActualDuration,
        lastActualDuration: toNumber(metrics.lastActualDuration),
        lastBaseDuration: toNumber(metrics.lastBaseDuration),
        lastPhase: String(metrics.lastPhase || ""),
        lastCommitTime: toNumber(metrics.lastCommitTime),
      };
    })
    .sort((left, right) => right.avgActualDuration - left.avgActualDuration);

  return {
    generatedAt: Date.now(),
    componentCount: components.length,
    components,
  };
};

export const installRenderProfilerDebugTools = () => {
  if (!DEV_ONLY || typeof window === "undefined") {
    return;
  }

  if (window[TOOLS_FLAG_KEY]) {
    return;
  }

  window.__zebdooRenderProfileSnapshot = () => getRenderProfileSnapshot();
  window.__zebdooResetRenderProfile = () => {
    window[STORE_KEY] = {};
    return true;
  };
  window.__zebdooPrintRenderProfile = (limit = 20) => {
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(Number(limit), 1) : 20;
    const snapshot = getRenderProfileSnapshot();

    console.table(
      snapshot.components.slice(0, normalizedLimit).map((item) => ({
        id: item.id,
        count: item.count,
        avgActualDurationMs: Number(item.avgActualDuration.toFixed(2)),
        maxActualDurationMs: Number(item.maxActualDuration.toFixed(2)),
        lastActualDurationMs: Number(item.lastActualDuration.toFixed(2)),
        lastPhase: item.lastPhase,
      }))
    );

    return snapshot;
  };

  window[TOOLS_FLAG_KEY] = true;
  console.info(
    "[render-profiler] debug helpers ready: __zebdooPrintRenderProfile(limit), __zebdooRenderProfileSnapshot(), __zebdooResetRenderProfile()"
  );
};
