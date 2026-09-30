import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import './AuthPage.css';

function getAuthErrorMessage(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();

  if (code.includes('invalid_credentials') || message.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (code.includes('email_not_confirmed') || message.includes('email not confirmed')) {
    return '이메일 인증을 먼저 완료해 주세요.';
  }
  if (code.includes('user_already_exists') || message.includes('user already registered')) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.';
  }
  if (code.includes('weak_password') || message.includes('password should be')) {
    return '비밀번호 기준을 확인해 주세요. 8자 이상으로 설정하는 것을 권장합니다.';
  }
  if (code.includes('redirect_to_not_allowed') || message.includes('redirect url')) {
    return 'Supabase 인증 설정에서 현재 사이트 주소를 허용된 리디렉션 URL에 추가해 주세요.';
  }
  if (code.includes('over_email_send_rate_limit') || message.includes('rate limit')) {
    return '요청이 잠시 많습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Supabase에 연결할 수 없습니다. 연결 정보와 네트워크를 확인해 주세요.';
  }
  return '요청을 처리하지 못했어요. Supabase Auth 설정을 확인한 뒤 다시 시도해 주세요.';
}

function getSafeReturnPath(location) {
  const pathname = location.state?.from?.pathname;
  return typeof pathname === 'string' && pathname.startsWith('/') && pathname !== '/auth'
    ? pathname
    : '/';
}

export default function AuthPage() {
  const { isConfigured, signIn, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setErrorMessage('');
    setNoticeMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    if (mode === 'signup' && password !== passwordConfirmation) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) {
          setErrorMessage(getAuthErrorMessage(error));
          return;
        }

        if (data?.session) {
          navigate(getSafeReturnPath(location), { replace: true });
          return;
        }

        setNoticeMessage('가입 요청을 받았어요. 이메일 인증이 설정되어 있다면 인증을 완료한 뒤 로그인해 주세요.');
        setMode('login');
        setPassword('');
        setPasswordConfirmation('');
        return;
      }

      const { data, error } = await signIn({ email: email.trim(), password });
      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }
      if (!data?.session) {
        setErrorMessage('로그인 세션을 확인하지 못했어요. 다시 시도해 주세요.');
        return;
      }

      navigate(getSafeReturnPath(location), { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting;

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro" aria-label="모아 설문 소개">
          <Link className="auth-brand" to="/auth" aria-label="모아 설문 로그인">
            <span className="auth-brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="auth-brand-name">모아<span>설문</span></span>
          </Link>

          <div className="auth-intro-copy">
            <span className="auth-eyebrow"><Sparkles size={15} aria-hidden="true" /> MOA SURVEY</span>
            <h1>의견을 모으는 일,<br /><span>함께 시작해요.</span></h1>
            <p>질문을 만들고 생각을 모아 더 나은 다음을 준비해 보세요.</p>
            <ul className="auth-benefit-list">
              <li><span><Check size={14} aria-hidden="true" /></span>내 계정으로 설문 공간을 안전하게 관리해요</li>
              <li><span><Check size={14} aria-hidden="true" /></span>로그인 후 나만의 작업 화면으로 이동해요</li>
              <li><span><Check size={14} aria-hidden="true" /></span>모바일에서도 편안하게 사용할 수 있어요</li>
            </ul>
          </div>

          <div className="auth-intro-footnote">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>인증은 Supabase Auth로 처리되며 비밀번호를 앱에서 직접 저장하지 않습니다.</span>
          </div>
          <span className="auth-decoration auth-decoration-one" aria-hidden="true" />
          <span className="auth-decoration auth-decoration-two" aria-hidden="true" />
        </section>

        <section className="auth-content" aria-labelledby="auth-heading">
          <div className="auth-content-top">
            <span>나의 작업 공간</span>
            <span className="auth-stage-pill"><span /> MVP · 인증 단계</span>
          </div>

          <div className="auth-card">
            <div className="auth-card-icon" aria-hidden="true"><LockKeyhole size={21} /></div>
            <span className="auth-card-kicker">WELCOME TO MOA</span>
            <h2 id="auth-heading">{mode === 'login' ? '다시 만나 반가워요' : '새 계정을 만들어요'}</h2>
            <p className="auth-card-description">
              {mode === 'login'
                ? '이메일과 비밀번호로 로그인해 작업을 이어가세요.'
                : '이메일 주소를 등록하고 모아 설문을 시작해 보세요.'}
            </p>

            <div className="auth-mode-tabs" role="tablist" aria-label="계정 작업 선택">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'auth-mode-tab auth-mode-tab-active' : 'auth-mode-tab'}
                onClick={() => chooseMode('login')}
              >로그인</button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'auth-mode-tab auth-mode-tab-active' : 'auth-mode-tab'}
                onClick={() => chooseMode('signup')}
              >회원가입</button>
            </div>

            {!isConfigured && (
              <div className="auth-feedback auth-feedback-setup" role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <span>Supabase 연결 설정이 필요합니다. 프로젝트 루트의 <code>env.example</code>을 <code>.env</code>로 복사하고 URL과 공개 키를 입력한 뒤 개발 서버를 다시 시작해 주세요.</span>
              </div>
            )}

            {noticeMessage && (
              <div className="auth-feedback auth-feedback-success" role="status" aria-live="polite">
                <CheckCircle2 size={17} aria-hidden="true" /><span>{noticeMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="auth-feedback auth-feedback-error" role="alert">
                <CircleAlert size={17} aria-hidden="true" /><span>{errorMessage}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="auth-email">이메일</label>
                <div className="auth-input-shell">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={!isConfigured || busy}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password">비밀번호</label>
                <div className="auth-input-shell">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'login' ? '비밀번호를 입력해 주세요' : '8자 이상 입력해 주세요'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={mode === 'signup' ? 8 : undefined}
                    required
                    disabled={!isConfigured || busy}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={!isConfigured || busy}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
                {mode === 'signup' && <span className="auth-field-hint">비밀번호는 8자 이상으로 입력해 주세요.</span>}
              </div>

              {mode === 'signup' && (
                <div className="auth-field">
                  <label htmlFor="auth-password-confirmation">비밀번호 확인</label>
                  <div className="auth-input-shell">
                    <LockKeyhole size={17} aria-hidden="true" />
                    <input
                      id="auth-password-confirmation"
                      name="passwordConfirmation"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="비밀번호를 한 번 더 입력해 주세요"
                      value={passwordConfirmation}
                      onChange={(event) => setPasswordConfirmation(event.target.value)}
                      minLength={8}
                      required
                      disabled={!isConfigured || busy}
                    />
                  </div>
                </div>
              )}

              <button className="auth-submit-button" type="submit" disabled={!isConfigured || busy}>
                <span>
                  {!isConfigured
                    ? 'Supabase 설정이 필요해요'
                    : busy
                      ? '처리 중이에요'
                      : mode === 'login'
                        ? '로그인'
                        : '계정 만들기'}
                </span>
                {!busy && isConfigured && <ArrowRight size={17} aria-hidden="true" />}
                {busy && <span className="auth-spinner" aria-hidden="true" />}
              </button>
            </form>

            <div className="auth-card-footer">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>계정 인증 정보를 안전하게 보호하세요. 다른 사람과 비밀번호를 공유하지 마세요.</span>
            </div>
          </div>

          <p className="auth-content-footer">모아 설문 <span>·</span> 더 나은 질문을 위한 작은 시작</p>
        </section>
      </div>
    </main>
  );
}
