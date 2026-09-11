import { redirect } from "next/navigation";
import { supabaseServer } from "./server/supabase";
import { Workspace } from "./workspace";
import type { WorkspaceData } from "./types";

export async function CarePage({ section, admin = false }: { section: string; admin?: boolean }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("get_workspace");
  if (error || !data) redirect("/login");
  const workspace = data as WorkspaceData;
  if (admin && workspace.user.role !== "admin") redirect("/");
  return <Workspace initial={workspace} section={section} />;
}
