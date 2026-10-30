-- Mark Your Day: Private Cloud Tasks Schema with Row Level Security (RLS)
-- Target: public.tasks

create table if not exists public.tasks (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(title) > 0 and char_length(title) <= 500),
    notes text,
    is_completed boolean not null default false,
    scheduled_date text,
    scheduled_time text,
    duration_minutes integer check (duration_minutes is null or (duration_minutes > 0 and duration_minutes <= 10080)),
    due_date text,
    due_time text,
    reminder_date text,
    reminder_time text,
    time_zone text default 'Asia/Kolkata',
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

-- Enable Row Level Security (RLS)
alter table public.tasks enable row level security;

-- Revoke default public/anon access
revoke all on public.tasks from public;
revoke all on public.tasks from anon;

-- Grant standard permissions to authenticated users
grant select, insert, update, delete on public.tasks to authenticated;

-- Policies (Separated by action, using (select auth.uid()) for optimal Postgres subquery caching)
drop policy if exists "tasks_select_policy" on public.tasks;
create policy "tasks_select_policy"
    on public.tasks
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_policy" on public.tasks;
create policy "tasks_insert_policy"
    on public.tasks
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_update_policy" on public.tasks;
create policy "tasks_update_policy"
    on public.tasks
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_policy" on public.tasks;
create policy "tasks_delete_policy"
    on public.tasks
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- Performance Indexes (Optimized for user task list queries & day filters)
create index if not exists idx_tasks_user_scheduled
    on public.tasks (user_id, scheduled_date);

create index if not exists idx_tasks_user_completed
    on public.tasks (user_id, is_completed);

create index if not exists idx_tasks_user_created
    on public.tasks (user_id, created_at desc);

-- Automatic updated_at timestamp trigger
create or replace function public.handle_tasks_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row
    execute function public.handle_tasks_updated_at();
