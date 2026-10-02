import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import App from '../App.jsx';
import PublicSurveyPage from '../surveys/PublicSurveyPage.jsx';
import SurveyFlow from '../surveys/SurveyFlow.jsx';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './AuthPage.jsx';

function SessionLoadingScreen() {
  return (
    <main className="auth-loading-screen" role="status" aria-live="polite">
      <span className="auth-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <strong>계정 정보를 확인하고 있어요</strong>
      <span>잠시만 기다려 주세요.</span>
    </main>
  );
}

export default function AuthGate() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 공개 설문 응답은 로그인 없이 접근할 수 있습니다.
  if (/^\/s\/[^/]+\/?$/.test(location.pathname)) {
    return <Routes><Route path="/s/:surveyId" element={<PublicSurveyPage />} /></Routes>;
  }

  if (isLoading) return <SessionLoadingScreen />;

  if (location.pathname === '/auth') {
    return user ? <Navigate to="/" replace /> : <AuthPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 설문 및 응답 결과 영역은 인증 사용자용 데이터베이스 화면을 사용합니다.
  if (/^\/(?:surveys|results)(?:\/|$)/.test(location.pathname)) return <SurveyFlow />;

  return <App />;
}
