-- Current public RLS policy backup
-- Generated from Supabase catalog on 2026-08-30.
-- Run after the schema backup and function backup.

begin;

drop policy if exists "admin can read own profile" on public."admin_users";
create policy "admin can read own profile"
  on public."admin_users"
  as permissive
  for select
  to authenticated
  using (((id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text)));

drop policy if exists "active admins full access" on public."attendance";
create policy "active admins full access"
  on public."attendance"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "active admins full access" on public."attendance_edit_history";
create policy "active admins full access"
  on public."attendance_edit_history"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "checklist_items_admin_all" on public."checklist_items";
create policy "checklist_items_admin_all"
  on public."checklist_items"
  as permissive
  for all
  to public
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "checklist_submission_admin_read" on public."cleaning_checklist_submissions";
create policy "checklist_submission_admin_read"
  on public."cleaning_checklist_submissions"
  as permissive
  for select
  to authenticated
  using (is_active_admin());

drop policy if exists "custom_checklist_admin_delete" on public."employee_custom_checklist_items";
create policy "custom_checklist_admin_delete"
  on public."employee_custom_checklist_items"
  as permissive
  for delete
  to public
  using (is_active_admin());

drop policy if exists "custom_checklist_admin_read" on public."employee_custom_checklist_items";
create policy "custom_checklist_admin_read"
  on public."employee_custom_checklist_items"
  as permissive
  for select
  to public
  using (is_active_admin());

drop policy if exists "admins manage employee daily notes" on public."employee_daily_notes";
create policy "admins manage employee daily notes"
  on public."employee_daily_notes"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "employee_departments_admin_all" on public."employee_departments";
create policy "employee_departments_admin_all"
  on public."employee_departments"
  as permissive
  for all
  to authenticated
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "active admins full access" on public."employee_requests";
create policy "active admins full access"
  on public."employee_requests"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "employee_uploads_admin_delete" on public."employee_uploads";
create policy "employee_uploads_admin_delete"
  on public."employee_uploads"
  as permissive
  for delete
  to authenticated
  using (is_active_admin());

drop policy if exists "employee_uploads_admin_select" on public."employee_uploads";
create policy "employee_uploads_admin_select"
  on public."employee_uploads"
  as permissive
  for select
  to authenticated
  using (is_active_admin());

drop policy if exists "job_positions_admin_all" on public."job_positions";
create policy "job_positions_admin_all"
  on public."job_positions"
  as permissive
  for all
  to authenticated
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "active admins full access" on public."notices";
create policy "active admins full access"
  on public."notices"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "notices_admin_all" on public."notices";
create policy "notices_admin_all"
  on public."notices"
  as permissive
  for all
  to public
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "notices_employee_read" on public."notices";
create policy "notices_employee_read"
  on public."notices"
  as permissive
  for select
  to anon, authenticated
  using ((status = '게시중'::text));

drop policy if exists "photo_storage_settings_admin_select" on public."photo_storage_settings";
create policy "photo_storage_settings_admin_select"
  on public."photo_storage_settings"
  as permissive
  for select
  to authenticated
  using (is_active_admin());

drop policy if exists "active admins full access" on public."users";
create policy "active admins full access"
  on public."users"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "work_shifts_admin_all" on public."work_shifts";
create policy "work_shifts_admin_all"
  on public."work_shifts"
  as permissive
  for all
  to authenticated
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "workplace_checklist_admin_all" on public."workplace_checklist_items";
create policy "workplace_checklist_admin_all"
  on public."workplace_checklist_items"
  as permissive
  for all
  to public
  using (is_active_admin())
  with check (is_active_admin());

drop policy if exists "active admins full access" on public."workplace_users";
create policy "active admins full access"
  on public."workplace_users"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

drop policy if exists "active admins full access" on public."workplaces";
create policy "active admins full access"
  on public."workplaces"
  as permissive
  for all
  to authenticated
  using (( SELECT is_active_admin() AS is_active_admin))
  with check (( SELECT is_active_admin() AS is_active_admin));

commit;
