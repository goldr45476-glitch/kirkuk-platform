-- Run ONCE in the Supabase SQL Editor after you have signed in to the site with your own account.
-- Replace the email (or use phone = '9647...') with yours. Afterwards /admin becomes available to you.
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com' /* or: phone = '9647700000000' */);
-- Verify (should return 1 row with role = admin):
select id, full_name, role from public.profiles where role = 'admin';
