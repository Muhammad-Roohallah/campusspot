-- Run AFTER creating the staff user in Supabase: Authentication > Users > Add user (email + password,
-- tick "Auto Confirm User"). Replace the email below, then run this in the SQL Editor.
insert into public.staff (user_id, note)
select id, 'library cafe barista'
from auth.users
where email = 'barista@example.com'      -- <- change this
on conflict (user_id) do nothing;
