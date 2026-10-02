/** 선택하지 않은 선택형 질문이나 공백 주관식은 유효 응답으로 세지 않습니다. */
export function hasMeaningfulAnswer(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

/**
 * 질문 하나에 대한 결과를 집계합니다.
 * 비율의 분모는 해당 질문에 실제로 답한 사람 수입니다.
 * 복수 선택은 한 사람이 여러 선택지를 고를 수 있어 합계가 100%를 넘을 수 있습니다.
 */
export function summarizeQuestion(question, answers, responses) {
  // 전달받은 답변 중 현재 질문에 해당하는 항목만 집계 대상으로 삼습니다.
  const questionAnswers = answers.filter((answer) => answer.question_id === question.id);
  const answered = questionAnswers.filter((answer) => hasMeaningfulAnswer(answer.value));

  if (question.type === 'text') {
    // 응답 ID로 제출 시각을 연결해 주관식 답변과 함께 표시합니다.
    const submittedAtByResponse = new Map(responses.map((response) => [response.id, response.submitted_at]));
    return {
      ...question,
      total: answered.length,
      textAnswers: answered.map((answer) => ({
        id: answer.response_id,
        value: Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value),
        submittedAt: submittedAtByResponse.get(answer.response_id),
      })),
    };
  }

  // 선택지가 0건이어도 결과에 표시되도록 모든 선택지를 먼저 0으로 초기화합니다.
  const counts = new Map((question.options ?? []).map((option) => [option, 0]));
  answered.forEach((answer) => {
    const values = Array.isArray(answer.value) ? answer.value : [answer.value];
    values.forEach((value) => {
      // 현재 질문의 선택지에 없는 값은 집계에 반영하지 않습니다.
      if (typeof value !== 'string' || !counts.has(value)) return;
      counts.set(value, counts.get(value) + 1);
    });
  });

  return {
    ...question,
    total: answered.length,
    options: [...counts.entries()].map(([label, count]) => ({
      label,
      count,
      percentage: answered.length ? Math.round((count / answered.length) * 100) : 0,
    })),
  };
}
