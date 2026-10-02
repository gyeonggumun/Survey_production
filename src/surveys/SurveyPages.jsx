import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleHelp,
  FilePlus2,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { summarizeQuestion } from './resultAnalytics.js';
import SurveyShareLink from './SurveyShareLink.jsx';
import './surveys.css';
import './results.css';

const statusLabels = { draft: '임시 저장', published: '발행됨' };

function errorText(error, fallback) {
  const detail = error?.message ? ` (${error.message})` : '';
  return `${fallback}${detail}`;
}

function formatDate(value) {
  if (!value) return '날짜 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function DatabaseNotice({ children, tone = 'error' }) {
  return <div className={`survey-notice survey-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function SurveyListPage() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadSurveys() {
      if (!supabase || !user?.id) {
        setLoadError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, description, status, created_at, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });
      if (!active) return;
      if (error) {
        setLoadError(errorText(error, '설문 목록을 불러오지 못했어요. SQL 스키마가 적용되었는지 확인해 주세요.'));
        setSurveys([]);
      } else {
        setSurveys(data ?? []);
      }
      setLoading(false);
    }
    loadSurveys();
    return () => { active = false; };
  }, [user?.id, reloadKey]);

  const visibleSurveys = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko');
    return surveys.filter((survey) => {
      const matchesStatus = filter === 'all' || survey.status === filter;
      const matchesQuery = !normalized || `${survey.title ?? ''} ${survey.description ?? ''}`.toLocaleLowerCase('ko').includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [filter, query, surveys]);

  const deleteSurvey = async (survey) => {
    if (!window.confirm(`“${survey.title || '제목 없는 설문'}”을(를) 삭제할까요? 질문과 응답도 함께 삭제되며 되돌릴 수 없어요.`)) return;
    setDeletingId(survey.id);
    const { error } = await supabase.from('surveys').delete().eq('id', survey.id).eq('owner_id', user.id);
    setDeletingId('');
    if (error) setLoadError(errorText(error, '설문을 삭제하지 못했어요.'));
    else setReloadKey((value) => value + 1);
  };

  return (
    <section className="survey-page">
      <div className="survey-page-heading">
        <div>
          <span className="survey-eyebrow">WORKSPACE</span>
          <h1>내 설문</h1>
          <p>직접 만든 설문을 저장하고 관리해요.</p>
        </div>
        <Link className="survey-button survey-button-primary" to="/surveys/new"><Plus size={17} />새 설문 만들기</Link>
      </div>

      {loadError && <DatabaseNotice>{loadError}</DatabaseNotice>}
      <div className="survey-list-panel">
        <div className="survey-list-tools">
          <div className="survey-filter-group" role="group" aria-label="설문 상태 필터">
            {[['all', '전체'], ['draft', '임시 저장'], ['published', '발행됨']].map(([value, label]) => (
              <button key={value} className={filter === value ? 'survey-filter survey-filter-active' : 'survey-filter'} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <label className="survey-search-field">
            <span className="sr-only">설문 검색</span>
            <input type="search" placeholder="제목 또는 설명 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        {loading ? (
          <div className="survey-loading" role="status"><LoaderCircle className="survey-spinner" size={22} /> 설문을 불러오고 있어요…</div>
        ) : visibleSurveys.length ? (
          <div className="survey-list-items">
            {visibleSurveys.map((survey) => (
              <article className="survey-list-item" key={survey.id}>
                <div className="survey-list-icon"><FileText size={19} /></div>
                <div className="survey-list-copy">
                  <Link to={`/surveys/${survey.id}`} className="survey-list-title">{survey.title || '제목 없는 설문'}</Link>
                  <span className="survey-list-description">{survey.description || '설명 없음'} · 수정 {formatDate(survey.updated_at)}</span>
                </div>
                <span className={`survey-status survey-status-${survey.status}`}><span />{statusLabels[survey.status] ?? '상태 확인 필요'}</span>
                <div className="survey-list-actions">
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}`} aria-label={`${survey.title} 미리보기`} title="미리보기"><span className="sr-only">미리보기</span><FileText size={17} /></Link>
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}/edit`} aria-label={`${survey.title} 수정`} title="수정"><span className="sr-only">수정</span><ArrowRight size={17} /></Link>
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}/responses`} aria-label={`${survey.title} 응답 결과`} title="응답 결과"><span className="sr-only">응답 결과</span><BarChart3 size={16} /></Link>
                  <button className="survey-icon-action survey-delete-action" type="button" disabled={deletingId === survey.id} onClick={() => deleteSurvey(survey)} aria-label={`${survey.title} 삭제`} title="삭제"><span className="sr-only">삭제</span><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="survey-empty-state">
            <span className="survey-empty-icon"><FilePlus2 size={25} /></span>
            <h2>{surveys.length ? '검색 결과가 없어요' : '첫 설문을 만들어 보세요'}</h2>
            <p>{surveys.length ? '검색어나 상태 필터를 바꿔 다시 확인해 주세요.' : '설문 제목과 질문을 작성한 뒤 임시 저장하거나 발행할 수 있어요.'}</p>
            {surveys.length ? <button className="survey-button survey-button-secondary" type="button" onClick={() => { setQuery(''); setFilter('all'); }}>필터 초기화</button> : <Link className="survey-button survey-button-primary" to="/surveys/new"><Plus size={17} />새 설문 만들기</Link>}
          </div>
        )}
      </div>
      <p className="survey-privacy-note"><CircleHelp size={15} /> 내 계정이 소유한 설문만 표시됩니다. 계정 간 접근은 Supabase RLS 정책으로 제한돼요.</p>
    </section>
  );
}

