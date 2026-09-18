-- Run this ONLY after you have registered a real account through the live
-- app (kanishthbhakta.in/#/register) with the email below, and after that
-- account exists in public.profiles. Running it before the account exists
-- does nothing (0 rows updated) — it will not create an account.

update public.profiles
set role = 'admin'
where email = 'REPLACE_WITH_YOUR_REAL_EMAIL@example.com';

-- Verify it took effect:
select id, email, role from public.profiles where role = 'admin';
