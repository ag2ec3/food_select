import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "@/lib/types";

export function mapAuthUserToUser(authUser: SupabaseAuthUser | null): User | null {
  if (!authUser) return null;

  const meta = authUser.user_metadata as { name?: string; full_name?: string } | undefined;
  const name =
    meta?.name ??
    meta?.full_name ??
    authUser.email?.split("@")[0] ??
    "User";

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name,
  };
}
