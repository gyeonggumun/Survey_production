-- 설문 정보와 질문을 하나의 요청/트랜잭션으로 저장합니다.
begin;

create or replace function public.save_survey(
  p_survey_id uuid,
  p_title text,
  p_description text,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_survey_id uuid;
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception '로그인 후 설문을 저장해 주세요.' using errcode = '42501';
  end if;

  if p_survey_id is null then
    insert into public.surveys (owner_id, title, description, status)
    values (
      v_owner_id,
      coalesce(nullif(btrim(p_title), ''), '제목 없는 설문'),
      coalesce(btrim(p_description), ''),
      'draft'
    )
    returning id into v_survey_id;
  else
    update public.surveys
    set title = coalesce(nullif(btrim(p_title), ''), '제목 없는 설문'),
        description = coalesce(btrim(p_description), '')
    where id = p_survey_id and owner_id = v_owner_id
    returning id into v_survey_id;

    if v_survey_id is null then
      raise exception '설문이 삭제되었거나 수정 권한이 없습니다.' using errcode = '42501';
    end if;
  end if;

  -- 하위 함수의 검증 또는 질문 저장이 실패하면 위 변경도 함께 롤백됩니다.
  perform public.save_survey_questions(v_survey_id, p_questions);
  return v_survey_id;
end;
$$;

revoke all on function public.save_survey(uuid, text, text, jsonb) from public;
grant execute on function public.save_survey(uuid, text, text, jsonb) to authenticated;

commit;
