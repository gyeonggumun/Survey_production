-- 발행 상태의 설문은 DB에서도 응답 가능한 구조인지 검증합니다.
-- 프런트엔드 검증을 우회한 직접 API 요청이나 이후 편집으로
-- 제목/질문/선택지가 비어 있는 공개 설문이 만들어지는 것을 막습니다.
begin;

create or replace function public.validate_published_survey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_survey_ids uuid[];
  v_survey_id uuid;
  v_status text;
  v_title text;
  v_question_count integer;
begin
  if tg_table_name = 'surveys' then
    v_survey_ids := array[new.id];
  elsif tg_op = 'UPDATE' and old.survey_id is distinct from new.survey_id then
    v_survey_ids := array[old.survey_id, new.survey_id];
  elsif tg_op = 'DELETE' then
    v_survey_ids := array[old.survey_id];
  else
    v_survey_ids := array[new.survey_id];
  end if;

  -- 같은 설문의 동시 질문 변경이 각각 오래된 질문 수를 통과하지 못하도록
  -- 설문 행을 일정한 순서로 잠근 뒤 최종 상태를 검사합니다.
  for v_survey_id in
    select distinct id from unnest(v_survey_ids) as survey_ids(id) order by id
  loop
    select survey.status, survey.title
      into v_status, v_title
    from public.surveys as survey
    where survey.id = v_survey_id
    for update;

    -- 설문 삭제에 따른 질문 cascade도 여기서 통과합니다.
    if not found or v_status <> 'published' then
      continue;
    end if;

    if v_title is null or length(btrim(v_title)) = 0 or length(v_title) > 120 then
      raise exception '발행된 설문에는 1~120자의 제목이 필요합니다.'
        using errcode = '23514';
    end if;

    select count(*)
      into v_question_count
    from public.questions as question
    where question.survey_id = v_survey_id;

    if v_question_count = 0 then
      raise exception '발행하려면 질문을 하나 이상 추가해 주세요.'
        using errcode = '23514';
    end if;

    if v_question_count > 100 then
      raise exception '설문 질문은 100개까지 발행할 수 있습니다.'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.questions as question
      where question.survey_id = v_survey_id
        and (
          length(btrim(question.prompt)) = 0
          or length(question.prompt) > 300
          or (
            question.type in ('single', 'multiple')
            and (
              jsonb_typeof(question.options) <> 'array'
              or jsonb_array_length(question.options) < 2
              or exists (
                select 1
                from jsonb_array_elements(question.options) as option_value(value)
                where jsonb_typeof(option_value.value) <> 'string'
                   or length(btrim(option_value.value #>> '{}')) = 0
                   or length(option_value.value #>> '{}') > 120
              )
              or (
                select count(*)
                from jsonb_array_elements(question.options)
              ) <> (
                select count(distinct btrim(option_value.value #>> '{}'))
                from jsonb_array_elements(question.options) as option_value(value)
              )
            )
          )
        )
    ) then
      raise exception '모든 질문에 내용을 입력하고, 객관식 질문에는 서로 다른 선택지를 2개 이상 입력해 주세요.'
        using errcode = '23514';
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.validate_published_survey() from public, anon, authenticated;

drop trigger if exists surveys_validate_published on public.surveys;
create constraint trigger surveys_validate_published
after insert or update on public.surveys
deferrable initially deferred
for each row execute function public.validate_published_survey();

drop trigger if exists questions_validate_published on public.questions;
create constraint trigger questions_validate_published
after insert or update or delete on public.questions
deferrable initially deferred
for each row execute function public.validate_published_survey();

-- 트리거 생성 전부터 존재하던 발행 설문도 한 번 검사합니다.
do $$
begin
  if exists (
    select 1 from public.surveys as survey
    where survey.status = 'published'
      and (
        length(btrim(survey.title)) = 0
        or length(survey.title) > 120
        or (select count(*) from public.questions as question
            where question.survey_id = survey.id) not between 1 and 100
        or exists (
          select 1 from public.questions as question
          where question.survey_id = survey.id
            and (
              length(btrim(question.prompt)) = 0
              or length(question.prompt) > 300
              or (
                question.type in ('single', 'multiple')
                and (
                  jsonb_typeof(question.options) <> 'array'
                  or jsonb_array_length(question.options) < 2
                  or exists (
                    select 1 from jsonb_array_elements(question.options) as option_value(value)
                    where jsonb_typeof(option_value.value) <> 'string'
                       or length(btrim(option_value.value #>> '{}')) = 0
                       or length(option_value.value #>> '{}') > 120
                  )
                  or (select count(*) from jsonb_array_elements(question.options)) <>
                     (select count(distinct btrim(option_value.value #>> '{}'))
                        from jsonb_array_elements(question.options) as option_value(value))
                )
              )
            )
        )
      )
  ) then
    raise exception '기존 발행 설문에 제목 또는 질문 구성 오류가 있어 검증 마이그레이션을 적용할 수 없습니다.'
      using errcode = '23514';
  end if;
end;
$$;

commit;
