
CREATE TYPE public.member_role AS ENUM ('owner','admin','editor','viewer');
CREATE TYPE public.project_status AS ENUM ('uploaded','decomposing','reviewing','complete','failed');
CREATE TYPE public.verdict_type AS ENUM ('ship','fix','escalate');
CREATE TYPE public.agent_type AS ENUM ('technical','pacing','brand');
CREATE TYPE public.severity_type AS ENUM ('info','warn','critical');
CREATE TYPE public.finding_status AS ENUM ('open','approved','fix_confirmed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'editor',
  invited_email TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id UUID, _user_id UUID, _roles public.member_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "workspaces_select_member" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_member(id, auth.uid()));
CREATE POLICY "workspaces_insert_self" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "workspaces_update_admin" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "workspaces_delete_owner" ON public.workspaces FOR DELETE TO authenticated
  USING (public.has_workspace_role(id, auth.uid(), ARRAY['owner']::public.member_role[]));

CREATE POLICY "members_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members_insert" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "members_update_admin" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "members_delete_admin" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonts JSONB NOT NULL DEFAULT '[]'::jsonb,
  tone_of_voice TEXT,
  pacing_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kits_select" ON public.brand_kits FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "brand_kits_write" ON public.brand_kits FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "brand_kits_update" ON public.brand_kits FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "brand_kits_delete" ON public.brand_kits FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

CREATE TABLE public.reference_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  label TEXT,
  duration_seconds NUMERIC,
  avg_shot_seconds NUMERIC,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reference_videos TO authenticated;
GRANT ALL ON public.reference_videos TO service_role;
ALTER TABLE public.reference_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_videos_select" ON public.reference_videos FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "ref_videos_write" ON public.reference_videos FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "ref_videos_delete" ON public.reference_videos FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES public.brand_kits ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT,
  source_video_url TEXT,
  duration_seconds NUMERIC,
  width INT,
  height INT,
  context_note TEXT,
  status public.project_status NOT NULL DEFAULT 'uploaded',
  verdict public.verdict_type,
  verdict_summary TEXT,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  degraded BOOLEAN NOT NULL DEFAULT false,
  degraded_reason TEXT,
  error_message TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX projects_idempotency_idx ON public.projects (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX projects_ws_status_idx ON public.projects (workspace_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

CREATE TABLE public.project_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  shot_index INT NOT NULL,
  start_ms INT NOT NULL,
  end_ms INT NOT NULL
);
CREATE INDEX project_shots_project_idx ON public.project_shots (project_id);
GRANT SELECT, INSERT, DELETE ON public.project_shots TO authenticated;
GRANT ALL ON public.project_shots TO service_role;
ALTER TABLE public.project_shots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shots_select" ON public.project_shots FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "shots_insert" ON public.project_shots FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));

CREATE TABLE public.project_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  start_ms INT NOT NULL,
  end_ms INT NOT NULL,
  text TEXT NOT NULL,
  speaker_label TEXT
);
CREATE INDEX transcript_project_idx ON public.project_transcript_segments (project_id);
GRANT SELECT, INSERT, DELETE ON public.project_transcript_segments TO authenticated;
GRANT ALL ON public.project_transcript_segments TO service_role;
ALTER TABLE public.project_transcript_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcript_select" ON public.project_transcript_segments FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "transcript_insert" ON public.project_transcript_segments FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  agent public.agent_type NOT NULL,
  severity public.severity_type NOT NULL DEFAULT 'warn',
  timestamp_ms INT NOT NULL DEFAULT 0,
  end_ms INT,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  evidence TEXT,
  deterministic BOOLEAN NOT NULL DEFAULT false,
  downweighted BOOLEAN NOT NULL DEFAULT false,
  status public.finding_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX findings_project_idx ON public.findings (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings_select" ON public.findings FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "findings_insert" ON public.findings FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "findings_update" ON public.findings FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));

CREATE TABLE public.taste_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES public.brand_kits ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  agent public.agent_type NOT NULL,
  signal_key TEXT NOT NULL,
  preference_text TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'approve',
  override_count INT NOT NULL DEFAULT 1,
  confidence_score NUMERIC NOT NULL DEFAULT 0.2,
  source_finding_id UUID REFERENCES public.findings ON DELETE SET NULL,
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_kit_id, signal_key, direction)
);
CREATE INDEX taste_brand_idx ON public.taste_preferences (brand_kit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taste_preferences TO authenticated;
GRANT ALL ON public.taste_preferences TO service_role;
ALTER TABLE public.taste_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taste_select" ON public.taste_preferences FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "taste_write" ON public.taste_preferences FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "taste_update" ON public.taste_preferences FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.member_role[]));
CREATE POLICY "taste_delete" ON public.taste_preferences FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_ws_idx ON public.audit_logs (workspace_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "audit_insert_member" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_member(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws_id UUID;
  base_slug TEXT;
  final_slug TEXT;
  n INT := 0;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');

  base_slug := regexp_replace(lower(split_part(COALESCE(NEW.email,'team'),'@',1)), '[^a-z0-9]+', '-', 'g');
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'workspace'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces w WHERE w.slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, created_by)
  VALUES (initcap(replace(base_slug,'-',' ')) || ' Workspace', final_slug, NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');

  INSERT INTO public.brand_kits (workspace_id, name, primary_colors, fonts, tone_of_voice, pacing_profile)
  VALUES (ws_id, 'Default Brand', '["#0A0A0B","#6366F1","#10B981"]'::jsonb, '["Inter","JetBrains Mono"]'::jsonb,
    'Confident, precise, slightly editorial.', '{"target_avg_shot_seconds":2.5,"hook_max_seconds":3}'::jsonb);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "videos_read_own_workspace" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos' AND public.is_member(NULLIF(split_part(name,'/',1),'')::uuid, auth.uid()));
CREATE POLICY "videos_insert_own_workspace" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND public.is_member(NULLIF(split_part(name,'/',1),'')::uuid, auth.uid()));
CREATE POLICY "videos_delete_own_workspace" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND public.is_member(NULLIF(split_part(name,'/',1),'')::uuid, auth.uid()));
