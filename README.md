# 모아 설문 (Moa Survey)

React + Vite 기반 설문 서비스 MVP입니다. Supabase 이메일 인증, 설문 제작·저장·발행, 공개 응답 수집, 소유자 전용 결과 확인 흐름을 포함합니다.

## 로컬 실행

필요 환경: Node.js 18 이상, npm

```bash
npm ci
npm run dev
```

Vite가 표시하는 로컬 주소를 브라우저에서 여세요. 프로덕션 빌드는 `npm run build`, 빌드 결과 미리보기는 `npm run preview`입니다.

## 배포 환경 변수

Supabase Project URL과 공개 anon/publishable 키를 로컬 `.env` 및 Vercel 프로젝트의 Production/Preview 환경 변수에 각각 설정하세요.

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

브라우저용 공개 키만 사용합니다. **Service Role Key는 `VITE_` 변수나 프런트엔드 코드에 절대 넣지 마세요.** 실제 키를 넣은 `.env`는 커밋하지 않습니다. `env.example`은 값이 비어 있는 템플릿입니다.

## Supabase 데이터베이스 설치

DB 변경의 기준은 `supabase/migrations/`입니다. 마이그레이션은 파일명의 순서대로 적용됩니다.

1. `20261001020541_create_survey_schema.sql` — 설문·질문 테이블과 RLS
2. `20261001075516_repair_question_sorting.sql` — 기존 질문 순서 복구 및 고유 인덱스
3. `20261001075705_add_public_survey_responses.sql` — 응답·답변 테이블과 검증 제출 RPC
4. `20261001075950_preserve_response_history_and_save_questions.sql` — 질문 원자 저장, 응답 이력 보호
5. `20261001080506_validate_published_surveys.sql` — 기존 발행 설문 검사와 DB 유효성 검증
6. `20261001080600_serialize_responses_and_preserve_reordering.sql` — 응답 제출과 질문 변경 직렬화, 응답 이력이 있는 설문의 질문 순서 저장 허용

기존 `supabase/schema.sql`은 핵심 설문 테이블에 대한 이전 수동 설치용 참고 파일이며, 응답 저장까지 포함한 현재 전체 설치에서는 실행하지 마세요.

1. Supabase CLI로 로그인하고 프로젝트를 연결합니다. 기존 프로젝트 ref를 본인 프로젝트와 대조합니다. 새 프로젝트라면 ref를 바꿉니다.

   ```bash
   npx --yes supabase@2.119.0 login
   npx --yes supabase@2.119.0 link --project-ref blhxyoloslthrdpiwfks
   npx --yes supabase@2.119.0 db push --dry-run
   npx --yes supabase@2.119.0 db push
   ```

2. 설치 전 이미 `surveys`, `questions`, `responses`, `answers` 테이블이 있다면 구조와 데이터가 migration과 호환되는지 먼저 확인하세요. 같은 이름의 데이터베이스 객체가 호환되지 않으면 자동으로 삭제·덮어쓰지 않습니다.
3. Table Editor에서 네 테이블과 RLS 활성화를 확인합니다. `surveys.owner_id`, 별도 `questions` 테이블, 응답·답변 외래키 구조가 기준입니다. 공개 응답 저장은 검증하는 `submit_survey_response` 함수만 호출하며, 익명 역할에는 응답 테이블 직접 조회·추가 권한을 주지 않습니다.
4. Authentication → URL Configuration에서 Site URL을 실제 배포 주소로 설정하고 이메일 확인에 필요한 Redirect URLs를 추가합니다.

**데이터 주의:** 첫 마이그레이션은 이전 수동 생성한 `surveys(user_id, questions JSONB)`가 비어 있을 때만 해당 테이블을 교체합니다. 데이터가 있으면 적용을 중단합니다. 데이터가 있는 기존 DB에는 백업과 별도 데이터 이전 계획 없이 migration을 적용하지 마세요. migration은 Supabase에 자동 접속하거나 실행되지 않으므로 `db push`는 직접 수행해야 합니다.

## 공개 응답과 결과 흐름 확인

