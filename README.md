# 모아 설문 (Moa Survey)

React + Vite 기반 설문 서비스 MVP입니다. 기본 화면과 Supabase 이메일 인증에 이어, 현재 단계에서는 로그인한 사용자가 설문을 만들고 질문을 편집·저장·발행 상태로 관리할 수 있습니다. 공개 응답 제출과 결과 분석은 아직 구현하지 않았습니다.

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

DB 변경의 기준은 `supabase/migrations/`입니다. 기존 `supabase/schema.sql`은 이전 수동 설치용 참고 파일이며, 마이그레이션과 함께 실행하지 마세요.

1. Supabase CLI로 로그인하고 프로젝트를 연결합니다. 새 프로젝트라면 아래 프로젝트 ref를 새 값으로 바꿉니다.

   ```bash
   npx --yes supabase@2.119.0 login
   npx --yes supabase@2.119.0 link --project-ref blhxyoloslthrdpiwfks
   npx --yes supabase@2.119.0 db push --dry-run
   npx --yes supabase@2.119.0 db push
   ```

2. Table Editor에서 `surveys`, `questions`와 두 테이블의 RLS 활성화를 확인합니다. `surveys`는 `owner_id`를 사용하고 질문은 별도 `questions` 테이블에 저장됩니다.
3. Authentication → URL Configuration의 Site URL을 실제 배포 주소(`https://survey-production.vercel.app`)로 설정하고, 다른 배포 주소나 로컬 OAuth/이메일 확인 콜백이 필요하면 Redirect URLs에 추가합니다.
4. 로그인한 계정으로 설문 생성·저장·수정·삭제를 확인합니다. 다른 계정에서 소유자 전용 변경이 차단되는지도 확인합니다.

첫 마이그레이션은 이전에 수동 생성한 `surveys(user_id, questions JSONB)`가 **비어 있을 때만** 해당 테이블을 교체합니다. 데이터가 있으면 중단하므로, 데이터가 있는 DB에는 백업과 별도 데이터 이전 계획 없이 적용하지 마세요. 현재 연결된 프로젝트에는 이 마이그레이션(`20261001020541`)이 이미 적용되어 있습니다. 응답 및 답변 테이블은 아직 없습니다.

## Vercel 배포

GitHub `gyeonggumun/Survey_production`의 `main` 브랜치를 Vercel 프로젝트 `survey-production`에 연결합니다. 프레임워크는 Vite, 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`입니다. Production/Preview에 위 두 `VITE_SUPABASE_*` 환경 변수를 설정한 후 배포합니다. `vercel.json`은 브라우저 새로고침 시 SPA 경로를 `index.html`로 재작성합니다.

`main`에 푸시하면 Vercel 프런트엔드 배포는 자동으로 시작됩니다. **DB 마이그레이션은 Vercel이 자동 실행하지 않습니다.** DB 변경이 추가되면 배포 전에 `db push --dry-run`과 `db push`를 별도로 실행하세요. 키와 DB 비밀번호는 저장소에 커밋하지 않습니다.

## 현재 구현 내용

- Supabase Auth 이메일 회원가입, 이메일 확인, 로그인/로그아웃 및 세션 복원
- 미인증 사용자의 앱 접근 제한
- 로그인 사용자별 설문 생성·목록·검색·상태 필터·수정·삭제
- 객관식 단일 선택, 복수 선택, 짧은 주관식 질문
- 질문 필수 여부, 선택지 관리, 질문 순서 변경
- 임시 저장, 발행 상태 전환, 응답자 관점 미리보기
- 본인 소유 설문만 관리할 수 있도록 `surveys`, `questions` 테이블에 RLS 정책 적용
- 모바일 반응형 설문 목록 및 편집 화면

## 아직 연결하지 않은 기능

- 공개 설문 URL에서의 응답 제출 및 응답/답변 저장
- 필수 응답 등 실제 제출 단계의 응답 검증
- 응답 수, 제출 시각, 질문별 결과 분석 및 차트
- 프로덕션 환경에서 계정별 권한 및 설문 저장 흐름의 통합 테스트

설문 발행은 현재 데이터베이스의 상태 변경을 뜻하며, 공개 링크로 응답을 받을 수 있다는 뜻은 아닙니다. 설문 미리보기는 내부 화면으로 로그인 세션이 필요합니다.

## GitHub에 올리기 전 비밀 파일 이중 점검

`.gitignore`는 새 파일과 추적되지 않은 파일을 제외하지만, 이미 Git이 추적 중인 파일을 자동으로 제거하지 않습니다. 푸시 전 로컬 터미널에서 확인하세요.

```bash
git check-ignore -v .env .env.local .env.production .vercel
git status --short
git diff --cached --name-only
git ls-files
```

`.env`, `.env.local`, `.env.production`, 실제 키·인증서·자격 증명 파일이 추적 목록이나 스테이징 목록에 있으면 푸시하지 마세요. 이미 추적된 파일은 해당 경로를 `git rm --cached -- <파일경로>`로 인덱스에서 제거해야 합니다. 비밀 키를 원격 저장소에 올린 적이 있다면 파일 삭제만으로는 부족하므로 키를 폐기하고 교체하세요.
