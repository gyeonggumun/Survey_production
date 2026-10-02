// 앱에서 사용하는 설문 페이지 구현을 한곳에서 내보내는 연결 지점입니다.
// 설문 편집기는 질문 저장 RPC와 응답 이력 보호를 사용하는 구현 하나로 통일합니다.
export {
  ResultsDetailPage,
  ResultsIndexPage,
  SurveyListPage,
  SurveyPreviewPage,
  SurveyResponsesPage,
} from './SurveyPages.jsx';
export { default as SurveyEditorPage } from './SurveyEditorPage.jsx';
