import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export function useWorkspaces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workspaces", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WorkspaceRecord[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspaces(id, name, slug, plan)")
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => row.workspaces)
        .map((row) => ({
          id: row.workspaces!.id,
          name: row.workspaces!.name,
          slug: row.workspaces!.slug,
          plan: row.workspaces!.plan,
          role: row.role,
        }));
    },
  });
}

const ACTIVE_KEY = "verdict.activeWorkspace";

export function getActiveWorkspaceId(list: WorkspaceRecord[]): string | null {
  if (!list.length) return null;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(ACTIVE_KEY);
    if (stored && list.some((w) => w.id === stored)) return stored;
  }
  return list[0]!.id;
}

export function setActiveWorkspaceId(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, id);
}

export function useActiveWorkspace() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const activeId = getActiveWorkspaceId(workspaces);
  const workspace = workspaces.find((w) => w.id === activeId) ?? null;
  return { workspace, workspaces, isLoading };
}

export function useBrandKits(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["brand-kits", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useProjects(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, brand_kits(name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export async function signedVideoUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("videos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function canEdit(role?: string | null) {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canAdmin(role?: string | null) {
  return role === "owner" || role === "admin";
}
