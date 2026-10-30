function csvCell(value) {
  const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  // 응답자가 입력한 값이 스프레드시트 수식으로 실행되지 않게 합니다.
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function buildResponsesCsv(questions, responses, answers) {
  const byResponse = new Map();
  for (const answer of answers) {
    if (!byResponse.has(answer.response_id)) byResponse.set(answer.response_id, new Map());
    byResponse.get(answer.response_id).set(answer.question_id, answer.value);
  }

  const rows = [
    ['응답 ID', '제출 시각', ...questions.map((question, index) => `${index + 1}. ${question.prompt}`)],
    ...responses.map((response) => [
      response.id,
      response.submitted_at ?? '',
      ...questions.map((question) => byResponse.get(response.id)?.get(question.id) ?? ''),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function downloadResponsesCsv(title, questions, responses, answers) {
  const filename = `${(title.trim() || '설문').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80)}-응답.csv`;
  const url = URL.createObjectURL(new Blob([buildResponsesCsv(questions, responses, answers)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
