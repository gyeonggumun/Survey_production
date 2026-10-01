import { ArrowLeft, ClipboardList, Home } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';
import { SurveyEditorPage, SurveyListPage, SurveyPreviewPage } from './SurveyPages.jsx';

export default function SurveyFlow() {
  return (
    <div className="survey-app-shell">
      <header className="survey-app-header">
        <Link className="survey-app-brand" to="/" aria-label="모아 설문 대시보드로 이동">
          <span className="survey-preview-mark" aria-hidden="true" />
          <span>모아 설문</span>
        </Link>
        <nav aria-label="설문 메뉴">
          <Link to="/surveys"><ClipboardList size={16} /> 내 설문</Link>
          <Link to="/"><Home size={16} /> 대시보드</Link>
        </nav>
      </header>
      <main className="survey-app-main">
        <Routes>
          <Route path="/surveys" element={<SurveyListPage />} />
          <Route path="/surveys/new" element={<SurveyEditorPage />} />
          <Route path="/surveys/:surveyId/edit" element={<SurveyEditorPage />} />
          <Route path="/surveys/:surveyId" element={<SurveyPreviewPage />} />
          <Route path="*" element={<div className="survey-page"><Link className="survey-back-link" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></div>} />
        </Routes>
      </main>
      <footer className="survey-app-footer">모아 설문 <span>·</span> 질문을 모아 더 나은 결정을 만들어요</footer>
    </div>
  );
}
