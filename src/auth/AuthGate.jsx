import { Navigate, useLocation } from 'react-router-dom';
import App from '../App.jsx';
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

  if (isLoading) return <SessionLoadingScreen />;

  if (location.pathname === '/auth') {
    return user ? <Navigate to="/" replace /> : <AuthPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 설문 제작과 관리는 데이터베이스에 연결된 MVP 화면을 사용합니다.
  if (/^\/surveys(?:\/|$)/.test(location.pathname)) return <SurveyFlow />;

  return <App />;
}
