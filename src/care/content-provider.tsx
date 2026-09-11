"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultContent, type ContentKey, type ContentState } from "./content";

type Value = ContentState & { c: (key: ContentKey) => string; update: (state: ContentState) => void };
const ContentContext = createContext<Value | null>(null);
export function ContentProvider({ initial, children }: { initial: ContentState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let active = true;
    const refresh = () => { void fetch("/api/care/content", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then((value: ContentState | null) => { if (value && active) setState(value); }).catch(() => undefined); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => { document.title = state.values["brand.name"]; }, [state.values]);
  return <ContentContext.Provider value={{ ...state, c: key => state.values[key] ?? defaultContent[key], update: setState }}>{children}</ContentContext.Provider>;
}
export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("ContentProvider missing");
  return value;
}
