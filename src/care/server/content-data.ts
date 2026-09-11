import { defaultContent, type ContentMap, type ContentState } from "../content";
import { supabaseAnon } from "./supabase";

// Public read of the editable content document, merged over the code defaults so every
// key always resolves. Safe for anonymous callers (login page, app shell).
export async function getContent(): Promise<ContentState> {
  try {
    const { data } = await supabaseAnon().rpc("get_content");
    const stored = (data?.values ?? {}) as Partial<ContentMap>;
    return { values: { ...defaultContent, ...stored }, revision: data?.revision ?? 0 };
  } catch {
    return { values: { ...defaultContent }, revision: 0 };
  }
}
