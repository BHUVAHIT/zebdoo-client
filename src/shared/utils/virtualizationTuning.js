const DEFAULT_DEVICE_TIER = "medium";
const DEV_ONLY = import.meta.env?.DEV;
const PRESET_QUERY_PARAM = "virtualPreset";

const TABLE_TUNING_BY_TIER = {
  low: {
    threshold: 84,
    overscan: 6,
    estimatedItemHeight: 56,
    defaultViewportHeight: 540,
  },
  medium: {
    threshold: 120,
    overscan: 8,
    estimatedItemHeight: 56,
    defaultViewportHeight: 620,
  },
  high: {
    threshold: 168,
    overscan: 10,
    estimatedItemHeight: 56,
    defaultViewportHeight: 720,
  },
};

const THREAD_TUNING_BY_TIER = {
  low: {
    threshold: 72,
    overscan: 4,
    estimatedItemHeight: 220,
    defaultViewportHeight: 560,
  },
  medium: {
    threshold: 120,
    overscan: 6,
    estimatedItemHeight: 210,
    defaultViewportHeight: 760,
  },
  high: {
    threshold: 160,
    overscan: 8,
    estimatedItemHeight: 200,
    defaultViewportHeight: 860,
  },
};

const PRESET_ALIASES = Object.freeze({
  "android-low": "android-low",
  "low-android": "android-low",
  "laptop-mid": "laptop-mid",
  "mid-laptop": "laptop-mid",
  "desktop-high": "desktop-high",
  "high-desktop": "desktop-high",
});

const PRESET_OVERRIDES = Object.freeze({
  "android-low": {
    tier: "low",
    table: {
      threshold: 72,
      overscan: 4,
      defaultViewportHeight: 500,
    },
    thread: {
      threshold: 60,
      overscan: 3,
      defaultViewportHeight: 520,
    },
  },
  "laptop-mid": {
    tier: "medium",
    table: {
      threshold: 128,
      overscan: 8,
      defaultViewportHeight: 640,
    },
    thread: {
      threshold: 128,
      overscan: 6,
      defaultViewportHeight: 780,
    },
  },
  "desktop-high": {
    tier: "high",
    table: {
      threshold: 192,
      overscan: 12,
      defaultViewportHeight: 760,
    },
    thread: {
      threshold: 176,
      overscan: 9,
      defaultViewportHeight: 900,
    },
  },
});

const normalizeTier = (value) => {
  const next = String(value || "").toLowerCase().trim();
  if (next === "low" || next === "medium" || next === "high") {
    return next;
  }

  return DEFAULT_DEVICE_TIER;
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePreset = (value) => {
  const key = String(value || "").toLowerCase().trim();
  return PRESET_ALIASES[key] || null;
};

const getQueryParams = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return new URL(window.location.href).searchParams;
  } catch {
    return null;
  }
};

const getOverrideTier = (scope) => {
  const params = getQueryParams();
  if (!params) return null;

  const scopedTier = params.get(`${scope}VirtualTier`);
  const genericTier = params.get("virtualTier");
  const candidate = scopedTier || genericTier;
  return candidate ? normalizeTier(candidate) : null;
};

const getPresetOverride = (scope) => {
  const params = getQueryParams();
  if (!params) {
    return null;
  }

  const presetName = normalizePreset(params.get(PRESET_QUERY_PARAM));
  if (!presetName) {
    return null;
  }

  const preset = PRESET_OVERRIDES[presetName];
  if (!preset) {
    return null;
  }

  const scoped = scope === "thread" ? preset.thread : preset.table;
  if (!scoped) {
    return null;
  }

  return {
    name: presetName,
    tier: preset.tier,
    threshold: scoped.threshold,
    overscan: scoped.overscan,
    defaultViewportHeight: scoped.defaultViewportHeight,
  };
};

const resolveOverrideValue = (scope, key) => {
  const params = getQueryParams();
  if (!params) return null;

  const scoped = params.get(`${scope}Virtual${key}`);
  if (scoped != null && scoped !== "") {
    return scoped;
  }

  const generic = params.get(`virtual${key}`);
  if (generic != null && generic !== "") {
    return generic;
  }

  return null;
};

export const detectDeviceTier = () => {
  if (typeof navigator === "undefined") {
    return DEFAULT_DEVICE_TIER;
  }

  const cpuCores = Number(navigator.hardwareConcurrency || 0);
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const hasCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  if (cpuCores > 0 && cpuCores <= 4) {
    return "low";
  }

  if (deviceMemory > 0 && deviceMemory <= 4) {
    return "low";
  }

  if (hasCoarsePointer && (cpuCores > 0 ? cpuCores <= 6 : true)) {
    return "low";
  }

  if (cpuCores >= 10 && deviceMemory >= 8) {
    return "high";
  }

  return DEFAULT_DEVICE_TIER;
};

export const resolveVirtualizationTuning = ({ scope, syntheticLoadEnabled = false } = {}) => {
  const normalizedScope = scope === "thread" ? "thread" : "table";
  const baseByTier =
    normalizedScope === "thread" ? THREAD_TUNING_BY_TIER : TABLE_TUNING_BY_TIER;

  const thresholdOverrideRaw = resolveOverrideValue(normalizedScope, "Threshold");
  const overscanOverrideRaw = resolveOverrideValue(normalizedScope, "Overscan");
  const viewportOverrideRaw = resolveOverrideValue(normalizedScope, "Viewport");
  const presetOverride = getPresetOverride(normalizedScope);

  const defaultTier = detectDeviceTier();
  const selectedTier =
    getOverrideTier(normalizedScope) ||
    normalizeTier(presetOverride?.tier) ||
    defaultTier;
  const base = baseByTier[selectedTier] || baseByTier[DEFAULT_DEVICE_TIER];

  const defaultThreshold =
    presetOverride?.threshold ||
    (syntheticLoadEnabled
      ? Math.min(base.threshold, normalizedScope === "thread" ? 84 : 96)
      : base.threshold);

  const threshold = parsePositiveInteger(
    thresholdOverrideRaw,
    defaultThreshold
  );

  const overscan = parsePositiveInteger(
    overscanOverrideRaw,
    presetOverride?.overscan || base.overscan
  );

  const defaultViewportHeight = parsePositiveInteger(
    viewportOverrideRaw,
    presetOverride?.defaultViewportHeight || base.defaultViewportHeight
  );

  return {
    tier: selectedTier,
    preset: presetOverride?.name || "auto",
    threshold,
    overscan,
    estimatedItemHeight: base.estimatedItemHeight,
    defaultViewportHeight,
  };
};

export const logVirtualizationTuning = ({ scope, config, enabled }) => {
  if (!DEV_ONLY || !enabled || !config) {
    return;
  }

  console.info(
    `[virtualization] ${scope} preset=${config.preset} tier=${config.tier} threshold=${config.threshold} overscan=${config.overscan} viewport=${config.defaultViewportHeight}`
  );
};
