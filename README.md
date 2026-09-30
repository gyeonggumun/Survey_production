# 모아 설문 (Moa Survey)

React + Vite로 시작하는 설문 서비스 MVP입니다. 현재는 **1단계 프로젝트 기본 설정과 반응형 화면 뼈대**를 구성했습니다. 설문 편집·저장, 로그인, 응답 제출, 결과 통계는 다음 단계에서 연결합니다.

## 로컬 실행

필요 환경: Node.js 18 이상, npm

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 열어 확인합니다. 프로덕션 빌드는 `npm run build`, 빌드 결과 미리보기는 `npm run preview`입니다.

## Supabase 환경 변수 준비

1. 프로젝트 루트의 `env.example`을 복사해 `.env` 파일을 만듭니다. Windows PowerShell에서는 `Copy-Item env.example .env`, macOS/Linux에서는 `cp env.example .env`를 사용할 수 있습니다.
2. Supabase 프로젝트의 URL과 공개 anon/publishable 키를 각각 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`에 입력합니다.
3. 개발 서버를 다시 시작합니다.

아직 데이터베이스 호출은 연결하지 않았습니다. `src/lib/supabase.js`는 두 환경 변수가 모두 있을 때만 클라이언트를 생성하도록 준비되어 있습니다. 브라우저용 공개 키는 테이블의 RLS 정책과 함께 사용해야 하며 **Service Role Key는 프런트엔드 환경 변수에 절대 넣지 마세요.** `.env`는 `.gitignore`에 포함되어 있습니다.

## 현재 포함된 내용

- React 18, JSX, Vite, Tailwind CSS 설정
- React Router 기반의 대시보드·설문 목록·준비 중 화면 라우팅
- 밝은 색감의 반응형 워크스페이스 UI와 모바일 하단 내비게이션
- Supabase 클라이언트 연결 준비 및 환경 변수 예시

## 아직 연결하지 않은 기능

- 회원가입, 로그인, 로그아웃 및 인증 보호
- 설문 CRUD, 질문 편집기, 미리보기와 발행
- 공개 응답 링크, 응답 저장, 결과 차트
- Supabase 스키마·RLS 정책, Vercel 배포

화면의 설문 생성·결과 메뉴는 현재 다음 개발 단계를 안내합니다. 인증부터 기능을 순차적으로 추가하며, 각 단계 완료 후 확인과 수정을 거쳐 다음 단계로 진행합니다.
