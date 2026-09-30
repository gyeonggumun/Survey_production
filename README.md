# 모아 설문 (Moa Survey)

React + Vite로 만드는 설문 서비스 MVP입니다. 현재 **1단계 기본 화면**과 **2단계 계정 인증**을 연결했습니다. 로그인 후의 설문 목록과 대시보드 수치는 아직 UI 예시이며, 설문 저장·응답 수집·결과 분석은 다음 단계에서 구현합니다.

## 로컬 실행

필요 환경: Node.js 18 이상, npm

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 엽니다. 프로덕션 빌드는 `npm run build`, 빌드 결과 미리보기는 `npm run preview`입니다.

## Supabase Auth 설정

1. Supabase에서 프로젝트를 만들고 **Authentication → Providers → Email**에서 이메일 로그인을 활성화합니다.
2. **Authentication → URL Configuration → Redirect URLs**에 로컬 주소 `http://localhost:5173`을 추가합니다. 배포 시에는 배포 도메인도 등록합니다.
3. 프로젝트 루트의 `env.example`을 복사해 `.env`를 만들고, Supabase의 Project URL과 공개 anon/publishable 키를 입력합니다. Windows PowerShell에서는 `Copy-Item env.example .env`, macOS/Linux에서는 `cp env.example .env`를 사용할 수 있습니다.
4. 개발 서버를 다시 시작한 다음 회원가입 또는 로그인을 확인합니다. 이메일 확인이 활성화되어 있으면 메일 인증 후 로그인해야 합니다.

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

브라우저용 공개 키만 사용합니다. **Service Role Key는 `VITE_` 변수나 프런트엔드 코드에 넣지 마세요.** `.env`와 로컬 환경 파일은 Git에서 제외됩니다. `env.example`은 값이 없는 설정 템플릿으로만 유지하세요.

## 이번 단계에 포함된 내용

- 회원가입과 이메일·비밀번호 로그인
- Supabase Auth 세션 복원, 로그아웃, 미인증 사용자의 화면 접근 제한
- 이메일 확인이 필요한 경우의 안내와 기본 오류 처리
- Supabase 설정이 없을 때 미리보기 화면 대신 설정 안내 표시
- 모바일을 포함한 밝은 반응형 인증 화면
- `.env`, 로컬 환경 파일, 키·인증서 파일, Vercel/Supabase 로컬 상태를 위한 `.gitignore` 규칙 보강

## 아직 연결하지 않은 기능

- 설문 생성·수정·삭제와 질문 편집기
- 공개 응답 링크와 응답 저장
- 실제 결과 통계 및 차트
- 데이터베이스 스키마와 RLS 정책
- Vercel 배포 및 프로덕션 URL 검증

현재 대시보드의 설문과 숫자는 예시 데이터이며, 데이터베이스에 저장되거나 실제 응답을 수집하지 않습니다. 설문 데이터 연결은 RLS 정책과 함께 다음 단계에서 진행합니다.

## GitHub에 올리기 전 비밀 파일 이중 점검

`.gitignore`는 새 파일과 추적되지 않은 파일을 제외하지만, 이미 Git이 추적 중인 파일을 자동으로 저장소에서 제거하지는 않습니다. **푸시 전 로컬 터미널에서 파일명과 스테이징 목록을 모두 확인하세요.**

```bash
# 무시 규칙에 걸리는지 확인 (존재하는 로컬 파일은 규칙을 출력해야 합니다)
git check-ignore -v .env .env.local .env.production .vercel

# 변경 파일과 이미 스테이징된 파일을 확인
git status --short
git diff --cached --name-only

# 저장소가 추적 중인 전체 파일 경로 확인
git ls-files
```

`.env`, `.env.local`, `.env.production`, 실제 키·인증서·자격 증명 파일이 `git ls-files` 또는 스테이징 목록에 있으면 푸시하지 마세요. 이미 추적된 비밀 파일은 해당 경로에 대해 `git rm --cached -- <파일경로>`로 인덱스에서 제거해야 합니다. `.gitignore`만 추가하는 것으로는 추적 중인 파일이 제거되지 않습니다. 비밀 키를 원격 저장소에 올린 적이 있다면 파일 삭제만으로 충분하지 않으므로 해당 키를 폐기하고 교체하세요.

`env.example`은 의도적으로 커밋할 수 있는 빈 템플릿입니다. 실제 Supabase URL이나 키를 넣지 마세요. 위 명령은 로컬에서 직접 실행해야 하며, 이 프로젝트의 파일 도구로는 Git 인덱스·스테이징 상태나 원격 GitHub 업로드 상태를 조회할 수 없습니다.
