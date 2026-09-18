-- Run after schema.sql, in a fresh SQL Editor query, to confirm every
-- object landed. Expected counts: 3 tables, 6 functions, 7 triggers,
-- 9 RLS policies, 3 indexes (2 on sadhana_records + 1 unique on profiles).

select 'tables' as object_type, count(*) as found
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'sadhana_records', 'autofill_templates')

union all

select 'functions', count(*)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_updated_at', 'handle_new_user', 'is_admin',
                     'prevent_role_self_escalation', 'prevent_duplicate_email',
                     'sync_profile_email')

union all

select 'triggers', count(*)
from information_schema.triggers
where trigger_schema in ('public', 'auth')
  and trigger_name in ('profiles_set_updated_at', 'sadhana_records_set_updated_at',
                        'autofill_templates_set_updated_at', 'on_auth_user_created',
                        'profiles_prevent_role_escalation',
                        'auth_users_prevent_duplicate_email',
                        'on_auth_user_email_changed')

union all

select 'rls_policies', count(*)
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'sadhana_records', 'autofill_templates')

union all

select 'rls_enabled_tables', count(*)
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'sadhana_records', 'autofill_templates')
  and rowsecurity = true

union all

select 'custom_indexes', count(*)
from pg_indexes
where schemaname = 'public'
  and indexname in ('sadhana_records_devotee_date_idx', 'sadhana_records_date_idx',
                     'profiles_email_lower_idx');

-- Row counts, to prove this is genuinely empty (no old data survived) —
-- expect 0 for both on a truly fresh project.
select 'profiles_row_count' as check_name, count(*) as value from public.profiles
union all
select 'sadhana_records_row_count', count(*) from public.sadhana_records;
