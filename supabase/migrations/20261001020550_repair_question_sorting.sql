-- 기존 설문 스키마에 질문 순서 컬럼과 유일한 인덱스를 보장합니다.
begin;

alter table public.questions add column if not exists position integer not null default 0;

with ranked_questions as (
  select id, row_number() over (partition by survey_id order by created_at, id) - 1 as new_position
  from public.questions
)
update public.questions as question
set position = ranked_questions.new_position
from ranked_questions
where ranked_questions.id = question.id;

create unique index if not exists questions_survey_position_unique
  on public.questions (survey_id, position);

commit;
