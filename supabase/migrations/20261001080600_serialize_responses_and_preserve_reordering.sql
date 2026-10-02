-- 응답 제출과 질문 저장이 같은 설문 행 잠금을 사용하도록 직렬화합니다.
-- 응답이 있는 설문에서 save_survey_questions의 동일 ID upsert는
-- BEFORE INSERT 트리거도 실행하므로, 구조가 동일한 순서 변경 upsert는 허용합니다.
begin;

create or replace function public.prevent_answered_question_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_survey_ids uuid[];
  v_survey_id uuid;
  v_existing public.questions%rowtype;
  v_position_only_insert boolean := false;
begin
  if tg_op = 'INSERT' then
    select question.*
      into v_existing
    from public.questions as question
    where question.id = new.id;

    if found
       and v_existing.survey_id = new.survey_id
       and v_existing.prompt is not distinct from new.prompt
       and v_existing.type is not distinct from new.type
       and v_existing.required is not distinct from new.required
       and v_existing.options is not distinct from new.options then
      v_position_only_insert := true;
    end if;

    v_survey_ids := array[new.survey_id];
  elsif tg_op = 'DELETE' then
    v_survey_ids := array[old.survey_id];
  elsif old.survey_id is distinct from new.survey_id then
    v_survey_ids := array[old.survey_id, new.survey_id];
  else
    v_survey_ids := array[old.survey_id];
  end if;

  -- 응답 저장 함수와 같은 설문 행을 잠가 응답 검증과 질문 변경이
  -- 서로 다른 질문 구조를 기준으로 동시에 진행되지 않도록 합니다.
  -- 여러 설문을 옮기는 직접 UPDATE도 일정한 순서로 잠가 교착을 줄입니다.
  for v_survey_id in
    select distinct survey_ids.id
    from unnest(v_survey_ids) as survey_ids(id)
    where survey_ids.id is not null
    order by survey_ids.id
  loop
    perform 1
    from public.surveys as survey
    where survey.id = v_survey_id
    for update;
  end loop;

  if tg_op = 'UPDATE' and old.survey_id is distinct from new.survey_id then
    if exists (
      select 1 from public.responses as response
      where response.survey_id in (old.survey_id, new.survey_id)
    ) then
      raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.prompt is not distinct from new.prompt
     and old.type is not distinct from new.type
     and old.required is not distinct from new.required
     and old.options is not distinct from new.options then
    -- 질문 위치만 변경하는 업데이트는 응답 이력이 있어도 허용합니다.
    return new;
  end if;

  if tg_op = 'INSERT' and v_position_only_insert
     and exists (
       select 1 from public.responses as response
       where response.survey_id = new.survey_id
     ) then
    -- INSERT .. ON CONFLICT DO UPDATE 순서 저장은 기존 질문 행과 구조가
    -- 동일한 경우에만 이 경로로 허용합니다. 실제 INSERT는 이후 UPDATE가 수행합니다.
    return new;
  end if;

  -- 설문 삭제에 따른 FK cascade는 허용합니다. 직접 질문 변경은
  -- 제출된 응답의 질문 의미와 답변 연결을 보존하기 위해 차단합니다.
  if tg_op = 'DELETE' then
    if exists (select 1 from public.surveys where id = old.survey_id)
       and exists (
         select 1 from public.responses as response
         where response.survey_id = old.survey_id
       ) then
      raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
        using errcode = '23514';
    end if;
    return old;
  end if;

  if exists (select 1 from public.surveys where id = new.survey_id)
     and exists (
       select 1 from public.responses as response
       where response.survey_id = new.survey_id
     ) then
    raise exception '응답이 제출된 설문의 질문 구조는 변경할 수 없습니다. 새 설문을 만들어 주세요.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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
  v_survey_status text;
begin
  if p_survey_id is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception '유효한 설문과 답변 배열이 필요합니다.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_answers) > 100 then
    raise exception '응답 가능한 질문 수를 초과했습니다.' using errcode = '22023';
  end if;

  -- 질문 저장 RPC와 동일한 설문 행을 잠급니다. 검증부터 답변 저장까지
  -- 질문 수정·발행 취소가 끼어들지 않도록 트랜잭션 종료까지 잠금이 유지됩니다.
  select survey.status
    into v_survey_status
  from public.surveys as survey
  where survey.id = p_survey_id
  for update;

  if not found or v_survey_status is distinct from 'published' then
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
