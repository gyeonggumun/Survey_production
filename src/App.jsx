import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';

const navigation = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/surveys', label: '내 설문', icon: ClipboardList },
  { to: '/results', label: '응답 분석', icon: BarChart3 },
];

const previewSurveys = [
  {
    id: 'customer-satisfaction',
    title: '고객 만족도 조사',
    category: '고객 경험',
    updatedAt: '오늘 수정',
    responses: 128,
    status: 'live',
    color: 'mint',
  },
  {
    id: 'team-wellbeing',
    title: '팀을 위한 새로운 복지 아이디어',
    category: '팀 문화',
    updatedAt: '어제 수정',
    responses: 86,
    status: 'live',
    color: 'peach',
  },
  {
    id: 'brand-awareness',
    title: '브랜드 인지도 테스트',
    category: '마케팅',
    updatedAt: '6월 12일 수정',
    responses: 110,
    status: 'live',
    color: 'lavender',
  },
  {
    id: 'new-feature',
    title: '새 기능 사전 의견 받기',
    category: '제품 피드백',
    updatedAt: '6월 10일 수정',
    responses: 0,
    status: 'draft',
    color: 'blue',
  },
];

const statusLabels = {
  live: '진행 중',
  draft: '임시 저장',
};

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const pageTitle = location.pathname.startsWith('/surveys/new')
    ? '새 설문'
    : location.pathname.startsWith('/surveys/') && location.pathname !== '/surveys/'
      ? '설문 미리보기'
      : navigation.find((item) => item.to === location.pathname)?.label ?? '워크스페이스';

  return (
    <div className="app-frame">
      {mobileMenuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`} aria-label="주 메뉴">
        <div className="sidebar-brand-row">
          <Link className="brand" to="/" aria-label="모아 설문 홈">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">모아<span>설문</span></span>
          </Link>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar" aria-hidden="true">M</span>
          <span className="workspace-copy">
            <span className="workspace-label">워크스페이스</span>
            <strong>나의 작업 공간</strong>
          </span>
          <ChevronRight className="workspace-chevron" size={16} aria-hidden="true" />
        </div>

        <div className="nav-section-label">메뉴</div>
        <nav className="primary-navigation" aria-label="워크스페이스 메뉴">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {to === '/surveys' && <span className="nav-count">08</span>}
            </NavLink>
          ))}
        </nav>

        <div className="nav-section-label nav-section-label-spaced">관리</div>
        <nav className="primary-navigation" aria-label="관리 메뉴">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
          >
            <Settings2 size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>설정</span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-help-card">
          <div className="help-card-icon"><LifeBuoy size={17} aria-hidden="true" /></div>
          <strong>차근차근 만들어가요</strong>
          <p>지금은 기본 화면을 준비하고 있어요. 다음 단계에서 실제 기능을 연결합니다.</p>
          <Link to="/settings" className="help-card-link">
            개발 단계 보기 <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">모</div>
          <div className="account-copy">
            <strong>미리보기 모드</strong>
            <span>로그인 기능 준비 중</span>
          </div>
          <MoreHorizontal size={19} className="account-more" aria-hidden="true" />
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu-toggle"
              type="button"
              aria-label="메뉴 열기"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumbs" aria-label="현재 위치">
              <span>나의 작업 공간</span>
              <ChevronRight size={15} aria-hidden="true" />
              <strong>{pageTitle}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="preview-indicator"><span /> 미리보기</span>
            <Link className="icon-button topbar-help" to="/settings" aria-label="도움말 및 개발 단계">
              <CircleHelp size={19} />
            </Link>
            <button className="topbar-avatar" type="button" aria-label="로그인 기능 준비 중" title="로그인 기능 준비 중">
              모
            </button>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/surveys" element={<SurveysPage />} />
            <Route
              path="/surveys/new"
              element={(
                <FeaturePlaceholder
                  icon={FilePlus2}
                  eyebrow="설문 제작"
                  title="질문을 담을 준비를 하고 있어요"
                  description="설문 편집기는 다음 개발 단계에서 만들 예정입니다. 이 단계에서는 화면 구성과 이동 흐름을 먼저 확인할 수 있어요."
                  step="다음 단계"
                />
              )}
            />
            <Route
              path="/surveys/:surveyId"
              element={(
                <FeaturePlaceholder
                  icon={FileText}
                  eyebrow="설문 미리보기"
                  title="설문 상세 화면은 준비 중이에요"
                  description="현재 목록의 제목과 응답 수는 화면을 보여주기 위한 예시입니다. 데이터 저장과 편집 기능은 아직 연결되지 않았어요."
                  step="설문 편집 기능 예정"
                />
              )}
            />
            <Route
              path="/results"
              element={(
                <FeaturePlaceholder
                  icon={BarChart3}
                  eyebrow="응답 분석"
                  title="응답이 모이면 여기서 살펴볼 수 있어요"
                  description="질문별 차트와 주관식 답변, 제출 시간을 확인하는 결과 화면을 다음 단계에서 연결합니다."
                  step="응답 저장 후 진행"
                />
              )}
            />
            <Route
              path="/settings"
              element={(
                <FeaturePlaceholder
                  icon={Settings2}
                  eyebrow="개발 단계"
                  title="모아 설문을 순서대로 만들고 있어요"
                  description="먼저 기본 화면과 반응형 틀을 마련했습니다. 다음으로 인증, 설문 제작, 응답 수집, 결과 확인을 차례로 구현합니다."
                  step="1단계 · 기본 화면"
                  showRoadmap
                />
              )}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

        <footer className="app-footer">
          <span>모아 설문 <span className="footer-dot">·</span> 더 나은 질문을 위한 작은 시작</span>
          <span>현재 화면은 MVP 미리보기입니다</span>
        </footer>

        <nav className="mobile-tabbar" aria-label="빠른 메뉴">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `mobile-tab${isActive ? ' mobile-tab-active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}

function DashboardPage() {
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow"><Sparkles size={15} aria-hidden="true" /> 좋은 질문을 시작해요</span>
          <h1>의견을 모으는 일,<br /><span>모아와 함께 시작해요.</span></h1>
          <p>간편하게 설문을 만들고, 흩어진 생각을 한곳에 모아보세요.</p>
          <div className="welcome-actions">
            <Link to="/surveys/new" className="button button-primary">
              <Plus size={18} aria-hidden="true" /> 새 설문 만들기
            </Link>
            <Link to="/surveys" className="button button-quiet">
              내 설문 둘러보기 <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit hero-orbit-back" />
          <div className="hero-orbit hero-orbit-front" />
          <div className="hero-sheet">
            <div className="hero-sheet-top">
              <span className="hero-mini-brand"><span className="mini-brand-mark" /> 모아 설문</span>
              <MoreHorizontal size={18} />
            </div>
            <div className="hero-question-label">고객 경험</div>
            <strong className="hero-question">오늘의 경험은 어떠셨나요?</strong>
            <div className="hero-answer hero-answer-selected"><span className="hero-radio" /> 아주 만족해요 <Check size={14} /></div>
            <div className="hero-answer"><span className="hero-radio" /> 만족해요</div>
            <div className="hero-answer"><span className="hero-radio" /> 보통이에요</div>
            <div className="hero-progress"><span /></div>
          </div>
          <div className="hero-floating-card">
            <span className="floating-sparkle"><Zap size={17} fill="currentColor" /></span>
            <span><strong>좋은 인사이트</strong><small>의견이 모이는 중이에요</small></span>
          </div>
          <div className="hero-confetti hero-confetti-one" />
          <div className="hero-confetti hero-confetti-two" />
        </div>
      </section>

      <div className="preview-notice" role="note">
        <span className="notice-icon"><CircleHelp size={17} aria-hidden="true" /></span>
        <p><strong>화면 미리보기 데이터</strong><span>아래 설문과 수치는 UI 예시이며, 아직 저장되거나 실제 응답을 수집하지 않습니다.</span></p>
        <span className="notice-tag">샘플</span>
      </div>

      <section className="metric-grid" aria-label="미리보기 요약">
        <MetricCard icon={ClipboardList} label="전체 설문" value="08" detail="내 작업 공간의 설문" tone="green" />
        <MetricCard icon={BarChart3} label="모은 응답" value="324" detail="모든 설문의 응답 합계" tone="blue" />
        <MetricCard icon={FileText} label="진행 중" value="03" detail="현재 응답을 받는 설문" tone="orange" />
        <MetricCard icon={Sparkles} label="평균 완료율" value="74%" detail="최근 설문 기준" tone="purple" />
      </section>

      <div className="dashboard-grid">
        <SurveyLibrary compact />
        <aside className="dashboard-aside">
          <GettingStartedCard />
          <div className="tip-card">
            <div className="tip-icon"><Sparkles size={18} aria-hidden="true" /></div>
            <div className="tip-copy">
              <span className="tip-label">작은 팁</span>
              <h3>좋은 설문은 짧고 명확해요</h3>
              <p>한 번에 하나씩 묻고, 질문의 목적을 분명하게 정하면 더 좋은 답변을 얻을 수 있어요.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon-${tone}`}><Icon size={19} strokeWidth={1.9} aria-hidden="true" /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function GettingStartedCard() {
  return (
    <section className="getting-started-card">
      <div className="getting-started-heading">
        <span className="getting-started-icon"><Zap size={16} fill="currentColor" aria-hidden="true" /></span>
        <span>함께 만드는 중</span>
      </div>
      <h2>모아 시작하기</h2>
      <p>필요한 기능을 한 단계씩 연결하고 있어요.</p>
      <ol className="roadmap-list">
        <li className="roadmap-current">
          <span className="roadmap-marker"><Check size={13} aria-hidden="true" /></span>
          <span><strong>기본 화면과 반응형 틀</strong><small>현재 단계 · 완료</small></span>
        </li>
        <li>
          <span className="roadmap-marker roadmap-number">2</span>
          <span><strong>계정과 로그인</strong><small>다음 단계</small></span>
        </li>
        <li>
          <span className="roadmap-marker roadmap-number">3</span>
          <span><strong>설문 제작과 응답</strong><small>데이터 저장 연결</small></span>
        </li>
      </ol>
      <Link to="/settings" className="text-link">
        전체 진행 단계 보기 <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

function SurveysPage() {
  return (
    <>
      <div className="page-heading-row">
        <div>
          <span className="eyebrow eyebrow-plain">워크스페이스</span>
          <h1 className="page-title">내 설문</h1>
          <p className="page-description">만든 설문을 한곳에서 살펴보고 관리해요.</p>
        </div>
        <Link to="/surveys/new" className="button button-primary">
          <Plus size={18} aria-hidden="true" /> 새 설문 만들기
        </Link>
      </div>
      <div className="preview-notice compact-notice" role="note">
        <span className="notice-icon"><CircleHelp size={17} aria-hidden="true" /></span>
        <p><strong>예시 목록입니다</strong><span>실제 설문 데이터는 아직 연결되지 않았어요.</span></p>
        <span className="notice-tag">샘플</span>
      </div>
      <SurveyLibrary />
    </>
  );
}

function SurveyLibrary({ compact = false }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredSurveys = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko');
    return previewSurveys.filter((survey) => {
      const matchesStatus = filter === 'all' || survey.status === filter;
      const matchesQuery = !normalizedQuery || survey.title.toLocaleLowerCase('ko').includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, query]);

  const visibleSurveys = compact ? filteredSurveys.slice(0, 4) : filteredSurveys;

  return (
    <section className={`survey-library-card${compact ? ' survey-library-compact' : ''}`}>
      <div className="library-heading">
        <div>
          <span className="section-kicker">MY SURVEYS</span>
          <h2>{compact ? '최근 설문' : '모든 설문'}</h2>
        </div>
        {compact ? (
          <Link to="/surveys" className="text-link library-all-link">
            모두 보기 <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="library-count">예시 {filteredSurveys.length}개</span>
        )}
      </div>

      <div className="library-toolbar">
        <div className="filter-tabs" role="group" aria-label="설문 상태 필터">
          <FilterButton value="all" activeValue={filter} onSelect={setFilter} label="전체" count="08" />
          <FilterButton value="live" activeValue={filter} onSelect={setFilter} label="진행 중" count="03" />
          <FilterButton value="draft" activeValue={filter} onSelect={setFilter} label="임시 저장" count="05" />
        </div>
        <label className="survey-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="설문 검색"
            aria-label="설문 제목 검색"
          />
        </label>
      </div>

      <div className="survey-list" aria-live="polite">
        {visibleSurveys.length > 0 ? visibleSurveys.map((survey) => (
          <SurveyRow key={survey.id} survey={survey} />
        )) : (
          <div className="empty-search">
            <span className="empty-search-icon"><Search size={19} aria-hidden="true" /></span>
            <strong>검색 결과가 없어요</strong>
            <span>다른 검색어나 상태 필터를 선택해 보세요.</span>
            <button type="button" className="text-button" onClick={() => { setQuery(''); setFilter('all'); }}>
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {compact && (
        <div className="library-footer-note">
          <span className="status-dot" /> 실제 데이터 연결 전 미리보기
        </div>
      )}
    </section>
  );
}

function FilterButton({ value, activeValue, onSelect, label, count }) {
  const isActive = value === activeValue;
  return (
    <button
      type="button"
      className={`filter-tab${isActive ? ' filter-tab-active' : ''}`}
      aria-pressed={isActive}
      onClick={() => onSelect(value)}
    >
      {label}<span>{count}</span>
    </button>
  );
}

function SurveyRow({ survey }) {
  return (
    <article className="survey-row">
      <div className="survey-main">
        <span className={`survey-file-icon survey-file-${survey.color}`}><FileText size={18} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="survey-copy">
          <Link to={`/surveys/${survey.id}`} className="survey-title">{survey.title}</Link>
          <span className="survey-category">{survey.category}<span className="category-dot">·</span>{survey.updatedAt}</span>
        </span>
      </div>
      <div className="survey-response-count">
        <strong>{survey.responses}</strong><span>응답</span>
      </div>
      <span className={`status-badge status-${survey.status}`}>
        <span />{statusLabels[survey.status]}
      </span>
      <Link to={`/surveys/${survey.id}`} className="survey-open-link" aria-label={`${survey.title} 상세 보기`}>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}

function FeaturePlaceholder({ icon: Icon, eyebrow, title, description, step, showRoadmap = false }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-breadcrumb"><span>워크스페이스</span><ChevronRight size={14} aria-hidden="true" /><strong>{eyebrow}</strong></div>
      <div className="placeholder-card">
        <div className="placeholder-illustration">
          <div className="placeholder-illustration-back" />
          <div className="placeholder-illustration-icon"><Icon size={30} strokeWidth={1.7} aria-hidden="true" /></div>
          <span className="placeholder-sparkle placeholder-sparkle-one"><Sparkles size={16} aria-hidden="true" /></span>
          <span className="placeholder-sparkle placeholder-sparkle-two"><span /></span>
        </div>
        <span className="step-pill"><span />{step}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="placeholder-actions">
          <Link to="/" className="button button-primary">대시보드로 돌아가기 <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/surveys" className="button button-outline">내 설문 보기</Link>
        </div>
        <div className="placeholder-footnote"><CircleHelp size={15} aria-hidden="true" /> 아직 계정이나 설문 데이터가 저장되지 않습니다.</div>
      </div>
      {showRoadmap && <RoadmapPanel />}
    </section>
  );
}

function RoadmapPanel() {
  const steps = [
    { number: '01', title: '기본 화면과 반응형 틀', detail: 'React · JSX · 라우팅', complete: true },
    { number: '02', title: '회원가입과 로그인', detail: 'Supabase Auth', complete: false },
    { number: '03', title: '설문 제작과 발행', detail: '질문 편집 · 공개 링크', complete: false },
    { number: '04', title: '응답 수집과 결과', detail: '응답 저장 · 통계 확인', complete: false },
    { number: '05', title: '보안 점검과 배포', detail: 'RLS · Vercel', complete: false },
  ];

  return (
    <div className="roadmap-panel">
      <div className="roadmap-panel-heading">
        <div><span className="section-kicker">MVP ROADMAP</span><h2>순서대로 진행할게요</h2></div>
        <span className="roadmap-progress-label">1 / 5 단계</span>
      </div>
      <div className="roadmap-steps">
        {steps.map((step) => (
          <div className={`roadmap-step${step.complete ? ' roadmap-step-complete' : ''}`} key={step.number}>
            <span className="roadmap-step-number">{step.complete ? <Check size={14} aria-label="완료" /> : step.number}</span>
            <span className="roadmap-step-copy"><strong>{step.title}</strong><small>{step.detail}</small></span>
            {step.complete && <span className="roadmap-done-label">완료</span>}
          </div>
        ))}
      </div>
      <p className="roadmap-note">각 단계를 마친 뒤 결과를 공유하고, 확인과 수정이 끝나면 다음 단계로 넘어갑니다.</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="not-found-card">
      <span className="not-found-number">404</span>
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소가 바뀌었거나 아직 준비되지 않은 페이지일 수 있어요.</p>
      <Link to="/" className="button button-primary">대시보드로 이동 <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  );
}

export default App;
