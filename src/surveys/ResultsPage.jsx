import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, ClipboardList, FileText, LoaderCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import './results.css';

function formatDate(value) {
  if (!value) return '시간 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '시간 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function answerText(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '응답 없음';
  return String(value);
}

export default function ResultsPage() {
  const { surveyId: routeSurveyId } = useParams();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(routeSurveyId ?? '');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (routeSurveyId) setSelectedSurveyId(routeSurveyId);
  }, [routeSurveyId]);

  useEffect(() => {
    let active = true;
    async function loadSurveys() {
      if (!supabase || !user?.id) {
        setError('Supabase 연결 또는 로그인 정보를 확인해 주세요.');
        setLoadingSurveys(false);
        return;
      }
      const { data, error: queryError } = await supabase.from('surveys')
        .select('id, title, status')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });
      if (!active) return;
      if (queryError) setError('설문 목록을 불러오지 못했어요. Supabase 데이터베이스 설정을 확인해 주세요.');
      else {
        const published = (data ?? []).filter((survey) => survey.status === 'published');
        setSurveys(published);
        setSelectedSurveyId((current) => current && published.some((survey) => survey.id === current) ? current : published[0]?.id ?? '');
      }
      setLoadingSurveys(false);
    }
    loadSurveys();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSurveyId || !supabase) {
      setQuestions([]);
      setResponses([]);
      setAnswers([]);
      return undefined;
    }
    let active = true;
    async function loadResults() {
      setLoadingResults(true);
      setError('');
      const [questionResult, responseResult] = await Promise.all([
        supabase.from('questions').select('id, prompt, type, options, position').eq('survey_id', selectedSurveyId).order('position', { ascending: true }),
        supabase.from('responses').select('id, survey_id, submitted_at').eq('survey_id', selectedSurveyId).order('submitted_at', { ascending: false }),
      ]);
      if (!active) return;
      if (questionResult.error || responseResult.error) {
        setError('결과를 불러오지 못했어요. 응답 SQL과 소유자 RLS 정책이 적용되었는지 확인해 주세요.');
        setQuestions([]);
        setResponses([]);
        setAnswers([]);
        setLoadingResults(false);
        return;
      }
      const nextQuestions = questionResult.data ?? [];
      const nextResponses = responseResult.data ?? [];
      setQuestions(nextQuestions);
      setResponses(nextResponses);
      if (!nextResponses.length) {
        setAnswers([]);
        setLoadingResults(false);
        return;
      }
      const { data: answerRows, error: answerError } = await supabase.from('answers')
        .select('response_id, question_id, value')
        .in('response_id', nextResponses.map((response) => response.id));
      if (!active) return;
      if (answerError) {
        setError('응답 내용 조회에 실패했어요. answers 테이블의 RLS 정책을 확인해 주세요.');
        setAnswers([]);
      } else setAnswers(answerRows ?? []);
      setLoadingResults(false);
    }
    loadResults();
    return () => { active = false; };
  }, [selectedSurveyId]);

  const resultsByQuestion = useMemo(() => questions.map((question) => {
    const questionAnswers = answers.filter((answer) => answer.question_id === question.id);
    if (question.type === 'text') {
      return { ...question, total: questionAnswers.length, textAnswers: questionAnswers.map((answer) => ({
        id: answer.response_id,
        value: answerText(answer.value),
        submittedAt: responses.find((item) => item.id === answer.response_id)?.submitted_at,
      })) };
    }
    const counts = new Map((question.options ?? []).map((option) => [option, 0]));
    questionAnswers.forEach((answer) => {
      const values = Array.isArray(answer.value) ? answer.value : [answer.value];
      values.forEach((value) => counts.set(String(value), (counts.get(String(value)) ?? 0) + 1));
    });
    return { ...question, total: questionAnswers.length, options: [...counts.entries()].map(([label, count]) => ({ label, count })) };
  }), [answers, questions, responses]);

  const currentSurvey = surveys.find((survey) => survey.id === selectedSurveyId);

  return (
    <main className="results-page-shell">
      <header className="results-topbar"><Link to="/results" className="results-back-link"><ArrowLeft size={17} />응답 분석 목록</Link><span className="results-brand"><span className="survey-preview-mark" />모아 설문</span></header>
      <div className="results-content">
        <div className="results-heading"><div><span className="survey-eyebrow">RESPONSE INSIGHTS</span><h1>응답 분석</h1><p>발행한 설문의 응답 수와 질문별 결과를 확인해요.</p></div>{surveys.length > 0 && <label className="results-survey-picker"><span>설문 선택</span><select value={selectedSurveyId} onChange={(event) => setSelectedSurveyId(event.target.value)}>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title || '제목 없는 설문'}</option>)}</select></label>}</div>
        {error && <div className="survey-notice" role="alert">{error}</div>}
        {loadingSurveys || loadingResults ? <div className="survey-loading results-loading" role="status"><LoaderCircle className="survey-spinner" size={22} /> 결과를 불러오고 있어요…</div>
          : !surveys.length ? <section className="results-empty"><span className="survey-empty-icon"><BarChart3 size={25} /></span><h2>발행된 설문이 아직 없어요</h2><p>설문을 발행하면 이곳에서 응답과 결과를 확인할 수 있어요.</p><Link className="survey-button survey-button-primary" to="/surveys">내 설문으로 이동</Link></section>
            : currentSurvey ? <>
              <section className="results-summary-grid" aria-label="응답 요약"><article className="results-summary-card"><span className="results-summary-icon"><ClipboardList size={18} /></span><span>총 응답</span><strong>{responses.length}</strong></article><article className="results-summary-card"><span className="results-summary-icon results-summary-icon-blue"><FileText size={18} /></span><span>질문 수</span><strong>{questions.length}</strong></article><article className="results-summary-card"><span className="results-summary-icon results-summary-icon-orange"><BarChart3 size={18} /></span><span>최근 응답</span><strong className="results-date-value">{responses[0] ? formatDate(responses[0].submitted_at) : '아직 없음'}</strong></article></section>
              {responses.length === 0 ? <section className="results-empty results-empty-compact"><h2>아직 응답이 없어요</h2><p>응답 링크를 공유하면 제출된 결과가 여기에 표시됩니다.</p></section> : <div className="results-question-list">{resultsByQuestion.map((question, index) => <article className="results-question-card" key={question.id}><div className="results-question-heading"><span className="results-question-index">질문 {String(index + 1).padStart(2, '0')}</span><h2>{question.prompt}</h2><span className="results-answer-total">응답 {question.total}개</span></div>{question.type === 'text' ? question.textAnswers.length ? <ul className="results-text-answers">{question.textAnswers.map((answer) => <li key={answer.id}><p>{answer.value}</p><time>{formatDate(answer.submittedAt)}</time></li>)}</ul> : <p className="results-no-answers">아직 주관식 응답이 없어요.</p> : <div className="results-bars">{question.options.map(({ label, count }) => { const percentage = question.total ? Math.round((count / question.total) * 100) : 0; return <div className="results-bar-row" key={label}><div className="results-bar-label"><span>{label}</span><strong>{count}명 <small>({percentage}%)</small></strong></div><div className="results-bar-track"><span style={{ width: `${percentage}%` }} /></div></div>; })}</div>}</article>)}</div>}
              <p className="results-privacy-note"><ClipboardList size={14} /> 이 결과는 설문 소유자 계정에서만 조회할 수 있습니다.</p>
            </> : null}
      </div>
    </main>
  );
}
