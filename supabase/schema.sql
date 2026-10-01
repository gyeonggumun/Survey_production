-- 모아 설문 MVP 데이터베이스 스키마
-- Supabase Dashboard > SQL Editor에서 프로젝트에 한 번 적용하세요.
-- 설문 응답 테이블은 응답 수집 단계에서 별도 migration으로 추가합니다.

begin;

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 설문',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  prompt text not null default '',
  type text not null default 'single' check (type in ('single', 'multiple', 'text')),
  required boolean not null default true,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists surveys_owner_updated_idx
  on public.surveys (owner_id, updated_at desc);
create index if not exists questions_survey_position_idx
  on public.questions (survey_id, position);

create or replace function public.set_survey_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists surveys_set_updated_at on public.surveys;
create trigger surveys_set_updated_at
before update on public.surveys
for each row execute function public.set_survey_updated_at();

alter table public.surveys enable row level security;
alter table public.questions enable row level security;

drop policy if exists "Owners and published surveys can be read" on public.surveys;
create policy "Owners and published surveys can be read"
on public.surveys for select
to anon, authenticated
using (owner_id = (select auth.uid()) or status = 'published');

drop policy if exists "Owners can create surveys" on public.surveys;
create policy "Owners can create surveys"
on public.surveys for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update surveys" on public.surveys;
create policy "Owners can update surveys"
on public.surveys for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete surveys" on public.surveys;
create policy "Owners can delete surveys"
on public.surveys for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Owners and published survey questions can be read" on public.questions;
create policy "Owners and published survey questions can be read"
on public.questions for select
to anon, authenticated
using (
  exists (
    select 1
    from public.surveys as survey
    where survey.id = questions.survey_id
      and (survey.owner_id = (select auth.uid()) or survey.status = 'published')
  )
);

drop policy if exists "Owners can create survey questions" on public.questions;
create policy "Owners can create survey questions"
on public.questions for insert
to authenticated
with check (
  exists (
    select 1 from public.surveys as survey
    where survey.id = questions.survey_id
      and survey.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can update survey questions" on public.questions;
create policy "Owners can update survey questions"
on public.questions for update
to authenticated
using (
  exists (
    select 1 from public.surveys as survey
    where survey.id = questions.survey_id
      and survey.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.surveys as survey
    where survey.id = questions.survey_id
      and survey.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can delete survey questions" on public.questions;
create policy "Owners can delete survey questions"
on public.questions for delete
to authenticated
using (
  exists (
    select 1 from public.surveys as survey
    where survey.id = questions.survey_id
      and survey.owner_id = (select auth.uid())
  )
);

-- SQL Editor에서 만든 테이블에도 API 역할 권한을 명시합니다.
-- 실제 접근 가능 범위는 위 RLS 정책이 추가로 제한합니다.
grant select on public.surveys, public.questions to anon;
grant select, insert, update, delete on public.surveys, public.questions to authenticated;

commit;
