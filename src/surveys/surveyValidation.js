const QUESTION_TYPES = new Set(['single', 'multiple', 'text']);

/**
 * 설문 발행 전 사용자에게 보여줄 검증 메시지를 반환합니다.
 * 데이터베이스의 validate_published_survey 마이그레이션과 같은
 * 제목·질문·선택지 제한을 프런트엔드에서도 미리 확인합니다.
 * 최종 데이터 보호는 DB 검증이 담당하며, 여기서는 입력 단계의 안내를 제공합니다.
 */
export function getSurveyPublishError(title, questions) {
  // 제목을 먼저 정리해 공백만 입력한 경우도 빈 제목으로 처리합니다.
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  if (!normalizedTitle) return '발행하려면 설문 제목을 입력해 주세요.';
  if (normalizedTitle.length > 120) return '설문 제목은 120자 이내로 입력해 주세요.';
  if (!Array.isArray(questions) || questions.length === 0) return '발행하려면 질문을 하나 이상 추가해 주세요.';
  if (questions.length > 100) return '설문 질문은 100개까지 발행할 수 있어요.';

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index] ?? {};
    const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : '';
    if (!prompt) return `${index + 1}번 질문 내용을 입력해 주세요.`;
    if (prompt.length > 300) return `${index + 1}번 질문은 300자 이내로 입력해 주세요.`;
    if (!QUESTION_TYPES.has(question.type)) return `${index + 1}번 질문 유형을 확인해 주세요.`;

    // 주관식은 선택지를 사용하지 않으므로 선택지 검증을 건너뜁니다.
    if (question.type === 'text') continue;

    // 앞뒤 공백을 제거한 값으로 빈 항목·중복 항목을 검사합니다.
    const options = Array.isArray(question.options) ? question.options : [];
    const normalizedOptions = options.map((option) => typeof option === 'string' ? option.trim() : '');
    if (
      normalizedOptions.length < 2
      || normalizedOptions.some((option) => !option || option.length > 120)
      || new Set(normalizedOptions).size !== normalizedOptions.length
    ) {
      return `${index + 1}번 질문에 서로 다른 선택지를 2개 이상 입력해 주세요. (각 120자 이내)`;
    }
  }

  return '';
}
