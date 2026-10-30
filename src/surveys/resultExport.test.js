import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResponsesCsv } from './resultExport.js';

test('CSV keeps multiple selections, quotes and line breaks in their cells', () => {
  const csv = buildResponsesCsv(
    [{ id: 'q1', prompt: '좋아하는 기능' }, { id: 'q2', prompt: '의견' }],
    [{ id: 'r1', submitted_at: '2026-10-30T01:00:00Z' }],
    [{ response_id: 'r1', question_id: 'q1', value: ['설문, 작성', '결과'] },
      { response_id: 'r1', question_id: 'q2', value: '첫째 줄\n"둘째 줄"' }],
  );
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"설문, 작성 \| 결과"/);
  assert.match(csv, /"첫째 줄\n""둘째 줄"""/);
});

test('CSV neutralizes formula-like respondent input', () => {
  const csv = buildResponsesCsv(
    [{ id: 'q1', prompt: '=위험한 제목' }],
    [{ id: 'r1', submitted_at: '' }],
    [{ response_id: 'r1', question_id: 'q1', value: '=SUM(1,2)' }],
  );
  assert.match(csv, /"1\. =위험한 제목"/);
  assert.match(csv, /"'=SUM\(1,2\)"/);
});
