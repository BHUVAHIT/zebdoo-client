import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAbortError, toApiError } from "../../../services/apiClient";
import { APP_ENV } from "../../../config/env";
import { setCatalogResourceStatus } from "../../../store/catalogStore";

const DEFAULT_QUERY = Object.freeze({
  page: 1,
  pageSize: APP_ENV.defaultPageSize,
  search: "",
  sortBy: "createdAt",
  sortDir: "desc",
});

export const useCrudResource = ({
  list,
  create,
  update,
  remove,
  resourceKey,
  initialQuery,
  externalFilters,
}) => {
  const [query, setQuery] = useState({
    ...DEFAULT_QUERY,
    ...(initialQuery || {}),
  });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const activeListRequestRef = useRef(null);
  const hasResolvedOnceRef = useRef(false);
  const isMountedRef = useRef(true);

  const externalFiltersKey = JSON.stringify(externalFilters || {});
  const effectiveFilters = useMemo(
    () => JSON.parse(externalFiltersKey),
    [externalFiltersKey]
  );

  const publishStatus = useCallback(
    (patch) => {
      if (!resourceKey) return;
      setCatalogResourceStatus(resourceKey, patch);
    },
    [resourceKey]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeListRequestRef.current?.abort();
    };
  }, []);

  const loadItems = useCallback(async ({ showSkeleton = false } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    activeListRequestRef.current?.abort();
    const controller = new AbortController();
    activeListRequestRef.current = controller;

    if (showSkeleton || !hasResolvedOnceRef.current) {
      setLoading(true);
      setIsFetching(false);
      publishStatus({ isLoading: true, isFetching: false, error: "" });
    } else {
      setIsFetching(true);
      publishStatus({ isLoading: false, isFetching: true, error: "" });
    }

    setError("");

    try {
      const response = await list({
        ...query,
        ...effectiveFilters,
      }, {
        signal: controller.signal,
      });

      if (controller.signal.aborted || requestIdRef.current !== requestId || !isMountedRef.current) {
        return;
      }

      setItems(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      hasResolvedOnceRef.current = true;
      publishStatus({ isLoading: false, isFetching: false, error: "" });
    } catch (requestError) {
      if (
        controller.signal.aborted ||
        requestIdRef.current !== requestId ||
        !isMountedRef.current ||
        isAbortError(requestError)
      ) {
        return;
      }

      const message = toApiError(requestError).message;
      setError(message);
      publishStatus({ isLoading: false, isFetching: false, error: message });
    } finally {
      if (requestIdRef.current === requestId && isMountedRef.current) {
        setLoading(false);
        setIsFetching(false);
        publishStatus({ isLoading: false, isFetching: false });
      }

      if (activeListRequestRef.current === controller) {
        activeListRequestRef.current = null;
      }
    }
  }, [effectiveFilters, list, publishStatus, query]);

  useEffect(() => {
    loadItems({ showSkeleton: !hasResolvedOnceRef.current });
  }, [loadItems]);

  const refresh = useCallback(async () => {
    await loadItems({ showSkeleton: false });
  }, [loadItems]);

  const mutate = useCallback(
    async (action) => {
      setSubmitting(true);
      setError("");
      publishStatus({ error: "" });

      try {
        await action();
        await loadItems({ showSkeleton: false });
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return;
        }

        const apiError = toApiError(requestError);
        setError(apiError.message);
        publishStatus({ error: apiError.message });
        throw apiError;
      } finally {
        setSubmitting(false);
      }
    },
    [loadItems, publishStatus]
  );

  const createItem = useCallback(
    async (payload) => {
      await mutate(() => create(payload));
    },
    [create, mutate]
  );

  const updateItem = useCallback(
    async (id, payload) => {
      await mutate(() => update(id, payload));
    },
    [mutate, update]
  );

  const deleteItem = useCallback(
    async (id) => {
      await mutate(() => remove(id));
    },
    [mutate, remove]
  );

  const updateQuery = useCallback((patch) => {
    setQuery((prev) => {
      const next = {
        ...prev,
        ...patch,
      };

      if (Object.prototype.hasOwnProperty.call(patch, "search")) {
        next.page = 1;
      }

      if (Object.prototype.hasOwnProperty.call(patch, "pageSize")) {
        next.page = 1;
      }

      const nextKeys = Object.keys(next);
      const hasChanged = nextKeys.some((key) => prev[key] !== next[key]);

      if (!hasChanged) {
        return prev;
      }

      return next;
    });
  }, []);

  return {
    query,
    updateQuery,
    items,
    total,
    totalPages,
    loading,
    isLoading: loading,
    isFetching,
    submitting,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  };
};
