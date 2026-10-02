import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const statusLabels = { published: '발행됨', draft: '임시 저장' };
const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatUpdatedAt(value) {
  if (!value) return '수정 날짜 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '수정 날짜 없음';
  return `수정 ${new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)}`;
}

function formatError(error) {
  return error?.message || '네트워크 또는 데이터베이스 설정을 확인해 주세요.';
}

async function loadDashboardData(userId) {
  // 요약 지표와 최근 설문을 병렬 조회해 대시보드 대기 시간을 줄입니다.
  // 응답 전체 개수는 RLS 정책이 허용한 범위 안에서 집계됩니다.
  const [allSurveys, publishedSurveys, draftSurveys, allResponses, recentSurveys] = await Promise.all([
    supabase.from('surveys').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('surveys').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'published'),
    supabase.from('surveys').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'draft'),
    supabase.from('responses').select('id', { count: 'exact', head: true }),
    supabase.from('surveys')
      .select('id, title, description, status, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(4),
  ]);

  // 일부 쿼리만 실패해도 부정확한 일부 지표를 보여주지 않고 오류로 처리합니다.
  const failedQuery = [allSurveys, publishedSurveys, draftSurveys, allResponses, recentSurveys]
    .find((result) => result.error);
  if (failedQuery) throw failedQuery.error;

  const recentRows = recentSurveys.data ?? [];
  // 최근 설문 각각의 응답 수를 조회해 목록에 함께 표시합니다.
  const responseCounts = await Promise.all(recentRows.map(async (survey) => {
    const { count, error } = await supabase.from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', survey.id);
    if (error) throw error;
    return [survey.id, count ?? 0];
  }));
  const countBySurvey = new Map(responseCounts);

  return {
    metrics: {
      surveys: allSurveys.count ?? 0,
      responses: allResponses.count ?? 0,
      published: publishedSurveys.count ?? 0,
      drafts: draftSurveys.count ?? 0,
    },
    recentSurveys: recentRows.map((survey) => ({
      ...survey,
      responseCount: countBySurvey.get(survey.id) ?? 0,
    })),
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // 화면이 닫힌 뒤 늦게 도착한 조회 결과가 상태를 바꾸지 않게 막습니다.
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      if (!supabase || !user?.id) {
        setDashboard(null);
        setError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }

      try {
        const data = await loadDashboardData(user.id);
        if (active) setDashboard(data);
      } catch (loadError) {
        if (active) {
          setDashboard(null);
          setError(`대시보드 데이터를 불러오지 못했어요. ${formatError(loadError)}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user?.id, reloadKey]);

  const metrics = dashboard?.metrics;
  const recentSurveys = dashboard?.recentSurveys ?? [];

  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow"><Sparkles size={15} aria-hidden="true" /> 좋은 질문을 시작해요</span>
          <h1>의견을 모으는 일,<br /><span>모아와 함께 시작해요.</span></h1>
          <p>간편하게 설문을 만들고, 흩어진 생각을 한곳에 모아보세요.</p>
          <div className="welcome-actions">
            <Link to="/surveys/new" className="button button-primary"><Plus size={18} aria-hidden="true" /> 새 설문 만들기</Link>
            <Link to="/surveys" className="button button-quiet">내 설문 둘러보기 <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit hero-orbit-back" />
          <div className="hero-orbit hero-orbit-front" />
          <div className="hero-sheet">
            <div className="hero-sheet-top"><span className="hero-mini-brand"><span className="mini-brand-mark" /> 모아 설문</span><span>•••</span></div>
            <div className="hero-question-label">설문 미리보기</div>
            <strong className="hero-question">오늘의 경험은 어떠셨나요?</strong>
            <div className="hero-answer hero-answer-selected"><span className="hero-radio" /> 아주 만족해요 <Check size={14} /></div>
            <div className="hero-answer"><span className="hero-radio" /> 만족해요</div>
            <div className="hero-answer"><span className="hero-radio" /> 보통이에요</div>
            <div className="hero-progress"><span /></div>
          </div>
          <div className="hero-floating-card"><span className="floating-sparkle"><Zap size={17} fill="currentColor" /></span><span><strong>좋은 인사이트</strong><small>응답을 모아 확인해요</small></span></div>
          <div className="hero-confetti hero-confetti-one" />
          <div className="hero-confetti hero-confetti-two" />
        </div>
      </section>

      <div className={`preview-notice${error ? ' dashboard-notice-error' : ''}`} role={error ? 'alert' : 'status'}>
        <span className="notice-icon"><BarChart3 size={17} aria-hidden="true" /></span>
        <p>
          <strong>{error ? '실제 데이터를 불러오지 못했어요' : loading ? '내 설문 데이터를 불러오고 있어요' : '내 설문과 제출된 응답을 집계했어요'}</strong>
          <span>{error || 'Supabase에 저장된 내 설문과 응답 기준으로 표시합니다.'}</span>
        </p>
        {error
          ? <button className="dashboard-retry" type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={14} /> 다시 시도</button>
          : <span className="notice-tag">실제 데이터</span>}
      </div>

      <section className="metric-grid" aria-label="내 설문 요약" aria-busy={loading}>
        <MetricCard icon={ClipboardList} label="전체 설문" value={metrics ? numberFormatter.format(metrics.surveys) : '—'} detail="내가 만든 설문" tone="green" />
        <MetricCard icon={BarChart3} label="모은 응답" value={metrics ? numberFormatter.format(metrics.responses) : '—'} detail="제출 완료된 응답" tone="blue" />
        <MetricCard icon={FileText} label="발행된 설문" value={metrics ? numberFormatter.format(metrics.published) : '—'} detail="응답을 받을 수 있어요" tone="orange" />
        <MetricCard icon={Sparkles} label="임시 저장" value={metrics ? numberFormatter.format(metrics.drafts) : '—'} detail="아직 발행하지 않은 설문" tone="purple" />
      </section>

      <div className="dashboard-grid">
        <SurveyLibrary surveys={recentSurveys} loading={loading} hasError={Boolean(error)} />
        <aside className="dashboard-aside">
          <GettingStartedCard />
          <div className="tip-card"><div className="tip-icon"><Sparkles size={18} aria-hidden="true" /></div><div className="tip-copy"><span className="tip-label">작은 팁</span><h3>좋은 설문은 짧고 명확해요</h3><p>한 번에 하나씩 묻고, 질문의 목적을 분명하게 정하면 더 좋은 답변을 얻을 수 있어요.</p></div></div>
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
      <div className="metric-value" aria-live="polite">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function SurveyLibrary({ surveys, loading, hasError }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  // 검색어와 상태 필터가 바뀔 때 표시할 최근 설문만 메모이제이션합니다.
  const filteredSurveys = useMemo(() => surveys.filter((survey) => {
    const matchesStatus = filter === 'all' || survey.status === filter;
    const matchesQuery = !normalizedQuery || `${survey.title ?? ''} ${survey.description ?? ''}`.toLocaleLowerCase('ko').includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  }), [filter, normalizedQuery, surveys]);

  return (
    <section className="survey-library-card survey-library-compact">
      <div className="library-heading">
        <div><span className="section-kicker">MY SURVEYS</span><h2>최근 설문</h2></div>
        <Link to="/surveys" className="text-link library-all-link">모두 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="library-toolbar">
        <div className="filter-tabs" role="group" aria-label="최근 설문 상태 필터">
          <FilterButton value="all" activeValue={filter} onSelect={setFilter} label="전체" count={surveys.length} />
          <FilterButton value="published" activeValue={filter} onSelect={setFilter} label="발행됨" count={surveys.filter((survey) => survey.status === 'published').length} />
          <FilterButton value="draft" activeValue={filter} onSelect={setFilter} label="임시 저장" count={surveys.filter((survey) => survey.status === 'draft').length} />
        </div>
        <label className="survey-search"><Search size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="설문 검색" aria-label="최근 설문 제목 검색" /></label>
      </div>
      <div className="survey-list" aria-live="polite" aria-busy={loading}>
        {loading
          ? <div className="dashboard-list-message" role="status">설문 목록을 불러오고 있어요…</div>
          : hasError
            ? <div className="dashboard-list-message">설문 목록을 표시할 수 없어요. 위에서 다시 시도해 주세요.</div>
            : filteredSurveys.length
              ? filteredSurveys.map((survey) => <SurveyRow key={survey.id} survey={survey} />)
              : <div className="empty-search"><span className="empty-search-icon"><Search size={19} aria-hidden="true" /></span><strong>{surveys.length ? '검색 결과가 없어요' : '아직 설문이 없어요'}</strong><span>{surveys.length ? '다른 검색어나 상태 필터를 선택해 보세요.' : '첫 설문을 만들면 여기에 표시돼요.'}</span>{surveys.length ? <button type="button" className="text-button" onClick={() => { setQuery(''); setFilter('all'); }}>필터 초기화</button> : <Link className="text-button" to="/surveys/new">첫 설문 만들기</Link>}</div>}
      </div>
      <div className="library-footer-note"><span className="status-dot" /> 최근 수정한 설문과 실제 응답 수</div>
    </section>
  );
}

function FilterButton({ value, activeValue, onSelect, label, count }) {
  const isActive = value === activeValue;
  return <button type="button" className={`filter-tab${isActive ? ' filter-tab-active' : ''}`} aria-pressed={isActive} onClick={() => onSelect(value)}>{label}<span>{count}</span></button>;
}

function SurveyRow({ survey }) {
  const published = survey.status === 'published';
  return (
    <article className="survey-row">
      <div className="survey-main">
        <span className={`survey-file-icon survey-file-${published ? 'mint' : 'blue'}`}><FileText size={18} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="survey-copy">
          <Link to={`/surveys/${survey.id}`} className="survey-title">{survey.title || '제목 없는 설문'}</Link>
          <span className="survey-category">{survey.description?.trim() || formatUpdatedAt(survey.updated_at)}</span>
        </span>
      </div>
      <div className="survey-response-count"><strong>{numberFormatter.format(survey.responseCount)}</strong><span>응답</span></div>
      <span className={`status-badge status-${published ? 'live' : 'draft'}`}><span />{statusLabels[survey.status] ?? '상태 확인 필요'}</span>
      <Link to={`/surveys/${survey.id}`} className="survey-open-link" aria-label={`${survey.title || '제목 없는 설문'} 열기`}><ArrowRight size={16} aria-hidden="true" /></Link>
    </article>
  );
}

function GettingStartedCard() {
  return (
    <section className="getting-started-card">
      <div className="getting-started-heading"><span className="getting-started-icon"><Zap size={16} fill="currentColor" aria-hidden="true" /></span><span>MVP 주요 흐름</span></div>
      <h2>설문부터 결과까지</h2>
      <p>설문 생성과 공개 응답 흐름을 확인해 보세요.</p>
      <ol className="roadmap-list">
        <li className="roadmap-current"><span className="roadmap-marker"><Check size={13} aria-hidden="true" /></span><span><strong>설문 제작·발행</strong><small>완료</small></span></li>
        <li className="roadmap-current"><span className="roadmap-marker"><Check size={13} aria-hidden="true" /></span><span><strong>공개 응답 저장</strong><small>코드 연결 · 배포 확인 필요</small></span></li>
        <li className="roadmap-current"><span className="roadmap-marker"><BarChart3 size={13} aria-hidden="true" /></span><span><strong>결과 분석·권한 점검</strong><small>코드 연결 · 배포 확인 필요</small></span></li>
      </ol>
      <Link to="/results" className="text-link">응답 분석 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
  );
}
