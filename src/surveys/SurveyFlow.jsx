import { ArrowLeft, BarChart3, ClipboardList, Home } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';
import { ResultsDetailPage, ResultsIndexPage, SurveyEditorPage, SurveyListPage, SurveyPreviewPage, SurveyResponsesPage } from './SurveyPages.jsx';
import PublicSurveyPage from './PublicSurveyPage.jsx';
import './surveys.css';
import './results.css';
import './share.css';
import './public-survey.css';

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
          <Link to="/results"><BarChart3 size={16} /> 응답 분석</Link>
          <Link to="/"><Home size={16} /> 대시보드</Link>
        </nav>
      </header>
      <main className="survey-app-main">
        <Routes>
          <Route path="/surveys" element={<SurveyListPage />} />
          <Route path="/surveys/new" element={<SurveyEditorPage />} />
          <Route path="/surveys/:surveyId/edit" element={<SurveyEditorPage />} />
          <Route path="/surveys/:surveyId/responses" element={<SurveyResponsesPage />} />
          <Route path="/surveys/:surveyId" element={<SurveyPreviewPage />} />
          <Route path="/results" element={<ResultsIndexPage />} />
          <Route path="/results/:surveyId" element={<ResultsDetailPage />} />
          <Route path="/s/:surveyId" element={<PublicSurveyPage />} />
          <Route path="*" element={<div className="survey-page"><Link className="survey-back-link" to="/surveys"><ArrowLeft size={16} />내 설문으로</Link></div>} />
        </Routes>
      </main>
      <footer className="survey-app-footer">모아 설문 <span>·</span> 질문을 모아 더 나은 결정을 만들어요</footer>
    </div>
  );
}
