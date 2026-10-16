import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "owner" | "member";
};

// Data access layer entry point: every page and action that touches cologne
// data goes through here. Redirects when signed out or not on the allowlist.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { data: member } = await supabase
    .from("cologne_members")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!member) redirect("/not-allowed");

  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    name: meta.full_name ?? meta.name ?? data.user.email ?? "You",
    email: data.user.email ?? "",
    avatarUrl: meta.avatar_url ?? null,
    role: member.role,
  };
});
