import { redirect } from "next/navigation";
import { supabaseServer } from "./server/supabase";
import { Workspace } from "./workspace";
import type { WorkspaceData } from "./types";

// Only the admin dashboard is authenticated now. Any unauthenticated or non-admin visitor
// is sent to the admin login (the public site lives at "/").
export async function CarePage({ section, admin = true }: { section: string; admin?: boolean }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data, error } = await supabase.rpc("get_workspace");
  if (error || !data) redirect("/admin/login");
  const workspace = data as WorkspaceData;
  if (admin && workspace.user.role !== "admin") redirect("/admin/login");
  return <Workspace initial={workspace} section={section} />;
}
