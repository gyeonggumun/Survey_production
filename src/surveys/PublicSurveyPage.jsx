import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import './surveys.css';
import './public-survey.css';

// DB/RPC 오류를 응답자가 다음에 취할 행동을 알 수 있는 안내로 바꿉니다.
function errorMessage(error) {
  const message = error?.message ?? '';
  if (/published survey|발행된 설문/i.test(message)) return '이 설문은 발행되지 않았거나 더 이상 응답을 받을 수 없어요.';
  if (/required|필수|응답해 주세요/i.test(message)) return '모든 필수 질문에 답했는지 확인해 주세요.';
  if (/schema cache|submit_survey_response|function/i.test(message)) return 'Supabase 응답 수집 SQL이 적용되었는지 확인해 주세요.';
  if (/Invalid input syntax|uuid/i.test(message)) return '설문 주소가 올바르지 않아요.';
  return '응답을 제출하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export default function PublicSurveyPage() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // URL이 바뀌거나 화면을 벗어난 뒤 오래된 조회 결과가 반영되지 않게 합니다.
    let active = true;

    async function loadSurvey() {
      if (!supabase) {
        setError('설문 서비스를 불러올 수 없어요. Supabase 연결 설정을 확인해 주세요.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      // 공개 응답 화면에서는 발행 상태인 설문만 가져옵니다.
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, description, status')
        .eq('id', surveyId)
        .eq('status', 'published')
        .maybeSingle();

      if (!active) return;
      if (surveyError || !surveyData) {
        setError('발행된 설문을 찾을 수 없어요. 링크가 올바른지 확인해 주세요.');
        setSurvey(null);
        setQuestions([]);
        setLoading(false);
        return;
      }

      // 질문을 정해진 순서로 불러와 유형별 빈 답변 상태를 준비합니다.
      const { data: questionRows, error: questionError } = await supabase
        .from('questions')
        .select('id, prompt, type, required, options, position')
        .eq('survey_id', surveyId)
        .order('position', { ascending: true });

      if (!active) return;
      if (questionError) {
        setError('설문 질문을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.');
        setSurvey(null);
        setQuestions([]);
      } else {
        const loadedQuestions = questionRows ?? [];
        setSurvey(surveyData);
        setQuestions(loadedQuestions);
        setAnswers(Object.fromEntries(loadedQuestions.map((question) => [
          question.id,
          question.type === 'multiple' ? [] : '',
        ])));
      }
      setLoading(false);
    }

    loadSurvey();
    return () => { active = false; };
  }, [surveyId]);

  const setAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  // 복수 선택 항목은 이미 선택했으면 제거하고, 아니면 목록에 추가합니다.
  const toggleMultipleAnswer = (questionId, option) => {
    setAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      return {
        ...current,
        [questionId]: selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    // 필수 질문이 비어 있으면 제출 전에 알려주고 해당 질문으로 포커스를 이동합니다.
    const missingRequired = questions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      return Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
    });
    if (missingRequired) {
      setError(`“${missingRequired.prompt}”은(는) 필수 질문이에요.`);
      document.getElementById(`public-question-${missingRequired.id}`)?.focus();
      return;
    }

    if (!supabase) {
      setError('Supabase 연결 설정을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    // RPC가 요구하는 질문 ID와 답변 값 배열로 변환합니다.
    const payload = questions.map((question) => ({
      question_id: question.id,
      value: question.type === 'multiple'
        ? (answers[question.id] ?? [])
        : (answers[question.id] ?? ''),
    }));

    try {
      // 서버 측 RPC가 발행 상태, 질문 종류, 선택지와 필수 입력을 최종 검증합니다.
      const { error: submitError } = await supabase.rpc('submit_survey_response', {
        p_survey_id: surveyId,
        p_answers: payload,
      });
      if (submitError) {
        setError(errorMessage(submitError));
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('네트워크 연결을 확인한 뒤 다시 제출해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="public-survey-shell"><div className="survey-loading" role="status"><LoaderCircle className="survey-spinner" size={22} /> 설문을 불러오고 있어요…</div></main>;
  }

  if (submitted) {
    return (
      <main className="public-survey-shell">
        <section className="public-survey-card public-survey-success" role="status">
          <span className="public-success-icon"><CheckCircle2 size={31} /></span>
          <span className="survey-eyebrow">RESPONSE SUBMITTED</span>
          <h1>응답을 제출했어요</h1>
          <p>소중한 의견을 보내주셔서 감사합니다.</p>
          <Link className="survey-button survey-button-secondary" to="/">설문 서비스 홈으로</Link>
        </section>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="public-survey-shell">
        <section className="public-survey-card public-survey-unavailable" role="alert">
          <span className="survey-eyebrow">SURVEY UNAVAILABLE</span>
          <h1>설문을 열 수 없어요</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-survey-shell">
      <article className="public-survey-card">
        <header className="public-survey-brand"><span className="survey-preview-mark" aria-hidden="true" />모아 설문</header>
        <span className="survey-eyebrow">SURVEY</span>
        <h1>{survey.title}</h1>
        {survey.description && <p className="public-survey-description">{survey.description}</p>}
        <div className="public-survey-meta">질문 {questions.length}개 <span>·</span> 필수 질문에 답한 뒤 제출해 주세요.</div>

        <form onSubmit={submit} noValidate>
          {questions.map((question, index) => (
            <fieldset className="public-question" key={question.id} id={`public-question-${question.id}`} tabIndex={-1}>
              <legend>{index + 1}. {question.prompt}{question.required && <span className="survey-required-mark">필수</span>}</legend>
              {question.type === 'text' ? (
                <textarea
                  className="public-answer-text"
                  value={answers[question.id] ?? ''}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="답변을 입력해 주세요"
                  aria-label={question.prompt}
                  required={question.required}
                />
              ) : (
                <div className="public-answer-options">
                  {(question.options ?? []).map((option, optionIndex) => {
                    const inputId = `answer-${question.id}-${optionIndex}`;
                    if (question.type === 'multiple') {
                      const checked = (answers[question.id] ?? []).includes(option);
                      return (
                        <label className="public-answer-option" htmlFor={inputId} key={inputId}>
                          <input id={inputId} type="checkbox" checked={checked} onChange={() => toggleMultipleAnswer(question.id, option)} />
                          <span className="public-choice-control public-choice-checkbox" aria-hidden="true" />
                          <span>{option}</span>
                        </label>
                      );
                    }
                    return (
                      <label className="public-answer-option" htmlFor={inputId} key={inputId}>
                        <input
                          id={inputId}
                          type="radio"
                          name={`answer-${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={() => setAnswer(question.id, option)}
                          required={question.required}
                        />
                        <span className="public-choice-control public-choice-radio" aria-hidden="true" />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ))}

          {error && <div className="survey-notice" role="alert">{error}</div>}
          <button className="survey-button survey-button-primary public-submit-button" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="survey-spinner" size={17} /> : <Send size={16} />}
            {submitting ? '제출 중…' : '응답 제출하기'}
          </button>
        </form>
      </article>
      <p className="public-survey-footer">모아 설문 <span>·</span> 더 나은 질문을 위한 작은 시작</p>
    </main>
  );
}
