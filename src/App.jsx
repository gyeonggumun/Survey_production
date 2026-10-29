import './dashboard/dashboard.css';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import DashboardPage from './dashboard/DashboardPage.jsx';

// 주 메뉴 정보는 데스크톱과 모바일 메뉴가 함께 사용합니다.
const navigation = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/surveys', label: '내 설문', icon: ClipboardList },
  { to: '/results', label: '응답 분석', icon: BarChart3 },
];

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const { user, signOut } = useAuth();
  const location = useLocation();
  const accountEmail = user?.email?.trim() || '내 계정';
  const accountName = accountEmail.includes('@') ? accountEmail.split('@')[0] : accountEmail;
  const accountInitial = accountName.slice(0, 1).toLocaleUpperCase('ko-KR') || 'M';

  // 모바일 메뉴를 연 상태에서 다른 페이지로 이동하면 메뉴를 자동으로 닫습니다.
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError('');
    try {
      const { error } = await signOut();
      if (error) setSignOutError('로그아웃에 실패했어요. 다시 시도해 주세요.');
    } catch {
      setSignOutError('로그아웃에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsSigningOut(false);
    }
  };

  // 현재 경로에 맞춰 상단 이동 경로 제목을 표시합니다.
  const pageTitle = location.pathname.startsWith('/surveys/new') ? '새 설문'
    : location.pathname.startsWith('/surveys/') ? '설문'
      : navigation.find((item) => item.to === location.pathname)?.label ?? '워크스페이스';

  return (
    <div className="app-frame">
      {mobileMenuOpen && <button className="sidebar-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`} aria-label="주 메뉴">
        <div className="sidebar-brand-row">
          <Link className="brand" to="/" aria-label="모아 설문 홈"><img className="brand-mark" src="/moa-logo.svg" alt="" /><span className="brand-name">모아<span>설문</span></span></Link>
          <button className="icon-button sidebar-close" type="button" aria-label="메뉴 닫기" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button>
        </div>
        <div className="workspace-switcher"><span className="workspace-avatar" aria-hidden="true">M</span><span className="workspace-copy"><span className="workspace-label">워크스페이스</span><strong>나의 작업 공간</strong></span><ChevronRight className="workspace-chevron" size={16} aria-hidden="true" /></div>
        <div className="nav-section-label">메뉴</div>
        <nav className="primary-navigation" aria-label="워크스페이스 메뉴">
          {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help-card"><div className="help-card-icon"><LifeBuoy size={17} aria-hidden="true" /></div><strong>응답을 확인하세요</strong><p>발행한 설문의 응답을 질문별로 확인할 수 있어요.</p><Link to="/results" className="help-card-link">응답 분석 보기 <ArrowRight size={14} aria-hidden="true" /></Link></div>
        <div className="sidebar-account"><div className="account-avatar" aria-hidden="true">{accountInitial}</div><div className="account-copy"><strong title={accountEmail}>{accountName}</strong><span className={signOutError ? 'account-signout-error' : ''} role={signOutError ? 'status' : undefined} aria-live={signOutError ? 'polite' : undefined}>{signOutError || '로그인됨'}</span></div><button className="icon-button account-logout" type="button" aria-label="로그아웃" title="로그아웃" disabled={isSigningOut} onClick={handleSignOut}><LogOut size={16} aria-hidden="true" /></button></div>
      </aside>

      <main className="main-shell">
        <header className="topbar"><div className="topbar-leading"><button className="icon-button mobile-menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button><div className="breadcrumbs" aria-label="현재 위치"><span>나의 작업 공간</span><ChevronRight size={15} aria-hidden="true" /><strong>{pageTitle}</strong></div></div><div className="topbar-actions"><span className="preview-indicator"><span /> 실제 설문 데이터</span><button className="icon-button topbar-logout" type="button" aria-label="로그아웃" title="로그아웃" disabled={isSigningOut} onClick={handleSignOut}><LogOut size={17} aria-hidden="true" /></button></div></header>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <footer className="app-footer"><span>모아 설문 <span className="footer-dot">·</span> 더 나은 질문을 위한 작은 시작</span><span>대시보드 수치는 내 설문과 실제 응답 기준</span></footer>
        <nav className="mobile-tabbar" aria-label="빠른 메뉴">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-tab${isActive ? ' mobile-tab-active' : ''}`}><Icon size={19} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return <div className="not-found-card"><span className="not-found-number">404</span><h1>페이지를 찾을 수 없어요</h1><p>주소가 바뀌었거나 아직 준비되지 않은 페이지일 수 있어요.</p><Link to="/" className="button button-primary">대시보드로 이동 <ArrowRight size={16} aria-hidden="true" /></Link></div>;
}

export default App;