1. 로그인하고 설문을 만든 다음 제목과 모든 질문을 입력해 발행합니다.
2. 설문 편집 화면의 응답 링크를 복사해 시크릿 창이나 로그아웃 브라우저에서 엽니다. 객관식·복수 선택·주관식, 필수 검증, 제출 완료를 확인합니다.
3. 설문 소유자 계정의 **응답 분석** 또는 **응답 결과** 화면에서 응답 수, 질문별 집계, 제출 시각과 주관식 내용을 확인합니다. 다른 계정으로는 해당 결과를 조회할 수 없어야 합니다.
4. 이미 응답이 있는 설문에서 질문 구조 변경이 차단되는지, 질문 순서 변경만 저장되는지 확인합니다. 발행 중인 설문의 제목·질문·선택지가 유효하지 않으면 DB가 변경을 거부해야 합니다.

## Vercel 배포

GitHub 저장소의 배포 브랜치를 Vercel 프로젝트에 연결합니다. 프레임워크는 Vite, 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`입니다. Production/Preview에 위 두 `VITE_SUPABASE_*` 환경 변수를 설정한 후 배포합니다. `vercel.json`은 브라우저 새로고침 시 SPA 경로를 `index.html`로 재작성합니다.

프런트엔드는 저장소 변경 후 배포해야 합니다. **DB migration은 Vercel이 자동 실행하지 않습니다.** DB 변경은 먼저 `db push --dry-run` 결과에서 적용 대상을 확인한 다음 직접 적용하세요. 프로젝트 ref가 본인 DB와 일치하는지 반드시 점검하고, 키와 DB 비밀번호는 저장소에 커밋하지 않습니다.

## 현재 구현 내용

- Supabase Auth 이메일 회원가입, 이메일 확인, 로그인/로그아웃 및 세션 복원
- 로그인 사용자별 설문 생성·검색·필터·수정·삭제와 질문 편집
- 단일 선택·복수 선택·주관식, 필수 설정, 선택지, 순서 변경, 미리보기
- 발행된 설문의 공개 링크 및 로그인 없이 응답 제출
- 서버 측 RPC에서 발행 상태, 응답 형식, 필수 질문, 선택지 값을 재검증하고 원자적으로 저장
- DB 트리거가 발행 설문의 최소 구성을 검증하고, 응답이 있는 설문의 내용 변경은 차단하면서 순서 변경은 허용
- 설문 소유자만 응답·답변을 읽도록 RLS 제한
- 응답 수, 질문별 객관식 집계, 주관식 답변 및 제출 시간 화면
- 밝은 색감과 모바일 반응형 설문 작성·응답·결과 화면

## 테스트 및 배포 전 확인

이 저장소 파일만으로는 현재 Supabase 원격 DB에 어떤 마이그레이션이 실제 적용됐는지 검증할 수 없습니다. 새 마이그레이션을 적용하기 전 본인 프로젝트 ref, dry-run 변경 목록, 백업 여부를 확인하세요. 적용 후에는 응답이 있는 설문의 질문 순서 변경이 성공하고, 질문 내용·유형·선택지 변경 및 응답 제출과 동시에 수행되는 편집이 안전하게 처리되는지 실제 배포 URL에서 확인해야 합니다. 빌드, 브라우저 실행, 원격 SQL 적용 및 Vercel 배포는 이 작업에서 실행하지 않았습니다.

## GitHub에 올리기 전 비밀 파일 이중 점검

`.gitignore`는 새 파일과 추적되지 않은 파일을 제외하지만, 이미 Git이 추적 중인 파일을 자동으로 제거하지 않습니다. 푸시 전 로컬 터미널에서 확인하세요.

```bash
git check-ignore -v .env .env.local .env.production .vercel
git status --short
git diff --cached --name-only
git ls-files
```

`.env`, `.env.local`, `.env.production`, 실제 키·인증서·자격 증명 파일이 추적 목록이나 스테이징 목록에 있으면 푸시하지 마세요. 이미 추적된 파일은 해당 경로를 `git rm --cached -- <파일경로>`로 인덱스에서 제거해야 합니다. 비밀 키를 원격 저장소에 올린 적이 있다면 파일 삭제만으로는 부족하므로 키를 폐기하고 교체하세요.
