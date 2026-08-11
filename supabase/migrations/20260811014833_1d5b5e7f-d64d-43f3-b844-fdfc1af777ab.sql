
GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, public.member_role[]) TO authenticated;
