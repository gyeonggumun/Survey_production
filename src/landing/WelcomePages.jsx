import { useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, ClipboardList, Link2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import './welcome.css';

const choices = [
  { label: '간단한 설문 만들기', count: 6 },
  { label: '링크로 쉽게 공유하기', count: 4 },
  { label: '응답 결과 한눈에 보기', count: 2 },
];

function Brand() {
  return <Link className="welcome-brand" to="/" aria-label="모아 설문 홈"><img src="/moa-logo.svg" alt="" /><span>모아<span>설문</span></span></Link>;
}

export function WelcomePage() {
  return (
    <main className="welcome-site">
      <div className="welcome-container">
        <header className="welcome-header">
          <Brand />
          <nav aria-label="시작 메뉴"><Link to="/demo">설문 체험</Link><Link className="welcome-header-login" to="/auth">로그인 <ArrowRight size={15} aria-hidden="true" /></Link></nav>
        </header>

        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-hero-copy">
            <span className="welcome-eyebrow">질문부터 인사이트까지, 한곳에서</span>
            <h1 id="welcome-title">좋은 질문이<br /><span>더 나은 다음을 만듭니다.</span></h1>
            <p>모아 설문에서 질문을 만들고, 링크를 공유하고, 모인 응답을 살펴보세요. 첫 방문이라면 가입 없이 먼저 체험할 수 있어요.</p>
            <div className="welcome-hero-actions">
              <Link className="welcome-button welcome-button-primary" to="/demo">가입 없이 체험하기 <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className="welcome-button welcome-button-secondary" to="/auth?mode=signup">내 설문 만들기</Link>
            </div>
            <span className="welcome-demo-note">체험 응답은 저장되지 않으며 실제 설문 데이터와 분리됩니다.</span>
          </div>
          <div className="welcome-preview" aria-label="설문과 결과 화면 미리보기">
            <div className="welcome-preview-card"><div className="welcome-preview-top"><span><img src="/moa-logo.svg" alt="" /> 모아 설문</span><span>미리보기</span></div><strong>어떤 기능이 가장 기대되나요?</strong><div className="welcome-preview-option welcome-preview-option-selected"><span /> 간단한 설문 만들기 <Check size={16} aria-hidden="true" /></div><div className="welcome-preview-option"><span /> 링크로 쉽게 공유하기</div><div className="welcome-preview-option"><span /> 응답 결과 한눈에 보기</div></div>
            <div className="welcome-preview-result"><BarChart3 size={17} aria-hidden="true" /><span>응답을 모아<br /><strong>결과를 한눈에</strong></span><span className="welcome-preview-bars" aria-hidden="true"><i /><i /><i /></span></div>
          </div>
        </section>

        <section className="welcome-steps" aria-labelledby="welcome-steps-title">
          <div className="welcome-section-heading"><span>HOW IT WORKS</span><h2 id="welcome-steps-title">설문을 만드는 흐름은 간단해요</h2></div>
          <div className="welcome-step-grid">
            <article><span className="welcome-step-icon"><ClipboardList size={21} aria-hidden="true" /></span><span className="welcome-step-number">01</span><h3>질문 만들기</h3><p>단일 선택, 복수 선택, 주관식 질문을 조합해 설문을 작성해요.</p></article>
            <article><span className="welcome-step-icon"><Link2 size={21} aria-hidden="true" /></span><span className="welcome-step-number">02</span><h3>링크 공유하기</h3><p>설문을 발행하고 공개 링크를 전달해 로그인 없이 응답을 받아요.</p></article>
            <article><span className="welcome-step-icon"><BarChart3 size={21} aria-hidden="true" /></span><span className="welcome-step-number">03</span><h3>결과 살펴보기</h3><p>내 계정에서 응답 수와 질문별 결과를 확인해요.</p></article>
          </div>
        </section>
        <footer className="welcome-footer"><span>© 모아 설문</span><Link to="/demo">체험 시작하기 <ArrowRight size={14} aria-hidden="true" /></Link></footer>
      </div>
    </main>
  );
}

export function DemoPage() {
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const total = choices.reduce((sum, choice) => sum + choice.count, 0) + 1;

  const submit = (event) => {
    event.preventDefault();
    if (selected) setSubmitted(true);
  };

  return (
    <main className="welcome-site demo-site">
      <div className="welcome-container">
        <header className="welcome-header"><Brand /><nav aria-label="체험 메뉴"><Link to="/">소개 보기</Link><Link className="welcome-header-login" to="/auth?mode=signup">내 설문 만들기 <ArrowRight size={15} aria-hidden="true" /></Link></nav></header>
        <div className="demo-layout">
          <div className="demo-intro"><Link className="demo-back" to="/"><ArrowLeft size={16} aria-hidden="true" /> 소개로 돌아가기</Link><span className="welcome-eyebrow">가입 없이 체험하기</span><h1>설문에 답하고<br /><span>결과를 확인해 보세요.</span></h1><p>실제 응답 화면의 흐름을 짧게 체험할 수 있어요. 이 페이지의 선택은 서버에 저장되지 않습니다.</p><div className="demo-flow"><span className={!submitted ? 'demo-flow-active' : ''}>1. 응답</span><ArrowRight size={15} aria-hidden="true" /><span className={submitted ? 'demo-flow-active' : ''}>2. 결과 확인</span></div></div>
          <section className="demo-card" aria-labelledby="demo-heading">
            <div className="demo-card-top"><img src="/moa-logo.svg" alt="" /><span>체험용 설문</span><span className="demo-card-tag">저장되지 않음</span></div>
            {!submitted ? <form onSubmit={submit}>
              <span className="demo-question-index">질문 1 / 1</span>
              <h2 id="demo-heading">모아 설문에서 가장 기대되는 기능은 무엇인가요?</h2>
              <p>한 가지를 선택해 주세요.</p>
              <fieldset className="demo-options"><legend className="sr-only">가장 기대되는 기능</legend>{choices.map((choice) => <label key={choice.label} className={selected === choice.label ? 'demo-option demo-option-selected' : 'demo-option'}><input type="radio" name="feature" value={choice.label} checked={selected === choice.label} onChange={() => setSelected(choice.label)} required /><span>{choice.label}</span>{selected === choice.label && <Check size={18} aria-hidden="true" />}</label>)}</fieldset>
              <button className="welcome-button welcome-button-primary demo-submit" type="submit">응답하고 결과 보기 <ArrowRight size={17} aria-hidden="true" /></button>
            </form> : <div className="demo-results" role="status" aria-live="polite">
              <span className="demo-question-index">체험 결과</span><h2 id="demo-heading">응답을 한눈에 살펴보세요</h2><p>내 선택: <strong>{selected}</strong></p><div className="demo-result-list">{choices.map((choice) => { const count = choice.count + Number(selected === choice.label); const percent = Math.round(count / total * 100); return <div className="demo-result" key={choice.label}><div><span>{choice.label}</span><strong>{percent}%</strong></div><div className="demo-result-track"><span style={{ width: `${percent}%` }} /></div></div>; })}</div><p className="demo-data-note">기존 12건은 화면용 예시 값이며, 내 선택 1건을 더해 표시했습니다. 실제 데이터는 저장하거나 조회하지 않았습니다.</p><button className="demo-retry" type="button" onClick={() => { setSelected(''); setSubmitted(false); }}><RotateCcw size={16} aria-hidden="true" /> 다시 체험하기</button>
            </div>}
          </section>
        </div>
        <div className="demo-next"><div><strong>직접 설문을 만들어 볼까요?</strong><p>계정을 만들면 설문 발행과 실제 응답 분석을 사용할 수 있어요.</p></div><Link className="welcome-button welcome-button-secondary" to="/auth?mode=signup">내 설문 만들기 <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </main>
  );
}
