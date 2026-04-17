"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { PanelRef, PanelType } from "@/lib/supabase/types";

interface PanelContextValue {
  panel: PanelRef | null;
  openPanel: (type: PanelType, id: string) => void;
  closePanel: () => void;
  isOpen: boolean;
}

const PanelContext = createContext<PanelContextValue>({
  panel: null,
  openPanel: () => {},
  closePanel: () => {},
  isOpen: false,
});

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelRef | null>(null);

  const openPanel = useCallback((type: PanelType, id: string) => {
    setPanel({ type, id });
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("panel", type);
    url.searchParams.set("id", id);
    window.history.pushState({}, "", url.toString());
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    // Remove panel params from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("panel");
    url.searchParams.delete("id");
    window.history.pushState({}, "", url.toString());
  }, []);

  // Restore panel from URL on mount (enables shareable links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("panel") as PanelType | null;
    const id = params.get("id");
    if (type && id) {
      setPanel({ type, id });
    }
  }, []);

  // Escape key closes panel
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && panel) closePanel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panel, closePanel]);

  // Browser back button support
  useEffect(() => {
    function handlePop() {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("panel") as PanelType | null;
      const id = params.get("id");
      if (type && id) {
        setPanel({ type, id });
      } else {
        setPanel(null);
      }
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return (
    <PanelContext.Provider value={{ panel, openPanel, closePanel, isOpen: panel !== null }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
