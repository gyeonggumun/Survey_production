-- 응답 이력을 보호하고 질문 변경/순서를 트랜잭션 단위로 저장합니다.
-- 질문 순서의 (survey_id, position) 유일 인덱스는 그대로 유지됩니다.
begin;

create or replace function public.prevent_answered_question_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_survey_id uuid;
begin
  if tg_op = 'INSERT' then
    v_survey_id := new.survey_id;
  elsif tg_op = 'DELETE' then
    v_survey_id := old.survey_id;
  else
    if old.survey_id is distinct from new.survey_id then
      if exists (
        select 1 from public.responses as response
        where response.survey_id in (old.survey_id, new.survey_id)
      ) then
        raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
          using errcode = '23514';
      end if;
      return new;
    end if;

    if old.prompt is not distinct from new.prompt
       and old.type is not distinct from new.type
       and old.required is not distinct from new.required
       and old.options is not distinct from new.options then
      return new;
    end if;
    v_survey_id := old.survey_id;
  end if;

  -- 설문 삭제에 따른 FK cascade는 허용합니다. 직접 질문만 변경하는 경우에는
  -- 제출된 응답의 질문 의미와 답변 연결을 보존합니다.
  if exists (select 1 from public.surveys where id = v_survey_id)
     and exists (
       select 1 from public.responses as response
       where response.survey_id = v_survey_id
     ) then
    raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists questions_preserve_answer_history on public.questions;
create trigger questions_preserve_answer_history
before insert or update or delete on public.questions
for each row execute function public.prevent_answered_question_changes();

create or replace function public.save_survey_questions(
  p_survey_id uuid,
  p_questions jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_question_count integer;
  v_unique_id_count integer;
  v_offset integer;
  v_question_ids uuid[];
  v_question record;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception '로그인 후 설문을 저장해 주세요.' using errcode = '42501';
  end if;

  if p_survey_id is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception '설문과 질문 배열을 확인해 주세요.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_questions) > 100 then
    raise exception '설문 질문은 100개까지 저장할 수 있습니다.' using errcode = '22023';
  end if;

  -- 설문 행 잠금으로 같은 설문의 동시 저장 충돌을 직렬화합니다.
  select survey.owner_id into v_owner_id
  from public.surveys as survey
  where survey.id = p_survey_id
  for update;

  if not found or v_owner_id <> auth.uid() then
    raise exception '설문을 찾을 수 없거나 수정 권한이 없습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_questions) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or jsonb_typeof(item.value->'id') <> 'string'
       or (item.value->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(item.value->'prompt') <> 'string'
       or jsonb_typeof(item.value->'type') <> 'string'
       or item.value->>'type' not in ('single', 'multiple', 'text')
       or jsonb_typeof(item.value->'required') <> 'boolean'
       or jsonb_typeof(item.value->'options') <> 'array'
  ) then
    raise exception '질문 형식이 올바르지 않습니다.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_questions) as item(value)
    where length(item.value->>'prompt') > 300
       or exists (
         select 1
         from jsonb_array_elements(item.value->'options') as option_value(value)
         where jsonb_typeof(option_value.value) <> 'string'
            or length(option_value.value #>> '{}') > 120
       )
  ) then
    raise exception '질문은 300자, 선택지는 각각 120자까지 입력할 수 있습니다.' using errcode = '22023';
  end if;

  select count(*), count(distinct (item.value->>'id')::uuid)
  into v_question_count, v_unique_id_count
  from jsonb_array_elements(p_questions) as item(value);

  if v_question_count <> v_unique_id_count then
    raise exception '질문 ID가 중복되었습니다.' using errcode = '22023';
  end if;

  select coalesce(array_agg((item.value->>'id')::uuid), array[]::uuid[])
  into v_question_ids
  from jsonb_array_elements(p_questions) as item(value);

  if exists (
    select 1
    from public.questions as question
    where question.id = any(v_question_ids)
      and question.survey_id <> p_survey_id
  ) then
    raise exception '다른 설문에 속한 질문 ID는 사용할 수 없습니다.' using errcode = '42501';
  end if;

  -- 질문 순서 이외의 구조 변경은 트리거가 응답 이력을 보호하며 거부합니다.
  -- 미리 검사해 화면에 이해하기 쉬운 오류를 반환합니다.
  if exists (select 1 from public.responses as response where response.survey_id = p_survey_id) then
    for v_question in
      select question.id, question.prompt, question.type, question.required, question.options
      from public.questions as question
      where question.survey_id = p_survey_id
    loop
      select item.value into v_item
      from jsonb_array_elements(p_questions) as item(value)
      where item.value->>'id' = v_question.id::text;

      if v_item is null
         or v_question.prompt is distinct from v_item->>'prompt'
         or v_question.type is distinct from v_item->>'type'
         or v_question.required is distinct from (v_item->>'required')::boolean
         or v_question.options is distinct from v_item->'options' then
        raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
          using errcode = '23514';
      end if;
    end loop;

    if v_question_count <> (select count(*) from public.questions as question where question.survey_id = p_survey_id) then
      raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
        using errcode = '23514';
    end if;
  end if;

  -- 기존 위치와 새 질문의 최종 위치가 겹치지 않는 임시 구간으로 이동합니다.
  -- 함수 전체는 단일 트랜잭션입니다.
  select greatest(coalesce(max(question.position), -1), v_question_count - 1) + 1
  into v_offset
  from public.questions as question
  where question.survey_id = p_survey_id;

  if v_offset > 0 then
    update public.questions as question
    set position = question.position + v_offset
    where question.survey_id = p_survey_id;
  end if;

  insert into public.questions (id, survey_id, prompt, type, required, options, position)
  select (item.value->>'id')::uuid,
         p_survey_id,
         item.value->>'prompt',
         item.value->>'type',
         (item.value->>'required')::boolean,
         item.value->'options',
         (item.ordinality - 1)::integer
  from jsonb_array_elements(p_questions) with ordinality as item(value, ordinality)
  on conflict (id) do update
  set prompt = excluded.prompt,
      type = excluded.type,
      required = excluded.required,
      options = excluded.options,
      position = excluded.position;

  delete from public.questions as question
  where question.survey_id = p_survey_id
    and not (question.id = any(v_question_ids));
end;
$$;

revoke all on function public.save_survey_questions(uuid, jsonb) from public;
grant execute on function public.save_survey_questions(uuid, jsonb) to authenticated;

commit;
