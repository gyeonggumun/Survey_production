import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, CircleHelp, Eye, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { getSurveyPublishError } from './surveyValidation.js';
import SurveyShareLink from './SurveyShareLink.jsx';
import './surveys.css';

const statusLabels = { draft: '임시 저장', published: '발행됨' };

// 새 질문과 선택지마다 DB에서 사용할 고유 ID를 만듭니다.
const createId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const random = Math.floor(Math.random() * 16);
  return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
});
const createQuestion = () => ({ id: createId(), prompt: '', type: 'single', required: true, options: ['선택지 1', '선택지 2'] });

function Notice({ children, tone = 'error' }) {
  return <div className={`survey-notice survey-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export default function SurveyEditorPage() {
  const { surveyId: routeSurveyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  // 새 설문 저장 직후에도 생성된 ID를 참조해 같은 화면에서 이어서 저장합니다.
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
      setTitle(''); setDescription(''); setQuestions([createQuestion()]); setStatus('draft');
      setPageError(''); setFeedback(''); setLoading(false);
      return undefined;
    }
    // 화면 이동 후 이전 조회 결과가 상태를 덮어쓰지 않도록 활성 여부를 확인합니다.
    let active = true;
    async function loadSurvey() {
      if (!supabase || !user?.id) {
        setPageError('Supabase 연결 또는 로그인 정보를 확인해 주세요.'); setLoading(false); return;
      }
      setLoading(true); setPageError('');
      // 소유자 조건을 조회에 포함해 본인 설문만 편집기에 불러옵니다.
      const { data: survey, error: surveyError } = await supabase.from('surveys')
        .select('id, title, description, status').eq('id', routeSurveyId).eq('owner_id', user.id).maybeSingle();
      if (!active) return;
      if (surveyError || !survey) {
        setPageError(surveyError?.message || '설문을 찾을 수 없거나 열람 권한이 없어요.'); setLoading(false); return;
      }
      // 질문은 저장된 순서대로 불러와 편집 화면에 표시합니다.
      const { data: rows, error: questionError } = await supabase.from('questions')
        .select('id, prompt, type, required, options, position').eq('survey_id', routeSurveyId).order('position', { ascending: true });
      if (!active) return;
      if (questionError) setPageError(questionError.message || '질문을 불러오지 못했어요.');
      else {
        setTitle(survey.title ?? ''); setDescription(survey.description ?? ''); setStatus(survey.status ?? 'draft');
        setQuestions((rows ?? []).map((question) => ({ ...question, options: Array.isArray(question.options) ? question.options : [] })));
      }
      setLoading(false);
    }
    loadSurvey();
    return () => { active = false; };
  }, [routeSurveyId, user?.id]);

  const saveSurvey = useCallback(async () => {
    if (!supabase || !user?.id) { setPageError('Supabase 연결 또는 로그인 정보를 확인해 주세요.'); return null; }
    setSaving(true); setPageError(''); setFeedback('');
    try {
      let id = surveyIdRef.current;
      if (id) {
        // 기존 설문을 소유자 조건과 함께 갱신하고, 대상이 사라졌는지도 확인합니다.
        const { data, error } = await supabase.from('surveys')
          .update({ title: title.trim() || '제목 없는 설문', description: description.trim() })
          .eq('id', id).eq('owner_id', user.id).select('id').maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('설문이 삭제되었거나 수정 권한이 없습니다.');
      } else {
        // 새 설문을 먼저 만들고 이후 질문 저장에 사용할 ID를 확보합니다.
        const { data, error } = await supabase.from('surveys')
          .insert({ owner_id: user.id, title: title.trim() || '제목 없는 설문', description: description.trim(), status: 'draft' })
          .select('id').single();
        if (error) throw error;
        id = data.id; surveyIdRef.current = id;
      }

      // 화면 상태를 DB RPC가 받는 질문 형식으로 정규화합니다.
      const payload = questions.map((question) => ({
        id: question.id,
        prompt: question.prompt.trim(),
        type: question.type,
        required: Boolean(question.required),
        options: question.type === 'text' ? [] : (question.options ?? []).map((option) => option.trim()),
      }));
      // RPC가 질문 저장과 위치 변경을 한 번에 처리해 순서 중복과 응답 이력 훼손을 방지합니다.
      const { error: questionSaveError } = await supabase.rpc('save_survey_questions', {
        p_survey_id: id,
        p_questions: payload,
      });
      if (questionSaveError) throw questionSaveError;

      if (!routeSurveyId) navigate(`/surveys/${id}/edit`, { replace: true });
      setFeedback('설문과 질문을 저장했어요.');
      return id;
    } catch (error) {
      setPageError(error?.message || '저장하지 못했어요. 질문 저장용 Supabase migration 적용 여부를 확인해 주세요.');
      return null;
    } finally { setSaving(false); }
  }, [description, navigate, questions, routeSurveyId, title, user?.id]);

  const changePublication = async () => {
    if (status !== 'published') {
      // 발행 전에 먼저 사용자 친화적인 검증 메시지를 안내합니다.
      const validation = getSurveyPublishError(title, questions);
      if (validation) { setPageError(validation); return; }
    }
    const id = await saveSurvey();
    if (!id) return;
    setPublishing(true); setPageError('');
    const nextStatus = status === 'published' ? 'draft' : 'published';
    // 발행 최종 검증과 권한 확인은 DB의 정책 및 트리거에서도 수행됩니다.
    const { error } = await supabase.from('surveys').update({ status: nextStatus }).eq('id', id).eq('owner_id', user.id);
    setPublishing(false);
    if (error) setPageError(error.message || '발행 상태를 변경하지 못했어요.');
    else { setStatus(nextStatus); setFeedback(nextStatus === 'published' ? '설문을 발행했어요.' : '설문을 임시 저장 상태로 변경했어요.'); }
  };

  // ID에 해당하는 질문만 변경해 나머지 질문 상태를 유지합니다.
  const updateQuestion = (id, changes) => setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...changes } : question));
  const isBusy = saving || publishing;

  if (loading) return <div className="survey-loading survey-editor-loading" role="status"><LoaderCircle className="survey-spinner" size={23} /> 설문을 불러오고 있어요…</div>;
  if (pageError && routeSurveyId && !title && !questions.length) return <div className="survey-page"><Notice>{pageError}</Notice><Link className="survey-button survey-button-secondary" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></div>;

  return (
    <section className="survey-page survey-editor-page">
      <div className="survey-editor-heading">
        <div><Link className="survey-back-link" to="/surveys"><ArrowLeft size={15} />내 설문</Link><h1>{routeSurveyId ? '설문 편집' : '새 설문 만들기'}</h1><p>질문을 작성하고 저장한 뒤, 응답자 미리보기에서 내용을 확인해요.</p></div>
        <div className="survey-editor-actions">
          <button className="survey-button survey-button-secondary" type="button" onClick={() => setPreviewMode((value) => !value)} aria-pressed={previewMode}><Eye size={16} />{previewMode ? '편집으로 돌아가기' : '미리보기'}</button>
          <button className="survey-button survey-button-secondary" type="button" onClick={saveSurvey} disabled={isBusy}><Save size={16} />{saving ? '저장 중…' : '임시 저장'}</button>
          <button className="survey-button survey-button-primary" type="button" onClick={changePublication} disabled={isBusy}>{publishing ? <LoaderCircle className="survey-spinner" size={16} /> : <Check size={16} />}{status === 'published' ? '발행 취소' : '발행하기'}</button>
        </div>
      </div>
      {pageError && <Notice>{pageError}</Notice>}{feedback && <Notice tone="success">{feedback}</Notice>}
      {status === 'published' && <Notice tone="info">응답을 받을 수 있는 공개 설문이에요. 아래 링크를 공유하세요.</Notice>}
      {previewMode ? <div className="survey-live-preview-wrap"><div className="survey-live-preview-heading"><Eye size={17} /><span>응답자 미리보기</span></div><article className="survey-live-preview"><div className="survey-preview-brand"><span className="survey-preview-mark" />모아 설문</div><h2>{title || '설문 제목을 입력해 주세요'}</h2>{description && <p className="survey-preview-description">{description}</p>}{questions.map((question, index) => <section className="survey-preview-question" key={question.id}><h3>{index + 1}. {question.prompt || '질문 내용을 입력해 주세요'}{question.required && <span className="survey-required-mark">필수</span>}</h3>{question.type === 'text' ? <textarea disabled rows={3} placeholder="답변을 입력해 주세요" /> : (question.options ?? []).map((option, optionIndex) => <div className="survey-preview-option" key={`${question.id}-${optionIndex}`}><span className={question.type === 'single' ? 'survey-option-control survey-option-radio' : 'survey-option-control'} />{option}</div>)}</section>)}<button className="survey-button survey-button-primary survey-preview-submit" type="button" disabled>미리보기 · 제출 불가</button></article></div> : (
        <div className="survey-editor-layout">
          <div className="survey-editor-main">
            {status === 'published' && routeSurveyId && <SurveyShareLink surveyId={routeSurveyId} />}
            <div className="survey-editor-card survey-details-card"><div className="survey-card-heading"><span className="survey-step-number">01</span><div><h2>설문 기본 정보</h2><p>응답자가 보게 될 제목과 안내를 입력해요.</p></div></div>
              <label className="survey-field-label" htmlFor="survey-title">설문 제목</label><input id="survey-title" className="survey-text-input survey-title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="예: 서비스 이용 경험을 들려주세요" /><div className="survey-input-meta">{title.length}/120자</div>
              <label className="survey-field-label" htmlFor="survey-description">설문 설명 <span>선택</span></label><textarea id="survey-description" className="survey-text-input survey-description-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="설문의 목적이나 응답에 필요한 안내를 적어주세요." rows={3} />
            </div>
            <div className="survey-questions-heading"><div><span className="survey-step-number">02</span><div><h2>질문</h2><p>질문 종류와 필수 응답 여부를 설정해요.</p></div></div><button className="survey-button survey-button-secondary survey-add-question" type="button" onClick={() => setQuestions((current) => [...current, createQuestion()])}><Plus size={16} />질문 추가</button></div>
            {!questions.length && <div className="survey-no-questions">질문을 추가하면 설문이 완성돼요.</div>}
            <div className="survey-question-stack">{questions.map((question, index) => <article className="survey-editor-card survey-question-card" key={question.id}>
              <div className="survey-question-topline"><span className="survey-question-number">질문 {String(index + 1).padStart(2, '0')}</span><div className="survey-question-tools">
                <button className="survey-icon-action" type="button" disabled={index === 0} onClick={() => setQuestions((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`${index + 1}번 질문 위로 이동`}><ArrowDown className="survey-arrow-up" size={16} /></button>
                <button className="survey-icon-action" type="button" disabled={index === questions.length - 1} onClick={() => setQuestions((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} aria-label={`${index + 1}번 질문 아래로 이동`}><ArrowDown size={16} /></button>
                <button className="survey-icon-action survey-delete-action" type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} aria-label={`${index + 1}번 질문 삭제`}><Trash2 size={16} /></button>
              </div></div>
              <label className="survey-field-label" htmlFor={`question-${question.id}`}>질문 내용</label><input id={`question-${question.id}`} className="survey-text-input" value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} maxLength={300} placeholder="무엇을 알고 싶으신가요?" />
              <div className="survey-question-settings"><label className="survey-select-label">응답 유형<select className="survey-select" value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value })}><option value="single">객관식 · 하나 선택</option><option value="multiple">객관식 · 여러 개 선택</option><option value="text">주관식 · 짧은 답변</option></select></label><label className="survey-required-toggle"><input type="checkbox" checked={Boolean(question.required)} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} /><span className="survey-toggle-track" /><span>필수 응답</span></label></div>
              {question.type !== 'text' && <div className="survey-options-editor"><span className="survey-field-label">선택지</span>{(question.options ?? []).map((option, optionIndex) => <div className="survey-option-row" key={`${question.id}-option-${optionIndex}`}><span className={question.type === 'single' ? 'survey-option-control survey-option-radio' : 'survey-option-control'} aria-hidden="true" /><input className="survey-text-input" aria-label={`${index + 1}번 질문 선택지 ${optionIndex + 1}`} value={option} maxLength={120} onChange={(event) => updateQuestion(question.id, { options: question.options.map((item, i) => i === optionIndex ? event.target.value : item) })} placeholder={`선택지 ${optionIndex + 1}`} /><button className="survey-icon-action survey-delete-action" type="button" onClick={() => updateQuestion(question.id, { options: question.options.filter((_, i) => i !== optionIndex) })} aria-label={`선택지 ${optionIndex + 1} 삭제`}><X size={15} /></button></div>)}<button className="survey-add-option" type="button" onClick={() => updateQuestion(question.id, { options: [...(question.options ?? []), ''] })}><Plus size={14} />선택지 추가</button></div>}
            </article>)}</div>
            <button className="survey-add-question-bottom" type="button" onClick={() => setQuestions((current) => [...current, createQuestion()])}><Plus size={17} />질문 추가하기</button>
          </div>
          <aside className="survey-editor-aside"><div className="survey-editor-card survey-publish-card"><span className="survey-aside-kicker">저장 상태</span><span className={`survey-status survey-status-${status}`}><span />{statusLabels[status]}</span><p>{status === 'published' ? '발행된 설문이에요. 질문 저장 시 응답 이력을 보호합니다.' : '임시 저장한 설문은 나만 볼 수 있어요.'}</p><button className="survey-button survey-button-primary survey-full-button" type="button" onClick={saveSurvey} disabled={isBusy}><Save size={16} />{saving ? '저장 중…' : '변경 내용 저장'}</button><Link className="survey-back-link survey-aside-back" to="/surveys"><ArrowLeft size={14} />목록으로 돌아가기</Link>{status === 'published' && routeSurveyId && <Link className="survey-back-link survey-aside-back" to={`/surveys/${routeSurveyId}/responses`}><ArrowRight size={14} />응답 결과 보기</Link>}</div>
            <div className="survey-tip-card"><CircleHelp size={17} /><div><strong>응답이 있는 설문</strong><p>응답이 제출된 뒤에는 질문 내용과 선택지를 바꿀 수 없어요. 새 질문지로 운영하려면 새 설문을 만들어 주세요.</p></div></div>
          </aside>
        </div>
      )}
    </section>
  );
}
