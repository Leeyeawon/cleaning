-- Current public function, trigger, and Cron backup
-- Generated from Supabase definitions on 2026-08-30.
-- Contains schema logic only; no employee or attendance data.

begin;

set check_function_bodies = false;

-- is_active_admin()
CREATE OR REPLACE FUNCTION public.is_active_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1

    from public.admin_users au

    where au.id =
          auth.uid()

      and au.status =
          'active'
  );
$function$;

-- require_active_employee_session(p_session_token text, p_required_app_role text)
CREATE OR REPLACE FUNCTION public.require_active_employee_session(p_session_token text, p_required_app_role text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_app_role text;
begin
  if nullif(
    trim(coalesce(p_session_token, '')),
    ''
  ) is null then
    raise exception 'INVALID_SESSION';
  end if;

  select
    u.id,
    coalesce(u.app_role, 'employee')
  into
    v_user_id,
    v_app_role
  from public.employee_sessions s

  join public.users u
    on u.id = s.user_id

  where s.session_token =
        p_session_token

    and s.expires_at > now()

    and s.approval_status =
        'approved'

    and s.revoked_at is null

    and u.status = 'active'

  limit 1;

  if v_user_id is null then
    raise exception 'INVALID_SESSION';
  end if;

  if p_required_app_role is not null
    and v_app_role <>
        p_required_app_role
  then
    raise exception 'TEAM_LEAD_ONLY';
  end if;

  return v_user_id;
end;
$function$;

-- require_assigned_workplace(p_user_id uuid, p_workplace_id text)
CREATE OR REPLACE FUNCTION public.require_assigned_workplace(p_user_id uuid, p_workplace_id text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_workplace_id bigint;
begin
  select w.id
  into v_workplace_id

  from public.workplace_users wu

  join public.workplaces w
    on w.id = wu.workplace_id

  where wu.user_id = p_user_id

    and w.id::text =
        trim(coalesce(
          p_workplace_id,
          ''
        ))

    and w.is_active = true

    and (
      wu.start_date is null
      or wu.start_date <= current_date
    )

    and (
      wu.end_date is null
      or wu.end_date >= current_date
    )

  limit 1;

  if v_workplace_id is null then
    raise exception
      'WORKPLACE_NOT_ASSIGNED';
  end if;

  return v_workplace_id;
end;
$function$;

-- calculate_shift_check_out_time(p_work_date date, p_start_time time without time zone, p_end_time time without time zone)
CREATE OR REPLACE FUNCTION public.calculate_shift_check_out_time(p_work_date date, p_start_time time without time zone, p_end_time time without time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    case
      when p_work_date is null
        or p_start_time is null
        or p_end_time is null
      then null

      else (
        (
          p_work_date +
          p_end_time +

          case
            when p_end_time <=
                 p_start_time
            then interval '1 day'

            else interval '0 day'
          end
        )
        at time zone
        'Asia/Seoul'
      )
    end;
$function$;

-- is_assigned_workday(p_days text[], p_work_date date)
CREATE OR REPLACE FUNCTION public.is_assigned_workday(p_days text[], p_work_date date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    coalesce(
      cardinality(p_days),
      0
    ) = 0

    or exists (
      select 1
      from unnest(p_days)
        as selected_day(day_value)

      where lower(
        trim(selected_day.day_value)
      ) in (
        extract(
          isodow from p_work_date
        )::integer::text,

        case extract(
          isodow from p_work_date
        )::integer
          when 1 then '월'
          when 2 then '화'
          when 3 then '수'
          when 4 then '목'
          when 5 then '금'
          when 6 then '토'
          when 7 then '일'
        end,

        case extract(
          isodow from p_work_date
        )::integer
          when 1 then '월요일'
          when 2 then '화요일'
          when 3 then '수요일'
          when 4 then '목요일'
          when 5 then '금요일'
          when 6 then '토요일'
          when 7 then '일요일'
        end,

        case extract(
          isodow from p_work_date
        )::integer
          when 1 then 'mon'
          when 2 then 'tue'
          when 3 then 'wed'
          when 4 then 'thu'
          when 5 then 'fri'
          when 6 then 'sat'
          when 7 then 'sun'
        end
      )
    );
$function$;

-- internal_get_photo_storage_status()
CREATE OR REPLACE FUNCTION public.internal_get_photo_storage_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_limit_bytes bigint;
  v_retention_days integer;
  v_used_bytes bigint;
  v_file_count bigint;
begin
  select
    s.storage_limit_bytes,
    s.retention_days
  into
    v_limit_bytes,
    v_retention_days
  from public.photo_storage_settings s
  where s.id = 1;

  if v_limit_bytes is null then
    v_limit_bytes :=
      838860800;
  end if;

  if v_retention_days is null then
    v_retention_days :=
      365;
  end if;

  select
    coalesce(
      sum(u.file_size),
      0
    )::bigint,

    count(*)::bigint
  into
    v_used_bytes,
    v_file_count
  from public.employee_uploads u;

  return jsonb_build_object(
    'used_bytes',
      v_used_bytes,

    'limit_bytes',
      v_limit_bytes,

    'remaining_bytes',
      greatest(
        v_limit_bytes -
        v_used_bytes,
        0
      ),

    'file_count',
      v_file_count,

    'retention_days',
      v_retention_days,

    'is_upload_blocked',
      v_used_bytes >=
      v_limit_bytes
  );
end;
$function$;

-- set_work_management_updated_at()
CREATE OR REPLACE FUNCTION public.set_work_management_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();

  return new;
end;
$function$;

-- ensure_daily_note_content()
CREATE OR REPLACE FUNCTION public.ensure_daily_note_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.content :=
    coalesce(
      new.content,
      ''
    );

  return new;
end;
$function$;

-- delete_employee_sessions_before_user_delete()
CREATE OR REPLACE FUNCTION public.delete_employee_sessions_before_user_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  delete from public.employee_sessions
  where user_id = old.id;

  return old;
end;
$function$;

-- revoke_previous_employee_sessions()
CREATE OR REPLACE FUNCTION public.revoke_previous_employee_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  /*
    새 로그인 세션이 생성되기 직전,
    같은 직원의 기존 세션을 모두 폐기합니다.
  */
  update public.employee_sessions
  set
    approval_status = 'revoked',
    revoked_at = now(),
    revoked_reason =
      'new_device_login'
  where user_id = new.user_id
    and id <> new.id
    and revoked_at is null;

  return new;
end;
$function$;

-- revoke_employee_sessions_on_status_change()
CREATE OR REPLACE FUNCTION public.revoke_employee_sessions_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  /*
    직원 상태가 사용 불가능한 상태로 변경되면
    현재 로그인된 모든 기기 세션을 폐기합니다.
  */
  if new.status in (
    'inactive',
    'resigned',
    'deleted'
  )
  and old.status is distinct from
      new.status
  then
    update public.employee_sessions
    set
      approval_status = 'revoked',
      revoked_at = now(),

      revoked_reason =
        case new.status
          when 'inactive'
            then 'employee_inactive'

          when 'resigned'
            then 'employee_resigned'

          when 'deleted'
            then 'employee_deleted'

          else 'employee_status_changed'
        end

    where user_id = new.id
      and revoked_at is null;

    new.app_approval_status :=
      'not_requested';

    new.app_approved_at := null;
    new.app_approved_by := null;
    new.login_requested_at := null;
  end if;

  return new;
end;
$function$;

-- auto_close_previous_employee_record(p_user_id uuid, p_current_work_date date)
CREATE OR REPLACE FUNCTION public.auto_close_previous_employee_record(p_user_id uuid, p_current_work_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_updated_count integer := 0;
begin
  if p_user_id is null
    or p_current_work_date is null
  then
    return 0;
  end if;

  update public.attendance a

  set
    check_out_time =
      a.scheduled_check_out_time,

    check_out_latitude =
      null,

    check_out_longitude =
      null,

    status =
      case
        when a.status in (
          'late',
          '지각'
        )
        then 'late'

        else 'done'
      end,

    is_auto_closed =
      true,

    auto_closed_at =
      now(),

    auto_close_reason =
      'next_check_in'

  where
    a.user_id =
      p_user_id

    and a.work_date <
        p_current_work_date

    and a.check_in_time
        is not null

    and a.check_out_time
        is null

    and a.scheduled_check_out_time
        is not null

    and a.scheduled_check_out_time <=
        now();

  get diagnostics
    v_updated_count =
      row_count;

  return v_updated_count;
end;
$function$;

-- auto_close_overdue_attendance()
CREATE OR REPLACE FUNCTION public.auto_close_overdue_attendance()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_updated_count integer := 0;
begin
  update public.attendance a

  set
    check_out_time =
      a.scheduled_check_out_time,

    check_out_latitude =
      null,

    check_out_longitude =
      null,

    status =
      case
        when a.status in (
          'late',
          '지각'
        )
        then 'late'

        else 'done'
      end,

    is_auto_closed =
      true,

    auto_closed_at =
      now(),

    auto_close_reason =
      'scheduled_end_grace'

  where
    a.check_in_time
        is not null

    and a.check_out_time
        is null

    and a.scheduled_check_out_time
        is not null

    and now() >=
        (
          a.scheduled_check_out_time
          +
          (
            greatest(
              a.auto_close_grace_minutes,
              0
            )
            *
            interval '1 minute'
          )
        );

  get diagnostics
    v_updated_count =
      row_count;

  return v_updated_count;
end;
$function$;

-- add_my_checklist_item(p_session_token text, p_workplace_id text, p_label text)
CREATE OR REPLACE FUNCTION public.add_my_checklist_item(p_session_token text, p_workplace_id text, p_label text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_workplace_id bigint;
  v_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      'team_lead'
    );

  v_workplace_id :=
    public.require_assigned_workplace(
      v_user_id,
      p_workplace_id
    );

  if nullif(
    trim(coalesce(p_label, '')),
    ''
  ) is null then
    raise exception 'EMPTY_LABEL';
  end if;

  insert into
    public.employee_custom_checklist_items (
      user_id,
      workplace_id,
      label
    )
  values (
    v_user_id,
    v_workplace_id::text,
    left(trim(p_label), 200)
  )
  returning id into v_id;

  return v_id;
end;
$function$;

-- admin_convert_attendance_to_annual_leave(p_user_id uuid, p_work_date date, p_memo text)
CREATE OR REPLACE FUNCTION public.admin_convert_attendance_to_annual_leave(p_user_id uuid, p_work_date date, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_deleted_count integer := 0;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception
      'USER_REQUIRED';
  end if;

  if p_work_date is null then
    raise exception
      'WORK_DATE_REQUIRED';
  end if;

  /*
    해당 날짜의 기존 출퇴근 기록을
    중복 기록까지 모두 삭제합니다.
  */
  delete from public.attendance
  where user_id = p_user_id
    and work_date = p_work_date;

  get diagnostics
    v_deleted_count =
      row_count;

  /*
    해당 날짜를 연차로 등록합니다.
  */
  insert into
    public.employee_daily_notes (
      user_id,
      note_date,
      day_type,
      content,
      updated_at
    )
  values (
    p_user_id,
    p_work_date,
    'annual_leave',
    nullif(
      btrim(
        coalesce(
          p_memo,
          ''
        )
      ),
      ''
    ),
    now()
  )
  on conflict (
    user_id,
    note_date
  )
  do update
  set
    day_type =
      'annual_leave',

    content =
      excluded.content,

    updated_at =
      now();

  return jsonb_build_object(
    'success',
    true,

    'user_id',
    p_user_id,

    'work_date',
    p_work_date,

    'deleted_attendance_count',
    v_deleted_count
  );
end;
$function$;

-- admin_delete_employee_department(p_department_id bigint)
CREATE OR REPLACE FUNCTION public.admin_delete_employee_department(p_department_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_department_name text;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_REQUIRED';
  end if;

  select d.name
  into v_department_name
  from public.employee_departments d
  where d.id = p_department_id;

  if v_department_name is null then
    raise exception
      'DEPARTMENT_NOT_FOUND';
  end if;

  /*
    삭제되지 않은 직원이 해당 소속을
    사용 중이면 삭제를 막습니다.
  */
  if exists (
    select 1
    from public.users u
    where lower(
      btrim(
        coalesce(
          u.department,
          ''
        )
      )
    ) =
    lower(
      btrim(v_department_name)
    )
      and coalesce(
        u.status,
        'active'
      ) <> 'deleted'
  ) then
    raise exception
      'DEPARTMENT_IN_USE';
  end if;

  delete from
    public.employee_departments
  where id = p_department_id;

  return true;
end;
$function$;

-- admin_delete_employee_permanently(p_user_id uuid, p_confirmation text)
CREATE OR REPLACE FUNCTION public.admin_delete_employee_permanently(p_user_id uuid, p_confirmation text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  /*
    owner뿐 아니라 등록된 모든 활성 관리자 허용
  */
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;


  if p_confirmation <> '삭제' then
    raise exception
      'DELETE_CONFIRMATION_REQUIRED';
  end if;


  if to_regclass(
    'public.attendance_edit_history'
  ) is not null then
    execute '
      delete from public.attendance_edit_history
      where user_id = $1
    '
    using p_user_id;
  end if;


  if to_regclass(
    'public.employee_requests'
  ) is not null then
    execute '
      delete from public.employee_requests
      where user_id = $1
    '
    using p_user_id;
  end if;


  if to_regclass(
    'public.employee_sessions'
  ) is not null then
    execute '
      delete from public.employee_sessions
      where user_id = $1
    '
    using p_user_id;
  end if;


  delete from public.workplace_users
  where user_id = p_user_id;


  delete from public.attendance
  where user_id = p_user_id;


  delete from public.users
  where id = p_user_id;


  if not found then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;
end;
$function$;

-- admin_get_attendance_edit_history(p_limit integer)
CREATE OR REPLACE FUNCTION public.admin_get_attendance_edit_history(p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, attendance_id bigint, user_id uuid, employee_name text, department text, work_date date, old_check_in_time timestamp with time zone, new_check_in_time timestamp with time zone, old_check_out_time timestamp with time zone, new_check_out_time timestamp with time zone, old_status text, new_status text, edit_type text, edit_reason text, memo text, editor_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  return query
  select
    h.id,
    h.attendance_id,
    h.user_id,
    u.name,
    u.department,
    h.work_date,
    h.old_check_in_time,
    h.new_check_in_time,
    h.old_check_out_time,
    h.new_check_out_time,
    h.old_status,
    h.new_status,
    h.edit_type,
    h.edit_reason,
    h.memo,
    h.editor_name,
    h.created_at

  from public.attendance_edit_history h

  left join public.users u
    on u.id = h.user_id

  order by h.created_at desc

  limit least(
    greatest(
      coalesce(p_limit, 100),
      1
    ),
    500
  );
end;
$function$;

-- admin_get_attendance_edit_rows(p_work_date date)
CREATE OR REPLACE FUNCTION public.admin_get_attendance_edit_rows(p_work_date date)
 RETURNS TABLE(attendance_id bigint, user_id uuid, employee_name text, department text, work_date date, workplace_id bigint, workplace_name text, check_in_time timestamp with time zone, check_out_time timestamp with time zone, attendance_status text, attendance_memo text, has_record boolean, duplicate_count integer, is_auto_closed boolean, auto_closed_at timestamp with time zone, auto_close_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  if p_work_date is null then
    raise exception
      'WORK_DATE_REQUIRED';
  end if;

  return query
  select
    a.id,
    u.id,
    u.name,
    u.department,
    p_work_date,

    coalesce(
      a.workplace_id,
      assigned.workplace_id
    ),

    w.name,

    a.check_in_time,
    a.check_out_time,
    a.status,
    a.memo,

    a.id is not null,

    count(a.id) over (
      partition by u.id
    )::integer,

    coalesce(
      a.is_auto_closed,
      false
    ),

    a.auto_closed_at,
    a.auto_close_reason

  from public.users u

  left join lateral (
    select
      wu.workplace_id

    from public.workplace_users wu

    where wu.user_id =
          u.id

      and (
        wu.start_date is null
        or wu.start_date <=
           p_work_date
      )

      and (
        wu.end_date is null
        or wu.end_date >=
           p_work_date
      )

    order by
      wu.start_date desc
        nulls last,
      wu.id desc

    limit 1
  ) assigned
    on true

  left join public.attendance a
    on a.user_id =
       u.id

    and a.work_date =
        p_work_date

  left join public.workplaces w
    on w.id =
       coalesce(
         a.workplace_id,
         assigned.workplace_id
       )

  where u.status =
        'active'

    and coalesce(
      u.role,
      'employee'
    ) = 'employee'

  order by
    u.name,
    a.id;
end;
$function$;

-- admin_get_attendance_issue_actions(p_issue_date date)
CREATE OR REPLACE FUNCTION public.admin_get_attendance_issue_actions(p_issue_date date)
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    jsonb_build_object(
      'id',
      a.id,

      'user_id',
      a.user_id,

      'attendance_id',
      a.attendance_id,

      'issue_date',
      a.issue_date,

      'issue_type',
      a.issue_type,

      'action_status',
      a.action_status,

      'reason',
      a.reason,

      'memo',
      a.memo,

      'updated_at',
      a.updated_at
    )

  from
    public.attendance_issue_actions a

  where
    public.is_active_admin()

    and a.issue_date =
        p_issue_date

  order by
    a.updated_at desc;
$function$;

-- admin_get_attendance_location_errors(p_issue_date date)
CREATE OR REPLACE FUNCTION public.admin_get_attendance_location_errors(p_issue_date date)
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    jsonb_build_object(
      'id',
      a.id,

      'user_id',
      a.user_id,

      'employee_name',
      u.name,

      'department',
      u.department,

      'attempt_date',
      a.attempt_date,

      'attempted_at',
      a.attempted_at,

      'latitude',
      a.latitude,

      'longitude',
      a.longitude,

      'workplace_id',
      a.nearest_workplace_id,

      'workplace_name',
      w.name,

      'distance_m',
      a.distance_m,

      'allowed_radius',
      a.allowed_radius
    )

  from
    public.attendance_location_attempts a

  join public.users u
    on u.id =
       a.user_id

  left join public.workplaces w
    on w.id =
       a.nearest_workplace_id

  where
    public.is_active_admin()

    and a.attempt_date =
        p_issue_date

  order by
    a.attempted_at desc;
$function$;

-- admin_get_employee_request_detail(p_request_id text)
CREATE OR REPLACE FUNCTION public.admin_get_employee_request_detail(p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  select jsonb_build_object(
    'id', r.id::text,
    'user_id', r.user_id,
    'user_name', u.name,
    'department', u.department,
    'request_type', r.request_type,
    'title', r.title,
    'content', r.content,
    'status', r.status,
    'start_date', r.start_date,
    'end_date', r.end_date,
    'admin_note', r.admin_note,
    'created_at', r.created_at,
    'resolved_at', r.resolved_at,

    'attachments',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id::text,
            'file_name', a.file_name,
            'mime_type', a.mime_type,
            'file_size', a.file_size,
            'data_url',
              'data:' ||
              a.mime_type ||
              ';base64,' ||
              encode(a.file_data, 'base64')
          )
          order by a.created_at
        )
        from public.employee_request_attachments a
        where a.request_id = r.id
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.employee_requests r
  join public.users u
    on u.id = r.user_id
  where r.id::text = p_request_id;

  if v_result is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  return v_result;
end;
$function$;

-- admin_get_employee_requests()
CREATE OR REPLACE FUNCTION public.admin_get_employee_requests()
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id',
    r.id::text,

    'user_id',
    r.user_id,

    'user_name',
    u.name,

    'department',
    u.department,

    'request_type',
    r.request_type,

    'title',
    r.title,

    'content',
    r.content,

    'status',
    r.status,

    'start_date',
    r.start_date,

    'end_date',
    r.end_date,

    'admin_note',
    r.admin_note,

    'created_at',
    r.created_at
  )

  from public.employee_requests r

  join public.users u
    on u.id = r.user_id

  where public.is_active_admin()

  order by
    case
      when r.status = 'pending'
        then 0
      else 1
    end,

    r.created_at desc;
$function$;

-- admin_get_employees()
CREATE OR REPLACE FUNCTION public.admin_get_employees()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'phone', u.phone,
        'employee_code', u.employee_code,
        'department', u.department,
        'status', u.status,
        'memo', u.memo,
        'created_at', u.created_at,

        'workplaceIds',
        coalesce(
          (
            select jsonb_agg(
              wu.workplace_id::text
              order by w.name
            )
            from public.workplace_users wu
            join public.workplaces w
              on w.id = wu.workplace_id
            where wu.user_id = u.id
          ),
          '[]'::jsonb
        ),

        'workplaceNames',
        coalesce(
          (
            select jsonb_agg(
              w.name
              order by w.name
            )
            from public.workplace_users wu
            join public.workplaces w
              on w.id = wu.workplace_id
            where wu.user_id = u.id
          ),
          '[]'::jsonb
        )
      )
      order by u.created_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.users u;

  return result;
end;
$function$;

-- admin_get_employees_v2()
CREATE OR REPLACE FUNCTION public.admin_get_employees_v2()
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id',
    u.id,

    'name',
    u.name,

    'phone',
    u.phone,

    'department',
    u.department,

    'position',
    u.position,

    /*
      기존 코드에서 job_title을
      사용하는 경우를 위한 호환 값
    */
    'job_title',
    u.position,

    'status',
    u.status,

    'memo',
    u.memo,

    'created_at',
    u.created_at,

    'app_role',
    coalesce(
      u.app_role,
      'employee'
    ),

    'app_approval_status',
    coalesce(
      u.app_approval_status,
      'not_requested'
    ),

    'login_requested_at',
    u.login_requested_at,

    'workplaceIds',
    coalesce(
      (
        select jsonb_agg(
          wu.workplace_id::text
          order by
            wu.workplace_id::text
        )
        from public.workplace_users wu
        where wu.user_id = u.id
      ),
      '[]'::jsonb
    ),

    'workplaceNames',
    coalesce(
      (
        select jsonb_agg(
          w.name
          order by w.name
        )
        from public.workplace_users wu

        join public.workplaces w
          on w.id::text =
             wu.workplace_id::text

        where wu.user_id = u.id
      ),
      '[]'::jsonb
    )
  )

  from public.users u

  where public.is_active_admin()
    and u.status <> 'deleted'

  order by
    u.created_at desc;
$function$;

-- admin_get_photo_storage_status()
CREATE OR REPLACE FUNCTION public.admin_get_photo_storage_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_limit_bytes bigint;
  v_retention_days integer;
  v_used_bytes bigint;
  v_file_count bigint;
  v_expired_count bigint;
  v_oldest_photo_at timestamptz;
  v_usage_percent numeric;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  select
    s.storage_limit_bytes,
    s.retention_days
  into
    v_limit_bytes,
    v_retention_days
  from public.photo_storage_settings s
  where s.id = 1;

  if v_limit_bytes is null then
    v_limit_bytes :=
      838860800;
  end if;

  if v_retention_days is null then
    v_retention_days :=
      365;
  end if;

  select
    coalesce(
      sum(u.file_size),
      0
    )::bigint,

    count(*)::bigint,

    min(u.created_at)
  into
    v_used_bytes,
    v_file_count,
    v_oldest_photo_at
  from public.employee_uploads u;

  select
    count(*)::bigint
  into
    v_expired_count
  from public.employee_uploads u
  where u.created_at <
    now() -
    make_interval(
      days =>
        v_retention_days
    );

  v_usage_percent :=
    case
      when v_limit_bytes <= 0
        then 0
      else round(
        (
          v_used_bytes::numeric /
          v_limit_bytes::numeric
        ) * 100,
        1
      )
    end;

  return jsonb_build_object(
    'used_bytes',
      v_used_bytes,

    'limit_bytes',
      v_limit_bytes,

    'remaining_bytes',
      greatest(
        v_limit_bytes -
        v_used_bytes,
        0
      ),

    'usage_percent',
      v_usage_percent,

    'file_count',
      v_file_count,

    'retention_days',
      v_retention_days,

    'expired_count',
      v_expired_count,

    'oldest_photo_at',
      v_oldest_photo_at,

    'is_upload_blocked',
      v_used_bytes >=
      v_limit_bytes
  );
end;
$function$;

-- admin_get_uploads(p_parent_type text, p_parent_id text)
CREATE OR REPLACE FUNCTION public.admin_get_uploads(p_parent_type text, p_parent_id text)
 RETURNS TABLE(id uuid, object_path text, original_name text, mime_type text, file_size integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  if p_parent_type = 'employee_request' then
    return query
    select
      f.id,
      f.object_path,
      f.original_name,
      f.mime_type,
      f.file_size,
      f.created_at
    from public.employee_uploads f
    where f.upload_type = 'employee_request'
      and f.request_id::text = p_parent_id
    order by f.created_at;

  elsif p_parent_type = 'cleaning_checklist' then
    return query
    select
      f.id,
      f.object_path,
      f.original_name,
      f.mime_type,
      f.file_size,
      f.created_at
    from public.employee_uploads f
    where f.upload_type = 'cleaning_checklist'
      and f.checklist_submission_id::text = p_parent_id
    order by f.created_at;

  else
    raise exception 'INVALID_PARENT_TYPE';
  end if;
end;
$function$;

-- admin_resolve_employee_request(p_request_id text, p_status text, p_admin_note text)
CREATE OR REPLACE FUNCTION public.admin_resolve_employee_request(p_request_id text, p_status text, p_admin_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.employee_requests%rowtype;

  v_date date;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  if p_status not in (
    'approved',
    'rejected'
  ) then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into v_request
  from public.employee_requests
  where id::text = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  update public.employee_requests
  set
    status = p_status,

    admin_note =
      nullif(
        trim(p_admin_note),
        ''
      ),

    resolved_at = now(),

    resolved_by = auth.uid()

  where id::text = p_request_id;

  if v_request.request_type =
     'annual_leave'

    and p_status = 'approved'
  then
    for v_date in
      select generate_series(
        v_request.start_date,
        v_request.end_date,
        interval '1 day'
      )::date
    loop
      insert into public.employee_daily_notes (
        user_id,
        note_date,
        day_type,
        content,
        created_by,
        updated_at
      )
      values (
        v_request.user_id,
        v_date,
        'annual_leave',
        nullif(
          trim(v_request.content),
          ''
        ),
        auth.uid(),
        now()
      )
      on conflict (
        user_id,
        note_date
      )
      do update
      set
        day_type = 'annual_leave',

        content = excluded.content,

        updated_at = now();
    end loop;
  end if;

  insert into public.employee_notifications (
    user_id,
    type,
    title,
    content,
    related_id
  )
  values (
    v_request.user_id,

    v_request.request_type,

    case
      when p_status = 'approved'
        then '요청이 승인되었습니다'
      else '요청이 반려되었습니다'
    end,

    case
      when v_request.request_type =
           'annual_leave'
      then format(
        '연차 신청(%s ~ %s)이 %s되었습니다.',
        v_request.start_date,
        v_request.end_date,
        case
          when p_status = 'approved'
            then '승인'
          else '반려'
        end
      )
      else format(
        '%s 요청이 %s되었습니다.',
        v_request.title,
        case
          when p_status = 'approved'
            then '승인'
          else '반려'
        end
      )
    end,

    v_request.id::text
  );

  return jsonb_build_object(
    'id',
    v_request.id::text,

    'status',
    p_status
  );
end;
$function$;

-- admin_revoke_annual_leave(p_request_id text, p_confirmation text, p_admin_note text)
CREATE OR REPLACE FUNCTION public.admin_revoke_annual_leave(p_request_id text, p_confirmation text, p_admin_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_request
    public.employee_requests%rowtype;

  v_date date;
  v_other_content text;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  if trim(
    coalesce(
      p_confirmation,
      ''
    )
  ) <> '철회' then
    raise exception
      'CONFIRMATION_REQUIRED';
  end if;

  select *
  into v_request
  from public.employee_requests
  where id::text = p_request_id
  for update;

  if v_request.id is null then
    raise exception
      'REQUEST_NOT_FOUND';
  end if;

  if v_request.request_type <>
     'annual_leave' then
    raise exception
      'ANNUAL_LEAVE_ONLY';
  end if;

  if v_request.status <>
     'approved' then
    raise exception
      'APPROVED_LEAVE_ONLY';
  end if;

  if v_request.start_date is null
    or v_request.end_date is null
  then
    raise exception
      'INVALID_LEAVE_PERIOD';
  end if;

  update public.employee_requests
  set
    status = 'revoked',

    admin_note =
      case
        when nullif(
          trim(
            coalesce(
              p_admin_note,
              ''
            )
          ),
          ''
        ) is not null
        then trim(p_admin_note)

        else '관리자에 의해 연차 승인이 철회되었습니다.'
      end,

    resolved_at = now(),
    resolved_by = auth.uid()

  where id = v_request.id;

  for v_date in
    select generate_series(
      v_request.start_date,
      v_request.end_date,
      interval '1 day'
    )::date
  loop
    v_other_content := null;

    select r.content
    into v_other_content
    from public.employee_requests r
    where r.id <> v_request.id
      and r.user_id =
          v_request.user_id
      and r.request_type =
          'annual_leave'
      and r.status = 'approved'
      and v_date between
          r.start_date
          and r.end_date
    order by r.resolved_at desc
    limit 1;

    if found then
      insert into
        public.employee_daily_notes (
          user_id,
          note_date,
          day_type,
          content,
          created_by,
          updated_at
        )
      values (
        v_request.user_id,
        v_date,
        'annual_leave',
        coalesce(
          v_other_content,
          ''
        ),
        auth.uid(),
        now()
      )
      on conflict (
        user_id,
        note_date
      )
      do update
      set
        day_type = 'annual_leave',
        content =
          excluded.content,
        created_by = auth.uid(),
        updated_at = now();
    else
      delete from
        public.employee_daily_notes
      where user_id =
            v_request.user_id
        and note_date = v_date
        and day_type =
            'annual_leave';
    end if;
  end loop;

  insert into
    public.employee_notifications (
      user_id,
      type,
      title,
      content,
      related_id
    )
  values (
    v_request.user_id,
    'annual_leave_revoked',
    '연차 승인이 철회되었습니다',
    format(
      '연차(%s ~ %s) 승인이 관리자에 의해 철회되었습니다.',
      v_request.start_date,
      v_request.end_date
    ),
    v_request.id::text
  );

  return jsonb_build_object(
    'id',
    v_request.id::text,
    'status',
    'revoked'
  );
end;
$function$;

-- admin_revoke_approved_leave_request(p_request_id text, p_confirmation text, p_admin_note text)
CREATE OR REPLACE FUNCTION public.admin_revoke_approved_leave_request(p_request_id text, p_confirmation text, p_admin_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_request
    public.employee_requests%rowtype;

  v_date date;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_ONLY';
  end if;

  if trim(
    coalesce(
      p_confirmation,
      ''
    )
  ) <> '철회' then
    raise exception
      'REVOKE_CONFIRMATION_REQUIRED';
  end if;

  select *
  into v_request
  from public.employee_requests
  where id::text = p_request_id
  for update;

  if v_request.id is null then
    raise exception
      'REQUEST_NOT_FOUND';
  end if;

  if v_request.request_type <>
     'annual_leave'
  then
    raise exception
      'ANNUAL_LEAVE_ONLY';
  end if;

  if v_request.status <>
     'approved'
  then
    raise exception
      'APPROVED_REQUEST_ONLY';
  end if;

  update public.employee_requests
  set
    status = 'revoked',

    admin_note =
      case
        when nullif(
          trim(
            coalesce(
              p_admin_note,
              ''
            )
          ),
          ''
        ) is not null
        then concat_ws(
          E'\n',
          nullif(
            trim(admin_note),
            ''
          ),
          '철회 사유: ' ||
          trim(p_admin_note)
        )

        else concat_ws(
          E'\n',
          nullif(
            trim(admin_note),
            ''
          ),
          '관리자에 의해 승인 철회'
        )
      end,

    resolved_at = now(),
    resolved_by = auth.uid()

  where id = v_request.id;

  /*
    해당 연차 기간의 출근부 연차 표시를 제거합니다.

    같은 날짜에 다른 승인된 연차 요청이 있다면
    그 날짜의 연차 표시는 유지합니다.
  */
  for v_date in
    select generate_series(
      v_request.start_date,
      v_request.end_date,
      interval '1 day'
    )::date
  loop
    if not exists (
      select 1
      from public.employee_requests er
      where er.user_id =
            v_request.user_id

        and er.id <>
            v_request.id

        and er.request_type =
            'annual_leave'

        and er.status =
            'approved'

        and v_date between
            er.start_date
            and er.end_date
    ) then
      delete from
        public.employee_daily_notes
      where user_id =
            v_request.user_id

        and note_date =
            v_date

        and day_type =
            'annual_leave';
    end if;
  end loop;

  /*
    직원 앱에 철회 알림 생성
  */
  insert into
    public.employee_notifications (
      user_id,
      type,
      title,
      content,
      related_id
    )
  values (
    v_request.user_id,
    'annual_leave_revoked',
    '연차 승인이 철회되었습니다',

    format(
      '연차 신청(%s ~ %s)의 승인이 철회되었습니다.%s',
      v_request.start_date,
      v_request.end_date,

      case
        when nullif(
          trim(
            coalesce(
              p_admin_note,
              ''
            )
          ),
          ''
        ) is not null

        then E'\n사유: ' ||
             trim(p_admin_note)

        else ''
      end
    ),

    v_request.id::text
  );

  return jsonb_build_object(
    'id',
    v_request.id::text,

    'status',
    'revoked',

    'start_date',
    v_request.start_date,

    'end_date',
    v_request.end_date
  );
end;
$function$;

-- admin_save_attendance_issue_action(p_user_id uuid, p_attendance_id bigint, p_issue_date date, p_issue_type text, p_action_status text, p_reason text, p_memo text)
CREATE OR REPLACE FUNCTION public.admin_save_attendance_issue_action(p_user_id uuid, p_attendance_id bigint, p_issue_date date, p_issue_type text, p_action_status text, p_reason text, p_memo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result_id bigint;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception
      'EMPLOYEE_REQUIRED';
  end if;

  if p_issue_date is null then
    raise exception
      'ISSUE_DATE_REQUIRED';
  end if;

  if p_issue_type not in (
    'late',
    'absent',
    'location_error'
  ) then
    raise exception
      'INVALID_ISSUE_TYPE';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and coalesce(
        u.status,
        'pending'
      ) <> 'deleted'
  ) then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;

  if p_attendance_id is not null
    and not exists (
      select 1
      from public.attendance a
      where a.id =
            p_attendance_id
        and a.user_id =
            p_user_id
    )
  then
    raise exception
      'ATTENDANCE_NOT_FOUND';
  end if;

  insert into
    public.attendance_issue_actions (
      user_id,
      attendance_id,
      issue_date,
      issue_type,
      action_status,
      reason,
      memo,
      created_by,
      updated_at
    )
  values (
    p_user_id,
    p_attendance_id,
    p_issue_date,
    p_issue_type,

    nullif(
      trim(
        coalesce(
          p_action_status,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_memo,
          ''
        )
      ),
      ''
    ),

    auth.uid(),
    now()
  )

  on conflict (
    user_id,
    issue_date,
    issue_type
  )
  do update
  set
    attendance_id =
      excluded.attendance_id,

    action_status =
      excluded.action_status,

    reason =
      excluded.reason,

    memo =
      excluded.memo,

    updated_at =
      now()

  returning id
  into v_result_id;

  return jsonb_build_object(
    'id',
    v_result_id,

    'user_id',
    p_user_id,

    'issue_date',
    p_issue_date,

    'issue_type',
    p_issue_type,

    'saved',
    true
  );
end;
$function$;

-- admin_save_attendance_record(p_attendance_id bigint, p_user_id uuid, p_work_date date, p_workplace_id bigint, p_check_in_time timestamp with time zone, p_check_out_time timestamp with time zone, p_status text, p_edit_reason text, p_memo text)
CREATE OR REPLACE FUNCTION public.admin_save_attendance_record(p_attendance_id bigint, p_user_id uuid, p_work_date date, p_workplace_id bigint, p_check_in_time timestamp with time zone, p_check_out_time timestamp with time zone, p_status text, p_edit_reason text, p_memo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_old public.attendance%rowtype;

  v_attendance_id bigint;
  v_user_id uuid;
  v_workplace_id bigint;

  v_status text;
  v_edit_type text;
  v_editor_name text;

  v_created boolean :=
    false;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception
      'EMPLOYEE_REQUIRED';
  end if;

  if p_work_date is null then
    raise exception
      'WORK_DATE_REQUIRED';
  end if;

  if p_work_date >
     current_date
  then
    raise exception
      'FUTURE_ATTENDANCE_NOT_ALLOWED';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id =
          p_user_id

      and coalesce(
        u.status,
        'pending'
      ) <> 'deleted'
  ) then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;

  if p_workplace_id is not null
    and not exists (
      select 1
      from public.workplaces w
      where w.id =
            p_workplace_id
    )
  then
    raise exception
      'WORKPLACE_NOT_FOUND';
  end if;

  if p_check_in_time is not null
    and timezone(
      'Asia/Seoul',
      p_check_in_time
    )::date <>
        p_work_date
  then
    raise exception
      'CHECK_IN_DATE_MISMATCH';
  end if;

  if p_check_out_time is not null
    and timezone(
      'Asia/Seoul',
      p_check_out_time
    )::date <>
        p_work_date
  then
    raise exception
      'CHECK_OUT_DATE_MISMATCH';
  end if;

  if p_check_in_time is not null
    and p_check_out_time is not null
    and p_check_out_time <
        p_check_in_time
  then
    raise exception
      'CHECK_OUT_BEFORE_CHECK_IN';
  end if;

  if nullif(
    trim(
      coalesce(
        p_edit_reason,
        ''
      )
    ),
    ''
  ) is null then
    raise exception
      'EDIT_REASON_REQUIRED';
  end if;

  v_status :=
    nullif(
      trim(
        coalesce(
          p_status,
          ''
        )
      ),
      ''
    );

  if v_status is null then
    v_status :=
      case
        when p_check_in_time is null
          and p_check_out_time is null
        then 'absent'

        when p_check_in_time is not null
          and p_check_out_time is null
        then 'working'

        else 'done'
      end;
  end if;

  if v_status not in (
    'working',
    'done',
    'normal',
    'late',
    'absent',
    'location_error',
    'early_leave',
    '정상',
    '지각',
    '결근',
    '위치오류'
  ) then
    raise exception
      'INVALID_ATTENDANCE_STATUS';
  end if;

  select coalesce(
    (
      select au.name
      from public.admin_users au
      where au.id =
            auth.uid()
      limit 1
    ),
    auth.jwt() ->> 'email',
    '관리자'
  )
  into v_editor_name;


  /*
    기존 출퇴근 기록 수정
  */
  if p_attendance_id is not null then
    select *
    into v_old

    from public.attendance a

    where a.id =
          p_attendance_id

    for update;

    if v_old.id is null then
      raise exception
        'ATTENDANCE_NOT_FOUND';
    end if;

    if v_old.user_id <>
       p_user_id
    then
      raise exception
        'ATTENDANCE_EMPLOYEE_MISMATCH';
    end if;

    if v_old.work_date <>
       p_work_date
    then
      raise exception
        'ATTENDANCE_DATE_MISMATCH';
    end if;

    v_attendance_id :=
      v_old.id;

    v_user_id :=
      v_old.user_id;

    v_workplace_id :=
      coalesce(
        p_workplace_id,
        v_old.workplace_id
      );

    v_edit_type :=
      case
        when v_old.check_in_time is null
          and p_check_in_time is not null
        then '출근 누락'

        when v_old.check_out_time is null
          and p_check_out_time is not null
        then '퇴근 누락'

        when lower(
          coalesce(
            v_old.status,
            ''
          )
        ) in (
          'location_error',
          'location',
          '위치오류',
          '위치 오류'
        )
        then '위치 오류'

        else '시간 조정'
      end;

    update public.attendance
    set
      workplace_id =
        v_workplace_id,

      check_in_time =
        p_check_in_time,

      check_out_time =
        p_check_out_time,

      status =
        v_status,

      /*
        관리자가 직접 수정했으므로
        자동 퇴근 표시를 해제합니다.
      */
      is_auto_closed =
        false,

      auto_closed_at =
        null,

      auto_close_reason =
        null

    where id =
          v_attendance_id;


  /*
    새로운 출퇴근 기록 추가
  */
  else
    perform pg_advisory_xact_lock(
      hashtextextended(
        p_user_id::text ||
        ':' ||
        p_work_date::text,
        0
      )
    );

    if exists (
      select 1
      from public.attendance a
      where a.user_id =
            p_user_id

        and a.work_date =
            p_work_date
    ) then
      raise exception
        'ATTENDANCE_ALREADY_EXISTS';
    end if;

    v_user_id :=
      p_user_id;

    v_workplace_id :=
      p_workplace_id;

    if v_workplace_id is null then
      select
        wu.workplace_id

      into
        v_workplace_id

      from public.workplace_users wu

      where wu.user_id =
            p_user_id

        and (
          wu.start_date is null
          or wu.start_date <=
             p_work_date
        )

        and (
          wu.end_date is null
          or wu.end_date >=
             p_work_date
        )

      order by
        wu.start_date desc
          nulls last,
        wu.id desc

      limit 1;
    end if;

    insert into public.attendance (
      user_id,
      workplace_id,
      work_date,
      check_in_time,
      check_out_time,
      status,
      is_auto_closed,
      auto_closed_at,
      auto_close_reason
    )
    values (
      v_user_id,
      v_workplace_id,
      p_work_date,
      p_check_in_time,
      p_check_out_time,
      v_status,
      false,
      null,
      null
    )
    returning id
    into v_attendance_id;

    v_edit_type :=
      '기록 추가';

    v_created :=
      true;
  end if;


  /*
    수정 이력 저장
  */
  insert into
    public.attendance_edit_history (
      attendance_id,
      user_id,
      work_date,
      old_check_in_time,
      new_check_in_time,
      old_check_out_time,
      new_check_out_time,
      old_status,
      new_status,
      edit_type,
      edit_reason,
      memo,
      editor_name
    )
  values (
    v_attendance_id,
    v_user_id,
    p_work_date,

    case
      when v_created
      then null
      else v_old.check_in_time
    end,

    p_check_in_time,

    case
      when v_created
      then null
      else v_old.check_out_time
    end,

    p_check_out_time,

    case
      when v_created
      then null
      else v_old.status
    end,

    v_status,
    v_edit_type,
    trim(p_edit_reason),

    nullif(
      trim(
        coalesce(
          p_memo,
          ''
        )
      ),
      ''
    ),

    v_editor_name
  );


  /*
    연차였던 날짜를 일반 근태로 저장하면
    기존 연차 표시를 제거합니다.
  */
  delete from
    public.employee_daily_notes

  where user_id =
        p_user_id

    and note_date =
        p_work_date

    and day_type =
        'annual_leave';


  return jsonb_build_object(
    'attendance_id',
    v_attendance_id,

    'created',
    v_created,

    'status',
    v_status,

    'is_auto_closed',
    false
  );
end;
$function$;

-- admin_save_employee_department(p_department_id bigint, p_name text, p_description text, p_sort_order integer, p_is_active boolean)
CREATE OR REPLACE FUNCTION public.admin_save_employee_department(p_department_id bigint, p_name text, p_description text, p_sort_order integer, p_is_active boolean)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_department_id bigint;
  v_name text;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_REQUIRED';
  end if;

  v_name :=
    nullif(
      btrim(p_name),
      ''
    );

  if v_name is null then
    raise exception
      'DEPARTMENT_NAME_REQUIRED';
  end if;

  /*
    같은 이름의 다른 소속이 있는지 확인
  */
  if exists (
    select 1
    from public.employee_departments d
    where lower(btrim(d.name)) =
          lower(v_name)
      and (
        p_department_id is null
        or d.id <> p_department_id
      )
  ) then
    raise exception
      'DUPLICATE_DEPARTMENT_NAME';
  end if;

  /*
    기존 소속 수정
  */
  if p_department_id is not null then
    update public.employee_departments
    set
      name = v_name,

      description =
        nullif(
          btrim(
            coalesce(
              p_description,
              ''
            )
          ),
          ''
        ),

      sort_order =
        coalesce(
          p_sort_order,
          0
        ),

      is_active =
        coalesce(
          p_is_active,
          true
        ),

      updated_at = now()

    where id = p_department_id

    returning id
    into v_department_id;

    if v_department_id is null then
      raise exception
        'DEPARTMENT_NOT_FOUND';
    end if;

    return v_department_id;
  end if;

  /*
    id에 자동 증가 기본값이 없으므로
    동시에 추가해도 충돌하지 않도록 잠급니다.
  */
  lock table
    public.employee_departments
  in share row exclusive mode;

  select
    coalesce(
      max(id),
      0
    ) + 1
  into v_department_id
  from public.employee_departments;

  insert into
    public.employee_departments (
      id,
      name,
      description,
      sort_order,
      is_active,
      created_at,
      updated_at
    )
  values (
    v_department_id,
    v_name,

    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),

    coalesce(
      p_sort_order,
      0
    ),

    coalesce(
      p_is_active,
      true
    ),

    now(),
    now()
  );

  return v_department_id;
end;
$function$;

-- admin_set_app_approval(p_user_id uuid, p_approved boolean)
CREATE OR REPLACE FUNCTION public.admin_set_app_approval(p_user_id uuid, p_approved boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_session_id uuid;
  v_user_status text;
  v_result_status text;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;


  select status
  into v_user_status
  from public.users
  where id = p_user_id;

  if not found then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;


  if p_approved then
    if coalesce(
      v_user_status,
      'pending'
    ) <> 'active' then
      raise exception
        'EMPLOYEE_NOT_ACTIVE';
    end if;


    -- 가장 최근의 승인 대기 세션 선택
    select s.id
    into v_session_id
    from public.employee_sessions s
    where s.user_id = p_user_id
      and s.approval_status = 'pending'
      and s.revoked_at is null
      and s.expires_at > now()
    order by
      s.approval_requested_at desc,
      s.created_at desc
    limit 1
    for update;


    if v_session_id is null then
      raise exception
        'LOGIN_REQUIRED_BEFORE_APPROVAL';
    end if;


    -- 같은 직원의 이전 승인 대기 요청은 폐기
    update public.employee_sessions
    set
      approval_status = 'revoked',
      revoked_at = now(),
      revoked_reason =
        'superseded_by_new_login'
    where user_id = p_user_id
      and id <> v_session_id
      and approval_status = 'pending'
      and revoked_at is null;


    -- 가장 최근 로그인 세션 승인
    update public.employee_sessions
    set
      approval_status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      revoked_at = null,
      revoked_reason = null
    where id = v_session_id;


    update public.users
    set
      app_approval_status = 'approved',
      app_approved_at = now(),
      app_approved_by = auth.uid(),
      updated_at = now()
    where id = p_user_id;


    insert into public.employee_notifications (
      user_id,
      type,
      title,
      content
    )
    values (
      p_user_id,
      'app_approved',
      '앱 사용이 승인되었습니다',
      '이제 출퇴근 앱의 모든 기능을 사용할 수 있습니다.'
    );


    v_result_status := 'approved';

  else
    -- 승인 해제 시 모든 기기의 세션 사용 중지
    update public.employee_sessions
    set
      approval_status = 'revoked',
      revoked_at = now(),
      revoked_reason = 'admin_revoked'
    where user_id = p_user_id
      and revoked_at is null;


    update public.users
    set
      app_approval_status =
        'not_requested',
      app_approved_at = null,
      app_approved_by = null,
      login_requested_at = null,
      updated_at = now()
    where id = p_user_id;


    v_result_status :=
      'not_requested';
  end if;


  return jsonb_build_object(
    'user_id',
    p_user_id,
    'session_id',
    v_session_id,
    'app_approval_status',
    v_result_status
  );
end;
$function$;

-- admin_set_employee_status(p_user_id uuid, p_status text)
CREATE OR REPLACE FUNCTION public.admin_set_employee_status(p_user_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_PERMISSION_REQUIRED';
  end if;

  if p_status not in (
    'active',
    'inactive',
    'resigned',
    'deleted'
  ) then
    raise exception
      'INVALID_EMPLOYEE_STATUS';
  end if;

  update public.users
  set
    status = p_status,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;

  return p_status;
end;
$function$;

-- admin_set_user_workplace_schedules(p_user_id uuid, p_assignments jsonb)
CREATE OR REPLACE FUNCTION public.admin_set_user_workplace_schedules(p_user_id uuid, p_assignments jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_assignment jsonb;
  v_workplace_id bigint;
  v_work_shift_id bigint;
  v_start_date date;
  v_end_date date;
  v_days_of_week text[];
  v_saved_count integer := 0;
begin
  if not public.is_active_admin() then
    raise exception
      'ADMIN_ONLY';
  end if;

  if not exists (
    select 1
    from public.users
    where id = p_user_id
  ) then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;

  if p_assignments is null then
    p_assignments := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_assignments) <>
     'array'
  then
    raise exception
      'INVALID_ASSIGNMENTS';
  end if;

  /*
    전달된 모든 배정 정보를 먼저 검증합니다.
    검증 실패 시 기존 배정도 그대로 유지됩니다.
  */
  for v_assignment in
    select value
    from jsonb_array_elements(
      p_assignments
    )
  loop
    v_workplace_id :=
      nullif(
        v_assignment
          ->> 'workplace_id',
        ''
      )::bigint;

    v_work_shift_id :=
      nullif(
        v_assignment
          ->> 'work_shift_id',
        ''
      )::bigint;

    v_start_date :=
      nullif(
        v_assignment
          ->> 'start_date',
        ''
      )::date;

    v_end_date :=
      nullif(
        v_assignment
          ->> 'end_date',
        ''
      )::date;

    select coalesce(
      array_agg(value),
      array[]::text[]
    )
    into v_days_of_week
    from jsonb_array_elements_text(
      coalesce(
        v_assignment
          -> 'days_of_week',
        '[]'::jsonb
      )
    );

    if v_workplace_id is null then
      raise exception
        'WORKPLACE_REQUIRED';
    end if;

    if not exists (
      select 1
      from public.workplaces w
      where w.id = v_workplace_id
        and w.is_active = true
    ) then
      raise exception
        'WORKPLACE_NOT_FOUND_OR_INACTIVE';
    end if;

    if (
      v_start_date is not null
      and v_end_date is not null
      and v_end_date < v_start_date
    ) then
      raise exception
        'INVALID_ASSIGNMENT_PERIOD';
    end if;

    if exists (
      select 1
      from unnest(
        v_days_of_week
      ) as selected_day
      where selected_day not in (
        '월',
        '화',
        '수',
        '목',
        '금',
        '토',
        '일'
      )
    ) then
      raise exception
        'INVALID_DAY_OF_WEEK';
    end if;

    if v_work_shift_id is not null
      and not exists (
        select 1
        from public.work_shifts ws
        where ws.id =
              v_work_shift_id
          and ws.workplace_id =
              v_workplace_id
          and ws.is_active = true
      )
    then
      raise exception
        'INVALID_WORK_SHIFT';
    end if;
  end loop;

  /*
    검증 완료 후 기존 배정을 교체합니다.
  */
  delete from public.workplace_users
  where user_id = p_user_id;

  for v_assignment in
    select value
    from jsonb_array_elements(
      p_assignments
    )
  loop
    v_workplace_id :=
      nullif(
        v_assignment
          ->> 'workplace_id',
        ''
      )::bigint;

    v_work_shift_id :=
      nullif(
        v_assignment
          ->> 'work_shift_id',
        ''
      )::bigint;

    v_start_date :=
      nullif(
        v_assignment
          ->> 'start_date',
        ''
      )::date;

    v_end_date :=
      nullif(
        v_assignment
          ->> 'end_date',
        ''
      )::date;

    select coalesce(
      array_agg(value),
      array[]::text[]
    )
    into v_days_of_week
    from jsonb_array_elements_text(
      coalesce(
        v_assignment
          -> 'days_of_week',
        '[]'::jsonb
      )
    );

    insert into public.workplace_users (
      workplace_id,
      user_id,
      start_date,
      end_date,
      days_of_week,
      work_shift_id
    )
    values (
      v_workplace_id,
      p_user_id,
      v_start_date,
      v_end_date,
      v_days_of_week,
      v_work_shift_id
    );

    v_saved_count :=
      v_saved_count + 1;
  end loop;

  return jsonb_build_object(
    'user_id',
    p_user_id,

    'saved_count',
    v_saved_count
  );
end;
$function$;

-- admin_set_user_workplaces(p_user_id uuid, p_workplace_ids text[])
CREATE OR REPLACE FUNCTION public.admin_set_user_workplaces(p_user_id uuid, p_workplace_ids text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  -- 기존 배정 삭제
  delete from public.workplace_users
  where user_id = p_user_id;

  -- 전달받은 문자열과 실제 근무지 ID를 비교해 저장
  insert into public.workplace_users (
    user_id,
    workplace_id
  )
  select
    p_user_id,
    workplace.id
  from public.workplaces workplace
  join unnest(
    coalesce(
      p_workplace_ids,
      array[]::text[]
    )
  ) as selected_id(value)
    on workplace.id::text =
       selected_id.value;
end;
$function$;

-- admin_update_employee_profile(p_user_id uuid, p_name text, p_phone text, p_employee_code text, p_department text)
CREATE OR REPLACE FUNCTION public.admin_update_employee_profile(p_user_id uuid, p_name text, p_phone text, p_employee_code text, p_department text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  updated_employee jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'EMPLOYEE_NAME_REQUIRED';
  end if;

  if nullif(trim(p_phone), '') is null then
    raise exception 'EMPLOYEE_PHONE_REQUIRED';
  end if;

  if nullif(trim(p_employee_code), '') is null then
    raise exception 'EMPLOYEE_CODE_REQUIRED';
  end if;

  update public.users
  set
    name = trim(p_name),
    phone = trim(p_phone),
    employee_code = trim(p_employee_code),
    department = nullif(trim(p_department), ''),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'employee_code', employee_code,
    'department', department,
    'status', status,
    'created_at', created_at
  )
  into updated_employee
  from public.users
  where id = p_user_id;

  return updated_employee;
end;
$function$;

-- admin_update_employee_profile_v2(p_user_id uuid, p_name text, p_phone text, p_department text, p_app_role text)
CREATE OR REPLACE FUNCTION public.admin_update_employee_profile_v2(p_user_id uuid, p_name text, p_phone text, p_department text, p_app_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  if p_app_role not in (
    'employee',
    'team_lead'
  ) then
    raise exception 'INVALID_APP_ROLE';
  end if;

  update public.users
  set
    name = trim(p_name),

    phone = regexp_replace(
      p_phone,
      '[^0-9]',
      '',
      'g'
    ),

    department =
      nullif(
        trim(p_department),
        ''
      ),

    app_role = p_app_role

  where id = p_user_id

  returning jsonb_build_object(
    'name',
    name,

    'phone',
    phone,

    'department',
    department,

    'app_role',
    app_role
  )
  into v_result;

  return v_result;
end;
$function$;

-- create_employee_request_by_session(p_session_token text, p_request_type text, p_title text, p_content text)
CREATE OR REPLACE FUNCTION public.create_employee_request_by_session(p_session_token text, p_request_type text, p_title text, p_content text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_id text;
  v_required_role text;
begin
  if p_request_type not in (
    'general_request',
    'supply_request',
    'phone_change',
    'profile_change'
  ) then
    raise exception
      'INVALID_REQUEST_TYPE';
  end if;

  v_required_role :=
    case
      when p_request_type =
           'supply_request'
        then 'team_lead'
      else null
    end;

  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      v_required_role
    );

  if nullif(
    trim(coalesce(p_title, '')),
    ''
  ) is null then
    raise exception 'TITLE_REQUIRED';
  end if;

  if nullif(
    trim(coalesce(p_content, '')),
    ''
  ) is null then
    raise exception 'CONTENT_REQUIRED';
  end if;

  insert into public.employee_requests (
    user_id,
    request_type,
    title,
    content
  )
  values (
    v_user_id,
    p_request_type,
    trim(p_title),
    trim(p_content)
  )
  returning id::text into v_id;

  return v_id;
end;
$function$;

-- create_employee_request_with_image_by_session(p_session_token text, p_request_type text, p_title text, p_content text, p_image_name text, p_image_mime_type text, p_image_base64 text)
CREATE OR REPLACE FUNCTION public.create_employee_request_with_image_by_session(p_session_token text, p_request_type text, p_title text, p_content text, p_image_name text, p_image_mime_type text, p_image_base64 text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_required_role text;
  v_clean_base64 text;
  v_file_data bytea;
  v_file_size integer;
begin
  if p_request_type not in (
    'supply_request',
    'general_request'
  ) then
    raise exception
      'INVALID_REQUEST_TYPE';
  end if;

  v_required_role :=
    case
      when p_request_type =
           'supply_request'
        then 'team_lead'
      else null
    end;

  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      v_required_role
    );

  if nullif(
    trim(coalesce(p_title, '')),
    ''
  ) is null then
    raise exception 'TITLE_REQUIRED';
  end if;

  if nullif(
    trim(coalesce(p_content, '')),
    ''
  ) is null then
    raise exception 'CONTENT_REQUIRED';
  end if;

  insert into public.employee_requests (
    user_id,
    request_type,
    title,
    content,
    status
  )
  values (
    v_user_id,
    p_request_type,
    trim(p_title),
    trim(p_content),
    'pending'
  )
  returning id into v_request_id;

  if nullif(
    trim(coalesce(
      p_image_base64,
      ''
    )),
    ''
  ) is not null then

    if p_image_mime_type not in (
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      raise exception
        'UNSUPPORTED_IMAGE_TYPE';
    end if;

    -- 지나치게 큰 문자열을 decode하기 전에 차단
    if length(p_image_base64) >
       2200000
    then
      raise exception
        'IMAGE_TOO_LARGE';
    end if;

    begin
      v_clean_base64 :=
        regexp_replace(
          p_image_base64,
          '^data:image/[^;]+;base64,',
          '',
          'i'
        );

      v_clean_base64 :=
        regexp_replace(
          v_clean_base64,
          '\s',
          '',
          'g'
        );

      v_file_data :=
        decode(
          v_clean_base64,
          'base64'
        );

    exception
      when others then
        raise exception
          'INVALID_IMAGE_DATA';
    end;

    v_file_size :=
      octet_length(v_file_data);

    if v_file_size <= 0 then
      raise exception 'EMPTY_IMAGE';
    end if;

    if v_file_size > 1572864 then
      raise exception
        'IMAGE_TOO_LARGE';
    end if;

    insert into
      public.employee_request_attachments (
        request_id,
        file_name,
        mime_type,
        file_size,
        file_data
      )
    values (
      v_request_id,
      left(
        coalesce(
          nullif(
            trim(p_image_name),
            ''
          ),
          'request-image.jpg'
        ),
        255
      ),
      p_image_mime_type,
      v_file_size,
      v_file_data
    );
  end if;

  return v_request_id::text;
end;
$function$;

-- create_employee_session(p_name text, p_phone text)
CREATE OR REPLACE FUNCTION public.create_employee_session(p_name text, p_phone text)
 RETURNS TABLE(session_token text, user_name text, user_status text, user_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user public.users%rowtype;
  v_count integer;
  v_token text :=
    gen_random_uuid()::text;
begin
  select count(*)
  into v_count
  from public.users u
  where lower(trim(u.name)) =
        lower(trim(p_name))

    and regexp_replace(
      coalesce(u.phone, ''),
      '[^0-9]',
      '',
      'g'
    ) =
    regexp_replace(
      coalesce(p_phone, ''),
      '[^0-9]',
      '',
      'g'
    )

    and coalesce(
      u.status,
      'pending'
    ) <> 'deleted';

  if v_count = 0 then
    raise exception
      'EMPLOYEE_NOT_FOUND';
  end if;

  if v_count > 1 then
    raise exception
      'DUPLICATE_EMPLOYEE';
  end if;


  select u.*
  into v_user
  from public.users u
  where lower(trim(u.name)) =
        lower(trim(p_name))

    and regexp_replace(
      coalesce(u.phone, ''),
      '[^0-9]',
      '',
      'g'
    ) =
    regexp_replace(
      coalesce(p_phone, ''),
      '[^0-9]',
      '',
      'g'
    )

    and coalesce(
      u.status,
      'pending'
    ) <> 'deleted'
  limit 1;


  if v_user.status = 'inactive' then
    raise exception
      'ACCOUNT_INACTIVE';
  end if;

  if v_user.status = 'resigned' then
    raise exception
      'ACCOUNT_RESIGNED';
  end if;

  if v_user.status = 'deleted' then
    raise exception
      'ACCOUNT_DELETED';
  end if;

  if coalesce(
    v_user.status,
    'pending'
  ) <> 'active' then
    raise exception
      'ACCOUNT_NOT_ACTIVE';
  end if;


  -- 만료되거나 오래전에 취소된 세션 정리
  delete from public.employee_sessions
  where user_id = v_user.id
    and (
      expires_at < now()
      or (
        revoked_at is not null
        and revoked_at <
            now() - interval '7 days'
      )
    );


  -- 새 로그인은 항상 승인 대기로 시작
  insert into public.employee_sessions (
    user_id,
    session_token,
    expires_at,
    approval_status,
    approval_requested_at
  )
  values (
    v_user.id,
    v_token,
    now() + interval '90 days',
    'pending',
    now()
  );


  -- 관리자 목록 표시용 상태
  update public.users
  set
    app_approval_status = 'pending',
    login_requested_at = now(),
    app_approved_at = null,
    app_approved_by = null,
    updated_at = now()
  where id = v_user.id;


  return query
  select
    v_token,
    v_user.name,
    'pending'::text,
    coalesce(
      v_user.app_role,
      'employee'
    );
end;
$function$;

-- create_leave_request_by_session(p_session_token text, p_start_date date, p_end_date date, p_content text)
CREATE OR REPLACE FUNCTION public.create_leave_request_by_session(p_session_token text, p_start_date date, p_end_date date, p_content text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_id text;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_start_date is null
    or p_end_date is null
    or p_start_date > p_end_date
  then
    raise exception
      'INVALID_DATE_RANGE';
  end if;

  insert into public.employee_requests (
    user_id,
    request_type,
    title,
    content,
    start_date,
    end_date
  )
  values (
    v_user_id,
    'annual_leave',
    '연차 신청',
    trim(coalesce(p_content, '')),
    p_start_date,
    p_end_date
  )
  returning id::text into v_id;

  return v_id;
end;
$function$;

-- employee_check_in(p_session_token text, p_lat numeric, p_lng numeric)
CREATE OR REPLACE FUNCTION public.employee_check_in(p_session_token text, p_lat numeric, p_lng numeric)
 RETURNS SETOF attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;

  v_workplace_id bigint;

  v_shift_id bigint;
  v_shift_start time;
  v_shift_end time;

  v_auto_close_grace_minutes
    integer := 240;

  v_scheduled_check_out_time
    timestamp with time zone;

  v_korea_now timestamp :=
    now() at time zone
    'Asia/Seoul';

  v_today_date date :=
    (
      now() at time zone
      'Asia/Seoul'
    )::date;

  v_today_day text;

  v_existing_id bigint;

  v_attendance_status text :=
    'working';
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_lat is null
    or p_lng is null
    or p_lat < -90
    or p_lat > 90
    or p_lng < -180
    or p_lng > 180
  then
    raise exception
      'INVALID_LOCATION';
  end if;

  /*
    오늘 새 출근을 시작하기 전에
    이전 날짜의 미퇴근 기록을 마감합니다.
  */
  perform
    public
      .auto_close_previous_employee_record(
        v_user_id,
        v_today_date
      );

  v_today_day :=
    case extract(
      isodow
      from v_korea_now
    )
      when 1 then '월'
      when 2 then '화'
      when 3 then '수'
      when 4 then '목'
      when 5 then '금'
      when 6 then '토'
      when 7 then '일'
    end;

  select a.id
  into v_existing_id

  from public.attendance a

  where a.user_id =
        v_user_id

    and a.work_date =
        v_today_date

  limit 1;

  if v_existing_id is not null then
    raise exception
      'ALREADY_CHECKED_IN';
  end if;

  select
    nearest.workplace_id,
    nearest.work_shift_id,
    nearest.shift_start,
    nearest.shift_end,
    nearest.grace_minutes

  into
    v_workplace_id,
    v_shift_id,
    v_shift_start,
    v_shift_end,
    v_auto_close_grace_minutes

  from (
    select
      w.id as workplace_id,

      ws.id as work_shift_id,

      coalesce(
        ws.start_time,
        wu.work_start_time
      ) as shift_start,

      coalesce(
        ws.end_time,
        wu.work_end_time
      ) as shift_end,

      greatest(
        coalesce(
          ws.auto_close_grace_minutes,
          240
        ),
        0
      ) as grace_minutes,

      greatest(
        coalesce(
          w.radius_m,
          100
        ),
        1
      ) as allowed_radius,

      6371000.0 * acos(
        least(
          1.0,
          greatest(
            -1.0,

            sin(
              radians(
                p_lat::double precision
              )
            )
            *
            sin(
              radians(
                w.latitude
                  ::double precision
              )
            )
            +
            cos(
              radians(
                p_lat::double precision
              )
            )
            *
            cos(
              radians(
                w.latitude
                  ::double precision
              )
            )
            *
            cos(
              radians(
                w.longitude
                  ::double precision
                -
                p_lng
                  ::double precision
              )
            )
          )
        )
      ) as distance_m

    from public.workplace_users wu

    join public.workplaces w
      on w.id =
         wu.workplace_id

    left join public.work_shifts ws
      on ws.id =
         wu.work_shift_id

      and ws.workplace_id =
          wu.workplace_id

      and ws.is_active = true

    where wu.user_id =
          v_user_id

      and w.is_active = true

      and w.latitude is not null
      and w.longitude is not null

      and (
        wu.start_date is null
        or wu.start_date <=
           v_today_date
      )

      and (
        wu.end_date is null
        or wu.end_date >=
           v_today_date
      )

      and (
        wu.days_of_week is null

        or coalesce(
          cardinality(
            wu.days_of_week
          ),
          0
        ) = 0

        or v_today_day =
           any(
             wu.days_of_week
           )
      )
  ) nearest

  where nearest.distance_m <=
        nearest.allowed_radius

  order by
    nearest.distance_m

  limit 1;

  if v_workplace_id is null then
    raise exception
      'OUT_OF_WORKPLACE_RANGE_OR_SCHEDULE';
  end if;

  if v_shift_start is not null
    and v_korea_now::time >
        v_shift_start
  then
    v_attendance_status :=
      'late';
  end if;

  v_scheduled_check_out_time :=
    public
      .calculate_shift_check_out_time(
        v_today_date,
        v_shift_start,
        v_shift_end
      );

  return query
  insert into public.attendance (
    user_id,
    workplace_id,
    work_shift_id,
    work_date,
    check_in_time,
    check_in_latitude,
    check_in_longitude,
    status,
    scheduled_check_out_time,
    auto_close_grace_minutes,
    is_auto_closed
  )
  values (
    v_user_id,
    v_workplace_id,
    v_shift_id,
    v_today_date,
    now(),
    p_lat,
    p_lng,
    v_attendance_status,
    v_scheduled_check_out_time,
    v_auto_close_grace_minutes,
    false
  )
  returning *;
end;
$function$;

-- employee_check_out(p_session_token text, p_lat numeric, p_lng numeric)
CREATE OR REPLACE FUNCTION public.employee_check_out(p_session_token text, p_lat numeric, p_lng numeric)
 RETURNS TABLE(id bigint, work_date date, check_in_time timestamp with time zone, check_out_time timestamp with time zone, status text, workplace_id bigint, workplace_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;

  v_attendance_id bigint;

  v_attendance_work_date date;

  v_distance_m
    double precision;

  v_allowed_radius integer;

  v_previous_status text;

  v_today_date date :=
    (
      now() at time zone
      'Asia/Seoul'
    )::date;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_lat is null
    or p_lng is null
    or p_lat < -90
    or p_lat > 90
    or p_lng < -180
    or p_lng > 180
  then
    raise exception
      'INVALID_LOCATION';
  end if;

  /*
    날짜와 관계없이 가장 최근의
    퇴근하지 않은 기록을 찾습니다.
  */
  select
    a.id,
    a.work_date,
    a.status

  into
    v_attendance_id,
    v_attendance_work_date,
    v_previous_status

  from public.attendance a

  where a.user_id =
        v_user_id

    and a.check_in_time
        is not null

    and a.check_out_time
        is null

  order by
    a.check_in_time desc

  limit 1;

  if v_attendance_id is null then
    raise exception
      'NO_WORKING_ATTENDANCE';
  end if;

  /*
    현재 날짜 또는 출근 기록 날짜에
    유효했던 모든 배정지역에서 퇴근 허용
  */
  select
    assigned.distance_m,
    assigned.allowed_radius

  into
    v_distance_m,
    v_allowed_radius

  from (
    select
      6371000.0 * acos(
        least(
          1.0,
          greatest(
            -1.0,

            sin(
              radians(
                p_lat::double precision
              )
            )
            *
            sin(
              radians(
                w.latitude
                  ::double precision
              )
            )
            +
            cos(
              radians(
                p_lat::double precision
              )
            )
            *
            cos(
              radians(
                w.latitude
                  ::double precision
              )
            )
            *
            cos(
              radians(
                w.longitude
                  ::double precision
                -
                p_lng
                  ::double precision
              )
            )
          )
        )
      ) as distance_m,

      greatest(
        coalesce(
          w.radius_m,
          100
        ),
        1
      ) as allowed_radius

    from public.workplace_users wu

    join public.workplaces w
      on w.id =
         wu.workplace_id

    where wu.user_id =
          v_user_id

      and w.is_active = true

      and w.latitude is not null
      and w.longitude is not null

      and (
        (
          wu.start_date is null
          or wu.start_date <=
             v_today_date
        )

        and (
          wu.end_date is null
          or wu.end_date >=
             v_today_date
        )
      )

      or (
        wu.user_id =
        v_user_id

        and w.is_active = true

        and w.latitude is not null
        and w.longitude is not null

        and (
          wu.start_date is null
          or wu.start_date <=
             v_attendance_work_date
        )

        and (
          wu.end_date is null
          or wu.end_date >=
             v_attendance_work_date
        )
      )
  ) assigned

  order by
    assigned.distance_m

  limit 1;

  if v_distance_m is null
    or v_allowed_radius is null
    or v_distance_m >
       v_allowed_radius
  then
    raise exception
      'OUT_OF_ASSIGNED_WORKPLACE_RANGE';
  end if;

  update public.attendance a

  set
    check_out_time =
      now(),

    check_out_latitude =
      p_lat,

    check_out_longitude =
      p_lng,

    status =
      case
        when v_previous_status in (
          'late',
          '지각'
        )
        then 'late'

        else 'done'
      end,

    is_auto_closed =
      false,

    auto_closed_at =
      null,

    auto_close_reason =
      null

  where a.id =
        v_attendance_id;

  return query
  select
    a.id,
    a.work_date,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.workplace_id,
    w.name

  from public.attendance a

  left join public.workplaces w
    on w.id =
       a.workplace_id

  where a.id =
        v_attendance_id;
end;
$function$;

-- employee_log_location_error(p_session_token text, p_lat numeric, p_lng numeric)
CREATE OR REPLACE FUNCTION public.employee_log_location_error(p_session_token text, p_lat numeric, p_lng numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;

  v_workplace_id bigint;

  v_distance_m
    double precision;

  v_allowed_radius integer;

  v_korea_date date :=
    (
      now() at time zone
      'Asia/Seoul'
    )::date;

  v_issue_date date :=
    (
      (
        now() at time zone
        'Asia/Seoul'
      )
      -
      interval '6 hours'
    )::date;

  v_attempt_id bigint;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_lat is null
    or p_lng is null
    or p_lat < -90
    or p_lat > 90
    or p_lng < -180
    or p_lng > 180
  then
    raise exception
      'INVALID_LOCATION';
  end if;

  /*
    현재 배정된 근무지 중
    시도 위치와 가장 가까운 곳을 찾습니다.
  */
  select
    nearest.workplace_id,
    nearest.distance_m,
    nearest.allowed_radius

  into
    v_workplace_id,
    v_distance_m,
    v_allowed_radius

  from (
    select
      w.id
        as workplace_id,

      greatest(
        coalesce(
          w.radius_m,
          100
        ),
        1
      ) as allowed_radius,

      6371000.0 * acos(
        least(
          1.0,
          greatest(
            -1.0,

            sin(
              radians(
                p_lat::double precision
              )
            )
            *
            sin(
              radians(
                w.latitude
                  ::double precision
              )
            )
            +
            cos(
              radians(
                p_lat::double precision
              )
            )
            *
            cos(
              radians(
                w.latitude
                  ::double precision
              )
            )
            *
            cos(
              radians(
                w.longitude
                  ::double precision
                -
                p_lng
                  ::double precision
              )
            )
          )
        )
      ) as distance_m

    from
      public.workplace_users wu

    join public.workplaces w
      on w.id =
         wu.workplace_id

    where
      wu.user_id =
      v_user_id

      and w.is_active = true

      and w.latitude is not null
      and w.longitude is not null

      and (
        wu.start_date is null
        or wu.start_date <=
           v_korea_date
      )

      and (
        wu.end_date is null
        or wu.end_date >=
           v_korea_date
      )
  ) nearest

  order by
    nearest.distance_m

  limit 1;

  insert into
    public.attendance_location_attempts (
      user_id,
      attempt_date,
      attempted_at,
      latitude,
      longitude,
      nearest_workplace_id,
      distance_m,
      allowed_radius
    )
  values (
    v_user_id,
    v_issue_date,
    now(),
    p_lat,
    p_lng,
    v_workplace_id,
    v_distance_m,
    v_allowed_radius
  )
  returning id
  into v_attempt_id;

  return jsonb_build_object(
    'id',
    v_attempt_id,

    'recorded',
    true,

    'nearest_workplace_id',
    v_workplace_id,

    'distance_m',
    v_distance_m,

    'allowed_radius',
    v_allowed_radius
  );
end;
$function$;

-- get_employee_by_session(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_employee_by_session(p_session_token text)
 RETURNS TABLE(id uuid, name text, phone text, employee_code text, department text, status text, job_title text, app_role text, app_approval_status text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    u.id,
    u.name,
    u.phone,
    u.employee_code,
    u.department,

    case
      when coalesce(
        u.status,
        'pending'
      ) <> 'active'
        then coalesce(
          u.status,
          'inactive'
        )

      when s.approval_status =
           'approved'
        then 'active'

      else 'pending'
    end,

    null::text,

    coalesce(
      u.app_role,
      'employee'
    ),

    s.approval_status,

    u.created_at

  from public.employee_sessions s

  join public.users u
    on u.id = s.user_id

  where s.session_token =
        p_session_token

    and s.expires_at > now()

    and s.revoked_at is null

    and s.approval_status in (
      'pending',
      'approved'
    )

  limit 1;
$function$;

-- get_my_cleaning_checklist(p_session_token text, p_workplace_id text)
CREATE OR REPLACE FUNCTION public.get_my_cleaning_checklist(p_session_token text, p_workplace_id text)
 RETURNS TABLE(id text, label text, source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_workplace_id bigint;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      'team_lead'
    );

  v_workplace_id :=
    public.require_assigned_workplace(
      v_user_id,
      p_workplace_id
    );

  return query
  select
    rows.item_id,
    rows.item_label,
    rows.item_source

  from (
    select
      i.id::text as item_id,
      i.label as item_label,
      'assigned'::text
        as item_source,
      0 as source_order,
      coalesce(
        wi.sort_order,
        0
      ) as item_order

    from public.workplace_checklist_items wi

    join public.checklist_items i
      on i.id = wi.item_id

    where wi.workplace_id::text =
          v_workplace_id::text

      and i.active = true

    union all

    select
      c.id::text,
      c.label,
      'custom'::text,
      1,
      0

    from public.employee_custom_checklist_items c

    where c.workplace_id::text =
          v_workplace_id::text

      and c.user_id = v_user_id
  ) rows

  order by
    rows.source_order,
    rows.item_order,
    rows.item_label;
end;
$function$;

-- get_my_cleaning_submissions(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_cleaning_submissions(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      'team_lead'
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        s.id::text,

        'workplace_id',
        s.workplace_id::text,

        'workplace_name',
        coalesce(
          w.name,
          '삭제된 현장'
        ),

        'work_date',
        s.work_date,

        'items',
        coalesce(
          s.checked_items,
          '[]'::jsonb
        ),

        'note',
        s.note,

        'created_at',
        s.created_at
      )
      order by s.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result

  from public.cleaning_checklist_submissions s

  left join public.workplaces w
    on w.id::text =
       s.workplace_id::text

  where s.user_id =
        v_user_id;

  return v_result;
end;
$function$;

-- get_my_employee_requests(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_employee_requests(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        r.id::text,

        'request_type',
        r.request_type,

        'title',
        r.title,

        'content',
        r.content,

        'start_date',
        r.start_date,

        'end_date',
        r.end_date,

        'status',
        coalesce(
          r.status,
          'pending'
        ),

        'admin_note',
        r.admin_note,

        'created_at',
        r.created_at,

        'resolved_at',
        r.resolved_at
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result

  from public.employee_requests r

  where r.user_id =
        v_user_id;

  return v_result;
end;
$function$;

-- get_my_monthly_attendance(p_session_token text, p_start_date date, p_end_date date)
CREATE OR REPLACE FUNCTION public.get_my_monthly_attendance(p_session_token text, p_start_date date, p_end_date date)
 RETURNS SETOF attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_start_date is null
    or p_end_date is null
    or p_start_date > p_end_date
    or p_end_date - p_start_date > 370
  then
    raise exception
      'INVALID_DATE_RANGE';
  end if;

  return query
  select a.*
  from public.attendance a
  where a.user_id = v_user_id
    and a.work_date between
        p_start_date and p_end_date
  order by a.work_date;
end;
$function$;

-- get_my_monthly_day_notes(p_session_token text, p_start_date date, p_end_date date)
CREATE OR REPLACE FUNCTION public.get_my_monthly_day_notes(p_session_token text, p_start_date date, p_end_date date)
 RETURNS TABLE(note_date date, day_type text, content text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  if p_start_date is null
    or p_end_date is null
    or p_start_date > p_end_date
    or p_end_date - p_start_date > 370
  then
    raise exception
      'INVALID_DATE_RANGE';
  end if;

  return query
  select
    n.note_date,
    n.day_type,
    n.content

  from public.employee_daily_notes n

  where n.user_id = v_user_id

    and n.note_date between
        p_start_date and p_end_date

  order by n.note_date;
end;
$function$;

-- get_my_notices_by_session(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_notices_by_session(p_session_token text)
 RETURNS TABLE(id bigint, title text, content text, target text, important boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_department text;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  select u.department
  into v_department
  from public.users u
  where u.id = v_user_id;

  return query
  select
    n.id,
    n.title,
    n.content,
    n.target,
    coalesce(n.important, false),
    n.created_at
  from public.notices n
  where n.status = '게시중'
    and (
      trim(coalesce(n.target, '')) in (
        '전체 직원',
        '전체',
        '전 직원',
        '모든 직원',
        'all'
      )

      or trim(coalesce(n.target, '')) =
         trim(coalesce(v_department, ''))

      or exists (
        select 1
        from public.workplace_users wu

        join public.workplaces w
          on w.id = wu.workplace_id

        where wu.user_id = v_user_id
          and w.name =
              trim(coalesce(n.target, ''))

          and (
            wu.start_date is null
            or wu.start_date <=
               (now() at time zone
                'Asia/Seoul')::date
          )

          and (
            wu.end_date is null
            or wu.end_date >=
               (now() at time zone
                'Asia/Seoul')::date
          )
      )
    )
  order by
    coalesce(n.important, false) desc,
    n.created_at desc
  limit 50;
end;
$function$;

-- get_my_notifications(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_notifications(p_session_token text)
 RETURNS TABLE(id uuid, type text, title text, content text, read_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  return query
  select
    n.id,
    n.type,
    n.title,
    n.content,
    n.read_at,
    n.created_at

  from public.employee_notifications n

  where n.user_id = v_user_id

  order by n.created_at desc

  limit 30;
end;
$function$;

-- get_my_submission_history(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_submission_history(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_requests jsonb;
  v_checklists jsonb;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'request_type', r.request_type,
        'title', r.title,
        'content', r.content,
        'status', r.status,
        'start_date', r.start_date,
        'end_date', r.end_date,
        'admin_note', r.admin_note,
        'created_at', r.created_at,
        'resolved_at', r.resolved_at
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  )
  into v_requests
  from public.employee_requests r
  where r.user_id = v_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'workplace_id', s.workplace_id,
        'workplace_name',
          coalesce(
            w.name,
            '삭제된 현장'
          ),
        'work_date', s.work_date,
        'checked_items', s.checked_items,
        'note', s.note,
        'created_at', s.created_at
      )
      order by s.created_at desc
    ),
    '[]'::jsonb
  )
  into v_checklists
  from public.cleaning_checklist_submissions s

  left join public.workplaces w
    on w.id::text =
       s.workplace_id

  where s.user_id = v_user_id;

  return jsonb_build_object(
    'requests', v_requests,
    'checklists', v_checklists
  );
end;
$function$;

-- get_my_today_attendance(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_today_attendance(p_session_token text)
 RETURNS TABLE(id bigint, work_date date, check_in_time timestamp with time zone, check_out_time timestamp with time zone, status text, workplace_id bigint, workplace_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET "TimeZone" TO 'Asia/Seoul'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  return query
  select
    a.id,
    a.work_date,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.workplace_id,
    w.name

  from public.attendance a

  left join public.workplaces w
    on w.id =
       a.workplace_id

  where a.user_id =
        v_user_id

    and (
      a.work_date =
      current_date

      or (
        a.check_in_time
          is not null

        and a.check_out_time
          is null

        and a.scheduled_check_out_time
          is not null

        and now() <=
            (
              a.scheduled_check_out_time
              +
              (
                greatest(
                  a.auto_close_grace_minutes,
                  0
                )
                *
                interval '1 minute'
              )
            )
      )
    )

  order by
    case
      when a.check_in_time
           is not null

        and a.check_out_time
            is null
      then 0

      else 1
    end,

    a.check_in_time desc
      nulls last

  limit 1;
end;
$function$;

-- get_my_workplaces(p_session_token text)
CREATE OR REPLACE FUNCTION public.get_my_workplaces(p_session_token text)
 RETURNS TABLE(workplace_id bigint, workplace_name text, workplace_address text, latitude numeric, longitude numeric, radius_m integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET "TimeZone" TO 'Asia/Seoul'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  return query
  select
    w.id,
    w.name,
    w.address,
    w.latitude,
    w.longitude,
    w.radius_m
  from public.workplace_users wu
  join public.workplaces w
    on w.id = wu.workplace_id
  where wu.user_id = v_user_id
    and w.is_active = true
    and (
      wu.start_date is null
      or wu.start_date <= current_date
    )
    and (
      wu.end_date is null
      or wu.end_date >= current_date
    )
  order by w.name;
end;
$function$;

-- logout_employee_session(p_session_token text)
CREATE OR REPLACE FUNCTION public.logout_employee_session(p_session_token text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  delete from public.employee_sessions
  where session_token =
        p_session_token;
$function$;

-- mark_my_notification_read(p_session_token text, p_notification_id uuid)
CREATE OR REPLACE FUNCTION public.mark_my_notification_read(p_session_token text, p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token
    );

  update public.employee_notifications
  set read_at = now()
  where id = p_notification_id
    and user_id = v_user_id;
end;
$function$;

-- submit_cleaning_checklist(p_session_token text, p_workplace_id text, p_checked_items jsonb, p_note text)
CREATE OR REPLACE FUNCTION public.submit_cleaning_checklist(p_session_token text, p_workplace_id text, p_checked_items jsonb, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_workplace_id bigint;
  v_submission_id uuid;

  v_item jsonb;
  v_item_id text;
  v_item_source text;
  v_item_rating text;
  v_item_label text;
  v_item_key text;

  v_seen_items text[] :=
    array[]::text[];

  v_normalized_items jsonb :=
    '[]'::jsonb;
begin
  v_user_id :=
    public.require_active_employee_session(
      p_session_token,
      'team_lead'
    );

  v_workplace_id :=
    public.require_assigned_workplace(
      v_user_id,
      p_workplace_id
    );

  if p_checked_items is null
    or jsonb_typeof(
      p_checked_items
    ) <> 'array'
  then
    raise exception
      'INVALID_CHECKLIST_DATA';
  end if;

  if jsonb_array_length(
    p_checked_items
  ) = 0 then
    raise exception
      'EMPTY_CHECKLIST';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(
      p_checked_items
    )
  loop
    if jsonb_typeof(v_item) <>
       'object'
    then
      raise exception
        'INVALID_CHECKLIST_ITEM';
    end if;

    v_item_id :=
      nullif(
        trim(
          coalesce(
            v_item ->> 'id',
            ''
          )
        ),
        ''
      );

    v_item_source :=
      nullif(
        trim(
          coalesce(
            v_item ->> 'source',
            ''
          )
        ),
        ''
      );

    v_item_rating :=
      nullif(
        trim(
          coalesce(
            v_item ->> 'rating',
            ''
          )
        ),
        ''
      );

    if v_item_id is null then
      raise exception
        'CHECKLIST_ITEM_ID_REQUIRED';
    end if;

    if v_item_source not in (
      'assigned',
      'custom'
    ) then
      raise exception
        'INVALID_CHECKLIST_SOURCE';
    end if;

    if v_item_rating not in (
      'poor',
      'fair',
      'good'
    ) then
      raise exception
        'INVALID_CHECKLIST_RATING';
    end if;

    v_item_key :=
      v_item_source ||
      ':' ||
      v_item_id;

    if v_item_key =
       any(v_seen_items)
    then
      raise exception
        'DUPLICATE_CHECKLIST_ITEM';
    end if;

    v_seen_items :=
      array_append(
        v_seen_items,
        v_item_key
      );

    v_item_label := null;

    if v_item_source =
       'assigned'
    then
      select i.label
      into v_item_label
      from public.workplace_checklist_items wi

      join public.checklist_items i
        on i.id = wi.item_id

      where
        wi.workplace_id::text =
        v_workplace_id::text

        and i.id::text =
            v_item_id

        and i.active = true

      limit 1;
    else
      select c.label
      into v_item_label
      from public.employee_custom_checklist_items c

      where
        c.id::text =
        v_item_id

        and c.user_id =
            v_user_id

        and c.workplace_id::text =
            v_workplace_id::text

      limit 1;
    end if;

    if v_item_label is null then
      raise exception
        'CHECKLIST_ITEM_NOT_ALLOWED';
    end if;

    v_normalized_items :=
      v_normalized_items ||
      jsonb_build_array(
        jsonb_build_object(
          'id',
          v_item_id,

          'source',
          v_item_source,

          'label',
          v_item_label,

          'rating',
          v_item_rating
        )
      );
  end loop;

  insert into
    public.cleaning_checklist_submissions (
      user_id,
      workplace_id,
      checked_items,
      note
    )
  values (
    v_user_id,
    v_workplace_id::text,
    v_normalized_items,

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    )
  )
  returning id
  into v_submission_id;

  return v_submission_id;
end;
$function$;

-- Restore exact API execution privileges.

revoke all on function public.is_active_admin() from public, anon, authenticated;
grant execute on function public.is_active_admin() to authenticated;

revoke all on function public.require_active_employee_session(p_session_token text, p_required_app_role text) from public, anon, authenticated;

revoke all on function public.require_assigned_workplace(p_user_id uuid, p_workplace_id text) from public, anon, authenticated;

revoke all on function public.calculate_shift_check_out_time(p_work_date date, p_start_time time without time zone, p_end_time time without time zone) from public, anon, authenticated;
grant execute on function public.calculate_shift_check_out_time(p_work_date date, p_start_time time without time zone, p_end_time time without time zone) to anon, authenticated;

revoke all on function public.is_assigned_workday(p_days text[], p_work_date date) from public, anon, authenticated;
grant execute on function public.is_assigned_workday(p_days text[], p_work_date date) to anon, authenticated;

revoke all on function public.internal_get_photo_storage_status() from public, anon, authenticated;

revoke all on function public.set_work_management_updated_at() from public, anon, authenticated;
grant execute on function public.set_work_management_updated_at() to anon, authenticated;

revoke all on function public.ensure_daily_note_content() from public, anon, authenticated;
grant execute on function public.ensure_daily_note_content() to anon, authenticated;

revoke all on function public.delete_employee_sessions_before_user_delete() from public, anon, authenticated;
grant execute on function public.delete_employee_sessions_before_user_delete() to anon, authenticated;

revoke all on function public.revoke_previous_employee_sessions() from public, anon, authenticated;
grant execute on function public.revoke_previous_employee_sessions() to anon, authenticated;

revoke all on function public.revoke_employee_sessions_on_status_change() from public, anon, authenticated;
grant execute on function public.revoke_employee_sessions_on_status_change() to anon, authenticated;

revoke all on function public.auto_close_previous_employee_record(p_user_id uuid, p_current_work_date date) from public, anon, authenticated;

revoke all on function public.auto_close_overdue_attendance() from public, anon, authenticated;

revoke all on function public.add_my_checklist_item(p_session_token text, p_workplace_id text, p_label text) from public, anon, authenticated;
grant execute on function public.add_my_checklist_item(p_session_token text, p_workplace_id text, p_label text) to anon, authenticated;

revoke all on function public.admin_convert_attendance_to_annual_leave(p_user_id uuid, p_work_date date, p_memo text) from public, anon, authenticated;
grant execute on function public.admin_convert_attendance_to_annual_leave(p_user_id uuid, p_work_date date, p_memo text) to anon, authenticated;

revoke all on function public.admin_delete_employee_department(p_department_id bigint) from public, anon, authenticated;
grant execute on function public.admin_delete_employee_department(p_department_id bigint) to anon, authenticated;

revoke all on function public.admin_delete_employee_permanently(p_user_id uuid, p_confirmation text) from public, anon, authenticated;
grant execute on function public.admin_delete_employee_permanently(p_user_id uuid, p_confirmation text) to authenticated;

revoke all on function public.admin_get_attendance_edit_history(p_limit integer) from public, anon, authenticated;
grant execute on function public.admin_get_attendance_edit_history(p_limit integer) to authenticated;

revoke all on function public.admin_get_attendance_edit_rows(p_work_date date) from public, anon, authenticated;
grant execute on function public.admin_get_attendance_edit_rows(p_work_date date) to anon, authenticated;

revoke all on function public.admin_get_attendance_issue_actions(p_issue_date date) from public, anon, authenticated;
grant execute on function public.admin_get_attendance_issue_actions(p_issue_date date) to anon, authenticated;

revoke all on function public.admin_get_attendance_location_errors(p_issue_date date) from public, anon, authenticated;
grant execute on function public.admin_get_attendance_location_errors(p_issue_date date) to anon, authenticated;

revoke all on function public.admin_get_employee_request_detail(p_request_id text) from public, anon, authenticated;
grant execute on function public.admin_get_employee_request_detail(p_request_id text) to anon, authenticated;

revoke all on function public.admin_get_employee_requests() from public, anon, authenticated;
grant execute on function public.admin_get_employee_requests() to anon, authenticated;

revoke all on function public.admin_get_employees() from public, anon, authenticated;
grant execute on function public.admin_get_employees() to authenticated;

revoke all on function public.admin_get_employees_v2() from public, anon, authenticated;
grant execute on function public.admin_get_employees_v2() to anon, authenticated;

revoke all on function public.admin_get_photo_storage_status() from public, anon, authenticated;
grant execute on function public.admin_get_photo_storage_status() to anon, authenticated;

revoke all on function public.admin_get_uploads(p_parent_type text, p_parent_id text) from public, anon, authenticated;
grant execute on function public.admin_get_uploads(p_parent_type text, p_parent_id text) to anon, authenticated;

revoke all on function public.admin_resolve_employee_request(p_request_id text, p_status text, p_admin_note text) from public, anon, authenticated;
grant execute on function public.admin_resolve_employee_request(p_request_id text, p_status text, p_admin_note text) to anon, authenticated;

revoke all on function public.admin_revoke_annual_leave(p_request_id text, p_confirmation text, p_admin_note text) from public, anon, authenticated;
grant execute on function public.admin_revoke_annual_leave(p_request_id text, p_confirmation text, p_admin_note text) to anon, authenticated;

revoke all on function public.admin_revoke_approved_leave_request(p_request_id text, p_confirmation text, p_admin_note text) from public, anon, authenticated;
grant execute on function public.admin_revoke_approved_leave_request(p_request_id text, p_confirmation text, p_admin_note text) to anon, authenticated;

revoke all on function public.admin_save_attendance_issue_action(p_user_id uuid, p_attendance_id bigint, p_issue_date date, p_issue_type text, p_action_status text, p_reason text, p_memo text) from public, anon, authenticated;
grant execute on function public.admin_save_attendance_issue_action(p_user_id uuid, p_attendance_id bigint, p_issue_date date, p_issue_type text, p_action_status text, p_reason text, p_memo text) to anon, authenticated;

revoke all on function public.admin_save_attendance_record(p_attendance_id bigint, p_user_id uuid, p_work_date date, p_workplace_id bigint, p_check_in_time timestamp with time zone, p_check_out_time timestamp with time zone, p_status text, p_edit_reason text, p_memo text) from public, anon, authenticated;
grant execute on function public.admin_save_attendance_record(p_attendance_id bigint, p_user_id uuid, p_work_date date, p_workplace_id bigint, p_check_in_time timestamp with time zone, p_check_out_time timestamp with time zone, p_status text, p_edit_reason text, p_memo text) to authenticated;

revoke all on function public.admin_save_employee_department(p_department_id bigint, p_name text, p_description text, p_sort_order integer, p_is_active boolean) from public, anon, authenticated;
grant execute on function public.admin_save_employee_department(p_department_id bigint, p_name text, p_description text, p_sort_order integer, p_is_active boolean) to anon, authenticated;

revoke all on function public.admin_set_app_approval(p_user_id uuid, p_approved boolean) from public, anon, authenticated;
grant execute on function public.admin_set_app_approval(p_user_id uuid, p_approved boolean) to anon, authenticated;

revoke all on function public.admin_set_employee_status(p_user_id uuid, p_status text) from public, anon, authenticated;
grant execute on function public.admin_set_employee_status(p_user_id uuid, p_status text) to authenticated;

revoke all on function public.admin_set_user_workplace_schedules(p_user_id uuid, p_assignments jsonb) from public, anon, authenticated;
grant execute on function public.admin_set_user_workplace_schedules(p_user_id uuid, p_assignments jsonb) to authenticated;

revoke all on function public.admin_set_user_workplaces(p_user_id uuid, p_workplace_ids text[]) from public, anon, authenticated;
grant execute on function public.admin_set_user_workplaces(p_user_id uuid, p_workplace_ids text[]) to authenticated;

revoke all on function public.admin_update_employee_profile(p_user_id uuid, p_name text, p_phone text, p_employee_code text, p_department text) from public, anon, authenticated;
grant execute on function public.admin_update_employee_profile(p_user_id uuid, p_name text, p_phone text, p_employee_code text, p_department text) to authenticated;

revoke all on function public.admin_update_employee_profile_v2(p_user_id uuid, p_name text, p_phone text, p_department text, p_app_role text) from public, anon, authenticated;
grant execute on function public.admin_update_employee_profile_v2(p_user_id uuid, p_name text, p_phone text, p_department text, p_app_role text) to anon, authenticated;

revoke all on function public.create_employee_request_by_session(p_session_token text, p_request_type text, p_title text, p_content text) from public, anon, authenticated;
grant execute on function public.create_employee_request_by_session(p_session_token text, p_request_type text, p_title text, p_content text) to anon, authenticated;

revoke all on function public.create_employee_request_with_image_by_session(p_session_token text, p_request_type text, p_title text, p_content text, p_image_name text, p_image_mime_type text, p_image_base64 text) from public, anon, authenticated;
grant execute on function public.create_employee_request_with_image_by_session(p_session_token text, p_request_type text, p_title text, p_content text, p_image_name text, p_image_mime_type text, p_image_base64 text) to anon, authenticated;

revoke all on function public.create_employee_session(p_name text, p_phone text) from public, anon, authenticated;
grant execute on function public.create_employee_session(p_name text, p_phone text) to anon, authenticated;

revoke all on function public.create_leave_request_by_session(p_session_token text, p_start_date date, p_end_date date, p_content text) from public, anon, authenticated;
grant execute on function public.create_leave_request_by_session(p_session_token text, p_start_date date, p_end_date date, p_content text) to anon, authenticated;

revoke all on function public.employee_check_in(p_session_token text, p_lat numeric, p_lng numeric) from public, anon, authenticated;
grant execute on function public.employee_check_in(p_session_token text, p_lat numeric, p_lng numeric) to anon, authenticated;

revoke all on function public.employee_check_out(p_session_token text, p_lat numeric, p_lng numeric) from public, anon, authenticated;
grant execute on function public.employee_check_out(p_session_token text, p_lat numeric, p_lng numeric) to anon, authenticated;

revoke all on function public.employee_log_location_error(p_session_token text, p_lat numeric, p_lng numeric) from public, anon, authenticated;
grant execute on function public.employee_log_location_error(p_session_token text, p_lat numeric, p_lng numeric) to anon, authenticated;

revoke all on function public.get_employee_by_session(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_employee_by_session(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_cleaning_checklist(p_session_token text, p_workplace_id text) from public, anon, authenticated;
grant execute on function public.get_my_cleaning_checklist(p_session_token text, p_workplace_id text) to anon, authenticated;

revoke all on function public.get_my_cleaning_submissions(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_cleaning_submissions(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_employee_requests(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_employee_requests(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_monthly_attendance(p_session_token text, p_start_date date, p_end_date date) from public, anon, authenticated;
grant execute on function public.get_my_monthly_attendance(p_session_token text, p_start_date date, p_end_date date) to anon, authenticated;

revoke all on function public.get_my_monthly_day_notes(p_session_token text, p_start_date date, p_end_date date) from public, anon, authenticated;
grant execute on function public.get_my_monthly_day_notes(p_session_token text, p_start_date date, p_end_date date) to anon, authenticated;

revoke all on function public.get_my_notices_by_session(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_notices_by_session(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_notifications(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_notifications(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_submission_history(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_submission_history(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_today_attendance(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_today_attendance(p_session_token text) to anon, authenticated;

revoke all on function public.get_my_workplaces(p_session_token text) from public, anon, authenticated;
grant execute on function public.get_my_workplaces(p_session_token text) to anon, authenticated;

revoke all on function public.logout_employee_session(p_session_token text) from public, anon, authenticated;
grant execute on function public.logout_employee_session(p_session_token text) to anon, authenticated;

revoke all on function public.mark_my_notification_read(p_session_token text, p_notification_id uuid) from public, anon, authenticated;
grant execute on function public.mark_my_notification_read(p_session_token text, p_notification_id uuid) to anon, authenticated;

revoke all on function public.submit_cleaning_checklist(p_session_token text, p_workplace_id text, p_checked_items jsonb, p_note text) from public, anon, authenticated;
grant execute on function public.submit_cleaning_checklist(p_session_token text, p_workplace_id text, p_checked_items jsonb, p_note text) to anon;

-- Recreate non-internal triggers without duplicating them.

drop trigger if exists zz_ensure_daily_note_content on public.employee_daily_notes;
create trigger zz_ensure_daily_note_content before insert or update of content on public.employee_daily_notes for each row execute function public.ensure_daily_note_content();

drop trigger if exists revoke_previous_employee_sessions_trigger on public.employee_sessions;
create trigger revoke_previous_employee_sessions_trigger before insert on public.employee_sessions for each row execute function public.revoke_previous_employee_sessions();

drop trigger if exists set_job_positions_updated_at on public.job_positions;
create trigger set_job_positions_updated_at before update on public.job_positions for each row execute function public.set_work_management_updated_at();

drop trigger if exists delete_employee_sessions_trigger on public.users;
create trigger delete_employee_sessions_trigger before delete on public.users for each row execute function public.delete_employee_sessions_before_user_delete();

drop trigger if exists revoke_employee_sessions_on_status_change_trigger on public.users;
create trigger revoke_employee_sessions_on_status_change_trigger before update of status on public.users for each row execute function public.revoke_employee_sessions_on_status_change();

drop trigger if exists revoke_employee_sessions_status_trigger on public.users;
create trigger revoke_employee_sessions_status_trigger after update of status on public.users for each row when (old.status is distinct from new.status) execute function public.revoke_employee_sessions_on_status_change();

drop trigger if exists set_work_shifts_updated_at on public.work_shifts;
create trigger set_work_shifts_updated_at before update on public.work_shifts for each row execute function public.set_work_management_updated_at();

set check_function_bodies = true;

commit;

-- pg_cron must already be enabled in the destination Supabase project.
do $migration$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname =
          'auto-close-overdue-attendance'
  loop
    perform cron.unschedule(
      v_job_id
    );
  end loop;

  perform cron.schedule(
    'auto-close-overdue-attendance',
    '*/30 * * * *',
    $cron$
      select
        public.auto_close_overdue_attendance();
    $cron$
  );
end;
$migration$;
