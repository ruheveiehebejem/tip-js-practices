import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_SNAPSHOT = {
  tasks: [],
  categories: [],
  meta: { total: 0 },
};

export function useTaskData({ api, filters }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);

  const mountedRef = useRef(false);
  const mutationRef = useRef(null);

  const q = filters?.q ?? "";
  const completed = filters?.completed ?? "";
  const priority = filters?.priority ?? "";
  const categoryId = filters?.categoryId ?? "";

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      const current = mutationRef.current;
      if (current) {
        current.cancelled = true;
        current.controller.abort();
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setStatus("loading");
    setError(null);

    async function load() {
      try {
        const result = await api.loadInitialData(
          { q, completed, priority, categoryId },
          { signal: controller.signal },
        );

        if (!active) return;

        setSnapshot(result);
        setStatus("ready");
      } catch (loadError) {
        if (!active || controller.signal.aborted || loadError?.kind === "aborted") {
          return;
        }

        setError(loadError);
        setStatus("error");
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, q, completed, priority, categoryId, revision]);

  const refresh = useCallback(() => {
    setRevision((previous) => previous + 1);
  }, []);

  const mutate = useCallback(async (operation) => {
    if (!mountedRef.current || mutationRef.current !== null) {
      return false;
    }

    const controller = new AbortController();
    const token = { controller, cancelled: false };
    mutationRef.current = token;

    setPending(true);
    setMutationError(null);

    try {
      await operation({ signal: controller.signal });

      if (token.cancelled || !mountedRef.current || controller.signal.aborted) {
        return false;
      }

      // GET запускается эффектом и использует актуальные фильтры.
      setRevision((previous) => previous + 1);
      return true;
    } catch (writeError) {
      if (
        token.cancelled ||
        !mountedRef.current ||
        controller.signal.aborted ||
        writeError?.kind === "aborted"
      ) {
        return false;
      }

      setMutationError(writeError);
      return false;
    } finally {
      if (mutationRef.current === token) {
        mutationRef.current = null;
        if (mountedRef.current) setPending(false);
      }
    }
  }, []);

  const saveTask = useCallback((id, value) => {
    return mutate(({ signal }) => (
      id === null
        ? api.createTask(value, { signal })
        : api.updateTask(id, value, { signal })
    ));
  }, [api, mutate]);

  const toggleTask = useCallback((task) => {
    return mutate(({ signal }) => (
      api.setTaskCompleted(task.id, !task.completed, { signal })
    ));
  }, [api, mutate]);

  const deleteTask = useCallback((id) => {
    return mutate(({ signal }) => api.deleteTask(id, { signal }));
  }, [api, mutate]);

  const resetData = useCallback(() => {
    return mutate(({ signal }) => api.resetDemoData({ signal }));
  }, [api, mutate]);

  return {
    snapshot,
    status,
    error,
    mutationError,
    pending,
    refresh,
    saveTask,
    toggleTask,
    deleteTask,
    resetData,
  };
}
