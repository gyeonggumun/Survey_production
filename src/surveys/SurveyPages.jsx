import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
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
import './surveys.css';

const typeLabels = {
  single: '객관식 · 하나 선택',
  multiple: '객관식 · 여러 개 선택',
  text: '주관식 · 짧은 답변',
};

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
    if (!window.confirm(`“${survey.title || '제목 없는 설문'}”을(를) 삭제할까요? 질문도 함께 삭제되며 되돌릴 수 없어요.`)) return;
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
        if (options.length < 2 || options.some((option) => !option.trim())) return `${index + 1}번 질문의 선택지를 2개 이상 입력해 주세요.`;
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
        options: question.type === 'text' ? [] : (question.options ?? []),
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
          <p>질문을 작성하고 저장한 뒤, 미리보기에서 내용을 확인해요.</p>
        </div>
        <div className="survey-editor-actions">
          <button className="survey-button survey-button-secondary" type="button" onClick={() => setPreviewMode((value) => !value)} aria-pressed={previewMode}><Eye size={16} />{previewMode ? '편집으로 돌아가기' : '미리보기'}</button>
          <button className="survey-button survey-button-secondary" type="button" onClick={saveSurvey} disabled={isBusy}><Save size={16} />{saving ? '저장 중…' : '임시 저장'}</button>
          <button className="survey-button survey-button-primary" type="button" onClick={changePublication} disabled={isBusy}>{publishing ? <LoaderCircle className="survey-spinner" size={16} /> : <Check size={16} />}{status === 'published' ? '발행 취소' : '발행하기'}</button>
        </div>
      </div>

      {pageError && <DatabaseNotice>{pageError}</DatabaseNotice>}
      {feedback && <DatabaseNotice tone="success">{feedback}</DatabaseNotice>}
      {status === 'published' && <DatabaseNotice tone="info">발행 상태입니다. 공개 응답 링크와 응답 저장 기능은 다음 단계에서 연결할 예정이에요.</DatabaseNotice>}

      {previewMode ? (
        <SurveyLivePreview title={title} description={description} questions={questions} />
      ) : (
        <div className="survey-editor-layout">
          <div className="survey-editor-main">
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
            </div>
            <div className="survey-tip-card"><CircleHelp size={17} /><div><strong>발행 전 확인</strong><p>제목과 모든 질문을 작성하고, 객관식 질문에 선택지를 2개 이상 추가해 주세요.</p></div></div>
            <div className="survey-tip-card survey-next-step-card"><Copy size={17} /><div><strong>다음 단계 안내</strong><p>현재는 설문 편집과 발행 상태까지 연결했어요. 공개 응답 링크와 응답 수집은 다음 단계에서 구현합니다.</p></div></div>
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
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
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

  const copySurveyId = async () => {
    try {
      await navigator.clipboard.writeText(surveyId);
      window.alert('설문 ID를 복사했어요. 공개 링크는 응답 수집 단계에서 제공됩니다.');
    } catch {
      window.alert(`설문 ID: ${surveyId}`);
    }
  };

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 설문을 불러오고 있어요…</div>;
  if (error || !survey) return <section className="survey-page"><DatabaseNotice>{error || '설문을 찾을 수 없어요.'}</DatabaseNotice><Link className="survey-button survey-button-secondary" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></section>;

  return (
    <section className="survey-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to="/surveys"><ArrowLeft size={15} />내 설문</Link><h1>설문 미리보기</h1><p>응답자 화면의 내용을 확인해요.</p></div>
        <div className="survey-editor-actions">
          <span className={`survey-status survey-status-${survey.status}`}><span />{statusLabels[survey.status]}</span>
          <button className="survey-button survey-button-secondary" type="button" onClick={copySurveyId}><Copy size={16} />설문 ID 복사</button>
          {survey.owner_id && <Link className="survey-button survey-button-primary" to={`/surveys/${survey.id}/edit`}>편집하기<ArrowRight size={16} /></Link>}
        </div>
      </div>
      <SurveyLivePreview title={survey.title} description={survey.description} questions={questions} />
      <DatabaseNotice tone="info">이 화면은 내부 미리보기예요. 공개 응답 링크와 응답 저장 기능은 다음 단계에서 연결할 예정입니다.</DatabaseNotice>
    </section>
  );
}
