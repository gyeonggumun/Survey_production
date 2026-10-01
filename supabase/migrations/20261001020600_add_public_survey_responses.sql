-- 공개 설문 응답 저장 및 소유자 전용 결과 조회
-- DB의 정식 구조는 migrations/20261001020541_create_survey_schema.sql의
-- surveys(owner_id), questions 구조를 전제로 합니다.
begin;

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  submitted_at timestamptz not null default now()
);

create table if not exists public.answers (
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  value jsonb not null,
  created_at timestamptz not null default now(),
  primary key (response_id, question_id)
);

create index if not exists responses_survey_submitted_idx
  on public.responses (survey_id, submitted_at desc);
create index if not exists answers_question_idx
  on public.answers (question_id);

alter table public.responses enable row level security;
alter table public.answers enable row level security;

-- 익명 사용자는 테이블에 직접 쓸 수 없고, 아래 검증 RPC로만 제출합니다.
drop policy if exists "Survey owners can read responses" on public.responses;
create policy "Survey owners can read responses"
on public.responses for select
to authenticated
using (
  exists (
    select 1 from public.surveys as survey
    where survey.id = responses.survey_id
      and survey.owner_id = (select auth.uid())
  )
);

drop policy if exists "Survey owners can read answers" on public.answers;
create policy "Survey owners can read answers"
on public.answers for select
to authenticated
using (
  exists (
    select 1
    from public.responses as response
    join public.surveys as survey on survey.id = response.survey_id
    where response.id = answers.response_id
      and survey.owner_id = (select auth.uid())
  )
);

grant select on public.responses, public.answers to authenticated;
revoke all on public.responses, public.answers from anon;
revoke insert, update, delete on public.responses, public.answers from authenticated, anon;

create or replace function public.submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response_id uuid;
  v_question_count integer;
  v_answer_count integer;
  v_question record;
  v_answer jsonb;
  v_value jsonb;
begin
  if p_survey_id is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception '유효한 설문과 답변 배열이 필요합니다.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_answers) > 100 then
    raise exception '응답 가능한 질문 수를 초과했습니다.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.surveys as survey
    where survey.id = p_survey_id and survey.status = 'published'
  ) then
    raise exception '발행된 설문만 응답할 수 있습니다.' using errcode = '42501';
  end if;

  select count(*) into v_question_count
  from public.questions as question
  where question.survey_id = p_survey_id;

  select count(*) into v_answer_count
  from jsonb_array_elements(p_answers);

  if v_answer_count <> v_question_count then
    raise exception '설문 질문에 맞는 답변이 필요합니다.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or jsonb_typeof(item.value->'question_id') <> 'string'
       or not (item.value ? 'value')
  ) then
    raise exception '답변 형식이 올바르지 않습니다.' using errcode = '22023';
  end if;

  if (select count(distinct item.value->>'question_id') from jsonb_array_elements(p_answers) as item(value)) <> v_answer_count then
    raise exception '질문 ID가 중복되었습니다.' using errcode = '22023';
  end if;

  for v_question in
    select question.id, question.type, question.required, question.options
    from public.questions as question
    where question.survey_id = p_survey_id
  loop
    select item.value into v_answer
    from jsonb_array_elements(p_answers) as item(value)
    where item.value->>'question_id' = v_question.id::text;

    if v_answer is null then
      raise exception '설문 질문과 답변이 일치하지 않습니다.' using errcode = '22023';
    end if;

    v_value := v_answer->'value';

    if v_question.required and (
      v_value is null
      or v_value = 'null'::jsonb
      or v_value = '""'::jsonb
      or v_value = '[]'::jsonb
      or (jsonb_typeof(v_value) = 'string' and length(btrim(v_value #>> '{}')) = 0)
    ) then
      raise exception '필수 질문에 답변해야 합니다.' using errcode = '22023';
    end if;

    if v_value is null or v_value = 'null'::jsonb then
      v_value := '""'::jsonb;
    end if;

    if v_question.type = 'text' then
      if jsonb_typeof(v_value) <> 'string' or length(v_value #>> '{}') > 5000 then
        raise exception '주관식 답변은 5000자 이내의 문자열이어야 합니다.' using errcode = '22023';
      end if;
    elsif v_question.type = 'single' then
      if jsonb_typeof(v_value) <> 'string' then
        raise exception '단일 선택 질문의 응답 형식이 올바르지 않습니다.' using errcode = '22023';
      end if;
      if v_value <> '""'::jsonb and not exists (
        select 1 from jsonb_array_elements_text(v_question.options) as option_value(value)
        where option_value.value = v_value #>> '{}'
      ) then
        raise exception '질문에 없는 선택지입니다.' using errcode = '22023';
      end if;
    elsif v_question.type = 'multiple' then
      if jsonb_typeof(v_value) <> 'array' or jsonb_array_length(v_value) > jsonb_array_length(v_question.options) then
        raise exception '복수 선택 질문의 응답 형식이 올바르지 않습니다.' using errcode = '22023';
      end if;
      if exists (
        select 1 from jsonb_array_elements(v_value) as selected(value)
        where jsonb_typeof(selected.value) <> 'string'
           or not exists (
             select 1 from jsonb_array_elements_text(v_question.options) as option_value(value)
             where option_value.value = selected.value #>> '{}'
           )
      ) then
        raise exception '질문에 없는 선택지가 포함되어 있습니다.' using errcode = '22023';
      end if;
      if (select count(*) from jsonb_array_elements(v_value)) <> (
        select count(distinct selected.value #>> '{}') from jsonb_array_elements(v_value) as selected(value)
      ) then
        raise exception '선택지가 중복되었습니다.' using errcode = '22023';
      end if;
    else
      raise exception '지원하지 않는 질문 유형입니다.' using errcode = '22023';
    end if;
  end loop;

  insert into public.responses (survey_id)
  values (p_survey_id)
  returning id into v_response_id;

  insert into public.answers (response_id, question_id, value)
  select v_response_id,
         (item.value->>'question_id')::uuid,
         item.value->'value'
  from jsonb_array_elements(p_answers) as item(value);

  return v_response_id;
end;
$$;

revoke all on function public.submit_survey_response(uuid, jsonb) from public;
grant execute on function public.submit_survey_response(uuid, jsonb) to anon, authenticated;

commit;
