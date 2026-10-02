begin;

-- RLS와 별개인 테이블 접근 권한을 앱에 필요한 범위로 제한합니다.
revoke all on table public.surveys, public.questions, public.responses, public.answers
  from anon, authenticated;

-- 로그인하지 않은 응답자는 발행 설문과 질문만 조회합니다.
grant select on table public.surveys, public.questions to anon;

-- 소유자 RLS 정책이 적용된 설문 편집과 결과 조회에 필요한 권한입니다.
grant select, insert, update, delete on table public.surveys, public.questions
  to authenticated;
grant select on table public.responses, public.answers to authenticated;

commit;
