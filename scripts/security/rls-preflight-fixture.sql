\set ON_ERROR_STOP on
-- Intentionally retained only in a disposable *_unsafe_rls_test database.
-- The runner verifies that a rejected migration preserves these pre-existing rows.
begin;
do $$ begin
  if current_database() !~ '^evaro_[a-z0-9_]+_unsafe_rls_test$'
     or exists (select 1 from public.users) then
    raise exception 'Unsafe-state fixture requires a new isolated preflight test database';
  end if;
end $$;
insert into auth.users(id) values
 ('a0000000-0000-4000-8000-000000000100'),('b0000000-0000-4000-8000-000000000100');
insert into public.users(id,email,display_name) values
 ('a0000000-0000-4000-8000-000000000100','a@example.test','Fixture A'),
 ('b0000000-0000-4000-8000-000000000100','b@example.test','Fixture B');
insert into public.exercises(id,name,primary_muscles,equipment,movement_pattern,is_custom,owner_id)
 values('b0000000-0000-4000-8000-000000000200','Fixture B',ARRAY['chest']::public.muscle_group[],'barbell','horizontal_push',true,'b0000000-0000-4000-8000-000000000100');
insert into public.workout_templates(id,user_id,name)
 values('a0000000-0000-4000-8000-000000000300','a0000000-0000-4000-8000-000000000100','Fixture A');
insert into public.template_exercises(id,template_id,exercise_id,target_sets)
 values('a0000000-0000-4000-8000-000000000400','a0000000-0000-4000-8000-000000000300','b0000000-0000-4000-8000-000000000200',3);
commit;
