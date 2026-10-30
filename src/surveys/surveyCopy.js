const createId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const random = Math.floor(Math.random() * 16);
  return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
});

export function createSurveyCopyPayload(survey, questions, makeId = createId) {
  const suffix = ' (복사본)';
  return {
    p_survey_id: null,
    p_title: `${(survey.title?.trim() || '제목 없는 설문').slice(0, 120 - suffix.length)}${suffix}`,
    p_description: survey.description ?? '',
    p_questions: questions.map((question) => ({
      id: makeId(),
      prompt: question.prompt,
      type: question.type,
      required: Boolean(question.required),
      options: question.type === 'text' ? [] : (question.options ?? []),
    })),
  };
}