export function SurveyPreviewPage() {
  const { surveyId } = useParams();
  const { user } = useAuth();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setError('Supabase 연결 설정을 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data, error: surveyError } = await supabase.from('surveys')
        .select('id, title, description, status, owner_id, created_at, updated_at')
        .eq('id', surveyId)
        .maybeSingle();
      if (!active) return;
      if (surveyError || !data) {
        setError(errorText(surveyError, '설문을 찾을 수 없거나 열람 권한이 없어요.'));
        setSurvey(null);
        setQuestions([]);
        setLoading(false);
        return;
      }
      const { data: rows, error: questionError } = await supabase.from('questions')
        .select('id, prompt, type, required, options, position')
        .eq('survey_id', surveyId)
        .order('position', { ascending: true });
      if (!active) return;
      if (questionError) setError(errorText(questionError, '질문을 불러오지 못했어요.'));
      else {
        setSurvey(data);
        setQuestions(rows ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [surveyId]);

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 설문을 불러오고 있어요…</div>;
  if (error || !survey) return <section className="survey-page"><DatabaseNotice>{error || '설문을 찾을 수 없어요.'}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></section>;

  return (
    <section className="survey-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to="/surveys"><ArrowLeft size={15} />내 설문</Link><h1>설문 미리보기</h1><p>응답자 화면의 내용을 확인해요.</p></div>
        <div className="survey-editor-actions">
          <span className={`survey-status survey-status-${survey.status}`}><span />{statusLabels[survey.status]}</span>
          {survey.owner_id === user?.id && <Link className="survey-button survey-button-primary" to={`/surveys/${survey.id}/edit`}>편집하기<ArrowRight size={16} /></Link>}
        </div>
      </div>
      {survey.status === 'published' && survey.owner_id === user?.id && <SurveyShareLink surveyId={survey.id} />}
      <SurveyLivePreview title={survey.title} description={survey.description} questions={questions} />
    </section>
  );
}

function SurveyLivePreview({ title, description, questions }) {
  return (
    <div className="survey-live-preview-wrap">
      <div className="survey-live-preview-heading"><FileText size={17} /><span>응답자 미리보기</span></div>
      <article className="survey-live-preview">
        <div className="survey-preview-brand"><span className="survey-preview-mark" />모아 설문</div>
        <h2>{title.trim() || '설문 제목을 입력해 주세요'}</h2>
        {description.trim() && <p className="survey-preview-description">{description}</p>}
        <div className="survey-preview-progress">질문 {questions.length}개</div>
        {questions.length ? questions.map((question, index) => (
          <section className="survey-preview-question" key={question.id}>
            <h3>{index + 1}. {question.prompt || '질문 내용을 입력해 주세요'}{question.required && <span className="survey-required-mark">필수</span>}</h3>
            {question.type === 'text' ? (
              <textarea rows={3} disabled placeholder="답변을 입력해 주세요" />
            ) : (question.options ?? []).map((option, optionIndex) => (
              <div className="survey-preview-option" key={`${question.id}-${optionIndex}`}><span className={question.type === 'single' ? 'survey-option-control survey-option-radio' : 'survey-option-control'} />{option || `선택지 ${optionIndex + 1}`}</div>
            ))}
          </section>
        )) : <p className="survey-preview-empty">질문을 추가하면 여기에 표시돼요.</p>}
        <button className="survey-button survey-button-primary survey-preview-submit" type="button" disabled>미리보기 · 제출 불가</button>
      </article>
    </div>
  );
}

export function SurveyResponsesPage() {
  const { surveyId } = useParams();
  const { user } = useAuth();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadResponses() {
      if (!supabase || !user?.id) {
        setError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data: surveyData, error: surveyError } = await supabase.from('surveys')
        .select('id, title')
        .eq('id', surveyId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (surveyError || !surveyData) {
        setError(errorText(surveyError, '설문을 찾을 수 없거나 열람 권한이 없어요.'));
        setLoading(false);
        return;
      }
      const [questionResult, responseResult] = await Promise.all([
        supabase.from('questions').select('id, prompt, type, position').eq('survey_id', surveyId).order('position', { ascending: true }),
        supabase.from('responses').select('id, submitted_at').eq('survey_id', surveyId).order('submitted_at', { ascending: false }),
      ]);
      if (!active) return;
      if (questionResult.error || responseResult.error) {
        setError('응답 결과를 불러오지 못했어요. 응답 SQL과 소유자 RLS 정책을 적용했는지 확인해 주세요.');
        setLoading(false);
        return;
      }
      const responseRows = responseResult.data ?? [];
      const responseIds = responseRows.map((response) => response.id);
      let answerRows = [];
      if (responseIds.length) {
        const { data, error: answerError } = await supabase.from('answers')
          .select('response_id, question_id, value')
          .in('response_id', responseIds);
        if (!active) return;
        if (answerError) {
          setError(errorText(answerError, '응답 내용을 불러오지 못했어요.'));
          setLoading(false);
          return;
        }
        answerRows = data ?? [];
      }
      setSurvey(surveyData);
      setQuestions(questionResult.data ?? []);
      setResponses(responseRows);
      setAnswers(answerRows);
      setLoading(false);
    }
    loadResponses();
    return () => { active = false; };
  }, [surveyId, user?.id]);

  const responseAnswers = (responseId) => answers.filter((answer) => answer.response_id === responseId);

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 응답을 불러오고 있어요…</div>;
  if (error || !survey) return <section className="survey-page"><DatabaseNotice>{error || '설문을 찾을 수 없어요.'}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></section>;

  return (
    <section className="survey-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to={`/surveys/${surveyId}`}><ArrowLeft size={15} />설문 미리보기</Link><h1>응답 결과</h1><p>{survey.title} · 총 {responses.length}건</p></div>
        <div className="survey-editor-actions"><Link className="survey-button survey-button-secondary" to={`/results/${surveyId}`}><BarChart3 size={15} />요약 분석</Link><Link className="survey-button survey-button-secondary" to={`/surveys/${surveyId}/edit`}>설문 편집<ArrowRight size={16} /></Link></div>
      </div>
      {responses.length ? (
        <div className="survey-response-list">
          {responses.map((response, index) => (
            <article className="survey-response-card" key={response.id}>
              <h2>응답 {responses.length - index}</h2>
              <time>{response.submitted_at && !Number.isNaN(new Date(response.submitted_at).getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at)) : '시간 정보 없음'}</time>
              <div className="survey-response-answers">
                {questions.map((question) => {
                  const answer = responseAnswers(response.id).find((item) => item.question_id === question.id);
                  const answerValue = Array.isArray(answer?.value) ? answer.value.join(', ') : String(answer?.value ?? '').trim();
                  return <div className="survey-response-answer" key={question.id}><strong>{question.prompt}</strong><span>{answerValue || '응답 없음'}</span></div>;
                })}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="survey-empty-state"><span className="survey-empty-icon"><FileText size={25} /></span><h2>아직 제출된 응답이 없어요</h2><p>공개 응답 링크를 공유하면 제출 결과가 여기에 표시됩니다.</p><SurveyShareLink surveyId={surveyId} /></div>}
    </section>
  );
}

export function ResultsIndexPage() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user?.id) {
        setError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase.from('surveys')
        .select('id, title, status, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });
      if (!active) return;
      if (queryError) setError(errorText(queryError, '설문 목록을 불러오지 못했어요.'));
      else setSurveys(data ?? []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user?.id]);

  return (
    <section className="survey-page">
      <div className="survey-page-heading"><div><span className="survey-eyebrow">RESPONSE INSIGHTS</span><h1>응답 분석</h1><p>발행된 설문의 응답과 질문별 결과를 확인해요.</p></div></div>
      {error && <DatabaseNotice>{error}</DatabaseNotice>}
      {loading ? <div className="survey-loading" role="status"><LoaderCircle className="survey-spinner" size={22} /> 설문을 불러오고 있어요…</div> : surveys.length ? (
        <div className="survey-list-panel survey-results-survey-list">
          {surveys.map((survey) => <Link className="survey-list-item" to={`/results/${survey.id}`} key={survey.id}><span className="survey-list-icon"><FileText size={19} /></span><span className="survey-list-copy"><strong className="survey-list-title">{survey.title || '제목 없는 설문'}</strong><span className="survey-list-description">{survey.status === 'published' ? '응답 분석 보기' : '임시 저장'} · 수정 {formatDate(survey.updated_at)}</span></span><ArrowRight size={17} /></Link>)}
        </div>
      ) : <div className="survey-empty-state"><span className="survey-empty-icon"><FileText size={25} /></span><h2>설문이 아직 없어요</h2><p>설문을 만들고 발행하면 결과를 확인할 수 있어요.</p><Link className="survey-button survey-button-primary" to="/surveys/new"><Plus size={16} />새 설문 만들기</Link></div>}
    </section>
  );
}

export function ResultsDetailPage() {
  const { surveyId } = useParams();
  const { user } = useAuth();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadResults() {
      if (!supabase || !user?.id) {
        setError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data: surveyData, error: surveyError } = await supabase.from('surveys')
        .select('id, title, status')
        .eq('id', surveyId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (surveyError || !surveyData) {
        setError(errorText(surveyError, '설문을 찾을 수 없거나 열람 권한이 없어요.'));
        setLoading(false);
        return;
      }
      const [questionResult, responseResult] = await Promise.all([
        supabase.from('questions').select('id, prompt, type, options, position').eq('survey_id', surveyId).order('position', { ascending: true }),
        supabase.from('responses').select('id, submitted_at').eq('survey_id', surveyId).order('submitted_at', { ascending: false }),
      ]);
      if (!active) return;
      if (questionResult.error || responseResult.error) {
        setError('응답 데이터를 읽지 못했어요. 응답 SQL과 소유자 RLS 정책 적용을 확인해 주세요.');
        setLoading(false);
        return;
      }
      const responseRows = responseResult.data ?? [];
      let answerRows = [];
      if (responseRows.length) {
        const { data, error: answerError } = await supabase.from('answers')
          .select('response_id, question_id, value')
          .in('response_id', responseRows.map((response) => response.id));
        if (!active) return;
        if (answerError) {
          setError(errorText(answerError, '답변을 불러오지 못했어요.'));
          setLoading(false);
          return;
        }
        answerRows = data ?? [];
      }
      setSurvey(surveyData);
      setQuestions(questionResult.data ?? []);
      setResponses(responseRows);
      setAnswers(answerRows);
      setLoading(false);
    }
    loadResults();
    return () => { active = false; };
  }, [surveyId, user?.id]);

  const questionSummaries = useMemo(
    () => questions.map((question) => summarizeQuestion(question, answers, responses)),
    [answers, questions, responses],
  );

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 결과를 불러오고 있어요…</div>;
  if (error || !survey) return <section className="survey-page"><DatabaseNotice>{error || '설문을 찾을 수 없어요.'}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/results"><ArrowLeft size={16} />분석 목록으로</Link></section>;

  return (
    <section className="survey-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to="/results"><ArrowLeft size={15} />응답 분석</Link><h1>{survey.title}</h1><p>총 응답 {responses.length}건 · 질문 {questions.length}개</p></div>
        <div className="survey-editor-actions"><Link className="survey-button survey-button-secondary" to={`/surveys/${surveyId}/responses`}>개별 응답 보기<ArrowRight size={15} /></Link><Link className="survey-button survey-button-secondary" to={`/surveys/${surveyId}/edit`}>설문 편집<ArrowRight size={15} /></Link></div>
      </div>
      {responses.length > 0 && <div className="results-summary-grid" aria-label="응답 요약"><article className="results-summary-card"><span className="results-summary-icon"><BarChart3 size={18} /></span><span>총 응답</span><strong>{responses.length}</strong></article><article className="results-summary-card"><span className="results-summary-icon results-summary-icon-blue"><FileText size={18} /></span><span>질문 수</span><strong>{questions.length}</strong></article><article className="results-summary-card"><span className="results-summary-icon results-summary-icon-orange"><FileText size={18} /></span><span>최근 응답</span><strong className="results-date-value">{responses[0]?.submitted_at && !Number.isNaN(new Date(responses[0].submitted_at).getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(responses[0].submitted_at)) : '시간 정보 없음'}</strong></article></div>}
      {responses.length > 0 ? questionSummaries.map((question, index) => (
        <article className="survey-result-card" key={question.id}>
          <header className="survey-result-heading"><span className="survey-result-number">질문 {String(index + 1).padStart(2, '0')}</span><h2>{question.prompt}</h2><span className="survey-result-response-count">응답 {question.total}건</span></header>
          {question.type === 'text' ? (
            <div className="survey-result-text-list">{question.textAnswers.length ? question.textAnswers.map((answer) => <blockquote key={answer.id}><p>{answer.value}</p><time>{answer.submittedAt && !Number.isNaN(new Date(answer.submittedAt).getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(answer.submittedAt)) : '시간 정보 없음'}</time></blockquote>) : <p className="survey-result-empty">아직 주관식 응답이 없어요.</p>}</div>
          ) : (
            <div className="survey-result-options">{question.options.map(({ label, count, percentage }) => <div className="survey-result-option" key={label}><div className="survey-result-option-label"><span>{label}</span><strong>{count}명 <small>({percentage}%)</small></strong></div><div className="survey-result-bar"><span style={{ width: `${percentage}%` }} /></div></div>)}{question.type === 'multiple' && <p className="survey-result-footnote">복수 선택 비율은 응답자 기준이며, 합계가 100%를 넘을 수 있습니다.</p>}</div>
          )}
        </article>
      )) : <div className="survey-empty-state"><span className="survey-empty-icon"><BarChart3 size={25} /></span><h2>아직 제출된 응답이 없어요</h2><p>공개 응답 링크를 공유하면 질문별 결과가 여기에 표시됩니다.</p></div>}
      {responses.length > 0 && <div className="survey-result-time-card"><h2>최근 제출</h2>{responses.slice(0, 10).map((response) => <time key={response.id}>{response.submitted_at && !Number.isNaN(new Date(response.submitted_at).getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at)) : '시간 정보 없음'}</time>)}</div>}
    </section>
  );
}

export { summarizeQuestion };
