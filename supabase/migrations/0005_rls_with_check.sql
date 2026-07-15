-- Defense-in-depth: add WITH CHECK to the UPDATE policies so a signed-in user
-- cannot rewrite a row's owner id to another user.
--
-- Without WITH CHECK, the UPDATE policy's USING clause only gates WHICH rows a
-- user may update (their own) — it does NOT validate the NEW row. A user could
-- therefore `UPDATE projects SET user_id = '<other-user>' WHERE id = '<own>'`,
-- injecting their project into another account. The app never changes user_id
-- on update, so adding WITH CHECK is transparent to normal use.
--
-- Run this once in the Supabase SQL editor on an already-provisioned project.
-- (Fresh setups get it via apply-all.sql / migrations 0001–0002.)
-- ALTER POLICY keeps each policy's existing USING clause and only adds the check.

  alter policy "Projects updatable by owner"
    on public.projects
    with check (auth.uid() = user_id);

  alter policy "Profiles are updatable by owner"
    on public.profiles
    with check (auth.uid() = id);
