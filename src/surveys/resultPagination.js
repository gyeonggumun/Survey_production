const ROW_BATCH_SIZE = 500;
const RESPONSE_ID_BATCH_SIZE = 40;

// Data API의 한 번에 반환하는 행 수와 관계없이 모든 페이지를 읽습니다.
export async function loadAllRows(makeQuery, batchSize = ROW_BATCH_SIZE) {
  const rows = [];
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await makeQuery().range(offset, offset + batchSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < batchSize) return rows;
  }
}

export async function loadAnswersForResponses(client, responseIds) {
  const answers = [];
  for (let index = 0; index < responseIds.length; index += RESPONSE_ID_BATCH_SIZE) {
    const ids = responseIds.slice(index, index + RESPONSE_ID_BATCH_SIZE);
    const rows = await loadAllRows(() => client.from('answers')
      .select('response_id, question_id, value')
      .in('response_id', ids)
      .order('response_id', { ascending: true })
      .order('question_id', { ascending: true }));
    answers.push(...rows);
  }
  return answers;
}
