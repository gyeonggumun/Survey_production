import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CircleHelp,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import SurveyShareLink from './SurveyShareLink.jsx';
import './surveys.css';

const statusLabels = { draft: '임시 저장', published: '발행됨' };

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createQuestion() {
  return {
    id: createId(),
    prompt: '',
    type: 'single',
    required: true,
    options: ['선택지 1', '선택지 2'],
  };
}

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
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}`} aria-label={`${survey.title} 미리보기`} title="미리보기"><Eye size={17} /></Link>
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}/edit`} aria-label={`${survey.title} 수정`} title="수정"><ArrowRight size={17} /></Link>
                  <Link className="survey-icon-action" to={`/surveys/${survey.id}/responses`} aria-label={`${survey.title} 응답 결과`} title="응답 결과"><BarChart3 size={16} /></Link>
                  <button className="survey-icon-action survey-delete-action" type="button" disabled={deletingId === survey.id} onClick={() => deleteSurvey(survey)} aria-label={`${survey.title} 삭제`} title="삭제"><Trash2 size={16} /></button>
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

export function SurveyEditorPage() {
  const { surveyId: routeSurveyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const surveyIdRef = useRef(routeSurveyId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([createQuestion()]);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(Boolean(routeSurveyId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [pageError, setPageError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    surveyIdRef.current = routeSurveyId ?? null;
    if (!routeSurveyId) {
      setTitle('');
      setDescription('');
      setQuestions([createQuestion()]);
      setStatus('draft');
      setPageError('');
      setLoading(false);
      return undefined;
    }
    let active = true;
    async function loadSurvey() {
      if (!supabase || !user?.id) {
        setPageError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setPageError('');
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, description, status')
        .eq('id', routeSurveyId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (surveyError || !survey) {
        setPageError(errorText(surveyError, '설문을 찾을 수 없거나 열람 권한이 없어요.'));
        setLoading(false);
        return;
      }
      const { data: questionRows, error: questionError } = await supabase
        .from('questions')
        .select('id, prompt, type, required, options, position')
        .eq('survey_id', routeSurveyId)
        .order('position', { ascending: true });
      if (!active) return;
      if (questionError) {
        setPageError(errorText(questionError, '설문 질문을 불러오지 못했어요.'));
      } else {
        setTitle(survey.title ?? '');
        setDescription(survey.description ?? '');
        setStatus(survey.status ?? 'draft');
        setQuestions((questionRows ?? []).map((question) => ({
          ...question,
          options: Array.isArray(question.options) ? question.options : [],
        })));
      }
      setLoading(false);
    }
    loadSurvey();
    return () => { active = false; };
  }, [routeSurveyId, user?.id]);

  const updateQuestion = (id, changes) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...changes } : question));
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions((current) => current.map((question) => {
      if (question.id !== questionId) return question;
      const options = [...(question.options ?? [])];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  };

  const moveQuestion = (index, direction) => {
    setQuestions((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validateForPublish = () => {
    if (!title.trim()) return '발행하려면 설문 제목을 입력해 주세요.';
    if (!questions.length) return '발행하려면 질문을 하나 이상 추가해 주세요.';
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      if (!question.prompt.trim()) return `${index + 1}번 질문 내용을 입력해 주세요.`;
      if (question.type !== 'text') {
        const options = question.options ?? [];
        if (options.length < 2 || options.some((option) => !option.trim()) || new Set(options.map((option) => option.trim())).size !== options.length) {
          return `${index + 1}번 질문에 서로 다른 선택지를 2개 이상 입력해 주세요.`;
        }
      }
    }
    return '';
  };

  const saveSurvey = useCallback(async () => {
    if (!supabase || !user?.id) {
      setPageError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
      return null;
    }
    setSaving(true);
    setPageError('');
    setFeedback('');
    try {
      let id = surveyIdRef.current;
      if (id) {
        const { data, error } = await supabase.from('surveys')
          .update({ title: title.trim() || '제목 없는 설문', description: description.trim() })
          .eq('id', id)
          .eq('owner_id', user.id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('설문이 삭제되었거나 수정 권한이 없습니다.');
      } else {
        const { data, error } = await supabase.from('surveys')
          .insert({ owner_id: user.id, title: title.trim() || '제목 없는 설문', description: description.trim(), status: 'draft' })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
        surveyIdRef.current = id;
      }

      const rows = questions.map((question, index) => ({
        id: question.id,
        survey_id: id,
        prompt: question.prompt.trim(),
        type: question.type,
        required: Boolean(question.required),
        options: question.type === 'text' ? [] : (question.options ?? []).map((option) => option.trim()),
        position: index,
      }));

      if (rows.length) {
        const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      let deletion = supabase.from('questions').delete().eq('survey_id', id);
      if (rows.length) deletion = deletion.not('id', 'in', `(${rows.map((row) => row.id).join(',')})`);
      const { error: deletionError } = await deletion;
      if (deletionError) throw deletionError;

      if (!routeSurveyId) navigate(`/surveys/${id}/edit`, { replace: true });
      setFeedback('설문을 저장했어요.');
      return id;
    } catch (error) {
      setPageError(errorText(error, '저장하지 못했어요. SQL 스키마와 RLS 정책을 확인해 주세요.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [description, navigate, questions, routeSurveyId, title, user?.id]);

  const changePublication = async () => {
    if (status !== 'published') {
      const validationMessage = validateForPublish();
      if (validationMessage) {
        setPageError(validationMessage);
        return;
      }
    }
    const id = await saveSurvey();
    if (!id) return;
    setPublishing(true);
    setPageError('');
    const nextStatus = status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('surveys')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('owner_id', user.id);
    setPublishing(false);
    if (error) {
      setPageError(errorText(error, '발행 상태를 변경하지 못했어요.'));
      return;
    }
    setStatus(nextStatus);
    setFeedback(nextStatus === 'published' ? '설문을 발행했어요.' : '설문을 임시 저장 상태로 변경했어요.');
  };

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 설문을 불러오고 있어요…</div>;

  if (pageError && routeSurveyId && !title && !questions.length) {
    return <div className="survey-page"><DatabaseNotice>{pageError}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></div>;
  }

  const isBusy = saving || publishing;
  return (
    <section className="survey-page survey-editor-page">
      <div className="survey-editor-heading">
        <div>
          <Link className="survey-back-link" to="/surveys"><ArrowLeft size={15} />내 설문</Link>
          <h1>{routeSurveyId ? '설문 편집' : '새 설문 만들기'}</h1>
          <p>질문을 작성하고 저장한 뒤, 응답 미리보기에서 내용을 확인해요.</p>
        </div>
        <div className="survey-editor-actions">
          <button className="survey-button survey-button-secondary" type="button" onClick={() => setPreviewMode((value) => !value)} aria-pressed={previewMode}><Eye size={16} />{previewMode ? '편집으로 돌아가기' : '미리보기'}</button>
          <button className="survey-button survey-button-secondary" type="button" onClick={saveSurvey} disabled={isBusy}><Save size={16} />{saving ? '저장 중…' : '임시 저장'}</button>
          <button className="survey-button survey-button-primary" type="button" onClick={changePublication} disabled={isBusy}>{publishing ? <LoaderCircle className="survey-spinner" size={16} /> : <Check size={16} />}{status === 'published' ? '발행 취소' : '발행하기'}</button>
        </div>
      </div>

      {pageError && <DatabaseNotice>{pageError}</DatabaseNotice>}
      {feedback && <DatabaseNotice tone="success">{feedback}</DatabaseNotice>}
      {status === 'published' && <DatabaseNotice tone="info">응답을 받을 수 있는 공개 설문이에요. 아래 링크를 공유하세요.</DatabaseNotice>}

      {previewMode ? (
        <SurveyLivePreview title={title} description={description} questions={questions} />
      ) : (
        <div className="survey-editor-layout">
          <div className="survey-editor-main">
            {status === 'published' && routeSurveyId && <SurveyShareLink surveyId={routeSurveyId} />}
            <div className="survey-editor-card survey-details-card">
              <div className="survey-card-heading"><span className="survey-step-number">01</span><div><h2>설문 기본 정보</h2><p>응답자가 보게 될 제목과 안내를 입력해요.</p></div></div>
              <label className="survey-field-label" htmlFor="survey-title">설문 제목</label>
              <input id="survey-title" className="survey-text-input survey-title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="예: 서비스 이용 경험을 들려주세요" />
              <div className="survey-input-meta">{title.length}/120자</div>
              <label className="survey-field-label" htmlFor="survey-description">설문 설명 <span>선택</span></label>
              <textarea id="survey-description" className="survey-text-input survey-description-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="설문의 목적이나 응답에 필요한 안내를 적어주세요." rows={3} />
            </div>

            <div className="survey-questions-heading">
              <div><span className="survey-step-number">02</span><div><h2>질문</h2><p>질문 종류와 필수 응답 여부를 설정해요.</p></div></div>
              <button className="survey-button survey-button-secondary survey-add-question" type="button" onClick={() => setQuestions((current) => [...current, createQuestion()])}><Plus size={16} />질문 추가</button>
            </div>

            {questions.length === 0 && <div className="survey-no-questions">질문을 추가하면 설문이 완성돼요.</div>}
            <div className="survey-question-stack">
              {questions.map((question, index) => (
                <article className="survey-editor-card survey-question-card" key={question.id}>
                  <div className="survey-question-topline">
                    <span className="survey-question-number">질문 {String(index + 1).padStart(2, '0')}</span>
                    <div className="survey-question-tools">
                      <button className="survey-icon-action" type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} aria-label={`${index + 1}번 질문 위로 이동`} title="위로 이동"><ArrowDown className="survey-arrow-up" size={16} /></button>
                      <button className="survey-icon-action" type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} aria-label={`${index + 1}번 질문 아래로 이동`} title="아래로 이동"><ArrowDown size={16} /></button>
                      <button className="survey-icon-action survey-delete-action" type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} aria-label={`${index + 1}번 질문 삭제`} title="질문 삭제"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <label className="survey-field-label" htmlFor={`question-${question.id}`}>질문 내용</label>
                  <input id={`question-${question.id}`} className="survey-text-input" value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} maxLength={300} placeholder="무엇을 알고 싶으신가요?" />
                  <div className="survey-question-settings">
                    <label className="survey-select-label">응답 유형
                      <select className="survey-select" value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value })}>
                        <option value="single">객관식 · 하나 선택</option>
                        <option value="multiple">객관식 · 여러 개 선택</option>
                        <option value="text">주관식 · 짧은 답변</option>
                      </select>
                    </label>
                    <label className="survey-required-toggle"><input type="checkbox" checked={Boolean(question.required)} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} /><span className="survey-toggle-track" /><span>필수 응답</span></label>
                  </div>
                  {question.type !== 'text' && (
                    <div className="survey-options-editor">
                      <span className="survey-field-label">선택지</span>
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div className="survey-option-row" key={`${question.id}-option-${optionIndex}`}>
                          <span className={question.type === 'single' ? 'survey-option-control survey-option-radio' : 'survey-option-control'} aria-hidden="true" />
                          <input className="survey-text-input" aria-label={`${index + 1}번 질문 선택지 ${optionIndex + 1}`} value={option} maxLength={120} onChange={(event) => updateOption(question.id, optionIndex, event.target.value)} placeholder={`선택지 ${optionIndex + 1}`} />
                          <button className="survey-icon-action survey-delete-action" type="button" onClick={() => updateQuestion(question.id, { options: question.options.filter((_, i) => i !== optionIndex) })} aria-label={`선택지 ${optionIndex + 1} 삭제`}><X size={15} /></button>
                        </div>
                      ))}
                      <button className="survey-add-option" type="button" onClick={() => updateQuestion(question.id, { options: [...(question.options ?? []), ''] })}><Plus size={14} />선택지 추가</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <button className="survey-add-question-bottom" type="button" onClick={() => setQuestions((current) => [...current, createQuestion()])}><Plus size={17} />질문 추가하기</button>
          </div>

          <aside className="survey-editor-aside">
            <div className="survey-editor-card survey-publish-card">
              <span className="survey-aside-kicker">저장 상태</span>
              <span className={`survey-status survey-status-${status}`}><span />{statusLabels[status]}</span>
              <p>{status === 'published' ? '발행된 설문이에요. 수정한 내용은 저장 후 반영됩니다.' : '임시 저장한 설문은 나만 볼 수 있어요.'}</p>
              <button className="survey-button survey-button-primary survey-full-button" type="button" onClick={saveSurvey} disabled={isBusy}><Save size={16} />{saving ? '저장 중…' : '변경 내용 저장'}</button>
              <Link className="survey-back-link survey-aside-back" to="/surveys"><ArrowLeft size={14} />목록으로 돌아가기</Link>
              {status === 'published' && routeSurveyId && <Link className="survey-back-link survey-aside-back" to={`/surveys/${routeSurveyId}/responses`}><BarChart3 size={14} />응답 결과 보기</Link>}
            </div>
            <div className="survey-tip-card"><CircleHelp size={17} /><div><strong>발행 전 확인</strong><p>제목과 모든 질문을 작성하고, 객관식 질문에 서로 다른 선택지를 2개 이상 추가해 주세요.</p></div></div>
            <div className="survey-tip-card survey-next-step-card"><Copy size={17} /><div><strong>공개 응답 링크</strong><p>발행된 설문은 비로그인 공개 페이지에서 응답을 받고 결과 화면에 저장합니다.</p></div></div>
          </aside>
        </div>
      )}
    </section>
  );
}

function SurveyLivePreview({ title, description, questions }) {
  return (
    <div className="survey-live-preview-wrap">
      <div className="survey-live-preview-heading"><Eye size={17} /><span>응답자 미리보기</span></div>
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
              <time>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at))}</time>
              <div className="survey-response-answers">
                {questions.map((question) => {
                  const answer = responseAnswers(response.id).find((item) => item.question_id === question.id);
                  return <div className="survey-response-answer" key={question.id}><strong>{question.prompt}</strong><span>{answer ? Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value ?? '') : '응답 없음'}</span></div>;
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
        setError('응답 데이터를 읽지 못했어요. `20261001020600` 응답 migration 적용을 확인해 주세요.');
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

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 결과를 불러오고 있어요…</div>;
  if (error || !survey) return <section className="survey-page"><DatabaseNotice>{error || '설문을 찾을 수 없어요.'}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/results"><ArrowLeft size={16} />분석 목록으로</Link></section>;

  return (
    <section className="survey-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to="/results"><ArrowLeft size={15} />응답 분석</Link><h1>{survey.title}</h1><p>총 응답 {responses.length}건 · 질문 {questions.length}개</p></div>
        <div className="survey-editor-actions"><Link className="survey-button survey-button-secondary" to={`/surveys/${surveyId}/responses`}>개별 응답 보기<ArrowRight size={15} /></Link><Link className="survey-button survey-button-secondary" to={`/surveys/${surveyId}/edit`}>설문 편집<ArrowRight size={15} /></Link></div>
      </div>
      {questions.map((question, index) => {
        const questionAnswers = answers.filter((answer) => answer.question_id === question.id);
        const isChoice = question.type === 'single' || question.type === 'multiple';
        const counts = new Map((question.options ?? []).map((option) => [option, 0]));
        if (isChoice) {
          questionAnswers.forEach((answer) => {
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            values.forEach((value) => {
              if (typeof value === 'string' && counts.has(value)) counts.set(value, counts.get(value) + 1);
            });
          });
        }
        const totalSelections = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
        return (
          <article className="survey-result-card" key={question.id}>
            <header className="survey-result-heading"><span className="survey-result-number">질문 {String(index + 1).padStart(2, '0')}</span><h2>{question.prompt}</h2><span className="survey-result-response-count">유효 응답 {questionAnswers.length}건</span></header>
            {isChoice ? (
              <div className="survey-result-options">
                {(question.options ?? []).map((option) => {
                  const count = counts.get(option) ?? 0;
                  const percent = totalSelections ? Math.round((count / totalSelections) * 100) : 0;
                  return <div className="survey-result-option" key={option}><div className="survey-result-option-label"><span>{option}</span><strong>{count} <small>({percent}%)</small></strong></div><div className="survey-result-bar"><span style={{ width: `${percent}%` }} /></div></div>;
                })}
                <p className="survey-result-footnote">복수 선택 질문은 선택 횟수 합계를 기준으로 비율을 계산합니다.</p>
              </div>
            ) : (
              <div className="survey-result-text-list">
                {questionAnswers.length ? questionAnswers.map((answer) => <blockquote key={answer.response_id}>{String(answer.value ?? '')}</blockquote>) : <p className="survey-result-empty">아직 이 질문의 주관식 응답이 없어요.</p>}
              </div>
            )}
          </article>
        );
      })}
      {responses.length > 0 && <div className="survey-result-time-card"><h2>최근 제출</h2>{responses.slice(0, 10).map((response) => <time key={response.id}>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.submitted_at))}</time>)}</div>}
    </section>
  );
}
