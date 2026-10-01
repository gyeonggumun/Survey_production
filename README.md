# 모아 설문 (Moa Survey)

React + Vite 기반 설문 서비스 MVP입니다. 기본 화면과 Supabase 이메일 인증에 이어, 현재 단계에서는 로그인한 사용자가 설문을 만들고 질문을 편집·저장·발행 상태로 관리할 수 있습니다. 공개 응답 제출과 결과 분석은 아직 구현하지 않았습니다.

## 로컬 실행

필요 환경: Node.js 18 이상, npm

```bash
npm install
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

## Supabase 데이터베이스 설치 (이번 단계)

1. Supabase Dashboard에서 해당 프로젝트를 연 뒤 **SQL Editor → New query**를 선택합니다.
2. 저장소의 `supabase/schema.sql` 전체 내용을 복사해 SQL Editor에 붙여 넣고 실행합니다.
3. **Table Editor**에서 `surveys`, `questions` 테이블이 만들어졌는지 확인합니다. 두 테이블 모두 RLS가 활성화되어 있어야 합니다.
4. 로그인한 계정으로 앱을 열어 설문을 만들고 저장합니다. 내 설문 목록에서 수정·삭제하고, 질문 추가/유형 변경/순서 변경/필수 설정을 확인합니다.
5. 테스트용 설문을 발행한 후 로그아웃하고 다른 계정으로 확인할 수 있습니다. 게시된 설문과 질문의 읽기는 허용되지만, 다른 계정의 수정·삭제는 허용되지 않습니다. 아직 공개 응답 제출 기능은 없습니다.

`schema.sql`은 `surveys`와 `questions` 및 소유자/게시 설문 읽기 정책을 만듭니다. 응답 및 답변 테이블은 공개 설문 응답 기능을 구현하는 다음 단계에서 설계합니다. 이미 별도로 만든 동일 이름 테이블이나 정책이 있는 Supabase 프로젝트에서는 적용 전 스키마를 비교하세요. 이 스크립트는 두 테이블을 처음 만드는 MVP 기준이며, 같은 정의로 재실행할 수 있도록 테이블·정책 생성 일부가 안전하게 처리되어 있습니다.

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
- RLS 정책의 실제 Supabase 프로젝트 적용 여부 확인 및 프로덕션 데이터 통합 테스트

설문 발행은 현재 데이터베이스의 상태 변경을 뜻하며, 공개 링크로 응답을 받을 수 있다는 뜻은 아닙니다. 설문 미리보기는 내부 화면으로 로그인 세션이 필요합니다.

## GitHub에 올리기 전 비밀 파일 이중 점검

`.gitignore`는 새 파일과 추적되지 않은 파일을 제외하지만, 이미 Git이 추적 중인 파일을 자동으로 제거하지 않습니다. 푸시 전 로컬 터미널에서 확인하세요.

```bash
git check-ignore -v .env .env.local .env.production .vercel
git status --short
git diff --cached --name-only
git ls-files
```

`.env`, `.env.local`, `.env.production`, 실제 키·인증서·자격 증명 파일이 추적 목록이나 스테이징 목록에 있으면 푸시하지 마세요. 이미 추적된 파일은 해당 경로를 `git rm --cached -- <파일경로>`로 인덱스에서 제거해야 합니다. 비밀 키를 원격 저장소에 올린 적이 있다면 파일 삭제만으로는 부족하므로 키를 폐기하고 교체하세요. GitHub에 업로드하거나 Vercel 배포를 이 작업에서 실행하지 않았습니다.

> 로컬 명령 실행, Supabase Dashboard 설정, 실제 빌드·브라우저 테스트는 이 파일 편집 도구에서 수행하지 않았습니다. 위 적용 및 확인 절차는 프로젝트 소유자가 Supabase/Vercel과 로컬 개발 환경에서 진행해야 합니다.
