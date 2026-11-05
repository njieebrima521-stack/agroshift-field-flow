import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { buildStrategyRequest, emptyDetails, initialSession, type SessionState } from "./form";

const STORAGE_KEY = "agroshift.session.v1";

type SessionContextValue = {
  state: SessionState;
  hydrated: boolean;
  update: (patch: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void;
  selectField: (field: SessionState["field"]) => void;
  reset: () => void;
  /** True when stored results were produced from the current field, priorities and limits. */
  analysisIsCurrent: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds one analysis session in memory and in sessionStorage (this browser tab only).
 * There is no account and nothing is saved on a server.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => initialSession());
  const [hydrated, setHydrated] = useState(false);
  const skipFirstWrite = useRef(true);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionState;
        setState({ ...initialSession(), ...parsed });
      }
    } catch (err) {
      console.warn("[AgroShift] could not restore session", err);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[AgroShift] could not store session", err);
    }
  }, [state, hydrated]);

  const update = useCallback<SessionContextValue["update"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const selectField = useCallback<SessionContextValue["selectField"]>((field) => {
    setState((s) => {
      if (s.field?.field_id === field?.field_id) return { ...s, field, sessionBoundary: null };
      // Crop history belongs to a field: start fresh for a different field.
      return { ...s, field, sessionBoundary: null, details: emptyDetails(), analysis: null, sheetStrategyId: null };
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialSession());
  }, []);

  const analysisIsCurrent = useMemo(() => {
    if (!state.analysis) return false;
    const built = buildStrategyRequest(state);
    return built.ok && built.key === state.analysis.key;
  }, [state]);

  const value = useMemo(
    () => ({ state, hydrated, update, selectField, reset, analysisIsCurrent }),
    [state, hydrated, update, selectField, reset, analysisIsCurrent],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
