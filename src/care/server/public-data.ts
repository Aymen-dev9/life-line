import { supabaseAnon } from "./supabase";

// Active services for the public medical booking form. RLS lets anonymous callers read
// active services, so no session is required.
export async function getPublicServices(): Promise<{ id: string; name: string }[]> {
  try {
    const { data } = await supabaseAnon().from("services").select("id, name").eq("active", true).order("sort").order("created_at");
    return (data ?? []) as { id: string; name: string }[];
  } catch { return []; }
}
